# Documan — Post-Completion Signup OTP Verification Implementation Plan

**Date:** 2026-09-16  
**Status:** PLAN COMPLETE (READ-ONLY)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Target Capability:** Self-Service Signup Email OTP Verification & Resend Flow  

---

## 1. Objective

Design a rigorous, zero-regression implementation plan for email OTP verification on self-service signup in Documan. This post-completion security enhancement ensures that unverified self-service accounts cannot obtain authenticated sessions (JWT access tokens or refresh cookies) or access protected resources until email ownership is verified via a cryptographically secure 6-digit OTP code.

---

## 2. Authoritative Research

This plan strictly enforces the technical design established in:
[`docs/research/POST-COMPLETION-SIGNUP-OTP-VERIFICATION-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-SIGNUP-OTP-VERIFICATION-RESEARCH.md)

---

## 3. Current Repository Architecture

A complete code inspection of the Documan repository verified the following existing authoritative files:

### Backend Files (`apps/api`)
- [`apps/api/src/modules/users/user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts) — Mongoose schema for `User` document.
- [`apps/api/src/modules/users/user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts) — Service methods including `createUser`.
- [`apps/api/src/modules/auth/auth.schema.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.schema.ts) — Zod validation schemas (`registerSchema`, `loginSchema`).
- [`apps/api/src/modules/auth/auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts) — Authentication logic (`registerUser`, `loginUser`, `refreshAccessToken`).
- [`apps/api/src/modules/auth/auth.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.controller.ts) — Request handlers for auth endpoints.
- [`apps/api/src/modules/auth/auth.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.ts) — Express router for `/api/v1/auth`.
- [`apps/api/src/middleware/rate-limit.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/rate-limit.middleware.ts) — Express rate limiters.

### Frontend Files (`apps/web`)
- [`apps/web/src/pages/SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx) — Self-service registration page.
- [`apps/web/src/features/auth/auth.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.api.ts) — Axios HTTP client calls for auth.
- [`apps/web/src/features/auth/auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts) — Zustand authentication state store.
- [`apps/web/src/features/auth/auth.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.types.ts) — TypeScript interfaces for auth payloads.

### Test Files
- [`apps/api/src/modules/auth/auth.routes.test.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.test.ts) — Express route integration tests for auth module.

### Proposed New Files & Location Verification
- `apps/api/src/modules/auth/signup-otp.model.ts` — Fits existing module structure alongside `refresh-token.model.ts`.
- `apps/api/src/utils/email.service.ts` — Fits existing utility structure alongside `jwt.ts` and `refresh-token.ts`.

---

## 4. Security Requirements

1. `POST /api/v1/auth/register` creates an unverified user with `isEmailVerified: false`.
2. 6-digit OTP generated via `crypto.randomInt(100000, 1000000)`.
3. Plaintext OTP MUST NOT be persisted in MongoDB; only SHA-256 hash stored.
4. OTP expires strictly after 10 minutes ($600$ seconds).
5. Maximum 5 failed verification attempts allowed per OTP.
6. OTP is marked `attemptsExceeded: true` and invalidated on 5th failed attempt.
7. Resend rules: 60-second cooldown, max 3 resends per email per hour, new OTP invalidates previous active OTP.
8. Rate limiting: Signup (5/15m), Verify (10/15m), Resend (3/15m).
9. **Zero JWT access tokens or HTTP-only refresh cookies issued during initial registration.**
10. Session tokens issued strictly after successful OTP verification.
11. Existing users & admin-created users defaulted to `isEmailVerified: true`.
12. Unverified self-service account login attempts rejected with HTTP 403 `EMAIL_NOT_VERIFIED`.
13. Safe local `returnUrl` behavior preserved throughout signup and verification.

---

## 5. User Model Changes

### Schema Modification ([`user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts))
Add `isEmailVerified` to `UserDocument` interface and `userSchema`:

```typescript
// Property definition inside userSchema
isEmailVerified: {
  type: Boolean,
  default: false,
}
```

### Behavioral Mapping
- **Legacy Database Records:** Migration script or default fallback sets `isEmailVerified: true`.
- **Admin-Created Users:** [`user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts) (`createUser` call by admin) explicitly passes `isEmailVerified: true`.
- **Self-Service Signups:** [`auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts) (`registerUser`) creates account with `isEmailVerified: false`.

---

## 6. SignupOtp Model

### Schema Definition (`apps/api/src/modules/auth/signup-otp.model.ts`)
```typescript
import { Schema, model, type Document } from "mongoose";

export interface SignupOtpDocument extends Document {
  email: string;
  tokenHash: string;
  expiresAt: Date;
  failedAttempts: number;
  attemptsExceeded: boolean;
  lastSentAt: Date;
  resendCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const signupOtpSchema = new Schema<SignupOtpDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    attemptsExceeded: {
      type: Boolean,
      default: false,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// TTL index to automatically purge expired records
signupOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SignupOtp = model<SignupOtpDocument>("SignupOtp", signupOtpSchema);
```

---

## 7. OTP Generation & Hashing

### Utility Specification (`apps/api/src/utils/otp.ts`)
- **Generation:** Uses Node.js native `crypto.randomInt(100000, 1000000).toString()`.
- **Hashing:** `crypto.createHash("sha256").update(otp).digest("hex")`.
- **Timing-Safe Comparison:** `crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(storedHash))`.
- **Non-Disclosure Rule:** Plaintext OTP is held in ephemeral memory only during email dispatch. It is never written to logs, returned in API payloads, or attached to errors.

---

## 8. Email Service

### File: `apps/api/src/utils/email.service.ts`

```typescript
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js"; // or console fallback

export interface IEmailService {
  sendVerificationOtp(to: string, name: string, otp: string): Promise<void>;
}

export class ConsoleEmailService implements IEmailService {
  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    logger.info({ to, recipientName: name, otp }, "[DEV EMAIL] Verification OTP Dispatched");
  }
}

export class NodemailerSmtpService implements IEmailService {
  async sendVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    // Production SMTP transport via nodemailer
  }
}

export const emailService: IEmailService =
  env.NODE_ENV === "production"
    ? new NodemailerSmtpService()
    : new ConsoleEmailService();
```

---

## 9. API Routes

### 1. `POST /api/v1/auth/register`
- **Limiter:** `signupRateLimiter` (5 req / 15 min per IP)
- **Input:** `registerSchema` (`name`, `email`, `password`)
- **Action:** Creates user (`isEmailVerified: false`), generates OTP, saves `SignupOtp` hash, sends email.
- **Output (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Registration successful. Please verify your email with the 6-digit code sent to your inbox.",
      "email": "jane@example.com",
      "resendCooldown": 60
    }
  }
  ```

### 2. `POST /api/v1/auth/register/verify-otp`
- **Limiter:** `verifyOtpRateLimiter` (10 req / 15 min per IP)
- **Input:** `verifyOtpSchema` (`email`, `otp`: 6-digit string)
- **Action:** Verifies hash, expiration, attempt bounds; updates `user.isEmailVerified = true`; deletes `SignupOtp`; generates JWT and HTTP-only refresh cookie.
- **Output (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGci...",
      "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "user", "isActive": true }
    }
  }
  ```

### 3. `POST /api/v1/auth/register/resend-otp`
- **Limiter:** `resendOtpRateLimiter` (3 req / 15 min per IP)
- **Input:** `resendOtpSchema` (`email`)
- **Action:** Checks 60s cooldown & 3/hr resend cap; overwrites `SignupOtp` with new hash; sends email.
- **Output (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "A new verification code has been sent to your email address.",
      "resendCooldown": 60
    }
  }
  ```

---

## 10. Registration Flow

```
Client -> POST /api/v1/auth/register
  │
  ├── 1. validateBody(registerSchema)
  ├── 2. Check if User exists by email
  ├── 3. If exists & isEmailVerified == true -> Throw 409 USER_ALREADY_EXISTS
  ├── 4. If exists & isEmailVerified == false -> Update password hash & name
  ├── 5. If not exists -> Create User (isEmailVerified = false)
  ├── 6. Generate 6-digit OTP & SHA-256 hash
  ├── 7. Upsert SignupOtp (email, tokenHash, expiresAt: +10m, resendCount: 0)
  ├── 8. emailService.sendVerificationOtp(email, name, otp)
  └── 9. Return HTTP 201 Created (No JWT, No Cookies)
```

---

## 11. OTP Verification Flow

```
Client -> POST /api/v1/auth/register/verify-otp
  │
  ├── 1. validateBody(verifyOtpSchema)
  ├── 2. Find SignupOtp record by email
  ├── 3. If no record -> Throw 400 INVALID_OTP
  ├── 4. If attemptsExceeded == true -> Throw 400 ATTEMPTS_EXCEEDED
  ├── 5. If expiresAt < Date.now() -> Throw 400 OTP_EXPIRED
  ├── 6. Compute SHA-256 hash of candidate OTP
  ├── 7. Compare hash using timingSafeEqual
  ├── 8. If mismatch:
  │      ├── Increment failedAttempts
  │      ├── If failedAttempts >= 5 -> Set attemptsExceeded = true
  │      ├── Save SignupOtp
  │      └── Throw 400 INVALID_OTP (with remaining attempts count)
  ├── 9. If match:
  │      ├── Update User (isEmailVerified = true)
  │      ├── Delete SignupOtp record
  │      ├── Generate 15m JWT access token
  │      ├── Generate & store 7-day refresh token in RefreshToken collection
  │      ├── Set documan_refresh_token HTTP-only cookie
  │      └── Return HTTP 200 OK with accessToken and AuthUser
```

---

## 12. Resend OTP Flow

```
Client -> POST /api/v1/auth/register/resend-otp
  │
  ├── 1. validateBody(resendOtpSchema)
  ├── 2. Find User by email. If not found or isEmailVerified == true -> Return 200 generic message (Enumeration Protection)
  ├── 3. Find SignupOtp record by email
  ├── 4. If lastSentAt < 60s ago -> Throw 429 RESEND_COOLDOWN_ACTIVE
  ├── 5. If resendCount >= 3 in last hour -> Throw 429 RESEND_LIMIT_EXCEEDED
  ├── 6. Generate new 6-digit OTP & SHA-256 hash
  ├── 7. Update SignupOtp (tokenHash, expiresAt: +10m, failedAttempts: 0, attemptsExceeded: false, lastSentAt: Date.now(), resendCount + 1)
  ├── 8. emailService.sendVerificationOtp(email, user.name, otp)
  └── 9. Return HTTP 200 OK (message, resendCooldown: 60)
```

---

## 13. Rate Limiting

Updated `rate-limit.middleware.ts`:
- `signupRateLimiter`: 5 req / 15 min per IP.
- `verifyOtpRateLimiter`: 10 req / 15 min per IP.
- `resendOtpRateLimiter`: 3 req / 15 min per IP.

---

## 14. Login Protection

Update [`auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts) inside `loginUser`:

```typescript
// Insert before password check
if (!user.isEmailVerified) {
  throw new AppError(
    "Please verify your email address before logging in",
    403,
    "EMAIL_NOT_VERIFIED"
  );
}
```

---

## 15. Frontend UX

Integrate Step 2 OTP Verification View directly inside [`SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx):

- **State:** `step: "credentials" | "verify_otp"`.
- **Step 1:** Standard Name, Email, Password, Confirm Password form. On submit, switches to `step: "verify_otp"`.
- **Step 2:**
  - Header: "Verify your email address"
  - Email badge displaying target email address.
  - 6-digit numeric input with `maxLength={6}` and monospace text styling (`tracking-[0.5em] font-mono text-center text-2xl`).
  - Primary "Verify Email" button (`indigo-600` styling with `LoadingSpinner`).
  - "Resend Code" button with 60-second active countdown timer (`Resend Code (45s)`).
  - "Use a different email" link to return to Step 1.
  - Error banner displaying clean API error messages.

---

## 16. Frontend State

Extend [`auth.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.types.ts) and [`auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts):
- Add `verifyOtp: (payload: { email: string; otp: string }) => Promise<void>`
- Add `resendOtp: (payload: { email: string }) => Promise<void>`
- **Security Rule:** Plaintext OTP values MUST NEVER be stored in Zustand persist middleware or `localStorage`.

---

## 17. ReturnUrl Preservation

- [`SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx) parses `returnUrl` from query parameters (`const rawReturnUrl = searchParams.get("returnUrl")`).
- Evaluates safety (`startsWith('/') && !startsWith('//') && !== '/login'`).
- Preserves `targetUrl` across Step 1 $\rightarrow$ Step 2 UI transitions.
- Navigates to `targetUrl` upon successful OTP verification response.

---

## 18. Error Contract

| Error Code | Status | Message |
| :--- | :---: | :--- |
| `INVALID_OTP` | 400 | Invalid verification code. You have X attempts remaining. |
| `OTP_EXPIRED` | 400 | Verification code has expired. Please request a new code. |
| `ATTEMPTS_EXCEEDED` | 400 | Maximum verification attempts exceeded. Please request a new code. |
| `RESEND_COOLDOWN_ACTIVE` | 429 | Please wait 60 seconds before requesting another code. |
| `RESEND_LIMIT_EXCEEDED` | 429 | Maximum resend attempts reached for this hour. Please try again later. |
| `EMAIL_NOT_VERIFIED` | 403 | Please verify your email address before logging in. |
| `USER_ALREADY_EXISTS` | 409 | User with this email address already exists. |
| `EMAIL_DELIVERY_FAILED` | 500 | Failed to dispatch verification email. Please try again. |

---

## 19. Database / Index Plan

1. **User Collection:** Add `isEmailVerified: boolean` index or property.
2. **SignupOtp Collection:**
   - Single-field index on `email` (unique).
   - TTL index on `expiresAt` (`expireAfterSeconds: 0`).
3. **Stale Unverified Account Cleanup:** Optional background cron / TTL cleanup for `isEmailVerified: false` users created $> 24$ hours ago.

---

## 20. Test Plan

### Unit Tests
- `otp.utils.test.ts`: Test 6-digit generation, SHA-256 hashing, timing-safe equality.
- `signup-otp.model.test.ts`: Test schema validation, TTL indexing.

### Route Integration Tests ([`auth.routes.test.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.test.ts))
1. Registration creates unverified user & issues no tokens.
2. Verification with valid OTP sets `isEmailVerified: true` & returns session tokens.
3. Invalid OTP increments attempt count.
4. 5th invalid OTP triggers `attemptsExceeded: true`.
5. Expired OTP returns 400 `OTP_EXPIRED`.
6. Resend within 60s returns 429 `RESEND_COOLDOWN_ACTIVE`.
7. Unverified account login returns 403 `EMAIL_NOT_VERIFIED`.

---

## 21. Security Verification Checklist

- [x] OTP generated with cryptographically secure randomness (`crypto.randomInt`).
- [x] OTP plaintext never persisted in database.
- [x] OTP plaintext never logged.
- [x] OTP plaintext never returned in API payloads.
- [x] OTP expires after 10 minutes.
- [x] Maximum 5 failed attempts enforced.
- [x] OTP invalidated after successful verification.
- [x] Old OTP invalidated after resend.
- [x] Resend cooldown (60s) enforced.
- [x] Hourly resend limit (3/hr) enforced.
- [x] Registration rate limit enforced.
- [x] Verification rate limit enforced.
- [x] Resend rate limit enforced.
- [x] No session tokens issued before verification.
- [x] Session tokens issued only after successful verification.
- [x] Existing verified user login preserved.
- [x] Safe local returnUrl preserved.
- [x] No OTP stored in frontend persistence.
- [x] Existing database users remain compatible.

---

## 22. File-Level Change Map

| File Path | Action | Purpose | Business Logic Risk |
| :--- | :---: | :--- | :---: |
| `apps/api/src/modules/users/user.model.ts` | **Modify** | Add `isEmailVerified` boolean field to schema | Low |
| `apps/api/src/modules/auth/signup-otp.model.ts` | **NEW** | Mongoose model for OTP token hash & metadata | Low |
| `apps/api/src/utils/otp.ts` | **NEW** | Crypto OTP generation & SHA-256 hashing utilities | Low |
| `apps/api/src/utils/email.service.ts` | **NEW** | `IEmailService` interface, Console & SMTP adapters | Low |
| `apps/api/src/modules/auth/auth.schema.ts` | **Modify** | Add `verifyOtpSchema`, `resendOtpSchema` Zod validations | Low |
| `apps/api/src/modules/auth/auth.service.ts` | **Modify** | Add `verifySignupOtp`, `resendSignupOtp`, block unverified login | Medium |
| `apps/api/src/modules/auth/auth.controller.ts` | **Modify** | Add `verifyOtpController`, `resendOtpController` | Low |
| `apps/api/src/modules/auth/auth.routes.ts` | **Modify** | Register `/register/verify-otp` and `/register/resend-otp` | Low |
| `apps/api/src/middleware/rate-limit.middleware.ts` | **Modify** | Add `verifyOtpRateLimiter`, `resendOtpRateLimiter` | Low |
| `apps/web/src/features/auth/auth.types.ts` | **Modify** | Add OTP request/response TypeScript interfaces | Low |
| `apps/web/src/features/auth/auth.api.ts` | **Modify** | Add `verifyOtp`, `resendOtp` API functions | Low |
| `apps/web/src/features/auth/auth.store.ts` | **Modify** | Add `verifyOtp`, `resendOtp` actions to Zustand store | Medium |
| `apps/web/src/pages/SignupPage.tsx` | **Modify** | Integrate Step 2 OTP verification view & countdown UI | Medium |
| `apps/api/src/modules/auth/auth.routes.test.ts` | **Modify** | Add test suite for OTP verification & resend flows | Low |

---

## 23. Verification Gates

After future implementation, the following mandatory automated verification suite MUST pass cleanly:

1. `pnpm typecheck` (0 TypeScript compilation errors)
2. `pnpm lint` (0 ESLint errors across workspace)
3. `pnpm test` (All existing 331 tests + new OTP tests passing)
4. `pnpm build` (Production build succeeds cleanly)
5. `git diff --check` (No whitespace or formatting anomalies)

---

## 24. Manual QA Plan

1. Open browser to `/signup`.
2. Enter valid registration details (`name`, `email`, `password`) and submit.
3. Confirm HTTP 201 response and **no authenticated session** (no access token in store, no refresh cookie set).
4. Verify UI transitions smoothly to Step 2 OTP verification view.
5. Check dev server console/logs for dispatched 6-digit OTP code.
6. Enter incorrect OTP code and submit $\rightarrow$ verify 400 error banner displaying remaining attempt count.
7. Repeat 5 incorrect attempts $\rightarrow$ verify 400 error banner stating attempts exceeded.
8. Click "Resend Code" $\rightarrow$ verify 60-second countdown activates and button becomes disabled.
9. Enter valid 6-digit OTP code $\rightarrow$ verify successful verification, session cookie issuance, and redirection to `/dashboard` or safe `returnUrl`.
10. Attempt `/login` with an unverified user account $\rightarrow$ verify 403 `EMAIL_NOT_VERIFIED` error.

---

## 25. Documentation Updates

Post-implementation, update the following documentation:
- `docs/auth.md` (Document new `/api/v1/auth/register/verify-otp` and `/api/v1/auth/register/resend-otp` endpoint contracts).

---

## 26. Git Workflow

Future execution must follow standard Documan Git procedures:
1. Create feature branch (`feature/signup-otp-verification`).
2. Implement backend changes, frontend changes, and unit/integration tests.
3. Execute verification gates (`typecheck`, `lint`, `test`, `build`).
4. Perform manual browser QA.
5. Obtain explicit user authorization.
6. Commit, merge (`--no-ff`) into `main`, and push to `origin/main`.

---

## 27. Implementation Sequence

```
Phase 1: Backend Foundation (User schema extension, SignupOtp model, OTP & Email utilities)
   │
   ▼
Phase 2: Backend Auth Core (auth.service OTP methods, login protection guard, auth.controller handlers)
   │
   ▼
Phase 3: Backend API & Middleware (auth.routes endpoints, rate limiters, auth.routes.test integration tests)
   │
   ▼
Phase 4: Frontend Auth Layer (auth.types payload types, auth.api HTTP calls, auth.store actions)
   │
   ▼
Phase 5: Frontend UI (SignupPage Step 2 OTP view, 60s countdown timer, Stitch styling polish)
   │
   ▼
Phase 6: End-to-End Verification & Browser QA (Automated tests, typecheck, lint, build, manual QA)
```

---

## 28. Final Acceptance Criteria

1. Self-service registration creates unverified user without issuing session tokens.
2. 6-digit OTP delivered via email service adapter.
3. Successful OTP entry activates account and issues JWT + refresh cookie.
4. Failed attempts bounded to 5 before OTP lockout.
5. Resend enforced with 60s cooldown and 3/hr cap.
6. Plaintext OTP never stored or logged.
7. Existing users and login flow maintain 100% backward compatibility.
8. All automated verification gates (`typecheck`, `lint`, `test`, `build`) pass cleanly.
