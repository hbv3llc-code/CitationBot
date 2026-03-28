#!/usr/bin/env bash
# CitationBot quick-start script
# Run: bash scripts/start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "Error: .env file not found. Copy .env.example and fill in your values."
  exit 1
fi

echo "[start] Installing dependencies..."
npm install

echo "[start] Running database migrations..."
npx drizzle-kit migrate

echo "[start] Building Next.js app..."
npm run build

echo "[start] Starting worker in background..."
npx tsx scripts/run-worker.ts >> logs/worker.log 2>&1 &
echo "[start] Worker PID: $!"

echo "[start] Starting Next.js server..."
npm start
