# Phase 19 Implementation Plan v2 — Cross-Project System Topology Governance Gate

## 1. Executive Summary

This document specifies the revised, implementation-ready technical plan for **Phase 19: Cross-Project System Topology Governance Gate** in Documan.

Phase 19 provides a derived, query-time, read-only system governance evaluation engine (`system-topology-governance-gate.service.ts`) that synthesizes single-project documentation health (Phase 10), project architecture topology links (Phase 14), immutable fulfillment attestations (Phase 17), and cross-project baseline contract alignment (Phase 18) into an aggregate, topology-aware system release gate decision.

Phase 19 introduces **ZERO new database models**, **ZERO new collections**, **ZERO background queue workers**, and **ZERO database writes**. It operates strictly as a read-only query service above existing Phase 10–18 primitives.

---

## 2. Revision Summary From v1

This v2 revision addresses all mandatory planning corrections identified in the review:

1. **Fixed `passed: boolean` Semantics**: Eliminated the unsafe `GOVERNANCE_DISABLED + passed: true` combination. Established `passed: boolean` strictly as $\text{passed} = (\text{systemReleaseStatus} \equiv \text{'PASSED'})$. When governance is disabled, `passed: false` and `systemReleaseStatus: 'GOVERNANCE_DISABLED'`.
2. **Precise Gate-Check Authentication Model**: Explicitly established route-level middleware behavior: UI GET endpoints use User JWT (`authenticate`), while programmatic CI/CD gate-check endpoints reuse existing Phase 10 `authenticateGateToken` middleware inspecting `project.gateTokens`. Zero new credential models or payload tokens created.
3. **Single Deterministic Precedence Algorithm**: Added a 10-step, single-pass decision precedence sequence that resolves all simultaneous topology and evidence conditions without requiring implementers to infer precedence from matrix tables.
4. **Explicit Phase 17 Attestation Semantics**: Defined exact handling for matching version tuples, highest `attestationVersion` selection, stale attestation head drift, and missing attestations (`providerAttested: false` $\implies$ `BLOCKED`).
5. **Safe Topology Truncation Bounds**: Defined safe truncation behavior when `MAX_DEPTH = 3` or `MAX_NODES = 50` is reached: if unvisited `DEPENDS_ON` edges remain beyond the traversal limit, the aggregate system gate returns `INDETERMINATE` (`passed: false`), preventing a partial graph from producing an unjustified `PASSED` result.

---

## 3. Repository-Grounded Current Architecture

The active codebase on `main` (`0b03dec`) provides the following verified operational primitives:

- **Phase 10 (`release-gate-evaluator.service.ts`)**: Evaluates local document status, review age, pending reviews, orphaned/deprecated API links, active verification plans, and local baseline drift for a single `projectId`. Authentication via `authenticateGateToken` in `gate-auth.middleware.ts` inspecting SHA-256 token hashes stored in `project.gateTokens`.
- **Phase 14 (`project-topology.service.ts`)**: Manages directed cross-project links (`ProjectTopologyLink`) and provides ACL-safe topology graph traversal using `checkUserProjectReadAccess`.
- **Phase 17 (`change-package-attestation.service.ts`)**: Manages immutable fulfillment attestations (`PackageFulfillmentAttestation`), matching version/checksum tuples and detecting head version drift (`attestationStale`).
- **Phase 18 (`system-baseline-alignment.service.ts`)**: Calculates query-time cross-project contract baseline alignment across `DEPENDS_ON` relationships, returning unit states (`ALIGNED`, `MISALIGNED`, `INDETERMINATE`), aggregate state, score, and evidence completeness.

---

## 4. Existing Primitives Reused

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

## 5. Phase 19 Functional Boundary

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
- Boolean `passed` helper flag ($\text{passed} = \text{systemReleaseStatus} \equiv \text{'PASSED'}$).
- Root project local gate evaluation + Provider project local gate evaluations + Cross-project contract baseline alignment.
- ACL-safe topology subgraph traversal up to `MAX_DEPTH = 3`, `MAX_NODES = 50`.
- Web frontend section (`SystemGovernanceGateSection.tsx`) integrated into `ProjectDetailsPage.tsx`.

### Non-Scope Boundaries:
- Software deployment execution, release pipelines, Docker builds, or cloud infrastructure orchestration.
- CI/CD build runner execution, pipeline scheduling, or deployment trigger execution.
- Infrastructure access credentials, deployment secrets, or cloud authorization tokens.
- Git / VCS repository automation, commit hooks, or branch creation.
- Semantic API compatibility analysis, AST-level OpenAPI diffing, or live network execution.
- Introduction of new database models, persistent collections, queue workers, or signed payload tokens.

---

## 6. Exact System Governance Decision Model & Fixed `passed` Semantics

The System Governance Gate outputs a structured `SystemGovernanceGateResult`:

```typescript
export type SystemReleaseStatus = 'PASSED' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';

export interface SystemGovernanceGateResult {
  passed: boolean; // Strictly: (systemReleaseStatus === 'PASSED')
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

### Strict Definition of `passed: boolean`:
To prevent any possibility of treating governance bypass (`GOVERNANCE_DISABLED`) as a governance approval:

$$\text{passed} = (\text{systemReleaseStatus} \equiv \text{'PASSED'})$$

| `systemReleaseStatus` | `passed: boolean` | Governance Interpretation |
|---|:---:|---|
| **`PASSED`** | `true` | System governance evaluated and explicitly APPROVED |
| **`BLOCKED`** | `false` | System governance evaluated and REJECTED due to failure |
| **`INDETERMINATE`** | `false` | System governance cannot be evaluated due to missing evidence |
| **`GOVERNANCE_DISABLED`** | `false` | System governance is BYPASSED / DISABLED (Not an approval) |

---

## 7. Single Deterministic Decision Precedence Algorithm

When evaluating a project topology, multiple conditions may exist simultaneously. The System Governance Gate MUST evaluate conditions in the following exact **Priority Precedence Order**:

```
[Start Evaluation]
       │
       ▼
1. Is root project governance disabled? ──(YES)──► Return GOVERNANCE_DISABLED (passed: false)
       │ (NO)
       ▼
2. Is root project local Phase 10 gate BLOCKED? ──(YES)──► Return BLOCKED (passed: false)
       │ (NO)
       ▼
3. Is topology traversal truncated with unvisited DEPENDS_ON edges? ──(YES)──► Return INDETERMINATE (passed: false)
       │ (NO)
       ▼
4. Is any required baseline/snapshot evidence missing (N_indeterminate > 0)? ──(YES)──► Return INDETERMINATE (passed: false)
       │ (NO)
       ▼
5. Is any cross-project contract reference MISALIGNED (N_misaligned > 0)? ──(YES)──► Return BLOCKED (passed: false)
       │ (NO)
       ▼
6. Is any provider active baseline unattested (providerAttested: false)? ──(YES)──► Return BLOCKED (passed: false)
       │ (NO)
       ▼
7. Is any provider attestation stale (attestationStale: true)? ──(YES)──► Return BLOCKED (passed: false)
       │ (NO)
       ▼
8. Is any authorized provider local Phase 10 gate BLOCKED? ──(YES)──► Return BLOCKED (passed: false)
       │ (NO)
       ▼
9. All checks fully satisfied ────────────────────────► Return PASSED (passed: true)
```

---

## 8. Root & Provider Governance Behavior

### Root-Project Governance Behavior:
- If `rootProject.governanceSettings.isGovernanceEnabled === false`:
  - Returns `systemReleaseStatus: 'GOVERNANCE_DISABLED'` and `passed: false`.
  - Topology traversal halts early (zero provider calls).

### Upstream-Provider Governance Behavior:
- If `providerProject.governanceSettings.isGovernanceEnabled === false`:
  - Provider's local Phase 10 gate returns `GOVERNANCE_DISABLED` (non-blocking).
  - Evidence records `providerGovernanceEnabled: false`.
  - **Structural Check**: Structural contract reference alignment (Phase 18) and attestation (Phase 17) are STILL enforced against provider's active baseline. If contract reference is `MISALIGNED` or unattested, system gate becomes `BLOCKED`.

---

## 9. Decision Matrices

### TABLE A: Root Governance State × Upstream Provider Governance State Matrix

| Root Governance | Provider Governance | Provider Alignment | Provider Attestation | Provider Local Gate | Aggregate System Result | `passed` Flag | System Rationale |
|---|---|---|---|---|---|:---:|---|
| **Enabled** | **Enabled** | `ALIGNED` | `attested` | `PASSED` | **`PASSED`** | `true` | Root and provider fully healthy, contract aligned and attested |
| **Enabled** | **Enabled** | `MISALIGNED` | `attested` | `PASSED` | **`BLOCKED`** | `false` | Contract reference mismatch between consumer snapshot and provider baseline |
| **Enabled** | **Enabled** | `ALIGNED` | `unattested` | `PASSED` | **`BLOCKED`** | `false` | Provider active baseline lacks required Phase 17 fulfillment attestation |
| **Enabled** | **Enabled** | `ALIGNED` | `attested` | `BLOCKED` | **`BLOCKED`** | `false` | Upstream provider project has failing local document freshness/drift |
| **Enabled** | **Disabled** | `ALIGNED` | `attested` | `GOVERNANCE_DISABLED` | **`PASSED`** | `true` | Contract reference intact; evidence records `providerGovernanceEnabled: false` |
| **Enabled** | **Disabled** | `MISALIGNED` | `attested` | `GOVERNANCE_DISABLED` | **`BLOCKED`** | `false` | Structural contract misalignment blocks consumer despite provider disabled status |
| **Disabled** | **Enabled** | Any | Any | Any | **`GOVERNANCE_DISABLED`** | `false` | Root consumer project governance explicitly disabled by project owner |
| **Disabled** | **Disabled** | Any | Any | Any | **`GOVERNANCE_DISABLED`** | `false` | Root consumer project governance explicitly disabled by project owner |

---

### TABLE B: Provider Alignment × Attestation × Local Gate Decision Matrix

| Provider Alignment (P18) | Provider Attestation (P17) | Provider Local Gate (P10) | Evidence Category | System Gate Consequence | `passed` Flag |
|---|---|---|---|---|:---:|
| `ALIGNED` | `attested` (`attestationStale: false`) | `PASSED` | Verified Contract & Local Health | **`PASSED`** | `true` |
| `ALIGNED` | `attested` (`attestationStale: true`) | `PASSED` | Attested Snapshot Stale vs Head | **`BLOCKED`** | `false` |
| `ALIGNED` | `unattested` (`providerAttested: false`) | `PASSED` | Unattested Baseline Reference | **`BLOCKED`** | `false` |
| `MISALIGNED` | Any | Any | Version Reference Mismatch | **`BLOCKED`** | `false` |
| `INDETERMINATE` | Any | Any | Missing Baseline Evidence | **`INDETERMINATE`** | `false` |
| Any | Any | `BLOCKED` | Upstream Document Drift/Staleness | **`BLOCKED`** | `false` |
| Any | Any | `GOVERNANCE_DISABLED` | Provider Governance Disabled | **`PASSED` if `ALIGNED` & `attested`** | `true` |

---

### TABLE C: Evidence Condition → System Gate Consequence Matrix

| Evidence Condition | Source Subsystem | Category | System Gate Consequence | `passed` | Reason |
|---|---|---|---|:---:|---|
| Root local gate blocked | Phase 10 | Local Health | **`BLOCKED`** | `false` | Root project documents are stale, unreviewed, or drifting |
| Provider baseline snapshot reference mismatch | Phase 18 | Alignment | **`BLOCKED`** | `false` | Consumer reference differs from active provider baseline |
| Provider active baseline unattested | Phase 17 | Provenance | **`BLOCKED`** | `false` | Provider baseline lacks immutable fulfillment attestation |
| Provider attestation stale | Phase 17 | Provenance | **`BLOCKED`** | `false` | Provider document head version drifted beyond attested version |
| Provider local gate blocked | Phase 10 | Provider Health | **`BLOCKED`** | `false` | Upstream provider documentation is unreviewed or stale |
| Consumer active baseline missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | `false` | Missing consumer baseline prevents alignment check |
| Provider active baseline missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | `false` | Missing provider baseline prevents contract evaluation |
| Consumer baseline snapshot reference missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | `false` | Snapshot reference missing for `DEPENDS_ON` document |
| Topology traversal truncated | Phase 14 / P19 | Traversal Limit | **`INDETERMINATE`** | `false` | Unvisited dependency edges exist beyond depth/node limit |
| Root project governance disabled | Phase 10 | Root Setting | **`GOVERNANCE_DISABLED`** | `false` | Root project owner explicitly bypassed document governance |

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

## 10. Explicit Attestation Semantics

Phase 19 reuses Phase 17 `change-package-attestation.service.ts` matching rules:

- **Matching Tuple**: `(documentId, documentVersionId, checksum)` against `PackageFulfillmentAttestation.verifiedVersionSnapshot`.
- **Highest Version Selection**: When multiple attestations match a baseline snapshot, select the record with the highest `attestationVersion`.
- **Stale Attestation**: `attestationStale === true` when provider document head version > attested `documentVersionId.versionNumber`.
- **Missing Attestation**: `providerAttested === false` when no matching attestation exists for provider's active baseline snapshot.
- **Effect**: Both missing attestation and stale attestation evaluate to **`BLOCKED`** (`passed: false`).

---

## 11. Safe Topology Truncation Bounds

Traversal limits enforced: `MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_DEPENDENCY_UNITS = 100`.

- **Harmless Boundary**: Traversal completes because no further edges exist at `depth <= 3` $\implies$ Graph is 100% complete.
- **Truncated Boundary**: Traversal stops due to `depth > 3` or `nodes >= 50` AND unvisited `DEPENDS_ON` edges remain in the queue $\implies$ System Gate evaluates to **`INDETERMINATE`** (`passed: false`) with reason `TOPOLOGY_TRUNCATION_LIMIT_EXCEEDED`. Prevents partial graphs from producing false `PASSED` decisions.

---

## 12. Precise Gate-Check Authentication Model

Phase 19 reuses existing Phase 10 authentication patterns without introducing new token models or abstractions:

1. **UI GET Endpoint (`GET /api/v1/projects/:projectId/system-governance-gate`)**:
   - Auth middleware: `authenticate` (User JWT session via `Authorization: Bearer <user_jwt>`).
   - Access control: `checkUserProjectReadAccess(userId, role, projectId)`.
2. **Programmatic Gate-Check Endpoint (`POST /api/v1/projects/:projectId/system-governance-gate/gate-check`)**:
   - Auth middleware: Reuses Phase 10 `authenticateGateToken` in `gate-auth.middleware.ts`.
   - Credential: Reuses existing `project.gateTokens` (`x-documan-gate-token: documan_gate_<hex>` or `Authorization: Bearer documan_gate_<hex>`).
   - Authorization: Validates that the gate token belongs to `rootProjectId`, is active, and unexpired.
3. **Token Non-Scope**: Zero new database collections, zero signed JWT payload tokens, zero deployment secrets.

---

## 13. API Design

Routes mounted under `/api/v1/projects/:projectId/system-governance-gate` in `routes/index.ts`:

- **Endpoint 1**: `GET /api/v1/projects/:projectId/system-governance-gate`
  - Handler: `getSystemGovernanceGateHandler`
  - Middleware: `authenticate`
  - Response: 200 OK with `SystemGovernanceGateResult`
- **Endpoint 2**: `POST /api/v1/projects/:projectId/system-governance-gate/gate-check`
  - Handler: `systemGateCheckHandler`
  - Middleware: `gateCheckRateLimiter`, `authenticateGateToken`
  - Response:
    - 200 OK if `systemReleaseStatus === 'PASSED'`
    - 412 Precondition Failed if `systemReleaseStatus` is `BLOCKED`, `INDETERMINATE`, or `GOVERNANCE_DISABLED`

---

## 14. Backend Implementation Plan

### Files to Create:
1. `apps/api/src/modules/governance/system-topology-governance-gate.types.ts`: TypeScript interfaces and types.
2. `apps/api/src/modules/governance/system-topology-governance-gate.service.ts`: Derived query-time system gate calculation engine.
3. `apps/api/src/modules/governance/system-topology-governance-gate.controller.ts`: Express controllers.
4. `apps/api/src/modules/governance/system-topology-governance-gate.routes.ts`: Express router setup.
5. `apps/api/src/modules/governance/system-topology-governance-gate.test.ts`: Vitest unit tests.
6. `apps/api/src/modules/governance/run_phase19_qa.ts`: 38+ scenario QA matrix runner.

### Files to Modify:
1. `apps/api/src/routes/index.ts`: Mount `systemTopologyGovernanceGateRouter`.

---

## 15. Frontend Implementation Plan

### Files to Create:
1. `apps/web/src/features/governance/system-topology-governance-gate.types.ts`: Web TypeScript interfaces.
2. `apps/web/src/features/governance/system-topology-governance-gate.api.ts`: API client helpers (`getSystemGovernanceGate`).
3. `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx`: Read-only governance UI component.

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
- Missing/stale attestation: Evaluates to `BLOCKED`.
- Topology cycles: Safely handled by `visitedProjectIds` set.
- Topology truncation: Evaluates to `INDETERMINATE`.

---

## 19. Security / ACL Model

- Enforces `checkUserProjectReadAccess(userId, role, projectId)` for all graph nodes.
- Zero information leakage: Inaccessible projects omit IDs, names, failure counts, and relationship metrics completely.

---

## 20. Test Plan

38+ automated QA matrix scenarios covering:
- Decision precedence algorithm priority 1 through 9.
- Root governance disabled (`GOVERNANCE_DISABLED`, `passed: false`).
- Root local gate blocked (`BLOCKED`, `passed: false`).
- Provider local gate blocked (`BLOCKED`, `passed: false`).
- Provider governance disabled (evidence recorded, structural check evaluated).
- Provider contract reference misaligned (`BLOCKED`, `passed: false`).
- Provider contract baseline unattested (`BLOCKED`, `passed: false`).
- Provider attestation stale (`BLOCKED`, `passed: false`).
- Missing required baseline/snapshot evidence (`INDETERMINATE`, `passed: false`).
- Topology truncation limit exceeded (`INDETERMINATE`, `passed: false`).
- Inaccessible provider project (ACL omitted completely).
- Full Vitest suite + 100% typecheck + zero ESLint errors.

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
