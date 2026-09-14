# Post-Completion Batch 4 Implementation Plan

**Plan Artifact**: `docs/plans/POST-COMPLETION-BATCH-4-IMPLEMENTATION-PLAN.md`  
**Target Batch**: Batch 4 — Shared Governance Components  
**Repository Branch**: `main`  
**Current Published Main Commit**: `5a62e485327d955adb954a5c0eee93bb8828aa7f`  
**Date**: September 13, 2026  
**Status**: **PLAN ONLY / NO SOURCE CHANGES MADE**

---

## 1. Objective

The objective of Batch 4 is to create a reusable, presentational UI component ([`<GovernanceBanner>`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/governance/GovernanceBanner.tsx)) to standardize governance headers, release certificate snapshot banners ($T_{\text{cert}}$), and live compliance drift banners ($T_{\text{now}}$) across `apps/web`.

This plan details the implementation steps for:
- Creating `apps/web/src/components/governance/GovernanceBanner.tsx`.
- Implementing **Finding F-03** (`<GovernanceBanner>` refinement).
- Standardizing $T_{\text{cert}}$ (purple, solid border, `[T_cert]` badge) vs $T_{\text{now}}$ (sky, dashed border, `[T_now]` badge) visual presentation contracts.
- Integrating `<GovernanceBanner>` into [`ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx) and [`SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx).

---

## 2. Baseline

- **Current Repository Branch**: `main`
- **Current Published Main Commit**: `5a62e485327d955adb954a5c0eee93bb8828aa7f`
- **Batch 1 Status**: Complete & Published (`25e4c5c47af2717ac3221862185a1009c0fc2946` — `apps/web/src/index.css`)
- **Batch 2 Status**: Complete & Published (`115d8985c1c853de890cffe5fff73821f7d6ff02` — `Button`, `Badge`, `Card`, `Table`, `Tabs`)
- **Batch 3 Status**: Complete & Published (`5a62e485327d955adb954a5c0eee93bb8828aa7f` — `AppLayout`, `NotificationBell`, `Breadcrumb`)
- **Batch 4 Status**: Research Completed ([`docs/research/POST-COMPLETION-BATCH-4-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-BATCH-4-RESEARCH.md)); Implementation NOT started.
- **Product Roadmap**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md) is UNCHANGED. Phase 32 is final. There is NO Phase 33.

---

## 3. Approved Scope

Batch 4 contains exactly four approved scope items:

1. **New Component Creation**: Build presentational component `apps/web/src/components/governance/GovernanceBanner.tsx`.
2. **Finding F-03 (`<GovernanceBanner>`) Refinement**: Provide a standardized banner component with mode-based visual treatments (`snapshot`, `drift`, `default`, `info`, `warning`, `error`).
3. **$T_{\text{cert}}$ vs $T_{\text{now}}$ Presentation Contract**: Standardize historical certificate snapshot ($T_{\text{cert}}$) vs live drift evaluation ($T_{\text{now}}$) visual distinction.
4. **Targeted Integrations**: Integrate `<GovernanceBanner>` into `ReleaseCertificateComplianceAuditView.tsx` and `SystemReleaseLineageView.tsx`.

---

## 4. GovernanceBanner Component Contract

### File Location:
`apps/web/src/components/governance/GovernanceBanner.tsx`

### TypeScript Props Interface:
```typescript
import React from 'react';

export type GovernanceBannerMode =
  | 'snapshot'
  | 'drift'
  | 'default'
  | 'info'
  | 'warning'
  | 'error';

export interface GovernanceBannerMetadataItem {
  label: string;
  value: React.ReactNode;
}

export interface GovernanceBannerProps {
  title: string;
  description?: React.ReactNode;
  mode?: GovernanceBannerMode;
  statusBadge?: React.ReactNode;
  metadata?: GovernanceBannerMetadataItem[];
  actions?: React.ReactNode;
  className?: string;
}
```

### Purely Presentational Guarantee:
`<GovernanceBanner>` MUST remain a pure presentational component:
- **NO** data fetching or API calls.
- **NO** compliance decision calculations.
- **NO** state mutations or side effects.
- **NO** routing or workflow management.

---

## 5. T_cert / T_now Presentation Contract

```
┌─────────────────────────────────────────────────────────────────────────┐
│ mode="snapshot" ($T_cert: Frozen Historical Certificate Snapshot)       │
│ • Theme: bg-purple-950/60 text-purple-100 border border-purple-700/80   │
│ • Border Style: Solid border                                            │
│ • Indicator: <Badge variant="historical">T_cert</Badge>                 │
│ • Semantics: Immutable audit snapshot captured at time of release       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ mode="drift" ($T_now: Live System Compliance Drift Evaluation)          │
│ • Theme: bg-sky-950/60 text-sky-100 border border-sky-700/80            │
│ • Border Style: Dashed border (dashed border-sky-600/80)                │
│ • Indicator: <Badge variant="drift">T_now</Badge>                       │
│ • Semantics: Live evaluation of current workspace dependencies         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Color-Independent State Distinction:
The visual distinction between $T_{\text{cert}}$ and $T_{\text{now}}$ relies on three non-color dimensions:
1. **Border Pattern**: Solid border ($T_{\text{cert}}$) vs Dashed border ($T_{\text{now}}$).
2. **Text Badge**: `[T_cert]` indicator badge vs `[T_now]` indicator badge.
3. **Typography**: Monospace tag timestamps vs live audit timestamps.

---

## 6. File-by-File Change Plan

### 6.1 `GovernanceBanner.tsx` [NEW FILE]

- **Target File**: `apps/web/src/components/governance/GovernanceBanner.tsx`
- **Current Behavior**: File does not exist yet.
- **Required Change**: Create presentational component supporting `title`, `description`, `mode`, `statusBadge`, `metadata`, `actions`, and `className`.
- **Implementation Approach**: Use Tailwind classes consuming Batch 1 CSS tokens and Batch 2 `<Badge>` / `<Button>` primitives.
- **Tests Required**: Yes, verify prop rendering and mode class mappings via build & typecheck.

### 6.2 `ReleaseCertificateComplianceAuditView.tsx`

- **Target File**: [`apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx)
- **Current Behavior**: Renders ad-hoc header banner `<div>` (lines 163–214) with status badge, release tag timestamps, `Cert Status`, `Live Readiness`, and action buttons (`⬇ Export JSON`, `🖨 Print Report`).
- **Required Change**: Replace raw header `<div>` with `<GovernanceBanner mode="drift" title="Release Compliance Drift & Post-Certification Audit" ... />`.
- **Preserved Integrity**: Preserve `handleExportJson`, `handlePrintReport`, CAND-01 export bundle generation, and compliance status badge mapping.
- **Tests Required**: No changes to existing tests.

### 6.3 `SystemReleaseLineageView.tsx`

- **Target File**: [`apps/web/src/features/governance/SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx)
- **Current Behavior**: Renders header banner `<div>` (lines 73–80) using raw inline styles (`style={{ backgroundColor: '#1e293b', borderLeft: '4px solid #3b82f6' }}`).
- **Required Change**: Replace raw inline-styled banner `<div>` with `<GovernanceBanner mode="snapshot" title="Release Certificate Lineage & Evolution" ... />`.
- **Preserved Integrity**: Preserve lineage graph state, certificate comparison logic, and supersession chain rendering.
- **Tests Required**: No changes to existing tests.

---

## 7. Design Token and Primitive Reuse

Batch 4 will directly consume established design system foundations:
- **Global CSS Tokens** (`apps/web/src/index.css`):
  - `--color-cert-snapshot-bg`: Purple snapshot theme background.
  - `--color-drift-live-bg`: Sky live evaluation theme background.
  - `--font-sans` / `--font-mono`: Typography scales.
- **Batch 2 UI Primitives**:
  - `<Badge variant="historical">` and `<Badge variant="drift">`.
  - `<Button variant="primary">` and `<Button variant="secondary">`.

---

## 8. Responsive Implementation Plan

| Viewport | Banner Layout | Metadata Grid | Action Buttons |
| :--- | :--- | :--- | :--- |
| **Desktop (1440px)** | Flex row, title on left, metadata in center, actions on right | Inline flex row with dividers | Right-aligned button group |
| **Laptop / Tablet (1024px / 800px)** | Fluid flex row with text wrapping | Multi-line flex row | Right-aligned button group |
| **Mobile (375px)** | Single column stack (`flex flex-col gap-4`) | Stacked metadata items | Full-width button group |

---

## 9. Accessibility Plan

- **Semantic Container**: `<section className="..." aria-label={title}>`.
- **Heading Hierarchy**: `<h2 className="text-xl font-bold tracking-tight text-white">`.
- **Non-Color Indicators**: Solid vs dashed borders and `[T_cert]` / `[T_now]` badges.
- **Focus Visibility**: Action buttons render `focus-visible:ring-2 focus-visible:ring-indigo-500`.

---

## 10. Testing Plan

- **Repository Test Suite**: 101 backend test files in `apps/api/src/**/*.test.ts` (787 tests passed).
- **Batch 4 Quality Commands**:
  - `pnpm typecheck`: 0 TypeScript errors across workspace.
  - `pnpm lint`: 0 ESLint errors.
  - `pnpm test`: 101 test files passed, 787 tests passed.
  - `pnpm build`: Successful Vite production build.
  - `git diff --check`: 0 whitespace errors.

---

## 11. Manual QA Matrix

| Page / View | Viewport | Inspection Target | Expected Result |
| :--- | :---: | :--- | :--- |
| **Release Certificate Audit** | 1440px | Banner layout, `T_cert` & `T_now` badges, export button | Clean flex row layout with working export action |
| **Release Certificate Audit** | 375px | Mobile viewport banner wrapping | Banner stacks vertically; buttons expand to full width |
| **System Release Lineage** | 1440px | Lineage header banner styling | Purple snapshot banner renders with solid border |

---

## 12. Performance Considerations

- Purely presentational React component with 0 network requests, 0 hooks side-effects, and 0 external dependency bloat.
- Maintains sub-1ms render time.

---

## 13. Regression Controls

1. **Backwards Compatibility**: All `GovernanceBannerProps` fields except `title` are optional.
2. **CAND-01 Preserved**: Export JSON and Print Report action handlers remain untouched.
3. **No Authority Overhaul**: Banner purely displays data passed via props.

---

## 14. Verification Commands

Upon execution authorization, the following commands must be run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
git diff --check
```

---

## 15. Git / Publication Plan

The eventual implementation workflow will follow strict repository discipline:

1. Create feature branch: `feature/post-completion-figma-batch-4-governance` from clean `main`.
2. Create `GovernanceBanner.tsx` and update call sites.
3. Run automated verification (`typecheck`, `lint`, `test`, `build`, `git diff --check`).
4. Perform manual browser QA.
5. Create review artifact `POST-COMPLETION-BATCH-4-REVIEW.md`.
6. Obtain explicit user commit authorization and create single commit (`feat(web): add shared governance banner component`).
7. Obtain explicit publication authorization.
8. Push feature branch to `origin`.
9. Merge `--no-ff` into `main`.
10. Push `main` to `origin/main`.
11. Verify synchronized `main` and delete feature branch.

---

## 16. Explicit Out-of-Scope Items

- **NO** backend, schema, database, or API route modifications.
- **NO** changes to CAND-01 export bundle generation.
- **NO** changes to `docs/PRODUCT-ROADMAP.md` or Phase 33 creation.
- **NO** commit, push, or feature branch creation during this plan phase.

---

## 17. Definition of Done

Batch 4 will be complete when:
1. `GovernanceBanner.tsx` is created in `apps/web/src/components/governance/`.
2. Header banners in `ReleaseCertificateComplianceAuditView.tsx` and `SystemReleaseLineageView.tsx` are integrated.
3. All automated verification commands pass with 0 errors.
4. Manual browser QA confirms responsive layout and CAND-01 export functionality.
5. Batch 4 changes are committed and published according to Git discipline.

---

## 18. Plan Conclusion

The implementation plan for Batch 4 is complete, fully specified, minimal, and ready for review.
