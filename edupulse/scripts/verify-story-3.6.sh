#!/usr/bin/env bash
# Story 3.6 acceptance verification
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

prepare_paper_package() {
  local tok="$1"
  upload_sample_syllabus "$tok"
  curl -s -X PUT "$API/api/syllabus/courses/$VERIFY_COURSE/modules" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d '{"modules":[{"moduleNumber":1,"title":"Introduction & Arrays","pageStart":4,"pageEnd":18},{"moduleNumber":2,"title":"Linked Lists","pageStart":19,"pageEnd":41},{"moduleNumber":3,"title":"Trees","pageStart":42,"pageEnd":58},{"moduleNumber":4,"title":"Graphs","pageStart":59,"pageEnd":72},{"moduleNumber":5,"title":"Hashing","pageStart":73,"pageEnd":86}]}' >/dev/null
  curl -s -X PUT "$API/api/paper-craft/blueprint/$VERIFY_COURSE" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d '{"examType":"SEE","difficulty":{"easy":30,"moderate":50,"hard":20},"bloom":{"l1":10,"l2":25,"l3":35,"l4":20,"l5":10}}' >/dev/null
  GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d "{\"courseCode\":\"$VERIFY_COURSE\",\"questionCount\":10}")
  PAPER_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('paperId',''))" 2>/dev/null || true)
  TRUST_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('trustCardId',''))" 2>/dev/null || true)
  Q_IDS=$(echo "$GEN" | python3 -c "import sys,json; print(','.join(q['id'] for q in json.load(sys.stdin)['data'].get('questions',[])))" 2>/dev/null || true)
  curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/answer-key/generate" -H "Authorization: Bearer $tok" >/dev/null
  curl -s "$API/api/paper-craft/papers/$PAPER_ID/co-po-mapping" -H "Authorization: Bearer $tok" >/dev/null
  echo "$PAPER_ID|$TRUST_ID|$Q_IDS"
}

echo "=== Story 3.6 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/paper-craft/paper-moderation.service.ts" \
  "$ROOT/frontend/app/paper-moderation.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
MT=$(token "$(login moderator@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ] && [ -n "$MT" ]; then ok "faculty and moderator login"; else fail "login failed"; fi

accept_consent "$FT"
PKG=$(prepare_paper_package "$FT")
PAPER_ID="${PKG%%|*}"
REST="${PKG#*|}"
TRUST_ID="${REST%%|*}"
Q_IDS="${REST#*|}"
Q1_ID="${Q_IDS%%,*}"

SUBMIT=$(curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/moderation/submit" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d.get('status')=='submitted' and d.get('isLocked') else 1)" 2>/dev/null; then
  ok "faculty submit locks package"
else
  fail "submit for moderation failed"
fi

LOCK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$API/api/paper-craft/papers/$PAPER_ID/answer-key/$Q1_ID" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"modelAnswer":"Blocked edit while locked"}')
if [ "$LOCK_STATUS" = "409" ]; then
  ok "package locked from edit after submit"
else
  fail "expected 409 on locked edit, got $LOCK_STATUS"
fi

MOD_NOTIF=$(curl -s "$API/api/notifications" -H "Authorization: Bearer $MT")
if echo "$MOD_NOTIF" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(n.get('kind')=='moderation_submitted' and n.get('paperId')=='$PAPER_ID' for n in d) else 1)" 2>/dev/null; then
  ok "moderator receives submission notification"
else
  fail "moderator notification missing"
fi

APPROVE=$(curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/moderation/approve" \
  -H "Authorization: Bearer $MT" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$APPROVE" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d.get('status')=='approved' and d.get('answerSheetUnlocked') else 1)" 2>/dev/null; then
  ok "moderator approval unlocks Answer Sheet AI"
else
  fail "approval failed"
fi

FAC_NOTIF=$(curl -s "$API/api/notifications" -H "Authorization: Bearer $FT")
if echo "$FAC_NOTIF" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(n.get('kind')=='moderation_approved' for n in d) else 1)" 2>/dev/null; then
  ok "faculty notified on approval"
else
  fail "faculty approval notification missing"
fi

EVAL=$(curl -s "$API/api/paper-craft/papers/$PAPER_ID/evaluation-access" -H "Authorization: Bearer $FT")
if echo "$EVAL" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d.get('unlocked') else 1)" 2>/dev/null; then
  ok "evaluation access endpoint reports unlocked"
else
  fail "evaluation access not unlocked"
fi

AUDIT=$(curl -s "$API/api/audit-events/artifact/$TRUST_ID" -H "Authorization: Bearer $MT")
if echo "$AUDIT" | python3 -c "import sys,json; events=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('eventType')=='approval' for e in events) else 1)" 2>/dev/null; then
  ok "approval recorded in audit trail"
else
  fail "audit approval event missing"
fi

# Return flow on a fresh paper
PKG2=$(prepare_paper_package "$FT")
PAPER2="${PKG2%%|*}"
REST2="${PKG2#*|}"
Q2_IDS="${REST2#*|}"
Q2_FIRST="${Q2_IDS%%,*}"
curl -s -X POST "$API/api/paper-craft/papers/$PAPER2/moderation/submit" \
  -H "Authorization: Bearer $FT" -H "Content-Type: application/json" -d '{}' >/dev/null
RETURN=$(curl -s -X POST "$API/api/paper-craft/papers/$PAPER2/moderation/return" \
  -H "Authorization: Bearer $MT" \
  -H "Content-Type: application/json" \
  -d '{"comments":"Add one more CO4 question and rebalance Bloom levels."}')
if echo "$RETURN" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d.get('status')=='returned' and d.get('changeComments') and not d.get('isLocked') else 1)" 2>/dev/null; then
  ok "returned package editable with change comments"
else
  fail "return for changes failed"
fi

RETURN_EDIT=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$API/api/paper-craft/papers/$PAPER2/co-po-mapping/$Q2_FIRST" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"coTag":"CO4","strengthWeight":3}')
if [ "$RETURN_EDIT" = "200" ]; then
  ok "faculty can edit mapping after return"
else
  fail "expected edit after return, got $RETURN_EDIT"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='moderation.submit' for e in d) and any(e.get('action')=='moderation.approve' for e in d) else 1)" 2>/dev/null; then
  ok "moderation logs recorded"
else
  fail "moderation logs missing"
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
