import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import time

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
POPPLER_PATH = r'C:\poppler\bin'

ruta_pdf = r'C:\Users\user8\Downloads\expedientes_separados\expediente_001.pdf'

print("Convirtiendo PDF a imágenes...")
inicio = time.perf_counter()
paginas = convert_from_path(ruta_pdf, dpi=300, poppler_path=POPPLER_PATH)
print(f"Páginas detectadas: {len(paginas)}")

texto_completo = ""
for i, pagina in enumerate(paginas, start=1):
    print(f"\n--- Procesando Página {i} ---")

    img_rgb = np.array(pagina)
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    mascara_rojo = (
        cv2.inRange(hsv, np.array([0, 80, 60]), np.array([12, 255, 255])) |
        cv2.inRange(hsv, np.array([165, 80, 60]), np.array([180, 255, 255]))
    )
    mascara_azul = cv2.inRange(hsv, np.array([95, 80, 60]), np.array([135, 255, 255]))
    mascara_dorado = cv2.inRange(hsv, np.array([15, 80, 60]), np.array([35, 255, 255]))

    mascara_color = mascara_rojo | mascara_azul | mascara_dorado
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mascara_color = cv2.dilate(mascara_color, kernel, iterations=2)

    img_bgr[mascara_color > 0] = [255, 255, 255]
    gris = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    texto_pagina = pytesseract.image_to_string(Image.fromarray(gris), lang='spa')
    texto_completo += texto_pagina + "\n"
    print(texto_pagina)

fin = time.perf_counter()
print(f"\nTiempo total: {fin - inicio:.2f} segundos")
print(f"Caracteres: {len(texto_completo)}")
print(f"Palabras: {len(texto_completo.split())}")

with open('resultado_ocr_prueba.txt', 'w', encoding='utf-8') as f:
    f.write(texto_completo)
print("Guardado en resultado_ocr_prueba.txt")