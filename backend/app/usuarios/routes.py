from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from .schemas import UsuarioSchema, UsuarioUpdateSchema
from .services import (
    crear_usuario,
    listar_usuarios,
    obtener_usuario_por_id,
    actualizar_usuario,
    desactivar_usuario
)

usuarios_bp = Blueprint('usuarios', __name__)


@usuarios_bp.route('/api/v1/usuarios', methods=['POST'])
@require_permission('gestionar_usuarios')
def crear():
    identity = json.loads(get_jwt_identity())
    schema = UsuarioSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    usuario, error = crear_usuario(datos, identity['id_usuario'])

    if error:
        return jsonify({'error': error}), 400

    return jsonify({'usuario': usuario.to_dict()}), 201


@usuarios_bp.route('/api/v1/usuarios', methods=['GET'])
@require_permission('gestionar_usuarios')
def listar():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    busqueda = request.args.get('busqueda', None)

    resultado = listar_usuarios(pagina=pagina, por_pagina=por_pagina, busqueda=busqueda)

    return jsonify({
        'usuarios':      [u.to_dict() for u in resultado.items],
        'total':         resultado.total,
        'pagina':        resultado.page,
        'por_pagina':    resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@usuarios_bp.route('/api/v1/usuarios/<int:id_usuario>', methods=['GET'])
@require_permission('gestionar_usuarios')
def obtener(id_usuario):
    usuario = obtener_usuario_por_id(id_usuario)

    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify({'usuario': usuario.to_dict()}), 200


@usuarios_bp.route('/api/v1/usuarios/<int:id_usuario>', methods=['PUT'])
@require_permission('gestionar_usuarios')
def actualizar(id_usuario):
    schema = UsuarioUpdateSchema()

    try:
        datos = schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    usuario, error = actualizar_usuario(id_usuario, datos)

    if error:
        return jsonify({'error': error}), 404 if error == "Usuario no encontrado" else 400

    return jsonify({'usuario': usuario.to_dict()}), 200


@usuarios_bp.route('/api/v1/usuarios/<int:id_usuario>', methods=['DELETE'])
@require_permission('gestionar_usuarios')
def desactivar(id_usuario):
    usuario, error = desactivar_usuario(id_usuario)

    if error:
        return jsonify({'error': error}), 404

    return jsonify({'mensaje': 'Usuario desactivado correctamente', 'usuario': usuario.to_dict()}), 200
