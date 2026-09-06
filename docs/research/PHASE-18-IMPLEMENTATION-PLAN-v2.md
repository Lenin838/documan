# Phase 18 Implementation Plan v2

> **Implementation Planning Checkpoint (v2 Revision)**
>
> **Capability Title**: Cross-Project Baseline Contract Lineage & Attestation Alignment Verification  
> **Status**: PLANNING ONLY — Awaiting Explicit Implementation Authorization  
> **Target Horizon**: Phase 18  
> **Approved Research Reference**: `docs/research/PHASE-18-RESEARCH-v4.md`  
> **Previous Planning Reference**: `docs/research/PHASE-18-IMPLEMENTATION-PLAN-v1.md`  
> **Prerequisites**: Phase 10 (Governance Gates), Phase 12 (Documentation Baselines), Phase 14 (System Topology), Phase 15 (Change Proposals), Phase 16 (Change Packages), Phase 17 (Fulfillment Verification & Immutable Attestation)

---

## Status

**PLANNING ONLY**. This document establishes the revised technical implementation plan for Phase 18 based on verified codebase inspection of Phase 12, Phase 14, and Phase 17 primitives and the approved Phase 18 Research v4.

**DO NOT**:
- Implement Phase 18 application code
- Modify existing Phase 18 research files (`PHASE-18-RESEARCH-v4.md`)
- Modify Phase 17 files
- Create a feature branch
- Update product roadmap (`docs/PRODUCT-ROADMAP.md`)
- Commit, push, or merge
- Execute QA implementation

Execution requires explicit user review and authorization.

---

## Revision From v1

Implementation Plan v2 resolves all critical review feedback from v1:

1. **Consumer Baseline Semantics Proven**: Verified from `apps/api/src/modules/governance/baseline.service.ts` (lines 115–182) that Phase 12 snapshot generation explicitly captures external target documents of cross-project `DEPENDS_ON` relationships. Consumer baselines store the exact `documentId`, `documentVersionId`, `versionNumber`, and `checksum` of external provider documents referenced at consumer baseline creation time.
2. **Explicit Alignment Unit Resolution**: Documented exact resolution steps for Consumer Document, Provider Document, Consumer Active Baseline, and Provider Active Baseline with a concrete example.
3. **Exhaustive Aggregate Truth Table**: Replaced linear precedence list with a rigorous 7-case truth table covering all combinations of `ALIGNED`, `MISALIGNED`, and `INDETERMINATE` units.
4. **Applicability vs Evaluability Distinction**: Introduced formal mathematical definitions for $N_{\text{total}}$, $N_{\text{applicable}}$, $N_{\text{evaluable}}$, $N_{\text{aligned}}$, $N_{\text{misaligned}}$, and $N_{\text{indeterminate}}$. $N_{\text{indeterminate}}$ units explicitly remain in $N_{\text{applicable}}$, preventing missing evidence from inflating the alignment score.
5. **Exact Alignment Score & Evidence Completeness**: Mathematically defensible dual metrics where missing evidence reduces completeness and affects score denominators rather than disappearing.
6. **Phase 17 Attestation & Staleness Alignment**: Grounded attestation resolution and query-time staleness derivation in existing Phase 17 semantics (`change-package-attestation.service.ts`).
7. **Privacy Justification for Change Package ID**: Documented privacy boundary for retaining optional `changePackageId` metadata.
8. **Strict Authority Language**: Defined Phase 18 strictly as a read-only derived engine that does not duplicate or override Phase 12, Phase 14, or Phase 17 authority.
9. **8-Stage Bulk Query Strategy**: Detailed in-memory indexing, batching, and query keys to guarantee zero N+1 database queries.
10. **Frontend UI Placement Resolved**: Confirmed placement of `SystemBaselineAlignmentSection` within `apps/web/src/pages/ProjectDetailsPage.tsx`.

---

## Approved Research Reference

- `docs/research/PHASE-18-RESEARCH-v4.md` (Approved Phase 18 Research)
- `docs/research/PHASE-18-IMPLEMENTATION-PLAN-v1.md` (v1 Implementation Plan)
- Commit Baseline: `e6be79c9fd0e49502b1304629b7e3ea7257f6e93`

---

## Repository Baseline

Inspection of the repository at commit `e6be79c9fd0e49502b1304629b7e3ea7257f6e93` confirms:

- **Local `main`**: `e6be79c9fd0e49502b1304629b7e3ea7257f6e93`
- **`origin/main`**: `e6be79c9fd0e49502b1304629b7e3ea7257f6e93`
- **Working Tree**: Clean (all Phase 17 changes merged via `--no-ff`)

---

## Existing Primitives

Inspection of the codebase confirms six authoritative existing primitives:

1. **`ProjectTopologyLink`** (`apps/api/src/modules/projects/project-topology.model.ts`):
   - Establishes project-level directional topology relationships (`sourceProjectId`, `targetProjectId`, `type`).
   - `type` enum: `'DEPENDS_ON' | 'PROVIDES_API_TO' | 'INTEGRATES_WITH' | 'SHARED_LIBRARY'`.
   - Compound unique index: `{ sourceProjectId: 1, targetProjectId: 1, type: 1 }`.

2. **`DocumentationBaseline`** (`apps/api/src/modules/governance/documentation-baseline.model.ts`):
   - Sole authority for project active baseline snapshots (`projectId`, `name`, `versionTag`, `isActive`, `isArchived`, `documentSnapshots`, `relationshipSnapshots`).
   - Unique partial index: `{ projectId: 1, isActive: 1 } (partialFilterExpression: { isActive: true })`.
   - **Repository Fact**: Enforces **at most ONE active baseline per project**.
   - `documentSnapshots` array elements: `{ documentId, documentVersionId, versionNumber, checksum }`.

3. **`DocumentRelationship`** (`apps/api/src/modules/documents/document-relationship.model.ts`):
   - Directional document relationship links (`sourceDocumentId`, `targetDocumentId`, `type`).
   - `type` enum: `'RELATED' | 'REFERENCES' | 'REPLACES' | 'DEPENDS_ON'`.
   - Unique compound index: `{ sourceDocumentId: 1, targetDocumentId: 1, type: 1 }`.
   - **Repository Fact**: `sourceDocumentId` `DEPENDS_ON` `targetDocumentId` defines that `sourceDocumentId` = Consumer Document and `targetDocumentId` = Provider Document (`document-relationship.service.ts` lines 415–530).

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

### Resolution & Mechanics

For every cross-project `DEPENDS_ON` relationship pair:

1. **Consumer Document ($\text{Doc}_C$)**: Document record corresponding to `sourceDocumentId`. Project is $\text{Project}_C$.
2. **Provider Document ($\text{Doc}_P$)**: Document record corresponding to `targetDocumentId`. Project is $\text{Project}_P$.
3. **Provider Active Baseline ($\text{Base}_P$)**: Active baseline for $\text{Project}_P$ (`isActive: true, isArchived: false`). Contains `documentSnapshots` entry for $\text{Doc}_P$ with active provider version reference $(V_{P,\text{active}}, C_{P,\text{active}})$.
4. **Consumer Active Baseline ($\text{Base}_C$)**: Active baseline for $\text{Project}_C$ (`isActive: true, isArchived: false`). In Phase 12 (`baseline.service.ts` lines 115–182), baseline creation captures snapshots for both in-project documents and external `DEPENDS_ON` target documents. Thus, $\text{Base}_C$ contains a `documentSnapshots` entry for $\text{Doc}_P$ with consumer's recorded version reference $(V_{P,\text{ref}}, C_{P,\text{ref}})$.

### Concrete Resolution Example

- **Consumer**: Project `Payment Gateway` ($\text{Project}_C$), Document `Payment Guide` ($\text{Doc}_C$).
- **Provider**: Project `Auth Service` ($\text{Project}_P$), Document `Auth Spec` ($\text{Doc}_P$).
- **Relationship**: $\text{Doc}_C$ `DEPENDS_ON` $\text{Doc}_P$.
- **Active Provider Baseline ($\text{Base}_P$)**: Contains snapshot for $\text{Doc}_P$ with `versionNumber = 2`, `checksum = "chk_v2"`, `documentVersionId = ver_p2`.
- **Active Consumer Baseline ($\text{Base}_C$)**: Contains snapshot for $\text{Doc}_P$ with `versionNumber = 1`, `checksum = "chk_v1"`, `documentVersionId = ver_p1`.
- **Comparison**: Compare $\text{Base}_C$'s snapshot for $\text{Doc}_P$ ($v1$) against $\text{Base}_P$'s snapshot for $\text{Doc}_P$ ($v2$).
- **Result**: `MISALIGNED` (Consumer expected/captured $v1$, but Provider active baseline is $v2$).

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

- Phase 12 snapshot generation (`baseline.service.ts` lines 115–182) captures external `DEPENDS_ON` target documents into the baseline's `documentSnapshots` array.
- The consumer baseline's `documentSnapshots` array is inspected for an entry matching `documentId === Doc_provider._id`.
- This yields the consumer's recorded provider snapshot version ($\text{Version}_{\text{consumer\_ref}}$) and checksum ($\text{Checksum}_{\text{consumer\_ref}}$).
- If $\text{Base}_C$ exists but lacks a snapshot entry for $\text{Doc}_P$ (e.g. relationship added post-baseline), `consumerSnapshotPresent = false` and the unit evaluates to `INDETERMINATE` (`MISSING_CONSUMER_SNAPSHOT`).

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

Phase 17 `PackageFulfillmentAttestation` records post-acceptance package fulfillment verification (`change-package-attestation.service.ts`).

### Resolution Algorithm
For a provider document version $(\text{documentId}, \text{documentVersionId}, \text{checksum})$ in the active provider baseline:
1. Query `PackageFulfillmentAttestation` where `verifiedVersionSnapshot` contains an entry matching `documentId` AND (`documentVersionId` OR `checksum`).
2. If multiple matching attestations exist across change packages or re-attestations, select the attestation record with the **highest `attestationVersion`** (most recent attestation).
3. If a matching attestation is found: `providerAttested = true`, `attestationVersion = attestation.attestationVersion`, `changePackageId = attestation.changePackageId`.
4. If no matching attestation is found: `providerAttested = false`.

---

## Staleness Handling

Reusing Phase 17 staleness logic (`change-package-attestation.service.ts` lines 547–564):

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
  consumerSnapshotPresent: boolean;
  providerAttested: boolean;
  attestationStale: boolean;
  attestationVersion?: number | null;
  changePackageId?: string | null;
  attestedAt?: Date | null;
}
```

---

## Applicability vs Evaluability

To ensure 100% mathematical rigor, Phase 18 strictly defines six population metrics:

- $N_{\text{total}}$: Total cross-project `DEPENDS_ON` relationship pairs connecting projects in the caller's authorized topology subgraph.
- $N_{\text{applicable}}$: Count of authorized cross-project `DEPENDS_ON` units where an active `ProjectTopologyLink` connects the consumer and provider projects.
- $N_{\text{evaluable}}$: Count of applicable units where required baseline and snapshot data exist for both consumer and provider ($N_{\text{evaluable}} = N_{\text{aligned}} + N_{\text{misaligned}}$).
- $N_{\text{aligned}}$: Count of evaluable units where `alignmentState === 'ALIGNED'`.
- $N_{\text{misaligned}}$: Count of evaluable units where `alignmentState === 'MISALIGNED'`.
- $N_{\text{indeterminate}}$: Count of applicable units where required baseline/snapshot data is missing ($N_{\text{indeterminate}} = N_{\text{applicable}} - N_{\text{evaluable}}$).

> [!IMPORTANT]
> **Denominator Invariant**: $N_{\text{indeterminate}}$ units **REMAIN IN $N_{\text{applicable}}$**. Missing evidence MUST NOT disappear from the denominator. If a system has 8 Aligned units and 2 Indeterminate units ($N_{\text{applicable}} = 10$), the score is $\frac{8}{10} \times 100 = 80.0\%$, NOT $\frac{8}{8} = 100\%$.

---

## Aggregate State

The aggregate system alignment state is determined deterministically from unit evaluation results.

---

## Aggregate Truth Table

The system-level aggregate state is assigned according to the following exhaustive truth table:

| Case | $N_{\text{applicable}}$ | $N_{\text{aligned}}$ | $N_{\text{misaligned}}$ | $N_{\text{indeterminate}}$ | Aggregate State | System Alignment Score | Evidence Completeness |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Case A** | $0$ | $0$ | $0$ | $0$ | `ZERO_APPLICABLE_EVIDENCE` | `null` | `null` |
| **Case B** | $> 0$ | $= N_{\text{applicable}}$ | $0$ | $0$ | `ALIGNED` | $100.0\%$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ |
| **Case C** | $> 0$ | $> 0$ | $> 0$ | $0$ | `PARTIALLY_ALIGNED` | $\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ |
| **Case D** | $> 0$ | $> 0$ | $0$ | $> 0$ | `PARTIALLY_ALIGNED` | $\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ |
| **Case E** | $> 0$ | $0$ | $> 0$ | $\ge 0$ | `MISALIGNED` | $0.0\%$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ |
| **Case F** | $> 0$ | $> 0$ | $> 0$ | $> 0$ | `PARTIALLY_ALIGNED` | $\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ |
| **Case G** | $> 0$ | $0$ | $0$ | $= N_{\text{applicable}}$ | `INDETERMINATE` | $0.0\%$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ |

---

## Alignment Score

$$\text{System Alignment Score} = \left( \frac{N_{\text{aligned}}}{N_{\text{applicable}}} \right) \times 100$$

- **Denominator**: $N_{\text{applicable}}$ (includes $N_{\text{aligned}} + N_{\text{misaligned}} + N_{\text{indeterminate}}$).
- **Unit Contributions**:
  - `ALIGNED`: +1 to $N_{\text{aligned}}$, +1 to $N_{\text{applicable}}$.
  - `MISALIGNED`: +0 to $N_{\text{aligned}}$, +1 to $N_{\text{applicable}}$.
  - `INDETERMINATE`: +0 to $N_{\text{aligned}}$, +1 to $N_{\text{applicable}}$.
- If $N_{\text{applicable}} == 0$: `alignmentScore = null`.

---

## Evidence Completeness

$$\text{Evidence Completeness} = \left( \frac{N_{\text{applicable}}}{N_{\text{total}}} \right) \times 100$$

- $N_{\text{total}}$ = Count of cross-project `DEPENDS_ON` relationship pairs connecting projects within the caller's authorized topology subgraph.
- Does NOT count unauthorized projects or hidden topology nodes.
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
- **`changePackageId` Privacy**: Retained in `governanceEvidence` only when the user is authorized to read the project owning the attestation (guaranteed because alignment units require `READ` access to both consumer and provider projects).

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
  "evaluatedAt": "2026-09-06T10:30:00.000Z",
  "aggregateState": "PARTIALLY_ALIGNED",
  "alignmentScore": 50.0,
  "evidenceCompleteness": 100.0,
  "summary": {
    "totalUnits": 2,
    "applicableUnits": 2,
    "evaluableUnits": 2,
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
        "consumerSnapshotPresent": true,
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

### Component Architecture & Placement

- **Path**: `apps/web/src/features/governance/components/SystemBaselineAlignmentSection.tsx`
- **API Client**: `apps/web/src/features/governance/system-baseline-alignment.api.ts`
- **Types**: `apps/web/src/features/governance/system-baseline-alignment.types.ts`
- **Integration Site**: Rendered inside `apps/web/src/pages/ProjectDetailsPage.tsx` directly after `GovernanceSection` and `ProjectArchitecturePanel`.

### UI Specifications
- Read-only, non-editable governance card (zero canvas/editor controls).
- Aggregate Status Badge (`ALIGNED` green, `PARTIALLY_ALIGNED` yellow, `MISALIGNED` red, `INDETERMINATE` purple, `ZERO_APPLICABLE_EVIDENCE` neutral).
- Alignment Score gauge & Evidence Completeness progress bar.
- Interactive list of cross-project provider/consumer pairs showing version references, alignment status, and attestation badges.
- Clean handling of loading, error, and empty states.

---

## Performance

- **Bounded Graph Traversal**: Reuses Phase 14 limits (`MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_ALIGNMENT_UNITS = 100`).
- **Memory Map Lookups**: All entity cross-referencing performed in memory via $O(1)$ Hash Maps.
- **Graph Deduplication**: Tracks visited project and document IDs to handle cyclic topology links cleanly.

---

## Bulk Query Strategy

To guarantee zero N+1 database queries, Phase 18 follows an 8-stage bulk loading pipeline:

1. **Stage 1**: Fetch topology links connected to target project: `ProjectTopologyLink.find({ $or: [{ sourceProjectId: projId }, { targetProjectId: projId }] })`.
2. **Stage 2**: Filter authorized connected project IDs via `checkUserProjectReadAccess` into `authorizedProjectIds` Set.
3. **Stage 3**: Bulk fetch documents in authorized projects: `Document.find({ projectId: { $in: Array.from(authorizedProjectIds) }, isDeleted: false })`.
4. **Stage 4**: Bulk fetch cross-project `DEPENDS_ON` relationships: `DocumentRelationship.find({ sourceDocumentId: { $in: docIds }, targetDocumentId: { $in: docIds }, type: 'DEPENDS_ON' })`.
5. **Stage 5**: Bulk fetch active baselines for authorized projects: `DocumentationBaseline.find({ projectId: { $in: Array.from(authorizedProjectIds) }, isActive: true, isArchived: false })`. Build in-memory `baselineByProjectMap`.
6. **Stage 6**: Bulk fetch head versions for provider documents: `DocumentVersion.find({ documentId: { $in: providerDocIds } }).sort({ versionNumber: -1 })`. Build `latestVersionMap`.
7. **Stage 7**: Bulk fetch matching attestations: `PackageFulfillmentAttestation.find({ "verifiedVersionSnapshot.documentId": { $in: providerDocIds } })`. Build `attestationsByDocMap`.
8. **Stage 8**: Iterate over authorized cross-project `DEPENDS_ON` relationships in memory to compute unit states, aggregate truth table, alignment score, and evidence metrics.

---

## Consistency / Concurrency

- Read-only execution over MongoDB collections.
- Relies on standard MongoDB single-query snapshot consistency per bulk fetch.
- If a baseline or attestation is modified concurrently during calculation, the service processes the bulk data as retrieved.
- No database transactions or write locks are introduced for read queries, preventing performance bottlenecks.

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
| **Cross-Project Alignment** | **Phase 18 (`SystemBaselineAlignment`)** | **Sole Authority for derived multi-project alignment calculation** |

---

## Test Strategy

Comprehensive test coverage across three tiers:

1. **Unit & Service Tests** (`apps/api/src/modules/governance/system-baseline-alignment.test.ts`):
   - Pure calculation logic tests.
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

1. Aligned provider/consumer baseline references (`ALIGNED`).
2. Provider v1 → v2 evolution (provider updates active baseline to v2).
3. Consumer still references v1 (`MISALIGNED`).
4. Consumer updated to v2 (`ALIGNED`).
5. Provider v2 unattested (`providerAttested: false`).
6. Stale provider attestation (`attestationStale: true`).
7. Multiple matching attestations (highest `attestationVersion` selected).
8. Missing provider baseline (`INDETERMINATE`).
9. Missing consumer baseline (`INDETERMINATE`).
10. Missing required snapshot entry in consumer baseline (`INDETERMINATE`).
11. Topology link exists but no `DEPENDS_ON` relationship (0 applicable).
12. `DEPENDS_ON` relationship exists without active topology link (inapplicable).
13. Multiple `DEPENDS_ON` relationship pairs.
14. Duplicate relationship handling & deduplication.
15. Mixed aligned and misaligned units (`PARTIALLY_ALIGNED`).
16. Aligned + Indeterminate units (`PARTIALLY_ALIGNED`, score denominator includes indeterminate).
17. Misaligned + Indeterminate units (`MISALIGNED`, score = 0%).
18. All indeterminate units (`INDETERMINATE`, score = 0%).
19. Zero applicable evidence state (`ZERO_APPLICABLE_EVIDENCE`, score = null).
20. Score denominator correctness ($N_{\text{applicable}}$ denominator invariant).
21. Evidence completeness denominator correctness ($N_{\text{total}}$ authorized count).
22. Unauthorized connected project (100% omitted from response).
23. No privacy/count leakage (unauthorized project counts = 0).
24. Traversal depth limit enforcement (`MAX_DEPTH = 3`).
25. Node limit enforcement (`MAX_NODES = 50`).
26. Alignment-unit limit enforcement (`MAX_ALIGNMENT_UNITS = 100`).
27. Archived baseline ignored (`isActive: false` filtered).
28. Active baseline uniqueness constraint verification.
29. Checksum identity vs semantic compatibility distinction.
30. Read-only verification (zero DB mutations on GET).
31. Phase 14 topology regression check.
32. Phase 17 attestation regression check.
33. Frontend aligned state rendering.
34. Frontend mixed/indeterminate state rendering.
35. Frontend empty/error state rendering.

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
| **Large Topology Traversal Overhead** | Medium | Medium | Bounded traversal (`MAX_DEPTH=3`, `MAX_NODES=50`) and 8-stage bulk MongoDB `find()` queries. |
| **Score Inflation via Missing Evidence** | Medium | Low | $N_{\text{indeterminate}}$ units remain in $N_{\text{applicable}}$ denominator. Missing evidence reduces completeness and score. |
| **Attestation Staleness False Positives** | Low | Low | Derives staleness strictly by comparing verified snapshot version/checksum against head `DocumentVersion`. |

---

## Open Questions

1. **Evaluator Gate Policy Integration**: Should Phase 18 alignment state optionally act as a release gate check (`chk_system_baseline_aligned`) in a future sub-phase?
   - *Safest Default*: For Phase 18 v1, alignment is strictly a read-only derived view. Gate policy integration can be evaluated as a future enhancement upon request.

---

## Verification Gates

Prior to completing Phase 18 implementation, the following gates must pass:
1. `npm run test` passes 100% of API unit tests.
2. `npx tsx apps/api/src/modules/governance/run_phase18_qa.ts` passes all 35 QA scenarios.
3. `git diff --check` returns zero whitespace or formatting errors.
4. Working directory clean and synchronized with `main`.

---

## Final Recommendation

Phase 18 Implementation Plan v2 is **COMPLETE**, thoroughly verified against repository code mechanics, mathematically defensible, privacy-safe, and ready for user review and explicit implementation authorization.
