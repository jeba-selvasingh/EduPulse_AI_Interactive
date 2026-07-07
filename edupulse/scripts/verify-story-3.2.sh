#!/usr/bin/env bash
# Story 3.2 acceptance verification
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

echo "=== Story 3.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/paper-craft/paper-craft.service.ts" \
  "$ROOT/frontend/app/generated-paper.tsx"
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

START_MS=$(python3 -c "import time; print(int(time.time()*1000))")

GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\",\"questionCount\":10}")

END_MS=$(python3 -c "import time; print(int(time.time()*1000))")
ELAPSED=$((END_MS - START_MS))

if echo "$GEN" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d.get('status')=='completed' and d.get('questionCount',0)<=15 else 1)" 2>/dev/null; then
  ok "generation completes with status completed (≤15 questions)"
else
  fail "generation status or question count"
fi

if [ "$ELAPSED" -lt 120000 ]; then
  ok "generation within 120s pilot limit (${ELAPSED}ms)"
else
  fail "generation exceeded 120s"
fi

if echo "$GEN" | python3 -c "
import sys,json
qs=json.load(sys.stdin)['data'].get('questions',[])
if not qs: raise SystemExit(1)
for q in qs:
  if not all(k in q for k in ('moduleNumber','marks','bloomLevel','coTag','poTag','text')):
    raise SystemExit(1)
" 2>/dev/null; then
  ok "each question has module, marks, Bloom, CO/PO tags"
else
  fail "question metadata incomplete"
fi

PAPER_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('paperId',''))" 2>/dev/null || true)
TC_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('trustCardId',''))" 2>/dev/null || true)

if [ -n "$PAPER_ID" ] && [ -n "$TC_ID" ]; then
  ok "paper artifact and trust card ids returned"
else
  fail "missing paperId or trustCardId"
fi

PAPER=$(curl -s "$API/api/paper-craft/papers/$PAPER_ID" -H "Authorization: Bearer $FT")
if echo "$PAPER" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if len(d.get('questions',[]))==d.get('questionCount',0) else 1)" 2>/dev/null; then
  ok "GET paper returns stored questions"
else
  fail "GET paper failed"
fi

TRUST=$(curl -s "$API/api/trust-cards/$TC_ID" -H "Authorization: Bearer $FT")
if echo "$TRUST" | python3 -c "import sys,json; t=json.load(sys.stdin); exit(0 if t.get('artifactType')=='question_paper' else 1)" 2>/dev/null; then
  ok "Trust Card attached to paper artifact"
else
  fail "Trust Card not question_paper type"
fi

BAD_COUNT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\",\"questionCount\":20}")

if [ "$BAD_COUNT_HTTP" = "400" ]; then
  ok "questionCount >15 rejected"
else
  fail "questionCount >15 not rejected (HTTP $BAD_COUNT_HTTP)"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='ai.paper_craft_generate' and (e.get('metadata') or {}).get('status')=='completed' for e in d) else 1)" 2>/dev/null; then
  ok "ai.paper_craft_generate log with completed status"
else
  fail "generation log missing completed status"
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
