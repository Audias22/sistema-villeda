import os
import random
import logging

from app.common.models import TipoExpediente

# Área Notarial. Todo este flujo es notarial por diseño: el 100% de los
# expedientes reales del despacho lo son.
ID_AREA_NOTARIAL = 1

# Modelo mock registrado en la tabla modelos_ml (6 clases). Los modelos 1 y 2
# (BETO y RoBERTa-bne) son los de 4 clases por área jurídica del marco teórico
# y no se tocan.
ID_MODELO_MOCK = 3

# Proporción de predicciones que caen por encima del umbral de confianza.
#
# En producción se deja en 0.70, que es el comportamiento que queremos simular.
# En local conviene bajarla (por ejemplo MOCK_SESGO_ALTA_CONFIANZA=0.20) para
# que casi todos los documentos caigan en baja confianza y se pueda probar el
# modal de confirmación sin subir veinte archivos.
PROPORCION_ALTA = float(os.getenv('MOCK_SESGO_ALTA_CONFIANZA', '0.70'))

RANGO_CONFIANZA_ALTA = (0.70, 0.95)
RANGO_CONFIANZA_BAJA = (0.40, 0.69)


def tipos_notariales_activos():
    """
    Los 6 tipos entre los que puede elegir el modelo. Se leen del catálogo en
    vez de quemarlos en el código para que desactivar un tipo en la base lo
    saque también de las predicciones.
    """
    tipos = TipoExpediente.query.filter_by(
        id_area=ID_AREA_NOTARIAL, activo=True
    ).order_by(TipoExpediente.id_tipo).all()

    return [t.id_tipo for t in tipos]


def clasificar(texto):
    """
    Mock del clasificador. Ignora el texto y devuelve un tipo al azar entre los
    notariales activos, con la confianza sesgada para que ~70% de los casos
    superen el umbral y ~30% caigan en revisión manual.

    Se reemplaza por la llamada HTTP al modelo real (Modal) sin que cambie la
    firma: devuelve {id_tipo_predicho, confianza, id_modelo}.
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
        'id_modelo':        ID_MODELO_MOCK
    }
