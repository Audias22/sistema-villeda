from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from .schemas import ExpedienteSchema, ExpedienteUpdateSchema, ExpedienteCerrarSchema
from .services import (
    crear_expediente,
    listar_expedientes,
    obtener_expediente_por_id,
    actualizar_expediente,
    cambiar_estado_expediente
)

expedientes_bp = Blueprint('expedientes', __name__)


@expedientes_bp.route('/api/v1/expedientes', methods=['POST'])
@require_permission('gestionar_expedientes')
def crear():
    identity = json.loads(get_jwt_identity())
    schema = ExpedienteSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    expediente, error = crear_expediente(datos, identity['id_usuario'])

    if error:
        return jsonify({'error': error}), 400

    return jsonify({'expediente': expediente.to_dict()}), 201


@expedientes_bp.route('/api/v1/expedientes', methods=['GET'])
@require_permission('buscar_expediente')
def listar():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    id_area = request.args.get('id_area', type=int)
    id_estado = request.args.get('id_estado', type=int)
    id_usuario_asignado = request.args.get('id_usuario_asignado', type=int)
    busqueda = request.args.get('busqueda', None)

    resultado = listar_expedientes(
        pagina=pagina,
        por_pagina=por_pagina,
        id_area=id_area,
        id_estado=id_estado,
        id_usuario_asignado=id_usuario_asignado,
        busqueda=busqueda
    )

    return jsonify({
        'expedientes':   [e.to_dict() for e in resultado.items],
        'total':         resultado.total,
        'pagina':        resultado.page,
        'por_pagina':    resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@expedientes_bp.route('/api/v1/expedientes/<int:id_expediente>', methods=['GET'])
@require_permission('ver_expediente')
def obtener(id_expediente):
    expediente = obtener_expediente_por_id(id_expediente)

    if not expediente:
        return jsonify({'error': 'Expediente no encontrado'}), 404

    return jsonify({'expediente': expediente.to_dict()}), 200


@expedientes_bp.route('/api/v1/expedientes/<int:id_expediente>', methods=['PUT'])
@require_permission('gestionar_expedientes')
def actualizar(id_expediente):
    identity = json.loads(get_jwt_identity())
    schema = ExpedienteUpdateSchema()

    try:
        datos = schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    expediente, error = actualizar_expediente(id_expediente, datos, identity['id_usuario'])

    if error:
        codigo = 404 if error == "Expediente no encontrado" else 400
        return jsonify({'error': error}), codigo

    return jsonify({'expediente': expediente.to_dict()}), 200


@expedientes_bp.route('/api/v1/expedientes/<int:id_expediente>/estado', methods=['PUT'])
@require_permission('gestionar_expedientes')
def cambiar_estado(id_expediente):
    identity = json.loads(get_jwt_identity())
    datos = request.get_json()

    nuevo_estado = datos.get('id_estado')
    if not nuevo_estado:
        return jsonify({'error': 'id_estado es requerido'}), 400

    fecha_cierre = None
    if nuevo_estado == 4:
        schema = ExpedienteCerrarSchema()
        try:
            validado = schema.load(datos)
            fecha_cierre = validado['fecha_cierre']
        except ValidationError as err:
            return jsonify({'error': 'Para cerrar un expediente se requiere fecha_cierre', 'detalles': err.messages}), 400

    expediente, error = cambiar_estado_expediente(
        id_expediente, nuevo_estado, identity['id_usuario'], fecha_cierre
    )

    if error:
        codigo = 404 if error == "Expediente no encontrado" else 400
        return jsonify({'error': error}), codigo

    return jsonify({'expediente': expediente.to_dict()}), 200