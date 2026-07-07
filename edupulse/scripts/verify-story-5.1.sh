#!/usr/bin/env bash
# Story 5.1 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
COURSE="BCS304"
EXAM="IA-2"

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

prepare_paper_package() {
  local tok="$1"
  local sample b64 name
  sample=$(curl -s "$API/api/syllabus/sample/pdf" -H "Authorization: Bearer $tok")
  b64=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['base64'])" 2>/dev/null)
  name=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileName'])" 2>/dev/null)
  curl -s -X POST "$API/api/syllabus/courses/$COURSE/upload" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({"fileName": "$name", "base64": """$b64""", "academicTerm": "Odd Sem 2026"}))
PY
)" >/dev/null
  curl -s -X PUT "$API/api/syllabus/courses/$COURSE/modules" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d '{"modules":[{"moduleNumber":1,"title":"Introduction & Arrays","pageStart":4,"pageEnd":18},{"moduleNumber":2,"title":"Linked Lists","pageStart":19,"pageEnd":41},{"moduleNumber":3,"title":"Trees","pageStart":42,"pageEnd":58},{"moduleNumber":4,"title":"Graphs","pageStart":59,"pageEnd":72},{"moduleNumber":5,"title":"Hashing","pageStart":73,"pageEnd":86}]}' >/dev/null
  curl -s -X PUT "$API/api/paper-craft/blueprint/$COURSE" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d '{"examType":"IA-2","difficulty":{"easy":30,"moderate":50,"hard":20},"bloom":{"l1":10,"l2":25,"l3":35,"l4":20,"l5":10}}' >/dev/null
  GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d "{\"courseCode\":\"$COURSE\",\"questionCount\":10}")
  PAPER_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('paperId',''))" 2>/dev/null || true)
  curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/answer-key/generate" -H "Authorization: Bearer $tok" >/dev/null
  curl -s "$API/api/paper-craft/papers/$PAPER_ID/co-po-mapping" -H "Authorization: Bearer $tok" >/dev/null
  echo "$PAPER_ID"
}

echo "=== Story 5.1 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/evaluation/evaluation-workflow.service.ts" \
  "$ROOT/backend/api/src/evaluation/evaluation-workflow.schema.ts" \
  "$ROOT/frontend/src/lib/evaluation-api.ts" \
  "$ROOT/frontend/src/components/EvaluationWorkflowDashboard.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
MT=$(token "$(login moderator@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

# Pilot dashboard without paperId (quick-action path)
OPEN=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard" -H "Authorization: Bearer $FT")
if echo "$OPEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['available'] is True
assert d['progress']['uploaded'] == 47
assert d['progress']['aiEvaluated'] == 38
assert d['progress']['facultyReviewed'] == 22
assert d['totalStudents'] == 64
" 2>/dev/null; then
  ok "dashboard shows uploaded / AI evaluated / faculty reviewed counts"
else
  fail "dashboard progress counts"
fi

PAPER_ID=$(prepare_paper_package "$FT")
SUBMIT=$(curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/moderation/submit" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{}')
if ! echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; assert d.get('status')=='submitted'" 2>/dev/null; then
  fail "paper submit for moderation (needed for gate test)"
fi

LOCKED=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard?paperId=$PAPER_ID" -H "Authorization: Bearer $FT")
if echo "$LOCKED" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['available'] is False
assert 'moderation' in d['message'].lower()
assert d['progress']['uploaded'] == 0
" 2>/dev/null; then
  ok "unapproved paper blocks workflow with moderation message"
else
  fail "moderation gate"
fi

accept_consent "$MT"
curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/moderation/approve" \
  -H "Authorization: Bearer $MT" \
  -H "Content-Type: application/json" \
  -d '{}' >/dev/null

UNLOCKED=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard?paperId=$PAPER_ID" -H "Authorization: Bearer $FT")
if echo "$UNLOCKED" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['available'] is True
assert d['progress']['uploaded'] == 47
assert d['questionCount'] == 10
" 2>/dev/null; then
  ok "approved paper unlocks dashboard with exam metadata"
else
  fail "approved dashboard"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'evaluation.dashboard_view'; then ok "evaluation.dashboard_view logged"; else fail "evaluation.dashboard_view log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
