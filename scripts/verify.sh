#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
if [[ "$PYTHON_BIN" == */* && "$PYTHON_BIN" != /* ]]; then
  PYTHON_BIN="$ROOT/$PYTHON_BIN"
fi

echo '[1/6] Extension unit tests'
npm --prefix "$ROOT/extension" test

echo '[2/6] JavaScript syntax + manifest validation'
node --check "$ROOT/extension/src/request-state.js"
node --check "$ROOT/extension/src/server-api.js"
node --check "$ROOT/extension/src/background.js"
node --check "$ROOT/extension/src/popup.js"
"$PYTHON_BIN" -m json.tool "$ROOT/extension/manifest.json" >/dev/null

echo '[3/6] Backend tests'
(
  cd "$ROOT/backend"
  PYTHONPATH=. "$PYTHON_BIN" -m pytest -q
)

echo '[4/6] Python compile check'
"$PYTHON_BIN" -m compileall -q "$ROOT/backend/app"

echo '[5/6] Launch-page contract tests'
npm --prefix "$ROOT/launch-page" test

echo '[6/6] Extension download package'
"$ROOT/scripts/package-extension.sh" >/dev/null

echo 'All checks passed.'
