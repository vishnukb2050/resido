# Resido on ECS — Terraform Infra

One Terraform stack that stands up **every piece of AWS infrastructure**
the ECS Fargate deployment needs, in one apply, per environment.

```
VPC (public subnets only, no NAT)
 ├─ ECR repositories (one per service)
 ├─ ALB + target groups + listeners
 ├─ RDS Postgres (private via SG)
 ├─ ElastiCache Redis (private via SG)
 ├─ Secrets Manager (DB URLs, infra secrets, app secrets)
 └─ ECS Fargate cluster
       ├─ Cloud Map private DNS namespace (resido.local)
       ├─ Task execution + task IAM roles
       ├─ CloudWatch log groups (one per service)
       └─ ECS services + task definitions (one per service)
```

Everything lives in **the same VPC**, in **the same region**, in **public
subnets only** (no NAT gateway → ~$32/month saved per AZ). Fargate tasks
get a public IP so they can pull from ECR / Secrets Manager / CloudWatch
over the IGW; RDS and Redis sit in those same public subnets but are
firewalled to the ECS service SG via security groups.

## How every ECS task connects to its dependencies — and what it costs

| From → To              | Path                                                 | Network plumbing                                                                                                              | IAM plumbing                                                                                                                                            | Data transfer cost (same region) |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| ECS task → **RDS**     | TCP 5432, **inside the VPC**                         | `modules/rds`: `aws_security_group_rule.rds_from_ecs` allows 5432 from the ECS service SG.                                    | None — DB URL with username/password is injected from Secrets Manager.                                                                                  | **$0** same AZ · $0.01/GB cross-AZ |
| ECS task → **Redis**   | TCP 6379, **inside the VPC**                         | `modules/redis`: `aws_security_group_rule.redis_from_ecs` allows 6379 from the ECS service SG.                                | None — `redis-url` injected from Secrets Manager.                                                                                                       | **$0** same AZ · $0.01/GB cross-AZ |
| ECS task → **ECR**     | HTTPS to `api.ecr.<region>` + `*.dkr.ecr.<region>` + S3 layers | Public path: IGW → regional ECR endpoint (no NAT, no data processing). Private path (optional): interface endpoints + S3 gateway. | `modules/ecs/iam.tf`: `aws_iam_policy.ecr_pull` scoped to resido repo ARNs only. Plus per-repo `aws_ecr_repository_policy` in `modules/ecr/main.tf`.    | **$0** (same-region ECR pulls are free) |
| ECS task → **Secrets Manager** | HTTPS to `secretsmanager.<region>`           | Public path via IGW (free). Private path via interface endpoint (extra cost — see below).                                     | `modules/ecs/iam.tf`: `aws_iam_policy.secrets_read` scoped to the secret ARNs we created. Used by the ECS agent to populate `secrets[]` in the task.    | **$0** data transfer · $0.05 per 10 000 API calls |
| ECS task → **CloudWatch Logs** | HTTPS to `logs.<region>`                     | Public path via IGW or private interface endpoint.                                                                            | Managed `AmazonECSTaskExecutionRolePolicy` grants `logs:CreateLogStream` / `PutLogEvents`.                                                              | **$0** data transfer · $0.50/GB ingested |
| ECS task → **other ECS service** | `http://<svc>.resido.local:<port>`         | Cloud Map private DNS (`modules/ecs/cluster.tf`); intra-SG ingress via `aws_security_group_rule.service_self_all` in main.tf. | None.                                                                                                                                                   | **$0** same AZ · $0.01/GB cross-AZ |
| ALB → ECS task         | HTTP to container port                               | `aws_security_group_rule.alb_to_api_gateway` (3000) and `…_alb_to_chat_service` (3004).                                       | None.                                                                                                                                                   | **$0** |

### "Internal" already means zero cost — here's why

Everything in the table sits in the **same VPC, same region**. AWS does
not charge for data transfer between an EC2/Fargate task and another AWS
service in the same region:

- **RDS** and **Redis**: same VPC, never leave the AWS network. Same-AZ
  is completely free; the only line-item charge is `$0.01/GB` when the
  task happens to be in a different AZ than the RDS primary or the
  Redis node (cost of HA, unavoidable in prod).
- **ECR** image pulls: free in the same region regardless of whether
  you use the public regional endpoint via the IGW or a VPC interface
  endpoint. AWS confirms this in their containers blog.
- **Secrets Manager** / **CloudWatch Logs**: the API requests cost a
  trivial amount per call. The bytes themselves transfer for free in
  the same region.

The **IGW** does NOT charge per-GB (that's NAT Gateway you might be
thinking of, and we don't have one). So tasks with public IPs talking
to AWS regional endpoints over the IGW pay **$0** for the network.

### What about VPC interface endpoints?

We ship them as an opt-in toggle for **security and compliance**, not
cost. They actually ADD cost:

| Component                         | Charge                                   |
| --------------------------------- | ---------------------------------------- |
| Interface endpoint hourly fee     | $0.013 / hour / AZ ≈ **$9.36/mo each**   |
| Data processed through endpoint   | **$0.01/GB**                             |
| Stack total (6 endpoints × 2 AZs) | **~$112/mo + per-GB**                    |
| S3 gateway endpoint               | **FREE** (always on — required for ECR)  |

Both `dev.tfvars` and `prod.tfvars` now ship with
`enable_vpc_interface_endpoints = false` for this reason. Flip it to
`true` only when one of these is true:

- A compliance regime (PCI-DSS, HIPAA, SOC 2) requires no traffic to
  the public AWS endpoints, even from inside AWS.
- You want to move ECS tasks to private subnets (no public IP) — at
  that point the interface endpoints become functionally required,
  because without them ECR/Secrets/Logs would be unreachable.

### How to verify nothing is leaking out of region

After apply, run:

```bash
# Confirm RDS is in your VPC and only the ECS SG can talk to it on 5432.
aws ec2 describe-security-group-rules \
    --filters "Name=group-id,Values=$(terraform output -raw ecs_service_security_group_id)" \
    --region "$(terraform output -raw aws_region)"

# Confirm Redis security group only allows the ECS SG.
aws elasticache describe-cache-clusters \
    --show-cache-node-info --region "$(terraform output -raw aws_region)"

# Confirm Fargate tasks pull from the same-region ECR (no cross-region).
aws ecs describe-task-definition \
    --task-definition resido-prod-auth-service \
    --query 'taskDefinition.containerDefinitions[0].image'
```

You should see the RDS / Redis endpoints under the VPC ID Terraform
created, and the image URL `${account}.dkr.ecr.<region>.amazonaws.com/…`
in the **same region** Terraform is operating in.

### Minimising the only real cross-AZ line item

The one charge that does show up in monthly invoices for a healthy prod
stack is the **$0.01/GB cross-AZ traffic** between an ECS task and the
RDS primary when they happen to be in different AZs. To minimise it:

- Keep `service_desired_count_default = 2` so you have a task in each
  AZ — connection pooling at the app level lands most queries on the
  task that happens to be in the same AZ as the RDS primary.
- (Optional, prod-grade) Add an RDS read replica per AZ and route
  read-only Prisma traffic to it via `*_READ_URL` — same-AZ reads
  become free again.

Both are app-layer changes, not Terraform changes.

## Folder layout

```
terraform_infra/
├── versions.tf, backend.tf, variables.tf, outputs.tf, main.tf
├── envs/
│   ├── dev.tfvars           ← cheap, single-AZ-ish, no deletion protection
│   ├── prod.tfvars          ← Multi-AZ RDS, larger instances, deletion protection
│   ├── backend.partial.hcl  ← S3 state key + region (bucket from GitHub var)
│   ├── dev.backend.hcl      ← legacy/local reference (bucket passed separately)
│   └── prod.backend.hcl
└── modules/
    ├── vpc/        — VPC + IGW + public subnets + routes
    ├── ecr/        — Per-service repos with 30-image retention policy
    ├── secrets/    — Secrets Manager containers + DB-URL & redis-URL seeded values
    ├── rds/        — Postgres subnet group, SG, instance
    ├── redis/      — ElastiCache subnet group, SG, single-node cluster
    ├── alb/        — ALB, SG, target groups, listeners + /socket.io/* rule
    └── ecs/        — Cluster, Cloud Map, IAM roles, task defs, services
```

## One-time prerequisites

These exist OUTSIDE this Terraform stack because they cross account
boundaries / chicken-and-egg the state backend:

1. **Two AWS accounts** (or two distinct names in the same account):
   `resido-dev` and `resido-prod`. The Terraform stack assumes you have
   AWS credentials with admin-ish rights in whichever account you're
   applying against (`AWS_PROFILE` or env vars).
2. **State buckets** — create one S3 bucket per environment, then set the name
   in GitHub Environment variable `TF_STATE_BUCKET` (`dev` vs `prod`):
   ```bash
   aws s3 mb s3://resido-tfstate-dev  --region ap-south-1
   aws s3 mb s3://resido-tfstate-prod --region ap-south-1
   aws s3api put-bucket-versioning --bucket resido-tfstate-dev  --versioning-configuration Status=Enabled
   aws s3api put-bucket-versioning --bucket resido-tfstate-prod --versioning-configuration Status=Enabled
   ```
   CI passes the bucket to Terraform: `terraform init -backend-config=... -backend-config="bucket=$TF_STATE_BUCKET"`.
   See [`.github/GITHUB_ENVIRONMENT_VARIABLES.md`](../../../.github/GITHUB_ENVIRONMENT_VARIABLES.md).
3. **Cloudflare** (prod) — DNS proxied to the ALB; SSL/TLS mode **Flexible**.
   Keep `acm_certificate_arn = ""` in `envs/prod.tfvars` (no TLS on the ALB).

## Single-apply deploy

### Dev

```bash
cd infra/ecs/terraform_infra

# Init — pass your dev state bucket name
terraform init \
  -backend-config=envs/backend.partial.hcl \
  -backend-config="bucket=resido-tfstate-dev" \
  -reconfigure

# Plan + apply with the dev variables
terraform plan  -var-file=envs/dev.tfvars
terraform apply -var-file=envs/dev.tfvars
```

That single apply creates: VPC, IGW, two public subnets, 10 ECR repos,
Secrets Manager containers, RDS Postgres, ElastiCache Redis, ALB +
target groups + listeners, ECS cluster, Cloud Map namespace, IAM roles,
CloudWatch log groups, 10 ECS services with their task definitions, and
all the security-group plumbing.

### Prod

```bash
terraform init \
  -backend-config=envs/backend.partial.hcl \
  -backend-config="bucket=resido-tfstate-prod" \
  -reconfigure
terraform plan  -var-file=envs/prod.tfvars
terraform apply -var-file=envs/prod.tfvars
```

> `-reconfigure` is needed when you switch between environments since
> Terraform caches the backend config under `.terraform/`.

## After the first apply — populate operator-owned secrets

Terraform creates **every** secret in AWS on the first apply. Values you must
supply yourself start with `REPLACE_ME_`. RDS and Redis URLs are filled
automatically when `wire_terraform_infra_secrets = true`.

List secrets that still need your values:

```bash
terraform output secrets_requiring_manual_update
terraform output terraform_auto_generated_secret_names
```

**Auto-generated on first apply** (no manual step): `jwt-secret`, `jwt-refresh-secret`,
`internal-service-secret`, `media-worker-secret`.

| Secret (Secrets Manager name)     | What to put in it                                   |
| --------------------------------- | --------------------------------------------------- |
| `resido/<env>/msg91-auth-key`     | MSG91 API key for OTP SMS                           |
| `resido/<env>/msg91-template-id`  | MSG91 OTP template ID                               |
| `resido/<env>/aws-access-key-id`  | Cloudflare R2 access key                            |
| `resido/<env>/aws-secret-access-key` | Cloudflare R2 secret key                         |
| `resido/<env>/aws-s3-endpoint`    | R2 S3-compatible endpoint                           |
| `resido/<env>/aws-s3-bucket-name` | R2 bucket name                                      |
| `resido/<env>/cloudflare-r2-public-url` | Public CDN URL for uploads                    |
| `resido/<env>/firebase-service-account-json` | Firebase service account JSON string   |
| `resido/<env>/cors-origins`       | Comma-separated admin origins (optional)            |

Populate **manual** secrets with the CLI (run once per environment, after infra exists):

```bash
ENV=prod   # or dev
for name in msg91-auth-key msg91-template-id aws-access-key-id aws-secret-access-key \
    aws-s3-endpoint aws-s3-bucket-name cloudflare-r2-public-url \
    firebase-service-account-json cors-origins; do
    read -srp "Value for resido/${ENV}/${name}: " value && echo
    aws secretsmanager put-secret-value \
        --secret-id "resido/${ENV}/${name}" \
        --secret-string "$value"
done
```

Optional: seed from a local file instead of placeholders by setting
`dotenv_path` to your `.env` file before the first apply.

Terraform deliberately ignores subsequent changes to secret
values, so you can rotate them through the AWS console / `put-secret-value`
forever without `terraform apply` trying to roll them back.

The DB URLs and Redis connection vars are managed by Terraform when
`wire_terraform_infra_secrets = true` — they are **not** `REPLACE_ME_` placeholders.

## Extra databases — created automatically by the migrate task

RDS creates only `resido_master` at boot. The four extra logical databases
(`resido_users`, `resido_core`, `resido_geodata`, `resido_notifications`) are
created **automatically** by the `db-migrate` ECS task, which runs
`node ensure-databases.js` before `prisma migrate deploy`. It runs inside the
VPC (so it can reach the private RDS), and is idempotent.

So the order is simply:

1. `terraform apply` (or **Terraform** workflow) → RDS instance + `resido_master` + ECS + secrets
2. **Release** with `run_migrate=true` → `db-migrate` task:
   - `ensure-databases.js` creates the other four DBs if missing
   - `prisma migrate deploy` creates/updates all tables

No manual `psql` step. (Fallback, only if you bypass the migrate task: connect
to the server's `postgres` DB and `CREATE DATABASE resido_users;` etc.)

## Drive the existing deploy scripts

`terraform apply` prints a `ci_env_exports` block. Source it before you
call the deploy scripts in `infra/ecs/scripts/`:

```bash
eval "$(terraform output -raw ci_env_exports)"

# Build + push every service image to ECR
bash ../scripts/build-and-push.sh --all

# Run migrations (one-off ECS task; blocks until exit code 0)
bash ../scripts/run-migrations.sh

# Roll forward every service
bash ../scripts/deploy-service.sh --all
```

## Cost notes (ap-south-1, list price)

| Component                                | Dev (estimate) | Prod (estimate) |
| ---------------------------------------- | -------------- | --------------- |
| 10 × Fargate tasks @ 0.5 vCPU / 1 GiB    | ~$72/mo        | ~$144/mo (x2)   |
| ALB                                      | ~$22/mo        | ~$22/mo         |
| RDS db.t4g.micro single-AZ (dev)         | ~$15/mo        |                 |
| RDS db.t4g.small Multi-AZ (prod)         |                | ~$70/mo         |
| ElastiCache cache.t4g.micro              | ~$12/mo        | ~$24/mo         |
| ECR storage                              | <$1/mo         | <$5/mo          |
| Secrets Manager (~15 secrets)            | ~$6/mo         | ~$6/mo          |
| CloudWatch Logs                          | <$5/mo         | <$30/mo         |
| **No NAT** (public-subnet design)        | **$0**         | **$0**          |
| **Total (rough)**                        | **~$135/mo**   | **~$300/mo**    |

If you decide you want NAT later, swap the public-subnet ECS tasks to
private subnets and add a single NAT gateway (~$32/mo per AZ); the rest
of the stack remains unchanged.

## Tearing down a dev environment

```bash
terraform destroy -var-file=envs/dev.tfvars
```

Because `rds_deletion_protection = false` and `force_delete = true` are
set in `envs/dev.tfvars`, destroy will clean up RDS and ECR even if
they still hold data/images. **Never** do this in prod — `prod.tfvars`
keeps deletion protection on RDS.

## Common operational tasks

```bash
# Look at a service's logs:
aws logs tail /resido/prod/auth-service --since 15m --follow

# Open a shell inside a running task (Session Manager):
aws ecs execute-command --cluster resido-prod-cluster \
    --task <task-arn> --container auth-service --interactive --command /bin/sh

# Rotate a secret value (terraform ignores it after first apply):
aws secretsmanager put-secret-value \
    --secret-id resido/prod/jwt-secret --secret-string "<new value>"

# Force a redeploy after rotating a secret:
aws ecs update-service --cluster resido-prod-cluster \
    --service resido-prod-auth-service --force-new-deployment
```
