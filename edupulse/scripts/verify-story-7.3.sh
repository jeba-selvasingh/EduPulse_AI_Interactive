#!/usr/bin/env bash
# Story 7.3 acceptance verification
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

echo "=== Story 7.3 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/student-readiness-detail.service.ts" \
  "$ROOT/backend/api/src/campus-drive/student-readiness-detail.schema.ts" \
  "$ROOT/frontend/src/components/StudentReadinessDetailPanel.tsx" \
  "$ROOT/frontend/app/student-readiness.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

CHETAN=$(curl -s "$API/api/campus-drive/student-readiness?usn=PES1UG23CS061" -H "Authorization: Bearer $TPO")
if echo "$CHETAN" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['name'] == 'Chetan R'
assert d['readinessPercent'] == 72
assert d['tier'] == 'core'
assert d['eligibleCompanyCount'] == 23
assert d['totalCompanies'] == 41
assert 'aptitude' in d['companyFitSummary'].lower() or 'aptitude' in d['gapAnalysis'].lower()
assert len(d['breakdown']) == 4
comm = next(x for x in d['breakdown'] if x['key'] == 'communication')
assert comm['score'] == 4
assert len(d['interventionModules']) >= 2
assert any('aptitude' in m['route'] or 'soft-skills' in m['route'] for m in d['interventionModules'])
" 2>/dev/null; then
  ok "Chetan detail shows company fit, gap analysis, and intervention links"
else
  fail "Chetan student-readiness payload"
fi

FARHAN=$(curl -s "$API/api/campus-drive/student-readiness?usn=PES1UG23CS049" -H "Authorization: Bearer $TPO")
if echo "$FARHAN" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['tier'] == 'at_risk'
assert d['readinessPercent'] == 41
assert d['eligibleCompanyCount'] == 8
assert 'backlog' in d['gapAnalysis'].lower()
assert any(m['priority'] == 'urgent' for m in d['interventionModules'])
" 2>/dev/null; then
  ok "Farhan detail shows backlog gap and urgent intervention"
else
  fail "Farhan student-readiness payload"
fi

UNKNOWN_CODE=$(curl -s -o /tmp/st73-404.json -w "%{http_code}" \
  "$API/api/campus-drive/student-readiness?usn=UNKNOWN-USN" -H "Authorization: Bearer $TPO")
if [ "$UNKNOWN_CODE" = "404" ]; then ok "unknown USN returns 404"; else fail "unknown USN (status=$UNKNOWN_CODE)"; fi

STUDENT_CODE=$(curl -s -o /tmp/st73-403.json -w "%{http_code}" \
  "$API/api/campus-drive/student-readiness?usn=PES1UG23CS061" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied student-readiness access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.student_readiness_view'; then ok "campus.student_readiness_view logged"; else fail "student readiness log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
