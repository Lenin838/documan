# Phase 22 Implementation Plan v2

## 1. Executive Summary

Phase 22 introduces the **System Topology Governance State Lineage & Longitudinal Timeline Engine** (`system-governance-lineage.service.ts`). Building upon the system release gate evaluator (Phase 19), policy waiver exception lifecycle (Phase 20), and in-memory pre-release what-if simulation (Phase 21), Phase 22 provides a pure, read-only, request-scoped temporal analysis engine.

Phase 22 solves the **Longitudinal & Causal Governance Intelligence Gap**: it enables Technical Stewards, System Admins, and Project Owners to reconstruct historical point-in-time system governance gate states ($T_{\text{historical}}$), audit past release safety, compare system gate diffs between two timestamps ($T_1$ vs $T_2$), and trace state transitions back to temporal predecessor events without creating a second source of truth, mutating database models, or running background queue workers.

Plan v2 establishes a strict **Evidence-Based Historical Reconstructability Model**: rather than claiming "100% reconstructable," Phase 22 evaluates authoritative repository evidence at $T_{\text{historical}}$. If required historical state is completely reconstructable, the API returns status `COMPLETE`; if any required historical state cannot be proven with 100% certainty (e.g. topology links hard-deleted without audit records), the API returns a bounded `INDETERMINATE_HISTORICAL_EVIDENCE` result.

---

## 2. Research Basis

This plan is grounded in the approved research document [`docs/research/PHASE-22-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-22-RESEARCH.md) and incorporates mandatory Plan v2 corrections. The research confirmed that Documan's existing timestamped artifact collections (`DocumentationBaseline`, `PackageFulfillmentAttestation`, `SystemGovernanceWaiver`, `DocumentAudit`, `ProjectTopologyLink`, `DocumentRelationship`) contain rich temporal evidence for historical state evaluation. Candidate 1 was selected as the sole winner with a score of 54/55.

---

## 3. Repository Evidence

Authoritative repository schemas were directly inspected to establish historical reconstructability:
- `DocumentationBaseline` (`documentation-baseline.model.ts`): Stores `createdAt`, `updatedAt`, `isActive`, `isArchived`, `archivedAt`, `documentSnapshots`, `relationshipSnapshots`.
- `PackageFulfillmentAttestation` (`change-package-attestation.model.ts`): Stores `createdAt`, `changePackageId`, `attestationVersion`, `verifiedVersionSnapshot`, `fulfillmentStatus`.
- `SystemGovernanceWaiver` (`system-governance-waiver.model.ts`): Stores `createdAt`, `expiresAt`, `isRevoked`, `revokedAt`, `scopeState` (`ACTIVE`, `REVOKED`, `SUPERSEDED`), `blockerType`, `activeScopeKey`.
- `DocumentAudit` (`document-audit.model.ts`): Stores `createdAt`, `documentId`, `userId`, `action`, `metadata`.
- `ProjectTopologyLink` (`project-topology.model.ts`): Stores `createdAt`, `updatedAt`, `sourceProjectId`, `targetProjectId`, `type`.
- `DocumentVersion` (`document-version.model.ts`): Stores `createdAt`, `documentId`, `versionNumber`, `checksum`.
- `DocumentRelationship` (`document-relationship.model.ts`): Stores `createdAt`, `updatedAt`, `sourceDocumentId`, `targetDocumentId`, `type`.

---

## 4. Historical Reconstructability Matrix

The 8 authoritative repository sources are classified based on empirical data integrity:

| Authoritative Source | Facts Stored | Timestamps | Lifecycle Preserved? | Classification |
|---|---|---|:---:|:---:|
| **DocumentationBaseline** | Version tags, document & relationship snapshots | `createdAt`, `archivedAt` | YES (active/archived dates) | `EXACTLY_RECONSTRUCTABLE` |
| **PackageFulfillmentAttestation** | Immutable verification snapshots, fingerprints | `createdAt` (fulfillment) | YES (immutable snapshots) | `EXACTLY_RECONSTRUCTABLE` |
| **SystemGovernanceWaiver** | Scope keys, blocker types, version bindings | `createdAt`, `expiresAt`, `revokedAt` | YES (ACTIVE, REVOKED, SUPERSEDED) | `EXACTLY_RECONSTRUCTABLE` |
| **DocumentVersion** | Version numbers, checksums, metadata | `createdAt` | YES (immutable version chain) | `EXACTLY_RECONSTRUCTABLE` |
| **DocumentAudit** | Action taxonomy, actor IDs, event metadata | `createdAt` | PARTIAL (event logs, no full document diffs) | `PARTIALLY_RECONSTRUCTABLE` |
| **DocumentRelationship** | Source/target document IDs, `DEPENDS_ON` type | `createdAt`, `updatedAt` | PARTIAL (deletions logged in `DocumentAudit`) | `PARTIALLY_RECONSTRUCTABLE` |
| **ProjectTopologyLink** | Source/target project IDs, topology type | `createdAt`, `updatedAt` | PARTIAL (hard deletions may lack audit logs) | `PARTIALLY_RECONSTRUCTABLE` |
| **Project Governance Config** | `governanceEnabled` flag | `createdAt`, `updatedAt` | PARTIAL (flag state logged via audit events) | `PARTIALLY_RECONSTRUCTABLE` |

### Reconstruction Rule:
- When evaluating $T_{\text{historical}}$, if all required sources for a subnetwork are `EXACTLY_RECONSTRUCTABLE` or `PARTIALLY_RECONSTRUCTABLE` with complete audit trails, the result status is `COMPLETE`.
- If any required topology edge or baseline state at $T_{\text{historical}}$ is ambiguous or missing audit proof, the API **MUST NOT** invent history or substitute current state; it returns `INDETERMINATE_HISTORICAL_EVIDENCE`.

---

## 5. Product Gap

Phases 19–21 answer real-time gate status ($T_{\text{now}}$) and hypothetical future status ($T_{\text{what-if}}$), but cannot answer:
1. What was the exact system topology gate status at timestamp $T_{\text{historical}}$?
2. How did system release safety evolve between $T_1$ and $T_2$?
3. Which authoritative system event was temporally associated with a gate transition from `PASSED` to `BLOCKED`?
4. What was the historical duration and release exposure of active policy waivers?

Phase 22 closes this gap by providing **Historical & Causal Governance Intelligence**.

---

## 6. Goals

- Provide point-in-time system topology gate evaluation for any historical timestamp $T_{\text{historical}}$ (`evaluateSystemGateAt(T)`).
- Generate permission-safe, chronological governance timelines over specified time windows $[T_1, T_2]$.
- Compute fine-grained gate state transitions and state diffs between two historical timestamps.
- Associate temporal predecessor events (`OBSERVED_EVENT`) with state transitions (`DERIVED_TRANSITION`).
- Maintain 100% permission isolation using Phase 14 ACL rules (`checkUserProjectReadAccess`).
- Maintain zero persistent database mutations and zero background queue workers.

---

## 7. Non-Goals

- Software deployment execution, release pipeline triggers, or cloud orchestration.
- Background cron jobs, resource polling workers, or continuous monitoring daemons.
- Persistent database models, snapshot tables, or stateful timeline record collections.
- Generic issue tracking, task management, or Jira/Linear-style remediation tickets.
- Mandatory AI, LLM, RAG, semantic guessing, or probabilistic root-cause claims.
- Visual vector diagram canvas editing.

---

## 8. Architecture

Phase 22 is a pure read-only temporal evaluation layer composing existing authorities:

```text
Authoritative Timestamped Collections (Read-Only):
  DocumentationBaseline | PackageFulfillmentAttestation | SystemGovernanceWaiver | DocumentAudit | ProjectTopologyLink
                                      ↓
                       system-governance-lineage.service.ts
  1. Reconstruct historical graph state at T_hist (applying Phase 14 ACL)
  2. Validate completeness -> COMPLETE vs INDETERMINATE_HISTORICAL_EVIDENCE
                                      ↓
                     Phase 19 Gate Evaluator (Extracted Helper)
  evaluateSystemGateFromHistoricalState(rootProjectId, reconstructedState, T_hist)
                                      ↓
                     Phase 20 Waiver Exception Engine
  matchActiveWaiverAtTimestamp(waivers, blocker, T_hist)
                                      ↓
Result DTO: Historical Gate Result / Timeline / Lineage Diff
```

---

## 9. Historical State Model

To evaluate a system topology gate at timestamp $T_{\text{historical}}$, the engine reconstructs the effective state of all governance primitives as they existed at $T_{\text{historical}}$:

$$\text{State}(T_{\text{historical}}) = \{ \text{Baselines}_{T}, \text{Attestations}_{T}, \text{Waivers}_{T}, \text{Topology}_{T} \}$$

### Reconstruction Rules:
1. **Timestamp Boundary**: A record is included in $\text{State}(T_{\text{historical}})$ if and only if $\text{createdAt} \le T_{\text{historical}}$.
2. **Future Record Exclusion**: Any record created after $T_{\text{historical}}$ ($\text{createdAt} > T_{\text{historical}}$) is **100% ignored**.
3. **Same-Timestamp Ordering**: When multiple state-changing events share the exact same timestamp $T_{\text{historical}}$, tie-breaking resolves in deterministic order: Baseline Creation $\to$ Change Package Attestation $\to$ Waiver Grant $\to$ Waiver Revocation.
4. **Deleted / Archived Entities**: If a baseline was archived at $T_{\text{archived}} > T_{\text{historical}}$, it was **active** at $T_{\text{historical}}$. If $T_{\text{archived}} \le T_{\text{historical}}$, it was **archived** at $T_{\text{historical}}$.

---

## 10. Point-in-Time Evaluation

The core evaluation contract is `evaluateSystemGateAt(projectId, timestamp, userId)`:

```typescript
export async function evaluateSystemGateAt(
  rootProjectId: string,
  targetTimestamp: Date,
  userId: string,
): Promise<HistoricalSystemGateResult>
```

### Evaluation Steps:
1. **ACL Check**: Execute `checkUserProjectReadAccess(userId, rootProjectId)`. If false, throw `403 FORBIDDEN`.
2. **Topology Reconstruction**: Fetch `ProjectTopologyLink` records created $\le T_{\text{historical}}$. Omit any link pointing to an unauthorized project.
3. **Completeness Check**: If topology records at $T_{\text{historical}}$ lack historical deletion proof or exhibit structural ambiguity, set `reconstructionCompleteness: 'INDETERMINATE_HISTORICAL_EVIDENCE'`.
4. **Baseline Reconstruction**: For each authorized project, find the active baseline at $T_{\text{historical}}$ (`createdAt <= T` AND (`archivedAt > T` OR `archivedAt IS NULL`)).
5. **Attestation Reconstruction**: For each change package, find attestations with `fulfilledAt <= T`. Evaluate staleness against baseline at $T_{\text{historical}}$.
6. **Waiver Reconstruction**: Find waivers with `createdAt <= T`, `expiresAt > T`, and (`isRevoked === false` OR `revokedAt > T`).
7. **Phase 19 Composition**: Execute Phase 19 gate precedence logic over reconstructed historical state.

---

## 11. Baseline Reconstruction

- **Active Baseline at $T$**: The document in `DocumentationBaseline` where `projectId === targetProjectId`, `createdAt <= T`, and either `isActive === true` at $T$ or it was the latest created baseline prior to $T$ before being superseded/archived.
- **Archived Baseline at $T$**: If `isArchived === true` and `archivedAt <= T`, the baseline is treated as archived at $T$.
- **Baseline Uncertainty**: If no baseline record exists prior to $T$, return `baselinePresent: false`. Do NOT substitute current baseline state.

---

## 12. Attestation Reconstruction

- **Active Attestation at $T$**: The latest `PackageFulfillmentAttestation` where `projectId === targetProjectId` and `fulfilledAt <= T` (or `createdAt <= T`).
- **Attestation Staleness at $T$**: Evaluated by comparing the attestation's verified document version numbers against the reconstructed active baseline's version numbers as of $T$. If the baseline at $T$ has a higher version number, the attestation was **STALE at $T$**.

---

## 13. Waiver Reconstruction

Waiver reconstruction strictly applies Phase 20 scope states at $T$:
- **ACTIVE at $T$**: `createdAt <= T` AND `expiresAt > T` AND (`isRevoked === false` OR `revokedAt > T`).
- **REVOKED at $T$**: `isRevoked === true` AND `revokedAt <= T`.
- **EXPIRED at $T$**: `expiresAt <= T`.
- **Version Binding**: Waiver bound to Baseline v1 DOES NOT match Baseline v2 created at $T$.

---

## 14. Topology Reconstruction

- **Reconstructed Edges at $T$**: `ProjectTopologyLink` records created $\le T$.
- **Topology Deletion Handling**: If a topology link was created prior to $T$ and updated/deleted after $T$, it is included in topology at $T$. If a link was hard-deleted without audit records, the reconstruction is flagged as `INDETERMINATE_HISTORICAL_EVIDENCE`. Current topology state is NEVER substituted as historical truth.

---

## 15. Timeline

Timeline entries are derived in-memory records (never persisted):

```typescript
export interface TimelineEntry {
  entryId: string; // Deterministic hash (timestamp + entityId + eventType)
  timestamp: Date;
  eventType: 'BASELINE_CREATED' | 'ATTESTATION_FULFILLED' | 'WAIVER_GRANTED' | 'WAIVER_REVOKED' | 'WAIVER_EXPIRED' | 'TOPOLOGY_LINK_CREATED';
  sourceEntityId: string;
  sourceEntityType: string;
  projectId: string;
  projectName: string;
  summary: string;
  derivedTransition?: {
    previousStatus: SystemTopologyReleaseStatus;
    newStatus: SystemTopologyReleaseStatus;
    gateStateChanged: boolean;
  };
  associationType: 'OBSERVED_EVENT' | 'TRANSITION_ASSOCIATED_EVENT' | 'TEMPORAL_PREDECESSOR';
}
```

---

## 16. Transition Detection

A **Derived Transition** is calculated when reconstructed gate status at $T_i$ differs from $T_{i-1}$:

- `PASSED` $\to$ `BLOCKED`
- `BLOCKED` $\to$ `PASSED_WITH_WAIVER`
- `PASSED_WITH_WAIVER` $\to$ `PASSED`
- `PASSED_WITH_WAIVER` $\to$ `BLOCKED`
- `BLOCKED` $\to$ `PASSED`
- `ANY_STATE` $\to$ `INDETERMINATE_HISTORICAL_EVIDENCE`

---

## 17. Event Association

An `OBSERVED_EVENT` occurring within $\Delta t \le 60\text{ seconds}$ prior to a `DERIVED_TRANSITION` involving the specific project/document is classified as a `TRANSITION_ASSOCIATED_EVENT`.

---

## 18. Causality Semantics

Phase 22 establishes strict, non-overclaiming causality rules:

1. **`OBSERVED_EVENT`**: Verified audit event actually recorded in system collections.
2. **`DERIVED_TRANSITION`**: Deterministic status change between two reconstructed states ($T_{i-1} \to T_i$).
3. **`ASSOCIATED_EVENT`**: An `OBSERVED_EVENT` occurring temporally/contextually within $\Delta t \le 60\text{s}$ of a transition.
4. **`PROVEN_CAUSALITY`**: ONLY claimed when an explicit, hardcoded schema reference links cause and effect (e.g. `changePackageId` in `PackageFulfillmentAttestation`).
5. **No AI / Semantic Guessing**: Machine learning, semantic guessing, or score-based causality claims are **STRICTLY FORBIDDEN**.

---

## 19. Phase 19 Composition

Phase 22 composes `system-topology-governance-gate.service.ts` gate precedence:
- `ROOT_GOVERNANCE_DISABLED` / `ROOT_LOCAL_GATE_BLOCKED` $\to$ `BLOCKED`
- `CONTRACT_MISALIGNED` / `PROVIDER_ATTESTATION_MISSING` / `PROVIDER_ATTESTATION_STALE` / `PROVIDER_LOCAL_GATE_BLOCKED` $\to$ `BLOCKED` (unless covered by valid active waiver $\to$ `PASSED_WITH_WAIVER`)
- All covered / zero blockers $\to$ `PASSED`

---

## 20. Phase 20 Composition

Phase 20 waiver scope matching (`matchActiveWaiver`) is executed over reconstructed active waivers at $T_{\text{historical}}$:
- Target provider project matching
- Mandatory document ID matching for `PROVIDER_LOCAL_GATE_BLOCKED`
- Contract version number matching
- Closed waivable blocker taxonomy (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`, `PROVIDER_GOVERNANCE_DISABLED`)

---

## 21. ACL / Privacy

All endpoints enforce Phase 14 `checkUserProjectReadAccess`:
- Unauthorized project nodes, topology links, baselines, attestations, and waivers are **100% omitted** prior to calculation.
- Timeline entry counts, aggregate statistics, and state-diff DTOs filter out unauthorized data to prevent side-channel leakage.

---

## 22. API

Minimal, permission-safe REST API:

1. `GET /api/v1/governance/system-topology/historical-gate?projectId=:id&at=:timestamp`
2. `GET /api/v1/governance/system-topology/lineage?projectId=:id&from=:t1&to=:t2&limit=50`
3. `GET /api/v1/governance/system-topology/lineage-diff?projectId=:id&t1=:t1&t2=:t2`

---

## 23. Frontend

Single focused UI component:

`apps/web/src/features/governance/components/SystemGovernanceLineageTimeline.tsx`

Features:
- Header distinction: `REAL-TIME GATE` vs `HISTORICAL POINT-IN-TIME RECONSTRUCTION`
- Chronological timeline with status badges (`PASSED`, `BLOCKED`, `PASSED_WITH_WAIVER`)
- Date picker for arbitrary timestamp evaluation
- State diff modal for $T_1$ vs $T_2$ comparisons
- Observed event side panel with explicit causality labels

---

## 24. Determinism

- Identical inputs `(projectId, timestamp, userId)` yield 100% byte-for-byte identical JSON responses.
- Timeline entries sort by `timestamp ASC`, `eventType ASC`, `sourceEntityId ASC`.

---

## 25. Performance

- Default window: 30 days; Maximum hard cap: 90 days.
- Pagination: 50 default, 100 max limit.
- Reuses existing indexed fields on `createdAt`, `fulfilledAt`, `expiresAt`, `timestamp`.
- Batch Mongo `$in` queries for subgraphs; zero N+1 queries.

---

## 26. Persistence Decision

**ZERO NEW PERSISTENCE**. No new database models, collections, or schema fields.

---

## 27. Worker Decision

**ZERO BACKGROUND WORKERS**. No background queue workers, cron jobs, or async daemons.

---

## 28. Audit Behavior

Read-only GET queries perform **ZERO audit log writes**.

---

## 29. Testing

Includes unit tests (`system-governance-lineage.test.ts`) and a 30-scenario dynamic QA runner (`run_phase22_qa.ts`).

---

## 30. QA Matrix

`run_phase22_qa.ts` will execute 30 dynamically counted scenarios:

1. Exact historical gate evaluation at $T_1$ (PASSED).
2. Historical baseline bump at $T_2$ (transition `PASSED` $\to$ `BLOCKED`).
3. Historical attestation fulfillment at $T_3$ (transition `BLOCKED` $\to$ `PASSED`).
4. Historical waiver grant at $T_4$ (transition `BLOCKED` $\to$ `PASSED_WITH_WAIVER`).
5. Historical waiver expiration at $T_5$ (transition `PASSED_WITH_WAIVER` $\to$ `BLOCKED`).
6. Historical waiver revocation before $T_6$ (transition `PASSED_WITH_WAIVER` $\to$ `BLOCKED`).
7. Historical waiver version binding mismatch at $T_7$.
8. Historical topology link creation reconstruction.
9. Topology history insufficiency returns `INDETERMINATE_HISTORICAL_EVIDENCE`.
10. Missing baseline audit evidence returns `INDETERMINATE_HISTORICAL_EVIDENCE`.
11. Incomplete historical reconstruction state handling.
12. Exact `INDETERMINATE_HISTORICAL_EVIDENCE` DTO structure.
13. Transition `PASSED` $\to$ `BLOCKED`.
14. Transition `BLOCKED` $\to$ `PASSED`.
15. Transition `PASSED` $\to$ `PASSED_WITH_WAIVER`.
16. Transition `PASSED_WITH_WAIVER` $\to$ `BLOCKED`.
17. Deterministic secondary ordering for same-timestamp events.
18. Secondary sorting key tie-breaking.
19. Bounded 90-day time window validation error (`400 BAD REQUEST`).
20. Pagination limit enforcement (50 default, 100 max).
21. ACL isolation on historical subgraph reconstruction.
22. Cross-project unauthorized project 100% omission.
23. Repeated identical query determinism check.
24. 0 database mutations during timeline query execution.
25. 0 background worker jobs queued.
26. 0 audit log writes during read query.
27. Causality does not overclaim (labels `ASSOCIATED_EVENT`).
28. Associated event temporal window attribution ($\le 60\text{s}$).
29. Phase 19 gate precedence preservation on historical state.
30. Current active baseline state does NOT contaminate historical evaluation at $T_{\text{historical}}$.

---

## 31. Failure Modes & Mitigations

1. **Missing historical topology audit records** $\to$ Return `INDETERMINATE_HISTORICAL_EVIDENCE`.
2. **Query latency on 90-day range** $\to$ Cap at 90 days, enforce indexed filters.
3. **ACL leakage in state diffs** $\to$ Prune subgraphs prior to diff calculation.
4. **Current state contamination** $\to$ Filter strictly by `createdAt <= T`.
5. **Overclaiming causality** $\to$ Restrict to `ASSOCIATED_EVENT` unless explicit schema reference exists.

---

## 32. Security Review

- Authentication via `authenticateJWT`.
- Authorization via Phase 14 `checkUserProjectReadAccess`.
- Zero information leakage; 100% read-only GET endpoints.

---

## 33. Open Questions

1. **Default Timeline Range**: Confirmed 30 days default, 90 days hard cap.
2. **Event Granularity**: Baseline creation, attestation fulfillment, waiver grant/revocation/expiration, topology creation.

---

## 34. Implementation Sequence

1. `system-governance-lineage.types.ts`
2. `system-governance-lineage.service.ts`
3. `system-governance-lineage.controller.ts` & `routes.ts`
4. `system-governance-lineage.test.ts` & `run_phase22_qa.ts`
5. `SystemGovernanceLineageTimeline.tsx` & frontend integration.

---

## 35. Verification Plan

```bash
pnpm test
pnpm --filter api typecheck
pnpm lint
pnpm --filter web build
pnpm --filter api exec tsx src/modules/governance/run_phase22_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase21_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase20_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase19_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase18_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase14_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase10_qa.ts
```

---

## 36. Acceptance Criteria

1. `evaluateSystemGateAt(T)` returns exact historical gate result when evidence is complete, or `INDETERMINATE_HISTORICAL_EVIDENCE` when evidence is incomplete.
2. Current active state NEVER contaminates historical evaluation at $T$.
3. Causality is NEVER claimed from temporal proximity alone (labeled `ASSOCIATED_EVENT`).
4. Phase 14 ACL rules are 100% enforced; unauthorized data is completely omitted.
5. Zero database mutations, zero audit log writes, zero background queue workers.
6. 30/30 QA matrix scenarios pass cleanly.
