# Profile Settings & Linked Business Profile

Spec, data model and end-to-end behaviour for the user profile system —
profile visibility, phone visibility, following, and the **Link Business
Profile** feature that cross-links a personal profile with the user's
business profile(s).

> **TL;DR:** Business profiles are always public. Personal profiles
> respect `profileVisibility`. The new `linkBusinessProfile` toggle
> bridges the two so search results and detail screens cross-reference
> each other — restricted personal profiles still appear as a locked
> preview with a follow-request CTA.

---

## 1. Concepts

### 1.1 Personal profile

Lives in the **user database** (`apps/auth-service/prisma/user/schema.prisma`,
model `User`). Holds identity, contact, social links and the following
visibility-related fields:

| Field                 | Type                | Purpose                                                                 |
|-----------------------|---------------------|-------------------------------------------------------------------------|
| `profileVisibility`   | `ProfileVisibility` | Who can see the full personal profile (`GLOBAL` / `CONTACTS` / `COMMUNITY` / `FOLLOWERS`). |
| `phoneVisibility`     | `VisibilityType`    | Per-field visibility for the phone number (`PUBLIC` / `COMMUNITY` / `FOLLOWERS`). |
| `linkBusinessProfile` | `Boolean`           | When `true`, cross-links the user with their business profile(s).        |

### 1.2 Business profile

Lives in the **core database** (`apps/business-service/prisma/schema.prisma`,
model `BusinessProfile`). It's a public artifact — any signed-in user can
view a business profile detail page. The `userId` column ties each
business to its owner (the personal profile).

### 1.3 Linked relationship

`User.linkBusinessProfile = true` is the **single source of truth** for
the cross-link. With it on, the backend exposes:

- The user's businesses inside `GET /profile/users/:id`'s response
  (`linkedBusinessProfiles[]`).
- The owner's lightweight identity inside the search-result hydration
  endpoint `GET /profile/users/identities/batch?ids=…`, which is filtered
  to opted-in users only.

With it off, neither endpoint returns the linkage — the two profiles
look unrelated to the rest of the app.

---

## 2. Visibility rules

### 2.1 Profile visibility (`profileVisibility`)

Gate applied by `getPublicProfile(targetId, viewerId)` in
`apps/auth-service/src/modules/profile/profile.service.ts`.

| Setting     | Who sees the full profile                                              | Follow flow                  |
|-------------|------------------------------------------------------------------------|------------------------------|
| `GLOBAL`    | Anyone signed in.                                                      | Instant follow (no request).  |
| `CONTACTS`  | Mutual follow only (viewer follows target **and** target follows back). | Follow **request**.           |
| `COMMUNITY` | Anyone who shares a workspace (`tenantId`) with the target.            | Follow **request**.           |
| `FOLLOWERS` | Only users the target has accepted.                                     | Follow **request**.           |

When the viewer is **not allowed**, the response sets `isRestricted: true`
and includes only the bare-minimum identity:

```ts
{
  id, name, profileName, profilePhoto,
  profileVisibility, linkBusinessProfile,
  followersCount, followingCount,
  followStatus,
  isRestricted: true,
  phoneVisibility,
  phone?,                      // included only if phoneVisibility separately permits
  linkedBusinessProfiles[]     // still returned — businesses are public artifacts
}
```

When the viewer **is allowed**, the full record is returned (bio,
email, age, description, location, instagram/linkedin/website, etc.).

### 2.2 Phone visibility (`phoneVisibility`)

Independent gate on the phone number, layered on top of profile
visibility. A user can have a restricted profile but a `PUBLIC` phone,
or an open profile with a `FOLLOWERS`-only phone.

| Setting     | Who sees the phone number                                |
|-------------|----------------------------------------------------------|
| `PUBLIC`    | Anyone who can open the profile.                          |
| `COMMUNITY` | Members of any community the user belongs to.             |
| `FOLLOWERS` | Only accepted followers.                                   |

The phone is read-only in the Edit screen — it is the OTP-verified
account identifier and cannot be changed from the client.

### 2.3 Linked business visibility

Business profiles **bypass `profileVisibility` entirely** — they are
public regardless of how the owner has set their personal profile.

The behaviour matrix below summarises what each viewer sees once
`linkBusinessProfile = true`:

| Owner visibility | Viewer relationship  | Business detail page                                 | User profile detail page                                                                |
|------------------|----------------------|-------------------------------------------------------|------------------------------------------------------------------------------------------|
| `GLOBAL`         | anyone               | Full business + "Owned by · Tap to view" owner card    | Full bio, contact, threads/flares, business tab                                          |
| `CONTACTS`       | mutual follow        | Full business + owner card                            | Full bio, contact, threads/flares, business tab                                          |
| `CONTACTS`       | not mutual           | Full business + owner card with **Private** chip + hint | Locked preview, "Their business is still public" note, **Send follow request** CTA       |
| `COMMUNITY`      | shares a workspace   | Full business + owner card                            | Full bio, contact, threads/flares, business tab                                          |
| `COMMUNITY`      | different workspace  | Full business + owner card with **Private** chip + hint | Locked preview + follow request CTA                                                      |
| `FOLLOWERS`      | accepted follower    | Full business + owner card                            | Full bio, contact, threads/flares, business tab                                          |
| `FOLLOWERS`      | not a follower       | Full business + owner card with **Private** chip + hint | Locked preview + follow request CTA                                                      |

When `linkBusinessProfile = false`:

- The business detail page renders without an "Owned by" card.
- Service search result cards omit the owner pill.
- The user profile page omits the Business tab / linked-business section.

---

## 3. Follow system

Powering the visibility rules above.

| Endpoint                                       | Purpose                                                                 |
|------------------------------------------------|-------------------------------------------------------------------------|
| `POST /profile/follow/:id`                     | Follow (if target is `GLOBAL`) or send a `FollowRequest`.                |
| `DELETE /profile/follow/:id`                   | Unfollow OR cancel a pending request.                                    |
| `GET /profile/follow/status/:id`               | `SELF` / `FOLLOWING` / `REQUESTED` / `NOT_FOLLOWING`.                    |
| `GET /profile/follow/counts/:id`               | `{ followersCount, followingCount }`.                                    |
| `GET /profile/follow/followers/:id`            | List of accepted followers.                                              |
| `GET /profile/follow/following/:id`            | List of users this person follows.                                       |
| `GET /profile/follow-requests`                 | Incoming pending follow requests for the signed-in user.                 |
| `POST /profile/follow-requests/:rid/accept`    | Accept a pending request → creates a `Follow` row.                       |
| `POST /profile/follow-requests/:rid/reject`    | Reject a pending request → deletes the row.                              |

A `Follow` row represents an accepted follower relationship; a
`FollowRequest` row represents a pending one. Auto-synced contacts
short-circuit to a direct `Follow` so mutual-follow ⇒ "contacts".

---

## 4. API surface

### 4.1 Personal profile

| Method | Path                                            | Notes                                                                                              |
|--------|-------------------------------------------------|----------------------------------------------------------------------------------------------------|
| GET    | `/profile/user`                                 | Authenticated user's own full profile.                                                              |
| PUT    | `/profile/user`                                 | Update. Accepts `profileVisibility`, `phoneVisibility`, `linkBusinessProfile`. Ignores `phone`.     |
| GET    | `/profile/users/:id`                            | Public profile gated by `profileVisibility`. Returns `linkedBusinessProfiles[]` when opted in.      |
| GET    | `/profile/users/search-public?query=…&limit=…`  | Identity-only search. Returns `linkBusinessProfile` + `businessProfileCount`.                       |
| GET    | `/profile/users/identities/batch?ids=a,b,c`     | Returns a `{ userId: identity }` map filtered to users with `linkBusinessProfile = true`.           |
| GET    | `/profile/users/visibilities/batch?ids=…`       | Internal — used by flaredthread-service to gate feeds by author visibility.                         |

### 4.2 Author timeline (used by `UserProfileScreen`)

The flares/threads service supports an `AUTHOR` feed type that returns a
specific user's posts with both per-post and author-profile visibility
still enforced server-side.

| Method | Path                                                | Notes                                                                 |
|--------|-----------------------------------------------------|-----------------------------------------------------------------------|
| GET    | `/threads?feedType=AUTHOR&authorId=:userId`         | Threads by `authorId`, filtered to those the viewer is allowed to see.|
| GET    | `/flares?feedType=AUTHOR&authorId=:userId`          | Flares by `authorId`, same gating.                                    |

### 4.3 Business

Standard business endpoints (`/business/profiles`, `/business/profiles/:id`,
…) are unchanged — they always return full business data. The mobile app
calls `/profile/users/identities/batch` after a search to enrich each card
with the owner identity (when opted in).

---

## 5. Mobile UI

### 5.1 Edit Profile (`EditProfileScreen.tsx`)

The Profile Preferences section contains:

1. **Phone Visibility** — Public · My communities · Followers only.
2. **Profile Visibility** — Global · Contacts only · My communities ·
   Followers only.
3. **Link Business Profile** — amber briefcase tile with a checkmark.
   Subtitle: *"Connect your business with this profile so people who
   find one can see the other."* A note underneath reminds the user
   that visibility rules still apply.

Phone number itself is read-only (OTP-verified badge).

### 5.2 Public profile (`UserProfileScreen.tsx`)

- **Hero card:** avatar (with lock badge overlay when restricted),
  name, `@handle`, visibility chip, "Linked business" chip when
  applicable, action button (Follow / Request to follow / Requested ·
  Cancel / Following), metrics row (Followers · Following · Business
  count when there are linked businesses).
- **Restricted preview** (when `isRestricted: true`):
  - Lock card with a context-appropriate message.
  - "Their business profile is still public — you can open it below"
    hint when linked businesses exist.
  - **Send follow request** button.
  - Phone (only if `phoneVisibility` separately allows).
  - **Linked businesses** section listing tappable `BusinessCard`s.
- **Allowed view:** About / Contact (with phone gated independently) /
  Links / **Posts** tab (horizontal autoplaying-muted flares + threads
  list) / **Business** tab (when linked).

### 5.3 Business detail (`BusinessDetailScreen.tsx`)

When `getPublicIdentitiesBatch` returns an identity for the business
owner, an "Owned by · Tap to view" card appears under the business
title. If the owner profile is restricted, a "Private" chip + a hint
*"Send a follow request to see their full profile"* are added. Tapping
the card always opens `UserProfileScreen`, which then runs the gate.

### 5.4 Service search (`ServiceSearchScreen.tsx`)

After business profiles load, the screen issues one batch identities
call and renders a small "by @owner" pill on each card (with a lock
icon when the owner's profile is restricted). Tapping the pill opens
the public user profile.

### 5.5 MySpace search (`DefaultDashboard.tsx`)

The unified search dropdown now suggests **service categories**,
**business profiles** and **user profiles** in one list. User
suggestions carry:

- Avatar + name + `@handle`.
- **Private** chip when `profileVisibility !== 'GLOBAL'`.
- **Business** chip (with count when > 1) when `linkBusinessProfile = true`.

Picking a user routes to `/user-profile`, picking a business routes to
`/business-detail`, picking a category routes to `/service-search`.

---

## 6. Data flow walkthroughs

### 6.1 Restricted owner, anonymous viewer opens the business

1. Mobile calls `GET /business/profiles/:id` → returns the business
   (no visibility gating, always public).
2. Mobile calls `GET /profile/users/identities/batch?ids=<ownerId>`.
   - If owner has `linkBusinessProfile = true`, response contains the
     owner identity → "Owned by · Tap to view" card renders with a
     **Private** chip.
   - If owner has `linkBusinessProfile = false`, response is empty →
     no owner card.
3. Viewer taps the card → router pushes `/user-profile?id=<ownerId>`.
4. `UserProfileScreen` calls `GET /profile/users/:id`.
   - Server-side `getPublicProfile` sees `profileVisibility=FOLLOWERS`
     and the viewer is not a follower → `isRestricted: true`.
   - `linkedBusinessProfiles` is still included.
5. Locked preview renders with a **Send follow request** button.
   Tapping it creates a `FollowRequest` row; once the owner accepts via
   `FollowRequestsScreen`, the next visit shows the full profile.

### 6.2 Owner with `GLOBAL` profile and 2 businesses

1. Search dropdown surfaces the owner with a **Business (2)** chip.
2. Tap → `UserProfileScreen` renders the full hero, About, Contact,
   Posts tab and a **Business (2)** tab listing both businesses.
3. Tap a business card → `BusinessDetailScreen` opens fully with an
   "Owned by · Tap to view" card pointing back to the owner.

---

## 7. Database migration

After deploying, add the `linkBusinessProfile` column to the user table:

```bash
cd apps/auth-service
npx prisma migrate dev --schema=prisma/user/schema.prisma --name link_business_profile
```

The column defaults to `false`, so existing users are unaffected until
they enable the toggle in Edit Profile.

---

## 8. File index

Files touched by this feature (use these as the entry points when
hacking on it):

**Schemas / migrations**

- `apps/auth-service/prisma/user/schema.prisma` — `linkBusinessProfile`
  column, `ProfileVisibility` & `VisibilityType` enums, `FollowRequest`
  & `Follow` models.

**Auth service**

- `apps/auth-service/src/modules/profile/profile.service.ts` —
  `updateProfile`, `getPublicProfile`, `searchUsersPublic`,
  `getPublicIdentitiesBatch`, follow lifecycle (`follow`, `unfollow`,
  `acceptFollowRequest`, `rejectFollowRequest`, `getFollowStatus`,
  `getFollowCounts`, …).
- `apps/auth-service/src/modules/profile/profile.controller.ts` —
  HTTP routes listed in section 4.

**Flares / threads**

- `apps/flaredthread-service/src/modules/blogs/blogs.controller.ts` —
  `authorId` query parameter on `GET /threads` and `/flares`.
- `apps/flaredthread-service/src/modules/blogs/blogs.service.ts` —
  `AUTHOR` feed type plus the existing 2nd-pass visibility filter.

**Mobile**

- `mobile/resido-app/src/services/api.ts` — `getPublicIdentitiesBatch`,
  `getAuthorThreads`, `getAuthorFlares`, follow APIs.
- `mobile/resido-app/src/screens/EditProfileScreen.tsx` — link toggle UI.
- `mobile/resido-app/src/screens/UserProfileScreen.tsx` — public profile
  page, tabs, locked preview, business cards, flare/thread rendering.
- `mobile/resido-app/src/screens/ServiceSearchScreen.tsx` — owner chip
  hydration on result cards.
- `mobile/resido-app/src/screens/BusinessDetailScreen.tsx` — "Owned by"
  card with private-chip variant.
- `mobile/resido-app/src/components/dashboards/DefaultDashboard.tsx` —
  MySpace search with category / business / user suggestions.
- `mobile/resido-app/src/screens/FollowListScreen.tsx`,
  `FollowRequestsScreen.tsx`, `ProfileScreen.tsx` — follow management
  UI.
- `mobile/resido-app/src/store/authStore.ts` — extended user typing to
  include `profileVisibility`, `phoneVisibility`, `linkBusinessProfile`.
