import uuid

from app import db
from app.ocr.services import calcular_hash
from app.services.r2_service import subir_archivo
from app.documentos.services import (
    EXTENSIONES_PERMITIDAS,
    TAMANO_MAXIMO_BYTES,
    MAPEO_CONTENT_TYPE
)
from .models import TrabajoClasificacion, EstadoProcesamiento, ESTADO_PENDIENTE


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
