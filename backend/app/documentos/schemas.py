from marshmallow import Schema, fields, validate

class DocumentoUploadSchema(Schema):
    """Valida los campos de formulario que acompañan al archivo (no el archivo en sí)"""
    id_expediente  = fields.Integer(required=True)
    estado_fisico  = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=1, max=3))


class DocumentoUpdateSchema(Schema):
    estado_fisico = fields.Integer(required=False, validate=validate.Range(min=1, max=3))