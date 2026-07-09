from app import db, bcrypt
from app.usuarios.models import Usuario
from datetime import datetime


def crear_usuario(datos, id_usuario_creador):
    if Usuario.query.filter_by(nombre_usuario=datos['nombre_usuario']).first():
        return None, f"Ya existe un usuario con el nombre de usuario {datos['nombre_usuario']}"

    if Usuario.query.filter_by(correo=datos['correo']).first():
        return None, f"Ya existe un usuario registrado con el correo {datos['correo']}"

    usuario = Usuario(
        id_rol=datos['id_rol'],
        nombre=datos['nombre'],
        apellido=datos['apellido'],
        nombre_usuario=datos['nombre_usuario'],
        correo=datos['correo'],
        contrasena_hash=bcrypt.generate_password_hash(datos['contrasena']).decode('utf-8'),
        activo=True,
        creado_por=id_usuario_creador
    )

    db.session.add(usuario)
    db.session.commit()

    return usuario, None


def listar_usuarios(pagina=1, por_pagina=20, solo_activos=None, busqueda=None):
    query = Usuario.query

    if solo_activos is not None:
        query = query.filter_by(activo=solo_activos)

    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            db.or_(
                Usuario.nombre.ilike(termino),
                Usuario.apellido.ilike(termino),
                Usuario.nombre_usuario.ilike(termino),
                Usuario.correo.ilike(termino)
            )
        )

    query = query.order_by(Usuario.fecha_creacion.desc())

    return query.paginate(page=pagina, per_page=por_pagina, error_out=False)


def obtener_usuario_por_id(id_usuario):
    return Usuario.query.get(id_usuario)


def actualizar_usuario(id_usuario, datos):
    usuario = Usuario.query.get(id_usuario)
    if not usuario:
        return None, "Usuario no encontrado"

    if datos.get('nombre_usuario') and datos['nombre_usuario'] != usuario.nombre_usuario:
        existente = Usuario.query.filter_by(nombre_usuario=datos['nombre_usuario']).first()
        if existente:
            return None, f"Ya existe otro usuario con el nombre de usuario {datos['nombre_usuario']}"

    if datos.get('correo') and datos['correo'] != usuario.correo:
        existente = Usuario.query.filter_by(correo=datos['correo']).first()
        if existente:
            return None, f"Ya existe otro usuario registrado con el correo {datos['correo']}"

    campos_permitidos = ['id_rol', 'nombre', 'apellido', 'nombre_usuario', 'correo', 'activo']
    for campo in campos_permitidos:
        if campo in datos:
            setattr(usuario, campo, datos[campo])

    if datos.get('contrasena'):
        usuario.contrasena_hash = bcrypt.generate_password_hash(datos['contrasena']).decode('utf-8')

    usuario.fecha_modificacion = datetime.utcnow()
    db.session.commit()

    return usuario, None


def desactivar_usuario(id_usuario):
    usuario = Usuario.query.get(id_usuario)
    if not usuario:
        return None, "Usuario no encontrado"

    usuario.activo = False
    usuario.fecha_modificacion = datetime.utcnow()
    db.session.commit()

    return usuario, None
