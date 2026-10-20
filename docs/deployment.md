# Local release, maintenance and recovery

## First install / daily startup

Follow README.md. Use a dedicated DML runtime account and a separate DDL migration account. Keep the source in this workspace; Apache htdocs is not required. The application resolves private storage independently of public static assets.

On this workstation the installed XAMPP data directory reported pre-existing InnoDB corruption. It was not repaired, deleted or reset. Verification used a fresh data directory at .tools/mariadb-verified on port 3308, created using the installed XAMPP mysql_install_db.exe outside the sandbox. To restart that verified local instance after it has stopped:

```powershell
Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--no-defaults','--basedir=C:\xampp\mysql','--datadir=C:\Users\9real\websyst\OJT-web-systems\.tools\mariadb-verified','--port=3308','--bind-address=127.0.0.1','--max-allowed-packet=32M' -WindowStyle Hidden
```

Check that no process already uses port 3308 before starting it. The .tools directory and local credentials are ignored and are not a portable installation. A new machine should use its own empty MariaDB instance and README setup. The isolated instance is a development service, not production hosting. No Windows service or firewall rule was installed.

Run npm.cmd run db:check --prefix backend before starting the API. Daily development is the two dev commands in README. Use http://localhost:5173 consistently; Vite sends /api to 127.0.0.1:5000. If changing ports, update APP_ORIGIN, backend PORT and frontend/vite.config.js together.

## Local release

1. Verify backend tests and build the frontend with npm.cmd run build --prefix frontend.
2. Use a stable session secret and APP_ORIGIN=http://localhost:5000. Local HTTP uses NODE_ENV=development so cookies are accepted. This is a local release demonstration, not public production.
3. Start npm.cmd start --prefix backend and open http://localhost:5000. Express serves frontend/dist; /api is handled before the SPA fallback. Unknown API routes remain JSON 404s.
4. Create your first administrator interactively with npm.cmd run admin:create --prefix backend. Do not reuse synthetic test passwords.
5. Stop via Ctrl+C. The HTTP listener, session timers and pool close on SIGINT/SIGTERM. Restart with the same secret and database to retain unexpired sessions.

For a LAN demonstration choose one explicit host/IP and APP_ORIGIN, bind the API to that interface, and approve a narrow firewall rule. Do not expose MariaDB or phpMyAdmin to the network. No LAN firewall changes or public hosting have been performed.

For an actual shared deployment: maintained Node/MariaDB services, HTTPS reverse proxy, NODE_ENV=production, APP_ORIGIN=https://your-host, and TRUST_PROXY=loopback only if that is the real proxy boundary. Use service-owned persistent private storage outside synchronization folders. Restrict DB access, set a service restart policy, rotate structured logs and keep secrets outside source. Session cookies are Secure in production; startup rejects an HTTP production origin.

## Migrations and release rollback

Take a verified consistent backup first. Run db:migrate using the migration account. The runner obtains an advisory lock, refuses changed applied checksums and records a migration only after all its statements succeed. MariaDB DDL implicitly commits. If a migration fails partway, stop, inspect the exact tables/constraints, and apply a reviewed forward repair. Never edit an applied migration to conceal drift or auto-drop tables. A failed file is not recorded as applied; repair its partial state before rerunning it.

Rollback may require restoring database and private files from the same backup plus reverting application code. Declare the maintenance window and possible lost writes. Code rollback alone does not undo a schema or record change.

## Consistent backup

Pause application writes by stopping the API; keep MariaDB running. The backup command requires an explicit --writes-paused assertion, captures schema/data and migration history using a transaction-consistent logical dump, and copies only referenced private files after checking SHA-256. A manifest contains dump and file checksums. No passwords are included in command arguments or console output. Backups contain password hashes, sessions and private documents and must remain access-restricted, encrypted at rest (for example institution-managed encrypted storage), and outside Git.

```powershell
npm.cmd run backup --prefix backend -- --output ../backups/release-2026-10-20 --writes-paused
```

A new output directory is required; the command refuses to overwrite. MYSQL_DUMP_PATH can override C:/xampp/mysql/bin/mysqldump.exe. Protect the corresponding environment secrets separately. Agree on backup frequency, retention, recovery time and recovery point objectives with the institution; no policy has been invented here.

## Isolated restore drill

Use an administrator with CREATE DATABASE/USER/grant access for a test-only instance. Restore only to a new, different database ending _test and a distinct path containing test-private. The script refuses overwriting an existing database/directory, verifies the dump checksum, imports into the isolated target, copies and hashes the corresponding files, compares migration history, deletes restored sessions/reset tokens and increments user session versions.

```powershell
npm.cmd run backup --prefix backend -- --env .env.test --output ../backups/drill-source --writes-paused
npm.cmd run restore:test --prefix backend -- --env .env.test --input ../backups/drill-source --database ojt_restore_drill_test --uploads ../storage/test-private/restore-drill
```

MYSQL_CLIENT_PATH can override the installed mysql.exe path. Point a separate test instance at the restored database/storage and verify login, scoped placements, attachment downloads, approved duty, published evaluations and reports. Do not switch the real application to the restored database during a drill. Keep the original source database unchanged. Record the result in implementation-state.md. A production recovery is a separately reviewed operation; the provided restore tool intentionally requires an isolated test target.

## Maintenance and troubleshooting

Run npm.cmd run files:reconcile --prefix backend during maintenance. It removes staged and unreferenced regular files older than 24 hours; it keeps referenced files, fresh files and symlinks untouched. Uploads stage in a private .staging directory and are cleaned if validation/metadata commit fails.

- Database unavailable: check the selected port/service and db:check; do not delete InnoDB files.
- Login then 401: consistent browser origin, stable session secret, migrated sessions table, active account and matching session_version.
- Mutation 403: fetch a fresh CSRF token after login, verify Origin, role, assignment and forced password-change state.
- Missing upload: authenticated download returns a useful 404; restore the matching private file from backup, never substitute a public URL.
- API route returns HTML: verify /api routes precede the SPA fallback.
- Changed historical grade/hours: inspect snapshots and approved states; requirements and duty are aggregated independently.
