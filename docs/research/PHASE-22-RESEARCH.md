# Phase 22 Research

## 1. Executive Summary

Documan has successfully achieved a comprehensive system governance baseline through Phase 21 (**System Topology Pre-Release What-If Simulation & Gate Impact Analyzer**). The repository state is pristine, fully merged into `main` (`37f8024`), up to date with `origin/main`, with 100% clean verification across Vitest (734/734 tests), all Phase 10–21 QA runners, API typecheck, ESLint, and production web build.

This research document evaluates the optimal direction for **Phase 22**. The primary objective is to identify the next genuine product-level capability gap without introducing scope creep, generic task managers, or unnecessary persistent database mutations and background workers.

Through systematic repository inspection, we established that while Documan excels at real-time system gate evaluation (Phase 19), policy exception management (Phase 20), and hypothetical state simulation (Phase 21), it suffers from a major **Longitudinal & Causal Governance Intelligence Gap**. Specifically:
- Documan can answer what the system governance state is *right now* (Phase 19).
- Documan can answer what the system state *would be* under hypothetical changes (Phase 21).
- Documan **CANNOT** answer how or why the system governance state evolved over time, what the system gate status was at timestamp $T_{\text{historical}}$, or which specific upstream event (baseline bump, attestation creation, waiver revocation) caused a release gate transition from `PASSED` to `BLOCKED`.

We evaluated 5 distinct, materially different candidate capabilities for Phase 22. Based on strict scoring against product identity, architectural reuse, persistence minimalism, worker elimination, and security preservation, we recommend **Candidate 1: System Topology Governance State Lineage & Longitudinal Timeline Engine** as the single winner for Phase 22.

---

## 2. Current Documan Capability Map

Documan has evolved through 21 distinct phases, creating an interconnected document management, traceability, and multi-project governance platform:

```text
Foundation (Phase 1-6)
  ↓ [Documents, Folders, Audit, Sharing, ACL, Webhooks, Projects]
Project / API Context (Phase 7.1 - 7.2)
  ↓ [Project context, API specs]
Cross-Document Impact & Versioning (Phase 7.3 - 7.5)
  ↓ [Relationship cascades, content snapshots, technical knowledge risk]
Authoritative Knowledge & Evidence (Phase 8 - 9)
  ↓ [Authoritative knowledge discovery, evidence traceability]
Governance & Assurance Engine (Phase 10)
  ↓ [Documentation assurance scores, local release gate evaluator]
Change Intelligence & Baseline Drift (Phase 11 - 13)
  ↓ [Verification plans, baselines v1/v2, drift calculator, work requests]
System Architecture Topology & Contracts (Phase 14)
  ↓ [ProjectTopologyLink, DEPENDS_ON contract boundaries, permission-safe subgraphs]
Pre-Change Simulation & Packages (Phase 15 - 17)
  ↓ [Change proposals, multi-document packages, immutable attestations]
Cross-Project Baseline Alignment (Phase 18)
  ↓ [system-baseline-alignment.service.ts, dual-metric governance]
Cross-Project System Governance Gate (Phase 19)
  ↓ [system-topology-governance-gate.service.ts, PASSED/BLOCKED/INDETERMINATE]
Policy Waiver Lifecycle Management (Phase 20)
  ↓ [SystemGovernanceWaiver, PASSED_WITH_WAIVER, query-time expiration]
System Topology Pre-Release What-If Simulation (Phase 21)
  ↓ [system-topology-simulation.service.ts, request-scoped in-memory what-if overrides]
[NEXT] System Governance State Lineage & Longitudinal Timeline Engine (Phase 22)
```

---

## 3. Questions Documan Can Answer Today

By evaluating the authoritative source code across existing API modules, Documan can currently answer:

### Single Document & Local Governance Level (Phases 1–13)
- What is the current version, metadata, and status of Document D?
- Who created, modified, viewed, or soft-deleted Document D? (`DocumentAudit`)
- What technical knowledge is authoritative, and what is its risk score? (`TechnicalKnowledge`)
- Is Document D adequately backed by documentation evidence? (`KnowledgeEvidence`)
- What is Document D's local documentation assurance score? (`assurance-calculator.ts`)
- Is Document D passing its local release gate? (`release-gate-evaluator.service.ts`)
- Has Project P's documentation drifted from active Baseline `v1.0`? (`drift-calculator.service.ts`)
- What pending documentation work requests exist for Project P? (`work-request.service.ts`)

### Multi-Project Topology & Cross-Project Contract Level (Phases 14–18)
- Which projects depend on Provider Project P? (`ProjectTopologyLink`)
- What cross-project `DEPENDS_ON` document relationships exist between Consumer C and Provider P?
- Are cross-project contracts aligned between Consumer C and Provider P? (`system-baseline-alignment.service.ts`)
- Is Provider P's attestation present, valid, or stale? (`PackageFulfillmentAttestation`)
- What is the system-wide alignment score and evidence completeness metric across the authorized topology graph?

### System Governance Gate & Exception Level (Phases 19–20)
- Is the overall system topology release gate `PASSED`, `PASSED_WITH_WAIVER`, `BLOCKED`, `INDETERMINATE`, or `GOVERNANCE_DISABLED`? (`system-topology-governance-gate.service.ts`)
- What specific blocking dependencies exist across upstream provider projects?
- Are there active policy waivers covering waivable cross-project blockers for a given project/document pair? (`system-governance-waiver.service.ts`)
- When does Policy Waiver W expire, or has it been revoked?

### Pre-Release What-If Simulation Level (Phase 21)
- What would happen to the system release gate status if Provider Project P bumped its baseline to `v2.0`? (`system-topology-simulation.service.ts`)
- What would happen if Attestation A was published or marked stale?
- What would happen if Waiver W was granted or revoked?
- What are the fine-grained gate state transitions (`gateStateChanged`, `newlyBlockedDependencies`, `newlyResolvedDependencies`) resulting from hypothetical overrides?

---

## 4. Important Questions Documan Cannot Yet Answer

Despite the rich capability set established in Phases 1–21, repository analysis reveals critical questions that Documan **CANNOT** currently answer:

1. **Longitudinal System Governance Evolution**:
   - *Question*: "How has our system topology governance status evolved over the last 30, 60, or 90 days?"
   - *Current limitation*: Documan only evaluates system release safety at the exact moment of request execution ($T_{\text{now}}$). It has zero historical time-series visibility into past system gate states.

2. **Historical Point-in-Time Release Audit Reconstruction**:
   - *Question*: "What was the exact system topology release gate status on August 15th before Provider Baseline v2.0 was published?"
   - *Current limitation*: Gate evaluations are dynamic query-time calculations over *current* active baselines, attestations, and waivers. Documan cannot reconstruct system gate states at an arbitrary historical timestamp $T_{\text{historical}}$.

3. **Causal Event Attribution & Root-Cause Lineage Tracing**:
   - *Question*: "Which specific upstream event (e.g. baseline update, attestation decay, waiver revocation) caused the system gate to transition from PASSED to BLOCKED on Tuesday at 14:00?"
   - *Current limitation*: Documan reports current blockers, but cannot trace the historical event lineage across Phase 12 baseline changes, Phase 17 attestation updates, Phase 20 waiver actions, and Phase 4 audit records to explain *why* a state transition occurred.

4. **Policy Waiver Historical Impact & Exposure Ledger**:
   - *Question*: "How many times was Project C released under policy waivers over the past quarter, and how long did those waivers remain active before being resolved?"
   - *Current limitation*: Waiver matching only checks active, unexpired, non-revoked waivers at $T_{\text{now}}$. Historical waiver utilization and exposure duration across past releases are lost.

5. **Cross-Project Contract Alignment Decay Trajectory**:
   - *Question*: "How quickly do cross-project contract misalignments get resolved across release cycles, and which provider projects cause the longest alignment lag?"
   - *Current limitation*: Alignment scores are computed exclusively over active baselines at $T_{\text{now}}$. Longitudinal alignment trend analysis does not exist.

---

## 5. Product Gap Analysis

We identify four distinct, non-artificial product gaps in Documan's current architecture:

```text
+-----------------------------------------------------------------------------------+
|                            PRODUCT GAP MAP (PHASE 22)                             |
+-----------------------------------------------------------------------------------+
| 1. Longitudinal State Reconstruction Gap | Lack of temporal point-in-time ($T_hist$) |
|                                           | system governance gate evaluation.    |
| 2. Causal Transition Attribution Gap      | Inability to link system gate status  |
|                                           | changes to specific historical events.|
| 3. Historical Waiver & Exposure Gap       | Lack of temporal tracking for policy  |
|                                           | exception duration & release impact.  |
| 4. System Alignment Velocity Trend Gap    | Lack of longitudinal metrics on how    |
|                                           | fast contract drift is resolved.      |
+-----------------------------------------------------------------------------------+
```

### Detailed Analysis of Primary Gap: Longitudinal System Governance Lineage

- **User Problem**: Technical Stewards, System Admins, and Project Owners need to audit past system release safety, understand the trajectory of system governance health over time, and investigate why a system gate became blocked following upstream changes.
- **Why It Matters**: Without longitudinal intelligence, teams treat governance gate failures as sudden surprises rather than predictable trajectories. Audit compliance requires proving what the system gate status was at the time of past software releases.
- **Existing Capabilities Touching It**:
  - `DocumentAudit` records historical mutations (`action`, `actorId`, `timestamp`).
  - `DocumentationBaseline` records historical baseline versions (`createdAt`).
  - `PackageFulfillmentAttestation` records immutable attestation timestamps (`fulfilledAt`).
  - `SystemGovernanceWaiver` records grant and revocation timestamps (`createdAt`, `revokedAt`, `expiresAt`).
- **Why Existing Capabilities Are Insufficient**: These records exist in isolated collections with separate schemas and timestamps. There is no unified engine that can project these temporal records backward to reconstruct the exact system topology graph and gate state at timestamp $T_{\text{historical}}$.
- **What New Capability Adds**: A read-only, time-series longitudinal governance analysis engine (`system-governance-lineage.service.ts`) that reconstructs, compares, and visualizes historical system topology gate states, baseline alignment evolution, attestation decay timelines, and state diffs across arbitrary time windows ($T_1 \to T_2$).

---

## 6. Candidate 1: System Topology Governance State Lineage & Longitudinal Timeline Engine

- **Name**: System Topology Governance State Lineage & Longitudinal Timeline Engine (`system-governance-lineage.service.ts`)
- **Problem**: Inability to reconstruct historical point-in-time system governance gate states, audit past release safety, or trace causal root events across upstream baseline changes, attestation decay, and waiver lifecycles.
- **User Value**: High. Enables technical stewards to inspect historical release readiness ($T_{\text{historical}}$), compare system gate diffs between two timestamps ($T_1$ vs $T_2$), and view a permission-safe timeline of state transitions with causal root-event attribution.
- **Core Concept**: A read-only temporal governance query engine that accepts a target timestamp $T$ (or window $[T_1, T_2]$), reconstructs the state of active baselines, attestations, and waivers as of timestamp $T$, and executes Phase 19 system gate logic to yield an exact historical point-in-time gate evaluation and causal event lineage.
- **Existing Infrastructure Reused**:
  - `system-topology-governance-gate.service.ts` (Phase 19 gate evaluation logic)
  - `system-baseline-alignment.service.ts` (Phase 18 baseline alignment)
  - `DocumentationBaseline` (Phase 12 timestamped baseline versions)
  - `PackageFulfillmentAttestation` (Phase 17 timestamped attestations)
  - `SystemGovernanceWaiver` (Phase 20 timestamped waivers)
  - `DocumentAudit` (Phase 4 immutable audit event log)
  - `ProjectTopologyLink` & `DocumentRelationship` (Phase 14 topology & contract boundaries)
- **New Infrastructure Required**: `system-governance-lineage.service.ts`, `system-governance-lineage.controller.ts`, `system-governance-lineage.routes.ts`, `system-governance-lineage.types.ts`, `SystemGovernanceLineageTimeline.tsx`.
- **Persistence**: **ZERO new database collections**. Derived 100% dynamically at query time from existing timestamped collections.
- **API**: `GET /api/v1/governance/system-topology/lineage?projectId=:id&from=:t1&to=:t2`, `GET /api/v1/governance/system-topology/historical-gate?projectId=:id&at=:timestamp`.
- **UI**: Interactive timeline viewer showing historical gate transitions (`PASSED` $\to$ `BLOCKED` $\to$ `PASSED_WITH_WAIVER`), point-in-time state reconstruction inspector, and causal event drawer.
- **Security**: Strict Phase 14 ACL preservation via `checkUserProjectReadAccess`. Unauthorized projects, links, documents, baselines, and audit records are 100% omitted from historical queries.
- **Determinism & Auditability**: 100% deterministic mathematical derivation based on immutable timestamped records.
- **Risks**: Query performance when scanning large audit histories (mitigated by indexed timestamp range queries and capped evaluation windows).
- **Product-Boundary Safety**: High. Pure read-only governance intelligence; zero CI/CD pipeline automation, zero task management, zero background workers.

---

## 7. Candidate 2: Multi-Project System Governance Remediation & Actionable Resolution Planner

- **Name**: Multi-Project System Governance Remediation & Actionable Resolution Planner (`system-governance-remediation.service.ts`)
- **Problem**: When a system topology gate returns `BLOCKED` or `PASSED_WITH_WAIVER`, teams do not know the minimal, optimal sequence of operational steps needed to resolve the blockers and restore a pure `PASSED` state.
- **User Value**: Moderate-High. Generates a derived, step-by-step resolution plan (e.g. "Step 1: Fulfill Change Package #12 on Provider P; Step 2: Publish Baseline v2.0 on Provider P; Step 3: Revoke Waiver W-5").
- **Core Concept**: A derived diagnostic graph solver that traverses blocking dependencies in a `BLOCKED` system gate result and produces an ordered execution plan of corrective actions.
- **Existing Infrastructure Reused**: Composes `system-topology-governance-gate.service.ts`, `work-request.service.ts`, `change-package.service.ts`.
- **New Infrastructure Required**: Remediation step solver, dependency graph resolution path calculation.
- **Persistence**: ZERO persistence.
- **API**: `GET /api/v1/governance/system-topology/remediation-plan?projectId=:id`.
- **UI**: Actionable resolution step list with deep links to work requests and change packages.
- **Security**: Enforces Phase 14 `checkUserProjectReadAccess`.
- **Risks**: Borderlines on generic task/ticket workflow management if resolution steps resemble task lists; potential overlap with Phase 13 work requests.
- **Product-Boundary Risk**: Moderate. Must avoid becoming a Jira/Linear issue tracking clone.

---

## 8. Candidate 3: Persistent System Governance Snapshot & Audit Release Archive (`SystemGovernanceSnapshot`)

- **Name**: Persistent System Governance Snapshot & Audit Release Archive (`SystemGovernanceSnapshot`)
- **Problem**: Wanting an immutable, frozen database record of a system topology release gate evaluation specifically marked for formal compliance audit sign-off during production releases.
- **User Value**: Moderate. Provides a saved, queryable record of signed-off system release gate evaluations.
- **Core Concept**: Introduces a new persistent Mongoose model `SystemGovernanceSnapshot` that stores frozen JSON payloads of system topology gate results whenever an admin clicks "Sign Off Release Gate".
- **Existing Infrastructure Reused**: `evaluateSystemTopologyGovernanceGate`.
- **New Infrastructure Required**: `SystemGovernanceSnapshot` model, snapshot service, snapshot controller, route, schema.
- **Persistence**: **NEW persistent database model** (`SystemGovernanceSnapshot`).
- **API**: `POST /api/v1/governance/system-topology/snapshots`, `GET /api/v1/governance/system-topology/snapshots`.
- **UI**: Release sign-off modal and snapshot archive viewer.
- **Security**: Restricted to System Admin / Project Owner roles.
- **Risks**: Violates persistence minimalism. System gate state can already be derived dynamically at query time; creating duplicate snapshot collections creates data redundancy and potential stale-snapshot authority confusion.
- **Product-Boundary Risk**: Low-Moderate.

---

## 9. Candidate 4: System-Wide Cross-Project Documentation Health & Governance Risk Radar

- **Name**: System-Wide Cross-Project Documentation Health & Governance Risk Radar (`system-governance-radar.service.ts`)
- **Problem**: System architects lack a high-level aggregate risk matrix that combines single-project health, documentation drift, contract misalignment, and active waiver density across all projects into a single composite system risk score.
- **User Value**: Moderate. Offers a top-level dashboard view of system-wide documentation health and contract risk across connected project networks.
- **Core Concept**: A derived query service that aggregates metrics from Phase 7.5 (risk radar), Phase 10 (assurance), Phase 12 (drift), Phase 18 (contract alignment), and Phase 20 (waivers) to calculate a normalized System Risk Score ($0-100$).
- **Existing Infrastructure Reused**: Reuses Phase 7.5, Phase 10, Phase 12, Phase 18, Phase 20 services.
- **New Infrastructure Required**: Composite risk score calculator, aggregate risk API, system radar UI component.
- **Persistence**: ZERO persistence.
- **API**: `GET /api/v1/governance/system-topology/risk-radar?projectId=:id`.
- **UI**: Risk radar matrix and project leaderboard.
- **Security**: Enforces Phase 14 `checkUserProjectReadAccess`.
- **Risks**: Weak new capability strength. Primarily reshuffles and re-packages existing metrics into another dashboard layout without adding new analytical or reasoning primitives.
- **Product-Boundary Risk**: Low.

---

## 10. Candidate 5: Automated Asynchronous Background Governance Monitor & Webhook Event Sweeper

- **Name**: Automated Asynchronous Background Governance Monitor & Webhook Event Sweeper (`governance-worker.service.ts`)
- **Problem**: Governance gate checks are currently pull-based (evaluated when a user or CI system makes an HTTP request). Teams want automated push notifications when an upstream baseline update degrades a downstream system gate status.
- **User Value**: Moderate. Sends background webhook alerts or notifications when system gates change state.
- **Core Concept**: A background queue worker engine running cron sweeps every 15 minutes to evaluate system gates for all projects and emit `GOVERNANCE_SYSTEM_GATE_CHANGED` webhook events.
- **Existing Infrastructure Reused**: `evaluateSystemTopologyGovernanceGate`, `webhooks.service.ts`, `notifications.service.ts`.
- **New Infrastructure Required**: Background queue worker processing engine, cron scheduler, worker health check, queue state DB.
- **Persistence**: Worker job queue collection / state persistence.
- **Workers**: **MANDATORY background queue workers & cron scheduler**.
- **API**: Worker management API endpoints.
- **UI**: Worker status dashboard and alert settings.
- **Security**: System admin management.
- **Risks**: Severe architectural violation. Introduces background processing complexity, resource polling, potential race conditions, and moves Documan toward a generic notification/CI/CD event trigger engine.
- **Product-Boundary Risk**: High.

---

## 11. Candidate Scoring Matrix

All 5 candidates were evaluated against 11 strict criteria on a scale of 1 (poor) to 5 (excellent):

| Scoring Criterion | Cand 1: Lineage & Timeline | Cand 2: Remediation Planner | Cand 3: Persistent Snapshot | Cand 4: Risk Radar | Cand 5: Background Worker |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Product Value | 5 | 4 | 3 | 3 | 3 |
| 2. Alignment with Identity | 5 | 4 | 4 | 4 | 2 |
| 3. Reuse of Infrastructure | 5 | 4 | 4 | 5 | 3 |
| 4. New Capability Strength | 5 | 4 | 2 | 2 | 3 |
| 5. Traceability Improvement | 5 | 3 | 4 | 2 | 3 |
| 6. Governance Value | 5 | 4 | 4 | 3 | 3 |
| 7. Cross-Project Value | 5 | 4 | 3 | 4 | 3 |
| 8. Technical Feasibility | 4 | 4 | 4 | 5 | 2 |
| 9. Security/ACL Clarity | 5 | 5 | 4 | 5 | 3 |
| 10. Determinism & Auditability | 5 | 4 | 5 | 4 | 2 |
| 11. Product-Boundary Safety | 5 | 3 | 4 | 4 | 1 |
| **TOTAL SCORE (out of 55)** | **54** | **45** | **41** | **41** | **28** |

**Winning Candidate**: **Candidate 1 (System Topology Governance State Lineage & Longitudinal Timeline Engine)** with **54/55**.

---

## 12. Top-Two Architectural Stress Test

We performed deep architectural stress testing comparing **Candidate 1** (Longitudinal Timeline Engine) and **Candidate 2** (Remediation Planner):

```text
+-----------------------------------------------------------------------------------+
|                        STRESS TEST COMPARISON MATRIX                              |
+-----------------------------------------------------------------------------------+
| Stress Test Dimension     | Candidate 1: Timeline Engine  | Candidate 2: Remediation|
+---------------------------+-------------------------------+-----------------------+
| Competing Source of Truth | ZERO (Derives from Audit/Base)| Risk of duplicating   |
|                           |                               | Phase 13 Work Requests|
+---------------------------+-------------------------------+-----------------------+
| Model Duplication         | ZERO new models               | ZERO new models       |
+---------------------------+-------------------------------+-----------------------+
| Persistence Justification | 100% Derived (No DB write)    | 100% Derived (No DB)  |
+---------------------------+-------------------------------+-----------------------+
| Background Workers        | ZERO workers                  | ZERO workers          |
+---------------------------+-------------------------------+-----------------------+
| Product Boundary Safety   | Pure read-only analytics      | High risk of becoming |
|                           |                               | a task management tool|
+---------------------------+-------------------------------+-----------------------+
| ACL Leakage Risk          | Handled cleanly via Phase 14  | Complex filtering for |
|                           | `checkUserProjectReadAccess`  | multi-step actions    |
+---------------------------+-------------------------------+-----------------------+
| Failure Mode              | Audit log query performance   | Ambiguous resolution  |
|                           | on wide historical windows    | paths for complex loops|
+-----------------------------------------------------------------------------------+
```

### Failure Mode Analysis for Candidate 1 & Mitigations
- **Failure Mode 1: Heavy database query load during point-in-time reconstruction across wide historical ranges ($>90$ days)**.
  - *Mitigation*: Cap historical evaluation range to max 90 days; enforce mandatory indexed query parameters on `createdAt`, `fulfilledAt`, and `timestamp`; reuse in-memory caching for immutable past baseline versions.
- **Failure Mode 2: Missing timestamp metadata in early legacy documents**.
  - *Mitigation*: Fall back gracefully to `createdAt` or initial baseline creation date if specific audit events are missing; flag legacy nodes as `INDETERMINATE_HISTORICAL_EVIDENCE`.

---

## 13. Composition Analysis

Candidate 1 composes existing Phase 1–21 infrastructure cleanly without establishing parallel architecture:

```text
Existing Timestamped Collections:
  - DocumentationBaseline (Phase 12)  [createdAt, isActive, snapshot]
  - PackageFulfillmentAttestation (Phase 17) [fulfilledAt, baselineVersion]
  - SystemGovernanceWaiver (Phase 20) [createdAt, revokedAt, expiresAt]
  - DocumentAudit (Phase 4)          [timestamp, action, documentId]
  - ProjectTopologyLink (Phase 14)   [createdAt, consumer, provider]
                    ↓
Temporal State Reconstruction Engine (system-governance-lineage.service.ts)
  1. Filter records active at target timestamp T_hist
  2. Reconstruct point-in-time topology graph (Phase 14 ACL applied)
                    ↓
Phase 18 Baseline Alignment Evaluator (system-baseline-alignment.service.ts)
                    ↓
Phase 19 System Gate Evaluator (evaluateSystemTopologyGovernanceGate)
                    ↓
Phase 20 Exception Evaluator (matchActiveWaiver)
                    ↓
Result: Point-in-Time Historical Gate State (PASSED / BLOCKED / PASSED_WITH_WAIVER)
        + Historical State Diff (T_1 vs T_2)
        + Causal Event Lineage (Attributed Root Events)
```

---

## 14. Persistence / Worker Analysis

- **Persistence Decision**: **ZERO NEW PERSISTENCE**.
  - Candidate 1 requires no new Mongoose models, database collections, schema fields, or indexes. All historical timelines, point-in-time gate evaluations, and state diffs are derived dynamically at query time from existing timestamped collections (`DocumentationBaseline`, `PackageFulfillmentAttestation`, `SystemGovernanceWaiver`, `DocumentAudit`, `ProjectTopologyLink`).
- **Worker Decision**: **ZERO BACKGROUND WORKERS**.
  - Historical state reconstruction and timeline calculation are 100% synchronous, deterministic request-scoped calculations. No background cron jobs, queue workers, or async background sweepers are introduced.

---

## 15. Security / ACL Analysis

Candidate 1 strictly preserves Documan's established permission boundaries:

1. **Permission-Safe Historical Reconstruction**:
   - Reuses Phase 14 `checkUserProjectReadAccess(userId, targetProjectId)` for all historical query evaluations.
   - If a user currently lacks `READ` access to an upstream provider project, that project node, its historical baselines, attestations, waivers, and audit events are **100% omitted** from the historical graph and timeline calculations.
2. **Zero Information Leakage in State Diffs**:
   - State diffs ($T_1$ vs $T_2$) between two historical timestamps calculate changes strictly over projects to which the requesting user has explicit `READ` access.
   - Forbidden node IDs, unauthorized project names, restricted waiver reasons, and private audit actor IDs are never exposed in error messages or response payloads.

---

## 16. Historical / Longitudinal Gap Analysis

Our repository inspection confirms that while Documan has rich historical artifact collections (`DocumentAudit`, `DocumentVersion`, `DocumentationBaseline`, `PackageFulfillmentAttestation`), it lacks any service layer capable of performing **Longitudinal Temporal Synthesis**.

Prior to Phase 22, Documan treats history as static append-only logs. Candidate 1 transforms these static logs into an active **Longitudinal Intelligence Engine** that can:
- Reconstruct exact historical release gate status at any past timestamp.
- Compare system governance states across sprint boundaries ($T_{\text{sprint\_start}}$ vs $T_{\text{sprint\_end}}$).
- Trace the lifecycle velocity of policy waivers from grant to resolution.

---

## 17. Change Intelligence Gap Analysis

Change intelligence in Phase 11 (`change-intelligence.service.ts`) was limited to local single-document verification planning. Candidate 1 expands change intelligence to the **System Topology Level** by answering:
- "Which upstream change package fulfillment caused our downstream system gate to become blocked on Tuesday?"
- "What changed in our contract alignment state between Baseline v1.0 and Baseline v2.0?"
- "Which active waivers allowed releases during the last 30 days, and have those underlying contract misalignments been permanently resolved?"

---

## 18. Product Maturity Analysis

Documan's governance progression demonstrates clear maturity advancement:

```text
Phase 10: Local Document Assurance Gate (Single-document readiness)
   ↓
Phase 14: System Architecture Topology (Multi-project contract boundaries)
   ↓
Phase 18: System Baseline Alignment (Dual-metric contract lineage)
   ↓
Phase 19: System Topology Governance Gate (Real-time release readiness)
   ↓
Phase 20: System Governance Exception Waivers (Time-bounded policy overrides)
   ↓
Phase 21: Pre-Release What-If Simulation (Hypothetical future impact analysis)
   ↓
Phase 22: System Governance State Lineage & Longitudinal Timeline Engine (Historical & causal intelligence)
```

Phase 22 represents the natural, complete culmination of the governance series, providing **Historical & Causal Intelligence** to complement Real-Time Gate Evaluation (Phase 19), Exception Management (Phase 20), and Future Simulation (Phase 21).

---

## 19. Recommended Phase 22 Direction

We formally recommend **Candidate 1: System Topology Governance State Lineage & Longitudinal Timeline Engine** for Phase 22.

### Summary of Recommended Scope:
- **Service**: `system-governance-lineage.service.ts`
- **Controller**: `system-governance-lineage.controller.ts`
- **Routes**: `system-governance-lineage.routes.ts`
- **Types**: `system-governance-lineage.types.ts`
- **Frontend Component**: `SystemGovernanceLineageTimeline.tsx`
- **Persistence**: ZERO database mutations / 0 new collections.
- **Workers**: ZERO background queue workers.
- **ACL**: 100% permission-safe via Phase 14 access checks.

---

## 20. Why This Belongs in Documan

1. **Grounded in Document & Project Context**: Operates directly on Documan's core primitives—documents, baselines, attestations, waivers, and topology links.
2. **Differentiated Traceability**: Elevates Documan from a static document repository into a system-of-record capable of proving historical release safety and governance compliance over time.
3. **Complements Existing Capabilities**: Seamlessly composes Phases 4, 10, 12, 14, 17, 18, 19, 20, and 21 without architecture duplication.

---

## 21. Explicit Non-Goals

Phase 22 strictly avoids:
- Software deployment execution, release pipelines, Docker builds, or cloud infrastructure orchestration.
- CI/CD build runner execution, automated deployment triggers, or notification sweepers.
- Persistent database models, snapshot tables, or stateful timeline record storage.
- Generic issue tracking, task management, or ticket assignment workflows.
- Mandatory AI, LLM, RAG, or non-deterministic machine learning features.
- Visual vector diagram canvas editing (e.g. Miro / Lucidchart clones).

---

## 22. Risks & Mitigation

| Identified Risk | Severity | Mitigation Strategy |
|---|:---: |---|
| **Query Performance on Large Timelines** | Moderate | Cap default query range to 90 days; enforce index usage on `createdAt`, `fulfilledAt`, and `timestamp`; optimize MongoDB aggregation pipelines. |
| **ACL Data Leakage in State Diffs** | High | Re-apply `checkUserProjectReadAccess` to every project node before computing state diffs; filter unauthorized nodes completely. |
| **Legacy Records Missing Timestamps** | Low | Fallback to `createdAt` or initial baseline creation date; mark legacy state as `INDETERMINATE_HISTORICAL_EVIDENCE`. |

---

## 23. Open Questions

1. **Timeline Query Boundary**: Should the default historical timeline query window be capped at 30 days or 90 days? (*Recommended default: 30 days, max 90 days*).
2. **Event Granularity**: Should minor document metadata updates be included in the causal timeline, or strictly baseline bumps, attestation fulfillments, and waiver grants/revocations? (*Recommended: Baseline bumps, attestations, and waivers only to avoid noise*).

---

## 24. Recommendation for Implementation Planning

1. **Approval**: Present `docs/research/PHASE-22-RESEARCH.md` for user review and approval.
2. **Implementation Plan**: Upon approval of Candidate 1, proceed to draft `docs/research/PHASE-22-IMPLEMENTATION-PLAN-v1.md`.
3. **Execution Boundary**: Do NOT create a feature branch or write code until the Phase 22 implementation plan is explicitly approved.
