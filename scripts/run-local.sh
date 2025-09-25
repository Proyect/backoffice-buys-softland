#!/usr/bin/env bash
set -euo pipefail

WITH_FRONTEND=1
for arg in "$@"; do
  case "$arg" in
    --no-frontend) WITH_FRONTEND=0 ;;
  esac
done

echo "[Run-Local] Starting local dev..."

# Backend
pushd backend >/dev/null
if [ ! -d node_modules ]; then
  echo "[Run-Local] Installing backend deps..."
  npm install
fi
npm run dev &
BACK_PID=$!
popd >/dev/null

# Frontend
if [ "$WITH_FRONTEND" -eq 1 ]; then
  pushd frontend >/dev/null
  if [ ! -d node_modules ]; then
    echo "[Run-Local] Installing frontend deps..."
    npm install
  fi
  npm run dev &
  FRONT_PID=$!
  popd >/dev/null
fi

echo "[Run-Local] Backend PID: $BACK_PID"
if [ "$WITH_FRONTEND" -eq 1 ]; then echo "[Run-Local] Frontend PID: $FRONT_PID"; fi

echo "[Run-Local] Press Ctrl+C to stop."
trap 'echo "[Run-Local] Stopping..."; kill -9 $BACK_PID >/dev/null 2>&1 || true; if [ "${FRONT_PID:-}" != "" ]; then kill -9 $FRONT_PID >/dev/null 2>&1 || true; fi; exit 0' INT TERM

# Wait on background processes
wait
