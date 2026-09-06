# Phase 15 — Pre-Change Impact Simulation & Change Proposal Engine
## Formal Implementation Plan v3 (Targeted Final Architectural Correction)

**Baseline Revision**: `f5ec56b86b75f9448fb0ca524b44c7a8b2497b10` (`main = origin/main`)  
**Target Deliverable**: `docs/research/PHASE-15-IMPLEMENTATION-PLAN-v3.md`  
**Status**: DRAFT — PENDING FORMAL REVIEW (PLANNING-ONLY)

---

## 1. Executive Summary & Repository-Fact Verification

Phase 15 extends Documan from **reactive change governance** to **deterministic pre-change decision support**. 

In current Documan baseline (Phases 7.3 through 14), change impact cascades, verification task generation, baseline drift evaluations, evidence recalculations, and governance gate checks execute *after* an authoritative `DocumentVersion` is committed to MongoDB.

Phase 15 introduces the **Change Proposal & Pre-Change Impact Simulation Engine**. It enables engineers, technical writers, and architects to construct a hypothetical proposal—containing document content edits, technical contract schema updates, relationship graph modifications, or deprecation requests—and execute a **100% read-only, in-memory pre-change simulation**.

### Empirical Repository-Fact Table
Before formulating this implementation plan, every claimed capability, service, Mongoose model, method, enum value, and authorization function was verified against the repository codebase at `f5ec56b86b75f9448fb0ca524b44c7a8b2497b10`:

| Claimed Capability | Actual Repository Implementation | Reuse Strategy & Classification |
| :--- | :--- | :--- |
| **Phase 7.3 Impact Cascade** | `document-impact-cascade.service.ts`: `processUpstreamDocumentImpact({ upstreamDocId, changeType })` (`MAX_DEPTH = 3`, `MAX_NODES = 50`) | **REQUIRES SIMULATION ADAPTER**: `processUpstreamDocumentImpact` updates Mongoose records (`needsVerification: true`) and creates `VerificationTask` & `WorkRequest` DB documents. **Adapter Strategy**: Extract pure in-memory traversal algorithm `simulateUpstreamDocumentImpact()` running depth-first traversal against a simulated graph DTO. |
| **Phase 9 Evidence Coverage** | `apps/api/src/modules/knowledge/evidence-calculator.ts`: `calculateEvidenceCoverage(context: EvidenceCoverageContext): EvidenceCoverageResult` | **SAFE DIRECT REUSE**: `calculateEvidenceCoverage` is a pure function operating on context objects. Safe to invoke directly with simulated `EvidenceCoverageContext` in-memory. |
| **Phase 10 Release Gate Evaluator & Assurance** | `release-gate-evaluator.service.ts`: `evaluateReleaseGateInternal()`; `assurance-calculator.ts`: `calculateDocumentAssurance(context: AssuranceCalculatorContext): DocumentAssuranceResult` | **SAFE DIRECT REUSE (CHECK-BY-CHECK)**: Evaluates checks `chk_governance_enabled`, `chk_evidence_coverage`, `chk_upstream_freshness`, `chk_verification_plans_clear`, `chk_baseline_drift_clear`, `chk_deprecated_api_endpoints`, `chk_document_freshness`, `chk_review_governance`, `chk_knowledge_risk` in-memory. Zero DB mutations or waiver side-effects. |
| **Phase 11 Verification Plan Service** | `verification-plan.service.ts`: `createVerificationPlanInternal()`; `change-intelligence.service.ts`: `getChangeIntelligenceForVersion()` | **REQUIRES SIMULATION ADAPTER**: `createVerificationPlanInternal()` writes `VerificationPlan` and `VerificationTask` Mongoose records to MongoDB. **Adapter Strategy**: Implement `predictVerificationRequirements()` pure calculation function running the task rules matrix in-memory. |
| **Phase 12 Baseline & Drift Calculator** | `drift-calculator.service.ts`: `calculateProjectBaselineDrift()`, `calculateDocumentBaselineDrift()`; `documentation-baseline.model.ts`: `DocumentationBaseline` | **SAFE DIRECT REUSE**: Performs read-only comparisons between `DocumentationBaseline.snapshot` and document content/checksums. Safe to invoke with simulated document version DTOs. |
| **Phase 13 Work Request Service** | `work-request.service.ts`: `createWorkRequestInternal()`; `documentation-work-request.model.ts`: `DocumentationWorkRequest` | **REQUIRES SIMULATION ADAPTER / HANDOFF BOUNDARY**: Creating work requests writes `DocumentationWorkRequest` records and sends notifications. **Adapter Strategy**: Output predicted work items in-memory during simulation. Handoff occurs ONLY post-acceptance & authoritative version creation. |
| **Phase 14 Project Topology Service** | `project-topology.service.ts`: `getProjectArchitectureGraph()`, `getCrossProjectDependencies()`; `checkUserProjectReadAccess()` | **PURE CALCULATION REUSE**: Traverses topology links and filters out inaccessible projects/documents via `checkUserProjectReadAccess(userId, role, projectId)`. |
| **Authorization Authority** | `project-topology.service.ts`: `checkUserProjectReadAccess()`; `work-request.service.ts`: `checkProjectAccess()`; `project-topology.service.ts`: `verifyProjectOwnerOrAdmin()` | **SAFE DIRECT REUSE**: Reuses existing project RBAC & ACL functions directly. No parallel permission layer. |
| **Document Audit History** | `document-audit.model.ts`: `DocumentAudit`, `DocumentAuditAction`; `document-audit.service.ts`: `createDocumentAudit()` | **SAFE DIRECT REUSE**: Emits `DocumentAudit` records ONLY for major proposal state transitions (`CHANGE_PROPOSAL_CREATED`, etc.). Exploratory simulations emit **NO audit events**. |

---

## 2. Product Scope & Non-Negotiable Boundaries

### What Phase 15 Adds
1. **Change Proposal Domain (`DocumentChangeProposal`)**: A persistent proposal envelope for multi-user drafting, reviewing, tracking, and simulating hypothetical document changes prior to authoritative version creation.
2. **Dual Simulation Execution Modes**:
   - **Ephemeral Simulation (`POST /api/documents/:documentId/simulate-change`)**: 100% read-only in-memory simulation with zero database persistence.
   - **Persisted Change Proposal (`POST /api/projects/:projectId/proposals`)**: Persisted proposal record enabling collaborative review, decision tracking, and proposal state lifecycle.
3. **Pre-Change Impact Simulation Engine (`change-proposal-simulation.service.ts`)**: Read-only orchestrator running simulation adapters over existing Phase 7.3, 9, 10, 11, 12, 13, and 14 calculation logic.
4. **Authoritative State Handoff**: Upon explicit proposal acceptance (`ACCEPTED`), the workflow delegates to Phase 7.4 (`documentVersionService.createVersion`). Once created, Phase 13 `createWorkRequestInternal` is invoked for predicted downstream work items.
5. **Integrated UX**:
   - **`DocumentDetailsPage`**: "Propose & Simulate" side drawer for instant impact simulation.
   - **`ProjectDetailsPage`**: "Change Proposals" tab listing active proposals, simulation status, predicted blast radius, and decision controls.

### Non-Goals
Phase 15 strictly **EXCLUDES**:
- ❌ **No Duplicate Calculation Engines**: Reuses existing services/calculators.
- ❌ **No Phase 15 Execution of Authoritative Versions**: Phase 15 does NOT apply document updates directly; authoritative version creation remains in Phase 7.4.
- ❌ **No Automatic Work Request Creation During Simulation**: Work requests are created ONLY after proposal acceptance and authoritative document version creation.
- ❌ **No Restricted Project Counts or Structural Leakage**: Zero counts, obfuscated IDs, or metadata returned for unauthorized projects.
- ❌ **No Mandatory AI/LLM/Vector Dependencies**: 100% deterministic algorithms.
- ❌ **No Jira/Trello/GitHub Sync**: Documan remains the single source of authoritative technical documentation governance.

---

## 3. Proposal Lifecycle & Status Persistence Semantics

### Proposal Lifecycle Invariant
Phase 15 **MUST NOT** create the authoritative `DocumentVersion` as a result of accepting a proposal. Proposal acceptance marks the decision; authoritative mutation is handled by Phase 7.4.

```
   [ DRAFT ] ──────────► [ SIMULATED ]
       │                      │
       ▼                      ▼
[ DISCARDED ] ◄─────── [ UNDER_REVIEW ]
                         ├───► [ ACCEPTED ] ──► (Phase 7.4 Version Created) ──► (Phase 13 Work Handoff)
                         └───► [ REJECTED ]
```

### Persistence Distinction: Metadata vs. Derived Simulation Results
To prevent database bloat, proposal persistence stores **minimum proposal metadata** and **simulation state identity**. The complete derived simulation result DTO is generated on-the-fly or cached transiently.

1. **`DRAFT` State**: Proposal created with normalized change input.
2. **Transition to `SIMULATED` State**: Occurs when a simulation is executed successfully against a persisted proposal. The system persists:
   - `lastSimulatedAt`: Timestamp of simulation execution.
   - `simulationStateFingerprint`: Canonical SHA-256 fingerprint of underlying authoritative dependencies.
   - `lastSimulationStatus`: Overall simulation status (`COMPLETE`, `TRUNCATED_PARTIAL`, `INDETERMINATE`).
   - `simulationResultCache`: Optional cached result DTO for instant UI rendering.
3. **Transition to `ACCEPTED` State**:
   - User with `EDIT` / `ADMIN` permission accepts the proposal. Proposal status updates to `ACCEPTED`.
   - Client is redirected to the Phase 7.4 authoritative document update workflow (`documentVersionService.createVersion`), supplying the proposed content/schema.
   - Upon version creation, the new `DocumentVersion._id` is recorded on the proposal as `acceptedAuthoritativeVersionId`, and Phase 13 `createWorkRequestInternal` is invoked for predicted downstream work items.

---

## 4. Canonical Simulation State Fingerprint & Staleness Semantics

### Definition of Staleness
A simulation prediction is generated against authoritative system state $S_1$. If the underlying authoritative state changes to $S_2$ such that $S_1 \neq S_2$, the proposal simulation is **`STALE`** (`isStale: true`). Parallel proposals are handled naturally through state divergence: when Proposal A is accepted transitioning the document to $S_2$, Proposal B automatically evaluates as `STALE` on next fetch because its recorded fingerprint $S_1 \neq S_2$.

### Canonical State Fingerprint Specification

The composite simulation state fingerprint is calculated deterministically:

$$\text{simulationStateFingerprint} = \text{SHA256}(\text{CanonicalSerializedState})$$

#### 1. Input Dependency Scope

| Dependency Domain | Included State Fields | Canonical Tuple Format |
| :--- | :--- | :--- |
| **Target Document** | `_id`, `version`, `status`, SHA-256 of file content | `("DOC", id, version, status, contentChecksum)` |
| **Target Baseline** | `_id`, SHA-256 of baseline content snapshot (if active baseline exists) | `("BASELINE", id, snapshotChecksum)` or `("BASELINE", "NONE")` |
| **Target Relationships** | All active `DocumentRelationship` records where document is source or target | `("REL", sourceId, targetId, type)` sorted lexicographically |
| **Topology Links** | All active `ProjectTopologyLink` records connected to target project | `("TOPOLOGY", sourceProjectId, targetProjectId, type)` sorted lexicographically |

#### 2. Canonical Serialization Algorithm
1. **Field Encoding**: All strings encoded in UTF-8. Null/missing values represented as string `"NULL"`.
2. **Tuple Formatting**: Each tuple formatted as colon-separated values: `"TYPE:FIELD1:FIELD2..."`.
3. **Lexicographical Ordering**: Relationship and Topology tuples sorted lexicographically by string comparison.
4. **Canonical Delimiter**: Tuples joined using newline `\n`.
5. **Hash Algorithm**: SHA-256 digest output as a 64-character lowercase hex string.

---

## 5. Phase 10 Check-by-Check Assurance Verification

The v3 plan inspects the actual check identifiers used in `apps/api/src/modules/governance/assurance-calculator.ts` (`calculateDocumentAssurance`):

| Check ID (`checkId`) | Check Name & Category | Required Inputs | Can Simulated Input Satisfy It? | Classification & Adapter Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `chk_governance_enabled` | Project Governance Enablement (`GOVERNANCE_FRESHNESS`) | `project.governanceSettings` | Yes | **PURE**: Evaluated directly against project settings. |
| `chk_evidence_coverage` | Minimum Technical Evidence Coverage (`EVIDENCE_INTEGRITY`) | Simulated evidence coverage score from Phase 9 | Yes | **SIMULATION ADAPTER**: Receives simulated evidence coverage score computed from proposed content/endpoints. |
| `chk_upstream_freshness` | Upstream Dependency Change Verification (`UPSTREAM_FRESHNESS`) | `document.impactVerification` | Yes | **SIMULATION ADAPTER**: Receives simulated upstream impact result from Phase 7.3 adapter. |
| `chk_verification_plans_clear` | Verification Plan Completion (`CHANGE_IMPACT`) | Active verification tasks | Yes | **SIMULATION ADAPTER**: Receives predicted verification tasks from Phase 11 adapter. |
| `chk_baseline_drift_clear` | Authoritative Baseline Drift Control (`CHANGE_IMPACT`) | Baseline snapshot & simulated checksum | Yes | **SIMULATION ADAPTER**: Receives predicted baseline drift status from Phase 12 adapter. |
| `chk_deprecated_api_endpoints` | Deprecated API Endpoint References (`API_DRIFT`) | Linked API endpoints | Yes | **SIMULATION ADAPTER**: Evaluates proposed contract schema for deprecated endpoint usage. |
| `chk_document_freshness` | Document Freshness & Review Frequency (`GOVERNANCE_FRESHNESS`) | `document.updatedAt`, `maxUnreviewedDays` | Yes | **PURE**: Evaluated using simulation timestamp. |
| `chk_review_governance` | Governance Review Approval (`REVIEW_GOVERNANCE`) | Active `DocumentReview` records | Yes | **PURE**: Evaluates current review state in-memory. |
| `chk_knowledge_risk` | Technical Knowledge Risk (`KNOWLEDGE_RISK`) | `knowledgeRisk` scores | Yes | **PURE**: Evaluated using current knowledge risk scores. |

*Critical Guarantee*: Predicted assurance evaluation is 100% read-only. It **NEVER** creates governance waivers, updates `DocumentAudit`, or mutates document/project states.

---

## 6. Phase 9, 11, 12 & 13 Integration Contracts

### 6.1 Phase 9 Evidence Integration
- **Actual Function**: `calculateEvidenceCoverage(context: EvidenceCoverageContext)` in `apps/api/src/modules/knowledge/evidence-calculator.ts`.
- **Simulation Input**:
  $$\text{SimulatedContext} = \text{Current Evidence Context} + \text{Proposed Content/Endpoints/Dependencies}$$
- **Behavior**: Executes `calculateEvidenceCoverage(simulatedContext)` in-memory to derive predicted coverage score, missing categories, and evidence items without persisting DB records.

### 6.2 Phase 11 Verification Requirements Integration
- **Actual Methods**: `createVerificationPlanInternal()` in `verification-plan.service.ts` writes DB records.
- **Simulation Boundary**: Phase 15 introduces `predictVerificationRequirements(simulatedImpactResult, proposedChangeType)` as a pure calculation function. It evaluates Phase 11 priority rules in-memory and outputs `predictedVerificationTasks` DTOs with zero MongoDB side-effects (`VerificationPlan` count = 0, `VerificationTask` count = 0).

### 6.3 Phase 12 Baseline & Drift Integration
- **Actual Methods**: `calculateProjectBaselineDrift()`, `calculateDocumentBaselineDrift()` in `drift-calculator.service.ts`.
- **Simulation Input**:
  $$\text{Baseline Snapshot} + \text{Simulated Target Version/Checksum} \longrightarrow \text{Predicted Drift}$$
- **Missing Baseline Handling**: If `DocumentationBaseline.findOne({ isActive: true })` returns `null`, the drift calculation deterministically outputs:
  - `hasActiveBaseline: false`
  - `predictedDriftStatus: "NO_BASELINE"`
  - UI renders an informative warning banner: *"No active documentation baseline exists for this project."* (Never converts missing baseline to "CLEAN" or "NO DRIFT").

### 6.4 Phase 13 Work Request Integration & Handoff Boundary
- **Simulation Phase**: Evaluates active `DocumentationWorkRequest` records. Outputs `affectedExistingWorkRequests` and `predictedWorkTasks` DTOs in-memory. Zero work requests created during simulation.
- **Authoritative Handoff Phase**: When a proposal is accepted (`ACCEPTED`) and the user completes Phase 7.4 authoritative document version creation, the handoff service iterates `predictedWorkTasks` and calls `workRequestService.createWorkRequestInternal()` idempotently.

---

## 7. Bounded Proposal Input Contracts

### 1. `DOCUMENT_CONTENT_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.content`
- **Optional Input**: `proposedChange.title`, `proposedChange.targetVersionType`, `proposedChange.changeDescription`
- **Behavior**: Computes proposed SHA-256 content checksum, baseline checksum drift, downstream impact cascade depth, predicted evidence coverage, and verification tasks required for content revisions.

### 2. `TECHNICAL_CONTRACT_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.contractSchema`
- **Supported Deterministic Contract Signals**: Structural JSON schema diffs (field additions/removals, property type changes, required field modifications).
- **Unsupported Semantic Analysis**: Generic natural language semantic intent analysis is explicitly marked **UNSUPPORTED / INDETERMINATE**.
- **Behavior**: Compares proposed schema against active document contract schema. Triggers breaking contract impact cascade across dependent cross-project documents (Phase 14 topology).

### 3. `RELATIONSHIP_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.relationshipOperations`
- **Operations**: `ADD_RELATIONSHIP`, `REMOVE_RELATIONSHIP`.
- **Allowed Relationship Types**: Reuses exact `DocumentRelationshipType` enums: `'RELATED' | 'REFERENCES' | 'REPLACES' | 'DEPENDS_ON'`.
- **Validation**: Prevents self-references, validates source/target document existence, enforces existing relationship duplication rules.

### 4. `DEPRECATION_PROPOSAL`
- **Required Input**: `targetDocumentId`, `proposedChange.changeDescription` (reason for deprecation)
- **Data Protection**: **MUST NOT** delete document files, mutate document Mongoose models, or alter actual lifecycle status. Reuses existing `DocumentStatus` value `'DEPRECATED'` hypothetically.
- **Behavior**: Treats target document as hypothetically `DEPRECATED` in-memory. Traverses full upstream/downstream impact cascade across dependent documents, highlights critical contract breakages, and projects high-priority verification/work requirements.

---

## 8. Simulation Status & Truncation Semantics

### Overall & Per-Subsystem Simulation Status Model

| Subsystem Status | Description | Overall Result Impact |
| :--- | :--- | :--- |
| **`COMPLETE`** | Subsystem calculation completed fully within traversal bounds. | Contributes to `COMPLETE` overall status. |
| **`TRUNCATED_PARTIAL`** | Graph traversal reached `MAX_DEPTH = 3` or `MAX_NODES = 50`. | Forces overall simulation status to `TRUNCATED_PARTIAL`. |
| **`INDETERMINATE`** | Required dependency (e.g., missing baseline) was unavailable. | Sets subsystem result as indeterminate; flags overall status. |
| **`UNSUPPORTED`** | Requested schema analysis cannot be computed deterministically. | Sets subsystem status `UNSUPPORTED`. |
| **`STALE`** | State fingerprint mismatch detected against authoritative dependencies. | Requires re-simulation before relying on results. |

*Critical Guarantee*: Truncated or indeterminate subsystem results are **NEVER** translated into "SAFE", "PASSED", or "NO IMPACT". The UI explicitly flags bounded impact graphs.

---

## 9. Authorization, Security & Privacy Model

### Reuse of Existing Authorization Primitives
Phase 15 reuses Documan's existing RBAC and authorization functions directly:

1. **`checkUserProjectReadAccess(userId, role, projectId)`**:
   - Used for verifying read permission on projects, documents, baselines, topology, and simulation result disclosure.
   - If user lacks read access to an impacted project in the simulation graph, the project node and its associated document nodes/edges are **completely omitted** from disclosure.
2. **`checkProjectAccess(userId, role, projectId)` / `verifyProjectOwnerOrAdmin(userId, role, projectId)`**:
   - Used for proposal mutation operations: creating proposals, updating proposals, submitting for review, accepting, rejecting, or discarding.
3. **Actor Authorization vs. Result Disclosure**:
   - **Actor Authorization**: User must have `READ` access to target project to run an ephemeral simulation, and `EDIT` access to create/manage a proposal.
   - **Result Disclosure**: Every node in the simulated blast radius is individually filtered through `checkUserProjectReadAccess`. Unauthorized nodes are stripped from disclosure with zero count leakage or structural metadata hints.

---

## 10. Database Schema & Audit Event Mapping

### `DocumentChangeProposal` Schema
```typescript
// apps/api/src/modules/change-proposals/change-proposal.model.ts

export enum ProposalType {
  DOCUMENT_CONTENT_UPDATE = 'DOCUMENT_CONTENT_UPDATE',
  TECHNICAL_CONTRACT_UPDATE = 'TECHNICAL_CONTRACT_UPDATE',
  RELATIONSHIP_UPDATE = 'RELATIONSHIP_UPDATE',
  DEPRECATION_PROPOSAL = 'DEPRECATION_PROPOSAL',
}

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SIMULATED = 'SIMULATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DISCARDED = 'DISCARDED',
}

export interface IDocumentChangeProposal extends Document {
  proposalNumber: string; // e.g. "PROP-PROJ1-0042"
  projectId: Types.ObjectId;
  targetDocumentId: Types.ObjectId;
  title: string;
  description?: string;
  proposalType: ProposalType;
  proposedChange: {
    title?: string;
    content?: string;
    changeDescription?: string;
    contractSchema?: Record<string, any>;
    targetVersionType?: 'MAJOR' | 'MINOR' | 'PATCH';
    relationshipOperations?: Array<{
      operation: 'ADD_RELATIONSHIP' | 'REMOVE_RELATIONSHIP';
      targetDocumentId: Types.ObjectId;
      type: DocumentRelationshipType;
      description?: string;
    }>;
  };
  status: ProposalStatus;
  createdBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewComment?: string;
  lastSimulatedAt?: Date;
  simulationStateFingerprint?: string; // Canonical SHA-256 state fingerprint
  lastSimulationStatus?: string; // 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE'
  simulationResultCache?: Record<string, any>; // Cached simulation DTO for UI rendering
  acceptedAuthoritativeVersionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Immutable `DocumentAuditAction` Extensions
The `DocumentAuditAction` union in `apps/api/src/modules/documents/document-audit.model.ts` is extended with explicit proposal lifecycle actions:
- `'CHANGE_PROPOSAL_CREATED'`
- `'CHANGE_PROPOSAL_SUBMITTED'`
- `'CHANGE_PROPOSAL_ACCEPTED'`
- `'CHANGE_PROPOSAL_REJECTED'`
- `'CHANGE_PROPOSAL_DISCARDED'`

Exploratory simulations (`POST /api/documents/:id/simulate-change`) emit **NO audit events**.

---

## 11. API Design

All endpoints follow Documan REST conventions, utilizing standard response envelopes `{ success: true, data: ... }` and Express error middleware.

### 1. Run Ephemeral Simulation
- **`POST /api/documents/:documentId/simulate-change`**
- **Authorization**: `checkUserProjectReadAccess` (Requires `READ` access).
- **Request Body**: Proposal type + proposed changes.
- **Response**: `200 OK` with `authoritativeState` vs `predictedState` envelope.

### 2. Create Change Proposal
- **`POST /api/projects/:projectId/proposals`**
- **Authorization**: `checkProjectAccess` (Requires `EDIT` access).
- **Response**: `201 Created` with `DocumentChangeProposal` object + logs `'CHANGE_PROPOSAL_CREATED'` audit event.

### 3. List Project Proposals
- **`GET /api/projects/:projectId/proposals?status=UNDER_REVIEW`**
- **Authorization**: `checkUserProjectReadAccess` (Requires `READ` access).
- **Response**: `200 OK` with array of proposal summaries.

### 4. Get Proposal Details & Simulation
- **`GET /api/proposals/:proposalId`**
- **Authorization**: `checkUserProjectReadAccess` (Requires `READ` access).
- **Response**: `200 OK` with proposal details, state fingerprint, `isStale` flag, and cached simulation results.

### 5. Re-Run Proposal Simulation
- **`POST /api/proposals/:proposalId/simulate`**
- **Authorization**: `checkUserProjectReadAccess` (Requires `READ` access).
- **Response**: `200 OK` with refreshed simulation results and updated `simulationStateFingerprint`. Sets proposal status to `SIMULATED`.

### 6. Transition Proposal Status (Review / Reject / Discard)
- **`PATCH /api/proposals/:proposalId/status`**
- **Authorization**: Requires `EDIT` / `ADMIN` permission.
- **Request Body**: `{ "status": "UNDER_REVIEW" | "REJECTED" | "DISCARDED", "reviewComment": "..." }`
- **Response**: `200 OK` + emits `DocumentAudit` event (`CHANGE_PROPOSAL_SUBMITTED`, etc.).

### 7. Accept Proposal (Mark Accepted & Initiate Authoritative Handoff)
- **`POST /api/proposals/:proposalId/accept`**
- **Authorization**: Requires `EDIT` / `ADMIN` permission.
- **Behavior**: Sets proposal status to `ACCEPTED`, logs `'CHANGE_PROPOSAL_ACCEPTED'` audit record, and returns handoff payload directing client to invoke Phase 7.4 `documentVersionService.createVersion`.

---

## 12. Frontend & UX Architecture

### 1. `DocumentDetailsPage` Extension
- Add **"Propose & Simulate"** button to document action header.
- Slide-over drawer with two primary views:
  - **Input Form**: Content Markdown editor, OpenAPI/JSON schema editor, or relationship selector.
  - **Simulation Results**:
    - Current vs. Predicted Governance Gate status (`PASSED` -> `WARNING`).
    - Impacted Downstream Documents & Cross-Project Blast Radius.
    - Baseline Checksum & Schema Drift Indicator.
    - Predicted Verification & Work Requirements list.
  - **Action Footer**: "Run Ephemeral Simulation", "Save as Proposal", or "Submit for Review".

### 2. `ProjectDetailsPage` Extension
- Add **"Change Proposals"** tab next to "Topology" and "Baselines".
- Proposals table with columns: `Proposal #`, `Target Document`, `Type`, `Proposer`, `Predicted Gate Status`, `Staleness`, `Status`, `Actions`.
- Proposal detail modal for reviewing diffs, running re-simulations, and executing Accept / Reject decisions.

---

## 13. Testing Strategy

### 1. Unit Tests (`apps/api/src/modules/change-proposals/*.test.ts`)
- Schema & DTO validation for all 4 proposal types.
- Pure simulation calculation functions (checksum generation, schema diffing).
- State fingerprint canonical serialization and hash calculation.
- Truncation semantics (`COMPLETE` vs `TRUNCATED_PARTIAL`).

### 2. Integration Tests
- Ephemeral simulation endpoint (`POST /api/documents/:id/simulate-change`).
- Persisted proposal lifecycle (`DRAFT` → `SIMULATED` → `UNDER_REVIEW` → `ACCEPTED`).
- Handoff integration: Verifying that proposal acceptance followed by authoritative version creation invokes Phase 13 `createWorkRequestInternal`.

### 3. Security & Privacy Tests
- Cross-project simulation with multi-tenant user accounts.
- Verifying 100% omission of unauthorized project names, document IDs, schema fields, and graph edges. Zero count leakage.

### 4. Regression Test Suites
- Re-run full test suites for Phase 10 (Governance), Phase 11 (Verification), Phase 12 (Baseline/Drift), Phase 13 (Work Requests), and Phase 14 (Topology).

---

## 14. Manual QA Matrix (25 Scenarios)

| # | Test Scenario | Expected Result |
| :- | :--- | :--- |
| 1 | Create content update proposal on valid document | Proposal saved in `DRAFT` status; 0 document versions created. |
| 2 | Run ephemeral simulation on content update | Returns 200 OK with predicted impact depth and drift; 0 DB mutations. |
| 3 | Verify document content remains unchanged after simulation | Authoritative document content and version remain identical. |
| 4 | Run contract schema update simulation (breaking change) | Simulation correctly predicts `WARNING`/`FAILED` gate status and cross-project impact. |
| 5 | Run relationship addition simulation (`ADD_RELATIONSHIP`) | Identifies predicted topology node additions and link validation. |
| 6 | Run relationship removal simulation (`REMOVE_RELATIONSHIP`) | Validates graph integrity and reports predicted disconnected dependencies. |
| 7 | Run deprecation proposal simulation | High impact blast radius predicted across all upstream dependent documents; 0 files deleted. |
| 8 | Cross-project simulation with restricted project dependency | Unauthorized project node & edge completely omitted from response; 0 counts/metadata leaked. |
| 9 | Verify no restricted project names leak in response | Payload contains zero restricted strings, IDs, or counts. |
| 10 | Baseline drift prediction when baseline exists | Accurately predicts checksum mismatch and drift severity. |
| 11 | Baseline drift prediction when NO baseline exists | Returns `NO_BASELINE` status with appropriate UI warning. |
| 12 | Evidence coverage prediction | Predicts missing evidence categories for proposed technical content. |
| 13 | Verification requirement prediction | Outputs predicted verification tasks without creating `VerificationTask` DB records. |
| 14 | Gate assurance evaluation prediction | Evaluates Phase 10 rules in-memory without creating gate waivers or audit records. |
| 15 | Verify no `DocumentationWorkRequest` created during simulation | Database count of `DocumentationWorkRequest` remains unchanged. |
| 16 | Stale simulation detection after target document edit | Editing target document changes fingerprint, setting proposal `isStale: true` and UI alert. |
| 17 | Re-run stale simulation | Updates simulation cache, clears `isStale` flag, updates `simulationStateFingerprint`. |
| 18 | Parallel proposals staleness check | Accepting Proposal A updates document state; Proposal B automatically evaluates as `STALE`. |
| 19 | Traversal limit truncation check | Simulating large graph exceeding `MAX_NODES = 50` sets status `TRUNCATED_PARTIAL` with UI warning. |
| 20 | Transition proposal status (`DRAFT` -> `UNDER_REVIEW`) | Status updates; `CHANGE_PROPOSAL_SUBMITTED` audit event logged. |
| 21 | Transition proposal status (`UNDER_REVIEW` -> `ACCEPTED`) | Status updates to `ACCEPTED`; `CHANGE_PROPOSAL_ACCEPTED` audit logged; handoff payload returned. |
| 22 | Authoritative version creation & Phase 13 handoff | Authoritative `DocumentVersion` created; Phase 13 `createWorkRequestInternal` creates predicted work items. |
| 23 | Attempt proposal creation without `EDIT` permission | Returns 403 Forbidden via `checkProjectAccess`. |
| 24 | Frontend UI visual distinction check | UI clearly displays "PREDICTED / SIMULATED" badge vs "AUTHORITATIVE" badge. |
| 25 | Phase 10–14 Regression Verification | All existing governance, baseline, topology, and work request tests pass cleanly. |

---

## 15. Implementation Sequence

1. **Domain & DTO Definition**: Create `DocumentChangeProposal` model, DTOs, and state fingerprint calculation logic.
2. **Simulation Adapters**: Implement pure simulation adapters in Phase 7.3, 9, 10, 11, 12, 13, and 14.
3. **Simulation Orchestrator**: Build `change-proposal-simulation.service.ts` coordinating adapters and applying `checkUserProjectReadAccess` ACL filters.
4. **Proposal Service & Express API Routes**: Build proposal CRUD, lifecycle state machine, and Express endpoints (`/api/documents/:id/simulate-change`, `/api/projects/:id/proposals`, `/api/proposals/*`).
5. **Authoritative Handoff**: Connect proposal acceptance to Phase 7.4 document version creation and Phase 13 `createWorkRequestInternal`.
6. **Frontend UI Components**: Implement "Propose & Simulate" drawer in `DocumentDetailsPage` and "Change Proposals" tab in `ProjectDetailsPage`.
7. **Automated Testing & QA Verification**: Write unit, integration, and security test suites; execute manual QA matrix (25 scenarios).

---

## 16. Definition of Done

- [ ] Empirical repository-fact table verified against baseline codebase.
- [ ] `DocumentChangeProposal` model and DTOs created with canonical state fingerprint calculation.
- [ ] Ephemeral simulation endpoint `POST /api/documents/:id/simulate-change` operational.
- [ ] Proposal CRUD and lifecycle state machine (`DRAFT` → `SIMULATED` → `UNDER_REVIEW` → `ACCEPTED` / `REJECTED` / `DISCARDED`) functional.
- [ ] 100% read-only simulation verified (0 DB side-effects during simulation).
- [ ] Privacy-safe ACL disclosure verified (unauthorized nodes completely omitted; zero count/metadata leakage).
- [ ] Phase 13 handoff verified (Work Requests created ONLY after proposal acceptance and authoritative document version creation).
- [ ] Canonical state fingerprint staleness detection verified.
- [ ] Frontend UI drawer and proposal tab implemented with visual state separation.
- [ ] All automated unit, integration, security, and Phase 10–14 regression tests passing.
- [ ] ESLint, TypeScript API typecheck, and Vite web build succeed cleanly.
- [ ] Manual QA matrix (25 scenarios) verified.
- [ ] Git status clean on working feature branch.

---

## 17. Open Questions

1. **Proposal Auto-Archiving / Retention**: Should expired or discarded proposals be automatically purged after 90 days?
   - *Recommendation*: Retain proposals indefinitely as lightweight proposal history with an `archivedAt` filter.
2. **Parallel Proposal Conflicts**: How should Documan handle multiple active proposals targeting the same document?
   - *Recommendation*: Allow parallel drafts. When one proposal is accepted and applied as an authoritative `DocumentVersion`, canonical state fingerprint re-evaluation automatically flags remaining active proposals as `STALE` on next fetch.

---

## 18. Final v3 Review Checklist

- [x] Repository facts verified against baseline revision.
- [x] No invented existing methods or helpers.
- [x] No invented enum values (`DocumentStatus`, `DocumentRelationshipType`).
- [x] No invented audit actions (extends `DocumentAuditAction`).
- [x] No duplicate impact engine.
- [x] No duplicate evidence engine.
- [x] No duplicate assurance engine.
- [x] No duplicate verification engine.
- [x] No duplicate baseline/drift engine.
- [x] No duplicate topology engine.
- [x] No automatic WorkRequest during simulation.
- [x] No Phase 15 document-version execution.
- [x] Simulation is mutation-free.
- [x] Proposal state separated from simulation result.
- [x] Proposal state separated from immutable audit.
- [x] SIMULATED persistence semantics defined.
- [x] Acceptance boundary defined (handoff to Phase 7.4).
- [x] State fingerprint canonicalization defined.
- [x] State dependency scope defined.
- [x] Staleness is state divergence ($S_1 \neq S_2$).
- [x] Parallel proposals handled through state divergence.
- [x] Phase 10 checks verified individually (`chk_governance_enabled` through `chk_knowledge_risk`).
- [x] Phase 11 semantics verified (`predictVerificationRequirements` adapter).
- [x] Phase 12 semantics verified (missing baseline returns `hasActiveBaseline: false`).
- [x] Phase 9 semantics verified (`calculateEvidenceCoverage`).
- [x] Contract simulation bounded to repository-supported data (JSON schema structural diffs).
- [x] Relationship operations bounded (`ADD_RELATIONSHIP`, `REMOVE_RELATIONSHIP`).
- [x] Deprecation uses existing lifecycle semantics (`DocumentStatus` `'DEPRECATED'`).
- [x] Partial/indeterminate results explicitly modeled (`COMPLETE`, `TRUNCATED_PARTIAL`, `INDETERMINATE`).
- [x] Truncation cannot appear complete (`MAX_DEPTH = 3`, `MAX_NODES = 50`).
- [x] Cross-project ACL uses existing authorization (`checkUserProjectReadAccess`).
- [x] Unauthorized entities completely omitted.
- [x] No restricted counts disclosed.
- [x] Persistence justified.
- [x] No unnecessary simulation-result collections.
- [x] No mandatory AI/LLM/vector dependency.
- [x] No Jira/task-management drift.
- [x] No unsupported performance claims.
