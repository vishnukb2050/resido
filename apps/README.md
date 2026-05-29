# Resido Backend - Microservices Architecture

The Resido backend is a collection of NestJS microservices designed for high availability, modularity, and data isolation.

## 🏗 Microservices Overview

### 1. API Gateway (`:3000`)
The central entry point for all requests.
- **Routing**: Proxies requests to internal microservices based on URL prefix.
- **Security**: Validates JWT tokens and extracts tenant identity (`x-db-name`).
- **Nginx Bridge**: Works behind an Nginx reverse proxy for SSL termination and static serving.

### 2. Auth Service (`:3001`)
The core identity and platform management engine.
- **Tenancy**: Handles the creation of new communities and provisions isolated tenant databases.
- **OTP Auth**: Manages 4-digit mobile verification via MSG91/Twilio.
- **Profiles**:
    - **User Profile**: Personal details (Bio, Age, Photo).
    - **Job Profile**: Allows users to register as professional service providers (e.g., Plumbers, Electricians).
- **Storage**: Handles AWS S3 Pre-signed URL generation for secure file uploads.

### 3. Resident Service (`:3002`)
Manages community-specific data within isolated tenant databases.
- **Members**: Resident directory and family management.
- **Communication**: Community notices, announcements, and polls.
- **Facilities**: Booking and shared resource management.

### 4. Accounting Service (`:3003`)
Handles financial operations for the community.
- **Ledger**: Tracks income, expenses, and maintenance payments.
- **Reports**: Generates monthly financial statements.

### 5. Chat Service (`:3004`)
Real-time communication layer.
- **WebSockets**: Socket.io integration for instant messaging.
- **Notification Proxy**: Broadcasts chat alerts to the notification service.

### 6. Visitor & Gatepass (`:3006`)
Security and access management.
- **Gatepass**: Digital entry passes for guests.
- **Logs**: Real-time tracking of visitor entries and exits.

### 7. Complaint Service (`:3007`)
Helpdesk and maintenance ticketing.
- **Tickets**: Residents can raise complaints with photos.
- **Workflow**: Status tracking from 'Raised' to 'Resolved'.

---

## 💾 Data Isolation Strategy (Multi-Tenancy)

Resido uses a **Schema-per-Tenant** approach on AWS RDS:
1. **Master DB**: Stores global data (Users, Staff, Client list, OTP logs).
2. **Tenant DBs**: Every community has its own isolated database schema (e.g., `resido_greenwood`).
3. **Switching**: When a user logs in, the API Gateway identifies their `dbName` and instructs the services to use that specific database for all subsequent operations.

---

## 🔐 Security
- **JWT**: Stateless authentication with access and refresh tokens.
- **Bcrypt**: All professional and admin passwords are salt-hashed.
- **AWS S3**: Files are stored in isolated folders per tenant with restricted access.

---

## 📡 API Development
Each service runs in its own Docker container. For local development:
```bash
cd apps/<service-name>
npm install
npm run start:dev
```

---

## 🗄 Database Schema Push on Deploy

Every service that owns a Prisma schema runs `prisma db push` from its
`start.sh` on container startup, so the live database always converges to
the code that just shipped. Concretely, on every `docker compose up` /
`docker compose restart`:

| Service              | Pushes schema(s)                                                                              | Database(s)                              |
| -------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `auth-service`       | `prisma/master`, `prisma/user`, `prisma/geo` (NOT core)                                       | `resido_master`, `resido_users`, `resido_geodata` |
| `resident-service`   | `prisma/schema.prisma` — **sole owner** of `resido_core`                                      | `resido_core`                            |
| `notification-service` | `prisma/schema.prisma`                                                                       | `resido_notifications`                   |

The following services **share** `resido_core` with `resident-service` and
therefore intentionally **do not** run `db push` (their schemas are
subsets — pushing from them would drop other services' tables):

- `business-service`, `chat-service`, `complaint-service`, `visitor-service`,
  `accounting-service`, `flaredthread-service`

### Why `auth-service` doesn't push `resido_core`

`auth-service` reads from `resido_core` (business profiles, members, blogs)
through a generated Prisma client, so it still needs the `core` schema file
at build time for `prisma generate`. But it **must not** run `db push` for
that database — that would race `resident-service` and silently drop any
column the auth-side schema is missing.

To keep the two schema files from drifting, the auth-side copy is generated
by a sync script:

```bash
bash infra/sync-prisma-schemas.sh           # mirror resident → auth
bash infra/sync-prisma-schemas.sh --check   # CI guard (exits non-zero on drift)
```

Whenever you edit `apps/resident-service/prisma/schema.prisma`, run the sync
and commit both files in the same change.

### Compose start order

`infra/docker-compose.yml` declares every consumer of `resido_core` as
`depends_on: [resident-service]`. That gives the schema owner a head start so
its `db push` is well under way before the rest of the services begin
querying the database. `auth-service` additionally runs
`wait-for-core-schema.js` in its `start.sh` to block on the appearance of
`business_profiles`, `blogs`, and `members` before serving traffic.
