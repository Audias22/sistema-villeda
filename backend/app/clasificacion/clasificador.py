import os
import random
import logging

from app.common.models import TipoExpediente
from app.services.modal_service import clasificar_texto, ErrorClasificadorPermanente

# Área Notarial. Todo este flujo es notarial por diseño: el 100% de los
# expedientes reales del despacho lo son.
ID_AREA_NOTARIAL = 1

# Modelo mock registrado en la tabla modelos_ml (6 clases). Los modelos 1 y 2
# (BETO y RoBERTa-bne) son los de 4 clases por área jurídica del marco teórico
# y no se tocan.
ID_MODELO_MOCK = 3

# RoBERTa-bne notarial, la fila 4 de modelos_ml: arquitectura RoBERTa-base-bne,
# F1 macro 0.9862, 4 clases, activo. Es el modelo real servido desde Modal.
ID_MODELO_MODAL = 4

# 'modal' llama al servicio real; 'mock' usa el aleatorio de abajo. El default
# es modal: en producción es lo que corresponde, y un despliegue que se olvide
# de la variable no puede terminar creando expedientes con tipos al azar.
#
# El mock NO se borra: sirve para desarrollo local sin gastar crédito de Modal
# y sin depender de la red.
MODO = os.getenv('CLASIFICADOR_MODO', 'modal').strip().lower()

MODO_MODAL = 'modal'
MODO_MOCK = 'mock'

# Proporción de predicciones que caen por encima del umbral de confianza.
#
# Solo aplica al mock. En producción se deja en 0.70, que es el comportamiento
# que queremos simular. En local conviene bajarla (por ejemplo
# MOCK_SESGO_ALTA_CONFIANZA=0.20) para que casi todos los documentos caigan en
# baja confianza y se pueda probar el modal de confirmación sin subir veinte
# archivos.
PROPORCION_ALTA = float(os.getenv('MOCK_SESGO_ALTA_CONFIANZA', '0.70'))

RANGO_CONFIANZA_ALTA = (0.70, 0.95)
RANGO_CONFIANZA_BAJA = (0.40, 0.69)


# Traducción del nombre de clase que devuelve el modelo al id_tipo del catálogo.
#
# ⚠️ LOS IDS NO SON CONSECUTIVOS Y NO SIGUEN EL ORDEN DE LAS CLASES DEL MODELO.
# Verificado contra la base el 6 de septiembre de 2026. En particular, el
# id_tipo 4 es "Acta notarial" y está INACTIVO: si alguien "simplificara" esto
# mapeando por índice (0->1, 1->2, 2->3, 3->4), todo lo que el modelo clasifique
# como "Otro" quedaría archivado como acta notarial, y no saltaría ningún error
# porque 4 es un id válido. El daño solo se vería meses después, revisando
# expedientes a mano.
#
# El mapeo va acá y NO se lee de la base a propósito: el modelo predice cuatro
# clases fijas decididas al entrenar. Si mañana alguien activa un tipo nuevo en
# el catálogo, el modelo lo va a seguir clasificando entre estas cuatro. El
# mapeo es una propiedad del modelo entrenado, no del catálogo.
MAPEO_CLASE_A_TIPO = {
    'Compraventa':        1,
    'Declaración Jurada': 16,
    'Donación':           15,
    'Otro':               18,
}


def tipos_notariales_activos():
    """
    Los 6 tipos entre los que puede elegir el mock. Se leen del catálogo en
    vez de quemarlos en el código para que desactivar un tipo en la base lo
    saque también de las predicciones.

    Solo la usa el modo mock: el modo modal traduce con MAPEO_CLASE_A_TIPO y no
    toca la base.
    """
    tipos = TipoExpediente.query.filter_by(
        id_area=ID_AREA_NOTARIAL, activo=True
    ).order_by(TipoExpediente.id_tipo).all()

    return [t.id_tipo for t in tipos]


def _umbral_del_backend():
    """
    El umbral autoritativo, para contrastarlo con el que informa Modal.

    Import diferido y no a nivel de módulo porque services.py ya importa de
    acá: hacerlo arriba sería un import circular. El umbral vive allá porque es
    política del negocio —no una propiedad del modelo— y es el valor que se
    persiste en umbral_usado y umbral_confianza_usado.
    """
    from .services import UMBRAL_CONFIANZA
    return UMBRAL_CONFIANZA


def _clasificar_con_modal(texto):
    """Llama al servicio real y traduce su respuesta al contrato de 3 claves."""
    datos = clasificar_texto(texto)

    clase = datos['clase']

    if clase not in MAPEO_CLASE_A_TIPO:
        # Permanente: reintentar daría la misma clase desconocida. Se lanza en
        # vez de caer a un default porque adivinar acá significa archivar el
        # expediente con un tipo de acto equivocado, que es el peor final
        # posible: no rompe nada visible y nadie se entera.
        raise ErrorClasificadorPermanente(
            f"El clasificador devolvió la clase '{clase}', que no está en el "
            f"mapeo. Clases conocidas: {sorted(MAPEO_CLASE_A_TIPO)}. "
            f"Si el modelo se reentrenó con otras clases, hay que actualizar "
            f"MAPEO_CLASE_A_TIPO en clasificador.py."
        )

    umbral_modal = datos.get('umbral')
    umbral_backend = _umbral_del_backend()
    if umbral_modal is not None and float(umbral_modal) != float(umbral_backend):
        # No cambia el comportamiento: manda el del backend. El aviso está para
        # que una divergencia futura sea visible en vez de silenciosa.
        logging.warning(
            f"[clasificador] el umbral que informa Modal ({umbral_modal}) difiere "
            f"del que usa el backend ({umbral_backend}). Se usa el del backend, "
            f"que es el que se persiste en umbral_usado."
        )

    return {
        'id_tipo_predicho': MAPEO_CLASE_A_TIPO[clase],
        'confianza':        round(float(datos['confianza']), 4),
        'id_modelo':        ID_MODELO_MODAL,
    }


def _clasificar_con_mock(texto):
    """
    Ignora el texto y devuelve un tipo al azar entre los notariales activos, con
    la confianza sesgada para que ~70% de los casos superen el umbral y ~30%
    caigan en revisión manual.
    """
    candidatos = tipos_notariales_activos()

    if not candidatos:
        raise ValueError('No hay tipos notariales activos para clasificar')

    id_tipo = random.choice(candidatos)

    if random.random() < PROPORCION_ALTA:
        confianza = round(random.uniform(*RANGO_CONFIANZA_ALTA), 4)
    else:
        confianza = round(random.uniform(*RANGO_CONFIANZA_BAJA), 4)

    logging.info(
        f"[clasificador] mock predijo id_tipo={id_tipo} "
        f"con confianza={confianza} sobre {len(texto)} caracteres"
    )

    return {
        'id_tipo_predicho': id_tipo,
        'confianza':        confianza,
        'id_modelo':        ID_MODELO_MOCK,
    }


def clasificar(texto):
    """
    Clasifica el texto de un documento notarial.

    Devuelve siempre {id_tipo_predicho, confianza, id_modelo}, sin importar qué
    implementación haya detrás. El worker no se entera de cuál corrió.

    Puede lanzar ErrorClasificadorPermanente (el llamador debe mandar el trabajo
    a Error) o ErrorClasificadorTransitorio (el llamador debe dejarla propagar
    para conservar los reintentos). Ver app/services/modal_service.py.
    """
    if MODO == MODO_MOCK:
        return _clasificar_con_mock(texto)

    return _clasificar_con_modal(texto)
