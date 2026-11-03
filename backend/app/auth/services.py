import logging

from app import bcrypt
from app.usuarios.models import Usuario

logger = logging.getLogger(__name__)

# Un solo mensaje para cualquier credencial invalida. Distinguir entre usuario
# inexistente y contrasena incorrecta le permitiria a un atacante averiguar que
# usuarios existen probando nombres contra el login.
CREDENCIALES_INVALIDAS = "Usuario o contraseña incorrectos"


def autenticar_usuario(nombre_usuario, contrasena):
    usuario = Usuario.query.filter_by(
        nombre_usuario=nombre_usuario
    ).first()

    if not usuario:
        logger.info("[auth] intento con usuario inexistente")
        return None, CREDENCIALES_INVALIDAS

    if not usuario.activo:
        logger.info("[auth] intento sobre usuario inactivo id=%s", usuario.id_usuario)
        return None, CREDENCIALES_INVALIDAS

    if not bcrypt.check_password_hash(usuario.contrasena_hash, contrasena):
        logger.info("[auth] contrasena incorrecta para id=%s", usuario.id_usuario)
        return None, CREDENCIALES_INVALIDAS

    return usuario, None
