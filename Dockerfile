# ─── Stage 1: Build the React Frontend ──────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY Frontend/package*.json ./
RUN npm install
COPY Frontend/ .
RUN npm run build

# ─── Stage 2: Final Unified Image ───────────────────────────────────────
FROM node:20-slim

# Install Python and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Setup Python Environment
COPY ai_engine/requirements.txt ./ai_engine/
RUN pip3 install --no-cache-dir --break-system-packages -r ai_engine/requirements.txt

# 2. Setup Node Environment
COPY Backend/package*.json ./Backend/
RUN cd Backend && npm install --production

# 3. Copy Source Code
COPY ai_engine/ ./ai_engine/
COPY Backend/ ./Backend/
COPY --from=frontend-builder /frontend/dist ./Frontend/dist

# 4. Environment Variables
ENV NODE_ENV=production
ENV LIGHT_MODE=true
ENV AI_ENGINE_URL=http://127.0.0.1:5000
ENV PORT=8000

# Expose only the Backend port
EXPOSE 8000

# 5. Start Script
# We use a shell command to start both processes
# Python runs in the background (&), Node runs in the foreground
CMD python3 ai_engine/app.py & cd Backend && node server.js
