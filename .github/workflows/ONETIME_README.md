# One-Time CI/CD Setup — Resido

Do this once per AWS environment (`dev` and `prod`) before running pipelines.

## Pipeline order (dev and prod)

```
1. Terraform     →  VPC, ECR, ALB, RDS, Redis, Secrets, ECS cluster
2. DB Migrate    →  ensure-databases.js + prisma migrate deploy
3. Build & Push  →  all 9 service images to ECR
4. Deploy        →  rolling ECS update
```

Use **Release** with `run_terraform=true` for first bootstrap, or run each
workflow separately in that order.

## Where to configure things

| What | Where | Notes |
| --- | --- | --- |
| **Infra (VPC, RDS, ECS, ECR)** | `terraform-apply.yml` → `infra/ecs/terraform_infra/` | Plan first with `terraform.yml` if you want a dry run. Uses `envs/dev.tfvars` or `envs/prod.tfvars`. |
| **ECR login** | GitHub secrets + vars | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`, `AWS_REGION`. |
| **DB URLs, Redis** | AWS Secrets Manager | Auto-filled by Terraform (`wire_terraform_infra_secrets=true`). |
| **JWT, MSG91, R2, Firebase** | AWS Secrets Manager | Start as `REPLACE_ME_*`; update after first `terraform apply`. |
| **ECS cluster, subnets, roles** | GitHub Environment **variables** | Copy from `terraform output` after first apply. |

**GitHub UI:** repo → **Settings** → **Environments** → `dev` or `prod`.

Full variable/secret guide: **[`GITHUB_ENVIRONMENT_VARIABLES.md`](../GITHUB_ENVIRONMENT_VARIABLES.md)**

---

## 1. Create GitHub Environments

Create two environments: **`dev`** and **`prod`**. Each gets its own variables,
secrets, and optional required reviewers.

The workflow `environment` input must match Terraform tfvars (`dev` / `prod`).

## 2. Environment variables (`vars.*`)

See [`VARIABLES.md`](./VARIABLES.md) for the full table. After first Terraform apply:

```bash
cd infra/ecs/terraform_infra
terraform init -backend-config=envs/prod.backend.hcl -reconfigure
terraform output ecs_cluster_name
terraform output public_subnet_ids
terraform output ecs_service_security_group_id
terraform output task_execution_role_arn
terraform output task_role_arn
```

## 3. Environment secrets (`secrets.*`)

| Name | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | IAM user for pipelines |
| `AWS_SECRET_ACCESS_KEY` | Matching secret |

## 4. IAM user for the pipeline

### Build / migrate / deploy

- `ecr:*` (push/pull)
- `ecs:RegisterTaskDefinition`, `ecs:RunTask`, `ecs:UpdateService`, `ecs:Describe*`
- `logs:CreateLogGroup`
- `iam:PassRole` on task execution + task roles

### Terraform (additional — or use a separate IAM user)

Terraform apply needs broad permissions, including:

- `ec2`, `elasticloadbalancing`, `ecs`, `ecr`, `rds`, `elasticache`
- `secretsmanager`, `logs`, `servicediscovery`, `iam` (roles/policies)
- `s3` (state bucket — if same credentials manage backend)

For production, consider a dedicated Terraform IAM user or OIDC role with
scoped admin on the Resido stack.

## 5. S3 state buckets (before first Terraform run)

```bash
aws s3 mb s3://resido-tfstate-dev  --region ap-south-1
aws s3 mb s3://resido-tfstate-prod --region ap-south-1
```

See `infra/ecs/CONFIGURATION.md` for versioning setup.

## 6. Migration baselines

Committed under `apps/*/prisma/**/migrations/0_init/`. The migrate stage runs
`prisma migrate deploy` — never `db push` on ECS.

---

After setup, run **Release** (or stages individually) from the **Actions** tab.
See [`.github/workflows/README.md`](./README.md).
