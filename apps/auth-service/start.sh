#!/bin/sh
set -e

# 1. Initialize Databases (if they don't exist).
#    init-geo-db creates resido_geodata when missing, and is also the place
#    where we ensure resido_master / resido_users exist before we push them.
echo "🏗️ Initializing Databases..."
node init-geo-db.js

# 2. Sync the prisma schemas that auth-service OWNS.
#
#    auth-service owns: master, user, geo.
#    auth-service does NOT own: core (resido_core). resident-service is the
#    sole schema owner for resido_core — it ships the canonical Prisma schema
#    and runs `prisma db push` for it on its own startup. auth-service still
#    needs the core *client* (for reads on BusinessProfile / Member etc.) so
#    we keep `prisma generate` for core below, but we deliberately skip the
#    `db push` to avoid two services racing each other into schema drift.
echo "🔄 Syncing database schemas owned by auth-service..."

if [ -z "$GEO_WRITE_URL" ]; then
    echo "⚠️  GEO_WRITE_URL is not set. Falling back to RDS_WRITE_URL/resido_geodata..."
    export GEO_WRITE_URL="${RDS_WRITE_URL}/resido_geodata?schema=public"
fi

npx prisma db push --schema=prisma/master/schema.prisma --accept-data-loss
npx prisma db push --schema=prisma/user/schema.prisma   --accept-data-loss
npx prisma db push --schema=prisma/geo/schema.prisma    --accept-data-loss

echo "⚙️  Generating prisma clients (including core for read access)..."
npx prisma generate --schema=prisma/master/schema.prisma
npx prisma generate --schema=prisma/user/schema.prisma
npx prisma generate --schema=prisma/core/schema.prisma
npx prisma generate --schema=prisma/geo/schema.prisma

# 3. Wait until the core schema is ready before we accept traffic.
#    resident-service is responsible for pushing the resido_core schema on
#    its own startup; we just poll for the presence of a table that only
#    appears after that push completes (users.linkBusinessProfile is the
#    most recent column and a reliable readiness signal).
node wait-for-core-schema.js || echo "⚠️  Continuing without core readiness — first writes may briefly fail until resident-service finishes its push."

# 4. Enable PostGIS for the geo DB.
echo "🐘 Enabling PostGIS..."
node enable-postgis.js

# 5. Start the application.
echo "🚀 Starting application..."
node dist/main
