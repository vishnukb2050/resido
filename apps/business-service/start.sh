#!/bin/sh
set -e

# Sync prisma schema
echo "🔄 Syncing database schema..."
npx prisma db push --accept-data-loss

# Start the application
echo "🚀 Starting application..."
node dist/main
