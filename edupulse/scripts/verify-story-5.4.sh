#!/usr/bin/env bash
# Story 5.4 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
COURSE="BCS304"
EXAM="IA-2"
USN="PES1UG23CS001"

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

echo "=== Story 5.4 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/evaluation/ai-evaluation.service.ts" \
  "$ROOT/backend/api/src/evaluation/ai-evaluation.util.ts" \
  "$ROOT/backend/api/src/evaluation/ai-evaluation.schema.ts" \
  "$ROOT/backend/api/src/evaluation/pilot-bcs304-ia2-rubric.seed.ts" \
  "$ROOT/frontend/src/components/SheetEvaluationPanel.tsx" \
  "$ROOT/frontend/app/sheet-evaluation.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

BEFORE=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard" -H "Authorization: Bearer $FT")
AI_BEFORE=$(echo "$BEFORE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['progress']['aiEvaluated'])" 2>/dev/null || echo 0)

EVAL=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/$USN" \
  -H "Authorization: Bearer $FT")

if echo "$EVAL" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['usn'] == '$USN'
assert len(d['questions']) == 3
assert all('marksAwarded' in q and 'rationale' in q and 'confidence' in q for q in d['questions'])
assert all(q['flaggedForReview'] == (q['confidence'] < 0.75) for q in d['questions'])
assert 'local' in d['modelName'].lower()
assert d['durationMs'] < 90000
assert d['maxTotalMarks'] == 30
" 2>/dev/null; then
  ok "AI evaluation returns marks, rationale, confidence per question"
else
  fail "AI evaluation payload"
fi

if echo "$EVAL" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert any(q['flaggedForReview'] for q in d['questions'])
assert d['flaggedQuestionCount'] >= 1
" 2>/dev/null; then
  ok "low-confidence questions flagged for faculty review"
else
  fail "confidence flagging"
fi

TC_ID=$(echo "$EVAL" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['trustCardId'])" 2>/dev/null || true)
if [ -n "$TC_ID" ]; then
  TC=$(curl -s "$API/api/trust-cards/$TC_ID" -H "Authorization: Bearer $FT")
  if echo "$TC" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'local' in d['modelName'].lower()" 2>/dev/null; then
    ok "sheet evaluation trust card uses local model"
  else
    fail "trust card local model"
  fi
else
  fail "trust card id missing"
fi

GET=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/$USN" -H "Authorization: Bearer $FT")
if echo "$GET" | python3 -c "import sys,json; assert json.load(sys.stdin)['data']['usn']=='$USN'" 2>/dev/null; then
  ok "GET returns persisted sheet evaluation"
else
  fail "GET sheet evaluation"
fi

AFTER=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard" -H "Authorization: Bearer $FT")
AI_AFTER=$(echo "$AFTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['progress']['aiEvaluated'])" 2>/dev/null || echo 0)

if [ "$AI_AFTER" -eq $((AI_BEFORE + 1)) ]; then
  ok "dashboard aiEvaluated increments after evaluation"
else
  fail "dashboard aiEvaluated (before=$AI_BEFORE after=$AI_AFTER)"
fi

BAD_USN=$(curl -s -o /tmp/st54-bad.json -w "%{http_code}" -X POST \
  "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/NOTAUSN" \
  -H "Authorization: Bearer $FT")
if [ "$BAD_USN" = "400" ]; then ok "unknown USN rejected"; else fail "unknown USN (status=$BAD_USN)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'evaluation.ai_rubric'; then ok "evaluation.ai_rubric logged"; else fail "evaluation.ai_rubric log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
