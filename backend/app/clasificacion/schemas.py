from marshmallow import Schema, fields, EXCLUDE


class TrabajoCrearSchema(Schema):
    """
    Valida los campos de formulario que acompañan al archivo (no el archivo en
    sí, que se valida en services por extensión y tamaño).

    Hoy el endpoint no recibe ningún campo además del archivo: el tipo, el
    cliente y el expediente los decide el worker a partir de la predicción, no
    el usuario. El esquema existe para que el punto de validación ya esté en su
    lugar cuando la Fase 3 agregue la confirmación manual del tipo.
    """
    class Meta:
        unknown = EXCLUDE


class TrabajoConfirmarSchema(Schema):
    """
    Tipo con el que la persona decide crear el expediente. Puede ser el que
    predijo el modelo o uno corregido; que pertenezca al área notarial y esté
    activo se valida en services, contra el catálogo.
    """
    id_tipo_confirmado = fields.Integer(required=True)
