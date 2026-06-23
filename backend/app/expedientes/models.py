from app import db
from datetime import datetime

class Expediente(db.Model):
    __tablename__ = 'expedientes'

    id_expediente          = db.Column(db.Integer, primary_key=True)
    id_cliente             = db.Column(db.Integer, db.ForeignKey('clientes.id_cliente'), nullable=False)
    id_tipo_expediente     = db.Column(db.Integer, db.ForeignKey('tipos_expediente.id_tipo'), nullable=False)
    id_area                = db.Column(db.Integer, db.ForeignKey('areas_juridicas.id_area'), nullable=False)
    id_estado              = db.Column(db.Integer, db.ForeignKey('estados_expediente.id_estado'), nullable=False)
    id_usuario_asignado    = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    numero_expediente      = db.Column(db.String, nullable=False, unique=True)
    titulo                 = db.Column(db.String, nullable=False)
    descripcion            = db.Column(db.Text)
    fecha_apertura         = db.Column(db.Date, nullable=False)
    fecha_cierre           = db.Column(db.Date)
    prioridad              = db.Column(db.Integer, db.ForeignKey('prioridades.id_prioridad'), nullable=False)
    es_duplicado_posible   = db.Column(db.Boolean, nullable=False, default=False)
    id_expediente_original = db.Column(db.Integer, db.ForeignKey('expedientes.id_expediente'))
    fecha_creacion         = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    creado_por             = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    fecha_modificacion     = db.Column(db.DateTime)
    modificado_por         = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'))

    def to_dict(self):
        return {
            'id_expediente':          self.id_expediente,
            'id_cliente':             self.id_cliente,
            'id_tipo_expediente':     self.id_tipo_expediente,
            'id_area':                self.id_area,
            'id_estado':              self.id_estado,
            'id_usuario_asignado':    self.id_usuario_asignado,
            'numero_expediente':      self.numero_expediente,
            'titulo':                 self.titulo,
            'descripcion':            self.descripcion,
            'fecha_apertura':         self.fecha_apertura.isoformat() if self.fecha_apertura else None,
            'fecha_cierre':           self.fecha_cierre.isoformat() if self.fecha_cierre else None,
            'prioridad':              self.prioridad,
            'es_duplicado_posible':   self.es_duplicado_posible,
            'id_expediente_original': self.id_expediente_original,
            'fecha_creacion':         self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'creado_por':             self.creado_por,
            'fecha_modificacion':     self.fecha_modificacion.isoformat() if self.fecha_modificacion else None,
            'modificado_por':         self.modificado_por
        }