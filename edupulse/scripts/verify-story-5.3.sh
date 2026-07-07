#!/usr/bin/env bash
# Story 5.3 acceptance verification
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

echo "=== Story 5.3 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/evaluation/bulk-upload.service.ts" \
  "$ROOT/backend/api/src/evaluation/bulk-upload.util.ts" \
  "$ROOT/frontend/src/components/BulkUploadPanel.tsx" \
  "$ROOT/frontend/app/bulk-upload.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
accept_consent "$FT"

SAMPLE=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/bulk/sample" -H "Authorization: Bearer $FT")
if echo "$SAMPLE" | python3 -c "import sys,json; assert len(json.load(sys.stdin)['data']['entries'])==3" 2>/dev/null; then
  ok "bulk sample lists USN-named entries"
else
  fail "bulk sample"
fi

BEFORE=$(curl -s "$API/api/evaluation/assessments/$COURSE/$EXAM/dashboard" -H "Authorization: Bearer $FT")
UPLOADED_BEFORE=$(echo "$BEFORE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['progress']['uploaded'])" 2>/dev/null || echo 0)

UPLOAD=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/bulk/upload" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$(echo "$SAMPLE" | python3 -c 'import sys,json; sample=json.load(sys.stdin)["data"]; print(json.dumps({"fileName": sample["fileName"], "entries": [{"fileName": e["fileName"], "estimatedDpi": e["estimatedDpi"]} for e in sample["entries"]]}))')")

if echo "$UPLOAD" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['acceptedCount'] == 3
assert d['kind'] == 'zip'
assert len(d['mapped']) == 3
assert d['mapped'][0]['usn'].startswith('PES1UG23CS')
assert d['uploadedTotal'] == int('$UPLOADED_BEFORE') + 3
" 2>/dev/null; then
  ok "ZIP batch maps USN-named PDFs to students"
else
  fail "bulk upload mapping"
fi

if echo "$UPLOAD" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert any('200 DPI' in w['message'] for w in d['qualityWarnings'])
" 2>/dev/null; then
  ok "low-DPI scan returns rescan warning"
else
  fail "low-DPI quality warning"
fi

PDF_UPLOAD=$(curl -s -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/bulk/upload" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"PES1UG23CS010.pdf","estimatedDpi":300}')

if echo "$PDF_UPLOAD" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
assert d['kind'] == 'pdf'
assert d['acceptedCount'] == 1
assert d['mapped'][0]['usn'] == 'PES1UG23CS010'
" 2>/dev/null; then
  ok "single PDF upload accepted by USN filename"
else
  fail "PDF upload"
fi

OVERSIZE=$(curl -s -o /tmp/st53-body.json -w "%{http_code}" -X POST "$API/api/evaluation/assessments/$COURSE/$EXAM/bulk/upload" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"huge.zip","byteLength":210763776,"entries":[]}')

if [ "$OVERSIZE" = "400" ] && grep -q '200 MB' /tmp/st53-body.json 2>/dev/null; then
  ok "upload over 200MB rejected with size-limit message"
else
  fail "200MB size limit (status=$OVERSIZE)"
fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'evaluation.bulk_upload'; then ok "evaluation.bulk_upload logged"; else fail "evaluation.bulk_upload log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
