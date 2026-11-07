from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
)
from datetime import datetime
import json
from app import db
from app.common.models import Rol
from app.usuarios.models import Usuario
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

    # Espacios al inicio o al final del usuario no son parte del nombre: un
    # espacio tecleado sin querer daba "credenciales inválidas" con el usuario
    # correcto. La contraseña NO se recorta: ahí un espacio sí es un carácter.
    if datos and isinstance(datos.get('nombre_usuario'), str):
        datos['nombre_usuario'] = datos['nombre_usuario'].strip()

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

    identity = _identidad(usuario)

    token = create_access_token(identity=identity)
    token_renovacion = create_refresh_token(identity=identity)

    usuario.ultimo_acceso = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'token':            token,
        'refresh_token':    token_renovacion,
        'usuario':          _datos_usuario(usuario)
    }), 200


def _identidad(usuario):
    return json.dumps({
        'id_usuario': usuario.id_usuario,
        'id_rol':     usuario.id_rol,
        'nombre':     usuario.nombre
    })


def _datos_usuario(usuario):
    rol = Rol.query.get(usuario.id_rol)
    datos = usuario.to_dict()
    datos['rol'] = rol.nombre_rol if rol else None
    return datos


@auth_bp.route('/api/v1/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def renovar():
    """
    Entrega un token de acceso nuevo a cambio del token de renovacion.

    Lo llama la app movil despues de que el usuario se autentica con la huella:
    la huella demuestra que es el dueno del telefono y el token de renovacion,
    guardado cifrado en ese telefono, demuestra que alguna vez entro con su
    contrasena. Asi la sesion se puede retomar sin escribirla de nuevo.

    El usuario se vuelve a leer de la base en cada renovacion: si lo
    desactivaron desde el panel, o le cambiaron el rol, se entera aca y no
    tiene que esperar a que venzan los 30 dias.
    """
    identidad = json.loads(get_jwt_identity())
    usuario = Usuario.query.get(identidad.get('id_usuario'))

    if not usuario or not usuario.activo:
        return jsonify({'error': 'La sesión ya no es válida. Inicia sesión con tu contraseña.'}), 401

    return jsonify({
        'token':   create_access_token(identity=_identidad(usuario)),
        'usuario': _datos_usuario(usuario)
    }), 200


@auth_bp.route('/api/v1/auth/logout', methods=['POST'])
def logout():
    return jsonify({'mensaje': 'Sesión cerrada correctamente'}), 200
