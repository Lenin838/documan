# Phase 17 Implementation Plan v5
**Documentation Change Package Fulfillment Verification & Immutable Attestation (Final Planning Revision)**

---

## Review Corrections

This document (v5) is the **FINAL AUTHORITATIVE REVISION** of the Phase 17 Implementation Plan. Previous planning artifacts (`PHASE-17-IMPLEMENTATION-PLAN-v1.md`, `v2.md`, `v3.md`, and `v4.md`) are preserved unchanged as historical research documents.

### Key Architectural & Repository Corrections Resolved in v5:

1. **Authoritative Package Acceptance Timestamp ($T_{\text{accept}}$) & No Fallback**:
   - Strictly requires the `CHANGE_PACKAGE_ACCEPTED` audit event (`auditLog.createdAt`) to establish $T_{\text{accept}}$.
   - **Eliminated `package.updatedAt` Fallback**: If the `CHANGE_PACKAGE_ACCEPTED` audit log cannot be located in MongoDB, verification returns `fulfillmentStatus = 'INDETERMINATE'` with `indeterminacyReason = 'MISSING_PACKAGE_ACCEPTANCE_AUDIT_LOG'`.
   - **Historical Correctness**: `package.updatedAt` does not prove the exact acceptance transition time. Using `updatedAt` risks evaluating post-acceptance versions against a false boundary timestamp.
2. **Phase 15 Proposal Content Reconstruction & Verification Rules**:
   - Evaluated `DocumentChangeProposal` schema (`apps/api/src/modules/change-proposals/change-proposal.model.ts`).
   - `DOCUMENT_CONTENT_UPDATE`: Requires `proposedChange.content` string. Canonicalization: Trim whitespace and normalize line endings (`\r\n` -> `\n`) before SHA-256 hashing. If `proposedChange.content` is absent, verification returns `INDETERMINATE` (`UNRECONSTRUCTABLE_PROPOSAL_CONTENT`).
   - `TECHNICAL_CONTRACT_UPDATE`: Evaluates `proposedChange.contractSchema`. Canonicalization: Sort JSON keys alphanumerically and format compact JSON string (`JSON.stringify(canonicalize(schema))`) compared against canonical JSON of candidate `DocumentVersion.content`. If `contractSchema` is absent, returns `INDETERMINATE` (`UNRECONSTRUCTABLE_CONTRACT_SCHEMA`).
3. **Decoupled Verification vs. Attestation Authorization**:
   - `POST /verify-fulfillment`: Requires `READ` project access.
   - `POST /attestations`: Requires `WRITE` (`EDIT`, `PROJECT_OWNER`, `ADMIN`) project access.
   - `GET` endpoints: Require `READ` project access.
4. **Domain-Scoped Module Boundary (`apps/api/src/modules/change-packages/`)**:
   - Implementation resides strictly within `apps/api/src/modules/change-packages/` (`change-package-attestation.model.ts`, `change-package-attestation.service.ts`, `change-package-attestation.controller.ts`).
5. **Dynamic Query-Time Staleness Derivation**:
   - Stored MongoDB `PackageFulfillmentAttestation` records are **100% IMMUTABLE**. Discovery of staleness on `GET` requests never mutates MongoDB documents or creates audit events.

---

## Repository Baseline

- **Current Baseline**: `main = origin/main = 54c7d89c45cba873183c9f61b8bec554a487facd`
- **Approved Roadmap Entry**: Phase 17 — Documentation Change Package Fulfillment Verification & Immutable Attestation
- **Approved Research Document**: `docs/research/PHASE-17-RESEARCH.md`
- **Preceding Plans**: `PHASE-17-IMPLEMENTATION-PLAN-v1.md`, `v2.md`, `v3.md`, `v4.md` (Preserved unchanged)
- **Status**: PLANNING ONLY (No application code modifications, schema changes, or feature branch creation).

---

## Phase 16 Acceptance Timestamp

Inspection of Phase 16 implementation (`apps/api/src/modules/change-packages/change-package.service.ts`):
- Package acceptance executes:
  ```typescript
  pkg.status = PackageStatus.ACCEPTED;
  await pkg.save();
  await createDocumentAudit(firstProp.targetDocumentId.toString(), userId, 'CHANGE_PACKAGE_ACCEPTED' as any, { packageId: pkg._id.toString(), packageNumber: pkg.packageNumber });
  ```

### Authoritative Acceptance Timestamp Algorithm:

```typescript
export async function getAuthoritativeAcceptanceTimestamp(packageId: Types.ObjectId): Promise<Date | null> {
  const audit = await DocumentAudit.findOne({
    action: 'CHANGE_PACKAGE_ACCEPTED',
    'metadata.packageId': packageId.toString(),
  }).sort({ createdAt: -1 });

  return audit ? audit.createdAt : null;
}
```

- **Missing Acceptance Event Handling**: If `getAuthoritativeAcceptanceTimestamp` returns `null`, verification MUST stop and set `fulfillmentStatus = 'INDETERMINATE'` with `indeterminacyReason = 'MISSING_PACKAGE_ACCEPTANCE_AUDIT_LOG'`. `package.updatedAt` MUST NOT be substituted.

---

## Phase 15 Proposal Representation

Inspection of Phase 15 schema (`apps/api/src/modules/change-proposals/change-proposal.model.ts`):

1. **`DOCUMENT_CONTENT_UPDATE`**:
   - Stores `proposedChange.content?: string`.
   - **Reconstructability**: Reconstructable if `content` is present.
   - **Canonical Hash**: `crypto.createHash('sha256').update(content.replace(/\r\n/g, '\n').trim(), 'utf8').digest('hex')`.
2. **`TECHNICAL_CONTRACT_UPDATE`**:
   - Stores `proposedChange.contractSchema?: Record<string, any>`.
   - **Reconstructability**: Reconstructable if `contractSchema` is present.
   - **Canonical Structure**: Recursive key sorting via `canonicalizeJSON(schema)`.
3. **`RELATIONSHIP_UPDATE`**:
   - Stores `proposedChange.relationshipOperations?: ProposedRelationshipOperation[]`.
   - **Reconstructability**: Reconstructable from array ops.
4. **`DEPRECATION_PROPOSAL`**:
   - Target document ID.
   - **Reconstructability**: Reconstructable. Target document must have `Document.status === 'DEPRECATED'`.

---

## Existing Primitives

1. **`DocumentChangePackage` (`apps/api/src/modules/change-packages/change-package.model.ts`)**: Package container.
2. **`DocumentChangeProposal` (`apps/api/src/modules/change-proposals/change-proposal.model.ts`)**: Proposal container.
3. **`Document` (`apps/api/src/modules/documents/document.model.ts`)**: Document model (`status`, `isDeleted`).
4. **`DocumentVersion` (`apps/api/src/modules/documents/document-version.model.ts`)**: Immutable document versions (`checksum`, `content`).
5. **`DocumentRelationship` (`apps/api/src/modules/documents/document-relationship.model.ts`)**: Active links.
6. **`DocumentAudit` (`apps/api/src/modules/documents/document-audit.service.ts`)**: Audit logging.
7. **Authorization Services (`apps/api/src/modules/projects/project-topology.service.ts` & `project.service.ts`)**: RBAC helpers.

---

## Problem Definition

Documan needs an automated, post-acceptance mechanism to verify that target documents were updated according to accepted change packages, record scope variance, generate immutable attestations, and hand off payloads to Phase 12 Baselines without violating governance boundaries.

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
- Phase 17 will NOT execute automated baseline creation (`createBaseline` invocation remains in Phase 12).
- Phase 17 will NOT introduce a 7th `fulfillmentStatus` enum value.
- Phase 17 will NOT use semantic NLP/AI or non-deterministic matching logic.
- Phase 17 will NOT mutate historical attestation records in MongoDB when staleness is discovered.

---

## Fulfillment Verification Model

### Approved 6 Categorical Fulfillment States (`fulfillmentStatus`):
1. **`FULFILLED`**: Every proposal in the package is satisfied by post-acceptance document changes.
2. **`PARTIALLY_FULFILLED`**: Some proposals satisfied, others unfulfilled.
3. **`UNFULFILLED`**: No proposals satisfied.
4. **`INDETERMINATE`**: Cannot be verified (e.g. missing acceptance audit log, non-reconstructable content, missing document).
5. **`UNSUPPORTED`**: Proposal structure not supported by deterministic verification rules.
6. **`STALE`**: Calculated dynamically when head document versions advance beyond the attested snapshot tuple.

---

## Post-Acceptance Version Selection

1. Fetch $T_{\text{accept}}$ from `CHANGE_PACKAGE_ACCEPTED` audit event.
2. If missing, return `fulfillmentStatus = 'INDETERMINATE'`.
3. Candidate versions for `targetDocumentId`:
   ```typescript
   const candidates = await DocumentVersion.find({
     documentId: targetDocumentId,
     createdAt: { $gte: T_accept },
   }).sort({ versionNumber: 1 });
   ```
4. Match candidate version against proposal requirements.

---

## Coherent Verification Snapshot

Snapshot array bound to each attestation:
```typescript
interface VerifiedDocumentVersionSnapshotItem {
  documentId: Types.ObjectId;
  proposalId: Types.ObjectId;
  documentVersionId: Types.ObjectId;
  versionNumber: number;
  checksum: string;
}
```

---

## DOCUMENT_CONTENT_UPDATE

- **Expected**: Reconstructed canonical SHA-256 hash of `proposedChange.content`.
- **Actual**: Candidate `DocumentVersion.content` SHA-256 hash ($createdAt \ge T_{\text{accept}}$).
- **Outcome**: `FULFILLED` if candidate hash matches expected hash. If `content` is missing from proposal, returns `INDETERMINATE`.

---

## TECHNICAL_CONTRACT_UPDATE

- **Expected**: Canonical JSON representation of `proposedChange.contractSchema`.
- **Actual**: Candidate `DocumentVersion.content` canonical JSON parsing ($createdAt \ge T_{\text{accept}}$).
- **Outcome**: `FULFILLED` if canonical JSON strings match. If `contractSchema` is missing, returns `INDETERMINATE`.

---

## RELATIONSHIP_UPDATE

- **Expected**: Active `DocumentRelationship` state per `relationshipOperations`.
- **Actual**: DB query on `DocumentRelationship`.
- **Outcome**: `FULFILLED` if expected relationships exist (`ADD`) or are absent (`REMOVE`).

---

## DEPRECATION_PROPOSAL

- **Expected**: `Document.status === 'DEPRECATED'`.
- **Actual**: `Document` record in database.
- **Outcome**: `FULFILLED` if `Document.status === 'DEPRECATED'`. Soft-deleted target (`isDeleted === true`) with `status !== 'DEPRECATED'` yields `UNFULFILLED`. Hard-deleted target yields `INDETERMINATE`.

---

## Scope Variance Model

Scope variance represents extraneous modifications made to target documents during fulfillment that were NOT specified in the accepted change package.

```
fulfillmentStatus == 'FULFILLED' AND hasScopeVariance == false ==> CLEAN_ATTESTATION_ELIGIBLE
fulfillmentStatus == 'FULFILLED' AND hasScopeVariance == true  ==> REQUIRES_SCOPE_REVIEW
fulfillmentStatus != 'FULFILLED'                               ==> INELIGIBLE
```

---

## Package Aggregation

Aggregates constituent proposal outcomes:
- All `FULFILLED` -> `FULFILLED`.
- All `UNFULFILLED` -> `UNFULFILLED`.
- Any `INDETERMINATE` -> `INDETERMINATE`.
- Any `UNSUPPORTED` -> `UNSUPPORTED`.
- Mixed -> `PARTIALLY_FULFILLED`.

---

## Attestation Eligibility

- Package MUST be in `ACCEPTED` state.
- `fulfillmentStatus` MUST be `FULFILLED`.
- If `hasScopeVariance === true`, request body MUST include `acceptedScopeVariance: true` and `scopeReviewComment`.

---

## Attestation Design

`PackageFulfillmentAttestation` schema stores immutable verification records:
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

- `PackageFulfillmentAttestation` documents are strictly immutable.
- Compound unique index `{ changePackageId: 1, attestationVersion: 1 }`.
- No update or delete operations permitted.

---

## Multiple Attestation Policy

- Multiple attestations allowed per package (sequential versions $1, 2, 3...$).
- Previous attestations remain preserved intact.

---

## Staleness / Derived Validity

- Calculated dynamically on `GET /change-packages/:id/attestation` by checking current head `DocumentVersion` checksums against snapshot tuple.
- Zero DB writes or audit events on GET queries.

---

## Baseline Eligibility Handoff

Phase 17 derives the Baseline Eligibility Handoff Payload. It NEVER calls Phase 12 `createBaseline()` internally.

---

## Authorization

- `POST /verify-fulfillment`: `READ` access (`checkUserProjectReadAccess`).
- `POST /attestations`: `WRITE` access (`checkProjectAccess` - `EDIT`, `PROJECT_OWNER`, `ADMIN`).
- `GET` endpoints: `READ` access (`checkUserProjectReadAccess`).

---

## Cross-Project Security

Multi-project packages enforce strict per-project user read/write authorization. Unauthorized projects and documents are omitted without metadata leakage.

---

## Audit / Governance

- `POST /verify-fulfillment`: Logs `CHANGE_PACKAGE_FULFILLMENT_VERIFIED` (if configured).
- `POST /attestations`: Logs `CHANGE_PACKAGE_ATTESTED`.
- `GET` endpoints: Generate NO audit events.

---

## API Design

Target domain-scoped routes in `apps/api/src/modules/change-packages/`:
- `POST /api/v1/change-packages/:id/verify-fulfillment` (READ)
- `POST /api/v1/change-packages/:id/attestations` (WRITE)
- `GET  /api/v1/change-packages/:id/attestations` (READ)
- `GET  /api/v1/change-packages/:id/attestations/:attestationVersion` (READ)
- `GET  /api/v1/change-packages/:id/attestation` (READ)

---

## Frontend Design

(Planning guidance): Adds Fulfillment Verification & Attestation tab in Change Package UI.

---

## Data Model

Location: `apps/api/src/modules/change-packages/change-package-attestation.model.ts`
Schema includes `changePackageId`, `projectId`, `attestationVersion`, `verifiedVersionSnapshot`, `fulfillmentStatus`, `hasScopeVariance`, `attestedBy`, `createdAt`.

---

## Indexes / Constraints

- Unique Index: `{ changePackageId: 1, attestationVersion: 1 }`.
- Lookup Index: `{ changePackageId: 1, createdAt: -1 }`.

---

## Concurrency / Idempotency

Mongo unique key error on concurrent attestation attempts returns `409 CONFLICT` safely handled by controller.

---

## Performance

Bulk MongoDB queries for `DocumentVersion.find({ documentId: { $in: docIds } })` prevent N+1 queries.

---

## Testing Strategy

Unit tests for hash/json comparison, integration tests for RBAC and dynamic staleness, automated script `run_phase17_qa.ts`.

---

## QA Scenarios

1. Acceptance audit timestamp found
2. Acceptance audit timestamp missing (`INDETERMINATE`)
3. `updatedAt` NOT used as false acceptance timestamp
4. Version before acceptance ignored
5. Version immediately after acceptance matched
6. Multiple post-acceptance versions selection
7. Fulfilling version followed by unrelated newer version
8. Missing version handling
9. Content reconstructable matching
10. Content not reconstructable (`INDETERMINATE`)
11. Contract reconstructable matching
12. Contract not reconstructable (`INDETERMINATE`)
13. Relationship fulfillment (`ADD` / `REMOVE`)
14. Relationship divergence
15. Deprecated status fulfillment (`Document.status === 'DEPRECATED'`)
16. Soft deletion not counted as deprecation (`UNFULFILLED`)
17. Scope variance detection
18. Scope review acknowledgment requirement
19. Clean attestation creation
20. READ user access to `POST /verify-fulfillment`
21. READ user rejection on `POST /attestations` (`403 FORBIDDEN`)
22. EDIT user success on `POST /attestations` (`201 CREATED`)
23. Cross-project authorization scoping
24. Unauthorized entity omission
25. Duplicate attestation handling (`409 CONFLICT`)
26. Concurrent attestation handling
27. Multiple immutable attestations sequencing
28. Historical attestation retrieval
29. Derived stale state on GET
30. GET stale detection produces zero DB mutations
31. GET stale detection produces zero audit logs
32. Baseline handoff payload generation
33. Baseline non-mutation (Phase 12 uninvoked)
34. Audit event creation on attestation
35. Audit event integrity
36. Full Phase 17 end-to-end regression pass

---

## Implementation File Plan

Domain-scoped files within `apps/api/src/modules/change-packages/`:

### New Files (5):
1. `apps/api/src/modules/change-packages/change-package-attestation.model.ts`
2. `apps/api/src/modules/change-packages/change-package-attestation.types.ts`
3. `apps/api/src/modules/change-packages/change-package-attestation.service.ts`
4. `apps/api/src/modules/change-packages/change-package-attestation.controller.ts`
5. `apps/api/src/modules/change-packages/run_phase17_qa.ts`

### Modified Files (2):
1. `apps/api/src/modules/change-packages/change-package.routes.ts`
2. `apps/api/src/modules/change-packages/index.ts`

---

## Implementation Order

1. Create DTO types (`change-package-attestation.types.ts`)
2. Create Mongoose model (`change-package-attestation.model.ts`)
3. Build verification & version selection logic in service (`change-package-attestation.service.ts`)
4. Build controller endpoints (`change-package-attestation.controller.ts`)
5. Wire routes (`change-package.routes.ts`)
6. Execute QA suite (`run_phase17_qa.ts`)

---

## Risks

- **Missing Acceptance Audit Event**: Handled deterministically by returning `INDETERMINATE`.

---

## Open Questions

1. **Phase 16 Acceptance Timestamp Event**:
   - *Fact*: `DocumentChangePackage` does not persist `acceptedAt`. The audit log `CHANGE_PACKAGE_ACCEPTED` is the sole authoritative source for $T_{\text{accept}}$.
   - *Impact*: If the audit event is missing, package verification cannot establish $T_{\text{accept}}$.
   - *Deterministic Behavior*: Returns `fulfillmentStatus = 'INDETERMINATE'` with `indeterminacyReason = 'MISSING_PACKAGE_ACCEPTANCE_AUDIT_LOG'`.
   - *Blocks Implementation?*: No. Handled gracefully by state machine.

2. **Phase 15 Proposal Content Representation**:
   - *Fact*: `DOCUMENT_CONTENT_UPDATE` proposal stores `proposedChange.content`.
   - *Impact*: If `content` is missing from the proposal payload, expected content cannot be reconstructed.
   - *Deterministic Behavior*: Returns `fulfillmentStatus = 'INDETERMINATE'` with `indeterminacyReason = 'UNRECONSTRUCTABLE_PROPOSAL_CONTENT'`.
   - *Blocks Implementation?*: No. Handled gracefully by state machine.

---

## Verification Gates

1. `git diff --check` passes cleanly.
2. `git status` confirms zero tracked files modified.
3. Automated QA matrix (`run_phase17_qa.ts`) achieves 100% pass rate upon future execution.

---

## Final Recommendation

Approve Phase 17 Implementation Plan v5 as the final, implementation-ready specification. Await explicit user authorization before creating a feature branch or beginning implementation code.
