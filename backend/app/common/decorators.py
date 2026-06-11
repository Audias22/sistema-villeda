from functools import wraps
import json
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.common.models import Permiso, RolPermiso

def require_permission(permiso):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            identity = json.loads(get_jwt_identity())

            permiso_obj = Permiso.query.filter_by(
                nombre_permiso=permiso
            ).first()

            if not permiso_obj:
                return jsonify({'error': 'Permiso no definido'}), 403

            tiene = RolPermiso.query.filter_by(
                id_rol=identity['id_rol'],
                id_permiso=permiso_obj.id_permiso
            ).first()

            if not tiene:
                return jsonify({'error': 'No tiene permiso para realizar esta acción'}), 403

            return f(*args, **kwargs)
        return wrapper
    return decorator