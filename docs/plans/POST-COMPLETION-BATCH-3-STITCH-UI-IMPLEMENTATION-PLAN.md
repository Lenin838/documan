# Batch 3 — Application Shell & Global Layout Stitch Implementation Plan

## 1. Objective

The objective of **Batch 3 (Application Shell & Global Layout)** is to migrate the visual presentation and responsive layout of the Documan application shell to match the approved Stitch Precision Blueprint dark telemetry design.

This batch focuses on refining:
1. `AppLayout.tsx` (Root canvas, sticky top application header, brand identity badge, desktop navigation, mobile drawer overlay, main content wrapper, global footer)
2. `NotificationBell.tsx` (Header notification trigger button, unread count badge, popover dropdown panel)
3. `App.tsx` (Global `LoadingFallback` spinner styling and `skip-to-content` landmark focus treatment)

This is a **UI/UX migration only**. 100% of existing application routing, authentication state management, role-based access rules, notification polling logic, and accessibility contracts will be preserved without alteration.

---

## 2. Research Basis

This plan is based directly on the approved research artifact:
[`docs/research/POST-COMPLETION-BATCH-3-STITCH-UI-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-BATCH-3-STITCH-UI-RESEARCH.md)

Key research findings:
- All 17 application routes and 14 protected shell routes are fully mapped and verified.
- The standalone printable Release Certificate route (`/projects/:projectId/release-certificates/:certificateId/print`) is mounted **outside** `AppLayout` and must remain standalone.
- All 10 shared UI primitives refined in Batch 2 (`Button`, `Badge`, `Card`, `Table`, `Tabs`, `Modal`, `LoadingSpinner`, `EmptyState`, `Breadcrumb`, `ErrorBoundary`) are available for consumption in the shell.
- Recommendation: **READY FOR IMPLEMENTATION PLAN**.

---

## 3. Current Repository Architecture

The current application shell architecture consists of:
- **`AppLayout.tsx`**: Flex column container (`min-h-screen bg-slate-950 text-slate-100`) wrapping a sticky `<header className="bg-slate-900/90 border-b border-slate-800">`, desktop `<nav>`, mobile navigation drawer, `<main id="main-content">` (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`), and `<footer>`.
- **`NotificationBell.tsx`**: Trigger button with `bg-red-600` unread badge, popover dropdown panel (`bg-slate-900 border-slate-800 rounded-xl`), polling notifications every 15s via `getNotifications`.
- **`App.tsx`**: Root router wrapping protected routes in `<ProtectedRoute>` and `<AppLayout>`, declaring a skip-link (`<a href="#main-content">`) and Suspense `<LoadingFallback>`.
- **`ProtectedRoute.tsx`**: Auth guard verifying session state and user role authorization.

---

## 4. Stitch Target Architecture

The Stitch target architecture aligns the shell with the dark Precision Blueprint:
- **Canvas Background**: Deep navy canvas `#0c1324` (`min-h-screen bg-[#0c1324] text-slate-100`).
- **Top Header Bar**: Elevated Slate surface `#191f31`/90 (`bg-[#191f31]/90 backdrop-blur-md border-b border-[#1e293b]`).
- **Brand Identity**: Sky cyan `#38bdf8` icon badge with `Documan` title in crisp slate-100 typography.
- **Desktop NavLinks**: Active state highlighted with `#0c4a6e`/30 background fill, `#38bdf8` sky cyan text, and `#38bdf8`/40 border accent.
- **Search Trigger**: Monospaced shortcut trigger (`⌘K`) with `#1e293b` border and sky cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`).
- **Notification Dropdown**: Layer 1 `#191f31` container with `#1e293b` border, 6px radius (`rounded-[6px]`), danger red/rose unread badge (`bg-[#f43f5e]`), and cyan action links (`text-[#38bdf8]`).
- **User Account Display**: User name, sky cyan uppercase role tag (`USER` / `ADMIN`), and Batch 2 `Button` primitive for logout.
- **Mobile Navigation Drawer**: `#191f31` container with `#1e293b` border hairline, full-width touch targets (min 44px height), active sky cyan border indicator.
- **Main Container & Footer**: `max-w-7xl` container with `#0c1324` canvas fill; `#191f31`/60 footer with `#1e293b`/80 border.

---

## 5. Functional Preservation Contract

The implementation MUST NOT modify:
1. **Backend APIs / Models**: Zero changes to `apps/api/*`, schemas, controllers, or database models.
2. **State Management**: `useAuthStore` session state, login, logout, logoutAll, and restoration logic remain 100% untouched.
3. **Notification Logic**: `getNotifications`, 15-second polling interval, `markNotificationAsRead`, `markAllNotificationsAsRead`, and document navigation routes remain untouched.
4. **Role Authorization**: `allowedRoles={["admin"]}` filtering for `/users` route remains untouched.
5. **Keyboard Listener**: `useEffect` listening for `Cmd+K` / `Ctrl+K` navigating to `/knowledge/search` remains untouched.
6. **Route Table**: All 17 route paths, lazy imports, and `ProtectedRoute` guards remain untouched.

---

## 6. Batch 1 Integration

Batch 3 directly consumes established Batch 1 global tokens defined in `apps/web/src/index.css`:
- Canvas Fill: `#0c1324` (`--color-bg`)
- Surface Fill: `#191f31` (`--color-surface`)
- Border Hairline: `#1e293b` (`--color-border`)
- Primary Accent: `#38bdf8` (`--color-primary`)
- Danger Accent: `#f43f5e` (`--color-danger`)
- Focus Treatment: 1px Sky Cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`)

---

## 7. Batch 2 Integration

Batch 3 consumes Batch 2 shared UI primitives:
- [`Button`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Button.tsx): Logout button (`variant="secondary" size="sm"`), Cmd+K search trigger, popover actions.
- [`Badge`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Badge.tsx): Unread count indicators, user role tags.
- [`Breadcrumb`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Breadcrumb.tsx): Page landmark navigation inside content pages.
- [`LoadingSpinner`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/LoadingSpinner.tsx): `App.tsx` and `ProtectedRoute.tsx` loading fallbacks.

---

## 8. AppLayout Implementation Plan

In `apps/web/src/components/layout/AppLayout.tsx`:
- Refine outer wrapper from `bg-slate-950` to `bg-[#0c1324]`.
- Refine header container from `bg-slate-900/90 border-slate-800` to `bg-[#191f31]/90 border-b border-[#1e293b] backdrop-blur-md`.
- Refine brand logo icon box to `bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8]`.
- Refine footer from `bg-slate-900/60 border-slate-800/80` to `bg-[#191f31]/60 border-t border-[#1e293b]/80 text-slate-500`.

---

## 9. Header / Top App Bar Plan

- Height: Retain fixed 64px height (`h-16`).
- Position: Retain `sticky top-0 z-40`.
- Focus ring: Replace `focus-visible:ring-indigo-500` with `focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- Structure: Left brand mark & desktop nav; Right search trigger, NotificationBell, user section, mobile toggle.

---

## 10. Desktop Navigation Plan

In `AppLayout.tsx`:
- Nav items array:
  1. Dashboard (`/dashboard`)
  2. Projects (`/projects`)
  3. Documents (`/documents`)
  4. Knowledge Search (`/knowledge/search`)
  5. My Reviews (`/reviews`)
  6. Trash (`/trash`)
  7. Manage Users (`/users` — Admin only)
- Active `NavLink` style: `bg-[#0c4a6e]/30 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm`.
- Inactive `NavLink` style: `text-slate-300 hover:bg-[#1e293b]/60 hover:text-slate-100`.
- Focus style: `focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.

---

## 11. Mobile Navigation Plan

In `AppLayout.tsx`:
- Mobile toggle button: Refine hover fill to `hover:bg-[#1e293b]` and focus ring to `focus-visible:ring-[#38bdf8]`.
- Mobile drawer container (`id="mobile-navigation-menu"`):
  - Change background from `bg-slate-900 border-slate-800` to `bg-[#191f31] border-b border-[#1e293b]`.
  - Active item: `bg-[#0c4a6e]/30 text-[#38bdf8] border-l-2 border-[#38bdf8] font-semibold`.
  - User section footer in drawer: `border-t border-[#1e293b]`, cyan role tag, Batch 2 `Button` for Logout and Logout All.

---

## 12. Search Trigger Plan

In `AppLayout.tsx`:
- Trigger button: `hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#0c1324] border border-[#1e293b] hover:border-[#334155] rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- Keyboard badge (`⌘K`): `font-mono text-[10px] bg-[#191f31] border border-[#1e293b] px-1.5 py-0.5 rounded text-slate-400`.
- Click event: Preserves `navigate('/knowledge/search')`.

---

## 13. NotificationBell Plan

In `apps/web/src/components/NotificationBell.tsx`:
- Bell trigger button: `border-[#1e293b] bg-[#191f31] hover:bg-[#1e293b] text-slate-300 focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- Unread badge: `bg-[#f43f5e] text-white rounded-[2px] px-1.5 py-0.5 text-[10px] font-mono font-bold`.
- Dropdown popover panel: `bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-2xl z-50`.
- Popover header: `bg-[#191f31]/90 border-b border-[#1e293b] text-slate-200`.
- "Mark all read" link: `text-[#38bdf8] hover:text-[#7dd3fc]`.
- Unread row fill: `bg-[#0c4a6e]/20 hover:bg-[#0c4a6e]/30 text-slate-100`.
- Read row fill: `bg-[#191f31] hover:bg-[#1e293b]/50 text-slate-300`.
- Document title link: `text-[#38bdf8] hover:text-[#7dd3fc]`.

---

## 14. Account Area Plan

In `AppLayout.tsx`:
- User container: `hidden sm:flex items-center gap-3 border-l border-[#1e293b] pl-4`.
- User name: `font-semibold text-slate-200 text-xs`.
- Role tag: `text-[#38bdf8] font-mono uppercase tracking-wider text-[10px]`.
- Logout button: Batch 2 `Button` primitive (`variant="secondary" size="sm"`).

---

## 15. Breadcrumb Integration Plan

- Shell provides `max-w-7xl` container and vertical padding (`py-8`).
- Individual content pages mount Batch 2 `Breadcrumb` primitive at top of view.
- Zero duplication of Breadcrumb logic in shell.

---

## 16. Main Content Layout Plan

In `AppLayout.tsx`:
- `<main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">`
- Renders `<Outlet />` cleanly against `#0c1324` canvas.

---

## 17. Footer Plan

In `AppLayout.tsx`:
- `<footer className="bg-[#191f31]/60 border-t border-[#1e293b]/80 py-4 text-center text-xs text-slate-500">`
- Text: `Documan Product Platform © 2026. All rights reserved.`

---

## 18. Loading Fallback Plan

In `apps/web/src/App.tsx`:
- `LoadingFallback` styling: `min-h-screen flex items-center justify-center bg-[#0c1324]`.
- Spinner: Consume Batch 2 `LoadingSpinner` primitive (`label="Loading..."`).

---

## 19. Skip-Link Accessibility Plan

In `apps/web/src/App.tsx`:
- Skip link: `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#38bdf8] focus:text-[#020617] focus:font-semibold focus:rounded-[4px] focus:shadow-lg">Skip to main content</a>`.

---

## 20. Responsive Implementation Matrix

| Shell Area | 1440px (Desktop) | 1024px (Laptop/Tablet Landscape) | 800px (Tablet Portrait) | 375px (Mobile) |
|---|---|---|---|---|
| **Header Bar** | Full horizontal nav + Cmd+K search | Full horizontal nav, compact search | Compact header, hamburger trigger | Compact header, hamburger trigger |
| **Navigation** | Visible inline `<nav>` bar | Visible inline `<nav>` bar | Collapsed in mobile drawer | Collapsed in mobile drawer |
| **Mobile Drawer** | Hidden (`md:hidden`) | Hidden (`md:hidden`) | Slide-down full-width overlay | Slide-down full-width overlay |
| **User Area** | Full name + role tag + Logout button | Full name + role tag + Logout button | Moved to mobile drawer footer | Moved to mobile drawer footer |
| **Content Padding** | `px-8 py-8` | `px-6 py-6` | `px-4 py-6` | `px-4 py-4` |

---

## 21. Accessibility Implementation Plan

- HTML5 semantic elements: `<header>`, `<main id="main-content">`, `<nav aria-label="Main Navigation">`, `<footer`>.
- Skip link anchored to `#main-content`.
- Keyboard focus ring: `focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- ARIA states: `aria-expanded` and `aria-controls` on mobile trigger; `aria-haspopup` on NotificationBell.

---

## 22. Micro-Interaction Plan

- Active nav links: Subtle 150ms background and border color transition (`transition-all duration-150`).
- Mobile menu toggle: Smooth icon cross-fade.
- NotificationBell popover: Instant, crisp z-50 positioning.

---

## 23. Performance Considerations

- Pure CSS class updates introduce zero JS CPU load.
- Native CSS `backdrop-blur-md`.
- No extra re-renders or state stores added.

---

## 24. Exact File Impact

### Files to Modify in Batch 3:
1. [`apps/web/src/components/layout/AppLayout.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/layout/AppLayout.tsx) (HIGH blast radius: App shell layout and header container)
2. [`apps/web/src/components/NotificationBell.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/NotificationBell.tsx) (MEDIUM blast radius: Popover dropdown and trigger)
3. [`apps/web/src/App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx) (LOW blast radius: `LoadingFallback` and skip link styling)

---

## 25. Files / Systems That Must Not Change

- `apps/web/src/routes/ProtectedRoute.tsx`
- `apps/web/src/features/auth/auth.store.ts`
- `apps/web/src/features/notifications/notification.api.ts`
- `apps/api/*` (Backend API)
- Any database models, schemas, or routes.

---

## 26. Incremental Implementation Sequence

1. **Step 1**: Create feature branch `feature/stitch-batch-3-app-shell`.
2. **Step 2**: Refine `App.tsx` (`LoadingFallback` & skip-link focus styling).
3. **Step 3**: Refine `NotificationBell.tsx` popover dropdown, trigger, unread badge `#f43f5e`, and focus ring `#38bdf8`.
4. **Step 4**: Refine `AppLayout.tsx` canvas `#0c1324`, header `#191f31`, brand badge, desktop NavLinks, Cmd+K search trigger, user role tag, mobile drawer, and footer.
5. **Step 5**: Run automated verification suite (`build`, `lint`, `test`, `git diff --check`).
6. **Step 6**: Execute manual browser QA across 1440px, 1024px, 800px, 375px viewports.
7. **Step 7**: Present completion report and await user authorization for publication.

---

## 27. Automated Verification Plan

- `pnpm --filter web build` (runs `tsc -b && vite build`)
- `pnpm --filter web lint` (`eslint .`)
- `pnpm test` (monorepo test suite)
- `git diff --check`

---

## 28. Manual QA Plan

Verify across viewports (1440px, 1024px, 800px, 375px) on active dev server:
- Desktop top header navigation & active route highlighting.
- Cmd+K shortcut button click and keyboard execution.
- NotificationBell popover opening, unread badge display, mark read action, document detail navigation.
- User role tag display & Logout action execution.
- Mobile hamburger menu drawer toggle, item clicks, and Logout/Logout All execution.
- Keyboard tab focus ring visibility (`#38bdf8`).
- Verify printable certificate route (`/projects/:projectId/release-certificates/:certificateId/print`) remains standalone without shell wrapper.

---

## 29. Regression Checklist

- [ ] All 17 application routes accessible and working.
- [ ] Protected route redirects and returnUrl preservation working.
- [ ] User login, logout, and logoutAll working.
- [ ] Admin role authorization (`Manage Users` link) preserved.
- [ ] Notification 15s polling and mark read APIs working.
- [ ] Global Cmd+K keyboard shortcut working.
- [ ] Mobile navigation drawer opening and closing cleanly.
- [ ] Printable certificate page rendering without shell header.

---

## 30. Acceptance Criteria

- [ ] Canvas background is `#0c1324`.
- [ ] Top header bar is `#191f31`/90 with `#1e293b` hairline border.
- [ ] Active NavLink elements display sky cyan `#38bdf8` accent styling.
- [ ] Notification Bell unread badge is `#f43f5e` and popover surface is `#191f31`.
- [ ] All interactive elements feature 1px Sky Cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`).
- [ ] Build, lint, tests, and `git diff --check` pass with 0 errors.

---

## 31. Git / Publication Workflow

1. Create branch `feature/stitch-batch-3-app-shell`.
2. Implement edits in `App.tsx`, `NotificationBell.tsx`, `AppLayout.tsx`.
3. Run verification commands.
4. Perform manual browser QA.
5. Report completion to user and await explicit publication authorization.
6. Commit (`feat(web): align application shell with Stitch UI`).
7. Merge into `main` (`git merge --no-ff feature/stitch-batch-3-app-shell`).
8. Push to `origin/main`.
9. Delete feature branch.
10. Verify clean `main`.

---

## 32. Final Implementation Recommendation

**READY FOR IMPLEMENTATION**
