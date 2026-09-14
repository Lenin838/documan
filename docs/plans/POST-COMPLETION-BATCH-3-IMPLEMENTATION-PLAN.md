# Post-Completion Batch 3 Implementation Plan

**Plan Artifact**: `docs/plans/POST-COMPLETION-BATCH-3-IMPLEMENTATION-PLAN.md`  
**Target Batch**: Batch 3 — App Shell & Header Navigation Refinement  
**Repository Branch**: `main`  
**Current Published Commit**: `115d8985c1c853de890cffe5fff73821f7d6ff02`  
**Date**: September 13, 2026  
**Status**: **PLAN ONLY / NO SOURCE CHANGES MADE**

---

## 1. Objective

The objective of Batch 3 is to translate the approved Figma Design System specifications for the **App Shell**, **Header Navigation**, **NotificationBell**, and **Breadcrumb** components into `apps/web`.

This plan details the minimal, risk-mitigated implementation steps for:
- App Shell & sticky header visual polish (`AppLayout.tsx`).
- Navigation hierarchy, active route indicators (`aria-current="page"`), and focus rings.
- Responsive layout behavior across desktop (1440px), laptop/tablet (1024px/800px), and mobile (375px) viewports.
- **Finding F-06**: `NotificationBell` hover-scale microinteraction (`hover:scale-105 transition-transform duration-150 active:scale-95`).
- **Finding F-07**: `Breadcrumb` mobile vertical alignment and separator spacing (`Breadcrumb.tsx`).

---

## 2. Baseline

- **Current Repository Branch**: `main`
- **Published Main Commit**: `115d8985c1c853de890cffe5fff73821f7d6ff02`
- **Batch 1 Status**: Complete & Published (`25e4c5c47af2717ac3221862185a1009c0fc2946` — `apps/web/src/index.css`)
- **Batch 2 Status**: Complete & Published (`115d8985c1c853de890cffe5fff73821f7d6ff02` — `Button`, `Badge`, `Card`, `Table`, `Tabs`)
- **Batch 3 Status**: Research Completed ([`docs/research/POST-COMPLETION-BATCH-3-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-BATCH-3-RESEARCH.md)); Implementation NOT started.
- **Product Roadmap**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md) is UNCHANGED. Phase 32 is final. There is NO Phase 33.

---

## 3. Approved Scope

Batch 3 contains exactly six approved scope items:

1. **App Shell & Header Refinement**: Align sticky header container padding, background blur (`backdrop-blur-md`), and border dividers (`border-slate-800`).
2. **Navigation Active States & Hierarchy**: Refine `<NavLink>` active indicator styles, contrast, and `aria-current="page"` semantics.
3. **Responsive Header Behavior**: Refine mobile hamburger menu drawer, container boundaries, and navigation visibility across breakpoints.
4. **Accessibility Controls**: Enhance skip-to-content links, `aria-label`, `aria-expanded`, and high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`).
5. **Finding F-06 (`NotificationBell.tsx`)**: Implement hover-scale microinteraction (`hover:scale-105 transition-transform duration-150 active:scale-95`) and replace inline styles with Tailwind design tokens.
6. **Finding F-07 (`Breadcrumb.tsx`)**: Implement responsive flex wrapping (`flex flex-wrap items-center gap-1.5`) and separator vertical alignment for 375px mobile viewports.

---

## 4. Out-of-Scope

The following items are strictly forbidden in Batch 3:

- **NO** redesign of page views (`LoginPage`, `DashboardPage`, `ProjectsPage`, `DocumentsPage`, etc.).
- **NO** changes to backend APIs, schema validators, controllers, or services in `apps/api`.
- **NO** changes to `NotificationBell` 15-second polling interval (`setInterval`), notification state management, mark-as-read endpoints, or item click routing.
- **NO** changes to `BreadcrumbItem` interface (`label`, `href`), page-level breadcrumb configuration, or router links.
- **NO** changes to `docs/PRODUCT-ROADMAP.md` or Phase 33 creation.
- **NO** Batch 4 (`GovernanceBanner.tsx`) or later batch implementation.

---

## 5. File-by-File Change Plan

### 5.1 App Shell / AppLayout

- **Target File**: [`apps/web/src/components/layout/AppLayout.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/layout/AppLayout.tsx)
- **Current Behavior**: `AppLayout.tsx` provides a sticky header, desktop navigation items, global `Cmd+K` keyboard shortcut listener, user controls, mobile hamburger menu drawer, `<main id="main-content">`, and footer.
- **Required Changes**:
  1. Header container: Refine padding and border dividers to align with Batch 1 slate tokens (`bg-slate-900/90 backdrop-blur-md border-b border-slate-800`).
  2. Quick search button: Align `Cmd+K` button styling (`bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200`) and focus ring.
  3. Mobile drawer: Add explicit `aria-expanded` and `aria-label` accessibility attributes to mobile menu button, and ensure clean z-index layering (`z-40` for header).
- **Exact Reason**: Aligns layout container with Figma Design System specifications and enhances screen reader accessibility.
- **Implementation Approach**: Update Tailwind class strings on `<header>`, `<nav>`, and search trigger button; add accessibility attributes.
- **Tests Required**: No new unit test files required (verified via automated build, lint, typecheck, and manual browser QA).

### 5.2 Header / Navigation

- **Target File**: [`apps/web/src/components/layout/AppLayout.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/layout/AppLayout.tsx)
- **Current Behavior**: NavLinks map over `navItems` array (`Dashboard`, `Projects`, `Documents`, `Knowledge Search`, `My Reviews`, `Trash`, `Manage Users`). Active NavLink applies `bg-indigo-900/40 text-indigo-300 border border-indigo-500/30`.
- **Required Changes**:
  1. Desktop NavLinks: **NO CHANGE REQUIRED** to data structure or route list. Update active styling to use high-contrast text (`text-indigo-300`), subtle glow border (`border-indigo-500/40`), and clear focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`).
  2. Mobile NavLinks: **NO CHANGE REQUIRED** to data structure. Ensure active state applies `border-l-2 border-indigo-500 bg-indigo-950/40 text-indigo-300` in mobile drawer for color-independent active visual feedback.
- **Exact Reason**: Ensures visual consistency with Batch 2 tab active state standards and maintains accessibility across dark themes.
- **Implementation Approach**: Refine class strings inside `<NavLink className={({ isActive }) => ...}>`.
- **Tests Required**: No new test files required.

### 5.3 NotificationBell — F-06

- **Target File**: [`apps/web/src/components/NotificationBell.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/NotificationBell.tsx)
- **Current Behavior**: Uses inline CSS (`style={{ position: 'relative', padding: '0.4rem 0.8rem', ... }}`) on trigger button. State logic handles polling (15s), unread count badge, and dropdown.
- **Required Changes**:
  1. Replace inline styles on trigger `<button>` with Tailwind design tokens: `relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 text-slate-300 hover:text-slate-100 transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`.
  2. Add explicit accessibility attributes: `aria-label="Notifications"`, `aria-expanded={isOpen}`, `aria-haspopup="true"`.
  3. Refine unread badge counter pill styling using Batch 1 red state tokens (`bg-red-600 text-white rounded-full text-[11px] font-bold px-1.5 py-0.5`).
- **Exact Reason**: Fulfills Finding F-06 hover-scale microinteraction requirement while upgrading trigger button to design tokens.
- **Implementation Approach**: Replace inline `style` props on trigger button with Tailwind utility classes.
- **Tests Required**: No new test files required.

### 5.4 Breadcrumb — F-07

- **Target File**: [`apps/web/src/components/ui/Breadcrumb.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Breadcrumb.tsx)
- **Current Behavior**: Uses `className="flex mb-4"` container and `inline-flex items-center space-x-1` list with `mx-2 text-gray-400` slash separators.
- **Required Changes**:
  1. Update list container: `flex flex-wrap items-center gap-1.5 text-xs md:text-sm font-medium text-slate-400`.
  2. Update items and separators: `<span className="text-slate-600 select-none mx-0.5" aria-hidden="true">/</span>`.
  3. Update link styling: `hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded` for links and `text-slate-200 font-semibold` for active current page item.
- **Exact Reason**: Fulfills Finding F-07 mobile vertical alignment requirement so breadcrumb trails wrap cleanly without vertical distortion on 375px screens.
- **Implementation Approach**: Update Tailwind class strings on `<nav>`, `<ol>`, `<li>`, and `<span>`.
- **Tests Required**: No new test files required.

---

## 6. Design Token and Primitive Reuse

Batch 3 will reuse the established design system foundations without creating competing systems:
- **Global CSS Tokens** (`apps/web/src/index.css`):
  - `--font-sans`: Inter typography scale.
  - `--color-bg-canvas` (`#020617`): Dark slate page background.
  - `--color-bg-surface` (`#0f172a`): Header surface background.
  - `--color-border-default` (`#1e293b`): Border dividers.
- **Batch 2 UI Primitives**:
  - Reuses `<Button variant="secondary" size="sm">` in `AppLayout.tsx` for logout controls.
  - Reuses standardized focus visible ring utilities (`focus-visible:ring-2 focus-visible:ring-indigo-500`).

---

## 7. Responsive Implementation Plan

| Viewport | Component Behavior | Verification Target |
| :--- | :--- | :--- |
| **Desktop (1440px)** | Full horizontal header, max-w-7xl container, visible Cmd+K search shortcut | Clean alignment, no vertical overflow |
| **Laptop / Tablet (1024px / 800px)** | Desktop nav visible, Cmd+K search button collapses to search icon | Header actions do not wrap to second line |
| **Mobile (375px)** | Hamburger menu button visible, drawer opens vertically | Mobile drawer spans full width; breadcrumbs wrap cleanly |

---

## 8. Accessibility Plan

- **Skip to Content Link**: Accessible via `Tab` key, jumping to `<main id="main-content">`.
- **Landmark Semantics**: `<header>`, `<nav aria-label="Main Navigation">`, `<nav aria-label="Mobile Navigation">`, `<nav aria-label="Breadcrumb">`, `<main id="main-content">`, `<footer>`.
- **Active Navigation State**: React Router `<NavLink>` automatically injects `aria-current="page"`.
- **Interactive Controls**: `aria-expanded` and `aria-label` added to hamburger button and NotificationBell trigger.
- **Focus Visibility**: All interactive header controls render `focus-visible:ring-2 focus-visible:ring-indigo-500`.

---

## 9. Testing Plan

- **Existing Repository Test Suite**: 101 backend test files in `apps/api/src/**/*.test.ts` (787 tests passed).
- **Batch 3 Test Maintenance**: All 101 test files and 787 tests must continue to pass without modifications or test removals.
- **Frontend Quality Commands**:
  - `pnpm typecheck`: 0 TypeScript errors across `@documan/api`, `@documan/eslint-config`, and `web`.
  - `pnpm lint`: 0 ESLint errors.
  - `pnpm build`: Successful production bundle compilation.

---

## 10. Manual QA Matrix

| Area / Page | Viewport | Inspection Target | Expected Result |
| :--- | :---: | :--- | :--- |
| **App Layout** | 1440px | Sticky header scroll behavior | Header remains fixed at top with `backdrop-blur-md` |
| **Header Nav** | 1440px | Hover and active NavLink states | Active route renders `aria-current="page"` and glow border |
| **NotificationBell (F-06)** | 1440px | Mouse hover and click trigger | Trigger scales smoothly (`hover:scale-105 active:scale-95`); dropdown opens |
| **Breadcrumb (F-07)** | 375px | Mobile viewport breadcrumb wrapping | Trail wraps cleanly across lines with aligned `/` separators |
| **Mobile Navigation** | 375px | Hamburger toggle click | Drawer opens with vertical NavLink stack; closes on navigation |

---

## 11. Verification Commands

Upon execution authorization, the following commands must be run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
git diff --check
```

---

## 12. Risk and Regression Controls

1. **Z-Index Layering**: Header sticky element set to `z-40`; NotificationBell dropdown set to `z-50` to prevent drop-down clipping.
2. **No Backend Side Effects**: Pure frontend UI refinement; zero API modifications or data polling changes.
3. **No Unintended Page Modifications**: Only `AppLayout.tsx`, `NotificationBell.tsx`, and `Breadcrumb.tsx` modified.

---

## 13. Git / Publication Plan

The eventual implementation workflow will follow strict repository discipline:

1. Create feature branch: `feature/post-completion-figma-ui-app-shell` from clean `main`.
2. Implement Batch 3 changes in target files.
3. Run automated verification (`typecheck`, `lint`, `test`, `build`, `git diff --check`).
4. Perform manual browser QA.
5. Create review artifact `POST-COMPLETION-BATCH-3-REVIEW.md`.
6. Obtain explicit user commit authorization and create single commit (`feat(web): refine app shell and header navigation`).
7. Obtain explicit publication authorization.
8. Push feature branch to `origin`.
9. Merge `--no-ff` into `main`.
10. Push `main` to `origin/main`.
11. Verify synchronized `main` and delete feature branch.

---

## 14. Explicit Scope Guard

```
========================================================================================
                               EXPLICIT SCOPE GUARD
========================================================================================
  [X] PRODUCT-ROADMAP.md remains UNCHANGED.
  [X] Phase 32 remains the final planned phase. NO Phase 33.
  [X] Pure frontend UI refinement (AppLayout, NotificationBell F-06, Breadcrumb F-07).
  [X] Zero backend API or database changes.
  [X] Zero new npm dependencies.
========================================================================================
```

---

## 15. Definition of Done

Batch 3 will be complete when:
1. `AppLayout.tsx` header layout and active navigation states are visually refined.
2. Finding F-06 `NotificationBell` hover-scale microinteraction is implemented.
3. Finding F-07 `Breadcrumb` mobile vertical alignment is implemented.
4. All automated verification commands pass with 0 errors.
5. Manual browser QA confirms responsive header and mobile drawer behavior.
6. Batch 3 changes are committed and published according to Git discipline.

---

## 16. Plan Conclusion

The implementation plan for Batch 3 is complete, fully specified, minimal, and ready for review.
