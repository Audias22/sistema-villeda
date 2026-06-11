import pytesseract
import hashlib
import io
import time
from PIL import Image
from pdf2image import convert_from_bytes

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def calcular_hash(archivo_bytes):
    return hashlib.sha256(archivo_bytes).hexdigest()

def preprocesar_imagen(imagen):
    imagen = imagen.convert('L')
    return imagen

def extraer_texto_imagen(imagen_bytes):
    imagen = Image.open(io.BytesIO(imagen_bytes))
    imagen = preprocesar_imagen(imagen)
    texto = pytesseract.image_to_string(imagen, lang='spa')
    return texto.strip()

def extraer_texto_pdf(pdf_bytes):
    paginas = convert_from_bytes(pdf_bytes, dpi=300)
    texto_completo = ''
    textos_por_pagina = []

    for i, pagina in enumerate(paginas):
        pagina = preprocesar_imagen(pagina)
        texto_pagina = pytesseract.image_to_string(pagina, lang='spa')
        textos_por_pagina.append({
            'numero_pagina': i + 1,
            'texto': texto_pagina.strip()
        })
        texto_completo += texto_pagina + ' '

    return texto_completo.strip(), textos_por_pagina

def procesar_archivo(archivo_bytes, extension):
    inicio = time.time()
    texto = ''
    paginas = []
    exitoso = False
    mensaje_error = None

    try:
        if extension in ['jpg', 'jpeg', 'png']:
            texto = extraer_texto_imagen(archivo_bytes)
            paginas = [{'numero_pagina': 1, 'texto': texto}]
        elif extension == 'pdf':
            texto, paginas = extraer_texto_pdf(archivo_bytes)
        else:
            mensaje_error = f'Formato {extension} no soportado'

        if texto:
            exitoso = True

    except Exception as e:
        mensaje_error = str(e)
        exitoso = False

    tiempo_seg = round(time.time() - inicio, 3)

    num_caracteres = len(texto)
    num_palabras = len(texto.split()) if texto else 0

    return {
        'texto':           texto,
        'paginas':         paginas,
        'num_caracteres':  num_caracteres,
        'num_palabras':    num_palabras,
        'num_paginas':     len(paginas),
        'tiempo_seg':      tiempo_seg,
        'exitoso':         exitoso,
        'mensaje_error':   mensaje_error
    }