# POST-COMPLETION SYSTEM TOPOLOGY SIMULATION SANDBOX & DRIFT ASSESSOR DESIGN RESEARCH

**Domain:** 17 — System Topology Simulation Sandbox & Drift Assessor  
**Repository:** Documan (`apps/api`, `apps/web`)  
**Status:** Complete Repository Analysis & Stitch Design Foundation  
**Deliverable File:** `docs/research/POST-COMPLETION-SYSTEM-TOPOLOGY-SIMULATION-DRIFT-DESIGN-RESEARCH.md`

---

## 1. AUTHORITATIVE IMPLEMENTATION LOCATION

### A. Authoritative Source Files & Component Tree

#### Frontend (`apps/web/src/features/governance/`)
- **Simulation Sandbox Component:**
  - Component: [`SystemTopologySimulationSandbox.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemTopologySimulationSandbox.tsx)
  - Purpose: Renders the "What-If Simulation Sandbox" UI enabling in-memory overlay creation (proposed baselines, hypothetical attestations, candidate policy waivers, proposed topology links ADD/REMOVE) and displays side-by-side current vs. simulated release gate comparisons.
- **Parent Governance Gate View:**
  - Component: [`SystemGovernanceGateSection.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx)
  - Purpose: Embeds the simulation sandbox, displays cross-project dependency blockers, active governance waivers roster, and root local gate freshness metrics.
- **API Client & Type Definitions:**
  - Simulation Types: [`system-topology-simulation.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-topology-simulation.types.ts)
  - Simulation API: [`system-topology-simulation.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-topology-simulation.api.ts)
  - Governance Gate Types: [`system-topology-governance-gate.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-topology-governance-gate.types.ts)
  - Governance Gate API: [`system-topology-governance-gate.api.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/system-topology-governance-gate.api.ts)

#### Backend (`apps/api/src/modules/`)
- **System Topology Simulation Service & Types:**
  - Service: [`system-topology-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-simulation.service.ts)
  - Types: [`system-topology-simulation.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-simulation.types.ts)
  - Controller: [`system-topology-simulation.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-simulation.controller.ts)
  - Routes: [`system-topology-simulation.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-simulation.routes.ts)
  - Schema Validator: [`system-topology-simulation.schema.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-simulation.schema.ts)
- **System Topology Governance Gate Service & Types:**
  - Service: [`system-topology-governance-gate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts)
  - Types: [`system-topology-governance-gate.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.types.ts)
- **Drift Calculator Service:**
  - Service: [`drift-calculator.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/drift-calculator.service.ts)
  - Service: [`system-release-drift.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-release-drift.service.ts)
- **Project Topology Link Model & Service:**
  - Model: [`project-topology.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.model.ts)
  - Service: [`project-topology.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.service.ts)
  - Schema Validator: [`project-topology.schema.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.schema.ts)

### B. Routing & Navigation Boundaries
- **Route Kind:** Embedded section inside Governance Gate view & Project Workspace tab.
- **Frontend URL Path:** Accessible via Governance dashboard tab `/governance?tab=governance-gate` or inside project workspace `/projects/:projectId?tab=governance-gate`.
- **HTTP API Routes:**
  - `POST /api/v1/projects/:projectId/system-topology-gate/simulate` — Runs in-memory what-if scenario simulation.
  - `GET /api/v1/projects/:projectId/system-topology-gate` — Fetches current authoritative system release gate evaluation.
  - `POST /api/v1/projects/:projectId/system-topology-gate/waivers` — Grants active governance waiver.
  - `DELETE /api/v1/projects/:projectId/system-topology-gate/waivers/:waiverId` — Revokes active governance waiver.
  - `GET /api/v1/projects/:projectId/topology` — Lists authoritative persisted inter-project topology links.
  - `POST /api/v1/projects/:projectId/topology` — Creates persisted inter-project topology link.

---

## 2. DEFINITION OF "SYSTEM TOPOLOGY"

In Documan, **System Topology** is **NOT** a Kubernetes cluster diagram, AWS cloud resource graph, network infrastructure map, or runtime APM service mesh.

Instead, **System Topology** refers to the **directed inter-project dependency graph** formed by:
1. **Projects (`Project` model):** Workspace nodes representing software projects or service boundaries.
2. **Project Topology Links (`ProjectTopologyLink` model):** Explicit directional inter-project dependencies (`type` enum: `DEPENDS_ON`, `PROVIDES_API_TO`, `INTEGRATES_WITH`, `SHARED_LIBRARY`).
3. **Document Relationships (`DocumentRelationship` model):** Document-level contract dependencies (`type === 'DEPENDS_ON'`).
4. **Baseline Snapshots (`DocumentationBaseline` model):** Certified historical snapshots of document trees.

---

## 3. TOPOLOGY DATA MODEL

### Stored Database Entities vs. Calculated Simulation Entities

#### Authoritative Stored Model: `IProjectTopologyLink`
```typescript
export type ProjectTopologyType =
  | 'DEPENDS_ON'
  | 'PROVIDES_API_TO'
  | 'INTEGRATES_WITH'
  | 'SHARED_LIBRARY';

export interface IProjectTopologyLink extends MongooseDocument {
  sourceProjectId: Types.ObjectId; // Consumer project
  targetProjectId: Types.ObjectId; // Provider project
  type: ProjectTopologyType;
  description?: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### In-Memory Simulation Scenario Input: `SimulateSystemGateInput`
```typescript
export interface SimulateSystemGateInput {
  rootProjectId: string;
  proposedBaselines?: ProposedBaselineOverlay[];
  proposedAttestations?: ProposedAttestationOverlay[];
  candidateWaivers?: CandidateWaiverOverlay[];
  proposedTopologyLinks?: ProposedTopologyLinkOverlay[];
}

export interface ProposedTopologyLinkOverlay {
  targetProjectId: string;
  dependencyType: 'DEPENDS_ON' | 'REFERENCES';
  action: 'ADD' | 'REMOVE';
}
```

---

## 4. TOPOLOGY GRAPH CONSTRUCTION & TRAVERSAL BOUNDS

System topology graph construction (`system-topology-simulation.service.ts`) follows strict, deterministic BFS graph traversal rules:
- **Root Node:** `rootProjectId`.
- **Traversal Direction:** Follows `DEPENDS_ON` links from consumer project ($Project_{\text{source}}$) to provider project ($Project_{\text{target}}$).
- **Depth Bound:** Bounded to Maximum Depth $D = 3$ levels.
- **Node Count Limit:** Bounded to Maximum $N = 50$ authorized project nodes.
- **Truncation Indicator:** If unvisited graph nodes exist beyond $D \ge 3$ or $N \ge 50$, `isTruncated` is set to `true`, and the output status is flagged as `TRUNCATED_PARTIAL`.
- **Deduplication:** Maintained using `visitedProjectIds` and `authorizedProjectIds` `Set<string>` collections to prevent infinite loops in cyclic dependencies.

---

## 5. SIMULATION SANDBOX (WHAT-IF SCENARIO OVERLAYS)

The **What-If Simulation Sandbox** is **100% IN-MEMORY** and **READ-ONLY with respect to persisted databases**.

### A. Supported Hypothetical Overlays
Users can simulate four types of hypothetical changes without modifying live data:
1. **Proposed Baseline Overlay:** Simulates advancing a provider document's baseline to version $v_N$.
2. **Hypothetical Attestation Overlay (Fulfillment Assumption):** Simulates marking a provider's baseline snapshot as attested via a pending Change Package (Phase 17).
3. **Candidate Policy Waiver Overlay:** Simulates granting an temporary exception for a specific blocking dependency (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, etc.).
4. **Proposed Topology Link Overlay:** Simulates adding (`ADD`) or removing (`REMOVE`) an inter-project `DEPENDS_ON` link.

### B. Simulation Lifecycle & Guarantees
- **In-Memory Isolation:** All scenario calculations clone live active waivers and contract alignment units into memory, apply overlays, evaluate gate conditions, and calculate deltas.
- **Reversibility:** A single click on "Reset Overlays" restores the view to the current live state.
- **No Side Effects:** Does not execute database writes or alter certified baseline records.

---

## 6. DRIFT ASSESSMENT IMPLEMENTATION

The **Drift Assessment Engine** (`drift-calculator.service.ts`) compares active working document states against the active certified baseline (`DocumentationBaseline`).

### A. The 4 Drift Dimensions
1. `VERSION_DRIFT`: Document head version or checksum diverges from baseline snapshot (`currentVerNum > baselineVerNum`).
2. `DOCUMENT_DELETION_DRIFT`: Baseline document was deleted or marked `isDeleted: true`.
3. `RELATIONSHIP_DRIFT`: Document relationships (`DEPENDS_ON`, `REFERENCES`) were added or removed since baseline freeze.
4. `VERIFICATION_DRIFT`: Document has unresolved verification tasks or open impact flags in Domain 15.

### B. Drift Severity Tiers & Score Calculation
- **Severity Tiers:** `BLOCKING` (version drift, deletion drift, or verification drift present), `WARNING` (relationship drift), `CLEAN` (no drift).
- **Drift Score Formula:**
  $$\text{Drift Score} = \max\left(0, 100 - (25 \cdot N_{\text{ver}} + 30 \cdot N_{\text{del}} + 20 \cdot N_{\text{verif}} + 10 \cdot N_{\text{rel}})\right)$$

---

## 7. TEMPORAL MODEL ($T_{cert}$, $T_{now}$, $T_{predicted}$)

Documan's topology engine cleanly separates three temporal states:

- **$T_{cert}$ (Authoritative Frozen Baseline):** Immutable baseline snapshot (`DocumentationBaseline`) recorded at a certified point in time.
- **$T_{now}$ (Current Authoritative State):** Live topology, active gate status, and un-baselined drift evaluated right now.
- **$T_{predicted}$ (Simulated Hypothetical State):** Predicted topology and release gate status resulting from applying in-memory scenario overlays in the Simulation Sandbox.

---

## 8. RELATIONSHIP TO DOMAINS 13–16

| Domain | Integration Semantics with Domain 17 |
| :--- | :--- |
| **Domain 16 (System Contract Matrix)** | Domain 16 analyzes matrix schema alignment; Domain 17 consumes contract alignment scores to drive topology release gate checks. |
| **Domain 13 (Change Proposals)** | Domain 17 allows users to simulate candidate waivers or baseline updates for documents targeted by Change Proposals. |
| **Domain 14 (Change Packages)** | Proposed Attestation overlays in Domain 17 accept `changePackageId` references to evaluate package release readiness. |
| **Domain 15 (Verification Plans)** | Open verification tasks feed directly into `VERIFICATION_DRIFT` calculations. |

---

## 9. EXACT STATE VOCABULARY

### System Release Gate Statuses
- `PASSED` — All cross-project contract dependencies and local gates pass without waivers.
- `PASSED_WITH_WAIVER` — Passed because all blocking dependencies have active, unexpired governance waivers.
- `BLOCKED` — At least one unwaived blocking dependency or failing local gate exists.
- `INDETERMINATE` — Upstream provider project state cannot be determined (e.g. truncated topology or missing data).
- `GOVERNANCE_DISABLED` — System governance gate evaluation is turned off for the project.

### System Blocker Types
- `CONTRACT_MISALIGNED` — Consumer baseline references version $v_A$, but Provider baseline is $v_B$.
- `PROVIDER_ATTESTATION_MISSING` — Upstream provider baseline lacks fulfillment attestation.
- `PROVIDER_ATTESTATION_STALE` — Provider document head version moved past attested baseline version.
- `PROVIDER_LOCAL_GATE_BLOCKED` — Upstream provider project has failing local gate freshness.
- `PROVIDER_GOVERNANCE_DISABLED` — Upstream provider project disabled governance.

---

## 10. SIMULATION RESULT MODEL

The simulation API returns a comprehensive `SimulateSystemGateOutput` payload comparing current vs. simulated states:

```typescript
export interface SystemTopologySimulationResponse {
  simulationId?: string;
  simulationStatus: 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';
  isSimulated: true;
  evaluatedAt: string;
  rootProjectId: string;
  baselineResult: {
    systemReleaseStatus: SystemReleaseStatus;
    summary: { totalDependencies: number; alignedDependencies: number; blockedProviders: number; waivedBlockers: number; unwaivedBlockers: number };
    blockingDependencies: BlockingDependency[];
  };
  simulatedResult: {
    systemReleaseStatus: SystemReleaseStatus;
    summary: { totalDependencies: number; alignedDependencies: number; blockedProviders: number; waivedBlockers: number; unwaivedBlockers: number };
    blockingDependencies: BlockingDependency[];
  };
  delta: {
    statusChanged: boolean;
    previousBlockerCount: number;
    newBlockerCount: number;
    resolvedBlockerCount: number;
    newUnwaivedBlockers: number;
    newlyWaivedBlockers: number;
  };
}
```

---

## 11. SECURITY & ACL BOUNDARIES

- **Disclosure ACL Enforced:** Uses `checkUserProjectReadAccess(userId, role, targetProjectId)`.
- **Cross-Project RedACTION:** If a user lacks read permissions for an upstream target project in the topology graph, the node traversal skips that project or returns `[Restricted Project]`.

---

## 12. UI ARCHITECTURE

The UI for Domain 17 is hosted inside `SystemGovernanceGateSection.tsx` and `SystemTopologySimulationSandbox.tsx`:

```
[System Governance Gate Panel]
  ├── Status Banner (PASSED / BLOCKED / PASSED_WITH_WAIVER)
  ├── Overview KPI Cards (Root Local Gate Freshness %, System Contract Alignment Score %)
  ├── Cross-Project Dependency Blocker Roster (With "Grant Waiver" action buttons)
  ├── Active System Governance Waivers Table (With "Revoke" action buttons)
  └── What-If Simulation Sandbox Panel (SystemTopologySimulationSandbox.tsx)
        ├── Overlay Input Cards (Proposed Baseline, Attestation, Candidate Waiver, Topology Link ADD/REMOVE)
        ├── Action Buttons ("Run What-If Simulation", "Reset Overlays")
        └── Side-by-Side Comparison Grid (Current Authoritative vs. Hypothetical Simulated State)
```

---

## 13. TOPOLOGY EDITING BOUNDARY

> [!CRITICAL]
> **Authoritative Baseline vs. Simulation Editing Rule:**
> Live, persisted topology links are created and managed via explicit API endpoints (`POST /api/v1/projects/:projectId/topology`).
> **The Simulation Sandbox DOES NOT provide a persistent drag-and-drop canvas.** Simulation link editing (`ADD` / `REMOVE`) is **IN-MEMORY ONLY** for what-if scenario testing and does not alter the underlying MongoDB records.

---

## 14. PERFORMANCE CHARACTERISTICS & LIMITS

- **BFS Graph Bounds:** $D \le 3$ depth, $N \le 50$ max project nodes.
- **Batch Processing:** `drift-calculator.service.ts` uses batch Mongo queries (`$in` array lookup) for documents, versions, and relationships to prevent $N+1$ database call bottlenecks.

---

## 15. SAMPLE DATA & TERMINOLOGY AUDIT

All capabilities in Domain 17 are grounded in exact, executable codebase logic:
- **Authoritative:** In-memory scenario evaluation, BFS graph traversal, baseline drift score calculation, gate status resolution, policy waiver matching.
- **Excluded Concepts:** No cloud infrastructure, Kubernetes pods, AWS VPCs, network routers, APM agent telemetry, or AI claims.

---

## 16. PROPOSED MINIMAL STITCH DESIGN ARCHITECTURE

The high-fidelity Stitch design for Domain 17 will consist of seven canonical view concepts:

1. **17.00 Overview & System Release Gate Banner** — Gate status badge (`PASSED`, `BLOCKED`), freshness score, alignment index.
2. **17.01 Interactive System Topology Graph** — Node-link topology visualization showing root project, upstream providers, and dependency links ($D \le 3$).
3. **17.02 Node & Blocker Inspector Panel** — Details on selected project node, missing attestations, or misaligned document contracts.
4. **17.03 What-If Simulation Sandbox Builder** — Form controls to add proposed baseline, attestation, candidate waiver, and topology link overlays.
5. **17.04 Side-by-Side Simulation Comparison** — Side-by-side card comparison of Current Authoritative State ($T_{now}$) vs. Simulated State ($T_{predicted}$).
6. **17.05 Drift Assessor Breakdown Table** — Detailed report listing version drift, deletion drift, relationship drift, and verification drift.
7. **17.06 Governance Waiver Roster & Modal** — Active waivers list with expiration timers and grant/revoke modals.

---

## 17. FINAL RESEARCH ASSESSMENT

### A. Authoritative Files
- `apps/web/src/features/governance/components/SystemTopologySimulationSandbox.tsx`
- `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx`
- `apps/api/src/modules/governance/system-topology-simulation.service.ts`
- `apps/api/src/modules/governance/system-topology-governance-gate.service.ts`
- `apps/api/src/modules/governance/drift-calculator.service.ts`
- `apps/api/src/modules/projects/project-topology.model.ts`

### B. Routes
- Frontend: `/governance?tab=governance-gate` & `/projects/:projectId?tab=governance-gate`
- API: `POST /api/v1/projects/:projectId/system-topology-gate/simulate`
- API: `GET /api/v1/projects/:projectId/system-topology-gate`
- API: `POST /api/v1/projects/:projectId/topology`

### C. APIs & DTOs
- `SystemTopologySimulationResponse` / `SimulateSystemGateOutput`, `SystemGovernanceGateResponse`, `IDriftReport`

### D. Models
- `ProjectTopologyLink`, `Project`, `Document`, `DocumentationBaseline`, `SystemGovernanceWaiver`

### E. Services
- `system-topology-simulation.service.ts`, `system-topology-governance-gate.service.ts`, `drift-calculator.service.ts`, `project-topology.service.ts`

### F. Topology Construction Logic
- BFS traversal, bounded $D \le 3$, $N \le 50$, `isTruncated` handling, in-memory overlay link injection (`ADD`/`REMOVE`).

### G. Simulation Semantics
- In-memory only, no DB mutation, hypothetical overlays (baselines, attestations, candidate waivers, topology links).

### H. Drift Semantics
- 4 dimensions (`VERSION_DRIFT`, `DOCUMENT_DELETION_DRIFT`, `RELATIONSHIP_DRIFT`, `VERIFICATION_DRIFT`), 3 severities (`BLOCKING`, `WARNING`, `CLEAN`), score formula (100 - deductions).

### I. Temporal Semantics
- $T_{cert}$ = Frozen baseline snapshot, $T_{now}$ = Current live state & drift, $T_{predicted}$ = In-memory simulated scenario state.

### J. ACL / Security Behavior
- `checkUserProjectReadAccess` enforced. Inaccessible projects masked or skipped.

### K. Performance Constraints
- $D \le 3$, $N \le 50$, batch MongoDB queries.

### L. UI Components
- `SystemTopologySimulationSandbox`, `SystemGovernanceGateSection`

### M. Navigation Relationships
- Embedded inside Governance Gate section on project workspace or system governance page.

### N. Explicit Rejected / Invented Concepts
- Infrastructure canvas, APM service mesh, K8s pod graph, cloud architecture editor, CI/CD runner.

### O. Proposed Stitch Architecture
- 7-part canonical layout (17.00 through 17.06).

### P. Open Design Assumptions
- None. Full repository backing verified.

### Q. Final Readiness
**READY FOR STITCH DESIGN**
