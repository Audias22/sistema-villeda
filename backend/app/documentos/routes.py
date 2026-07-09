from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from .schemas import DocumentoUploadSchema, DocumentoUpdateSchema
from .services import (
    cargar_documento,
    listar_documentos_por_expediente,
    obtener_documento_por_id,
    actualizar_estado_fisico,
    obtener_url_descarga
)

documentos_bp = Blueprint('documentos', __name__)


@documentos_bp.route('/api/v1/documentos', methods=['POST'])
@require_permission('cargar_documento')
def cargar():
    identity = json.loads(get_jwt_identity())

    if 'archivo' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400

    archivo = request.files['archivo']

    if archivo.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400

    schema = DocumentoUploadSchema()
    try:
        datos_form = schema.load(request.form)
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    archivo_bytes = archivo.read()

    documento, error = cargar_documento(
        archivo_bytes=archivo_bytes,
        nombre_original=archivo.filename,
        id_expediente=datos_form['id_expediente'],
        id_usuario=identity['id_usuario'],
        estado_fisico=datos_form.get('estado_fisico')
    )

    if error:
        return jsonify({'error': error}), 400

    respuesta = documento.to_dict()
    if documento.es_duplicado_exacto:
        respuesta['aviso'] = f"Documento duplicado del documento ID {documento.id_documento_original}"

    return jsonify({'documento': respuesta}), 201


@documentos_bp.route('/api/v1/expedientes/<int:id_expediente>/documentos', methods=['GET'])
@require_permission('ver_expediente')
def listar_por_expediente(id_expediente):
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)

    resultado = listar_documentos_por_expediente(id_expediente, pagina, por_pagina)

    return jsonify({
        'documentos':    [d.to_dict() for d in resultado.items],
        'total':         resultado.total,
        'pagina':        resultado.page,
        'por_pagina':    resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@documentos_bp.route('/api/v1/documentos/<int:id_documento>', methods=['GET'])
@require_permission('ver_expediente')
def obtener(id_documento):
    documento = obtener_documento_por_id(id_documento)

    if not documento:
        return jsonify({'error': 'Documento no encontrado'}), 404

    return jsonify({'documento': documento.to_dict_completo()}), 200


@documentos_bp.route('/api/v1/documentos/<int:id_documento>/descarga', methods=['GET'])
@require_permission('ver_expediente')
def descargar(id_documento):
    url, error = obtener_url_descarga(id_documento)

    if error:
        return jsonify({'error': error}), 404

    return jsonify({'url_descarga': url}), 200


@documentos_bp.route('/api/v1/documentos/<int:id_documento>', methods=['PUT'])
@require_permission('cargar_documento')
def actualizar(id_documento):
    schema = DocumentoUpdateSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    documento, error = actualizar_estado_fisico(id_documento, datos.get('estado_fisico'))

    if error:
        return jsonify({'error': error}), 404

    return jsonify({'documento': documento.to_dict()}), 200