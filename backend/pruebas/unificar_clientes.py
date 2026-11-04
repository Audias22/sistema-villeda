# -*- coding: utf-8 -*-
"""
Unifica los clientes repetidos.

La carga automatica creo un registro de cliente por expediente, de modo que
una misma persona quedo varias veces. Este script agrupa por nombre completo
normalizado, conserva el registro de menor id de cada grupo, reapunta sus
expedientes a ese y desactiva los sobrantes.

Los sobrantes se DESACTIVAN, no se borran. Asi la operacion es reversible y
no se pierde la trazabilidad de como quedo la carga original.

Por seguridad:

  - No hace nada salvo que se pase --aplicar.
  - Antes de escribir guarda un respaldo con el id_cliente anterior de cada
    expediente y la lista de los que se desactivan, que permite deshacer
    todo con --revertir.
  - De forma predeterminada OMITE los grupos cuyo nombre tiene dos palabras
    o menos, porque un nombre incompleto puede estar juntando a personas
    distintas. Para incluirlos, una vez verificados contra el documento,
    esta --incluir-cortos.
  - Todo ocurre dentro de una transaccion.

Uso:
    python unificar_clientes.py                          simula
    python unificar_clientes.py --incluir-cortos         simula, con los cortos
    python unificar_clientes.py --aplicar --incluir-cortos
    python unificar_clientes.py --revertir <archivo>
"""

import argparse
import csv
import os
import sys
import unicodedata
from datetime import datetime

AQUI = os.path.dirname(os.path.abspath(__file__))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(os.path.join(AQUI, '..', '.env'))

CONSULTA = text("""
    SELECT c.id_cliente, c.primer_nombre, c.segundo_nombre,
           c.primer_apellido, c.segundo_apellido, c.activo,
           e.id_expediente, e.numero_expediente
    FROM clientes c
    LEFT JOIN expedientes e ON e.id_cliente = c.id_cliente
    WHERE c.activo = true
    ORDER BY c.id_cliente, e.id_expediente
""")

MOVER = text("""
    UPDATE expedientes SET id_cliente = :nuevo, fecha_modificacion = now()
     WHERE id_expediente = :id_expediente
""")

DESACTIVAR = text("""
    UPDATE clientes SET activo = false, fecha_modificacion = now()
     WHERE id_cliente = :id_cliente
""")

ACTIVAR = text("""
    UPDATE clientes SET activo = true, fecha_modificacion = now()
     WHERE id_cliente = :id_cliente
""")


def normalizar(fila):
    partes = [fila.primer_nombre, fila.segundo_nombre,
              fila.primer_apellido, fila.segundo_apellido]
    texto = ' '.join(p.strip() for p in partes if p and p.strip()).upper()
    texto = unicodedata.normalize('NFD', texto)

    return ' '.join(''.join(c for c in texto
                            if unicodedata.category(c) != 'Mn').split())


def completo(fila):
    partes = [fila.primer_nombre, fila.segundo_nombre,
              fila.primer_apellido, fila.segundo_apellido]
    return ' '.join(p for p in partes if p)


def construir(engine, incluir_cortos):
    with engine.connect() as con:
        filas = con.execute(CONSULTA).fetchall()

    grupos = {}
    for fila in filas:
        grupos.setdefault(normalizar(fila), []).append(fila)

    plan, omitidos = [], []

    for clave, registros in grupos.items():
        ids = sorted({r.id_cliente for r in registros})
        if len(ids) < 2 or not clave:
            continue

        corto = len(clave.split()) <= 2
        if corto and not incluir_cortos:
            omitidos.append((completo(registros[0]), len(ids)))
            continue

        conservar = ids[0]
        mover = [(r.id_expediente, r.numero_expediente, r.id_cliente)
                 for r in registros
                 if r.id_expediente and r.id_cliente != conservar]

        plan.append({
            'nombre':     completo(registros[0]),
            'conservar':  conservar,
            'desactivar': [i for i in ids if i != conservar],
            'mover':      mover,
            'corto':      corto,
        })

    return plan, omitidos


def guardar_respaldo(plan):
    marca = datetime.now().strftime('%Y%m%d_%H%M%S')
    ruta = os.path.join(AQUI, 'respaldo_unificacion_%s.csv' % marca)
    with open(ruta, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['tipo', 'id', 'valor_anterior'])
        for g in plan:
            for id_exp, _, id_cli in g['mover']:
                w.writerow(['expediente', id_exp, id_cli])
            for id_cli in g['desactivar']:
                w.writerow(['cliente_desactivado', id_cli, 'true'])
    return ruta


def revertir(engine, ruta):
    with open(ruta, encoding='utf-8-sig') as f:
        filas = list(csv.DictReader(f))

    with engine.begin() as con:
        for r in filas:
            if r['tipo'] == 'expediente':
                con.execute(MOVER, {'id_expediente': int(r['id']),
                                    'nuevo': int(r['valor_anterior'])})
            else:
                con.execute(ACTIVAR, {'id_cliente': int(r['id'])})

    exp = sum(1 for r in filas if r['tipo'] == 'expediente')
    cli = sum(1 for r in filas if r['tipo'] != 'expediente')
    print('Revertidos: %d expedientes reapuntados y %d clientes reactivados' % (exp, cli))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--aplicar', action='store_true')
    ap.add_argument('--incluir-cortos', action='store_true')
    ap.add_argument('--revertir', metavar='ARCHIVO')
    args = ap.parse_args()

    engine = create_engine(os.getenv('DATABASE_URL'))

    if args.revertir:
        revertir(engine, args.revertir)
        return

    plan, omitidos = construir(engine, args.incluir_cortos)

    expedientes = sum(len(g['mover']) for g in plan)
    clientes = sum(len(g['desactivar']) for g in plan)

    print('')
    print('Grupos a unificar:          %d' % len(plan))
    print('Expedientes a reapuntar:    %d' % expedientes)
    print('Clientes a desactivar:      %d' % clientes)
    if omitidos:
        print('')
        print('OMITIDOS por nombre de dos palabras o menos (riesgo de juntar')
        print('personas distintas). Verificalos contra el documento y volve a')
        print('correr con --incluir-cortos:')
        for nombre, n in omitidos:
            print('   %-32s %d registros' % (nombre[:32], n))
    print('')

    for g in sorted(plan, key=lambda x: -len(x['desactivar']))[:15]:
        print('  %-38s conserva %-5d desactiva %d' %
              (g['nombre'][:38], g['conservar'], len(g['desactivar'])))
    if len(plan) > 15:
        print('  ... y %d grupos mas' % (len(plan) - 15))
    print('')

    if not args.aplicar:
        print('SIMULACION. No se escribio nada.')
        print('Para aplicar:  python unificar_clientes.py --aplicar%s' %
              (' --incluir-cortos' if args.incluir_cortos else ''))
        return

    if not plan:
        print('No hay nada que unificar.')
        return

    respaldo = guardar_respaldo(plan)
    print('Respaldo guardado en: %s' % respaldo)

    with engine.begin() as con:
        for g in plan:
            for id_exp, _, _ in g['mover']:
                con.execute(MOVER, {'id_expediente': id_exp,
                                    'nuevo': g['conservar']})
            for id_cli in g['desactivar']:
                con.execute(DESACTIVAR, {'id_cliente': id_cli})

    print('Unificados %d grupos: %d expedientes reapuntados, %d clientes desactivados.'
          % (len(plan), expedientes, clientes))
    print('')
    print('Para deshacer todo:')
    print('  python unificar_clientes.py --revertir "%s"' % respaldo)


if __name__ == '__main__':
    main()
