from marshmallow import Schema, fields, validate

class BusquedaSchema(Schema):
    id_criterio       = fields.Integer(required=True, validate=validate.Range(min=1, max=5))
    termino_buscado   = fields.String(required=True, validate=validate.Length(min=1, max=500))
    desde_plataforma  = fields.String(required=False, validate=validate.OneOf(['web', 'movil']))