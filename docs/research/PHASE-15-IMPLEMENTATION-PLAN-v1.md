# Phase 15 — Pre-Change Impact Simulation & Change Proposal Engine
## Formal Implementation Plan v1

**Baseline Revision**: `f5ec56b86b75f9448fb0ca524b44c7a8b2497b10`  
**Target File**: `docs/research/PHASE-15-IMPLEMENTATION-PLAN-v1.md`  
**Status**: DRAFT — PENDING FORMAL REVIEW (PLANNING-ONLY)

---

## 1. Executive Summary

Phase 15 extends Documan from **reactive change governance** to **deterministic pre-change decision support**. 

Today, when a documentation or technical contract change is saved in Documan, downstream impact cascades (Phase 7.3), verification plan updates (Phase 11), baseline drift calculations (Phase 12), evidence recalculations (Phase 9), and governance gate checks (Phase 10) execute *after* the `DocumentVersion` is committed to the database.

Phase 15 introduces the **Change Proposal & Pre-Change Impact Simulation Engine**. It empowers engineers, architects, and technical writers to construct a "what-if" proposal—containing proposed document content updates, technical API contract schema modifications, proposed relationship updates, or deprecation requests—and execute a **100% read-only, in-memory simulation**.

The simulation engine calculates and returns the predicted system state:
- **Predicted Upstream & Downstream Impact Cascade** (Phase 7.3)
- **Predicted Cross-Project Blast Radius & Topology Reach** (Phase 14)
- **Predicted Baseline Drift & Version Snapshot Mismatches** (Phase 12)
- **Predicted Evidence Coverage & Gap Implications** (Phase 9)
- **Predicted Verification Requirements & Task Allocations** (Phase 11)
- **Predicted Assurance & Governance Gate Evaluation** (Phase 10)
- **Predicted Affected & Conflicting Work Requests** (Phase 13)

### Core Architectural Principle
Phase 15 **MUST NOT** build a duplicate calculation engine for impact, drift, assurance, verification, evidence, or topology. Instead, Phase 15 sits as an orchestration layer above pure calculation algorithms and simulation adapters, supplying simulated targets in-memory without mutating any underlying database entities (`Document`, `DocumentVersion`, `DocumentRelationship`, `ProjectTopologyLink`, `DocumentationBaseline`, `VerificationPlan`, `DocumentationWorkRequest`, or `DocumentAudit`).

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

## 3. Product Scope

### What Phase 15 Adds
1. **Change Proposal Domain (`DocumentChangeProposal`)**: Persisted proposal envelope allowing users to draft, preview, simulate, review, and track pre-change proposals prior to document version creation.
2. **Pre-Change Impact Simulation Engine (`change-proposal-simulation.service.ts`)**: A read-only orchestration engine that accepts simulated target inputs and invokes simulation adapters to run existing Phase 7.3, Phase 9, Phase 10, Phase 11, Phase 12, Phase 13, and Phase 14 logic in-memory.
3. **Dual Simulation Modes**:
   - **Ephemeral Simulation (`POST /api/documents/:documentId/simulate-change`)**: Instant in-memory simulation without writing any database records.
   - **Persisted Change Proposal (`POST /api/projects/:projectId/proposals`)**: Persisted proposal record for team review, collaborative simulation, and approval workflow.
4. **Deterministic Pre-Change Decision Support Output**: Standardized response structure containing current vs. predicted metrics, cross-project blast radius, predicted governance gate passes/failures, and predicted verification requirements.
5. **Phase 13 Application Handoff**: Upon explicit approval and application of an accepted proposal, Phase 15 creates the authoritative `DocumentVersion` and invokes Phase 13 `createWorkRequestInternal` for any predicted downstream work tasks.
6. **Integrated UX**:
   - **`DocumentDetailsPage`**: "Propose Change / Run Simulation" tab and side drawer for instant impact simulation.
   - **`ProjectDetailsPage`**: "Change Proposals" tab listing active proposals, their simulation status, predicted blast radius, and decision control.

---

## 4. Non-Goals

Phase 15 explicitly **EXCLUDES** the following features to maintain strict boundary control:

- ❌ **No Second Impact/Drift/Assurance Engine**: All calculations must reuse or adapt existing service logic.
- ❌ **No Automatic Work Request Creation During Simulation**: Work requests are ONLY created upon explicit proposal application, never during simulation.
- ❌ **No Mandatory AI/LLM/Vector Dependencies**: Simulations are 100% deterministic algorithms.
- ❌ **No Visual Architecture Canvas or Drag-and-Drop Editor**: Architecture topology remains structured list/graph views.
- ❌ **No Jira/Trello/GitHub Sync**: Documan remains the single source of authoritative technical documentation governance.
- ❌ **No Real-Time API Execution/Testing**: Contract changes simulate schema drift, not network traffic.
- ❌ **No Infrastructure Monitoring / Telemetry Ingestion**: Drift is strictly document & contract state alignment.

---

## 5. Domain Model & Classifications

### Subsystem Reuse Strategy & Classification

To fulfill the Critical Architectural Principle, every reused capability across Documan has been analyzed and classified as follows:

| Subsystem / Service | Classification | Reuse Mechanics & Evidence |
| :--- | :--- | :--- |
| **Phase 7.3 Impact Cascade** (`document-impact-cascade.service.ts`) | **REQUIRES SIMULATION ADAPTER** | `processUpstreamDocumentImpact` is stateful: it updates document Mongoose records (`needsVerification: true`), creates `VerificationPlan` DB records, and creates `DocumentationWorkRequest` DB records. **Adapter Strategy**: Extract pure traversal algorithm `simulateUpstreamImpactTraversal()` that executes `MAX_DEPTH = 3` and `MAX_NODES = 50` graph traversal in-memory against simulated document inputs. |
| **Phase 9 Evidence Calculator** (`evidence-calculator.ts`) | **SAFE DIRECT REUSE** | `calculateDocumentEvidenceCoverage()` is a pure function taking document and relationship context and returning scores. Safe to call directly with simulated document properties. |
| **Phase 10 Release Gate Evaluator** (`release-gate-evaluator.service.ts`) | **SAFE DIRECT REUSE** | `evaluateReleaseGate()` and `calculateDocumentAssurance()` are pure calculation functions evaluating document state and project rules without DB side effects. |
| **Phase 11 Verification Plan Service** (`verification-plan.service.ts`) | **REQUIRES SIMULATION ADAPTER** | `generateVerificationPlan()` writes `VerificationPlan` and `VerificationTask` Mongoose records to MongoDB. **Adapter Strategy**: Implement `predictVerificationRequirements()` pure calculation function running the verification rules matrix in-memory. |
| **Phase 12 Drift Calculator** (`drift-calculator.service.ts`) | **SAFE DIRECT REUSE** | `calculateProjectBaselineDrift()` and `calculateDocumentBaselineDrift()` perform read-only comparisons between baseline snapshots and document content/checksums. Safe to call with simulated version snapshots. |
| **Phase 13 Work Request Service** (`work-request.service.ts`) | **REQUIRES SIMULATION ADAPTER / HANDOFF BOUNDARY** | Creating work requests writes `DocumentationWorkRequest` records and sends notifications. **Adapter Strategy**: During simulation, output predicted work items in-memory. Handoff to `work-request.service.ts` occurs ONLY when proposal is transitioned to `APPLIED`. |
| **Phase 14 Project Topology Service** (`project-topology.service.ts`) | **PURE CALCULATION REUSE** | `getProjectTopology()` and `getCrossProjectDependencies()` return topology trees and contract metrics. Safe to run against simulated relationship graphs with cross-project ACL filtering. |

---

## 6. Change Proposal Domain & Persistence Justification

### Domain Differentiation
- **Simulation Input**: Ephemeral payload sent in a `POST` request to test a hypothetical change without saving state.
- **Persisted Change Proposal (`DocumentChangeProposal`)**: A formal, persistent document proposal stored in MongoDB. Necessary to support multi-user code/doc review, asynchronous simulation execution, compliance history of pre-change decisions, and explicit transition to `ACCEPTED` / `APPLIED`.
- **Actual Document Change (`DocumentVersion`)**: The authoritative, immutable document snapshot created ONLY when a proposal is applied.

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
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISCARDED = 'DISCARDED',
  APPLIED = 'APPLIED',
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
    addedRelationships?: Array<{
      targetDocumentId: Types.ObjectId;
      type: string;
      description?: string;
    }>;
    removedRelationshipIds?: Types.ObjectId[];
  };
  status: ProposalStatus;
  createdBy: Types.ObjectId;
  lastSimulatedAt?: Date;
  lastSimulatedBaselineId?: Types.ObjectId;
  lastSimulatedChecksum?: string;
  simulationResultCache?: Record<string, any>; // Stored cached result for instant rendering
  appliedDocumentVersionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 7. Supported Change Types

Phase 15 defines four strictly bounded proposal types:

### 1. `DOCUMENT_CONTENT_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.content`
- **Optional Input**: `proposedChange.title`, `proposedChange.targetVersionType`, `proposedChange.changeDescription`
- **Simulation Behavior**: Calculates predicted content checksum (SHA-256), baseline checksum drift, downstream impact cascade depth, predicted evidence impact, and verification tasks required for content revisions.
- **Validation Rules**: Target document must exist; target document must not be archived.

### 2. `TECHNICAL_CONTRACT_UPDATE`
- **Required Input**: `targetDocumentId`, `proposedChange.contractSchema`
- **Optional Input**: `proposedChange.content`, `proposedChange.targetVersionType`
- **Simulation Behavior**: Validates OpenAPI/JSON Schema structure. Compares against active document contract schema to detect breaking schema changes (field removals, type changes). Triggers breaking change impact cascade across consuming cross-project documents (Phase 14 topology).
- **Validation Rules**: Document `documentType` must be `TECHNICAL_SPEC` or `API_CONTRACT`.

### 3. `RELATIONSHIP_UPDATE`
- **Required Input**: `targetDocumentId`, at least one of `proposedChange.addedRelationships` or `proposedChange.removedRelationshipIds`
- **Simulation Behavior**: Evaluates hypothetical relationship graph updates. Detects circular dependency creation, broken cross-project links, missing dependency evidence, and topology contract count alterations.
- **Validation Rules**: Target relationship documents must exist and be accessible to the user.

### 4. `DEPRECATION_PROPOSAL`
- **Required Input**: `targetDocumentId`, `proposedChange.changeDescription` (reason for deprecation)
- **Simulation Behavior**: Simulates removing/deprecating target document. Evaluates maximum blast radius across all upstream/downstream dependent documents, highlights critical contract breaking alerts, and projects high-priority verification/work tasks across all dependent projects.

### Explicitly Unsupported Change Types
- Arbitrary multi-document batch edits in a single payload (proposals are scoped to a target document and its explicit relationships).
- Direct mutation of historical `DocumentVersion` snapshots.
- Bypassing RBAC or project membership constraints.

---

## 8. Simulation Architecture & Flow

```
[ Client Request: Ephemeral or Persisted Proposal ]
                         │
                         ▼
       [ ChangeProposalSimulationService ]
                         │
      ┌──────────────────┴──────────────────┐
      ▼                                     ▼
[ Authoritative State Snapshot ]   [ Proposed Change Input ]
 (Doc, Version, Baseline, Graph)    (Content, Schema, Rel)
      │                                     │
      └──────────────────┬──────────────────┘
                         ▼
        [ Phase 15 Simulation Adapters ]
  ├── 1. Impact Adapter (Phase 7.3 Traversal)
  ├── 2. Topology Adapter (Phase 14 Blast Radius)
  ├── 3. Baseline Drift Adapter (Phase 12 Checksum/Version)
  ├── 4. Evidence Adapter (Phase 9 Coverage)
  ├── 5. Verification Adapter (Phase 11 Task Generator)
  ├── 6. Release Gate Adapter (Phase 10 Assurance)
  └── 7. Work Request Adapter (Phase 13 Conflict Evaluator)
                         │
                         ▼
     [ Simulation Result Aggregator & ACL Filter ]
     (Omit unauthorized cross-project nodes/metadata)
                         │
                         ▼
      [ Response: Current vs. Predicted Metric Set ]
```

---

## 9. Predicted vs. Authoritative State Separation

To eliminate any risk of confusing simulated values with authoritative database state:

1. **Explicit Data Envelope**: The simulation response MUST return data wrapped in distinct top-level keys: `currentAuthoritativeState` vs. `predictedSimulatedState`.
2. **No Model Side-Effects**: All simulation adapters operate on instantiated plain JS objects (DTOs) or cloned Mongoose documents in memory. No `.save()` or Mongoose mutation calls are ever performed during simulation.
3. **Clear UI Demarcation**: Frontend components will render predicted metrics with distinct visual badges ("SIMULATED", "PREDICTED") and Amber/Purple color coding, completely separate from Green/Red authoritative status pills.

---

## 10. Phase-by-Phase Integration Contracts

### 10.1 Phase 7.3 Impact Cascade Integration
- **Mechanism**: `document-impact-cascade.service.ts` will be refactored to extract `simulateUpstreamDocumentImpact(targetDocId, simulatedChange, userContext)`.
- **Traversal Rules**: Executes depth-first search up to `MAX_DEPTH = 3` and `MAX_NODES = 50`.
- **System Scope vs User Disclosure Scope**:
  - System traversal recursively evaluates all impacted connected documents across the system topology graph.
  - Prior to returning response, the result is processed by `filterImpactNodesByACL(nodes, userId)`, which strips out any document or project details the requesting user does not have `READ` permission to access. Count of omitted restricted nodes is provided without revealing names or IDs.

### 10.2 Phase 9 Evidence Integration
- **Mechanism**: Passes simulated document content and proposed relationships to `calculateDocumentEvidenceCoverage()`.
- **Outputs**: `predictedCoveragePercentage`, `predictedMissingCategories`, `predictedEvidenceStatus` (`SUFFICIENT` vs `DEFICIENT`).

### 10.3 Phase 10 Assurance Integration
- **Mechanism**: Calls `release-gate-evaluator.service.ts` `evaluateReleaseGate()` supplying the simulated document state, predicted drift severity, and predicted evidence coverage.
- **Outputs**: `predictedGateStatus` (`PASSED`, `WARNING`, `FAILED`), list of `predictedRuleViolations`. Never mutates actual project release gates or creates governance waivers.

### 10.4 Phase 11 Verification Integration
- **Mechanism**: Adapts `verification-plan.service.ts` via `predictVerificationRequirements(simulatedImpactResult)`.
- **Outputs**: `predictedVerificationTasks` list containing task type, priority, and description without persisting `VerificationPlan` or `VerificationTask` documents in MongoDB.

### 10.5 Phase 12 Baseline & Drift Integration
- **Mechanism**: Compares proposed content SHA-256 checksum and contract schema against `DocumentationBaseline.snapshot`.
- **Outputs**: `predictedDriftStatus` (`IN_SYNC`, `DRIFTED`), `predictedDriftDimensions` (Content, Schema, Version), `predictedDriftSeverity`.
- **Missing Baseline Handling**: If no baseline exists for the target document/project, `predictedDriftStatus` returns `NO_BASELINE` with an informative warning pill.

### 10.6 Phase 13 Work Request Integration
- **Mechanism**: Evaluates existing open `DocumentationWorkRequest` records associated with the target document or impacted downstream documents.
- **Outputs**: `affectedWorkRequests` (list of existing active work requests that may be resolved or invalidated by this change) and `predictedNewWorkRequests` (work items that will need to be created upon approval).
- **Handoff Boundary**: When a proposal is transitioned to `APPLIED`, `change-proposal.service.ts` iterates `predictedNewWorkRequests` and calls Phase 13 `workRequestService.createWorkRequestInternal()`.

### 10.7 Phase 14 Cross-Project Topology Integration
- **Mechanism**: Leverages `project-topology.service.ts` `getCrossProjectDependencies()` to map cross-project boundary crossings.
- **Outputs**: `predictedCrossProjectBlastRadius`:
  - `impactedProjectsCount` (accessible to user)
  - `impactedDocumentsCount` (accessible to user)
  - `crossProjectNodes` (filtered list of accessible project/document nodes)
  - `omittedRestrictedProjectsCount` (privacy-safe counter of inaccessible impacted projects)

---

## 11. API Design

All endpoints follow Documan standards, using standard response envelopes `{ success: true, data: ... }` and HTTP error codes.

### 1. Run Ephemeral Simulation
- **`POST /api/documents/:documentId/simulate-change`**
- **Authorization**: Requires `READ` permission on target document and project.
- **Request Body**:
  ```json
  {
    "proposalType": "DOCUMENT_CONTENT_UPDATE",
    "proposedChange": {
      "title": "Updated API Guide",
      "content": "# New API Specification...",
      "contractSchema": { "type": "object", "properties": { "id": { "type": "string" } } }
    }
  }
  ```
- **Response**: `200 OK` with full `SimulationResponseDTO`.

### 2. Create Change Proposal
- **`POST /api/projects/:projectId/proposals`**
- **Authorization**: Requires `EDIT` permission on project.
- **Request Body**: Proposal metadata + `proposedChange`.
- **Response**: `201 Created` with created `DocumentChangeProposal` object.

### 3. List Project Proposals
- **`GET /api/projects/:projectId/proposals?status=UNDER_REVIEW`**
- **Authorization**: Requires `READ` permission on project.
- **Response**: `200 OK` with array of proposal summaries.

### 4. Get Proposal Details & Simulation
- **`GET /api/proposals/:proposalId`**
- **Authorization**: Requires `READ` permission on target project.
- **Response**: `200 OK` with proposal details and cached/fresh simulation results.

### 5. Re-Run Proposal Simulation
- **`POST /api/proposals/:proposalId/simulate`**
- **Authorization**: Requires `READ` permission on target project.
- **Response**: `200 OK` with updated simulation results and updated staleness timestamp.

### 6. Transition Proposal Status (Review / Approve / Reject)
- **`PATCH /api/proposals/:proposalId/status`**
- **Authorization**: Requires `EDIT` or `ADMIN` permission depending on project governance rules.
- **Request Body**: `{ "status": "APPROVED", "reviewComment": "Looks good" }`
- **Response**: `200 OK`.

### 7. Apply Proposal (Create Authoritative DocumentVersion)
- **`POST /api/proposals/:proposalId/apply`**
- **Authorization**: Requires `EDIT` / `ADMIN` permission.
- **Behavior**: Atomically creates `DocumentVersion`, updates `Document`, updates relationships, triggers Phase 7.3 authoritative impact, creates Phase 13 Work Requests, and marks proposal status as `APPLIED`.
- **Response**: `200 OK` with created `DocumentVersion` details.

---

## 12. Frontend & UX Architecture

### 1. `DocumentDetailsPage` Extension
- Add **"Propose & Simulate"** button to the header actions.
- Clicking opens a slide-over panel:
  - **Tab 1: Change Input**: Live Markdown editor / JSON schema editor for contract updates.
  - **Tab 2: Simulation Results**:
    - **Header Summary Card**: Comparison of Current vs. Predicted Governance Gate status (`PASSED` -> `WARNING`).
    - **Blast Radius Card**: Visual badge list of impacted downstream documents & cross-project dependencies.
    - **Drift Prediction Card**: Baseline checksum & schema drift indicator.
    - **Verification & Work Requirements Card**: List of predicted tasks and affected work requests.
  - **Action Footer**: "Save as Draft Proposal", "Submit for Review", or "Discard".

### 2. `ProjectDetailsPage` Extension
- Add **"Change Proposals"** tab next to "Topology" and "Baselines".
- Table view listing active proposals with columns: `Proposal #`, `Target Document`, `Type`, `Proposer`, `Predicted Blast Radius`, `Predicted Gate Status`, `Status`, `Actions`.
- Detail modal allowing team members to review proposed diffs, view simulation findings, and execute Approve / Reject / Apply actions.

---

## 13. Authorization, Security & Privacy Model

### Cross-Project ACL Enforcement
Phase 14 introduced cross-project topology visibility rules. Phase 15 enforces the exact same strict privacy constraints:

1. **System Traversal vs. Disclosure Filtering**:
   - The simulation adapter traverses the entire graph across projects.
   - The `ProposalACLService.filterSimulationResults(userId, rawResults)` method evaluates the requesting user's project memberships (`ProjectMember`).
2. **Omission Rules**:
   - If an impacted project is NOT accessible to the user:
     - The project name is NOT revealed.
     - Document titles and IDs are NOT revealed.
     - Schema diffs and content snippets are NOT revealed.
     - The node is omitted from the `crossProjectNodes` array.
     - `omittedRestrictedProjectsCount` is incremented by 1.
3. **No Information Leakage via Counts**:
   - Aggregated counters only summarize total omitted project boundaries without revealing specific project IDs or metadata.

---

## 14. Staleness & Concurrency Control

A simulation is valid only for the exact baseline state at the time it was computed.

### Staleness Detection Mechanism
Every stored simulation result includes:
- `simulatedAt`: Timestamp of simulation execution.
- `targetDocumentVersionNumber`: Version number of the document when simulated.
- `targetDocumentChecksum`: Content SHA-256 checksum at simulation time.
- `baselineChecksum`: Target baseline content checksum at simulation time.

When fetching or viewing a Change Proposal:
1. `change-proposal.service.ts` compares the proposal's stored `targetDocumentChecksum` against the target document's current active version checksum.
2. If the checksums mismatch, the proposal simulation is marked **`STALE`** (`isStale: true`).
3. The UI renders a warning banner:  
   > ⚠️ **Stale Simulation Alert**: The underlying target document has been updated since this simulation was run. Re-run simulation to view updated impact predictions.

---

## 15. Testing Strategy

### 1. Unit Tests (`apps/api/src/modules/change-proposals/*.test.ts`)
- Schema & DTO validation for all 4 proposal types.
- Pure simulation calculation functions (checksum calculation, diff detection).
- ACL privacy filter logic (verifying complete omission of unauthorized nodes).
- Staleness detection logic (verifying checksum mismatch triggers `isStale: true`).

### 2. Integration Tests
- End-to-end ephemeral simulation route (`POST /api/documents/:id/simulate-change`).
- Persisted proposal lifecycle (Draft -> Simulated -> Approved -> Applied).
- Verification that proposal application correctly invokes Phase 13 `createWorkRequestInternal` and Phase 7.4 `documentVersionService`.

### 3. Security & Privacy Tests
- Cross-project proposal simulation with multi-tenant user accounts.
- Asserting zero restricted project names, document IDs, or schema fields appear in response payloads for non-member users.

### 4. Regression Test Suites
- Re-run full QA test suites for Phase 10, Phase 11, Phase 12, Phase 13, and Phase 14 to verify zero regression.

---

## 16. Manual QA Matrix (25 Scenarios)

| # | Test Scenario | Expected Result |
| :- | :--- | :--- |
| 1 | Create content update proposal on valid document | Proposal saved in `DRAFT` status; no version created. |
| 2 | Run ephemeral simulation on content update | Returns 200 OK with predicted impact depth and drift prediction; 0 DB mutations. |
| 3 | Verify document content remains unchanged after simulation | Authoritative document content and version remain identical. |
| 4 | Run contract schema update simulation (breaking change) | Simulation correctly predicts `WARNING`/`FAILED` gate status and cross-project impact. |
| 5 | Run relationship addition simulation | Identifies predicted topology node additions and link validation. |
| 6 | Run relationship removal simulation (circular link check) | Validates graph integrity and reports predicted disconnected dependencies. |
| 7 | Run deprecation proposal simulation | High impact blast radius predicted across all upstream dependent documents. |
| 8 | Cross-project simulation with restricted project dependency | Unauthorized project is completely omitted; `omittedRestrictedProjectsCount` incremented. |
| 9 | Verify no restricted project names leak in response | Payload contains zero restricted strings or IDs. |
| 10 | Baseline drift prediction when baseline exists | Accurately predicts checksum mismatch and drift severity. |
| 11 | Baseline drift prediction when NO baseline exists | Returns `NO_BASELINE` status with appropriate UI warning. |
| 12 | Evidence coverage prediction | Predicts missing evidence categories for proposed technical content. |
| 13 | Verification requirement prediction | Outputs predicted verification tasks without creating `VerificationTask` DB records. |
| 14 | Gate assurance evaluation prediction | Evaluates Phase 10 rules in-memory without creating gate waivers. |
| 15 | Verify no `DocumentationWorkRequest` created during simulation | Database count of `DocumentationWorkRequest` remains unchanged. |
| 16 | Stale simulation detection after target document edit | Editing target document sets proposal `isStale: true` and triggers UI warning banner. |
| 17 | Re-run stale simulation | Updates simulation cache, clears `isStale` flag, updates `simulatedAt`. |
| 18 | Transition proposal status (`DRAFT` -> `UNDER_REVIEW`) | Status updates; audit event logged for proposal lifecycle. |
| 19 | Transition proposal status (`UNDER_REVIEW` -> `APPROVED`) | Approved status updated with review comments. |
| 20 | Transition proposal status (`UNDER_REVIEW` -> `REJECTED`) | Proposal marked rejected; reason recorded. |
| 21 | Apply approved change proposal | Creates authoritative `DocumentVersion`, updates document, creates Phase 13 work requests, marks proposal `APPLIED`. |
| 22 | Attempt to apply proposal without `EDIT` permission | Returns 403 Forbidden. |
| 23 | Attempt to simulate invalid OpenAPI JSON schema | Returns 400 Bad Request with schema validation error details. |
| 24 | Frontend UI distinction check | UI clearly displays "PREDICTED / SIMULATED" badge vs "AUTHORITATIVE" badge. |
| 25 | Phase 10–14 Regression Check | All existing governance, baseline, topology, and work request tests pass cleanly. |

---

## 17. Failure Modes & Graceful Handling

1. **Simulation Timeout / Deep Graph Traversal**:
   - Traversal capped at `MAX_DEPTH = 3` and `MAX_NODES = 50`.
   - Traversal aborts gracefully if limits are reached, returning `isPartialSimulation: true` with a clear warning message.
2. **Malformed Schema Input**:
   - JSON Schema / OpenAPI validator returns structured 400 validation error without executing simulation traversal.
3. **Inaccessible Baseline**:
   - If baseline service is unreachable or uninitialized, simulation continues and marks drift section as `INDETERMINATE`.

---

## 18. Implementation Sequence

1. **Domain & DTO Definition**:
   - Create `DocumentChangeProposal` Mongoose model, TypeScript interfaces, and validation schemas.
2. **Pure Simulation Primitive & Adapters**:
   - Implement `simulateUpstreamDocumentImpact` adapter in `document-impact-cascade.service.ts`.
   - Implement `predictVerificationRequirements` adapter in `verification-plan.service.ts`.
3. **Simulation Orchestration Service**:
   - Build `change-proposal-simulation.service.ts` to coordinate adapters and aggregate results.
4. **ACL & Security Filter**:
   - Build `ProposalACLService` to filter simulation results against user project permissions.
5. **Proposal Management Service & API Routes**:
   - Build `change-proposal.service.ts` and Express controllers/routes (`/api/documents/:id/simulate-change`, `/api/projects/:id/proposals`, `/api/proposals/*`).
6. **Proposal Application & Phase 13 Handoff**:
   - Implement proposal apply logic creating `DocumentVersion` and triggering `createWorkRequestInternal`.
7. **Frontend Component Development**:
   - Build "Propose & Simulate" drawer in `DocumentDetailsPage`.
   - Build "Change Proposals" tab in `ProjectDetailsPage`.
8. **Automated Testing & QA Verification**:
   - Write unit, integration, and security test suites; execute manual QA matrix (25 scenarios).

---

## 19. Definition of Done

- [ ] `DocumentChangeProposal` model and DTOs created with proper indexes.
- [ ] Ephemeral simulation endpoint `POST /api/documents/:id/simulate-change` operational.
- [ ] Proposal CRUD and lifecycle state machine fully functional.
- [ ] 100% read-only simulation verified (0 DB side-effects during simulation).
- [ ] Cross-project ACL filter verified (0 unauthorized nodes/names leaked).
- [ ] Phase 13 handoff verified (Work Requests created ONLY upon proposal application).
- [ ] Frontend UI drawer and proposal tab implemented with visual state separation.
- [ ] All automated unit, integration, and security tests passing.
- [ ] ESLint, TypeScript API typecheck, and Vite web build succeed cleanly.
- [ ] Manual QA matrix (25 scenarios) verified.
- [ ] Git status clean on working feature branch.

---

## 20. Open Questions

1. **Proposal Auto-Archiving / Retention**: Should expired/discarded proposals be automatically purged after 90 days?
   - *Recommendation*: Retain proposals indefinitely as lightweight audit history, adding an optional `archivedAt` field for UI filtering.
2. **Parallel Proposal Conflicts**: How should Documan handle two active proposals targeting the same document?
   - *Recommendation*: Allow multiple active draft proposals. When one proposal is `APPLIED`, mark all other active proposals for that target document as `STALE` with a notification to re-simulate.

---

## 21. Plan Review Checklist

- [x] No duplicate impact engine.
- [x] No duplicate assurance engine.
- [x] No duplicate verification engine.
- [x] No duplicate baseline/drift engine.
- [x] No duplicate evidence engine.
- [x] No duplicate topology engine.
- [x] No automatic Work Request creation during simulation.
- [x] Simulation cannot mutate authoritative state.
- [x] Predicted state clearly separated from authoritative state.
- [x] Cross-project ACL is explicit; unauthorized nodes omitted.
- [x] Proposal types are bounded.
- [x] Persistence is justified.
- [x] Stale simulations are handled.
- [x] Existing repository behavior verified.
- [x] No invented fields/routes/helpers.
- [x] No mandatory AI/LLM/vector dependency.
- [x] Phase 10 remains gate authority.
- [x] Phase 11 remains verification authority.
- [x] Phase 12 remains baseline/drift authority.
- [x] Phase 13 remains work-request authority.
- [x] Phase 14 remains topology authority.
