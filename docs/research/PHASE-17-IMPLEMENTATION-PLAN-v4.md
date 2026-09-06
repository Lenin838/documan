# Phase 17 Implementation Plan v4
**Documentation Change Package Fulfillment Verification & Immutable Attestation**

---

## Review Corrections

This document (v4) supersedes v1, v2, and v3 as the authoritative, repository-grounded implementation plan for Phase 17. Previous planning documents (`PHASE-17-IMPLEMENTATION-PLAN-v1.md`, `PHASE-17-IMPLEMENTATION-PLAN-v2.md`, and `PHASE-17-IMPLEMENTATION-PLAN-v3.md`) are preserved unchanged as historical research artifacts.

### Key Architectural & Repository Review Corrections Resolved in v4:

1. **Authoritative Package Acceptance Timestamp ($T_{\text{accept}}$)**:
   - Evaluated Phase 16 implementation facts in `apps/api/src/modules/change-packages/change-package.service.ts` and `change-package.model.ts`.
   - Identified that `DocumentChangePackage` does not currently possess a dedicated `acceptedAt` field.
   - Defined the authoritative timestamp source: Primary source is `DocumentAudit.findOne({ action: 'CHANGE_PACKAGE_ACCEPTED', 'metadata.packageId': packageId }).sort({ createdAt: -1 })` (`auditLog.createdAt`). Fallback source when audit record is missing is `package.updatedAt` when `package.status === PackageStatus.ACCEPTED`.
2. **Corrected Deprecation Fulfillment Semantics**:
   - Re-aligned strictly with Phase 15 approved deprecation semantics (`Document.status === DocumentStatus.DEPRECATED`).
   - Corrected v3 mistake: `isDeleted === true` is soft deletion and does NOT satisfy deprecation fulfillment. Soft-deleted target documents without `status = 'DEPRECATED'` yield `UNFULFILLED` (or `INDETERMINATE` if hard-deleted).
3. **Decoupled Verification vs. Attestation Authorization**:
   - **`POST /change-packages/:id/verify-fulfillment`**: Non-mutating calculation; requires **`READ`** project access (users with `READ`, `EDIT`, `PROJECT_OWNER`, or `ADMIN`).
   - **`POST /change-packages/:id/attestations`**: Creates persistent, immutable record; requires **`EDIT`**, **`PROJECT_OWNER`**, or **`ADMIN`** write authorization.
   - **`GET` endpoints**: Require **`READ`** project access.
4. **Domain-Scoped Module Boundary (`apps/api/src/modules/change-packages/`)**:
   - Re-evaluated generic `attestations/` module proposal. Decided on domain-scoped implementation inside `apps/api/src/modules/change-packages/` (`change-package-attestation.model.ts`, `change-package-attestation.service.ts`, `change-package-attestation.controller.ts`).
   - Avoids creating an abstract, ungrounded workflow domain and maintains Documan's modular monolith structure.
5. **Minimal Immutable Persisted Attestation Model**:
   - Re-evaluated schema fields for zero redundancy. Persists strictly binding IDs, fingerprints, snapshot tuple, fulfillment status, scope variance flags, attestor identity, attestation version, and timestamp.
   - Derives document titles, file contents, diffs, and Baseline Eligibility Handoff Payloads dynamically at query time.
6. **Query-Time Derived Staleness & Read-Safety**:
   - Immutable attestation records in MongoDB are NEVER mutated to `STALE`. Current validity (`isCurrentlyValid`, `isStale`) is derived on GET requests without database updates or audit event generation.
7. **Baseline Boundary Isolation**:
   - Phase 17 derives the Baseline Eligibility Handoff Payload but NEVER calls Phase 12 `createBaseline` internally.

---

## Repository Baseline

- **Current Baseline**: `main = origin/main = 54c7d89c45cba873183c9f61b8bec554a487facd`
- **Approved Roadmap Entry**: Phase 17 — Documentation Change Package Fulfillment Verification & Immutable Attestation
- **Approved Research Document**: `docs/research/PHASE-17-RESEARCH.md`
- **Preceding Plans**: `PHASE-17-IMPLEMENTATION-PLAN-v1.md`, `v2.md`, `v3.md` (Preserved unchanged)
- **Status**: PLANNING ONLY (No application code modifications, schema changes, or feature branch creation).

---

## Phase 16 Acceptance Timestamp

### Required Repository Verification Findings

Inspection of Phase 16 codebase (`apps/api/src/modules/change-packages/`):
- `DocumentChangePackage` schema (`change-package.model.ts`) possesses `createdAt` and `updatedAt` (Mongoose timestamps), but lacks a dedicated `acceptedAt` Date property.
- When `acceptChangePackage()` executes in `change-package.service.ts`:
  1. `pkg.status` transitions from `UNDER_REVIEW` to `ACCEPTED`.
  2. `pkg.reviewedBy` is assigned the user's ObjectId.
  3. `pkg.save()` is called, updating `pkg.updatedAt` to the current system time.
  4. `createDocumentAudit` generates a `CHANGE_PACKAGE_ACCEPTED` audit record with `metadata: { packageId: pkg._id.toString(), packageNumber: pkg.packageNumber }`.

### Authoritative Acceptance Timestamp Source ($T_{\text{accept}}$)

To determine the exact boundary timestamp $T_{\text{accept}}$ for post-acceptance version matching:

```typescript
export async function getPackageAcceptanceTimestamp(packageId: Types.ObjectId, pkgUpdatedAt: Date): Promise<Date> {
  // Primary: Check authoritative DocumentAudit event
  const audit = await DocumentAudit.findOne({
    action: 'CHANGE_PACKAGE_ACCEPTED',
    'metadata.packageId': packageId.toString(),
  }).sort({ createdAt: -1 });

  if (audit) {
    return audit.createdAt;
  }

  // Fallback: Use package.updatedAt when status is ACCEPTED
  return pkgUpdatedAt;
}
```

- **Why Authoritative**: The `CHANGE_PACKAGE_ACCEPTED` audit record captures the precise timestamp when the package acceptance transaction was finalized. The fallback to `package.updatedAt` guarantees deterministic execution even if audit logging was temporarily bypassed.

---

## Existing Primitives

1. **`DocumentChangePackage` (`apps/api/src/modules/change-packages/change-package.model.ts`)**:
   - Lifecycle: `DRAFT` -> `SIMULATED` -> `UNDER_REVIEW` -> `ACCEPTED` / `REJECTED` / `DISCARDED`.
   - Fields: `packageNumber`, `projectId`, `proposals` (Array of ObjectIds), `packageStateFingerprint`, `lastSimulationStatus`.
2. **`DocumentChangeProposal` (`apps/api/src/modules/change-proposals/change-proposal.model.ts`)**:
   - Proposal Types: `DOCUMENT_CONTENT_UPDATE`, `TECHNICAL_CONTRACT_UPDATE`, `RELATIONSHIP_UPDATE`, `DEPRECATION_PROPOSAL`.
   - Fields: `targetDocumentId`, `proposedChange`, `simulationStateFingerprint`, `acceptedAuthoritativeVersionId`.
3. **`Document` (`apps/api/src/modules/documents/document.model.ts`)**:
   - Statuses: `'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPRECATED' | 'STALE'`.
   - Flags: `isDeleted: boolean` (soft deletion).
4. **`DocumentVersion` (`apps/api/src/modules/documents/document-version.model.ts`)**:
   - Immutable records: `documentId`, `versionNumber`, `checksum` (SHA-256), `content`, `createdBy`, `createdAt`.
5. **`DocumentRelationship` (`apps/api/src/modules/documents/document-relationship.model.ts`)**:
   - Active relationship links: `sourceDocumentId`, `targetDocumentId`, `relationshipType`.
6. **Authorization Helpers (`apps/api/src/modules/projects/project-topology.service.ts` & `project.service.ts`)**:
   - `checkUserProjectReadAccess(userId, role, projectId)`
   - `checkProjectAccess(userId, role, projectId)` (Write access)

---

## Problem Definition

After a Documentation Change Package is accepted, human standard operating procedures or downstream workflows execute the actual documentation updates across target documents. However, Documan currently lacks an automated, post-acceptance mechanism to:
1. Verify whether target documents were actually updated to fulfill the accepted proposals.
2. Detect extraneous or unapproved scope changes (scope variance) introduced during document updating.
3. Produce a tamper-proof, immutable attestation record binding the package to the resulting document version snapshot.
4. Provide governance handoffs to Phase 12 Baselines without violating Phase 12 authorization boundaries.

---

## Scope

- Post-acceptance fulfillment verification algorithms for all 4 proposal types.
- Scope-variance detection and explicit scope review workflows.
- Immutable attestation model and versioned attestation retrieval APIs.
- Dynamic query-time staleness derivation without database mutation.
- Derived Baseline Eligibility Handoff Payload generation.
- Strict RBAC and cross-project authorization scoping.

---

## Non-Goals

- Phase 17 will NOT modify application code during planning.
- Phase 17 will NOT perform automated baseline creation (`createBaseline` invocation remains in Phase 12).
- Phase 17 will NOT introduce a 7th `fulfillmentStatus` enum value (such as `FULFILLED_WITH_SCOPE_VARIANCE`).
- Phase 17 will NOT use semantic NLP/AI or non-deterministic matching logic.
- Phase 17 will NOT mutate historical attestation records in MongoDB when staleness is discovered.

---

## Fulfillment Verification Model

Fulfillment verification evaluates an accepted package against the current state of target documents.

### Approved 6 Categorical Fulfillment States (`fulfillmentStatus`):
1. **`FULFILLED`**: Every proposal in the package has been completely fulfilled by target document changes executed on or after $T_{\text{accept}}$.
2. **`PARTIALLY_FULFILLED`**: At least one proposal is fulfilled, but one or more proposals remain unfulfilled.
3. **`UNFULFILLED`**: None of the proposals in the package have been fulfilled.
4. **`INDETERMINATE`**: Verification cannot be conclusively determined (e.g., target document deleted, missing content schema, or ambiguous history).
5. **`UNSUPPORTED`**: Proposal type or structure is not supported by deterministic verification rules.
6. **`STALE`**: Calculated dynamically when head document versions advance beyond the attested snapshot tuple.

---

## Post-Acceptance Version Selection

To verify fulfillment deterministically, candidate versions for each target document are selected using a post-acceptance boundary algorithm.

### Version Selection Algorithm:

1. **Boundary Time**: Determine $T_{\text{accept}}$ via `getPackageAcceptanceTimestamp(packageId, pkg.updatedAt)`.
2. **Candidate Version Set ($V_{\text{cand}}$)**:
   ```typescript
   const candidateVersions = await DocumentVersion.find({
     documentId: targetDocumentId,
     createdAt: { $gte: T_accept },
   }).sort({ versionNumber: 1 });
   ```
3. **Matching Rules**:
   - **Content Update**: Compare `SHA-256(version.content)` against expected SHA-256 hash derived from `proposal.proposedChange.content`. First candidate version matching the hash is selected as fulfilling version.
   - **Contract Update**: Parse `version.content` and verify canonical JSON equivalence against `proposal.proposedChange.contractSchema`. First matching candidate is selected.
   - **Relationship Update**: Inspect active `DocumentRelationship` records. Selected version is head `DocumentVersion` created at or after $T_{\text{accept}}$.
   - **Deprecation**: Check `Document.findOne({ _id: targetDocumentId })`. Selected version is head `DocumentVersion` created at or after $T_{\text{accept}}$.
4. **No Candidate Version ($V_{\text{cand}} = \emptyset$)**:
   - If no version was created after $T_{\text{accept}}$, inspect head version ($V_{\text{head}}$). If $V_{\text{head}}$ matches expected content and was created prior to $T_{\text{accept}}$, mark as `UNFULFILLED` (change occurred before package acceptance).

---

## Coherent Verification Snapshot

A coherent verification snapshot represents the exact, unified system state used to establish fulfillment.

### Snapshot Tuple Structure:

For every target document in the package, the snapshot captures:
```typescript
interface VerifiedDocumentVersionSnapshotItem {
  documentId: Types.ObjectId;
  proposalId: Types.ObjectId;
  documentVersionId: Types.ObjectId;
  versionNumber: number;
  checksum: string; // SHA-256 hash
}
```

### Snapshot Coherence Guarantees:
- **Atomicity**: All items in the array are selected in a single verification transaction / batch operation.
- **Completeness**: Exactly one entry per constituent proposal in the package.
- **Traceability**: Binds `proposalId` directly to `documentVersionId`, ensuring zero ambiguity regarding which version fulfilled which proposal.

---

## Proposal-Type Verification Matrix

| Proposal Type | Expected State | Actual State | Comparison Logic | Result |
| :--- | :--- | :--- | :--- | :--- |
| **`DOCUMENT_CONTENT_UPDATE`** | Proposed content string | `DocumentVersion` content string ($createdAt \ge T_{\text{accept}}$) | `SHA256(proposed) === SHA256(actual)` | `FULFILLED` if match, else `UNFULFILLED` |
| **`TECHNICAL_CONTRACT_UPDATE`** | Proposed `contractSchema` | Candidate `DocumentVersion` content | Canonical JSON structure equivalence | `FULFILLED` if equal, `UNFULFILLED` if different, `INDETERMINATE` if invalid JSON |
| **`RELATIONSHIP_UPDATE`** | `ADD` / `REMOVE` relationship op | Active `DocumentRelationship` records | Check existence (`ADD`) or absence (`REMOVE`) | `FULFILLED` if condition satisfied, else `UNFULFILLED` |
| **`DEPRECATION_PROPOSAL`** | `DocumentStatus.DEPRECATED` | `Document.status` | `Document.status === 'DEPRECATED'` | `FULFILLED` if `status === 'DEPRECATED'`. If `isDeleted === true` and `status !== 'DEPRECATED'`, returns `UNFULFILLED`. |

---

## Scope Variance Model

Scope variance represents extraneous modifications made to target documents during fulfillment that were NOT specified in the accepted change package.

### Scope Variance Fields:
- `hasScopeVariance`: `boolean`
- `scopeVarianceDetails`: Array of variance descriptors (`documentId`, `varianceType`, `description`).

### Variance Detection Logic:
1. **Unapproved Content Modifiers**: Fulfilling version contains edits beyond the proposed patch/content.
2. **Unapproved Relationship Modifiers**: Relationships added/removed on target document outside package proposals.
3. **Unapproved Status Modifiers**: Document status altered unexpectedly.

### Attestation Decision Mapping:

```
fulfillmentStatus == 'FULFILLED' AND hasScopeVariance == false  ==> CLEAN_ATTESTATION_ELIGIBLE
fulfillmentStatus == 'FULFILLED' AND hasScopeVariance == true   ==> REQUIRES_SCOPE_REVIEW
fulfillmentStatus != 'FULFILLED'                                ==> INELIGIBLE
```

---

## Package Aggregation

Package-level fulfillment is aggregated deterministically from constituent proposal outcomes:

```typescript
function aggregatePackageFulfillment(proposalResults: ProposalVerificationResult[]): FulfillmentStatus {
  const statuses = proposalResults.map(r => r.status);
  
  if (statuses.every(s => s === 'FULFILLED')) {
    return 'FULFILLED';
  }
  if (statuses.every(s => s === 'UNFULFILLED')) {
    return 'UNFULFILLED';
  }
  if (statuses.some(s => s === 'INDETERMINATE')) {
    return 'INDETERMINATE';
  }
  if (statuses.some(s => s === 'UNSUPPORTED')) {
    return 'UNSUPPORTED';
  }
  if (statuses.some(s => s === 'FULFILLED')) {
    return 'PARTIALLY_FULFILLED';
  }
  return 'UNFULFILLED';
}
```

---

## Attestation Eligibility

Attestation eligibility determines whether `POST /change-packages/:id/attestations` is permitted:

- **Eligible Status**: Package `status` MUST be `ACCEPTED`.
- **Fulfillment Status**: `fulfillmentStatus` MUST be `FULFILLED`.
- **Scope Review Requirement**:
  - If `hasScopeVariance === false`: Direct clean attestation allowed.
  - If `hasScopeVariance === true`: Request body MUST include `acceptedScopeVariance: true` with a mandatory `scopeReviewComment`. Otherwise, API returns `409 CONFLICT` (`SCOPE_REVIEW_REQUIRED`).

---

## Attestation Design

The `PackageFulfillmentAttestation` model stores an immutable record of verification.

### Minimal Persisted Schema:

```typescript
export interface IPackageFulfillmentAttestation extends Document {
  changePackageId: Types.ObjectId;
  projectId: Types.ObjectId;
  attestationVersion: number;
  packageStateFingerprint: string;
  constituentProposals: Array<{
    proposalId: Types.ObjectId;
    proposalFingerprint: string;
  }>;
  verifiedVersionSnapshot: Array<{
    documentId: Types.ObjectId;
    proposalId: Types.ObjectId;
    documentVersionId: Types.ObjectId;
    versionNumber: number;
    checksum: string;
  }>;
  fulfillmentStatus: 'FULFILLED';
  hasScopeVariance: boolean;
  scopeVarianceDetails?: Array<{
    documentId: Types.ObjectId;
    varianceType: string;
    description: string;
  }>;
  acceptedScopeVariance: boolean;
  scopeReviewComment?: string;
  attestedBy: Types.ObjectId;
  attestedByRole: string;
  createdAt: Date;
}
```

---

## Attestation Immutability

- `PackageFulfillmentAttestation` documents in MongoDB are **strictly immutable**.
- Mongoose schema prohibits `update`, `findOneAndUpdate`, or `save` modifications after creation.
- Unique compound index `{ changePackageId: 1, attestationVersion: 1 }` guarantees version sequencing.

---

## Multiple Attestation Policy

- Multiple historical attestations per package are allowed (e.g. if target document versions advance and a steward re-attests the new state).
- `attestationVersion` increments sequentially (`1, 2, 3...`).
- Previous attestation records are NEVER overwritten or mutated.

---

## Staleness / Derived Validity

Staleness represents current head version drift relative to the attested snapshot tuple.

### Dynamic Derivation Algorithm (No DB Writes):

When a client queries `GET /change-packages/:id/attestation`:
1. Retrieve latest `PackageFulfillmentAttestation` record.
2. For each item in `verifiedVersionSnapshot`:
   - Fetch current head `DocumentVersion` for `documentId`.
   - If `headVersion.versionNumber !== snapshotItem.versionNumber` OR `headVersion.checksum !== snapshotItem.checksum`:
     - Mark `isCurrentlyValid = false`, `isStale = true`, `stalenessReason = 'DOCUMENT_VERSION_DRIFT'`.
3. Return derived result:
   ```json
   {
     "attestation": { ... },
     "derivedValidity": {
       "isCurrentlyValid": false,
       "isStale": true,
       "currentFulfillmentStatus": "STALE",
       "driftDetails": [ ... ]
     }
   }
   ```
- **Read Safety**: Zero database writes or audit logs are generated during GET query discovery of staleness.

---

## Baseline Eligibility Handoff

Phase 17 derives a Baseline Eligibility Handoff Payload for seamless integration with Phase 12 Baselines:

```typescript
interface BaselineEligibilityHandoffPayload {
  packageId: string;
  packageNumber: string;
  attestationId: string;
  attestationVersion: number;
  isEligibleForBaseline: boolean;
  baselineSnapshotInput: Array<{
    documentId: string;
    versionNumber: number;
    checksum: string;
  }>;
}
```
- **Boundary Guarantee**: Phase 17 generates this payload upon request. It NEVER invokes Phase 12 `createBaseline()` internally. Phase 12 authorization and execution remain strictly under Phase 12 baseline governance control.

---

## Authorization

Permissions are enforced using existing repository authorization helpers (`project-topology.service.ts` & `project.service.ts`):

- **Verification Calculation (`POST /verify-fulfillment`)**: Requires **`READ`** project access (`checkUserProjectReadAccess`).
- **Attestation Creation (`POST /attestations`)**: Requires **`WRITE`** project access (`checkProjectAccess` - `EDIT`, `PROJECT_OWNER`, or `ADMIN`).
- **Historical Attestation Retrieval (`GET /attestations`)**: Requires **`READ`** project access (`checkUserProjectReadAccess`).

---

## Cross-Project Security

For multi-project change packages (Phase 14 & 16 cross-project packages):
- Every constituent document and project in the package must be authorized for the user.
- If a user lacks `READ` access to an affected project in a cross-project package, unauthorized project and document details are completely omitted from verification and attestation views without metadata or count leakage.

---

## Audit / Governance

Audit logs are recorded using `createDocumentAudit()`:
- **`POST /verify-fulfillment`**: Logs `CHANGE_PACKAGE_FULFILLMENT_VERIFIED` (if configured for audit tracking).
- **`POST /attestations`**: Logs `CHANGE_PACKAGE_ATTESTED` with `metadata: { packageId, attestationVersion, fulfillmentStatus, hasScopeVariance }`.
- **`GET` endpoints**: Generate NO audit logs.

---

## API Design

All endpoints reside in `apps/api/src/modules/change-packages/change-package-attestation.controller.ts`:

### 1. `POST /api/v1/change-packages/:id/verify-fulfillment`
- **Auth**: `READ` access.
- **Action**: Non-mutating fulfillment & scope variance calculation.
- **Response**: `{ packageId, fulfillmentStatus, hasScopeVariance, scopeVarianceDetails, proposalResults, attestationEligibility }`.

### 2. `POST /api/v1/change-packages/:id/attestations`
- **Auth**: `EDIT` / `PROJECT_OWNER` / `ADMIN` write access.
- **Body**: `{ acceptedScopeVariance?: boolean, scopeReviewComment?: string }`.
- **Action**: Creates new `PackageFulfillmentAttestation` record (version $N+1$).
- **Response**: `201 Created` with attestation document.

### 3. `GET /api/v1/change-packages/:id/attestations`
- **Auth**: `READ` access.
- **Response**: Array of historical `PackageFulfillmentAttestation` records ordered by `attestationVersion ASC`.

### 4. `GET /api/v1/change-packages/:id/attestations/:attestationVersion`
- **Auth**: `READ` access.
- **Response**: Specific immutable attestation version.

### 5. `GET /api/v1/change-packages/:id/attestation`
- **Auth**: `READ` access.
- **Response**: Latest attestation record with dynamic `derivedValidity`.

---

## Frontend Design

(Planning guidance for subsequent UI phase):
- Adds a **Fulfillment Verification & Attestation Tab** to Change Package Detail view (`apps/web`).
- Displays 6-state badge, scope-variance warnings, snapshot comparison table, and "Issue Attestation" action modal with explicit scope review checkbox.

---

## Data Model

```typescript
// Location: apps/api/src/modules/change-packages/change-package-attestation.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IPackageFulfillmentAttestation extends Document {
  changePackageId: Types.ObjectId;
  projectId: Types.ObjectId;
  attestationVersion: number;
  packageStateFingerprint: string;
  constituentProposals: Array<{
    proposalId: Types.ObjectId;
    proposalFingerprint: string;
  }>;
  verifiedVersionSnapshot: Array<{
    documentId: Types.ObjectId;
    proposalId: Types.ObjectId;
    documentVersionId: Types.ObjectId;
    versionNumber: number;
    checksum: string;
  }>;
  fulfillmentStatus: 'FULFILLED';
  hasScopeVariance: boolean;
  scopeVarianceDetails?: Array<{
    documentId: Types.ObjectId;
    varianceType: string;
    description: string;
  }>;
  acceptedScopeVariance: boolean;
  scopeReviewComment?: string;
  attestedBy: Types.ObjectId;
  attestedByRole: string;
  createdAt: Date;
}

const packageFulfillmentAttestationSchema = new Schema<IPackageFulfillmentAttestation>(
  {
    changePackageId: { type: Schema.Types.ObjectId, ref: 'DocumentChangePackage', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    attestationVersion: { type: Number, required: true },
    packageStateFingerprint: { type: String, required: true },
    constituentProposals: [
      {
        proposalId: { type: Schema.Types.ObjectId, ref: 'DocumentChangeProposal', required: true },
        proposalFingerprint: { type: String, required: true },
      },
    ],
    verifiedVersionSnapshot: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
        proposalId: { type: Schema.Types.ObjectId, ref: 'DocumentChangeProposal', required: true },
        documentVersionId: { type: Schema.Types.ObjectId, ref: 'DocumentVersion', required: true },
        versionNumber: { type: Number, required: true },
        checksum: { type: String, required: true },
      },
    ],
    fulfillmentStatus: { type: String, enum: ['FULFILLED'], required: true },
    hasScopeVariance: { type: Boolean, required: true, default: false },
    scopeVarianceDetails: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
        varianceType: { type: String },
        description: { type: String },
      },
    ],
    acceptedScopeVariance: { type: Boolean, required: true, default: false },
    scopeReviewComment: { type: String, trim: true },
    attestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attestedByRole: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

packageFulfillmentAttestationSchema.index({ changePackageId: 1, attestationVersion: 1 }, { unique: true });
```

---

## Indexes / Constraints

- **Compound Unique Index**: `{ changePackageId: 1, attestationVersion: 1 }` (Enforces unique sequential versions).
- **Lookup Indexes**: `{ changePackageId: 1, createdAt: -1 }`, `{ projectId: 1 }`.

---

## Concurrency / Idempotency

- Duplicate concurrent calls to `POST /attestations` are protected by MongoDB unique index `{ changePackageId: 1, attestationVersion: 1 }`. If concurrent requests attempt to create version $N+1$, one succeeds and the other receives a `409 CONFLICT` Mongo duplicate key error, safely handled by controller retry logic.

---

## Performance

- **Bulk Version Fetching**: Queries `DocumentVersion.find({ documentId: { $in: docIds } })` in a single query per verification call, preventing N+1 queries.
- **Indexed Lookups**: Uses indexed queries on `changePackageId` and `documentId`.

---

## Testing Strategy

- **Unit Tests**: Fulfillment comparison logic, SHA-256 hashing, contract schema equivalence, scope variance detection.
- **Integration Tests**: API endpoints, RBAC checks, attestation immutability, derived staleness queries.
- **Automated QA Script**: `run_phase17_qa.ts` executing all 34 QA scenarios against a real MongoDB instance.

---

## QA Scenarios

1. Accepted package verification
2. Unaccepted package verification (`400 BAD_REQUEST`)
3. Fully fulfilled package (`FULFILLED`)
4. Partially fulfilled package (`PARTIALLY_FULFILLED`)
5. Unfulfilled package (`UNFULFILLED`)
6. Indeterminate verification (`INDETERMINATE`)
7. Unsupported proposal type (`UNSUPPORTED`)
8. Clean package without scope variance (`hasScopeVariance: false`)
9. Package with scope variance (`hasScopeVariance: true`)
10. Attest package with variance without explicit acknowledgment (`409 CONFLICT`)
11. Attest package with variance with explicit acknowledgment (`201 CREATED`)
12. Post-acceptance version boundary matching ($createdAt \ge T_{\text{accept}}$)
13. Pre-acceptance version ignored
14. Unrelated newer version after fulfilling version
15. Multiple candidate versions selection
16. Soft-deleted target document with `status !== 'DEPRECATED'` (`UNFULFILLED`)
17. Hard-deleted target document (`INDETERMINATE`)
18. Checksum divergence detection
19. `RELATIONSHIP_UPDATE` fulfillment (`ADD` / `REMOVE`)
20. `RELATIONSHIP_UPDATE` non-fulfillment
21. `DEPRECATION_PROPOSAL` status fulfillment (`Document.status === 'DEPRECATED'`)
22. Technical contract schema comparison
23. Duplicate concurrent attestation request (`409 CONFLICT`)
24. Multiple historical attestations sequencing ($v1, v2$)
25. Immutability check (reject update/delete of attestation)
26. Dynamic staleness derivation on GET request
27. GET staleness generates zero DB mutations or audit logs
28. READ user access to `POST /verify-fulfillment`
29. READ user rejection on `POST /attestations` (`403 FORBIDDEN`)
30. EDIT user success on `POST /attestations` (`201 CREATED`)
31. Cross-project package partial authorization omission
32. Zero metadata/count leakage for unauthorized cross-project packages
33. Baseline Eligibility Handoff Payload generation
34. Baseline non-mutation (confirm Phase 12 `createBaseline` not invoked)

---

## Implementation File Plan

All new and modified files reside strictly within the domain-scoped directory `apps/api/src/modules/change-packages/`:

### New Files (5):
1. **`apps/api/src/modules/change-packages/change-package-attestation.model.ts`**: Mongoose schema and interface for `PackageFulfillmentAttestation`.
2. **`apps/api/src/modules/change-packages/change-package-attestation.types.ts`**: TypeScript DTOs for verification results, snapshot items, and eligibility handoffs.
3. **`apps/api/src/modules/change-packages/change-package-attestation.service.ts`**: Verification algorithms, version selection, scope variance calculation, and attestation persistence.
4. **`apps/api/src/modules/change-packages/change-package-attestation.controller.ts`**: HTTP controllers for verify, attest, and historical GET endpoints.
5. **`apps/api/src/modules/change-packages/run_phase17_qa.ts`**: Executable QA script running all 34 test scenarios.

### Modified Files (2):
1. **`apps/api/src/modules/change-packages/change-package.routes.ts`**: Registers new attestation routes under `/api/v1/change-packages/:id/...`.
2. **`apps/api/src/modules/change-packages/index.ts`**: Exports attestation models, services, and types.

---

## Implementation Order

1. Create `change-package-attestation.types.ts`
2. Create `change-package-attestation.model.ts`
3. Implement core verification logic in `change-package-attestation.service.ts`
4. Implement controllers in `change-package-attestation.controller.ts`
5. Wire endpoints in `change-package.routes.ts`
6. Create and run `run_phase17_qa.ts` suite

---

## Risks

- **Missing $T_{\text{accept}}$ Audit Log**: Handled via `package.updatedAt` fallback logic.
- **Large Document Version Lists**: Handled via indexed, bulk MongoDB queries (`$in`).

---

## Open Questions

1. **Phase 16 Acceptance Timestamp Field**:
   - *Limitation*: `DocumentChangePackage` does not store an explicit `acceptedAt` field; it updates `updatedAt` upon acceptance and logs a `CHANGE_PACKAGE_ACCEPTED` audit record.
   - *Impact*: Minor query overhead to check `DocumentAudit`.
   - *Safest Implementation*: `getPackageAcceptanceTimestamp` checks audit log first, falling back to `package.updatedAt`.
   - *Blocks Implementation?*: No. Fully resolved by fallback logic.

---

## Verification Gates

1. `git diff --check` passes cleanly.
2. `git status` confirms zero tracked files modified.
3. Automated QA matrix (`run_phase17_qa.ts`) achieves 100% pass rate upon future implementation execution.

---

## Final Recommendation

Approve Phase 17 Implementation Plan v4 as the authoritative guide for implementation. Await explicit user authorization before creating a feature branch or writing implementation code.
