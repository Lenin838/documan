# Phase 25 Implementation Plan v2 — Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer

> **Approved Research Plan**: [`docs/research/PHASE-25-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-25-RESEARCH.md)  
> **Plan v1 Reference**: [`docs/research/PHASE-25-IMPLEMENTATION-PLAN-v1.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-25-IMPLEMENTATION-PLAN-v1.md)  
> **Target Feature**: Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer  
> **Status**: PLAN ONLY (No implementation code, no feature branch, no commits)  

---

## 1. Executive Summary

Phase 25 introduces the **Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer**, an end-to-end, read-only, request-scoped matrix engine that derives an $N \times N$ project contract compatibility grid across all authorized projects in a system topology graph.

Plan v2 incorporates four critical architectural corrections over Plan v1:
1. **Deterministic State Precedence Hierarchy**: Resolves overlapping state conditions (e.g., simultaneous baseline misalignment and breaking schema changes) through a strict 6-tier precedence hierarchy.
2. **Explicit Taxonomy for Absent Dependencies vs. Missing Contracts**: Distinguishes between absent topological contract dependencies, missing provider contract documents, unsupported non-OpenAPI prose, and evaluable contracts.
3. **Relationship-Driven Analysis Engine**: Establishes that the $N \times N$ UI grid is a presentation model derived from a bounded, relationship-driven graph analysis—never an arbitrary cross-product comparison of unrelated projects.
4. **Authoritative Comparison Anchor**: Formally grounds contract diffing between the Consumer's active baseline target snapshot reference (Consumer Anchor) and the Provider's active baseline snapshot content (Provider Anchor), preventing historical version contamination.

The engine operates with **0 new database models**, **0 background workers**, **0 audit log writes on GET queries**, and **0 external AI/LLM dependencies**.

---

## 2. Research Basis

The implementation plan is grounded in [`docs/research/PHASE-25-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-25-RESEARCH.md):
- **Candidate Selected**: Candidate 4 (Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer)
- **Research Approval**: Approved with four explicit architectural corrections.
- **Maturity Goal**: Completes Documan's Cross-Project Architecture capability suite.

---

## 3. Repository Evidence

**REPOSITORY FACT**: Source-code inspection confirms:
1. **Phase 14 Topology & Access Authority**:
   - `ProjectTopologyLink` in [`apps/api/src/modules/projects/project-topology.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.model.ts) models directional project links (`DEPENDS_ON`, `PROVIDES_API_TO`, `INTEGRATES_WITH`, `SHARED_LIBRARY`).
   - `checkUserProjectReadAccess(userId, role, projectId)` in [`apps/api/src/modules/projects/project-topology.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.service.ts) validates caller read authorization for a target project.
2. **Phase 18 Baseline Alignment Authority**:
   - `calculateSystemBaselineAlignment(userId, role, projectId)` in [`apps/api/src/modules/governance/system-baseline-alignment.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-baseline-alignment.service.ts) evaluates baseline snapshot alignment over cross-project `DocumentRelationship` records (`DEPENDS_ON`).
3. **Phase 23 Contract Evolution Authority**:
   - `compareContractVersions(contentA, contentB)` and `detectContractEvolutionDeltas` in [`apps/api/src/modules/governance/system-contract-evolution.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-evolution.service.ts) parse OpenAPI specifications (`parseOpenApiSpecification`) and compute 7 structural delta types (`ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_ADDED`).
4. **Phase 24 Traceability Authority**:
   - `system-traceability-audit.service.ts` provides single-document gap auditing and permission-safe DTO structures.

---

## 4. Product Gap

While Phase 14 maps directional topology graphs, Phase 18 checks single root-to-dependency alignment trees, and Phase 23 diffs two versions of a contract, **Documan currently lacks an all-to-all $N \times N$ cross-project contract compatibility matrix**. 

System leaders cannot answer:
> *"Across all $N$ authorized projects in our system topology, what is the pair-wise contract compatibility grid, and which project-to-project integration paths contain active structural contract mismatches or breaking schema changes?"*

Phase 25 directly resolves this product gap.

---

## 5. Exact Product Question

Phase 25 must answer:
> **"Across the authorized system topology, where are cross-project technical contracts structurally aligned, structurally misaligned, breaking, missing, or indeterminate?"**

**CRITICAL SEMANTIC BOUNDARY (INFERENCE)**: Phase 25 evaluates **structural contract alignment** and **canonical schema matching**. It does **NOT** claim to prove universal "semantic interoperability" of live software components.
```text
VERSION IDENTITY ≠ CHECKSUM MATCHING ≠ BASELINE ALIGNMENT ≠ SEMANTIC COMPATIBILITY
```

---

## 6. Analysis Unit

The primary unit of analysis is a **Directional Authorized Project Pair Tuple**:
$$\text{Analysis Unit} = \langle P_{\text{consumer}}, P_{\text{provider}}, L_{\text{topology}}, R_{\text{contract}}, C_{\text{consumer\_anchor}}, C_{\text{provider\_anchor}} \rangle$$

Where:
- $P_{\text{consumer}}$: Authorized Consumer Project (Row $i$)
- $P_{\text{provider}}$: Authorized Provider Project (Column $j$)
- $L_{\text{topology}}$: Active `ProjectTopologyLink` between $P_{\text{consumer}}$ and $P_{\text{provider}}$ (if any)
- $R_{\text{contract}}$: Active cross-project `DocumentRelationship` (`type === 'DEPENDS_ON'`) between documents in $P_{\text{consumer}}$ and $P_{\text{provider}}$ (if any)
- $C_{\text{consumer\_anchor}}$: Referenced Provider document version/checksum snapshot in $P_{\text{consumer}}$'s active baseline
- $C_{\text{provider\_anchor}}$: Authoritative Provider document version/checksum in $P_{\text{provider}}$'s active baseline

---

## 7. Contract State Taxonomy

The Phase 25 engine evaluates each cell against a grounded 6-state taxonomy:

1. `NO_RELEVANT_CONTRACT_DEPENDENCY`: Authorized project pair has no active `DEPENDS_ON` document relationship or architectural topology link.
2. `MISSING_AUTHORITATIVE_CONTRACT`: Cross-project `DEPENDS_ON` relationship exists, but no authoritative contract document or document version exists for the Provider.
3. `UNSUPPORTED_CONTRACT`: Provider contract document exists, but content is non-OpenAPI prose/markdown (`UNSUPPORTED_CONTRACT_STRUCTURE`), preventing automated canonical schema parsing.
4. `BREAKING_CONTRACT_DELTA`: OpenAPI specs exist for both anchors, and Phase 23 diffing (`compareContractVersions`) detects $\ge 1$ breaking schema changes (`ENDPOINT_REMOVED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`).
5. `STRUCTURALLY_MISALIGNED`: OpenAPI specs contain zero breaking schema deltas, but the Provider's active baseline version tag or SHA-256 checksum differs from the Consumer's referenced baseline target snapshot.
6. `ALIGNED`: OpenAPI specs contain zero breaking schema deltas, and the Provider's active baseline version tag and SHA-256 checksum exactly match the Consumer's referenced baseline target snapshot.

---

## 8. State Precedence

When multiple conditions apply to a directional project pair, the final state is determined strictly by the following **Precedence Hierarchy (Highest to Lowest)**:

```text
Priority 1 (Highest): NO_RELEVANT_CONTRACT_DEPENDENCY
        ↓ (If contract dependency exists)
Priority 2: MISSING_AUTHORITATIVE_CONTRACT
        ↓ (If contract document exists)
Priority 3: UNSUPPORTED_CONTRACT
        ↓ (If OpenAPI specs parsed successfully)
Priority 4: BREAKING_CONTRACT_DELTA
        ↓ (If 0 breaking schema deltas)
Priority 5: STRUCTURALLY_MISALIGNED
        ↓ (If version tag & checksum match)
Priority 6 (Lowest): ALIGNED
```

### Precedence Resolution Examples:
- **Example A (Breaking Delta + Baseline Misalignment)**: If Provider updated to Baseline `v2.0` (causing a version tag mismatch) AND removed an endpoint (`ENDPOINT_REMOVED`), Priority 4 (`BREAKING_CONTRACT_DELTA`) wins over Priority 5 (`STRUCTURALLY_MISALIGNED`).
- **Example B (Non-Breaking Addition + Baseline Misalignment)**: If Provider updated to Baseline `v2.0` AND added a new endpoint (`ENDPOINT_ADDED`), 0 breaking deltas exist. Priority 5 (`STRUCTURALLY_MISALIGNED`) wins over Priority 6 (`ALIGNED`).

---

## 9. Dependency vs. Contract Absence

Phase 25 explicitly separates four distinct contract availability conditions:

| Case | Scenario Description | Assigned Final State | Precedence Level |
| :--- | :--- | :--- | :---: |
| **Case A** | Project $A$ and Project $B$ have no relevant cross-project contract dependency or topology link. | `NO_RELEVANT_CONTRACT_DEPENDENCY` | Priority 1 |
| **Case B** | A cross-project `DEPENDS_ON` relationship exists, but no provider contract document or version is present. | `MISSING_AUTHORITATIVE_CONTRACT` | Priority 2 |
| **Case C** | A cross-project contract relationship exists, but the provider document is plain text/prose (non-OpenAPI). | `UNSUPPORTED_CONTRACT` | Priority 3 |
| **Case D** | A contract exists and is structurally evaluable via OpenAPI parser. | `BREAKING_CONTRACT_DELTA` / `STRUCTURALLY_MISALIGNED` / `ALIGNED` | Priority 4, 5, 6 |

---

## 10. Contract Comparison Anchor

To prevent historical version contamination, Phase 25 defines an explicit **Contract Comparison Anchor**:

```text
Consumer Active Baseline (Target Snapshot) ──> Consumer Anchor (Ref Version V_ref, Checksum C_ref)
                                                        │
                                                        ▼ Phase 23 compareContractVersions
                                                        ▲
Provider Active Baseline (Active Snapshot) ──> Provider Anchor (Active Version V_act, Checksum C_act)
```

- **Consumer Anchor**: The specific Provider contract document version ($V_{\text{ref}}$) and SHA-256 checksum ($C_{\text{ref}}$) recorded in the Consumer's active `DocumentationBaseline` target snapshot.
- **Provider Anchor**: The current active `DocumentationBaseline` snapshot version ($V_{\text{act}}$) and SHA-256 checksum ($C_{\text{act}}$) in the Provider project.
- **Historical Isolation**: Unreferenced historical breaking deltas from older inactive versions are strictly ignored. Only the diff between the Consumer Anchor and Provider Anchor determines current contract compatibility.

---

## 11. Directionality

Cross-Project Contract relationships are strictly **directional**:
$$\text{Consumer Project (Row)} \xrightarrow{\text{DEPENDS\_ON}} \text{Provider Project (Column)}$$

- **Preservation of Direction**:
  - Cell $(A, B)$ represents Consumer $A \rightarrow$ Provider $B$.
  - Cell $(B, A)$ represents Consumer $B \rightarrow$ Provider $A$.
  - $A \rightarrow B$ and $B \rightarrow A$ are evaluated independently and MUST NOT be collapsed into an undirected relationship.
- **Cell Relationship Types**:
  - `CONSUMER_TO_PROVIDER`: Row project depends on Column project.
  - `PROVIDER_TO_CONSUMER`: Column project depends on Row project.
  - `MUTUAL`: Bidirectional contract dependency ($A \rightarrow B$ and $B \rightarrow A$).
  - `NONE`: No topological or contract relationship between authorized projects.

---

## 12. Topology Composition

Phase 25 reuses Phase 14 (`ProjectTopologyLink`) as project-level architectural context:

```text
Request (userId, role, rootProjectId)
        ↓
Phase 14 Subgraph Traversal (Bounded Depth <= 3, Bounded Nodes <= 50)
        ↓
Filter Authorized Projects (checkUserProjectReadAccess)
        ↓
Construct Authorized Project Set S = {P_1, P_2, ..., P_N}
        ↓
Derive N x N Matrix Grid over Set S
```

---

## 13. Baseline / Alignment Composition

Phase 25 composes Phase 18 (`SystemBaselineAlignmentService`) evidence rules:
- **Active Baseline Authority**: Only active baselines (`isActive === true`) serve as provider snapshot reference truth.
- **Evidence Provenance**: Captures `providerBaselinePresent`, `consumerBaselinePresent`, `providerAttested`, and `attestationStale`.
- **Version Mismatch**: Version tag divergence ($BL_{\text{consumer}} \neq BL_{\text{provider}}$) marks the cell as `STRUCTURALLY_MISALIGNED`.

---

## 14. Structural Delta Composition

Phase 25 composes Phase 23 (`compareContractVersions`) delta classifications:
- **Breaking Deltas**: `ENDPOINT_REMOVED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`.
- **Non-Breaking Deltas**: `ENDPOINT_ADDED`, `ENDPOINT_DEPRECATED`.
- **Cell Impact**: Presence of any breaking delta sets cell state to `BREAKING_CONTRACT_DELTA`.

---

## 15. Matrix Presentation Semantics

The $N \times N$ matrix is a **presentation/analysis model**, NOT a new topology graph.

1. **Relationship-Driven Analysis Engine**:
   - The engine DOES NOT perform an all-to-all cross-product contract diffing loop.
   - It performs deep contract comparison **ONLY** over project pairs where an active `ProjectTopologyLink` or cross-project `DEPENDS_ON` relationship exists.
2. **Empty Cell Representation**:
   - For authorized project pairs with no contract dependency, cell state is rendered as `NO_RELEVANT_CONTRACT_DEPENDENCY`.
3. **Zero Information Leakage**:
   - Unauthorized projects are completely excluded from set $S$. They are NOT rendered as rows, columns, or empty cells.
   - Displaying `NO_RELEVANT_CONTRACT_DEPENDENCY` occurs **ONLY** between project pairs where the caller has `READ` authorization for both projects.

---

## 16. ACL / Privacy

**SECURITY MANDATE**: Authorization MUST precede derived matrix computation.

1. **Project-Level Filtering**:
   - `checkUserProjectReadAccess(userId, role, projectId)` is evaluated for every candidate project in the topology subgraph.
   - If the caller lacks `READ` access to Project $P_k$, $P_k$ is **100% excluded** from matrix computation.
   - Row $P_k$ and Column $P_k$ are completely omitted from the output.
   - Matrix dimension shrinks from $N \times N$ to $M \times M$ (where $M$ is the authorized project subset).
2. **Zero Information Leakage**:
   - Unauthorized project IDs, names, topology links, and document counts are NEVER returned.
   - Summary statistics (interoperability index, cell counts) are computed strictly over authorized cells.

---

## 17. Bounds

To prevent unbounded computational complexity and memory consumption, Phase 25 enforces strict deterministic limits:

| Boundary Parameter | Value | Enforcement Behavior |
| :--- | :---: | :--- |
| `MAX_AUTHORIZED_PROJECTS` | `50` | Truncates authorized project set $S$ to 50 projects max; sets `isTruncated: true`. |
| `MAX_TOPOLOGY_EDGES` | `100` | Limits processed topology links to 100 max. |
| `MAX_CONTRACT_RELATIONSHIPS` | `200` | Limits cross-project `DEPENDS_ON` document relationships to 200 max. |
| `MAX_TRAVERSAL_DEPTH` | `3` | Restricts graph traversal depth from root project to 3 hops. |
| `MAX_MATRIX_CELLS` | `2500` | Maximum possible grid size ($50 \times 50 = 2500$ cells). |

---

## 18. Backend Architecture

### Directory Structure & File Placements
```text
apps/api/src/modules/governance/
├── system-contract-matrix.types.ts          [NEW] DTO interfaces & types
├── system-contract-matrix.service.ts        [NEW] In-memory matrix computation service
├── system-contract-matrix.controller.ts     [NEW] REST controller handler
├── system-contract-matrix.routes.ts         [NEW] Route registration (/api/v1/governance/system-contract-matrix)
├── system-contract-matrix.test.ts           [NEW] Vitest integration test suite
└── run_phase25_qa.ts                        [NEW] Standalone Phase 25 QA test runner (36+ scenarios)
```

### Route Registration
In `apps/api/src/routes/index.ts`:
```typescript
import { systemContractMatrixRouter } from '../modules/governance/system-contract-matrix.routes.js';
// ...
apiRouter.use('/', systemContractMatrixRouter);
```

---

## 19. API

### Route Registration
- **Route**: `GET /api/v1/governance/system-contract-matrix`
- **Query Parameters**:
  - `projectId` (required): Root project ID for topology traversal.
  - `maxDepth` (optional, default `3`, max `3`): Traversal depth.
- **Controller**: `getSystemContractMatrix` in `system-contract-matrix.controller.ts`.
- **Authentication**: `authenticate` middleware (JWT token required).

### DTO Definition (`system-contract-matrix.types.ts`)
```typescript
export type MatrixCellInteroperabilityState =
  | 'ALIGNED'
  | 'STRUCTURALLY_MISALIGNED'
  | 'BREAKING_CONTRACT_DELTA'
  | 'MISSING_AUTHORITATIVE_CONTRACT'
  | 'UNSUPPORTED_CONTRACT'
  | 'NO_RELEVANT_CONTRACT_DEPENDENCY'
  | 'NOT_APPLICABLE';

export type MatrixCellRelationshipType =
  | 'CONSUMER_TO_PROVIDER'
  | 'PROVIDER_TO_CONSUMER'
  | 'MUTUAL'
  | 'NONE';

export interface MatrixCellDTO {
  rowProjectId: string;
  rowProjectName: string;
  colProjectId: string;
  colProjectName: string;
  relationshipType: MatrixCellRelationshipType;
  interoperabilityState: MatrixCellInteroperabilityState;
  precedenceTier: number; // 1 to 6
  contractCount: number;
  alignedContractCount: number;
  misalignedContractCount: number;
  breakingDeltaCount: number;
  activeProviderBaselineVersion: string | null;
  referencedConsumerBaselineVersion: string | null;
  indeterminacyReason: string | null;
  remediationAction: string | null;
}

export interface SystemContractMatrixResponseDTO {
  evaluationTimestamp: string;
  rootProjectId: string;
  rootProjectName: string;
  authorizedProjectCount: number;
  matrixDimensions: string; // e.g. "4x4"
  interoperabilityIndex: number; // 0-100%
  overallStatus: 'FULLY_ALIGNED' | 'PARTIAL_MISALIGNMENT' | 'BREAKING_DELTAS_DETECTED' | 'NO_CONTRACTS';
  isTruncated: boolean;
  projectHeaders: Array<{ projectId: string; name: string }>;
  matrix: MatrixCellDTO[][];
  criticalIncompatibilities: Array<{
    consumerProjectId: string;
    consumerProjectName: string;
    providerProjectId: string;
    providerProjectName: string;
    documentId: string;
    documentTitle: string;
    issueType: string;
    description: string;
    remediationText: string;
  }>;
}
```

---

## 20. Frontend

### Directory Structure & File Placements
```text
apps/web/src/features/governance/
├── system-contract-matrix.types.ts          [NEW] Web TypeScript DTO definitions
├── system-contract-matrix.api.ts            [NEW] Axios API client (getSystemContractMatrix)
└── components/
    └── SystemContractMatrixView.tsx         [NEW] Interactive N x N matrix UI grid component
```

### UI Integration
Mounted in `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx` under a new tab **"Contract Matrix"**.

---

## 21. Determinism

To guarantee identical, audit-defensible outputs for identical repository states:
1. **Deterministic Project Header Ordering**: Authorized projects in $S$ are sorted strictly by `_id` in ascending alphanumeric order.
2. **Deterministic Matrix Grid Ordering**: Rows and columns strictly follow the sorted project header sequence.
3. **Deterministic Precedence Evaluation**: State evaluation follows Priority 1 $\rightarrow$ Priority 6 sequentially.
4. **Deterministic Math**: Interoperability index formula:
   $$\text{Interoperability Index} = \frac{N_{\text{aligned\_cells}}}{N_{\text{applicable\_contract\_cells}}} \times 100$$

---

## 22. Performance & Bulk Processing

To prevent N+1 query overhead across $N \times N$ cell evaluations:
1. **Single Bulk Project Fetch**: Fetch all candidate project metadata in 1 `Project.find(...)` call.
2. **Single Bulk Topology Link Fetch**: Fetch all relevant topology links in 1 `ProjectTopologyLink.find(...)` call.
3. **Single Bulk Document Relationship Fetch**: Fetch all `DEPENDS_ON` relationships in 1 `DocumentRelationship.find(...)` call.
4. **Single Bulk Baseline Fetch**: Fetch all baselines in 1 `DocumentationBaseline.find(...)` call.
5. **In-Memory Graph Assembly**: Total query execution time $< 30\text{ms}$.

---

## 23. Persistence Analysis

- **New Models Proposed**: **0**
- **New Collections Proposed**: **0**
- **Justification**: Storing matrix snapshots in the database would introduce cache invalidation bugs and create competing sources of truth.

---

## 24. Workers Analysis

- **Background Queue Workers**: **0**
- **Cron Jobs**: **0**
- **Justification**: Matrix calculation is fast and request-driven. No background scanning or continuous polling infrastructure is required.

---

## 25. Audit Behavior

- **Database Writes on GET**: **0**
- **Audit Events Logged on GET**: **0**
- **Justification**: GET queries are read-only and MUST NOT generate `DocumentAudit` records.

---

## 26. QA Strategy

Phase 25 will be validated via a multi-layered verification suite:
1. **Vitest Integration Tests**: `apps/api/src/modules/governance/system-contract-matrix.test.ts` (100% route and service coverage).
2. **Phase 25 QA Test Runner**: `apps/api/src/modules/governance/run_phase25_qa.ts` executing 36 dynamically counted scenarios.
3. **Full Regression Verification**: Re-running QA runners for Phase 10, 14, 17, 18, 19, 20, 21, 22, 23, and 24.
4. **TypeScript & Lint Verification**: `pnpm --filter api typecheck`, `pnpm --filter web build`, `pnpm lint`.
5. **Manual Browser QA**: Inspecting matrix grid rendering, tooltips, filtering, and ACL isolation in the Web UI.

---

## 27. QA Matrix

The standalone QA runner (`run_phase25_qa.ts`) will dynamically count and execute 36 test scenarios:

1. **Scenario 1**: State precedence conflict (breaking delta + baseline misalignment $\rightarrow$ `BREAKING_CONTRACT_DELTA` wins).
2. **Scenario 2**: Breaking + misaligned simultaneously evaluation.
3. **Scenario 3**: No cross-project dependency (`NO_RELEVANT_CONTRACT_DEPENDENCY`).
4. **Scenario 4**: Dependency without provider contract (`MISSING_AUTHORITATIVE_CONTRACT`).
5. **Scenario 5**: Plain text/prose contract (`UNSUPPORTED_CONTRACT`).
6. **Scenario 6**: Missing authoritative provider baseline.
7. **Scenario 7**: Historical breaking delta isolated from current anchor.
8. **Scenario 8**: Correct comparison anchor matching.
9. **Scenario 9**: Stale provider evidence handling.
10. **Scenario 10**: `ALIGNED` comparison evaluation.
11. **Scenario 11**: `STRUCTURALLY_MISALIGNED` comparison evaluation.
12. **Scenario 12**: `INDETERMINATE` comparison evaluation.
13. **Scenario 13**: Directional Consumer $A \rightarrow$ Provider $B$ evaluation.
14. **Scenario 14**: Directional Consumer $B \rightarrow$ Provider $A$ evaluation.
15. **Scenario 15**: Full authorized project set matrix rendering.
16. **Scenario 16**: Partial authorized project set matrix rendering.
17. **Scenario 17**: Unauthorized provider project exclusion.
18. **Scenario 18**: Unauthorized consumer project exclusion.
19. **Scenario 19**: Empty/non-related pair behavior (`NO_RELEVANT_CONTRACT_DEPENDENCY`).
20. **Scenario 20**: $N \times N$ presentation privacy safety (0 leakage).
21. **Scenario 21**: Relationship-driven calculation verification.
22. **Scenario 22**: Matrix bounds enforcement (`MAX_AUTHORIZED_PROJECTS = 50`).
23. **Scenario 23**: Topology bounds enforcement (`MAX_TRAVERSAL_DEPTH = 3`).
24. **Scenario 24**: Contract lookup batching (0 N+1).
25. **Scenario 25**: Baseline lookup batching (0 N+1).
26. **Scenario 26**: Zero N+1 query execution proof.
27. **Scenario 27**: Zero persistence validation.
28. **Scenario 28**: Zero background workers validation.
29. **Scenario 29**: Zero audit writes on GET query.
30. **Scenario 30**: Zero semantic compatibility overclaim verification.
31. **Scenario 31**: Zero invented topology relationships.
32. **Scenario 32**: Phase 14 ACL composition verification.
33. **Scenario 33**: Phase 18 Baseline Alignment composition verification.
34. **Scenario 34**: Phase 23 Contract Evolution composition verification.
35. **Scenario 35**: Deterministic repeated calculation verification.
36. **Scenario 36**: Full Vitest regression suite execution.

---

## 28. Architectural Stress Test

| Threat | Impact | Mitigation Strategy | Test Strategy |
| :--- | :--- | :--- | :--- |
| **1. Overlapping State Ambiguity** | Non-deterministic state assigned when baseline is misaligned AND breaking delta exists. | Enforce strict 6-tier Precedence Hierarchy (Priority 4 `BREAKING_CONTRACT_DELTA` > Priority 5 `STRUCTURALLY_MISALIGNED`). | QA Scenario 1 & 2. |
| **2. Conflated Contract Absence** | User cannot distinguish missing dependency from missing document vs prose text. | Separate taxonomy into 4 explicit cases (`NO_RELEVANT_CONTRACT_DEPENDENCY`, `MISSING_AUTHORITATIVE_CONTRACT`, `UNSUPPORTED_CONTRACT`, Evaluated). | QA Scenario 3–5. |
| **3. Comparison Anchor Drift** | Diffing against obsolete historical contract versions. | Bind comparison strictly to Consumer active baseline target snapshot vs Provider active baseline. | QA Scenario 7 & 8. |
| **4. Historical Contamination** | Inactive contract diffs polluting current matrix cell state. | Ignore inactive baseline history; diff active anchors only. | QA Scenario 7. |
| **5. $N \times N$ Combinatorial Explosion** | Excessive memory usage or slow response times for large project networks. | Hard caps (`MAX_AUTHORIZED_PROJECTS = 50`, `MAX_MATRIX_CELLS = 2500`) and single bulk fetch. | QA Scenario 22 & 23. |
| **6. Invented Topology Links** | Falsely displaying contract links between unrelated projects. | Deep contract analysis executed ONLY over active `ProjectTopologyLink` and `DEPENDS_ON` records. | QA Scenario 19 & 31. |
| **7. ACL Information Leakage** | Leaking unauthorized project names or contract counts to non-admin users. | Execute `checkUserProjectReadAccess` *before* matrix assembly; omit unauthorized nodes completely. | QA Scenario 17 & 18. |
| **8. Aggregate Side Channels** | Inferring hidden projects from cell counts or ratios. | Summary statistics computed strictly over authorized cells. | QA Scenario 20. |
| **9. Stale Baseline / Attestation** | False positive alignment when baselines are missing. | Precedence Priority 2 (`MISSING_AUTHORITATIVE_CONTRACT`) triggers before alignment check. | QA Scenario 6 & 9. |
| **10. Duplicate Authority** | Creating competing contract or topology models. | 0 new Mongoose models or persistent collections. Derive 100% in-memory on GET. | QA Scenario 27. |
| **11. UI Canvas Editing Drift** | UI morphing into drag-and-drop architecture diagram editor. | UI strictly restricted to read-only matrix grid and detail drawer. | QA Scenario 36. |
| **12. Semantic Overclaim** | Claiming version match equals runtime interoperability. | Explicit DTO state taxonomy and UI disclaimers. | QA Scenario 30. |

---

## 29. Security Review

1. **Authentication**: All Phase 25 endpoints require valid JWT authentication via `authenticate` middleware.
2. **Authorization**: Enforces project-level read permissions (`checkUserProjectReadAccess`).
3. **Data Exposure Protection**: Unauthorized projects are completely omitted from matrix headers, rows, columns, counts, and summaries.
4. **Input Validation**: `projectId` is strictly validated as a valid 24-character hexadecimal Mongoose `ObjectId`.

---

## 30. Product Boundary Review

Documan strictly enforces product boundaries:
- ❌ **Not a Postman Clone**: Does not execute live API calls, run mock servers, or test HTTP payloads.
- ❌ **Not an APM / Monitoring Platform**: Does not track live system metrics, server CPU, or pod health.
- ❌ **Not a CI/CD Pipeline Runner**: Does not trigger deployments, run build steps, or execute release pipelines.
- ❌ **Not an AI / LLM Tool**: Contains **zero mandatory AI, LLM, RAG, or non-deterministic ML features**.

---

## 31. Open Questions

1. *Should the UI allow filtering the matrix view by specific interoperability states (e.g. show only cells with `BREAKING_CONTRACT_DELTA` or `STRUCTURALLY_MISALIGNED`)?*  
   *Initial Design*: Yes, the Web UI `SystemContractMatrixView.tsx` will include state filter toggle buttons above the grid.
2. *How should the matrix handle bidirectional dependencies between Project A and Project B?*  
   *Initial Design*: Both cell $(A, B)$ and cell $(B, A)$ will display `MUTUAL` as their relationship type, but will evaluate contract alignment independently based on their respective directional contract documents.

---

## 32. Implementation Sequence

Phase 25 will be implemented incrementally across 5 controlled steps:

1. **Step 1 — Types & Backend Service**:
   - Create `system-contract-matrix.types.ts` and `system-contract-matrix.service.ts`.
   - Implement in-memory matrix derivation, precedence hierarchy, bulk data fetching, and ACL pruning.
2. **Step 2 — Controller & Routes**:
   - Create `system-contract-matrix.controller.ts` and `system-contract-matrix.routes.ts`.
   - Register route in `apps/api/src/routes/index.ts`.
3. **Step 3 — Vitest Integration & Phase 25 QA Suite**:
   - Create `system-contract-matrix.test.ts` and `run_phase25_qa.ts` (36 scenarios).
   - Run verification suite to achieve 100% pass rate.
4. **Step 4 — Web Frontend Integration**:
   - Create web DTOs (`system-contract-matrix.types.ts`), API client (`system-contract-matrix.api.ts`), and UI component (`SystemContractMatrixView.tsx`).
   - Mount in `SystemGovernanceGateSection.tsx`.
5. **Step 5 — Final Verification & Review**:
   - Execute full regression suite (Phases 10, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25).
   - Verify `pnpm --filter api typecheck`, `pnpm --filter web build`, `pnpm lint`, and `git diff --check`.
   - STOP for final review.

---

## 33. Verification Plan

### Automated Verification
```bash
# 1. API Typecheck
pnpm --filter api typecheck

# 2. Phase 25 QA Test Runner
pnpm --filter api exec tsx src/modules/governance/run_phase25_qa.ts

# 3. Full Vitest Test Suite
pnpm test

# 4. Web Build Verification
pnpm --filter web build

# 5. ESLint Verification
pnpm lint

# 6. Whitespace Check
git diff --check
```

---

## 34. Acceptance Criteria

Phase 25 will be complete when:
1. `GET /api/v1/governance/system-contract-matrix` returns accurate $N \times N$ matrix grid DTOs for authorized project topologies.
2. Cell contract states (`ALIGNED`, `STRUCTURALLY_MISALIGNED`, `BREAKING_CONTRACT_DELTA`, `MISSING_AUTHORITATIVE_CONTRACT`, `UNSUPPORTED_CONTRACT`, `NO_RELEVANT_CONTRACT_DEPENDENCY`, `NOT_APPLICABLE`) are computed deterministically per the 6-tier Precedence Hierarchy.
3. Absent dependencies, missing contracts, and unsupported prose are cleanly distinguished into separate taxonomy states.
4. Comparison diffing is strictly anchored between the Consumer active baseline target snapshot and Provider active baseline snapshot.
5. 100% ACL isolation is preserved (unauthorized projects omitted from matrix headers, rows, columns, and summaries).
6. Persistence = 0, Workers = 0, Audit Writes on GET = 0, AI/LLM = 0.
7. All 36 Phase 25 QA scenarios pass cleanly.
8. Full Vitest regression suite passes with 0 failures.
9. Web UI renders interactive matrix grid with tooltips and filters.
10. `git diff --check` passes with zero whitespace errors.

---

**STOP.**  
Do NOT implement source code.  
Do NOT create a feature branch.  
Do NOT commit, merge, or push.  
Wait for user review and explicit approval of `docs/research/PHASE-25-IMPLEMENTATION-PLAN-v2.md`.
