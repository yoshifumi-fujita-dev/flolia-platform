# FLOLIA — Kickboxing Studio Management System

A full-stack studio management platform built for a kickboxing studio chain.
Handles member registration, class scheduling, bookings, payments, check-in/out, and staff management.

> **Note:** Security-sensitive operational details are intentionally simplified/omitted in this public edition.
>
> 日本語版は [README.ja.md](README.ja.md) をご覧ください。

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) | File-based routing and server components reduce boilerplate. Built-in middleware and API routes keep the frontend self-contained without a separate BFF. |
| Styling | Tailwind CSS | Utility-first approach speeds up UI iteration without context-switching to CSS files. |
| Backend | Go (Echo) | Statically typed, fast compile-test cycle, and excellent concurrency primitives for Webhook fan-out and transactional batch jobs. Echo adds minimal overhead over `net/http`. |
| Database | Supabase (PostgreSQL + RLS) | Managed Postgres with row-level security lets API routes query the DB directly without leaking cross-tenant data. Auth and Storage come bundled — no extra services to wire up. |
| Payments | Stripe | Best-in-class subscription billing. Webhook event model maps cleanly to the domain (payment_intent → payment record, subscription.updated → member status sync). |
| Email | Resend | Simple REST API with React-email compatible templates. Free tier covers operational volume. |
| Messaging | LINE Messaging API | Primary communication channel for the target demographic (Japanese users). LIFF enables in-app flows (member card, booking) without building a native app. |
| Hosting | Vercel + Cloud Run | Vercel for zero-config Next.js deploys; Cloud Run for the Go backend with scale-to-zero cost profile. |

---

## Cost Design

Every infrastructure choice was made with a zero-or-near-zero monthly cost target in mind:

| Component | Choice | Cost rationale |
|-----------|--------|----------------|
| Frontend hosting | Vercel (free tier) | Generous free tier for Next.js; no server to maintain |
| Backend hosting | Cloud Run | Scales to zero between requests — no idle cost |
| Database | Supabase (free tier) | Managed PostgreSQL + Auth + Storage; free up to 500 MB |
| Email | Resend (free tier) | 3,000 emails/month free; sufficient for a single studio |
| Payments | Stripe | No monthly fee; pay-as-you-go per transaction |
| Messaging | LINE Messaging API (free tier) | Free push message quota covers daily operational volume |

The split between Next.js (Vercel) and Go (Cloud Run) was itself a cost decision: keeping the frontend on Vercel's free tier while offloading cron-heavy batch work to Cloud Run's pay-per-use model avoids paying for always-on compute.

---

## Architecture

```
Browser / LIFF App
      │
      ▼
Next.js (Vercel)
  ├── middleware.js          — Auth, request-id propagation
  ├── app/api/*              — API routes (CRUD, thin Supabase wrappers)
  └── app/api/tablet/*       — Proxy → Go backend
      │
      ▼
Go Backend (Cloud Run)
  ├── POST /checkins         — Check-in (tablet auth, idempotent)
  ├── POST /checkouts        — Check-out
  ├── POST /reservations     — Booking with capacity enforcement
  ├── POST /members/:id/pause|resume|cancel  — Subscription state machine
  ├── POST /stripe/webhook   — Stripe event processing
  └── POST /line/webhook     — LINE Messaging API events
      │
      ▼
Supabase (PostgreSQL)
```

### Go Backend: Clean Architecture

The Go backend follows a clean architecture with four layers, with dependency injection wired in `main.go`:

```
domain/          — Pure value objects and event types (no external dependencies)
repository/      — Interfaces only; defines what the usecase layer needs
usecase/         — Business logic; depends only on repository interfaces
handler/         — HTTP binding; calls usecase, returns JSON
infrastructure/  — Implements repository interfaces (Supabase REST API calls)
```

**Why clean architecture here?**
- The usecase layer has no framework or DB dependencies, making it straightforward to unit test with mock repositories
- Swapping Supabase for a different DB only requires reimplementing the infrastructure layer
- Business rules (e.g. "only active/trial members can check in", "capacity must be checked before inserting a booking") live in usecase, not scattered across handlers

Each vertical slice follows the same pattern: `NewXxxRepository(supabase) → NewXxxUsecase(repo) → NewXxxHandler(usecase)`, wired explicitly in `main.go` rather than with a DI container.

### Why a separate Go backend on Cloud Run?

The primary driver was Vercel's free tier limit of two cron jobs. Critical background tasks — Stripe payment retries, LINE reminder notifications, monthly settlement reports, and data archiving — exceeded that limit, making a dedicated backend necessary.

Once a separate backend was needed, Go on Cloud Run was the natural fit:
- Transactional write operations (check-in deduplication, capacity-checked bookings, subscription state machine) benefit from long-lived processes rather than cold-starting serverless functions
- Go's concurrency model handles Webhook fan-out cleanly
- Cloud Run scales to zero between batch windows, keeping costs low

Next.js handles all read-heavy admin CRUD where Supabase's row-level security is sufficient.

---

## Key Features

### Member Portal (LIFF / Web)
- 6-step registration: profile → email verification → address → plan → consent → Stripe payment
- Parental consent flow for members under 18
- QR code membership card
- Booking, cancellation, activity history

### Admin Dashboard (`/admin`)
- Member management (search, status, plan changes)
- Class scheduling and booking oversight
- Payment records and revenue analytics
- Staff and role management (RBAC with per-store access)
- Audit log for all staff operations
- Attendance log (check-in/out history)

### Tablet Kiosk (`/tablet`)
- QR scan check-in / check-out
- Staff terminal: enrollment, pause, resume, cancellation, payment method change
- Short-lived session tokens (`tablet_sessions` table)

### Go Backend
- Transactional check-in / check-out with duplicate prevention
- Capacity-checked reservations
- Stripe Webhook processor (payment_intent, subscription, invoice, charge events)
- LINE Webhook processor (follow/unfollow/message events)
- Cron jobs: reservation reminders, settlement reports, archive

---

## Security Design

- Admin panel existence is hidden behind a configurable secret path; direct `/admin` access returns 404
- All authenticated requests (admin, tablet, internal) pass through a unified middleware that validates identity, injects role/permission context, and issues short-lived signed tokens — no extra DB call in handlers
- All inbound webhooks (LINE, Stripe) are verified with HMAC signatures before processing

---

## Project Structure

```
flolia-platform/
├── frontend/
│   ├── middleware.js              — Auth middleware + request-id propagation
│   ├── app/
│   │   ├── page.js                — Landing page
│   │   ├── register/              — 6-step member registration
│   │   ├── admin/                 — Admin dashboard
│   │   ├── tablet/                — Tablet kiosk UI
│   │   ├── liff/                  — LINE LIFF apps
│   │   └── api/                   — API routes
│   ├── components/
│   ├── lib/
│   │   ├── auth/admin-access-token.js   — HMAC-SHA256 cookie signing (Web Crypto)
│   │   └── go-proxy.js                  — Typed proxy helper for Go backend calls
│   └── tests/unit/
│       ├── middleware.test.js
│       └── lib/go-proxy.test.js
├── backend/
│   ├── main.go
│   ├── domain/                    — Value objects and event types
│   ├── repository/                — Interfaces
│   ├── usecase/                   — Business logic + tests
│   ├── handler/                   — HTTP handlers
│   ├── infrastructure/            — Supabase REST client implementations
│   └── middleware/                — Tablet auth middleware
└── docs/
    └── data-model.md              — ER overview and main table reference
```

---

## Data Model

See [docs/data-model.md](docs/data-model.md) for the full ER overview and table reference.

Core tables: `members`, `membership_plans`, `member_plans`, `stores`, `classes`, `class_schedules`, `bookings`, `payments`, `attendance_logs`, `staff`, `roles`, `tablet_sessions`, `audit_logs`.

---

## Local Development

```bash
# Frontend
cd frontend
npm install
npm run dev       # localhost:3000

# Backend
cd backend
go run .          # localhost:8080
go test ./...
```

Environment variables required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `RESEND_API_KEY`, `ADMIN_ACCESS_SECRET`.
