from app import db
from app.expedientes.models import Expediente
from app.common.models import Rol
from datetime import datetime


def generar_numero_expediente(id_area):
    """
    Genera un número único de expediente con formato:
    [AREA]-[AÑO]-[SECUENCIA]
    Ejemplo: NOT-2026-0001, CIV-2026-0002
    """
    prefijos = {1: 'NOT', 2: 'CIV', 3: 'LAB', 4: 'PEN'}
    prefijo = prefijos.get(id_area, 'EXP')
    anio = datetime.utcnow().year

    total_anio = Expediente.query.filter(
        db.extract('year', Expediente.fecha_creacion) == anio
    ).count()

    secuencia = str(total_anio + 1).zfill(4)

    return f"{prefijo}-{anio}-{secuencia}"


def crear_expediente(datos, id_usuario):
    numero_expediente = generar_numero_expediente(datos['id_area'])

    expediente = Expediente(
        id_cliente=datos['id_cliente'],
        id_tipo_expediente=datos['id_tipo_expediente'],
        id_area=datos['id_area'],
        id_estado=1,  # Activo por defecto
        id_usuario_asignado=datos['id_usuario_asignado'],
        numero_expediente=numero_expediente,
        titulo=datos['titulo'],
        descripcion=datos.get('descripcion'),
        fecha_apertura=datos['fecha_apertura'],
        prioridad=datos['prioridad'],
        es_duplicado_posible=False,
        creado_por=id_usuario
    )

    db.session.add(expediente)
    db.session.commit()

    return expediente, None


def listar_expedientes(pagina=1, por_pagina=20, id_area=None, id_estado=None,
                        id_usuario_asignado=None, busqueda=None):
    query = Expediente.query

    if id_area:
        query = query.filter_by(id_area=id_area)

    if id_estado:
        query = query.filter_by(id_estado=id_estado)

    if id_usuario_asignado:
        query = query.filter_by(id_usuario_asignado=id_usuario_asignado)

    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            db.or_(
                Expediente.numero_expediente.ilike(termino),
                Expediente.titulo.ilike(termino)
            )
        )

    query = query.order_by(Expediente.fecha_creacion.desc())

    resultado = query.paginate(page=pagina, per_page=por_pagina, error_out=False)

    return resultado


def obtener_expediente_por_id(id_expediente):
    return Expediente.query.get(id_expediente)


def actualizar_expediente(id_expediente, datos, id_usuario):
    expediente = Expediente.query.get(id_expediente)
    if not expediente:
        return None, "Expediente no encontrado"

    if expediente.id_estado in (4, 5):  # Cerrado o Archivado
        return None, "No se puede modificar un expediente cerrado o archivado"

    campos_permitidos = [
        'id_tipo_expediente', 'id_area', 'id_usuario_asignado',
        'titulo', 'descripcion', 'prioridad'
    ]

    for campo in campos_permitidos:
        if campo in datos:
            setattr(expediente, campo, datos[campo])

    expediente.fecha_modificacion = datetime.utcnow()
    expediente.modificado_por = id_usuario

    db.session.commit()

    return expediente, None


def cambiar_estado_expediente(id_expediente, nuevo_estado, id_usuario, fecha_cierre=None):
    expediente = Expediente.query.get(id_expediente)
    if not expediente:
        return None, "Expediente no encontrado"

    transiciones_validas = {
        1: [2, 3, 4],  # Activo -> En revisión, Pendiente, Cerrado
        2: [1, 3, 4],  # En revisión -> Activo, Pendiente, Cerrado
        3: [1, 2, 4],  # Pendiente -> Activo, En revisión, Cerrado
        4: [5],        # Cerrado -> Archivado (única transición permitida)
        5: []          # Archivado -> sin transiciones
    }

    if nuevo_estado not in transiciones_validas.get(expediente.id_estado, []):
        return None, f"Transición de estado no permitida ({expediente.id_estado} -> {nuevo_estado})"

    expediente.id_estado = nuevo_estado
    expediente.fecha_modificacion = datetime.utcnow()
    expediente.modificado_por = id_usuario

    if nuevo_estado == 4:  # Cerrado
        expediente.fecha_cierre = fecha_cierre or datetime.utcnow().date()

    db.session.commit()

    return expediente, None