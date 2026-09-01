from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from app.common.peticion import obtener_ip_cliente, PLATAFORMA_WEB
from app.auditoria.services import registrar_auditoria_segura
from .schemas import UsuarioSchema, UsuarioUpdateSchema
from .services import (
    crear_usuario,
    listar_usuarios,
    obtener_usuario_por_id,
    actualizar_usuario,
    desactivar_usuario
)

usuarios_bp = Blueprint('usuarios', __name__)

# Lista blanca de lo que se guarda en auditoria.datos_anteriores y datos_nuevos.
# Es una lista blanca y no una lista negra a propósito: si mañana alguien agrega
# una columna sensible al modelo, no se filtra sola a la auditoría, hay que
# nombrarla acá. contrasena_hash NUNCA entra.
#
# Se leen los atributos del modelo directo y no to_dict(), para que un cambio en
# ese método no pueda ampliar lo que se audita sin que nadie lo note. Son todos
# enteros, strings y booleanos: JSONB los serializa sin conversión.
CAMPOS_AUDITABLES = (
    'id_usuario', 'nombre', 'apellido', 'nombre_usuario', 'correo', 'id_rol', 'activo'
)


def instantanea(usuario):
    """Estado auditable del usuario en este momento, como dict plano.

    Que sea un dict y no el objeto ORM es lo que hace posible el snapshot previo
    a un UPDATE: los servicios mutan la misma instancia que devuelve la consulta,
    así que un dict materializado antes del cambio es la única forma de conservar
    el estado anterior sin tocar la firma de los servicios."""
    if usuario is None:
        return None
    return {campo: getattr(usuario, campo) for campo in CAMPOS_AUDITABLES}


@usuarios_bp.route('/api/v1/usuarios', methods=['POST'])
@require_permission('gestionar_usuarios')
def crear():
    identity = json.loads(get_jwt_identity())
    schema = UsuarioSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    usuario, error = crear_usuario(datos, identity['id_usuario'])

    if error:
        return jsonify({'error': error}), 400

    # La respuesta se arma antes de auditar: registrar_auditoria() commitea y deja
    # expirados los objetos de la sesión, así que un to_dict() posterior dispararía
    # una recarga contra la base.
    respuesta = usuario.to_dict()

    registrar_auditoria_segura(
        id_usuario=identity['id_usuario'],
        tabla_afectada='usuarios',
        id_registro=usuario.id_usuario,
        accion='INSERT',
        datos_nuevos=instantanea(usuario),
        ip_address=obtener_ip_cliente(),
        plataforma=PLATAFORMA_WEB
    )

    return jsonify({'usuario': respuesta}), 201


@usuarios_bp.route('/api/v1/usuarios', methods=['GET'])
@require_permission('gestionar_usuarios')
def listar():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    busqueda = request.args.get('busqueda', None)

    resultado = listar_usuarios(pagina=pagina, por_pagina=por_pagina, busqueda=busqueda)

    return jsonify({
        'usuarios':      [u.to_dict() for u in resultado.items],
        'total':         resultado.total,
        'pagina':        resultado.page,
        'por_pagina':    resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@usuarios_bp.route('/api/v1/usuarios/<int:id_usuario>', methods=['GET'])
@require_permission('gestionar_usuarios')
def obtener(id_usuario):
    usuario = obtener_usuario_por_id(id_usuario)

    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify({'usuario': usuario.to_dict()}), 200


@usuarios_bp.route('/api/v1/usuarios/<int:id_usuario>', methods=['PUT'])
@require_permission('gestionar_usuarios')
def actualizar(id_usuario):
    identity = json.loads(get_jwt_identity())
    schema = UsuarioUpdateSchema()

    try:
        datos = schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    datos_anteriores = instantanea(obtener_usuario_por_id(id_usuario))

    usuario, error = actualizar_usuario(id_usuario, datos)

    if error:
        return jsonify({'error': error}), 404 if error == "Usuario no encontrado" else 400

    respuesta = usuario.to_dict()

    registrar_auditoria_segura(
        id_usuario=identity['id_usuario'],
        tabla_afectada='usuarios',
        id_registro=usuario.id_usuario,
        accion='UPDATE',
        datos_anteriores=datos_anteriores,
        datos_nuevos=instantanea(usuario),
        ip_address=obtener_ip_cliente(),
        plataforma=PLATAFORMA_WEB
    )

    return jsonify({'usuario': respuesta}), 200


@usuarios_bp.route('/api/v1/usuarios/<int:id_usuario>', methods=['DELETE'])
@require_permission('gestionar_usuarios')
def desactivar(id_usuario):
    identity = json.loads(get_jwt_identity())

    datos_anteriores = instantanea(obtener_usuario_por_id(id_usuario))

    usuario, error = desactivar_usuario(id_usuario)

    if error:
        return jsonify({'error': error}), 404

    respuesta = usuario.to_dict()

    # DELETE lógico: la fila sigue existiendo con activo=false, así que se guarda
    # también el estado posterior. Sin él no quedaría registrado en la auditoría
    # qué cambió, solo cómo estaba antes.
    registrar_auditoria_segura(
        id_usuario=identity['id_usuario'],
        tabla_afectada='usuarios',
        id_registro=usuario.id_usuario,
        accion='DELETE',
        datos_anteriores=datos_anteriores,
        datos_nuevos=instantanea(usuario),
        ip_address=obtener_ip_cliente(),
        plataforma=PLATAFORMA_WEB
    )

    return jsonify({'mensaje': 'Usuario desactivado correctamente', 'usuario': respuesta}), 200
