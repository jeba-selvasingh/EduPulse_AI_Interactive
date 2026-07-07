#!/usr/bin/env bash
# Story 8.2 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3048}"
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

echo "=== Story 8.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/dean-pulse/alert-inbox.service.ts" \
  "$ROOT/backend/api/src/dean-pulse/alert-inbox.schema.ts" \
  "$ROOT/backend/api/src/dean-pulse/pilot-alerts.seed.ts" \
  "$ROOT/frontend/app/alerts.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FAC=$(token "$(login faculty@pes.edu)")
MOD=$(token "$(login moderator@pes.edu)")
TPO=$(token "$(login tpo@pes.edu)")
PR=$(token "$(login principal@pes.edu)")
ST=$(token "$(login student@pes.edu)")

if [ -n "$FAC" ]; then ok "Faculty login"; else fail "Faculty login"; fi
if [ -n "$MOD" ]; then ok "Moderator login"; else fail "Moderator login"; fi
if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
if [ -n "$PR" ]; then ok "Principal login"; else fail "Principal login"; fi

accept_consent "$FAC"
accept_consent "$MOD"
accept_consent "$TPO"
accept_consent "$PR"
accept_consent "$ST"

FAC_ALERTS=$(curl -s "$API/api/alerts" -H "Authorization: Bearer $FAC")
if echo "$FAC_ALERTS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['unreadCount'] >= 1
ids = {a['id'] for a in d['alerts']}
assert '80000000-0000-4000-8000-000000000001' in ids
assert '80000000-0000-4000-8000-000000000002' not in ids
at_risk = next(a for a in d['alerts'] if a['type'] == 'at_risk')
assert at_risk['ctaLabel'] == 'Review plan →'
"; then ok "Faculty sees at-risk only"; else fail "Faculty alert filter"; fi

MOD_ALERTS=$(curl -s "$API/api/alerts" -H "Authorization: Bearer $MOD")
if echo "$MOD_ALERTS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
types = {a['type'] for a in d['alerts']}
assert 'approval_needed' in types
"; then ok "Moderator sees approval alert"; else fail "Moderator alert filter"; fi

TPO_ALERTS=$(curl -s "$API/api/alerts" -H "Authorization: Bearer $TPO")
if echo "$TPO_ALERTS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
types = {a['type'] for a in d['alerts']}
assert 'at_risk' in types and 'recovery_win' in types
assert len(d['alerts']) == 2
assert d['unreadCount'] == 2
"; then ok "TPO sees 2 role-filtered alerts"; else fail "TPO alert inbox"; fi

HOME=$(curl -s "$API/api/home/summary" -H "Authorization: Bearer $PR")
if echo "$HOME" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['unreadAlertCount'] == 3
"; then ok "Principal home unread badge count"; else fail "Home unread count"; fi

ST_ALERTS=$(curl -s "$API/api/alerts" -H "Authorization: Bearer $ST")
if echo "$ST_ALERTS" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert len(d['alerts']) == 0
assert d['unreadCount'] == 0
"; then ok "Student gets empty inbox"; else fail "Student alert filter"; fi

READ=$(curl -s -X PATCH "$API/api/alerts/80000000-0000-4000-8000-000000000001/read" -H "Authorization: Bearer $PR")
if echo "$READ" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['isRead'] is True
"; then ok "Mark alert read"; else fail "Mark read"; fi

HOME2=$(curl -s "$API/api/home/summary" -H "Authorization: Bearer $PR")
if echo "$HOME2" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['unreadAlertCount'] == 2
"; then ok "Unread count decrements after read"; else fail "Unread decrement"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
