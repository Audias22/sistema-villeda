from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)

    with app.app_context():
        from app.common.models import (
            Rol, Permiso, RolPermiso,
            AreaJuridica, EstadoExpediente, Prioridad, TipoExpediente
        )
        from app.usuarios.models import Usuario
        from app.clientes.models import Cliente
        from app.expedientes.models import Expediente

    from app.auth.routes import auth_bp
    from app.ocr.routes import ocr_bp
    from app.clientes.routes import clientes_bp
    from app.expedientes.routes import expedientes_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(ocr_bp)
    app.register_blueprint(clientes_bp)
    app.register_blueprint(expedientes_bp)

    return app