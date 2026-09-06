# Phase 18 Implementation Plan v1

> **Implementation Planning Checkpoint (v1 Final)**
>
> **Capability Title**: Cross-Project Baseline Contract Lineage & Attestation Alignment Verification  
> **Status**: PLANNING ONLY — Awaiting Explicit Implementation Authorization  
> **Target Horizon**: Phase 18  
> **Approved Research Reference**: `docs/research/PHASE-18-RESEARCH-v4.md`  
> **Prerequisites**: Phase 10 (Governance Gates), Phase 12 (Documentation Baselines), Phase 14 (System Topology), Phase 15 (Change Proposals), Phase 16 (Change Packages), Phase 17 (Fulfillment Verification & Immutable Attestation)

---

## Status

**PLANNING ONLY**. This document establishes the technical execution plan for Phase 18 based on verified codebase mechanics and approved Phase 18 Research v4.

**DO NOT**:
- Implement Phase 18 application code
- Modify existing Phase 18 research files (`PHASE-18-RESEARCH-v4.md`)
- Modify Phase 17 files
- Create a feature branch
- Update product roadmap
- Commit, push, or merge
- Execute QA implementation

Execution requires explicit user authorization following plan review.

---

## Approved Research Reference

- `docs/research/PHASE-18-RESEARCH-v4.md` (Approved Phase 18 Research)
- Commit Baseline: `e6be79c9fd0e49502b1304629b7e3ea7257f6e93`

---

## Repository Baseline

Inspection of the repository at commit `e6be79c9fd0e49502b1304629b7e3ea7257f6e93` confirms the active working state:

- **Local `main`**: `e6be79c9fd0e49502b1304629b7e3ea7257f6e93`
- **`origin/main`**: `e6be79c9fd0e49502b1304629b7e3ea7257f6e93`
- **Working Tree**: Clean (all prior Phase 17 changes merged via `--no-ff`)

---

## Existing Primitives

Inspection of the codebase confirms six authoritative existing primitives and signatures:

1. **`ProjectTopologyLink`** (`apps/api/src/modules/projects/project-topology.model.ts`):
   - Establishes project-level directional topology relationships (`sourceProjectId`, `targetProjectId`, `type`).
   - `type` enum: `'DEPENDS_ON' | 'PROVIDES_API_TO' | 'INTEGRATES_WITH' | 'SHARED_LIBRARY'`.
   - Compound unique index: `{ sourceProjectId: 1, targetProjectId: 1, type: 1 }`.
   - Does NOT store document, version, or checksum references.

2. **`DocumentationBaseline`** (`apps/api/src/modules/governance/documentation-baseline.model.ts`):
   - Sole authority for project active baseline snapshots (`projectId`, `name`, `versionTag`, `isActive`, `isArchived`, `documentSnapshots`, `relationshipSnapshots`).
   - Unique partial index: `{ projectId: 1, isActive: 1 } (partialFilterExpression: { isActive: true })`.
   - **Repository Fact**: Enforces **at most ONE active baseline per project**.
   - `documentSnapshots` array elements: `{ documentId, documentVersionId, versionNumber, checksum }`.

3. **`DocumentRelationship`** (`apps/api/src/modules/documents/document-relationship.model.ts`):
   - Directional document relationship links (`sourceDocumentId`, `targetDocumentId`, `type`).
   - `type` enum: `'RELATED' | 'REFERENCES' | 'REPLACES' | 'DEPENDS_ON'`.
   - Unique compound index: `{ sourceDocumentId: 1, targetDocumentId: 1, type: 1 }`.
   - **Repository Fact**: `sourceDocumentId` `DEPENDS_ON` `targetDocumentId` defines that `sourceDocumentId` = Consumer Document and `targetDocumentId` = Provider Document.

4. **`DocumentVersion`** (`apps/api/src/modules/documents/document-version.model.ts`):
   - Immutable document version record (`documentId`, `projectId`, `versionNumber`, `checksum`, `content`).

5. **`PackageFulfillmentAttestation`** (`apps/api/src/modules/change-packages/change-package-attestation.model.ts`):
   - Post-acceptance fulfillment verification record (`changePackageId`, `projectId`, `attestationVersion`, `verifiedVersionSnapshot`).
   - `verifiedVersionSnapshot` array elements: `{ documentId, proposalId, documentVersionId, versionNumber, checksum }`.
   - Unique compound index: `{ changePackageId: 1, attestationVersion: 1 }`.

6. **`checkUserProjectReadAccess`** (`apps/api/src/modules/projects/project-topology.service.ts`):
   - Authorization helper checking user `READ` access to a project based on ownership, document ownership/stewardship, or document shares.

---

## Architecture Decision

- **Pure Derived Calculation**: Phase 18 is a 100% read-only derived engine.
- **ZERO New Database Collections**: All calculations are computed at query time by joining existing MongoDB collections (`DocumentationBaseline`, `ProjectTopologyLink`, `DocumentRelationship`, `PackageFulfillmentAttestation`).
- **Domain Module Boundary**: Resides within `apps/api/src/modules/governance/` as `system-baseline-alignment.service.ts`, `system-baseline-alignment.controller.ts`, `system-baseline-alignment.routes.ts`, and `system-baseline-alignment.types.ts`.
- **API Boundary**: Exposed as a single read-only REST endpoint: `GET /api/v1/projects/:projectId/system-baseline-alignment`.

---

## Final Scope

Phase 18 implements:
1. Cross-project baseline contract lineage verification across connected project topologies.
2. Cross-project document `DEPENDS_ON` pair extraction filtered by active topology links.
3. Active baseline snapshot reference comparison between downstream consumer baselines and upstream provider active baselines.
4. Phase 17 fulfillment attestation provenance & query-time staleness integration.
5. Deterministic dual-metric scoring (`System Alignment Score` and `Evidence Completeness`).
6. Privacy-safe multi-project authorization filtering.
7. Read-only frontend visualization component integrated into `ProjectDetailsPage`.

---

## Non-Goals

Phase 18 explicitly EXCLUDES:
- NO automatic baseline creation (Phase 12 remains sole authority).
- NO automatic document editing or `DocumentVersion` creation.
- NO semantic API schema solvers or non-deterministic NLP/LLM schema matching.
- NO CI/CD runner execution, deployment triggers, or Git/VCS automation.
- NO persistent database mutation or background cron jobs.
- NO visual drag-and-drop vector architecture canvas editing.
- NO Jira / task management integration.

---

## Alignment Model

The conceptual alignment chain is strictly linear, deterministic, and derived:

```
ProjectTopologyLink (Active cross-project link)
    ↓
cross-project DocumentRelationship (type === 'DEPENDS_ON')
    ↓
Document Pair (Consumer Document + Provider Document)
    ↓
Provider Active Baseline Snapshot + Consumer Active Baseline Snapshot
    ↓
Version Reference & Checksum Comparison
    ↓
Structural Alignment State (ALIGNED | MISALIGNED | INDETERMINATE)
    +
Phase 17 PackageFulfillmentAttestation Provenance & Staleness
    ↓
Derived System Baseline Alignment View
```

---

## Alignment Unit

An **Alignment Unit** represents the single fundamental evaluation atom:

$$\text{Alignment Unit} = \left( \text{Doc}_{\text{consumer}}, \text{Doc}_{\text{provider}}, \text{Base}_{\text{consumer}}, \text{Base}_{\text{provider}} \right)$$

### Applicability Criteria

An alignment unit is applicable if and only if **ALL** six conditions are met:
1. An active `ProjectTopologyLink` connects $\text{Project}_{\text{consumer}}$ and $\text{Project}_{\text{provider}}$.
2. A cross-project `DocumentRelationship` exists between $\text{Doc}_{\text{consumer}}$ and $\text{Doc}_{\text{provider}}$.
3. `DocumentRelationship.type === 'DEPENDS_ON'`.
4. The relationship direction is verified: $\text{Doc}_{\text{consumer}}$ (`sourceDocumentId`) depends on $\text{Doc}_{\text{provider}}$ (`targetDocumentId`).
5. The calling user has `READ` permission on both $\text{Project}_{\text{consumer}}$ and $\text{Project}_{\text{provider}}$.
6. Required active baseline information exists for evaluation.

> [!NOTE]
> Topology links alone do NOT constitute document contract dependencies. An alignment unit requires an explicit `DEPENDS_ON` document relationship pair.

---

## DEPENDS_ON Semantics

Codebase verification of `apps/api/src/modules/documents/document-relationship.service.ts` (lines 415–530) establishes exact directional semantics:

- **`sourceDocumentId`**: The dependent document (Consumer Document $\text{Doc}_{\text{consumer}}$).
- **`targetDocumentId`**: The target depended-upon document (Provider Document $\text{Doc}_{\text{provider}}$).
- **`sourceDocument.projectId`**: Consumer Project ($\text{Project}_{\text{consumer}}$).
- **`targetDocument.projectId`**: Provider Project ($\text{Project}_{\text{provider}}$).

### Cross-Project Validation

- Cross-project `DEPENDS_ON` relationships are allowed only when a `ProjectTopologyLink` exists between `sourceDocument.projectId` and `targetDocument.projectId`.
- Unique index `{ sourceDocumentId: 1, targetDocumentId: 1, type: 1 }` prevents duplicate directional links.

---

## Provider Baseline Authority

Phase 12 `DocumentationBaseline({ projectId: providerProjectId, isActive: true, isArchived: false })` is the **single authoritative source** for a provider project's active baseline state.

- Mongoose unique partial index `{ projectId: 1, isActive: 1 } (partialFilterExpression: { isActive: true })` guarantees at most one active baseline per project.
- Active baseline snapshot contains `documentSnapshots: Array<{ documentId, documentVersionId, versionNumber, checksum }>`.
- The provider snapshot entry for $\text{Doc}_{\text{provider}}$ establishes the authoritative version ($\text{Version}_{\text{provider\_active}}$) and checksum ($\text{Checksum}_{\text{provider\_active}}$).

---

## Consumer Baseline Resolution

Consumer active baseline is retrieved via `DocumentationBaseline({ projectId: consumerProjectId, isActive: true, isArchived: false })`.

- Phase 12 snapshots capture both in-project documents and external `DEPENDS_ON` target documents.
- The consumer baseline's `documentSnapshots` array is inspected for an entry matching `documentId === Doc_provider._id`.
- If present, this yields the consumer's recorded provider snapshot version ($\text{Version}_{\text{consumer\_ref}}$) and checksum ($\text{Checksum}_{\text{consumer\_ref}}$).

---

## Provider Baseline Evolution

When a provider project updates its active baseline:

### Evolution Sequence Analysis
1. **Initial State**:
   - Provider publishes Baseline `v1.0` (Active, Attested via Phase 17) containing `Doc P` `v1`.
   - Consumer publishes Baseline `v1.0` (Active) referencing `Doc P` `v1`.
   - Result: `ALIGNED` (`providerAttested: true`).

2. **Provider Update State**:
   - Provider updates `Doc P` to `v2` and creates new active Baseline `v2.0` (Active, not yet attested).
   - Consumer active baseline remains on `v1.0` (referencing `Doc P` `v1`).

3. **Evaluation Result**:
   - Authoritative Provider Active Baseline specifies `Doc P` `v2`.
   - Consumer Active Baseline references `Doc P` `v1`.
   - Because `v1` $\ne$ `v2`, structural alignment state is **`MISALIGNED`**.
   - Governance Evidence metadata records `providerAttested: false`.
   - **Rationale**: The consumer is `MISALIGNED` because it references an outdated provider baseline snapshot. The absence of attestation on provider `v2.0` is reported in governance evidence and does not convert structural misalignment into a semantic compatibility claim.

---

## Attestation Resolution

Phase 17 `PackageFulfillmentAttestation` records post-acceptance package fulfillment verification.

### Resolution Algorithm
For a provider document version $(\text{documentId}, \text{documentVersionId}, \text{checksum})$ in the active provider baseline:
1. Query `PackageFulfillmentAttestation` where `verifiedVersionSnapshot` contains an entry matching `documentId` AND (`documentVersionId` OR `checksum`).
2. If multiple matching attestations exist across change packages or re-attestations, select the attestation record with the **highest `attestationVersion`** (most recent attestation).
3. If a matching attestation is found: `providerAttested = true`, `attestationVersion = attestation.attestationVersion`, `changePackageId = attestation.changePackageId`.
4. If no matching attestation is found: `providerAttested = false`.

---

## Staleness Handling

For the selected matching `PackageFulfillmentAttestation`:

1. Query `DocumentVersion.findOne({ documentId: Doc_provider._id }).sort({ versionNumber: -1 })` to fetch the head version of the provider document.
2. If `headVersion.versionNumber !== snapshot.versionNumber` OR `headVersion.checksum !== snapshot.checksum`:
   - `attestationStale = true` (head document version has drifted past the attested snapshot).
3. Otherwise:
   - `attestationStale = false`.

---

## Alignment States

Phase 18 strictly separates **structural alignment state** (`alignmentState`) from **governance evidence metadata** (`governanceEvidence`).

### Unit-Level Structural Alignment State (`alignmentState`):
- **`ALIGNED`**: Consumer active baseline snapshot references the exact provider document version/checksum present in the authoritative active provider baseline.
- **`MISALIGNED`**: Consumer active baseline snapshot references an older, un-captured, or divergent provider document version.
- **`INDETERMINATE`**: Required active baseline snapshot missing for consumer or provider project, or insufficient deterministic evidence available.

---

## Evidence Model

Governance evidence metadata is returned alongside `alignmentState` without altering structural evaluation:

```typescript
export interface GovernanceEvidenceDTO {
  providerBaselinePresent: boolean;
  consumerBaselinePresent: boolean;
  providerAttested: boolean;
  attestationStale: boolean;
  attestationVersion?: number | null;
  changePackageId?: string | null;
  attestedAt?: Date | null;
}
```

---

## Aggregate State

System-level aggregate alignment state precedence is strictly ordered:

1. **`INDETERMINATE`**: If baseline data could not be fetched for authorized projects due to system error or corrupt state.
2. **`ZERO_APPLICABLE_EVIDENCE`**: If $N_{\text{applicable}} == 0$.
3. **`MISALIGNED`**: If 100% of applicable units are `MISALIGNED`.
4. **`PARTIALLY_ALIGNED`**: If at least one unit is `ALIGNED` and at least one unit is `MISALIGNED` (or `INDETERMINATE`).
5. **`ALIGNED`**: If 100% of applicable units are `ALIGNED`.

---

## Alignment Score

To ensure 100% mathematical rigor:

$$\text{System Alignment Score} = \left( \frac{N_{\text{aligned}}}{N_{\text{applicable}}} \right) \times 100$$

Where:
- $N_{\text{applicable}}$ = Count of applicable cross-project `DEPENDS_ON` units where both consumer and provider active baselines exist.
- $N_{\text{aligned}}$ = Count of applicable units where `alignmentState === 'ALIGNED'`.
- If $N_{\text{applicable}} == 0$: `alignmentScore = null`.

---

## Evidence Completeness

To prevent missing baseline evidence from artificially inflating the score:

$$\text{Evidence Completeness} = \left( \frac{N_{\text{applicable}}}{N_{\text{total}}} \right) \times 100$$

Where:
- $N_{\text{total}}$ = Total cross-project `DEPENDS_ON` relationship pairs across authorized connected projects.
- If $N_{\text{total}} == 0$: `evidenceCompleteness = null`.

---

## Zero Applicable Evidence

When zero applicable units exist ($N_{\text{applicable}} == 0$):
- `aggregateState = 'ZERO_APPLICABLE_EVIDENCE'`
- `alignmentScore = null`
- `evidenceCompleteness = null`
- Never returns 100% or 0%.

---

## Cross-Project Authorization

Phase 18 reuses `checkUserProjectReadAccess(userId, role, projectId)` from `apps/api/src/modules/projects/project-topology.service.ts`:

1. Requesting user must have `READ` permission on the primary query project (`projectId`). If unauthorized, return `403 Forbidden`.
2. For each connected project in the topology, `checkUserProjectReadAccess(userId, role, connectedProjectId)` is checked.
3. Connected projects for which the user lacks `READ` access are **100% OMITTED** from traversal.

---

## Privacy Model

Strict multi-project privacy rules prevent side-channel information leakage:

- **Zero Placeholders**: Unauthorized projects are omitted entirely (no `"Restricted Project"`, no masked IDs).
- **Zero Count Leakage**: $N_{\text{total}}$, $N_{\text{applicable}}$, $N_{\text{aligned}}$, and $N_{\text{misaligned}}$ are calculated **strictly over the user's authorized subgraph**.
- Topology links connecting to unauthorized projects are ignored during traversal.

---

## Persistence Decision

- **ZERO New Database Models / Collections**.
- All calculations are pure query-time derived data structures.
- NO mutation, NO background workers, NO automatic baseline creation.

---

## Module Boundary

Phase 18 code is located entirely in:

`apps/api/src/modules/governance/`

Files:
- `system-baseline-alignment.types.ts`
- `system-baseline-alignment.service.ts`
- `system-baseline-alignment.controller.ts`
- `system-baseline-alignment.routes.ts`
- `system-baseline-alignment.test.ts`
- `run_phase18_qa.ts`

Mounted in `apps/api/src/routes/index.ts`:
`apiRouter.use('/projects/:projectId/system-baseline-alignment', systemBaselineAlignmentRouter);`

---

## API Design

### Route Specification

- **Method**: `GET`
- **Path**: `/api/v1/projects/:projectId/system-baseline-alignment`
- **Authentication**: JWT / Session (`authenticate` middleware)
- **Authorization**: `READ` access to `:projectId`

### Response Payload Schema (`200 OK`)

```json
{
  "projectId": "60d5ec49f1b2c81234567890",
  "evaluatedAt": "2026-09-06T10:15:00.000Z",
  "aggregateState": "PARTIALLY_ALIGNED",
  "alignmentScore": 50.0,
  "evidenceCompleteness": 100.0,
  "summary": {
    "totalUnits": 2,
    "applicableUnits": 2,
    "alignedUnits": 1,
    "misalignedUnits": 1,
    "indeterminateUnits": 0
  },
  "alignmentUnits": [
    {
      "unitId": "rel_12345",
      "consumerProject": { "id": "proj_consumer", "name": "Payment Gateway" },
      "providerProject": { "id": "proj_provider", "name": "Auth Service" },
      "consumerDocument": { "id": "doc_pay", "title": "Payment Guide" },
      "providerDocument": { "id": "doc_auth", "title": "Auth Spec" },
      "consumerVersionRef": { "versionNumber": 1, "checksum": "chk_1" },
      "providerActiveVersion": { "versionNumber": 1, "checksum": "chk_1" },
      "alignmentState": "ALIGNED",
      "governanceEvidence": {
        "providerBaselinePresent": true,
        "consumerBaselinePresent": true,
        "providerAttested": true,
        "attestationStale": false,
        "attestationVersion": 1,
        "changePackageId": "pkg_987"
      }
    }
  ]
}
```

---

## Frontend Design

### Component Architecture

- **Path**: `apps/web/src/features/governance/components/SystemBaselineAlignmentSection.tsx`
- **API Client**: `apps/web/src/features/governance/system-baseline-alignment.api.ts`
- **Types**: `apps/web/src/features/governance/system-baseline-alignment.types.ts`
- **Integration Site**: Integrated directly into `apps/web/src/pages/ProjectDetailsPage.tsx` alongside `GovernanceSection` and `ProjectArchitecturePanel`.

### UI Features
- Aggregate Status Badge (`ALIGNED` green, `PARTIALLY_ALIGNED` yellow, `MISALIGNED` red, `ZERO_APPLICABLE_EVIDENCE` neutral).
- Alignment Score gauge & Evidence Completeness progress bar.
- Interactive list of cross-project provider/consumer pairs showing version references, alignment status, and attestation badges.
- Clean handling of loading, error, and empty states.

---

## Performance

- **Bounded Graph Traversal**: Reuses Phase 14 limits (`MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_ALIGNMENT_UNITS = 100`).
- **Bulk Collections Loading**: Loads topology links, relationships, baselines, and attestations using bulk `find({ $in: [...] })` queries to prevent N+1 query overhead.
- **Graph Deduplication**: Tracks visited project and document IDs to handle cyclic topology links cleanly.

---

## Consistency / Concurrency

- Read-only execution.
- Relies on standard MongoDB single-query snapshot consistency across bulk reads.
- No write locks or database transactions required.

---

## Audit Behavior

- **ZERO Audit Writes**: Reading system baseline alignment is a read-only query and produces zero audit log entries.

---

## Authority Boundaries

| Boundary Domain | Authoritative Module | Phase 18 Relationship |
| :--- | :--- | :--- |
| Baseline Lifecycle | Phase 12 (`DocumentationBaseline`) | Read-only consumer of active baselines |
| Topology Links | Phase 14 (`ProjectTopologyLink`) | Read-only consumer of project connectivity |
| Fulfillment Attestations | Phase 17 (`PackageFulfillmentAttestation`) | Read-only consumer of attestation evidence |
| **Cross-Project Alignment** | **Phase 18 (`SystemBaselineAlignment`)** | **Sole Authority for derived multi-project alignment view** |

---

## Test Strategy

Comprehensive test coverage across three tiers:

1. **Unit & Service Tests** (`apps/api/src/modules/governance/system-baseline-alignment.test.ts`):
   - Pure calculation logic test.
   - Dual-metric formula accuracy tests.
   - Attestation selection and staleness tests.

2. **API Controller & Route Tests** (`apps/api/src/modules/governance/system-baseline-alignment.routes.test.ts`):
   - Auth middleware enforcement (401 / 403).
   - Response payload shape validation.

3. **QA Matrix Runner** (`apps/api/src/modules/governance/run_phase18_qa.ts`):
   - Standalone end-to-end integration runner executing 35 mandatory QA scenarios.

---

## QA Scenarios

The Phase 18 QA Matrix Runner (`run_phase18_qa.ts`) executes 35 mandatory scenarios:

1. Aligned provider/consumer baseline (`ALIGNED`).
2. Provider baseline v1 attested (`providerAttested: true`).
3. Provider moves to active v2 (unattested), consumer remains on v1 (`MISALIGNED`).
4. Consumer updated to v2 (`ALIGNED`).
5. Provider version without attestation (`providerAttested: false`).
6. Stale provider attestation (`attestationStale: true`).
7. Missing provider baseline (`INDETERMINATE`).
8. Missing consumer baseline (`INDETERMINATE`).
9. Missing baseline snapshot for specific target doc (`INDETERMINATE`).
10. Topology link exists but no cross-project `DEPENDS_ON` relationship.
11. `DEPENDS_ON` relationship exists without topology link (inapplicable).
12. Multiple `DEPENDS_ON` relationships across projects.
13. Duplicate relationship handling & deduplication.
14. Mixed aligned and misaligned units (`PARTIALLY_ALIGNED`).
15. Aggregate `INDETERMINATE` handling.
16. Zero applicable evidence state (`ZERO_APPLICABLE_EVIDENCE`).
17. READ-authorized user access.
18. Unauthorized connected project (100% omitted from response).
19. Zero privacy leakage (unauthorized project counts = 0).
20. Traversal depth limit enforcement (`MAX_DEPTH = 3`).
21. Node limit enforcement (`MAX_NODES = 50`).
22. Multiple matching attestations selection (highest `attestationVersion` selected).
23. Archived baseline ignored (`isActive: false` filtered).
24. Active baseline constraint verification.
25. Read-only verification (zero DB mutations on GET).
26. Checksum identity vs semantic API compatibility distinction.
27. Phase 14 topology regression check.
28. Phase 17 attestation regression check.
29. Score formula accuracy check ($N_{\text{aligned}} / N_{\text{applicable}}$).
30. Evidence completeness formula accuracy check ($N_{\text{applicable}} / N_{\text{total}}$).
31. Zero applicable units return `alignmentScore = null`.
32. Frontend API client type safety.
33. Frontend component loading state.
34. Frontend component error state.
35. Full end-to-end multi-project alignment workflow.

---

## Implementation File Plan

When authorized, implementation will create/modify the following files:

### New Files to Create:
1. `apps/api/src/modules/governance/system-baseline-alignment.types.ts`
2. `apps/api/src/modules/governance/system-baseline-alignment.service.ts`
3. `apps/api/src/modules/governance/system-baseline-alignment.controller.ts`
4. `apps/api/src/modules/governance/system-baseline-alignment.routes.ts`
5. `apps/api/src/modules/governance/system-baseline-alignment.test.ts`
6. `apps/api/src/modules/governance/run_phase18_qa.ts`
7. `apps/web/src/features/governance/system-baseline-alignment.types.ts`
8. `apps/web/src/features/governance/system-baseline-alignment.api.ts`
9. `apps/web/src/features/governance/components/SystemBaselineAlignmentSection.tsx`

### Files to Modify:
1. `apps/api/src/routes/index.ts` (Mount `systemBaselineAlignmentRouter`)
2. `apps/web/src/pages/ProjectDetailsPage.tsx` (Add `SystemBaselineAlignmentSection`)

---

## Implementation Order

1. **Phase 18.1**: API Types & Schemas (`system-baseline-alignment.types.ts`).
2. **Phase 18.2**: Core Alignment & Evidence Calculation Engine (`system-baseline-alignment.service.ts`).
3. **Phase 18.3**: Express Controller (`system-baseline-alignment.controller.ts`).
4. **Phase 18.4**: Express Router & Mounting (`system-baseline-alignment.routes.ts`, `apps/api/src/routes/index.ts`).
5. **Phase 18.5**: API Unit Tests (`system-baseline-alignment.test.ts`).
6. **Phase 18.6**: Frontend API Client & Types (`system-baseline-alignment.api.ts`, `system-baseline-alignment.types.ts`).
7. **Phase 18.7**: Frontend UI Component (`SystemBaselineAlignmentSection.tsx`).
8. **Phase 18.8**: Frontend Page Integration (`ProjectDetailsPage.tsx`).
9. **Phase 18.9**: Comprehensive QA Matrix Runner (`run_phase18_qa.ts`).
10. **Phase 18.10**: Full Verification & QA Execution.

---

## Risks

| Risk | Impact | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **ACL Information Leakage** | High | High | Reuses `checkUserProjectReadAccess` to strictly filter unauthorized projects before processing. |
| **Large Topology Traversal Overhead** | Medium | Medium | Bounded traversal (`MAX_DEPTH=3`, `MAX_NODES=50`) and bulk MongoDB `find()` queries. |
| **Score Inflation via Missing Evidence** | Medium | Low | Separates `System Alignment Score` from `Evidence Completeness`. Missing baselines reduce completeness. |
| **Attestation Staleness False Positives** | Low | Low | Derives staleness strictly by comparing verified snapshot version/checksum against head `DocumentVersion`. |

---

## Open Questions

1. **Evaluator Gate Policy Integration**: Should Phase 18 alignment state optionally act as a release gate check (`chk_system_baseline_aligned`) in a future sub-phase?
   - *Safest Default*: For Phase 18 v1, alignment is strictly a read-only derived view. Gate integration can be evaluated as an optional enhancement.

2. **Frontend UI Location**: Should the alignment view render inside `ProjectDetailsPage.tsx`?
   - *Safest Default*: Yes, placing `SystemBaselineAlignmentSection` directly under `GovernanceSection` or `ProjectArchitecturePanel` provides immediate visibility.

---

## Verification Gates

Prior to completing Phase 18 implementation, the following gates must pass:
1. `npm run test` passes 100% of API unit tests.
2. `npx tsx apps/api/src/modules/governance/run_phase18_qa.ts` passes all 35 QA scenarios.
3. `git diff --check` returns zero whitespace or formatting errors.
4. Working directory clean and synchronized with `main`.

---

## Final Recommendation

Phase 18 Implementation Plan v1 is **COMPLETE**, grounded in verified codebase mechanics, mathematically rigorous, privacy-safe, and ready for user review and explicit implementation authorization.
