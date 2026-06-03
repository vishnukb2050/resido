#!/usr/bin/env bash
#
# Generate (or refresh) the committed baseline Prisma migrations used by ECS
# `prisma migrate deploy`. Safe to re-run: overwrites 0_init/migration.sql only.
#
# Usage:
#   bash infra/ecs/scripts/generate-baseline-migrations.sh
#
# After changing apps/resident-service/prisma/schema.prisma:
#   bash infra/sync-prisma-schemas.sh
#   bash infra/ecs/scripts/generate-baseline-migrations.sh
#   git add apps/auth-service/prisma apps/notification-service/prisma apps/chat-service/prisma
#
# For incremental prod changes (after baseline exists), use migrate dev instead:
#   cd apps/auth-service && npx prisma migrate dev --schema=prisma/user/schema.prisma --name add_foo

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

PRISMA="${PRISMA_BIN:-$REPO_ROOT/node_modules/.bin/prisma}"
if [ ! -x "$PRISMA" ]; then
  echo "❌ Prisma CLI not found at $PRISMA — run npm install at repo root." >&2
  exit 1
fi

LOCK='provider = "postgresql"
'

write_baseline() {
  local label="$1"
  local schema_path="$2"
  local migrations_dir="$3"

  if [ ! -f "$schema_path" ]; then
    echo "❌ Missing schema: $schema_path" >&2
    exit 1
  fi

  mkdir -p "$migrations_dir/0_init"
  printf '%s' "$LOCK" > "$migrations_dir/migration_lock.toml"

  echo "▶ $label"
  "$PRISMA" migrate diff \
    --from-empty \
    --to-schema-datamodel "$schema_path" \
    --script > "$migrations_dir/0_init/migration.sql"

  local lines
  lines="$(wc -l < "$migrations_dir/0_init/migration.sql" | tr -d ' ')"
  echo "  → $migrations_dir/0_init/migration.sql ($lines lines)"
}

echo "🔄 Syncing auth-service core schema from resident-service..."
bash "$REPO_ROOT/infra/sync-prisma-schemas.sh"

write_baseline "resido_master" \
  "$REPO_ROOT/apps/auth-service/prisma/master/schema.prisma" \
  "$REPO_ROOT/apps/auth-service/prisma/master/migrations"

write_baseline "resido_users" \
  "$REPO_ROOT/apps/auth-service/prisma/user/schema.prisma" \
  "$REPO_ROOT/apps/auth-service/prisma/user/migrations"

write_baseline "resido_core (ECS migrate path)" \
  "$REPO_ROOT/apps/auth-service/prisma/core/schema.prisma" \
  "$REPO_ROOT/apps/auth-service/prisma/core/migrations"

write_baseline "resido_geodata" \
  "$REPO_ROOT/apps/auth-service/prisma/geo/schema.prisma" \
  "$REPO_ROOT/apps/auth-service/prisma/geo/migrations"

write_baseline "resido_notifications" \
  "$REPO_ROOT/apps/notification-service/prisma/schema.prisma" \
  "$REPO_ROOT/apps/notification-service/prisma/migrations"

write_baseline "resido_chat" \
  "$REPO_ROOT/apps/chat-service/prisma/schema.prisma" \
  "$REPO_ROOT/apps/chat-service/prisma/migrations"

echo ""
echo "✅ Baseline migrations written. Commit and push, then run release.yml."
echo "   Pipeline: build → db-migrate (migrate deploy) → deploy"
echo ""
echo "   Empty RDS: 0_init creates all tables."
echo "   Existing DB (from compose db push): prisma-deploy.sh auto-adopts 0_init, then deploys."
