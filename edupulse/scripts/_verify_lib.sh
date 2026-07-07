# Shared helpers for verify-story scripts (source from scripts/*.sh)

verify_login() {
  local api="$1" email="$2" inst="$3"
  curl -s -X POST "$api/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"pilot123\",\"institutionId\":\"$inst\"}"
}

verify_token() {
  echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true
}

verify_accept_consent() {
  curl -s -X POST "$1/api/consent/accept" -H "Authorization: Bearer $2" >/dev/null
}

# Minimal BCS304 syllabus + modules so paper-craft generate succeeds on a fresh API.
verify_prepare_bcs304_paper_craft() {
  local api="$1" tok="$2"
  local sample b64 name
  sample=$(curl -s "$api/api/syllabus/sample/pdf" -H "Authorization: Bearer $tok")
  b64=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['base64'])" 2>/dev/null)
  name=$(echo "$sample" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileName'])" 2>/dev/null)
  curl -s -X POST "$api/api/syllabus/courses/BCS304/upload" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({"fileName": "$name", "base64": """$b64""", "academicTerm": "Odd Sem 2026"}))
PY
)" >/dev/null
  curl -s -X PUT "$api/api/syllabus/courses/BCS304/modules" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    -d '{"modules":[{"moduleNumber":1,"title":"Introduction & Arrays","pageStart":4,"pageEnd":18},{"moduleNumber":3,"title":"Trees","pageStart":42,"pageEnd":58}]}' >/dev/null
}

verify_resolve_flagged_reviews() {
  local api="$1" tok="$2" course="$3" exam="$4" usn="$5"
  curl -s "$api/api/evaluation/assessments/$course/$exam/review/flagged" \
    -H "Authorization: Bearer $tok" > /tmp/verify-flagged.json
  verify_resolve_flagged_file "$api" "$tok" "$course" "$exam" "$usn"
}

verify_resolve_all_flagged_reviews() {
  local api="$1" tok="$2" course="$3" exam="$4"
  curl -s "$api/api/evaluation/assessments/$course/$exam/review/flagged" \
    -H "Authorization: Bearer $tok" > /tmp/verify-flagged.json
  verify_resolve_flagged_file "$api" "$tok" "$course" "$exam" ""
}

verify_resolve_flagged_file() {
  local api="$1" tok="$2" course="$3" exam="$4" primary_usn="$5"
  python3 - <<'PY' "$primary_usn" "$api" "$tok" "$course" "$exam"
import json, subprocess, sys
primary_usn, api, tok, course, exam = sys.argv[1:6]
items = json.load(open('/tmp/verify-flagged.json'))['data']
if primary_usn:
    items = [i for i in items if i['usn'] == primary_usn]
for item in items:
    usn = item['usn']
    qid = item['questionId']
    if primary_usn and usn == primary_usn and qid == 'Q2':
        body = '{"marksAwarded":6,"facultyNote":"Partial credit for attempted rotation steps"}'
        url = f"{api}/api/evaluation/assessments/{course}/{exam}/review/{usn}/{qid}/override"
        subprocess.run([
            'curl', '-s', '-o', '/dev/null', '-X', 'POST', url,
            '-H', f'Authorization: Bearer {tok}',
            '-H', 'Content-Type: application/json',
            '-d', body,
        ], check=False)
    elif primary_usn and usn == primary_usn and qid == 'Q3':
        body = '{"waiverReason":"Low-confidence edge case waived for pilot publish"}'
        url = f"{api}/api/evaluation/assessments/{course}/{exam}/review/{usn}/{qid}/waive"
        subprocess.run([
            'curl', '-s', '-o', '/dev/null', '-X', 'POST', url,
            '-H', f'Authorization: Bearer {tok}',
            '-H', 'Content-Type: application/json',
            '-d', body,
        ], check=False)
    else:
        url = f"{api}/api/evaluation/assessments/{course}/{exam}/review/{usn}/{qid}/accept"
        subprocess.run([
            'curl', '-s', '-o', '/dev/null', '-X', 'POST', url,
            '-H', f'Authorization: Bearer {tok}',
        ], check=False)
PY
}
