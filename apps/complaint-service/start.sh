#!/bin/sh
set -e

# Sync prisma schema on startup
# npx prisma db push --accept-data-loss


# Start the application
echo "🚀 Starting application..."
node dist/main
