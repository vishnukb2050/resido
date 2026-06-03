#!/bin/sh
set -e

schema="prisma/schema.prisma"
migrations_dir="prisma/migrations"

echo "════ migrate: resido_chat ════"
if [ ! -d "$migrations_dir" ] || [ -z "$(ls -A "$migrations_dir" 2>/dev/null | grep -v migration_lock.toml || true)" ]; then
  echo "⚠️  No migrations — skip"
  exit 0
fi

set +e
out="$(npx prisma migrate deploy --schema="$schema" 2>&1)"
code=$?
set -e
printf '%s\n' "$out"

if [ "$code" -eq 0 ]; then
  echo "✅ resido_chat"
  exit 0
fi

case "$out" in
  *P3005*|*"schema is not empty"*|*"baseline"*)
    echo "↪ adopting baseline 0_init ..."
    npx prisma migrate resolve --schema="$schema" --applied 0_init
    npx prisma migrate deploy --schema="$schema"
    echo "✅ resido_chat (baseline adopted)"
    ;;
  *)
    echo "❌ migrate failed (exit $code)" >&2
    exit "$code"
    ;;
esac
