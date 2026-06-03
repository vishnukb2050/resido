# ALB Listener Rules

The Application Load Balancer replaces the in-cluster Nginx container.
You need ONE public ALB plus the listener rules below. Everything else
in ECS (auth, resident, visitor, notification,
business, flaredthread) stays **private**, reachable only via Cloud Map
DNS (`<svc>.resido.local`).

## Target groups

Create one target group per service that needs ALB exposure. Three services
face the ALB today:

| Target group              | Protocol | Port | Health check                | ECS service            |
| ------------------------- | -------- | ---- | --------------------------- | ---------------------- |
| `resido-prod-api-gateway` | HTTP     | 3000 | `GET /health` returns 200   | `api-gateway`          |
| `resido-prod-chat`        | HTTP     | 3004 | `GET /health` returns 200   | `chat-service`         |
| `resido-prod-flaredthread`| HTTP     | 3008 | `GET /health` returns 200   | `flaredthread-service` |

Settings worth tuning per TG:

- `target_type` = `ip` (required by Fargate `awsvpc` network mode).
- `deregistration_delay.timeout_seconds` = `30` (faster blue/green).
- `stickiness.enabled` = `true` for the chat and flaredthread TGs (so a
  WebSocket client lands on the same task across reconnects). Use
  `lb_cookie`, duration 86 400 s.

If you haven't added the `/health` controllers yet, set the TG health
check to **TCP** on the container port and add `/health` later.

## Listener 80 → redirect

| Listener | Protocol | Port | Default action |
| -------- | -------- | ---- | -------------- |
| `:80`    | HTTP     | 80   | Redirect to `https://#{host}:443/#{path}?#{query}`, code `HTTP_301` |

## Listener 443 → routing

| Listener | Protocol | Port | TLS                   |
| -------- | -------- | ---- | --------------------- |
| `:443`   | HTTPS    | 443  | ACM cert for `*.residoapp.com` |

Default action: **forward to `resido-prod-api-gateway`** target group.

### Listener rules (evaluated in this order)

| Priority | Match                                                                 | Action                                  |
| -------- | --------------------------------------------------------------------- | --------------------------------------- |
| 10       | `path-pattern = /socket.io/*`                                         | Forward → `resido-prod-chat`           |
| 11       | `path-pattern = /flares-io/*`                                         | Forward → `resido-prod-flaredthread`   |
| default  | anything else                                                         | Forward → `resido-prod-api-gateway`    |

Flaredthread Socket.IO uses path `/flares-io` (namespace `/flares`) so it
does not share `/socket.io/*` with chat.

The two SPAs (`/` on `residoapp.com` and `superadmin.residoapp.com`) do
**not** route through the ALB — they're served from CloudFront in front
of S3. The ALB sees `/api/*` (via gateway default), `/socket.io/*`, and
`/flares-io/*`.

## Security groups

- **ALB SG** (`resido-prod-alb-sg`)
  - Inbound: `0.0.0.0/0` on `80`, `443`.
  - Outbound: `0.0.0.0/0` on `0-65535` (or scope to the service SG).
- **Service SG** (`resido-prod-service-sg`, attached to every Fargate
  task ENI)
  - Inbound from `resido-prod-alb-sg` on the service port (3000, 3004
    for ALB-exposed services).
  - Inbound from `resido-prod-service-sg` (self) on **all TCP** — this
    lets services call each other through Cloud Map DNS.
  - Outbound: all (or scope to RDS/ElastiCache/Secrets Manager
    endpoints if you want zero-trust).
- **RDS SG** (`resido-prod-rds-sg`)
  - Inbound from `resido-prod-service-sg` on `5432`.

## Service Discovery (Cloud Map)

Create one private namespace:

```bash
aws servicediscovery create-private-dns-namespace \
    --name resido.local \
    --vpc vpc-XXXXXXXX
```

Then, when you create each ECS service, set
`serviceRegistries[].registryArn` to a Cloud Map service in that
namespace. This auto-publishes records like `auth-service.resido.local`
that resolve to the task IPs.

Sample CLI:

```bash
aws servicediscovery create-service \
    --name auth-service \
    --dns-config 'NamespaceId=ns-xxxxx,DnsRecords=[{Type=A,TTL=10}]' \
    --health-check-custom-config 'FailureThreshold=1'
```

Repeat for every service. API Gateway already knows to look at
`http://auth-service.resido.local:3001` because the task definitions in
this folder inject it via the `*_SERVICE_URL` env vars.
