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