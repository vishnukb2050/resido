#!/bin/sh
# Idempotent Prisma migrate deploy for ECS db-migrate task.
# - Ensures all logical databases exist (resido_users/core/geodata/notifications).
# - Empty database: applies 0_init (and any later migrations) → all tables created.
# - Database already has tables (e.g. from compose db push): adopts 0_init, then deploys.
# - Normal redeploy: only pending migrations run.
set -e

# 0. Create the logical databases on the single RDS server if missing.
echo "════ ensure databases exist ════"
node ensure-databases.js

deploy_schema() {
  schema="$1"
  migrations_dir="$(dirname "$schema")/migrations"
  name="$(basename "$(dirname "$schema")")"

  echo "════ migrate: $name ════"
  if [ ! -d "$migrations_dir" ] || [ -z "$(ls -A "$migrations_dir" 2>/dev/null | grep -v migration_lock.toml || true)" ]; then
    echo "⚠️  No migrations under $migrations_dir — skip (run generate-baseline-migrations.sh)"
    return 0
  fi

  set +e
  out="$(npx prisma migrate deploy --schema="$schema" 2>&1)"
  code=$?
  set -e
  printf '%s\n' "$out"

  if [ "$code" -eq 0 ]; then
    echo "✅ $name"
    return 0
  fi

  case "$out" in
    *P3005*|*"schema is not empty"*|*"baseline"*)
      echo "↪ $name: existing schema detected — adopting baseline 0_init ..."
      npx prisma migrate resolve --schema="$schema" --applied 0_init
      npx prisma migrate deploy --schema="$schema"
      echo "✅ $name (baseline adopted)"
      ;;
    *)
      echo "❌ $name migrate failed (exit $code)" >&2
      exit "$code"
      ;;
  esac
}

deploy_schema prisma/master/schema.prisma
deploy_schema prisma/user/schema.prisma
deploy_schema prisma/core/schema.prisma

if [ -z "${GEO_WRITE_URL:-}" ]; then
  export GEO_WRITE_URL="${RDS_WRITE_URL}/resido_geodata?schema=public"
fi
deploy_schema prisma/geo/schema.prisma

echo "════ PostGIS (resido_geodata) ════"
node enable-postgis.js || true

echo "════ all auth-service migrations complete ════"
