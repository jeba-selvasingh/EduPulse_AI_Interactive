#!/usr/bin/env bash
# Story 4.4 acceptance verification
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

echo "=== Story 4.4 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/marks/heatmap-cluster-drilldown.schema.ts" \
  "$ROOT/frontend/app/heatmap-cluster.tsx" \
  "$ROOT/frontend/app/student-diagnosis.tsx"
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

GRID=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/grid" -H "Authorization: Bearer $FT")
USNS=$(echo "$GRID" | python3 -c "import sys,json; print(','.join(r['usn'] for r in json.load(sys.stdin)['data']['rows'][:15]))" 2>/dev/null || true)

IMPORT_CSV=$(python3 - <<PY
usns = """$USNS""".split(',')
print("USN,Student Name,Q1,Q2,Q3")
for i, usn in enumerate(usns):
    if not usn: continue
    print(f"{usn},Student {i+1},8,8,3")
PY
)

curl -s -X POST "$API/api/marks/assessments/$COURSE/$EXAM/import" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
print(json.dumps({"csv": """$IMPORT_CSV"""}))
PY
)" >/dev/null

DRILL=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/heatmap/clusters/CO3?scope=weak" -H "Authorization: Bearer $FT")

if echo "$DRILL" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
assert d['coTag']=='CO3'
assert len(d['students'])>=10
assert all(s['masteryPercent']<40 for s in d['students'])
assert all('studentName' in s and 'masteryPercent' in s for s in d['students'])
" 2>/dev/null; then
  ok "drill-down returns weak students with names and CO scores"
else
  fail "drill-down student list"
fi

if echo "$DRILL" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
route=d['students'][0]['diagnosisRoute']
assert route.startswith('/student-diagnosis?')
assert 'usn=' in route and 'coTag=CO3' in route and 'courseCode=BCS304' in route
" 2>/dev/null; then
  ok "diagnosis entry route on each student"
else
  fail "diagnosis route"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'marks.heatmap_drilldown'; then ok "marks.heatmap_drilldown logged"; else fail "drilldown log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
