"""
Cliente HTTP del clasificador desplegado en Modal.

Sigue la forma de r2_service.py: variables de entorno resueltas en el import,
funciones simples y NINGUNA captura de excepciones de negocio — quien llama
decide qué hacer con el fallo. Lo único que hace este módulo es traducir el
fallo crudo a una de las dos excepciones de abajo, que es la información que el
llamador necesita para decidir.

TRANSITORIO VS PERMANENTE — POR QUÉ SON DOS EXCEPCIONES Y NO UNA
----------------------------------------------------------------
El worker de clasificación trata los dos casos de forma opuesta, y la
diferencia importa:

  ErrorClasificadorTransitorio  el fallo puede desaparecer solo (timeout,
                                conexión caída, 5xx de Modal, 429). El worker
                                la deja propagar, el trabajo queda En proceso y
                                el rescate de zombis lo reintenta.

  ErrorClasificadorPermanente   reintentar no va a cambiar nada (400, una clase
                                que no está en el mapeo, una respuesta sin la
                                clave 'clase', falta la variable de entorno).
                                El worker lo manda a Error y avisa al usuario.

Servicio desplegado con backend/modal_app/clasificador_modal.py.

Variables de entorno:
    MODAL_CLASIFICADOR_URL   URL del endpoint. Sin default: si falta, la
                             primera llamada lanza ErrorClasificadorPermanente.
                             Hay que cargarla también en Render, no solo en el
                             .env local.
"""

import logging
import os

import requests

MODAL_CLASIFICADOR_URL = os.getenv('MODAL_CLASIFICADOR_URL')

# 90 segundos cubre con margen el arranque en frío de Modal, medido en 32s el
# 6 de septiembre de 2026. Las llamadas con el contenedor tibio tardan ~1.5s.
# Queda por debajo del timeout=120 declarado del lado de Modal, a propósito: el
# cliente se rinde antes que el servidor y no al revés.
TIMEOUT_SEG = 90

# 429 es el único 4xx que se trata como transitorio: significa "volvé a
# intentar", no "tu petición está mal".
HTTP_DEMASIADAS_PETICIONES = 429


class ErrorClasificador(Exception):
    """Base, para poder atrapar las dos de una sola vez si hiciera falta."""


class ErrorClasificadorTransitorio(ErrorClasificador):
    """El fallo puede resolverse solo. Conviene reintentar."""


class ErrorClasificadorPermanente(ErrorClasificador):
    """Reintentar daría el mismo resultado. Hay que intervenir."""


def clasificar_texto(texto):
    """
    Manda el texto al clasificador y devuelve la respuesta cruda de Modal:

        {'clase': str, 'confianza': float, 'modelo': str,
         'estrategia': str, 'umbral': float, 'todas': {clase: prob}}

    No traduce la clase a id_tipo: eso es responsabilidad del backend, que es
    quien conoce su propio catálogo. Este módulo no sabe nada de Supabase.
    """
    if not MODAL_CLASIFICADOR_URL:
        # Permanente y no transitorio: sin la variable de entorno, reintentar
        # mil veces daría exactamente lo mismo. La validación es acá y no en el
        # import a propósito — que falte esta variable no puede dejar sin login
        # ni sin búsquedas al resto del sistema.
        raise ErrorClasificadorPermanente(
            'Falta la variable de entorno MODAL_CLASIFICADOR_URL. '
            'Hay que cargarla en Render y en el .env local, o poner '
            'CLASIFICADOR_MODO=mock para usar el clasificador simulado.'
        )

    try:
        respuesta = requests.post(
            MODAL_CLASIFICADOR_URL,
            json={'texto': texto},
            timeout=TIMEOUT_SEG,
        )
    except requests.exceptions.Timeout as e:
        raise ErrorClasificadorTransitorio(
            f'El clasificador no respondió en {TIMEOUT_SEG}s: {e}'
        ) from e
    except requests.exceptions.ConnectionError as e:
        raise ErrorClasificadorTransitorio(
            f'No se pudo conectar con el clasificador: {e}'
        ) from e
    except requests.exceptions.RequestException as e:
        # Cualquier otro fallo de la capa de transporte. Se asume transitorio
        # porque es de red: si resultara permanente, el trabajo agota sus 3
        # intentos y termina en Error igual, solo que más tarde.
        raise ErrorClasificadorTransitorio(
            f'Fallo de red al llamar al clasificador: {e}'
        ) from e

    codigo = respuesta.status_code

    if codigo >= 500 or codigo == HTTP_DEMASIADAS_PETICIONES:
        raise ErrorClasificadorTransitorio(
            f'El clasificador respondió HTTP {codigo}: {respuesta.text[:300]}'
        )

    if codigo >= 400:
        # El servicio devuelve 400 con {'error': ...} cuando el texto va vacío o
        # no es texto. Es un problema del documento, no del servicio.
        raise ErrorClasificadorPermanente(
            f'El clasificador rechazó la petición con HTTP {codigo}: '
            f'{respuesta.text[:300]}'
        )

    try:
        datos = respuesta.json()
    except ValueError as e:
        raise ErrorClasificadorPermanente(
            f'El clasificador devolvió algo que no es JSON: {respuesta.text[:300]}'
        ) from e

    if not isinstance(datos, dict) or 'clase' not in datos or 'confianza' not in datos:
        raise ErrorClasificadorPermanente(
            f'Respuesta del clasificador con estructura inesperada: {str(datos)[:300]}'
        )

    # Las probabilidades de las cuatro clases se loguean enteras. Ante una
    # predicción rara, esto es lo que separa "el modelo se equivocó" de "el
    # modelo dudó entre dos", y es material para el Capítulo V cuando la oficina
    # empiece a usar el sistema con documentos reales.
    logging.info(
        f"[clasificador] {datos['clase']} confianza={datos['confianza']} "
        f"todas={datos.get('todas')} modelo={datos.get('modelo')} "
        f"estrategia={datos.get('estrategia')}"
    )

    return datos
