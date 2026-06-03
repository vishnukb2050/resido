# GitHub Variables & Secrets Reference — Resido CI/CD

Every variable and secret the pipelines read, where to set it, and which
workflow uses it. Set these per **Environment** (`prod`, `staging`).

**UI path:** repo → **Settings** → **Environments** → `<env>` →
**Environment variables** / **Environment secrets**.

> Variables (`vars.*`) are plain config and visible in logs.
> Secrets (`secrets.*`) are masked. Put credentials in **secrets** only.

---

## Secrets (`secrets.*`)

| Secret | Example | Used by | Notes |
| --- | --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | build, migrate, deploy | IAM user programmatic key. |
| `AWS_SECRET_ACCESS_KEY` | `wJalr...` | build, migrate, deploy | Matching secret. Rotate periodically. |

## Variables (`vars.*`)

| Variable | Example | Used by | Notes |
| --- | --- | --- | --- |
| `AWS_REGION` | `ap-south-1` | build, migrate, deploy | AWS region for ECR + ECS. |
| `AWS_ACCOUNT_ID` | `123456789012` | build, migrate, deploy | Builds the ECR registry URL. |
| `ECS_CLUSTER` | `resido-prod` | migrate, deploy | ECS cluster name. |
| `ECS_SUBNETS` | `subnet-aaa,subnet-bbb` | migrate | Comma-separated, no spaces. One-off migrate task networking. |
| `ECS_SECURITY_GROUPS` | `sg-aaa` | migrate | Comma-separated, no spaces. |
| `TASK_EXECUTION_ROLE` | `arn:aws:iam::123456789012:role/resido-prod-ecs-task-execution` | migrate, deploy | Pulls images + reads Secrets Manager. |
| `TASK_ROLE` | `arn:aws:iam::123456789012:role/resido-prod-ecs-task` | migrate, deploy | App runtime role. |
| `LOG_GROUP_PREFIX` | `/resido/prod` | deploy | Per-service group appended (`/resido/prod/<svc>`). |
| `MIGRATE_LOG_GROUP` | `/resido/prod/db-migrate` | migrate | CloudWatch group for the migrate task. |

---

## What each workflow needs

| Workflow | Secrets | Variables |
| --- | --- | --- |
| **build-and-push.yml** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `AWS_REGION`, `AWS_ACCOUNT_ID` |
| **db-migrate.yml** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `AWS_REGION`, `AWS_ACCOUNT_ID`, `ECS_CLUSTER`, `ECS_SUBNETS`, `ECS_SECURITY_GROUPS`, `TASK_EXECUTION_ROLE`, `TASK_ROLE`, `MIGRATE_LOG_GROUP` |
| **deploy.yml** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `AWS_REGION`, `AWS_ACCOUNT_ID`, `ECS_CLUSTER`, `TASK_EXECUTION_ROLE`, `TASK_ROLE`, `LOG_GROUP_PREFIX` |
| **release.yml** (calls all 3) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | All 9 variables above |

So to run the full **Release**, configure **all 9 variables + 2 secrets**.

---

## Set via GitHub CLI (optional)

```bash
ENV=prod   # GitHub Environment name

# Variables
gh variable set AWS_REGION           --env "$ENV" --body "ap-south-1"
gh variable set AWS_ACCOUNT_ID       --env "$ENV" --body "123456789012"
gh variable set ECS_CLUSTER          --env "$ENV" --body "resido-prod"
gh variable set ECS_SUBNETS          --env "$ENV" --body "subnet-aaa,subnet-bbb"
gh variable set ECS_SECURITY_GROUPS  --env "$ENV" --body "sg-aaa"
gh variable set TASK_EXECUTION_ROLE  --env "$ENV" --body "arn:aws:iam::123456789012:role/resido-prod-ecs-task-execution"
gh variable set TASK_ROLE            --env "$ENV" --body "arn:aws:iam::123456789012:role/resido-prod-ecs-task"
gh variable set LOG_GROUP_PREFIX     --env "$ENV" --body "/resido/prod"
gh variable set MIGRATE_LOG_GROUP    --env "$ENV" --body "/resido/prod/db-migrate"

# Secrets
gh secret set AWS_ACCESS_KEY_ID      --env "$ENV" --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY  --env "$ENV" --body "wJalr..."
```

---

## Not set in GitHub

| Item | Where instead |
| --- | --- |
| ECR repository names | Terraform (`infra/ecs/terraform_infra/main.tf`) |
| DB URLs, `JWT_SECRET`, R2, MSG91 | AWS Secrets Manager (seeded from `infra/.env`) — see `infra/ecs/CONFIGURATION.md` |
| `ENV` (`prod`/`staging`) | Chosen at run time via the workflow input |

For the IAM policy these credentials need and migration baselines, see
[`ONETIME_README.md`](./ONETIME_README.md).
