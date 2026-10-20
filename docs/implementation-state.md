# Implementation state and evidence

Updated October 20, 2026. Baseline commit: da1ce62. The user authorized execution of the complete local plan and subsequently requested a Git commit documenting what Codex completed. The initial repository contained design/specification files only. Public deployment has not been performed. Original reference files remain unchanged.

## Work completed by Codex

- Implemented the React frontend and Express API with administrator, faculty, student and supervisor access, database-backed authentication, CSRF protection and assignment-based permissions.
- Added six MariaDB migrations, reference/demo seeds and an administrator creation script; implemented directories, placements, private requirement uploads, duty approval, evaluations, completion checks, dashboards, notifications, audit history and reports.
- Added backup, isolated restore, file reconciliation and performance verification tools, plus automated backend and browser workflow tests.
- Documented every execution-plan task, architecture, schema, API, user workflows, local setup, deployment/recovery procedures, verification evidence and remaining acceptance work.
- Verified 35 backend tests, two browser tests, clean dependency installation, the frontend build, local startup, database restart, performance and an actual isolated backup/restore drill. Detailed results are recorded below and in docs/evidence.

Human UAT, institutional policy approval and operational deployment remain pending. This commit records the completed local implementation and its verification; it does not mark those pending tasks complete.

## Phase status

| Phase | Engineering result                                                                                     | Verification / remaining acceptance                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Project skeleton, lockfiles, env examples, ignore rules and decisions complete                         | Clean npm ci passed for both packages. Node 22.18 compatibility deviation recorded; Node 24 target remains pinned. Isolated XAMPP MariaDB 3308 replaces failed original service for local verification.            |
| 1     | Six migrations, checksum/advisory-lock runner, ERD/dictionary, reference/demo seeds, administrator CLI | Fresh isolated migrations; idempotency, composite seed key, hash/duplicate CLI, FK/unique/date/host checks and runtime DDL denial passed.                                                                          |
| 2     | Pool, lifecycle, sessions, authentication, CSRF, validation, errors and scope                          | Four roles, absolute expiry, version revocation, logout, reset/forced change, origin/Referer, failed-login limit and last-admin cases passed.                                                                      |
| 3     | React/Vite shell, local tokens, shared components, auth context and guarded routes                     | Build passes; browser refresh/login/forced password flow passed. Keyboard focus/Escape/return, error/retry and no-overflow 390px mobile gates passed.                                                              |
| 4     | Accounts/profiles, directories, companies/departments, terms and templates                             | Transaction/rollback/duplicates/self-escalation verified; prerequisites created in full browser flow.                                                                                                              |
| 5     | Assignment wizard, scoped roster/detail, snapshots and transitions                                     | Both hosts; copy-failure rollback; concurrent live creation produces one success/one 409; invalid hosts rejected.                                                                                                  |
| 6     | Private staged/versioned files, review/reopen, download, reconciliation                                | MIME/signature/extension/size checks; real unassigned download denial; metadata-failure cleanup; staging-junction/path rejection; review/resubmission passed. Due-date policy not supplied.                        |
| 7     | Weekly plans and actual logs, server minutes, reviews, daily/overlap locks                             | Planned work awards no credit; 480-minute calculation, overlap/concurrent requests, daily cap, immutable approved work and credit revocation passed.                                                               |
| 8     | Version snapshots, drafts, scoring, submission/finalization and completion                             | Missing/duplicate/out-of-range criteria fail; 81/100=81%; draft privacy and new-version history verified. Deterministic concurrent score clearing and document reopen cannot bypass publication/completion checks. |
| 9     | Four dashboards, all 18 mapped routes, reports, CSV/print, inbox, audit, search, settings/help         | Scoped totals reconcile (two documents + three approved hours = exactly 180 minutes); safe CSV, browser navigation and export verified.                                                                            |
| 10    | Automated suites, synthetic full company/school UAT, screenshots and benchmark                         | 35/35 backend tests passed. Human representatives for each role have not performed institutional UAT.                                                                                                              |
| 11    | Built same-origin release, runbook, backup/restore tools, manuals and handover                         | Actual isolated restore passed. Operational encryption/retention, personal administrator credentials, institution-specific academic sign-off and any LAN/public deployment remain operator/institution tasks.      |

Every original checkbox has its own result in [task-completion.md](task-completion.md). Do not interpret software implementation as institutional approval.

## Commands and results

| Command / check                             | Recorded result                                                                                                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm ci in backend and frontend              | Both passed from lockfiles; TLS verification retained                                                                                                                                          |
| node backend/scripts/migrate.js             | All six files applied to fresh ojt_monitoring on 3308                                                                                                                                          |
| node backend/scripts/migrate.js --test      | All six files applied to fresh ojt_monitoring_test; auth suite also creates a fresh owned database each run                                                                                    |
| npm run db:seed --prefix backend            | Reference seed passed; repeated seeds preserve existing values                                                                                                                                 |
| npm test --prefix backend                   | 35 tests, 35 passed, 0 failed; 41442 ms; v22.18.0                                                                                                                                              |
| npm run build --prefix frontend             | Passed; Vite 7.3.7, 67 modules, local build assets                                                                                                                                             |
| npm run test:e2e --prefix frontend          | 2/2 passed in one combined gate: company/school flow plus keyboard/error/mobile/API fallback                                                                                                   |
| npm run verify:performance --prefix backend | 1,000 placements and 10,000 duty logs; list median 176.26 ms / max 467.87 ms; dashboard median 76.91 ms / max 107.15 ms; 500 ms local target met                                               |
| EXPLAIN term/status roster query            | ix_placement_term selected; Using where; Using index                                                                                                                                           |
| npm run verify:restore --prefix backend     | Dump/files/migrations matched; restored sessions/reset tokens invalidated; login, completed placement, 480 approved minutes, two 81% finalized evaluations and authorized file download passed |
| npm run files:reconcile --prefix backend    | Passed against empty development storage; removed 0 abandoned files                                                                                                                            |
| Secret/reference checks                     | Actual backend secret values absent from frontend assets; original references unchanged; private env/uploads/dumps/tools ignored                                                               |

## Defects and environment failures corrected

1. Original port 3306 failed with pre-existing InnoDB LSN corruption. No original database was deleted or reinitialized. A sandbox-created 3307 instance suffered Aria file-sync failures; the verified instance was initialized outside the sandbox at .tools/mariadb-verified on 3308.
2. Sandboxed npm certificate verification failed. Installation succeeded with the Windows CA store outside the sandbox; certificate validation was not disabled. Vite config resolution also required execution outside the sandbox.
3. Initial test fixtures lost a non-ASCII character through the PowerShell pipeline; the UTF-8 byte test now uses a Unicode escape. MariaDB CHECK error 4025 is explicitly normalized.
4. Partial template PATCH initially required isActive. Corrected to optional and verified by rubric/history tests.
5. Exact form labels and nested dialog heading IDs interfered with accessible field lookup. Explicit labels and React useId corrected this; browser workflows pass.
6. A focused browser check caught horizontal mobile overflow. Grid tracks now use minmax(0,...) and cards have min-width:0 so tables scroll within cards. The combined browser gate passed with a 390px screenshot and no page overflow.
7. Final transaction review found possible stale prerequisite reads after waiting for a lock and extra identity-row locks from a joined FOR UPDATE. Business transactions now use READ COMMITTED; placement locks are separate from identity reads; score publication locks current score rows. CSV alone uses a REPEATABLE READ export snapshot. Deterministic concurrent reopen/score clearing assertions pass.
8. Reference terms now match the full year/semester key. Seeds never append default criteria to a used rubric. Strict ID parsing rejects boolean/array coercion. Private storage rejects staging symlinks/junctions before persistence or reconciliation.

## Deliberate initial-scope choices

Required hours are per-placement approved minutes; 486 is demo data only. No due-date/late, regulatory compliance, weighting or retention policy is invented. Initial recovery is assisted reset; notifications are in-app and poll every 30 seconds plus mutation refreshes. Transfers of active history, finalized evaluation revisions, overnight work, external email and XLSX are outside the canonical initial contract. Node 24 execution is not claimed; the available compatible Node 22.18 runtime was tested.

## Remaining work requiring people or an operational target

- Phase 10 task 4: real representatives of admin/faculty/student/supervisor execute and sign the supplied UAT script. This is the next incomplete acceptance task.
- Institution approves hours/daily limit, rubric, any deadlines, retention and recovery targets; supplies its required academic report format/signatories.
- Operator runs admin:create to choose their own non-test administrator credentials, and configures restricted encrypted backup storage plus separate secret recovery.
- A LAN/public service target, HTTPS, firewall/service startup and permanent service-owned storage are configured only when that target is selected. No public deployment is claimed.

See release-checklist.md for the explicit handover boundary. The user requested that the completed local source, documentation and non-private verification evidence be committed to Git. Local secrets, private uploads, database files and backups remain excluded.

## Final local gate

- Backend: 35/35 passed; browser: 2/2 passed. Build and clean installs passed.
- Isolated MariaDB restart persisted all six migrations, six synthetic placements, twelve private files and 2880 approved minutes; runtime readiness returned with UTC connections.
- npm start was exercised at http://localhost:5000: liveness/readiness, SPA refresh and JSON API errors passed. The smoke-test API was stopped afterward; the isolated database remains available.
- Latest actual restore matched 6 migrations, 12 file checksums and 6 placements. Authentication/downloads, 480 approved minutes, two finalized 81% scorecards and session/reset-token invalidation passed.
- A malformed multibyte CSRF regression now returns 403 after equal-length byte comparison. All exercised workflow/access defects are resolved; human institutional UAT remains open.

### Applied development migrations

| Migration                            | SHA-256                                                          | Applied UTC             |
| ------------------------------------ | ---------------------------------------------------------------- | ----------------------- |
| 001-identity-directories.sql         | 3a0a7929d6e33b592c3d1a171538a99469f16271a3b149c01e8350ef390f4176 | 2026-10-20 02:44:03.058 |
| 002-placements-requirements.sql      | 8d2e19f9d5f4ee5316569f9fc77181327a728b0bc20420a11e291a78a0b17cb8 | 2026-10-20 02:44:03.117 |
| 003-files-current-upload.sql         | 06988eb1a44841f287f65790ffefc72ebacec73a1adfb16c779c66f341423a55 | 2026-10-20 02:44:03.190 |
| 004-schedules-duty-logs.sql          | 4eeef68acee46c6ca02a165a2d7848c5b8fcdb87ab61fd7ecdcc3da3ae00ef53 | 2026-10-20 02:44:03.222 |
| 005-evaluations.sql                  | ad2a6bf2064af08309326b81b76f8789b266d3c1d4084f86210bd29bc8cc576d | 2026-10-20 02:44:03.267 |
| 006-sessions-audit-notifications.sql | 623acd54555fcec22d055d4e56e90744db6ab6d9daef6cf5ef68c44078f55815 | 2026-10-20 02:44:03.322 |

Evidence files: backend-tests.json, browser-tests.json, performance.json, restore-result.json and operations.json under docs/evidence. No secrets or dump contents are included in these evidence summaries.
