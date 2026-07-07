#!/usr/bin/env bash
# Story 1.1 acceptance verification — run from repo root or edupulse/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
WARN=0

ok()   { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "⚠ $1"; WARN=$((WARN + 1)); }

echo "=== Story 1.1 verification ==="

# AD-10: independent folders, no shared packages
if [ -d frontend ] && [ -d backend/api ] && [ -d backend/worker ]; then
  ok "frontend/ and backend/ scaffold present"
else
  fail "missing frontend/ or backend/ folders"
fi

if rg -q '@edupulse|packages/shared' frontend backend 2>/dev/null; then
  fail "shared package imports found (AD-10 violation)"
else
  ok "no shared package imports (AD-10)"
fi

# TLS certs
if [ -f backend/docker/nginx/certs/cert.pem ] && [ -f backend/docker/nginx/certs/key.pem ]; then
  ok "TLS certs generated (backend/docker/nginx/certs/)"
else
  fail "TLS certs missing — run: ./backend/docker/nginx/generate-certs.sh"
fi

# backup-cron in compose
if rg -q 'backup-cron:' backend/docker/compose.yml; then
  ok "backup-cron service in compose.yml (NFR-8)"
else
  fail "backup-cron not in compose.yml"
fi

# API build + typecheck
if (cd backend/api && npm run build >/dev/null 2>&1); then
  ok "backend/api builds"
else
  fail "backend/api build failed"
fi

if (cd frontend && npm run typecheck >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

# HTTP health (local API or docker)
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
if curl -sf "$HEALTH_URL" | rg -q '"status":"ok"'; then
  ok "API health responds at $HEALTH_URL"
else
  warn "API health not reachable at $HEALTH_URL (start api or docker compose)"
fi

# TLS health via nginx (requires docker compose)
TLS_URL="${TLS_URL:-https://localhost:3443/api/health}"
if curl -skf "$TLS_URL" 2>/dev/null | rg -q '"status":"ok"'; then
  ok "API health over TLS at $TLS_URL (NFR-4)"
else
  warn "TLS health not verified — run: cd backend/docker && docker compose up -d && curl -k $TLS_URL"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
