#!/usr/bin/env bash
# Story 8.3 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3049}"
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

echo "=== Story 8.3 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/dean-pulse/monday-digest.service.ts" \
  "$ROOT/backend/api/src/dean-pulse/monday-digest.schema.ts" \
  "$ROOT/backend/api/src/dean-pulse/whatsapp-digest-queue.service.ts" \
  "$ROOT/frontend/src/components/MondayDigestPanel.tsx" \
  "$ROOT/frontend/app/monday-digest.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
ST=$(token "$(login student@pes.edu)")

if [ -n "$PR" ]; then ok "Principal login"; else fail "Principal login"; fi
accept_consent "$PR"

DIGEST=$(curl -s "$API/api/dean-pulse/monday-digest" -H "Authorization: Bearer $PR")
if echo "$DIGEST" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['digest']['papersGenerated'] == 34
assert d['digest']['hoursSaved'] == 61
assert d['digest']['studentsRecovered'] == 6
assert d['preferences']['inAppEnabled'] is True
assert d['preferences']['whatsappEnabled'] is True
channels = {x['channel']: x['status'] for x in d['lastDelivery']}
assert channels.get('in_app') == 'delivered'
"; then ok "Monday digest default view"; else fail "Monday digest view"; fi

OPT_OUT=$(curl -s -X PATCH "$API/api/dean-pulse/monday-digest/preferences" \
  -H "Authorization: Bearer $PR" \
  -H "Content-Type: application/json" \
  -d '{"whatsappEnabled": false}')
if echo "$OPT_OUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['preferences']['whatsappEnabled'] is False
channels = {x['channel']: x['status'] for x in d['lastDelivery']}
assert channels.get('whatsapp') == 'opted_out'
"; then ok "WhatsApp opt-out per channel"; else fail "Opt-out preferences"; fi

TRIGGER=$(curl -s -X POST "$API/api/dean-pulse/monday-digest/trigger" \
  -H "Authorization: Bearer $PR" \
  -H "Content-Type: application/json")
if echo "$TRIGGER" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
wa = next(x for x in d['lastDelivery'] if x['channel'] == 'whatsapp')
assert wa['status'] == 'opted_out'
"; then ok "Trigger respects WhatsApp opt-out"; else fail "Trigger with opt-out"; fi

OPT_IN=$(curl -s -X PATCH "$API/api/dean-pulse/monday-digest/preferences" \
  -H "Authorization: Bearer $PR" \
  -H "Content-Type: application/json" \
  -d '{"whatsappEnabled": true}')
curl -s -X POST "$API/api/dean-pulse/monday-digest/trigger" \
  -H "Authorization: Bearer $PR" >/dev/null

FINAL=$(curl -s "$API/api/dean-pulse/monday-digest" -H "Authorization: Bearer $PR")
if echo "$FINAL" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
wa = next(x for x in d['lastDelivery'] if x['channel'] == 'whatsapp')
assert wa['status'] == 'queued'
assert wa['queueId'] is not None
"; then ok "WhatsApp pilot queues digest"; else fail "WhatsApp queue"; fi

accept_consent "$ST"
ST_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/dean-pulse/monday-digest" -H "Authorization: Bearer $ST")
if [ "$ST_CODE" = "403" ]; then ok "Student denied monday digest (403)"; else fail "Student should get 403, got $ST_CODE"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
