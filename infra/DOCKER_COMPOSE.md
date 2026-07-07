# Docker Compose — temporary local / EC2 deploy

Same **9 backend services + media-worker** as ECS Terraform (`infra/ecs/terraform_infra`).
Use this until **Terraform Apply + ECS deploy** is ready.

## Quick start

```bash
# 1. Env (once)
cp ../.env .env          # or cp .env.example .env and fill in

# 2. Build TypeScript (optional if Dockerfiles run build inside image)
cd .. && npm run build:all

# 3. Start everything
cd infra
docker compose up -d --build
```

## Endpoints

| What | URL |
|------|-----|
| API (direct) | http://localhost:3000 |
| API health | http://localhost:3000/health |
| Nginx (admin + `/api` + websockets) | http://localhost:80 |
| Individual services | :3001–:3009 (see compose) |

Mobile dev: point the app at your machine IP, e.g. `http://192.168.x.x:3000`.

## vs ECS

| | Docker Compose | ECS |
|--|----------------|-----|
| Config | `infra/.env` | AWS Secrets Manager + GitHub vars |
| DB schema | `prisma db push` on startup (`RUN_PRISMA_PUSH=true`) | `prisma migrate deploy` (db-migrate workflow) |
| Service URLs | Docker DNS (`http://auth-service:3001`) | Cloud Map (`http://auth-service.resido.local:3001`) |
| Postgres / Redis | Your existing RDS + ElastiCache in `.env` | Terraform-managed or external |

## Commands

```bash
docker compose ps
docker compose logs -f api-gateway
docker compose restart auth-service
docker compose down
```

## Not in compose (removed / merged)

- `accounting-service`, `complaint-service` — logic lives on `resident-service`
