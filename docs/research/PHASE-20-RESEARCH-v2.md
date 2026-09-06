# Phase 20 Research v2 — Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

## 1. Research Objective

The objective of Phase 20 Research v2 is to refine and specify the next authoritative product capability for **Documan** following the completion of **Phase 19: Cross-Project System Topology Governance Gate** (merged in commit `0da9578`).

This revised research artifact resolves all architectural and governance questions identified in the Phase 20 Research v1 review:
- Reconciles the Phase 19 API status contract and `passed` boolean semantics.
- Aligns waiver creation authorization with established Phase 10 `verifyWaiverAuthority` rules.
- Reframes product positioning to eliminate deployment orchestration drift.
- Establishes a minimal, deterministic waiver scope and strict version-binding rules.
- Clarifies the distinction between Phase 17 attestations and Phase 20 governance waivers.
- Justifies the persistence model and query-time expiration strategy.
- Formulates the complete Phase 20 10-step decision precedence engine.

---

## 2. Current Product Baseline (Phase 1 – Phase 19)

Documan's 14 API modules provide a rich foundation of document management, graph topology, baseline alignment, and release gate decision capabilities:

| Phase | Capability Area | Key Services / Models | Architectural Function |
| :--- | :--- | :--- | :--- |
| **Phase 1–6** | Core Document Management | `Document`, `DocumentVersion`, `Folder`, `User`, `DocumentShare` | CRUD, hierarchical folders, versioning, SHA-256 integrity, JWT auth, permission checks (`READ`/`EDIT`/`ADMIN`). |
| **Phase 7.1–7.2** | Project & API Context | `Project`, `ApiSpec`, `ApiSpecEndpoint` | Associates technical documents with project boundaries and OpenAPI endpoints. |
| **Phase 7.3** | Cross-Document Impact | `DocumentRelationship`, `document-impact-cascade.service.ts` | Graph of typed document links (`DEPENDS_ON`, `REFERENCES`, `REPLACES`, `RELATED`) with change cascade analysis. |
| **Phase 7.4** | Immutable Snapshots | `DocumentVersion`, SHA-256 integrity | Content hashing, immutable version snapshots, and content historical comparison. |
| **Phase 7.5** | Technical Knowledge Risk | `knowledge-risk.service.ts` | Quantitative knowledge risk scoring, stale review age tracking, and risk categorization. |
| **Phase 8** | Knowledge Discovery | `knowledge-discovery.service.ts` | Search, taxonomy tagging, document relevance ranking, and contextual knowledge discovery. |
| **Phase 9** | Documentation Evidence | `evidence-calculator.ts`, `evidence.service.ts` | Quantitative evidence coverage calculations for technical specifications and project assets. |
| **Phase 10** | Local Governance & Assurance | `release-gate-evaluator.service.ts`, `governance-evaluator.service.ts`, `gate-token.ts`, `verifyWaiverAuthority` | Single-project document health checks, GateToken CI/CD auth, and local document waivers (`GOVERNANCE_WAIVER_GRANTED`). |
| **Phase 11** | Change Intelligence | `verification-plan.service.ts` | Automated verification plan generation for proposed document changes. |
| **Phase 12** | Authoritative Baselines | `DocumentationBaseline` | Point-in-time document version snapshots and baseline drift tracking per project (`isActive: true`). |
| **Phase 13** | Work Requests | `WorkRequest` | Structured documentation review workflows, assignments, and status tracking. |
| **Phase 14** | Project Topology Graph | `ProjectTopologyLink`, `project-topology.service.ts` | Inter-project dependency graph (`DEPENDS_ON`, `PROVIDES_API_TO`) with ACL-safe traversal (`MAX_DEPTH=3`, `MAX_NODES=50`). |
| **Phase 15** | Pre-Change Simulation | `ChangeProposal`, `change-proposal.service.ts` | Impact simulation and structural change proposal engine. |
| **Phase 16** | Change Packages | `DocumentChangePackage`, `change-package.service.ts` | Multi-proposal change aggregation and coordinated impact simulation across documents. |
| **Phase 17** | Fulfillment Attestation | `PackageFulfillmentAttestation`, `change-package-attestation.service.ts` | Post-acceptance verification, version snapshot binding, and dynamic query-time attestation staleness detection. |
| **Phase 18** | Baseline Contract Lineage | `system-baseline-alignment.service.ts` | Derived, query-time cross-project contract alignment (`ALIGNED`, `MISALIGNED`, `INDETERMINATE`) and dual-metric scoring. |
| **Phase 19** | System Topology Gate | `system-topology-governance-gate.service.ts` | Cross-project release gate evaluating 9-step decision precedence across topology graphs (`PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`). |

---

## 3. Product Framing & Removal of Deployment Drift

### Product Positioning
Documan is a **document management, technical context, and system governance decision platform**.

Documan evaluates whether a project's technical documentation, baselines, and cross-project contract dependencies satisfy defined governance criteria. It is **NOT**:
- A software deployment execution tool or release pipeline orchestrator.
- A CI/CD build runner or deployment trigger engine.
- A container or cloud infrastructure controller.

### Correct Definition of a System Governance Waiver
In Documan, a **System Governance Waiver** represents:
> **An explicit, time-bounded, scope-restricted acceptance of a known documentation or contract governance exception granted by an authorized technical steward (Project Owner or Admin).**

A waiver alters the **governance decision output** of Documan's system release gate service (`system-topology-governance-gate.service.ts`). It does NOT trigger software deployments, execute shell commands, or manage cloud infrastructure.

---

## 4. Phase 19 Status Contract Compatibility

Phase 19 established the following return structure:
- `systemReleaseStatus`: `'PASSED' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED'`
- `passed`: `boolean` (where `passed === (systemReleaseStatus === 'PASSED')`)

### Design Option Analysis

#### Option A: Extend Status Model Enum
Add `'PASSED_WITH_WAIVER'` to `SystemReleaseStatus`:
- `systemReleaseStatus`: `'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED'`
- `passed`: `systemReleaseStatus === 'PASSED' || systemReleaseStatus === 'PASSED_WITH_WAIVER'`

#### Option B: Preserve Phase 19 Enum Exactly
Keep `systemReleaseStatus` strictly as `'PASSED' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED'`:
- Set `systemReleaseStatus = 'PASSED'` when all blockers are satisfied (structurally or via valid waivers).
- Expose waiver details in a separate metadata field (e.g. `waiverSummary: { hasActiveWaivers: true }`).

### Selected Design: Option A (`PASSED_WITH_WAIVER`)

**Rationale**:
1. **Audit Transparency**: Security officers and CI/CD audit logs must immediately distinguish a release gate that passed cleanly (`PASSED`) from one that passed due to policy exceptions (`PASSED_WITH_WAIVER`). Hiding active waivers under a generic `'PASSED'` status creates compliance opacity.
2. **Backward Compatibility**: Automated consumers (such as CI/CD gate checks) checking `response.passed === true` continue to function without modification, as `passed` remains `true` for both `'PASSED'` and `'PASSED_WITH_WAIVER'`.
3. **Strict Gate Semantics**: `passed: true` is returned **ONLY** when all blocking conditions are satisfied by valid, active, non-expired waivers. If an un-waived blocker remains, `systemReleaseStatus` evaluates as `'BLOCKED'` and `passed` evaluates as `false`.

---

## 5. Governance Waiver Authority Model (Phase 10 Alignment)

Inspection of Phase 10 (`assurance.service.ts` L48-76) reveals the established authorization rule for governance overrides:

```ts
export async function verifyWaiverAuthority(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  ...
  if (role === 'admin' || doc.ownerId.toString() === userId) {
    return doc;
  }
  if (doc.projectId) {
    const project = await Project.findOne({ _id: doc.projectId, isArchived: false });
    if (project && project.ownerId.toString() === userId) {
      return doc;
    }
  }
  throw new AppError(
    'Forbidden: Granting or revoking governance waivers requires Project Owner, Document Owner, or Admin authority',
    403,
    'FORBIDDEN',
  );
}
```

### Phase 20 Authorization Model
In Documan, a governance waiver is an authoritative override, **NOT** an ordinary document edit. Shared `EDIT` or `viewer` members **CANNOT** grant or revoke system governance waivers.

To grant or revoke a **System Governance Waiver** on a project topology:
1. The actor MUST be a System `admin` **OR** the **Project Owner** (`project.ownerId === userId`) of the root consumer project being evaluated.
2. If a waiver is scoped to a specific provider project, the actor MUST possess `Owner` or `Admin` authority over either the root consumer project or the target provider project.
3. Ordinary shared members (`EDIT` permission) attempting to grant a waiver will be rejected with `403 FORBIDDEN`.

---

## 6. Persistence Strategy: Dedicated Model vs. Audit Logging

### Audit of Phase 10 Persistence
Phase 10 logs local document waivers as `DocumentAudit` records (`action: 'GOVERNANCE_WAIVER_GRANTED'`). Phase 10 does not maintain a separate `GovernanceWaiver` collection; instead, it queries `DocumentAudit` logs for a single document.

### Justification for a Dedicated `SystemGovernanceWaiver` Model in Phase 20

While Phase 10 operates on a single document, Phase 20 evaluates multi-project dependency graphs (`ProjectTopologyLink`) containing up to 50 nodes and depth 3.

Querying an append-only, unindexed `DocumentAudit` log across dozens of connected projects during a real-time release gate evaluation (which must execute in `<35ms`) creates unacceptable query latency and compute overhead.

Therefore, Phase 20 adopts a **Dual-Storage Governance Pattern**:
1. **Targeted Operational Collection (`SystemGovernanceWaiver`)**: Maintains active waiver records with compound indexes (`rootProjectId`, `targetProviderProjectId`, `isRevoked`, `expiresAt`) for high-speed, query-time matching.
2. **Immutable Audit Trail (`DocumentAudit`)**: Every waiver creation (`GOVERNANCE_SYSTEM_WAIVER_GRANTED`) and revocation (`GOVERNANCE_SYSTEM_WAIVER_REVOKED`) emits an append-only audit event into `DocumentAudit`.

---

## 7. Terminology Distinction: Attestation vs. Waiver

It is critical to distinguish Phase 17 attestations from Phase 20 waivers:

- **Package Fulfillment Attestation (Phase 17)**: Evidence created by an attestor (`attestedBy`) confirming that change package proposals were verified and fulfilled against document version snapshots.
- **System Governance Waiver (Phase 20)**: An authoritative policy exception granted by a governance authority (`grantedByUserId` / Project Owner / Admin) accepting a known governance blocker for a defined scope and time period.

The term **"Attestor"** refers strictly to Phase 17 fulfillment verification. Phase 20 waiver creators are designated as **"Grantors"** or **"Waiver Authorities"**.

---

## 8. Waiver Scope & Strict Version-Binding Rules

### Minimum Safe Scope Definition
To prevent over-broad waiver application, a `SystemGovernanceWaiver` binds strictly to the following fields:

```ts
export interface ISystemGovernanceWaiver extends Document {
  rootProjectId: Types.ObjectId;             // Root consumer project being evaluated (Required)
  targetProviderProjectId?: Types.ObjectId;  // Specific upstream provider project (Optional)
  targetDocumentId?: Types.ObjectId;         // Specific provider document (Optional)
  contractVersionNumber?: number;            // Specific contract version number (Optional)
  blockerType: 'CONTRACT_MISALIGNMENT' | 'UNATTESTED_BASELINE' | 'STALE_ATTESTATION' | 'PROVIDER_GATE_BLOCKED'; // (Required)
  reason: string;                             // Rationale provided by grantor (Required)
  grantedByUserId: Types.ObjectId;           // User ID of Project Owner / Admin (Required)
  expiresAt: Date;                            // Expiration date (Required)
  isRevoked: boolean;                         // Manual revocation flag (Required, default: false)
  revokedAt?: Date;                           // Revocation timestamp
  revokedByUserId?: Types.ObjectId;          // Revocation actor ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Strict Version-Binding Invariant
> **If a waiver is granted for Provider Contract Version 1 (`contractVersionNumber: 1`), does it automatically cover Provider Contract Version 2 (`v2`)?**
>
> **ANSWER: NO.**
> Versioning in Documan represents a new authoritative technical state. If `contractVersionNumber` is specified (e.g. `1`), the waiver binds **strictly to version 1**. When the provider project updates its active baseline to `v2`, the version mismatch invalidates the scope match, and the waiver will **NOT** apply to `v2`. The gate will return `BLOCKED` until a new waiver is explicitly granted for `v2` or the contract is aligned.

---

## 9. Waiver Lifecycle & Deterministic Matching Rules

### Waiver Lifecycle
1. **Creation**: Granted by Root Project Owner or Admin with mandatory `reason` and `expiresAt` date. Emits `GOVERNANCE_SYSTEM_WAIVER_GRANTED` audit event.
2. **Active**: `isRevoked === false` AND `expiresAt > new Date()`. Participates in gate evaluation.
3. **Expired**: `expiresAt <= new Date()`. Automatically ignored at query time without background workers (`expiresAt: { $gt: new Date() }`).
4. **Revoked**: `isRevoked === true`. Manually invalidated by Owner/Admin. Emits `GOVERNANCE_SYSTEM_WAIVER_REVOKED` audit event.

### Deterministic Scope Matching Algorithm
When evaluating a system gate blocker (e.g. Provider Beta contract misaligned on Document `doc-123`):

A waiver matches the blocker **IF AND ONLY IF**:
1. `waiver.rootProjectId === rootProjectId`
2. `waiver.isRevoked === false`
3. `waiver.expiresAt > new Date()`
4. `waiver.blockerType === blocker.type`
5. `waiver.targetProviderProjectId` is undefined **OR** matches `blocker.providerProjectId`
6. `waiver.targetDocumentId` is undefined **OR** matches `blocker.providerDocumentId`
7. `waiver.contractVersionNumber` is undefined **OR** matches `blocker.providerVersionNumber`

### Multiple Matching Waivers
If multiple active waivers match a single blocker, evaluation is deterministic:
- The blocker is considered **WAIVED**.
- All matching active waiver IDs are attached to the blocker's evidence record (`waivedByWaiverIds: [...]`).

---

## 10. Phase 20 10-Step Decision Precedence Engine

Waivers extend Phase 19's precedence rules without altering fundamental governance guarantees:

```text
1. Root governance disabled ----------------------------------> GOVERNANCE_DISABLED (passed: false)
2. Root local Phase 10 gate blocked -------------------------> BLOCKED (passed: false) [Un-waivable]
3. Topology truncation limit exceeded ------------------------> INDETERMINATE (passed: false) [Un-waivable]
4. Required evidence indeterminate --------------------------> INDETERMINATE (passed: false) [Un-waivable]
5. Contract misalignment -------------------> Un-waived ------> BLOCKED (passed: false)
                                       +----> All Waived ----+
6. Provider baseline unattested ------------> Un-waived ------>|
                                       +----> All Waived ----+
7. Provider attestation stale --------------> Un-waived ------>|
                                       +----> All Waived ----+
8. Upstream provider local gate blocked ----> Un-waived ------>|
                                       +----> All Waived ----+
                                                             |
9. All cross-project blockers waived by active waivers ------> PASSED_WITH_WAIVER (passed: true)
10. Fully satisfied without waivers -------------------------> PASSED (passed: true)
```

### Critical Governance Guarantees
- **`GOVERNANCE_DISABLED` is NEVER waived**: Turning off governance bypasses evaluation entirely; waivers cannot convert a disabled state into approval.
- **`INDETERMINATE` states are NEVER waived**: Truncated topology graphs or missing acceptance audit logs represent unknown risk, which cannot be waived without verified evidence.
- **Root Local Gate Blockers are NOT waived by System Waivers**: Local document health failures (e.g. unreviewed documents or failed assurance checks) must be resolved via Phase 10 local waivers, preserving single-project authority.

---

## 11. Evaluation & Scoring of Candidate Capabilities

Re-evaluating Candidate 1 against the 50-point scoring model under the refined v2 parameters:

| Criterion (Max 5 pts) | Score | Justification |
| :--- | :---: | :--- |
| **1. Product Value** | **5.0** | Solves the acute binary release gate deadlock in multi-project engineering teams. |
| **2. Alignment with Identity** | **5.0** | Preserves Documan's document context, traceability, and governance identity. |
| **3. Reuse of Primitives** | **5.0** | Composes Phase 10, 14, 17, 18, and 19 primitives cleanly. |
| **4. Architectural Leverage** | **5.0** | Extends system release gate evaluation via query-time waiver resolution. |
| **5. Traceability & Governance** | **5.0** | Delivers full audit logging and transparent `PASSED_WITH_WAIVER` status tracking. |
| **6. Cross-Project Value** | **5.0** | Provides multi-project, topology-aware policy exception lifecycles. |
| **7. Product Differentiation** | **5.0** | Differentiates Documan from simple CI checkers by offering audit-defensible policy exception lifecycles. |
| **8. Implementation Feasibility** | **4.5** | Additive Mongoose model and service extension; straightforward to test and verify. |
| **9. Security / ACL Feasibility** | **5.0** | Strictly enforces Project Owner/Admin authority (`verifyWaiverAuthority`) and ACL privacy (`checkUserProjectReadAccess`). |
| **10. Scope Safety & Anti-Drift** | **4.5** | Zero deployment orchestration, zero background workers, zero generic task management. |
| **TOTAL SCORE** | **49.0 / 50** | **Leading Candidate** |

---

## 12. Scope Boundaries

### IN SCOPE
- Scoped system governance waiver creation, listing, retrieval, and manual revocation.
- Exact scope matching (root project, target provider project, target document, contract version, blocker type).
- Dynamic query-time expiration checking (`expiresAt: { $gt: new Date() }`).
- 10-step precedence system release gate evaluation engine producing `PASSED_WITH_WAIVER`.
- Immutable audit event logging (`GOVERNANCE_SYSTEM_WAIVER_GRANTED`, `GOVERNANCE_SYSTEM_WAIVER_REVOKED`).
- Permission-safe REST API endpoints (`/projects/:projectId/system-governance-waivers`).
- React governance UI section displaying active waivers, waiver modal, and status badges.

### OUT OF SCOPE
- Software deployment execution, release pipelines, Docker builds, or cloud infrastructure orchestration.
- CI/CD build runner execution or pipeline triggers.
- Automatic waiver approval or AI-driven waiver generation.
- Background cron workers or queue infrastructure.
- Visual architecture canvas/editor.

---

## 13. Success Criteria

1. **Gate Decision Accuracy**: Evaluates `PASSED_WITH_WAIVER` when all blockers have active, non-expired waivers, and `BLOCKED` when at least one un-waived blocker remains.
2. **Boolean `passed` Semantics**: `passed === true` ONLY when `systemReleaseStatus` is `'PASSED'` or `'PASSED_WITH_WAIVER'`.
3. **Waiver Authority Enforcement**: Rejects non-Owner/non-Admin waiver creation calls with `403 FORBIDDEN`.
4. **Version-Binding Invariant**: Confirms that a waiver bound to `v1` does NOT apply when provider updates to `v2`.
5. **Expiration & Revocation**: Confirms that expired or revoked waivers are ignored at query time.
6. **Auditability**: 100% audit logging of waiver creation and revocation in `DocumentAudit`.
7. **ACL Safety**: Zero leakage of unauthorized connected projects or waiver scopes.
8. **Performance**: Waiver-aware gate evaluation query execution `< 35ms`.
9. **Regression Safety**: 100% pass rate across Phase 10, 14, 17, 18, and 19 QA matrix suites.

---

## 14. Roadmap Placement & Final Recommendation

**Placement Justification**: Phase 20 is the exact logical successor to Phase 19. Phase 19 established the multi-project release gate (`system-topology-governance-gate.service.ts`). Phase 20 completes the operational governance loop by adding audit-defensible policy exceptions and waiver lifecycles for multi-project release gates.

**Final Recommendation**: **Proceed with Phase 20: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management.**

The revised research is complete. Standing by for Phase 20 Research Review.
