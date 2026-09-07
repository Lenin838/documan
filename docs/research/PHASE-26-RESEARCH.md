# Phase 26 Research — System-Wide Contract Remediation Action Plan & Multi-Project Change Package Synthesizer

> **Product Source of Truth**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)
> **Previous Phase**: Phase 25 — Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer (COMPLETED & MERGED, Commit `c4deba2`, Merge `4fd5321`)
> **Research Phase**: Phase 26 — RESEARCH ONLY

---

## 1. Executive Summary

Phase 25 delivered the **Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer** ([`system-contract-matrix.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-matrix.service.ts)), enabling Project Owners and System Admins to compute an $N \times N$ compatibility grid across authorized project topologies, evaluate 6-tier interoperability states (`NO_RELEVANT_CONTRACT_DEPENDENCY`, `MISSING_AUTHORITATIVE_CONTRACT`, `UNSUPPORTED_CONTRACT`, `BREAKING_CONTRACT_DELTA`, `STRUCTURALLY_MISALIGNED`, `ALIGNED`), and identify critical contract incompatibilities.

With Phase 25 completed, Documan provides comprehensive governance across document lifecycles, evidence collection, release gates, verification planning, baselines, project topologies, change proposals, change packages, fulfillment attestations, baseline alignment, topology gates, policy waivers, what-if topology simulation, longitudinal governance lineage, contract evolution diffing, document traceability audit, and contract interoperability matrices.

This research document evaluates the strategic position of Documan after Phase 25 and investigates the next critical product gap. Specifically, it examines what important user workflow remains unresolved AFTER a user discovers in the Phase 25 matrix that a contract is **misaligned**, a **breaking delta exists**, **evidence is missing**, or a **dependency is indeterminate**.

This research generates 5 distinct candidate capabilities, evaluates each across 12 product and technical dimensions, scores them using a transparent 10-criteria framework, and selects **Candidate 1: System-Wide Contract Remediation Action Plan & Multi-Project Change Package Synthesizer** as the recommended Phase 26 capability.

Candidate 1 provides a derived, read-only, request-scoped remediation engine that converts detected cross-project contract breakages, misalignments, and missing contracts into a deterministic, dependency-sequenced **Remediation Action Plan** and a draft **Multi-Document Change Package Payload**. It bridges the gap between contract failure discovery (Phase 25) and coordinated change execution (Phase 16) with **0 new database models**, **0 background workers**, **0 audit log writes on GET queries**, and **0 external AI/LLM dependencies**.

---

## 2. Current Product State

**REPOSITORY FACT**: Verification executed on repository state prior to research:
- **Current Branch**: `main`
- **Working Tree**: `clean` (0 untracked/modified implementation files)
- **HEAD Commit**: `4fd53212d48e2480bd4cc249b17caba209f621c6` (`docs: close out phase 25`)
- **Remote Synchronization**: `HEAD == origin/main` (`4fd53212d48e2480bd4cc249b17caba209f621c6`)
- **Completed Phases in Log History**:
  - Phase 25: Commit `30c3397`, Merge `c4deba2`, Docs `4fd5321`
  - Phase 24: Commit `16fc6eb`, Merge `7d7d642`
  - Phase 23: Commit `2f3aed1`, Merge `78cf2d9`
  - Phase 22: Commit `cdfdacb`, Merge `30746cd`
  - Phase 21: Commit `6ffffa2`, Merge `e0607a3`
  - Phase 20: Commit `9cbeafc`, Merge `b1c6d40`

---

## 3. Phase 25 Completion Context

**REPOSITORY FACT**: Phase 25 implemented the derived, request-scoped cross-project contract interoperability matrix (`system-contract-matrix.service.ts`). It reuses:
- **Phase 14**: Project topology links (`ProjectTopologyLink`) and ACL isolation (`checkUserProjectReadAccess`).
- **Phase 18**: Baseline alignment and cross-project contract lineage (`system-baseline-alignment.service.ts`).
- **Phase 23**: Structural contract diffing (`parseAndCanonicalizeContract`, OpenAPI endpoint and schema comparison).
- **Phase 24**: ACL-safe derived analysis without persistence side-effects.

**REPOSITORY FACT**: Phase 25 establishes a 6-tier interoperability state hierarchy evaluated per project-pair cell in an $N \times N$ grid:
1. `NO_RELEVANT_CONTRACT_DEPENDENCY`
2. `MISSING_AUTHORITATIVE_CONTRACT`
3. `UNSUPPORTED_CONTRACT`
4. `BREAKING_CONTRACT_DELTA`
5. `STRUCTURALLY_MISALIGNED`
6. `ALIGNED`

**IMPORTANT PRODUCT BOUNDARY (PHASE 25 LIMITATION)**:
- Phase 25 is strictly a **diagnostic and discovery tool**. It identifies *where* contract breakages and misalignments exist in a project topology.
- Phase 25 does **NOT** prove semantic or runtime code interoperability (it explicitly compares structural OpenAPI contracts and baseline alignment snapshots).
- Phase 25 does **NOT** generate remediation steps or construct multi-project change packages to resolve detected incompatibilities.

---

## 4. Remaining Product Gap

**INFERENCE**: Analyzing user workflows after Phase 25 reveals a critical, unresolved product gap:

When an Enterprise System Architect, Project Lead, or Technical Steward uses Phase 25, they inspect the $N \times N$ matrix and discover that:
- Consumer Project C and Provider Project P have a **`BREAKING_CONTRACT_DELTA`** (e.g. Provider removed endpoint `DELETE /v1/users/:id` or altered a required payload field).
- Consumer Project C and Provider Project P are **`STRUCTURALLY_MISALIGNED`** (e.g. Consumer C references Provider P's Baseline `v1.0`, but Provider P published Baseline `v2.0`).
- Provider Project P has a **`MISSING_AUTHORITATIVE_CONTRACT`** (e.g. Document D lacks an attached OpenAPI specification or active baseline).

**The Unresolved User Question**:
> *"Now that we discovered breaking contract deltas and misalignments in the matrix, what exact, ordered remediation actions must be taken across affected projects, who must perform them, and how do we assemble a multi-project change package to execute the fix cleanly?"*

Currently, Documan leaves the user stranded at discovery. To resolve a contract breakage found in Phase 25:
1. The user must manually investigate every failing contract cell.
2. The user must manually determine which documents in Provider Project P and Consumer Project C require edits or baseline updates.
3. The user must manually draft individual single-document `DocumentChangeProposal` items (Phase 15).
4. The user must manually group these proposals into a `DocumentChangePackage` (Phase 16).
5. The user must manually figure out the correct topological sequence of changes (e.g., update Provider spec first, then update Consumer client docs, then update baseline references).

Documan has a discovery matrix (Phase 25) and a change package execution container (Phase 16), but **lacks an automated bridge** that converts diagnostic matrix findings into a dependency-ordered **Remediation Action Plan** and a pre-configured **Draft Change Package Payload**.

---

## 5. User Problems Still Unsolved

Despite 25 completed phases, users operating Documan across complex project topologies still face these unsolved operational decisions:

1. **Remediation Action Planning**: *"Given 4 broken contract cells in our system topology matrix, what is the exact step-by-step sequence of document edits, spec re-imports, and baseline updates required to restore 100% system alignment?"*
2. **Coordinated Change Package Synthesis**: *"How can we automatically bundle the necessary single-document change proposals for a cross-project contract fix into a single Phase 16 Change Package without manually hand-crafting every proposal?"*
3. **Downstream Gate Blast-Radius Forecasting**: *"If Provider Project P publishes Baseline v2.0 containing breaking delta X, which downstream release gates across our 10 consumer projects will turn from PASSED to BLOCKED, and which policy waivers will be invalidated?"*
4. **Obsolete Waiver Reconciliation**: *"Now that Consumer Project C updated its baseline reference to align with Provider P, which active policy waivers in our database are now redundant and should be revoked to eliminate waiver debt?"*
5. **Cross-Project Stewardship Continuity**: *"Which cross-project contract boundaries lack active, assigned stewards on both provider and consumer sides, causing remediation action items to go unaddressed?"*

---

## 6. Repository Evidence

Grounding our analysis in authoritative repository implementation:

1. **REPOSITORY FACT**: [`apps/api/src/modules/governance/system-contract-matrix.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-matrix.service.ts)
   - Evaluates pair-wise project contract compatibility across authorized topology nodes.
   - Generates `criticalIncompatibilities` array containing `consumerProjectId`, `providerProjectId`, `interoperabilityState`, `reason`, and static `remediation` text string.
   - Does **not** inspect individual document version diffs to generate concrete proposal payloads or dependency-ordered step lists.

2. **REPOSITORY FACT**: [`apps/api/src/modules/change-proposals/document-change-proposal.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-proposals/document-change-proposal.model.ts)
   - Supports 4 proposal types: `DOCUMENT_CONTENT_UPDATE`, `TECHNICAL_CONTRACT_UPDATE`, `RELATIONSHIP_UPDATE`, `DEPRECATION_PROPOSAL`.
   - Requires explicit `targetDocumentId`, `proposedContent`, `proposedRelationships`, or `proposedSpecContent`.

3. **REPOSITORY FACT**: [`apps/api/src/modules/change-packages/document-change-package.model.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-packages/document-change-package.model.ts)
   - Container model grouping multiple `proposalIds` under a single project boundary.
   - Reuses Phase 15 single-proposal simulations to run coordinated overlay simulations (`runChangePackageSimulation`).
   - Requires proposals to be created and persisted in the database *before* they can be added to a package.

4. **REPOSITORY FACT**: [`apps/api/src/modules/governance/system-contract-evolution.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-evolution.service.ts)
   - Detects 7 structural delta types: `ENDPOINT_REMOVED`, `ENDPOINT_DEPRECATED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_ADDED`.
   - Generates `DEPENDENCY_ORDERED_IMPACT_SEQUENCE` based on topological depth.

5. **REPOSITORY FACT**: [`apps/api/src/modules/governance/system-topology-simulation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-topology-simulation.service.ts)
   - Runs side-effect-free in-memory What-If gate simulations given hypothetical baselines, attestations, or waivers.

**INFERENCE**: All underlying technical primitives exist across Phases 14, 15, 16, 23, and 25. However, no service currently synthesizes Phase 25 contract matrix findings into an actionable, dependency-ordered **Contract Remediation Action Plan** with a draft **Phase 16 Change Package Payload**.

---

## 7. Candidate Capabilities

We generate 5 candidate capabilities designed to solve remaining post-Phase 25 gaps:

- **Candidate 1**: System-Wide Contract Remediation Action Plan & Multi-Project Change Package Synthesizer
- **Candidate 2**: Downstream System Topology Release Gate Blast-Radius & Cascading Risk Forecaster
- **Candidate 3**: Obsolete Policy Waiver Reconciliation & Post-Alignment Release Certification Engine
- **Candidate 4**: Cross-Project Technical Contract Stewardship Continuity & Governance Responsibility Engine
- **Candidate 5**: Multi-Project Baseline Migration Safety & Coordinated Lineage Migration Analyzer

---

## 8. Candidate 1 — System-Wide Contract Remediation Action Plan & Multi-Project Change Package Synthesizer

### 1. User Problem
When Phase 25 identifies contract misalignments or breaking deltas across an $N \times N$ matrix, project leads must manually determine how to fix them. Manually drafting single-document proposals, ordering them across project boundaries, and grouping them into change packages is tedious, error-prone, and slow.

### 2. Existing Repository Capability
- Phase 25 matrix (`system-contract-matrix.service.ts`) identifies failing contract cells.
- Phase 23 contract evolution diffing (`system-contract-evolution.service.ts`) identifies breaking contract deltas.
- Phase 15 proposals (`document-change-proposal.model.ts`) and Phase 16 packages (`document-change-package.model.ts`) provide the change container infrastructure.

### 3. Exact Remaining Gap
Lack of a derived engine that converts detected contract matrix breakages into an explicit, dependency-sequenced **Remediation Action Plan** (step-by-step document/spec updates) and a ready-to-submit **Draft Change Package Payload** for Phase 16 execution.

### 4. Why Existing Phases Do Not Solve It
Phase 25 only displays diagnostic matrix states. Phase 16 provides the package container but requires humans to manually author every proposal and figure out package assembly. No phase connects matrix failure analysis directly to change package creation payloads.

### 5. Product Value
High. Transforms Documan from a passive governance reporting dashboard into an active change decision and remediation orchestration platform.

### 6. Architectural Fit
Seamless. Acts as a read-only query service (`system-contract-remediation.service.ts`) operating above Phase 25, Phase 23, Phase 15, and Phase 16.

### 7. Reuse of Existing Authorities
Reuses Phase 14 (Topology & ACL), Phase 15 (Proposal schema definitions), Phase 16 (Package payload structure), Phase 23 (Structural diffing), Phase 25 (Matrix evaluation).

### 8. Persistence Requirements
**0 new models (Persistence = 0)**. Synthesizes transient remediation action plans and change package draft payloads in-memory.

### 9. Complexity
Moderate. In-memory graph traversal, dependency sorting, and draft proposal schema generation.

### 10. Security Implications
Strict Phase 14 ACL graph isolation (`checkUserProjectReadAccess`). Unauthorized projects, documents, and contract steps are 100% omitted from the plan.

### 11. Risk of Scope Drift
Low. Does not automate code refactoring, Git commits, or CI/CD deployments. Generates document-centric change package payloads only.

### 12. Completion Impact
Materially advances Documan toward a finished product by completing the governance loop: **Discovery (Phase 25) $\rightarrow$ Action Planning & Package Synthesis (Phase 26) $\rightarrow$ Simulation & Execution (Phase 16) $\rightarrow$ Fulfillment Attestation (Phase 17)**.

---

## 9. Candidate 2 — Downstream System Topology Release Gate Blast-Radius & Cascading Risk Forecaster

### 1. User Problem
When a provider project introduces a contract change or baseline update, system architects cannot predict which downstream consumer release gates across the topology graph will turn from PASSED to BLOCKED or which active waivers will be invalidated.

### 2. Existing Repository Capability
Phase 14 topology graph, Phase 19 system topology gates, Phase 20 policy waivers, Phase 21 single-root what-if simulation.

### 3. Exact Remaining Gap
Phase 21 evaluates release status for a single root project given manual hypothetical inputs. It does not calculate the forward blast-radius cascade of a provider contract change across all downstream consumer release gates in the topology graph.

### 4. Why Existing Phases Do Not Solve It
Phase 21 is root-centric (evaluates if root project X passes given overrides). Phase 23 computes contract delta blast-radius in terms of document/project counts, but not release gate state transitions (`PASSED` $\rightarrow$ `BLOCKED`).

### 5. Product Value
High for risk management, but partially overlaps with Phase 21 What-If simulation capabilities.

### 6. Architectural Fit
Good. Derived query service over Phase 19 and Phase 21.

### 7. Reuse of Existing Authorities
Reuses Phase 14, Phase 19, Phase 20, Phase 21.

### 8. Persistence Requirements
0 new models (Persistence = 0).

### 9. Complexity
Moderate-High. Forward graph traversal with multi-node gate re-evaluation.

### 10. Security Implications
Permission-aware graph scoping.

### 11. Risk of Scope Drift
Low-Medium. Risk of duplicating Phase 21 simulation logic.

### 12. Completion Impact
Incremental improvement to pre-change simulation, but less fundamental than closing the discovery-to-remediation loop.

---

## 10. Candidate 3 — Obsolete Policy Waiver Reconciliation & Post-Alignment Release Certification Engine

### 1. User Problem
After contract misalignments are fixed, temporary policy waivers (Phase 20) granted during the breakage remain active in the database, accumulating "waiver debt" and weakening governance integrity.

### 2. Existing Repository Capability
Phase 20 `SystemGovernanceWaiver` model, Phase 19 system gate, Phase 25 contract matrix.

### 3. Exact Remaining Gap
Lack of an automated reconciliation engine that detects active waivers whose underlying contract blockers are now resolved (`ALIGNED`) and issues revocation recommendations.

### 4. Why Existing Phases Do Not Solve It
Phase 20 handles temporal expiration and manual revocation; it does not analyze whether contract fixes have rendered active waivers redundant.

### 5. Product Value
Moderate-High for audit hygiene and compliance, but narrower in user workflow impact.

### 6. Architectural Fit
Good. Derived service querying `SystemGovernanceWaiver` and Phase 25 matrix states.

### 7. Reuse of Existing Authorities
Reuses Phase 19, Phase 20, Phase 25.

### 8. Persistence Requirements
0 new models (Persistence = 0).

### 9. Complexity
Low-Moderate.

### 10. Security Implications
Requires Project Owner / Admin permission to view waiver reconciliation recommendations.

### 11. Risk of Scope Drift
Low.

### 12. Completion Impact
Useful governance utility, but does not solve the primary post-matrix remediation workflow problem.

---

## 11. Candidate 4 — Cross-Project Technical Contract Stewardship Continuity & Governance Responsibility Engine

### 1. User Problem
When contract breakages occur between Provider P and Consumer C, remediation stalls because no clear human accountability is assigned to the cross-project contract interface itself.

### 2. Existing Repository Capability
Phase 5 users, Phase 7.5 single-document `stewardId`, Phase 14 topology links, Phase 25 contract matrix.

### 3. Exact Remaining Gap
Phase 7.5 tracks stewardship on individual documents within a single project. It does not map dual-ended cross-project contract stewardship pairs (Provider Steward $\leftrightarrow$ Consumer Steward) or detect unmanaged topology connections.

### 4. Why Existing Phases Do Not Solve It
Phase 7.5 is document-scoped within a project. Phase 25 evaluates structural contract compatibility but ignores human stewardship assignments.

### 5. Product Value
Moderate. Useful for organizational governance, but risks feeling like an org-chart utility if separated from change workflows.

### 6. Architectural Fit
Good. Reuses Phase 7.5 metadata and Phase 14 topology.

### 7. Reuse of Existing Authorities
Reuses Phase 5, Phase 7.5, Phase 14.

### 8. Persistence Requirements
0 new models (Persistence = 0). Reuses `Document.stewardId` and `Project.ownerId`.

### 9. Complexity
Low.

### 10. Security Implications
ACL checks on user and project privacy.

### 11. Risk of Scope Drift
Medium (risk of drifting into HR / team management tooling).

### 12. Completion Impact
Incremental governance improvement.

---

## 12. Candidate 5 — Multi-Project Baseline Migration Safety & Coordinated Lineage Migration Analyzer

### 1. User Problem
When Provider P releases Baseline `v2.0`, Consumer C (pinned to Baseline `v1.0`) wants to upgrade its reference, but cannot evaluate whether upgrading will break local document links, invalidate contract schemas, or block release gates.

### 2. Existing Repository Capability
Phase 12 baselines, Phase 18 baseline alignment, Phase 21 simulation, Phase 23 contract evolution diffing, Phase 25 matrix.

### 3. Exact Remaining Gap
Phase 18 reports structural misalignment (`STRUCTURALLY_MISALIGNED`). Phase 23 diffs baseline specs. Documan lacks a migration safety analyzer that evaluates whether Consumer C can safely update its baseline reference to Provider P's latest version.

### 4. Why Existing Phases Do Not Solve It
Phase 18 is diagnostic (Boolean misalignment). Phase 23 diffs two contract versions in isolation without evaluating Consumer C's specific document links or release gates.

### 5. Product Value
High for baseline lifecycle management.

### 6. Architectural Fit
Excellent. Derived query service over Phase 18, 21, 23, and 25.

### 7. Reuse of Existing Authorities
Reuses Phase 12, 18, 21, 23, 25.

### 8. Persistence Requirements
0 new models (Persistence = 0).

### 9. Complexity
Moderate.

### 10. Security Implications
Permission-safe graph traversal.

### 11. Risk of Scope Drift
Low.

### 12. Completion Impact
High, but scoped specifically to baseline upgrades rather than general contract breakages and missing evidence.

---

## 13. Candidate Scoring

We evaluate all 5 candidates across 10 transparent criteria on a 0–10 scale:

| Evaluation Criteria | Weight | Cand 1 (Remediation Plan & Package Synthesizer) | Cand 2 (Gate Blast-Radius) | Cand 3 (Waiver Reconciliation) | Cand 4 (Contract Stewardship) | Cand 5 (Baseline Migration Safety) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Product Value** | 15% | **10** (9.5) | 8 (8.0) | 7 (7.0) | 6 (6.0) | 9 (8.5) |
| **Alignment with Thesis** | 10% | **10** (10.0) | 9 (9.0) | 8 (8.0) | 8 (8.0) | 9 (9.0) |
| **Differentiation** | 10% | **10** (10.0) | 8 (8.0) | 8 (8.0) | 7 (7.0) | 9 (9.0) |
| **Reuse of Architecture** | 10% | **10** (10.0) | 9 (9.0) | 9 (9.0) | 9 (9.0) | 9 (9.0) |
| **Technical Feasibility** | 10% | **9** (9.0) | 7 (7.0) | 9 (9.0) | 9 (9.0) | 8 (8.0) |
| **Governance/Traceability**| 10% | **10** (10.0) | 8 (8.0) | 9 (9.0) | 8 (8.0) | 8 (8.0) |
| **Scope Discipline** | 10% | **9** (9.0) | 8 (8.0) | 9 (9.0) | 8 (8.0) | 9 (9.0) |
| **Security / ACL Safety** | 10% | **10** (10.0) | 9 (9.0) | 10 (10.0) | 9 (9.0) | 10 (10.0) |
| **Performance Feasibility**| 5% | **9** (9.0) | 7 (7.0) | 9 (9.0) | 9 (9.0) | 8 (8.0) |
| **Completion Impact** | 10% | **10** (10.0) | 8 (8.0) | 7 (7.0) | 6 (6.0) | 8 (8.0) |
| **TOTAL SCORE** | **100%**| **9.65 / 10** | **8.15 / 10** | **8.40 / 10** | **7.80 / 10** | **8.75 / 10** |

---

## 14. Recommended Candidate

**RECOMMENDED CAPABILITY**: **Candidate 1 — System-Wide Contract Remediation Action Plan & Multi-Project Change Package Synthesizer**.

### Rationale
Phase 25 provided system-wide contract incompatibility discovery ($N \times N$ matrix). However, discovery without actionable remediation planning leaves users stranded. Candidate 1 directly solves the primary post-matrix workflow gap: it analyzes broken or misaligned contract cells from Phase 25, generates a step-by-step, dependency-sequenced **Remediation Action Plan**, and synthesizes a pre-configured **Draft Change Package Payload** ready for Phase 16 execution.

This closes the core product loop:
$$\text{Matrix Failure Discovery (Phase 25)} \rightarrow \text{Remediation Plan \& Package Synthesis (Phase 26)} \rightarrow \text{Package Simulation (Phase 16)} \rightarrow \text{Fulfillment Attestation (Phase 17)}$$

---

## 15. Why Existing Phases Do Not Solve It

1. **Phase 25** computes structural contract interoperability states (`BREAKING_CONTRACT_DELTA`, `STRUCTURALLY_MISALIGNED`, `MISSING_AUTHORITATIVE_CONTRACT`). However, its output is strictly diagnostic. It provides static text suggestions but cannot analyze target document versions, construct diffs, generate proposal schemas, or sequence remediation steps across project boundaries.
2. **Phase 16** provides the database model and simulation engine for multi-document change packages (`DocumentChangePackage`). However, Phase 16 requires users to manually create individual proposals for each document and manually group them. It has zero capability to inspect contract breakages and synthesize package payloads automatically.
3. **Phase 15** provides single-document change proposal schemas (`DocumentChangeProposal`). It has no awareness of multi-project contract topologies or automated action plan sequencing.
4. **Phase 23** detects 7 structural contract delta types (`ENDPOINT_REMOVED`, etc.) between two baseline versions, but does not generate actionable document editing steps or proposal payloads.
5. **Phase 11** generates single-project verification plans for human tasks, but does not synthesize multi-project change packages or contract remediation action plans.

---

## 16. Product Workflow

The recommended Phase 26 workflow follows a clean, 4-step sequence:

```text
Step 1: Discover Contract Incompatibility (Phase 25 Matrix)
   └─► User views N x N Interoperability Matrix
   └─► Clicks cell showing BREAKING_CONTRACT_DELTA or STRUCTURALLY_MISALIGNED

Step 2: Generate Remediation Action Plan (Phase 26 Service)
   └─► POST /api/v1/projects/:projectId/contract-remediation-plan
   └─► Engine calculates dependency-ordered action steps:
       - Step 1: Update Provider Spec / Document Version
       - Step 2: Update Consumer Document Endpoint Link / Content
       - Step 3: Upgrade Consumer Baseline Reference
   └─► Outputs Remediation Action Plan + Draft Change Package Payload

Step 3: Submit Draft Change Package (Phase 16 Handoff)
   └─► User reviews synthesized proposals in UI drawer
   └─► Clicks "Create Coordinated Change Package"
   └─► Calls POST /api/v1/projects/:projectId/change-packages with draft payload

Step 4: Simulate & Attest (Phases 16 & 17)
   └─► Runs overlay simulation (Phase 16)
   └─► Executes version updates & attests fulfillment (Phase 17)
   └─► Phase 25 Matrix automatically transitions cell to ALIGNED!
```

---

## 17. Architectural Composition

Phase 26 will be implemented as a read-only query service:
[`apps/api/src/modules/governance/system-contract-remediation.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-remediation.service.ts)

### Core DTO Interfaces
```typescript
export interface ContractRemediationStepDTO {
  stepNumber: number;
  projectId: string;
  projectName: string;
  targetDocumentId: string;
  targetDocumentTitle: string;
  actionType: 'UPDATE_TECHNICAL_CONTRACT' | 'UPDATE_DOCUMENT_CONTENT' | 'REBIND_API_ENDPOINT' | 'UPGRADE_BASELINE_REFERENCE';
  description: string;
  suggestedChanges: {
    proposedContent?: string;
    proposedSpecContent?: string;
    targetBaselineId?: string;
    targetEndpointId?: string;
  };
  prerequisiteStepNumbers: number[];
}

export interface DraftChangeProposalPayloadDTO {
  targetDocumentId: string;
  proposalType: 'TECHNICAL_CONTRACT_UPDATE' | 'DOCUMENT_CONTENT_UPDATE' | 'RELATIONSHIP_UPDATE';
  title: string;
  description: string;
  proposedChanges: Record<string, any>;
}

export interface SystemContractRemediationPlanResponseDTO {
  targetProjectId: string;
  evaluatedAt: string;
  interoperabilitySummary: {
    totalIncompatiblePairs: number;
    breakingDeltaPairs: number;
    misalignedPairs: number;
    missingContractPairs: number;
  };
  remediationSteps: ContractRemediationStepDTO[];
  draftPackagePayload: {
    packageName: string;
    description: string;
    targetProjectId: string;
    proposals: DraftChangeProposalPayloadDTO[];
  };
}
```

---

## 18. Security / ACL

1. **Permission Boundary**: Reuses Phase 14 `checkUserProjectReadAccess`.
2. **Graph Traversal Privacy**: If a user lacks `READ` permission on a connected project, that project, its documents, and its remediation steps are **100% omitted** from the response payload.
3. **IDOR Protection**: Validates that all target document IDs and project IDs in the synthesized remediation plan belong to projects authorized for the requesting user.
4. **Zero Count Leakage**: Omitted unauthorized nodes do not leak project titles, document titles, or hidden count metrics.

---

## 19. Performance

1. **Bounded Graph Traversal**:
   - `MAX_AUTHORIZED_PROJECTS = 50`
   - `MAX_TOPOLOGY_EDGES = 100`
   - `MAX_REMEDIATION_STEPS = 50`
2. **Batch Querying**: Uses MongoDB `$in` bulk queries for documents, baselines, and spec models, preventing $N+1$ database queries.
3. **In-Memory Synthesis**: Remediation action plan sequencing and payload synthesis execute purely in-memory with sub-100ms response latency for typical topologies.

---

## 20. Persistence

**0 NEW DATABASE MODELS (Persistence = 0)**.

- Phase 26 operates strictly as a derived, request-scoped query engine.
- Synthesizes remediation action plans and draft change package payloads in-memory.
- When the user chooses to submit the synthesized draft payload, it reuses existing Phase 15 (`DocumentChangeProposal`) and Phase 16 (`DocumentChangePackage`) database models without creating new database collections.

---

## 21. Product Boundary

Phase 26 strictly obeys Documan product boundaries:

- **NOT Jira / Task Management**: Does not create generic tickets, sprint tasks, or assignment boards.
- **NOT GitHub / VCS**: Does not generate Git commits, pull requests, or branch merges.
- **NOT CI/CD Runner**: Does not trigger build runners, Docker image builds, or cloud deployments.
- **NOT AI / LLM**: Uses zero non-deterministic LLM text generation or vector search. All remediation steps and diff suggestions are derived deterministically from structural OpenAPI contracts and document schemas.

---

## 22. Risks & Mitigations

1. **Risk**: Remediation action steps could propose invalid or incomplete document diffs for complex YAML/JSON specs.
   - **Mitigation**: Synthesized proposals mark complex structural changes as `REQUIRES_HUMAN_REVIEW` with clear structural guidance, relying on Phase 16 simulation to validate compatibility before acceptance.
2. **Risk**: Large topologies with recursive dependencies could cause step ordering loops.
   - **Mitigation**: Incorporates cycle detection during topological sorting, flagging cyclic dependencies as `CIRCULAR_REMEDIATION_BLOCKED`.

---

## 23. Alternatives Rejected

- **Rejected Candidate 2 (Gate Blast-Radius)**: Partially duplicates Phase 21 What-If simulation without providing actionable remediation steps.
- **Rejected Candidate 3 (Waiver Reconciliation)**: Narrow utility focused on waiver cleanup rather than solving primary contract breakages.
- **Rejected Candidate 4 (Contract Stewardship)**: Risks drifting into organizational/HR management without solving technical contract breakages.
- **Rejected Candidate 5 (Baseline Migration Safety)**: Scoped strictly to baseline upgrades, ignoring breaking spec deltas and missing contracts.

---

## 24. Completion Impact

**Completion Test Answer**:
> *"If we implement Phase 26 (System-Wide Contract Remediation Action Plan & Multi-Project Change Package Synthesizer), Documan materially becomes closer to a finished product."*

**Why**:
Before Phase 26, Documan could discover contract breakages (Phase 25) and execute multi-document change packages (Phase 16), but required humans to manually bridge the gap by hand-crafting proposals and step sequences. Phase 26 completes this critical governance loop, turning passive matrix discovery into an automated, actionable remediation workflow.

---

## 25. Recommendation

Proceed with **Phase 26: System-Wide Contract Remediation Action Plan & Multi-Project Change Package Synthesizer**.

- **Endpoint**: `POST /api/v1/projects/:projectId/contract-remediation-plan`
- **Persistence**: 0 new database models (Persistence = 0).
- **Workers**: 0 background workers.
- **Audit**: 0 audit log writes on GET/POST analysis queries (audit events logged only when user explicitly accepts and submits the synthesized change package via Phase 16).

---

## 26. Open Questions

1. Should the remediation plan endpoint accept optional input filters (e.g. `targetProviderProjectId` or `severityFilter: 'BREAKING_ONLY'`) to scope remediation planning to a specific subset of matrix breakages?
2. When a synthesized remediation plan contains baseline reference upgrade steps, should it include recommended Phase 12 baseline names/tags in the draft payload?
