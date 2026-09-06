# Phase 20 Research v4 — Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

## 1. Research Objective & Executive Summary

The objective of Phase 20 Research v4 is to establish the final, authoritative product research definition for **Documan** following the completion of **Phase 19: Cross-Project System Topology Governance Gate** (merged in commit `0da9578`).

This final research revision resolves all architectural, scope, taxonomy, expiration, audit, and determinism requirements identified in the Phase 20 Research v3 review:
1. **Removes Implicit Global Topology Wildcards**: Requires `targetProviderProjectId` as a mandatory scope field for all cross-project waivers, eliminating implicit "all-provider" wildcards.
2. **Separates Blocker-Level Waivers from System-Level Results**: Explicitly defines individual blocker evaluation (`WAIVED`) vs system-level decision (`PASSED_WITH_WAIVER`), supported by multi-blocker scenarios.
3. **Corrects Expiration Audit Semantics**: Clarifies `expiresAt` as a query-time validity boundary without background workers or fake expiration audit events, reserving immutable audit logging (`DocumentAudit`) strictly for user-initiated mutations (`GRANT`, `REVOKE`).
4. **Enforces Deterministic Single-Waiver Scope Unique Constraint**: Prevents duplicate active waivers with identical scope (`targetProviderProjectId`, `targetDocumentId`, `contractVersionNumber`, `blockerType`) via HTTP `409 CONFLICT` rejection.
5. **Enforces Granular Provider Local Gate Protection**: Retains mandatory `targetDocumentId` binding for `PROVIDER_LOCAL_GATE_BLOCKED` to abolish whole-provider gate bypass.
6. **Preserves Version-Binding Safety**: Confirms that waivers bound to `v1` DO NOT inherit to `v2`.
7. **Proves Phase 19 Consumer Compatibility**: Proves that adding `PASSED_WITH_WAIVER` preserves `passed: true` for boolean consumers while UI components render safely.

---

## 2. Current Product Baseline (Phase 1 – Phase 19)

Documan's 14 API modules provide a comprehensive foundation of document management, baseline alignment, project topology graphs, and release gate decision capabilities:

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

Documan detects documentation gaps, baseline drift, contract misalignments, and release gate blockers across connected project topology graphs. It is **NOT**:
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

## 4. Blocker-Level Waiver vs. System-Level Result Semantics

A core requirement of Phase 20 is maintaining a strict conceptual separation between an **individual blocker evaluation** and the **overall system release gate result**.

### Blocker-Level Status
When evaluating an individual cross-project dependency failure against active waivers:
- If a valid, non-expired, non-revoked matching waiver exists for that specific blocker, the blocker's evaluation state becomes `WAIVED` (e.g. `CONTRACT_MISALIGNED` $\rightarrow$ `WAIVED`).
- If no valid waiver exists, the blocker remains `ACTIVE_BLOCKER`.

### System-Level Status (`PASSED_WITH_WAIVER`)
The overall system release gate decision returns `PASSED_WITH_WAIVER` **ONLY** when ALL of the following criteria are simultaneously satisfied:
1. Every waivable dependency blocker encountered across the topology is covered by a valid matching active waiver (`blockerStatus === 'WAIVED'`).
2. **Zero** un-waived waivable blockers remain (`unwaivedBlockerCount === 0`).
3. **Zero** non-waivable blockers exist (`ROOT_GOVERNANCE_DISABLED`, `ROOT_LOCAL_GATE_BLOCKED`, `TOPOLOGY_TRUNCATION`, `INDETERMINATE_EVIDENCE` are all absent).
4. Root project governance is enabled (`isGovernanceEnabled === true`).
5. Root project local gate passes (`rootLocalGate.passed === true`).
6. Topology evaluation is complete (`indeterminateCount === 0`).

If even a single blocker remains un-waived or any non-waivable condition exists, the overall system result MUST BE `BLOCKED` or `INDETERMINATE`.

### Concrete Multi-Blocker Scenarios

#### Scenario A: Partial Coverage (One Waived, One Un-Waived)
- **Root Project**: `OrderService`
- **Provider A (`PaymentGateway`)**: Contract version misaligned (`CONTRACT_MISALIGNED`). Covered by valid active Waiver #1. $\rightarrow$ **Blocker Status: WAIVED**.
- **Provider B (`InventoryService`)**: Attestation stale (`PROVIDER_ATTESTATION_STALE`). **No waiver exists**. $\rightarrow$ **Blocker Status: ACTIVE_BLOCKER**.
- **Overall System Gate Result**:
  - `systemReleaseStatus`: **`BLOCKED`**
  - `passed`: **`false`**
  - *Rationale*: Although Provider A's blocker was waived, Provider B's un-waived blocker prevents system release approval.

#### Scenario B: Full Coverage (All Blockers Waived)
- **Root Project**: `OrderService`
- **Provider A (`PaymentGateway`)**: Contract version misaligned (`CONTRACT_MISALIGNED`). Covered by valid active Waiver #1. $\rightarrow$ **Blocker Status: WAIVED**.
- **Provider B (`InventoryService`)**: Attestation stale (`PROVIDER_ATTESTATION_STALE`). Covered by valid active Waiver #2. $\rightarrow$ **Blocker Status: WAIVED**.
- **Root Local Gate**: `PASSED`.
- **Overall System Gate Result**:
  - `systemReleaseStatus`: **`PASSED_WITH_WAIVER`**
  - `passed`: **`true`**
  - `appliedWaiverIds`: `['waiver-1', 'waiver-2']`
  - *Rationale*: All cross-project blockers are covered by valid waivers, root local gate passes, and no non-waivable conditions exist.

---

## 5. Mandatory Provider Scope & Hierarchy (Abolishing Implicit Global Wildcards)

To eliminate accidental wildcard scope behavior, Phase 20 enforces a strict hierarchy where `targetProviderProjectId` is **MANDATORY** for all cross-project system waivers.

### Scope Hierarchy Model

```text
Root Project (rootProjectId - REQUIRED)
  └── Target Provider Project (targetProviderProjectId - REQUIRED)
        └── Target Document (targetDocumentId - OPTIONAL; REQUIRED for PROVIDER_LOCAL_GATE_BLOCKED)
              └── Contract Version (contractVersionNumber - OPTIONAL)
```

### Strict Scope Rules
1. **`rootProjectId` (Required)**: The root consumer project initiating the release gate check.
2. **`targetProviderProjectId` (Required)**: The specific provider project in the dependency topology where the blocker originates.
   - **NO IMPLICIT GLOBAL TOPOLOGY WILDCARDS**: Omitting `targetProviderProjectId` is **STRICTLY REJECTED** at creation (`400 BAD_REQUEST: targetProviderProjectId is required for system governance waivers`).
3. **`targetDocumentId` (Optional / Conditionally Required)**:
   - Optional for `CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_GOVERNANCE_DISABLED`.
   - **MANDATORY** for `PROVIDER_LOCAL_GATE_BLOCKED`.
4. **`contractVersionNumber` (Optional)**:
   - If provided, binds the waiver strictly to that contract version number.
   - If omitted, applies to any version of the target contract for the duration of `expiresAt`.

### Valid vs. Rejected Scope Examples

| `targetProviderProjectId` | `targetDocumentId` | `contractVersionNumber` | `blockerType` | Validation Result | Semantics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PaymentApp._id` | `ApiSpecDoc._id` | `1` | `CONTRACT_MISALIGNED` | **VALID (201 Created)** | Exact match for `PaymentApp`, document `ApiSpecDoc`, version `1`. |
| `PaymentApp._id` | `null` | `null` | `PROVIDER_ATTESTATION_MISSING` | **VALID (201 Created)** | Applies to any missing attestation originating from project `PaymentApp`. |
| `PaymentApp._id` | `null` | `null` | `PROVIDER_LOCAL_GATE_BLOCKED` | **REJECTED (400 Bad Request)** | Local gate waivers require exact `targetDocumentId`. |
| `null` | `null` | `null` | `CONTRACT_MISALIGNED` | **REJECTED (400 Bad Request)** | `targetProviderProjectId` is required. No implicit global topology wildcards. |

---

## 6. Closed Blocker Taxonomy & Classification Matrix

Inspection of Phase 19 (`system-topology-governance-gate.service.ts`) defines the finite, closed set of Phase 19 system release conditions. Every condition is strictly classified as **WAIVABLE** or **NON_WAIVABLE**:

| Condition Enum / Blocker Code | Description | Classification | Required Scope Fields | Rationale for Classification |
| :--- | :--- | :---: | :--- | :--- |
| `ROOT_GOVERNANCE_DISABLED` | Root project `isGovernanceEnabled === false`. | **NON_WAIVABLE** | N/A | Root project has explicitly turned off governance. Release checks are bypassed; waivers cannot override a disabled root governance setting. |
| `ROOT_LOCAL_GATE_BLOCKED` | Root project's local Phase 10 release gate is `BLOCKED`. | **NON_WAIVABLE** | N/A | Root project local document health failures must be resolved locally via Phase 10 document waivers or approvals, preserving local project authority. |
| `TOPOLOGY_TRUNCATION` | Graph traversal encountered limits (`MAX_DEPTH=3`, `MAX_NODES=50`). | **NON_WAIVABLE** | N/A | Unvisited dependencies exist beyond graph limits. Unknown graph dependencies cannot be waived because their risk is unquantified. |
| `INDETERMINATE_EVIDENCE` | Baseline alignment has `aggregateState === 'INDETERMINATE'`. | **NON_WAIVABLE** | N/A | Missing baselines or missing package acceptance logs represent an incomplete/unverified state. Indeterminate evidence cannot be converted into approval. |
| `CONTRACT_MISALIGNED` | Cross-project dependency contract version mismatch. | **WAIVABLE** | `rootProjectId`, `targetProviderProjectId` | An explicit contract mismatch between consumer baseline reference and provider active baseline can be waived for a specific release window. |
| `PROVIDER_ATTESTATION_MISSING` | Provider active baseline lacks a Phase 17 fulfillment attestation. | **WAIVABLE** | `rootProjectId`, `targetProviderProjectId` | A provider active baseline lacking a Phase 17 attestation can be waived by a Project Owner/Admin if the provider contract is known to be stable. |
| `PROVIDER_ATTESTATION_STALE` | Provider document head version drifted beyond snapshot version. | **WAIVABLE** | `rootProjectId`, `targetProviderProjectId` | A provider whose document head drifted after attestation can be waived by a Project Owner/Admin if the head drift is non-breaking. |
| `PROVIDER_LOCAL_GATE_BLOCKED` | Upstream provider project's local Phase 10 release gate is `BLOCKED`. | **WAIVABLE WITH GRANULARITY** | `rootProjectId`, `targetProviderProjectId`, `targetDocumentId` | Upstream provider project local gate failures can be waived ONLY when bound to specific provider document scopes, preventing whole-project bypass. |
| `PROVIDER_GOVERNANCE_DISABLED` | Upstream provider project has governance disabled. | Non-blocking | `rootProjectId`, `targetProviderProjectId` | Recorded in evidence metadata; does not block evaluation by itself. |

---

## 7. Granular Provider Local Gate Protection (`targetDocumentId` Enforcement)

Inspection of Phase 10 `evaluateReleaseGateInternal` shows that a provider project's local release gate returns specific blocking documents:
`providerGate.blockingDocuments = Array<{ documentId: string, title: string, reason: string }>`.

### Whole-Provider-Gate Bypass Prevention Rule
A Phase 20 waiver for `PROVIDER_LOCAL_GATE_BLOCKED` **MUST NOT** be a monolithic project-level wildcard (`targetProviderProjectId` alone).

It **MUST BIND TO THE SPECIFIC PROVIDER DOCUMENT** (`targetDocumentId`).

- **Example**: If Provider Project Beta has 3 blocking documents (`Doc Alpha` - stale review, `Doc Beta` - unreviewed API spec, `Doc Gamma` - changes requested), a waiver created with `targetDocumentId: Doc Alpha._id` waives **ONLY `Doc Alpha`**.
- `Doc Beta` and `Doc Gamma` remain un-waived blockers, causing the system gate to return `systemReleaseStatus: 'BLOCKED'` (`passed: false`).

This rule completely eliminates whole-provider project gate bypass and preserves Phase 10 document-level governance integrity.

---

## 8. Version-Binding Safety Invariant

> **If a waiver is granted for Provider Contract Version 1 (`contractVersionNumber: 1`), does it automatically cover Provider Contract Version 2 (`v2`)?**
>
> **ANSWER: NO.**
> Versioning in Documan represents a new authoritative technical state. If `contractVersionNumber` is specified (e.g. `1`), the waiver binds **strictly to version 1**. When the provider project updates its active baseline to `v2`, the version mismatch invalidates the scope match, and the waiver will **NOT** apply to `v2`. The gate will return `BLOCKED` until a new waiver is explicitly granted for `v2` or the contract is aligned.

---

## 9. Deterministic Duplicate Scope Prevention (`409 CONFLICT` Rejection)

To prevent ambiguous precedence, evidence confusion, or duplicate active records with identical effective scopes, Phase 20 enforces a strict unique scope constraint for active waivers.

### Duplicate Rejection Rule
A new waiver request is **REJECTED with HTTP 409 CONFLICT** if an active, non-expired, non-revoked waiver already exists with the exact same scope tuple:
`{ rootProjectId, targetProviderProjectId, targetDocumentId, contractVersionNumber, blockerType }`.

```ts
// Duplicate Active Scope Query Check prior to creation:
const existingActiveWaiver = await SystemGovernanceWaiver.findOne({
  rootProjectId,
  targetProviderProjectId,
  targetDocumentId: targetDocumentId || null,
  contractVersionNumber: contractVersionNumber || null,
  blockerType,
  isRevoked: false,
  expiresAt: { $gt: new Date() },
});

if (existingActiveWaiver) {
  throw new AppError(
    `An active waiver for scope (${blockerType}) already exists (ID: ${existingActiveWaiver._id}). Revoke existing waiver before creating a new one.`,
    409,
    'DUPLICATE_ACTIVE_WAIVER',
  );
}
```

### Extending or Replacing a Waiver
If an authorized user wishes to extend an expiration date or update the reason for an existing waiver, they must either:
1. Explicitly revoke the active waiver first, then grant the new waiver, OR
2. Wait for the existing waiver's `expiresAt` timestamp to pass.

This guarantees that at any point in time, **at most ONE active waiver** matches an exact scope tuple, eliminating precedence ambiguity.

---

## 10. Query-Time Expiration & Mutation Audit Semantics

### Deterministic Temporal Boundary (`expiresAt`)
In Documan, waiver expiration is a **query-time derived state**.
- `expiresAt` represents an immutable timestamp set at creation time.
- During release gate evaluation (`evaluateSystemTopologyGovernanceGate`), the query filters active waivers using:
  `{ isRevoked: false, expiresAt: { $gt: evaluationTimestamp } }`.
- `expiresAt <= evaluationTimestamp` $\rightarrow$ **EXPIRED** (ignored at query time).
- `expiresAt > evaluationTimestamp` $\rightarrow$ **ACTIVE**.

### Zero Background Workers & Zero Fake Mutation Events
- **No Background Cron Jobs**: Documan does NOT run background cron workers or timer sweeps to mutate `isExpired` flags in MongoDB.
- **No Fake Expiration Audit Logs**: Passing time is NOT a database mutation event. `DocumentAudit` receives immutable event logs **ONLY for explicit user-initiated mutations**:
  - `GOVERNANCE_SYSTEM_WAIVER_GRANTED` (upon POST creation)
  - `GOVERNANCE_SYSTEM_WAIVER_REVOKED` (upon PATCH revocation)
- **Historical Expiration Visibility**: Derived deterministically at any point in time from `grant record + expiresAt + evaluation timestamp`.

---

## 11. Governance Waiver Authority Model (Phase 10 Alignment)

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
In Documan, a governance waiver is an authoritative policy override, **NOT** an ordinary document edit. Shared `EDIT` or `viewer` members **CANNOT** grant or revoke system governance waivers.

To grant or revoke a **System Governance Waiver** on a project topology:
1. The actor MUST be a System `admin` **OR** the **Project Owner** (`project.ownerId === userId`) of the root consumer project being evaluated.
2. If a waiver is scoped to a specific provider project, the actor MUST possess `Owner` or `Admin` authority over either the root consumer project or the target provider project.
3. Ordinary shared members (`EDIT` permission) attempting to grant or revoke a waiver will be rejected with `403 FORBIDDEN`.

---

## 12. Operational State vs. Audit Authority Persistence Boundary

### Operational Source (`SystemGovernanceWaiver`)
The `SystemGovernanceWaiver` Mongoose collection is the **authoritative operational current-state source** queried dynamically during high-speed gate evaluations (`evaluateSystemTopologyGovernanceGate`).
- Schema definition:
  ```ts
  export interface ISystemGovernanceWaiver {
    rootProjectId: Types.ObjectId;             // Required: Consumer project
    targetProviderProjectId: Types.ObjectId;   // Required: Provider project boundary
    targetDocumentId?: Types.ObjectId;         // Optional: Specific provider document
    contractVersionNumber?: number;            // Optional: Specific contract version
    blockerType: SystemBlockerType;            // Required: Closed enum
    reason: string;                             // Required: Rationale
    grantedByUserId: Types.ObjectId;           // Required: Owner / Admin ID
    expiresAt: Date;                            // Required: Validity boundary
    isRevoked: boolean;                         // Required: Revocation flag
    revokedAt?: Date;
    revokedByUserId?: Types.ObjectId;
    revocationReason?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- Compound index: `{ rootProjectId: 1, targetProviderProjectId: 1, isRevoked: 1, expiresAt: 1 }`.
- Optimized for sub-35ms query matching.

### Immutable Audit Provenance (`DocumentAudit`)
`DocumentAudit` is the **immutable historical provenance log**.
- Every waiver grant emits `GOVERNANCE_SYSTEM_WAIVER_GRANTED`.
- Every waiver revocation emits `GOVERNANCE_SYSTEM_WAIVER_REVOKED`.
- `DocumentAudit` is NEVER queried during real-time gate evaluation. Consistency is guaranteed because API endpoints mutate `SystemGovernanceWaiver` and write a `DocumentAudit` event in the same atomic execution.

---

## 13. Permanent Revocation Semantics & Lifecycle

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
3. **Permanent Invalidation**: Revoked waivers setting `isRevoked: true` are permanently inactive and can **NEVER** reactivate (`isRevoked` cannot be flipped back to `false`).
4. **Audit Metadata**: Revocation events in `DocumentAudit` record `waiverId`, `revokedByUserId`, `revokedAt`, and `rootProjectId`.

---

## 14. Phase 19 Consumer & Contract Compatibility Verification

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

## 15. Complete 10-Condition Decision Precedence Matrix

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

## 16. Candidate Evaluation & Scoring (50-Point Model)

Re-evaluating Candidate 1 against the 50-point scoring model under the refined v4 parameters:

| Criterion (Max 5 pts) | Score | Justification |
| :--- | :---: | :--- |
| **1. Product Value** | **5.0** | Solves the binary release gate deadlock in multi-project engineering teams. |
| **2. Alignment with Identity** | **5.0** | Preserves Documan's document context, traceability, and governance identity. |
| **3. Reuse of Primitives** | **5.0** | Composes Phase 10, 14, 17, 18, and 19 primitives cleanly. |
| **4. Architectural Leverage** | **5.0** | Extends system release gate evaluation via query-time waiver resolution. |
| **5. Traceability & Governance** | **5.0** | Delivers full audit logging and transparent `PASSED_WITH_WAIVER` status tracking. |
| **6. Cross-Project Value** | **5.0** | Provides multi-project, topology-aware policy exception lifecycles. |
| **7. Product Differentiation** | **5.0** | Differentiates Documan from simple CI checkers by offering audit-defensible policy exception lifecycles. |
| **8. Implementation Feasibility** | **4.5** | Additive Mongoose model and service extension; straightforward to test and verify. |
| **9. Security / ACL Feasibility** | **5.0** | Strictly enforces Project Owner/Admin authority (`verifyWaiverAuthority`) and ACL privacy (`checkUserProjectReadAccess`). |
| **10. Scope Safety & Anti-Drift** | **5.0** | Zero deployment orchestration, zero background workers, zero generic task management. |
| **TOTAL SCORE** | **49.5 / 50** | **Leading Candidate** |

---

## 17. Scope Boundaries

### IN SCOPE
- Scoped system governance waiver creation, listing, retrieval, and manual revocation.
- Closed blocker taxonomy (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`).
- Mandatory `targetProviderProjectId` field on all cross-project waivers (no implicit global wildcards).
- Mandatory document-level scope binding for `PROVIDER_LOCAL_GATE_BLOCKED`.
- Strict version-binding invariant (v1 waiver DOES NOT cover v2 baselines).
- Deterministic duplicate active scope rejection (`409 CONFLICT`).
- Query-time expiration boundary checking (`expiresAt: { $gt: new Date() }`).
- 10-condition precedence system release gate evaluation engine producing `PASSED_WITH_WAIVER`.
- Immutable audit event logging (`GOVERNANCE_SYSTEM_WAIVER_GRANTED`, `GOVERNANCE_SYSTEM_WAIVER_REVOKED`).
- Permission-safe REST API endpoints (`/projects/:projectId/system-governance-waivers`).
- React governance UI section displaying active waivers, waiver modal, and status badges.

### OUT OF SCOPE
- Software deployment execution, release pipelines, Docker builds, or cloud infrastructure orchestration.
- CI/CD build runner execution or pipeline triggers.
- Automatic waiver approval or AI-driven waiver generation.
- Background cron workers or timer sweep infrastructure.
- Visual architecture canvas/editor.

---

## 18. Updated Measurable Success Criteria

1. **No Accidental Global Wildcard**: Rejects any waiver creation payload where `targetProviderProjectId` is missing (`400 BAD_REQUEST`).
2. **Provider Gate Protection**: Rejects `PROVIDER_LOCAL_GATE_BLOCKED` waivers lacking `targetDocumentId` (`400 BAD_REQUEST`).
3. **Blocker-Level vs. System-Level Distinction**: Evaluates system status as `BLOCKED` when any single blocker remains un-waived, and `PASSED_WITH_WAIVER` ONLY when all waivable blockers are covered and zero non-waivable blockers exist.
4. **Duplicate Scope Determinism**: Rejects creation of duplicate active waivers matching the exact same scope tuple (`409 CONFLICT`).
5. **Query-Time Expiration**: Confirms that waivers with `expiresAt <= currentTimestamp` are automatically ignored at query time without requiring background workers or fake audit events.
6. **Immediate Revocation Effect**: Confirms that revoking a waiver causes the very next gate evaluation to revert to `BLOCKED`.
7. **Version-Binding Safety**: Confirms that a waiver bound to contract `v1` does NOT apply when provider updates to `v2`.
8. **Waiver Authority Enforcement**: Rejects non-Owner/non-Admin waiver creation or revocation calls with `403 FORBIDDEN`.
9. **Immutable Auditability**: Emits 100% audit logs to `DocumentAudit` for user-initiated grants and revocations.
10. **Phase 19 Compatibility**: Preserves `passed: true` for `PASSED` and `PASSED_WITH_WAIVER`, and `passed: false` for `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`.

---

## 19. Roadmap Placement & Final Recommendation

**Placement Justification**: Phase 20 is the exact logical successor to Phase 19. Phase 19 established the multi-project release gate (`system-topology-governance-gate.service.ts`). Phase 20 completes the operational governance loop by adding audit-defensible policy exceptions and waiver lifecycles for multi-project release gates.

**Final Recommendation**: **Proceed with Phase 20: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management.**

The final research v4 artifact is complete. Standing by for final research review.
