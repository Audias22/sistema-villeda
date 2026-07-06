from flask import Blueprint, request, jsonify

from app.common.decorators import require_permission
from .services import listar_auditoria, obtener_auditoria_por_id

auditoria_bp = Blueprint('auditoria', __name__)


@auditoria_bp.route('/api/v1/auditoria', methods=['GET'])
@require_permission('ver_auditoria')
def listar():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    tabla = request.args.get('tabla')
    accion = request.args.get('accion')
    usuario = request.args.get('usuario', type=int)
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')

    resultado = listar_auditoria(
        pagina=pagina,
        por_pagina=por_pagina,
        tabla=tabla,
        accion=accion,
        id_usuario=usuario,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )

    return jsonify({
        'auditoria':     [a.to_dict() for a in resultado.items],
        'total':         resultado.total,
        'pagina':        resultado.page,
        'por_pagina':    resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@auditoria_bp.route('/api/v1/auditoria/<int:id_auditoria>', methods=['GET'])
@require_permission('ver_auditoria')
def obtener(id_auditoria):
    registro = obtener_auditoria_por_id(id_auditoria)

    if not registro:
        return jsonify({'error': 'Registro de auditoría no encontrado'}), 404

    return jsonify({'auditoria': registro.to_dict()}), 200
