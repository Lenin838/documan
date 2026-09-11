# Phase 28 Implementation Plan v1 — System-Wide Release Certificate Lineage & Multi-Release System Evolution Engine

> **Product Source of Truth**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)  
> **Approved Research**: [`docs/research/PHASE-28-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-28-RESEARCH.md)  
> **Status**: APPROVED RESEARCH — IMPLEMENTATION PLAN v1  

---

## 1. Product Boundary

Phase 28 establishes the **System-Wide Release Certificate Lineage & Multi-Release System Evolution Engine** ([`system-release-lineage.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage.service.ts)), providing a request-scoped, read-only analytical service and interactive governance UI ([`SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx)).

### Scope & Product Identity
Phase 27 preserves and verifies individual certified system states (`SystemReleaseCertificate`). Phase 28 provides a system-level analytical capability for:
- **Comparative Historical System Evolution Analysis**: Comparing two immutable certified system release snapshots ($Cert_A$ vs $Cert_B$) to evaluate how multi-project topology, baseline versions, technical contracts, policy waivers, and attestations evolved between governance milestones.
- **Immutable Certificate-to-Certificate Comparison**: Deterministic differential analysis comparing two frozen `SystemReleaseCertificate` snapshots without mutating historical data or re-evaluating live state.
- **Existing Supersession Lineage Traversal**: Consuming Phase 27's backward `supersedesCertificateId` relationship to reconstruct and visualize release certificate supersession lineage chains or graphs.
- **Derived Trajectory Analysis**: Computing mathematically defensible evolution trajectory metrics ($\Delta \text{AlignmentScore}$, $\Delta \text{WaiverCount}$, $\Delta \text{AttestationCoverage}$) and system evolution safety classifications (`IMPROVED`, `STABLE`, `DEGRADED`, `INDETERMINATE`).

### Explicit Prohibitions & Non-Goals
Phase 28 strictly enforces product boundaries. It MUST NOT:
- Modify, update, or overwrite existing `SystemReleaseCertificate` documents or snapshots.
- Mutate `certificateHash` values, certificate statuses, or lifecycle event histories.
- Create a new persistent lineage model, lineage schema, or lineage collection (Persistence = 0).
- Act as a competing lineage authority replacing Phase 27's `supersedesCertificateId` persistence relationship.
- Replace or override Phase 19 live system release gate evaluations (`evaluateSystemTopologyGovernanceGate`).
- Execute software deployments, CI/CD pipelines, Docker builds, or cloud infrastructure operations.
- Introduce background queue workers, cron sweep jobs, or continuous polling loops.
- Build Jira-like task boards, ticket assignment workflows, or renewal notification queues.
- Use non-deterministic AI/LLM text generation, vector databases, or semantic prose guessing.
- Create generic compliance, GRC, or regulatory questionnaire software.

---

## 2. Existing Authorities

Phase 28 operates strictly as an analytical consumer layer above existing governance authorities across Phases 10–27:

```text
[Phase 27: SystemReleaseCertificate Snapshots & supersedesCertificateId Links]
[Phase 23: system-contract-evolution.service.ts (Structural Contract Diffs)]
[Phase 18: system-baseline-alignment.service.ts (Baseline Alignment Rules)]
[Phase 19: system-topology-governance-gate.service.ts (Gate Status Concepts)]
[Phase 20: SystemGovernanceWaiver (Waiver Scopes & Blocker Classifications)]
[Phase 22: system-governance-lineage.service.ts (Historical Evidence Semantics)]
[Phase 25: system-contract-matrix.service.ts (Interop Matrix Rules)]
[Phase 26: system-contract-plan.service.ts (Candidate Action Evidence)]
                                │
                                ▼
         [Phase 28: system-release-lineage.service.ts]
         (Read-Only Multi-Release Differential & Lineage Engine)
```

| Phase Authority | Consumed Capability | Non-Duplication Constraint |
| :--- | :--- | :--- |
| **Phase 27** | `SystemReleaseCertificate` snapshots & `supersedesCertificateId` links | Sole authority for certificate persistence, snapshot integrity, and supersession links. Phase 28 consumes these records without altering them. |
| **Phase 23** | `system-contract-evolution.service.ts` | Sole authority for baseline structural contract diffing. Phase 28 invokes Phase 23 functions for project baseline version shifts ($BL_A \rightarrow BL_B$). |
| **Phase 18** | `system-baseline-alignment.service.ts` | Sole authority for cross-project baseline contract alignment evaluation formulas. Phase 28 reuses Phase 18 alignment math over snapshot data. |
| **Phase 19** | `system-topology-governance-gate.service.ts` | Sole authority for system topology release gates (`PASSED`, `BLOCKED`, `PASSED_WITH_WAIVER`). Phase 28 consumes frozen gate summaries. |
| **Phase 20** | `SystemGovernanceWaiver` | Sole authority for waiver blocker classifications (`WAIVABLE` vs `NON_WAIVABLE`). Phase 28 categorizes frozen waiver snapshots. |
| **Phase 22** | `system-governance-lineage.service.ts` | Sole authority for un-certified historical point-in-time gate timelines. Phase 28 handles `INDETERMINATE` evidence using Phase 22 semantics. |
| **Phase 25** | `system-contract-matrix.service.ts` | Sole authority for interop matrix precedence states. Phase 28 references matrix precedence definitions. |
| **Phase 26** | `system-contract-plan.service.ts` | Sole authority for change action candidate extraction. Phase 28 correlates change plan types with baseline deltas. |
| **Phase 14** | `checkUserProjectReadAccess` & `ProjectTopologyLink` | Sole authority for project topology models and ACL privacy boundaries. Phase 28 prunes unauthorized subgraphs. |

---

## 3. Certificate Comparison Model

### Selection & Validation Rules
Comparison between Certificate A (`sourceCertificateId`) and Certificate B (`targetCertificateId`) follows strict validation:

1. **Same Root System Requirement**:
   - Both certificates MUST belong to the exact same root project: `sourceCert.rootProjectId.toString() === targetCert.rootProjectId.toString()`.
   - If root project IDs differ, comparison is rejected immediately with HTTP `400 Bad Request` (`code: 'DIFFERENT_ROOT_PROJECTS_NOT_COMPARABLE'`).

2. **Chronological / Certification Ordering**:
   - The engine automatically inspects `certifiedAt` (or `createdAt`) timestamps.
   - The older certificate is designated as `SOURCE` ($Cert_A$) and the newer certificate as `TARGET` ($Cert_B$).
   - If the caller explicitly swaps IDs, the engine performs the comparison and sets `comparisonDirection: 'BACKWARD'`, maintaining mathematical consistency.

3. **Arbitrary Certificate Comparison**:
   - Any two valid `SystemReleaseCertificate` documents belonging to the same root project can be compared, regardless of whether they are directly linked by `supersedesCertificateId` or belong to different release tags/branches (e.g. `v1.0-LTS` vs `v2.0-MAIN`).

4. **Revoked & Superseded Certificates**:
   - Revoked (`certificateStatus === 'REVOKED'`) and superseded certificates remain preserved historical snapshots in Phase 27.
   - Comparative analysis over revoked or superseded certificates is fully permitted, but appends explicit status flags: `isSourceRevoked`, `isTargetRevoked`, `isSourceSuperseded`, `isTargetSuperseded` in the differential output metadata.

5. **Incomplete or Corrupted Snapshot Evidence**:
   - If a certificate snapshot payload is unparsable or missing required fields (`topologyNodes`, `projectBaselines`), the comparison returns status `INDETERMINATE` with error code `INCOMPLETE_CERTIFICATE_EVIDENCE` without throwing runtime exceptions.

---

## 4. Topology Delta

Phase 28 computes a deterministic structural comparison between `sourceCert.snapshot.topologyNodes` / `topologyLinks` and `targetCert.snapshot.topologyNodes` / `topologyLinks`.

### Topology Classification Taxonomy

```text
Source Snapshot (Cert A)                   Target Snapshot (Cert B)
┌───────────────────────┐                 ┌───────────────────────┐
│ Nodes: [P1, P2, P3]   │ ──────────────► │ Nodes: [P1, P2, P4]   │
│ Links: L(P1->P2)      │  Topology Diff  │ Links: L(P1->P2),     │
└───────────────────────┘                 │        L(P2->P4)      │
                                          └───────────────────────┘
                                                      │
                                                      ▼
                      Topology Deltas:
                      - Added Nodes: [P4]
                      - Removed Nodes: [P3]
                      - Unchanged Nodes: [P1, P2]
                      - Added Links: [L(P2->P4)]
                      - Unchanged Links: [L(P1->P2)]
```

- **`ADDED_NODE`**: Project node present in $Cert_B$ but absent in $Cert_A$.
- **`REMOVED_NODE`**: Project node present in $Cert_A$ but absent in $Cert_B$.
- **`UNCHANGED_NODE`**: Project node present in both $Cert_A$ and $Cert_B$.
- **`ADDED_LINK`**: `ProjectTopologyLink` present in $Cert_B$ but absent in $Cert_A$.
- **`REMOVED_LINK`**: `ProjectTopologyLink` present in $Cert_A$ but absent in $Cert_B$.
- **`MODIFIED_LINK`**: `ProjectTopologyLink` present in both, but link type (`DEPENDS_ON` $\rightarrow$ `PROVIDES_API_TO`) or properties changed.
- **`UNCHANGED_LINK`**: `ProjectTopologyLink` identical in both snapshots.

*Constraint*: Phase 28 does NOT create new topology links or models; it reads strictly from frozen snapshot arrays.

---

## 5. Baseline Delta

Phase 28 compares certification-time project baseline snapshots (`snapshot.projectBaselines`) across $Cert_A$ and $Cert_B$.

### Baseline Delta Taxonomy

| Delta Type | Condition | Description |
| :--- | :--- | :--- |
| **`ADDED_BASELINE`** | Project present in $Cert_B$ baselines, absent in $Cert_A$ | New project baseline added to certified system topology. |
| **`REMOVED_BASELINE`** | Project present in $Cert_A$ baselines, absent in $Cert_B$ | Project baseline removed from certified system topology. |
| **`VERSION_ADVANCED`** | Project present in both; $Cert_B$ version tag / snapshot timestamp > $Cert_A$ | Project updated to a newer baseline version ($BL_{\text{v1.0}} \rightarrow BL_{\text{v2.0}}$). |
| **`VERSION_REGRESSED`** | Project present in both; $Cert_B$ version tag / snapshot timestamp < $Cert_A$ | Project regressed to an older baseline version. |
| **`UNCHANGED_BASELINE`**| Same project ID, baseline ID, version tag, and checksum in both | Baseline unchanged between certifications. |
| **`INDETERMINATE_BASELINE`**| Baseline ID referenced in snapshot cannot be resolved in DB | Missing baseline evidence. |

*Authority Constraint*: Uses Phase 12 (`DocumentationBaseline`) and Phase 18 (`system-baseline-alignment.service.ts`) authorities rather than reconstructing live state.

---

## 6. Contract Evolution Delta

For every project baseline pair that advanced or changed between Certificate A and Certificate B (`VERSION_ADVANCED` or `VERSION_REGRESSED`), Phase 28 invokes Phase 23's authoritative contract evolution engine (`system-contract-evolution.service.ts`) to compute exact structural contract deltas between `baselineIdA` and `baselineIdB`.

### Bounded Structural Delta Taxonomy (Consumed from Phase 23)

- **`ENDPOINT_REMOVED`**: OpenAPI route deleted between baseline versions.
- **`ENDPOINT_DEPRECATED`**: OpenAPI route marked deprecated (`isDeprecated: true`).
- **`FIELD_REMOVED`**: Contract field deleted from request/response schema.
- **`FIELD_TYPE_CHANGED`**: Field type modified (e.g. `string` $\rightarrow$ `integer`).
- **`FIELD_REQUIREDNESS_CHANGED`**: Field requiredness changed (e.g. `optional` $\rightarrow$ `required`).
- **`ENUM_VALUE_REMOVED`**: Permitted enum value removed.
- **`ENDPOINT_ADDED`**: New OpenAPI route introduced.

### Architectural Rules
- **No Prose Semantic Guessing**: Only explicit, structural AST diffs produced by Phase 23 are reported. Textual prose differences produce zero fake contract deltas.
- **Direct Service Invocation**: Phase 28 calls Phase 23's `analyzeContractEvolutionInternal` directly; it does NOT duplicate AST parsing or diffing logic.

---

## 7. Waiver Evolution

Phase 28 compares certification-time policy waiver snapshots (`snapshot.waiverSnapshots`) captured in Certificate A against those in Certificate B.

### Waiver Evolution Taxonomy

- **`NEWLY_GRANTED`**: Policy waiver active in $Cert_B$ snapshot but absent in $Cert_A$.
- **`RESOLVED`**: Policy waiver active in $Cert_A$ snapshot but no longer present in $Cert_B$ (underlying blocker resolved or eliminated).
- **`CARRIED_FORWARD`**: Policy waiver active in both $Cert_A$ and $Cert_B$ snapshots with matching blocker type and target project.
- **`EXPIRED_POST_CERTIFICATION`**: Waiver was active at $Cert_A$ certification time ($T_{\text{certA}}$), but reached `expiresAt` prior to $Cert_B$ certification time ($T_{\text{certB}}$).
- **`SCOPE_CHANGED`**: Waiver present in both, but bound document ID or parameters were altered.

### Critical Rule
Phase 28 evaluates historical waiver snapshots captured at $T_{\text{certA}}$ and $T_{\text{certB}}$. It **NEVER** re-interprets historical waiver evidence using present-day $T_{\text{now}}$ waiver expiration rules.

---

## 8. Attestation / Evidence Evolution

Phase 28 compares package fulfillment attestation snapshots (`snapshot.attestationSnapshots`) captured at $T_{\text{certA}}$ against $T_{\text{certB}}$.

### Evidence Evolution Taxonomy

- **`EVIDENCE_ADDED`**: Package fulfillment attestation present in $Cert_B$ snapshot but absent in $Cert_A$.
- **`EVIDENCE_REMOVED`**: Attestation present in $Cert_A$ snapshot but absent in $Cert_B$.
- **`EVIDENCE_UNCHANGED`**: Attestation present in both snapshots with identical package ID and checksum.
- **`EVIDENCE_INDETERMINATE`**: Attestation record corrupted or unverified in snapshot.

*Constraint*: Phase 28 creates zero new attestations; it reads strictly from Phase 17 snapshot arrays.

---

## 9. Alignment Delta

Phase 28 calculates the mathematical shift in system-wide cross-project baseline contract alignment between Certificate A and Certificate B:

$$\Delta \text{AlignmentScore} = \text{AlignmentScore}(Cert_B) - \text{AlignmentScore}(Cert_A)$$

### Mathematical Rules & Formulas

1. **Snapshot Alignment Score**:
   $$\text{AlignmentScore}(Cert) = \left( \frac{N_{\text{aligned}}}{N_{\text{applicable}}} \right) \times 100$$
   where:
   - $N_{\text{applicable}}$ = total number of cross-project `DEPENDS_ON` technical contract pairs present in the certificate's authorized topology snapshot.
   - $N_{\text{aligned}}$ = number of applicable contract pairs where provider and consumer baseline versions are aligned (`ALIGNED`).
   - Score is rounded to 1 decimal place.

2. **Zero-Applicable Evidence Rule**:
   - If $N_{\text{applicable}} = 0$ for either $Cert_A$ or $Cert_B$, the system reports `alignmentScore: null` for that certificate and `deltaAlignmentScore: null`.
   - The result is explicitly flagged with `statusReason: 'ZERO_APPLICABLE_EVIDENCE'`.
   - The system **NEVER** falsely reports 100% alignment when zero applicable contract pairs exist.

3. **Historical Isolation**:
   - Alignment scores are computed strictly over frozen snapshot data. Phase 28 **NEVER** substitutes current live alignment at $T_{\text{now}}$.

---

## 10. Waiver Reliance Delta

Phase 28 evaluates the system's reliance on policy waivers between Certificate A and Certificate B:

$$\Delta \text{WaiverCount} = N_{\text{waivers}}(Cert_B) - N_{\text{waivers}}(Cert_A)$$

$$\text{WaiverRelianceRatio}(Cert) = \frac{N_{\text{waivers}}}{N_{\text{evaluatedDependencies}}}$$

### Metric Interpretation Rules
- **Raw Count Alone Is Insufficient**: A decrease in raw waiver count ($\Delta \text{WaiverCount} < 0$) does NOT automatically mean a system improved if project nodes were removed from the topology or if baseline coverage dropped.
- **Waiver Reliance Ratio**: Evaluates active waivers relative to total evaluated dependencies to detect true tech-debt reduction versus topology shrinkage.

---

## 11. Trajectory Classification

Phase 28 applies a multi-factorial, deterministic evaluation rule to classify the overall system evolution safety trajectory between Certificate A and Certificate B:

```text
                                  Trajectory Evaluation
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
         [IMPROVED]                      [STABLE]                    [DEGRADED]
  - ΔAlignment > 0               - ΔAlignment = 0             - ΔAlignment < 0
  - ΔWaiverCount ≤ 0             - ΔWaiverCount = 0           - ΔWaiverCount > 0
  - Breaking Deltas = 0          - Breaking Deltas = 0        - Breaking Deltas > 0
  - Non-waivable = 0             - Topology Unchanged         - Non-waivable > 0
```

### Deterministic Trajectory Taxonomy

1. **`IMPROVED`**:
   - Alignment score increased ($\Delta \text{AlignmentScore} > 0$), AND
   - Waiver count decreased or stayed equal ($\Delta \text{WaiverCount} \le 0$), AND
   - Zero breaking contract deltas (`ENDPOINT_REMOVED`, `FIELD_TYPE_CHANGED`) introduced, AND
   - Zero non-waivable gate blockers present.

2. **`DEGRADED`**:
   - Alignment score decreased ($\Delta \text{AlignmentScore} < 0$), OR
   - Waiver count increased ($\Delta \text{WaiverCount} > 0$) without a proportional alignment score gain, OR
   - One or more breaking structural contract deltas (`ENDPOINT_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REMOVED`, `ENUM_VALUE_REMOVED`) introduced between baselines, OR
   - System gate status regressed from `PASSED` to `BLOCKED`.

3. **`STABLE`**:
   - Zero change in alignment score ($\Delta \text{AlignmentScore} = 0$), AND
   - Zero change in waiver count ($\Delta \text{WaiverCount} = 0$), AND
   - Zero breaking contract deltas, AND
   - Topology and baseline version tags remain unchanged.

4. **`INDETERMINATE`**:
   - Either certificate contains zero applicable contract evidence ($N_{\text{applicable}} = 0$), OR
   - Snapshot payload contains corrupted or incomplete evidence.

### Conflicting Signal Resolution
If signals conflict (e.g. Alignment score increased by +10%, but Waiver count also increased by +2):
- The trajectory is classified as **`DEGRADED`** (safety-first default) or **`MIXED_EVOLUTION`**, with explicit boolean flags exposing signal breakdowns (`alignmentImproved: true`, `waiverRelianceIncreased: true`, `breakingContractDeltasPresent: false`).

---

## 12. Supersession Lineage

Phase 28 reconstructs and visualizes the backward release certificate supersession lineage by consuming Phase 27's existing `supersedesCertificateId` relationship.

### Lineage Traversal & Construction Rules

```text
[Cert v2.1 (Active Head)]
      │ supersedesCertificateId
      ▼
[Cert v2.0 (Superseded)]
      │ supersedesCertificateId
      ▼
[Cert v1.5 (Superseded)] ──► supersedesCertificateId: null (Root Node)
```

1. **Backward Traversal**: Starts from a specified target certificate (or the latest active certificate for a root project) and recursively follows `supersedesCertificateId` pointers backwards (Newer $\rightarrow$ Older).
2. **Sequential Ordering**: Outputs an ordered array `lineageNodes` starting from the active head certificate down to the origin root certificate.
3. **Termination Criteria**: Traversal terminates when:
   - `supersedesCertificateId` is `null` / `undefined` (Root certificate reached), OR
   - The referenced parent certificate is not found in MongoDB (`hasMissingParent: true`, status `TERMINATED_INCOMPLETE`), OR
   - The maximum traversal depth limit is reached (`maxDepth: 20`).
4. **Cycle Protection**: Maintains a `Set<string>` of visited certificate IDs during traversal. If a cycle is detected, traversal halts immediately, sets `hasCycleDetected: true`, and returns the valid chain traversed so far.
5. **ACL Filtering**: Every node in the lineage chain is filtered against Phase 14 project ACL checks (`checkUserProjectReadAccess`).
6. **Zero Persistence Constraint**: Phase 28 introduces **NO NEW PERSISTENCE MODEL**. It reads strictly from Phase 27's existing `supersedesCertificateId` field. Any visual tree or graph layout rendered in the UI is strictly a presentation/analysis representation.

---

## 13. ACL / Privacy

Phase 28 strictly enforces ACL-first privacy filtering to prevent unauthorized data exposure across multi-project release comparisons.

### Permission Rules & Graph Pruning

1. **Root Project Permission**: Requesting user MUST have `READ` permission on the root project (`checkUserProjectReadAccess`). If unauthorized, return HTTP `403 Forbidden`.
2. **Connected Project Subgraph Pruning**:
   - When generating a comparison between $Cert_A$ and $Cert_B$, Phase 28 evaluates the requesting user's current live read authorization ($T_{\text{now}}$) for every project node in the topology snapshots.
   - Any project node for which the user lacks `READ` access is **100% omitted** from the comparison output:
     - Omitted from `topologyNodes` and `topologyLinks`.
     - Omitted from `baselineDeltas` and `contractDeltas`.
     - Omitted from `waiverDeltas` and `attestationDeltas`.
3. **Zero Data Leakage Guarantee**:
   - Unauthorized project IDs, certificate IDs, document titles, version tags, waiver target IDs, and contract endpoints are strictly omitted.
   - Zero placeholders, zero obfuscated strings (e.g. `"RESTRICTED_PROJECT"`), and zero count leakage.
4. **Subgraph Metric Calculation**:
   - Alignment scores ($\Delta \text{AlignmentScore}$) and waiver metrics ($\Delta \text{WaiverCount}$) are calculated strictly over the user's authorized topology subgraph.

---

## 14. Persistence

### Research Finding: Zero New Persistence (Persistence = 0)

Phase 28 introduces:
- **0** new Mongoose models
- **0** new database collections
- **0** database schema modifications
- **0** background worker threads or cron sweep jobs
- **0** database write operations during query execution

Phase 28 operates as a 100% request-scoped, read-only analytical service (`system-release-lineage.service.ts`). It ingests existing `SystemReleaseCertificate` records from MongoDB, performs in-memory pure AST diffing and trajectory calculations, and returns transient DTO responses.

---

## 15. API Design

Phase 28 exposes a focused, minimal REST API surface integrated into the existing governance router ([`governance.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/governance.routes.ts)).

### Endpoint Specifications

#### 1. Compare System Release Certificates
- **HTTP Method**: `POST`
- **Route**: `/api/v1/release-certificates/compare`
- **Authorization**: `protect` (JWT required), `READ` access on root project.
- **Request Body**:
  ```json
  {
    "sourceCertificateId": "650f1a2b3c4d5e6f7a8b9c0d",
    "targetCertificateId": "650f1a2b3c4d5e6f7a8b9c0e"
  }
  ```
- **Response Shape** (`SystemReleaseDifferentialDTO`):
  ```json
  {
    "success": true,
    "data": {
      "comparisonMetadata": {
        "sourceCertificateId": "650f1a2b3c4d5e6f7a8b9c0d",
        "sourceReleaseTag": "REL-2026.1",
        "sourceCertifiedAt": "2026-06-01T10:00:00.000Z",
        "targetCertificateId": "650f1a2b3c4d5e6f7a8b9c0e",
        "targetReleaseTag": "REL-2026.2",
        "targetCertifiedAt": "2026-09-01T10:00:00.000Z",
        "rootProjectId": "650f1a2b3c4d5e6f7a8b9c00",
        "comparisonDirection": "FORWARD",
        "isSourceRevoked": false,
        "isTargetRevoked": false,
        "isSourceSuperseded": true,
        "isTargetSuperseded": false
      },
      "trajectory": {
        "classification": "IMPROVED",
        "deltaAlignmentScore": 12.5,
        "deltaWaiverCount": -2,
        "deltaAttestationCount": 3,
        "hasBreakingContractDeltas": false,
        "evaluationStatus": "COMPLETE"
      },
      "topologyDeltas": {
        "addedNodes": [],
        "removedNodes": [],
        "unchangedNodes": ["650f1a2b3c4d5e6f7a8b9c00", "650f1a2b3c4d5e6f7a8b9c01"],
        "addedLinks": [],
        "removedLinks": [],
        "unchangedLinks": []
      },
      "baselineDeltas": [],
      "contractDeltas": [],
      "waiverDeltas": [],
      "attestationDeltas": []
    }
  }
  ```
- **HTTP Status Codes**:
  - `200 OK`: Successful comparative analysis.
  - `400 Bad Request`: Missing IDs or non-matching root projects (`DIFFERENT_ROOT_PROJECTS_NOT_COMPARABLE`).
  - `403 Forbidden`: User lacks read access on root project.
  - `404 Not Found`: Certificate ID not found.
- **Justification for POST**: Ingests complex multi-ID JSON comparison parameters cleanly per Documan API conventions (Phases 15, 16, 21, 26, 27).

#### 2. Get Certificate Supersession Lineage Chain / Graph
- **HTTP Method**: `GET`
- **Route**: `/api/v1/projects/:projectId/release-certificates/lineage`
- **Authorization**: `protect` (JWT required), `READ` access on `projectId`.
- **Query Parameters**:
  - `headCertificateId` (optional string): Start traversal from specific certificate.
  - `maxDepth` (optional integer, default 20, max 20): Maximum depth to traverse.
- **Response Shape** (`SupersessionLineageGraphDTO`):
  ```json
  {
    "success": true,
    "data": {
      "rootProjectId": "650f1a2b3c4d5e6f7a8b9c00",
      "headCertificateId": "650f1a2b3c4d5e6f7a8b9c0e",
      "lineageNodes": [
        {
          "certificateId": "650f1a2b3c4d5e6f7a8b9c0e",
          "releaseTag": "REL-2026.2",
          "certifiedAt": "2026-09-01T10:00:00.000Z",
          "certificateStatus": "ACTIVE",
          "supersedesCertificateId": "650f1a2b3c4d5e6f7a8b9c0d",
          "depth": 0
        },
        {
          "certificateId": "650f1a2b3c4d5e6f7a8b9c0d",
          "releaseTag": "REL-2026.1",
          "certifiedAt": "2026-06-01T10:00:00.000Z",
          "certificateStatus": "SUPERSEDED",
          "supersedesCertificateId": null,
          "depth": 1
        }
      ],
      "traversalMetadata": {
        "totalNodesTraversed": 2,
        "maxDepthReached": false,
        "hasCycleDetected": false,
        "hasMissingParent": false,
        "status": "COMPLETE"
      }
    }
  }
  ```
- **HTTP Status Codes**:
  - `200 OK`: Successful lineage chain traversal.
  - `403 Forbidden`: User lacks read access on project.
  - `404 Not Found`: Project not found.

---

## 16. UI Design

Phase 28 introduces a dedicated, focused frontend component ([`SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx)) integrated into the Project Details page's Governance section.

### Layout & Components

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◄ Governance / Release Certificate Lineage & Evolution                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Supersession Lineage Chain / Graph                                          │
│ ┌──────────────┐    supersedes    ┌──────────────┐    supersedes   ┌───────┐│
│ │ REL-2026.2   │ ───────────────► │ REL-2026.1   │ ──────────────►│ REL-v1││
│ │ (ACTIVE)     │                  │ (SUPERSEDED) │                │ (ROOT)││
│ └──────────────┘                  └──────────────┘                └───────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ Certificate Comparison Workbench                                            │
│ Source Certificate: [ REL-2026.1 (2026-06-01) ▼ ]                           │
│ Target Certificate: [ REL-2026.2 (2026-09-01) ▼ ] [ Compare Certificates ]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Trajectory Summary Card                                                     │
│ Trajectory: [ IMPROVED ] | Δ Alignment: +12.5% | Δ Waivers: -2 | Contracts: 0│
├─────────────────────────────────────────────────────────────────────────────┤
│ [ Topology Deltas ] [ Baseline Deltas ] [ Contract Diffs ] [ Waiver Deltas ]│
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Baseline Version Advances:                                              │ │
│ │ - Project Alpha: BL_v1.0 ──► BL_v2.0 (VERSION_ADVANCED)                 │ │
│ │ - Structural Contract Diffs: 1 ENDPOINT_ADDED, 0 ENDPOINT_REMOVED       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Lineage Navigation Chain**: Visual horizontal node chain rendering the `supersedesCertificateId` backward chain with status badges (`ACTIVE`, `SUPERSEDED`, `REVOKED`).
- **Comparison Controls**: Dropdown selectors for source and target certificates with "Compare Certificates" trigger.
- **Trajectory Card**: Highlights trajectory classification (`IMPROVED`, `STABLE`, `DEGRADED`) with metric shifts ($\Delta \text{AlignmentScore}$, $\Delta \text{WaiverCount}$).
- **Tabbed Differential Panels**: Detailed views for Topology Deltas, Baseline Deltas, Structural Contract Diffs (Phase 23), Waiver Evolution, and Attestation Deltas.

*Constraint*: Contains NO drag-and-drop canvas editing, task boards, or deployment buttons.

---

## 17. Performance / Bounds

Phase 28 enforces strict processing bounds to prevent memory saturation and N+1 database queries:

| Metric Boundary | Enforced Limit | Enforcement Action |
| :--- | :--- | :--- |
| **`MAX_AUTHORIZED_PROJECTS`** | 50 projects | Truncates topology analysis; sets `status: 'PARTIAL'`. |
| **`MAX_TOPOLOGY_EDGES`** | 100 links | Truncates link processing; sets `status: 'PARTIAL'`. |
| **`MAX_LINEAGE_DEPTH`** | 20 depth levels | Halts lineage traversal at 20 steps; sets `maxDepthReached: true`. |
| **`MAX_CONTRACT_DIFF_BASELINES`** | 30 project baselines | Limits Phase 23 contract AST diffs to 30 baseline pairs per query. |

### N+1 Query Mitigation Strategy
- Single bulk Mongoose query using `$in` to fetch Certificate A, Certificate B, and all referenced `DocumentationBaseline` records in a single database round-trip.
- Async parallel execution (`Promise.all`) for Phase 23 pure in-memory AST contract diffing.

---

## 18. Error / Indeterminate Semantics

Phase 28 uses an explicit categorical status model for all differential and lineage query results:

- **`COMPLETE`**: Full comparative evidence available and evaluated across all authorized topology nodes.
- **`PARTIAL`**: Evaluation completed over an authorized subset of topology (unauthorized project nodes pruned by ACL check).
- **`INDETERMINATE`**: Comparison includes zero applicable contract dependencies ($N_{\text{applicable}} = 0$) or corrupted snapshot data.
- **`UNSUPPORTED`**: Non-matching root projects (`DIFFERENT_ROOT_PROJECTS_NOT_COMPARABLE`).

*Invariant*: Historical comparative analysis MUST NEVER invent evidence or assume defaults when data is unavailable.

---

## 19. QA Plan

Phase 28 will be verified through a comprehensive **56-scenario automated QA test suite** (`tests/qa/run_phase28_qa.ts`) and Vitest unit test suite.

### Automated QA Scenario Roster (56 Scenarios)

#### Certificate Selection & Validation (Scenarios 1–5)
1. Ingest valid Certificate A and Certificate B for same root project $\rightarrow$ `200 OK`.
2. Ingest certificates from different root projects $\rightarrow$ `400 Bad Request` (`DIFFERENT_ROOT_PROJECTS_NOT_COMPARABLE`).
3. Ingest non-existent Certificate ID $\rightarrow$ `404 Not Found`.
4. Ingest revoked Certificate A and active Certificate B $\rightarrow$ `200 OK` with `isSourceRevoked: true`.
5. Compare certificate against itself (same ID) $\rightarrow$ `200 OK`, `STABLE` trajectory, 0 deltas.

#### Topology Delta Evaluation (Scenarios 6–10)
6. Detect `ADDED_NODE` in Certificate B topology snapshot.
7. Detect `REMOVED_NODE` from Certificate A topology snapshot.
8. Detect `ADDED_LINK` and `REMOVED_LINK` between topology snapshots.
9. Detect `MODIFIED_LINK` relationship type change.
10. Evaluate identical topology snapshots $\rightarrow$ 0 topology deltas.

#### Baseline Delta Evaluation (Scenarios 11–15)
11. Detect `VERSION_ADVANCED` ($BL_{\text{v1.0}} \rightarrow BL_{\text{v2.0}}$) across project baselines.
12. Detect `VERSION_REGRESSED` baseline shift.
13. Detect `ADDED_BASELINE` in Certificate B.
14. Detect `REMOVED_BASELINE` from Certificate A.
15. Evaluate unchanged project baselines $\rightarrow$ `UNCHANGED_BASELINE`.

#### Contract Evolution Diffing & Phase 23 Integration (Scenarios 16–20)
16. Verify `ENDPOINT_REMOVED` structural delta reported via Phase 23 invocation.
17. Verify `FIELD_TYPE_CHANGED` structural delta reported via Phase 23.
18. Verify `ENDPOINT_ADDED` structural delta reported via Phase 23.
19. Verify plain markdown prose changes produce 0 false contract deltas.
20. Verify Phase 23 AST diffing errors gracefully caught as `INDETERMINATE_CONTRACT_DIFF`.

#### Waiver Evolution Categorization (Scenarios 21–25)
21. Categorize `NEWLY_GRANTED` waiver present in $Cert_B$ only.
22. Categorize `RESOLVED` waiver present in $Cert_A$ only.
23. Categorize `CARRIED_FORWARD` waiver present in both snapshots.
24. Categorize `EXPIRED_POST_CERTIFICATION` waiver expiring between $T_{\text{certA}}$ and $T_{\text{certB}}$.
25. Verify historical $T_{\text{certA}}$ waiver snapshot is NEVER re-evaluated using live $T_{\text{now}}$ expiration.

#### Attestation Evidence Deltas (Scenarios 26–30)
26. Detect `EVIDENCE_ADDED` attestation snapshot in $Cert_B$.
27. Detect `EVIDENCE_REMOVED` attestation snapshot from $Cert_A$.
28. Detect `EVIDENCE_UNCHANGED` attestation snapshot.
29. Verify zero new attestation database writes occur during comparison.
30. Handle corrupt attestation checksum as `EVIDENCE_INDETERMINATE`.

#### Alignment Metric & Shift Calculations (Scenarios 31–35)
31. Calculate positive $\Delta \text{AlignmentScore}$ (+15.0%).
32. Calculate negative $\Delta \text{AlignmentScore}$ (-10.0%).
33. Zero-applicable evidence network ($N_{\text{applicable}} = 0$) $\rightarrow$ `alignmentScore: null`, `deltaAlignmentScore: null`.
34. Verify alignment calculations strictly use snapshot baselines, not live $T_{\text{now}}$ baselines.
35. Verify rounding to 1 decimal place.

#### Waiver Reliance Shift & Trajectory Classification (Scenarios 36–40)
36. Classify `IMPROVED` trajectory ($\Delta \text{Alignment} > 0$, $\Delta \text{Waivers} \le 0$, 0 breaking deltas).
37. Classify `DEGRADED` trajectory (breaking contract delta introduced).
38. Classify `DEGRADED` trajectory (alignment dropped, waivers increased).
39. Classify `STABLE` trajectory (zero changes across all dimensions).
40. Handle conflicting signals as `DEGRADED` safety-first default with signal flags.

#### Supersession Lineage Traversal (Scenarios 41–45)
41. Traverse 3-node linear supersession chain ($Cert_C \rightarrow Cert_B \rightarrow Cert_A$) $\rightarrow$ `200 OK`.
42. Traverse lineage with missing parent ID $\rightarrow$ `hasMissingParent: true`, status `TERMINATED_INCOMPLETE`.
43. Traverse lineage with self-referencing cycle $\rightarrow$ `hasCycleDetected: true`, halts immediately.
44. Enforce `maxDepth: 20` traversal bound $\rightarrow$ `maxDepthReached: true`.
45. Verify zero new persistence records created during lineage traversal.

#### ACL Pruning & Security Privacy (Scenarios 46–50)
46. Unauthorized root project $\rightarrow$ `403 Forbidden`.
47. Unauthorized connected project node strictly omitted from differential output (0 data leakage).
48. Unauthorized project topology links strictly omitted from output.
49. IDOR attempt using random certificate ID $\rightarrow$ `404 Not Found` or `403 Forbidden`.
50. Verify unauthorized project IDs, titles, and version tags leave zero trace in JSON.

#### Performance, Bounds & Regression (Scenarios 51–56)
51. Evaluate 50-project topology comparison under 200ms threshold.
52. Verify bulk `$in` query prevents N+1 database queries.
53. Verify zero database writes occur across all Phase 28 API calls.
54. Regression: Phase 19 system gate evaluator unaffected.
55. Regression: Phase 20 waiver matcher unaffected.
56. Regression: Phase 27 certificate issuance and snapshot verification 100% healthy.

---

## 20. Security

### Threat Modeling & Protections

1. **Unauthorized Access to Root Project**:
   - `checkUserProjectReadAccess` is invoked prior to executing any differential or lineage logic. Unauthorized requests fail immediately with `403 Forbidden`.
2. **Cross-Project Subgraph Information Leakage**:
   - In multi-project topology comparisons, any connected project for which the user lacks `READ` permission is completely pruned from response nodes, edges, baselines, contract diffs, and waivers.
3. **IDOR & Certificate Guessing**:
   - Certificate IDs passed in request bodies or URL parameters are validated against root project ownership and user ACL boundaries. Non-accessible certificates return `404 Not Found` or `403 Forbidden`.
4. **Historical Snapshot Privacy**:
   - Historical snapshots preserved inside certificates remain protected by live $T_{\text{now}}$ ACL evaluation, ensuring that revoking a user's project access revokes their access to historical certificate snapshots containing that project.

---

## 21. Architectural Invariants

Implementation MUST adhere to the following 10 mandatory invariants:

1. **Zero Database Writes**: Phase 28 performs strictly 0 database write operations (`create`, `update`, `delete`).
2. **Zero Certificate Mutations**: Phase 28 NEVER mutates `SystemReleaseCertificate` documents or snapshot payloads.
3. **Immutable Hashes**: Phase 28 NEVER recalculates or alters `certificateHash` values.
4. **Zero Persistence Overhead**: Phase 28 introduces 0 new Mongoose models, collections, or schemas.
5. **No Live State Substitution**: Phase 28 NEVER evaluates current live state ($T_{\text{now}}$) as historical certified state ($T_{\text{cert}}$).
6. **No Gate Replacement**: Phase 28 NEVER replaces or bypasses Phase 19 system topology gate evaluations.
7. **Frozen Waiver Expiration**: Phase 28 NEVER re-interprets historical waiver snapshots using live Phase 20 expiration status.
8. **Phase 23 AST Reuse**: Phase 28 consumes Phase 23's contract evolution service rather than duplicating AST diffing.
9. **Phase 27 Link Reuse**: Phase 28 consumes Phase 27's `supersedesCertificateId` links rather than creating a new lineage authority.
10. **100% Deterministic Output**: Identical certificate inputs produce 100% identical differential and trajectory outputs across execution runs.

---

## 22. Implementation Sequencing

Implementation will proceed in 7 strictly sequential steps:

```text
Step 1: TypeScript Types & DTOs (system-release-lineage.types.ts)
  │
  ▼
Step 2: Pure Comparison Helpers (system-release-lineage-helpers.ts + Unit Tests)
  │
  ▼
Step 3: Core Service Layer (system-release-lineage.service.ts + Integration Tests)
  │
  ▼
Step 4: Controller & Express Routes (system-release-lineage.controller.ts, governance.routes.ts)
  │
  ▼
Step 5: Frontend UI Component (SystemReleaseLineageView.tsx + API Client)
  │
  ▼
Step 6: Automated QA Test Suite (tests/qa/run_phase28_qa.ts - 56 Scenarios)
  │
  ▼
Step 7: Verification & Walkthrough (Typecheck, Lint, Build, PHASE-28-WALKTHROUGH.md)
```

### Module Responsibilities

1. **`system-release-lineage.types.ts`**: Defines `SystemReleaseDifferentialDTO`, `SupersessionLineageGraphDTO`, `TopologyDeltaDTO`, `BaselineDeltaDTO`, `WaiverDeltaDTO`, `TrajectorySummaryDTO`.
2. **`system-release-lineage-helpers.ts`**: Pure helper functions (`diffTopologySnapshots`, `diffBaselineSnapshots`, `diffWaiverSnapshots`, `diffAttestationSnapshots`, `calculateTrajectoryMetrics`) independently unit-tested with Vitest.
3. **`system-release-lineage.service.ts`**: Main orchestrator implementing `compareReleaseCertificates` and `getCertificateLineageGraph`.
4. **`system-release-lineage.controller.ts`**: HTTP controllers handling request parsing, authentication middleware integration, and response formatting.
5. **`SystemReleaseLineageView.tsx`**: Web frontend React component rendering supersession lineage chains, side-by-side comparison controls, trajectory cards, and tabbed differential details.

---

## 23. Open Architectural Questions

The following questions will be finalized during Phase 28 implementation:

1. **Asymmetric Project Sets & Trajectory Score Normalization**:
   - *Question*: When Certificate B contains 5 new projects not present in Certificate A, should $\Delta \text{AlignmentScore}$ be normalized over the intersection of projects ($P_A \cap P_B$) or the union ($P_A \cup P_B$)?
   - *Resolution*: The alignment score shift is computed over the respective authorized topology for each certificate. The trajectory classifier checks `addedNodes` and `removedNodes` separately so asymmetric topology changes are explicitly flagged.

2. **Non-Sequential Tag Distance Metadata**:
   - *Question*: How should the API indicate whether two compared certificates are direct supersession partners versus distant release milestones?
   - *Resolution*: The comparison response includes `supersessionPathDistance: number | null` (indicating the number of backward `supersedesCertificateId` steps between them if directly linked, or `null` if unlinked/cross-branch).

3. **Display Representation vs Persistence**:
   - *Question*: How to ensure UI users understand that the visual lineage graph is a derived analytical view and not a new database entity?
   - *Resolution*: The UI banner explicitly states: `"DERIVED ANALYTICAL LINEAGE reconstructed from Phase 27 supersedesCertificateId links"`.

---

## 24. Acceptance Criteria

Phase 28 will be deemed 100% complete when all of the following measurable criteria are met:

1. **Typescript Verification**: `pnpm typecheck` passes with **0 errors**.
2. **ESLint Verification**: `pnpm lint` passes with **0 errors**.
3. **Unit Tests**: 100% of Vitest unit tests in `system-release-lineage-helpers.test.ts` and `system-release-lineage.service.test.ts` pass cleanly.
4. **Automated QA Suite**: 56/56 scenarios in `tests/qa/run_phase28_qa.ts` pass cleanly.
5. **Production Web Build**: `pnpm build` completes with **0 errors**.
6. **Zero Write Verification**: Confirmed 0 database writes occur across all Phase 28 endpoints.
7. **Regression Health**: Full test suites for Phase 10 through Phase 27 remain 100% passing.

---

## 25. Final Scope

### Expected Files Created / Modified

| File Path | Action | Description |
| :--- | :--- | :--- |
| `apps/api/src/modules/governance/system-release-lineage.types.ts` | **[NEW]** | TypeScript DTOs and interface definitions. |
| `apps/api/src/modules/governance/system-release-lineage-helpers.ts` | **[NEW]** | Pure comparison and trajectory calculation functions. |
| `apps/api/src/modules/governance/system-release-lineage-helpers.test.ts` | **[NEW]** | Vitest unit tests for comparison helpers. |
| `apps/api/src/modules/governance/system-release-lineage.service.ts` | **[NEW]** | Core read-only differential & lineage service. |
| `apps/api/src/modules/governance/system-release-lineage.service.test.ts` | **[NEW]** | Vitest integration tests for lineage service. |
| `apps/api/src/modules/governance/system-release-lineage.controller.ts` | **[NEW]** | Express HTTP controller endpoints. |
| `apps/api/src/modules/governance/governance.routes.ts` | **[MODIFY]** | Registers Phase 28 REST API routes. |
| `apps/web/src/features/governance/SystemReleaseLineageView.tsx` | **[NEW]** | Interactive React UI component. |
| `apps/web/src/features/governance/governance.api.ts` | **[MODIFY]** | Frontend API client methods for Phase 28. |
| `tests/qa/run_phase28_qa.ts` | **[NEW]** | 56-scenario automated QA test suite. |

### Summary of Impacts
- **Persistence Impact**: **0 new models, 0 schema changes, 0 database writes**.
- **API Surface**: 2 new endpoints (`POST /release-certificates/compare`, `GET /projects/:projectId/release-certificates/lineage`).
- **UI Impact**: 1 new focused React view (`SystemReleaseLineageView.tsx`).
- **QA Impact**: 56 automated QA scenarios covering comparative diffing, trajectory math, lineage traversal, ACL privacy, and performance bounds.
