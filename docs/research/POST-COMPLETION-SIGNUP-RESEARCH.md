# Post-Completion Enhancement Research: Self-Service User Signup / Registration

> [!IMPORTANT]
> **PRODUCT BOUNDARY NOTICE**
> Documan Product Development Phases 1–32 are **COMPLETE AND FULLY CERTIFIED**. Phase 32 was the final planned product phase. There is **NO Phase 33** and **NO Phase 34+**.
> This work is strictly classified as a **POST-COMPLETION ENHANCEMENT**. It does not alter or extend the 32-phase product roadmap.

---

## 1. Executive Summary

This document presents a comprehensive technical research and architectural audit for introducing a **Self-Service User Signup / Registration** feature to Documan as a post-completion enhancement.

The audit evaluated Documan's existing authentication, authorization, user management, and session restoration systems. The investigation revealed that:

1. **Backend Capability Already Exists**: A user creation service ([`user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts)) and unauthenticated REST route `POST /api/v1/users` ([`user.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.routes.ts#L32-L36)) are already fully implemented on the backend.
2. **Missing Frontend Integration**: The web frontend currently lacks a public registration page (`SignupPage.tsx`), store action, and API client integration to expose user registration to end-users.
3. **Low Implementation Risk**: Enabling self-service registration requires zero database schema modifications, zero new external services (e.g., SMTP servers), and zero changes to existing RBAC or project membership models.

---

## 2. Existing Authentication Architecture

Documan utilizes a modern stateless access token + stateful refresh token authentication architecture:

- **Password Hashing**: Passwords are hashed using `bcrypt` with cost factor 12 ([`user.service.ts:40`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts#L40)).
- **Access Tokens**: Short-lived JSON Web Tokens (JWT) signed with `JWT_SECRET` containing `{ userId: string }` payload ([`jwt.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/utils/jwt.ts), [`auth.middleware.ts:33-36`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/auth.middleware.ts#L33-L36)). Passed via `Authorization: Bearer <token>` header.
- **Refresh Tokens**: Long-lived random UUID tokens hashed with SHA-256 before storage in MongoDB ([`refresh-token.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/refresh-token.model.ts), [`refresh-token.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/utils/refresh-token.js)). Delivered to the client via an `httpOnly`, `sameSite: 'lax'`, `path: '/api/v1/auth'` cookie named `documan_refresh_token` ([`auth.controller.ts:21-32`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.controller.ts#L21-L32)).
- **Token Rotation & Reuse Detection**: Refreshing an access token revokes the old refresh token and issues a new token pair in the same `familyId`. Reuse of a revoked token triggers revocation of all active tokens in that family ([`auth.service.ts:98-117`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts#L98-L117)).
- **Rate Limiting**: Express middleware enforces ip-based rate limiting on sensitive endpoints (e.g., `loginRateLimiter`, `refreshRateLimiter` in [`rate-limit.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/rate-limit.middleware.ts)).

---

## 3. Existing User Lifecycle

The user domain model ([`user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts)) defines the following schema:

```ts
export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Key Lifecycle Fields:

- `email`: Normalized to lowercase, trimmed, indexed as unique.
- `role`: Enum `['user', 'admin']`, defaults to `'user'`.
- `isActive`: Boolean, defaults to `true`. Inactive accounts are blocked during login and token refresh.
- `isDeleted`: Boolean, defaults to `false`. Soft-deletion flag used by admin user deletion workflows.

---

## 4. Existing User Creation Capability

An investigation of backend services revealed that **user creation is already implemented**:

- **Service Function**: `createUser(input: CreateUserInput)` in [`user.service.ts:25-61`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts#L25-L61):
  1. Checks for duplicate email (`User.findOne({ email: input.email })`). Throws `AppError('User with this email already exists', 409, 'USER_ALREADY_EXISTS')`.
  2. Hashes password using `bcrypt.hash(input.password, 12)`.
  3. Inserts document with `role: 'user'`, `isActive: true`, `isDeleted: false`.
  4. Returns sanitized `UserResponse` (`id`, `name`, `email`, `role`, `isActive`, `isDeleted`, `createdAt`, `updatedAt`).

- **HTTP Route**: `POST /api/v1/users` in [`user.routes.ts:32-36`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.routes.ts#L32-L36):

  ```ts
  userRouter.post("/", validateBody(createUserSchema), createUserController);
  ```

  _Note_: This route is currently **unauthenticated** on the backend and accepts valid `createUserSchema` payloads (`{ name, email, password }`).

- **Gaps Identified**:
  - `createUserController` ([`user.controller.ts:17-24`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.controller.ts#L17-L24)) does not wrap service execution in a `try/catch(next)` block for Express error forwarding (unlike all other user controller handlers).
  - The endpoint returns the created user object, but does **not** generate and set authentication tokens (`accessToken` / `documan_refresh_token` cookie), requiring a subsequent login step unless modified or wrapped by an auth registration controller.

---

## 5. Frontend Authentication Flow

The web application ([`apps/web/src`](file:///c:/MERN_STACK/Documan/documan/apps/web/src)) manages auth state via Zustand ([`auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts)):

1. **Session Restoration**: On application startup, [`App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx#L38-L40) executes `restoreSession()`, which attempts to refresh the access token via `POST /api/v1/auth/refresh` (reading the httpOnly cookie) and fetch `/users/me`.
2. **Protected Routes**: [`ProtectedRoute.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/routes/ProtectedRoute.tsx) verifies `isAuthenticated` and checks `allowedRoles`. Unauthenticated users are redirected to `/login?returnUrl=...`.
3. **Open-Redirect Protection**: [`LoginPage.tsx:26-33`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/LoginPage.tsx#L26-L33) inspects `returnUrl` parameters and ensures destination paths start with `/`, do not start with `//`, and are not equal to `/login`.
4. **Current Navigation**: The frontend routing table in [`App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx#L53-L76) defines public `/login` and protected application pages, but has **no signup route**.

---

## 6. Security Assessment

Enabling self-service signup presents specific security considerations that align with existing architecture:

| Security Vector            | Existing Defense / Requirement                                     | Assessment & Recommendation                                                                                                                   |
| :------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email Uniqueness**       | `User.findOne({ email })` check + Mongoose `unique: true` index.   | **Sufficient**. Prevents duplicate user accounts.                                                                                             |
| **Password Hashing**       | Bcrypt with salt rounds `12`.                                      | **Sufficient**. Strong cryptographic protection against pre-computed rainbow table attacks.                                                   |
| **Password Strength**      | Zod `createUserSchema`: `min(8)`, `max(100)`.                      | **Sufficient**. Standard password policy. Frontend confirmation field prevents typos.                                                         |
| **Default User Role**      | `role: 'user'` set by service default.                             | **Critical**. Request body fields specifying `role` must be ignored during self-service signup to prevent privilege escalation to `'admin'`.  |
| **Account Enumeration**    | `409 USER_ALREADY_EXISTS` status code returned on duplicate email. | **Standard UX**. Standard trade-off for self-service signup.                                                                                  |
| **Endpoint Rate Limiting** | `rate-limit.middleware.ts` exists.                                 | **Required**. A `signupRateLimiter` (e.g., 5 registration attempts per 15 minutes per IP) should be applied to prevent spam account creation. |
| **Session Security**       | Access token + httpOnly refresh cookie.                            | **Sufficient**. Reuses established secure token issuance pattern.                                                                             |

---

## 7. Registration Model Comparison

Three potential registration models were evaluated for Documan:

| Model                                       | Workflow                                                                                                                                                                          | Existing Code Alignment                                                                               | Infrastructure Required                                                                               | Assessment                                                                  |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **Model A: Open Self-Service Registration** | User completes signup form $\rightarrow$ Account created ($isActive=true$) $\rightarrow$ Auto-login $\rightarrow$ Dashboard.                                                      | **100% Alignment**. Uses existing `User` model, `createUser` service, and JWT session generation.     | **None**. Zero external dependencies.                                                                 | **RECOMMENDED**. Cleanest UX and lowest complexity.                         |
| **Model B: Email-Verified Registration**    | User completes signup form $\rightarrow$ Account created ($isActive=false$) $\rightarrow$ Verification email sent $\rightarrow$ User clicks link $\rightarrow$ Account activated. | **Partial**. `isActive` field exists, but no verification token model or email dispatch logic exists. | **High**. Requires SMTP server setup, mailer library, email templates, and token verification routes. | **NOT RECOMMENDED**. Unnecessary operational overhead for this enhancement. |
| **Model C: Invitation-Based Registration**  | Admin creates invitation $\rightarrow$ Link sent to user $\rightarrow$ User completes registration.                                                                               | **Low**. No `Invitation` model or token management exists.                                            | **Medium**. Requires invitation tracking schema and admin UI workflows.                               | **NOT RECOMMENDED**. Does not satisfy self-service requirement.             |

---

## 8. Recommended Registration Model

**RECOMMENDED APPROACH: Model A (Open Self-Service Registration)**

1. User submits name, email, and password on `/signup`.
2. Backend validates input, verifies email uniqueness, and creates account with `role: 'user'` and `isActive: true`.
3. Backend immediately returns an `accessToken` and sets the `documan_refresh_token` httpOnly cookie (auto-login), OR frontend issues an immediate `login()` request upon 201 Created response.
4. Client navigates directly to `/dashboard` (or `returnUrl`).

---

## 9. Role & Project Membership Recommendation

- **Global System Role**: Newly registered users MUST always be assigned `role: 'user'`. Under no circumstances should self-service registration permit setting `role: 'admin'`.
- **Project Membership**: In Documan's architecture, projects are created and owned by individual users ([`project.model.ts:94-99`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project.model.ts#L94-L99)).
- A newly registered user will initially own **0 projects**.
- They can navigate to `/projects` and create their own project, becoming its `ownerId`.
- No modifications to project permissions or ACL schemas are required.

---

## 10. Proposed API Contract

Two architectural approaches exist for exposing signup on the API:

### Option A: Dedicated Auth Route (Recommended for Single-Step UX)

`POST /api/v1/auth/register`

- **Rate Limit**: `signupRateLimiter` (5 requests / 15 minutes per IP)
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Validation**:
  - `name`: string, min 2, max 100, trimmed
  - `email`: valid email string, trimmed, transformed to lowercase
  - `password`: string, min 8, max 100
- **Successful Response (201 Created)**:
  Sets `documan_refresh_token` httpOnly cookie.
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "60f71f77bcf86cd799439011",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "user",
        "isActive": true
      }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }`
  - `409 Conflict`: `{ "success": false, "error": { "code": "USER_ALREADY_EXISTS", "message": "User with this email already exists" } }`

### Option B: Reuse Existing User Route

`POST /api/v1/users`

- Existing route accepts `{ name, email, password }` and returns 201 Created with sanitized `UserResponse`.
- Frontend performs registration via `POST /api/v1/users`, followed by automatic login via `POST /api/v1/auth/login`.

---

## 11. Proposed Frontend Flow

1. **Route & Component**: Add public lazy-loaded `/signup` route rendering `SignupPage.tsx`.
2. **Form Layout**:
   - Name input (`id="name"`, `type="text"`)
   - Email input (`id="email"`, `type="email"`)
   - Password input (`id="password"`, `type="password"`)
   - Confirm Password input (`id="confirmPassword"`, `type="password"`)
   - Submit Button ("Create Account")
   - Text Link to Login Page ("Already have an account? Log in")
3. **Validation & State**:
   - Client-side validation for empty fields and matching `password === confirmPassword`.
   - Displays inline error if passwords do not match prior to network submission.
   - Displays server error banner if API returns 409 (`USER_ALREADY_EXISTS`) or 400.
4. **Post-Registration Action**:
   - Executes auto-login and redirects client to `targetUrl` (utilizing `returnUrl` open-redirect protection logic).

---

## 12. Required Tests

Implementation must include full automated test coverage:

- **API Tests**:
  1. `POST /api/v1/auth/register` (or `POST /api/v1/users`) creates new user with `role: 'user'` and default `isActive: true`.
  2. Rejects request with duplicate email address (returns HTTP 409).
  3. Rejects request with invalid email format or password under 8 characters (returns HTTP 400).
  4. Ensures password is correctly hashed in database.
  5. Rate limiter rejects excessive registration attempts.

- **Web Frontend Tests**:
  1. `SignupPage.test.tsx` renders all form inputs, labels, and action buttons.
  2. Shows client-side validation error when `confirmPassword` does not match `password`.
  3. Displays API error message when registration fails (e.g., duplicate email).
  4. Successfully submits valid registration form, executes session creation, and navigates to target URL.
  5. Preserves and sanitizes `returnUrl` query parameters.

---

## 13. Required Files/Modules

The following files would be touched or created during implementation:

### API Package (`apps/api`)

- `apps/api/src/modules/users/user.controller.ts` (Add `try/catch(next)` error wrapping to `createUserController` if using `/users`)
- `apps/api/src/modules/auth/auth.routes.ts` & `auth.controller.ts` & `auth.service.ts` (If adding dedicated `POST /api/v1/auth/register` route)
- `apps/api/src/middleware/rate-limit.middleware.ts` (Add `signupRateLimiter`)

### Web Package (`apps/web`)

- `apps/web/src/features/auth/auth.types.ts` (Add `RegisterRequest` interface)
- `apps/web/src/features/auth/auth.api.ts` (Add `register()` API caller)
- `apps/web/src/features/auth/auth.store.ts` (Add `signup()` store action)
- `apps/web/src/pages/SignupPage.tsx` (**NEW** page component)
- `apps/web/src/pages/LoginPage.tsx` (Add link to `/signup`)
- `apps/web/src/App.tsx` (Register `/signup` route)

---

## 14. Risks

- **Spam Account Creation**: Unrestricted registration endpoints may be targeted by automated bots.
  - _Mitigation_: Implement strict rate limiting (`signupRateLimiter`) on the signup endpoint.
- **Privilege Escalation**: Malicious payload trying to inject `role: 'admin'`.
  - _Mitigation_: Service hardcodes `role: 'user'` or Zod schema strips unpermitted fields.

---

## 15. Out of Scope

The following features are explicitly **OUT OF SCOPE** for this self-service signup enhancement:

- Social Login / OAuth (Google, GitHub, Microsoft)
- Single Sign-On (SSO / SAML / OIDC)
- Multi-Factor Authentication (MFA / 2FA)
- Email verification via SMTP token dispatch
- Self-service password reset via email link
- Organization / Multi-tenant workspace invitations

---

## 16. Implementation Scope Recommendation

Implementation should follow a focused, two-part strategy:

1. **API Enhancement**: Add `signupRateLimiter` and implement `POST /api/v1/auth/register` (or fix error handling on `POST /api/v1/users`).
2. **Frontend Component**: Build `SignupPage.tsx`, wire `auth.store.ts` action, and add link on `LoginPage.tsx`.

---

## 17. Explicit Post-Completion Classification

```
==================================================
POST-COMPLETION ENHANCEMENT
==================================================
```

This research document confirms that the proposed self-service user registration functionality is a focused post-completion usability enhancement.

**This work does NOT create Phase 33.**
Documan Phase 32 remains the final planned product phase of the 32-phase roadmap.
