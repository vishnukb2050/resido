# Database migrations in CI/CD (automated)

## What the pipeline does (every release)

Use **`release.yml`** with **`run_terraform=true`** and **`run_migrate=true`** on first
deploy, or run stages manually in order:

1. **Terraform** (`terraform.yml`) — `dev` or `prod`
2. **DB Migrate** (`db-migrate.yml`) — `prisma migrate deploy`
3. **Build & Push** (`build-and-push.yml`) — all services
4. **Deploy** (`deploy.yml`)

| Database | Migrations folder | ECS task |
|----------|-------------------|----------|
| `resido_master` | `apps/auth-service/prisma/master/migrations/` | `db-migrate` |
| `resido_users` | `apps/auth-service/prisma/user/migrations/` | `db-migrate` |
| `resido_core` | `apps/auth-service/prisma/core/migrations/` | `db-migrate` |
| `resido_geodata` | `apps/auth-service/prisma/geo/migrations/` | `db-migrate` |
| notifications | `apps/notification-service/prisma/migrations/` | `db-migrate-notification` |
| `resido_chat` | `apps/chat-service/prisma/migrations/` | `db-migrate-chat` |

### First deploy (empty RDS)

The `db-migrate` task first runs **`ensure-databases.js`** → creates
`resido_users`, `resido_core`, `resido_geodata`, `resido_notifications`
(`resido_master` already exists from RDS). Then **`migrate deploy`** applies
**`0_init/migration.sql`** → **all tables created** automatically. No manual `psql`.

### Later redeploys

Only **new** migration folders (e.g. `20250603_add_tenant_id/`) are applied. Already-applied migrations are skipped.

### DB already populated via docker-compose `db push`

`prisma-deploy.sh` detects a non-empty schema, **marks `0_init` as applied** (`migrate resolve`), then runs `migrate deploy` for any newer migrations. No manual step for first ECS cutover.

---

## When you change the schema (developer workflow)

1. Edit **`apps/resident-service/prisma/schema.prisma`** (owner of `resido_core`).
2. Sync the auth copy:
   ```bash
   bash infra/sync-prisma-schemas.sh
   ```
3. Create a **new** migration (not `0_init`):
   ```bash
   cd apps/auth-service
   npx prisma migrate dev --schema=prisma/core/schema.prisma --name describe_change
   ```
   For master / user / geo, use the matching `--schema=prisma/<db>/schema.prisma`.

   For **notification-service**:
   ```bash
   cd apps/notification-service
   npx prisma migrate dev --name describe_change
   ```

4. Commit `schema.prisma` + `prisma/**/migrations/<new_folder>/`.
5. Run **`release.yml`** — pipeline applies the new SQL before deploy.

### Regenerating the full baseline (rare)

Only if you intentionally reset migration history in git:

```bash
bash infra/ecs/scripts/generate-baseline-migrations.sh
```

---

## Docker Compose (local) — unchanged

Compose still uses **`prisma db push`** in `start.sh` when `RUN_PRISMA_PUSH` is unset/default `true`. ECS does **not** use push.

---

## Chat and communities

Chat uses **one** `resido_chat` database for every community. Data is separated by the
`tenantId` column (same idea as complaints/finance in `resido_core`). You do **not**
need a separate Postgres database per community for chat.
