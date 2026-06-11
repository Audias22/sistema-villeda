from app import db
from datetime import datetime

class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id_usuario         = db.Column(db.Integer, primary_key=True)
    id_rol             = db.Column(db.Integer, db.ForeignKey('roles.id_rol'), nullable=False)
    nombre             = db.Column(db.String(100), nullable=False)
    apellido           = db.Column(db.String(100), nullable=False)
    nombre_usuario     = db.Column(db.String(50), nullable=False, unique=True)
    correo             = db.Column(db.String(150), nullable=False, unique=True)
    contrasena_hash    = db.Column(db.String(255), nullable=False)
    activo             = db.Column(db.Boolean, nullable=False, default=True)
    fecha_creacion     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    fecha_modificacion = db.Column(db.DateTime)
    ultimo_acceso      = db.Column(db.DateTime)
    creado_por         = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'))

    def to_dict(self):
        return {
            'id_usuario':     self.id_usuario,
            'nombre':         self.nombre,
            'apellido':       self.apellido,
            'nombre_usuario': self.nombre_usuario,
            'correo':         self.correo,
            'id_rol':         self.id_rol,
            'activo':         self.activo
        }