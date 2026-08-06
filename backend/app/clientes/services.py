from app import db
from app.clientes.models import Cliente
from datetime import datetime


def validar_consistencia_persona(datos):
    """
    Valida que los campos coincidan con el tipo de persona:
    1 = Natural -> requiere primer_nombre y primer_apellido
    2 = Jurídica -> requiere razon_social
    """
    tipo_persona = datos.get('tipo_persona')

    if tipo_persona == 1:
        if not datos.get('primer_nombre') or not datos.get('primer_apellido'):
            return False, "Para persona Natural se requiere primer_nombre y primer_apellido"

    elif tipo_persona == 2:
        if not datos.get('razon_social'):
            return False, "Para persona Jurídica se requiere razon_social"

    else:
        return False, "tipo_persona debe ser 1 (Natural) o 2 (Jurídica)"

    return True, None


def buscar_cliente_duplicado(dpi, nit, tipo_persona, id_excluir=None):
    """
    Busca un cliente que ya use el mismo DPI o NIT.
    El NIT solo se revisa en personas Jurídicas (tipo_persona 2), donde es su
    identificador principal — una persona Natural puede compartir NIT con su empresa.
    id_excluir sirve para no comparar un cliente contra sí mismo al editarlo.
    Devuelve (cliente_existente, nombre_del_campo) o (None, None).
    """
    def primero_con(campo, valor):
        query = Cliente.query.filter_by(**{campo: valor})
        if id_excluir:
            query = query.filter(Cliente.id_cliente != id_excluir)
        return query.first()

    if dpi:
        existente = primero_con('dpi', dpi)
        if existente:
            return existente, 'DPI'

    if tipo_persona == 2 and nit:
        existente = primero_con('nit', nit)
        if existente:
            return existente, 'NIT'

    return None, None


def crear_cliente(datos, id_usuario):
    """Devuelve (cliente, error, cliente_existente). El tercer valor solo viene con
    dato cuando el error es un duplicado, para que la ruta pueda ofrecer reutilizarlo."""
    es_valido, error = validar_consistencia_persona(datos)
    if not es_valido:
        return None, error, None

    existente, campo = buscar_cliente_duplicado(
        datos.get('dpi'), datos.get('nit'), datos.get('tipo_persona')
    )
    if existente:
        valor = datos.get('dpi') if campo == 'DPI' else datos.get('nit')
        return None, f"Ya existe un cliente registrado con el {campo} {valor}", existente

    cliente = Cliente(
        tipo_persona=datos.get('tipo_persona'),
        primer_nombre=datos.get('primer_nombre'),
        segundo_nombre=datos.get('segundo_nombre'),
        primer_apellido=datos.get('primer_apellido'),
        segundo_apellido=datos.get('segundo_apellido'),
        razon_social=datos.get('razon_social'),
        dpi=datos.get('dpi'),
        nit=datos.get('nit'),
        fecha_nacimiento=datos.get('fecha_nacimiento'),
        activo=True,
        registrado_por=id_usuario
    )

    db.session.add(cliente)
    db.session.commit()

    return cliente, None, None


def listar_clientes(pagina=1, por_pagina=20, solo_activos=True, busqueda=None):
    query = Cliente.query

    if solo_activos:
        query = query.filter_by(activo=True)

    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            db.or_(
                Cliente.primer_nombre.ilike(termino),
                Cliente.primer_apellido.ilike(termino),
                Cliente.razon_social.ilike(termino),
                Cliente.dpi.ilike(termino),
                Cliente.nit.ilike(termino)
            )
        )

    query = query.order_by(Cliente.fecha_registro.desc())

    resultado = query.paginate(page=pagina, per_page=por_pagina, error_out=False)

    return resultado


def obtener_cliente_por_id(id_cliente):
    return Cliente.query.get(id_cliente)


def actualizar_cliente(id_cliente, datos):
    """Mismo contrato de 3 valores que crear_cliente."""
    cliente = Cliente.query.get(id_cliente)
    if not cliente:
        return None, "Cliente no encontrado", None

    # En un PUT parcial tipo_persona puede no venir, así que se usa el que ya tiene
    existente, campo = buscar_cliente_duplicado(
        datos.get('dpi'),
        datos.get('nit'),
        datos.get('tipo_persona', cliente.tipo_persona),
        id_excluir=id_cliente
    )
    if existente:
        valor = datos.get('dpi') if campo == 'DPI' else datos.get('nit')
        return None, f"Ya existe otro cliente registrado con el {campo} {valor}", existente

    campos_permitidos = [
        'tipo_persona', 'primer_nombre', 'segundo_nombre',
        'primer_apellido', 'segundo_apellido', 'razon_social',
        'dpi', 'nit', 'fecha_nacimiento', 'activo'
    ]

    for campo in campos_permitidos:
        if campo in datos:
            setattr(cliente, campo, datos[campo])

    cliente.fecha_modificacion = datetime.utcnow()
    db.session.commit()

    return cliente, None, None


def desactivar_cliente(id_cliente):
    cliente = Cliente.query.get(id_cliente)
    if not cliente:
        return None, "Cliente no encontrado"

    cliente.activo = False
    cliente.fecha_modificacion = datetime.utcnow()
    db.session.commit()

    return cliente, None