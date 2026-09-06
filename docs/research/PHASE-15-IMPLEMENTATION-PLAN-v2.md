# Phase 15 — Pre-Change Impact Simulation & Change Proposal Engine
## Formal Implementation Plan v2

**Baseline Revision**: `f5ec56b86b75f9448fb0ca524b44c7a8b2497b10` (`main = origin/main`)  
**Target Deliverable**: `docs/research/PHASE-15-IMPLEMENTATION-PLAN-v2.md`  
**Status**: DRAFT — PENDING FORMAL REVIEW (PLANNING-ONLY)

---

## 1. Executive Summary

Phase 15 extends Documan from **reactive change governance** to **deterministic pre-change decision support**. 

In current Documan baseline (Phases 7.3 through 14), downstream change impact cascades, verification task creation, baseline drift evaluation, evidence recalculations, and governance gate checks execute *after* an authoritative `DocumentVersion` is created in MongoDB.

Phase 15 introduces the **Change Proposal & Pre-Change Impact Simulation Engine**. It enables engineers, technical writers, and architects to construct a hypothetical change proposal—containing content edits, OpenAPI/JSON contract schema updates, relationship graph modifications, or deprecation requests—and execute a **100% read-only, in-memory pre-change simulation**.

The simulation engine calculates and returns predicted metrics:
- **Predicted Upstream & Downstream Impact Cascade** (Phase 7.3)
- **Predicted Cross-Project Blast Radius & Topology Reach** (Phase 14)
- **Predicted Baseline Drift & Version Snapshot Mismatches** (Phase 12)
- **Predicted Evidence Coverage & Gap Implications** (Phase 9)
- **Predicted Verification Requirements** (Phase 11)
- **Predicted Assurance & Governance Gate Evaluation** (Phase 10)
- **Predicted Affected & Required Work Items** (Phase 13)

### Core Architectural Principle
Phase 15 **MUST NOT** build a duplicate impact, drift, assurance, verification, evidence, or topology calculation engine. Instead, Phase 15 functions as a read-only orchestration layer over existing pure calculation algorithms and simulation adapters, evaluating hypothetical inputs in-memory without mutating any database entity (`Document`, `DocumentVersion`, `DocumentRelationship`, `ProjectTopologyLink`, `DocumentationBaseline`, `VerificationPlan`, `DocumentationWorkRequest`, or `DocumentAudit`).

---

## 2. Repository Baseline

- **Repository Root**: `c:\MERN_STACK\Documan\documan`
- **Git Commit Baseline**: `f5ec56b86b75f9448fb0ca524b44c7a8b2497b10` (`main = origin/main`)
- **Active Technical Architecture**:
  - Express backend (`apps/api`) with Mongoose ODM (MongoDB).
  - React/Vite frontend (`apps/web`) with TypeScript, Tailwind CSS, and Lucide icons.
  - Phase 7.3: `document-impact-cascade.service.ts`
  - Phase 7.4: `document-version.model.ts`, `document-version.service.ts`
  - Phase 7.5: `knowledge-risk-radar.service.ts`
  - Phase 8: `technical-knowledge-discovery.service.ts`
  - Phase 9: `evidence-calculator.ts`
  - Phase 10: `release-gate-evaluator.service.ts`, `assurance-calculator.ts`
  - Phase 11: `verification-plan.service.ts`
  - Phase 12: `drift-calculator.service.ts`, `baseline.service.ts`
  - Phase 13: `work-request.service.ts`
  - Phase 14: `project-topology.service.ts`

---

## 3. Product Scope & Boundary Controls

### What Phase 15 Adds
1. **Change Proposal Domain (`DocumentChangeProposal`)**: A persistent proposal envelope for multi-user drafting, reviewing, tracking, and simulating hypothetical document changes prior to authoritative version creation.
2. **Dual Simulation Execution Modes**:
   - **Ephemeral Simulation (`POST /api/documents/:documentId/simulate-change`)**: 100% read-only in-memory simulation with zero database persistence.
   - **Persisted Change Proposal (`POST /api/projects/:projectId/proposals`)**: Persisted proposal record enabling collaborative review, decision tracking, and proposal state lifecycle.
3. **Pre-Change Impact Simulation Engine (`change-proposal-simulation.service.ts`)**: Read-only orchestrator running simulation adapters over existing Phase 7.3, 9, 10, 11, 12, 13, and 14 calculation logic.
4. **Authoritative State Handoff**: Upon explicit proposal acceptance (`ACCEPTED`), the user transitions to the authoritative document update workflow (`documentVersionService.createVersion`). Once created, Phase 13 `createWorkRequestInternal` is invoked for predicted downstream work items.
5. **Integrated UX**:
   - **`DocumentDetailsPage`**: "Propose & Simulate" side drawer for instant impact simulation.
   - **`ProjectDetailsPage`**: "Change Proposals" tab listing active proposals, simulation status, predicted blast radius, and decision controls.

### Non-Goals
Phase 15 strictly **EXCLUDES**:
- ❌ **No Duplicate Calculation Engines**: Reuses existing services/calculators.
- ❌ **No Arbitrary Document Change Execution by Phase 15**: Phase 15 does NOT apply document updates directly; authoritative version creation remains in Phase 7.4.
- ❌ **No Automatic Work Request Creation During Simulation**: Work requests are created ONLY after proposal acceptance and authoritative document version creation.
- ❌ **No Restricted Project Counts or Structural Leakage**: Zero counts, obfuscated IDs, or metadata returned for unauthorized projects.
- ❌ **No Mandatory AI/LLM/Vector Dependencies**: 100% deterministic algorithms.
- ❌ **No Jira/Trello/GitHub Sync**: Documan remains the single source of authoritative technical documentation governance.

---

## 4. Subsystem Reuse Strategy & Classification

To enforce the Critical Architectural Principle, every reused capability has been classified based on repository code analysis:

| Subsystem / Service | Classification | Reuse Strategy & Evidence |
| :--- | :--- | :--- |
| **Phase 7.3 Impact Cascade** (`document-impact-cascade.service.ts`) | **REQUIRES SIMULATION ADAPTER** | `processUpstreamDocumentImpact` updates Mongoose records (`needsVerification: true`) and creates `VerificationTask` & `WorkRequest` DB documents. **Adapter Strategy**: Extract pure in-memory traversal algorithm `simulateUpstreamDocumentImpact()` running depth-first traversal (`MAX_DEPTH = 3`, `MAX_NODES = 50`) against a simulated graph. |
| **Phase 9 Evidence Calculator** (`evidence-calculator.ts`) | **SAFE DIRECT REUSE** | `calculateDocumentEvidenceCoverage()` is a pure calculation function taking document/relationship state and returning coverage scores. Safe to invoke directly with simulated target state. |
| **Phase 10 Release Gate Evaluator** (`release-gate-evaluator.service.ts`) | **SAFE DIRECT REUSE (CHECK-BY-CHECK)** | Evaluates gate rules in-memory. Checks 1, 4 perform pure evaluation against active state; Checks 2, 3, 5 accept simulated evidence, drift, and schema diff inputs without side effects. |
| **Phase 11 Verification Plan Service** (`verification-plan.service.ts`) | **REQUIRES SIMULATION ADAPTER** | `generateVerificationPlan()` writes `VerificationPlan` and `VerificationTask` records to MongoDB. **Adapter Strategy**: Implement `predictVerificationRequirements()` pure calculation function running priority rules matrix in-memory. |
| **Phase 12 Drift Calculator** (`drift-calculator.service.ts`) | **SAFE DIRECT REUSE** | `calculateProjectBaselineDrift()` and `calculateDocumentBaselineDrift()` perform read-only comparisons between baseline snapshots and content checksums. Safe to invoke with simulated version DTOs. |
| **Phase 13 Work Request Service** (`work-request.service.ts`) | **REQUIRES SIMULATION ADAPTER / HANDOFF BOUNDARY** | `createWorkRequestInternal` writes DB records and dispatches notifications. **Adapter Strategy**: Output predicted work items in-memory during simulation. Handoff occurs ONLY after proposal is marked `ACCEPTED` and authoritative `DocumentVersion` is created. |
| **Phase 14 Project Topology Service** (`project-topology.service.ts`) | **PURE CALCULATION REUSE** | `getCrossProjectDependencies()` returns topology trees and contract metrics. Safe to run against simulated relationship graphs with `checkUserProjectReadAccess` ACL filtering. |

---

## 5. Domain Model & Proposal Lifecycle

### Domain Differentiation
- **Simulation Input**: Ephemeral JSON payload sent in a `POST` request to test a hypothetical change without saving state.
- **Persisted Change Proposal (`DocumentChangeProposal`)**: Persistent MongoDB record for team review, reproducible simulation results, decision tracking, and formal acceptance/rejection.
- **DocumentAudit**: Immutable audit history. Exploratory simulations emit **NO audit logs**. Audit logs are created ONLY for major proposal state transitions (`CHANGE_PROPOSAL_CREATED`, `CHANGE_PROPOSAL_SUBMITTED`, `CHANGE_PROPOSAL_ACCEPTED`, `CHANGE_PROPOSAL_REJECTED`, `CHANGE_PROPOSAL_DISCARDED`).
- **Actual Document Change (`DocumentVersion`)**: Authoritative, immutable snapshot created ONLY via existing Phase 7.4 workflow after proposal acceptance.

### Proposal State Machine
```
   [ DRAFT ] ──────────► [ SIMULATED ]
       │                      │
       ▼                      ▼
[ DISCARDED ] ◄─────── [ UNDER_REVIEW ]
                         ├───► [ ACCEPTED ] ──► (Authoritative Version Created)
                         └───► [ REJECTED ]
```

### Database Schema: `DocumentChangeProposal`
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
  stateFingerprintAtSimulation?: string; // Composite fingerprint of dependency states
  simulationResultCache?: Record<string, any>; // Stored cached result DTO
  acceptedAuthoritativeVersionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. Supported Change Types & Contract Boundaries

Phase 15 defines four strictly bounded proposal types:

### 1. `DOCUMENT_CONTENT_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.content`
- **Optional Input**: `proposedChange.title`, `proposedChange.targetVersionType`, `proposedChange.changeDescription`
- **Simulation Behavior**: Computes proposed SHA-256 content checksum, baseline checksum drift, downstream impact cascade depth, predicted evidence coverage, and verification tasks required for content revisions.
- **Validation**: Target document must exist and not be archived.

### 2. `TECHNICAL_CONTRACT_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.contractSchema`
- **Supported Deterministic Contract Signals**: Field additions/removals, property type changes, required field modifications, structural JSON schema diffs.
- **Unsupported Semantic Analysis**: Generic natural language semantic intent analysis is explicitly excluded.
- **Simulation Behavior**: Compares proposed schema against active document contract schema. Triggers breaking contract impact cascade across dependent cross-project documents (Phase 14 topology).
- **Validation**: Document `documentType` must be `TECHNICAL_SPEC` or `API_CONTRACT`.

### 3. `RELATIONSHIP_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.relationshipOperations`
- **Operations**: `ADD_RELATIONSHIP`, `REMOVE_RELATIONSHIP`.
- **Validation**: Reuses `DocumentRelationshipType` enums (`DEPENDS_ON`, `IMPLEMENTS`, `DOCUMENTED_BY`, `SUPERSEDES`, etc.). Prevents self-references, validates source/target existence, enforces existing relationship duplication rules.
- **Simulation Behavior**: Evaluates hypothetical graph updates, detecting circular dependencies, disconnected downstream paths, and topology contract count modifications.

### 4. `DEPRECATION_PROPOSAL`
- **Required Input**: `targetDocumentId`, `proposedChange.changeDescription` (reason for deprecation)
- **Data Protection**: **MUST NOT** delete document files, mutate document Mongoose models, or alter actual lifecycle status.
- **Simulation Behavior**: Treats target document as hypothetically `DEPRECATED` in-memory. Traverses full upstream/downstream impact cascade across dependent documents, highlights critical contract breakages, and projects high-priority verification/work requirements.

---

## 7. Simulation Architecture & State Construction

### Simulated Graph State Construction
To evaluate Phase 7.3 impact cascades accurately without mutating database state, the simulation adapter constructs a simulated graph representation in-memory:

$$\text{SimulatedGraph} = (\text{Current Authoritative Graph}) + (\text{Proposed Target Change}) + (\text{Proposed Added Relationships}) - (\text{Proposed Removed Relationships})$$

### Execution Flow
```
[ Client Request: Ephemeral or Persisted Proposal ]
                         │
                         ▼
       [ ChangeProposalSimulationService ]
                         │
      ┌──────────────────┴──────────────────┐
      ▼                                     ▼
[ Authoritative Dependency State ]  [ Proposed Change Input ]
 (Doc, Baseline, Graph Snapshot)     (Content, Schema, Rels)
      │                                     │
      └──────────────────┬──────────────────┘
                         ▼
         [ In-Memory Simulated State DTO ]
                         │
                         ▼
        [ Phase 15 Simulation Adapters ]
  ├── 1. Impact Adapter (Phase 7.3 Traversal on Simulated Graph)
  ├── 2. Topology Adapter (Phase 14 Blast Radius)
  ├── 3. Baseline Drift Adapter (Phase 12 Checksum/Version Comparison)
  ├── 4. Evidence Adapter (Phase 9 Coverage Calculation)
  ├── 5. Verification Adapter (Phase 11 Task Requirements Matrix)
  ├── 6. Release Gate Adapter (Phase 10 Assurance Rule Checks)
  └── 7. Work Request Adapter (Phase 13 Conflict Evaluator)
                         │
                         ▼
         [ Result Aggregator & ACL Filter ]
    (Uses checkUserProjectReadAccess to omit unauthorized nodes)
                         │
                         ▼
  [ Response: Authoritative State vs. Predicted Simulated State ]
```

---

## 8. Predicted vs. Authoritative State Separation

To prevent any confusion between real database state and simulated predictions:

1. **Explicit Data Envelope**: The simulation API returns data strictly separated into top-level objects:
   ```json
   {
     "success": true,
     "data": {
       "authoritativeState": { "version": "1.2.0", "status": "APPROVED", "gateStatus": "PASSED" },
       "predictedState": { "predictedVersion": "1.3.0", "predictedGateStatus": "WARNING", "predictedDrift": "DRIFTED" }
     }
   }
   ```
2. **Zero Model Side-Effects**: All simulation adapters operate on instantiated plain JavaScript DTO objects. No `.save()`, `.updateOne()`, or Mongoose mutation calls are ever performed.
3. **Clear Frontend UI Visuals**: Frontend components visually distinguish predicted metrics using prominent "SIMULATED / PREDICTED" badges with distinct Amber/Purple styling, completely separated from authoritative Green/Red status pills.

---

## 9. Phase-by-Phase Integration Contracts

### 9.1 Phase 7.3 Impact Cascade Integration
- **Mechanism**: Refactors `document-impact-cascade.service.ts` to extract `simulateUpstreamDocumentImpact(simulatedGraph, targetDocId, userContext)`.
- **Traversal Limits**: Depth-first search capped at `MAX_DEPTH = 3` and `MAX_NODES = 50`.
- **Disclosure Filtering**: Traversed nodes are evaluated against `checkUserProjectReadAccess(userId, role, node.projectId)`. Inaccessible nodes are silently dropped from the result array.

### 9.2 Phase 9 Evidence Integration
- **Mechanism**: `Authoritative Evidence State + Simulated Change → Predicted Evidence State`. Passes simulated document content and simulated relationship set to `calculateDocumentEvidenceCoverage()`.
- **Output**: `predictedCoveragePercentage`, `predictedMissingCategories`, `predictedEvidenceStatus` (`SUFFICIENT` vs `DEFICIENT`).

### 9.3 Phase 10 Assurance Integration (Check-by-Check)
- **Check 1 (Status/Lifecycle)**: SAFE PURE EVALUATION against simulated document status.
- **Check 2 (Evidence Coverage)**: Evaluated using predicted evidence score from Phase 9.
- **Check 3 (Baseline Drift)**: Evaluated using predicted drift status from Phase 12.
- **Check 4 (Verification Tasks)**: SAFE PURE EVALUATION against current active tasks + predicted tasks.
- **Check 5 (Contract Schema)**: Evaluated using predicted breaking schema changes.
- **Output**: `predictedGateStatus` (`PASSED`, `WARNING`, `FAILED`), list of `predictedRuleViolations`. Never creates governance waivers or audits.

### 9.4 Phase 11 Verification Integration
- **Mechanism**: Adapts `verification-plan.service.ts` via `predictVerificationRequirements(simulatedImpactResult)`.
- **Output**: `predictedVerificationTasks` list containing task type, priority, and description without persisting `VerificationPlan` or `VerificationTask` documents in MongoDB.

### 9.5 Phase 12 Baseline & Drift Integration
- **Mechanism**: `Authoritative Baseline Snapshot + Simulated Target State → Predicted Drift`. Compares proposed content SHA-256 checksum and schema against `DocumentationBaseline.snapshot`.
- **Output**: `predictedDriftStatus` (`IN_SYNC`, `DRIFTED`, `NO_BASELINE`), `predictedDriftDimensions` (Content, Schema, Version), `predictedDriftSeverity`. Never writes to `DocumentationBaseline` or creates a `DriftReport`.

### 9.6 Phase 13 Work Request Integration & Handoff Boundary
- **Simulation Stage**: Evaluates active `DocumentationWorkRequest` records. Outputs `affectedExistingWorkRequests` and `predictedWorkTasks` in-memory.
- **Post-Acceptance Handoff Boundary**: When a proposal is marked `ACCEPTED` and the authoritative `DocumentVersion` is created via Phase 7.4, the handoff service iterates `predictedWorkTasks` and calls `workRequestService.createWorkRequestInternal()` idempotently.

### 9.7 Phase 14 Cross-Project Topology Integration
- **Mechanism**: Uses `project-topology.service.ts` `getCrossProjectDependencies()` to evaluate cross-project links.
- **Privacy Enforcement**: Employs `checkUserProjectReadAccess(userId, role, targetProjectId)`. Inaccessible nodes/edges are **completely omitted** with zero count leakage or metadata disclosure.

---

## 10. Authorization, Security & Privacy Model

### Reuse of Repository Authorization Authority
Do **NOT** create a parallel permission system. Phase 15 reuses Documan's existing RBAC and authorization functions:

1. **`checkUserProjectReadAccess(userId, role, projectId)`**:
   - Used for verifying read permission on projects, documents, baselines, topology, and simulation result disclosure.
   - If user lacks read access to an impacted project in the simulation graph, the project node and its associated document nodes are **completely omitted** from the response payload.
2. **`verifyProjectOwnerOrAdmin(userId, role, projectId)` / `checkProjectAccess(userId, role, projectId)`**:
   - Used for proposal mutation operations: creating proposals, updating proposals, submitting for review, accepting, rejecting, or discarding.
3. **Actor Authorization vs. Result Disclosure**:
   - **Actor Authorization**: User must have `READ` access to target project to run an ephemeral simulation, and `EDIT` access to create/manage a proposal.
   - **Result Disclosure**: Every node in the simulated blast radius is individually filtered through `checkUserProjectReadAccess`. Unauthorized nodes are stripped from disclosure.

---

## 11. Simulation State Fingerprint & Staleness Control

A simulation prediction is valid only for the exact baseline state at the time it was computed.

### Deterministic State Fingerprint
Phase 15 replaces simple single-checksum checks with a **Composite State Fingerprint**:

$$\text{Fingerprint} = \text{SHA256}(\text{targetVersion} + \text{targetChecksum} + \text{baselineChecksum} + \text{relationshipHash} + \text{topologyHash})$$

### Staleness Execution & Parallel Proposal Behavior
When fetching or reviewing a stored proposal:
1. `change-proposal.service.ts` recomputes the composite state fingerprint from active MongoDB dependency records.
2. If the current fingerprint mismatches `stateFingerprintAtSimulation`, the proposal is marked **`STALE`** (`isStale: true`).
3. **Parallel Proposals**: If Proposal A and Proposal B both target State $S_1$, and Proposal A is accepted transitioning the document to State $S_2$, Proposal B automatically evaluates as `STALE` on next fetch because $S_2 \neq S_1$. No manual proposal-to-proposal cascade hooks are required.

---

## 12. Truncation & Partial Result Semantics

Traversal algorithms enforce repository limits: `MAX_DEPTH = 3` and `MAX_NODES = 50`.

### Simulation Status Classification
- **`COMPLETE`**: Traversal completed within bounds; all authorized nodes evaluated.
- **`TRUNCATED_PARTIAL`**: Graph traversal reached `MAX_DEPTH` or `MAX_NODES`. Response includes clear UI warning:  
  > ⚠️ **Partial Simulation Alert**: Impact traversal reached maximum system depth (3) or node limits (50). The blast radius shown represents the bounded impact graph.
- **`INDETERMINATE`**: Required dependency inputs (e.g., missing baseline) were unavailable.
- **`UNSUPPORTED`**: Requested proposal type or contract schema format cannot be evaluated.

*Critical Rule*: Unavailable information is **NEVER** converted into "SAFE" or "NO IMPACT".

---

## 13. API Design

All endpoints follow Documan REST conventions, utilizing standard response envelopes `{ success: true, data: ... }` and Express error middleware.

### 1. Run Ephemeral Simulation
- **`POST /api/documents/:documentId/simulate-change`**
- **Authorization**: `checkUserProjectReadAccess` (Requires `READ` access).
- **Request Body**: Proposal type + proposed changes.
- **Response**: `200 OK` with `authoritativeState` vs `predictedState` envelope.

### 2. Create Change Proposal
- **`POST /api/projects/:projectId/proposals`**
- **Authorization**: `checkProjectAccess` (Requires `EDIT` access).
- **Response**: `201 Created` with `DocumentChangeProposal` object.

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
- **Response**: `200 OK` with refreshed simulation results and updated `stateFingerprintAtSimulation`.

### 6. Transition Proposal Status (Review / Reject / Discard)
- **`PATCH /api/proposals/:proposalId/status`**
- **Authorization**: Requires `EDIT` / `ADMIN` permission.
- **Request Body**: `{ "status": "UNDER_REVIEW" | "REJECTED" | "DISCARDED", "reviewComment": "..." }`
- **Response**: `200 OK` + emits `DocumentAudit` event (`CHANGE_PROPOSAL_SUBMITTED`, etc.).

### 7. Accept Proposal (Mark Accepted & Initiate Authoritative Handoff)
- **`POST /api/proposals/:proposalId/accept`**
- **Authorization**: Requires `EDIT` / `ADMIN` permission.
- **Behavior**: Sets proposal status to `ACCEPTED`, logs `CHANGE_PROPOSAL_ACCEPTED` audit record, and returns handoff payload directing the user/client to invoke Phase 7.4 `documentVersionService.createVersion`.

---

## 14. Frontend & UX Architecture

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

## 15. Testing Strategy

### 1. Unit Tests (`apps/api/src/modules/change-proposals/*.test.ts`)
- Schema & DTO validation for all 4 proposal types.
- Pure simulation calculation functions (checksum generation, schema diffing).
- State fingerprint calculation and staleness detection logic.
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

## 16. Manual QA Matrix (25 Scenarios)

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
| 17 | Re-run stale simulation | Updates simulation cache, clears `isStale` flag, updates `stateFingerprintAtSimulation`. |
| 18 | Parallel proposals staleness check | Accepting Proposal A updates document state; Proposal B automatically evaluates as `STALE`. |
| 19 | Traversal limit truncation check | Simulating large graph exceeding `MAX_NODES = 50` sets status `TRUNCATED_PARTIAL` with UI warning. |
| 20 | Transition proposal status (`DRAFT` -> `UNDER_REVIEW`) | Status updates; `CHANGE_PROPOSAL_SUBMITTED` audit event logged. |
| 21 | Transition proposal status (`UNDER_REVIEW` -> `ACCEPTED`) | Status updates to `ACCEPTED`; `CHANGE_PROPOSAL_ACCEPTED` audit logged; handoff payload returned. |
| 22 | Authoritative version creation & Phase 13 handoff | Authoritative `DocumentVersion` created; Phase 13 `createWorkRequestInternal` creates predicted work items. |
| 23 | Attempt proposal creation without `EDIT` permission | Returns 403 Forbidden via `checkProjectAccess`. |
| 24 | Frontend UI visual distinction check | UI clearly displays "PREDICTED / SIMULATED" badge vs "AUTHORITATIVE" badge. |
| 25 | Phase 10–14 Regression Verification | All existing governance, baseline, topology, and work request tests pass cleanly. |

---

## 17. Failure Modes & Graceful Degradation

1. **Graph Traversal Limits**: Traversal capped at `MAX_DEPTH = 3` and `MAX_NODES = 50`. If exceeded, returns status `TRUNCATED_PARTIAL` with explicit UI notice.
2. **Malformed Contract Schema Input**: JSON Schema / OpenAPI validator returns structured 400 validation error without executing simulation traversal.
3. **Unavailable Baseline**: If baseline service is unreachable or uninitialized, simulation continues and marks drift section as `INDETERMINATE`.

---

## 18. Implementation Sequence

1. **Domain & DTO Definition**: Create `DocumentChangeProposal` model, DTOs, and state fingerprint calculation logic.
2. **Simulation Adapters**: Implement pure simulation adapters in Phase 7.3, 9, 10, 11, 12, 13, and 14.
3. **Simulation Orchestrator**: Build `change-proposal-simulation.service.ts` coordinating adapters and applying `checkUserProjectReadAccess` ACL filters.
4. **Proposal Service & Express API Routes**: Build proposal CRUD, lifecycle state machine, and Express endpoints (`/api/documents/:id/simulate-change`, `/api/projects/:id/proposals`, `/api/proposals/*`).
5. **Authoritative Handoff**: Connect proposal acceptance to Phase 7.4 document version creation and Phase 13 `createWorkRequestInternal`.
6. **Frontend UI Components**: Implement "Propose & Simulate" drawer in `DocumentDetailsPage` and "Change Proposals" tab in `ProjectDetailsPage`.
7. **Automated Testing & QA Verification**: Write unit, integration, and security test suites; execute manual QA matrix (25 scenarios).

---

## 19. Definition of Done

- [ ] `DocumentChangeProposal` model and DTOs created with state fingerprint calculation.
- [ ] Ephemeral simulation endpoint `POST /api/documents/:id/simulate-change` operational.
- [ ] Proposal CRUD and lifecycle state machine (`DRAFT` → `SIMULATED` → `UNDER_REVIEW` → `ACCEPTED` / `REJECTED` / `DISCARDED`) functional.
- [ ] 100% read-only simulation verified (0 DB side-effects during simulation).
- [ ] Privacy-safe ACL disclosure verified (unauthorized nodes completely omitted; zero count/metadata leakage).
- [ ] Phase 13 handoff verified (Work Requests created ONLY after proposal acceptance and authoritative document version creation).
- [ ] Composite state fingerprint staleness detection verified.
- [ ] Frontend UI drawer and proposal tab implemented with visual state separation.
- [ ] All automated unit, integration, security, and Phase 10–14 regression tests passing.
- [ ] ESLint, TypeScript API typecheck, and Vite web build succeed cleanly.
- [ ] Manual QA matrix (25 scenarios) verified.
- [ ] Git status clean on working feature branch.

---

## 20. Open Questions

1. **Proposal Auto-Archiving / Retention**: Should expired or discarded proposals be automatically purged after 90 days?
   - *Recommendation*: Retain proposals indefinitely as lightweight proposal history, adding an optional `archivedAt` field for UI filtering.
2. **Parallel Proposal Conflicts**: How should Documan handle multiple active proposals targeting the same document?
   - *Recommendation*: Allow parallel drafts. When one proposal is `ACCEPTED` and applied as an authoritative `DocumentVersion`, composite state fingerprint re-evaluation automatically flags remaining active proposals as `STALE` on next fetch.

---

## 21. Plan Review Checklist

- [x] No duplicate impact engine.
- [x] No duplicate assurance engine.
- [x] No duplicate verification engine.
- [x] No duplicate baseline/drift engine.
- [x] No duplicate evidence engine.
- [x] No duplicate topology engine.
- [x] No automatic Work Request creation during simulation.
- [x] No arbitrary document-change execution by Phase 15.
- [x] Simulation cannot mutate authoritative state.
- [x] Predicted state clearly separated from authoritative state.
- [x] Existing authorization authority (`checkUserProjectReadAccess`, `checkProjectAccess`) reused.
- [x] No restricted counts or metadata leakage.
- [x] Unauthorized entities completely omitted.
- [x] Proposal types are bounded (Content, Contract, Relationship, Deprecation).
- [x] Contract analysis capabilities are repository-supported.
- [x] Relationship operations use existing relationship semantics (`ADD_RELATIONSHIP`, `REMOVE_RELATIONSHIP`).
- [x] Persistence is justified (proposal workflow, multi-user review).
- [x] Proposal state separated from immutable audit history (`DocumentAudit`).
- [x] Staleness covers relevant authoritative inputs via composite state fingerprint.
- [x] Parallel proposal behavior is deterministic.
- [x] Truncated results are not represented as complete (`TRUNCATED_PARTIAL`).
- [x] Phase 10 remains assurance authority.
- [x] Phase 11 remains verification authority.
- [x] Phase 12 remains baseline/drift authority.
- [x] Phase 13 remains Work Request authority.
- [x] Phase 14 remains topology authority.
- [x] No mandatory AI/LLM/vector dependency.
- [x] No Jira/task-management drift.
- [x] No unsupported performance claims.
- [x] No invented repository fields/routes/helpers.
