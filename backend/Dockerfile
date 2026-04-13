# Loka backend — MiroFish Flask + camel-oasis pipeline
# Python 3.11 is the only version we test against; 3.13 has known
# compatibility issues with the camel-ai/tokenizers wheel chain.

FROM python:3.11-slim

# Build deps for PyMuPDF + tokenizers + a few other native wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so docker layer caching kicks in
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the rest of the backend + the project-root locales/ folder that
# backend/app/utils/locale.py loads at import time.
COPY backend/ /app/backend/
COPY locales/ /app/locales/

ENV PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    FLASK_HOST=0.0.0.0 \
    FLASK_PORT=5001

EXPOSE 5001

# uploads/ holds per-project state; mount it as a volume in compose so
# user data survives container restarts.
VOLUME ["/app/backend/uploads"]

CMD ["python", "/app/backend/run.py"]
