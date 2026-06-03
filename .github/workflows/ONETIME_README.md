# One-Time CI/CD Setup — Resido

Do this once per AWS environment before running any pipeline
(`build-and-push.yml`, `db-migrate.yml`, `deploy.yml`, `release.yml`).

## Where to configure things (quick map)

| What | Where | Notes |
| --- | --- | --- |
| **ECR login** | GitHub Environment **secrets** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` + **vars** `AWS_ACCOUNT_ID`, `AWS_REGION` | Pipeline configures these IAM-user credentials, then `amazon-ecr-login` gets a short-lived ECR token. No ECR username/password is stored directly. |
| **ECR registry URL** | Derived automatically | `{AWS_ACCOUNT_ID}.dkr.ecr.{AWS_REGION}.amazonaws.com` — set only account + region in vars. |
| **ECR repository names** | Terraform + code convention | One repo per service, name = folder name (`auth-service`, `chat-service`, …). Defined in `infra/ecs/terraform_infra/main.tf` → `service_repository_names`. Pipelines push to that name; you do **not** configure repo names in GitHub. |
| **DB URLs, JWT, R2, MSG91, etc.** | AWS **Secrets Manager** (from `infra/.env` on first Terraform apply) | Used by **running ECS tasks** and the **db-migrate** ECS task — **not** by the GitHub build/deploy jobs. See `infra/ecs/CONFIGURATION.md`. |
| **ECS cluster, subnets, task roles** | GitHub Environment **variables** (table below) | Used by migrate + deploy pipelines. |

**GitHub UI path:** repo → **Settings** → **Environments** → `prod` (or `staging`) → **Environment variables** / **Environment secrets**.

---

## 1. Create a GitHub Environment

Under *Settings → Environments*, create one Environment per target:
`prod` and `staging`. The workflows select the Environment from the
`environment` input, so each gets its own variables/secrets and (optionally)
required reviewers.

## 2. Environment variables (`vars.*`)

| Name | Example | Used by |
| --- | --- | --- |
| `AWS_REGION` | `ap-south-1` | all |
| `AWS_ACCOUNT_ID` | `123456789012` | all |
| `ECS_CLUSTER` | `resido-prod` | migrate, deploy |
| `ECS_SUBNETS` | `subnet-aaa,subnet-bbb` | migrate (one-off task networking) |
| `ECS_SECURITY_GROUPS` | `sg-aaa` | migrate (one-off task networking) |
| `TASK_EXECUTION_ROLE` | `arn:aws:iam::123456789012:role/resido-prod-task-execution` | migrate, deploy |
| `TASK_ROLE` | `arn:aws:iam::123456789012:role/resido-prod-task` | migrate, deploy |
| `LOG_GROUP_PREFIX` | `/resido/prod` | deploy (per-service group appended) |
| `MIGRATE_LOG_GROUP` | `/resido/prod/db-migrate` | migrate |

## 3. Environment secrets (`secrets.*`)

| Name | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | IAM user access key the pipeline uses for AWS (ECR + ECS) |
| `AWS_SECRET_ACCESS_KEY` | Matching secret key |

These belong to an IAM **user** (programmatic access). Attach a policy with the
permissions in section 4. Rotate them periodically — unlike OIDC these are
long-lived credentials, so keep them only as **Environment secrets** (never in
code or `vars`).

### ECR repository names (already fixed in code)

Repos must exist in AWS before the first push (Terraform creates them):

`api-gateway`, `auth-service`, `resident-service`, `chat-service`,
`notification-service`, `visitor-service`, `flaredthread-service`,
`business-service`, `media-worker`.

Push target example:

`123456789012.dkr.ecr.ap-south-1.amazonaws.com/auth-service:<git-sha>`

That URL is built in `infra/ecs/scripts/build-and-push.sh` from
`AWS_ACCOUNT_ID`, `AWS_REGION`, and the service folder name.

## 4. IAM user for the pipeline

Create an IAM **user** with programmatic access, generate an access key, and
put the key/secret in the Environment secrets from section 3
(`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

**Permissions policy** — minimum the pipelines need:

- `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`,
  `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`,
  `ecr:CompleteLayerUpload`, `ecr:PutImage` (build & push)
- `ecs:RegisterTaskDefinition`, `ecs:RunTask`, `ecs:UpdateService`,
  `ecs:DescribeTasks`, `ecs:DescribeServices` (migrate & deploy)
- `logs:CreateLogGroup` (migrate task log group)
- `iam:PassRole` on `TASK_EXECUTION_ROLE` and `TASK_ROLE`

## 5. Migration baselines (prerequisite for the migrate stage)

`prisma migrate deploy` only applies migrations committed under
`prisma/migrations/`. Until each DB is baselined, the migrate stage is a safe
no-op. Baseline once per DB (`resido_master`, `resido_users`, `resido_core`,
`resido_geodata`) following `infra/ecs/migrations/MIGRATION_STRATEGY.md`, then
commit the generated migration folders.

---

After this is in place, trigger pipelines from the **Actions** tab — see
`.github/workflows/README.md` for usage.
