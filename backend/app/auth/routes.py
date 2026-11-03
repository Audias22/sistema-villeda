from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from datetime import datetime
import json
from app import db
from app.common.models import Rol
from .services import autenticar_usuario
from . import limitador

auth_bp = Blueprint('auth', __name__)


def _origen():
    """Direccion de quien llama, respetando el proxy de Render."""
    valor = request.headers.get('X-Forwarded-For', request.remote_addr or '')

    return valor.split(',')[0].strip()


def _claves_intento(nombre_usuario):
    """
    Devuelve las dos claves que se controlan en cada intento.

    La primera es usuario mas origen, para que un atacante no deje bloqueado al
    personal de la oficina probando su usuario desde otra direccion. La segunda
    es solo el origen, con un tope mas alto, para que tampoco pueda esquivar el
    limite rotando nombres de usuario.
    """
    origen = _origen()

    return [
        f"{(nombre_usuario or '').lower()}|{origen}",
        f"origen|{origen}",
    ]


@auth_bp.route('/api/v1/auth/login', methods=['POST'])
def login():
    datos = request.get_json(silent=True)

    if not datos or not datos.get('nombre_usuario') or not datos.get('contrasena'):
        return jsonify({'error': 'Usuario y contraseña son requeridos'}), 400

    claves = _claves_intento(datos['nombre_usuario'])
    espera = max(limitador.esta_bloqueado(clave) for clave in claves)

    if espera:
        minutos = max(1, round(espera / 60))
        return jsonify({
            'error': f'Demasiados intentos fallidos. Intente de nuevo en {minutos} minuto(s).'
        }), 429

    usuario, error = autenticar_usuario(
        datos['nombre_usuario'],
        datos['contrasena']
    )

    if error:
        for clave in claves:
            limitador.registrar_fallo(clave)
        return jsonify({'error': error}), 401

    # Solo se limpia el contador del usuario, nunca el del origen. Si al
    # entrar bien se borrara tambien el de origen, alguien con una cuenta
    # valida, aunque fuera de rol bajo, podria reiniciar el limite global
    # a voluntad y seguir probando contrasenas de otros usuarios sin topar
    # nunca con el. El contador de origen se vacia solo al salir de la
    # ventana de tiempo.
    limitador.limpiar(claves[0])

    identity = json.dumps({
        'id_usuario': usuario.id_usuario,
        'id_rol':     usuario.id_rol,
        'nombre':     usuario.nombre
    })

    token = create_access_token(identity=identity)

    usuario.ultimo_acceso = datetime.utcnow()
    db.session.commit()

    rol = Rol.query.get(usuario.id_rol)
    datos_usuario = usuario.to_dict()
    datos_usuario['rol'] = rol.nombre_rol if rol else None

    return jsonify({
        'token':   token,
        'usuario': datos_usuario
    }), 200


@auth_bp.route('/api/v1/auth/logout', methods=['POST'])
def logout():
    return jsonify({'mensaje': 'Sesión cerrada correctamente'}), 200
