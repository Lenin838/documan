# Batch 3 — Application Shell & Global Layout Stitch Research

## 1. Objective

The objective of Batch 3 Research is to evaluate the current production implementation of the Documan **Application Shell and Global Layout** against the approved Stitch Precision Blueprint design. 

Batch 3 focuses strictly on the visual presentation and responsive layout of the application container:
- `AppLayout.tsx` (Top header navigation bar, mobile drawer, content container, footer)
- `NotificationBell.tsx` (Notification bell trigger, unread counter badge, dropdown popover panel)
- App-level layout wrappers and skip-to-content accessibility landmarks in `App.tsx`

This research establishes the exact boundary for aligning the application shell with Batch 1 design tokens (`#0c1324` canvas, `#191f31` surface container, `#1e293b` hairline border, `#38bdf8` sky cyan accent) and Batch 2 shared primitives (`Button`, `Badge`, `Breadcrumb`, `LoadingSpinner`) while guaranteeing **100% preservation** of existing routing, authentication state, role-based navigation, notification polling logic, and accessibility contracts.

---

## 2. Repository Shell Inventory

The actual repository application shell consists of the following components, hooks, and routing wrappers:

1. **`apps/web/src/components/layout/AppLayout.tsx`**:
   - **Role**: Primary layout wrapper for all protected application routes.
   - **Structure**:
     - Sticky top header bar (`<header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">`)
     - Brand logo with document icon (`Documan`)
     - Desktop navigation bar (`<nav aria-label="Main Navigation">`) with `NavLink` elements
     - Cmd+K global search button shortcut (triggers navigation to `/knowledge/search`)
     - `NotificationBell` integration
     - User account display (User Name, role badge) and `Logout` button
     - Mobile navigation drawer toggle button and slide-down drawer panel (`id="mobile-navigation-menu"`)
     - Main content container (`<main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">`) containing `<Outlet />`
     - Global footer (`<footer className="bg-slate-900/60 border-t border-slate-800/80 py-4">`)
   - **Keyboard Shortcut**: `useEffect` listener mapping `Cmd+K` / `Ctrl+K` to `navigate('/knowledge/search')`.

2. **`apps/web/src/components/NotificationBell.tsx`**:
   - **Role**: Interactive notification center mounted in the top application header bar.
   - **Structure**:
     - Bell icon trigger button with unread count badge
     - Popover dropdown container (`w-[360px] max-h-[420px] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl`)
     - Filter/header with "Mark all read" action button
     - Scrollable notification item list displaying type icon, actor name, document title link, time, and unread dot indicator
   - **Logic & Polling**: Uses `setInterval` polling every 15 seconds to fetch notifications via `getNotifications(1, 10)`. Invokes `markNotificationAsRead` and `markAllNotificationsAsRead`. Click outside detector via `mousedown` listener.

3. **`apps/web/src/App.tsx`**:
   - **Role**: Root routing table and global accessibility wrapper.
   - **Shell Wrappers**:
     - `<ErrorBoundary>` outermost catch wrapper
     - Skip-to-content landmark link (`<a href="#main-content">Skip to main content</a>`)
     - `<Suspense fallback={<LoadingFallback />}>` wrapper around `<Routes>`
     - Protected route group wrapped in `<ProtectedRoute>` and `<AppLayout>`
     - Special printable route (`/projects/:projectId/release-certificates/:certificateId/print`) intentionally mounted **outside** `AppLayout` for full-page print rendering.

4. **`apps/web/src/routes/ProtectedRoute.tsx`**:
   - **Role**: Authentication and authorization route guard.
   - **Behavior**: Checks `isRestoring` (renders `LoadingSpinner`), `isAuthenticated` (redirects to `/login` with `returnUrl`), and `allowedRoles` (redirects unauthorized users to `/dashboard`).

---

## 3. Stitch Shell Inventory

The Stitch Precision Blueprint specifies a dark, modern, high-density telemetry app shell:

- **Canvas Background**: Deep navy canvas `#0c1324`.
- **Top Application Header Surface**: Elevated slate container `#191f31` with `#1e293b` hairline border and subtle glassmorphic backdrop blur (`backdrop-blur-md`).
- **Brand Identity**: Monospaced/Inter hybrid brand mark with sky cyan `#38bdf8` icon badge and crisp `#f8fafc` text.
- **Desktop Navigation Links**: Compact pill links with monospaced/sans text. Active state highlighted with `#0c4a6e`/30 background fill, `#38bdf8` sky cyan text, and subtle `#38bdf8`/40 border.
- **Global Search Button**: Monospaced shortcut trigger (`⌘K`) with slate border `#1e293b` and sky cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`).
- **Notification Popover**: Layer 1 `#191f31` container with `#1e293b` border, 6px radius (`rounded-[6px]`), danger red/rose unread badge (`bg-[#f43f5e]`), and sky cyan action buttons.
- **User Account Display**: User name, sky cyan uppercase role tag (`USER` / `ADMIN`), and Batch 2 `Button` primitive for logout.
- **Mobile Navigation Drawer**: `#191f31` container with `#1e293b` border hairline, full-width touch targets (min 44px height), active sky cyan border indicator.
- **Content Area Container**: `#0c1324` canvas background, `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`.
- **Footer**: `#191f31`/60 container, border `#1e293b`/80, slate-500 typography.

---

## 4. Component-by-Component Comparison

| Shell Component | Current Repository Implementation | Stitch Target Design | Classification |
|---|---|---|---|
| **AppLayout Container** | `min-h-screen bg-slate-950 text-slate-100` | `min-h-screen bg-[#0c1324] text-slate-100` | ALIGNMENT / REFINEMENT |
| **Top Application Header** | `bg-slate-900/90 border-b border-slate-800` | `bg-[#191f31]/90 border-b border-[#1e293b] backdrop-blur-md` | ALIGNMENT / REFINEMENT |
| **Brand Mark** | `text-indigo-400`, `bg-indigo-600/30 border-indigo-500/40` | `text-[#38bdf8]`, `bg-[#38bdf8]/10 border-[#38bdf8]/30 text-[#38bdf8]` | ALIGNMENT / REFINEMENT |
| **Desktop NavLinks** | `bg-indigo-950/60 text-indigo-300 border-indigo-500/40` | `bg-[#0c4a6e]/30 text-[#38bdf8] border-[#38bdf8]/40` | ALIGNMENT / REFINEMENT |
| **Cmd+K Search Button** | `bg-slate-950 border-slate-800 focus-visible:ring-indigo-500` | `bg-[#0c1324] border-[#1e293b] focus-visible:ring-[#38bdf8]` | ALIGNMENT / REFINEMENT |
| **Notification Bell Trigger** | `border-slate-800 bg-slate-900/80 focus-visible:ring-indigo-500` | `border-[#1e293b] bg-[#191f31] focus-visible:ring-[#38bdf8]` | ALIGNMENT / REFINEMENT |
| **Notification Dropdown** | `bg-slate-900 border-slate-800 rounded-xl` | `bg-[#191f31] border-[#1e293b] rounded-[6px] shadow-2xl` | ALIGNMENT / REFINEMENT |
| **Notification Unread Badge** | `bg-red-600 text-white rounded-full` | `bg-[#f43f5e] text-white rounded-[2px] font-mono` | ALIGNMENT / REFINEMENT |
| **User Account & Role Tag** | `text-indigo-400 uppercase text-[10px]` | `text-[#38bdf8] font-mono uppercase text-[10px]` | ALIGNMENT / REFINEMENT |
| **Mobile Drawer Menu** | `bg-slate-900 border-slate-800` | `bg-[#191f31] border-[#1e293b]` | ALIGNMENT / REFINEMENT |
| **Main Content Container** | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` | ALREADY ALIGNED |
| **Footer Bar** | `bg-slate-900/60 border-t border-slate-800/80` | `bg-[#191f31]/60 border-t border-[#1e293b]/80` | ALIGNMENT / REFINEMENT |
| **Skip-to-Content Link** | `focus:bg-indigo-600 focus:text-white` | `focus:bg-[#38bdf8] focus:text-[#020617] font-semibold` | ALIGNMENT / REFINEMENT |
| **App Loading Fallback** | `bg-gray-50 dark:bg-gray-900 border-indigo-600` | `bg-[#0c1324] border-[#38bdf8] text-slate-400` | ALIGNMENT / REFINEMENT |

---

## 5. AppLayout Analysis

`AppLayout.tsx` defines the structural flex frame of the application:
- Outer wrapper uses `flex flex-col min-h-screen`.
- Main body `<main id="main-content">` expands with `flex-1` and wraps page routes rendered via `<Outlet />`.
- Content padding is set to `px-4 sm:px-6 lg:px-8 py-8` with a centered `max-w-7xl` container width limit.
- **Stitch Alignment**:
  - Update root background from `bg-slate-950` to Canvas token `bg-[#0c1324]`.
  - Ensure main container maintains `max-w-7xl` width and responsive gutters without horizontal scrolling bugs.

---

## 6. Header / Top App Bar Analysis

The top header bar provides fixed global navigation at the top of the viewport:
- Positioned as `sticky top-0 z-40`.
- Height is fixed at 64px (`h-16`).
- **Stitch Alignment**:
  - Update header container fill to `#191f31`/90 (`bg-[#191f31]/90 backdrop-blur-md`).
  - Update bottom border hairline to `#1e293b` (`border-b border-[#1e293b]`).
  - Update brand icon box to `bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8]`.
  - Replace indigo focus ring utilities (`focus-visible:ring-indigo-500`) with Sky Cyan focus rings (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`).

---

## 7. Sidebar / Navigation Analysis

Documan implements a clean, top-bar navigation layout for desktop and a full-width drawer navigation overlay for mobile viewports:
- **Navigation Links**:
  1. `Dashboard` (`/dashboard`)
  2. `Projects` (`/projects`)
  3. `Documents` (`/documents`)
  4. `Knowledge Search` (`/knowledge/search`)
  5. `My Reviews` (`/reviews`)
  6. `Trash` (`/trash`)
  7. `Manage Users` (`/users` — Admin only)
- **Navigation Functionality**:
  - Uses React Router `NavLink` with dynamic `isActive` function.
  - Active links receive distinct active background, text color, and border accent.
- **Stitch Alignment**:
  - Active link state: `bg-[#0c4a6e]/30 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm`.
  - Inactive link hover state: `text-slate-300 hover:bg-[#1e293b]/60 hover:text-slate-100`.
  - Focus state: `focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.

---

## 8. Breadcrumb Integration Analysis

Batch 2 refined the core [`Breadcrumb`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Breadcrumb.tsx) shared primitive.
- **Placement**: `Breadcrumb` is rendered inside individual page components (such as `ProjectDetailsPage`, `DocumentDetailsPage`, `DocumentCreatePage`, `DocumentEditPage`, `UserDetailsPage`, `EditUserPage`).
- **Shell Responsibility**: `AppLayout` provides the outer container and vertical spacing (`py-8`). The `Breadcrumb` component sits naturally at the top of the `<main>` content stream inside target pages.
- **Stitch Alignment**: No component duplication. Pages consume the existing Batch 2 `Breadcrumb` primitive with sky cyan focus and hover styling.

---

## 9. Notification Analysis

`NotificationBell.tsx` manages real-time notification alerts:
- **State & Logic**:
  - Live polling interval (15s) fetching notifications via `getNotifications`.
  - Unread counter computation (`unreadCount`).
  - Read actions (`markNotificationAsRead`, `markAllNotificationsAsRead`).
  - Direct navigation to `/documents/:id` upon clicking accessible notifications.
  - Click-outside handling via `mousedown` listener.
- **Stitch Visual Alignment**:
  - Bell trigger button: `bg-[#191f31] border border-[#1e293b] hover:border-[#334155] text-slate-300 focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
  - Unread badge: `bg-[#f43f5e] text-white rounded-[2px] px-1.5 py-0.5 text-[10px] font-mono font-bold`.
  - Dropdown popover panel: `bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-2xl`.
  - Popover header: `bg-[#191f31]/90 border-b border-[#1e293b] text-slate-200`.
  - Action link ("Mark all read"): `text-[#38bdf8] hover:text-[#7dd3fc]`.
  - Unread notification row: `bg-[#0c4a6e]/20 hover:bg-[#0c4a6e]/30 text-slate-100`.
  - Read notification row: `bg-[#191f31] hover:bg-[#1e293b]/50 text-slate-300`.
  - Document link text: `text-[#38bdf8] hover:text-[#7dd3fc]`.

---

## 10. User / Account Area Analysis

The header user section renders authentication context and session management controls:
- Displays user name (`user.name`) and uppercase role (`user.role`).
- Invokes `logout()` from `useAuthStore` and redirects to `/login`.
- **Stitch Alignment**:
  - Role tag: `text-[#38bdf8] font-mono text-[10px] uppercase tracking-wider`.
  - Logout trigger: Uses Batch 2 `Button` primitive with `variant="secondary"` and `size="sm"`.
  - Divider line: `border-l border-[#1e293b] pl-4`.

---

## 11. Role-Based Navigation Analysis

The repository supports two explicit user roles: `user` and `admin`.
- **Logic**:
  ```tsx
  if (user?.role === "admin") {
    navItems.push({ label: "Manage Users", path: "/users" });
  }
  ```
- **Preservation Contract**: Role filtering MUST NOT be altered. No unsupported roles (`sysadmin`, `enterprise`, `superadmin`) will be added.

---

## 12. Routing Preservation Analysis

All 17 application routes defined in `App.tsx` are fully mapped and MUST be preserved without modification:

1. `/login` -> `LoginPage` (Standalone, no shell)
2. `/signup` -> `SignupPage` (Standalone, no shell)
3. `/dashboard` -> `DashboardPage` (Protected, wrapped in `AppLayout`)
4. `/knowledge/search` -> `KnowledgeSearchPage` (Protected, wrapped in `AppLayout`)
5. `/projects` -> `ProjectsPage` (Protected, wrapped in `AppLayout`)
6. `/projects/:id` -> `ProjectDetailsPage` (Protected, wrapped in `AppLayout`)
7. `/documents` -> `DocumentsPage` (Protected, wrapped in `AppLayout`)
8. `/documents/create` -> `DocumentCreatePage` (Protected, wrapped in `AppLayout`)
9. `/documents/:id` -> `DocumentDetailsPage` (Protected, wrapped in `AppLayout`)
10. `/documents/:id/edit` -> `DocumentEditPage` (Protected, wrapped in `AppLayout`)
11. `/trash` -> `TrashPage` (Protected, wrapped in `AppLayout`)
12. `/reviews` -> `ReviewsPage` (Protected, wrapped in `AppLayout`)
13. `/users` -> `UsersPage` (Protected Admin, wrapped in `AppLayout`)
14. `/users/:id` -> `UserDetailsPage` (Protected Admin, wrapped in `AppLayout`)
15. `/users/:id/edit` -> `EditUserPage` (Protected Admin, wrapped in `AppLayout`)
16. `/projects/:projectId/release-certificates/:certificateId/print` -> `ReleaseCertificatePrintPage` (Protected, standalone without `AppLayout`)
17. `*` -> `NotFoundPage` (Standalone 404 fallback)

---

## 13. Authentication Preservation Analysis

Batch 3 will touch zero authentication logic:
- `useAuthStore` methods (`restoreSession`, `logout`, `logoutAll`) remain identical.
- `ProtectedRoute.tsx` logic checking `isAuthenticated`, `isRestoring`, `allowedRoles`, and `returnUrl` remains 100% untouched.

---

## 14. Batch 1 / Batch 2 Integration

Batch 3 directly consumes established Batch 1 and Batch 2 foundations:
- **Batch 1 Tokens**:
  - `--color-bg` (`#0c1324` canvas)
  - `--color-surface` (`#191f31` surface fill)
  - `--color-border` (`#1e293b` hairline border)
  - `--color-primary` (`#38bdf8` sky cyan)
  - Sky Cyan focus treatment (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`)
- **Batch 2 Shared Primitives**:
  - [`Button`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Button.tsx): Logout button, search shortcut trigger, action buttons.
  - [`Badge`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Badge.tsx): Unread count indicators, role tags.
  - [`Breadcrumb`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Breadcrumb.tsx): Page landmark navigation.
  - [`LoadingSpinner`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/LoadingSpinner.tsx): `App.tsx` and `ProtectedRoute.tsx` loading fallbacks.

---

## 15. Domain Coverage

Application Shell migration propagates visual alignment across all protected Stitch product domains automatically:
- Dashboard (Domain 01)
- Projects & Project Workspace (Domains 02 & 03)
- Documents & Document Detail (Domains 04 & 05)
- Knowledge & Search (Domain 06)
- Reviews & Proposals (Domain 07)
- Administration & User Management (Domain 16)
- Trash Management (Domain 17)

---

## 16. Already-Aligned Areas

1. Route paths and `App.tsx` routing hierarchy.
2. `ProtectedRoute` authentication guards and role checking.
3. Notification polling interval (15s) and API integration (`getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`).
4. Global `Cmd+K` keyboard shortcut listener.
5. `skip-to-content` landmark link logic.
6. Responsive container max-width (`max-w-7xl`).

---

## 17. Alignment / Refinement Areas

1. Header container surface background (`#191f31`/90) and border hairline (`#1e293b`).
2. Brand logo badge styling (Sky cyan `#38bdf8` accent theme).
3. Desktop `NavLink` active and hover state styling (Sky cyan `#38bdf8` text & border).
4. `Cmd+K` quick search button border, text, and focus styling.
5. `NotificationBell` trigger button, popover panel background (`#191f31`), border (`#1e293b`), and unread indicator badge (`#f43f5e`).
6. User role tag formatting (`font-mono text-[#38bdf8] uppercase`).
7. Mobile navigation drawer background (`#191f31`), border (`#1e293b`), and touch target styling.
8. Footer container styling (`#191f31`/60 background, `#1e293b`/80 border).
9. Skip-to-content focus styling (`bg-[#38bdf8] text-[#020617]`).
10. `LoadingFallback` spinner and text colors (`border-[#38bdf8] text-slate-400`).

---

## 18. Migration-Required Areas

Refining Tailwind CSS class strings in `AppLayout.tsx`, `NotificationBell.tsx`, and `App.tsx` to eliminate legacy indigo palette classes (`indigo-400`, `indigo-500`, `indigo-600`, `slate-900`, `slate-950`) and adopt Stitch Precision Slate tokens (`#0c1324`, `#191f31`, `#1e293b`, `#38bdf8`, `#f43f5e`).

---

## 19. Unsupported Stitch Elements

- NO floating diffuse drop-shadows on header bar.
- NO external profile menu sub-pages or user avatar uploads.
- NO third-party OAuth provider icons in header.
- NO unmapped navigation links or dummy sidebar items.
- NO backend telemetry or live socket indicators.

---

## 20. Functional Preservation Matrix

| Shell Area | Existing Behavior | Must Preserve | UI Can Change |
|---|---|---|---|
| **Routing** | React Router v7 routes in `App.tsx` | Route paths, lazy imports, guards | Loading fallback styling |
| **Navigation Links** | NavLink array with role check | All 6 standard + 1 admin link | Colors, active background, padding, radius |
| **Global Search Shortcut** | Cmd+K listener to `/knowledge/search` | Key listener, navigation target | Trigger button styling, kbd badge, focus ring |
| **Notification Bell** | 15s polling, unread count, dropdown | Polling, mark read API, document navigation | Badge color (`#f43f5e`), panel surface (`#191f31`), focus ring |
| **User Controls** | User name, role badge, Logout button | Store integration, logout function | Role tag typography, logout button variant |
| **Mobile Menu** | State boolean, hamburger trigger | Drawer toggle, ARIA attributes | Drawer surface (`#191f31`), border (`#1e293b`) |
| **Content Container** | `<main id="main-content">` wrapper | ID, max-width (`max-w-7xl`), responsive padding | Canvas fill (`#0c1324`) |
| **Skip Link** | Anchor to `#main-content` | `href="#main-content"`, keyboard access | Focus background (`#38bdf8`), text color |

---

## 21. High-Blast-Radius Analysis

Because `AppLayout` wraps all protected views in the application, modifications present potential visual blast radius risks:
1. **Header Height & Layout Shift**: Fixed 64px height (`h-16`) must be preserved so sticky top positioning does not obscure content or cause jitter.
2. **Mobile Drawer Overflow**: Mobile drawer must render over content (`z-40` / `z-50`) without breaking body scroll or clipping content on small viewports (375px).
3. **Focus Outline Visibility**: Focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`) must remain clearly visible across all interactive header elements.

---

## 22. Responsive Migration Matrix

| Shell Area | 1440px (Desktop) | 1024px (Laptop/Tablet Landscape) | 800px (Tablet Portrait) | 375px (Mobile) |
|---|---|---|---|---|
| **Header Bar** | Full horizontal nav + Cmd+K search | Full horizontal nav, compact search | Compact header, hamburger trigger | Compact header, hamburger trigger |
| **Navigation** | Visible inline `<nav>` bar | Visible inline `<nav>` bar | Collapsed in mobile drawer | Collapsed in mobile drawer |
| **Mobile Drawer** | Hidden (`md:hidden`) | Hidden (`md:hidden`) | Slide-down full-width overlay | Slide-down full-width overlay |
| **User Area** | Full name + role tag + Logout button | Full name + role tag + Logout button | Moved to mobile drawer footer | Moved to mobile drawer footer |
| **Content Padding** | `px-8 py-8` | `px-6 py-6` | `px-4 py-6` | `px-4 py-4` |

---

## 23. Accessibility Analysis

1. **Landmarks**: `<header>`, `<main id="main-content">`, `<nav aria-label="Main Navigation">`, `<footer`>.
2. **Skip Link**: `<a href="#main-content">` accessible via `Tab` key.
3. **Keyboard Navigation**: All interactive elements (NavLinks, search button, bell trigger, mobile menu toggle, logout button) accessible via standard `Tab` / `Enter` / `Space`.
4. **ARIA Attributes**: `aria-expanded` and `aria-controls` on mobile trigger; `aria-haspopup` on notification bell.
5. **Focus Indicators**: 1px Sky Cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`) on all interactive controls.

---

## 24. Performance Considerations

- Class name replacements in JSX introduce **zero** runtime JS computational overhead.
- Sticky header backdrop blur uses native CSS `backdrop-blur-md`.
- Notification polling remains optimized at 15s interval.

---

## 25. Expected File Impact

### Files to be Modified in Batch 3:
1. `apps/web/src/components/layout/AppLayout.tsx` (Refining shell styling to Stitch tokens)
2. `apps/web/src/components/NotificationBell.tsx` (Refining notification dropdown popover & trigger)
3. `apps/web/src/App.tsx` (Refining global `LoadingFallback` and skip-link focus styling)

### Files to NOT Modify:
- `apps/web/src/routes/ProtectedRoute.tsx` (Auth guard logic)
- `apps/web/src/features/auth/auth.store.ts` (Auth state store)
- `apps/web/src/features/notifications/notification.api.ts` (Notification API client)
- `apps/api/*` (Backend API)

---

## 26. Batch 3 Implementation Boundary

The future Batch 3 implementation MUST remain strictly UI/UX visual migration:
- **Permitted**: Tailwind CSS class adjustments, JSX presentation formatting, token alignment.
- **Prohibited**: Changing route paths, altering authentication logic, adding backend APIs, changing Zustand stores, adding unsupported navigation routes, modifying database schemas.

---

## 27. Verification Requirements

Batch 3 implementation verification will require:
1. `pnpm --filter web build` (`tsc -b && vite build`)
2. `pnpm --filter web lint` (`eslint .`)
3. `pnpm test` (full monorepo test suite)
4. `git diff --check`
5. Manual browser QA across viewports (1440px, 1024px, 800px, 375px)

---

## 28. Batch 3 Acceptance Criteria

- [ ] `AppLayout.tsx` background updated to `#0c1324` canvas.
- [ ] Header container updated to `#191f31`/90 with `#1e293b` border.
- [ ] Active `NavLink` items highlight with sky cyan `#38bdf8` accent styling.
- [ ] Cmd+K search button uses `#1e293b` border and `#38bdf8` focus ring.
- [ ] `NotificationBell` dropdown uses `#191f31` surface, `#1e293b` border, and `#f43f5e` unread badge.
- [ ] User role tag formatted in monospaced cyan typography.
- [ ] Mobile navigation drawer renders cleanly across 800px and 375px viewports.
- [ ] All 17 routes, authentication checks, and notification polling preserved 100%.
- [ ] Typecheck, ESLint, test suite, and `git diff --check` pass with 0 errors.

---

## 29. Final Recommendation

**READY FOR IMPLEMENTATION PLAN**
