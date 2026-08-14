import uuid
import time
import logging
from datetime import datetime, date

from sqlalchemy.exc import IntegrityError

from app import db
from app.ocr.services import calcular_hash, procesar_archivo
from app.services.r2_service import subir_archivo, descargar_archivo, eliminar_archivo
from app.documentos.services import (
    EXTENSIONES_PERMITIDAS,
    TAMANO_MAXIMO_BYTES,
    MAPEO_CONTENT_TYPE,
    determinar_id_formato,
    extraer_texto_pdf_digital
)
from app.documentos.models import Documento
from app.clientes.models import Cliente
from app.expedientes.models import Expediente
from app.expedientes.services import generar_numero_expediente
from app.common.models import TipoExpediente
from app.notificaciones.services import crear_notificacion
from app.notificaciones.models import (
    TIPO_BAJA_CONFIANZA, TIPO_DUPLICADO, TIPO_CARGA_COMPLETADA, TIPO_ERROR
)
from .clasificador import clasificar, ID_AREA_NOTARIAL
from .models import (
    TrabajoClasificacion, ClasificacionML, EstadoProcesamiento,
    ESTADO_PENDIENTE, ESTADO_EXITOSO, ESTADO_ERROR, ESTADO_DUPLICADO
)

# Por encima de este valor el expediente se crea solo. Por debajo, el trabajo
# queda esperando que una persona confirme o corrija el tipo.
UMBRAL_CONFIANZA = 0.70

# Formato PDF con texto digital extraíble: no necesita pasar por Tesseract.
FORMATO_PDF_DIGITAL = 2

MAX_INTENTOS_NUMERO_EXPEDIENTE = 3

PRIORIDAD_MEDIA = 2
ESTADO_EXPEDIENTE_ACTIVO = 1


def encolar_trabajo(archivo_bytes, nombre_original, id_usuario):
    """
    Deja un documento suelto listo para que el worker lo procese después.

    Solo valida, sube el archivo a R2 y guarda la fila en estado Pendiente. No
    hace OCR, no clasifica y no determina el formato (digital vs escaneado),
    porque todo eso obliga a abrir el archivo y el usuario está esperando la
    respuesta. Esa parte es trabajo del worker de la Fase 2.

    Devuelve (trabajo, error).
    """
    extension = nombre_original.rsplit('.', 1)[-1].lower()

    if extension not in EXTENSIONES_PERMITIDAS:
        return None, f"Formato no permitido. Use: {', '.join(EXTENSIONES_PERMITIDAS)}"

    if len(archivo_bytes) > TAMANO_MAXIMO_BYTES:
        return None, "El archivo supera el límite de 10 MB"

    # El hash se calcula antes de subir para que el worker pueda detectar
    # duplicados en la Fase 2 sin volver a bajar el archivo de R2.
    hash_archivo = calcular_hash(archivo_bytes)

    nombre_sistema = f"{uuid.uuid4().hex}.{extension}"
    content_type = MAPEO_CONTENT_TYPE.get(extension, 'application/octet-stream')
    nombre_key = subir_archivo(archivo_bytes, nombre_sistema, content_type)

    trabajo = TrabajoClasificacion(
        id_usuario=id_usuario,
        nombre_archivo_original=nombre_original,
        nombre_archivo_sistema=nombre_sistema,
        ruta_almacenamiento=nombre_key,
        tamano_bytes=len(archivo_bytes),
        hash_archivo=hash_archivo,
        id_estado=ESTADO_PENDIENTE,
        intentos=0,
        requiere_confirmacion=False
    )

    db.session.add(trabajo)
    db.session.commit()

    return trabajo, None


def obtener_trabajo(id_trabajo):
    """Devuelve (datos_del_trabajo, error) con el nombre legible del estado."""
    trabajo = TrabajoClasificacion.query.get(id_trabajo)

    if not trabajo:
        return None, "Trabajo no encontrado"

    datos = trabajo.to_dict()
    estado = EstadoProcesamiento.query.get(trabajo.id_estado)
    datos['estado'] = estado.nombre if estado else None

    return datos, None


def obtener_o_crear_cliente_placeholder(id_usuario):
    """
    Arma el cliente provisional al que se cuelga un expediente automático.

    Siempre crea uno nuevo: un documento suelto no trae con qué identificar a
    su dueño, así que no hay ningún cliente previo con el que emparejarlo. La
    secretaria le pone el nombre real después, editando el cliente.

    Numera contando los placeholders existentes ('Cliente 001', 'Cliente 002',
    ...). Hace add + flush pero NO commit: la fila queda dentro de la
    transacción del llamador para que un fallo posterior no deje clientes
    huérfanos.
    """
    total = Cliente.query.filter_by(primer_nombre='Cliente').count()
    secuencia = str(total + 1).zfill(3)

    cliente = Cliente(
        tipo_persona=1,              # Natural — exige primer_nombre y primer_apellido
        primer_nombre='Cliente',
        primer_apellido=secuencia,
        activo=True,
        registrado_por=id_usuario
    )

    db.session.add(cliente)
    db.session.flush()               # asigna id_cliente sin cerrar la transacción

    logging.info(f"[worker] cliente placeholder creado: Cliente {secuencia} (id={cliente.id_cliente})")

    return cliente


def _extraer_texto(archivo_bytes, extension):
    """
    Saca el texto del archivo con el mismo criterio que usa la carga manual:
    pdfplumber si el PDF ya trae texto digital, Tesseract en cualquier otro
    caso. Devuelve (texto, num_paginas, id_formato, error).
    """
    id_formato = determinar_id_formato(extension, archivo_bytes)

    inicio = time.perf_counter()

    if extension == 'pdf' and id_formato == FORMATO_PDF_DIGITAL:
        texto, num_paginas = extraer_texto_pdf_digital(archivo_bytes)
        logging.info(
            f"[worker] texto extraido con pdfplumber en "
            f"{round(time.perf_counter() - inicio, 2)}s — {len(texto)} caracteres"
        )
        return texto, num_paginas, id_formato, None

    resultado = procesar_archivo(archivo_bytes, extension)
    logging.info(
        f"[worker] OCR termino en {resultado['tiempo_seg']}s — "
        f"{resultado['num_caracteres']} caracteres, {resultado['num_paginas']} paginas"
    )

    if not resultado['exitoso']:
        return None, None, id_formato, resultado['mensaje_error']

    return resultado['texto'], resultado['num_paginas'], id_formato, None


def _crear_expediente_automatico(trabajo, texto, num_paginas, id_formato, prediccion):
    """
    Crea cliente placeholder + expediente + documento + fila de historial en un
    solo commit. Si algo falla, el rollback deja la base como estaba.

    Reintenta ante colisión del numero_expediente: se genera con count()+1, así
    que si alguien crea un expediente a mano en el mismo instante, los dos
    calculan el mismo número y el UNIQUE rechaza al segundo. Al reintentar, el
    conteo ya incluye al expediente ganador y el número avanza.
    """
    tipo = TipoExpediente.query.get(prediccion['id_tipo_predicho'])
    nombre_tipo = tipo.nombre if tipo else 'Documento'
    confianza = prediccion['confianza']
    porcentaje = int(round(confianza * 100))

    for intento in range(1, MAX_INTENTOS_NUMERO_EXPEDIENTE + 1):
        try:
            # Se reasignan en cada vuelta a propósito: el rollback del reintento
            # revierte también estos campos del trabajo, no solo las filas nuevas.
            trabajo.id_formato = id_formato
            trabajo.texto_completo = texto
            trabajo.num_paginas = num_paginas
            trabajo.id_modelo = prediccion['id_modelo']
            trabajo.id_tipo_predicho = prediccion['id_tipo_predicho']
            trabajo.confianza = confianza
            trabajo.umbral_usado = UMBRAL_CONFIANZA

            cliente = obtener_o_crear_cliente_placeholder(trabajo.id_usuario)

            numero_expediente = generar_numero_expediente(ID_AREA_NOTARIAL)
            hoy = date.today()

            expediente = Expediente(
                id_cliente=cliente.id_cliente,
                id_tipo_expediente=prediccion['id_tipo_predicho'],
                id_area=ID_AREA_NOTARIAL,
                id_estado=ESTADO_EXPEDIENTE_ACTIVO,
                id_usuario_asignado=trabajo.id_usuario,
                numero_expediente=numero_expediente,
                titulo=f"{nombre_tipo} - {hoy.strftime('%d/%m/%Y')}",
                descripcion=(
                    f"Expediente creado automáticamente por clasificación ML. "
                    f"Confianza: {porcentaje}%. "
                    f"Documento: {trabajo.nombre_archivo_original}"
                ),
                fecha_apertura=hoy,
                prioridad=PRIORIDAD_MEDIA,
                es_duplicado_posible=False,
                creado_por=trabajo.id_usuario
            )
            db.session.add(expediente)
            db.session.flush()

            documento = Documento(
                id_expediente=expediente.id_expediente,
                id_formato=trabajo.id_formato,
                nombre_archivo_original=trabajo.nombre_archivo_original,
                nombre_archivo_sistema=trabajo.nombre_archivo_sistema,
                # Reusa el objeto que ya subió el endpoint de encolado: volver a
                # subirlo dejaría dos copias del mismo archivo en el bucket.
                ruta_almacenamiento=trabajo.ruta_almacenamiento,
                tamano_bytes=trabajo.tamano_bytes,
                num_paginas=num_paginas,
                hash_archivo=trabajo.hash_archivo,
                es_duplicado_exacto=False,
                texto_completo=texto,
                cargado_por=trabajo.id_usuario
            )
            db.session.add(documento)
            db.session.flush()

            clasificacion = ClasificacionML(
                id_documento=documento.id_documento,
                id_modelo=prediccion['id_modelo'],
                # La tabla nació por área y la columna es NOT NULL. En este flujo
                # el área siempre es Notarial, así que el dato es cierto; el valor
                # con significado real va en id_tipo_predicho.
                id_area_predicha=ID_AREA_NOTARIAL,
                confianza=confianza,
                requiere_revision=False,
                umbral_confianza_usado=UMBRAL_CONFIANZA,
                revisada=False,
                id_tipo_predicho=prediccion['id_tipo_predicho']
            )
            db.session.add(clasificacion)

            trabajo.id_expediente_creado = expediente.id_expediente
            trabajo.id_documento_creado = documento.id_documento
            trabajo.id_estado = ESTADO_EXITOSO
            trabajo.requiere_confirmacion = False
            trabajo.fecha_fin_proceso = datetime.utcnow()

            # Va dentro del loop: si hay reintento, el rollback también se
            # lleva la notificación y hay que volver a crearla.
            crear_notificacion(
                id_usuario=trabajo.id_usuario,
                id_tipo=TIPO_CARGA_COMPLETADA,
                mensaje=(
                    f"Documento clasificado como {nombre_tipo} ({porcentaje}%) "
                    f"y guardado en expediente {numero_expediente}"
                ),
                id_expediente=expediente.id_expediente,
                id_documento=documento.id_documento,
                id_trabajo=trabajo.id_trabajo
            )

            db.session.commit()

            logging.info(
                f"[worker] trabajo {trabajo.id_trabajo} exitoso — "
                f"expediente {numero_expediente} (id={expediente.id_expediente}), "
                f"documento id={documento.id_documento}, "
                f"cliente id={cliente.id_cliente}"
            )
            return expediente, None

        except IntegrityError as e:
            db.session.rollback()
            logging.warning(
                f"[worker] colision al crear el expediente "
                f"(intento {intento} de {MAX_INTENTOS_NUMERO_EXPEDIENTE}): {e.orig}"
            )
            if intento == MAX_INTENTOS_NUMERO_EXPEDIENTE:
                return None, f"No se pudo generar un numero de expediente unico: {e.orig}"

    return None, "No se pudo crear el expediente"


def procesar_trabajo(id_trabajo):
    """
    Pipeline completo de un trabajo ya reclamado por el worker:
    bajar de R2 → extraer texto → descartar duplicados → clasificar →
    crear el expediente si la confianza alcanza.

    Devuelve (datos_del_trabajo, error).
    """
    trabajo = TrabajoClasificacion.query.get(id_trabajo)

    if not trabajo:
        return None, "Trabajo no encontrado"

    logging.info(
        f"[worker] procesando trabajo {id_trabajo} — "
        f"archivo '{trabajo.nombre_archivo_original}' ({trabajo.tamano_bytes} bytes)"
    )

    extension = trabajo.nombre_archivo_original.rsplit('.', 1)[-1].lower()

    try:
        archivo_bytes = descargar_archivo(trabajo.ruta_almacenamiento)
    except Exception as e:
        trabajo.id_estado = ESTADO_ERROR
        trabajo.mensaje_error = f"No se pudo descargar el archivo de R2: {e}"
        trabajo.fecha_fin_proceso = datetime.utcnow()
        crear_notificacion(
            id_usuario=trabajo.id_usuario,
            id_tipo=TIPO_ERROR,
            mensaje=f"No se pudo procesar el documento: {trabajo.mensaje_error}",
            id_trabajo=trabajo.id_trabajo
        )
        db.session.commit()
        logging.error(f"[worker] trabajo {id_trabajo} fallo al descargar de R2: {e}")
        return trabajo.to_dict(), trabajo.mensaje_error

    texto, num_paginas, id_formato, error_ocr = _extraer_texto(archivo_bytes, extension)
    trabajo.id_formato = id_formato

    # Un texto vacío no es clasificable: sin contenido no hay nada que predecir,
    # y crear un expediente a ciegas sería peor que fallar. El archivo se deja
    # en R2 para poder revisarlo a mano.
    if error_ocr or not texto or not texto.strip():
        trabajo.id_estado = ESTADO_ERROR
        trabajo.mensaje_error = (
            "No se pudo extraer texto del documento "
            "(posiblemente un PDF de solo imágenes ilegibles)"
        )
        trabajo.fecha_fin_proceso = datetime.utcnow()
        crear_notificacion(
            id_usuario=trabajo.id_usuario,
            id_tipo=TIPO_ERROR,
            mensaje="No se pudo procesar el documento: OCR sin texto extraíble",
            id_trabajo=trabajo.id_trabajo
        )
        db.session.commit()
        logging.warning(f"[worker] trabajo {id_trabajo} sin texto extraible — marcado Error")
        return trabajo.to_dict(), trabajo.mensaje_error

    trabajo.texto_completo = texto
    trabajo.num_paginas = num_paginas

    # Duplicado exacto contra lo ya cargado. El archivo recién subido no aporta
    # nada, así que se descarta del bucket y no se crea ningún expediente.
    duplicado = Documento.query.filter_by(hash_archivo=trabajo.hash_archivo).first()
    if duplicado:
        trabajo.id_estado = ESTADO_DUPLICADO
        trabajo.mensaje_error = (
            f"Documento duplicado exacto del documento id={duplicado.id_documento} "
            f"(expediente id={duplicado.id_expediente})"
        )
        trabajo.fecha_fin_proceso = datetime.utcnow()

        expediente_original = Expediente.query.get(duplicado.id_expediente)
        numero_original = (
            expediente_original.numero_expediente if expediente_original
            else f"id={duplicado.id_expediente}"
        )
        crear_notificacion(
            id_usuario=trabajo.id_usuario,
            id_tipo=TIPO_DUPLICADO,
            mensaje=f"Documento duplicado exacto del expediente {numero_original}",
            id_documento=duplicado.id_documento,
            id_trabajo=trabajo.id_trabajo
        )

        db.session.commit()

        # Después del commit: si el borrado falla, el trabajo ya quedó bien
        # marcado y lo único que sobra es un objeto huérfano en R2.
        try:
            eliminar_archivo(trabajo.ruta_almacenamiento)
            logging.info(f"[worker] objeto duplicado borrado de R2: {trabajo.ruta_almacenamiento}")
        except Exception as e:
            logging.error(f"[worker] no se pudo borrar el objeto duplicado de R2: {e}")

        logging.info(f"[worker] trabajo {id_trabajo} marcado Duplicado del documento {duplicado.id_documento}")
        return trabajo.to_dict(), None

    prediccion = clasificar(texto)

    trabajo.id_modelo = prediccion['id_modelo']
    trabajo.id_tipo_predicho = prediccion['id_tipo_predicho']
    trabajo.confianza = prediccion['confianza']
    trabajo.umbral_usado = UMBRAL_CONFIANZA

    # Confianza baja: el OCR y el modelo terminaron bien (por eso Exitoso), pero
    # el expediente no se crea hasta que una persona confirme el tipo.
    if prediccion['confianza'] < UMBRAL_CONFIANZA:
        trabajo.id_estado = ESTADO_EXITOSO
        trabajo.requiere_confirmacion = True
        trabajo.fecha_fin_proceso = datetime.utcnow()

        tipo_predicho = TipoExpediente.query.get(prediccion['id_tipo_predicho'])
        nombre_predicho = tipo_predicho.nombre if tipo_predicho else 'Documento'
        crear_notificacion(
            id_usuario=trabajo.id_usuario,
            id_tipo=TIPO_BAJA_CONFIANZA,
            mensaje=(
                f"Documento requiere confirmación: predicción {nombre_predicho} "
                f"({int(round(prediccion['confianza'] * 100))}%) por debajo del umbral"
            ),
            id_trabajo=trabajo.id_trabajo
        )

        db.session.commit()
        logging.info(
            f"[worker] trabajo {id_trabajo} con confianza {prediccion['confianza']} "
            f"bajo el umbral {UMBRAL_CONFIANZA} — queda pendiente de confirmacion"
        )
        return trabajo.to_dict(), None

    expediente, error = _crear_expediente_automatico(
        trabajo, texto, num_paginas, id_formato, prediccion
    )

    if error:
        trabajo_actual = TrabajoClasificacion.query.get(id_trabajo)
        trabajo_actual.id_estado = ESTADO_ERROR
        trabajo_actual.mensaje_error = error
        trabajo_actual.fecha_fin_proceso = datetime.utcnow()
        crear_notificacion(
            id_usuario=trabajo_actual.id_usuario,
            id_tipo=TIPO_ERROR,
            mensaje=f"No se pudo procesar el documento: {error}",
            id_trabajo=trabajo_actual.id_trabajo
        )
        db.session.commit()
        logging.error(f"[worker] trabajo {id_trabajo} fallo al crear el expediente: {error}")
        return trabajo_actual.to_dict(), error

    return trabajo.to_dict(), None
