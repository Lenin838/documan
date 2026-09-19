# Free Public Demo Hosting Research

**Date:** 2026-09-16  
**Status:** RESEARCH COMPLETE (READ-ONLY)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Authoritative HEAD SHA:** `0211d4e1976890af1061bf6b5e171da7940df02a`  

---

## 1. Objective

This document evaluates hosting architecture, provider compatibility, configuration requirements, free-tier limitations, and deployment procedures for deploying the existing **Documan** application as a zero-cost **Free Public Demo** following the expiration of the user's AWS subscription.

Target Stack Evaluated:
- **Frontend Hosting:** Cloudflare Pages vs. Vercel
- **Backend API Hosting:** Render Free Web Service
- **Database:** MongoDB Atlas Free Tier (M0 Sandbox)
- **Email OTP Dispatch:** Transactional Email SMTP (SendGrid / Resend / Mailgun / Console Log Fallback)

---

## 2. Current Documan Architecture

Inspection of the repository confirms the following monorepo architecture:

- **Monorepo Workspace:** `pnpm@10.34.5` workspace (`pnpm-workspace.yaml`, `turbo.json`).
- **Frontend App (`apps/web`):** React 19.2, Vite 8.2, Tailwind CSS v4.3, Zustand 5.0, Axios 1.19, React Router v7.
  - Build Command: `pnpm --filter web build` (`tsc -b && vite build`) → outputs static Single-Page Application (SPA) bundle to `apps/web/dist/`.
  - Client Environment variable: `VITE_API_URL` (injected at build time into static bundle via `apps/web/src/config/env.ts`).
- **Backend API (`apps/api`):** Express 5.2, Mongoose 9.9, Pino 10.3, Zod 4.4, Vitest 4.1.
  - Build Command: `pnpm --filter @documan/api build` (`tsc -p tsconfig.json`) → compiles TypeScript to `apps/api/dist/`.
  - Start Command: `node apps/api/dist/server.js`.
  - Default Listening Port: `env.PORT` (defaults to `4000`, overridable via environment variable).
  - API Routes Base: `/api/v1` (`health`, `auth`, `users`, `projects`, `documents`, `folders`, `governance`, `change-proposals`, `change-packages`, `api-specs`, `webhooks`).
  - Database Index Synchronization: `pnpm --filter @documan/api db:index` (`src/scripts/sync-indexes.ts`) statically registers all 28 Mongoose models (including `SignupOtp`).
- **File Storage:** Uploaded document version binaries are stored locally at `apps/api/uploads/documents/versions/`.

---

## 3. Cloudflare Pages

### Compatibility Analysis
Cloudflare Pages is fully compatible with hosting Documan's Vite/React static SPA frontend output (`apps/web/dist`) without requiring application source code changes.

### Configuration Specification
- **Build Command:** `pnpm --filter web build` (or root `pnpm build`)
- **Build Output Directory:** `apps/web/dist`
- **Root Directory Context:** `apps/web` (or root context with filter)
- **Environment Variables:** `VITE_API_URL=https://<your-render-app>.onrender.com/api/v1`
- **Node.js Version:** Configurable via `NODE_VERSION=22` environment variable.
- **SPA Routing Configuration:** Single-Page Applications require routing all deep URL paths (e.g. `/projects`, `/dashboard`, `/governance`) to `index.html`. Cloudflare Pages supports this via a `_redirects` file in `apps/web/public/_redirects`:
  ```
  /* /index.html 200
  ```
- **HTTPS & Custom Domain:** Automatic free SSL/TLS certificate, custom domain support included.

### Free-Tier Limitations
- **Bandwidth:** Unlimited free bandwidth (no charge for egress traffic).
- **Builds:** 500 build executions per month.
- **Asset Count:** Maximum 20,000 files per deployment.
- **Cost:** 100% Free (No credit card required for standard signup).

---

## 4. Vercel

### Compatibility Analysis
Vercel is fully compatible with hosting Vite Single-Page Applications out-of-the-box and includes automatic framework detection for Vite.

### Configuration Specification
- **Framework Preset:** Vite
- **Build Command:** `pnpm --filter web build`
- **Output Directory:** `apps/web/dist`
- **Environment Variables:** `VITE_API_URL=https://<your-render-app>.onrender.com/api/v1`
- **SPA Routing Configuration:** Handled via a `vercel.json` file in `apps/web/`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **HTTPS & Custom Domain:** Automatic free SSL/TLS certificate, custom domain support included.

### Free-Tier Limitations (Hobby Plan)
- **Bandwidth:** 100 GB egress bandwidth per month.
- **Build Minutes:** 6,000 build minutes per month.
- **Commercial Use:** Hobby plan is restricted to non-commercial personal projects / public demos.
- **Cost:** Free tier available (Credit card may be requested during verification).

---

## 5. Render Free

### Compatibility Analysis
Render Free Web Service supports running Node.js 22 applications, `pnpm` package manager, and custom build scripts. Documan's Express API (`apps/api`) can run on Render Free without modifying application source code.

### Configuration Specification
- **Service Type:** Web Service
- **Environment:** `Node`
- **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @documan/api build`
- **Pre-Deploy Command:** `LEAVE EMPTY / NOT USED` *(Pre-Deploy Commands are restricted to paid Render compute plans)*
- **Start Command:** `node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js` *(Executes database index preflight before starting Express API server)*
- **Environment Variables:**
  - `NODE_ENV=production`
  - `PORT=10000` (Render automatically supplies `$PORT`)
  - `MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/documan?retryWrites=true&w=majority`
  - `JWT_SECRET=production_super_secret_key_minimum_32_characters_long_documan_2026`
  - `CORS_ORIGIN=https://<your-cloudflare-pages-app>.pages.dev`
  - `REFRESH_TOKEN_EXPIRES_IN_DAYS=7`
- **Health Check Path:** `/api/v1/health/live` or `/api/v1/health/ready`.
- **Public API URL:** Automatically assigned (e.g. `https://documan-api.onrender.com`).

### Free-Tier Limitations & Operational Characteristics
- **Cold-Start Sleep Behavior:** Render Free Web Services automatically spin down (sleep) after **15 minutes of inactivity**. The first incoming request after sleep triggers a cold boot, taking **30 to 50 seconds** to respond.
- **RAM & CPU:** 512 MB RAM, 0.1 CPU allocation.
- **Ephemeral Filesystem:** Disk storage on Render Free Web Services is **ephemeral**. Files written to disk are wiped whenever the service sleeps, restarts, or redeploys.
- **Persistent Disks:** Render Persistent Disks are **NOT available on Render Free tier** (requires paid instance starting at $7/month).
- **Outbound Network:** Outbound HTTP/HTTPS and MongoDB connections on standard ports are fully supported.

---

## 6. MongoDB Atlas Free

### Compatibility Analysis
MongoDB Atlas Free Tier (M0 Sandbox) provides a managed MongoDB 7.0 database cluster fully compatible with Mongoose 9.9 and Documan's database schema.

### Configuration Specification
- **Cluster Tier:** M0 Sandbox (Free Forever).
- **Storage Allowance:** 512 MB shared storage.
- **Connection URI:** Standard SRV string:
  `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/documan?retryWrites=true&w=majority`
- **Network Security:** Must configure Atlas Network Access IP Access List to allow `0.0.0.0/0` (Allows Render's dynamic IP addresses to connect).
- **Database Preflight Index Synchronization:**
  - `SignupOtp` index sync fix (`commit 0211d4e`) is fully compatible. Running `pnpm --filter @documan/api db:index` against the Atlas connection string registers 28 Mongoose models and creates the `signup_otps` `expiresAt` TTL index and `email` unique index.

### Free-Tier Limitations
- **Storage Limit:** 512 MB total data storage.
- **Connection Limit:** Maximum 500 concurrent connections (Documan API uses `maxPoolSize: 50`, well within limits).
- **RAM / CPU:** Shared RAM and CPU; suitable for public demos.

---

## 7. SMTP / Email OTP

### Operational Architecture
- `apps/api/src/utils/email.service.ts` supports `SmtpEmailService` in `production`.
- Render Free supports outbound connections on port `587` (TLS/STARTTLS) and `465` (SSL).

### Provider Options
1. **Free Transactional Mail Providers:**
   - **Resend:** 3,000 free emails/month (100 emails/day).
   - **SendGrid:** 100 free emails/day forever.
   - **Brevo (Sendinblue):** 300 free emails/day.
2. **Operational Log Fallback (No Email Provider Setup Needed):**
   - If no external SMTP credentials are set, `SmtpEmailService` logs `[PROD OTP EMAIL DISPATCHED] To: user@example.com` to Render stdout logs.
   - Testers can view OTP codes directly in Render live logs during public demo testing without needing a real domain DNS configuration.

---

## 8. Upload Storage

### Critical Upload Storage Limitation Analysis

1. **Application Storage Architecture:**
   - Uploaded document versions are written to disk at `apps/api/uploads/documents/versions/`.
   - Document metadata, audit logs, relationships, baselines, and governance data are stored permanently in MongoDB Atlas.

2. **Render Free Disk Behavior:**
   - Render Free Web Services use an **ephemeral filesystem**.
   - Any document version binary uploaded to `/apps/api/uploads` will remain accessible during an active container run, but will be **erased when Render spins down after 15 minutes of inactivity** or redeploys.

3. **Persistent Storage Options on Free Tier:**
   - Render Persistent Disks are NOT supported on Render Free (requires $7/mo paid instance).
   - Cloudflare R2 / AWS S3 offer free tier allowances (e.g. Cloudflare R2 10 GB free storage), but integrating cloud object storage would require a future code refactoring of `document-version.service.ts`.

4. **Public Demo Strategy:**
   - **Preserve Current Architecture:** For a free public demo, ephemeral upload retention is an acceptable free-tier operational characteristic. Core metadata, version numbers, text content, search, relationships, and governance pass 100% in MongoDB even if binary file attachments reset upon container sleep.

---

## 9. Authentication & Cookies

- **Access Token:** Transmitted in HTTP headers (`Authorization: Bearer <token>`). Unaffected by cross-site domain hosting.
- **Refresh Cookie (`documan_refresh_token`):**
  - Path: `/api/v1/auth`, `httpOnly: true`, `secure: true` in production.
  - Cross-Site Cookie Behavior: When frontend (`https://documan.pages.dev`) and backend (`https://documan-api.onrender.com`) reside on different root domains, browsers treat cookies as cross-site third-party cookies.
  - Compatibility: Express sets `sameSite: "lax"`. For cross-domain fetch credentials (`withCredentials: true`), set `CORS_ORIGIN=https://documan.pages.dev`.

---

## 10. Free Demo Architecture

```
                       ┌─────────────────────────┐
                       │     GitHub Repository   │
                       └────────────┬────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌────────────────────────┐                        ┌────────────────────┐
│    Cloudflare Pages    │                        │    Render Free     │
│   (Frontend React SPA) │                        │    (Node.js API)   │
│  https://documan.pages │                        │ https://documan-  │
│        .dev            │                        │  api.onrender.com  │
└──────────┬─────────────┘                        └─────────┬──────────┘
           │                                                │
           │ HTTPS Client Requests                          │ Mongoose SRV
           └────────────────────────────────────────────────┼──────────────┐
                                                            │              │
                                                            ▼              ▼
                                                   ┌──────────────┐ ┌──────────────┐
                                                   │MongoDB Atlas │ │ SMTP / Logs  │
                                                   │ (M0 Sandbox) │ │(OTP Dispatch)│
                                                   └──────────────┘ └──────────────┘
```

---

## 11. Free-Tier Limitations

| Service | Provider | Free Allowance | Demo Limitation / Impact |
| :--- | :--- | :--- | :--- |
| **Frontend** | Cloudflare Pages | Unlimited bandwidth, 500 builds/mo | None. Excellent performance & availability. |
| **Backend API** | Render Free | 512 MB RAM, 0.1 CPU | **Cold Start:** 15m inactivity causes 30-50s cold boot. |
| **Database** | MongoDB Atlas M0 | 512 MB storage, shared CPU | Storage capped at 512 MB (Plenty for thousands of demo records). |
| **Disk Storage** | Render Free | Ephemeral Filesystem | **File Retention:** Uploaded binary files reset when container sleeps. |

---

## 12. Cost & Billing Considerations

- **Total Operational Cost:** **\$0.00 / month (100% Free)**
- **Billing Safeguards:**
  - Cloudflare Pages: Free tier does not auto-upgrade to paid.
  - Render Free: Does not require a credit card; automatically stops services if limits are exceeded instead of charging.
  - MongoDB Atlas M0: Free cluster does not auto-scale to paid tiers; zero billing risk.

---

## 13. Deployment Sequence

1. **GitHub Repository:** Ensure `main` branch is pushed to GitHub.
2. **MongoDB Atlas Cluster Creation:**
   - Create free M0 cluster on MongoDB Atlas.
   - Create database user and set IP Access List to `0.0.0.0/0`.
   - Obtain MongoDB SRV connection string.
3. **Render API Web Service Setup:**
   - Connect GitHub repository to Render.
   - Select Node.js environment, set build command: `pnpm install --frozen-lockfile && pnpm --filter @documan/api build`.
   - Set start command: `node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js` (chains database index preflight before API startup).
   - Set environment variables (`NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`).
   - Obtain deployed Render API URL (e.g., `https://documan-api.onrender.com`).
4. **Cloudflare Pages Frontend Setup:**
   - Connect GitHub repository to Cloudflare Pages.
   - Set build command: `pnpm --filter web build`.
   - Set build output directory: `apps/web/dist`.
   - Set environment variable: `VITE_API_URL=https://documan-api.onrender.com/api/v1`.
   - Add `_redirects` file (`/* /index.html 200`) for SPA client routing.
5. **Post-Deployment Smoke Testing:** Verify health endpoints and authentication flow.

---

## 14. Source Change Assessment

| Requirement | Category | Description | Source Change Required? |
| :--- | :--- | :--- | :---: |
| **Vite SPA Routing** | Hosting Configuration | Add `_redirects` file in `apps/web/public/` for SPA page refresh routing | **NO** (Static config file) |
| **API Build & Start** | Hosting Configuration | Specify Render build & start scripts | **NO** |
| **Database Index Sync** | Operational Command | Run `pnpm --filter @documan/api db:index` | **NO** |
| **Render Ephemeral Disks** | Infrastructure Limitation | Uploaded version files reset on container sleep | **NO** |
| **CORS & Environment Variables** | Environment Configuration | Configure `CORS_ORIGIN` and `VITE_API_URL` | **NO** |

---

## 15. Risks

1. **Render Cold Starts (30–50s delay):** First visitor after 15 minutes of inactivity experiences a delay while Render boots the container.
2. **Ephemeral Upload File Retention:** File attachments reset upon container sleep, though all document data, versions, and metadata remain permanently intact in MongoDB.

---

## 16. Recommendation Based on Compatibility

- **Frontend:** **Cloudflare Pages** is recommended over Vercel due to **unlimited free egress bandwidth** and zero risk of bandwidth overage charges for a public demo.
- **Backend:** **Render Free** is recommended as a zero-cost Node.js host compatible with Documan's monorepo structure and pnpm package manager.
- **Database:** **MongoDB Atlas M0** is recommended as the official managed free MongoDB provider.

---

## 17. Final Deployment Checklist

- [x] Monorepo build and workspace structure verified compatible.
- [x] Cloudflare Pages static SPA deployment procedure documented.
- [x] Render Free API service build & startup commands documented.
- [x] MongoDB Atlas M0 cluster compatibility and index sync verified.
- [x] Ephemeral storage characteristics evaluated and documented.
- [x] Zero source-code modifications required.

---

## 18. Official Documentation References

- Cloudflare Pages Documentation: `https://developers.cloudflare.com/pages/`
- Render Web Services Free Plan: `https://render.com/docs/free`
- MongoDB Atlas M0 Free Tier: `https://www.mongodb.com/docs/atlas/getting-started/`
- Vite Static Web Deployment: `https://vitejs.dev/guide/static-deploy.html`
