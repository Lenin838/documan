# Phase 28 Implementation Plan v2 — System-Wide Release Certificate Lineage & Multi-Release System Evolution Engine

> **Product Source of Truth**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)  
> **Approved Research**: [`docs/research/PHASE-28-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-28-RESEARCH.md)  
> **Previous Plan**: [`docs/research/PHASE-28-IMPLEMENTATION-PLAN-v1.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-28-IMPLEMENTATION-PLAN-v1.md)  
> **Status**: APPROVED RESEARCH — IMPLEMENTATION PLAN v2 (FINAL REVIEW REVISIONS)  

---

## 1. Executive Summary & Review Clarifications

Phase 28 establishes the **System-Wide Release Certificate Lineage & Multi-Release System Evolution Engine** ([`system-release-lineage.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage.service.ts)), providing a request-scoped, read-only analytical query service and interactive governance view ([`SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx)).

Phase 27 preserves and verifies individual certified system states ([`SystemReleaseCertificate`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts)). Phase 28 introduces a multi-release comparative evolution analysis capability to compare those immutable certified states across governance milestones and reconstruct their existing backward supersession lineage chains / graphs.

### Architectural Advances & Review Clarifications Resolved in Plan v2

1. **Strict Historical Evidence — No Live-State Substitution**:
   - Every Phase 28 comparison dimension (topology, baselines, contract evolution, waivers, attestations, alignment, trajectory) MUST use historical evidence available directly from the frozen certificate snapshots (`ISystemReleaseSnapshot`) and/or explicitly referenced historical database records (`DocumentationBaseline`, `DocumentVersion`).
   - Phase 28 NEVER substitutes current/live Phase 18, 19, 20, or 23 database state for historical certificate state.
   - If required historical evidence cannot be deterministically reconstructed, the engine returns status `INDETERMINATE` or `UNSUPPORTED` according to defined evidence rules; it NEVER silently falls back to current live state.

2. **Historical Alignment Score Reconstruction**:
   - $\Delta \text{AlignmentScore}$ is reconstructed deterministically from frozen snapshot data:
     $$\Delta \text{AlignmentScore} = \text{AlignmentScore}(Cert_B) - \text{AlignmentScore}(Cert_A)$$
   - `AlignmentScore(A)` and `AlignmentScore(B)` are extracted directly from `snapshot.evidenceSummary.systemAlignmentScore` frozen at $T_{\text{cert}}$.
   - If `totalApplicableContracts === 0` ($N_{\text{applicable}} = 0$) in either certificate snapshot:
     - The engine sets `deltaAlignmentScore = null` and flags `statusReason: 'ZERO_APPLICABLE_EVIDENCE'`.
     - Trajectory evaluation treats $N_{\text{applicable}} = 0$ as `INDETERMINATE` evidence, preventing false 0% or 100% interpretations.
   - Zero live queries to Phase 18 (`system-baseline-alignment.service.ts`) are performed during comparison.

3. **Historical Contract-Evolution Input Contract**:
   - Structural contract evolution is computed by feeding historical inputs directly into Phase 23's canonical parser (`parseAndCanonicalizeContract`):
     - $Cert_A \rightarrow$ frozen `activeBaselines` entry $\rightarrow$ historical `DocumentationBaseline` $\rightarrow$ historical `DocumentVersion` structured OpenAPI content.
     - $Cert_B \rightarrow$ frozen `activeBaselines` entry $\rightarrow$ historical `DocumentationBaseline` $\rightarrow$ historical `DocumentVersion` structured OpenAPI content.
     - Inputs fed directly into Phase 23 structural diffing (`system-contract-evolution.service.ts`).
   - Zero prose semantic guessing, zero runtime API inference, zero live-document substitution.
   - If historical document version content is missing or unparseable, returns `INDETERMINATE_HISTORICAL_EVIDENCE`; if non-OpenAPI format, returns `UNSUPPORTED_CONTRACT_STRUCTURE`.

4. **Lineage ACL Semantics & Privacy Protection**:
   - An unauthorized certificate or project MUST be completely indistinguishable from a non-existent certificate or project to the requesting user.
   - If a lineage node's root project is unauthorized via `checkUserProjectReadAccess`:
     - Lineage traversal halts/prunes immediately at the authorized boundary.
     - Exposes **0** node IDs, **0** metadata strings, **0** node counts, **0** project titles, **0** "restricted" placeholders, and **0** depth leakage.
     - The response exposes only the contiguous chain of authorized nodes leading up to the boundary.

5. **Pure Deterministic Trajectory Precedence Hierarchy**:
   - Trajectory classification follows a strict, pure 4-tier evaluation order (`INDETERMINATE` > `DEGRADED` > `IMPROVED` > `STABLE`), completely eliminating subjective UI interpretations.

6. **Repository-Grounded Schema Alignment**:
   - All plan references use exact Phase 27 schema properties: `snapshot.topologyNodes`, `snapshot.topologyEdges`, `snapshot.activeBaselines`, `snapshot.activeAttestations`, `snapshot.activeWaivers`, `snapshot.evidenceSummary`.

---

## 2. Product Boundary

Phase 28 operates strictly within established product boundaries.

### Scope & Product Identity
Phase 28 provides a system-level analytical capability for:
- **Comparative Historical System Evolution Analysis**: Comparing two immutable certified system release snapshots ($Cert_A$ vs $Cert_B$) to evaluate how multi-project topology, baseline versions, technical contracts, policy waivers, and attestations evolved between governance milestones.
- **Immutable Certificate-to-Certificate Comparison**: Deterministic differential analysis comparing two frozen `SystemReleaseCertificate` snapshots without mutating historical data or re-evaluating live state.
- **Existing Supersession Lineage Traversal**: Consuming Phase 27's backward `supersedesCertificateId` relationship to reconstruct and visualize release certificate supersession lineage chains or graphs.
- **Derived Trajectory Analysis**: Computing mathematically defensible evolution trajectory metrics ($\Delta \text{AlignmentScore}$, $\Delta \text{WaiverCount}$, $\Delta \text{AttestationCoverage}$) and system evolution safety classifications (`IMPROVED`, `STABLE`, `DEGRADED`, `INDETERMINATE`).

### Explicit Prohibitions & Non-Goals
Phase 28 MUST NOT:
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

## 3. Existing Authorities & Repository Grounding

Phase 28 operates as an analytical consumer layer above existing governance authorities across Phases 10–27:

```text
[Phase 27: SystemReleaseCertificate Snapshots & supersedesCertificateId Links]
[Phase 23: system-contract-evolution.service.ts (Structural Contract Diffs)]
[Phase 18: system-baseline-alignment.service.ts (Baseline Alignment Formulas)]
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

### Exact Schema Mapping (Grounded in Phase 27 Implementation)

Inspecting [`apps/api/src/modules/governance/system-release-certificate.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.types.ts) confirms exact frozen snapshot properties:

| Logical Snapshot Category | Exact Phase 27 Model Property | Data Structure & Key Fields |
| :--- | :--- | :--- |
| **Topology Nodes** | `snapshot.topologyNodes` | `ITopologyNodeSnapshot[]` (`projectId`, `projectName`, `isGovernanceEnabled`, `localGatePassed`) |
| **Topology Edges** | `snapshot.topologyEdges` | `ITopologyEdgeSnapshot[]` (`sourceProjectId`, `targetProjectId`, `linkType`) |
| **Active Baselines** | `snapshot.activeBaselines` | `IBaselineSnapshot[]` (`projectId`, `projectName`, `baselineId`, `versionTag`, `documentSnapshotsCount`, `createdTimestamp`) |
| **Active Attestations** | `snapshot.activeAttestations` | `IAttestationSnapshot[]` (`attestationId`, `packageId`, `packageName`, `attestedAt`, `attestorUserId`, `fulfillmentStatus`) |
| **Active Waivers** | `snapshot.activeWaivers` | `IWaiverSnapshot[]` (`waiverId`, `targetProviderProjectId`, `blockerType`, `targetDocumentId`, `grantedByUserId`, `grantedAt`, `expiresAt`, `waiverScope`) |
| **Evidence Summary** | `snapshot.evidenceSummary` | `{ totalApplicableContracts, alignedContractsCount, waivedBlockersCount, systemAlignmentScore, evidenceCompletenessScore }` |

---

## 4. Certificate Comparison Model & Historical Selection

### Selection & Validation Rules
Comparison between Certificate A (`sourceCertificateId`) and Certificate B (`targetCertificateId`) follows strict validation:

1. **Same Root System Requirement**:
   - Both certificates MUST belong to the exact same root project: `sourceCert.rootProjectId.toString() === targetCert.rootProjectId.toString()`.
   - If root project IDs differ, comparison is rejected immediately with HTTP `400 Bad Request` (`code: 'DIFFERENT_ROOT_PROJECTS_NOT_COMPARABLE'`).

2. **Chronological / Certification Ordering**:
   - The engine automatically inspects `certifiedAt` timestamps (`sourceCert.certifiedAt` vs `targetCert.certifiedAt`).
   - The older certificate is designated as `SOURCE` ($Cert_A$) and the newer certificate as `TARGET` ($Cert_B$).
   - If caller explicitly swaps IDs, the engine performs comparison and sets `comparisonDirection: 'BACKWARD'`, maintaining mathematical consistency.

3. **Arbitrary Certificate Comparison**:
   - Any two valid `SystemReleaseCertificate` documents belonging to the same root project can be compared, regardless of whether they are directly linked by `supersedesCertificateId` or belong to different release tags/branches (e.g. `v1.0-LTS` vs `v2.0-MAIN`).

4. **Revoked & Superseded Certificates**:
   - Revoked (`certificateStatus === 'REVOKED'`) and superseded certificates remain preserved historical snapshots in Phase 27.
   - Comparative analysis over revoked or superseded certificates is fully permitted, but appends explicit status flags: `isSourceRevoked`, `isTargetRevoked`, `isSourceSuperseded`, `isTargetSuperseded` in differential output metadata.

5. **Incomplete or Corrupted Snapshot Evidence**:
   - If a certificate snapshot payload is unparsable or missing required arrays (`topologyNodes`, `activeBaselines`), comparison returns status `INDETERMINATE` with error code `INCOMPLETE_CERTIFICATE_EVIDENCE` without throwing runtime exceptions.

---

## 5. Strict Historical Evidence Principles (No Live-State Substitution)

Phase 28 establishes a strict, non-negotiable architectural invariant:

> **PRINCIPLE OF HISTORICAL ISOLATION**:  
> Comparative analysis between Certificate A ($T_{\text{certA}}$) and Certificate B ($T_{\text{certB}}$) MUST be derived 100% from frozen historical evidence captured inside the certificate snapshots or explicitly referenced historical database records (`DocumentationBaseline`, `DocumentVersion`).  
> Under NO circumstances may Phase 28 execute live Phase 18, 19, 20, or 23 queries to substitute current $T_{\text{now}}$ database state for missing historical evidence.

### Fallback Matrix for Historical Evidence Conditions

| Evidence Category | Required Historical Source | Action When Historical Source Missing / Unresolvable | Forbidden Fallback Action |
| :--- | :--- | :--- | :--- |
| **Topology** | `snapshot.topologyNodes` & `snapshot.topologyEdges` | Flag `topologyStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE'` | NEVER query live `ProjectTopologyLink` collection. |
| **Baselines** | `snapshot.activeBaselines` | Flag `baselineStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE'` | NEVER query live active `DocumentationBaseline` models. |
| **Contract Evolution** | Historical `DocumentVersion` text referenced by `activeBaselines` | Flag `contractStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE'` (or `'UNSUPPORTED_CONTRACT_STRUCTURE'` if markdown prose) | NEVER query live `Document` content at $T_{\text{now}}$. |
| **Waivers** | `snapshot.activeWaivers` (with frozen `expiresAt`) | Flag `waiverStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE'` | NEVER query live `SystemGovernanceWaiver` collection or reevaluate using live $T_{\text{now}}$ expiration. |
| **Attestations** | `snapshot.activeAttestations` | Flag `attestationStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE'` | NEVER query live `PackageFulfillmentAttestation` collection. |
| **Alignment** | `snapshot.evidenceSummary.systemAlignmentScore` | Return `deltaAlignmentScore: null`, flag `'ZERO_APPLICABLE_EVIDENCE'` | NEVER invoke live Phase 18 `system-baseline-alignment.service.ts`. |

---

## 6. Historical Alignment Score Reconstruction

Phase 28 reconstructs $\Delta \text{AlignmentScore}$ using strictly frozen snapshot evidence:

$$\Delta \text{AlignmentScore} = \text{AlignmentScore}(Cert_B) - \text{AlignmentScore}(Cert_A)$$

### Reconstruction Algorithm

1. **Certificate A Score Extraction**:
   - Extract `scoreA = CertA.snapshot.evidenceSummary.systemAlignmentScore`.
   - Extract `totalContractsA = CertA.snapshot.evidenceSummary.totalApplicableContracts`.
2. **Certificate B Score Extraction**:
   - Extract `scoreB = CertB.snapshot.evidenceSummary.systemAlignmentScore`.
   - Extract `totalContractsB = CertB.snapshot.evidenceSummary.totalApplicableContracts`.

3. **Deterministic Zero-Applicable Evidence Handling**:
   - If `totalContractsA === 0` OR `totalContractsB === 0`:
     - Set `deltaAlignmentScore = null`.
     - Set `alignmentEvaluationStatus = 'ZERO_APPLICABLE_EVIDENCE'`.
     - Trajectory classification evaluates $N_{\text{applicable}} = 0$ as `INDETERMINATE` evidence.
     - **Constraint**: The trajectory engine MUST NOT interpret zero applicable contracts as 0% alignment or 100% alignment.

4. **Numeric Delta Calculation**:
   - If both `totalContractsA > 0` AND `totalContractsB > 0`:
     - Calculate `deltaAlignmentScore = Math.round((scoreB - scoreA) * 10) / 10`.
     - Set `alignmentEvaluationStatus = 'COMPLETE'`.

---

## 7. Topology Delta (Using `snapshot.topologyEdges`)

Phase 28 computes a deterministic comparison between `sourceCert.snapshot.topologyNodes` / `topologyEdges` and `targetCert.snapshot.topologyNodes` / `topologyEdges`.

### Topology Classification Taxonomy

- **`ADDED_NODE`**: Project node present in $Cert_B$ `topologyNodes` but absent in $Cert_A$.
- **`REMOVED_NODE`**: Project node present in $Cert_A$ `topologyNodes` but absent in $Cert_B$.
- **`UNCHANGED_NODE`**: Project node present in both $Cert_A$ and $Cert_B$.
- **`ADDED_EDGE`**: `ITopologyEdgeSnapshot` present in $Cert_B$ `topologyEdges` but absent in $Cert_A$.
- **`REMOVED_EDGE`**: `ITopologyEdgeSnapshot` present in $Cert_A$ `topologyEdges` but absent in $Cert_B$.
- **`MODIFIED_EDGE`**: Edge connecting same `(sourceProjectId, targetProjectId)` pair, but `linkType` changed (`DEPENDS_ON` $\rightarrow$ `PROVIDES_API_TO`).
- **`UNCHANGED_EDGE`**: Edge identical in both snapshots.

*Constraint*: Uses Phase 14 node and edge types directly from frozen snapshots. Zero queries to live `ProjectTopologyLink`.

---

## 8. Baseline Delta (Using `snapshot.activeBaselines`)

Phase 28 compares certification-time project baseline snapshots (`snapshot.activeBaselines`) across $Cert_A$ and $Cert_B$.

### Baseline Delta Taxonomy

| Delta Type | Condition | Description |
| :--- | :--- | :--- |
| **`ADDED_BASELINE`** | Project present in $Cert_B$ `activeBaselines`, absent in $Cert_A$ | New project baseline added to certified system topology. |
| **`REMOVED_BASELINE`** | Project present in $Cert_A$ `activeBaselines`, absent in $Cert_B$ | Project baseline removed from certified system topology. |
| **`VERSION_ADVANCED`** | Project present in both; $Cert_B$ `versionTag` or `createdTimestamp` > $Cert_A$ | Project updated to a newer baseline version ($BL_{\text{v1.0}} \rightarrow BL_{\text{v2.0}}$). |
| **`VERSION_REGRESSED`** | Project present in both; $Cert_B$ `versionTag` or `createdTimestamp` < $Cert_A$ | Project regressed to an older baseline version. |
| **`UNCHANGED_BASELINE`**| Same `projectId`, `baselineId`, `versionTag`, and `documentSnapshotsCount` in both | Baseline unchanged between certifications. |
| **`INDETERMINATE_BASELINE`**| Baseline ID referenced in snapshot cannot be resolved in DB | Missing historical baseline evidence. |

---

## 9. Historical Contract Evolution Input Contract

For every project baseline pair that advanced or changed between Certificate A and Certificate B (`VERSION_ADVANCED` or `VERSION_REGRESSED`), Phase 28 feeds historical contract inputs into Phase 23's authoritative contract evolution engine (`system-contract-evolution.service.ts`).

### Conceptual Input Contract Flow

```text
Certificate A Snapshot               Certificate B Snapshot
   │ activeBaselines                    │ activeBaselines
   ▼                                    ▼
baselineIdA                          baselineIdB
   │                                    │
   ▼ (Fetch Historical DB)              ▼ (Fetch Historical DB)
DocumentationBaseline A              DocumentationBaseline B
   │ targetDocumentSnapshots            │ targetDocumentSnapshots
   ▼                                    ▼
DocumentVersion A                    DocumentVersion B
   │ raw text content                   │ raw text content
   └──────────────────┬─────────────────┘
                      │
                      ▼
         [parseAndCanonicalizeContract(content)] (Phase 23 Engine)
                      │
                      ▼
         Structural Contract Diff (ENDPOINT_REMOVED, FIELD_TYPE_CHANGED, etc.)
```

### Deterministic Rules
1. **Source Content**: Historical raw text content extracted from `DocumentVersion` records corresponding to the frozen baseline snapshots.
2. **OpenAPI Parsing**: Content passed to Phase 23's `parseAndCanonicalizeContract`.
3. **No Prose Semantic Diffing**: Textual prose differences (markdown edits) produce zero contract deltas. If content is non-OpenAPI, returns `UNSUPPORTED_CONTRACT_STRUCTURE`.
4. **Missing Historical Records**: If `DocumentationBaseline` or `DocumentVersion` records have been hard-deleted from DB, Phase 28 sets `contractStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE'` for that pair.
5. **No Live Substitution**: Phase 28 NEVER queries current `Document` content at $T_{\text{now}}$.

---

## 10. Waiver Evolution (Using `snapshot.activeWaivers`)

Phase 28 compares certification-time policy waiver snapshots (`snapshot.activeWaivers`) captured in Certificate A against those in Certificate B.

### Waiver Evolution Taxonomy

- **`NEWLY_GRANTED`**: Policy waiver present in $Cert_B$ `activeWaivers` but absent in $Cert_A$.
- **`RESOLVED`**: Policy waiver present in $Cert_A$ `activeWaivers` but no longer present in $Cert_B$.
- **`CARRIED_FORWARD`**: Policy waiver present in both $Cert_A$ and $Cert_B$ snapshots with matching `blockerType` and `targetProviderProjectId`.
- **`EXPIRED_POST_CERTIFICATION`**: Waiver was active at $Cert_A$ certification time ($T_{\text{certA}}$), but frozen `expiresAt` timestamp is prior to $Cert_B$ certification time ($T_{\text{certB}}$).
- **`SCOPE_CHANGED`**: Waiver present in both, but `targetDocumentId` or `waiverScope` modified.

*Critical Rule*: Evaluates frozen `expiresAt` timestamps captured at $T_{\text{certA}}$ and $T_{\text{certB}}$. NEVER reinterprets historical waivers using live $T_{\text{now}}$ expiration state.

---

## 11. Attestation Evidence Evolution (Using `snapshot.activeAttestations`)

Phase 28 compares package fulfillment attestation snapshots (`snapshot.activeAttestations`) captured at $T_{\text{certA}}$ against $T_{\text{certB}}$.

### Evidence Evolution Taxonomy

- **`EVIDENCE_ADDED`**: Attestation present in $Cert_B$ `activeAttestations` but absent in $Cert_A$.
- **`EVIDENCE_REMOVED`**: Attestation present in $Cert_A$ `activeAttestations` but absent in $Cert_B$.
- **`EVIDENCE_UNCHANGED`**: Attestation present in both snapshots with identical `packageId` and `fulfillmentStatus`.
- **`EVIDENCE_INDETERMINATE`**: Attestation record corrupted in snapshot.

---

## 12. Waiver Reliance Delta

$$\Delta \text{WaiverCount} = N_{\text{waivers}}(Cert_B) - N_{\text{waivers}}(Cert_A)$$

$$\text{WaiverRelianceRatio}(Cert) = \frac{N_{\text{waivers}}}{N_{\text{evaluatedDependencies}}}$$

- **Metric Interpretation**: A decrease in raw waiver count ($\Delta \text{WaiverCount} < 0$) does NOT automatically mean a system improved if project nodes were removed from the topology. Both raw count delta and reliance ratio delta are reported.

---

## 13. Pure Deterministic Trajectory Precedence Hierarchy

Phase 28 evaluates system evolution trajectory using a strict, pure 4-tier precedence hierarchy. The first matching tier determines the trajectory classification:

```text
               Trajectory Evaluation Precedence
                             │
     ┌───────────────────────┴───────────────────────┐
     │ Tier 1: INDETERMINATE                         │
     │  - Missing/corrupt historical snapshot data   │
     │  - N_applicable = 0 in either certificate     │
     └───────────────────────┬───────────────────────┘
                             │ (If Tier 1 false)
                             ▼
     ┌───────────────────────────────────────────────┐
     │ Tier 2: DEGRADED                              │
     │  - Breaking contract deltas present (> 0)     │
     │  - ΔAlignmentScore < 0                        │
     │  - ΔWaiverCount > 0 without alignment gain    │
     │  - Gate status regressed (PASSED -> WAIVER)   │
     └───────────────────────┬───────────────────────┘
                             │ (If Tier 2 false)
                             ▼
     ┌───────────────────────────────────────────────┐
     │ Tier 3: IMPROVED                              │
     │  - ΔAlignmentScore > 0                        │
     │  - ΔWaiverCount ≤ 0                           │
     │  - Zero breaking contract deltas              │
     │  - Gate status maintained or improved         │
     └───────────────────────┬───────────────────────┘
                             │ (If Tier 3 false)
                             ▼
     ┌───────────────────────────────────────────────┐
     │ Tier 4: STABLE                                │
     │  - 100% of comparison dimensions identical    │
     └───────────────────────────────────────────────┘
```

*Invariant*: Trajectory classification is 100% pure and deterministic. It does NOT depend on subjective UI interpretation.

---

## 14. Lineage ACL Semantics & Privacy Protection

Phase 28 strictly enforces ACL-first privacy filtering during supersession lineage chain / graph traversal ([`getCertificateLineageGraph`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage.service.ts)):

### Privacy Rules for Lineage Traversal

1. **Principle of Indistinguishability**:
   - An unauthorized certificate or project MUST be completely indistinguishable from a non-existent certificate or project to the requesting user.
2. **Authorized Boundary Pruning**:
   - Starting from the target certificate, the engine checks `checkUserProjectReadAccess(userId, node.rootProjectId)`.
   - If a lineage node's root project is unauthorized for `userId`:
     - Lineage traversal **terminates immediately** at the authorized boundary.
     - Exposes **0** node IDs, **0** release tags, **0** metadata strings, **0** node counts, **0** project titles, **0** `"RESTRICTED"` placeholders, and **0** depth leakage.
     - The response returns strictly the contiguous chain of authorized nodes leading up to the boundary with `traversalMetadata.status = 'COMPLETE'`.

---

## 15. Persistence Model

### Research Finding: Zero New Persistence (Persistence = 0)

Phase 28 introduces:
- **0** new Mongoose models
- **0** new database collections
- **0** database schema modifications
- **0** background worker threads or cron sweep jobs
- **0** database write operations during query execution
- **0** audit log write operations on query execution

Phase 28 operates as a 100% request-scoped, read-only analytical service ([`system-release-lineage.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage.service.ts)).

---

## 16. REST API Design

Phase 28 exposes two endpoints in `governance.routes.ts`:

### 1. Compare System Release Certificates
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
        "unchangedNodes": [{ "projectId": "650f1a2b3c4d5e6f7a8b9c00", "projectName": "Root" }],
        "addedEdges": [],
        "removedEdges": [],
        "unchangedEdges": []
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

### 2. Get Certificate Supersession Lineage Chain / Graph
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

---

## 17. Frontend UI Design

Component: [`SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx).

- **Lineage Chain Bar**: Horizontal visual node rendering of `supersedesCertificateId` backward chain with status badges (`ACTIVE`, `SUPERSEDED`, `REVOKED`). Banner explicitly notes: *"DERIVED ANALYTICAL LINEAGE reconstructed from Phase 27 supersedesCertificateId links"*.
- **Comparison Workbench**: Side-by-side certificate selectors with "Compare Release Certificates" trigger.
- **Trajectory Card**: Displays trajectory badge (`IMPROVED`, `STABLE`, `DEGRADED`, `INDETERMINATE`) with metric shifts ($\Delta \text{AlignmentScore}$, $\Delta \text{WaiverCount}$).
- **Tabbed Differential Panels**: Topology Deltas (using `topologyEdges`), Baseline Deltas (using `activeBaselines`), Structural Contract Diffs (Phase 23), Waiver Evolution (using `activeWaivers`), Attestation Deltas (using `activeAttestations`).

---

## 18. Performance Bounds & N+1 Prevention

| Metric Boundary | Enforced Limit | Enforcement Action |
| :--- | :--- | :--- |
| **`MAX_AUTHORIZED_PROJECTS`** | 50 projects | Truncates topology analysis; sets `status: 'PARTIAL'`. |
| **`MAX_TOPOLOGY_EDGES`** | 100 edges | Truncates edge processing; sets `status: 'PARTIAL'`. |
| **`MAX_LINEAGE_DEPTH`** | 20 depth levels | Halts lineage traversal at 20 steps; sets `maxDepthReached: true`. |
| **`MAX_CONTRACT_DIFF_BASELINES`** | 30 project baselines | Limits Phase 23 contract AST diffs to 30 baseline pairs per query. |

### N+1 Query Mitigation
- Single bulk Mongoose `$in` query to fetch Certificate A, Certificate B, and referenced `DocumentationBaseline` records in a single database round-trip.

---

## 19. Error & Indeterminate Semantics

Explicit categorical status model:
- **`COMPLETE`**: Full comparative evidence available and evaluated across all authorized topology nodes.
- **`PARTIAL`**: Evaluation completed over an authorized subset of topology (unauthorized project nodes pruned by ACL check).
- **`INDETERMINATE`**: Comparison includes zero applicable contract dependencies ($N_{\text{applicable}} = 0$) or corrupted snapshot data.
- **`UNSUPPORTED`**: Non-matching root projects (`DIFFERENT_ROOT_PROJECTS_NOT_COMPARABLE`).

---

## 20. QA Plan (56 Automated Scenarios)

Automated QA test suite ([`tests/qa/run_phase28_qa.ts`](file:///c:/MERN_STACK/Documan/documan/tests/qa/run_phase28_qa.ts)) covering:

1. **Certificate Selection & Validation** (Scenarios 1–5): Same/different root project checks, invalid IDs, revoked certificate comparison.
2. **Topology Deltas** (Scenarios 6–10): `ADDED_NODE`, `REMOVED_NODE`, `ADDED_EDGE`, `REMOVED_EDGE`, `MODIFIED_EDGE` over `snapshot.topologyEdges`.
3. **Baseline Deltas** (Scenarios 11–15): `VERSION_ADVANCED`, `VERSION_REGRESSED`, `ADDED_BASELINE`, `REMOVED_BASELINE` over `snapshot.activeBaselines`.
4. **Contract Evolution Diffing** (Scenarios 16–20): Phase 23 structural diff integration, prose markdown 0 diff check, unparseable spec handling.
5. **Waiver Evolution** (Scenarios 21–25): `NEWLY_GRANTED`, `RESOLVED`, `CARRIED_FORWARD`, `EXPIRED_POST_CERTIFICATION` using frozen `expiresAt`. Zero live $T_{\text{now}}$ substitution.
6. **Attestation Evidence** (Scenarios 26–30): `EVIDENCE_ADDED`, `EVIDENCE_REMOVED`, `EVIDENCE_UNCHANGED` over `snapshot.activeAttestations`. Zero DB writes.
7. **Alignment Metrics & Zero-Applicable Rules** (Scenarios 31–35): $\Delta \text{AlignmentScore}$ math, $N_{\text{applicable}} = 0 \rightarrow \text{ZERO\_APPLICABLE\_EVIDENCE}$, no 0% false score.
8. **Waiver Reliance & Trajectory Precedence** (Scenarios 36–40): Deterministic 4-tier trajectory evaluation (`INDETERMINATE` > `DEGRADED` > `IMPROVED` > `STABLE`).
9. **Supersession Lineage Traversal** (Scenarios 41–45): Traversal over `supersedesCertificateId`, cycle protection, missing parent handling, depth bounds.
10. **ACL Pruning & Privacy Protection** (Scenarios 46–50): Unauthorized root project `403 Forbidden`, unauthorized connected project indistinguishable from non-existent node (0 data leakage).
11. **Performance Bounds & Regression** (Scenarios 51–56): Bulk `$in` N+1 safety, 0 DB write verification, Phase 18–27 regression health.

---

## 21. Security & IDOR Protection

1. **Root Project ACL**: `checkUserProjectReadAccess` enforced before query execution.
2. **Connected Project Subgraph Pruning**: Unauthorized connected projects completely omitted from output (0 ID, 0 title, 0 metadata leakage).
3. **IDOR Protection**: Certificate IDs validated against root project ACL boundaries.

---

## 22. Architectural Invariants

1. **Zero Database Writes**: Phase 28 performs strictly 0 database write operations.
2. **Zero Certificate Mutations**: Phase 28 NEVER mutates `SystemReleaseCertificate` documents or snapshots.
3. **Immutable Hashes**: Phase 28 NEVER recalculates or alters `certificateHash` values.
4. **Zero Persistence Overhead**: Phase 28 introduces 0 new Mongoose models, collections, or schemas.
5. **No Live State Substitution**: Phase 28 NEVER evaluates current live state ($T_{\text{now}}$) as historical certified state ($T_{\text{cert}}$).
6. **No Gate Replacement**: Phase 28 NEVER replaces Phase 19 system topology gate evaluations.
7. **Frozen Waiver Expiration**: Phase 28 NEVER re-interprets historical waiver snapshots using live $T_{\text{now}}$ expiration.
8. **Phase 23 AST Reuse**: Phase 28 consumes Phase 23's contract evolution service directly.
9. **Phase 27 Link Reuse**: Phase 28 consumes Phase 27's `supersedesCertificateId` links directly.
10. **100% Deterministic Output**: Identical inputs produce 100% identical outputs.

---

## 23. Implementation Sequencing

1. **Step 1**: TypeScript DTOs & Interfaces (`system-release-lineage.types.ts`).
2. **Step 2**: Pure Comparison Helpers (`system-release-lineage-helpers.ts` + Vitest unit tests).
3. **Step 3**: Core Service Layer (`system-release-lineage.service.ts` + Vitest integration tests).
4. **Step 4**: Controller & Routes (`system-release-lineage.controller.ts`, `governance.routes.ts`).
5. **Step 5**: Frontend UI Component (`SystemReleaseLineageView.tsx` + API client).
6. **Step 6**: Automated QA Test Suite (`tests/qa/run_phase28_qa.ts` - 56 Scenarios).
7. **Step 7**: Verification & Walkthrough (`pnpm typecheck`, `pnpm lint`, `pnpm build`, `PHASE-28-WALKTHROUGH.md`).

---

## 24. Acceptance Criteria

1. **Typecheck**: `pnpm typecheck` passes with 0 errors.
2. **ESLint**: `pnpm lint` passes with 0 errors.
3. **Unit Tests**: 100% of Vitest unit tests pass.
4. **Automated QA**: 56/56 QA scenarios pass cleanly.
5. **Production Build**: `pnpm build` completes with 0 errors.
6. **Zero Writes**: Verified 0 database writes occur on all Phase 28 API calls.
7. **Regression Health**: Full test suites for Phase 10 through Phase 27 remain 100% passing.

---

## 25. Final Scope

### File Inventory

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
