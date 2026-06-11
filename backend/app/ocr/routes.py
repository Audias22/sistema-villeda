from flask import Blueprint, request, jsonify
from app.common.decorators import require_permission
from .services import procesar_archivo, calcular_hash

ocr_bp = Blueprint('ocr', __name__)

EXTENSIONES_PERMITIDAS = {'pdf', 'jpg', 'jpeg', 'png'}
TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024  # 10 MB

@ocr_bp.route('/api/v1/ocr/procesar', methods=['POST'])
@require_permission('cargar_documento')
def procesar():
    if 'archivo' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400

    archivo = request.files['archivo']

    if archivo.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400

    extension = archivo.filename.rsplit('.', 1)[-1].lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        return jsonify({'error': f'Formato no permitido. Use: {", ".join(EXTENSIONES_PERMITIDAS)}'}), 400

    archivo_bytes = archivo.read()

    if len(archivo_bytes) > TAMANO_MAXIMO_BYTES:
        return jsonify({'error': 'El archivo supera el límite de 10 MB'}), 400

    hash_archivo = calcular_hash(archivo_bytes)

    resultado = procesar_archivo(archivo_bytes, extension)

    return jsonify({
        'hash_archivo':    hash_archivo,
        'texto':           resultado['texto'],
        'num_paginas':     resultado['num_paginas'],
        'num_caracteres':  resultado['num_caracteres'],
        'num_palabras':    resultado['num_palabras'],
        'tiempo_seg':      resultado['tiempo_seg'],
        'exitoso':         resultado['exitoso'],
        'mensaje_error':   resultado['mensaje_error']
    }), 200