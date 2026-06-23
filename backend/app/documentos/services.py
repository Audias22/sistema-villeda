import os
import uuid
import pdfplumber
import io

from app import db
from app.documentos.models import Documento
from app.ocr.services import calcular_hash, procesar_archivo


EXTENSIONES_PERMITIDAS = {'pdf', 'jpg', 'jpeg', 'png'}
TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024  # 10 MB

MAPEO_FORMATO = {
    'jpg':  5,
    'jpeg': 5,
    'png':  6
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
    """Extrae texto de un PDF digital sin pasar por OCR (más rápido y preciso)"""
    texto_completo = ''
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for pagina in pdf.pages:
            texto_pagina = pagina.extract_text() or ''
            texto_completo += texto_pagina + ' '
    return texto_completo.strip(), len(pdf.pages)


def guardar_archivo_local(archivo_bytes, nombre_sistema):
    """
    Almacenamiento local temporal. Se reemplazará por Cloudflare R2
    cuando se resuelva el problema de la tarjeta (ver pendientes del proyecto).
    """
    os.makedirs(RUTA_ALMACENAMIENTO_LOCAL, exist_ok=True)
    ruta_completa = os.path.join(RUTA_ALMACENAMIENTO_LOCAL, nombre_sistema)

    with open(ruta_completa, 'wb') as f:
        f.write(archivo_bytes)

    return ruta_completa


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

    id_formato = determinar_id_formato(extension, archivo_bytes)

    if extension == 'pdf' and id_formato == 2:
        texto, num_paginas = extraer_texto_pdf_digital(archivo_bytes)
    else:
        resultado_ocr = procesar_archivo(archivo_bytes, extension)
        texto = resultado_ocr['texto']
        num_paginas = resultado_ocr['num_paginas']

        if not resultado_ocr['exitoso']:
            return None, f"Error al procesar el documento: {resultado_ocr['mensaje_error']}"

    nombre_sistema = f"{uuid.uuid4().hex}.{extension}"
    ruta = guardar_archivo_local(archivo_bytes, nombre_sistema)

    documento = Documento(
        id_expediente=id_expediente,
        id_formato=id_formato,
        nombre_archivo_original=nombre_original,
        nombre_archivo_sistema=nombre_sistema,
        ruta_almacenamiento=ruta,
        tamano_bytes=len(archivo_bytes),
        num_paginas=num_paginas,
        hash_archivo=hash_archivo,
        estado_fisico=estado_fisico,
        es_duplicado_exacto=es_duplicado,
        id_documento_original=id_original,
        texto_completo=texto,
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