from app import db
from datetime import datetime


class EstadoProcesamiento(db.Model):
    """Catálogo de estados de la cola: Pendiente, En proceso, Exitoso, Error, Duplicado."""
    __tablename__ = 'estados_procesamiento'

    id_estado = db.Column(db.Integer, primary_key=True)
    nombre    = db.Column(db.String(50), nullable=False)


class ModeloML(db.Model):
    """
    Catálogo de modelos de clasificación. Ya venía con BETO y RoBERTa-bne (4
    clases, por área jurídica, del marco teórico) y se le sumó el mock de 6
    clases para el flujo de tipos notariales.
    """
    __tablename__ = 'modelos_ml'

    id_modelo           = db.Column(db.Integer, primary_key=True)
    nombre_modelo       = db.Column(db.String(100), nullable=False)
    version             = db.Column(db.String(20))
    arquitectura        = db.Column(db.String(100))
    f1_score_general    = db.Column(db.Numeric)
    precision_general   = db.Column(db.Numeric)
    recall_general      = db.Column(db.Numeric)
    num_clases          = db.Column(db.Integer)
    activo              = db.Column(db.Boolean, nullable=False, default=True)
    fecha_entrenamiento = db.Column(db.Date)
    fecha_registro      = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


ESTADO_PENDIENTE  = 1
ESTADO_EN_PROCESO = 2
ESTADO_EXITOSO    = 3
ESTADO_ERROR      = 4
ESTADO_DUPLICADO  = 5


class TrabajoClasificacion(db.Model):
    """
    Cola de documentos sueltos esperando clasificación.

    Existe porque documentos.id_expediente es NOT NULL: un documento subido sin
    expediente todavía no puede vivir en la tabla documentos. El trabajo guarda
    el archivo (y luego su texto y su predicción) hasta que el worker crea el
    expediente real, momento en el que se llenan id_expediente_creado e
    id_documento_creado.
    """
    __tablename__ = 'trabajos_clasificacion'

    id_trabajo              = db.Column(db.Integer, primary_key=True)
    id_usuario              = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)

    nombre_archivo_original = db.Column(db.String, nullable=False)
    nombre_archivo_sistema  = db.Column(db.String, nullable=False)
    ruta_almacenamiento     = db.Column(db.String, nullable=False)
    tamano_bytes            = db.Column(db.BigInteger)
    hash_archivo            = db.Column(db.String)

    id_formato              = db.Column(db.Integer, db.ForeignKey('formatos_documento.id_formato'))
    num_paginas             = db.Column(db.Integer)
    texto_completo          = db.Column(db.Text)
    # Segundos que tardó la extracción del texto. Se guarda acá y no solo en el
    # documento porque en el camino de confirmación manual el documento se crea
    # mucho después, en otra petición, cuando la medición ya no existe en memoria.
    tiempo_ocr_seg          = db.Column(db.Numeric(6, 2))

    id_estado               = db.Column(db.Integer, db.ForeignKey('estados_procesamiento.id_estado'),
                                        nullable=False, default=ESTADO_PENDIENTE)
    intentos                = db.Column(db.Integer, nullable=False, default=0)
    mensaje_error           = db.Column(db.Text)

    id_modelo               = db.Column(db.Integer, db.ForeignKey('modelos_ml.id_modelo'))
    id_tipo_predicho        = db.Column(db.Integer, db.ForeignKey('tipos_expediente.id_tipo'))
    confianza               = db.Column(db.Numeric(5, 4))
    umbral_usado            = db.Column(db.Numeric(5, 4))

    requiere_confirmacion   = db.Column(db.Boolean, nullable=False, default=False)
    id_tipo_confirmado      = db.Column(db.Integer, db.ForeignKey('tipos_expediente.id_tipo'))
    confirmado_por          = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'))
    fecha_confirmacion      = db.Column(db.DateTime)

    id_expediente_creado    = db.Column(db.Integer, db.ForeignKey('expedientes.id_expediente'))
    id_documento_creado     = db.Column(db.Integer, db.ForeignKey('documentos.id_documento'))

    fecha_encolado          = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    fecha_inicio_proceso    = db.Column(db.DateTime)
    fecha_fin_proceso       = db.Column(db.DateTime)

    def to_dict(self):
        """
        No incluye texto_completo a propósito: es el texto íntegro del documento
        y puede pesar cientos de KB. Se expone solo su longitud, que es lo que
        el panel necesita para saber si el OCR ya corrió.
        """
        return {
            'id_trabajo':              self.id_trabajo,
            'id_usuario':              self.id_usuario,
            'nombre_archivo_original': self.nombre_archivo_original,
            'nombre_archivo_sistema':  self.nombre_archivo_sistema,
            'ruta_almacenamiento':     self.ruta_almacenamiento,
            'tamano_bytes':            self.tamano_bytes,
            'hash_archivo':            self.hash_archivo,
            'id_formato':              self.id_formato,
            'num_paginas':             self.num_paginas,
            'num_caracteres_texto':    len(self.texto_completo) if self.texto_completo else 0,
            'tiempo_ocr_seg':          float(self.tiempo_ocr_seg) if self.tiempo_ocr_seg is not None else None,
            'id_estado':               self.id_estado,
            'intentos':                self.intentos,
            'mensaje_error':           self.mensaje_error,
            'id_modelo':               self.id_modelo,
            'id_tipo_predicho':        self.id_tipo_predicho,
            'confianza':               float(self.confianza) if self.confianza is not None else None,
            'umbral_usado':            float(self.umbral_usado) if self.umbral_usado is not None else None,
            'requiere_confirmacion':   self.requiere_confirmacion,
            'id_tipo_confirmado':      self.id_tipo_confirmado,
            'confirmado_por':          self.confirmado_por,
            'fecha_confirmacion':      self.fecha_confirmacion.isoformat() if self.fecha_confirmacion else None,
            'id_expediente_creado':    self.id_expediente_creado,
            'id_documento_creado':     self.id_documento_creado,
            'fecha_encolado':          self.fecha_encolado.isoformat() if self.fecha_encolado else None,
            'fecha_inicio_proceso':    self.fecha_inicio_proceso.isoformat() if self.fecha_inicio_proceso else None,
            'fecha_fin_proceso':       self.fecha_fin_proceso.isoformat() if self.fecha_fin_proceso else None
        }


class ClasificacionML(db.Model):
    """
    Historial de clasificaciones del modelo.

    La tabla nació para clasificar por área jurídica (id_area_predicha es NOT
    NULL y apunta a areas_juridicas), y se amplió con id_tipo_predicho /
    id_tipo_corregido para el flujo de tipos notariales. En ese flujo
    id_area_predicha se llena siempre con el área Notarial, que es cierta por
    construcción, y el dato con significado real queda en id_tipo_predicho.
    """
    __tablename__ = 'clasificaciones_ml'

    id_clasificacion       = db.Column(db.Integer, primary_key=True)
    id_documento           = db.Column(db.Integer, db.ForeignKey('documentos.id_documento'), nullable=False)
    id_modelo              = db.Column(db.Integer, db.ForeignKey('modelos_ml.id_modelo'), nullable=False)
    id_area_predicha       = db.Column(db.Integer, db.ForeignKey('areas_juridicas.id_area'), nullable=False)
    confianza              = db.Column(db.Numeric, nullable=False)
    requiere_revision      = db.Column(db.Boolean, nullable=False, default=False)
    umbral_confianza_usado = db.Column(db.Numeric)
    revisada               = db.Column(db.Boolean, nullable=False, default=False)
    id_area_corregida      = db.Column(db.Integer, db.ForeignKey('areas_juridicas.id_area'))
    revisado_por           = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'))
    fecha_clasificacion    = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    fecha_revision         = db.Column(db.DateTime)

    id_tipo_predicho       = db.Column(db.Integer, db.ForeignKey('tipos_expediente.id_tipo'))
    id_tipo_corregido      = db.Column(db.Integer, db.ForeignKey('tipos_expediente.id_tipo'))

    def to_dict(self):
        return {
            'id_clasificacion':       self.id_clasificacion,
            'id_documento':           self.id_documento,
            'id_modelo':              self.id_modelo,
            'id_area_predicha':       self.id_area_predicha,
            'confianza':              float(self.confianza) if self.confianza is not None else None,
            'requiere_revision':      self.requiere_revision,
            'umbral_confianza_usado': float(self.umbral_confianza_usado) if self.umbral_confianza_usado is not None else None,
            'revisada':               self.revisada,
            'id_area_corregida':      self.id_area_corregida,
            'revisado_por':           self.revisado_por,
            'fecha_clasificacion':    self.fecha_clasificacion.isoformat() if self.fecha_clasificacion else None,
            'fecha_revision':         self.fecha_revision.isoformat() if self.fecha_revision else None,
            'id_tipo_predicho':       self.id_tipo_predicho,
            'id_tipo_corregido':      self.id_tipo_corregido
        }
