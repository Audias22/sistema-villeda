from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from app.common.peticion import obtener_ip_cliente, PLATAFORMA_WEB
from app.auditoria.services import registrar_auditoria_segura
from .schemas import ClienteSchema, ClienteUpdateSchema
from .services import (
    crear_cliente,
    listar_clientes,
    obtener_cliente_por_id,
    actualizar_cliente,
    desactivar_cliente
)

clientes_bp = Blueprint('clientes', __name__)

# Lista blanca de lo que se guarda en auditoria.datos_anteriores y datos_nuevos:
# campos identificatorios y de estado. Se leen del modelo directo, no de
# to_dict(), para que ampliar ese método no amplíe la auditoría por accidente.
#
# Quedan fuera las fechas (fecha_nacimiento, fecha_registro, fecha_modificacion):
# no son lo que se audita —cuándo pasó ya está en auditoria.fecha_accion— y
# además date y datetime no son serializables a JSONB sin convertirlos.
CAMPOS_AUDITABLES = (
    'id_cliente', 'tipo_persona',
    'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
    'razon_social', 'dpi', 'nit',
    'telefono', 'email', 'direccion', 'activo'
)


def instantanea(cliente):
    """Estado auditable del cliente en este momento, como dict plano.

    Materializar el dict antes de llamar al servicio es lo que permite conservar
    el estado anterior: los servicios mutan la misma instancia que devolvió la
    consulta."""
    if cliente is None:
        return None
    return {campo: getattr(cliente, campo) for campo in CAMPOS_AUDITABLES}


def respuesta_duplicado(error, existente):
    """409 Conflict con el id del cliente que ya ocupa ese DPI o NIT, para que el
    panel pueda ofrecer reutilizarlo en vez de dejar al usuario sin salida."""
    return jsonify({
        'error':      error,
        'id_cliente': existente.id_cliente,
        'cliente':    existente.to_dict()
    }), 409


@clientes_bp.route('/api/v1/clientes', methods=['POST'])
@require_permission('gestionar_clientes')
def crear():
    identity = json.loads(get_jwt_identity())
    schema = ClienteSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    cliente, error, existente = crear_cliente(datos, identity['id_usuario'])

    # El 409 por duplicado no se audita: no hubo cambio en la base que registrar.
    if error:
        if existente:
            return respuesta_duplicado(error, existente)
        return jsonify({'error': error}), 400

    # La respuesta se arma antes de auditar: registrar_auditoria() commitea y deja
    # expirados los objetos de la sesión, así que un to_dict() posterior dispararía
    # una recarga contra la base.
    respuesta = cliente.to_dict()

    registrar_auditoria_segura(
        id_usuario=identity['id_usuario'],
        tabla_afectada='clientes',
        id_registro=cliente.id_cliente,
        accion='INSERT',
        datos_nuevos=instantanea(cliente),
        ip_address=obtener_ip_cliente(),
        plataforma=PLATAFORMA_WEB
    )

    return jsonify({'cliente': respuesta}), 201


@clientes_bp.route('/api/v1/clientes', methods=['GET'])
@require_permission('gestionar_clientes')
def listar():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    solo_activos = request.args.get('solo_activos', 'true').lower() == 'true'
    busqueda = request.args.get('busqueda', None)

    resultado = listar_clientes(
        pagina=pagina,
        por_pagina=por_pagina,
        solo_activos=solo_activos,
        busqueda=busqueda
    )

    return jsonify({
        'clientes':     [c.to_dict() for c in resultado.items],
        'total':        resultado.total,
        'pagina':       resultado.page,
        'por_pagina':   resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@clientes_bp.route('/api/v1/clientes/<int:id_cliente>', methods=['GET'])
@require_permission('gestionar_clientes')
def obtener(id_cliente):
    cliente = obtener_cliente_por_id(id_cliente)

    if not cliente:
        return jsonify({'error': 'Cliente no encontrado'}), 404

    return jsonify({'cliente': cliente.to_dict()}), 200


@clientes_bp.route('/api/v1/clientes/<int:id_cliente>', methods=['PUT'])
@require_permission('gestionar_clientes')
def actualizar(id_cliente):
    identity = json.loads(get_jwt_identity())
    schema = ClienteUpdateSchema()

    try:
        datos = schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    datos_anteriores = instantanea(obtener_cliente_por_id(id_cliente))

    cliente, error, existente = actualizar_cliente(id_cliente, datos)

    if error:
        if existente:
            return respuesta_duplicado(error, existente)
        codigo = 404 if error == "Cliente no encontrado" else 400
        return jsonify({'error': error}), codigo

    respuesta = cliente.to_dict()

    registrar_auditoria_segura(
        id_usuario=identity['id_usuario'],
        tabla_afectada='clientes',
        id_registro=cliente.id_cliente,
        accion='UPDATE',
        datos_anteriores=datos_anteriores,
        datos_nuevos=instantanea(cliente),
        ip_address=obtener_ip_cliente(),
        plataforma=PLATAFORMA_WEB
    )

    return jsonify({'cliente': respuesta}), 200


@clientes_bp.route('/api/v1/clientes/<int:id_cliente>', methods=['DELETE'])
@require_permission('gestionar_clientes')
def desactivar(id_cliente):
    identity = json.loads(get_jwt_identity())

    datos_anteriores = instantanea(obtener_cliente_por_id(id_cliente))

    cliente, error = desactivar_cliente(id_cliente)

    if error:
        return jsonify({'error': error}), 404

    respuesta = cliente.to_dict()

    # DELETE lógico: la fila sigue existiendo con activo=false, así que se guarda
    # también el estado posterior. Sin él no quedaría registrado en la auditoría
    # qué cambió, solo cómo estaba antes.
    registrar_auditoria_segura(
        id_usuario=identity['id_usuario'],
        tabla_afectada='clientes',
        id_registro=cliente.id_cliente,
        accion='DELETE',
        datos_anteriores=datos_anteriores,
        datos_nuevos=instantanea(cliente),
        ip_address=obtener_ip_cliente(),
        plataforma=PLATAFORMA_WEB
    )

    return jsonify({'mensaje': 'Cliente desactivado correctamente', 'cliente': respuesta}), 200
