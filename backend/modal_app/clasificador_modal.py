"""
Servicio de clasificación de expedientes notariales en Modal.

Recibe texto ya extraído por OCR y devuelve la clase predicha con su confianza.
El OCR se queda en Render a propósito: ya funciona, y mantenerlo ahí conserva la
medición de la variable TPO en un solo lugar.

Devuelve el NOMBRE de la clase, no el id_tipo del catálogo. Este servicio no
conoce los identificadores de Supabase y no tiene por qué: la traducción de
nombre a id_tipo vive en el backend, que es quien conoce su propia base.

Despliegue:
    python -m modal deploy backend/modal_app/clasificador_modal.py

Desde Windows hay que exportar antes PYTHONIOENCODING=utf-8:

    $env:PYTHONIOENCODING = "utf-8"     # PowerShell
    python -m modal deploy backend/modal_app/clasificador_modal.py

Sin eso el despliegue muere a mitad de la construccion de la imagen con
"'charmap' codec can't encode characters". No es un fallo del servicio ni de la
imagen: la consola de Windows viene en cp1252 y no puede imprimir los
caracteres Unicode que el CLI de Modal usa para las barras de progreso, asi que
el proceso revienta justo cuando mas progreso escribe (la descarga de torch,
766 MB). La variable fuerza la salida a UTF-8 y el problema desaparece.
Alternativa equivalente: pasar --no-progress al comando de deploy.
"""

import modal

MODELO_HF = 'Audias22/villeda-clasificador-notarial'

imagen = (
    modal.Image.debian_slim(python_version='3.12')
    .pip_install(
        'torch==2.6.0',
        'transformers==4.49.0',
        'huggingface_hub==0.28.1',
        'fastapi[standard]',
    )
)

app = modal.App('villeda-clasificador')

# El modelo se descarga una sola vez y queda en un volumen persistente. Sin
# esto cada arranque en frio bajaria 475 MB de Hugging Face.
volumen = modal.Volume.from_name('villeda-modelo', create_if_missing=True)
RUTA_CACHE = '/cache'


@app.cls(
    image=imagen,
    volumes={RUTA_CACHE: volumen},
    secrets=[modal.Secret.from_name('huggingface')],
    scaledown_window=300,
    timeout=120,
)
class Clasificador:

    @modal.enter()
    def cargar(self):
        """Corre una vez por contenedor, no en cada peticion."""
        import json
        import os
        import torch
        from huggingface_hub import snapshot_download
        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        ruta = snapshot_download(
            repo_id=MODELO_HF,
            cache_dir=RUTA_CACHE,
            token=os.environ['HF_TOKEN'],
        )

        with open(f'{ruta}/clases.json', encoding='utf-8') as fh:
            self.meta = json.load(fh)

        requeridas = ['clases', 'max_len', 'head_tokens',
                      'estrategia_truncamiento', 'umbral_confianza']
        faltantes = [k for k in requeridas if k not in self.meta]
        if faltantes:
            raise RuntimeError(f'clases.json incompleto, faltan: {faltantes}')

        self.tokenizer = AutoTokenizer.from_pretrained(ruta)
        self.modelo = AutoModelForSequenceClassification.from_pretrained(ruta)
        self.modelo.eval()
        self.torch = torch

        # Los tokens especiales se descubren comparando la tokenizacion con y
        # sin ellos, igual que en el notebook de entrenamiento. Asi el
        # truncamiento aca es identico al que vio el modelo al entrenar.
        sin = self.tokenizer('prueba', add_special_tokens=False)['input_ids']
        con = self.tokenizer('prueba', add_special_tokens=True)['input_ids']
        self.prefijo, self.sufijo = [], []
        for i in range(len(con) - len(sin) + 1):
            if con[i:i + len(sin)] == sin:
                self.prefijo, self.sufijo = con[:i], con[i + len(sin):]
                break

    def _preparar(self, texto):
        """Trunca igual que en el entrenamiento: 128 tokens del inicio y el
        resto del cierre. Si esto no coincide con lo que se entreno, el modelo
        ve una distribucion distinta y la prediccion se degrada en silencio."""
        max_len = self.meta['max_len']
        head = self.meta['head_tokens']
        estrategia = self.meta['estrategia_truncamiento']

        crudos = self.tokenizer(texto, add_special_tokens=False)['input_ids']
        max_contenido = max_len - len(self.prefijo) - len(self.sufijo)

        if len(crudos) > max_contenido:
            if estrategia == 'principio_final':
                tail = max_contenido - head
                crudos = crudos[:head] + crudos[-tail:]
            else:
                crudos = crudos[:max_contenido]

        ids = self.prefijo + crudos + self.sufijo
        mascara = [1] * len(ids)
        relleno = max_len - len(ids)
        ids += [self.tokenizer.pad_token_id] * relleno
        mascara += [0] * relleno

        return (
            self.torch.tensor([ids]),
            self.torch.tensor([mascara]),
        )

    @modal.fastapi_endpoint(method='POST', docs=True)
    def clasificar(self, cuerpo: dict):
        from fastapi.responses import JSONResponse

        texto = (cuerpo or {}).get('texto', '')

        # 400 y no 200: el backend tiene que poder distinguir un fallo por el
        # codigo de estado, sin inspeccionar el cuerpo de la respuesta.
        if not isinstance(texto, str) or not texto.strip():
            return JSONResponse(
                status_code=400,
                content={'error': 'El campo texto es obligatorio y no puede ir vacio'},
            )

        ids, mascara = self._preparar(texto)

        with self.torch.no_grad():
            salida = self.modelo(input_ids=ids, attention_mask=mascara)
            probs = self.torch.softmax(salida.logits, dim=1)[0]

        indice = int(probs.argmax())
        clases = self.meta['clases']

        return {
            'clase':        clases[indice],
            'confianza':    round(float(probs[indice]), 4),
            'modelo':       MODELO_HF,
            'estrategia':   self.meta['estrategia_truncamiento'],
            'umbral':       self.meta['umbral_confianza'],
            'todas': {
                clases[i]: round(float(probs[i]), 4)
                for i in range(len(clases))
            },
        }
