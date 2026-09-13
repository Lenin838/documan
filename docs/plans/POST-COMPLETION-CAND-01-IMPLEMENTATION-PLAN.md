# Post-Completion Implementation Plan — CAND-01

> **Post-Completion Product Enhancement Plan**
>
> **Status**: IMPLEMENTATION-READY (CORRECTED)  
> **Enhancement Title**: System Release Certificate & Compliance Drift Audit Export Bundle (PDF/JSON Standalone Attestation Package)  
> **Base Target**: Current Post-Completion `main` branch (Phases 1–32 Complete & Fully Certified)  
> **Product Boundary**: Read-Only Projection of Existing Authorities (`Persistence = 0`). Isolated CAND-01 Work Only. NO Phase 33. NO Roadmap Reopening.

---

## A. Product Objective

### Problem Statement
Compliance officers, external security auditors, enterprise architects, and project stakeholders require portable, offsite attestation evidence packages to verify system release readiness, baseline contract alignment, and post-certification compliance drift. Currently, release certificates (Phase 27), certificate evolution chains (Phase 28), and compliance drift reports (Phase 29) can only be viewed interactively within the authenticated Documan web UI or fetched via raw REST endpoints.

### Solution & Value
CAND-01 provides a **read-only, zero-persistence export capability** that packages frozen release certificate snapshot state ($T_{\text{cert}}$), lineage history, and live compliance drift variance findings ($T_{\text{now}}$) into standalone, portable formats:
1. **Canonical JSON Attestation Bundle**: A machine-readable, deterministically serialized JSON envelope with an embedded SHA-256 integrity fingerprint (`exportBundleDigest`) for offline verification.
2. **Browser-Printable Attestation Report**: A human-readable HTML document formatted with responsive `@media print` CSS rules, enabling native browser "Print" and "Save as PDF" workflows without server-side headless browser runtimes.

This allows organizations to share verifiable attestation evidence with external auditors without granting them interactive accounts or modifying authoritative backend state.

---

## B. Existing Authorities

CAND-01 is strictly a **derived presentation projection**. It creates **zero new governance authorities, zero new database collections, and zero new lifecycle states**. Every exported field maps to an existing authoritative service:

| Exported Data Element | Authoritative Backend Source | Function / Model Reference |
| :--- | :--- | :--- |
| **Release Certificate & Snapshot ($T_{\text{cert}}$)** | Phase 27 System Release Certificate Service | `SystemReleaseCertificate` model, `getReleaseCertificateDetails()` |
| **Certificate Snapshot Hash ($T_{\text{cert}}$)** | Phase 27 Hash Calculation | `computeCertificateHash()` (`system-release-certificate.service.ts`) |
| **Supersession Lineage & History ($T_{\text{cert}}$)** | Phase 28 System Release Lineage Service | `getCertificateLineageGraph()` (`system-release-lineage.service.ts`) |
| **Post-Certification Compliance Drift ($T_{\text{now}}$)** | Phase 29 System Release Drift Service | `auditReleaseCertificateComplianceDrift()` (`system-release-drift.service.ts`) |
| **ACL & Graph Privacy Isolation** | Phase 14 Project Topology Service | `checkUserProjectReadAccess()` (`project-topology.service.ts`) |

---

## C. Export Contract & Field Mapping

### Field Mapping & Context Taxonomy

| Field Name | Type | Source Authority | Temporal Context | Included in Digest? |
| :--- | :--- | :--- | :--- | :--- |
| `exportSchemaVersion` | `string` ("1.0") | Export Engine | Metadata | **YES** |
| `exportMetadata.generatedAt` | `string` (ISO-8601) | System Time | Current ($T_{\text{now}}$) | **YES** |
| `exportMetadata.generatedByUserId` | `string` | Auth Session (`req.user`) | Current ($T_{\text{now}}$) | **YES** |
| `exportMetadata.generatedByUserName` | `string` | User Model | Current ($T_{\text{now}}$) | **YES** |
| `exportMetadata.exportBundleDigest` | `string` (SHA-256) | Export Engine | Integrity Fingerprint | **NO** (Set after digest calculation) |
| `releaseCertificate.certificateId` | `string` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.rootProjectId` | `string` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.rootProjectName` | `string` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.releaseTag` | `string` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.certificateVersion` | `number` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.certificateStatus` | `string` (`ACTIVE`/`REVOKED`/`SUPERSEDED`) | Phase 27/28 Service | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.systemReleaseStatus` | `string` (`PASSED`/`PASSED_WITH_WAIVER`) | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.certificateHash` | `string` (SHA-256) | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.certifiedByUserId` | `string` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.certifiedAt` | `string` (ISO-8601) | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.lifecycleEvents` | `Array<ILifecycleEvent>` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `releaseCertificate.snapshot` | `ISystemReleaseSnapshot` | Phase 27 Model | Historical ($T_{\text{cert}}$) | **YES** |
| `complianceDriftAudit.auditTimestamp` | `string` (ISO-8601) | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.complianceStatus` | `string` (`FULLY_COMPLIANT`/etc.) | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.complianceReason` | `string` (Optional) | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.matchesCertifiedState` | `boolean` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.isIntegrityVerified` | `boolean` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.varianceSummary` | `object` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.varianceExplanations` | `Array<string>` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.topologyDeltas` | `object` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.baselineDeltas` | `Array<object>` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.contractDeltas` | `Array<object>` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.waiverDeltas` | `Array<object>` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |
| `complianceDriftAudit.attestationDeltas` | `Array<object>` | Phase 29 Service | Current ($T_{\text{now}}$) | **YES** |

### TypeScript Envelope DTO (`SystemReleaseExportBundleDTO`)

```typescript
export interface SystemReleaseExportBundleDTO {
  exportSchemaVersion: '1.0';
  exportMetadata: {
    generatedAt: string; // ISO-8601 UTC string (T_now)
    generatedByUserId: string;
    generatedByUserName: string;
    exportBundleDigest: string; // SHA-256 hex string computed over canonicalized payload
  };
  releaseCertificate: {
    certificateId: string;
    rootProjectId: string;
    rootProjectName: string;
    releaseTag: string;
    certificateVersion: number;
    certificateStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
    systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
    certificateHash: string; // SHA-256 snapshot hash frozen at T_cert
    certifiedByUserId: string;
    certifiedAt: string; // ISO-8601 UTC string (T_cert)
    notes?: string;
    supersedesCertificateId?: string;
    supersededByCertificateId?: string;
    lifecycleEvents: Array<{
      eventType: 'ISSUED' | 'REVOKED';
      performedByUserId: string;
      timestamp: string;
      reason?: string;
    }>;
    snapshot: ISystemReleaseSnapshot; // Frozen snapshot at T_cert
  };
  complianceDriftAudit: {
    auditTimestamp: string; // ISO-8601 UTC string (T_now)
    complianceStatus: 'FULLY_COMPLIANT' | 'COMPLIANT_WITH_EXCEPTIONS' | 'NON_COMPLIANT_DRIFT' | 'INDETERMINATE_EVIDENCE';
    complianceReason?: string;
    matchesCertifiedState: boolean;
    isIntegrityVerified: boolean;
    varianceSummary: {
      topologyVarianceCount: number;
      baselineVarianceCount: number;
      contractVarianceCount: number;
      waiverVarianceCount: number;
      attestationVarianceCount: number;
    };
    varianceExplanations: string[];
    nextReviewConsiderations: string[];
    topologyDeltas: {
      addedNodes: Array<{ projectId: string; projectName: string }>;
      removedNodes: Array<{ projectId: string; projectName: string }>;
      addedEdges: Array<{ sourceProjectId: string; targetProjectId: string; linkType: string }>;
      removedEdges: Array<{ sourceProjectId: string; targetProjectId: string; linkType: string }>;
    };
    baselineDeltas: Array<{
      projectId: string;
      projectName: string;
      certifiedBaselineId: string;
      liveBaselineId: string;
      deltaType: 'UNCHANGED' | 'UPDATED' | 'REMOVED' | 'MISSING_LIVE';
    }>;
    contractDeltas: Array<{
      projectId: string;
      endpointPath: string;
      httpMethod: string;
      deltaType: 'ENDPOINT_ADDED' | 'ENDPOINT_REMOVED' | 'ENDPOINT_DEPRECATED' | 'FIELD_REMOVED' | 'FIELD_TYPE_CHANGED' | 'FIELD_REQUIREDNESS_CHANGED' | 'ENUM_VALUE_REMOVED';
      severity: 'BREAKING' | 'NON_BREAKING';
      description: string;
    }>;
    waiverDeltas: Array<{
      waiverId: string;
      targetProviderProjectId: string;
      deltaType: 'CARRIED_FORWARD' | 'EXPIRED' | 'REVOKED' | 'NEWLY_REQUIRED';
    }>;
    attestationDeltas: Array<{
      attestationId: string;
      packageId: string;
      deltaType: 'EVIDENCE_UNCHANGED' | 'EVIDENCE_REVOKED' | 'EVIDENCE_SUPERSEDED';
    }>;
  };
}
```

### Deterministic Canonicalization Rules
1. **Recursive Key Sorting**: All object keys are sorted recursively in alphabetical order (ignoring keys with `undefined` values).
2. **Array Order Preservation**: Array element order is preserved as returned by authoritative Phase 27/29 services (which pre-sort elements by primary IDs).
3. **Timestamp Normalization**: All timestamps are formatted as standard UTC ISO-8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
4. **Undefined & Null Handling**: Properties with `undefined` values are omitted; explicit `null` values are preserved.
5. **Numeric & String Normalization**: Numbers formatted in standard decimal notation without trailing zero padding; strings encoded in UTF-8.

---

## D. Integrity Digest Boundary & Terminology

### Digest Computation Pipeline

```text
+-----------------------------------------------------------------+
|                  SystemReleaseExportBundleDTO                   |
|       (Payload object WITHOUT exportBundleDigest field)         |
+-----------------------------------------------------------------+
                                |
                                v
               Deterministic Canonicalization
             (Recursive key sorting, UTF-8 string)
                                |
                                v
                   UTF-8 String Byte Stream
                                |
                                v
                    SHA-256 Digest Engine
                                |
                                v
       exportMetadata.exportBundleDigest (64-char hex string)
```

### Unambiguous Digest Rules
- The `exportBundleDigest` is computed **exclusively over the payload structure excluding the `exportBundleDigest` field itself**. This prevents self-referential hash recursion.
- **Terminology**: The digest is referred to strictly as an **integrity fingerprint** or **deterministic SHA-256 digest**.
- **What it proves**: Proves that the exported JSON file content has not been altered, edited, or corrupted since export generation.
- **What it does NOT prove**: An unsigned SHA-256 digest does **not** prove PKI authenticity or digital signature without asymmetric key infrastructure. Digital signatures, private keys, public keys, and Certificate Authorities remain strictly **OUT OF SCOPE**.

### Server `/verify-bundle` Review & Removal
- **Review Finding**: A server-side `/verify-bundle` endpoint provides **no distinct product value** beyond what an auditor can execute offline using standard tools (Node.js script, Python `hashlib`, OpenSSL CLI). Adding a server verification endpoint creates unnecessary API surface and can mislead users into assuming server-side signing.
- **Action**: Server-side `/verify-bundle` endpoint is **REMOVED** from the API plan. Offline verification instructions and an example standalone Node.js script are provided in documentation.

---

## E. Authorization Model

1. **Session Authentication**: Endpoint access requires valid user JWT session (`authenticate` middleware).
2. **Server-Side ACL Enforcement**:
   - The handler extracts `req.user.userId` and `req.user.role`.
   - Before building the export payload, `checkUserProjectReadAccess(userId, rootProjectId)` is executed for the root project.
   - For connected topology projects, Phase 14 ACL graph isolation (`authIdSet`) prunes any project, baseline, waiver, or attestation node that the user lacks authorization to view.
3. **Cross-Project Isolation**: Non-member projects in multi-tenant environments are completely hidden from the export payload, preventing information leakage.

---

## F. Sensitive-Data Model

### Allowed Fields
- Root project name & key.
- Release tag & certificate version.
- Certified timestamp & certified system release status.
- SHA-256 certificate snapshot hash (`certificateHash`).
- Topology project names, edge link types, and baseline version tags.
- Structural OpenAPI diff descriptions & breaking change classifications.
- Waiver scope & expiration timestamps.
- Audit timestamp & compliance drift status.

### Explicitly Prohibited Fields
- ❌ User password hashes or salt strings.
- ❌ JWT tokens, refresh token strings, or session IDs.
- ❌ Webhook HMAC signing secrets or API credentials.
- ❌ MongoDB internal fields (`__v`, raw `_doc` metadata).
- ❌ Personal phone numbers, home addresses, or unneeded user PII.
- ❌ Metadata from unauthorized connected projects.

---

## G. Historical-State Model

The export bundle preserves the strict distinction between **historical frozen state** ($T_{\text{cert}}$) and **live current state** ($T_{\text{now}}$):

```text
                     +---------------------------------------+
                     |        Release Certificate Snapshot   |
                     |         (Frozen at T_cert)            |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         Live System Audit             |
                     |         (Evaluated at T_now)          |
                     +---------------------------------------+
                                         |
                                         v
+-------------------------------------------------------------------------+
|                      Post-Certification Compliance Drift                 |
|  - Fully Compliant: Live state matches snapshot                          |
|  - Compliant with Exceptions: Active waivers cover live variance        |
|  - Non-Compliant Drift: Unwaived variance or breaking contract change   |
|  - Indeterminate: Related project evidence removed/missing             |
+-------------------------------------------------------------------------+
```

The export bundle includes both sections explicitly with clear temporal labels, ensuring auditors never confuse historical certified snapshots with current live state.

---

## H. Browser-Printable Report

The printable report (`/projects/:projectId/release-certificates/:certificateId/print`) is a dedicated React view optimized for browser printing:

### Layout Structure
1. **Header & Title**: System Release Attestation Certificate with Documan branding and document title.
2. **Attestation Summary Box**: Release Tag, System Release Status badge (`PASSED` / `PASSED_WITH_WAIVER`), Certified Date ($T_{\text{cert}}$), Certified By, and SHA-256 Certificate Hash.
3. **Compliance Drift Status Banner**: Compliance Status (`FULLY_COMPLIANT`, `COMPLIANT_WITH_EXCEPTIONS`, etc.), Audit Timestamp ($T_{\text{now}}$), and Match Status.
4. **Topology & Baseline Evidence Grid**: Compact table listing connected project nodes, active baselines, and contract version tags as recorded at $T_{\text{cert}}$.
5. **Variance & Drift Details Table**: Detailed breakdown of live topology deltas, breaking contract changes, waiver expirations, and attestation status at $T_{\text{now}}$.
6. **Footer & Verification Block**: Export Metadata, `exportBundleDigest` fingerprint, UTC generation timestamp, and offline verification instructions.

### `@media print` Styling Rules
- Page break optimization (`page-break-inside: avoid` on tables and card blocks).
- High-contrast black/white typography with clean borders for crisp PDF generation.
- Navigation bar, buttons, and sidebars hidden (`display: none` under `@media print`).
- Browser workflow: User clicks "Print Report" -> Browser print dialog opens -> User selects "Save as PDF" or prints directly. (NO server-side headless Chrome / Puppeteer).

---

## I. API Design

### JSON Export Bundle Endpoint
- **HTTP Method**: `POST`
- **Path**: `/api/v1/projects/:projectId/release-certificates/:certificateId/export/json`
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: application/json`
- **Response Headers**:
  - `Content-Type: application/json; charset=utf-8`
  - `Content-Disposition: attachment; filename="release-certificate-<releaseTag>-attestation-bundle.json"`
- **HTTP Status Codes**:
  - `200 OK`: Success (returns `SystemReleaseExportBundleDTO`).
  - `401 Unauthorized`: Missing or invalid session token.
  - `403 Forbidden`: User lacks read access to root project.
  - `404 Not Found`: Release certificate does not exist.

*(Note: Server-side `/verify-bundle` endpoint is removed to avoid unnecessary API surface. Offline verification instructions are documented for external execution).*

---

## J. Frontend Design

1. **Export Action Buttons**: Added to [`ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/ReleaseCertificateComplianceAuditView.tsx) header bar.
   - Button 1: "Download JSON Attestation Bundle" (triggers browser blob download).
   - Button 2: "Print Attestation Report (PDF)" (opens `/projects/:projectId/release-certificates/:certificateId/print` in new tab and calls `window.print()`).
2. **Loading & Disabled States**: Button displays animated spinner during bundle assembly; disabled if certificate is loading or request fails.
3. **Accessibility & Keyboard Navigation**: Full `aria-label`, keyboard `Enter`/`Space` activation, focus visible indicators.

---

## K. Incremental Implementation Batches

### Batch 1: Existing-Authority Integration & Read-Only Export Service
- Create `apps/api/src/modules/governance/system-release-export.service.ts`.
- Implement `canonicalizeExportPayload()` and `computeExportBundleDigest()`.
- Assemble `SystemReleaseExportBundleDTO` by combining Phase 27 (`getReleaseCertificateDetails`), Phase 28, and Phase 29 (`auditReleaseCertificateComplianceDrift`) service outputs.
- Write unit tests for canonical serialization, digest stability, and `exportBundleDigest` computation (`system-release-export.test.ts`).

### Batch 2: Authorization, REST API Endpoint & Security Verification
- Register `POST /projects/:projectId/release-certificates/:certificateId/export/json` in [`system-release-certificate.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.routes.ts).
- Implement controller handler in [`system-release-certificate.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.controller.ts) with `checkUserProjectReadAccess` authorization and ACL graph pruning.
- Write API integration tests covering 200 OK download headers, 403 Forbidden isolation, sensitive field exclusion, and malformed ID handling.

### Batch 3: Frontend Export UX & Browser-Printable Report View
- Add `exportReleaseCertificateJson()` in [`governance.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/governance.api.ts).
- Implement `ReleaseCertificatePrintPage.tsx` with responsive `@media print` CSS layout.
- Add "Export JSON" and "Print Report" action buttons to [`ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/ReleaseCertificateComplianceAuditView.tsx).
- Add route `/projects/:projectId/release-certificates/:certificateId/print` in [`App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx).

### Batch 4: End-to-End Verification & Documentation
- Document offline verification procedures and script in `docs/OPERATIONS.md`.
- Run full automated verification suite (`typecheck`, `lint`, `test`, `build`, `git diff --check`).
- Perform manual browser QA verification of download and print flows.

---

## L. Automated Verification

### Standard Verification Suite
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
git diff --check
```

### Focused Test Specifications
1. **Canonicalization Test**: Verify identical JSON strings generated regardless of object key insertion order.
2. **Digest Stability Test**: Verify `computeExportBundleDigest()` generates exact same SHA-256 hash across executions.
3. **Digest Exclusion Test**: Verify `exportBundleDigest` is computed over payload excluding the `exportBundleDigest` field.
4. **Authorization Test**: Non-member project user receives 403 Forbidden on export endpoint.
5. **ACL Isolation Test**: Verify unauthorized connected project nodes are omitted from export snapshot.
6. **Sensitive-Field Exclusion Test**: Assert `password`, `secret`, and `token` fields do not exist in export JSON.
7. **HTTP Response Header Test**: Verify `Content-Type: application/json` and `Content-Disposition: attachment`.
8. **Missing Evidence Test**: Verify deleted connected projects produce `INDETERMINATE_EVIDENCE` variance without throwing exceptions.
9. **Revoked Certificate Test**: Verify revoked certificates include revocation event details in export bundle.

---

## M. Manual QA Protocols (Execution Scenarios)

- **Scenario 1: JSON Bundle Download**: Navigate to Certificate Compliance view -> Click "Download JSON Attestation Bundle" -> Verify `.json` file downloads with correct headers.
- **Scenario 2: Browser PDF Print**: Click "Print Attestation Report (PDF)" -> Verify printable view opens -> Select "Save as PDF" in browser print dialog -> Verify formatted report output.
- **Scenario 3: Offline Integrity Verification**: Execute standalone Node.js verification script on downloaded JSON file -> Verify digest match.
- **Scenario 4: Multi-Tenant Access Denial**: Attempt to download release certificate export for unauthorized project -> Verify 403 Forbidden block.

---

## N. Performance Guarantees & Bounds

- **Query Optimization**: Reuses single-pass queries from Phase 27/29 services; zero N+1 database queries.
- **Bounded Inputs**: Enforces bounded graph sizes (`MAX_TOPOLOGY_PROJECTS = 50`, `MAX_CONTRACT_DIFF_BASELINES = 30`).
- **Memory Safety**: Serialization operates on bounded in-memory JavaScript objects without buffer overflow risks.

---

## O. Security Review

- **IDOR / BOLA Prevention**: Root project ownership/read access verified via `checkUserProjectReadAccess()` on every request.
- **Multi-Tenant Privacy**: Graph node pruning prevents non-member users from discovering unauthorized connected project names.
- **Header Safety**: `Content-Disposition` header filenames sanitized to prevent HTTP header injection.
- **Unauthenticated Blocking**: `authenticate` middleware rejects unauthenticated requests with 401 Unauthorized.

---

## P. Out of Scope

- ❌ Digital signatures, asymmetric keys, or Public Key Infrastructure (PKI).
- ❌ Implementation work for CAND-02, CAND-03, CAND-04, CAND-05, CAND-06, or CAND-07.
- ❌ Server-side `/verify-bundle` API endpoint.
- ❌ New release gate authority or modification to Phase 10/19 release criteria.
- ❌ New database collections or Mongoose models (`Persistence = 0`).
- ❌ Server-side headless browser runtimes (Puppeteer, Playwright).
- ❌ CI/CD deployment execution, API testing, or task management.
- ❌ Phase 33 or roadmap reopening.

---

## Q. File-Level Implementation Map

### Files to Modify
- [`apps/api/src/modules/governance/system-release-certificate.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.controller.ts)
- [`apps/api/src/modules/governance/system-release-certificate.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-certificate.routes.ts)
- [`apps/web/src/features/governance/governance.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/governance.api.ts)
- [`apps/web/src/features/governance/components/ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/ReleaseCertificateComplianceAuditView.tsx)
- [`apps/web/src/App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx)
- [`docs/OPERATIONS.md`](file:///c:/MERN_STACK/Documan/documan/docs/OPERATIONS.md)

### New Files to Create
- `apps/api/src/modules/governance/system-release-export.service.ts`
- `apps/api/src/modules/governance/system-release-export.test.ts`
- `apps/web/src/pages/ReleaseCertificatePrintPage.tsx`

---

## R. Test Strategy

| Test Requirement | Test File | Test Method / Case |
| :--- | :--- | :--- |
| **Canonical JSON Serialization** | `system-release-export.test.ts` | `should recursively sort keys and format UTC timestamps` |
| **Digest Integrity Computation** | `system-release-export.test.ts` | `should produce stable SHA-256 hash for identical payloads` |
| **Digest Exclusion** | `system-release-export.test.ts` | `should compute exportBundleDigest over payload excluding digest field` |
| **Export Endpoint Authorization** | `system-release-certificate.controller.test.ts` | `should return 403 Forbidden when user lacks project read access` |
| **ACL Graph Node Pruning** | `system-release-export.test.ts` | `should omit unauthorized connected project nodes from export` |
| **Sensitive Field Exclusion** | `system-release-export.test.ts` | `should not contain password or token properties in export object` |

---

## S. Rollback Strategy

Because CAND-01 is a pure read-only projection with `Persistence = 0`:
- **Reversion**: Reverting the CAND-01 commit removes the export service, route, and printable view cleanly.
- **Zero Database Impact**: No database migrations, schema rollbacks, or data cleanup procedures are required. Existing Phase 27/28/29 release certificate data remains completely intact.

---

## T. Final GO/NO-GO

- **Implementation-Ready**: **YES**
- **Explicit Assumptions**:
  1. Offline verification is conducted using standard SHA-256 tools (Node.js/Python/OpenSSL) on the canonical JSON payload.
  2. Browsers used for printing support CSS `@media print` standards.
