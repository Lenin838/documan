# Phase 18 Implementation Plan v3

> **Implementation Planning Checkpoint (v3 Final Revision)**
>
> **Capability Title**: Cross-Project Baseline Contract Lineage & Attestation Alignment Verification  
> **Status**: PLANNING ONLY — Awaiting Explicit Implementation Authorization  
> **Target Horizon**: Phase 18  
> **Approved Research Reference**: `docs/research/PHASE-18-RESEARCH-v4.md`  
> **Previous Planning References**: `docs/research/PHASE-18-IMPLEMENTATION-PLAN-v1.md`, `docs/research/PHASE-18-IMPLEMENTATION-PLAN-v2.md`  
> **Prerequisites**: Phase 10 (Governance Gates), Phase 12 (Documentation Baselines), Phase 14 (System Topology), Phase 15 (Change Proposals), Phase 16 (Change Packages), Phase 17 (Fulfillment Verification & Immutable Attestation)

---

## Status

**PLANNING ONLY**. This document establishes the finalized technical implementation plan for Phase 18 based on verified codebase inspection of Phase 12, Phase 14, and Phase 17 primitives and the approved Phase 18 Research v4.

**DO NOT**:
- Implement Phase 18 application code
- Modify existing Phase 18 research files (`PHASE-18-RESEARCH-v4.md`)
- Modify Phase 17 artifacts
- Create a feature branch
- Update product roadmap (`docs/PRODUCT-ROADMAP.md`)
- Commit, push, or merge
- Execute QA implementation

Execution requires explicit user review and authorization.

---

## Revision From v2

Implementation Plan v3 resolves all final planning corrections from v2 review:

1. **Indeterminate Evidence Never Hidden**: Replaced aggregate state assignment so that ANY presence of `INDETERMINATE` units forces `aggregateState = INDETERMINATE`. `PARTIALLY_ALIGNED` is used exclusively for purely evaluable mixtures (`ALIGNED` + `MISALIGNED` with zero `INDETERMINATE`).
2. **Explicit Aggregate Counts**: Added `alignedCount`, `misalignedCount`, and `indeterminateCount` to summary and response payload so aggregate state is never the sole information source.
3. **Formal Population Pipeline**: Explicitly defined the 5-tier pipeline from Authorized Topology down to Evaluated Unit States, establishing the invariant $N_{\text{applicable}} = N_{\text{aligned}} + N_{\text{misaligned}} + N_{\text{indeterminate}}$.
4. **Evaluability vs Applicability Invariant**: Established $N_{\text{evaluable}} = N_{\text{aligned}} + N_{\text{misaligned}} \le N_{\text{applicable}}$. Alignment score uses $N_{\text{applicable}}$ strictly as the denominator, so missing evidence cannot inflate scores (e.g. 8 aligned / 2 indeterminate → $80.0\%$ score, `INDETERMINATE` aggregate state).
5. **Exact Population Denominator for Evidence Completeness**: Defined $N_{\text{total}}$ strictly over the caller's authorized topology subgraph, excluding unauthorized entities before count calculation.
6. **Corrected Authority Language**: Updated authority statement to clarify that Phase 18 is the authoritative derived calculation for cross-project baseline alignment while preserving underlying Phase 12, Phase 14, and Phase 17 authorities.
7. **Expanded QA Matrix**: Expanded QA Matrix to 38 scenarios, explicitly testing all truth-table cases, denominator invariants, and zero count leakage.

---

## Approved Research Reference

- `docs/research/PHASE-18-RESEARCH-v4.md` (Approved Phase 18 Research)
- `docs/research/PHASE-18-IMPLEMENTATION-PLAN-v2.md` (v2 Implementation Plan)
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

## Population Pipeline

The data population evaluation flows strictly through a 5-tier pipeline:

```
1. AUTHORIZED TOPOLOGY
   (Projects accessible to the caller via checkUserProjectReadAccess)
        ↓
2. AUTHORIZED CROSS-PROJECT DEPENDS_ON RELATIONSHIPS
   (DocumentRelationship pairs connecting authorized projects) → N_total
        ↓
3. ALIGNMENT UNITS
   (Candidate document pairs with DEPENDS_ON relationship)
        ↓
4. APPLICABLE UNITS
   (Alignment units where active ProjectTopologyLink requirement is satisfied) → N_applicable
        ↓
5. EVALUATED UNIT STATES
   (Unit state assigned: ALIGNED, MISALIGNED, or INDETERMINATE) → N_aligned, N_misaligned, N_indeterminate
```

---

## Applicability vs Evaluability

To ensure 100% mathematical rigor, Phase 18 strictly defines six population metrics:

- $N_{\text{total}}$: Total authorized cross-project `DEPENDS_ON` relationship pairs connecting projects in the caller's authorized topology subgraph.
- $N_{\text{applicable}}$: All authorized cross-project `DEPENDS_ON` alignment units for which the active `ProjectTopologyLink` requirement is satisfied.
- $N_{\text{evaluable}}$: Count of applicable units where required baseline and snapshot data exist for both consumer and provider ($N_{\text{evaluable}} = N_{\text{aligned}} + N_{\text{misaligned}}$).
- $N_{\text{aligned}}$: Count of evaluable units where `alignmentState === 'ALIGNED'`.
- $N_{\text{misaligned}}$: Count of evaluable units where `alignmentState === 'MISALIGNED'`.
- $N_{\text{indeterminate}}$: Count of applicable units where required baseline/snapshot data is missing ($N_{\text{indeterminate}} = N_{\text{applicable}} - N_{\text{evaluable}}$).

### Invariants

1. **Denominator Invariant**: $N_{\text{applicable}} = N_{\text{aligned}} + N_{\text{misaligned}} + N_{\text{indeterminate}}$.
2. **Evaluability Invariant**: $N_{\text{evaluable}} = N_{\text{aligned}} + N_{\text{misaligned}} \le N_{\text{applicable}}$.

> [!IMPORTANT]
> **Score Calculation Invariant**: The System Alignment Score is calculated strictly using $N_{\text{applicable}}$ as the denominator ($\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$). $N_{\text{evaluable}}$ is NEVER used as the alignment score denominator. Missing evidence ($N_{\text{indeterminate}}$) remains in the denominator.

---

## Aggregate State

The aggregate system alignment state is determined deterministically from unit evaluation counts according to the following strict rule:

- If $N_{\text{applicable}} == 0$: Aggregate state is **`ZERO_APPLICABLE_EVIDENCE`**.
- If $N_{\text{indeterminate}} > 0$: Aggregate state is **`INDETERMINATE`** (Indeterminate evidence is NEVER hidden behind `PARTIALLY_ALIGNED`).
- Otherwise (when $N_{\text{indeterminate}} == 0$):
  - If 100% of applicable units are `ALIGNED` ($N_{\text{aligned}} == N_{\text{applicable}}$): Aggregate state is **`ALIGNED`**.
  - If 100% of applicable units are `MISALIGNED` ($N_{\text{misaligned}} == N_{\text{applicable}}$): Aggregate state is **`MISALIGNED`**.
  - If at least one unit is `ALIGNED` and at least one unit is `MISALIGNED`: Aggregate state is **`PARTIALLY_ALIGNED`**.

---

## Aggregate Truth Table

The system-level aggregate state, score, completeness, and counts are evaluated according to this exhaustive truth table:

| Case | $N_{\text{applicable}}$ | $N_{\text{aligned}}$ | $N_{\text{misaligned}}$ | $N_{\text{indeterminate}}$ | Aggregate State | System Alignment Score | Evidence Completeness | `alignedCount` | `misalignedCount` | `indeterminateCount` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Case A** | $0$ | $0$ | $0$ | $0$ | `ZERO_APPLICABLE_EVIDENCE` | `null` | `null` (or $0\%$) | $0$ | $0$ | $0$ |
| **Case B** | $> 0$ | $= N_{\text{applicable}}$ | $0$ | $0$ | `ALIGNED` | $100.0\%$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ | $N_{\text{aligned}}$ | $0$ | $0$ |
| **Case C** | $> 0$ | $> 0$ | $> 0$ | $0$ | `PARTIALLY_ALIGNED` | $\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ | $N_{\text{aligned}}$ | $N_{\text{misaligned}}$ | $0$ |
| **Case D** | $> 0$ | $> 0$ | $0$ | $> 0$ | `INDETERMINATE` | $\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ | $N_{\text{aligned}}$ | $0$ | $N_{\text{indeterminate}}$ |
| **Case E** | $> 0$ | $0$ | $> 0$ | $> 0$ | `INDETERMINATE` | $0.0\%$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ | $0$ | $N_{\text{misaligned}}$ | $N_{\text{indeterminate}}$ |
| **Case F** | $> 0$ | $> 0$ | $> 0$ | $> 0$ | `INDETERMINATE` | $\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ | $N_{\text{aligned}}$ | $N_{\text{misaligned}}$ | $N_{\text{indeterminate}}$ |
| **Case G** | $> 0$ | $0$ | $0$ | $= N_{\text{applicable}}$ | `INDETERMINATE` | $0.0\%$ | $\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$ | $0$ | $0$ | $N_{\text{indeterminate}}$ |

> [!IMPORTANT]
> **Example (Case D)**: 10 applicable units, 8 aligned, 0 misaligned, 2 indeterminate.
> - `alignmentScore` = $\frac{8}{10} \times 100 = 80.0\%$ (NOT 100%).
> - `aggregateState` = **`INDETERMINATE`** (Indeterminate evidence is explicitly visible and is NOT masked as `PARTIALLY_ALIGNED`).
> - Counts: `alignedCount = 8`, `misalignedCount = 0`, `indeterminateCount = 2`.

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
- Inaccessible projects/entities are excluded BEFORE calculating $N_{\text{total}}$.
- If $N_{\text{total}} == 0$: `evidenceCompleteness = null`.

---

## Zero Applicable Evidence

When zero applicable units exist ($N_{\text{applicable}} == 0$):
- `aggregateState = 'ZERO_APPLICABLE_EVIDENCE'`
- `alignmentScore = null`
- `evidenceCompleteness = null`
- `alignedCount = 0`, `misalignedCount = 0`, `indeterminateCount = 0`.
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
- **Zero Count Leakage**: $N_{\text{total}}$, $N_{\text{applicable}}$, $N_{\text{aligned}}$, $N_{\text{misaligned}}$, and $N_{\text{indeterminate}}$ are calculated **strictly over the user's authorized subgraph**.
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
  "evaluatedAt": "2026-09-06T10:35:00.000Z",
  "aggregateState": "INDETERMINATE",
  "alignmentScore": 80.0,
  "evidenceCompleteness": 100.0,
  "summary": {
    "totalUnits": 10,
    "applicableUnits": 10,
    "evaluableUnits": 8,
    "alignedUnits": 8,
    "misalignedUnits": 0,
    "indeterminateUnits": 2
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
- Explicit summary counters (`alignedCount`, `misalignedCount`, `indeterminateCount`).
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

> Phase 18 is the authoritative derived calculation for cross-project baseline alignment, while Phase 12, Phase 14, and Phase 17 remain authoritative for their respective underlying primitives.

| Boundary Domain | Authoritative Module | Phase 18 Relationship |
| :--- | :--- | :--- |
| Baseline Lifecycle | Phase 12 (`DocumentationBaseline`) | Read-only consumer of active baselines |
| Topology Links | Phase 14 (`ProjectTopologyLink`) | Read-only consumer of project connectivity |
| Fulfillment Attestations | Phase 17 (`PackageFulfillmentAttestation`) | Read-only consumer of attestation evidence |
| **Cross-Project Alignment** | **Phase 18 (`SystemBaselineAlignment`)** | **Authoritative derived calculation for cross-project baseline alignment** |

Phase 18 must not mutate or replace any underlying authority.

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
   - Standalone end-to-end integration runner executing 38 mandatory QA scenarios.

---

## QA Scenarios

The Phase 18 QA Matrix Runner (`run_phase18_qa.ts`) executes 38 mandatory scenarios:

1. **All Aligned (Truth Table Case B)**: 100% aligned units → `aggregateState = ALIGNED`, score = 100%.
2. **Aligned + Misaligned (Truth Table Case C)**: Mixed evaluable units → `aggregateState = PARTIALLY_ALIGNED`, score = $\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$.
3. **Aligned + Indeterminate (Truth Table Case D)**: `aggregateState = INDETERMINATE`.
4. **Misaligned + Indeterminate (Truth Table Case E)**: `aggregateState = INDETERMINATE`.
5. **Aligned + Misaligned + Indeterminate (Truth Table Case F)**: `aggregateState = INDETERMINATE`.
6. **All Indeterminate (Truth Table Case G)**: `aggregateState = INDETERMINATE`, score = 0%.
7. **Zero Applicable (Truth Table Case A)**: $N_{\text{applicable}} = 0 \to \text{aggregateState} = \text{ZERO\_APPLICABLE\_EVIDENCE}$, score = null.
8. **10 Applicable / 8 Aligned / 0 Misaligned / 2 Indeterminate**: Produces score = $80.0\%$, aggregateState = `INDETERMINATE` (Indeterminate evidence not hidden behind `PARTIALLY_ALIGNED`).
9. **Missing evidence remains in denominator**: Verifies $N_{\text{applicable}} = N_{\text{aligned}} + N_{\text{misaligned}} + N_{\text{indeterminate}}$.
10. **Unauthorized population excluded without count leakage**: Unauthorized projects excluded before calculating $N_{\text{total}}$ and $N_{\text{applicable}}$.
11. **$N_{\text{applicable}}$ invariant check**: Confirms $N_{\text{applicable}} = N_{\text{aligned}} + N_{\text{misaligned}} + N_{\text{indeterminate}}$.
12. **$N_{\text{evaluable}}$ invariant check**: Confirms $N_{\text{evaluable}} = N_{\text{aligned}} + N_{\text{misaligned}} \le N_{\text{applicable}}$.
13. **Aggregate counts equal unit-state counts**: `alignedCount`, `misalignedCount`, and `indeterminateCount` accurately reflect unit states.
14. **No mutation verification**: Confirms ZERO database writes during calculation.
15. Aligned provider/consumer baseline references.
16. Provider v1 → v2 evolution (provider updates active baseline to v2).
17. Consumer still references v1 (`MISALIGNED`).
18. Consumer updated to v2 (`ALIGNED`).
19. Provider v2 unattested (`providerAttested: false`).
20. Stale provider attestation (`attestationStale: true`).
21. Multiple matching attestations (highest `attestationVersion` selected).
22. Missing provider baseline (`INDETERMINATE`).
23. Missing consumer baseline (`INDETERMINATE`).
24. Missing required snapshot entry in consumer baseline (`INDETERMINATE`).
25. Topology link exists but no `DEPENDS_ON` relationship (0 applicable).
26. `DEPENDS_ON` relationship exists without active topology link (inapplicable).
27. Multiple `DEPENDS_ON` relationship pairs.
28. Duplicate relationship handling & deduplication.
29. READ-authorized user access.
30. Unauthorized connected project (100% omitted from response).
31. Traversal depth limit enforcement (`MAX_DEPTH = 3`).
32. Node limit enforcement (`MAX_NODES = 50`).
33. Alignment-unit limit enforcement (`MAX_ALIGNMENT_UNITS = 100`).
34. Archived baseline ignored (`isActive: false` filtered).
35. Active baseline uniqueness constraint verification.
36. Checksum identity vs semantic compatibility distinction.
37. Phase 14 topology regression check.
38. Phase 17 attestation regression check.

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
2. `npx tsx apps/api/src/modules/governance/run_phase18_qa.ts` passes all 38 QA scenarios.
3. `git diff --check` returns zero whitespace or formatting errors.
4. Working directory clean and synchronized with `main`.

---

## Final Recommendation

Phase 18 Implementation Plan v3 is **FINAL & COMPLETE**, fully resolved against repository code mechanics, mathematically rigorous, privacy-safe, and ready for user review and explicit implementation authorization.
