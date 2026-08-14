from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from .schemas import NotificacionListarSchema
from .services import (
    listar_notificaciones,
    marcar_leida,
    marcar_todas_leidas,
    LIMITE_LISTADO
)

notificaciones_bp = Blueprint('notificaciones', __name__)


@notificaciones_bp.route('/api/v1/notificaciones', methods=['GET'])
@require_permission('ver_notificaciones')
def listar():
    """Notificaciones del usuario del token, de la más nueva a la más vieja."""
    identity = json.loads(get_jwt_identity())

    schema = NotificacionListarSchema()
    try:
        params = schema.load(request.args)
    except ValidationError as err:
        return jsonify({'error': 'Parámetros inválidos', 'detalles': err.messages}), 400

    notificaciones, no_leidas = listar_notificaciones(
        identity['id_usuario'],
        limite=params.get('limite', LIMITE_LISTADO)
    )

    return jsonify({
        'notificaciones': notificaciones,
        'no_leidas':      no_leidas
    }), 200


@notificaciones_bp.route('/api/v1/notificaciones/marcar-todas-leidas', methods=['PUT'])
@require_permission('ver_notificaciones')
def marcar_todas():
    """
    Definida antes que la ruta con <int:id_notificacion> no por casualidad:
    Flask resuelve por especificidad y no por orden, pero mantenerlas juntas y
    en este orden evita confusiones al leer el archivo.
    """
    identity = json.loads(get_jwt_identity())

    total = marcar_todas_leidas(identity['id_usuario'])

    return jsonify({
        'mensaje':   'Notificaciones marcadas como leídas',
        'marcadas':  total,
        'no_leidas': 0
    }), 200


@notificaciones_bp.route('/api/v1/notificaciones/<int:id_notificacion>/leida', methods=['PUT'])
@require_permission('ver_notificaciones')
def marcar_una(id_notificacion):
    identity = json.loads(get_jwt_identity())

    notificacion, error = marcar_leida(id_notificacion, identity['id_usuario'])

    if error:
        return jsonify({'error': error}), 404

    return jsonify({'notificacion': notificacion.to_dict()}), 200
