#!/bin/sh

# Sync all prisma schemas
echo "🔄 Syncing database schemas..."
npx prisma db push --schema=prisma/master/schema.prisma --accept-data-loss
npx prisma db push --schema=prisma/user/schema.prisma --accept-data-loss
npx prisma db push --schema=prisma/core/schema.prisma --accept-data-loss

# Enable PostGIS
echo "🐘 Enabling PostGIS..."
node enable-postgis.js

# Start the application
echo "🚀 Starting application..."
node dist/main
