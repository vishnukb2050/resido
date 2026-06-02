# Database indexes (scale / ~1M users)

Two layers:

1. **Prisma `@@index`** — applied via `npx prisma db push` per service schema.
2. **Raw SQL** — GIN (trigram, arrays), PostGIS GIST, partial indexes. Applied with `apply.sh`.

## Prerequisites

- PostgreSQL extensions on the target databases:
  - `pg_trgm` on **user** DB (and optionally core for business search if shared)
  - `postgis` on **geo** DB and **core** DB (business_profiles / job_profiles)

## Environment variables

Set connection URLs (same names as `.env` / ECS secrets):

| Variable | Database |
|----------|----------|
| `USER_WRITE_URL` | `resido_users` |
| `CORE_WRITE_URL` | `resido_core` (resident + flaredthread + business) |
| `MASTER_WRITE_URL` | `resido_master` |
| `GEO_WRITE_URL` | `resido_geodata` |
| `TENANT_DATABASE_URL` or `CHAT_DATABASE_URL` | Per-tenant chat (if separate) |

`apply.sh` maps: `user` → `USER_WRITE_URL`, `core` → `CORE_WRITE_URL`, `flaredthread`/`business`/`resident` → `CORE_WRITE_URL`, `master` → `MASTER_WRITE_URL`, `geo` → `GEO_WRITE_URL`, `chat` → `TENANT_DATABASE_URL` or `CHAT_DATABASE_URL`.

## Apply order

### Docker compose (automatic)

`docker compose up` now applies **everything** on its own:

1. `resident-service/start.sh` → `npx prisma db push` against `resido_core` (creates all `@@index` composites).
2. `auth-service/start.sh` →
   - `npx prisma db push` for `master`, `user`, `geo`.
   - `node enable-postgis.js` (postgis on user / geo / core).
   - `node /app/db-indexes/apply-indexes.js …` ← **raw SQL indexes** for every database (mounted from `infra/db-indexes/`).
3. `auth-service` waits for core schema before starting Nest (`wait-for-core-schema.js`).

No manual step required. `CREATE INDEX CONCURRENTLY IF NOT EXISTS` makes the script idempotent — re-running on every restart is a no-op when indexes already exist.

### Manual / production (psql)

```bash
# 1) Prisma composites (from repo root)
cd apps/auth-service && npx prisma db push --schema=prisma/user/schema.prisma
npx prisma db push --schema=prisma/master/schema.prisma
npx prisma db push --schema=prisma/geo/schema.prisma
npx prisma db push --schema=prisma/core/schema.prisma
cd ../flaredthread-service && npx prisma db push
cd ../chat-service && npx prisma db push
cd ../business-service && npx prisma db push
cd ../resident-service && npx prisma db push

# 2) GIN / GIST / partial (requires psql)
export USER_WRITE_URL=... CORE_WRITE_URL=... MASTER_WRITE_URL=... GEO_WRITE_URL=...
./infra/db-indexes/apply.sh
```

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction; `apply.sh` runs each file with `psql` autocommit, and `apply-indexes.js` sends one statement per `client.query()` call (also autocommit).

## Verify

After data exists, run snippets in `verify.sql` with `psql "$CORE_WRITE_URL"` and check for `Index Scan` (not `Seq Scan`).

## Note on column names

Indexes assume Prisma `db push` column names match schema field names (camelCase). If your DB was created with snake_case migrations, adjust quoted identifiers in the `.sql` files.
