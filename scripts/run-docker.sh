#!/usr/bin/env bash
set -euo pipefail

ALL_IN_DOCKER=false
WITH_PGADMIN=false

for arg in "$@"; do
  case "$arg" in
    --all-in-docker) ALL_IN_DOCKER=true ;;
    --with-pgadmin) WITH_PGADMIN=true ;;
  esac
done

echo "[Run-Docker] Ensuring .env exists..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[Run-Docker] Copied .env.example -> .env"
fi

CMD=(docker compose up -d db backend)
$ALL_IN_DOCKER && CMD+=(frontend)
$WITH_PGADMIN && CMD+=(pgadmin)

echo "[Run-Docker] Executing: ${CMD[*]}"
"${CMD[@]}"

echo "[Run-Docker] Tailing backend logs (Ctrl+C to stop)."
docker compose logs -f backend
