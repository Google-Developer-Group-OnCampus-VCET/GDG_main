# GDG VCET Platform — Role-Based Access Control (RBAC) Specification

## 1. Overview & Security Philosophy

The administrative workspace employs an **8-tier Role-Based Access Control (RBAC)** model to safeguard attendee personal data, prevent accidental event modifications, and grant volunteers streamlined, focused access during physical event operations.

Permissions are enforced both:
1. **Server-Side:** During API mutations and data queries (`hasPermission(user.role, permission)`).
2. **Client-Side:** In `AdminLayoutShell` and operational views, dynamically showing/hiding modules and actions according to the authenticated user's assigned role.

---

## 2. Granular Permissions Matrix

| Permission Key | Description | Target Modules |
|---|---|---|
| `all` | Full root override for multi-chapter operations | System-wide |
| `manage_chapters` | Create and configure new campus chapter tenants | Settings / Multi-tenancy |
| `manage_events` | Create, edit, publish, duplicate, or delete events | `/admin/events/*` |
| `manage_registrations` | Review, filter, approve, reject, or export participant data | `/admin/registrations` |
| `manage_attendance` | Scan QR codes and mark attendee check-ins | `/admin/attendance` |
| `manage_speakers` | Add, edit, or remove speaker & mentor profiles | `/admin/speakers` |
| `manage_sponsors` | Maintain partner relationships and sponsorships | `/admin/sponsors` |
| `manage_agenda` | Modify multi-track schedules and session slots | `/admin/agenda` |
| `manage_team` | Invite organizers, change roles, and view audit trail | `/admin/team` |
| `manage_announcements` | Draft and broadcast communications to attendee cohorts | `/admin/announcements` |
| `manage_certificates` | Issue, verify, or revoke digital credentials | `/admin/certificates` |
| `manage_resources` | Curate community learning kits and slide decks | `/admin/resources` |
| `view_analytics` | Access registration charts, college demographics, and KPIs | `/admin/analytics` |
| `manage_settings` | Update chapter metadata, brand colors, and contact info | `/admin/settings` |

---

## 3. Role Definitions & Access Levels

### 3.1 `super-admin` (Platform Owner)
- **Scope:** Cross-chapter platform administration.
- **Access:** Complete access to all 14 capabilities including `manage_chapters`.
- **Default Seed User:** `admin@gdgvcet.in` (Password: `admin123`)

### 3.2 `chapter-admin` (Lead Organizer / Faculty Advisor)
- **Scope:** Full administrative control over the active chapter (`gdg-vcet`).
- **Access:** All permissions except cross-chapter tenancy creation.
- **Default Seed User:** `lead@gdgvcet.in` (Password: `lead123`)

### 3.3 `core-team` (Co-Organizers & Domain Leads)
- **Scope:** Daily community execution across events, content, and communications.
- **Access:** Events, registrations, attendance, speakers, sponsors, agenda, announcements, resources, and analytics.
- **Restricted:** Cannot modify chapter settings or alter team member RBAC permissions.

### 3.4 `event-manager` (Event Lead / Hackathon Chair)
- **Scope:** Dedicated to event lifecycle management.
- **Access:** Events CRUD, agenda timeline builder, speaker and sponsor directories, registrations, attendance terminal, and analytics.
- **Default Seed User:** `events@gdgvcet.in` (Password: `event123`)

### 3.5 `registration-manager` (Participant Coordinator)
- **Scope:** Attendee verification and queue processing.
- **Access:** Participant registry, payment proof review, internal notes, status transitions, check-in terminal, and analytics.
- **Restricted:** Cannot edit event metadata, agenda, or team members.

### 3.6 `check-in-volunteer` (On-Site Terminal Operator)
- **Scope:** Event-day gate and badge check-in terminal.
- **Access:** Dedicated strictly to `manage_attendance`.
- **Restricted:** Cannot view participant contact phone numbers, cannot edit events, cannot view financial analytics.
- **Default Seed User:** `volunteer@gdgvcet.in` (Password: `vol123`)

### 3.7 `content-manager` (Media & Outreach Lead)
- **Scope:** Community publishing and partner representation.
- **Access:** Speakers & Mentors, Sponsors & Partners, Community Resources, and Broadcast Announcements.
- **Restricted:** Cannot approve registrations or execute check-ins.

### 3.8 `analytics-viewer` (Auditor / Faculty Observer)
- **Scope:** Performance monitoring and institutional reporting.
- **Access:** Read-only access to `/admin/analytics` and aggregate event metrics.
- **Restricted:** Zero mutation rights on any entity.

---

## 4. Role Comparison Table

| Role | Events | Regs & CSV | Attendance | Speakers & Agenda | Certificates | Team & Audit | Settings |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `super-admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `chapter-admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `core-team` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `event-manager` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `registration-manager` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `check-in-volunteer` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `content-manager` | ❌ | ❌ | ❌ | ✅ (Speakers) | ❌ | ❌ | ❌ |
| `analytics-viewer` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Security & Session Handling

1. **Password Hashing:**
   All passwords are encrypted with `scrypt` using an isolated per-account 16-byte cryptographically random salt. Raw passwords are never persisted.
2. **Session Cookies:**
   Sessions use `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) cookies with a maximum lifetime of 7 days.
3. **Audit Log Recording:**
   Every administrative action performs an atomic `INSERT INTO audit_logs` recording the user's ID, email, action name, target entity, and timestamp.

