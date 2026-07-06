from app import db
from app.auditoria.models import Auditoria


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
