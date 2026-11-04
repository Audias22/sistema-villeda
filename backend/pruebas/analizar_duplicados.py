# -*- coding: utf-8 -*-
"""
Informe de clientes repetidos. Solo lee, no modifica nada.

La carga automatica creo un cliente por expediente, de modo que una misma
persona quedo registrada varias veces. Este script agrupa por nombre
completo y muestra cuantos registros hay de cada una y en cuantos
expedientes aparece.

Uso:
    python analizar_duplicados.py
    python analizar_duplicados.py --todos    lista todos los grupos
"""

import argparse
import os
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(os.path.join(AQUI, '..', '.env'))

CONSULTA = text("""
    SELECT c.id_cliente, c.primer_nombre, c.segundo_nombre,
           c.primer_apellido, c.segundo_apellido, c.dpi, c.activo,
           count(e.id_expediente) AS expedientes
    FROM clientes c
    LEFT JOIN expedientes e ON e.id_cliente = c.id_cliente
    GROUP BY c.id_cliente, c.primer_nombre, c.segundo_nombre,
             c.primer_apellido, c.segundo_apellido, c.dpi, c.activo
    ORDER BY c.id_cliente
""")


def clave(fila):
    """Nombre normalizado, sin tildes ni espacios de mas, para agrupar."""
    partes = [fila.primer_nombre, fila.segundo_nombre,
              fila.primer_apellido, fila.segundo_apellido]
    texto = ' '.join(p.strip() for p in partes if p and p.strip())
    texto = unicodedata.normalize('NFD', texto.upper())

    return ''.join(c for c in texto if unicodedata.category(c) != 'Mn')


def completo(fila):
    partes = [fila.primer_nombre, fila.segundo_nombre,
              fila.primer_apellido, fila.segundo_apellido]
    return ' '.join(p for p in partes if p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--todos', action='store_true')
    args = ap.parse_args()

    engine = create_engine(os.getenv('DATABASE_URL'))
    with engine.connect() as con:
        filas = con.execute(CONSULTA).fetchall()

    grupos = {}
    for fila in filas:
        grupos.setdefault(clave(fila), []).append(fila)

    repetidos = {k: v for k, v in grupos.items() if len(v) > 1}
    sobrantes = sum(len(v) - 1 for v in repetidos.values())
    con_dpi = sum(1 for f in filas if (f.dpi or '').strip())

    print('')
    print('Clientes registrados:          %d' % len(filas))
    print('Personas distintas por nombre: %d' % len(grupos))
    print('Nombres con mas de un registro:%d' % len(repetidos))
    print('Registros que sobran:          %d' % sobrantes)
    print('Clientes con DPI cargado:      %d' % con_dpi)
    print('')

    orden = sorted(repetidos.items(), key=lambda x: -len(x[1]))
    mostrar = orden if args.todos else orden[:20]

    print('%-44s %-10s %s' % ('NOMBRE', 'REGISTROS', 'EXPEDIENTES'))
    print('-' * 78)
    for _, grupo in mostrar:
        nombre = completo(grupo[0])
        exp = sum(g.expedientes for g in grupo)
        ids = ','.join(str(g.id_cliente) for g in grupo[:6])
        if len(grupo) > 6:
            ids += ',...'
        print('%-44s %-10d %-3d   ids: %s' % (nombre[:44], len(grupo), exp, ids))

    if not args.todos and len(orden) > 20:
        print('')
        print('... y %d grupos mas. Usa --todos para verlos.' % (len(orden) - 20))
    print('')


if __name__ == '__main__':
    main()
