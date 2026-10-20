# Verification plan and evidence

Use synthetic records only. Each backend fixture group owns its rows; the isolated authentication suite creates and removes a unique database ending _test and its own DML account. The browser suite retains labeled synthetic fixtures for recovery verification. Private test storage is separate from application storage.

## Automated backend checks

npm.cmd test --prefix backend passed 35 checks, including strict ID/password validation, storage junction rejection and deterministic concurrent completion/scoring checks. Includes fresh migrations into isolated auth DB, checksum-matched repeat migration, repeat reference seeds, runtime DDL denial, foreign keys, uniqueness, date CHECK constraints, UTC connections, password UTF-8 bounds, authentication and absolute expiry, logout cookie invalidation, forced change/reset, last active administrator, origin/CSRF/Referer handling and rate limiting.

The HTTP suite creates real assigned and unassigned F1/F2, S1/S2, V1/V2 records. It verifies scoped details, children, downloads, lists, exports and dashboard aggregates; atomic account profiles; placement-copy rollback; two concurrent creates; file signatures, oversize rejection and failed-metadata cleanup; document reject/resubmit/approve; overlapping concurrent logs and daily cap; immutable approved duty; correction removes credit; snapshots, draft privacy, score completeness and 81/100=81%; company and school completion; notifications and safe filtered CSV.

A two-document, three-approved-hour fixture returns exactly 180 approved minutes; an extra submitted hour changes pending minutes only. Test failures are fixed and rerun; failed intermediate attempts are recorded in implementation-state.md.

## Browser checks

frontend/tests/workflow.spec.js creates prerequisites in the UI, exercises temporary-password changes, both host workflows, document submission/review, activation, duty approval, rubric scoring, finalization, completion, CSV download, authorized routes, refresh session persistence, mobile navigation and route guards. Playwright records failed traces only in ignored test-results; documentation screenshots use synthetic data in docs/evidence.

The complete company/school browser flow and an actual isolated restore have passed. Both browser tests passed; keyboard/error/mobile results are recorded in implementation-state.md and evidence/browser-tests.json. A test file alone is not evidence of a pass.

## Manual representative UAT

One real representative of each role must repeat the relevant user-manual workflow using synthetic accounts. Record tester, date, expected/actual outcome, defect severity and retest. No human representative UAT or institutional sign-off is claimed by automated browser checks.

Check keyboard Tab and Shift+Tab, modal Escape and focus return; desktop 1440px and mobile 390px; loading, empty, error/retry and invalid forms; double submission; revoked access after deactivation; file missing from disk; API/database restart; print-to-PDF output; institutional hours and rubric acceptance. An unresolved workflow/access defect blocks release.

## Recovery and performance

Stop application writes, create a logical dump plus matching referenced files, restore into a distinct _test database and test-private directory, invalidate sessions/reset tokens, and verify login, authorized download, completed placements, approved minutes and final grades. Record migration/file hashes and readable evidence without dump contents or credentials.

Measure representative lists and dashboards using EXPLAIN and response timings. Small synthetic-fixture measurements are diagnostic only; institutional-scale load acceptance still needs a realistic dataset and approved response-time target.

Latest database restart/local release smoke and restore checks passed; see evidence/operations.json and evidence/restore-result.json. Latest backup copied twelve referenced files and six placements; the restored selected placement retained 480 approved minutes and both 81% finalized evaluations. The API smoke process was stopped after verification.
