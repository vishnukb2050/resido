#!/bin/sh
set -e

# Sync prisma schema with the database before starting the app.
# --accept-data-loss is required for column drops/type changes; new tables
# (e.g. attendance_configs, attendance_records) are safe additions.
echo "🔄 Syncing Prisma schema with database..."
npx prisma db push --accept-data-loss --skip-generate

echo "🚀 Starting application..."
node dist/main
