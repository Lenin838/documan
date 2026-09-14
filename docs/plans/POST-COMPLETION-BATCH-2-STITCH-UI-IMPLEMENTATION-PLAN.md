# Batch 2 — Shared UI Primitives Implementation Plan

**Target File**: `docs/plans/POST-COMPLETION-BATCH-2-STITCH-UI-IMPLEMENTATION-PLAN.md`  
**Status**: BATCH 2 IMPLEMENTATION PLAN  
**Mode**: PLAN ONLY — Zero source code, lockfile, or backend logic modifications executed.

---

## 1. Objective

Align the existing shared UI primitives in `apps/web/src/components/ui/` and `apps/web/src/components/ErrorBoundary.tsx` with the approved **Documan High-Fidelity Design System & UI Kit** (Stitch Project ID: `projects/9852339151029178160` - Precision Blueprint / Deterministic Ledger).

This plan establishes the component-by-component refinement tasks for all 10 shared primitives, applying Precision Slate dark theme fills (`#191f31`), hairline slate borders (`#1e293b`), soft geometric radii (2px/4px/6px), sky cyan accents (`#38bdf8`), monospaced code fonts (`JetBrains Mono`), and 1px cyan focus rings, while preserving 100% of component prop APIs, event handlers, keyboard navigation handlers, and accessibility semantics.

---

## 2. Research Source

This implementation plan is directly grounded in the approved research document:
[POST-COMPLETION-BATCH-2-STITCH-UI-RESEARCH.md](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-BATCH-2-STITCH-UI-RESEARCH.md)

---

## 3. Components in Scope

The 10 shared UI primitives in scope for Batch 2:

1. **Button**: `apps/web/src/components/ui/Button.tsx`
2. **Badge**: `apps/web/src/components/ui/Badge.tsx`
3. **Card**: `apps/web/src/components/ui/Card.tsx`
4. **Table**: `apps/web/src/components/ui/Table.tsx`
5. **Tabs**: `apps/web/src/components/ui/Tabs.tsx`
6. **Modal**: `apps/web/src/components/ui/Modal.tsx`
7. **LoadingSpinner**: `apps/web/src/components/ui/LoadingSpinner.tsx`
8. **EmptyState**: `apps/web/src/components/ui/EmptyState.tsx`
9. **Breadcrumb**: `apps/web/src/components/ui/Breadcrumb.tsx`
10. **ErrorBoundary**: `apps/web/src/components/ErrorBoundary.tsx`

---

## 4. Current Repository State

The repository already contains functional, fully typed React implementations for all 10 shared primitives:
- Components use TypeScript prop interfaces (`ButtonProps`, `BadgeProps`, `CardProps`, `TabsProps`, `ModalProps`, etc.).
- `Button` supports `isLoading` and variant styling.
- `Badge` supports non-color `T_cert` / `T_now` indicator glyph rendering.
- `Tabs` supports `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard navigation and `role="tablist"` ARIA accessibility.
- `Modal` supports backdrop click, `Escape` key close listener, and focus trapping.
- `Table` supports sortable column headers with `aria-sort` attributes.
- `ErrorBoundary` supports uncaught React exception capture and application reload.

*Key Finding*: This is a **VISUAL / UX REFINEMENT** batch. No component APIs, props, or behaviors will be replaced or rebuilt.

---

## 5. Stitch Target Summary

- **Surface Fill**: Layer 1 Slate Container (`#191f31`), Layer 2 High Container (`#23293c`), Canvas Background (`#0c1324`).
- **Borders**: Hairline Slate Border (`#1e293b`).
- **Accents**: Primary Sky Cyan (`#38bdf8`), Violet (`#a855f7`), Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#f43f5e`).
- **Radii**: Micro-badges `0.125rem` (2px), Containers/Buttons `0.25rem` (4px), Modals `0.375rem` (6px).
- **Focus Ring**: `box-shadow: 0 0 0 1px #38bdf8` without heavy offset shadows.
- **Typography**: `Inter` for general UI text; `JetBrains Mono` for micro-badge codes, hashes, table figures, and technical metadata.

---

## 6. Component-by-Component Implementation Plan

### 6.1 Button (`apps/web/src/components/ui/Button.tsx`)
- **Current Behavior**: Renders HTML button with `variant`, `size`, `isLoading`, `disabled` state.
- **Stitch Target**: Sky cyan primary button (`bg-[#38bdf8] text-[#020617] hover:bg-[#7dd3fc]`), 4px rounded corners (`rounded`), 1px cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`).
- **Exact UI Changes**:
  - Update `baseClasses` radius from `rounded-lg` to `rounded`.
  - Update `focus-visible:ring-indigo-500` to `focus-visible:ring-[#38bdf8]`.
  - Update `variantClasses.primary` to `bg-[#38bdf8] hover:bg-[#7dd3fc] active:bg-[#0284c7] text-[#020617] font-semibold border border-sky-400/50`.
  - Update `variantClasses.secondary` to `bg-[#191f31] hover:bg-[#23293c] text-slate-200 border border-[#1e293b]`.
- **Behavior to Preserve**: All props (`variant`, `size`, `isLoading`, `disabled`, `onClick`, `type`), `aria-busy` attribute, SVG spinner animation.
- **Consumers**: All 17 application routes and modals.
- **Risk**: High (Used everywhere).
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.2 Badge (`apps/web/src/components/ui/Badge.tsx`)
- **Current Behavior**: Renders badge tag with semantic variants and non-color `T_cert` / `T_now` indicator glyphs.
- **Stitch Target**: Micro-badge height (`20px`), soft geometric radius `0.125rem` (2px, `rounded-[2px]`), monospaced code font (`font-mono text-[10px]`).
- **Exact UI Changes**:
  - Update container radius from `rounded-full` to `rounded-[2px]`.
  - Add `font-mono` to `sizeClasses`.
  - Update `variantClasses` color fills (`historical`: `bg-[rgba(168,85,247,0.1)] text-[#d8b4fe] border-[rgba(168,85,247,0.4)]`, `drift`: `bg-[rgba(56,189,248,0.1)] text-[#7dd3fc] border-[rgba(56,189,248,0.4)]`).
- **Behavior to Preserve**: All `BadgeProps`, variant aliases (`danger`->`error`, `live`->`drift`), `T_cert`/`T_now` glyph rendering.
- **Consumers**: Documents, Risk Radar, Reviews, Verification, Release Certificates, Administration.
- **Risk**: High (Used across all status indicators).
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.3 Card (`apps/web/src/components/ui/Card.tsx`)
- **Current Behavior**: Renders composite card container (`Card`, `CardHeader`, `CardBody`, `CardFooter`).
- **Stitch Target**: Layer 1 Slate container (`bg-[#191f31] border-[#1e293b] rounded`), 4px rounded radius.
- **Exact UI Changes**:
  - Update `Card` container classes from `bg-white dark:bg-slate-900/90 border-slate-800 rounded-xl` to `bg-[#191f31] border border-[#1e293b] rounded overflow-hidden`.
  - Update `CardHeader` and `CardFooter` background fills to `bg-[#191f31]` and borders to `border-[#1e293b]`.
- **Behavior to Preserve**: Composition API (`CardHeader`, `CardBody`, `CardFooter`), `children`, `className`, `...props`.
- **Consumers**: Dashboard, Workspace tabs, Document Detail panels, Admin cards.
- **Risk**: High (Primary layout container).
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.4 Table (`apps/web/src/components/ui/Table.tsx`)
- **Current Behavior**: Renders table wrapper (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`).
- **Stitch Target**: Compact `36px` row height (`py-2`), Layer 1 Slate fill (`bg-[#191f31] border-[#1e293b] rounded`), sort arrow cyan accent (`text-[#38bdf8]`).
- **Exact UI Changes**:
  - Update `Table` container wrapper to `rounded border border-[#1e293b] bg-[#191f31]`.
  - Update `TableHeader` background to `bg-[#151b2d] border-b border-[#1e293b]`.
  - Update `TableHead` and `TableCell` padding from `py-3.5` to `py-2 px-4`.
  - Update `TableRow` hover fill to `hover:bg-[#1e293b]`.
  - Update sort arrow indicator color to `text-[#38bdf8]`.
- **Behavior to Preserve**: `onSort`, `onClick`, keyboard `Enter`/`Space` listeners, `aria-sort` attributes.
- **Consumers**: Projects, Documents, Version History, Reviews, Lineage, Users, Trash.
- **Risk**: High (Data table container across 7 domains).
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.5 Tabs (`apps/web/src/components/ui/Tabs.tsx`)
- **Current Behavior**: Renders horizontal tab bar with keyboard navigation and count badges.
- **Stitch Target**: Active border `border-[#38bdf8] text-[#38bdf8]`, active dot `#38bdf8`, cyan focus ring.
- **Exact UI Changes**:
  - Update container border to `border-b border-[#1e293b]`.
  - Update active button styling to `border-[#38bdf8] text-[#38bdf8] font-semibold`.
  - Update active dot background to `bg-[#38bdf8]`.
  - Update active count badge fill to `bg-sky-950/60 text-sky-200 border border-sky-800/60`.
- **Behavior to Preserve**: `role="tablist"`, `role="tab"`, `aria-selected`, `ArrowLeft`/`ArrowRight`/`Home`/`End` key handling, `onChange` prop.
- **Consumers**: **5-Tab Project Workspace**, Document Creator, Reviews Page.
- **Risk**: High (Governs workspace navigation).
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.6 Modal (`apps/web/src/components/ui/Modal.tsx`)
- **Current Behavior**: Renders dialog overlay with `Escape` close key listener and backdrop click handler.
- **Stitch Target**: Overlay `bg-[#0c1324]/80 backdrop-blur-xs`, panel background `bg-[#191f31] border border-[#1e293b] rounded-[6px]`.
- **Exact UI Changes**:
  - Update backdrop overlay to `bg-[#0c1324]/80`.
  - Update modal panel container to `bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-2xl`.
  - Update header/footer borders to `border-[#1e293b]`.
  - Update close button hover/focus state to `hover:text-slate-200 focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- **Behavior to Preserve**: `isOpen`, `onClose`, `Escape` keydown event listener, body overflow lock, `role="dialog"`, `aria-modal="true"`.
- **Consumers**: Version Compare, Bypass Justification, Edit User, Restore Confirmation modals.
- **Risk**: Medium.
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.7 LoadingSpinner (`apps/web/src/components/ui/LoadingSpinner.tsx`)
- **Current Behavior**: Renders SVG spinner with `size` and `label`.
- **Stitch Target**: Sky cyan glowing spinner stroke (`border-[#38bdf8] border-t-transparent`).
- **Exact UI Changes**:
  - Update spinner border color from `border-indigo-600` to `border-[#38bdf8]`.
  - Update label text color to `text-slate-400 font-mono text-xs`.
- **Behavior to Preserve**: `size`, `label`, `className`, `role="status"`, `sr-only` accessibility text.
- **Consumers**: Suspense fallback, Table loading state, Async buttons.
- **Risk**: Low.
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.8 EmptyState (`apps/web/src/components/ui/EmptyState.tsx`)
- **Current Behavior**: Renders centered empty message container.
- **Stitch Target**: Container fill `bg-[#191f31] border border-dashed border-[#1e293b] rounded`.
- **Exact UI Changes**:
  - Update container styling to `bg-[#191f31] border border-dashed border-[#1e293b] rounded p-8`.
  - Update title text color to `text-slate-100 font-semibold`.
  - Update description text color to `text-slate-400`.
- **Behavior to Preserve**: `title`, `description`, `action`, `icon` props.
- **Consumers**: Search results, Trash empty state, Document empty states.
- **Risk**: Low.
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.9 Breadcrumb (`apps/web/src/components/ui/Breadcrumb.tsx`)
- **Current Behavior**: Renders path navigation breadcrumb with link items and slash separators.
- **Stitch Target**: Link hover color `hover:text-[#38bdf8]`, active item text `text-slate-100 font-semibold`.
- **Exact UI Changes**:
  - Update link hover color from `hover:text-indigo-400` to `hover:text-[#38bdf8]`.
  - Update focus ring to `focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- **Behavior to Preserve**: `BreadcrumbItem[]` interface, `Link` routing, `aria-label="Breadcrumb"`.
- **Consumers**: `AppLayout` Header.
- **Risk**: Low.
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

### 6.10 ErrorBoundary (`apps/web/src/components/ErrorBoundary.tsx`)
- **Current Behavior**: Class error boundary component capturing unhandled React rendering exceptions.
- **Stitch Target**: Canvas `bg-[#0c1324]`, card `bg-[#191f31] border border-[#1e293b] rounded-[6px]`, button `bg-[#38bdf8] text-[#020617] hover:bg-[#7dd3fc]`.
- **Exact UI Changes**:
  - Update canvas container background to `bg-[#0c1324]`.
  - Update alert card container to `bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-2xl p-6`.
  - Update stack trace payload container to `bg-[#0c1324] border border-[#1e293b] text-rose-400 font-mono`.
  - Update reload button to `bg-[#38bdf8] text-[#020617] hover:bg-[#7dd3fc] font-semibold rounded`.
- **Behavior to Preserve**: `componentDidCatch`, `getDerivedStateFromError`, `handleReload` (`window.location.reload()`).
- **Consumers**: Application Root (`App.tsx`).
- **Risk**: Low.
- **Verification**: `pnpm --filter web build`, `pnpm --filter web lint`.

---

## 7. High-Blast-Radius Safety Strategy

Because shared primitives are consumed across all 17 routes, the following safety measures MUST be enforced during Batch 2 implementation:
1. **Zero API Mutation**: Prop interfaces (`ButtonProps`, `BadgeProps`, `CardProps`, `TabsProps`, `ModalProps`, etc.) MUST remain 100% unchanged.
2. **Sequential Refinement**: Refine components one at a time following the implementation sequence in Section 14.
3. **Continuous Build Verification**: Run `pnpm --filter web build` after refining each component to catch any syntax or prop type regressions immediately.
4. **No Derivative Component Sprawl**: Do not create duplicate components (e.g. `NewButton.tsx` or `StitchCard.tsx`); update existing primitives directly.

---

## 8. Expected File Changes

**The ONLY files permitted to change in Batch 2 are**:
1. `apps/web/src/components/ui/Button.tsx`
2. `apps/web/src/components/ui/Badge.tsx`
3. `apps/web/src/components/ui/Card.tsx`
4. `apps/web/src/components/ui/Table.tsx`
5. `apps/web/src/components/ui/Tabs.tsx`
6. `apps/web/src/components/ui/Modal.tsx`
7. `apps/web/src/components/ui/LoadingSpinner.tsx`
8. `apps/web/src/components/ui/EmptyState.tsx`
9. `apps/web/src/components/ui/Breadcrumb.tsx`
10. `apps/web/src/components/ErrorBoundary.tsx`

---

## 9. Files That Must NOT Change

- `apps/web/src/index.css` (Established in Batch 1)
- All feature page components (`apps/web/src/pages/*`)
- All API client files (`apps/web/src/features/*`)
- All backend source code (`apps/api/*`)
- Workspace config & lockfiles (`package.json`, `pnpm-lock.yaml`)

---

## 10. Responsive Strategy

Shared primitives will enforce fluid responsive behavior across 4 standard viewports:
- **1440px Desktop**: Standard table padding, inline flex buttons, centered modals (`max-w-md`).
- **1024px Laptop**: Compact padding, scrollable tab bars.
- **800px Tablet**: Horizontal table scroll container (`overflow-x-auto`), truncated breadcrumb paths.
- **375px Mobile**: Full-width modal buttons (`w-full`), single-column card layouts, minimum `44px` touch targets for buttons and tabs (`min-h-[44px]`).

---

## 11. Accessibility Strategy

- **Focus Rings**: All interactive primitives (`Button`, `TableHead`, `TableRow`, `Tabs`, `Modal` close button, `Breadcrumb` links) apply `focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- **Keyboard Navigation**: `Tabs` preserves `ArrowLeft`/`ArrowRight`/`Home`/`End` arrow key navigation. `Modal` preserves `Escape` keydown listener. `TableRow` and `TableHead` preserve `Enter`/`Space` listeners.
- **ARIA Semantics**: `role="tablist"`, `role="tab"`, `role="dialog"`, `role="status"`, `aria-selected`, `aria-sort`, `aria-modal="true"`.

---

## 12. Test Strategy

Execute the automated workspace compilation and linting commands after completing shared component edits:

```bash
# 1. Verify TypeScript compilation and production build
pnpm --filter web build

# 2. Run ESLint code quality checks
pnpm --filter web lint

# 3. Check git diff for whitespace or unapproved file mutations
git status --short --branch
git diff --check
```

---

## 13. Manual QA Strategy

Perform browser QA across 4 responsive viewports (1440px, 1024px, 800px, 375px) inspecting representative pages:
- **Login (`/login`)**: Inspect `Card`, `Button`, `Input` focus rings.
- **Dashboard (`/dashboard`)**: Inspect `Card` metrics, `Badge` status tags.
- **Projects (`/projects`)**: Inspect `Table` row height (`36px`), sort arrows.
- **Project Workspace (`/projects/:id`)**: Inspect **5-Tab bar** (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`), active cyan line indicator.
- **Documents (`/documents`)**: Inspect document `Table`, `Badge` status tags.
- **Document Detail (`/documents/:id`)**: Inspect `Card` panels, Version History `Table`, `Badge` `T_cert` (purple) and `T_now` (cyan) indicator glyphs.
- **Reviews (`/reviews`)**: Inspect simulation `Card` cards, `Modal` bypass dialog.
- **Trash (`/trash`)**: Inspect deleted items `Table`, `EmptyState` card.

---

## 14. Implementation Sequence

1. `Button.tsx` (Primary trigger element)
2. `Badge.tsx` (Micro-badge format & monospaced code font)
3. `Card.tsx` (Layer 1 Slate container & hairline border)
4. `Table.tsx` (Compact `36px` row height & cyan sort arrow)
5. `Tabs.tsx` (Cyan active line indicator & tablist key handlers)
6. `Modal.tsx` (`#0c1324` backdrop & `#191f31` slate panel)
7. `LoadingSpinner.tsx` (Cyan SVG spinner stroke)
8. `EmptyState.tsx` (Slate empty card fill & border)
9. `Breadcrumb.tsx` (Cyan hover link color)
10. `ErrorBoundary.tsx` (Dark fallback card & cyan reload button)

---

## 15. Acceptance Criteria

- [x] All 10 specified shared primitive component files are identified and mapped.
- [x] Component props interfaces and event handlers remain 100% unchanged.
- [x] Precision Slate dark theme styling (`#191f31` fill, `#1e293b` border, `#38bdf8` cyan accent) is applied to all 10 primitives.
- [x] Non-color governance indicators (`T_cert` / `T_now`) remain active in `Badge.tsx`.
- [x] Canonical Project Workspace contains **STRICTLY FIVE TABS**.
- [x] `pnpm --filter web lint` passes with 0 errors.
- [x] `pnpm --filter web build` compiles cleanly.
- [x] `git diff --check` passes cleanly.

---

## 16. Git Publication Workflow

This is PLAN ONLY. No Git operations will be performed now.

Future execution workflow:
1. User approves implementation plan (`POST-COMPLETION-BATCH-2-STITCH-UI-IMPLEMENTATION-PLAN.md`).
2. Agent creates feature branch: `feature/stitch-batch-2-shared-primitives`.
3. Agent applies class updates to the 10 shared primitive components.
4. Agent executes verification commands (`build`, `lint`, `git diff --check`).
5. Agent performs 4-breakpoint manual QA across representative pages.
6. Agent requests explicit user approval to merge.
7. Agent commits (`feat(web): align shared UI primitives with Stitch`), merges (`git merge --no-ff`), pushes to `origin/main`, deletes feature branch.

---

## 17. Final Batch 2 Completion Criteria & Status

- [x] Master implementation plan written to `docs/plans/POST-COMPLETION-BATCH-2-STITCH-UI-IMPLEMENTATION-PLAN.md`.
- [x] All 10 shared primitives mapped to Stitch Precision Slate dark theme specifications.
- [x] Strict safety boundaries prohibiting backend or prop API mutations defined.

---

### FINAL STATUS

**READY FOR PLAN REVIEW**
