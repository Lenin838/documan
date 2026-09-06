# Phase 25 Implementation Plan v1 — Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer

> **Approved Research Plan**: [`docs/research/PHASE-25-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-25-RESEARCH.md)  
> **Target Feature**: Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer  
> **Status**: PLAN ONLY (No implementation code, no feature branch, no commits)  

---

## 1. Executive Summary

Phase 25 introduces the **Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer**, an end-to-end, read-only, request-scoped matrix engine that derives an $N \times N$ project contract compatibility grid across all authorized projects in a system topology graph. 

The feature enables Enterprise Architects, Project Owners, and System Admins to evaluate pair-wise structural contract alignment, identify structural contract misalignments, detect breaking OpenAPI schema deltas, highlight missing baselines, and surface unverified contract boundaries across multi-project system architectures.

The calculation operates as a **derived presentation and analysis layer** built strictly on top of existing authoritative primitives: Phase 12 baselines (`DocumentationBaseline`), Phase 14 topology links (`ProjectTopologyLink`), Phase 18 baseline alignment logic (`system-baseline-alignment.service.ts`), and Phase 23 contract evolution diffing (`system-contract-evolution.service.ts`). It introduces **0 new database models**, **0 background workers**, **0 audit log writes on GET queries**, and **0 external AI/LLM dependencies**.

---

## 2. Research Basis

The implementation plan is grounded in [`docs/research/PHASE-25-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-25-RESEARCH.md):
- **Candidate Selected**: Candidate 4 (Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer)
- **Scoring**: Highest rated candidate (59/60) across 12 product and technical criteria.
- **Stress Test**: 100% pass rate across 16 architectural stress-test dimensions.
- **Maturity Goal**: Fills the final remaining structural gap in Documan's Cross-Project Architecture capability suite.

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

**CRITICAL RULE (INFERENCE)**: Phase 25 evaluates **structural contract alignment** and **canonical schema matching**. It does **NOT** claim to prove universal "semantic interoperability" of live software components.
```text
VERSION IDENTITY ≠ CHECKSUM MATCHING ≠ SEMANTIC COMPATIBILITY
```

---

## 6. Matrix Cell Semantics

The $N \times N$ matrix is a **derived presentation and analysis model**. It is NOT a new database collection or topology source of truth.

- **Matrix Cell Unit**: Represents the directional contract integration interface between a Consumer Project (Row $i$) and a Provider Project (Column $j$).
- **No Invented Relationships**: A cell between Project $A$ and Project $B$ is populated with contract evidence **ONLY** if an authorized directional `ProjectTopologyLink` or cross-project `DocumentRelationship` (`DEPENDS_ON`) exists between them.
- **`NO_AUTHORITATIVE_CONTRACT`**: Assigned to cell $(i, j)$ when both Project $i$ and Project $j$ are authorized, but no active cross-project contract relationship connects them.
- **Self-Cells**: Diagonal cells $(i, i)$ are marked as `NOT_APPLICABLE` (a project does not form a cross-project contract with itself).

---

## 7. Contract State Taxonomy

The Phase 25 engine evaluates cell contract compatibility across a deterministic 5-state taxonomy:

1. **`ALIGNED`**:
   - Authoritative contract document exists between Consumer and Provider.
   - Provider has an active baseline snapshot matching the Consumer's referenced baseline snapshot version and SHA-256 checksum.
   - Structural delta diffing detects 0 breaking contract changes.
2. **`STRUCTURALLY_MISALIGNED`**:
   - Active provider baseline snapshot has updated to a newer version/checksum than the consumer's referenced baseline snapshot target.
   - Contract structure has drifted across baseline releases.
3. **`BREAKING_CONTRACT_DELTA`**:
   - Phase 23 structural contract diffing (`compareContractVersions`) detects 1 or more breaking schema deltas (`ENDPOINT_REMOVED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`).
4. **`NO_AUTHORITATIVE_CONTRACT`**:
   - Both Row (Consumer) and Column (Provider) projects are authorized to the caller, but no active `DEPENDS_ON` document relationship connects them.
5. **`INDETERMINATE`**:
   - Provider baseline snapshot is missing, or the contract document contains plain markdown/prose (`UNSUPPORTED_CONTRACT_STRUCTURE`), preventing automated canonical schema parsing.

---

## 8. Directionality

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

## 9. Topology Composition

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

## 10. Contract Authority

Phase 25 reuses Phase 23 contract authority principles:
- **Supported Formats**: Valid OpenAPI 3.0.x and 3.1.x specifications (JSON and YAML).
- **Prose / Markdown Handling**: Plain text, prose ADRs, or non-OpenAPI document content produce state `INDETERMINATE` with reason `UNSUPPORTED_CONTRACT_STRUCTURE`.
- **Zero AI / LLM Guessing**: No natural language inference or fuzzy semantic guessing is performed.

---

## 11. Baseline / Alignment Composition

Phase 25 composes Phase 18 (`SystemBaselineAlignmentService`) evidence rules:
- **Active Baseline Authority**: Only active baselines (`isActive === true`) serve as provider snapshot reference truth.
- **Evidence Provenance**: Captures `providerBaselinePresent`, `consumerBaselinePresent`, `providerAttested`, and `attestationStale`.
- **Version Mismatch**: Version tag divergence ($BL_{\text{consumer}} \neq BL_{\text{provider}}$) marks the cell as `STRUCTURALLY_MISALIGNED`.

---

## 12. Structural Delta Composition

Phase 25 composes Phase 23 (`compareContractVersions`) delta classifications:
- **Breaking Deltas**: `ENDPOINT_REMOVED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`.
- **Non-Breaking Deltas**: `ENDPOINT_ADDED`, `ENDPOINT_DEPRECATED`.
- **Cell Impact**: Presence of any breaking delta sets cell state to `BREAKING_CONTRACT_DELTA`.

---

## 13. ACL / Privacy

**SECURITY MANDATE**: Authorization MUST precede derived matrix computation.

1. **Project-Level Filtering**:
   - `checkUserProjectReadAccess(userId, role, projectId)` is evaluated for every candidate project in the topology subgraph.
   - If the caller lacks `READ` access to Project $P_k$, $P_k$ is **100% excluded** from matrix computation.
   - Row $P_k$ and Column $P_k$ are completely omitted from the output.
   - Matrix dimension shrinks from $N \times N$ to $M \times M$ (where $M$ is the authorized project subset).
2. **Zero Information Leakage**:
   - Unauthorized project IDs, names, topology links, and document counts are NEVER returned.
   - Summary statistics (interoperability index, cell counts) are computed strictly over authorized cells.
   - `NO_AUTHORITATIVE_CONTRACT` is returned **ONLY** for authorized project pairs. Unauthorized pairs are omitted entirely.

---

## 14. Matrix Bounds

To prevent unbounded computational complexity and memory consumption, Phase 25 enforces strict deterministic limits:

| Boundary Parameter | Value | Enforcement Behavior |
| :--- | :---: | :--- |
| `MAX_AUTHORIZED_PROJECTS` | `50` | Truncates authorized project set $S$ to 50 projects max; sets `isTruncated: true`. |
| `MAX_TOPOLOGY_EDGES` | `100` | Limits processed topology links to 100 max. |
| `MAX_CONTRACT_RELATIONSHIPS` | `200` | Limits cross-project `DEPENDS_ON` document relationships to 200 max. |
| `MAX_TRAVERSAL_DEPTH` | `3` | Restricts graph traversal depth from root project to 3 hops. |
| `MAX_MATRIX_CELLS` | `2500` | Maximum possible grid size ($50 \times 50 = 2500$ cells). |

---

## 15. API

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
  | 'NO_AUTHORITATIVE_CONTRACT'
  | 'INDETERMINATE'
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
  contractCount: number;
  alignedContractCount: number;
  misalignedContractCount: number;
  breakingDeltaCount: number;
  activeProviderBaselineVersion: string | null;
  activeConsumerBaselineVersion: string | null;
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

## 16. Backend Architecture

### Directory Structure & File Placements
```text
apps/api/src/modules/governance/
├── system-contract-matrix.types.ts          [NEW] DTO interfaces & types
├── system-contract-matrix.service.ts        [NEW] In-memory matrix computation service
├── system-contract-matrix.controller.ts     [NEW] REST controller handler
├── system-contract-matrix.routes.ts         [NEW] Route registration (/api/v1/governance/system-contract-matrix)
├── system-contract-matrix.test.ts           [NEW] Vitest integration test suite
└── run_phase25_qa.ts                        [NEW] Standalone Phase 25 QA test runner (35+ scenarios)
```

### Route Registration
In `apps/api/src/routes/index.ts`:
```typescript
import { systemContractMatrixRouter } from '../modules/governance/system-contract-matrix.routes.js';
// ...
apiRouter.use('/', systemContractMatrixRouter);
```

---

## 17. Frontend

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

## 18. Determinism

To guarantee identical, audit-defensible outputs for identical repository states:
1. **Deterministic Project Header Ordering**: Authorized projects in $S$ are sorted strictly by `_id` in ascending alphanumeric order.
2. **Deterministic Matrix Grid Ordering**: Rows and columns strictly follow the sorted project header sequence.
3. **Deterministic Critical Incompatibility Sorting**: Sorted by `consumerProjectId` $\rightarrow$ `providerProjectId` $\rightarrow$ `documentId`.
4. **Deterministic Math**: Interoperability index formula:
   $$\text{Interoperability Index} = \frac{N_{\text{aligned\_cells}}}{N_{\text{applicable\_contract\_cells}}} \times 100$$
   Returns `100%` if zero contract cells exist ($N_{\text{applicable}} = 0$).

---

## 19. Performance & Bulk Processing

To prevent N+1 query overhead across $N \times N$ cell evaluations:
1. **Single Bulk Project Fetch**: Fetch all candidate project metadata in 1 `Project.find({ _id: { $in: projectIds } })` call.
2. **Single Bulk Topology Link Fetch**: Fetch all relevant topology links in 1 `ProjectTopologyLink.find(...)` call.
3. **Single Bulk Document Relationship Fetch**: Fetch all `DEPENDS_ON` relationships in 1 `DocumentRelationship.find(...)` call.
4. **Single Bulk Baseline Fetch**: Fetch all baselines in 1 `DocumentationBaseline.find(...)` call.
5. **In-Memory Graph Assembly**: Perform matrix cell calculations strictly in-memory over indexed JavaScript `Map` structures. Total query execution time $< 30\text{ms}$.

---

## 20. Persistence Analysis

- **New Models Proposed**: **0**
- **New Collections Proposed**: **0**
- **Justification**: The $N \times N$ matrix is derived dynamically at query time from `DocumentationBaseline`, `ProjectTopologyLink`, `DocumentRelationship`, and `DocumentVersion`. Storing matrix snapshots in the database would introduce cache invalidation bugs and create competing sources of truth.

---

## 21. Workers Analysis

- **Background Queue Workers**: **0**
- **Cron Jobs**: **0**
- **Justification**: Matrix calculation is fast and request-driven. No background scanning or continuous polling infrastructure is required.

---

## 22. Audit Behavior

- **Database Writes on GET**: **0**
- **Audit Events Logged on GET**: **0**
- **Justification**: GET queries are read-only. Per Documan guidelines, routine read operations MUST NOT generate `DocumentAudit` records or database mutations.

---

## 23. QA Strategy

Phase 25 will be validated via a multi-layered verification suite:
1. **Vitest Integration Tests**: `apps/api/src/modules/governance/system-contract-matrix.test.ts` (100% route and service coverage).
2. **Phase 25 QA Test Runner**: `apps/api/src/modules/governance/run_phase25_qa.ts` executing 40 dynamically counted scenarios.
3. **Full Regression Verification**: Re-running QA runners for Phase 10, 14, 17, 18, 19, 20, 21, 22, 23, and 24.
4. **TypeScript & Lint Verification**: `pnpm --filter api typecheck`, `pnpm --filter web build`, `pnpm lint`.
5. **Manual Browser QA**: Inspecting matrix grid rendering, tooltips, filtering, and ACL isolation in the Web UI.

---

## 24. QA Matrix

The standalone QA runner (`run_phase25_qa.ts`) will dynamically count and execute 40 test scenarios:

1. **Scenario 1**: Single authorized project matrix ($1 \times 1$ `NOT_APPLICABLE`).
2. **Scenario 2**: Two authorized projects with simple `CONSUMER_TO_PROVIDER` dependency (`ALIGNED`).
3. **Scenario 3**: Multiple consumers depending on single provider.
4. **Scenario 4**: Multiple providers serving single consumer.
5. **Scenario 5**: Bidirectional `MUTUAL` project dependency contract.
6. **Scenario 6**: Two authorized projects with `NO_AUTHORITATIVE_CONTRACT`.
7. **Scenario 7**: Baseline snapshot version mismatch (`STRUCTURALLY_MISALIGNED`).
8. **Scenario 8**: Breaking schema change delta (`BREAKING_CONTRACT_DELTA`).
9. **Scenario 9**: Missing provider baseline (`INDETERMINATE`).
10. **Scenario 10**: Non-OpenAPI prose contract document (`INDETERMINATE` / `UNSUPPORTED_CONTRACT_STRUCTURE`).
11. **Scenario 11**: Stale attestation evidence handling.
12. **Scenario 12**: Unauthorized project excluded from matrix rows and columns.
13. **Scenario 13**: Unauthorized provider excluded from consumer matrix cell.
14. **Scenario 14**: Unauthorized consumer excluded from provider matrix cell.
15. **Scenario 15**: Aggregate metrics isolation under partial authorization.
16. **Scenario 16**: Topology relationship present but 0 document contracts (`NO_AUTHORITATIVE_CONTRACT`).
17. **Scenario 17**: Multiple document contracts between same project pair.
18. **Scenario 18**: Deterministic project header sorting by `_id`.
19. **Scenario 19**: Deterministic matrix cell grid ordering.
20. **Scenario 20**: Maximum project threshold truncation (`MAX_AUTHORIZED_PROJECTS = 50`).
21. **Scenario 21**: Maximum depth traversal limit (`MAX_TRAVERSAL_DEPTH = 3`).
22. **Scenario 22**: Single bulk query execution (0 N+1 DB calls).
23. **Scenario 23**: Zero database persistence check.
24. **Scenario 24**: Zero background queue worker check.
25. **Scenario 25**: Zero audit log writes on GET request.
26. **Scenario 26**: Phase 14 `checkUserProjectReadAccess` composition.
27. **Scenario 27**: Phase 18 `SystemBaselineAlignmentService` composition.
28. **Scenario 28**: Phase 23 `compareContractVersions` composition.
29. **Scenario 29**: Response DTO shape and field validation.
30. **Scenario 30**: Interoperability index calculation accuracy ($0-100\%$).
31. **Scenario 31**: Critical incompatibilities roster extraction.
32. **Scenario 32**: Archived project exclusion.
33. **Scenario 33**: Soft-deleted document exclusion.
34. **Scenario 34**: Invalid project ID handling (`404 NOT_FOUND`).
35. **Scenario 35**: Unauthorized root project access (`403 FORBIDDEN`).
36. **Scenario 36**: Idempotent repeated matrix calculation.
37. **Scenario 37**: Clean `git diff --check` whitespace validation.
38. **Scenario 38**: Full Vitest test suite regression execution.
39. **Scenario 39**: Web production build compilation.
40. **Scenario 40**: Manual UI matrix rendering verification.

---

## 25. Architectural Stress Test

| Threat | Impact | Mitigation Strategy | Test Strategy |
| :--- | :--- | :--- | :--- |
| **1. Semantic Compatibility Overclaim** | Misleading users into thinking version equality guarantees runtime code compatibility. | Explicit DTO state taxonomy (`ALIGNED`, `STRUCTURALLY_MISALIGNED`, `BREAKING_CONTRACT_DELTA`) and clear UI disclaimers. | Verify DTO contains zero "semantic interoperability" claims. |
| **2. $N \times N$ Combinatorial Explosion** | Excessive memory usage or slow response times for large project networks. | Hard caps (`MAX_AUTHORIZED_PROJECTS = 50`, `MAX_MATRIX_CELLS = 2500`) and single bulk fetch. | QA Scenario 20 & 21. |
| **3. Invented Topology Relationships** | Falsely displaying contract links between unrelated projects. | Cells populated ONLY from existing `ProjectTopologyLink` and `DEPENDS_ON` records. | QA Scenario 6 & 16. |
| **4. ACL Information Leakage** | Leaking unauthorized project names or contract counts to non-admin users. | Execute `checkUserProjectReadAccess` *before* matrix assembly; omit unauthorized nodes completely. | QA Scenario 12–15. |
| **5. N+1 Query Degradation** | DB query flooding during cell iteration. | Single bulk fetching for Projects, Topology Links, Relationships, and Baselines. | QA Scenario 22. |
| **6. Non-Deterministic Matrix Output** | Random row/column ordering across API calls. | Sort project headers strictly by `_id` in ascending alphanumeric order. | QA Scenario 18 & 19. |
| **7. Persistence / Cache Pollution** | Stale matrix records stored in MongoDB. | 0 new Mongoose models or persistent collections. Derive 100% in-memory on GET. | QA Scenario 23. |
| **8. Audit Log Noise** | Bloating `DocumentAudit` collection with routine GET logs. | 0 audit log writes during matrix query execution. | QA Scenario 25. |

---

## 26. Security Review

1. **Authentication**: All Phase 25 endpoints require valid JWT authentication via `authenticate` middleware.
2. **Authorization**: Enforces project-level read permissions (`checkUserProjectReadAccess`).
3. **Data Exposure Protection**: Unauthorized projects are completely omitted from matrix headers, rows, columns, counts, and summaries.
4. **Input Validation**: `projectId` is strictly validated as a valid 24-character hexadecimal Mongoose `ObjectId`.

---

## 27. Product Boundary Review

Documan strictly enforces product boundaries:
- ❌ **Not a Postman Clone**: Does not execute live API calls, run mock servers, or test HTTP payloads.
- ❌ **Not an APM / Monitoring Platform**: Does not track live system metrics, server CPU, or pod health.
- ❌ **Not a CI/CD Pipeline Runner**: Does not trigger deployments, run build steps, or execute release pipelines.
- ❌ **Not an AI / LLM Tool**: Contains **zero mandatory AI, LLM, RAG, or non-deterministic ML features**.

---

## 28. Open Questions

1. *Should the UI allow filtering the matrix view by specific interoperability states (e.g. show only cells with `BREAKING_CONTRACT_DELTA` or `STRUCTURALLY_MISALIGNED`)?*  
   *Initial Design*: Yes, the Web UI `SystemContractMatrixView.tsx` will include state filter toggle buttons above the grid.
2. *How should the matrix handle bidirectional dependencies between Project A and Project B?*  
   *Initial Design*: Both cell $(A, B)$ and cell $(B, A)$ will display `MUTUAL` as their relationship type, but will evaluate contract alignment independently based on their respective directional contract documents.

---

## 29. Implementation Sequence

Phase 25 will be implemented incrementally across 5 controlled steps:

1. **Step 1 — Types & Backend Service**:
   - Create `system-contract-matrix.types.ts` and `system-contract-matrix.service.ts`.
   - Implement in-memory matrix derivation, bulk data fetching, and ACL pruning.
2. **Step 2 — Controller & Routes**:
   - Create `system-contract-matrix.controller.ts` and `system-contract-matrix.routes.ts`.
   - Register route in `apps/api/src/routes/index.ts`.
3. **Step 3 — Vitest Integration & Phase 25 QA Suite**:
   - Create `system-contract-matrix.test.ts` and `run_phase25_qa.ts` (40 scenarios).
   - Run verification suite to achieve 100% pass rate.
4. **Step 4 — Web Frontend Integration**:
   - Create web DTOs (`system-contract-matrix.types.ts`), API client (`system-contract-matrix.api.ts`), and UI component (`SystemContractMatrixView.tsx`).
   - Mount in `SystemGovernanceGateSection.tsx`.
5. **Step 5 — Final Verification & Review**:
   - Execute full regression suite (Phases 10, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25).
   - Verify `pnpm --filter api typecheck`, `pnpm --filter web build`, `pnpm lint`, and `git diff --check`.
   - STOP for final review.

---

## 30. Verification Plan

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

## 31. Acceptance Criteria

Phase 25 will be complete when:
1. `GET /api/v1/governance/system-contract-matrix` returns accurate $N \times N$ matrix grid DTOs for authorized project topologies.
2. Cell contract states (`ALIGNED`, `STRUCTURALLY_MISALIGNED`, `BREAKING_CONTRACT_DELTA`, `NO_AUTHORITATIVE_CONTRACT`, `INDETERMINATE`, `NOT_APPLICABLE`) are computed deterministically.
3. 100% ACL isolation is preserved (unauthorized projects omitted from matrix headers, rows, columns, and summaries).
4. Persistence = 0, Workers = 0, Audit Writes on GET = 0, AI/LLM = 0.
5. All 40 Phase 25 QA scenarios pass cleanly.
6. Full Vitest regression suite passes with 0 failures.
7. Web UI renders interactive matrix grid with tooltips and filters.
8. `git diff --check` passes with zero whitespace errors.

---

**STOP.**  
Do NOT implement source code.  
Do NOT create a feature branch.  
Do NOT commit, merge, or push.  
Wait for user review and explicit approval of `docs/research/PHASE-25-IMPLEMENTATION-PLAN-v1.md`.
