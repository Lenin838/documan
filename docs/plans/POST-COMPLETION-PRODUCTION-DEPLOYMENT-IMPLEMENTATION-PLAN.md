# Production Deployment Implementation Plan

**Date:** 2026-09-16  
**Status:** PLAN COMPLETE (AWAITING USER APPROVAL)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Current HEAD SHA:** `0211d4e1976890af1061bf6b5e171da7940df02a` (synchronized with `origin/main`)  
**Preflight Research:** `docs/research/POST-COMPLETION-PRODUCTION-ENVIRONMENT-DEPLOYMENT-PREFLIGHT-AUDIT.md`  

---

## 1. Objective

This plan details the exact environment setup, infrastructure configuration, database preflight index synchronization, deployment procedure, smoke testing checklist, and rollback strategy required to deploy the **Documan** application to a production environment.

This document represents **Post-Completion Production Deployment Preparation** following the final certification of Phases 1–32, self-service signup, signup email OTP verification, and the `SignupOtp` index synchronization fix.

---

## 2. Baseline

- **Current Published HEAD SHA:** `0211d4e1976890af1061bf6b5e171da7940df02a`
- **Git Branch:** `main` (synchronized with `origin/main`)
- **Working Tree:** Clean
- **Automated Verification Status:**
  - `pnpm typecheck`: PASS (0 errors)
  - `pnpm lint`: PASS (0 errors, 17 warnings)
  - `pnpm test`: PASS (102 test files / 795 tests)
  - `pnpm build`: PASS (`@documan/api` & `web` production bundles)
  - `git diff --check`: PASS (0 errors)
  - `db:index` preflight script: PASS (28 models registered & synchronized, including `SignupOtp`)

---

## 3. Findings To Resolve

| Finding ID | Finding Description | Severity | Finding Classification | Source Code Change Required? |
| :--- | :--- | :---: | :--- | :---: |
| **FIND-01** | `JWT_SECRET` must be set to a strong secret ($\ge 32$ chars) in target environment | **P1** | **A. Environment configuration only** | **NO** |
| **FIND-02** | `pnpm --filter @documan/api db:index` must be executed prior to runtime startup | **P1** | **D. Operational procedure only** | **NO** |
| **FIND-03** | `SmtpEmailService` logs in production; external SMTP environment config for live email dispatch | **P2** | **A. Environment configuration only** | **NO** |
| **FIND-04** | Evaluate reverse-proxy `trust proxy` configuration for proxy rate-limiting | **P2** | **B. Infrastructure configuration only** | **NO** |
| **FIND-05** | Ensure persistent volume mount for `/app/apps/api/uploads` directory | **P2** | **B. Infrastructure configuration only** | **NO** |
| **FIND-06** | Log inspection & observability in production Pino HTTP logger | **P3** | **D. Operational procedure only** | **NO** |
| **FIND-07** | `SignupOtp` model registration in `sync-indexes.ts` | **P2** | **E. Already resolved** | **RESOLVED** (`0211d4e`) |

---

## 4. Environment Configuration

### Target `.env` File Requirements (API)

Create or inject the following environment variables on the target host/container:

```ini
# Execution Mode (Strict Security Flags)
NODE_ENV=production

# Server HTTP Port
PORT=4000

# Production MongoDB Cluster Connection URI
MONGO_URI=mongodb://mongodb:27017/documan

# Mandatory Strong Secret for Signing Access Tokens (MUST be >= 32 characters)
JWT_SECRET=production_super_secret_key_minimum_32_characters_long_documan_2026

# Access Token Validity Duration (Default: 15 minutes)
JWT_EXPIRES_IN=15m

# Refresh Token Cookie Expiration in Days (Default: 7 days)
REFRESH_TOKEN_EXPIRES_IN_DAYS=7

# Production Web Origin for CORS Credentials
CORS_ORIGIN=http://localhost:8080

# Logging Level
LOG_LEVEL=info
```

### Target Environment Requirements (Web Frontend)

```ini
# Base URL for API HTTP Client
VITE_API_URL=http://localhost:4000/api/v1
```

*Validation:* `apps/api/src/config/env.ts` parses `process.env` via Zod schema and enforces `JWT_SECRET` minimum length of 32 characters on startup (`min(32)`).

---

## 5. Infrastructure Configuration

### Containerized Topology (`docker-compose.yml`)

The repository includes complete Docker orchestration:
1. `documan-mongodb` (`mongo:7.0`): Exposes port `27017`, mounts `mongodb_data` volume, configured with healthcheck (`mongosh --eval "db.runCommand('ping').ok"`).
2. `documan-api` (`apps/api/Dockerfile`): Multi-stage Alpine build running non-root `USER node`, exposes port `4000`, mounts `api_uploads` volume, depends on healthy `documan-mongodb`.
3. `documan-web` (`apps/web/Dockerfile`): Multi-stage build running Nginx Alpine as `USER nginx`, exposes port `8080`, serves SPA frontend with custom `nginx.conf`, depends on healthy `documan-api`.

---

## 6. Source-Code Changes

**NO SOURCE-CODE CHANGES REQUIRED.**

- The repository codebase is 100% complete, fully verified, and ready for production deployment.
- All 28 Mongoose models are statically imported in `apps/api/src/scripts/sync-indexes.ts` (including `SignupOtp` via commit `0211d4e`).
- All environment parameters, security schemas, rate limiters, health endpoints, and Docker container configurations are in place.

---

## 7. Database Preflight

### Execution Procedure

Before starting the API server in production (`autoIndex: false`), the database index preflight script MUST be executed against the target production MongoDB instance.

```bash
# Execute standalone database index synchronization
pnpm --filter @documan/api db:index
```

### Script Execution Sequence (`apps/api/src/scripts/sync-indexes.ts`):
1. Connects to `MONGO_URI`.
2. Evaluates all 28 static model imports.
3. Obtains `mongoose.modelNames()` (includes `"SignupOtp"`, `"RefreshToken"`, `"User"`, `"Document"`, etc.).
4. Invokes `model.syncIndexes()` for all 28 models.
5. Verifies creation of:
   - `SignupOtp` TTL index: `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`
   - `SignupOtp` unique index: `{ email: 1 }, { unique: true }`
   - `RefreshToken` TTL & hash indexes
   - `User` unique email index
6. Disconnects cleanly.

*Safety Safeguard:* `sync-indexes.ts` is idempotent; running it against an existing database updates missing indexes without dropping data.

---

## 8. SMTP Configuration

### Current Behavior
- `apps/api/src/utils/email.service.ts` provides `ConsoleEmailService` (`development` / `test`) and `SmtpEmailService` (`production`).
- In `production`, `SmtpEmailService` logs `[PROD OTP EMAIL DISPATCHED] To: user@example.com` to standard output.

### Deployment Options
1. **Container Log Dispatch (Default Baseline):** In containerized environments, OTP delivery notices log cleanly to container stdout, enabling operational log inspection.
2. **External SMTP Wiring (Optional Infrastructure Setup):** If physical inbox delivery to end-users is required in live production, SMTP provider environment variables (e.g. Nodemailer with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) can be supplied.

NO code modification is required for baseline deployment.

---

## 9. Reverse Proxy Configuration

### Analysis & Trust Proxy Safety

- **Current Implementation (`apps/api/src/app.ts`):** Express app is initialized without `app.set('trust proxy', 1)`.
- **Default Container Topology (`docker-compose.yml`):**
  - Web frontend container (`documan-web` at port 8080) forwards API requests over internal Docker bridge network (`documan_net`) to API container (`documan-api` at port 4000).
  - Rate limiters (`express-rate-limit`) in `rate-limit.middleware.ts` evaluate client IP addresses.
- **Topology Recommendations:**
  - *Direct / Docker Compose Topology:* NO change required. Express accurately reads client IP.
  - *Cloudflare / AWS ALB / External Nginx Topology:* If an external reverse proxy terminates TLS and sets `X-Forwarded-For`, `app.set('trust proxy', 1)` can be set in deployment environment if IP rate-limiting per external client IP is required.

NO source-code change required for standard deployment.

---

## 10. Persistent Upload Storage

### Volume Specification

Uploads are persisted on host disk to prevent data loss during container restarts:
- **Application Path:** `/app/apps/api/uploads`
- **Version Files Path:** `/app/apps/api/uploads/documents/versions`
- **Docker Compose Mount:**
  ```yaml
  volumes:
    - api_uploads:/app/apps/api/uploads
  ```
- **Backup Script Coverage:** `scripts/backup-mongodb.sh` archives `/app/apps/api/uploads` into timestamped `.tar.gz` bundles.

---

## 11. Deployment Procedure

Exact 18-step production deployment sequence using supported repository commands:

### PRE-DEPLOYMENT
1. **Repository Verification:** Confirm `main` branch is clean at commit `0211d4e1976890af1061bf6b5e171da7940df02a`.
2. **Environment Configuration:** Inject production `.env` variables (`NODE_ENV=production`, strong 32+ char `JWT_SECRET`, `MONGO_URI`, `CORS_ORIGIN`).
3. **Dependency Installation:** Execute `pnpm install --frozen-lockfile`.
4. **Pre-flight Code Verification:**
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build`
5. **Database Index Preflight:** Execute `pnpm --filter @documan/api db:index`.
6. **Pre-deployment Backup:** Execute `scripts/backup-mongodb.sh` (or `.ps1`).

### DEPLOYMENT
7. **Container Image Build:** Execute `docker compose build`.
8. **Service Launch:** Execute `docker compose up -d`.
9. **MongoDB Health Verification:** Wait for `documan-mongodb` healthcheck (`mongosh ping`).
10. **API Health Verification:** Poll `GET http://localhost:4000/api/v1/health/ready` until HTTP 200 `{ status: "ok", database: "connected" }`.
11. **API Liveness Verification:** Poll `GET http://localhost:4000/api/v1/health/live` until HTTP 200 `{ live: true }`.
12. **Web Frontend Verification:** Access `http://localhost:8080/` to confirm Vite/Nginx SPA load.

### POST-DEPLOYMENT
13. **Automated Container Smoke Test:** Execute `scripts/container-smoke-test.sh` (or `.ps1`).
14. **Manual Post-Deployment Smoke Test:** Run authentication, OTP, and core product smoke checklist.
15. **Upload Verification:** Verify document upload and binary retrieval.
16. **Log Verification:** Inspect Pino structured JSON container logs (`docker compose logs api`).
17. **Rollback Readiness Confirmation:** Verify backup `.tar.gz` archive integrity.
18. **Production Sign-Off:** Mark deployment as active.

---

## 12. Post-Deployment Verification

### Smoke Test Checklist

#### 1. Authentication & Signup OTP
- [ ] `POST /api/v1/auth/register` → HTTP 201 + confirmation message (NO JWT / NO cookie)
- [ ] OTP dispatch logged cleanly in container logs
- [ ] `POST /api/v1/auth/register/verify-otp` with valid OTP → HTTP 200 + access token + HTTP-only `documan_refresh_token` cookie
- [ ] `POST /api/v1/auth/register/verify-otp` with invalid OTP → HTTP 400 `INVALID_OTP`
- [ ] `POST /api/v1/auth/register/resend-otp` → HTTP 200 + 60s cooldown
- [ ] Login with unverified user → HTTP 403 `EMAIL_NOT_VERIFIED`
- [ ] Login with verified user → HTTP 200 + session creation
- [ ] `POST /api/v1/auth/logout` → HTTP 200 + cookie cleared

#### 2. Core Product Journeys
- [ ] Dashboard metrics & overview
- [ ] Projects list & project creation
- [ ] Project Workspace 5-tab navigation (`overview`, `documents`, `relationships`, `knowledge`, `governance`)
- [ ] Document version upload & file download
- [ ] Knowledge risk search
- [ ] Governance gate verification & printable release certificate
- [ ] Administration user management

#### 3. Health & Operations
- [ ] `GET /api/v1/health` → HTTP 200
- [ ] `GET /api/v1/health/ready` → HTTP 200
- [ ] `GET /api/v1/health/live` → HTTP 200

---

## 13. Rollback Procedure

If deployment verification fails:

1. **Stop Current Deployment:**
   ```bash
   docker compose down
   ```
2. **Revert Repository to Previous Version Tag:**
   ```bash
   git checkout <PREVIOUS_RELEASE_COMMIT_SHA>
   ```
3. **Restore Database & Upload Storage:**
   ```bash
   scripts/restore-mongodb.sh <PATH_TO_BACKUP_TAR_GZ>
   ```
4. **Re-build & Relaunch Previous Version:**
   ```bash
   docker compose up -d --build
   ```
5. **Verify Restored Health:**
   Poll `GET /api/v1/health/ready`.

---

## 14. Verification Matrix

| Area | Verification Tool / Command | Expected Baseline Result | Status |
| :--- | :--- | :--- | :---: |
| **TypeScript** | `pnpm typecheck` | 0 errors | **PASS** |
| **ESLint** | `pnpm lint` | 0 errors | **PASS** |
| **Test Suite** | `pnpm test` | 102 test files / 795 tests pass | **PASS** |
| **Production Build** | `pnpm build` | `@documan/api` tsc + `web` Vite build success | **PASS** |
| **Diff Hygiene** | `git diff --check` | 0 formatting / whitespace errors | **PASS** |
| **Index Sync** | `pnpm --filter @documan/api db:index` | 28 models registered & synced (including `SignupOtp`) | **PASS** |

---

## 15. Exact File Change Map

| File Path | Action | Description / Rationale |
| :--- | :---: | :--- |
| `docs/plans/POST-COMPLETION-PRODUCTION-DEPLOYMENT-IMPLEMENTATION-PLAN.md` | **NEW** | Production Deployment Implementation Plan artifact |
| *All Application Source Code Files* | **NONE** | **NO SOURCE-CODE CHANGES REQUIRED.** Repository is 100% complete. |

---

## 16. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
| :--- | :---: | :---: | :--- |
| Weak `JWT_SECRET` configured | Low | High | `env.ts` schema strictly fails startup if `JWT_SECRET` is $< 32$ characters. |
| Omitted `db:index` preflight | Low | Medium | Documented explicitly as Step 5 in Deployment Procedure. |
| Ephemeral `/uploads` directory | Low | Medium | `docker-compose.yml` mounts persistent `api_uploads` volume. |
| Container health timeout | Low | Low | `server.ts` handles graceful shutdown; health probes poll DB status. |

---

## 17. Final Deployment Checklist

- [x] Phases 1–32 complete and certified.
- [x] Self-service signup email OTP verification complete and published.
- [x] `SignupOtp` database index synchronization fix published (`0211d4e`).
- [x] Preflight deployment audit complete (`docs/research/POST-COMPLETION-PRODUCTION-ENVIRONMENT-DEPLOYMENT-PREFLIGHT-AUDIT.md`).
- [x] Production Deployment Implementation Plan complete.
- [x] Source code changes required: **NONE** (0 source files modified).
- [ ] User approval received for deployment execution.
