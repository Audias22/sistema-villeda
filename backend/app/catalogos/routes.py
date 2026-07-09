from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from .services import (
    listar_roles,
    listar_areas_juridicas,
    listar_estados_expediente,
    listar_tipos_expediente,
    listar_prioridades,
    listar_criterios_busqueda
)

catalogos_bp = Blueprint('catalogos', __name__)


@catalogos_bp.route('/api/v1/catalogos/roles', methods=['GET'])
@jwt_required()
def roles():
    return jsonify({
        'roles': [
            {'id_rol': r.id_rol, 'nombre_rol': r.nombre_rol}
            for r in listar_roles()
        ]
    }), 200


@catalogos_bp.route('/api/v1/catalogos/areas-juridicas', methods=['GET'])
@jwt_required()
def areas_juridicas():
    return jsonify({
        'areas_juridicas': [
            {'id_area': a.id_area, 'nombre': a.nombre, 'descripcion': a.descripcion}
            for a in listar_areas_juridicas()
        ]
    }), 200


@catalogos_bp.route('/api/v1/catalogos/estados-expediente', methods=['GET'])
@jwt_required()
def estados_expediente():
    return jsonify({
        'estados_expediente': [
            {'id_estado': e.id_estado, 'nombre': e.nombre, 'descripcion': e.descripcion}
            for e in listar_estados_expediente()
        ]
    }), 200


@catalogos_bp.route('/api/v1/catalogos/tipos-expediente', methods=['GET'])
@jwt_required()
def tipos_expediente():
    id_area = request.args.get('id_area', type=int)
    return jsonify({
        'tipos_expediente': [
            {'id_tipo': t.id_tipo, 'id_area': t.id_area, 'nombre': t.nombre, 'descripcion': t.descripcion}
            for t in listar_tipos_expediente(id_area)
        ]
    }), 200


@catalogos_bp.route('/api/v1/catalogos/prioridades', methods=['GET'])
@jwt_required()
def prioridades():
    return jsonify({
        'prioridades': [
            {'id_prioridad': p.id_prioridad, 'nombre': p.nombre, 'color_hex': p.color_hex}
            for p in listar_prioridades()
        ]
    }), 200


@catalogos_bp.route('/api/v1/catalogos/criterios-busqueda', methods=['GET'])
@jwt_required()
def criterios_busqueda():
    return jsonify({
        'criterios_busqueda': [
            {'id_criterio': c.id_criterio, 'nombre': c.nombre}
            for c in listar_criterios_busqueda()
        ]
    }), 200
