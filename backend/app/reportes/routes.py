from flask import Blueprint, jsonify, request, send_file
from app.common.decorators import require_permission
from .services import obtener_dashboard, exportar_expedientes_excel

reportes_bp = Blueprint('reportes', __name__)


@reportes_bp.route('/api/v1/reportes/dashboard', methods=['GET'])
@require_permission('ver_dashboard')
def dashboard():
    return jsonify(obtener_dashboard()), 200


@reportes_bp.route('/api/v1/reportes/expedientes/excel', methods=['GET'])
@require_permission('exportar_reporte')
def exportar_excel():
    id_area = request.args.get('id_area', type=int)
    id_estado = request.args.get('id_estado', type=int)

    ruta_archivo, nombre_archivo = exportar_expedientes_excel(id_area, id_estado)

    return send_file(
        ruta_archivo,
        as_attachment=True,
        download_name=nombre_archivo,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )