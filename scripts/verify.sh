#!/usr/bin/env bash
# Verificerer en bruger manuelt — bruges når du tester platformen lokalt.
# Sætter verification_status='verified' direkte i databasen.
#
# Brug:
#   ./scripts/verify.sh test@example.com
#   ./scripts/verify.sh test@example.com --reject     # afvis i stedet
#   ./scripts/verify.sh test@example.com --pause      # sæt på pause

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

ROOT="$(find_project_root)"
cd "$ROOT"

if [[ $# -eq 0 ]]; then
  cat <<USAGE
Usage: $(basename "$0") <email> [--reject|--pause]

  Verificerer en bruger så de kan se medlemmer, tilmelde sig events osv.
  Skal kun bruges i lokal dev — i prod sker det via admin-UI'et.
USAGE
  exit 1
fi

email="$1"
action="verify"
case "${2:-}" in
  --reject) action="reject" ;;
  --pause) action="pause" ;;
esac

require_docker_running

if ! compose ps --services --filter status=running | grep -q '^db$'; then
  log_err "db-containeren kører ikke. Start stakken med ./scripts/up.sh først."
  exit 1
fi

case "$action" in
  verify)
    log_step "Sætter $email til 'verified'"
    sql="UPDATE \"user\" SET verification_status='verified', verified_at=NOW() WHERE email='$email' RETURNING email, verification_status;"
    ;;
  reject)
    log_step "Afviser $email"
    sql="UPDATE \"user\" SET verification_status='rejected' WHERE email='$email' RETURNING email, verification_status;"
    ;;
  pause)
    log_step "Sætter $email på pause"
    sql="UPDATE \"user\" SET paused_at=NOW() WHERE email='$email' RETURNING email, paused_at;"
    ;;
esac

result="$(compose exec -T db psql -U "${POSTGRES_USER:-findgloed}" -d "${POSTGRES_DB:-findgloed}" -c "$sql" 2>&1 || true)"

if echo "$result" | grep -q "(0 rows)"; then
  log_err "Brugeren $email blev ikke fundet."
  exit 1
fi

echo "$result" | grep -E "$email|status|paused" || echo "$result"
log_ok "Færdig"
