#!/bin/bash
# Netlify Dev + Tests Script
# Based on GitHub workflow from customer instructions

set -e

echo "🚀 Starting Netlify Dev + Tests workflow"

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building project..."
npm run build

# Install testing dependencies
echo "🧪 Installing test dependencies..."
npm install -D netlify-cli@17.34.2 wait-on

# Start Netlify Dev in background
echo "🌐 Starting Netlify Dev server..."
npx netlify dev --dir dist --functions netlify/functions --port 8888 --offline --no-open > netlify-dev.log 2>&1 &
echo $! > netlify_dev.pid

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
npx wait-on http://localhost:8888 --timeout 60000

# Set base URL for tests
export BASE_URL=http://localhost:8888

# Run tests
echo "🧪 Running tests..."
echo "  → Running quality tests..."
node test/test-quality.js

echo "  → Running ATS tests..."
node test/test-ats.js

echo "  → Running reliability tests..."
node test/test-reliability.js

echo "✅ All tests passed!"

# Cleanup
echo "🧹 Cleaning up..."
if [ -f netlify_dev.pid ]; then
    kill -9 $(cat netlify_dev.pid) 2>/dev/null || true
    rm netlify_dev.pid
fi

echo "📋 Test logs:"
echo "::group::Netlify Dev Log"
head -n 50 netlify-dev.log || true
echo "::endgroup::"

echo "🎉 Netlify deployment test completed successfully!"