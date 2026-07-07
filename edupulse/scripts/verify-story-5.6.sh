#!/usr/bin/env bash
# Story 5.6 acceptance verification
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

echo "=== Story 5.6 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/evaluation/batch-insights.service.ts" \
  "$ROOT/backend/api/src/evaluation/batch-insights.util.ts" \
  "$ROOT/backend/api/src/evaluation/batch-insights.schema.ts" \
  "$ROOT/frontend/src/components/BatchEvaluationDashboardPanel.tsx" \
  "$ROOT/frontend/app/batch-evaluation.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

for USN in PES1UG23CS001 PES1UG23CS002 PES1UG23CS003; do
  curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/evaluate/$USN" \
    -H "Authorization: Bearer $FT" >/dev/null
done

INSIGHTS=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/batch/insights" -H "Authorization: Bearer $FT")

if echo "$INSIGHTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['evaluatedCount'] >= 3
assert len(d['scoreDistribution']) == 4
assert sum(b['count'] for b in d['scoreDistribution']) == d['evaluatedCount']
assert len(d['questionAverages']) == 3
assert all('averageMarks' in q for q in d['questionAverages'])
assert d['weakestQuestion'] is not None
assert d['weakestQuestion']['thresholdMarks'] == 5
assert 'belowThresholdCount' in d['weakestQuestion']
assert d['insightMessage']
" 2>/dev/null; then
  ok "batch insights returns distribution, averages, and weakest question"
else
  fail "batch insights payload"
fi

if echo "$INSIGHTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
weakest = min(d['questionAverages'], key=lambda q: q['averageMarks'])
assert d['weakestQuestion']['questionId'] == weakest['questionId']
" 2>/dev/null; then
  ok "weakest question matches lowest class average"
else
  fail "weakest question selection"
fi

REFRESH=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/batch/refresh-heatmap" \
  -H "Authorization: Bearer $FT")

if echo "$REFRESH" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['importedCells'] >= 9
assert d['heatmapStudentsWithMarks'] >= 3
assert 'insightMessage' in d
" 2>/dev/null; then
  ok "heatmap refresh imports evaluated marks and recomputes heatmap"
else
  fail "heatmap refresh payload"
fi

HEATMAP=$(curl -s "$API/api/marks/assessments/$COURSE/$EXAM/heatmap" -H "Authorization: Bearer $FT")
if echo "$HEATMAP" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['studentsWithMarks'] >= 3
" 2>/dev/null; then
  ok "mark matrix heatmap reflects synced evaluation marks"
else
  fail "heatmap after refresh"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'evaluation.batch_insights'; then ok "evaluation.batch_insights logged"; else fail "evaluation.batch_insights log missing"; fi
if echo "$LOGS" | grep -q 'evaluation.heatmap_refresh'; then ok "evaluation.heatmap_refresh logged"; else fail "evaluation.heatmap_refresh log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
