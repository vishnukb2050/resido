#!/bin/sh
set -e

# Sync prisma schema on startup
echo "🔄 Syncing Prisma schema with database..."
npx prisma db push --accept-data-loss --skip-generate

echo "🚀 Starting application..."
node dist/main
