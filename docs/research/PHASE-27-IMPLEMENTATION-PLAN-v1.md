# Phase 27 Implementation Plan v1 — System-Wide Release Readiness Certification & Immutable System Release Snapshot Engine

> **Product Source of Truth**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)  
> **Research Source**: [`docs/research/PHASE-27-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-27-RESEARCH.md)  
> **Status**: APPROVED RESEARCH — IMPLEMENTATION PLAN v1  

---

## 1. Executive Summary

Phase 27 establishes the **System-Wide Release Readiness Certification & Immutable System Release Snapshot Engine** ([`system-release-certificate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.service.ts)), a persistent Mongoose model ([`SystemReleaseCertificate`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts)), and an interactive certification view ([`SystemReleaseCertificationView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseCertificationView.tsx)).

Phase 27 allows authorized Project Owners and System Admins to evaluate system release readiness across a multi-project topology graph, freeze a multi-project governance snapshot at a specific release milestone (e.g. `REL-2026.1-PROD`), sign off on system readiness, persist an unalterable **System Release Certificate**, and calculate a cryptographic SHA-256 fingerprint (`certificateHash`) over the frozen canonical snapshot representation.

**CRITICAL IMMUTABILITY SEMANTICS**:
- The historical snapshot and computed `certificateHash` of a `SystemReleaseCertificate` are **100% IMMUTABLE**. Once created, the certified snapshot data is NEVER updated, modified, or reconstructed using current live database state.
- **Revocation** is modeled as an append-only lifecycle event: a separate `revocation` object is attached to the certificate record (`certificateStatus = 'REVOKED'`, `revokedByUserId`, `revokedAt`, `revocationReason`), leaving the original snapshot payload and cryptographic hash 100% unmutated.

---

## 2. Research Basis

**REPOSITORY FACT**: This implementation plan is directly grounded in [`docs/research/PHASE-27-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-27-RESEARCH.md) and composes existing governance authorities across Phases 10–26:

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
                  │ Pre-Certification Validation (READ ONLY) │
                  │  - Runs Phase 19 Gate & Readiness Check   │
                  └─────────────────────┬─────────────────────┘
                                        │
                                        ▼ User Clicks "Issue Certificate"
                  ┌───────────────────────────────────────────┐
                  │        Certificate Issuance (WRITE)        │
                  │  - Validates Owner/Admin Authority        │
                  │  - Validates Gate PASSED / PASSED_WAIVER  │
                  │  - Freezes Snapshot & Calculates SHA-256   │
                  │  - Emits SYSTEM_RELEASE_CERTIFICATE_ISSUED│
                  └─────────────────────┬─────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
           ┌───────────────────────────┐ ┌───────────────────────────┐
           │     ACTIVE CERTIFIED      │ │   SUPERSEDED (OPTIONAL)   │
           │  - Snapshot 100% Immutable│ │  - Pointer to newer tag   │
           │  - Hash Verified Intact   │ │  - Snapshot 100% Immutable│
           └─────────────┬─────────────┘ └───────────────────────────┘
                         │
                         ▼ User Clicks "Revoke Certificate"
           ┌───────────────────────────────────────────┐
           │            REVOKED CERTIFICATE            │
           │  - Appends revocation metadata object     │
           │  - Status = 'REVOKED'                     │
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

## 11. Snapshot Contents

```typescript
export interface ISystemReleaseSnapshot {
  rootProjectId: string;
  rootProjectName: string;
  releaseTag: string;
  evaluatedAt: string; // ISO-8601 string
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
  activeWaivers: Array<{
    waiverId: string;
    targetProviderProjectId: string;
    blockerType: string;
    targetDocumentId?: string;
    expiresAt: string;
    grantedByUserId: string;
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
1. `certificateStatus` is set to `'CERTIFIED_WITH_WAIVERS'`.
2. `systemReleaseStatus` is set to `'PASSED_WITH_WAIVER'`.
3. The exact list of active waivers (`activeWaivers`) in effect at certification time is frozen into the snapshot.
4. The certificate explicitly records `waivedBlockersCount`.
5. Phase 19/20 semantics are fully preserved; waivers are never falsely represented as `PASSED` without waivers.

---

## 15. Immutable Certificate Model

**PROPOSED DESIGN**: Mongoose model located at [`apps/api/src/modules/governance/system-release-certificate.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts).

```typescript
import { Schema, model, Document } from 'mongoose';
import { ISystemReleaseSnapshot } from './system-release-certificate.types';

export interface IRevocationMetadata {
  revokedByUserId: Schema.Types.ObjectId;
  revokedAt: Date;
  revocationReason: string;
}

export interface ISystemReleaseCertificateDoc extends Document {
  rootProjectId: Schema.Types.ObjectId;
  releaseTag: string; // e.g. "REL-2026.1-PROD"
  certificateStatus: 'CERTIFIED_PASSED' | 'CERTIFIED_WITH_WAIVERS' | 'REVOKED';
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  certificateHash: string; // SHA-256 fingerprint over canonical snapshot
  certifiedByUserId: Schema.Types.ObjectId;
  certifiedAt: Date;
  notes?: string;
  supersededByCertificateId?: Schema.Types.ObjectId;
  revocation?: IRevocationMetadata;
  snapshot: ISystemReleaseSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const SystemReleaseCertificateSchema = new Schema<ISystemReleaseCertificateDoc>(
  {
    rootProjectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    releaseTag: { type: String, required: true, trim: true },
    certificateStatus: {
      type: String,
      enum: ['CERTIFIED_PASSED', 'CERTIFIED_WITH_WAIVERS', 'REVOKED'],
      required: true,
      index: true,
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
    supersededByCertificateId: { type: Schema.Types.ObjectId, ref: 'SystemReleaseCertificate' },
    revocation: {
      revokedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      revokedAt: { type: Date },
      revocationReason: { type: String, trim: true },
    },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// Compound index enforcing unique active release tags per project
SystemReleaseCertificateSchema.index({ rootProjectId: 1, releaseTag: 1 }, { unique: true });

export const SystemReleaseCertificate = model<ISystemReleaseCertificateDoc>(
  'SystemReleaseCertificate',
  SystemReleaseCertificateSchema
);
```

---

## 16. Certificate Hashing

**PROPOSED DESIGN**: SHA-256 cryptographic fingerprint calculated over a normalized canonical JSON string representation of the frozen snapshot.

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

## 18. Integrity Verification

**PROPOSED DESIGN**: Verifying a certificate integrity (`POST /api/v1/projects/:projectId/release-certificates/:id/verify`) executes 4 deterministic checks:

1. **Snapshot Hash Verification**: Re-computes SHA-256 over stored `snapshot` using `computeCertificateHash(certificate.snapshot)`. Compares result to stored `certificateHash`.
   - Match $\rightarrow$ `isHashValid: true`
   - Mismatch $\rightarrow$ `isHashValid: false` (`TAMPER_DETECTED`)
2. **Revocation Status Check**: Checks `certificateStatus === 'REVOKED'`.
3. **Issuer Identity Verification**: Verifies `certifiedByUserId` references a valid user record.
4. **Current System Comparison (Informational)**: Executes Phase 19 live gate check (`evaluateSystemTopologyGovernanceGate`) to report whether live state matches certified historical state (`currentlyMatchesLiveState: boolean`).

**CRITICAL DISTINCTION**:
- `INTEGRITY_VERIFIED`: Snapshot has not been tampered with (`certificateHash` matches).
- `CURRENT_STATE_MATCHES`: Live system state currently passes the same gate settings.
- A certificate can be **INTEGRITY VERIFIED** even if current live state has diverged!

---

## 19. Revocation

**PROPOSED DESIGN**: Revoking a certificate (`POST /api/v1/projects/:projectId/release-certificates/:id/revoke`) is an append-only operation:

- Requires Project Owner or System Admin authority.
- Requires non-empty `revocationReason`.
- Sets `certificateStatus = 'REVOKED'`.
- Appends `revocation` object: `{ revokedByUserId: userId, revokedAt: new Date(), revocationReason }`.
- **DOES NOT MUTATE** `snapshot`, `certificateHash`, `certifiedAt`, or `certifiedByUserId`.
- Emits `SYSTEM_RELEASE_CERTIFICATE_REVOKED` event to `DocumentAudit`.

---

## 20. Supersession

**PROPOSED DESIGN**: When a project issues a new certificate with an updated tag (e.g. `REL-2026.2-PROD`) for the same topology:
- The previous certificate (`REL-2026.1-PROD`) remains active in history.
- Optionally, the new certificate creation accepts `supersedesCertificateId`.
- The new certificate sets `supersededByCertificateId` pointer on the old certificate without mutating the old snapshot or hash.

---

## 21. Audit Semantics

**REPOSITORY FACT**: `DocumentAudit` ([`apps/api/src/modules/documents/document-audit.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-audit.model.ts)) records immutable audit events.

**PROPOSED DESIGN**: Phase 27 emits 3 new audit event types:
- `SYSTEM_RELEASE_CERTIFICATE_ISSUED`: Emitted when a certificate is successfully created.
- `SYSTEM_RELEASE_CERTIFICATE_REVOKED`: Emitted when a certificate is revoked.
- `SYSTEM_RELEASE_CERTIFICATE_SUPERSEDED`: Emitted when a certificate is superseded.

**READ AUDIT RULE**: Read queries (`GET`, `pre-check`, `verify`) generate **0 audit writes**.

---

## 22. ACL / Privacy

1. **Pre-Snapshot Authorization**: Phase 14 `checkUserProjectReadAccess(userId, targetProjectId)` executes for every project node during topology traversal.
2. **Strict Privacy Pruning**: If the requesting user lacks `READ` permission on a connected project in the topology, that node, its topology edges, active baselines, attestations, and waivers are **100% omitted** from the snapshot.
3. **Zero Leakage**: Unauthorized nodes return zero placeholders, zero restricted node IDs, and zero count leakage.
4. **Certificate Read Access**: A user can view a release certificate (`GET`) if they have `READ` access to the `rootProjectId`. Unauthorized users receive HTTP `403 Forbidden`.

---

## 23. Bounds

- `MAX_TOPOLOGY_PROJECTS = 50`
- `MAX_TOPOLOGY_EDGES = 100`
- `MAX_CERTIFICATE_HISTORY_LIMIT = 50`
- `MAX_SNAPSHOT_SIZE_BYTES = 5242880` (5MB cap)

If topology exceeds 50 projects, pre-check returns `canCertify: false` with reason `TOPOLOGY_EXCEEDS_MAX_BOUNDS`.

---

## 24. Persistence

**PERSISTENCE DECISION**: Exactly **1 New Persistent Model** is justified:
- `SystemReleaseCertificate` ([`apps/api/src/modules/governance/system-release-certificate.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts)).

Zero other database models or collections are created.

---

## 25. API Surface

```http
# 1. Pre-Certification Evaluation (READ - 0 Audit Writes)
POST /api/v1/projects/:projectId/release-certificates/pre-check

# 2. Issue Release Certificate (WRITE - Emits Audit)
POST /api/v1/projects/:projectId/release-certificates

# 3. List Release Certificates (READ - 0 Audit Writes)
GET /api/v1/projects/:projectId/release-certificates

# 4. Get Release Certificate Details (READ - 0 Audit Writes)
GET /api/v1/projects/:projectId/release-certificates/:certificateId

# 5. Verify Certificate Integrity (READ - 0 Audit Writes)
POST /api/v1/projects/:projectId/release-certificates/:certificateId/verify

# 6. Revoke Release Certificate (WRITE - Emits Audit)
POST /api/v1/projects/:projectId/release-certificates/:certificateId/revoke
```

---

## 26. Frontend Architecture

Focused UI panel integrated into Governance section:
[`apps/web/src/features/governance/SystemReleaseCertificationView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseCertificationView.tsx) and drawer [`SystemReleaseCertificateDrawer.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseCertificateDrawer.tsx).

### UI Layout & Components:
1. **Certification Header**: Root project name, active certificates count, and `"Issue Release Certificate"` button.
2. **Pre-Certification Readiness Panel**: Displays Phase 19 gate status badge (`PASSED` green badge, `PASSED_WITH_WAIVER` orange badge, `BLOCKED` red badge), waivable blockers, and active waivers.
3. **Frozen Snapshot Preview Drawer**: Displays canonical JSON preview, active baselines roster, attestations list, waivers list, and SHA-256 fingerprint preview.
4. **Explicit Disclaimer Banner**:
   > *"This certificate records the system governance state evaluated at the certification time. Later system changes do not modify this historical certificate."*
5. **Certificate History Table**: Lists past certificates with release tag, status badge (`CERTIFIED_PASSED`, `CERTIFIED_WITH_WAIVERS`, `REVOKED`), certifier name, date, SHA-256 hash snippet, and `"Verify Integrity"` action button.
6. **Integrity Verification Modal**: Shows green checkmark `"INTEGRITY VERIFIED - Snapshot matches SHA-256 Hash"` alongside live system status comparison.

---

## 27. Existing Phase Reuse

Phase 27 reuses existing services without code duplication:
- **Phase 14**: `ProjectTopologyLink` model and `checkUserProjectReadAccess`.
- **Phase 17**: `PackageFulfillmentAttestation` model.
- **Phase 18**: `system-baseline-alignment.service.ts`.
- **Phase 19**: `evaluateSystemTopologyGovernanceGate` in `system-topology-governance-gate.service.ts`.
- **Phase 20**: `SystemGovernanceWaiver` model and waiver matching logic.
- **Phase 22**: `system-governance-lineage.service.ts`.
- **Phase 25**: `system-contract-matrix.service.ts`.

---

## 28. Security Threat Model

| Threat ID | Threat Category | Description | Defense / Mitigation |
| :---: | :--- | :--- | :--- |
| **T-01** | IDOR | Attacker attempts to certify or view certificates for project they don't own. | Validate project access via `checkUserProjectReadAccess` before processing. |
| **T-02** | Unauthorized Issuance | Shared EDIT user attempts to issue release certificate. | Strictly require `user.role === 'admin'` or `project.ownerId === userId` (`403 Forbidden`). |
| **T-03** | Snapshot Tampering | Attacker edits snapshot JSON directly in MongoDB. | `POST /verify` re-computes SHA-256 hash; detects mismatch instantly (`TAMPER_DETECTED`). |
| **T-04** | Privacy Leakage | Certificate snapshot exposes unauthorized project titles. | Phase 14 ACL graph pruning filters unauthorized nodes before snapshot creation. |
| **T-05** | Hidden Node Leakage | Snapshot includes placeholders for unauthorized nodes. | Zero placeholders, zero hidden node counts in snapshot JSON. |
| **T-06** | Gate Bypass | User attempts to certify project with `BLOCKED` release gate. | `POST /release-certificates` re-evaluates Phase 19 gate; rejects non-passing status (`412 Precondition Failed`). |
| **T-07** | Revocation Abuse | Non-owner attempts to revoke release certificate. | Require Project Owner or System Admin role for revocation. |
| **T-08** | Duplicate Tag | User issues multiple certificates with exact same `releaseTag`. | Compound unique index `{ rootProjectId: 1, releaseTag: 1 }` rejects duplicates (`409 Conflict`). |
| **T-09** | Fake Issuer ID | Request submits spoofed `certifiedByUserId`. | `certifiedByUserId` is populated strictly from authenticated JWT (`req.user.id`). |
| **T-10** | Live State Overwrite | Code updates historical snapshot when live state changes. | Snapshot is frozen upon creation; API endpoints return stored JSON without re-querying live collections. |
| **T-11** | Current-State Substitution | Verification returns failure because live state diverged. | Verification separates `isHashValid` (integrity) from `currentlyMatchesLiveState` (informational). |
| **T-12** | N+1 Query Explode | Graph traversal fetches nodes in recursive loops. | Bulk-fetch baselines, attestations, and waivers in 3 batch queries; cap traversal depth at 3. |
| **T-13** | Unbounded Snapshot | Massive project topology creates 100MB snapshot. | Enforce `MAX_TOPOLOGY_PROJECTS = 50` and 5MB size limit. |
| **T-14** | Deployment Drift | Endpoint attempts to execute deployment scripts. | 100% document/governance-centric; 0 deployment code. |
| **T-15** | Task Management Drift | Certificate includes sprint/jira task fields. | Pure governance release certification schema; zero task fields. |

---

## 29. Determinism

Given identical snapshot data, canonical serialization and SHA-256 hashing are **100% deterministic**:
- `canonicalizeSnapshot(snapshot)` sorts keys alphabetically and formats arrays deterministically.
- Re-running `computeCertificateHash(snapshot)` 1,000 times produces the exact same 64-character hex string byte-for-byte.

---

## 30. Performance

- **Query Complexity**: $O(1)$ database write on certification creation; $O(1)$ read on retrieval.
- **Bulk Database Batching**: Pre-certification graph traversal uses 3 bulk batch queries (`$in` array filters).
- **Latency**: Snapshot generation and SHA-256 hash calculation execute in sub-50ms for standard project topologies.

---

## 31. QA Strategy

Phase 27 will be verified via a dedicated, automated QA runner script:
[`apps/api/src/modules/governance/run_phase27_qa.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/run_phase27_qa.ts)

Requirements:
- Dynamically count all scenarios executed.
- Must execute at least 50 distinct QA scenarios.
- Verify full regression across Phases 10, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26.

---

## 32. QA Matrix (50 Dynamically Counted Scenarios)

| # | Category | Description / Inputs | Expected Outcome |
| :---: | :--- | :--- | :--- |
| 1 | `PASSED Certification` | Issue certificate for topology with `PASSED` gate | Creates certificate (`CERTIFIED_PASSED`), returns `201 Created` |
| 2 | `BLOCKED Rejection` | Issue certificate for topology with `BLOCKED` gate | Fails with HTTP `412 Precondition Failed` |
| 3 | `INDETERMINATE Rejection` | Issue certificate with `INDETERMINATE` evidence | Fails with HTTP `412 Precondition Failed` |
| 4 | `GOVERNANCE_DISABLED Rejection` | Issue certificate for governance-disabled project | Fails with HTTP `412 Precondition Failed` |
| 5 | `PASSED_WITH_WAIVER Certification` | Issue certificate with active policy waivers | Creates certificate (`CERTIFIED_WITH_WAIVERS`), captures waivers |
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
| 16 | `Waiver Snapshot` | Pre-check executed | Snapshot captures active policy waiver scopes & expirations |
| 17 | `Immutable Snapshot` | Live document updated after certification | Historical certificate snapshot remains 100% unchanged |
| 18 | `Hash Determinism` | Compute hash 10 times on same snapshot | Produces identical 64-char SHA-256 hex string |
| 19 | `Hash Change Detection` | Modify 1 field in stored snapshot | `POST /verify` detects hash mismatch (`isHashValid: false`) |
| 20 | `Canonical Ordering` | Re-order JSON keys in snapshot | Canonicalizer produces identical serialized string |
| 21 | `Certificate Retrieval` | `GET /release-certificates/:id` | Returns complete stored certificate & snapshot |
| 22 | `Integrity Verification` | `POST /verify` on valid certificate | Returns `isHashValid: true`, `status: INTEGRITY_VERIFIED` |
| 23 | `Historical State Preservation` | Live provider baseline bumped v2 $\rightarrow$ v3 | Certificate still shows v2 in historical snapshot |
| 24 | `Current State Divergence` | Live gate turns `BLOCKED` after certification | Certificate remains intact; `currentlyMatchesLiveState: false` |
| 25 | `Certified vs Current UI` | View certificate details in UI | UI cleanly renders certified historical vs current live state |
| 26 | `Revocation Execution` | Owner calls `POST /revoke` with reason | Status set to `REVOKED`, original snapshot UNTOUCHED |
| 27 | `Revocation Verification` | `POST /verify` on revoked certificate | Returns `isHashValid: true`, `certificateStatus: REVOKED` |
| 28 | `Supersession Tracking` | Issue new certificate with `supersedesCertificateId` | New certificate links to old; old remains intact |
| 29 | `Duplicate Tag Conflict` | Issue 2 certificates with same `releaseTag` | Second issuance fails with HTTP `409 Conflict` |
| 30 | `Timestamp Semantics` | Inspect `certifiedAt` timestamp | Timestamp matches server creation time (`certifiedAt`) |
| 31 | `Audit Event Issuance` | Issue release certificate | Emits `SYSTEM_RELEASE_CERTIFICATE_ISSUED` to `DocumentAudit` |
| 32 | `Audit Event Revocation` | Revoke release certificate | Emits `SYSTEM_RELEASE_CERTIFICATE_REVOKED` to `DocumentAudit` |
| 33 | `ACL Node Pruning` | User lacks READ on Provider Project P | Node P 100% omitted from snapshot JSON |
| 34 | `Zero ACL Leakage` | Inspect pruned snapshot JSON | Zero placeholders, zero hidden node count metrics |
| 35 | `IDOR Defense` | Access certificate for unauthorized project | Fails with HTTP `403 Forbidden` |
| 36 | `Bounded Topology Limit` | Topology graph with 60 projects | Pre-check rejects with `TOPOLOGY_EXCEEDS_MAX_BOUNDS` |
| 37 | `Bounded Snapshot Size` | Snapshot payload size checked | Rejects snapshots exceeding 5MB |
| 38 | `N+1 Query Prevention` | Monitor DB queries during certification | Executes <= 3 bulk batch queries |
| 39 | `No Current-State Substitution` | Fetch historical certificate | Returns stored snapshot, zero live DB re-queries |
| 40 | `No Fabricated IDs` | Inspect snapshot IDs | All IDs are valid MongoDB ObjectIDs or canonical tags |
| 41 | `No Deployment Drift` | API response inspected | Zero CI/CD, Git, Docker, or deployment fields |
| 42 | `No Task-Management Drift` | API response inspected | Zero Jira, ticket, sprint, or task fields |
| 43 | `Phase 19 Reuse` | Inspect pre-check execution | Reuses `evaluateSystemTopologyGovernanceGate` |
| 44 | `Phase 20 Reuse` | Inspect waiver matching | Reuses `SystemGovernanceWaiver` model & logic |
| 45 | `Phase 18 Reuse` | Inspect baseline alignment | Reuses `system-baseline-alignment.service.ts` |
| 46 | `Phase 14 Reuse` | Inspect ACL graph traversal | Reuses `checkUserProjectReadAccess` |
| 47 | `GET Query Zero Writes` | Execute GET /release-certificates | `DocumentAudit.countDocuments()` remains unchanged |
| 48 | `Revoked Certificate Verification` | Call `/verify` on revoked certificate | Confirms hash integrity while flagging `REVOKED` |
| 49 | `Concurrent Certification` | 2 owners attempt concurrent issuance | Unique index prevents duplicate release tag creation |
| 50 | `Large Bounded System` | Topology with 45 projects | Issues certificate in sub-100ms without memory leak |

---

## 33. Architectural Stress Tests

| Threat / Stress | Mitigation Strategy | Architectural Guarantee |
| :--- | :--- | :--- |
| **1. Persistence Explosion** | Create exactly 1 Mongoose model (`SystemReleaseCertificate`). | Capped database collection overhead. |
| **2. Mutable Certificate Drift** | Snapshot is stored as frozen JSON; no update endpoints exist. | 100% immutable certified historical state. |
| **3. Current-State Substitution** | `GET` endpoints return stored `snapshot` without live queries. | Zero historical rewrite risk. |
| **4. Fake Snapshot Reconstruction** | Calculate SHA-256 over canonicalized JSON snapshot. | Instant detection of tampered snapshot data. |
| **5. Fabricated IDs** | Snapshot IDs extracted directly from MongoDB models. | Zero fake/hallucinated ObjectIDs. |
| **6. Hash Instability** | Alphabetical key sorting & standard ISO timestamp formatting. | 100% deterministic SHA-256 hashing. |
| **7. ACL Leakage** | Phase 14 `checkUserProjectReadAccess` prunes graph pre-snapshot. | 100% privacy boundary enforcement. |
| **8. Unauthorized Certification** | Strictly require `admin` or root project `ownerId`. | Rejects unauthorized users (`403 Forbidden`). |
| **9. Duplicated Gate Authority** | Delegate release safety checks to Phase 19 gate evaluator. | Single source of truth for gate decisions. |
| **10. Duplicated Waiver Authority**| Import waiver matching logic from Phase 20 service. | Single source of truth for waiver matching. |
| **11. N+1 Query Explode** | Bulk-fetch all topology project assets in 3 queries. | Scalable $O(1)$ query complexity. |
| **12. Deployment/Release Drift** | Omit CI/CD pipelines, Docker scripts, and cloud code. | Pure document & API contract governance. |
| **13. Generic Compliance Drift** | Focus schema on document baselines, attestations, & waivers. | Product-aligned governance certification. |

---

## 34. Product Boundary Review

- **CI/CD & Deployment Runners**: Rejected. Phase 27 does not execute build scripts or cloud deployments.
- **VCS & Git Automation**: Rejected. Phase 27 does not create Git tags or commit hashes.
- **Jira & Task Management**: Rejected. Phase 27 contains zero ticket boards or sprint task fields.
- **Generic GRC SaaS**: Rejected. Phase 27 is strictly a document and technical contract governance certification system.
- **Non-deterministic AI / LLMs**: Rejected. Phase 27 uses 100% deterministic SHA-256 hashing and Mongoose models.

---

## 35. Acceptance Criteria

1. Mongoose model `SystemReleaseCertificate` created with unique index on `{ rootProjectId: 1, releaseTag: 1 }`.
2. `POST /api/v1/projects/:projectId/release-certificates/pre-check` returns release readiness summary without database writes.
3. `POST /api/v1/projects/:projectId/release-certificates` creates immutable release certificate for passing topologies.
4. `POST /api/v1/projects/:projectId/release-certificates/:id/verify` verifies SHA-256 hash integrity.
5. `POST /api/v1/projects/:projectId/release-certificates/:id/revoke` revokes certificate without mutating snapshot data.
6. Automated QA runner (`run_phase27_qa.ts`) executes and passes all 50 scenarios dynamically.
7. Full regression test suite passes across Phases 10, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, API typechecks, ESLint, and frontend production builds.

---

## 36. Open Questions

1. **Certificate Export Format**: Should the UI support downloading a formatted JSON certificate file (`REL-2026.1-PROD-certificate.json`) for external compliance archives?
   - *Resolution*: Yes. A helper client-side download utility will serialize the stored certificate DTO to JSON.
2. **Auto-Revocation on Waiver Expiration**: If an active waiver included in a certificate expires 6 months later, does the certificate automatically become revoked?
   - *Resolution*: No. Historical certificates remain intact (`CERTIFIED_WITH_WAIVERS`). Expiration affects live state only, preserving historical proof of what was certified at $T_{\text{cert}}$.

---

## 37. Implementation Sequence

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

## 38. Verification Plan

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
4. Verify certificate appears in history table with status `CERTIFIED_PASSED` or `CERTIFIED_WITH_WAIVERS`.
5. Click `"Verify Integrity"`, confirm modal displays `"INTEGRITY VERIFIED - Snapshot matches SHA-256 Hash"`.
6. Click `"Revoke Certificate"`, enter reason, verify status transitions to `REVOKED` while snapshot remains intact.
