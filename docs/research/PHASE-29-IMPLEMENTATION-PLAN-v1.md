# Phase 29 Implementation Plan v1 — System-Wide Release Certificate Compliance Drift & Post-Certification Variance Audit Engine

> **Authoritative Technical Implementation Specification**
>
> **Author**: Documan Core Engineering & Product Architecture Team
> **Status**: PROPOSED FOR REVIEW (DO NOT IMPLEMENT YET)
> **Target Branch**: `feature/system-release-certificate-compliance-drift`
> **Prerequisites**: Phase 27 (Immutable System Release Certification) & Phase 28 (System-Wide Release Certificate Lineage & Multi-Release System Evolution Engine)

---

## Executive Summary

Phase 27 established the capability to issue cryptographically verifiable, immutable **System Release Certificates** (`SystemReleaseCertificate`), capturing a frozen snapshot ($T_{\text{cert}}$) of system topology, active baselines, fulfillment attestations, policy waivers, and alignment scores. Phase 28 introduced a comparative evolution engine and supersession lineage graph traversal capability, allowing technical stewards to compare two historical, frozen certificate snapshots ($T_{\text{cert1}}$ vs $T_{\text{cert2}}$).

**Phase 29 — System-Wide Release Certificate Compliance Drift & Post-Certification Variance Audit Engine** introduces a read-only, request-scoped analytical capability to audit current live operational system state ($T_{\text{now}}$) against a frozen historical Release Certificate snapshot ($T_{\text{cert}}$).

It provides release managers, governance officers, and technical stewards with a structured **5-dimensional post-certification variance taxonomy** (Topology, Baseline, Contract, Waiver, and Attestation Variance), evaluates a **4-tier Live Compliance Status** (`FULLY_COMPLIANT`, `COMPLIANT_WITH_EXCEPTIONS`, `NON_COMPLIANT_DRIFT`, `INDETERMINATE_EVIDENCE`), and outputs actionable remediation guidance with **zero database writes, zero audit log writes, zero background queue workers, and zero live state mutations.**

---

## Core Temporal Architecture & Invariants

Phase 29 operates across two fundamentally distinct temporal authorities:

```text
HISTORICAL CERTIFIED STATE (T_cert)
→ Immutable SystemReleaseCertificate.snapshot
VS.
CURRENT OPERATIONAL LIVE STATE (T_now)
→ Authoritative Documan records/services at runtime
```

### Core Temporal Invariant
> **LIVE STATE MAY BE USED ONLY AS THE COMPARISON TARGET.**
>
> Live state ($T_{\text{now}}$) must NEVER:
> 1. Overwrite or mutate historical certificate evidence;
> 2. Reinterpret the historical certificate snapshot;
> 3. Mutate the `SystemReleaseCertificate` model or lifecycle state;
> 4. Replace missing historical snapshot fields with current state;
> 5. Silently convert historical certified state into current state.

Phase 29 answers the operational question: **"What has changed in live state since this system state was certified at $T_{\text{cert}}$?"**

---

## 1. Repository-Grounded Investigation

The implementation plan is grounded in the existing Documan codebase:

1. **Phase 27 Certificate Snapshot (`SystemReleaseCertificate`)**:
   - Model: [`apps/api/src/modules/governance/system-release-certificate.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts)
   - Types: [`apps/api/src/modules/governance/system-release-certificate.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.types.ts)
   - Schema snapshot properties: `snapshot.topologyNodes`, `snapshot.topologyEdges`, `snapshot.activeBaselines`, `snapshot.activeAttestations`, `snapshot.activeWaivers`, `snapshot.evidenceSummary`.
2. **Phase 27 `/verify` Behavior (`system-release-certificate.service.ts`)**:
   - Verifies SHA-256 certificate hash (`INTEGRITY_VERIFIED` vs `TAMPER_DETECTED`), lifecycle status (`ACTIVE`/`REVOKED`/`SUPERSEDED`), and high-level boolean match (`matchesCertifiedState: boolean`).
   - Does NOT provide granular variance taxonomy or project-by-project drift breakdown. Phase 29 consumes `/verify` output and extends it with multi-dimensional variance auditing.
3. **Phase 28 Release Lineage Engine (`system-release-lineage.service.ts`)**:
   - Handles snapshot-to-snapshot ($T_{\text{cert1}}$ vs $T_{\text{cert2}}$) comparison. Phase 29 reuses Phase 28 helper diffing algorithms where appropriate, adapting them for $T_{\text{cert}}$ vs $T_{\text{now}}$ comparison.
4. **Phase 23 Structural Contract Evolution (`system-contract-evolution.service.ts`)**:
   - Authoritative OpenAPI spec parser (`parseOpenApiSpecification`) and structural AST diffing engine (`ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `ENDPOINT_ADDED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`).
5. **Phase 20 Waiver Matcher (`system-governance-waiver.service.ts`)**:
   - Authoritative `SystemGovernanceWaiver` model. Tracks waiver scope (`ALL`, `DOCUMENT`), target provider project, blocker type, and expiration timestamp (`expiresAt`).
6. **Phase 14 ACL Read Authorization (`project-topology.service.ts`)**:
   - `checkUserProjectReadAccess(userId, userRole, projectId)` enforces graph isolation. Unauthorized connected projects are 100% pruned prior to variance aggregation.

---

## 2. Product Boundary & Non-Goals

### Included Product Scope
- Select a historical Release Certificate by `certificateId`.
- Validate user READ access on the certificate's root project.
- Treat the certificate's `snapshot` as immutable certified truth ($T_{\text{cert}}$).
- Query current authoritative Documan state ($T_{\text{now}}$) across all connected projects in the certified topology.
- Compute structured 5-dimensional post-certification variance (Topology, Baseline, Contract, Waiver, Attestation).
- Classify live compliance status relative to the certificate (`FULLY_COMPLIANT`, `COMPLIANT_WITH_EXCEPTIONS`, `NON_COMPLIANT_DRIFT`, `INDETERMINATE_EVIDENCE`).
- Expose actionable remediation guidance steps for release managers.
- Remain 100% read-only, request-scoped, and deterministic.

### Explicit Prohibitions & Non-Goals
- **NO Certificate Mutation**: Does NOT alter certificate hashes, snapshots, notes, or tags.
- **NO Automatic Certificate Revocation**: Does NOT automatically mark certificates as `REVOKED`.
- **NO Automatic Re-Certification**: Does NOT automatically issue new certificates.
- **NO Remediation Execution / Task Creation**: Does NOT automatically create `DocumentationWorkRequest` records or Jira/GitHub tickets.
- **NO CI/CD / Deployment Orchestration**: Does NOT trigger build pipelines, Docker deployments, or infrastructure agents.
- **NO Background Polling Crons**: No background queue workers, cron jobs, or file watchers.
- **NO Generic Compliance / GRC Engine**: Strictly audits Documan document baselines, OpenAPI contracts, waivers, and topology links.
- **NO AI / LLM Semantic Guessing**: 100% pure deterministic logic and structural AST diffing.

---

## 3. Five Variance Dimensions

Phase 29 defines exact, deterministic semantics for 5 post-certification variance dimensions:

```text
1. TOPOLOGY_VARIANCE    : Live connected projects / topology links vs certified snapshot
2. BASELINE_VARIANCE    : Live active baselines & document versions vs certified baseline snapshot
3. CONTRACT_VARIANCE    : Live OpenAPI contract specs vs certified baseline contract specs
4. WAIVER_VARIANCE      : Certified policy waivers vs live active waivers (expiration & revocation)
5. ATTESTATION_VARIANCE : Certified fulfillment attestations vs live fulfillment attestations
```

---

## 4. Topology Variance

### Comparison Inputs
- **Certified State ($T_{\text{cert}}$)**: `snapshot.topologyNodes`, `snapshot.topologyEdges`.
- **Live State ($T_{\text{now}}$)**: Active project records and live `ProjectTopologyLink` records for authorized connected projects.

### Deterministic Delta Categorization
- `NODE_ADDED`: Project connected in live topology at $T_{\text{now}}$ but absent from certified snapshot.
- `NODE_REMOVED`: Project present in certified snapshot but removed from live topology or soft-deleted at $T_{\text{now}}$.
- `EDGE_ADDED`: Project topology link created since certification.
- `EDGE_REMOVED`: Certified project topology link deleted since certification.
- `NODE_UNCHANGED` / `EDGE_UNCHANGED`: Node or edge present in both $T_{\text{cert}}$ and $T_{\text{now}}$.

### ACL & Privacy Rules
- Reuses `checkUserProjectReadAccess(userId, userRole, projectId)`.
- Unauthorized connected project nodes or edges are **100% pruned** before topology delta computation.
- Unauthorized projects are completely indistinguishable from non-existent projects (zero ID leakage, zero count leakage).

---

## 5. Baseline Variance

### Comparison Inputs
- **Certified State ($T_{\text{cert}}$)**: `snapshot.activeBaselines` (`baselineId`, `versionTag`, `documentSnapshotsCount`, `createdTimestamp`).
- **Live State ($T_{\text{now}}$)**: Currently active `DocumentationBaseline` record (`isActive === true`) for each authorized project.

### Deterministic Version Delta Taxonomy
- `UNCHANGED`: Active baseline in live state matches certified `baselineId` and `versionTag`.
- `VERSION_ADVANCED`: Live project active baseline has advanced to a newer version tag (e.g., certified `BL-1.0` $\rightarrow$ live `BL-2.0`).
- `VERSION_REGRESSED`: Live project active baseline has rolled back to an older version tag.
- `BASELINE_DEACTIVATED`: Certified project active baseline has been deactivated without a replacement.
- `BASELINE_REPLACED`: Certified project active baseline replaced by a baseline with a different `baselineId`.
- `MISSING_LIVE_EVIDENCE`: Baseline record unreadable or deleted in live state.

> **Note**: A version advance (`VERSION_ADVANCED`) is categorized as structural variance, but is NOT automatically flagged as non-compliant unless it contains breaking contract deltas or un-waived gate failures.

---

## 6. Contract Variance

### Comparison Inputs
- **Certified State ($T_{\text{cert}}$)**: `DocumentVersion` content referenced in certified baseline snapshots.
- **Live State ($T_{\text{now}}$)**: `DocumentVersion` content referenced in current live active baselines.

### Reuse of Phase 23 Structural Contract Authority
Reuses `parseOpenApiSpecification` and Phase 23 contract diffing algorithms (`computeHistoricalContractDeltas`).

### Delta Taxonomy (Phase 23 Alignment)
- `ENDPOINT_REMOVED` (`BREAKING` risk tier)
- `ENDPOINT_DEPRECATED` (`WARNING` risk tier)
- `ENDPOINT_ADDED` (`NON_BREAKING` risk tier)
- `FIELD_REMOVED` (`BREAKING` risk tier)
- `FIELD_TYPE_CHANGED` (`BREAKING` risk tier)
- `FIELD_REQUIREDNESS_CHANGED` (`BREAKING` risk tier)
- `ENUM_VALUE_REMOVED` (`BREAKING` risk tier)
- `UNSUPPORTED_CONTRACT_STRUCTURE`: Non-OpenAPI prose or unparseable specs return 0 structural contract deltas.

---

## 7. Waiver Variance

### Temporal State Model
Phase 29 compares certified policy waivers (`snapshot.activeWaivers`) against current live `SystemGovernanceWaiver` records without rewriting historical certified truth.

```text
                                +---------------------------+
                                | CERTIFIED WAIVER (T_cert) |
                                +---------------------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
        [Still Active at T_now]                                [No Longer Active at T_now]
                     |                                                 |
          +----------+----------+                         +------------+------------+
          |                     |                         |                         |
          v                     v                         v                         v
   CARRIED_FORWARD        SCOPE_CHANGED            EXPIRED_POST_CERT       REVOKED_POST_CERT
(Live active & valid)  (Scope expanded/reduced) (T_now > expiresAt)      (Explicitly revoked)
```

### Deterministic Delta Categories
- `CARRIED_FORWARD`: Certified waiver remains active, unexpired, and unrevoked in live state at $T_{\text{now}}$.
- `EXPIRED_POST_CERTIFICATION`: Certified waiver reached its `expiresAt` timestamp after $T_{\text{cert}}$ ($T_{\text{now}} > \text{expiresAt}$).
- `REVOKED_POST_CERTIFICATION`: Certified waiver was explicitly revoked or deactivated after $T_{\text{cert}}$.
- `SCOPE_CHANGED`: Certified waiver remains active, but its `waiverScope` was altered in live state.
- `NEWLY_GRANTED_POST_CERTIFICATION`: Active waiver granted in live state after $T_{\text{cert}}$ that was not present in the certified snapshot.

---

## 8. Attestation / Evidence Variance

### Comparison Inputs
- **Certified State ($T_{\text{cert}}$)**: `snapshot.activeAttestations` (`packageId`, `packageName`, `attestationId`, `fulfillmentStatus`).
- **Live State ($T_{\text{now}}$)**: Active `PackageFulfillmentAttestation` records in live state for authorized projects.

### Deterministic Delta Taxonomy
- `EVIDENCE_UNCHANGED`: Certified attestation remains fulfilled and active in live state.
- `EVIDENCE_ADDED`: New fulfillment attestation created in live state since certification.
- `EVIDENCE_REMOVED`: Certified attestation revoked or deleted in live state.
- `EVIDENCE_STALE`: Underlying document content changed since attestation issuance, marking attestation stale.
- `MISSING_LIVE_EVIDENCE`: Attestation record unreadable or deleted.

---

## 9. Live Compliance Status

Phase 29 evaluates a aggregate **Live Compliance Status** comparing current live operational state ($T_{\text{now}}$) to certified release state ($T_{\text{cert}}$).

### Compliance Status Taxonomy

```text
+--------------------------+-----------------------------------------------------------------------------+
| Compliance Status        | Deterministic Criteria                                                      |
+--------------------------+-----------------------------------------------------------------------------+
| FULLY_COMPLIANT          | - 0 live variances across all 5 dimensions.                                 |
|                          | - Live gate status === PASSED.                                              |
|                          | - Matches certified state 100%.                                             |
+--------------------------+-----------------------------------------------------------------------------+
| COMPLIANT_WITH_EXCEPTIONS| - Live state contains non-breaking baseline advances or new waivers.        |
|                          | - 0 breaking contract deltas, 0 expired certified waivers.                  |
|                          | - Live gate status === PASSED or PASSED_WITH_WAIVER.                        |
+--------------------------+-----------------------------------------------------------------------------+
| NON_COMPLIANT_DRIFT      | - Certified waiver has expired (T_now > expiresAt) or been revoked.        |
|                          | - Live state contains BREAKING contract deltas (ENDPOINT_REMOVED, etc.).   |
|                          | - Certified baseline deactivated or removed.                                |
|                          | - Live gate status === BLOCKED.                                             |
+--------------------------+-----------------------------------------------------------------------------+
| INDETERMINATE_EVIDENCE   | - Total applicable contracts N_applicable === 0.                             |
|                          | - Connected project unreadable due to ACL boundary or missing evidence.     |
|                          | - Live gate status === INDETERMINATE.                                       |
+--------------------------+-----------------------------------------------------------------------------+
```

### Deterministic Tier Precedence
$$\mathbf{INDETERMINATE\_EVIDENCE} > \mathbf{NON\_COMPLIANT\_DRIFT} > \mathbf{COMPLIANT\_WITH\_EXCEPTIONS} > \mathbf{FULLY\_COMPLIANT}$$

---

## 10. Certificate Lifecycle Semantics

Phase 29 accounts for Phase 27 certificate lifecycle states (`ACTIVE`, `REVOKED`, `SUPERSEDED`):

1. **Active Certificates (`ACTIVE`)**: Full compliance drift audit evaluated against live state $T_{\text{now}}$.
2. **Superseded Certificates (`SUPERSEDED`)**:
   - `SUPERSEDED` certificates **remain 100% valid comparison baselines** for post-certification compliance drift analysis.
   - The compliance audit response includes `comparisonMetadata.isSuperseded = true` and references `supersededByCertificateId`.
3. **Revoked Certificates (`REVOKED`)**:
   - `REVOKED` certificates can be audited for historical compliance drift analysis, but return `complianceStatus = NON_COMPLIANT_DRIFT` with reason `CERTIFICATE_REVOKED`.
4. **Zero Certificate Mutations**: Auditing compliance drift NEVER modifies `certificateStatus`, `certificateHash`, or `lifecycleEvents`.

---

## 11. Phase 27 `/verify` Relationship

Phase 29 extends and complements Phase 27's `/verify` endpoint without duplicating logic:

```text
PHASE 27 /verify
- Cryptographic SHA-256 Hash Check (INTEGRITY_VERIFIED vs TAMPER_DETECTED)
- Certificate Lifecycle Validity (ACTIVE / REVOKED / SUPERSEDED)
- High-level Live Gate Match Boolean (matchesCertifiedState: boolean)

                   ↓ (Feeds into)

PHASE 29 /drift-audit
- 5-Dimensional Granular Variance Taxonomy (Topology, Baseline, Contract, Waiver, Attestation)
- Exact Root-Cause Discrepancy Items (e.g., Waiver w1 expired, Endpoint GET /users removed)
- 4-Tier Live Compliance Classification (FULLY_COMPLIANT, COMPLIANT_WITH_EXCEPTIONS, etc.)
- Actionable Step-by-Step Remediation Guidance
```

---

## 12. Error & Indeterminate Semantics

The service enforces strict error handling:

- `CERTIFICATE_NOT_FOUND` (404): Certificate ID invalid or non-existent.
- `FORBIDDEN` (403): User lacks READ access on root project.
- `INCOMPLETE_CERTIFICATE_EVIDENCE` (400): Certificate snapshot missing required topology or summary evidence.
- `ZERO_APPLICABLE_EVIDENCE` (Tier 1 INDETERMINATE): $N_{\text{applicable}} = 0$ returns `complianceStatus = INDETERMINATE_EVIDENCE`.
- `GRAPH_TRUNCATION_LIMIT_EXCEEDED`: Connected projects > 50 returns `complianceStatus = INDETERMINATE_EVIDENCE`.

---

## 13. ACL & Privacy Boundaries

Phase 29 enforces strict privacy preservation:

1. **Root Project ACL Check**:
   `checkUserProjectReadAccess(userId, userRole, rootProjectId)` is verified first. If false, throws `403 Forbidden`.
2. **Connected Subgraph ACL Pruning**:
   For every connected project in the topology, `checkUserProjectReadAccess(userId, userRole, connectedProjectId)` is checked.
   - If false, the connected project node, edges, baselines, contract diffs, and waivers are **100% omitted** from response arrays.
   - Aggregate counts (`totalTopologyProjects`, etc.) reflect ONLY authorized projects.
   - Unauthorized projects are completely indistinguishable from non-existent projects (0 data leakage).

---

## 14. Persistence & Storage Architecture

- **New Mongoose Models**: `0` (Zero).
- **Schema Modifications**: `0` (Zero).
- **Database Write Operations**: `0` (Zero).
- **Audit Log Writes on Query**: `0` (Zero).
- **Background Workers**: `0` (Zero).
- **Architecture**: 100% request-scoped, read-only query service.

---

## 15. API Design

### Proposed API Surface

```http
POST /api/v1/release-certificates/compliance-drift-audit
Content-Type: application/json

{
  "certificateId": "65801a2b3c4d5e6f7a8b9c0d"
}
```

### Response DTO Schema (`ReleaseCertificateComplianceAuditDTO`)

```typescript
export interface ReleaseCertificateComplianceAuditDTO {
  auditMetadata: {
    certificateId: string;
    releaseTag: string;
    certifiedAt: string;
    auditTimestamp: string; // T_now
    rootProjectId: string;
    certificateStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
    certifiedSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
    liveSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';
    matchesCertifiedState: boolean;
    isIntegrityVerified: boolean;
  };
  complianceStatus: 'FULLY_COMPLIANT' | 'COMPLIANT_WITH_EXCEPTIONS' | 'NON_COMPLIANT_DRIFT' | 'INDETERMINATE_EVIDENCE';
  complianceReason?: string;
  remediationGuidance: string[];
  varianceSummary: {
    topologyVarianceCount: number;
    baselineVarianceCount: number;
    contractVarianceCount: number;
    waiverVarianceCount: number;
    attestationVarianceCount: number;
  };
  topologyDeltas: {
    addedNodes: ITopologyNodeSnapshot[];
    removedNodes: ITopologyNodeSnapshot[];
    addedEdges: ITopologyEdgeSnapshot[];
    removedEdges: ITopologyEdgeSnapshot[];
  };
  baselineDeltas: BaselineDeltaItemDTO[];
  contractDeltas: ContractDeltaItemDTO[];
  waiverDeltas: WaiverDeltaItemDTO[];
  attestationDeltas: AttestationDeltaItemDTO[];
}
```

---

## 16. UI Experience Specification

The UI component **`ReleaseCertificateComplianceAuditView.tsx`** will be integrated into the existing Project Governance Release Certificate Drawer:

### Layout & Key Visual Elements
1. **Header & Timestamp Banner**:
   - Displays certified timestamp ($T_{\text{cert}}$) alongside current audit timestamp ($T_{\text{now}}$).
2. **Live Compliance Status Badge**:
   - `FULLY_COMPLIANT` (Green)
   - `COMPLIANT_WITH_EXCEPTIONS` (Blue)
   - `NON_COMPLIANT_DRIFT` (Red)
   - `INDETERMINATE_EVIDENCE` (Amber)
3. **Variance Dimension Summary Cards**:
   - 5 cards showing count of deltas for Topology, Baselines, OpenAPI Contracts, Waivers, and Attestations.
4. **Remediation Action Panel**:
   - Bulleted, actionable recommendations for release engineers to restore compliance.
5. **Interactive Differential Tabs**:
   - Tabbed view allowing stewards to drill into individual variance items across the 5 dimensions.

---

## 17. Performance & Security Threat Model

### Performance Bounds
- Bulk MongoDB queries via `$in` operator for active baselines, documents, and waivers across connected projects.
- Explicit processing bounds:
  - `MAX_CONNECTED_PROJECTS = 50`
  - `MAX_AUDITED_DOCUMENTS = 200`
  - `MAX_CONTRACT_DIFFS = 30`
- Zero $N+1$ query patterns.

### Security Threat Model
1. **IDOR against `certificateId`**: Checked via root project ACL. Returns `404 Not Found` if user lacks access, preventing existence probing.
2. **Unauthorized Connected Projects**: Pruned via `checkUserProjectReadAccess`. Zero metadata leakage.
3. **Re-entrancy / Side-Effect Attacks**: Pure read-only service execution guarantees zero side-effects.

---

## 18. Dynamic QA Plan (56 Scenarios)

The dynamic QA runner script **`apps/api/src/modules/governance/run_phase29_qa.ts`** will execute 56 automated test scenarios:

- **Scenarios 1–5**: Certificate Selection & ACL Authorization checks.
- **Scenarios 6–10**: Topology Variance detection (added/removed nodes and edges).
- **Scenarios 11–15**: Baseline Variance detection (`VERSION_ADVANCED`, `BASELINE_DEACTIVATED`).
- **Scenarios 16–20**: Contract Variance detection (`ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, Phase 23 integration).
- **Scenarios 21–25**: Waiver Variance detection (`EXPIRED_POST_CERTIFICATION`, `REVOKED_POST_CERTIFICATION`, `CARRIED_FORWARD`).
- **Scenarios 26–30**: Attestation Variance detection (`EVIDENCE_UNCHANGED`, `EVIDENCE_REMOVED`).
- **Scenarios 31–35**: Live Compliance Status evaluation (`FULLY_COMPLIANT`, `NON_COMPLIANT_DRIFT`, `COMPLIANT_WITH_EXCEPTIONS`).
- **Scenarios 36–40**: Certificate Lifecycle handling (`ACTIVE`, `SUPERSEDED`, `REVOKED`).
- **Scenarios 41–45**: Indeterminate evidence & $N_{\text{applicable}} = 0$ rules.
- **Scenarios 46–50**: ACL Subgraph Pruning & Privacy Protection (0 data leakage).
- **Scenarios 51–56**: Performance, Bounds, Zero-Write verification, and Regression against Phases 17–28.

---

## 19. Mandatory Architectural Invariants

1. **Historical Snapshot Immutability**: `SystemReleaseCertificate.snapshot` is immutable historical truth ($T_{\text{cert}}$).
2. **Live State as Comparison Target Only**: Live state ($T_{\text{now}}$) is strictly a comparison target.
3. **Zero Certificate Mutations**: Phase 29 query execution NEVER mutates certificates or hashes.
4. **Zero Automatic Revocations / Re-Certifications**: No automated lifecycle status transitions.
5. **No Live-State Substitution**: Historical snapshot evidence is never replaced by live state.
6. **Strict ACL Graph Isolation**: Unauthorized connected projects are 100% pruned.
7. **Zero DB Writes**: Read-only query execution (persistence = 0).
8. **Pure Deterministic Precedence**: Compliance status evaluated deterministically.
9. **Zero $N+1$ Queries**: Single bulk `$in` queries used for multi-project fetches.
10. **Zero Task / Remediation Automation**: No automatic ticket or work request creation.
11. **Phase 27 Lifecycle Authority Preserved**: Reuses Phase 27 certificate models and hashes.
12. **Phase 23 Contract Evolution Authority Preserved**: Reuses Phase 23 OpenAPI AST diffing.

---

## 20. Incremental Implementation Sequence

1. **Step 1: Types & Interfaces**
   - Create `apps/api/src/modules/governance/system-release-drift.types.ts`.
2. **Step 2: Pure Comparison Helpers & Unit Tests**
   - Create `apps/api/src/modules/governance/system-release-drift-helpers.ts` and `system-release-drift-helpers.test.ts`.
3. **Step 3: Service Layer**
   - Create `apps/api/src/modules/governance/system-release-drift.service.ts` and `system-release-drift.service.test.ts`.
4. **Step 4: Controller & Routes**
   - Create `apps/api/src/modules/governance/system-release-drift.controller.ts`.
   - Update `system-release-certificate.routes.ts` to register `POST /release-certificates/compliance-drift-audit`.
5. **Step 5: Frontend API & React UI**
   - Update `apps/web/src/features/governance/governance.api.ts`.
   - Create `apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx`.
   - Mount in `ProjectDetailsPage.tsx`.
6. **Step 6: Dynamic QA Runner**
   - Create `apps/api/src/modules/governance/run_phase29_qa.ts` and `tests/qa/run_phase29_qa.ts`.
7. **Step 7: Verification Suite**
   - Execute API typecheck, Web typecheck/build, ESLint, Vitest, Phase 29 QA runner, `git diff --check`.

---

## 21. Open Architectural Questions

1. *Should live policy waiver expiration ($T_{\text{now}} > \text{expiresAt}$) trigger `NON_COMPLIANT_DRIFT` if the certified release gate status was `PASSED_WITH_WAIVER`?*
   - **Resolved**: Yes. If a release was certified based on a waiver that has since expired in live state, the live system is operating without a valid waiver, producing `NON_COMPLIANT_DRIFT`.
2. *Should live baseline version advances (e.g., provider updated `BL-1.0` to `BL-2.0`) be classified as `COMPLIANT_WITH_EXCEPTIONS` if no breaking contract deltas exist?*
   - **Resolved**: Yes. Non-breaking baseline advances represent normal software evolution and should be classified as `COMPLIANT_WITH_EXCEPTIONS` rather than `NON_COMPLIANT_DRIFT`.

---

## 22. Acceptance Criteria

- [ ] API Typecheck passes (`pnpm --filter @documan/api typecheck`).
- [ ] Web Typecheck & Production Build passes (`pnpm --filter web build`).
- [ ] ESLint passes cleanly across workspace (`pnpm lint`).
- [ ] Vitest unit tests pass (`pnpm test`).
- [ ] Phase 29 QA runner passes 56/56 scenarios (`run_phase29_qa.ts`).
- [ ] `git diff --check` passes with zero formatting errors.
- [ ] Zero database writes, zero audit log writes, zero background workers executed across all Phase 29 endpoints.
- [ ] Strict ACL graph isolation verified (0 data leakage).

---

## 23. Final Scope Inventory

### Files to Add
- `apps/api/src/modules/governance/system-release-drift.types.ts`
- `apps/api/src/modules/governance/system-release-drift-helpers.ts`
- `apps/api/src/modules/governance/system-release-drift-helpers.test.ts`
- `apps/api/src/modules/governance/system-release-drift.service.ts`
- `apps/api/src/modules/governance/system-release-drift.service.test.ts`
- `apps/api/src/modules/governance/system-release-drift.controller.ts`
- `apps/api/src/modules/governance/run_phase29_qa.ts`
- `apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx`
- `tests/qa/run_phase29_qa.ts`

### Files to Modify
- `apps/api/src/modules/governance/system-release-certificate.routes.ts`
- `apps/web/src/features/governance/governance.api.ts`
- `apps/web/src/pages/ProjectDetailsPage.tsx`

### Models & Schema Changes
- **0 New Models**, **0 Schema Changes**.

### APIs
- `POST /api/v1/release-certificates/compliance-drift-audit`

### Persistence & Workers
- **0 Writes**, **0 Audit Writes**, **0 Background Workers**.
