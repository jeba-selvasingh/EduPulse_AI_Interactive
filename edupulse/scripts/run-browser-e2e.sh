#!/usr/bin/env bash
# Run Playwright browser E2E against Expo web (Metro) + API on port 3000.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E="$ROOT/e2e"
WEB_URL="${WEB_URL:-http://localhost:8081}"
API_URL="${API_URL:-http://localhost:3000}"

echo "==> Checking API at $API_URL"
curl -sf "$API_URL/api/health" >/dev/null || {
  echo "API not reachable. Start demo: ./scripts/start-demo.sh"
  exit 1
}

echo "==> Checking web at $WEB_URL"
curl -sf "$WEB_URL" >/dev/null || {
  echo "Metro web not reachable at $WEB_URL. Run: cd frontend && npm run web"
  exit 1
}

cd "$E2E"
if [ ! -d node_modules ]; then
  echo "==> Installing Playwright dependencies"
  npm install
  npx playwright install chromium
fi

export WEB_URL
echo "==> Running browser E2E (WEB_URL=$WEB_URL)"
npm test
