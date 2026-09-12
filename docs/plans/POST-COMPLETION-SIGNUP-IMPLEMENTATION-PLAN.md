# Implementation Plan: Self-Service User Signup / Registration

> [!IMPORTANT]
> **ENHANCEMENT CLASSIFICATION**
> **POST-COMPLETION ENHANCEMENT** (NOT PHASE 33)
> Documan Phases 1–32 are **COMPLETE AND FULLY CERTIFIED**. Phase 32 was the final planned product phase. There is **NO Phase 33** and **NO Phase 34+**. The product roadmap is permanently closed. This implementation plan governs a focused post-completion usability enhancement and does not create or alter any product roadmap phases.

---

## 1. Executive Summary

This plan details the implementation strategy for introducing **Self-Service User Signup / Registration** to Documan.

Based on the research findings in [`POST-COMPLETION-SIGNUP-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-SIGNUP-RESEARCH.md), the backend already possesses user creation capability via [`user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts). This plan defines how to expose public registration via a single-step auto-login endpoint `POST /api/v1/auth/register`, add a rate limiter (`signupRateLimiter`), build the frontend `SignupPage.tsx` component, wire it into Zustand `useAuthStore`, and enforce strict security boundaries.

---

## 2. Enhancement Classification

- **Classification**: **POST-COMPLETION ENHANCEMENT**
- **Roadmap Impact**: **NONE**. Does not create Phase 33. Does not modify the 32-phase roadmap boundary.

---

## 3. Existing Architecture Overview

- **User Model** ([`user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts)): Defines `name`, `email` (unique, lowercase), `passwordHash`, `role` (`'user' | 'admin'`, default `'user'`), `isActive` (default `true`), `isDeleted` (default `false`).
- **User Service** ([`user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts)): `createUser()` checks email uniqueness (throws 409 `USER_ALREADY_EXISTS`), hashes password with bcrypt (cost 12), and saves user.
- **Auth Module** ([`auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts), [`auth.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.controller.ts), [`auth.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.ts)): Manages login, refresh, logout, and token generation. Issues access JWT and sets `documan_refresh_token` httpOnly cookie.
- **Rate Limiter Middleware** ([`rate-limit.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/rate-limit.middleware.ts)): Configures `express-rate-limit` for `/auth/login` (5 attempts / 15 mins) and `/auth/refresh` (10 attempts / 15 mins).
- **Frontend Auth State** ([`auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts)): Zustand store holding `accessToken`, `user`, `isAuthenticated`, `isLoading`, `isRestoring`.
- **Frontend Routing** ([`App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx), [`LoginPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/LoginPage.tsx), [`ProtectedRoute.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/routes/ProtectedRoute.tsx)): Public lazy-loaded `/login` route, protected routes for dashboard, documents, projects, and users. Sanitizes `returnUrl` for open-redirect safety.

---

## 4. Architectural Decision: API Endpoint & User Creation Strategy

### Evaluated Options:

1. **Option A: Reuse `POST /api/v1/users` directly**: Require frontend to make a 2-step call (`POST /api/v1/users` to create account, then `POST /api/v1/auth/login` to authenticate).
2. **Option B: Dedicated `POST /api/v1/auth/register` (SELECTED)**: Expose a single-step registration & auto-login endpoint under `/api/v1/auth/register`.

### Selected Strategy & Rationale:

We select **Option B (`POST /api/v1/auth/register`)**.

- **No Logic Duplication**: In `auth.service.ts`, `registerUser(input)` calls `createUser(input)` from `user.service.ts` directly. `createUser()` remains the **single authoritative function** for password hashing, email normalization, uniqueness validation, and user creation.
- **Single-Step UX**: `registerUser()` immediately generates an access JWT and sets the `documan_refresh_token` httpOnly cookie (reusing token generation from `loginUser()`), providing a seamless single-step signup experience for the frontend.
- **Route Grouping**: Public authentication endpoints (`/login`, `/refresh`, `/logout`, `/register`) remain logically grouped under `/api/v1/auth/*`.
- **Error Handling Fix**: `createUserController` in `user.controller.ts` will also be updated with `try/catch(next)` error forwarding for consistency.

---

## 5. Registration API Design

### Route: `POST /api/v1/auth/register`

- **Middleware Chain**:
  1. `signupRateLimiter` (15-min window, max 5 attempts per IP)
  2. `validateBody(registerSchema)` (validates `name`, `email`, `password`)
  3. `registerController`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123"
  }
  ```
- **Validation Rules (`registerSchema` in `auth.schema.ts`)**:
  - `name`: string, min 2, max 100, trimmed
  - `email`: string, valid email, trimmed, lowercase
  - `password`: string, min 8, max 100
- **HTTP Response Codes**:
  - `201 Created`: User created and authenticated successfully.
  - `400 Bad Request`: Validation failure or malformed payload.
  - `409 Conflict`: Duplicate email (`USER_ALREADY_EXISTS`).
  - `429 Too Many Requests`: Exceeded signup rate limit (`TOO_MANY_SIGNUP_ATTEMPTS`).
- **Response Shape (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "60f71f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "isActive": true
      }
    }
  }
  ```
- **Cookie Header**: Sets `documan_refresh_token` (`httpOnly`, `path=/api/v1/auth`, `sameSite=lax`, `secure` in production, maxAge = 7 days).

---

## 6. Authentication Integration

- **Access JWT**: `generateAccessToken(user.id)` generates signed short-lived token.
- **Refresh Token**: `generateRefreshToken()` hex token, hashed with SHA-256 and saved in `RefreshToken` collection under a new `familyId`.
- **Cookie Security**: Delivered via httpOnly cookie matching the exact configuration of `loginController`.
- **Frontend Session**: Frontend `useAuthStore.signup()` receives `accessToken` and `user`, sets `isAuthenticated: true`, enabling immediate navigation into protected routes without requiring a separate login step.

---

## 7. Role & Authorization Enforcement

- **Forced User Role**: `createUser()` in `user.service.ts` hardcodes `role: 'user'`.
- **Protection Against Role Escalation**: Even if a client sends `{ "role": "admin" }` in the JSON payload, Zod schema validation strips or ignores unpermitted fields, preventing any unauthorized privilege escalation.
- **Project Isolation**: Newly registered users have 0 project memberships. When they create a project on `/projects`, they are assigned as `ownerId`. No changes to project security or ACL models are needed.

---

## 8. Frontend SignupPage Specification

- **Route**: `/signup` (public, lazy-loaded in [`App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx)).
- **Form Fields**:
  - `name`: Text input, labeled "Full Name", required, autocomplete="name".
  - `email`: Email input, labeled "Email Address", required, autocomplete="email".
  - `password`: Password input, labeled "Password", required, minLength 8.
  - `confirmPassword`: Password input, labeled "Confirm Password", required, minLength 8.
- **Validation**:
  - Client-side check ensuring `password === confirmPassword`. If mismatched, displays inline error: `"Passwords do not match"`.
  - Server validation errors displayed in an accessible alert banner (`role="alert"`).
- **UX & Accessibility**:
  - Submit button shows loading state (`"Creating account..."`) and is disabled during requests.
  - Form fields feature matching `<label htmlFor="...">` and `<input id="...">`.
  - Text link: `"Already have an account? Log in"` pointing to `/login`.
- **Redirect / Return URL Behavior**: On successful signup, navigates to `targetUrl` derived from `returnUrl` query parameter (defaulting to `/dashboard`).

---

## 9. Return URL Security & Open-Redirect Protection

Preserves and reuses the open-redirect protection algorithm from [`LoginPage.tsx:27-33`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/LoginPage.tsx#L26-L33):

```ts
const rawReturnUrl = searchParams.get("returnUrl");
const targetUrl =
  rawReturnUrl &&
  rawReturnUrl.startsWith("/") &&
  !rawReturnUrl.startsWith("//") &&
  rawReturnUrl !== "/login" &&
  rawReturnUrl !== "/signup"
    ? rawReturnUrl
    : "/dashboard";
```

- Accepts: `/projects`, `/documents`, `/dashboard`
- Rejects: `https://evil.com`, `//evil.com`, `javascript:alert(1)`, `/signup`

---

## 10. Rate Limiting Specification

Reuses the established `express-rate-limit` pattern in [`rate-limit.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/rate-limit.middleware.ts):

```ts
export const signupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_SIGNUP_ATTEMPTS",
      message: "Too many signup attempts. Please try again later.",
    },
  },
});
```

Applied to `POST /api/v1/auth/register`.

---

## 11. Security Requirements Summary

| Security Aspect                | Implementation Requirement                                                      |
| :----------------------------- | :------------------------------------------------------------------------------ |
| **Password Hashing**           | Bcrypt cost factor 12 via `user.service.ts`.                                    |
| **Email Uniqueness**           | Checked prior to DB insert (`USER_ALREADY_EXISTS` 409) + Mongoose unique index. |
| **Role Escalation Prevention** | Hardcoded `role: 'user'`. Client input cannot override role.                    |
| **Input Validation**           | Zod `registerSchema` enforces field bounds and formatting.                      |
| **Spam / Brute-Force**         | `signupRateLimiter` restricts IP requests to 5 per 15 minutes.                  |
| **Cookie Security**            | `httpOnly`, `sameSite: 'lax'`, `path: '/api/v1/auth'`, `secure` in production.  |
| **Open-Redirect Defense**      | Strict relative path checking (`startsWith('/') && !startsWith('//')`).         |

---

## 12. Proposed Backend Tests

Files:

- `apps/api/src/modules/auth/auth.routes.test.ts`
- `apps/api/src/modules/auth/auth.service.test.ts`
- `apps/api/src/modules/auth/auth.controller.test.ts`

Test Cases:

1. `POST /api/v1/auth/register` creates new user with `role: 'user'` and returns 201 Created with `accessToken` and user object.
2. `POST /api/v1/auth/register` sets `documan_refresh_token` httpOnly cookie.
3. Rejects duplicate email with 409 `USER_ALREADY_EXISTS`.
4. Rejects invalid email format or password under 8 characters with 400 Bad Request.
5. Verifies password stored in database is bcrypt hashed.
6. Rejects malicious body containing `{ "role": "admin" }` by forcing `role: 'user'`.
7. Enforces `signupRateLimiter` after 5 attempts from the same IP (returns 429).

---

## 13. Proposed Frontend Tests

Files:

- `apps/web/src/pages/SignupPage.test.tsx` (NEW)
- `apps/web/src/features/auth/auth.store.test.ts`

Test Cases:

1. Renders signup form with name, email, password, confirm password inputs and submit button.
2. Validates matching passwords client-side and displays inline error if passwords differ.
3. Submits valid form data to `signup` action and navigates to `/dashboard` on success.
4. Displays server error banner when API returns 409 (`USER_ALREADY_EXISTS`).
5. Displays loading state (`"Creating account..."`) and disables button while submitting.
6. Navigates to sanitized `returnUrl` when query parameter is provided.
7. Rejects malicious `returnUrl` (e.g. `https://evil.com`) and falls back to `/dashboard`.
8. Renders clickable link navigating to `/login`.

---

## 14. Regression Verification Plan

Run the full automated test suite to verify existing flows remain 100% operational:

- `pnpm typecheck`: TypeScript compilation check across all packages.
- `pnpm lint`: ESLint check across all packages.
- `pnpm test`: Run all 99+ test suites (including login, logout, token refresh, RBAC, documents, and governance tests).
- `pnpm build`: Validate production build bundle.

---

## 15. Files to Modify and Create

### Files to Modify:

1. [`apps/api/src/middleware/rate-limit.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/rate-limit.middleware.ts) — Add `signupRateLimiter`.
2. [`apps/api/src/modules/auth/auth.schema.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.schema.ts) — Add `registerSchema` and `RegisterInput`.
3. [`apps/api/src/modules/auth/auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts) — Add `registerUser()` calling `createUser()`.
4. [`apps/api/src/modules/auth/auth.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.controller.ts) — Add `registerController()`.
5. [`apps/api/src/modules/auth/auth.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.ts) — Mount `POST /register` route with limiter and validation.
6. [`apps/api/src/modules/users/user.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.controller.ts) — Add `try/catch(next)` error forwarding to `createUserController`.
7. [`apps/web/src/features/auth/auth.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.types.ts) — Add `RegisterRequest` and `RegisterResponse`.
8. [`apps/web/src/features/auth/auth.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.api.ts) — Add `register()` API call.
9. [`apps/web/src/features/auth/auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts) — Add `signup()` store action.
10. [`apps/web/src/pages/LoginPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/LoginPage.tsx) — Add link to `/signup`.
11. [`apps/web/src/App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx) — Add lazy-loaded `/signup` route.

### New Files to Create:

1. `apps/web/src/pages/SignupPage.tsx` — Signup page component.
2. `apps/web/src/pages/SignupPage.test.tsx` — Signup page unit/integration tests.

---

## 16. Database Migration Requirements

**NONE**. No schema modifications or database migrations are required. The existing MongoDB `User` and `RefreshToken` schemas fully support self-service signup.

---

## 17. Out of Scope

The following features remain explicitly **OUT OF SCOPE**:

- Social Login / OAuth (Google, GitHub)
- Single Sign-On (SSO / SAML / OIDC)
- Multi-Factor Authentication (MFA)
- Email token verification via SMTP
- Password reset via email link
- Organization / Multi-tenant workspace invitations

---

## 18. Acceptance Criteria

1. Navigating to `/signup` renders a clean, accessible registration form.
2. Submitting valid name, email, and password creates a user with `role: 'user'` and `isActive: true`.
3. Registration immediately issues access JWT and sets `documan_refresh_token` httpOnly cookie (auto-login).
4. User is redirected to `/dashboard` (or sanitized `returnUrl`).
5. Client-side validation blocks mismatched password confirmation.
6. Attempting to register an existing email displays a 409 error message ("User with this email already exists").
7. Rapid repeated registration requests trigger HTTP 429 rate limit error.
8. `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass with 0 errors.

---

## 19. Manual QA Plan

1. **Successful Registration**: Open browser to `http://localhost:5173/signup` $\rightarrow$ Enter "Test User", "testuser@example.com", "Password123!" $\rightarrow$ Submit $\rightarrow$ Verify auto-login and navigation to Dashboard.
2. **Duplicate Email Check**: Return to `/signup` $\rightarrow$ Enter "Test User 2", "testuser@example.com", "Password123!" $\rightarrow$ Submit $\rightarrow$ Verify error message banner: "User with this email already exists".
3. **Password Mismatch Check**: Enter "Password123!" and "DifferentPass!" $\rightarrow$ Verify client inline validation blocks submission.
4. **Return URL Navigation**: Navigate to `/signup?returnUrl=%2Fprojects` $\rightarrow$ Complete registration with new email $\rightarrow$ Verify client navigates to `/projects`.
5. **Malicious Return URL Protection**: Navigate to `/signup?returnUrl=https%3A%2F%2Fevil.com` $\rightarrow$ Complete registration $\rightarrow$ Verify client safely falls back to `/dashboard`.

---

## 20. Rollback Considerations

If issues arise, reverting this enhancement requires:

1. Reverting frontend additions (`SignupPage.tsx`, `/signup` route, link in `LoginPage.tsx`).
2. Reverting `POST /api/v1/auth/register` in `auth.routes.ts`.
3. No database cleanup is needed as created user accounts conform standard `User` schema.

---

## 21. Final Git Workflow Plan

1. **Plan Review**: Present this plan for user review.
2. **Feature Branch**: Create `feature/self-service-user-signup` once authorized.
3. **Implementation**: Implement API and Web changes incrementally.
4. **Verification**: Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
5. **Publication**: Merge into `main` using `--no-ff`, push to `origin/main`, and delete feature branch.
