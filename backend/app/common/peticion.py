from flask import request

# Valor de auditoria.plataforma para lo que entra por el panel web. La gestión
# de usuarios y de clientes solo existe ahí; la app móvil no expone esas
# pantallas. Si algún día las expone, hay que dejar de fijarlo a mano.
PLATAFORMA_WEB = 'web'


def obtener_ip_cliente():
    """
    IP real del cliente que hizo la petición.

    El backend corre detrás del proxy de Render, así que request.remote_addr
    devuelve la IP del proxy y no la del usuario. La IP original viaja en
    X-Forwarded-For, que es una lista separada por comas donde cada salto va
    agregando la que vio: el primer elemento es el cliente y los siguientes
    son los proxies intermedios. Por eso se toma el primero.

    En local, donde no hay proxy, el encabezado no viene y se cae a
    request.remote_addr.

    Advertencia para quien lea esto después: X-Forwarded-For lo puede falsificar
    cualquiera que llegue directo al backend. Sirve como evidencia de auditoría
    en operación normal, no como control de seguridad.
    """
    reenviada = request.headers.get('X-Forwarded-For')

    if reenviada:
        primera = reenviada.split(',')[0].strip()
        if primera:
            return primera

    return request.remote_addr
