import logging

from app import db
from app.auditoria.models import Auditoria


def registrar_auditoria_segura(**kwargs):
    """
    Envoltorio de registrar_auditoria() que nunca propaga una excepción.

    La auditoría es un efecto secundario: si falla, la operación que el usuario
    pidió ya ocurrió y se confirmó, y hacerla fallar por no haber podido dejar
    constancia sería peor que perder el registro. Se loguea y se sigue.

    El rollback del except no es opcional. registrar_auditoria() hace commit por
    su cuenta, y si ese commit revienta la sesión queda en estado fallido: la
    siguiente lectura del ORM —por ejemplo el to_dict() de la respuesta— tiraría
    PendingRollbackError y se llevaría puesta la petición entera.

    Devuelve el registro creado, o None si no se pudo auditar.
    """
    try:
        return registrar_auditoria(**kwargs)
    except Exception as e:
        db.session.rollback()
        logging.error(
            f"[auditoria] no se pudo registrar "
            f"{kwargs.get('accion')} sobre {kwargs.get('tabla_afectada')} "
            f"id={kwargs.get('id_registro')}: {e}"
        )
        return None


def registrar_auditoria(id_usuario, tabla_afectada, id_registro, accion,
                         datos_anteriores=None, datos_nuevos=None,
                         ip_address=None, plataforma=None):
    registro = Auditoria(
        id_usuario=id_usuario,
        tabla_afectada=tabla_afectada,
        id_registro=id_registro,
        accion=accion,
        datos_anteriores=datos_anteriores,
        datos_nuevos=datos_nuevos,
        ip_address=ip_address,
        plataforma=plataforma
    )
    db.session.add(registro)
    db.session.commit()
    return registro


def listar_auditoria(pagina=1, por_pagina=20, tabla=None, accion=None,
                      id_usuario=None, fecha_desde=None, fecha_hasta=None):
    query = Auditoria.query

    if tabla:
        query = query.filter_by(tabla_afectada=tabla)
    if accion:
        query = query.filter_by(accion=accion)
    if id_usuario:
        query = query.filter_by(id_usuario=id_usuario)
    if fecha_desde:
        query = query.filter(Auditoria.fecha_accion >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Auditoria.fecha_accion <= fecha_hasta)

    query = query.order_by(Auditoria.fecha_accion.desc())
    resultado = query.paginate(page=pagina, per_page=por_pagina, error_out=False)
    return resultado


def obtener_auditoria_por_id(id_auditoria):
    return Auditoria.query.get(id_auditoria)
