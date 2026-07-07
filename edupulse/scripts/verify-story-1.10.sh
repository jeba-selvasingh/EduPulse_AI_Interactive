#!/usr/bin/env bash
# Story 1.10 acceptance verification
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:3000}"
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

echo "=== Story 1.10 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/cohort/cohort.service.ts" \
  "$ROOT/backend/api/src/cohort/cohort-csv.parser.ts" \
  "$ROOT/backend/api/src/cohort/pilot-bcs304.seed.ts" \
  "$ROOT/frontend/app/mark-matrix.tsx" \
  "$ROOT/frontend/app/answer-sheet.tsx" \
  "$ROOT/frontend/app/admin/cohort-import.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

AT=$(token "$(login admin@pes.edu)")
FT=$(token "$(login faculty@pes.edu)")

if [ -n "$AT" ]; then ok "admin login"; else fail "admin login"; fi
if [ -n "$FT" ]; then ok "faculty login"; else fail "faculty login"; fi

accept_consent "$AT"
accept_consent "$FT"

TEMPLATE=$(curl -s "$API/api/cohort/import/template" -H "Authorization: Bearer $AT")
if echo "$TEMPLATE" | rg -q 'USN,Student Name,Course Code'; then
  ok "CSV template endpoint"
else
  fail "CSV template missing columns"
fi

SAMPLE=$(curl -s "$API/api/cohort/import/sample" -H "Authorization: Bearer $AT")
SAMPLE_CSV=$(echo "$SAMPLE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['csv'])" 2>/dev/null || true)

if [ -n "$SAMPLE_CSV" ]; then
  ROWS=$(echo "$SAMPLE_CSV" | wc -l | tr -d ' ')
  if [ "$ROWS" -ge 65 ]; then ok "pilot sample has 64+ data rows"; else fail "sample row count ($ROWS)"; fi
else
  fail "sample CSV fetch"
fi

# Faculty roster (auto-seeded on module init)
ROSTER=$(curl -s "$API/api/cohort/courses/BCS304/roster" -H "Authorization: Bearer $FT")
if echo "$ROSTER" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('total')==64 else 1)" 2>/dev/null; then
  ok "BCS304 roster lists 64 students"
else
  fail "roster count not 64"
fi

if echo "$ROSTER" | python3 -c "import sys,json; s=json.load(sys.stdin)['data']['students'][0]; exit(0 if s.get('usn') and s.get('name') else 1)" 2>/dev/null; then
  ok "roster entries have USN and name"
else
  fail "roster entry shape"
fi

# Idempotent re-import
IMPORT1=$(curl -s -X POST "$API/api/cohort/import" \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
csv = """$SAMPLE_CSV"""
print(json.dumps({"csv": csv}))
PY
)")

if echo "$IMPORT1" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('studentsCreated',-1)==0 and d.get('enrollmentsCreated',-1)==0 else 1)" 2>/dev/null; then
  ok "re-import is idempotent (0 new students/enrollments)"
else
  fail "re-import created duplicates"
fi

# Update existing USN name
IMPORT2=$(curl -s -X POST "$API/api/cohort/import" \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  -d '{"csv":"USN,Student Name,Course Code,Section,Semester\nPES1UG23CS001,Updated Pilot Name,BCS304,CSE-A,Odd Sem 2026"}')

if echo "$IMPORT2" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if d.get('studentsUpdated',0)>=1 else 1)" 2>/dev/null; then
  ok "existing USN update counted"
else
  fail "USN update not reflected"
fi

# Row-level error reporting
IMPORT3=$(curl -s -X POST "$API/api/cohort/import" \
  -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" \
  -d '{"csv":"USN,Student Name,Course Code,Section,Semester\n,Broken Row,BCS304,CSE-A,Odd Sem 2026"}')

if echo "$IMPORT3" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); exit(0 if len(d.get('errors',[]))>=1 else 1)" 2>/dev/null; then
  ok "row-level errors reported"
else
  fail "missing row errors"
fi

# No PII in import logs
PT=$(token "$(login principal@pes.edu)")
accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); exit(0 if any(e.get('action')=='cohort.import' for e in d) else 1)" 2>/dev/null; then
  ok "cohort.import structured log recorded"
else
  fail "cohort.import log missing"
fi

if echo "$LOGS" | rg -q 'Aditi|Updated Pilot|studentName'; then
  fail "PII found in import logs"
else
  ok "no student names in import logs"
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
