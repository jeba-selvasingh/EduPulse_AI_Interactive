#!/usr/bin/env bash
# Story 2.1 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
STORAGE_ROOT="${SYLLABUS_STORAGE_PATH:-$ROOT/backend/api/uploads/syllabus}"

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

echo "=== Story 2.1 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/syllabus/syllabus.service.ts" \
  "$ROOT/backend/api/src/syllabus/syllabus.controller.ts" \
  "$ROOT/backend/api/src/syllabus/syllabus-storage.service.ts" \
  "$ROOT/frontend/app/syllabus-vault.tsx" \
  "$ROOT/frontend/src/lib/syllabus-api.ts"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
AT=$(token "$(login admin@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi
if [ -n "$AT" ]; then ok "admin login"; else fail "admin login"; fi

accept_consent "$FT"
accept_consent "$AT"
accept_consent "$PT"

SAMPLE=$(curl -s "$API/api/syllabus/sample/pdf" -H "Authorization: Bearer $FT")
SAMPLE_B64=$(echo "$SAMPLE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['base64'])" 2>/dev/null || true)
SAMPLE_NAME=$(echo "$SAMPLE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileName'])" 2>/dev/null || true)

if [ -n "$SAMPLE_B64" ]; then ok "sample PDF endpoint"; else fail "sample PDF endpoint"; fi

UPLOAD=$(curl -s -X POST "$API/api/syllabus/courses/BCS304/upload" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "fileName": "$SAMPLE_NAME",
  "base64": """$SAMPLE_B64""",
  "academicTerm": "Odd Sem 2026"
}))
PY
)")

if echo "$UPLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}).get('record',{}); exit(0 if d.get('courseCode')=='BCS304' and d.get('mimeType')=='application/pdf' else 1)" 2>/dev/null; then
  ok "PDF upload linked to BCS304"
else
  fail "PDF upload failed"
fi

STORAGE_KEY=$(echo "$UPLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['record']['storageKey'])" 2>/dev/null || true)
if [ -n "$STORAGE_KEY" ] && [ -f "$STORAGE_ROOT/$STORAGE_KEY" ]; then
  ok "PDF stored on-prem"
else
  fail "PDF file missing on disk ($STORAGE_ROOT/$STORAGE_KEY)"
fi

GET=$(curl -s "$API/api/syllabus/courses/BCS304" -H "Authorization: Bearer $FT")
if echo "$GET" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('fileName') and d.get('uploadedAt') else 1)" 2>/dev/null; then
  ok "syllabus metadata retrievable"
else
  fail "syllabus GET failed"
fi

INVALID=$(curl -s -w "\n%{http_code}" -X POST "$API/api/syllabus/courses/BCS304/upload" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"notes.txt","base64":"VGhpcyBpcyBub3QgYSBQREYgZmlsZQ=="}')

HTTP_CODE=$(echo "$INVALID" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  ok "non-PDF rejected with 400"
else
  fail "non-PDF not rejected (HTTP $HTTP_CODE)"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='syllabus.upload' and e.get('userId') for e in d) else 1)" 2>/dev/null; then
  ok "syllabus.upload log with user"
else
  fail "syllabus.upload log missing"
fi

if echo "$LOGS" | rg -q '%PDF|base64|VGhpc'; then
  fail "PDF payload found in logs"
else
  ok "no file content in logs"
fi

REUPLOAD=$(curl -s -X POST "$API/api/syllabus/courses/BCS304/upload" \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "fileName": "$SAMPLE_NAME",
  "base64": """$SAMPLE_B64""",
  "academicTerm": "Odd Sem 2026"
}))
PY
)")

if echo "$REUPLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('requiresActivation') is True else 1)" 2>/dev/null; then
  ok "re-upload creates pending version"
else
  fail "re-upload versioning"
fi

if (cd "$ROOT/backend/api" && npm run build >/dev/null 2>&1); then
  ok "backend builds"
else
  fail "backend build failed"
fi

if (cd "$ROOT/frontend" && npx tsc --noEmit >/dev/null 2>&1); then
  ok "frontend typechecks"
else
  fail "frontend typecheck failed"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
