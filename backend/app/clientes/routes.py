from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from .schemas import ClienteSchema, ClienteUpdateSchema
from .services import (
    crear_cliente,
    listar_clientes,
    obtener_cliente_por_id,
    actualizar_cliente,
    desactivar_cliente
)

clientes_bp = Blueprint('clientes', __name__)


def respuesta_duplicado(error, existente):
    """409 Conflict con el id del cliente que ya ocupa ese DPI o NIT, para que el
    panel pueda ofrecer reutilizarlo en vez de dejar al usuario sin salida."""
    return jsonify({
        'error':      error,
        'id_cliente': existente.id_cliente,
        'cliente':    existente.to_dict()
    }), 409


@clientes_bp.route('/api/v1/clientes', methods=['POST'])
@require_permission('gestionar_clientes')
def crear():
    identity = json.loads(get_jwt_identity())
    schema = ClienteSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    cliente, error, existente = crear_cliente(datos, identity['id_usuario'])

    if error:
        if existente:
            return respuesta_duplicado(error, existente)
        return jsonify({'error': error}), 400

    return jsonify({'cliente': cliente.to_dict()}), 201


@clientes_bp.route('/api/v1/clientes', methods=['GET'])
@require_permission('gestionar_clientes')
def listar():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    solo_activos = request.args.get('solo_activos', 'true').lower() == 'true'
    busqueda = request.args.get('busqueda', None)

    resultado = listar_clientes(
        pagina=pagina,
        por_pagina=por_pagina,
        solo_activos=solo_activos,
        busqueda=busqueda
    )

    return jsonify({
        'clientes':     [c.to_dict() for c in resultado.items],
        'total':        resultado.total,
        'pagina':       resultado.page,
        'por_pagina':   resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@clientes_bp.route('/api/v1/clientes/<int:id_cliente>', methods=['GET'])
@require_permission('gestionar_clientes')
def obtener(id_cliente):
    cliente = obtener_cliente_por_id(id_cliente)

    if not cliente:
        return jsonify({'error': 'Cliente no encontrado'}), 404

    return jsonify({'cliente': cliente.to_dict()}), 200


@clientes_bp.route('/api/v1/clientes/<int:id_cliente>', methods=['PUT'])
@require_permission('gestionar_clientes')
def actualizar(id_cliente):
    schema = ClienteUpdateSchema()

    try:
        datos = schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    cliente, error, existente = actualizar_cliente(id_cliente, datos)

    if error:
        if existente:
            return respuesta_duplicado(error, existente)
        codigo = 404 if error == "Cliente no encontrado" else 400
        return jsonify({'error': error}), codigo

    return jsonify({'cliente': cliente.to_dict()}), 200


@clientes_bp.route('/api/v1/clientes/<int:id_cliente>', methods=['DELETE'])
@require_permission('gestionar_clientes')
def desactivar(id_cliente):
    cliente, error = desactivar_cliente(id_cliente)

    if error:
        return jsonify({'error': error}), 404

    return jsonify({'mensaje': 'Cliente desactivado correctamente', 'cliente': cliente.to_dict()}), 200