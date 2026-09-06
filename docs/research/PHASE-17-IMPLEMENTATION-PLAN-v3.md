# Phase 17 Implementation Plan v3
**Documentation Change Package Fulfillment Verification & Immutable Attestation**

---

## Review Corrections

This document (v3) supersedes v1 and v2 as the authoritative implementation plan for Phase 17. Previous planning documents (`PHASE-17-IMPLEMENTATION-PLAN-v1.md` and `PHASE-17-IMPLEMENTATION-PLAN-v2.md`) are preserved intact as historical research artifacts.

### Key Architectural Review Corrections Resolved in v3:

1. **Restored Approved 6-State Fulfillment Model**: Removed the speculative `FULFILLED_WITH_SCOPE_VARIANCE` enum from `fulfillmentStatus`. Retained strictly the 6 approved categorical states (`FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `INDETERMINATE`, `UNSUPPORTED`, `STALE`). Scope variance is modeled as orthogonal boolean and detail fields (`hasScopeVariance`, `scopeVarianceDetails`).
2. **Attestation Eligibility & Scope Review Workflow**: Introduced explicit `attestationEligibility` (`CLEAN_ATTESTATION_ELIGIBLE`, `REQUIRES_SCOPE_REVIEW`, `INELIGIBLE`). A package with core fulfillment but extraneous edits yields `fulfillmentStatus = 'FULFILLED'` with `hasScopeVariance = true` and `attestationEligibility = 'REQUIRES_SCOPE_REVIEW'`. Issuing an attestation requires explicit steward review and records `hasScopeVariance: true` in the immutable attestation record.
3. **Coherent Version Snapshot Algorithm**: Defined a rigorous, deterministic version selection algorithm that inspects post-acceptance `DocumentVersion` records (`createdAt >= T_accept`), selects the fulfilling version, and binds a coherent, immutable snapshot tuple (`{ documentId, proposalId, documentVersionId, versionNumber, checksum }`) across all target documents.
4. **Historical Attestation API**: Defined RESTful endpoints for accessing historical attestations (`GET /change-packages/:id/attestations`, `GET /change-packages/:id/attestations/:attestationVersion`, `GET /change-packages/:id/attestation`).
5. **Derived Staleness & Audit Separation**: Established that stored `PackageFulfillmentAttestation` records in MongoDB are IMMUTABLE and never mutated to `STALE` in DB. Derived validity (`isCurrentlyValid`, `isStale`) is calculated dynamically at query time without performing DB writes or creating audit events on GET calls.
6. **Data Model Minimality**: Streamlined the persisted attestation schema to retain only immutable binding identifiers and outcomes, deriving document titles, proposal details, and baseline handoff payloads dynamically during queries.
7. **Phase 12 Integration Boundary**: Derived Baseline Eligibility Handoff Payloads on-demand from valid attestations without any automatic invocation of Phase 12 `createBaseline`.

---

## Repository Baseline

- **Current Repository Baseline**: `main = origin/main = 54c7d89c45cba873183c9f61b8bec554a487facd`
- **Approved Roadmap Entry**: Phase 17 — Documentation Change Package Fulfillment Verification & Immutable Attestation
- **Approved Research Document**: `docs/research/PHASE-17-RESEARCH.md`
- **Preceding Plans**: `PHASE-17-IMPLEMENTATION-PLAN-v1.md` and `v2.md` (Preserved intact)
- **Status**: PLANNING ONLY (No application code modifications, schema changes, or feature branch creation).

---

## Existing Primitives & Repository Facts

A thorough inspection of the repository establishes the following authoritative implementation facts:

1. **`DocumentChangePackage` (`apps/api/src/modules/change-packages/change-package.model.ts`)**:
   - Manages package container state (`DRAFT`, `SIMULATED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `DISCARDED`).
   - Contains `packageNumber` (`PKG-YYYYMMDD-XXXX`), `projectId`, `proposals` (array of `DocumentChangeProposal` ObjectIds), `packageStateFingerprint`, and `lastSimulationStatus`.
   - Acceptance updates `status = 'ACCEPTED'` and records `updatedAt` (package acceptance timestamp $T_{\text{accept}}$).
2. **`DocumentChangeProposal` (`apps/api/src/modules/change-proposals/change-proposal.model.ts`)**:
   - Supports 4 proposal types (`DOCUMENT_CONTENT_UPDATE`, `TECHNICAL_CONTRACT_UPDATE`, `RELATIONSHIP_UPDATE`, `DEPRECATION_PROPOSAL`).
   - Stores `proposedChange` payload: `title`, `content`, `changeDescription`, `contractSchema`, `targetVersionType`, `relationshipOperations` (`ADD_RELATIONSHIP` / `REMOVE_RELATIONSHIP`).
   - Stores `simulationStateFingerprint` and `acceptedAuthoritativeVersionId`.
3. **`DocumentVersion` (`apps/api/src/modules/documents/document-version.model.ts`)**:
   - Immutable document content history (`documentId`, `versionNumber`, `checksum` SHA-256, `content`, `filePath`, `fileSize`, `createdBy`, `createdAt`).
4. **`DocumentationBaseline` (`apps/api/src/modules/governance/baseline.service.ts`)**:
   - Authoritative baseline snapshot container created via `createBaseline` / `createBaselineInternal`.
   - Captures `documentSnapshots` (`documentId`, `versionNumber`, `checksum`) and `relationshipSnapshots`.
5. **Authorization Helpers (`apps/api/src/modules/projects/project.service.ts`)**:
   - `checkUserProjectReadAccess(userId, role, projectId)`: Enforces READ access.
   - `checkUserProjectEditAccess(userId, role, projectId)`: Enforces EDIT/ADMIN access required to issue attestations or modify project state.
6. **Audit Trail (`apps/api/src/modules/documents/document-audit.model.ts`)**:
   - `createDocumentAudit({ documentId, userId, action, metadata })` logs append-only system audit events.

---

## Problem Definition

Phase 16 introduced multi-document change package coordination, aggregate simulation, and human review acceptance (`ACCEPTED`). However, package acceptance outputs a structured handoff payload and performs **zero automated database mutations**. Authors manually edit target documents and create new `DocumentVersion` records over time.

This creates a critical post-acceptance operational gap:
1. **Unverified Execution**: No automated mechanism exists to confirm whether newly authored `DocumentVersion` records fulfill the accepted proposed changes across target documents.
2. **Unapproved Scope Drift**: Authors may update target documents but introduce extraneous edits outside the accepted proposal diff without detection.
3. **Missing Execution Attestation**: Technical stewards lack an immutable attestation record binding an accepted package to its resulting document versions before baseline promotion.

Phase 17 bridges this operational gap by providing **Documentation Change Package Fulfillment Verification & Immutable Attestation**.

---

## Scope

1. **Deterministic Fulfillment Verification Service**: On-demand calculation engine (`package-fulfillment-calculator.ts`) comparing an accepted `DocumentChangePackage` against resulting target `DocumentVersion` records and active relationship states.
2. **Categorical Fulfillment State Model**: Categorizes proposal/package status using the 6 approved states: `FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `INDETERMINATE`, `UNSUPPORTED`, `STALE`.
3. **Scope Variance Detection**: Identifies unapproved content edits outside proposed diffs (`UNAPPROVED_SCOPE_VARIANCE`), setting `hasScopeVariance: true` and mapping `attestationEligibility = 'REQUIRES_SCOPE_REVIEW'`.
4. **Immutable Attestation Primitive**: Dedicated persistent model (`PackageFulfillmentAttestation`) binding an accepted package ID, constituent proposal IDs, resulting authoritative `DocumentVersion` IDs/checksums, verification outcomes, attestor user ID (`EDIT`/`ADMIN` required), and timestamp.
5. **Derived Baseline Eligibility Handoff**: Dynamically generates structured parameters (`projectId`, recommended `name`, `versionTag`, target document version snapshots) for Phase 12 `createBaseline`.

---

## Non-Goals

Phase 17 strictly avoids:

- Automatic document editing or automatic `DocumentVersion` creation.
- Software deployment, release management, or production environment monitoring.
- CI/CD build runner or Git / VCS integrations.
- Automatic baseline mutation (Phase 12 `createBaseline` remains single baseline authority).
- Generic NLP, LLM, RAG, or AI document review.
- Overwriting project security boundaries or ACL permissions.
- Replacement or duplication of Phases 10–16.

---

## Fulfillment Verification Model

### Fingerprint vs. Fulfillment Proof Boundary

It is critical to distinguish between state fingerprints and fulfillment evidence:

- **State Fingerprint (`computePackageStateFingerprint`)**: SHA-256 hash identifying the expected authoritative state of target documents, proposals, and baselines at package creation/simulation time. It identifies *what state was assumed*, but does **NOT** prove fulfillment.
- **Actual Fulfillment Evidence**: The deterministic comparison between expected proposed change payloads (`proposedChange`) and candidate post-acceptance `DocumentVersion.content` / `DocumentVersion.checksum` / `DocumentRelationship` records.

### Verification Flow

```text
Accepted Package (PKG)
  │
  ├── 1. Extract Package Acceptance Timestamp (T_accept = package.updatedAt)
  ├── 2. Extract Constituent Proposals (Prop_1, Prop_2, ... Prop_n)
  │
  ▼
Per-Proposal Verification
  ├── A. Select Candidate DocumentVersion (createdAt >= T_accept)
  ├── B. Evaluate Deterministic Match (Proposed Diff vs Candidate Content/Checksum)
  └── C. Inspect Extraneous Edits (Scope Variance Analysis)
  │
  ▼
Package-Level Aggregation
  ├── All Proposals FULFILLED (No Scope Variance)  ──> FULFILLED (CLEAN_ATTESTATION_ELIGIBLE)
  ├── All Proposals FULFILLED (1+ Scope Variance)   ──> FULFILLED (REQUIRES_SCOPE_REVIEW)
  ├── Some Proposals FULFILLED, Some UNFULFILLED    ──> PARTIALLY_FULFILLED (INELIGIBLE)
  └── Zero Proposals FULFILLED                      ──> UNFULFILLED (INELIGIBLE)
```

---

## Post-Acceptance Version Selection Algorithm

To determine which `DocumentVersion` record serves as the candidate for fulfillment verification of target document $D$ under package $P$:

1. **Package Acceptance Boundary ($T_{\text{accept}}$)**:
   - Read $T_{\text{accept}} = P.\text{updatedAt}$ (timestamp when package status transitioned to `ACCEPTED`).
2. **Query Candidate Post-Acceptance Versions**:
   - Query `DocumentVersion.find({ documentId: D._id, createdAt: { $gte: T_accept } }).sort({ versionNumber: 1 })`.
3. **Version Selection Logic**:
   - **Case 1: Zero Post-Acceptance Versions**:
     - Check if `proposal.acceptedAuthoritativeVersionId` was assigned at proposal acceptance.
     - If assigned, fetch that specific `DocumentVersion`.
     - If no version exists after $T_{\text{accept}}$ and no `acceptedAuthoritativeVersionId` exists $\rightarrow$ Proposal status = `UNFULFILLED` (Reason: `'No post-acceptance DocumentVersion created'`).
   - **Case 2: Exactly One Post-Acceptance Version ($V_1$)**:
     - Select $V_1$ as the candidate version for evaluation.
   - **Case 3: Multiple Post-Acceptance Versions ($V_1, V_2, \dots, V_k$)**:
     - Evaluate candidate versions sequentially from $V_1$ to $V_k$.
     - The first version $V_m$ that satisfies the proposed change payload is selected as the fulfilling version ($V_{\text{fulfilling}} = V_m$).
     - If a subsequent version $V_{\text{latest}}$ ($m < k$) exists after $V_{\text{fulfilling}}$, inspect $V_{\text{latest}}$ to determine if subsequent edits altered the fulfilled content (triggering derived `STALE` or `UNAPPROVED_SCOPE_VARIANCE`).
   - **Case 4: Target Document Soft-Deleted**:
     - If `Document.isDeleted === true` $\rightarrow$ Proposal status = `INDETERMINATE` (Reason: `'Target document is soft-deleted'`).

---

## Coherent Verification Snapshot

The attestation binds a precise, immutable tuple of target document version snapshots representing the exact historical point-in-time state of the repository verified by the attestation:

```typescript
export interface TargetDocumentVersionSnapshot {
  documentId: Types.ObjectId;
  proposalId: Types.ObjectId;
  documentVersionId: Types.ObjectId;
  versionNumber: number;
  checksum: string;
  proposalStatus: 'FULFILLED' | 'UNFULFILLED' | 'INDETERMINATE' | 'UNSUPPORTED';
}
```

This ensures that the attestation does not combine arbitrary versions from unrelated points in history, but binds the exact coherent set of versions evaluated during verification.

---

## Proposal-Type Verification Matrix

| Proposal Type | Expected State | Actual State | Comparison Method | Fulfilled Condition | Partial / Unfulfilled Condition | Indeterminate / Unsupported Condition |
|---|---|---|---|---|---|---|
| **`DOCUMENT_CONTENT_UPDATE`** | `proposedChange.content` string or SHA-256 hash | Candidate `DocumentVersion.content` & `checksum` | SHA-256 checksum equality & exact string diff match | Candidate `checksum === hash(proposedChange.content)` OR candidate content contains proposed update exactly | Unfulfilled: Candidate content unchanged since acceptance. | Indeterminate: Stored proposal payload lacks sufficient data to reconstruct expected content diff. |
| **`TECHNICAL_CONTRACT_UPDATE`** | `proposedChange.contractSchema` (JSON Schema) | Candidate `DocumentVersion.content` parsed JSON | Deterministic structural JSON Schema validation | Candidate JSON content satisfies `contractSchema` without schema errors | Unfulfilled: Document content fails JSON Schema validation or is unedited | Unsupported: Candidate document content is non-JSON plain text. |
| **`RELATIONSHIP_UPDATE`** | `proposedChange.relationshipOperations` (`ADD`/`REMOVE`) | Active `DocumentRelationship` records in DB | Source ID, Target ID, & Relationship Type lookup | For `ADD`: active relationship exists in DB. For `REMOVE`: relationship deleted from DB. | Unfulfilled: Proposed relationship missing or not removed. | Indeterminate: Target relationship document soft-deleted. |
| **`DEPRECATION_PROPOSAL`** | Target `Document.status = 'DEPRECATED'` | Target `Document.status` in DB | Document status string equality | `Document.status === 'DEPRECATED'` | Unfulfilled: `Document.status !== 'DEPRECATED'` | Indeterminate: Target document soft-deleted. |

---

## Scope Variance Model

### `UNAPPROVED_SCOPE_VARIANCE` Definition

Scope variance occurs when a candidate `DocumentVersion` fulfills the accepted proposal's core changes but introduces additional unapproved content or metadata edits outside the accepted proposal scope.

### Orthogonal Model Structure:

Scope variance does NOT create a 7th `fulfillmentStatus` enum. It is modeled as orthogonal boolean and detail fields:

```typescript
export interface ScopeVarianceEvaluation {
  hasScopeVariance: boolean;
  scopeVarianceDetails: Array<{
    targetDocumentId: Types.ObjectId;
    varianceType: string;
    description: string;
  }>;
}
```

### Governance Impact Matrix:

| Condition | Proposal Status | Package Status | `hasScopeVariance` | `attestationEligibility` |
|---|---|---|---|---|
| **Exact Proposed Match** | `FULFILLED` | `FULFILLED` | `false` | **`CLEAN_ATTESTATION_ELIGIBLE`** |
| **Core Proposed Match + Extraneous Edits** | `FULFILLED` | `FULFILLED` | `true` | **`REQUIRES_SCOPE_REVIEW`** |
| **Target Document Unedited** | `UNFULFILLED` | `UNFULFILLED` | `false` | **`INELIGIBLE`** |
| **Unparseable / Broken Content** | `INDETERMINATE` | `INDETERMINATE` | `false` | **`INELIGIBLE`** |

- **`CLEAN_ATTESTATION_ELIGIBLE`**: All proposals `FULFILLED` with zero scope variance. `POST .../attest` succeeds cleanly.
- **`REQUIRES_SCOPE_REVIEW`**: All proposals `FULFILLED` but 1+ documents contain extraneous unapproved edits. `POST .../attest` requires explicit steward opt-in (`confirmScopeVariance: true`) and records `hasScopeVariance: true` in the immutable attestation record.
- **`INELIGIBLE`**: 1+ proposals `UNFULFILLED`, `INDETERMINATE`, or `UNSUPPORTED`. `POST .../attest` is blocked with HTTP 400 Bad Request.

---

## Package Aggregation Rules

Package-level `fulfillmentStatus` is aggregated deterministically from constituent proposal outcomes:

1. **`FULFILLED`**: 100% of constituent proposals evaluate to `FULFILLED`.
2. **`PARTIALLY_FULFILLED`**: At least 1 proposal evaluates to `FULFILLED`, but 1+ proposals evaluate to `UNFULFILLED`.
3. **`UNFULFILLED`**: 100% of constituent proposals evaluate to `UNFULFILLED`.
4. **`INDETERMINATE`**: Any constituent proposal evaluates to `INDETERMINATE`.
5. **`UNSUPPORTED`**: Any constituent proposal evaluates to `UNSUPPORTED`.

Package aggregation does not mask constituent failures.

---

## Attestation Design & Data Minimality

### Persisted Primitive: `PackageFulfillmentAttestation`

Phase 17 creates a dedicated persistent model: `PackageFulfillmentAttestation`.

#### Minimal Schema Specification:

To prevent data duplication, the schema persists ONLY immutable binding fields:

```typescript
export interface IPackageFulfillmentAttestation extends Document {
  attestationNumber: string; // ATT-YYYYMMDD-XXXX
  packageId: Types.ObjectId;
  projectId: Types.ObjectId;
  attestationVersion: number; // 1, 2, 3...
  packageStateFingerprint: string;
  fulfillmentStatus: 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'UNFULFILLED' | 'INDETERMINATE' | 'UNSUPPORTED' | 'STALE';
  fulfillmentPercentage: number;
  hasScopeVariance: boolean;
  attestationEligibility: 'CLEAN_ATTESTATION_ELIGIBLE' | 'REQUIRES_SCOPE_REVIEW' | 'INELIGIBLE';
  targetVersionSnapshots: Array<{
    documentId: Types.ObjectId;
    proposalId: Types.ObjectId;
    documentVersionId: Types.ObjectId;
    versionNumber: number;
    checksum: string;
    proposalStatus: string;
  }>;
  scopeVarianceDetails: Array<{
    targetDocumentId: Types.ObjectId;
    varianceType: string;
    description: string;
  }>;
  attestedByUserId: Types.ObjectId;
  attestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

*Note: Proposal titles, document names, full content diffs, and baseline handoff objects are NOT stored in this model. They are derived dynamically during GET queries to eliminate data redundancy.*

---

## Attestation Immutability

1. **Schema & Model Freeze**:
   - `PackageFulfillmentAttestation` Mongoose schema defines `immutable: true` on critical fields and includes a pre-save hook blocking updates if `!this.isNew`.
   - `package-fulfillment-attestation.service.ts` contains ZERO update (`update`/`patch`) or delete (`delete`/`remove`) methods.
2. **API Endpoint Constraints**:
   - Endpoints expose `POST` (create verification / attest) and `GET` (read / list) ONLY. No `PUT`, `PATCH`, or `DELETE` endpoints exist for attestations.
3. **Unique Compound Index**:
   - Index `{ packageId: 1, attestationVersion: 1 }` guarantees that a specific attestation version for a package can never be overwritten.
4. **System Invariant**:
   - Once written to MongoDB, a `PackageFulfillmentAttestation` document's package ID, proposal IDs, version IDs, checksums, and attestation decision CANNOT be modified through the application.

---

## Multiple Versioned Attestations Policy

A package MAY possess multiple immutable attestation records (`attestationVersion: 1, 2, 3...`) over time as target documents evolve:

```text
Package PKG-001 (Accepted at T1)
  ├── Attestation Version 1 (Issued at T2, Snapshots = [DocA: v2, DocB: v3]) -> IMMUTABLE
  └── (DocA updated to v3 at T3)
  └── Attestation Version 2 (Issued at T4, Snapshots = [DocA: v3, DocB: v3]) -> IMMUTABLE
```

1. **Attestation Versioning**: Initial attestation for a package is created as `attestationVersion: 1`.
2. **Historical Preservation**: Attestation Version 1 remains unchanged in MongoDB forever as a historical audit artifact.
3. **Re-Attestation Trigger**: If target documents are updated again after Attestation Version 1 (creating newer `DocumentVersion` records), triggering attestation creation creates a new record as `attestationVersion: 2`.

---

## Derived Attestation Staleness vs. Immutable DB Records

It is vital to separate database record immutability from derived validity:

- **Immutable Database Record**: The `PackageFulfillmentAttestation` document stored in MongoDB retains its historical `fulfillmentStatus` (e.g. `FULFILLED`) forever. It is **NEVER** mutated to `STALE` in MongoDB.
- **Derived Attestation Validity**: Computed dynamically during GET API calls by comparing the stored attestation against current repository state:

```typescript
export interface DerivedAttestationValidity {
  isCurrentlyValid: boolean;
  isStale: boolean;
  stalenessReasons: string[];
}
```

### Derived Staleness Calculation Rules:

Derived validity returns `isStale: true` if ANY of the following conditions are met:
1. **Newer Version Created**: Target document $D$ has a `DocumentVersion` with `versionNumber > snapshot.versionNumber`.
2. **Fingerprint Divergence**: Current `computePackageStateFingerprint(packageId)` diverges from `attestation.packageStateFingerprint`.
3. **Document Soft-Deleted**: Target document has `isDeleted === true`.
4. **Relationship Mutated**: Active `DocumentRelationship` verified in attestation was deleted or modified post-attestation.

---

## Baseline Eligibility Handoff

### Phase 12 Integration Boundary

Phase 17 **MUST NOT** automatically re-baseline `DocumentationBaseline`. Phase 12 (`createBaseline`) remains the single authoritative baseline creation engine.

- **Previous Flow (REJECTED)**: `Attestation → Automatic / 1-Click Re-Baselining`
- **Revised Flow (APPROVED)**: `Attestation → Derived Baseline Eligibility Handoff Payload`

### Derived Handoff Payload Structure:

When a GET request is made for an active `PackageFulfillmentAttestation`, the service derives a structured **Baseline Eligibility Handoff Payload** dynamically:

```typescript
export interface BaselineEligibilityHandoff {
  isEligible: boolean;
  eligibilityReason?: string;
  attestationId: string;
  packageId: string;
  recommendedBaselineInput: {
    name: string;
    versionTag: string;
    description: string;
  };
  targetDocumentSnapshots: Array<{
    documentId: string;
    versionNumber: number;
    checksum: string;
  }>;
}
```

The Project Owner or Admin must explicitly invoke Phase 12 `createBaseline` passing this handoff payload. Zero automated baseline mutations occur in Phase 17.

---

## Cross-Project Authorization & Security

1. **Permission Separation**:
   - **READ Users**: Can check fulfillment (`POST .../verify-fulfillment`), view attestations (`GET .../attestations`), and inspect baseline handoff payloads. READ users **CANNOT** issue attestations (`403 Forbidden`).
   - **EDIT / ADMIN Users**: Required to issue attestations (`POST .../attest`) and invoke Phase 12 re-baselining.
2. **Cross-Project Authorization**:
   - Reuses Phase 14 `checkUserProjectReadAccess` and `checkUserProjectEditAccess`.
   - Packages containing proposals targeting cross-project documents require READ access on all target projects.
   - Unauthorized target documents or connected project topology nodes are strictly omitted from verification reports (`UNAUTHORIZED_ENTITY_OMITTED`). Zero leakage of unauthorized document IDs, titles, or checksums.

---

## Audit & Governance Integration

1. **`DocumentAuditAction` Extensions**: Add the following audit actions to `DocumentAuditAction` in `apps/api/src/modules/documents/document-audit.model.ts`:
   - `PACKAGE_FULFILLMENT_VERIFIED` (Logged on fulfillment verification check)
   - `PACKAGE_ATTESTED` (Logged when immutable attestation is created)
2. **Staleness GET Read Audit Invariant**: Routine GET API calls that discover derived attestation staleness perform ZERO database updates and create ZERO audit log entries.
3. **Phase 10 Assurance Integration**: Attestation status is included as a derived input in `calculateDocumentAssurance` under `CHANGE_IMPACT` category without altering Phase 10 authority.

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
   - Status: `201 Created` (or `400 Bad Request` if package is not `ACCEPTED` or `attestationEligibility === 'INELIGIBLE'`).
3. **`GET /api/v1/change-packages/:id/attestations`**:
   - Description: Lists all historical attestation records for a package, ordered by `attestationVersion: -1`.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectReadAccess`.
   - Status: `200 OK`.
4. **`GET /api/v1/change-packages/:id/attestations/:attestationVersion`**:
   - Description: Retrieves a specific historical attestation by version number.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectReadAccess`.
   - Status: `200 OK` (or `404 Not Found`).
5. **`GET /api/v1/change-packages/:id/attestation`**:
   - Description: Retrieves the latest attestation alongside derived current staleness validity and baseline handoff payload.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectReadAccess`.
   - Status: `200 OK`.
6. **`GET /api/v1/projects/:projectId/attestations`**:
   - Description: Lists all package attestations for a project.
   - Authentication: Required (`authenticate`).
   - Authorization: `checkUserProjectReadAccess`.
   - Status: `200 OK`.

---

## Frontend Design

1. **`FulfillmentAttestationCard` Component (`apps/web/src/features/change-packages/components/FulfillmentAttestationCard.tsx`)**:
   - Renders inside `ChangePackageDetailsDrawer` on `ProjectDetailsPage`.
   - Displays categorical fulfillment status badge (`FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `STALE`), derived fulfillment percentage, scope variance alerts, attestation eligibility indicator, and historical attestation dropdown.
   - For EDIT/ADMIN users on `ACCEPTED` & eligible packages: displays "Issue Attestation" button (with scope variance confirmation checkbox if `REQUIRES_SCOPE_REVIEW`).
   - Displays 1-click "Create Baseline from Handoff" button linking to Phase 12 baseline modal.

---

## Concurrency & Idempotency Safeguards

1. **Atomic Idempotency Check**:
   - When `POST .../attest` is called, the service queries existing attestations for `packageId`.
   - If an attestation already exists with identical target `DocumentVersion` IDs and package fingerprint, the API returns the existing attestation (`HTTP 200 OK`) without creating a duplicate database record.
2. **Compound Index Protection**:
   - Compound unique index `{ packageId: 1, attestationVersion: 1 }` prevents concurrent duplicate version creation at the database layer.

---

## Performance & Query Design

1. **Bulk DocumentVersion Retrieval**: Single bulk query (`DocumentVersion.find({ documentId: { $in: targetDocIds }, createdAt: { $gte: packageAcceptanceTimestamp } })`) sorted by `versionNumber: 1` to eliminate N+1 version queries.
2. **Bulk Relationship Lookup**: Single batch query for active relationships across all target documents.
3. **Zero N+1 Hydration**: All target documents, proposals, and projects loaded in unified batch queries.

---

## Architectural Boundaries

Phase 17 respects existing system authorities without creating competing engines:

| Component | Single Authoritative Responsibility |
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

### NEW FILES (6):

1. `apps/api/src/modules/change-packages/package-fulfillment-attestation.model.ts`: `PackageFulfillmentAttestation` Mongoose schema & TypeScript interfaces.
2. `apps/api/src/modules/change-packages/package-fulfillment-calculator.ts`: Pure in-memory fulfillment calculation engine & version selection algorithm.
3. `apps/api/src/modules/change-packages/package-fulfillment-attestation.service.ts`: Attestation service orchestrating verification, attestation creation, derived validity calculation, and baseline eligibility handoffs.
4. `apps/api/src/modules/change-packages/package-fulfillment-attestation.controller.ts`: Express controller handlers for verification and attestation endpoints.
5. `apps/api/src/modules/change-packages/package-fulfillment-attestation.schema.ts`: Zod validation schemas for API inputs.
6. `apps/api/src/modules/change-packages/run_phase17_qa.ts`: Comprehensive 30-scenario automated QA runner.

### MODIFIED FILES (5):

1. `apps/api/src/modules/documents/document-audit.model.ts`: Add `PACKAGE_FULFILLMENT_VERIFIED` and `PACKAGE_ATTESTED` to `DocumentAuditAction` enum & schema validation array.
2. `apps/api/src/modules/change-packages/change-package.routes.ts`: Mount verification and attestation endpoints.
3. `apps/web/src/features/change-packages/change-package.api.ts`: Add frontend API client methods (`verifyPackageFulfillment`, `attestPackageFulfillment`, `getPackageAttestation`, `getHistoricalAttestation`).
4. `apps/web/src/features/change-packages/change-package.types.ts`: Add TypeScript types for fulfillment & attestation.
5. `apps/web/src/features/change-packages/components/ChangePackageDetailsDrawer.tsx`: Integrate `FulfillmentAttestationCard`.

---

## Implementation Order

1. **Step 1 (Model & Audit Enum)**: Create `package-fulfillment-attestation.model.ts` and add audit actions to `document-audit.model.ts`.
2. **Step 2 (Pure Calculator)**: Implement `package-fulfillment-calculator.ts` with pure deterministic comparison logic across all 4 proposal types and post-acceptance version selection algorithm.
3. **Step 3 (Attestation Service)**: Implement `package-fulfillment-attestation.service.ts` with verification, attestation creation, derived validity calculation, and baseline eligibility handoff generation.
4. **Step 4 (Schemas & Controllers)**: Implement `package-fulfillment-attestation.schema.ts` and `package-fulfillment-attestation.controller.ts`.
5. **Step 5 (Routes)**: Mount endpoints in `change-package.routes.ts`.
6. **Step 6 (Automated QA Runner)**: Implement `run_phase17_qa.ts` covering 30 QA matrix scenarios.
7. **Step 7 (Frontend API & Types)**: Update `change-package.types.ts` and `change-package.api.ts`.
8. **Step 8 (Frontend UI)**: Implement `FulfillmentAttestationCard.tsx` and integrate into `ChangePackageDetailsDrawer.tsx`.
9. **Step 9 (Verification & Test Suite)**: Execute typechecks, ESLint, full Vitest suite, QA runners 10-17, and production build.

---

## QA Matrix Scenarios (30 Scenarios)

1. Accepted package verification returns `FULFILLED` when all target document versions match accepted proposals.
2. Unaccepted package (DRAFT/UNDER_REVIEW) verification rejected with HTTP 400.
3. Proposal type `DOCUMENT_CONTENT_UPDATE` fulfilled when candidate `DocumentVersion` checksum matches proposed content.
4. Proposal type `TECHNICAL_CONTRACT_UPDATE` fulfilled when document content matches proposed JSON schema.
5. Proposal type `RELATIONSHIP_UPDATE` (`ADD_RELATIONSHIP`) fulfilled when active relationship exists in DB.
6. Proposal type `RELATIONSHIP_UPDATE` (`REMOVE_RELATIONSHIP`) fulfilled when relationship is deleted from DB.
7. Proposal type `DEPRECATION_PROPOSAL` fulfilled when target `Document.status === 'DEPRECATED'`.
8. Post-acceptance version selection algorithm selects correct candidate `DocumentVersion` (`createdAt >= T_accept`).
9. Un-updated target document returns `UNFULFILLED` status.
10. Partially updated package returns `PARTIALLY_FULFILLED` status.
11. Unparseable diff format returns `INDETERMINATE` status.
12. Unrecognized proposal payload returns `UNSUPPORTED` status.
13. Extraneous edits outside proposed diff trigger `hasScopeVariance = true` and `attestationEligibility = 'REQUIRES_SCOPE_REVIEW'`.
14. Issuing attestation on unfulfilled package rejected with HTTP 400.
15. Issuing attestation on `FULFILLED` package creates immutable `PackageFulfillmentAttestation` record (`attestationVersion: 1`).
16. Issuing attestation on `REQUIRES_SCOPE_REVIEW` package succeeds with explicit scope review opt-in.
17. Attempting to mutate or update attestation DB record fails due to schema immutability.
18. Duplicate attestation request with identical versions returns existing attestation (HTTP 200 OK).
19. Re-attestation after newer `DocumentVersion` created creates Attestation Version 2 (`attestationVersion: 2`) while Attestation Version 1 remains intact in DB.
20. Derived attestation validity calculates `isStale: true` when target document receives newer version post-attestation.
21. Derived attestation validity calculates `isStale: true` when target document relationship is deleted post-attestation.
22. Routine GET API call discovering staleness performs 0 DB mutations and creates 0 audit events.
23. Unauthorized user (non-member) denied access to verification endpoint (HTTP 403).
24. READ user can check fulfillment, view attestation details, and list historical attestations.
25. READ user attempting to issue attestation rejected with HTTP 403 Forbidden.
26. EDIT / ADMIN user successfully issues attestation.
27. Cross-project ACL strictly omits unauthorized project nodes/documents from verification report.
28. Zero sensitive credentials or user emails leaked in attestation payload.
29. Attestation generates derived Baseline Eligibility Handoff Payload.
30. Baseline Eligibility Handoff Payload used by Phase 12 `createBaseline` without automatic baseline mutation.

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

Phase 17 Implementation Plan v3 is **APPROVED AND READY FOR IMPLEMENTATION**.

It provides a deterministic, repository-grounded, permission-isolated fulfillment verification and attestation engine that closes the governance loop between Phase 16 package acceptance and Phase 12 baseline creation while strictly preserving repository facts, immutability invariants, and system boundaries.
