#!/usr/bin/env bash
# Story 3.7 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
INST="00000000-0000-4000-8000-000000000001"
VERIFY_COURSE="${VERIFY_COURSE:-BCS304}"

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

prepare_approved_paper() {
  local ft="$1" mt="$2"
  local sample b64 name
  sample=$(curl -s "$API/api/syllabus/sample/pdf" -H "Authorization: Bearer $ft")
  b64=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['base64'])" 2>/dev/null)
  name=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileName'])" 2>/dev/null)
  curl -s -X POST "$API/api/syllabus/courses/$VERIFY_COURSE/upload" \
    -H "Authorization: Bearer $ft" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({"fileName": "$name", "base64": """$b64""", "academicTerm": "Odd Sem 2026"}))
PY
)" >/dev/null
  curl -s -X PUT "$API/api/syllabus/courses/$VERIFY_COURSE/modules" \
    -H "Authorization: Bearer $ft" \
    -H "Content-Type: application/json" \
    -d '{"modules":[{"moduleNumber":1,"title":"Introduction & Arrays","pageStart":4,"pageEnd":18},{"moduleNumber":2,"title":"Linked Lists","pageStart":19,"pageEnd":41},{"moduleNumber":3,"title":"Trees","pageStart":42,"pageEnd":58},{"moduleNumber":4,"title":"Graphs","pageStart":59,"pageEnd":72},{"moduleNumber":5,"title":"Hashing","pageStart":73,"pageEnd":86}]}' >/dev/null
  curl -s -X PUT "$API/api/paper-craft/blueprint/$VERIFY_COURSE" \
    -H "Authorization: Bearer $ft" \
    -H "Content-Type: application/json" \
    -d '{"examType":"SEE","difficulty":{"easy":30,"moderate":50,"hard":20},"bloom":{"l1":10,"l2":25,"l3":35,"l4":20,"l5":10}}' >/dev/null
  GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
    -H "Authorization: Bearer $ft" \
    -H "Content-Type: application/json" \
    -d "{\"courseCode\":\"$VERIFY_COURSE\",\"questionCount\":10}")
  PAPER_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('paperId',''))" 2>/dev/null || true)
  curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/answer-key/generate" -H "Authorization: Bearer $ft" >/dev/null
  curl -s "$API/api/paper-craft/papers/$PAPER_ID/co-po-mapping" -H "Authorization: Bearer $ft" >/dev/null
  curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/moderation/submit" \
    -H "Authorization: Bearer $ft" -H "Content-Type: application/json" -d '{}' >/dev/null
  curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/moderation/approve" \
    -H "Authorization: Bearer $mt" -H "Content-Type: application/json" -d '{}' >/dev/null
  echo "$PAPER_ID"
}

echo "=== Story 3.7 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/paper-craft/paper-export.service.ts" \
  "$ROOT/frontend/src/lib/export-paper-api.ts"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

FT=$(token "$(login faculty@pes.edu)")
MT=$(token "$(login moderator@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

accept_consent "$FT"
PAPER_ID=$(prepare_approved_paper "$FT" "$MT")

EXPORT=$(curl -s -X POST "$API/api/paper-craft/papers/$PAPER_ID/export/pdf" \
  -H "Authorization: Bearer $FT")

if echo "$EXPORT" | python3 -c "
import sys,json,base64
d=json.load(sys.stdin)['data']
required=('institutionName','courseCode','examType','exportedAt','exportedBy','base64','fileName')
if not all(k in d for k in required): raise SystemExit(1)
if d.get('institutionName') != 'PES University': raise SystemExit(1)
if d.get('courseCode') != '$VERIFY_COURSE': raise SystemExit(1)
raw=base64.b64decode(d['base64'])
if raw[:4] != b'%PDF': raise SystemExit(1)
if d.get('byteLength',0) < 500: raise SystemExit(1)
" 2>/dev/null; then
  ok "PDF export includes institution branding and exam metadata"
else
  fail "PDF export payload invalid"
fi

if echo "$EXPORT" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
if not d.get('includesAnswerKey'): raise SystemExit(1)
if d.get('moderationStatus') != 'approved': raise SystemExit(1)
" 2>/dev/null; then
  ok "approved paper export includes answer key bundle"
else
  fail "export answer key bundle flag invalid"
fi

DRAFT_GEN=$(curl -s -X POST "$API/api/paper-craft/generate" \
  -H "Authorization: Bearer $FT" \
  -H "Content-Type: application/json" \
  -d "{\"courseCode\":\"$VERIFY_COURSE\",\"questionCount\":6}")
DRAFT_ID=$(echo "$DRAFT_GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('paperId',''))" 2>/dev/null || true)
BLOCKED=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/paper-craft/papers/$DRAFT_ID/export/pdf" \
  -H "Authorization: Bearer $FT")
if [ "$BLOCKED" = "400" ]; then
  ok "unapproved paper export rejected"
else
  fail "expected 400 for unapproved export, got $BLOCKED"
fi

LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='paper.export_pdf' for e in d) else 1)" 2>/dev/null; then
  ok "paper.export_pdf log recorded with timestamp metadata"
else
  fail "export log missing"
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
