# Practicum - OJT Monitoring System

React 19 / Vite 7 frontend, Express 5 API and XAMPP MariaDB. The original design and planning references are preserved. Implementation evidence and unfinished acceptance work are recorded in [docs/implementation-state.md](docs/implementation-state.md) and the [task ledger](docs/task-completion.md).

## Requirements

Node 24 is the target (see .nvmrc); this workstation was verified with Node 22.18.0, which meets the selected tools' engine requirements. MariaDB 10.4.32 was used. Git and a working localhost MariaDB service are required. Apache/PHP are optional for phpMyAdmin. No Supabase account is required.

## First installation

1. Start XAMPP MariaDB. Use a new empty database; do not recreate existing databases. Follow [database/setup.sql.example](database/setup.sql.example) using a database administrator and replace every password placeholder.
2. Copy backend/.env.example to backend/.env. Set runtime credentials, migration credentials, a random 64-hex-character SESSION_SECRET and actual DB_PORT. The runtime account must not be root. See [environment.md](docs/environment.md).
3. Copy frontend/.env.example to frontend/.env if changing public settings. Keep API base /api.
4. From PowerShell in the repository, run:

```powershell
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
npm.cmd run db:migrate --prefix backend
npm.cmd run db:seed --prefix backend
npm.cmd run admin:create --prefix backend
```

The administrator script asks for your email, name and hidden temporary password. The first login requires changing that password. Never use the synthetic browser-test accounts outside the isolated test database.

## Daily development

Run these in two terminals from the repository:

```powershell
npm.cmd run dev --prefix backend
```

```powershell
npm.cmd run dev --prefix frontend
```

Open http://localhost:5173. The frontend proxies /api to 127.0.0.1:5000. The current workstation's verified database is an isolated instance on 127.0.0.1:3308; ignored local .env files already point to it. The original XAMPP database on port 3306 reported corruption and was left untouched. See the restart command in [deployment.md](docs/deployment.md).

## Verification

Create a separate database and runtime user for ojt_monitoring_test, grant only DML to the runtime user, and copy backend/.env.test.example to backend/.env.test. Set migration credentials and a storage path containing test-private. Tests refuse production names or development credential fallback.

```powershell
node backend/scripts/migrate.js --test
npm.cmd test --prefix backend
npm.cmd run build --prefix frontend
npx.cmd --prefix frontend playwright install chromium
npm.cmd run test:e2e --prefix frontend
```

Browser tests use the built frontend and a separate test API on localhost:5001. They create synthetic accounts and complete both host types. Do not run browser and HTTP suites concurrently against the same test database. Browser fixtures are retained for the restore drill and are labeled browser-* @tests.invalid. See [test-plan.md](docs/test-plan.md).

## Local release and recovery

Build the frontend, set APP_ORIGIN=http://localhost:5000 with NODE_ENV=development for this local HTTP release, and run npm.cmd start --prefix backend. Express serves the build and API under one origin. For a shared production service use HTTPS and NODE_ENV=production. Public hosting has not been configured.

The [deployment runbook](docs/deployment.md) covers startup, database grants, secrets, backups, isolated restore, release rollback and maintenance. Read the [user manual](docs/user-manual.md), [API reference](docs/api-reference.md), [ERD](docs/erd.md), [data dictionary](docs/data-dictionary.md) and [recorded policy decisions](docs/decisions.md).

Current verification: 35 backend tests, two browser tests, clean installs/build, local release smoke, database restart, synthetic-volume benchmark and actual isolated restore passed. Real representative UAT and institutional policy approval remain open. Use docs/task-completion.md for the complete status of every original task.
