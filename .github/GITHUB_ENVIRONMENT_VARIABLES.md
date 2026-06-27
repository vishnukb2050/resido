# GitHub Environment Variables & Secrets — Resido CI/CD

This document lists everything you must configure in GitHub **before and after**
running the deployment pipelines for **dev** and **prod**.

**UI path:** Repository → **Settings** → **Environments** → `dev` or `prod`

Pipelines are **manual only** (Actions → Run workflow). Nothing runs on git push.

---

## 1. Create two GitHub Environments

| Environment name | Terraform tfvars | ECS cluster (after apply) |
| ---------------- | ---------------- | ------------------------- |
| `dev`            | `envs/dev.tfvars`  | `resido-dev`              |
| `prod`           | `envs/prod.tfvars` | `resido-prod`             |

The workflow **environment** input (`dev` / `prod`) must match the GitHub
Environment name and the Terraform `environment` value in tfvars.

Each environment has its **own** variables and secrets (values differ; names are
the same).

---

## 2. Pipeline stages (both dev and prod)

Every environment goes through the same four stages (or use **Release** to chain
them):

```
1. Terraform      →  VPC, ECR, ALB, RDS, Redis, Secrets Manager, ECS
2. DB Migrate     →  ensure-databases.js + prisma migrate deploy
3. Build & Push   →  all 9 service images → ECR
4. Deploy         →  rolling ECS update
```

| Workflow file        | Manual trigger name   |
| -------------------- | --------------------- |
| `terraform.yml` | **Terraform · Plan** (preview only) |
| `terraform-apply.yml` | **Terraform · Apply** (creates infra) |
| `db-migrate.yml`     | **DB Migrate**        |
| `build-and-push.yml` | **Build & Push**      |
| `deploy.yml`         | **Deploy**            |
| `release.yml`        | **Release** (all 4)   |

---

## 3. Secrets (2 per environment)

Set under **Environment secrets** — never use plain variables for credentials.

| Secret                    | Required for                         | Notes                          |
| ------------------------- | ------------------------------------ | ------------------------------ |
| `AWS_ACCESS_KEY_ID`       | Terraform, Migrate, Build, Deploy    | IAM user programmatic access key |
| `AWS_SECRET_ACCESS_KEY`   | Terraform, Migrate, Build, Deploy    | Matching secret key            |

Use separate IAM users for `dev` and `prod` in production setups (recommended).

---

## 4. Variables (10 per environment)

Set under **Environment variables** (visible in logs — no secrets here).

| Variable                | Example (`dev`)                                      | Example (`prod`)                                     | Used by stage(s)        |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ----------------------- |
| `AWS_REGION`            | `ap-south-1`                                         | `ap-south-1`                                         | All                     |
| `TF_STATE_BUCKET`       | `resido-tfstate-dev`                                 | `resido-tfstate-prod`                                | **Terraform only**    |
| `AWS_ACCOUNT_ID`        | `123456789012`                                       | `123456789012`                                       | Migrate, Build, Deploy  |
| `ECS_CLUSTER`           | `resido-dev`                                         | `resido-prod`                                        | Migrate, Deploy         |
| `ECS_SUBNETS`           | `subnet-aaa111,subnet-bbb222`                        | `subnet-ccc333,subnet-ddd444`                        | Migrate only            |
| `ECS_SECURITY_GROUPS`   | `sg-0abc123`                                         | `sg-0def456`                                         | Migrate only            |
| `TASK_EXECUTION_ROLE`   | `arn:aws:iam::123456789012:role/resido-dev-ecs-task-execution`  | `arn:aws:iam::123456789012:role/resido-prod-ecs-task-execution` | Migrate, Deploy |
| `TASK_ROLE`             | `arn:aws:iam::123456789012:role/resido-dev-ecs-task`            | `arn:aws:iam::123456789012:role/resido-prod-ecs-task`            | Migrate, Deploy |
| `LOG_GROUP_PREFIX`      | `/resido/dev`                                        | `/resido/prod`                                       | Deploy only             |
| `MIGRATE_LOG_GROUP`     | `/resido/dev/db-migrate`                             | `/resido/prod/db-migrate`                            | Migrate only            |

`TF_STATE_BUCKET` is passed to `terraform init` as the S3 backend bucket. **Dev
and prod must use different bucket names** (separate GitHub Environments).

### Which stage needs which variable?

| Stage            | Secrets | Variables needed |
| ---------------- | ------- | ---------------- |
| **Terraform**    | 2       | `AWS_REGION`, **`TF_STATE_BUCKET`** |
| **DB Migrate**   | 2       | `AWS_REGION`, `AWS_ACCOUNT_ID`, `ECS_CLUSTER`, `ECS_SUBNETS`, `ECS_SECURITY_GROUPS`, `TASK_EXECUTION_ROLE`, `TASK_ROLE`, `MIGRATE_LOG_GROUP` |
| **Build & Push** | 2       | `AWS_REGION`, `AWS_ACCOUNT_ID` |
| **Deploy**       | 2       | `AWS_REGION`, `AWS_ACCOUNT_ID`, `ECS_CLUSTER`, `TASK_EXECUTION_ROLE`, `TASK_ROLE`, `LOG_GROUP_PREFIX` |
| **Release**      | 2       | **All 10 variables** |

---

## 5. Bootstrap order (first time per environment)

### Step A — Before first Terraform run

Configure in GitHub Environment (`dev` or `prod`):

| Item | Required now? |
| ---- | ------------- |
| `AWS_ACCESS_KEY_ID` (secret) | ✅ Yes |
| `AWS_SECRET_ACCESS_KEY` (secret) | ✅ Yes |
| `AWS_REGION` | ✅ Yes |
| `TF_STATE_BUCKET` | ✅ Yes — **separate bucket per env** (see below) |
| `AWS_ACCOUNT_ID` | ✅ Yes (needed for later stages) |
| `ECS_CLUSTER`, `ECS_SUBNETS`, … | ❌ Not yet — created by Terraform |

#### Create the state bucket (once per environment)

Create the S3 bucket **before** the first Terraform run. Use the **same name**
you will set in `TF_STATE_BUCKET`:

```bash
# Dev
aws s3 mb s3://resido-tfstate-dev --region ap-south-1
aws s3api put-bucket-versioning --bucket resido-tfstate-dev \
  --versioning-configuration Status=Enabled

# Prod (different bucket)
aws s3 mb s3://resido-tfstate-prod --region ap-south-1
aws s3api put-bucket-versioning --bucket resido-tfstate-prod \
  --versioning-configuration Status=Enabled
```

Then in GitHub Environment `dev`: `TF_STATE_BUCKET` = `resido-tfstate-dev`  
And in GitHub Environment `prod`: `TF_STATE_BUCKET` = `resido-tfstate-prod`

Run: **Actions → Terraform** → `environment = dev` or `prod` → `apply`.

### Step B — After first Terraform apply

Copy outputs into the **same** GitHub Environment:

```bash
cd infra/ecs/terraform_infra
terraform init \
  -backend-config=envs/backend.partial.hcl \
  -backend-config="bucket=resido-tfstate-dev" \
  -reconfigure   # use your prod bucket name for prod
```
terraform output ecs_cluster_name
terraform output -json public_subnet_ids
terraform output ecs_service_security_group_id
terraform output task_execution_role_arn
terraform output task_role_arn
```

| Terraform output | GitHub variable | Format |
| ---------------- | --------------- | ------ |
| `ecs_cluster_name` | `ECS_CLUSTER` | `resido-dev` or `resido-prod` |
| `public_subnet_ids` | `ECS_SUBNETS` | Comma-separated, **no spaces** |
| `ecs_service_security_group_id` | `ECS_SECURITY_GROUPS` | Single `sg-...` |
| `task_execution_role_arn` | `TASK_EXECUTION_ROLE` | Full ARN |
| `task_role_arn` | `TASK_ROLE` | Full ARN |
| (manual) | `LOG_GROUP_PREFIX` | `/resido/dev` or `/resido/prod` |
| (manual) | `MIGRATE_LOG_GROUP` | `/resido/dev/db-migrate` or `/resido/prod/db-migrate` |

Or use the bundled export block:

```bash
terraform output -raw ci_env_exports
```

### Step C — Update AWS Secrets Manager (not GitHub)

Terraform creates secrets with `REPLACE_ME_*` placeholders. Update real values
in **AWS Secrets Manager** before running app traffic:

```bash
terraform output secrets_requiring_manual_update
```

Examples: `jwt-secret`, `msg91-auth-key`, R2 keys, Firebase JSON, etc.

DB URLs and Redis are **auto-filled** by Terraform when
`wire_terraform_infra_secrets = true`.

### Step D — Run remaining stages

**Actions → Release** with:

| Input | First deploy | Normal release |
| ----- | ------------ | -------------- |
| `run_terraform` | `true` (first time only) | `false` |
| `run_migrate` | `true` | `true` if schema changed |
| `services` | `all` | `all` |

Or run **DB Migrate → Build & Push → Deploy** individually.

---

## 6. Set via GitHub CLI

Run for **each** environment (`dev` and `prod`):

```bash
ENV=dev   # change to prod and use prod values

gh variable set AWS_REGION           --env "$ENV" --body "ap-south-1"
gh variable set TF_STATE_BUCKET      --env "$ENV" --body "resido-tfstate-dev"   # or -prod
gh variable set AWS_ACCOUNT_ID       --env "$ENV" --body "123456789012"
gh variable set ECS_CLUSTER          --env "$ENV" --body "resido-dev"
gh variable set ECS_SUBNETS          --env "$ENV" --body "subnet-aaa,subnet-bbb"
gh variable set ECS_SECURITY_GROUPS  --env "$ENV" --body "sg-xxxxxxxx"
gh variable set TASK_EXECUTION_ROLE  --env "$ENV" --body "arn:aws:iam::123456789012:role/resido-dev-ecs-task-execution"
gh variable set TASK_ROLE            --env "$ENV" --body "arn:aws:iam::123456789012:role/resido-dev-ecs-task"
gh variable set LOG_GROUP_PREFIX       --env "$ENV" --body "/resido/dev"
gh variable set MIGRATE_LOG_GROUP      --env "$ENV" --body "/resido/dev/db-migrate"

gh secret set AWS_ACCESS_KEY_ID      --env "$ENV"
gh secret set AWS_SECRET_ACCESS_KEY  --env "$ENV"
```

---

## 7. IAM permissions (pipeline user)

### Minimum for Build, Migrate, Deploy

- `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, …
- `ecs:RegisterTaskDefinition`, `ecs:RunTask`, `ecs:UpdateService`, `ecs:Describe*`
- `logs:CreateLogGroup`
- `iam:PassRole` on `TASK_EXECUTION_ROLE` and `TASK_ROLE`

### Additional for Terraform stage

Broad create/update on: `ec2`, `elasticloadbalancing`, `ecs`, `ecr`, `rds`,
`elasticache`, `secretsmanager`, `logs`, `servicediscovery`, `iam` (roles).

**S3 state bucket** (named in `TF_STATE_BUCKET`):

- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::BUCKET/*`
- `s3:ListBucket` on `arn:aws:s3:::BUCKET`

The pipeline user does **not** create the state bucket — you create it manually
before the first run (see §5 Step A).

Consider a **separate IAM user** for Terraform vs deploy pipelines in prod.

---

## 8. Not configured in GitHub

| Item | Where instead |
| ---- | ------------- |
| ECR repo names | Terraform (`terraform_infra/main.tf`) |
| DB connection URLs | AWS Secrets Manager (Terraform auto-wires RDS) |
| Redis host/port | AWS Secrets Manager (Terraform auto-wires ElastiCache) |
| JWT, MSG91, R2, Firebase | AWS Secrets Manager (`REPLACE_ME_*` until you update) |
| `ENV` value in task defs | Workflow input (`dev` / `prod`) |
| Cloudflare DNS / TLS | Cloudflare dashboard (not GitHub) |
| Terraform state bucket name | GitHub `TF_STATE_BUCKET` per env — passed to `terraform init` |
| Terraform state object key | Fixed in `envs/backend.partial.hcl` (`ecs/terraform.tfstate`) |

---

## 9. Quick checklist

### Environment `dev`

- [ ] GitHub Environment `dev` created
- [ ] 2 secrets set
- [ ] `TF_STATE_BUCKET` set (matches an existing S3 bucket in AWS)
- [ ] Terraform Apply workflow run successfully
- [ ] Remaining 7 variables filled from `terraform output`
- [ ] AWS Secrets Manager placeholders updated
- [ ] Release (or Migrate → Build → Deploy) run successfully

### Environment `prod`

- [ ] Same checklist with `prod` values
- [ ] Optional: required reviewers on `prod` environment
- [ ] `wire_terraform_infra_secrets` / external DB decision documented in tfvars

---

## Related docs

- [`.github/workflows/README.md`](workflows/README.md) — pipeline usage
- [`.github/workflows/ONETIME_README.md`](workflows/ONETIME_README.md) — IAM and migration baselines
- [`infra/ecs/CONFIGURATION.md`](../infra/ecs/CONFIGURATION.md) — full deploy checklist
- [`infra/ecs/terraform_infra/README.md`](../infra/ecs/terraform_infra/README.md) — Terraform apply guide
