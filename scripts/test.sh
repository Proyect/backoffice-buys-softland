#!/usr/bin/env bash
set -euo pipefail

SETUP=1
WATCH=0
FILTER=""
LOCAL=0

for arg in "$@"; do
  case "$arg" in
    --no-setup) SETUP=0 ;;
    --watch) WATCH=1 ;;
    --filter=*) FILTER="${arg#*=}" ;;
    --local) LOCAL=1 ;;
  esac
done

run_docker() {
  echo "[Tests] docker compose exec backend $*"
  docker compose exec backend "$@"
}

run_local_backend() {
  pushd backend >/dev/null
  if [ ! -d node_modules ]; then npm install; fi
  echo "[Tests] (local) $*"
  "$@"
  popd >/dev/null
}

if [ "$SETUP" -eq 1 ]; then
  if [ "$LOCAL" -eq 1 ]; then
    run_local_backend npm run prisma:migrate:deploy
    run_local_backend npm run prisma:seed
  else
    run_docker npm run test:setup
  fi
fi

if [ "$WATCH" -eq 1 ]; then
  CMD=(npm run test:watch)
else
  CMD=(npm run test)
fi

if [ -n "$FILTER" ]; then
  CMD+=(-- -t "$FILTER")
fi

if [ "$LOCAL" -eq 1 ]; then
  run_local_backend "${CMD[@]}"
else
  run_docker "${CMD[@]}"
fi
