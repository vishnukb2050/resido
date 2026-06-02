# Billing, Invoices & Community Parking — Resido

This document covers two adjacent admin/resident features:

1. **Billing & Invoices** — community maintenance bills (server-backed) and
   business / community PDF invoice generation (mobile-driven, template based).
2. **Community Parking** — slot definition, resident assignment, guest
   booking, and security verification.

Both features share two mobile screens (`AdminMaintenanceScreen`,
`ResidentPaymentsScreen`, `BusinessInvoicesScreen`, `ParkingScreen`) and rely
on the same backend services (`resident-service`, `business-service`,
`auth-service` for storage / auth).

---

## 1. Billing & Invoices

Two parallel sub-systems coexist by design — community dues are very
different from per-customer business invoices.

| Sub-system | Storage | Audience |
|------------|---------|----------|
| Community **maintenance bills** | Prisma models in `resident-service` (`MaintenanceConfig`, `MaintenanceBill`, `PaymentSplit`, `PaymentSplitShare`, `CommunityTransaction`) | Community admin (issuer) & residents (payer) |
| **Business / community PDF invoices** | `BusinessProfile.workingHours` JSON (`invoiceSettings`, `invoices[]`) | Business owners & community admins issuing one-off bills to customers / residents |

### 1.1 Community maintenance bills

#### Data model

`apps/resident-service/prisma/schema.prisma`

| Model | Key fields |
|-------|------------|
| `MaintenanceConfig` (one per tenant) | `billingCycle`, `calculationType` (`FLAT_RATE`\|`AREA_BASED`), `flatRateAmount`, `ratePerSqFt`, `dueDateDay`, `penaltyType`, `penaltyAmount` |
| `MaintenanceBill` (one per unit per month) | `tenantId`, `unitId`, `month`, `year`, `baseAmount`, `otherCharges`, `penaltyAmount`, `totalAmount`, `amountPaid`, `status` (`UNPAID`\|`PENDING_VERIFICATION`\|`PAID`\|`OVERDUE`), `dueDate`, `receiptUrl` |
| `PaymentSplit` / `PaymentSplitShare` | Ad-hoc charge spread across multiple units (e.g. lift repair). Reuses `BillStatus`. |
| `CommunityTransaction` | Ledger row (debit/credit) used for finance dashboards & reports; linked back to bill on approve. |

#### API surface

Controller: `apps/resident-service/src/modules/finance/community-finance.controller.ts`
Service:   `apps/resident-service/src/modules/finance/community-finance.service.ts`
Mounted at gateway path `/community/finance/*`.

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| `GET`  | `/community/finance/maintenance/config` | Admin UI | Get/create config |
| `POST` | `/community/finance/maintenance/config` | Admin | Upsert config |
| `POST` | `/community/finance/maintenance/generate` | Admin | Bulk-generate bills for chosen month / year |
| `GET`  | `/community/finance/maintenance/status?month&year` | Admin | Dashboard list (paid/pending/due) |
| `GET`  | `/community/finance/maintenance/my-bills` | Resident | Bills for caller's unit |
| `POST` | `/community/finance/maintenance/submit-proof/:billId` | Resident | Upload payment receipt → status `PENDING_VERIFICATION` |
| `POST` | `/community/finance/maintenance/verify/:billId` | Admin | Approve/reject → `PAID` / `UNPAID` |
| `*`    | `/community/finance/splits...` | Admin / resident | Payment-split CRUD + proof / verify |
| `*`    | `/community/finance/transactions`, `/reports` | Admin | Manual ledger + monthly summary |

#### Generation logic

`generateBills(tenantId, { month, year })`:

1. Load `MaintenanceConfig` (auto-create defaults if missing).
2. Load every `Unit` of the tenant.
3. For each unit, compute `baseAmount`:
   - `FLAT_RATE` → `config.flatRateAmount`
   - `AREA_BASED` → `config.ratePerSqFt * unit.superBuiltUpArea`
4. `createMany({ data, skipDuplicates: true })` — the `@@unique([unitId, month, year])`
   index makes re-running for the same month a safe no-op.

#### Status flow

```text
UNPAID  ── submit-proof ──▶  PENDING_VERIFICATION  ── verify(approve) ──▶ PAID
   ▲                                  │
   └────────── verify(reject) ────────┘
```

`OVERDUE` exists in the enum and is filtered for in the admin UI but is
**not yet auto-assigned** server-side. Either a daily cron or an
on-demand "mark overdue" admin action is the next step (see *Known
limitations* below).

#### Mobile UI

| Screen | Role | What it does |
|--------|------|--------------|
| `mobile/resido-app/src/screens/AdminMaintenanceScreen.tsx` | Admin | Edit config; pick month/year + tap **Generate Bills**; review the per-unit status list; verify resident receipts; manage payment splits. |
| `mobile/resido-app/src/screens/ResidentPaymentsScreen.tsx` | Resident | View "My Dues" (own unit only); upload a transfer screenshot or UPI receipt; track approval state. |
| `mobile/resido-app/src/screens/AdminFinanceScreen.tsx` | Admin | Free-form ledger + monthly income/expense report (not a bill issuer). |

Dashboard entry points:

- Admin: **Community Payments**, **Finance**, **Bills & Invoices** tiles in `AdminDashboard.tsx`.
- Resident: **Community Payments** in `DefaultDashboard.tsx` / `MemberDashboard.tsx`.

#### Use cases

1. **Monthly maintenance run** — On the 1st of each month admin opens
   *Admin Maintenance*, selects month + year, taps **Generate Bills**.
   Every unit gets a row at `UNPAID` with `dueDate = config.dueDateDay`.
2. **Resident pays** — Resident transfers money externally, opens
   *Resident Payments*, taps the bill, uploads receipt. Status moves to
   `PENDING_VERIFICATION`.
3. **Admin verifies** — Admin sees the receipt in the verify queue,
   approves (status → `PAID`, ledger transaction created) or rejects
   (status → `UNPAID`, reason recorded).
4. **One-off split charge** — Lift repair quoted at ₹50,000 across 25 flats.
   Admin creates a `PaymentSplit`; each unit gets a `PaymentSplitShare`
   row that follows the same submit-proof / verify flow.

---

### 1.2 Business / Community PDF invoices

#### Concept

There is no dedicated invoice table on the server. Each `BusinessProfile`
stores its template settings + history in `workingHours.invoiceSettings`
and `workingHours.invoices[]`. Templates and PDF rendering are done
**client-side** on the mobile app.

This same mechanism is reused for **community-issued invoices**: the
admin dashboard auto-creates a hidden "shadow" business profile with
`category: 'Community Billing'` and reuses the invoice screen.

#### Mobile UI

`mobile/resido-app/src/screens/BusinessInvoicesScreen.tsx` (3 tabs)

1. **Setup**
   - Upload logo / seal / signature (presigned upload via `storage.ts` → S3/R2 key prefix `invoices/`).
   - Business name, GST number, GST rate, date/time format.
   - Choose a template: `standard`, `modern`, `classic`.
   - Maintain a "Products / Services" catalog (name + default price).
2. **Generate**
   - Pick client name, optional GST, line items from the catalog (or ad-hoc).
   - Renders the chosen template via `generateHtmlTemplate()`.
   - `expo-print` → local PDF; `expo-sharing` → share sheet.
   - Optional cloud copy: PDF uploaded via `storageApi.uploadFile(uri, 'invoices')`.
   - Record appended to `workingHours.invoices[]` and saved through
     `businessApi.updateProfile(profileId, { workingHours })`.
3. **History** — list of past invoices; tap to re-render and re-share.

#### Templates

| ID | Visual |
|----|--------|
| `standard` | Plain, B/W, optimized for thermal print. |
| `modern` | Coloured header band + brand seal, two-column items. |
| `classic` | Bordered "retro" look with watermarked signature. |

All three are pure HTML/CSS strings generated in TypeScript — adding a
fourth template is a single function in `BusinessInvoicesScreen.tsx`.

#### Entry points

- **Business owner:** `ManageBusinessScreen` → "Bills & Invoices" tile (only when `enableBills` is on).
- **Community admin:** `AdminDashboard` → "Bills & Invoices" tile auto-resolves or creates the community shadow profile, then navigates to `BusinessInvoicesScreen`.

#### Use cases

1. **Shop owner issues a daily invoice** — Open *Bills & Invoices* →
   Generate → pick line items → Share PDF on WhatsApp.
2. **Community office issues a special charge invoice** to a resident
   (renovation deposit, hall rental). Admin uses the same screen; PDF
   is delivered manually (share sheet / print).
3. **Re-print** — open History, tap a past invoice, share again.

---

### 1.3 Permissions matrix

| Action | Resident | Comm. admin | Business owner |
|--------|:-:|:-:|:-:|
| View own maintenance bills | ✅ | — | — |
| Submit payment proof | ✅ | — | — |
| Edit maintenance config | — | ✅ | — |
| Generate maintenance bills | — | ✅ | — |
| Verify a payment | — | ✅ | — |
| Set up PDF invoice template | — | ✅ (community shadow) | ✅ |
| Generate / share PDF invoice | — | ✅ | ✅ |

Server-side enforcement notes (see *Known limitations*):

- `requireAdmin()` guards `verifyPayment`, `createSplit`, `deleteSplit`,
  `verifySplitShare` in `community-finance.service.ts`.
- `updateMaintenanceConfig`, `generateBills`, `submitPaymentProof` are
  **not yet guarded** with `requireAdmin` (mobile UI gates by role).
- `PATCH /business/profiles/:id` has no owner check — anyone with a
  profile id can rewrite its JSON. This is a general business-service
  concern that affects invoices and parking shadow profiles equally.

---

## 2. Community Parking

### 2.1 Architecture choice — "shadow business profile"

Parking is implemented **without a dedicated Prisma model**. The data
lives in a single `BusinessProfile` row per community with:

- `category: 'Community Parking'`
- `tenantId: <community-id>`
- `workingHours: { slots: ParkingSlot[], bookings: ParkingBooking[] }`

All mutations go through `PATCH /business/profiles/:id` with a full
`workingHours` payload, the same channel used by Community Billing
above.

> Why JSON-on-business-profile? It reuses the auth, tenant-scope, owner,
> storage and listing pipelines that already exist for businesses. It
> is fast to ship — and easy to migrate to dedicated tables later (the
> shape is already structured).

### 2.2 Data shape (client-side TypeScript)

`mobile/resido-app/src/screens/ParkingScreen.tsx`

```ts
interface ParkingSlot {
  id: string;                   // 'slot_<timestamp>'
  name: string;                 // e.g. "A-12"
  type: 'RESIDENT' | 'GUEST';
  assignedUnitId?: string;      // stable FK to Unit.id
  assignedUnitNumber?: string;  // display string
  assignedBlockId?: string;
  assignedBlockName?: string;
  assignedVehicle?: string;     // e.g. "KL-07-AB-1234"
}

interface ParkingBooking {
  id: string;
  slotId: string;
  slotName: string;
  memberId: string;
  residentName: string;
  unitInfo: string;
  vehicleNumber: string;
  startTime: string;            // ISO
  endTime: string;              // ISO (auto = start + 4h)
  status: 'BOOKED' | 'ACTIVE' | 'FREED';
  markedFreedAt?: string;
  autoFreed?: boolean;
}
```

### 2.3 Roles & tabs

| Role | Screen behaviour |
|------|------------------|
| **Admin** (`APARTMENT_ADMIN`, `CARETAKER`, `ADMIN_STAFF`) | 3 tabs: *Create Slots*, *Assign Resident*, *Guest Bookings*. |
| **Resident** | 2 tabs: *My Slots & Booking* (assigned slot + book guest slot), *Booking History* (own bookings). |
| **Security** (`SECURITY_STAFF`) | Single view: searchable slot list with live AVAILABLE / OCCUPIED + active guest bookings with **Mark Freed**. |

If the community has no parking profile and the caller is **not** an
admin, the screen shows *"Parking System Offline — please ask your
admin to enable Community Parking."*. The first admin to open the
screen auto-initialises the shadow profile.

### 2.4 Slot lifecycle

```text
              create                  assign / book                  release
   (admin) ─────────▶ AVAILABLE ────────────────────▶ OCCUPIED ──────────────────▶ AVAILABLE
                                                          │
                                         security taps "Mark Freed"
                                              or end-time elapses
```

For guest bookings the screen runs an **auto-free** pass on every
load: any booking with `endTime < now` is rewritten to `FREED` and
saved back via `updateProfile`. The 4-hour window is enforced
client-side; overlapping bookings are blocked client-side too.

### 2.5 Use cases

1. **Onboarding parking for a community**
   - Admin opens *Community Parking*.
   - First load auto-creates the shadow profile.
   - Admin uses *Create Slots* to add `RESIDENT` slots (e.g. one per
     unit) and a handful of `GUEST` slots.
2. **Assigning a resident slot**
   - Admin chooses *Assign Resident* tab → picks slot → picks block →
     picks unit (loaded via `/community/units?blockId=`) → enters vehicle
     number → save.
   - The slot now shows resident name, unit and vehicle.
3. **Resident sees their slot**
   - Resident opens *Community Parking*.
   - The screen looks up the caller's `Member` row → walks
     `family.unit.id` and matches it to `slot.assignedUnitId`.
   - Slot + vehicle is displayed under "My Assigned Parking".
4. **Resident books a guest slot**
   - Resident picks an `AVAILABLE` guest slot → date/time → vehicle no.
     → confirm.
   - Booking added with `status: 'BOOKED'`, `endTime = start + 4h`.
5. **Security verifies an incoming guest**
   - Security opens *Community Parking* → searches by slot or vehicle.
   - Finds matching active booking → confirms vehicle number → either
     lets the guest in, or taps **Mark Freed** when they leave.
6. **Slot maintenance / removal**
   - Admin deletes a slot from *Create Slots* tab; any active booking
     on it is auto-marked `FREED`.

### 2.6 Backend wiring used

| Endpoint | Used for |
|----------|----------|
| `GET /business/profiles?tenantId=&category=Community Parking` | Load the shadow profile |
| `POST /business/profiles` | Auto-create shadow profile on first admin visit |
| `PATCH /business/profiles/:id` | All slot / booking writes |
| `GET /community/blocks` | Block dropdown |
| `GET /community/units?blockId=` | Unit dropdown |
| `GET /community/members` | Resident lookup (now returns `userId`, `familyId`, `family.unit`, `family.unit.block`) |

---

## 3. Recent bug fixes shipped with this README

These were uncovered while auditing the feature and are now patched.

### 3.1 Residents could never see their assigned parking slot

**Symptom:** *"My Assigned Parking"* was always empty even after admin
assignment.

**Root cause:** `Member` has no `unitNumber` field; the unit link goes
through `family.unit`. `getMembers()` was returning only
`{ id, name, phone, role }`, so the client had no way to map the caller
to a unit.

**Fix:**

- `apps/resident-service/src/modules/community/community.service.ts` —
  `getMembers()` now returns `userId`, `familyId`,
  `family.unit.{id, number, floor, blockId}` and
  `family.unit.block.{id, name}`.
- `mobile/resido-app/src/screens/ParkingScreen.tsx` — resident slot
  matcher now uses `myMember.family.unit.id` (stable FK) with a
  fall-back to display unit number for legacy slots.

### 3.2 Parking shadow profile invisible on reload

**Symptom:** Admins saw "Parking System Offline" intermittently. Cause
was the global `listProfiles` visibility rule that hides profiles with
`serviceAreaType != PAN_INDIA` whenever no geo context is sent.

**Fix:**

- `apps/business-service/src/modules/business/business.service.ts` —
  `listProfiles` now skips the PAN_INDIA visibility gate when a
  `tenantId` is supplied (tenant scope is itself a strong filter).
- `ParkingScreen.tsx` — when creating the shadow profile, we now also
  set `serviceAreaType: 'PAN_INDIA'` so older clients still discover it.

---

## 4. Known limitations / next steps

The features are functional; these are not blockers, but worth tracking
before the next hardening pass.

### Billing

| Area | Gap | Suggested next step |
|------|-----|---------------------|
| Overdue handling | `OVERDUE` enum value exists but no code sets it | Nightly cron in resident-service that flips `UNPAID` → `OVERDUE` when `dueDate < now` |
| Penalties | `penaltyType`/`penaltyAmount` saved but ignored on generate | Apply in `generateBills` after marking overdue |
| Billing cycle | `QUARTERLY` / `ANNUALLY` not implemented (every run is one month) | Branch in `generateBills` based on `config.billingCycle` |
| Security | `generateBills`, `updateMaintenanceConfig`, `submitPaymentProof` not guarded by `requireAdmin` on server | Add `requireAdmin()` calls (already imported) |
| Notifications | No email / push when a bill is generated or approved | Hook into `notification-service` |
| PDF invoices | Server has no concept of invoices — they live in `BusinessProfile.workingHours` JSON | If volume grows, promote to dedicated `Invoice` + `InvoiceTemplate` tables |
| `PATCH /business/profiles/:id` | No owner check | Require `x-user-id` + match owner or community admin |

### Parking

| Area | Gap | Suggested next step |
|------|-----|---------------------|
| First-class model | No Prisma `ParkingSlot` / `ParkingAllocation` | Promote when usage justifies (current JSON shape is migration-ready) |
| Server validation | Duplicate names / overlapping bookings only checked on device | Move to service-layer guard |
| Race conditions | Two residents booking concurrently can clobber `bookings[]` | Either lock on `BusinessProfile.id` in service or shard bookings into a real table |
| Vehicle registry | One free-text vehicle per slot; no multi-vehicle | Add `Vehicle` table linked to `Member` |
| Maintenance / reserved status | Not modelled | Add `status` enum on slot |
| Map / grid visualization | Cards only | Optional grid view with floor + block grouping |
| Visitor integration | Gatepass system is separate; vehicle nos. are not cross-checked | Optional join: when security scans a gatepass with a vehicle no., highlight matching active guest parking |

---

## 5. Quick reference

### Files

**Backend**

- `apps/resident-service/src/modules/finance/community-finance.{service,controller}.ts`
- `apps/resident-service/src/modules/community/community.service.ts` (`getMembers`)
- `apps/resident-service/prisma/schema.prisma` (`MaintenanceConfig`, `MaintenanceBill`, `PaymentSplit*`, `CommunityTransaction`)
- `apps/business-service/src/modules/business/business.{service,controller}.ts`
- `apps/business-service/prisma/schema.prisma` (`BusinessProfile`)
- `apps/auth-service/src/modules/storage/storage.service.ts` (presigned URLs for receipts / invoice PDFs)

**Mobile**

- `mobile/resido-app/src/screens/AdminMaintenanceScreen.tsx`
- `mobile/resido-app/src/screens/ResidentPaymentsScreen.tsx`
- `mobile/resido-app/src/screens/AdminFinanceScreen.tsx`
- `mobile/resido-app/src/screens/BusinessInvoicesScreen.tsx`
- `mobile/resido-app/src/screens/ParkingScreen.tsx`
- `mobile/resido-app/src/services/api.ts` (`communityFinanceApi`, `communitySplitsApi`, `businessApi`, `communityApi`)
- `mobile/resido-app/src/services/storage.ts`

### Smoke test checklist

After deploying the fixes above, walk through:

1. Admin opens *Admin Maintenance*, sets `FLAT_RATE = 1500`,
   `dueDateDay = 10`, **Generate Bills** for current month. → One bill
   per unit at `UNPAID`.
2. Resident opens *Resident Payments*, uploads a screenshot for own
   bill. → `PENDING_VERIFICATION`. Admin approves → `PAID` and ledger
   transaction created.
3. Admin opens *Bills & Invoices* → upload logo → set GST → add 1
   product → Generate → Share PDF. Entry appears in *History*.
4. Admin opens *Community Parking* → create one `RESIDENT` and one
   `GUEST` slot → assign the resident slot to a real unit. Switch to a
   resident account in that unit → *Community Parking* should show the
   slot under "My Assigned Parking".
5. Resident books the `GUEST` slot for the next 2 hours → switch to a
   security account → slot is `OCCUPIED`, **Mark Freed** flips it back.
