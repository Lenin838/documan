# Documan — Signup OTP Index Synchronization Research

**Date:** 2026-09-16  
**Status:** RESEARCH COMPLETE (READ-ONLY)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Target File:** `apps/api/src/scripts/sync-indexes.ts`  

---

## 1. Finding

During the Post-Completion Production Deployment Readiness Re-Audit, a Medium Priority (P2) production prerequisite finding was identified:

> **Finding P2:** `SignupOtp` model import is missing from `apps/api/src/scripts/sync-indexes.ts`. As a consequence, executing `pnpm --filter @documan/api db:index` in production (`autoIndex: false`) syncs indexes for 27 registered models but skips `SignupOtp`, leaving the `signup_otps` TTL index (`expiresAt: 1`) and `email` unique index uncreated in MongoDB.

---

## 2. Current Index Synchronization Architecture

In production (`NODE_ENV=production`), Documan explicitly disables Mongoose automatic index creation (`autoIndex: false` in `apps/api/src/config/database.ts`) to prevent performance degradation or index build locks during application startup.

Production index creation relies on a dedicated pre-flight deployment script:
- Script location: `apps/api/src/scripts/sync-indexes.ts`
- Package script: `pnpm --filter @documan/api db:index`

When executed:
1. `syncDatabaseIndexes()` connects to MongoDB via `connectDatabase()`.
2. Mongoose retrieves registered model names via `mongoose.modelNames()`.
3. Iterates over registered models and calls `model.syncIndexes()`.
4. Disconnects cleanly via `disconnectDatabase()`.

To ensure models are registered with Mongoose before `mongoose.modelNames()` is called, `sync-indexes.ts` uses static side-effect imports at the top of the file (lines 6–32).

---

## 3. SignupOtp Model Analysis

The `SignupOtp` model (`apps/api/src/modules/auth/signup-otp.model.ts`) defines two database indexes:
1. **Unique Email Index:** `email: { type: String, required: true, unique: true }`
2. **TTL Expiration Index:** `signupOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });`

- **Collection:** `signup_otps`
- **Mongoose Registration:** `export const SignupOtp = model<SignupOtpDocument>("SignupOtp", signupOtpSchema);`
- **API Runtime Loading:** Loaded during application startup when `auth.service.ts` imports `signup-otp.model.ts`.

---

## 4. db:index Execution Flow

Trace of `pnpm --filter @documan/api db:index`:

```
pnpm --filter @documan/api db:index
  ↓
apps/api/package.json ("db:index": "node --env-file=.env --import tsx/esm src/scripts/sync-indexes.ts")
  ↓
apps/api/src/scripts/sync-indexes.ts
  ↓
Import 27 model files (lines 6-32)
  ↓
connectDatabase()
  ↓
mongoose.modelNames()  ==> ["User", "Document", ..., "RefreshToken", "DocumentShare"] (27 models)
  ↓
Loop model.syncIndexes() on 27 models
  ↓
[SignupOtp omitted because signup-otp.model.ts was NOT imported]
```

Executing `pnpm --filter @documan/api db:index` prints:
`Registered Mongoose models count: 27`
`SignupOtp` is absent from `mongoose.modelNames()`.

---

## 5. Model Registration Analysis

Mongoose models are registered in Mongoose's internal global registry (`mongoose.models`) when their schema definition file (`model.ts`) is evaluated by the JavaScript runtime.

Because `sync-indexes.ts` is executed standalone without booting the full Express server application (`app.ts` / `server.ts`), only modules explicitly imported by `sync-indexes.ts` (or transitively imported by those modules) are evaluated.

None of the existing 27 model files import `signup-otp.model.ts`. Therefore, without an explicit import in `sync-indexes.ts`, `SignupOtp` is never evaluated, registered, or returned by `mongoose.modelNames()`.

---

## 6. Existing Repository Pattern

Inspecting `apps/api/src/scripts/sync-indexes.ts` reveals a clear, established repository pattern:

```typescript
// Import all models to ensure schemas are registered with Mongoose
import "../modules/users/user.model.js";
import "../modules/documents/document.model.js";
import "../modules/documents/document-version.model.js";
...
import "../modules/auth/refresh-token.model.js";
import "../modules/document-shares/document-share.model.js";
```

Notice line 31: `import "../modules/auth/refresh-token.model.js";`.
Authentication models are explicitly imported side-by-side in `sync-indexes.ts`. When `signup-otp.model.ts` was implemented, it followed the standard model creation pattern but was omitted from the `sync-indexes.ts` import manifest.

---

## 7. Minimum Required Fix

The minimum, cleanest fix adhering to existing architecture is:

**Option A: Add explicit `SignupOtp` import to `apps/api/src/scripts/sync-indexes.ts`**

Exact import statement:
```typescript
import "../modules/auth/signup-otp.model.js";
```

Location in `apps/api/src/scripts/sync-indexes.ts`:
Line 32 (adjacent to `import "../modules/auth/refresh-token.model.js";`).

---

## 8. Security & Operational Impact

### 1. Security Analysis (Application vs Database Expiration)
- **Application Authority:** `apps/api/src/modules/auth/auth.service.ts` explicitly validates OTP expiration in application code:
  ```typescript
  if (otpRecord.expiresAt < new Date()) {
    throw new AppError("Verification code has expired. Please request a new code.", 400, "OTP_EXPIRED");
  }
  ```
- **Security Guarantee:** Expired OTPs can NEVER be verified by users, even if the OTP document remains in MongoDB. Application logic is authoritative.

### 2. Operational Impact (MongoDB TTL Purging)
- **TTL Document Cleanup:** The MongoDB TTL index (`expireAfterSeconds: 0` on `expiresAt`) causes MongoDB's background thread to physically purge expired documents from the `signup_otps` collection.
- **Impact of Missing Index:** Without the TTL index, unverified or abandoned OTP documents remain in the `signup_otps` collection indefinitely, causing unneeded collection growth over time.
- **Unique Constraint:** The `email` unique index on `signup_otps` ensures database-level uniqueness per email address.

---

## 9. Test Impact

- `sync-indexes.ts` is a CLI pre-flight script.
- Existing unit tests for `SignupOtp` (`apps/api/src/utils/otp.test.ts`, `apps/api/src/modules/auth/auth.routes.test.ts`, `apps/api/src/modules/auth/auth.service.test.ts`) already verify OTP creation, hashing, verification, expiration, and resend limits.
- No unit test changes are required for index sync research.

---

## 10. Exact Implementation Scope

Upon future authorization to implement this fix, the exact scope is:

### Modified File (1 file)
- `apps/api/src/scripts/sync-indexes.ts`

### Diff Preview
```diff
 import "../modules/change-packages/change-package-attestation.model.js";
 import "../modules/auth/refresh-token.model.js";
+import "../modules/auth/signup-otp.model.js";
 import "../modules/document-shares/document-share.model.js";
```

---

## 11. Recommendation

1. **Authorize Implementation:** Authorize adding `import "../modules/auth/signup-otp.model.js";` to `apps/api/src/scripts/sync-indexes.ts`.
2. **Post-Fix Verification:** Run `pnpm --filter @documan/api db:index` and verify model count increases from 27 to 28, confirming `"SignupOtp"` is included in `Registered Mongoose models`.
