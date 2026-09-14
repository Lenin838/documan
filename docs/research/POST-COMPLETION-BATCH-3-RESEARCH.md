# Post-Completion Batch 3 Research: App Shell & Header Navigation

**Research Artifact**: `docs/research/POST-COMPLETION-BATCH-3-RESEARCH.md`  
**Target Batch**: Batch 3 — App Shell & Header Navigation Refinement  
**Repository Branch**: `main`  
**Current Published Commit**: `115d8985c1c853de890cffe5fff73821f7d6ff02`  
**Date**: September 13, 2026  
**Status**: **RESEARCH ONLY / NO SOURCE CHANGES MADE**

---

## 1. Executive Summary

This research document analyzes the current production implementation of the Documan **App Shell**, **Header Navigation**, **NotificationBell**, and **Breadcrumb** components in `apps/web`.

Following the successful publication of **Batch 1 (Design Tokens & Global CSS)** and **Batch 2 (Core UI Primitives Refinement)** to `main`, this research establishes the exact scope, file boundaries, accessibility standards, and risk mitigations for **Batch 3**.

Batch 3 focuses strictly on:
1. App Shell layout structure & sticky header polish (`AppLayout.tsx`).
2. Header navigation hierarchy, active route indicators (`aria-current="page"`), and focus rings.
3. Responsive header and mobile navigation drawer behavior across 1440px, 800px, and 375px viewports.
4. Accessibility enhancements for header controls, skip-to-content links, and interactive elements.
5. **Finding F-06**: `NotificationBell` hover-scale microinteraction (`hover:scale-105 transition-transform`).
6. **Finding F-07**: `Breadcrumb` mobile vertical alignment and separator alignment (`Breadcrumb.tsx`).

No backend APIs, data polling logic, notification state machines, page routes, or roadmap items are altered during this research or its planned implementation.

---

## 2. Current Repository Baseline

- **Repository Branch**: `main`
- **Published Main Commit**: `115d8985c1c853de890cffe5fff73821f7d6ff02`
- **Batch 1 Status**: Complete & Published (`25e4c5c47af2717ac3221862185a1009c0fc2946` — `apps/web/src/index.css`)
- **Batch 2 Status**: Complete & Published (`115d8985c1c853de890cffe5fff73821f7d6ff02` — `Button`, `Badge`, `Card`, `Table`, `Tabs`)
- **Product Roadmap**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md) is UNCHANGED. Phase 32 remains the final certified phase. There is NO Phase 33.
- **Working Tree State**: Clean source code; only intentional research artifacts exist in untracked status.

---

## 3. App Shell Architecture

The Documan application shell is governed by [`apps/web/src/components/layout/AppLayout.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/layout/AppLayout.tsx), which wraps all protected application routes defined in [`apps/web/src/App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx).

```
┌─────────────────────────────────────────────────────────────────────────┐
<header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md">   │
│ ┌───────────────┐  ┌───────────────────────┐  ┌──────────────────────┐ │
│ │ Documan Brand │  │ Main Navigation Links │  │ Search / Bell / User │ │
│ └───────────────┘  └───────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
<main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 py-8">    │
│ <Outlet /> (Page Views: Dashboard, Projects, Documents, Knowledge, etc.)│
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
<footer className="bg-slate-900/60 border-t border-slate-800 py-4">       │
│ Documan Product Platform © 2026. All rights reserved.                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Characteristics:
- **Root Layout Shell**: Flex column layout (`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased`).
- **Container Boundaries**: Content width bounded at `max-w-7xl` (1280px) with fluid responsive padding (`px-4 sm:px-6 lg:px-8`).
- **Sticky Header**: `<header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-sm">`.
- **Keyboard Shortcut Listener**: Global `Cmd+K` / `Ctrl+K` keydown listener in `AppLayout.tsx` navigating to `/knowledge/search`.
- **Skip-to-Content Link**: Defined in `App.tsx` targeting `<main id="main-content">`.

---

## 4. Header Architecture

The header contains three primary operational sectors in `AppLayout.tsx`:

1. **Brand & Logo Sector (Left)**:
   - `<Link to="/dashboard">` containing an SVG document badge and "Documan" brand title.
2. **Main Navigation Sector (Center / Desktop)**:
   - `<nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">`.
   - Maps over `navItems` array rendering `<NavLink>` elements.
3. **Actions & User Controls Sector (Right)**:
   - **Quick Search Button**: `<button onClick={() => navigate("/knowledge/search")}>` displaying `⌘K` shortcut badge (hidden below `lg` breakpoint).
   - **Notification Bell**: `<NotificationBell />` component rendering unread notification count badge and dropdown panel.
   - **User Profile & Logout**: User name, role badge (`admin`/`editor`/`viewer`), and `<Button variant="secondary" size="sm" onClick={handleLogout}>Logout</Button>`.
   - **Mobile Menu Toggle**: `<button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">` rendering hamburger / close icon.

---

## 5. Navigation Architecture

### Navigation Items Structure:
Navigation items are dynamically constructed in `AppLayout.tsx`:
- `Dashboard` (`/dashboard`)
- `Projects` (`/projects`)
- `Documents` (`/documents`)
- `Knowledge Search` (`/knowledge/search`)
- `My Reviews` (`/reviews`)
- `Trash` (`/trash`)
- `Manage Users` (`/users`) — conditionally appended when `user.role === 'admin'`.

### Active Route Detection:
Active route detection utilizes React Router's `<NavLink>` render prop `({ isActive })`:
- **Current Active Desktop Style**: `bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 shadow-sm`.
- **Current Inactive Desktop Style**: `text-slate-300 hover:bg-slate-800 hover:text-slate-100`.
- **Current Active Mobile Style**: `bg-indigo-900/40 text-indigo-300 border border-indigo-500/30`.
- **Current Inactive Mobile Style**: `text-slate-300 hover:bg-slate-800`.

React Router's `<NavLink>` automatically injects `aria-current="page"` when `isActive` evaluates to true.

---

## 6. Responsive Behavior

| Viewport | Header Layout | Navigation Component | Quick Search (Cmd+K) | User Controls |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop (1440px)** | `max-w-7xl` container, h-16 flex row | `<nav className="hidden md:flex">` | Visible (`hidden lg:flex`) | Full Profile + Logout Button |
| **Laptop / Tablet (800px)** | `max-w-7xl` container, h-16 flex row | `<nav className="hidden md:flex">` | Hidden | Full Profile + Logout Button |
| **Mobile (375px)** | Compact header, hamburger trigger | Hamburger opens `<nav className="md:hidden">` drawer | Accessible via NavLink item | Stacked in mobile drawer |

---

## 7. NotificationBell — F-06

### Current Implementation Assessment:
- **Location**: [`apps/web/src/components/NotificationBell.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/NotificationBell.tsx).
- **State & Logic**: Manages `isOpen`, `notifications` array, `unreadCount`, `loading`, 15-second polling interval, document navigation, mark as read, and click-outside dismissal.
- **Current Trigger Styling**: Uses raw inline styles (`style={{ position: 'relative', padding: '0.4rem 0.8rem', cursor: 'pointer', ... }}`).

### Finding F-06 Requirement & Boundary:
- **F-06 Objective**: Add a subtle hover-scale microinteraction (`hover:scale-105 transition-transform duration-150 active:scale-95`) to the bell trigger button in alignment with the approved Figma design system.
- **Strict Boundary**:
  - Do **NOT** alter the 15-second polling interval (`setInterval`).
  - Do **NOT** alter API calls (`getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`).
  - Do **NOT** alter notification item data types or state management.
  - Upgrade button container to use Tailwind classes (`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 text-slate-300 hover:text-slate-100 transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`) for visual harmony with the header shell.

---

## 8. Breadcrumb — F-07

### Current Implementation Assessment:
- **Location**: [`apps/web/src/components/ui/Breadcrumb.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Breadcrumb.tsx).
- **Structure**:
  ```tsx
  <nav aria-label="Breadcrumb" className="flex mb-4">
    <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm font-medium text-gray-500 dark:text-gray-400">
      {items.map((item, index) => (
        <li key={index} className="inline-flex items-center">
          {index > 0 && <span className="mx-2 text-gray-400 dark:text-gray-600">/</span>}
          {isLast || !item.href ? (
            <span className="text-gray-900 dark:text-white font-semibold">{item.label}</span>
          ) : (
            <Link to={item.href} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ol>
  </nav>
  ```
- **Consumer Pages**: Used across `UsersPage`, `TrashPage`, `ReviewsPage`, `ProjectsPage`, `ProjectDetailsPage`, `DocumentsPage`, and `DocumentCreatePage`.

### Finding F-07 Requirement & Boundary:
- **F-07 Objective**: Refine mobile vertical alignment and separator spacing so multi-line breadcrumb trails on narrow 375px mobile screens align cleanly without line-height distortion or vertical misalignment.
- **Implementation Strategy**:
  - Update container list to `<ol className="flex flex-wrap items-center gap-1.5 text-xs md:text-sm font-medium text-slate-400">`.
  - Update separator to `<span className="text-slate-600 select-none mx-0.5" aria-hidden="true">/</span>`.
  - Update item text tokens to `text-slate-200` for active item and `text-slate-400 hover:text-indigo-400` for links.
- **Strict Boundary**: Do **NOT** change `BreadcrumbItem` interface (`label: string`, `href?: string`), routing links, or page breadcrumb props.

---

## 9. Design System Reuse

Batch 3 will directly consume established design tokens and primitives:
- **Global CSS Tokens** ([`apps/web/src/index.css`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/index.css)):
  - `--font-sans`: Inter typography scale.
  - `--color-bg-canvas` (`#020617`): Main app canvas background.
  - `--color-bg-surface` (`#0f172a`): Header surface background.
  - `--color-border-default` (`#1e293b`): Header border dividers.
  - `--color-brand-primary` (`#818cf8`): Active link highlights and focus rings.
- **Batch 2 UI Primitives**:
  - Reuses `<Button variant="secondary" size="sm">` in `AppLayout.tsx`.
  - Reuses Batch 2 focus visible ring utilities (`focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`).

---

## 10. Accessibility Assessment

| Control / Feature | Accessibility Standard | Implementation Requirement |
| :--- | :--- | :--- |
| **Landmarks** | WCAG 2.1 AA | `<header>`, `<nav aria-label="Main Navigation">`, `<main id="main-content">`, `<footer>` |
| **Skip Link** | WCAG 2.1 AA | `<a href="#main-content">Skip to main content</a>` (First focusable element) |
| **Active Nav Link** | WAI-ARIA | React Router `<NavLink>` automatically sets `aria-current="page"` |
| **Notification Bell** | WAI-ARIA | Add `aria-label="Notifications"` and `aria-expanded={isOpen}` to trigger button |
| **Mobile Drawer Toggle** | WAI-ARIA | Hamburger button includes `aria-label="Toggle Navigation Menu"` and `aria-expanded={mobileMenuOpen}` |
| **Focus Rings** | WCAG 2.1 AA | High contrast focus ring on all interactive header elements (`focus-visible:ring-2 focus-visible:ring-indigo-500`) |

---

## 11. Existing Test Coverage

- **Repository Test Suite**: 101 backend test files in `apps/api/src/**/*.test.ts` (787 tests passed).
- **Frontend Verification**: TypeScript type checking (`pnpm typecheck`), ESLint linting (`pnpm lint`), production bundle build (`pnpm build`), and git diff formatting (`git diff --check`).
- **No Test Removals**: Existing test counts must remain at 101 files and 787 tests without regressions.

---

## 12. Files Likely to Change

Only **3 files** are targeted for Batch 3 modification:

1. `apps/web/src/components/layout/AppLayout.tsx`
2. `apps/web/src/components/NotificationBell.tsx`
3. `apps/web/src/components/ui/Breadcrumb.tsx`

---

## 13. Files That Should Not Change

The following files must remain untouched during Batch 3:
- `apps/web/src/App.tsx`
- `apps/web/src/routes/ProtectedRoute.tsx`
- `apps/web/src/features/notifications/notification.api.ts`
- `apps/web/src/features/notifications/notification.types.ts`
- All files in `apps/api/`
- [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)
- All Batch 1 and Batch 2 files unless a defect is discovered.

---

## 14. Risks and Regression Considerations

1. **Z-Index Layering**: NotificationBell dropdown (`z-50`) must render above sticky header (`z-40`) and main content body (`z-0`).
2. **Mobile Drawer Overflow**: Opening mobile menu drawer must not introduce horizontal page scrollbars on 375px screens.
3. **Focus Trap / Focus Rings**: Ensure focus rings are visible on dark slate header background without background bleeding.

---

## 15. Performance Considerations

- **Transform Microinteractions**: Scale transforms (`hover:scale-105 active:scale-95`) run on GPU composite layer without causing DOM reflow.
- **Zero Additional Network Requests**: Header refinement consumes existing auth store (`useAuthStore`) and notification state without adding requests.
- **Bundle Impact**: 0 byte increase in external dependencies.

---

## 16. Recommended Batch 3 Implementation Boundary

Implement **ONLY**:
- App Shell & Header Navigation refinement in `AppLayout.tsx`.
- F-06 NotificationBell hover-scale microinteraction in `NotificationBell.tsx`.
- F-07 Breadcrumb mobile vertical alignment in `Breadcrumb.tsx`.

Do **NOT** implement Batch 4 (`GovernanceBanner.tsx`) or later batches.

---

## 17. Verification Plan

Upon implementation authorization, Batch 3 verification will require:

1. `pnpm typecheck` (0 TypeScript errors across workspace)
2. `pnpm lint` (0 ESLint errors)
3. `pnpm test` (101 test files passed, 787 tests passed)
4. `pnpm build` (Clean production bundle generation)
5. `git diff --check` (0 formatting/whitespace errors)
6. **Manual Browser QA**: Verify header styling, active links, notification dropdown, and mobile drawer at 1440px, 800px, and 375px viewports.

---

## 18. Explicit Out-of-Scope Items

- **NO** backend or API changes.
- **NO** changes to notification polling intervals or state schemas.
- **NO** page redesigns (Login, Dashboard, Projects, Documents, etc.).
- **NO** modification to `PRODUCT-ROADMAP.md`.
- **NO** Phase 33 creation.
- **NO** commit, push, or feature branch creation during this research phase.

---

## 19. Research Conclusion

Batch 3 scope is completely understood, risk-mitigated, and ready for future execution upon user authorization. The current codebase baseline is clean, fully certified, and ready for incremental refinement.
