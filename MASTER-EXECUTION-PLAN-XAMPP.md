# OJT Monitoring System — Complete Implementation Guide

Version 3.0 | Updated October 20, 2026 | Status: implementation specification

**AI implementation entry point:** Read [AI-IMPLEMENTATION-SPEC.md](AI-IMPLEMENTATION-SPEC.md) before executing any phase. It fixes the schema, API contracts, defaults, file boundaries, commands, and acceptance checks. This document explains the phase sequence; the technical specification resolves implementation details. Implement the phases in order without asking the user to choose routine technical details. Stop only for unavailable credentials, missing external access, destructive changes to real records, or a genuinely incompatible user requirement. A documentation request alone does not authorize starting application implementation.

This is the implementation guide for this workspace. It replaces the Supabase architecture in `masterplan.md.txt` for future development. The original reference files remain available. Checking off a task means it has been implemented and verified; this document does not mean the application has already been built.

## 1. Starting point and target result

The workspace currently contains:

| File | How to use it |
| --- | --- |
| `code.html` | Visual reference for the administrator dashboard, navigation, tables, modal, and charts. Most links are placeholders and the enlist button only closes the modal. |
| `DESIGN.md` | Visual rules for colors, typography, layouts, and components. |
| `screen.png` | Screenshot reference. |
| `masterplan.md.txt` | Original Supabase plan; use this new document for implementation decisions. |
| Four Stitch ZIP files | Each contains `code.html`, `screen.png`, and `DESIGN.md`; inspect each version before selecting additional screen references. They are not backend/database packages. |

The target is a working OJT system where administrators manage accounts and placements; faculty review assigned students and documents; students submit requirements and actual duty logs; and assigned company supervisors approve duty logs and submit evaluations. All dashboard figures must come from stored records.

**Architecture decision:** retain the JavaScript backend direction from the original plan. Use React with Vite for the frontend, Node.js with Express for the API, and XAMPP's MariaDB service for the database. Use `mysql2` for database access. XAMPP is the local service bundle, not the database name. XAMPP ships MariaDB even though its control panel labels the service “MySQL.” See the [official Windows FAQ](https://www.apachefriends.org/faq_windows.html).

PHP is not required for this architecture. Apache is needed locally for phpMyAdmin, while Node serves the API and Vite serves the frontend. The source can stay in this workspace; it does not need to be moved into `htdocs`.

```text
Browser → React UI → /api → Express → mysql2 → XAMPP MariaDB
                                  ├── private uploaded files
                                  ├── database-backed sessions
                                  └── audit events / notifications

phpMyAdmin → MariaDB (developer administration only)
```

### What replaces each Supabase feature

| Old feature | Replacement |
| --- | --- |
| PostgreSQL database | MariaDB, InnoDB tables, `utf8mb4` |
| Supabase JavaScript client | Backend `mysql2/promise` connection pool |
| Supabase Auth / homemade JWT storage | Express login with password hashes and database-backed cookie sessions |
| PostgreSQL row-level security | API role checks plus record ownership/assignment checks on every query |
| Storage buckets | Files outside public folders, metadata in MariaDB, authenticated download endpoint |
| Realtime subscriptions | Refresh after mutations and periodic polling initially |
| Supabase dashboard / SQL editor | phpMyAdmin and versioned SQL migration files |
| Supabase hosting assumptions | Local/LAN demonstration first; separately configured production services later |

## 2. Phase order and completion rules

| Phase | Work | Estimated working days | Depends on |
| --- | --- | --- | --- |
| 0 | Scope, tools, project skeleton | 2 | Existing references |
| 1 | Schema, migrations, seeds | 5 | 0 |
| 2 | API foundation, sessions, permissions | 5 | 1 |
| 3 | Shared frontend and login | 4 | 2 |
| 4 | Users, companies, departments, configuration | 5 | 3 |
| 5 | Placement lifecycle | 6 | 4 |
| 6 | Requirements and private uploads | 5 | 5 |
| 7 | Work schedules, duty logs, approvals | 5 | 5 |
| 8 | Evaluations and completion | 5 | 6–7 |
| 9 | Dashboards, notifications, exports, settings | 5 | 8 |
| 10 | Integration, access-control testing, UAT | 5 | 9 |
| 11 | Deployment, backup/restore, handover | 3 | 10 |

Budget approximately 55 working days for one developer, adjusting for learning time and school requirements. This is a planning estimate, not a deadline. Build and verify each API workflow before connecting its UI. Keep a short evidence log with screenshots, test results, and the corresponding commit.

For every phase: implement → validate input and access rules → exercise success and failure cases → connect UI → document → commit. Do not mark a phase complete while its screens still display mock data.

## Phase 0 — Confirm scope and prepare the environment

**Result:** a reproducible project skeleton and a running local database service.

1. [ ] Record decisions in `docs/decisions.md`: four roles, academic terms, required hours by program, who approves each workflow, evaluation rubric, file limits, and completion rules.
2. [ ] Treat the mockup's 486 hours and compliance statements as sample text. Configure hours from approved institutional policy; do not infer regulatory compliance from the design.
3. [ ] Install XAMPP from [Apache Friends](https://www.apachefriends.org/), a supported Node.js LTS release from [Node.js](https://nodejs.org/), Git, and VS Code. Record installed versions in `docs/environment.md` and pin the Node major version used by the project.
4. [ ] Start MySQL in XAMPP. Start Apache to use `http://localhost/phpmyadmin`. Record actual ports; examples below assume database 3306, Apache 80, API 5000, and Vite 5173.
5. [ ] In phpMyAdmin run `SELECT VERSION(), @@sql_mode;` and record the MariaDB version and SQL modes. Verify constraints against this installed version.
6. [ ] Initialize Git if needed. Ignore `.env`, `node_modules/`, `dist/`, private uploads, logs, SQL dumps containing personal data, and test artifacts containing credentials. Commit `.env.example` files with placeholders only.
7. [ ] Create the following structure without overwriting the visual references:

```text
OJT MASTER PLAN/
  code.html
  DESIGN.md
  MASTER-EXECUTION-PLAN-XAMPP.md
  backend/
    src/
      app.js
      server.js
      config/db.js
      middleware/
      routes/
      controllers/
      services/
      validators/
    scripts/                 # migration runner, seed and admin bootstrap
    tests/
    .env.example
    package.json
  frontend/
    src/
      components/
      layouts/
      pages/
      services/
      contexts/
      styles/
    .env.example
    package.json
  database/
    migrations/              # numbered, forward SQL changes
    seeds/                   # repeatable reference/demo seeds
  storage/private/           # outside frontend/public and Apache web roots
  docs/
    decisions.md
    environment.md
    erd.md
    data-dictionary.md
    api-reference.md
    test-plan.md
    deployment.md
    user-manual.md
```

8. [ ] From the workspace root, scaffold the projects in PowerShell:

```powershell
New-Item -ItemType Directory -Force backend
Set-Location backend
npm init -y
npm install express mysql2 dotenv express-session express-mysql-session bcryptjs helmet express-rate-limit multer zod
npm install --save-dev nodemon supertest
Set-Location ..
npm create vite@latest frontend -- --template react
Set-Location frontend
npm install
npm install react-router-dom
Set-Location ..
```

The scaffold commands access package registries. Inspect generated dependency versions, verify compatibility, and commit lockfiles. Use `npm ci` for later clean installations. Add chart/PDF/spreadsheet dependencies only when their features are implemented.

**Exit check:** tools run, service ports are documented, skeleton exists, and scope decisions are recorded.

## Phase 1 — Design and implement the MariaDB database

**Result:** a documented relational schema that supports the entire interface.

### 1.1 Create the database and separate credentials

In phpMyAdmin's SQL tab, using a local database administrator, run the following after replacing the password placeholder:

```sql
CREATE DATABASE ojt_monitoring
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'ojt_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_RANDOM_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ojt_monitoring.* TO 'ojt_app'@'127.0.0.1';
```

Use `DB_HOST=127.0.0.1` consistently with this account. Use the administrator or a separate migration account for DDL. The application must not connect as root. Create all session-store tables through migrations and disable automatic table creation in the session adapter. Grant runtime permissions only after creating the schema if your setup requires that order.

### 1.2 Write the ERD and data dictionary before the schema

The old plan names 13 tables but contains no complete DDL. The following is a **proposed design**, not a recovered existing schema. The extra tables cover supervisor accounts, real duty logs, files, terms, sessions, audit history, and notifications that the UI requires.

For every table document exact columns, data types, nullability, defaults, keys, indexes, allowed states, and deletion rules. Use consistent unsigned integer ID types, UTC timestamps, and InnoDB. API responses can expose IDs as strings if they exceed JavaScript's safe integer range.

| Table | Minimum fields and purpose |
| --- | --- |
| `users` | `id`, unique normalized `email`, `password_hash`, `full_name`, `role`, `is_active`, `must_change_password`, timestamps |
| `students` | `id`, unique `user_id`, unique `student_number`, `course`, `year_level`, `school_department_id` |
| `faculty` | `id`, unique `user_id`, unique `employee_number`, `school_department_id` |
| `companies` | `id`, `name`, address/contact details, `is_active` |
| `company_departments` | `id`, `company_id`, `department_name`, `is_active`; unique company/name pair |
| `school_departments` | `id`, unique `code`, `name`, `is_active` |
| `company_supervisors` | `id`, unique `user_id`, `company_department_id`, position/contact details |
| `academic_terms` | `id`, academic year, semester, start/end dates, `is_active` |
| `placements` | `id`, `student_id`, `faculty_id`, nullable `supervisor_id`, `academic_term_id`, `deployment_type`, nullable host department IDs, dates, `required_minutes`, `status`, timestamps |
| `requirements` | `id`, unique code, title, description, stage (`pre_deployment`, `ongoing`, `completion`), `is_required`, `is_active` |
| `placement_requirements` | `id`, `placement_id`, `requirement_id`, snapshot title/stage/required flag, `status`, `current_upload_id`, submission/review timestamps, reviewer, remarks; unique placement/requirement pair |
| `uploaded_files` | `id`, `placement_requirement_id`, uploader, random storage key, original name, verified MIME, byte size, checksum, version, timestamp |
| `work_schedules` | `id`, `placement_id`, weekday or planned date, planned start/end/break, effective date range; planned work only |
| `duty_logs` | `id`, `placement_id`, local work date, UTC clock-in/out, break minutes, computed credited minutes, `status`, reviewer, review time, remarks |
| `evaluations` | `id`, `placement_id`, evaluator `user_id`, type (`midterm`, `final`), `status`, remarks, submitted/finalized timestamps |
| `evaluation_criteria` | `id`, rubric version, code, label, `max_score`, order, active flag |
| `evaluation_scores` | `id`, `evaluation_id`, `criterion_id`, snapshot label/max score, score, remarks; unique evaluation/criterion pair |
| `sessions` | Schema required by the chosen Express session adapter; inspect its installed version and include its exact expected columns/indexes in a migration |
| `audit_logs` | `id`, actor, action, entity type/ID, redacted change summary, UTC timestamp; append-only through the application |
| `notifications` | `id`, recipient, event type, related entity, message, `read_at`, timestamp |
| `password_reset_tokens` | `id`, user, token hash, expiry, consumed timestamp; never store raw reset tokens |
| `schema_migrations` | Unique migration filename/version, checksum, applied timestamp |

Create tables in foreign-key dependency order. Resolve the upload/current-upload relationship by creating both tables first and adding the `current_upload_id` foreign key afterward. Ensure the current upload belongs to the same requirement in application validation. A school placement uses faculty as its duty reviewer when no company supervisor exists.

### 1.3 Define invariants

- [ ] Roles: `admin`, `faculty`, `student`, `supervisor`. One role per account for the first version; switching roles in the UI must never grant permissions.
- [ ] A company placement has a company department and no school host department. A school placement has a school host department and no company department. A company supervisor must belong to the selected company department.
- [ ] Dates have a valid order, required minutes are positive, scores are within their snapshot maximum, and credited minutes are nonnegative. Implement both compatible database constraints and API validation.
- [ ] Foreign keys restrict deletion of referenced historical records. Archive/deactivate companies, departments, accounts, and templates rather than cascading away internship history.
- [ ] Index foreign keys, email, student number, status/date filters, and assignment filters. Add uniqueness constraints for actual business identifiers.
- [ ] Store approved duration as integer minutes; convert to hours for display. Store scores as `DECIMAL`, not approximate floating point.
- [ ] Snapshot requirement and rubric values so later template edits do not change historical completion or grades.
- [ ] Use a transaction with a locked student row to serialize placement creation and status transitions. Every path that enters a live status must take this lock and check for another live placement. Live statuses are `pending`, `approved`, and `active`; cancellation/completion frees the slot. Add a compatible database uniqueness safeguard if the chosen schema supports one.

### 1.4 Replace PostgreSQL syntax correctly

| PostgreSQL feature in old plan | MariaDB implementation |
| --- | --- |
| `SERIAL` / `BIGSERIAL` | `INT UNSIGNED AUTO_INCREMENT` or consistent `BIGINT UNSIGNED` |
| `UUID`, `gen_random_uuid()` | Choose integer IDs initially; if UUIDs are needed, explicitly design their storage/generation |
| `TIMESTAMPTZ` | UTC `DATETIME` with explicit application/session timezone policy |
| `ON CONFLICT DO NOTHING` | A deliberate unique-key upsert or checked seed operation |
| `COUNT(*) FILTER (WHERE ...)` | `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` |
| `value::DECIMAL` | `CAST(value AS DECIMAL(12,2))` |
| `RETURNING` | Driver `insertId`, then a select on the same connection if needed |
| `plpgsql` trigger function | Compatible MariaDB trigger or transactional application service |
| Supabase policies | API authorization and ownership conditions |

Do not use `INSERT IGNORE` as a blanket migration fix: it can hide invalid data. MariaDB supports explicit [unique-key upserts](https://mariadb.com/docs/server/reference/sql-statements/data-manipulation/inserting-loading-data/insert-on-duplicate-key-update); choose which columns may change on a repeated seed.

### 1.5 Migrations, seed data, and progress queries

1. [ ] Write numbered migrations for identity/directories, placements, requirements/files, time logs, evaluations, and operational tables.
2. [ ] Build a migration runner that tracks checksums, refuses changed applied migrations, runs in order, and stops on failure. MariaDB DDL may implicitly commit: do not assume an entire schema migration can be rolled back as one transaction. Document recovery for a partially applied migration.
3. [ ] Seed departments, terms, requirement templates, and a versioned rubric. Use a separate demo seed for two companies, two students, faculty, a supervisor, and placements with different statuses.
4. [ ] Create the first administrator through a backend script that hashes a password provided interactively or through a temporary environment variable. Do not put working passwords in SQL files or Git.
5. [ ] Create database-backed views or service queries. Aggregate requirements and duty logs separately before joining; the old plan's direct join multiplies hours when a placement has multiple requirements.

Example progress query, based on the proposed field names:

```sql
SELECT p.id AS placement_id,
       COALESCE(r.required_count, 0) AS required_count,
       COALESCE(r.approved_count, 0) AS approved_count,
       COALESCE(d.approved_minutes, 0) AS approved_minutes,
       p.required_minutes
FROM placements p
LEFT JOIN (
  SELECT placement_id,
         SUM(CASE WHEN is_required_snapshot = 1 THEN 1 ELSE 0 END) AS required_count,
         SUM(CASE WHEN is_required_snapshot = 1 AND status = 'approved'
                  THEN 1 ELSE 0 END) AS approved_count
  FROM placement_requirements GROUP BY placement_id
) r ON r.placement_id = p.id
LEFT JOIN (
  SELECT placement_id, SUM(credited_minutes) AS approved_minutes
  FROM duty_logs WHERE status = 'approved' GROUP BY placement_id
) d ON d.placement_id = p.id;
```

**Exit checks:** recreate a clean development database from migrations and seeds; verify all foreign keys; reject duplicate email and invalid host assignments; confirm two requirements plus three 60-minute approved logs total 180 minutes. Never run reset commands against real records.

## Phase 2 — Build the API foundation and authentication

**Result:** tested database connectivity, login/logout, persistent sessions, and enforced access scope.

### 2.1 Environment and connection pool

Create `backend/.env.example`:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ojt_monitoring
DB_USER=ojt_app
DB_PASSWORD=replace_me
SESSION_SECRET=replace_with_at_least_32_random_bytes
SESSION_NAME=ojt.sid
SESSION_MAX_AGE_MS=28800000
APP_TIMEZONE=Asia/Manila
UPLOAD_ROOT=../storage/private
MAX_UPLOAD_BYTES=10485760
```

Load dotenv before importing configuration. Validate all required settings at startup. Resolve `UPLOAD_ROOT` against the backend directory, not the shell's arbitrary current directory. Generate a secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Pool outline for `backend/src/config/db.js` (CommonJS backend):

```javascript
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
  multipleStatements: false
});
module.exports = pool;
```

`timezone: 'Z'` configures driver date conversion; it does not set the database server's session timezone. Initialize each database connection to UTC where server functions need it, or supply explicit UTC values from the backend. Keep local work dates separate from UTC timestamps. See [MySQL2 documentation](https://sidorares.github.io/node-mysql2/docs) for pools and prepared execution.

### 2.2 Implement middleware and shared behavior

- [ ] Separate `app.js` from `server.js` so API tests can import the app without opening a port.
- [ ] Add JSON limits, security headers, request IDs, structured logs, validation, not-found handling, and centralized error handling. Never return SQL messages, stack traces, password hashes, or secrets to clients.
- [ ] Use parameterized `pool.execute(sql, values)` for values. Allowlist sort column names and sort directions; SQL identifiers cannot be made safe by value placeholders.
- [ ] For multi-step work acquire one pooled connection, begin a transaction, commit/rollback, and release in `finally`. Never mix unrelated pool calls into a transaction.
- [ ] Implement `/api/health` for process liveness and `/api/ready` for a database connectivity check. Return a generic readiness failure without connection credentials.
- [ ] Standardize responses, for example `{ data, meta }` and `{ error: { code, message, fields }, requestId }`.
- [ ] Use 200/201 for success, 204 with no body where appropriate, 400/422 for invalid input, 401 for missing/expired login, 403 for forbidden actions, 404 for absent or inaccessible records, 409 for conflicts, 413 for oversized files, and generic 500 errors.

### 2.3 Session authentication

1. [ ] Configure `express-session` with the MariaDB-backed adapter and the migrated session table. Set `resave: false`, `saveUninitialized: false`, and disable adapter table auto-creation. Do not use the default memory store for the deployed system.
2. [ ] Use an HttpOnly cookie with `SameSite=Lax`, a bounded expiry, and `Secure=true` under HTTPS. Local HTTP development needs `Secure=false`. Set proxy trust only for the actual trusted deployment proxy.
3. [ ] Login checks a normalized email, active account, and bcrypt hash. Rate-limit attempts and return a generic invalid-credentials message. Regenerate the session ID after successful login.
4. [ ] Implement a session-bound CSRF token returned by `/api/auth/csrf`. Require it in a header on all mutating browser requests, including login; validate request origins. Fetch a fresh token after session regeneration.
5. [ ] Logout destroys the server session and clears the matching cookie. Password changes, account deactivation, and privilege changes invalidate the user's existing sessions.
6. [ ] Store only the user ID and needed session metadata. Load current account state/role during authorization so stale sessions cannot preserve removed access.
7. [ ] Password reset uses short-lived, single-use hashed tokens and generic responses. If email delivery is outside initial scope, use a documented administrator-assisted reset with forced password change, and label that limitation in the manual.

See the [Express session documentation](https://expressjs.com/en/resources/middleware/session/) for cookie settings, session regeneration, and store behavior.

### 2.4 Authorization matrix

| Actor | Scope |
| --- | --- |
| Admin | Manage directories/templates/accounts and all placements; sensitive overrides require a reason and audit event |
| Faculty | Assigned placements only; review requirements, supervise school-host duty logs, review/finalize authorized evaluations |
| Student | Own profile, placements, uploads and logs; read published evaluations; cannot approve their own submissions |
| Supervisor | Explicitly assigned placements in their company department; duty approvals and authorized evaluation forms |

Role checks are only the first layer. Check the resource's placement assignment on detail reads, lists, downloads, edits, dashboard aggregates, exports, and nested routes. Do not trust a client-supplied student ID, role, score total, reviewer ID, or duration.

**Endpoints:** `GET /api/auth/csrf`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`, and the chosen password-reset flow. Account creation is administrator-only through `/api/users`.

**Exit checks:** all four roles can log in; refresh preserves login; logout makes the old session unusable; a student cannot read another student's placement; missing CSRF tokens fail; inactive users lose access.

## Phase 3 — Convert the design into a real frontend

**Result:** shared components, actual navigation, and working login.

1. [ ] Move the visual rules from `DESIGN.md` into reusable CSS variables and components. Preserve Manrope/Inter/JetBrains Mono where available, with local fallbacks.
2. [ ] Replace the Tailwind CDN prototype with a reproducible local styling build or equivalent local CSS. If using Tailwind, follow the installed major version's official setup instead of copying incompatible configuration from another version.
3. [ ] Extract sidebar, header, stat cards, tables, status badges, forms, pagination, alerts, modal, file picker, and loading/empty/error states.
4. [ ] Make the sidebar responsive. Verify keyboard navigation, visible focus, labeled inputs, table overflow, modal focus/escape behavior, and readable mobile layouts.
5. [ ] Build a single API client. Include cookies, obtain/send CSRF tokens, normalize errors, and handle 401 by clearing user state and redirecting to login.
6. [ ] Configure Vite to proxy `/api` to `http://127.0.0.1:5000`; use relative `/api` URLs. In production, serve UI and API under the same origin. Do not mix `localhost` and `127.0.0.1` in browser URLs.
7. [ ] Build `AuthContext` from `/api/auth/me`. Protected routes control navigation; the API still enforces every permission.
8. [ ] Show only routes available to the logged-in role. Replace the mockup's role switcher with the actual authenticated role.
9. [ ] Connect login, logout, own profile, and forced password change before module screens.

`frontend/.env.example` needs at most public settings such as `VITE_API_BASE_URL=/api`. Database passwords and session secrets must never use a `VITE_` prefix.

**Exit checks:** browser login reaches the correct dashboard shell; every sidebar item resolves to a route or an explicitly unfinished development screen; loading/error states work when the API is stopped.

## Phase 4 — Build accounts, directories, and master configuration

**Result:** administrators can create all prerequisite records through forms.

| Resource | API contract | Main rules |
| --- | --- | --- |
| Users | `GET/POST /api/users`, `GET/PATCH /api/users/:id` | Admin creates role/profile atomically; safe self-edit fields only; deactivate rather than erase history |
| Students / faculty / supervisors | `GET /api/students`, `/api/faculty`, `/api/supervisors` plus detail routes | Enforce assignment scope and unique institutional identifiers |
| Companies | `GET/POST /api/companies`, `GET/PATCH /api/companies/:id` | Admin manages; authorized users receive only needed directory fields |
| Company departments | `GET/POST /api/companies/:id/departments`, `PATCH /api/company-departments/:id` | Verify company ownership and unique names per company |
| School departments | `GET/POST /api/school-departments`, `PATCH /api/school-departments/:id` | Stable codes; archive referenced records |
| Academic terms | `GET/POST /api/academic-terms`, `PATCH /api/academic-terms/:id` | Valid dates and explicit current-term selection |
| Requirement master | `GET/POST /api/requirements`, `PATCH /api/requirements/:id` | Stage, required flag, version/change history |
| Rubric criteria | `GET/POST /api/evaluation-criteria`, `PATCH /api/evaluation-criteria/:id` | Positive maxima; new versions after use |

- [ ] Implement bounded pagination: `?page=1&limit=20&search=...`; cap limit, validate filters, and return total/page metadata.
- [ ] Normalize email, validate required fields and role/profile combinations, and handle duplicate keys as useful 409 responses.
- [ ] Prevent removal of the last active administrator. Self-service requests cannot change role, account status, or assignment fields.
- [ ] Build searchable tables, detail views, create/edit forms, archive actions, validation feedback, and success messages.
- [ ] Add audit events for administrator changes without copying password hashes or private document content into logs.

**Exit checks:** create a company, department, supervisor, faculty member, and student entirely through the UI; duplicates fail clearly; archived records remain in historical detail views.

## Phase 5 — Implement placement creation and lifecycle

**Result:** a student can be assigned to a valid host with snapshotted requirements.

**Routes:** `GET/POST /api/placements`, `GET/PATCH /api/placements/:id`, `PATCH /api/placements/:id/status`. Use the list endpoint with authenticated scope for “my placements”; if adding `/my`, register it before `/:id`.

1. [ ] Build the placement wizard: select student/term → deployment type/host/faculty/supervisor → dates/required hours → review/save.
2. [ ] Validate host type, active accounts, supervisor department match, date order, and positive required minutes. Derive institution-controlled defaults on the server.
3. [ ] In one transaction lock the student row, check live-placement conflicts, insert placement, copy applicable active requirements with snapshot fields, append audit event, and commit.
4. [ ] Define transitions: `pending → approved → active → completed`; `pending → rejected`; `pending/approved/active → cancelled`. Reapplication after rejection creates a new record. Reject arbitrary status jumps with 409.
5. [ ] Assigned faculty/admin can approve a pending placement only when pre-deployment requirements are satisfied. Admin activates an approved placement after validating its start conditions. Recheck conditions transactionally at the transition.
6. [ ] Prevent casual reassignment of active placements with approved history. Use a documented transfer/reassignment workflow that preserves old assignments and approval history.
7. [ ] Cancellation requires remarks. Referenced placements are retained; no general hard-delete action is exposed.

**Exit checks:** both company and school placements work; failure while copying requirements rolls back placement creation; two simultaneous create requests cannot create two live placements for one student.

## Phase 6 — Implement requirements and private document storage

**Result:** student submission → authorized review → approval/rejection → resubmission works.

**Routes:**

- `GET /api/placements/:id/requirements`
- `POST /api/placement-requirements/:id/uploads`
- `GET /api/files/:id/download`
- `PATCH /api/placement-requirements/:id/review`

1. [ ] Use states `pending → submitted → approved/rejected`; rejected items can be resubmitted. An approved item needs an explicit audited reopen before replacement.
2. [ ] Receive multipart uploads through a bounded upload middleware. Start with PDF/JPEG/PNG, 10 MB maximum, and verify signatures/content type rather than trusting extensions. Reject executable content and unsafe filenames.
3. [ ] Generate random storage keys and keep files under the resolved private upload root. Retain original names only as metadata. Never mount this folder as a public static directory.
4. [ ] Verify the student owns the placement and can submit in its current state before accepting a permanent upload. Save each submission as an immutable file version.
5. [ ] Stage the file, validate it, move to its final key, and update metadata/current upload/status in a transaction. Filesystem operations are not database transactions: delete the new file on metadata failure and periodically reconcile orphaned staged files.
6. [ ] Faculty reviews only assigned students. Record reviewer, UTC timestamp, remarks, and an audit event. Rejection requires a reason. Students cannot submit reviewer fields.
7. [ ] Downloads recheck placement access, use storage keys from the database, and set safe download headers. Do not accept arbitrary disk paths. Default to attachment delivery; restrict inline previews to verified safe types.
8. [ ] Add notification records for submission and review. Add due dates from recorded institutional policy and define how late submissions are displayed.

**Exit checks:** approved and rejected workflows work; old submission versions remain traceable; another student's direct download request fails; invalid/oversized files fail without leaving orphan metadata.

## Phase 7 — Implement planned schedules and actual duty logs

**Result:** only reviewed actual work contributes to completed hours.

The old `work_schedules` concept conflates planned and actual work. Keep planned schedules separate from `duty_logs`; a calendar entry is not proof of attendance.

**Routes:** `GET/POST /api/placements/:id/schedules`, `PATCH/DELETE /api/schedules/:id`, `GET/POST /api/placements/:id/duty-logs`, `PATCH/DELETE /api/duty-logs/:id`, `POST /api/duty-logs/:id/submit`, `PATCH /api/duty-logs/:id/review`, `GET /api/placements/:id/progress`.

1. [ ] Allow students to create/edit only their own draft or rejected logs, within allowed placement dates. Implement `draft → submitted → approved/rejected`.
2. [ ] Require date/time inputs with an explicit Asia/Manila interpretation; convert to UTC on the server. Store the local work date for reporting. Reject ambiguous inputs.
3. [ ] Compute minutes server-side: `(clock_out - clock_in) / 60000 - break_minutes`. Require whole-minute inputs, end after start, and break shorter than elapsed work. Never accept a client total as authoritative.
4. [ ] Use full date/time values for overnight work. Until an overnight policy is recorded, reject shifts crossing local dates rather than silently producing negative or incorrect hours.
5. [ ] Prevent duplicate/overlapping logs and enforce recorded daily limits. Serialize overlap checks with a placement row lock so concurrent requests cannot bypass validation.
6. [ ] Assigned company supervisors approve company-host logs. Assigned faculty approve school-host logs. Any admin override requires remarks and an audit event.
7. [ ] Approved logs are immutable in ordinary edit routes. Corrections reopen/revoke approval with a reason; totals immediately exclude revoked work.
8. [ ] Progress sums only approved minutes. Display pending hours separately and cap only the visual progress bar, not the recorded actual total.

**Exit checks:** 08:00–17:00 with a 60-minute break gives 480 minutes; submitted work contributes zero approved minutes; overlaps fail; reviewers outside the placement cannot approve; approved minutes remain correct across multiple uploads.

## Phase 8 — Build evaluations and final completion

**Result:** authorized evaluators submit complete scorecards and faculty close eligible placements.

**Routes:** `GET/POST /api/evaluations`, `GET/PATCH /api/evaluations/:id`, `POST /api/evaluations/:id/submit`, `PATCH /api/evaluations/:id/finalize`. Allow draft deletion only if policy requires it, with an audit event.

1. [ ] Record who evaluates company and school placements. Proposed workflow: company supervisor drafts/submits the industry evaluation; assigned faculty reviews and finalizes it. Faculty evaluates school placements. Admin overrides are explicit and audited.
2. [ ] Create an evaluation and criterion snapshots transactionally. Enforce one ordinary evaluation per placement/type/evaluator; corrections create a revision or audited reopen.
3. [ ] Draft scores can be incomplete. Submission/finalization requires exactly one valid score for every snapshotted criterion and no extra criteria.
4. [ ] Compute totals server-side. Default unweighted percentage is `100 × sum(score) / sum(snapshot_max_score)`, rounded for display; reject a zero denominator. Document a different approved weighting formula before adding weights.
5. [ ] Lock the evaluation when submitting/finalizing so concurrent edits cannot change the published result. Students see only finalized evaluations, never drafts or internal review notes.
6. [ ] Finalized scores are read-only; a correction records author, reason, prior values, and revision history.
7. [ ] To mark a placement complete, lock it and recheck approved minutes ≥ required minutes, all required snapshotted requirements approved, required finalized evaluations present, and no unresolved blocking reviews. Faculty/admin can perform the authorized transition; students cannot self-complete.

**Exit checks:** a score of 81 out of 100 displays 81%; missing/out-of-range scores fail; unauthorized supervisors cannot evaluate; changing a master criterion does not alter a finalized historical grade; completion fails when any prerequisite is missing.

## Phase 9 — Connect every screen, dashboard, and supporting feature

**Result:** every visible feature has real data and a complete user flow.

### Screen implementation checklist

| Existing `data-path` | Working route | Completion requirement |
| --- | --- | --- |
| `admin-dashboard` | `/admin/dashboard` | Real institution/term-scoped KPI queries and audit events |
| `faculty-dashboard` | `/faculty/dashboard` | Assigned roster and pending reviews |
| `student-portal` | `/student/dashboard` | Own placement, requirements, approved/pending hours, published grades |
| `supervisor-portal` | `/supervisor/dashboard` | Assigned interns, duty approvals, evaluations |
| `placements-roster` | `/placements` | Scoped searchable/paginated roster |
| `placement-assignment` | `/placements/new` | Transaction-backed wizard |
| `requirement-master-list` | `/requirements` | Administrator template management |
| `student-requirements` | `/my/requirements` | Upload versions, status, and review remarks |
| `faculty-requirement-review` | `/reviews/requirements` | Assignment-scoped review queue |
| `work-schedules` | `/schedules` | Planned schedule and actual duty log views clearly labeled |
| `evaluation-criteria` | `/evaluation-criteria` | Versioned rubric management |
| `evaluation-scoring` | `/evaluations` | Draft/submit/review/finalize flows |
| `directory-students` | `/students` | Scoped student directory/details |
| `directory-faculty` | `/faculty` | Administrator faculty directory |
| `directory-companies` | `/companies` | Company and company department details |
| `directory-departments` | `/school-departments` | School department management |
| `ojt-analytics` | `/reports` | Filtered reports and scoped exports |
| `system-settings` | `/settings` | Own profile/password; admin-only term/system settings |

1. [ ] Define dashboard endpoints under `/api/dashboard/...` with the same scope rules as list routes. Set explicit academic-term/date filters.
2. [ ] Document metrics: active means `status=active`; completed hours are approved minutes; completion rate uses a documented denominator and excludes or includes cancelled placements consistently. Show zero/empty states without invented trends.
3. [ ] Replace mock counts, chart heights, names, dates, retention claims, company rankings, and compliance text. The “Cloud Online” badge must reflect actual readiness or be removed.
4. [ ] Implement `GET /api/audit-logs` with administrator access and pagination. Store audit events in the same transaction as critical business mutations.
5. [ ] Implement `GET /api/notifications` and `PATCH /api/notifications/:id/read`; scope by recipient. Poll periodically and refresh after relevant actions. Do not present polling as instantaneous realtime delivery.
6. [ ] Connect global search to scoped backend results. Connect quick enlist to the same validated user/student service, not a separate shortcut that bypasses rules.
7. [ ] Add CSV and printable/PDF reports; add XLSX only if required. Apply authorization on export endpoints, use the displayed filters, and neutralize spreadsheet formula injection in user-controlled CSV cells.
8. [ ] Add real date/term controls, notification dropdown, profile menu, logout, and a help page. Any visible button must perform its labeled action or explain why it is unavailable.

**Exit checks:** reconcile dashboard and export totals against fixed database fixtures; all 18 navigation targets work for permitted roles; unauthorized menu items and direct API requests remain blocked.

## Phase 10 — Verify the complete system

**Result:** repeatable evidence that workflows and boundaries work together.

Use an isolated `ojt_monitoring_test` database and a test-only upload directory. Refuse destructive test resets unless both database name and environment are explicitly test values. Never point automated tests at real student data.

| Test group | Required cases |
| --- | --- |
| Database | Clean migration, repeatable reference seed, FK rejection, uniqueness, partial migration recovery |
| Authentication | Four roles, invalid login, expired session, logout, CSRF rejection, rate limit, inactive account, forced password change |
| Ownership | Student A cannot access student B; faculty and supervisor cannot cross assignments, including downloads/exports/aggregate queries |
| Accounts/directories | Safe self-edit, forbidden privilege escalation, last-admin protection, archival retains history |
| Placements | Both host types, rollback on requirement-copy failure, concurrent create conflict, forbidden transitions |
| Uploads | Valid file, fake extension, oversize, traversal attempt, unauthorized download, failed persistence cleanup |
| Hours | Breaks, invalid intervals, overlap/concurrent overlap, approved-only totals, correction revokes credit |
| Evaluations | Missing criteria, duplicate/out-of-range scores, correct rounding, draft privacy, finalization locking, historical snapshots |
| Completion | Each missing prerequisite blocks closure; complete valid workflow succeeds |
| UI | Desktop/mobile, keyboard/modal behavior, loading/empty/error/retry, no duplicate submit on double-click |
| Reports | Filters match displayed rows, term boundaries, valid exports, safe CSV cells, no aggregate fan-out |
| Operations | API/database restart, session persistence, backup restoration, missing private file behavior |

1. [ ] Use Node's test runner for business rules and Supertest for API integration. Add browser automation for the central workflow if practical; keep a repeatable manual UAT script regardless.
2. [ ] Complete this demonstration: administrator creates users/host → placement → student submits pre-deployment files → faculty approves → placement activates → student submits duty → supervisor approves → supervisor submits evaluation → faculty finalizes → faculty completes placement → reports match.
3. [ ] Repeat with a school placement and the faculty duty-review path.
4. [ ] Have one representative of each role perform UAT using synthetic records. Record defects by severity and retest fixes.
5. [ ] Review query execution plans and pagination on representative data volumes. Measure common list/dashboard response times and record an acceptable target for the demonstration machine.
6. [ ] Inspect built frontend assets for credentials and remove placeholder links/static fake metrics.

**Exit checks:** no unresolved critical workflow or access-control defects; the full demonstration and restore drill pass; results are recorded in `docs/test-plan.md`.

## Phase 11 — Deploy, back up, and hand over

**Result:** the application can be started, demonstrated, recovered, and maintained by another person.

### 11.1 Local demonstration runbook

Define these backend scripts during implementation: `dev` (nodemon), `start` (Node), `db:migrate` (migration runner), `db:seed` (reference seed), `admin:create` (bootstrap), and `test`. Vite provides its own development/build scripts. These commands are targets to implement; they do not exist in the current reference-only workspace.

First run, from the workspace root, after scripts and environment files exist:

```powershell
# Start XAMPP MySQL; start Apache if using phpMyAdmin.
Set-Location backend
npm ci
# Set migration credentials through the documented local mechanism.
npm run db:migrate
npm run db:seed
npm run admin:create
npm run dev
```

In a second terminal from the workspace root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. API calls go through the proxy. After the first setup, daily development needs only database startup and the two development servers, unless new migrations/dependencies were added.

### 11.2 Local release and LAN demonstration

1. [ ] Run `npm run build` inside `frontend`. Configure Express to serve only `frontend/dist`, with API routes first and SPA fallback last. The fallback must not turn API 404s into HTML responses.
2. [ ] Start the backend with `npm start`; use one documented browser origin, normally `http://localhost:5000`, for local release testing.
3. [ ] For a LAN demonstration, bind the API to the intended LAN interface (or `0.0.0.0` if required), document the host IP/port, and add a limited firewall rule for the app port. Keep MariaDB restricted to the application machine and phpMyAdmin local.
4. [ ] Use HTTPS for a real shared deployment and configure secure cookies accordingly. Do not expose Vite's development server as the final deployed application.
5. [ ] Keep private uploads and database data out of OneDrive synchronization for operational deployment; configure a dedicated service-owned storage location and document the move. The source/reference workspace can remain here.

### 11.3 Production hosting

XAMPP is intended for development, according to the [official FAQ](https://www.apachefriends.org/faq_windows.html). For public hosting use maintained MariaDB/MySQL, a Node process manager/service, HTTPS reverse proxy, private persistent storage, and a tested backup schedule. Do not simply forward the default XAMPP services to the internet.

The existing plan's Vercel/Render split is not a complete deployment solution for a database on your laptop: a hosted API cannot reach your laptop through its own `localhost`. Use a reachable private database and persistent upload storage on the selected hosting architecture. Prefer the same browser origin for the UI and API to simplify cookie/session behavior.

Document service startup after reboot, environment secrets, trusted proxy settings, database access rules, log rotation, upload permissions, health checks, and rollback procedure. If replacing MariaDB with MySQL in production, run migrations and integration tests against that exact engine/version before release.

### 11.4 Backup and restore

- [ ] Back up schema/data, private uploaded files, migration versions, and separately protected configuration needed for recovery. Do not rely on a source-code ZIP or the MariaDB data folder copied while running.
- [ ] For a small deployment, pause writes during a consistent database-and-files backup. Export the database via phpMyAdmin or a documented logical dump command; archive the matching private files; write a manifest with timestamps and versions.
- [ ] Encrypt sensitive backups and restrict access. Record retention and recovery targets with the institution.
- [ ] Restore to a separate database and storage directory, configure a test instance, invalidate restored sessions/reset tokens, and verify login, placements, file downloads, hours, and evaluations.
- [ ] Take a verified backup before release migrations. A rollback may need restoring data as well as reverting code; document the expected downtime and any lost writes.

### 11.5 Handover package

- [ ] `README.md`: exact setup/start commands and links to this guide.
- [ ] ERD and complete data dictionary matching final migrations.
- [ ] API reference: authentication, CSRF, request/response examples, status codes, role/ownership rules.
- [ ] Four user manuals with screenshots and full workflows.
- [ ] Deployment/environment instructions, backup/restore procedure, troubleshooting, and known limitations.
- [ ] UAT evidence, test results, demonstration seed, and release checklist.
- [ ] Academic documentation required by the school, with diagrams and screenshots of the implemented system.

**Exit checks:** another person can install a clean copy using the README, complete the demonstration with all four roles, restart the deployed instance, and restore a backup.

## Troubleshooting during implementation

| Symptom | Check and corrective action |
| --- | --- |
| XAMPP MySQL will not start | Inspect its error log and check port 3306 for another service. Resolve the conflict or consistently change the DB port; do not delete database files as a shortcut. |
| phpMyAdmin will not open | Verify Apache and its actual HTTP port. An Apache conflict does not necessarily mean MariaDB is down. |
| `ECONNREFUSED` | Confirm database service, host, and port, then test readiness. |
| Access denied | Verify password and the database account's host match; compare `127.0.0.1` versus `localhost`. |
| Table missing | Verify selected database, migration history, and migration credentials. |
| Login succeeds but next request is 401 | Inspect cookie origin/path/secure settings, proxy behavior, session persistence, and whether the secret changes at restart. |
| Mutation returns 403 | Verify CSRF token after login regeneration and the actor's role plus placement assignment. |
| Hours are multiplied | Aggregate each one-to-many relation separately before joining. |
| Upload works but download fails | Check private root resolution, stored storage key, file existence, permissions, and record ownership. |
| Frontend route refresh gives 404 | Configure the SPA fallback after API/static handling. |
| Remote browser tries its own localhost | Use relative `/api` URLs; configure the actual deployment origin. |
| Requirement/grade changed historically | Verify snapshot fields and rubric versioning; do not join mutable templates for historical totals. |

## Final acceptance checklist

- [ ] Clean installation succeeds without a Supabase account, SDK, keys, or PostgreSQL syntax.
- [ ] Database credentials stay in the backend and the runtime account cannot change the schema.
- [ ] All four roles work with record-level access restrictions.
- [ ] All 18 existing navigation targets and visible actions are functional.
- [ ] Requirements, private downloads, duty approvals, evaluations, and completion work together.
- [ ] Dashboards and exports match approved records and selected filters.
- [ ] No working passwords, student documents, or private database dumps are committed.
- [ ] Local/LAN startup and the selected production approach are documented separately.
- [ ] Tests, UAT, and an actual backup restoration pass.

## Suggested implementation requests, one phase at a time

Use: “Implement Phase N of `MASTER-EXECUTION-PLAN-XAMPP.md`. Read the current code and completed phases first. Build the backend and UI needed by that phase, verify the exit checks, update the documentation, and report what is complete and what still needs work.”

Begin with Phase 0, then Phase 1. Do not request all modules in one unverified code generation pass. Update this document when a recorded business decision changes, and keep applied migrations immutable.
