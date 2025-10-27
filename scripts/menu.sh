#!/usr/bin/env bash
set -euo pipefail

show_header() {
  clear || true
  echo "=== Backoffice Buys Softland - Menu (bash) ==="
  echo "Repo root: $(cd "$(dirname "$0")/.." && pwd)"
  echo
}

show_menu() {
  echo "[1] Iniciar DB + Backend"
  echo "[2] Iniciar DB + Backend + Frontend"
  echo "[3] Iniciar DB + Backend + Frontend + pgAdmin"
  echo "[4] Ver estado (docker compose ps)"
  echo "[5] Ver logs (seleccionar servicio)"
  echo "[6] Detener (docker compose down)"
  echo "[7] Detener y borrar volúmenes (down -v)"
  echo "[8] Ejecutar tests backend"
  echo "[9] Rebuild sin caché (build --no-cache + up -d)"
  echo "[10] Prune (limpiar recursos no usados)"
  echo "[11] Salir"
}

pause() {
  read -r -p "Presiona Enter para continuar..." _
}

logs_menu() {
  echo "Servicios disponibles:"
  echo "  [1] db"
  echo "  [2] backend"
  echo "  [3] frontend"
  read -r -p "Elegí servicio (1-3): " svc
  case "$svc" in
    1) service=db ;;
    2) service=backend ;;
    3) service=frontend ;;
    *) echo "Opción inválida"; return ;;
  esac
  echo "Mostrando logs de '$service' (Ctrl+C para salir)"
  docker compose logs -f "$service"
}

rebuild_no_cache() {
  echo "Esto reconstruirá TODAS las imágenes del compose sin caché y levantará en segundo plano."
  read -r -p "Confirmar rebuild sin caché? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then echo "Cancelado."; return; fi
  docker compose build --no-cache || return
  docker compose up -d
}

prune_menu() {
  echo "Prune options:"
  echo "  [1] docker image prune -a (solo imágenes no usadas)"
  echo "  [2] docker volume prune (volúmenes no usados)"
  echo "  [3] docker system prune -a (IMPACTO ALTO)"
  echo "  [4] Cancelar"
  read -r -p "Elegí opción (1-4): " opt
  case "$opt" in
    1)
      read -r -p "Confirmar image prune -a? (yes/no): " c
      if [[ "$c" == "yes" ]]; then docker image prune -a; else echo "Cancelado."; fi
      ;;
    2)
      read -r -p "Confirmar volume prune? (yes/no): " c
      if [[ "$c" == "yes" ]]; then docker volume prune; else echo "Cancelado."; fi
      ;;
    3)
      read -r -p "Confirmar system prune -a (muy destructivo)? (type: IUNDERSTAND): " c
      if [[ "$c" == "IUNDERSTAND" ]]; then docker system prune -a; else echo "Cancelado."; fi
      ;;
    *) echo "Cancelado." ;;
  esac
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

while true; do
  show_header
  show_menu
  read -r -p "Elegí una opción (1-11): " choice
  case "$choice" in
    1)
      bash "$SCRIPT_DIR/run-docker.sh"
      pause
      ;;
    2)
      bash "$SCRIPT_DIR/run-docker.sh" --all-in-docker
      pause
      ;;
    3)
      bash "$SCRIPT_DIR/run-docker.sh" --all-in-docker --with-pgadmin
      pause
      ;;
    4)
      docker compose ps
      pause
      ;;
    5)
      logs_menu
      pause
      ;;
    6)
      docker compose down
      pause
      ;;
    7)
      read -r -p "Esto borrará volúmenes (datos de DB). Confirmar? (yes/no): " confirm
      if [[ "$confirm" == "yes" ]]; then docker compose down -v; else echo "Cancelado."; fi
      pause
      ;;
    8)
      bash "$SCRIPT_DIR/test.sh"
      pause
      ;;
    9)
      rebuild_no_cache
      pause
      ;;
    10)
      prune_menu
      pause
      ;;
    11)
      exit 0
      ;;
    *)
      echo "Opción inválida"; sleep 1
      ;;
  esac
done
