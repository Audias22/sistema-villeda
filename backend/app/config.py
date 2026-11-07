import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    SECRET_KEY = os.getenv('JWT_SECRET_KEY')

    # El token de acceso dura 15 minutos (era el valor por defecto de la
    # libreria, ahora queda escrito). El token de renovacion dura 30 dias y
    # solo lo usa la app movil para pedir un token de acceso nuevo despues de
    # que el usuario se autentica con la huella. No sirve como token de acceso:
    # require_permission() llama a verify_jwt_in_request() sin refresh=True, y
    # la libreria rechaza un token de renovacion en esas rutas.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Origenes autorizados a consumir la API desde un navegador. Se definen
    # de forma explicita en lugar de permitir cualquier origen, para que una
    # pagina de terceros no pueda llamar a la API con la sesion del usuario.
    # La aplicacion movil no se ve afectada: las peticiones nativas no pasan
    # por la politica de mismo origen del navegador.
    #
    # Se puede sobrescribir con la variable CORS_ORIGINS, separando los
    # valores con coma, sin tener que volver a desplegar el codigo.
    # El patron cubre las URL que Vercel genera por despliegue y por vista
    # previa dentro de este mismo proyecto, por ejemplo
    # sistema-villeda-panel-f61kfxivr-audias22s-orgs-projects.vercel.app.
    # Queda atado al nombre del proyecto y a la organizacion, asi que no
    # abre la puerta a dominios de terceros.
    _ORIGENES_POR_DEFECTO = (
        'https://sistema-villeda-panel.vercel.app,'
        r'https://sistema-villeda-panel-[a-z0-9]+-audias22s-orgs-projects\.vercel\.app,'
        'http://localhost:5173,'
        'http://127.0.0.1:5173'
    )

    CORS_ORIGINS = [
        origen.strip()
        for origen in os.getenv('CORS_ORIGINS', _ORIGENES_POR_DEFECTO).split(',')
        if origen.strip()
    ]