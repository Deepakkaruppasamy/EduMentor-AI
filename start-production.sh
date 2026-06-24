#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting ChromaDB..."
# Create data folder if not exists
mkdir -p /data/chromadb

# Start ChromaDB in background and redirect output
python3 -m chromadb.cli.cli run --host 127.0.0.1 --port 8000 --path /data/chromadb > /tmp/chromadb.log 2>&1 &
CHROMA_PID=$!

# Wait for ChromaDB to be ready, or fail if process died
echo "Waiting for ChromaDB to start..."
for i in {1..30}; do
  if ! kill -0 $CHROMA_PID 2>/dev/null; then
    echo "❌ ChromaDB process died early! Logs:"
    cat /tmp/chromadb.log
    exit 1
  fi
  if curl -s http://127.0.0.1:8000/api/v1/heartbeat > /dev/null; then
    echo "ChromaDB is up!"
    break
  fi
  sleep 1
done

if ! curl -s http://127.0.0.1:8000/api/v1/heartbeat > /dev/null; then
  echo "❌ ChromaDB startup timed out! Logs:"
  cat /tmp/chromadb.log
  exit 1
fi

echo "Starting EduMentor Express backend..."
# Run the node app
node backend/dist/server.js
