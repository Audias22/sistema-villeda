import os
import boto3
from botocore.client import Config as BotoConfig

R2_ACCOUNT_ID = os.getenv('R2_ACCOUNT_ID')
R2_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
R2_BUCKET_NAME = os.getenv('R2_BUCKET_NAME')

_cliente_r2 = boto3.client(
    's3',
    endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=BotoConfig(signature_version='s3v4'),
    region_name='auto'
)


def subir_archivo(archivo_bytes, nombre_key, content_type):
    """Sube un archivo al bucket de Cloudflare R2 y devuelve el nombre_key usado."""
    _cliente_r2.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=nombre_key,
        Body=archivo_bytes,
        ContentType=content_type
    )
    return nombre_key


def obtener_url_firmada(nombre_key, expiracion=3600):
    """Genera una URL presignada de lectura, válida por `expiracion` segundos (por defecto 1 hora)."""
    return _cliente_r2.generate_presigned_url(
        'get_object',
        Params={'Bucket': R2_BUCKET_NAME, 'Key': nombre_key},
        ExpiresIn=expiracion
    )
