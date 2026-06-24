#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting ChromaDB..."
# Create data folder if not exists
mkdir -p /data/chromadb

# Start ChromaDB in background
python3 -m chromadb.cli.cli run --host 127.0.0.1 --port 8000 --path /data/chromadb &

# Wait for ChromaDB to be ready
echo "Waiting for ChromaDB to start..."
until curl -s http://127.0.0.1:8000/api/v1/heartbeat > /dev/null; do
  sleep 1
done
echo "ChromaDB is up!"

echo "Starting EduMentor Express backend..."
# Run the node app
node backend/dist/server.js
