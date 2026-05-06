# Resido Technical Architecture

This document dictates the architectural rules surrounding the Resido application, built to serve multi-tenant apartment societies securely and at scale.

## 1. Domain Separation & Data Isolation

### Database Tenants (PostgreSQL on AWS RDS)
Resido uses a **Physical Isolation** model (Database-per-Tenant) to ensure maximum security and performance.
*   **Central Database (`auth_db`)**: Acts as the shared "Main Directory".
    *   **Global Users**: All users (Residents, Admins, SuperAdmins) are registered here with their phone numbers.
    *   **Clients/Tenants**: Metadata for each community (Slug, DB name, S3 prefix, plan).
    *   **Workspace Memberships**: Maps global users to specific communities and their role within that community.
*   **Tenant Databases (`resido_{slug}`)**: Each community has its own isolated Postgres database.
    *   **Data Stored**: Residents, Units, Noticeboard, Polls, Complaints, Visitors, Events, etc.
    *   **Isolation**: This ensures that even in the event of a breach, data from one community cannot be accessed from another.
*   **R/W Splitting**: All databases utilize AWS RDS Read Replicas. Services route queries to the Replica for speed and Writes to the Master for consistency.

### S3 Prefix Isolation (AWS S3)
The storage bucket is split into global and tenant-specific hierarchies to manage data ownership and scalability.

*   **`global/`**: Data owned by the user across the platform.
    *   `global/profiles/{userId}/`: Profile photos.
    *   `global/media/common/`: Shared app assets.
*   **`tenants/{tenantSlug}/`**: Data owned by the community.
    *   `tenants/{tenantSlug}/gallery/`: Community media (categorized).
    *   `tenants/{tenantSlug}/notices/`: Official announcements.
    *   `tenants/{tenantSlug}/complaints/`: Evidence photos for issues.
    *   `tenants/{tenantSlug}/gatepass/`: Visitor entry photos.
    *   `tenants/{tenantSlug}/chats/`: Media attachments for community chats.

## 2. Platform Authentication (Auth Service)
Because of the variance in target users (Grandma in a flat vs. SuperAdmin managing the cloud), our Auth layer fragments into several operational flows:

| Target User | Portal | Auth Method | Under The Hood |
|---|---|---|---|
| Super Admin | `web/superadmin` | Email/Password | Checks direct bcrypt validity in master database, returns JWT marked `SUPER_ADMIN`. |
| Society Admin / Caretaker | `web/admin` | Phone + OTP | Creates the `USER`, provisions the OTP (`1234`), checks the workspace table, and throws an error if the user lacks Admin/Caretaker status. |
| Residents / Service Staff | `mobile/resido-app` | Phone + OTP | Mobile equivalent flow. Switches to Workspace Selection if a Resident owns units in multiple logged apartments. |

## 3. Communication Streams
Microservices do not heavily cross-pollinate. They interact via specific boundaries.

* **Chat Service**: Establishes WebSockets directly with the mobile and web clients. Bypasses standard REST request limits. Backed by a Redis PubSub to route messages between instances if scaled.
* **Notification Service**: Central sink for other apps. If Complaint Service records a status update to "Resolved", it broadcasts a payload via TCP/Redis to the Notification Service, which ultimately executes the FCM push notification and WhatsApp API ping using Meta's Cloud API limits.

## 4. Environment Rollout
* **Local**: Raw Docker Compose mapping Nginx into the Alpine Nodes.
* **Production**: Executed over AWS EKS using Terraform. Each microservice is maintained as an independent deployment alongside AWS ALB Ingress Controllers checking wildcard subdomains mapping to specific society configurations.
