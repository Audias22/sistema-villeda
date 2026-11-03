# -*- coding: utf-8 -*-
"""
Propone el nombre real del cliente de cada expediente a partir del texto
que el OCR extrajo del documento.

NO escribe nada en la base. Solo lee y propone, para que la revision sea
humana antes de aplicar cualquier cambio.

Uso:
    python revisar_nombres.py                 muestra 10 expedientes en pantalla
    python revisar_nombres.py --muestra 40    muestra 40
    python revisar_nombres.py --csv           escribe nombres_propuestos.csv con todos

El CSV sale con una columna 'aprobado' en blanco. La idea es revisarlo en
Excel, corregir lo que haga falta y marcar con una x lo que se acepta.
"""

import argparse
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

import extractor

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

CONSULTA = text("""
    SELECT
        e.id_expediente,
        e.numero_expediente,
        e.id_cliente,
        c.primer_nombre,
        c.primer_apellido,
        d.texto_completo
    FROM expedientes e
    JOIN clientes   c ON c.id_cliente = e.id_cliente
    LEFT JOIN LATERAL (
        SELECT texto_completo
        FROM documentos
        WHERE id_expediente = e.id_expediente
          AND texto_completo IS NOT NULL
        ORDER BY id_documento
        LIMIT 1
    ) d ON true
    ORDER BY e.id_expediente
""")


def nombre_actual(fila):
    partes = [fila.primer_nombre or '', fila.primer_apellido or '']
    return ' '.join(p for p in partes if p).strip()


def analizar(engine, limite=None):
    with engine.connect() as con:
        filas = con.execute(CONSULTA).fetchall()

    resultados = []
    for fila in filas:
        texto = fila.texto_completo or ''
        nombres = extractor.extraer(texto)

        if nombres:
            propuesto = nombres[0]
            unico = extractor.tiene_unico_nombre(texto, propuesto)
            unico_ap = extractor.tiene_unico_apellido(texto, propuesto)
            campos = extractor.partir(propuesto, unico, unico_ap)
            otros = ' | '.join(nombres[1:]) if len(nombres) > 1 else ''
        else:
            propuesto, otros = '', ''
            campos = {k: '' for k in
                      ('primer_nombre', 'segundo_nombre',
                       'primer_apellido', 'segundo_apellido')}

        resultados.append({
            'id_expediente':    fila.id_expediente,
            'numero_expediente': fila.numero_expediente,
            'id_cliente':       fila.id_cliente,
            'cliente_actual':   nombre_actual(fila),
            'nombre_propuesto': propuesto,
            'primer_nombre':    campos['primer_nombre'],
            'segundo_nombre':   campos['segundo_nombre'],
            'primer_apellido':  campos['primer_apellido'],
            'segundo_apellido': campos['segundo_apellido'],
            'otros_comparecientes': otros,
            'lectura_original': '',
            'sugerencia_palabra': '',
            'revisar': '',
            'tiene_texto':      'si' if texto.strip() else 'NO',
            'aprobado':         '',
        })

        if limite and len(resultados) >= limite:
            break

    # Segunda pasada: el mismo otorgante aparece en varios expedientes y el
    # OCR no siempre lee igual su nombre. Se comparan todos entre si y se
    # anota la variante mas frecuente como sugerencia, sin pisar lo detectado.
    detectados = [r['nombre_propuesto'] for r in resultados if r['nombre_propuesto']]
    correcciones = extractor.sugerir_correcciones(detectados)

    for r in resultados:
        sugerido = correcciones.get(r['nombre_propuesto'], '')
        if sugerido:
            # La correccion pasa a ser el nombre propuesto y la lectura cruda
            # del OCR queda aparte, para que la fila no se contradiga consigo
            # misma: antes el nombre decia NAJBRA y los campos decian NAJERA.
            r['lectura_original'] = r['nombre_propuesto']
            r['nombre_propuesto'] = sugerido
            campos = extractor.partir(sugerido)
            r['primer_nombre']    = campos['primer_nombre']
            r['segundo_nombre']   = campos['segundo_nombre']
            r['primer_apellido']  = campos['primer_apellido']
            r['segundo_apellido'] = campos['segundo_apellido']

    # Tercera pasada: comparar palabra por palabra contra el vocabulario del
    # corpus. Las diferencias de tilde se unifican solas, los cambios de
    # letras se dejan anotados para que los decidas vos.
    cuenta = extractor.vocabulario(
        [r['nombre_propuesto'] for r in resultados if r['nombre_propuesto']]
    )

    for r in resultados:
        if not r['nombre_propuesto']:
            r['revisar'] = 'A - escribir a mano'
            continue

        # Primero las correcciones ya revisadas, despues la unificacion de
        # tildes contra el vocabulario del corpus.
        aprobado = extractor.aplicar_aprobadas(r['nombre_propuesto'])
        corregido, sugerencias = extractor.corregir_palabras(aprobado, cuenta)

        if corregido != r['nombre_propuesto']:
            if not r['lectura_original']:
                r['lectura_original'] = r['nombre_propuesto']
            r['nombre_propuesto'] = corregido
            campos = extractor.partir(corregido)
            r['primer_nombre']    = campos['primer_nombre']
            r['segundo_nombre']   = campos['segundo_nombre']
            r['primer_apellido']  = campos['primer_apellido']
            r['segundo_apellido'] = campos['segundo_apellido']

        if sugerencias:
            r['sugerencia_palabra'] = ' / '.join(sugerencias)
            r['revisar'] = ''
        elif len(r['nombre_propuesto'].split()) <= 2:
            r['revisar'] = 'C - puede faltar el nombre de pila'

    return resultados



def resumen(filas):
    con_nombre = sum(1 for f in filas if f['nombre_propuesto'])
    corregidos = sum(1 for f in filas if f['lectura_original'])
    print('Expedientes analizados: %d' % len(filas))
    print('Con nombre propuesto:   %d  (%.1f%%)' %
          (con_nombre, 100.0 * con_nombre / max(1, len(filas))))
    print('Para llenar a mano:     %d' % (len(filas) - con_nombre))
    print('Corregidos por semejanza: %d' % corregidos)


def escribir_excel(filas):
    """
    Hoja lista para revisar: encabezado fijo, columnas anchas, las filas sin
    deteccion resaltadas y una lista desplegable en la columna de aprobacion.
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.worksheet.datavalidation import DataValidation

    wb = Workbook()
    ws = wb.active
    ws.title = 'Nombres propuestos'

    columnas = list(filas[0].keys())
    ws.append(columnas)

    encabezado = Font(bold=True, color='FFFFFF')
    fondo = PatternFill('solid', fgColor='1F4E79')
    for celda in ws[1]:
        celda.font = encabezado
        celda.fill = fondo
        celda.alignment = Alignment(vertical='center')

    sin_deteccion = PatternFill('solid', fgColor='FCE4D6')
    con_sugerencia = PatternFill('solid', fgColor='FFF2CC')

    for fila in filas:
        ws.append([fila[c] for c in columnas])
        actual = ws.max_row
        if not fila['nombre_propuesto']:
            for celda in ws[actual]:
                celda.fill = sin_deteccion
        elif fila['lectura_original']:
            for celda in ws[actual]:
                celda.fill = con_sugerencia

    anchos = {'numero_expediente': 18, 'cliente_actual': 16,
              'nombre_propuesto': 38, 'primer_nombre': 16,
              'segundo_nombre': 16, 'primer_apellido': 18,
              'segundo_apellido': 20, 'otros_comparecientes': 40,
              'lectura_original': 30, 'sugerencia_palabra': 34, 'revisar': 32, 'tiene_texto': 12, 'aprobado': 12}
    for i, nombre in enumerate(columnas, start=1):
        letra = ws.cell(row=1, column=i).column_letter
        ws.column_dimensions[letra].width = anchos.get(nombre, 14)

    col_aprobado = columnas.index('aprobado') + 1
    letra = ws.cell(row=1, column=col_aprobado).column_letter
    validacion = DataValidation(type='list', formula1='"si,no"', allow_blank=True)
    ws.add_data_validation(validacion)
    validacion.add('%s2:%s%d' % (letra, letra, len(filas) + 1))

    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions

    salida = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          'nombres_propuestos.xlsx')
    wb.save(salida)
    print('Archivo: %s' % salida)
    print('')
    print('Naranja = sin deteccion, hay que escribir el nombre a mano.')
    print('Amarillo = ya corregido. La columna lectura_original guarda lo que')
    print('           el OCR habia leido mal. No tenes que hacer nada ahi.')
    print('')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--muestra', type=int, default=10)
    ap.add_argument('--csv', action='store_true')
    ap.add_argument('--excel', action='store_true')
    args = ap.parse_args()

    url = os.getenv('DATABASE_URL')
    if not url:
        print('No se encontro DATABASE_URL en backend/.env')
        sys.exit(1)

    engine = create_engine(url)

    if args.excel:
        filas = analizar(engine)
        escribir_excel(filas)
        resumen(filas)
        return

    if args.csv:
        filas = analizar(engine)
        salida = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              'nombres_propuestos.csv')
        with open(salida, 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
            w.writeheader()
            w.writerows(filas)

        con_nombre = sum(1 for f in filas if f['nombre_propuesto'])
        sin_texto = sum(1 for f in filas if f['tiene_texto'] == 'NO')
        print('Expedientes analizados: %d' % len(filas))
        print('Con nombre propuesto:   %d  (%.1f%%)' %
              (con_nombre, 100.0 * con_nombre / max(1, len(filas))))
        print('Sin texto de OCR:       %d' % sin_texto)
        corregidos = sum(1 for f in filas if f['lectura_original'])
        print('Con sugerencia de correccion por semejanza: %d' % corregidos)
        print('Archivo: %s' % salida)
        return

    filas = analizar(engine, limite=args.muestra)
    print('')
    print('%-16s %-16s %-38s %s' %
          ('EXPEDIENTE', 'CLIENTE ACTUAL', 'NOMBRE PROPUESTO', 'OTROS'))
    print('-' * 110)
    for f in filas:
        print('%-16s %-16s %-38s %s' % (
            f['numero_expediente'],
            f['cliente_actual'][:16],
            (f['nombre_propuesto'] or '(sin deteccion)')[:38],
            (f['lectura_original'] and 'OCR leyo: ' + f['lectura_original'])
            or f['otros_comparecientes'][:28]
        ))
    print('')
    aciertos = sum(1 for f in filas if f['nombre_propuesto'])
    print('Detectados: %d de %d' % (aciertos, len(filas)))


if __name__ == '__main__':
    main()
