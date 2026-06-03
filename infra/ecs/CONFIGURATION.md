# ECS Deploy — Configuration Checklist

Everything you must **set, fill in, or run** to deploy Resido to ECS Fargate.

This is the "what do I configure" companion to the two design docs:

- `README.md` — architecture + why ECS.
- `terraform_infra/README.md` — the `terraform apply` walkthrough + cost notes.

Read this one when you are about to deploy and want a concrete checklist.

---

## 0. How configuration flows (read this first)

There are **only three places** configuration comes from. Understanding this
makes the rest obvious:

| Source | What it feeds | How |
| ------ | ------------- | --- |
| **`infra/.env`** | Secrets Manager + **every** container's env vars | On the first `terraform apply`, every `KEY=value` line in `infra/.env` becomes a secret `resido/<env>/<KEY>` **and** is injected into every ECS task as `process.env.KEY`. (See `terraform_infra/main.tf` → `local.dotenv` and `modules/secrets`.) |
| **Cloud Map (automatic)** | `*_SERVICE_URL` env vars | Terraform auto-injects `AUTH_SERVICE_URL`, `RESIDENT_SERVICE_URL`, `CHAT_SERVICE_URL`, … into every container from `modules/ecs/locals.tf` → `service_urls`. **You do not set these.** |
| **`envs/<env>.tfvars`** | Infra sizing (CPU, RAM, replicas, RDS class, ACM ARN) | Terraform variables. |

> Key consequence: to add an app config value (e.g. `INTERNAL_SERVICE_SECRET`),
> you add it to **`infra/.env`** and it lands in every service automatically.
> You do **not** edit the task-definition JSONs by hand for shared values.

---

## 1. One-time AWS prerequisites

These live outside Terraform (chicken-and-egg with the state backend):

- [ ] **State buckets** (per env):
  ```bash
  aws s3 mb s3://resido-tfstate-dev  --region ap-south-1
  aws s3 mb s3://resido-tfstate-prod --region ap-south-1
  aws s3api put-bucket-versioning --bucket resido-tfstate-dev  --versioning-configuration Status=Enabled
  aws s3api put-bucket-versioning --bucket resido-tfstate-prod --versioning-configuration Status=Enabled
  ```
- [ ] **ACM certificate** for `*.residoapp.com` in `ap-south-1`, validated via
      Route 53. Put the ARN in `envs/prod.tfvars` → `acm_certificate_arn`.
      (Dev can leave it `""` → ALB serves `:80` only.)
- [ ] AWS credentials with admin-ish rights for the target account
      (`AWS_PROFILE` or env vars).

---

## 2. `infra/.env` — required keys before first apply

The first apply seeds Secrets Manager from this file. It already contains DB
URLs, Redis, JWT, R2/S3, MSG91. **Add the keys below** so the scaling
features from the latest work activate in production.

### 2a. New keys to ADD (scaling / hardening)

```env
# ─── Service-to-service auth ────────────────────────────────────────
# Locks the internal batch endpoints (auth-service /profile/users/visibilities/batch
# etc.). flaredthread-service automatically sends this header when set.
# If unset, those endpoints stay open (backward-compatible) — set it in prod.
INTERNAL_SERVICE_SECRET=<32+ char random hex>

# ─── API gateway edge controls (optional; sane defaults if omitted) ──
# Restrict browser/admin CORS. Native mobile clients send no Origin so are
# unaffected. Omit entirely to allow '*'.
CORS_ORIGINS=https://admin.residoapp.com,https://superadmin.residoapp.com
# Rate limit per IP at the gateway. Defaults: 120 requests / 60000 ms.
THROTTLE_LIMIT=120
THROTTLE_TTL=60000
```

> **Do NOT put `SEED_LOCATIONS=true` in `.env`.** Because `.env` is injected
> into *every* container, that would make *every* auth-service replica run the
> heavy location ingestion on boot. Location seeding is a **one-off** — see §5.

### 2b. Keys that must hold REAL values (not the dev placeholders)

The committed `infra/.env` has working dev values. For prod, make sure these
are production-grade before the first apply (or fill them in Secrets Manager
after — see §4):

- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` — fresh 32+ char secrets
- [ ] `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID`
- [ ] `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (R2/S3)
- [ ] `REDIS_HOST` / `REDIS_PASSWORD` / `REDIS_TLS`
- [ ] All `*_WRITE_URL` / `*_READ_URL` (see §3 for read replicas)

---

## 3. Read replicas (recommended for scale)

Today `CORE_READ_URL == CORE_WRITE_URL` (same for USER/MASTER/GEO). The
services already split reads onto the `*_READ_URL` Prisma client, so the
moment you point those at a real RDS read replica, read traffic moves off the
primary with **zero code change**.

- [ ] Create an RDS read replica.
- [ ] Set `*_READ_URL` secrets to the replica endpoint:
  ```bash
  aws secretsmanager put-secret-value \
      --secret-id resido/prod/CORE_READ_URL \
      --secret-string "postgresql://user:pass@<replica-endpoint>:5432/resido_core?schema=public"
  # repeat for USER_READ_URL, MASTER_READ_URL, GEO_READ_URL
  ```
- [ ] Force redeploy so tasks pick up the new value (see §7).

Until you do this it still works — reads just hit the primary.

---

## 4. After first apply — operator-owned secrets

If you left any prod secret as a placeholder, set it now (Terraform ignores
secret-value changes after the first apply, so these survive future applies):

```bash
ENV=prod
aws secretsmanager put-secret-value --secret-id resido/$ENV/JWT_SECRET           --secret-string "<value>"
aws secretsmanager put-secret-value --secret-id resido/$ENV/INTERNAL_SERVICE_SECRET --secret-string "<value>"
# ...etc
```

---

## 5. After first apply — bootstrap data (one-off)

### 5a. Create the extra logical databases

RDS only auto-creates `resido_master`. Create the rest once:

```bash
RDS_URL=$(aws secretsmanager get-secret-value --secret-id resido/$ENV/RDS_WRITE_URL --query SecretString --output text)
psql "$RDS_URL" -c "CREATE DATABASE resido_users;"
psql "$RDS_URL" -c "CREATE DATABASE resido_core;"
psql "$RDS_URL" -c "CREATE DATABASE resido_geodata;"
psql "$RDS_URL" -c "CREATE DATABASE resido_notifications;"
```

### 5b. Run schema migrations

```bash
eval "$(terraform output -raw ci_env_exports)"   # from terraform_infra/
bash infra/ecs/scripts/run-migrations.sh
```

### 5c. Seed location/geo data (one-off, NOT on every replica)

The geo dataset (pincodes / OSM) must be ingested once. Run a single one-off
task with `SEED_LOCATIONS=true` instead of baking it into `.env`:

```bash
aws ecs run-task \
  --cluster resido-$ENV-cluster \
  --task-definition resido-$ENV-auth-service \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet>],securityGroups=[<sg>],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"auth-service","environment":[{"name":"SEED_LOCATIONS","value":"true"}]}]}'
```

The normal auth-service tasks keep `SEED_LOCATIONS` unset → they skip seeding
on boot (which is the intended fast-start behavior).

---

## 6. ⚠️ Known gaps to resolve before full production

### 6a. `media-worker` (background worker)

`media-worker` is wired as a **worker** in Terraform (`worker = true` in
`modules/ecs/locals.tf`): no HTTP port, no ALB, no Cloud Map registration.
Health check uses `pgrep` on the Node process. It is included in
`build-and-push.sh`, GitHub Actions matrices, and `task-definitions/media-worker.json`.

Before first deploy, ensure `infra/.env` (and thus Secrets Manager) includes:

- `MEDIA_WORKER_SECRET` (must match flaredthread / auth internal callbacks)
- `REDIS_URL` (BullMQ queue)
- R2 / S3 keys used by the worker (`AWS_S3_*`, `CLOUDFLARE_R2_PUBLIC_URL`)

### 6b. Flare WebSockets (`/flares-io/*`)

Flaredthread uses Socket.IO path **`/flares-io`** (namespace `/flares`) so it
does not collide with chat on `/socket.io/*`.

- ALB: `path-pattern = /flares-io/*` → `flaredthread-service` target group
- ECS: `attach_alb = "flaredthread-service"` on flaredthread
- Mobile: `FLARES_SOCKET_PATH` / `flaresSocketOptions` in `api.ts`
- Local nginx: `location /flares-io/` → `flaredthread-service:3008`

After `terraform apply`, redeploy **flaredthread-service** and ship an app build
that includes the updated socket client.

---

## 7. Deploy order (every release)

```bash
cd infra/ecs/terraform_infra
eval "$(terraform output -raw ci_env_exports)"

# 1. Build + push changed images (or --all)
bash ../scripts/build-and-push.sh --all

# 2. Migrations FIRST (additive-only; blocks until exit 0)
bash ../scripts/run-migrations.sh

# 3. Roll services forward (rolling deploy, ALB connection draining)
bash ../scripts/deploy-service.sh --all
```

Force a redeploy after rotating a secret / changing a `*_READ_URL`:

```bash
aws ecs update-service --cluster resido-$ENV-cluster \
    --service resido-$ENV-auth-service --force-new-deployment
```

---

## 8. Pre-flight checklist (tick before `terraform apply`)

- [ ] State bucket exists for the target env.
- [ ] `acm_certificate_arn` set in `envs/prod.tfvars` (prod).
- [ ] `infra/.env` has `INTERNAL_SERVICE_SECRET` and prod-grade `JWT_SECRET`.
- [ ] `infra/.env` does **not** contain `SEED_LOCATIONS=true`.
- [ ] `CORS_ORIGINS` set for prod (or intentionally left open).
- [ ] Decided on read-replica `*_READ_URL` (now or later).
- [ ] `MEDIA_WORKER_SECRET` and Redis URL present in secrets (media transcoding).
- [ ] **Schema sync before first ECS deploy:** there are no checked-in `prisma/migrations` yet.
  Either (a) one-time `RUN_PRISMA_PUSH=true` on **resident-service** so `start.sh` runs
  `prisma db push` against `resido_core`, or (b) run `npx prisma db push` from
  `apps/resident-service` against the target DB manually. Required for new columns
  (`VisitorEntry.tenantId`, `Gatepass.tenantId`, `CleaningLog`). On a DB that already
  has visitor rows without `tenantId`, backfill tenant IDs before enforcing NOT NULL.
- [ ] `service_overrides` / `service_desired_count_default` sized for the env.

---

## 9. Quick reference — what's already handled for you

You do **not** need to configure these; the stack does it:

- ✅ `*_SERVICE_URL` for every service (Cloud Map injection).
- ✅ `RUN_PRISMA_PUSH=false` on all Fargate tasks (no boot-time `db push`).
- ✅ `/health` container health checks (services expose `/health`).
- ✅ CloudWatch log group per service.
- ✅ Secrets injected into every container from Secrets Manager.
- ✅ ALB routing: `/socket.io/*` → chat-service, `/flares-io/*` → flaredthread-service, default → api-gateway.
- ✅ Rate limiting + CORS handled in api-gateway code (tunable via env in §2a).
- ✅ Graceful shutdown (`enableShutdownHooks`) for clean rolling deploys.
