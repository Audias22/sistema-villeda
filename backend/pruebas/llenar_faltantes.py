# -*- coding: utf-8 -*-
"""
Revision guiada de nombres, expediente por expediente.

Para cada caso abre el PDF, muestra el fragmento del texto OCR donde deberia
estar el otorgante y espera una respuesta. Lo escrito se guarda despues de
cada una, asi que se puede cortar con Ctrl+C y retomar sin perder nada.

Dos modos:

    python llenar_faltantes.py            los que no tienen ningun nombre
    python llenar_faltantes.py --cortos   los de dos palabras, que pueden
                                          estar completos o faltarles el
                                          nombre de pila

En el modo --cortos, Enter confirma el nombre que ya propuso el sistema. Hay
personas con un solo nombre y un solo apellido, de modo que dos palabras no
significa que este mal.

Otras opciones:
    --sin-pdf    no abre el visor
    --desde N    empieza en el caso numero N

Teclas:
    Enter   confirmar lo propuesto (modo cortos) o saltar (modo faltantes)
    q       guardar y salir
"""

import argparse
import csv
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extractor

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

AQUI = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(AQUI, '..', '.env'))

PDFS = os.path.expanduser(r'~\Desktop\SEPARAR_PDF\expedientes_separados')
A_MANO = os.path.join(AQUI, 'nombres_a_mano.csv')
REVISADOS = os.path.join(AQUI, 'revisados_cortos.csv')

CONSULTA = text("""
    SELECT e.id_expediente, e.numero_expediente, d.texto_completo
    FROM expedientes e
    LEFT JOIN LATERAL (
        SELECT texto_completo FROM documentos
        WHERE id_expediente = e.id_expediente AND texto_completo IS NOT NULL
        ORDER BY id_documento LIMIT 1
    ) d ON true
    ORDER BY e.id_expediente
""")


def pdfs_ordenados():
    if not os.path.isdir(PDFS):
        return []
    return sorted(f for f in os.listdir(PDFS) if f.lower().endswith('.pdf'))


def pista(texto, ancho=700):
    plano = re.sub(r'\s+', ' ', texto or '')
    if not plano.strip():
        return '(sin texto de OCR)'

    for patron in (r'comparec', r'otorgado\s+por', r'declara\s+(?:el|la)\s+se[nñ]or',
                   r'Ante\s*M[IÍií]'):
        m = re.search(patron, plano, re.IGNORECASE)
        if m:
            ini = max(0, m.start() - 100)
            return plano[ini:ini + ancho]

    return plano[:ancho]


def leer_csv(ruta, clave, valor):
    if not os.path.exists(ruta):
        return {}
    with open(ruta, encoding='utf-8-sig') as f:
        return {r[clave]: r[valor] for r in csv.DictReader(f)}


def guardar_csv(ruta, datos, encabezados):
    with open(ruta, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(encabezados)
        for k in sorted(datos):
            w.writerow([k, datos[k]])


def nombres_propuestos(filas):
    """El nombre que hoy propone el sistema para cada expediente."""
    crudo = {}
    for fila in filas:
        n = extractor.extraer(fila.texto_completo or '')
        if n:
            crudo[fila.numero_expediente] = extractor.aplicar_aprobadas(n[0])

    cuenta = extractor.vocabulario(list(crudo.values()))
    for num in list(crudo):
        crudo[num], _ = extractor.corregir_palabras(crudo[num], cuenta)

    a_mano = leer_csv(A_MANO, 'numero_expediente', 'nombre')
    crudo.update(a_mano)

    return crudo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cortos', action='store_true')
    ap.add_argument('--sin-pdf', action='store_true')
    ap.add_argument('--desde', type=int, default=1)
    args = ap.parse_args()

    engine = create_engine(os.getenv('DATABASE_URL'))
    with engine.connect() as con:
        filas = con.execute(CONSULTA).fetchall()

    archivos = pdfs_ordenados()
    if len(archivos) != len(filas):
        print('AVISO: hay %d PDF y %d expedientes. No se abrira el visor.' %
              (len(archivos), len(filas)))
        args.sin_pdf = True

    propuestos = nombres_propuestos(filas)
    a_mano = leer_csv(A_MANO, 'numero_expediente', 'nombre')
    revisados = leer_csv(REVISADOS, 'numero_expediente', 'resultado')

    if args.cortos:
        candidatos = [(i, f) for i, f in enumerate(filas)
                      if len(propuestos.get(f.numero_expediente, '').split()) == 2]
        pendientes = [c for c in candidatos
                      if c[1].numero_expediente not in revisados]
        titulo = 'nombres de dos palabras'
    else:
        candidatos = [(i, f) for i, f in enumerate(filas)
                      if not propuestos.get(f.numero_expediente)]
        pendientes = [c for c in candidatos
                      if c[1].numero_expediente not in a_mano]
        titulo = 'expedientes sin nombre'

    pendientes = pendientes[args.desde - 1:]

    print('')
    print('Revisando %s' % titulo)
    print('Total %d    ya resueltos %d    por hacer %d' %
          (len(candidatos), len(candidatos) - len(pendientes), len(pendientes)))
    if args.cortos:
        print('Enter = el nombre esta bien    escribir = corregirlo    q = salir')
    else:
        print('Enter = saltar    escribir = guardar    q = salir')
    print('')

    for n, (indice, fila) in enumerate(pendientes, args.desde):
        num = fila.numero_expediente
        actual = propuestos.get(num, '')
        archivo = archivos[indice] if indice < len(archivos) else '(sin pdf)'

        print('=' * 92)
        print('[%d de %d]  %s      PDF: %s' %
              (n, len(pendientes) + args.desde - 1, num, archivo))
        if actual:
            print('PROPUESTO: %s' % actual)
        print('=' * 92)
        print(pista(fila.texto_completo))
        print('')

        if not args.sin_pdf and archivo != '(sin pdf)':
            try:
                os.startfile(os.path.join(PDFS, archivo))
            except Exception as exc:
                print('(no se pudo abrir el PDF: %s)' % exc)

        try:
            r = input('Nombre completo > ').strip()
        except (KeyboardInterrupt, EOFError):
            print('')
            break

        if r.lower() == 'q':
            break

        if r:
            a_mano[num] = r.upper()
            guardar_csv(A_MANO, a_mano, ['numero_expediente', 'nombre'])
            if args.cortos:
                revisados[num] = 'corregido'
            print('  guardado: %s' % r.upper())
        else:
            if args.cortos:
                revisados[num] = 'confirmado'
                print('  confirmado como esta')
            else:
                print('  saltado')

        if args.cortos:
            guardar_csv(REVISADOS, revisados,
                        ['numero_expediente', 'resultado'])
        print('')

    guardar_csv(A_MANO, a_mano, ['numero_expediente', 'nombre'])
    if args.cortos:
        guardar_csv(REVISADOS, revisados, ['numero_expediente', 'resultado'])

    print('')
    print('Nombres a mano en total: %d' % len(a_mano))
    if args.cortos:
        print('Cortos revisados:        %d' % len(revisados))


if __name__ == '__main__':
    main()
