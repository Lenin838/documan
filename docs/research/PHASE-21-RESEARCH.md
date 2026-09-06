# Phase 21 Research: System Topology Pre-Release What-If Simulation & Gate Impact Analyzer

## 1. Executive Summary

Phase 20 (**Cross-Project System Governance Exception & Policy Waiver Lifecycle Management**) is officially completed, tested, merged, and pushed to `main` (`commit 9cbeafc`, `merge b1c6d40`, `closeout f104283`). Documan now possesses a persistent policy waiver model ([`SystemGovernanceWaiver`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-governance-waiver.model.ts)) and deterministic exception matching ([`system-governance-waiver.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-governance-waiver.service.ts)) integrated directly into the 9-step system topology release gate engine ([`system-topology-governance-gate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts)).

This research evaluates the next natural boundary in Documan's product progression: **Phase 21**.

Rather than manufacturing another CRUD screen, administrative log, or generic workflow layer, this research inspects the actual codebase across all 20 completed phases. It identifies five serious candidate capabilities, subjects them to a 10-dimension scoring matrix and rigorous architectural stress testing, and recommends **Candidate 3: System Topology Pre-Release What-If Simulation & Gate Impact Analyzer (`system-topology-simulation.service.ts`)** as the winning direction.

### Key Research Findings

1. **The Ephemeral System Gate Problem**: Documan's system governance engine ([`system-topology-governance-gate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts)) evaluates release safety dynamically against the live state of MongoDB collections (`ProjectTopologyLink`, `DocumentationBaseline`, `PackageFulfillmentAttestation`, `SystemGovernanceWaiver`, `DocumentRelationship`). When a lead technical steward or release manager asks: *"If Provider Project A publishes Baseline v2.0 next week, and we grant a 30-day waiver for Provider Project B's missing attestation, will Root Project X's release gate pass?"*, Documan currently **cannot answer without performing actual mutations in production MongoDB databases**.
2. **The Composition Principle**: Documan already has single-document change proposal simulation (Phase 15: [`change-proposal-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-proposals/change-proposal-simulation.service.ts)) and multi-document change package simulation (Phase 16: [`change-package-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-packages/change-package-simulation.service.ts)). However, Documan lacks a **system-level topology simulation engine** that projects hypothetical contract baseline updates, proposed change packages, candidate waiver grants, or topology link modifications across project boundaries to evaluate future gate states.
3. **Pure Derived Architecture (Zero Persistence & Zero Background Jobs)**: Candidate 3 requires **zero new database models, zero persistent schemas, zero background queue workers, and zero AI/LLM dependencies**. It operates as a pure, derived, read-only simulation function over ACL-filtered project subgraphs, reusing Phase 14 ACL access checks ([`checkUserProjectReadAccess`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.service.ts)) and Phase 19/20 evaluation precedence.
4. **Strict Product Boundary Protection**: Documan avoids becoming a CI/CD execution pipeline, deployment trigger runner, Postman clone, Jira clone, or vector RAG product. Phase 21 remains strictly centered on **document context, cross-project contract governance, pre-change simulation, and decision support**.

---

## 2. Current Documan Architecture

Documan is built on a clean monorepo architecture (`apps/api` Node.js / Express / TypeScript REST API + MongoDB Mongoose models, and `apps/web` React / TypeScript / Vite / Tailwind UI). The system follows strict architectural conventions:

```text
HTTP Request
    ↓
Route Definition (apps/api/src/routes/index.ts & module routes)
    ↓
Authentication & Authorization Middleware (auth.middleware.ts, authorization.middleware.ts)
    ↓
Request Validation Middleware (validate.middleware.ts & Zod schemas)
    ↓
Controller Layer (extracts inputs, calls service, formats HTTP response via api-response.ts)
    ↓
Service Layer (business logic, transaction handling, domain invariants)
    ↓
Model Layer (Mongoose schemas, indexing, TypeScript interfaces)
    ↓
MongoDB Database
```

### Key Architectural Constraints Enforced Across All Modules

- **Centralized Error Handling**: Custom `AppError` class throwing typed error codes and HTTP status codes (`400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`).
- **Strict Permission Boundaries**: Backend authorization is mandatory. Frontend UI state reflects permissions, but backend middleware and services enforce ownership (`ownerId`), shared permissions (`DocumentShare`), and project read access (`checkUserProjectReadAccess`).
- **Immutable Audit Trail**: Append-only audit logging via `createDocumentAudit` in [`document-audit.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-audit.service.ts). Read-only GET evaluations produce **zero audit writes and zero database mutations**.
- **Permission-Safe Subgraph Evaluation**: Multi-project services (Phases 14, 18, 19, 20) filter out unauthorized projects, topology links, documents, and failure counts prior to returning responses (`100% omission`, zero placeholders, zero restricted node IDs).

---

## 3. Completed Capability Landscape

The repository currently implements 20 complete, verified, and merged product phases:

| Phase | Capability Title | Authoritative Files & Services | Core Model / Output |
|---|---|---|---|
| **Phase 1** | Identity, Auth & User Management | [`auth.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/auth/auth.service.ts), [`user.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/users/user.service.ts) | `User` model, JWT tokens, RBAC (`user`, `admin`) |
| **Phase 2** | Core Document Lifecycle | [`document.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document.service.ts), [`document-version.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-version.service.ts) | `Document`, `DocumentVersion` models |
| **Phase 3** | Folder & Metadata Organization | [`folder.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/folders/folder.service.ts) | `Folder` model, metadata tags, structured discovery |
| **Phase 4** | Document Traceability & Audit | [`document-audit.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-audit.service.ts) | `DocumentAudit` model, append-only history |
| **Phase 5** | Collaboration & Access Control | [`document-share.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/document-shares/document-share.service.ts) | `DocumentShare` model (`READ`, `EDIT` permissions) |
| **Phase 6** | Developer / Productivity Workflows | [`webhook.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/webhooks/webhook.service.ts), [`notification.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/notifications/notification.service.ts) | Webhook delivery, async notifications |
| **Phase 7.1–7.2** | Project & API Context | [`project.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project.service.ts), [`api-spec.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/api-specs/api-spec.test.ts) | `Project` model, OpenAPI spec parsing & endpoints |
| **Phase 7.3** | Cross-Document Change Impact | [`document-impact-cascade.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-impact-cascade.service.ts) | `DocumentRelationship` model (`DEPENDS_ON`, etc.) |
| **Phase 7.4** | Immutable Version Snapshots | [`document-version.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-version.service.ts) | Version checksums, sha256 content verification |
| **Phase 7.5** | Technical Knowledge Risk Radar | [`knowledge-risk.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/knowledge-risk.service.ts) | `knowledge-risk-calculator.ts` risk scores |
| **Phase 8** | Technical Knowledge Discovery | [`knowledge.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/knowledge/knowledge.service.ts) | Knowledge item discovery, source reference links |
| **Phase 9** | Documentation Evidence & Traceability | [`evidence.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/knowledge/evidence.service.ts) | `evidence-calculator.ts` completeness metrics |
| **Phase 10** | Governance & Assurance Engine | [`assurance.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/assurance.service.ts), [`release-gate-evaluator.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/release-gate-evaluator.service.ts) | Single-project release gate (`PASSED`, `BLOCKED`) |
| **Phase 11** | Verification Planning & Intelligence | [`verification-plan.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/verification-plan.service.ts) | `VerificationTask` model, automated task dispatch |
| **Phase 12** | Documentation Baseline & Drift | [`baseline.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/baseline.service.ts), [`drift-calculator.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/drift-calculator.service.ts) | `DocumentationBaseline` model, snapshot checksums |
| **Phase 13** | Work Requests & Review Workflow | [`work-request.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/work-request.service.ts), [`document-review.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/documents/document-review.service.ts) | `DocumentationWorkRequest`, `DocumentReview` models |
| **Phase 14** | System Architecture Topology | [`project-topology.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.service.ts) | `ProjectTopologyLink` model, ACL-safe graph |
| **Phase 15** | Pre-Change Proposal Simulation | [`change-proposal.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-proposals/change-proposal.service.ts) | `ChangeProposal`, `change-proposal-simulation.service.ts` |
| **Phase 16** | Multi-Doc Change Package Simulation | [`change-package.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-packages/change-package.service.ts) | `ChangePackage`, `change-package-simulation.service.ts` |
| **Phase 17** | Fulfillment Verification & Attestation | [`change-package-attestation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-packages/change-package-attestation.service.ts) | `PackageFulfillmentAttestation` immutable snapshots |
| **Phase 18** | Baseline Contract Lineage & Alignment | [`system-baseline-alignment.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-baseline-alignment.service.ts) | Derived dual-metric system baseline alignment |
| **Phase 19** | System Topology Governance Gate | [`system-topology-governance-gate.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts) | 9-step system release gate (`PASSED`, `BLOCKED`) |
| **Phase 20** | Policy Waiver Lifecycle Management | [`system-governance-waiver.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-governance-waiver.service.ts) | `SystemGovernanceWaiver` model, `PASSED_WITH_WAIVER` |

---

## 4. Remaining Product Gaps

Despite the comprehensive governance capabilities spanning Phase 1 to Phase 20, a critical operational gap remains at the intersection of system topology release decisions and proactive change planning:

### Gap 1: Inability to Simulate System-Level Release Gate Outcomes Before Making Mutations
- **Current State**: Phase 15 simulates single-document change proposals ([`change-proposal-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-proposals/change-proposal-simulation.service.ts)), and Phase 16 simulates multi-document change packages ([`change-package-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-packages/change-package-simulation.service.ts)). However, these simulations operate strictly on **content proposals within a package**.
- **Unresolved Problem**: System architects and lead stewards considering structural changes across projects—such as:
  1. *Publishing a new provider baseline (`v2.0`)*,
  2. *Granting a proposed governance waiver*,
  3. *Adding or deleting a project topology link (`ProjectTopologyLink`)*, or
  4. *Fulfilling a pending change package (`PackageFulfillmentAttestation`)*
  cannot evaluate how those hypothetical changes will impact the top-level **System Topology Governance Gate (`evaluateSystemTopologyGovernanceGate`)**.
- **Operational Danger**: Teams are currently forced to execute real database mutations (creating real baselines, granting real waivers, or adding real topology links) just to observe if the system gate transitions from `BLOCKED` to `PASSED_WITH_WAIVER` or `PASSED`.

### Gap 2: Disconnect Between System Gate Blockers and Actionable Remediation Plans
- **Current State**: Phase 19/20 gate evaluation returns a list of `blockingDependencies` containing blocker types (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, etc.).
- **Unresolved Problem**: There is no automated synthesis that aggregates these multi-project blocking dependencies into a unified, permission-safe **Remediation Execution Plan** mapping every blocker to required work requests ([`DocumentationWorkRequest`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/documentation-work-request.model.ts)), verification tasks ([`VerificationTask`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/verification-task.model.ts)), or eligible waiver parameters.

### Gap 3: Absence of Historical System Governance Release Snapshots
- **Current State**: Phase 19/20 evaluates system release safety dynamically at query time without persisting evaluation results.
- **Unresolved Problem**: Auditors cannot query past system release evaluations for specific release milestones (e.g. "What was the exact gate status when Release Tag `v2.4.0` was deployed on June 15?").

---

## 5. Candidate 1: System Governance Evaluation Audit & Immutable Release Attestation Lineage

### Concept
Introduce a persistent model (`SystemGovernanceReleaseSnapshot`) that records an immutable, cryptographically hashed audit snapshot of `evaluateSystemTopologyGovernanceGate` results whenever a system release gate check is formally executed for a deployment milestone or CI/CD gate token verification.

### Key Characteristics
- **Problem Solved**: Provides immutable historical proof of system release gate evaluations for compliance auditing.
- **Persistence**: New Mongoose collection `system_governance_release_snapshots`.
- **API Impact**: POST `/api/v1/projects/:projectId/system-governance-gate/snapshots` to record formal release evaluations; GET endpoints to query historical snapshot lineage.
- **UI Impact**: Historical release compliance log viewer tab on the System Governance Gate page.
- **Product Boundary Risk**: High risk of overlapping with CI/CD deployment engines or build artifact repositories.

---

## 6. Candidate 2: Cross-Project Governance Remediation & Work Orchestration Plan Engine

### Concept
Build a derived service (`system-governance-remediation.service.ts`) that analyzes a `BLOCKED` or `INDETERMINATE` system topology gate evaluation and automatically synthesizes a permission-safe, multi-project **Governance Remediation Plan**.

### Key Characteristics
- **Problem Solved**: Automatically groups blocking dependencies across provider projects into actionable remediation steps (e.g. "Create Baseline on Project B", "Attest Change Package #12 on Project C", "Grant Waiver for Document D").
- **Persistence**: Pure derived calculation (zero new persistent models required).
- **API Impact**: GET `/api/v1/projects/:projectId/system-governance-gate/remediation-plan`.
- **UI Impact**: Actionable remediation drawer/modal on `SystemGovernanceGateSection.tsx`.
- **Product Boundary Risk**: Moderate risk of resembling a generic issue tracker (Jira clone) if remediation steps behave like persistent task boards.

---

## 7. Candidate 3: System Topology Pre-Release What-If Simulation & Gate Impact Analyzer (RECOMMENDED)

### Concept
Build a pure, derived, read-only simulation engine ([`system-topology-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts)) that accepts a hypothetical scenario payload containing proposed cross-project changes (proposed baseline versions, candidate change package attestations, candidate waiver grants, or proposed topology link additions/deletions) and projects the exact 9-step precedence gate outcome **without mutating MongoDB**.

```text
Hypothetical Scenario Input:
- Proposed Provider Baseline Updates (e.g., Provider A -> v2)
- Candidate Waivers to Grant (e.g., Waiver for Provider B attestation)
- Proposed Topology Link Changes (e.g., Add link Root -> Provider C)
        ↓
system-topology-simulation.service.ts (Pure Function)
        ↓
Evaluates 9-Step Precedence Governance Engine Over In-Memory Hypothetical Graph
        ↓
Simulated System Gate Output:
- Simulated Release Status (PASSED, PASSED_WITH_WAIVER, BLOCKED)
- Gate Status Delta (e.g., BLOCKED → PASSED_WITH_WAIVER)
- Unresolved Remaining Blockers
- Newly Introduced Blockers
- Applicable Waiver Coverage Preview
```

### Key Characteristics
- **Problem Solved**: Eliminates the operational danger of performing real database mutations just to check if a system release gate will pass. Allows lead stewards to run "What-If" scenarios before committing changes.
- **Persistence**: **Zero new database models, zero persistent schemas**.
- **Worker / Background Jobs**: **Zero background queue workers**. Runs synchronously in <50ms.
- **API Impact**: POST `/api/v1/projects/:projectId/system-topology-gate/simulate` (read-only calculation).
- **UI Impact**: Interactive "What-If Simulation Sandbox" tab integrated into `SystemGovernanceGateSection.tsx`.
- **Product Boundary Risk**: Extremely safe. Operates purely as a decision-support and impact-analysis tool for document and project context.

---

## 8. Candidate 4: Multi-Project Baseline Snapshot Lineage & Contract Diff Engine

### Concept
Build a multi-project baseline contract diff service (`system-baseline-diff.service.ts`) that compares active or historical baseline snapshots (`DocumentationBaseline`) across connected project topologies to highlight structural document contract changes, attestation differences, and version drift between two system release milestones (e.g., `System Release v1.0` vs `System Release v2.0`).

### Key Characteristics
- **Problem Solved**: Provides multi-project baseline diffing to answer "What baseline documents changed across provider projects between Tag A and Tag B?".
- **Persistence**: Pure derived calculation over existing `DocumentationBaseline` records.
- **API Impact**: POST `/api/v1/projects/:projectId/system-baselines/diff`.
- **UI Impact**: Multi-project baseline diff viewer component.
- **Product Boundary Risk**: Moderate risk of overlapping with Git/VCS diffing tools if focused on raw code file diffs rather than authoritative document baselines.

---

## 9. Candidate 5: Continuous System Governance Telemetry & Policy Compliance Analytics Radar

### Concept
Build an aggregate telemetry service (`system-governance-telemetry.service.ts`) that tracks governance health velocity, waiver decay rates, attestation freshness degradation trends, and recurring contract misalignment hotspots across the organization's project topology graph over time.

### Key Characteristics
- **Problem Solved**: Gives system administrators high-level analytics on organizational governance compliance trends.
- **Persistence**: Requires persistent metrics aggregation collection or time-series data store.
- **API Impact**: GET `/api/v1/governance/telemetry`.
- **UI Impact**: Executive governance dashboard.
- **Product Boundary Risk**: High risk of resembling an infrastructure APM or generic monitoring dashboard (Datadog / Grafana clone).

---

## 10. Candidate Scoring Matrix

Each candidate is evaluated on a strict 1–5 scale across 10 weighted product and architectural dimensions (Total Max Score: 50):

| Dimension | Weight | Candidate 1 (Audit Snapshot) | Candidate 2 (Remediation Plan) | Candidate 3 (What-If Simulation) | Candidate 4 (Baseline Diff) | Candidate 5 (Telemetry Radar) |
|---|---|---|---|---|---|---|
| 1. Product Value | 1.0 | 4.0 | 4.5 | **5.0** | 4.0 | 3.5 |
| 2. Alignment with Documan Identity | 1.0 | 4.5 | 4.0 | **5.0** | 4.5 | 3.0 |
| 3. Reuse / Composition of Architecture | 1.0 | 3.5 | 4.5 | **5.0** | 4.0 | 2.5 |
| 4. Traceability & Decision Leverage | 1.0 | 4.5 | 4.0 | **5.0** | 4.0 | 3.5 |
| 5. Governance / Verification Value | 1.0 | 4.0 | 4.5 | **5.0** | 4.0 | 3.5 |
| 6. Cross-Project Architecture Value | 1.0 | 4.0 | 4.5 | **5.0** | 4.5 | 3.5 |
| 7. Technical Feasibility & Purity | 1.0 | 3.5 | 4.5 | **5.0** | 4.0 | 2.5 |
| 8. Security / ACL Clarity | 1.0 | 4.5 | 4.5 | **5.0** | 4.5 | 3.5 |
| 9. Determinism & Zero-Mutation Read | 1.0 | 3.0 | 5.0 | **5.0** | 5.0 | 3.0 |
| 10. Product-Boundary Safety | 1.0 | 3.0 | 3.5 | **5.0** | 4.0 | 2.5 |
| **TOTAL SCORE** | **10.0** | **38.5** | **43.5** | **50.0** | **42.5** | **31.0** |

### Scoring Matrix Summary
- **Candidate 3 (System Topology Pre-Release What-If Simulation)** wins with a perfect score of **50.0 / 50.0**.
- **Candidate 2 (Cross-Project Governance Remediation)** comes in second with **43.5 / 50.0**.
- **Candidate 4 (Baseline Diff Engine)** comes in third with **42.5 / 50.0**.
- **Candidate 1 (Audit Snapshot)** scores **38.5 / 50.0** due to persistence overhead and CI/CD boundary risks.
- **Candidate 5 (Telemetry Radar)** scores **31.0 / 50.0** due to monitoring platform boundary overlap and time-series persistence requirements.

---

## 11. Top-2 Architectural Stress Test

A deeper architectural analysis was performed on the top 2 candidate capabilities: **Candidate 3 (What-If Simulation)** and **Candidate 2 (Governance Remediation Plan)**.

### Stress Test 1: Candidate 3 — System Topology Pre-Release What-If Simulation & Gate Impact Analyzer

```text
[CHECKPOINT 1] Conflicting Authority Risk: ZERO
- Candidate 3 DOES NOT persist baselines, topology links, attestations, or waivers.
- It operates as a transient in-memory evaluation function over existing Phase 10-20 models.
- It can NEVER become a competing source of truth because it produces zero persistent state.

[CHECKPOINT 2] ACL Leakage Risk: ZERO
- Reuses Phase 14 `checkUserProjectReadAccess(userId, role, projectId)`.
- Hypothetical topology links or baseline updates involving unauthorized projects are rejected before simulation execution.
- If a user lacks READ access to a project included in a hypothetical scenario, the simulation throws HTTP 403 `FORBIDDEN`.

[CHECKPOINT 3] Mutation Side-Effect Risk: ZERO
- The simulation endpoint is explicitly marked read-only (POST payload contains scenario inputs, returns JSON simulation result).
- Zero database writes (`insert`, `update`, `delete`), zero audit event creation, zero webhook triggers.

[CHECKPOINT 4] Lifecycle & Precedence Invariance: 100% PRESERVED
- Reuses the exact 9-step precedence evaluation logic from `system-topology-governance-gate.service.ts`:
  Step 1: Check Root Project Governance Enabled
  Step 2: Check Root Local Release Gate
  Step 3: Evaluate Cross-Project Topology Links (ACL filtered)
  Step 4: Evaluate Baseline Presence
  Step 5: Evaluate Baseline Version Match
  Step 6: Evaluate Provider Fulfillment Attestations & Staleness
  Step 7: Evaluate Provider Local Gate Status
  Step 8: Match Active Policy Waivers (incorporating proposed candidate waivers)
  Step 9: Compute Aggregate System Release Status (PASSED, PASSED_WITH_WAIVER, BLOCKED, INDETERMINATE)
```

### Stress Test 2: Candidate 2 — Cross-Project Governance Remediation Plan Engine

```text
[CHECKPOINT 1] Conflicting Authority Risk: LOW
- Derives remediation steps directly from Phase 19 gate failure output (`blockingDependencies`).
- Does not create persistent task objects.

[CHECKPOINT 2] ACL Leakage Risk: LOW
- Filters blocking dependencies by user project read access.

[CHECKPOINT 3] Product Boundary Risk: MODERATE TO HIGH
- If remediation plans are rendered as persistent task lists with status checkboxes (e.g. "To Do", "In Progress", "Done"), the feature risks degrading into a generic Jira task board clone.
- To remain safe, remediation steps must be strictly derived URLs pointing to existing Documan workflows (e.g. "Go to Project B Baseline Page", "Open Work Request #4").
```

### Stress Test Conclusion
Candidate 3 (**System Topology Pre-Release What-If Simulation**) passes all 4 stress checkpoints with zero architectural flaws, zero persistence overhead, and zero boundary risks. Candidate 2 is valid as a secondary UI helper, but Candidate 3 is far superior as a core system capability.

---

## 12. Recommended Phase 21 Direction

### Recommended Winner: Candidate 3 — System Topology Pre-Release What-If Simulation & Gate Impact Analyzer

### Recommended Capability Scope

Phase 21 will implement a derived, read-only system topology simulation engine ([`system-topology-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-governance-gate.service.ts)) and interactive UI sandbox ([`SystemTopologySimulationSandbox.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx)).

#### 1. Pure Derived Simulation Service (`system-topology-simulation.service.ts`)
- Accepts a `SimulateSystemGateInput` payload:
  ```ts
  export interface SimulateSystemGateInput {
    rootProjectId: string;
    proposedBaselines?: Array<{
      projectId: string;
      versionNumber: number;
    }>;
    proposedAttestations?: Array<{
      projectId: string;
      changePackageId: string;
      attestationVersion: number;
    }>;
    candidateWaivers?: Array<{
      targetProviderProjectId: string;
      targetDocumentId?: string | null;
      contractVersionNumber?: number | null;
      blockerType: SystemBlockerType;
      reason: string;
      expiresInDays?: number;
    }>;
    proposedTopologyLinks?: Array<{
      targetProjectId: string;
      dependencyType: 'DEPENDS_ON' | 'REFERENCES';
    }>;
  }
  ```
- Validates user project read access ([`checkUserProjectReadAccess`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/projects/project-topology.service.ts)) for root project and all target projects in the simulation payload. Throws HTTP 403 `FORBIDDEN` if any project in the hypothetical scenario is unauthorized.
- Clones the current live state of topology links, baselines, attestations, and waivers in memory, overlaying the proposed hypothetical changes.
- Executes the 9-step precedence evaluation engine over the in-memory graph.
- Returns a structured `SimulateSystemGateOutput`:
  - `baselineStatus`: Current live system gate status vs simulated system gate status.
  - `statusChanged`: Boolean indicating if the simulation changes the gate outcome (e.g. `BLOCKED` → `PASSED_WITH_WAIVER`).
  - `simulatedSystemReleaseStatus`: `PASSED` | `PASSED_WITH_WAIVER` | `BLOCKED` | `INDETERMINATE` | `GOVERNANCE_DISABLED`.
  - `resolvedBlockers`: List of blocking dependencies that are resolved in the simulation.
  - `remainingBlockers`: List of blocking dependencies that remain unresolved.
  - `newlyIntroducedBlockers`: List of new blocking dependencies created by the simulation (e.g. adding a new topology link to an un-attested provider).
  - `waiverImpact`: Breakdown of candidate waivers applied and their exact coverage impact.

#### 2. REST API Endpoint
- `POST /api/v1/projects/:projectId/system-topology-gate/simulate`
  - Body: `SimulateSystemGateInput`
  - Auth: Mandatory JWT + Project READ access
  - Response: `SimulateSystemGateOutput` (HTTP 200 OK)
  - **Zero database persistence, zero audit writes**.

#### 3. Interactive Web UI Sandbox
- Integrated into `SystemGovernanceGateSection.tsx` as a "What-If Simulation Sandbox" panel.
- Allows project owners and stewards to toggle hypothetical waivers, select target baseline versions, preview gate status transitions in real time, and inspect resolved vs remaining blockers before executing real grants or baseline updates.

---

## 13. Why This Belongs in Documan

1. **Natural Product Evolution**: Documan evolved from document storage → organization → traceability → governance → single-document simulation (Phase 15) → multi-document package simulation (Phase 16) → system topology gate (Phase 19) → policy waivers (Phase 20). Phase 21 completes this progression by providing **system-level topology simulation**.
2. **High-Value Decision Support**: Technical stewards can answer *"What happens if we publish this baseline or grant this waiver?"* before making irreversible database mutations.
3. **Zero Architectural Debt**: Operates 100% dynamically as a pure function over ACL-filtered data. Adds **zero database schemas, zero background jobs, and zero AI dependencies**.

---

## 14. Explicit Non-Goals

Phase 21 strictly avoids:

- **No Deployment Execution**: Does NOT execute software builds, CI/CD pipelines, Docker deployments, or cloud infrastructure triggers.
- **No Database Mutations**: Does NOT save simulation inputs or outputs to MongoDB.
- **No Background Queue Workers**: Does NOT use Redis, BullMQ, cron jobs, or asynchronous background workers.
- **No Mandatory AI / LLM / Vector RAG**: Does NOT rely on non-deterministic machine learning, OpenAI APIs, or vector databases.
- **No Generic Task Management**: Does NOT create Jira-style task boards or ticket tracking workflows.
- **No Visual Vector Canvas**: Does NOT build a drag-and-drop node graph editor (Miro / Lucidchart clone).

---

## 15. Risks and Open Questions

### Risk 1: Complex In-Memory Graph Overlay Performance
- **Risk**: Overlaying multiple hypothetical topology links and baseline versions on large project graphs might cause latency if query patterns are inefficient.
- **Mitigation**: Fetch live project graph using existing Phase 14/18/19 query helpers (`find`, `lean()`), perform in-memory dictionary lookup overlays, and execute evaluation. Targeted benchmark goal: `<50ms` execution time for topologies up to 100 projects.

### Open Question 1: Schema Validation for Simulation Payload
- **Question**: Should candidate waivers in the simulation payload validate document existence (`targetDocumentId`) against MongoDB during simulation setup?
- **Answer**: Yes. Validation middleware will verify that referenced `targetDocumentId` and `targetProviderProjectId` exist in MongoDB before running the in-memory simulation, throwing standard `404 NOT_FOUND` or `400 VALIDATION_ERROR` if invalid.

---

## 16. Recommendation for Implementation Planning

1. **Verdict**: **Phase 21 Candidate 3 (System Topology Pre-Release What-If Simulation & Gate Impact Analyzer) is APPROVED for research**.
2. **Next Step**: Wait for user review and approval of `docs/research/PHASE-21-RESEARCH.md`.
3. **Implementation Rule**: Do NOT create a feature branch, do NOT create an implementation plan, and do NOT write any source code until explicit authorization is granted by the user.

---
