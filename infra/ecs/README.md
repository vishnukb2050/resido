# Resido on AWS ECS Fargate

This folder is the production-style deployment plan for running Resido on
**ECS Fargate behind an ALB**, replacing the EC2 + docker-compose setup.
Everything here is opinionated for a small / medium production workload
on `ap-south-1`.

> If you only have a single VPS today and just want to ship, you can keep
> `infra/docker-compose.yml`. This folder kicks in the moment you outgrow
> "one box" — separate environments, zero-downtime deploys, autoscaling,
> CloudWatch logs, IAM-based DB auth, etc.

---

## TL;DR — answering the four questions in the prompt

1. **What changes are needed for ECS Fargate?**
   - No more `docker-compose.yml` on a single box. Each service becomes an
     **ECS Service** running one or more **Fargate tasks** from a
     **Task Definition** (one JSON per service, all in
     `task-definitions/`).
   - Images live in **ECR** (one repo per service — already provisioned by
     `infra/terraform/modules/ecr`).
   - Container env vars come from **AWS Secrets Manager** / **SSM
     Parameter Store**, not from a checked-in `.env`.
   - Logs ship to **CloudWatch Logs** via the `awslogs` driver in every
     task definition.
   - Inter-service calls use **AWS Cloud Map / Service Discovery** DNS
     (e.g. `auth-service.resido.local`) instead of compose service names.
   - Schema migrations move out of `start.sh` and become a **one-off ECS
     task** triggered by the CI/CD pipeline before each service rollout.

2. **Is `prisma db push` on start a good option in production?**
   **No.** It's fine for local dev and for an internal pre-prod box, but
   the moment real users have data it becomes dangerous:
   - With `--accept-data-loss` (what we ship today) it will silently DROP
     columns/tables/enums that the new schema doesn't list.
   - It has no migration history, so there's no audit trail, no rollback
     story, and no place to put data-backfill SQL.
   - Two services pushing the same DB race each other (we already hit
     this exact bug with `linkBusinessProfile`).

3. **What is the best approach for production schema changes?**
   Move to **`prisma migrate deploy`** with **checked-in migration files**.
   This is the workflow:

   ```
   # Local dev (developer machine, against a dev DB):
   npx prisma migrate dev --name add_link_business_profile
   git add prisma/migrations && git commit

   # Production rollout (CI/CD, against the real DB):
   npx prisma migrate deploy        # idempotent, never drops data
   ```

   `prisma migrate deploy` only applies the migration files in
   `prisma/migrations/*` that haven't been recorded in the
   `_prisma_migrations` history table. It will NEVER drop a column or
   table that isn't covered by a migration step you actually wrote. Any
   data backfill goes into a hand-written SQL file inside the migration
   folder. See `migrations/MIGRATION_STRATEGY.md` for the full rollout
   plan + transition path from today's `db push`.

4. **Do I still need the Nginx container with ALB?**
   **No.** ALB replaces every job the in-cluster Nginx is doing today
   (TLS termination, host/path routing, WebSocket upgrade, health
   checks). The only reason to put Nginx *behind* the ALB inside ECS is
   if you need response rewriting or static asset caching that ALB
   doesn't offer — which we don't. Drop the `nginx` service. The
   admin/superadmin SPAs should go on **S3 + CloudFront**, not Fargate
   (cheaper, faster, no container churn). See the ALB section below.

---

## Architecture

```
                 ┌─────────────────────────────────────────────────┐
                 │  Route 53 (residoapp.com / superadmin.residoapp.com)
                 │  ACM cert (TLS)
                 └──────────────────────┬──────────────────────────┘
                                        │
                ┌───────────────────────▼────────────────────────────┐
                │  CloudFront (admin SPA, superadmin SPA, static)    │
                │       origin → S3 bucket (admin/superadmin build)  │
                └───────────────────────┬────────────────────────────┘
                                        │  /api/* → forward
                                        ▼
                  ┌──────────────────────────────────────────────────┐
                  │     Application Load Balancer (Public)           │
                  │     :443 TLS (ACM)  • :80 redirect → :443        │
                  ├──────────────────────────────────────────────────┤
                  │  Listener rule  /socket.io/*  → chat-service-tg  │
                  │  Listener rule  *             → api-gateway-tg   │
                  └──────────────────────┬───────────────────────────┘
                                         │   target groups (HTTP)
                          ┌──────────────┴──────────────┐
                          ▼                             ▼
        ┌────────────────────────────┐   ┌────────────────────────────┐
        │ ECS Service: api-gateway   │   │ ECS Service: chat-service  │
        │ Fargate, awsvpc, private   │   │ Fargate, awsvpc, private   │
        │ subnets, 1..N tasks        │   │ WebSocket support          │
        └─────────────┬──────────────┘   └─────────────┬──────────────┘
                      │                                │
                      │  Service Discovery DNS (Cloud Map: resido.local)
                      │  e.g. http://auth-service.resido.local:3001
                      │
        ┌─────────────┴──────────────────────────────────────────────┐
        │ ECS Services (private, no ALB target):                     │
        │ auth, resident, visitor, notification, business,           │
        │ flaredthread, media-worker (background)                    │
        └─────────────┬──────────────────────────────────────────────┘
                      │
                      ▼
              ┌─────────────────────────────────┐
              │ RDS PostgreSQL (Multi-AZ in prod)│
              │ ElastiCache Redis (sessions)    │
              │ S3 (uploads), Secrets Manager   │
              └─────────────────────────────────┘
```

### Why this shape

| Concern                  | Old (docker-compose on EC2)                      | New (ECS Fargate + ALB)                            |
| ------------------------ | ------------------------------------------------ | -------------------------------------------------- |
| TLS / host routing       | Nginx container                                  | ALB + ACM                                          |
| Service ordering         | `depends_on` in compose                          | Inter-service via Cloud Map; **migrations as a separate task**, not in `start.sh` |
| Service-to-service URL   | `http://auth-service:3001`                       | `http://auth-service.resido.local:3001`            |
| Restart on crash         | `restart: unless-stopped`                        | ECS service `desiredCount` self-heals             |
| Secrets                  | `.env` file on the host                          | AWS Secrets Manager / SSM, injected by ECS         |
| Logs                     | `docker logs`                                    | CloudWatch Logs (`awslogs` driver)                 |
| Scale a single service   | Vertical only (one VPS)                          | Autoscaling per-service via `desiredCount` + ASG   |
| Admin / Superadmin SPA   | Nginx container in the cluster                   | S3 + CloudFront (cheaper, faster, no Fargate cost) |

---

## Folder layout

```
infra/ecs/
├── README.md                        ← you are here
├── migrations/
│   └── MIGRATION_STRATEGY.md        ← how to move off `prisma db push`
├── task-definitions/
│   ├── _placeholders.md             ← what to substitute before registering
│   ├── api-gateway.json
│   ├── auth-service.json
│   ├── resident-service.json
│   ├── chat-service.json
│   ├── notification-service.json
│   ├── visitor-service.json
│   ├── flaredthread-service.json
│   ├── business-service.json
│   ├── media-worker.json
│   └── db-migrate.json              ← one-off task that runs `prisma migrate deploy`
├── alb/
│   └── listener-rules.md            ← target groups + routing rules to create
└── scripts/
    ├── build-and-push.sh            ← build + push one (or all) service images to ECR
    ├── render-task-def.sh           ← substitute env vars into a task definition
    ├── run-migrations.sh            ← register + run the db-migrate task and wait
    └── deploy-service.sh            ← register new task def revision + update service
```

---

## Required app-side changes

These are small but mandatory.

1. **Inter-service URLs become env vars.**
   Today some services hardcode `http://auth-service:3001`. Switch them
   to `process.env.AUTH_SERVICE_URL` so the same image runs against
   `http://auth-service:3001` in compose AND
   `http://auth-service.resido.local:3001` in Fargate. The task
   definitions in this folder already inject the right URLs.

2. **Stop pushing schemas from `start.sh`.**
   In ECS the schema is applied by the **one-off `db-migrate` task**
   before a service rollout, not by every container on startup. The
   per-service `start.sh` should fall back to **only `prisma generate`**
   (which is build-time anyway) and **`node dist/main`**. We keep the
   in-container `db push` for the EC2/docker-compose path but it MUST
   not run in Fargate — toggle it on an env flag:

   ```sh
   # apps/<service>/start.sh
   if [ "${RUN_PRISMA_PUSH:-true}" = "true" ]; then
       npx prisma db push --skip-generate
   fi
   node dist/main
   ```

   Set `RUN_PRISMA_PUSH=false` in every Fargate task definition; leave
   it `true` (default) for the EC2 compose deployment. The provided task
   defs already set this.

3. **Lightweight `/health` endpoint per service.**
   ALB target groups need an HTTP path that returns 200. Add this
   one-liner to every NestJS service:

   ```ts
   // apps/<service>/src/health/health.controller.ts
   import { Controller, Get } from '@nestjs/common';
   import { Public } from '../common/decorators/public.decorator';

   @Controller('health')
   export class HealthController {
       @Public() @Get() check() { return { ok: true, ts: Date.now() }; }
   }
   ```

   Register the controller in the service's root module. Until you add
   this, set the ALB target group health check to **TCP** on the
   service port — it still works, you just lose application-level
   readiness checks.

4. **Add the chat-service WebSocket route to the ALB**, not Nginx.
   ALB supports WebSocket natively when you put the listener rule
   `path=/socket.io/*` in front of a target group with `protocol=HTTP`
   and `target_type=ip`.

---

## Deploy flow (CI/CD)

This is the order every release should follow:

```
1. Build images for changed services    →  scripts/build-and-push.sh <service>
2. Run schema migrations as one-off task →  scripts/run-migrations.sh
   (blocks until exit code == 0; aborts the rest of the deploy on failure)
3. Register new task definition revisions for changed services
   and update the ECS Service to point at them
                                         →  scripts/deploy-service.sh <service>
4. ECS performs a rolling deploy (one task at a time) with
   ALB connection draining.
```

The migration task always runs **before** any service is moved to the
new image — that way the DB is ready before the new code looks for new
columns, and an old task that's still being drained still sees columns
it knows about (additive-only migrations make this seamless).

---

## What you still owe terraform

The existing `infra/terraform/main.tf` already provisions VPC, ECR, RDS,
ElastiCache, S3. You'll need to add (or import) **ECS-specific**
modules:

- `aws_ecs_cluster.resido`
- `aws_service_discovery_private_dns_namespace.resido_local` (`resido.local`)
- `aws_ecs_service` + `aws_ecs_task_definition` per service (the JSON
  task defs in this folder are the source of truth; you can either
  register them with the CLI or wrap each one in a `local_file` +
  `aws_ecs_task_definition` with `lifecycle.ignore_changes` on
  `container_definitions`)
- `aws_lb` + `aws_lb_listener` + `aws_lb_target_group` (one TG per
  ALB-facing service)
- `aws_iam_role` for `taskExecutionRole` (pulls images from ECR, writes
  to CloudWatch, reads secrets) and `taskRole` (app-level AWS perms,
  e.g. S3 write)

A future PR can lift the JSONs into Terraform; running them via the CLI
is fine for the first cut.
