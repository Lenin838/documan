# Documan API Service (@documan/api)

## 1. Overview & Purpose

The **Documan API** is a stateless, production-grade REST API backend that powers the Documan Enterprise Document Governance & Release Management platform. It handles authentication, self-service email OTP verification, user authorization, document versioning, system contract matrices, governance gates, change management, and printable release certificates.

### Technology Stack

- **Runtime:** Node.js 22.x
- **Framework:** Express 5.2.1
- **Database ODM:** Mongoose 9.9.2 (MongoDB 7.0)
- **Validation:** Zod 4.4.3
- **Logging:** Pino 10.3.1 (`pino-http`)
- **Testing:** Vitest 4.1.11 & Supertest 7.2.2
- **Email Transport:** Nodemailer 10.0.10 (`SmtpEmailService`)
- **Security:** Helmet 8.3.0, CORS 2.8.6, bcrypt 6.0.0, jsonwebtoken 9.0.3, express-rate-limit 8.6.2

---

## 2. Quick Start & Development Commands

All commands can be executed from the repository root using `pnpm --filter @documan/api <command>` or directly inside `apps/api/`:

```bash
# Start local development API server with hot-reload (tsx/esm)
pnpm --filter @documan/api dev

# Execute TypeScript type checking
pnpm --filter @documan/api typecheck

# Execute ESLint check
pnpm --filter @documan/api lint

# Run the Vitest unit and integration test suite
pnpm --filter @documan/api test

# Compile TypeScript to production output (dist/)
pnpm --filter @documan/api build

# Start production compiled server
pnpm --filter @documan/api start
```

---

## 3. Environment Variables Reference

Environment variables are parsed and strictly validated at startup using Zod in [`src/config/env.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/config/env.ts).

| Variable Name | Required? | Purpose & Description | Default / Example Value |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | Sets environment execution mode (`development`, `test`, `production`). | `development` |
| `PORT` | Yes | HTTP listening port for the API server. Render injects `$PORT`. | `4000` |
| `MONGO_URI` | Yes | MongoDB connection string (local or MongoDB Atlas SRV). | `mongodb://localhost:27017/documan` |
| `JWT_SECRET` | Yes | Mandatory secret key for signing JWT access tokens (Minimum 32 characters). | `your_secure_32_character_jwt_secret` |
| `JWT_EXPIRES_IN` | No | Access token validity duration. | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No | Refresh token HTTP-Only cookie TTL in days. | `7` |
| `CORS_ORIGIN` | Yes | Allowed origin for frontend requests with credentials. | `http://localhost:5173` |
| `LOG_LEVEL` | No | Pino logger verbosity (`fatal`, `error`, `warn`, `info`, `debug`). | `info` |
| `SMTP_HOST` | Yes (Prod) | External SMTP provider host for email OTP delivery. | `smtp.resend.com` |
| `SMTP_PORT` | Yes (Prod) | External SMTP port (`587` for STARTTLS, `465` for SSL). | `587` |
| `SMTP_USER` | Yes (Prod) | SMTP authentication username / account key. | `resend` |
| `SMTP_PASS` | Yes (Prod) | SMTP authentication password / API key. | `re_123456789_secret` |
| `SMTP_FROM` | No | Sender email header string. | `"Documan Security" <no-reply@documan.app>` |
| `SMTP_SECURE` | No | TLS flag for SMTP connection (`true` for 465, `false` for 587). | `false` |

> [!CAUTION]
> **Security Note:** Never commit `.env` files or real credentials to Git. `JWT_SECRET` must be at least 32 characters long or Zod validation will throw a startup error.

---

## 4. Database Index Preflight Synchronization

To build MongoDB indexes safely without blocking application startup (`autoIndex: false` in production), run the static index synchronization preflight script before launching the API:

```bash
pnpm --filter @documan/api db:index
```

### Script Mechanism ([`src/scripts/sync-indexes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/scripts/sync-indexes.ts))
1. Establishes database connection using `MONGO_URI`.
2. Statically imports and registers all 28 Mongoose models, explicitly including `SignupOtp` and `RefreshToken`.
3. Iterates through `mongoose.modelNames()` and executes `model.syncIndexes()`.
4. Creates TTL expiration indexes (`signup_otps.expiresAt`) and unique constraints (`users.email`).

---

## 5. Health Check Endpoints

The API provides three standardized health check routes ([`src/modules/health/health.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/health/health.controller.ts)):

- **`GET /api/v1/health`** — Full health report including system uptime, timestamp, and MongoDB connection status.
- **`GET /api/v1/health/live`** — Liveness probe (HTTP 200 `{ "success": true, "data": { "status": "live" } }`).
- **`GET /api/v1/health/ready`** — Readiness probe. Returns HTTP 200 if MongoDB connection (`readyState === 1`) is active; returns HTTP 503 if disconnected.

---

## 6. Architecture & Module Organization

All domain logic resides in `apps/api/src/modules/` divided into 14 distinct feature modules:

- **`auth/`** — Registration, email OTP dispatch, verification, login, JWT token generation, refresh tokens, cookie handling, and logout handlers.
- **`users/`** — User management, profile retrieval, role updates, and soft-delete trash features.
- **`documents/`** — Document metadata, version snapshots, file downloads, impact cascade analysis, and knowledge risk calculations.
- **`folders/`** — Document tree folder hierarchy and navigation.
- **`projects/`** — Project management and topology graph definitions.
- **`governance/`** — Documentation baselines, waivers, verification plans, system release certificates, and gate compliance checks.
- **`change-proposals/`** — System change proposal lifecycle and review workflows.
- **`change-packages/`** — Release package bundling and attestation verification.
- **`api-specs/`** — OpenAPI/AsyncAPI specification tracking and drift analysis.
- **`webhooks/`** — Webhook registrations, secret signing, SSRF protection, and delivery queues.
- **`knowledge/`** — Knowledge risk radar search and evidence scoring.
- **`notifications/`** — User in-app notifications and alerts.
- **`document-shares/`** — Document sharing controls and link permissions.
- **`health/`** — System liveness and database readiness probes.

---

## 7. Authentication, SMTP & Refresh Cookie Details

1. **Self-Service Registration:** `POST /api/v1/auth/register` creates an unverified account (`emailVerified: false`) and generates a 6-digit OTP code.
2. **Email OTP Dispatch:** `SmtpEmailService` ([`src/utils/email.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/utils/email.service.ts)) dispatches the 6-digit verification code via Nodemailer when `SMTP_HOST` is configured.
3. **OTP Verification:** `POST /api/v1/auth/register/verify-otp` validates the OTP, marks `emailVerified: true`, and returns a JWT access token and HTTP-Only refresh cookie.
4. **Cross-Site Cookie Behavior:**
   - Cookie Name: `documan_refresh_token`
   - Attributes: `httpOnly: true`, `secure: env.NODE_ENV === 'production'`, `sameSite: "none"`, `path: "/api/v1/auth"`.
   - `SameSite=None` allows modern browsers to send refresh cookies across distinct public domain suffixes (e.g. Vercel frontend `*.vercel.app` → Render API `*.onrender.com`).
5. **Reverse Proxy Rate Limiting:** Express proxy trust is set via `app.set('trust proxy', 1)` in [`src/app.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/app.ts) to ensure rate limiters correctly evaluate client IP addresses behind Render load balancers.

---

## 8. Upload File Storage Considerations

- **Storage Location:** Document version snapshot files are saved to disk at `apps/api/uploads/documents/versions/` ([`src/modules/documents/document-version.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-version.service.ts)).
- **Ephemeral Filesystem on Render Free:** Render Free Web Services use ephemeral disks. Files written to disk are wiped when the container spins down after 15 minutes of inactivity or redeploys.
- **Metadata Persistence:** All document metadata, version history, text content, search indices, audit logs, and governance attestations are stored permanently in MongoDB Atlas and will survive container sleep.

---

## 9. References to Canonical Documentation

- [Free Public Demo Deployment Implementation Plan](../../docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md)
- [Production Deployment Runbook](../../docs/reports/POST-COMPLETION-PRODUCTION-DEPLOYMENT-RUNBOOK.md)
- [Production Environment Deployment Preflight Audit](../../docs/research/POST-COMPLETION-PRODUCTION-ENVIRONMENT-DEPLOYMENT-PREFLIGHT-AUDIT.md)
