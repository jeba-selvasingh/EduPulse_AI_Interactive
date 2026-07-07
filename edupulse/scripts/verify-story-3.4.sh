#!/usr/bin/env bash
# Story 3.4 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
VERIFY_COURSE="${VERIFY_COURSE:-BCS304}"

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
  curl -s -X POST "$API/api/syllabus/courses/$VERIFY_COURSE/upload" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({"fileName": "$name", "base64": """$b64""", "academicTerm": "Odd Sem 2026"}))
PY
)" >/dev/null
}

echo "=== Story 3.4 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/paper-craft/answer-key.service.ts" \
  "$ROOT/frontend/app/answer-key-detail.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

accept_consent "$FT"
upload_sample_syllabus "$FT"

curl -s -X PUT "$API/api/syllabus/courses/$VERIFY_COURSE/modules" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"modules":[{"moduleNumber":1,"title":"Introduction & Arrays","pageStart":4,"pageEnd":18},{"moduleNumber":2,"title":"Linked Lists","pageStart":19,"pageEnd":41},{"moduleNumber":3,"title":"Trees","pageStart":42,"pageEnd":58}]}' >/dev/null

curl -s -X PUT "$API/api/paper-craft/blueprint/$VERIFY_COURSE" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"examType":"SEE","difficulty":{"easy":30,"moderate":50,"hard":20},"bloom":{"l1":10,"l2":25,"l3":35,"l4":20,"l5":10}}' >/dev/null

GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\",\"questionCount\":6}")

PAPER_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('paperId',''))" 2>/dev/null || true)
Q1_ID=$(echo "$GEN" | python3 -c "import sys,json; qs=json.load(sys.stdin)['data'].get('questions',[]); print(qs[0]['id'] if qs else '')" 2>/dev/null || true)

AK=$(curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/answer-key/generate" \
  -H "Authorization: Bearer $FT")

if echo "$AK" | python3 -c "
import sys,json
qs=json.load(sys.stdin)['data']['questions']
if not qs: raise SystemExit(1)
for q in qs:
  total=sum(s['marks'] for s in q.get('rubricSteps',[]))
  if total != q.get('maxMarks') or not q.get('isValid'):
    raise SystemExit(1)
" 2>/dev/null; then
  ok "rubric mark steps sum to each question max marks"
else
  fail "rubric totals invalid"
fi

TC_ID=$(echo "$AK" | python3 -c "import sys,json; qs=json.load(sys.stdin)['data']['questions']; print(qs[0]['trustCardId'])" 2>/dev/null || true)

EDIT=$(curl -s -X PUT "$API/api/paper-craft/papers/$PAPER_ID/answer-key/$Q1_ID" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"modelAnswer":"Faculty-edited model answer for circular queue ADT with diagram and operations."}')

if echo "$EDIT" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if 'Faculty-edited' in d.get('modelAnswer','') else 1)" 2>/dev/null; then
  ok "model answer updated via PUT"
else
  fail "model answer update failed"
fi

AUDIT=$(curl -s "$API/api/audit-events/artifact/$TC_ID" -H "Authorization: Bearer $FT")
if echo "$AUDIT" | python3 -c "import sys,json; events=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('eventType')=='edit' and e.get('field')=='modelAnswer' for e in events) else 1)" 2>/dev/null; then
  ok "model answer edit recorded in audit trail"
else
  fail "audit trail missing edit event"
fi

GET_AK=$(curl -s "$API/api/paper-craft/papers/$PAPER_ID/answer-key" -H "Authorization: Bearer $FT")
if echo "$GET_AK" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if len(d.get('questions',[]))>=1 else 1)" 2>/dev/null; then
  ok "GET paper answer key"
else
  fail "GET answer key failed"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='answer_key.generate' for e in d) else 1)" 2>/dev/null; then
  ok "answer_key.generate log recorded"
else
  fail "answer key generate log missing"
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
