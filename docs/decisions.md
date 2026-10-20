# Recorded implementation decisions

October 20, 2026. AI-IMPLEMENTATION-SPEC.md is the technical authority.

- Roles: administrator, assigned faculty, owning student, explicitly assigned company supervisor. One immutable role per account.
- Use the available Node 22.18.0 for verification (supported by Vite 7); `.nvmrc` pins the requested Node 24 target. Manifests accept 22.12–24 so this compatibility choice is explicit. Node 24 verification remains a separate environment check.
- Hours are stored as positive integer minutes per placement, entered by the administrator from approved program policy. No asserted compliance or default institutional 486-hour rule.
- Terms are explicit records; an administrator atomically selects the current term. Requirements snapshot active templates. Rubrics snapshot one highest active version.
- Company duty reviewer/evaluator: assigned supervisor. School duty reviewer/evaluator: assigned faculty. Faculty/admin review requirements and finalize evaluations. Admin duty overrides require remarks.
- File limit: 10 MiB; PDF/JPEG/PNG signatures; immutable private file versions; authenticated attachments.
- Completion: sufficient approved minutes, all required snapshots approved, finalized midterm and final, no submitted reviews. Initial daily limit 480 minutes, configurable using DAILY_LIMIT_MINUTES before institutional release.
- No active placement transfers or finalized evaluation revisions in this release. Preserve history with 409 IMMUTABLE_RECORD.
- Initial password recovery is administrator-assisted reset and forced password change. No email service. Notifications stay inside the app.
- Requirement due dates, institution-approved program defaults, retention periods, and grading weights have no approved policy here. Do not invent them; use unweighted sum(score)/sum(maximum) and display workflow status without unsupported overdue claims.
- CSV and browser-print reports are the initial exports. XLSX is outside the specified initial contract.
- Preserve original reference files. Do not commit changes or publish without user authorization.

- Business transactions explicitly use READ COMMITTED, so prerequisite rechecks see commits made while waiting for the placement lock. Lock only the placement row; identity joins do not take extra student/faculty locks. Evaluation score rows use locking reads for submit/finalize. CSV uses an explicit REPEATABLE READ snapshot across exported pages. Deterministic concurrent reopen/score-change tests verify this boundary.
- Successful sign-ins do not consume the failed-login rate limit (ten failures per IP per fifteen minutes).
