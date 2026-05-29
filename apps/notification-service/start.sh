#!/bin/sh
set -e

if [ "${RUN_PRISMA_PUSH:-true}" = "true" ]; then
    echo "🔄 Syncing Prisma schema with database..."
    npx prisma db push --accept-data-loss --skip-generate
else
    echo "⏭  Skipping prisma db push (RUN_PRISMA_PUSH=false)."
fi

echo "🚀 Starting application..."
node dist/main
