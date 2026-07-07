#!/usr/bin/env bash
# Story 4.2 acceptance verification
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

echo "=== Story 4.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/marks/marks-import.service.ts" \
  "$ROOT/backend/api/src/marks/marks-import.util.ts" \
  "$ROOT/frontend/src/components/MarksExcelImportPanel.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

accept_consent "$FT"

SAMPLE=$(curl -s "$API/api/cohort/import/sample" -H "Authorization: Bearer $FT")
CSV=$(echo "$SAMPLE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['csv'])" 2>/dev/null || true)
curl -s -X POST "$API/api/cohort/import" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
print(json.dumps({"csv": """$CSV"""}))
PY
)" >/dev/null

TEMPLATE=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/import/template" -H "Authorization: Bearer $FT")
if echo "$TEMPLATE" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; assert d['fileName'].endswith('.xlsx'); assert len(d['base64'])>100; assert 'USN' in d['csv']" 2>/dev/null; then
  ok "import template returns xlsx + csv"
else
  fail "import template"
fi

GRID=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/grid" -H "Authorization: Bearer $FT")
USN1=$(echo "$GRID" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rows'][0]['usn'])" 2>/dev/null || true)
NAME1=$(echo "$GRID" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rows'][0]['studentName'])" 2>/dev/null || true)
USN2=$(echo "$GRID" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rows'][1]['usn'])" 2>/dev/null || true)
NAME2=$(echo "$GRID" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rows'][1]['studentName'])" 2>/dev/null || true)

VALID_CSV=$(python3 - <<PY
print("USN,Student Name,Q1,Q2,Q3")
print("$USN1,$NAME1,8,7,9")
print("$USN2,$NAME2,6,5,7")
PY
)

IMPORT_OK=$(curl -s -X POST "$API/api/marks/assessments/$COURSE/$EXAM/import" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
print(json.dumps({"csv": """$VALID_CSV"""}))
PY
)")

if echo "$IMPORT_OK" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; assert d['rowsImported']==2; assert d['cellsImported']==6; assert d['grid']['completion']['savedCells']>=6" 2>/dev/null; then
  ok "valid rows imported (2 rows, 6 cells)"
else
  fail "valid import"
fi

INVALID_CSV=$(python3 - <<'PY'
print("USN,Student Name,Q1,Q2,Q3")
print("UNKNOWN-USN-999,Ghost Student,8,7,9")
print("PES1UG23CS001,Test,11,5,7")
PY
)

IMPORT_BAD=$(curl -s -X POST "$API/api/marks/assessments/$COURSE/$EXAM/import" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
csv = """USN,Student Name,Q1,Q2,Q3
UNKNOWN-USN-999,Ghost Student,8,7,9
$USN1,$NAME1,11,5,7"""
print(json.dumps({"csv": csv}))
PY
)")

if echo "$IMPORT_BAD" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; assert len(d['usnMismatches'])>=1; assert any(e['row']==2 for e in d['usnMismatches'])" 2>/dev/null; then
  ok "USN mismatch flagged on row 2"
else
  fail "USN mismatch reporting"
fi

if echo "$IMPORT_BAD" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; assert any(e.get('code')=='VALIDATION' and e['row']==3 for e in d['errors'])" 2>/dev/null; then
  ok "invalid mark reported with row number"
else
  fail "validation row errors"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'marks.excel_import'; then ok "marks.excel_import logged"; else fail "marks.excel_import log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
