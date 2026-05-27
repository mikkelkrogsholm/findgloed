#!/usr/bin/env bash
# Shared helpers for findgloed scripts.

set -euo pipefail

# ANSI colors (no-op if NO_COLOR is set)
if [[ -z "${NO_COLOR:-}" ]] && [[ -t 1 ]]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'
  C_MAGENTA=$'\033[35m'
  C_CYAN=$'\033[36m'
else
  C_RESET=""
  C_BOLD=""
  C_DIM=""
  C_RED=""
  C_GREEN=""
  C_YELLOW=""
  C_BLUE=""
  C_MAGENTA=""
  C_CYAN=""
fi

log_step() {
  printf '%s▸%s %s%s%s\n' "$C_CYAN" "$C_RESET" "$C_BOLD" "$*" "$C_RESET"
}

log_ok() {
  printf '%s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"
}

log_warn() {
  printf '%s⚠%s %s\n' "$C_YELLOW" "$C_RESET" "$*"
}

log_err() {
  printf '%s✗%s %s\n' "$C_RED" "$C_RESET" "$*" >&2
}

log_dim() {
  printf '%s%s%s\n' "$C_DIM" "$*" "$C_RESET"
}

# Find project root (the directory that contains docker-compose.yml).
find_project_root() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
  if [[ -f "$dir/docker-compose.yml" ]]; then
    printf '%s' "$dir"
    return
  fi
  log_err "Kunne ikke finde docker-compose.yml. Kørte du scriptet fra det forkerte sted?"
  exit 1
}

# Pick docker compose command (v2 plugin or v1 standalone).
compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    log_err "Hverken 'docker compose' eller 'docker-compose' er tilgængelig. Installér Docker Desktop."
    exit 1
  fi
}

require_docker_running() {
  if ! docker info >/dev/null 2>&1; then
    log_err "Docker daemon kører ikke. Start Docker Desktop og prøv igen."
    exit 1
  fi
}

# Read .env into the shell. Bruges af scripts der har brug for ports osv.
load_dotenv() {
  local root="$1"
  if [[ ! -f "$root/.env" ]]; then
    log_err ".env mangler i $root. Kopier .env.example og udfyld den først."
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$root/.env"
  set +a
}

confirm() {
  local prompt="$1"
  local reply
  if [[ -n "${ASSUME_YES:-}" ]]; then
    return 0
  fi
  read -r -p "$prompt [y/N] " reply
  case "$reply" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}
