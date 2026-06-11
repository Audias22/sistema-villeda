from app import bcrypt
from app.usuarios.models import Usuario

def autenticar_usuario(nombre_usuario, contrasena):
    usuario = Usuario.query.filter_by(
        nombre_usuario=nombre_usuario
    ).first()

    if not usuario:
        return None, "Usuario no encontrado"

    if not usuario.activo:
        return None, "Usuario inactivo"

    if not bcrypt.check_password_hash(usuario.contrasena_hash, contrasena):
        return None, "Contraseña incorrecta"

    return usuario, None