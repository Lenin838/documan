# Phase 29 Research — System-Wide Release Certificate Compliance Drift & Post-Certification Variance Audit Engine

> **Product Research & Architectural Discovery Artifact**
>
> **Author**: Documan Core Engineering & Product Architecture Team
> **Status**: PROPOSED FOR REVIEW
> **Target Version**: Phase 29
> **Prerequisites**: Phase 27 (Immutable System Release Certification) & Phase 28 (System-Wide Release Certificate Lineage & Multi-Release System Evolution Engine)

---

## 1. Executive Summary

Documan has established a comprehensive document-centric governance, traceability, baseline, topology, simulation, contract evolution, interoperability, contract change planning, system release certification, and multi-release evolution analysis pipeline across Phases 1 through 28.

Phase 27 established the capability to issue cryptographically verifiable, immutable **System Release Certificates** (`SystemReleaseCertificate`), capturing a frozen snapshot ($T_{\text{cert}}$) of system topology, active baselines, fulfillment attestations, policy waivers, and alignment scores.

Phase 28 introduced a read-only comparative evolution engine and supersession lineage graph traversal capability, allowing technical stewards to compare two historical, frozen certificate snapshots ($T_{\text{cert1}}$ vs $T_{\text{cert2}}$) and evaluate their trajectory (`IMPROVED`, `DEGRADED`, `STABLE`, `INDETERMINATE`).

However, a critical operational gap remains after Phase 28: **post-certification operational drift verification**. While Phase 27 provides a boolean summary check (`matchesCertifiedState: boolean`) and Phase 28 compares two frozen historical certificates, Documan currently lacks a dedicated, multi-project **Compliance Drift & Live Operational Variance Audit Engine** to evaluate how live system state ($T_{\text{now}}$) has drifted away from a specific frozen Release Certificate snapshot ($T_{\text{cert}}$).

When software systems continue evolving toward future release targets, release engineers, governance officers, and technical stewards need to answer:
- *"Which specific projects, baselines, contract specifications, or policy waivers certified in Release Certificate $C$ at $T_{\text{cert}}$ have drifted or degraded in current live state $T_{\text{now}}$?"*
- *"What is the exact post-certification variance taxonomy (e.g., live active baselines advanced, certified waivers expired/revoked, OpenAPI contract endpoints removed/deprecated, connected topology modified)?"*
- *"What is the live compliance status of the certified system state (`FULLY_COMPLIANT`, `COMPLIANT_WITH_EXCEPTIONS`, `NON_COMPLIANT_DRIFT`, `INDETERMINATE_EVIDENCE`)?"*

This research document defines **Phase 29 — System-Wide Release Certificate Compliance Drift & Post-Certification Variance Audit Engine**, establishing a read-only, request-scoped, non-mutating analytical capability to audit live operational state ($T_{\text{now}}$) against any historical certified snapshot ($T_{\text{cert}}$) without database writes, audit log writes, background workers, or live state mutations.

---

## 2. Current Phase 28 Baseline

Phase 28 established the following authoritative capabilities in the Documan repository:

1. **Supersession Lineage Graph Traversal**: Reconstructs backward supersession lineage chains and graph topologies (`SupersessionLineageGraphDTO`) using existing Phase 27 `supersedesCertificateId` pointers with cycle detection, missing-parent handling, max depth traversal bounds ($MAX\_DEPTH = 20$), and ACL graph pruning.
2. **Snapshot-to-Snapshot Comparison**: Compares two frozen historical `ISystemReleaseSnapshot` objects ($T_{\text{cert1}}$ vs $T_{\text{cert2}}$), computing topology deltas, baseline version deltas, Phase 23 OpenAPI structural contract deltas, waiver evolution deltas, and attestation evidence deltas.
3. **Pure 4-Tier Evolution Trajectory Evaluator**: Evaluates trajectory metrics using strict precedence:
   $$\text{INDETERMINATE} > \text{DEGRADED} > \text{IMPROVED} > \text{STABLE}$$
4. **Zero-Applicable Evidence Invariant**: Preserves $N_{\text{applicable}} = 0 \rightarrow \text{ZERO\_APPLICABLE\_EVIDENCE} \rightarrow \Delta \text{AlignmentScore} = \text{null}$.
5. **Strict ACL Subgraph Pruning**: Reuses Phase 14 `checkUserProjectReadAccess(userId, userRole, projectId)`. Unauthorized connected nodes, edges, titles, and IDs are 100% omitted from responses.
6. **Zero Side-Effects**: Read-only query execution with zero database writes, zero audit log writes, zero background workers, zero schema mutations, and zero live-state substitution.

---

## 3. Existing Authority Map (Phases 1–28)

To preserve architectural integrity and prevent redundant engines, Phase 29 must consume existing repository authorities without duplicating their responsibilities:

| Phase | Core Authority & Module | Primary Responsibility |
| :--- | :--- | :--- |
| **Phase 6** | `governance.service.ts` | Single-project governance settings & freshness policy. |
| **Phase 7.3** | `document-impact-cascade.service.ts` | Single-project graph change impact cascade engine. |
| **Phase 7.4** | `document-version.service.ts` | Authoritative `DocumentVersion` content & versioning. |
| **Phase 9** | `evidence-calculator.ts` | Pure document evidence fulfillment scoring. |
| **Phase 10** | `assurance-calculator.ts` & `release-gate-evaluator.ts` | Single-project documentation assurance & release gate evaluation. |
| **Phase 12** | `baseline.service.ts` | Authoritative `DocumentationBaseline` creation & single-project drift control. |
| **Phase 14** | `project-topology.service.ts` | Authoritative `ProjectTopologyLink` management & cross-project ACL read authorization (`checkUserProjectReadAccess`). |
| **Phase 17** | `package-fulfillment-attestation.service.ts` | Authoritative `PackageFulfillmentAttestation` record issuance. |
| **Phase 18** | `system-baseline-alignment.service.ts` | Cross-project baseline reference alignment & dual-metric governance. |
| **Phase 19** | `system-topology-governance-gate.service.ts` | Cross-project system release gate evaluation engine. |
| **Phase 20** | `system-governance-waiver.service.ts` | Authoritative `SystemGovernanceWaiver` persistence & exception matching. |
| **Phase 23** | `openapi-parser.service.ts` & `system-contract-evolution.service.ts` | Structural OpenAPI parsing & contract delta calculation. |
| **Phase 24** | `system-traceability-audit.service.ts` | Document traceability completeness & gap auditing. |
| **Phase 25** | `system-contract-matrix.service.ts` | Cross-project contract interoperability matrix ($N \times N$ compatibility grid). |
| **Phase 27** | `system-release-certificate.service.ts` | Cryptographic `SystemReleaseCertificate` generation, SHA-256 hash verification, & snapshot freezing ($T_{\text{cert}}$). |
| **Phase 28** | `system-release-lineage.service.ts` | Read-only certificate supersession lineage graph traversal & snapshot-to-snapshot ($T_{\text{cert1}}$ vs $T_{\text{cert2}}$) comparison. |

---

## 4. Identified Product Gap After Phase 28

### The Problem

Phase 27 enables a system release to be officially certified at timestamp $T_{\text{cert}}$, capturing a frozen snapshot of the certified release state. Phase 28 compares two frozen certificates ($T_{\text{cert1}}$ vs $T_{\text{cert2}}$) across historical release milestones.

However, in real engineering organizations, software systems do not remain static after certification. Between release milestones (e.g., during active development from certified release `REL-2.0` towards `REL-3.0`), the live operational system ($T_{\text{now}}$) continuously changes:
- Active baselines in connected projects are updated.
- Documentation versions advance or drift.
- Policy waivers granted for the certified release reach their expiration timestamp ($T_{\text{now}} > \text{expiresAt}$) or are revoked.
- OpenAPI contract endpoints are modified, deprecated, or removed in live specs.
- Topology links between projects are added or removed.

Currently, Phase 27's `/verify` endpoint returns a high-level summary flag (`matchesCertifiedState: boolean`). However, when `matchesCertifiedState === false`, **Documan cannot tell the user WHY the live system no longer complies with the certified release state, or WHICH specific components have drifted.**

Documan lacks a structured, multi-dimensional **Post-Certification Compliance Drift & Live Operational Variance Audit Engine**.

### Product Impact of the Gap

Without Phase 29:
1. **Opaque Non-Compliance**: Release managers know a certified release no longer matches live state, but cannot see which specific projects, contracts, or waivers caused the variance.
2. **Unnoticed Policy Expiration**: Policy waivers frozen in a Release Certificate may expire silently in live state ($T_{\text{now}}$), leaving live operations un-waived without visibility.
3. **Contract Drift Blindspot**: Live OpenAPI contract modifications in provider projects can silently break downstream consumer documentation certified in a prior release certificate.
4. **Manual Audit Overhead**: Stewards are forced to manually cross-reference live baselines and waivers against historical certificate JSON snapshots.

---

## 5. Candidate Phase 29 Capabilities Researched

We evaluated three candidate capabilities for Phase 29:

### Candidate A (RECOMMENDED): System-Wide Release Certificate Compliance Drift & Post-Certification Variance Audit Engine
A read-only, request-scoped analytical engine that audits current live operational state ($T_{\text{now}}$) against any historical `SystemReleaseCertificate` snapshot ($T_{\text{cert}}$). It computes 5 structured variance dimensions (Topology, Baseline, Contract, Waiver, and Attestation Variance), evaluates a 4-tier Live Compliance Status (`FULLY_COMPLIANT`, `COMPLIANT_WITH_EXCEPTIONS`, `NON_COMPLIANT_DRIFT`, `INDETERMINATE_EVIDENCE`), and provides actionable remediation guidance.

### Candidate B: Multi-Milestone Release Evolution Trend & Governance Stability Analytics Engine
An aggregate longitudinal analytics engine calculating trend curves over 10–50 historical release certificates (e.g., waiver reliance velocity, contract breakage frequency across release series, release stability index).

### Candidate C: Automated Post-Certification Drift Remediation & Release Re-Certification Worker
An automated background worker that listens for live drift events against certified release snapshots, automatically revoking non-compliant release certificates and auto-generating remediation work requests or new baselines.

---

## 6. Detailed Candidate Comparison

| Dimension | Candidate A (Compliance Drift Audit) | Candidate B (Release Stability Analytics) | Candidate C (Automated Drift Remediation) |
| :--- | :--- | :--- | :--- |
| **Primary User Problem** | Audits exact live operational variance ($T_{\text{now}}$) against a frozen release certificate ($T_{\text{cert}}$). | Analyzes multi-release trend metrics across 10–50 historical certificates. | Automatically repairs drift and revokes non-compliant certificates. |
| **Architectural Alignment** | Perfect extension of Phase 27/28. Audits live state ($T_{\text{now}}$) vs frozen snapshot ($T_{\text{cert}}$). | Complements Phase 28, but offers less urgent daily operational utility. | **VIOLATES INVARIANTS**: Introduces background workers, DB writes, and automated mutations. |
| **Document & Context Focus** | High (audits document baselines, OpenAPI contracts, waivers, and topology links). | Medium (focuses on macro trend statistics over release tags). | Low (focuses on automated task execution). |
| **Persistence Requirements** | **Zero DB Writes** (Derived dynamically at query time). | **Zero DB Writes** (Derived dynamically at query time). | High DB writes (requires background queue, state mutations, auto-revocations). |
| **Determinism & Performance** | Pure deterministic logic ($O(N)$ bulk queries). | Pure deterministic math. | Non-deterministic background async side-effects. |
| **ACL & Privacy Safety** | Strict Phase 14 ACL pruning (`checkUserProjectReadAccess`). | Strict Phase 14 ACL pruning. | Complex background ACL delegation risks. |
| **Overlapping Risk** | Zero overlap with existing phases. | Minor overlap with Phase 22 longitudinal timeline. | Severe overlap with CI/CD deployment orchestration & automated task bots. |

---

## 7. Overlap & Rejection Analysis

Per project guidelines, candidate capabilities must be evaluated against prohibited product categories:

1. **Jira / Generic Task Management**: Rejected Candidate C because auto-generating task boards and repair tickets converts Documan into a task management bot. Candidate A remains document-centric and read-only.
2. **GitHub / VCS Automation**: Rejected any candidate requiring Git commit hooks, automatic PR creation, or branch management.
3. **CI/CD & Deployment Orchestration**: Rejected Candidate C because automatically triggering redeployments or revoking live release tokens creates deployment orchestration drift.
4. **Postman / API Execution**: Rejected candidates attempting live HTTP endpoint probing, network packet inspection, or runtime sandboxing.
5. **Generic Compliance / GRC Platform**: Rejected generic corporate GRC framework compliance. Candidate A strictly audits Documan document baselines, OpenAPI contracts, waivers, and topology evidence.
6. **Infrastructure & APM Monitoring**: Rejected live server CPU/memory/log monitoring.
7. **Vector Canvas / Drawing Software**: Rejected interactive SVG canvas editing.
8. **AI-First / RAG / Vector Search**: Candidate A uses 100% deterministic logic and explicit diffing without non-deterministic LLM guessing.

---

## 8. Recommended Phase 29 Selection

### **Phase 29 — System-Wide Release Certificate Compliance Drift & Post-Certification Variance Audit Engine**

### Why It Is the Correct Next Capability

1. **Completes the Release Governance Lifecycle**:
   $$\text{Phase 19 (Gate Check)} \rightarrow \text{Phase 27 (Certification at } T_{\text{cert}}\text{)} \rightarrow \text{Phase 28 (Snapshot Comparison } T_{\text{cert1}} \text{ vs } T_{\text{cert2}}\text{)} \rightarrow \mathbf{Phase\ 29\ (Live\ Drift\ Audit\ } T_{\text{now}} \text{ vs } T_{\text{cert}}\mathbf{)}$$
2. **Solves a Genuine Unmet Need**: When `matchesCertifiedState === false` in Phase 27, Phase 29 provides the exact root-cause variance taxonomy explaining why live state no longer complies with the certified release.
3. **100% Read-Only & Request-Scoped**: Operates purely on demand with zero database writes, zero audit log writes during GET queries, zero background queue workers, and zero automated side-effects.
4. **Strict Architectural Integrity**: Consumes existing Phase 10, 12, 14, 17, 18, 19, 20, 23, and 27 authorities without duplicating models or logic.

---

## 9. Product Boundary & Non-Goals

### Included Product Scope
- **Post-Certification Variance Audit Engine**: Read-only comparison of current live database state ($T_{\text{now}}$) against a frozen `SystemReleaseCertificate.snapshot` ($T_{\text{cert}}$).
- **5-Dimensional Operational Variance Taxonomy**:
  1. `TOPOLOGY_VARIANCE`: Live connected projects or topology links added/removed since certification.
  2. `BASELINE_VARIANCE`: Live active baselines advanced (`VERSION_ADVANCED`), regressed, or deactivated compared to certified baseline snapshots.
  3. `CONTRACT_VARIANCE`: Live OpenAPI specification endpoint removals, deprecations, or additions in active baselines vs certified specs.
  4. `WAIVER_VARIANCE`: Certified policy waivers that have expired ($T_{\text{now}} > \text{expiresAt}$), been revoked, or newly added waivers relying on live state.
  5. `ATTESTATION_VARIANCE`: Certified fulfillment attestations missing or modified in live state.
- **4-Tier Live Compliance Status Evaluator**:
  - `FULLY_COMPLIANT`: 0 live variances across all 5 dimensions.
  - `COMPLIANT_WITH_EXCEPTIONS`: Live state contains non-breaking baseline advances or valid active waivers covering live variances.
  - `NON_COMPLIANT_DRIFT`: Live state contains breaking contract deltas, expired/revoked waivers, missing baselines, or unwaived gate failures.
  - `INDETERMINATE_EVIDENCE`: Live state lacks required baseline or attestation evidence ($N_{\text{applicable}} = 0$ or unreadable connected projects).
- **Remediation Action Guidance**: Actionable text recommendations (e.g., *"Re-certify system release tag REL-2.0 or grant policy waiver for expired waiver w1"*).
- **Strict ACL Graph Pruning**: Reuses Phase 14 `checkUserProjectReadAccess`. Unauthorized connected project nodes, contracts, and waivers are 100% omitted.

### Non-Goals (Explicit Exclusions)
- **NO Automatic State Mutation**: Does NOT edit document text, create versions, alter baselines, revoke certificates, or modify waivers.
- **NO Background Workers / Polling Crons**: No background jobs, queue schedulers, or file watchers.
- **NO CI/CD / Deployment Execution**: No pipeline triggers, Docker image builds, or infrastructure orchestration.
- **NO AI / LLM Semantic Inference**: 100% pure deterministic comparison logic.
- **NO Database Schema Changes**: 0 new Mongoose models, 0 schema modifications.

---

## 10. Architectural Model & Subsystem Consumption

```text
+-----------------------------------------------------------------------------------+
|                        PHASE 29 READ-ONLY COMPLIANCE AUDIT ENGINE                 |
|                   compareLiveStateToCertificate(userId, certId)                   |
+-----------------------------------------------------------------------------------+
                                          |
      +-----------------------------------+-----------------------------------+
      |                                   |                                   |
      v                                   v                                   v
+--------------------------+  +--------------------------+  +--------------------------+
|  HISTORICAL CERTIFICATE  |  |    CURRENT LIVE STATE    |  |  AUTHORITATIVE ENGINES    |
|  SNAPSHOT (T_cert)       |  |    (T_now)               |  |  (Phases 10, 14, 20, 23) |
+--------------------------+  +--------------------------+  +--------------------------+
| - Frozen Topology        |  | - Active Baselines       |  | - checkUserProjectRead   |
| - Frozen Baselines       |  | - Live Topology Links    |  |   Access (Phase 14 ACL)  |
| - Frozen Waivers         |  | - Active Waivers (T_now) |  | - parseOpenApiSpec       |
| - Frozen Attestations    |  | - Live Attestations      |  |   (Phase 23 OpenAPI)     |
| - Evidence Summary       |  | - System Gate Status     |  | - Waiver Matcher         |
+--------------------------+  +--------------------------+  +--------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     5-DIMENSIONAL VARIANCE TAXONOMY CALCULATOR                    |
| (Topology, Baseline, Structural Contract, Policy Waiver, Attestation Variance)    |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     4-TIER LIVE COMPLIANCE STATUS EVALUATOR                       |
|   (FULLY_COMPLIANT | COMPLIANT_WITH_EXCEPTIONS | NON_COMPLIANT_DRIFT | INDETERMINATE) |
+-----------------------------------------------------------------------------------+
```

---

## 11. Persistence, API, and UI Analysis

### Persistence Analysis
- **New Mongoose Models**: `0` (Zero).
- **Schema Mutations**: `0` (Zero).
- **Database Write Operations**: `0` (Zero).
- **Audit Log Writes on Query**: `0` (Zero).

### API Surface (Minimal Proposed Surface)
- `GET /api/v1/release-certificates/:certificateId/compliance-audit`
  - Returns `ReleaseCertificateComplianceAuditDTO` containing target certificate metadata, live compliance status, 5-dimensional variance breakdowns, and actionable remediation guidance.

### UI Integration Surface
- **`ReleaseCertificateComplianceAuditView.tsx`**:
  - Mounted within the existing Release Certificate Details Drawer / Section.
  - Displays Live Compliance Status Badge (`FULLY_COMPLIANT`, `NON_COMPLIANT_DRIFT`, etc.).
  - Shows variance breakdown cards for Topology, Baselines, OpenAPI Contracts, Policy Waivers, and Attestations.
  - Lists actionable remediation steps for release managers.

---

## 12. ACL, Privacy, Performance, & Determinism Analysis

### ACL & Privacy Boundaries
- Reuses `checkUserProjectReadAccess(userId, userRole, projectId)` for root and connected projects.
- If a user lacks `READ` access on a connected project, that project node, its baseline changes, contract deltas, and waivers are **100% omitted** from the compliance audit result without revealing restricted project IDs or metadata.

### Performance & Processing Bounds
- Single bulk MongoDB `$in` queries for fetching active baselines, documents, and waivers across connected projects.
- Processing bounds enforced:
  - `MAX_CONNECTED_PROJECTS = 50`
  - `MAX_AUDITED_DOCUMENTS = 200`
  - `MAX_CONTRACT_DIFFS = 30`
- Eliminates $N+1$ query overhead.

### Determinism Rules
- Live compliance status evaluation follows strict deterministic tier precedence:
  $$\text{INDETERMINATE\_EVIDENCE} > \text{NON\_COMPLIANT\_DRIFT} > \text{COMPLIANT\_WITH\_EXCEPTIONS} > \text{FULLY\_COMPLIANT}$$
- Zero non-deterministic calculations or time-dependent race conditions.

---

## 13. Risks and Mitigation Strategies

| Identified Risk | Risk Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **False Non-Compliance Alarms** | Medium | Distinguish breaking contract/waiver drift (`NON_COMPLIANT_DRIFT`) from benign baseline version advances covered by active waivers (`COMPLIANT_WITH_EXCEPTIONS`). |
| **Performance Degradation on Large Topology** | Low | Enforce strict processing bounds (`MAX_CONNECTED_PROJECTS = 50`) and single bulk MongoDB queries. |
| **ACL Data Leakage** | Critical | Enforce Phase 14 ACL graph pruning on all connected projects before assembling variance DTOs. |
| **Scope Creep into CI/CD Orchestration** | High | Strictly maintain read-only query semantics. Do not implement automated webhook auto-triggers, certificate revocation workers, or pipeline runners. |

---

## 14. Alternatives Considered and Rejected

1. **Adding Compliance Drift directly inside Phase 27 `verifyCertificateIntegrity`**:
   - *Rejected*: `verifyCertificateIntegrity` is a cryptographic SHA-256 hash check verifying that the historical certificate document has not been tampered with. Mixing live operational drift analysis into a cryptographic hash check violates single responsibility principles.
2. **Adding Compliance Drift inside Phase 28 `compareReleaseCertificates`**:
   - *Rejected*: Phase 28 compares two frozen historical certificate snapshots ($T_{\text{cert1}}$ vs $T_{\text{cert2}}$). Auditing live state ($T_{\text{now}}$) against a frozen snapshot ($T_{\text{cert}}$) is a distinct operational capability.
3. **Automated Background Polling Cron for Live Drift**:
   - *Rejected*: Violates Documan's request-scoped, synchronous architectural invariant.

---

## 15. Open Architectural Questions

1. *Should live policy waiver expiration ($T_{\text{now}} > \text{expiresAt}$) trigger `NON_COMPLIANT_DRIFT` if the certified release gate status was `PASSED_WITH_WAIVER`?*
   - **Proposed Answer**: Yes. If a release was certified based on a waiver that has since expired in live state, the live system is operating without a valid waiver, producing `NON_COMPLIANT_DRIFT`.
2. *Should live baseline version advances (e.g., provider updated `BL-1.0` to `BL-2.0`) be classified as `COMPLIANT_WITH_EXCEPTIONS` if no breaking contract deltas exist?*
   - **Proposed Answer**: Yes. Non-breaking baseline advances represent normal software evolution and should be classified as `COMPLIANT_WITH_EXCEPTIONS` rather than `NON_COMPLIANT_DRIFT`.

---

## 16. Research Conclusion

Phase 29 — **System-Wide Release Certificate Compliance Drift & Post-Certification Variance Audit Engine** represents the genuine, logical, non-overlapping next step in Documan's product evolution.

It bridges the gap between historical release certification (Phase 27) and live system operations, allowing technical stewards to audit exact operational variance ($T_{\text{now}}$ vs $T_{\text{cert}}$) with complete precision, zero database writes, zero background workers, strict ACL privacy, and pure deterministic logic.

**Recommendation**: Proceed to Implementation Planning for Phase 29 upon research review approval.
