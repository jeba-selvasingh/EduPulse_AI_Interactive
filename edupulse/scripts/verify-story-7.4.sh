#!/usr/bin/env bash
# Story 7.4 acceptance verification
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

echo "=== Story 7.4 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/training-module-dashboard.service.ts" \
  "$ROOT/backend/api/src/campus-drive/training-module-dashboard.schema.ts" \
  "$ROOT/frontend/src/components/TrainingModuleDashboardsPanel.tsx" \
  "$ROOT/frontend/app/training-dashboards.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

ALL=$(curl -s "$API/api/campus-drive/training-dashboards" -H "Authorization: Bearer $TPO")
if echo "$ALL" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['batchStrength'] == 146
assert len(d['tracks']) == 3
tracks = {t['track']: t for t in d['tracks']}
assert tracks['aptitude']['batchAvgPercent'] == 62
assert tracks['aptitude']['benchmarkPercent'] == 68
assert tracks['soft_skills']['batchAvgPercent'] == 48
assert tracks['technical']['batchAvgPercent'] == 58
assert d['weakestTrackId'] == 'soft_skills'
quant = next(m for m in tracks['aptitude']['modules'] if m['id'] == 'quantitative')
assert quant['isWeakestInTrack'] is True
assert quant['batchAvgPercent'] == 52
assert quant['targetPercent'] == 75
" 2>/dev/null; then
  ok "overview shows three tracks, benchmarks, and weakest area"
else
  fail "training dashboards overview payload"
fi

APT=$(curl -s "$API/api/campus-drive/training-dashboards?track=aptitude" -H "Authorization: Bearer $TPO")
if echo "$APT" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['activeTrack'] == 'aptitude'
assert len(d['tracks']) == 1
assert d['tracks'][0]['title'] == 'Aptitude training plan'
assert len(d['tracks'][0]['modules']) == 4
" 2>/dev/null; then
  ok "aptitude track filter returns module breakdown"
else
  fail "aptitude track filter payload"
fi

STUDENT_CODE=$(curl -s -o /tmp/st74-403.json -w "%{http_code}" \
  "$API/api/campus-drive/training-dashboards" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied training dashboards access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.training_dashboards_view'; then ok "campus.training_dashboards_view logged"; else fail "training dashboards log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
