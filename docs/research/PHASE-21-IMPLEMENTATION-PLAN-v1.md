# Phase 21 Implementation Plan v1: System Topology Pre-Release What-If Simulation & Gate Impact Analyzer

## 1. Executive Summary

Phase 21 introduces a derived, read-only system topology simulation engine ([`system-topology-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts)) and an interactive UI sandbox ([`SystemTopologySimulationSandbox.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx)).

It allows lead technical stewards, project owners, and system architects to evaluate hypothetical cross-project governance changes—such as proposed provider baseline updates, candidate change package attestations, proposed policy waivers, or candidate project topology links—and observe the exact 9-step system release gate outcome, blocker delta, and waiver coverage impact **before making any database mutations in MongoDB**.

---

## 2. Research Basis

This implementation plan is strictly grounded in the approved research document:
- Research Artifact: [`docs/research/PHASE-21-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-21-RESEARCH.md)
- Approved Capability: **Candidate 3 — System Topology Pre-Release What-If Simulation & Gate Impact Analyzer**

---

## 3. Current Repository Architecture

Documan has completed 20 capability phases. System governance release decisions are currently evaluated dynamically at query-time by `evaluateSystemTopologyGovernanceGate` in [`system-topology-governance-gate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts).

The current system synthesizes:
1. **Phase 10**: Single-project local documentation health ([`evaluateReleaseGateInternal`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/release-gate-evaluator.service.ts)).
2. **Phase 14**: ACL-safe project topology links ([`ProjectTopologyLink`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.model.ts)) and permission checks ([`checkUserProjectReadAccess`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.service.ts)).
3. **Phase 17**: Immutable change package fulfillment attestations ([`PackageFulfillmentAttestation`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-packages/change-package-attestation.model.ts)).
4. **Phase 18**: Cross-project baseline contract alignment ([`calculateSystemBaselineAlignment`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-baseline-alignment.service.ts)).
5. **Phase 19**: 9-step precedence governance release decision (`PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`).
6. **Phase 20**: Scoped policy waivers ([`SystemGovernanceWaiver`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-governance-waiver.model.ts)) and `PASSED_WITH_WAIVER` gate outcome.

---

## 4. Problem Being Solved

Documan's system governance gate evaluates release safety dynamically against the live state of MongoDB collections. When technical stewards ask: *"What will happen if Provider Project A publishes Baseline v2.0 next week, and we grant a candidate waiver for Provider Project B's missing attestation?"*, Documan currently **cannot answer without performing actual mutations in production MongoDB databases**.

Phase 21 solves this problem by providing a pure, derived, read-only simulation capability that accepts hypothetical scenarios and previews future gate outcomes without altering MongoDB state.

---

## 5. Product Boundary

Phase 21 strictly maintains Documan's product identity boundaries:
- **No Deployment Execution**: Does NOT trigger software builds, release pipelines, Docker container builds, or cloud deployments.
- **No Database Mutations**: Does NOT insert, update, or delete records in MongoDB.
- **No Background Queue Workers**: Does NOT use Redis, BullMQ, background queue workers, or cron sweep infrastructure.
- **No Mandatory AI / LLM / RAG**: Operates 100% deterministically without machine learning models or vector databases.
- **No Task Board / Jira Clone**: Does NOT create persistent ticket workflows or task assignment boards.
- **No Visual Node Editor**: Does NOT build a drag-and-drop vector graphics canvas.

---

## 6. Architectural Principles

1. **Pure Function Evaluation**: Simulation operates purely in memory as a derived calculation over live data + hypothetical scenario inputs.
2. **Zero Mutation Guarantee**: Simulation endpoints emit **zero database writes and zero audit events**.
3. **Precedence Invariance**: Reuses the exact 9-step precedence evaluation rules established in Phase 19/20.
4. **Complete ACL Protection**: Validates user project read permissions for all target projects in scenario inputs. Unauthorized projects are 100% omitted; unauthorized inputs throw HTTP 403 `FORBIDDEN`.
5. **Single Source of Truth**: Simulation results are explicitly flagged as `isSimulated: true` and `DECISION_SUPPORT_ONLY`. They do NOT mutate authoritative gate results.

---

## 7. Reuse of Existing Phase 15–20 Infrastructure

To prevent code duplication, Phase 21 directly composes existing services:
- **Phase 14 ACL**: [`checkUserProjectReadAccess`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.service.ts)
- **Phase 10 Gate**: [`evaluateReleaseGateInternal`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/release-gate-evaluator.service.ts)
- **Phase 18 Alignment**: [`calculateSystemBaselineAlignment`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-baseline-alignment.service.ts)
- **Phase 20 Waiver Matching**: [`matchWaiverForDependency`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts)
- **Phase 19 Gate Engine**: Extract pure gate evaluation function `evaluateSystemGateFromState` from `system-topology-governance-gate.service.ts` so both live evaluation and simulation execute the exact same 9-step precedence logic.

---

## 8. Supported Simulation Scenarios

Phase 21 supports 4 core simulation scenario dimensions:

1. **Proposed Provider Baseline Updates**: Simulate a provider project advancing to active Baseline `v2.0` (resolving or creating version misalignment).
2. **Candidate Policy Waivers**: Simulate granting candidate waivers for specific provider blockers (resolving `CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`, or `PROVIDER_GOVERNANCE_DISABLED`).
3. **Proposed Change Package Attestations**: Simulate fulfilling and attesting a pending change package on a provider project (resolving `PROVIDER_ATTESTATION_MISSING`).
4. **Proposed Project Topology Links**: Simulate adding or removing a `ProjectTopologyLink` (`DEPENDS_ON`) between projects.

---

## 9. Scenario Input Contract

The simulation input schema is defined via Zod in `system-topology-simulation.schema.ts`:

```ts
export interface SimulateSystemGateInput {
  rootProjectId: string;
  proposedBaselines?: Array<{
    providerProjectId: string;
    versionNumber: number;
  }>;
  proposedAttestations?: Array<{
    providerProjectId: string;
    changePackageId?: string;
    attestationVersion: number;
  }>;
  candidateWaivers?: Array<{
    targetProviderProjectId: string;
    targetDocumentId?: string | null;
    contractVersionNumber?: number | null;
    blockerType: SystemBlockerType;
    reason: string;
    expiresInDays?: number;
  }>;
  proposedTopologyLinks?: Array<{
    targetProjectId: string;
    dependencyType: 'DEPENDS_ON' | 'REFERENCES';
    action: 'ADD' | 'REMOVE';
  }>;
}
```

---

## 10. Authoritative Read Stage (Stage A)

When `simulateSystemTopologyGovernanceGate` is invoked:
1. Validates `rootProjectId` format and verifies project existence in MongoDB.
2. Checks user READ access on `rootProjectId` via `checkUserProjectReadAccess`. Throws 403 `FORBIDDEN` if unauthorized.
3. Evaluates ACL access for all target project IDs referenced in `proposedBaselines`, `proposedAttestations`, `candidateWaivers`, and `proposedTopologyLinks`. Throws 403 `FORBIDDEN` if any target project is unauthorized.
4. Executes live `evaluateSystemTopologyGovernanceGate` to capture the **Current Authoritative Gate Result**.
5. Reads live active waivers, topology links, baselines, and attestations from MongoDB.

---

## 11. Hypothetical State Representation (Stage B)

The simulation engine constructs an in-memory scenario context:
- **In-Memory Active Waiver List**: Clones live `activeWaivers` array and appends candidate waivers converted to in-memory `ISystemGovernanceWaiver` objects with `_id: 'sim_waiver_' + index`, `scopeState: 'ACTIVE'`, `isRevoked: false`, and `expiresAt: Date.now() + days * 86400000`.
- **In-Memory Alignment Units**: Clones live `alignmentUnits` array. Updates `providerActiveVersion` for projects matching `proposedBaselines`. Updates `providerAttested: true` and `attestationStale: false` for projects matching `proposedAttestations`.
- **In-Memory Topology Graph**: Overlays `proposedTopologyLinks` (adding or removing edges in memory).

---

## 12. Simulation Evaluation Architecture (Stage C & D)

```text
               SimulateSystemGateInput
                         ↓
   STAGE A: Authoritative Read & ACL Validation (MongoDB)
                         ↓
   STAGE B: In-Memory Scenario Overlay (Waivers, Baselines, Attestations, Links)
                         ↓
   STAGE C: Pure 9-Step Precedence Gate Evaluator (evaluateSystemGateFromState)
                         ↓
   STAGE D: Simulation Result Construction (Delta Comparison vs Current Live Gate)
                         ↓
               SimulateSystemGateOutput
```

The evaluator produces a structured result:
```ts
export interface SimulateSystemGateOutput {
  isSimulated: true;
  evaluatedAt: Date;
  rootProjectId: string;
  baselineGateStatus: SystemReleaseStatus;
  simulatedGateStatus: SystemReleaseStatus;
  statusChanged: boolean;
  passed: boolean;
  deltaSummary: {
    resolvedBlockersCount: number;
    remainingBlockersCount: number;
    newlyIntroducedBlockersCount: number;
    candidateWaiversAppliedCount: number;
  };
  resolvedBlockers: BlockingDependencyDTO[];
  remainingBlockers: BlockingDependencyDTO[];
  newlyIntroducedBlockers: BlockingDependencyDTO[];
  appliedCandidateWaivers: Array<{
    targetProviderProjectId: string;
    blockerType: SystemBlockerType;
    reason: string;
    coverageImpact: string;
  }>;
}
```

---

## 13. Phase 18 Alignment Integration

`calculateSystemBaselineAlignment` in [`system-baseline-alignment.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-baseline-alignment.service.ts) fetches live active baselines. In Phase 21, the in-memory scenario engine overlays proposed baseline versions onto the retrieved alignment units, updating `alignmentState` (`ALIGNED` vs `MISALIGNED`) in memory without persisting new `DocumentationBaseline` records.

---

## 14. Phase 19 Governance Integration

Phase 19 precedence steps are preserved 100%:
- Step 1: Root Project Governance Disabled → `GOVERNANCE_DISABLED`
- Step 2: Root Local Release Gate Blocked → `BLOCKED` (NON-WAIVABLE)
- Step 3: Topology Truncation Exceeded → `INDETERMINATE` (NON-WAIVABLE)
- Step 4: Missing Required Evidence / Indeterminate Units → `INDETERMINATE` (NON-WAIVABLE)
- Step 5: Un-Waived Blockers > 0 → `BLOCKED`
- Step 6: Waived Blockers > 0 & Unwaived Blockers == 0 → `PASSED_WITH_WAIVER`
- Step 7: Clean → `PASSED`

The simulation evaluator reuses these exact rules via `evaluateSystemGateFromState`.

---

## 15. Phase 20 Waiver Integration

Candidate waivers in the simulation payload are evaluated against hypothetical blockers using the exact `matchWaiverForDependency` function from Phase 20 ([`system-topology-governance-gate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts#L26-L63)). Non-waivable blocker types (`ROOT_LOCAL_GATE_BLOCKED`, `ROOT_GOVERNANCE_DISABLED`) remain un-waivable during simulation.

---

## 16. ACL / Security Model

1. **Permission Check at Boundary**: The simulation endpoint requires mandatory JWT authentication and checks `checkUserProjectReadAccess` for the root project and all target projects in the scenario payload.
2. **Unauthorized Project Handling**: If a user attempts to simulate changes involving a project they cannot read, the API immediately throws HTTP 403 `FORBIDDEN`.
3. **Zero Information Leakage**: No unauthorized project IDs, names, document titles, or failure counts are returned in error messages or simulation outputs.

---

## 17. Stale / Truncated / Indeterminate Semantics

- **Simulation Truncation**: If the topology graph exceeds `MAX_NODES = 50` or `MAX_DEPTH = 3`, `isTruncated` remains `true` and the simulated status is `INDETERMINATE`.
- **Indeterminate State**: If required baseline evidence is missing, the simulation status evaluates to `INDETERMINATE`.
- **Stale Semantics**: Simulations are request-scoped and derived dynamically at HTTP invocation time. They are not stored in MongoDB, so they do not require background staleness monitoring or polling.

---

## 18. Persistence Decision

**ZERO NEW PERSISTENCE**.
- No new MongoDB models.
- No new persistent schemas.
- No new database indexes.
- No database migrations.

Simulations run purely in memory during the HTTP request and return JSON results to the client.

---

## 19. API Design

### Route Definition
`POST /api/v1/projects/:projectId/system-topology-gate/simulate`

- **Auth**: `authenticateToken`
- **Validation**: `validateRequest(simulateSystemGateSchema)`
- **Controller**: `simulateSystemGateController`
- **Response**: `ApiResponse.success(res, simulationOutput, 200, 'System topology gate simulation completed successfully')`
- **Error Codes**:
  - `400 VALIDATION_ERROR`: Malformed payload or invalid blocker type.
  - `401 UNAUTHORIZED`: Unauthenticated request.
  - `403 FORBIDDEN`: Insufficient read permissions for root or target project.
  - `404 NOT_FOUND`: Root project or target document not found.

---

## 20. Frontend Design

Integrated into `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx`:
- **New UI Tab / Card**: "What-If Simulation Sandbox" (`SystemTopologySimulationSandbox.tsx`).
- **Interactive Controls**:
  - Add candidate waiver toggle (select target provider project, blocker type, document, reason).
  - Select proposed provider baseline version (e.g. simulate Provider A upgrading to `v2`).
  - Toggle proposed change package attestation.
- **Simulation Result Header**:
  - Displays **Current Live Gate Status** vs **Simulated Gate Status** with transition badge (e.g., `BLOCKED` → `PASSED_WITH_WAIVER`).
- **Blocker Delta Breakdown**:
  - Resolved Blockers (green pill).
  - Remaining Blockers (red pill).
  - Newly Introduced Blockers (amber pill).
  - Candidate Waivers Applied summary.

---

## 21. Audit / Traceability

- **No Audit Event Writes**: Simulations do NOT write `GOVERNANCE_SYSTEM_WAIVER_GRANTED` or any other events to `DocumentAudit`.
- **Reason**: Simulations are non-authoritative decision support tools. Writing audit events for un-committed hypothetical scenarios would corrupt audit trails.

---

## 22. Performance / Query Strategy

- **Batch Retrieval**: Reuses Phase 19/20 batch retrieval patterns (`SystemGovernanceWaiver.find({ ... }).lean()`, `ProjectTopologyLink.find({ ... }).lean()`).
- **Target Performance**: Execution completes synchronously within `<50ms` for topologies up to 50 nodes.
- **N+1 Protection**: Zero N+1 query patterns.

---

## 23. Error Handling

Standardized via `AppError`:
- Invalid project ID format → `404 PROJECT_NOT_FOUND`
- Non-existent target document → `404 DOCUMENT_NOT_FOUND`
- Unauthorized target project → `403 FORBIDDEN`
- Malformed blocker type → `400 VALIDATION_ERROR`

---

## 24. Test Strategy

### Unit & Integration Tests (`system-topology-simulation.test.ts`)
1. **Happy Path**: Simulate candidate waiver resolving provider attestation missing blocker (`BLOCKED` → `PASSED_WITH_WAIVER`).
2. **Baseline Advancement**: Simulate provider baseline upgrade to `v2` resolving contract misalignment.
3. **Attestation Fulfillment**: Simulate change package attestation resolving missing attestation blocker.
4. **New Blocker Introduction**: Simulate adding topology link to un-attested provider project (introduces new blocker).
5. **Non-Waivable Guard**: Simulate candidate waiver for root local gate blocked (rejected, status remains `BLOCKED`).
6. **Expired Candidate Waiver**: Simulate candidate waiver with `expiresInDays: 0` (ignored during evaluation).
7. **Unauthorized Target Project**: Simulate scenario referencing unauthorized project ID (throws 403 `FORBIDDEN`).
8. **Zero Mutation Assertion**: Verify 0 database documents created/updated during simulation.
9. **Zero Audit Assertion**: Verify 0 `DocumentAudit` records created during simulation.

### E2E QA Runner (`run_phase21_qa.ts`)
- Target: **25 Scenarios** covering all Phase 21 simulation types and multi-phase regressions.

---

## 25. Regression Strategy

Execute full regression suite across all existing phases:
- Phase 10 QA (`run_phase10_qa.ts`)
- Phase 14 QA (`run_phase14_qa.ts`)
- Phase 15 QA (`run_phase15_qa.ts`)
- Phase 16 QA (`run_phase16_qa.ts`)
- Phase 17 QA (`run_phase17_qa.ts`)
- Phase 18 QA (`run_phase18_qa.ts`)
- Phase 19 QA (`run_phase19_qa.ts`)
- Phase 20 QA (`run_phase20_qa.ts`)
- Full Vitest suite (`pnpm test`)
- API Typecheck (`pnpm --filter api typecheck`)
- ESLint (`pnpm lint`)
- Web Build (`pnpm --filter web build`)

---

## 26. File-by-File Implementation Plan

### Backend Files

1. `apps/api/src/modules/governance/system-topology-simulation.types.ts` [NEW]
   - Defines `SimulateSystemGateInput`, `SimulateSystemGateOutput`, `CandidateWaiverInput`, `ProposedBaselineInput`, etc.

2. `apps/api/src/modules/governance/system-topology-simulation.schema.ts` [NEW]
   - Zod validation schemas for `simulateSystemGateSchema`.

3. `apps/api/src/modules/governance/system-topology-simulation.service.ts` [NEW]
   - Core `simulateSystemTopologyGovernanceGate` function. Stage A (read & ACL), Stage B (in-memory overlay), Stage C (evaluator), Stage D (delta summary output).

4. `apps/api/src/modules/governance/system-topology-simulation.controller.ts` [NEW]
   - Controller wrapper `simulateSystemGateController`.

5. `apps/api/src/modules/governance/system-topology-simulation.routes.ts` [NEW]
   - Express router defining `POST /projects/:projectId/system-topology-gate/simulate`.

6. `apps/api/src/modules/governance/system-topology-simulation.test.ts` [NEW]
   - Vitest unit test suite (9 core test suites).

7. `apps/api/src/modules/governance/run_phase21_qa.ts` [NEW]
   - Standalone QA matrix runner (25 scenarios).

8. `apps/api/src/modules/governance/system-topology-governance-gate.service.ts` [MODIFY]
   - Refactor/export pure helper `evaluateSystemGateFromState` so both live evaluation and simulation share the exact same 9-step precedence code.

9. `apps/api/src/routes/index.ts` [MODIFY]
   - Mount `systemTopologySimulationRoutes`.

### Frontend Files

10. `apps/web/src/features/governance/system-topology-simulation.types.ts` [NEW]
    - TypeScript interfaces for simulation UI.

11. `apps/web/src/features/governance/system-topology-simulation.api.ts` [NEW]
    - Axios API call `simulateSystemTopologyGate`.

12. `apps/web/src/features/governance/components/SystemTopologySimulationSandbox.tsx` [NEW]
    - React interactive simulation sandbox component with candidate waiver builder and delta visualization.

13. `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx` [MODIFY]
    - Embed `SystemTopologySimulationSandbox` tab.

### Documentation Files

14. `docs/PRODUCT-ROADMAP.md` [MODIFY]
    - Update Phase 21 status to Implementation Plan Approved / In Progress.

---

## 27. Data Model / Index Changes

- **New MongoDB Models**: NONE (0)
- **Modified MongoDB Models**: NONE (0)
- **Index Changes**: NONE (0)

---

## 28. Migration Requirements

- **Database Migrations**: NONE (0)

---

## 29. Rollout / Compatibility Considerations

- **100% Backward Compatible**: Does not alter existing endpoints, models, or DB schemas.
- **Phase 19/20 Compatibility**: Real system release gate checks remain completely unchanged.

---

## 30. Explicit Non-Goals

- No persistent simulation records.
- No background queue workers or Redis dependencies.
- No software deployment execution or CI/CD runner triggers.
- No mandatory AI / LLM / Vector database integration.
- No Jira-style task board creation.

---

## 31. Risks

- **Risk**: User attempts to simulate changes against an unauthorized project.
- **Mitigation**: Backend validates ACL access for root and all target projects in scenario payload up front, throwing HTTP 403 `FORBIDDEN`.

---

## 32. Open Questions

- **Question**: Should simulation output include a unique `simulationId`?
- **Decision**: Yes. Generated dynamically per HTTP request using `crypto.randomUUID()` (request-scoped, non-persistent) for correlation in UI logs.

---

## 33. Acceptance Criteria

1. **Zero Database Mutations**: Executing simulations creates 0 database documents.
2. **Zero Audit Event Writes**: Executing simulations creates 0 `DocumentAudit` events.
3. **Precedence Preservation**: Simulation evaluation matches Phase 19/20 9-step precedence results 100%.
4. **ACL Safety**: Unauthorized project inputs throw HTTP 403 `FORBIDDEN`.
5. **Phase 21 QA Suite**: All 25 scenarios pass in `run_phase21_qa.ts`.
6. **Full Test Suite**: Vitest suite passes cleanly.
7. **Typecheck & Lint**: API typecheck and ESLint pass with 0 errors.
8. **Web Build**: Production build completes cleanly.
9. **Git Safety**: `git diff --check` passes cleanly.

---

## 34. Implementation Sequence

1. Create shared TypeScript interfaces (`system-topology-simulation.types.ts`).
2. Create Zod validation schema (`system-topology-simulation.schema.ts`).
3. Refactor pure precedence evaluator `evaluateSystemGateFromState` in `system-topology-governance-gate.service.ts`.
4. Create simulation service (`system-topology-simulation.service.ts`).
5. Create controller and Express route (`system-topology-simulation.controller.ts`, `system-topology-simulation.routes.ts`, `routes/index.ts`).
6. Create backend unit tests (`system-topology-simulation.test.ts`).
7. Create Phase 21 QA matrix runner (`run_phase21_qa.ts`).
8. Create frontend API and types (`system-topology-simulation.api.ts`, `system-topology-simulation.types.ts`).
9. Create frontend simulation sandbox UI (`SystemTopologySimulationSandbox.tsx`).
10. Integrate simulation sandbox into `SystemGovernanceGateSection.tsx`.
11. Run full verification suite (Vitest, Typecheck, Lint, Build, QA runners).

---
