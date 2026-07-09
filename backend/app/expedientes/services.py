from app import db
from app.expedientes.models import Expediente
from app.common.models import Rol, AreaJuridica, EstadoExpediente, TipoExpediente, Prioridad
from app.clientes.models import Cliente
from app.usuarios.models import Usuario
from datetime import datetime


def _nombre_cliente(cliente):
    if not cliente:
        return None
    if cliente.razon_social:
        return cliente.razon_social
    return ' '.join(filter(None, [cliente.primer_nombre, cliente.primer_apellido]))


def _nombre_usuario(usuario):
    if not usuario:
        return None
    return f"{usuario.nombre} {usuario.apellido}"


def serializar_expediente(expediente):
    """Enriquece el expediente con los nombres de sus catálogos relacionados, no solo los IDs."""
    datos = expediente.to_dict()
    datos['cliente_nombre'] = _nombre_cliente(Cliente.query.get(expediente.id_cliente))
    datos['area_nombre'] = getattr(AreaJuridica.query.get(expediente.id_area), 'nombre', None)
    datos['tipo_nombre'] = getattr(TipoExpediente.query.get(expediente.id_tipo_expediente), 'nombre', None)
    datos['estado_nombre'] = getattr(EstadoExpediente.query.get(expediente.id_estado), 'nombre', None)
    datos['prioridad_nombre'] = getattr(Prioridad.query.get(expediente.prioridad), 'nombre', None)
    datos['usuario_asignado_nombre'] = _nombre_usuario(Usuario.query.get(expediente.id_usuario_asignado))
    return datos


def serializar_lista_expedientes(expedientes):
    """Igual que serializar_expediente pero evita N+1 consultas: precarga los catálogos
    (tablas pequeñas) y hace una sola consulta IN para clientes y usuarios asignados."""
    if not expedientes:
        return []

    areas = {a.id_area: a.nombre for a in AreaJuridica.query.all()}
    tipos = {t.id_tipo: t.nombre for t in TipoExpediente.query.all()}
    estados = {e.id_estado: e.nombre for e in EstadoExpediente.query.all()}
    prioridades = {p.id_prioridad: p.nombre for p in Prioridad.query.all()}

    ids_cliente = {e.id_cliente for e in expedientes}
    ids_usuario = {e.id_usuario_asignado for e in expedientes}

    clientes = {c.id_cliente: c for c in Cliente.query.filter(Cliente.id_cliente.in_(ids_cliente)).all()}
    usuarios = {u.id_usuario: u for u in Usuario.query.filter(Usuario.id_usuario.in_(ids_usuario)).all()}

    resultado = []
    for e in expedientes:
        datos = e.to_dict()
        datos['cliente_nombre'] = _nombre_cliente(clientes.get(e.id_cliente))
        datos['area_nombre'] = areas.get(e.id_area)
        datos['tipo_nombre'] = tipos.get(e.id_tipo_expediente)
        datos['estado_nombre'] = estados.get(e.id_estado)
        datos['prioridad_nombre'] = prioridades.get(e.prioridad)
        datos['usuario_asignado_nombre'] = _nombre_usuario(usuarios.get(e.id_usuario_asignado))
        resultado.append(datos)
    return resultado


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