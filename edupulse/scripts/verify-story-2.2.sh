#!/usr/bin/env bash
# Story 2.2 acceptance verification
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

upload_sample_syllabus() {
  local tok="$1"
  local sample b64 name
  sample=$(curl -s "$API/api/syllabus/sample/pdf" -H "Authorization: Bearer $tok")
  b64=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['base64'])" 2>/dev/null)
  name=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileName'])" 2>/dev/null)
  curl -s -X POST "$API/api/syllabus/courses/BCS304/upload" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({"fileName": "$name", "base64": """$b64""", "academicTerm": "Odd Sem 2026"}))
PY
)" >/dev/null
}

echo "=== Story 2.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/syllabus/syllabus-modules.util.ts" \
  "$ROOT/frontend/app/syllabus-vault.tsx" \
  "$ROOT/frontend/app/paper-craft.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

accept_consent "$FT"
accept_consent "$PT"

upload_sample_syllabus "$FT"

MODULES=$(curl -s -X PUT "$API/api/syllabus/courses/BCS304/modules" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"modules":[{"moduleNumber":1,"title":"Introduction & Arrays","pageStart":4,"pageEnd":18},{"moduleNumber":3,"title":"Trees","pageStart":42,"pageEnd":58}]}')

if echo "$MODULES" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(m.get('title')=='Trees' and m.get('pageStart')==42 for m in d) else 1)" 2>/dev/null; then
  ok "modules saved with page ranges"
else
  fail "module save failed"
fi

LIST=$(curl -s "$API/api/syllabus/courses/BCS304/modules" -H "Authorization: Bearer $FT")
if echo "$LIST" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if len(d)==2 else 1)" 2>/dev/null; then
  ok "modules list returns saved count"
else
  fail "modules list count"
fi

PICKER=$(curl -s "$API/api/paper-craft/modules/BCS304" -H "Authorization: Bearer $FT")
if echo "$PICKER" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if d and 'pages 42' in d[1].get('label','') or '42' in d[1].get('label','') else 1)" 2>/dev/null; then
  ok "Paper Craft module picker populated"
else
  fail "Paper Craft picker empty or missing labels"
fi

GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"courseCode":"BCS304"}')

TC_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('trustCardId',''))" 2>/dev/null || true)

if [ -n "$TC_ID" ]; then
  ok "paper generation returns trust card"
else
  fail "paper generation missing trust card"
fi

TRUST=$(curl -s "$API/api/trust-cards/$TC_ID" -H "Authorization: Bearer $FT")
if echo "$TRUST" | python3 -c "import sys,json; s=json.load(sys.stdin).get('sources',[]); exit(0 if any('Trees' in x.get('label','') and x.get('kind')=='syllabus' for x in s) else 1)" 2>/dev/null; then
  ok "Trust Card cites syllabus page range"
else
  fail "Trust Card missing syllabus module citation"
fi

BAD_RANGE=$(curl -s -w "\n%{http_code}" -X PUT "$API/api/syllabus/courses/BCS304/modules" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"modules":[{"moduleNumber":5,"title":"Invalid","pageStart":60,"pageEnd":50}]}')

if [ "$(echo "$BAD_RANGE" | tail -1)" = "400" ]; then
  ok "invalid page range rejected"
else
  fail "invalid page range not rejected"
fi

NO_SYLLABUS=$(curl -s -w "\n%{http_code}" -X PUT "$API/api/syllabus/courses/UNKNOWN999/modules" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"modules":[{"moduleNumber":1,"title":"X","pageStart":1,"pageEnd":2}]}')

if [ "$(echo "$NO_SYLLABUS" | tail -1)" = "404" ]; then
  ok "modules require uploaded syllabus"
else
  fail "modules without syllabus not blocked"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='syllabus.modules_save' for e in d) else 1)" 2>/dev/null; then
  ok "syllabus.modules_save log recorded"
else
  fail "modules save log missing"
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
