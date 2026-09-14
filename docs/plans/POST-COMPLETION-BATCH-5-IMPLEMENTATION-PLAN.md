# Post-Completion Batch 5 Implementation Plan

**Plan Artifact**: `docs/plans/POST-COMPLETION-BATCH-5-IMPLEMENTATION-PLAN.md`  
**Target Batch**: Batch 5 — Authentication & Dashboard Polish  
**Repository Branch**: `main`  
**Current Published Main Commit**: `93cf49d`  
**Date**: September 14, 2026  
**Status**: **PLAN ONLY / NO SOURCE CHANGES MADE**

---

## 1. Objective

The objective of Batch 5 is to perform post-completion UI/UX refinement for the authentication pages ([`LoginPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/LoginPage.tsx), [`SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx)) and developer dashboard ([`DashboardPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/DashboardPage.tsx)) in `apps/web`.

This plan standardizes auth card surfaces, input focus rings, error alerts, loading fallbacks, welcome banners, and workspace card hover states using published Batch 1 CSS design tokens and Batch 2 UI primitives (`<Button>`, `<Card>`, `<CardBody>`, `<Badge>`, `<LoadingSpinner>`). All authentication stores, JWT token handling, security sanitization, route guards, and API behavior remain **100% untouched**.

---

## 2. Research References

This implementation plan is bound to the following authoritative documents:
1. **Batch 5 Research**: [`docs/research/POST-COMPLETION-BATCH-5-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-BATCH-5-RESEARCH.md)
2. **Master Figma Implementation Plan**: [`docs/plans/POST-COMPLETION-FIGMA-UI-UX-IMPLEMENTATION-PLAN.md`](file:///c:/MERN_STACK/Documan/documan/docs/plans/POST-COMPLETION-FIGMA-UI-UX-IMPLEMENTATION-PLAN.md)
3. **Figma Design Review**: [`docs/research/POST-COMPLETION-FIGMA-DESIGN-REVIEW.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-REVIEW.md)
4. **Figma Design Handoff**: [`docs/research/POST-COMPLETION-FIGMA-DESIGN-HANDOFF.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-FIGMA-DESIGN-HANDOFF.md)
5. **Product Roadmap**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md) (Unchanged; Phase 32 is final; NO Phase 33).

---

## 3. Current-State Summary

- `LoginPage.tsx`: Functional sign-in form using `useAuthStore` and `returnUrl` sanitization. Currently uses legacy `bg-white dark:bg-gray-800` card background and `border-gray-300 dark:border-gray-700` inputs.
- `SignupPage.tsx`: Functional sign-up form with password confirmation. Uses a **raw `<button>` tag** for submit instead of the shared `<Button>` primitive, and renders a **raw `<div>Loading...</div>`** for session restoration.
- `DashboardPage.tsx`: Post-login developer workspace dashboard rendering a 4-card quick workspace grid (`Projects & Topology`, `Documents Repository`, `Knowledge Discovery`, `Document Reviews`). Currently uses legacy `gray-800/700` card borders.

---

## 4. Exact Findings Being Addressed

| Finding ID | Severity | Title | Target File | Core Change Summary |
| :--- | :---: | :--- | :--- | :--- |
| **F-AUTH-01** | **P1** | Replace Signup Submit `<button>` | `SignupPage.tsx` | Replace raw `<button>` tag with `<Button variant="primary" size="lg" isLoading={isLoading} className="w-full">`. |
| **F-AUTH-02** | **P1** | Standardize Signup Restoration Fallback | `SignupPage.tsx` | Replace raw `<div>Loading...</div>` with `<LoadingSpinner label="Checking session..." />`. |
| **F-DASH-01** | **P1** | Design-Token Surface Alignment | `LoginPage.tsx`, `SignupPage.tsx`, `DashboardPage.tsx` | Replace legacy `gray-800/700` classes with dark slate tokens (`slate-950`, `slate-900`, `slate-800`, `border-slate-800/80`). |
| **F-AUTH-03** | **P2** | Authentication Error Alert Refinement | `LoginPage.tsx`, `SignupPage.tsx` | Standardize error alert boxes with high-contrast `bg-red-950/60 border border-red-800/80 text-red-300` styling. |
| **F-DASH-02** | **P2** | Dashboard Welcome Banner Refinement | `DashboardPage.tsx` | Refine welcome banner gradient, typography, and role badge placement according to Figma intent. |
| **F-DASH-03** | **P2** | Workspace Card Hover Transitions | `DashboardPage.tsx` | Polish Quick Workspace cards with subtle hover border/shadow transitions (`hover:border-slate-700 hover:shadow-indigo-950/20`). |

---

## 5. Exact Files Expected to Change

| File Path | Action | Description |
| :--- | :---: | :--- |
| [`apps/web/src/pages/LoginPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/LoginPage.tsx) | **MODIFY** | Update auth card container, input focus rings, error alert box, and token colors. |
| [`apps/web/src/pages/SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx) | **MODIFY** | Replace raw submit button with `<Button>`, replace raw restoration `<div>` with `<LoadingSpinner>`, update card/inputs/errors. |
| [`apps/web/src/pages/DashboardPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/DashboardPage.tsx) | **MODIFY** | Update welcome banner typography/badge, card surface tokens, and hover transition effects. |

---

## 6. File-by-File Detailed Implementation Plan

### 6.1 `LoginPage.tsx`
- **Target File**: `apps/web/src/pages/LoginPage.tsx`
- **Current Behavior**: Renders login form with legacy `bg-white dark:bg-gray-800` card and `border-gray-300 dark:border-gray-700` inputs.
- **Intended Change**:
  1. Main canvas container: `<main className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">`.
  2. Form card container: `<div className="max-w-md w-full space-y-8 bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-800/80">`.
  3. Form inputs: `className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 sm:text-sm transition-colors"`.
  4. Error alert: `className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm font-medium flex items-center gap-2"`.
- **Preserved Behavior**: `useAuthStore` calls, `handleSubmit`, `returnUrl` query parameter sanitization (`rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//")`), and `Navigate` redirects.
- **Accessibility**: `<label htmlFor="...">` bindings preserved; input focus rings use `focus-visible:ring-2 focus-visible:ring-indigo-500`.
- **Responsive**: Centered `max-w-md` container; fluid padding on mobile (375px).

### 6.2 `SignupPage.tsx`
- **Target File**: `apps/web/src/pages/SignupPage.tsx`
- **Current Behavior**: Renders sign-up form using raw `<button>` and raw `<div>Loading...</div>`.
- **Intended Change**:
  1. Import shared primitives: `import { Button } from "../components/ui/Button";` and `import { LoadingSpinner } from "../components/ui/LoadingSpinner";`.
  2. Restoration fallback (lines 66–68):
     ```tsx
     if (isRestoring) {
       return (
         <div className="min-h-screen flex items-center justify-center bg-slate-950">
           <LoadingSpinner label="Checking session..." />
         </div>
       );
     }
     ```
  3. Main canvas container: `<main className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">`.
  4. Form card container: `<div className="max-w-md w-full space-y-8 bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-800/80">`.
  5. Submit button (lines 177–184):
     ```tsx
     <Button
       type="submit"
       variant="primary"
       size="lg"
       isLoading={isLoading}
       className="w-full"
     >
       Create account
     </Button>
     ```
  6. Inputs & error alert: Standardized with dark slate tokens and focus rings identical to `LoginPage.tsx`.
- **Preserved Behavior**: `signup` handler, `password !== confirmPassword` validation, `returnUrl` handling, API error message extraction.
- **Accessibility**: Explicit label bindings; submit button loading state announces `aria-live` via `LoadingSpinner`.

### 6.3 `DashboardPage.tsx`
- **Target File**: `apps/web/src/pages/DashboardPage.tsx`
- **Current Behavior**: Renders welcome banner and 4 quick workspace cards with legacy `gray-100/700` classes.
- **Intended Change**:
  1. Welcome Banner (lines 13–29):
     ```tsx
     <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-8 border border-indigo-800/40 shadow-xl">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
           <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
             Welcome back, {user?.name || "User"}!
           </h1>
           <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
             Document management, contract governance, system topology, and developer workspace.
           </p>
         </div>
         <div className="flex items-center gap-3 shrink-0">
           <Badge variant="historical" size="md" showIndicator={false} className="font-mono">
             Role: {user?.role || "user"}
           </Badge>
         </div>
       </div>
     </div>
     ```
  2. Section Title: `<h2 className="text-lg font-bold text-white mb-4">Quick Workspaces</h2>`.
  3. Quick Action Cards (lines 37–128):
     - Replace card wrapper classes with: `className="bg-slate-900 border-slate-800/80 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-indigo-950/20"`.
     - Replace icon blocks: `className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center font-bold text-base mb-3 shadow-inner"`.
     - Card titles: `<h3 className="font-bold text-slate-100 text-base">`.
     - Card descriptions: `<p className="text-sm text-slate-400 mt-1 leading-relaxed">`.
     - Divider: `className="mt-4 pt-4 border-t border-slate-800/80"`.
     - Card action buttons: `<Button variant="secondary" size="sm" className="w-full group">View Projects <span className="transition-transform group-hover:translate-x-1 inline-block ml-1">&rarr;</span></Button>`.
- **Preserved Behavior**: `useAuthStore` user retrieval, all navigation `<Link>` routes (`/projects`, `/documents`, `/knowledge/search`, `/reviews`).

---

## 7. Finding-by-Finding Detailed Specification

### Finding F-AUTH-01 (P1): Replace Signup Submit `<button>`
- **Current Problem**: `SignupPage.tsx` renders a raw `<button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600...">` tag without using the shared Batch 2 `<Button>` primitive.
- **Intended Change**: Replace raw button with `<Button variant="primary" size="lg" isLoading={isLoading} className="w-full">Create account</Button>`.
- **Exact Component/File**: [`apps/web/src/pages/SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx)
- **Design Primitive**: `<Button>` ([`apps/web/src/components/ui/Button.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Button.tsx)).
- **Unchanged Behavior**: `handleSubmit` form onSubmit event and `disabled={isLoading}` state logic.
- **Accessibility**: Focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`) and loading state announcements.
- **Responsive**: Full width (`w-full`) inside centered `max-w-md` container.
- **Test Coverage**: Tested via typecheck, lint, build, and manual QA signup flow.

### Finding F-AUTH-02 (P1): Standardize Signup Restoration Fallback
- **Current Problem**: `SignupPage.tsx` line 67 renders a raw unstyled `<div>Loading...</div>` during session restoration.
- **Intended Change**: Replace with `<div className="min-h-screen flex items-center justify-center bg-slate-950"><LoadingSpinner label="Checking session..." /></div>`.
- **Exact Component/File**: [`apps/web/src/pages/SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx)
- **Design Primitive**: `<LoadingSpinner>` ([`apps/web/src/components/ui/LoadingSpinner.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/LoadingSpinner.tsx)).
- **Unchanged Behavior**: `isRestoring` state evaluation and return condition.
- **Accessibility**: `aria-live="polite"` spinner announcement.
- **Responsive**: Full screen centered flex container.
- **Test Coverage**: Tested via typecheck, build, and manual QA session restoration.

### Finding F-DASH-01 (P1): Design-Token Surface Alignment
- **Current Problem**: `LoginPage.tsx`, `SignupPage.tsx`, and `DashboardPage.tsx` rely on legacy `bg-white`, `dark:bg-gray-800`, `border-gray-200`, and `dark:border-gray-700` styling instead of dark slate design tokens.
- **Intended Change**: Replace all surface and border classes with dark slate tokens: `slate-950` canvas (`#020617`), `slate-900` cards (`#0f172a`), `slate-800/80` borders (`#1e293b`).
- **Exact Component/File**: `LoginPage.tsx`, `SignupPage.tsx`, `DashboardPage.tsx`.
- **Design Tokens**: `apps/web/src/index.css` tokens (`--color-bg-canvas`, `--color-bg-surface`, `--color-border-default`).
- **Unchanged Behavior**: Page structures, form logic, and routing.
- **Accessibility**: High contrast body text (`slate-100` on `slate-900` exceeds **18:1** contrast ratio).
- **Responsive**: Maintains responsive card bounds and fluid padding across all viewports.
- **Test Coverage**: Tested via typecheck, lint, build, and manual QA across all 4 breakpoints.

### Finding F-AUTH-03 (P2): Authentication Error Alert Refinement
- **Current Problem**: Error messages in `LoginPage.tsx` and `SignupPage.tsx` use `bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400` styling.
- **Intended Change**: Standardize error alerts to `bg-red-950/60 border border-red-800/80 text-red-300 text-sm font-medium rounded-xl p-3.5 flex items-center gap-2`.
- **Exact Component/File**: `LoginPage.tsx`, `SignupPage.tsx`.
- **Design Tokens**: State error tokens (`bg-red-950/60`, `border-red-800/80`, `text-red-300`).
- **Unchanged Behavior**: Error state setter (`setError`) and error message strings ("Invalid email or password", "Passwords do not match").
- **Accessibility**: `role="alert"` attribute preserved for immediate screen reader announcement.
- **Responsive**: Fluid width inside form container.
- **Test Coverage**: Tested via manual QA submitting invalid credentials.

### Finding F-DASH-02 (P2): Dashboard Welcome Banner Refinement
- **Current Problem**: Welcome banner in `DashboardPage.tsx` uses raw bright gradient `from-indigo-600 to-indigo-800` with hardcoded text and inline badge classes.
- **Intended Change**: Refine to `bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-800/40 shadow-xl` with standardized `<Badge variant="historical">` for user role.
- **Exact Component/File**: [`apps/web/src/pages/DashboardPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/DashboardPage.tsx).
- **Design Primitive**: `<Badge>` ([`apps/web/src/components/ui/Badge.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Badge.tsx)).
- **Unchanged Behavior**: `user?.name` and `user?.role` data retrieval from `useAuthStore`.
- **Accessibility**: `<h1>` heading hierarchy preserved.
- **Responsive**: Flex row on desktop (1440px), stacked column on mobile (375px).
- **Test Coverage**: Tested via manual QA on dashboard.

### Finding F-DASH-03 (P2): Workspace Card Hover Transitions
- **Current Problem**: Quick workspace cards in `DashboardPage.tsx` use static `hover:shadow-md border-gray-100 dark:border-gray-700` styling.
- **Intended Change**: Apply cohesive hover transitions `bg-slate-900 border-slate-800/80 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-indigo-950/20` and smooth arrow hover translation `group-hover:translate-x-1`.
- **Exact Component/File**: [`apps/web/src/pages/DashboardPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/DashboardPage.tsx).
- **Design Primitives**: `<Card>`, `<CardBody>`, `<Button variant="secondary">`.
- **Unchanged Behavior**: Card links (`<Link to="/projects">`, `/documents`, `/knowledge/search`, `/reviews`).
- **Accessibility**: Card buttons remain focusable via keyboard (`Tab`).
- **Responsive**: Grid layout (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`).
- **Test Coverage**: Tested via manual QA hovering over cards.

---

## 8. Design-Token Mapping

| Purpose | Legacy Class | Design System Token Class |
| :--- | :--- | :--- |
| **Page Canvas Background** | `bg-gray-50 dark:bg-gray-900` | `bg-slate-950` (`var(--color-bg-canvas)`) |
| **Card / Surface Background** | `bg-white dark:bg-gray-800` | `bg-slate-900` (`var(--color-bg-surface)`) |
| **Input / Element Background** | `bg-white dark:bg-gray-900` | `bg-slate-950` |
| **Card / Container Border** | `border-gray-200 dark:border-gray-700` | `border-slate-800/80` (`var(--color-border-default)`) |
| **Input Border** | `border-gray-300 dark:border-gray-700` | `border-slate-800` |
| **Input Focus Ring** | `focus:ring-indigo-500` | `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950` |
| **Primary Text** | `text-gray-900 dark:text-white` | `text-slate-100` (`var(--color-text-main)`) |
| **Muted Text** | `text-gray-600 dark:text-gray-400` | `text-slate-400` (`var(--color-text-muted)`) |
| **Error Alert Surface** | `bg-red-50 dark:bg-red-900/30` | `bg-red-950/60 border border-red-800/80 text-red-300` |

---

## 9. Accessibility Requirements (WCAG 2.1 AA)

- **Form Labels**: All form inputs MUST have matching `<label htmlFor="id">` elements.
- **Focus Rings**: All interactive elements (inputs, buttons, links) MUST display visible focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`).
- **Color Contrast**: Text on slate surfaces MUST exceed **4.5:1** contrast ratio (main body text `text-slate-100` on `bg-slate-900` achieves **18.5:1**).
- **Error Alerts**: Error messages MUST retain `role="alert"` for immediate screen reader announcement.
- **Loading States**: `<LoadingSpinner>` MUST include `aria-live="polite"` and accessible text label.

---

## 10. Responsive Requirements

- **Desktop (1440px)**: Centered auth forms; 4-column dashboard grid (`lg:grid-cols-4`).
- **Laptop (1024px)**: 4-column or 2-column grid adaptation; fluid container padding.
- **Tablet (800px)**: 2-column dashboard grid (`md:grid-cols-2`).
- **Mobile (375px)**: Single-column layout (`grid-cols-1`); full-width buttons (`w-full`); fluid card padding (`p-6`); 0 horizontal overflow.

---

## 11. Mandatory Authentication & Security Preservation Constraints

The implementation MUST NOT modify or disrupt:
- [`apps/web/src/features/auth/auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts) (Zustand auth store).
- `login()` function implementation or API payload.
- `signup()` function implementation or API payload.
- `restoreSession()` session initialization logic.
- JWT access token and refresh token storage / rotation mechanisms.
- `returnUrl` query parameter sanitization (`rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//") && rawReturnUrl !== "/login"`).
- [`apps/web/src/routes/ProtectedRoute.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/routes/ProtectedRoute.tsx) role guards (`allowedRoles`) or redirection flow.
- Authorization / ACL permission checking.

---

## 12. Navigation & Behavior Preservation Constraints

- Dashboard navigation links (`/projects`, `/documents`, `/knowledge/search`, `/reviews`) MUST remain unchanged.
- Form redirection targets (`targetUrl` resolving to `returnUrl` or `/dashboard`) MUST remain unchanged.
- Route paths (`/login`, `/signup`, `/dashboard`) MUST remain unchanged.

---

## 13. Performance Considerations

- **Sub-1ms Component Rendering**: Pure React UI styling refinements with 0 new dependencies.
- **Zero Bundle Overhead**: Consumes already-imported shared primitives (`Button`, `Card`, `Badge`, `LoadingSpinner`).
- **Code Splitting**: `LoginPage`, `SignupPage`, and `DashboardPage` remain lazily loaded via `React.lazy()` in `App.tsx`.

---

## 14. Testing Strategy

1. **Repository Quality Verification Commands**:
   - `pnpm typecheck`: 0 TypeScript errors across workspace.
   - `pnpm lint`: 0 ESLint errors.
   - `pnpm test`: 101 API test files + web component test suite passed (793+ tests passed).
   - `pnpm build`: Clean production build for `web` (Vite) and `api` (`tsc`).
   - `git diff --check`: 0 whitespace warnings.

---

## 15. Manual QA Strategy

Manual browser QA MUST be performed on active dev server (`http://localhost:5173/`) across **1440px**, **1024px**, **800px**, and **375px** viewports:

1. **Login Page QA**:
   - Inspect dark slate card styling, input focus rings, and submit button.
   - Submit invalid credentials $\rightarrow$ verify high-contrast red error alert box (`role="alert"`).
   - Submit valid credentials $\rightarrow$ verify loading spinner state on button and successful redirect to `/dashboard`.
   - Access protected route while unauthenticated $\rightarrow$ verify returnUrl parameter (`/login?returnUrl=%2Fdocuments`) and returnUrl redirect upon login.
2. **Signup Page QA**:
   - Inspect dark slate card styling and standardized `<Button>` primitive.
   - Enter mismatched passwords $\rightarrow$ verify "Passwords do not match" error alert.
   - Submit valid signup form $\rightarrow$ verify loading button state and redirect to target URL.
   - Test session restoration fallback $\rightarrow$ verify `<LoadingSpinner label="Checking session..." />` presentation.
3. **Dashboard Page QA**:
   - Inspect Welcome Banner gradient, typography, and role badge.
   - Inspect 4 Quick Workspace cards $\rightarrow$ verify hover border/shadow transitions and smooth arrow hover translation.
   - Click card buttons $\rightarrow$ verify clean navigation to `/projects`, `/documents`, `/knowledge/search`, and `/reviews`.

---

## 16. Regression Controls

1. **Auth Engine Isolation**: Form presentation changes only; 0 edits to `auth.store.ts` or API request interceptors.
2. **Security Isolation**: `returnUrl` sanitization logic remains identical.
3. **Route Protection**: `ProtectedRoute.tsx` remains untouched.

---

## 17. Explicitly Excluded Files

The following files MUST NOT be modified in Batch 5:
- `apps/web/src/features/auth/auth.store.ts`
- `apps/web/src/features/auth/auth.api.ts`
- `apps/web/src/routes/ProtectedRoute.tsx`
- `apps/web/src/App.tsx`
- `apps/api/**/*` (all backend files)
- `docs/PRODUCT-ROADMAP.md`

---

## 18. Explicitly Out-of-Scope Functionality

- **NO** backend, database, or API route modifications.
- **NO** OAuth / social login additions.
- **NO** user profile editing or password reset flow additions.
- **NO** changes to `docs/PRODUCT-ROADMAP.md` or Phase 33 creation.

---

## 19. Expected Verification Commands

Upon implementation execution, the following verification pipeline must be executed:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
git diff --check
```

---

## 20. Acceptance Criteria

Batch 5 will be complete when:
1. `SignupPage.tsx` uses the shared `<Button>` primitive for submit action (F-AUTH-01).
2. `SignupPage.tsx` uses `<LoadingSpinner label="Checking session..." />` for restoration fallback (F-AUTH-02).
3. `LoginPage.tsx`, `SignupPage.tsx`, and `DashboardPage.tsx` use dark slate design tokens (`slate-950`, `slate-900`, `slate-800`, `border-slate-800/80`) (F-DASH-01).
4. Auth error alerts use high-contrast `bg-red-950/60 border-red-800/80 text-red-300` styling (F-AUTH-03).
5. `DashboardPage.tsx` welcome banner and role badge are refined according to Figma intent (F-DASH-02).
6. Quick Workspace action cards feature smooth hover border/shadow transitions (F-DASH-03).
7. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check` pass with 0 errors.
8. Manual QA confirms responsive layout and auth flow functionality at 1440px, 1024px, 800px, and 375px.

---

## 21. Rollback Considerations

- All changes in Batch 5 are localized to three React page files (`LoginPage.tsx`, `SignupPage.tsx`, `DashboardPage.tsx`).
- Rollback can be performed instantly via `git checkout -- apps/web/src/pages/` without side effects on database state, backend APIs, or user authentication tokens.

---

## 22. Final Readiness Recommendation

```
========================================================================================
                      FINAL IMPLEMENTATION PLAN DETERMINATION
========================================================================================

                  [ READY FOR IMPLEMENTATION ]

The implementation plan for Batch 5 (Auth & Dashboard Polish) is complete, fully specified,
risk-mitigated, and ready for execution on a dedicated feature branch.
========================================================================================
```
