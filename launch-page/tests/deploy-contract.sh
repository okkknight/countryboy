#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

grep -Fqx 'redir /countryboy /countryboy/ 308' "$ROOT/deploy/countryboy-launch-page.caddy"
grep -Fqx 'root * /opt/boringmax/countryboy/site' "$ROOT/deploy/countryboy-launch-page.caddy"
grep -Fqx 'file_server' "$ROOT/deploy/countryboy-launch-page.caddy"
grep -Fqx 'https://boringmax.com/countryboy/' "$ROOT/README.md"
