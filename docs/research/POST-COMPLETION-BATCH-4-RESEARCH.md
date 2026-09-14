# Post-Completion Batch 4 Research: Shared Governance Components

**Research Artifact**: `docs/research/POST-COMPLETION-BATCH-4-RESEARCH.md`  
**Target Batch**: Batch 4 — Shared Governance Components  
**Repository Branch**: `main`  
**Current Published Commit**: `5a62e485327d955adb954a5c0eee93bb8828aa7f`  
**Date**: September 13, 2026  
**Status**: **RESEARCH ONLY / NO SOURCE CHANGES MADE**

---

## 1. Executive Summary

This research document details the architecture, component design, and integration strategy for **Batch 4 — Shared Governance Components**, focusing on **Finding F-03 (`<GovernanceBanner>`)** and $T_{\text{cert}}$ vs $T_{\text{now}}$ visual distinction semantics.

Following the successful publication of **Batch 1 (Design Tokens)**, **Batch 2 (Core UI Primitives)**, and **Batch 3 (App Shell & Header Navigation)** to `main`, Batch 4 establishes a reusable, standardized UI component (`<GovernanceBanner>`) to unify governance headers, release certificate audit banners, and live compliance drift indicators across `apps/web`.

No backend APIs, database schemas, CAND-01 export bundle generators, governance evaluation engines, or roadmap items are altered during this research or its planned implementation.

---

## 2. Current Repository Baseline

- **Repository Branch**: `main`
- **Current Published Main Commit**: `5a62e485327d955adb954a5c0eee93bb8828aa7f`
- **Batch 1 Status**: Published (`25e4c5c47af2717ac3221862185a1009c0fc2946` — `apps/web/src/index.css`)
- **Batch 2 Status**: Published (`115d8985c1c853de890cffe5fff73821f7d6ff02` — `Button`, `Badge`, `Card`, `Table`, `Tabs`)
- **Batch 3 Status**: Published (`5a62e485327d955adb954a5c0eee93bb8828aa7f` — `AppLayout`, `NotificationBell`, `Breadcrumb`)
- **Product Roadmap**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md) is UNCHANGED. Phase 32 remains the final certified phase. There is NO Phase 33.
- **Working Tree State**: Clean source code; only intentional research artifacts exist in untracked status.

---

## 3. Shared Governance Component Architecture

Governance capabilities in `apps/web` are centralized within `apps/web/src/features/governance/`:

```
apps/web/src/features/governance/
├── components/
│   ├── ContractEvolutionAnalyzer.tsx
│   ├── SystemBaselineAlignmentSection.tsx
│   ├── SystemContractMatrixView.tsx
│   ├── SystemContractPlanningView.tsx
│   ├── SystemGovernanceGateSection.tsx
│   ├── SystemGovernanceLineageTimeline.tsx
│   ├── SystemTopologySimulationSandbox.tsx
│   └── TraceabilityAuditView.tsx
├── BaselineDriftSummaryCard.tsx
├── DriftBreakdownTable.tsx
├── ReleaseCertificateComplianceAuditView.tsx
├── SystemReleaseLineageView.tsx
├── VerificationPlanCard.tsx
├── WorkRequestStatusBadge.tsx
└── governance.api.ts / governance.types.ts
```

---

## 4. GovernanceBanner Current Implementation

### Current State:
- A standalone `<GovernanceBanner>` component file does **NOT** yet exist in `apps/web/src/components/governance/` or `apps/web/src/features/governance/components/`.
- Governance header banners are currently rendered using inline styles or ad-hoc raw Tailwind `<div>` structures directly inside views such as `ReleaseCertificateComplianceAuditView.tsx` (lines 163–214) and `SystemReleaseLineageView.tsx` (lines 72–80).

### Inconsistent Patterns Identified:
1. `ReleaseCertificateComplianceAuditView.tsx`: Uses raw Tailwind classes (`bg-slate-900 border-slate-800 shadow-2xl flex justify-between`) for audit header.
2. `SystemReleaseLineageView.tsx`: Uses raw inline CSS (`style={{ backgroundColor: '#1e293b', borderLeft: '4px solid #3b82f6' }}`) for lineage banner.

---

## 5. GovernanceBanner Usage / Call Sites

The new `<GovernanceBanner>` component will be integrated into the following primary call sites:

1. [`ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx): For the Release Compliance Drift & Post-Certification Audit header.
2. [`SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx): For the Release Certificate Lineage & Evolution header.
3. [`SystemGovernanceGateSection.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx): For the Topology Governance Gate section header.

---

## 6. F-03 Figma Requirement

**Finding F-03** from the approved Figma Implementation Plan specifies creating a reusable `<GovernanceBanner>` UI component.

### Proposed Component Interface (`GovernanceBanner.tsx`):
```typescript
export interface GovernanceBannerProps {
  title: string;
  description?: React.ReactNode;
  mode?: 'snapshot' | 'drift' | 'default' | 'info' | 'warning' | 'error';
  statusBadge?: React.ReactNode;
  metadata?: Array<{ label: string; value: React.ReactNode }>;
  actions?: React.ReactNode;
  className?: string;
}
```

### Visual Modes & Styling:
- **`mode="snapshot"` ($T_{\text{cert}}$)**:
  - Theme: Deep purple canvas (`bg-purple-950/60 text-purple-100 border border-purple-700/80 shadow-lg shadow-purple-950/40`).
  - Indicator: Solid border with historical certificate snapshot semantics.
- **`mode="drift"` ($T_{\text{now}}$)**:
  - Theme: Deep sky canvas (`bg-sky-950/60 text-sky-100 border border-sky-700/80 dashed border-sky-600/80 shadow-lg shadow-sky-950/40`).
  - Indicator: Dashed border with live system compliance drift evaluation semantics.
- **`mode="default"` / `"info"` / `"warning"` / `"error"`**:
  - Theme: Slate, amber, emerald, or red design token canvas.

---

## 7. T_cert / T_now Semantics

Documan strictly distinguishes historical frozen releases from live compliance evaluations:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ T_cert — FROZEN HISTORICAL CERTIFICATE SNAPSHOT                         │
│ Token: --color-cert-snapshot-bg (purple-950) / text (purple-300)       │
│ Badge: <Badge variant="historical">T_cert</Badge>                       │
│ Banner: <GovernanceBanner mode="snapshot" ... />                        │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ T_now — LIVE COMPLIANCE DRIFT EVALUATION                                │
│ Token: --color-drift-live-bg (sky-950) / text (sky-300)                 │
│ Badge: <Badge variant="drift">T_now</Badge>                             │
│ Banner: <GovernanceBanner mode="drift" ... />                           │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Non-Color Distinction**: In addition to purple vs sky token colors, $T_{\text{cert}}$ banners use solid borders and `[T_cert]` badges, whereas $T_{\text{now}}$ banners use dashed borders and `[T_now]` badges.

---

## 8. Design Token and Primitive Reuse

`<GovernanceBanner>` directly reuses established Batch 1 and Batch 2 foundations:
- **Batch 1 Tokens**: `--color-cert-snapshot-bg`, `--color-drift-live-bg`, `--font-sans`, `--font-mono`, `--radius-lg`.
- **Batch 2 Primitives**: `<Badge>` (`variant="historical"` / `variant="drift"`), `<Button>`, `<Card>`.

---

## 9. Responsive Behavior

- **Desktop (1440px)**: Multi-column flex row header with title/description on left, metadata items in middle, and action buttons on right.
- **Laptop / Tablet (1024px / 800px)**: Fluid layout with wrapped metadata items and inline flex buttons.
- **Mobile (375px)**: Single column stacked container (`flex flex-col gap-4`), full-width action buttons, and responsive metadata grid.

---

## 10. Accessibility Assessment

- **Semantic Container**: `<section className="..." aria-label={title}>`.
- **Landmark Heading**: `<h2 className="text-xl font-bold tracking-tight">` or `<h3 className="...">`.
- **Non-Color Indicators**: Visual distinction relies on solid vs dashed borders, typography weight, and text labels (`[T_cert]` / `[T_now]`).
- **Focus Rings**: Action buttons retain high contrast focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`).

---

## 11. Existing Test Coverage

- **Repository Test Suite**: 101 backend test files in `apps/api/src/**/*.test.ts` (787 tests passed).
- **Governance Tests**: `system-release-drift.service.test.ts`, `system-release-export.controller.test.ts`, `system-governance-waiver.test.ts`, `system-topology-governance-gate.test.ts`, etc.
- **Verification Commands**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `git diff --check`.

---

## 12. Files Likely to Change

1. **New Shared Component**:
   `apps/web/src/components/governance/GovernanceBanner.tsx`
2. **Primary Integrations**:
   - `apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx`
   - `apps/web/src/features/governance/SystemReleaseLineageView.tsx`

---

## 13. Files That Should Remain Untouched

- All backend files in `apps/api/`
- [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)
- `AppLayout.tsx`, `NotificationBell.tsx`, `Breadcrumb.tsx` (Batch 3 files)
- Governance API endpoints (`governance.api.ts`) and dataDTOs (`governance.types.ts`)

---

## 14. Performance Considerations

- Purely presentational React component with 0 network requests, 0 hooks side-effects, and 0 external dependency bloat.
- Maintains sub-1ms render time.

---

## 15. Risks and Regression Controls

- **Backwards Compatibility**: Ensure `GovernanceBannerProps` handles optional `description`, `metadata`, and `actions` without throwing runtime undefined errors.
- **CAND-01 Preserved**: Export JSON and Print Report button handlers in `ReleaseCertificateComplianceAuditView.tsx` must remain untouched.

---

## 16. Recommended Batch 4 Implementation Boundary

1. Create `GovernanceBanner.tsx` in `apps/web/src/components/governance/`.
2. Replace ad-hoc header banners in `ReleaseCertificateComplianceAuditView.tsx` and `SystemReleaseLineageView.tsx` with `<GovernanceBanner>`.
3. Verify typecheck, lint, test, build, diff check, and manual browser QA.

---

## 17. Verification Plan

Upon implementation authorization, Batch 4 verification will require:

1. `pnpm typecheck` (0 TypeScript errors)
2. `pnpm lint` (0 ESLint errors)
3. `pnpm test` (101 test files passed, 787 tests passed)
4. `pnpm build` (Clean production build)
5. `git diff --check` (0 whitespace errors)
6. **Manual Browser QA**: Verify `<GovernanceBanner>` rendering in dark/light mode across 1440px, 800px, and 375px viewports.

---

## 18. Explicit Out-of-Scope Items

- **NO** backend or API changes.
- **NO** alteration to CAND-01 export bundle generation.
- **NO** page-level redesigns beyond governance banner integration.
- **NO** changes to `docs/PRODUCT-ROADMAP.md` or Phase 33 creation.
- **NO** commit, push, or feature branch creation during this research phase.

---

## 19. Research Conclusion

Batch 4 scope is clear, risk-mitigated, fully aligned with the approved Figma specifications, and ready for implementation planning.
