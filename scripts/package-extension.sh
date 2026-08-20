#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT/extension"
OUTPUT_DIR="$ROOT/launch-page/downloads"
ARCHIVE="$OUTPUT_DIR/countryboy-extension.zip"

mkdir -p "$OUTPUT_DIR"
rm -f "$ARCHIVE"
(cd "$SOURCE_DIR" && zip -qr "$ARCHIVE" . -x 'node_modules/*' 'tests/*' '.DS_Store')
bash "$ROOT/launch-page/tests/package-contract.sh" "$ARCHIVE"
printf '%s\n' "$ARCHIVE"
