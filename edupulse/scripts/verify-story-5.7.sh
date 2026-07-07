#!/usr/bin/env bash
# Story 5.7 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPTS_DIR/_verify_lib.sh"
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

echo "=== Story 5.7 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/evaluation/evaluation-publish.service.ts" \
  "$ROOT/backend/api/src/evaluation/evaluation-publish.util.ts" \
  "$ROOT/frontend/src/components/PublishMarksPanel.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/$USN" \
  -H "Authorization: Bearer $FT" >/dev/null

STATUS=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/publish/status" -H "Authorization: Bearer $FT")
if echo "$STATUS" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['evaluatedCount'] >= 1
assert d['canPublish'] is False
assert len(d['pendingReviews']) >= 1
" 2>/dev/null; then
  ok "publish blocked while flagged reviews pending"
else
  fail "publish status before review"
fi

BLOCKED_CODE=$(curl -s -o /tmp/st57-block.json -w "%{http_code}" -X POST \
  "$API/api/evaluation/assessments/$COURSE/$EXAM/publish" -H "Authorization: Bearer $FT")

if [ "$BLOCKED_CODE" = "400" ] && python3 -c "
import json
body = json.load(open('/tmp/st57-block.json'))
pending = body.get('pendingReviews')
assert pending and len(pending) >= 1
" 2>/dev/null; then
  ok "publish attempt returns pending review list"
else
  fail "publish blocked response (status=$BLOCKED_CODE)"
fi

curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/review/flagged" -H "Authorization: Bearer $FT" > /tmp/st57-flagged.json
verify_resolve_flagged_reviews "$API" "$FT" "$COURSE" "$EXAM" "$USN"
verify_resolve_all_flagged_reviews "$API" "$FT" "$COURSE" "$EXAM"

READY=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/publish/status" -H "Authorization: Bearer $FT")
if echo "$READY" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['canPublish'] is True
assert len(d['pendingReviews']) == 0
" 2>/dev/null; then
  ok "publish allowed after review or waiver"
else
  fail "publish ready status"
fi

PUBLISH=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/publish" -H "Authorization: Bearer $FT")
if echo "$PUBLISH" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['status'] == 'published'
assert d['importedCells'] >= 3
assert d['publishedStudents'] >= 1
assert d['source'] == 'evaluation_ai'
" 2>/dev/null; then
  ok "publish writes evaluated marks to Mark Matrix"
else
  fail "publish result"
fi

GRID=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/grid" -H "Authorization: Bearer $FT")
if echo "$GRID" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['isPublished'] is True
assert d['isReadOnly'] is True
assert d['source'] == 'evaluation_ai'
assert all(c.get('isReadOnly') for row in d['rows'] for c in row['cells'] if c['isSaved'])
" 2>/dev/null; then
  ok "Mark Matrix grid is read-only after publish"
else
  fail "published grid flags"
fi

READONLY_Q=$(python3 -c "import json; print(json.load(open('/tmp/st57-flagged.json'))['data'][0]['questionId'])" 2>/dev/null || echo "Q1")
READONLY_CODE=$(curl -s -o /tmp/st57-ro.json -w "%{http_code}" -X PUT \
  "$API/api/marks/assessments/$COURSE/$EXAM/grid" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"cells\":[{\"usn\":\"$USN\",\"questionId\":\"$READONLY_Q\",\"marks\":1}]}")

if [ "$READONLY_CODE" = "400" ]; then
  ok "partial save rejected on published grid"
else
  fail "read-only enforcement (status=$READONLY_CODE)"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'marks.publish'; then ok "marks.publish logged"; else fail "marks.publish log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
