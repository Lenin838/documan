# Documan Operational Runbook & Manual

## 1. Health Monitoring & Observability

Documan provides three distinct probe endpoints under `/api/v1/health` for monitoring and container orchestration:

### 1. `/api/v1/health/live` (Liveness Probe)

- **Purpose**: Verifies that the Node.js event loop is active.
- **Expected Response**: HTTP 200 `{ "success": true, "data": { "live": true } }`.
- **Use Case**: Used by Docker/K8s liveness probes to determine if the container process is alive.

### 2. `/api/v1/health/ready` (Readiness Probe)

- **Purpose**: Verifies that the application can serve traffic (specifically checking MongoDB connection status).
- **Expected Response**:
  - Ready: HTTP 200 `{ "success": true, "data": { "ready": true, "database": "connected" } }`.
  - Not Ready: HTTP 503 `{ "success": false, "data": { "ready": false, "database": "disconnected" } }`.
- **Use Case**: Used by load balancers and orchestrators to route traffic only to database-ready instances.

### 3. `/api/v1/health` (Safe Operational Summary)

- **Purpose**: Safe diagnostic summary without exposing internal secrets, credentials, or stack traces.
- **Expected Response**: HTTP 200 `{ "success": true, "data": { "status": "ok", "service": "documan-api", "timestamp": "...", "uptime": 120, "database": "connected" } }`.

---

## 2. Database Index Management

Auto-indexing on application startup is disabled in production (`autoIndex: false`) to avoid locking large database collections during startup.

Execute index synchronization explicitly during deployment or maintenance windows:

```bash
# Using Docker Compose
docker compose exec api pnpm --filter @documan/api db:index

# Direct CLI execution
pnpm --filter @documan/api db:index
```

---

## 3. Automated Backup Procedures

Documan backups account for **BOTH** MongoDB database data and uploaded document version files.

### Running a Backup

Execute the backup script via Bash or PowerShell:

```bash
# Linux / macOS / Git Bash
./scripts/backup-mongodb.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/backup-mongodb.ps1
```

### Backup Artifacts Produced

Backups are saved to timestamped directories under `backups/YYYY-MM-DD_HH-MM-SS/`:

- `mongo-dump.gz`: Compressed MongoDB dump file.
- `uploads/`: Copy of all document version files (`uploads/documents/versions/`).
- `backup-metadata.json`: Summary metadata (timestamp, file count, completion status).

---

## 4. Restore & Recovery Procedures

### Running a Restore

To restore from a backup archive:

```bash
# Linux / macOS / Git Bash
./scripts/restore-mongodb.sh backups/2026-09-12_09-20-45

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/restore-mongodb.ps1 -BackupDir backups\2026-09-12_09-20-45
```

### Restore Verification

The restore script performs deterministic verification:

1. Validates existence of `mongo-dump.gz` archive.
2. Restores MongoDB database collections via `mongorestore --drop`.
3. Restores uploaded document version files into `apps/api/uploads/`.
4. Verifies target file structure and reports `SUCCESS` exit code `0`. Returns non-zero exit code `1` if restore fails.

---

## 5. Graceful Shutdown & Failure Recovery

### Graceful Draining

When `documan-api` receives a `SIGTERM` or `SIGINT` signal:

1. It stops accepting new incoming HTTP connections (`server.close()`).
2. It sets a 10-second safety timeout.
3. In-flight HTTP requests complete naturally.
4. Mongoose database connections are closed cleanly (`disconnectDatabase()`).
5. Process exits with code `0`.

### Uncaught Exceptions & Rejections

If an unhandled exception occurs (`uncaughtException` / `unhandledRejection`), the server logs the fatal failure via Pino logger, executes graceful resource draining, and exits with code `1` so Docker container restart policies (`restart: unless-stopped`) can restart the process cleanly.

---

## 6. Container Stack Testing

Execute container smoke testing at any time:

```bash
pnpm test:container
```
