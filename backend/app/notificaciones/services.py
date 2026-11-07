from datetime import datetime

from app import db
from .models import Notificacion, TipoNotificacion, TIPO_BAJA_CONFIANZA

# Cuántas notificaciones devuelve el listado del panel. La campanita muestra las
# más recientes, no el historial completo.
LIMITE_LISTADO = 20


def crear_notificacion(id_usuario, id_tipo, mensaje, id_expediente=None,
                        id_documento=None, id_carga=None, id_trabajo=None):
    """
    Agrega la notificación a la sesión SIN commitear.

    El commit queda en manos del llamador a propósito: el worker crea la
    notificación dentro de la misma transacción que el expediente, así que si
    la creación falla y hace rollback, no queda un aviso de algo que nunca
    ocurrió.
    """
    notificacion = Notificacion(
        id_usuario=id_usuario,
        id_tipo=id_tipo,
        id_expediente=id_expediente,
        id_documento=id_documento,
        id_carga=id_carga,
        id_trabajo=id_trabajo,
        mensaje=mensaje,
        leida=False
    )

    db.session.add(notificacion)

    return notificacion


def listar_notificaciones(id_usuario, limite=LIMITE_LISTADO):
    """
    Las más recientes del usuario, con los datos de presentación de su tipo
    (nombre, ícono y color) ya resueltos, y el conteo de no leídas.
    """
    filas = db.session.query(Notificacion, TipoNotificacion).join(
        TipoNotificacion, Notificacion.id_tipo == TipoNotificacion.id_tipo
    ).filter(
        Notificacion.id_usuario == id_usuario
    ).order_by(Notificacion.fecha_creacion.desc()).limit(limite).all()

    notificaciones = []
    for notificacion, tipo in filas:
        datos = notificacion.to_dict()
        datos['tipo_nombre'] = tipo.nombre
        datos['icono'] = tipo.icono
        datos['color_hex'] = tipo.color_hex
        notificaciones.append(datos)

    # Cuenta sobre el total del usuario, no sobre las 20 devueltas.
    no_leidas = Notificacion.query.filter_by(id_usuario=id_usuario, leida=False).count()

    return notificaciones, no_leidas


def marcar_leida(id_notificacion, id_usuario):
    """
    Marca una notificación como leída. Devuelve (notificacion, error).

    Verifica la pertenencia: un usuario no puede tocar las notificaciones de
    otro. Se responde lo mismo si no existe o si es de otro usuario, para no
    revelar qué ids están ocupados.
    """
    notificacion = Notificacion.query.get(id_notificacion)

    if not notificacion or notificacion.id_usuario != id_usuario:
        return None, "Notificación no encontrada"

    if not notificacion.leida:
        notificacion.leida = True
        notificacion.fecha_lectura = datetime.utcnow()
        db.session.commit()

    return notificacion, None


def marcar_todas_leidas(id_usuario):
    """Marca como leídas todas las pendientes del usuario. Devuelve cuántas cambió."""
    ahora = datetime.utcnow()

    total = Notificacion.query.filter_by(
        id_usuario=id_usuario, leida=False
    ).update({'leida': True, 'fecha_lectura': ahora})

    db.session.commit()

    return total

def _tiene_decision_pendiente(notificacion):
    """
    Una notificación de baja confianza es la única puerta para confirmar o
    descartar ese documento desde la campanita. Si se borrara antes de decidir,
    el trabajo quedaría esperando sin que nadie lo vea.
    """
    if notificacion.id_tipo != TIPO_BAJA_CONFIANZA or not notificacion.id_trabajo:
        return False

    # Import diferido: clasificacion importa notificaciones.services.
    from app.clasificacion.models import TrabajoClasificacion

    trabajo = TrabajoClasificacion.query.get(notificacion.id_trabajo)
    return bool(trabajo and trabajo.requiere_confirmacion and not trabajo.id_expediente_creado)


def eliminar_notificacion(id_notificacion, id_usuario):
    """
    Borra una notificación del usuario. Devuelve (ok, error, codigo).

    Borrado físico: la notificación es un aviso, no un registro de auditoría.
    Lo que pasó con el documento queda en trabajos_clasificacion, expedientes
    y auditoria.
    """
    notificacion = Notificacion.query.get(id_notificacion)

    if not notificacion or notificacion.id_usuario != id_usuario:
        return False, "Notificación no encontrada", 404

    if _tiene_decision_pendiente(notificacion):
        return False, "Primero confirmá o descartá el documento de esta notificación", 409

    db.session.delete(notificacion)
    db.session.commit()
    return True, None, 200


def eliminar_leidas(id_usuario):
    """
    Borra todas las notificaciones leídas del usuario. Devuelve cuántas borró.
    Las de baja confianza pendientes nunca están leídas (se marcan al decidir),
    así que este borrado no las alcanza.
    """
    total = Notificacion.query.filter_by(
        id_usuario=id_usuario, leida=True
    ).delete(synchronize_session=False)

    db.session.commit()
    return total
