from app import db
from datetime import datetime


# Catálogo ya sembrado en la base. Cada tipo trae su ícono y su color, que el
# panel usa para pintar la notificación sin decidir nada por su cuenta.
TIPO_BAJA_CONFIANZA   = 1
TIPO_DUPLICADO        = 2
TIPO_CARGA_COMPLETADA = 3
TIPO_CLIENTE_EXISTENTE = 4
TIPO_ERROR            = 5


class TipoNotificacion(db.Model):
    __tablename__ = 'tipos_notificacion'

    id_tipo   = db.Column(db.Integer, primary_key=True)
    nombre    = db.Column(db.String(50), nullable=False)
    icono     = db.Column(db.String(50))
    color_hex = db.Column(db.String(7))

    def to_dict(self):
        return {
            'id_tipo':   self.id_tipo,
            'nombre':    self.nombre,
            'icono':     self.icono,
            'color_hex': self.color_hex
        }


class Notificacion(db.Model):
    """
    Aviso dirigido a un usuario. Los campos de enlace son todos opcionales y se
    llenan según el caso: un expediente creado automáticamente trae
    id_expediente e id_documento, mientras que un documento que quedó esperando
    confirmación solo trae id_trabajo, porque todavía no existe el expediente.
    """
    __tablename__ = 'notificaciones'

    id_notificacion = db.Column(db.Integer, primary_key=True)
    id_usuario      = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    id_tipo         = db.Column(db.Integer, db.ForeignKey('tipos_notificacion.id_tipo'), nullable=False)
    id_expediente   = db.Column(db.Integer, db.ForeignKey('expedientes.id_expediente'))
    id_documento    = db.Column(db.Integer, db.ForeignKey('documentos.id_documento'))
    id_carga        = db.Column(db.Integer, db.ForeignKey('cargas_masivas.id_carga'))
    id_trabajo      = db.Column(db.Integer, db.ForeignKey('trabajos_clasificacion.id_trabajo'))
    mensaje         = db.Column(db.Text, nullable=False)
    leida           = db.Column(db.Boolean, nullable=False, default=False)
    fecha_creacion  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    fecha_lectura   = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id_notificacion': self.id_notificacion,
            'id_usuario':      self.id_usuario,
            'id_tipo':         self.id_tipo,
            'id_expediente':   self.id_expediente,
            'id_documento':    self.id_documento,
            'id_carga':        self.id_carga,
            'id_trabajo':      self.id_trabajo,
            'mensaje':         self.mensaje,
            'leida':           self.leida,
            'fecha_creacion':  self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_lectura':   self.fecha_lectura.isoformat() if self.fecha_lectura else None
        }
