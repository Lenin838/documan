# POST-COMPLETION ADMINISTRATION & USER MANAGEMENT DESIGN RESEARCH

**Domain:** 20 — Administration & User Management  
**Repository:** Documan (`apps/api`, `apps/web`)  
**Status:** Complete Repository Analysis & Stitch Design Foundation  
**Deliverable File:** `docs/research/POST-COMPLETION-ADMINISTRATION-USER-MANAGEMENT-DESIGN-RESEARCH.md`

---

## 1. AUTHORITATIVE IMPLEMENTATION LOCATION

### A. Authoritative Source Files & Component Tree

#### Backend (`apps/api/src/modules/users/` & `apps/api/src/modules/auth/`)
- **User Model & Schema:**
  - Model: [`user.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.model.ts)
  - Zod Schemas: [`user.schema.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.schema.ts)
- **User Management Service & Controller:**
  - Service: [`user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts)
  - Controller: [`user.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.controller.ts)
  - Routes: [`user.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.routes.ts)
- **Authentication & Authorization Middleware:**
  - Authorization Middleware: [`authorization.middleware.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/authorization.middleware.ts) (`requireRole('admin')`)
  - Authentication Middleware: [`auth.middleware.js`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/middleware/auth.middleware.ts) (`authenticate`)
  - Auth Routes: [`auth.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.routes.ts) (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`)

#### Frontend (`apps/web/src/pages/` & `apps/web/src/features/users/`)
- **User Management Pages:**
  - Users Directory Page: [`UsersPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/UsersPage.tsx) (Route: `/users`)
  - User Details Page: [`UserDetailsPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/UserDetailsPage.tsx) (Route: `/users/:id`)
  - Edit User Page: [`EditUserPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/EditUserPage.tsx) (Route: `/users/:id/edit`)
- **App Layout & Routing:**
  - Route Config: [`App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx) (Protected by `<ProtectedRoute allowedRoles={["admin"]} />`)
  - Navigation Link: [`AppLayout.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/layout/AppLayout.tsx) (Renders "Manage Users" link for `role === 'admin'`)
- **API Client & Type Definitions:**
  - API Client: [`user.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/users/user.api.ts)
  - TypeScript Types: [`user.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/users/user.types.ts)

---

## 2. USER DATA MODEL & SCHEMA

The authoritative Mongoose schema (`userSchema` in `user.model.ts`) defines the exact persistent fields:

```typescript
export interface UserDocument {
  name: string;          // Required, String, Trimmed (min 2, max 100)
  email: string;         // Required, String, Unique, Lowercase, Trimmed
  passwordHash: string;  // Required, String (bcrypt hash, salt rounds = 12)
  role: 'user' | 'admin';// String, Enum, Default: 'user'
  isActive: boolean;     // Boolean, Default: true
  isDeleted: boolean;    // Boolean, Default: false
  createdAt: Date;       // Date timestamp
  updatedAt: Date;       // Date timestamp
}
```

### Security & Privacy Field Constraints
- **`passwordHash`:** Excluded from all query responses via explicit projection (`.select('name email role isActive isDeleted createdAt updatedAt')`). It is **NEVER** exposed to the frontend or API DTOs.
- **`isDeleted`:** Used for soft deletion. Soft-deleted users (`isDeleted: true`) are filtered out of all normal queries.

---

## 3. EXACT ROLE VOCABULARY & AUTHORIZATION

Documan implements an explicit 2-tier global role hierarchy:

```typescript
export type UserRole = 'user' | 'admin';
```

1. **`user` (Standard Access):** Standard system access. Can create documents, view accessible projects, participate in governance workflows, and manage own profile (`PATCH /api/v1/users/me`).
2. **`admin` (System Governance & Administration):** Global system administration access. Enforced by backend middleware `requireRole('admin')`. Can access `/users` management endpoints, list all accounts, modify user names/emails/roles, activate/deactivate accounts, and soft-delete users.

### Project Owner vs. Global Admin
- **Project Owner:** A contextual project-level ownership rule (`project.ownerId === userId` or `isOwner: true`). Grants management rights within that specific project.
- **Global Admin:** Global role stored in `user.role === 'admin'`. Bypasses project ACL checks (`checkUserProjectReadAccess` returns `true` for admins). Only Global Admins can access Domain 20 User Management routes (`/users`).

---

## 4. ADMIN AUTHORITY & SELF-PROTECTION RULES

Backend service logic (`user.service.ts`) enforces strict administrative rules:

### A. Allowed Admin Operations
- **List Users (`GET /api/v1/users`):** Query with pagination, role filter, status filter, and search.
- **Get User Profile (`GET /api/v1/users/:id`):** Fetch any active user details.
- **Update User (`PATCH /api/v1/users/:id`):** Modify name, email, or role (`'user'` $\leftrightarrow$ `'admin'`).
- **Update Status (`PATCH /api/v1/users/:id/status`):** Toggle `isActive` (`true` / `false`).
- **Delete User (`DELETE /api/v1/users/:id`):** Soft-delete user (`isDeleted: true`, `isActive: false`).

### B. Admin Self-Protection Rules
To prevent administrative lockouts, the backend throws explicit errors on self-modification:
- **Self-Role / Email Modification:** `currentAdminId === userId` throws `SELF_MODIFICATION_NOT_ALLOWED` (400: *"You cannot modify your own admin account"*).
- **Self-Deactivation:** Modifying own `isActive` status throws `SELF_MODIFICATION_NOT_ALLOWED`.
- **Self-Deletion:** Deleting own account throws `SELF_DELETION_NOT_ALLOWED` (400: *"You cannot delete your own admin account"*).

---

## 5. USER CREATION & SELF-SERVICE SIGNUP BOUNDARY

The repository distinguishes two user creation pathways:

1. **Self-Service Signup (`POST /api/v1/auth/register`):** Public registration endpoint. Accepts `name`, `email`, `password`. Automatically assigns default role `'user'`, creates account with `isActive: true`, and emits initial JWT session tokens.
2. **Admin User Creation (`POST /api/v1/users`):** Internal/Admin user creation service (`createUser`). Hashes password using bcrypt (12 rounds) and creates active user record with default role `'user'`.

> [!IMPORTANT]
> **No Approval Queues or Invites:** Self-service signup creates immediate active accounts. There are **NO** email verification workflows, invite tokens, approval queues, or identity verification steps in the codebase.

---

## 6. CREDENTIAL & SESSION MANAGEMENT

- **Password Hashing:** `bcrypt.hash(password, 12)`.
- **Password Change (`PATCH /api/v1/users/me/password`):** Requires `currentPassword` and `newPassword`. Automatically revokes all active refresh tokens in `RefreshToken` collection.
- **Session Revocation on Status Change:** When an admin deactivates (`isActive = false`) or deletes a user, the service automatically executes:
  `RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } })`
- **Excluded Auth Capabilities:** No Multi-Factor Authentication (MFA), OAuth2/SSO, Passkeys, or SAML exist in the codebase.

---

## 7. USER DELETION & RESTORATION BOUNDARY

- **Deletion Behavior:** Soft-delete (`isDeleted: true`, `isActive: false`). Revokes active refresh tokens.
- **User Restoration:**
  > Repository evidence is insufficient to establish user restoration capability.
  
  Soft-deleted users (`isDeleted: true`) are filtered out of all queries (`User.find({ isDeleted: false })`). No restore API endpoint or UI button exists.

---

## 8. FRONTEND UI ARCHITECTURE

Admin User Management is structured into three dedicated page routes protected by `<ProtectedRoute allowedRoles={["admin"]} />`:

```
[AppLayout: Navigation Bar ("Manage Users" link visible if role === 'admin')]

  ├── 1. Users Directory Page (UsersPage.tsx - /users)
  │     ├── Header & Breadcrumb ("Users")
  │     ├── Filter Bar: Search Input (name/email), Role Select (All/User/Admin), Status Select (All/Active/Inactive)
  │     ├── Users Data Table (<Table> primitive with overflow-x-auto container)
  │     │     └── Columns: Name | Email | Role Badge | Status Badge | Created Date | Actions (View / Edit)
  │     ├── Empty State Card (<EmptyState> if no users match filters)
  │     └── Pagination Bar (Previous / Next controls + "Page X of Y")
  │
  ├── 2. User Account Profile Page (UserDetailsPage.tsx - /users/:id)
  │     ├── User Profile Header (Avatar initials, Name, Role badge, Status badge)
  │     ├── Action Bar: Back to Users | Edit User | Delete User (With window.confirm)
  │     ├── Account Status Toggle Button ("Deactivate Account" / "Activate Account")
  │     └── Details Card (Account ID, System Role, Created At, Last Updated)
  │
  └── 3. Edit User Privileges Page (EditUserPage.tsx - /users/:id/edit)
        ├── Edit Form: Full Name Input | Email Address Input | System Role Select (User / Admin)
        └── Form Controls: "Save User" (Primary) | "Cancel" (Secondary)
```

---

## 9. EXACT API SURFACE

| HTTP Method | Route Endpoint | Middleware / Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/users` | `validateBody` | Public / Admin user creation |
| `GET` | `/api/v1/users` | `authenticate`, `requireRole('admin')` | Query paginated user directory |
| `GET` | `/api/v1/users/me` | `authenticate` | Get current logged-in user profile |
| `PATCH` | `/api/v1/users/me` | `authenticate`, `validateBody` | Update current user name |
| `PATCH` | `/api/v1/users/me/password`| `authenticate`, `validateBody` | Change current user password |
| `GET` | `/api/v1/users/:id` | `authenticate`, `requireRole('admin')` | Get user details by ID |
| `PATCH` | `/api/v1/users/:id` | `authenticate`, `requireRole('admin')` | Admin update name, email, or role |
| `PATCH` | `/api/v1/users/:id/status` | `authenticate`, `requireRole('admin')` | Admin toggle account active status |
| `DELETE` | `/api/v1/users/:id` | `authenticate`, `requireRole('admin')` | Admin soft-delete user account |

---

## 10. ERROR HANDLING & API ERROR CODES

| Error Code | HTTP Status | Trigger Condition | Message Text |
| :--- | :--- | :--- | :--- |
| `USER_ALREADY_EXISTS` | 409 | Email collision on creation/update | *"User with this email already exists"* |
| `USER_NOT_FOUND` | 404 | Non-existent or soft-deleted ID | *"User not found"* |
| `SELF_MODIFICATION_NOT_ALLOWED` | 400 | Admin tries to change own role/status | *"You cannot modify your own admin account"* |
| `SELF_DELETION_NOT_ALLOWED` | 400 | Admin tries to delete own account | *"You cannot delete your own admin account"* |
| `INVALID_CURRENT_PASSWORD` | 401 | Wrong password in change password | *"Current password is incorrect"* |

---

## 11. DOMAIN BOUNDARIES (WHAT DOMAIN 20 IS NOT)

Domain 20 is strictly **Documan User Administration**. It is **NOT**:
- Enterprise IAM / IdP (Identity Provider).
- SSO / OAuth / SAML / OIDC server.
- Multi-Factor Authentication (MFA) or Passkey manager.
- SCIM provisioning server.
- HR workforce directory or organizational hierarchy manager.
- Audit log SIEM viewer (audit events write to `DocumentAudit`, but Domain 20 manages user identities).

---

## 12. AUTHORITY MAP

| Domain Feature | Authoritative Entity | Domain Owner |
| :--- | :--- | :--- |
| **User Identity & Roles** | `User` Model (`role: 'user' \| 'admin'`) | **Domain 20** |
| **Authentication & Tokens** | `RefreshToken` Model & JWT Middleware | Auth Module |
| **Project ACL & Ownership** | `Project.ownerId` & `checkUserProjectReadAccess` | Projects Module |
| **Document Access** | `DocumentShare` Model | Document Shares Module |

---

## 13. PROPOSED STITCH DESIGN ARCHITECTURE

The high-fidelity Stitch design for Domain 20 will be organized into seven canonical view screens:

1. **20.00 Administration Overview & KPI Cards** — Total users count, active users count, admin count, system role summary.
2. **20.01 User Directory Table (`UsersPage.tsx`)** — Filter bar (search, role, status), responsive table with role/status badges, action links, and pagination.
3. **20.02 User Account Details Profile (`UserDetailsPage.tsx`)** — User card with avatar, role badge, status badge, timestamps, and account status toggle.
4. **20.03 Edit User Privileges Form (`EditUserPage.tsx`)** — Form to update name, email address, and system role (`User` $\leftrightarrow$ `Admin`).
5. **20.04 Create User Modal / Screen** — User creation dialog with name, email, and password fields.
6. **20.05 Self-Modification Protection & Alert State** — Banner/alert explaining admin self-protection rules (`SELF_MODIFICATION_NOT_ALLOWED`).
7. **20.06 Delete User Confirmation Modal** — Confirmation dialog warning of account soft-deletion and token revocation.

---

## 14. ANTI-HALLUCINATION DESIGN RULES

When building the Stitch UI for Domain 20, designers must **NOT**:
- Invent unsupported roles (e.g. `EDITOR`, `VIEWER`, `AUDITOR`, `STEWARD`). Roles are strictly `User` and `Admin`.
- Add fake SSO, SAML, OAuth, or MFA buttons.
- Create user invite link generators or email verification status indicators.
- Display password hashes or JWT tokens.
- Add user restoration buttons.
- Invent complex organizational hierarchy trees or department fields.

---

## 15. FINAL RESEARCH ASSESSMENT

### A. Verified User Model
- `User` schema (`name`, `email`, `passwordHash`, `role`, `isActive`, `isDeleted`, `createdAt`, `updatedAt`).

### B. Verified Roles
- Exactly two roles: `'user'` and `'admin'`.

### C. Verified User Operations
- List, get by ID, update name/email/role, toggle active status, soft-delete.

### D. Verified Admin Authority
- Full access to `/users` API endpoints protected by `requireRole('admin')`.

### E. Verified Project Owner Authority
- Contextual project-level access (`ownerId`), distinct from global `admin` role.

### F. Verified Project Access / ACL
- Bypassed by global `admin` role; evaluated via `checkUserProjectReadAccess` for standard users.

### G. Verified Signup Relationship
- Self-service `POST /api/v1/auth/register` creates standard `isActive: true` user accounts with default role `'user'`.

### H. Verified Authentication Relationship
- Authenticated via JWT bearer tokens and `authenticate` middleware.

### I. Verified Frontend Routes
- `/users` (`UsersPage.tsx`), `/users/:id` (`UserDetailsPage.tsx`), `/users/:id/edit` (`EditUserPage.tsx`).

### J. Verified Frontend Components
- `UsersPage`, `UserDetailsPage`, `EditUserPage` mounted inside `AppLayout` wrapped in `<ProtectedRoute allowedRoles={["admin"]} />`.

### K. Verified API Surface
- 9 REST endpoints in `user.routes.ts`.

### L. Verified Search / Filter / Sort
- Filter by `search` (regex on name/email), `role`, `isActive`. Paginated with `page` and `limit`.

### M. Verified User Lifecycle
- Active $\to$ Deactivated ($\text{isActive} = \text{false}$) $\to$ Soft-deleted ($\text{isDeleted} = \text{true}$). Tokens revoked on status change.

### N. Verified Security / Privacy Constraints
- `passwordHash` hidden from API. Self-modification and self-deletion prohibited for admins.

### O. Verified Responsive Requirements
- Data tables wrapped in `overflow-x-auto`. Card grids use `grid-cols-1 sm:grid-cols-2`.

### P. Verified Accessibility Requirements
- Semantic `<Table>`, `<label>` associations, visible focus indicators (`focus:ring-2`).

### Q. Existing Shared UI Components
- `<Table>`, `<Button>`, `<Badge>`, `<Card>`, `<LoadingSpinner>`, `<EmptyState>`, `<Breadcrumb>`.

### R. Domain 20 Authority Map
- Manages user identities and global admin roles.

### S. Domain Boundaries
- User administration presentation and CRUD; not an enterprise IAM/SSO server.

### T. Recommended Stitch Architecture
- 7-part canonical layout (20.00 through 20.06).

### U. State Matrix
- Normal, loading, empty search, error, self-modification error, deactivation, deletion dialog.

### V. Open Questions
- None. Full repository implementation verified.

### W. Final Readiness Assessment
**READY FOR STITCH DESIGN**
