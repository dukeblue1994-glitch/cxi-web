#!/bin/bash
# Netlify Dev + Tests Script (modern)
# Uses curl-based readiness and relies on installed netlify-cli

set -euo pipefail

echo "🚀 Starting Netlify Dev + Tests workflow"

# Install deps
echo "📦 Installing dependencies..."
npm ci

# Build
echo "🔨 Building project..."
npm run build

# Start Netlify Dev in background
echo "🌐 Starting Netlify Dev server..."
NETLIFY_LOG=debug npx netlify dev --dir dist --functions netlify/functions --port 8888 --offline --no-open > netlify-dev.log 2>&1 &
echo $! > netlify_dev.pid

# Wait for server readiness (root + function)
echo "⏳ Waiting for server to be ready..."
deadline=$((SECONDS+180))
until curl -sf http://localhost:8888/ >/dev/null 2>&1; do
  if [ $SECONDS -gt $deadline ]; then
    echo "Timeout waiting for root"; head -n 120 netlify-dev.log || true; exit 1;
  fi
  sleep 2
  done

echo "Root is up. Waiting for function endpoint..."
deadline=$((SECONDS+180))
until curl -sf http://localhost:8888/.netlify/functions/score >/dev/null 2>&1; do
  if [ $SECONDS -gt $deadline ]; then
    echo "Timeout waiting for function endpoint"; head -n 200 netlify-dev.log || true; exit 1;
  fi
  sleep 2
  done

echo "✅ Server ready. Running tests..."
export BASE_URL=http://localhost:8888
node test/test-quality.js
node test/test-ats.js
node test/test-reliability.js

echo "✅ All tests passed!"

# Cleanup
if [ -f netlify_dev.pid ]; then
  kill -9 "$(cat netlify_dev.pid)" 2>/dev/null || true
  rm -f netlify_dev.pid
fi

echo "📋 Log tail (last 120 lines):"
tail -n 120 netlify-dev.log || true
head -n 200 netlify-dev.log || true
