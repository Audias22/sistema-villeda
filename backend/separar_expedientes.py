"""
SEPARADOR DE EXPEDIENTES
========================
Divide un PDF escaneado en expedientes individuales usando hojas
de color (verde fosforescente) como separadores.

Uso:
    python separar_expedientes.py "C:\ruta\al\archivo.pdf"
    python separar_expedientes.py "C:\ruta\al\archivo.pdf" 35

El script genera una carpeta 'expedientes_separados' con:
    expediente_001.pdf (o desde el número que indiques)

Requisitos: pip install pypdf opencv-python-headless numpy pdf2image
Poppler debe estar instalado en C:\\poppler\\bin
"""

import sys
import os
import cv2
import numpy as np
from pdf2image import convert_from_path
from pypdf import PdfReader, PdfWriter

POPPLER_PATH = r'C:\poppler\bin'
UMBRAL_COLOR = 0.60  # 60% de píxeles con color = separador
DPI_DETECCION = 72   # DPI bajo — solo para detectar color, no para OCR


def es_hoja_separadora(imagen_pil):
    """Detecta si una página es una hoja de color sólido."""
    img_rgb = np.array(imagen_pil)
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # Detectar píxeles con saturación alta (cualquier color fuerte)
    mascara = cv2.inRange(hsv, np.array([0, 80, 50]), np.array([180, 255, 255]))
    porcentaje = np.sum(mascara > 0) / mascara.size

    return porcentaje > UMBRAL_COLOR, porcentaje


def separar_expedientes(ruta_pdf, numero_inicio=1):
    """Divide el PDF en expedientes individuales."""

    if not os.path.exists(ruta_pdf):
        print(f"ERROR: No se encontró el archivo: {ruta_pdf}")
        return

    print(f"Archivo: {ruta_pdf}")
    print(f"Convirtiendo páginas a {DPI_DETECCION} DPI para detección...")

    # Convertir todas las páginas a imágenes (baja resolución, solo detección)
    imagenes = convert_from_path(ruta_pdf, dpi=DPI_DETECCION, poppler_path=POPPLER_PATH)
    total_paginas = len(imagenes)
    print(f"Total de páginas: {total_paginas}")

    # Detectar cuáles son separadores
    print("\nAnalizando páginas...")
    separadores = []
    for i, img in enumerate(imagenes):
        es_sep, pct = es_hoja_separadora(img)
        tipo = "SEPARADOR" if es_sep else "documento"
        print(f"  Página {i + 1:>3}: {tipo} ({pct * 100:.1f}% color)")
        if es_sep:
            separadores.append(i)

    if not separadores:
        print("\nNo se encontraron hojas separadoras. Nada que dividir.")
        return

    # Definir los grupos de páginas (entre separadores)
    expedientes = []
    paginas_documento = [i for i in range(total_paginas) if i not in separadores]

    grupo_actual = []
    for i in range(total_paginas):
        if i in separadores:
            if grupo_actual:
                expedientes.append(grupo_actual)
                grupo_actual = []
        else:
            grupo_actual.append(i)

    if grupo_actual:
        expedientes.append(grupo_actual)

    print(f"\nExpedientes detectados: {len(expedientes)}")
    for j, grupo in enumerate(expedientes):
        num = j + numero_inicio
        print(f"  Expediente {num:>3}: páginas {[p + 1 for p in grupo]}")

    # Crear carpeta de salida
    carpeta_base = os.path.dirname(ruta_pdf) or '.'
    carpeta_salida = os.path.join(carpeta_base, 'expedientes_separados')
    os.makedirs(carpeta_salida, exist_ok=True)

    # Dividir el PDF real
    print(f"\nGenerando archivos en: {carpeta_salida}")
    lector = PdfReader(ruta_pdf)

    for j, grupo in enumerate(expedientes):
        escritor = PdfWriter()
        for pagina_idx in grupo:
            escritor.add_page(lector.pages[pagina_idx])

        num = j + numero_inicio
        nombre = f"expediente_{num:03d}.pdf"
        ruta_salida = os.path.join(carpeta_salida, nombre)
        with open(ruta_salida, 'wb') as f:
            escritor.write(f)
        print(f"  {nombre} ({len(grupo)} páginas)")

    print(f"\nListo. {len(expedientes)} expedientes guardados en: {carpeta_salida}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python separar_expedientes.py "ruta_al_pdf.pdf" [numero_inicio]')
        print('Ejemplo: python separar_expedientes.py "escaneo.pdf" 35')
        sys.exit(1)

    inicio = int(sys.argv[2]) if len(sys.argv) >= 3 else 1
    separar_expedientes(sys.argv[1], inicio)