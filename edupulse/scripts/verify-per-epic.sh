#!/usr/bin/env bash
# Run verify-story scripts per epic with a fresh API instance each epic.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS="$ROOT/scripts"
API_DIR="$ROOT/backend/api"
PORT=3099
BASE="http://localhost:$PORT"

# Run 1.9 before 1.8 — consent gate tests need a user who has not accepted yet.
declare -a EPIC_1_SCRIPTS=(1.1 1.2 1.3 1.4 1.5 1.6 1.7 1.9 1.8 1.10 1.11)
declare -a EPIC_2_SCRIPTS=(2.1 2.2 2.3)
declare -a EPIC_3_SCRIPTS=(3.1 3.2 3.3 3.4 3.5 3.6 3.7)
declare -a EPIC_4_SCRIPTS=(4.1 4.2 4.3 4.4)
declare -a EPIC_5_SCRIPTS=(5.1 5.2 5.3 5.4 5.5 5.6 5.7 5.8)
declare -a EPIC_6_SCRIPTS=(6.1 6.2 6.3 6.4 6.5)
declare -a EPIC_7_SCRIPTS=(7.1 7.2 7.3 7.4 7.5 7.6 7.7 7.8)
declare -a EPIC_8_SCRIPTS=(8.1 8.2 8.3)
declare -a EPIC_9_SCRIPTS=(9.1 9.2 9.3 9.4 9.5 9.6)

epic_scripts() {
  case "$1" in
    1) printf '%s\n' "${EPIC_1_SCRIPTS[@]}" ;;
    2) printf '%s\n' "${EPIC_2_SCRIPTS[@]}" ;;
    3) printf '%s\n' "${EPIC_3_SCRIPTS[@]}" ;;
    4) printf '%s\n' "${EPIC_4_SCRIPTS[@]}" ;;
    5) printf '%s\n' "${EPIC_5_SCRIPTS[@]}" ;;
    6) printf '%s\n' "${EPIC_6_SCRIPTS[@]}" ;;
    7) printf '%s\n' "${EPIC_7_SCRIPTS[@]}" ;;
    8) printf '%s\n' "${EPIC_8_SCRIPTS[@]}" ;;
    9) printf '%s\n' "${EPIC_9_SCRIPTS[@]}" ;;
  esac
}

API_PID=""
TOTAL_EPICS_PASS=0
TOTAL_EPICS_FAIL=0
SUMMARY_FILE="$(mktemp)"

stop_api() {
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  API_PID=""
  # free port if something else is listening
  if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti ":$PORT" 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
      echo "$PIDS" | xargs kill -9 2>/dev/null || true
    fi
  fi
}

start_api() {
  stop_api
  (cd "$API_DIR" && AUTH_DEV_MODE=true API_PORT="$PORT" node dist/main.js) &
  API_PID=$!
  for _ in $(seq 1 60); do
    if curl -sf "$BASE/api/health" | rg -q '"status":"ok"'; then
      return 0
    fi
    sleep 0.5
  done
  echo "ERROR: API failed to start on port $PORT" >&2
  return 1
}

echo "Building API..."
(cd "$API_DIR" && npm run build >/dev/null) || { echo "API build failed"; exit 1; }

for epic in 1 2 3 4 5 6 7 8 9; do
  echo ""
  echo "################################################################"
  echo "# EPIC $epic — fresh API on port $PORT"
  echo "################################################################"

  if ! start_api; then
    echo "EPIC $epic: SKIP (API start failed)" | tee -a "$SUMMARY_FILE"
    TOTAL_EPICS_FAIL=$((TOTAL_EPICS_FAIL + 1))
    continue
  fi

  EPIC_PASS=0
  EPIC_FAIL=0
  FAILED_SCRIPTS=""

  while IFS= read -r story; do
    [ -z "$story" ] && continue
    script="$SCRIPTS/verify-story-${story}.sh"
    echo ""
    echo "-------- verify-story-${story}.sh --------"
    if API_URL="$BASE" HEALTH_URL="$BASE/api/health" "$script"; then
      EPIC_PASS=$((EPIC_PASS + 1))
    else
      EPIC_FAIL=$((EPIC_FAIL + 1))
      FAILED_SCRIPTS="$FAILED_SCRIPTS $story"
    fi
  done < <(epic_scripts "$epic")

  stop_api

  TOTAL=$((EPIC_PASS + EPIC_FAIL))
  if [ "$EPIC_FAIL" -eq 0 ]; then
    echo ""
    echo ">>> EPIC $epic: ALL PASSED ($EPIC_PASS/$TOTAL scripts)"
    echo "EPIC $epic: PASS ($EPIC_PASS/$TOTAL)" >> "$SUMMARY_FILE"
    TOTAL_EPICS_PASS=$((TOTAL_EPICS_PASS + 1))
  else
    echo ""
    echo ">>> EPIC $epic: $EPIC_FAIL FAILED — stories:$FAILED_SCRIPTS"
    echo "EPIC $epic: FAIL ($EPIC_PASS/$TOTAL passed; failed:$FAILED_SCRIPTS)" >> "$SUMMARY_FILE"
    TOTAL_EPICS_FAIL=$((TOTAL_EPICS_FAIL + 1))
  fi
done

echo ""
echo "================================================================"
echo "PER-EPIC SUMMARY (fresh API restart each epic)"
echo "================================================================"
cat "$SUMMARY_FILE"
echo ""
echo "Epics passed: $TOTAL_EPICS_PASS / 9"
echo "Epics with failures: $TOTAL_EPICS_FAIL / 9"
rm -f "$SUMMARY_FILE"

[ "$TOTAL_EPICS_FAIL" -eq 0 ]
