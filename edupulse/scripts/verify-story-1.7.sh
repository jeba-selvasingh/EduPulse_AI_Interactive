#!/usr/bin/env bash
# Story 1.7 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPTS_DIR/_verify_lib.sh"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
CORR="verify-story-1-7-$(date +%s)"

PASS=0
FAIL=0

ok()   { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

login() {
  curl -s -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-Id: $CORR-login" \
    -d "{\"email\":\"$1\",\"password\":\"pilot123\",\"institutionId\":\"$INST\"}"
}

token() {
  echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true
}

echo "=== Story 1.7 verification (API: $API) ==="

if [ -f "$ROOT/backend/api/src/observability/structured-logger.service.ts" ]; then
  ok "StructuredLoggerService present"
else
  fail "StructuredLoggerService missing"
fi

if [ -f "$ROOT/backend/api/src/observability/pii-scrubber.ts" ]; then
  ok "PII scrubber present"
else
  fail "PII scrubber missing"
fi

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

verify_accept_consent "$API" "$FT"
verify_prepare_bcs304_paper_craft "$API" "$FT"

# Correlation ID echoed on response
HDR=$(curl -s -D - -o /dev/null -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: $CORR-header" \
  -d "{\"email\":\"faculty@pes.edu\",\"password\":\"pilot123\",\"institutionId\":\"$INST\"}" | tr -d '\r')
if echo "$HDR" | rg -qi "x-correlation-id: $CORR-header"; then
  ok "X-Correlation-Id returned on response"
else
  fail "X-Correlation-Id header missing"
fi

# Trigger AI + marks partial-save logs
curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: $CORR-ai" \
  -d '{"courseCode":"BCS304"}' >/dev/null

curl -s -X PUT "$API/api/marks/assessments/BCS304/IA-2/grid" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: $CORR-marks" \
  -d '{"cells":[{"usn":"PES1UG23CS001","questionId":"Q1","marks":6}]}' >/dev/null

verify_accept_consent "$API" "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='auth.login' for e in d) else 1)" 2>/dev/null; then
  ok "auth.login structured log recorded"
else
  fail "auth.login log missing"
fi

if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='ai.paper_craft_generate' for e in d) else 1)" 2>/dev/null; then
  ok "ai.paper_craft_generate log recorded"
else
  fail "AI invocation log missing"
fi

if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='marks.partial_save' for e in d) else 1)" 2>/dev/null; then
  ok "marks.partial_save log recorded"
else
  fail "marks partial save log missing"
fi

if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); e=next(x for x in d if x.get('action')=='auth.login'); exit(0 if e.get('correlationId') and e.get('durationMs') is not None else 1)" 2>/dev/null; then
  ok "log entries include correlationId and durationMs"
else
  fail "log entry shape incomplete"
fi

# PII must not appear in log payloads
if echo "$LOGS" | rg -q 'faculty@pes.edu|Prof\. Rao|pilot123'; then
  fail "PII found in structured logs"
else
  ok "no email/name/password in log payloads"
fi

if echo "$LOGS" | rg -q '"marks":|"studentName":|"usn":'; then
  fail "student marks/identifiers found in logs"
else
  ok "no marks or student identifiers in logs"
fi

if (cd "$ROOT/backend/api" && npm run build >/dev/null 2>&1); then
  ok "backend builds"
else
  fail "backend build failed"
fi

echo ""
echo "Logs: GET /api/observability/logs/recent (principal/admin, dev mode)"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
