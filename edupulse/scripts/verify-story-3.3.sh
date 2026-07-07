#!/usr/bin/env bash
# Story 3.3 acceptance verification
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

echo "=== Story 3.3 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/paper-craft/pilot-past-papers.seed.ts" \
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

GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\",\"questionCount\":9}")

if echo "$GEN" | python3 -c "
import sys,json
qs=json.load(sys.stdin)['data'].get('questions',[])
flagged=[q for q in qs if q.get('similarityWarning')]
if not flagged: raise SystemExit(1)
w=flagged[0]['similarityWarning']
if not w.get('matchedReference') or w.get('similarityPct',0) < 80:
  raise SystemExit(1)
" 2>/dev/null; then
  ok "flagged question includes prior paper reference (≥80%)"
else
  fail "similarity flag missing or below threshold"
fi

PAPER_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('paperId',''))" 2>/dev/null || true)
FLAGGED_ID=$(echo "$GEN" | python3 -c "
import sys,json
qs=json.load(sys.stdin)['data'].get('questions',[])
for q in qs:
  if q.get('similarityWarning'):
    print(q['id']); break
" 2>/dev/null || true)
BEFORE_COUNT=$(echo "$GEN" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data'].get('questions',[])))" 2>/dev/null || true)
BEFORE_FLAGS=$(echo "$GEN" | python3 -c "import sys,json; qs=json.load(sys.stdin)['data'].get('questions',[]); print(sum(1 for q in qs if q.get('similarityWarning')))" 2>/dev/null || true)
REGEN_KEY=$(echo "$GEN" | python3 -c "
import sys,json
qs=json.load(sys.stdin)['data'].get('questions',[])
for q in qs:
  if q.get('similarityWarning'):
    print(q['questionKey']); break
" 2>/dev/null || true)

PAPER_VIEW=$(curl -s "$API/api/paper-craft/papers/$PAPER_ID" -H "Authorization: Bearer $FT")
if echo "$PAPER_VIEW" | python3 -c "import sys,json; qs=json.load(sys.stdin)['data']['questions']; exit(0 if any(q.get('similarityWarning') for q in qs) else 1)" 2>/dev/null; then
  ok "GET paper shows similarity warning"
else
  fail "GET paper missing similarity warning"
fi

REGEN=$(curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/questions/$FLAGGED_ID/regenerate" \
  -H "Authorization: Bearer $FT")

if echo "$REGEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
if len(d.get('questions',[])) != $BEFORE_COUNT:
  raise SystemExit(1)
q=d.get('question',{})
if q.get('similarityWarning'):
  raise SystemExit(1)
" 2>/dev/null; then
  ok "single-question regenerate replaces flagged item only"
else
  fail "regenerate did not clear flag or changed question count"
fi

AFTER_PAPER=$(curl -s "$API/api/paper-craft/papers/$PAPER_ID" -H "Authorization: Bearer $FT")
if echo "$AFTER_PAPER" | python3 -c "
import sys,json
qs=json.load(sys.stdin)['data']['questions']
before_count=$BEFORE_COUNT
before_flags=$BEFORE_FLAGS
regen_key='$REGEN_KEY'
if len(qs) != before_count:
  raise SystemExit(1)
after_flags=sum(1 for q in qs if q.get('similarityWarning'))
if after_flags != before_flags - 1:
  raise SystemExit(1)
for q in qs:
  if q.get('questionKey') == regen_key and q.get('similarityWarning'):
    raise SystemExit(1)
" 2>/dev/null; then
  ok "paper persisted after regenerate with same question count"
else
  fail "paper state after regenerate incorrect"
fi

BAD_REGEN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$API/api/paper-craft/papers/$PAPER_ID/questions/00000000-0000-4000-8000-000000009999/regenerate" \
  -H "Authorization: Bearer $FT")
if [ "$BAD_REGEN_HTTP" = "404" ]; then
  ok "unknown question regenerate returns 404"
else
  fail "unknown question not 404 (HTTP $BAD_REGEN_HTTP)"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='ai.paper_craft_regenerate' for e in d) else 1)" 2>/dev/null; then
  ok "ai.paper_craft_regenerate log recorded"
else
  fail "regenerate log missing"
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
