#!/usr/bin/env bash
# Genstarter stakken: down + up. Bevarer volumes (DB-data, uploads).
# Bruges når du har ændret kode der kræver image-rebuild eller bare vil
# have en frisk start uden at miste data.
#
# Brug:
#   ./scripts/restart.sh             # uden rebuild
#   ./scripts/restart.sh --rebuild   # tving rebuild
#   ./scripts/restart.sh --no-seed   # spring seed over

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/down.sh"
"$SCRIPT_DIR/up.sh" "$@"
