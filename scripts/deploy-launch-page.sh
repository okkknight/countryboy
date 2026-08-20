#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_PATH="/Users/linpeiwen/.ssh/tengxunyun.pem"
REMOTE="ubuntu@43.172.79.177"
REMOTE_STAGE="/tmp/countryboy-launch-page"
SSH=(ssh -i "$KEY_PATH" -o BatchMode=yes -o ConnectTimeout=12 "$REMOTE")

"$ROOT/scripts/package-extension.sh" >/dev/null
"${SSH[@]}" "rm -rf '$REMOTE_STAGE' && mkdir -p '$REMOTE_STAGE'"
rsync -a --delete -e "ssh -i $KEY_PATH -o BatchMode=yes -o ConnectTimeout=12" \
  "$ROOT/launch-page/" "$REMOTE:$REMOTE_STAGE/site/"
scp -i "$KEY_PATH" -o BatchMode=yes -o ConnectTimeout=12 \
  "$ROOT/deploy/countryboy-launch-page.caddy" "$REMOTE:$REMOTE_STAGE/countryboy-launch-page.caddy"

"${SSH[@]}" 'set -euo pipefail
stage="/tmp/countryboy-launch-page"
site="/opt/boringmax/countryboy/site"
caddy_file="/etc/caddy/Caddyfile"

sudo install -d -m 0755 -o shipnow -g shipnow "$site"
sudo install -m 0644 -o root -g root "$stage/countryboy-launch-page.caddy" /etc/caddy/countryboy-launch-page.caddy
if ! sudo grep -Fq 'import /etc/caddy/countryboy-launch-page.caddy' "$caddy_file"; then
  sudo cp -a "$caddy_file" /etc/caddy/Caddyfile.before-countryboy-launch-page
  sudo sed -i "/^boringmax.com {$/a\\\timport /etc/caddy/countryboy-launch-page.caddy" "$caddy_file"
fi
if ! sudo caddy validate --config "$caddy_file"; then
  sudo test -f /etc/caddy/Caddyfile.before-countryboy-launch-page && sudo cp -a /etc/caddy/Caddyfile.before-countryboy-launch-page "$caddy_file"
  exit 1
fi
sudo rsync -a --delete "$stage/site/" "$site/"
sudo chown -R shipnow:shipnow "$site"
sudo systemctl reload caddy
rm -rf "$stage"'

printf '%s\n' 'Deployed https://boringmax.com/countryboy/'
