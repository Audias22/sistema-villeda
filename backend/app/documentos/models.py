from app import db
from datetime import datetime

class Documento(db.Model):
    __tablename__ = 'documentos'

    id_documento            = db.Column(db.Integer, primary_key=True)
    id_expediente           = db.Column(db.Integer, db.ForeignKey('expedientes.id_expediente'), nullable=False)
    id_formato              = db.Column(db.Integer, db.ForeignKey('formatos_documento.id_formato'), nullable=False)
    id_carga_masiva         = db.Column(db.Integer, db.ForeignKey('cargas_masivas.id_carga'))
    nombre_archivo_original = db.Column(db.String, nullable=False)
    nombre_archivo_sistema  = db.Column(db.String, nullable=False)
    ruta_almacenamiento     = db.Column(db.String, nullable=False)  # nombre_key en Cloudflare R2 (antes: ruta local)
    tamano_bytes            = db.Column(db.BigInteger)
    num_paginas             = db.Column(db.Integer)
    hash_archivo            = db.Column(db.String)
    estado_fisico           = db.Column(db.Integer, db.ForeignKey('estados_fisico_doc.id_estado'))
    es_duplicado_exacto     = db.Column(db.Boolean, nullable=False, default=False)
    id_documento_original   = db.Column(db.Integer, db.ForeignKey('documentos.id_documento'))
    texto_completo          = db.Column(db.Text)
    fecha_carga             = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    cargado_por             = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)

    def to_dict(self):
        return {
            'id_documento':            self.id_documento,
            'id_expediente':           self.id_expediente,
            'id_formato':              self.id_formato,
            'id_carga_masiva':         self.id_carga_masiva,
            'nombre_archivo_original': self.nombre_archivo_original,
            'nombre_archivo_sistema':  self.nombre_archivo_sistema,
            'ruta_almacenamiento':     self.ruta_almacenamiento,
            'tamano_bytes':            self.tamano_bytes,
            'num_paginas':             self.num_paginas,
            'hash_archivo':            self.hash_archivo,
            'estado_fisico':           self.estado_fisico,
            'es_duplicado_exacto':     self.es_duplicado_exacto,
            'id_documento_original':   self.id_documento_original,
            'fecha_carga':             self.fecha_carga.isoformat() if self.fecha_carga else None,
            'cargado_por':             self.cargado_por
        }

    def to_dict_completo(self):
        """Incluye el texto extraído — usar solo en detalle individual, no en listados"""
        datos = self.to_dict()
        datos['texto_completo'] = self.texto_completo
        return datos