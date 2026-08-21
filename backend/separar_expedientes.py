r"""
SEPARADOR DE EXPEDIENTES
========================
Divide un PDF escaneado en expedientes individuales usando hojas
de color (verde fosforescente) como separadores.

Uso:
    python separar_expedientes.py "C:\ruta\al\archivo.pdf"
    python separar_expedientes.py "C:\ruta\al\archivo.pdf" 35
    python separar_expedientes.py "C:\ruta\al\archivo.pdf" 35 2022
    python separar_expedientes.py "C:\ruta\al\archivo.pdf" 35 2022 "C:\ruta\salida"

Argumentos (los tres últimos son opcionales):
    1. ruta del PDF a dividir
    2. numero_inicio  — correlativo del primer expediente (por defecto 1)
    3. anio           — si se indica, los archivos salen como 2022-035.pdf;
                        si se omite, salen como expediente_035.pdf (como siempre)
    4. carpeta_salida — por defecto, 'expedientes_separados' junto al PDF de entrada

Si algún archivo de salida ya existe, el script aborta sin escribir nada.

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


def nombre_expediente(num, anio=None):
    """Nombre del archivo de salida. Con año: 2022-035.pdf. Sin año: expediente_035.pdf."""
    if anio:
        return f"{anio}-{num:03d}.pdf"
    return f"expediente_{num:03d}.pdf"


def separar_expedientes(ruta_pdf, numero_inicio=1, anio=None, carpeta_salida=None):
    """Divide el PDF en expedientes individuales.

    Devuelve la cantidad de expedientes generados, o None si no se generó nada.
    """

    if not os.path.exists(ruta_pdf):
        print(f"ERROR: No se encontró el archivo: {ruta_pdf}")
        return None

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
        return None

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
        print(f"  {nombre_expediente(num, anio)}: páginas {[p + 1 for p in grupo]}")

    # Definir carpeta de salida (por defecto, junto al PDF de entrada)
    if carpeta_salida is None:
        carpeta_base = os.path.dirname(ruta_pdf) or '.'
        carpeta_salida = os.path.join(carpeta_base, 'expedientes_separados')

    # Verificación previa: si algún archivo de salida ya existe, abortar SIN escribir nada
    colisiones = [
        os.path.join(carpeta_salida, nombre_expediente(j + numero_inicio, anio))
        for j in range(len(expedientes))
        if os.path.exists(os.path.join(carpeta_salida, nombre_expediente(j + numero_inicio, anio)))
    ]

    if colisiones:
        print(f"\nERROR: {len(colisiones)} archivo(s) de salida ya existen. NO se escribió nada.")
        for ruta in colisiones:
            print(f"  YA EXISTE: {ruta}")
        print("\nRevisá el numero_inicio o la carpeta de salida antes de reintentar.")
        return None

    os.makedirs(carpeta_salida, exist_ok=True)

    # Dividir el PDF real
    print(f"\nGenerando archivos en: {carpeta_salida}")
    lector = PdfReader(ruta_pdf)

    for j, grupo in enumerate(expedientes):
        escritor = PdfWriter()
        for pagina_idx in grupo:
            escritor.add_page(lector.pages[pagina_idx])

        nombre = nombre_expediente(j + numero_inicio, anio)
        ruta_salida = os.path.join(carpeta_salida, nombre)
        with open(ruta_salida, 'wb') as f:
            escritor.write(f)
        print(f"  {nombre} ({len(grupo)} páginas)")

    print(f"\nListo. {len(expedientes)} expedientes guardados en: {carpeta_salida}")
    return len(expedientes)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python separar_expedientes.py "ruta_al_pdf.pdf" [numero_inicio] [anio] [carpeta_salida]')
        print('Ejemplo: python separar_expedientes.py "escaneo.pdf" 35')
        print('Ejemplo: python separar_expedientes.py "lote.pdf" 11 2022 "expedientes_separados_2022"')
        sys.exit(1)

    inicio = 1
    if len(sys.argv) >= 3:
        if not sys.argv[2].lstrip('+').isdigit():
            print(f'ERROR: el numero_inicio debe ser un número entero. Recibí: "{sys.argv[2]}"')
            sys.exit(1)
        inicio = int(sys.argv[2])
        if inicio < 1:
            print(f'ERROR: el numero_inicio debe ser 1 o mayor. Recibí: {inicio}')
            sys.exit(1)

    anio = None
    if len(sys.argv) >= 4:
        anio = sys.argv[3]
        if not (anio.isdigit() and len(anio) == 4):
            print(f'ERROR: el anio debe ser de 4 dígitos (ej. 2022). Recibí: "{anio}"')
            sys.exit(1)

    salida = sys.argv[4] if len(sys.argv) >= 5 else None

    generados = separar_expedientes(sys.argv[1], inicio, anio, salida)
    sys.exit(0 if generados else 1)
