#!/usr/bin/env bash
# IFB payout relay — run once on the small Google Cloud server (Debian 12), as root:
#   curl -fsSL https://raw.githubusercontent.com/sapiensunocha/infinite-future-bank/main/infra/payout-relay/install.sh | sudo bash
#
# What it sets up: Caddy (HTTPS with an automatic certificate) that forwards ONLY
#   GET/POST https://<this server>/v3/transfers[/...]  ->  https://api.flutterwave.com
# and only when the request carries the relay key. Everything else gets 404.
# No Flutterwave key is stored here; it passes through in the request and is not logged.
set -euo pipefail
[ "$(id -u)" = "0" ] || { echo "Run with sudo."; exit 1; }

IP="$(curl -fsS -H 'Metadata-Flavor: Google' 'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip')"
HOST="${RELAY_HOST:-$(echo "$IP" | tr . -).sslip.io}"   # e.g. 136-116-179-32.sslip.io (resolves to this server)

apt-get update -qq
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg openssl >/dev/null
curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq && apt-get install -y -qq caddy >/dev/null

ENV=/etc/caddy/relay.env
NEW_KEY=0
if [ ! -s "$ENV" ]; then
  umask 077
  echo "RELAY_KEY=$(openssl rand -hex 32)" > "$ENV"
  NEW_KEY=1
fi
chown root:caddy "$ENV"; chmod 640 "$ENV"
mkdir -p /etc/systemd/system/caddy.service.d
printf '[Service]\nEnvironmentFile=%s\n' "$ENV" > /etc/systemd/system/caddy.service.d/relay.conf

cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
	@transfers {
		header X-Relay-Key {\$RELAY_KEY}
		path /v3/transfers /v3/transfers/*
		method GET POST
	}
	handle @transfers {
		reverse_proxy https://api.flutterwave.com {
			header_up Host api.flutterwave.com
			header_up -X-Relay-Key
			header_up -X-Forwarded-For
			header_up -X-Forwarded-Host
			header_up -X-Forwarded-Proto
		}
	}
	handle {
		respond 404
	}
}
CADDY

systemctl daemon-reload
systemctl enable -q caddy
systemctl restart caddy

echo
echo "Relay installed."
echo "  Address to whitelist in Flutterwave:  $IP"
echo "  FLW_RELAY_URL:                        https://$HOST"
if [ "$NEW_KEY" = "1" ]; then
  echo "  FLW_RELAY_KEY (shown once, keep it secret):"
  cut -d= -f2 "$ENV"
else
  echo "  FLW_RELAY_KEY: unchanged (read it with: sudo cut -d= -f2 $ENV)"
fi
