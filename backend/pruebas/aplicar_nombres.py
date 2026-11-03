# -*- coding: utf-8 -*-
"""
Escribe en la base los nombres reales de los clientes.

Combina dos fuentes: lo que la extraccion automatica propuso a partir del
texto OCR, y los nombres que se escribieron a mano en nombres_a_mano.csv
para los expedientes que la extraccion no logro resolver. Lo escrito a mano
siempre tiene prioridad.

Por seguridad:

  - No hace nada salvo que se pase --aplicar. Sin esa bandera solo informa.
  - Antes de escribir guarda un respaldo con los valores actuales, que
    permite deshacer todo con --revertir.
  - Solo toca clientes que todavia se llaman "Cliente NNN". Si un registro
    ya tiene nombre real no se pisa, de modo que correrlo dos veces no hace
    dano. Para rehacer uno ya aplicado esta --forzar.
  - Todo ocurre dentro de una transaccion: o entran todos o no entra ninguno.

Uso:
    python aplicar_nombres.py                      simula y no escribe nada
    python aplicar_nombres.py --aplicar            escribe
    python aplicar_nombres.py --revertir <archivo> deshace usando el respaldo
"""

import argparse
import csv
import os
import sys
from datetime import datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import extractor

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(os.path.join(AQUI, '..', '.env'))

A_MANO = os.path.join(AQUI, 'nombres_a_mano.csv')

CONSULTA = text("""
    SELECT e.id_expediente, e.numero_expediente, e.id_cliente,
           c.primer_nombre, c.segundo_nombre,
           c.primer_apellido, c.segundo_apellido,
           d.texto_completo
    FROM expedientes e
    JOIN clientes c ON c.id_cliente = e.id_cliente
    LEFT JOIN LATERAL (
        SELECT texto_completo FROM documentos
        WHERE id_expediente = e.id_expediente AND texto_completo IS NOT NULL
        ORDER BY id_documento LIMIT 1
    ) d ON true
    ORDER BY e.id_expediente
""")

ACTUALIZAR = text("""
    UPDATE clientes
       SET primer_nombre      = :primer_nombre,
           segundo_nombre     = :segundo_nombre,
           primer_apellido    = :primer_apellido,
           segundo_apellido   = :segundo_apellido,
           fecha_modificacion = now()
     WHERE id_cliente = :id_cliente
""")


def es_placeholder(fila):
    """Reconoce los clientes generados por la carga, del tipo 'Cliente 123'."""
    nombre = (fila.primer_nombre or '').strip().lower()
    apellido = (fila.primer_apellido or '').strip()

    return nombre == 'cliente' and apellido.isdigit()


def nombre_actual(fila):
    partes = [fila.primer_nombre, fila.segundo_nombre,
              fila.primer_apellido, fila.segundo_apellido]
    return ' '.join(p for p in partes if p).strip()


def leer_a_mano():
    if not os.path.exists(A_MANO):
        return {}
    with open(A_MANO, encoding='utf-8-sig') as f:
        return {r['numero_expediente']: r['nombre'].strip()
                for r in csv.DictReader(f) if r['nombre'].strip()}


def construir(engine):
    with engine.connect() as con:
        filas = con.execute(CONSULTA).fetchall()

    a_mano = leer_a_mano()

    # Primera pasada: lo que detecta el OCR, con las correcciones aprobadas.
    detectado = {}
    for fila in filas:
        nombres = extractor.extraer(fila.texto_completo or '')
        if nombres:
            detectado[fila.numero_expediente] = extractor.aplicar_aprobadas(nombres[0])

    # Segunda pasada: unificar tildes contra el vocabulario del corpus.
    cuenta = extractor.vocabulario(list(detectado.values()))
    for num in list(detectado):
        detectado[num], _ = extractor.corregir_palabras(detectado[num], cuenta)

    plan = []
    for fila in filas:
        num = fila.numero_expediente
        # Lo escrito a mano manda sobre lo detectado.
        nombre = a_mano.get(num) or detectado.get(num, '')
        if not nombre:
            continue

        texto = fila.texto_completo or ''
        unico = extractor.tiene_unico_nombre(texto, nombre)
        unico_ap = extractor.tiene_unico_apellido(texto, nombre)
        campos = extractor.partir(nombre, unico, unico_ap)

        plan.append({
            'numero_expediente': num,
            'id_cliente':        fila.id_cliente,
            'origen':            'manual' if num in a_mano else 'automatico',
            'nombre_actual':     nombre_actual(fila),
            'nombre_nuevo':      nombre,
            'placeholder':       es_placeholder(fila),
            'antes':  {'primer_nombre': fila.primer_nombre,
                       'segundo_nombre': fila.segundo_nombre,
                       'primer_apellido': fila.primer_apellido,
                       'segundo_apellido': fila.segundo_apellido},
            'campos': campos,
        })

    return filas, plan


def guardar_respaldo(plan):
    marca = datetime.now().strftime('%Y%m%d_%H%M%S')
    ruta = os.path.join(AQUI, 'respaldo_clientes_%s.csv' % marca)
    with open(ruta, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['id_cliente', 'primer_nombre', 'segundo_nombre',
                    'primer_apellido', 'segundo_apellido'])
        for p in plan:
            a = p['antes']
            w.writerow([p['id_cliente'], a['primer_nombre'] or '',
                        a['segundo_nombre'] or '', a['primer_apellido'] or '',
                        a['segundo_apellido'] or ''])
    return ruta


def revertir(engine, ruta):
    with open(ruta, encoding='utf-8-sig') as f:
        filas = list(csv.DictReader(f))

    with engine.begin() as con:
        for r in filas:
            con.execute(ACTUALIZAR, {
                'id_cliente':       int(r['id_cliente']),
                'primer_nombre':    r['primer_nombre'] or None,
                'segundo_nombre':   r['segundo_nombre'] or None,
                'primer_apellido':  r['primer_apellido'] or None,
                'segundo_apellido': r['segundo_apellido'] or None,
            })

    print('Revertidos %d clientes desde %s' % (len(filas), os.path.basename(ruta)))



def exportar_lista(filas, plan):
    """
    Hoja con el nombre final de los 390 expedientes, para revisar antes de
    escribir. Marca de donde salio cada uno y resalta los que podrian estar
    incompletos.
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    por_numero = {p['numero_expediente']: p for p in plan}

    wb = Workbook()
    ws = wb.active
    ws.title = 'Nombres finales'
    ws.append(['numero_expediente', 'nombre_final', 'origen',
               'primer_nombre', 'segundo_nombre',
               'primer_apellido', 'segundo_apellido', 'observacion'])

    for celda in ws[1]:
        celda.font = Font(bold=True, color='FFFFFF')
        celda.fill = PatternFill('solid', fgColor='1F4E79')

    manual = PatternFill('solid', fgColor='E2EFDA')
    corto = PatternFill('solid', fgColor='FFF2CC')
    vacio = PatternFill('solid', fgColor='FCE4D6')

    for fila in filas:
        p = por_numero.get(fila.numero_expediente)

        if not p:
            ws.append([fila.numero_expediente, '', 'sin nombre',
                       '', '', '', '', 'queda como Cliente NNN'])
            relleno = vacio
        else:
            campos = p['campos']
            palabras = len(p['nombre_nuevo'].split())
            obs = 'puede faltar el nombre de pila' if palabras <= 2 else ''
            ws.append([p['numero_expediente'], p['nombre_nuevo'], p['origen'],
                       campos['primer_nombre'], campos['segundo_nombre'],
                       campos['primer_apellido'], campos['segundo_apellido'],
                       obs])
            relleno = manual if p['origen'] == 'manual' else (corto if obs else None)

        if relleno:
            for celda in ws[ws.max_row]:
                celda.fill = relleno

    for letra, ancho in (('A', 20), ('B', 44), ('C', 12), ('D', 16),
                         ('E', 16), ('F', 18), ('G', 22), ('H', 30)):
        ws.column_dimensions[letra].width = ancho

    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions

    salida = os.path.join(AQUI, 'nombres_finales.xlsx')
    wb.save(salida)

    print('')
    print('Archivo: %s' % salida)
    print('')
    print('Verde    = lo escribiste a mano')
    print('Amarillo = solo dos palabras, puede faltarle el nombre de pila')
    print('Naranja  = sin nombre, se queda como Cliente NNN')
    print('')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--aplicar', action='store_true')
    ap.add_argument('--forzar', action='store_true',
                    help='tambien reescribe clientes que ya tienen nombre real')
    ap.add_argument('--revertir', metavar='ARCHIVO')
    ap.add_argument('--lista', action='store_true',
                    help='exporta los 390 nombres finales a Excel para revisarlos')
    args = ap.parse_args()

    engine = create_engine(os.getenv('DATABASE_URL'))

    if args.revertir:
        revertir(engine, args.revertir)
        return

    filas, plan = construir(engine)

    if args.lista:
        exportar_lista(filas, plan)
        return

    aplicables = [p for p in plan if p['placeholder'] or args.forzar]
    omitidos = [p for p in plan if not p['placeholder'] and not args.forzar]
    sin_nombre = len(filas) - len(plan)

    print('')
    print('Expedientes en la base:        %d' % len(filas))
    print('Con nombre para escribir:      %d' % len(plan))
    print('   de los cuales a mano:       %d' % sum(1 for p in plan if p['origen'] == 'manual'))
    print('Se van a actualizar:           %d' % len(aplicables))
    print('Omitidos (ya tienen nombre):   %d' % len(omitidos))
    print('Sin nombre, quedan como estan: %d' % sin_nombre)
    print('')

    for p in aplicables[:15]:
        print('  %-14s %-14s -> %s' %
              (p['numero_expediente'], p['nombre_actual'], p['nombre_nuevo']))
    if len(aplicables) > 15:
        print('  ... y %d mas' % (len(aplicables) - 15))
    print('')

    if not args.aplicar:
        print('SIMULACION. No se escribio nada.')
        print('Para aplicar de verdad:  python aplicar_nombres.py --aplicar')
        return

    if not aplicables:
        print('No hay nada que actualizar.')
        return

    respaldo = guardar_respaldo(aplicables)
    print('Respaldo guardado en: %s' % respaldo)

    with engine.begin() as con:
        for p in aplicables:
            con.execute(ACTUALIZAR, dict(p['campos'], id_cliente=p['id_cliente']))

    print('Actualizados %d clientes.' % len(aplicables))
    print('')
    print('Para deshacer todo:')
    print('  python aplicar_nombres.py --revertir "%s"' % respaldo)


if __name__ == '__main__':
    main()
