# Phase 19 Research v3 — Cross-Project System Topology Governance Gate

## Status

**FINAL RESEARCH REVISION v3 COMPLETE — PENDING IMPLEMENTATION AUTHORIZATION**

Research Artifact: `docs/research/PHASE-19-RESEARCH-v3.md`  
Author: Documan Product & Architecture Team  
Baseline Commit: `ae08127` (`docs(roadmap): close out Phase 18`)

---

## Revision From v2

Phase 19 Research v3 incorporates final semantic corrections to make the governance model implementation-safe, mathematically rigorous, and fully grounded in the codebase on `main` (`ae08127`):

1. **Complete Governance Disabled Semantics & Decision Matrix**: Resolves `GOVERNANCE_DISABLED` deterministically by establishing explicit decision tables separating root consumer governance settings from upstream provider governance settings, eliminating ambiguous terms such as "non-blocking".
2. **Boolean `passed` Semantics Clarification**: Re-evaluates `passed: boolean` to prevent `GOVERNANCE_DISABLED` from being falsely interpreted as "Documan approved this system", defining strict evaluation guidelines for CI/CD integrations.
3. **Deterministic Governance Decision Matrices**: Introduces four mandatory decision tables mapping all combinations of root/provider governance states, alignment states, attestation provenance, evidence completeness, and ACL authorization boundaries across `BLOCKED`, `INDETERMINATE`, `PASSED`, and `GOVERNANCE_DISABLED`.
4. **Attestation Requirement Semantics**: Clarifies that missing attestation (`providerAttested: false`) is known evidence of absence resulting in `BLOCKED` (when strict attestation policy is enabled), whereas missing required baseline data results in `INDETERMINATE`.
5. **Token Architecture Simplification**: Re-evaluates Phase 10 `GateToken` credentials and explicitly **removes** the proposed second signed payload token (`SystemGateEvaluationPayload`), eliminating redundant token complexity, signed payload overhead, and token replay risks while maintaining a 100% read-only, zero-persistence model.
6. **Product & Scope Terminology Guardrails**: Formally defines "Gate" as a **deterministic Documan governance evaluation checkpoint**, explicitly excluding deployment orchestration, cloud credentials, or CI/CD build execution.

---

## Research Baseline

Documan has completed Phases 1 through 18, establishing a multi-layered platform for technical document management, automated governance, change impact simulation, baseline drift control, cross-project architecture topology, fulfillment verification with immutable attestations, and cross-project contract baseline alignment verification.

### Completed Authority Surface (Phases 7.3 – 18)

| Phase | Core Capability | Authority Primitive / Model | API / Endpoint |
|---|---|---|---|
| **7.3** | Cross-Document Impact Cascade | `document-impact-cascade.service.ts` | `GET /api/v1/documents/:id/impact` |
| **7.4** | Immutable Versioning | `DocumentVersion` | `POST /api/v1/documents/:id/versions` |
| **7.5** | Technical Knowledge Risk Radar | `knowledge-risk-calculator.ts` | `GET /api/v1/projects/:id/risk-radar` |
| **8** | Authoritative Knowledge Discovery | `knowledge.service.ts` | `GET /api/v1/knowledge/search` |
| **9** | Documentation Evidence & Traceability | `evidence-calculator.ts` | `GET /api/v1/projects/:id/evidence` |
| **10** | Governance & Programmatic CI/CD Gates | `ReleaseGateEvaluator`, `GateToken` | `POST /api/v1/projects/:id/release-gate-check` |
| **11** | Change Intelligence & Verification Planning | `VerificationPlan`, `VerificationTask` | `POST /api/v1/documents/:id/verification-plan` |
| **12** | Documentation Baseline & Drift Control | `DocumentationBaseline` | `POST /api/v1/projects/:id/baselines` |
| **13** | Work Requests & Review Workflow | `DocumentationWorkRequest` | `POST /api/v1/projects/:id/work-requests` |
| **14** | Architecture Topology & Contract Governance | `ProjectTopologyLink` | `GET /api/v1/projects/:id/topology` |
| **15** | Pre-Change Impact Simulation & Proposals | `DocumentChangeProposal` | `POST /api/v1/documents/:id/proposals` |
| **16** | Multi-Document Change Packages | `DocumentChangePackage` | `POST /api/v1/projects/:id/change-packages` |
| **17** | Fulfillment Verification & Attestation | `PackageFulfillmentAttestation` | `POST /api/v1/change-packages/:id/attest` |
| **18** | Cross-Project Baseline Contract Lineage | Derived Alignment Engine | `GET /api/v1/projects/:id/system-baseline-alignment` |

---

## Product Context

Documan is a technical document management platform designed specifically for software engineering organizations. Its core value lies in making technical documentation **authoritative**, **traceable**, **governed**, and **integrated into software development lifecycles**.

### Core Product Directives
1. **Document-Centric Identity**: Every feature must strengthen document authority, relationship transparency, and organizational knowledge integrity.
2. **Deterministic Governance**: Governance calculations, baseline drift, fulfillment attestations, and alignment metrics must be reproducible and mathematically defensible.
3. **ACL-Safe Subgraph Scoping**: All cross-project traversals and metrics must respect project-level read authorizations (`checkUserProjectReadAccess`), never leaking restricted entity metadata or zero-count existence.
4. **Zero Redundancy**: New capabilities must build upon existing primitives without duplicating underlying database schemas or business logic.

---

## Current Capability Surface

A comprehensive review of the active codebase on `main` (`ae08127`) reveals the operational subsystems across governance, baselines, topology, and attestations.

---

## Phase 10 Boundary

Inspection of `apps/api/src/modules/governance/release-gate-evaluator.service.ts` and `governance.service.ts` defines the exact scope of Phase 10:

- **Function**: `evaluateReleaseGateInternal(projectId)`
- **Evaluation Scope**: Strictly **project-local** to `projectId`.
- **Inputs Evaluated**:
  - Active non-deleted documents where `Document.projectId === projectId`.
  - Document statuses: `APPROVED`, `STALE`, `IN_REVIEW`, `DEPRECATED`, `DRAFT`.
  - Review freshness: `lastReviewedAt` or `createdAt` vs `project.governanceSettings.maxUnreviewedDays`.
  - Pending reviewer requests (`DocumentReview.status === 'PENDING'`).
  - API endpoint link integrity (`DocumentEndpointLink.status === 'ORPHANED'` or linked to deprecated `ProjectApiEndpoint`).
  - Active verification plans (`VerificationPlan.status` in `['PENDING', 'IN_PROGRESS']`).
  - Project-local baseline drift (`calculateProjectBaselineDrift(projectId)`).
- **Gate Token Credential**:
  - `createProjectGateToken` generates an API credential (`documan_gate_<hex>`) stored as SHA-256 `tokenHash` in `project.gateTokens`.
  - Used by CI/CD build scripts to authenticate HTTP requests to `POST /api/v1/projects/:projectId/release-gate-check`.
- **Phase 10 Output**: `ReleaseGateCheckResult` returning `passed: boolean` and `status: 'PASSED' | 'BLOCKED' | 'GOVERNANCE_DISABLED'`.
- **Phase 10 Boundary Limitation**: Phase 10 has zero visibility into connected projects, cross-project topology links, external baseline snapshot alignment, or provider fulfillment attestations.

---

## Phase 19 Distinction

Phase 19 is **NOT** merely "Phase 10 applied recursively to connected projects." It introduces a materially distinct **System-Level Governance Decision**:

| Dimension | Phase 10: Project-Local Governance Gate | Phase 19: Cross-Project System Governance Gate |
|---|---|---|
| **Evaluation Scope** | Single project (`projectId`) in total isolation. | Multi-project authorized topology graph ($V_{\text{auth}}, E_{\text{auth}}$). |
| **Evaluated Entities** | Local `Document`, `DocumentReview`, `VerificationPlan`, local `DocumentationBaseline` drift. | Local Phase 10 gate + Phase 14 `ProjectTopologyLink` + Phase 18 baseline alignment + Phase 17 attestation provenance + provider Phase 10 gates. |
| **Dependency Awareness** | Zero visibility into connected upstream/downstream project health. | Full visibility across cross-project `DEPENDS_ON` contract links (up to `MAX_DEPTH = 3`). |
| **Primary Question Answered** | *"Are the local documents in Project A fresh and reviewed?"* | *"Is Project A safe to release within its connected system topology contract network?"* |
| **Governance Decision** | Local project gate decision (`PASSED`, `BLOCKED`). | System-wide topology gate decision (`PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`). |

---

## Phase 14 Boundary

- **Function**: `project-topology.service.ts` establishes and validates directed cross-project links (`ProjectTopologyLink`) between projects (`DEPENDS_ON`, `INTEGRATES_WITH`, `PROVIDES_API_TO`).
- **Enforcement**: Blocks creating cross-project `DocumentRelationship` records unless an active `ProjectTopologyLink` exists between the respective projects.
- **Privacy**: Implements permission-safe topology graphs (`getProjectTopologyGraph`) using `checkUserProjectReadAccess`, omitting unauthorized nodes and edges.

---

## Phase 17 Boundary

- **Function**: `change-package-attestation.service.ts` verifies and stores immutable fulfillment attestations (`PackageFulfillmentAttestation`) for accepted change packages (`DocumentChangePackage`).
- **Matching & Provenance**: Matches `(documentId, documentVersionId, checksum)` against `verifiedVersionSnapshot`. Detects head drift (`attestationStale: true`).
- **Handoff**: Generates Baseline Eligibility Handoff Payloads for Phase 12 baseline creation.

---

## Phase 18 Boundary

- **Function**: `system-baseline-alignment.service.ts` performs query-time, read-only cross-project baseline alignment calculation (`GET /api/v1/projects/:projectId/system-baseline-alignment`).
- **Alignment Model**: Compares consumer active baseline snapshot references against provider active baseline snapshots for cross-project `DEPENDS_ON` relationships.
- **Outputs**: Derived alignment unit states (`ALIGNED`, `MISALIGNED`, `INDETERMINATE`), aggregate alignment state (`ALIGNED`, `PARTIALLY_ALIGNED`, `MISALIGNED`, `INDETERMINATE`, `ZERO_APPLICABLE_EVIDENCE`), System Alignment Score ($\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$), and Evidence Completeness ($\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$).

---

## Remaining Product Gaps

While Phases 10, 14, 17, and 18 exist independently, a major architectural gap remains in Documan's governance lifecycle:

**The System Topology Governance Gate Gap**:
A consumer project (Project A) can pass its local Phase 10 release gate check with 100% freshness and receive an approved `GateToken`, despite the fact that:
1. Upstream provider projects (Project B) in Project A's authorized topology graph have failing local release gates or unreviewed baseline drift.
2. Project A's active baseline snapshot reference to Project B's contract is `MISALIGNED` (Phase 18).
3. Project B's active baseline is unattested (Phase 17 `providerAttested: false`).

Phase 10 evaluates local document freshness in isolation. Phase 18 measures contract alignment, but does NOT compute an actionable system-level release gate decision or synthesize multi-project release readiness.

---

## Candidate 1 — Cross-Project System Topology Governance Gate

### Name
**Cross-Project System Topology Governance Gate**

### Problem
CI/CD pipelines deploying Project A poll Phase 10 (`POST /api/v1/projects/:projectId/release-gate-check`) and receive a green light based solely on local document freshness, completely unaware that Project A's upstream contract dependencies in the system topology are broken, misaligned, or unattested.

### Current Gap
Lack of a topology-aware governance evaluation engine that synthesizes local project health, cross-project topology links, baseline contract alignment, and provider attestation provenance into an aggregate system release decision.

### Proposed Capability
A derived, query-time system governance service (`system-topology-governance-gate.service.ts`) providing `POST /api/v1/projects/:projectId/system-release-gate-check`. Evaluates:
- Local Phase 10 release gate status of the root project.
- Phase 18 baseline contract alignment across all cross-project `DEPENDS_ON` links.
- Phase 17 provider fulfillment attestation status and head drift (`attestationStale`).
- Local Phase 10 release gate status of authorized upstream provider projects.
Returns a structured `SystemGovernanceGateResult` with aggregate status (`PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`), transparent evidence provenance, and legacy helper flags.

### User Value
Engineering leads and DevOps teams obtain true multi-project release confidence, preventing catastrophic production deployments caused by broken or unverified cross-project technical document contracts.

### Architectural Fit
Composes existing Phase 10 (`release-gate-evaluator.service.ts`), Phase 14 (`project-topology.service.ts`), Phase 17 (`change-package-attestation.service.ts`), and Phase 18 (`system-baseline-alignment.service.ts`) primitives without creating new database models or queue workers.

### Reuse of Existing Primitives
- `evaluateReleaseGateInternal` (Phase 10)
- `ProjectTopologyLink` (Phase 14)
- `PackageFulfillmentAttestation` (Phase 17)
- `calculateSystemBaselineAlignment` (Phase 18)
- `checkUserProjectReadAccess` (Phase 14)
- Existing Phase 10 `GateToken` API authentication credentials

### New Persistence Required
**ZERO**. Pure query-time derivation.

### New Background Processing Required
**ZERO**. Executed synchronously on-demand.

### API / UI Implications
- Backend: `POST /api/v1/projects/:projectId/system-release-gate-check` and `GET /api/v1/projects/:projectId/system-governance-gate`
- Frontend: `SystemGovernanceGateSection.tsx` integrated into `ProjectDetailsPage.tsx`.

### Governance Implications
Extends governance enforcement from single-project silos to system-wide topology graphs.

### Cross-Project Implications
Evaluates upstream provider projects up to `MAX_DEPTH = 3`, respecting `checkUserProjectReadAccess`. Unauthorized connected projects are omitted from public payload metrics while failing gates safely if hidden dependencies are invalid.

### Risks
Performance overhead on deep topology graphs. Mitigated by bounded graph depth (`MAX_DEPTH = 3`, `MAX_NODES = 50`) and bulk loading.

### Scope Creep Risk
Low. Strictly document governance gate evaluation. Excludes CI/CD deployment execution, build runners, or code repository mutations.

### Why Now
Phases 10, 14, 17, and 18 are all complete. The primitives necessary for multi-project release gate evaluation now fully exist in the codebase.

### Why Not
N/A (Primary candidate).

---

## Candidate 2 — Cross-Project Coordinated Pre-Release Change Impact Simulation Engine

### Name
**Cross-Project Coordinated Pre-Release Change Impact Simulation Engine**

### Problem
Phases 15 and 16 allow teams to simulate the impact of unaccepted change proposals and packages within a single project. However, teams cannot preview how pending unaccepted change packages in a provider project will cascade into downstream consumer documents across `ProjectTopologyLink` boundaries before package acceptance.

### Current Gap
Phase 16 package simulation is strictly single-project bounded (`projectId`).

### Proposed Capability
A cross-project package simulation engine (`POST /api/v1/projects/:projectId/cross-project-simulation`) that traces unaccepted change packages across `DEPENDS_ON` topology links into connected consumer project documents.

### User Value
Allows enterprise architects to foresee multi-project ripple effects before approving major API contract proposals.

### Architectural Fit
Extends Phase 16 `change-package-simulation.service.ts` across Phase 14 `ProjectTopologyLink`.

### Reuse of Existing Primitives
Phase 7.3 (`document-impact-cascade.service.ts`), Phase 14 (`ProjectTopologyLink`), Phase 15 (`DocumentChangeProposal`), Phase 16 (`DocumentChangePackage`).

### New Persistence Required
None.

### New Background Processing Required
None.

### API / UI Implications
`POST /api/v1/projects/:projectId/cross-project-simulation` and a visual simulation tree on the web frontend.

### Scope Creep Risk
Medium. Risk of expanding into interactive graph editing or AST schema solving.

### Why Not
Candidate 2 provides proactive feedback for hypothetical unaccepted change drafts. However, Candidate 1 solves the immediate, high-severity operational risk of releasing software when active contracts are broken or unattested. Release safety gating (Candidate 1) is higher leverage because shipping code against broken/unattested active contracts causes immediate production breakage.

---

## Candidate 3 — Configurable Organizational Governance Policy Engine

### Name
**Configurable Organizational Documentation Governance Policy Engine**

### Problem
Governance rules in Documan (max unreviewed days, freshness thresholds, attestation requirements) are configured per-project or hardcoded. Large organizations cannot define global, centralized compliance policies enforced across all projects.

### Current Gap
No `GovernancePolicy` collection or centralized policy evaluation service.

### Proposed Capability
A policy configuration system (`POST /api/v1/governance/policies`) allowing security and compliance officers to define rules (e.g. "Public API documents must have attestation within 30 days of baseline creation").

### User Value
Provides compliance visibility for enterprise governance officers.

### Architectural Fit
Requires creating a new `GovernancePolicy` model and evaluation engine.

### New Persistence Required
Yes (`GovernancePolicy` collection).

### Scope Creep Risk
High. High risk of morphing into generic workflow automation, rule engines, or notification orchestration.

### Why Not
Requires new persistent state and administrative UI surfaces that diverge from Documan's document-centric core.

---

## Candidate 4 — Historical Topology Baseline Evolution & Time-Series Alignment Engine

### Name
**Historical Topology Baseline Evolution & Time-Series Contract Lineage Engine**

### Problem
Phase 18 evaluates baseline contract alignment only against current active baselines (`isActive: true`). Teams cannot query what the cross-project contract alignment state was 6 months ago or trace alignment evolution across past baseline releases.

### Current Gap
No time-series alignment reconstruction query.

### Proposed Capability
An historical alignment service (`GET /api/v1/projects/:projectId/historical-alignment?timestamp=...`) reconstructing topology alignment at any past point in time.

### User Value
Useful for compliance audits and historical post-mortem investigations.

### Architectural Fit
Reuses Phase 12 `DocumentationBaseline` history and Phase 17 `PackageFulfillmentAttestation` history.

### Scope Creep Risk
Low.

### Why Not
Niche audit feature. Most engineering teams care primarily about whether their *current* release is safe, making Candidate 1 far higher value.

---

## Candidate Comparison

| Dimension | Candidate 1: System Topology Release Gate | Candidate 2: Cross-Project Impact Simulation | Candidate 3: Organizational Policy Engine | Candidate 4: Historical Alignment Lineage |
|---|---|---|---|---|
| **Product Value** | **High (5/5)** — Prevents shipping broken cross-project contracts | **High (4/5)** — Previews pending change impact | **Medium (3/5)** — Administrative compliance | **Medium (3/5)** — Historical audit analysis |
| **Architectural Fit** | **Extremely High (5/5)** — Direct synthesis of P10, P14, P17, P18 | **High (4/5)** — Synthesizes P14, P15, P16 | **Medium (2/5)** — Requires new persistent policy model | **High (4/5)** — Reuses P12, P17, P18 |
| **Primitive Reuse** | **100% (5/5)** — Reuses 5 existing phase services | **85% (4/5)** — Reuses 4 phase services | **40% (2/5)** — Low primitive reuse | **90% (4.5/5)** — Reuses 3 phase services |
| **Differentiation** | **High (5/5)** — Unique cross-project documentation gate | **High (4/5)** — Pre-change impact visualization | **Low (2/5)** — Looks like generic policy tools | **Medium (3/5)** — Audit feature |
| **Governance Value** | **High (5/5)** — Complete system release safety | **High (4/5)** — Change preview safety | **Medium (3/5)** — Rule compliance | **Medium (3/5)** — Historical audit |
| **Cross-Project Value** | **High (5/5)** — Multi-project topology evaluation | **High (5/5)** — Multi-project change simulation | **Medium (3/5)** — Multi-project rules | **High (5/5)** — Historical multi-project alignment |
| **Implementation Feasibility** | **High (5/5)** — Clear query pipeline | **Medium (3/5)** — Complex graph recursion | **Medium (3/5)** — Complex policy DSL | **High (4/5)** — Time-slice baseline filtering |
| **Scope Safety** | **High (5/5)** — Strictly document governance gate | **Medium (3/5)** — Risk of canvas/AST scope creep | **Low (1/5)** — Risk of workflow automation creep | **High (5/5)** — Strictly query-based |

---

## Scoring Method

Each candidate is evaluated across 8 criteria on a scale of 1 to 5:
- **Product Value**: Immediate utility to development and engineering teams.
- **Architectural Leverage**: Seamless integration above existing Documan architecture.
- **Primitive Reuse**: Ability to build without re-inventing existing services.
- **Differentiation**: Uniqueness compared to generic documentation or CI tools.
- **Governance Value**: Contribution to technical document authority and release safety.
- **Cross-Project Value**: Extension across project boundaries.
- **Implementation Feasibility**: Clarity of technical execution and performance.
- **Scope Safety**: Resilience against scope creep (5 = low risk, 1 = high risk).

Max total score: 40 points.

---

## Scoring Table

| Criteria | Candidate 1: System Topology Release Gate | Candidate 2: Cross-Project Impact Simulation | Candidate 3: Organizational Policy Engine | Candidate 4: Historical Alignment Lineage |
|---|:---:|:---:|:---:|:---:|
| **Product Value** | 5 | 4 | 3 | 3 |
| **Architectural Leverage** | 5 | 4 | 2 | 4 |
| **Primitive Reuse** | 5 | 4 | 2 | 4 |
| **Differentiation** | 5 | 4 | 2 | 3 |
| **Governance Value** | 5 | 4 | 3 | 3 |
| **Cross-Project Value** | 5 | 5 | 3 | 5 |
| **Feasibility** | 5 | 3 | 3 | 4 |
| **Scope Safety** | 5 | 3 | 1 | 5 |
| **TOTAL SCORE** | **40 / 40** | **31 / 40** | **19 / 40** | **31 / 40** |

---

## Recommended Capability

### Winning Candidate: Candidate 1 — Cross-Project System Topology Governance Gate

The recommended capability for Phase 19 is **Cross-Project System Topology Governance Gate**.

---

## Exact Phase 19 Problem

In modern software engineering organizations, projects depend heavily on contract documentation produced by upstream services.

Currently, when a CI/CD build script or developer evaluates Project A's release gate using Phase 10 (`POST /api/v1/projects/:projectId/release-gate-check`), Documan inspects **only** Project A's local document freshness. If Project A's local documents are fresh, Phase 10 returns `status: 'PASSED'` and issues an approved release gate token.

However, Project A may be completely unsafe to release because:
1. Upstream Provider Project B updated to active baseline `v2.0` with breaking contract changes, leaving Project A's baseline snapshot reference `MISALIGNED` (Phase 18).
2. Upstream Provider Project B's active baseline has unverified baseline drift or failing local release gates (Phase 10 / Phase 12).
3. Upstream Provider Project B's active baseline lacks an immutable fulfillment attestation (Phase 17 `providerAttested: false`).

Phase 19 solves this exact problem by providing a multi-project, topology-aware system governance gate that evaluates the entire authorized dependency graph before approving a system release.

---

## System Governance Gate Semantics

The System Governance Gate computes a aggregate decision (`systemReleaseStatus`) by combining authoritative signals across existing subsystems without inventing arbitrary business rules:

### Signal Inputs Combined:
1. **Root Project Local Gate State** (Phase 10 `evaluateReleaseGateInternal(rootProjectId)`).
2. **Cross-Project Baseline Contract Alignment** (Phase 18 `calculateSystemBaselineAlignment(rootProjectId)`).
3. **Upstream Provider Fulfillment Attestations** (Phase 17 `PackageFulfillmentAttestation` provenance).
4. **Upstream Provider Local Gate States** (Phase 10 `evaluateReleaseGateInternal(providerProjectId)` for each authorized provider).

---

## Governance Disabled Semantics

The handling of `isGovernanceEnabled === false` is split cleanly into **aggregate root state** versus **upstream evidence provenance**:

1. **Root (Consumer) Project Governance Disabled**:
   - If `rootProject.governanceSettings.isGovernanceEnabled === false`, the system release gate immediately returns aggregate status `systemReleaseStatus: 'GOVERNANCE_DISABLED'`.
2. **Upstream Provider Project Governance Disabled**:
   - When the root project has governance enabled, but an upstream provider project has governance explicitly disabled:
   - The provider project's governance state is recorded in governance evidence as `providerGovernanceEnabled: false`.
   - **Structural Alignment Check**: If the provider has an active baseline and the consumer's snapshot reference is `ALIGNED`, the structural contract reference is intact.
   - **Provider Gate Check**: Because the provider's local document governance is disabled, its local gate status is `GOVERNANCE_DISABLED` (which passes locally).
   - **System Decision**: The system gate evaluates the provider's local gate as `GOVERNANCE_DISABLED` (non-blocking), but explicitly records `providerGovernanceEnabled: false` in the traceable evidence breakdown so technical stewards are aware that upstream provider documents are ungoverned.

### TABLE A: Root Governance State × Upstream Provider Governance State Matrix

| Root Governance | Provider Governance | Provider Alignment | Provider Attestation | Provider Local Gate | Aggregate System Result | System Rationale |
|---|---|---|---|---|---|---|
| **Enabled** | **Enabled** | `ALIGNED` | `attested` | `PASSED` | **`PASSED`** | Root and provider fully healthy, contract aligned and attested |
| **Enabled** | **Enabled** | `MISALIGNED` | `attested` | `PASSED` | **`BLOCKED`** | Contract reference mismatch between consumer snapshot and provider baseline |
| **Enabled** | **Enabled** | `ALIGNED` | `unattested` | `PASSED` | **`BLOCKED`** | Provider active baseline lacks required Phase 17 fulfillment attestation |
| **Enabled** | **Enabled** | `ALIGNED` | `attested` | `BLOCKED` | **`BLOCKED`** | Upstream provider project has failing local document freshness/drift |
| **Enabled** | **Disabled** | `ALIGNED` | `attested` | `GOVERNANCE_DISABLED` | **`PASSED`** | Contract reference intact; evidence records `providerGovernanceEnabled: false` |
| **Enabled** | **Disabled** | `MISALIGNED` | `attested` | `GOVERNANCE_DISABLED` | **`BLOCKED`** | Structural contract misalignment blocks consumer despite provider disabled status |
| **Disabled** | **Enabled** | Any | Any | Any | **`GOVERNANCE_DISABLED`** | Root consumer project governance explicitly disabled by project owner |
| **Disabled** | **Disabled** | Any | Any | Any | **`GOVERNANCE_DISABLED`** | Root consumer project governance explicitly disabled by project owner |

---

## Root vs Provider Governance

- **Root Governance** dictates whether system release gating is active for the requested project.
- **Provider Governance** dictates the local review freshness standards of connected projects. Provider governance bypass does NOT override structural contract reference misalignment or missing baselines.

---

## BLOCKED vs INDETERMINATE vs DISABLED

### TABLE B: Provider Alignment × Attestation × Local Gate Decision Matrix

| Provider Alignment (P18) | Provider Attestation (P17) | Provider Local Gate (P10) | Evidence Category | System Gate Consequence |
|---|---|---|---|---|
| `ALIGNED` | `attested` (`attestationStale: false`) | `PASSED` | Verified Contract & Local Health | **Non-blocking (`PASSED`)** |
| `ALIGNED` | `attested` (`attestationStale: true`) | `PASSED` | Attested Snapshot Stale vs Head | **`BLOCKED`** (Provider head drifted since attestation) |
| `ALIGNED` | `unattested` (`providerAttested: false`) | `PASSED` | Unattested Baseline Reference | **`BLOCKED`** (Missing required governance attestation) |
| `MISALIGNED` | Any | Any | Version Reference Mismatch | **`BLOCKED`** (Outdated contract snapshot reference) |
| `INDETERMINATE` | Any | Any | Missing Baseline Evidence | **`INDETERMINATE`** (Insufficient evidence for evaluation) |
| Any | Any | `BLOCKED` | Upstream Document Drift/Staleness | **`BLOCKED`** (Provider local documentation unhealthy) |
| Any | Any | `GOVERNANCE_DISABLED` | Provider Governance Disabled | **Non-blocking if `ALIGNED` & `attested`**, logged in evidence |

### TABLE C: Evidence Condition → System Gate Consequence Matrix

| Evidence Condition | Source Subsystem | Category | System Gate Consequence | Reason |
|---|---|---|---|---|
| Root local gate blocked | Phase 10 | Local Health | **`BLOCKED`** | Root project documents are stale, unreviewed, or drifting |
| Provider baseline snapshot reference mismatch | Phase 18 | Alignment | **`BLOCKED`** | Consumer reference differs from active provider baseline |
| Provider active baseline unattested | Phase 17 | Provenance | **`BLOCKED`** | Provider baseline lacks immutable fulfillment attestation |
| Provider attestation stale | Phase 17 | Provenance | **`BLOCKED`** | Provider document head version drifted beyond attested version |
| Provider local gate blocked | Phase 10 | Provider Health | **`BLOCKED`** | Upstream provider documentation is unreviewed or stale |
| Consumer active baseline missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | Missing consumer baseline prevents alignment check |
| Provider active baseline missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | Missing provider baseline prevents contract evaluation |
| Consumer baseline snapshot reference missing | Phase 12 / P18 | Evidence | **`INDETERMINATE`** | Snapshot reference missing for `DEPENDS_ON` document |
| Root project governance disabled | Phase 10 | Root Setting | **`GOVERNANCE_DISABLED`** | Root project owner explicitly bypassed document governance |

---

## Attestation Requirement

Missing attestation (`providerAttested: false`) is **known evidence of absence** resulting in `BLOCKED` (when strict attestation policy is enabled). In contrast, `INDETERMINATE` occurs only when required baseline data or snapshots cannot be resolved.

---

## Evidence vs Decision

Phase 19 strictly separates the **Derived System Decision** from **Traceable Subsystem Evidence**:

```json
{
  "passed": false,
  "systemReleaseStatus": "BLOCKED",
  "evaluatedAt": "2026-09-06T11:00:00.000Z",
  "rootProjectId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "summary": {
    "totalDependencies": 3,
    "alignedDependencies": 2,
    "misalignedDependencies": 1,
    "indeterminateDependencies": 0,
    "blockedProviders": 1
  },
  "evidence": {
    "rootLocalGate": {
      "status": "PASSED",
      "freshnessPercentage": 95
    },
    "baselineAlignment": {
      "aggregateState": "PARTIALLY_ALIGNED",
      "alignmentScore": 66.7,
      "evidenceCompleteness": 100.0
    },
    "blockingDependencies": [
      {
        "providerProjectId": "64f1a2b3c4d5e6f7a8b9c0d2",
        "providerProjectName": "Payment Gateway Service",
        "consumerDocumentTitle": "Checkout API Client",
        "providerDocumentTitle": "Payment API v2 Specification",
        "reason": "MISALIGNED: Consumer snapshot references v1.0, but Provider active baseline is v2.0",
        "governanceEvidence": {
          "providerBaselinePresent": true,
          "consumerBaselinePresent": true,
          "providerAttested": false,
          "attestationStale": false,
          "providerLocalGateStatus": "BLOCKED"
        }
      }
    ]
  }
}
```

The top-level `systemReleaseStatus` is a clean, actionable aggregate decision. The `evidence` object provides full, un-flattened traceability back to the authoritative Phase 10, 14, 17, and 18 subsystems.

---

## GateToken vs Evaluation Payload

Inspection of Phase 10 code (`governance.service.ts` line 205) confirms that `GateToken` in Phase 10 is an **API authentication credential** (`documan_gate_<hex>`) stored as a SHA-256 hash in `project.gateTokens` to authenticate HTTP requests from CI/CD runners.

1. **NO New Credential Model**: Phase 19 does **NOT** create a new database collection or token credential model. CI/CD pipelines use existing Phase 10 `GateToken` credentials to authenticate requests to the Phase 19 endpoint.
2. **NO Redundant Payload Signing**: To maintain zero-persistence, avoid token replay vulnerabilities, and prevent redundant complexity, Phase 19 **removes** the proposed second signed token (`SystemGateEvaluationPayload`). HTTP API responses authenticated via standard Phase 10 `GateToken` credentials provide full, verified governance evidence.

---

## Token Security Boundary

Phase 10 `GateToken` is strictly an API request authentication key. It is **NOT** a deployment secret, **NOT** a cloud authorization credential, and does **NOT** execute software deployment.

---

## Cross-Project Topology Behavior

### TABLE D: Topology & Authorization Condition → Visibility & Evaluation Matrix

| Topology / Authorization Condition | Graph Subgraph Impact | Metrics & Denominator Impact | System Gate Consequence | Privacy / Security Rule |
|---|---|---|---|---|
| Direct single provider (Authorized) | Evaluated | Included in total/aligned counts | Evaluated normally | Visible in details list |
| Multiple providers (Authorized) | Evaluated | All included in counts | `PASSED` iff all providers pass | Visible in details list |
| Nested topology (Depth 2-3, Authorized) | Recursively evaluated | Included in counts | `PASSED` iff all nested nodes pass | Visible in details list |
| Inaccessible provider (ACL Restricted) | **100% Omitted** | **Excluded from counts** | **`BLOCKED` or `INDETERMINATE`** safely | Zero IDs, zero names, zero count leakage |
| Disconnected project | Excluded | Excluded | Not evaluated | Ignored |
| Topology link type `INTEGRATES_WITH` | Excluded | Excluded | Non-blocking | Informational only |
| Topology link type `PROVIDES_API_TO` | Excluded | Excluded | Non-blocking | Informational only |
| `DEPENDS_ON` doc link without active topology link | Evaluated | Included in counts | **`INDETERMINATE`** | Invalid topology state blocks release |

---

## ACL / Privacy

Phase 19 strictly reuses Phase 14 `checkUserProjectReadAccess`:

- **Complete Omission of Unauthorized Nodes**: If the requesting user/token lacks `READ` permission on an upstream provider project in the topology, that project node, its topology links, documents, baselines, and attestations are **100% omitted** from the response payload details.
- **Safe Evaluation Boundary**: If an unauthorized upstream provider project is invalid or misaligned, the system gate safely evaluates to `BLOCKED` or `INDETERMINATE` without leaking the unauthorized project's name, ID, or internal failure metrics.
- **Zero Count Leakage**: Metrics ($N_{\text{total}}$, $N_{\text{applicable}}$) are calculated strictly over the authorized subgraph.

---

## Existing Primitive Reuse

Phase 19 achieves 100% architectural leverage by composing existing Phase 7–18 primitives:

```
[Phase 10: release-gate-evaluator.service.ts] (Local Document Freshness & Gate Status)
                     +
[Phase 14: project-topology.service.ts] (Cross-Project Topology Links & ACL)
                     +
[Phase 17: change-package-attestation.service.ts] (Provider Fulfillment Attestation Provenance)
                     +
[Phase 18: system-baseline-alignment.service.ts] (Contract Reference Alignment Engine)
                     ↓
[Phase 19: system-topology-governance-gate.service.ts] (Cross-Project System Governance Gate)
```

---

## Persistence

- **ZERO New Mongoose Models**: No new schemas or models.
- **ZERO New MongoDB Collections**: No new database collections.
- **ZERO Background Queue Workers**: No background workers or async cron jobs.
- **ZERO Database Writes**: `POST /api/v1/projects/:projectId/system-release-gate-check` performs zero database mutations.

---

## Performance

- **Empirical Complexity**: $O(V_{\text{auth}} + E_{\text{auth}} + U_{\text{units}})$ where $V_{\text{auth}} \le 50$, $E_{\text{auth}} \le 100$, $U_{\text{units}} \le 100$.
- **8-Stage Bulk Data Loading**: Reuses Phase 18 bulk loading strategy, eliminating N+1 DB queries.
- **Performance Target**: **PERFORMANCE TARGET TO BE VALIDATED** during automated Phase 19 benchmark testing (target response time < 100ms for standard project topology graphs).

---

## Security

- **Authentication**: Authenticated via standard user JWT (`authenticateToken`) or Phase 10 API gate token (`x-gate-token`).
- **Authorization**: Enforces project read authorization (`checkUserProjectReadAccess`).

---

## Governance Boundaries

- Preserves Phase 10 as sole local release gate authority.
- Preserves Phase 12 as sole baseline authority.
- Preserves Phase 14 as sole project topology authority.
- Preserves Phase 17 as sole attestation authority.
- Preserves Phase 18 as sole baseline alignment authority.
- Phase 19 acts strictly as a derived, query-time synthesis gate.

---

## In Scope

1. **System Topology Governance Gate Calculation Engine**:
   - Evaluates local project release gate (Phase 10).
   - Evaluates cross-project contract alignment (Phase 18).
   - Evaluates upstream provider attestation verification (Phase 17).
   - Evaluates upstream provider release gate status (bounded by topology depth).
2. **System Release Gate Statuses**:
   - `PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`.
3. **ACL-Safe Dependency Pruning**:
   - Completely omits unauthorized projects from detail lists and public metrics while maintaining secure evaluation boundaries.
4. **Frontend System Governance Gate UI**:
   - Read-only governance section displaying system release status, dependency status breakdown, blocking contract list, and governance evidence.

---

## Out of Scope

Documan Phase 19 MUST NOT include:
- Software deployment execution, release pipelines, or cloud infrastructure orchestration.
- Git / VCS automation, commit hooks, or branch creation.
- API AST schema parsing or runtime network compatibility checks.
- New database models, persistent collections, or background queue workers.
- Automatic baseline creation or automatic document mutations.
- Generic Jira-like task management or Slack notification webhooks.
- AI, LLM, RAG, or non-deterministic decision engines.
- Canvas / vector visual architecture editing tools.

---

## Risks

1. **Performance Overhead on Deep Graphs**: Mitigated by bounded graph depth (`MAX_DEPTH = 3`, `MAX_NODES = 50`) and bulk querying.
2. **Indeterminacy Cascades**: Handled by explicit aggregate state mapping (missing upstream evidence yields `INDETERMINATE` without false passes).

---

## Alternatives Rejected

1. **Candidate 2 (Cross-Project Pre-Release Simulation)**: Rejected because pre-change preview is secondary to release safety gating; Phase 18 already identifies active contract drift.
2. **Candidate 3 (Configurable Organizational Policy Engine)**: Rejected due to high risk of scope creep into workflow automation and requirement for new persistent schemas.
3. **Candidate 4 (Historical Lineage Alignment Engine)**: Rejected as a niche audit feature with lower day-to-day value than release gate enforcement.

---

## Open Questions

1. *Should `GOVERNANCE_DISABLED` in an upstream provider project bypass system release gating for consumer projects?*  
   **Resolved**: Non-blocking locally, but explicitly logged in governance evidence as `providerGovernanceEnabled: false`.

---

## Final Recommendation

### 1. What exactly is Phase 19?
Phase 19 is **Cross-Project System Topology Governance Gate**: A derived, query-time, read-only system governance evaluation service (`system-topology-governance-gate.service.ts`) that synthesizes single-project documentation health (Phase 10), project architecture topology links (Phase 14), immutable fulfillment attestations (Phase 17), and cross-project baseline contract alignment (Phase 18) into a multi-project, topology-aware system release gate decision.

### 2. Why is it different from Phase 10?
Phase 10 evaluates ONLY local documents inside `projectId` in complete isolation. Phase 19 evaluates the root project AND its authorized cross-project contract dependencies ($V_{\text{auth}}, E_{\text{auth}}$) across topology links up to `MAX_DEPTH = 3`.

### 3. What causes PASSED?
Root local Phase 10 gate is `PASSED`, all authorized cross-project contract references are `ALIGNED` (Phase 18), all authorized provider active baselines are attested (`providerAttested: true`, Phase 17), and all authorized provider local Phase 10 gates are `PASSED`.

### 4. What causes BLOCKED?
Root local Phase 10 gate is `BLOCKED`, OR one or more authorized contract references are `MISALIGNED`, OR one or more provider active baselines are unattested (`providerAttested: false`), OR one or more provider local Phase 10 gates are `BLOCKED`.

### 5. What causes INDETERMINATE?
Required baseline or snapshot evidence is missing in the authorized dependency graph (e.g. consumer baseline missing, snapshot missing, or provider active baseline missing).

### 6. What causes GOVERNANCE_DISABLED?
The **root consumer project** itself has governance explicitly disabled (`isGovernanceEnabled === false`).

### 7. What happens when a provider disables governance?
Provider local gate status is `GOVERNANCE_DISABLED` (non-blocking). Structural contract alignment (Phase 18) is checked against provider's active baseline. If `ALIGNED` and attested, system gate is `PASSED`, with evidence breakdown explicitly recording `providerGovernanceEnabled: false`.

### 8. What does passed:boolean mean, if retained?
Retained strictly as a legacy convenience helper representing `systemReleaseStatus === 'PASSED' || systemReleaseStatus === 'GOVERNANCE_DISABLED'`. Primary evaluation logic uses the categorical `systemReleaseStatus` field.

### 9. Is a second signed evaluation artifact necessary?
NO. Removed to eliminate redundant token complexity and token replay risks.

### 10. What does that artifact prove?
N/A (Artifact removed).

### 11. What does it NOT prove?
N/A (Artifact removed).

### 12. Does Phase 19 remain read-only?
YES. 100% read-only, query-time derived calculation.

### 13. Does it require new persistence?
NO. **ZERO new Mongoose models, ZERO new collections, ZERO background queue workers, ZERO database writes**.

### 14. Why is Candidate 1 superior to Candidate 2?
Candidate 1 synthesizes newly established Phase 18 alignment evidence into an immediate, high-leverage release safety decision, preventing deployment of broken/unattested active contracts. Candidate 2 simulates hypothetical unaccepted change drafts, which is proactive feedback but secondary to release safety gating.

### 15. What must Phase 19 never become?
Deployment platform, CI/CD pipeline runner, release orchestrator, infrastructure monitor, cloud authorization system, Jira clone, GitHub clone, Slack clone, or vector canvas editor.

Proceed to **Phase 19 Implementation Planning** upon authorization.
