#!/usr/bin/env bash
# Apply raw SQL indexes (GIN/GIST/partial). Safe to re-run (IF NOT EXISTS).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

url_for() {
  case "$1" in
    user)         echo "${USER_WRITE_URL:-}" ;;
    core)         echo "${CORE_WRITE_URL:-}" ;;
    master)       echo "${MASTER_WRITE_URL:-}" ;;
    geo)          echo "${GEO_WRITE_URL:-}" ;;
    flaredthread) echo "${CORE_WRITE_URL:-}" ;;
    business)     echo "${CORE_WRITE_URL:-}" ;;
    resident)     echo "${CORE_WRITE_URL:-}" ;;
    chat)         echo "${CHAT_DATABASE_URL:-${TENANT_DATABASE_URL:-}}" ;;
    *)            echo "" ;;
  esac
}

apply_one() {
  local name="$1"
  local url
  url="$(url_for "$name")"
  if [[ -z "$url" ]]; then
    echo "SKIP $name — connection URL not set"
    return 0
  fi
  local file="$DIR/${name}.sql"
  if [[ ! -f "$file" ]]; then
    echo "SKIP $name — no ${name}.sql"
    return 0
  fi
  echo "==> Applying $name indexes..."
  psql "$url" -v ON_ERROR_STOP=1 -f "$file"
}

for db in user core master geo flaredthread chat business resident; do
  apply_one "$db"
done

echo "Done. Run verify.sql against CORE_WRITE_URL when tables have data."
