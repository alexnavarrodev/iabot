#!/usr/bin/env bash
# One-shot deploy for the GRVT Grid bot on a fresh Hostinger (Ubuntu) VPS.
#
# Run as root (or with sudo):
#   bash deploy-hostinger.sh
#
# It installs Docker, generates the AES master key, ensures a .env exists,
# builds the images and starts the bot. It is safe to re-run (idempotent).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/grvt-grid}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> 1/5  Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> 2/5  Placing code in ${APP_DIR}"
mkdir -p "${APP_DIR}"
# If we're already running from inside the target dir, skip the copy.
if [ "${REPO_DIR}" != "${APP_DIR}" ]; then
  cp -a "${REPO_DIR}/." "${APP_DIR}/"
fi
cd "${APP_DIR}"

echo "==> 3/5  Generating AES master key (if missing)"
mkdir -p /etc/grvt-grid
if [ ! -f /etc/grvt-grid/master.key ]; then
  head -c 32 /dev/urandom > /etc/grvt-grid/master.key
  chmod 600 /etc/grvt-grid/master.key
  echo "    created /etc/grvt-grid/master.key"
else
  echo "    already exists, keeping it"
fi

echo "==> 4/5  Preparing .env"
if [ ! -f .env ]; then
  cp .env.example .env
  # Auto-fill the secrets that don't need a human.
  sed -i "s|^DASHBOARD_API_KEY=.*|DASHBOARD_API_KEY=$(openssl rand -hex 32)|" .env
  sed -i "s|^DASHBOARD_PASS=.*|DASHBOARD_PASS=$(openssl rand -hex 12)|" .env
  echo ""
  echo "  !! .env created from template. EDIT IT NOW and fill your GRVT testnet keys:"
  echo "        nano ${APP_DIR}/.env"
  echo "     Required: GRVT_ENV=testnet, GRVT_API_KEY, GRVT_API_SECRET,"
  echo "               GRVT_TRADING_ACCOUNT_ID, GRVT_TRADING_ADDRESS"
  echo "     Then re-run this script to start the bot."
  exit 0
fi

echo "==> 5/5  Building and starting (bot only, no TLS yet)"
docker compose --profile no-tls up -d --build bot

echo ""
echo "Done. Health check:"
echo "   curl -fs http://127.0.0.1:3848/api/health"
echo "Dashboard (via SSH tunnel or once you add Caddy/HTTPS):"
echo "   http://<vps-ip>:3848/dashboard/"
