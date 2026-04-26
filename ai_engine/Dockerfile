# ─── AI Engine (Flask) ────────────────────────────────────────────────────────
FROM python:3.12-slim-bullseye

WORKDIR /app

# System dependencies required by PyTorch / spaCy / faiss
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install scispacy and the model with --no-deps to avoid spacy downgrade
# Then patch the config file to fix Pydantic boolean validation
RUN pip install scispacy --no-deps && \
    pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_sm-0.5.4.tar.gz --no-deps && \
    python -c "import os; import en_core_sci_sm; \
    path = os.path.join(en_core_sci_sm.__path__[0], 'en_core_sci_sm-0.5.4', 'config.cfg'); \
    content = open(path).read(); \
    content = content.replace('include_static_vectors = \"False\"', 'include_static_vectors = False'); \
    content = content.replace('include_static_vectors = \"True\"', 'include_static_vectors = True'); \
    open(path, 'w').write(content); print('Fixed config.cfg')"

# Copy application source
COPY . .

EXPOSE 5000

ENV FLASK_ENV=production

CMD ["python", "app.py"]
