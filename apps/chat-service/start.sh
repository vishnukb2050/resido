#!/bin/sh
set -e

# Chat uses its own database `resido_chat` (all communities share one DB;
# rows are isolated by tenantId). Schema is applied by the db-migrate-chat
# ECS task (`prisma migrate deploy`) on ECS, or `prisma db push` locally when
# RUN_PRISMA_PUSH=true. Never push against resido_core from this service.
if [ "${RUN_PRISMA_PUSH:-false}" = "true" ]; then
    echo "🔄 [chat-service] Syncing Prisma schema with resido_chat ..."
    npx prisma db push --accept-data-loss --skip-generate
    echo "✅ [chat-service] Schema sync complete."
fi

echo "🚀 Starting application..."
node dist/main
