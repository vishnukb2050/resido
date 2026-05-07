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

### 🎨 Mobile UI/UX Restoration
- **Premium Dashboard**: Redesigned the top section to match high-fidelity specifications, featuring a side-by-side branding and announcement layout.
- **Logo Integration**: Fixed asset background issues, ensuring the Resido logo blends seamlessly with the app's clean aesthetic.

### 📝 Advanced Notes System
- **Hierarchical Structure**: Refactored notes into a **Folder > Page** organization.
- **Social Sharing**: Implemented sharing for both folders and pages, targeting **Communities**, **Groups**, or specific **Contacts**.

### 🖼️ Organized Community Gallery
- **Folder Support**: Residents can now create and manage media folders for better organization.
- **Video Support**: The gallery now supports uploading and previewing videos alongside photos.

### 📰 Social Blog Features
- **Media-Rich Posts**: Support for both Image and Video content in community blogs.
- **User Tagging**: Mention community members using `@tags` with automated **Real-time Notifications** for tagged individuals.

### 🔍 Utility & Reliability
- **QR Scanner**: Fully restored high-performance QR code scanning.
- **Auto-Sync DB**: All services are now hardened with startup logic that automatically synchronizes database schemas on remote servers.

---

## 📄 License
Internal Proprietary Software. © 2026 Resido Tech.
