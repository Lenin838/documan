# Production Environment & Deployment Preflight Audit

**Date:** 2026-09-16  
**Status:** AUDIT COMPLETE (READ-ONLY)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Current HEAD SHA:** `0211d4e1976890af1061bf6b5e171da7940df02a` (synchronized with `origin/main`)  

---

## 1. Audit Scope

This document provides a comprehensive, read-only preflight production deployment audit for the **Documan** monorepo following the completion, verification, and Git publication of:
- Phases 1–32 (Core document management, governance, and security capability set)
- Post-completion self-service user signup
- Post-completion self-service signup email OTP verification
- Post-completion `SignupOtp` model database index synchronization fix (`commit 0211d4e`)

The audit evaluates target environment prerequisites, database readiness, security configuration, SMTP email integration, storage persistence, reverse-proxy setup, application runtime, logging, deployment procedures, smoke test execution, backup/rollback readiness, and remaining operational risks.

---

## 2. Current Repository State

- **Active Git Branch:** `main`
- **Synchronization State:** `main == origin/main` at commit `0211d4e1976890af1061bf6b5e171da7940df02a`
- **Working Tree:** Clean (0 uncommitted modifications or untracked files prior to this report)
- **Automated Verification Baseline:**
  - `pnpm typecheck`: PASS (0 TypeScript compilation errors)
  - `pnpm lint`: PASS (0 ESLint errors, 17 pre-existing warnings)
  - `pnpm test`: PASS (102 test files passed, 795 total tests passed)
  - `pnpm build`: PASS (`@documan/api` tsc compile success, `web` Vite client bundle success)
  - `git diff --check`: PASS (0 whitespace or formatting errors)
  - `db:index` script execution: PASS (28 Mongoose models registered and synchronized, including `SignupOtp`)

---

## 3. Environment Variables

### 1. API Environment Variables (`apps/api/src/config/env.ts`)

| Variable Name | Required / Optional | Consumed By | Purpose | Sensitivity | Documented | Production Requirement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Required | API & Web | Execution mode (`development`, `test`, `production`) | Low | Yes (`.env.example`) | Must be set to `production`. Enforces strict security flags (`autoIndex: false`, secure cookies). |
| `PORT` | Optional | API | HTTP server listening port | Low | Yes (`.env.example`) | Defaults to `4000`. |
| `MONGO_URI` | **Required** | API (`database.ts`) | MongoDB connection string | **High** | Yes (`.env.example`) | Must point to production MongoDB cluster (e.g. `mongodb://mongodb:27017/documan`). |
| `JWT_SECRET` | **Required (Critical)** | API (`jwt.ts`, `auth.service.ts`) | Secret for signing JWT access tokens | **CRITICAL** | Yes (`.env.example`) | Must be set to a strong secret ($\ge 32$ characters). Schema enforces `min(32)`. |
| `JWT_EXPIRES_IN` | Optional | API (`jwt.ts`) | Access token validity duration | Low | Yes (`.env.example`) | Defaults to `15m` (15 minutes). |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Optional | API (`auth.service.ts`, `auth.controller.ts`) | Refresh token cookie validity | Low | Yes (`.env.example`) | Defaults to `7` (7 days). |
| `CORS_ORIGIN` | **Required** | API (`app.ts`) | Trusted origin for CORS header | Medium | Yes (`.env.example`) | Must match exact production Web URL (e.g., `https://documan.app` or `http://localhost:8080`). |
| `LOG_LEVEL` | Optional | API (`logger.ts`) | Pino log level verbosity | Low | Yes (`.env.example`) | Defaults to `info`. Options: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`. |

### 2. Web Frontend Environment Variables (`apps/web/src/config/env.ts`)

| Variable Name | Required / Optional | Consumed By | Purpose | Sensitivity | Documented | Production Requirement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Required** | Web Client (`api-client.ts`) | Base URL for API HTTP requests | Medium | Yes (`.env.example`) | Must point to production API route (e.g., `https://api.documan.app/api/v1` or `/api/v1` behind reverse proxy). |

---

## 4. MongoDB Readiness

- **Mongoose Configuration (`apps/api/src/config/database.ts`):**
  - Connection Pool: `maxPoolSize: 50`, `minPoolSize: 5`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`.
  - Production Index Creation: `autoIndex: false` when `NODE_ENV === "production"`.
- **Preflight Index Synchronization Script (`apps/api/src/scripts/sync-indexes.ts`):**
  - Statically registers all 28 Mongoose models:
    `User`, `Document`, `DocumentVersion`, `DocumentAudit`, `DocumentReference`, `DocumentRelationship`, `DocumentReview`, `Folder`, `Project`, `ProjectTopologyLink`, `Notification`, `Webhook`, `WebhookDelivery`, `ProjectApiSpec`, `ProjectApiEndpoint`, `DocumentEndpointLink`, `DocumentationBaseline`, `DocumentationWorkRequest`, `SystemGovernanceWaiver`, `VerificationPlan`, `VerificationTask`, `SystemReleaseCertificate`, `DocumentChangeProposal`, `DocumentChangePackage`, `PackageFulfillmentAttestation`, `RefreshToken`, `SignupOtp`, `DocumentShare`.
  - **Resolution Confirmed:** `SignupOtp` is explicitly imported (commit `0211d4e`). Executing `pnpm --filter @documan/api db:index` creates:
    1. `expiresAt` TTL Index: `{ expiresAt: 1 }, { expireAfterSeconds: 0 }` (enables MongoDB background TTL thread purging).
    2. `email` Unique Index: `{ email: 1 }, { unique: true }`.
- **Preflight Requirement:** Production deployments **MUST** run `pnpm --filter @documan/api db:index` during deployment pre-flight before application startup.

---

## 5. Authentication & Security

- **Self-Service Signup & OTP Architecture (`auth.service.ts`):**
  - 2-Step Registration: `POST /api/v1/auth/register` creates user with `isEmailVerified: false` and generates a 6-digit OTP (`crypto.randomInt`).
  - No Session on Registration: Zero access token or refresh cookie is returned on Step 1 registration.
  - In-Memory Hashing: OTP is hashed via SHA-256 (`hashOtp`) before saving to `signup_otps` collection with a 10-minute expiration (`expiresAt`).
  - Verification (`POST /api/v1/auth/register/verify-otp`): Validates code, enforces a 5-attempt limit (`failedAttempts`), marks `isEmailVerified: true`, deletes OTP record, and issues access token + refresh cookie.
  - Resend (`POST /api/v1/auth/register/resend-otp`): Enforces 60-second cooldown (`lastSentAt`) and 3-resends-per-hour limit (`resendCount`).
  - Login Guard (`POST /api/v1/auth/login`): Rejects unverified accounts with HTTP 403 `EMAIL_NOT_VERIFIED`.
- **Rate Limiting (`rate-limit.middleware.ts`):**
  - Registration: 5 requests / 15 minutes per IP (`signupRateLimiter`)
  - OTP Verification: 10 requests / 15 minutes per IP (`verifyOtpRateLimiter`)
  - OTP Resend: 3 requests / 15 minutes per IP (`resendOtpRateLimiter`)
  - Login: 5 requests / 15 minutes per IP (`loginRateLimiter`)
  - Refresh: 10 requests / 15 minutes per IP (`refreshRateLimiter`)
- **Refresh Cookie Flags (`auth.controller.ts`):**
  - `httpOnly: true`, `secure: env.NODE_ENV === "production"`, `sameSite: "lax"`, `path: "/api/v1/auth"`.

---

## 6. SMTP / Email Readiness

- **Current Implementation (`apps/api/src/utils/email.service.ts`):**
  - `ConsoleEmailService`: Active in `development` and `test` environments. Outputs `[DEV OTP EMAIL] To: ... | Code: ...`.
  - `SmtpEmailService`: Active in `production`. Currently outputs `[PROD OTP EMAIL DISPATCHED] To: ...`.
- **Production Email Provider Requirement:**
  - To deliver actual OTP emails to physical user inboxes in a real production environment, a dedicated transactional email service or SMTP transport (e.g. Nodemailer with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) must be wired into `SmtpEmailService`.
  - If production is launched without external SMTP configuration, OTP emails will output to production container logs instead of user inboxes.

---

## 7. Upload Storage

- **Storage Location (`apps/api/src/modules/documents/document-version.service.ts`):**
  - Uploaded version files are saved at path: `/app/apps/api/uploads/documents/versions/`.
- **Persistence Guarantee:**
  - In containerized deployments (Docker / Kubernetes), `/app/apps/api/uploads` **MUST** be mounted to a persistent volume (`api_uploads`) on host storage.
  - If deployed on an ephemeral filesystem (e.g., unmounted Docker container or Serverless Node container), container restarts will erase stored version binaries.

---

## 8. Reverse Proxy & HTTPS

- **Express Proxy Configuration (`apps/api/src/app.ts`):**
  - Currently, `app.ts` does NOT call `app.set('trust proxy', 1)`.
  - **Reverse Proxy Requirement:** If the API is deployed behind Nginx, AWS Application Load Balancer, or Cloudflare, `app.set('trust proxy', 1)` should be configured so Express rate limiters correctly evaluate client IP addresses from `X-Forwarded-For` headers instead of the load balancer IP.
- **Web Server Nginx (`apps/web/Dockerfile` & custom `nginx.conf`):**
  - Web container exposes port 8080 running Nginx Alpine.
  - SPA Fallback: `try_files $uri $uri/ /index.html`.
  - Static Caching: `Cache-Control "public, no-transform"` for assets.
  - Security Headers: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `X-XSS-Protection "1; mode=block"`.

---

## 9. Application Runtime

- **Node.js Engine:** Node.js 22 LTS (`node:22-alpine` in Dockerfiles).
- **Package Manager:** `pnpm@10.34.5`.
- **API Build & Start:**
  - Build: `pnpm --filter @documan/api build` (`tsc -p tsconfig.json` → compiles to `apps/api/dist/`).
  - Start: `node apps/api/dist/server.js`.
- **Web Build & Start:**
  - Build: `pnpm --filter web build` (`tsc -b && vite build` → compiles to `apps/web/dist/`).
  - Start: Nginx serving `dist/` on port 8080.
- **Graceful Shutdown (`apps/api/src/server.ts`):**
  - `SIGINT` and `SIGTERM` signals trigger a 10-second graceful HTTP server drain and clean Mongoose disconnection (`disconnectDatabase()`).
- **Health Endpoints (`apps/api/src/modules/health/`):**
  - `GET /api/v1/health`: Returns HTTP 200 `{ status: "ok" | "degraded", database: "connected" | "disconnected", uptime }`.
  - `GET /api/v1/health/ready`: Readiness probe. HTTP 200 when DB connected; HTTP 503 when disconnected.
  - `GET /api/v1/health/live`: Liveness probe. HTTP 200 `{ live: true }`.

---

## 10. Logging & Operations

- **Logger Framework (`apps/api/src/config/logger.ts`):**
  - Pino HTTP Logger (`pino-http`) attached globally in `app.ts`.
  - Request ID Tracking: Injects UUID v4 `X-Request-ID` header into every response.
  - Serializers: Serializes `req.id`, `req.method`, `req.url`, `res.statusCode`.
- **Log Security:** Passwords, OTP codes, JWT secrets, and refresh tokens are excluded from log serializers.

---

## 11. Deployment Procedure

Constructed 10-step production deployment sequence supported by the repository:

1. **Pre-flight Environment Validation:**
   - Configure production environment variables (`NODE_ENV=production`, strong 32+ char `JWT_SECRET`, `MONGO_URI`, `CORS_ORIGIN`, `VITE_API_URL`).
2. **Repository Checkout & Cleanliness Check:**
   - Confirm branch `main` at expected commit SHA (`0211d4e`).
3. **Dependency Installation:**
   - Execute `pnpm install --frozen-lockfile`.
4. **Database Preflight Index Synchronization:**
   - Execute `pnpm --filter @documan/api db:index` (`sync-indexes.ts`) to synchronize all 28 Mongoose model indexes in MongoDB.
5. **Database & Storage Backup:**
   - Execute `scripts/backup-mongodb.sh` (or `.ps1`) to dump MongoDB state and archive `/uploads`.
6. **Build Applications:**
   - Execute `pnpm build` (or `docker compose build`).
7. **Service Launch:**
   - Execute `docker compose up -d` (or `node apps/api/dist/server.js`).
8. **Health & Readiness Verification:**
   - Poll `GET /api/v1/health/ready` until HTTP 200 is returned.
   - Poll `GET /api/v1/health/live` until HTTP 200 is returned.
9. **Execute Container Smoke Test:**
   - Execute `scripts/container-smoke-test.sh` (or `.ps1`).
10. **Post-Deployment Verification:**
    - Perform manual post-deployment smoke test suite.

---

## 12. Post-Deployment Smoke Test Checklist

### 1. Authentication & Signup OTP Flow
- [ ] `POST /api/v1/auth/register` with valid email & password → Returns HTTP 201 + message requiring OTP verification.
- [ ] Confirm NO access token or refresh cookie is returned on Step 1 registration.
- [ ] Confirm OTP email delivery (log inspect or inbox check).
- [ ] `POST /api/v1/auth/register/verify-otp` with valid OTP → Returns HTTP 200 + access token + `documan_refresh_token` HTTP-only cookie.
- [ ] `POST /api/v1/auth/register/verify-otp` with invalid OTP → Returns HTTP 400 `INVALID_OTP` + remaining attempts count.
- [ ] `POST /api/v1/auth/register/verify-otp` with expired OTP (>10m) → Returns HTTP 400 `OTP_EXPIRED`.
- [ ] `POST /api/v1/auth/register/resend-otp` → Returns HTTP 200 + 60s cooldown notice.
- [ ] `POST /api/v1/auth/register/resend-otp` within 60s → Returns HTTP 429 `RESEND_COOLDOWN_ACTIVE`.
- [ ] `POST /api/v1/auth/register/resend-otp` (>3 times in 1hr) → Returns HTTP 429 `RESEND_LIMIT_EXCEEDED`.
- [ ] `POST /api/v1/auth/register` with duplicate email → Returns HTTP 409 `EMAIL_ALREADY_EXISTS`.
- [ ] `POST /api/v1/auth/login` with unverified account → Returns HTTP 403 `EMAIL_NOT_VERIFIED`.
- [ ] `POST /api/v1/auth/login` with verified account → Returns HTTP 200 + access token + refresh cookie.
- [ ] `POST /api/v1/auth/logout` → Returns HTTP 200 + clears `documan_refresh_token` cookie.
- [ ] `POST /api/v1/auth/refresh` → Returns HTTP 200 + new access token & rotated refresh cookie.

### 2. Core Product Journeys
- [ ] Login page load & authentication
- [ ] Dashboard metrics & system overview
- [ ] Projects list & project creation
- [ ] Project workspace & 5-tab navigation (`overview`, `documents`, `relationships`, `knowledge`, `governance`)
- [ ] Documents list & document creation
- [ ] Document version upload & file download
- [ ] Knowledge search query & risk analysis
- [ ] Governance baseline alignment & gate token check
- [ ] Change proposal & change package creation
- [ ] Printable release certificate generation
- [ ] Admin user management & user deletion
- [ ] Document trash & restoration

### 3. Infrastructure & Operational Probes
- [ ] `GET /api/v1/health` → HTTP 200 `{ status: "ok", database: "connected" }`
- [ ] `GET /api/v1/health/ready` → HTTP 200
- [ ] `GET /api/v1/health/live` → HTTP 200
- [ ] Web static frontend load (index.html, JS/CSS bundles)
- [ ] MongoDB connection pool stability
- [ ] `/uploads` volume write & read access

---

## 13. Backup & Rollback

- **Backup Scripts (`scripts/backup-mongodb.ps1` / `.sh`):**
  - Dumps all MongoDB collections via `mongodump` into timestamped archive (`documan-backup-YYYYMMDD-HHMMSS.tar.gz`).
  - Archives uploaded file directory `/app/apps/api/uploads`.
- **Restore Scripts (`scripts/restore-mongodb.ps1` / `.sh`):**
  - Restores MongoDB state via `mongorestore` and extracts uploaded version files.
- **Rollback Strategy:**
  - Immutable Git commit tags (`0211d4e`).
  - Standalone Docker image tags (`apps/api/Dockerfile`, `apps/web/Dockerfile`).
  - Persistent volume mounts (`api_uploads`, `mongodb_data`) guarantee zero file or database loss during image rollbacks.

---

## 14. Remaining Risks

| Risk ID | Finding Area | Description / Evidence | Severity | Recommended Action | Source Change Required? |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **RISK-01** | Environment Config | `JWT_SECRET` must be set to a strong key ($\ge 32$ chars) in target environment | **P1** | Set strong `JWT_SECRET` in production `.env` | No |
| **RISK-02** | Database Preflight | `pnpm --filter @documan/api db:index` must be run prior to production startup | **P1** | Include `db:index` step in deployment pipeline | No |
| **RISK-03** | SMTP Email | `SmtpEmailService` logs OTP in production unless external SMTP is wired | **P2** | Configure SMTP provider credentials for real inbox email delivery | Recommended for live email |
| **RISK-04** | Reverse Proxy | `app.ts` does not set `app.set('trust proxy', 1)` for proxy rate-limiting | **P2** | Add `app.set('trust proxy', 1)` if API is behind ALB/Nginx proxy | Optional |
| **RISK-05** | Storage Persistence | Container restarts erase `/uploads` if volume is unmounted | **P2** | Ensure Docker host volume `api_uploads` is mounted | Environment config |

---

## 15. Resolved Previous Findings

| Previously Identified Finding | Severity | Resolution Evidence | Resolution Commit / File |
| :--- | :---: | :--- | :--- |
| **`SignupOtp` model omitted from `sync-indexes.ts`** | **P2** | `import "../modules/auth/signup-otp.model.js";` was added to `sync-indexes.ts`. `db:index` now registers 28 models and syncs `SignupOtp` indexes cleanly. | Commit `0211d4e1976890af1061bf6b5e171da7940df02a` in `apps/api/src/scripts/sync-indexes.ts` |
| **Self-Service Registration without OTP** | **P2** | Implemented 2-step OTP registration flow with 6-digit OTP, SHA-256 hashing, 10m TTL, rate limiters, and `EMAIL_NOT_VERIFIED` login guard. | Commits `8f9ad8c` & `e7d9a07` |

---

## 16. Final Pre-Deployment Checklist

- [x] Phases 1–32 complete and verified.
- [x] Self-service signup email OTP verification published and verified.
- [x] `SignupOtp` database index synchronization fix published and verified.
- [x] `main` branch synchronized with `origin/main` at commit `0211d4e`.
- [x] Automated test suite passing (102 test files / 795 tests).
- [x] Production builds compiling cleanly (`@documan/api` and `web`).
- [x] Health and readiness endpoints (`/health`, `/health/ready`, `/health/live`) verified.
- [x] MongoDB connection pool and index preflight script (`db:index`) verified.
- [x] Backup and restore scripts (`backup-mongodb.sh`, `restore-mongodb.sh`) verified.

---

## 17. Evidence / Repository References

- `apps/api/src/config/env.ts`
- `apps/api/src/config/database.ts`
- `apps/api/src/config/logger.ts`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/scripts/sync-indexes.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.routes.ts`
- `apps/api/src/modules/auth/signup-otp.model.ts`
- `apps/api/src/utils/email.service.ts`
- `apps/api/src/middleware/rate-limit.middleware.ts`
- `apps/web/src/config/env.ts`
- `apps/web/Dockerfile`
- `apps/api/Dockerfile`
- `docker-compose.yml`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`
- `scripts/backup-mongodb.sh`
- `scripts/restore-mongodb.sh`
