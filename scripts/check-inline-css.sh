#!/usr/bin/env bash
set -euo pipefail

HTML="src/index.html"

# Fail if inline CSS reintroduces .btn-ghost rules
if grep -nE '^[[:space:]]*\.btn-ghost(\b|:hover\b)' "$HTML" >/dev/null 2>&1; then
  echo "❌ Guard: inline .btn-ghost CSS found in $HTML. Move styles to styles.css."
  exit 1
fi

# Ensure external stylesheet is linked
if ! grep -q 'rel="stylesheet".*styles\.css' "$HTML"; then
  echo '❌ Guard: <link rel="stylesheet"> tag is missing in src/index.html.'
  exit 1
fi

echo "✅ Guard passed: no inline .btn-ghost; external CSS link present."
