#!/usr/bin/env bash
# Story 7.6 acceptance verification
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

echo "=== Story 7.6 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/batch-readiness-report.service.ts" \
  "$ROOT/backend/api/src/campus-drive/batch-readiness-report.schema.ts" \
  "$ROOT/backend/api/src/campus-drive/batch-readiness-report-export.util.ts" \
  "$ROOT/frontend/src/components/BatchReadinessReportPanel.tsx" \
  "$ROOT/frontend/app/batch-readiness-report.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

REPORT=$(curl -s "$API/api/campus-drive/batch-readiness-report" -H "Authorization: Bearer $TPO")
if echo "$REPORT" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['batchStrength'] == 146
assert d['reportTitle'] == '2027 batch'
tiers = {t['tier']: t for t in d['tierDistribution']}
assert tiers['dream']['count'] == 18
assert tiers['core']['count'] == 64
assert tiers['mass']['count'] == 41
assert tiers['at_risk']['count'] == 23
comm = next(g for g in d['topGaps'] if g['id'] == 'communication')
assert comm['studentCount'] == 91
cse = next(x for x in d['departmentReadiness'] if x['department'] == 'CSE')
assert cse['readinessPercent'] == 82
f = d['recoveryForecast']
assert f['currentPlacementPercent'] == 78
assert f['projectedPlacementPercent'] == 86
assert f['atRiskToCoreCount'] == 12
assert d['interventionPriorityRoute'] == '/intervention-priority'
" 2>/dev/null; then
  ok "report view has tiers, gaps, dept readiness, and forecast"
else
  fail "batch readiness report payload"
fi

PDF=$(curl -s -X POST "$API/api/campus-drive/batch-readiness-report/export?format=pdf" \
  -H "Authorization: Bearer $TPO")
if echo "$PDF" | python3 -c "
import json, sys, base64
d = json.load(sys.stdin)['data']
assert d['format'] == 'pdf'
assert d['mimeType'] == 'application/pdf'
assert d['fileName'].endswith('.pdf')
raw = base64.b64decode(d['base64'])
assert raw[:4] == b'%PDF'
" 2>/dev/null; then
  ok "PDF export returns valid document"
else
  fail "PDF export payload"
fi

XLSX=$(curl -s -X POST "$API/api/campus-drive/batch-readiness-report/export?format=excel" \
  -H "Authorization: Bearer $TPO")
if echo "$XLSX" | python3 -c "
import json, sys, base64
d = json.load(sys.stdin)['data']
assert d['format'] == 'excel'
assert 'spreadsheetml' in d['mimeType']
assert d['fileName'].endswith('.xlsx')
raw = base64.b64decode(d['base64'])
assert raw[:2] == b'PK'
" 2>/dev/null; then
  ok "Excel export returns valid workbook"
else
  fail "Excel export payload"
fi

STUDENT_CODE=$(curl -s -o /tmp/st76-403.json -w "%{http_code}" \
  "$API/api/campus-drive/batch-readiness-report" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied batch readiness report access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.batch_readiness_report_view'; then ok "campus.batch_readiness_report_view logged"; else fail "report view log missing"; fi
if echo "$LOGS" | grep -q 'campus.batch_readiness_report_export'; then ok "campus.batch_readiness_report_export logged"; else fail "report export log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
