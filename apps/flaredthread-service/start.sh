#!/bin/sh
set -e

# IMPORTANT: Do NOT run `prisma db push` here.
# flaredthread shares the same `resido_core` database as resident-service,
# but its Prisma schema is a subset (blogs/polls only). A push from this
# service would DROP tables/columns that exist in resident-service (e.g.
# attendance_configs, units) and remove columns this schema doesn't list.
# Schema migrations for the shared core DB are owned by resident-service.

echo "🚀 Starting application..."
node dist/main
