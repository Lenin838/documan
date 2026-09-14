# Batch 1 — Stitch UI Research

**Target Artifact**: `docs/research/POST-COMPLETION-BATCH-1-STITCH-UI-RESEARCH.md`  
**Status**: COMPLETE BATCH 1 RESEARCH ARTIFACT  
**Mode**: RESEARCH ONLY — No source code, package.json, lockfile, or backend logic modifications executed.

---

## 1. Objective

Research the current repository implementation of the global frontend design system in `apps/web/src/index.css` and compare it against the approved **Documan High-Fidelity Design System & UI Kit** (Stitch Project ID: `projects/9852339151029178160`).

The goal of Batch 1 research is to map the exact CSS variable, typography scale, surface color, border hairline, focus ring, responsive foundation, and `@media print` rules required to establish the **Precision Blueprint / Deterministic Ledger** dark mode foundation, while preserving all existing repository functionality, build scripts, and backend business logic.

---

## 2. Current Repository Design-System Inventory

The current web client global stylesheet is located at `apps/web/src/index.css`. Key existing declarations include:
- **Typography Families**: Defines `--font-sans` (`Inter`, system-ui...) and `--font-mono` (`JetBrains Mono`...).
- **Spacing Grid**: Baseline 8px spacing scale (`--space-1: 0.25rem` to `--space-12: 3.00rem`).
- **Dark Theme Tokens**:
  - Base Canvas (`--color-bg-canvas: #020617` / `slate-950`)
  - Container Fill (`--color-bg-surface: #0f172a` / `slate-900`)
  - Elevated Fill (`--color-bg-elevated: #1e293b` / `slate-800`)
  - Default Border (`--color-border-default: #1e293b` / `slate-800`)
  - Main Text (`--color-text-main: #f8fafc` / `slate-50`)
  - Muted Text (`--color-text-muted: #94a3b8` / `slate-400`)
  - Primary Brand (`--color-brand-primary: #818cf8` / `indigo-400`)
- **Temporal & Governance Tokens**:
  - `[T_cert]` Snapshot (`--color-cert-snapshot-bg: rgba(88, 28, 135, 0.6)`, text `#c084fc`, border `rgba(126, 34, 206, 0.8)`)
  - `[T_now]` Live Drift (`--color-drift-live-bg: rgba(12, 74, 110, 0.6)`, text `#38bdf8`, border `rgba(3, 105, 161, 0.8)`)
- **Radii**: `--radius-sm: 0.375rem` (6px), `--radius-md: 0.50rem` (8px), `--radius-lg: 0.75rem` (12px).
- **Global Focus**: `.focus-ring:focus-visible` with 2px indigo outline.
- **Print Stylesheet**: Foundational `@media print` rules setting white background and hiding navigation controls.

---

## 3. Stitch Design-System Inventory

Extracted directly from Stitch Project `projects/9852339151029178160` (Design System: Deterministic Ledger / Precision Blueprint):
- **Atmosphere & Surfaces**:
  - Base Canvas (`background` / `surface-dim`): `#0c1324` (Deep slate dark canvas)
  - Layer 1 Container (`surface-container`): `#191f31`
  - Layer 2 High Container (`surface-container-high`): `#23293c`
  - Elevated Container (`surface-container-highest`): `#2e3447`
  - Hairline Border (`outline` / `outline-variant`): `#1e293b` / `#3e484f`
- **Semantic Accents**:
  - **Primary (`#38bdf8` - Sky / Cyan)**: Dynamic runtime evaluation, live cursors, active tracking.
  - **Secondary (`#a855f7` - Purple / Violet)**: Cryptographically certified states (`[T_cert]`), immutable snapshots.
  - **Tertiary / Compliant (`#10b981` - Emerald / Teal)**: Attested pass state, zero-drift compliance.
  - **Warning / Waiver (`#f59e0b` - Amber)**: Active policy waivers, uncertified overrides.
  - **Violation / Gating Failure (`#f43f5e` - Rose)**: Hard policy blocks, broken signature chains.
- **Typography Scale**:
  - `headline-lg`: Inter `32px` / weight `600` / line-height `40px` / letter-spacing `-0.02em`
  - `headline-md`: Inter `22px` / weight `600` / line-height `28px` / letter-spacing `-0.01em`
  - `headline-sm`: Inter `18px` / weight `600` / line-height `24px` / letter-spacing `-0.005em`
  - `body-lg`: Inter `16px` / weight `400` / line-height `24px`
  - `body-md`: Inter `14px` / weight `400` / line-height `20px`
  - `body-sm`: Inter `12px` / weight `400` / line-height `16px`
  - `label-code-lg`: JetBrains Mono `13px` / weight `500` / line-height `18px` / letter-spacing `-0.01em`
  - `label-code-md`: JetBrains Mono `11px` / weight `500` / line-height `16px` / letter-spacing `0em`
  - `label-code-sm`: JetBrains Mono `10px` / weight `400` / line-height `14px` / letter-spacing `0.02em`
  - `caption-caps`: JetBrains Mono `10px` / weight `600` / line-height `12px` / letter-spacing `0.06em` uppercase
- **Soft Geometric Radii**:
  - `radius-sm`: `0.125rem` (2px) for micro-badges, hash pills, metric tags
  - `radius-md`: `0.25rem` (4px) for standard containers, cards, buttons
  - `radius-lg`: `0.375rem` (6px) for modals and drawers
- **Focus Rings**: Surgical razor-thin ring `0 0 0 1px #38bdf8` without wide multi-stop drop shadows.

---

## 4. Repository vs Stitch Comparison

| Area | Current Repository (`index.css`) | Stitch Target (`projects/9852339151029178160`) | Status | Required Change |
|---|---|---|---|---|
| **Font Family (Sans)** | `'Inter', system-ui, sans-serif` | `'Inter', sans-serif` | **ALREADY ALIGNED** | None |
| **Font Family (Mono)** | `'JetBrains Mono', monospace` | `'JetBrains Mono', monospace` | **ALREADY ALIGNED** | None |
| **Typography Scale** | Standard Tailwind font sizes | Structured `headline-*`, `body-*`, `label-code-*` tokens | **ALIGNMENT / REFINEMENT** | Add `label-code-*` & `caption-caps` token classes |
| **Global Canvas Color** | `#020617` (`slate-950`) | `#0c1324` (Precision Dark Slate) | **ALIGNMENT / REFINEMENT** | Update `--color-bg-canvas` to `#0c1324` |
| **Container Fill Color** | `#0f172a` (`slate-900`) | `#191f31` (Layer 1 Slate Container) | **ALIGNMENT / REFINEMENT** | Update `--color-bg-surface` to `#191f31` |
| **Elevated Surface Fill**| `#1e293b` (`slate-800`) | `#23293c` (Layer 2 High Container) | **ALIGNMENT / REFINEMENT** | Update `--color-bg-elevated` to `#23293c` |
| **Primary Accent Color**| `#818cf8` (`indigo-400`) | `#38bdf8` (`sky-400` / Sky Cyan) | **ALIGNMENT / REFINEMENT** | Update `--color-brand-primary` to `#38bdf8` |
| **Certified Token (`T_cert`)**| `rgba(88, 28, 135, 0.6)` / `#c084fc` | `rgba(168, 85, 247, 0.1)` / `#a855f7` / `#d8b4fe` | **ALIGNMENT / REFINEMENT** | Align `T_cert` violet token values to Stitch |
| **Live Drift Token (`T_now`)**| `rgba(12, 74, 110, 0.6)` / `#38bdf8` | `rgba(56, 189, 248, 0.1)` / `#38bdf8` / `#7dd3fc` | **ALIGNMENT / REFINEMENT** | Align `T_now` sky cyan token values to Stitch |
| **Compliant Token** | `#34d399` (`emerald-400`) | `#10b981` (`emerald-500` / Teal) | **ALIGNMENT / REFINEMENT** | Update compliant token to `#10b981` |
| **Violation Token** | `#f87171` (`red-400`) | `#f43f5e` (`rose-500` / Rose) | **ALIGNMENT / REFINEMENT** | Update violation token to `#f43f5e` |
| **Warning Token** | `#fbbf24` (`amber-400`) | `#f59e0b` (`amber-500` / Amber) | **ALIGNMENT / REFINEMENT** | Update warning token to `#f59e0b` |
| **Container Radius** | `--radius-md: 0.50rem` (8px) | `--radius-md: 0.25rem` (4px) | **ALIGNMENT / REFINEMENT** | Soft geometric radius `0.25rem` (4px) |
| **Micro-Badge Radius** | `--radius-sm: 0.375rem` (6px) | `--radius-sm: 0.125rem` (2px) | **ALIGNMENT / REFINEMENT** | Micro-badge radius `0.125rem` (2px) |
| **Focus Ring Style** | `outline: 2px solid #6366f1` | `box-shadow: 0 0 0 1px #38bdf8` | **ALIGNMENT / REFINEMENT** | Update focus ring to 1px cyan outline |
| **Spacing Grid Scale** | `--space-1` (4px) to `--space-12` (48px) | Baseline 4px/8px stepped scale | **ALREADY ALIGNED** | None |
| **Print Foundation** | `@media print` rule present | White bg, hide nav, 1px table border | **ALREADY ALIGNED** | Retain print stylesheet rules |
| **Responsive Foundation**| `@media (max-width: 1024px)` font size step | Breakpoints (`375px`, `800px`, `1024px`, `1440px`) | **ALREADY ALIGNED** | Retain responsive font scaling |

---

## 5. Already-Aligned Tokens

The following design system foundations in `apps/web/src/index.css` are **ALREADY ALIGNED** and must be preserved without replacement:
1. **Font Families**: `'Inter'` for UI/Headlines and `'JetBrains Mono'` for code/audit telemetry are already declared and active.
2. **Baseline Spacing Grid**: The 4px/8px stepped spacing variable scale (`--space-1` through `--space-12`) matches Stitch spacing rules.
3. **Print Foundation**: `@media print` rules setting white canvas background (`#ffffff`), hiding shell controls (`header`, `nav`, `button`), and enforcing 1px table borders are already active.
4. **Responsive Breakpoint Scaling**: Baseline font-size scale adjustments for screens `< 1024px` match responsive foundations.

---

## 6. Required Refinements

The following specific CSS variable and class refinements are required in `apps/web/src/index.css`:
1. **Canvas & Container Surfaces**:
   - `--color-bg-canvas`: Update from `#020617` to `#0c1324`.
   - `--color-bg-surface`: Update from `#0f172a` to `#191f31`.
   - `--color-bg-elevated`: Update from `#1e293b` to `#23293c`.
2. **Brand & Semantic Accents**:
   - `--color-brand-primary`: Update from `#818cf8` (indigo) to `#38bdf8` (sky cyan).
   - `--color-brand-hover`: Update from `#a5b4fc` to `#7dd3fc`.
   - `--color-state-success`: Update from `#34d399` to `#10b981`.
   - `--color-state-danger`: Update from `#f87171` to `#f43f5e`.
   - `--color-state-warning`: Update from `#fbbf24` to `#f59e0b`.
3. **Temporal Token Adjustments**:
   - `[T_cert]` Snapshot: Set background `rgba(168, 85, 247, 0.1)`, border `1px solid #a855f7`, text `#d8b4fe`.
   - `[T_now]` Live Drift: Set background `rgba(56, 189, 248, 0.1)`, border `1px solid #38bdf8`, text `#7dd3fc`.
4. **Soft Geometric Radii**:
   - `--radius-sm`: Update from `0.375rem` (6px) to `0.125rem` (2px).
   - `--radius-md`: Update from `0.50rem` (8px) to `0.25rem` (4px).
   - `--radius-lg`: Update from `0.75rem` (12px) to `0.375rem` (6px).
5. **Focus Ring Utility**:
   - Update `.focus-ring:focus-visible` to `box-shadow: 0 0 0 1px #38bdf8; outline: none;`.

---

## 7. Missing Foundation Elements

The following Stitch typographic token utility classes should be added to `apps/web/src/index.css`:
1. `.font-label-code-lg`: `font-family: var(--font-mono); font-size: 13px; font-weight: 500; line-height: 18px; letter-spacing: -0.01em;`
2. `.font-label-code-md`: `font-family: var(--font-mono); font-size: 11px; font-weight: 500; line-height: 16px; letter-spacing: 0em;`
3. `.font-label-code-sm`: `font-family: var(--font-mono); font-size: 10px; font-weight: 400; line-height: 14px; letter-spacing: 0.02em;`
4. `.font-caption-caps`: `font-family: var(--font-mono); font-size: 10px; font-weight: 600; line-height: 12px; letter-spacing: 0.06em; text-transform: uppercase;`

---

## 8. Unsupported Elements

The following concepts must **NOT** be introduced into the global stylesheet or design system tokens:
1. **Light Mode Theme Overrides**: Documan is default dark mode (`#0c1324`). No light theme overrides or theme toggles may be added.
2. **Multi-Stop Diffuse Shadows**: No wide floating drop shadows (e.g. `0 20px 25px -5px rgba(0,0,0,0.5)`). Design uses tonal surface layering (`#0c1324` -> `#191f31` -> `#23293c`) with 1px hairline slate borders (`#1e293b`).
3. **Pill / Circular Badges for Technical Metadata**: Micro-badges must use soft geometric radius `0.125rem` (2px). Rounded full `9999px` pills are prohibited for status micro-badges.
4. **Unsupported Temporal Tokens**: `[T_predicted]` tokens are prohibited from global static token classes (reserved for simulation overlays only).

---

## 9. Files That Would Need Changes

When Batch 1 implementation proceeds, the ONLY file that would be modified is:
- `apps/web/src/index.css`

---

## 10. Files That Must NOT Change

The following files and directories MUST NOT be modified during Batch 1 implementation:
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/features/*` (All API clients and Zustand stores)
- `apps/api/*` (All backend API modules, controllers, services, models, routes)
- Root workspace config files (`pnpm-lock.yaml`, `package.json`, `turbo.json`)

---

## 11. Regression Risks

1. **Contrast Regression**: Ensuring text color (`#f8fafc` / `#cbd5e1`) maintains >= 7:1 contrast ratio against updated slate surface fill (`#191f31`).
2. **Focus Visibility Regression**: Ensuring the 1px cyan focus ring (`#38bdf8`) remains clearly visible against dark container backgrounds.
3. **Print Layout Shift**: Ensuring `@media print` rules continue to force `#ffffff` background fill and hide navigation bars.

---

## 12. Batch 1 Implementation Boundary

### Batch 1 WILL Implement:
- Update CSS custom property values in `apps/web/src/index.css` for canvas background (`#0c1324`), surface fill (`#191f31`), border (`#1e293b`), primary cyan (`#38bdf8`), violet (`#a855f7`), emerald (`#10b981`), rose (`#f43f5e`), and radii (2px/4px/6px).
- Add typographic utility classes (`.font-label-code-lg`, `.font-label-code-md`, `.font-label-code-sm`, `.font-caption-caps`).
- Update `.focus-ring:focus-visible` to 1px cyan box shadow.

### Batch 1 WILL NOT Implement:
- Changes to React components (`apps/web/src/components/*`).
- Changes to page routes (`apps/web/src/pages/*` or `App.tsx`).
- Changes to backend source code or API contracts (`apps/api/*`).
- Package installations or dependency changes.

---

## 13. Verification Requirements

When Batch 1 implementation is executed, the following commands MUST pass cleanly:

```bash
# 1. Typecheck web application
pnpm --filter web typecheck

# 2. Run ESLint code quality checks
pnpm --filter web lint

# 3. Run frontend test suite
pnpm --filter web test

# 4. Verify web production build compilation
pnpm --filter web build

# 5. Verify git status to confirm no extra files were modified
git status --short --branch
```

### Responsive & Accessibility Manual QA:
- Verify dark canvas (`#0c1324`) and surface containers (`#191f31`) across 1440px desktop, 1024px laptop, 800px tablet, and 375px mobile viewports.
- Verify 1px cyan focus outline on interactive elements using keyboard `Tab` navigation.
- Verify browser Print Preview (`Ctrl+P` / `Cmd+P`) applies white canvas background and hides header/nav bars.

---

## 14. Final Recommendation

**READY FOR IMPLEMENTATION PLAN**

*(Batch 1 research is complete. The exact CSS token refinements and utility classes for `apps/web/src/index.css` are fully documented and ready for batch implementation plan review).*
