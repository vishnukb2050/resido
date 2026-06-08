# Resido Production Readiness & Scale Assessment

**Question answered:** _Is the app production-grade code that can serve millions of requests once the infrastructure is scaled properly?_

**Verdict:** **Yes — the code is production-grade. The remaining gating factors are infrastructure-side (your part).** All known code-level scale blockers have been fixed and typecheck clean across the mobile app and all five affected backend services.

> Scope note: "scale infra properly" is real work, not a formality — see [Infrastructure Requirements](#infrastructure-requirements-your-part). The single most important one is an RDS connection pooler + read replica.

---

## Table of Contents

1. [Bottom Line](#1-bottom-line)
2. [Code Fixes Completed](#2-code-fixes-completed)
3. [Infrastructure Requirements (Your Part)](#3-infrastructure-requirements-your-part)
4. [Honest Caveats](#4-honest-caveats)
5. [Deliberately Deferred (Acceptable for Launch)](#5-deliberately-deferred-acceptable-for-launch)
6. [Deployment Steps](#6-deployment-steps)
7. [Pre-Launch Verification Checklist](#7-pre-launch-verification-checklist)

---

## 1. Bottom Line

| Dimension | Status |
|---|---|
| **Code readiness** | ✅ Ready — no known code-level blocker to millions of requests |
| **System readiness** | ⏳ Conditional on infra (autoscaling, RDS replica + proxy, Redis replication) |
| **Type safety** | ✅ Mobile + 5 backend services compile clean (`tsc --noEmit` exit 0) |
| **Load tested** | ❌ Not yet — run one real load test against scaled staging before launch |

**Priority order to reach full system readiness:**
**RDS Proxy + read replica → ECS autoscaling → Redis replication → load test to confirm.**

---

## 2. Code Fixes Completed

### Backend

| # | Fix | Why it mattered | Files |
|---|---|---|---|
| 1 | **Bounded feed visibility lookups** | The feed loaded a viewer's **entire follower list on every request** — fatal for any popular account. Replaced with indexed `IN (...)` probes scoped to the page's authors only. | `auth-service/.../follow/follow.service.ts`, `follow.controller.ts`, `flaredthread-service/.../blogs/blogs.service.ts` |
| 2 | **GIN index on `Blog.hashtags`** | Hashtag feed did an array-membership seq-scan of the whole table. | `flaredthread-service/prisma/schema.prisma` |
| 3 | **Socket.IO Redis adapter fail-fast in prod** | On Redis failure the realtime layer silently fell back to in-memory, so chat/comments would **miss users on other ECS tasks**. Now exits in production instead of split-brain. | `chat-service/src/main.ts`, `flaredthread-service/src/main.ts` |
| 4 | **Redis-backed gateway throttling** | Rate limit was in-memory per task → real limit was `limit × N tasks` and reset on recycle. Now a cluster-wide atomic Redis counter (fails open if Redis down). | `api-gateway/src/app.module.ts`, `api-gateway/src/common/redis-throttler.storage.ts` |
| 5 | **Batched business view-count flush** | Per-profile `GETSET` + `UPDATE` loop. Now one pipelined Redis read + a single `VALUES` bulk UPDATE. | `business-service/.../business/business.service.ts` |
| 6 | **Paginated follow list endpoints** | `getFollowers`/`getFollowing` were unbounded. Capped at 100 with `skip`/`take`. | `auth-service/.../follow/follow.service.ts`, `follow.controller.ts` |

### Mobile

| Area | Fix |
|---|---|
| **Cold start** | Deferred Contacts load/sync via `InteractionManager`; flare sockets moved to dynamic `import('socket.io-client')` off the boot path (`ThreadDetailScreen`, `FlarePlayerScreen`). |
| **List virtualization** | FlatList perf props (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`) added to Contacts, Threads, Noticeboard, CommentSheet, MemberList, CommunityMembers, FollowList. |
| **Pagination** | Infinite scroll added to the Home "For You" feed (`useForYouFeed` + `DefaultDashboard`) and marketplace search (`ServiceSearchScreen`). |
| **Image caching** | Remote images migrated to the cached `AppImage` (`expo-image`, memory-disk) across the touched screens. |

### Already strong before this pass (no change needed)

- Cursor pagination on Threads, Flares, Flare player, chat messages.
- Read/write Prisma split + `withDbPool()` connection caps on all services.
- Batched feed enrichment (avatars/visibilities) with Redis caching + MGET.
- Socket.IO Redis adapter wired in both realtime services.
- `resido_notifications` Redis pub/sub fans out correctly across instances.
- ALB WebSocket routing, stickiness, health checks, rolling deploys, graceful shutdown.
- Single-device login enforcement (session id in JWT + gateway check + force-logout).

---

## 3. Infrastructure Requirements (Your Part)

These are **hard dependencies** — code alone cannot raise these ceilings.

### 3.1 RDS: read replica + connection pooler — **HIGHEST PRIORITY**
- **Why:** `auth-service` alone opens ~8 Prisma pools per task. Without a pooler, Postgres `max_connections` is exhausted long before "millions." The read/write split in code is ready but the `*_READ_URL` secrets currently point at the **primary** — they do nothing until a replica exists.
- **Action:**
  - Add an RDS **read replica**; repoint `*_READ_URL` secrets at the replica endpoint.
  - Put **RDS Proxy** (or PgBouncer) in front of Postgres; route all `*_WRITE_URL` / `*_READ_URL` through the proxy.
  - Tune `DB_CONNECTION_LIMIT` per service.

### 3.2 ECS Application Auto Scaling
- **Why:** Every service is pinned at a fixed `desired_count` with `ignore_changes = [desired_count]`. Load spikes cannot add tasks.
- **Action:** Add `aws_appautoscaling_target` + target-tracking policies (CPU ~70%, and `ALBRequestCountPerTarget` for the gateway).

### 3.3 Redis: replication group (not single node)
- **Why:** Redis is now load-bearing for cache + Socket.IO pub/sub + sessions + rate limiting. A single node is a single point of failure.
- **Action:** Provision an ElastiCache **replication group** with Multi-AZ. **Resolve the topology mismatch** below first.

> ⚠️ **Topology mismatch to resolve:** `.env` points at a `clustercfg.*` (cluster-mode) endpoint with `REDIS_TLS=true`, but the Terraform `redis` module provisions a **single non-cluster node**. This suggests prod Redis was created outside Terraform. Align Terraform with the real topology (and the client mode) before relying on it.

---

## 4. Honest Caveats

1. **Not load-tested.** Fixes are typecheck-clean but not validated under load. Run k6/Artillery against a scaled staging env to find the *next* bottleneck empirically.
2. **Verify the GIN index actually lands** in prod after `prisma db push`/migrate.
3. **Mobile reliability polish (not scale):** no offline/NetInfo banner; sparse retry UI on secondary screens. Won't block scaling; affects perceived reliability on flaky networks.

---

## 5. Deliberately Deferred (Acceptable for Launch)

These are **bounded** (won't break at scale) but not cursor-paginated. Revisit only if the surface gets hot.

| Item | Current bound | Note |
|---|---|---|
| Conversations list | Offset, max 50 | Cross-cutting rework with mobile; low value now. |
| Community events / complaints | Per-tenant, capped 1000 | Visibility filter is risky to churn; per-tenant scope keeps it safe. |
| Notify helpers (push fan-out) | Node `fetch` (undici) | Already pools connections with keep-alive by default. |
| A few non-feed mobile screens | Server-bounded lists | Not infinite-scroll, but bounded. |

---

## 6. Deployment Steps

```bash
# Rebuild + push images for the changed services
infra/ecs/scripts/build-and-push.sh api-gateway auth-service flaredthread-service business-service chat-service

# Register new task defs + rolling deploy
infra/ecs/scripts/deploy-service.sh api-gateway auth-service flaredthread-service business-service chat-service
```

- On the **flaredthread** deploy, run `prisma db push` (or a migration) so the `Blog.hashtags` GIN index is created.
- Build and ship a **new mobile app** build for the cold-start / pagination / image changes.

---

## 7. Pre-Launch Verification Checklist

- [ ] RDS read replica created; `*_READ_URL` secrets repointed to it
- [ ] RDS Proxy (or PgBouncer) in front of Postgres; all URLs routed through it
- [ ] `DB_CONNECTION_LIMIT` tuned per service
- [ ] ECS autoscaling policies applied (gateway, auth, chat, resident first)
- [ ] Redis replication group (Multi-AZ); Terraform ↔ `.env` topology reconciled
- [ ] `Blog.hashtags` GIN index confirmed present in prod
- [ ] Load test run against scaled staging; next bottleneck identified
- [ ] (Polish) Mobile offline banner + retry affordances on primary feeds
```
