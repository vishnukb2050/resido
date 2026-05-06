# Resido Role-Based Access Control (RBAC) System

This document outlines the multi-tenant role system for the Resido platform. Permissions and UI visibility are dynamically scoped based on the user's role in their **Active Workspace**.

---

## 1. Role Definitions

| Role | Target User | Description |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Resido Internal | Full system access across all tenants. Managed via the SuperAdmin Web Panel. |
| **APARTMENT_ADMIN** | Community Owner | Primary manager for a community. Full access to Web Admin and Mobile Resident features. |
| **ADMIN_STAFF** | Manager/Office Staff | Secondary admin access for day-to-day community operations. |
| **RESIDENT** | Flat Owner/Tenant | Standard user. Access to notices, polls, community chat, and complaints. |
| **CLEANING_STAFF** | Janitors/Cleaning | Task-based mobile view for area cleanings and schedule tracking. |
| **SECURITY_STAFF** | Gate Guards | Specialized mobile view for visitor logs, gate passes, and parcels. |
| **MAINTENANCE_STAFF**| Electrician/Plumber | Work-order focused view for repairs and building maintenance. |
| **SERVICE_STAFF** | Multi-purpose Staff | General staff access for various community services. |
| **CARETAKER** | Site In-charge | Oversight role with access to most administrative and resident features. |

---

## 2. Mobile Dashboard Mapping

The mobile app dynamically swaps the entire home screen based on the active role.

| Dashboard | Roles | Primary Features |
| :--- | :--- | :--- |
| **AdminDashboard** | ADMIN, RESIDENT, CARETAKER | Community Feed, Polls, Notices, Events, Member Directory. |
| **CleaningDashboard**| CLEANING_STAFF | Cleaning Schedule, Task Photos, Performance Stats. |
| **SecurityDashboard**| SECURITY_STAFF | Gate Pass QR Scanner, Visitor Entry Log, Parcel Inward/Outward. |
| **ServiceDashboard** | MAINTENANCE, SERVICE | Work Orders, Status Updates, Building Maps. |
| **DefaultDashboard** | GUEST / PERSONAL | Personal Workspace, Community Creation, Contact Sync. |

---

## 3. Feature Permissions Matrix

| Feature | Resident | Admin | Security | Cleaning | Service |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Noticeboard** | View | Create | View | View | View |
| **Polls** | Vote | Create | - | - | - |
| **Complaints** | Create | Resolve | - | - | View/Update |
| **Gate Pass** | Create | View | **Verify** | - | - |
| **Visitor Log** | View My | View All | **Log New** | - | - |
| **Cleaning Tasks**| - | View | - | **Update** | - |
| **Member List** | View | Manage | View | - | - |

---

## 4. Multi-Tenant Context Flow

When a user switches workspaces, the following happens:
1.  **Auth Sync**: The app retrieves the `role` and `memberId` for the specific `tenantId` from the `auth_db`.
2.  **Dashboard Switch**: `HomeScreen.tsx` evaluates the `UserRole` and renders the corresponding specialized component.
3.  **Data Scoping**: Every API request is sent with the `X-Db-Name` header. The backend ensures that a **Security Staff** member in "Workspace A" cannot see tasks from "Workspace B".
4.  **Personal Isolation**: When "Resido Personal" is selected, the app hides all community-specific tabs and shows global social discovery features.
