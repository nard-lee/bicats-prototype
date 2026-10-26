# SOFTWARE DESIGN DESCRIPTOR DOCUMENT

## for

## BICATS
### Barangay Incident & Complaint Action Tracking System

Version 1.5

Prepared by:

- DELOS REYES, PATRICIA ANNE – 20231145@s.ubaguio.edu
- SANTIAGO, MIGUEL RAMON – 20220877@s.ubaguio.edu
- VILLANUEVA, KRISTINE JOY – 20219034@s.ubaguio.edu
- MABINI, ANDREA CLAIRE – 20225510@s.ubaguio.edu
- DOMINGO, RAFAEL LUIS – 20217762@s.ubaguio.edu
- OCAMPO, SOFIA MARIE – 20230021@s.ubaguio.edu

University of Baguio

10/19/2026

> **Document format.** Every page of the printed document carries the running header **BICATS 1.5** and the footer **School of Information Technology — Software Engineering 2 | Page N of M**. This Markdown source mirrors that structure; page breaks, headers, and page numbers are applied when exported to Word/PDF.

---

## Document Sign-off

| DEVELOPERS | REVIEWERS |
| --- | --- |
| DELOS REYES, PATRICIA ANNE<br>Project Lead | DR. ELENA V. MANALO<br>Adviser |
| SANTIAGO, MIGUEL RAMON<br>Lead Programmer | ENGR. RODOLFO A. BAUTISTA<br>Database Reviewer |
| VILLANUEVA, KRISTINE JOY<br>Developer / IS Researcher | HON. ERNESTO P. DALISAY<br>Business Owner (Punong Barangay) |
| MABINI, ANDREA CLAIRE<br>Developer / IS Researcher | |
| DOMINGO, RAFAEL LUIS<br>Developer / IS Researcher | |
| OCAMPO, SOFIA MARIE<br>Developer / IS Researcher | |

---

## Version History

| Version # | Implemented By | Revision Date | Approved By | Approval Date | Reason |
| --- | --- | --- | --- | --- | --- |
| 1.0 | Delos Reyes, Santiago | 10/18/2026 | | | Initial version — barangay complaint system, Katarungang Pambarangay status flow and deadlines |
| 1.1 | Villanueva, Mabini | 10/18/2026 | | | KP case documents, deadline-risk scoring, in-app reminders, evidence upload hardening, admin case UI polish, analytics theming |
| 1.2 | Domingo, Ocampo | 10/19/2026 | | | Audit logs, realtime notifications, role-based access, mediation scheduling, profile page, dark mode |
| 1.3 | Delos Reyes, Santiago | 10/19/2026 | | | Barangay settings, audit and analytics CSV export, custom date/time picker, new-complaint alerts |
| 1.4 | Santiago, Ocampo | 10/19/2026 | | | Resident SMS (UniSMS) and email (Brevo) notifications |
| 1.5 | Santiago, Ocampo | 10/20/2026 | | | Configurable branding, KP deadlines and notification channels; read-only settings for staff; sequential case references |
| 1.6 | Santiago, Ocampo | 10/20/2026 | | | Overdue mediation detection, calendar/status flags, and daily staff alerts for sessions with no recorded outcome |
| 1.7 | Santiago, Ocampo | 10/20/2026 | | | Free-text description required when the complaint type is "Others" |
| 1.8 | Santiago, Ocampo | 10/20/2026 | | | Configurable mediation deadline and one-click completed/no-show actions for overdue mediations |
| 1.9 | Santiago, Ocampo | 10/20/2026 | | | Global mediation views (overdue/upcoming/this week) and notification cleanup (auto-resolve, per-user cap, retention) |
| 1.10 | Santiago, Ocampo | 10/20/2026 | | | Audit log resolves case/account/notice references in targets and historical summaries, flags deleted records, and records old-to-new status changes |

---

## Table of Contents

1. **INTRODUCTION** — 1.1 Purpose · 1.2 Scope · 1.3 Definitions and Acronyms · 1.4 References
2. **METHODOLOGY**
3. **DECOMPOSITION DESCRIPTION** — 3.1 Architecture (System · Logical · Physical) · 3.2 Functional Description (High-level Context Diagram · Data Flow Diagram)
4. **DATA DESIGN** — 4.1 Data Description · 4.2 Data Dictionary
5. **HUMAN INTERFACE DESIGN** — 5.1 Overview of User Interface · 5.1.a Screen Images
6. **APPENDICES** — 6.1 SRS · 6.2 RTM · 6.3 Test Cases · 6.4 Testimonials

---

## List of Figures

| Figure | Title |
| --- | --- |
| Figure 1. | System Architecture |
| Figure 2. | Logical Architecture |
| Figure 3. | Physical Architecture |
| Figure 4. | High-Level Context Diagram |
| Figure 5. | Complaint Filing — Data Flow Diagram |
| Figure 6. | Case Tracking — Data Flow Diagram |
| Figure 7. | Case Management & Status Workflow — Data Flow Diagram |
| Figure 8. | Mediation Scheduling — Data Flow Diagram |
| Figure 9. | Notice Board — Data Flow Diagram |
| Figure 10. | Analytics & Reporting — Data Flow Diagram |
| Figure 11. | Authentication & Audit — Data Flow Diagram |
| Figure 12. | Entity Relationship Diagram (ERD) |

---

# 1 INTRODUCTION

## 1.1 PURPOSE

The purpose of this document is to serve as a comprehensive guide for the development of the **Barangay Incident & Complaint Action Tracking System (BICATS)**. It contains the high-level and functional decomposition, data flow diagrams, user interface designs, database schema, and technical implementation guidelines for the system. This blueprint is intended for a diverse audience: including but not limited to the development team comprised of the project manager, database designer, UI/UX designer, and QA. The developers are responsible for designing, building, and maintaining the system; project managers are tasked with overseeing progress and ensuring requirements are met; and evaluators or reviewers assess system usability, accuracy, and alignment with barangay operations. By translating the Software Requirements Specification (SRS) into a structured and actionable plan, this document ensures that all stakeholders have a clear understanding of the system's architecture and implementation strategy, facilitating a smooth and efficient development process.

## 1.2 SCOPE

BICATS is a comprehensive web-based complaint and dispute management application designed to replace the manual, paper-based processes of a barangay's *Lupong Tagapamayapa* for handling community complaints under the *Katarungang Pambarangay* (KP) framework. It lets residents file complaints and track their progress online, and gives barangay officials a secure back-office to triage cases, schedule mediation, publish notices, and audit all activity.

**The system shall allow its users to:**

- File a complaint online with supporting evidence (photos, PDF, or video) and optional contact details.
- Track the status of a complaint using a reference number and the registered contact number.
- Authenticate staff through secure role-based accounts (admin, staff, secretary, lupon).
- Manage cases through the full KP status workflow (received → summoned → mediation → conciliation → settled / certified / dismissed).
- Schedule and manage mediation, conciliation, and arbitration sessions, flagging past sessions that still have no recorded outcome.
- Triage cases by deadline, with due-soon and overdue flags plus a daily staff alert.
- Publish public advisories on a notice board.
- Generate analytics, reports, and CSV exports of case and audit data.
- Print official KP documents (Summons, Notice of Hearing, Amicable Settlement, Certificate to File Action).
- Notify complainants automatically by SMS and email when a case changes status or a session is scheduled.
- Configure the barangay profile, logo and signatures, signatory titles, public hotlines, KP deadline lengths and notification channels, with read-only access for non-admin staff.

**System Benefits:**

- Eliminates paper-based inefficiencies and lost records.
- Provides 24/7 online complaint filing and status tracking.
- Improves accountability through deadline tracking and automatic reminders.
- Enhances resident experience through digital convenience and proactive notifications.
- Enables data-driven decisions through dashboards and analytics.
- Centralizes the barangay's complaint records for transparency and auditability.

**System Limitations:**

- The current version does not support resident self-service accounts; public users may only file and track complaints. (Planned for a future release.)
- SMS and email delivery depends on third-party providers (UniSMS PH and Brevo); a provider outage drops that message, as there is no retry queue in this release.
- Email delivery requires a verified sender account with the provider.
- Document templates are fixed; there is no in-app template editor or e-signature support.
- The system supports a single barangay instance; multi-barangay tenancy is not yet available.
- The live notification stream uses an in-memory registry, so multi-instance deployments require shared pub/sub or sticky sessions.
- A dedicated mobile application is not yet available in this release; however, development of both Android and iOS versions is planned for future updates.

## 1.3 DEFINITIONS AND ACRONYMS

### Definitions

a. **Architecture** — The structural design of the system, showing its components, layers, and their interaction.

b. **Dashboard** — A graphical interface that displays summary statistics, system functions, and quick access to key features.

c. **Complaint Management** — The module that allows residents to file complaints and lets staff record, view, assign, and update them through the KP workflow.

d. **Katarungang Pambarangay (KP)** — The barangay-level justice system under the Local Government Code that requires mediation and conciliation of disputes before court action.

e. **Mediation / Conciliation / Arbitration** — The three KP settlement proceedings. In the user interface, a scheduled session is labelled "Mediation"; an arbitration session appears as "Arbitration".

f. **Case Status Workflow** — The ordered lifecycle of a complaint: received, summoned, mediation, conciliation, settled, certified, dismissed.

g. **Deadline (Due Date)** — The latest date by which the barangay must take the next KP step; a case past its deadline is flagged "overdue".

h. **Evidence** — Files uploaded with a complaint (images, PDF, or video) that are stored and linked to the complaint record.

i. **Notice Board** — A publicly visible list of advisories published by the barangay.

j. **Notification** — An automatic message to residents (SMS/email) or to staff (in-app) regarding confirmations, reminders, deadlines, or case updates.

k. **Audit Log** — An immutable trail recording who performed which action, when, and from where.

l. **Role-Based Access Control (RBAC)** — A security model that grants capabilities according to a user's role.

m. **Barangay Settings** — The editable barangay profile (name, city, province, officials, contact details) used on letters and printable documents.

n. **Reference Number** — A unique case identifier in the form `BK-<year>-<sequence>-<check>` (e.g. `BK-2026-000001-K7`) shown to residents for tracking. The random check characters keep public tracking codes from being guessed by enumerating the sequence.

o. **Dashboard Analytics** — Reports showing complaint volumes, status distribution, trends, and hotspot puroks.

### Acronyms

a. **BICATS** — Barangay Incident & Complaint Action Tracking System

b. **KP** — Katarungang Pambarangay

c. **SRS** — Software Requirements Specification

d. **SDD** — Software Design Document

e. **FDD** — Feature-Driven Development

f. **MVC** — Model–View–Controller

g. **SPA** — Single Page Application

h. **API** — Application Programming Interface

i. **REST** — Representational State Transfer

j. **CRUD** — Create, Read, Update, Delete

k. **RBAC** — Role-Based Access Control

l. **JWT** — JSON Web Token

m. **SSE** — Server-Sent Events

n. **CSRF** — Cross-Site Request Forgery

o. **ORM** — Object-Relational Mapping

p. **DBMS** — Database Management System

q. **ERD** — Entity Relationship Diagram

r. **UI** — User Interface

s. **UX** — User Experience

t. **QA** — Quality Assurance

u. **CSV** — Comma-Separated Values

v. **PII** — Personally Identifiable Information

w. **WCAG** — Web Content Accessibility Guidelines

## 1.4 REFERENCES

Barangay Justice Program. (n.d.). *Katarungang Pambarangay handbook*. Department of the Interior and Local Government.

Congress of the Philippines. (1991). *Local Government Code of 1991 (Republic Act No. 7160)* — Book III, Title I, Chapter 7: Katarungang Pambarangay. Republic of the Philippines.

Department of Information and Communications Technology. (2012). *Data Privacy Act of 2012 (Republic Act No. 10173)*. Republic of the Philippines. https://www.privacy.gov.ph/data-privacy-act/

Congress of the Philippines. (2000). *Electronic Commerce Act of 2000 (Republic Act No. 8792)*. Republic of the Philippines. https://ecommerce.dti.gov.ph/

Fielding, R., Gettys, J., Mogul, J., Frystyk, H., Masinter, L., Leach, P., & Berners-Lee, T. (1999). *RFC 2616: Hypertext Transfer Protocol — HTTP/1.1*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc2616

Rescorla, E. (2000). *RFC 2818: HTTP over TLS*. Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc2818

PostgreSQL Global Development Group. (2024). *PostgreSQL 16 documentation*. https://www.postgresql.org/docs/16/index.html

Open Worldwide Application Security Project. (2024). *OWASP Application Security Verification Standard (ASVS)*. https://owasp.org/www-project-application-security-verification-standard/

World Wide Web Consortium. (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*. https://www.w3.org/TR/WCAG21/

Google. (n.d.). *Material design guidelines*. (Retrieved 2026). https://m3.material.io/

---

# 2 METHODOLOGY

The development of BICATS adopts the **Feature-Driven Development (FDD)** methodology. FDD is chosen because the system requires iterative delivery, clear progress tracking, and alignment with barangay processes such as complaint intake, KP case handling, mediation scheduling, and reporting.

## Team Characteristics Alignment

a. **Small Team Size:** FDD works effectively with our six-member development team.

- The BICATS development team consists of one Project Lead, one Lead Programmer, and four Developers/IS Researchers. The Project Lead oversees the project timeline, ensures that requirements are met, and coordinates with the business owner, while the Lead Programmer is responsible for the system's core architecture and technical decisions. The Developers/IS Researchers design and implement features, maintain documentation, and conduct testing. This structure allows the team to work in parallel on development and documentation tasks, ensuring alignment between technical implementation and system requirements.

b. **Academic Timeline:** FDD supports semester-based development cycles with clear milestones (based on the SRS Gantt chart).

- **Phase 1 (Weeks 1–4): Domain Modeling & Planning** — Requirements analysis completion, system architecture design, feature prioritization using the MoSCoW method.
- **Phase 2 (Weeks 5–8): Must-Have Features Development** — Authentication and roles, public complaint filing, case tracking, complaints register.
- **Phase 3 (Weeks 9–12): Core System Integration** — KP status workflow and deadlines, mediation scheduling, analytics, printable documents, automated reminders.
- **Phase 4 (Weeks 13–16): Enhancement & Deployment** — Should-Have features (notifications, audit log, settings, exports), final testing and documentation, deployment and handover.

## System Characteristics Alignment

a. **Well-Defined Domain:** Barangay complaint handling and KP procedures have clear, statutory processes.

b. **Feature-Rich Application:** Multiple distinct features (filing, tracking, workflow, scheduling, reporting, notifications) benefit from a feature-focused approach.

c. **Incremental Delivery:** Stakeholders can see working features early in development.

d. **Manageable Complexity:** Each feature can be developed and tested independently.

## FDD Process Activities

a. **Develop Overall Model**

- Domain modeling workshops with the barangay (business owner).
- System architecture definition.
- Technology stack selection (React + TypeScript, Express, PostgreSQL, Prisma).

b. **Build Features List (based on the MoSCoW method from the SRS)**

- **Version 1.0 — MUST HAVE:**

  - Staff authentication and role-based access control
  - Public complaint filing with evidence upload
  - Public case tracking by reference and contact number
  - Complaints register and case detail with timeline
  - Katarungang Pambarangay status workflow with deadlines
  - Mediation scheduling

- **Version 2.0 — SHOULD HAVE:**

  - Analytics and reporting with CSV export
  - Automated deadline reminders
  - Audit log
  - Notice board
  - Printable KP documents
  - Resident SMS/email notifications
  - Barangay settings

- **Version 3.0 — COULD HAVE:**

  - Notifications inbox page with filters and bulk actions
  - Mediation calendar month view with drag-to-reschedule
  - Public resident accounts and self-service portal
  - Dedicated mobile applications
  - Multi-barangay tenancy

c. **Plan by Feature**

- Feature prioritization based on resident and barangay value.
- Resource allocation per team member.
- Development sequence planning.
- Testing and integration strategies.

d. **Design by Feature**

- Feature-specific database design.
- User interface mockups and wireframes.
- API endpoint specifications.
- Security and validation requirements.

e. **Build by Feature**

- Individual feature development.
- Unit testing and code review.
- Feature integration and testing.
- Stakeholder demonstration and feedback.

## Development Practices Adapted for Academic Environment

a. **Weekly Progress Reviews:** Regular team meetings to track feature completion.
b. **Peer Programming:** Collaborative coding sessions for knowledge sharing.
c. **Documentation Focus:** Emphasis on technical documentation for academic evaluation.
d. **Version Control:** Git workflow with feature branches for each major functionality.
e. **Stakeholder Engagement:** Regular demos to the barangay for feedback.

## Quality Assurance Approach

a. **Iterative Feature Testing:** Each feature undergoes multiple test–debug–retest cycles until acceptance criteria are met.
b. **Peer Review Cycles:** Code review by team members with iterative revisions until code-quality standards are achieved.
c. **User Acceptance Iterations:** Multiple demo–feedback–revision cycles with barangay validation of each completed feature.
d. **Continuous Improvement:** Each testing phase involves iterative cycles of testing, feedback incorporation, and refinement until quality standards are met.

---

# 3 DECOMPOSITION DESCRIPTION

## 3.1 ARCHITECTURE

### 3.1.A SYSTEM ARCHITECTURE

BICATS follows a **client–server, three-tier architecture** that combines an MVC-style logical separation with a modern single-page application (SPA) front end.

**Figure 1. System Architecture**

```
+---------------------------------------------------------------+
|                          CLIENT TIER                          |
|   React 19 SPA (Vite) - TypeScript - Tailwind CSS - Radix UI  |
|   Public: File complaint, Track case, Notice board            |
|   Staff : Login, Dashboard, Register, Case detail, Mediation, |
|           Analytics, Audit, Settings, Profile                 |
+------------------------------+--------------------------------+
                               |  HTTPS / JSON (multipart for filing)
                               |  + CSRF token header
                               v
+---------------------------------------------------------------+
|                        APPLICATION TIER                       |
|   Express 5 REST API (Node.js + TypeScript)                   |
|   Controllers  ->  Services  ->  Prisma ORM                   |
|   Cross-cutting: requireAuth (RBAC), CSRF, rate limiting,     |
|   validation (Zod), audit logging, SSE notifications,         |
|   reminder job (scheduler)                                    |
+------------------+--------------------------+-----------------+
                   |                          |
                   v                          v
+---------------------------+   +-------------------------------+
|         DATA TIER         |   |     EXTERNAL SERVICES         |
|   PostgreSQL (Prisma)      |   |  UniSMS PH  - SMS delivery    |
|   uploaded evidence files  |   |  Brevo      - email delivery  |
+---------------------------+   +-------------------------------+
```

The client tier renders the user interface and captures input. The application tier exposes a REST API, enforces access control, runs business logic (KP deadlines, escalation, mediation mirroring), persists data, and dispatches notifications. The data tier stores records and evidence files. External services provide outbound SMS and email for residents.

### 3.1.B LOGICAL ARCHITECTURE

The logical architecture separates the system into three layers that map to the MVC pattern:

- **Presentation Layer (View)** — The React SPA: complaint form, tracking page, staff dashboard, complaints register, case detail, mediation calendar, analytics, and administrative screens. It is responsible for rendering data and capturing user input.
- **Application Layer (Controller)** — The Express routes and controllers. They receive requests, validate input with Zod schemas, enforce `requireAuth` role checks, and coordinate with services. Controllers remain thin; business rules live in services.
- **Data Layer (Model)** — The service functions and the Prisma ORM. Services encapsulate domain logic (deadline computation, status transitions, mediation-date mirroring, notification fan-out), while Prisma maps objects to PostgreSQL tables.

This separation keeps presentation, control, and data management clearly divided, making the system more organized, maintainable, and scalable.

**Figure 2. Logical Architecture**

```
  +---------------------------- Presentation (View) ---------------------------+
  |  React SPA pages & feature modules  -  API client (ky)  -  SSE client      |
  +-------------------------------------+--------------------------------------+
                                        | REST / JSON
  +-------------------------------------v--------------------------------------+
  |                        Application Layer (Controller)                       |
  |  Routes  ->  requireAuth (RBAC)  ->  Zod validation  ->  Controllers        |
  +-------------------------------------+--------------------------------------+
                                        | service calls
  +-------------------------------------v--------------------------------------+
  |                            Data Layer (Model)                              |
  |  Services (domain rules, notifications)  ->  Prisma ORM  ->  PostgreSQL     |
  +---------------------------------------------------------------------------+
```

### 3.1.C PHYSICAL ARCHITECTURE

The physical architecture is a **three-tier client–server deployment**:

- **Client tier** — End-user devices (desktop or mobile browsers) running the SPA, accessed over HTTPS.
- **Application tier** — The Node.js/Express API server. In development it runs under `tsx watch`; in production it runs as a compiled Node process. It hosts the business logic, the reminder scheduler, and the in-memory SSE notification registry.
- **Data tier** — The PostgreSQL database (accessed through the Prisma pg adapter) and the local `uploads/` directory that stores evidence files.

Interaction between tiers occurs through HTTP requests and responses (with multipart form data for complaint filing and a CSRF token header for state-changing requests). The application tier additionally reaches out to the UniSMS PH and Brevo APIs over HTTPS to deliver resident notifications.

**Figure 3. Physical Architecture**

```
  [ Browser ] --HTTPS--> [ Express API :3000 ] --SQL--> [ PostgreSQL :9147 ]
                                 |      |
                                 |      +--> [ uploads/ evidence files ]
                                 |
                                 +--HTTPS--> [ UniSMS PH ]  (SMS)
                                 +--HTTPS--> [ Brevo    ]  (email)
```

## 3.2 FUNCTIONAL DESCRIPTION

### 3.2.A HIGH-LEVEL CONTEXT DIAGRAM

**Figure 4. BICATS High-Level Context Diagram**

```
        +----------------+                        +-----------------------+
        |   Resident     |                        |   Barangay Officials  |
        |   (public)     |                        |  admin/staff/secretary|
        +-------+--------+                        |        /lupon         |
                |                                 +-----------+-----------+
    file complaint |                                           | manage cases
    track status   |                                           | schedule mediation
    view notices   |                                           | publish notices
                +--v-------------------------------------------v--+
                |                    BICATS                        |
                |  public web app  +  REST API  +  PostgreSQL      |
                |  reminders  +  analytics  +  printable documents |
                +--+-------------------------------------------+--+
                   |                                           |
        SMS / email |                                           | notices &
        notifications                                           | documents
                   v                                           v
        +------------------------+                  +----------------------+
        | complainant's phone /  |                  | Public notice board  |
        | email inbox            |                  | & printed KP letters |
        +------------------------+                  +----------------------+
```

The system exchanges data with four external parties: residents (who file and track complaints and read notices), barangay officials (who operate the back office), the SMS/email providers (which deliver resident notifications), and the public notice board / printed documents (outputs of the system).

### 3.2.B DATA FLOW DIAGRAM

#### 01 Data Flow Diagrams (Low-level Context Diagrams)

**a. Complaint Filing**

**Figure 5. Complaint Filing — Data Flow Diagram**

```
 Resident                    BICATS API                  PostgreSQL / Storage
    |  submit complaint +           |                              |
    |  evidence (multipart) ------> |  validate (Zod)              |
    |                               |  rate-limit check            |
    |                               |  generate BK-<year>-<seq>-<check>   |
    |                               |  process evidence upload ---->| store files in uploads/
    |                               |  create complaint ----------->| INSERT Complaint
    |                               |  create initial StatusUpdate->| INSERT StatusUpdate
    |                               |  notify staff ------------->  | INSERT Notification (+SSE)
    |  <--- reference number -------|                              |
    |                               |  (fire-and-forget) SMS/email |
```

**b. Case Tracking**

**Figure 6. Case Tracking — Data Flow Diagram**

```
 Resident                BICATS API                     PostgreSQL
    |  reference + contact      |                            |
    |  number ----------------> |  normalize contact         |
    |                           |  lookup ------------------>| SELECT Complaint
    |                           |  if match: build public view|
    |  <--- status, timeline,   |  (contact masked)          |
    |        hearing date ------|                            |
```

**c. Case Management & Status Workflow**

**Figure 7. Case Management & Status Workflow — Data Flow Diagram**

```
 Staff              BICATS API                          PostgreSQL
   |  update status          |                               |
   |  (authenticated) ------>| requireAuth (role check)      |
   |                         | validate + compute deadline   |
   |                         | record status ---------------->| UPDATE Complaint
   |                         | mirror mediation to Hearing -->| INSERT/UPDATE Hearing
   |                         | write audit entry ------------>| INSERT AuditLog
   |                         | notify internal + complainant->| INSERT Notification
   |  <--- updated case -----|                               | (+ SMS/email)
```

**d. Mediation Scheduling**

**Figure 8. Mediation Scheduling — Data Flow Diagram**

```
 Staff              BICATS API                          PostgreSQL / Providers
   |  create/reschedule/     |                               |
   |  cancel session ------->| requireAuth (HEARING_ROLES)   |
   |                         | validate schedule             |
   |                         | create/update Hearing ------->| INSERT/UPDATE Hearing
   |                         | write audit entry ----------->| INSERT AuditLog
   |                         | notify complainant (SMS/email)| -> UniSMS / Brevo
   |  <--- confirmation -----|                               |
```

**e. Notice Board**

**Figure 9. Notice Board — Data Flow Diagram**

```
 Secretary/Admin        BICATS API                    PostgreSQL
      |  create/update/delete  |                          |
      |  notice -------------->| requireAuth (NOTICE_ROLES)|
      |                        | validate + persist ----->| INSERT/UPDATE/DELETE Notice
      |                        | write audit entry ------>| INSERT AuditLog
 Public |  view published ------->| (public GET) ---------->| SELECT published notices
```

**f. Analytics & Reporting**

**Figure 10. Analytics & Reporting — Data Flow Diagram**

```
 Staff              BICATS API                       PostgreSQL
   |  open analytics /       |                            |
   |  apply date filters --->| requireAuth (CASE_VIEW)    |
   |                         | aggregate (counts, trends, |
   |                         | hotspots via SQL/Prisma)-->| SELECT aggregates
   |  <--- KPIs + charts ----|                            |
   |  export CSV ----------->| build CSV from filtered ---|
   |  <--- .csv file --------|
```

**g. Authentication & Audit**

**Figure 11. Authentication & Audit — Data Flow Diagram**

```
 Staff             BICATS API                       PostgreSQL
   |  login --------------->| verify password (argon2)   |
   |                        | issue JWT + refresh cookie |
   |  <--- session ---------| ------------------------->| INSERT/ROTATE RefreshToken
   |                        | write audit entry -------->| INSERT AuditLog (auth.login)
   |  subsequent requests ->| requireAuth: verify JWT +  |
   |                        | reload user (role, active) |
```

---

# 4 DATA DESIGN

## 4.1 DATA DESCRIPTION

### ERD of the System

**Figure 12. Entity Relationship Diagram (ERD)**

```
  +----------------+          +---------------------+
  |      User      |1        *|    RefreshToken     |
  |----------------|----------|---------------------|
  | id (PK)        |          | id (PK)             |
  | fullName       |          | token (UQ)          |
  | position       |          | userId (FK)         |
  | email (UQ)     |          | expiresAt           |
  | phone (UQ)     |          | createdAt           |
  | username (UQ)  |          | revokedAt           |
  | passwordHash   |          +---------------------+
  | role           |
  | isActive       |
  | createdAt      |
  | updatedAt      |
  +--+---+---+---+---+---+---------------------------+
     |   |   |   |   |   | 1
     |   |   |   |   |   +---------------------+        +---------------------+
     |   |   |   |   |                       |1      *|       Evidence      |
     |   |   |   |   |                +------v---------|---------------------|
     |   |   |   |   |                |   Complaint    | id (PK)             |
     |   |   |   |   |                |----------------| complaintId (FK)    |
     |   |   |   |   |                | id (PK)        | originalName        |
     |   |   |   |   |                | reference (UQ) | storedName (UQ)     |
     |   |   |   |   |                | complainant... | mimeType            |
     |   |   |   |   |                | respondent...  | size                |
     |   |   |   |   |                | complaintType  | createdAt           |
     |   |   |   |   |                | incidentAt     +---------------------+
     |   |   |   |   |                | narrative      |
     |   |   |   |   |                | status         |       +---------------------+
     |   |   |   |   |                | dueAt          |1     *|    StatusUpdate     |
     |   |   |   |   |                | consentAt      +--------|---------------------|
     |   |   |   |   |                | viewedAt       |        | id (PK)             |
     |   |   |   |   |                | createdAt/upd  |        | complaintId (FK)    |
     |   |   |   |   |                +--+---+---+-----+        | status              |
     |   |   |   |   |                   |   |   | 1            | publicNote          |
     |   |   |   |   |                   |   |   +------------> | internalNote        |
     |   |   |   |   |                   |   |                  | hearingAt           |
     |   |   |   |   |                   |   |                  | createdById (FK)    |
     |   |   |   |   |                   |   |                  | createdAt           |
     |   |   |   |   |                   |   |                  +----------+----------+
     |   |   |   |   |                   |   | 1                         * |
     |   |   |   |   |                   |   +------------+  +-----------+----------+
     |   |   |   |   |                   |                |  |      Hearing         |
     |   |   |   |   |                   |                |  |--------------------- |
     |   |   |   |   |                   |                |  | id (PK)              |
     |   |   |   |   |                   |                |  | complaintId (FK)     |
     |   |   |   |   |                   |                |  | scheduledAt          |
     |   |   |   |   |                   |                |  | kind (med/conc/hear) |
     |   |   |   |   |                   |                |  | status               |
     |   |   |   |   |                   |                |  | location / notes     |
     |   |   |   |   |                   |                |  | outcome              |
     |   |   |   |   |                   |                |  | createdById (FK)     |
     |   |   |   |   |                   |                |  | createdAt/updatedAt  |
     |   |   |   |   |                   |                |  +----------+-----------+
     |   |   |   |   |                   |                |            *|
     |   |   |   |   |                   |                +-------------+
     |   |   |   |   |                   |1
     |   |   |   |   |            +------v-------------+
     |   |   |   |   |            |   Notification      |
     |   |   |   |   |            |---------------------|
     |   |   |   |   |            | id (PK)             |
     |   |   |   |   |            | userId (FK)         |
     |   |   |   |   |            | type                |
     |   |   |   |   |            | title / body        |
     |   |   |   |   |            | complaintId (FK)    |
     |   |   |   |   |            | reference           |
     |   |   |   |   |            | dedupeKey (UQ)      |
     |   |   |   |   |            | readAt / createdAt  |
     |   |   |   |   |            +---------------------+
     |   |   |   |   |1
     |   |   |   |   +-------------------> Notice (id, title, body, isPublished,
     |   |   |   |                          createdById FK, createdAt)
     |   |   |   |1
     |   |   |   +-----------------------> AuditLog (id, actorId FK, actorName,
     |   |   |                              actorRole, action, entityType, entityId,
     |   |   |                              summary, meta, ip, createdAt)
     |   |   |1
     |   |   +---------------------------> (User relations: statusUpdates, notices,
     |   |                                  notifications, hearings, auditLogs)
     |   |1
     |   +-------------------------------> RefreshToken
     |
     +-----------------------------------> (BarangaySettings is a standalone singleton)

  +------------------------------+
  |       BarangaySettings       |  (single row, id = 1)
  |------------------------------|
  | id (PK)                      |
  | barangayName / city          |
  | province / address           |
  | contactNumber / email        |
  | hotline / tanodNumber        |
  | officeHours                  |
  | logoUrl / *SignatureUrl      |
  | punongBarangay/luponChairman |
  | punongTitle / luponTitle     |
  | deadline* / riskWindowDays   |
  | notify*Sms / notify*Email    |
  | updatedAt                    |
  +------------------------------+

  +------------------------------+
  |       ReferenceCounter       |  (one row per year)
  |------------------------------|
  | year (PK)                    |
  | lastValue                    |
  | createdAt                    |
  +------------------------------+
```

### Discussion

This ERD represents the BICATS system and connects directly to the functions described in the SRS.

- **User Table** — Stores all staff account information: full name, position, email, phone, username, password hash, and role (admin, staff, secretary, or lupon). It supports authentication and role-based access control. There is no public registration.
- **RefreshToken Table** — Stores hashed refresh tokens linked to a user, enabling secure session renewal and revocation.
- **Complaint Table** — The core record. It holds complainant details, respondent details, incident information, the KP status, and the next-step deadline (`dueAt`). It links to evidence, timeline entries, notifications, and hearings (Hearing is the internal name for a mediation/conciliation/arbitration session).
- **Evidence Table** — Stores metadata for uploaded files linked to a complaint; the binary files live in the `uploads/` directory.
- **StatusUpdate Table** — The case timeline. Each status change records a public note, an optional internal note, and an optional mediation date (`hearingAt`) that is mirrored to a Hearing record.
- **Hearing Table** — Scheduled mediation, conciliation, or arbitration sessions, including date, kind, status, location, notes, and outcome.
- **Notice Table** — Public advisories with a published flag for the home-page notice board.
- **Notification Table** — In-app notifications for staff (reminders, overdue alerts, escalations, missed-session alerts, new-complaint alerts), deduplicated by `dedupeKey`, capped at the newest 100 per user, and expired after 90 days. Missed-session alerts are removed when the session is completed, cancelled, or rescheduled.
- **AuditLog Table** — An immutable trail of who did what, when, and from which IP, with actor name/role snapshots that survive account changes.
- **BarangaySettings Table** — A singleton row (id = 1) holding the barangay profile, branding assets, signatory names and printed titles, public hotlines, configurable KP deadline lengths and the per-event SMS/email notification toggles used across the system.
- **ReferenceCounter Table** — One row per calendar year holding the last sequence number issued, used to generate case references (`BK-2026-000001-K7`: sequence plus two random check characters).

## 4.2 DATA DICTIONARY

### Table 1. Data Dictionary — USER TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier of the staff account | INT | Required | PK | 1 |
| fullName | Complete name of the staff member | VARCHAR(120) | Required | None | "Maria L. Santos" |
| position | Official position / designation | VARCHAR(120) | Required | None | "Barangay Secretary" |
| email | Email address used for login | VARCHAR(150) | Required | Unique | maria@barangay.gov.ph |
| phone | Mobile number | VARCHAR(20) | Required | Unique | 09171234567 |
| username | Login username | VARCHAR(50) | Required | Unique | maria.santos |
| passwordHash | Argon2 password hash | TEXT | Required | None | $argon2id$v=19$... |
| role | Access role | ENUM('admin','staff','secretary','lupon') | Required | None | admin |
| isActive | Whether the account can log in | BOOLEAN | Required | None | true |
| createdAt | Creation timestamp | TIMESTAMP | Required | None | 2026-10-18 09:00:00 |
| updatedAt | Last update timestamp | TIMESTAMP | Required | None | 2026-10-19 13:19:25 |

### Table 2. Data Dictionary — REFRESH TOKEN TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier | INT | Required | PK | 12 |
| token | Unique refresh token value | VARCHAR(255) | Required | Unique | 8f3a...c9e |
| userId | Owner of the token (FK to User) | INT | Required | FK | 1 |
| expiresAt | Expiration date/time | TIMESTAMP | Required | None | 2026-11-18 09:00:00 |
| createdAt | Issued date/time | TIMESTAMP | Required | None | 2026-10-19 09:00:00 |
| revokedAt | Revocation date/time (null if active) | TIMESTAMP | Optional | None | NULL |

### Table 3. Data Dictionary — COMPLAINT TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier of the complaint | INT | Required | PK | 356 |
| reference | Human-readable case reference | VARCHAR(20) | Required | Unique | BK-2026-000001-K7 |
| complainantName | Name of the complainant | VARCHAR(120) | Required | None | "Juan D. Dela Cruz" |
| complainantAge | Age of the complainant | INT | Required | None | 34 |
| complainantPurok | Purok/zone of the complainant (hotspot analytics) | VARCHAR(80) | Required | None | "Purok 3" |
| complainantContact | Contact number as entered | VARCHAR(20) | Required | None | 09941841972 |
| contactNormalized | Digits-only contact used for tracking lookup | VARCHAR(20) | Required | Index | 09941841972 |
| complainantEmail | Optional email for status notifications | VARCHAR(150) | Optional | None | juan@email.com |
| complainantAddress | Home address of the complainant | VARCHAR(200) | Required | None | "12 Purok 3, Baguio" |
| respondentName | Name of the respondent | VARCHAR(120) | Required | None | "Pedro R. Reyes" |
| respondentAddress | Address of the respondent | VARCHAR(200) | Optional | None | "14 Purok 3, Baguio" |
| relationship | Relationship between parties | VARCHAR(80) | Optional | None | "Neighbor" |
| complaintType | Category of the complaint | VARCHAR(80) | Required | Index | "Noise disturbance" |
| complaintTypeOther | Free-text description when the type is "Others" | VARCHAR(150) | Optional | None | "Videoke noise after 10 PM" |
| incidentAt | Date/time of the incident | TIMESTAMP | Required | Index | 2026-10-15 22:30:00 |
| incidentPlace | Location of the incident | VARCHAR(200) | Required | None | "Purok 3 basketball court" |
| narrative | Free-text account of the complaint | TEXT | Required | None | "Loud videoke every night..." |
| status | KP status | ENUM('received','summoned','mediation','conciliation','settled','certified','dismissed') | Required | Index | received |
| dueAt | Deadline for the next KP step (null if terminal) | TIMESTAMP | Optional | Index | 2026-10-18 09:00:00 |
| consentAt | Data-privacy consent timestamp | TIMESTAMP | Required | None | 2026-10-15 10:00:00 |
| viewedAt | First staff-open timestamp (null = unopened) | TIMESTAMP | Optional | Index | 2026-10-15 11:20:00 |
| createdAt | Creation timestamp | TIMESTAMP | Required | Index | 2026-10-15 10:00:00 |
| updatedAt | Last update timestamp | TIMESTAMP | Required | None | 2026-10-19 13:19:25 |

### Table 4. Data Dictionary — EVIDENCE TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier | INT | Required | PK | 900 |
| complaintId | Owning complaint (FK to Complaint) | INT | Required | FK | 356 |
| originalName | Uploaded file name | VARCHAR(200) | Required | None | loud_noise.jpg |
| storedName | Unique stored file name | VARCHAR(255) | Required | Unique | 1712-ea4f.jpg |
| mimeType | File content type | VARCHAR(100) | Required | None | image/jpeg |
| size | File size in bytes | INT | Required | None | 348211 |
| createdAt | Upload timestamp | TIMESTAMP | Required | None | 2026-10-15 10:00:05 |

### Table 5. Data Dictionary — STATUS UPDATE TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier | INT | Required | PK | 1280 |
| complaintId | Related complaint (FK to Complaint) | INT | Required | FK | 356 |
| status | Status recorded at this step | ENUM(...) | Required | None | summoned |
| publicNote | Note shown to the resident | TEXT | Optional | None | "Summons issued to respondent." |
| internalNote | Note visible only to staff | TEXT | Optional | None | "Respondent to be served by Brgy. Tanod." |
| hearingAt | Mediation date carried by this update | TIMESTAMP | Optional | Index | 2026-10-22 20:07:00 |
| createdById | Staff who made the change (FK to User) | INT | Optional | FK | 1 |
| createdAt | Timestamp of the change | TIMESTAMP | Required | None | 2026-10-19 09:45:00 |

### Table 6. Data Dictionary — HEARING TABLE (mediation / conciliation / arbitration)

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier | INT | Required | PK | 210 |
| complaintId | Related complaint (FK to Complaint) | INT | Required | FK | 356 |
| scheduledAt | Date/time of the session | TIMESTAMP | Required | Index | 2026-10-22 20:07:00 |
| kind | Session type | ENUM('mediation','conciliation','hearing') | Required | None | mediation |
| status | Session state | ENUM('scheduled','completed','cancelled','no_show') | Required | Index | scheduled |
| location | Venue | VARCHAR(200) | Optional | None | "Barangay Hall" |
| notes | Internal notes | TEXT | Optional | None | "Both parties notified." |
| outcome | Result of the session | TEXT | Optional | None | "Settled amicably." |
| createdById | Staff who scheduled it (FK to User) | INT | Optional | FK | 1 |
| createdAt | Creation timestamp | TIMESTAMP | Required | None | 2026-10-19 09:45:00 |
| updatedAt | Last update timestamp | TIMESTAMP | Required | None | 2026-10-19 09:45:00 |

### Table 7. Data Dictionary — NOTICE TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier | INT | Required | PK | 44 |
| title | Notice headline | VARCHAR(200) | Required | None | "Barangay Assembly" |
| body | Notice content | TEXT | Required | None | "Assembly on Oct 25, 9 AM..." |
| isPublished | Whether it shows publicly | BOOLEAN | Required | Index | true |
| createdById | Author (FK to User) | INT | Optional | FK | 3 |
| createdAt | Creation timestamp | TIMESTAMP | Required | Index | 2026-10-18 08:00:00 |

### Table 8. Data Dictionary — NOTIFICATION TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier | INT | Required | PK | 5012 |
| userId | Recipient staff (FK to User) | INT | Required | FK | 1 |
| type | Notification category | ENUM('reminder','overdue','escalation','hearing_overdue','new_complaint','info') | Required | None | hearing_overdue |
| title | Short headline | VARCHAR(200) | Required | None | "Case due tomorrow" |
| body | Notification text | TEXT | Required | None | "BK-2026-000001-K7 is due by Oct 22." |
| complaintId | Related complaint (FK to Complaint) | INT | Optional | FK | 356 |
| reference | Case reference (denormalized) | VARCHAR(20) | Optional | None | BK-2026-000001-K7 |
| dedupeKey | Idempotency key (one per event/recipient) | VARCHAR(200) | Optional | Unique | reminder:356:2026-10-21:1 |
| readAt | Read timestamp (null = unread) | TIMESTAMP | Optional | Index | NULL |
| createdAt | Creation timestamp | TIMESTAMP | Required | Index | 2026-10-19 08:00:00 |

### Table 9. Data Dictionary — AUDIT LOG TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Unique identifier | INT | Required | PK | 8801 |
| actorId | Acting user (FK to User) | INT | Optional | FK | 1 |
| actorName | Actor name snapshot | VARCHAR(120) | Optional | None | "James Bond" |
| actorRole | Actor role snapshot | VARCHAR(30) | Optional | None | admin |
| action | Action code | VARCHAR(80) | Required | Index | complaint.status.update |
| entityType | Target entity type | ENUM('complaint','user','hearing','notice','setting','auth') | Required | Index | complaint |
| entityId | Target entity id | INT | Optional | None | 356 |
| summary | Human-readable summary | VARCHAR(255) | Required | None | "Status changed to summoned" |
| meta | Additional structured data | JSON | Optional | None | {"from":"received","to":"summoned"} |
| ip | Source IP address | VARCHAR(45) | Optional | None | 2001:4451:53d:8a00::1 |
| createdAt | Timestamp of the action | TIMESTAMP | Required | Index | 2026-10-19 09:45:00 |

### Table 10. Data Dictionary — BARANGAY SETTINGS TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| id | Singleton identifier (always 1) | INT | Required | PK | 1 |
| barangayName | Barangay name | VARCHAR(120) | Required | None | "Barangay Kabayanihan" |
| city | City / municipality | VARCHAR(120) | Required | None | "City of Baguio" |
| province | Province | VARCHAR(120) | Required | None | "Benguet" |
| address | Street address | VARCHAR(200) | Required | None | "Barangay Hall, Purok 1" |
| contactNumber | Office contact number | VARCHAR(30) | Required | None | 074-442-0000 |
| email | Office email | VARCHAR(150) | Required | None | barangay@email.gov.ph |
| officeHours | Office hours | VARCHAR(120) | Required | None | "Monday–Friday, 8:00 AM – 5:00 PM" |
| punongBarangay | Punong Barangay (signatory) | VARCHAR(120) | Required | None | "Hon. Mario D. Santos" |
| luponChairman | Lupon Chairman (signatory) | VARCHAR(120) | Required | None | "Mr. Pedro A. Reyes" |
| logoUrl | Uploaded barangay logo path (empty = default seal) | VARCHAR(255) | Optional | None | /uploads/logo.png |
| punongSignatureUrl | Uploaded Punong Barangay signature image | VARCHAR(255) | Optional | None | /uploads/punong-signature.png |
| luponSignatureUrl | Uploaded Lupon Chairman signature image | VARCHAR(255) | Optional | None | /uploads/lupon-signature.png |
| punongTitle | Title printed below the Punong Barangay's name | VARCHAR(120) | Required | None | "Punong Barangay" |
| luponTitle | Title printed below the Lupon Chairman's name | VARCHAR(120) | Required | None | "Lupong Tagapamayapa Chairman" |
| hotline | Public barangay hotline | VARCHAR(30) | Optional | None | 0917 000 0000 |
| tanodNumber | Barangay tanod / duty desk number | VARCHAR(30) | Optional | None | 0918 111 2222 |
| deadlineReceived | Days allowed to issue the summons after filing | INT | Required | None | 3 |
| deadlineSummoned | Days allowed between summons and mediation | INT | Required | None | 15 |
| deadlineMediation | Days allowed to conclude mediation | INT | Required | None | 15 |
| deadlineConciliation | Days allowed for conciliation | INT | Required | None | 15 |
| riskWindowDays | Days before a deadline when a case is flagged "due soon" | INT | Required | None | 3 |
| notifyStatusSms | Send status-change SMS to complainants | BOOLEAN | Required | None | true |
| notifyStatusEmail | Send status-change email to complainants | BOOLEAN | Required | None | true |
| notifyMediationSms | Send mediation-schedule SMS to complainants | BOOLEAN | Required | None | true |
| notifyMediationEmail | Send mediation-schedule email to complainants | BOOLEAN | Required | None | true |
| notifyCancelledSms | Send case-cancellation SMS to complainants | BOOLEAN | Required | None | true |
| notifyCancelledEmail | Send case-cancellation email to complainants | BOOLEAN | Required | None | true |
| updatedAt | Last update timestamp | TIMESTAMP | Required | None | 2026-10-19 10:00:00 |

### Table 11. Data Dictionary — REFERENCE COUNTER TABLE

| Field Name | Description | Data Type | Field Type | Key | Example Value |
| --- | --- | --- | --- | --- | --- |
| year | Calendar year of the counter | INT | Required | PK | 2026 |
| lastValue | Last sequence number issued that year | INT | Required | None | 358 |
| createdAt | Counter creation timestamp | TIMESTAMP | Required | None | 2026-01-01 00:00:00 |

---

# 5 HUMAN INTERFACE DESIGN

## 5.1 OVERVIEW OF USER INTERFACE

BICATS presents a clean, responsive interface with two experiences: a **public** experience for residents (file a complaint, track a case, read notices) and a **staff** experience behind authentication (dashboard, registers, scheduling, analytics, administration). The interface is bilingual (English/Filipino) and supports light and dark themes. The sidebar collapses to icon mode, and the top bar holds the language toggle, theme toggle, notification bell, and the signed-in user's name.

### 5.1.a SCREEN IMAGES

> Insert the captured screen image above each numbered list below (as in the source template, one screen per figure).

#### a. File a Complaint

*Screen Objects and Actions:*

- a.1. **Complainant Name** — text input
- a.2. **Age** — numeric input
- a.3. **Purok / Zone** — text input
- a.4. **Contact Number** — text input
- a.5. **Email Address** — text input (optional; enables email updates)
- a.6. **Home Address** — text input
- a.7. **Respondent Name** — text input
- a.8. **Respondent Address** — text input
- a.9. **Relationship** — text input
- a.10. **Complaint Type** — dropdown selection
- a.11. **Date & Time of Incident** — date/time picker
- a.12. **Place of Incident** — text input
- a.13. **Narrative** — multiline text input
- a.14. **Attach Evidence** — file upload (JPG, PNG, PDF, MP4; max 5 files, 10 MB each)
- a.15. **Data-Privacy Consent** — checkbox
- a.16. **Submit Complaint** — button click; on success shows the generated reference number
- a.17. **Cancel / Reset** — button click

#### b. Track a Complaint

- b.1. **Reference Number** — text input
- b.2. **Registered Contact Number** — text input
- b.3. **Track Button** — button click; retrieves the public case view
- b.4. **Status Badge** — read-only indicator of the current KP status
- b.5. **Timeline** — read-only list of public status updates
- b.6. **Next Mediation Date** — read-only display (when scheduled)
- b.7. **Privacy Note** — static text explaining masked contact information

#### c. Staff Login

- c.1. **Email / Username** — text input
- c.2. **Password** — password input
- c.3. **Sign In Button** — button click
- c.4. **Show / Hide Password** — toggle
- c.5. **Error Message** — static text on invalid credentials

#### d. Dashboard

- d.1. **Navigation Panel** — sidebar menu for navigating system modules
- d.2. **Summary Cards** — counts of open, due-soon, overdue, and unopened cases
- d.3. **Recent Complaints Table** — newest cases with reference, type, status, deadline
- d.4. **Notifications Bell** — dropdown of live staff notifications
- d.5. **Quick Actions** — shortcuts to file/register/analytics
- d.6. **Logout** — button click to end the session securely

#### e. Complaints Register

- e.1. **Search Field** — text input (reference or complainant)
- e.2. **Status Filter** — dropdown selection
- e.3. **Type Filter** — dropdown selection
- e.4. **Risk Chips** — one-click filters for open, due-soon, overdue, and unopened cases
- e.5. **Clear Filters** — button click to reset
- e.6. **Complaints Table** — rows with reference, complainant, type, status, deadline, risk
- e.7. **Bulk Selection & Bulk Status** — checkboxes + action to update several cases
- e.8. **View Details** — row action to open the case detail

#### f. Case Detail

- f.1. **Case Header** — reference, status badge, risk indicator
- f.2. **Complainant / Respondent Panels** — read-only party details
- f.3. **Incident Panel** — type, date/time, place, narrative
- f.4. **Evidence Gallery** — thumbnails/links to uploaded files
- f.5. **Advance Stage** — next-status action with public note, internal note, and mediation date
- f.6. **Timeline** — chronological status updates with actor and timestamp
- f.7. **Documents Button** — opens the printable KP documents
- f.8. **Reopen Case** — action for terminal cases

#### g. Mediation Scheduling

- g.1. **Schedule Form** — date/time picker, kind (Mediation/Conciliation/Arbitration), location, notes
- g.2. **Save Session** — button click
- g.3. **Reschedule / Cancel** — actions on an existing session
- g.4. **Upcoming Sessions List** — pending sessions with case reference and date
- g.5. **Calendar View** — month view of scheduled sessions

#### h. Analytics & Reports

- h.1. **Date Range** — date pickers
- h.2. **Type / Status / Purok Filters** — dropdowns
- h.3. **Apply / Clear Filters** — button clicks
- h.4. **KPI Cards** — totals, resolved, overdue, average resolution time
- h.5. **Trend Chart** — line/bar chart of complaints over time
- h.6. **Status Distribution Chart** — pie chart of statuses
- h.7. **Hotspot / Complaint Type Chart** — bar chart of cases by purok and type
- h.8. **Export CSV** — button click to download the report
- h.9. **Print** — button click to print the report (chrome hidden via print styles)

#### i. Notice Board

- i.1. **Notice List** — published advisories (public view)
- i.2. **New Notice** — title and body inputs (staff)
- i.3. **Publish Toggle** — checkbox to show/hide a notice
- i.4. **Edit / Delete** — actions on a notice

#### j. Audit Log

- j.1. **Search Field** — text input (action, actor, entity)
- j.2. **Action Filter** — dropdown selection
- j.3. **Entity Type Filter** — dropdown selection
- j.4. **Actor Filter** — dropdown selection
- j.5. **Date Range** — date pickers
- j.6. **Audit Table** — when, actor, role, action, entity, IP, summary
- j.7. **Export CSV** — button click to download the audit trail

#### k. Staff Accounts

- k.1. **Search Field** — text input
- k.2. **Role / Status Filters** — dropdowns
- k.3. **Accounts Table** — name, email, role, status
- k.4. **Create Account** — opens form (name, position, email, phone, username, password, role)
- k.5. **Edit Account** — update details/role
- k.6. **Activate / Deactivate** — action toggle

#### l. Barangay Settings

- l.1. **Barangay Name / City / Province** — text inputs
- l.2. **Address / Contact Number / Email / Office Hours** — text inputs
- l.3. **Public Hotline / Tanod Number** — text inputs shown on the public site
- l.4. **Punong Barangay / Lupon Chairman** — name and printed-title inputs (document signatories)
- l.5. **Logo Upload** — image upload (PNG, JPG or WebP; max 2 MB)
- l.6. **Signature Uploads** — Punong Barangay and Lupon Chairman signature images
- l.7. **KP Deadlines** — number inputs for received, summoned, mediation and conciliation deadlines plus the "due soon" window
- l.8. **Notification Matrix** — SMS/email toggles for status changes, mediation schedules and cancellations
- l.9. **Message Channel Status** — read-only indicators of whether SMS and email providers are configured
- l.10. **Live Letterhead Preview** — read-only preview of the document header and signature blocks
- l.11. **Save / Reset Changes** — buttons with unsaved-change indicator and last-updated timestamp (admin only)
- l.12. **Read-only Notice** — non-admin staff can view settings but the fields and save actions are disabled

#### m. My Profile

- m.1. **Profile Details** — name, position, email, phone, username
- m.2. **Update Profile** — action button
- m.3. **Current Password** — password input
- m.4. **New Password / Confirm** — password inputs
- m.5. **Change Password** — action button

---

# 6 APPENDICES

## 6.1 SRS

The Software Requirements Specification (SRS) is submitted as a separate document and is summarized here. The functional requirements that BICATS satisfies are:

- **FR-1** Public complaint filing with evidence upload and consent capture.
- **FR-2** Public case tracking by reference number and registered contact number.
- **FR-3** Staff authentication with rotating refresh tokens and role-based access.
- **FR-4** Staff account management (create, edit, activate/deactivate) by an administrator.
- **FR-5** Complaints register with search and filters.
- **FR-6** Case detail with timeline and evidence.
- **FR-7** Katarungang Pambarangay status workflow with deadlines.
- **FR-8** Case reopening and staff notes on the case timeline.
- **FR-9** Mediation / conciliation / arbitration scheduling.
- **FR-10** Notice board management and public display.
- **FR-11** Analytics and reporting with CSV export.
- **FR-12** Audit logging of all significant actions.
- **FR-13** Automated deadline reminders, missed-session alerts, and in-app notifications.
- **FR-14** Barangay settings (branding, signatories, contacts, deadlines, notification channels) and printable KP documents.
- **FR-15** Resident SMS and email notifications.
- **FR-16** Bilingual (English/Filipino) UI and light/dark theme.

## 6.2 RTM

Requirements Traceability Matrix (functional requirement → design/implementation artifact).

| Req | Feature | Server Module | Client Screen | Data Tables |
| --- | --- | --- | --- | --- |
| FR-1 | Complaint filing | `complaint` | File a Complaint | Complaint, Evidence, StatusUpdate, ReferenceCounter |
| FR-2 | Case tracking | `complaint` | Track a Complaint | Complaint, StatusUpdate |
| FR-3 | Authentication | `auth` | Staff Login | User, RefreshToken, AuditLog |
| FR-4 | Staff accounts | `user` | Staff Accounts | User, AuditLog |
| FR-5 | Register | `complaint` | Complaints Register | Complaint |
| FR-6 | Case detail | `complaint` | Case Detail | Complaint, Evidence, StatusUpdate |
| FR-7 | KP workflow | `complaint` | Case Detail | Complaint, StatusUpdate |
| FR-8 | Reopen & notes | `complaint` | Case Detail | Complaint, StatusUpdate, AuditLog |
| FR-9 | Mediation scheduling | `hearing` | Mediation Scheduling | Hearing, AuditLog |
| FR-10 | Notice board | `notice` | Notice Board | Notice |
| FR-11 | Analytics | `analytics` | Analytics & Reports | Complaint |
| FR-12 | Audit log | `audit` | Audit Log | AuditLog |
| FR-13 | Reminders | `jobs/reminder`, `notification` | Notifications Bell | Notification |
| FR-14 | Settings & documents | `setting`, `complaint` | Barangay Settings | BarangaySettings, AuditLog |
| FR-15 | SMS & email | `sms`, `email`, `notify` | — (automated) | — |
| FR-16 | i18n & theme | — (client) | All screens | — |

## 6.3 TEST CASES

Representative test cases (to be maintained alongside the QA plan).

| ID | Description | Steps | Expected Result |
| --- | --- | --- | --- |
| TC-01 | File a valid complaint | Complete the form with valid data, attach one image, consent, submit | Case is created; a unique `BK-<year>-<sequence>-<check>` reference is returned |
| TC-02 | File with missing required field | Submit the form with the narrative blank | Validation error is shown; no case is created |
| TC-03 | Track with correct credentials | Enter reference + registered contact | Public case view is returned; contact is masked |
| TC-04 | Track with wrong contact | Enter reference + wrong contact | "Not found" response; no data leaked |
| TC-05 | Role restriction | Log in as `secretary`, attempt to update a case status | Request is forbidden (403) |
| TC-06 | Status workflow & deadline | Move a case received → summoned | `dueAt` updates using the configured "summoned" deadline (default +15 days); timeline entry and audit row are written |
| TC-07 | Reopen a closed case | Close a case, then reopen it with a reason | Case returns to `received` with a fresh deadline; the reason stays internal |
| TC-08 | Mediation scheduling | Schedule a mediation session | Hearing is created; complainant is notified by SMS and email |
| TC-09 | CSV export | Apply filters, click Export CSV | A `.csv` file with the filtered rows is downloaded |
| TC-10 | Reminder idempotency | Run the reminder scan twice for the same day | Exactly one notification per case/day/user |
| TC-11 | Audit completeness | Perform a status update | An AuditLog row records actor, action, entity, and IP |
| TC-12 | Session security | Use an expired/invalid token | Access is denied; the client refreshes or forces login |
| TC-13 | Overdue mediation flag | Leave a scheduled session past its date + grace period with no outcome | Session is flagged overdue in the calendar/list; staff receive a daily in-app alert until it is resolved |
| TC-14 | Mediation deadline | Move a case to the mediation status | `dueAt` is set from the configured mediation deadline (default +15 days); deadline reminders resume |
| TC-15 | Mediation filters & alert cleanup | Open the Mediation page with missed sessions and resolve a session | Overdue/upcoming/week views list sessions across months; missed-session alerts disappear and the inbox stays capped at 100 per user |
| TC-16 | Audit clarity | View an audit entry for an existing and a deleted case | Existing entries show the case reference and old/new status; deleted records are labelled "(record deleted)" instead of a bare ID |

## 6.4 TESTIMONIALS

> To be completed after user acceptance testing with the barangay. Suggested structure: quote, name, role (e.g., Punong Barangay, Barangay Secretary, resident), and date of the interview.

---

*School of Information Technology — Software Engineering 2*
