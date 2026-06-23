from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from .schemas import BusquedaSchema
from .services import (
    buscar_y_registrar,
    listar_historial_busquedas,
    obtener_metricas_tbr
)

busquedas_bp = Blueprint('busquedas', __name__)


@busquedas_bp.route('/api/v1/busquedas', methods=['POST'])
@require_permission('buscar_expediente')
def buscar():
    identity = json.loads(get_jwt_identity())
    schema = BusquedaSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    resultados, busqueda = buscar_y_registrar(
        id_criterio=datos['id_criterio'],
        termino=datos['termino_buscado'],
        id_usuario=identity['id_usuario'],
        desde_plataforma=datos.get('desde_plataforma', 'web')
    )

    resultados_dict = [r.to_dict() for r in resultados]

    return jsonify({
        'resultados':         resultados_dict,
        'total_resultados':   len(resultados_dict),
        'tiempo_respuesta_ms': busqueda.tiempo_respuesta_ms,
        'id_busqueda':        busqueda.id_busqueda
    }), 200


@busquedas_bp.route('/api/v1/busquedas/historial', methods=['GET'])
@require_permission('buscar_expediente')
def historial():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    id_usuario = request.args.get('id_usuario', type=int)
    id_criterio = request.args.get('id_criterio', type=int)

    resultado = listar_historial_busquedas(pagina, por_pagina, id_usuario, id_criterio)

    return jsonify({
        'busquedas':     [b.to_dict() for b in resultado.items],
        'total':         resultado.total,
        'pagina':        resultado.page,
        'por_pagina':    resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@busquedas_bp.route('/api/v1/busquedas/metricas', methods=['GET'])
@require_permission('ver_dashboard')
def metricas():
    return jsonify(obtener_metricas_tbr()), 200