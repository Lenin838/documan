# DOCUMAN — STITCH TO REPOSITORY IMPLEMENTATION READINESS AUDIT

**Target Document**: `docs/research/POST-COMPLETION-STITCH-TO-REPOSITORY-IMPLEMENTATION-AUDIT.md`  
**Status**: AUDIT COMPLETE  
**Mode**: RESEARCH & IMPLEMENTATION-READINESS ANALYSIS ONLY — Zero modifications to source code, lockfiles, UI, or Stitch designs executed.

---

## 1. EXECUTIVE SUMMARY

This report presents an exhaustive implementation-readiness audit to evaluate whether the approved **Documan High-Fidelity Design System & UI Kit** (Stitch Project ID: `projects/9852339151029178160`, covering **Domains 00 through 21**) can be safely, incrementally, and predictably implemented into the existing production codebase (`apps/web/src/` and `apps/api/src/`) without modifying underlying business logic, breaking API contracts, or compromising existing security/ACL controls.

### Primary Audit Conclusion:
**"YES. The approved complete Documan Stitch UI/UX can be implemented into the current production repository safely, incrementally, and without changing existing product functionality, provided that implementation proceeds according to the 14 disciplined implementation batches and strict business-logic preservation constraints established in this audit."**

---

## 2. CURRENT PRODUCT STATUS

- **Original Development Core**: Phases 1–32 = **100% COMPLETE**. (There is no Phase 33).
- **Post-Completion Milestone**: POST-COMPLETION STITCH UI/UX IMPLEMENTATION.
- **Stitch Design System Status**: Complete, fully audited, and approved (**Documan High-Fidelity Design System & UI Kit**, `projects/9852339151029178160`).
- **Implementation Goal**: Transition the current web client from its functional baseline UI to the high-fidelity **Precision Blueprint / Deterministic Ledger** visual theme without altering backend APIs, MongoDB schemas, authorization rules, or calculation logic.

---

## 3. SOURCE-OF-TRUTH HIERARCHY

During implementation planning and execution, conflicts must be resolved according to the following strict hierarchy:

1. **CURRENT REPOSITORY FUNCTIONALITY**: Authoritative for business logic, data models, services, calculations, security boundaries, and API signatures.
2. **CURRENT API / MODELS / SERVICES / AUTHORIZATION**: Authoritative for backend capabilities and role permissions.
3. **APPROVED STITCH DESIGN**: Authoritative for layout structure, visual hierarchy, dark-mode styling tokens (`slate-950`/`slate-900`), micro-animations, typography, and component presentation.
4. **EXISTING DESIGN SYSTEM**: Authoritative for shared CSS utility classes and design tokens (`index.css`).
5. **EXISTING RESEARCH DOCUMENTATION**: Authoritative for domain-specific boundaries (`docs/research/`).

*Rule*: If Stitch presents a visual UI control for an unsupported backend feature (e.g., User Restore, Permanent Purge, or IAM/SSO), the repository backend functionality is authoritative: **DO NOT IMPLEMENT THE UNSUPPORTED CAPABILITY.**

---

## 4. REPOSITORY INVENTORY

- **Frontend Application Root**: `apps/web/`
  - Routes File: `apps/web/src/App.tsx` (17 active client routes + global ErrorBoundary)
  - Layout Wrapper: `apps/web/src/components/layout/AppLayout.tsx`
  - Global CSS: `apps/web/src/index.css` (Tailwind CSS configuration & slate theme tokens)
  - Auth Store: `apps/web/src/features/auth/auth.store.ts` (Zustand state management)
  - API Client: `apps/web/src/features/api/client.ts` (Axios instance with 401 refresh token interceptor)
- **Backend API Root**: `apps/api/`
  - Feature Modules: `apps/api/src/modules/` (`documents`, `projects`, `users`, `document-versions`, `document-shares`, `folders`, `knowledge-search`, `change-proposals`, `change-packages`, `verification-plans`, `contract-matrix`, `topology`, `release-certificates`)
  - Server Entry: `apps/api/src/server.ts` & `apps/api/src/app.ts`

---

## 5. STITCH INVENTORY

- **Project ID**: `projects/9852339151029178160`
- **Design System Name**: Precision Blueprint / Deterministic Ledger
- **Color Theme**: Slate Dark Mode Canvas (`#0c1324`), Container Fill (`#191f31`), Border Hairline (`#1e293b`)
- **Typography Tokens**: `Inter` (UI/Headlines) + `JetBrains Mono` (Audit/Hashes/Telemetry)
- **Domain Coverage**: 22 out of 22 domains (Domains 00–21) fully represented.

---

## 6. ROUTE-TO-STITCH MAPPING

| Route Path | Repository Page Component | Stitch Screen Target | Implementation Status | Risk |
| :--- | :--- | :--- | :---: | :---: |
| `/login` | `LoginPage.tsx` | Auth — Login Screen | **PARTIAL** | Low |
| `/signup` | `SignupPage.tsx` | Auth — Signup Screen | **PARTIAL** | Low |
| `/dashboard` | `DashboardPage.tsx` | Dashboard Overview | **PARTIAL** | Low |
| `/knowledge/search` | `KnowledgeSearchPage.tsx` | Knowledge Search & Risk Radar | **PARTIAL** | Medium |
| `/projects` | `ProjectsPage.tsx` | Projects Directory | **PARTIAL** | Low |
| `/projects/:id` | `ProjectDetailsPage.tsx` | 5-Tab Project Workspace | **PARTIAL** | High |
| `/documents` | `DocumentsPage.tsx` | Global Document Repository | **PARTIAL** | Low |
| `/documents/create` | `DocumentCreatePage.tsx` | Document Creator | **PARTIAL** | Medium |
| `/documents/:id` | `DocumentDetailsPage.tsx` | Document Detail & Version History | **PARTIAL** | High |
| `/documents/:id/edit` | `DocumentEditPage.tsx` | Document Editor | **PARTIAL** | Medium |
| `/trash` | `TrashPage.tsx` | Soft-Delete Document Trash | **PARTIAL** | Low |
| `/reviews` | `ReviewsPage.tsx` | Proposals, Packages & Verification | **PARTIAL** | Medium |
| `/projects/:pId/release-certificates/:cId/print` | `ReleaseCertificatePrintPage.tsx` | Printable Release Certificate | **PARTIAL** | Low |
| `/users` | `UsersPage.tsx` | Admin User Directory | **PARTIAL** | Medium |
| `/users/:id` | `UserDetailsPage.tsx` | Admin User Details | **PARTIAL** | Low |
| `/users/:id/edit` | `EditUserPage.tsx` | Admin Edit User | **PARTIAL** | Medium |
| `*` | `NotFoundPage.tsx` | 404 Route Not Found | **PARTIAL** | Low |
| *(App Error)* | `ErrorBoundary.tsx` | Application Error Boundary | **PARTIAL** | Low |

---

## 7. DOMAIN 00–21 MAPPING

Every domain (00–21) has an established research baseline in `docs/research/` and maps directly to frontend page/component structures in `apps/web/src/`:
- **Domain 00 (Cover & Product Identity)** & **Domain 01 (Product Blueprint)**: Governed by `index.css` tokens and `AppLayout.tsx`.
- **Domain 02 (Tokens)** & **Domain 03 (Primitives)**: Governed by `apps/web/src/components/common/`.
- **Domain 04 (Shell)**: Governed by `AppLayout.tsx` & `Sidebar.tsx`.
- **Domain 05 (Auth)**: Governed by `LoginPage.tsx` & `SignupPage.tsx`.
- **Domain 06 (Dashboard)**: Governed by `DashboardPage.tsx`.
- **Domain 07 (Projects)** & **Domain 08 (Project Workspace)**: Governed by `ProjectsPage.tsx` & `ProjectDetailsPage.tsx`.
- **Domain 09 (Documents)**, **10 (Doc Detail)**, **11 (Creator)**: Governed by `DocumentsPage.tsx`, `DocumentDetailsPage.tsx`, `DocumentCreatePage.tsx`, `DocumentEditPage.tsx`.
- **Domain 12 (Knowledge & Risk Radar)**: Governed by `KnowledgeSearchPage.tsx` & `RiskRadarDrawer.tsx`.
- **Domain 13 (Proposals)**, **14 (Packages)**, **15 (Verification)**: Governed by `ReviewsPage.tsx`.
- **Domain 16 (Contract Matrix)** & **17 (Topology Sandbox)**: Governed by sub-views in `ProjectDetailsPage.tsx`.
- **Domain 18 (Lineage)** & **19 (Printable Certificate)**: Governed by `GovernanceTab.tsx` & `ReleaseCertificatePrintPage.tsx`.
- **Domain 20 (Administration)**: Governed by `UsersPage.tsx`, `UserDetailsPage.tsx`, `EditUserPage.tsx`.
- **Domain 21 (Trash & Error Fallbacks)**: Governed by `TrashPage.tsx`, `NotFoundPage.tsx`, `ErrorBoundary.tsx`.

---

## 8. DESIGN SYSTEM AUDIT

- **`index.css`**: Currently contains baseline CSS variables. Needs refinement to include exact Stitch Tailwind color mappings (`slate-950`, `#0c1324` canvas; `#191f31` container fill; `#1e293b` border hairline; `#38bdf8` sky cyan; `#a855f7` violet; `#10b981` emerald; `#f43f5e` rose).
- **Typography**: Tailwind font family mapping must expose `font-sans` (`Inter`) and `font-mono` (`JetBrains Mono`).

---

## 9. SHARED COMPONENT AUDIT

| Primitive Component | Location | Current Implementation | Stitch Target | Refinement Required |
| :--- | :--- | :--- | :--- | :--- |
| `Button.tsx` | `components/common/` | Functional React button | Precision dark-mode button with sky cyan hover | Style Refinement |
| `Badge.tsx` | `components/common/` | Pill badge | Dual-part micro-badge (`label-code-sm` font) | Style & Code Font |
| `Card.tsx` | `components/common/` | White/Dark container | Layer 1 Slate container (`#191f31`, border `#1e293b`) | Style Refinement |
| `Table.tsx` | `components/common/` | Basic HTML table | Monospaced hashes, `36px` compact rows, zero-delay hover | Style & Font Refinement |
| `Tabs.tsx` | `components/common/` | Standard tab buttons | High-density underline tabs with active indicator | Style Refinement |
| `Dialog.tsx` | `components/common/` | Basic modal overlay | Hairline bordered modal (`#1e293b`) with focus lock | Style Refinement |
| `Input.tsx` | `components/common/` | Standard text input | `JetBrains Mono` query input with cyan focus ring | Style & Font Refinement |
| `LoadingSpinner.tsx` | `components/common/` | SVG spinner | Cyan glowing SVG spinner with ARIA live feedback | Style Refinement |
| `EmptyState.tsx` | `components/common/` | Basic alert card | Slate container with code icon & primary trigger | Style Refinement |
| `ErrorBoundary.tsx` | `components/` | React class boundary | Precision Alert card with "Reload Application" button | Style Refinement |

---

## 10. APPLICATION SHELL AUDIT

- **`AppLayout.tsx`**: Houses top navigation bar, sidebar drawer, and breadcrumb container.
- **Visual Changes**: Refine background fill to `#0c1324`, add hairline slate borders (`#1e293b`), update sidebar active link states to cyan accent glow.
- **Authorization**: Keep `ProtectedRoute` and Zustand auth store checks 100% untouched.

---

## 11. AUTHENTICATION AUDIT

- **`LoginPage.tsx` & `SignupPage.tsx`**: Update layout to centered slate card (`#191f31`), style text inputs with `JetBrains Mono` for password/email, update primary action button to cyan fill (`#38bdf8`).
- **Auth Rules**: Retain local JWT authentication, token refresh interceptor, and `returnUrl` navigation logic intact.
- **Prohibitions**: Do NOT introduce SSO, OAuth, MFA, SAML, or email verification flows.

---

## 12. DASHBOARD / PROJECTS AUDIT

- **`DashboardPage.tsx`**: Apply Layer 1 Slate cards (`#191f31`), update metrics widgets to monospaced numeric figures (`tabular-nums`), preserve dynamic API queries.
- **`ProjectsPage.tsx`**: Update project grid/table layout with search input and status micro-badges.

---

## 13. PROJECT WORKSPACE AUDIT — CRITICAL

- **Canonical 5-Tab Constraint**: The workspace MUST strictly maintain **EXACTLY FIVE TABS**:
  1. `Overview`
  2. `Documents`
  3. `Relationships`
  4. `Knowledge`
  5. `Governance`
- **Verification**: Both repository code in `ProjectDetailsPage.tsx` and the Stitch UI design strictly adhere to this 5-tab architecture.
- **Sub-Views**: Contract Matrix, Topology Sandbox, Release Certificates, and Compliance Audits are properly nested within `Relationships` and `Governance` tabs.

---

## 14. DOCUMENTS AUDIT

- **`DocumentsPage.tsx`**: Style global document table, update search bar, filter dropdowns, and create document button.
- **`DocumentDetailsPage.tsx`**: Refactor visual layout into structured Slate panels: Markdown Reader, Metadata Drawer, Version History Roster, and Evidence Panel.
- **`DocumentCreatePage.tsx` & `DocumentEditPage.tsx`**: Refine Markdown editor with Write, Preview, and Split View tabs. Preserve save API calls (`POST /api/v1/documents`, `PATCH /api/v1/documents/:id`).

---

## 15. KNOWLEDGE / CHANGE / VERIFICATION AUDIT

- **`KnowledgeSearchPage.tsx`**: Update technical search bar, result list, and side-floating Risk Radar drawer (HealthScore, 5-Factor Risk Model).
- **`ReviewsPage.tsx`**: Update tabbed interface for Change Proposals (Simulation & Impact Cascade), Change Packages (5 Conflict Categories), and Verification Plans (Task Status & Assurance calculation).
- **Business Logic Protection**: Retain all backend risk calculation formulas, simulation limit parameters, and lifecycle state machines intact.

---

## 16. SYSTEM CONTRACT MATRIX AUDIT

- **`SystemContractMatrixView.tsx`**: Refine grid cell presentation matching the 6-tier cell precedence (`NO_RELEVANT_CONTRACT_DEPENDENCY`, `MISSING_AUTHORITATIVE_CONTRACT`, `UNSUPPORTED_CONTRACT`, `BREAKING_CONTRACT_DELTA`, `STRUCTURALLY_MISALIGNED`, `ALIGNED`).
- **Analyzer Panel**: Refine Evolution Analyzer drawer displaying endpoint and schema delta codes.

---

## 17. SYSTEM TOPOLOGY AUDIT

- **`SystemTopologySimulationSandbox.tsx`**: Refine canvas visualization for nodes and link types (`DEPENDS_ON`, `PROVIDES_API_TO`, `INTEGRATES_WITH`, `SHARED_LIBRARY`).
- **Simulation Constraints**: Maintain `MAX_DEPTH = 3` and `MAX_NODES = 50` hard limits in UI controls and service calls.

---

## 18. RELEASE / CERTIFICATE AUDIT

- **`SystemReleaseLineageView.tsx`**: Refine attestation certificate roster, SHA-256 digest pills (`JetBrains Mono`), and `ACTIVE`/`REVOKED` status badges.
- **`ReleaseCertificatePrintPage.tsx`**: Refine standalone print layout using CSS `@media print` rules. Ensure zero print-hidden toolbars appear on printed PDF output.
- **Temporal Semantics**: Strictly preserve `[T_cert]` (Certified Snapshot) and `[T_now]` (Live Baseline). Prohibit `[T_predicted]` in Domains 18 & 19.

---

## 19. ADMINISTRATION AUDIT

- **`UsersPage.tsx`, `UserDetailsPage.tsx`, `EditUserPage.tsx`**: Refine user directory table, role selector (`user`, `admin`), and edit user form.
- **Admin Self-Protection**: Preserve disabled UI state and server rejection for admin self-deletion (`SELF_DELETION_NOT_ALLOWED`) and self-demotion (`SELF_MODIFICATION_NOT_ALLOWED`).
- **Prohibitions**: Do NOT add user restoration or hard purge controls.

---

## 20. TRASH / ERROR FALLBACK AUDIT

- **`TrashPage.tsx`**: Refine deleted documents table (`GET /api/v1/documents?isDeleted=true`) and Restore button (`PATCH /api/v1/documents/:id/restore`).
- **`NotFoundPage.tsx`**: Refine centered 404 message card with "Go to Dashboard" button.
- **`ErrorBoundary.tsx`**: Refine global error fallback card with "Reload Application" button.
- **Prohibitions**: Do NOT introduce permanent delete/purge controls, retention countdowns, or user/project trash.

---

## 21. BUSINESS LOGIC PROTECTION

The following business logic elements MUST remain 100% unchanged during UI implementation:

1. **API Signatures & Payloads**: All Axios client requests and parameters in `apps/web/src/features/`.
2. **MongoDB Schemas & Models**: All Mongoose models in `apps/api/src/modules/`.
3. **Role-Based Authorization**: `ProtectedRoute` checks (`user.role === 'admin'`).
4. **Auth Store & Token Rotation**: `useAuthStore` and Axios 401 refresh interceptors.
5. **Risk Radar Calculations**: 5-Factor HealthScore calculation formula.
6. **Change Simulation Limits**: Proposal and package blast radius evaluation rules.
7. **Verification Assurance**: Formula calculating percentage of verified vs skipped tasks.
8. **Contract Cell Precedence**: 6-tier matrix precedence evaluation rules.
9. **Topology Overlay Limits**: `MAX_DEPTH = 3` and `MAX_NODES = 50`.
10. **Attestation Hash Integrity**: SHA-256 verification generation and check logic.
11. **Admin Self-Protection**: Backend validation preventing admin self-deletion/modification.
12. **Document Soft-Delete Lifecycle**: `isDeleted = true` flag update and restore endpoint.

---

## 22. UI CHANGE CLASSIFICATION

Every required implementation task falls into one of the following UI change categories:
- **A — Already Matches**: Existing functional logic and routing.
- **B — Visual Refinement**: Updating Tailwind CSS background, text, and border classes.
- **C — Shared Component Refinement**: Updating primitive styles in `components/common/`.
- **D — Page Refactor / Decomposition**: Updating layout grids without breaking component props.
- **E — New UI State**: Adding missing empty/loading/error state UI representations.
- **F — Responsive Improvement**: Adding mobile/tablet breakpoint utility classes (`md:`, `lg:`).
- **G — Accessibility Improvement**: Adding ARIA labels, focus rings, and role attributes.
- **H — Routing Change**: None required (all routes exist).
- **I — Print Styling Change**: Updating `@media print` CSS rules in `ReleaseCertificatePrintPage.tsx`.
- **J — Design Conflict**: None identified.

---

## 23. REGRESSION RISK ASSESSMENT

| Domain / Area | Regression Risk Level | Risk Rationale & Mitigation |
| :--- | :---: | :--- |
| **Authentication** | **LOW** | Presentation-only edit. Auth store and Axios interceptors remain untouched. |
| **Project Workspace** | **HIGH** | Complex 5-tab state & lazy component mounting. Preserve tab state & prop interfaces. |
| **Document Detail** | **HIGH** | Multiple sub-panels (Markdown, Versions, Evidence). Update CSS classes incrementally. |
| **Knowledge & Risk** | **MEDIUM** | Risk Radar health drawer overlay. Keep state hooks untouched while updating styles. |
| **Change Reviews** | **MEDIUM** | Tabbed proposal/package/verification reviews. Preserve state machines & simulation calls. |
| **Contract Matrix** | **MEDIUM** | Grid cell precedence rendering. Retain matrix calculation functions intact. |
| **Topology Sandbox** | **MEDIUM** | Canvas node rendering. Preserve node limit constants (`MAX_DEPTH=3`, `MAX_NODES=50`). |
| **Release Certificates**| **LOW** | Lineage table and print page. Retain SHA-256 hash formatting and `@media print` rules. |
| **Administration** | **MEDIUM** | Admin self-protection logic. Keep disabled button logic and server validation active. |
| **Trash & Fallbacks** | **LOW** | Document restore table & error boundary. Preserve `PATCH /restore` API payload. |

---

## 24. PERFORMANCE RISK

- **Large Component Rendering**: `DocumentDetailsPage` and `ProjectDetailsPage` contain multiple nested panels. Ensure sub-components (such as `VersionHistoryTable` or `EvidencePanel`) remain wrapped in `React.memo` or lazy-loaded where applicable.
- **Table Virtualization / Compact Rows**: Ensure large document tables use `36px` compact rows and proper key props to prevent re-render lag.

---

## 25. RESPONSIVE AUDIT

All 22 domains must be verified across four standard responsive breakpoints:
1. **1440px Desktop**: Full expanded sidebar, multi-column grid containers, side-by-side split views.
2. **1024px Laptop / Tablet**: Collapsed navigation drawer, compact data tables.
3. **800px Tablet**: Single-column form containers, scrollable horizontal tables.
4. **375px Mobile**: Stacked vertical cards, full-width buttons, zero horizontal viewport overflow.

---

## 26. ACCESSIBILITY AUDIT

- **Keyboard Focus**: Ensure all interactive controls receive a crisp outer focus ring (`focus:ring-1 focus:ring-sky-400`).
- **Screen Reader Announcements**: Ensure `<LoadingSpinner />` elements contain `aria-live="polite"` and `sr-only` loading text.
- **Semantic Structure**: Maintain single `<h1>` per page and explicit `<label htmlFor="...">` associations.

---

## 27. SAMPLE DATA AUDIT

All production implementations must consume real dynamic data from backend API endpoints and Zustand stores:
- **Prohibited**: Hard-coding static Stitch prototype values (e.g., sample user names, mock commit hashes, or hardcoded project IDs) into production page components.
- **Required**: Binding component props to dynamic API response models (`IDocument`, `IProject`, `IUser`, `IReleaseCertificate`).

---

## 28. PRODUCT BOUNDARY AUDIT

The implementation MUST NOT introduce the following unsupported external capabilities:
- **IAM / SSO / OAuth / SAML / SCIM / MFA**: Prohibited.
- **Git Commit / PR / CI/CD Execution**: Prohibited.
- **APM Telemetry / Cloud Monitoring**: Prohibited.
- **Server-Side PDF Generators**: Prohibited (use browser print-to-PDF).
- **User Restore / Permanent Purge**: Prohibited.

---

## 29. TEMPORAL SEMANTICS AUDIT

- **`[T_cert]`**: Applied exclusively to frozen historical release certificates (Domains 18 & 19).
- **`[T_now]`**: Applied to live current baselines (Documents, Projects, Topology).
- **`[T_predicted]`**: Applied strictly to Change Proposal simulations (Domain 13), Package conflicts (Domain 14), and Topology sandbox overlays (Domain 17). Prohibited in Domains 18 & 19.

---

## 30. IMPLEMENTATION DEPENDENCY ANALYSIS

Implementation must follow a strict dependency hierarchy:
1. **Foundation Level**: `index.css` Tailwind tokens & slate color variables.
2. **Primitive Level**: Shared UI components in `components/common/` (`Button`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`, `Input`, `Select`, `LoadingSpinner`, `EmptyState`).
3. **Shell Level**: `AppLayout.tsx`, top navigation bar, sidebar drawer, and breadcrumbs.
4. **Page Level**: Feature pages and domain views (Auth, Dashboard, Projects, Workspace, Documents, Reviews, Users, Trash).

---

## 31. RECOMMENDED IMPLEMENTATION BATCHES

To minimize regression risk and enable continuous automated testing, the implementation is structured into **14 disciplined batches**:

### Batch 1: Design System Tokens & Global Foundation
- **Scope**: Update `index.css` with exact Stitch color tokens (`slate-950`, `#0c1324`, `#191f31`, `#1e293b`, `#38bdf8`, `#a855f7`, `#10b981`, `#f43f5e`) and typography classes (`Inter`, `JetBrains Mono`).
- **Affected Files**: `apps/web/src/index.css`, `tailwind.config.js`.
- **Risk**: Low.

### Batch 2: Shared UI Primitives
- **Scope**: Refine shared primitives in `apps/web/src/components/common/` (`Button`, `Badge`, `Card`, `Table`, `Tabs`, `Dialog`, `Input`, `Select`, `LoadingSpinner`, `EmptyState`, `ErrorBoundary`).
- **Affected Files**: `components/common/*`, `components/ErrorBoundary.tsx`.
- **Risk**: Low (High reusability).

### Batch 3: Application Shell & Global Layout
- **Scope**: Refine `AppLayout.tsx`, top navigation bar, sidebar drawer, mobile drawer, role-aware nav items, and breadcrumb container.
- **Affected Files**: `components/layout/AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`.
- **Risk**: Medium.

### Batch 4: Authentication & Dashboard
- **Scope**: Refine `LoginPage.tsx`, `SignupPage.tsx`, and `DashboardPage.tsx` using Layer 1 Slate cards and monospaced metric figures.
- **Affected Files**: `pages/LoginPage.tsx`, `pages/SignupPage.tsx`, `pages/DashboardPage.tsx`.
- **Risk**: Low.

### Batch 5: Projects Directory & 5-Tab Workspace
- **Scope**: Refine `ProjectsPage.tsx` and `ProjectDetailsPage.tsx` (preserving strictly 5 tabs: Overview, Documents, Relationships, Knowledge, Governance).
- **Affected Files**: `pages/ProjectsPage.tsx`, `pages/ProjectDetailsPage.tsx`, workspace tab sub-components.
- **Risk**: High.

### Batch 6: Global Document Repository & Document Detail
- **Scope**: Refine `DocumentsPage.tsx` and `DocumentDetailsPage.tsx` (Markdown reader, metadata drawer, version history table, evidence panel).
- **Affected Files**: `pages/DocumentsPage.tsx`, `pages/DocumentDetailsPage.tsx`.
- **Risk**: High.

### Batch 7: Document Creator, Version History & Version Compare
- **Scope**: Refine `DocumentCreatePage.tsx`, `DocumentEditPage.tsx`, and side-by-side / unified Version Compare modal.
- **Affected Files**: `pages/DocumentCreatePage.tsx`, `pages/DocumentEditPage.tsx`, `components/documents/VersionCompareModal.tsx`.
- **Risk**: Medium.

### Batch 8: Knowledge Search & Risk Radar
- **Scope**: Refine `KnowledgeSearchPage.tsx`, technical search result items, and floating Risk Radar health drawer (5-factor risk model).
- **Affected Files**: `pages/KnowledgeSearchPage.tsx`, `components/knowledge/RiskRadarDrawer.tsx`.
- **Risk**: Medium.

### Batch 9: Change Proposals & Change Packages
- **Scope**: Refine `ReviewsPage.tsx` Change Proposals tab (Impact Cascade, simulation UI) and Change Packages tab (5 conflict category badges).
- **Affected Files**: `pages/ReviewsPage.tsx`, `components/reviews/*`.
- **Risk**: Medium.

### Batch 10: Verification Plans & Compliance Checklists
- **Scope**: Refine `ReviewsPage.tsx` Verification Plans tab (Task status indicators, assurance progress bar, skip/bypass justification modal).
- **Affected Files**: `pages/ReviewsPage.tsx`, `components/verification/*`.
- **Risk**: Medium.

### Batch 11: System Contract Matrix & Evolution Analyzer
- **Scope**: Refine `SystemContractMatrixView.tsx` (6-tier cell precedence matrix) and `ContractEvolutionAnalyzer.tsx` panel.
- **Affected Files**: `components/governance/SystemContractMatrixView.tsx`, `ContractEvolutionAnalyzer.tsx`.
- **Risk**: Medium.

### Batch 12: System Topology Simulation Sandbox & Drift Assessor
- **Scope**: Refine `SystemTopologySimulationSandbox.tsx` (canvas node links, simulation overlays, governance gate status, drift assessor).
- **Affected Files**: `components/relationships/SystemTopologySimulationSandbox.tsx`.
- **Risk**: Medium.

### Batch 13: System Release Lineage, Attestation & Printable Certificate
- **Scope**: Refine `SystemReleaseLineageView.tsx` certificate roster and `ReleaseCertificatePrintPage.tsx` standalone printable document (`@media print`).
- **Affected Files**: `components/governance/SystemReleaseLineageView.tsx`, `pages/ReleaseCertificatePrintPage.tsx`.
- **Risk**: Low.

### Batch 14: Administration, Trash & Error Fallbacks
- **Scope**: Refine `UsersPage.tsx`, `UserDetailsPage.tsx`, `EditUserPage.tsx`, `TrashPage.tsx` (document restore), and `NotFoundPage.tsx`.
- **Affected Files**: `pages/UsersPage.tsx`, `pages/UserDetailsPage.tsx`, `pages/EditUserPage.tsx`, `pages/TrashPage.tsx`, `pages/NotFoundPage.tsx`.
- **Risk**: Medium.

---

## 32. BATCH EXECUTION RULES

Each implementation batch must strictly adhere to the following rules:
1. **Cohesive & Independent**: Each batch must focus on a single domain/component cluster and be independently testable.
2. **Zero Business-Logic Mutation**: No backend services, API clients, Zustand stores, or validation logic may be altered.
3. **Reversible**: Changes must consist of clean, modular CSS/JSX updates that can be isolated or reverted without side effects.
4. **Mandatory Verification**: Every batch must pass `pnpm --filter web typecheck`, `pnpm --filter web lint`, unit tests, and 4-breakpoint browser QA before proceeding to the next batch.

---

## 33. TESTING & VERIFICATION REQUIREMENTS

For every batch, the following verification commands MUST be executed and pass cleanly:

```bash
# 1. Typecheck frontend web application
pnpm --filter web typecheck

# 2. Run ESLint code quality checks
pnpm --filter web lint

# 3. Execute automated unit test suite
pnpm --filter web test

# 4. Verify production build compilation
pnpm --filter web build

# 5. Check git status to ensure no unintended file mutations
git status --short --branch
```

---

## 34. MANUAL QA MATRIX

Every batch must undergo manual browser verification across 4 responsive viewports:

| Test Target | 1440px Desktop | 1024px Laptop/Tablet | 800px Tablet | 375px Mobile | Primary Focus |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Auth & Shell** | Verify | Verify | Verify | Verify | Sidebar toggle, login form, navbar |
| **Dashboard & Projects** | Verify | Verify | Verify | Verify | Metric cards, project list, grid layout |
| **Workspace (5 Tabs)** | Verify | Verify | Verify | Verify | 5-tab switching, horizontal scroll |
| **Document Detail** | Verify | Verify | Verify | Verify | Markdown reader, version history table |
| **Knowledge & Risk** | Verify | Verify | Verify | Verify | Search input, Health Drawer floating |
| **Reviews & Verification** | Verify | Verify | Verify | Verify | Proposal simulation, task checklist |
| **Contract Matrix** | Verify | Verify | Verify | Verify | 6-tier cell grid, evolution drawer |
| **Topology Sandbox** | Verify | Verify | Verify | Verify | Canvas rendering, node overlays |
| **Printable Certificate** | Verify | Verify | Verify | Verify | Browser Print preview (`@media print`) |
| **Admin & Trash** | Verify | Verify | Verify | Verify | User table, restore modal dialog |

---

## 35. MASTER IMPLEMENTATION MATRIX

| Domain ID | Target Route / Component | Batch | Risk Level | Primary Action Required | Status |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **00-02** | `index.css` & Tokens | Batch 1 | Low | Apply slate dark mode tokens | Ready |
| **03** | `components/common/*` | Batch 2 | Low | Refine primitives (Button, Badge, Table) | Ready |
| **04** | `AppLayout.tsx` | Batch 3 | Medium | Refine navigation shell & sidebar | Ready |
| **05** | `/login`, `/signup` | Batch 4 | Low | Refine auth cards & form inputs | Ready |
| **06** | `/dashboard` | Batch 4 | Low | Refine dashboard metric widgets | Ready |
| **07** | `/projects` | Batch 5 | Low | Refine projects directory grid | Ready |
| **08** | `/projects/:id` | Batch 5 | High | Refine 5-tab workspace container | Ready |
| **09** | `/documents` | Batch 6 | Low | Refine document repository table | Ready |
| **10** | `/documents/:id` | Batch 6 | High | Refine document detail panels & diff | Ready |
| **11** | `/documents/create` | Batch 7 | Medium | Refine Markdown editor (Write/Preview) | Ready |
| **12** | `/knowledge/search` | Batch 8 | Medium | Refine search bar & Risk Radar drawer | Ready |
| **13** | `/reviews` (Proposals) | Batch 9 | Medium | Refine proposal simulation views | Ready |
| **14** | `/reviews` (Packages) | Batch 9 | Medium | Refine conflict category indicators | Ready |
| **15** | `/reviews` (Verification)| Batch 10 | Medium | Refine task checklist & bypass modal | Ready |
| **16** | Governance -> Matrix | Batch 11 | Medium | Refine 6-tier cell precedence grid | Ready |
| **17** | Relationships -> Topo | Batch 12 | Medium | Refine topology sandbox canvas | Ready |
| **18** | Governance -> Lineage | Batch 13 | Low | Refine certificate roster & digests | Ready |
| **19** | `/projects/.../print` | Batch 13 | Low | Refine `@media print` printable layout | Ready |
| **20** | `/users`, `/users/:id` | Batch 14 | Medium | Refine admin directory & edit form | Ready |
| **21** | `/trash`, `*`, Error | Batch 14 | Low | Refine document trash & 404/ErrorBoundary| Ready |

---

## 36. ROUTE MATRIX

| Route Path | Repository Page Component | Target Stitch Module | Implementation Batch | Status |
| :--- | :--- | :--- | :---: | :---: |
| `/login` | `LoginPage.tsx` | Auth — Login | Batch 4 | Ready |
| `/signup` | `SignupPage.tsx` | Auth — Signup | Batch 4 | Ready |
| `/dashboard` | `DashboardPage.tsx` | Dashboard | Batch 4 | Ready |
| `/knowledge/search` | `KnowledgeSearchPage.tsx` | Knowledge & Risk Radar | Batch 8 | Ready |
| `/projects` | `ProjectsPage.tsx` | Projects Directory | Batch 5 | Ready |
| `/projects/:id` | `ProjectDetailsPage.tsx` | 5-Tab Project Workspace | Batch 5 / 11 / 12 / 13 | Ready |
| `/documents` | `DocumentsPage.tsx` | Document Repository | Batch 6 | Ready |
| `/documents/create` | `DocumentCreatePage.tsx` | Document Creator | Batch 7 | Ready |
| `/documents/:id` | `DocumentDetailsPage.tsx` | Document Detail & Version History | Batch 6 / 7 | Ready |
| `/documents/:id/edit` | `DocumentEditPage.tsx` | Document Editor | Batch 7 | Ready |
| `/trash` | `TrashPage.tsx` | Trash & Restore | Batch 14 | Ready |
| `/reviews` | `ReviewsPage.tsx` | Reviews (Proposals/Packages/Verif) | Batch 9 / 10 | Ready |
| `/projects/:pId/release-certificates/:cId/print` | `ReleaseCertificatePrintPage.tsx` | Printable Release Certificate | Batch 13 | Ready |
| `/users` | `UsersPage.tsx` | User Management Directory | Batch 14 | Ready |
| `/users/:id` | `UserDetailsPage.tsx` | User Details | Batch 14 | Ready |
| `/users/:id/edit` | `EditUserPage.tsx` | Edit User | Batch 14 | Ready |
| `*` | `NotFoundPage.tsx` | 404 Page Not Found | Batch 14 | Ready |
| *(App Error)* | `ErrorBoundary.tsx` | Application Error Boundary | Batch 2 | Ready |

---

## 37. SHARED COMPONENT MATRIX

| Component | Location | Refinement Target | Affected Domains | Risk | Batch |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `Button` | `components/common/Button.tsx` | Slate container fill, cyan hover state | All Domains | Low | Batch 2 |
| `Badge` | `components/common/Badge.tsx` | Dual-part micro-badge with code font | All Domains | Low | Batch 2 |
| `Card` | `components/common/Card.tsx` | Layer 1 Slate fill (`#191f31`, border `#1e293b`) | All Domains | Low | Batch 2 |
| `Table` | `components/common/Table.tsx` | Compact `36px` rows, monospaced hashes | Domains 06-21 | Low | Batch 2 |
| `Tabs` | `components/common/Tabs.tsx` | High-density underline active tabs | Domains 08, 10, 11, 13-15 | Low | Batch 2 |
| `Dialog` | `components/common/Dialog.tsx` | Hairline bordered slate modal dialog | Domains 05, 08, 10, 14, 15, 20, 21 | Low | Batch 2 |
| `Input` | `components/common/Input.tsx` | Code font query input with cyan focus ring | Domains 05, 07, 09, 11, 12, 20 | Low | Batch 2 |
| `Select` | `components/common/Select.tsx` | Slate dropdown with code font option items | Domains 07, 09, 11, 13, 15, 20 | Low | Batch 2 |
| `LoadingSpinner` | `components/common/LoadingSpinner.tsx` | Cyan glowing SVG spinner with ARIA live | All Domains | Low | Batch 2 |
| `EmptyState` | `components/common/EmptyState.tsx` | Slate container with trigger button | Domains 06-10, 12-15, 20, 21 | Low | Batch 2 |

---

## 38. REGRESSION MATRIX

| High-Risk Feature Area | Risk Level | Critical Functionality That Must Remain Unchanged | Verification Strategy |
| :--- | :---: | :--- | :--- |
| **Auth & Protected Routes** | **LOW** | Local JWT login, refresh token rotation, `returnUrl` redirect. | Test login/signup forms, verify token rotation. |
| **Project Workspace (5 Tabs)**| **HIGH** | Strict 5-tab architecture (`Overview`, `Docs`, `Rel`, `Know`, `Gov`). | Test tab switching, verify no 6th tab is created. |
| **Document Detail & Compare** | **HIGH** | Version diff calculation, version selection, evidence binding. | Test version comparison modal & Markdown render. |
| **Risk Radar & Knowledge** | **MEDIUM** | 5-Factor HealthScore formula, bounded search ranking. | Test search input, verify Health Drawer values. |
| **Change Proposals & Packages**| **MEDIUM** | Simulation impact calculations, 5 package conflict enums. | Test proposal simulation & conflict display. |
| **Verification Plans** | **MEDIUM** | Task status calculation, skip/bypass justification modal. | Test task status toggle & assurance calculation. |
| **Contract Matrix** | **MEDIUM** | 6-tier cell precedence evaluation logic. | Test contract grid rendering & analyzer drawer. |
| **Topology Sandbox** | **MEDIUM** | Node depth/count limits (`MAX_DEPTH=3`, `MAX_NODES=50`). | Test node selection & drift overlay render. |
| **Release Certificates** | **LOW** | SHA-256 digest formatting, browser print layout (`@media print`). | Test certificate roster & browser print preview. |
| **Admin & Self-Protection** | **MEDIUM** | Admin self-deletion and self-demotion backend blocks. | Test user edit form & self-protect warning. |
| **Trash & Document Restore** | **LOW** | Soft-delete query (`isDeleted=true`) & restore endpoint. | Test document restore action in `/trash`. |

---

## 39. FINAL IMPLEMENTATION ORDER

The recommended implementation sequence minimizes regression risk, prevents duplicate component refactoring, and ensures continuous automated testing:

1. **Batch 1: Design System Tokens & Global Foundation** (`index.css`, Tailwind tokens)
2. **Batch 2: Shared UI Primitives** (`components/common/` primitives & `ErrorBoundary.tsx`)
3. **Batch 3: Application Shell & Global Layout** (`AppLayout.tsx`, Sidebar, Header, Breadcrumbs)
4. **Batch 4: Authentication & Dashboard** (`LoginPage`, `SignupPage`, `DashboardPage`)
5. **Batch 5: Projects Directory & 5-Tab Workspace** (`ProjectsPage`, `ProjectDetailsPage`)
6. **Batch 6: Global Document Repository & Document Detail** (`DocumentsPage`, `DocumentDetailsPage`)
7. **Batch 7: Document Creator, Version History & Version Compare** (`DocumentCreatePage`, `DocumentEditPage`, Compare View)
8. **Batch 8: Knowledge Search & Risk Radar** (`KnowledgeSearchPage`, Risk Health Drawer)
9. **Batch 9: Change Proposals & Change Packages** (`ReviewsPage` - Proposals & Packages)
10. **Batch 10: Verification Plans & Compliance Checklists** (`ReviewsPage` - Verification)
11. **Batch 11: System Contract Matrix & Evolution Analyzer** (`ProjectDetailsPage` - Governance tab view)
12. **Batch 12: System Topology Simulation Sandbox & Drift Assessor** (`ProjectDetailsPage` - Relationships tab view)
13. **Batch 13: System Release Lineage, Attestation & Printable Certificate** (`ReleaseCertificatePrintPage`)
14. **Batch 14: Administration, Trash & Error Fallbacks** (`UsersPage`, `UserDetailsPage`, `EditUserPage`, `TrashPage`, `NotFoundPage`)

---

## 40. FINAL DECISION

**READY FOR IMPLEMENTATION WITH CONDITIONS**

### Mandatory Implementation Conditions:
1. **Zero Business Logic Mutation**: All API client calls, Mongoose database models, Zustand auth store logic, calculations, and backend services MUST remain 100% untouched.
2. **Strict 14-Batch Execution**: Implementation must proceed strictly through Batches 1 to 14 in sequential order.
3. **Mandatory Automated & Manual QA**: Every batch MUST pass `pnpm --filter web typecheck`, `pnpm --filter web lint`, unit tests, build compilation, and 4-breakpoint responsive browser QA before proceeding to the next batch.
4. **Strict Boundary Enforcement**: Unsupported external capabilities (IAM/SSO, CI/CD execution, APM telemetry, user restore, permanent purge) MUST NOT be added to the codebase.
5. **Canonical 5-Tab Architecture**: The Project Workspace MUST strictly preserve its 5-tab structure (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`).

---

## 41. GIT SAFETY VERIFICATION

Before completing this audit task, git status was verified:
- `git status --short --branch` confirmed zero modifications to existing repository source files, lockfiles, or configuration files.
- The ONLY created file is `docs/research/POST-COMPLETION-STITCH-TO-REPOSITORY-IMPLEMENTATION-AUDIT.md`.

---

## 42. ABSOLUTE FINAL ANSWER

"Can the approved complete Documan Stitch UI/UX now be implemented safely into the existing production repository without changing the product's existing functionality?"

**YES. The approved complete Documan Stitch UI/UX can be implemented safely into the current production repository without changing existing product functionality, following the 14 disciplined implementation batches and mandatory conditions established in this audit.**
