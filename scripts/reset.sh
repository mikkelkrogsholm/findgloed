#!/usr/bin/env bash
# Hård reset: stopper containere OG sletter named volumes (postgres data,
# uploads, node_modules). Bruges når du har ændret migrationer eller har
# brug for en helt ren database. Kræver bekræftelse — kør med ASSUME_YES=1
# for at springe prompten over.
#
# Brug:
#   ./scripts/reset.sh
#   ASSUME_YES=1 ./scripts/reset.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

ROOT="$(find_project_root)"
cd "$ROOT"

require_docker_running

cat <<WARN
${C_YELLOW}${C_BOLD}Hård reset af Findgloed${C_RESET}

  Det her sletter:
    • Postgres-databasen (alle brugere, events, beskeder, abonnementer)
    • Profil- og verifikations-billeder (api_uploads volume)
    • node_modules-cachen for web-imaget

  Det her sletter IKKE:
    • Din kildekode
    • .env eller andre filer på disken

WARN

if ! confirm "Er du sikker på at du vil slette alt data?"; then
  log_warn "Afbrudt. Intet er ændret."
  exit 0
fi

log_step "Stopper containere og fjerner named volumes"
compose down --volumes --remove-orphans

log_ok "Reset gennemført. Start frisk med ./scripts/up.sh"
