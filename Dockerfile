# Stage 1: Build the frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps
COPY backend/ ./
RUN npm run build

# Stage 3: Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install Python, pip, curl, and build-essential for ChromaDB
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install chromadb python package
RUN pip3 install --break-system-packages chromadb

# Copy backend dependencies and build
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --legacy-peer-deps

COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy uploads directory template and startup script
RUN mkdir -p backend/uploads
COPY start-production.js ./

# Expose ports: Node backend will use PORT env var (usually 10000 on Render)
ENV NODE_ENV=production
ENV CHROMA_URL=http://127.0.0.1:8000
ENV PORT=10000

CMD ["node", "start-production.js"]
