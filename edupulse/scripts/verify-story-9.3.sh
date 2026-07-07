#!/usr/bin/env bash
# Story 9.3 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3052}"
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

echo "=== Story 9.3 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/college-radar/cutoff-tracker.service.ts" \
  "$ROOT/frontend/src/components/CutoffTrackerPanel.tsx" \
  "$ROOT/frontend/app/cutoff-tracker.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
accept_consent "$PR"

CUTOFF=$(curl -s "$API/api/college-radar/cutoff-tracker" -H "Authorization: Bearer $PR")
if echo "$CUTOFF" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert 'KCET' in d['examLabel']
assert d['branch'] == 'CSE'
assert d['trendDirection'] == 'slipping'
assert '15.9k' in d['trendNarrative']
assert len(d['pesTrend']) == 3
assert d['pesTrend'][2]['closingRank'] == 23100
assert d['pesTrend'][2]['label'] == '23.1k'
labels = [c['label'] for c in d['comparisons']]
assert 'Rival A' in labels[1]
"; then ok "Cutoff tracker matches prototype"; else fail "Cutoff tracker payload"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
