#!/usr/bin/env bash
# Run API story verification (all epics) + Playwright browser E2E.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_EXIT=0
E2E_EXIT=0

echo "========================================"
echo "  EduPulse full verification"
echo "========================================"

echo ""
echo ">>> Phase 1: API story scripts (verify-per-epic.sh)"
echo ""
if ./scripts/verify-per-epic.sh; then
  API_EXIT=0
else
  API_EXIT=$?
fi

echo ""
echo ">>> Phase 2: Browser E2E (Playwright)"
echo ""
if ./scripts/run-browser-e2e.sh; then
  E2E_EXIT=0
else
  E2E_EXIT=$?
fi

echo ""
echo "========================================"
echo "  Summary"
echo "========================================"
echo "  API stories:  $([ "$API_EXIT" -eq 0 ] && echo PASS || echo FAIL)"
echo "  Browser E2E:  $([ "$E2E_EXIT" -eq 0 ] && echo PASS || echo FAIL)"
echo "========================================"

if [ "$API_EXIT" -ne 0 ] || [ "$E2E_EXIT" -ne 0 ]; then
  exit 1
fi
