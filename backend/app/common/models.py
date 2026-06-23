from app import db

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