from app.common.models import AreaJuridica, EstadoExpediente, TipoExpediente, Prioridad, Rol
from app.busquedas.models import CriterioBusqueda


def listar_roles():
    return Rol.query.order_by(Rol.id_rol).all()


def listar_areas_juridicas():
    return AreaJuridica.query.filter_by(activo=True).order_by(AreaJuridica.nombre).all()


def listar_estados_expediente():
    return EstadoExpediente.query.order_by(EstadoExpediente.id_estado).all()


def listar_tipos_expediente(id_area=None):
    query = TipoExpediente.query.filter_by(activo=True)
    if id_area:
        query = query.filter_by(id_area=id_area)
    return query.order_by(TipoExpediente.nombre).all()


def listar_prioridades():
    return Prioridad.query.order_by(Prioridad.id_prioridad).all()


def listar_criterios_busqueda():
    return CriterioBusqueda.query.order_by(CriterioBusqueda.id_criterio).all()
