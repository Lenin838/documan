# Phase 19 Implementation Plan v1 — Cross-Project System Topology Governance Gate

## 1. Executive Summary

This document specifies the technical implementation plan for **Phase 19: Cross-Project System Topology Governance Gate** in Documan.

Phase 19 provides a derived, query-time, read-only system governance evaluation engine (`system-topology-governance-gate.service.ts`) that synthesizes single-project documentation health (Phase 10), project architecture topology links (Phase 14), immutable fulfillment attestations (Phase 17), and cross-project baseline contract alignment (Phase 18) into an aggregate, topology-aware system release gate decision.

Phase 19 introduces **ZERO new database models**, **ZERO new collections**, **ZERO background queue workers**, and **ZERO database writes**. It operates strictly as a read-only query service above existing Phase 10–18 primitives.

---

## 2. Repository-Grounded Current Architecture

The active codebase on `main` (`0b03dec`) provides the following verified operational primitives:

- **Phase 10 (`release-gate-evaluator.service.ts`)**: Evaluates local document status, review age, pending reviews, orphaned/deprecated API links, active verification plans, and local baseline drift for a single `projectId`. Authentication via `authenticateGateToken` inspecting SHA-256 token hashes stored in `project.gateTokens`.
- **Phase 14 (`project-topology.service.ts`)**: Manages directed cross-project links (`ProjectTopologyLink`) and provides ACL-safe topology graph traversal using `checkUserProjectReadAccess`.
- **Phase 17 (`change-package-attestation.service.ts`)**: Manages immutable fulfillment attestations (`PackageFulfillmentAttestation`), matching version/checksum tuples and detecting head version drift (`attestationStale`).
- **Phase 18 (`system-baseline-alignment.service.ts`)**: Calculates query-time cross-project contract baseline alignment across `DEPENDS_ON` relationships, returning unit states (`ALIGNED`, `MISALIGNED`, `INDETERMINATE`), aggregate state, score, and evidence completeness.

---

## 3. Existing Primitives Reused

Phase 19 achieves 100% architectural leverage by composing existing Phase 10–18 code without duplication:

| Subsystem | Existing Source File | Reused Function / Method | Purpose in Phase 19 |
|---|---|---|---|
| **Phase 10** | `apps/api/src/modules/governance/release-gate-evaluator.service.ts` | `evaluateReleaseGateInternal` | Evaluates local document freshness and drift for root and provider projects |
| **Phase 10** | `apps/api/src/middleware/gate-auth.middleware.ts` | `authenticateGateToken` | Authenticates CI/CD HTTP gate requests using existing `project.gateTokens` |
| **Phase 14** | `apps/api/src/modules/projects/project-topology.service.ts` | `checkUserProjectReadAccess` | Enforces ACL permissions for all project nodes in topology graph |
| **Phase 14** | `apps/api/src/modules/projects/project-topology.model.ts` | `ProjectTopologyLink` | Defines directed cross-project dependency topology |
| **Phase 17** | `apps/api/src/modules/change-packages/change-package-attestation.model.ts` | `PackageFulfillmentAttestation` | Supplies immutable attestation provenance and stale state |
| **Phase 18** | `apps/api/src/modules/governance/system-baseline-alignment.service.ts` | `calculateSystemBaselineAlignment` | Calculates cross-project contract reference alignment units and aggregate state |

---

## 4. Phase 19 Functional Boundary

Phase 19 operates strictly as a **derived governance gate layer**:

```
[Phase 10: Local Gate Evaluator] + [Phase 14: Topology Graph] + [Phase 17: Attestation Provenance] + [Phase 18: Baseline Alignment]
                                                      ↓
                         [Phase 19: Cross-Project System Topology Governance Gate]
                                                      ↓
                                      [SystemGovernanceGateResult]
```

### In-Scope Boundaries:
- Read-only system release gate evaluation engine.
- Categorical aggregate states: `PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`.
- Legacy boolean `passed` helper flag.
- Root project local gate evaluation + Provider project local gate evaluations + Cross-project contract baseline alignment.
- ACL-safe topology subgraph traversal up to `MAX_DEPTH = 3`, `MAX_NODES = 50`.
- Web frontend section (`SystemGovernanceGateSection.tsx`) integrated into `ProjectDetailsPage.tsx`.

### Non-Scope Boundaries:
- Software deployment execution, release pipelines, Docker builds, or cloud infrastructure orchestration.
- CI/CD build runner execution, pipeline scheduling, or deployment trigger execution.
- Infrastructure access credentials, deployment secrets, or cloud authorization tokens.
- Git / VCS repository automation, commit hooks, or branch creation.
- API AST schema parsing or live network execution.
- New database models, persistent collections, queue workers, or signed payload tokens.

---

## 5. Exact System Governance Decision Model

The System Governance Gate outputs a structured `SystemGovernanceGateResult` containing:

```typescript
export type SystemReleaseStatus = 'PASSED' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';

export interface SystemGovernanceGateResult {
  passed: boolean; // Legacy helper: (systemReleaseStatus === 'PASSED' || systemReleaseStatus === 'GOVERNANCE_DISABLED')
  systemReleaseStatus: SystemReleaseStatus;
  rootProjectId: string;
  evaluatedAt: Date;
  summary: {
    totalDependencies: number;
    alignedDependencies: number;
    misalignedDependencies: number;
    indeterminateDependencies: number;
    blockedProviders: number;
  };
  evidence: {
    rootLocalGate: {
      status: 'PASSED' | 'BLOCKED' | 'GOVERNANCE_DISABLED';
      freshnessPercentage: number;
    };
    baselineAlignment: {
      aggregateState: string;
      alignmentScore: number | null;
      evidenceCompleteness: number | null;
    };
    blockingDependencies: Array<{
      providerProjectId: string;
      providerProjectName: string;
      consumerDocumentTitle: string;
      providerDocumentTitle: string;
      reason: string;
      governanceEvidence: {
        providerBaselinePresent: boolean;
        consumerBaselinePresent: boolean;
        providerAttested: boolean;
        attestationStale: boolean;
        providerGovernanceEnabled: boolean;
        providerLocalGateStatus: string;
      };
    }>;
  };
}
```

### Semantics of `passed: boolean`:
- `passed: boolean` is retained strictly as a legacy convenience helper matching Phase 10 API response patterns:
  $$\text{passed} = (\text{systemReleaseStatus} \equiv \text{'PASSED'} \lor \text{systemReleaseStatus} \equiv \text{'GOVERNANCE_DISABLED'})$$
- **CRITICAL**: The primary evaluation authority for all CI/CD integrations and UI logic MUST be the categorical `systemReleaseStatus` field. `passed: true` when `systemReleaseStatus: 'GOVERNANCE_DISABLED'` represents an explicit **governance bypass**, NOT a governance approval.

---

## 6. Root-Project Governance Behavior

When evaluating a root project (`rootProjectId`):

1. Inspect `rootProject.governanceSettings.isGovernanceEnabled`.
2. If `isGovernanceEnabled === false`:
   - System Gate immediately returns `systemReleaseStatus: 'GOVERNANCE_DISABLED'` and `passed: true`.
   - Evaluation halts early (zero provider traversals executed).
3. If `isGovernanceEnabled === true`:
   - System Gate evaluates local Phase 10 gate (`evaluateReleaseGateInternal(rootProjectId)`).
   - If local gate returns `BLOCKED`, the root local gate failure is recorded and contributes to aggregate `BLOCKED` system status.

---

## 7. Upstream-Provider Governance Behavior

When evaluating an upstream provider project (`providerProjectId`) in the authorized topology graph:

1. Inspect `providerProject.governanceSettings.isGovernanceEnabled`.
2. If provider governance is disabled (`isGovernanceEnabled === false`):
   - Local Phase 10 evaluation of provider returns `GOVERNANCE_DISABLED` (non-blocking).
   - Evidence records `providerGovernanceEnabled: false`.
   - **Structural Alignment Check**: Phase 18 structural contract baseline alignment is still evaluated against the provider's active baseline. If the consumer's snapshot reference is `ALIGNED` and attested, the system gate remains `PASSED`. If misaligned or unattested, the system gate becomes `BLOCKED`.
3. If provider governance is enabled (`isGovernanceEnabled === true`):
   - Local Phase 10 evaluation of provider is executed. If `BLOCKED`, system gate becomes `BLOCKED`.

---

## 8. BLOCKED vs INDETERMINATE Decision Matrices

### TABLE A: Root Governance State × Upstream Provider Governance State Matrix

| Root Governance | Provider Governance | Provider Alignment | Provider Attestation | Provider Local Gate | Aggregate System Result | System Rationale |
|---|---|---|---|---|---|---|
| **Enabled** | **Enabled** | `ALIGNED` | `attested` | `PASSED` | **`PASSED`** | Root and provider fully healthy, contract aligned and attested |
| **Enabled** | **Enabled** | `MISALIGNED` | `attested` | `PASSED` | **`BLOCKED`** | Contract reference mismatch between consumer snapshot and provider baseline |
| **Enabled** | **Enabled** | `ALIGNED` | `unattested` | `PASSED` | **`BLOCKED`** | Provider active baseline lacks required Phase 17 fulfillment attestation |
| **Enabled** | **Enabled** | `ALIGNED` | `attested` | `BLOCKED` | **`BLOCKED`** | Upstream provider project has failing local document freshness/drift |
| **Enabled** | **Disabled** | `ALIGNED` | `attested` | `GOVERNANCE_DISABLED` | **`PASSED`** | Contract reference intact; evidence records `providerGovernanceEnabled: false` |
| **Enabled** | **Disabled** | `MISALIGNED` | `attested` | `GOVERNANCE_DISABLED` | **`BLOCKED`** | Structural contract misalignment blocks consumer despite provider disabled status |
| **Disabled** | **Enabled** | Any | Any | Any | **`GOVERNANCE_DISABLED`** | Root consumer project governance explicitly disabled by project owner |
| **Disabled** | **Disabled** | Any | Any | Any | **`GOVERNANCE_DISABLED`** | Root consumer project governance explicitly disabled by project owner |

---

### TABLE B: Provider Alignment × Attestation × Local Gate Decision Matrix

| Provider Alignment (P18) | Provider Attestation (P17) | Provider Local Gate (P10) | Evidence Category | System Gate Consequence |
|---|---|---|---|---|
| `ALIGNED` | `attested` (`attestationStale: false`) | `PASSED` | Verified Contract & Local Health | **Non-blocking (`PASSED`)** |
| `ALIGNED` | `attested` (`attestationStale: true`) | `PASSED` | Attested Snapshot Stale vs Head | **`BLOCKED`** (Provider head drifted since attestation) |
| `ALIGNED` | `unattested` (`providerAttested: false`) | `PASSED` | Unattested Baseline Reference | **`BLOCKED`** (Missing required governance attestation) |
| `MISALIGNED` | Any | Any | Version Reference Mismatch | **`BLOCKED`** (Outdated contract snapshot reference) |
| `INDETERMINATE` | Any | Any | Missing Baseline Evidence | **`INDETERMINATE`** (Insufficient evidence for evaluation) |
| Any | Any | `BLOCKED` | Upstream Document Drift/Staleness | **`BLOCKED`** (Provider local documentation unhealthy) |
| Any | Any | `GOVERNANCE_DISABLED` | Provider Governance Disabled | **Non-blocking if `ALIGNED` & `attested`**, logged in evidence |

---

### TABLE C: Evidence Condition → System Gate Consequence Matrix

| Evidence Condition | Source Subsystem | Category | System Gate Consequence | Reason |
|---|---|---|---|---|
| Root local gate blocked | Phase 10 | Local Health | **`BLOCKED`** | Root project documents are stale, unreviewed, or drifting |
| Provider baseline snapshot reference mismatch | Phase 18 | Alignment | **`BLOCKED`** | Consumer reference differs from active provider baseline |
| Provider active baseline unattested | Phase 17 | Provenance | **`BLOCKED`** | Provider baseline lacks immutable fulfillment attestation |
| Provider attestation stale | Phase 17 | Provenance | **`BLOCKED`** | Provider document head version drifted beyond attested version |
| Provider local gate blocked | Phase 10 | Provider Health | **`BLOCKED`** | Upstream provider documentation is unreviewed or stale |
| Consumer active baseline missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | Missing consumer baseline prevents alignment check |
| Provider active baseline missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | Missing provider baseline prevents contract evaluation |
| Consumer baseline snapshot reference missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | Snapshot reference missing for `DEPENDS_ON` document |
| Root project governance disabled | Phase 10 | Root Setting | **`GOVERNANCE_DISABLED`** | Root project owner explicitly bypassed document governance |

---

### TABLE D: Topology & Authorization Condition → Visibility & Evaluation Matrix

| Topology / Authorization Condition | Graph Subgraph Impact | Metrics & Denominator Impact | System Gate Consequence | Privacy / Security Rule |
|---|---|---|---|---|
| Direct single provider (Authorized) | Evaluated | Included in total/aligned counts | Evaluated normally | Visible in details list |
| Multiple providers (Authorized) | Evaluated | All included in counts | `PASSED` iff all providers pass | Visible in details list |
| Nested topology (Depth 2-3, Authorized) | Recursively evaluated | Included in counts | `PASSED` iff all nested nodes pass | Visible in details list |
| Inaccessible provider (ACL Restricted) | **100% Omitted** | **Excluded from counts** | **`BLOCKED` or `INDETERMINATE`** safely | Zero IDs, zero names, zero count leakage |
| Disconnected project | Excluded | Excluded | Not evaluated | Ignored |
| Topology link type `INTEGRATES_WITH` | Excluded | Excluded | Non-blocking | Informational only |
| Topology link type `PROVIDES_API_TO` | Excluded | Excluded | Non-blocking | Informational only |
| `DEPENDS_ON` doc link without active topology link | Evaluated | Included in counts | **`INDETERMINATE`** | Invalid topology state blocks release |

---

## 9. Cross-Project Topology Traversal

- **Starting Point**: `rootProjectId`.
- **Allowed Link Types**: `ProjectTopologyLink.type === 'DEPENDS_ON'`. Informational types (`INTEGRATES_WITH`, `PROVIDES_API_TO`) are excluded from contract release blocking.
- **Limits**: `MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_DEPENDENCY_UNITS = 100`.
- **Cycle Handling**: `Set<string>` tracking visited project IDs to prevent infinite loops.
- **ACL Enforcement**: Reuses `checkUserProjectReadAccess(userId, role, projectId)`. Unauthorized projects and topology edges are **100% omitted** before response assembly.

---

## 10. Alignment Integration

Phase 19 invokes Phase 18 `calculateSystemBaselineAlignment(userId, role, rootProjectId)` directly:
- Extracts `alignmentUnits`, `aggregateState`, `alignmentScore`, and `evidenceCompleteness`.
- Reuses unit states (`ALIGNED`, `MISALIGNED`, `INDETERMINATE`).
- Avoids reimplementing snapshot version comparison logic.

---

## 11. Attestation Integration

Phase 19 consumes attestation evidence populated by Phase 18:
- Provenance tuple: `(documentId, documentVersionId, checksum)`.
- Reuses Phase 17 `PackageFulfillmentAttestation` highest version lookup.
- If `providerAttested === false` $\implies$ `BLOCKED`.
- If `attestationStale === true` $\implies$ `BLOCKED`.

---

## 12. Phase 10 Local Gate Integration & API Auth Reuse

- Evaluates `evaluateReleaseGateInternal(projectId)` for root and provider projects.
- **API Authentication Reuse**: CI/CD requests to the Phase 19 gate check endpoint use existing Phase 10 `authenticateGateToken` middleware inspecting `project.gateTokens`. Zero new credential models created.

---

## 13. API Design

Following Documan route conventions (`routes/index.ts`):

- **Route Prefix**: `/api/v1/projects/:projectId/system-governance-gate`
- **Endpoints**:
  1. `GET /api/v1/projects/:projectId/system-governance-gate`
     - Auth: `authenticate` (User JWT session)
     - Purpose: Frontend web UI data retrieval.
     - Response: 200 OK with `SystemGovernanceGateResult`.
  2. `POST /api/v1/projects/:projectId/system-governance-gate/gate-check`
     - Auth: `authenticateGateToken` (CI/CD Gate Token credential) or `authenticate`
     - Purpose: Programmatic CI/CD system release gate evaluation.
     - Response: 200 OK (if `systemReleaseStatus === 'PASSED'` or `'GOVERNANCE_DISABLED'`) or 412 Precondition Failed (if `BLOCKED` or `INDETERMINATE`).

---

## 14. Backend Implementation Plan

### Files to Create:
1. `apps/api/src/modules/governance/system-topology-governance-gate.types.ts`: TypeScript interfaces and types.
2. `apps/api/src/modules/governance/system-topology-governance-gate.service.ts`: Core query-time system gate calculation engine.
3. `apps/api/src/modules/governance/system-topology-governance-gate.controller.ts`: Express controllers.
4. `apps/api/src/modules/governance/system-topology-governance-gate.routes.ts`: Express router setup.
5. `apps/api/src/modules/governance/system-topology-governance-gate.test.ts`: Vitest unit tests.
6. `apps/api/src/modules/governance/run_phase19_qa.ts`: 38+ scenario QA matrix runner.

### Files to Modify:
1. `apps/api/src/routes/index.ts`: Mount `systemTopologyGovernanceGateRouter` at `/api/v1/projects/:projectId/system-governance-gate`.

---

## 15. Frontend Implementation Plan

### Files to Create:
1. `apps/web/src/features/governance/system-topology-governance-gate.types.ts`: Web TypeScript interfaces.
2. `apps/web/src/features/governance/system-topology-governance-gate.api.ts`: API client helpers (`getSystemGovernanceGate`, `checkSystemReleaseGate`).
3. `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx`: Read-only governance section UI.

### Files to Modify:
1. `apps/web/src/pages/ProjectDetailsPage.tsx`: Render `SystemGovernanceGateSection` under the Governance tab.

---

## 16. Persistence and Workers Confirmation

- **Mongoose Models**: 0 new models.
- **MongoDB Collections**: 0 new collections.
- **Queue Workers**: 0 background workers.
- **Database Writes**: 0 writes on gate evaluation.

---

## 17. Performance Plan

- **Empirical Complexity**: $O(V_{\text{auth}} + E_{\text{auth}} + U_{\text{units}})$ where $V_{\text{auth}} \le 50$, $E_{\text{auth}} \le 100$, $U_{\text{units}} \le 100$.
- **Query Strategy**: Reuses Phase 18 bulk loading pipeline (single query for topology links, bulk queries for baselines/attestations).
- **Performance Target**: **PERFORMANCE TARGET TO BE VALIDATED** during automated Phase 19 benchmark testing (target response time < 100ms for standard project topology graphs).

---

## 18. Error and Edge-Case Handling

- Missing root project: 404 `PROJECT_NOT_FOUND`.
- Unauthorized root access: 403 `FORBIDDEN`.
- Unauthorized provider in topology: Completely omitted from details and metrics.
- Missing consumer/provider baseline: Aggregate status evaluates to `INDETERMINATE`.
- Missing attestation: Provider unit state evaluates to `BLOCKED`.
- Topology cycles: Safely handled by `visitedProjectIds` set.

---

## 19. Security / ACL Model

- Enforces `checkUserProjectReadAccess(userId, role, projectId)` for all graph nodes.
- Zero information leakage: Inaccessible projects omit IDs, names, failure counts, and relationship metrics completely.

---

## 20. Test Plan

38+ automated QA matrix scenarios covering:
- Root governance disabled (`GOVERNANCE_DISABLED`).
- Root local gate blocked (`BLOCKED`).
- Provider local gate blocked (`BLOCKED`).
- Provider governance disabled (evidence recorded, structural check evaluated).
- Provider contract reference misaligned (`BLOCKED`).
- Provider contract baseline unattested (`BLOCKED`).
- Provider attestation stale (`BLOCKED`).
- Missing required baseline/snapshot evidence (`INDETERMINATE`).
- Inaccessible provider project (ACL omitted completely).
- Topology graph depth/node limits.
- FullVitest suite + 100% typecheck + zero ESLint errors.

---

## 21. Manual QA Plan

Browser verification of:
1. `ProjectDetailsPage.tsx` rendering `SystemGovernanceGateSection`.
2. Aggregate badge display (`PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`).
3. Summary metrics and blocking dependency details list.
4. Authorization behavior for unauthorized users.

---

## 22. Verification Checklist

1. `pnpm --filter @documan/api typecheck` (0 errors).
2. `pnpm --filter web typecheck` (0 errors).
3. `pnpm run lint` (0 ESLint errors).
4. `pnpm run test` (85+ test files, 100% pass).
5. Phase 19 QA runner (`run_phase19_qa.ts`: 38/38 pass).
6. Phase 18, 17, 14 regression runners (100% pass).
7. `pnpm run build` (successful production build).
8. `git diff --check` (clean).

---

## 23. Non-Goals

- NO deployment execution or CI/CD runner scheduling.
- NO cloud infrastructure secret management.
- NO Git / VCS commit automation.
- NO AST schema parsing or network execution.
- NO new database collections or persistent models.
- NO canvas diagram editing.
- NO Phase 20 work.

---

## 24. Implementation Sequencing

1. Backend Types (`system-topology-governance-gate.types.ts`)
2. Backend Calculation Engine (`system-topology-governance-gate.service.ts`)
3. Controller & Routes (`system-topology-governance-gate.controller.ts`, `routes.ts`, `routes/index.ts`)
4. Backend Vitest Tests (`system-topology-governance-gate.test.ts`)
5. Backend QA Matrix Runner (`run_phase19_qa.ts`)
6. Frontend Types & API (`system-topology-governance-gate.types.ts`, `system-topology-governance-gate.api.ts`)
7. Frontend Component & Page Integration (`SystemGovernanceGateSection.tsx`, `ProjectDetailsPage.tsx`)
8. Full Automated Verification & Manual QA

---

## 25. Explicit Implementation Stop Conditions

Implementation MUST NOT begin until this plan has been reviewed and explicitly approved by the user.

No application code modifications, feature branch creation, or commits may occur during planning.
