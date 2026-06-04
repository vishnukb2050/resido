# Scalability & Performance Configuration (Code Side)

This document describes **every application-code mechanism and configuration knob** that lets Resido serve high request volumes (millions of requests) efficiently. It covers what each config does, where it lives, its default, and how to tune it.

> Scope: this is the **code side** only. Infrastructure (ECS autoscaling, RDS read replicas/sizing, ElastiCache sizing, ALB, CDN) is managed separately. The code is built so that adding infra capacity translates directly into throughput — it removes the application-level ceilings.

---

## Table of contents

1. [API Gateway (the edge)](#1-api-gateway-the-edge)
2. [Database connection pooling](#2-database-connection-pooling)
3. [Redis caching (hot reads)](#3-redis-caching-hot-reads)
4. [Inter-service communication](#4-inter-service-communication)
5. [Query bounding & pagination](#5-query-bounding--pagination)
6. [Chat & WebSockets](#6-chat--websockets)
7. [Mobile client efficiency](#7-mobile-client-efficiency)
8. [Logging & observability](#8-logging--observability)
9. [Environment variable reference](#9-environment-variable-reference)
10. [Recommended production values](#10-recommended-production-values)

---

## 1. API Gateway (the edge)

The gateway is the single trust boundary and the one egress to mobile clients, so the highest-leverage performance settings live here. Source: `apps/api-gateway/`.

- **HTTP keep-alive connection pooling to downstream services**
  - File: `src/modules/proxy/proxy.module.ts`
  - Without keep-alive, every proxied request opens and tears down a fresh TCP connection to the target service — at scale that means a TCP/TLS handshake per request plus ephemeral-port exhaustion.
  - Reuses sockets across requests via `http.Agent`/`https.Agent` with `keepAlive: true`.
  - **Config:** `PROXY_MAX_SOCKETS` (default `256`) — max concurrent sockets per downstream host. Also sets `maxFreeSockets: 64` and a 60s socket timeout.

- **gzip response compression**
  - File: `src/main.ts` (`compression({ threshold: 1024 })`)
  - Compresses every JSON response > 1 KB back to mobile devices on slow/metered networks. Feed JSON typically shrinks 60–80%, directly speeding up loads with negligible CPU.
  - Media is served directly from object storage, so this only touches API JSON.

- **Edge rate limiting (throttling)**
  - File: `src/app.module.ts` (`ThrottlerModule` + `ThrottlerGuard`)
  - Protects every downstream service from abuse and accidental client retry storms.
  - **Config:** `THROTTLE_TTL` (default `60000` ms) and `THROTTLE_LIMIT` (default `120` requests per window per IP).

- **Security headers**
  - File: `src/main.ts` (`helmet({ contentSecurityPolicy: false })`)
  - Applies security headers at the single edge. CSP is disabled because the gateway serves JSON to a native client, not browser HTML.

- **JWT-only identity derivation (un-spoofable)**
  - File: `src/modules/proxy/proxy.controller.ts`
  - The gateway strips any client-supplied identity headers (`x-user-id`, `x-tenant-id`, `x-db-name`, `x-internal-secret`, etc.) and re-derives them **only** from the verified JWT. This is what makes the lightweight header-based identity in downstream services safe.

- **Request body buffering**
  - The gateway runs with `bodyParser: false` and drains the raw request stream into a Buffer before forwarding, so downstream services receive accurate `content-length` and never see dropped bodies.

- **CORS allow-list**
  - **Config:** `CORS_ORIGINS` (comma-separated). Native mobile clients send no Origin header so they're unaffected; this constrains browser/admin callers. Falls back to `*` if unset.

---

## 2. Database connection pooling

Source: `apps/*/src/common/db-pool.ts` (one per service), applied in each `prisma.service.ts` / `tenant-prisma.service.ts` via `withDbPool(url)`.

- **Why it matters:** Prisma defaults each client pool to `(num_cpus * 2) + 1` connections. With horizontal autoscaling (many ECS tasks × multiple Prisma clients per service), that default multiplies fast and exhausts Postgres `max_connections` — RDS rejects new connections long before autoscaling helps.

- **What it does:** appends `connection_limit` and `pool_timeout` query params to every Prisma datasource URL, capping per-client connections so total connections stay bounded as task count grows. Existing params in the URL are never overwritten.

- **Config:**
  - `DB_CONNECTION_LIMIT` (default `5`) — max connections per PrismaClient pool.
  - `DB_POOL_TIMEOUT` (default `15`) — seconds to wait for a free connection before erroring.

- **Read/write split:** services instantiate a `client` (writes, `CORE_WRITE_URL`) and a `reader` (reads, `CORE_READ_URL`). Point `reader` at an RDS read replica to offload read traffic.

- **Pair with infra:** for true scale, also run a server-side pooler (RDS Proxy / PgBouncer).

---

## 3. Redis caching (hot reads)

Caching collapses repeated hot reads into a single source so the database isn't hit on every request. All caches are **cache-aside with fail-open** behavior (a Redis outage degrades to direct DB reads, never an error).

- **Profile identity & visibility cache** — `apps/auth-service/src/modules/profile/profile.service.ts`
  - `getProfileVisibilities`, `getChatIdentitiesBatch` cached per user.
  - **TTL:** `IDENTITY_CACHE_TTL = 300s`. Explicitly invalidated when a user updates their profile (cache coherency).

- **Feed enrichment caches** — `apps/flaredthread-service/src/modules/blogs/blogs.service.ts`
  - Author avatars: `AVATAR_TTL = 300s` (fetched via batched MGET, only misses hit auth-service).
  - Author visibilities: `VISIBILITY_TTL = 300s`.
  - Followers-of-viewer set: `FOLLOWERS_TTL = 60s`.

- **Feed page cache** — same file
  - The **first page** of hot read-only feeds (PUBLIC / HASHTAG) is cached, keyed per viewer so personalization never leaks across accounts.
  - **TTL:** `FEED_PAGE_TTL = 15s` — effectively real-time while absorbing pull-to-refresh / tab re-entry bursts.

- **Community dashboard stats** — `apps/resident-service/src/modules/community/community.service.ts`
  - The dashboard summary runs ~15 aggregate queries; cached in-process per tenant.
  - **TTL:** `STATS_TTL_MS = 30000` (30s). Note: this is per-replica in-memory (not shared Redis) — acceptable because it's a short TTL on an admin view.

- **Connection config:** `REDIS_URL` (preferred) or `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`, plus `REDIS_TLS=true` for AWS ElastiCache in-transit encryption. Redis connections are non-blocking at boot so a Redis hiccup never blocks service startup.

---

## 4. Inter-service communication

- **Keep-alive between services** — `apps/flaredthread-service/.../blogs.module.ts`, `apps/chat-service/.../chat.module.ts`
  - These services call auth-service on hot paths (avatar/visibility/follower lookups per feed render; permission checks per message). Their `HttpModule` uses keep-alive agents (`maxSockets: 128`, `maxFreeSockets: 32`) so internal hops reuse sockets instead of reconnecting.

- **Internal service authentication** — `apps/*/src/common/guards/internal-auth.guard.ts`
  - Server-to-server endpoints (e.g. batch visibility/avatar lookups) require a shared secret header rather than a user JWT.
  - **Config:** `INTERNAL_SERVICE_SECRET` — must be set on both caller and callee. **Fails closed in production** (missing secret → 401) so internal endpoints are never silently world-open; stays permissive in dev for convenience.

- **Service discovery URLs:** `AUTH_SERVICE_URL`, `RESIDENT_SERVICE_URL`, `FLAREDTHREAD_SERVICE_URL`, `BUSINESS_SERVICE_URL`, `VISITOR_SERVICE_URL`, `CHAT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL` (Cloud Map in prod, compose names locally).

---

## 5. Query bounding & pagination

The single most important class of scale fixes: **no unbounded reads on any path**. Every list query is capped or paginated so one large tenant / busy user can never produce a multi-MB payload or OOM a pod.

- **Batch ID endpoints capped** — `apps/auth-service/src/modules/profile/profile.controller.ts`
  - All `?ids=a,b,c` batch endpoints (visibilities / identities / chat-identities / avatars) dedupe and cap input.
  - **Config (constant):** `MAX_BATCH_IDS = 200`.

- **Cursor pagination on feeds** — `apps/flaredthread-service/.../blogs.service.ts`
  - Threads/flares use keyset (`createdAt`/`id`) cursor paging, not offset, so deep pages stay O(page) instead of degrading.
  - Page size is capped (max `20` per request).

- **Unified "For You" feed** — `GET /threads/for-you`
  - Returns the merged, visibility-gated public + followed-author stream across threads **and** flares in **one** request (replacing 4 separate calls), reducing per-home-load gateway work ~75%.

- **Community lists capped** — `apps/resident-service/src/modules/community/community.service.ts`
  - **Constants:** `MAX_STRUCTURE_ROWS = 5000` (members / units), `MAX_CONTENT_ROWS = 1000` (gallery, events, visitors, complaints, blocks, rules).

- **Other resident-service lists capped:** reminders (`1000`), assets (`2000`), amenities (`500`), attendance admin list (`10000`), payment splits (`500`), `members.getUnits` (`5000`).

- **Finance reporting uses DB-side aggregation** — `apps/resident-service/src/modules/finance/community-finance.service.ts`
  - `getReports` computes totals, per-period chart buckets and category breakdown with SQL `SUM` + `GROUP BY` (riding the `[tenantId, type, date]` / `[tenantId, category, date]` indexes) instead of streaming rows into memory — O(buckets) regardless of transaction count.
  - `generateBills` streams units in cursor-paged batches of `1000` and writes each batch with one `createMany`, so peak memory stays flat for very large societies.

- **Bounded contact sync** — `apps/auth-service/.../auth.service.ts`
  - `syncContacts` caps a single payload (2000 phones), pushes the match into the DB, and bulk-inserts follows in one statement (no N+1).

---

## 6. Chat & WebSockets

Source: `apps/chat-service/`.

- **Socket.IO Redis adapter (horizontal WebSocket scale)** — `src/common/redis-io.adapter.ts`, wired in `src/main.ts`
  - Lets chat run across **multiple** chat-service instances: messages published on one instance reach clients connected to another via Redis pub/sub. **Required** for multi-replica chat.
  - Falls back to in-memory sockets (single instance) if Redis is unavailable, so local/dev still works.
  - **Config:** same Redis vars as above (`REDIS_URL` / `REDIS_TLS` / …).

- **No-N+1 unread counts** — `src/modules/chat/chat.service.ts`
  - Per-conversation unread counts for the whole conversation-list page are computed in **one** grouped raw aggregate, not a COUNT per conversation.

- **Cursor-based message history**
  - `getMessages` returns the most recent page via a `before` cursor on the `[conversationId, createdAt desc]` index — O(page) no matter how long the conversation gets. Page size capped at `100`; conversation list page capped at `50`.

- **Targeted broadcasts (no global fan-out)** — `src/modules/chat/chat.gateway.ts`
  - Messages emit only to the conversation room; a lightweight `inbox_message` is fanned out to each member's personal `user:{id}` room for unread badges. Push notifications target the recipient's room only — never a broadcast to all sockets.

- **Indexes** — `prisma/schema.prisma`
  - `[tenantId, conversationId, isDeleted, createdAt]`, `[conversationId, createdAt desc]`, `[tenantId, memberId]`, etc., back the hot chat queries.

---

## 7. Mobile client efficiency

Source: `mobile/resido-app/`.

- **Single shared chat socket** — `src/services/chatSocket.ts`
  - One ref-counted process-wide `/chat` connection is shared by the global notifications hook, the conversation list, and the open chat screen — instead of up to 3 sockets per user. At scale this is ~3× fewer server sockets, memory and handshakes per user.

- **List virtualization** — `FlatList` on the home feed, chat list, and conversation view render only visible rows (constant memory regardless of list length).

- **Lazy-loaded dashboards** — `src/screens/HomeScreen.tsx` uses `React.lazy` + `Suspense` so role-based dashboards aren't all in the initial bundle (faster cold start).

- **Query caching (TanStack Query)** — `app/_layout.tsx`
  - Defaults: `staleTime` 5 min, `gcTime` 30 min. Per-hook tuning: conversations `staleTime` 2 min, For You feed 3 min.

- **Cached images** — `expo-image` with stable cache keys (no avatar re-download on every tab focus).

- **Bounded "following" fetch** — `src/services/api.ts`
  - `getAllFollowing` pages the full follow list (page size 100) up to a `maxItems` cap of `2000`; `getFollowingIds` normalizes it to a string-ID array so feed APIs receive real IDs (not serialized objects).

- **Merged home feed** — `src/hooks/useForYouFeed.ts` makes **one** `getForYou` call instead of four parallel feed calls.

---

## 8. Logging & observability

- **Configurable log levels** — `apps/api-gateway/src/main.ts`
  - **Config:** `LOG_LEVELS` (comma-separated, e.g. `error,warn,log`). Defaults to `error,warn,log` so noisy `debug`/`verbose` streams are never on by accident. Run `error,warn` in high-RPS prod to cut log volume and cost.

- **Leveled gateway logging** — `apps/api-gateway/src/modules/proxy/proxy.controller.ts`
  - Uses Nest's `Logger` (contextual, level-controlled) instead of raw `console.*`.

- **Opt-in per-request access log**
  - **Config:** `PROXY_VERBOSE=1` enables a per-request access line. **Off by default** — at high RPS a log line per request is a real throughput/cost drain.
  - Note: other backend services still use `console.*`; converting them follows the same `Logger` + `LOG_LEVELS` pattern and can be done incrementally.

---

## 9. Environment variable reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `PROXY_MAX_SOCKETS` | `256` | Max keep-alive sockets per downstream host (gateway). |
| `THROTTLE_TTL` | `60000` (ms) | Rate-limit window length (gateway). |
| `THROTTLE_LIMIT` | `120` | Max requests per window per IP (gateway). |
| `PROXY_VERBOSE` | _unset_ | `1` = log every proxied request (off by default). |
| `LOG_LEVELS` | `error,warn,log` | Comma-separated Nest log levels (gateway). |
| `CORS_ORIGINS` | `*` | Comma-separated allowed browser origins. |
| `DB_CONNECTION_LIMIT` | `5` | Max connections per Prisma client pool. |
| `DB_POOL_TIMEOUT` | `15` (s) | Wait time for a free DB connection. |
| `CORE_WRITE_URL` / `CORE_READ_URL` | — | Write primary / read-replica Postgres URLs. |
| `REDIS_URL` | — | Redis/ElastiCache connection string (preferred). |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | — | Discrete Redis connection params (fallback). |
| `REDIS_TLS` | _unset_ | `true` for ElastiCache in-transit encryption. |
| `INTERNAL_SERVICE_SECRET` | — | Shared secret for server-to-server calls (fails closed in prod). |
| `*_SERVICE_URL` | compose names | Downstream service discovery URLs. |
| `NODE_ENV` | — | `production` enables fail-closed internal auth. |

**Tunable code constants** (change in source, not env): `MAX_BATCH_IDS` (200), `MAX_STRUCTURE_ROWS` (5000), `MAX_CONTENT_ROWS` (1000), cache TTLs (`IDENTITY_CACHE_TTL`/`AVATAR_TTL`/`VISIBILITY_TTL` 300s, `FOLLOWERS_TTL` 60s, `FEED_PAGE_TTL` 15s, `STATS_TTL_MS` 30s), feed page size (20), chat message page (100), conversation page (50), mobile following cap (2000).

---

## 10. Recommended production values

For a high-traffic deployment (tune against load tests):

```bash
# Gateway
PROXY_MAX_SOCKETS=512          # raise if downstream concurrency is high
THROTTLE_TTL=60000
THROTTLE_LIMIT=120             # raise for trusted/high-traffic clients
PROXY_VERBOSE=                 # keep OFF in prod
LOG_LEVELS=error,warn          # drop "log" at very high RPS

# Database (per Prisma client) — keep total (tasks × clients × limit)
# comfortably under RDS max_connections; pair with RDS Proxy/PgBouncer
DB_CONNECTION_LIMIT=5
DB_POOL_TIMEOUT=15

# Redis / ElastiCache (required for multi-instance chat + caching)
REDIS_URL=rediss://<elasticache-endpoint>:6379
REDIS_TLS=true

# Internal auth (set the SAME value on every service)
INTERNAL_SERVICE_SECRET=<strong-random-secret>
NODE_ENV=production
```

> **Capacity math for DB connections:** `total_connections ≈ ECS_tasks × prisma_clients_per_service(2: read+write) × DB_CONNECTION_LIMIT`. Keep this under RDS `max_connections` (minus headroom). Example: 20 tasks × 2 × 5 = 200 connections. Use RDS Proxy to multiplex beyond that.

---

### What the code does NOT do (infra responsibilities)

These are required for millions of requests but are **not** code configs:

- Horizontal autoscaling of gateway + services (ECS service autoscaling).
- RDS instance sizing, read replica provisioning, RDS Proxy / PgBouncer.
- ElastiCache cluster sizing and the actual Redis endpoint.
- ALB configuration and WebSocket routing/stickiness (the Socket.IO Redis adapter handles cross-instance delivery; the ALB must still route WS).
- CDN in front of media/object storage.

The application code is built so that, once the above infra is scaled appropriately, request throughput is limited by capacity you add — not by application-code bottlenecks.
