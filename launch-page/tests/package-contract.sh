#!/usr/bin/env bash
set -euo pipefail

archive="${1:?archive path is required}"

zipinfo -1 "$archive" | grep -qx 'manifest.json'
if zipinfo -1 "$archive" | grep -Eq '(^|/)(\.env|\.venv|backend|tests)(/|$)'; then
  echo 'archive contains an excluded development or secret path' >&2
  exit 1
fi
