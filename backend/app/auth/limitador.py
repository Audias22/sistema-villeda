"""
Control de intentos de inicio de sesion.

Guarda en memoria los intentos fallidos por usuario y por direccion IP. Cuando
una combinacion supera el maximo permitido queda bloqueada durante unos
minutos, de modo que un atacante no puede probar contrasenas de forma
indefinida.

El almacenamiento es en memoria del proceso. Si el servicio se reinicia los
contadores se pierden, y con varios procesos cada uno lleva su propia cuenta.
Para el volumen de esta oficina, que trabaja con un solo proceso en Render, es
suficiente y evita agregar una dependencia externa.
"""

import time
from threading import Lock

# Intentos permitidos para una misma combinacion de usuario y origen.
MAX_INTENTOS = 5

# Intentos permitidos para un mismo origen, sin importar que nombre de
# usuario pruebe. Cierra el caso del atacante que rota nombres para no
# topar nunca con el limite por usuario.
MAX_INTENTOS_ORIGEN = 15
VENTANA_SEGUNDOS = 300      # los intentos viejos se olvidan a los 5 minutos
BLOQUEO_SEGUNDOS = 300      # cuanto dura el bloqueo al llegar al maximo

_intentos = {}
_candado = Lock()


def _limpiar(registro, ahora):
    """Descarta los intentos que ya salieron de la ventana de tiempo."""
    return [t for t in registro if ahora - t < VENTANA_SEGUNDOS]


def _tope(clave):
    """Las claves de solo origen llevan el tope mas alto."""
    return MAX_INTENTOS_ORIGEN if clave.startswith('origen|') else MAX_INTENTOS


def esta_bloqueado(clave):
    """
    Indica si la clave esta bloqueada en este momento.

    Devuelve los segundos que faltan para poder reintentar, o cero si no hay
    bloqueo.
    """
    ahora = time.time()

    with _candado:
        registro = _intentos.get(clave)

        if not registro:
            return 0

        registro = _limpiar(registro, ahora)
        _intentos[clave] = registro

        if len(registro) < _tope(clave):
            return 0

        restante = BLOQUEO_SEGUNDOS - (ahora - registro[-1])

        return int(restante) if restante > 0 else 0


def registrar_fallo(clave):
    """Suma un intento fallido a la clave."""
    ahora = time.time()

    with _candado:
        registro = _limpiar(_intentos.get(clave, []), ahora)
        registro.append(ahora)
        _intentos[clave] = registro


def limpiar(clave):
    """Borra el historial de la clave despues de un inicio de sesion correcto."""
    with _candado:
        _intentos.pop(clave, None)
