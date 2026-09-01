from app import db
from sqlalchemy.dialects.postgresql import JSONB

class Rol(db.Model):
    __tablename__ = 'roles'

    id_rol      = db.Column(db.Integer, primary_key=True)
    nombre_rol  = db.Column(db.String(50), nullable=False, unique=True)
    descripcion = db.Column(db.Text)


class Permiso(db.Model):
    __tablename__ = 'permisos'

    id_permiso      = db.Column(db.Integer, primary_key=True)
    nombre_permiso  = db.Column(db.String(100), nullable=False, unique=True)
    descripcion     = db.Column(db.Text)


class RolPermiso(db.Model):
    __tablename__ = 'roles_permisos'

    id_rol_permiso  = db.Column(db.Integer, primary_key=True)
    id_rol          = db.Column(db.Integer, db.ForeignKey('roles.id_rol'), nullable=False)
    id_permiso      = db.Column(db.Integer, db.ForeignKey('permisos.id_permiso'), nullable=False)


class AreaJuridica(db.Model):
    __tablename__ = 'areas_juridicas'

    id_area        = db.Column(db.Integer, primary_key=True)
    nombre          = db.Column(db.String(100), nullable=False)
    descripcion     = db.Column(db.Text)
    activo          = db.Column(db.Boolean, nullable=False, default=True)
    fecha_creacion  = db.Column(db.DateTime)


class EstadoExpediente(db.Model):
    __tablename__ = 'estados_expediente'

    id_estado   = db.Column(db.Integer, primary_key=True)
    nombre      = db.Column(db.String(50), nullable=False)
    descripcion = db.Column(db.Text)


class Prioridad(db.Model):
    __tablename__ = 'prioridades'

    id_prioridad = db.Column(db.Integer, primary_key=True)
    nombre       = db.Column(db.String(50), nullable=False)
    color_hex    = db.Column(db.String(7))
    descripcion  = db.Column(db.Text)


class TipoExpediente(db.Model):
    __tablename__ = 'tipos_expediente'

    id_tipo     = db.Column(db.Integer, primary_key=True)
    id_area     = db.Column(db.Integer, db.ForeignKey('areas_juridicas.id_area'), nullable=False)
    nombre      = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text)
    activo      = db.Column(db.Boolean, nullable=False, default=True)


class FormatoDocumento(db.Model):
    __tablename__ = 'formatos_documento'

    id_formato        = db.Column(db.Integer, primary_key=True)
    nombre            = db.Column(db.String(50), nullable=False)
    extension         = db.Column(db.String(10), nullable=False)
    metodo_extraccion = db.Column(db.String(50), nullable=False)


class EstadoFisicoDoc(db.Model):
    __tablename__ = 'estados_fisico_doc'

    id_estado = db.Column(db.Integer, primary_key=True)
    nombre    = db.Column(db.String(50), nullable=False)


class EstadoCarga(db.Model):
    __tablename__ = 'estados_carga'

    id_estado = db.Column(db.Integer, primary_key=True)
    nombre    = db.Column(db.String(50), nullable=False)


class CargaMasiva(db.Model):
    __tablename__ = 'cargas_masivas'

    id_carga              = db.Column(db.Integer, primary_key=True)
    id_usuario            = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    nombre_carpeta        = db.Column(db.String)
    origen_carga          = db.Column(db.String(20), nullable=False)
    total_archivos        = db.Column(db.Integer, nullable=False, default=0)
    exitosos              = db.Column(db.Integer, nullable=False, default=0)
    con_error             = db.Column(db.Integer, nullable=False, default=0)
    duplicados_detectados = db.Column(db.Integer, nullable=False, default=0)
    id_estado             = db.Column(db.Integer, db.ForeignKey('estados_carga.id_estado'), nullable=False)
    fecha_inicio          = db.Column(db.DateTime, nullable=False)
    fecha_fin              = db.Column(db.DateTime)
    observaciones          = db.Column(db.Text)


class TipoReporte(db.Model):
    """Catálogo de reportes exportables. Contenido actual en la base:
    1 = Lista completa de expedientes (XLSX), 2 = Reporte por área jurídica (PDF),
    3 = Historial de cliente (PDF), 4 = Métricas del sistema (PDF).
    Solo el 1 está implementado en el backend."""
    __tablename__ = 'tipos_reporte'

    id_tipo = db.Column(db.Integer, primary_key=True)
    nombre  = db.Column(db.String, nullable=False)
    formato = db.Column(db.String, nullable=False)


class Exportacion(db.Model):
    """Bitácora de exportaciones. Se escribe en dos fases: la fila nace con
    exitosa=false apenas se recibe la petición, y se completa después según
    cómo haya terminado la generación del archivo — por eso fecha_solicitud y
    fecha_generacion son columnas separadas.

    ruta_archivo queda registrada como evidencia de qué se exportó, no como
    forma de recuperar el archivo: el disco de Render no persiste entre
    despliegues (ver ESTADO_PROYECTO.md)."""
    __tablename__ = 'exportaciones'

    id_exportacion   = db.Column(db.Integer, primary_key=True)
    id_usuario       = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    id_tipo_reporte  = db.Column(db.Integer, db.ForeignKey('tipos_reporte.id_tipo'), nullable=False)
    parametros_json  = db.Column(JSONB)
    nombre_archivo   = db.Column(db.String)
    ruta_archivo     = db.Column(db.String)
    tamano_bytes     = db.Column(db.BigInteger)
    exitosa          = db.Column(db.Boolean, nullable=False, server_default=db.false())
    mensaje_error    = db.Column(db.Text)
    fecha_solicitud  = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    fecha_generacion = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id_exportacion':   self.id_exportacion,
            'id_usuario':       self.id_usuario,
            'id_tipo_reporte':  self.id_tipo_reporte,
            'parametros_json':  self.parametros_json,
            'nombre_archivo':   self.nombre_archivo,
            'ruta_archivo':     self.ruta_archivo,
            'tamano_bytes':     self.tamano_bytes,
            'exitosa':          self.exitosa,
            'mensaje_error':    self.mensaje_error,
            'fecha_solicitud':  self.fecha_solicitud.isoformat() if self.fecha_solicitud else None,
            'fecha_generacion': self.fecha_generacion.isoformat() if self.fecha_generacion else None
        }