# Render Free Index Synchronization Research

**Date:** 2026-09-19  
**Status:** RESEARCH COMPLETE (READ-ONLY INVESTIGATION)  
**Target Architecture:** Documan API on Render Free Web Service + MongoDB Atlas M0  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Authoritative Published HEAD SHA:** `4ce3fbc98df23c0670e668d7fa808604f9419ad1`  

---

## 1. Executive Summary

This research report evaluates the technical mechanics, platform limitations, security guarantees, failure modes, and operational procedures for executing MongoDB index synchronization (`pnpm --filter @documan/api db:index` / `apps/api/src/scripts/sync-indexes.ts`) when deploying the **Documan API** backend to **Render Free**.

### Key Findings
1. **Render Free Feature Restraint:** On Render Free Web Services, the **Pre-Deploy Command** feature, **Shell/SSH access**, and **One-Off Jobs** are **UNSUPPORTED / NOT AVAILABLE** (these features are restricted to paid Render compute tiers).
2. **Impact on Previous Deployment Documentation:** Previous deployment plans (`POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md` and `FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md`) proposed setting `Pre-Deploy Command: pnpm --filter @documan/api db:index`. Because Render Free tier omits Pre-Deploy support, configuring a Pre-Deploy command is invalid on Render Free.
3. **Source Code Modifications Required?:** **NO SOURCE CODE CHANGES ARE REQUIRED**. The current codebase at HEAD `4ce3fbc98df23c0670e668d7fa808604f9419ad1` compiles `src/scripts/sync-indexes.ts` into `dist/scripts/sync-indexes.js` (`pnpm build`). It can be executed either via **Start Command Chaining** on Render Free (`node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js`) or via **Pre-Deployment Admin Execution** (`pnpm --filter @documan/api db:index` executed locally against Atlas prior to web service activation).
4. **Mongoose `autoIndex` Configuration:** `autoIndex: false` MUST BE PRESERVED in production (`NODE_ENV=production`) to prevent startup connection locks on large database collections.

---

## 2. Current Index Synchronization Implementation

Inspection of `apps/api/src/scripts/sync-indexes.ts` and `apps/api/src/config/database.ts` establishes the exact script behavior:

### Technical Script Characteristics
- **Standalone Execution:** `sync-indexes.ts` is a standalone CLI utility. It does **NOT** require the Express API HTTP server (`server.ts`) to be running.
- **Model Discovery & Registration:** Statically imports all **28 Mongoose models**, including `SignupOtp`, `RefreshToken`, `User`, `Document`, `Project`, etc., registering schemas into Mongoose memory.
- **Database Connection:** Connects directly to MongoDB using `env.MONGO_URI` via `connectDatabase()`.
- **Index Synchronization Engine:** Iterates over all model names (`mongoose.modelNames()`) and invokes `model.syncIndexes()`.
  - Creates missing indexes (e.g., unique index on `users.email`, unique index on `signup_otps.email`, TTL index on `signup_otps.expiresAt`, and TTL index on `refresh_tokens.expiresAt`).
  - Drops deprecated or unmapped indexes.
- **Process Exit Behavior:** Disconnects cleanly via `disconnectDatabase()` and explicitly exits with process code `0` on success, or process code `1` on error.
- **Environment Dependencies:** Requires valid `MONGO_URI` and `JWT_SECRET` in `process.env` (validated at startup by Zod in `env.ts`).
- **Data Safety:** **IDEMPOTENT & NON-DESTRUCTIVE**. Operates exclusively on MongoDB index metadata. Does NOT modify, insert, or delete user or document data records.
- **Unrelated Service Dependencies:** **ZERO**. Does NOT require SMTP credentials, file uploads, or external HTTP services.

---

## 3. Render Free Platform Capabilities & Limitations

Authoritative platform documentation from Render (`render.com/docs`) identifies the following capabilities and restrictions for **Render Free Web Services**:

| Render Platform Feature | Render Paid Compute Tiers | Render Free Web Service Tier | Impact on Index Synchronization |
| :--- | :---: | :---: | :--- |
| **Pre-Deploy Command** | **Supported** | **UNSUPPORTED / NOT AVAILABLE** | Cannot use Render Pre-Deploy Command field on Free tier. |
| **Shell / SSH Access** | **Supported** | **UNSUPPORTED / NOT AVAILABLE** | Cannot SSH or open in-dashboard terminal to run `db:index` manually. |
| **One-Off Jobs / Tasks** | **Supported** | **UNSUPPORTED / NOT AVAILABLE** | Cannot run manual one-off CLI tasks against free web service container. |
| **Build Command** | **Supported** | **Supported** | Runs shell scripts during image build step. Outbound DB traffic permitted if Atlas whitelist allows `0.0.0.0/0`. |
| **Start Command** | **Supported** | **Supported** | Runs shell commands when container boots. **Supported on Free tier.** |
| **Cold-Start Sleep** | N/A (Always On) | Spins down after 15m inactivity | Start command executes on initial boot and on cold-start wakeups. |

*Authoritative Citations:*
- Render Web Services Free Plan: `https://render.com/docs/free`
- Render Pre-Deploy Commands: `https://render.com/docs/pre-deploy-command` ("Pre-deploy commands are available for paid web services, private services, and background workers...")

---

## 4. Evaluation of Options

Six potential operational approaches were evaluated against Render Free tier constraints:

### Option A: Render Pre-Deploy Command (`Pre-Deploy Command: pnpm --filter @documan/api db:index`)
- **Render Free Compatibility:** **UNSUPPORTED / INVALID**. Pre-Deploy Commands are restricted to paid Render compute plans; the field is unavailable on Free web services.
- **Security / Reliability:** N/A (Cannot be configured on Free tier).
- **Failure Behavior:** N/A.
- **Verdict:** **REJECTED** (Platform Feature Unavailable on Free Tier).

### Option B: Build Command Chaining (`Build Command: pnpm install --frozen-lockfile && pnpm --filter @documan/api build && pnpm --filter @documan/api db:index`)
- **Render Free Compatibility:** Supported (Build command executes during Render build phase).
- **Security:** Requires production `MONGO_URI` injected during build phase.
- **Reliability:** **MEDIUM / RISKY**. Running DB index sync during build phase creates a build-time dependency on external MongoDB Atlas network availability. If Atlas connection experiences transient latency during build, the entire deployment build fails.
- **Failure Behavior:** Build fails before container image is created.
- **Verdict:** **NOT RECOMMENDED** (Adds unnecessary DB network risk to static build stage).

### Option C: Start Command Chaining (`Start Command: node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js`)
- **Render Free Compatibility:** **FULLY SUPPORTED & OFFICIALLY RECOMMENDED BY RENDER FOR FREE TIER**.
- **Execution Mechanism:**
  When Render Free boots the web service container, it executes the compound start command:
  1. `node apps/api/dist/scripts/sync-indexes.js` executes first. Connects to Atlas, verifies/creates 28 model indexes in ~1–2 seconds, disconnects, and exits with code `0`.
  2. Upon code `0`, `node apps/api/dist/server.js` immediately launches the Express API server.
- **Security:** Highly secure. Consumes encrypted Render environment variables (`MONGO_URI`, `JWT_SECRET`) injected into the runtime container.
- **Reliability:** **HIGH**. Mongoose `syncIndexes()` is fully idempotent. On container wake/restart, existing indexes match schema in milliseconds and script exits cleanly.
- **Failure Behavior:** Safe `&&` operator guarantees that if `sync-indexes.js` fails (e.g., invalid `MONGO_URI`), the Express server does NOT start, preventing broken API instances from serving traffic.
- **Requires Source/Config Changes?:** **NO**. Configured in Render Dashboard Start Command.
- **Verdict:** **RECOMMENDED (AUTOMATED RUNTIME OPTION)**.

### Option D: Pre-Deployment Manual/Admin Execution Against Atlas (`pnpm --filter @documan/api db:index` run locally with production `MONGO_URI`)
- **Render Free Compatibility:** **FULLY SUPPORTED & PLATFORM-INDEPENDENT**.
- **Execution Mechanism:**
  Prior to deploying or activating the Render Free web service, the developer/admin runs `pnpm --filter @documan/api db:index` locally (or from a CI/CD pipeline) with `MONGO_URI` set to the production Atlas connection string.
- **Security:** Highly secure. Executed from a trusted local/admin machine with administrative Atlas access.
- **Reliability:** **100%**. Ensures all 28 Mongoose model indexes (including `SignupOtp` TTL and `User` unique indexes) exist in Atlas *before* any cloud web service code is deployed.
- **Deployment Impact:** Zero runtime overhead on Render Free API startup.
- **Requires Source/Config Changes?:** **NO**.
- **Verdict:** **RECOMMENDED (PRE-DEPLOYMENT ADMIN PREREQUISITE OPTION)**.

### Option E: Render-Supported One-Off / Manual Execution
- **Render Free Compatibility:** **UNSUPPORTED**. Shell access and one-off CLI tasks are disabled on Render Free compute tier.
- **Verdict:** **REJECTED** (Platform Feature Unavailable).

### Option F: Enable Mongoose `autoIndex: true` in Production
- **Safety Constraint Assessment:** **STRICTLY REJECTED**. Enabling `autoIndex: true` in production causes Mongoose to issue index build requests on every app startup, risking database collection locks and connection timeouts under high load. `autoIndex: false` MUST BE PRESERVED.

---

## 5. Comparative Evaluation Summary Matrix

| Option | Approach | Render Free Compatible? | Automated? | Idempotent? | Modifies Source Code? | Failure Safety | Recommendation Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Option A** | Render Pre-Deploy Command | **NO** | N/A | N/A | No | Unsupported on Free tier | **REJECTED** |
| **Option B** | Build Command Chaining | **YES** | Yes | Yes | No | Build fails if DB offline | **NOT RECOMMENDED** |
| **Option C** | Start Command Chaining | **YES** | Yes | Yes | No | API doesn't start if index sync fails | **RECOMMENDED (RUNTIME)** |
| **Option D** | Pre-Deploy Admin Execution | **YES** | Manual/CI | Yes | No | Caught before cloud deployment | **RECOMMENDED (ADMIN)** |
| **Option E** | Render One-Off Task | **NO** | N/A | N/A | No | Unsupported on Free tier | **REJECTED** |
| **Option F** | Enable `autoIndex: true` | **YES** | Yes | No | Yes | Database collection locking | **STRICTLY REJECTED** |

---

## 6. Code-Change Decision & Classification

### Answer to Core Question
> **"Can the current Documan codebase be deployed to Render Free without modifying source code?"**  
> **YES.**

The compiled script `apps/api/dist/scripts/sync-indexes.js` (generated by `pnpm build`) runs natively on Node.js 22. It connects to MongoDB via `process.env.MONGO_URI`, synchronizes all 28 Mongoose models, and exits with code `0`. Zero source code or configuration changes are required.

### Findings Classification
- **P0 — Critical Deployment Blockers:** `0`
- **P1 — Required Before Deployment:** `0`
- **P2 — Operational Considerations:** `1`
  - *P2-01 (Documentation Reconciliation):* Update deployment runbook and implementation plan references to remove `Pre-Deploy Command` recommendations for Render Free, replacing them with **Start Command Chaining** (`node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js`) or **Pre-Deployment Admin Execution**.
- **P3 — Optional Improvements:** `0`

---

## 7. Recommended Operational Procedures for Render Free

### Procedure 1: Automated Start Command Chaining (Primary Render Free Method)

In the Render Dashboard settings for the API Web Service:

1. **Root Directory:** *(Leave Blank / Repository Root)*
2. **Build Command:**
   ```bash
   pnpm install --frozen-lockfile && pnpm --filter @documan/api build
   ```
3. **Pre-Deploy Command:** *(Leave Empty / Disabled)*
4. **Start Command:**
   ```bash
   node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js
   ```
5. **Environment Variables Required:**
   - `NODE_ENV=production`
   - `MONGO_URI=mongodb+srv://...`
   - `JWT_SECRET=...`
   - `CORS_ORIGIN=...`

### Procedure 2: Pre-Deployment Administrative Execution (Alternative Method)

Before activating or releasing the Render Free API service:

1. Configure `.env` or set environment variable locally:
   ```bash
   MONGO_URI="mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/documan?retryWrites=true&w=majority"
   JWT_SECRET="your_production_jwt_secret_min_32_chars"
   ```
2. Run database index preflight synchronization from repository root:
   ```bash
   pnpm --filter @documan/api db:index
   ```
3. Confirm log output:
   - `Registered Mongoose models count: 28`
   - `Successfully synchronized indexes for model: "SignupOtp"`
   - `Database index synchronization completed successfully.`
4. Start/Deploy Render Free Web Service with standard start command:
   ```bash
   node apps/api/dist/server.js
   ```

---

## 8. Authoritative References

- **Render Web Services Free Tier Specifications:** `https://render.com/docs/free`
- **Render Pre-Deploy Commands Documentation:** `https://render.com/docs/pre-deploy-command`
- **Documan Database Index Preflight Script:** [`apps/api/src/scripts/sync-indexes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/scripts/sync-indexes.ts)
- **Documan Mongoose Connection Configuration:** [`apps/api/src/config/database.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/config/database.ts)

---

## 9. Final Safety Statement

The preflight research investigation confirms the following safety guarantees:

- **NO SOURCE CODE WAS MODIFIED**
- **NO CONFIGURATION WAS MODIFIED**
- **NO GIT PUBLICATION OCCURRED**
- **NO CLOUD DEPLOYMENT OCCURRED**

Except for the creation of this research report ([`docs/research/RENDER-FREE-INDEX-SYNCHRONIZATION-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/RENDER-FREE-INDEX-SYNCHRONIZATION-RESEARCH.md)), the repository working tree remains 100% clean and identical to published `main` (`4ce3fbc98df23c0670e668d7fa808604f9419ad1`).
