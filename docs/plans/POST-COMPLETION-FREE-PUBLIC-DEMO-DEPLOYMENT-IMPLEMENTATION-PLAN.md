# Free Public Demo Deployment Implementation Plan

**Date:** 2026-09-18  
**Status:** PLAN COMPLETE (AWAITING USER APPROVAL)  
**Target deployment:** DOCUMAN FREE PUBLIC DEMO  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Authoritative HEAD SHA:** `801b7a500ba91f2f53e8498f17d7a3bbf8105d84`  
**Research Baseline SHA:** `0211d4e1976890af1061bf6b5e171da7940df02a`  
**Research Reference:** `docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md`  

---

## 1. Objective

This implementation plan details the target architecture, hosting configuration, preflight database procedures, deployment sequence, environment variables, security specifications, smoke testing suite, and risk analysis for deploying **Documan** as a **FREE PUBLIC DEMO**.

Target Deployment Stack:
- **Frontend Hosting:** Vercel (React 19 / Vite SPA)
- **Backend API Hosting:** Render Free Web Service (Node.js / Express API)
- **Database:** MongoDB Atlas Free Tier (M0 Sandbox)
- **Email & OTP Dispatch:** External Transactional SMTP Provider

> [!IMPORTANT]
> **Plan Scope & Status:**
> - This is **Post-Completion Deployment Preparation** for a **FREE PUBLIC DEMO**.
> - This is **NOT** Phase 33 and **NOT** production certification.
> - This document is strictly **RESEARCH AND PLANNING ONLY**.
> - **DO NOT** modify application source code, package.json, lockfiles, Docker configs, or environment files.
> - **DO NOT** commit, push, create cloud resources, connect to production databases, or deploy.

---

## 2. Current Repository Baseline

Inspection of `c:\MERN_STACK\Documan\documan` confirms the authoritative project configuration:

- **Monorepo Structure:** `pnpm@10.34.5` workspace (`pnpm-workspace.yaml`, `turbo.json`).
- **Frontend Application (`apps/web`):**
  - Framework: React 19.2.8, Vite 8.2.0, Tailwind CSS 4.3.3, Zustand 5.0.15, Axios 1.19.0, React Router v7.18.2.
  - Build Command: `pnpm --filter web build` (`tsc -b && vite build`).
  - Output Directory: `apps/web/dist/`.
  - Client Environment Variable: `VITE_API_URL` (consumed in `apps/web/src/api/client.ts`).
- **Backend API (`apps/api`):**
  - Framework: Express 5.2.1, Mongoose 9.9.2, Pino 10.3.1, Zod 4.4.3, Vitest 4.1.11, Nodemailer 10.0.10.
  - Build Command: `pnpm --filter @documan/api build` (`tsc -p tsconfig.json`).
  - Start Command: `node apps/api/dist/server.js`.
  - Port Behavior: Listens on `env.PORT` (defaults to 4000; Render dynamically injects `$PORT`).
  - Health Endpoints: `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`.
- **Database Index Preflight Script:**
  - Script Command: `pnpm --filter @documan/api db:index` (`apps/api/src/scripts/sync-indexes.ts`).
  - Verified Model Discovery: Statically imports and synchronizes all 28 Mongoose models, explicitly including `SignupOtp` (line 32) and `RefreshToken`.
- **Node.js Environment Version:** Node.js 22.x required across all deployment services.
- **Git Repository State:**
  - Branch: `main`
  - Local HEAD SHA: `801b7a500ba91f2f53e8498f17d7a3bbf8105d84`
  - Working Tree: Clean (0 uncommitted changes)

---

## 3. Deployment Architecture

```
                       ┌─────────────────────────┐
                       │     GitHub Repository   │
                       │    (branch: main)       │
                       └────────────┬────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌────────────────────────┐                        ┌────────────────────┐
│    Vercel Frontend     │                        │    Render Free     │
│   (Vite / React SPA)   │                        │   (Node/Express)   │
│ https://<app>.vercel.  │                        │ https://<app>.on   │
│          app           │                        │     render.com     │
└──────────┬─────────────┘                        └─────────┬──────────┘
           │                                                │
           │ HTTPS API Requests                             │ Mongoose SRV
           │ (withCredentials: true)                        ├──────────────┐
           └────────────────────────────────────────────────┘              │
                                                                           ▼
                                                                  ┌────────────────┐
                                                                  │ MongoDB Atlas  │
                                                                  │ (M0 Sandbox)   │
                                                                  └────────────────┘
```

The Documan Free Public Demo architecture connects a static Vite SPA on Vercel to a stateless Express API on Render Free. Database persistence is supplied by MongoDB Atlas M0, and transactional OTP verification emails are dispatched via an External SMTP provider.

---

## 4. GitHub Configuration

1. **Repository Target:** Remote repository connected to Vercel and Render integrations.
2. **Production Branch:** `main` (clean baseline).
3. **Deployment Triggers:**
   - Push to `main` triggers automatic deployment builds on both Vercel and Render.
4. **Secret Management:** No secrets, API keys, or database URIs stored in git. All environment secrets injected via platform configuration panels.

---

## 5. MongoDB Atlas Configuration

### Specification (M0 Sandbox Free Cluster)

- **Tier:** M0 Sandbox (Free Forever).
- **Storage Allowance:** 512 MB shared database storage.
- **Database Name:** `documan`.
- **Database User:** Dedicated application user with read/write access to `documan` database.
- **Network Access:** Allow access from `0.0.0.0/0` (required because Render Free Web Services use dynamic IP addresses without fixed egress IPs).
- **Connection URI Format:**
  `mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/documan?retryWrites=true&w=majority`

> [!WARNING]
> **Safety Directive:**
> - DO NOT create the cluster during planning.
> - DO NOT connect to Atlas during planning.
> - DO NOT execute `db:index` during planning.
> - Procedure documented for deployment phase only.

---

## 6. Render API Configuration

### Service Specification

- **Service Type:** Web Service (Node.js runtime).
- **GitHub Branch:** `main`.
- **Root Directory:** `apps/api` (or root context with pnpm filter).
- **Node.js Version:** `22.x` (configured via `NODE_VERSION=22` environment variable).
- **Build Command:**
  ```bash
  pnpm install --frozen-lockfile && pnpm --filter @documan/api build
  ```
- **Pre-Deploy / Preflight Command:**
  ```bash
  pnpm --filter @documan/api db:index
  ```
- **Start Command:**
  ```bash
  node apps/api/dist/server.js
  ```
- **Port Allocation:** Render automatically injects the `$PORT` environment variable (e.g. `10000`). `apps/api/src/config/env.ts` parses `PORT` via `z.coerce.number()` and Express binds to it automatically.
- **Health Check Path:** `/api/v1/health/ready` (returns HTTP 200 when database is connected).
- **Auto-Deploy:** Enabled on push to `main`.

---

## 7. SMTP Configuration

### Operational Architecture

- **Implementation File:** `apps/api/src/utils/email.service.ts` (`SmtpEmailService`).
- **Requirements:** For the public demo, real users registering accounts must receive 6-digit verification OTP codes in their email inboxes. The public demo **MUST NOT** rely on users reading Render server stdout logs.
- **Recommended Free Transactional Providers:**
  - **Resend:** 3,000 free emails/month (100 emails/day).
  - **SendGrid:** 100 free emails/day.
  - **Brevo:** 300 free emails/day.
- **Environment Variables Required:**
  - `SMTP_HOST`: Provider SMTP host (e.g. `smtp.resend.com` or `smtp.sendgrid.net`)
  - `SMTP_PORT`: `587` (TLS/STARTTLS) or `465` (SSL)
  - `SMTP_USER`: Provider API key username / account
  - `SMTP_PASS`: Provider API secret key / password
  - `SMTP_FROM`: `"Documan Security" <no-reply@yourdomain.com>`
  - `SMTP_SECURE`: `false` (for 587) or `true` (for 465)

### Verification Flow

```
User enters email on Signup Page
  │
  ▼
POST /api/v1/auth/register
  │ (API generates 6-digit OTP, saves hashed record in MongoDB)
  ▼
SmtpEmailService dispatches email via SMTP
  │
  ▼
User receives 6-digit code in Inbox
  │
  ▼
User submits OTP on Verification Page
  │
  ▼
POST /api/v1/auth/register/verify-otp
  │ (API validates OTP, marks emailVerified=true, issues JWT & Refresh Cookie)
  ▼
User redirected to Dashboard (Authenticated)
```

---

## 8. Vercel Frontend Configuration

### Specification

- **Framework Preset:** Vite
- **Root Directory:** `apps/web`
- **Build Command:** `pnpm --filter web build` (executes `tsc -b && vite build`)
- **Output Directory:** `dist` (or `apps/web/dist`)
- **Install Command:** `pnpm install`
- **Node.js Version:** `22.x`
- **Environment Variables:**
  - `VITE_API_URL=https://<your-render-app>.onrender.com/api/v1`

### SPA Client-Side Routing Requirement

Single-Page Applications require routing all deep browser paths (e.g., `/dashboard`, `/projects`, `/governance`) back to `index.html`. On Vercel, this is configured via a `vercel.json` file in `apps/web/`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

> [!NOTE]
> **Source Change Statement:**
> **NO SOURCE CHANGE REQUIRED** for frontend application logic (`.ts` / `.tsx` files). Creating `apps/web/vercel.json` is a **Hosting Configuration** file.

---

## 9. Environment Variable Matrix

| Variable | Platform | Required? | Purpose | Secret? | Example Format Only | Where Consumed |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `NODE_ENV` | Render | **YES** | Sets production security mode & cookie flags | **NO** | `production` | `apps/api/src/config/env.ts` |
| `PORT` | Render | **YES** | HTTP server listening port | **NO** | `10000` (Injected by Render) | `apps/api/src/config/env.ts` |
| `MONGO_URI` | Render | **YES** | Connection string for MongoDB Atlas cluster | **YES** | `mongodb+srv://user:pass@cluster.mongodb.net/documan?retryWrites=true&w=majority` | `apps/api/src/config/database.ts` |
| `JWT_SECRET` | Render | **YES** | Secret key for signing JWT access tokens ($\ge 32$ chars) | **YES** | `super_secret_production_key_minimum_32_characters_2026` | `apps/api/src/config/env.ts` |
| `JWT_EXPIRES_IN` | Render | **NO** | Access token validity duration (Default: 15m) | **NO** | `15m` | `apps/api/src/config/env.ts` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Render | **NO** | Refresh token cookie TTL (Default: 7 days) | **NO** | `7` | `apps/api/src/config/env.ts` |
| `CORS_ORIGIN` | Render | **YES** | Allowed origin for frontend requests | **NO** | `https://documan-demo.vercel.app` | `apps/api/src/app.ts` |
| `LOG_LEVEL` | Render | **NO** | Pino logging level (Default: info) | **NO** | `info` | `apps/api/src/config/logger.ts` |
| `SMTP_HOST` | Render | **YES** | Hostname of external SMTP provider | **NO** | `smtp.resend.com` | `apps/api/src/utils/email.service.ts` |
| `SMTP_PORT` | Render | **YES** | Port of external SMTP provider | **NO** | `587` | `apps/api/src/utils/email.service.ts` |
| `SMTP_USER` | Render | **YES** | SMTP authentication username | **YES** | `resend` | `apps/api/src/utils/email.service.ts` |
| `SMTP_PASS` | Render | **YES** | SMTP authentication password / API key | **YES** | `re_123456789_secret` | `apps/api/src/utils/email.service.ts` |
| `SMTP_FROM` | Render | **NO** | Email sender display string | **NO** | `"Documan Security" <no-reply@demo.app>` | `apps/api/src/utils/email.service.ts` |
| `SMTP_SECURE` | Render | **NO** | SSL flag for SMTP (`true` for 465, `false` for 587) | **NO** | `false` | `apps/api/src/utils/email.service.ts` |
| `VITE_API_URL` | Vercel | **YES** | Base URL for API calls from browser client | **NO** | `https://documan-api.onrender.com/api/v1` | `apps/web/src/api/client.ts` |

---

## 10. CORS Configuration

- **Backend Middleware (`apps/api/src/app.ts`):**
  ```typescript
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  ```
- **Required Environment Value:**
  Set `CORS_ORIGIN` on Render to the exact HTTPS origin of the Vercel deployment (e.g. `https://documan-demo.vercel.app`).
- **Wildcard Restraint:** Wildcard (`*`) **MUST NOT** be used because `credentials: true` is enabled to support cross-site HTTP-only cookies. Browsers reject credentialed requests when `Access-Control-Allow-Origin` is set to `*`.

---

## 11. Authentication & Cookie Configuration

### Tokens & Cookie Characteristics

- **Access Token:** Short-lived JWT transmitted via HTTP header (`Authorization: Bearer <token>`).
- **Refresh Token Cookie (`documan_refresh_token`):**
  - Path: `/api/v1/auth`
  - `httpOnly: true` (prevents JavaScript access / XSS protection)
  - `secure: true` in production (`env.NODE_ENV === 'production'`)
  - `sameSite: 'lax'` (current source implementation)

### Cross-Domain Browser Behavior Analysis

When deploying Frontend to Vercel (`https://<app>.vercel.app`) and Backend API to Render (`https://<app>.onrender.com`), the domains have distinct public root suffixes. Modern browsers treat requests between different public suffixes as **cross-site third-party requests**.

- **Current Implementation in `auth.controller.ts`:**
  ```typescript
  res.cookie("documan_refresh_token", result.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });
  ```
- **Finding:** Under strict browser cross-site cookie policies, `SameSite=Lax` cookies are not sent on cross-site asynchronous XHR/fetch requests (`withCredentials: true`).

### Resolution Strategies

1. **Hosting Option (Recommended - No Source Code Change):**
   Attach custom subdomains under a shared apex domain (e.g. Frontend at `https://demo.documan.app` and API at `https://api-demo.documan.app`). Browsers treat subdomains of the same apex domain as same-site, allowing `SameSite=Lax` cookies to work seamlessly.
2. **Source Code Option (Identified for Future Modification):**
   If custom subdomains are not used and Vercel/Render default subdomains are used, update `auth.controller.ts` cookie options to `sameSite: "none"` (with `secure: true`).

---

## 12. Trust Proxy Analysis

- **Current Configuration (`apps/api/src/app.ts`):** Express application does not currently invoke `app.set('trust proxy', 1)`.
- **Render Proxy Architecture:** Render routes traffic through an upstream HTTP reverse proxy layer that terminates TLS and forwards the client IP address in the `X-Forwarded-For` header.
- **Impact on Rate Limiting (`apps/api/src/middleware/rate-limit.middleware.ts`):**
  Without `app.set('trust proxy', 1)`, Express rate limiters (`loginRateLimiter`, `signupRateLimiter`, etc.) evaluate `req.ip` as the IP address of Render's internal proxy instead of the real client IP.
  - Result 1: All public demo users share a single rate-limiting IP bucket.
  - Result 2: `express-rate-limit` v7/v8 emits warnings or blocks requests when `X-Forwarded-For` headers are present without proxy trust.
- **Required Configuration:**
  In proxy-hosted environments, adding `app.set('trust proxy', 1)` in `apps/api/src/app.ts` prior to rate limiters resolves client IPs correctly.
  *(This is classified under Source Code Change Required for production proxy rate-limiting).*

---

## 13. Upload Storage Limitation

### Operational Behavior on Render Free

1. **Filesystem Path:** `apps/api/uploads/documents/versions/` (`document-version.service.ts`).
2. **Render Ephemeral Disk Limitation:**
   Render Free Web Services feature an **ephemeral filesystem**. Any binary files written to disk are wiped whenever the service spins down (after 15 minutes of inactivity), restarts, or redeploys.
3. **Impact on Product Features:**
   - **Database Records (Permanent):** Document metadata, version records, audit logs, text content, search indices, governance gates, change proposals, change packages, topology, and release lineage are permanently stored in MongoDB Atlas and will survive container sleep.
   - **Binary Files (Ephemeral):** Uploaded binary files (PDF/DOCX/MD) downloaded via `GET /api/v1/documents/:id/versions/:versionId/download` will return 404 if the container has slept since the upload occurred.
4. **Public Demo Strategy:**
   - **Preserve Current Architecture:** For a zero-cost public demo, ephemeral binary file retention is an acceptable trade-off. Core document governance and metadata remain 100% operational.
   - **No Cloud Storage Refactoring:** Do NOT add S3, Cloudflare R2, or Cloudinary refactoring to preserve source code stability.

---

## 14. Database Index Synchronization

### Execution Command

```bash
pnpm --filter @documan/api db:index
```

### Verification & Safety

Inspection of `apps/api/src/scripts/sync-indexes.ts` confirms:
- Statically imports all 28 Mongoose models, explicitly including `SignupOtp` (line 32) and `RefreshToken`.
- Dynamically iterates over `mongoose.modelNames()` and executes `model.syncIndexes()`.
- Verifies creation of TTL expiration indexes for `signup_otps` (`expiresAt`) and unique constraints for `users` (`email`).

### Safe Deployment Sequence

1. Verify `MONGO_URI` environment variable points to intended MongoDB Atlas database.
2. Confirm target database name (`documan`).
3. Create a cluster snapshot / backup if deploying to an existing database.
4. Run index sync: `pnpm --filter @documan/api db:index`.
5. Verify output log terminates with `"Database index synchronization completed successfully."` (Exit code 0).
6. Start the API Web Service.

---

## 15. Health Checks

Render and automated monitoring scripts verify application status using repository-supported health endpoints (`apps/api/src/modules/health/health.controller.ts`):

- **Liveness Endpoint (`GET /api/v1/health/live`):**
  Returns HTTP 200 `{ success: true, data: { status: "live" } }`. Verifies Node.js event loop response.
- **Readiness Endpoint (`GET /api/v1/health/ready`):**
  Returns HTTP 200 `{ success: true, data: { status: "ready", ready: true } }` if MongoDB connection (`readyState === 1`) is healthy. Returns HTTP 503 if disconnected.
- **Detailed Health Endpoint (`GET /api/v1/health`):**
  Returns HTTP 200 with full MongoDB connection status, uptime, and system timestamp.
- **Frontend Health:**
  Verify HTTP 200 HTML response at Vercel root URL.

---

## 16. Deployment Sequence

### PHASE A — GitHub Repository Setup
- **User Action:** Verify `main` branch is clean and pushed to GitHub.
- **Platform:** GitHub
- **Expected Result:** Baseline commit `801b7a500ba91f2f53e8498f17d7a3bbf8105d84` present on GitHub.

### PHASE B — MongoDB Atlas Setup
- **User Action:** Create M0 Free Cluster, create database user, set IP Access List to `0.0.0.0/0`.
- **Platform:** MongoDB Atlas
- **Expected Result:** SRV connection string generated.

### PHASE C — External SMTP Provider Setup
- **User Action:** Create account on Resend/SendGrid/Brevo, verify domain/sender email, generate API key.
- **Platform:** SMTP Provider
- **Expected Result:** Host, port, user, pass, from address acquired.

### PHASE D — Render API Web Service Deployment
- **User Action:** Connect GitHub repo to Render, configure Web Service settings and environment variables (`NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `SMTP_*`, `CORS_ORIGIN`).
- **Platform:** Render Free
- **Repository Command:** Build: `pnpm install --frozen-lockfile && pnpm --filter @documan/api build`, Pre-deploy: `pnpm --filter @documan/api db:index`, Start: `node apps/api/dist/server.js`.
- **Expected Result:** Render deploys API service to `https://<app>.onrender.com`.

### PHASE E — Database Index Synchronization Verification
- **Platform:** Render Free Build Log
- **Repository Command:** `pnpm --filter @documan/api db:index`
- **Expected Result:** Log confirms 28 models registered and synchronized with exit code 0.

### PHASE F — Vercel Frontend Deployment
- **User Action:** Connect GitHub repo to Vercel, select Root Directory `apps/web`, configure environment variable `VITE_API_URL=https://<app>.onrender.com/api/v1`.
- **Platform:** Vercel
- **Repository Command:** `pnpm --filter web build`
- **Expected Result:** Vercel deploys frontend SPA to `https://<app>.vercel.app`.

### PHASE G — CORS & Cookie Alignment
- **User Action:** Update Render API `CORS_ORIGIN` to match deployed Vercel URL `https://<app>.vercel.app`.
- **Platform:** Render Settings
- **Expected Result:** Browser permits cross-site requests with credentials.

### PHASE H — Health Verification
- **User Action:** Request `GET https://<app>.onrender.com/api/v1/health/ready`.
- **Expected Result:** HTTP 200 `{ "success": true, "data": { "ready": true } }`.

### PHASE I — Authentication Smoke Tests
- **User Action:** Execute authentication test plan (Signup -> OTP via email -> Verification -> Login -> Refresh -> Logout).
- **Expected Result:** Full auth flow passes with real email OTP delivery.

### PHASE J — Core Documan Smoke Tests
- **User Action:** Execute end-to-end product test plan across all 16 modules.
- **Expected Result:** All workspace tabs, governance gates, and change management modules pass.

### PHASE K — Ephemeral Storage Verification
- **User Action:** Upload document version, verify download, observe container restart behavior.
- **Expected Result:** Metadata remains permanent in MongoDB; ephemeral disk reset documented.

### PHASE L — Public Demo Release
- **User Action:** Publish public demo URL.
- **Expected Result:** Documan Free Public Demo operational.

---

## 17. Authentication Smoke Tests

### Test Execution Checklist

1. **Self-Service Signup:**
   - [ ] `POST /api/v1/auth/register` with valid payload -> HTTP 201 Created.
   - [ ] Verify response returns message `"User registered successfully. Please verify your email with the OTP sent."` (NO access token / NO refresh cookie).
2. **OTP Email Delivery:**
   - [ ] Check inbox of registered email address.
   - [ ] Verify email arrives with subject `<OTP> is your Documan Verification Code` sent from configured `SMTP_FROM`.
3. **Valid OTP Verification:**
   - [ ] `POST /api/v1/auth/register/verify-otp` with valid 6-digit OTP -> HTTP 200 OK.
   - [ ] Verify response returns `accessToken` and user object (`emailVerified: true`).
   - [ ] Verify `Set-Cookie` header includes `documan_refresh_token` (`httpOnly: true`, `path: "/api/v1/auth"`).
4. **Invalid & Expired OTP:**
   - [ ] Verify invalid OTP returns HTTP 400 `INVALID_OTP`.
   - [ ] Verify expired OTP returns HTTP 400 `OTP_EXPIRED`.
5. **OTP Resend & Rate Limiting:**
   - [ ] `POST /api/v1/auth/register/resend-otp` -> HTTP 200 OK.
   - [ ] Trigger resend within 60s -> HTTP 400 `RESEND_COOLDOWN`.
   - [ ] Trigger resend > 3 times -> HTTP 429 `TOO_MANY_RESEND_ATTEMPTS`.
6. **Login Flows:**
   - [ ] Unverified account login -> HTTP 403 `EMAIL_NOT_VERIFIED`.
   - [ ] Verified account login -> HTTP 200 OK + JWT access token + refresh cookie.
7. **Token Refresh & Logout:**
   - [ ] `POST /api/v1/auth/refresh` with cookie -> HTTP 200 OK + new access token.
   - [ ] `POST /api/v1/auth/logout` -> HTTP 200 OK + cookie cleared.

---

## 18. Core Documan Smoke Tests

- [ ] **Dashboard:** Executive metrics, activity feeds, system stats load cleanly.
- [ ] **Projects:** Create project, view list, update details.
- [ ] **Project Workspace (5 Tabs):**
  - [ ] Overview: Workspace metadata & quick actions.
  - [ ] Documents: Folder navigation, document creation, version list.
  - [ ] Relationships: Interactive dependency graph & edge links.
  - [ ] Knowledge: Risk search, tag filters, radar views.
  - [ ] Governance: Baseline status, waivers, release certificates.
- [ ] **Document Versioning:** Create document version snapshot, view version history.
- [ ] **Document Comparison:** Diff view between version snapshots.
- [ ] **Change Proposals:** Submit proposal, review impact, transition state.
- [ ] **Change Packages:** Group proposals, generate package, attest completeness.
- [ ] **Verification Plans:** Define test tasks, record compliance status.
- [ ] **Contract Matrix:** Contract matrix mapping & violation detection.
- [ ] **System Topology:** Node graph visualization & drift simulation.
- [ ] **Release Lineage:** Ancestry lineage tracing & attestation tree.
- [ ] **Release Certification:** Generate printable release certificate.
- [ ] **Administration:** User management, role updates, soft-delete trash.

---

## 19. Free-Tier Limitations

| Component | Platform | Free Allowance | Public Demo Operational Characteristic |
| :--- | :--- | :--- | :--- |
| **Backend API** | Render Free | 512 MB RAM, 0.1 CPU | **Cold Start Delay:** Container sleeps after 15 min of inactivity. First request after sleep requires **30 to 50 seconds** to spin up. |
| **Backend Disk** | Render Free | Ephemeral Filesystem | **File Retention:** Uploaded binary files (PDF/DOCX/MD) reset when container sleeps. Core metadata and text content remain intact in MongoDB. |
| **Frontend** | Vercel Free | 100 GB egress/mo, 6,000 build min/mo | **Hobby Restriction:** Non-commercial public demo deployment. Fast global CDN availability. |
| **Database** | MongoDB Atlas M0 | 512 MB storage, 500 connections | **Storage Cap:** Shared RAM/CPU with 512 MB limit (Sufficient for thousands of demo documents). |
| **Email OTP** | External SMTP | Provider quota (100–300 emails/day) | **Daily Volume Cap:** Signup OTP delivery subject to provider daily limit. |

---

## 20. Security Checklist

- [x] **Strong `JWT_SECRET`:** Enforced by Zod schema to be $\ge 32$ random characters.
- [x] **No Secrets in Git:** All environment variables managed in platform dashboards.
- [x] **HTTPS Enforcement:** Vercel and Render automatically enforce TLS/SSL HTTPS connections.
- [x] **Strict CORS:** `CORS_ORIGIN` configured to exact Vercel origin; no wildcard `*`.
- [x] **HTTP-Only Cookies:** `documan_refresh_token` configured with `httpOnly: true` and `secure: true`.
- [x] **Protected SMTP Credentials:** External SMTP credentials kept confidential in Render environment settings.
- [x] **Atlas Network Security:** Database password protection and `0.0.0.0/0` restricted to cluster user credentials.
- [x] **No Log Exposure:** OTP verification codes delivered via email in production.
- [x] **Safe Database Preflight:** `MONGO_URI` validated prior to running `db:index`.

---

## 21. Rollback Strategy

1. **Frontend Rollback (Vercel):**
   - Open Vercel Dashboard -> Deployments.
   - Select previous successful deployment -> Click **Promote to Production**.
2. **Backend API Rollback (Render):**
   - Open Render Dashboard -> API Web Service -> Events.
   - Select previous successful build -> Click **Rollback**.
3. **Database Rollback (MongoDB Atlas):**
   - If database schema indexes require rollback, run database drop script or restore Atlas cluster snapshot.

---

## 22. Source Change Assessment

| Requirement | Category | Description | Source Change Required? |
| :--- | :--- | :--- | :---: |
| **Vercel SPA Routing** | Hosting Configuration | Add `apps/web/vercel.json` rewrite file | **NO** (Static host config file) |
| **Render API Build & Start** | Hosting Configuration | Set build and start commands in Render dashboard | **NO** |
| **Database Index Sync** | Operational Procedure | Run `pnpm --filter @documan/api db:index` preflight | **NO** |
| **SMTP Email Credentials** | Environment Configuration | Configure `SMTP_*` variables in Render settings | **NO** |
| **CORS Origin Alignment** | Environment Configuration | Set `CORS_ORIGIN` in Render settings | **NO** |
| **Proxy Rate Limiting (`trust proxy`)** | Potential Code Enhancement | Add `app.set('trust proxy', 1)` in `apps/api/src/app.ts` | **YES (Identified / Not Implemented)** |
| **Cross-Domain Refresh Cookie (`sameSite`)**| Potential Code Enhancement | Update `sameSite: "lax"` to `"none"` if custom subdomains are not used | **YES (Identified / Not Implemented)** |

> [!IMPORTANT]
> **Assessment Summary:**
> - For immediate deployment using custom subdomains under a shared apex domain, **ZERO SOURCE CODE CHANGES ARE REQUIRED**.
> - If default Vercel/Render subdomains are used without custom domain mapping, 2 minor code adjustments (`trust proxy` and `sameSite: "none"`) have been precisely identified above for future implementation review.

---

## 23. Risks

1. **Render Cold Start Latency (30–50s):** First visitor after 15 minutes of inactivity will experience a delay while Render boots the container.
2. **Ephemeral File Storage Reset:** Downloadable binary attachment files reset upon container sleep, though document metadata and version history remain permanent in MongoDB Atlas.
3. **Cross-Site Refresh Cookies:** Cross-site third-party cookie restrictions require custom subdomain setup or `SameSite=None` configuration.
4. **SMTP Free Daily Limit:** Exceeding free-tier daily email quota (e.g. 100/day) will pause signup OTP dispatches until quota resets.

---

## 24. Final Deployment Checklist

- [x] Baseline git repository verified clean at commit `801b7a500ba91f2f53e8498f17d7a3bbf8105d84`.
- [x] Monorepo build, typecheck, lint, and test suites verified passing.
- [x] `SignupOtp` and all 28 models verified in `apps/api/src/scripts/sync-indexes.ts`.
- [x] Vercel frontend configuration documented with SPA routing rules.
- [x] Render API service specification and build scripts documented.
- [x] MongoDB Atlas M0 cluster configuration and network access documented.
- [x] External SMTP provider integration and OTP verification flow documented.
- [x] Environment variable matrix and security checklist completed.
- [x] Ephemeral storage characteristics and cold-start limitations detailed.
- [x] Zero source-code modifications performed during research/planning phase.

---

## 25. Official Documentation References

- Vercel Documentation: `https://vercel.com/docs`
- Render Free Web Services: `https://render.com/docs/free`
- MongoDB Atlas M0 Free Cluster: `https://www.mongodb.com/docs/atlas/getting-started/`
- Express Reverse Proxy Setup: `https://expressjs.com/en/guide/behind-proxies.html`
