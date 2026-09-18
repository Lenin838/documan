# Pre-Deployment Targeted Documentation Implementation Plan

**Date:** 2026-09-18  
**Status:** PLAN COMPLETE (AWAITING USER APPROVAL)  
**Target Scope:** Add targeted README documentation to `apps/api/`, `apps/web/`, and `scripts/`.  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Authoritative HEAD SHA:** `6da5c91e91fc49bda52ef92f9e8d0995abf6b9f6`  

---

## 1. Objective

This plan details the section layout, canonical source references, link validation strategy, security parameters, and implementation sequence for adding three targeted documentation README files to the **Documan** repository:

1. `apps/api/README.md`
2. `apps/web/README.md`
3. `scripts/README.md`

> [!IMPORTANT]
> **Implementation Scope Safeguard:**
> - This is **DOCUMENTATION-ONLY WORK**.
> - **NO SOURCE CODE OR TEST FILES WILL BE MOVED.**
> - **NO APPLICATION SOURCE CODE OR TEST FILES WILL BE MODIFIED.**
> - **NO EXISTING FILES WILL BE DELETED.**
> - **NO GIT COMMITS OR PUSHES WILL OCCUR DURING PLANNING.**

---

## 2. Current Baseline

- **Repository Branch:** `main`
- **Current HEAD SHA:** `6da5c91e91fc49bda52ef92f9e8d0995abf6b9f6` (synchronized with `origin/main`)
- **Pre-Deployment Audit Status:**
  - Repository Organization: **CLEAN**
  - Test Organization: **KEEP COLOCATED**
  - Documentation Recommendation: **TARGETED ADDITIONS**
  - Deployment Risk: **LOW**

---

## 3. Existing Documentation Sources Reviewed

The following canonical documentation files were audited to ensure new README files provide helpful, non-duplicative onboarding guidance while linking to full specifications:

- `docs/DEPLOYMENT.md` — Docker Compose deployment and environment variable reference.
- `docs/OPERATIONS.md` — Pino logging configuration, MongoDB backup procedures, and operational monitoring.
- `docs/PRODUCT-ROADMAP.md` — Complete specification of certified product Phases 1–32.
- `docs/PROJECT-COMPLETION-CONTRACT.md` — Product verification contract.
- `docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md` — Vercel, Render Free, MongoDB Atlas M0, and External SMTP public demo plan.
- `docs/reports/POST-COMPLETION-FREE-DEMO-DEPLOYMENT-COMPATIBILITY-COMPLETION-REPORT.md` — Verification details for `trust proxy` and `sameSite: "none"` cookie compatibility.
- `docs/reports/POST-COMPLETION-FREE-DEMO-DEPLOYMENT-COMPATIBILITY-PUBLICATION-REPORT.md` — Git merge and publication record for demo deployment compatibility.
- `docs/reports/POST-COMPLETION-SMTP-EMAIL-DELIVERY-COMPLETION-REPORT.md` — Nodemailer physical SMTP integration report.
- `docs/reports/POST-COMPLETION-PRODUCTION-DEPLOYMENT-RUNBOOK.md` — Operational preflight runbook.
- `scripts/backup-mongodb.sh`, `scripts/backup-mongodb.ps1`, `scripts/restore-mongodb.sh`, `scripts/restore-mongodb.ps1`, `scripts/container-smoke-test.sh`, `scripts/container-smoke-test.ps1` — Operational scripts.

---

## 4. Documentation Gaps Addressed

1. **`apps/api/` Directory Gap:** Lacks a dedicated developer onboarding guide documenting API module architecture, environment variables, database index preflight command (`pnpm --filter @documan/api db:index`), and Vitest test execution commands.
2. **`apps/web/` Directory Gap:** Lacks a dedicated developer onboarding guide documenting React/Vite SPA structure, Axios API client setup, environment configuration (`VITE_API_URL`), and Vercel SPA routing (`vercel.json`).
3. **`scripts/` Directory Gap:** Lacks an operator reference documenting script purposes, execution parameters, cross-platform support (Linux Bash vs Windows PowerShell), and safety guidelines.

---

## 5. Exact Files to Create

1. `apps/api/README.md`
2. `apps/web/README.md`
3. `scripts/README.md`

---

## 6. Proposed Section Structure for Each README

### 6.1 `apps/api/README.md` (API Onboarding Reference)

- **Purpose:** Provide a clear, developer-focused reference for running, testing, and understanding the Express 5 / Node.js 22 API backend.
- **Section Layout:**
  1. **Overview & Architecture:** Description of Express 5, Mongoose 9, Pino logging, and TypeScript layout.
  2. **Quick Start Commands:**
     - `pnpm dev` — Start development API server (`tsx/esm`)
     - `pnpm build` — Compile TypeScript (`tsc -p tsconfig.json`)
     - `pnpm typecheck` — Run TypeScript type checking
     - `pnpm lint` — Execute ESLint check
     - `pnpm test` — Run Vitest unit & integration test suite
  3. **Environment Configuration:** Reference table describing `NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`.
  4. **Database Index Preflight:** Document execution of `pnpm --filter @documan/api db:index` to register all 28 Mongoose models and build TTL indexes safely.
  5. **Health Check Endpoints:** Document `/api/v1/health`, `/api/v1/health/live`, and `/api/v1/health/ready`.
  6. **Module Architecture:** Overview of 14 domain modules in `src/modules/` (`auth`, `users`, `documents`, `governance`, etc.) and internal controller/service/model layering.
  7. **Upload & Render Free Storage Notes:** Explain local version snapshot path (`uploads/documents/versions/`) and ephemeral storage behavior on Render Free.
  8. **Canonical References:** Direct links to root deployment plans and runbooks.

### 6.2 `apps/web/README.md` (Web SPA Onboarding Reference)

- **Purpose:** Provide a clear, developer-focused reference for running, building, and deploying the React 19 / Vite 8 SPA frontend.
- **Section Layout:**
  1. **Overview & Technology Stack:** Description of React 19, Vite 8, Tailwind CSS v4, Zustand 5, Axios, and React Router v7.
  2. **Quick Start Commands:**
     - `pnpm dev` — Launch Vite local development server (`http://localhost:5173`)
     - `pnpm build` — Execute typecheck and Vite production build (`apps/web/dist/`)
     - `pnpm lint` — Execute ESLint check
     - `pnpm test` — Run Vitest component test suite
  3. **Environment Configuration:** Document `VITE_API_URL` usage in Axios client (`src/api/client.ts`).
  4. **Directory Structure:** Explain `api/`, `components/`, `features/`, `pages/`, and `routes/`.
  5. **Vercel SPA Routing:** Document `vercel.json` rewrite configuration for deep-path SPA client routing.
  6. **Canonical References:** Direct links to root deployment documentation.

### 6.3 `scripts/README.md` (Operator Scripts Guide)

- **Purpose:** Provide an operator reference for backup, restore, and smoke testing scripts.
- **Section Layout:**
  1. **Scripts Overview:** Explanation of cross-platform script pairing (`.sh` for Linux/macOS, `.ps1` for Windows PowerShell).
  2. **Database & Upload Backup Scripts:**
     - `backup-mongodb.sh` & `backup-mongodb.ps1`
     - Usage, environment overrides (`MONGO_URI`, `BACKUP_BASE_DIR`), output structure (`mongo-dump.gz`, `uploads/`, `backup-metadata.json`).
  3. **Database & Upload Restore Scripts:**
     - `restore-mongodb.sh` & `restore-mongodb.ps1`
     - Usage, restore steps, and safety checks.
  4. **Container Stack Smoke Test Scripts:**
     - `container-smoke-test.sh` & `container-smoke-test.ps1`
     - Pre-deployment Docker verification, health polling, and clean teardown.
  5. **Prerequisites & Execution Policy:** Required tools (`mongodump`, `mongorestore`, `docker`) and Windows PowerShell execution policy flags (`-ExecutionPolicy Bypass`).
  6. **Canonical References:** Direct links to `docs/OPERATIONS.md` and `docs/DEPLOYMENT.md`.

---

## 7. Canonical Sources & Link Plan

All cross-references will use verified relative file links:

| Source README | Target Document | Target Document Description |
| :--- | :--- | :--- |
| `apps/api/README.md` | [`docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md) | Free Public Demo deployment plan |
| `apps/api/README.md` | [`docs/reports/POST-COMPLETION-PRODUCTION-DEPLOYMENT-RUNBOOK.md`](file:///c:/MERN_STACK/Documan/documan/docs/reports/POST-COMPLETION-PRODUCTION-DEPLOYMENT-RUNBOOK.md) | Operational preflight runbook |
| `apps/web/README.md` | [`docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md) | Vercel SPA deployment specifications |
| `scripts/README.md` | [`docs/OPERATIONS.md`](file:///c:/MERN_STACK/Documan/documan/docs/OPERATIONS.md) | Operational monitoring and backup guide |
| `scripts/README.md` | [`docs/DEPLOYMENT.md`](file:///c:/MERN_STACK/Documan/documan/docs/DEPLOYMENT.md) | Docker Compose container deployment guide |

---

## 8. Security Considerations

- **No Secrets in Documentation:** All environment variable tables will use generic placeholder values (e.g. `your_secure_32_character_jwt_secret`).
- **SMTP Placeholders:** External SMTP documentation will specify generic hosts (`smtp.resend.com`) and generic sender strings without real credentials.
- **URI Safeguards:** MongoDB URI examples will use generic local host formats (`mongodb://localhost:27017/documan`).

---

## 9. Implementation Sequence

1. **User Approval:** Receive explicit authorization to create the three README files.
2. **Branch Creation:** Create local feature branch `feature/targeted-repository-documentation`.
3. **Write README Files:**
   - Create `apps/api/README.md`
   - Create `apps/web/README.md`
   - Create `scripts/README.md`
4. **Link Integrity Check:** Verify relative Markdown links and execute `git diff --check`.
5. **Verification Suite:** Execute `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
6. **Completion Report:** Create `docs/reports/POST-COMPLETION-TARGETED-DOCUMENTATION-COMPLETION-REPORT.md`.

---

## 10. Verification Strategy

Even though this task is documentation-only, a full verification suite will be executed to guarantee zero unintended workspace regressions:

- **Lightweight Verification:** `git diff --check` (0 formatting/whitespace issues) + relative link verification.
- **Full Verification Suite:**
  - `pnpm typecheck` (0 TypeScript errors)
  - `pnpm lint` (0 ESLint errors)
  - `pnpm test` (103 test files passed / 798 tests passed)
  - `pnpm build` (`@documan/api` and `web` production bundles built successfully)

*Rationale:* Running the complete verification suite ensures that creating new Markdown files causes zero package, build, or tooling regressions.

---

## 11. Scope Boundaries

- **ALLOWED:** Creating `apps/api/README.md`, `apps/web/README.md`, `scripts/README.md`, and the completion report.
- **PROHIBITED:**
  - Modifying any application source code files (`.ts`, `.tsx`, `.js`).
  - Moving or renaming any existing files.
  - Relocating any test files.
  - Modifying any existing documentation files or configuration schemas.
  - Deleting any existing files.

---

## 12. Rollback Strategy

If any formatting or verification step fails during implementation:
1. Delete the created README files.
2. Switch back to `main` branch.
3. Delete local feature branch `feature/targeted-repository-documentation`.

---

## 13. Declarative Safeguard

> [!IMPORTANT]
> **NO SOURCE CODE OR TEST FILES WILL BE MOVED.**
> This implementation plan strictly creates three new Markdown documentation files (`apps/api/README.md`, `apps/web/README.md`, `scripts/README.md`) without moving, deleting, or altering any source code or test files.
