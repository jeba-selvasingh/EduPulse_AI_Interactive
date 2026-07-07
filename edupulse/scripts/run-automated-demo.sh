#!/usr/bin/env bash
# Automated pilot demo: visible browser walkthrough (Playwright).
# Requires API on :3000 and Expo web on :8081.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E="$ROOT/e2e"
WEB_URL="${WEB_URL:-http://localhost:8081}"
API_URL="${API_URL:-http://localhost:3000}"
HEADLESS="${DEMO_HEADLESS:-0}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║           EduPulse AI — Automated Pilot Demo             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if ! curl -sf "$API_URL/api/health" >/dev/null; then
  echo "Starting demo stack (API + Expo web)..."
  echo "  Run in another terminal: ./scripts/start-demo.sh"
  echo "  Or start API only and ensure Metro is on $WEB_URL"
  exit 1
fi

if ! curl -sf "$WEB_URL" >/dev/null; then
  echo "Metro web not reachable at $WEB_URL"
  echo "  cd frontend && npm run web"
  exit 1
fi

echo "API:  $API_URL"
echo "Web:  $WEB_URL"
echo "Mode: $([ "$HEADLESS" = "1" ] && echo headless || echo headed browser, slow motion)"
echo ""
echo "Pilot logins (password: pilot123) · Institution: PES University"
echo "  faculty@pes.edu · principal@pes.edu · student@pes.edu · tpo@pes.edu"
echo ""

cd "$E2E"
if [ ! -d node_modules ]; then
  npm install
  npx playwright install chromium
fi

export WEB_URL
export DEMO_HEADLESS="$HEADLESS"
export DEMO_SLOW_MS="${DEMO_SLOW_MS:-500}"

echo "==> Running walkthrough..."
npx playwright test -c playwright.demo.config.ts

echo ""
echo "✓ Demo complete."
echo "  Video/trace: edupulse/e2e/test-results/"
echo "  Open web UI: $WEB_URL"
