# Resido Member Management System

## Overview
A centralized system for Admins and Admin Staff to manage all people within a community, categorized into Staff, Residents, and general Members.

---

## 1. Management Hub
- **Location:** Admin Dashboard -> Manage Icon (People Circle)
- **Categories:**
    - **Staff:** Manage community workforce.
    - **Residents:** Manage unit-linked residents.
    - **Members:** Manage general community contacts.

---

## 2. Manage Staff
- **Listing:** View all current staff filtered by operational roles.
- **Add Staff Fields:**
    - **Name & Mobile:** Primary contact info.
    - **Category (Dropdown):** Security, Maintenance, Cleaning, Caretaker, Other.
    - **Auto-Role Logic:** Based on category, the system assigns roles like `SECURITY_STAFF` or `CLEANING_STAFF`.
    - **Job Role:** Specific designation (e.g., "Night Shift Lead").
    - **Description:** Additional notes on duties.

---

## 3. Manage Residents
- **Listing:** View residents linked to their respective apartment units.
- **Add Resident Fields:**
    - **Address Autocomplete:** Type a unit number (e.g., "101") to see a dropdown of matching units.
    - **Name & Mobile:** Occupant details.
- **Logic:** Residents are tied to the physical infrastructure (Units/Blocks) of the community.

---

## 4. Manage Members
- **Listing:** View general community members.
- **Add Member Fields:**
    - Name, Mobile Number.
    - Primary Address (Text).
    - Category & Description.
    - Custom Role assignment.

---

## 5. Technical Architecture
### Backend (Resident Service)
- **Service:** `MembersService`
- **New Endpoints:**
    - `GET /members?role=...`: Fetch members by role or role group.
    - `GET /members/units`: Fetch community units for address selection.
    - `POST /members`: Create new community members/staff/residents.

### Mobile App (React Native)
- **Screens:**
    - `ManageMembersHubScreen`: The 3-category landing page.
    - `MemberListScreen`: Generic list with role filtering.
    - `AddStaffScreen`, `AddResidentScreen`, `AddMemberScreen`: Specialized forms.
- **Components:** Autocomplete search for units in the Resident form.
