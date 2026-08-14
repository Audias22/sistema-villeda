from marshmallow import Schema, fields, validate


class NotificacionListarSchema(Schema):
    """Valida los parámetros de consulta del listado."""
    limite = fields.Integer(required=False, validate=validate.Range(min=1, max=100))
