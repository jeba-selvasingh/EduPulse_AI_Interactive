#!/usr/bin/env bash
# Story 7.1 acceptance verification
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

echo "=== Story 7.1 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/eligibility-tracker.service.ts" \
  "$ROOT/backend/api/src/campus-drive/pilot-companies.seed.ts" \
  "$ROOT/frontend/src/components/CompanyEligibilityPanel.tsx" \
  "$ROOT/frontend/app/company-eligibility.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

ELIG=$(curl -s "$API/api/campus-drive/eligibility" -H "Authorization: Bearer $TPO")
if echo "$ELIG" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['batchStrength'] == 146
assert d['totalCompanies'] >= 4
tcs = next(c for c in d['companies'] if c['companyId'] == 'tcs-digital')
wipro = next(c for c in d['companies'] if c['companyId'] == 'wipro-turbo')
infosys = next(c for c in d['companies'] if c['companyId'] == 'infosys-sp')
cognizant = next(c for c in d['companies'] if c['companyId'] == 'cognizant-genc')
assert tcs['eligibleCount'] >= 135
assert tcs['registrationStatus'] == 'open'
assert infosys['eligibleCount'] == 138
assert infosys['registeredCount'] == 89
assert wipro['eligibleCount'] == 31
assert wipro['nearMissCount'] == 8
assert cognizant['eligibleCount'] == 143
assert any(i['companyId'] == 'wipro-turbo' for i in d['nearMissInsights'])
" 2>/dev/null; then
  ok "eligibility tracker shows counts, rules, and near-miss insight"
else
  fail "eligibility tracker payload"
fi

DREAM=$(curl -s "$API/api/campus-drive/eligibility?tier=dream" -H "Authorization: Bearer $TPO")
if echo "$DREAM" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['activeTierFilter'] == 'dream'
assert all(c['tier'] == 'dream' for c in d['companies'])
assert len(d['companies']) == 2
" 2>/dev/null; then
  ok "dream tier filter returns dream companies only"
else
  fail "tier filter"
fi

HOME=$(curl -s "$API/api/campus-drive/home" -H "Authorization: Bearer $TPO")
if echo "$HOME" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['batchStrength'] == 146
assert d['eligibilityRoute'] == '/company-eligibility'
" 2>/dev/null; then
  ok "campus home links to eligibility tracker"
else
  fail "campus home payload"
fi

STUDENT_CODE=$(curl -s -o /tmp/st71-403.json -w "%{http_code}" \
  "$API/api/campus-drive/eligibility" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied campus eligibility access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.eligibility_view'; then ok "campus.eligibility_view logged"; else fail "eligibility view log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
