# Resido ECS Infrastructure — Resource Map

This document answers: **does `infra/ecs` contain everything needed to run the full Resido app on AWS ECS?**

**Short answer:** Yes for the **backend microservices stack**. One `terraform apply` in `terraform_infra/` creates VPC, ECR, ALB, RDS, Redis, Secrets Manager, ECS cluster, **9 ECS services**, IAM, Cloud Map, and autoscaling. A few things are **external by design** (Cloudflare R2 for media, MSG91, Firebase, Route 53, admin SPAs).

> **Use this stack:** `infra/ecs/terraform_infra/`  
> **Do not use for ECS:** `infra/terraform/` (older EKS-oriented stack with NAT + optional S3 bucket — different deployment path).

---

## Table of Contents

1. [Architecture diagram](#1-architecture-diagram)
2. [What Terraform creates (complete list)](#2-what-terraform-creates-complete-list)
3. [ECS services vs application code](#3-ecs-services-vs-application-code)
4. [What is NOT in Terraform (external)](#4-what-is-not-in-terraform-external)
5. [Gaps and how to close them](#5-gaps-and-how-to-close-them)
6. [Deploy the entire app](#6-deploy-the-entire-app)
7. [Configuration flow](#7-configuration-flow)
8. [Two ways to register task definitions](#8-two-ways-to-register-task-definitions)

---

## 1. Architecture diagram

```
Internet (HTTPS)
   │
   ▼
Cloudflare (TLS termination — orange-cloud proxy)     [external]
   │  https://residoapp.com → http://<ALB>:80
   ▼
Application Load Balancer  HTTP :80 only              [terraform: modules/alb]
   ├── /socket.io/*     → chat-service :3004
   ├── /flares-io/*     → flaredthread-service :3008
   └── /* (default)     → api-gateway :3000
   │
   ▼
ECS Fargate cluster (resido-<env>-cluster)     [terraform: modules/ecs]
   │
   ├── api-gateway          :3000  (ALB)       desired_count 2+ (autoscaling)
   ├── chat-service         :3004  (ALB)       WebSocket + HTTP
   ├── flaredthread-service :3008  (ALB)       flare live comments
   ├── auth-service         :3001  (private)   Cloud Map only
   ├── resident-service     :3002  (private)
   ├── business-service     :3009  (private)
   ├── visitor-service      :3006  (private)
   ├── notification-service :3005  (private)
   └── media-worker         (no port)           BullMQ video transcode worker
   │
   │  Service discovery: http://<service>.resido.local:<port>
   │
   ├──► RDS PostgreSQL (resido_master + 5 logical DBs)   [terraform: modules/rds]
   ├──► ElastiCache Redis (single node)                  [terraform: modules/redis]
   └──► Secrets Manager (all .env keys + wired DB URLs)  [terraform: modules/secrets]

External (not Terraform):
   ├── Cloudflare R2 — uploads, thumbnails, HLS/DASH (AWS_S3_* secrets)
   ├── MSG91 — OTP SMS
   ├── Firebase — push notifications (FIREBASE_SERVICE_ACCOUNT_JSON)
   └── S3 + CloudFront — admin / superadmin SPAs (recommended, not implemented)
```

---

## 2. What Terraform creates (complete list)

| Resource | Module / file | Purpose |
|----------|---------------|---------|
| **VPC** + 2 public subnets + IGW | `modules/vpc` | All resources in one VPC; no NAT (cost saving) |
| **ECR** (9 repos) | `modules/ecr` | One image repo per deployable service |
| **ALB** + 3 target groups + listeners | `modules/alb` | HTTP :80 only (TLS at Cloudflare); WebSocket path rules |
| **RDS Postgres** | `modules/rds` | `resido_master` bootstrapped; other DBs via migrate task |
| **ElastiCache Redis** | `modules/redis` | Cache, sessions, Socket.IO adapter, rate limits, queues |
| **Secrets Manager** | `modules/secrets` | One secret per `.env` key; injected into every task |
| **ECS cluster** | `modules/ecs/cluster.tf` | Fargate + Container Insights |
| **Cloud Map** `resido.local` | `modules/ecs/cluster.tf` | Private DNS for inter-service HTTP |
| **ECS task definitions** | `modules/ecs/services.tf` | One per service (lifecycle-ignored after CI updates) |
| **ECS services** (9) | `modules/ecs/services.tf` | Rolling deploy, 50% min healthy |
| **ECS autoscaling** | `modules/ecs/autoscaling.tf` | CPU target-tracking per service |
| **IAM** execution + task roles | `modules/ecs/iam.tf` | ECR pull, Secrets read, CloudWatch |
| **CloudWatch log groups** | `modules/ecs/services.tf` | `/resido/<env>/<service>` |
| **VPC endpoints** | `modules/vpc_endpoints` | S3 gateway (free, on); interface endpoints (optional) |
| **Security groups** | `main.tf` + modules | ALB → ECS; ECS → RDS/Redis |

### RDS logical databases

| Database | Created by | Used by |
|----------|------------|---------|
| `resido_master` | RDS `db_name` on boot | auth-service (communities, staff) |
| `resido_users` | `ensure-databases.js` in db-migrate | auth-service (users, follow, profiles) |
| `resido_core` | db-migrate | resident-service, business, flaredthread (tenant data) |
| `resido_geodata` | db-migrate | auth-service (pincodes/locations) |
| `resido_notifications` | db-migrate | notification-service migrations |
| `resido_chat` | db-migrate | chat-service |

### Secrets auto-wired from Terraform

When `wire_terraform_infra_secrets = true` (default), these override `.env` on first apply:

- All `*_WRITE_URL` / `*_READ_URL` (point at the Terraform RDS instance)
- `CHAT_WRITE_URL`, `CHAT_READ_URL`, `NOTIFICATION_WRITE_URL`
- `AUTH_DATABASE_URL`, `TENANT_DATABASE_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`, `REDIS_URL`

Set `wire_terraform_infra_secrets = false` in tfvars if you keep an **existing external RDS/Redis** (like your current `database-1` / `clustercfg.*` endpoints) and manage those secrets manually.

---

## 3. ECS services vs application code

| ECS service | App folder | In Terraform | In deploy scripts | ALB-facing |
|-------------|------------|:------------:|:-----------------:|:----------:|
| api-gateway | `apps/api-gateway` | ✅ | ✅ | ✅ |
| auth-service | `apps/auth-service` | ✅ | ✅ | — |
| resident-service | `apps/resident-service` | ✅ | ✅ | — |
| chat-service | `apps/chat-service` | ✅ | ✅ | ✅ (`/socket.io`) |
| notification-service | `apps/notification-service` | ✅ | ✅ | — |
| visitor-service | `apps/visitor-service` | ✅ | ✅ | — |
| flaredthread-service | `apps/flaredthread-service` | ✅ | ✅ | ✅ (`/flares-io`) |
| business-service | `apps/business-service` | ✅ | ✅ | — |
| media-worker | `apps/media-worker` | ✅ | ✅ | — (background) |
| complaint-service | `apps/complaint-service` | ❌ | ❌ | Stub — use `resident-service` `/community/*` |
| accounting-service | `apps/accounting-service` | ❌ | ❌ | Stub — not deployed |

### One-off ECS tasks (not long-running services)

Run via `infra/ecs/scripts/run-migrations.sh` before each deploy:

| Task definition | Purpose |
|-----------------|---------|
| `db-migrate.json` | Prisma migrate: master, users, core, geo |
| `db-migrate-notification.json` | Prisma migrate: notifications DB |
| `db-migrate-chat.json` | Prisma migrate: chat DB |

---

## 4. What is NOT in Terraform (external)

| Need | How it's handled today | Action |
|------|------------------------|--------|
| **Media storage (S3)** | **Cloudflare R2**, not AWS S3 | Keep `AWS_S3_*` + `CLOUDFLARE_R2_PUBLIC_URL` in Secrets Manager (from `.env`) |
| **Admin / Superadmin web** | Not in ECS | Deploy to **S3 + CloudFront** (see `infra/ecs/README.md`) |
| **Route 53 / Cloudflare DNS** | Manual | Orange-cloud proxy to ALB (`terraform output alb_dns_name`) |
| **TLS / HTTPS** | **Cloudflare** | No ACM cert on ALB — keep `acm_certificate_arn = ""` |
| **MSG91 OTP** | External API | `MSG91_AUTH_KEY` in secrets |
| **Firebase push** | External | `FIREBASE_SERVICE_ACCOUNT_JSON` in secrets |
| **Terraform state** | Manual prerequisite | S3 buckets `resido-tfstate-dev` / `resido-tfstate-prod` |
| **Mobile app** | Expo / app stores | Not part of ECS |

> The **S3 gateway VPC endpoint** in Terraform is for **ECR image layer pulls** (free), not for user uploads.

---

## 5. Gaps and how to close them

| Gap | Severity | Status / fix |
|-----|----------|--------------|
| ECS autoscaling | Was missing | ✅ Added `modules/ecs/autoscaling.tf` |
| RDS/Redis URLs not tied to Terraform RDS | Was confusing | ✅ `wire_terraform_infra_secrets` auto-wires on apply |
| RDS read replica | Scale | Create replica in AWS; update `*_READ_URL` secrets |
| RDS Proxy / PgBouncer | Scale | Add separately; point all DB URLs at proxy |
| Redis replication group + TLS | HA | Upgrade `modules/redis` or use existing `clustercfg.*` with `wire_terraform_infra_secrets = false` |
| AWS S3 uploads bucket | Optional | App uses R2; only add AWS S3 if migrating off Cloudflare |
| CloudFront for admin SPAs | Recommended | Separate Terraform or console setup |
| `infra/terraform/` (EKS) | Confusion | Ignore for ECS path — use `infra/ecs/terraform_infra/` only |

---

## 6. Deploy the entire app

### First time (greenfield)

```bash
# 1. Prerequisites
aws s3 mb s3://resido-tfstate-prod --region ap-south-1
# Cloudflare: DNS A/CNAME proxied (orange cloud) → ALB DNS; SSL mode Flexible
# (or Full if you add origin TLS later). No ACM on the ALB.

# 2. Infrastructure (one apply)
cd infra/ecs/terraform_infra
terraform init -backend-config=envs/prod.backend.hcl
terraform apply -var-file=envs/prod.tfvars

# 3. Build, migrate, deploy all services
eval "$(terraform output -raw ci_env_exports)"
bash ../scripts/build-and-push.sh --all
bash ../scripts/run-migrations.sh
bash ../scripts/deploy-service.sh --all
```

### Every release

```bash
eval "$(terraform output -raw ci_env_exports)"
bash infra/ecs/scripts/build-and-push.sh --all    # or only changed services
bash infra/ecs/scripts/run-migrations.sh          # if schema changed
bash infra/ecs/scripts/deploy-service.sh --all    # or only changed services
```

### Point DNS

```bash
terraform output alb_dns_name   # → Route 53 ALIAS for residoapp.com
```

---

## 7. Configuration flow

| Source | What it configures |
|--------|------------------|
| **`.env`** (repo root, `dotenv_path = "../../../.env"`) | Seeds Secrets Manager on first apply |
| **Terraform RDS/Redis** (`wire_terraform_infra_secrets = true`) | Overrides DB/Redis URLs with resources this stack creates |
| **Cloud Map** (automatic) | `AUTH_SERVICE_URL`, `CHAT_SERVICE_URL`, etc. — do not set manually |
| **`envs/<env>.tfvars`** | Instance sizes, replica counts, ACM ARN, autoscaling caps |

After first apply, secret **values** are preserved (`lifecycle.ignore_changes`) — edit via AWS Console or `aws secretsmanager put-secret-value`, then `force-new-deployment` on affected services.

---

## 8. Two ways to register task definitions

| Path | When to use |
|------|-------------|
| **Terraform** (`modules/ecs/services.tf`) | First `terraform apply` — creates initial task defs + services |
| **CI scripts** (`task-definitions/*.json` + `deploy-service.sh`) | Every image deploy — registers new revision, updates service |

Terraform sets `lifecycle.ignore_changes = [container_definitions]` so CI deploys are not rolled back on the next `terraform apply`.

Task-definition JSON files in `infra/ecs/task-definitions/` are the **source of truth for CI** and include the same secrets as Terraform (plus service-specific ones like gateway Redis vars).

---

## Related docs

- [`README.md`](README.md) — ECS architecture rationale
- [`terraform_infra/README.md`](terraform_infra/README.md) — Terraform apply walkthrough + cost estimates
- [`CONFIGURATION.md`](CONFIGURATION.md) — Pre-deploy checklist
- [`migrations/FIRST_DEPLOY.md`](migrations/FIRST_DEPLOY.md) — Database migration pipeline
- [`../PRODUCTION_READINESS.md`](../PRODUCTION_READINESS.md) — Code scale readiness vs infra requirements
