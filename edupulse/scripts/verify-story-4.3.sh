#!/usr/bin/env bash
# Story 4.3 acceptance verification
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

echo "=== Story 4.3 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/marks/mastery-heatmap.service.ts" \
  "$ROOT/frontend/src/components/MasteryHeatmapGrid.tsx" \
  "$ROOT/frontend/app/mastery-heatmap.tsx"
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
USNS=$(echo "$GRID" | python3 -c "import sys,json; print(','.join(r['usn'] for r in json.load(sys.stdin)['data']['rows'][:20]))" 2>/dev/null || true)

# Seed marks: first 15 students weak on Q3 (3/10 = 30%), others strong
IMPORT_CSV=$(python3 - <<PY
usns = """$USNS""".split(',')
print("USN,Student Name,Q1,Q2,Q3")
for i, usn in enumerate(usns):
    if not usn: continue
    q3 = "3" if i < 15 else "8"
    print(f"{usn},Student {i+1},8,8,{q3}")
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

HEATMAP=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/heatmap" -H "Authorization: Bearer $FT")

if echo "$HEATMAP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; assert len(d['courseOutcomes'])==5" 2>/dev/null; then
  ok "heatmap returns 5 course outcomes"
else
  fail "course outcomes count"
fi

if echo "$HEATMAP" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
row=d['rows'][0]
co3=next(c for c in row['cells'] if c['coTag']=='CO3')
assert co3['masteryPercent']==30 and co3['band']=='red'
co1=next(c for c in row['cells'] if c['coTag']=='CO1')
assert co1['masteryPercent']==80 and co1['band']=='green'
" 2>/dev/null; then
  ok "color bands: green ≥70%, red <40%"
else
  fail "mastery band thresholds"
fi

if echo "$HEATMAP" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
co3=next(c for c in d['weakClusters'] if c['coTag']=='CO3')
assert co3['isHighlighted'] and co3['weakCount']>=15
" 2>/dev/null; then
  ok "CO3 weak cluster highlighted (>10% below 40%)"
else
  fail "weak cluster highlight"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'marks.heatmap_compute'; then ok "marks.heatmap_compute logged"; else fail "heatmap log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
