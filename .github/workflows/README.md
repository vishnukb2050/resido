# GitHub Actions — Resido CI/CD

Pipeline structure (manually triggered via the **Actions** tab). Stage workflows
are reusable (`workflow_call`) and runnable on their own; `release.yml` chains
them in order for both **dev** and **prod**.

```
release.yml  (orchestrator)
  └─ 1. terraform.yml       VPC, RDS, Redis, ECS, Secrets (optional)
  └─ 2. db-migrate.yml       prisma migrate deploy (builds 3 migration images)
  └─ 3. build-and-push.yml   build ALL images → ECR
  └─ 4. deploy.yml           rolling ECS deploy
```

All stages reuse scripts in `infra/ecs/scripts/` — no deploy logic duplicated in YAML.

| Workflow | Purpose | Underlying script |
| --- | --- | --- |
| `terraform.yml` | `terraform apply` for dev/prod infra | `infra/ecs/terraform_infra/` |
| `db-migrate.yml` | `prisma migrate deploy` via one-off ECS tasks | `run-migrations.sh` |
| `build-and-push.yml` | Build all service images, push to ECR | `build-and-push.sh` |
| `deploy.yml` | Register task-def revision + ECS rolling deploy | `deploy-service.sh` |
| `release.yml` | Orchestrates terraform → migrate → build → deploy | — |

## Usage

### First-time bootstrap (dev or prod)

Actions → **Release** →

| Input | Value |
| --- | --- |
| `environment` | `dev` or `prod` |
| `run_terraform` | **true** |
| `run_migrate` | **true** |
| `services` | `all` |

After Terraform completes, update `REPLACE_ME_*` secrets in AWS Secrets Manager
(see `terraform output secrets_requiring_manual_update`), then re-run **Release**
with `run_terraform=false` if migrate failed on placeholder secrets.

Or run stages individually in order: **Terraform** → **DB Migrate** → **Build & Push** → **Deploy**.

### Normal code release (infra already exists)

Actions → **Release** →

| Input | Value |
| --- | --- |
| `run_terraform` | **false** |
| `run_migrate` | **true** if schema changed, else **false** |
| `services` | `all` or comma-separated |

### Individual stages

- **Terraform only:** Actions → **Terraform** → `dev` or `prod`, `plan` or `apply`
- **Migrations only:** Actions → **DB Migrate**
- **Build only:** Actions → **Build & Push**
- **Deploy only:** Actions → **Deploy** (no migrations)

The `image_tag` is resolved once in `release.yml` and passed to migrate, build,
and deploy so all stages use the same images.

## One-time setup

Configure GitHub **Environments** named `dev` and `prod` (not `staging`).
See **[`GITHUB_ENVIRONMENT_VARIABLES.md`](../GITHUB_ENVIRONMENT_VARIABLES.md)**
for the full variable/secret list, bootstrap order, and `gh` CLI commands.

Quick reference: [`VARIABLES.md`](./VARIABLES.md).

## Prerequisite for migrations

`migrate deploy` applies SQL under `prisma/migrations/`. Baselines are committed
in-repo (`0_init/migration.sql` per DB). ECS never uses `prisma db push`
(`RUN_PRISMA_PUSH=false` on all task definitions).
