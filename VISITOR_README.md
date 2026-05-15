# Resido Visitor Management System

## Overview
A dual-method visitor entry system supporting both Resident-generated QR codes (Gatepasses) and Security-managed manual registrations.

---

## 1. Resident-Generated Entry (Gatepass)
### Feature: Create Gatepass
Residents can pre-authorize visitors for seamless entry.
- **Location:** Resident Dashboard -> Gatepass icon.
- **Workflow:**
    1. Resident enters visitor name, count, purpose, and vehicle number.
    2. System generates a **Unique QR Code** containing the Gatepass ID.
    3. Resident shares the QR code with the visitor via WhatsApp or SMS.
- **Security Action:**
    - Security scans the QR code using the **"Scanner"** tool.
    - System verifies the gatepass and shows the resident's details.
    - Security taps "Approve" to log the entry in the Visitor Register.

---

## 2. Security-Managed Entry (Manual)
### Feature: Add Visitor
For walk-in visitors, delivery personnel, or maintenance staff without a pre-generated pass.
- **Location:** Security Dashboard -> Add Visitor icon.
- **Fields:**
    - **Name & Mobile:** Primary identification.
    - **Unit to Visit:** Which apartment they are going to.
    - **Category:** Select from Visitor, Delivery, or Maintenance & Repair.
    - **Vehicle Number:** Log for parking security.
    - **Purpose & Description:** Context for the visit.
- **Workflow:** Security fills the form and saves it, which instantly populates the Visitor Register.

---

## 3. Centralized Visitor Register
- **Dashboard Icon:** "Register" in Security and Admin dashboards.
- **Functionality:**
    - **Real-time Queue:** See everyone currently inside the community.
    - **Status Tracking:** "INSIDE" (Active) or "EXITED" (Checked out).
    - **Categorized View:** Visual icons to distinguish between guests, delivery boys, and repairmen.
    - **Contact Info:** Quick access to visitor phone numbers for security follow-ups.

---

## 4. Technical Architecture
### Backend (Visitor Service)
- **Model:** `VisitorEntry`
- **Schema Additions:** Includes `category` and `description` for detailed manual logging.
- **Endpoints:**
    - `POST /visitors`: Create a manual entry.
    - `GET /visitors/register`: Fetch the complete entry history for the current tenant.
    - `POST /gatepass`: Residents create authorization.
    - `GET /gatepass/:id`: Security verifies QR code.

### Mobile App (React Native)
- **Scanner:** Integrated QR scanning for gatepasses.
- **Manual Form:** `AddVisitorScreen` with dynamic category selection.
- **Register:** `VisitorRegisterScreen` with role-based filtering.
