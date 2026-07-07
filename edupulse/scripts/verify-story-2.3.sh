#!/usr/bin/env bash
# Story 2.3 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
VERIFY_COURSE="${VERIFY_COURSE:-BCS399}"
VERIFY_TERM="${VERIFY_TERM:-Odd Sem 2026}"

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

upload_sample() {
  local tok="$1"
  local sample b64 name
  sample=$(curl -s "$API/api/syllabus/sample/pdf" -H "Authorization: Bearer $tok")
  b64=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['base64'])" 2>/dev/null)
  name=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileName'])" 2>/dev/null)
  curl -s -X POST "$API/api/syllabus/courses/$VERIFY_COURSE/upload" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({"fileName": "$name", "base64": """$b64""", "academicTerm": "$VERIFY_TERM"}))
PY
)"
}

echo "=== Story 2.3 verification (API: $API) ==="

FT=$(token "$(login faculty@pes.edu)")
AT=$(token "$(login admin@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

accept_consent "$FT"
accept_consent "$AT"
accept_consent "$PT"

# v1 auto-activates
V1=$(upload_sample "$FT")
V1_ID=$(echo "$V1" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['record']['id'])" 2>/dev/null || true)

if echo "$V1" | python3 -c "import sys,json; r=json.load(sys.stdin)['data']['record']; exit(0 if r.get('status')=='active' and r.get('version')==1 else 1)" 2>/dev/null; then
  ok "first upload auto-activates as v1"
else
  fail "first upload not active"
fi

curl -s -X PUT "$API/api/syllabus/courses/$VERIFY_COURSE/modules" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"modules":[{"moduleNumber":1,"title":"Unit 1","pageStart":1,"pageEnd":20},{"moduleNumber":2,"title":"Unit 2","pageStart":21,"pageEnd":40}]}' >/dev/null

# v2 pending
V2=$(upload_sample "$AT")
V2_ID=$(echo "$V2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['record']['id'])" 2>/dev/null || true)

if echo "$V2" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d.get('requiresActivation') and d['record'].get('status')=='pending' else 1)" 2>/dev/null; then
  ok "second upload is pending v2"
else
  fail "second upload not pending"
fi

# activate v2 supersedes v1
ACT=$(curl -s -X POST "$API/api/syllabus/courses/$VERIFY_COURSE/versions/$V2_ID/activate" \
  -H "Authorization: Bearer $AT")

if echo "$ACT" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d['activated'].get('status')=='active' and d['superseded'].get('status')=='superseded' else 1)" 2>/dev/null; then
  ok "activate marks prior version superseded"
else
  fail "activate/supersede failed"
fi

VERSIONS=$(curl -s "$API/api/syllabus/courses/$VERIFY_COURSE/versions" -H "Authorization: Bearer $FT")
if echo "$VERSIONS" | python3 -c "import sys,json; vs=json.load(sys.stdin)['data']; a=sum(1 for v in vs if v.get('status')=='active'); s=sum(1 for v in vs if v.get('status')=='superseded'); exit(0 if a==1 and s>=1 else 1)" 2>/dev/null; then
  ok "one active and superseded versions listed"
else
  fail "version list state incorrect"
fi

# superseded generation blocked without acknowledge
BLOCKED=$(curl -s -w "\n%{http_code}" -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\",\"syllabusVersionId\":\"$V1_ID\"}")

BLOCKED_HTTP=$(echo "$BLOCKED" | tail -1)
BLOCKED_BODY=$(echo "$BLOCKED" | sed '$d')

if [ "$BLOCKED_HTTP" = "409" ]; then
  ok "superseded syllabus blocks generation (409)"
else
  fail "superseded warning not returned"
fi

if echo "$BLOCKED_BODY" | python3 -c "import sys,json; m=json.load(sys.stdin); exit(0 if m.get('code')=='SUPERSEDED_SYLLABUS' else 1)" 2>/dev/null; then
  ok "409 includes SUPERSEDED_SYLLABUS payload"
else
  fail "warning payload missing"
fi

# acknowledged proceed
OK_GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\",\"syllabusVersionId\":\"$V1_ID\",\"acknowledgeSuperseded\":true}")

if echo "$OK_GEN" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('usedSupersededSyllabus') is True else 1)" 2>/dev/null; then
  ok "generation proceeds after acknowledge"
else
  fail "acknowledged generation failed"
fi

WARN=$(curl -s "$API/api/syllabus/versions/$V1_ID/generation-warning" -H "Authorization: Bearer $FT")
if echo "$WARN" | python3 -c "import sys,json; w=json.load(sys.stdin).get('data'); exit(0 if w and w.get('activeVersionId') else 1)" 2>/dev/null; then
  ok "generation-warning endpoint"
else
  fail "generation-warning endpoint"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='syllabus.version_activate' for e in d) else 1)" 2>/dev/null; then
  ok "syllabus.version_activate log recorded"
else
  fail "version activate log missing"
fi

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
