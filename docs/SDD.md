# BICATS — Software Design Document

**Barangay Incident & Complaint Action Tracking System**

| Field | Value |
| --- | --- |
| Document type | Software Design Document (SDD) |
| System | BICATS — Barangay Incident & Complaint Action Tracking System |
| Version | 1.1 |
| Status | Living document (matches commit `074e488` + SMS/email) |
| Audience | Developers, QA, maintainers, thesis adviser/panel |
| Related | `README` (if present), `server/prisma/schema.prisma`, `client/src/router/routes.tsx` |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Architecture Design](#3-architecture-design)
4. [Data Design](#4-data-design)
5. [Interface Design — HTTP API](#5-interface-design--http-api)
6. [Component Design — Server](#6-component-design--server)
7. [Component Design — Client](#7-component-design--client)
8. [Business Rules & Domain Logic](#8-business-rules--domain-logic)
9. [Notifications & Realtime](#9-notifications--realtime)
10. [Security Design](#10-security-design)
11. [Cross-Cutting Concerns](#11-cross-cutting-concerns)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Configuration & Environments](#13-configuration--environments)
14. [Testing & Quality](#14-testing--quality)
15. [Deployment & Operations](#15-deployment--operations)
16. [Known Limitations & Future Work](#16-known-limitations--future-work)
17. [Appendices](#17-appendices)

---

## 1. Introduction

### 1.1 Purpose

BICATS digitizes the barangay complaint-and-dispute process, in particular the *Katarungang Pambarangay* (KP) mediation workflow. It lets residents file complaints and track their status online, and gives barangay staff a back-office to triage, schedule mediation, publish notices, and audit activity.

### 1.2 Scope

**In scope**

- Public (unauthenticated) complaint filing with evidence upload.
- Public case tracking by reference number + registered contact number.
- Staff authentication (JWT access token + rotating refresh token).
- Role-based back-office: complaints register, case detail/timeline, KP status workflow, priority triage, mediation scheduling, notice board, analytics, audit log, staff account management, barangay settings.
- Automated KP deadline reminders and priority escalation.
- In-app notifications with live (SSE) delivery.
- Resident notifications by SMS (UniSMS PH) and email (Brevo) when a case changes status or a mediation is scheduled, moved, or cancelled.
- Printable KP documents (Summons, Notice, Amicable Settlement, Certificate to File Action).
- Bilingual UI (English / Filipino) and light/dark theme.

**Out of scope (current version)**

- Public resident accounts / self-service portal.
- Document template editor and e-signatures.
- Native mobile apps.
- Multi-barangay tenancy (single barangay instance).

### 1.3 Definitions & Acronyms

| Term | Meaning |
| --- | --- |
| KP | *Katarungang Pambarangay* — the Philippine barangay justice system |
| Lupon | *Lupong Tagapamayapa* — the barangay peacekeeping/mediation panel |
| Pangkat | The mediation panel convened for a specific case |
| Punong Barangay | Barangay captain (chief executive) |
| CFA | Certificate to File Action — issued when mediation fails |
| Purok | A sub-area/zone within a barangay |
| CSRF | Cross-Site Request Forgery |
| RBAC | Role-Based Access Control |
| SSE | Server-Sent Events |
| SDD | Software Design Document |

---

## 2. System Overview

### 2.1 Context Diagram

```
                      +-----------------------------------+
                      |             BICATS                |
   Resident  ------>  |  public web app (React SPA)       |
   (guest)            |  file complaint • track case      |
                      +----------------+------------------+
                                       |
                                       | HTTPS / JSON (+multipart for filing)
                                       v
   Staff    ------>  +-----------------------------------+  ----->  PostgreSQL
   (admin/            |  REST API (Express 5)             |  <-----  (Prisma)
    staff/            |  auth • complaints • hearings •   |
    secretary/        |  notices • analytics • audit •    |
    lupon)            |  notifications (SSE) • settings   |
                      +--------+---------------+----------+
                               |               |
                        SMS (UniSMS)     email (Brevo)
                               v               v
                      +----------------+  +----------------+
                      |  complainant   |  |  complainant   |
                      |  mobile number |  |  email address |
                      +----------------+  +----------------+
                               |
                               v
                      +------------------+
                      |  Local uploads/  |
                      |  (evidence files)|
                      +------------------+
```

### 2.2 Primary User Journeys

1. **File a complaint (resident)** — open `/file-complaint`, fill the form, attach evidence (≤5 files, ≤10 MB each), agree to consent, receive a reference number like `BK-2026-K7M4Q9`.
2. **Track a complaint (resident)** — open `/track-complaint`, enter reference + mobile number; see current status and the public timeline.
3. **Triage (staff)** — open the complaints register, filter by status/priority/overdue, open a case, move it through KP statuses, set priority, schedule mediation.
4. **Remediate overdue cases** — the reminder job escalates priority and notifies staff; the overview dashboard surfaces overdue/at-risk cases.
5. **Publish notices (secretary/staff)** — create/update/delete notice-board posts.
6. **Print KP documents (staff)** — generate Summons/Notice/Settlement/CFA with the barangay letterhead from settings.
7. **Administer (admin)** — manage staff accounts, review the audit log, export data, edit barangay settings.

### 2.3 Design Goals

- **Accurate KP workflow support** with automatic deadline computation and escalation.
- **Traceability** — every privileged action is written to an immutable audit log.
- **Safety by default** — no public registration, strict RBAC, CSRF protection, hardened uploads.
- **Offline-friendly UI conventions** — optimistic React Router loaders/actions, no heavy global state.
- **Prototype-appropriate simplicity** — a two-app monorepo with a single relational database.

---

## 3. Architecture Design

### 3.1 Style

A **client/server (two-tier application) architecture**:

- A React single-page application (SPA) served statically and talking to the API over JSON.
- A stateless-ish Express REST API with a PostgreSQL system of record.
- Long-lived state kept in HttpOnly cookies (session) and the database (data).

```
+--------------------------------------------------------------+
| Browser (client/)                                            |
|   React 19 + React Router 8 + Tailwind v4 + shadcn/Radix     |
|   ky HTTP client -> /api/*  (dev: Vite proxy -> :3000)       |
+-----------------------------+--------------------------------+
                              |
+-----------------------------v--------------------------------+
| API (server/)  Express 5                                     |
|   middleware: helmet, cors, compression, json, cookies,      |
|               CSRF, rate limiters, requireAuth(RBAC)         |
|   modules: auth user complaint hearing notice analytics       |
|            notification audit setting  (+ reminder job)      |
|   data access: Prisma 7 (pg adapter)                         |
+-----------------------------+--------------------------------+
                              |
                       +------v------+
                       | PostgreSQL  |
                       +-------------+
```

### 3.2 Tech Stack

| Layer | Technology | Version (package.json) |
| --- | --- | --- |
| Frontend framework | React | 19.2 |
| Routing | React Router | 8.4 |
| Build tool | Vite | 8.3 |
| Styling | Tailwind CSS + tw-animate-css | 4.3 |
| UI primitives | shadcn + radix-ui (unified pkg) | 4.22 / 1.8 |
| Icons | lucide-react | 1.55 |
| Charts | recharts | 3.10 |
| Toasts | sonner | 2.0 |
| Theme | next-themes | 0.4 |
| HTTP client | ky | 2.2 |
| Language | TypeScript (client) | ~6.0 |
| Linter | oxlint | 1.81 |
| Backend framework | Express | 5.3 |
| Language | TypeScript (server) | 7.0 |
| ORM | Prisma | 7.10 |
| DB driver | node-postgres via `@prisma/adapter-pg` | 8.23 |
| Validation | Zod | 4.6 |
| Auth | jsonwebtoken + argon2 | 9.0 / 0.45 |
| CSRF | csrf-csrf | 4.0 |
| Uploads | multer | 2.4 |
| Logging | pino + pino-http | 10.4 |
| Hardening | helmet, cors, compression, express-rate-limit | — |
| Runtime | Node.js (ESM), tsx (dev) | — |
| Package manager | pnpm | ≥11.3 |

### 3.3 Repository Layout

```
bicatsfullstack/
├── client/                     # React SPA (own package.json / node_modules)
│   ├── src/
│   │   ├── components/         # ui/ (shadcn primitives) + shared widgets
│   │   ├── features/           # feature folders: admin/*, auth, complaint, guest, errors
│   │   ├── hooks/              # use-auth, use-mobile
│   │   ├── layouts/            # root/ and admin/ layouts + loaders + errors
│   │   ├── lib/                # api, csrf, datetime, I18n, roles, utils
│   │   ├── router/             # routes.tsx (createBrowserRouter)
│   │   └── types/              # ambient type augmentations
│   └── vite.config.ts
└── server/                     # Express API (own package.json / node_modules)
    ├── prisma/
    │   ├── schema.prisma       # data model
    │   └── *-seeder.ts         # complaint / user / audit seeders
    └── src/
        ├── modules/<name>/     # {name}.{routes,controller,service,schema}.ts
        ├── middlewares/        # auth.middleware, ratelimit.middleware
        ├── jobs/               # reminder.job.ts
        ├── utils/              # env, jwt, csrf, upload, roles, errors, validator
        ├── generated/prisma/   # Prisma client output (gitignored)
        ├── db.ts               # PrismaClient singleton
        └── index.ts            # app wiring + startup
```

### 3.4 Layered Server Design

Each module follows a strict 4-file pattern:

```
Routes  ->  Controller  ->  Service  ->  Prisma / DB
  |            |              |
  | validate & dispatch        | business rules, transactions
  auth/RBAC guards,            |
  rate limits, upload          +-- emits audit + notifications
```

- **Routes** — declare HTTP verbs/paths, attach middleware (`requireAuth(...roles)`, limiters, `uploadEvidence`).
- **Controller** — parse/validate input with Zod, call the service, shape the HTTP response, map errors to status codes.
- **Service** — domain logic and multi-table transactions; the only layer that touches Prisma.
- **Schema** — Zod schemas + TypeScript types shared by the module.

### 3.5 Request Lifecycle (server)

```
HTTP request
  -> pino-http (request log, redacts cookies/authorization)
  -> helmet (security headers)
  -> compression
  -> cors (credentials, CORS_ORIGIN)
  -> express.json (100kb limit)
  -> cookie-parser
  -> ensureCsrfSession (issues csrf_sid cookie)
  -> GET /api/csrf-token (safe, exempt)
  -> doubleCsrfProtection (non-GET require X-CSRF-Token)
  -> module router  ->  requireAuth(...roles)  ->  controller
  -> (unmatched /api/* -> JSON 404)
  -> central error handler (CustomError | ZodError | <500 status | 500)
```

### 3.6 Client Request Lifecycle

```
Route navigation
  -> loader/action runs (React Router)
      -> api (ky)  adding X-CSRF-Token on every call
  -> on 401 (not auth endpoints): call /api/auth/refresh once, then retry
  -> component renders with loader data; actions revalidate loaders
  -> errors caught by route errorElement (RootError / AdminError)
```

---

## 4. Data Design

### 4.1 Entity-Relationship Overview

```
User 1---* RefreshToken
User 1---* StatusUpdate   (createdBy)
User 1---* Notice         (createdBy)
User 1---* Notification
User 1---* Hearing        (createdBy)
User 1---* AuditLog       (actor)

Complaint 1---* Evidence
Complaint 1---* StatusUpdate
Complaint 1---* Hearing
Complaint 1---* Notification

BarangaySettings (singleton, id = 1)
```

### 4.2 Table Definitions

#### User (staff account)

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | autoincrement |
| fullName | String | |
| position | String | e.g. "Punong Barangay" |
| email | String UQ | login identifier |
| phone | String UQ | login identifier, unique |
| username | String UQ | login identifier, unique |
| passwordHash | String | argon2 hash |
| role | String | `admin` \| `staff` \| `secretary` \| `lupon` (default `staff`) |
| isActive | Boolean | default true (soft disable) |
| createdAt / updatedAt | DateTime | |

Indexes: `(role, isActive)`, `(createdAt)`.

#### RefreshToken

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| token | String UQ | 40 random bytes hex |
| userId | Int FK→User | `onDelete: Cascade` |
| expiresAt | DateTime | `now + REFRESH_TOKEN_EXPIRES_IN` days |
| createdAt | DateTime | |
| revokedAt | DateTime? | reserved (rotation deletes + recreates) |

#### Complaint

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| reference | String UQ | `BK-<year>-<6 base32 chars>` |
| complainantName | String | |
| complainantAge | Int | 1–120 |
| complainantPurok | String | grouped for hotspot analytics |
| complainantContact | String | as entered |
| contactNormalized | String | digits-only, used for tracking lookup |
| complainantEmail | String? | optional; used for email updates |
| complainantAddress | String | |
| respondentName | String | |
| respondentAddress | String? | |
| relationship | String? | relationship of parties |
| complaintType | String | category |
| incidentAt | DateTime | must not be in the future |
| incidentPlace | String | |
| narrative | String | 10–5000 chars |
| status | String | KP status (default `received`) |
| priority | String | `low`\|`normal`\|`high`\|`urgent` (default `normal`) |
| dueAt | DateTime? | next KP step deadline; null when terminal |
| consentAt | DateTime | data-privacy consent timestamp |
| viewedAt | DateTime? | first staff open; null = unopened |
| createdAt / updatedAt | DateTime | |

Indexes: `(contactNormalized)`, `(status, createdAt)`, `(status, dueAt)`, `(priority, createdAt)`, `(viewedAt, updatedAt)`, `(createdAt)`, `(incidentAt)`, `(complaintType, createdAt)`.

#### Evidence

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| complaintId | Int FK→Complaint | Cascade |
| originalName | String | user's filename (display only) |
| storedName | String UQ | server-generated `<uuid>.<ext>` |
| mimeType | String | jpg/png/pdf/mp4 |
| size | Int | bytes |
| createdAt | DateTime | |

Index: `(complaintId, createdAt)`.

#### StatusUpdate (timeline entry)

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| complaintId | Int FK→Complaint | Cascade |
| status | String | status at this point |
| publicNote | String? | shown to the resident when tracking |
| internalNote | String? | staff-only |
| hearingAt | DateTime? | date noted with the status change |
| createdById | Int? FK→User | `onDelete: SetNull`; null = System |
| createdAt | DateTime | |

Indexes: `(complaintId, createdAt)`, `(createdById)`, `(hearingAt)`.

#### Hearing (mediation session; UI label "Mediation")

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| complaintId | Int FK→Complaint | Cascade |
| scheduledAt | DateTime | |
| kind | String | `mediation` \| `conciliation` \| `hearing` (UI "Arbitration") |
| status | String | `scheduled` \| `completed` \| `cancelled` \| `no_show` |
| location | String? | |
| notes | String? | |
| outcome | String? | |
| createdById | Int? FK→User | SetNull |
| createdAt / updatedAt | DateTime | |

Indexes: `(scheduledAt)`, `(complaintId, scheduledAt)`, `(status, scheduledAt)`.

#### Notice (notice board)

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| title | String | |
| body | String | |
| isPublished | Boolean | default true |
| createdById | Int? FK→User | SetNull |
| createdAt | DateTime | |

Indexes: `(isPublished, createdAt)`, `(createdById)`.

#### Notification

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| userId | Int FK→User | Cascade |
| type | String | `reminder`\|`overdue`\|`escalation`\|`new_complaint`\|`info` |
| title / body | String | |
| complaintId | Int? FK→Complaint | SetNull |
| reference | String? | denormalized case reference |
| dedupeKey | String? UQ | idempotency key |
| readAt | DateTime? | null = unread |
| createdAt | DateTime | |

Indexes: `(userId, readAt, createdAt)`, `(createdAt)`.

#### AuditLog (immutable trail)

| Column | Type | Notes |
| --- | --- | --- |
| id | Int PK | |
| actorId | Int? FK→User | SetNull |
| actorName / actorRole | String? | snapshots survive rename/delete |
| action | String | e.g. `complaint.status.update` |
| entityType | String | `complaint`\|`hearing`\|`notice`\|`user`\|`auth`\|`setting` |
| entityId | Int? | |
| summary | String | human-readable |
| meta | Json? | structured before/after context |
| ip | String? | request IP |
| createdAt | DateTime | |

Indexes: `(createdAt)`, `(entityType, createdAt)`, `(action, createdAt)`, `(actorId, createdAt)`.

#### BarangaySettings (singleton)

| Column | Type | Default |
| --- | --- | --- |
| id | Int PK | fixed `1` |
| barangayName | String | "Barangay Kabayanihan" |
| city | String | "City of Baguio" |
| province | String | "Benguet" |
| address | String | "" |
| contactNumber | String | "" |
| email | String | "" |
| officeHours | String | "Monday–Friday, 8:00 AM – 5:00 PM" |
| punongBarangay | String | "Hon. Mario D. Santos" |
| luponChairman | String | "Mr. Pedro A. Reyes" |
| updatedAt | DateTime | @updatedAt |

### 4.3 Referential Integrity & Deletion Policy

- Child rows tied to a `Complaint` (`Evidence`, `StatusUpdate`, `Hearing`, `Notification`) cascade on complaint deletion.
- User references use `SetNull` so history/audit survives account deletion, with name/role snapshots preserved on `AuditLog`.

---

## 5. Interface Design — HTTP API

Base URL: `/api`. All request/response bodies are JSON unless noted. Non-`GET` requests from the browser must include the `X-CSRF-Token` header (see §10).

**Legend:** 🔓 public · 🔐 any authenticated staff · role-restricted noted per row.

### 5.1 Auth — `/api/auth`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/me` | 🔐 | Return the current user's identity/role |
| POST | `/log-in` | 🔓 (rate-limited) | Authenticate by email/username/phone + password |
| POST | `/log-out` | 🔓 (rate-limited) | Revoke the refresh token and clear cookies |
| POST | `/refresh` | 🔓 (rate-limited) | Rotate refresh token, issue new access token |

`POST /log-in` body: `{ identifier, password }` → sets `access_token` + `refresh_token` cookies, returns `{ user: { id, fullName, role } }`.

### 5.2 Users — `/api/users`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | admin | List staff accounts |
| POST | `/create` | admin | Create a staff account |
| PATCH | `/me` | 🔐 | Update own profile / change password |
| PATCH | `/:id` | admin | Update/deactivate a staff account |

### 5.3 Complaints — `/api/complaints`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/file-complaint` | 🔓 (rate-limited, multipart) | File a complaint with evidence |
| POST | `/track` | 🔓 (rate-limited) | Look up a case by reference + contact |
| POST | `/list` | case viewers | Paginated, filtered register |
| POST | `/bulk-status` | case writers | Bulk status change |
| GET | `/:id` | case viewers | Full case detail + timeline |
| POST | `/:id/view` | case viewers | Stamp first-view; clear notifications |
| PATCH | `/:id/status` | case writers | Advance KP status (+ optional mediation date) |
| PATCH | `/:id/priority` | case writers | Set priority |
| POST | `/:id/reopen` | case writers | Reopen a terminal case |

Filters for `/list`: `q` (reference/complainant/respondent), `status`, `type`, `priority`, `overdue`, `dueSoon`, plus `page`/`limit`.

`POST /file-complaint` is `multipart/form-data` (field `evidence`, up to 5 files). `POST /track` body: `{ reference, phone }`.

### 5.4 Hearings / Mediation — `/api/hearings`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | hearing managers | List mediations (filters/range) |
| GET | `/complaints` | hearing managers | Complaint options for the picker |
| POST | `/` | hearing managers | Schedule a session |
| PATCH | `/:id` | hearing managers | Reschedule/complete/cancel |
| DELETE | `/:id` | hearing managers | Cancel a session |

### 5.5 Notices — `/api/notices`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/list` | 🔓 | Published notices (public board) |
| GET | `/admin/list` | notice publishers | All notices incl. unpublished |
| POST | `/create` | notice publishers | Create a notice |
| PATCH | `/:id` | notice publishers | Edit a notice |
| DELETE | `/:id` | notice publishers | Delete a notice |

### 5.6 Analytics — `/api/analytics`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/report` | staff | Charts: complaint types, hotspots, monthly trends, status distribution |
| GET | `/overview` | staff | Dashboard KPIs, recent complaints, upcoming mediations, attention list |

### 5.7 Notifications — `/api/notifications`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | 🔐 | Latest notifications + unread count |
| GET | `/stream` | 🔐 | Server-Sent Events stream (live bell) |
| POST | `/read-all` | 🔐 | Mark all of the user's notifications read |
| PATCH | `/:id/read` | 🔐 | Mark one notification read |

### 5.8 Audit — `/api/audit`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | admin | Paginated audit feed (`entityType`, `q`, `page`, `limit` ≤ 100) |
| GET | `/export` | admin | All matching rows (≤ 5000) for CSV export |

### 5.9 Settings — `/api/settings`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | 🔓 | Barangay profile/letterhead (public so printable docs/board can read it) |
| PATCH | `/` | admin | Update settings (audited as `setting.update`) |

### 5.10 CSRF — `/api/csrf-token`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/csrf-token` | 🔓 | Issue a CSRF token for the current session |

### 5.11 Error Responses

| Status | Shape | Cause |
| --- | --- | --- |
| 400 | `{ message, fields? }` | Validation (`ZodError`) or `CustomError` field errors |
| 401 | `{ message }` | Missing/expired/invalid token, inactive account |
| 403 | `{ message }` | Authenticated but lacking the required role |
| 404 | `{ error }` | Unknown `/api/*` route |
| 429 | `{ message }` | Rate limit exceeded |
| 500 | `{ message: "Something went wrong" }` | Unexpected server error |

---

## 6. Component Design — Server

### 6.1 Module Inventory

| Module | Responsibility | Key rules |
| --- | --- | --- |
| `auth` | Login/logout/refresh, `me` | argon2 verify; rotate refresh token; set cookies |
| `user` | Staff account CRUD + self profile | Unique email/phone/username; hashes password |
| `complaint` | File, track, list, detail, status/priority, reopen | KP deadlines, mediation mirroring, audit |
| `hearing` | Mediation scheduling/calendar | `kind`/`status` enums; conflict-free by design (no overlap check) |
| `notice` | Notice-board CRUD | Public read of published only |
| `analytics` | Aggregations for reports/overview | Raw SQL for month grouping |
| `notification` | Inbox + SSE + creation helpers | Dedupe via `dedupeKey`; `createForUsers` |
| `sms` | UniSMS PH client + message templates | Optional (blank key disables); PH number normalization; fire-and-forget |
| `email` | Brevo client + message templates | Optional (blank key/sender disables); plain-text + HTML; fire-and-forget |
| `notify` | Complainant fan-out dispatcher | Sends on whichever channels the complainant left; isolated failures |
| `audit` | Query + export the trail | Admin-only; `auditFromRequest` helper |
| `setting` | Barangay profile/letterhead | Singleton upsert id=1 |
| `jobs/reminder` | Scheduled scan | Escalation + daily reminders |

### 6.2 Cross-Cutting Server Utilities

| File | Purpose |
| --- | --- |
| `utils/env.config.ts` | Load/validate required env vars; fail fast |
| `utils/jwt.ts` | Sign/verify access token; generate refresh token |
| `utils/csrf.ts` | `ensureCsrfSession`, `generateCsrfToken`, `doubleCsrfProtection` |
| `utils/upload.ts` | Multer config, allowed types, friendly errors, cleanup |
| `utils/roles.ts` | Single source of truth for roles + role groups |
| `utils/custom.validator.ts` | `validateRequest(schema, data)` → parsed or `CustomError` |
| `utils/custom.exception.ts` / `utils/api.error.ts` | Typed errors with status + fields |
| `middlewares/auth.middleware.ts` | `requireAuth(...roles)` — verifies JWT + re-checks DB |
| `middlewares/ratelimit.middleware.ts` | Auth/filing/tracking limiters |
| `db.ts` | Prisma client singleton (pg adapter) |

### 6.3 `requireAuth` Behavior

1. Read `access_token` cookie; 401 if absent.
2. Verify JWT; 401 on invalid/expired.
3. Re-fetch `{ id, fullName, role, isActive }` from the DB — role changes and deactivations take effect immediately.
4. Reject inactive/absent users (401).
5. Attach `req.user = { userId, role, fullName }`.
6. If `allowedRoles` were supplied and the role isn't in them → 403.

### 6.4 Audit Logging

The `auditFromRequest(req)` helper builds an entry from the current request (actor, IP, action, entity, summary, meta). Emitted actions include:

`auth.login`, `user.create`, `user.update`, `complaint.status.update`, `complaint.priority.update`, `complaint.bulk_status`, `complaint.reopen`, `hearing.create`, `hearing.update`, `hearing.cancel`, `notice.create`, `notice.update`, `notice.delete`, `setting.update`.

---

## 7. Component Design — Client

### 7.1 Routing (`client/src/router/routes.tsx`)

```
/                         RootLayout (+ RootLoader)
├── (index)               Home (guest welcome, + HomeLoader)
├── login                 Login + loginAction
├── file-complaint        FileComplaint + fileComplaintAction
├── track-complaint       Track + trackAction
└── *                     NotFound

/admin                    AdminLayout (+ AdminLoader, AdminError)
├── (index)               Overview (+ OverviewLoader)
├── analytics             AdminReport (inline loader -> /analytics/report)
├── create                CreateUser (+ AdminOnlyLoader)
├── accounts              StaffAccounts (+ UsersLoader, usersAction)
├── profile               Profile (+ ProfileLoader, profileAction)
├── audit                 AuditLog (+ AuditLoader)
├── settings              BarangaySettingsPage (+ SettingsLoader, settingsAction)
├── complaints            ComplaintsList (+ ComplaintsLoader)
├── hearings              HearingsPage (+ HearingsLoader)
├── complaints/:id        ComplaintView (+ ComplaintDetailLoader)
├── notices               NoticesList (+ NoticesLoader, noticesAction)
├── notices/create        CreateNotice (+ createNoticeAction)
└── *                     NotFound

/admin/complaints/:id/documents/:doc    ComplaintDocument (+ loader) — no app chrome (printable)
```

The admin layout wraps all `/admin` children with a collapsible sidebar and a header (name → profile, notifications bell, theme toggle, language toggle). Route-level `handle.crumb` drives breadcrumbs.

### 7.2 Feature Folder Convention

Each feature is a folder under `features/` holding some of:

- `loader.ts` — fetch data for the route (React Router loader) and export result types.
- `action.ts` — handle form submissions/mutations.
- `table.tsx` / `form.tsx` / `<view>.tsx` — presentation.
- Supporting components (`dialog.tsx`, `complaint-picker.tsx`, `priority-select.tsx`, etc.).

Loaders/actions are separated from components to satisfy the `react(only-export-components)` lint rule (constants and helpers must live outside component modules).

### 7.3 Guards & Auth State

- `AdminLoader` and `AdminOnlyLoader` (`layouts/admin/loader.ts`) gate the panel; `AdminOnlyLoader` restricts to admins.
- `hooks/use-auth.ts` caches the current user for the session and drives role-aware navigation.
- `lib/roles.ts` mirrors the server `utils/roles.ts` role groups and must be kept in sync.

### 7.4 Shared UI & Conventions

- `components/ui/*` — shadcn-generated primitives from the unified `radix-ui` package.
- `components/ui/date-time-picker.tsx` + `components/ui/popover.tsx` — a custom themed date/time picker; `lib/datetime.ts` holds pure date helpers and a module-level `NOW` (kept out of components to satisfy `react(purity)`).
- Shared table styling: full-bleed containers (`-mx-6 … border-y`), hover rows, bold first cell — used by complaints, accounts, and audit tables.
- `data-pagination.tsx`, `top-loader.tsx`, `mode-toggle.tsx`, `language-toggle.tsx`.

### 7.5 Internationalization & Theming

- `lib/I18n.tsx` provides `useT()` and a `Key` type derived from the English dictionary; English is the default, Filipino (`tl`) is bundled, and a saved `localStorage` preference wins.
- Dark mode via `next-themes` with a `ThemeProvider` mounted in `main.tsx`.

### 7.6 Printable KP Documents

`features/admin/complaint/documents/{loader.ts,document.tsx}` render Summons, Notice of Mediation, Amicable Settlement, and Certificate to File Action. The loader fetches the complaint **and** `/api/settings`; the letterhead and signatories (Punong Barangay, Lupon Chairman) are sourced from settings rather than hardcoded.

### 7.7 CSV Export & Print

- Audit and Analytics pages fetch server data and build CSV client-side (labels resolved via `ACTION_LABEL`/`entityLabel` maps).
- Print uses `window.print()` with an `@media print` block in `index.css` that hides the sidebar/header and a `print-hide` utility class for buttons.

---

## 8. Business Rules & Domain Logic

### 8.1 KP Status Workflow

Statuses (ordered): `received → summoned → mediation → conciliation → settled | certified | dismissed`.

- `settled`, `certified`, `dismissed` are **terminal** (no deadline; no escalation).
- `received`, `summoned`, `mediation`, `conciliation` are **open**.

### 8.2 Deadline Computation

On filing and on every status change, `computeNextDueAt(status)` sets `dueAt`:

| Status | Days to next step |
| --- | --- |
| `received` | 3 (summon the respondent) |
| `summoned` | 15 (hold mediation) |
| `conciliation` | 15 (conclude Pangkat conciliation) |
| `mediation` | none configured (null) |
| terminal | null |

### 8.3 Risk Classification

`complaintRisk(dueAt, status)` → `overdue` (past), `due_soon` (within `RISK_WINDOW_DAYS = 3`), `on_track`, or `none` (terminal / no deadline).

### 8.4 Priority & Auto-Escalation

Priorities ordered `low < normal < high < urgent`.

- Staff set priority manually on a case.
- The reminder scan auto-escalates **overdue** cases: `< 7 days late → high`, `≥ 7 days late → urgent`. Escalation **never downgrades** a case already at or above the target.

### 8.5 Mediation-Date Mirroring

When a status change includes a mediation date, `updateStatus` runs inside a transaction that also mirrors the date into the `Hearing` table:

- `kind` = `conciliation` when the status is `conciliation`, else `mediation`.
- If a future `scheduled` session exists, it is **rescheduled**; otherwise a new one is created (no duplicate sessions on repeated edits).
- `getById` returns `nextHearingAt` / `nextHearingKind` for display.

### 8.6 Reference Numbers

`BK-<currentYear>-<6 chars>` where chars come from an unambiguous base32 alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, no `I`/`O`/`0`/`1`).

### 8.7 Tracking Privacy

Tracking requires the **reference number and the registered contact number** (normalized to digits). References cannot be enumerated. The public timeline exposes only `status`, `publicNote`, `hearingAt`, `createdAt` — never internal notes.

### 8.8 Complaints Register Filters

- `q` — fuzzy match on reference / complainant / respondent.
- `status`, `type`, `priority` — exact filters.
- `overdue` — `dueAt < now` and not terminal.
- `dueSoon` — `dueAt` within the next 3 days and not terminal.
- Newest-filed first (`createdAt DESC, id DESC`).

### 8.9 Evidence Upload Constraints

Allowlisted MIME types → fixed extensions (never trust the client filename): `image/jpeg→.jpg`, `image/png→.png`, `application/pdf→.pdf`, `video/mp4→.mp4`. Max 5 files, ≤10 MB each. Files written to `uploads/` with a UUID name; already-written files are removed if the request later fails.

---

## 9. Notifications & Realtime

### 9.1 Notification Sources

| Type | Trigger | Audience |
| --- | --- | --- |
| `new_complaint` | Complaint filed | All active internal users |
| `reminder` | KP step due within 1 day | All active internal users |
| `overdue` | KP step past deadline | All active internal users |
| `escalation` | Priority auto-escalated | All active internal users |
| `info` | Reserved/generic | — |

### 9.2 Idempotency

Every generated notification carries a `dedupeKey` (e.g. `reminder:<caseId>:<day>:<userId>`, `escalation:<caseId>:<priority>:<userId>`, `new_complaint:<caseId>:<userId>`). `createMany({ skipDuplicates: true })` guarantees one row per recipient per event.

### 9.3 Realtime Delivery (SSE)

- `GET /api/notifications/stream` opens a Server-Sent Events connection, per-user channel `user:<id>`.
- `notification.events.ts` keeps an in-memory registry and `emitNotification(userId)` nudges the affected client.
- The client's `bell.tsx` subscribes via `EventSource` and refetches the inbox on signal; unread badges are colored by type (e.g. `new_complaint` → blue).

### 9.4 Read Semantics

- `PATCH /:id/read` and `POST /read-all` set `readAt`.
- Opening a case (`POST /:id/view`) also marks that user's notifications for the case read.

### 9.5 External Channels (SMS & Email)

Outbound resident notifications are **not** stored in the database; they fire in real time when a staff action changes a case. `notify/complainant.notifier.ts` fetches the complainant once (reference, contact, email) and fans out to the channels that are available.

| Channel | Provider | Message builder | Enabled when |
| --- | --- | --- | --- |
| SMS | UniSMS PH (`POST /api/sms`, Basic auth) | `sms/sms.messages.ts` | `UNISMS_SECRET_KEY` is set |
| Email | Brevo (`POST /v3/smtp/email`, `api-key` header) | `email/email.messages.ts` | `BREVO_API_KEY` **and** `BREVO_SENDER_EMAIL` are set |

Trigger points:

| Event | Handler | Message |
| --- | --- | --- |
| Case status changed | `complaint.controller.updateStatus` | "Complaint `<ref>` is now `<status>`" (+ mediation date if one was set) |
| Mediation scheduled | `hearing.controller.create` | "Your `<kind>` is scheduled on `<when>`" |
| Mediation rescheduled | `hearing.controller.update` (when `scheduledAt` changes) | "Your `<kind>` is rescheduled…" |
| Mediation cancelled | `hearing.controller.cancel` | "Your `<kind>` has been cancelled" |

Design notes:

- All sends are **fire-and-forget** (`void notifier.…`): the HTTP response is never blocked by SMS/email, and a provider failure is logged, never thrown.
- Each channel is skipped when it isn't configured or the complainant gave no address for it; `Promise.allSettled` isolates one channel's failure from the other.
- Secrets are only read from env and are never logged.
- SMS content is capped at 670 characters; messages avoid PII beyond the case reference.
- Email templates provide a plain-text body and a simple HTML body.
- The public filing form captures an optional email; only complainants who gave one receive email.

### 9.6 Reminder Job

`startReminderJob()` runs at startup (+5s) and every 30 minutes (`.unref()` so it doesn't block shutdown). `runReminderScan()`:

1. Selects open cases with `dueAt ≤ now + 1 day`.
2. Auto-escalates overdue low/medium cases and records escalation alerts.
3. Creates one reminder/overdue notification per active staff member per case per day (deduped).

---

## 10. Security Design

| Control | Design |
| --- | --- |
| Authentication | JWT access token (short-lived, HttpOnly cookie) + rotating refresh token (DB-backed, HttpOnly cookie) |
| Password storage | argon2 hash (`argon2.verify` on login) |
| Session hardening | Cookie `secure` + `SameSite=None` in production, `lax` in dev |
| RBAC | `requireAuth(...roles)` on every protected route; role groups in `utils/roles.ts` |
| Live revocation | DB re-check of role/`isActive` on each authenticated request |
| CSRF | `csrf-csrf` double-submit: `ensureCsrfSession` + `GET /api/csrf-token` + `doubleCsrfProtection`; browser sends `X-CSRF-Token`; `GET` exempt |
| Rate limiting | Dedicated limiters on login/refresh/logout, filing, and tracking |
| Input validation | Zod schemas at the controller boundary |
| Uploads | MIME allowlist, fixed extensions, UUID filenames, size/count caps, cleanup on failure |
| Headers | `helmet` defaults; `trust proxy` in production |
| Logging hygiene | pino redacts `cookie`, `authorization`, `set-cookie` |
| Least privilege | Public endpoints limited to filing, tracking, published notices, settings read, CSRF token |
| Account lifecycle | `isActive` soft-disable; user references use `SetNull` so history survives |
| Auditability | Privileged actions written to `AuditLog` with actor snapshots + IP |

### 10.1 Role → Capability Matrix

| Capability | admin | staff | secretary | lupon |
| --- | :-: | :-: | :-: | :-: |
| Sign in to the panel | ✅ | ✅ | ✅ | ✅ |
| View the complaints register/detail | ✅ | ✅ | ✅ | ✅ |
| Change status/priority, reopen, bulk-update | ✅ | ✅ | — | ✅ |
| Schedule/manage mediations | ✅ | ✅ | — | ✅ |
| Publish/edit notices | ✅ | ✅ | ✅ | — |
| Analytics reports/overview | ✅ | ✅ | ✅ | ✅ |
| Manage staff accounts, audit trail, settings | ✅ | — | — | — |

> Role groups: `INTERNAL_ROLES` = all four; `CASE_VIEW_ROLES` = all four; `CASE_WRITE_ROLES` = admin/staff/lupon; `HEARING_ROLES` = admin/staff/lupon; `NOTICE_ROLES` = admin/staff/secretary; `ADMIN_ROLES` = admin.

---

## 11. Cross-Cutting Concerns

### 11.1 Error Handling

- Controllers translate domain/validation errors into `400` with field maps.
- `ApiError`/`CustomError` carry HTTP status; the central handler in `index.ts` maps `CustomError`/`ZodError`/status-bearing errors and falls back to `500`.
- The client surfaces route errors through `RootError`/`AdminError` and field errors inline; toasts (`sonner`) report action failures.

### 11.2 Validation

Zod at every boundary. Notable gotcha (documented): `.optional().transform(v => v || null)` also runs on `undefined`, so PATCH handlers that must distinguish "absent" from "null" use `.nullable().optional()`.

### 11.3 Logging

`pino` (pretty in dev, JSON in prod) with `pino-http` per-request logging and sensitive-header redaction.

### 11.4 Internationalization

Shared `useT()` with English default and Filipino translations; all user-facing strings come from the dictionary.

### 11.5 TypeScript Strictness

- Server: `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (encourages conditional spreads).
- Client: `noUnusedLocals` / `noUnusedParameters`.
- Linting via oxlint, including React purity rules that shape helper placement.

---

## 12. Non-Functional Requirements

| Attribute | Target / Approach |
| --- | --- |
| Performance | Indexed list queries; pagination (page size ≤ 100); parallel `Promise.all` aggregation in overview |
| Scalability | Stateless API instances; SSE registry is in-memory (single-instance assumption — see §16) |
| Reliability | DB transactions for multi-write operations; idempotent notifications via `dedupeKey` |
| Security | See §10 |
| Usability | Bilingual, light/dark, responsive sidebar, route breadcrumbs, inline validation |
| Maintainability | Module-per-feature; strict 4-file server pattern; loader/action separation; shared type maps |
| Portability | Node.js + PostgreSQL; no vendor lock-in beyond Prisma/pg |
| Observability | Structured request logs; audit trail; DB health check at startup |

---

## 13. Configuration & Environments

### 13.1 Server Environment Variables (`server/.env`)

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | ✅ | API port (default referenced as 3000) |
| `NODE_ENV` | ✅ | `development` \| `production` |
| `CSRF_SECRET` | ✅ | CSRF signing secret |
| `JWT_SECRET` | ✅ | Access-token signing secret |
| `JWT_EXPIRES_IN` | ✅ | Access-token lifetime (seconds) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `CORS_ORIGIN` | ✅ | Allowed origin (credentials enabled) |
| `REFRESH_TOKEN_EXPIRES_IN` | ➖ | Refresh lifetime in days (default 30) |
| `PUBLIC_API_URL` | ➖ | Base URL used to build evidence links (default `http://localhost:3000`) |
| `UNISMS_SECRET_KEY` | ➖ | UniSMS PH secret key; blank disables SMS |
| `UNISMS_SENDER_ID` | ➖ | Registered UniSMS sender ID (default `Unisoft`) |
| `UNISMS_API_URL` | ➖ | UniSMS endpoint (default `https://unismsapi.com/api/sms`) |
| `BREVO_API_KEY` | ➖ | Brevo API key; blank disables email |
| `BREVO_SENDER_EMAIL` | ➖ | Verified Brevo sender address; required for email to be enabled |
| `BREVO_SENDER_NAME` | ➖ | Sender display name (default `BICATS`) |
| `BREVO_API_URL` | ➖ | Brevo endpoint (default `https://api.brevo.com/v3/smtp/email`) |

Startup fails fast if a required variable is missing. SMS/email are optional: with a blank key the related channel is silently disabled and the app runs normally.

### 13.2 Development Topology

- Server: `pnpm dev` (tsx watch) on `:3000`.
- Client: `pnpm dev` (Vite) proxying `/api` → `http://localhost:3000`.
- Database: PostgreSQL (example: `postgresql://postgres:***@localhost:9147/bicats`).

### 13.3 npm Scripts

**Server:** `dev`, `typecheck`, `db:push`, `db:generate`, `db:migrate`, `db:studio`, `db:seed`, `db:seed:users`, `db:seed:audit`, `db:seed:all`.

**Client:** `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`.

### 13.4 Seed Data (demo)

Seeded accounts (password `password123`): `james@gmail.com` (admin, "James Bond" / Punong Barangay), `jack@gmail.com` (staff), `maria@gmail.com` (secretary), `pedro@gmail.com` (lupon). Seeders populate sample complaints, mediations, and audit entries. `pnpm db:seed` resets demo data.

---

## 14. Testing & Quality

The project currently relies on static checks and manual verification rather than an automated test suite:

- **Server:** `pnpm typecheck` (`tsc --noEmit`) — clean.
- **Client:** `tsc -b --force` and `pnpm lint` (oxlint) — baseline 0 errors / 18 warnings; `pnpm build` succeeds.
- **Manual/API verification:** endpoint smoke tests via HTTP (e.g., filing a complaint, PATCH settings + audit confirmation).

**Recommended next steps:** add integration tests for the complaint workflow (filing → status → deadline → escalation), auth/refresh rotation, and RBAC boundaries; add unit tests for `computeNextDueAt`, `complaintRisk`, `escalatedPriority`, and phone normalization.

---

## 15. Deployment & Operations

### 15.1 Production Considerations

- Build the client (`vite build`) and serve `dist/` via a static host/reverse proxy; proxy `/api` to the Node server.
- Set `NODE_ENV=production` (enables `secure`/`SameSite=None` cookies and `trust proxy`), configure `CORS_ORIGIN` to the real origin, and terminate TLS at the proxy.
- Run `prisma migrate deploy` (or `db push` for the prototype) against the production database.
- Persist the `uploads/` directory on durable storage and back it up alongside the database.
- Ensure the SSE endpoint is not buffered by the proxy (disable response buffering; long-lived connections need generous read timeouts).

### 15.2 Operational Runbook (highlights)

| Task | Command |
| --- | --- |
| Apply schema (prototype) | `pnpm db:push` |
| Regenerate Prisma client | `pnpm db:generate` |
| Seed demo data | `pnpm db:seed:all` |
| Inspect data | `pnpm db:studio` |
| Type check API | `pnpm typecheck` |

---

## 16. Known Limitations & Future Work

**Limitations**

- SSE notification registry is in-memory → multi-instance deployments need a shared pub/sub (e.g., Redis) or sticky sessions.
- No automated test suite yet.
- Resident SMS/email are sent synchronously in the request (fire-and-forget); there is no outbox/retry queue, so a provider outage drops that message. Delivery status is not tracked.
- Brevo sending requires a verified sender; until then emails can only go to the account owner.
- `/api/settings` GET is public (needed for the public board/printables); it exposes non-sensitive barangay profile data only.
- `Hearing` supports `location`/`outcome` fields that are not fully surfaced in the UI.
- Some prototype values and data are demo-oriented; `BarangaySettings` defaults are placeholders.

**Suggested roadmap**

1. Automated integration/unit tests for the KP workflow and security boundaries.
2. Outbox/retry queue for SMS/email with delivery-status tracking.
3. Notifications inbox page (full list, filters, bulk actions) building on existing endpoints.
4. Mediation calendar month view with drag-to-reschedule.
5. Public notices bulletin for residents.
6. Admin account actions: activate/deactivate and password reset in the accounts table.
7. CSV export for the complaints register (parity with audit export).
8. Redis-backed event bus and horizontally scalable deployment.

---

## 17. Appendices

### A. Complaint Status Enum

`received`, `summoned`, `mediation`, `conciliation`, `settled`, `certified`, `dismissed`
Terminal: `settled`, `certified`, `dismissed`.

### B. Priority Enum

`low`, `normal`, `high`, `urgent`.

### C. Hearing Enums

`kind`: `mediation`, `conciliation`, `hearing` (UI "Arbitration").
`status`: `scheduled`, `completed`, `cancelled`, `no_show`.

### D. Notification Types

`reminder`, `overdue`, `escalation`, `new_complaint`, `info`.

### E. Audit Actions

`auth.login`, `user.create`, `user.update`, `complaint.status.update`, `complaint.priority.update`, `complaint.bulk_status`, `complaint.reopen`, `hearing.create`, `hearing.update`, `hearing.cancel`, `notice.create`, `notice.update`, `notice.delete`, `setting.update`.

### F. Evidence Allowlist

`image/jpeg → .jpg`, `image/png → .png`, `application/pdf → .pdf`, `video/mp4 → .mp4`. Max 5 files, 10 MB each.

### G. Role Constants

```
INTERNAL_ROLES   = admin, staff, secretary, lupon
CASE_VIEW_ROLES  = admin, staff, secretary, lupon
CASE_WRITE_ROLES = admin, staff, lupon
HEARING_ROLES    = admin, staff, lupon
NOTICE_ROLES     = admin, staff, secretary
ADMIN_ROLES      = admin
```

### H. Change Log

| Version | Date | Summary |
| --- | --- | --- |
| 1.0 | 2026-10-19 | Initial SDD covering the system through commit `074e488` |
| 1.1 | 2026-10-19 | Added resident SMS (UniSMS PH) and email (Brevo) notifications, optional complainant email, and the `sms`/`email`/`notify` modules (§9.5) |
