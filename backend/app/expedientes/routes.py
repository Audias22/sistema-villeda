from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError
import json

from app.common.decorators import require_permission
from app.common.peticion import obtener_ip_cliente, PLATAFORMA_WEB
from app.auditoria.services import registrar_auditoria_segura
from .schemas import ExpedienteSchema, ExpedienteUpdateSchema, ExpedienteCerrarSchema
from .services import (
    crear_expediente,
    listar_expedientes,
    obtener_expediente_por_id,
    actualizar_expediente,
    cambiar_estado_expediente,
    serializar_expediente,
    serializar_lista_expedientes,
    eliminar_expediente
)

expedientes_bp = Blueprint('expedientes', __name__)

# Solo el Administrador borra. El borrado es definitivo y en un sistema donde
# los expedientes son la evidencia del despacho conviene que la capacidad de
# destruirla no este repartida. No se creo un permiso nuevo para no tener que
# migrar la tabla de permisos a dos dias de la defensa: si mas adelante se
# quiere un `eliminar_documento` propio, se agrega y se cambia el decorador.
ROL_ADMINISTRADOR = 'Administrador'


def _es_administrador(identity):
    """
    El token lleva id_rol, no el nombre del rol, asi que el nombre se resuelve
    contra la tabla. Import diferido para no cargar modelos en la cabecera de
    un modulo de rutas.
    """
    from app.common.models import Rol

    rol = Rol.query.get(identity.get('id_rol'))
    return rol is not None and rol.nombre_rol == ROL_ADMINISTRADOR



@expedientes_bp.route('/api/v1/expedientes', methods=['POST'])
@require_permission('gestionar_expedientes')
def crear():
    identity = json.loads(get_jwt_identity())
    schema = ExpedienteSchema()

    try:
        datos = schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    expediente, error = crear_expediente(datos, identity['id_usuario'])

    if error:
        return jsonify({'error': error}), 400

    return jsonify({'expediente': serializar_expediente(expediente)}), 201


@expedientes_bp.route('/api/v1/expedientes', methods=['GET'])
@require_permission('buscar_expediente')
def listar():
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 20, type=int)
    id_area = request.args.get('id_area', type=int)
    id_tipo = request.args.get('id_tipo', type=int)
    id_estado = request.args.get('id_estado', type=int)
    id_usuario_asignado = request.args.get('id_usuario_asignado', type=int)
    id_cliente = request.args.get('id_cliente', type=int)
    busqueda = request.args.get('busqueda', None)

    resultado = listar_expedientes(
        pagina=pagina,
        por_pagina=por_pagina,
        id_area=id_area,
        id_tipo=id_tipo,
        id_estado=id_estado,
        id_usuario_asignado=id_usuario_asignado,
        id_cliente=id_cliente,
        busqueda=busqueda
    )

    return jsonify({
        'expedientes':   serializar_lista_expedientes(resultado.items),
        'total':         resultado.total,
        'pagina':        resultado.page,
        'por_pagina':    resultado.per_page,
        'total_paginas': resultado.pages
    }), 200


@expedientes_bp.route('/api/v1/expedientes/<int:id_expediente>', methods=['GET'])
@require_permission('ver_expediente')
def obtener(id_expediente):
    expediente = obtener_expediente_por_id(id_expediente)

    if not expediente:
        return jsonify({'error': 'Expediente no encontrado'}), 404

    return jsonify({'expediente': serializar_expediente(expediente)}), 200


@expedientes_bp.route('/api/v1/expedientes/<int:id_expediente>', methods=['PUT'])
@require_permission('gestionar_expedientes')
def actualizar(id_expediente):
    identity = json.loads(get_jwt_identity())
    schema = ExpedienteUpdateSchema()

    try:
        datos = schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Datos inválidos', 'detalles': err.messages}), 400

    expediente, error = actualizar_expediente(id_expediente, datos, identity['id_usuario'])

    if error:
        codigo = 404 if error == "Expediente no encontrado" else 400
        return jsonify({'error': error}), codigo

    return jsonify({'expediente': serializar_expediente(expediente)}), 200


@expedientes_bp.route('/api/v1/expedientes/<int:id_expediente>/estado', methods=['PUT'])
@require_permission('gestionar_expedientes')
def cambiar_estado(id_expediente):
    identity = json.loads(get_jwt_identity())
    datos = request.get_json()

    nuevo_estado = datos.get('id_estado')
    if not nuevo_estado:
        return jsonify({'error': 'id_estado es requerido'}), 400

    fecha_cierre = None
    if nuevo_estado == 4:
        schema = ExpedienteCerrarSchema()
        try:
            validado = schema.load(datos)
            fecha_cierre = validado['fecha_cierre']
        except ValidationError as err:
            return jsonify({'error': 'Para cerrar un expediente se requiere fecha_cierre', 'detalles': err.messages}), 400

    expediente, error = cambiar_estado_expediente(
        id_expediente, nuevo_estado, identity['id_usuario'], fecha_cierre
    )

    if error:
        codigo = 404 if error == "Expediente no encontrado" else 400
        return jsonify({'error': error}), codigo

    return jsonify({'expediente': serializar_expediente(expediente)}), 200


@expedientes_bp.route('/api/v1/expedientes/<int:id_expediente>', methods=['DELETE'])
@require_permission('gestionar_expedientes')
def eliminar(id_expediente):
    """
    Borra el expediente completo: sus documentos, los archivos de R2 y, si
    quedo huerfano, el cliente placeholder que creo la clasificacion
    automatica. Queda constancia en auditoria.
    """
    identity = json.loads(get_jwt_identity())

    if not _es_administrador(identity):
        return jsonify({'error': 'Solo un administrador puede eliminar expedientes'}), 403

    resumen, error = eliminar_expediente(id_expediente)

    if error:
        return jsonify({'error': error}), 404 if error == "Expediente no encontrado" else 400

    registrar_auditoria_segura(
        id_usuario=identity['id_usuario'],
        tabla_afectada='expedientes',
        id_registro=id_expediente,
        accion='DELETE',
        datos_anteriores=resumen,
        ip_address=obtener_ip_cliente(),
        plataforma=PLATAFORMA_WEB
    )

    numero = resumen['expediente']['numero_expediente']
    cuantos = len(resumen['documentos'])

    return jsonify({
        'mensaje': f"Se eliminó el expediente {numero} y sus {cuantos} documento(s)",
        'resumen': resumen
    }), 200
