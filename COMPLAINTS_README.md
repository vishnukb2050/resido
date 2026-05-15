# Resido Requests & Complaints System

## Overview
A comprehensive ticketing and maintenance system designed for residential communities. It bridges the gap between residents raising issues, admins managing them, and staff resolving them.

---

## 1. Resident Experience
### Feature: Raise Request & Complaint
Residents can report issues within their unit or common areas.
- **Dashboard Icon:** "Requests" (renamed from Alerts/Complaints).
- **Functionality:**
    - **Category Selection:** Dropdown menu (Plumbing, Electrical, Handyman, Lift, Kitchen, Water, Electricity, Common Space, Amenities, Others).
    - **Priority Levels:**
        - **Urgent:** Critical issues requiring immediate attention.
        - **High:** Important but not life-threatening.
        - **Medium:** Standard maintenance requests.
    - **Description:** Detailed text field for the issue.
- **My Requests:** A real-time list of all raised tickets with live status updates.

---

## 2. Admin & Caretaker Experience
### Feature: Request Management
Admins oversee the entire maintenance queue of the community.
- **Dashboard Icon:** "Requests" in Admin Dashboard.
- **Functionality:**
    - **View All:** Access every ticket raised by any resident.
    - **Assign Staff:** Select from a list of community staff (Cleaning, Security, Maintenance) to assign the task.
    - **Status Override:** Manually move tickets through the lifecycle (Open -> In Progress -> Resolved -> Closed).
    - **Audit Trail:** See resident contact details for follow-ups.

---

## 3. Staff Experience
### Feature: My Tasks
Field staff (Maintenance, Cleaning, etc.) have a streamlined view of their workload.
- **Dashboard Icon:** "My Tasks" on Staff Dashboards.
- **Functionality:**
    - **Filtered View:** Shows only the tickets specifically assigned to that staff member.
    - **Update Progress:** One-tap status updates to inform the admin and resident of work progress.

---

## 4. Technical Implementation
### Backend (Resident Service)
- **Controller:** `CommunityController`
- **Endpoints:**
    - `POST /community/complaints`: Resident creates a request.
    - `GET /community/complaints?memberId=...`: Resident views their history.
    - `GET /community/complaints`: Admin views all community requests.
    - `GET /community/complaints?staffId=...`: Staff views their assigned tasks.
    - `POST /community/complaints/:id/assign`: Admin assigns a staff member.
    - `POST /community/complaints/:id/status`: Update the status of a request.

### Mobile App (React Native)
- **Navigation Paths:**
    - `/complaints`: The main listing for residents.
    - `/create-complaint`: The submission form.
    - `/admin-complaints`: The management view for Admins and Staff.
- **Icons:** Uses `Ionicons` (construct, clipboard, flag) to maintain a premium maintenance aesthetic.

---

## 5. Complaint Lifecycle
1. **Raised (OPEN):** Resident submits the form.
2. **Assigned (IN_PROGRESS):** Admin assigns a staff member. The status automatically shifts.
3. **Work (IN_PROGRESS):** Staff updates progress.
4. **Completion (RESOLVED):** Staff or Admin marks the issue as resolved.
5. **Final (CLOSED):** Admin closes the ticket after verification.
