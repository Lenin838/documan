# Phase 22 Implementation Plan v1

## 1. Executive Summary

Phase 22 introduces the **System Topology Governance State Lineage & Longitudinal Timeline Engine** (`system-governance-lineage.service.ts`). Building upon the system release gate evaluator (Phase 19), policy waiver exception lifecycle (Phase 20), and in-memory pre-release what-if simulation (Phase 21), Phase 22 provides a pure, read-only, request-scoped temporal analysis engine.

Phase 22 solves the **Longitudinal & Causal Governance Intelligence Gap**: it enables Technical Stewards, System Admins, and Project Owners to reconstruct historical point-in-time system governance gate states ($T_{\text{historical}}$), audit past release safety, compare system gate diffs between two timestamps ($T_1$ vs $T_2$), and trace state transitions back to temporal predecessor events without creating a second source of truth, mutating database models, or running background queue workers.

---

## 2. Research Basis

This plan is strictly grounded in the approved research document [`docs/research/PHASE-22-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-22-RESEARCH.md). The research confirmed that Documan's existing timestamped artifact collections (`DocumentationBaseline`, `PackageFulfillmentAttestation`, `SystemGovernanceWaiver`, `DocumentAudit`, `ProjectTopologyLink`, `DocumentRelationship`) contain sufficient immutable temporal metadata to reconstruct historical system topology governance states at query time. Candidate 1 was selected as the sole winner with a score of 54/55.

---

## 3. Current Repository Architecture

The repository is currently cleanly merged into `main` (`37f8024`), up to date with `origin/main`, with 100% passing test suites across Vitest (734/734 tests) and Phase 10–21 QA runners.

```text
Existing Authoritative Collections (Read-Only Input):
  - DocumentationBaseline        (Phase 12) [createdAt, isActive, isArchived, archivedAt]
  - ProjectTopologyLink          (Phase 14) [createdAt, updatedAt, source, target, type]
  - DocumentRelationship         (Phase 7/14)[createdAt, type: DEPENDS_ON]
  - PackageFulfillmentAttestation (Phase 17) [createdAt, fulfilledAt, attestationVersion]
  - SystemGovernanceWaiver       (Phase 20) [createdAt, revokedAt, expiresAt, isRevoked]
  - DocumentAudit                (Phase 4)  [createdAt, action, metadata]

Existing Governance Evaluator (Phase 19/20):
  - system-topology-governance-gate.service.ts (evaluateSystemTopologyGovernanceGate)
  - system-baseline-alignment.service.ts       (evaluateBaselineAlignment)
  - system-governance-waiver.service.ts        (matchActiveWaiver)

NEW Phase 22 Read-Only Layer:
  - system-governance-lineage.service.ts       (Historical Reconstruction & Timeline)
```

---

## 4. Product Gap

Phases 19–21 answer real-time gate status ($T_{\text{now}}$) and hypothetical future status ($T_{\text{what-if}}$), but cannot answer:
1. What was the exact system topology gate status at timestamp $T_{\text{historical}}$?
2. How did system release safety evolve between $T_1$ and $T_2$?
3. Which authoritative system event preceded a gate transition from `PASSED` to `BLOCKED`?
4. What was the historical duration and release exposure of active policy waivers?

Phase 22 closes this gap by providing **Historical & Causal Governance Intelligence**.

---

## 5. Goals

- Provide point-in-time system topology gate evaluation for any historical timestamp $T_{\text{historical}}$.
- Generate permission-safe, chronological governance timelines over specified time windows $[T_1, T_2]$.
- Compute fine-grained gate state transitions and state diffs between two historical timestamps.
- Associate temporal predecessor events (`OBSERVED_EVENT`) with state transitions (`DERIVED_TRANSITION`).
- Maintain 100% permission isolation using Phase 14 ACL rules (`checkUserProjectReadAccess`).
- Maintain zero persistent database mutations and zero background queue workers.

---

## 6. Non-Goals

- Software deployment execution, release pipeline triggers, or cloud orchestration.
- Background cron jobs, resource polling workers, or continuous monitoring daemons.
- Persistent database models, snapshot tables, or stateful timeline record collections.
- Generic issue tracking, task management, or Jira/Linear-style remediation tickets.
- Mandatory AI, LLM, RAG, or non-deterministic probabilistic root-cause claims.
- Visual vector diagram canvas editing.

---

## 7. Architectural Principles

1. **Pure Read-Only Composition**: Phase 22 reads existing timestamped collections and passes reconstructed historical state into the existing Phase 19 gate evaluation logic.
2. **Single Source of Truth**: Reuses Phase 19 gate precedence (`ROOT_LOCAL_GATE_BLOCKED` > `CONTRACT_MISALIGNED` > `PROVIDER_ATTESTATION_MISSING` > `PASSED_WITH_WAIVER` > `PASSED`).
3. **Zero Persistence**: All historical timelines and point-in-time evaluations are computed on-the-fly at query time.
4. **Zero Background Workers**: Requests are handled synchronously within bounded query windows.
5. **Strict ACL Isolation**: Reuses Phase 14 `checkUserProjectReadAccess`. Unauthorized projects and relationships are 100% omitted from historical reconstruction.

---

## 8. Historical State Reconstruction Model

To evaluate a system topology gate at timestamp $T_{\text{historical}}$, the engine reconstructs the effective state of all governance primitives as they existed at $T_{\text{historical}}$:

$$\text{State}(T_{\text{historical}}) = \{ \text{Baselines}_{T}, \text{Attestations}_{T}, \text{Waivers}_{T}, \text{Topology}_{T} \}$$

### Reconstruction Rules:
1. **Timestamp Boundary**: A record is included in $\text{State}(T_{\text{historical}})$ if and only if $\text{createdAt} \le T_{\text{historical}}$.
2. **Future Record Exclusion**: Any record created after $T_{\text{historical}}$ ($\text{createdAt} > T_{\text{historical}}$) is **100% ignored**.
3. **Same-Timestamp Ordering**: When multiple state-changing events share the exact same timestamp $T_{\text{historical}}$, tie-breaking resolves in deterministic order: Baseline Creation $\to$ Change Package Attestation $\to$ Waiver Grant $\to$ Waiver Revocation.
4. **Deleted / Archived Entities**: If a baseline was archived at $T_{\text{archived}} > T_{\text{historical}}$, it was **active** at $T_{\text{historical}}$. If $T_{\text{archived}} \le T_{\text{historical}}$, it was **archived** at $T_{\text{historical}}$.

---

## 9. Point-in-Time Governance Evaluation

Given a target project ID, timestamp $T_{\text{historical}}$, and requesting user ID:

```text
reconstructHistoricalTopologyState(targetProjectId, T_hist, userId)
  ├── 1. Check user READ access for targetProjectId (Phase 14 checkUserProjectReadAccess)
  ├── 2. Fetch ProjectTopologyLinks created <= T_hist
  ├── 3. Filter reachable topology subgraphs where user has READ access at T_hist
  ├── 4. For each project in authorized subgraph:
  │      ├── Find active DocumentationBaseline at T_hist (createdAt <= T_hist AND (archivedAt IS NULL OR archivedAt > T_hist))
  │      ├── Find latest PackageFulfillmentAttestation at T_hist (fulfilledAt <= T_hist)
  │      └── Find active SystemGovernanceWaivers at T_hist (createdAt <= T_hist AND (revokedAt IS NULL OR revokedAt > T_hist) AND expiresAt > T_hist)
  └── 5. Pass reconstructed historical state to evaluateSystemTopologyGovernanceGate
```

If the historical baseline or topology data for an authorized project cannot be deterministically reconstructed (e.g. legacy pre-Phase 12 records without creation timestamps), the subsystem status returns `INDETERMINATE_HISTORICAL_EVIDENCE`.

---

## 10. Timeline Model

A governance timeline over window $[T_1, T_2]$ generates an ordered sequence of `TimelineEntry` items:

```typescript
export interface TimelineEntry {
  entryId: string; // Deterministic hash of timestamp + entityId + eventType
  timestamp: Date;
  eventType: 'BASELINE_CREATED' | 'ATTESTATION_FULFILLED' | 'WAIVER_GRANTED' | 'WAIVER_REVOKED' | 'WAIVER_EXPIRED' | 'TOPOLOGY_LINK_CREATED';
  sourceEntityId: string;
  sourceEntityType: 'DocumentationBaseline' | 'PackageFulfillmentAttestation' | 'SystemGovernanceWaiver' | 'ProjectTopologyLink';
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

## 11. Transition Model

A **Derived Transition** occurs when the reconstructed system topology gate status at $T_{i}$ differs from the status at $T_{i-1}$:

$$\text{Transition} \iff \text{Status}(T_i) \neq \text{Status}(T_{i-1})$$

### Supported Deterministic Transitions:
- `PASSED` $\to$ `BLOCKED` (e.g. Provider published new active baseline without attestation)
- `BLOCKED` $\to$ `PASSED_WITH_WAIVER` (e.g. System Governance Waiver granted for waivable blocker)
- `PASSED_WITH_WAIVER` $\to$ `PASSED` (e.g. Provider attestation published, eliminating dependency blocker)
- `PASSED_WITH_WAIVER` $\to$ `BLOCKED` (e.g. Policy waiver expired or was revoked)
- `BLOCKED` $\to$ `PASSED` (e.g. Upstream contract misaligned relationship deleted)
- `PASSED` $\to$ `GOVERNANCE_DISABLED` (e.g. Root project governance flag disabled)
- `ANY_STATE` $\to$ `INDETERMINATE` (e.g. Missing historical baseline evidence)

---

## 12. Event Association / Causality Semantics

To ensure rigorous auditability, Phase 22 enforces strict vocabulary separation:

1. **`OBSERVED_EVENT`**: An immutable, verified audit event recorded in `DocumentAudit`, `DocumentationBaseline`, `PackageFulfillmentAttestation`, or `SystemGovernanceWaiver`.
2. **`DERIVED_TRANSITION`**: A mathematically calculated status change between two reconstructed gate evaluations.
3. **`ASSOCIATED_EVENT`**: An `OBSERVED_EVENT` occurring within a $\Delta t$ window ($\le 60$ seconds) prior to a `DERIVED_TRANSITION` that involves the specific project/document associated with the blocker change.
4. **`CAUSALITY`**: Phase 22 **NEVER** claims non-deterministic machine-learned causality. It explicitly labels relationships as `TRANSITION_ASSOCIATED_EVENT` or `TEMPORAL_PREDECESSOR`.

---

## 13. Baseline Reconstruction

- **Active Baseline at $T$**: The document in `DocumentationBaseline` where `projectId === targetProjectId`, `createdAt <= T`, and either `isActive === true` at $T$ or it was the latest created baseline prior to $T$ before being superseded.
- **Version Snapshots**: Document snapshots and relationship snapshots are taken directly from the reconstructed baseline's `documentSnapshots` and `relationshipSnapshots` arrays.
- **Archived Baselines**: If `isArchived === true` and `archivedAt <= T`, the baseline is treated as archived at $T$.

---

## 14. Attestation Reconstruction

- **Active Attestation at $T$**: The latest `PackageFulfillmentAttestation` where `projectId === targetProjectId` and `fulfilledAt <= T` (or `createdAt <= T`).
- **Attestation Staleness at $T$**: Evaluated by comparing the attestation's verified document version numbers against the reconstructed active baseline's version numbers as of $T$. If the baseline at $T$ has a higher version number, the attestation was **STALE at $T$**.

---

## 15. Waiver Reconstruction

- **Active Waiver at $T$**: A `SystemGovernanceWaiver` record is active at $T$ if and only if:
  1. `createdAt <= T`
  2. `expiresAt > T`
  3. `isRevoked === false` OR `revokedAt > T`
- **Expired Waiver at $T$**: If `expiresAt <= T`, the waiver was **EXPIRED at $T$**.
- **Revoked Waiver at $T$**: If `isRevoked === true` and `revokedAt <= T`, the waiver was **REVOKED at $T$**.

---

## 16. Historical Topology Reconstruction

- **Reconstructed Links at $T$**: `ProjectTopologyLink` records where `createdAt <= T` (and `updatedAt` / deletion metadata indicate existence at $T$).
- **Bounded Topology Rule**: If topology deletion events are missing from legacy audit logs, topology edges are reconstructed from `ProjectTopologyLink` records present at $T$. If topology ambiguity exceeds threshold, affected edges return `INDETERMINATE_TOPOLOGY`.

---

## 17. Phase 19 Gate Composition

Phase 22 composes `system-topology-governance-gate.service.ts` directly.

Instead of duplicating gate logic, Phase 22 extracts a pure helper function:

```typescript
export function evaluateSystemGateFromHistoricalState(
  rootProjectId: Types.ObjectId,
  reconstructedTopology: ReconstructedTopologyGraph,
  reconstructedBaselines: Map<string, IDocumentationBaseline>,
  reconstructedAttestations: Map<string, IPackageFulfillmentAttestation>,
  reconstructedWaivers: SystemGovernanceWaiverDocument[],
): SystemTopologyGovernanceGateResult
```

This guarantees 100% identical gate precedence between real-time Phase 19 evaluation and historical Phase 22 evaluation.

---

## 18. Phase 20 Waiver Composition

Historical waiver matching uses `system-governance-waiver.service.ts` matching logic:
- `targetProviderProjectId` matching
- `targetDocumentId` matching (document-level scope protection)
- `contractVersionNumber` matching
- `blockerType` matching (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`, `PROVIDER_GOVERNANCE_DISABLED`)
- Non-waivable blocker enforcement (`ROOT_GOVERNANCE_DISABLED`, `ROOT_LOCAL_GATE_BLOCKED`, `TOPOLOGY_TRUNCATION`, `INDETERMINATE_EVIDENCE`)

---

## 19. ACL / Privacy Model

All historical endpoints enforce Phase 14 `checkUserProjectReadAccess(userId, targetProjectId)`:

1. **Subgraph Pruning**: Any project node $P_i$ in the topology graph where `checkUserProjectReadAccess(userId, P_i)` returns `false` is **100% omitted** from historical reconstruction.
2. **Zero Information Leakage**: Response payloads contain zero restricted project IDs, zero counts of hidden projects, zero unauthorized document names, and zero private waiver reasons.
3. **Historical Privacy**: Historical timeline entries associated with unauthorized projects are filtered out before returning response payloads.

---

## 20. API Design

Phase 22 introduces 3 minimal, permission-safe REST endpoints:

### Endpoint 1: Get Historical System Governance Gate
- **Route**: `GET /api/v1/governance/system-topology/historical-gate`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**:
  - `projectId` (required string, Mongo ObjectId)
  - `at` (required ISO 8601 timestamp string, e.g. `2026-08-15T10:00:00.000Z`)
- **Response**: `200 OK` with `SystemTopologyGovernanceGateResult` reconstructed as of timestamp `at`.

### Endpoint 2: Get Governance State Lineage Timeline
- **Route**: `GET /api/v1/governance/system-topology/lineage`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**:
  - `projectId` (required string, Mongo ObjectId)
  - `from` (optional ISO 8601 string, default: 30 days ago)
  - `to` (optional ISO 8601 string, default: now)
  - `limit` (optional integer, min: 1, max: 100, default: 50)
- **Response**: `200 OK` with `TimelineEntry[]` and pagination metadata.

### Endpoint 3: Compare Governance State Diff Between Two Timestamps
- **Route**: `GET /api/v1/governance/system-topology/lineage-diff`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**:
  - `projectId` (required string, Mongo ObjectId)
  - `t1` (required ISO 8601 timestamp string)
  - `t2` (required ISO 8601 timestamp string)
- **Response**: `200 OK` with `SystemGovernanceStateDiff` (gate status change, newly blocked dependencies, newly resolved dependencies, waiver exposure diff).

---

## 21. Frontend Design

Introduce a single, focused React component:

`apps/web/src/features/governance/components/SystemGovernanceLineageTimeline.tsx`

### UI Features:
1. **Header Badge**: Visual indicator distinguishing `CURRENT REAL-TIME GATE` vs `HISTORICAL POINT-IN-TIME RECONSTRUCTION`.
2. **Timeline View**: Vertical chronological timeline displaying historical gate transitions (`PASSED` $\to$ `BLOCKED` $\to$ `PASSED_WITH_WAIVER`) with color-coded badges.
3. **Date Picker**: Timestamp selector allowing users to inspect historical gate status at any specific date/time.
4. **State Diff Inspector**: Side-by-side comparison modal displaying changes between $T_1$ and $T_2$.
5. **Observed Event Drawer**: Side panel detailing the specific baseline, attestation, or waiver event associated with a gate transition.

---

## 22. Determinism

- **Identical Input Guarantee**: Executing `evaluateHistoricalSystemGovernanceGate` with identical `(projectId, timestamp, userId)` parameters will return 100% byte-for-byte identical JSON responses.
- **Deterministic Event Sorting**: Timeline entries are sorted strictly by `timestamp ASC`, `eventType ASC`, `sourceEntityId ASC`.
- **Tie-Breaking**: Same-timestamp events resolve in strict precedence order: `BASELINE_CREATED` (1) $\to$ `ATTESTATION_FULFILLED` (2) $\to$ `WAIVER_GRANTED` (3) $\to$ `WAIVER_REVOKED` (4) $\to$ `WAIVER_EXPIRED` (5).

---

## 23. Performance

- **Bounded Query Windows**: Default timeline window is 30 days; maximum hard cap is 90 days.
- **Database Indexes Reused**:
  - `DocumentationBaseline`: `{ projectId: 1, createdAt: -1 }`
  - `PackageFulfillmentAttestation`: `{ projectId: 1, createdAt: -1 }`
  - `SystemGovernanceWaiver`: `{ rootProjectId: 1, createdAt: -1 }`
  - `DocumentAudit`: `{ documentId: 1, createdAt: -1 }`
- **Zero N+1 Traversal**: Topology subgraphs are fetched in batch using single Mongo `$in` queries per depth level up to max depth = 3.
- **Synchronous Execution**: Typical response time $<150\text{ ms}$ for standard topology networks.

---

## 24. Persistence Decision

**ZERO NEW PERSISTENCE**.

Phase 22 creates no new Mongoose models, database collections, schema fields, or indexes. All historical gate evaluations, timeline entries, and state diffs are derived dynamically at query time from existing timestamped collections.

---

## 25. Worker Decision

**ZERO BACKGROUND WORKERS**.

Phase 22 requires no background queue workers, cron jobs, resource sweepers, or async daemons. All queries execute synchronously within bounded HTTP request-response cycles.

---

## 26. Audit Behavior

- **Read-Only Query Policy**: Querying historical lineage endpoints (`/lineage`, `/historical-gate`, `/lineage-diff`) performs **ZERO audit log writes**.
- **No Audit Pollution**: Reading historical compliance data does not create noisy `DOCUMENT_VIEW` or `GOVERNANCE_EVALUATED` audit records.

---

## 27. Testing Strategy

Complete test coverage across backend services, controllers, routes, and QA matrix:

1. **Unit Tests (`system-governance-lineage.test.ts`)**:
   - Historical baseline reconstruction accuracy at $T_{\text{historical}}$.
   - Historical attestation staleness evaluation at $T_{\text{historical}}$.
   - Historical waiver active/expired/revoked state evaluation at $T_{\text{historical}}$.
   - State transition calculation accuracy ($T_1$ vs $T_2$).
   - Temporal tie-breaking for same-timestamp events.
   - Bounded historical window enforcement (max 90 days).
   - Phase 14 ACL subgraph omission for unauthorized projects.
2. **QA Matrix Runner (`run_phase22_qa.ts`)**:
   - Dynamically counted scenario suite covering 25+ distinct historical timeline scenarios.

---

## 28. QA Matrix

`apps/api/src/modules/governance/run_phase22_qa.ts` will execute 25 dynamically counted scenarios:

1. Reconstruct historical gate for project with single active baseline at $T_1$.
2. Reconstruct historical gate after baseline bump $v1 \to v2$ (transition `PASSED` $\to$ `BLOCKED`).
3. Reconstruct historical gate after change package attestation (transition `BLOCKED` $\to$ `PASSED`).
4. Reconstruct historical gate after policy waiver grant (transition `BLOCKED` $\to$ `PASSED_WITH_WAIVER`).
5. Reconstruct historical gate after policy waiver revocation (transition `PASSED_WITH_WAIVER` $\to$ `BLOCKED`).
6. Reconstruct historical gate after policy waiver expiration (transition `PASSED_WITH_WAIVER` $\to$ `BLOCKED`).
7. Evaluate historical gate prior to project creation timestamp (returns `INDETERMINATE_HISTORICAL_EVIDENCE`).
8. Evaluate historical gate with future-dated timestamp (returns current state as of now).
9. Verify timeline entry generation across 30-day window.
10. Verify timeline entry tie-breaking for same-timestamp events.
11. Verify state-diff calculation between $T_1$ (PASSED) and $T_2$ (BLOCKED).
12. Verify state-diff calculation between $T_2$ (BLOCKED) and $T_3$ (PASSED_WITH_WAIVER).
13. Verify Phase 14 ACL omission of unauthorized provider project from historical timeline.
14. Verify zero information leakage in historical response DTOs for unauthorized users.
15. Verify document-level waiver historical matching at $T_{\text{historical}}$.
16. Verify version-bound waiver historical matching at $T_{\text{historical}}$.
17. Verify root governance disabled historical gate status (`GOVERNANCE_DISABLED`).
18. Verify provider governance disabled historical gate status (`PASSED` / `BLOCKED` depending on baseline alignment).
19. Verify max 90-day historical window validation error (`400 BAD REQUEST`).
20. Verify invalid timestamp format validation error (`400 BAD REQUEST`).
21. Verify 0 database mutations during timeline query execution.
22. Verify 0 audit log writes during timeline query execution.
23. Verify exact Phase 19 gate precedence matching on historical reconstructed states.
24. Verify regression test suite for Phase 10 local release gates.
25. Verify regression test suite for Phase 20 system governance waivers.

---

## 29. Failure Modes & Mitigations

1. **Failure Mode: Missing timestamps on legacy pre-Phase 12 records**.
   - *Mitigation*: Fall back to `createdAt` or initial baseline creation date; mark legacy state as `INDETERMINATE_HISTORICAL_EVIDENCE`.
2. **Failure Mode: Excessive query latency on wide 90-day time windows**.
   - *Mitigation*: Enforce default 30-day window; index queries on `createdAt` and `timestamp`; cap pagination limit to 50 entries.
3. **Failure Mode: Historical ACL leakage via state diffs**.
   - *Mitigation*: Run `checkUserProjectReadAccess` on all topology nodes before calculating state diffs; exclude unauthorized node IDs from diff payloads.
4. **Failure Mode: Misinterpreting current waiver state as historical state**.
   - *Mitigation*: Check `createdAt <= T`, `expiresAt > T`, and `revokedAt > T` explicitly for historical evaluation.
5. **Failure Mode: Overlapping timeline entries with duplicate timestamps**.
   - *Mitigation*: Apply strict secondary sorting by `eventType ASC` and `sourceEntityId ASC`.

---

## 30. Security Review

- **Authentication**: All Phase 22 endpoints require valid JWT authentication (`authenticateJWT`).
- **Authorization**: All Phase 22 endpoints enforce Phase 14 project authorization (`checkUserProjectReadAccess`).
- **Data Exposure**: Responses contain zero unauthorized project names, zero restricted node IDs, zero private waiver notes, and zero hidden topology relationship counts.
- **Side Effects**: 100% read-only GET endpoints with zero state mutation side effects.

---

## 31. Open Questions

1. **Default Timeline Query Window**: Is 30 days optimal as the default window? (*Decision: Yes, 30 days default, 90 days hard cap*).
2. **Timeline Page Limit**: Is 50 entries per page sufficient? (*Decision: Yes, 50 default, 100 maximum*).

---

## 32. Implementation Sequence

### Step 1: Types & DTOs
- Create `apps/api/src/modules/governance/system-governance-lineage.types.ts`
- Define `TimelineEntry`, `SystemGovernanceStateDiff`, `HistoricalGateQueryDto`.

### Step 2: Service Layer
- Create `apps/api/src/modules/governance/system-governance-lineage.service.ts`
- Implement `reconstructHistoricalTopologyState`, `evaluateHistoricalSystemGovernanceGate`, `generateSystemGovernanceTimeline`, `calculateGovernanceStateDiff`.

### Step 3: Controller & Routes
- Create `apps/api/src/modules/governance/system-governance-lineage.controller.ts`
- Create `apps/api/src/modules/governance/system-governance-lineage.routes.ts`
- Register routes in `apps/api/src/routes/index.ts`.

### Step 4: Unit Tests & QA Suite
- Create `apps/api/src/modules/governance/system-governance-lineage.test.ts`
- Create `apps/api/src/modules/governance/run_phase22_qa.ts`.

### Step 5: Web API & UI Components
- Create `apps/web/src/features/governance/system-governance-lineage.types.ts`
- Create `apps/web/src/features/governance/system-governance-lineage.api.ts`
- Create `apps/web/src/features/governance/components/SystemGovernanceLineageTimeline.tsx`
- Integrate into `SystemGovernanceGateSection.tsx`.

---

## 33. Verification Plan

### Automated Tests:
```bash
# Unit & Integration Tests
pnpm test

# Typecheck
pnpm --filter api typecheck

# Linting
pnpm lint

# Web Build
pnpm --filter web build

# Phase 22 QA Matrix
pnpm --filter api exec tsx src/modules/governance/run_phase22_qa.ts

# Regression Suite
pnpm --filter api exec tsx src/modules/governance/run_phase21_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase20_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase19_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase18_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase14_qa.ts
pnpm --filter api exec tsx src/modules/governance/run_phase10_qa.ts
```

---

## 34. Acceptance Criteria

1. `evaluateHistoricalSystemGovernanceGate` accurately reconstructs system release gate status as of timestamp $T_{\text{historical}}$.
2. `generateSystemGovernanceTimeline` builds a permission-safe, chronological timeline of state-changing events over window $[T_1, T_2]$.
3. `calculateGovernanceStateDiff` calculates accurate state transitions and dependency diffs between $T_1$ and $T_2$.
4. Phase 14 ACL rules are 100% enforced; unauthorized projects are completely omitted from historical query results.
5. Zero database models created, zero database mutations committed, zero audit events logged during query execution.
6. Zero background queue workers or cron jobs introduced.
7. Vitest suite passes 100% cleanly.
8. Phase 22 QA runner passes 25/25 dynamically counted scenarios.
9. Regression QA runners for Phases 10, 14, 18, 19, 20, 21 pass 100% cleanly.
10. API typecheck, ESLint, and web production build pass with 0 errors.
