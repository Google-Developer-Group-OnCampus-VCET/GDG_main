# GDG VCET Platform — REST API Specification

This document details all public and administrative API endpoints exposed by the Next.js App Router engine.

---

## 1. Authentication & Session APIs

### 1.1 `POST /api/auth/login`
Authenticates an administrator and establishes a 7-day secure HttpOnly cookie session.

- **Access:** Public
- **Request Body (`application/json`):**
  ```json
  {
    "email": "lead@gdgvcet.in",
    "password": "correct-password"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "usr-lead-vcet",
      "email": "lead@gdgvcet.in",
      "name": "Prof. Swapnil Mane",
      "role": "chapter-admin"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid credentials.

---

### 1.2 `GET /api/auth/me`
Retrieves the profile and permissions for the currently authenticated administrator.

- **Access:** Authenticated Session (`gdg_session` cookie)
- **Response (200 OK):**
  ```json
  {
    "authenticated": true,
    "user": {
      "id": "usr-lead-vcet",
      "email": "lead@gdgvcet.in",
      "name": "Prof. Swapnil Mane",
      "role": "chapter-admin",
      "chapterId": "gdg-vcet"
    }
  }
  ```
- **Error Response:**
  - `401 Unauthorized`: No active session found.

---

### 1.3 `POST /api/auth/logout`
Destroys the active session token in SQLite and clears the `gdg_session` cookie.

- **Access:** Authenticated Session
- **Response (200 OK):**
  ```json
  { "success": true, "message": "Signed out successfully" }
  ```

---

## 2. Public Event & Community APIs

### 2.1 `POST /api/events/[slug]/register`
Submits a new participant registration for a given event slug.

- **Access:** Public
- **URL Parameter:** `slug` (e.g. `devcraft-2025`)
- **Request Body (`application/json`):**
  ```json
  {
    "fullName": "Aarav Sharma",
    "email": "aarav.sharma@vcet.edu.in",
    "phone": "+91 98765 43210",
    "college": "VCET Vasai",
    "department": "CMPN",
    "yearOfStudy": "TE",
    "track": "Web / Cloud",
    "experienceLevel": "intermediate",
    "portfolioUrl": "https://github.com/aaravsharma",
    "notes": "Interested in Google Cloud credits",
    "paymentReference": ""
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "registration": {
      "id": "reg-uuid-1234",
      "referenceId": "GDG-VCET-2025-0845",
      "status": "confirmed",
      "fullName": "Aarav Sharma",
      "email": "aarav.sharma@vcet.edu.in"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing mandatory contact fields.
  - `404 Not Found`: Event slug does not exist.
  - `409 Conflict`: Registration with this email already exists for this event.

---

### 2.2 `POST /api/events/[slug]/check-in`
Validates and executes an on-site check-in using a reference ID or ticket code.

- **Access:** Public / Terminal Authorized
- **URL Parameter:** `slug` (e.g. `devcraft-2025`)
- **Request Body (`application/json`):**
  ```json
  {
    "referenceId": "GDG-VCET-2025-0842",
    "operator": "volunteer@vcet.edu.in"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "alreadyCheckedIn": false,
    "checkedInAt": "2025-03-28T09:34:12.000Z",
    "attendee": {
      "fullName": "Rohan Deshmukh",
      "email": "rohan.d@vcet.edu.in",
      "referenceId": "GDG-VCET-2025-0842",
      "college": "VCET Vasai",
      "department": "Information Technology",
      "track": "AI / ML Track"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing `referenceId`.
  - `404 Not Found`: Pass code not found for this event.
  - `409 Conflict`: Attendee was already checked in (includes timestamp in payload).

---

### 2.3 `GET /api/events/[slug]/stats`
Returns live registration capacity and confirmed counters.

- **Access:** Public
- **Response (200 OK):**
  ```json
  {
    "slug": "devcraft-2025",
    "capacity": 150,
    "totalRegistered": 42,
    "confirmed": 38,
    "checkedIn": 18,
    "isRegistrationOpen": true
  }
  ```

---

### 2.4 `GET /api/certificates/verify/[id]`
Validates digital credential authenticity.

- **Access:** Public
- **URL Parameter:** `id` (e.g. `CERT-VCET-2025-0842` or `GDG-VCET-2025-0842`)
- **Response (200 OK):**
  ```json
  {
    "valid": true,
    "certificate": {
      "certificateId": "CERT-VCET-2025-0842",
      "recipientName": "Rohan Deshmukh",
      "recipientEmail": "rohan.d@vcet.edu.in",
      "eventTitle": "DevCraft 2025 — Full-Stack & Cloud Bootcamp",
      "eventSlug": "devcraft-2025",
      "referenceId": "GDG-VCET-2025-0842",
      "issueDate": "March 28, 2025",
      "track": "Web Development & Cloud",
      "status": "issued",
      "issuerName": "GDG on Campus VCET",
      "issuerRole": "Lead Organizer"
    }
  }
  ```
- **Error Response:**
  - `404 Not Found`: `{ "valid": false, "message": "Certificate not found or revoked" }`

---

## 3. Administrative Workspace APIs (`/api/admin/*`)

### 3.1 Event Operations
- **`GET /api/admin/events`**: Lists all events with pagination, status, and registration stats.
- **`POST /api/admin/events`**: Creates a new event record.
  - Payload: `{ slug, title, category, format, startsAt, endsAt, location, summary, capacity, isRegistrationOpen, tags }`
- **`GET /api/admin/events/[slug]`**: Returns full event details with associated agenda sessions, speakers, and sponsors.
- **`PUT /api/admin/events/[slug]`**: Updates event parameters.
- **`DELETE /api/admin/events/[slug]`**: Soft or hard deletes an event with confirmation.
- **`POST /api/admin/events/[slug]/duplicate`**: Clones an event and all its agenda tracks into a new draft slug.

---

### 3.2 Registrations & Attendee Ledger
- **`GET /api/admin/registrations`**:
  - Query Parameters: `eventSlug`, `status`, `paymentStatus`, `search`, `limit`, `offset`.
  - Returns paginated list of registrations with total match count.
- **`PATCH /api/admin/registrations/[id]`**:
  - Updates status (`confirmed`, `waitlisted`, `rejected`), payment status (`verified`, `refunded`), or appends `internalNotes`.

---

### 3.3 Speakers & Mentors
- **`GET /api/admin/speakers`**: Lists all speaker profiles.
- **`POST /api/admin/speakers`**: Creates a new speaker profile.
  - Payload: `{ name, role, organization, badge, category, bio, expertise, linkedin, github, photo }`
- **`DELETE /api/admin/speakers?id=[id]`**: Removes a speaker record.

---

### 3.4 Sponsors & Partners
- **`GET /api/admin/sponsors`**: Lists all sponsors grouped or filtered by tier.
- **`POST /api/admin/sponsors`**: Adds a sponsor partner.
  - Payload: `{ name, tier, description, logo, website, contactEmail, contribution }`
- **`DELETE /api/admin/sponsors?id=[id]`**: Removes a sponsor entry.

---

### 3.5 Agenda Timeline Builder
- **`GET /api/admin/agenda?eventSlug=[slug]`**: Fetches timeline sessions ordered by day and start time.
- **`POST /api/admin/agenda`**: Inserts a new timeline session slot.
  - Payload: `{ eventSlug, day, time, title, description, track, speaker, location }`
- **`DELETE /api/admin/agenda?id=[id]`**: Deletes a session slot.

---

### 3.6 Digital Certificates
- **`GET /api/admin/certificates?eventSlug=[slug]`**: Lists all certificates minted for an event.
- **`POST /api/admin/certificates`**: Mints an individual credential.
- **`POST /api/admin/certificates/bulk-issue`**:
  - Body: `{ eventSlug: "devcraft-2025" }`
  - Automated action: Issues credentials for every registration record where `checked_in = 1` that lacks an active certificate.
- **`PATCH /api/admin/certificates/[id]`**:
  - Body: `{ status: "revoked" | "issued" }`

---

### 3.7 Team & RBAC
- **`GET /api/admin/team`**: Returns team members and security audit log entries.
- **`POST /api/admin/team`**: Invites a new team organizer and assigns an RBAC role.
  - Payload: `{ name, email, role, password }`

---

### 3.8 Announcements & Cohorts
- **`GET /api/admin/announcements`**: Lists announcements with target audience tags and delivery counters.
- **`POST /api/admin/announcements`**: Broadcasts an announcement to selected cohorts (`all`, `registered`, `checked-in`).
  - Payload: `{ title, message, targetAudience, channel, eventSlug }`

---

### 3.9 Community Resources
- **`GET /api/admin/resources`**: Returns all repository resources.
- **`POST /api/admin/resources`**: Publishes learning materials, slide decks, or tool links.
- **`DELETE /api/admin/resources?id=[id]`**: Deletes a community resource.

---

### 3.10 Cross-Event Analytics
- **`GET /api/admin/analytics`**: Computes live aggregate platform metrics:
  - Aggregate totals: Events, Registrations, Checked-in attendees, Certificates issued.
  - Department breakdown: CMPN, IT, AIML, EXTC, etc.
  - Institution breakdown: Top colleges represented.
  - Monthly registration growth trends.

---

### 3.11 Chapter Settings & Multi-Tenancy
- **`GET /api/admin/settings`**: Retrieves active chapter branding and institutional metadata.
- **`POST /api/admin/settings`**: Updates chapter settings (`name`, `shortName`, `tagline`, `contactEmail`, `primaryColor`).

