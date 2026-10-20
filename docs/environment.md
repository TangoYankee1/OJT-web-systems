# Environment verified October 20, 2026

| Component                  | Observed                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| OS / shell                 | Windows x64 / Windows PowerShell                                                                           |
| Node                       | 22.18.0; target Node 24 recorded in .nvmrc                                                                 |
| npm                        | 11.19.1                                                                                                    |
| Git                        | 2.46.0.windows.1                                                                                           |
| VS Code                    | 1.142.0                                                                                                    |
| MariaDB                    | 10.4.32, installed XAMPP binaries                                                                          |
| Original database          | 127.0.0.1:3306 failed with pre-existing InnoDB LSN corruption                                              |
| Verified isolated database | 127.0.0.1:3308, .tools/mariadb-verified; localhost binding                                                 |
| Discarded sandbox attempt  | Port 3307; Aria log sync failed in sandbox; not used for application verification                          |
| API / frontend development | 127.0.0.1:5000 / localhost:5173                                                                            |
| Browser verification       | localhost:5001, built UI + API                                                                             |
| Apache / phpMyAdmin        | Installed; not used for verification                                                                       |
| DB session timezone        | +00:00 on every pooled connection                                                                          |
| SQL modes                  | IGNORE_SPACE, STRICT_TRANS_TABLES, ERROR_FOR_DIVISION_BY_ZERO, NO_AUTO_CREATE_USER, NO_ENGINE_SUBSTITUTION |

Exact dependency patches are locked in backend/package-lock.json and frontend/package-lock.json. Use npm ci. The Node compatibility adjustment to the available 22.18 runtime is documented; Node 24-specific verification is not claimed.

The initial sandbox registry request failed certificate verification. Installation succeeded outside the sandbox using NODE_OPTIONS=--use-system-ca; TLS verification was not disabled. Vite config bundling needed execution outside the sandbox because parent-directory resolution was denied. No package-manager or system certificate settings were globally changed.

## Configuration

Backend .env is resolved against the backend directory. Required: NODE_ENV, APP_ORIGIN, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD and a 64-hex-character SESSION_SECRET. Defaults and bounds live in src/config/env.js. UPLOAD_ROOT is resolved relative to backend, never an arbitrary working directory. Runtime root accounts are rejected. Only migration/isolated-test/restore scripts read MIGRATION_DB_USER and MIGRATION_DB_PASSWORD.

Use a random secret generated with node -e "console.log(require('crypto').randomBytes(32).toString('hex'))". Retain that value across restarts to preserve valid sessions. .env and .env.test are ignored. Test configuration must explicitly name a _test database and a test-private upload root; no development fallback exists.

Default file size is 10485760 bytes; DAILY_LIMIT_MINUTES defaults to 480 and must be approved before institutional use. SESSION_MAX_AGE_MS cannot exceed 28800000. TRUST_PROXY accepts false or loopback, not arbitrary trust. Production requires an HTTPS APP_ORIGIN and secure cookies.

The verified isolated database was restarted successfully after workflow verification. All six migrations, six synthetic placements, twelve file metadata records and 2880 approved minutes persisted. No original database was deleted or reinitialized. Local release on port 5000 was smoke-tested and stopped; daily startup remains operator-controlled.
