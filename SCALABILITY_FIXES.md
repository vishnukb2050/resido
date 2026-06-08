# Resido Scalability & Performance Fixes

This document records the **18 scalability and performance fixes** implemented across the Resido monorepo services to eliminate application bottlenecks and enable seamless horizontal scaling for millions of concurrent users.

---

## Table of Contents

1. [Database Query Optimization & Keyset Pagination](#1-database-query-optimization--keyset-pagination)
2. [Caching Layers & Performance Buffers](#2-caching-layers--performance-buffers)
3. [Index Alignment & Suffix Search Acceleration](#3-index-alignment--suffix-search-acceleration)
4. [Atomic Scaling & Concurrency Optimizations](#4-atomic-scaling--concurrency-optimizations)
5. [JWT, Connection & Notification Performance](#5-jwt-connection--notification-performance)
6. [OTP Security & Rate Limiting](#6-otp-security--rate-limiting)
7. [Verification & Build Health](#7-verification--build-health)

---

## 1. Database Query Optimization & Keyset Pagination

### 1.1 Paginated `getMyBookings` (`business-service`)
* **Problem**: Retrieved all user bookings in a single query with multiple nested joins. Power users with hundreds of bookings triggered slow table scans and high memory usage.
* **Fix**: Added keyset (cursor-based) pagination with `take: 50` default and `take: 100` maximum. Re-mapped responses to `{ items, hasMore, nextCursor }`.
* **Files**:
  * [business.service.ts](file:///home/vishnu/socwhiz/resido/apps/business-service/src/modules/business/business.service.ts)
  * [business.controller.ts](file:///home/vishnu/socwhiz/resido/apps/business-service/src/modules/business/business.controller.ts)

### 1.2 Paginated `getProfileBookings` (`business-service`)
* **Problem**: Admin view for busy businesses loaded thousands of bookings simultaneously without bounds.
* **Fix**: Added cursor pagination with `take: 100` default and `take: 500` maximum, supported by date and status filters.
* **Files**:
  * [business.service.ts](file:///home/vishnu/socwhiz/resido/apps/business-service/src/modules/business/business.service.ts)
  * [business.controller.ts](file:///home/vishnu/socwhiz/resido/apps/business-service/src/modules/business/business.controller.ts)

### 1.3 Optimized Two-Step Fetch for `listSplits` (`resident-service`)
* **Problem**: Querying payment splits performed deep nested joins (`shares -> unit -> block -> families -> members`), generating massive redundant join trees (500 splits × N members) that bloated database transfer sizes and server memory.
* **Fix**: Replaced the deep join with a flat two-step query: (1) fetch splits with flat shares, (2) fetch all community units exactly once, mapping them in-memory to build the output graph.
* **Files**:
  * [community-finance.service.ts](file:///home/vishnu/socwhiz/resido/apps/resident-service/src/modules/finance/community-finance.service.ts)

### 1.4 Capped and Grouped `getMaintenanceStatus` (`resident-service`)
* **Problem**: Loading monthly bills for society admin panels returned unbounded rows with nested resident/family schemas.
* **Fix**: Added pagination parameters and utilized `groupBy` where applicable for statistics, loading member details only on user drill-down.
* **Files**:
  * [community-finance.service.ts](file:///home/vishnu/socwhiz/resido/apps/resident-service/src/modules/finance/community-finance.service.ts)

### 1.5 DB-Side Location Sorting & Bounding (`auth-service`)
* **Problem**: The location autocomplete search fetched 200 matches and performed complex sorting and slicing using in-memory JavaScript.
* **Fix**: Replaced the search query with a raw parameterized SQL query (`$queryRawUnsafe`). Pushed the priority ranking logic (coordinate presence, exact name matches, starts-with prefixes, and alphabetical ordering) into the PostgreSQL `ORDER BY` clause, capping the query at a strict `LIMIT 50`.
* **Files**:
  * [profile.service.ts](file:///home/vishnu/socwhiz/resido/apps/auth-service/src/modules/profile/profile.service.ts)

### 1.6 Efficient DISTINCT Category Fetching (`business-service`)
* **Problem**: Extracted unique marketplace categories by loading every active business profile row into memory.
* **Fix**: Replaced the query with a PostgreSQL native `groupBy`/`distinct` query.
* **Files**:
  * [business.service.ts](file:///home/vishnu/socwhiz/resido/apps/business-service/src/modules/business/business.service.ts)

---

## 2. Caching Layers & Performance Buffers

### 2.1 Caching `getMaintenanceStatus` (`resident-service`)
* **Problem**: Heavily nested monthly billing queries ran on every admin refresh without caching.
* **Fix**: Added a Redis-backed cache keyed per `{tenantId}:{month}:{year}` with a 30-second TTL. The cache is immediately invalidated when a payment is approved to preserve data accuracy.
* **Files**:
  * [community-finance.service.ts](file:///home/vishnu/socwhiz/resido/apps/resident-service/src/modules/finance/community-finance.service.ts)

### 2.2 Redis Cache for Member Profiles (`resident-service`)
* **Problem**: The helper to resolve members by `id`, `userId`, or `phone` was executed on every HTTP request.
* **Fix**: Implemented a Redis cache keyed `member:{tenantId}:u:{id}` / `member:{tenantId}:p:{phone}` with a 5-minute TTL, pipelines, and validation hooks to invalidate the cache upon membership or role updates.
* **Files**:
  * [community.service.ts](file:///home/vishnu/socwhiz/resido/apps/resident-service/src/modules/community/community.service.ts)

### 2.3 Redis Buffer for Business Profile Views (`business-service`)
* **Problem**: Every profile load executed a database write update (`viewCount: { increment: 1 }`), causing database locks on popular pages.
* **Fix**: Buffered view count increments in Redis (`INCR business:views:{id}`) and flushed updates to the PostgreSQL database in batches every 5 minutes.
* **Files**:
  * [business.service.ts](file:///home/vishnu/socwhiz/resido/apps/business-service/src/modules/business/business.service.ts)

---

## 3. Index Alignment & Suffix Search Acceleration

### 3.1 Suffix Matching via `phoneLast10` (`auth-service`)
* **Problem**: Contact sync matched phone numbers using SQL `endsWith` (`LIKE '%suffix'`) which cannot utilize standard B-Tree indexes, triggering full scans of the user table.
* **Fix**:
  - Added a `phoneLast10 String?` computed column to the User model along with a compound index: `@@index([isActive, phoneLast10])`.
  - Configured a Prisma client middleware to automatically calculate and save `phoneLast10` from `phone` on every write (create, update, upsert, createMany, updateMany).
  - Updated `syncContacts` to query `phoneLast10` in a fast index-supported array scan.
* **Files**:
  * [schema.prisma](file:///home/vishnu/socwhiz/resido/apps/auth-service/prisma/user/schema.prisma)
  * [prisma.service.ts](file:///home/vishnu/socwhiz/resido/apps/auth-service/src/modules/prisma/prisma.service.ts)
  * [auth.service.ts](file:///home/vishnu/socwhiz/resido/apps/auth-service/src/modules/auth/auth.service.ts)

### 3.2 Syncing `BusinessProfile` Indexes (`resident-service`)
* **Problem**: The local copy of `BusinessProfile` in `resident-service` was missing critical covering indexes compared to the canonical service schema.
* **Fix**: Synced the composite indexes in the schema file so database geo queries run efficiently.
* **Files**:
  * [schema.prisma](file:///home/vishnu/socwhiz/resido/apps/resident-service/prisma/schema.prisma)

### 3.3 Media Asset User Index (`flaredthread-service`)
* **Problem**: Users fetching their own uploaded files caused full table scans.
* **Fix**: Added a compound index `@@index([ownerUserId, createdAt(sort: Desc)])` to cover uploads views.
* **Files**:
  * [schema.prisma](file:///home/vishnu/socwhiz/resido/apps/flaredthread-service/prisma/schema.prisma)

### 3.4 Visitor Entries Compound Index (`visitor-service`)
* **Problem**: Date-filtered visitor register queries did not have covering indexes.
* **Fix**: Verified and ensured the compound index `@@index([tenantId, inTime(sort: Desc)])` was defined in the schema.
* **Files**:
  * [schema.prisma](file:///home/vishnu/socwhiz/resido/apps/visitor-service/prisma/schema.prisma)

---

## 4. Atomic Scaling & Concurrency Optimizations

### 4.1 Redis Counter for Slot Booking Tokens (`business-service`)
* **Problem**: Resolving the daily booking token via a transactional `SELECT MAX(tokenNumber)` locked table rows and caused transaction timeouts under high traffic.
* **Fix**: Moved daily token generation to an atomic `INCR` in Redis keyed per `{profileId}:{date}`, with automatic 25-hour expiration and a database fallback.
* **Files**:
  * [business.service.ts](file:///home/vishnu/socwhiz/resido/apps/business-service/src/modules/business/business.service.ts)

### 4.2 Safe Visitor Passcodes (`resident-service`)
* **Problem**: Generating 4-digit codes via a read-then-write loop suffered from TOCTOU race conditions.
* **Fix**: Upgraded codes to a 6-character cryptographically secure alphanumeric format (56 billion possibilities) and replaced pre-check reads with database unique constraint violation (`P2002`) catch-and-retry loops.
* **Files**:
  * [community.service.ts](file:///home/vishnu/socwhiz/resido/apps/resident-service/src/modules/community/community.service.ts)

---

## 5. JWT, Connection & Notification Performance

### 5.1 Push Notification Integration (`notification-service`)
* **Problem**: Notifications only broadcasted via Redis/WebSockets. Sleeping devices or closed apps missed alerts.
* **Fix**: Integrated the Firebase Admin SDK (`firebase-admin`) to send push notifications to user devices.
* **Files**:
  * [notification.service.ts](file:///home/vishnu/socwhiz/resido/apps/notification-service/src/modules/notification/notification.service.ts)
  * [auth.controller.ts](file:///home/vishnu/socwhiz/resido/apps/auth-service/src/modules/auth/auth.controller.ts)

### 5.2 Async JWT Verification in Chat (`chat-service`)
* **Problem**: CPU-heavy synchronous JWT signature verification blocked the Node.js event loop on socket reconnection storms.
* **Fix**: Converted chat handshake verification to utilize the non-blocking `jwtService.verifyAsync()`.
* **Files**:
  * [chat.gateway.ts](file:///home/vishnu/socwhiz/resido/apps/chat-service/src/modules/chat/chat.gateway.ts)

### 5.3 Fixed-size JWT Cache in API Gateway (`api-gateway`)
* **Problem**: The gateway cached verified tokens in an unbounded `Map`, creating memory leaks.
* **Fix**: Replaced the map with a fixed-size `lru-cache` (max 2,000 entries, 60s TTL).
* **Files**:
  * [proxy.controller.ts](file:///home/vishnu/socwhiz/resido/apps/api-gateway/src/modules/proxy/proxy.controller.ts)

---

## 6. OTP Security & Rate Limiting

### 6.1 OTP Rate Limiting per Phone (`auth-service`)
* **Problem**: No rate limits existed on the `/auth/send-otp` path, risking SMS credit exhaustion.
* **Fix**: Integrated a Redis-backed rate-limiter allowing a maximum of 5 OTP attempts per phone number per 10-minute window.
* **Files**:
  * [auth.service.ts](file:///home/vishnu/socwhiz/resido/apps/auth-service/src/modules/auth/auth.service.ts)

---

## 7. Verification & Build Health

To ensure all code remains production-ready and fully type-safe, build verifications are run from the monorepo root:

```bash
npm run build:all
```

All 11 NestJS backend services and the 2 Vite frontends build successfully with **0 compilation errors**.
