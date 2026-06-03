#!/bin/sh
set -e

# 1. Initialize Databases (if they don't exist).
#    ensure-databases.js creates resido_users / resido_core / resido_geodata /
#    resido_notifications on the single RDS server when missing (resido_master
#    is created by RDS itself). Idempotent — skips databases that already exist.
echo "🏗️ Initializing Databases..."
node ensure-databases.js

# 2. Sync the prisma schemas that auth-service OWNS.
#
#    auth-service owns: master, user, geo.
#    auth-service does NOT own: core (resido_core). resident-service is the
#    sole schema owner for resido_core — it ships the canonical Prisma schema
#    and runs `prisma db push` for it on its own startup. auth-service still
#    needs the core *client* (for reads on BusinessProfile / Member etc.) so
#    we keep `prisma generate` for core below, but we deliberately skip the
#    `db push` to avoid two services racing each other into schema drift.
if [ -z "$GEO_WRITE_URL" ]; then
    echo "⚠️  GEO_WRITE_URL is not set. Falling back to RDS_WRITE_URL/resido_geodata..."
    export GEO_WRITE_URL="${RDS_WRITE_URL}/resido_geodata?schema=public"
fi

# RUN_PRISMA_PUSH gates whether THIS container pushes its own schemas.
#   - On EC2 / docker-compose (legacy) it defaults to "true" — each service
#     keeps its own DB in sync on every restart.
#   - On ECS Fargate the task definition sets RUN_PRISMA_PUSH="false" and
#     a one-off `db-migrate` task (see infra/ecs/) runs `prisma migrate
#     deploy` instead. See infra/ecs/migrations/MIGRATION_STRATEGY.md.
if [ "${RUN_PRISMA_PUSH:-true}" = "true" ]; then
    echo "🔄 Syncing database schemas owned by auth-service..."
    npx prisma db push --schema=prisma/master/schema.prisma --accept-data-loss
    npx prisma db push --schema=prisma/user/schema.prisma   --accept-data-loss
    npx prisma db push --schema=prisma/geo/schema.prisma    --accept-data-loss
else
    echo "⏭  Skipping prisma db push (RUN_PRISMA_PUSH=false). Migrations are managed externally."
fi

echo "⚙️  Generating prisma clients (including core for read access)..."
npx prisma generate --schema=prisma/master/schema.prisma
npx prisma generate --schema=prisma/user/schema.prisma
npx prisma generate --schema=prisma/core/schema.prisma
npx prisma generate --schema=prisma/geo/schema.prisma

# 3. Wait until the core schema is ready before we accept traffic.
#    resident-service is responsible for pushing the resido_core schema on
#    its own startup; we poll for the presence of the tables we know we
#    need to query (business_profiles / blogs / members). See
#    wait-for-core-schema.js for the exact probe + timeout behaviour.
node wait-for-core-schema.js || echo "⚠️  Continuing without core readiness — first queries may briefly fail until resident-service finishes its push."

# 4. Enable PostGIS for the geo DB.
echo "🐘 Enabling PostGIS..."
node enable-postgis.js

# 5. Apply raw SQL indexes (GIN / PostGIS GIST / pg_trgm / partial). These
#    are PostgreSQL features Prisma can't express in @@index, so they ship as
#    .sql files mounted from infra/db-indexes/ via docker-compose. The script
#    is idempotent (CREATE INDEX CONCURRENTLY IF NOT EXISTS) so it is safe
#    to re-run on every container restart. Failures are logged but never
#    abort startup.
if [ -f /app/db-indexes/apply-indexes.js ]; then
    echo "🧩 Applying raw SQL indexes (GIN / GIST / trigram)..."
    node /app/db-indexes/apply-indexes.js /app/db-indexes \
        user,master,geo,core,flaredthread,business,resident || true
else
    echo "⏭  /app/db-indexes/apply-indexes.js not present — skipping raw SQL indexes."
fi

# 6. Start the application.
echo "🚀 Starting application..."
node dist/main
