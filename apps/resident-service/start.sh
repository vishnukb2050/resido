#!/bin/sh

# Sync prisma schema
echo "🔄 Syncing master database schema..."
npx prisma db push --accept-data-loss

# Start the application
echo "🚀 Starting application..."
node dist/main
