#!/usr/bin/env bash
# Story 9.4 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3053}"
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

echo "=== Story 9.4 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/college-radar/rival-feed.service.ts" \
  "$ROOT/backend/api/src/college-radar/rival-feed-store.service.ts" \
  "$ROOT/frontend/src/components/RivalFeedPanel.tsx" \
  "$ROOT/frontend/app/rival-feed.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

PR=$(token "$(login principal@pes.edu)")
AD=$(token "$(login admin@pes.edu)")
accept_consent "$PR"
accept_consent "$AD"

FEED=$(curl -s "$API/api/college-radar/rival-feed" -H "Authorization: Bearer $PR")
if echo "$FEED" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert len(d['items']) >= 4
titles = [i['title'] for i in d['items']]
assert any('AI & DS' in t for t in titles)
assert any('Bosch' in t for t in titles)
assert all(i['sourceUrl'].startswith('http') for i in d['items'])
"; then ok "Rival feed seeded items"; else fail "Rival feed list"; fi

CREATE=$(curl -s -X POST "$API/api/college-radar/rival-feed" \
  -H "Authorization: Bearer $AD" \
  -H "Content-Type: application/json" \
  -d '{
    "rivalId": "rival-b",
    "title": "Test curated item",
    "summary": "Admin added feed entry",
    "sourceUrl": "https://example.edu/test",
    "sourceLabel": "test source"
  }')
if echo "$CREATE" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['title'] == 'Test curated item'
assert d['rivalId'] == 'rival-b'
"; then ok "Admin can create feed item"; else fail "Admin create feed"; fi

ITEM_ID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
PATCH=$(curl -s -X PATCH "$API/api/college-radar/rival-feed/$ITEM_ID" \
  -H "Authorization: Bearer $AD" \
  -H "Content-Type: application/json" \
  -d '{"summary": "Updated summary"}')
if echo "$PATCH" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['summary'] == 'Updated summary'
"; then ok "Admin can update feed item"; else fail "Admin patch feed"; fi

PR_DENY=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/college-radar/rival-feed" \
  -H "Authorization: Bearer $PR" \
  -H "Content-Type: application/json" \
  -d '{"rivalId":"rival-a","title":"x","summary":"y","sourceUrl":"https://x.com","sourceLabel":"z"}')
if [ "$PR_DENY" = "403" ]; then ok "Principal denied feed create (403)"; else fail "Principal should get 403, got $PR_DENY"; fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
