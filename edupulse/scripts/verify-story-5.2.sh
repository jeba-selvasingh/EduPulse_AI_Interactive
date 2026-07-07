#!/usr/bin/env bash
# Story 5.2 acceptance verification
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

GOOD_CORNERS='{"cornerPoints":[[0.08,0.1],[0.92,0.1],[0.92,0.9],[0.08,0.9]]}'
POOR_CORNERS='{"cornerPoints":[[0.5,0.5],[0.52,0.5]]}'

echo "=== Story 5.2 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/evaluation/sheet-capture.service.ts" \
  "$ROOT/backend/api/src/evaluation/sheet-capture.util.ts" \
  "$ROOT/frontend/src/components/SheetCapturePanel.tsx" \
  "$ROOT/frontend/app/sheet-capture.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

POOR=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/capture/analyze" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$POOR_CORNERS")

if echo "$POOR" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['cornersDetected'] is False
assert d['cornerWarning'] and 'reposition' in d['cornerWarning'].lower()
" 2>/dev/null; then
  ok "poor framing returns reposition warning"
else
  fail "corner detection warning"
fi

AUTO=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/capture/analyze" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"cornerPoints\":[[0.08,0.1],[0.92,0.1],[0.92,0.9],[0.08,0.9]],\"headerText\":\"Roll PES1UG23CS007\"}")

CAPTURE_ID=$(echo "$AUTO" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('captureId',''))" 2>/dev/null || true)

if echo "$AUTO" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['cornersDetected'] is True
assert d['usnDetected'] == 'PES1UG23CS007'
assert d['requiresManualUsn'] is False
" 2>/dev/null; then
  ok "USN auto-detected from sheet header"
else
  fail "USN auto-detection"
fi

MANUAL=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/capture/analyze" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"cornerPoints\":[[0.08,0.1],[0.92,0.1],[0.92,0.9],[0.08,0.9]],\"headerText\":\"Page 1\"}")

MANUAL_ID=$(echo "$MANUAL" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('captureId',''))" 2>/dev/null || true)

if echo "$MANUAL" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['requiresManualUsn'] is True
assert d['usnDetected'] is None
" 2>/dev/null; then
  ok "missing USN enables manual assignment path"
else
  fail "manual USN path"
fi

BEFORE=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard" -H "Authorization: Bearer $FT")
UPLOADED_BEFORE=$(echo "$BEFORE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['progress']['uploaded'])" 2>/dev/null || echo 0)

SAVE=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/capture/confirm" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"captureId\":\"$MANUAL_ID\",\"usn\":\"PES1UG23CS015\"}")

if echo "$SAVE" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['usn'] == 'PES1UG23CS015'
assert d['uploadedTotal'] == int('$UPLOADED_BEFORE') + 1
" 2>/dev/null; then
  ok "manual USN assignment saves capture and increments upload count"
else
  fail "confirm capture with manual USN"
fi

CONFIRM_AUTO=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/capture/confirm" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"captureId\":\"$CAPTURE_ID\",\"usn\":\"PES1UG23CS007\"}")

if echo "$CONFIRM_AUTO" | python3 -c "import sys,json; assert json.load(sys.stdin)['data']['usn']=='PES1UG23CS007'" 2>/dev/null; then
  ok "auto-detected USN can be confirmed"
else
  fail "confirm auto-detected USN"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'evaluation.sheet_capture'; then ok "evaluation.sheet_capture logged"; else fail "evaluation.sheet_capture log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
