# Resido SaaS Platform

Resido is a comprehensive, multi-tenant Apartment Management Software-as-a-Service system. It facilitates seamless communication, accounting, visitor tracking, and complaint resolution between apartment administrators, security, care staff, and residents.

## Application Architecture

Resido is composed of three primary client interfaces and a robust backend array of NestJS microservices. 

### 1. The Clients
* **SuperAdmin Panel** (`web/superadmin`): A React Vite application strictly for SaaS ownership usage. Used to onboard new hospitals/apartments and provision their S3 and database namespaces. Logins enforce standard Email & Password logic.
* **Apartment Admin Panel** (`web/admin`): A React Vite application for Apartment Administrators and Caretakers. Logs in via OTP. Caretakers are restricted dynamically in the UI to Complaints, Notices, and Chats, while Admins have full oversight.
* **Mobile App** (`mobile/resido-app`): A React Native / Expo application for all residents, security guards, cleaning staff, and accounts staff.

### 2. The Backend
* **API Gateway**: Edge routing on Port 3000. Resolves multi-tenant contexts before proxying.
* **NestJS Microservices**: `auth`, `resident`, `chat`, `notification`, `clients`.
* **Infrastructure & Data Isolation**:
    *   **Central RDS Database (`auth_db`)**: Stores global user accounts and tenant registry.
    *   **Tenant RDS Databases (`resido_{slug}`)**: Each community has a physically isolated database for its residents and events.
    *   **AWS S3 Hierarchy**: Structured into `global/` (user profiles) and `tenants/` (community media) to ensure clean data ownership.
    *   **Read/Write Splitting**: All services utilize RDS Read Replicas for high-performance read operations.
* **Caching & Real-time**: Redis for WebSockets (Socket.IO) and multi-tenant notification routing.

## Development Setup

We have containerized the entire local network behind Docker Compose.

### Starting the Backend Services
1. Ensure your `.env` file exists at the root `resido/.env`.
2. Start the Docker container array:
```bash
cd infra
docker compose up -d --build
```
This handles all the NestJS microservices, Nginx reverse proxies, PostgreSQL, and Redis cache.

### Building the Native Android App (APK)
Because local machines lack the massive SDK setups required for bare Android compilation, we utilize Expo Application Services (EAS).
```bash
npm install -g eas-cli
eas login
cd mobile/resido-app
eas build -p android --profile preview
```

## Authentication Notice for Development 🚨
Currently, the physical SMS provider (MSG91) is scaffolded but bypassed for local development testing. All users, regardless of what phone number they enter, must authenticate using the fixed OTP: **`1234`**.

## Further Reading
* View the [Full Architecture Blueprint](docs/architecture.md) for in-depth explanations on database scaling and authentication mappings.
* Contact platform engineering for Terraform/EKS prod rollouts.
