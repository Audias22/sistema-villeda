# -*- coding: utf-8 -*-
"""
Extraccion del nombre del otorgante desde el texto que devuelve el OCR.

En las escrituras del protocolo el nombre del otorgante va siempre en
mayusculas y casi siempre lo sigue una formula fija: la edad, el estado
civil o la frase de identificacion. Ese rastro es mas constante que la
palabra "comparece", que el OCR deforma con frecuencia y que ademas
aparece varias veces dentro del mismo instrumento.

Por eso se buscan nombres en mayusculas y se aceptan solo los que vienen
seguidos de una de esas formulas. Despues se descartan el notario y las
mayusculas que no son nombres de persona.

Este modulo solo extrae y propone. No escribe nada en la base.
"""

import re
import unicodedata

NOTARIO = 'OTTO RONALDO VILLEDA PORTILLO'

LETRAS = 'A-ZÁÉÍÓÚÑÜ'

# Lo que debe venir despues del nombre para considerarlo un otorgante.
NUMERALES = (r'un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|'
             r'trece|catorce|quince|diecis|diecio|diecinu|veinte|veinti|treinta|'
             r'cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien')

# Lo que puede venir despues del nombre para considerarlo un otorgante.
#
# La formula completa es "de cincuenta anos de edad", pero el OCR se come
# "anos de edad" con mucha frecuencia, asi que basta con "de" seguido de un
# numeral escrito en letras. Lo mismo pasa con la anotacion notarial de unico
# nombre, que sale deformada como ONICO, UNICI o UNICO APELLIDO.
# Basura que el OCR mete entre las palabras de la formula: numeros de linea
# del papel sellado, barras verticales del margen y comas sueltas.
B = r'[\s,.;:|]*(?:\d{1,3}|[a-zA-Z])?[\s,.;:|]*'

CONFIRMACION = re.compile(
    r'^' + B + r'(?:'
    r'de' + B + r'(?:' + NUMERALES + r')'
    r'|de' + B + r'\d{1,3}' + B + r'a[ñn]os'
    r'|mayor' + B + r'de' + B + r'edad'
    r'|\(?' + B + r'[ÚUÓO]NIC[OIA]S?' + B + r'(?:NOMBRE|APELLIDO|NUMBRE)'
    r'|bajo' + B + r'juramento'
    r'|advertid[oa]' + B + r'de' + B + r'las' + B + r'penas'
    r'|qui[eé]n?' + B + r'se' + B + r'identifica'
    r'|se' + B + r'identifica'
    r'|de' + B + r'nacionalidad'
    r'|de' + B + r'este' + B + r'(?:domicilio|municipio)'
    r'|a' + B + r'qui[eé]n' + B + r'en' + B + r'el'
    r'|que' + B + r'carece'
    r'|quien' + B + r'por' + B + r'ignorar'
    # El verbo del acto va en mayusculas justo despues del otorgante.
    r'|que' + B + r'(?:DESMEMBRA|VENDE|DONA|COMPRA|OTORGA|CEDE|PERMUTA)'
    r'|que' + B + r'por' + B + r'medio' + B + r'del' + B + r'presente'
    r'|que' + B + r'por' + B + r'el' + B + r'precio'
    r')',
    re.IGNORECASE
)

# Mayusculas que aparecen en estos documentos y no son personas.
RUIDO = (
    'REGISTRO', 'NACIONAL', 'PERSONAS', 'RENAP', 'GUATEMALA', 'ZACAPA',
    'PROGRESO', 'NOTARIO', 'NOTARIA', 'CONTRATO', 'COMPRAVENTA', 'DERECHOS',
    'POSESION', 'INMUEBLE', 'MANDATO', 'ESPECIAL', 'REPRESENTACION',
    'DECLARACION', 'JURADA', 'DONACION', 'MATRIMONIO', 'ESCRITURA',
    'PUBLICA', 'INSTRUMENTO', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA',
    'QUINTA', 'SEXTA', 'DOY', 'FE', 'YO', 'ANTE', 'MI', 'TALLER',
    'GRABADOS', 'ACERO', 'QUINQUENIO', 'MANDANTE', 'MANDATARIA',
    'MANDATARIO', 'VENDEDOR', 'VENDEDORA', 'COMPRADOR', 'COMPRADORA',
    'DONANTE', 'DONATARIO', 'DONATARIA', 'QUETZALES', 'EXACTOS',
    'PROPIEDAD', 'GENERAL', 'MUNICIPIO', 'DEPARTAMENTO', 'ALDEA',
    'BARRIO', 'SECTOR', 'ESCUELA', 'LOMAS', 'DOCUMENTO', 'PERSONAL',
    'IDENTIFICACION', 'CODIGO', 'UNICO', 'UNICI', 'ONICO', 'NUMERO',
    'CUI', 'DPI', 'JURAMENTO', 'PENAS', 'PERJURIO', 'DELITO', 'LEY',
    'ADVERTIDA', 'ADVERTIDO', 'RELATIVAS', 'DESMEMBRA', 'FRACCION',
    'FINCA', 'RUSTICA', 'URBANA', 'NATURALEZA', 'METROS', 'CUADRADOS',
    'PUNTO', 'MEDIDAS', 'COLINDANCIAS', 'LOTIFICACION', 'VILLAS',
    'APELLIDO', 'NOMBRE', 'SENOR', 'SENORA', 'PARTE', 'ACTA', 'NUEVA',
    'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO',
    'NUEVE', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
    'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA', 'CIEN', 'CIENTO',
    'CIENTOS', 'DOSCIENTOS', 'TRESCIENTOS', 'MIL', 'ESPACIO',
)

ANOT = r'\(\s*[ÚUÓO]NIC[OIA]S?\s+(?:NOMBRE|APELLIDO|NUMBRE|APEL\.?[LI]?[LI]?[DO]*)\s*\)'

ANOTACIONES = re.compile(ANOT + r'|\(\s*\)', re.IGNORECASE)

# Una secuencia de 2 a 6 palabras en mayusculas, admitiendo la anotacion
# notarial entre parentesis.
# Una secuencia de 2 a 6 palabras en mayusculas. Entre palabra y palabra se
# admite un numero suelto, porque el papel sellado lleva el numero de linea
# impreso al margen y el OCR lo inserta a mitad del nombre:
# "ROMEO AGUSTO GARCIA 28 GUZMAN".
PALABRA = r'[' + LETRAS + r']{2,}\.?'
SEPARADOR = r'(?:[\s|]*\d{1,3})?[\s|]*(?:' + ANOT + r')?[\s|]+'

# La Y enlaza apellidos compuestos muy comunes en la zona: GOMEZ Y GOMEZ,
# MIRANDA Y MIRANDA, HERNANDEZ Y HERNANDEZ. Sin esto el nombre se parte ahi
# y el patron termina quedandose con el apellido de otro compareciente.
ENLACE = r'(?:Y' + SEPARADOR + r')?'

CANDIDATO = re.compile(
    PALABRA + r'(?:' + SEPARADOR + ENLACE + PALABRA + r'){1,6}'
)

# Numeros de linea que quedaron dentro del nombre.
NUMERO_SUELTO = re.compile(r'\b\d{1,3}\b')


def _sin_tildes(t):
    return ''.join(c for c in unicodedata.normalize('NFD', t)
                   if unicodedata.category(c) != 'Mn')



# Palabras impresas en el papel sellado y en el membrete. El OCR las parte y
# deja fragmentos como EGISTRO, GISTRO o RUGIETRC pegados al inicio del
# nombre, asi que se recortan por semejanza y no por coincidencia exacta.
MARCA_AGUA = ('REGISTRO', 'QUINQUENIO', 'TALLER', 'NACIONAL', 'GRABADOS',
              'GUATEMALA', 'NUMERO', 'NOTARIO')

# Palabras cortas del membrete que se parecen demasiado a nombres reales
# (ACERO contra MATEO, PEDRO o CARLOS), asi que solo valen exactas.
MARCA_AGUA_EXACTA = ('ACERO', 'ACTA', 'FE', 'YO')


def _es_marca_agua(palabra):
    import difflib
    p = _sin_tildes(palabra).upper()

    # Ningun nombre de pila guatemalteco empieza con una palabra de dos
    # letras, asi que al inicio eso siempre es resto del membrete.
    if len(p) <= 2:
        return True

    if p in MARCA_AGUA_EXACTA:
        return True

    # El corte es alto a proposito. RUGIETRC (resto de REGISTRO) y VENANCIO
    # (nombre real) se parecen a una marca en 0.625 por igual, asi que una
    # semejanza intermedia no puede distinguirlos. Ante la duda se conserva
    # la palabra: un prefijo basura salta a la vista al revisar la hoja, un
    # nombre de pila que falta no.
    for marca in MARCA_AGUA:
        if difflib.SequenceMatcher(None, p, marca).ratio() >= 0.80:
            return True
        # Fragmento contenido en la marca: GISTRO dentro de REGISTRO.
        if len(p) >= 4 and p in marca:
            return True

    return False


def _recortar_marcas(partes):
    """Quita del inicio los restos del membrete, nunca del medio del nombre."""
    while len(partes) > 2 and _es_marca_agua(partes[0]):
        partes = partes[1:]

    return partes


def limpiar(nombre):
    nombre = ANOTACIONES.sub(' ', nombre)
    nombre = NUMERO_SUELTO.sub(' ', nombre)
    nombre = re.sub(r'[^' + LETRAS + r'\s]', ' ', nombre)
    nombre = re.sub(r'\s+', ' ', nombre).strip()

    bruto = nombre.split()
    partes = []
    for i, p in enumerate(bruto):
        if len(p) > 1:
            partes.append(p)
        elif p == 'Y' and 0 < i < len(bruto) - 1:
            # Apellido compuesto del tipo "MIRANDA Y MIRANDA".
            partes.append(p)

    # Particulas colgando al final, que el OCR corta a mitad del apellido
    # de casada ("LOPEZ MATEO DE").
    while partes and partes[-1] in ('DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y'):
        partes.pop()

    return ' '.join(_recortar_marcas(partes))


def _es_ruido(nombre):
    palabras = set(_sin_tildes(nombre).upper().split())

    # Si alguna palabra es vocabulario del documento, no es un nombre.
    return bool(palabras & set(RUIDO))


def es_notario(nombre):
    return _sin_tildes(nombre).upper() == _sin_tildes(NOTARIO).upper()


def extraer(texto, maximo=5):
    """Nombres de otorgantes, en orden de aparicion, sin repetir."""
    if not texto:
        return []

    plano = re.sub(r'\s+', ' ', texto)

    nombres = []
    for m in CANDIDATO.finditer(plano):
        if not CONFIRMACION.match(plano[m.end():m.end() + 60]):
            continue

        nombre = limpiar(m.group(0))

        if len(nombre.split()) < 2:
            continue
        if _es_ruido(nombre) or es_notario(nombre):
            continue
        if nombre in nombres:
            continue

        nombres.append(nombre)
        if len(nombres) >= maximo * 3:
            break

    return _preferir_completos(nombres)[:maximo]


def _preferir_completos(nombres):
    """
    Un mismo otorgante aparece varias veces en la escritura y no siempre
    completo: primero "JERSON SARAEL GARCIA REYES" y mas adelante solo
    "GARCIA REYES". Cuando un nombre esta contenido en otro como secuencia
    de palabras, el recorte se sustituye por la version larga sin perder su
    posicion, de modo que el primer otorgante del documento sigue siendo el
    primero de la lista.
    """
    # Se comparan sin tildes: el OCR escribe RIOS en un lugar y RÍOS en otro,
    # y sin esto la version larga no reconoce a su propio recorte.
    palabras = [_sin_tildes(n).upper().split() for n in nombres]

    def contenido(corto, largo):
        if len(corto) >= len(largo):
            return False
        return any(largo[k:k + len(corto)] == corto
                   for k in range(len(largo) - len(corto) + 1))

    resueltos = []
    for i, actual in enumerate(palabras):
        mejor = nombres[i]
        mejor_largo = len(actual)

        for j, otro in enumerate(palabras):
            if i != j and contenido(actual, otro) and len(otro) > mejor_largo:
                mejor, mejor_largo = nombres[j], len(otro)

        resueltos.append(mejor)

    salida = []
    for n in resueltos:
        if n not in salida:
            salida.append(n)

    return salida


# ---------------------------------------------------------------------------
# Correccion palabra por palabra contra el vocabulario del propio corpus
#
# El mismo apellido aparece decenas de veces entre los 390 expedientes y el
# OCR lo lee bien casi siempre. Las lecturas defectuosas quedan como palabras
# raras: GUMEZ frente a GOMEZ, LENUS frente a LEMUS, EHDCDOJ frente a CHOCOOJ.
# Comparando cada palabra contra las que mas se repiten se recupera la forma
# correcta sin tocar los nombres legitimamente poco frecuentes.
# ---------------------------------------------------------------------------

def vocabulario(nombres):
    """Frecuencia de cada palabra de nombre en todo el corpus."""
    from collections import Counter
    cuenta = Counter()
    for n in nombres:
        for palabra in n.split():
            cuenta[palabra] += 1

    return cuenta


def corregir_palabras(nombre, cuenta, min_frecuencia=4, umbral=0.80):
    """
    Devuelve (nombre_corregido, sugerencias).

    Solo se aplican sin preguntar las diferencias de tilde: MARIA contra
    MARÍA, PEREZ contra PÉREZ. Son las mismas letras y unificarlas con la
    forma dominante del corpus no puede inventar otra persona.

    Todo cambio de letras se deja como sugerencia para revision humana. La
    razon es que el parecido no distingue un error de lectura de un nombre
    legitimamente parecido: GUEL contra MIGUEL es una correccion, pero JUANA
    contra JUAN o SANDRA contra SARA serian otra persona, y un dato plausible
    pero falso es peor que un error evidente.
    """
    import difflib

    frecuentes = [p for p, n in cuenta.items() if n >= min_frecuencia]
    salida, sugerencias = [], []

    for palabra in nombre.split():
        if cuenta.get(palabra, 0) >= min_frecuencia or len(palabra) < 4:
            salida.append(palabra)
            continue

        mejor, puntaje = None, 0.0
        for candidata in frecuentes:
            if abs(len(candidata) - len(palabra)) > 2:
                continue
            r = difflib.SequenceMatcher(
                None, _sin_tildes(palabra).upper(), _sin_tildes(candidata).upper()
            ).ratio()
            if r > puntaje:
                mejor, puntaje = candidata, r

        if not mejor or puntaje < umbral:
            salida.append(palabra)
            continue

        if _sin_tildes(palabra).upper() == _sin_tildes(mejor).upper():
            # Misma palabra, distinta acentuacion: se unifica sin preguntar.
            salida.append(mejor)
        else:
            salida.append(palabra)
            sugerencias.append('%s -> %s' % (palabra, mejor))

    return ' '.join(salida), sugerencias


def tiene_unico_nombre(texto, nombre):
    """
    Indica si la escritura marcaba (UNICO NOMBRE) junto a ese otorgante.

    Es una anotacion del notario que avisa que la persona tiene un solo
    nombre de pila, y sirve para repartir bien nombres y apellidos.
    """
    if not texto or not nombre:
        return False

    return _tiene_anotacion(texto, nombre, 'NOMBRE')


def tiene_unico_apellido(texto, nombre):
    """Indica si la escritura marcaba (UNICO APELLIDO) junto a ese otorgante."""
    return _tiene_anotacion(texto, nombre, 'APELLIDO')


def _tiene_anotacion(texto, nombre, clase):
    """
    Busca la anotacion notarial en cualquier parte del nombre, no solo tras
    la primera palabra: el notario escribe (UNICO NOMBRE) despues del nombre
    de pila y (UNICO APELLIDO) despues del apellido.
    """
    if not texto or not nombre:
        return False

    plano = re.sub(r'\s+', ' ', _sin_tildes(texto).upper())
    patron = r'\(\s*[UO]NIC[OIA]S?\s+' + clase + r'\s*\)'

    for palabra in _sin_tildes(nombre).upper().split():
        if re.search(re.escape(palabra) + r'[\s|\d]*' + patron, plano):
            return True

    return False


def partir(nombre, unico_nombre=False, unico_apellido=False):
    """
    Reparte el nombre completo en los cuatro campos de la tabla clientes.

    Lo habitual en Guatemala son dos nombres y dos apellidos. Con tres
    palabras se asume un nombre y dos apellidos, que es ademas lo que
    confirma la anotacion notarial (UNICO NOMBRE) cuando aparece.
    """
    p = nombre.split()

    if unico_apellido and len(p) >= 2:
        # Un solo apellido: todo lo anterior son nombres de pila.
        return {'primer_nombre': p[0],
                'segundo_nombre': ' '.join(p[1:-1]),
                'primer_apellido': p[-1],
                'segundo_apellido': ''}

    if unico_nombre or len(p) == 3:
        return {'primer_nombre': p[0] if p else '',
                'segundo_nombre': '',
                'primer_apellido': p[1] if len(p) > 1 else '',
                'segundo_apellido': ' '.join(p[2:]) if len(p) > 2 else ''}

    if len(p) == 2:
        return {'primer_nombre': p[0], 'segundo_nombre': '',
                'primer_apellido': p[1], 'segundo_apellido': ''}

    return {'primer_nombre': p[0] if p else '',
            'segundo_nombre': p[1] if len(p) > 1 else '',
            'primer_apellido': p[2] if len(p) > 2 else '',
            'segundo_apellido': ' '.join(p[3:]) if len(p) > 3 else ''}


def clave_comparacion(nombre):
    """Version sin tildes y sin espacios, para comparar sin ruido."""
    return _sin_tildes(nombre).upper().replace(' ', '')


def sugerir_correcciones(nombres, umbral=0.88):
    """
    Compara los nombres completos entre si y devuelve
    {nombre_detectado: nombre_mas_probable} para los que parecen una lectura
    defectuosa de otro mas frecuente. Solo corrige hacia el mas repetido.
    """
    import difflib
    from collections import Counter

    frecuencia = Counter(nombres)
    unicos = list(frecuencia)
    claves = {n: clave_comparacion(n) for n in unicos}

    correcciones = {}
    for nombre in unicos:
        mejor, mejor_puntaje = None, 0.0

        for otro in unicos:
            if otro == nombre or frecuencia[otro] <= frecuencia[nombre]:
                continue

            puntaje = difflib.SequenceMatcher(
                None, claves[nombre], claves[otro]
            ).ratio()

            if puntaje > mejor_puntaje:
                mejor, mejor_puntaje = otro, puntaje

        if mejor and mejor_puntaje >= umbral:
            correcciones[nombre] = mejor

    return correcciones


# ---------------------------------------------------------------------------
# Correcciones revisadas una por una contra el documento
#
# Son errores de lectura del OCR confirmados: la palabra no existe como
# nombre y la forma correcta aparece bien escrita en otros expedientes del
# mismo corpus. Se aplican solas porque ya pasaron revision humana.
#
# Deliberadamente NO estan aqui los parecidos que cambiarian de persona
# (SARAEL con SARA, JUANA con JUAN, MARTA con MARIA, ORLANDO con ROLANDO).
# Un dato plausible pero falso es peor que un error evidente.
#
# La cadena vacia significa que la palabra es basura del membrete y se quita.
# ---------------------------------------------------------------------------

CORRECCIONES_APROBADAS = {
    'NAJBRA':    'NAJERA',
    'GUEL':      'MIGUEL',
    'GÚMEZ':     'GÓMEZ',
    'GÁMEZ':     'GÓMEZ',
    'LENUS':     'LEMUS',
    'LLEMUS':    'LEMUS',
    'JESÓS':     'JESÚS',
    'MOSCOSU':   'MOSCOSO',
    'IZALES':    'ISALES',
    'DLIVA':     'OLIVA',
    'MATED':     'MATEO',
    'PRNANDEZ':  'HERNÁNDEZ',
    'NERNÁNDEZ': 'HERNÁNDEZ',
    'ARAS':      'ARIAS',
    'VASOUEZ':   'VASQUEZ',
    'VENANSIO':  'VENANCIO',
    'ARCÍA':     'GARCIA',
    'BARCÍA':    'GARCIA',
    'ONDFRE':    'ONOFRE',
    'DARLOS':    'CARLOS',
    'DRTIZ':     'ORTIZ',
    'FASTRO':    'CASTRO',
    'MORTENCIA': 'HORTENCIA',
    'NORTENCIA': 'HORTENCIA',
    'ENRIOUJE':  'ENRIQUE',
    'ANTCNIC':   'ANTONIO',
    'EHDCDOJ':   'CHOCOOJ',
    'DLIBERTO':  'OLIBERTO',
    'ZDILA':     'ZOILA',
    'MIRARDA':   'MIRANDA',
    'GERCÍA':    'GARCÍA',
    'BÚMEZ':     'GÓMEZ',
    'GÚMEZ':     'GÓMEZ',
    'HERNÁPDEZ': 'HERNÁNDEZ',
    'PERSIÁRDEZ':'HERNÁNDEZ',
    # Restos del membrete del papel sellado.
    'RUGIETRC':  '',
    'IGICTRO':   '',
    'PESISTRO':  '',
    'YH':        '',
}


def aplicar_aprobadas(nombre):
    """Aplica las correcciones ya revisadas y quita la basura del membrete."""
    salida = []
    for palabra in nombre.split():
        reemplazo = CORRECCIONES_APROBADAS.get(palabra, palabra)
        if reemplazo:
            salida.append(reemplazo)

    return ' '.join(salida)
