#!/usr/bin/env bash
# Story 1.11 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"

PASS=0
FAIL=0

ok()   { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

login() {
  curl -s -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"pilot123\",\"institutionId\":\"$INST\"}"
}

token() {
  echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true
}

accept_consent() {
  curl -s -X POST "$API/api/consent/accept" -H "Authorization: Bearer $1" >/dev/null
}

echo "=== Story 1.11 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/availability/availability.service.ts" \
  "$ROOT/backend/api/src/availability/availability.controller.ts" \
  "$ROOT/backend/api/src/availability/component-health.service.ts" \
  "$ROOT/frontend/src/lib/availability-api.ts" \
  "$ROOT/frontend/src/components/MaintenanceBanner.tsx" \
  "$ROOT/frontend/app/admin/operations.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

AT=$(token "$(login admin@pes.edu)")
FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$AT" ]; then ok "admin login"; else fail "admin login"; fi
if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

accept_consent "$AT"
accept_consent "$FT"
accept_consent "$PT"

# Seeded BCS304 exam window
WINDOWS=$(curl -s "$API/api/availability/exam-windows" -H "Authorization: Bearer $AT")
if echo "$WINDOWS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(w.get('courseCode')=='BCS304' for w in d) else 1)" 2>/dev/null; then
  ok "BCS304 exam window seeded"
else
  fail "BCS304 exam window missing"
fi

# Banner visible during exam window (all authenticated users)
BANNER=$(curl -s "$API/api/availability/banner" -H "Authorization: Bearer $FT")
if echo "$BANNER" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('visible') and d.get('kind') in ('exam','maintenance') else 1)" 2>/dev/null; then
  ok "in-app banner during exam window"
else
  fail "banner not visible"
fi

# Deep health checks six components
HEALTH=$(curl -s "$API/api/availability/health/deep" -H "Authorization: Bearer $AT")
if echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if len(d.get('components',[]))==6 else 1)" 2>/dev/null; then
  ok "deep health probes 6 components"
else
  fail "deep health component count"
fi

if echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('examWindowActive') else 1)" 2>/dev/null; then
  ok "exam window flagged active"
else
  fail "exam window not active"
fi

# SLO summary
SLO=$(curl -s "$API/api/availability/slo" -H "Authorization: Bearer $AT")
if echo "$SLO" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data'); exit(0 if d and d.get('sloTargetPct')==99.5 else 1)" 2>/dev/null; then
  ok "SLO target 99.5%"
else
  fail "SLO summary missing or wrong target"
fi

# Simulated failure creates incident with correlation ID
SIM=$(curl -s "$API/api/availability/health/deep?simulateFailure=redis" \
  -H "Authorization: Bearer $AT" \
  -H "X-Correlation-Id: verify-story-1-11-redis")
CORR=$(echo "$SIM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('checkedAt',''))" 2>/dev/null || true)

INCIDENTS=$(curl -s "$API/api/availability/incidents" -H "Authorization: Bearer $AT")
if echo "$INCIDENTS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(i.get('componentId')=='redis' and i.get('correlationId') for i in d) else 1)" 2>/dev/null; then
  ok "incident recorded with correlation ID"
else
  fail "incident not recorded"
fi

# Maintenance 48h notice enforcement
TOO_SOON=$(curl -s -w "\n%{http_code}" -X POST "$API/api/availability/maintenance" \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
from datetime import datetime, timedelta, timezone
start = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat().replace('+00:00','Z')
end = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat().replace('+00:00','Z')
import json
print(json.dumps({"title":"Hotfix","message":"Too soon","startsAt":start,"endsAt":end}))
PY
)")

HTTP_CODE=$(echo "$TOO_SOON" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  ok "maintenance rejected without 48h notice"
else
  fail "maintenance 48h rule not enforced (HTTP $HTTP_CODE)"
fi

# Valid maintenance schedule (+3 days)
VALID_START=$(python3 -c "from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)+timedelta(days=3)).isoformat().replace('+00:00','Z'))")
VALID_END=$(python3 -c "from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)+timedelta(days=3,hours=2)).isoformat().replace('+00:00','Z'))")

MAINT=$(curl -s -X POST "$API/api/availability/maintenance" \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Pilot patch\",\"message\":\"PostgreSQL upgrade\",\"startsAt\":\"$VALID_START\",\"endsAt\":\"$VALID_END\"}")

if echo "$MAINT" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('excludeFromSlo') is True else 1)" 2>/dev/null; then
  ok "maintenance scheduled with SLO exclusion"
else
  fail "maintenance schedule failed"
fi

BANNER_MAINT=$(curl -s "$API/api/availability/banner" -H "Authorization: Bearer $FT")
if echo "$BANNER_MAINT" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('kind')=='maintenance' else 1)" 2>/dev/null; then
  ok "maintenance banner visible after schedule"
else
  fail "maintenance banner missing"
fi

# Structured logs
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
for action in availability.probe availability.incident availability.maintenance_scheduled; do
  if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='$action' for e in d) else 1)" 2>/dev/null; then
    ok "log action $action"
  else
    fail "log action $action missing"
  fi
done

if (cd "$ROOT/backend/api" && npm run build >/dev/null 2>&1); then
  ok "backend builds"
else
  fail "backend build failed"
fi

if (cd "$ROOT/frontend" && npx tsc --noEmit >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
