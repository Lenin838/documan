# POST-COMPLETION SYSTEM RELEASE LINEAGE & ATTESTATION CERTIFICATES DESIGN RESEARCH

**Domain:** 18 — System Release Lineage & Attestation Certificates  
**Repository:** Documan (`apps/api`, `apps/web`)  
**Status:** Complete Repository Analysis & Stitch Design Foundation  
**Deliverable File:** `docs/research/POST-COMPLETION-SYSTEM-RELEASE-LINEAGE-ATTESTATION-DESIGN-RESEARCH.md`

---

## 1. AUTHORITATIVE IMPLEMENTATION LOCATION

### A. Authoritative Source Files & Component Tree

#### Backend (`apps/api/src/modules/governance/`)
- **System Release Certificate Model & Schema:**
  - Model: [`system-release-certificate.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.model.ts)
  - Types: [`system-release-certificate.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.types.ts)
- **System Release Certificate Service & Controller:**
  - Service: [`system-release-certificate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.service.ts)
  - Controller: [`system-release-certificate.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.controller.ts)
  - Routes: [`system-release-certificate.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.routes.ts)
- **System Release Lineage & Comparison Engine:**
  - Service: [`system-release-lineage.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage.service.ts)
  - Helpers: [`system-release-lineage-helpers.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage-helpers.ts)
  - Controller: [`system-release-lineage.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage.controller.ts)
  - Types: [`system-release-lineage.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-lineage.types.ts)

#### Frontend (`apps/web/src/features/governance/`)
- **Release Lineage & Comparison View:**
  - Component: [`SystemReleaseLineageView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemReleaseLineageView.tsx)
  - Purpose: Renders the supersession lineage chain graph, certificate comparison workbench, trajectory classification banner, and differential tabs (`baselines`, `contracts`, `waivers`, `topology`, `attestations`).
- **Compliance Audit & Verification View:**
  - Component: [`ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx)
- **Parent Workspace Mount:**
  - Page: [`ProjectDetailsPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/ProjectDetailsPage.tsx) (Mounted under tab `certificates` — "Certificates & Lineage").
- **API Client:**
  - API: [`governance.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/governance.api.ts)

### B. HTTP API Endpoints & Routes
- `POST /api/v1/projects/:projectId/release-certificates/pre-check` — Evaluates pre-certification system release readiness.
- `POST /api/v1/projects/:projectId/release-certificates` — Issues a persistent, signed system release certificate.
- `GET /api/v1/projects/:projectId/release-certificates` — Lists all release certificates for a project.
- `GET /api/v1/projects/:projectId/release-certificates/:certificateId` — Fetches detailed certificate record & snapshot.
- `POST /api/v1/projects/:projectId/release-certificates/:certificateId/verify` — Verifies snapshot SHA-256 hash integrity & live gate readiness.
- `POST /api/v1/projects/:projectId/release-certificates/:certificateId/revoke` — Revokes a release certificate.
- `GET /api/v1/projects/:projectId/release-certificates/lineage` — Traverses backward supersession lineage chain graph.
- `POST /api/v1/release-certificates/compare` — Diffs two historical certificates across 5 dimensions & calculates trajectory.
- `POST /api/v1/projects/:projectId/release-certificates/:certificateId/export/json` — CAND-01 read-only JSON certificate export bundle.

---

## 2. SYSTEM RELEASE CERTIFICATE DATA MODEL

The authoritative Mongoose schema (`SystemReleaseCertificateSchema` in `system-release-certificate.model.ts`) defines the exact persistent certificate structure:

```typescript
export interface ILifecycleEventDoc {
  eventType: 'ISSUED' | 'REVOKED';
  performedByUserId: Types.ObjectId;
  timestamp: Date;
  reason?: string;
}

export interface ISystemReleaseCertificateDoc extends Document {
  rootProjectId: Types.ObjectId;             // Required, ObjectId ref to Project, Indexed
  releaseTag: string;                         // Required, String, Trimmed (e.g. "v1.4.0")
  certificateVersion: number;                 // Required, Number, Default: 1
  certificateStatus: 'ACTIVE' | 'REVOKED';    // Required, String, Enum, Default: 'ACTIVE', Indexed
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER'; // Required, String, Enum
  certificateHash: string;                    // Required, String (SHA-256 Hex Digest)
  certifiedByUserId: Types.ObjectId;          // Required, ObjectId ref to User
  certifiedAt: Date;                          // Required, Date, Default: Date.now
  notes?: string;                             // Optional, String, Trimmed
  supersedesCertificateId?: Types.ObjectId;   // Optional, ObjectId ref to SystemReleaseCertificate
  lifecycleEvents: ILifecycleEventDoc[];      // Required Array of Lifecycle Event Subdocuments
  snapshot: ISystemReleaseSnapshot;           // Required, Mixed Object (Frozen Historical Evidence)
  createdAt: Date;
  updatedAt: Date;
}
```

### Uniqueness & Partial Index Rules
```typescript
SystemReleaseCertificateSchema.index(
  { rootProjectId: 1, releaseTag: 1 },
  { unique: true, partialFilterExpression: { certificateStatus: 'ACTIVE' } }
);
```
- **Rule:** Enforces that a project can have at most **ONE ACTIVE certificate** per `releaseTag`.
- **Re-certification:** If a release tag is re-certified, the previous active certificate must be superseded or revoked. Historical revoked/superseded certificates for the same `releaseTag` are preserved for audit lineage.

---

## 3. CERTIFICATE SNAPSHOT DATA MODEL ($T_{cert}$)

The `snapshot` field freezes complete, immutable historical evidence at issuance time ($T_{cert}$):

```typescript
export interface ISystemReleaseSnapshot {
  rootProjectId: string;
  rootProjectName: string;
  releaseTag: string;
  certifiedAt: string;
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  topologyNodes: ITopologyNodeSnapshot[];      // Bounded topology nodes
  topologyEdges: ITopologyEdgeSnapshot[];      // Inter-project dependency edges
  activeBaselines: IBaselineSnapshot[];        // Frozen active document baselines
  activeAttestations: IAttestationSnapshot[];  // Frozen package fulfillment attestations
  activeWaivers: IWaiverSnapshot[];            // Active policy waivers frozen at T_cert
  evidenceSummary: {
    totalApplicableContracts: number;
    alignedContractsCount: number;
    waivedBlockersCount: number;
    systemAlignmentScore: number;
    evidenceCompletenessScore: number;
  };
}
```

> [!IMPORTANT]
> **Historical Snapshot Guarantee:** Historical analysis and certificate comparison consume **ONLY** frozen snapshot data (`snapshot`). The system never reconstructs past certificates from live database states.

---

## 4. CERTIFICATE HASH & INTEGRITY

- **Hash Function:** Cryptographic SHA-256 digest (`computeCertificateHash` in `system-release-certificate.service.ts`).
- **Canonicalization:** Uses `canonicalizeSnapshot` to recursively sort object keys alphabetically and render arrays deterministically.
- **Verification Endpoint:** `POST /.../verify` re-computes `computeCertificateHash(cert.snapshot)` and compares it against `cert.certificateHash` to emit `INTEGRITY_VERIFIED` or `TAMPER_DETECTED`.

> [!WARNING]
> **NOT PKI / Digital Signatures:** The certificate hash is a deterministic SHA-256 snapshot integrity checksum. It is **NOT** an X.509 PKI certificate, RSA/ECDSA private key signature, or Certificate Authority (CA) chain. Do not introduce fake PKI concepts.

---

## 5. CERTIFICATE LIFECYCLE & EVENTS

- **Pre-Check (`evaluatePreCertification`):** Verifies that Domain 17's system topology gate status is `PASSED` or `PASSED_WITH_WAIVER` before allowing issuance.
- **Issuance (`issueReleaseCertificate`):** Creates an active certificate, computes the SHA-256 hash over the canonical snapshot, records an `ISSUED` lifecycle event, and writes to `DocumentAudit`. Requires Project Owner or Admin authorization.
- **Revocation (`revokeReleaseCertificate`):** Appends a `REVOKED` event to `lifecycleEvents`, sets `certificateStatus = 'REVOKED'`, and preserves the snapshot 100% unmutated.
- **Supersession:** When re-certifying a release, setting `supersedesCertificateId` links the new certificate to its predecessor. `certificateVersion` increments automatically ($1, 2, 3, \dots$).
- **Lifecycle Event Vocabulary:** Strictly `ISSUED` and `REVOKED`.

---

## 6. CERTIFICATE LINEAGE & SUPERSESSION GRAPH

- **Lineage Traversal (`getCertificateLineageGraph`):** Traverses backward through `supersedesCertificateId` pointers starting from head or active certificate.
- **Traversal Limits:** Bounded to Maximum Depth $= 20$.
- **Graph Safety:** Detects cycles (`hasCycleDetected`) and handles missing parent records (`hasMissingParent`).
- **ACL Lineage Pruning Rule:** If a user lacks read access (`checkUserProjectReadAccess`) to a parent certificate's project, the lineage traversal halts cleanly at the authorized boundary without leaking parent IDs or metadata.
- **Graph Structure:** Backward supersession chain (linear or DAG-like lineage), **NOT** a Git branch/merge tree.

---

## 7. CERTIFICATE COMPARISON & EVOLUTION TRAJECTORY

The comparison engine (`compareReleaseCertificates` in `system-release-lineage.service.ts`) diffs two historical certificates ($Cert_A$ vs $Cert_B$) across 5 dimensions:

1. **Topology Deltas (`diffTopologySnapshots`):** Added, removed, and unchanged nodes & edges.
2. **Baseline Deltas (`diffBaselineSnapshots`):** `ADDED_BASELINE`, `REMOVED_BASELINE`, `VERSION_ADVANCED`, `VERSION_REGRESSED`, `UNCHANGED_BASELINE`.
3. **Contract Deltas (`computeHistoricalContractDeltas`):** Invokes Phase 23 AST OpenAPI diffing on historical document versions (`ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `ENDPOINT_ADDED`, etc.).
4. **Waiver Deltas (`diffWaiverSnapshots`):** `NEWLY_GRANTED`, `RESOLVED`, `CARRIED_FORWARD`, `EXPIRED_POST_CERTIFICATION`, `SCOPE_CHANGED`.
5. **Attestation Deltas (`diffAttestationSnapshots`):** `EVIDENCE_ADDED`, `EVIDENCE_REMOVED`, `EVIDENCE_UNCHANGED`.

### Pure 4-Tier Trajectory Precedence Algorithm (`calculateTrajectoryMetrics`)
The evolution trajectory evaluates strictly in this 4-tier precedence cascade:

$$\text{Precedence: } \text{INDETERMINATE} > \text{DEGRADED} > \text{IMPROVED} > \text{STABLE}$$

1. `INDETERMINATE` — Triggered when $N_{\text{applicable}} = 0$ or historical evidence is incomplete (`ZERO_APPLICABLE_EVIDENCE` or `MISSING_HISTORICAL_EVIDENCE`).
2. `DEGRADED` — Triggered if breaking contract deltas exist, alignment score drops ($\Delta < 0$), system release status regresses (`PASSED` $\to$ `PASSED_WITH_WAIVER`), or active waivers increase without score gain.
3. `IMPROVED` — Triggered if alignment score increases ($\Delta > 0$), active waivers do not grow ($\Delta \le 0$), and zero breaking contract deltas exist.
4. `STABLE` — Default state when scores and waivers remain unchanged.

> [!CAUTION]
> **No Fabricated Metrics:** The trajectory algorithm emits strictly `IMPROVED`, `STABLE`, `DEGRADED`, or `INDETERMINATE`. It does **NOT** generate percentage health scores, risk scores, SLA targets, or SLA compliance badges.

---

## 8. TEMPORAL MODEL ($T_{cert}$, $T_{now}$, $T_{predicted}$)

- **$T_{cert}$ (Frozen Certificate Snapshot):** Immutable historical snapshot recorded at certification time. Used for historical diffing and integrity verification.
- **$T_{now}$ (Current Live System Gate):** Live system gate evaluation compared against $T_{cert}$ during certificate verification (`currentLiveSystem.matchesCertifiedState`).
- **$T_{predicted}$ (Simulated What-If State):** **NOT USED in Domain 18**. Domain 17 owns in-memory what-if simulations. Domain 18 strictly handles real historical release certificates.

---

## 9. FRONTEND UI ARCHITECTURE & PLACEMENT

Mounted in [`ProjectDetailsPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/ProjectDetailsPage.tsx) under the 5th project tab: `certificates` ("Certificates & Lineage").

```
[ProjectDetailsPage: Tab 5 - Certificates & Lineage]
  └── SystemReleaseLineageView.tsx
        ├── GovernanceBanner (Snapshot mode: "Release Certificate Lineage & Evolution")
        ├── Supersession Lineage Chain Graph (Scrollable node list showing release tags & status badges)
        ├── Certificate Comparison Workbench (Select Source & Target Certificate dropdowns + Compare button)
        ├── Evolution Trajectory Banner (Displays IMPROVED / DEGRADED / STABLE / INDETERMINATE + Delta metrics)
        ├── Differential Tabs Container
        │     ├── [Baselines Tab] Baseline version changes (VERSION_ADVANCED, VERSION_REGRESSED)
        │     ├── [Contracts Tab] Phase 23 AST structural diffs (ENDPOINT_REMOVED, etc.)
        │     ├── [Waivers Tab] Policy waiver shifts (RESOLVED, NEWLY_GRANTED, EXPIRED)
        │     ├── [Topology Tab] Node & edge additions/removals
        │     └── [Attestations Tab] Package attestation coverage deltas
        └── ReleaseCertificateComplianceAuditView.tsx (Detailed certificate verification & JSON export)
```

---

## 10. DOMAIN BOUNDARIES (WHAT DOMAIN 18 DOES NOT OWN)

Domain 18 must **NOT** become:
- CI/CD build runner or deployment pipeline tool.
- Git commit/branch tree viewer.
- PKI Certificate Authority (CA) key manager.
- Domain 17 In-Memory What-If Simulation Sandbox (Domain 18 handles persisted certificates only).
- Domain 19 Printable Report renderer (Domain 18 feeds data to Domain 19, but does not handle PDF print styling).

---

## 11. AUTHORITY MAP

| Domain Feature | Authoritative Domain Owner | Domain 18 Integration |
| :--- | :--- | :--- |
| **Release Certificate History** | **Domain 18** | Owns `SystemReleaseCertificate` entity, lineage graph, & trajectory diffing. |
| **Contract Evolution AST** | **Domain 16** | Consumes OpenAPI spec diffing for historical baseline version pairs. |
| **System Topology Graph** | **Domain 17** | Consumes topology nodes & edges to freeze inside certificate snapshots. |
| **Package Attestations** | **Domain 14** | Consumes `PackageFulfillmentAttestation` records at $T_{cert}$. |
| **Verification Plans** | **Domain 15** | Consumes verification completeness scores. |

---

## 12. PROPOSED STITCH DESIGN ARCHITECTURE

The high-fidelity Stitch design for Domain 18 will feature eight canonical view screens:

1. **18.00 Release Certificate Overview & Roster** — Certificate list, active status badges, version numbers, and pre-check status.
2. **18.01 Supersession Lineage Graph** — Horizontal lineage graph visualizing backward `supersedesCertificateId` links ($v1 \to v2 \to v3$).
3. **18.02 Certificate Snapshot Inspector** — Deep-dive view into frozen $T_{cert}$ topology, baselines, waivers, and attestations.
4. **18.03 Certificate Comparison Workbench** — Dual certificate selector with side-by-side comparison.
5. **18.04 System Evolution Trajectory Banner** — Visual indicator for `IMPROVED`, `STABLE`, `DEGRADED`, or `INDETERMINATE`.
6. **18.05 Differential Breakdown Panels** — Tabbed views for baseline deltas, structural contract diffs, waiver shifts, and topology changes.
7. **18.06 Certificate Verification & Integrity Panel** — SHA-256 hash validation display and live system match check.
8. **18.07 Issue & Revoke Certificate Modals** — Pre-certification checklist modal and revocation reason dialog.

---

## 13. FINAL RESEARCH ASSESSMENT

### A. Verified Capabilities
- Pre-certification check, persistent certificate issuance, revocation, re-certification, backward supersession lineage traversal, 5-dimensional certificate comparison, 4-tier trajectory evaluation, SHA-256 hash verification.

### B. Verified Data Model
- `SystemReleaseCertificate` model with partial unique index on `{ rootProjectId: 1, releaseTag: 1 }` for `ACTIVE` status. `ISystemReleaseSnapshot` freezing historical evidence.

### C. Verified API Surface
- 9 REST endpoints under `/api/v1/projects/:projectId/release-certificates` and `/api/v1/release-certificates`.

### D. Verified Frontend Surface
- `SystemReleaseLineageView.tsx` mounted under `certificates` tab in `ProjectDetailsPage.tsx`.

### E. Verified Temporal Semantics
- $T_{cert}$ (frozen snapshot), $T_{now}$ (live system match check). $T_{predicted}$ excluded.

### F. Verified Lineage Semantics
- Backward supersession graph bounded to depth 20, cycle/missing parent safe, ACL-pruned.

### G. Verified Comparison Semantics
- Diffs topology, baselines, contracts (Phase 23 AST), waivers, attestations.

### H. Verified Trajectory Semantics
- 4-tier precedence: `INDETERMINATE` > `DEGRADED` > `IMPROVED` > `STABLE`.

### I. Verified ACL Semantics
- `checkUserProjectReadAccess` enforced. Parent certificates in inaccessible projects pruned without leaking metadata.

### J. Domain Boundaries
- NOT CI/CD, Git branch graph, PKI/CA signing, or Domain 17 in-memory sandbox.

### K. Recommended Stitch UI Architecture
- 8-part canonical layout (18.00 through 18.07).

### L. Open Questions
- None. Full repository backing verified.

### M. Final Readiness
**READY FOR STITCH DESIGN**
