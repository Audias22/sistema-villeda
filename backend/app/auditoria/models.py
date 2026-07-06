from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB


class Auditoria(db.Model):
    __tablename__ = 'auditoria'

    id_auditoria     = db.Column(db.Integer, primary_key=True)
    id_usuario       = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=True)
    id_sesion        = db.Column(db.Integer, nullable=True)
    tabla_afectada   = db.Column(db.String, nullable=False)
    id_registro      = db.Column(db.Integer, nullable=True)
    accion           = db.Column(db.String, nullable=False)
    datos_anteriores = db.Column(JSONB, nullable=True)
    datos_nuevos     = db.Column(JSONB, nullable=True)
    ip_address       = db.Column(db.String, nullable=True)
    plataforma       = db.Column(db.String, nullable=True)
    fecha_accion     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id_auditoria':     self.id_auditoria,
            'id_usuario':       self.id_usuario,
            'id_sesion':        self.id_sesion,
            'tabla_afectada':   self.tabla_afectada,
            'id_registro':      self.id_registro,
            'accion':           self.accion,
            'datos_anteriores': self.datos_anteriores,
            'datos_nuevos':     self.datos_nuevos,
            'ip_address':       self.ip_address,
            'plataforma':       self.plataforma,
            'fecha_accion':     self.fecha_accion.isoformat() if self.fecha_accion else None
        }
