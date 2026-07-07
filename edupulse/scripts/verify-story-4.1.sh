#!/usr/bin/env bash
# Story 4.1 acceptance verification
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

echo "=== Story 4.1 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/marks/marks.service.ts" \
  "$ROOT/backend/api/src/marks/marks.schema.ts" \
  "$ROOT/frontend/src/lib/marks-api.ts" \
  "$ROOT/frontend/src/components/MarksEntryGrid.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
if [ -n "$PT" ]; then ok "principal login"; else fail "principal login"; fi

accept_consent "$FT"

# Ensure roster via cohort sample import
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

GRID=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/grid" -H "Authorization: Bearer $FT")
if echo "$GRID" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; assert d['courseCode']=='$COURSE'; assert len(d['questions'])==3; assert d['completion']['totalStudents']==64" 2>/dev/null; then
  ok "GET grid returns BCS304 IA-2 with 3 questions and 64 students"
else
  fail "GET grid structure"
fi

TOTAL_CELLS=$(echo "$GRID" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['completion']['totalCells'])" 2>/dev/null || echo 0)
if [ "$TOTAL_CELLS" = "192" ]; then ok "totalCells = 64×3 = 192"; else fail "totalCells expected 192 got $TOTAL_CELLS"; fi

USN1=$(echo "$GRID" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rows'][0]['usn'])" 2>/dev/null || true)
USN2=$(echo "$GRID" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rows'][1]['usn'])" 2>/dev/null || true)

# Partial save 62 cells
CELLS_JSON=$(echo "$GRID" | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
cells = []
for row in data['rows']:
    for q in data['questions']:
        if len(cells) >= 62:
            break
        cells.append({'usn': row['usn'], 'questionId': q['id'], 'marks': 6})
    if len(cells) >= 62:
        break
print(json.dumps({'cells': cells}))
")

SAVE1=$(curl -s -X PUT "$API/api/marks/assessments/$COURSE/$EXAM/grid" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$CELLS_JSON")

SAVED=$(echo "$SAVE1" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['grid']['completion']['savedCells'])" 2>/dev/null || echo 0)
if [ "$SAVED" = "62" ]; then ok "partial save preserves 62/192 cells"; else fail "partial save count expected 62 got $SAVED"; fi

# Reject mark above max (10)
REJECT=$(curl -s -X PUT "$API/api/marks/assessments/$COURSE/$EXAM/grid" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"cells\":[{\"usn\":\"$USN1\",\"questionId\":\"Q1\",\"marks\":11}]}")

if echo "$REJECT" | python3 -c "import sys,json; r=json.load(sys.stdin)['data']['rejected']; assert len(r)==1 and '10' in r[0]['message']" 2>/dev/null; then
  ok "marks above question max rejected with message"
else
  fail "max marks validation"
fi

# Observability log
accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'marks.partial_save'; then ok "marks.partial_save logged"; else fail "marks.partial_save log missing"; fi

# Assessment grid starts unpublished (publish moved to evaluation flow in Story 5.7)
if echo "$GRID" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; exit(0 if d.get('isPublished') is False else 1)" 2>/dev/null; then
  ok "assessment grid starts unpublished"
else
  fail "assessment should start unpublished"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
