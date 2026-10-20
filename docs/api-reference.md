# API reference

All endpoints use /api. JSON success is {data,meta?}; errors are {error:{code,message,fields?},requestId}. IDs are numeric, keys camelCase, dates YYYY-MM-DD, instants UTC ISO 8601, decimal scores numeric. Lists default to page=1, limit=20 (max 100), literal-substring search, allowlisted id/createdAt sort and asc/desc direction. Unknown mutation keys fail 422. Inaccessible details return 404; forbidden known actions return 403.

## Authentication and CSRF

Fetch GET /api/auth/csrf with credentials included. Send its data.csrfToken in X-CSRF-Token on every POST/PATCH/PUT/DELETE, including login. Origin must exactly match APP_ORIGIN; a same-origin Referer is accepted only when Origin is absent. After login fetch csrf again because session and token rotate. Cookies are HttpOnly, SameSite=Lax, eight-hour absolute maximum, Secure over production HTTPS. No bearer token is stored in the browser.

Login body: {email,password}. The safe response includes role, fullName and mustChangePassword; /auth/me also includes the role-specific profile. Forced-change accounts can access only me, csrf, logout and change-password. Passwords are 12-72 UTF-8 bytes. Password change requires {currentPassword,newPassword}, destroys the current session and increments session_version. Admin reset takes {temporaryPassword} and forces the next change. No email/token reset endpoint exists in the initial release.

## Implemented routes

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



Additional implemented reads: GET /students/:id, /faculty/:id, /supervisors/:id, /company-departments and GET detail for configurable directories. They use the same assignment scope. /companies/:id/departments also applies the parent-company filter.

## Roles, transactions and payloads

Administrators create users and their validated role profile in one transaction. Student profile is {studentNumber,course,yearLevel,schoolDepartmentId}; faculty {employeeNumber,schoolDepartmentId}; supervisor {companyDepartmentId,position?,contactPhone?}; admin {}. PATCH role is forbidden. Self-edit accepts fullName only. The last active administrator is protected.

Placement body is {studentId,facultyId,supervisorId?,academicTermId,deploymentType,companyDepartmentId?,schoolDepartmentId?,startDate,endDate,requiredMinutes}. PATCH omits studentId and is pending-only. Company and school hosts are mutually exclusive; supervisor must match company department. Dates fit inside the term. Creation/status changes lock student before placement and enforce one live placement.

Duty body is {clockIn,clockOut,breakMinutes}. Example clocks: 2026-10-19T08:00:00+08:00 and 2026-10-19T17:00:00+08:00. Whole minutes and same Manila date are required. Work must be inside placement dates and already elapsed. The server computes creditedMinutes. Rejection/reopen requires nonblank remarks; administrator duty reviews always require remarks.

Uploads use multipart field file; MIME, extension and signature must agree. Download IDs are authorized through the parent placement. No disk path is accepted. Retained file versions are immutable attachments.

Evaluation PATCH is {scores:[{criterionId,score,remarks?}],remarks?}. Draft scores may be null; submit/finalize require every snapshot score. Company supervisor or school faculty authors; assigned faculty/admin finalizes. Students can read finalized evaluations only. No transfer or finalized revision endpoint exists.

Common errors: 401 UNAUTHENTICATED/SESSION_EXPIRED/INVALID_CREDENTIALS; 403 CSRF_INVALID/INVALID_ORIGIN/PASSWORD_CHANGE_REQUIRED/FORBIDDEN; 404 NOT_FOUND/FILE_NOT_FOUND; 409 LIVE_PLACEMENT_EXISTS/DUPLICATE_RECORD/INVALID_TRANSITION/IMMUTABLE_RECORD/COMPLETION_BLOCKED/DUTY_OVERLAP; 413 UPLOAD_TOO_LARGE; 422 VALIDATION_ERROR/INVALID_REFERENCE/DAILY_LIMIT_EXCEEDED/OVERNIGHT_NOT_SUPPORTED/INCOMPLETE_SCORES; 429 RATE_LIMITED. Unexpected failures return generic 500 and a request ID.

