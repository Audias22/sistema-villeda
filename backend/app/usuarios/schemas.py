from marshmallow import Schema, fields, validate

class UsuarioSchema(Schema):
    id_rol         = fields.Integer(required=True)
    nombre         = fields.String(required=True, validate=validate.Length(min=1, max=100))
    apellido       = fields.String(required=True, validate=validate.Length(min=1, max=100))
    nombre_usuario = fields.String(required=True, validate=validate.Length(min=3, max=50))
    correo         = fields.Email(required=True, validate=validate.Length(max=150))
    contrasena     = fields.String(required=True, validate=validate.Length(min=8))


class UsuarioUpdateSchema(Schema):
    id_rol         = fields.Integer(required=False)
    nombre         = fields.String(required=False, validate=validate.Length(min=1, max=100))
    apellido       = fields.String(required=False, validate=validate.Length(min=1, max=100))
    nombre_usuario = fields.String(required=False, validate=validate.Length(min=3, max=50))
    correo         = fields.Email(required=False, validate=validate.Length(max=150))
    contrasena     = fields.String(required=False, validate=validate.Length(min=8))
    activo         = fields.Boolean(required=False)
