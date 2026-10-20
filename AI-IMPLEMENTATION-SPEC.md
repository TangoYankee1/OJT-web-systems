# OJT Monitoring System — AI Implementation Specification

Version 1.0 | October 20, 2026

This file is the technical contract for implementing `MASTER-EXECUTION-PLAN-XAMPP.md`. The application is not implemented by the existence of this document. When the user authorizes implementation, execute this specification autonomously, phase by phase. Preserve `code.html`, `DESIGN.md`, and `masterplan.md.txt` as references.

## 1. Execution protocol

1. Read applicable repository instructions, this file, the phase guide, and existing implementation/state before modifying code.
2. Treat explicit user instructions as authoritative. For implementation details, this file takes precedence over the narrative guide; both supersede the old Supabase plan. `DESIGN.md` controls visual styling unless it conflicts with accessibility or working behavior.
3. Inspect the repository before scaffolding. Do not overwrite existing modules, reinitialize a populated database, or recreate completed phases.
4. Create `docs/implementation-state.md` on the first authorized implementation run. Record phase/task status, commands executed, pass/fail results, migrations applied, decisions, and remaining blockers. Do not store secrets there.
5. Execute the first incomplete phase. Implement its backend, frontend, tests, and documentation, then run its acceptance checks. Continue into subsequent authorized phases without asking routine preference questions.
6. Resolve ordinary missing details using the defaults below. Record deviations in `docs/decisions.md` with a reason and affected contracts. Do not silently invent a different schema or stack.
7. Missing database credentials block database integration only. Continue independent implementation and identify the exact variable or access needed. Do not report database tests as passed when unavailable.
8. Never substitute mock responses for incomplete database queries. Use synthetic fixtures only in explicit test/demo seeds. Never mark a task complete with TODO handlers, placeholder buttons, swallowed errors, or disabled validation.
9. Diagnose failed checks, fix the underlying defect, rerun relevant checks, and update state. Commit only if the user has authorized commits; otherwise leave reviewable workspace changes.
10. Stop before destructive operations on non-test data, public deployment without authorization, or an incompatible requirement. Routine schema creation/migrations on an authorized empty development database do not require repeated approval.

At the end of an implementation session, report completed phases, verification results, unresolved blockers, and the next incomplete task. A session ending is not evidence that the project is complete.

## 2. Fixed stack and defaults

| Decision | Contract |
| --- | --- |
| Backend | Node.js 24 LTS target, CommonJS JavaScript, Express 5, `mysql2/promise` |
| Frontend | React 19, Vite 7, React Router 7 declarative routing, JavaScript/JSX |
| Styling | Local CSS using design tokens; do not depend on Tailwind's browser CDN |
| Database | XAMPP MariaDB, InnoDB, `utf8mb4_unicode_ci`; verify installed engine/version before migration |
| Authentication | Server sessions using `express-session`, HttpOnly cookies, MariaDB session store |
| Testing | Node test runner + Supertest for backend; Playwright for essential browser flows |
| API prefix | `/api`, same browser origin through Vite proxy in development |
| Development ports | DB 3306, API 5000, frontend 5173; override by environment when occupied |
| Local time | Asia/Manila for input/display; UTC for stored instants |
| Academic policy | Program hours and required rubrics must be configurable; 486 is demo data only |
| File policy | PDF/JPEG/PNG, max 10 MiB, private local storage |
| Sessions | 8-hour absolute cookie/session lifetime; explicit logout and revocation |
| Passwords | 12–72 UTF-8 bytes, bcrypt cost 12, never truncate silently |
| Pagination | Default 20, maximum 100; page starts at 1 |
| Initial exports | CSV and printable browser report; PDF through browser print; XLSX optional follow-up |
| External email | Not required for initial release; administrator-assisted temporary-password reset with forced change |
| Notifications | Persist in-app; refresh every 30 seconds while authenticated |

These major versions are deliberate implementation targets, not claims about the latest available releases. Resolve compatible maintained patch releases, record exact versions in lockfiles, and verify the installed Node version against package engine requirements. Do not use `@latest` without checking the resulting major versions. If a target is unavailable or unsupported in the environment, record and test the smallest necessary compatibility adjustment.

Use `express`, `mysql2`, `dotenv`, `express-session`, `express-mysql-session`, `bcryptjs`, `helmet`, `express-rate-limit`, `multer`, `zod`, and `file-type` in the backend. Use dynamic `import('file-type')` from CommonJS when required by its installed module format. Use built-in crypto, filesystem promises, and the Node test runner. Do not add an ORM or JWT layer.

## 3. Repository and module boundaries

```text
backend/
  package.json
  .env.example
  src/
    app.js                        # createApp(dependencies), no listen()
    server.js                     # load environment, validate, connect, listen
    config/{env,db,session}.js
    middleware/{authenticate,authorize,csrf,validate,error-handler}.js
    routes/index.js
    modules/<resource>/
      <resource>.routes.js
      <resource>.controller.js
      <resource>.service.js
      <resource>.repository.js
      <resource>.schemas.js
    shared/{errors,transactions,audit,notifications,pagination,time}.js
  scripts/{migrate,seed,create-admin,check-db}.js
  tests/{unit,integration}/
frontend/
  vite.config.js
  src/
    main.jsx
    App.jsx
    services/api.js
    contexts/auth-context.jsx
    layouts/app-layout.jsx
    components/{protected-route,data-table,status-badge,modal,form-field}.jsx
    pages/<resource>/
    styles/{tokens,global,components}.css
database/{migrations,seeds}/
storage/private/
docs/{implementation-state,decisions,environment,erd,data-dictionary,api-reference,test-plan,deployment,user-manual}.md
```

Controllers map HTTP to services. Services own validation beyond shape checking, authorization, transactions, state transitions, and notifications. Repositories own parameterized SQL and receive a pool or transaction connection explicitly. React pages call `services/api.js`, never SQL or direct database connections.

Required backend npm scripts: `dev`, `start`, `db:check`, `db:migrate`, `db:seed`, `admin:create`, `test`, `test:unit`, `test:integration`. `test` runs unit and integration tests; integration tests must fail clearly if their isolated database is unavailable. Use explicit test file discovery in a small Node launcher if shell glob behavior differs on Windows. Frontend scripts: `dev`, `build`, `preview`, `test:e2e`.

## 4. Environment and startup contract

Backend required settings:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=5000
APP_ORIGIN=http://localhost:5173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ojt_monitoring
DB_USER=ojt_app
DB_PASSWORD=replace_me
MIGRATION_DB_USER=replace_me
MIGRATION_DB_PASSWORD=replace_me
SESSION_SECRET=replace_with_64_hex_characters
SESSION_NAME=ojt.sid
SESSION_MAX_AGE_MS=28800000
UPLOAD_ROOT=../storage/private
MAX_UPLOAD_BYTES=10485760
TRUST_PROXY=false
```

Migration credentials are used only by migration scripts, never by the running API. Require them only for migration execution. Test settings live in an ignored `backend/.env.test` using `DB_NAME=ojt_monitoring_test` and a separate upload root. Do not load development credentials as a silent test fallback.

The frontend uses `VITE_API_BASE_URL=/api` only. Configure Vite proxy target `http://127.0.0.1:5000`, fixed port 5173 with `strictPort: true`, and use `http://localhost:5173` consistently in the browser. No CORS middleware is needed for this same-origin proxy architecture.

Startup order: load dotenv → validate settings → resolve absolute storage root → initialize database pool → verify readiness → initialize session store → start server. Fail startup for missing secrets or a missing migrated session table. On shutdown stop accepting requests, close the HTTP server, close store timers/connections, and end the pool.

## 5. Canonical database contract

All IDs are `INT UNSIGNED AUTO_INCREMENT`; all matching foreign keys use `INT UNSIGNED`. Return IDs as JSON numbers. Timestamps are UTC `DATETIME(3)`; set each DB connection's session timezone to `+00:00`. Use `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` and `updated_at` with the corresponding update default where listed. Date-only values are `DATE`; use `dateStrings: true` so the driver does not shift them.

Notation below: `?` means nullable; `UQ` means unique; unspecified business fields are NOT NULL. Each listed `id` is the primary key. Add named foreign keys and indexes on referencing columns. `timestamps` means both `created_at` and `updated_at`. Use `VARCHAR` plus validated allowed values and compatible CHECK constraints for states, rather than divergent database/application enums.

| Table | Exact columns beyond `id` |
| --- | --- |
| `school_departments` | `code VARCHAR(30) UQ`, `name VARCHAR(150)`, `is_active TINYINT(1) DEFAULT 1`, timestamps |
| `academic_terms` | `academic_year VARCHAR(9)`, `semester VARCHAR(20)`, `start_date DATE`, `end_date DATE`, `is_active TINYINT(1) DEFAULT 0`, timestamps; UQ year/semester |
| `users` | `email VARCHAR(254) UQ`, `password_hash VARCHAR(255)`, `full_name VARCHAR(150)`, `role VARCHAR(20)`, `is_active TINYINT(1) DEFAULT 1`, `must_change_password TINYINT(1) DEFAULT 1`, `session_version INT UNSIGNED DEFAULT 1`, timestamps |
| `students` | `user_id UQ → users`, `student_number VARCHAR(40) UQ`, `course VARCHAR(80)`, `year_level TINYINT UNSIGNED`, `school_department_id → school_departments`, timestamps |
| `faculty` | `user_id UQ → users`, `employee_number VARCHAR(40) UQ`, `school_department_id → school_departments`, timestamps |
| `companies` | `name VARCHAR(180)`, `address TEXT`, `contact_email VARCHAR(254)?`, `contact_phone VARCHAR(30)?`, `is_active TINYINT(1) DEFAULT 1`, timestamps |
| `company_departments` | `company_id → companies`, `department_name VARCHAR(150)`, `is_active TINYINT(1) DEFAULT 1`, timestamps; UQ company/name |
| `company_supervisors` | `user_id UQ → users`, `company_department_id → company_departments`, `position VARCHAR(100)?`, `contact_phone VARCHAR(30)?`, timestamps |
| `placements` | `student_id → students`, `faculty_id → faculty`, `supervisor_id? → company_supervisors`, `academic_term_id → academic_terms`, `deployment_type VARCHAR(10)`, `company_department_id? → company_departments`, `school_department_id? → school_departments`, `start_date DATE`, `end_date DATE`, `required_minutes INT UNSIGNED`, `status VARCHAR(20) DEFAULT 'pending'`, `status_remarks TEXT?`, timestamps |
| `requirements` | `code VARCHAR(40) UQ`, `title VARCHAR(180)`, `description TEXT`, `stage VARCHAR(20)`, `is_required TINYINT(1) DEFAULT 1`, `is_active TINYINT(1) DEFAULT 1`, timestamps |
| `placement_requirements` | `placement_id → placements`, `requirement_id → requirements`, `title_snapshot VARCHAR(180)`, `stage_snapshot VARCHAR(20)`, `is_required_snapshot TINYINT(1)`, `status VARCHAR(20) DEFAULT 'pending'`, `current_upload_id? → uploaded_files`, `submitted_at DATETIME(3)?`, `verified_by? → users`, `verified_at DATETIME(3)?`, `remarks TEXT?`, timestamps; UQ placement/requirement |
| `uploaded_files` | `placement_requirement_id → placement_requirements`, `uploaded_by → users`, `storage_key VARCHAR(100) UQ`, `original_name VARCHAR(255)`, `mime_type VARCHAR(100)`, `size_bytes INT UNSIGNED`, `sha256 CHAR(64)`, `version INT UNSIGNED`, `created_at`; UQ placement_requirement/version |
| `work_schedules` | `placement_id → placements`, `weekday TINYINT UNSIGNED` (1 Monday–7 Sunday), `start_time TIME`, `end_time TIME`, `break_minutes SMALLINT UNSIGNED`, `effective_from DATE`, `effective_to DATE`, timestamps |
| `duty_logs` | `placement_id → placements`, `work_date DATE`, `clock_in DATETIME(3)`, `clock_out DATETIME(3)`, `break_minutes SMALLINT UNSIGNED`, `credited_minutes INT UNSIGNED`, `status VARCHAR(20) DEFAULT 'draft'`, `reviewed_by? → users`, `reviewed_at DATETIME(3)?`, `remarks TEXT?`, timestamps |
| `evaluation_criteria` | `rubric_version INT UNSIGNED`, `code VARCHAR(40)`, `label VARCHAR(180)`, `max_score DECIMAL(7,2)`, `sort_order SMALLINT UNSIGNED`, `is_active TINYINT(1) DEFAULT 1`, timestamps; UQ version/code |
| `evaluations` | `placement_id → placements`, `evaluator_id → users`, `type VARCHAR(10)`, `rubric_version INT UNSIGNED`, `status VARCHAR(20) DEFAULT 'draft'`, `remarks TEXT?`, `submitted_at DATETIME(3)?`, `finalized_by? → users`, `finalized_at DATETIME(3)?`, timestamps; UQ placement/type |
| `evaluation_scores` | `evaluation_id → evaluations`, `criterion_id → evaluation_criteria`, `label_snapshot VARCHAR(180)`, `max_score_snapshot DECIMAL(7,2)`, `score DECIMAL(7,2)?`, `remarks TEXT?`, timestamps; UQ evaluation/criterion |
| `audit_logs` | `actor_id? → users`, `action VARCHAR(80)`, `entity_type VARCHAR(50)`, `entity_id INT UNSIGNED?`, `details_json LONGTEXT` (validated JSON), `request_id VARCHAR(64)`, `created_at` |
| `notifications` | `recipient_id → users`, `event_type VARCHAR(60)`, `entity_type VARCHAR(50)`, `entity_id INT UNSIGNED`, `message VARCHAR(500)`, `read_at DATETIME(3)?`, `created_at` |
| `password_reset_tokens` | `user_id → users`, `token_hash CHAR(64) UQ`, `expires_at DATETIME(3)`, `consumed_at DATETIME(3)?`, `created_at`; reserved for future email reset, no initial email endpoint |
| `schema_migrations` | `version VARCHAR(150) UQ`, `checksum CHAR(64)`, `applied_at DATETIME(3)` |

`sessions` is the one adapter-defined table: use the installed adapter's exact schema, conventionally `session_id VARCHAR(128)` primary key, `expires INT UNSIGNED`, and `data MEDIUMTEXT`. Confirm names/types/collation against the installed package, create through migration, and set `createDatabaseTable: false`. It does not use the common integer `id` convention.

Schema rules:

- Foreign keys use `ON DELETE RESTRICT` by default. Only evaluation draft score rows may cascade with a deliberately deleted draft; audit events remain intact.
- Company host requires a non-null company department and null school department. School host requires the inverse and a null company supervisor. Company placements require a supervisor before activation, not necessarily at initial draft creation.
- `year_level` is 1–6, required minutes > 0, end date ≥ start date, criterion maximum > 0, and non-null score is between 0 and its snapshot maximum.
- Index `placements(faculty_id,status)`, `placements(supervisor_id,status)`, `placements(student_id,status)`, `placements(academic_term_id,status)`, `duty_logs(placement_id,status,work_date)`, `notifications(recipient_id,read_at,created_at)`, and `audit_logs(created_at,id)`.
- Add the circular current-upload foreign key after creating both tables. Check current upload ownership inside the transaction.
- Initial version does not support transferring active placements or revising finalized evaluations. Return `409 IMMUTABLE_RECORD`; preserve history. Add an explicitly designed revision migration/workflow later if requested.
- A new placement snapshots all active requirement templates. A new evaluation snapshots the highest active rubric version; never combine criteria from multiple versions. Template edits affect only new snapshots.
- Serialize changing the active academic term by locking a stable configuration row or all term rows in a transaction. Expose one administrator action that clears the previous active flag and sets the selected term.

### Migration files and runner

Create `001-identity-directories.sql`, `002-placements-requirements.sql`, `003-files-current-upload.sql`, `004-schedules-duty-logs.sql`, `005-evaluations.sql`, and `006-sessions-audit-notifications.sql`.

The runner bootstraps `schema_migrations`, obtains a MariaDB advisory migration lock, sorts filenames, computes SHA-256 checksums, checks applied versions, executes pending DDL, and records a version only after its file succeeds. Release the lock in `finally`. Separate migration SQL execution from the runtime pool; allow multiple SQL statements only in this trusted migration connection. Do not parse SQL by naively splitting semicolons. No stored procedures/triggers are required initially. On partial DDL failure stop, print the failed migration without credentials, and require inspection/forward repair; never auto-drop tables.

Reference seeds upsert by stable codes and do not reset institution-edited values silently. Demo seed is opt-in (`--demo`), labels synthetic records, hashes passwords in Node, and refuses non-development/test execution. `admin:create` takes an interactive password, refuses duplicates, and never prints the password/hash.

## 6. HTTP and validation contract

Success: `{ "data": <object-or-array>, "meta": <optional-pagination> }`.

Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "field": "reason" } }, "requestId": "..." }`.

Lists return `meta: { page, limit, total, totalPages }`. Empty lists return `[]`; a missing detail returns 404. Never include `password_hash`, session data, private storage paths, or reset tokens. Return decimals consistently as JSON numbers after bounded conversion; SQL values arrive as decimal strings by default. Return UTC instants as ISO 8601 `...Z`, dates as `YYYY-MM-DD`.

Use Zod strict object schemas: reject unknown mutation keys; validate IDs as positive integers; trim names; normalize email to lowercase; reject blank strings; bound free-text remarks to 4000 characters. Validate booleans explicitly, not with JavaScript truthiness. Allowlist `sortBy` and `sortOrder`; escape search wildcards if search is intended as literal substring matching.

| Method/path | Request body / behavior | Access |
| --- | --- | --- |
| `GET /health`, `GET /ready` | Generic liveness / DB readiness | Public |
| `GET /auth/csrf` | Returns `{csrfToken}`; establishes anonymous session if necessary | Public |
| `POST /auth/login` | `{email,password}`; returns safe user; rotates session/CSRF | Public + CSRF |
| `GET /auth/me` | Safe user plus role-specific profile | Authenticated |
| `POST /auth/logout` | Empty object; destroys session; 204 | Authenticated + CSRF |
| `POST /auth/change-password` | `{currentPassword,newPassword}`; revoke sessions; require login again | Authenticated |
| `GET/POST /users` | Create `{email,fullName,role,temporaryPassword,profile}` | Admin |
| `GET/PATCH /users/:id` | Self may change `fullName`; admin may manage safe fields; role immutable after creation | Admin/self |
| `POST /users/:id/reset-password` | `{temporaryPassword}`; force password change, revoke sessions | Admin |
| `GET /students`, `/faculty`, `/supervisors` | Searchable directories; filter by authorized assignment | Scoped |
| `GET/POST /companies` | `{name,address,contactEmail?,contactPhone?}` | Scoped read/admin write |
| `GET/PATCH /companies/:id` | Same editable fields plus `isActive` | Scoped read/admin write |
| `GET/POST /companies/:id/departments` | `{departmentName}` | Scoped read/admin write |
| `PATCH /company-departments/:id` | `{departmentName?,isActive?}` | Admin |
| `GET/POST /school-departments` | `{code,name}` | Scoped read/admin write |
| `PATCH /school-departments/:id` | `{name?,isActive?}` | Admin |
| `GET/POST /academic-terms` | `{academicYear,semester,startDate,endDate}` | Authenticated read/admin write |
| `PATCH /academic-terms/:id` | Dates/name only before use | Admin |
| `POST /academic-terms/:id/activate` | Empty object; switch current term atomically | Admin |
| `GET/POST /requirements` | `{code,title,description,stage,isRequired}` | Scoped read/admin write |
| `PATCH /requirements/:id` | Template edits/archive, do not rewrite snapshots | Admin |
| `GET/POST /evaluation-criteria` | `{rubricVersion,code,label,maxScore,sortOrder}` | Scoped read/admin write |
| `PATCH /evaluation-criteria/:id` | Reject modifying a used version; allow archive | Admin |
| `GET/POST /placements` | Create payload below; list scoped by actor | Admin create/scoped read |
| `GET/PATCH /placements/:id` | Edit dates/host/assignments/required minutes only while pending | Admin edit/scoped read |
| `PATCH /placements/:id/status` | `{status,remarks?}` | See transitions |
| `GET /placements/:id/requirements` | Snapshots plus permitted file metadata | Scoped |
| `POST /placement-requirements/:id/uploads` | Multipart field `file`; return updated requirement, 201 | Owning student |
| `PATCH /placement-requirements/:id/review` | `{decision:'approved'|'rejected',remarks?}` | Assigned faculty/admin |
| `POST /placement-requirements/:id/reopen` | `{remarks}`; clear approval, status becomes rejected | Assigned faculty/admin |
| `GET /files/:id/download` | Authorized attachment stream, not JSON | Scoped |
| `GET/POST /placements/:id/schedules` | `{weekday,startTime,endTime,breakMinutes,effectiveFrom,effectiveTo}` | Scoped read/admin or assigned reviewer write |
| `PATCH/DELETE /schedules/:id` | Valid planned schedule fields; DELETE returns 204 | Admin/assigned reviewer |
| `GET/POST /placements/:id/duty-logs` | `{clockIn,clockOut,breakMinutes}` | Scoped read/owning student write |
| `PATCH/DELETE /duty-logs/:id` | Draft/rejected own logs only | Owning student |
| `POST /duty-logs/:id/submit` | Empty object | Owning student |
| `PATCH /duty-logs/:id/review` | `{decision:'approved'|'rejected',remarks?}` | Assigned duty reviewer/admin |
| `POST /duty-logs/:id/reopen` | `{remarks}`; approved → rejected, removes credit | Assigned duty reviewer/admin |
| `GET /placements/:id/progress` | Contract below | Scoped |
| `GET/POST /evaluations` | Create `{placementId,type}`; choose evaluator/rubric server-side | Scoped read/assigned evaluator create |
| `GET/PATCH /evaluations/:id` | Edit `{scores:[{criterionId,score,remarks?}],remarks?}` in draft only | Author draft edit/scoped read |
| `POST /evaluations/:id/submit` | Empty object; enforce complete rubric | Author |
| `PATCH /evaluations/:id/finalize` | Empty object; submitted → finalized | Assigned faculty/admin |
| `GET /dashboard/:role` | Role must match actor, admin uses admin dashboard | Scoped |
| `GET /reports/placements` | Filters + pagination | Admin/faculty/supervisor scoped |
| `GET /reports/placements.csv` | Same filters and scope, CSV attachment | Same |
| `GET /audit-logs` | Paginated events; redact details | Admin |
| `GET /notifications` | Own records only | Authenticated |
| `PATCH /notifications/:id/read` | Empty object, set UTC read time | Recipient |

All paths in this table are relative to `/api`. All mutations except public liveness are protected by CSRF; authenticated mutations also enforce account status and password-change restrictions.

User profile creation body depends on role: student `{studentNumber,course,yearLevel,schoolDepartmentId}`; faculty `{employeeNumber,schoolDepartmentId}`; supervisor `{companyDepartmentId,position?,contactPhone?}`; admin `{}`. Create user/profile/audit in one transaction. Expose profile updates through admin `PATCH /users/:id` under `profile`, validating only fields for that role.

Placement body: `{studentId,facultyId,supervisorId?,academicTermId,deploymentType,companyDepartmentId?,schoolDepartmentId?,startDate,endDate,requiredMinutes}`. Use camelCase JSON and snake_case SQL, mapped explicitly in repository code. Never spread arbitrary request objects into SQL updates.

Progress body: `{placementId,requiredCount,approvedRequirementCount,submittedRequirementCount,approvedMinutes,pendingMinutes,requiredMinutes,hoursPercent,requirementsPercent,completionEligible,blockingReasons}`. Percentages are numbers 0–100, with display capped at 100; actual approved minutes are uncapped. Zero required items means requirementsPercent=100. Completion eligibility still requires finalized midterm and final evaluations by default.

## 7. Authentication and scope implementation

- Put `{userId,sessionVersion,issuedAt,csrfToken}` in the server session. Authenticate by loading the current user and comparing `session_version`; reject inactive accounts, expired absolute age, and mismatched versions. Increment version for password reset/change or deactivation.
- `must_change_password=true` permits only `/auth/me`, `/auth/csrf`, `/auth/logout`, and `/auth/change-password`; other authenticated requests return `403 PASSWORD_CHANGE_REQUIRED`.
- Generate a 32-byte random CSRF token and compare equal-length tokens with `crypto.timingSafeEqual`. Require `X-CSRF-Token` on POST/PATCH/PUT/DELETE; validate Origin against `APP_ORIGIN`, with a documented same-origin Referer fallback. Never log token headers.
- Login: validate CSRF → rate-limit → compare password → regenerate session → set identity/new CSRF → save → return safe user. Frontend fetches `/auth/csrf` again afterward. Invalid credentials always return `401 INVALID_CREDENTIALS`.
- Use `HttpOnly`, `SameSite=Lax`, path `/`, `Secure` in production HTTPS, `resave:false`, `saveUninitialized:false`. Do not store bearer tokens or passwords in browser storage.
- Scope SQL uses actor ID: student via `students.user_id`; faculty via `placements.faculty_id → faculty.user_id`; supervisor via `placements.supervisor_id → company_supervisors.user_id`. Admin is unrestricted. A company department match alone does not confer placement access.
- Check child resources by joining to their parent placement. For inaccessible detail IDs return 404; for a known resource with a forbidden action return 403. Lists/exports/dashboard queries always apply scope before aggregation/pagination.
- Student evaluation reads require finalized status; never include draft scores in a nested placement response. General directory reads expose only minimal required fields, never all contact information by default.

## 8. State machines, concurrency, and atomic operations

### Placements

`pending → approved` by assigned faculty/admin after required pre-deployment files are approved. `approved → active` by admin once start date is reached and an active host/reviewer exists. `active → completed` by faculty/admin only after completion eligibility passes. `pending → rejected` by faculty/admin with remarks. `pending|approved|active → cancelled` by admin with remarks. Terminal states have no normal outgoing transitions.

Every create/status transition locks the student's row first, then the placement row if present. Check for another `pending|approved|active` placement while holding the student lock. All code paths use this lock ordering. Return `409 LIVE_PLACEMENT_EXISTS` on conflict.

Creation transaction: student lock → validate references → insert placement → `INSERT ... SELECT` active requirements and snapshots → insert audit/notifications → commit. On any failure rollback everything. No external file/email work occurs inside this transaction.

### Requirements

Student upload allowed for pending/rejected items in pending/approved/active placements. `pending|rejected → submitted`; faculty/admin `submitted → approved|rejected`; explicit reopen `approved → rejected`. Rejection/reopen requires nonblank remarks. Resubmission clears prior review fields, increments file version under a locked requirement row, and keeps prior files immutable.

### Duty logs

Create/edit only in active placements. `draft|rejected → submitted`; reviewer `submitted → approved|rejected`; explicit reopen `approved → rejected`. No ordinary edits to submitted/approved logs. Only draft/rejected records may be deleted. Admin overrides require remarks.

Clock strings must include explicit `+08:00`, whole-minute precision, and the same Manila local date. Example: `2026-10-20T08:00:00+08:00`. Backend derives work_date, validates it inside placement dates and not in the future, converts to UTC, and computes duration minus breaks. Initial maximum is 480 credited minutes per day; exceeding it returns `422 DAILY_LIMIT_EXCEEDED`. Make the limit configurable before institutional release. Reject overnight logs in this initial version with `422 OVERNIGHT_NOT_SUPPORTED`.

Lock placement row before checking/inserting/editing/reviewing time logs. Reject overlap when `existing.clock_in < new.clock_out AND existing.clock_out > new.clock_in`; include all retained log states. Daily credited totals for submitted/approved logs plus the proposed submission must remain under the limit. Repeat validation at submit/approve to prevent concurrent bypasses.

### Evaluations and completion

Company evaluator is assigned supervisor; school evaluator is assigned faculty. `draft → submitted → finalized`. Only author edits draft; assigned faculty/admin finalizes. Initial release permits one midterm and one final per placement and no reopen after finalization.

Lock placement then evaluation during submission/finalization. Ensure all snapshotted criteria have valid non-null scores. Compute percent from integer hundredths or SQL DECIMAL, using `NULLIF` only as a safety guard; reject invalid zero-max rubrics before publication. Finalizing does not rewrite raw scores or snapshots.

Completion locks student then placement, rechecks required requirement approvals, approved minutes, finalized midterm/final, and absence of submitted duty/requirement reviews. Make all operations that change these prerequisites lock the same placement first. Reject completion with `409 COMPLETION_BLOCKED` and an array of readable blockers.

Do not use a direct join between requirement rows and time rows to sum hours. Aggregate each child relation independently and join the grouped results.

## 9. Files, audit, notifications, and error handling

Authorize before multipart persistence. Stage in a private temporary subdirectory, enforce size limits, inspect signatures, compute SHA-256, create UUID-based storage keys, then save metadata/status under locks. Delete the new file if metadata commit fails. Keep original filenames sanitized for download headers only. Reject symlinks/path traversal; the resolved final path must remain under the configured storage root.

Store no HTML/SVG/executables. Downloads use `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`. For initial release, previews are download/open actions rather than arbitrary inline rendering. Reconcile abandoned staged files by age using a documented maintenance script.

Audit actions use stable strings such as `placement.created`, `placement.status_changed`, `requirement.reviewed`, `duty_log.reviewed`, `evaluation.finalized`, `user.deactivated`. Include safe before/after business fields, actor ID, entity ID, and request ID. Never include passwords, hashes, session/CSRF/reset tokens, or document contents. Critical audits and notification inserts share the business transaction. Failed logins can be structured application logs without creating a transaction.

Notify the assigned faculty on requirement submission, the student on review, the assigned reviewer on duty submission, and faculty on evaluation submission. Do not send external email or messages in this version.

Map duplicate key errors to 409, missing references to validated 422/409, oversized upload errors to 413, and unexpected errors to generic 500 with internal structured context. Always release pooled connections and clean staged files. Never return success after a caught persistence failure.

## 10. Frontend behavior and report definitions

Use the 18-route mapping from the phase guide. Add `/login` and `/change-password`. Auth boot starts in `loading`, calls `/auth/me`, then renders allowed routes or redirects. A loading state must not briefly expose privileged pages.

API client uses `credentials:'include'`, JSON encoding except FormData, CSRF header on mutations, and error normalization. Do not set multipart Content-Type manually. On 401 clear authentication; on password-required 403 redirect to password change; other 403/404 show appropriate errors without redirect loops. Disable submit while pending and use server conflicts as the final duplicate-prevention boundary.

Each resource page has loading, empty, error/retry, populated, and validation states. Preserve filters in URL search parameters. After successful mutations refetch affected lists/details/dashboard counters. Use accessible labels, keyboard focus, and confirmation only for meaningful destructive/irreversible actions.

Dashboard default term is the selected active academic term. Admin totals count active accounts and placements in the selected term; faculty/supervisor counts use assigned placements; student progress uses own live placement or latest historical placement if none is live. Completion rate = completed / (active + completed) in the selected term; zero denominator displays 0 with an empty-state label. Average grade uses finalized final evaluations only. Explain metric definitions in help text.

CSV and printable reports use the same scoped query service and filters as the table. CSV must quote values correctly, use UTF-8, and prefix user-controlled cells beginning with formula-triggering characters after whitespace normalization. Never allow a client field list to expose sensitive columns.

## 11. Deterministic implementation tasks and gates

Every gate requires saved evidence in `docs/implementation-state.md`. Run focused checks after each task and the full applicable gate before advancing. Do not repeatedly rerun unchanged passing suites without a reason.

| Phase | Required implementation artifacts | Gate |
| --- | --- | --- |
| 0 | Skeleton, manifests/lockfiles, env examples, ignore rules, scripts | Install works; no secret values committed; engine versions recorded |
| 1 | Six migrations, runner, ERD/dictionary, reference/demo seeds, bootstrap admin | Clean test DB migration; repeat seed; FK/unique/host constraint failures verified |
| 2 | Pool, server lifecycle, middleware, sessions, auth, CSRF | Login/logout/change-password/disabled account/CSRF integration cases pass |
| 3 | Vite proxy, CSS tokens, layout, login, auth context, route guards | Browser refresh retains session; protected routes redirect; build passes |
| 4 | User/profile/directories/term/templates APIs and pages | Transactional profile creation; duplicate and self-escalation cases fail |
| 5 | Placement repository/service/wizard/transitions | Both host types; rollback; concurrent creation yields one success and one 409 |
| 6 | File storage, requirement service/review UI | Valid upload/review/resubmit; forbidden download; fake MIME/oversize rejection |
| 7 | Schedule/log APIs, calendar/list/editor/reviewer UI | Duration/overlap/daily limit/approved totals/concurrent request checks pass |
| 8 | Rubric snapshot/scoring/finalization/completion | Missing scores fail; 81/100=81%; draft privacy; completion blockers verified |
| 9 | Four dashboards, reports, notifications, audit, settings/help | All 18 routes implemented; scoped metrics reconcile; CSV safe and valid |
| 10 | Full test suite, browser flows, UAT evidence | End-to-end company and school cases pass; no unresolved critical defects |
| 11 | Release build/server config, startup runbook, backup/restore instructions | Clean-install demonstration and isolated restore drill pass |

### Mandatory fixtures and assertions

Create synthetic admin A, faculty F1/F2, students S1/S2, supervisors V1/V2, and two separate host departments. Ensure each negative access test uses a real but unassigned record, not only nonexistent IDs.

1. F1/S1/V1 can access their shared placement; F2/S2/V2 cannot access it through any detail, child, export, or aggregate route.
2. A placement with two required documents and three approved 60-minute logs returns exactly 180 approved minutes. One extra submitted 60-minute log raises pending minutes only.
3. 08:00–17:00 minus 60 minutes credits 480; reverse/overlapping/overnight/excessive intervals fail with documented codes.
4. A forced failure during requirement copying leaves no placement or notification/audit fragment.
5. Two independent connections creating live placements for S1 cannot both commit.
6. Reopening an approved log immediately removes its minutes from eligibility; reopening a requirement blocks completion.
7. A master rubric edit/new version leaves existing score snapshots unchanged. A student receives 404 for draft evaluation details.
8. Logging out makes the captured old cookie unusable. Changing session_version revokes all old sessions.
9. File metadata failure removes staged/new files; a download path cannot escape storage root.
10. Full browser flow: create prerequisites → place → upload/review → activate → duty submit/approve → midterm and final submit/finalize → complete → export.

Use `NODE_ENV=test` and require database name suffix `_test` plus a test-only upload path before any reset utility runs. Each test suite owns isolated fixtures, cleans only its own test database, and never relies on demo production credentials.

## 12. Completion and handoff contract

The project is complete only when every phase gate passes against a real MariaDB instance, every listed route performs its function, documentation matches the implementation, and backup restoration is demonstrated. If infrastructure is unavailable, report exactly which checks remain unverified.

No deployment-provider selection is needed to complete local implementation. Provide a working local release first; public hosting requires a concrete authorized target. Do not describe a development server or a source folder as a deployed system.

Suggested initial user instruction after reviewing these documents:

> Implement the project using AI-IMPLEMENTATION-SPEC.md and MASTER-EXECUTION-PLAN-XAMPP.md. Execute all local implementation phases in order, maintain implementation-state.md, fix verification failures, and continue without asking me to choose routine implementation details. Report any external credentials or access that actually block verification.
