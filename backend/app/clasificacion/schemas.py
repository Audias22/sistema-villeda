from marshmallow import Schema, EXCLUDE


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
