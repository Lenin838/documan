# Phase 17 Implementation Plan v1
**Documentation Change Package Fulfillment Verification & Immutable Attestation**

---

## Repository Baseline

- **Current Repository Baseline**: `main = origin/main = 54c7d89c45cba873183c9f61b8bec554a487facd`
- **Approved Roadmap Entry**: Phase 17 — Documentation Change Package Fulfillment Verification & Immutable Attestation
- **Approved Research Document**: `docs/research/PHASE-17-RESEARCH.md`
- **Status**: PLANNING ONLY (No application code modifications, schema changes, or feature branch creation).

---

## Existing Primitives & Repository Facts

A thorough inspection of the current repository establishes the following authoritative facts:

1. **`DocumentChangePackage` (`apps/api/src/modules/change-packages/change-package.model.ts`)**:
   - Manages package container state (`DRAFT`, `SIMULATED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `DISCARDED`).
   - Contains `packageNumber` (`PKG-YYYYMMDD-XXXX`), `projectId`, `proposals` (array of `DocumentChangeProposal` ObjectIds), `packageStateFingerprint`, and `lastSimulationStatus`.
2. **`DocumentChangeProposal` (`apps/api/src/modules/change-proposals/change-proposal.model.ts`)**:
   - Manages proposal state (`DRAFT`, `SIMULATED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `DISCARDED`).
   - Supports 4 proposal types (`DOCUMENT_CONTENT_UPDATE`, `TECHNICAL_CONTRACT_UPDATE`, `RELATIONSHIP_UPDATE`, `DEPRECATION_PROPOSAL`).
   - Stores `proposedChange` payload: `title`, `content`, `changeDescription`, `contractSchema`, `targetVersionType`, `relationshipOperations` (`ADD_RELATIONSHIP` / `REMOVE_RELATIONSHIP`).
   - Stores `simulationStateFingerprint` and `acceptedAuthoritativeVersionId`.
3. **`DocumentVersion` (`apps/api/src/modules/documents/document-version.model.ts`)**:
   - Authoritative immutable document content history (`versionNumber`, `checksum` SHA-256, `content`, `filePath`, `fileSize`, `createdBy`).
4. **`DocumentationBaseline` (`apps/api/src/modules/governance/baseline.service.ts`)**:
   - Authoritative snapshot container created via `createBaseline` / `createBaselineInternal`.
   - Captures `documentSnapshots` (`documentId`, `versionNumber`, `checksum`) and `relationshipSnapshots`.
5. **Authorization Helpers (`apps/api/src/modules/projects/project.service.ts`)**:
   - `checkUserProjectReadAccess(userId, role, projectId)`: Enforces READ access.
   - `checkUserProjectEditAccess(userId, role, projectId)`: Enforces EDIT/ADMIN access required to alter state.
6. **Audit Trail (`apps/api/src/modules/documents/document-audit.model.ts`)**:
   - `createDocumentAudit({ documentId, userId, action, metadata })` logs immutable audit events.

---

## Problem Definition

In Phase 16, Documan introduced multi-document change package coordination, simulation, and acceptance (`ACCEPTED`). However, package acceptance outputs a structured handoff payload and performs **zero automated database mutations**. Authors manually edit target documents and create new `DocumentVersion` records over time.

Currently, Documan lacks an automated verification engine to answer:
1. Did authors actually execute the proposed edits across all target documents in an accepted package?
2. Do the newly authored `DocumentVersion` records match the accepted proposals without unapproved scope drift?
3. Is an accepted change package ready for baseline promotion in Phase 12 (`DocumentationBaseline`)?

Phase 17 bridges this operational gap by providing **Documentation Change Package Fulfillment Verification & Immutable Attestation**.

---

## Scope

1. **Deterministic Fulfillment Verification Service**: On-demand calculation engine (`package-fulfillment-attestation.service.ts`) comparing an accepted `DocumentChangePackage` against resulting target `DocumentVersion` records and relationship states.
2. **Formal Categorical Fulfillment States**: Categorizes fulfillment state as `FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `INDETERMINATE`, `UNSUPPORTED`, or `STALE`, with derived numerical metrics.
3. **Scope Variance Detection**: Identifies unapproved edits or scope drift outside proposed diffs (`UNAPPROVED_SCOPE_VARIANCE`), presenting findings to technical stewards.
4. **Immutable Attestation Primitive**: Dedicated persistent model (`PackageFulfillmentAttestation`) binding an accepted package ID, constituent proposal IDs, resulting authoritative `DocumentVersion` IDs/checksums, verification outcomes, attestor user ID (`EDIT`/`ADMIN` required), and timestamp.
5. **Baseline Eligibility Handoff Payload**: Outputs structured parameters (`projectId`, recommended `name`, `versionTag`, `attestationId`, target document version snapshots) for Phase 12 `createBaseline`.

---

## Non-Goals

Phase 17 strictly avoids:

- Automatic document editing or automatic `DocumentVersion` creation.
- Software deployment, release management, or production environment monitoring.
- CI/CD build runner or Git / VCS integrations.
- Automatic baseline mutation (Phase 12 remains single baseline authority).
- Generic NLP, LLM, RAG, or AI document review.
- Overwriting project security boundaries or ACL permissions.
- Replacement or duplication of Phases 10–16.

---

## Fulfillment Verification Model

### Verification Data Grounding

Fulfillment verification compares an accepted `DocumentChangePackage` against target documents strictly using deterministic repository data:

```text
Accepted Package (PKG)
  ├── Proposal 1: Target Doc A (Content Update) ────────┐
  └── Proposal 2: Target Doc B (Add DEPENDS_ON Doc C) ──┼──┐
                                                         │  │
                                                         ▼  ▼
Authoritative State (DB)
  ├── Doc A Latest Version (versionNumber, checksum, content)
  └── Active DocumentRelationship (Doc B -> Doc C, DEPENDS_ON)
```

1. **Target Document Resolution**: Extract target document IDs from package constituent proposals (`DocumentChangeProposal`).
2. **Latest Post-Acceptance Version Lookup**: Query `DocumentVersion` records for target documents created *after* package acceptance (`createdAt >= package.updatedAt`).
3. **Deterministic Content Comparison**: Compute SHA-256 checksum of latest content vs proposed content, or evaluate explicit diff matches.
4. **Relationship State Lookup**: Query active `DocumentRelationship` records to verify proposed `ADD_RELATIONSHIP` or `REMOVE_RELATIONSHIP` operations.

---

## Proposal-Type Verification Matrix

| Proposal Type | Expected State | Actual State | Comparison Method | Fulfilled Condition | Partial / Unfulfilled Condition | Indeterminate / Unsupported Condition |
|---|---|---|---|---|---|---|
| **`DOCUMENT_CONTENT_UPDATE`** | Proposed `content` or SHA-256 checksum | Latest `DocumentVersion.checksum` & content | SHA-256 checksum equality & exact string match | Latest `DocumentVersion.checksum` matches proposed content checksum exactly | Unfulfilled: Latest version unchanged since acceptance. Partial: Substring matches. | Indeterminate: Content format unstructured or diff unparseable. |
| **`TECHNICAL_CONTRACT_UPDATE`** | Proposed `contractSchema` (JSON Schema) | Latest `DocumentVersion.content` parsed JSON | Deterministic structural JSON Schema comparison | Latest document content matches proposed `contractSchema` structurally | Unfulfilled: Document content unedited or schema mismatch | Unsupported: Target document content is non-JSON text. |
| **`RELATIONSHIP_UPDATE`** | Proposed `relationshipOperations` (`ADD`/`REMOVE`) | Active `DocumentRelationship` records in DB | Relationship type & target document ID lookup | For `ADD`: active relationship exists. For `REMOVE`: relationship deleted. | Unfulfilled: Proposed relationship missing or not removed. | Indeterminate: Target document deleted. |
| **`DEPRECATION_PROPOSAL`** | Document `status = 'DEPRECATED'` | Target `Document.status` in DB | Document status equality check | `Document.status === 'DEPRECATED'` | Unfulfilled: `Document.status !== 'DEPRECATED'` | Indeterminate: Document soft-deleted. |

---

## Scope Variance Model

### `UNAPPROVED_SCOPE_VARIANCE` Definition

Scope variance occurs when an updated `DocumentVersion` fulfills the accepted proposal's core changes but introduces additional unapproved content or metadata edits outside the accepted proposal scope.

### Classification Rules:

1. **Expected Accepted Change**: Edit matches proposed diff or schema exactly $\rightarrow$ `FULFILLED` (No Scope Variance).
2. **Unapproved Scope Variance**: Target document content includes the proposed update **PLUS** unproposed structural edits $\rightarrow$ `FULFILLED` with `UNAPPROVED_SCOPE_VARIANCE` warning attached.
3. **Format-Only Variance**: Formatting whitespace differences that do not alter content checksum or schema $\rightarrow$ Ignored (No Scope Variance).
4. **Unclassified Variance**: Unstructured text edits that cannot be isolated deterministically $\rightarrow$ `INDETERMINATE`.

Scope variance alerts technical stewards in the UI without invalidating the deterministic fulfillment of the underlying proposal.

---

## Formal Fulfillment States

Primary evaluation authority is grounded in 6 categorical fulfillment states:

```text
               ┌───────────────────────┐
               │   ACCEPTED PACKAGE    │
               └───────────┬───────────┘
                           │ Run Verification
                           ▼
 ┌───────────────────────────────────────────────────┐
 │               CATEGORICAL STATES                  │
 ├───────────────────┬───────────────────────────────┤
 │ FULFILLED         │ 100% Proposals Fulfilled      │
 │ PARTIALLY_FULFILLED│ 1-99% Proposals Fulfilled     │
 │ UNFULFILLED       │ 0% Proposals Fulfilled        │
 │ INDETERMINATE     │ Diff Match Ambiguous          │
 │ UNSUPPORTED       │ Non-Deterministic Diff Format │
 │ STALE             │ Document Mutated Post-Verify  │
 └───────────────────┴───────────────────────────────┘
```

### Categorical Vocabulary:

1. **`FULFILLED`**: Every constituent proposal in the package matches target document versions and relationship states exactly.
2. **`PARTIALLY_FULFILLED`**: Some constituent proposals are fulfilled, but others remain unfulfilled or pending version updates.
3. **`UNFULFILLED`**: Zero target documents have been updated since package acceptance.
4. **`INDETERMINATE`**: Target version content cannot be deterministically matched against proposed changes.
5. **`UNSUPPORTED`**: Proposed change format exceeds deterministic verification capability.
6. **`STALE`**: Target document or package fingerprint changed after verification, invalidating the evaluation.

### Derived Numerical Metric:

If a numerical percentage is rendered in the UI, it is strictly **derived** from categorical states:

$$\text{Fulfillment Percentage} = \left( \frac{\text{Count of FULFILLED Proposals}}{\text{Total Proposals in Package}} \right) \times 100\%$$

Primary governance authority remains the categorical fulfillment state.

---

## Attestation Design

### Primitive Recommendation: `PackageFulfillmentAttestation`

Phase 17 creates a dedicated persistent model: `PackageFulfillmentAttestation`.

#### Why `DocumentAudit` Is Insufficient:
Existing `DocumentAudit` records log single-document events (e.g. `FILE_REPLACE`, `STATUS_CHANGE`) in an append-only log. They cannot store a multi-proposal package-level binding connecting a `DocumentChangePackage` to a specific multi-document tuple of `DocumentVersion` IDs and checksums as a queryable, immutable governance record.

### Schema Specification:

```typescript
export interface IPackageFulfillmentAttestation extends Document {
  attestationNumber: string; // ATT-YYYYMMDD-XXXX
  packageId: Types.ObjectId;
  projectId: Types.ObjectId;
  packageStateFingerprint: string;
  fulfillmentStatus: 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'UNFULFILLED' | 'INDETERMINATE' | 'UNSUPPORTED' | 'STALE';
  fulfillmentPercentage: number;
  proposalResults: Array<{
    proposalId: Types.ObjectId;
    targetDocumentId: Types.ObjectId;
    fulfillmentStatus: string;
    targetDocumentVersionId?: Types.ObjectId;
    targetChecksum?: string;
    reason?: string;
  }>;
  scopeVarianceDetails: Array<{
    targetDocumentId: Types.ObjectId;
    varianceType: string;
    description: string;
  }>;
  baselineEligibility: {
    isEligible: boolean;
    recommendedBaselineInput?: {
      name: string;
      versionTag: string;
      description?: string;
    };
    targetDocumentSnapshots: Array<{
      documentId: Types.ObjectId;
      versionNumber: number;
      checksum: string;
    }>;
  };
  attestedByUserId: Types.ObjectId;
  attestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Immutability Rules

1. **Schema-Enforced Immutability**:
   - `PackageFulfillmentAttestation` schema disables update/delete operations.
   - API endpoints expose `POST` (create) and `GET` (read/list) ONLY. No `PUT`, `PATCH`, or `DELETE` endpoints exist for attestations.
2. **Duplicate Attestation Handling**:
   - Triggering verification on an already-attested package checks if underlying target document versions or fingerprints have changed.
   - If target document versions are unchanged, the service returns the existing attestation.
   - If target document versions diverged, the existing attestation is marked `STALE` and a new versioned attestation (`attestationNumber`) is created.
3. **Audit Event Logging**:
   - Issuing an attestation logs `PACKAGE_FULFILLMENT_ATTESTED` in `DocumentAudit`.

---

## Staleness Rules

An attestation becomes **`STALE`** (`isStale: true`) when:
1. Any target document in the package is edited and a newer `DocumentVersion` is created post-attestation.
2. Any target document in the package is soft-deleted (`isDeleted: true`).
3. Any active `DocumentRelationship` verified in the attestation is removed or modified post-attestation.
4. Project governance settings or release gates change.

When stale, the UI displays a `STALE ATTESTATION` warning and prompts the user to re-verify fulfillment.

---

## Baseline Eligibility Handoff

Attestation outputs a structured **Baseline Eligibility Handoff Payload** for Phase 12 `createBaseline`:

```json
{
  "isEligible": true,
  "attestationId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "packageId": "65f1a2b3c4d5e6f7a8b9c0d2",
  "recommendedBaselineInput": {
    "name": "Post-Package PKG-20260905-001 Baseline",
    "versionTag": "v2.1.0",
    "description": "Baseline generated following verification of Change Package PKG-20260905-001"
  },
  "targetDocumentSnapshots": [
    { "documentId": "65f1a2b3c4d5e6f7a8b9c0d3", "versionNumber": 2, "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
    { "documentId": "65f1a2b3c4d5e6f7a8b9c0d4", "versionNumber": 3, "checksum": "f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2" }
  ]
}
```

- **Phase 12 Integration Boundary**: Phase 12 `createBaseline` remains the single authoritative baseline engine. The handoff payload provides pre-validated arguments for the Project Owner/Admin to invoke `createBaseline`. Zero automated baseline mutations occur in Phase 17.

---

## API Design

### Endpoints:

1. **`POST /api/v1/change-packages/:id/verify-fulfillment`**:
   - Description: Evaluates post-acceptance fulfillment against target document versions without persisting an attestation.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectReadAccess`.
   - Status: `200 OK`.
2. **`POST /api/v1/change-packages/:id/attest`**:
   - Description: Issues an immutable `PackageFulfillmentAttestation` record for an accepted package.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectEditAccess` (Requires EDIT or ADMIN authority).
   - Status: `201 Created` (or `400 Bad Request` if package is not `ACCEPTED` or status is not `FULFILLED`).
3. **`GET /api/v1/change-packages/:id/attestation`**:
   - Description: Retrieves the latest attestation for a package.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectReadAccess`.
   - Status: `200 OK`.
4. **`GET /api/v1/projects/:projectId/attestations`**:
   - Description: Lists all package attestations for a project.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectReadAccess`.
   - Status: `200 OK`.

---

## Authorization & Security

1. **Permission Separation**:
   - **READ Users**: Can check fulfillment (`POST .../verify-fulfillment`), view attestations (`GET .../attestation`), and inspect handoff payloads. READ users **CANNOT** issue attestations (`403 Forbidden`).
   - **EDIT / ADMIN Users**: Can issue attestations (`POST .../attest`) and invoke Phase 12 re-baselining.
2. **Cross-Project Disclosure Isolation**: Reuses Phase 14 `checkUserProjectReadAccess`. Unauthorized connected project documents, topology edges, or contract details are strictly omitted from verification reports. Zero metadata or count leakage.

---

## Audit & Governance Integration

1. **`DocumentAuditAction` Extensions**: Add the following audit actions to `DocumentAuditAction` in `apps/api/src/modules/documents/document-audit.model.ts`:
   - `PACKAGE_FULFILLMENT_VERIFIED`
   - `PACKAGE_ATTESTED`
   - `PACKAGE_ATTESTATION_INVALIDATED`
2. **Phase 10 Assurance Integration**: Attestation status is included as a derived input in `calculateDocumentAssurance` under `CHANGE_IMPACT` category without altering Phase 10 authority.

---

## Frontend Design

1. **`FulfillmentAttestationCard` Component (`apps/web/src/features/change-packages/components/FulfillmentAttestationCard.tsx`)**:
   - Renders inside `ChangePackageDetailsDrawer` on `ProjectDetailsPage`.
   - Displays categorical fulfillment status badge (`FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `STALE`), per-proposal fulfillment indicators, scope variance warnings, and attestation metadata.
   - For EDIT/ADMIN users on `ACCEPTED` & `FULFILLED` packages: displays "Issue Attestation & Generate Baseline Handoff" button.
   - Displays 1-click "Create Baseline from Handoff" button linking to Phase 12 baseline modal.

---

## Data Model & Schema Details

New model: `apps/api/src/modules/change-packages/package-fulfillment-attestation.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

const proposalResultSchema = new Schema(
  {
    proposalId: { type: Schema.Types.ObjectId, ref: 'DocumentChangeProposal', required: true },
    targetDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    fulfillmentStatus: { type: String, required: true },
    targetDocumentVersionId: { type: Schema.Types.ObjectId, ref: 'DocumentVersion' },
    targetChecksum: { type: String },
    reason: { type: String },
  },
  { _id: false },
);

const scopeVarianceSchema = new Schema(
  {
    targetDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    varianceType: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const attestationSchema = new Schema(
  {
    attestationNumber: { type: String, required: true },
    packageId: { type: Schema.Types.ObjectId, ref: 'DocumentChangePackage', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    packageStateFingerprint: { type: String, required: true },
    fulfillmentStatus: { type: String, required: true, index: true },
    fulfillmentPercentage: { type: Number, required: true },
    proposalResults: [proposalResultSchema],
    scopeVarianceDetails: [scopeVarianceSchema],
    baselineEligibility: { type: Schema.Types.Mixed },
    attestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attestedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

attestationSchema.index({ projectId: 1, attestationNumber: 1 }, { unique: true });
attestationSchema.index({ packageId: 1, createdAt: -1 });

export const PackageFulfillmentAttestation = model<IPackageFulfillmentAttestation>(
  'PackageFulfillmentAttestation',
  attestationSchema,
);
```

---

## Performance & Query Design

1. **Bulk DocumentVersion Querying**: Single bulk query (`DocumentVersion.find({ documentId: { $in: targetDocIds } })`) sorted by `versionNumber: -1` to resolve latest versions in $O(1)$ memory.
2. **Bulk DocumentRelationship Querying**: Single bulk query for active relationships across all target documents.
3. **Zero N+1 Hydration**: All target documents, proposals, and projects loaded in unified batch queries.

---

## Architectural Boundaries

Phase 17 respects existing system authorities without creating competing engines:

| Component | Responsibility |
|---|---|
| `DocumentVersion` | Authoritative immutable document version history. |
| `DocumentChangeProposal` | Single-document proposal state & simulation. |
| `DocumentChangePackage` | Multi-document package coordination & acceptance. |
| `PackageFulfillmentAttestation` | Post-acceptance fulfillment verification & immutable attestation. |
| `DocumentationBaseline` | Authoritative baseline snapshot & drift control. |
| `VerificationPlan` | Verification task generation & tracking. |
| `DocumentationWorkRequest` | Human work request tracking. |
| `DocumentAudit` | Append-only system audit log. |

---

## Implementation File Plan

### NEW FILES:

1. `apps/api/src/modules/change-packages/package-fulfillment-attestation.model.ts`: `PackageFulfillmentAttestation` Mongoose schema & TypeScript interfaces.
2. `apps/api/src/modules/change-packages/package-fulfillment-calculator.ts`: Pure in-memory fulfillment calculation engine.
3. `apps/api/src/modules/change-packages/package-fulfillment-attestation.service.ts`: Attestation service orchestrating verification, attestation creation, and baseline eligibility handoffs.
4. `apps/api/src/modules/change-packages/package-fulfillment-attestation.controller.ts`: Express controller handlers for verification and attestation endpoints.
5. `apps/api/src/modules/change-packages/package-fulfillment-attestation.schema.ts`: Zod validation schemas for API inputs.
6. `apps/api/src/modules/change-packages/run_phase17_qa.ts`: Comprehensive 30-scenario automated QA runner.
7. `apps/web/src/features/change-packages/components/FulfillmentAttestationCard.tsx`: React component for drawer UI.

### MODIFIED FILES:

1. `apps/api/src/modules/documents/document-audit.model.ts`: Add `PACKAGE_FULFILLMENT_VERIFIED`, `PACKAGE_ATTESTED`, `PACKAGE_ATTESTATION_INVALIDATED` to `DocumentAuditAction` enum & schema validation array.
2. `apps/api/src/modules/change-packages/change-package.routes.ts`: Mount verification and attestation endpoints.
3. `apps/web/src/features/change-packages/change-package.api.ts`: Add frontend API client methods (`verifyPackageFulfillment`, `attestPackageFulfillment`, `getPackageAttestation`).
4. `apps/web/src/features/change-packages/change-package.types.ts`: Add TypeScript types for attestation.
5. `apps/web/src/features/change-packages/components/ChangePackageDetailsDrawer.tsx`: Integrate `FulfillmentAttestationCard`.

---

## Implementation Order

1. **Step 1 (Model & Audit Enum)**: Create `package-fulfillment-attestation.model.ts` and add audit actions to `document-audit.model.ts`.
2. **Step 2 (Pure Calculator)**: Implement `package-fulfillment-calculator.ts` with pure deterministic comparison logic across all 4 proposal types.
3. **Step 3 (Attestation Service)**: Implement `package-fulfillment-attestation.service.ts` with verification, attestation creation, and baseline eligibility handoff generation.
4. **Step 4 (Schemas & Controllers)**: Implement `package-fulfillment-attestation.schema.ts` and `package-fulfillment-attestation.controller.ts`.
5. **Step 5 (Routes)**: Mount endpoints in `change-package.routes.ts`.
6. **Step 6 (Automated QA Runner)**: Implement `run_phase17_qa.ts` covering 30 QA matrix scenarios.
7. **Step 7 (Frontend API & Types)**: Update `change-package.types.ts` and `change-package.api.ts`.
8. **Step 8 (Frontend UI)**: Implement `FulfillmentAttestationCard.tsx` and integrate into `ChangePackageDetailsDrawer.tsx`.
9. **Step 9 (Verification & Test Suite)**: Execute typechecks, ESLint, full Vitest suite, QA runners 10-17, and production build.

---

## QA Matrix Scenarios (30 Scenarios)

1. Accepted package verification returns `FULFILLED` when all target document versions match.
2. Unaccepted package (DRAFT/UNDER_REVIEW) verification rejected with HTTP 400.
3. Proposal type `DOCUMENT_CONTENT_UPDATE` fulfilled when content SHA-256 matches.
4. Proposal type `TECHNICAL_CONTRACT_UPDATE` fulfilled when document content matches proposed JSON schema.
5. Proposal type `RELATIONSHIP_UPDATE` (`ADD_RELATIONSHIP`) fulfilled when active relationship exists in DB.
6. Proposal type `RELATIONSHIP_UPDATE` (`REMOVE_RELATIONSHIP`) fulfilled when relationship is deleted from DB.
7. Proposal type `DEPRECATION_PROPOSAL` fulfilled when target `Document.status === 'DEPRECATED'`.
8. Partially updated package returns `PARTIALLY_FULFILLED` status.
9. Un-updated package returns `UNFULFILLED` status.
10. Diff format unparseable returns `INDETERMINATE` status.
11. Unrecognized proposal payload returns `UNSUPPORTED` status.
12. Target document edited after verification flags attestation as `STALE`.
13. Missing target `DocumentVersion` handles gracefully as `UNFULFILLED`.
14. Newer unrelated `DocumentVersion` evaluated correctly against accepted proposal diff.
15. Content checksum mismatch flags proposal as `UNFULFILLED`.
16. Scope variance (`UNAPPROVED_SCOPE_VARIANCE`) detected when updated doc contains extraneous edits.
17. Issuing attestation on unfulfilled package rejected with HTTP 400.
18. Issuing attestation on `FULFILLED` package creates immutable `PackageFulfillmentAttestation` record.
19. Duplicate attestation request returns existing attestation if target versions unchanged.
20. Re-verifying package after document edit creates new versioned attestation and marks prior attestation `STALE`.
21. Unauthorized user (non-member) denied access to verification endpoint (HTTP 403).
22. READ user can inspect fulfillment and view attestation details.
23. READ user attempting to issue attestation rejected with HTTP 403 Forbidden.
24. EDIT / ADMIN user successfully issues attestation.
25. Cross-project ACL strictly omits unauthorized project nodes/documents from verification report.
26. Zero sensitive credentials or user emails leaked in attestation payload.
27. Attestation outputs Baseline Eligibility Handoff Payload.
28. Baseline Eligibility Handoff Payload used by Phase 12 `createBaseline` without automatic baseline mutation.
29. `PACKAGE_FULFILLMENT_VERIFIED` and `PACKAGE_ATTESTED` audit events created in `DocumentAudit`.
30. Full workspace regression pass (Phases 1-16 functionality intact).

---

## Verification Gates

The completed Phase 17 implementation must pass:

1. API TypeScript check: `pnpm --filter api exec tsc --noEmit`
2. Web build & TypeScript check: `pnpm --filter web run build`
3. Workspace ESLint: `pnpm run lint`
4. Vitest suite: `pnpm --filter api exec vitest run`
5. Phase 17 QA: `pnpm --filter api exec tsx src/modules/change-packages/run_phase17_qa.ts`
6. Phase 10-16 QA regression scripts: `run_phase10_qa.ts` through `run_phase16_qa.ts`
7. Production build: `pnpm run build`
8. Git diff check: `git diff --check`

---

## Final Recommendation

Phase 17 Implementation Plan v1 is **APPROVED AND READY FOR IMPLEMENTATION**.

It provides a deterministic, repository-grounded, permission-isolated fulfillment verification and attestation engine that closes the governance loop between Phase 16 package acceptance and Phase 12 baseline creation.
