# Resido Gatepass System Documentation

## Overview
The Resido Gatepass System provides a seamless, secure, and touchless visitor management experience. It allows residents to pre-authorize visitors and enables security guards to verify entries instantly using QR code technology.

---

## 1. Resident / Member Experience
### Feature: Create Gatepass
Residents can generate a digital entry pass for their visitors.
- **Location:** Member Dashboard -> Gatepass Icon
- **Input Fields:**
    - Visitor Name
    - Number of Persons
    - Purpose of Visit (Guest, Delivery, Service, etc.)
    - Vehicle Number (Optional)
    - Expected Date & Time
- **Process:**
    1. Resident fills out the form.
    2. System saves the record and generates a unique **Gatepass ID**.
    3. App automatically renders a **QR Code** based on this ID.
    4. Resident can use the **"Send to Visitor"** button to share the pass details and QR code via WhatsApp/SMS.

### Feature: My Gatepasses
- View a list of all active, pending, and approved gatepasses.
- Real-time status tracking (Pending -> Approved).

---

## 2. Security Guard Experience
### Feature: Gatepass Scanner
Security guards use their mobile device to verify visitors.
- **Location:** Security Dashboard -> Scanner Icon
- **Process:**
    1. Guard opens the scanner and scans the visitor's QR code.
    2. System fetches the record and displays:
        - Visitor Name & Vehicle Number
        - Inviting Resident's Name & Unit Number
        - Purpose of Visit
    3. Guard clicks **"Approve & Enter"**.
    4. System updates the Gatepass status and **automatically creates a Visitor Register entry**.

---

## 3. Admin / Caretaker Experience
### Feature: Visitor Register
Comprehensive logs of all entries into the community.
- **Location:** Admin / Caretaker Dashboard -> Visitor Reg Icon
- **Data Displayed:**
    - Visitor Name & Unit Visited
    - Exact In-Time and Date
    - Vehicle Details
    - Verification Method (e.g., "Gatepass Entry" label)
- **Use Case:** Audit trails, incident investigation, and daily traffic monitoring.

---

## 4. Technical Architecture
### Backend (Visitor Service)
- **Database:** Prisma (PostgreSQL per-tenant)
- **Models:**
    - `Gatepass`: Stores pre-authorized visit data.
    - `VisitorEntry`: The permanent record of an actual entry.
- **Endpoints:**
    - `POST /gatepass`: Create a new pass.
    - `GET /gatepass/:id`: Retrieve details for scanning.
    - `PATCH /gatepass/:id/approve`: Finalize entry and sync to register.
    - `GET /visitors/register`: View the entry logs.

### Mobile App (React Native / Expo)
- **QR Generation:** `react-native-qrcode-svg`
- **QR Scanning:** `expo-barcode-scanner`
- **Navigation:** Expo Router (`/gatepass`, `/create-gatepass`, `/gatepass-scanner`, `/visitor-register`)

---

## 5. Security Features
- **Tenant Isolation:** All data is partitioned by `x-tenant-id` header.
- **Authorization:** Only authorized security/admin roles can approve gatepasses.
- **QR Integrity:** Gatepass IDs are unique and generated via UUID/CUID to prevent tampering.
