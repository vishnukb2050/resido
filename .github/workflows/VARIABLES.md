# GitHub Variables & Secrets — quick reference

**Full setup guide:** [`../GITHUB_ENVIRONMENT_VARIABLES.md`](../GITHUB_ENVIRONMENT_VARIABLES.md)

---

## Per environment (`dev` and `prod`)

### Secrets (2)

| Secret | Used by |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | All workflows |
| `AWS_SECRET_ACCESS_KEY` | All workflows |

### Variables (10)

| Variable | Stages |
| --- | --- |
| `AWS_REGION` | All |
| `TF_STATE_BUCKET` | **Terraform** (separate S3 bucket per env) |
| `AWS_ACCOUNT_ID` | Migrate, Build, Deploy |
| `ECS_CLUSTER` | Migrate, Deploy |
| `ECS_SUBNETS` | Migrate |
| `ECS_SECURITY_GROUPS` | Migrate |
| `TASK_EXECUTION_ROLE` | Migrate, Deploy |
| `TASK_ROLE` | Migrate, Deploy |
| `LOG_GROUP_PREFIX` | Deploy |
| `MIGRATE_LOG_GROUP` | Migrate |

**Terraform** needs: 2 secrets + `AWS_REGION` + `TF_STATE_BUCKET`.

**Full Release** needs: 2 secrets + all 10 variables.

`ECS_*` and role ARNs come from `terraform output` after the first infra apply.
`TF_STATE_BUCKET` must exist in AWS **before** the first Terraform run.
