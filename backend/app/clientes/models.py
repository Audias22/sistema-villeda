from app import db
from datetime import datetime

class Cliente(db.Model):
    __tablename__ = 'clientes'

    id_cliente         = db.Column(db.Integer, primary_key=True)
    tipo_persona       = db.Column(db.Integer, nullable=False)
    primer_nombre      = db.Column(db.String)
    segundo_nombre     = db.Column(db.String)
    primer_apellido    = db.Column(db.String)
    segundo_apellido   = db.Column(db.String)
    razon_social       = db.Column(db.String)
    dpi                = db.Column(db.String)
    nit                = db.Column(db.String)
    fecha_nacimiento   = db.Column(db.Date)
    activo             = db.Column(db.Boolean, nullable=False, default=True)
    fecha_registro     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    registrado_por     = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'))
    fecha_modificacion = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id_cliente':       self.id_cliente,
            'tipo_persona':     self.tipo_persona,
            'primer_nombre':    self.primer_nombre,
            'segundo_nombre':   self.segundo_nombre,
            'primer_apellido':  self.primer_apellido,
            'segundo_apellido': self.segundo_apellido,
            'razon_social':     self.razon_social,
            'dpi':              self.dpi,
            'nit':              self.nit,
            'fecha_nacimiento': self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None,
            'activo':           self.activo,
            'fecha_registro':   self.fecha_registro.isoformat() if self.fecha_registro else None,
            'registrado_por':   self.registrado_por,
            'fecha_modificacion': self.fecha_modificacion.isoformat() if self.fecha_modificacion else None
        }