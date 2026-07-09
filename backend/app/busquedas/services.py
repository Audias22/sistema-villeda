import time
from app import db
from app.busquedas.models import Busqueda
from app.expedientes.models import Expediente
from app.expedientes.services import serializar_lista_expedientes
from app.clientes.models import Cliente
from app.documentos.models import Documento
from sqlalchemy import func


CRITERIOS = {
    1: 'nombre_cliente',
    2: 'fecha',
    3: 'area',
    4: 'contenido',
    5: 'numero_expediente'
}


def ejecutar_busqueda_por_criterio(id_criterio, termino):
    """
    Ejecuta la consulta real según el criterio.
    El tiempo se mide ÚNICAMENTE alrededor de esta función,
    sin incluir validación de esquema ni serialización de respuesta,
    para que el TBR refleje el tiempo real de búsqueda y recuperación.
    """
    resultados = []

    if id_criterio == 1:  # nombre_cliente (insensible a acentos)
        termino_normalizado = f"%{termino}%"
        expedientes = db.session.query(Expediente).join(
            Cliente, Expediente.id_cliente == Cliente.id_cliente
        ).filter(
            db.or_(
                func.unaccent(Cliente.primer_nombre).ilike(func.unaccent(termino_normalizado)),
                func.unaccent(Cliente.primer_apellido).ilike(func.unaccent(termino_normalizado)),
                func.unaccent(Cliente.razon_social).ilike(func.unaccent(termino_normalizado))
            )
        ).all()
        resultados = expedientes

    elif id_criterio == 2:  # fecha
        resultados = Expediente.query.filter(
            Expediente.fecha_apertura == termino
        ).all()

    elif id_criterio == 3:  # area
        resultados = Expediente.query.filter(
            Expediente.id_area == int(termino)
        ).all()

    elif id_criterio == 4:  # contenido (insensible a acentos)
        termino_normalizado = f"%{termino}%"
        resultados = Documento.query.filter(
            func.unaccent(Documento.texto_completo).ilike(func.unaccent(termino_normalizado))
        ).all()

    elif id_criterio == 5:  # numero_expediente
        termino_like = f"%{termino}%"
        resultados = Expediente.query.filter(
            Expediente.numero_expediente.ilike(termino_like)
        ).all()

    return resultados


def buscar_y_registrar(id_criterio, termino, id_usuario, desde_plataforma='web'):
    """
    Mide el tiempo real de la consulta y registra la búsqueda
    en la tabla BUSQUEDAS para análisis posterior del TBR.
    """
    inicio = time.perf_counter()
    resultados = ejecutar_busqueda_por_criterio(id_criterio, termino)
    fin = time.perf_counter()

    tiempo_ms = round((fin - inicio) * 1000)

    busqueda = Busqueda(
        id_usuario=id_usuario,
        id_criterio=id_criterio,
        termino_buscado=termino,
        resultados_encontrados=len(resultados),
        tiempo_respuesta_ms=tiempo_ms,
        desde_plataforma=desde_plataforma
    )

    db.session.add(busqueda)
    db.session.commit()

    return resultados, busqueda


def serializar_resultados(id_criterio, resultados):
    """
    Unifica la forma de los resultados para el frontend: siempre expedientes
    con nombres resueltos (cliente, área, estado), incluso cuando el criterio
    es 'contenido' (donde la búsqueda real ocurre sobre documentos).
    """
    if id_criterio == 4:  # contenido -> resultados son Documento, se resuelve al expediente padre
        ids_expediente = {d.id_expediente for d in resultados}
        expedientes = Expediente.query.filter(Expediente.id_expediente.in_(ids_expediente)).all() if ids_expediente else []
        return serializar_lista_expedientes(expedientes)

    return serializar_lista_expedientes(resultados)


def listar_historial_busquedas(pagina=1, por_pagina=20, id_usuario=None, id_criterio=None):
    query = Busqueda.query

    if id_usuario:
        query = query.filter_by(id_usuario=id_usuario)

    if id_criterio:
        query = query.filter_by(id_criterio=id_criterio)

    query = query.order_by(Busqueda.fecha_busqueda.desc())

    return query.paginate(page=pagina, per_page=por_pagina, error_out=False)


def obtener_metricas_tbr():
    """
    Métricas agregadas de TBR para validar la tesis (Capítulo V).
    Usa time.perf_counter() — más preciso que time.time() para medir duraciones.
    """
    resultado = db.session.query(
        db.func.avg(Busqueda.tiempo_respuesta_ms).label('promedio_ms'),
        db.func.min(Busqueda.tiempo_respuesta_ms).label('minimo_ms'),
        db.func.max(Busqueda.tiempo_respuesta_ms).label('maximo_ms'),
        db.func.count(Busqueda.id_busqueda).label('total_busquedas')
    ).first()

    return {
        'promedio_ms':     round(resultado.promedio_ms, 2) if resultado.promedio_ms else 0,
        'minimo_ms':       resultado.minimo_ms or 0,
        'maximo_ms':       resultado.maximo_ms or 0,
        'total_busquedas': resultado.total_busquedas or 0
    }