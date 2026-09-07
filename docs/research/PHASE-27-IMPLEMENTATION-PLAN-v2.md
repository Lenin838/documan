# Phase 27 Implementation Plan v2 — System-Wide Release Readiness Certification & Immutable System Release Snapshot Engine

> **Product Source of Truth**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)  
> **Research Source**: [`docs/research/PHASE-27-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-27-RESEARCH.md)  
> **Previous Plan**: [`docs/research/PHASE-27-IMPLEMENTATION-PLAN-v1.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-27-IMPLEMENTATION-PLAN-v1.md)  
> **Status**: APPROVED RESEARCH — IMPLEMENTATION PLAN v2 (FINAL CORRECTIONS)  

---

## 1. Executive Summary

Phase 27 establishes the **System-Wide Release Readiness Certification & Immutable System Release Snapshot Engine** ([`system-release-certificate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.service.ts)), a persistent Mongoose model ([`SystemReleaseCertificate`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts)), and an interactive certification view ([`SystemReleaseCertificationView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseCertificationView.tsx)).

Phase 27 allows authorized Project Owners and System Admins to evaluate system release readiness across a multi-project topology graph, freeze a multi-project governance snapshot at a specific release milestone (e.g. `REL-2026.1-PROD`), sign off on system readiness, persist an unalterable **System Release Certificate**, and calculate a cryptographic SHA-256 fingerprint (`certificateHash`) over the frozen canonical snapshot representation.

### Architectural Advances in Plan v2 (Final Corrections):
1. **Unidirectional Supersession (Zero Mutation of Certificate A)**: Supersession is recorded on the *newer* Certificate B via `supersedesCertificateId: CertificateA._id`. Certificate A is **never mutated** when superseded. Certificate A's snapshot, lifecycle events, and hash remain 100% untouched.
2. **Append-Only Lifecycle History & Immutable Snapshot**:
   - **Immutable Certified Evidence**: `snapshot` JSON and SHA-256 `certificateHash` are strictly immutable and frozen upon creation. They are NEVER modified.
   - **Append-Only Lifecycle History**: Lifecycle status changes append to an internal `lifecycleEvents` array (`ISSUED`, `REVOKED`), updating materialized `certificateStatus` without altering `snapshot` or `certificateHash`.
   - **Current Live System Readiness**: Dynamic evaluation of live Phase 19 system topology gates at $T_{\text{now}}$. These three concepts are strictly isolated.
3. **MongoDB Partial Unique Index Semantics**:
   - Index Keys: `{ rootProjectId: 1, releaseTag: 1 }`
   - Options: `{ unique: true, partialFilterExpression: { certificateStatus: "ACTIVE" } }`
   - Guarantees at most 1 `ACTIVE` certificate per `(rootProjectId, releaseTag)` pair while allowing revoked/superseded historical certificates to coexist cleanly.
4. **Certification-Time Frozen Waiver Evidence**: Captures the exact waiver evidence in effect at $T_{\text{cert}}$. Historical certification proof is **never re-interpreted** using present-day $T_{\text{now}}$ waiver expiration rules.
5. **Repository-Grounded Pre-Check Method**: Justifies `POST /pre-check` based on Documan's established evaluation pattern (Phases 15, 16, 21, 26) for passing complex request-scoped override payloads without side effects.

---

## 2. Research Basis

**REPOSITORY FACT**: This implementation plan composes existing governance authorities across Phases 10–26:

1. **Phase 14**: Project topology links (`ProjectTopologyLink`) and ACL boundary enforcement (`checkUserProjectReadAccess`).
2. **Phase 17**: Package fulfillment attestations (`PackageFulfillmentAttestation`).
3. **Phase 18**: Baseline alignment and cross-project contract lineage (`system-baseline-alignment.service.ts`).
4. **Phase 19**: Authoritative system topology release gate evaluator (`system-topology-governance-gate.service.ts`).
5. **Phase 20**: System governance policy waivers (`SystemGovernanceWaiver`).
6. **Phase 21**: What-if system topology gate simulation (`system-topology-simulation.service.ts`).
7. **Phase 22**: Longitudinal governance state lineage timeline (`system-governance-lineage.service.ts`).
8. **Phase 23**: Cross-project contract evolution diffing (`system-contract-evolution.service.ts`).
9. **Phase 24**: End-to-end document traceability audit (`system-traceability-audit.service.ts`).
10. **Phase 25**: Cross-project contract interoperability matrix (`system-contract-matrix.service.ts`).
11. **Phase 26**: System-wide contract change planning ([`system-contract-plan.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.service.ts)).

---

## 3. Product Gap

**INFERENCE**: Prior to Phase 27, Phase 19 (`evaluateSystemTopologyGovernanceGate`) provides dynamic release gate evaluation (`PASSED`, `BLOCKED`, `PASSED_WITH_WAIVER`). However, Phase 19 is **100% transient and query-time only**. It evaluates whatever live database state exists at the exact instant of the request.

If 3 weeks after release sign-off, a developer updates a document, deactivates a baseline, or revokes a waiver, the live Phase 19 gate check returns `BLOCKED`. Documan had zero persistent, audit-proof record of what exact governance state, active baselines, attestations, and policy waivers were evaluated and certified at the release milestone. Phase 27 fills this gap by creating persistent, immutable, signed **System Release Certificates**.

---

## 4. Product Question

Phase 27 answers:
> *"At a specific governance milestone, what exact multi-project system state was evaluated and certified as ready, what evidence supported that decision, and can that certification be independently verified later?"*

**PROPOSED DESIGN**: Phase 27 defines "Release" strictly as a **documentation and governance milestone**, not code deployment. It provides a formal **Governance Certification** capability for enterprise compliance and auditability.

---

## 5. Product Boundary

Phase 27 strictly enforces product boundaries. It MUST NOT:
- Execute software deployments, Docker image builds, or Kubernetes pod rollouts.
- Trigger CI/CD build runners (Jenkins, GitHub Actions, GitLab CI).
- Manage infrastructure, cloud resources, or server access credentials.
- Act as a generic compliance, GRC, or ticket-tracking SaaS tool.
- Act as a generic project-management or task-board system.
- Use non-deterministic AI/LLM text generation or vector databases.

---

## 6. Certification Lifecycle

**PROPOSED DESIGN**: The complete lifecycle of a System Release Certificate follows an append-only, state-transition model:

```text
                  ┌───────────────────────────────────────────┐
                  │ Pre-Certification Evaluation (POST/pre-check)│
                  │  - Reads Phase 19 Gate & Readiness State  │
                  │  - Database Writes: 0                     │
                  └─────────────────────┬─────────────────────┘
                                        │
                                        ▼ User Clicks "Issue Certificate"
                  ┌───────────────────────────────────────────┐
                  │        Certificate Issuance (WRITE)        │
                  │  - Validates Owner/Admin Authority        │
                  │  - Validates Gate PASSED / PASSED_WAIVER  │
                  │  - Freezes Snapshot & Calculates SHA-256   │
                  │  - Initializes lifecycleEvents: [ISSUED]  │
                  │  - Emits SYSTEM_RELEASE_CERTIFICATE_ISSUED│
                  └─────────────────────┬─────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
           ┌───────────────────────────┐ ┌───────────────────────────┐
           │     ACTIVE CERTIFIED      │ │   SUPERSEDING CERT B      │
           │  - Snapshot 100% Immutable│ │  - Cert B points to Cert A│
           │  - Hash Verified Intact   │ │  - Cert A 100% UNMUTATED! │
           └─────────────┬─────────────┘ └───────────────────────────┘
                         │
                         ▼ User Clicks "Revoke Certificate"
           ┌───────────────────────────────────────────┐
           │            REVOKED CERTIFICATE            │
           │  - Appends { eventType: 'REVOKED' } event │
           │  - Materialized status = 'REVOKED'        │
           │  - Original Snapshot & Hash UNTOUCHED!    │
           │  - Emits CERTIFICATE_REVOKED Audit Event  │
           └───────────────────────────────────────────┘
```

---

## 7. Live State vs Certified State

**PROPOSED DESIGN**: Documan explicitly separates **FROZEN CERTIFIED HISTORICAL STATE** from **CURRENT AUTHORITATIVE LIVE STATE**.

| Dimension | Frozen Certified State (`SystemReleaseCertificate`) | Current Authoritative Live State (Phases 10–26 Services) |
| :--- | :--- | :--- |
| **Data Source** | Immutable JSON snapshot in `SystemReleaseCertificate.snapshot` | Live query against `Document`, `Baseline`, `Waiver`, `Attestation` |
| **Mutability** | **100% Immutable** (Never updated after creation) | Dynamic (Updates continuously as users edit documents/baselines) |
| **Time Horizon** | Fixed point-in-time timestamp ($T_{\text{cert}}$) | Present moment ($T_{\text{now}}$) |
| **Integrity Check** | SHA-256 hash match (`certificateHash`) | Phase 19 gate evaluation (`evaluateSystemTopologyGovernanceGate`) |
| **UI Banner** | `"FROZEN HISTORICAL SNAPSHOT certified at T_cert"` | `"LIVE SYSTEM STATE as of T_now"` |

---

## 8. Certification Eligibility

**PROPOSED DESIGN**: A root project is eligible for certification if and only if:
1. The requesting user has **Project Owner** or **System Admin** role on the root project.
2. The authoritative Phase 19 system release gate evaluates to either `PASSED` or `PASSED_WITH_WAIVER`.
3. Zero non-waivable blockers (`ROOT_LOCAL_GATE_BLOCKED`, `TOPOLOGY_TRUNCATION`, `INDETERMINATE_EVIDENCE`) exist in the system topology.
4. The system topology is bounded (`MAX_TOPOLOGY_PROJECTS <= 50`).

If Phase 19 returns `BLOCKED`, `INDETERMINATE`, or `GOVERNANCE_DISABLED`, certificate issuance is rejected with HTTP `412 Precondition Failed`.

---

## 9. Certification Authority

**REPOSITORY FACT**: Existing authorization semantics across Documan:
- **Phase 1 (`apps/api/src/modules/auth/`)**: Users have global `role` (`admin` vs `user`).
- **Phase 5 (`apps/api/src/modules/document-shares/`)**: Documents have `ownerId`, shared `READ` users, and shared `EDIT` users.
- **Phase 14 (`apps/api/src/modules/projects/`)**: Projects have `ownerId` and project members. `checkUserProjectReadAccess` verifies project read authorization.
- **Phase 20 (`apps/api/src/modules/governance/system-governance-waiver.service.ts`)**: Granting policy waivers requires Project Owner or System Admin.

**PROPOSED DESIGN**: Certification authority strictly requires:
- Global System Admin (`user.role === 'admin'`), OR
- Root Project Owner (`project.ownerId.toString() === userId`).

Shared `EDIT` users, project members, and read-only users **MUST NOT** gain certification authority. Attempts by non-owners/non-admins return HTTP `403 Forbidden`.

---

## 10. System Snapshot Definition

**PROPOSED DESIGN**: The system snapshot is a deterministic, self-contained JSON object capturing the complete multi-project governance state at the moment of certification. Once serialized and persisted, it is never mutated.

---

## 11. Snapshot Contents & Certification-Time Waiver Evidence

```typescript
export interface ISystemReleaseSnapshot {
  rootProjectId: string;
  rootProjectName: string;
  releaseTag: string;
  certifiedAt: string; // ISO-8601 string
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  topologyNodes: Array<{
    projectId: string;
    projectName: string;
    isGovernanceEnabled: boolean;
    localGatePassed: boolean;
  }>;
  topologyEdges: Array<{
    sourceProjectId: string;
    targetProjectId: string;
    linkType: 'DEPENDS_ON' | 'PROVIDES_API_TO' | 'INTEGRATES_WITH' | 'SHARED_LIBRARY';
  }>;
  activeBaselines: Array<{
    projectId: string;
    projectName: string;
    baselineId: string;
    versionTag: string;
    documentSnapshotsCount: number;
    createdTimestamp: string;
  }>;
  activeAttestations: Array<{
    attestationId: string;
    packageId: string;
    packageName: string;
    attestedAt: string;
    attestorUserId: string;
    fulfillmentStatus: string;
  }>;
  // FROZEN CERTIFICATION-TIME WAIVER EVIDENCE AT T_cert
  activeWaivers: Array<{
    waiverId: string;
    targetProviderProjectId: string;
    blockerType: string;
    targetDocumentId?: string;
    grantedByUserId: string;
    grantedAt: string;
    expiresAt: string; // Expiration timestamp frozen at T_cert
    waiverScope: string;
  }>;
  evidenceSummary: {
    totalApplicableContracts: number;
    alignedContractsCount: number;
    waivedBlockersCount: number;
    systemAlignmentScore: number;
    evidenceCompletenessScore: number;
  };
}
```

### Waiver Evidence Immutability Rule:
The `activeWaivers` array records the exact waiver evidence in effect at $T_{\text{cert}}$. When auditing a certificate at $T_{\text{now}}$ (even if a waiver's `expiresAt` date has passed relative to $T_{\text{now}}$), the historical snapshot displays the exact state at $T_{\text{cert}}$. Historical certification proof is **NEVER re-interpreted** using current Phase 20 query-time waiver expiration.

---

## 12. Historical Reconstruction Rules

**CRITICAL RULE**: A `SystemReleaseCertificate` MUST represent the historical certified state.
- When retrieving a certificate (`GET /api/v1/projects/:projectId/release-certificates/:id`), Documan returns the stored historical `snapshot` payload.
- Documan **MUST NEVER** attempt to re-query current database collections to reconstruct or modify the historical snapshot.
- If live Provider Project P updates from Baseline `v2` to Baseline `v3` after certification, the certified snapshot created at $T_1$ MUST still show Provider Project P at Baseline `v2`.

---

## 13. Gate Result Semantics

The certificate captures the exact categorical outcome returned by Phase 19 `evaluateSystemTopologyGovernanceGate`:
- `CERTIFIED_PASSED`: Certified when Phase 19 returns `PASSED` (0 waivable and 0 non-waivable blockers).
- `CERTIFIED_WITH_WAIVERS`: Certified when Phase 19 returns `PASSED_WITH_WAIVER` (all waivable blockers covered by valid active waivers).

---

## 14. `PASSED_WITH_WAIVER` Semantics

**REPOSITORY FACT**: Phase 20 (`system-governance-waiver.service.ts`) establishes that a release gate evaluates to `PASSED_WITH_WAIVER` only when all waivable dependency blockers are covered by valid active policy waivers.

**PROPOSED DESIGN**: When certifying a release gate that passed via waivers:
1. `certificateStatus` is set to `'ACTIVE'`.
2. `systemReleaseStatus` is set to `'PASSED_WITH_WAIVER'`.
3. The exact list of active waivers (`activeWaivers`) in effect at certification time is frozen into the snapshot.
4. The certificate explicitly records `waivedBlockersCount`.
5. Phase 19/20 semantics are fully preserved; waivers are never falsely represented as `PASSED` without waivers.

---

## 15. Immutable Certificate Model & Append-Only Schema

**PROPOSED DESIGN**: Mongoose model located at [`apps/api/src/modules/governance/system-release-certificate.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts).

```typescript
import { Schema, model, Document } from 'mongoose';
import { ISystemReleaseSnapshot } from './system-release-certificate.types';

export interface ILifecycleEvent {
  eventType: 'ISSUED' | 'REVOKED';
  performedByUserId: Schema.Types.ObjectId;
  timestamp: Date;
  reason?: string;
}

export interface ISystemReleaseCertificateDoc extends Document {
  rootProjectId: Schema.Types.ObjectId;
  releaseTag: string; // e.g. "v1.0", "REL-2026.1-PROD"
  certificateVersion: number; // 1 for initial certification, 2+ for re-certification after revocation
  certificateStatus: 'ACTIVE' | 'REVOKED'; // Materialized state derived from latest lifecycleEvent
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  certificateHash: string; // SHA-256 fingerprint over canonical snapshot
  certifiedByUserId: Schema.Types.ObjectId;
  certifiedAt: Date;
  notes?: string;
  supersedesCertificateId?: Schema.Types.ObjectId; // Unidirectional pointer on NEWER cert pointing to OLDER cert
  lifecycleEvents: ILifecycleEvent[]; // Append-only audit history of lifecycle events
  snapshot: ISystemReleaseSnapshot; // 100% IMMUTABLE FROZEN SNAPSHOT
  createdAt: Date;
  updatedAt: Date;
}

const SystemReleaseCertificateSchema = new Schema<ISystemReleaseCertificateDoc>(
  {
    rootProjectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    releaseTag: { type: String, required: true, trim: true },
    certificateVersion: { type: Number, required: true, default: 1 },
    certificateStatus: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      required: true,
      index: true,
      default: 'ACTIVE',
    },
    systemReleaseStatus: {
      type: String,
      enum: ['PASSED', 'PASSED_WITH_WAIVER'],
      required: true,
    },
    certificateHash: { type: String, required: true },
    certifiedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    certifiedAt: { type: Date, default: Date.now, required: true },
    notes: { type: String, trim: true },
    supersedesCertificateId: { type: Schema.Types.ObjectId, ref: 'SystemReleaseCertificate' },
    lifecycleEvents: [
      {
        eventType: { type: String, enum: ['ISSUED', 'REVOKED'], required: true },
        performedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now, required: true },
        reason: { type: String, trim: true },
      },
    ],
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// CORRECT MONGODB INDEX SYNTAX: Compound partial unique index enforcing max 1 ACTIVE certificate per releaseTag per project
SystemReleaseCertificateSchema.index(
  { rootProjectId: 1, releaseTag: 1 },
  { unique: true, partialFilterExpression: { certificateStatus: 'ACTIVE' } }
);

export const SystemReleaseCertificate = model<ISystemReleaseCertificateDoc>(
  'SystemReleaseCertificate',
  SystemReleaseCertificateSchema
);
```

---

## 16. Certificate Hashing

**PROPOSED DESIGN**: SHA-256 cryptographic fingerprint calculated over a normalized canonical JSON string representation of the frozen `snapshot`.

```typescript
import crypto from 'crypto';

export function computeCertificateHash(snapshot: ISystemReleaseSnapshot): string {
  const canonicalJson = canonicalizeSnapshot(snapshot);
  return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}
```

### Determinism Verification Guarantee:
- `same snapshot` $\rightarrow$ `same SHA-256 hash`
- `modified snapshot field` $\rightarrow$ `different SHA-256 hash`
- `field key order variations` $\rightarrow$ `same SHA-256 hash (due to canonical sorting)`

---

## 17. Canonicalization

**PROPOSED DESIGN**: To ensure hash stability regardless of object key order or JSON serialization differences:
1. Object keys at every nesting level are sorted alphabetically.
2. Arrays of topology nodes are sorted by `projectId`.
3. Arrays of topology edges are sorted by `sourceProjectId + targetProjectId + linkType`.
4. Arrays of active baselines are sorted by `projectId + baselineId`.
5. Arrays of active attestations are sorted by `attestationId`.
6. Arrays of active waivers are sorted by `waiverId`.
7. `undefined` fields are omitted; `null` values are preserved explicitly.
8. ISO-8601 timestamps are formatted with millisecond precision (`YYYY-MM-DDTHH:mm:ss.sssZ`).

```typescript
export function canonicalizeSnapshot(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeSnapshot).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const keyValues = sortedKeys.map(
    (key) => JSON.stringify(key) + ':' + canonicalizeSnapshot(obj[key])
  );
  return '{' + keyValues.join(',') + '}';
}
```

---

## 18. Integrity Verification & Three Core Concepts

**PROPOSED DESIGN**: Documan strictly isolates three distinct evaluation concepts:

```text
               ┌──────────────────────────────────────────────┐
               │    1. CERTIFICATE SNAPSHOT INTEGRITY         │
               │  - Re-computes SHA-256 over snapshot         │
               │  - Compares with stored certificateHash       │
               │  - Returns: INTEGRITY_VERIFIED / TAMPERED    │
               └──────────────────────┬───────────────────────┘
                                      │
               ┌──────────────────────┴───────────────────────┐
               │    2. CERTIFICATE LIFECYCLE VALIDITY         │
               │  - Evaluates append-only lifecycleEvents     │
               │  - Returns: ACTIVE / REVOKED / SUPERSEDED    │
               └──────────────────────┬───────────────────────┘
                                      │
               ┌──────────────────────┴───────────────────────┐
               │    3. CURRENT LIVE SYSTEM READINESS          │
               │  - Runs Phase 19 Gate check at T_now          │
               │  - Returns: LIVE_PASSED / LIVE_BLOCKED       │
               └──────────────────────────────────────────────┘
```

### Verification Endpoint Response (`POST /api/v1/projects/:projectId/release-certificates/:id/verify`):
```typescript
export interface CertificateVerificationResponseDTO {
  certificateId: string;
  releaseTag: string;
  // Concept 1: Snapshot Integrity
  integrity: {
    isHashValid: boolean;
    computedHash: string;
    storedHash: string;
    integrityStatus: 'INTEGRITY_VERIFIED' | 'TAMPER_DETECTED';
  };
  // Concept 2: Lifecycle Validity
  lifecycle: {
    status: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
    certifiedAt: string;
    certifiedByUserId: string;
    lifecycleEvents: ILifecycleEvent[];
    supersededBy?: {
      newerCertificateId: string;
      newerReleaseTag: string;
    };
  };
  // Concept 3: Live System Readiness (Informational)
  currentLiveSystem: {
    currentSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';
    matchesCertifiedState: boolean;
  };
}
```

---

## 19. Revocation Semantics (Append-Only Event Model)

**PROPOSED DESIGN**: Revoking a certificate (`POST /api/v1/projects/:projectId/release-certificates/:id/revoke`) is strictly append-only:

1. **Requires Authority**: Project Owner or System Admin role required (`403 Forbidden` for others).
2. **Append Lifecycle Event**: Appends `{ eventType: 'REVOKED', performedByUserId: userId, timestamp: new Date(), reason: revocationReason }` to `lifecycleEvents`.
3. **Materialized Status Update**: Sets `certificateStatus = 'REVOKED'`.
4. **ZERO SNAPSHOT MUTATION**: The `snapshot` JSON and `certificateHash` are **100% UNTOUCHED**.
5. **Integrity Intact**: Future calls to `verify` confirm `isHashValid: true` (`INTEGRITY_VERIFIED`) while reporting `lifecycle.status: 'REVOKED'`.
6. **Audit Event**: Emits `SYSTEM_RELEASE_CERTIFICATE_REVOKED` to `DocumentAudit`.

---

## 20. Supersession Semantics (Unidirectional Reference)

**PROPOSED DESIGN**: When a newer Certificate B is issued for a project (e.g. `REL-2026.2-PROD` superseding `REL-2026.1-PROD`):

1. **Unidirectional Pointer**: Certificate B stores `supersedesCertificateId: CertificateA._id` in its own document upon creation.
2. **ZERO MUTATION OF CERTIFICATE A**: Certificate A is **NEVER updated or modified**. Certificate A's snapshot, lifecycleEvents, status, and hash remain 100% untouched.
3. **Query-Time Supersession Resolution**: When inspecting Certificate A, the system queries for any active Certificate B where `supersedesCertificateId === CertificateA._id`. If found, Certificate A is reported as `SUPERSEDED` in lifecycle responses without modifying Certificate A's database document.

---

## 21. `releaseTag` Re-Certification & Retry Semantics

**PROPOSED DESIGN**: Handling failed certifications, re-certifications, and duplicate release tags:

1. **Failed Gate Behavior**: If Phase 19 returns `BLOCKED` during `POST /pre-check` or `POST /release-certificates`, **0 database records are written**. The user corrects the blockers and retries.
2. **Active Release Tag Uniqueness**: Partial unique index `{ rootProjectId: 1, releaseTag: 1 }` with `{ partialFilterExpression: { certificateStatus: "ACTIVE" } }` guarantees that a project may have at most **1 `ACTIVE` certificate per `releaseTag`**. Attempting to issue a second `ACTIVE` certificate for `releaseTag: "v1.0"` returns HTTP `409 Conflict`.
3. **Re-Certification After Revocation**: If Certificate v1 for `releaseTag: "v1.0"` was `REVOKED`, the team can re-certify `releaseTag: "v1.0"`. The new certificate is issued with `releaseTag: "v1.0"` and `certificateVersion: 2`. Certificate v1 remains in history as `REVOKED` (version 1), while Certificate v2 becomes the new `ACTIVE` certificate for `v1.0`.

---

## 22. Pre-Check HTTP Method Justification

**REPOSITORY FACT & CONVENTION JUSTIFICATION**:
Across Documan's governance modules, evaluation and simulation endpoints use `POST`:
- Phase 15 change proposal simulation: `POST /api/documents/:id/simulate-change`
- Phase 16 package simulation: `POST /api/change-packages/:id/simulate`
- Phase 21 What-If simulation: `POST /api/v1/projects/:projectId/system-topology-simulation/evaluate`
- Phase 26 contract change planning: `POST /api/v1/projects/:projectId/contract-change-plan`

**Why `POST` for `POST /api/v1/projects/:projectId/release-certificates/pre-check`?**
1. **Request Body Overrides**: `pre-check` accepts optional evaluation parameters (`{ targetProviderProjectId, hypotheticalWaiverIds, hypotheticalBaselineIds, scopeFilter }`).
2. **HTTP Spec Compliance**: Passing complex JSON request bodies in `GET` requests is forbidden by standard HTTP clients and API proxies.
3. **Side-Effect Free Guarantee**: `POST /pre-check` performs in-memory evaluation with **0 database writes** and **0 audit log entries**.

---

## 23. Audit Semantics

**REPOSITORY FACT**: `DocumentAudit` ([`apps/api/src/modules/documents/document-audit.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-audit.model.ts)) records immutable audit events.

**PROPOSED DESIGN**: Phase 27 emits 3 new audit event types:
- `SYSTEM_RELEASE_CERTIFICATE_ISSUED`: Emitted when a certificate is created.
- `SYSTEM_RELEASE_CERTIFICATE_REVOKED`: Emitted when a certificate is revoked.
- `SYSTEM_RELEASE_CERTIFICATE_SUPERSEDED`: Emitted when a newer certificate supersedes an older one.

**READ AUDIT RULE**: Read/evaluation queries (`POST /pre-check`, `GET`, `POST /verify`) generate **0 audit writes**.

---

## 24. ACL / Privacy

1. **Pre-Snapshot Authorization**: Phase 14 `checkUserProjectReadAccess(userId, targetProjectId)` executes for every project node during topology traversal.
2. **Strict Privacy Pruning**: If the requesting user lacks `READ` permission on a connected project in the topology, that node, its topology edges, active baselines, attestations, and waivers are **100% omitted** from the snapshot.
3. **Zero Leakage**: Unauthorized nodes return zero placeholders, zero restricted node IDs, and zero count leakage.
4. **Certificate Read Access**: A user can view a release certificate (`GET`) if they have `READ` access to the `rootProjectId`. Unauthorized users receive HTTP `403 Forbidden`.

---

## 25. Bounds

- `MAX_TOPOLOGY_PROJECTS = 50`
- `MAX_TOPOLOGY_EDGES = 100`
- `MAX_CERTIFICATE_HISTORY_LIMIT = 50`
- `MAX_SNAPSHOT_SIZE_BYTES = 5242880` (5MB cap)

If topology exceeds 50 projects, pre-check returns `canCertify: false` with reason `TOPOLOGY_EXCEEDS_MAX_BOUNDS`.

---

## 26. Persistence

**PERSISTENCE DECISION**: Exactly **1 New Persistent Model** is justified:
- `SystemReleaseCertificate` ([`apps/api/src/modules/governance/system-release-certificate.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts)).

Zero other database models or collections are created.

---

## 27. API Surface

```http
# 1. Pre-Certification Evaluation (READ / EVALUATE - 0 Audit Writes)
POST /api/v1/projects/:projectId/release-certificates/pre-check

# 2. Issue Release Certificate (WRITE - Emits Audit)
POST /api/v1/projects/:projectId/release-certificates

# 3. List Release Certificates (READ - 0 Audit Writes)
GET /api/v1/projects/:projectId/release-certificates

# 4. Get Release Certificate Details (READ - 0 Audit Writes)
GET /api/v1/projects/:projectId/release-certificates/:certificateId

# 5. Verify Certificate Integrity & Status (READ - 0 Audit Writes)
POST /api/v1/projects/:projectId/release-certificates/:certificateId/verify

# 6. Revoke Release Certificate (WRITE - Emits Audit)
POST /api/v1/projects/:projectId/release-certificates/:certificateId/revoke
```

---

## 28. Frontend Architecture

Focused UI panel integrated into Governance section:
[`apps/web/src/features/governance/SystemReleaseCertificationView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseCertificationView.tsx) and drawer [`SystemReleaseCertificateDrawer.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseCertificateDrawer.tsx).

### UI Layout & Components:
1. **Certification Header**: Root project name, active certificates count, and `"Issue Release Certificate"` button.
2. **Pre-Certification Readiness Panel**: Displays Phase 19 gate status badge (`PASSED` green badge, `PASSED_WITH_WAIVER` orange badge, `BLOCKED` red badge), waivable blockers, and active waivers.
3. **Frozen Snapshot Preview Drawer**: Displays canonical JSON preview, active baselines roster, attestations list, waivers list, and SHA-256 fingerprint preview.
4. **Explicit Disclaimer Banner**:
   > *"This certificate records the system governance state evaluated at the certification time. Later system changes do not modify this historical certificate."*
5. **Certificate History Table**: Lists past certificates with release tag, status badge (`ACTIVE`, `REVOKED`, `SUPERSEDED`), certifier name, date, SHA-256 hash snippet, and `"Verify Integrity"` action button.
6. **Three-Concept Verification Modal**: Shows distinct status cards:
   - Card 1: `SNAPSHOT INTEGRITY` (`INTEGRITY_VERIFIED` - SHA-256 Hash Matches)
   - Card 2: `LIFECYCLE STATUS` (`ACTIVE`, `REVOKED`, or `SUPERSEDED`)
   - Card 3: `LIVE SYSTEM READINESS` (`LIVE_GATE_PASSED` vs `LIVE_GATE_BLOCKED`)

---

## 29. Existing Phase Reuse

Phase 27 reuses existing services without code duplication:
- **Phase 14**: `ProjectTopologyLink` model and `checkUserProjectReadAccess`.
- **Phase 17**: `PackageFulfillmentAttestation` model.
- **Phase 18**: `system-baseline-alignment.service.ts`.
- **Phase 19**: `evaluateSystemTopologyGovernanceGate` in `system-topology-governance-gate.service.ts`.
- **Phase 20**: `SystemGovernanceWaiver` model and waiver matching logic.
- **Phase 22**: `system-governance-lineage.service.ts`.
- **Phase 25**: `system-contract-matrix.service.ts`.

---

## 30. Security Threat Model

| Threat ID | Threat Category | Description | Defense / Mitigation |
| :---: | :--- | :--- | :--- |
| **T-01** | IDOR | Attacker attempts to certify or view certificates for project they don't own. | Validate project access via `checkUserProjectReadAccess` before processing. |
| **T-02** | Unauthorized Issuance | Shared EDIT user attempts to issue release certificate. | Strictly require `user.role === 'admin'` or `project.ownerId === userId` (`403 Forbidden`). |
| **T-03** | Snapshot Tampering | Attacker edits snapshot JSON directly in MongoDB. | `POST /verify` re-computes SHA-256 hash; detects mismatch instantly (`TAMPER_DETECTED`). |
| **T-04** | Privacy Leakage | Certificate snapshot exposes unauthorized project titles. | Phase 14 ACL graph pruning filters unauthorized nodes before snapshot creation. |
| **T-05** | Hidden Node Leakage | Snapshot includes placeholders for unauthorized nodes. | Zero placeholders, zero hidden node counts in snapshot JSON. |
| **T-06** | Gate Bypass | User attempts to certify project with `BLOCKED` release gate. | `POST /release-certificates` re-evaluates Phase 19 gate; rejects non-passing status (`412 Precondition Failed`). |
| **T-07** | Revocation Abuse | Non-owner attempts to revoke release certificate. | Require Project Owner or System Admin role for revocation. |
| **T-08** | Duplicate Active Tag | User issues 2 active certificates with exact same `releaseTag`. | Index `{ rootProjectId: 1, releaseTag: 1 }` with `{ partialFilterExpression: { certificateStatus: "ACTIVE" } }` rejects duplicates (`409 Conflict`). |
| **T-09** | Fake Issuer ID | Request submits spoofed `certifiedByUserId`. | `certifiedByUserId` is populated strictly from authenticated JWT (`req.user.id`). |
| **T-10** | Live State Overwrite | Code updates historical snapshot when live state changes. | Snapshot is frozen upon creation; API endpoints return stored JSON without re-querying live collections. |
| **T-11** | Concept Conflation | Verification returns failure because live state diverged. | Verification cleanly separates `integrity`, `lifecycle`, and `currentLiveSystem`. |
| **T-12** | Certificate A Mutation | Issuing Cert B mutates Cert A to add supersession pointer. | Unidirectional pointer stored on Cert B only (`supersedesCertificateId`). Cert A 100% unmutated. |
| **T-13** | Waiver Re-interpretation | Verification checks current waiver expiration for past cert. | Certificate snapshot stores frozen waiver evidence at $T_{\text{cert}}$; verification never re-interprets using $T_{\text{now}}$. |
| **T-14** | N+1 Query Explode | Graph traversal fetches nodes in recursive loops. | Bulk-fetch baselines, attestations, and waivers in 3 batch queries; cap traversal depth at 3. |
| **T-15** | Deployment Drift | Endpoint attempts to execute deployment scripts. | 100% document/governance-centric; 0 deployment code. |

---

## 31. Determinism

Given identical snapshot data, canonical serialization and SHA-256 hashing are **100% deterministic**:
- `canonicalizeSnapshot(snapshot)` sorts keys alphabetically and formats arrays deterministically.
- Re-running `computeCertificateHash(snapshot)` 1,000 times produces the exact same 64-character hex string byte-for-byte.

---

## 32. Performance

- **Query Complexity**: $O(1)$ database write on certification creation; $O(1)$ read on retrieval.
- **Bulk Database Batching**: Pre-certification graph traversal uses 3 bulk batch queries (`$in` array filters).
- **Latency**: Snapshot generation and SHA-256 hash calculation execute in sub-50ms for standard project topologies.

---

## 33. QA Strategy

Phase 27 will be verified via a dedicated, automated QA runner script:
[`apps/api/src/modules/governance/run_phase27_qa.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/run_phase27_qa.ts)

Requirements:
- Dynamically count all scenarios executed.
- Must execute at least 50 distinct QA scenarios.
- Verify full regression across Phases 10, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26.

---

## 34. QA Matrix (50 Dynamically Counted Scenarios)

| # | Category | Description / Inputs | Expected Outcome |
| :---: | :--- | :--- | :--- |
| 1 | `PASSED Certification` | Issue certificate for topology with `PASSED` gate | Creates certificate (`ACTIVE`), returns `201 Created` |
| 2 | `BLOCKED Rejection` | Issue certificate for topology with `BLOCKED` gate | Fails with HTTP `412 Precondition Failed` |
| 3 | `INDETERMINATE Rejection` | Issue certificate with `INDETERMINATE` evidence | Fails with HTTP `412 Precondition Failed` |
| 4 | `GOVERNANCE_DISABLED Rejection` | Issue certificate for governance-disabled project | Fails with HTTP `412 Precondition Failed` |
| 5 | `PASSED_WITH_WAIVER Certification` | Issue certificate with active policy waivers | Creates certificate (`PASSED_WITH_WAIVER`), captures waivers |
| 6 | `Owner Authorization` | Project Owner issues release certificate | Success (`201 Created`) |
| 7 | `Admin Authorization` | System Admin issues release certificate | Success (`201 Created`) |
| 8 | `Unauthorized User` | Non-owner/non-admin user attempts issuance | Fails with HTTP `403 Forbidden` |
| 9 | `Shared EDIT User` | User with EDIT access on document attempts issuance | Fails with HTTP `403 Forbidden` |
| 10 | `Cross-Project Authorization` | User authorized on root project issues certificate | Success, authorized topology captured |
| 11 | `Topology Snapshot` | Pre-check executed | Snapshot includes node & edge roster |
| 12 | `Baseline Snapshot` | Pre-check executed | Snapshot captures active baseline IDs & version tags |
| 13 | `Document Version Snapshot` | Pre-check executed | Snapshot includes target document version details |
| 14 | `Relationship Snapshot` | Pre-check executed | Snapshot captures cross-project contract relationships |
| 15 | `Attestation Snapshot` | Pre-check executed | Snapshot captures active fulfillment attestations |
| 16 | `Waiver Snapshot` | Pre-check executed | Snapshot captures active policy waiver scopes & expirations at $T_{\text{cert}}$ |
| 17 | `Immutable Snapshot` | Live document updated after certification | Historical certificate snapshot remains 100% unchanged |
| 18 | `Hash Determinism` | Compute hash 10 times on same snapshot | Produces identical 64-char SHA-256 hex string |
| 19 | `Hash Change Detection` | Modify 1 field in stored snapshot | `POST /verify` detects hash mismatch (`integrityStatus: TAMPER_DETECTED`) |
| 20 | `Canonical Ordering` | Re-order JSON keys in snapshot | Canonicalizer produces identical serialized string |
| 21 | `Certificate Retrieval` | `GET /release-certificates/:id` | Returns complete stored certificate & snapshot |
| 22 | `Three-Concept Verification` | `POST /verify` on valid certificate | Separates `integrity`, `lifecycle`, and `currentLiveSystem` |
| 23 | `Historical State Preservation` | Live provider baseline bumped v2 $\rightarrow$ v3 | Certificate still shows v2 in historical snapshot |
| 24 | `Current State Divergence` | Live gate turns `BLOCKED` after certification | Certificate hash remains intact (`INTEGRITY_VERIFIED`); `matchesCertifiedState: false` |
| 25 | `Certified-Time Waiver Immunity` | Waiver expires at $T_{\text{now}}$ | Historical snapshot still displays valid waiver evidence frozen at $T_{\text{cert}}$ |
| 26 | `Unidirectional Supersession` | Cert B issued with `supersedesCertificateId: Cert A` | Cert A document remains 100% UNMUTATED; Cert B points to Cert A |
| 27 | `Revocation Execution` | Owner calls `POST /revoke` with reason | Appends `REVOKED` event to `lifecycleEvents`, original snapshot & hash UNTOUCHED |
| 28 | `Revoked Certificate Verification` | Call `/verify` on revoked certificate | Confirms hash integrity (`INTEGRITY_VERIFIED`) while reporting `lifecycle.status: REVOKED` |
| 29 | `Re-Certification After Revocation` | Re-certify `v1.0` after revocation | Issues new `ACTIVE` certificate for `v1.0` with `certificateVersion: 2` |
| 30 | `Duplicate Active Tag Conflict` | Issue 2 active certificates for same `releaseTag` | Second issuance fails with HTTP `409 Conflict` |
| 31 | `POST Pre-Check Method` | Call `POST /pre-check` with filter body | Executes in-memory evaluation with 0 DB writes and 0 audit entries |
| 32 | `Audit Event Issuance` | Issue release certificate | Emits `SYSTEM_RELEASE_CERTIFICATE_ISSUED` to `DocumentAudit` |
| 33 | `Audit Event Revocation` | Revoke release certificate | Emits `SYSTEM_RELEASE_CERTIFICATE_REVOKED` to `DocumentAudit` |
| 34 | `ACL Node Pruning` | User lacks READ on Provider Project P | Node P 100% omitted from snapshot JSON |
| 35 | `Zero ACL Leakage` | Inspect pruned snapshot JSON | Zero placeholders, zero hidden node count metrics |
| 36 | `IDOR Defense` | Access certificate for unauthorized project | Fails with HTTP `403 Forbidden` |
| 37 | `Bounded Topology Limit` | Topology graph with 60 projects | Pre-check rejects with `TOPOLOGY_EXCEEDS_MAX_BOUNDS` |
| 38 | `Bounded Snapshot Size` | Snapshot payload size checked | Rejects snapshots exceeding 5MB |
| 39 | `N+1 Query Prevention` | Monitor DB queries during certification | Executes <= 3 bulk batch queries |
| 40 | `No Current-State Substitution` | Fetch historical certificate | Returns stored snapshot, zero live DB re-queries |
| 41 | `No Fabricated IDs` | Inspect snapshot IDs | All IDs are valid MongoDB ObjectIDs or canonical tags |
| 42 | `No Deployment Drift` | API response inspected | Zero CI/CD, Git, Docker, or deployment fields |
| 43 | `No Task-Management Drift` | API response inspected | Zero Jira, ticket, sprint, or task fields |
| 44 | `Phase 19 Reuse` | Inspect pre-check execution | Reuses `evaluateSystemTopologyGovernanceGate` |
| 45 | `Phase 20 Reuse` | Inspect waiver matching | Reuses `SystemGovernanceWaiver` model & logic |
| 46 | `Phase 18 Reuse` | Inspect baseline alignment | Reuses `system-baseline-alignment.service.ts` |
| 47 | `Phase 14 Reuse` | Inspect ACL graph traversal | Reuses `checkUserProjectReadAccess` |
| 48 | `GET Query Zero Writes` | Execute GET /release-certificates | `DocumentAudit.countDocuments()` remains unchanged |
| 49 | `Concurrent Certification` | 2 owners attempt concurrent issuance | Unique partial index prevents duplicate active tag creation |
| 50 | `Large Bounded System` | Topology with 45 projects | Issues certificate in sub-100ms without memory leak |

---

## 35. Architectural Stress Tests

| Threat / Stress | Mitigation Strategy | Architectural Guarantee |
| :--- | :--- | :--- |
| **1. Persistence Explosion** | Create exactly 1 Mongoose model (`SystemReleaseCertificate`). | Capped database collection overhead. |
| **2. Mutable Certificate Drift** | Snapshot is stored as frozen JSON; no update endpoints exist. | 100% immutable certified historical state. |
| **3. Certificate A Mutation on Supersession**| Store `supersedesCertificateId` on Certificate B only. | Certificate A database document is 100% UNMUTATED. |
| **4. Current-State Substitution** | `GET` endpoints return stored `snapshot` without live queries. | Zero historical rewrite risk. |
| **5. Waiver Expiration Re-interpretation**| Freeze exact waiver evidence in snapshot at $T_{\text{cert}}$. | Historical proof immune to present-day waiver expiration. |
| **6. Concept Conflation** | Isolate `integrity`, `lifecycle`, and `currentLiveSystem` in API. | Clear distinction between tampered snapshot vs live divergence. |
| **7. Fabricated IDs** | Snapshot IDs extracted directly from MongoDB models. | Zero fake/hallucinated ObjectIDs. |
| **8. Hash Instability** | Alphabetical key sorting & standard ISO timestamp formatting. | 100% deterministic SHA-256 hashing. |
| **9. ACL Leakage** | Phase 14 `checkUserProjectReadAccess` prunes graph pre-snapshot. | 100% privacy boundary enforcement. |
| **10. Unauthorized Certification** | Strictly require `admin` or root project `ownerId`. | Rejects unauthorized users (`403 Forbidden`). |
| **11. Duplicated Gate Authority** | Delegate release safety checks to Phase 19 gate evaluator. | Single source of truth for gate decisions. |
| **12. N+1 Query Explode** | Bulk-fetch all topology project assets in 3 queries. | Scalable $O(1)$ query complexity. |
| **13. Deployment/Release Drift** | Omit CI/CD pipelines, Docker scripts, and cloud code. | Pure document & API contract governance. |

---

## 36. Product Boundary Review

- **CI/CD & Deployment Runners**: Rejected. Phase 27 does not execute build scripts or cloud deployments.
- **VCS & Git Automation**: Rejected. Phase 27 does not create Git tags or commit hashes.
- **Jira & Task Management**: Rejected. Phase 27 contains zero ticket boards or sprint task fields.
- **Generic GRC SaaS**: Rejected. Phase 27 is strictly a document and technical contract governance certification system.
- **Non-deterministic AI / LLMs**: Rejected. Phase 27 uses 100% deterministic SHA-256 hashing and Mongoose models.

---

## 37. Acceptance Criteria

1. Mongoose model `SystemReleaseCertificate` created with partial unique index on `{ rootProjectId: 1, releaseTag: 1 }` with `{ partialFilterExpression: { certificateStatus: "ACTIVE" } }`.
2. `POST /api/v1/projects/:projectId/release-certificates/pre-check` evaluates readiness cleanly using `POST` without database writes.
3. `POST /api/v1/projects/:projectId/release-certificates` creates immutable release certificate for passing topologies.
4. `POST /api/v1/projects/:projectId/release-certificates/:id/verify` cleanly isolates `integrity`, `lifecycle`, and `currentLiveSystem`.
5. `POST /api/v1/projects/:projectId/release-certificates/:id/revoke` appends a `REVOKED` lifecycle event without mutating snapshot data or SHA-256 hash.
6. Supersession stores unidirectional pointer on newer certificate; older certificate document remains 100% unmutated.
7. Automated QA runner (`run_phase27_qa.ts`) executes and passes all 50 scenarios dynamically.
8. Full regression test suite passes across Phases 10, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, API typechecks, ESLint, and frontend production builds.

---

## 38. Open Questions

1. **Certificate Export Format**: Should the UI support downloading a formatted JSON certificate file (`REL-2026.1-PROD-certificate.json`) for external compliance archives?
   - *Resolution*: Yes. A helper client-side download utility will serialize the stored certificate DTO to JSON.
2. **Auto-Revocation on Waiver Expiration**: If an active waiver included in a certificate expires 6 months later, does the certificate automatically become revoked?
   - *Resolution*: No. Historical certificates record what was certified at $T_{\text{cert}}$ (`activeWaivers`). Expiration affects live state only, preserving historical proof of what was certified.

---

## 39. Implementation Sequence

```text
Step 1: Create Types & DTO Definitions
   └─► Create apps/api/src/modules/governance/system-release-certificate.types.ts

Step 2: Create Mongoose Model
   └─► Create apps/api/src/modules/governance/system-release-certificate.model.ts

Step 3: Implement Canonicalization & Hashing Helper
   └─► Create canonicalization and SHA-256 hashing utilities

Step 4: Implement Core Certification Service
   └─► Create apps/api/src/modules/governance/system-release-certificate.service.ts
   └─► Implement pre-check, issue, list, getDetails, verifyIntegrity, and revoke

Step 5: Implement Controller & Routes
   └─► Create apps/api/src/modules/governance/system-release-certificate.controller.ts
   └─► Create apps/api/src/modules/governance/system-release-certificate.routes.ts
   └─► Register routes in app.ts with authentication middleware

Step 6: Implement Automated QA Suite & QA Runner
   └─► Create apps/api/src/modules/governance/system-release-certificate.test.ts
   └─► Create apps/api/src/modules/governance/run_phase27_qa.ts (50 scenarios)

Step 7: Implement Frontend Certification Interface
   └─► Create apps/web/src/features/governance/SystemReleaseCertificationView.tsx
   └─► Create apps/web/src/features/governance/SystemReleaseCertificateDrawer.tsx
   └─► Integrate into Project Details Governance section

Step 8: Verification & Regression Sweep
   └─► Run run_phase27_qa.ts (50 scenarios)
   └─► Run Vitest suite across all governance modules
   └─► Run API typecheck, ESLint, Web build, and manual QA
```

---

## 40. Verification Plan

### Automated Verification
1. **Phase 27 Automated QA Suite**: `npx tsx apps/api/src/modules/governance/run_phase27_qa.ts` (50 scenarios).
2. **Vitest Unit & Integration Tests**: `pnpm --filter api test` (All tests across all test files must pass).
3. **Regression QA Suites**: Run `run_phase10_qa.ts` through `run_phase26_qa.ts`.
4. **TypeScript Typecheck**: `pnpm --filter api typecheck` and `pnpm --filter web typecheck` (0 errors).
5. **ESLint**: `pnpm lint` (0 warnings/errors).
6. **Web Production Build**: `pnpm --filter web build` (0 build errors).

### Manual Verification
1. Navigate to Project Details page $\rightarrow$ Governance Section $\rightarrow$ System Release Certification tab.
2. View Pre-Certification Readiness Panel.
3. Click `"Issue System Release Certificate"`, enter `releaseTag: "REL-2026.1-PROD"`.
4. Verify certificate appears in history table with status `ACTIVE` and system status `PASSED` or `PASSED_WITH_WAIVER`.
5. Click `"Verify Integrity"`, confirm modal displays 3 distinct concept cards: Snapshot Integrity (`INTEGRITY_VERIFIED`), Lifecycle Status (`ACTIVE`), and Live System Readiness (`LIVE_GATE_PASSED`).
6. Click `"Revoke Certificate"`, enter reason, verify status transitions to `REVOKED` while snapshot and hash remain 100% intact.
