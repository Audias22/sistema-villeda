FROM python:3.13-slim

# Instalar dependencias del sistema: Tesseract con soporte de español,
# Poppler (para pdf2image), y utilidades comunes que algunas librerías
# de Python necesitan al compilar. Todo en un solo layer para no dejar
# caché de apt residual dentro de la imagen.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-spa \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias de Python primero, aprovechando la caché de Docker:
# mientras requirements.txt no cambie, este layer se reutiliza en cada build.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código (respeta .dockerignore)
COPY . .

# Render inyecta la variable PORT; run.py ya la respeta con fallback a 5000.
# EXPOSE es informativo, no abre el puerto por sí solo.
EXPOSE 5000

CMD ["python", "run.py"]
