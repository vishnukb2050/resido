# GitHub Environment Variables & Secrets

Configure per environment: **`dev`** and **`prod`**

Settings → Environments → `<env>` → Environment variables / Environment secrets

## Secrets (set before any pipeline run)

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Variables — before first Terraform run

- `AWS_REGION`
- `TF_STATE_BUCKET` (S3 bucket you create manually in AWS)
- `AWS_ACCOUNT_ID`

## Variables — after Terraform apply (copy from `terraform output`)

- `ECS_CLUSTER`
- `ECS_SUBNETS` (comma-separated subnet IDs, no spaces)
- `ECS_SECURITY_GROUPS`
- `TASK_EXECUTION_ROLE`
- `TASK_ROLE`
- `LOG_GROUP_PREFIX` (e.g. `/resido/dev` or `/resido/prod`)
- `MIGRATE_LOG_GROUP` (e.g. `/resido/dev/db-migrate` or `/resido/prod/db-migrate`)
