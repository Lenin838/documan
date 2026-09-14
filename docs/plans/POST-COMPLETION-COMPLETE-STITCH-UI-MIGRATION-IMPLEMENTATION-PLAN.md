# DOCUMAN — COMPLETE STITCH UI MIGRATION MASTER IMPLEMENTATION PLAN

**Target File**: `docs/plans/POST-COMPLETION-COMPLETE-STITCH-UI-MIGRATION-IMPLEMENTATION-PLAN.md`  
**Status**: MASTER IMPLEMENTATION PLAN  
**Mode**: PLAN ONLY — Zero source code, lockfile, or backend logic modifications executed.

---

## 1. MASTER OBJECTIVE & SOURCE-OF-TRUTH RULES

### Master Objective
Migrate the complete Documan frontend UI to match the approved **Documan High-Fidelity Design System & UI Kit** (Stitch Project ID: `projects/9852339151029178160`) across all **21 Stitch Design Domains** (Domains 01–21) and **17 Application Routes**, preserving 100% of existing backend functionality, database schemas, API contracts, authorization guards, and business logic.

### Source-of-Truth Rules
1. **Repository Authority**:
   - Backend APIs, Mongoose database schemas, Zustand state stores, Axios client interceptors, calculation logic (5-Factor Risk Model, Assurance Score, Cell Precedence), authorization rules, and role guards (`admin` vs `user`) are **100% COMPLETE & FROZEN**.
   - No backend code changes or business logic mutations are permitted.
2. **Stitch Design Authority**:
   - Stitch provides the authoritative target for layout, slate dark-mode tokens (`#0c1324` canvas, `#191f31` container fill, `#1e293b` border hairline), typography (`Inter` + `JetBrains Mono`), component presentation, micro-animations, responsive presentation, and accessibility states.
3. **Existing UI Work Preservation**:
   - Earlier post-completion UI refinement work exists in `apps/web/src/`. Every batch MUST inspect existing components and classify work as **ALREADY ALIGNED**, **ALIGNMENT / REFINEMENT**, or **MIGRATION REQUIRED**. Do not rebuild working logic when class refinement achieves target fidelity.
4. **Unsupported Feature Prohibition**:
   - Unsupported Stitch prototype elements (User Restore, Permanent Purge, Retention Countdowns, IAM/SSO, Git PR triggers, APM telemetry, server-side PDF generators) are strictly prohibited.

---

## 2. 21-DOMAIN COVERAGE MATRIX

| Domain ID | Domain Title | Repository Component Mapping | Implementation Batch | Status |
| :---: | :--- | :--- | :---: | :---: |
| **01** | Product Identity / Cover | `index.css`, `AppLayout.tsx` | Batch 1 | ALREADY ALIGNED |
| **02** | Product Architecture / Blueprint | `AppLayout.tsx`, Architecture Docs | Batch 1 | ALREADY ALIGNED |
| **03** | Design System / Tokens | `index.css`, `tailwind.config.js` | Batch 1 | ALIGNMENT / REFINEMENT |
| **04** | Core UI Components | `components/common/*` primitives | Batch 2 | ALIGNMENT / REFINEMENT |
| **05** | Application Shell | `components/layout/AppLayout.tsx` | Batch 3 | ALIGNMENT / REFINEMENT |
| **06** | Authentication — Login + Signup | `pages/LoginPage.tsx`, `SignupPage.tsx` | Batch 4 | ALIGNMENT / REFINEMENT |
| **07** | Executive Dashboard | `pages/DashboardPage.tsx` | Batch 4 | ALIGNMENT / REFINEMENT |
| **08** | System Projects Directory | `pages/ProjectsPage.tsx` | Batch 5 | ALIGNMENT / REFINEMENT |
| **09** | Project Workspace Hub | `pages/ProjectDetailsPage.tsx` (5 Tabs) | Batch 5 | ALIGNMENT / REFINEMENT |
| **10** | Document Catalog / Repository | `pages/DocumentsPage.tsx` | Batch 6 | ALIGNMENT / REFINEMENT |
| **11** | Document Detail Workspace | `pages/DocumentDetailsPage.tsx` | Batch 6 | ALIGNMENT / REFINEMENT |
| **12** | Document Creator / Editor | `DocumentCreatePage.tsx`, `DocumentEditPage.tsx` | Batch 7 | ALIGNMENT / REFINEMENT |
| **13** | Knowledge Search / Risk Radar | `KnowledgeSearchPage.tsx`, `RiskRadarDrawer.tsx` | Batch 8 | ALIGNMENT / REFINEMENT |
| **14** | Change Proposals / Impact Cascade | `ReviewsPage.tsx` (Proposals Tab) | Batch 9 | ALIGNMENT / REFINEMENT |
| **15** | Change Packages / Release Planning | `ReviewsPage.tsx` (Packages Tab) | Batch 9 | ALIGNMENT / REFINEMENT |
| **16** | Verification Plans / Compliance | `ReviewsPage.tsx` (Verification Tab) | Batch 10 | ALIGNMENT / REFINEMENT |
| **17** | System Contract Matrix | `SystemContractMatrixView.tsx` | Batch 11 | ALIGNMENT / REFINEMENT |
| **18** | System Topology Simulation | `SystemTopologySimulationSandbox.tsx` | Batch 12 | ALIGNMENT / REFINEMENT |
| **19** | System Release Lineage | `SystemReleaseLineageView.tsx` | Batch 13 | ALIGNMENT / REFINEMENT |
| **20** | Printable Release Certificate | `pages/ReleaseCertificatePrintPage.tsx` | Batch 13 | ALIGNMENT / REFINEMENT |
| **21** | Administration / Trash / Fallbacks | `UsersPage.tsx`, `TrashPage.tsx`, `NotFoundPage.tsx` | Batch 14 | ALIGNMENT / REFINEMENT |

---

## 3. 17-ROUTE COVERAGE MATRIX

| Route Path | Repository Page Component | Target Stitch Module | Batch | Preserved Functionality |
| :--- | :--- | :--- | :---: | :--- |
| `/login` | `LoginPage.tsx` | Auth — Login Screen | Batch 4 | Session start, JWT token handle, `returnUrl` |
| `/signup` | `SignupPage.tsx` | Auth — Signup Screen | Batch 4 | Registration payload, form validation |
| `/dashboard` | `DashboardPage.tsx` | Executive Dashboard | Batch 4 | Dynamic metrics fetch, role-aware widgets |
| `/knowledge/search` | `KnowledgeSearchPage.tsx` | Knowledge & Risk Radar | Batch 8 | Search API, 5-Factor Risk Model calculation |
| `/projects` | `ProjectsPage.tsx` | Projects Directory | Batch 5 | Project list query, search/filter |
| `/projects/:id` | `ProjectDetailsPage.tsx` | 5-Tab Project Workspace | Batch 5 | **Strictly 5 tabs**, ACL check, sub-views |
| `/documents` | `DocumentsPage.tsx` | Document Catalog | Batch 6 | Document repository search & pagination |
| `/documents/create` | `DocumentCreatePage.tsx` | Document Creator | Batch 7 | Document creation `POST` payload, validation |
| `/documents/:id` | `DocumentDetailsPage.tsx` | Document Detail & History | Batch 6 | Content render, version lineage, evidence |
| `/documents/:id/edit` | `DocumentEditPage.tsx` | Document Editor | Batch 7 | Update `PATCH` payload, version increment |
| `/trash` | `TrashPage.tsx` | Soft-Delete Trash | Batch 14 | `isDeleted=true` query, `PATCH /restore` payload |
| `/reviews` | `ReviewsPage.tsx` | Change Reviews & Verification | Batch 9/10 | Proposal simulation, 5 conflict enums, Assurance |
| `/projects/:pId/release-certificates/:cId/print` | `ReleaseCertificatePrintPage.tsx` | Printable Certificate | Batch 13 | SHA-256 fingerprint, `@media print` layout |
| `/users` | `UsersPage.tsx` | Admin User Directory | Batch 14 | Admin role check, active user query |
| `/users/:id` | `UserDetailsPage.tsx` | Admin User Details | Batch 14 | User details query |
| `/users/:id/edit` | `EditUserPage.tsx` | Admin Edit User | Batch 14 | Role update `PATCH`, self-protection guard |
| `*` | `NotFoundPage.tsx` | 404 Route Not Found | Batch 14 | Catch-all routing, return to dashboard button |
| *(App Level)* | `ErrorBoundary.tsx` | Application Error Boundary | Batch 2 | Uncaught React error catch, reload button |

---

## 4. UI-ONLY SAFETY BOUNDARIES

During execution of every implementation batch, the following strict boundaries MUST be enforced:

| Safety Category | Change Allowed? | Enforcement Rule |
| :--- | :---: | :--- |
| **Backend Source Code (`apps/api/`)** | **NO** | Zero modifications to API routes, services, or controllers. |
| **Database Schemas & Models** | **NO** | Mongoose schemas and models remain 100% frozen. |
| **API Contracts & Payloads** | **NO** | Axios client functions and request/response interfaces are frozen. |
| **Business Logic & Calculations** | **NO** | Risk formulas, Assurance Scores, Cell Precedences are frozen. |
| **Authentication & Session** | **NO** | `auth.store.ts` Zustand logic and token refresh interceptors are frozen. |
| **Authorization & Role Guards** | **NO** | `ProtectedRoute` checks and admin self-protection validation are frozen. |
| **Project Workspace Architecture** | **NO** | **STRICTLY 5 TABS** (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`). |
| **Allowed Changes** | **YES** | JSX markup styling, Tailwind CSS utility classes, layout containers, micro-badge code fonts, responsive grid tweaks, ARIA accessibility attributes. |

---

## 5. 14 IMPLEMENTATION BATCHES BREAKDOWN

### BATCH 1: Design System Tokens & Global Foundation
- **Objective**: Establish the Precision Blueprint dark mode tokens, typography scale (`Inter` + `JetBrains Mono`), and global utility classes in `index.css`.
- **Stitch Domains Covered**: Domain 01 (Product Identity / Cover), Domain 02 (Product Architecture Blueprint), Domain 03 (Design System Tokens).
- **Stitch Screens Covered**: Design System Spec Sheet & Tokens Canvas.
- **Repository Files to Inspect**: `apps/web/src/index.css`, `tailwind.config.js`.
- **Repository Components to Inspect**: Root CSS configuration files.
- **UI Changes Required**: Configure dark background (`slate-950` canvas `#0c1324`), container fill (`slate-900` `#191f31`), hairline border (`slate-800` `#1e293b`), primary cyan (`#38bdf8`), violet (`#a855f7`), emerald (`#10b981`), rose (`#f43f5e`), font families (`Inter`, `JetBrains Mono`).
- **Existing UI Work to Reuse**: Existing Tailwind setup in `index.css`.
- **Functionality to Remain Untouched**: Web build scripts in `package.json`.
- **Backend/API Files to Remain Unchanged**: All files under `apps/api/`.
- **Responsive Requirements**: Base breakpoint utility classes (`sm:`, `md:`, `lg:`, `xl:`).
- **Accessibility Requirements**: High-contrast text colors (`#cbd5e1` body text on `#0c1324` canvas).
- **Loading / Empty / Error States**: N/A (Global CSS tokens).
- **Unsupported Stitch Elements**: None.
- **Dependencies**: None (Root foundation batch).
- **Verification Requirements**: `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web test`, `pnpm --filter web build`, `git diff --check`.
- **Manual QA Requirements**: Verify dark mode tokens render across 1440px desktop, 1024px laptop, 800px tablet, 375px mobile viewports.
- **Acceptance Criteria**: Dark theme styling tokens compile cleanly without CSS errors.
- **Expected Files Likely to Change**: `apps/web/src/index.css`, `tailwind.config.js`.
- **Expected Files That Must NOT Change**: Any TypeScript code files.

---

### BATCH 2: Shared UI Primitives
- **Objective**: Refine shared UI components in `components/common/` to match Stitch Precision Slate dark mode styles.
- **Stitch Domains Covered**: Domain 04 (Core UI Components).
- **Stitch Screens Covered**: Core Primitives Component Spec.
- **Repository Files to Inspect**: `apps/web/src/components/common/*` (`Button`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`, `Input`, `Select`, `LoadingSpinner`, `EmptyState`), `components/ErrorBoundary.tsx`.
- **Repository Components to Inspect**: Shared primitives in `components/common/`.
- **UI Changes Required**: Update buttons with cyan hover, micro-badges with `JetBrains Mono` text, cards with Layer 1 Slate fill (`#191f31`), compact `36px` table rows with monospaced hashes, inputs with cyan focus rings (`focus:ring-1 focus:ring-sky-400`), modal dialogs with hairline borders (`#1e293b`).
- **Existing UI Work to Reuse**: Component prop signatures (`onClick`, `children`, `disabled`, `isOpen`).
- **Functionality to Remain Untouched**: Component callbacks and event handling.
- **Backend/API Files to Remain Unchanged**: `apps/api/` (All files).
- **Responsive Requirements**: Table horizontal scroll wrappers, fluid modal widths.
- **Accessibility Requirements**: `focus:ring-1 focus:ring-sky-400`, `role="dialog"`, `aria-live="polite"` on `<LoadingSpinner />`.
- **Loading / Empty / Error States**: Refine `<LoadingSpinner />`, `<EmptyState />`, and `ErrorBoundary` fallback card.
- **Unsupported Stitch Elements**: None.
- **Dependencies**: Batch 1.
- **Verification Requirements**: Automated verification commands + unit test execution.
- **Manual QA Requirements**: Test primitive focus states, keyboard tab navigation, modal focus traps.
- **Acceptance Criteria**: Shared primitives render with full Precision dark theme styling and pass unit tests.
- **Expected Files Likely to Change**: `apps/web/src/components/common/*`, `apps/web/src/components/ErrorBoundary.tsx`.
- **Expected Files That Must NOT Change**: Page components and API clients.

---

### BATCH 3: Application Shell & Global Layout
- **Objective**: Refine `AppLayout.tsx`, Header, Sidebar drawer, and Breadcrumb navigation.
- **Stitch Domains Covered**: Domain 05 (Application Shell).
- **Stitch Screens Covered**: Application Shell & Mobile Drawer.
- **Repository Files to Inspect**: `apps/web/src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`.
- **Repository Components to Inspect**: Layout wrapper and navigation drawer.
- **UI Changes Required**: Set dark background (`#0c1324`), add hairline slate borders (`#1e293b`), update sidebar active nav links with cyan glow indicator, refine mobile overlay drawer.
- **Existing UI Work to Reuse**: Role-aware nav item filtering logic (`admin` vs `user`), Zustand auth session checks.
- **Functionality to Remain Untouched**: Route navigation handlers, logout session handler.
- **Backend/API Files to Remain Unchanged**: `apps/api/` (All files).
- **Responsive Requirements**: Collapsible drawer on screens `< 1024px`, mobile overlay drawer on `< 768px`.
- **Accessibility Requirements**: `aria-expanded` on drawer toggle, `#main-content` skip link.
- **Loading / Empty / Error States**: Suspense page loading fallback.
- **Unsupported Stitch Elements**: None.
- **Dependencies**: Batch 1, Batch 2.
- **Verification Requirements**: Automated verification commands + layout tests.
- **Manual QA Requirements**: Verify sidebar collapse/expand, breadcrumb navigation, and mobile touch drawer.
- **Acceptance Criteria**: App shell renders dark slate navigation and maintains role-aware routing.
- **Expected Files Likely to Change**: `components/layout/AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`.
- **Expected Files That Must NOT Change**: Route definitions in `App.tsx` and auth store files.

---

### BATCH 4: Authentication & Dashboard
- **Objective**: Refine `LoginPage.tsx`, `SignupPage.tsx`, and `DashboardPage.tsx` presentation.
- **Stitch Domains Covered**: Domain 06 (Authentication — Login + Signup), Domain 07 (Executive Dashboard).
- **Stitch Screens Covered**: Login Screen, Signup Screen, Executive Dashboard.
- **Repository Files to Inspect**: `pages/LoginPage.tsx`, `pages/SignupPage.tsx`, `pages/DashboardPage.tsx`.
- **Repository Components to Inspect**: Auth pages and Dashboard page.
- **UI Changes Required**: Centered Layer 1 Slate auth cards (`#191f31`), `JetBrains Mono` form inputs, cyan primary buttons (`#38bdf8`), dark dashboard metric cards with tabular lining numbers (`tabular-nums`).
- **Existing UI Work to Reuse**: Auth form validation logic, Zustand session login/signup actions, dashboard API fetch hooks.
- **Functionality to Remain Untouched**: `auth.store.ts`, `client.ts` Axios 401 refresh interceptor, `returnUrl` parameter logic.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/users/`, `apps/api/src/routes/auth.routes.ts`.
- **Responsive Requirements**: Single-column auth card on mobile (`375px`), 4-column metric grid on desktop (`1440px`).
- **Accessibility Requirements**: Explicit `<label htmlFor="...">` associations, `role="alert"` on login error banners.
- **Loading / Empty / Error States**: Button disabled spinner during auth request, metric card loading skeletons.
- **Unsupported Stitch Elements**: IAM, SSO, OAuth, SAML, Passkeys, MFA, Email verification, Datadog/CloudWatch APM metrics.
- **Dependencies**: Batch 1–3.
- **Verification Requirements**: Automated verification commands + auth tests.
- **Manual QA Requirements**: Test login, signup, session restoration, and dashboard grid responsiveness.
- **Acceptance Criteria**: Auth and Dashboard pages match Stitch dark styles while preserving login/signup functionality.
- **Expected Files Likely to Change**: `pages/LoginPage.tsx`, `pages/SignupPage.tsx`, `pages/DashboardPage.tsx`.
- **Expected Files That Must NOT Change**: `auth.store.ts`, `client.ts`, backend auth handlers.

---

### BATCH 5: Projects Directory & Project Workspace
- **Objective**: Refine `ProjectsPage.tsx` and `ProjectDetailsPage.tsx` (strictly preserving the 5-tab workspace structure).
- **Stitch Domains Covered**: Domain 08 (System Projects Directory), Domain 09 (Project Workspace Hub).
- **Stitch Screens Covered**: Projects Directory, 5-Tab Project Workspace Hub.
- **Repository Files to Inspect**: `pages/ProjectsPage.tsx`, `pages/ProjectDetailsPage.tsx`, workspace tab sub-components.
- **Repository Components to Inspect**: Project list grid and ProjectDetails tab bar.
- **UI Changes Required**: Dark projects table, search bar code font, status micro-badges, workspace tab bar styling with cyan active line indicator.
- **Existing UI Work to Reuse**: Project details API hooks, tab state hooks, project selection logic.
- **Functionality to Remain Untouched**: **STRICTLY 5 TABS** (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`). Project ACL checks.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/projects/`.
- **Responsive Requirements**: Horizontally scrollable workspace tab bar on mobile (`375px`).
- **Accessibility Requirements**: `role="tablist"`, `role="tab"`, `aria-selected` attributes.
- **Loading / Empty / Error States**: Tab content loading fallback, `<EmptyState title="No projects found" />`.
- **Unsupported Stitch Elements**: 6th workspace tab (Certificates or Topology promoted to root tab).
- **Dependencies**: Batch 1–3.
- **Verification Requirements**: Automated verification commands + workspace tests.
- **Manual QA Requirements**: Verify 5 workspace tabs switch correctly and render nested sub-views.
- **Acceptance Criteria**: Project Directory and 5-Tab Workspace render Precision dark theme styling.
- **Expected Files Likely to Change**: `pages/ProjectsPage.tsx`, `pages/ProjectDetailsPage.tsx`.
- **Expected Files That Must NOT Change**: Project service, model, or route files.

---

### BATCH 6: Global Document Repository & Document Detail
- **Objective**: Refine `DocumentsPage.tsx` and `DocumentDetailsPage.tsx` presentation.
- **Stitch Domains Covered**: Domain 10 (Document Catalog / Repository), Domain 11 (Document Detail Workspace).
- **Stitch Screens Covered**: Global Document Repository, Document Detail Workspace.
- **Repository Files to Inspect**: `pages/DocumentsPage.tsx`, `pages/DocumentDetailsPage.tsx`, child detail components.
- **Repository Components to Inspect**: Document list table, Document detail reader, Metadata drawer, Version history table, Evidence panel.
- **UI Changes Required**: Global document dark table, compact row padding (`36px`), code font for IDs and sizes, structured Slate panels for Markdown Reader, Version Roster, Evidence Panel.
- **Existing UI Work to Reuse**: Markdown parser component, version history API fetch, evidence traversal hooks.
- **Functionality to Remain Untouched**: Document list queries, version history logic, evidence traversal engine.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/documents/`.
- **Responsive Requirements**: Stacked vertical panels on mobile (`375px`), scrollable document table.
- **Accessibility Requirements**: Collapsible drawer keyboard accessibility (`Enter`/`Space`), table column headers `scope="col"`.
- **Loading / Empty / Error States**: Panel loading skeletons, missing document 404 state.
- **Unsupported Stitch Elements**: Security vulnerability scanners, external CVE telemetry.
- **Dependencies**: Batch 1–3, Batch 5.
- **Verification Requirements**: Automated verification commands + document tests.
- **Manual QA Requirements**: Verify document reader renders Markdown, version history roster updates, and evidence panel expands.
- **Acceptance Criteria**: Document Repository and Document Detail match Stitch dark panel layout.
- **Expected Files Likely to Change**: `pages/DocumentsPage.tsx`, `pages/DocumentDetailsPage.tsx`.
- **Expected Files That Must NOT Change**: Document API clients, services, or models.

---

### BATCH 7: Document Creator, Version History & Version Compare
- **Objective**: Refine `DocumentCreatePage.tsx`, `DocumentEditPage.tsx`, and `VersionCompareModal.tsx`.
- **Stitch Domains Covered**: Domain 12 (Document Creator / Editor).
- **Stitch Screens Covered**: Document Creator, Version History Compare Modal.
- **Repository Files to Inspect**: `pages/DocumentCreatePage.tsx`, `pages/DocumentEditPage.tsx`, `components/documents/VersionCompareModal.tsx`.
- **Repository Components to Inspect**: Markdown editor toolbar and Version Compare diff modal.
- **UI Changes Required**: Multi-tab Markdown editor toolbar (Write, Preview, Split View), dark split view editor container, side-by-side & unified version comparison diff modal styling.
- **Existing UI Work to Reuse**: Markdown state hooks, version diff calculation engine, document create/edit API hooks.
- **Functionality to Remain Untouched**: Document create `POST` / edit `PATCH` API payloads, version diff algorithm.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/documents/`, `apps/api/src/modules/document-versions/`.
- **Responsive Requirements**: Auto-switch from Split View to Tab View on screens `< 1024px`.
- **Accessibility Requirements**: Accessible tab controls for Write/Preview mode, diff text contrast.
- **Loading / Empty / Error States**: Save button inline spinner, form validation helper text.
- **Unsupported Stitch Elements**: Rich text WYSIWYG editor (Markdown text mode only), Git branch/merge controls.
- **Dependencies**: Batch 6.
- **Verification Requirements**: Automated verification commands + compare tests.
- **Manual QA Requirements**: Test Write/Preview mode toggle, document save, and version diff comparison.
- **Acceptance Criteria**: Creator and Compare views render dark split-view styling and pass diff tests.
- **Expected Files Likely to Change**: `pages/DocumentCreatePage.tsx`, `pages/DocumentEditPage.tsx`, `components/documents/VersionCompareModal.tsx`.
- **Expected Files That Must NOT Change**: Backend document version services.

---

### BATCH 8: Knowledge Search & Risk Radar
- **Objective**: Refine `KnowledgeSearchPage.tsx` and `RiskRadarDrawer.tsx`.
- **Stitch Domains Covered**: Domain 13 (Knowledge Search / Risk Radar).
- **Stitch Screens Covered**: Technical Knowledge Search & Risk Radar Health Drawer.
- **Repository Files to Inspect**: `pages/KnowledgeSearchPage.tsx`, `components/knowledge/RiskRadarDrawer.tsx`.
- **Repository Components to Inspect**: Technical search input, candidate result list, floating Risk Radar drawer.
- **UI Changes Required**: Dark search input with cyan focus ring, candidate result item cards, side-floating Risk Radar Health Drawer (5-Factor Risk Model progress ring, HealthScore threshold badges).
- **Existing UI Work to Reuse**: Knowledge Search API hooks, 5-Factor Risk calculation helpers, drawer toggle state.
- **Functionality to Remain Untouched**: Bounded knowledge search API query, 5-Factor Risk Model calculation formula.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/knowledge-search/`.
- **Responsive Requirements**: Floating drawer converts to full-width bottom sheet on mobile (`375px`).
- **Accessibility Requirements**: `aria-expanded` on Health Drawer toggle, `aria-live="polite"` on search results.
- **Loading / Empty / Error States**: Search execution loading spinner, empty search results state.
- **Unsupported Stitch Elements**: AI LLM chatbot, vector search, RAG, Datadog APM telemetry.
- **Dependencies**: Batch 1–3.
- **Verification Requirements**: Automated verification commands + risk radar tests.
- **Manual QA Requirements**: Verify search query execution, candidate selection, and Risk Radar drawer toggle.
- **Acceptance Criteria**: Knowledge Search and Risk Radar drawer render Stitch dark styling.
- **Expected Files Likely to Change**: `pages/KnowledgeSearchPage.tsx`, `components/knowledge/RiskRadarDrawer.tsx`.
- **Expected Files That Must NOT Change**: Search ranking and risk calculation logic.

---

### BATCH 9: Change Proposals & Change Packages
- **Objective**: Refine `ReviewsPage.tsx` Change Proposals and Change Packages tabs.
- **Stitch Domains Covered**: Domain 14 (Change Proposals / Impact Cascade), Domain 15 (Change Packages / Release Planning).
- **Stitch Screens Covered**: Change Proposals Roster, Impact Cascade Simulation, Change Packages Roster.
- **Repository Files to Inspect**: `pages/ReviewsPage.tsx`, `components/reviews/ChangeProposalView.tsx`, `components/reviews/ChangePackageView.tsx`.
- **Repository Components to Inspect**: Proposal list, Impact simulation cards, Package list, Conflict category badges.
- **UI Changes Required**: Proposal status badges (`DRAFT`, `SIMULATED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`), Impact Cascade simulation cards, Change Package 5 Conflict Category micro-badges (`MUTUALLY_EXCLUSIVE_TARGET`, `INCOMPATIBLE_CONTRACT_SCHEMA`, etc.).
- **Existing UI Work to Reuse**: Proposal simulation API hooks, package conflict detection logic.
- **Functionality to Remain Untouched**: Proposal simulation API execution, 5 conflict category analysis engine.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/change-proposals/`, `apps/api/src/modules/change-packages/`.
- **Responsive Requirements**: Stacked simulation result cards on mobile (`375px`).
- **Accessibility Requirements**: Status badge `aria-label` text descriptions.
- **Loading / Empty / Error States**: Simulation progress loading spinner.
- **Unsupported Stitch Elements**: Git PR auto-creation, CI/CD deployment execution triggers.
- **Dependencies**: Batch 1–3, Batch 6.
- **Verification Requirements**: Automated verification commands + review tests.
- **Manual QA Requirements**: Test proposal simulation trigger and package conflict badge render.
- **Acceptance Criteria**: Change Proposals and Change Packages tabs render Stitch simulation styles.
- **Expected Files Likely to Change**: `pages/ReviewsPage.tsx`, `components/reviews/*`.
- **Expected Files That Must NOT Change**: Backend change services and simulation engines.

---

### BATCH 10: Verification Plans & Compliance Checklists
- **Objective**: Refine `ReviewsPage.tsx` Verification Plans tab presentation.
- **Stitch Domains Covered**: Domain 16 (Verification Plans / Compliance Checklists).
- **Stitch Screens Covered**: Verification Plans Roster, Compliance Task Checklist, Bypass Justification Modal.
- **Repository Files to Inspect**: `pages/ReviewsPage.tsx`, `components/verification/VerificationPlanView.tsx`.
- **Repository Components to Inspect**: Verification task list, Assurance Score progress bar, Skip/Bypass modal.
- **UI Changes Required**: Task status badges (`OPEN`, `VERIFIED`, `SKIPPED`), Plan state badges (`PENDING`, `COMPLETED`), Assurance Score progress bar styling, Skip/Bypass justification modal styling.
- **Existing UI Work to Reuse**: Task status update API hooks, Assurance Score percentage calculation helpers.
- **Functionality to Remain Untouched**: Task status update API payloads, Assurance Score calculation formula.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/verification-plans/`.
- **Responsive Requirements**: Compact task row layout on mobile (`375px`).
- **Accessibility Requirements**: Dialog focus trap on bypass justification modal, `aria-valuenow` on progress bar.
- **Loading / Empty / Error States**: Task update inline loading indicator.
- **Unsupported Stitch Elements**: External SOC2/ISO compliance framework claims.
- **Dependencies**: Batch 9.
- **Verification Requirements**: Automated verification commands + verification tests.
- **Manual QA Requirements**: Test task status toggle, Assurance score recalculation, and bypass modal submit.
- **Acceptance Criteria**: Verification Plans tab matches Stitch dark checklist design.
- **Expected Files Likely to Change**: `pages/ReviewsPage.tsx`, `components/verification/*`.
- **Expected Files That Must NOT Change**: Verification service and assurance score logic.

---

### BATCH 11: System Contract Matrix & Evolution Analyzer
- **Objective**: Refine `SystemContractMatrixView.tsx` and `ContractEvolutionAnalyzer.tsx`.
- **Stitch Domains Covered**: Domain 17 (System Contract Matrix / Evolution Analyzer).
- **Stitch Screens Covered**: System Contract Matrix Grid & Evolution Analyzer Drawer.
- **Repository Files to Inspect**: `components/governance/SystemContractMatrixView.tsx`, `ContractEvolutionAnalyzer.tsx`.
- **Repository Components to Inspect**: 6-tier cell precedence grid and Evolution Analyzer drawer.
- **UI Changes Required**: Refine grid cell background colors matching 6 cell precedence tiers (`NO_RELEVANT_CONTRACT_DEPENDENCY`, `MISSING_AUTHORITATIVE_CONTRACT`, `UNSUPPORTED_CONTRACT`, `BREAKING_CONTRACT_DELTA`, `STRUCTURALLY_MISALIGNED`, `ALIGNED`), Evolution Analyzer drawer code font styling (`JetBrains Mono`).
- **Existing UI Work to Reuse**: Contract matrix query API hooks, 6-tier precedence calculation functions.
- **Functionality to Remain Untouched**: Contract matrix query API, 6-tier cell precedence calculation logic.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/contract-matrix/`.
- **Responsive Requirements**: Scrollable grid container with sticky row/column headers.
- **Accessibility Requirements**: Grid cell keyboard navigation (`Arrow` keys).
- **Loading / Empty / Error States**: Matrix data loading spinner.
- **Unsupported Stitch Elements**: Postman integration, API gateway proxying, SDK generators.
- **Dependencies**: Batch 5.
- **Verification Requirements**: Automated verification commands + contract matrix tests.
- **Manual QA Requirements**: Verify contract grid renders 6 cell precedence tiers and opens evolution drawer.
- **Acceptance Criteria**: Contract Matrix and Evolution Analyzer render Stitch dark grid styling.
- **Expected Files Likely to Change**: `components/governance/SystemContractMatrixView.tsx`, `ContractEvolutionAnalyzer.tsx`.
- **Expected Files That Must NOT Change**: Contract matrix service and calculation logic.

---

### BATCH 12: System Topology Simulation Sandbox & Drift Assessor
- **Objective**: Refine `SystemTopologySimulationSandbox.tsx` canvas and drift assessor.
- **Stitch Domains Covered**: Domain 18 (System Topology Simulation / Drift Assessor).
- **Stitch Screens Covered**: System Topology Sandbox, Simulation Overlays, Drift Assessor Panel.
- **Repository Files to Inspect**: `components/relationships/SystemTopologySimulationSandbox.tsx`.
- **Repository Components to Inspect**: Topology node canvas, simulation control panel, drift assessor panel.
- **UI Changes Required**: Canvas container dark styling, node card hairline borders (`#1e293b`), link type colors (`DEPENDS_ON`, `PROVIDES_API_TO`, etc.), governance gate status badges (`PASSED`, `BLOCKED`).
- **Existing UI Work to Reuse**: Canvas render engine, topology node state hooks, drift calculation helpers.
- **Functionality to Remain Untouched**: Node bounds (`MAX_DEPTH = 3`, `MAX_NODES = 50`), topology persistence & drift service.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/topology/`.
- **Responsive Requirements**: Pan/zoom touch controls, fallback card list view on mobile (`< 768px`).
- **Accessibility Requirements**: Text list fallback option for node topology.
- **Loading / Empty / Error States**: Topology rendering spinner.
- **Unsupported Stitch Elements**: AWS/GCP cloud topology discovery, Kubernetes cluster monitoring.
- **Dependencies**: Batch 5.
- **Verification Requirements**: Automated verification commands + topology tests.
- **Manual QA Requirements**: Test topology node selection, simulation overlay toggle, and drift panel display.
- **Acceptance Criteria**: System Topology Sandbox matches Stitch dark canvas styling.
- **Expected Files Likely to Change**: `components/relationships/SystemTopologySimulationSandbox.tsx`.
- **Expected Files That Must NOT Change**: Topology persistence, simulation, and drift services.

---

### BATCH 13: System Release Lineage, Attestation & Printable Certificate
- **Objective**: Refine `SystemReleaseLineageView.tsx` and `ReleaseCertificatePrintPage.tsx`.
- **Stitch Domains Covered**: Domain 19 (System Release Lineage / Attestation Certificates), Domain 20 (Printable Release Certificate).
- **Stitch Screens Covered**: Attestation Certificate Roster, Printable Release Certificate.
- **Repository Files to Inspect**: `components/governance/SystemReleaseLineageView.tsx`, `pages/ReleaseCertificatePrintPage.tsx`.
- **Repository Components to Inspect**: Certificate roster table, SHA-256 fingerprint pill, 4-section printable document layout.
- **UI Changes Required**: Certificate roster table dark styling, monospaced SHA-256 digest pills (`JetBrains Mono`), 4-section printable document layout, `@media print` rules hiding navbar.
- **Existing UI Work to Reuse**: Certificate query API hooks, SHA-256 verification check helpers, browser print handler.
- **Functionality to Remain Untouched**: SHA-256 integrity verification, native browser print model (`window.print()`), `[T_cert]` vs `[T_now]` temporal semantics.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/release-certificates/`.
- **Responsive Requirements**: A4/Letter print page layout rules (`@page`).
- **Accessibility Requirements**: Monospaced hash one-click copy trigger with ARIA feedback.
- **Loading / Empty / Error States**: Certificate document loading fallback.
- **Unsupported Stitch Elements**: Private key management, PKI, X.509 CA certification, server-side PDF generators.
- **Dependencies**: Batch 5.
- **Verification Requirements**: Automated verification commands + certificate print tests.
- **Manual QA Requirements**: Verify certificate roster table, SHA-256 copy trigger, and browser Print Preview (`@media print`).
- **Acceptance Criteria**: Release Lineage and Printable Certificate match Stitch dark table and print layout.
- **Expected Files Likely to Change**: `components/governance/SystemReleaseLineageView.tsx`, `pages/ReleaseCertificatePrintPage.tsx`.
- **Expected Files That Must NOT Change**: Release certificate data services.

---

### BATCH 14: Administration, Trash & Error Fallbacks
- **Objective**: Refine `UsersPage.tsx`, `UserDetailsPage.tsx`, `EditUserPage.tsx`, `TrashPage.tsx`, `NotFoundPage.tsx`, and `ErrorBoundary.tsx`.
- **Stitch Domains Covered**: Domain 21 (Administration / Trash / Error Fallbacks).
- **Stitch Screens Covered**: User Management Directory, Edit User Form, Soft-Delete Trash, 404 Page Not Found, ErrorBoundary.
- **Repository Files to Inspect**: `pages/UsersPage.tsx`, `pages/UserDetailsPage.tsx`, `pages/EditUserPage.tsx`, `pages/TrashPage.tsx`, `pages/NotFoundPage.tsx`, `components/ErrorBoundary.tsx`.
- **Repository Components to Inspect**: Admin User table, Edit User card, Trash table, Restore modal, 404 card, ErrorBoundary box.
- **UI Changes Required**: Dark table styling for User Directory and Trash, disabled self-protection alert card, soft-deleted documents table with Restore modal, centered 404 message card, global ErrorBoundary alert box.
- **Existing UI Work to Reuse**: Admin user API hooks, soft-delete query hooks, Document restore API hooks.
- **Functionality to Remain Untouched**: Admin self-protection logic (`SELF_DELETION_NOT_ALLOWED`), Document soft-delete restore API payload (`PATCH /restore`), 401/403 route interceptors.
- **Backend/API Files to Remain Unchanged**: `apps/api/src/modules/users/`, `apps/api/src/modules/documents/`.
- **Responsive Requirements**: Stacked user form fields on mobile (`375px`), responsive Trash table.
- **Accessibility Requirements**: `role="alert"` on global ErrorBoundary, accessible modal traps.
- **Loading / Empty / Error States**: `<EmptyState title="No deleted items found" />`, User table loading spinner.
- **Unsupported Stitch Elements**: User Restore UI, Permanent Purge UI, Retention countdowns, DB backup/restore UI.
- **Dependencies**: Batch 1–4.
- **Verification Requirements**: Automated verification commands + admin & trash tests.
- **Manual QA Requirements**: Test admin user list, edit user form with self-protection guard, Document restore action in Trash, 404 route fallback.
- **Acceptance Criteria**: Administration, Trash, 404, and ErrorBoundary render Precision dark theme styling while preserving all security guards.
- **Expected Files Likely to Change**: `pages/UsersPage.tsx`, `pages/UserDetailsPage.tsx`, `pages/EditUserPage.tsx`, `pages/TrashPage.tsx`, `pages/NotFoundPage.tsx`, `components/ErrorBoundary.tsx`.
- **Expected Files That Must NOT Change**: Admin self-protection services, Document restore backend controllers.

---

## 6. GIT WORKFLOW PER BATCH

For each implementation batch, execution will strictly follow this controlled workflow:

1. **Research Verification**: Verify repository files and target Stitch screens.
2. **Implementation Plan Creation**: Write batch-specific implementation plan.
3. **Plan Review**: Review plan against safety boundaries.
4. **Feature Branch Creation**: Create dedicated batch feature branch (e.g. `feature/stitch-batch-1`).
5. **Incremental Implementation**: Apply JSX styling updates without touching business logic.
6. **Automated Verification**: Run required verification commands:
   ```bash
   pnpm --filter web typecheck
   pnpm --filter web lint
   pnpm --filter web test
   pnpm --filter web build
   git diff --check
   ```
7. **Manual QA**: Verify desktop (1440px), laptop (1024px), tablet (800px), and mobile (375px) viewports.
8. **Fixes & Refinements**: Address any layout or styling defects.
9. **Final Verification**: Re-run automated verification commands.
10. **Explicit User Authorization**: Present completion report and request approval to merge.
11. **Merge & Cleanup**: Merge feature branch to `main` (`git merge --no-ff`), push to `origin/main`, delete feature branch.

---

## 7. FINAL FULL-MIGRATION VERIFICATION & MASTER ACCEPTANCE CRITERIA

### Full-Migration Verification Process
After completion of Batch 14, a final full-product verification audit will be conducted to confirm:
- [x] All 21 Stitch design domains are fully migrated and styled with Precision Slate dark theme tokens.
- [x] All 17 actual application routes map 1-to-1 to Stitch designs.
- [x] Login (`/login`) and Signup (`/signup`) render dark auth card layouts.
- [x] Executive Dashboard renders metric cards with tabular lining numbers.
- [x] Projects Directory and Project Workspace render strictly **EXACTLY FIVE TABS** (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`).
- [x] Document Catalog, Document Detail, Creator, Version History, and Version Compare diff modal match Stitch designs.
- [x] Knowledge Search and Risk Radar Health Drawer render 5-Factor Risk Model progress rings.
- [x] Reviews Page renders Change Proposals (Impact Cascade), Change Packages (5 conflict categories), and Verification Plans (task checklists & Assurance Score).
- [x] System Contract Matrix renders 6-tier cell precedence grid and Evolution Analyzer drawer.
- [x] System Topology Sandbox renders canvas nodes, simulation overlays, and drift assessor panel.
- [x] Release Lineage renders certificate roster table and SHA-256 digest pills.
- [x] Printable Release Certificate renders 4-section printable document and satisfies `@media print` rules.
- [x] User Management renders admin directory table and respects self-protection guards.
- [x] Soft-Delete Trash renders deleted documents table and handles `PATCH /restore` action.
- [x] 404 Page Not Found and ErrorBoundary render Precision Alert styling.
- [x] Unsupported features (User Restore, Permanent Purge, IAM/SSO, CI/CD, APM) are 100% absent.
- [x] Backend services, API contracts, Mongoose models, calculation formulas, and ACL controls remain 100% unchanged.
- [x] `pnpm --filter web typecheck` passes cleanly.
- [x] `pnpm --filter web lint` passes cleanly.
- [x] `pnpm --filter web test` passes cleanly.
- [x] `pnpm --filter web build` compiles cleanly.
- [x] `git diff --check` passes cleanly.
- [x] 4-breakpoint responsive browser QA passes cleanly.

---

## 8. SUMMARY REPORT & READINESS STATUS

1. **Plan File Created**: `docs/plans/POST-COMPLETION-COMPLETE-STITCH-UI-MIGRATION-IMPLEMENTATION-PLAN.md`
2. **21-Domain Coverage**: **100% (21 / 21 Stitch domains fully planned)**
3. **17-Route Coverage**: **100% (17 / 17 actual application routes fully planned)**
4. **14-Batch Dependency Sequence**: Batches 1 through 14 fully defined in strict dependency order.
5. **Existing UI Already Aligned**: Domain 01 (Product Identity), Domain 02 (Blueprint).
6. **UI Requiring Refinement**: Shared primitives (`Button`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`, `Input`, `Select`, `LoadingSpinner`, `EmptyState`) and App Layout shell containers.
7. **UI Requiring Migration**: Feature pages across Auth, Dashboard, Projects, Workspace 5 Tabs, Document Repository, Document Detail Reader, Creator, Risk Radar, Reviews, Contract Matrix, Topology Sandbox, Release Certificates, Administration, Trash, 404, ErrorBoundary.
8. **Unsupported Elements (Strictly Excluded)**: User Restore UI, Permanent Purge UI, Retention Countdowns, Project Trash UI, Version Delete UI, IAM/SSO/OAuth, Git/CI/CD Execution, APM Telemetry, Server-side PDF generation, DB Backup UI.
9. **Functional Preservation Boundaries**: All backend APIs, Mongoose models, Zustand auth store state, calculation engines, and security/ACL guards are frozen and preserved.
10. **Verification Strategy**: 5-step automated verification suite (`typecheck`, `lint`, `test`, `build`, `git diff --check`) + 4-breakpoint responsive browser QA per batch.
11. **Final Readiness Status**: **READY FOR PLAN REVIEW**
