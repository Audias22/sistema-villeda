from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity
import json

from app.common.decorators import require_permission
from .services import (
    obtener_dashboard,
    exportar_expedientes_excel,
    registrar_solicitud_exportacion,
    marcar_exportacion_exitosa,
    marcar_exportacion_fallida
)

reportes_bp = Blueprint('reportes', __name__)


@reportes_bp.route('/api/v1/reportes/dashboard', methods=['GET'])
@require_permission('ver_dashboard')
def dashboard():
    id_area = request.args.get('id_area', type=int)
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')

    return jsonify(obtener_dashboard(id_area, fecha_desde, fecha_hasta)), 200


@reportes_bp.route('/api/v1/reportes/expedientes/excel', methods=['GET'])
@require_permission('exportar_reporte')
def exportar_excel():
    identity = json.loads(get_jwt_identity())

    id_area = request.args.get('id_area', type=int)
    id_estado = request.args.get('id_estado', type=int)
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')

    # Solo los filtros que realmente llegaron. Si no vino ninguno queda {} y no
    # null: la diferencia entre "se exportó todo" y "no sabemos qué se pidió".
    parametros = {
        clave: valor
        for clave, valor in (
            ('id_area', id_area),
            ('id_estado', id_estado),
            ('fecha_desde', fecha_desde),
            ('fecha_hasta', fecha_hasta)
        )
        if valor is not None
    }

    id_exportacion = registrar_solicitud_exportacion(identity['id_usuario'], parametros)

    try:
        ruta_archivo, nombre_archivo = exportar_expedientes_excel(
            id_area, id_estado, fecha_desde, fecha_hasta
        )
    except Exception as e:
        marcar_exportacion_fallida(id_exportacion, e)
        raise

    marcar_exportacion_exitosa(id_exportacion, ruta_archivo, nombre_archivo)

    return send_file(
        ruta_archivo,
        as_attachment=True,
        download_name=nombre_archivo,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
