# ALB Listener Rules

The Application Load Balancer replaces the in-cluster Nginx container.
**TLS terminates at Cloudflare** — the ALB listens on **HTTP :80 only** (no
ACM certificate, no :443 listener). Cloudflare proxies `https://residoapp.com`
to the ALB origin over plain HTTP.

Set `acm_certificate_arn = ""` in `envs/prod.tfvars` (default). The optional
HTTPS listener in Terraform exists only if you ever terminate TLS on the ALB
instead of Cloudflare.

## Target groups

| Target group              | Protocol | Port | Health check                | ECS service            |
| ------------------------- | -------- | ---- | --------------------------- | ---------------------- |
| `resido-prod-api-gateway` | HTTP     | 3000 | `GET /health` returns 200   | `api-gateway`          |
| `resido-prod-chat`        | HTTP     | 3004 | `GET /health` returns 200   | `chat-service`         |
| `resido-prod-flaredthread`| HTTP     | 3008 | `GET /health` returns 200   | `flaredthread-service` |

- `target_type` = `ip` (Fargate `awsvpc`).
- `deregistration_delay` = `30` s.
- `stickiness` = `lb_cookie`, 86400 s on chat + flaredthread (WebSocket reconnects).

## Listener 80 → routing (production with Cloudflare)

| Listener | Protocol | Port | Default action |
| -------- | -------- | ---- | -------------- |
| `:80`    | HTTP     | 80   | Forward → `resido-prod-api-gateway` |

### Listener rules (priority order)

| Priority | Match                       | Action                            |
| -------- | --------------------------- | --------------------------------- |
| 10       | `path-pattern = /socket.io/*` | Forward → `resido-prod-chat`    |
| 11       | `path-pattern = /flares-io/*` | Forward → `resido-prod-flaredthread` |
| default  | anything else               | Forward → `resido-prod-api-gateway` |

Flaredthread Socket.IO uses path `/flares-io` (namespace `/flares`).

Admin/superadmin SPAs are served from CloudFront + S3, not through this ALB.
The ALB handles `/api/*` (via gateway), `/socket.io/*`, and `/flares-io/*`.

## Cloudflare setup

1. **DNS:** `residoapp.com` (and `api` subdomain if used) → ALB DNS name, **proxied** (orange cloud).
2. **SSL/TLS mode:** **Flexible** (browser ↔ Cloudflare HTTPS, Cloudflare ↔ ALB HTTP).
3. **WebSockets:** Enabled (required for chat + flares).
4. Optional: restrict ALB security group to [Cloudflare IP ranges](https://www.cloudflare.com/ips/) instead of `0.0.0.0/0`.

## Security groups

- **ALB SG:** inbound **80** from `0.0.0.0/0` (or Cloudflare IPs only).
- **Service SG:** inbound from ALB SG on 3000, 3004, 3008; self for inter-service traffic.
- **RDS / Redis SG:** inbound from service SG only.

## Service Discovery (Cloud Map)

Private namespace `resido.local` — services call each other as
`http://auth-service.resido.local:3001`, etc. (injected via `*_SERVICE_URL` env vars).
