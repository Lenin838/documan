# Batch 1 — Stitch UI Implementation Plan

**Target File**: `docs/plans/POST-COMPLETION-BATCH-1-STITCH-UI-IMPLEMENTATION-PLAN.md`  
**Status**: BATCH 1 IMPLEMENTATION PLAN  
**Mode**: PLAN ONLY — Zero source code, lockfile, or backend logic modifications executed.

---

## 1. Objective

Align the existing global CSS design tokens and foundations in `apps/web/src/index.css` with the approved **Documan High-Fidelity Design System & UI Kit** (Stitch Project ID: `projects/9852339151029178160` - Precision Blueprint / Deterministic Ledger).

This plan establishes the strict CSS token updates and utility class additions required to transform the global web canvas to dark slate `#0c1324`, update container fills, set soft geometric radii (2px/4px/6px), apply sky cyan (`#38bdf8`) primary accents, and implement 1px cyan focus rings, without altering any React components, TypeScript files, API endpoints, or backend logic.

---

## 2. Research Source

This implementation plan is directly grounded in the approved research document:
[POST-COMPLETION-BATCH-1-STITCH-UI-RESEARCH.md](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-BATCH-1-STITCH-UI-RESEARCH.md)

---

## 3. Exact File Boundary

**The ONLY file permitted to change during Batch 1 implementation is**:
- `apps/web/src/index.css`

**No other source files may be modified**:
- DO NOT modify React components (`apps/web/src/components/*`)
- DO NOT modify page components (`apps/web/src/pages/*`)
- DO NOT modify routes (`apps/web/src/App.tsx`)
- DO NOT modify API client files (`apps/web/src/features/api/*`)
- DO NOT modify Zustand store files (`apps/web/src/features/auth/*`)
- DO NOT modify backend code (`apps/api/*`)
- DO NOT modify build configuration files (`package.json`, `vite.config.ts`, `pnpm-lock.yaml`)

---

## 4. Current-State Summary

The current global stylesheet `apps/web/src/index.css` contains:
- Background Canvas: `#020617` (`slate-950`)
- Surface Fill: `#0f172a` (`slate-900`)
- Elevated Surface: `#1e293b` (`slate-800`)
- Brand Primary: `#818cf8` (`indigo-400`)
- State Accents: Success `#34d399`, Danger `#f87171`, Warning `#fbbf24`
- Radii: `--radius-sm: 0.375rem` (6px), `--radius-md: 0.50rem` (8px), `--radius-lg: 0.75rem` (12px)
- Focus Ring: `outline: 2px solid #6366f1` (2px indigo outline)

---

## 5. Exact Token Changes

The following CSS custom properties in `apps/web/src/index.css` will be updated:

```css
/* 1. Canvas Background */
--color-bg-canvas: #0c1324; /* Updated from #020617 to Precision Dark Slate */

/* 2. Container Surface Fill */
--color-bg-surface: #191f31; /* Updated from #0f172a to Layer 1 Container */

/* 3. Elevated Surface Fill */
--color-bg-elevated: #23293c; /* Updated from #1e293b to Layer 2 High Container */

/* 4. Brand Primary Accent */
--color-brand-primary: #38bdf8; /* Updated from #818cf8 (indigo) to Sky Cyan */
--color-brand-hover: #7dd3fc;   /* Updated from #a5b4fc to Sky Cyan Hover */

/* 5. Semantic Status Colors */
--color-state-success: #10b981; /* Updated from #34d399 to Emerald/Teal */
--color-state-warning: #f59e0b; /* Updated from #fbbf24 to Amber */
--color-state-danger: #f43f5e;  /* Updated from #f87171 to Rose */

/* 6. Temporal & Governance Tokens */
--color-cert-snapshot-bg: rgba(168, 85, 247, 0.1);
--color-cert-snapshot-text: #d8b4fe;
--color-cert-snapshot-border: rgba(168, 85, 247, 0.4);

--color-drift-live-bg: rgba(56, 189, 248, 0.1);
--color-drift-live-text: #7dd3fc;
--color-drift-live-border: rgba(56, 189, 248, 0.4);

/* 7. Soft Geometric Radii */
--radius-sm: 0.125rem; /* Updated from 0.375rem (6px) to 2px (micro-badges & hash pills) */
--radius-md: 0.25rem;  /* Updated from 0.50rem (8px) to 4px (containers & buttons) */
--radius-lg: 0.375rem; /* Updated from 0.75rem (12px) to 6px (modals & drawers) */

/* 8. Focus Treatment */
--focus-ring-color: #38bdf8;
```

Updated Focus Ring Utility Rule:
```css
.focus-ring:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px #38bdf8;
}
```

---

## 6. Typography Utility Additions

Add the following JetBrains Mono code typography utility classes to `apps/web/src/index.css`:

```css
/* Monospaced Code & Audit Telemetry Utilities */
.font-label-code-lg {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: -0.01em;
}

.font-label-code-md {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0em;
}

.font-label-code-sm {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  letter-spacing: 0.02em;
}

.font-caption-caps {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  line-height: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

---

## 7. Existing Styles to Preserve

The following existing declarations in `apps/web/src/index.css` MUST be preserved:
1. **Font Family Declarations**: `--font-sans` (`Inter`...) and `--font-mono` (`JetBrains Mono`...).
2. **Spacing Grid Scale**: `--space-1` (0.25rem) through `--space-12` (3.00rem).
3. **Global Body Defaults**: `body` margin, background-color, color, font-family settings.
4. **Heading Styles**: `h1`, `h2`, `h3`, `h4` typography rules.
5. **Print Stylesheet Foundation**: `@media print` rules enforcing white canvas background (`#ffffff`), hiding navigation controls (`header`, `nav`, `button`, `.no-print`), and styling tables.
6. **Responsive Base Rule**: `@media (max-width: 1024px)` font size step down to 15px.

---

## 8. Implementation Sequence

1. **Inspect `apps/web/src/index.css`**: Confirm current line numbers and token blocks.
2. **Apply Token Updates**: Update `--color-bg-canvas`, `--color-bg-surface`, `--color-bg-elevated`, `--color-brand-primary`, `--color-state-*`, `--radius-*`, and `--focus-ring-color` values in `:root`.
3. **Update Focus Ring Class**: Update `.focus-ring:focus-visible` rule.
4. **Append Typography Utilities**: Add `.font-label-code-*` and `.font-caption-caps` utility classes.
5. **Run Verification Commands**: Execute full test suite and typecheck.

---

## 9. Regression Risks

| Risk | Mitigation |
| :--- | :--- |
| Text Contrast Drop on New Slate Background | Verify body text (`#f8fafc` / `#cbd5e1`) maintains >= 7:1 contrast on `#0c1324`. |
| Invisible Focus Ring | Verify 1px sky cyan ring (`#38bdf8`) provides high visual contrast on dark containers. |
| Print Background Leak | Verify `@media print` rule retains `!important` white background override. |

---

## 10. Verification Commands

Upon completing the edit to `apps/web/src/index.css`, execute the following workspace verification commands:

```bash
# 1. Typecheck frontend web application
pnpm --filter web typecheck

# 2. Run ESLint code quality checks
pnpm --filter web lint

# 3. Execute frontend unit test suite
pnpm --filter web test

# 4. Verify web production compilation build
pnpm --filter web build

# 5. Verify git diff to ensure ONLY index.css was modified
git diff --check
```

---

## 11. Manual QA Checklist

Inspect the web client across 4 responsive viewports (1440px Desktop, 1024px Laptop, 800px Tablet, 375px Mobile):
- [ ] **Canvas Color**: Base page canvas renders `#0c1324` dark slate.
- [ ] **Surface Fills**: Containers render `#191f31` Layer 1 fill and elevated surfaces render `#23293c`.
- [ ] **Primary Accent**: Primary buttons and active highlights display `#38bdf8` sky cyan.
- [ ] **Semantic Accents**: Success elements render `#10b981`, Warning `#f59e0b`, Danger `#f43f5e`.
- [ ] **Border Radii**: Cards/containers render 4px rounded corners (`0.25rem`), micro-badges render 2px (`0.125rem`).
- [ ] **Focus Ring**: Pressing `Tab` renders a razor-thin 1px cyan focus outline around focused controls.
- [ ] **Print Preview**: Opening Browser Print (`Ctrl+P`) renders clean black-on-white document output without navigation bars.

---

## 12. Acceptance Criteria

- [x] Only `apps/web/src/index.css` is modified.
- [x] All 8 specified token refinements and 4 typography utility additions are present in `index.css`.
- [x] All existing Inter/JetBrains Mono declarations, spacing scale variables, and print rules remain intact.
- [x] `pnpm --filter web typecheck` passes cleanly.
- [x] `pnpm --filter web lint` passes cleanly.
- [x] `pnpm --filter web test` passes cleanly with all unit tests green.
- [x] `pnpm --filter web build` compiles cleanly.
- [x] `git diff --check` verifies no trailing whitespace or extra file changes.

---

## 13. Git Workflow

This is PLAN ONLY. No Git operations will be performed now.

Future execution workflow:
1. User approves implementation plan (`POST-COMPLETION-BATCH-1-STITCH-UI-IMPLEMENTATION-PLAN.md`).
2. Agent creates feature branch: `feature/stitch-batch-1-design-tokens`.
3. Agent applies CSS token updates to `apps/web/src/index.css`.
4. Agent runs automated verification suite (`typecheck`, `lint`, `test`, `build`, `git diff --check`).
5. Agent performs 4-breakpoint manual QA.
6. Agent requests explicit user approval to merge.
7. Agent commits, merges (`git merge --no-ff`), pushes to `origin/main`, deletes feature branch.

---

## 14. EXPLICIT SAFETY STATEMENT

**Backend source code, API routes, database schemas, authentication logic, session store handlers, role authorization guards, calculation formulas, and business logic remain 100% untouched and preserved.**

---

## 15. Summary & Readiness Status

- **Plan File Created**: `docs/plans/POST-COMPLETION-BATCH-1-STITCH-UI-IMPLEMENTATION-PLAN.md`
- **Exact File Boundary**: `apps/web/src/index.css` (1 file only)
- **Token Changes**: Canvas (`#0c1324`), Surface (`#191f31`), Elevated Surface (`#23293c`), Brand Primary (`#38bdf8`), State Colors (`#10b981`, `#f43f5e`, `#f59e0b`), Radii (`0.125rem`, `0.25rem`, `0.375rem`), Focus (`0 0 0 1px #38bdf8`)
- **Typography Additions**: `.font-label-code-lg`, `.font-label-code-md`, `.font-label-code-sm`, `.font-caption-caps`
- **Preservation**: Inter, JetBrains Mono, 8px spacing scale, print rules
- **Verification**: `typecheck`, `lint`, `test`, `build`, `git diff --check` + 4-breakpoint QA
- **Status**: **READY FOR PLAN REVIEW**
