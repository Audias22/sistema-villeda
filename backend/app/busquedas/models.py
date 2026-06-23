from app import db
from datetime import datetime

class CriterioBusqueda(db.Model):
    __tablename__ = 'criterios_busqueda'

    id_criterio = db.Column(db.Integer, primary_key=True)
    nombre      = db.Column(db.String(50), nullable=False)


class Busqueda(db.Model):
    __tablename__ = 'busquedas'

    id_busqueda            = db.Column(db.Integer, primary_key=True)
    id_usuario             = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    id_criterio            = db.Column(db.Integer, db.ForeignKey('criterios_busqueda.id_criterio'), nullable=False)
    termino_buscado        = db.Column(db.String)
    resultados_encontrados = db.Column(db.Integer)
    tiempo_respuesta_ms    = db.Column(db.Integer)
    desde_plataforma       = db.Column(db.String(20))
    fecha_busqueda         = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id_busqueda':            self.id_busqueda,
            'id_usuario':             self.id_usuario,
            'id_criterio':            self.id_criterio,
            'termino_buscado':        self.termino_buscado,
            'resultados_encontrados': self.resultados_encontrados,
            'tiempo_respuesta_ms':    self.tiempo_respuesta_ms,
            'desde_plataforma':       self.desde_plataforma,
            'fecha_busqueda':         self.fecha_busqueda.isoformat() if self.fecha_busqueda else None
        }