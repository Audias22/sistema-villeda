from marshmallow import Schema, fields, validate, validates, ValidationError

class ClienteSchema(Schema):
    tipo_persona     = fields.Integer(required=True, validate=validate.OneOf([1, 2]))
    primer_nombre    = fields.String(allow_none=True, validate=validate.Length(max=100))
    segundo_nombre   = fields.String(allow_none=True, validate=validate.Length(max=100))
    primer_apellido  = fields.String(allow_none=True, validate=validate.Length(max=100))
    segundo_apellido = fields.String(allow_none=True, validate=validate.Length(max=100))
    razon_social     = fields.String(allow_none=True, validate=validate.Length(max=200))
    dpi              = fields.String(allow_none=True, validate=validate.Length(max=20))
    nit              = fields.String(allow_none=True, validate=validate.Length(max=20))
    fecha_nacimiento = fields.Date(allow_none=True)
    telefono         = fields.String(allow_none=True, validate=validate.Length(max=20))
    email            = fields.Email(allow_none=True, validate=validate.Length(max=100))
    direccion        = fields.String(allow_none=True, validate=validate.Length(max=255))

    @validates('tipo_persona')
    def validar_consistencia_persona(self, value, **kwargs):
        pass

class ClienteUpdateSchema(ClienteSchema):
    activo = fields.Boolean(required=False)