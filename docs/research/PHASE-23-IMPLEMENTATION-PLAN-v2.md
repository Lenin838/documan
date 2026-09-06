# Phase 23 Implementation Plan v2 — Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer

> **Approved Direction**: Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer  
> **Research Basis**: `docs/research/PHASE-23-RESEARCH.md`  
> **Status**: **PLAN REVISION v2 ONLY** (Do NOT implement, do NOT create feature branch, do NOT modify codebase, do NOT commit/merge/push).

---

## 1. Executive Summary

Phase 23 introduces the **Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer**. It bridges the operational gap between **Authoritative Baselines (Phase 12)**, **System Topology (Phase 14)**, **Baseline Contract Alignment (Phase 18)**, and **System Release Gates (Phase 19)**.

When a provider project advances its authoritative baseline snapshot from Version A ($BL_A$) to Version B ($BL_B$), downstream consumer projects experience `CONTRACT_MISALIGNED` release gate blockers. Phase 23 provides a read-only analytical engine that:
1. Normalizes and canonicalizes structured contract representations to calculate a **deterministic structural contract diff** between the provider's baseline versions ($BL_A$ vs $BL_B$).
2. Identifies all affected downstream consumer documents across the project topology graph using existing Phase 7.3 and Phase 18 composition.
3. Calculates explicit **topological blast radius metrics** (`affectedProjects` / `reachableProjects`, `affectedDocuments` / `reachableDocuments`) with exact mathematical denominators.
4. Generates an informational **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE`** based strictly on topological graph depth.
5. Derives downstream **verification**, **evidence**, and **governance implications** without executing task creation, code refactoring, or remediation workflows.

Phase 23 is **read-only and analytical**. It uses **zero new database persistence**, **zero background workers**, emits **zero audit writes on read**, and enforces **Phase 14 cross-project ACL isolation 100%**.

---

## 2. Research Basis

This plan revision v2 directly addresses all feedback from the v1 review, establishing:
- An evidence-backed inventory of structured contract representations in the repository.
- A feasibility matrix proving deterministic calculation for every supported delta.
- Strict prohibition of natural-language or LLM prose semantic guessing (`UNSUPPORTED_CONTRACT_STRUCTURE`).
- An explicit 4-stage normalization and canonicalization pipeline.
- Mathematically rigorous blast radius metrics with explicit count denominators.
- Full composition of existing Phase 7.3, 14, 18, 19, 20, 21, and 22 engines without subsystem duplication.

---

## 3. Current Repository Evidence

The implementation builds upon authoritative repository infrastructure:
- **`apps/api/src/modules/api-specs/openapi-parser.service.ts`**: Parses OpenAPI 3.0.x / 3.1.x JSON/YAML specs into `ParsedOpenApiSpec` and `ParsedEndpoint` array (methods, paths, tags, operationId, isDeprecated).
- **`apps/api/src/modules/api-specs/project-api-endpoint.model.ts`**: Stores parsed endpoint metadata (`method`, `path`, `summary`, `operationId`, `isDeprecated`).
- **`apps/api/src/modules/api-specs/project-api-spec.model.ts`**: Stores raw specification content (`rawContent`, `format: JSON|YAML`, `openApiVersion`).
- **`apps/api/src/modules/api-specs/api-spec-drift.service.ts`**: Tracks endpoint drift transitions (`newlyOrphanedLinks`, `newlyDeprecatedEndpoints`).
- **`apps/api/src/modules/documents/document-version.model.ts`**: Stores immutable document versions with `versionNumber`, `checksum`, `content`.
- **`apps/api/src/modules/governance/documentation-baseline.model.ts`**: Stores baseline snapshots (`version`, `documentSnapshots: [{ documentId, versionNumber, checksum }]`).
- **`apps/api/src/modules/projects/project-topology.model.ts`**: Directional project dependency links (`sourceProjectId`, `targetProjectId`).
- **`apps/api/src/modules/governance/system-baseline-alignment.service.ts`**: Evaluates unit alignment state between consumer referenced versions and active provider baseline versions.
- **`apps/api/src/modules/documents/document-impact-cascade.ts`**: Calculates multi-level document dependency impact cascade.

---

## 4. Contract Representation Inventory

Every contract source candidate in the repository is classified based on empirical code evidence:

| Contract Source Candidate | Repository Path / Model | Structural Classification | Available Schema / Contract Fields |
| :--- | :--- | :--- | :--- |
| **OpenAPI Spec Files** | `apps/api/src/modules/api-specs/project-api-spec.model.ts`, `openapi-parser.service.ts` | **EXACT STRUCTURED CONTRACT** | `endpoints` (`method`, `path`, `operationId`, `isDeprecated`), `components.schemas` (`type`, `properties`, `required`, `enum`). |
| **Parsed API Endpoints** | `apps/api/src/modules/api-specs/project-api-endpoint.model.ts` | **EXACT STRUCTURED CONTRACT** | `method`, `path`, `summary`, `operationId`, `tags`, `isDeprecated`. |
| **Document Version Snapshots (JSON Spec)** | `apps/api/src/modules/documents/document-version.model.ts` (`fileType === 'JSON' \| 'YAML'`) | **EXACT STRUCTURED CONTRACT** | Parsed JSON/YAML object tree matching OpenAPI 3.x or JSON Schema spec format. |
| **Document Version Snapshots (Markdown / Prose)** | `apps/api/src/modules/documents/document-version.model.ts` (`fileType === 'MARKDOWN' \| 'TEXT'`) | **FREE-FORM TEXT / UNSUPPORTED** | Unstructured markdown text paragraphs, headings, bullet points. No machine-readable AST contract schema. |
| **Knowledge Risk Radar Records** | `apps/api/src/modules/documents/knowledge-risk.service.ts` | **PARTIALLY STRUCTURED** | Risk category metadata (`ORPHANED_LINK`, `STALE_DEPENDENCY`). Does not define formal API payload schemas. |

---

## 5. Structural Diff Feasibility Matrix

Every proposed contract delta code is evaluated against repository parser capabilities:

| Proposed Delta Code | Target Structural Element | Repository Evidence & Calculation Method | Feasibility Status | Deterministic Risk Tier |
| :--- | :--- | :--- | :---: | :---: |
| `ENDPOINT_REMOVED` | HTTP Method + Path | `openapi-parser.service.ts` extracts `endpoints: ParsedEndpoint[]`. Calculated by set difference ($BL_A \setminus BL_B$) over `METHOD:PATH` keys. | **SUPPORTED** | `BREAKING` |
| `ENDPOINT_DEPRECATED` | Flag `isDeprecated` | `ParsedEndpoint.isDeprecated` parsed by `openapi-parser.service.ts`. Detected when `isDeprecated` is `false` in $BL_A$ and `true` in $BL_B$. | **SUPPORTED** | `WARNING` |
| `ENDPOINT_ADDED` | HTTP Method + Path | Calculated by set difference ($BL_B \setminus BL_A$) over `METHOD:PATH` keys. | **SUPPORTED** | `NON_BREAKING` |
| `FIELD_REMOVED` | JSON Schema Property | OpenAPI schema parser extracts `properties` object. Calculated when property key exists in $BL_A$ schema but missing in $BL_B$ schema. | **SUPPORTED** | `BREAKING` |
| `FIELD_TYPE_CHANGED` | JSON Schema Type | Calculated when `schema.properties[key].type` or `$ref` differs between $BL_A$ and $BL_B$. | **SUPPORTED** | `BREAKING` |
| `FIELD_REQUIREDNESS_CHANGED` | JSON Schema `required` | Calculated when property key is absent from $BL_A$'s `required` array but present in $BL_B$'s `required` array. | **SUPPORTED** | `BREAKING` |
| `ENUM_VALUE_REMOVED` | JSON Schema `enum` Array | Calculated when value present in $BL_A$'s `enum` array is absent in $BL_B$'s `enum` array. | **SUPPORTED** | `BREAKING` |

---

## 6. Product Gap

Today, when Phase 18 evaluates a system release gate and returns `CONTRACT_MISALIGNED`, the system reports a binary mismatch (`consumer document X referenced v1.0, but provider baseline is v2.0`).

**The Product Gap**: Authors and Lead Engineers must manually inspect raw files across project boundaries to deduce why the contract mismatched, what endpoints or schema properties changed, and which downstream consumer documents must be addressed first. Phase 23 resolves this gap by providing a deterministic, canonicalized structural contract evolution analysis.

---

## 7. Goals

1. **Canonical Contract Normalization**: Implement a 4-stage pipeline (Normalization $\rightarrow$ Canonicalization $\rightarrow$ Comparison $\rightarrow$ Delta List) ensuring byte-for-byte deterministic diffing.
2. **Supported Structural Diffing**: Calculate supported deltas (`ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_ADDED`).
3. **Consumer Impact Discovery**: Identify all consumer documents referencing $BL_A$ across the project topology graph that are impacted by $BL_B$.
4. **Explicit Blast Radius Metrics**: Provide explicit counts (`affectedProjects`, `reachableProjects`, `affectedDocuments`, `reachableDocuments`) with exact mathematical denominators.
5. **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE`**: Order affected consumer documents deterministically based on graph topology depth (provider $\rightarrow$ direct consumer $\rightarrow$ transitive consumer).
6. **Derived Implications Analysis**: Calculate derived implications for Evidence (Phase 9), Assurance (Phase 10), Verification (Phase 11), Alignment (Phase 18), and System Release Gates (Phase 19).
7. **Bounded Historical Uncertainty**: Return `UNSUPPORTED_CONTRACT_STRUCTURE` when baseline content is unstructured prose text.
8. **Strict Security & Privacy**: Enforce Phase 14 ACL rules prior to output generation, concealing unauthorized subgraphs completely.

---

## 8. Non-Goals

- **NO Remediation Execution**: The system MUST NOT execute automated file updates, code refactoring, ticket creation, deployment, or CI/CD triggers.
- **NO Task Creation**: The system MUST NOT automatically create `VerificationTask` or `DocumentationWorkRequest` records. Existing Phase 13 Work Requests remain the authoritative workflow.
- **NO Prose Semantic Diffing**: Strictly prohibit natural-language contract interpretation, Markdown text comparison, LLM, AI, embeddings, vector search, or probabilistic semantic inference.
- **NO Database Mutations**: Zero new collections, models, or DB writes.
- **NO Background Workers**: Zero background queues, cron jobs, or schedulers.
- **NO Audit Noise**: GET operations generate zero audit log entries.

---

## 9. Canonical Contract Representation

To guarantee identical contracts produce byte-for-byte identical diffs, Phase 23 defines an explicit 4-stage canonicalization pipeline:

```text
Raw Spec Content (JSON/YAML)
           ↓
Stage 1: Normalization
  - Method Casing: Upper-case HTTP methods ('get' → 'GET', 'post' → 'POST')
  - Path Normalization: Strip trailing slashes ('/api/users/' → '/api/users'), normalize parameter templates ('{id}' → '{id}')
  - Enum Sorting: Sort string enum array values lexicographically ASC
  - Optional/Nullable Fields: Normalize explicit 'nullable: true' vs absent property keys
           ↓
Stage 2: Canonical Map Construction
  - Key Sorting: Recursively sort all JSON object keys lexicographically
  - Endpoint Map: Construct Map keyed by `METHOD:PATH` (e.g., `GET:/v1/users`)
  - Schema Map: Construct Map keyed by `SCHEMA_NAME:PROPERTY_PATH` (e.g., `User:email`)
           ↓
Stage 3: Deterministic Set & Value Comparison
  - Set Difference (BL_A \ BL_B): Identify REMOVED endpoints and schema fields
  - Set Difference (BL_B \ BL_A): Identify ADDED endpoints
  - Value Diff: Compare matching keys for `type`, `required`, `isDeprecated`, and `enum` set changes
           ↓
Stage 4: Structured Delta List Generation
  - Output array sorted deterministically by `riskTier DESC`, `deltaCode ASC`, `method ASC`, `path ASC`, `fieldPath ASC`
```

---

## 10. Structural Delta Model

When both Provider Baseline A ($BL_A$) and Provider Baseline B ($BL_B$) contain supported contract structures, Phase 23 calculates the exact set of structural deltas:

```typescript
export interface ContractDeltaItemDTO {
  deltaCode:
    | 'ENDPOINT_REMOVED'
    | 'ENDPOINT_DEPRECATED'
    | 'FIELD_REMOVED'
    | 'FIELD_TYPE_CHANGED'
    | 'FIELD_REQUIREDNESS_CHANGED'
    | 'ENUM_VALUE_REMOVED'
    | 'ENDPOINT_ADDED';
  riskTier: 'BREAKING' | 'WARNING' | 'NON_BREAKING';
  path?: string;
  method?: string;
  fieldPath?: string;
  previousValue?: string;
  newValue?: string;
  description: string;
}
```

Every delta is **deterministic**, **explainable**, **version-bound**, and **reproducible**.

---

## 11. Risk Classification

Risk classification rules are strictly deterministic:

| Delta Code | Deterministic Rule Condition | Risk Tier | Justification |
| :--- | :--- | :---: | :--- |
| `ENDPOINT_REMOVED` | Endpoint present in $BL_A$ absent in $BL_B$ | `BREAKING` | Direct runtime 404/failure for callers. |
| `FIELD_REMOVED` | Property in $BL_A$ schema absent in $BL_B$ schema | `BREAKING` | Callers expecting property fail schema validation. |
| `FIELD_TYPE_CHANGED` | Property data type changed in $BL_B$ | `BREAKING` | Type mismatch causes serialization/deserialization crashes. |
| `FIELD_REQUIREDNESS_CHANGED` | Optional field in $BL_A$ became `required` in $BL_B$ | `BREAKING` | Existing payloads missing field will be rejected. |
| `ENUM_VALUE_REMOVED` | Allowed enum value in $BL_A$ missing in $BL_B$ | `BREAKING` | Callers sending previously valid enum value are rejected. |
| `ENDPOINT_DEPRECATED` | `isDeprecated` changed from `false` to `true` | `WARNING` | Endpoint functional but slated for future removal. |
| `ENDPOINT_ADDED` | Endpoint present in $BL_B$ absent in $BL_A$ | `NON_BREAKING` | New capability added without altering existing contracts. |

---

## 12. Version / Baseline Semantics

Phase 23 operates strictly on authoritative baseline snapshots:
- **Baseline A ($BL_A$)**: Reference provider `DocumentationBaseline` ID or version string.
- **Baseline B ($BL_B$)**: Target provider `DocumentationBaseline` ID or version string.

### Baseline Mismatch Handling

| Scenario Condition | Engine Status Returned | Explanatory Guidance |
| :--- | :--- | :--- |
| Provider Baseline A missing in DB | `INDETERMINATE_HISTORICAL_EVIDENCE` | `Provider Baseline A snapshot not found` |
| Provider Baseline B missing in DB | `INDETERMINATE_HISTORICAL_EVIDENCE` | `Provider Baseline B snapshot not found` |
| Document missing in Baseline snapshot | `INDETERMINATE_HISTORICAL_EVIDENCE` | `Document ID not bound to baseline snapshot` |
| Referenced DocumentVersion deleted | `INDETERMINATE_HISTORICAL_EVIDENCE` | `Underlying DocumentVersion record deleted` |
| Baseline content is Markdown / Prose | `UNSUPPORTED_CONTRACT_STRUCTURE` | `Baseline document contains unstructured text prose` |
| Baseline archived | `INDETERMINATE_HISTORICAL_EVIDENCE` | `Baseline snapshot is archived` |

The engine **never** fabricates a diff or substitutes today's active document state.

---

## 13. Cross-Project Contract Lineage

Reuses Phase 18 cross-project contract lineage models:
- **Provider Project**: Project publishing $BL_A$ and $BL_B$.
- **Consumer Project**: Project holding a `ProjectTopologyLink` (`sourceProjectId = Consumer`, `targetProjectId = Provider`, `linkType = DEPENDS_ON`).
- **Consumer Document**: Document in Consumer Project containing a `DocumentRelationship` pointing to a document in Provider Project.
- **Referenced Version**: Version number specified in Consumer Document's relationship reference.

---

## 14. Consumer Discovery

To discover affected consumers:
1. Query `DocumentRelationship` records where `targetDocumentId` belongs to Provider Project and `relationshipType = DEPENDS_ON`.
2. Filter relationships where `referencedVersionNumber` matches the version in $BL_A$.
3. Validate that a `ProjectTopologyLink` exists between Consumer Project and Provider Project (Phase 14 compliance).
4. Apply Phase 14 ACL rules: verify the calling user has read permissions for both Consumer Project and Provider Project.

---

## 15. Topological Blast Radius

Blast radius metrics provide explicit counts and exact mathematical denominators:

```typescript
export interface TopologicalBlastRadiusDTO {
  affectedProjectsCount: number;
  reachableProjectsCount: number;
  projectBlastRadiusRatio: number | null; // affectedProjectsCount / reachableProjectsCount (null if reachable === 0)
  
  affectedDocumentsCount: number;
  reachableDocumentsCount: number;
  documentBlastRadiusRatio: number | null; // affectedDocumentsCount / reachableDocumentsCount (null if reachable === 0)
  
  maximumDependencyDepth: number;
  isTruncated: boolean;
  truncationReason?: string;
}
```

- If `reachableProjectsCount === 0`, `projectBlastRadiusRatio` returns **`null`**.
- If `reachableDocumentsCount === 0`, `documentBlastRadiusRatio` returns **`null`**.
- Capped at `MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_CONSUMER_DOCUMENTS = 100`.

---

## 16. Dependency-Ordered Impact Analysis

The engine constructs an informational **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE`**:
- **Layer 1**: Direct consumer documents in immediate downstream projects ($Depth = 1$).
- **Layer 2**: Transitive consumer documents in secondary downstream projects ($Depth = 2$).
- **Layer 3**: Transitive consumer documents in tertiary downstream projects ($Depth = 3$).

Ties within layers are broken deterministically by `consumerProjectId ASC`, `consumerDocumentId ASC`. **Informational only; no remediation tasks, workflow execution, or ticket creation occur.**

---

## 17. Phase 7.3 Composition

Reuses `apps/api/src/modules/documents/document-impact-cascade.ts`:
- Passes the list of modified provider documents from $BL_A \rightarrow BL_B$.
- Computes multi-level downstream document impact nodes.
- Adapts cascade results into contract-evolution DTO payloads without duplicating the cascade engine.

---

## 18. Phase 18 Composition

Reuses `system-baseline-alignment.service.ts`:
- Evaluates unit alignment state under $BL_A$ vs $BL_B$.
- Reports unit alignment consequence: `ALIGNED` (under $BL_A$) $\rightarrow$ `MISALIGNED` (under $BL_B$).

---

## 19. Phase 19 Composition

Reuses `system-topology-governance-gate.service.ts`:
- Evaluates system release gate status under $BL_A$ vs $BL_B$.
- Highlights gate consequence: `PASSED` (under $BL_A$) $\rightarrow$ `BLOCKED` (under $BL_B$ due to `CONTRACT_MISALIGNED`).

---

## 20. Phase 20 Composition

Reuses `system-governance-waiver.service.ts`:
- Checks if active policy waivers match the resulting `CONTRACT_MISALIGNED` blockers.
- Reports if the gate consequence transitions to `PASSED_WITH_WAIVER` if covered by an active waiver.

---

## 21. Phase 9–11 Verification/Evidence Composition

Calculates derived implications for verification and evidence:
- **Phase 9 (Evidence)**: Identifies evidence records attached to consumer documents whose evidence coverage score will decay due to upstream contract deltas.
- **Phase 10 (Assurance)**: Identifies consumer documents whose assurance check will transition from `PASSED` to `BLOCKED` / `STALE`.
- **Phase 11 (Verification Implications)**: Identifies verification check categories (`CONTRACT_COMPLIANCE`, `DEPENDENCY_FRESHNESS`) implicated by breaking contract deltas.

**NO automatic `VerificationTask` creation.**

---

## 22. Phase 22 Historical Interaction

Phase 22 handles *governance history* over time. Phase 23 handles *structural contract evolution analysis* across baseline snapshots.
- Phase 23 evaluates contract deltas between any two explicit baselines $BL_A$ and $BL_B$.
- Does not persist timeline entries or mutate Phase 22 audit lineage.

---

## 23. ACL / Privacy

Phase 14 ACL rules are strictly enforced **before** generating output:
- Verifies read permissions (`userId`, `role`) on every project in the topology graph.
- If the user lacks read permission for a consumer project, that consumer project, its documents, and its counts are **100% omitted** from the impact sequence, blast radius denominators, and delta summaries.
- Zero information leakage through IDs, counts, project names, or error messages.

---

## 24. API Design

### Primary Analysis Endpoint
`GET /api/v1/governance/system-governance/contract-evolution/delta`

### Query Parameters
- `providerProjectId` (string, required): ObjectId of provider project.
- `baselineIdA` (string, required): Baseline ID or version string for $BL_A$.
- `baselineIdB` (string, required): Baseline ID or version string for $BL_B$.

### Response DTO Contract (`ContractEvolutionDeltaResponseDTO`)
```typescript
export interface ContractEvolutionDeltaResponseDTO {
  providerProjectId: string;
  providerBaselineA: {
    baselineId: string;
    version: string;
    createdAt: string;
  };
  providerBaselineB: {
    baselineId: string;
    version: string;
    createdAt: string;
  };
  analysisStatus: 'COMPLETE' | 'UNSUPPORTED_CONTRACT_STRUCTURE' | 'INDETERMINATE_HISTORICAL_EVIDENCE';
  unsupportedReason?: string;
  contractDeltas: ContractDeltaItemDTO[];
  blastRadius: TopologicalBlastRadiusDTO;
  dependencyOrderedImpactSequence: Array<{
    depth: number;
    consumerProjectId: string;
    consumerProjectName: string;
    consumerDocumentId: string;
    consumerDocumentTitle: string;
    consumerReferencedVersion: number;
    impactCategory: 'DIRECT_BREAKING_CONTRACT' | 'TRANSITIVE_DEPENDENCY_DRIFT';
    implications: {
      alignmentConsequence: 'MISALIGNED';
      governanceConsequence: 'BLOCKED' | 'PASSED_WITH_WAIVER';
      assuranceConsequence: 'STALE' | 'BLOCKED';
      implicatedVerificationCategories: string[];
    };
  }>;
}
```

---

## 25. Frontend

### Component
`ContractEvolutionAnalyzer.tsx`

### Placement
Mounted as a dedicated tab/drawer within `SystemGovernanceGateSection.tsx`.

### Visual Sections
1. **Compared Versions Header**: Provider project name, Baseline A version, Baseline B version.
2. **Contract Support Status Banner**: Status badge (`COMPLETE`, `UNSUPPORTED_CONTRACT_STRUCTURE`, `INDETERMINATE`).
3. **Structural Deltas Table**: Color-coded risk badges (`BREAKING` = Red, `WARNING` = Yellow, `NON_BREAKING` = Blue), method, path, fieldPath, previous/new value.
4. **Topological Blast Radius Card**: Explicit count metrics (`affectedProjects / reachableProjects`, `affectedDocuments / reachableDocuments`) and ratio percentage.
5. **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE` List**: Grouped by Depth ($1, 2, 3$) with governance consequence badges.
6. **Verification & Evidence Implications Card**: Implicated check categories and evidence coverage decay warnings.

---

## 26. Determinism

The analysis is 100% deterministic:
- Baseline lookup resolves exact immutable snapshots.
- Spec parser uses strict JSON/YAML key sorting and path normalization.
- Traversal orders graph nodes deterministically.
- Output arrays sorted by `riskTier DESC`, `deltaCode ASC`, `method ASC`, `path ASC`, `fieldPath ASC`.
- Identical repository state produces byte-for-byte identical response DTOs.

---

## 27. Performance & Hard Bounds

- **Memory**: Pure in-memory diffing of parsed endpoints/schemas ($N \le 100$ endpoints).
- **Execution Time**: $< 50\text{ms}$ total calculation time.
- **N+1 Prevention**: Batch fetches `DocumentVersion` and `DocumentRelationship` records using `$in` query filters.
- **Hard Bounds Enforced**:
  - `MAX_TIMELINE_WINDOW_MS`: Not applicable (baseline version comparison).
  - `MAX_DEPTH = 3` (Maximum project topology graph depth).
  - `MAX_NODES = 50` (Maximum project nodes evaluated).
  - `MAX_CONSUMER_DOCUMENTS = 100` (Maximum consumer documents returned).
  - `MAX_CONTRACT_DELTAS = 200` (Maximum deltas returned).

---

## 28. Persistence Decision

**ZERO NEW PERSISTENCE**. No new Mongoose models, collections, indexes, or snapshots. All deltas are derived on-demand from existing immutable `DocumentationBaseline` and `DocumentVersion` documents.

---

## 29. Worker Decision

**ZERO BACKGROUND WORKERS**. Calculations are synchronous, bounded, and execute on-demand within standard API request latency thresholds ($< 50\text{ms}$).

---

## 30. Audit Behavior

**READ-ONLY OPERATION $\rightarrow$ ZERO AUDIT WRITES**. Querying contract evolution deltas creates zero records in `DocumentAudit`. Existing audit records are read strictly as evidence.

---

## 31. Testing Strategy

1. **Unit Tests (`system-contract-evolution.test.ts`)**: Test spec parsing, normalization, canonicalization, diffing logic, risk tiering, ACL filtering, and deterministic sorting.
2. **QA Matrix Runner (`run_phase23_qa.ts`)**: Executable TSX matrix runner containing at least **36 dynamically counted scenarios**.
3. **Regression Suite**: Run Phase 22, 21, 20, 19, 18, 17, 14, 10 QA runners to verify zero regression across all prior governance phases.

---

## 32. QA Matrix (36 Scenarios)

The Phase 23 QA runner (`run_phase23_qa.ts`) will execute and assert the following 36 scenarios dynamically:

1. Identical baseline versions ($BL_A == BL_B$) returns zero contract deltas.
2. `ENDPOINT_REMOVED` delta correctly identified as `BREAKING` risk tier.
3. `ENDPOINT_DEPRECATED` delta correctly identified as `WARNING` risk tier.
4. `ENDPOINT_ADDED` delta correctly identified as `NON_BREAKING` risk tier.
5. `FIELD_REMOVED` in JSON schema identified as `BREAKING` risk tier.
6. `FIELD_TYPE_CHANGED` in JSON schema identified as `BREAKING` risk tier.
7. `FIELD_REQUIREDNESS_CHANGED` identified as `BREAKING` risk tier.
8. `ENUM_VALUE_REMOVED` identified as `BREAKING` risk tier.
9. Plain prose markdown content returns `UNSUPPORTED_CONTRACT_STRUCTURE`.
10. Malformed JSON/YAML baseline content returns `UNSUPPORTED_CONTRACT_STRUCTURE`.
11. Missing Provider Baseline A returns `INDETERMINATE_HISTORICAL_EVIDENCE`.
12. Missing Provider Baseline B returns `INDETERMINATE_HISTORICAL_EVIDENCE`.
13. Missing document in baseline snapshot returns `INDETERMINATE_HISTORICAL_EVIDENCE`.
14. Archived baseline snapshot returns `INDETERMINATE_HISTORICAL_EVIDENCE`.
15. Direct downstream consumer document ($Depth = 1$) detected in impact sequence.
16. Transitive downstream consumer document ($Depth = 2$) detected in impact sequence.
17. Transitive downstream consumer document ($Depth = 3$) detected in impact sequence.
18. Topology graph depth > 3 correctly truncated at `MAX_DEPTH = 3`.
19. Topology nodes > 50 correctly truncated at `MAX_NODES = 50`.
20. Consumer documents > 100 correctly truncated at `MAX_CONSUMER_DOCUMENTS = 100`.
21. ACL isolation: Unauthorized consumer project 100% omitted from impact sequence.
22. ACL isolation: Blast radius calculation excludes unauthorized topology nodes.
23. Blast radius denominator correctness: `affectedProjects / reachableProjects` calculated accurately.
24. Zero reachable projects returns `null` ratio for blast radius.
25. Deterministic ordering: Impact sequence sorted by `depth ASC`, `projectId ASC`, `documentId ASC`.
26. Repeated identical query produces byte-for-byte identical DTO output.
27. Zero database mutations verified across all collections during execution.
28. Zero background workers or queue tasks initialized.
29. Zero audit log writes emitted during GET contract evolution query.
30. Derived Phase 18 alignment consequence reported as `MISALIGNED`.
31. Derived Phase 19 gate consequence reported as `BLOCKED`.
32. Derived Phase 20 waiver matching correctly identifies `PASSED_WITH_WAIVER` if active waiver exists.
33. Derived Phase 10 assurance consequence reported as `STALE` / `BLOCKED`.
34. Derived Phase 11 verification check categories correctly implicated (`CONTRACT_COMPLIANCE`).
35. No task creation or work request creation occurs during analysis.
36. Final assertion: QA scenario count dynamically verified equal to 36.

---

## 33. Architectural Stress Test

| Stress Test Threat | Mitigation Strategy |
| :--- | :--- |
| **1. Insufficient Contract Structure** | Return `UNSUPPORTED_CONTRACT_STRUCTURE` when content is prose; zero semantic guessing. |
| **2. Duplicate Contract Authority** | Single parser authority (`openapi-parser.service.ts`). |
| **3. Duplicate Impact Engine** | Direct reuse of Phase 7.3 `document-impact-cascade.ts`. |
| **4. Duplicate Topology Engine** | Direct reuse of Phase 14 `ProjectTopologyLink` and Phase 18 alignment traversal. |
| **5. Semantic Inference Temptation** | Strict prohibition of LLM/AI/Markdown text comparison. |
| **6. Baseline / Version Mismatch** | Explicit Lookup in `DocumentationBaseline` and `DocumentVersion`. |
| **7. Cross-Project ACL Leakage** | Enforce Phase 14 `checkUserProjectReadAccess` before adding nodes/documents to payload. |
| **8. Graph Explosion** | Hard limits enforced (`MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_CONSUMER_DOCUMENTS = 100`). |
| **9. N+1 Queries** | Batch fetch baseline snapshots, document versions, and relationships using `$in`. |
| **10. Task-Management Scope Drift** | Strictly enforce read-only analytical output; NO task or ticket creation. |
| **11. Arbitrary Blast-Radius Scoring** | Explicit count ratios with mathematical denominators (`affected / reachable`). |
| **12. Unsupported Risk Classification** | Every supported delta mapped to a deterministic risk tier in Section 11 table. |

---

## 34. Security Review

- **Authentication**: JWT token required (`auth.middleware.ts`).
- **Authorization**: Phase 14 ACL rules (`checkUserProjectReadAccess`).
- **Data Isolation**: Multi-tenant project boundary strictly enforced.
- **Omission Principle**: Unauthorized entities are omitted cleanly without disclosing IDs, counts, or names.

---

## 35. Open Questions

1. *Should OpenAPI spec endpoints parsed in Phase 7.1 (`ProjectApiSpec`) be automatically linked if a document does not explicitly store raw spec content in `DocumentVersion.content`?*  
   **Resolution**: Yes. If `DocumentVersion.content` is not an inline spec, the engine checks for linked `ProjectApiSpec` records associated with the provider document.

---

## 36. Implementation Sequence

1. **Phase 23 Types & Canonical Diff Service**: Implement `system-contract-evolution.types.ts` and `system-contract-evolution.service.ts`.
2. **Controller & Routes**: Implement `system-contract-evolution.controller.ts` and `system-contract-evolution.routes.ts`.
3. **Unit Tests & QA Runner**: Implement `system-contract-evolution.test.ts` and `run_phase23_qa.ts`.
4. **Frontend API & Component**: Implement `system-contract-evolution.api.ts` and `ContractEvolutionAnalyzer.tsx`.
5. **Integration & Mounted UI**: Mount `ContractEvolutionAnalyzer` in `SystemGovernanceGateSection.tsx`.

---

## 37. Verification Plan

1. **API Typecheck**: `pnpm --filter api typecheck`
2. **ESLint**: `pnpm lint`
3. **Web Build**: `pnpm --filter web build`
4. **Vitest Suite**: `pnpm test`
5. **Phase 23 QA Runner**: `run_phase23_qa.ts` (36 assertions)
6. **Regression QA**: Run Phase 22, 21, 20, 19, 18, 17, 14, 10 QA runners.
7. **Git Checks**: `git diff --check` and `git status`.

---

## 38. Acceptance Criteria

- [ ] Deterministic structural diff correctly classifies `ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_ADDED`.
- [ ] Returns `UNSUPPORTED_CONTRACT_STRUCTURE` cleanly when baseline content is plain prose markdown.
- [ ] Canonicalization pipeline normalizes method casing, trailing slashes, enum sorting, and key ordering.
- [ ] `DEPENDENCY_ORDERED_IMPACT_SEQUENCE` correctly groups consumer documents by depth ($1, 2, 3$).
- [ ] Blast radius metrics report explicit counts (`affectedProjects / reachableProjects`, `affectedDocuments / reachableDocuments`) and ratio percentage.
- [ ] Zero database mutations, zero background workers, zero audit writes during read queries.
- [ ] Phase 14 ACL rules omit 100% of unauthorized topology nodes.
- [ ] All 36 QA matrix scenarios pass dynamically.
- [ ] Web build and Vitest suite pass cleanly.
