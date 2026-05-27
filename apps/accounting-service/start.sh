#!/bin/sh
set -e

# IMPORTANT: Do NOT run `prisma db push` here.
# accounting-service shares the same `resido_core` database as resident-service,
# but its Prisma schema is a subset. A `db push --accept-data-loss` from this
# service would DROP tables/columns owned by other services. Schema migrations
# for the shared `resido_core` DB are owned by resident-service, which runs
# `prisma db push` automatically on every deployment.

echo "🚀 Starting application..."
node dist/main
