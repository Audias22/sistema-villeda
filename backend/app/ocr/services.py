import os
import pytesseract
import hashlib
import io
import time
import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_bytes

# Configuración condicional: en local (Windows) leemos las rutas de .env;
# en Docker/Linux con Tesseract y Poppler instalados vía apt, los binarios
# están en el PATH del sistema y no hace falta especificar rutas.
_tesseract_cmd = os.getenv('TESSERACT_CMD')
if _tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd
POPPLER_PATH = os.getenv('POPPLER_PATH')


def calcular_hash(archivo_bytes):
    return hashlib.sha256(archivo_bytes).hexdigest()


def preprocesar_imagen(imagen_pil):
    """
    Pipeline de preprocesamiento para documentos legales escaneados.
    Elimina sellos de color (rojos, azules, dorados) que interfieren
    con el reconocimiento de texto, y devuelve la imagen en escala
    de grises lista para Tesseract.

    Pasos:
    1. Conversión a espacio HSV para detectar colores por saturación
    2. Creación de máscaras para rojo, azul y dorado (sellos y timbres)
    3. Dilatación de máscaras para cubrir bordes difusos de los sellos
    4. Reemplazo de zonas coloreadas con blanco puro
    5. Conversión a escala de grises (Tesseract maneja su propia binarización)
    """
    # Convertir PIL a array numpy BGR (formato OpenCV)
    img_rgb = np.array(imagen_pil)

    # Si la imagen ya es escala de grises, devolverla tal cual
    if len(img_rgb.shape) == 2:
        return Image.fromarray(img_rgb)

    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # --- Máscara para rojo (sellos SAT, escudo de Guatemala) ---
    # Rojo cruza 0/180 en HSV, se necesitan dos rangos
    mascara_rojo = (
        cv2.inRange(hsv, np.array([0, 80, 60]), np.array([12, 255, 255])) |
        cv2.inRange(hsv, np.array([165, 80, 60]), np.array([180, 255, 255]))
    )

    # --- Máscara para azul (timbres fiscales, sellos de protocolo) ---
    mascara_azul = cv2.inRange(
        hsv, np.array([95, 80, 60]), np.array([135, 255, 255])
    )

    # --- Máscara para dorado/amarillo (timbres fiscales dorados) ---
    mascara_dorado = cv2.inRange(
        hsv, np.array([15, 80, 60]), np.array([35, 255, 255])
    )

    # Combinar todas las máscaras
    mascara_color = mascara_rojo | mascara_azul | mascara_dorado

    # Dilatar para cubrir bordes difusos de los sellos
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mascara_color = cv2.dilate(mascara_color, kernel, iterations=2)

    # Reemplazar zonas coloreadas con blanco
    img_limpia = img_bgr.copy()
    img_limpia[mascara_color > 0] = [255, 255, 255]

    # Convertir a escala de grises
    gris = cv2.cvtColor(img_limpia, cv2.COLOR_BGR2GRAY)

    return Image.fromarray(gris)


def extraer_texto_imagen(imagen_bytes):
    imagen = Image.open(io.BytesIO(imagen_bytes))
    imagen = preprocesar_imagen(imagen)
    texto = pytesseract.image_to_string(imagen, lang='spa')
    return texto.strip()


def extraer_texto_pdf(pdf_bytes):
    _pdf_kwargs = {'dpi': 300}
    if POPPLER_PATH:
        _pdf_kwargs['poppler_path'] = POPPLER_PATH
    paginas = convert_from_bytes(pdf_bytes, **_pdf_kwargs)
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
        'texto':          texto,
        'paginas':        paginas,
        'num_caracteres': num_caracteres,
        'num_palabras':   num_palabras,
        'num_paginas':    len(paginas),
        'tiempo_seg':     tiempo_seg,
        'exitoso':        exitoso,
        'mensaje_error':  mensaje_error
    }