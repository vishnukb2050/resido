# Resido - Property & Community Management SaaS

Resido is a comprehensive multi-tenant SaaS platform designed for apartment complexes, gated communities, and property managers. It streamlines community engagement, facility management, accounting, and professional service discovery into a unified ecosystem.

## 🏗 Architecture Overview (Consolidated 3-DB Model)

Resido uses a **Consolidated Multi-Tenant Architecture** to optimize performance, cost, and maintainability.

### 🗄 Database Strategy:
1.  **Master DB (`resido_master`)**: Manages the platform registry, community billing plans, and staff account management.
2.  **User DB (`resido_users`)**: Manages global user identity, OTP logs, and cross-community membership roles.
3.  **Core DB (`resido_core`)**: Stores all operational community data (Complaints, Residents, Blogs, etc.) in a shared schema with strict **Tenant Isolation**.

### Key Architectural Pillars:
- **Shared Tenancy**: Logical data isolation using `tenantId` ensures security while allowing massive scale on a single RDS instance.
- **Automated Isolation**: Backend middleware automatically injects `tenantId` into every database query, preventing data leakage.
- **Read/Write Splitting**: Every database client supports dedicated Write and Read (Replica) endpoints for horizontal scaling.
- **Auto-Migration**: Containers automatically synchronize database schemas on startup, ensuring zero-effort deployments.

---

## 🛠 Tech Stack

### Backend (Microservices)
- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Database**: PostgreSQL (Master Auth + Isolated Tenant DBs)
- **Caching/Queue**: Redis (ElastiCache)
- **API**: REST, WebSockets (Socket.io)

### Frontend & Mobile
- **Admin Panels**: React 18, Vite, TailwindCSS
- **Mobile App**: React Native (Expo), Expo Router
- **State Management**: Zustand, React Query

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **Cloud (AWS)**: EC2, RDS (PostgreSQL), S3 (Storage), ElastiCache (Redis)

---

## 📂 Project Structure

```bash
resido/
├── apps/               # Backend Microservices
│   ├── api-gateway/    # Entry point & Routing
│   ├── auth-service/   # Auth, Multi-tenancy & Profiles
│   ├── resident-service/# Community Management
│   ├── accounting-service/# Ledger & Payments
│   ├── chat-service/   # Real-time Messaging
│   ├── visitor-service/ # Gatepass Tracking
│   ├── complaint-service/# Ticket Management
│   └── notification-service/# Push Notifications
├── web/                # Web Dashboards
│   ├── admin/          # Community Admin Panel
│   └── superadmin/     # Platform Management
├── mobile/             # Mobile Application
│   └── resido-app/     # React Native (Expo)
├── infra/              # Deployment Config
│   ├── docker-compose.yml
│   └── nginx/          # Reverse Proxy Config
└── .env                # Global Environment Config
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (Local or AWS RDS)

### Installation & Deployment

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd resido
   ```

2. **Configure Environment**:
   Update `.env` with your `RDS_WRITE_URL` and `RDS_READ_URL`. The services will automatically derive the Master, User, and Core connection strings.

3. **Launch Platform**:
   ```bash
   cd infra
   docker compose up -d --build
   ```
   *The containers will automatically initialize the 3 databases on your RDS instance during the first startup.*

---

| **Blog Service** | 3008 | Core DB (Shared) |

---

## ✨ Recent Enhancements (May 2026)

### 🏢 Multi-Community & RBAC Ecosystem (Latest)
- **Role-Based Dashboards**: Implemented specialized, high-fidelity dashboards for **Admins**, **Cleaning Staff**, **Security Staff**, and **Maintenance Staff**.
- **Workspace Navigation**: Added a "Workspace Bubble" navigation system allowing users with multiple roles across different communities (e.g., Security in Community A, Admin in Community B) to switch seamlessly.
- **Automated Role Assignment**: Integrated backend logic to automatically provision global user accounts and assign specific workspace roles when added by a Community Admin.
- **Advanced Staff Management**: Community Admins can now register staff with detailed profiles including **Age**, **Full Address**, and **Document Verification** (ID Proofs/Contracts).

### 🛠️ UX & Reliability Fixes
- **Layout Optimization**: Resolved visibility issues on Note and Document pages by optimizing top-padding for devices with notches and status bars.
- **Authentication Propagation**: Hardened the API interceptors to ensure consistent token and tenant header injection across all modules, fixing folder and page creation errors.
- **Seeding & Provisioning**: Created automated shell scripts for rapid provisioning of test environments and community staff memberships.

---

## 📄 License
Internal Proprietary Software. © 2026 Resido Tech.
