import time
import logging
import threading
from datetime import datetime, timedelta

from sqlalchemy import text

from app import db
from .models import (
    TrabajoClasificacion,
    ESTADO_PENDIENTE, ESTADO_EN_PROCESO, ESTADO_ERROR
)
from .services import procesar_trabajo

# Cada cuánto mira la cola cuando no hay nada que hacer.
INTERVALO_SEGUNDOS = 5

# Un trabajo "En proceso" más viejo que esto quedó colgado por un reinicio del
# servidor a mitad del OCR, no porque siga trabajando.
MINUTOS_ZOMBI = 15

MAX_INTENTOS = 3


def reclamar_trabajos_zombi():
    """
    Devuelve a la cola los trabajos que quedaron marcados En proceso por un
    worker que murió (deploy, reinicio, OOM). Se ejecuta una vez al arrancar.

    Los que ya agotaron los reintentos pasan a Error en vez de volver a la
    cola, para que un archivo que rompe el OCR no gire para siempre.
    """
    limite = datetime.utcnow() - timedelta(minutes=MINUTOS_ZOMBI)

    zombis = TrabajoClasificacion.query.filter(
        TrabajoClasificacion.id_estado == ESTADO_EN_PROCESO,
        TrabajoClasificacion.fecha_inicio_proceso < limite
    ).all()

    if not zombis:
        return 0

    for trabajo in zombis:
        trabajo.intentos = (trabajo.intentos or 0) + 1

        if trabajo.intentos >= MAX_INTENTOS:
            trabajo.id_estado = ESTADO_ERROR
            trabajo.mensaje_error = (
                f"Abandonado tras {trabajo.intentos} intentos: el procesamiento "
                f"quedó interrumpido más de {MINUTOS_ZOMBI} minutos"
            )
            trabajo.fecha_fin_proceso = datetime.utcnow()
            logging.warning(
                f"[worker] trabajo zombi {trabajo.id_trabajo} agoto sus "
                f"{MAX_INTENTOS} intentos — marcado Error"
            )
        else:
            trabajo.id_estado = ESTADO_PENDIENTE
            trabajo.fecha_inicio_proceso = None
            logging.info(
                f"[worker] trabajo zombi {trabajo.id_trabajo} devuelto a la cola "
                f"(intento {trabajo.intentos} de {MAX_INTENTOS})"
            )

    db.session.commit()
    return len(zombis)


def reclamar_siguiente_trabajo():
    """
    Toma el trabajo pendiente más viejo y lo marca En proceso en una sola
    sentencia atómica.

    FOR UPDATE SKIP LOCKED hace que dos workers corriendo a la vez nunca
    agarren la misma fila: el segundo saltea la que el primero tiene bloqueada
    en vez de esperarla. Hoy corre un solo worker, pero esto es lo que permite
    mover el worker a un proceso aparte sin cambiar nada.

    Devuelve el id_trabajo reclamado, o None si la cola está vacía.
    """
    resultado = db.session.execute(text("""
        UPDATE trabajos_clasificacion
        SET id_estado = :en_proceso,
            fecha_inicio_proceso = now()
        WHERE id_trabajo = (
            SELECT id_trabajo
            FROM trabajos_clasificacion
            WHERE id_estado = :pendiente
            ORDER BY fecha_encolado
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        RETURNING id_trabajo
    """), {'en_proceso': ESTADO_EN_PROCESO, 'pendiente': ESTADO_PENDIENTE})

    fila = resultado.fetchone()
    db.session.commit()

    return fila[0] if fila else None


def procesar_siguiente_trabajo():
    """
    Reclama y procesa un trabajo. Devuelve el id procesado, o None si no había
    nada pendiente.
    """
    id_trabajo = reclamar_siguiente_trabajo()

    if id_trabajo is None:
        return None

    logging.info(f"[worker] trabajo {id_trabajo} reclamado")
    procesar_trabajo(id_trabajo)

    return id_trabajo


def _loop(app):
    """Bucle del worker. Un trabajo que explota no puede matar al worker."""
    with app.app_context():
        try:
            reclamados = reclamar_trabajos_zombi()
            if reclamados:
                logging.info(f"[worker] {reclamados} trabajos zombi revisados al arrancar")
        except Exception as e:
            db.session.rollback()
            logging.error(f"[worker] fallo al revisar trabajos zombi: {e}")

        logging.info(f"[worker] iniciado — revisando la cola cada {INTERVALO_SEGUNDOS}s")

        while True:
            try:
                if procesar_siguiente_trabajo() is not None:
                    # Había trabajo: vuelve a mirar de inmediato en vez de
                    # dormir, por si la cola trae varios encolados seguidos.
                    continue
            except Exception as e:
                # El trabajo puntual queda como esté en la base; el worker sigue
                # vivo para atender los siguientes.
                db.session.rollback()
                logging.exception(f"[worker] error procesando un trabajo: {e}")

            time.sleep(INTERVALO_SEGUNDOS)


def iniciar_worker(app):
    """Lanza el worker como daemon thread, igual que el ping de mantenimiento."""
    hilo = threading.Thread(target=_loop, args=(app,), daemon=True)
    hilo.start()
    return hilo
