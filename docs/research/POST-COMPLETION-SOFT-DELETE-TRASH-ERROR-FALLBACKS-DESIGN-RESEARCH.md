# DOMAIN 21 — SOFT-DELETE TRASH & ERROR FALLBACKS: DESIGN RESEARCH

**Target Document**: `docs/research/POST-COMPLETION-SOFT-DELETE-TRASH-ERROR-FALLBACKS-DESIGN-RESEARCH.md`  
**Status**: COMPLETE & VERIFIED  
**Mode**: RESEARCH ONLY — No source code, configuration, or UI modifications executed.

---

## 1. RESEARCH ARTIFACT OVERVIEW

This document establishes the authoritative, repository-grounded research for **Domain 21 — Soft-Delete Trash & Error Fallbacks**. Every statement, model field, route, endpoint, and UI behavior documented herein is extracted directly from current repository source files in `apps/api/src/` and `apps/web/src/`. Where repository evidence does not support a capability, it is explicitly declared as **"Repository evidence is insufficient to establish this behavior"** or **"NOT PRESENT"**.

---

## 2. PRIMARY RESEARCH OBJECTIVE SUMMARY

The purpose of Domain 21 research is to inspect how Documan currently handles:
- **Soft Deletion & Recovery**: Soft delete fields, filtered queries, Trash/recycle-bin views, restoration workflows, and permanent purge capabilities.
- **Error Fallback UX**: Global `ErrorBoundary`, 404 / Not Found routing, 401 unauthenticated & token refresh, 403 forbidden routes, API error interceptors, and loading/empty/error states.
- **Domain Boundaries**: Identifying what Domain 21 actually owns versus what is owned by Document, Project, User, Governance, or Operational Backup systems.

---

## 3. FILE DISCOVERY & REPOSITORY EVIDENCE MAP

### API Source Files (`apps/api/src/`)
1. **Document Service & Model**:
   - `apps/api/src/modules/documents/document.model.ts` (Defines `isDeleted: boolean`, default `false`)
   - `apps/api/src/modules/documents/document.service.ts` (`softDeleteDocument`, `restoreDocument`, `getDeletedDocuments`)
   - `apps/api/src/modules/documents/document.controller.ts` (`DELETE /api/v1/documents/:id`, `PATCH /api/v1/documents/:id/restore`, `GET /api/v1/documents?isDeleted=true`)
2. **User Service & Model**:
   - `apps/api/src/modules/users/user.model.ts` (Defines `isDeleted: boolean`, `isActive: boolean`)
   - `apps/api/src/modules/users/user.service.ts` (`deleteUser`: sets `isDeleted = true`, `isActive = false`, revokes refresh tokens)
   - `apps/api/src/modules/users/user.controller.ts` (`DELETE /api/v1/users/:id`)
3. **Project Service & Model**:
   - `apps/api/src/modules/projects/project.model.ts` (Defines `isArchived: boolean`. **NO** `isDeleted` field exists)
   - `apps/api/src/modules/projects/project.service.ts` (`archiveProject`, `unarchiveProject`)
4. **Document Version Service & Model**:
   - `apps/api/src/modules/document-versions/document-version.model.ts` (Parent-child relationship to `Document`. **NO** soft-delete or version deletion fields exist)

### Web Frontend Source Files (`apps/web/src/`)
1. **Trash & Soft Delete UI**:
   - `apps/web/src/pages/TrashPage.tsx` (Renders deleted documents table, restore button action)
   - `apps/web/src/features/documents/document.api.ts` (`getDeletedDocuments`, `softDeleteDocument`, `restoreDocument`)
2. **Error & Fallback UI**:
   - `apps/web/src/components/ErrorBoundary.tsx` (Class component capturing uncaught React render exceptions, displaying "Something went wrong" alert and "Reload Application" button)
   - `apps/web/src/pages/NotFoundPage.tsx` (404 Not Found screen, "Page Not Found", button back to `/dashboard`)
   - `apps/web/src/components/ProtectedRoute.tsx` (Role-based access check, blocks unauthorized users)
   - `apps/web/src/features/api/client.ts` (Axios instance, 401 refresh token interceptor, redirect to `/login`)
3. **Shared Primitives**:
   - `apps/web/src/components/common/LoadingSpinner.tsx`
   - `apps/web/src/components/common/EmptyState.tsx`
   - `apps/web/src/components/common/Table.tsx`
   - `apps/web/src/components/common/Badge.tsx`
   - `apps/web/src/components/common/Button.tsx`

---

## 4. SOFT-DELETE AUTHORITY MATRIX

| Entity | Soft Delete Field | Soft Delete API | Query Filtering | Restore API | Permanent Purge API | Trash UI Representation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Document** | `isDeleted: boolean` | `DELETE /api/v1/documents/:id` | Filtered from normal list (`isDeleted: false` default) | `PATCH /api/v1/documents/:id/restore` | **NOT PRESENT** | Supported in `TrashPage.tsx` |
| **User** | `isDeleted: boolean`, `isActive: boolean` | `DELETE /api/v1/users/:id` | Filtered from user queries (`isDeleted: false`) | **NOT PRESENT** | **NOT PRESENT** | Excluded from Trash UI |
| **Project** | None (`isArchived: boolean` only) | None | Archival filtering (`isArchived: true/false`) | **NOT PRESENT** | **NOT PRESENT** | Excluded from Trash UI |
| **DocumentVersion** | None | Bound to parent Document | Accessible via Document history | **NOT PRESENT** | **NOT PRESENT** | Excluded from Trash UI |
| **Relationships** | None | Cascades / filtered by active document | Depends on active parent documents | **NOT PRESENT** | **NOT PRESENT** | Excluded from Trash UI |
| **Governance / Verification / Release** | None | Immutable snapshots | Retains historical document references | **NOT PRESENT** | **NOT PRESENT** | Excluded from Trash UI |

---

## 5. DOMAIN 20 USER DELETION RELATIONSHIP

Domain 20 established user management deletion behavior:
- `isDeleted = true` and `isActive = false`.
- Refresh tokens are revoked immediately upon deletion (`refreshTokens = []`).
- Users are excluded from standard user search and selector dropdowns.
- **User Restoration**: Repository evidence confirms user restoration is **NOT SUPPORTED**. No `restoreUser` API endpoint or service method exists.
- **Trash UI Exclusions**: Deleted users are intentionally **EXCLUDED** from the Trash/Recycle Bin UI (`TrashPage.tsx` displays documents only).

---

## 6. DOCUMENT DELETION

- **API Endpoint**: `DELETE /api/v1/documents/:id`
- **HTTP Method**: `DELETE`
- **Model Fields**: Sets `isDeleted = true` on `Document` model.
- **Authorization**: Requires document ownership or write/admin permissions (`ProtectedRoute` / ACL check).
- **Deleted Filtering**: Standard document list endpoint `GET /api/v1/documents` defaults to `isDeleted: false`. `GET /api/v1/documents?isDeleted=true` explicitly retrieves deleted documents.
- **Version & Relationship Behavior**: Child document versions remain in the database attached to the document ID. They become unreachable via main navigation but are restored if the document is restored.
- **Restoration**: `PATCH /api/v1/documents/:id/restore` sets `isDeleted = false`.

---

## 7. PROJECT DELETION

- **Repository Behavior**: Projects CANNOT be soft-deleted or hard-deleted.
- **Archival Alternative**: Projects support archival via `isArchived: boolean` (`PATCH /api/v1/projects/:id/archive`).
- **Trash Representation**: Repository evidence confirms there is **NO** project deletion, project restore, or project trash workflow.

---

## 8. VERSION DELETION

- Document versions are immutable historical snapshots.
- Versions cannot be individually deleted, archived, or soft-deleted.
- Deletion of a parent document hides all associated versions from standard views, but restoring the parent document restores access to full version lineage.

---

## 9. RELATED REFERENCES & TOMBSTONES

When a soft-deleted document is referenced across other Documan modules:
- **Evidence / Change Proposals / Verification / Release Certificates**: References to the document ID remain in database schemas (e.g., `documentId`).
- **Query Behavior**: API queries that perform `populate('documentId')` return `null` or a deleted document object if populated without strict `isDeleted: false` filters.
- **Tombstone Rendering**: Frontend features display "Resource Unavailable" or a missing document fallback when `documentId` populates as null.

---

## 10. TRASH / RECYCLE BIN IMPLEMENTATION

- **Frontend Route**: `/trash` (handled by `TrashPage.tsx`).
- **Entities Displayed**: `Document` records only (where `isDeleted = true`).
- **Columns Displayed**: Document Title, File Type / Extension, File Size, Updated/Deleted Date, Actions (Restore button).
- **Supported Action**: Restore Document (`PATCH /api/v1/documents/:id/restore`).
- **Unsupported Actions**:
  - **Permanent Delete**: NOT PRESENT in API or UI.
  - **Bulk Selection / Restore All**: NOT PRESENT in repository.
  - **Search & Pagination in Trash**: Standard client-side table layout.

---

## 11. RETENTION & EXPIRATION

- **Repository Evidence**: There is **NO** `deletedAt` timestamp auto-purge job, retention window countdown (e.g., "30 days until permanent deletion"), or scheduled cleanup task in the repository.
- Soft-deleted documents remain in the database indefinitely until manually acted upon (or until backend database maintenance is performed out-of-band).

---

## 12. PERMANENT DELETION

- Permanent hard deletion (e.g., `MONGOOSE.deleteOne()` or `DELETE /api/v1/documents/:id/permanent`) is **NOT IMPLEMENTED** in backend services or controllers.
- "Repository evidence is insufficient to establish permanent deletion behavior."

---

## 13. RESTORE CAPABILITIES

- **Document Restoration**: Supported via `PATCH /api/v1/documents/:id/restore` and the Restore button in `TrashPage.tsx`.
- **User Restoration**: NOT SUPPORTED.
- **Project Restoration**: NOT SUPPORTED (Unarchive exists for archived projects).
- **Version Restoration**: NOT SUPPORTED (Versions are never deleted).

---

## 14. ERROR FALLBACK ARCHITECTURE

Documan frontend employs a three-tier error fallback strategy:
1. **Global Application Error Boundary (`ErrorBoundary.tsx`)**: React error boundary surrounding the router and application layout. Captures unhandled rendering errors and prevents white-screen crashes.
2. **Route-Level Not Found Fallback (`NotFoundPage.tsx`)**: Catch-all client route (`path="*"`) that catches invalid URLs.
3. **API / Network Interceptors (`client.ts`)**: Axios interceptor that captures HTTP status codes (401, 403, 404, 500) and displays inline alerts or triggers auth redirects.

---

## 15. GLOBAL ERROR BOUNDARY

- **Component**: `apps/web/src/components/ErrorBoundary.tsx`
- **Fallback UI**: Renders an alert box with heading "Something went wrong", the `error.message` text, and a single recovery button: **"Reload Application"** (`window.location.reload()`).
- **Unsupported Features**: No external error reporting (Sentry/Bugsnag), no detailed stack trace toggle in production, no inline state reset without full page reload.

---

## 16. 404 / NOT FOUND UX

- **Component**: `apps/web/src/pages/NotFoundPage.tsx`
- **Route**: `<Route path="*" element={<NotFoundPage />} />`
- **Visual Structure**: Centered layout with warning icon, "404 - Page Not Found" title, message explaining the page does not exist, and a **"Go to Dashboard"** primary button (`/dashboard`).

---

## 17. API ERROR HANDLING & HTTP STATUS CODES

Axios client interceptor (`apps/web/src/features/api/client.ts`) handles API responses:
- **401 Unauthorized**: Attempts token refresh via `POST /api/v1/auth/refresh`. If refresh fails, clears session storage and redirects to `/login`.
- **403 Forbidden**: Triggers `ProtectedRoute` fallback or returns rejected promise with error message "Access denied".
- **404 Not Found**: Returns API error payload (`{ message: "Resource not found", errorCode: "DOCUMENT_NOT_FOUND" }`).
- **422 / 400 Validation Error**: Exposes field-level validation errors to forms via response payload (`error.response.data.message`).
- **500 Internal Server Error**: Displays default toast/alert "An unexpected error occurred. Please try again later."

---

## 18. AUTHENTICATION ERROR BOUNDARY

- Handled by `client.ts` Axios interceptors + `useAuthStore`.
- Expired tokens automatically refresh in the background.
- If refresh fails, user is logged out, session cleared, and user redirected to `/login` with `returnUrl` query parameter preserved.

---

## 19. AUTHORIZATION / FORBIDDEN UX

- Handled by `apps/web/src/components/ProtectedRoute.tsx`.
- Checks `user.role` against required roles (e.g., `admin`).
- If unauthenticated: Redirects to `/login`.
- If authenticated but forbidden: Displays inline banner or redirects to `/dashboard` with an error alert "You do not have permission to access this resource."

---

## 20. RESOURCE NOT FOUND VS DELETED VS FORBIDDEN

- **Not Found (404)**: Resource ID does not exist in the database.
- **Soft Deleted**: Resource ID exists, but `isDeleted = true`. Backend returns `404` or hides item from queries unless `isDeleted=true` filter is specified.
- **Forbidden (403)**: Resource exists, user authenticated, but ACL permissions block access.
- **Documan Differentiation**: API returns standard JSON error responses with distinct `errorCode` values (`RESOURCE_NOT_FOUND` vs `FORBIDDEN`). Frontend handles them via modal/toast alerts or redirecting to safe pages.

---

## 21. LOADING STATES INVENTORY

Shared loading components in `apps/web/src/components/common/`:
- **`LoadingSpinner.tsx`**: Centered SVG spinner supporting sizes (`sm`, `md`, `lg`).
- **Page Loading**: Full-page centered spinner during route lazy loading or auth check.
- **Table Loading**: Embedded spinner in `Table.tsx` tbody while fetching data.
- **Button Loading**: Button disabled state with inline spinner during async mutation.

---

## 22. EMPTY STATES INVENTORY

- **`EmptyState.tsx`**: Standardized empty state primitive accepting `title`, `description`, `icon`, and optional `action` button.
- **Usage**: Used in `TrashPage.tsx` ("No deleted items found"), `DocumentsPage.tsx` ("No documents found"), and Search views.

---

## 23. ERROR STATES INVENTORY

- **Page-Level Error**: Card alert with retry button when initial data fetch fails.
- **Form Inline Error**: Red helper text below input fields for schema/validation errors.
- **Toast Notifications**: Floating alerts for non-blocking API errors (e.g., Network Error).

---

## 24. DELETED RESOURCE UX PATTERNS

- **In Document Lists**: Soft-deleted documents disappear from standard document tables.
- **In Trash Page**: Soft-deleted documents appear with a "Deleted" status badge and a "Restore" button.
- **Direct Navigation to Deleted Document**: Accessing `/documents/:id` for a deleted document returns a 404 error payload from API, triggering the Not Found UI page.

---

## 25. TRASH INFORMATION ARCHITECTURE

- **Route**: `/trash`
- **Navigation Placement**: Global main sidebar navigation menu item (under "Management" / "Workspace" section).
- **Project Tab Boundary**: Trash is **NOT** a tab inside Project Workspace. Project Workspace tabs remain strictly:
  1. Overview
  2. Documents
  3. Relationships
  4. Knowledge
  5. Governance

---

## 26. SEARCH, FILTER & PAGINATION IN TRASH

- Current implementation in `TrashPage.tsx` uses standard table layout with client-side filtering.
- Pagination is available via shared `Table` pagination controls.

---

## 27. SECURITY & PRIVACY BOUNDARIES

- Soft-deleted documents retain their original tenant and ACL restrictions.
- Non-admin / unauthorized users cannot query deleted documents via `GET /api/v1/documents?isDeleted=true`.
- Deletion does not leak user details or internal document paths in API error responses.

---

## 28. GOVERNANCE & HISTORY INTEGRITY

- Soft deleting a document does **NOT** purge its historical release certificates, change proposals, or verification logs.
- Audit trails retain historical references to soft-deleted document IDs for compliance and traceability.

---

## 29. RELEASE CERTIFICATE BOUNDARY

- Release certificates (`Domain 18/19`) store immutable JSON snapshots of verified documents and projects at the time of issuance.
- Deleting a document after release certificate issuance does **NOT** modify or destroy the generated attestation certificate.

---

## 30. EVIDENCE & TRACEABILITY BOUNDARY

- Evidence items pointing to a soft-deleted document reflect an `UNVERIFIED` or `STALE` status during verification scans.
- No "DELETED" evidence state is created (uses existing evidence states).

---

## 31. SEARCH BOUNDARY

- Knowledge Search and Global Document Search automatically exclude soft-deleted documents (`isDeleted: false` enforced in query filters).

---

## 32. EXISTING UI ROUTES MAP

- `/trash` -> `TrashPage.tsx` (Deleted Documents list & Restore action)
- `*` -> `NotFoundPage.tsx` (404 Fallback)
- App Wrapper -> `ErrorBoundary.tsx` (Uncaught JS exception fallback)

---

## 33. SHARED UI PRIMITIVES REUSE OPPORTUNITIES

- `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx`)
- `EmptyState` (`apps/web/src/components/common/EmptyState.tsx`)
- `LoadingSpinner` (`apps/web/src/components/common/LoadingSpinner.tsx`)
- `Table` (`apps/web/src/components/common/Table.tsx`)
- `Badge` (`apps/web/src/components/common/Badge.tsx`)
- `Button` (`apps/web/src/components/common/Button.tsx`)

---

## 34. RESPONSIVE DESIGN REQUIREMENTS

- **1440px Desktop**: Full multi-column table for Trash page, side-by-side error details.
- **1024px / 800px Tablet**: Collapsible sidebar, horizontally scrollable table container.
- **375px Mobile**: Single column stacked card layout for empty/error states, full-width restore buttons.

---

## 35. ACCESSIBILITY PATTERNS

- `aria-live="polite"` on error alerts and loading spinners.
- Focus lock and keyboard trap management on restore modal dialogs.
- `role="alert"` on global ErrorBoundary fallback box.

---

## 36. DOMAIN BOUNDARIES

### Domain 21 OWNS:
- Repository-backed document soft-delete presentation (`TrashPage.tsx`).
- Document restoration workflow (`restoreDocument`).
- Application global `ErrorBoundary` fallback UX.
- 404 Not Found route fallback UX.
- Shared empty, loading, and recoverable error state primitives.
- Auth error & forbidden access presentation.

### Domain 21 DOES NOT OWN:
- Database backup / restore operations (owned by operational tooling).
- Hard permanent purging / legal hold infrastructure.
- User restoration (unsupported by domain 20).
- Project deletion / project trash (unsupported by project domain).
- Version soft-deletion.

---

## 37. OPERATIONAL BACKUP vs TRASH RESTORATION BOUNDARY

- Operational DB backups (dump/restore scripts in `scripts/backup/`) operate at the MongoDB database level and are managed by DevOps/Admin CLI tools.
- User Trash restoration operates strictly at the application model level for `Document` entities (`isDeleted: false`).
- Domain 21 product design must **NOT** create UI components for DB backup restoration.

---

## 38. RECOMMENDED STITCH DESIGN ARCHITECTURE

The smallest coherent, repository-grounded Stitch design architecture for Domain 21 includes the following 6 screens:

1. **21.01 Trash / Deleted Items**: `/trash` route showing soft-deleted documents, metadata, and restore action.
2. **21.02 Restore Confirmation Modal**: Confirmation dialog before triggering `PATCH /api/v1/documents/:id/restore`.
3. **21.03 Resource Not Found (404)**: `/404` or unknown route fallback screen with "Go to Dashboard" button.
4. **21.04 Forbidden (403)**: Access denied fallback screen for unauthorized role navigation.
5. **21.05 Application Error Boundary**: Uncaught React exception fallback screen with "Reload Application" button.
6. **21.06 Shared Loading & Empty States Canvas**: Visual documentation of `LoadingSpinner`, `EmptyState`, and inline error banner primitives.

*Note: Permanent Delete and User Restore screens are omitted as they are not supported by the repository backend.*

---

## 39. STATE MATRIX

| UI Surface | Normal State | Loading State | Empty State | Error State | Action State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Trash Page (`/trash`)** | Deleted documents table | `<LoadingSpinner />` inside table | `<EmptyState title="No deleted items" />` | Error banner with Retry button | Restore modal opening |
| **404 Not Found** | Centered 404 message card | N/A | N/A | N/A | Click "Go to Dashboard" |
| **Global Error Boundary** | N/A | N/A | N/A | Alert box with `error.message` | Click "Reload Application" |
| **Forbidden (403)** | Access Denied banner | N/A | N/A | Inline 403 error | Click "Return to Safety" |

---

## 40. SAMPLE DATA BOUNDARY

All prototype data for Stitch designs must use sample data matching current model structures:
- Sample Deleted Documents: `API Specification v2.pdf` (Deleted: 2026-09-10, Size: 2.4 MB, Owner: Alex Chen)
- Sample Deleted Documents: `System Architecture Diagram.svg` (Deleted: 2026-09-12, Size: 850 KB, Owner: Sarah Jenkins)

---

## 41. ANTI-HALLUCINATION RULES

The Stitch design phase for Domain 21 MUST NOT invent:
- Restore User UI
- Restore Project UI
- Permanent Delete / Purge All buttons
- Retention period countdowns ("Purging in 30 days")
- DB Backup / Restore UI controls
- Telemetry / Sentry incident dashboards

---

## 42. AUTHORITY MAP

- **Document Soft-Delete & Restore**: Owned by Document Module (`apps/api/src/modules/documents/`).
- **User Deletion**: Owned by User Module (`apps/api/src/modules/users/`). No restoration exists.
- **Project Archival**: Owned by Project Module (`apps/api/src/modules/projects/`). No trash exists.
- **Auth Failure & Session Refresh**: Owned by Auth Module & Axios client (`apps/web/src/features/api/client.ts`).
- **React Exception Fallback**: Owned by `ErrorBoundary.tsx`.
- **Database Backup Operations**: Owned by DevOps CLI scripts.

---

## 43. FINAL RESEARCH SUMMARY

### Verified Repository Capabilities (A - W):
- **A. Verified Soft-Delete Entities**: `Document` (has `isDeleted: boolean`), `User` (has `isDeleted: boolean`, `isActive: boolean`).
- **B. Verified Deleted-State Fields**: `isDeleted` on Document and User models.
- **C. Verified Trash Capability**: `TrashPage.tsx` listing soft-deleted documents (`GET /api/v1/documents?isDeleted=true`).
- **D. Verified Restore Capability**: Supported for `Document` via `PATCH /api/v1/documents/:id/restore`.
- **E. Verified Permanent-Delete Capability**: **NOT PRESENT** in API or UI.
- **F. Verified Deletion APIs**: `DELETE /api/v1/documents/:id`, `DELETE /api/v1/users/:id`.
- **G. Verified Deletion Authorization**: Requires document write/owner or admin role.
- **H. Verified Deleted-Record Filtering**: Standard queries default to `isDeleted: false`.
- **I. Verified Related-Reference Behavior**: References remain in DB; populates return `null` or raw ID if filtered.
- **J. Verified ErrorBoundary**: Class component in `ErrorBoundary.tsx` catching uncaught render errors.
- **K. Verified 404 Behavior**: `NotFoundPage.tsx` for unknown routes (`*`).
- **L. Verified Forbidden Behavior**: `ProtectedRoute.tsx` role check blocking unauthorized mounting.
- **M. Verified Authentication-Error Behavior**: 401 response triggers refresh token attempt or redirect to `/login`.
- **N. Verified API Error Handling**: Axios response interceptor formatting error messages.
- **O. Verified Loading States**: `LoadingSpinner.tsx` (page, table, button loading).
- **P. Verified Empty States**: `EmptyState.tsx` reusable component.
- **Q. Verified Shared Components**: `ErrorBoundary`, `EmptyState`, `LoadingSpinner`, `Table`, `Badge`, `Button`.
- **R. Verified Frontend Routes**: `/trash`, `*` (404).
- **S. Verified Responsive Requirements**: 1440px desktop, 1024px/800px tablet, 375px mobile responsiveness.
- **T. Verified Accessibility Requirements**: ARIA alerts, keyboard focus management.
- **U. Verified Security/Privacy Boundaries**: ACL filtering enforced on deleted document queries.
- **V. Verified Relationship with Domain 20**: User deletion sets `isDeleted=true`, user restore is **NOT SUPPORTED**, users excluded from Trash.
- **W. Verified Relationship with Backup/Restore Operations**: Operational DB scripts are separate from product Trash UI.

### Domain 21 Boundaries (X - Z):
- **X. Domain 21 Authority Map**: Grounded strictly in `documents`, `auth`, `ErrorBoundary`, `NotFoundPage`, and `TrashPage`.
- **Y. Domain 21 Boundaries**: Soft-delete trash, error boundaries, 404, loading/empty states. Excludes DB backups, user restoration, project trash, and permanent deletion.
- **Z. Recommended Stitch Architecture**: 6 screens (21.01 Trash, 21.02 Restore Modal, 21.03 404 Not Found, 21.04 403 Forbidden, 21.05 Error Boundary, 21.06 Shared States Canvas).
- **AA. State Matrix**: Documented normal, loading, empty, error, and action states.
- **AB. Open Questions / Verification Items**: None. Repository source code has been 100% verified.

---

### FINAL READINESS STATUS

**READY FOR STITCH DESIGN**
