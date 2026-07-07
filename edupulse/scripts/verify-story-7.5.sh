#!/usr/bin/env bash
# Story 7.5 acceptance verification
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

echo "=== Story 7.5 verification (API: $API) ==="

for f in \
  "$ROOT/backend/api/src/campus-drive/drive-calendar.service.ts" \
  "$ROOT/backend/api/src/campus-drive/drive-calendar.schema.ts" \
  "$ROOT/backend/api/src/campus-drive/whatsapp-reminder-queue.service.ts" \
  "$ROOT/frontend/src/components/DriveCalendarPanel.tsx" \
  "$ROOT/frontend/app/drive-calendar.tsx"
do
  if [ -f "$f" ]; then ok "$(basename "$f") present"; else fail "$(basename "$f") missing"; fi
done

TPO=$(token "$(login tpo@pes.edu)")
ST=$(token "$(login student@pes.edu)")
PT=$(token "$(login principal@pes.edu)")

if [ -n "$TPO" ]; then ok "TPO login"; else fail "TPO login"; fi
accept_consent "$TPO"

CAL=$(curl -s "$API/api/campus-drive/drive-calendar" -H "Authorization: Bearer $TPO")
if echo "$CAL" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['monthLabel'] == 'Aug 2026'
assert d['whatsappPilotEnabled'] is True
assert len(d['drives']) == 5
tcs = next(x for x in d['drives'] if x['driveId'] == 'tcs-digital')
assert tcs['eligibleCount'] == 142
assert tcs['registeredCount'] == 98
assert tcs['pendingCount'] == 44
assert d['actionAlert']['pendingCount'] == 44
assert 'TCS Digital' in d['actionAlert']['message']
" 2>/dev/null; then
  ok "calendar lists drives with registration counts and action alert"
else
  fail "drive calendar overview payload"
fi

DETAIL=$(curl -s "$API/api/campus-drive/drive-calendar?driveId=tcs-digital" -H "Authorization: Bearer $TPO")
if echo "$DETAIL" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['companyName'] == 'TCS Digital'
assert d['pendingCount'] == 44
assert d['unregisteredEligibleCount'] == 44
assert d['canSendReminder'] is True
assert d['rules']['minCgpa'] == 7.0
assert len(d['unregisteredEligibleStudents']) > 0
" 2>/dev/null; then
  ok "drive detail shows eligibility rules and unregistered students"
else
  fail "drive calendar detail payload"
fi

REMIND=$(curl -s -X POST "$API/api/campus-drive/drive-calendar/reminders" \
  -H "Authorization: Bearer $TPO" \
  -H "Content-Type: application/json" \
  -d '{"driveId":"tcs-digital"}')
if echo "$REMIND" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
assert d['queued'] is True
assert d['recipientCount'] == 44
assert d['channel'] == 'whatsapp'
assert d['templateId'] == 'drive_registration_reminder_v1'
assert d['auditLogAction'] == 'campus.drive_reminder_queued'
" 2>/dev/null; then
  ok "WhatsApp reminder queued with audit metadata"
else
  fail "drive reminder queue payload"
fi

STUDENT_CODE=$(curl -s -o /tmp/st75-403.json -w "%{http_code}" \
  "$API/api/campus-drive/drive-calendar" -H "Authorization: Bearer $ST")
if [ "$STUDENT_CODE" = "403" ]; then ok "student denied drive calendar access"; else fail "student access (status=$STUDENT_CODE)"; fi

accept_consent "$PT"
LOGS=$(curl -s "$API/api/observability/logs/recent" -H "Authorization: Bearer $PT")
if echo "$LOGS" | grep -q 'campus.drive_calendar_view'; then ok "campus.drive_calendar_view logged"; else fail "drive calendar view log missing"; fi
if echo "$LOGS" | grep -q 'campus.drive_reminder_queued'; then ok "campus.drive_reminder_queued logged"; else fail "drive reminder log missing"; fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
