#!/bin/sh

# 1. Initialize Databases (if they don't exist)
echo "🏗️ Initializing Databases..."
node init-geo-db.js

# 2. Sync all prisma schemas
echo "🔄 Syncing database schemas..."

# Ensure we have the GEO_WRITE_URL for prisma push, if not we skip it to prevent crash
if [ -z "$GEO_WRITE_URL" ]; then
    echo "⚠️  GEO_WRITE_URL is not set. Attempting to use default URL for sync..."
    # We try to construct it from RDS_WRITE_URL if possible
    export GEO_WRITE_URL="${RDS_WRITE_URL}/resido_geodata?schema=public"
fi

npx prisma db push --schema=prisma/master/schema.prisma --accept-data-loss
npx prisma db push --schema=prisma/user/schema.prisma --accept-data-loss
npx prisma db push --schema=prisma/core/schema.prisma --accept-data-loss
npx prisma db push --schema=prisma/geo/schema.prisma --accept-data-loss

# 3. Enable PostGIS
echo "🐘 Enabling PostGIS..."
node enable-postgis.js

# 4. Start the application
echo "🚀 Starting application..."
node dist/main
