#!/usr/bin/env bash
# Story 1.5 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPTS_DIR/_verify_lib.sh"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
PILOT_CARD="10000000-0000-4000-8000-000000000001"

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

echo "=== Story 1.5 verification (API: $API) ==="

FT=$(token "$(login faculty@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

verify_accept_consent "$API" "$FT"
verify_prepare_bcs304_paper_craft "$API" "$FT"

# Unauthenticated denied
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/trust-cards/$PILOT_CARD")
if [ "$STATUS" = "401" ]; then
  ok "trust-cards requires auth (401)"
else
  fail "trust-cards should require auth, got $STATUS"
fi

# Authenticated fetch pilot card
BODY=$(curl -s "$API/api/trust-cards/$PILOT_CARD" -H "Authorization: Bearer $FT")
if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('artifactLabel') and d.get('modelName') else 1)" 2>/dev/null; then
  ok "GET trust-cards/:id returns artifact metadata"
else
  fail "trust card payload incomplete"
fi

if echo "$BODY" | rg -q 'qp_gen v14'; then
  ok "prompt version present"
else
  fail "prompt version missing"
fi

# Paper craft returns trustCardId
GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"courseCode":"BCS304"}')
if echo "$GEN" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('trustCardId') else 1)" 2>/dev/null; then
  ok "paper-craft generate returns trustCardId"
else
  fail "paper-craft missing trustCardId"
fi

NEW_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('trustCardId',''))" 2>/dev/null || true)
if [ -n "$NEW_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/trust-cards/$NEW_ID" -H "Authorization: Bearer $FT")
  if [ "$STATUS" = "200" ]; then
    ok "generated trust card retrievable"
  else
    fail "generated trust card not found ($STATUS)"
  fi
fi

if [ -f "$ROOT/backend/api/src/trust-cards/trust-cards.service.ts" ]; then
  ok "TrustCardsService present"
else
  fail "TrustCardsService missing"
fi

if [ -f "$ROOT/frontend/src/components/TrustCardSlideOver.tsx" ]; then
  ok "TrustCardSlideOver component present"
else
  fail "TrustCardSlideOver missing"
fi

if rg -q 'TrustCardSlideOver' "$ROOT/frontend/app/index.tsx" && rg -q 'TrustCardTrigger' "$ROOT/frontend/app/paper-craft.tsx"; then
  ok "trust card integrated on home + paper-craft"
else
  fail "trust card UI integration missing"
fi

if (cd "$ROOT/frontend" && npm run typecheck >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Demo: tap Trust card on home alert or after Paper Craft generate"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
