# Data Model — FLOLIA

## Overview

PostgreSQL (Supabase) with Row Level Security (RLS) enabled on all tables.
Staff authentication uses Supabase Auth; member access is public-insert-only with RLS.

---

## Entity Relationship Overview

```
stores
  └── members          (store_id)
  └── staff            (assigned_store_ids[])
  └── class_schedules  (store_id)
  └── bookings         (store_id)
  └── attendance_logs  (store_id)
  └── payments         (store_id)

members
  ├── member_plans     (member_id) ─── membership_plans (plan_id)
  ├── bookings         (member_id) ─── class_schedules (class_schedule_id)
  │                                         └── classes (class_id)
  ├── attendance_logs  (member_id)
  └── payments         (member_id)

staff
  ├── roles            (role_id)   — permissions JSONB
  ├── audit_logs       (staff_id)
  └── tablet_sessions  (staff_id)
```

---

## Core Tables

### `members`
Member profiles, contact info, subscription state, and external integrations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `member_number` | INTEGER | Auto-incremented sequential number |
| `last_name`, `first_name` | TEXT | |
| `last_name_kana`, `first_name_kana` | TEXT | |
| `email` | VARCHAR UNIQUE | Login ID |
| `phone` | VARCHAR | |
| `birth_date` | DATE | Age check for parental consent |
| `status` | VARCHAR | `active` / `trial` / `paused` / `canceled` / `pending` |
| `membership_type` | VARCHAR | `trial` / `monthly` / `ticket` / `visitor` |
| `store_id` | UUID FK → stores | |
| `joined_at` | DATE | |
| `paused_from`, `paused_until` | DATE | Pause period |
| `stripe_customer_id` | TEXT | |
| `stripe_subscription_id` | TEXT | |
| `line_user_id` | TEXT | LINE Messaging API integration |
| `agreement_flags` | JSONB | `{terms, privacy, disclaimer}` |

**RLS:** Staff can manage all; public can insert with `status = 'pending'`.

---

### `membership_plans`
Plan catalog: price, billing cycle, trial limits.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | Plan display name |
| `price` | INTEGER | Monthly fee (JPY) |
| `billing_cycle` | TEXT | `monthly` / `annual` |
| `stripe_price_id` | TEXT | Stripe Price ID |
| `is_active` | BOOLEAN | |

---

### `member_plans`
Contract history between a member and a plan.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `member_id` | UUID FK → members | |
| `plan_id` | UUID FK → membership_plans | |
| `stripe_subscription_id` | TEXT | |
| `status` | TEXT | `active` / `paused` / `canceled` |
| `started_at` | DATE | |
| `ended_at` | DATE | |

---

### `stores`
Studio locations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | |
| `address` | TEXT | |
| `slug` | TEXT UNIQUE | URL path segment |
| `capacity` | INTEGER | Max concurrent attendees |
| `is_active` | BOOLEAN | |

---

### `classes`
Class types (kickboxing, stretch, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | |
| `description` | TEXT | |
| `duration_minutes` | INTEGER | |
| `instructor_id` | UUID FK → instructors | |
| `store_id` | UUID FK → stores | |

---

### `class_schedules`
Weekly recurring slots for each class.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `class_id` | UUID FK → classes | |
| `store_id` | UUID FK → stores | |
| `day_of_week` | INTEGER | 0 = Sunday |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `max_capacity` | INTEGER | Slot-level capacity override |
| `is_active` | BOOLEAN | |

---

### `bookings`
Class reservations for members and guests.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `member_id` | UUID FK → members (nullable) | NULL for guest bookings |
| `class_schedule_id` | UUID FK → class_schedules | |
| `store_id` | UUID FK → stores | |
| `booking_date` | DATE | |
| `guest_name`, `guest_email`, `guest_phone` | TEXT | For pre-registration trial bookings |
| `status` | TEXT | `reserved` / `confirmed` / `canceled_by_member` / `canceled_by_admin` / `no_show` / `completed` |
| `canceled_at` | TIMESTAMPTZ | |
| `cancel_reason` | TEXT | |

**RLS:** Staff can manage all; public can insert with `status = 'reserved'`.

---

### `payments`
Payment records linked to Stripe events.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `member_id` | UUID FK → members | |
| `store_id` | UUID FK → stores | |
| `amount` | INTEGER | JPY |
| `status` | TEXT | `succeeded` / `failed` / `refunded` |
| `payment_type` | TEXT | `initial` / `subscription` / `one_time` |
| `stripe_payment_intent_id` | TEXT | |
| `stripe_charge_id` | TEXT | |
| `paid_at` | TIMESTAMPTZ | |

---

### `attendance_logs`
Check-in / check-out records from the tablet QR scanner.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `member_id` | UUID FK → members | |
| `store_id` | UUID FK → stores | |
| `checked_in_at` | TIMESTAMPTZ | |
| `checked_out_at` | TIMESTAMPTZ | Nullable until checkout |
| `duration_minutes` | INTEGER | Computed on checkout |

---

### `staff`
Staff accounts linked to Supabase Auth users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `auth_user_id` | UUID | Supabase Auth UID |
| `name` | TEXT | |
| `email` | TEXT | |
| `role_id` | UUID FK → roles | |
| `assigned_store_ids` | UUID[] | Empty = all stores |
| `is_active` | BOOLEAN | |

---

### `roles`
Permission definitions for staff roles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | `admin` / `store_manager` / `instructor` / `receptionist` |
| `permissions` | JSONB | Array of `{resource, actions[]}` objects |

Example `permissions`:
```json
[
  { "resource": "members", "actions": ["read", "update"] },
  { "resource": "bookings", "actions": ["read", "create", "cancel"] }
]
```

---

### `tablet_sessions`
Short-lived sessions for tablet devices (check-in kiosk + staff terminal).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `token` | TEXT UNIQUE | Random token (validated via `X-Tablet-Token` header) |
| `staff_id` | UUID FK → staff | |
| `store_id` | UUID FK → stores | |
| `expires_at` | TIMESTAMPTZ | |
| `is_active` | BOOLEAN | |

---

### `audit_logs`
Immutable operation history for compliance and debugging.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `staff_id` | UUID FK → staff | |
| `action` | TEXT | e.g. `member.update`, `booking.cancel` |
| `target_type` | TEXT | Resource type |
| `target_id` | TEXT | Resource ID |
| `diff` | JSONB | Before/after snapshot |
| `created_at` | TIMESTAMPTZ | |

---

## Access Control Pattern

Middleware (`frontend/middleware.js`) fetches staff record + permissions on every authenticated API request and injects them as headers:

```
x-staff-id
x-staff-role-id
x-staff-role-name
x-staff-permissions  (JSON array)
x-user-id
```

API route handlers read these headers to enforce resource-level permissions without additional DB round-trips.
