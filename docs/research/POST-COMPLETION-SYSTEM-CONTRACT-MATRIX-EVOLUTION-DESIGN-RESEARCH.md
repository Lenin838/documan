# POST-COMPLETION SYSTEM CONTRACT MATRIX & EVOLUTION ANALYZER DESIGN RESEARCH

**Domain:** 16 — System Contract Matrix & Evolution Analyzer  
**Repository:** Documan (`apps/api`, `apps/web`)  
**Status:** Complete Repository Analysis & Stitch Design Foundation  
**Deliverable File:** `docs/research/POST-COMPLETION-SYSTEM-CONTRACT-MATRIX-EVOLUTION-DESIGN-RESEARCH.md`

---

## 1. AUTHORITATIVE IMPLEMENTATION LOCATION

### A. Authoritative Source Files & Component Tree
The existing implementation of Domain 16 is distributed across authoritative frontend and backend packages in the Documan repository:

#### Frontend (`apps/web/src/features/governance/`)
- **Main Matrix Page & View:**
  - Component: [`SystemContractMatrixView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemContractMatrixView.tsx)
  - Purpose: Full $N \times N$ cross-project contract matrix view, filter controls, Cell Detail drawer, and project filter selectors.
- **Evolution Analyzer Component:**
  - Component: [`ContractEvolutionAnalyzer.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/ContractEvolutionAnalyzer.tsx)
  - Purpose: Diffs two baseline versions of an OpenAPI contract document, categorizes risk levels, lists precise schema deltas, and visualizes topological blast radius with dependency ordering.
- **Contract Planning & Alignment Component:**
  - Component: [`SystemContractPlanningView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemContractPlanningView.tsx)
  - Purpose: Evaluates change proposals and change packages against contract baselines, showing predicted alignment impact before release execution.
- **API Clients & Type Definitions:**
  - Types: [`system-contract-matrix.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-contract-matrix.types.ts)
  - API Client: [`system-contract-matrix.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-contract-matrix.api.ts)
  - Evolution Types: [`system-contract-evolution.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-contract-evolution.types.ts)
  - Evolution API Client: [`system-contract-evolution.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-contract-evolution.api.ts)

#### Backend (`apps/api/src/modules/governance/`)
- **System Contract Matrix Service & Types:**
  - Service: [`system-contract-matrix.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-matrix.service.ts)
  - Types: [`system-contract-matrix.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-matrix.types.ts)
- **Contract Evolution Service & Types:**
  - Service: [`system-contract-evolution.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-evolution.service.ts)
  - Types: [`system-contract-evolution.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-evolution.types.ts)
- **Contract Planning Service & Types:**
  - Service: [`system-contract-plan.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.service.ts)
  - Types: [`system-contract-plan.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.types.ts)
- **HTTP Controller & Routes:**
  - Route Registry: [`governance.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/governance.routes.ts)

### B. Routing & Navigation Boundaries
- **Route Kind:** System-wide sub-navigation under Governance.
- **Frontend URL Path:** Accessible via Governance dashboard tab `/governance?tab=contract-matrix` (or sub-tabs `matrix`, `evolution`, `planning`).
- **HTTP API Routes:**
  - `GET /api/v1/governance/system-contract-matrix` — Query parameters: `projectIds` (comma-separated string), `environment` (`PRODUCTION` | `STAGING` | `DEVELOPMENT`). Returns `SystemContractMatrixResponse`.
  - `POST /api/v1/governance/system-contract-evolution/analyze` — Body: `{ documentId, baselineIdA, baselineIdB }`. Returns `ContractEvolutionDeltaResponse`.
  - `POST /api/v1/governance/system-contract-plan/evaluate` — Body: `{ changeProposalIds, changePackageIds }`. Returns `ContractPlanEvaluationResponse`.

---

## 2. DEFINITION OF "SYSTEM CONTRACT MATRIX"

In Documan, a **System Contract Matrix** is **NOT** an API Gateway, Postman runner, mock server, SDK generator, or APM monitoring tool.

Instead, a **System Contract Matrix** is a **graph-backed structural alignment matrix** that evaluates inter-project dependencies defined by `DocumentRelationship` records (`type === 'DEPENDS_ON'`) where documents contain OpenAPI 3.0 / 3.1 specifications attached to frozen `DocumentationBaseline` records.

### Key Concepts & Participant Roles:
1. **Provider Project (Source):** A project owning an authoritative OpenAPI contract document.
2. **Consumer Project:** A project with documents declaring explicit `DEPENDS_ON` relationships targeting the Provider's contract document.
3. **Contract Document:** A document with metadata/content containing structured OpenAPI schemas (`paths`, `components.schemas`).
4. **Baseline Snapshots ($T_{cert}$):** Frozen historical states of documentation tree baselines (`DocumentationBaseline`).
5. **Cross-Project Dependency Cell:** An intersection cell $[i, j]$ representing all contract relationships where Project $i$ acts as Provider and Project $j$ acts as Consumer.

---

## 3. CONTRACT MATRIX DATA MODEL

### Authoritative Backend Schema Definitions

#### `SystemContractMatrixCell`
```typescript
export interface SystemContractMatrixCell {
  providerProjectId: string;
  providerProjectName: string;
  consumerProjectId: string;
  consumerProjectName: string;
  cellStatus: SystemContractCellStatus;
  contracts: SystemContractSummary[];
  totalContracts: number;
  breakingContractCount: number;
  misalignedContractCount: number;
  unsupportedContractCount: number;
}
```

#### `SystemContractSummary`
```typescript
export interface SystemContractSummary {
  contractId: string;
  providerDocumentId: string;
  providerDocumentTitle: string;
  consumerDocumentId: string;
  consumerDocumentTitle: string;
  relationshipId: string;
  contractType: 'OPENAPI_3_0' | 'OPENAPI_3_1' | 'UNSUPPORTED';
  status: ContractAlignmentStatus;
  providerBaselineId?: string;
  consumerBaselineId?: string;
  detectedDeltasCount: number;
  breakingDeltasCount: number;
  lastEvaluatedAt: string;
}
```

#### `SystemContractMatrixResponse`
```typescript
export interface SystemContractMatrixResponse {
  overallStatus: 'FULLY_ALIGNED' | 'PARTIAL_MISALIGNMENT' | 'BREAKING_DELTAS_DETECTED' | 'NO_CONTRACTS';
  totalProjectsEvaluated: number;
  totalContractsEvaluated: number;
  interoperabilityIndex: number; // 0.0 to 100.0 percentage
  projects: Array<{ id: string; name: string; key: string }>;
  matrix: SystemContractMatrixCell[][]; // N x N grid where rows = Providers, cols = Consumers
  evaluatedAt: string;
}
```

### Cell Status Precedence Order (Authoritative Evaluator Logic)
When evaluating multiple contracts between Provider Project $i$ and Consumer Project $j$, the cell status is calculated by evaluating contracts against this explicit 6-tier precedence cascade:

1. `NO_RELEVANT_CONTRACT_DEPENDENCY` — No `DEPENDS_ON` relationships exist between $Project_i$ and $Project_j$.
2. `MISSING_AUTHORITATIVE_CONTRACT` — Relationship exists, but target contract has no frozen baseline snapshot.
3. `UNSUPPORTED_CONTRACT` — Target contract is prose/markdown and lacks valid OpenAPI JSON/YAML schema.
4. `BREAKING_CONTRACT_DELTA` — At least one contract has un-migrated breaking schema changes between baselines.
5. `STRUCTURALLY_MISALIGNED` — Non-breaking delta present, or field type mismatch present without breaking overall payload structure.
6. `ALIGNED` — All contracts between $Project_i$ and $Project_j$ have identical schema definitions and active baseline alignment.

---

## 4. CROSS-PROJECT ANALYSIS & GRAPH TRAVERSAL

- **Matrix Scope:** Support both System-Wide (all accessible projects) and Scoped (user-selected array of `projectIds`).
- **ACL Filtering:** Enforces Disclosure ACL (`checkUserProjectReadAccess`). Projects or documents where the user lacks read permission are stripped from matrix rows/columns.
- **Missing / Orphaned References:** Handled gracefully. If a consumer document points to a deleted or un-persisted provider contract ID, the status becomes `MISSING_AUTHORITATIVE_CONTRACT` rather than throwing an internal server error.
- **Interoperability Index Calculation:**
  $$\text{Interoperability Index} = \frac{\text{Aligned Cell Count}}{\text{Total Applicable Contract Cell Count}} \times 100$$
  Cells with `NO_RELEVANT_CONTRACT_DEPENDENCY` are excluded from the denominator.

---

## 5. CONTRACT EVOLUTION ANALYZER

The **Contract Evolution Analyzer** (`system-contract-evolution.service.ts`) diffs two baseline versions of an OpenAPI specification document (`baselineIdA` vs `baselineIdB`).

### A. Schema Delta Categories & Risk Tiers
The analyzer parses `paths` and `components.schemas` to emit explicit delta objects categorized into three severity tiers:

| Delta Code | Description | Severity Tier |
| :--- | :--- | :--- |
| `ENDPOINT_REMOVED` | HTTP method or path deleted from contract | `BREAKING` |
| `ENDPOINT_DEPRECATED` | Endpoint marked `deprecated: true` | `WARNING` |
| `FIELD_REMOVED` | Property removed from object schema payload | `BREAKING` |
| `FIELD_TYPE_CHANGED` | Data type changed (e.g., `string` to `integer`) | `BREAKING` |
| `FIELD_REQUIREDNESS_CHANGED` | Optional field became required | `BREAKING` |
| `ENUM_VALUE_REMOVED` | Value removed from enum constraint list | `BREAKING` |
| `ENDPOINT_ADDED` | New path or HTTP method introduced | `NON_BREAKING` |

### B. Topological Blast Radius & Dependency Impact
When analyzing contract evolution, the service traverses the document dependency graph with strict safety bounds:
- **Maximum Graph Depth:** $D = 3$ levels.
- **Maximum Node Limit:** $N = 50$ downstream documents.
- **Output:** Returns `dependencyOrderedImpactSequence` listing affected downstream consumer projects and documents in top-down topological order so teams can plan migration sequencing.

```typescript
export interface ContractEvolutionDeltaResponse {
  documentId: string;
  baselineIdA: string;
  baselineIdB: string;
  overallRiskTier: 'BREAKING' | 'WARNING' | 'NON_BREAKING';
  totalDeltasCount: number;
  breakingDeltasCount: number;
  warningDeltasCount: number;
  nonBreakingDeltasCount: number;
  deltas: ContractDeltaItem[];
  topologicalBlastRadius: BlastRadiusNode[];
  dependencyOrderedImpactSequence: string[]; // Array of project IDs in migration order
  analyzedAt: string;
}
```

---

## 6. AUTHORITATIVE VS CURRENT STATE ($T_{cert}$ vs $T_{now}$)

The implementation explicitly distinguishes baseline snapshots from live states:

- **$T_{cert}$ (Authoritative Baseline State):** Represents frozen, certified documentation baselines (`DocumentationBaseline` entity). Comparisons between `baselineIdA` and `baselineIdB` assess immutably recorded baseline releases.
- **$T_{now}$ (Current Live Alignment):** Represents active working documents evaluated against current baseline releases to detect un-baselined drift.
- **$T_{predicted}$ (Simulated / Predicted State):** Handled in Domain 16's Planning sub-view (`SystemContractPlanningView.tsx` / `system-contract-plan.service.ts`). It simulates applying pending Change Proposals (Domain 13) or Change Packages (Domain 14) against the current contract matrix to predict post-release inter-project alignment before actual merging.

---

## 7. RELATIONSHIP WITH DOMAINS 13, 14 & 15

| Domain | Integration Semantics with Domain 16 |
| :--- | :--- |
| **Domain 13 (Change Proposals)** | Domain 16 consumes change proposal schema diffs to run predictive contract alignment analysis prior to proposal approval. |
| **Domain 14 (Change Packages)** | Domain 16 evaluates bundled change packages against $N \times N$ project matrices to verify if coordinated releases resolve or introduce breaking contract deltas. |
| **Domain 15 (Verification Plans)** | Contract breaking deltas and structural misalignments automatically generate required compliance checklist items in Domain 15. |

---

## 8. UI ARCHITECTURE

The UI architecture for Domain 16 is structured into three primary sub-views under the Governance feature area:

```
[Governance Page Header]
  └── Sub-Tab Navigation: [ Matrix Grid ]  [ Evolution Analyzer ]  [ Contract Planning ]

  ├── 1. System Contract Matrix View (SystemContractMatrixView.tsx)
  │     ├── Filter Bar: Project Multi-select, Environment Selector (Prod/Staging/Dev)
  │     ├── Summary Cards: Overall Status, Interoperability Index (0-100%), Total Contracts Evaluated
  │     ├── N x N Matrix Grid: Hoverable interactive cells with color-coded status badges
  │     └── Cell Detail Drawer: Deep-dive view listing all individual contract relationships for selected cell
  │
  ├── 2. Contract Evolution Analyzer View (ContractEvolutionAnalyzer.tsx)
  │     ├── Baseline Comparison Selector: Provider Document, Baseline A (v1.0), Baseline B (v2.0)
  │     ├── Risk Overview Panel: Breaking Deltas count, Warning Deltas count, Non-Breaking Deltas count
  │     ├── Schema Delta Tree Table: Detailed list of endpoint/field changes with severity badges
  │     └── Blast Radius Graph & Sequence List: Downstream consumer impact in topological order
  │
  └── 3. Contract Planning View (SystemContractPlanningView.tsx)
        ├── Change Proposal / Package Multi-select Selector
        ├── Simulation Results Panel: Predicted Interoperability Index Delta (e.g. +4.2%)
        └── Predicted Matrix Cell Overlay: Shows before vs after cell alignment state
```

---

## 9. GOVERNANCE SEMANTICS

Domain 16 strictly implements Documan-native governance concepts:
- **Contract Alignment:** Degree to which consumer schemas match provider contracts.
- **Baseline Drift:** Un-baselined changes in provider specifications.
- **Interoperability Index:** System-wide percentage of aligned contract cell dependencies.
- **Topological Blast Radius:** Multi-tier downstream impact propagation ($D \le 3$).

> [!IMPORTANT]
> **Explicitly Excluded Concepts:** No SOC2, ISO27001, GDPR, HIPAA, NIST, or external regulatory dashboards exist in Domain 16. Governance refers strictly to document and schema contract alignment across projects.

---

## 10. SECURITY & ACL BOUNDARIES

- **Disclosure ACL Enforced:** Uses backend `checkUserProjectReadAccess`.
- **Privacy Minimization:** If a user lacks access to a consumer or provider project in the matrix:
  - The project row/column is omitted from the response array.
  - Blast radius calculation skips downstream nodes in inaccessible projects or masks their document titles as `[Restricted Project Document]`.
- **No Sensitive Credential Exposure:** Contracts contain only structural OpenAPI schemas; authentication headers and environment secrets are never stored or displayed in the matrix.

---

## 11. EXACT STATE VOCABULARY

### Matrix Cell Statuses
- `ALIGNED` — All contracts between provider and consumer match schema specifications.
- `STRUCTURALLY_MISALIGNED` — Non-breaking delta or field type mismatch detected.
- `BREAKING_CONTRACT_DELTA` — Breaking schema change present without consumer adaptation.
- `UNSUPPORTED_CONTRACT` — Document lacks valid OpenAPI 3.0/3.1 JSON/YAML schema.
- `MISSING_AUTHORITATIVE_CONTRACT` — Dependency target has no frozen baseline snapshot.
- `NO_RELEVANT_CONTRACT_DEPENDENCY` — No `DEPENDS_ON` relationships exist between projects.

### Contract Overall Statuses
- `FULLY_ALIGNED` — 100% of contracts across all projects are aligned.
- `PARTIAL_MISALIGNMENT` — Non-breaking misalignments detected.
- `BREAKING_DELTAS_DETECTED` — At least one breaking delta exists in the matrix.
- `NO_CONTRACTS` — No contract relationships exist in the selected project set.

---

## 12. PERFORMANCE CHARACTERISTICS & LIMITS

- **Matrix Aggregation:** Backend pre-groups contracts by `providerProjectId` and `consumerProjectId` to avoid $N^2$ database calls.
- **Graph Traversal Limits:** Topological blast radius analysis is bounded to depth $D = 3$ and node count $N = 50$.
- **Virtualization & Responsive Grid:** Matrices with $> 10$ projects render using scrollable overflow containers with sticky row/column headers.

---

## 13. BOUNDARY WITH LATER DOMAINS

Domain 16 strictly focuses on **System Contract Matrix & Evolution Analysis**. It explicitly does **NOT** own:
- **Domain 17 (System Topology Simulation Sandbox & Drift Assessor):** Topology canvas editing, drag-and-drop node placement, infrastructure node simulation.
- **Domain 18 (System Release Lineage & Attestation Certificates):** Cryptographic release certificates, attestation signatures, baseline release lineage trees.
- **Domain 19 (Printable Release Certificate):** PDF rendering, print layout stylesheets, executive sign-off pages.

---

## 14. SAMPLE DATA & TERMINOLOGY AUDIT

All concepts in Domain 16 are grounded in real, executable TypeScript logic:
- **Authoritative:** OpenAPI schema parsing, baseline diffing, topological blast radius, $N \times N$ matrix precedence, interoperability index calculation.
- **No Invented Tech:** No AI/LLM claims, blockchain attestations, mock servers, or live traffic sniffers.

---

## 15. PROPOSED STITCH DESIGN ARCHITECTURE

The high-fidelity Stitch design for Domain 16 will be organized into six canonical screen sections:

1. **16.00 Overview & Summary KPI Bar** — Interoperability Index gauge, total contracts count, overall contract status badge.
2. **16.01 System Contract Matrix ($N \times N$ Grid)** — Interactive matrix grid with sticky project headers, cell status badges, and project filter selectors.
3. **16.02 Matrix Cell Detail Drawer** — Side drawer showing detailed provider/consumer document links, baseline IDs, and specific contract statuses.
4. **16.03 Contract Evolution Analyzer** — Baseline diff comparison (Baseline A vs B), severity risk breakdown, and schema delta tree table.
5. **16.04 Topological Blast Radius & Impact Sequence** — Bounded dependency graph visualization ($D \le 3$) and ordered migration sequence.
6. **16.05 Predictive Contract Planning Overlay** — Simulated matrix cell state preview when applying change proposals/packages.

---

## 16. FINAL RESEARCH ASSESSMENT

### A. Authoritative Files
- `apps/web/src/features/governance/components/SystemContractMatrixView.tsx`
- `apps/web/src/features/governance/components/ContractEvolutionAnalyzer.tsx`
- `apps/web/src/features/governance/components/SystemContractPlanningView.tsx`
- `apps/api/src/modules/governance/system-contract-matrix.service.ts`
- `apps/api/src/modules/governance/system-contract-evolution.service.ts`
- `apps/api/src/modules/governance/system-contract-plan.service.ts`

### B. Routes
- Frontend: `/governance?tab=contract-matrix`
- API: `GET /api/v1/governance/system-contract-matrix`
- API: `POST /api/v1/governance/system-contract-evolution/analyze`
- API: `POST /api/v1/governance/system-contract-plan/evaluate`

### C. APIs & DTOs
- `SystemContractMatrixResponse`, `ContractEvolutionDeltaResponse`, `ContractPlanEvaluationResponse`

### D. Models
- `Document`, `DocumentRelationship` (`type === 'DEPENDS_ON'`), `DocumentationBaseline`

### E. Services
- `system-contract-matrix.service.ts`, `system-contract-evolution.service.ts`, `system-contract-plan.service.ts`

### F. UI Components
- `SystemContractMatrixView`, `ContractEvolutionAnalyzer`, `SystemContractPlanningView`

### G. State Vocabulary
- Cell: `ALIGNED`, `STRUCTURALLY_MISALIGNED`, `BREAKING_CONTRACT_DELTA`, `UNSUPPORTED_CONTRACT`, `MISSING_AUTHORITATIVE_CONTRACT`, `NO_RELEVANT_CONTRACT_DEPENDENCY`
- Overall: `FULLY_ALIGNED`, `PARTIAL_MISALIGNMENT`, `BREAKING_DELTAS_DETECTED`, `NO_CONTRACTS`
- Delta Risk: `BREAKING`, `WARNING`, `NON_BREAKING`

### H. ACL & Security Behavior
- Project Disclosure ACL enforced (`checkUserProjectReadAccess`). Inaccessible projects/documents stripped from matrix and blast radius graph.

### I. Performance Constraints
- $N \times N$ pre-grouping aggregation; blast radius limits $D \le 3$, $N \le 50$.

### J. Navigation Connections
- Linked under Governance tab sub-navigation (`contract-matrix`, `evolution`, `planning`).

### K. Explicit Rejected/Invented Concepts
- Postman runner, API testing, API Gateway management, SDK generator, live traffic APM monitoring, regulatory compliance (SOC2/GDPR).

### L. Proposed Stitch Architecture
- 6-part canonical design layout (16.00 through 16.05).

### M. Open Assumptions
- None. Full repository backing verified.

### N. Final Readiness
**READY FOR STITCH DESIGN**
