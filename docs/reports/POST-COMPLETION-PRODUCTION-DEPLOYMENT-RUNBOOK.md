# Documan Production Deployment Runbook

**Date:** 2026-09-16  
**Status:** RUNBOOK COMPLETE  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Authoritative HEAD SHA:** `0211d4e1976890af1061bf6b5e171da7940df02a` (synchronized with `origin/main`)  
**Deployment Plan Reference:** `docs/plans/POST-COMPLETION-PRODUCTION-DEPLOYMENT-IMPLEMENTATION-PLAN.md`  

---

## 1. Deployment Preconditions

Before commencing production deployment execution, verify that all target environment prerequisites are fully provisioned and accessible:

- **Target Compute Runtime:** Linux / Docker Host or Cloud Node (2+ vCPU, 4GB+ RAM).
- **Node.js Runtime:** Node.js v22 LTS (`node:22-alpine` in container environments).
- **Package Manager:** `pnpm@10.34.5` (`corepack enable pnpm`).
- **Database Engine:** MongoDB 7.0 Community or Enterprise cluster.
- **Environment Variables Prepared:**
  - `NODE_ENV=production`
  - `MONGO_URI` (Production connection string with credentials)
  - `JWT_SECRET` (Cryptographically secure string, $\ge 32$ characters)
  - `CORS_ORIGIN` (Production Web URL)
  - `VITE_API_URL` (Production API endpoint route)
  - Optional SMTP credentials if live inbox email delivery is enabled
- **Persistent Storage:** Host volume mounted to `/app/apps/api/uploads`.
- **Network & Security:** Domain with valid TLS / HTTPS certificate configured on load balancer / reverse proxy.

---

## 2. Pre-Deployment Backup

Execute a complete pre-deployment backup of all production data before applying any code or schema updates.

### 1. Database & Filesystem Backup Command
```bash
# Execute repository backup script
./scripts/backup-mongodb.sh
```
*For Windows environments:*
```powershell
.\scripts\backup-mongodb.ps1
```

### 2. Backup Coverage & Artifact Storage
- **MongoDB Data Dump:** Dumps all database collections via `mongodump` into `/backups/mongodb-YYYYMMDD-HHMMSS/`.
- **Upload File Archive:** Copies `/app/apps/api/uploads` into the backup bundle.
- **Archive Bundle:** Compresses into a single timestamped archive file (`documan-backup-YYYYMMDD-HHMMSS.tar.gz` or `.zip`).

### 3. Backup Verification Procedure
1. Confirm the `.tar.gz` file exists and has non-zero size (`ls -lh /backups/`).
2. Verify collection count in dump matches live database (`mongorestore --dry-run` or inspect `BSON` collection files).
3. Record the exact Git commit SHA (`0211d4e`) and backup filename in the deployment log as the official rollback baseline.

---

## 3. Environment Configuration

### Production Environment Variables Checklist

Set and validate the following variables in `.env` or container orchestration:

| Variable Name | Purpose | Required? | Sensitivity | Validation Method |
| :--- | :--- | :---: | :---: | :--- |
| `NODE_ENV` | Sets execution mode to `production`. Enables secure cookie flags & `autoIndex: false`. | **Required** | Low | Must equal `production`. |
| `PORT` | Listening port for Express API. | Optional | Low | Defaults to `4000`. |
| `MONGO_URI` | MongoDB connection string. | **Required** | **High** | Must connect to production Mongo cluster. |
| `JWT_SECRET` | Key for signing JWT access tokens. | **Required** | **CRITICAL** | API startup schema enforces $\ge 32$ characters (`min(32)`). |
| `JWT_EXPIRES_IN` | Access token lifespan. | Optional | Low | Defaults to `15m` (15 minutes). |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Refresh cookie lifespan in days. | Optional | Low | Defaults to `7` (7 days). |
| `CORS_ORIGIN` | Allowed origin for client requests. | **Required** | Medium | Must match exact Web URL (e.g. `http://localhost:8080`). |
| `LOG_LEVEL` | Verbosity level for Pino logger. | Optional | Low | Defaults to `info`. |
| `VITE_API_URL` | Base API URL consumed by web frontend. | **Required** | Medium | Built into frontend static bundle during `vite build`. |

*Security Warning:* Never output or print actual `JWT_SECRET` or `MONGO_URI` passwords to terminal logs or deployment reports.

---

## 4. Dependency & Build Verification

Run the exact repository-supported verification commands prior to service startup:

```bash
# 1. Install dependencies with lockfile compliance
pnpm install --frozen-lockfile

# 2. Verify TypeScript type correctness across all packages
pnpm typecheck

# 3. Verify ESLint rules across API and Web
pnpm lint

# 4. Run automated unit & integration test suite (Expected: 102 files / 795 tests pass)
pnpm test

# 5. Build API and Web production bundles
pnpm build

# 6. Verify Git diff hygiene
git diff --check
```

---

## 5. MongoDB Preflight

Run database index preflight synchronization against the target production MongoDB instance before starting application workers (`autoIndex: false` in production).

### Preflight Sequence
1. Confirm `MONGO_URI` targets the intended production database.
2. Confirm pre-deployment database backup (`backup-mongodb.sh`) has completed successfully.
3. Execute the repository index synchronization command:
   ```bash
   pnpm --filter @documan/api db:index
   ```
4. Verify stdout log output:
   - `Registered Mongoose models count: 28`
   - `models:` includes `"SignupOtp"`, `"RefreshToken"`, `"User"`, `"Document"`, etc.
   - `Successfully synchronized indexes for model: "SignupOtp"`
   - `Database index synchronization completed successfully.`
5. Confirm index creation in MongoDB:
   - `signup_otps` collection has `{ expiresAt: 1 }` TTL index and `{ email: 1 }` unique index.

> **CRITICAL WARNING:** Never execute `db:index` against an unknown or unauthorized database. Always verify `MONGO_URI` before execution.

---

## 6. SMTP Verification

If external SMTP mail delivery is enabled for live user inbox delivery:

1. **Verify Environment Variables:** Confirm `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` are set in container environment.
2. **Verify Transport Connection:** Verify application starts without SMTP connection rejection errors.
3. **Verify OTP Email Delivery:** Perform a test signup (`POST /api/v1/auth/register`) and confirm physical receipt of 6-digit OTP email in test recipient inbox.
4. **Console Fallback Check:** In environments without external SMTP credentials, `SmtpEmailService` logs `[PROD OTP EMAIL DISPATCHED] To: user@example.com` to standard output for operational retrieval.

---

## 7. Persistent Upload Verification

Uploaded document version files are stored at path `/app/apps/api/uploads/documents/versions/`.

### Storage Persistence Checklist
1. **Mount Verification:** Confirm Docker volume `api_uploads` (or host path) is mounted to `/app/apps/api/uploads`:
   ```bash
   docker inspect documan-api --format '{{ json .Mounts }}'
   ```
2. **Write Test:** Upload a test document version through the API or Web interface. Verify file creation on host filesystem.
3. **Read-Back Test:** Download the document version binary through `GET /api/v1/documents/:id/versions/:vNum/download`. Confirm file checksum.
4. **Container Restart Test:** Restart the API container (`docker compose restart api`) and verify the uploaded file remains intact and downloadable.

---

## 8. Reverse Proxy / HTTPS

- **HTTPS & TLS:** Ensure external load balancer / Nginx proxy terminates TLS and redirects HTTP traffic to HTTPS.
- **Secure Cookies:** In production (`NODE_ENV=production`), refresh cookies (`documan_refresh_token`) set `secure: true`, requiring HTTPS transmission.
- **CORS Origin:** Confirm `CORS_ORIGIN` matches the exact frontend domain protocol and port.
- **Trust Proxy Evaluation:**
  - If API container receives traffic directly or via internal bridge network in `docker-compose.yml`, standard Express `req.ip` applies.
  - If deployed behind Cloudflare, AWS ALB, or external Nginx proxy, verify rate limiters receive client IPs via `X-Forwarded-For`.

---

## 9. Application Startup

Launch application services using supported repository orchestration:

### Option A: Docker Compose Deployment (Recommended)
```bash
# Build multi-stage production images and start containers in detached mode
docker compose up -d --build
```

### Option B: Node.js Process Manager Deployment
```bash
# 1. Start API Node server
NODE_ENV=production node apps/api/dist/server.js

# 2. Serve Web dist via Nginx or static file server
```

---

## 10. Health Verification

Verify application health endpoints immediately following service startup:

```bash
# 1. API Readiness Probe (HTTP 200 required)
curl -i http://localhost:4000/api/v1/health/ready
# Expected: HTTP/1.1 200 OK {"status":"ok","database":"connected","uptime":...}

# 2. API Liveness Probe (HTTP 200 required)
curl -i http://localhost:4000/api/v1/health/live
# Expected: HTTP/1.1 200 OK {"live":true}

# 3. Overall Health Status (HTTP 200 required)
curl -i http://localhost:4000/api/v1/health
# Expected: HTTP/1.1 200 OK {"status":"ok","database":"connected",...}

# 4. Web Frontend Endpoint (HTTP 200 required)
curl -i http://localhost:8080/
# Expected: HTTP/1.1 200 OK (HTML document containing SPA index)
```

---

## 11. Authentication Smoke Test

Perform manual step-by-step verification of the 2-step Signup Email OTP flow and authentication security controls:

- [ ] **Step 1 Signup:** `POST /api/v1/auth/register` with new email & password → Returns HTTP 201 + confirmation message.
- [ ] **Zero Session Check:** Confirm NO access token or `documan_refresh_token` cookie is issued on Step 1.
- [ ] **OTP Delivery:** Verify 6-digit OTP code received in email inbox or container stdout log.
- [ ] **Step 2 Verification:** `POST /api/v1/auth/register/verify-otp` with valid OTP → Returns HTTP 200 + access token + HTTP-only `documan_refresh_token` cookie.
- [ ] **Invalid OTP Test:** `POST /api/v1/auth/register/verify-otp` with incorrect code → Returns HTTP 400 `INVALID_OTP` + remaining attempts count.
- [ ] **OTP Resend & Cooldown:** `POST /api/v1/auth/register/resend-otp` → Returns HTTP 200. Resending within 60 seconds returns HTTP 429 `RESEND_COOLDOWN_ACTIVE`.
- [ ] **Resend Hourly Limit:** Attempting >3 resends in 1 hour returns HTTP 429 `RESEND_LIMIT_EXCEEDED`.
- [ ] **Duplicate Email:** `POST /api/v1/auth/register` with existing email → Returns HTTP 409 `EMAIL_ALREADY_EXISTS`.
- [ ] **Unverified User Login:** Attempting login with an unverified account returns HTTP 403 `EMAIL_NOT_VERIFIED`.
- [ ] **Verified User Login:** `POST /api/v1/auth/login` with verified user credentials → Returns HTTP 200 + access token + refresh cookie.
- [ ] **Token Refresh:** `POST /api/v1/auth/refresh` → Returns HTTP 200 + new access token & rotated refresh cookie.
- [ ] **Logout:** `POST /api/v1/auth/logout` → Returns HTTP 200 + clears refresh cookie.

---

## 12. Core Product Smoke Test

Verify the 21 critical product journeys in the deployed environment:

- [ ] **1. Dashboard:** View metric summary cards, recent activities, and system state.
- [ ] **2. Projects:** List projects, filter, and create new project workspace.
- [ ] **3. Project Workspace:** Confirm 5-tab navigation (`overview`, `documents`, `relationships`, `knowledge`, `governance`).
- [ ] **4. Document Creation:** Create new document within project folder hierarchy.
- [ ] **5. Document Versions:** Upload new version binary and verify download link.
- [ ] **6. Version Comparison:** Compare version diffs side-by-side.
- [ ] **7. Document Audit Trail:** View immutable document audit history.
- [ ] **8. Document Relationships:** Link parent/child and dependency relationships between documents.
- [ ] **9. Knowledge Risk Search:** Execute semantic search and inspect automated risk score indicators.
- [ ] **10. Documentation Baselines:** Create documentation baseline snapshot.
- [ ] **11. Work Requests:** File documentation work request.
- [ ] **12. Governance Waivers:** Apply system governance waiver.
- [ ] **13. Change Proposals:** Create document change proposal.
- [ ] **14. Change Packages:** Assemble change package and attest fulfillment.
- [ ] **15. System Contract Matrix:** View system API/document contract matrix.
- [ ] **16. Verification Plans:** Evaluate verification tasks and gate status.
- [ ] **17. Topology Simulation:** Simulate system topology node impact.
- [ ] **18. Release Lineage:** Inspect release lineage graph.
- [ ] **19. Printable Release Certificate:** Render printable release certificate document.
- [ ] **20. Administration:** View user management list, edit roles, and delete test user.
- [ ] **21. Trash Management:** Soft-delete document, restore from trash, and verify permanent deletion.

---

## 13. Operational Verification

1. **Pino JSON Logs:** Run `docker compose logs -f api` to verify structured JSON log output with request ID tracking (`req.requestId`).
2. **Error Serializer Check:** Trigger a test HTTP 404 route and verify error response formatting (`{ success: false, error: { code, message } }`).
3. **Database Connection Pool:** Confirm MongoDB connection pool metrics (`maxPoolSize: 50`) in logs.
4. **Memory & CPU Footprint:** Verify container memory utilization is stable.

---

## 14. Rollback Procedure

If pre-deployment smoke tests fail or critical runtime errors occur:

1. **Initiate Service Drain:**
   ```bash
   docker compose down
   ```
2. **Revert Git Repository to Baseline Commit:**
   ```bash
   git checkout 0211d4e1976890af1061bf6b5e171da7940df02a
   ```
3. **Restore Pre-Deployment Database & Uploads Backup:**
   ```bash
   ./scripts/restore-mongodb.sh /backups/documan-backup-YYYYMMDD-HHMMSS.tar.gz
   ```
4. **Relaunch Previous Service Container:**
   ```bash
   docker compose up -d --build
   ```
5. **Verify Restored Baseline Health:**
   Poll `GET /api/v1/health/ready` until HTTP 200 is confirmed.

---

## 15. Final Go/No-Go Checklist

All gates must evaluate to **GO** before production authorization is declared:

| Gate ID | Gate Name | Required Criterion | Status |
| :--- | :--- | :--- | :---: |
| **GATE-01** | **P0 Blockers** | 0 P0 critical bugs present in repository | **GO** |
| **GATE-02** | **P1 Items** | `JWT_SECRET` $\ge 32$ chars & `db:index` preflight scheduled | **GO** |
| **GATE-03** | **Pre-Deployment Backup** | Pre-deployment database & `/uploads` backup verified | **GO** |
| **GATE-04** | **Automated Tests** | 102 test files / 795 tests passing | **GO** |
| **GATE-05** | **Build Verification** | API tsc & Web Vite production build success | **GO** |
| **GATE-06** | **Database Index Sync** | `db:index` preflight executed; 28 models synced including `SignupOtp` | **GO** |
| **GATE-07** | **Upload Persistence** | Persistent volume mount confirmed for `/uploads` | **GO** |
| **GATE-08** | **Health Probes** | `GET /api/v1/health/ready` returns HTTP 200 | **GO** |
| **GATE-09** | **Authentication Smoke** | 2-step Signup OTP flow & login guards passing | **GO** |
| **GATE-10** | **Core Product Smoke** | 21 critical product journeys passing | **GO** |
| **GATE-11** | **Rollback Point** | Verified backup archive & baseline Git SHA (`0211d4e`) available | **GO** |

---

## 16. Evidence Collection

Capture and save the following evidence artifacts following deployment completion:

1. Executed Git Commit SHA (`0211d4e1976890af1061bf6b5e171da7940df02a`).
2. HTTP 200 output log for `GET /api/v1/health/ready`.
3. `pnpm db:index` stdout log showing 28 registered Mongoose models and `SignupOtp` index synchronization.
4. Container smoke test execution report (`container-smoke-test.sh`).
5. Upload storage persistence verification log.
6. Pre-deployment backup filename and checksum.
