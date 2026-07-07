#!/usr/bin/env bash
# Start EduPulse pilot demo (API + Expo). No Docker required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/backend/api"
FE_DIR="$ROOT/frontend"
PORT="${API_PORT:-3000}"
API_URL="http://localhost:${PORT}"

kill_port() {
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti ":$PORT" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  fi
}

echo "=== EduPulse pilot demo ==="
echo ""

# Frontend env (plain HTTP for local demo — no nginx/certs needed)
if [ ! -f "$FE_DIR/.env" ]; then
  cat > "$FE_DIR/.env" <<EOF
EXPO_PUBLIC_API_URL=${API_URL}
EXPO_PUBLIC_KEYCLOAK_URL=http://localhost:8080
EXPO_PUBLIC_KEYCLOAK_REALM=edupulse
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=edupulse-mobile
EOF
  echo "Created frontend/.env → ${API_URL}"
else
  echo "Using existing frontend/.env"
fi

echo "Building API..."
(cd "$API_DIR" && npm run build >/dev/null)

kill_port
echo "Starting API on ${API_URL}/api ..."
(
  cd "$API_DIR"
  AUTH_DEV_MODE=true API_PORT="$PORT" node dist/main.js
) &
API_PID=$!

for _ in $(seq 1 40); do
  if curl -sf "${API_URL}/api/health" | rg -q '"status":"ok"'; then
    echo "✓ API healthy"
    break
  fi
  sleep 0.25
done

if ! curl -sf "${API_URL}/api/health" | rg -q '"status":"ok"'; then
  kill "$API_PID" 2>/dev/null || true
  echo "ERROR: API failed to start on port $PORT" >&2
  exit 1
fi

echo ""
echo "Pilot logins (password for all: pilot123)"
echo "  faculty@pes.edu     — Paper Craft, Mark Matrix, Answer Sheet AI"
echo "  student@pes.edu     — Academic Level, exam evidence"
echo "  principal@pes.edu   — Dean Pulse, College Radar"
echo "  tpo@pes.edu         — Campus Drive"
echo "  admin@pes.edu       — policy / admin actions"
echo ""
echo "Institution: PES University"
echo ""
echo "Starting Expo (press i = iOS simulator, w = web)..."
echo "On a physical device, set EXPO_PUBLIC_API_URL to http://<your-lan-ip>:${PORT}"
echo ""

trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM

cd "$FE_DIR"
EXPO_PUBLIC_API_URL="$API_URL" npx expo start --web --clear
