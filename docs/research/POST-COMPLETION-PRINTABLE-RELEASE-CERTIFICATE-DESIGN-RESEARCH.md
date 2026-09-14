# POST-COMPLETION PRINTABLE RELEASE CERTIFICATE DESIGN RESEARCH

**Domain:** 19 — Printable Release Certificate  
**Repository:** Documan (`apps/api`, `apps/web`)  
**Status:** Complete Repository Analysis & Stitch Design Foundation  
**Deliverable File:** `docs/research/POST-COMPLETION-PRINTABLE-RELEASE-CERTIFICATE-DESIGN-RESEARCH.md`

---

## 1. AUTHORITATIVE IMPLEMENTATION LOCATION

### A. Authoritative Source Files & Component Tree

#### Frontend (`apps/web/src/pages/` & `apps/web/src/features/governance/`)
- **Printable Certificate Page:**
  - Component: [`ReleaseCertificatePrintPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/ReleaseCertificatePrintPage.tsx)
  - Purpose: Standalone printable page designed specifically for paper output and browser "Save as PDF". Renders certified release identity ($T_{cert}$), post-certification compliance drift audit ($T_{now}$), baseline contracts grid, and SHA-256 fingerprint.
- **Route Definition & Shell Exemption:**
  - File: [`App.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/App.tsx) (Route line 91: `<Route path="/projects/:projectId/release-certificates/:certificateId/print" element={<ReleaseCertificatePrintPage />} />`)
  - Purpose: Mounted as a protected route **OUTSIDE** `AppLayout` so the printable document is clean and unencumbered by sidebar navigation or application shell headers.
- **Print Trigger Source:**
  - Component: [`ReleaseCertificateComplianceAuditView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/ReleaseCertificateComplianceAuditView.tsx)
  - Purpose: Invokes `window.open('/projects/:projectId/release-certificates/:certificateId/print', '_blank')` via the "🖨 Print Report" button.
- **API Client:**
  - API: [`governance.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/governance.api.ts) (`exportReleaseCertificateJson` & `auditReleaseCertificateComplianceDrift`)

#### Backend (`apps/api/src/modules/governance/`)
- **JSON Export Controller & Service (CAND-01 Integration):**
  - Service: [`system-release-export.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-export.service.ts)
  - Controller: [`system-release-export.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-export.controller.ts)
  - Route: `POST /api/v1/projects/:projectId/release-certificates/:certificateId/export/json`
- **Compliance Drift Audit Service:**
  - Service: [`system-release-drift.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-drift.service.ts)
  - Route: `POST /api/v1/release-certificates/compliance-drift-audit`

---

## 2. ROUTE & NAVIGATION ARCHITECTURE

- **Browser Route:** `/projects/:projectId/release-certificates/:certificateId/print`
- **Navigation Behavior:** Opened in a new browser tab (`_blank`) from `ReleaseCertificateComplianceAuditView.tsx`.
- **Authentication & Authorization:** Protected by `ProtectedRoute`. Requires a valid user JWT token and project read access (`checkUserProjectReadAccess`).
- **Toolbar & Actions:** Includes top screen toolbar with "← Back to Project Governance" link and "🖨 Print / Save as PDF" button (`onClick={() => window.print()}`).
- **Print-Hide Mechanism:** The toolbar is marked with Tailwind class `print:hidden` so screen controls never appear on paper or generated PDF files.

---

## 3. PRINT PAGE COMPONENT STRUCTURE

`ReleaseCertificatePrintPage.tsx` renders a structured document organized into four authoritative sections:

```
[Screen Toolbar: Back Link | Print / Save as PDF Button] (Hidden via print:hidden)

[Printable Certificate Document Container] (print:bg-white print:text-black print:p-0 print:border-none)
  ├── Document Header
  │     ├── Branding: "Documan • System Release Attestation Certificate"
  │     ├── Project Name & Release Tag (e.g., "v1.4.0 (v1)")
  │     └── Status Badges: System Release Status (PASSED) & Certificate Status (ACTIVE)
  │
  ├── Section 1: Certified Baseline Identity (Frozen Context: T_cert)
  │     ├── Certified Timestamp & Certified By User ID
  │     ├── Total Active Baselines Count & Active Waivers Count
  │     └── Phase 27 Certificate Snapshot SHA-256 Hash Box (Full 64-char hex digest)
  │
  ├── Section 2: Post-Certification Compliance Drift Audit (Live Context: T_now)
  │     ├── Audit Timestamp & Live Compliance Status
  │     └── 5 Variance Summary Cards (Topology, Baseline, Contract, Waiver, Attestation deltas)
  │
  ├── Section 3: Certified Baseline Contracts Grid (T_cert Snapshot Table)
  │     └── Table: Project Name | Version Tag | Baseline ID | Document Snapshots Count
  │
  └── Section 4: Export Integrity Fingerprint & Document Footer
        ├── Export Bundle SHA-256 Digest (Full 64-char hex string)
        ├── Generation Metadata (Timestamp, User Name, User ID)
        └── Deterministic Checksum & Compliance Disclaimer Text
```

---

## 4. CERTIFICATE FIELDS RENDERED IN PRINT

| Certificate Field | Rendered Location | Display & Label Format |
| :--- | :--- | :--- |
| `rootProjectName` | Header | Prominent `<h1>` title |
| `releaseTag` | Header | Mono font tag (e.g. `v1.4.0`) |
| `certificateVersion` | Header | Version badge (e.g. `v1`) |
| `systemReleaseStatus` | Header Badge | Upper-case status pill (`PASSED` / `PASSED_WITH_WAIVER`) |
| `certificateStatus` | Header Subtext | Upper-case status (`ACTIVE` / `REVOKED`) |
| `certifiedAt` | Section 1 Grid | Formatted locale timestamp |
| `certifiedByUserId` | Section 1 Grid | Raw User ObjectId string |
| `certificateHash` | Section 1 Box | Full SHA-256 hex string with `break-all` wrapping |
| `snapshot.activeBaselines` | Section 1 & Section 3 | Total count in Section 1; detailed table rows in Section 3 |
| `snapshot.activeWaivers` | Section 1 Grid | Total active waivers count |
| `complianceDriftAudit` | Section 2 | Live audit timestamp ($T_{now}$) and 5 variance deltas |
| `exportMetadata.exportBundleDigest`| Section 4 Footer | Full SHA-256 bundle digest |

---

## 5. FROZEN SNAPSHOT ($T_{cert}$) VS. LIVE CONTEXT ($T_{now}$)

The printable certificate explicitly distinguishes baseline certification evidence from live audit findings:

- **$T_{cert}$ (Frozen Baseline Identity):** Rendered in Section 1 and Section 3. Displays baseline snapshots, active waiver counts, and SHA-256 certificate hashes frozen at certification time.
- **$T_{now}$ (Post-Certification Compliance Drift Audit):** Rendered in Section 2. Evaluates live system state against $T_{cert}$ to display compliance status (`FULLY_COMPLIANT`, `NON_COMPLIANT_DRIFT`) and variance counts at print time.
- **$T_{predicted}$ (Simulated What-If State):** **NOT PRESENT**. Domain 17 owns simulation. Printable certificates contain strictly historical and live audit evidence.

---

## 6. CERTIFICATE HASH & INTEGRITY PRESENTATION

- **Display Format:** Full 64-character SHA-256 hex string displayed in monospace font.
- **Word Wrapping:** Styled with `break-all` CSS property so long hashes never overflow page bounds or break paper margins.
- **Verification Integrity:** Section 4 footer explicitly states:
  > *"This printable attestation report represents a read-only presentation of Documan Phase 27 certificate snapshot data and Phase 29 compliance drift analysis. The SHA-256 digest serves as a deterministic checksum over canonical export payload data."*
- **No PKI Claims:** Does not claim X.509 PKI signatures or Certificate Authority key validation.

---

## 7. PRINT CSS & MEDIA QUERY SPECIFICATION

`ReleaseCertificatePrintPage.tsx` uses Tailwind CSS `@media print` utility variants:
- **Background & Text:** `print:bg-white print:text-black` (converts screen dark mode `#0f172a` to crisp white paper background with black text).
- **Page Container:** `print:p-0 print:border-none print:shadow-none` (removes card borders, drop shadows, and outer screen padding).
- **Dividers & Borders:** `print:border-slate-300` (ensures subtle dark borders render cleanly on paper).
- **Toolbar & Navigation:** `print:hidden` (hides print button and back link during printing).

---

## 8. PDF GENERATION & BROWSER PRINT MECHANISM

- **Mechanism:** Native browser print API via `window.print()`.
- **PDF Creation:** Users generate PDF files by selecting "Save as PDF" in their browser's native print dialog.
- **No Server-Side PDF Library:** Does not require Puppeteer, Playwright, or server PDF rendering tools.
- **Page Target:** Optimized for A4 and US Letter page dimensions.

---

## 9. DOMAIN BOUNDARIES & COMPARISON

| Feature Area | Domain 18 (Release Lineage) | CAND-01 (Export Bundle) | Domain 19 (Printable Certificate) |
| :--- | :--- | :--- | :--- |
| **Primary Output** | Interactive lineage graph & comparison workbench | JSON export payload API (`export/json`) | Paper printout / PDF via browser print |
| **Purpose** | Historical certificate diffing & trajectory analysis | Portable machine-readable audit package | Human-readable document attestation report |
| **Data Engine** | Supersession chain traversal | Canonical JSON serializer & SHA-256 digest | Consumes CAND-01 export bundle & drift API |
| **Shell UI** | Mounted inside project governance tabs | Headless API endpoint | Standalone route outside `AppLayout` |

> [!IMPORTANT]
> **Domain 19 Boundary:** Domain 19 is strictly a **printable presentation layer**. It does **NOT** issue certificates, revoke certificates, calculate lineage graphs, or generate JSON export packages.

---

## 10. AUTHORITY MAP

| Printable Report Section | Authoritative Source Entity | Source Domain |
| :--- | :--- | :--- |
| **Release Certificate Metadata** | `SystemReleaseCertificate` | Domain 18 |
| **Frozen Snapshot ($T_{cert}$)** | `ISystemReleaseSnapshot` | Domain 18 |
| **Compliance Drift Audit ($T_{now}$)** | `ReleaseCertificateComplianceAuditDTO` | System Release Drift Service |
| **Export Bundle Digest** | `exportMetadata.exportBundleDigest` | CAND-01 Export Engine |
| **Print Styling & Layout** | `@media print` CSS Tailwind | **Domain 19** |

---

## 11. PROPOSED STITCH DESIGN ARCHITECTURE

The high-fidelity Stitch design for Domain 19 will focus on a 5-part printable document architecture:

1. **19.00 Print Toolbar & Screen Preview** — Top toolbar with "Back to Governance" link, "Print / Save as PDF" button, and dark-mode screen preview.
2. **19.01 Document Header & Release Status Badge** — Documan branding, root project title, release tag (`v1.4.0`), certificate version (`v1`), and release status badge.
3. **19.02 Certified Baseline Identity Panel ($T_{cert}$)** — Certified timestamp, certifier user ID, baseline/waiver count grid, and full SHA-256 certificate hash box.
4. **19.03 Post-Certification Compliance Audit Section ($T_{now}$)** — Live audit timestamp, compliance status badge, and 5 variance summary cards.
5. **19.04 Certified Baseline Contracts Grid & Footer** — Project baseline contract table, bundle SHA-256 digest, generation timestamp, and compliance disclaimer.

---

## 12. ANTI-HALLUCINATION DESIGN RULES

When building the Stitch UI for Domain 19, designers must **NOT**:
- Invent fake X.509 PKI certificate badges or digital signature seals.
- Add fake legal compliance logos (SOC2, ISO27001, GDPR).
- Include interactive dashboard controls, tabs, or simulation widgets inside the printable document body.
- Introduce `[T_predicted]` simulation overlays.
- Invent fake executive titles ("Chief Security Officer") for `certifiedByUserId`.

---

## 13. FINAL RESEARCH ASSESSMENT

### A. Verified Printable Route
- `/projects/:projectId/release-certificates/:certificateId/print` (Mounted in `App.tsx` outside `AppLayout`).

### B. Verified Frontend Implementation
- `ReleaseCertificatePrintPage.tsx` using Tailwind `@media print` rules.

### C. Verified Backend Data Sources
- `POST /api/v1/projects/:projectId/release-certificates/:certificateId/export/json` (CAND-01 Export) & `POST /api/v1/release-certificates/compliance-drift-audit`.

### D. Verified Certificate Fields
- `rootProjectName`, `releaseTag`, `certificateVersion`, `certificateStatus`, `systemReleaseStatus`, `certifiedAt`, `certifiedByUserId`, `certificateHash`.

### E. Verified Snapshot Evidence
- `activeBaselines`, `activeWaivers`, baseline counts, document snapshot counts.

### F. Verified Hash Representation
- Full 64-char SHA-256 hex string with `break-all` CSS wrapping.

### G. Verified Lineage Representation
- Release tag & certificate version summary.

### H. Verified Attestation & Waiver Representation
- Variance summary cards and active waiver counts.

### I. Verified Print CSS
- Tailwind `print:bg-white`, `print:text-black`, `print:hidden`, `print:border-slate-300`.

### J. Verified PDF/Browser Print Mechanism
- `window.print()` triggering browser's native print/PDF save dialog.

### K. Verified ACL Behavior
- `ProtectedRoute` requiring authenticated user with project read access.

### L. Domain Boundaries
- Presentation layer only; does not issue certs, calculate lineage, or run what-if simulations.

### M. Recommended Stitch Architecture
- 5-part printable document layout (19.00 through 19.04).

### N. Open Questions
- None. Full repository implementation verified.

### O. Final Readiness Assessment
**READY FOR STITCH DESIGN**
