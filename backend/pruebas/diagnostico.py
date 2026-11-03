# -*- coding: utf-8 -*-
"""
Para los expedientes donde no se detecto nombre, muestra los candidatos en
mayusculas que el extractor encontro y el texto que viene justo despues.

Esa continuacion es la que decide si el candidato se acepta o se descarta,
asi que ver los casos reales dice con precision que formulas faltan cubrir.

Uso:
    python diagnostico.py            los primeros 8 que fallan
    python diagnostico.py --n 20
"""

import argparse
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extractor

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

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


def candidatos(texto, cuantos=6):
    """Candidatos en mayusculas con la continuacion que los sigue."""
    plano = re.sub(r'\s+', ' ', texto or '')
    salida = []

    for m in extractor.CANDIDATO.finditer(plano):
        nombre = extractor.limpiar(m.group(0))
        if len(nombre.split()) < 2:
            continue
        if extractor._es_ruido(nombre) or extractor.es_notario(nombre):
            continue

        salida.append((nombre, plano[m.end():m.end() + 55].strip()))
        if len(salida) >= cuantos:
            break

    return salida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=8)
    args = ap.parse_args()

    engine = create_engine(os.getenv('DATABASE_URL'))
    with engine.connect() as con:
        filas = con.execute(CONSULTA).fetchall()

    fallos = [f for f in filas if not extractor.extraer(f.texto_completo or '')]
    print('Expedientes sin deteccion: %d de %d' % (len(fallos), len(filas)))

    continuaciones = Counter()

    for fila in fallos[:args.n]:
        print('')
        print('=' * 95)
        print('%s  (id %d)' % (fila.numero_expediente, fila.id_expediente))
        print('=' * 95)
        cands = candidatos(fila.texto_completo)
        if not cands:
            print('  sin candidatos en mayusculas')
        for nombre, sigue in cands:
            print('  %-38s ||  %s' % (nombre[:38], sigue))

    # Resumen util: con que suelen seguir los candidatos de TODOS los fallos
    for fila in fallos:
        for nombre, sigue in candidatos(fila.texto_completo, cuantos=3):
            arranque = re.sub(r'[^a-zá-úñ ]', '', sigue.lower()).strip()
            arranque = ' '.join(arranque.split()[:3])
            if arranque:
                continuaciones[arranque] += 1

    print('')
    print('=' * 95)
    print('CONTINUACIONES MAS FRECUENTES EN LOS FALLOS')
    print('=' * 95)
    for texto_c, n in continuaciones.most_common(25):
        print('  %4d   %s' % (n, texto_c))
    print('')


if __name__ == '__main__':
    main()
