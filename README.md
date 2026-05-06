# Resido - Property & Community Management SaaS

Resido is a comprehensive multi-tenant SaaS platform designed for apartment complexes, gated communities, and property managers. It streamlines community engagement, facility management, accounting, and professional service discovery into a unified ecosystem.

## 🏗 Architecture Overview

Resido follows a **Microservices Architecture** built with high scalability and data isolation in mind.

### Key Architectural Pillars:
- **Multi-Tenancy**: Dynamic database provisioning per community (tenant) ensures strict data isolation.
- **Service-Oriented**: Backend divided into 8+ specialized microservices.
- **API Gateway**: Single entry point for all frontend/mobile traffic, handling authentication and routing.
- **Real-time Engine**: WebSocket-based communication for instant notifications and chat.
- **Hybrid Cloud Infra**: Optimized for AWS deployment (RDS, ElastiCache, S3, EC2).

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

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd resido
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your AWS credentials, Database URLs, and API keys.

3. **Deploy Infrastructure**:
   ```bash
   cd infra
   docker compose up -d --build
   ```

4. **Initialize Database**:
   ```bash
   cd ../apps/auth-service
   npx prisma db push
   ```

---

## 📦 Services & Ports

| Service | Port | Description |
| :--- | :--- | :--- |
| **API Gateway** | 3000 | Main entry point |
| **Auth Service** | 3001 | Auth, Tenancy, Profiles |
| **Resident Service** | 3002 | Community Data |
| **Accounting** | 3003 | Finance |
| **Chat** | 3004 | WebSockets |
| **Notification** | 3005 | Push/Email |
| **Visitor** | 3006 | Gatepass |
| **Complaint** | 3007 | Support Tickets |
| **Admin Panel** | 5173 | Web UI (Vite) |

---

## 📄 License
Internal Proprietary Software. © 2026 Resido Tech.
