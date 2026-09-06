# Phase 16 — Implementation Plan v2
**Multi-Document Change Packages & Coordinated Impact Simulation**

---

## 1. Baseline

- **Repository**: Documan
- **Current Baseline**: `main = origin/main = 34dc165de1edfce4c16656eccfe47386f9203ac0`
- **Preceding Phase**: Phase 15 — Pre-Change Impact Simulation & Change Proposal Engine (`Implementation: e27958f`, `Merge: 196443d`, `Roadmap Closeout: 34dc165`)
- **Planning Artifact**: `docs/research/PHASE-16-IMPLEMENTATION-PLAN-v2.md`
- **Status**: PLANNING ONLY (No application source code, schema, API, or frontend edits).

---

## 2. Repository-Fact Verification

The following facts were directly inspected and verified from the current repository codebase:

- **[FACT] Phase 15 Primitives**:
  - `DocumentChangeProposal` model (`apps/api/src/modules/change-proposals/change-proposal.model.ts`): Contains `proposalNumber`, `projectId`, `targetDocumentId`, `title`, `description`, `proposalType`, `proposedChange`, `status`, `createdBy`, `reviewedBy`, `reviewComment`, `lastSimulatedAt`, `simulationStateFingerprint`, `lastSimulationStatus`, `simulationResultCache`, `acceptedAuthoritativeVersionId`.
  - `ProposalType` enum: `DOCUMENT_CONTENT_UPDATE`, `TECHNICAL_CONTRACT_UPDATE`, `RELATIONSHIP_UPDATE`, `DEPRECATION_PROPOSAL`.
  - `ProposalStatus` enum: `DRAFT`, `SIMULATED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `DISCARDED`.
  - Ephemeral Simulation (`change-proposal-simulation.service.ts`): `runChangeProposalSimulation` takes target document ID, proposal type, and proposed change payload, executing an in-memory overlay simulation without producing DB mutations or audit logs.
  - State Fingerprint (`change-proposal-fingerprint.ts`): `computeSimulationStateFingerprint` returns a canonical SHA-256 hash over target doc tuple, baseline tuple, sorted relationship tuples, and sorted topology link tuples.
- **[FACT] Phase 14 Authorization & Privacy**:
  - `checkUserProjectReadAccess` (`apps/api/src/modules/projects/project-topology.service.ts`): Validates user read access against project owner, project member, or document share. Unauthorized projects are completely omitted from impact graph responses.
- **[FACT] Phase 13 Work Request Primitives**:
  - `checkProjectAccess` & `createWorkRequestInternal` (`apps/api/src/modules/governance/work-request.service.ts`): Governs project authority and creates `DocumentationWorkRequest` records with `originKey` partial unique index.
- **[FACT] Phase 12 Baseline & Drift Primitives**:
  - `DocumentationBaseline` (`apps/api/src/modules/governance/documentation-baseline.model.ts`): Holds project baseline snapshots with document content checksums.
- **[FACT] Phase 11 Verification Primitives**:
  - `VerificationPlan` & `VerificationTask` (`apps/api/src/modules/governance/verification-plan.service.ts`): Generates task priorities (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and verification methods (`TECHNICAL_REVIEW`, `STAKEHOLDER_SIGN_OFF`, `DEPENDENCY_CHECK`).
- **[FACT] Phase 10 Assurance Primitives**:
  - `calculateDocumentAssurance` (`apps/api/src/modules/governance/assurance-calculator.ts`): Evaluates release gate checks and calculates document gate status (`PASSED`, `WARNING`, `FAILED`, `GOVERNANCE_DISABLED`).
- **[FACT] Phase 9 Evidence Primitives**:
  - `calculateEvidenceCoverage` (`apps/api/src/modules/knowledge/evidence-calculator.js`): Returns pure evidence score and link statuses.
- **[FACT] Phase 7.3 Impact Primitives**:
  - `document-impact-cascade.service.ts`: Multi-hop graph impact traversal bounds (`MAX_DEPTH = 3`, `MAX_NODES = 50`).
- **[FACT] Document Audit Actions**:
  - `DocumentAudit` (`apps/api/src/modules/documents/document-audit.model.ts`): Immutable append-only audit model. Requires updating the action union type for new package-level audit actions.

---

## 3. Product Objective

Phase 16 extends Documan's pre-change decision support from **single-document change proposals** (Phase 15) to **multi-document change packages** (`DocumentChangePackage`).

### Core Value Proposition:
In complex software engineering environments, major technical updates (such as breaking API migrations, system architecture refactoring, and multi-service deprecations) span multiple documents across multiple projects simultaneously.

Phase 16 allows technical leads, system architects, and technical writers to:
1. Group multiple candidate `DocumentChangeProposal` items into a single, reviewable `DocumentChangePackage`.
2. Execute an **aggregate read-only simulation** (`POST /api/change-packages/:id/simulate`) that overlay-simulates all proposals in the package simultaneously.
3. Reason about combined multi-document blast radius, deduplicated downstream impact nodes, inter-proposal operation conflicts, joint verification requirements, combined baseline drift, and aggregate release gate status.
4. Review and accept/reject the change package as an atomic unit, producing a unified handoff payload for multi-document authoritative version creation and baseline snapshot updates.

---

## 4. Scope

- **Package Container Model (`DocumentChangePackage`)**: Persisted model bundling multiple `DocumentChangeProposal` records.
- **Aggregate Read-Only Package Simulation**: In-memory multi-proposal overlay simulation engine.
- **Inter-Proposal Conflict Detection**: Deterministic detection of incompatible constituent proposal operations (e.g., mutually contradictory content updates, conflicting relationship operations, or proposal deprecating a document targeted for content expansion).
- **Blast Radius Deduplication**: Unification and deduplication of downstream impacted nodes across all proposals in the package while preserving distinct impact detail explainability.
- **Combined Subsystem Integration**: Aggregation of predicted evidence scores, joint release gate status, joint verification tasks, and combined baseline drift.
- **Privacy-Safe Multi-Project Disclosure**: Strict enforcement of `checkUserProjectReadAccess` across all target documents and connected projects.
- **Package Fingerprinting & Staleness**: Canonical SHA-256 package fingerprint computation with independent proposal staleness tracking based on authoritative state divergence.
- **Package Review & Acceptance Handoff**: Atomic package review workflow producing structured handoff instructions for Phase 7.4 version creation and Phase 13 work request creation.
- **Frontend UI Integration**: Project-level package table (`ProjectChangePackagesTab`) and package details view (`ChangePackageDetailsDrawer`).

---

## 5. Non-Goals

Phase 16 strictly avoids:

- **NO Automatic Document Mutation**: Package acceptance does NOT directly mutate document content or create `DocumentVersion` records.
- **NO Second Impact Engine / NO Execution Engine**: Does not fork or duplicate Phase 7.3/9/10/11/12/14/15 primitives and does not introduce a package change execution engine.
- **NO Git / Monorepo Execution**: Does not execute Git commits, PR creation, or VCS branch management.
- **NO Code Refactoring / LLM Code Generation**: Does not generate code, parse ASTs, or invoke AI/LLM systems.
- **NO Automatic Work Request Creation During Simulation**: Ephemeral package simulation creates 0 DB side-effects.
- **NO Overwriting ACL Boundaries**: Package operations never bypass project ownership or document permissions.
- **NO Deployment / CI Pipeline Runner**: Does not execute deployment jobs or act as a CI/CD build runner.

---

## 6. Architecture

Phase 16 operates strictly as an orchestration and aggregation layer positioned above Phase 15 proposal primitives and existing authoritative subsystem calculators.

```text
                                Constituent Proposals
                       [Proposal A, Proposal B, Proposal C]
                                        │
                                        ▼
                   Phase 16 Package Simulation Orchestrator
                   (change-package-simulation.service.ts)
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   1. Multi-Doc Overlay        2. Conflict Detection      3. Impact Deduplication
     In-Memory Graph           - Contradictory Ops        - Aggregate Doc Roster (docId)
     State Construction        - Circular Deprecations    - Impact Detail Keys (category/edge)
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                                        ▼
                  Subsystem Predictions (In-Memory Pure Adapters)
      ┌──────────────────┬──────────────┴───┬──────────────────┐
      ▼                  ▼                  ▼                  ▼
  Phase 9 Evidence   Phase 10 Gate    Phase 11 Tasks     Phase 12 Drift
  (Combined Score)  (Joint Status)    (Deduplicated)     (Combined Status)
                                        │
                                        ▼
                       Privacy & Disclosure Filter
                     (checkUserProjectReadAccess ACL)
                                        │
                                        ▼
                         Deduplicated Package Output
                          (SimulationResultDTO)
```

---

## 7. Data Model

### [DESIGN] `DocumentChangePackage` Mongoose Model & Schema

Path: `apps/api/src/modules/change-packages/change-package.model.ts`

```typescript
export enum PackageStatus {
  DRAFT = 'DRAFT',
  SIMULATED = 'SIMULATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DISCARDED = 'DISCARDED',
}

export interface IDocumentChangePackage extends Document {
  packageNumber: string;               // e.g. PKG-PROJ1-0001
  projectId: Types.ObjectId;           // Primary project context
  title: string;                       // Package title
  description?: string;                // Rationale / scope
  proposals: Types.ObjectId[];         // Array of DocumentChangeProposal IDs
  status: PackageStatus;
  createdBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewComment?: string;
  lastSimulatedAt?: Date;
  packageStateFingerprint?: string;   // Composite canonical SHA-256
  lastSimulationStatus?: string;      // COMPLETE | TRUNCATED_PARTIAL | INDETERMINATE | UNSUPPORTED
  simulationResultCache?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### [DESIGN] Schema Constraints & Indexes:
- Compound Index: `{ projectId: 1, packageNumber: 1 }` (Unique).
- Index: `{ proposals: 1 }` (Fast lookup of packages containing a given proposal).
- Index: `{ status: 1 }`.

---

## 8. Lifecycle

Phase 16 uses an explicit 6-state package lifecycle aligned with Phase 15:

```text
    DRAFT ──► SIMULATED ──► UNDER_REVIEW ──► ACCEPTED
      │           │              │
      ├───────────┴──────────────┼───────► REJECTED
      │                          │
      └──────────────────────────┴───────► DISCARDED
```

### [DESIGN] Lifecycle State Definitions & Acceptance Boundary:
- **`DRAFT`**: Package created, proposals attached/removed.
- **`SIMULATED`**: Aggregate simulation executed successfully; `packageStateFingerprint` stored.
- **`UNDER_REVIEW`**: Package submitted for technical review (proposals locked against addition/removal).
- **`ACCEPTED`**: Package approved by project lead; persists package state as `ACCEPTED` and attached proposal states as `ACCEPTED`, returning structured handoff payload. Zero `APPLIED` state exists.
- **`REJECTED`**: Package rejected during review with comments.
- **`DISCARDED`**: Package abandoned by creator.

```text
=================================================================================
IMPORTANT BOUNDARY: ACCEPTANCE IS NOT EXECUTION
=================================================================================
SIMULATION  ──►  REVIEW  ──►  ACCEPTANCE DECISION  ──►  AUTHORITATIVE WORKFLOW
 (Read-Only)    (Human)       (Persists ACCEPTED)       (Phase 7.4 Version Creation)
=================================================================================
```

Accepting a package does NOT create `DocumentVersion` records or mutate document content. The handoff payload guides the user to execute version creation through the existing Phase 7.4 workflow.

---

## 9. Package/Proposal Semantics

### Deterministic Relationship Rules:
1. **Reuse over Duplication**: Proposals remain independently persisted `DocumentChangeProposal` records. A package stores an array of proposal ObjectIDs (`proposals: [ObjectId]`).
2. **Proposal Membership**: A proposal MAY belong to one or more packages in `DRAFT` status. In `DRAFT`, proposals can be added or removed.
3. **Draft Lock on Review**: When a package transitions to `UNDER_REVIEW`, proposal membership is locked.
4. **Independent Staleness**: Proposal membership in multiple packages does **NOT** cause staleness. Accepting Package A does **NOT** mark Package B stale unless authoritative document state subsequently changes.
5. **Post-Acceptance Reference**: When Package A is accepted, constituent proposals transition to `ACCEPTED`. If Package B references a proposal that was accepted in Package A, Package B simulation will report that the proposal is already `ACCEPTED`.

---

## 10. Fingerprinting & Staleness

### [DESIGN] Canonical Package Fingerprint (`computePackageStateFingerprint`)

The package fingerprint is a canonical SHA-256 hash computed by serializing:
1. Package ID and title tuple.
2. Sorted list of constituent proposal ObjectIDs and their individual `simulationStateFingerprint` values.
3. Target document state tuples for all targeted documents in the package.
4. Active baseline snapshot checksums for primary and connected projects.
5. Lexicographically sorted relationship and topology tuples across all target documents.

```text
PKG:pkgId:title
PROP:propId1:fingerprint1
PROP:propId2:fingerprint2
DOC:docId1:version:updatedAt:checksum
DOC:docId2:version:updatedAt:checksum
BASELINE:projId1:baselineChecksum
...
```

### Staleness Evaluation Rule:
- **Authoritative Divergence Rule**: A package is `isStale = true` ONLY when its stored `packageStateFingerprint` differs from current authoritative state, or if ANY constituent proposal's SHA-256 fingerprint mismatches current authoritative state.
- **No Cross-Package Invalidation**: Accepting Package A does NOT mark Package B stale simply because they share a proposal. Staleness occurs ONLY when authoritative document state changes.
- **Per-Proposal Breakdown**: Package status response includes per-proposal staleness details (`proposalStaleness: [{ proposalId, isStale, reason }]`), allowing users to identify exact mismatch sources.

---

## 11. Deterministic Package Simulation

Package simulation (`runChangePackageSimulation`) executes the following 10-step deterministic algorithm:

1. **Fetch & Validate Proposals**: Load all constituent `DocumentChangeProposal` records. Validate that all target documents exist and are active.
2. **Normalize Operations**: Extract all proposed content updates, schema updates, relationship operations (`ADD_RELATIONSHIP` / `REMOVE_RELATIONSHIP`), and deprecation flags across all proposals.
3. **Inter-Proposal Conflict Detection**: Execute conflict analyzer (Section 12). If unresolvable contradictory operations exist, set status to `INDETERMINATE` or `UNSUPPORTED`.
4. **Construct Multi-Document Simulated State**: Build in-memory graph representation applying all proposed relationship additions and removals simultaneously over current authoritative graph state.
5. **Traverse Deduplicated Blast Radius**: Run bounded multi-hop graph traversal (`MAX_DEPTH = 3`, `MAX_NODES = 50`) starting from ALL target document nodes simultaneously.
6. **Aggregate & Deduplicate Nodes**: Merge visited downstream nodes using `documentId` for aggregate roster while retaining distinct `impactDetails` (Section 13).
7. **Calculate Combined Evidence Score**: Evaluate `calculateEvidenceCoverage` across the combined simulated document context.
8. **Evaluate Joint Release Gate Status**: Run `calculateDocumentAssurance` for all target documents under simulated state and compute lowest common denominator gate status (`PASSED` < `WARNING` < `FAILED`).
9. **Predict Combined Baseline Drift**: Compare simulated state against active `DocumentationBaseline` snapshots for all affected projects.
10. **Apply ACL Disclosure Filter**: Run `checkUserProjectReadAccess` to completely omit unauthorized project nodes and edges from response.

---

## 12. Conflict Model

Phase 16 defines 5 deterministic conflict classes strictly grounded in repository primitives:

| Conflict Class | Repository Fact & Grounding | Exact Input | Detection Rule | Status Result | Acceptance Effect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`MUTUALLY_EXCLUSIVE_TARGET`** | Multiple proposals in `proposals` array target the same `targetDocumentId` with different `content` payloads. | `targetDocumentId`, `proposedChange.content` | `propA.targetDoc == propB.targetDoc && propA.content != propB.content` | `INDETERMINATE` | Blocks Acceptance |
| **`CONTRADICTORY_RELATIONSHIP`** | Proposal A specifies `ADD_RELATIONSHIP(Source -> Target, Type)`, Proposal B specifies `REMOVE_RELATIONSHIP(Source -> Target, Type)` using actual `DocumentRelationshipType` values (`RELATED`, `REFERENCES`, `REPLACES`, `DEPENDS_ON`). | `operation`, `sourceDocId`, `targetDocId`, `type` | `opA.add(S,T,type) && opB.remove(S,T,type)` | `INDETERMINATE` | Blocks Acceptance |
| **`DEPRECATION_DEPENDENCY_CONFLICT`** | Proposal A sets `status = DEPRECATED` or `DEPRECATION_PROPOSAL` on Doc1, while Proposal B adds a `DEPENDS_ON` relationship targeting Doc1. | `proposalType`, `targetDocumentId`, `relationshipOperations` | `propA.deprecates(Doc1) && propB.addsDependsOn(Doc1)` | `INDETERMINATE` | Blocks Acceptance |
| **`CIRCULAR_DEPENDENCY_INJECTION`** | Multi-document relationship additions introduce a cycle in `DEPENDS_ON` relationships in simulated graph state. | Simulated `DocumentRelationship` adjacency list | Graph DFS cycle detection over `DEPENDS_ON` edges | `UNSUPPORTED` | Blocks Acceptance |
| **`INCOMPATIBLE_CONTRACT_SCHEMA`** | Phase 15 `TECHNICAL_CONTRACT_UPDATE` proposals target same document with contradictory JSON Schema property types. | `proposedChange.contractSchema` | Deterministic structural comparison of top-level JSON Schema `properties` types | `INDETERMINATE` | Blocks Acceptance |

### Bounded Semantic Contract Rules:
- **SUPPORTED**: Deterministic JSON Schema structural comparison (property name and type matching).
- **NOT SUPPORTED**: Generic NLP, LLM, runtime API execution, semantic business rules, or undocumented protocol behavior.
- If compatibility cannot be determined deterministically $\rightarrow$ return `INDETERMINATE` or `UNSUPPORTED`. Never silently convert unknown compatibility into a conflict!

---

## 13. Impact Deduplication

Phase 16 explicitly separates **Document-Level Deduplication** from **Impact-Detail Deduplication**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ A. AGGREGATE AFFECTED DOCUMENT ROSTER (documentId)                      │
│ - Used for total count, UI document list, and high-level summary.       │
│ - Key: documentId                                                       │
│ - Values: title, minDepth = min(depths), contributingProposalIds[]      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ B. IMPACT DETAIL EXPLAINABILITY ROSTER (impactDetailKey)                 │
│ - Preserves distinct impact categories/reasons under each document.     │
│ - Key: category + sourceProposalId + edgeKey                             │
│ - Examples:                                                             │
│   - Category: RELATIONSHIP_IMPACT (Prop A, Edge: Doc1 -> Doc2)          │
│   - Category: BASELINE_DRIFT (Prop B, Checksum delta: sha256...)        │
│   - Category: VERIFICATION_REQUIREMENT (Task: TECHNICAL_REVIEW)         │
└─────────────────────────────────────────────────────────────────────────┘
```

The UI displays **one affected document entry** in the roster, but expanding the entry reveals all distinct impact reasons underneath it without collapsing details.

---

## 14. Verification Aggregation

During package simulation, predicted verification tasks from individual proposal simulations are combined and deduplicated:

- **Deduplication Rule**: If Proposal A and Proposal B both generate a verification task for downstream `DocX` with task type `TECHNICAL_REVIEW`, they are merged into a single predicted verification requirement.
- **Priority Escalation**: If tasks for the same document have different priorities, the highest priority is assigned (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW`).
- **Zero DB Side-Effects**: Package simulation creates **0 `VerificationPlan` or `VerificationTask` DB records**. Verification requirements are output as `predictedVerificationTasks` in simulation DTO only.

---

## 15. Assurance Aggregation

Package-level assurance combines the predicted release gate status across all target documents in the package:

- **Joint Gate Status Rule**:
  - `FAILED` if ANY target document has predicted status `FAILED`.
  - `WARNING` if NO target document is `FAILED`, but at least one is `WARNING`.
  - `PASSED` if ALL target documents have predicted status `PASSED`.
  - `GOVERNANCE_DISABLED` if governance is disabled for the project.
- **Distinction**: Output is labeled explicitly as `predictedJointGateStatus` to distinguish simulated predictions from authoritative persisted Phase 10 assurance evaluations.

---

## 16. Baseline & Drift Simulation

- **Combined Baseline Comparison**: Package simulation evaluates predicted content checksums and relationship edges against active `DocumentationBaseline` snapshots across all projects represented in the package.
- **Combined Drift Status**:
  - `DRIFTED` if any target document or relationship edge introduces baseline drift.
  - `IN_SYNC` if all target changes remain aligned with active baselines.
  - `NO_BASELINE` if any target document's project has no active baseline.
- **Zero Baseline Side-Effects**: Package simulation creates **0 `DocumentationBaseline` or `DriftReport` DB records**.

---

## 17. Cross-Project Topology & ACL

- **Topology-Aware Simulation**: Multi-document packages can include proposals targeting documents across different projects connected by `ProjectTopologyLink`.
- **Strict Authorization Boundary**: Every target document and connected topology link is evaluated against `checkUserProjectReadAccess(userId, targetProjectId)`.
- **Zero-Leakage Privacy Rule**:
  - Unauthorized connected project nodes are **completely omitted** from aggregate impact cascades, blast radius lists, and cross-project counts.
  - Never return placeholder names ("Restricted Project"), obfuscated IDs, hidden counts, or aggregate totals that leak unauthorized topology structure.

---

## 18. Work Request / Authoritative Handoff

### [DESIGN] Handoff Boundary Rules:
1. **Simulation Side-Effects**: Ephemeral package simulation creates **0 `DocumentationWorkRequest` DB records** and **0 notifications**.
2. **Package Acceptance**: Transitioning a package to `ACCEPTED` status executes `acceptChangePackage`.
3. **Persisted Decision Only**: `acceptChangePackage` persists package status as `ACCEPTED` and constituent proposal statuses as `ACCEPTED`.
4. **No Package Execution Engine**: Package acceptance does NOT call document execution scripts, mutate content, or create `DocumentVersion` records.
5. **Structured Handoff Payload**: Acceptance returns `handoffPayload` containing:
   - Ordered list of target documents and proposed content/schema payloads.
   - Recommended execution sequence (dependencies first).
   - Instructions for calling Phase 7.4 `documentVersionService.createVersion` for each document.
   - Instructions for invoking Phase 13 work request creation via existing workflow when authoritative conditions are met.

---

## 19. Audit Model

Package lifecycle actions produce immutable append-only `DocumentAudit` entries.

### [DESIGN] New Audit Action Union Additions:
Update `apps/api/src/modules/documents/document-audit.model.ts`:
- `CHANGE_PACKAGE_CREATED`
- `CHANGE_PACKAGE_SUBMITTED`
- `CHANGE_PACKAGE_ACCEPTED`
- `CHANGE_PACKAGE_REJECTED`
- `CHANGE_PACKAGE_DISCARDED`

*Note: Ephemeral package simulation (`POST /api/change-packages/:id/simulate`) creates 0 audit events.*

---

## 20. API Design

### [DESIGN] New Endpoints:

1. `POST /api/projects/:projectId/change-packages`
   - Create a new `DocumentChangePackage` in `DRAFT` status.
   - Request Body: `{ title, description?, proposalIds?: string[] }`
   - Authorization: Project Owner / Admin / Steward / Member.

2. `GET /api/projects/:projectId/change-packages`
   - List change packages for a project.
   - Authorization: Project Read access.

3. `GET /api/change-packages/:id`
   - Get package details, constituent proposals, staleness breakdown, and cached simulation.
   - Authorization: Project Read access.

4. `POST /api/change-packages/:id/proposals`
   - Add a `DocumentChangeProposal` to a `DRAFT` package.
   - Request Body: `{ proposalId: string }`

5. `DELETE /api/change-packages/:id/proposals/:proposalId`
   - Remove a proposal from a `DRAFT` package.

6. `POST /api/change-packages/:id/simulate`
   - Run aggregate read-only in-memory package simulation.
   - Response: `SimulationResultDTO` with deduplicated blast radius, distinct impact details, conflicts, joint gate status, and predicted verification tasks.

7. `PATCH /api/change-packages/:id/status`
   - Transition package status (`UNDER_REVIEW`, `REJECTED`, `DISCARDED`).
   - Request Body: `{ status, reviewComment? }`

8. `POST /api/change-packages/:id/accept`
   - Accept change package (`UNDER_REVIEW` → `ACCEPTED`) and generate multi-document handoff payload.

---

## 21. Frontend Design

Primary UX surfaces in `apps/web/src/features/change-packages/`:

1. **`ProjectChangePackagesTab.tsx`**: Integrated into `ProjectDetailsPage`. Displays table of project change packages, status badges, proposal count, staleness indicator, and action buttons (`Simulate`, `Submit Review`, `Accept`, `Reject`).
2. **`CreatePackageModal.tsx`**: Modal to name a package and select candidate draft proposals.
3. **`ChangePackageDetailsDrawer.tsx`**: Slide-over drawer presenting:
   - Package metadata and constituent proposals list.
   - Aggregate simulation summary card (Joint Gate Status, Evidence Score, Deduplicated Blast Radius Count).
   - Conflict warnings panel (highlighting contradictory operations).
   - Deduplicated impacted documents list with expandable distinct impact detail reasons.
   - Combined predicted verification requirements.

---

## 22. Performance & Bounds

Phase 16 enforces strict operational bounds to guarantee fast in-memory execution and prevent N+1 query hydration:

- **Maximum Proposals per Package**: `MAX_PACKAGE_PROPOSALS = 15`.
- **Graph Traversal Bounds**: Reuses Phase 7.3 verified bounds `MAX_DEPTH = 3`, `MAX_NODES = 50`. Exceeding bounds sets `simulationStatus = TRUNCATED_PARTIAL`.
- **Bulk Batch Hydration**: Package simulation uses Mongoose `$in` queries to hydrate all target documents, versions, baselines, and relationships in 4 bulk queries rather than per-proposal loops.

---

## 23. Concurrency & Transactions

- **Optimistic Fingerprint Concurrency**: Accepting a package (`acceptChangePackage`) verifies that `packageStateFingerprint` matches current authoritative state. If state changed concurrently, acceptance is blocked with HTTP 409 (`STALE_PACKAGE_SIMULATION_REQUIRED`).
- **Mongoose Transactions**: `acceptChangePackage` uses a MongoDB session transaction to update package status, attached proposal statuses, and audit events atomically.

---

## 24. Testing Strategy

1. **Unit Tests**:
   - Proposal normalization and repository-grounded conflict detector (`MUTUALLY_EXCLUSIVE_TARGET`, `CONTRADICTORY_RELATIONSHIP`, `DEPRECATION_DEPENDENCY_CONFLICT`).
   - Package state fingerprint computation and staleness detection.
   - Impact deduplication key algorithm and distinct detail key preservation.
   - Joint gate status lowest-common-denominator calculation.
2. **Integration Tests**:
   - Multi-document simulation with 3 overlapping proposals.
   - Cross-project package simulation with privacy node omission.
   - Package lifecycle transitions (`DRAFT` → `SIMULATED` → `UNDER_REVIEW` → `ACCEPTED`).
3. **Automated QA Runner**:
   - Create `apps/api/src/modules/change-packages/run_phase16_qa.ts` executing 25 concrete automated E2E scenarios.

---

## 25. QA Scenarios

The automated runner (`run_phase16_qa.ts`) will execute these 25 concrete scenarios:

1. Create `DocumentChangePackage` saved in `DRAFT` status.
2. Package number formatted correctly (`PKG-PROJ-1-XXXX`).
3. Attach constituent proposals to draft package.
4. Remove proposal from draft package.
5. Attempting to add proposal to package in `UNDER_REVIEW` returns HTTP 400.
6. Aggregate package simulation returns `COMPLETE` status for non-conflicting proposals.
7. Zero DB mutations occur during aggregate package simulation execution.
8. Deduplicated blast radius correctly merges overlapping downstream documents into single roster entries.
9. Distinct impact details (relationship impact, baseline drift) preserved under deduplicated document entries.
10. Detect `MUTUALLY_EXCLUSIVE_TARGET` conflict when two proposals modify same document content differently.
11. Conflict payload sets `simulationStatus = INDETERMINATE`.
12. Detect `CONTRADICTORY_RELATIONSHIP` conflict when proposals add and remove same edge.
13. Detect `DEPRECATION_DEPENDENCY_CONFLICT` when proposal deprecates document targeted by another proposal's relationship.
14. Combined predicted evidence score computed accurately across multi-doc context.
15. Joint gate status evaluates lowest common denominator (`FAILED` > `WARNING` > `PASSED`).
16. Deduplicated predicted verification tasks combine requirements without duplicating tasks.
17. Missing baseline in connected project returns `NO_BASELINE` status.
18. Target document content edit invalidates package fingerprint and flags `isStale = true`.
19. Package staleness response lists exact constituent proposal causing mismatch.
20. Re-running package simulation refreshes package fingerprint and clears `isStale`.
21. Proposal membership in multiple packages does NOT cause staleness.
22. Unauthorized connected project nodes completely omitted from package simulation output.
23. Transition package to `UNDER_REVIEW`.
24. Transition package to `ACCEPTED` and return multi-document handoff payload without creating DocumentVersion records.
25. Immutable audit events recorded for `CHANGE_PACKAGE_CREATED`, `SUBMITTED`, `ACCEPTED`.

---

## 26. Migration / Backward Compatibility

- **100% Backward Compatible**: Phase 16 introduces new isolated collections (`documentchangepackages`) and API routes (`/api/change-packages`).
- Existing single-document Phase 15 proposal routes remain fully functional.
- Zero modifications to existing database schemas or Phase 1-15 API response formats.

---

## 27. Risks

| Risk | Mitigation |
| :--- | :--- |
| **High computational overhead during multi-doc simulation** | Cap proposals per package (`MAX_PACKAGE_PROPOSALS = 15`) and reuse Phase 7.3 graph bounds (`MAX_DEPTH = 3`, `MAX_NODES = 50`). |
| **Complex inter-proposal conflict combinations** | Limit conflict classes to 5 repository-grounded categories. If complex interaction cannot be determined, return `INDETERMINATE`. |
| **Accidental side-effects during package simulation** | Keep simulation orchestrator pure read-only operating on in-memory graph copies. |

---

## 28. Open Questions

1. *Should a package accept proposals from multiple primary projects?* -> **Resolved**: Yes, provided the user has EDIT access on the package's primary project and READ access on target documents/projects.
2. *Can a proposal be attached to multiple active packages simultaneously?* -> **Resolved**: Yes in `DRAFT`. Proposal membership does NOT cause staleness; staleness occurs ONLY when authoritative document state diverges.

---

## 29. Secondary Corrections

The following secondary alignment corrections were applied in v2:

1. **Clarified Acceptance vs Execution**: Removed all wording suggesting package acceptance executes document edits or creates versions. Package acceptance is strictly a decision record.
2. **Clarified Impact Deduplication**: Separated document roster identity (`documentId`) from detail identity (`impactDetailKey`), ensuring explainable impact reasons are never collapsed.
3. **Clarified Staleness Rules**: Removed statement claiming proposal multi-package membership causes staleness. Staleness is strictly tied to SHA-256 authoritative state divergence.
4. **Verified Relationship Types**: Confirmed relationship conflict checks use actual repository types (`RELATED`, `REFERENCES`, `REPLACES`, `DEPENDS_ON`).
5. **Bounded Schema Compatibility**: Restricted contract conflict analysis to structural JSON Schema property matching, returning `INDETERMINATE` for non-deterministic semantic checks.

---

## 30. Implementation Sequence

1. **Increment 1**: Create `DocumentChangePackage` model, schema, and audit actions.
2. **Increment 2**: Implement package fingerprinting (`computePackageStateFingerprint`).
3. **Increment 3**: Implement conflict analyzer and multi-doc overlay graph builder.
4. **Increment 4**: Implement `runChangePackageSimulation` orchestrator with deduplication and subsystem aggregation.
5. **Increment 5**: Implement package service (`createPackage`, `addProposal`, `simulatePackage`, `acceptPackage`).
6. **Increment 6**: Implement package controller and Express routes.
7. **Increment 7**: Implement frontend `ProjectChangePackagesTab`, `CreatePackageModal`, and `ChangePackageDetailsDrawer`.
8. **Increment 8**: Create and execute `run_phase16_qa.ts` (25 scenarios) + full regression suite.

---

## 31. Acceptance Criteria

- All 25 automated QA scenarios in `run_phase16_qa.ts` pass cleanly.
- Ephemeral package simulation produces 0 DB side-effects or audit logs.
- Deduplicated blast radius correctly merges overlapping downstream nodes while preserving distinct detail reasons.
- Conflict analyzer identifies mutually exclusive operations and returns `INDETERMINATE`.
- Package acceptance persists decision state (`ACCEPTED`) and returns handoff payload without creating `DocumentVersion` records.
- Unauthorized projects/documents are 100% omitted from API payloads.
- TypeScript typechecks and ESLint pass with 0 errors across `@documan/api` and `web`.

---

## 32. Final Recommendation

**READY FOR IMPLEMENTATION**

The Phase 16 implementation plan v2 has corrected all four review issues, fully aligned with Phase 15 invariants, grounded conflict checks in repository primitives, clarified deduplication explainability, and established an unambiguous acceptance/handoff boundary. It is ready for feature branch creation and implementation authorization.
