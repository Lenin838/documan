# Phase 20 Research v1 — Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

## 1. Research Objective

The objective of Phase 20 research is to identify, evaluate, and define the next authoritative product capability for **Documan** following the successful completion of **Phase 19: Cross-Project System Topology Governance Gate** (merged in commit `0da9578`).

This research artifact inspects the current repository state, analyzes the architectural gap after Phase 19, evaluates five candidate capabilities against a 50-point scoring model, enforces strict product boundaries against product drift, and defines the winning Phase 20 capability: **Cross-Project System Governance Exception & Policy Waiver Lifecycle Management**.

---

## 2. Current Product Baseline (Phase 1 – Phase 19)

A comprehensive inspection of the Documan repository on `main` (`3852f14`) establishes the exact baseline of implemented capabilities across the 14 API modules:

| Phase | Capability Area | Key Services / Models | Architectural Function |
| :--- | :--- | :--- | :--- |
| **Phase 1–6** | Core Document Management | `Document`, `DocumentVersion`, `Folder`, `User`, `DocumentShare` | CRUD, hierarchical folders, versioning, SHA-256 checksums, JWT auth, permission checks (`READ`/`EDIT`/`ADMIN`). |
| **Phase 7.1–7.2** | Project & API Context | `Project`, `ApiSpec`, `ApiSpecEndpoint` | Associates technical documents with project boundaries and OpenAPI spec endpoints. |
| **Phase 7.3** | Cross-Document Impact | `DocumentRelationship`, `document-impact-cascade.service.ts` | Graph of typed document links (`DEPENDS_ON`, `REFERENCES`, `REPLACES`, `RELATED`) with change cascade analysis. |
| **Phase 7.4** | Immutable Snapshots | `DocumentVersion`, SHA-256 integrity | Content hashing, immutable version snapshots, and content historical comparison. |
| **Phase 7.5** | Technical Knowledge Risk | `knowledge-risk.service.ts` | Quantitative knowledge risk scoring, stale review age tracking, and risk categorization. |
| **Phase 8** | Knowledge Discovery | `knowledge-discovery.service.ts` | Search, taxonomy tagging, document relevance ranking, and contextual knowledge discovery. |
| **Phase 9** | Documentation Evidence | `evidence-calculator.ts`, `evidence.service.ts` | Quantitative evidence coverage calculations for technical specifications and project assets. |
| **Phase 10** | Local Governance & Assurance | `release-gate-evaluator.service.ts`, `governance-evaluator.service.ts`, `gate-token.ts`, `GovernanceWaiver` | Single-project document health checks, GateToken CI/CD auth, and local document-level waivers (`GOVERNANCE_WAIVER_GRANTED`). |
| **Phase 11** | Change Intelligence | `verification-plan.service.ts` | Automated verification plan generation for proposed document changes. |
| **Phase 12** | Authoritative Baselines | `DocumentationBaseline` | Point-in-time document version snapshots and baseline drift tracking per project (`isActive: true`). |
| **Phase 13** | Work Requests | `WorkRequest` | Structured documentation review workflows, assignments, and status tracking. |
| **Phase 14** | Project Topology Graph | `ProjectTopologyLink`, `project-topology.service.ts` | Inter-project dependency graph (`DEPENDS_ON`, `PROVIDES_API_TO`) with ACL-safe traversal (`MAX_DEPTH=3`, `MAX_NODES=50`). |
| **Phase 15** | Pre-Change Simulation | `ChangeProposal`, `change-proposal.service.ts` | Impact simulation and structural change proposal engine. |
| **Phase 16** | Change Packages | `DocumentChangePackage`, `change-package.service.ts` | Multi-proposal change aggregation and coordinated impact simulation across documents. |
| **Phase 17** | Fulfillment Attestation | `PackageFulfillmentAttestation`, `change-package-attestation.service.ts` | Post-acceptance verification, version snapshot binding, and dynamic query-time attestation staleness detection. |
| **Phase 18** | Baseline Contract Lineage | `system-baseline-alignment.service.ts` | Derived, query-time cross-project contract alignment (`ALIGNED`, `MISALIGNED`, `INDETERMINATE`) and dual-metric scoring. |
| **Phase 19** | System Topology Gate | `system-topology-governance-gate.service.ts` | Cross-project release gate evaluating 9-step decision precedence across topology graphs (`PASSED`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`). |

---

## 3. Repository-Grounded Gap Analysis

With Phase 19 completed, Documan evaluates system-wide release readiness across connected project graphs (`ProjectTopologyLink`). Phase 19 enforces a strict 9-step precedence decision model:

```text
1. Root governance disabled -> GOVERNANCE_DISABLED (passed: false)
2. Root local gate blocked -> BLOCKED (passed: false)
3. Topology truncation -> INDETERMINATE (passed: false)
4. Required evidence indeterminate -> INDETERMINATE (passed: false)
5. Contract reference misaligned -> BLOCKED (passed: false)
6. Provider baseline unattested / attestation missing -> BLOCKED (passed: false)
7. Provider attestation stale -> BLOCKED (passed: false)
8. Upstream provider local gate blocked -> BLOCKED (passed: false)
9. Fully satisfied -> PASSED (passed: true)
```

### The Real Operational Problem

While this model is mathematically sound, real-world software engineering organizations encounter a critical **policy exception deadlock**:

1. **Binary Release Gate Deadlock**: When an upstream provider project has a minor contract misalignment (e.g. an un-attested non-breaking field addition) or a stale attestation, Phase 19 returns `systemReleaseStatus: 'BLOCKED'` and `passed: false`. 
2. **All-or-Nothing Bypassing Risk**: Currently, the ONLY way for a team to bypass a release blocker is to disable governance on the root project (`isGovernanceEnabled: false`). This yields `GOVERNANCE_DISABLED`, which strips away all audit logging, turns off local health checks, and creates an un-governed security blind spot.
3. **Absence of Cross-Project Governance Exceptions**: Phase 10 introduced local document-level waivers (`GovernanceWaiver`). However, Documan currently possesses **ZERO cross-project governance exception primitives**. There is no structured, audit-logged mechanism to say: *"Project Alpha's dependency on Provider Beta v1.2 is acknowledged to have an unattested baseline, but Architect Alice has granted a 14-day System Governance Waiver for Release Milestone 2.4."*
4. **Lack of Exception Expiration & Scope Controls**: Without structured system waivers, temporary workarounds become permanent, unmonitored security debt.

---

## 4. Evaluation of Phase 20 Candidates

We investigated five distinct candidate capabilities designed to solve meaningful document management and system governance problems without causing product drift:

---

### Candidate 1: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

- **Capability Name**: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management
- **User Problem**: Teams in multi-project environments are blocked from deploying system releases by rigid cross-project gate failures (e.g. stale upstream attestation or version mismatch), forcing them to completely disable governance (`isGovernanceEnabled: false`) because no audit-safe, time-bounded policy exception mechanism exists at the topology level.
- **Current Documan Gap**: Phase 10 provides single-document waivers (`GovernanceWaiver`), but there is no cross-project governance exception model that operates on `ProjectTopologyLink`, `system-baseline-alignment.service.ts`, or `system-topology-governance-gate.service.ts`.
- **Existing Primitives Reused**: Phase 10 `DocumentAudit`, Phase 14 `ProjectTopologyLink`, Phase 17 `PackageFulfillmentAttestation`, Phase 18 `system-baseline-alignment.service.ts`, Phase 19 `system-topology-governance-gate.service.ts`.
- **New Capability Introduced**: `SystemGovernanceWaiver` model and evaluation engine supporting scoped (root project, target provider project, target document, contract version), time-bounded (`expiresAt`), audit-logged governance exceptions, producing an updated 10-step gate decision (`PASSED_WITH_WAIVER` / `WAIVED_BLOCKED`).
- **Why It Belongs in Documan**: Directly extends Documan's governance identity into real-world enterprise release workflows where risk-managed policy exceptions are a mandatory operational requirement.
- **Architectural Impact**: Service layer expansion in `system-topology-governance-gate.service.ts`, query-time waiver matching, zero changes to document versioning or project topology structures.
- **Persistence Requirements**: Single new Mongoose model `SystemGovernanceWaiver` storing exception scope, rationale, expiration, and attestor metadata.
- **Worker / Background Requirements**: **ZERO background workers**. Expiration is evaluated dynamically at query time using MongoDB date filters (`expiresAt: { $gt: new Date() }`).
- **Security / ACL Implications**: Reuses Phase 14 `checkUserProjectReadAccess`. Waiver creation restricted to users with `EDIT` or `ADMIN` permission on the root project. Unauthorized connected projects cannot be waived.
- **Relationship to Previous Phases**: Composes Phase 10 (waiver audit patterns), Phase 14 (topology links), Phase 17 (attestations), Phase 18 (baseline alignment), and Phase 19 (system release gate).
- **Product Differentiation**: Differentiates Documan from simple CI gate checkers by offering audit-defensible, scope-bound governance policy exception lifecycles.
- **Implementation Complexity**: Medium (API & Service: Medium, Web UI: Medium).
- **Major Risks**: Risk of over-permissive waiver matching if scope fields are underspecified. Mitigated by strict compound indexing and exact scope matching rules.
- **Explicit Non-Goals**: No automatic waiver granting, no deployment pipeline triggering, no generic task assignment.

---

### Candidate 2: Longitudinal System Topology Governance Audit & Historical Release Lineage Ledger

- **Capability Name**: Longitudinal System Topology Governance Audit & Historical Release Lineage Ledger
- **User Problem**: Technical stewards and compliance auditors cannot inspect past system release gate decisions or analyze how system governance health evolved over time (e.g., "Which upstream project introduced the contract misalignment that broke our release gate last Tuesday?").
- **Current Documan Gap**: Phase 19 evaluates system release gate status dynamically at query time without persisting point-in-time system release gate snapshots or decision transition diffs.
- **Existing Primitives Reused**: Phase 10 `DocumentAudit`, Phase 18 `calculateSystemBaselineAlignment`, Phase 19 `evaluateSystemTopologyGovernanceGate`.
- **New Capability Introduced**: `SystemGovernanceAuditLedger` recording point-in-time system gate evaluation snapshots, decision transition timelines, and baseline drift evolution reports.
- **Why It Belongs in Documan**: Fits Documan's immutable history and traceability identity, offering auditability for system-wide release decisions.
- **Architectural Impact**: Event listeners or snapshot persistence on gate checks; new analytical routes.
- **Persistence Requirements**: New collection `SystemGovernanceSnapshot` storing serialized gate responses over time.
- **Worker / Background Requirements**: Optional queue worker for snapshot pruning or historical aggregation.
- **Security / ACL Implications**: Snapshot retrieval must filter out unauthorized project nodes recorded in historical snapshots.
- **Relationship to Previous Phases**: Extends Phase 10 audit logging and Phase 19 gate decisions.
- **Product Differentiation**: Provides audit trail for technical documentation release compliance.
- **Implementation Complexity**: Medium.
- **Major Risks**: Database storage growth from frequent snapshot logging during CI/CD polling.
- **Explicit Non-Goals**: Not a general log analytics or APM monitoring tool.

---

### Candidate 3: Cross-Project System Baseline Delta & Multi-Topology Contract Drift Analysis

- **Capability Name**: Cross-Project System Baseline Delta & Multi-Topology Contract Drift Analysis
- **User Problem**: When preparing a major system release involving multiple projects, architects struggle to visualize the cumulative structural contract changes between "Release v1.0 System State" and "Release v2.0 Candidate System State" across connected projects.
- **Current Documan Gap**: Phase 18 calculates contract alignment for current active baselines, but cannot perform comparative structural diffs between two multi-project system baseline snapshots across time.
- **Existing Primitives Reused**: Phase 12 `DocumentationBaseline`, Phase 14 `ProjectTopologyLink`, Phase 18 `calculateSystemBaselineAlignment`.
- **New Capability Introduced**: Comparative system baseline diff calculator, multi-project contract evolution map, and cumulative schema drift visualization.
- **Why It Belongs in Documan**: Enhances pre-change planning and contract baseline visibility across projects.
- **Architectural Impact**: Analytical query service comparing sets of baseline snapshots across topology graphs.
- **Persistence Requirements**: Zero new models; query-time comparison of historical `DocumentationBaseline` records.
- **Worker / Background Requirements**: Zero background workers.
- **Security / ACL Implications**: Must enforce `checkUserProjectReadAccess` across both baseline snapshot sets.
- **Relationship to Previous Phases**: Extends Phase 12 baselines and Phase 18 alignment.
- **Product Differentiation**: Deep multi-project baseline contract comparative analysis.
- **Implementation Complexity**: Medium-High (complex graph snapshot matching).
- **Major Risks**: High computation overhead when comparing deep multi-project baseline graphs.
- **Explicit Non-Goals**: AST-level OpenAPI schema diffing or live code parsing.

---

### Candidate 4: System Governance Policy Rules Engine & Enterprise Compliance Automation

- **Capability Name**: System Governance Policy Rules Engine & Enterprise Compliance Automation
- **User Problem**: Different projects and business units require custom governance standards (e.g. strict compliance for payment services vs lenient rules for internal tooling) that exceed Documan's fixed gate rules.
- **Current Documan Gap**: System gate evaluation rules are statically defined in code (9-step precedence) and cannot be customized per project or environment.
- **Existing Primitives Reused**: Phase 10 `release-gate-evaluator.service.ts`, Phase 18 `system-baseline-alignment.service.ts`, Phase 19 `system-topology-governance-gate.service.ts`.
- **New Capability Introduced**: Configurable policy rule definitions (`SystemGovernancePolicyRule`), custom rule assertion evaluation, custom compliance scoring, and violation reporting.
- **Why It Belongs in Documan**: Extends governance customizable rule engines to enterprise system topologies.
- **Architectural Impact**: New rule engine service intercepting and evaluating rule conditions during gate checks.
- **Persistence Requirements**: New model `SystemGovernancePolicyRule` storing custom rule expressions and target scopes.
- **Worker / Background Requirements**: Zero background workers.
- **Security / ACL Implications**: Policy rule creation must be restricted to project admins.
- **Relationship to Previous Phases**: Extends Phase 10 governance policies and Phase 19 system gate.
- **Product Differentiation**: Flexible enterprise governance rule customization.
- **Implementation Complexity**: High (building a safe rule expression parser/evaluator).
- **Major Risks**: Product drift toward a generic policy engine (e.g. OPA clone); complexity in rule syntax parsing.
- **Explicit Non-Goals**: No arbitrary code execution or Rego/OPA policy language parsing.

---

### Candidate 5: System Architecture Governance Dashboard & Cross-Project Stewardship Impact Matrix

- **Capability Name**: System Architecture Governance Dashboard & Cross-Project Stewardship Impact Matrix
- **User Problem**: When a system release gate is blocked, technical leads cannot determine which specific technical stewards (`stewardId`) across 10 connected projects are accountable for resolving the underlying document reviews, baselines, or attestations.
- **Current Documan Gap**: Blocker evidence lists document titles and project names, but does not aggregate steward accountability (`stewardId`) or assignable resolution tasks across the topology graph.
- **Existing Primitives Reused**: Phase 7.5 `knowledge-risk.service.ts`, Phase 10 `DocumentReview`, Phase 13 `WorkRequest`, Phase 14 `ProjectTopologyLink`, Phase 19 `system-topology-governance-gate.service.ts`.
- **New Capability Introduced**: System-wide stewardship accountability matrix, steward workload bottleneck analysis, and cross-project review assignment routing.
- **Why It Belongs in Documan**: Solves the human operational bottleneck in resolving system governance failures.
- **Architectural Impact**: Aggregation query layer across projects, documents, stewards, and work requests.
- **Persistence Requirements**: Zero new models; query-time aggregation.
- **Worker / Background Requirements**: Zero background workers.
- **Security / ACL Implications**: Must filter out un-shared steward names and unauthorized project details.
- **Relationship to Previous Phases**: Synthesizes Phase 7.5 (stewards), Phase 13 (work requests), and Phase 19 (gate blockers).
- **Product Differentiation**: Connects system release gate blockers directly to human steward accountability.
- **Implementation Complexity**: Medium.
- **Major Risks**: Risk of drifting into a Jira-like project management task board.
- **Explicit Non-Goals**: Not a general sprint planning or ticketing system.

---

## 5. Candidate Scoring (50-Point Model)

Each candidate was evaluated against 10 criteria (1 to 5 points each):

1. **Product Value**: Solves an acute user problem in document and system governance.
2. **Alignment with Documan Identity**: Preserves document management, context, traceability, and governance identity.
3. **Reuse of Existing Primitives**: Composes existing Phase 1–19 models and services effectively.
4. **Architectural Leverage**: Extends application capabilities cleanly without architectural bloat.
5. **Traceability & Governance Value**: Enhances auditability, compliance defensibility, and evidence completeness.
6. **Cross-Project Value**: Delivers multi-project architectural value.
7. **Product Differentiation**: Differentiates Documan from standard cloud storage, CI tools, and generic project tools.
8. **Implementation Feasibility**: Realistic to implement cleanly within existing code structure.
9. **Security / ACL Feasibility**: Enforces permission safety (`checkUserProjectReadAccess`) without data leaks.
10. **Scope Safety & Anti-Drift**: Resists product drift into Jira, GitHub, Postman, CI/CD, or deployment orchestration.

### Scoring Matrix

| Criterion (Max 5 pts) | Candidate 1 (Waiver Lifecycle) | Candidate 2 (Audit Ledger) | Candidate 3 (Baseline Delta) | Candidate 4 (Policy Rules) | Candidate 5 (Steward Matrix) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1. Product Value | **5.0** | 4.5 | 4.0 | 4.0 | 4.0 |
| 2. Alignment with Identity | **5.0** | 5.0 | 4.5 | 4.0 | 4.5 |
| 3. Reuse of Primitives | **5.0** | 4.5 | 4.5 | 4.0 | 4.5 |
| 4. Architectural Leverage | **5.0** | 4.5 | 4.0 | 4.0 | 4.0 |
| 5. Traceability & Governance | **5.0** | 5.0 | 4.0 | 4.5 | 4.0 |
| 6. Cross-Project Value | **5.0** | 4.5 | 4.5 | 4.0 | 4.0 |
| 7. Product Differentiation | **5.0** | 4.0 | 4.0 | 3.5 | 3.5 |
| 8. Implementation Feasibility | **4.5** | 4.5 | 4.0 | 3.5 | 4.5 |
| 9. Security / ACL Feasibility | **5.0** | 4.5 | 4.5 | 4.0 | 4.5 |
| 10. Scope Safety & Anti-Drift | **4.5** | 4.5 | 4.0 | 3.5 | 3.5 |
| **TOTAL SCORE (out of 50)** | **49.0** | **45.5** | **42.0** | **39.0** | **41.5** |

---

## 6. Recommended Phase 20 Capability

### **Cross-Project System Governance Exception & Policy Waiver Lifecycle Management**

### Definition
**Cross-Project System Governance Exception & Policy Waiver Lifecycle Management** is an audit-logged, time-bounded, scope-restricted governance exception engine (`system-governance-waiver.service.ts`) enabling authorized technical stewards to grant explicit policy waivers for cross-project release gate blockers (e.g. unaligned provider baselines, stale attestations, pending reviews) across project dependency graphs (`ProjectTopologyLink`), producing an authoritative, exception-aware system release gate decision (`PASSED_WITH_WAIVER` / `WAIVED_BLOCKED`).

### Why Now After Phase 19?
Phase 19 delivered the **Cross-Project System Topology Governance Gate**, evaluating release safety across connected projects. However, Phase 19 creates an operational binary deadlock: when an upstream project has an unaligned contract or stale attestation, the gate returns `BLOCKED`. Teams currently have no audit-safe way to grant a scoped policy exception, forcing them to either halt releases entirely or turn off governance completely (`isGovernanceEnabled: false`). Phase 20 solves this exact operational bottleneck by introducing risk-managed, audit-defensible policy waivers at the system topology level.

---

## 7. Architectural Composition & Decision Model

Phase 20 composes primitives from Phases 10, 14, 17, 18, and 19 into an updated **10-Step Decision Precedence Engine**:

```text
                  +-----------------------------------+
                  |  Root System Gate Request (GET)   |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |   Root Governance Enabled Check   |---> Disabled -> GOVERNANCE_DISABLED
                  +-----------------------------------+
                                    | Enabled
                                    v
                  +-----------------------------------+
                  |   Root Local Gate Evaluation      |---> Blocked -> BLOCKED
                  +-----------------------------------+
                                    | Passed
                                    v
                  +-----------------------------------+
                  |  ACL-Safe Topology Graph Traversal |---> Limits Exceeded -> INDETERMINATE
                  |  (Phase 14: MAX_DEPTH=3, NODES=50)|
                  +-----------------------------------+
                                    | Graph Built
                                    v
                  +-----------------------------------+
                  | Baseline Alignment & Evidence     |---> Indeterminate -> INDETERMINATE
                  | (Phase 18 Alignment Calculator)   |
                  +-----------------------------------+
                                    | Evaluated
                                    v
                  +-----------------------------------+
                  | Evaluate Un-waived Blockers       |---> Misaligned / Stale / Provider Gate Blocked
                  +-----------------------------------+
                                    |
                  +-----------------+-----------------+
                  |                                   |
                  v                                   v
         [Un-waived Blockers Exist]             [All Blockers Waived by Valid SystemWaivers]
                  |                                   |
                  v                                   v
          Status: BLOCKED                   Status: PASSED_WITH_WAIVER
          (passed: false)                   (passed: true)
                                            (systemReleaseStatus: 'PASSED_WITH_WAIVER')
```

### Updated 10-Step Precedence Rules

1. **Root Governance Disabled**: `systemReleaseStatus = 'GOVERNANCE_DISABLED'`, `passed = false`.
2. **Root Local Gate Blocked**: `systemReleaseStatus = 'BLOCKED'`, `passed = false`.
3. **Topology Truncation Limit Exceeded**: `systemReleaseStatus = 'INDETERMINATE'`, `passed = false`.
4. **Required Evidence Indeterminate**: `systemReleaseStatus = 'INDETERMINATE'`, `passed = false`.
5. **Contract Misalignment (Un-waived)**: `systemReleaseStatus = 'BLOCKED'`, `passed = false`.
6. **Provider Active Baseline Unattested (Un-waived)**: `systemReleaseStatus = 'BLOCKED'`, `passed = false`.
7. **Provider Attestation Stale (Un-waived)**: `systemReleaseStatus = 'BLOCKED'`, `passed = false`.
8. **Provider Local Gate Blocked (Un-waived)**: `systemReleaseStatus = 'BLOCKED'`, `passed = false`.
9. **All Blockers Waived by Active System Waivers**: `systemReleaseStatus = 'PASSED_WITH_WAIVER'`, `passed = true`.
10. **Fully Satisfied Without Waivers**: `systemReleaseStatus = 'PASSED'`, `passed = true`.

---

## 8. Security & ACL Considerations

- **Backend Authorization**: Waiver creation (`POST /projects/:projectId/system-governance-waivers`) requires `EDIT` or `ADMIN` permission on the root project. Read access to waivers requires `READ` permission.
- **Strict Permission-Safe Subgraph Traversal**: Reuses Phase 14 `checkUserProjectReadAccess`. If a user lacks `READ` access to a connected provider project, any waivers associated with that provider project are **100% omitted** from response evidence and metrics.
- **Audit Logging**: Waiver lifecycle events (`GOVERNANCE_SYSTEM_WAIVER_GRANTED`, `GOVERNANCE_SYSTEM_WAIVER_REVOKED`, `GOVERNANCE_SYSTEM_WAIVER_EXPIRED`) are logged in `DocumentAudit` with actor ID, timestamp, and target project scope.

---

## 9. Persistence & Background Worker Assessment

### Persistence Requirements
Single new targeted Mongoose model: `SystemGovernanceWaiver`.

```ts
export interface ISystemGovernanceWaiver extends Document {
  rootProjectId: Types.ObjectId;
  targetProviderProjectId?: Types.ObjectId;
  targetDocumentId?: Types.ObjectId;
  waiverType: 'CONTRACT_MISALIGNMENT' | 'UNATTESTED_BASELINE' | 'STALE_ATTESTATION' | 'PROVIDER_GATE_BLOCKED';
  reason: string;
  grantedByUserId: Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Compound Index Strategy
- `{ rootProjectId: 1, isRevoked: 1, expiresAt: 1 }`
- `{ targetProviderProjectId: 1, rootProjectId: 1 }`

### Background Processing
**ZERO background queue workers**. Expiration is evaluated dynamically at query time using `$gt: new Date()`. Revocation is immediate via API update (`isRevoked: true`).

---

## 10. Success Criteria

1. **Gate Decision Accuracy**: Correctly evaluates `PASSED_WITH_WAIVER` when all blockers have active, non-expired waivers, and `BLOCKED` when at least one un-waived blocker remains.
2. **Strict Boolean `passed` Semantics**: `passed === true` ONLY when `systemReleaseStatus` is `'PASSED'` or `'PASSED_WITH_WAIVER'`. `passed === false` for `BLOCKED`, `INDETERMINATE`, and `GOVERNANCE_DISABLED`.
3. **Auditability**: 100% audit logging of waiver creation and revocation in `DocumentAudit`.
4. **ACL Safety**: Zero leakage of unauthorized connected projects or waiver scopes.
5. **Performance**: Query latency for waiver-aware system release gate checks `< 35ms` (measured empirically).
6. **Regression Safety**: 100% pass rate across Phase 10, 14, 17, 18, and 19 QA matrix test suites.

---

## 11. Scope Boundaries

### IN SCOPE
- Scoped system governance waiver creation, listing, retrieval, and revocation.
- Scoped waiver matching (root project, target provider project, target document, waiver type).
- Dynamic waiver expiration check (`expiresAt`).
- 10-step precedence system release gate evaluation engine.
- Audit event logging (`GOVERNANCE_SYSTEM_WAIVER_GRANTED`, `GOVERNANCE_SYSTEM_WAIVER_REVOKED`).
- Permission-safe REST API endpoints and web UI section.

### OUT OF SCOPE
- Software deployment execution, release pipelines, Docker builds, or cloud infrastructure orchestration.
- Automatic waiver approval or AI-driven waiver generation.
- CI/CD build runner execution or pipeline triggers.
- Code generation, OpenAPI AST parsing, or live network probing.
- Background cron workers or queue infrastructure.
- Visual architecture canvas/editor.

---

## 12. Implementation Complexity Assessment

| Dimension | Assessment | Justification |
| :--- | :--- | :--- |
| **Backend Service** | **Medium** | Extends `system-topology-governance-gate.service.ts` with query-time waiver resolution. |
| **Data Model** | **Low** | Single model `SystemGovernanceWaiver` with clean compound indexes. |
| **Frontend UI** | **Medium** | System Governance Gate UI extension displaying active waivers, waiver modal, and status badges. |
| **Test Suite** | **Medium** | Vitest suite and QA matrix runner testing expired, revoked, scoped, and un-waived scenarios. |
| **Migration Risk** | **Low** | Pure additive model; zero schema changes to existing Phase 1–19 collections. |

---

## 13. Roadmap Placement Justification

Phase 20 is the exact logical successor to Phase 19. Phase 19 introduced the multi-project release gate (`system-topology-governance-gate.service.ts`). Phase 20 completes the operational governance loop by adding audit-defensible policy exceptions and waiver lifecycles for multi-project release gates.

---

## 14. Final Recommendation

**Proceed with Phase 20: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management.**

The research is complete. Standing by for Phase 20 Research Review.
