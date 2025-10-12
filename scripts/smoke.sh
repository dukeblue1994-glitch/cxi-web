#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:8888}"

echo "→ Smoke: POST /api/score"
curl -sS -X POST "$BASE/api/score" -H 'content-type: application/json' -d '{}' | sed -e 's/^/   /'

echo "→ Smoke: GET /api/ats-dlq-stats"
curl -sS "$BASE/api/ats-dlq-stats" | sed -e 's/^/   /'
