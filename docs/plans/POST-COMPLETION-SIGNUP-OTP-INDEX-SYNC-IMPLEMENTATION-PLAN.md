# Documan — Signup OTP Index Synchronization Implementation Plan

**Date:** 2026-09-16  
**Status:** PLAN COMPLETE (READ-ONLY)  
**Repository Source of Truth:** `c:\MERN_STACK\Documan\documan`  
**Authoritative Research:** `docs/research/POST-COMPLETION-SIGNUP-OTP-INDEX-SYNC-RESEARCH.md`  
**Target Capability:** Fix `SignupOtp` model registration omission in database index synchronization  

---

## 1. Objective

Create a minimal, authoritative implementation plan to fix the confirmed `SignupOtp` model registration omission in `apps/api/src/scripts/sync-indexes.ts`.

This is a **Post-Completion Maintenance / Security Hardening** task. Phases 1–32 remain complete.

---

## 2. Authoritative Research

This implementation plan is directly based on the research findings documented in:
[POST-COMPLETION-SIGNUP-OTP-INDEX-SYNC-RESEARCH.md](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-SIGNUP-OTP-INDEX-SYNC-RESEARCH.md)

---

## 3. Confirmed Finding

- **Issue:** `apps/api/src/scripts/sync-indexes.ts` statically imports 27 Mongoose model files to register them before executing `mongoose.modelNames()`. `signup-otp.model.ts` was omitted when Signup OTP verification was implemented.
- **Production Impact:** Because production uses `autoIndex: false` (`apps/api/src/config/database.ts`), running `pnpm --filter @documan/api db:index` in production syncs indexes for 27 registered models but skips `SignupOtp`, preventing automatic creation of the `expiresAt` TTL index and `email` unique index in MongoDB.

---

## 4. Current Index Synchronization Flow

```
pnpm --filter @documan/api db:index
  ↓
apps/api/package.json ("db:index": "node --env-file=.env --import tsx/esm src/scripts/sync-indexes.ts")
  ↓
apps/api/src/scripts/sync-indexes.ts (executes standalone)
  ↓
Evaluates static model side-effect imports (lines 6-32)
  ↓
connectDatabase()
  ↓
mongoose.modelNames()  ==> ["User", "Document", ..., "RefreshToken", "DocumentShare"]
  ↓
Iterates and executes model.syncIndexes() on registered models
  ↓
[SignupOtp omitted from loop because signup-otp.model.ts is not statically imported]
```

---

## 5. Exact Fix

Add exactly one import line to `apps/api/src/scripts/sync-indexes.ts`:

```typescript
import "../modules/auth/signup-otp.model.js";
```

### Exact Target Location
In `apps/api/src/scripts/sync-indexes.ts`, place the import adjacent to `import "../modules/auth/refresh-token.model.js";` (around line 31-32):

```typescript
import "../modules/change-packages/change-package.model.js";
import "../modules/change-packages/change-package-attestation.model.js";
import "../modules/auth/refresh-token.model.js";
import "../modules/auth/signup-otp.model.js";
import "../modules/document-shares/document-share.model.js";
```

---

## 6. Scope

### Modified Source Files (1 file)
- `apps/api/src/scripts/sync-indexes.ts`

### Unmodified Files
- Zero application logic files (`auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`) changed.
- Zero schema or model files (`signup-otp.model.ts`, `user.model.ts`) changed.
- Zero configuration or package files changed.

---

## 7. Test Impact

- **Unit Tests Required:** **NONE**
- **Rationale:** The existing OTP unit and integration tests (`apps/api/src/utils/otp.test.ts`, `apps/api/src/modules/auth/auth.routes.test.ts`, `apps/api/src/modules/auth/auth.service.test.ts`) already provide 100% passing coverage for OTP generation, hashing, verification, 10-minute expiration, 5-attempt limit, 60s cooldown, 3 resends/hr limit, and authentication integration.
- Adding tests for a CLI import side-effect is unnecessary and would add redundant test code.

---

## 8. Verification Plan

Upon future implementation authorization, run the full 5-part automated verification suite:

1. `pnpm typecheck` — Confirm 0 TypeScript compilation errors.
2. `pnpm lint` — Confirm 0 ESLint errors.
3. `pnpm test` — Confirm 102 test files / 795 tests pass.
4. `pnpm build` — Confirm `@documan/api` and `web` production builds compile cleanly.
5. `git diff --check` — Confirm 0 whitespace or formatting errors.

### Diff Inspection
Verify `git diff` contains ONLY the single added import line in `apps/api/src/scripts/sync-indexes.ts`.

---

## 9. Git Workflow

When authorized for execution:

1. Create a dedicated feature branch from `main`:
   ```bash
   git switch -c feature/signup-otp-index-sync
   ```
2. Apply the single import line to `apps/api/src/scripts/sync-indexes.ts`.
3. Run verification suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `git diff --check`).
4. Stage ONLY `apps/api/src/scripts/sync-indexes.ts` and documentation artifacts.
5. Create feature commit: `fix(auth): add signup-otp model import to sync-indexes script`.
6. Switch to `main` and merge via non-fast-forward merge (`git merge --no-ff feature/signup-otp-index-sync`).
7. Push to `origin/main` and clean up feature branch.

---

## 10. Acceptance Criteria

- [ ] `apps/api/src/scripts/sync-indexes.ts` includes `import "../modules/auth/signup-otp.model.js";`.
- [ ] `pnpm typecheck` passes with 0 errors.
- [ ] `pnpm lint` passes with 0 errors.
- [ ] `pnpm test` passes 102 test files / 795 tests.
- [ ] `pnpm build` completes cleanly.
- [ ] `git diff --check` passes with 0 errors.
- [ ] `pnpm --filter @documan/api db:index` discovers 28 models (including `SignupOtp`).
