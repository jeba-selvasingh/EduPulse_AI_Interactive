#!/usr/bin/env bash
# Story 3.5 acceptance verification
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

echo "=== Story 3.5 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/paper-craft/co-po-mapping.service.ts" \
  "$ROOT/frontend/app/co-po-mapping.tsx"
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

MAP=$(curl -s "$API/api/paper-craft/papers/$PAPER_ID/co-po-mapping" -H "Authorization: Bearer $FT")

if echo "$MAP" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
qs=d.get('questions',[])
if not qs: raise SystemExit(1)
for q in qs:
  if q.get('strengthWeight') not in (1,2,3): raise SystemExit(1)
  if not all(k in q for k in ('coTag','poTag','strengthWeight','rationale')): raise SystemExit(1)
" 2>/dev/null; then
  ok "per-question mappings include CO/PO tags and strength weights 1-3"
else
  fail "mapping payload invalid"
fi

if echo "$MAP" | python3 -c "
import sys,json
cov=json.load(sys.stdin)['data'].get('coverage',[])
if len(cov) != 5: raise SystemExit(1)
if not all('status' in c and 'isUnderRepresented' in c for c in cov): raise SystemExit(1)
under=[c for c in cov if c['isUnderRepresented']]
if not under: raise SystemExit(1)
" 2>/dev/null; then
  ok "coverage panel highlights under-represented COs"
else
  fail "coverage summary missing under-represented COs"
fi

EDIT=$(curl -s -X PUT "$API/api/paper-craft/papers/$PAPER_ID/co-po-mapping/$Q1_ID" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"coTag":"CO4","strengthWeight":3}')

if echo "$EDIT" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
m=d.get('mapping',{})
if m.get('coTag') != 'CO4' or m.get('strengthWeight') != 3: raise SystemExit(1)
cov=d.get('coverage',[])
co4=next((c for c in cov if c.get('coTag')=='CO4'), None)
if not co4 or co4.get('questionCount',0) < 1: raise SystemExit(1)
" 2>/dev/null; then
  ok "faculty can adjust per-question CO mapping via PUT"
else
  fail "mapping update failed"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='co_po.mapping_update' for e in d) else 1)" 2>/dev/null; then
  ok "co_po.mapping_update log recorded"
else
  fail "mapping update log missing"
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
