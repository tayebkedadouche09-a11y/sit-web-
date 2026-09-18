#!/usr/bin/env bash
# NUMI v5.0.1-HARDENED — Staging verification gate
set -euo pipefail
echo "=== NUMI Staging Verify ==="
missing=0
req() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "MISSING $name"
    missing=$((missing+1))
  else
    echo "SET     $name"
  fi
}
# load .env if present
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
req DATABASE_URL
req PUBLIC_APP_URL
req JWT_SECRET
req CHARGILY_SECRET_KEY
req GITHUB_TOKEN
req GITHUB_OWNER
req VERCEL_TOKEN
echo ""
if [[ "$missing" -gt 0 ]]; then
  echo "RESULT: $missing required secrets missing"
  echo "STATUS: NOT VERIFIED — REQUIRES EXTERNAL CONFIGURATION"
  exit 2
fi
echo "Secrets present. Run manual E2E and record evidence IDs."
exit 0
