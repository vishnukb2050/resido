#!/bin/sh
set -e

# resident-service is the designated schema owner for the shared `resido_core`
# database. On every deployment it runs `prisma db push` to bring the database
# in line with this service's Prisma schema. Other services that share
# `resido_core` (business, complaint, visitor, accounting, chat, flaredthread)
# intentionally do NOT run `db push` because their schemas are subsets and a
# push from them would drop tables/columns owned by other services.

echo "🔄 [resident-service] Syncing Prisma schema with resido_core ..."
npx prisma db push --accept-data-loss --skip-generate
echo "✅ [resident-service] Schema sync complete."

echo "🚀 Starting application..."
node dist/main
