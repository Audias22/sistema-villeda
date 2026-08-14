from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
import json

from app.common.decorators import require_permission
from .services import encolar_trabajo, obtener_trabajo

clasificacion_bp = Blueprint('clasificacion', __name__)


@clasificacion_bp.route('/api/v1/clasificacion/trabajos', methods=['POST'])
@require_permission('cargar_documento')
def encolar():
    """
    Encola un documento suelto para que el worker lo clasifique.

    Responde 202 (Accepted) y no 201: el trabajo quedó aceptado, no completado
    — todavía no existe ni el expediente ni el documento, los crea el worker.
    """
    identity = json.loads(get_jwt_identity())

    if 'archivo' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400

    archivo = request.files['archivo']

    if archivo.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400

    archivo_bytes = archivo.read()

    trabajo, error = encolar_trabajo(
        archivo_bytes=archivo_bytes,
        nombre_original=archivo.filename,
        id_usuario=identity['id_usuario']
    )

    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'id_trabajo': trabajo.id_trabajo,
        'mensaje':    'Documento encolado para clasificación',
        'estado':     'Pendiente'
    }), 202


@clasificacion_bp.route('/api/v1/clasificacion/trabajos/<int:id_trabajo>', methods=['GET'])
@require_permission('cargar_documento')
def consultar(id_trabajo):
    """Estado actual de un trabajo de la cola."""
    trabajo, error = obtener_trabajo(id_trabajo)

    if error:
        return jsonify({'error': error}), 404

    return jsonify({'trabajo': trabajo}), 200
