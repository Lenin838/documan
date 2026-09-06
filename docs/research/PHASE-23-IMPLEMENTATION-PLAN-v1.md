# Phase 23 Implementation Plan v1 — Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer

> **Approved Research Plan**: `docs/research/PHASE-23-RESEARCH.md`  
> **Status**: **PLAN ONLY** (Do NOT implement, do NOT create feature branch, do NOT modify codebase, do NOT commit/merge/push).

---

## 1. Executive Summary

Phase 23 introduces the **Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer**. It bridges the gap between **Authoritative Baselines (Phase 12)**, **System Topology (Phase 14)**, **Baseline Contract Alignment (Phase 18)**, and **System Release Gates (Phase 19)**.

When a provider project advances its authoritative baseline snapshot from Version A ($BL_A$) to Version B ($BL_B$), downstream consumer projects experience `CONTRACT_MISALIGNED` release gate blockers. Phase 23 provides a read-only analytical engine that:
1. Performs a **deterministic structural contract diff** between the provider's baseline versions ($BL_A$ vs $BL_B$).
2. Identifies all affected downstream consumer documents across the project topology graph.
3. Calculates a **topological blast radius** and a **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE`**.
4. Derives the downstream **verification**, **evidence**, and **governance implications** resulting from the contract evolution.

Phase 23 is **read-only and analytical**. It does **NOT** execute automated remediation, task creation, or workflow orchestration. It uses **zero new database persistence**, **zero background workers**, emits **zero audit writes on read**, and enforces **Phase 14 cross-project ACL isolation 100%**.

---

## 2. Research Basis

This plan is strictly grounded in `docs/research/PHASE-23-RESEARCH.md`, which analyzed the current repository state across all 22 completed phases. The research identified that while Phase 18 detects *that* a baseline contract mismatch exists (`MISALIGNED`), teams currently have no capability to understand *what exact contract deltas occurred*, *which downstream consumers are affected first*, or *what verification/evidence evidence needs updating*.

---

## 3. Current Repository Evidence

The implementation builds upon authoritative repository infrastructure:
- **`apps/api/src/modules/api-specs/openapi-parser.service.ts`**: Parses OpenAPI 3.0.x / 3.1.x JSON/YAML specs into `ParsedOpenApiSpec` and `ParsedEndpoint` array (methods, paths, tags, operationId, isDeprecated).
- **`apps/api/src/modules/api-specs/api-spec-drift.service.ts`**: Evaluates `newlyOrphanedLinks` (removed endpoints) and `newlyDeprecatedEndpoints`.
- **`apps/api/src/modules/documents/document-version.model.ts`**: Stores immutable document versions with `versionNumber`, `checksum`, `content` (JSON/YAML spec string or prose).
- **`apps/api/src/modules/governance/documentation-baseline.model.ts`**: Stores baseline snapshots (`version`, `documentSnapshots: [{ documentId, versionNumber, checksum }]`).
- **`apps/api/src/modules/projects/project-topology.model.ts`**: Directional project dependency links (`sourceProjectId`, `targetProjectId`).
- **`apps/api/src/modules/governance/system-baseline-alignment.service.ts`**: Evaluates unit alignment state between consumer referenced versions and active provider baseline versions.
- **`apps/api/src/modules/documents/document-impact-cascade.ts`**: Calculates multi-level document dependency impact cascade.

---

## 4. Product Gap

Today, when Phase 18 evaluates a system release gate and returns `CONTRACT_MISALIGNED`, the system returns a binary failure: `consumer document X referenced v1.0, but provider baseline is v2.0`. 

**The Product Gap**: Authors and System Engineers must manually compare version snapshots across project boundaries to deduce why the contract mismatched, what endpoints or schema properties changed, and which downstream consumer documents must be addressed first. Phase 23 eliminates this manual guesswork by providing a deterministic, structural contract evolution analysis.

---

## 5. Goals

1. **Deterministic Structural Diffing**: Compare provider baseline $BL_A$ and $BL_B$ content snapshots to classify structural contract changes (`ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_ADDED`).
2. **Consumer Impact Discovery**: Identify all consumer documents referencing $BL_A$ across the project topology graph that are impacted by $BL_B$.
3. **Topological Blast Radius Calculation**: Compute the percentage of downstream project nodes and document relationships affected by the contract evolution.
4. **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE`**: Order affected consumer documents deterministically based on graph topology depth (provider $\rightarrow$ direct consumer $\rightarrow$ transitive consumer).
5. **Derived Implications Analysis**: Calculate derived implications for Evidence (Phase 9), Assurance (Phase 10), Verification (Phase 11), Alignment (Phase 18), and System Release Gates (Phase 19).
6. **Bounded Historical Uncertainty**: Return `UNSUPPORTED_CONTRACT_STRUCTURE` when baseline content is unstructured prose or unparseable text.
7. **Strict Security & Privacy**: Enforce Phase 14 ACL rules prior to output generation, concealing unauthorized subgraphs completely.

---

## 6. Non-Goals

- **NO Remediation Execution**: The system MUST NOT execute automated file updates, code refactoring, ticket creation, deployment, or CI/CD triggers.
- **NO Task Creation**: The system MUST NOT automatically create `VerificationTask` or `DocumentationWorkRequest` records. Existing Phase 13 Work Requests remain the authoritative workflow.
- **NO AI / LLM / Semantic Guessing**: No embeddings, vector search, LLM summaries, or probabilistic semantic inference.
- **NO Database Mutations**: Zero new collections, models, or DB writes.
- **NO Background Workers**: Zero background queues, cron jobs, or schedulers.
- **NO Audit Noise**: GET operations generate zero audit log entries.

---

## 7. Contract Representation

Documan documents store content in `DocumentVersion.content`. When content represents a structured technical specification (e.g. OpenAPI 3.0/3.1 JSON/YAML or JSON Schema), `parseOpenApiSpecification` (from `openapi-parser.service.ts`) parses it into a structured object containing endpoints, parameters, methods, and schema properties.

### Structural vs Prose Rule
- **Supported Structure**: If `DocumentVersion.content` can be successfully parsed into a `ParsedOpenApiSpec` or valid JSON Schema structure.
- **Unsupported Structure**: If `content` is plain prose, Markdown text, or invalid JSON/YAML that cannot be deterministically parsed into a structured contract representation.
- **Enforcement**: If baseline documents contain unsupported structures, the engine returns status **`UNSUPPORTED_CONTRACT_STRUCTURE`** with an explicit explanatory reason. No semantic guessing is attempted.

---

## 8. Structural Delta Model

When both Provider Baseline A ($BL_A$) and Provider Baseline B ($BL_B$) contain supported contract structures, Phase 23 calculates the exact set of structural deltas:

| Delta Code | Structural Condition | Risk Tier |
| :--- | :--- | :--- |
| `ENDPOINT_REMOVED` | HTTP method + path exists in $BL_A$ but absent in $BL_B$ | `BREAKING` |
| `FIELD_REMOVED` | Property key present in $BL_A$ schema but absent in $BL_B$ schema | `BREAKING` |
| `FIELD_TYPE_CHANGED` | Property data type in $BL_A$ differs from $BL_B$ (e.g. `string` $\rightarrow$ `integer`) | `BREAKING` |
| `FIELD_REQUIREDNESS_CHANGED` | Property optional in $BL_A$ became `required` in $BL_B$ | `BREAKING` |
| `ENUM_VALUE_REMOVED` | Value present in $BL_A$ enum array missing in $BL_B$ | `BREAKING` |
| `ENDPOINT_DEPRECATED` | Endpoint `isDeprecated` was `false` in $BL_A$ but `true` in $BL_B$ | `WARNING` |
| `ENDPOINT_ADDED` | New HTTP method + path present in $BL_B$ that did not exist in $BL_A$ | `NON_BREAKING` |

Every delta is **deterministic**, **explainable**, **version-bound**, and **reproducible**.

---

## 9. Version / Baseline Model

Phase 23 operates exclusively on authoritative baseline snapshots:
- **Baseline A ($BL_A$)**: Historical or reference provider `DocumentationBaseline` ID or version string.
- **Baseline B ($BL_B$)**: Current or candidate provider `DocumentationBaseline` ID or version string.

The engine looks up the exact `DocumentVersion` snapshots bound to $BL_A$ and $BL_B$. It **never** uses arbitrary active document states as substitutes for missing baseline snapshots. If either baseline snapshot is missing or invalid, the engine returns `INDETERMINATE_HISTORICAL_EVIDENCE`.

---

## 10. Cross-Project Contract Lineage

Reuses Phase 18 cross-project contract lineage models:
- **Provider Project**: Project publishing $BL_A$ and $BL_B$.
- **Consumer Project**: Project holding a `ProjectTopologyLink` (`sourceProjectId = Consumer`, `targetProjectId = Provider`, `linkType = DEPENDS_ON`).
- **Consumer Document**: Document in Consumer Project containing a `DocumentRelationship` pointing to a document in Provider Project.
- **Referenced Version**: Version number specified in Consumer Document's relationship reference.

---

## 11. Consumer Discovery

To discover affected consumers:
1. Fetch all `DocumentRelationship` records where `targetDocumentId` belongs to Provider Project and `relationshipType = DEPENDS_ON`.
2. Filter relationships where the consumer's `referencedVersionNumber` matches the version in $BL_A$ (indicating the consumer was bound to the old baseline version).
3. Validate that a `ProjectTopologyLink` exists between Consumer Project and Provider Project (Phase 14 compliance).
4. Apply Phase 14 ACL rules: verify the calling user has read permissions for both Consumer Project and Provider Project.

---

## 12. Topological Blast Radius

The **Topological Blast Radius** quantifies the cross-project impact scope:

$$\text{Blast Radius Score (\%)} = \left( \frac{\text{Directly Affected Consumer Projects} + \text{Transitive Consumer Projects}}{\text{Total Accessible Downstream Topology Projects}} \right) \times 100$$

Parameters enforced:
- `MAX_DEPTH = 3` (Maximum project topology graph traversal depth).
- `MAX_NODES = 50` (Maximum project nodes evaluated).
- `MAX_CONSUMER_DOCUMENTS = 100` (Maximum consumer documents returned).

---

## 13. Dependency-Ordered Impact Analysis

The engine sorts affected consumer documents into a **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE`**:
- **Layer 1**: Direct consumer documents in immediate downstream projects ($Depth = 1$).
- **Layer 2**: Transitive consumer documents in secondary downstream projects ($Depth = 2$).
- **Layer 3**: Transitive consumer documents in tertiary downstream projects ($Depth = 3$).

Within each layer, ties are broken deterministically by `consumerProjectId` (ascending) and `consumerDocumentId` (ascending). **No AI, probabilistic ranking, or arbitrary business assumptions are used.**

---

## 14. Phase 7.3 Composition

Reuses `apps/api/src/modules/documents/document-impact-cascade.ts`:
- Passes the list of modified provider documents from $BL_A \rightarrow BL_B$.
- Computes multi-level downstream document impact nodes.
- Merges impact cascade results into the contract evolution impact analysis payload.

---

## 15. Phase 18 Composition

Reuses `system-baseline-alignment.service.ts`:
- Evaluates the unit alignment consequences of transitioning from $BL_A$ to $BL_B$.
- Reports unit transition: `ALIGNED` (under $BL_A$) $\rightarrow$ `MISALIGNED` (under $BL_B$).

---

## 16. Phase 19 Composition

Reuses `system-topology-governance-gate.service.ts`:
- Evaluates the system release gate status under $BL_A$ vs $BL_B$.
- Highlights gate consequence: `PASSED` (under $BL_A$) $\rightarrow$ `BLOCKED` (under $BL_B$ due to `CONTRACT_MISALIGNED`).

---

## 17. Phase 20 Composition

Reuses `system-governance-waiver.service.ts`:
- Checks if any active policy waivers in Phase 20 match the resulting `CONTRACT_MISALIGNED` blockers.
- Reports if the gate consequence transitions to `PASSED_WITH_WAIVER` if an active waiver covers the provider project and target document.

---

## 18. Phase 9–11 Verification/Evidence Composition

Calculates derived implications for verification and evidence:
- **Phase 9 (Evidence)**: Identifies evidence records attached to consumer documents whose evidence coverage score will decay due to upstream contract deltas.
- **Phase 10 (Assurance)**: Identifies consumer documents whose assurance check will transition from `PASSED` to `BLOCKED` / `STALE`.
- **Phase 11 (Verification Implications)**: Identifies verification check categories (`CONTRACT_COMPLIANCE`, `DEPENDENCY_FRESHNESS`) implicated by breaking contract deltas.

---

## 19. Phase 22 Historical Interaction

Phase 22 handles *governance history* over time. Phase 23 handles *structural contract evolution analysis* across baseline snapshots.
- Phase 23 can evaluate contract deltas between any two historical baselines $BL_A$ and $BL_B$ recorded at timestamps $T_A$ and $T_B$.
- Does not persist timeline entries or mutate Phase 22 audit lineage.

---

## 20. ACL / Privacy

Phase 14 ACL rules are strictly enforced **before** generating output:
- The engine checks read permissions for the requesting user (`userId`, `role`) on every project in the topology graph.
- If the user lacks read permission for a consumer project, that consumer project and its documents are **100% omitted** from the impact sequence, blast radius counts, and delta summaries.
- Zero information leakage through IDs, counts, project names, or error messages.

---

## 21. API Design

### Route Definition
`GET /api/v1/governance/system-governance/contract-evolution/delta`

### Query Parameters
- `providerProjectId` (string, required): ObjectId of provider project.
- `baselineIdA` (string, required): Baseline ID or version string for $BL_A$.
- `baselineIdB` (string, required): Baseline ID or version string for $BL_B$.

### Response DTO Contract (`ContractEvolutionDeltaDTO`)
```typescript
export interface ContractEvolutionDeltaDTO {
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
  contractDeltas: Array<{
    deltaCode: 'ENDPOINT_REMOVED' | 'ENDPOINT_DEPRECATED' | 'FIELD_REMOVED' | 'FIELD_TYPE_CHANGED' | 'FIELD_REQUIREDNESS_CHANGED' | 'ENUM_VALUE_REMOVED' | 'ENDPOINT_ADDED';
    riskTier: 'BREAKING' | 'WARNING' | 'NON_BREAKING';
    path?: string;
    method?: string;
    fieldPath?: string;
    description: string;
  }>;
  blastRadius: {
    scorePercentage: number;
    affectedConsumerProjectsCount: number;
    affectedConsumerDocumentsCount: number;
    totalTopologyProjectsCount: number;
  };
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

## 22. Frontend

### Component
`ContractEvolutionAnalyzer.tsx`

### Placement
Mounted as a dedicated tab/drawer within `SystemGovernanceGateSection.tsx`.

### Visual Elements
1. **Baseline Selector**: Dropdowns for selecting Provider Baseline A and Baseline B.
2. **Analysis Summary Header**: Displays Analysis Status (`COMPLETE` vs `UNSUPPORTED_CONTRACT_STRUCTURE`), Blast Radius Score badge (e.g. `35% Blast Radius`), and Breaking Delta count.
3. **Contract Deltas Table**: Lists structural diffs with color-coded risk badges (`BREAKING` = Red, `WARNING` = Yellow, `NON_BREAKING` = Blue).
4. **`DEPENDENCY_ORDERED_IMPACT_SEQUENCE` List**: Renders affected consumer documents grouped by graph depth ($Depth = 1, 2, 3$) with governance consequence badges.
5. **Unsupported Structure Banner**: Displays clear explanatory guidance when contract structure cannot be parsed (e.g. prose markdown).

---

## 23. Determinism

The analysis is 100% deterministic:
- Baseline lookup resolves exact immutable snapshots.
- Spec parser uses strict JSON/YAML key sorting.
- Traversal orders graph nodes deterministically.
- Output arrays sorted by `depth ASC`, `consumerProjectId ASC`, `consumerDocumentId ASC`.
- Identical repository state produces byte-for-byte identical response DTOs.

---

## 24. Performance

- **Memory**: Pure in-memory diffing of parsed endpoints/schemas ($N \le 100$ endpoints).
- **Execution Time**: $< 50\text{ms}$ total calculation time.
- **N+1 Prevention**: Batch fetches `DocumentVersion` and `DocumentRelationship` records using `$in` query filters.
- **Limits**: Traversal capped at `MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_CONSUMER_DOCUMENTS = 100`.

---

## 25. Persistence Decision

**ZERO NEW PERSISTENCE**. No new Mongoose models, collections, indexes, or snapshots. All deltas are derived on-demand from existing immutable `DocumentationBaseline` and `DocumentVersion` documents.

---

## 26. Worker Decision

**ZERO BACKGROUND WORKERS**. Calculations are synchronous, bounded, and execute on-demand within standard API request latency thresholds ($< 50\text{ms}$).

---

## 27. Audit Behavior

**READ-ONLY OPERATION $\rightarrow$ ZERO AUDIT WRITES**. Querying contract evolution deltas creates zero records in `DocumentAudit`. Existing audit records are read strictly as evidence.

---

## 28. Testing Strategy

1. **Unit Tests (`system-contract-evolution.test.ts`)**: Test spec parsing, diffing logic, risk tiering, ACL filtering, and deterministic sorting.
2. **QA Matrix Runner (`run_phase23_qa.ts`)**: Executable TSX matrix runner containing at least **35 dynamically counted scenarios**.
3. **Regression Suite**: Run Phase 22, 21, 20, 19, 18, 17, 14, 10 QA runners to verify zero regression across all prior governance phases.

---

## 29. QA Matrix (35 Scenarios)

The Phase 23 QA runner (`run_phase23_qa.ts`) will execute and assert the following 35 scenarios dynamically:

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
13. Direct downstream consumer document ($Depth = 1$) detected in impact sequence.
14. Transitive downstream consumer document ($Depth = 2$) detected in impact sequence.
15. Transitive downstream consumer document ($Depth = 3$) detected in impact sequence.
16. Topology graph depth > 3 correctly truncated at `MAX_DEPTH = 3`.
17. Topology nodes > 50 correctly truncated at `MAX_NODES = 50`.
18. Consumer documents > 100 correctly truncated at `MAX_CONSUMER_DOCUMENTS = 100`.
19. ACL isolation: Unauthorized consumer project 100% omitted from impact sequence.
20. ACL isolation: Blast radius calculation excludes unauthorized topology nodes.
21. Blast radius score percentage calculated accurately.
22. Deterministic ordering: Impact sequence sorted by `depth ASC`, `projectId ASC`, `documentId ASC`.
23. Repeated identical query produces byte-for-byte identical DTO output.
24. Zero database mutations verified across all collections during execution.
25. Zero background workers or queue tasks initialized.
26. Zero audit log writes emitted during GET contract evolution query.
27. Derived Phase 18 alignment consequence reported as `MISALIGNED`.
28. Derived Phase 19 gate consequence reported as `BLOCKED`.
29. Derived Phase 20 waiver matching correctly identifies `PASSED_WITH_WAIVER` if active waiver exists.
30. Derived Phase 10 assurance consequence reported as `STALE` / `BLOCKED`.
31. Derived Phase 11 verification check categories correctly implicated (`CONTRACT_COMPLIANCE`).
32. No task execution or work request creation occurs during analysis.
33. No automated code/file remediation occurs during analysis.
34. Unrelated projects in database remain 100% unaffected by analysis.
35. Final assertion: QA scenario count dynamically verified equal to 35.

---

## 30. Architectural Stress Test

| Stress Test Threat | Mitigation Strategy |
| :--- | :--- |
| **1. Contract Representation Insufficiency** | Fallback to `UNSUPPORTED_CONTRACT_STRUCTURE` when content is prose; zero semantic guessing. |
| **2. Duplicate Impact Engine** | Direct reuse of Phase 7.3 `document-impact-cascade.ts`. |
| **3. Duplicate Topology Engine** | Direct reuse of Phase 14 `ProjectTopologyLink` and Phase 18 alignment traversal. |
| **4. Cross-Project ACL Leakage** | Enforce Phase 14 `checkUserProjectReadAccess` before adding nodes/documents to payload. |
| **5. Task-Management Scope Drift** | Strictly enforce read-only analytical output; NO task or ticket creation. |
| **6. N+1 Query Cascade** | Batch fetch baseline snapshots, document versions, and relationships using `$in`. |

---

## 31. Security Review

- **Authentication**: JWT token required (`auth.middleware.ts`).
- **Authorization**: Phase 14 ACL rules (`checkUserProjectReadAccess`).
- **Data Isolation**: Multi-tenant project boundary strictly enforced.
- **Omission Principle**: Unauthorized entities are omitted cleanly without disclosing IDs, counts, or names.

---

## 32. Open Questions

1. *Should OpenAPI spec endpoints parsed in Phase 7.1 (`ProjectApiSpec`) be automatically linked if a document does not explicitly store raw spec content in `DocumentVersion.content`?*  
   **Resolution**: Yes. If `DocumentVersion.content` is not an inline spec, the engine checks for linked `ProjectApiSpec` records associated with the provider document.

---

## 33. Implementation Sequence

1. **Phase 23 Types & Structural Diff Service**: Implement `system-contract-evolution.types.ts` and `system-contract-evolution.service.ts`.
2. **Controller & Routes**: Implement `system-contract-evolution.controller.ts` and `system-contract-evolution.routes.ts`.
3. **Unit Tests & QA Runner**: Implement `system-contract-evolution.test.ts` and `run_phase23_qa.ts`.
4. **Frontend API & Component**: Implement `system-contract-evolution.api.ts` and `ContractEvolutionAnalyzer.tsx`.
5. **Integration & Mounted UI**: Mount `ContractEvolutionAnalyzer` in `SystemGovernanceGateSection.tsx`.

---

## 34. Verification Plan

1. **API Typecheck**: `pnpm --filter api typecheck`
2. **ESLint**: `pnpm lint`
3. **Web Build**: `pnpm --filter web build`
4. **Vitest Suite**: `pnpm test`
5. **Phase 23 QA Runner**: `run_phase23_qa.ts` (35 assertions)
6. **Regression QA**: Run Phase 22, 21, 20, 19, 18, 17, 14, 10 QA runners.
7. **Git Checks**: `git diff --check` and `git status`.

---

## 35. Acceptance Criteria

- [ ] Deterministic structural diff correctly classifies `ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_ADDED`.
- [ ] Returns `UNSUPPORTED_CONTRACT_STRUCTURE` cleanly when baseline content is plain prose markdown.
- [ ] `DEPENDENCY_ORDERED_IMPACT_SEQUENCE` correctly groups consumer documents by depth ($1, 2, 3$).
- [ ] Blast radius score percentage calculated accurately.
- [ ] Zero database mutations, zero background workers, zero audit writes during read queries.
- [ ] Phase 14 ACL rules omit 100% of unauthorized topology nodes.
- [ ] All 35 QA matrix scenarios pass dynamically.
- [ ] Web build and Vitest suite pass cleanly.
