# Phase 20 Research v3 — Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

## 1. Research Objective & Executive Summary

The objective of Phase 20 Research v3 is to establish the final, authoritative product capability definition for **Documan** following the completion of **Phase 19: Cross-Project System Topology Governance Gate** (merged in commit `0da9578`).

This revised research artifact resolves all architectural, scope, taxonomy, and compatibility requirements identified in the Phase 20 Research v2 review:
- Defines a **closed blocker taxonomy** classifying every Phase 19 system condition as **WAIVABLE** or **NON_WAIVABLE**.
- Eliminates "whole-provider-gate bypass" by mandating document-level scope binding for local provider gate blockers.
- Proves Phase 19 API/UI contract compatibility for `PASSED_WITH_WAIVER` and `passed: boolean`.
- Reframes product positioning to eliminate deployment orchestration drift.
- Establishes explicit scope omission semantics and strict version-binding rules (v1 waivers DO NOT cover v2 baselines).
- Aligns waiver creation authorization strictly with Phase 10 `verifyWaiverAuthority` (Project Owner & Admin only).
- Defines deterministic revocation semantics, multiple-waiver resolution, and the operational vs audit persistence boundary.
- Formulates the complete Phase 20 **10-Condition Decision Precedence Matrix**.

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

## 3. Product Problem Framing (Eliminating Deployment Drift)

### Product Positioning
Documan is a **document management, technical context, and system governance decision platform**.

Documan detects known documentation gaps, baseline drift, contract misalignments, and release gate blockers across connected project topology graphs. It is **NOT**:
- A software deployment execution tool or cloud release orchestrator.
- A CI/CD build runner or deployment pipeline trigger engine.
- An infrastructure container or environment controller.

### The Real Product Problem
Documan detects known governance blockers across project topology graphs (Phase 19). However, when a known, low-risk documentation variance or pending attestation exists, Documan currently lacks a formal, bounded, auditable mechanism for an authorized Project Owner or Admin to accept a specific governance exception for a defined scope and time period.

### Definition of a System Governance Waiver
In Documan, a **System Governance Waiver** represents:
> **An explicit, time-bounded, scope-restricted acceptance of a known documentation or contract governance exception granted by an authorized technical steward (Project Owner or Admin).**

A waiver modifies Documan's **governance evaluation decision output** (`system-topology-governance-gate.service.ts`). It does NOT authorize or execute software deployments.

---

## 4. Phase 19 Consumer Compatibility & Contract Verification

Phase 19 established the following API return contract:
- `systemReleaseStatus`: `'PASSED' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED'`
- `passed`: `boolean` (where `passed === (systemReleaseStatus === 'PASSED')`)

### Codebase Inspection of Phase 19 Consumers

Inspection of existing frontend component [`SystemGovernanceGateSection.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx) (L53-65):
```tsx
const getStatusBadgeStyle = (status: SystemReleaseStatus) => {
  switch (status) {
    case 'PASSED':
      return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
    case 'BLOCKED':
      return { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' };
    case 'INDETERMINATE':
      return { background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' };
    case 'GOVERNANCE_DISABLED':
    default:
      return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' };
  }
};
```

### Compatibility Proof for `PASSED_WITH_WAIVER`

1. **Frontend Safety**: `getStatusBadgeStyle` contains a `default:` case fallback. Adding `case 'PASSED_WITH_WAIVER'` provides explicit teal styling (`#e0f2f1`) without breaking runtime UI rendering.
2. **Boolean Gate Consumers**: Automated consumers checking `response.passed === true` continue to evaluate successfully:
   - `passed: true` for `PASSED`
   - `passed: true` for `PASSED_WITH_WAIVER`
   - `passed: false` for `BLOCKED`
   - `passed: false` for `INDETERMINATE`
   - `passed: false` for `GOVERNANCE_DISABLED`
3. **Authoritative Distinction**: `systemReleaseStatus` remains the sole authoritative enum distinguishing clean release gate passes (`PASSED`) from policy exception passes (`PASSED_WITH_WAIVER`).

---

## 5. Closed Blocker Taxonomy & Classification

Inspection of Phase 19 (`system-topology-governance-gate.service.ts`) identifies the finite, closed set of Phase 19 system release conditions. Every condition is strictly classified as **WAIVABLE** or **NON_WAIVABLE**:

| Condition Enum / Blocker Code | Description | Classification | Rationale for Classification |
| :--- | :--- | :---: | :--- |
| `ROOT_GOVERNANCE_DISABLED` | Root project `isGovernanceEnabled === false`. | **NON_WAIVABLE** | Root project has explicitly turned off governance. Governed release checks are bypassed; waivers cannot override a disabled governance setting. |
| `ROOT_LOCAL_GATE_BLOCKED` | Root project's local Phase 10 release gate is `BLOCKED`. | **NON_WAIVABLE** | Root project's local document health failures must be resolved locally via Phase 10 document waivers or review approvals, preserving local project authority. |
| `TOPOLOGY_TRUNCATION` | Graph traversal encountered limits (`MAX_DEPTH=3`, `MAX_NODES=50`). | **NON_WAIVABLE** | Unvisited applicable dependencies exist beyond graph limits. Unknown graph dependencies cannot be waived because their risk is unquantified. |
| `INDETERMINATE_EVIDENCE` | Baseline alignment has `aggregateState === 'INDETERMINATE'`. | **NON_WAIVABLE** | Missing baselines or missing package acceptance logs represent an incomplete/unverified state. Indeterminate evidence cannot be converted into release approval without verified evidence. |
| `CONTRACT_MISALIGNED` | Cross-project dependency contract version mismatch. | **WAIVABLE** | An explicit version mismatch between consumer baseline reference and provider active baseline can be waived by a Project Owner/Admin for a specific release window. |
| `PROVIDER_ATTESTATION_MISSING` | Provider active baseline lacks a Phase 17 fulfillment attestation. | **WAIVABLE** | A provider active baseline that lacks a Phase 17 attestation can be waived by a Project Owner/Admin if the provider contract is known to be stable. |
| `PROVIDER_ATTESTATION_STALE` | Provider document head version drifted beyond snapshot version. | **WAIVABLE** | A provider whose document head version drifted after attestation can be waived by a Project Owner/Admin if the head drift is non-breaking. |
| `PROVIDER_LOCAL_GATE_BLOCKED` | Upstream provider project's local Phase 10 release gate is `BLOCKED`. | **WAIVABLE WITH GRANULARITY** | An upstream provider project's local gate failure can be waived ONLY when bound to specific provider document/blocker scopes, preventing monolithic whole-project bypass. |
| `PROVIDER_GOVERNANCE_DISABLED` | Upstream provider project has governance disabled. | Non-blocking | Recorded in evidence metadata; does not block evaluation by itself. |

---

## 6. Granular Provider Local Gate Protection (Abolishing Whole-Provider Bypass)

Inspection of Phase 10 `evaluateReleaseGateInternal` shows that a provider project's local release gate returns specific blocking documents:
`providerGate.blockingDocuments = Array<{ documentId: string, title: string, reason: string }>`.

### Whole-Provider-Gate Bypass Prevention Rule
A Phase 20 waiver for `PROVIDER_LOCAL_GATE_BLOCKED` **MUST NOT** be a monolithic project-level wildcard (`providerProjectId` alone).

It **MUST BIND TO THE SPECIFIC PROVIDER DOCUMENT** (`targetDocumentId` or specific blocking document title).

- **Example**: If Provider Project Beta has 3 blocking documents (`Doc Alpha` - stale review, `Doc Beta` - unreviewed API spec, `Doc Gamma` - changes requested), a waiver created with `targetDocumentId: Doc Alpha._id` waives **ONLY `Doc Alpha`**.
- `Doc Beta` and `Doc Gamma` remain un-waived blockers, causing the system gate to return `systemReleaseStatus: 'BLOCKED'` (`passed: false`).

This rule completely eliminates whole-provider project gate bypass and preserves Phase 10 document-level governance integrity.

---

## 7. Optional Scope Semantics & Wildcard Prevention

A `SystemGovernanceWaiver` record contains explicit scope fields:

```ts
export interface ISystemGovernanceWaiver {
  rootProjectId: Types.ObjectId;             // Required: Consumer project
  blockerType: SystemBlockerType;            // Required: Closed enum
  targetProviderProjectId?: Types.ObjectId;  // Optional: Provider project boundary
  targetDocumentId?: Types.ObjectId;         // Optional: Specific provider document
  contractVersionNumber?: number;            // Optional: Specific contract version
  reason: string;                             // Required: Rationale
  grantedByUserId: Types.ObjectId;           // Required: Owner / Admin ID
  expiresAt: Date;                            // Required: Expiration date
  isRevoked: boolean;                         // Required: Revocation flag
}
```

### Scope Omission Semantics
- `targetProviderProjectId` omitted: Waiver applies to ANY provider project in the root topology graph experiencing the specified `blockerType`. *(Permitted ONLY for system-wide policy exceptions granted by System Admin or Root Project Owner).*
- `targetDocumentId` omitted: Waiver applies to ANY document within the specified provider project for that `blockerType`. *(REJECTED for `PROVIDER_LOCAL_GATE_BLOCKED`).*
- `targetDocumentId` provided: Waiver applies **ONLY to that exact document**.
- `contractVersionNumber` omitted: Waiver applies to the specified document/project for the duration of `expiresAt`.
- `contractVersionNumber` provided: Waiver applies **ONLY to that exact contract version number** (e.g. `v1`).

### Concrete Scope Examples

1. **Exact Provider / Document / Version Waiver**:
   `rootProjectId: RootApp`, `targetProviderProjectId: AuthProvider`, `targetDocumentId: OAuthSpecDoc`, `contractVersionNumber: 1`, `blockerType: CONTRACT_MISALIGNED`.
   - **Matches**: `CONTRACT_MISALIGNED` blocker on `OAuthSpecDoc` version 1 from `AuthProvider`.
   - **Does NOT Match**: `OAuthSpecDoc` version 2, or any document from `PaymentProvider`.

2. **Project-Scoped Provider Waiver**:
   `rootProjectId: RootApp`, `targetProviderProjectId: PaymentProvider`, `blockerType: PROVIDER_ATTESTATION_MISSING`.
   - **Matches**: Any `PROVIDER_ATTESTATION_MISSING` blocker originating from `PaymentProvider`.
   - **Does NOT Match**: `STALE_ATTESTATION` blockers, or `PROVIDER_LOCAL_GATE_BLOCKED` failures from `PaymentProvider`.

3. **Forbidden Wildcard (Rejected)**:
   `rootProjectId: RootApp`, `blockerType: PROVIDER_LOCAL_GATE_BLOCKED` (with `targetDocumentId` omitted).
   - **Validation Error**: `400 BAD_REQUEST: Waivers for PROVIDER_LOCAL_GATE_BLOCKED require a targetDocumentId`.

---

## 8. Version-Binding Safety Invariant

> **If a waiver is granted for Provider Contract Version 1 (`contractVersionNumber: 1`), does it automatically cover Provider Contract Version 2 (`v2`)?**
>
> **ANSWER: NO.**
> Versioning in Documan represents a new authoritative technical state. If `contractVersionNumber` is specified (e.g. `1`), the waiver binds **strictly to version 1**. When the provider project updates its active baseline to `v2`, the version mismatch invalidates the scope match, and the waiver will **NOT** apply to `v2`. The gate will return `BLOCKED` until a new waiver is explicitly granted for `v2` or the contract is aligned.

---

## 9. Governance Waiver Authority Model (Phase 10 Alignment)

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

## 10. Attestation vs. Waiver Terminology Boundary

It is critical to distinguish Phase 17 attestations from Phase 20 waivers:

- **Package Fulfillment Attestation (Phase 17)**: Evidence created by an attestor (`attestedBy`) confirming that change package proposals were verified and fulfilled against document version snapshots.
- **System Governance Waiver (Phase 20)**: An authoritative policy exception granted by a governance authority (`grantedByUserId` / Project Owner / Admin) accepting a known governance blocker for a defined scope and time period.

The term **"Attestor"** refers strictly to Phase 17 fulfillment verification. Phase 20 waiver creators are designated as **"Grantors"** or **"Waiver Authorities"**.

---

## 11. Operational State vs. Audit Authority

### Operational Source (`SystemGovernanceWaiver`)
The `SystemGovernanceWaiver` Mongoose collection is the **authoritative operational current-state source** queried dynamically during high-speed gate evaluations (`evaluateSystemTopologyGovernanceGate`).
- Indexed by `{ rootProjectId: 1, isRevoked: 1, expiresAt: 1 }`.
- Optimized for sub-35ms query matching.

### Immutable Audit Provenance (`DocumentAudit`)
`DocumentAudit` is the **immutable historical provenance log**.
- Every waiver grant emits `GOVERNANCE_SYSTEM_WAIVER_GRANTED`.
- Every waiver revocation emits `GOVERNANCE_SYSTEM_WAIVER_REVOKED`.
- `DocumentAudit` is NEVER queried during real-time gate evaluation. Consistency is guaranteed because API endpoints mutate `SystemGovernanceWaiver` and write a `DocumentAudit` event in the same atomic execution.

---

## 12. Waiver Lifecycle & Revocation Semantics

```text
               +-----------------------+
               |   Waiver Creation     | (Emits GOVERNANCE_SYSTEM_WAIVER_GRANTED)
               +-----------------------+
                           |
                           v
               +-----------------------+
               |   Status: ACTIVE      | (isRevoked: false && expiresAt > Date.now())
               +-----------------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
  [expiresAt <= Date.now()]     [Owner/Admin Revokes]
            |                             |
            v                             v
  +-------------------+       +-----------------------+
  |  Status: EXPIRED  |       |   Status: REVOKED     | (isRevoked: true, emits
  |  (Query Filtered) |       |   (Permanent Inactive)|  GOVERNANCE_SYSTEM_WAIVER_REVOKED)
  +-------------------+       +-----------------------+
```

### Revocation Rules
1. **Who May Revoke**: Root Project Owner, Target Provider Project Owner, or System Admin.
2. **Immediate Effect**: Zero caching. The very next gate check queries `isRevoked: false`, so the revoked waiver is instantly ignored, the underlying blocker is re-evaluated, and status returns to `BLOCKED`.
3. **Permanent Invalidation**: Revoked waivers setting `isRevoked: true` are permanently inactive and can **NEVER** reactivate.
4. **Audit Metadata**: Revocation events in `DocumentAudit` record `waiverId`, `revokedByUserId`, `revokedAt`, and `rootProjectId`.

---

## 13. Multiple-Waiver & Deterministic Matching Algorithm

When evaluating a list of system gate blockers against active waivers:

1. **Overlapping & Duplicate Scopes**: Allowed. Multiple valid waivers may cover the same blocker.
2. **Sufficiency**: If **AT LEAST ONE** valid (active, non-revoked, non-expired) waiver matches a specific blocker, that blocker is marked `WAIVED`.
3. **Partial Revocation**: If 2 waivers match a blocker and 1 is revoked, the remaining 1 valid waiver keeps the blocker `WAIVED`. If ALL matching waivers are revoked or expired, the blocker reverts to `BLOCKED`.
4. **Traceable Evidence**: The response evidence for a waived dependency records all matching active waiver IDs: `waivedByWaiverIds: ['waiver-1', 'waiver-2']`.

---

## 14. Complete 10-Condition Decision Precedence Matrix

| Condition # | Phase 19 System Condition | Blocker Type Enum | Waivable? | Minimum Required Scope | Status (No Waiver) | Status (Valid Waiver) | Status (Expired / Revoked Waiver) |
| :-: | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **1** | Root Governance Disabled | `ROOT_GOVERNANCE_DISABLED` | **NO** | N/A | `GOVERNANCE_DISABLED` | `GOVERNANCE_DISABLED` | `GOVERNANCE_DISABLED` |
| **2** | Root Local Gate Blocked | `ROOT_LOCAL_GATE_BLOCKED` | **NO** | N/A | `BLOCKED` | `BLOCKED` | `BLOCKED` |
| **3** | Topology Truncation Exceeded | `TOPOLOGY_TRUNCATION` | **NO** | N/A | `INDETERMINATE` | `INDETERMINATE` | `INDETERMINATE` |
| **4** | Required Evidence Indeterminate | `INDETERMINATE_EVIDENCE` | **NO** | N/A | `INDETERMINATE` | `INDETERMINATE` | `INDETERMINATE` |
| **5** | Contract Version Misaligned | `CONTRACT_MISALIGNED` | **YES** | `rootProjectId` + `targetProviderProjectId` | `BLOCKED` | `PASSED_WITH_WAIVER` | `BLOCKED` |
| **6** | Provider Active Baseline Unattested | `PROVIDER_ATTESTATION_MISSING` | **YES** | `rootProjectId` + `targetProviderProjectId` | `BLOCKED` | `PASSED_WITH_WAIVER` | `BLOCKED` |
| **7** | Provider Attestation Stale | `PROVIDER_ATTESTATION_STALE` | **YES** | `rootProjectId` + `targetProviderProjectId` | `BLOCKED` | `PASSED_WITH_WAIVER` | `BLOCKED` |
| **8** | Upstream Provider Local Gate Blocked | `PROVIDER_LOCAL_GATE_BLOCKED` | **YES** | `rootProjectId` + `targetProviderProjectId` + `targetDocumentId` | `BLOCKED` | `PASSED_WITH_WAIVER` | `BLOCKED` |
| **9** | All Cross-Project Blockers Waived | N/A | N/A | Active System Waivers | `BLOCKED` | `PASSED_WITH_WAIVER` | `BLOCKED` |
| **10** | Fully Satisfied Without Waivers | N/A | N/A | N/A | `PASSED` | `PASSED` | `PASSED` |

---

## 15. Candidate Evaluation & Scoring (50-Point Model)

Re-evaluating Candidate 1 against the 50-point scoring model under the refined v3 parameters:

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

## 16. Scope Boundaries

### IN SCOPE
- Scoped system governance waiver creation, listing, retrieval, and manual revocation.
- Closed blocker taxonomy (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`).
- Mandatory document-level scope binding for `PROVIDER_LOCAL_GATE_BLOCKED`.
- Exact scope matching (root project, target provider project, target document, contract version).
- Strict version-binding invariant (v1 waiver DOES NOT cover v2 baselines).
- Dynamic query-time expiration checking (`expiresAt: { $gt: new Date() }`).
- 10-condition precedence system release gate evaluation engine producing `PASSED_WITH_WAIVER`.
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

## 17. Success Criteria

1. **Gate Decision Accuracy**: Evaluates `PASSED_WITH_WAIVER` when all waivable blockers have active, non-expired waivers, and `BLOCKED` when at least one un-waived blocker remains.
2. **Boolean `passed` Semantics**: `passed === true` ONLY when `systemReleaseStatus` is `'PASSED'` or `'PASSED_WITH_WAIVER'`.
3. **No Accidental Wildcard Scope**: Rejects `PROVIDER_LOCAL_GATE_BLOCKED` waivers lacking `targetDocumentId`.
4. **Waiver Authority Enforcement**: Rejects non-Owner/non-Admin waiver creation calls with `403 FORBIDDEN`.
5. **Version-Binding Safety**: Confirms that a waiver bound to `v1` does NOT apply when provider updates to `v2`.
6. **Expiration & Revocation**: Confirms that expired or revoked waivers are immediately ignored at query time.
7. **Auditability**: 100% audit logging of waiver creation and revocation in `DocumentAudit`.
8. **ACL Safety**: Zero leakage of unauthorized connected projects or waiver scopes.
9. **Performance**: Waiver-aware gate evaluation query execution `< 35ms`.
10. **Regression Safety**: 100% pass rate across Phase 10, 14, 17, 18, and 19 QA matrix suites.

---

## 18. Roadmap Placement & Final Recommendation

**Placement Justification**: Phase 20 is the exact logical successor to Phase 19. Phase 19 established the multi-project release gate (`system-topology-governance-gate.service.ts`). Phase 20 completes the operational governance loop by adding audit-defensible policy exceptions and waiver lifecycles for multi-project release gates.

**Final Recommendation**: **Proceed with Phase 20: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management.**

The revised research v3 is complete. Standing by for Phase 20 Research Review.
