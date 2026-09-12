# Phase 30 — Production Hardening, Reliability & Deployment Foundation: Implementation Plan

## 1. Planning Objective

The objective of **Phase 30** is to establish the production hardening, application reliability, database resilience, frontend error handling, backup/restore automation, operational documentation, and containerization foundation required for a production-ready deployment of Documan.

Phase 30 will transition Documan from a verified local application baseline (Phases 1–29) into an enterprise-grade, containerized, recoverable, and observable platform capable of undergoing final operational readiness validation in Phase 31 and release certification in Phase 32.

---

## 2. Current Repository Baseline

- **Monorepo Structure**: Managed via `pnpm@10.34.5` and `turbo@2.5.6`.
- **Applications**:
  - `apps/api` (`@documan/api@0.1.0`): Express 5 server on Node.js 22, Mongoose 9, Pino logging, Zod validation, JWT authentication, and 99 Vitest test suites (768 unit and integration tests passing cleanly).
  - `apps/web` (`web@0.0.0`): React 19 SPA with Vite 8, React Router 7, Zustand 5, and Axios 1.19.
- **Shared Packages**:
  - `packages/eslint-config`: Shared ESLint configurations (`base.js`, `node.js`, `react.js`, `typescript.js`).
- **Build & Verification Status**:
  - `pnpm test`: 99 test files passed, 768 tests passed (0 failures).
  - `pnpm build`: `@documan/api` compiles to `apps/api/dist/server.js` and `apps/web` compiles to `apps/web/dist/`.

---

## 3. Phase 30 Research Findings Used

This plan directly incorporates the authoritative findings from [`docs/research/PHASE-30-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-30-RESEARCH.md):

1. **Containerization Gap**: Zero Docker artifacts exist currently (`infrastructure/` is empty, no `Dockerfile` or `docker-compose.yml`).
2. **Lifecycle & Shutdown Gap**: [`apps/api/src/server.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/server.ts) lacks `SIGTERM`/`SIGINT` listeners, graceful HTTP server draining, and process-level exception handlers.
3. **Health Probe Limitation**: `/health` returns static JSON (`health.service.ts`) without testing MongoDB connectivity, and separate `/ready` and `/live` endpoints do not exist.
4. **Database Connection & Index Gap**: Mongoose connection management in [`database.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/config/database.ts) lacks explicit connection pooling (`maxPoolSize`, `socketTimeoutMS`), relies on default `autoIndex: true`, and lacks an explicit CLI index synchronization script.
5. **Frontend Resilience & Performance Gap**: `apps/web` lacks a top-level React `ErrorBoundary`, custom 404 route, network timeout limits on Axios `apiClient`, and dynamic route code-splitting (`React.lazy`).
6. **Backup & Recovery Gap**: Automated MongoDB backup (`mongodump`), restore scripts (`mongorestore`), and deployment runbooks do not exist.

---

## 4. Scope Boundary

### In Scope

- Production multi-stage Dockerfiles for `@documan/api` and `apps/web`.
- Root and application `.dockerignore` files and multi-container `docker-compose.yml`.
- Graceful HTTP server draining and MongoDB connection termination on `SIGTERM`/`SIGINT`.
- Process-level `uncaughtException` and `unhandledRejection` handlers with Pino structured logging.
- Detailed `/health`, `/ready` (readiness), and `/live` (liveness) status probes.
- Mongoose connection pooling options (`maxPoolSize: 50`, `minPoolSize: 5`, `socketTimeoutMS: 45000`) and Mongoose event listeners.
- Production `autoIndex: false` configuration and an explicit CLI index sync script (`pnpm --filter api db:index`).
- React `ErrorBoundary`, custom 404 page route, Axios request timeout (`10,000ms`), and dynamic route code-splitting (`React.lazy`).
- Automated backup (`scripts/backup-mongodb.sh` / `.ps1`) and restore scripts (`scripts/restore-mongodb.sh` / `.ps1`).
- Container smoke testing script (`pnpm test:container`).
- Operational deployment guide (`docs/DEPLOYMENT.md`) and operational runbook (`docs/OPERATIONS.md`).

### Out of Scope

- Kubernetes operators, Helm charts, or service mesh configurations.
- Modifications to core domain logic, ACL policies, governance gates, or database schemas established in Phases 1–29.
- Third-party SaaS monitoring integrations or external APM telemetry agents.
- CI/CD workflow platform alterations beyond local Docker container builds and smoke tests.

---

## 5. Architecture Impact Assessment

The Phase 30 implementation introduces zero modifications to existing domain schemas, database collections, or REST API request/response contracts. The application architecture is enhanced solely at the infrastructure and operational boundary:

```
                                [ Reverse Proxy / Web Container ]
                                Nginx Alpine (Non-root, Port 80)
                                      │
                                      │ Static Assets / SPA Fallback (try_files)
                                      │ Proxy /api/v1/* -> API Container
                                      ▼
                                [ API Container ]
                          Node 22 Alpine (Non-root, Port 4000)
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼
     [ Graceful Signal ]       [ Health Probes ]      [ Pino JSON Logs ]
    SIGTERM / Draining       /health, /live, /ready    Correlated Request IDs
             │                        │
             └───────────┬────────────┘
                         │
                         ▼
                [ Mongoose Pool ]
          maxPoolSize: 50 / AutoReconnect
                         │
                         ▼
                [ MongoDB Container ]
         Mongo 7.0 / Named Volume: mongodb_data
```

---

## 6. Implementation Workstreams

The execution of Phase 30 is divided into 8 distinct workstreams (A through H):

- **Workstream A**: Production Containerization (Dockerfiles, Docker Compose, non-root execution, persistent volumes).
- **Workstream B**: API Lifecycle Hardening (Graceful shutdown, signal handlers, exception catchers).
- **Workstream C**: Health & Readiness Model (`/health`, `/live`, `/ready` probes, DB dependency checks).
- **Workstream D**: MongoDB Production Reliability & Index Strategy (Connection pooling, index sync script, `autoIndex: false`).
- **Workstream E**: Frontend Hardening & Bundle Optimization (`ErrorBoundary`, 404 route, Axios timeout, `React.lazy` code splitting).
- **Workstream F**: Backup & Recovery Automation (Backup script, restore script, verification routines).
- **Workstream G**: Container Smoke Testing (`scripts/container-smoke-test`, Compose execution, health check assertions).
- **Workstream H**: Operations & Deployment Documentation (`docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`).

---

## 7. Detailed Implementation Steps

### Workstream A: Production Containerization

1. **Root & Package `.dockerignore`**:
   - Create `.dockerignore` at repo root, `apps/api/.dockerignore`, and `apps/web/.dockerignore` ignoring `node_modules`, `dist`, `.git`, `coverage`, `.env*`.
2. **API Dockerfile (`apps/api/Dockerfile`)**:
   - Multi-stage build (Stage 1: `builder` using `node:22-alpine` to install pnpm and compile TS; Stage 2: `runner` using minimal `node:22-alpine`).
   - Create non-root user `node`, set `WORKDIR /app`, copy compiled output (`dist`), pruned production `node_modules`, `package.json`.
   - Expose port `4000`, set `USER node`, and add `HEALTHCHECK` probing `http://localhost:4000/api/v1/live`.
3. **Web Dockerfile (`apps/web/Dockerfile`) & Nginx Config (`apps/web/nginx.conf`)**:
   - Multi-stage build (Stage 1: `builder` building Vite static assets; Stage 2: `runner` using `nginx:alpine`).
   - Create custom `nginx.conf` supporting SPA fallback routing (`try_files $uri $uri/ /index.html`), security headers, gzip compression, and non-root execution.
   - Expose port `80`, set `USER nginx`.
4. **Docker Compose (`docker-compose.yml`)**:
   - Define services `mongodb` (using `mongo:7.0`, persistent named volume `mongodb_data`, healthcheck `mongosh --eval 'db.runCommand("ping").ok'`), `api` (depends on `mongodb`), `web` (depends on `api`).
   - Define custom bridge network `documan_net`.
   - Set container restart policy `restart: unless-stopped`.
5. **Environment Template (`.env.example`)**:
   - Provide standard production environment defaults for API and Web.

### Workstream B: API Lifecycle Hardening

1. **Mongoose Disconnect Helper (`apps/api/src/config/database.ts`)**:
   - Export `disconnectDatabase(): Promise<void>` to close Mongoose connection gracefully during shutdown.
2. **Graceful Draining in Server (`apps/api/src/server.ts`)**:
   - Retain HTTP server instance returned by `app.listen()`.
   - Create `shutdown(signal: string)` function:
     - Stop accepting new HTTP connections (`server.close()`).
     - Set a 10-second force-kill timeout.
     - Call `disconnectDatabase()`.
     - Log clean shutdown via Pino logger and exit process with status `0`.
   - Register listeners: `process.on('SIGTERM', () => shutdown('SIGTERM'))` and `process.on('SIGINT', () => shutdown('SIGINT'))`.
   - Register process exception handlers: `process.on('uncaughtException', ...)` and `process.on('unhandledRejection', ...)` logging fatal errors before exiting with status `1`.

### Workstream C: Health & Readiness Model

1. **Health Service Upgrade (`apps/api/src/modules/health/health.service.ts`)**:
   - `getHealthStatus()`: Inspect `mongoose.connection.readyState` (1 = connected), returns status (`ok` or `degraded`), service name, uptime (in seconds), and memory usage.
   - `getReadinessStatus()`: Returns `ready: true` (HTTP 200) if `mongoose.connection.readyState === 1`; returns `ready: false` (HTTP 503) if database is disconnected.
   - `getLivenessStatus()`: Returns `live: true` (HTTP 200) indicating the process event loop is alive.
2. **Health Controller & Routes (`apps/api/src/modules/health/`)**:
   - Update `health.controller.ts` to export `healthController`, `readinessController`, and `livenessController`.
   - Register routes in `health.routes.ts`: `GET /health`, `GET /ready`, `GET /live`.

### Workstream D: MongoDB Production Reliability & Index Strategy

1. **Connection Pool Configuration (`apps/api/src/config/database.ts`)**:
   - Update `mongoose.connect(env.MONGO_URI, options)` with options:
     - `maxPoolSize: 50`
     - `minPoolSize: 5`
     - `serverSelectionTimeoutMS: 5000`
     - `socketTimeoutMS: 45000`
     - `autoIndex: env.NODE_ENV !== 'production'`
   - Attach Mongoose event listeners logging connection states via Pino (`connected`, `disconnected`, `reconnected`, `error`).
2. **Index Synchronization Script (`apps/api/src/scripts/sync-indexes.ts`)**:
   - Create standalone CLI script connecting to MongoDB, importing all model schemas, and calling `mongoose.syncIndexes()`.
   - Add script to `apps/api/package.json`: `"db:index": "node --env-file=.env --import tsx/esm src/scripts/sync-indexes.ts"`.

### Workstream E: Frontend Hardening & Performance

1. **React Error Boundary (`apps/web/src/components/ErrorBoundary.tsx`)**:
   - Class component implementing `componentDidCatch` and `getDerivedStateFromError`.
   - Displays a clean error recovery UI with a "Try Reloading" button rather than white-screening.
2. **Custom 404 Page (`apps/web/src/pages/NotFoundPage.tsx`)**:
   - User-friendly 404 page with navigation back to Dashboard.
3. **Axios Timeout & Interceptor Hardening (`apps/web/src/api/client.ts`)**:
   - Add `timeout: 10000` (10 seconds) to `apiClient` config.
4. **Dynamic Route Code-Splitting (`apps/web/src/App.tsx`)**:
   - Wrap top-level App in `<ErrorBoundary>`.
   - Replace static page imports with `React.lazy(() => import('./pages/...'))` wrapped in `React.Suspense` with loading fallback spinner.
   - Add catch-all route `<Route path="*" element={<NotFoundPage />} />`.
   - Add skip-to-content accessibility link (`<a href="#main-content">Skip to main content</a>`).

### Workstream F: Backup & Recovery Automation

1. **MongoDB & Uploads Backup Script (`scripts/backup-mongodb.sh` / `.ps1`)**:
   - Accepts output directory argument or defaults to `backups/yyyy-mm-dd_hh-mm-ss`.
   - Executes `mongodump --uri="$MONGO_URI" --archive=... --gzip`.
   - Copies uploaded document versions from `apps/api/uploads/documents/versions/` into the backup directory.
   - Generates a `backup-metadata.json` summary (timestamp, collection counts, file size).
2. **Restore Verification Script (`scripts/restore-mongodb.sh` / `.ps1`)**:
   - Accepts backup directory path as argument.
   - Validates existence of archive file and metadata.
   - Executes `mongorestore --uri="$MONGO_URI" --archive=... --gzip --drop`.
   - Restores version uploads directory.
   - Verifies collection counts against backup metadata and reports deterministic exit code.

### Workstream G: Container Smoke Testing

1. **Smoke Test Runner (`scripts/container-smoke-test.sh` / `.ps1`)**:
   - Runs `docker-compose up -d --build`.
   - Polls `/api/v1/health` and `/api/v1/ready` for up to 60 seconds until HTTP 200 is returned.
   - Probes Web server container on port `80` to verify Nginx asset delivery.
   - Executes `docker-compose down -v` upon completion.
   - Add command to root `package.json`: `"test:container": "bash scripts/container-smoke-test.sh"`.

### Workstream H: Operations & Deployment Documentation

1. **Deployment Guide (`docs/DEPLOYMENT.md`)**:
   - Step-by-step production deployment instructions using Docker Compose and Nginx.
   - Environment variable configuration table.
   - Security considerations (non-root execution, secret management, CORS, SSL termination).
2. **Operational Manual (`docs/OPERATIONS.md`)**:
   - Health monitoring and probe configuration (`/health`, `/ready`, `/live`).
   - Database index synchronization (`pnpm --filter api db:index`).
   - Backup and restore procedures (`scripts/backup-mongodb` and `scripts/restore-mongodb`).
   - Incident recovery, graceful shutdown, and container rollback procedures.

---

## 8. Files/Directories Expected to Change

| File Path                                                                                                                                    | Description of Change                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`apps/api/src/server.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/server.ts)                                                     | Add SIGTERM/SIGINT shutdown handler, HTTP server draining, and process exception listeners.              |
| [`apps/api/src/config/database.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/config/database.ts)                                   | Add pool options (`maxPoolSize`, `socketTimeoutMS`), event listeners, and export `disconnectDatabase()`. |
| [`apps/api/src/modules/health/health.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/health/health.service.ts)       | Expand `/health` details; add `getReadinessStatus()` and `getLivenessStatus()`.                          |
| [`apps/api/src/modules/health/health.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/health/health.controller.ts) | Export `readinessController` and `livenessController`.                                                   |
| [`apps/api/src/modules/health/health.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/health/health.routes.ts)         | Register `/ready` and `/live` routes.                                                                    |
| [`apps/api/package.json`](file:///c:/MERN_STACK/Documan/documan/apps/api/package.json)                                                       | Add `"db:index"` CLI script definition.                                                                  |
| [`apps/web/src/api/client.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/api/client.ts)                                             | Add `timeout: 10000` (10s) request timeout limit.                                                        |
| [`apps/web/src/App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx)                                                         | Wrap in `ErrorBoundary`, implement `React.lazy` code splitting, add 404 route, add skip link.            |
| [`package.json`](file:///c:/MERN_STACK/Documan/documan/package.json)                                                                         | Add `"test:container"` script runner.                                                                    |

---

## 9. New Files Expected

| New File Path                               | Workstream | Purpose                                                                   |
| ------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `apps/api/Dockerfile`                       | A          | Multi-stage Node 22 Alpine Dockerfile for API (non-root `node`).          |
| `apps/web/Dockerfile`                       | A          | Multi-stage Dockerfile for Web SPA (Node build -> Nginx Alpine runtime).  |
| `apps/web/nginx.conf`                       | A          | Production Nginx configuration for Web container (SPA fallback, headers). |
| `.dockerignore`                             | A          | Root Docker ignore file.                                                  |
| `apps/api/.dockerignore`                    | A          | API Docker ignore file.                                                   |
| `apps/web/.dockerignore`                    | A          | Web Docker ignore file.                                                   |
| `docker-compose.yml`                        | A          | Multi-container Compose config for API, Web, MongoDB, and named volumes.  |
| `.env.example`                              | A          | Environment template for Docker Compose deployments.                      |
| `apps/api/src/scripts/sync-indexes.ts`      | D          | Standalone CLI script for database index synchronization.                 |
| `apps/web/src/components/ErrorBoundary.tsx` | E          | React Error Boundary component with fallback UI.                          |
| `apps/web/src/pages/NotFoundPage.tsx`       | E          | Custom 404 route component.                                               |
| `scripts/backup-mongodb.sh` / `.ps1`        | F          | Automated MongoDB & uploads backup script.                                |
| `scripts/restore-mongodb.sh` / `.ps1`       | F          | Automated MongoDB & uploads restore script.                               |
| `scripts/container-smoke-test.sh` / `.ps1`  | G          | Container stack startup & health check smoke test.                        |
| `docs/DEPLOYMENT.md`                        | H          | Production deployment manual and container guide.                         |
| `docs/OPERATIONS.md`                        | H          | Production operations, health monitoring, backup/restore runbook.         |

---

## 10. Configuration and Environment Changes

- **API Environment Variables (`apps/api/src/config/env.ts`)**:
  - Existing Zod schema maintained.
  - Optional `MONGO_MAX_POOL_SIZE` (default 50) and `MONGO_MIN_POOL_SIZE` (default 5) supported.
  - `autoIndex` disabled automatically when `NODE_ENV === 'production'`.
- **Web Environment Variables (`apps/web`)**:
  - `VITE_API_URL` injected into Nginx or container environment during build/runtime.
- **Docker Compose Defaults**:
  - `MONGO_URI=mongodb://mongodb:27017/documan`
  - `PORT=4000`
  - `CORS_ORIGIN=http://localhost:80`

---

## 11. Docker Architecture

- **Base Images**: `node:22-alpine` for API and build stages; `nginx:1.27-alpine` for Web runtime.
- **Security**:
  - Non-root execution: API runs as `USER node` (UID 1000); Web runs as `USER nginx`.
  - Minimal runtime footprint: Source code and TypeScript devDependencies excluded from final container images.
- **Networking**: Custom bridge network (`documan_net`).
  - Web container exposes port `80`.
  - API container exposes port `4000` (internal network routing).
  - MongoDB container exposes port `27017` (internal network routing).
- **Persistence**: Named volume `mongodb_data` mounted to `/data/db` in the MongoDB container.

---

## 12. API Lifecycle & Shutdown Design

```
[ Signal: SIGTERM / SIGINT ]
             │
             ▼
[ 1. Stop HTTP Listener (server.close()) ] -> No new connections accepted
             │
             ▼
[ 2. Set 10s Force Kill Timer ]
             │
             ▼
[ 3. Drain In-Flight Requests ] -> Active requests finish naturally
             │
             ▼
[ 4. Close MongoDB Connection (disconnectDatabase()) ] -> Mongoose sockets closed
             │
             ▼
[ 5. Log Clean Exit (Pino) & Exit Process (code 0) ]
```

---

## 13. Health / Readiness / Liveness Design

- `/api/v1/health` (Overall Status):
  - Returns HTTP 200 if operational (`status: 'ok'`), returning service name, uptime, memory, and database connection state (`dbConnected: true`).
- `/api/v1/ready` (Readiness Probe):
  - Returns HTTP 200 `{ ready: true }` if MongoDB is connected (`readyState === 1`).
  - Returns HTTP 503 `{ ready: false, reason: 'Database disconnected' }` if MongoDB is disconnected.
- `/api/v1/live` (Liveness Probe):
  - Returns HTTP 200 `{ live: true }` as long as Node process is responsive.

---

## 14. MongoDB Reliability & Index Strategy

1. **Connection Pooling**:
   - `maxPoolSize: 50` (supports up to 50 concurrent socket operations).
   - `minPoolSize: 5` (maintains warm pool for low latency).
   - `socketTimeoutMS: 45000` (prevents hung database operations).
   - `serverSelectionTimeoutMS: 5000` (fails fast on un-routable DB).
2. **Auto-Index Control**:
   - Disabled in production (`autoIndex: env.NODE_ENV !== 'production'`) to prevent blocking DB startup.
3. **CLI Index Synchronization**:
   - Execute `pnpm --filter api db:index` during deployment pipelines to sync Mongoose model indexes safely.

---

## 15. Frontend Resilience & Performance Design

1. **Error Boundary**:
   - Catches unexpected JavaScript rendering errors inside React components.
   - Renders a clean fallback card with error summary and action button ("Reload Page").
2. **404 Route**:
   - Catch-all route `<Route path="*" element={<NotFoundPage />} />` handles invalid paths cleanly.
3. **Route Code-Splitting (`React.lazy`)**:
   - Dynamic imports for all major page components split the single 1.24 MB JavaScript bundle into small per-route chunks, improving initial DOM render performance.

---

## 16. Backup Strategy

- **Automation Target**: MongoDB database data and local document version file uploads (`apps/api/uploads/documents/versions/`).
- **Command Execution**: Uses `mongodump --uri="$MONGO_URI" --archive=... --gzip`.
- **Artifact Packaging**: Places compressed `.gz` database dump and zipped version file uploads into a timestamped directory `backups/YYYY-MM-DD_HH-MM-SS/`.
- **Metadata Summary**: Writes `backup-metadata.json` containing backup date, database name, file count, and archive hashes.

---

## 17. Restore Verification Strategy

- **Validation Checks**:
  - Verifies presence of compressed archive file and `backup-metadata.json`.
- **Restore Execution**:
  - Uses `mongorestore --uri="$MONGO_URI" --archive=... --gzip --drop` to restore clean database collections.
  - Restores version uploads directory.
- **Post-Restore Verification**:
  - Queries collection counts in MongoDB and compares against metadata baseline.
  - Exits with status `0` only when document counts match exactly; exits with `1` on discrepancy.

---

## 18. Container Smoke-Test Strategy

- **Script Runner**: `pnpm test:container` (`scripts/container-smoke-test.sh` / `.ps1`).
- **Execution Flow**:
  1. Executes `docker-compose up -d --build`.
  2. Loops for up to 60 seconds pinging `http://localhost:4000/api/v1/ready`.
  3. Pings Web container `http://localhost:80` to verify Nginx static asset delivery.
  4. Verifies clean response payloads.
  5. Executes `docker-compose down -v`.
  6. Returns exit code `0` on success, `1` on failure.

---

## 19. Observability & Logging

- Structured JSON logs emitted via Pino (`pino-http` middleware).
- Request correlation via `X-Request-ID` header.
- Graceful startup and shutdown log events.
- Mongoose connection state transition logs (`connected`, `disconnected`, `reconnected`).

---

## 20. Security Hardening

- Non-root user execution inside containers (`USER node` / `USER nginx`).
- Multi-stage Docker builds excluding source code and devDependencies from final images.
- Helmet security headers maintained in API.
- Password hashing with bcrypt, JWT verification, and project ACL isolation preserved.

---

## 21. Deployment Foundation

- Docker Compose configuration provided for local, staging, and single-host production deployments.
- Nginx configuration optimized for React SPA routing, caching, and gzip compression.
- Clear separation of environment variables via `.env.example`.

---

## 22. Upgrade / Rollback Foundation

- Image version tagging standard (`documan-api:vX.Y.Z`, `documan-web:vX.Y.Z`).
- Rollback runbook in `docs/OPERATIONS.md` detailing image tag reversion and database restore steps.
- Existing Phase 28/29 system release certificates and certificate lineage preserved.

---

## 23. Testing Strategy

| Level                 | Test Command / Procedure               | Expected Outcome                                             |
| --------------------- | -------------------------------------- | ------------------------------------------------------------ |
| API Typecheck         | `pnpm --filter @documan/api typecheck` | 0 TypeScript errors                                          |
| Web Typecheck         | `pnpm --filter web typecheck`          | 0 TypeScript errors                                          |
| ESLint Audit          | `pnpm lint`                            | 0 ESLint warnings or errors                                  |
| Unit & Integration    | `pnpm test`                            | All 99 Vitest test files pass (768 tests)                    |
| Production Build      | `pnpm build`                           | Turbo builds API TS and Web Vite assets cleanly              |
| Container Smoke Test  | `pnpm test:container`                  | Containers build, start, pass healthchecks, and stop cleanly |
| Git Cleanliness Check | `git diff --check`                     | 0 whitespace or formatting issues                            |

---

## 24. Manual QA Strategy

Manual verification will be conducted after automated tests pass:

1. **Container Deployment Rehearsal**: Launch stack via `docker-compose up -d` and log in as an administrator.
2. **Frontend Resilience Verification**:
   - Navigate to `/non-existent-route` and verify 404 page render.
   - Simulate a network disconnect and verify Axios timeout handling.
3. **Graceful Shutdown Rehearsal**: Execute `docker stop` on the API container and verify graceful connection draining in container logs.
4. **Backup & Restore Rehearsal**: Run `scripts/backup-mongodb.sh`, clear test database, run `scripts/restore-mongodb.sh`, and verify document data integrity.

---

## 25. Failure Scenarios

1. **Database Network Disconnect**: API `/ready` probe immediately transitions to HTTP 530/503 (`ready: false`); Mongoose auto-reconnects when DB returns.
2. **Container Force Stop**: SIGTERM listener catches signal, drains active requests within 10s, closes Mongoose pool, and exits cleanly.
3. **Frontend Runtime Component Error**: React `ErrorBoundary` intercepts error, displays recovery UI, and prevents white-screen crash.

---

## 26. Backward Compatibility & Regression Protection

- Zero changes to existing Mongoose schemas or model definitions.
- Zero modifications to existing REST API endpoints, parameters, or response structures.
- All 99 Vitest test suites (768 tests) must pass with zero modifications to existing tests.

---

## 27. Implementation Sequence

```
Step 1: Infrastructure & Production Containerization
├── Create apps/api/Dockerfile, apps/web/Dockerfile, apps/web/nginx.conf
├── Create root and app .dockerignore files
└── Create docker-compose.yml and .env.example

Step 2: API Lifecycle Hardening & Server Shutdown
├── Add disconnectDatabase() in apps/api/src/config/database.ts
├── Implement graceful server draining and SIGTERM/SIGINT listeners in server.ts
└── Add uncaughtException and unhandledRejection process event listeners

Step 3: Health, Readiness & Liveness Probes
├── Upgrade health.service.ts with DB connectivity, uptime, memory usage
└── Add /ready and /live controllers and routes

Step 4: MongoDB Reliability & Index Synchronization
├── Configure Mongoose pool options (maxPoolSize: 50, socketTimeoutMS: 45000)
├── Set autoIndex: false for production mode
└── Create apps/api/src/scripts/sync-indexes.ts CLI script

Step 5: Frontend Hardening & Code Splitting
├── Create apps/web/src/components/ErrorBoundary.tsx
├── Create apps/web/src/pages/NotFoundPage.tsx
├── Add timeout: 10000 to Axios apiClient
└── Update App.tsx with ErrorBoundary, React.lazy code splitting, 404 route, skip link

Step 6: Backup & Restore Automation
├── Create scripts/backup-mongodb.sh / .ps1
└── Create scripts/restore-mongodb.sh / .ps1

Step 7: Container Smoke Testing & Automation
└── Create scripts/container-smoke-test.sh / .ps1 and add "test:container" script

Step 8: Deployment & Operational Documentation
├── Create docs/DEPLOYMENT.md
└── Create docs/OPERATIONS.md

Step 9: Full Regression & Build Verification
├── Execute pnpm typecheck, pnpm lint, pnpm test, pnpm build
└── Execute pnpm test:container and git diff --check
```

---

## 28. Phase 30 Definition of Done

1. `apps/api/Dockerfile` and `apps/web/Dockerfile` build minimal, non-root, multi-stage production container images.
2. `docker-compose.yml` launches Web, API, and MongoDB with persistent named volumes and passing health checks.
3. `apps/api/src/server.ts` handles `SIGTERM`/`SIGINT` gracefully with HTTP draining and MongoDB pool disconnects.
4. `/health`, `/ready`, and `/live` endpoints accurately report application and database state.
5. Mongoose connection pooling is explicitly configured and `pnpm --filter api db:index` script executes cleanly.
6. React frontend features an `ErrorBoundary`, custom 404 page, Axios request timeout, and `React.lazy` code splitting.
7. `scripts/backup-mongodb` and `scripts/restore-mongodb` scripts execute successfully and verify data integrity.
8. `pnpm test:container` smoke test executes cleanly.
9. `docs/DEPLOYMENT.md` and `docs/OPERATIONS.md` are complete.
10. All 99 Vitest test suites and 768 unit tests pass cleanly with 0 regressions.

---

## 29. Explicit Non-Goals

- Do NOT convert Documan into a DevOps platform, CI/CD runner, or generic monitoring service.
- Do NOT introduce Kubernetes operators, Helm charts, or service mesh configurations.
- Do NOT alter core domain logic, ACL boundaries, or governance capabilities established in Phases 1–29.
- Do NOT introduce new database collections or schemas.

---

## 30. Risks and Mitigations

| Identified Risk                                                | Severity | Mitigation Strategy                                                              |
| -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| Unmounted MongoDB container volume causes data loss on restart | High     | Define persistent named volume `mongodb_data` in `docker-compose.yml`.           |
| Unhandled SIGTERM kills active HTTP requests                   | Medium   | Implement graceful draining (`server.close()`) with 10s force-kill safety timer. |
| React component render crash causes white screen               | Medium   | Wrap React application tree in a top-level `ErrorBoundary` component.            |
| Large JavaScript bundle degrades initial web load time         | Low      | Implement `React.lazy()` dynamic route code splitting.                           |
| Startup auto-indexing locks production MongoDB                 | Medium   | Disable `autoIndex` in production and provide CLI `db:index` script.             |
