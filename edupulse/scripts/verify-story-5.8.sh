#!/usr/bin/env bash
# Story 5.8 acceptance verification
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

publish_one_sheet() {
  local ft="$1"
  curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/$USN" -H "Authorization: Bearer $ft" >/dev/null
  verify_resolve_all_flagged_reviews "$API" "$ft" "$COURSE" "$EXAM"
  curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/publish" -H "Authorization: Bearer $ft" >/dev/null
}

echo "=== Story 5.8 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/marks/marks-export.service.ts" \
  "$ROOT/backend/api/src/marks/marks-export.util.ts" \
  "$ROOT/frontend/src/components/MarksCsvExportPanel.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

GRID_PUB=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/grid" -H "Authorization: Bearer $FT")
ALREADY_PUBLISHED=$(echo "$GRID_PUB" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('isPublished', False))" 2>/dev/null || echo "False")

if [ "$ALREADY_PUBLISHED" = "False" ]; then
  UNPUBLISHED_CODE=$(curl -s -o /tmp/st58-unpub.json -w "%{http_code}" \
    "$API/api/marks/assessments/$COURSE/$EXAM/export/csv" -H "Authorization: Bearer $FT")

  if [ "$UNPUBLISHED_CODE" = "400" ] && python3 -c "
import json
body = json.load(open('/tmp/st58-unpub.json'))
assert body.get('code') == 'MARKS_NOT_PUBLISHED'
" 2>/dev/null; then
    ok "unpublished marks export rejected"
  else
    fail "unpublished export guard (status=$UNPUBLISHED_CODE)"
  fi

  publish_one_sheet "$FT"
else
  ok "unpublished export guard skipped (assessment already published)"
fi

TEMPLATE=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/export/template" -H "Authorization: Bearer $FT")
if echo "$TEMPLATE" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['templateId'] == 'pes-erp-v1'
assert any(c['key']=='usn' for c in d['columns'])
assert any(c['key']=='total' for c in d['columns'])
" 2>/dev/null; then
  ok "ERP export template available"
else
  fail "export template"
fi

CUSTOM=$(curl -s -X PUT "$API/api/marks/assessments/$COURSE/$EXAM/export/template" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"columns":[{"key":"usn","header":"Reg No"},{"key":"studentName","header":"Name"},{"key":"courseCode","header":"Subject"},{"key":"assessmentId","header":"Test ID"},{"key":"Q1","header":"Q1"},{"key":"Q2","header":"Q2"},{"key":"Q3","header":"Q3"},{"key":"total","header":"Grand Total"}]}')

if echo "$CUSTOM" | python3 -c "import sys,json; assert json.load(sys.stdin)['data']['columns'][0]['header']=='Reg No'" 2>/dev/null; then
  ok "admin can configure ERP column mapping"
else
  fail "template update"
fi

EXPORT=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/export/csv" -H "Authorization: Bearer $FT")

if echo "$EXPORT" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['fileName'].startswith('PES-BCS304-IA-2-marks-export.csv')
assert d['contentType'] == 'text/csv'
assert d['rowCount'] >= 1
assert 'Reg No' in d['csv']
assert '$USN' in d['csv']
assert 'Grand Total' in d['csv']
lines = [line for line in d['csv'].splitlines() if line.strip()]
assert len(lines) >= 2
" 2>/dev/null; then
  ok "CSV export includes mapped columns and published rows"
else
  fail "CSV export payload"
fi

ARTIFACT=$(echo "$EXPORT" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileName'])" 2>/dev/null || true)

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'marks.csv_export'; then ok "marks.csv_export logged"; else fail "marks.csv_export log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
