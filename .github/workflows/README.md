# GitHub Actions — Resido CI/CD

Pipeline structure (all manually triggered via the **Actions** tab). The three
stage workflows are reusable (`workflow_call`) and are also runnable on their
own; `release.yml` chains them in order.

```
release.yml  (orchestrator)
  └─ 1. build-and-push.yml   build images → ECR        (per-service matrix)
  └─ 2. db-migrate.yml       prisma migrate deploy      (only if run_migrate)
  └─ 3. deploy.yml           rolling ECS deploy         (waits for migrate)
```

All four reuse the existing scripts in `infra/ecs/scripts/` — no deploy logic
is duplicated in YAML.

| Workflow | Purpose | Underlying script |
| --- | --- | --- |
| `build-and-push.yml` | Build service images, push to ECR | `build-and-push.sh` |
| `db-migrate.yml` | `prisma migrate deploy` via one-off ECS tasks (never `db push`) | `run-migrations.sh` |
| `deploy.yml` | Register new task-def revision + force new ECS deployment | `deploy-service.sh` |
| `release.yml` | Orchestrates build → migrate (optional) → deploy with one shared image tag | — |

## Usage

- **Full release:** Actions → **Release** → pick `environment`, leave
  `image_tag` blank (defaults to commit SHA), `services=all`,
  `run_migrate=true`. Builds everything, migrates, then deploys.
- **Code-only redeploy (no schema change):** **Release** with
  `run_migrate=false`, or just run **Deploy** directly.
- **One service:** set `services=auth-service` (or a comma list) on **Build &
  Push** / **Deploy** / **Release**.
- **Migrations only:** run **DB Migrate** on its own.

The `image_tag` is resolved once in `release.yml` and passed to every stage, so
build, migrate and deploy all use the same images.

## One-time setup

Required AWS/GitHub configuration (Environments, `vars.*`, `secrets.*`, and the
IAM user credentials) is documented separately in
[`ONETIME_README.md`](./ONETIME_README.md). Complete that once per environment
before running any pipeline.

For the exact list of variables and secrets to set (with examples and a
per-workflow breakdown), see [`VARIABLES.md`](./VARIABLES.md).

## Prerequisite for migrations

`migrate deploy` only applies migrations committed under `prisma/migrations/`.
Until each DB is baselined (see `infra/ecs/migrations/MIGRATION_STRATEGY.md`),
the migrate stage is a safe no-op.
