# Prisma Migration Strategy

## TL;DR

| Environment        | Today                                                     | Target (in this folder)                                |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------ |
| Local dev          | `prisma db push --accept-data-loss` (fine)                | `prisma migrate dev --name <change>` (commit the diff) |
| EC2 / docker-compose | `prisma db push --accept-data-loss` from `start.sh`     | `prisma migrate deploy` from `start.sh`                |
| ECS Fargate (prod) | One-off **`db-migrate`** → `prisma migrate deploy` (baselines in git) | Same; add new folders via `migrate dev` |

The dangerous knob is `--accept-data-loss`. It tells Prisma "I authorise
you to drop anything that isn't in the new schema." On a production DB
that's exactly the kind of yes-man you don't want at 2am.

## Why `prisma db push` is wrong for production

`prisma db push` introspects the target DB, diffs it against your
schema, and **mutates the DB to match** — in one shot, with no record
of what changed. Consequences:

1. **Data loss**: renaming a column = drop + create = the column data
   is gone. Same for renaming a table, removing an enum value, or
   widening / narrowing a type Prisma can't coerce.
2. **No history**: there is no `_prisma_migrations` table, so two
   developers shipping at the same time can't tell whose change is in.
3. **No backfill hook**: when a column is added with a required value,
   you have no way to populate existing rows before the constraint
   becomes enforced.
4. **Two services racing**: in compose, we already saw
   `auth-service` + `resident-service` both pushing the same
   `resido_core` DB and silently undoing each other (the
   `linkBusinessProfile` regression).
5. **No safe rollback**: if a deploy fails you can't simply re-run the
   old image — the schema is already mutated. You need to write the
   reverse change yourself, fast.

## What `prisma migrate deploy` gives us instead

- A **`_prisma_migrations` table** in every database recording each
  migration that has been applied (timestamp, checksum, status). New
  deploys only apply migrations that aren't already recorded.
- A **versioned folder** `prisma/migrations/<timestamp>_<name>/`
  containing the exact `migration.sql` that was generated, checked into
  git. Same SQL runs against every environment, in the same order, by
  every developer / pipeline.
- **No `--accept-data-loss` flag.** If a developer writes a
  destructive change locally, `migrate dev` will refuse and ask them
  to confirm, *and* the generated SQL will explicitly contain the
  `DROP COLUMN`. Reviewers can spot it in the PR.
- A natural hook for **custom SQL** — add an extra `data.sql` next to
  `migration.sql` and reference it from a wrapper script, or write the
  `UPDATE` statements directly into a migration.

## Transition plan (do this once, then never look back)

### Step 1 — Baseline every production DB

**Status:** baseline `0_init` migrations are committed under
`apps/auth-service/prisma/{master,user,core,geo}/migrations/` and
`apps/notification-service/prisma/migrations/`. Regenerate with
`bash infra/ecs/scripts/generate-baseline-migrations.sh` only when resetting history.

For each of `resido_master`, `resido_users`, `resido_core`,
`resido_geodata`, and every tenant DB (if not already baselined):

```bash
# 1. Generate the initial migration locally from the current schema.
#    Use --create-only so Prisma DOES NOT touch the DB yet.
cd apps/auth-service
npx prisma migrate dev \
    --schema=prisma/user/schema.prisma \
    --name=baseline \
    --create-only

# 2. Inspect prisma/user/migrations/<ts>_baseline/migration.sql.
#    For a baseline it should be a full CREATE TABLE dump of today's
#    schema.

# 3. Tell each environment "this migration is already applied" — we
#    don't actually want to run it, the tables already exist.
DATABASE_URL=$USER_WRITE_URL npx prisma migrate resolve \
    --schema=prisma/user/schema.prisma \
    --applied <ts>_baseline
```

Repeat for `apps/auth-service/prisma/master`,
`apps/auth-service/prisma/core` (skip — resident-service owns it),
`apps/auth-service/prisma/geo`, and `apps/resident-service/prisma`.

After this, every prod DB has a `_prisma_migrations` table with the
`baseline` row, and is now ready to receive normal migrations.

### Step 2 — Adopt `migrate dev` for new changes

The new dev loop is:

```bash
# Edit schema.prisma in your service.
cd apps/resident-service
npx prisma migrate dev --name add_payment_split_admin_note

# Prisma generates prisma/migrations/<ts>_add_payment_split_admin_note/
# AND applies it to your local DB. Commit both the schema change AND the
# new migration folder.
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(resident): admin note on payment split shares"
```

### Step 3 — Switch every `start.sh` to `migrate deploy`

This is the line change you'll make in each service's `start.sh` as
part of the cutover:

```diff
- npx prisma db push --accept-data-loss --skip-generate
+ npx prisma migrate deploy --schema=prisma/schema.prisma
```

For the multi-schema `auth-service`:

```sh
npx prisma migrate deploy --schema=prisma/master/schema.prisma
npx prisma migrate deploy --schema=prisma/user/schema.prisma
npx prisma migrate deploy --schema=prisma/geo/schema.prisma
# (core is still owned by resident-service)
```

`migrate deploy` is **idempotent and additive** — if a migration is
already in `_prisma_migrations` it's skipped. You can run it as many
times as you like, on any number of pods, with no race conditions.

### Step 4 — In ECS, lift it out of `start.sh` entirely

In Fargate we don't want every task running migrations. Instead the
CI/CD pipeline runs `infra/ecs/scripts/run-migrations.sh` which fires a
single one-off ECS task using `task-definitions/db-migrate.json`. That
task does:

```sh
# All in one container, against all four core databases:
npx prisma migrate deploy --schema=apps/auth-service/prisma/master/schema.prisma
npx prisma migrate deploy --schema=apps/auth-service/prisma/user/schema.prisma
npx prisma migrate deploy --schema=apps/auth-service/prisma/geo/schema.prisma
npx prisma migrate deploy --schema=apps/resident-service/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/notification-service/prisma/schema.prisma
```

Service task definitions in ECS set `RUN_PRISMA_PUSH=false` so the
per-service `start.sh` skips schema work entirely.

## Handling tenant databases

Tenants get a fresh database provisioned by `auth-service` on community
creation. The current code calls `prisma db push` programmatically to
seed the new DB. For production, switch that path to programmatic
`migrate deploy` against the new DB URL:

```ts
// inside tenant-provisioning service
import { execSync } from 'child_process';

const tenantUrl = buildTenantUrl(dbName);
execSync(
    `DATABASE_URL=${tenantUrl} npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`,
    { stdio: 'inherit', cwd: '/app' },
);
```

Now every tenant DB has the same migration history table and stays in
lockstep with the central core DB.

## Rules of thumb for migration PRs

- **Additive first.** If you're adding a column, give it a default OR
  make it nullable so old code keeps working during the rolling deploy.
- **Two-phase renames.** To rename `oldName → newName`: first add
  `newName`, deploy code that writes to both, backfill, deploy code
  that reads from `newName`, then drop `oldName` in a separate
  migration. This is the only safe way without downtime.
- **No `prisma migrate reset` against any shared DB.** Ever. That
  command drops the database. Add a CI guard if necessary.
- **Always inspect the generated `migration.sql`.** Especially the
  diff at PR time — destructive lines (`DROP`, `ALTER ... TYPE`)
  should require an extra reviewer.

## What to keep from today's setup

- `infra/sync-prisma-schemas.sh` stays — it's still the right way to
  guarantee `auth-service` reads from the same model definitions
  resident-service owns.
- `apps/auth-service/wait-for-core-schema.js` stays — it's belt and
  suspenders in case a migration task slipped past in CI.
- The `resident-service` continues to be the only owner of
  `resido_core` migrations.
