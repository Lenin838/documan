# Pre-Deployment Repository Structure & Test Organization Audit

**Date:** 2026-09-18  
**Status:** AUDIT COMPLETE (READ-ONLY)  
**Target Deployment:** DOCUMAN FREE PUBLIC DEMO (Vercel + Render Free + MongoDB Atlas M0 + External SMTP)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Git Branch:** `main`  
**Authoritative HEAD SHA:** `6da5c91e91fc49bda52ef92f9e8d0995abf6b9f6`  

---

## 1. Executive Summary

This document performs a read-only architecture, directory structure, test organization, and documentation coverage audit of the **Documan** codebase prior to cloud deployment.

The audit evaluates whether any structural cleanup, file relocation, or documentation enhancements are required, specifically reviewing API module architecture, Vite frontend organization, test file colocation, root configurations, and safety constraints.

> [!IMPORTANT]
> **Audit Status:**
> - This is a **READ-ONLY AUDIT**.
> - **NO SOURCE CODE WAS MODIFIED**.
> - **NO FILES WERE MOVED, CREATED, OR DELETED**.
> - **NO GIT COMMITS OR BRANCHES WERE CREATED**.

---

## 2. Current Repository Structure

Inspection of `c:\MERN_STACK\Documan\documan` confirms a clean monorepo architecture managed by `pnpm@10.34.5` and `turbo@2.10.9`:

```
c:\MERN_STACK\Documan\documan\
├── apps/
│   ├── api/                     # Express 5.2 API Service (TypeScript, Mongoose, Vitest)
│   │   ├── src/                 # Server, App, Config, Modules, Middleware, Utilities, Scripts
│   │   ├── Dockerfile           # Multi-stage Alpine production image
│   │   ├── package.json         # @documan/api dependencies and scripts
│   │   ├── tsconfig.json        # TypeScript configuration
│   │   └── vitest.config.ts     # Vitest test runner configuration
│   └── web/                     # React 19 / Vite SPA Frontend
│       ├── src/                 # Components, Features, Pages, Routes, API Client
│       ├── Dockerfile           # Nginx Alpine production image
│       ├── package.json         # Web frontend dependencies and scripts
│       ├── tsconfig.json        # TypeScript configuration
│       ├── vercel.json          # Vercel SPA routing configuration
│       └── vite.config.ts       # Vite build configuration
├── packages/
│   └── eslint-config/           # Monorepo shared ESLint configuration packages
├── scripts/                     # Cross-platform backup, restore, and smoke test scripts (.sh & .ps1)
├── tests/                       # Root auxiliary test runners (tests/qa/run_phase28_qa.ts & run_phase29_qa.ts)
├── docs/                        # Complete project documentation, research, plans, and reports
│   ├── plans/                   # Implementation plans (19 files)
│   ├── reports/                 # Completion and audit reports (18 files)
│   └── research/                # Architecture and design research (48 files)
├── docker-compose.yml           # Local container orchestration (MongoDB, API, Web)
├── package.json                 # Monorepo root package.json
├── pnpm-lock.yaml               # Frozen lockfile
├── pnpm-workspace.yaml          # Monorepo workspace layout definition
├── tsconfig.json                # Monorepo root TypeScript base configuration
└── turbo.json                   # Turborepo task pipeline definition
```

### Categorized File Evaluation

| File Category | Current Location | Assessment | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Monorepo Applications** | `apps/api`, `apps/web` | **Correctly Located** | Clean separation between backend API service and frontend SPA. |
| **Shared Tooling** | `packages/eslint-config` | **Correctly Located** | Shared linting rules distributed across workspace packages. |
| **Operational Scripts** | `scripts/*.sh`, `scripts/*.ps1` | **Correctly Located** | OS-specific complements (Bash & PowerShell) for database backup/restore and Docker smoke testing. |
| **Auxiliary QA Scripts** | `tests/qa/*.ts` | **Correctly Located** | High-level CLI QA execution scripts. |
| **Project Documentation** | `docs/{plans,reports,research}` | **Correctly Located** | Structured Markdown documentation tracking all 32 completion phases and post-completion work. |
| **Generated Output** | `dist/`, `coverage/`, `.turbo/` | **Correctly Excluded** | Excluded via `.gitignore`; non-committed build artifacts. |

---

## 3. API Organization Assessment (`apps/api`)

The backend API follows a domain-driven modular structure in `apps/api/src/modules/`:

- **Modules (14 Domain Areas):** `auth`, `users`, `documents`, `folders`, `projects`, `governance`, `change-proposals`, `change-packages`, `api-specs`, `webhooks`, `knowledge`, `notifications`, `document-shares`, `health`.
- **Architectural Layering:**
  - `*.controller.ts`: Express Request/Response handlers, input validation handling, HTTP status codes.
  - `*.service.ts`: Core business logic, Mongoose database interactions, transaction processing.
  - `*.model.ts`: Mongoose schema definitions, field validations, indexes (TTL, unique).
  - `*.schema.ts`: Zod validation schemas for request bodies, path params, and query strings.
  - `*.routes.ts`: Express router setup, middleware attachment, rate-limiting binding.
  - `*.test.ts`: Unit and integration tests colocated next to target source files.

> [!NOTE]
> **API Assessment Outcome:**
> The API folder structure demonstrates clear separation of concerns, consistent naming conventions, and strong modularity. **NO RESTRUCTURING IS REQUIRED OR RECOMMENDED** for `apps/api`.

---

## 4. Web Organization Assessment (`apps/web`)

The web application uses a canonical React 19 / Vite SPA structure in `apps/web/src/`:

- **Directory Layout:**
  - `api/`: Axios HTTP client instance (`client.ts`), request/response interceptors, base URL configuration.
  - `components/`: Shared UI components (`Button`, `Card`, `Badge`, `Modal`, `Table`, `Breadcrumb`, `EmptyState`).
  - `features/`: Domain-specific UI components and state management stores (e.g. `auth/auth.store.ts`, `governance/`, `documents/`).
  - `pages/`: Page-level route view components (`DashboardPage`, `ProjectsPage`, `DocumentDetailsPage`, `GovernancePage`, `LoginPage`, `SignupPage`).
  - `routes/`: React Router v7 route definitions and protected route guards (`ProtectedRoute.tsx`).
- **Deployment Configuration:** `apps/web/vercel.json` provides client-side SPA routing rewrites.

> [!NOTE]
> **Web Assessment Outcome:**
> The web folder structure strictly preserves the Stitch UI architecture and React monorepo best practices. **NO RESTRUCTURING IS REQUIRED OR RECOMMENDED** for `apps/web`.

---

## 5. Complete Test-File Inventory & Assessment

### Complete Test-File List (103 Test Files Total)

The repository contains 103 test files across `apps/api` and `apps/web`:

#### `apps/api` Test Files (102 Test Files)
1. `apps/api/src/app.test.ts`
2. `apps/api/src/config/database.test.ts`
3. `apps/api/src/config/env.test.ts`
4. `apps/api/src/config/logger.test.ts`
5. `apps/api/src/errors/app-error.test.ts`
6. `apps/api/src/middleware/auth.middleware.test.ts`
7. `apps/api/src/middleware/authorization.middleware.test.ts`
8. `apps/api/src/middleware/error.middleware.test.ts`
9. `apps/api/src/middleware/rate-limit.middleware.test.ts`
10. `apps/api/src/middleware/request-id.middleware.test.ts`
11. `apps/api/src/middleware/validate.middleware.test.ts`
12. `apps/api/src/modules/api-specs/api-spec-drift.test.ts`
13. `apps/api/src/modules/api-specs/api-spec.test.ts`
14. `apps/api/src/modules/auth/auth.controller.test.ts`
15. `apps/api/src/modules/auth/auth.routes.test.ts`
16. `apps/api/src/modules/auth/auth.schema.test.ts`
17. `apps/api/src/modules/auth/auth.service.test.ts`
18. `apps/api/src/modules/auth/refresh-token.model.test.ts`
19. `apps/api/src/modules/document-shares/document-share.controller.test.ts`
20. `apps/api/src/modules/document-shares/document-share.schema.test.ts`
21. `apps/api/src/modules/document-shares/document-share.service.test.ts`
22. `apps/api/src/modules/documents/document-audit.service.test.ts`
23. `apps/api/src/modules/documents/document-dependency.service.test.ts`
24. `apps/api/src/modules/documents/document-impact-cascade.test.ts`
25. `apps/api/src/modules/documents/document-reference.controller.test.ts`
26. `apps/api/src/modules/documents/document-reference.schema.test.ts`
27. `apps/api/src/modules/documents/document-reference.service.test.ts`
28. `apps/api/src/modules/documents/document-relationship.controller.test.ts`
29. `apps/api/src/modules/documents/document-relationship.schema.test.ts`
30. `apps/api/src/modules/documents/document-relationship.service.test.ts`
31. `apps/api/src/modules/documents/document-review.controller.test.ts`
32. `apps/api/src/modules/documents/document-review.schema.test.ts`
33. `apps/api/src/modules/documents/document-review.service.test.ts`
34. `apps/api/src/modules/documents/document-status.service.test.ts`
35. `apps/api/src/modules/documents/document-version.service.test.ts`
36. `apps/api/src/modules/documents/document.controller.test.ts`
37. `apps/api/src/modules/documents/document.schema.test.ts`
38. `apps/api/src/modules/documents/document.service.test.ts`
39. `apps/api/src/modules/documents/knowledge-risk.service.test.ts`
40. `apps/api/src/modules/folders/folder.controller.test.ts`
41. `apps/api/src/modules/folders/folder.schema.test.ts`
42. `apps/api/src/modules/folders/folder.service.test.ts`
43. `apps/api/src/modules/governance/assurance-calculator.test.ts`
44. `apps/api/src/modules/governance/assurance.routes.test.ts`
45. `apps/api/src/modules/governance/assurance.service.test.ts`
46. `apps/api/src/modules/governance/confirm-freshness.test.ts`
47. `apps/api/src/modules/governance/gate-check-api.test.ts`
48. `apps/api/src/modules/governance/gate-token.test.ts`
49. `apps/api/src/modules/governance/governance-evaluator.test.ts`
50. `apps/api/src/modules/governance/governance.controller.test.ts`
51. `apps/api/src/modules/governance/governance.schema.test.ts`
52. `apps/api/src/modules/governance/governance.service.test.ts`
53. `apps/api/src/modules/governance/release-gate-evaluator.test.ts`
54. `apps/api/src/modules/governance/run_phase29_qa.test.ts`
55. `apps/api/src/modules/governance/system-baseline-alignment.test.ts`
56. `apps/api/src/modules/governance/system-contract-evolution.test.ts`
57. `apps/api/src/modules/governance/system-contract-matrix.test.ts`
58. `apps/api/src/modules/governance/system-contract-plan.test.ts`
59. `apps/api/src/modules/governance/system-governance-lineage.test.ts`
60. `apps/api/src/modules/governance/system-governance-waiver.test.ts`
61. `apps/api/src/modules/governance/system-release-certificate.test.ts`
62. `apps/api/src/modules/governance/system-release-drift-helpers.test.ts`
63. `apps/api/src/modules/governance/system-release-drift.service.test.ts`
64. `apps/api/src/modules/governance/system-release-export.controller.test.ts`
65. `apps/api/src/modules/governance/system-release-export.test.ts`
66. `apps/api/src/modules/governance/system-release-lineage-helpers.test.ts`
67. `apps/api/src/modules/governance/system-release-lineage.service.test.ts`
68. `apps/api/src/modules/governance/system-topology-governance-gate.test.ts`
69. `apps/api/src/modules/governance/system-topology-simulation.test.ts`
70. `apps/api/src/modules/governance/system-traceability-audit.test.ts`
71. `apps/api/src/modules/governance/verification-plan.service.test.ts`
72. `apps/api/src/modules/health/health.controller.test.ts`
73. `apps/api/src/modules/health/health.routes.test.ts`
74. `apps/api/src/modules/health/health.service.test.ts`
75. `apps/api/src/modules/knowledge/evidence-calculator.test.ts`
76. `apps/api/src/modules/knowledge/evidence.routes.test.ts`
77. `apps/api/src/modules/knowledge/evidence.service.test.ts`
78. `apps/api/src/modules/knowledge/knowledge.routes.test.ts`
79. `apps/api/src/modules/knowledge/knowledge.service.test.ts`
80. `apps/api/src/modules/notifications/notification.controller.test.ts`
81. `apps/api/src/modules/notifications/notification.schema.test.ts`
82. `apps/api/src/modules/notifications/notification.service.test.ts`
83. `apps/api/src/modules/projects/project-topology.service.test.ts`
84. `apps/api/src/modules/projects/project.controller.test.ts`
85. `apps/api/src/modules/projects/project.schema.test.ts`
86. `apps/api/src/modules/projects/project.service.test.ts`
87. `apps/api/src/modules/users/user.controller.test.ts`
88. `apps/api/src/modules/users/user.routes.test.ts`
89. `apps/api/src/modules/users/user.schema.test.ts`
90. `apps/api/src/modules/users/user.service.test.ts`
91. `apps/api/src/modules/webhooks/ssrf-agent.test.ts`
92. `apps/api/src/modules/webhooks/webhook-crypto.test.ts`
93. `apps/api/src/modules/webhooks/webhook-delivery.service.test.ts`
94. `apps/api/src/modules/webhooks/webhook.controller.test.ts`
95. `apps/api/src/modules/webhooks/webhook.schema.test.ts`
96. `apps/api/src/modules/webhooks/webhook.service.test.ts`
97. `apps/api/src/routes/index.test.ts`
98. `apps/api/src/server.test.ts`
99. `apps/api/src/utils/api-response.test.ts`
100. `apps/api/src/utils/email.service.test.ts`
101. `apps/api/src/utils/jwt.test.ts`
102. `apps/api/src/utils/otp.test.ts`

#### `apps/web` Test Files (1 Test File)
103. `apps/web/src/components/governance/GovernanceBanner.test.tsx`

---

### Test Organization Comparison & Recommendation

| Organizational Approach | Evaluation | Impact on Documan Architecture |
| :--- | :--- | :--- |
| **Option A: Keep Colocated (Current Baseline)** | Tests are placed directly beside source files (`foo.ts` & `foo.test.ts`). Supported out-of-the-box by Vitest (`include: ['src/**/*.test.ts']`). | **RECOMMENDED**. Maximum developer velocity, simple relative imports (`./foo.js`), zero path alias overhead, clean Turbo task caching. |
| **Option B: Move to Root `tests/` Directory** | Extract all 103 test files into a single top-level `tests/` folder outside applications. | **NOT RECOMMENDED**. Breaks Vitest package isolation, breaks relative import paths across 103 files, violates monorepo package boundaries, requires complex path alias configuration. |
| **Option C: Move to Package Test Directories (`apps/api/tests/` & `apps/web/tests/`)** | Group tests into dedicated `tests/` subdirectories inside each application package. | **NOT RECOMMENDED**. Adds directory nesting without operational benefit; requires updating relative import paths across 103 test files and modifying `vitest.config.ts`. |

> [!IMPORTANT]
> **Test Recommendation Decision:**
> **KEEP COLOCATED (Option A)**. The current co-located pattern is the standard, modern Vitest/TypeScript convention. It provides 100% test coverage clarity and requires zero path manipulation.

---

## 6. Documentation Coverage Assessment

### Current Documentation Inventory

- `docs/DEPLOYMENT.md`: General deployment guidelines.
- `docs/OPERATIONS.md`: Operations and monitoring overview.
- `docs/PRODUCT-ROADMAP.md`: Phases 1–32 complete roadmap specification.
- `docs/PROJECT-COMPLETION-CONTRACT.md`: Core project verification contract.
- `docs/plans/` (19 files): Detailed phase-by-phase implementation plans.
- `docs/reports/` (18 files): Phase completion reports, security audits, and deployment runbooks.
- `docs/research/` (48 files): Technical design research, architecture discovery, and preflight audits.

### Targeted Documentation Additions Assessment

While core project documentation in `docs/` is thorough, targeted README files in major subdirectories would improve developer onboarding and deployment operations:

1. **`apps/api/README.md` (Targeted Addition):**
   - *Purpose:* Onboarding guide for the backend API service.
   - *Contents:* Environment setup (`.env`), database index preflight command (`pnpm --filter @documan/api db:index`), module architecture overview, and Vitest test execution commands.
2. **`apps/web/README.md` (Targeted Addition):**
   - *Purpose:* Onboarding guide for the frontend React/Vite SPA.
   - *Contents:* Local dev server setup (`pnpm dev`), production build (`pnpm build`), Vercel SPA routing (`vercel.json`), and environment variables (`VITE_API_URL`).
3. **`scripts/README.md` (Targeted Addition):**
   - *Purpose:* Operational execution guide for maintenance scripts.
   - *Contents:* Explanation of `.sh` (Linux/macOS) and `.ps1` (Windows) scripts for MongoDB backup, restore, and Docker smoke testing.

> [!NOTE]
> **Documentation Recommendation:**
> **TARGETED ADDITIONS**. Add concise README documentation to `apps/api/`, `apps/web/`, and `scripts/` during post-audit maintenance.

---

## 7. Root Repository Cleanliness

- **`package.json`:** Private monorepo root definition. Standard scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:container`, `format`, `format:check`. Clean and minimal.
- **`pnpm-workspace.yaml`:** Configured with `packages: ['apps/*', 'packages/*']`. Correct.
- **`pnpm-lock.yaml`:** Valid pnpm v10 lockfile.
- **`tsconfig.json`:** Root compiler options extended by sub-apps.
- **`turbo.json`:** Task pipelines configured for `dev`, `build`, `lint`, `typecheck`, `test`.
- **`.gitignore`:** Ignores `node_modules/`, `dist/`, `coverage/`, `.env`, `.turbo/`.
- **`docker-compose.yml`:** Multi-container orchestrator for local testing (MongoDB, API, Web).

> [!NOTE]
> **Root Assessment:** Root repository configuration is clean, normalized, and correctly configured.

---

## 8. Import & Path Safety Analysis

- **Assessment:** Because all 103 test files and domain source modules use valid relative imports (e.g. `import { env } from '../../config/env.js'`), moving files across directories would require updating hundreds of import statements across the codebase.
- **Conclusion:** Preserving current file paths avoids any risk of broken imports, missing modules, or TypeScript compilation failures.

---

## 9. Product Boundary Verification

- **Verification:** The Documan repository strictly enforces its product boundary as an **Enterprise Document Governance & Release Management System**.
- **Boundary Guarantee:** No proposed cleanup or organizational task alters business logic, introduces external feature bloat, or changes core domain contracts.

---

## 10. Proposed Safe Improvement Map

| Item | Action Type | Current Path / State | Proposed Path / State | Rationale |
| :--- | :---: | :--- | :--- | :--- |
| **API Onboarding Guide** | New Doc | *None* | `apps/api/README.md` | Provides clear backend development and deployment instructions. |
| **Web Onboarding Guide** | New Doc | *None* | `apps/web/README.md` | Provides clear frontend setup and Vercel routing instructions. |
| **Scripts Operator Guide** | New Doc | *None* | `scripts/README.md` | Documents backup, restore, and smoke testing execution. |
| **All Source Code & Tests** | Preserved | *Unchanged* | *Unchanged* | Preserves 100% build stability and import safety. |

---

## 11. Files That Should NOT Be Moved or Deleted

- **DO NOT MOVE:**
  - `apps/api/src/modules/**/*.ts` (All 14 backend modules)
  - `apps/web/src/**/*` (All frontend components, pages, features, and API clients)
  - `apps/api/src/**/*.test.ts` & `apps/web/src/**/*.test.tsx` (All 103 test files)
  - `scripts/*.sh` & `scripts/*.ps1` (Operational scripts)
- **DO NOT DELETE:**
  - Any research, plan, or report files in `docs/` (Historical and operational record of product completion)
  - `docker-compose.yml` or Dockerfiles (Container orchestration)

---

## 12. Risk Assessment & Verification Requirements

- **Deployment Risk:** **LOW**. The repository structure is clean, fully verified, and ready for deployment.
- **Verification Commands for Any Future Maintenance:**
  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test
  pnpm build
  git diff --check
  ```

---

## 13. Explicit Audit Declaration

> [!IMPORTANT]
> **NO SOURCE CHANGES WERE MADE DURING THIS AUDIT.**
> This document is a read-only research report (`docs/research/PRE-DEPLOYMENT-REPOSITORY-STRUCTURE-AUDIT.md`). No application source files, package files, test files, or Git history were modified.

---

## 14. Final Decision Gate Summary

- **Repository Organization Status:** **CLEAN**
- **Test Organization Recommendation:** **KEEP COLOCATED**
- **Documentation Recommendation:** **TARGETED ADDITIONS**
- **Deployment Risk:** **LOW**
