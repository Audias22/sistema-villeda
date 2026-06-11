from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from datetime import datetime
import json
from app import db
from .services import autenticar_usuario

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/v1/auth/login', methods=['POST'])
def login():
    datos = request.get_json()

    if not datos or not datos.get('nombre_usuario') or not datos.get('contrasena'):
        return jsonify({'error': 'Usuario y contraseña son requeridos'}), 400

    usuario, error = autenticar_usuario(
        datos['nombre_usuario'],
        datos['contrasena']
    )

    if error:
        return jsonify({'error': error}), 401

    identity = json.dumps({
        'id_usuario': usuario.id_usuario,
        'id_rol':     usuario.id_rol,
        'nombre':     usuario.nombre
    })

    token = create_access_token(identity=identity)

    usuario.ultimo_acceso = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'token':   token,
        'usuario': usuario.to_dict()
    }), 200


@auth_bp.route('/api/v1/auth/logout', methods=['POST'])
def logout():
    return jsonify({'mensaje': 'Sesión cerrada correctamente'}), 200