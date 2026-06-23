from marshmallow import Schema, fields, validate

class ExpedienteSchema(Schema):
    id_cliente          = fields.Integer(required=True)
    id_tipo_expediente   = fields.Integer(required=True)
    id_area              = fields.Integer(required=True, validate=validate.Range(min=1, max=4))
    id_usuario_asignado  = fields.Integer(required=True)
    titulo               = fields.String(required=True, validate=validate.Length(min=5, max=255))
    descripcion          = fields.String(allow_none=True)
    fecha_apertura       = fields.Date(required=True)
    prioridad            = fields.Integer(required=True, validate=validate.Range(min=1, max=3))


class ExpedienteUpdateSchema(Schema):
    id_tipo_expediente  = fields.Integer(required=False)
    id_area              = fields.Integer(required=False, validate=validate.Range(min=1, max=4))
    id_usuario_asignado  = fields.Integer(required=False)
    titulo               = fields.String(required=False, validate=validate.Length(min=5, max=255))
    descripcion          = fields.String(allow_none=True)
    prioridad            = fields.Integer(required=False, validate=validate.Range(min=1, max=3))


class ExpedienteCerrarSchema(Schema):
    fecha_cierre = fields.Date(required=True)