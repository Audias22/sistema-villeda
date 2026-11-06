import os
import uuid
import pdfplumber
import io
import logging

try:
    import resource  # solo Unix — no existe en Windows (entorno de desarrollo local)
except ImportError:
    resource = None

from app import db
from app.documentos.models import Documento
from app.ocr.services import calcular_hash, procesar_archivo
from app.services.r2_service import subir_archivo, obtener_url_firmada, eliminar_archivo


def _log_memoria(etapa):
    """Log de bajo costo del pico de RSS del proceso — permite comparar el
    consumo de memoria entre documentos sin necesidad de otro crash real
    para confirmarlo. No disponible en Windows (desarrollo local), donde
    no existe el módulo resource; en ese caso no hace nada."""
    if resource is None:
        return
    uso_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    logging.info(f"[memoria] {etapa} — RSS pico del proceso: {uso_kb} KB")


EXTENSIONES_PERMITIDAS = {'pdf', 'jpg', 'jpeg', 'png'}
TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024  # 10 MB

MAPEO_FORMATO = {
    'jpg':  5,
    'jpeg': 5,
    'png':  6
}

MAPEO_CONTENT_TYPE = {
    'pdf':  'application/pdf',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'png':  'image/png'
}

RUTA_ALMACENAMIENTO_LOCAL = os.path.join(os.path.dirname(__file__), '..', '..', 'almacenamiento')


def pdf_tiene_texto_digital(pdf_bytes):
    """
    Detecta si un PDF ya contiene texto digital extraíble (no requiere OCR)
    o si es un PDF escaneado (imagen sin texto, requiere OCR).
    """
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for pagina in pdf.pages:
                texto = pagina.extract_text()
                if texto and len(texto.strip()) > 20:
                    return True
        return False
    except Exception:
        return False


def determinar_id_formato(extension, archivo_bytes):
    if extension == 'pdf':
        return 2 if pdf_tiene_texto_digital(archivo_bytes) else 1
    return MAPEO_FORMATO.get(extension)


def extraer_texto_pdf_digital(pdf_bytes):
    """
    Lee la capa de texto de un PDF sin pasar por OCR.

    SIN USO DESDE EL 11 DE SEPTIEMBRE DE 2026. Se conserva, igual que
    guardar_archivo_local() más abajo, para no perder el código de un camino que
    podría volver a hacer falta con otro origen de documentos.

    NO REACTIVARLA para ahorrar tiempo de OCR. Era exactamente lo que hacía el
    sistema y se quitó a propósito: sobre 180 expedientes reales, los documentos
    extraídos por acá clasificaron 88.7% contra 97.4% de los que pasaron por
    Tesseract, y su texto sale fragmentado carácter por carácter, lo que además
    impide que la búsqueda por contenido los encuentre. El razonamiento completo
    está en el docstring de _extraer_texto() en app/clasificacion/services.py.

    Si algún día vuelve a servir —por ejemplo con PDF nativos de un procesador
    de texto, donde la capa sí es fiel— hay que comprobar antes la calidad de
    esa capa, no asumirla.
    """
    texto_completo = ''
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for pagina in pdf.pages:
            texto_pagina = pagina.extract_text() or ''
            texto_completo += texto_pagina + ' '
    return texto_completo.strip(), len(pdf.pages)


# DEPRECADO — reemplazado por subir_archivo() de app.services.r2_service (migración a Cloudflare R2).
# Se deja comentado (no se borra) para poder comparar/revertir si algo falla con R2.
#
# def guardar_archivo_local(archivo_bytes, nombre_sistema):
#     """
#     Almacenamiento local temporal. Se reemplazará por Cloudflare R2
#     cuando se resuelva el problema de la tarjeta (ver pendientes del proyecto).
#     """
#     os.makedirs(RUTA_ALMACENAMIENTO_LOCAL, exist_ok=True)
#     ruta_completa = os.path.join(RUTA_ALMACENAMIENTO_LOCAL, nombre_sistema)
#
#     with open(ruta_completa, 'wb') as f:
#         f.write(archivo_bytes)
#
#     return ruta_completa


def cargar_documento(archivo_bytes, nombre_original, id_expediente, id_usuario, estado_fisico=None):
    extension = nombre_original.rsplit('.', 1)[-1].lower()

    if extension not in EXTENSIONES_PERMITIDAS:
        return None, f"Formato no permitido. Use: {', '.join(EXTENSIONES_PERMITIDAS)}"

    if len(archivo_bytes) > TAMANO_MAXIMO_BYTES:
        return None, "El archivo supera el límite de 10 MB"

    hash_archivo = calcular_hash(archivo_bytes)

    duplicado = Documento.query.filter_by(hash_archivo=hash_archivo).first()
    es_duplicado = duplicado is not None
    id_original = duplicado.id_documento if duplicado else None

    # Solo como dato descriptivo del archivo de origen: id_formato ya NO decide
    # cómo se extrae el texto. Se sigue calculando porque documentos.id_formato
    # es NOT NULL y porque saber si el archivo traía capa de texto es un dato
    # útil. Ojo con su significado: describe QUÉ TRAÍA EL ARCHIVO, no cómo se
    # extrajo — un documento con id_formato=2 también pasó por Tesseract.
    id_formato = determinar_id_formato(extension, archivo_bytes)

    _log_memoria(f"antes de procesar {nombre_original}")

    # TESSERACT SIEMPRE, aunque el PDF traiga capa de texto. Antes esto se
    # bifurcaba y usaba pdfplumber en ese caso, que era 30 veces más rápido; se
    # eliminó el 11 de septiembre de 2026 porque la capa de texto del escáner
    # del despacho devuelve el contenido desmenuzado carácter por carácter, lo
    # que degradaba la clasificación y rompía la búsqueda por contenido.
    # El razonamiento completo y los números medidos están en el docstring de
    # _extraer_texto() en app/clasificacion/services.py, y en ESTADO_PROYECTO.md.
    # NO volver a bifurcar esto por rendimiento.
    #
    # tiempo_ocr_seg mide SOLO la extracción del texto: no incluye la detección
    # de formato de arriba, ni el cálculo del hash, ni la subida a R2. Viene
    # medido desde procesar_archivo().
    resultado_ocr = procesar_archivo(archivo_bytes, extension)
    texto = resultado_ocr['texto']
    num_paginas = resultado_ocr['num_paginas']
    tiempo_ocr_seg = resultado_ocr['tiempo_seg']

    if not resultado_ocr['exitoso']:
        _log_memoria(f"después de procesar {nombre_original} (con error)")
        return None, f"Error al procesar el documento: {resultado_ocr['mensaje_error']}"

    _log_memoria(f"después de procesar {nombre_original}")

    nombre_sistema = f"{uuid.uuid4().hex}.{extension}"
    content_type = MAPEO_CONTENT_TYPE.get(extension, 'application/octet-stream')
    nombre_key = subir_archivo(archivo_bytes, nombre_sistema, content_type)

    documento = Documento(
        id_expediente=id_expediente,
        id_formato=id_formato,
        nombre_archivo_original=nombre_original,
        nombre_archivo_sistema=nombre_sistema,
        ruta_almacenamiento=nombre_key,
        tamano_bytes=len(archivo_bytes),
        num_paginas=num_paginas,
        hash_archivo=hash_archivo,
        estado_fisico=estado_fisico,
        es_duplicado_exacto=es_duplicado,
        id_documento_original=id_original,
        texto_completo=texto,
        tiempo_ocr_seg=tiempo_ocr_seg,
        cargado_por=id_usuario
    )

    db.session.add(documento)
    db.session.commit()

    return documento, None


def listar_documentos_por_expediente(id_expediente, pagina=1, por_pagina=20):
    query = Documento.query.filter_by(id_expediente=id_expediente)
    query = query.order_by(Documento.fecha_carga.desc())
    return query.paginate(page=pagina, per_page=por_pagina, error_out=False)


def obtener_documento_por_id(id_documento):
    return Documento.query.get(id_documento)


def actualizar_estado_fisico(id_documento, estado_fisico):
    documento = Documento.query.get(id_documento)
    if not documento:
        return None, "Documento no encontrado"

    documento.estado_fisico = estado_fisico
    db.session.commit()

    return documento, None


def obtener_url_descarga(id_documento):
    """Genera una URL presignada de R2 para descargar el archivo original del documento."""
    documento = Documento.query.get(id_documento)
    if not documento:
        return None, "Documento no encontrado"

    url = obtener_url_firmada(documento.ruta_almacenamiento)
    return url, None

# ---------------------------------------------------------------------------
# Borrado
# ---------------------------------------------------------------------------
#
# Existe para poder retirar un archivo subido por error sin tener que entrar a
# Supabase y a Cloudflare a mano. Es borrado real y no un estado "inactivo":
# el objeto sale de R2, porque la basura que molesta es justamente la que
# sigue ocupando el bucket y contando en los totales del dashboard.
#
# La trazabilidad no se pierde: antes de borrar se arma una instantanea que la
# ruta guarda en la tabla de auditoria, con quien, que y cuando.


def instantanea_documento(documento):
    """Lo que vale la pena conservar en auditoria de un documento que se va."""
    if not documento:
        return None

    return {
        'id_documento':            documento.id_documento,
        'id_expediente':           documento.id_expediente,
        'nombre_archivo_original': documento.nombre_archivo_original,
        'nombre_archivo_sistema':  documento.nombre_archivo_sistema,
        'ruta_almacenamiento':     documento.ruta_almacenamiento,
        'tamano_bytes':            documento.tamano_bytes,
        'num_paginas':             documento.num_paginas,
        'hash_archivo':            documento.hash_archivo,
        'es_duplicado_exacto':     documento.es_duplicado_exacto,
        'cargado_por':             documento.cargado_por,
    }


def desvincular_documento(documento):
    """
    Suelta todo lo que apunta al documento y borra su fila. NO hace commit y
    NO toca R2: devuelve la key del archivo para que el llamador la borre
    despues de que la transaccion haya quedado confirmada.

    El orden no es arbitrario. `clasificaciones_ml.id_documento` es NOT NULL y
    no admite quedar en nulo, de modo que esas filas se borran con el
    documento. Las notificaciones y el trabajo de clasificacion si aceptan
    nulo y se conservan como historial: pierden la referencia pero queda el
    registro de que el archivo paso por ahi. Lo mismo con los duplicados que
    senalen a este documento como original.

    Los imports van adentro a proposito: `clasificacion.services` ya importa de
    este modulo y hacerlos arriba seria un import circular.
    """
    from app.clasificacion.models import ClasificacionML, TrabajoClasificacion
    from app.notificaciones.models import Notificacion

    id_documento = documento.id_documento
    key = documento.ruta_almacenamiento

    ClasificacionML.query.filter_by(id_documento=id_documento).delete(synchronize_session=False)

    Notificacion.query.filter_by(id_documento=id_documento).update(
        {'id_documento': None}, synchronize_session=False
    )
    TrabajoClasificacion.query.filter_by(id_documento_creado=id_documento).update(
        {'id_documento_creado': None}, synchronize_session=False
    )
    Documento.query.filter_by(id_documento_original=id_documento).update(
        {'id_documento_original': None}, synchronize_session=False
    )

    db.session.delete(documento)

    return key


def eliminar_documento(id_documento):
    """
    Borra un documento y su archivo. Devuelve (instantanea, error).

    El commit va ANTES de tocar R2 y no al reves. Si se borrara primero el
    objeto y la transaccion fallara despues, quedaria una fila apuntando a un
    archivo inexistente, que es el peor final: el documento se ve en la lista
    y revienta al abrirlo. Al reves, lo peor que queda es un objeto huerfano en
    el bucket, que no se ve desde el sistema y se puede limpiar luego.
    """
    documento = Documento.query.get(id_documento)
    if not documento:
        return None, "Documento no encontrado"

    datos = instantanea_documento(documento)

    try:
        key = desvincular_documento(documento)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logging.exception("[borrado] fallo al borrar el documento %s", id_documento)
        return None, f"No se pudo borrar el documento: {e}"

    _borrar_de_r2(key, id_documento)

    return datos, None


def _borrar_de_r2(key, referencia):
    """
    Quita el objeto del bucket. Un fallo aca no revierte nada ni se le informa
    al usuario como error: la fila ya se borro y el archivo quedo inalcanzable
    desde el sistema. Se deja en el log para poder limpiarlo despues.
    """
    if not key:
        return

    try:
        eliminar_archivo(key)
    except Exception:
        logging.exception(
            "[borrado] la fila %s se borro pero su objeto de R2 quedo huerfano: %s",
            referencia, key
        )
