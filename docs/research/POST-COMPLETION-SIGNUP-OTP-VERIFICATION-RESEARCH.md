# Documan — Post-Completion Signup OTP Verification Research

**Date:** 2026-09-16  
**Status:** RESEARCH & DESIGN COMPLETE (READ-ONLY)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Target Feature:** Self-Service Signup Email OTP Verification Security Enhancement  

---

## 1. Existing Signup Architecture

The current self-service signup feature was implemented during Phase 32 / post-completion enhancements and is structured across `@documan/web` and `@documan/api` as follows:

### Frontend Implementation (`apps/web`)
- **Signup Page:** [`SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx)
- **State Store:** [`auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts) (`signup` action)
- **API Client:** [`auth.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.api.ts) (`register` function targeting `POST /auth/register`)
- **Types:** [`auth.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.types.ts) (`RegisterRequest`, `RegisterResponse`)
- **Current Client Flow:**
  1. User enters `name`, `email`, `password`, and `confirmPassword`.
  2. `handleSubmit` validates matching passwords and calls `signup({ name, email, password })`.
  3. On HTTP 201 response, `authStore` sets `accessToken`, `user`, and `isAuthenticated = true`.
  4. `SignupPage` detects `isAuthenticated` or executes `navigate(targetUrl, { replace: true })` immediately to `/dashboard` or `returnUrl`.

### Backend Implementation (`apps/api`)
- **Router:** [`auth.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.ts) (`POST /register` with `signupRateLimiter` and `validateBody(registerSchema)`)
- **Schema:** [`auth.schema.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.schema.ts) (`registerSchema` validating `name`, `email`, `password` min 8 chars)
- **Controller:** [`auth.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.controller.ts) (`registerController`)
- **Service Layer:** [`auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts) (`registerUser`)
- **User Service:** [`user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts) (`createUser`, bcrypt hashing with cost factor 12)
- **User Model:** [`user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts) (`User` schema)
- **JWT & Session Issuance:** `generateAccessToken` (15m expiration) and `generateRefreshToken` (32-byte hex hash stored in `RefreshToken` model, 7-day expiration). Attaches `documan_refresh_token` HTTP-only cookie (`path: "/api/v1/auth"`, `httpOnly: true`, `secure: production`).
- **Rate Limiting:** [`rate-limit.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/rate-limit.middleware.ts) (`signupRateLimiter`: 15 min window, 5 limit per IP).

### Architectural Security Gap Identified
In the current implementation, submitting the self-service signup form immediately creates a user record and issues a fully authenticated JWT access token and refresh cookie before verifying ownership of the provided email address.

---

## 2. Existing Email / OTP Capabilities

A comprehensive code inspection across the workspace revealed:
- **OTP Generation / Verification:** `0` existing OTP utilities, hashing modules, or verification models exist.
- **Email Delivery Dependencies:** `0` email libraries (e.g., `nodemailer`, `@sendgrid/mail`, `resend`, `aws-sdk`) are currently installed in [`apps/api/package.json`](file:///c:/MERN_STACK/Documan/documan/apps/api/package.json).
- **Email Templates:** `0` email template engines or HTML renderers exist in the project.
- **Conclusion:** Email delivery and OTP lifecycle management are net-new capabilities that must be designed cleanly using native Node.js `crypto` and a provider-agnostic `EmailService` interface.

---

## 3. Existing User Verification State

### Current User Schema Analysis
The current `User` model in [`user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts) contains:
```typescript
export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
Currently, **no email verification state** exists (`isEmailVerified` and `emailVerificationStatus` are absent).

### Minimum Required Schema Extension
To support verification without disrupting existing functionality, add a single boolean property to `userSchema`:
```typescript
isEmailVerified: {
  type: Boolean,
  default: false,
}
```
- **Existing Users & Admin-Created Users:** Admin-created users (`createUser` via admin panel) and existing database records will have `isEmailVerified: true` (or defaulted to `true`).
- **Self-Service Signups:** Explicitly initialized with `isEmailVerified: false`.

---

## 4. Security Requirements

The OTP verification design MUST fulfill the following strict product security criteria:

1. **Cryptographically Secure OTP Generation:** Generated using `crypto.randomInt(100000, 1000000)` to produce an unguessable 6-digit numeric string.
2. **Storage Hashing at Rest:** Plaintext OTPs MUST NEVER be stored in MongoDB. The token hash is computed via SHA-256 (`crypto.createHash('sha256').update(otp).digest('hex')`) before persistence.
3. **Session Decoupling:** `POST /api/v1/auth/register` MUST NOT issue JWT access tokens or HTTP-only refresh cookies while `isEmailVerified` is `false`.
4. **Short Expiration Window:** OTPs expire after exactly 10 minutes ($T_{exp} = 10\text{ minutes}$).
5. **Verification Attempt Bounding:** Maximum 5 failed verification attempts per OTP instance. Upon reaching 5 failures, the OTP is invalidated.
6. **Resend Rate Limiting:** Mandatory 60-second cooldown between resend dispatches; maximum 3 resend dispatches per email per hour.
7. **Previous OTP Revocation:** Generating a new OTP revokes and deletes any active OTP record for that email address.
8. **Log Non-Disclosure:** Raw OTP strings MUST NEVER be logged in application logs or Pino HTTP serializers.
9. **Zero Third-Party Identity Overhaul:** Excludes external IAM providers, OAuth, SAML, or heavy auth platforms.

---

## 5. OTP Parameter Recommendations

| Parameter | Recommended Value | Security & Operational Rationale |
| :--- | :--- | :--- |
| **OTP Length** | **6 digits** | Numeric 6-digit code ($1,000,000$ possible combinations). Provides optimal balance between user entry experience and brute-force resistance. |
| **OTP Expiration ($T_{exp}$)** | **10 minutes** | Minimizes the window of exposure while giving users sufficient time to locate email in spam/inbox folders. |
| **Max Failed Attempts** | **5 attempts** | Restricts brute-force probability to $5 / 1,000,000 = 0.0005\%$. Reaching 5 failures marks OTP expired. |
| **Resend Cooldown** | **60 seconds** | Prevents inbox flooding and protects outbound email rate limits. Enforced on both frontend (countdown UI) and backend. |
| **Hourly Resend Cap** | **3 requests / hour** | Bounds outbound email dispatch per email address to mitigate mail API exhaustion. |
| **Rate Limits** | **10 req / 15 min** | IP-level rate limiting on verify and resend endpoints. |

---

## 6. Signup State Model

### Comparison of Architectural Options

#### Option A: Immediate User Creation with `isEmailVerified: false` (RECOMMENDED)
- **Mechanism:** `POST /register` creates a standard `User` document with `isEmailVerified: false` and inserts a `SignupOtp` document.
- **Pros:** Reuses existing Mongoose `email` unique index, preventing duplicate account attempts. Integrates seamlessly with `User` query services.
- **Cons:** Unverified user documents exist in database.
- **Mitigation:** Unverified users are blocked at login (`EMAIL_NOT_VERIFIED`). Stale unverified signups older than 24 hours can be purged by an automated background TTL cleanup.

#### Option B: Temporary `PendingSignup` Collection
- **Mechanism:** Hold unverified user credentials in a separate `PendingSignup` collection until OTP verification succeeds, then copy to `User` collection.
- **Pros:** Keeps `User` collection strictly verified.
- **Cons:** Duplicates password hashing logic and email uniqueness constraints; introduces potential race conditions during final account creation.

**Conclusion:** **Option A** is selected as it fits Documan's current database architecture cleanly without introducing duplicated entity schemas.

---

## 7. API Design

The following three endpoints constitute the email OTP verification API surface, following Documan REST conventions:

### 1. `POST /api/v1/auth/register`
- **Auth:** Public
- **Rate Limit:** `signupRateLimiter` (5 req / 15 min per IP)
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Account created. Please verify your email with the 6-digit code sent to your inbox.",
      "email": "jane@example.com",
      "resendCooldown": 60
    }
  }
  ```
- **Cookies & Session Tokens:** **NONE.**

### 2. `POST /api/v1/auth/register/verify-otp`
- **Auth:** Public
- **Rate Limit:** `verifyOtpRateLimiter` (10 req / 15 min per IP)
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "otp": "482910"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGci...",
      "user": {
        "id": "607f1f77bcf86cd799439011",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "user",
        "isActive": true
      }
    }
  }
  ```
- **Cookies Set:** `documan_refresh_token` HTTP-only cookie (`path: "/api/v1/auth"`).

### 3. `POST /api/v1/auth/register/resend-otp`
- **Auth:** Public
- **Rate Limit:** `resendOtpRateLimiter` (3 req / 15 min per IP)
- **Request Body:**
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "A new verification code has been dispatched to your email address.",
      "resendCooldown": 60
    }
  }
  ```

---

## 8. Authentication / Session Flow

```
+------------------------------------------------------------------------------------+
| 1. Signup Form Submission (POST /api/v1/auth/register)                            |
|    ├── Creates User record with isEmailVerified = false                            |
|    ├── Generates 6-Digit OTP & stores SHA-256 Hash in SignupOtp collection         |
|    ├── Dispatches Email via EmailService                                           |
|    └── Returns 201 Created (ZERO Access Tokens, ZERO Refresh Cookies Issued)       |
+------------------------------------------------------------------------------------+
                                         │
                                         ▼
+------------------------------------------------------------------------------------+
| 2. Frontend SignupPage Transitions to Step 2: OTP Verification View                |
|    ├── Displays email address & 6-digit numeric input                              |
|    └── Starts 60s Resend Cooldown Timer                                            |
+------------------------------------------------------------------------------------+
                                         │
                                         ▼
+------------------------------------------------------------------------------------+
| 3. User Submits OTP (POST /api/v1/auth/register/verify-otp)                       |
|    ├── Verifies OTP Hash, Expiration (< 10m), and Attempt Count (< 5)              |
|    ├── Updates user.isEmailVerified = true                                         |
|    ├── Deletes SignupOtp document                                                  |
|    ├── Generates JWT Access Token + Sets HTTP-Only Refresh Token Cookie            |
|    └── Returns 200 OK with Auth User Payload                                       |
+------------------------------------------------------------------------------------+
                                         │
                                         ▼
+------------------------------------------------------------------------------------+
| 4. Frontend Updates authStore & Navigates to Dashboard / Safe returnUrl            |
+------------------------------------------------------------------------------------+
```

---

## 9. Resend OTP Design

- **Frontend Cooldown:** 60-second UI countdown timer disables the "Resend Code" button.
- **Backend Cooldown Enforcement:** Backend verifies `SignupOtp.lastSentAt`. If $< 60$ seconds have elapsed, returns HTTP 429 `RESEND_COOLDOWN_ACTIVE`.
- **Hourly Cap:** `SignupOtp.resendCount` tracked. If $> 3$ in 60 minutes, returns HTTP 429 `RESEND_LIMIT_EXCEEDED`.
- **Enumeration Protection:** If a resend request is submitted for a non-existent or already verified email, the API returns a standard success message without dispatching email.

---

## 10. Frontend UX

The OTP verification flow will be integrated inside [`SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx) using a multi-step state model (`step: "credentials" | "verify_otp"`):

- **Step 1 (Credentials Entry):** Standard Name, Email, Password, Confirm Password fields.
- **Step 2 (OTP Verification):**
  - **Header:** "Verify your email address"
  - **Subtitle:** "Enter the 6-digit code sent to **user@example.com**"
  - **OTP Input:** Monospace 6-digit code input (`tracking-[0.5em] text-center font-mono text-2xl`).
  - **Primary Action:** "Verify Email" button (`indigo-600` styling with `LoadingSpinner` state).
  - **Secondary Action:** "Resend Code" button (disabled during 60s cooldown, displaying `"Resend Code (42s)"`).
  - **Back Navigation:** "Use a different email address" link to return to Step 1.
  - **Error Alert:** Standard alert container displaying specific error feedback (`INVALID_OTP`, `OTP_EXPIRED`, `ATTEMPTS_EXCEEDED`).

---

## 11. ReturnUrl Preservation

- [`SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx) currently extracts `returnUrl` from query parameters (`const rawReturnUrl = searchParams.get("returnUrl")`).
- Evaluated via local URL safety check: `rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//') && rawReturnUrl !== '/login'`.
- Preserved in component state during transition from Step 1 to Step 2.
- Used upon successful OTP verification: `navigate(targetUrl, { replace: true })`.

---

## 12. Rate Limiting

Dedicated rate limiters added to [`rate-limit.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/rate-limit.middleware.ts):
- `signupRateLimiter`: 5 req / 15 min per IP on `POST /register`.
- `verifyOtpRateLimiter`: 10 req / 15 min per IP on `POST /register/verify-otp`.
- `resendOtpRateLimiter`: 3 req / 15 min per IP on `POST /register/resend-otp`.

---

## 13. Email Delivery

### Service Interface (`apps/api/src/utils/email.service.ts`)
```typescript
export interface IEmailService {
  sendVerificationOtp(to: string, name: string, otp: string): Promise<void>;
}
```

### Adapters
1. **Development & Test Adapter (`ConsoleEmailService`):** Outputs formatted OTP dispatches to Pino logger (`logger.info({ to, otp }, 'Development OTP Email Dispatched')`) for local developer testing and automated integration tests without external networks.
2. **Production Adapter (`SmtpEmailService`):** Uses `nodemailer` to dispatch SMTP emails (SendGrid, Mailgun, or AWS SES).

### Delivery Failure Policy
If email dispatch fails during signup, the transaction rolls back or deletes the pending user/OTP documents and returns HTTP 500 `EMAIL_DELIVERY_FAILED` with a user-friendly message.

---

## 14. Data Lifecycle

| Trigger / Scenario | Backend Action | User / UI Experience |
| :--- | :--- | :--- |
| **OTP Expired ($> 10\text{ min}$)** | Verification fails with 400 `OTP_EXPIRED`. | Banner error; prompt to click "Resend Code". |
| **Max Attempts Reached (5)** | `SignupOtp` marked `attemptsExceeded: true`. | Banner error; prompt to request a new OTP. |
| **Resend Requested** | New 6-digit OTP generated, old OTP deleted, email sent. | Old code invalidated immediately; new code sent. |
| **Email Delivery Fails** | Returns 500 `EMAIL_DELIVERY_FAILED`. | Friendly error message to retry or check email address. |
| **Duplicate Verified Email** | Rejects with 409 `EMAIL_ALREADY_EXISTS`. | User prompted to log in. |
| **Re-registration (Unverified)** | Updates password hash & generates new OTP. | Seamless restart of verification flow. |

---

## 15. Test Strategy

### Unit Tests
- `otp.utils.test.ts`: Verify 6-digit numeric generation and SHA-256 hashing.
- `signup-otp.model.test.ts`: Test Mongoose schema validations, indexing, and expiration.

### Integration Tests (`apps/api/src/modules/auth/auth.routes.test.ts`)
1. **Happy Path:** `POST /register` $\rightarrow$ verify `isEmailVerified: false` and no cookies $\rightarrow$ `POST /register/verify-otp` $\rightarrow$ verify `isEmailVerified: true` and session cookies issued.
2. **Invalid OTP:** Submit incorrect code $\rightarrow$ verify 400 `INVALID_OTP` and attempt count increment.
3. **Expired OTP:** Advance system clock past 10 minutes $\rightarrow$ verify 400 `OTP_EXPIRED`.
4. **Attempt Exceeded:** Submit 5 incorrect codes $\rightarrow$ verify 400 `ATTEMPTS_EXCEEDED`.
5. **Resend Cooldown:** Request resend within 60s $\rightarrow$ verify 429 `RESEND_COOLDOWN_ACTIVE`.
6. **Login Guard:** Attempt `/login` with unverified email $\rightarrow$ verify 403 `EMAIL_NOT_VERIFIED`.

---

## 16. Threat Model

| Threat | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **OTP Brute Force** | High | 6-digit search space ($10^6$) + Max 5 failed attempts per OTP + 10 req / 15 min IP rate limiter. |
| **OTP Replay** | High | `SignupOtp` document deleted immediately upon successful verification. |
| **SMS/Email Bombing** | Medium | 60-second cooldown timer + 3 resends per hour cap per email. |
| **Premature Session Access** | High | Zero tokens or cookies issued at registration. Tokens issued strictly after hash match. |
| **OTP Log Exposure** | High | Raw OTP excluded from Pino serializers; only SHA-256 hash stored. |
| **Account Enumeration** | Low | Resend and verify endpoints return consistent generic responses for unverified accounts. |

---

## 17. Backward Compatibility

- **Existing Database Users:** All existing user records have `isEmailVerified: true`.
- **Admin-Created Users:** Created via `/users` endpoint with `isEmailVerified: true`.
- **Login Behavior:** Normal login flow remains unchanged for verified users. Unverified self-service accounts receive 403 `EMAIL_NOT_VERIFIED`.

---

## 18. Implementation Scope

When authorized for future implementation, changes will be restricted to the following exact files:

### Backend (`apps/api`)
- [`apps/api/src/modules/users/user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts) (Add `isEmailVerified` boolean field)
- `apps/api/src/modules/auth/signup-otp.model.ts` [NEW]
- [`apps/api/src/modules/auth/auth.schema.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.schema.ts) (Add `verifyOtpSchema`, `resendOtpSchema`)
- [`apps/api/src/modules/auth/auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts) (Add `verifySignupOtp`, `resendSignupOtp`)
- [`apps/api/src/modules/auth/auth.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.controller.ts) (Add `verifyOtpController`, `resendOtpController`)
- [`apps/api/src/modules/auth/auth.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.ts) (Register endpoints)
- `apps/api/src/utils/email.service.ts` [NEW]

### Frontend (`apps/web`)
- [`apps/web/src/features/auth/auth.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.api.ts) (Add `verifyOtp`, `resendOtp` API functions)
- [`apps/web/src/features/auth/auth.store.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/auth/auth.store.ts) (Add `verifyOtp` store action)
- [`apps/web/src/pages/SignupPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/SignupPage.tsx) (Integrate Step 2 OTP verification UI)

### Tests & Documentation
- [`apps/api/src/modules/auth/auth.routes.test.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.test.ts) (Add OTP verification test suite)
- `docs/research/POST-COMPLETION-SIGNUP-OTP-VERIFICATION-RESEARCH.md` (This research document)

---

## 19. Production Configuration

```env
# Email Delivery & OTP Production Configuration
EMAIL_SERVICE_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_production_smtp_password
EMAIL_FROM=Documan Security <no-reply@documan.io>
OTP_EXPIRES_IN_MINUTES=10
```

---

## 20. Final Recommended Architecture

```
User Submits Signup Form (Name, Email, Password)
  │
  ▼
POST /api/v1/auth/register
  ├── 1. Validate Input (Zod schema)
  ├── 2. Create User Record (isEmailVerified = false)
  ├── 3. Generate Cryptographic 6-Digit OTP & Compute SHA-256 Hash
  ├── 4. Save SignupOtp Record (tokenHash, expiresAt)
  ├── 5. Dispatch Email via IEmailService
  └── 6. Return 201 Created (ZERO JWT Access Tokens, ZERO Refresh Cookies Issued)
  │
  ▼
Frontend SignupPage Renders Step 2: OTP Verification Screen (60s Countdown)
  │
  ▼
User Inputs 6-Digit OTP Code & Clicks "Verify Email"
  │
  ▼
POST /api/v1/auth/register/verify-otp
  ├── 1. Validate Input & Query SignupOtp Record by Email
  ├── 2. Verify Attempts < 5 & Lifetime < 10 Minutes
  ├── 3. Compare SHA-256 OTP Hash
  ├── 4. Update User (isEmailVerified = true)
  ├── 5. Delete SignupOtp Document
  ├── 6. Generate 15m JWT Access Token & Set HTTP-Only Refresh Token Cookie
  └── 7. Return 200 OK (accessToken, AuthUser)
  │
  ▼
Frontend Updates authStore & Navigates to Dashboard / Target returnUrl
```
