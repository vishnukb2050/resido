#!/bin/sh

# 1. Initialize Databases (if they don't exist)
echo "🏗️ Initializing Databases..."
# We use ts-node to run the script if in source, but in Docker it should be compiled or run with ts-node
npx ts-node src/scripts/init-geo-db.ts

# 2. Sync all prisma schemas
echo "🔄 Syncing database schemas..."
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
