#!/usr/bin/env bash
set -euo pipefail

HTML="src/index.html"
TMP="${HTML}.tmp"

# Remove the inline .btn-ghost and .btn-ghost:hover rules from the <style> block
# This removes both .btn-ghost { } and .btn-ghost:hover { } blocks
sed -e '/^[[:space:]]*\.btn-ghost[[:space:]]*{/,/^[[:space:]]*}/d' \
    -e '/^[[:space:]]*\.btn-ghost:hover[[:space:]]*{/,/^[[:space:]]*}/d' \
    "$HTML" > "$TMP" && mv "$TMP" "$HTML"

echo "✅ Removed inline .btn-ghost CSS from $HTML"

# Run the guard to verify
bash scripts/check-inline-css.sh
