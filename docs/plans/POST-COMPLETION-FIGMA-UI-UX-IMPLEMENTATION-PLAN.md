# Documan Post-Completion Figma UI/UX Implementation Plan

> **DOCUMENT TYPE**: FIGMA DESIGN-TO-CODE IMPLEMENTATION PLAN  
> **CLASSIFICATION**: POST-COMPLETION UI/UX REFINEMENT  
> **DESIGN AUTHORITY**: Stitch Project `projects/9852339151029178160` (*Documan High-Fidelity Design System & UI Kit*)  
> **SPECIFICATION REFERENCES**: [`docs/research/POST-COMPLETION-FIGMA-DESIGN-DISCOVERY.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-DISCOVERY.md), [`docs/research/POST-COMPLETION-FIGMA-DESIGN-HANDOFF.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-HANDOFF.md), [`docs/research/POST-COMPLETION-FIGMA-DESIGN-REVIEW.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-REVIEW.md)  
> **PRODUCT BOUNDARY**: Phases 1–32 remain complete and fully certified. Phase 32 is the final planned phase. There is NO Phase 33. `PRODUCT-ROADMAP.md` is untouched.

---

## 1. Executive Summary

Following the approval of the **Documan Figma Design Discovery**, **Design Handoff**, and **Design Review**, this document provides a comprehensive, production-ready implementation plan for translating the approved visual design system into the existing production React application (`apps/web`).

The design review concluded with **0 P0 defects, 2 P1 major improvements, 3 P2 valuable refinements, and 2 P3 polish items**, confirming an overall readiness of **READY FOR IMPLEMENTATION**.

This plan organizes the design-to-code translation into **12 incremental, risk-mitigated implementation batches**, preserving all existing backend APIs, authorization models, lazy-loading performance optimizations, and published CAND-01 export bundle capabilities.

---

## 2. Inputs and Design Authority

The implementation plan is strictly bound to the following authoritative assets:

1. **Design Project Container**: `projects/9852339151029178160` (*Documan High-Fidelity Design System & UI Kit*, generated in Stitch UI Design Studio).
2. **Design Discovery**: [`docs/research/POST-COMPLETION-FIGMA-DESIGN-DISCOVERY.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-DISCOVERY.md)
3. **Design Handoff Specification**: [`docs/research/POST-COMPLETION-FIGMA-DESIGN-HANDOFF.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-HANDOFF.md)
4. **Design Review Report**: [`docs/research/POST-COMPLETION-FIGMA-DESIGN-REVIEW.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-REVIEW.md)

---

## 3. Current Frontend Architecture

The production web codebase (`apps/web`) is structured around modern React 19 standards:

- **Framework**: React 19 + TypeScript 6 + Vite 8 + React Router 7 + Axios + Zustand.
- **Styling Architecture**: TailwindCSS utility classes driven by CSS design tokens defined in `apps/web/src/index.css`.
- **Layout Shell**: Header-driven layout (`AppLayout.tsx`) featuring global quick search (`Cmd+K`), notification bell, user role badges, and content container bounded at `max-w-7xl` (1280px).
- **Core Primitives**: Standardized atomic UI components located in `apps/web/src/components/ui/` (`Button.tsx`, `Badge.tsx`, `Card.tsx`, `Table.tsx`, `Tabs.tsx`, `Modal.tsx`, `Breadcrumb.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx`).

---

## 4. Design System Mapping

```
FIGMA FOUNDATIONS              TAILWIND / CSS IMPLEMENTATION            PRODUCTION REACT CODEBASE
┌──────────────────────┐       ┌──────────────────────────────┐         ┌────────────────────────┐
│  Typography Scale    │ ────► │ Inter & JetBrains Mono Fonts │ ──────► │ index.css (--font-sans)│
│  8px Baseline Grid   │ ────► │ Tailwind spacing scale (0.5rem)──────► │ className="p-4 gap-2"  │
│  Dark Slate Theme    │ ────► │ slate-950/900/800 tokens     │ ──────► │ bg-slate-950, border.. │
│  Light Print Theme   │ ────► │ @media print { bg-white }    │ ──────► │ ReleaseCertificatePrint│
└──────────────────────┘       └──────────────────────────────┘         └────────────────────────┘
```

---

## 5. Component Feasibility & Mapping

Every major Figma component is mapped directly to an existing production React implementation in `apps/web`:

| Figma Component / Pattern | Existing Production React Component | Classification | Implementation Requirement |
| :--- | :--- | :--- | :--- |
| **Button** | `<Button>` (`Button.tsx`) | **Class A** | Styling normalization to match Figma border radii and focus rings. |
| **Badge** | `<Badge>` (`Badge.tsx`) | **Class B** | Add explicit `--color-cert-snapshot` (`purple-400`/`purple-950`) token variant for $T_{\text{cert}}$ snapshots. |
| **Card** | `<Card>` (`Card.tsx`) | **Class A** | Border color alignment to `border-slate-800/80`. |
| **Table** | `<Table>` (`Table.tsx`) | **Class A** | Table header cell text size and padding normalization. |
| **Tabs** | `<Tabs>` (`Tabs.tsx`) | **Class B** | Refine active tab indicator line styling (`border-b-2 border-indigo-400`). |
| **Modal** | `<Modal>` (`Modal.tsx`) | **Class A** | Backdrop blur and focus trap alignment. |
| **Breadcrumb** | `<Breadcrumb>` (`Breadcrumb.tsx`) | **Class B** | Chevron separator vertical alignment adjustment for mobile viewports. |
| **Empty State** | `<EmptyState>` (`EmptyState.tsx`) | **Class A** | Standardize empty illustration and caption text. |
| **Loading Spinner** | `<LoadingSpinner>` (`LoadingSpinner.tsx`) | **Class A** | Inherit parent text color for seamless button loading feedback. |
| **Header Layout** | `<AppLayout>` (`AppLayout.tsx`) | **Class A** | Quick search button shortcut styling and notification bell positioning. |
| **Governance Banner** | *New Shared Component* | **Class C** | Create reusable `<GovernanceBanner>` component for $T_{\text{cert}}$ vs $T_{\text{now}}$ dual headers. |
| **Audit View** | `<ReleaseCertificateComplianceAuditView>` | **Class A** | Incorporate revised badge styling and export button states. |
| **Printable Report** | `<ReleaseCertificatePrintPage>` | **Class B** | Adjust `@media print` border dividers (`border-slate-400`) for high-contrast PDF printing. |

*Note: Class A = Direct map; Class B = Visual refinement; Class C = New shared UI abstraction; Class D = Product change (0 items).*

---

## 6. Design Token Strategy

Design tokens will be centralized in `apps/web/src/index.css` to eliminate magic values across components:

```css
:root {
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Theme Tokens (Dark Mode Default) */
  --color-bg-canvas: #020617; /* slate-950 */
  --color-bg-surface: #0f172a; /* slate-900 */
  --color-bg-elevated: #1e293b; /* slate-800 */
  --color-border-default: #1e293b; /* slate-800 */
  --color-text-main: #f8fafc; /* slate-50 */
  --color-text-muted: #94a3b8; /* slate-400 */
  --color-brand-primary: #818cf8; /* indigo-400 */

  /* Governance State Tokens */
  --color-cert-snapshot-bg: rgba(88, 28, 135, 0.6); /* bg-purple-950/60 */
  --color-cert-snapshot-text: #c084fc; /* text-purple-300 */
  --color-cert-snapshot-border: rgba(126, 34, 206, 0.8); /* border-purple-700 */

  --color-drift-live-bg: rgba(12, 74, 110, 0.6); /* bg-sky-950/60 */
  --color-drift-live-text: #38bdf8; /* text-sky-300 */
  --color-drift-live-border: rgba(3, 105, 161, 0.8); /* border-sky-800 */
}
```

---

## 7. P1 Findings Implementation Plan

The design review identified exactly **2 P1 findings**. Both are fully planned below:

### Finding F-01: `<Tabs>` Active Indicator Line Refinement
- **User Impact**: Users viewing multi-tab views (`ProjectDetailsPage.tsx`) need immediate visual clarity on which tab is active.
- **Affected Screen**: Project Details Page & Document Details Page.
- **Affected Component**: [`apps/web/src/components/ui/Tabs.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Tabs.tsx).
- **Implementation Strategy**: Update active tab class string in `Tabs.tsx` to include `border-b-2 border-indigo-400 text-indigo-300 bg-indigo-950/30`.
- **Verification**: Verify active tab rendering across all 7 project tabs and 5 document tabs.

### Finding F-02: `<Badge>` Purple Token Variant for $T_{\text{cert}}$ Historical Snapshots
- **User Impact**: Auditors must instantly distinguish historical frozen certificates from live drift audits.
- **Affected Screen**: Release Certificate Audit View & System Release Lineage View.
- **Affected Component**: [`apps/web/src/components/ui/Badge.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Badge.tsx).
- **Implementation Strategy**: Add `"historical"` to `BadgeProps["variant"]` in `Badge.tsx` mapping to `bg-purple-950/60 text-purple-300 border-purple-800/80`.
- **Verification**: Check badge rendering in `ReleaseCertificateComplianceAuditView.tsx`.

---

## 8. P2 Findings Implementation Plan

The design review identified exactly **3 P2 findings**:

### Finding F-03: Reusable `<GovernanceBanner>` UI Component
- **Affected Component**: New component [`apps/web/src/components/governance/GovernanceBanner.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/governance/GovernanceBanner.tsx).
- **Implementation Strategy**: Build a shared banner component supporting `mode="snapshot"` ($T_{\text{cert}}$, purple theme, solid border) and `mode="drift"` ($T_{\text{now}}$, sky theme, dashed border).

### Finding F-04: JetBrains Mono Code Block Scrollbar Styling
- **Affected Component**: `index.css` global styles for `<pre>` and `<code>` blocks.
- **Implementation Strategy**: Add custom scrollbar styling (`::-webkit-scrollbar` with `bg-slate-900` track and `bg-slate-700` thumb) to technical evidence boxes.

### Finding F-05: High-Contrast Table Borders for Printable PDF Reports
- **Affected Component**: [`apps/web/src/pages/ReleaseCertificatePrintPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/ReleaseCertificatePrintPage.tsx).
- **Implementation Strategy**: Update table border classes in `@media print` rules from `border-slate-200` to `border-slate-400` to ensure crisp lines on physical prints and PDF exports.

---

## 9. P3 Findings Disposition

The design review identified **2 P3 polish items**:

1. **Finding F-06: `NotificationBell` Hover Scale Effect**: Included in Batch 3 layout polish (`hover:scale-105 transition-transform`).
2. **Finding F-07: `Breadcrumb` Chevron Vertical Alignment**: Included in Batch 2 component polish (`items-center self-center`).

---

## 10. Screen-by-Screen Implementation Strategy

| Screen / Area | Target React Source Files | Refinement Scope |
| :--- | :--- | :--- |
| **Authentication** | `LoginPage.tsx`, `SignupPage.tsx` | Align login card backdrop, input focus rings, and action button states. |
| **Dashboard** | `DashboardPage.tsx` | Standardize summary metric card grid padding and skeleton loaders. |
| **Projects List** | `ProjectsPage.tsx` | Polish project table headers, search input bar, and pagination footer. |
| **Project Details** | `ProjectDetailsPage.tsx` | Apply F-01 tab border refinement; preserve 5 conceptual tab groupings and lazy loading. |
| **Documents** | `DocumentsPage.tsx`, `DocumentDetailsPage.tsx` | Enhance document metadata panel contrast and version comparison modal diff view. |
| **Knowledge Search** | `KnowledgeSearchPage.tsx` | Refine search result risk radar chips and global `Cmd+K` trigger overlay. |
| **Governance & System** | `SystemTopologySimulationSandbox.tsx`, `SystemContractMatrixView.tsx` | Apply high-contrast status icons (`✓ Compliant`, `⚠ Deprecated`, `🛇 Broken`) to contract matrix. |
| **Release & CAND-01** | `ReleaseCertificateComplianceAuditView.tsx` | Apply F-02 purple historical badge, F-03 `<GovernanceBanner>`, and CAND-01 export loading button states. |
| **Printable Report** | `ReleaseCertificatePrintPage.tsx` | Apply F-05 print table border contrast; verify clean page breaks for Browser Print to PDF. |

---

## 11. Project Details Conceptual Grouping Strategy

The implementation strictly preserves the **5 major conceptual areas** of `ProjectDetailsPage.tsx`:

1. **Overview**: Project stewardship summary, team stewards, active baselines.
2. **Governance & Gates**: Assurance gates, verification plans, gate tokens.
3. **Architecture & Specs**: System topology nodes, contract governance matrix, API specifications.
4. **Change Management**: Work requests, baseline alignment summaries, drift alerts.
5. **Certificates & Lineage**: Issued release certificates, compliance drift, release lineage timeline.

- **Lazy Loading Safeguard**: Retains `React.lazy` loading for sub-tab components to maintain sub-50ms tab switching times.

---

## 12. CAND-01 & Printable PDF Strategy

### CAND-01 Standalone Export Package UI Refinement
- **Export Button State Machine**: Preserves default, hover, focused, loading (spinner), disabled, success, and error toast states.
- **$T_{\text{cert}}$ vs $T_{\text{now}}$ Distinction**: Displays purple historical snapshot badge ($T_{\text{cert}}$) and sky/emerald live evaluation badge ($T_{\text{now}}$).
- **Integrity Digest Presentation**: Displays `exportBundleDigest` in JetBrains Mono with explicit text: *"SHA-256 deterministic serialization checksum over canonical JSON payload. Validatable offline."* (Never labeled as a digital signature or PKI attestation).

### Printable Report Browser PDF Strategy
- Operates entirely via **Browser Print $\rightarrow$ Save as PDF** without server-side browser infrastructure.
- Forces white background (`#ffffff`), dark charcoal text (`#0f172a`), and clean print border dividers (`border-slate-400`).

---

## 13. Responsive Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Responsive Breakpoint Execution Strategy                                │
├───────────────────┬─────────────────────────────────────────────────────┤
│ Desktop (1440px+) │ Max 1280px container bounds; full multi-column grid │
│ Laptop (1024px)   │ Fluid width with px-6 padding; scrollable tables    │
│ Tablet (768px)    │ Stacked card layout; hamburger menu drawer          │
│ Mobile (375px)    │ Mobile-first single column; expandable table cards  │
└───────────────────┴─────────────────────────────────────────────────────┘
```

---

## 14. Accessibility Strategy (WCAG 2.1 AA)

- **Focus Rings**: Standardized focus ring across all components (`focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`).
- **Contrast Ratios**: Main body text (`#f8fafc` on `#020617`) achieves **18.5:1** contrast ratio.
- **Screen Reader Support**: Modals include focus traps and `Escape` key listeners; loading states use `aria-live="polite"`.

---

## 15. Performance Safeguards

- **Zero API Overhaul**: 100% pure frontend styling and component refinement.
- **Bundle Optimization**: Zero new external libraries introduced.
- **Lazy Loading**: Route-level and tab-level `React.lazy` code splitting preserved.

---

## 16. Incremental Implementation Batches

The work will be executed across **12 safe, sequential batches**:

```
Batch 1: Design Tokens & Global CSS (index.css)
   │
Batch 2: Core UI Primitives Refinement (Button, Badge, Card, Table, Tabs) [Includes F-01, F-02]
   │
Batch 3: Shared App Shell & Header Navigation (AppLayout.tsx) [Includes F-06, F-07]
   │
Batch 4: Shared Governance Components (GovernanceBanner.tsx) [Includes F-03]
   │
Batch 5: Authentication & Dashboard Polish (Login, Signup, Dashboard)
   │
Batch 6: Projects List & Project Details 5-Tab Architecture (ProjectDetailsPage.tsx)
   │
Batch 7: Documents List, Document Details & Version Diffs [Includes F-04]
   │
Batch 8: Knowledge Search & Risk Radar
   │
Batch 9: System Architecture Topology & Contract Governance Matrix
   │
Batch 10: Release Certificate, Compliance Drift Audit & CAND-01 Export UI
   │
Batch 11: Printable Release Certificate PDF Report (ReleaseCertificatePrintPage.tsx) [Includes F-05]
   │
Batch 12: User Management, Trash & Full Regression Testing (Typecheck, Lint, Test, Build, Diff Check)
```

---

## 17. Test & QA Verification Strategy

Every batch MUST pass the complete repository test suite before proceeding:

1. **`pnpm typecheck`**: 0 TypeScript errors across `@documan/api` and `web`.
2. **`pnpm lint`**: 0 ESLint errors.
3. **`pnpm test`**: 101 test files passed, 787 tests passed.
4. **`pnpm build`**: Successful Vite and `tsc` production build.
5. **`git diff --check`**: 0 whitespace or formatting warnings.

---

## 18. Scope Control

- **Visual Refinements**: 100% authorized.
- **Existing API Data Consumption**: 100% authorized.
- **New Backend Capabilities / Phase 33 Creep**: **0 ITEMS AUTHORIZED**.

---

## 19. Risks & Mitigation

| Potential Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Active Tab CSS Regression** | Tab indicator line breaks layout | Test `<Tabs>` component across all 7 project tabs and 5 document tabs. |
| **Print Stylesheet Clipping** | PDF export truncates table columns | Test `@media print` explicitly using Browser Print preview in Chrome/Firefox. |
| **Dark Theme Contrast Loss** | Text hard to read on slate-900 | Verify contrast ratios exceed 4.5:1 using browser accessibility inspector. |

---

## 20. Definition of Done

The post-completion UI/UX refinement will be complete when:

1. All 12 implementation batches have been executed incrementally on a feature branch (`feature/post-completion-ui-refinement`).
2. P1 findings F-01 and F-02 are fully implemented and verified.
3. P2 findings F-03, F-04, and F-05 are fully implemented and verified.
4. P3 findings F-06 and F-07 are implemented.
5. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check` pass with 0 errors.
6. Manual browser QA confirms responsive layout and CAND-01 export functionality.
7. Publication is authorized and merged into `main` using `--no-ff`.

---

## 21. Implementation Readiness Determination

```
========================================================================================
                      FINAL IMPLEMENTATION PLAN DETERMINATION
========================================================================================

                  [ READY FOR IMPLEMENTATION ]

The design-to-code implementation plan is complete, fully specified, risk-mitigated,
and ready for incremental execution on a dedicated feature branch.
========================================================================================
```

---

## 22. Recommended Next Step

> **RECOMMENDED NEXT STEP**: Authorized users can now issue the implementation directive to start **Batch 1 (Design Tokens & Global CSS)** on feature branch `feature/post-completion-ui-refinement`.

---

## 23. Repository Safety & Execution Verification

- **Plan Artifact Created**: [`docs/plans/POST-COMPLETION-FIGMA-UI-UX-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FIGMA-UI-UX-IMPLEMENTATION-PLAN.md)
- **Figma Design Reviewed**: **YES** (`projects/9852339151029178160`)
- **Figma Design Review Status**: **READY FOR IMPLEMENTATION**
- **P0 Findings Count**: **0**
- **P1 Findings Count**: **2** (Fully Planned)
- **P2 Findings Count**: **3** (Fully Planned)
- **P3 Findings Count**: **2** (Fully Planned)
- **Source Code Changed**: **NO**
- **Roadmap Changed**: **NO** (`PRODUCT-ROADMAP.md` untouched)
- **Branch Created**: **NO**
- **Commit Created**: **NO**
- **Push Performed**: **NO**
- **Merge Performed**: **NO**
