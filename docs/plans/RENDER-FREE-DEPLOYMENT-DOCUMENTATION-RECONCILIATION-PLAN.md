# Render Free Deployment Documentation Reconciliation Plan

**Date:** 2026-09-19  
**Status:** PLAN COMPLETE (AWAITING USER APPROVAL)  
**Target Deployment:** DOCUMAN FREE PUBLIC DEMO  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Authoritative Published HEAD SHA:** `4ce3fbc98df23c0670e668d7fa808604f9419ad1`  
**Research Reference:** `docs/research/RENDER-FREE-INDEX-SYNCHRONIZATION-RESEARCH.md`  

---

## 1. Objective

This implementation plan details the documentation reconciliation required to align Documan's deployment planning artifacts with verified **Render Free** platform behavior.

Specifically, this plan removes the outdated assumption that Render Free Web Services support a **Pre-Deploy Command**, and establishes **Start Command Chaining** (`node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js`) as the canonical automated runtime startup mechanism for database index synchronization.

> [!IMPORTANT]
> **Planning & Scope Directives:**
> - NO SOURCE CODE CHANGES ARE REQUIRED.
> - NO TEST FILES WILL BE MOVED OR MODIFIED.
> - NO CONFIGURATION FILES WILL BE MODIFIED.
> - NO GIT COMMITS, MERGES, PUSHES, OR CLOUD DEPLOYMENTS WILL OCCUR DURING PLANNING.

---

## 2. Research Basis

The reconciliation plan is grounded in empirical research recorded in [`docs/research/RENDER-FREE-INDEX-SYNCHRONIZATION-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/RENDER-FREE-INDEX-SYNCHRONIZATION-RESEARCH.md):

1. **Render Free Feature Restriction:** Official Render documentation (`render.com/docs/free`, `render.com/docs/pre-deploy-command`) confirms that **Pre-Deploy Commands**, **Shell/SSH Access**, and **One-Off Jobs** are **UNSUPPORTED / NOT AVAILABLE** on Render Free Web Services (these features are restricted to paid compute tiers).
2. **Current Codebase Capability:** The existing API build script (`pnpm --filter @documan/api build`) compiles `apps/api/src/scripts/sync-indexes.ts` into `apps/api/dist/scripts/sync-indexes.js`.
3. **Execution Verification:** Local execution verified that `node --env-file=apps/api/.env apps/api/dist/scripts/sync-indexes.js` runs natively on Node.js 22, connects to MongoDB via `process.env.MONGO_URI`, statically registers all **28 Mongoose models**, synchronizes indexes idempotently, and exits cleanly with code `0`.
4. **Conclusion:** Zero application source code or configuration changes are required to support Render Free deployment. Only deployment planning documentation requires reconciliation.

---

## 3. Affected Documentation Inventory

Searching the repository for outdated references to Render Free `Pre-Deploy Command` and index synchronization identified the following files:

| File Path | Document Type | Current Status | Needs Reconciliation? |
| :--- | :--- | :--- | :---: |
| [`docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md) | Deployment Plan | Specifies `Pre-Deploy / Preflight Command: pnpm --filter @documan/api db:index` | **YES** |
| [`docs/research/FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md) | Research Audit | Specifies `Configure Pre-Deploy Command: pnpm --filter @documan/api db:index` | **YES** |
| [`docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md) | Research | Specifies `Pre-Deploy Command (Optional): pnpm --filter @documan/api db:index` | **YES** |

---

## 4. Canonical Documentation Decision

### Canonical Plan Document
[`docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md) is designated as the **Canonical Implementation Plan** for the Documan Free Public Demo deployment.

All free-demo hosting specifications, dashboard instructions, environment matrices, and deployment sequences will be authoritatively anchored in this document. [`docs/research/FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md) and [`docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md) will be updated to cross-reference this canonical procedure.

---

## 5. Updated Render Free Operational Procedure

The reconciled deployment specifications for Render Free Web Services across all documentation are defined as follows:

### Render Dashboard Configuration
- **Service Type:** Web Service
- **Environment:** Node
- **Root Directory:** *(Leave Blank / Repository Root)* *(Safest setting to preserve pnpm workspace context)*
- **Node Version:** `22` (Set environment variable `NODE_VERSION=22`)
- **Build Command:**
  ```bash
  pnpm install --frozen-lockfile && pnpm --filter @documan/api build
  ```
- **Pre-Deploy Command:**
  `LEAVE EMPTY / NOT USED` *(Pre-Deploy Commands are disabled on Render Free compute plans)*
- **Start Command:**
  ```bash
  node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js
  ```
- **Health Check Path:** `/api/v1/health/ready`

### Operational Mechanics & Safeguards
1. **Existing Build Artifact:** `sync-indexes.js` is compiled automatically during the build step (`pnpm --filter @documan/api build` runs `tsc -p tsconfig.json`).
2. **Model Discovery:** `sync-indexes.js` statically registers all **28 Mongoose models** (including `SignupOtp`, `RefreshToken`, `User`, `Document`, etc.).
3. **Idempotency:** Mongoose `syncIndexes()` is fully idempotent. If collection indexes match the schema, `syncIndexes()` completes in milliseconds without error.
4. **Startup Synchronization:** The Express API server (`server.js`) waits for index synchronization to complete cleanly before binding to the listening HTTP port.
5. **Failure Protection:** The `&&` shell operator ensures that if index synchronization fails (e.g. invalid `MONGO_URI` or database connection failure), `node apps/api/dist/server.js` does NOT execute, failing startup safely.

---

## 6. Exact Change Map

| File Path | Current Section | Current Incorrect Behavior | Reconciled New Behavior | Reason | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md) | Section 6 (`Render API Configuration`) | Specifies `Pre-Deploy / Preflight Command: pnpm --filter @documan/api db:index` and standard `Start Command: node apps/api/dist/server.js` | Replaces with `Pre-Deploy Command: LEAVE EMPTY / NOT USED` and `Start Command: node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js` | Align with Render Free platform restrictions | Low (Documentation accuracy) |
| [`docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md) | Section 16 (`Deployment Sequence`) | Phase D specifies Pre-deploy command in Render and Phase E relies on pre-deploy logs | Reconciles Phase D to use Start Command chaining and Phase E to verify startup index sync logs | Remove invalid Pre-Deploy step from deployment sequence | Low |
| [`docs/research/FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md) | Section 4 (`Render Preflight Assessment`) & Section 13 (`Exact Deployment Sequence`) | Specifies `Pre-Deploy Command: pnpm --filter @documan/api db:index` | Reconciles to `Pre-Deploy Command: LEAVE EMPTY / NOT USED` and `Start Command: node apps/api/dist/scripts/sync-indexes.js && node apps/api/dist/server.js` | Maintain consistency across preflight audit report | Low |
| [`docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md) | Section 5 (`Render Free`) & Section 13 (`Deployment Sequence`) | Specifies `Pre-Deploy Command (Optional): pnpm --filter @documan/api db:index` | Reconciles to note that Pre-Deploy Commands are paid-tier only, establishing Start Command chaining for Free tier | Reflect official Render platform specifications | Low |

---

## 7. Files That Must Remain Unchanged

The following files contain canonical Docker, general operations, or codebase configurations and **MUST REMAIN UNCHANGED**:

- **`apps/api/src/*`**: Application source code (e.g. `server.ts`, `app.ts`, `sync-indexes.ts`, `database.ts`).
- **`apps/web/src/*`**: Frontend source code.
- **`apps/api/package.json` & root `package.json`**: Package manifests and scripts (`db:index` script preserved for local CLI / admin use).
- **`docs/DEPLOYMENT.md`**: Describes Docker Compose containerized deployment (`docker compose exec api pnpm --filter @documan/api db:index`). Docker Compose is unaffected by Render Free limitations.
- **`docs/OPERATIONS.md`**: Describes general operational monitoring and manual CLI commands.
- **`docs/reports/POST-COMPLETION-PRODUCTION-DEPLOYMENT-RUNBOOK.md`**: Documents production deployment runbook baseline.
- **`apps/api/README.md` & `apps/web/README.md`**: Component developer documentation.

---

## 8. Verification Strategy

Following the execution of the documentation updates outlined in this plan:

1. **File Existence Check:** Verify all modified markdown files exist at their absolute paths.
2. **Grep Auditing:** Perform global repository search for `Pre-Deploy Command: pnpm` or `Pre-deploy: pnpm` to confirm zero stale Render Free pre-deploy references remain.
3. **Diff Hygiene Check:** Execute `git diff --check` to verify zero trailing whitespace or line-ending errors.
4. **TypeScript & Lint Verification:** Execute `pnpm typecheck` and `pnpm lint` to confirm workspace health.
5. **Automated Test Suite Verification:** Run `pnpm test` to confirm baseline test suite passes cleanly (**103 test files / 798 tests / 0 failures**).

---

## 9. Rollback Strategy

If documentation reconciliation is halted or requires reversion:

1. Execute `git checkout -- docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md docs/research/FINAL-FREE-DEMO-DEPLOYMENT-PREFLIGHT-AUDIT.md docs/research/POST-COMPLETION-FREE-PUBLIC-DEMO-HOSTING-RESEARCH.md`.
2. Confirm working tree returns to baseline commit `4ce3fbc98df23c0670e668d7fa808604f9419ad1`.

---

## 10. Scope Boundaries & Final Confirmation

- **NO SOURCE CODE CHANGES ARE REQUIRED.**
- **NO TEST FILES WILL BE MOVED OR MODIFIED.**
- **NO DEPLOYMENT CONFIGURATION FILES WILL BE MODIFIED.**
- **NO GIT PUBLICATION OR CLOUD DEPLOYMENT WILL OCCUR.**
