#!/usr/bin/env bash
# Story 9.1 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3050}"
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

echo "=== Story 9.1 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/college-radar/peer-league.service.ts" \
  "$ROOT/backend/api/src/college-radar/pilot-rivals.seed.ts" \
  "$ROOT/frontend/src/components/PeerLeaguePanel.tsx" \
  "$ROOT/frontend/app/college-radar.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
TPO=$(token "$(login tpo@pes.edu)")

if [ -n "$PR" ]; then ok "Principal login"; else fail "Principal login"; fi
accept_consent "$PR"

LEAGUE=$(curl -s "$API/api/college-radar/league" -H "Authorization: Bearer $PR")
if echo "$LEAGUE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['rivalsWatched'] == 5
assert d['clusterSize'] == 6
assert '#2 of 6' in d['positionSummary']
assert '26' in d['rankDeltaNarrative']
assert len(d['entries']) == 5
pes = next(e for e in d['entries'] if e['isSelf'])
assert pes['name'] == 'PES University'
assert pes['nirfRank'] == 168
assert pes['placementPct'] == 78
rival_d = next(e for e in d['entries'] if e['id'] == 'rival-d')
assert rival_d['placementLabel'] == '65%*'
assert rival_d['nirfRank'] is None
"; then ok "Peer league payload matches prototype"; else fail "Peer league payload"; fi

accept_consent "$TPO"
TPO_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/college-radar/league" -H "Authorization: Bearer $TPO")
if [ "$TPO_CODE" = "403" ]; then ok "TPO denied college-radar (403)"; else fail "TPO should get 403, got $TPO_CODE"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
