# Phase 16 — Research & Discovery
**Multi-Document Change Package & Coordinated Release Bundle Engine**

---

## Baseline

- **Repository**: Documan
- **Current Baseline**: `main = origin/main = 34dc165de1edfce4c16656eccfe47386f9203ac0`
- **Preceding Phase**: Phase 15 — Pre-Change Impact Simulation & Change Proposal Engine (`Implementation: e27958f`, `Merge: 196443d`, `Roadmap Closeout: 34dc165`)
- **Status**: RESEARCH & DISCOVERY ONLY (No application code modifications, schema changes, or roadmap edits).

---

## Current Product Capability

Documan has established a mature, document-centric technical governance and productivity platform across 15 completed product phases:

1. **Phases 1–5**: Core document management, folder hierarchies, metadata, immutable audit trails, and permission-aware sharing (RBAC/ACL).
2. **Phase 6 (Developer / Productivity Workflows)**: Directional `DocumentRelationship` links (`RELATED`, `REFERENCES`, `REPLACES`, `DEPENDS_ON`), `Project` context boundaries, external technical references, document review workflow (`PENDING`, `APPROVED`, `CHANGES_REQUESTED`), static templates/scaffolding, multi-hop impact summaries (`maxDepth <= 3`, `maxNodes = 50`), outbound webhooks, automated governance engine (age & staleness), and programmatic CI/CD release gates (`documan_gate_...`).
3. **Phases 7.1 & 7.2 (OpenAPI & API Spec Drift)**: OpenAPI 3.0/3.1 parser (`ProjectApiSpec`), endpoint registry (`ProjectApiEndpoint`), document-endpoint links (`DocumentEndpointLink`), auto-relinking, endpoint deprecation, and spec-aware release gates.
4. **Phase 7.3 (Change Impact & Cascade Verification)**: Authoritative multi-hop graph impact cascade calculation (`document-impact-cascade.service.ts`).
5. **Phase 7.4 (Immutable Versioning & Snapshots)**: Authoritative versioning (`DocumentVersion`), content checksums, version approval status, and version restore capabilities.
6. **Phase 7.5 (Knowledge Risk Radar)**: Pure multi-factor risk calculator (`calculateKnowledgeRisk`), `stewardId` operational responsibility, and permission-isolated project risk radar (`KnowledgeRiskRadarPanel`).
7. **Phase 8 (Authoritative Technical Knowledge Discovery)**: Technical knowledge indexing, search, lineage, and discovery primitives.
8. **Phase 9 (Documentation Evidence & Traceability)**: Pure evidence coverage calculator (`calculateEvidenceCoverage`) evaluating orphaned/stale links and evidence completeness.
9. **Phase 10 (Governance & Assurance Engine)**: Authoritative document assurance calculator (`calculateDocumentAssurance`), release gate scoring, and governance waiver management.
10. **Phase 11 (Verification Planning)**: `VerificationPlan` and `VerificationTask` generation, priority matrix, skip workflows, and task completion tracking.
11. **Phase 12 (Authoritative Baseline & Drift Control)**: `DocumentationBaseline` snapshots, target content checksums, `DriftReport` generation, relationship drift, and transactional re-baselining.
12. **Phase 13 (Work Requests & Review Workflow)**: `DocumentationWorkRequest` tracking, automated origin-keyed request dispatch from drift/verification/impact events, and human resolution workflows.
13. **Phase 14 (System Architecture Topology)**: Cross-project `ProjectTopologyLink` context boundaries (`DEPENDS_ON`, `PROVIDES_API_TO`, `INTEGRATES_WITH`, `SHARED_LIBRARY`), cross-project contract governance (`CROSS_PROJECT_TOPOLOGY_REQUIRED`), permission-aware node/edge omission, and interactive system topology visualization (`ProjectArchitecturePanel`).
14. **Phase 15 (Pre-Change Simulation & Proposals)**: Ephemeral read-only in-memory simulation (`runChangeProposalSimulation`), single-document `DocumentChangeProposal` persistence across human review state machine (`DRAFT` → `SIMULATED` → `UNDER_REVIEW` → `ACCEPTED` / `REJECTED` / `DISCARDED`), state fingerprinting (`computeSimulationStateFingerprint`), staleness detection, and post-acceptance handoff payload generation.

---

## Remaining Lifecycle Gaps

While Phase 15 introduced powerful pre-change decision support for a **single target document**, real-world software engineering and technical documentation refactoring exhibit a critical structural gap:

```text
  Single-Document Change Proposal (Phase 15)
                    │
                    │  (Gap: Multi-Document Refactoring)
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Real-World Engineering Reality:                         │
│ Major architectural refactoring, API version upgrades,  │
│ and system migrations span MULTIPLE documents across     │
│ MULTIPLE projects simultaneously as an atomic package. │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
     Multi-Document Change Package (Phase 16 Needed)
```

### Critical Gaps Identified:

1. **Fragmented Single-Document Proposals for Coordinated Changes**: In complex systems, updating a core API spec or changing a shared microservice contract requires updating the core specification document, 3 consumer integration guides, 2 ADRs, and a runbook. In Phase 15, engineers must simulate and create 6 separate, disconnected proposals. There is no concept of a **Change Package / Release Bundle** that evaluates their combined, aggregate impact.
2. **Missing Aggregate Multi-Document Blast Radius Simulation**: Single-document simulation calculates the blast radius of doc $A$ independently of doc $B$. When both $A$ and $B$ change together, their downstream impact cascades interact (e.g., overlapping downstream dependencies, cumulative evidence score changes, combined verification task requirements).
3. **Lack of Atomic Multi-Document Handoff & Coordinated Re-Baselining**: When a coordinated refactoring is accepted, executing version creation and baseline snapshot updates document-by-document leaves the repository in an inconsistent intermediate state between edits.
4. **No Bundle-Level Governance Approval**: Engineering leads and technical stewards need to review, approve, or reject multi-document refactoring packages as an atomic unit rather than approving 10 standalone proposals piecemeal.

---

## External Research

We investigated mature developer workflow patterns, documentation systems, and software configuration practices:

- **Write the Docs & Technical Documentation Best Practices**: Emphasizes that technical documentation refactoring (such as API v2 migrations or multi-service deprecations) must be treated as atomic "docs-as-code change sets" rather than isolated file edits.
- **Backstage / Software Catalog Architecture**: Organizes system documentation changes around "System / Domain Change Requests" that bundle documentation updates across multiple component entities simultaneously.
- **GitHub Pull Requests / Monorepo Change Sets**: Demonstrates that code and documentation changes involving multiple repositories or modules require unified pull-request reviews, atomic CI checks, and combined impact evaluation.
- **Confluence / Enterprise Knowledge Governance**: Highlights the danger of partial document updates during major system overhauls—leaving some documentation updated while dependent guides remain stale.

### Key Pattern Extracted for Documan:
Documan will not copy GitHub pull requests or Jira release managers. Instead, Documan will adapt the **Atomic Change Set & Bundle Governance Pattern** into a purely document-centered, deterministic capability: **Multi-Document Change Package & Coordinated Release Bundle Engine**.

---

## Candidate Capabilities

### Candidate A: Multi-Document Change Package & Coordinated Release Bundle Engine

- **Name**: Multi-Document Change Package & Coordinated Release Bundle Engine
- **Problem Solved**: Enables engineers and technical leads to bundle multiple related `DocumentChangeProposal` items (spanning single or multiple projects) into an atomic `DocumentChangePackage`. Provides aggregate read-only in-memory simulation of the entire change package's combined blast radius, predicted release gate status, cumulative evidence score, and joint verification requirements.
- **Why Missing Today**: Phase 15 supports only single-document proposal simulation. There is no entity or orchestrator to group, simulate, and govern multi-document change sets.
- **Phases Built Upon**: Phase 7.3 (impact cascade), Phase 7.4 (versioning), Phase 12 (baselines), Phase 13 (work requests), Phase 14 (topology), Phase 15 (change proposals & state fingerprints).
- **Core Workflow**:
  1. User creates a `DocumentChangePackage` ("v2.0 API Migration Package") for a target project.
  2. User attaches draft/simulated `DocumentChangeProposal` items (or defines candidate edits across target documents).
  3. User runs **Aggregate Package Simulation** (`POST /api/change-packages/:id/simulate`).
  4. Simulation engine computes combined multi-document blast radius, deduplicated downstream impact nodes, joint predicted release gate status, and total predicted verification requirements.
  5. Technical lead reviews the change package as an atomic unit (`UNDER_REVIEW` → `ACCEPTED` / `REJECTED`).
  6. Post-acceptance handoff payload provides coordinated multi-document version creation and baseline update instructions.
- **Data/Model Implications**: New `DocumentChangePackage` model referencing multiple `DocumentChangeProposal` IDs, package status (`DRAFT`, `SIMULATED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `DISCARDED`), aggregate fingerprint, and package review comments.
- **Backend Implications**: New `change-package-simulation.service.ts` orchestrator running multi-document overlay graph traversal, deduplicating blast radius nodes, and aggregating predicted metrics.
- **Frontend Implications**: `CreateChangePackageModal`, `ChangePackageDetailsPage`, and package simulation summary panel.
- **Authorization/Privacy Implications**: Enforces `checkUserProjectReadAccess` across all target documents and connected projects in the package; unauthorized documents/projects are strictly omitted from aggregate blast radius and metrics.
- **Audit/Governance Implications**: Log `CHANGE_PACKAGE_CREATED`, `CHANGE_PACKAGE_SUBMITTED`, `CHANGE_PACKAGE_ACCEPTED`, `CHANGE_PACKAGE_REJECTED`, `CHANGE_PACKAGE_DISCARDED`.
- **Verification/Testing Implications**: Automated QA runner (`run_phase16_qa.ts`) verifying multi-document simulation idempotency, blast radius deduplication, ACL node omission, and state transitions.
- **What it Explicitly Does NOT Do**:
  - No automatic git branch creation or GitHub PR creation.
  - No automatic multi-file code editing or LLM code generation.
  - No automatic database mutation during simulation.
  - No bypass of individual document ACL permissions.
- **Duplication Risk**: Extremely low (0% overlap with existing phases; natural evolution of Phase 15).
- **Product Value**: Exceptional. Solves the primary real-world limitation of single-document proposals.
- **Architectural Fit**: 100% aligned with Documan's deterministic, document-centered architecture.

---

### Candidate B: Technical Knowledge Sunset & Deprecation Lifecycle Engine

- **Name**: Technical Knowledge Sunset & Deprecation Lifecycle Engine
- **Problem Solved**: Provides structured lifecycle governance for deprecating and retiring technical documentation, APIs, and architectural components (`DocumentDeprecationPlan`).
- **Why Missing Today**: Documan supports setting a static `status = 'DEPRECATED'` and simulating deprecation in Phase 15, but lacks structured grace-period tracking, replacement document assignment (`supersededBy`), consumer migration milestones, or retirement verification schedules.
- **Phases Built Upon**: Phase 6 (`REPLACES` relationship), Phase 7.2 (API deprecation), Phase 11 (verification), Phase 13 (work requests), Phase 15 (`DEPRECATION_PROPOSAL`).
- **Core Workflow**: Initiate deprecation plan → map replacement docs → notify active consumers → track grace-period countdown → verify consumer migration → execute sunset archive.
- **Data/Model Implications**: `DocumentDeprecationPlan` model with sunset date, supersededBy doc ID, consumer migration checklist, and sunset status.
- **Backend Implications**: Sunset schedule evaluator, grace-period notification dispatcher, and consumer migration tracker.
- **Frontend Implications**: `DeprecationPlanModal` and `SunsetGovernancePanel`.
- **Authorization/Privacy Implications**: Permission checks on target doc and consumer projects.
- **Audit/Governance Implications**: `DEPRECATION_PLAN_CREATED`, `SUNSET_EXECUTED`.
- **Verification/Testing Implications**: Unit tests for grace-period calculation and consumer notification rules.
- **What it Explicitly Does NOT Do**: No automatic file deletion; no automatic code deprecation injection.
- **Duplication Risk**: Low (partially overlaps with Phase 6 `REPLACES` and Phase 15 `DEPRECATION_PROPOSAL`).
- **Product Value**: High for enterprise API lifecycle management, medium for general documentation.
- **Architectural Fit**: High.

---

### Candidate C: Documentation Policy & Compliance Audit Attestation Engine

- **Name**: Documentation Policy & Compliance Audit Attestation Engine
- **Problem Solved**: Enables project leads and security/compliance stewards to define custom policy rules (e.g. "All public API docs must have an assigned steward", "Evidence score must be >= 80%") and generate immutable compliance attestation snapshots (`DocumentationComplianceAudit`).
- **Why Missing Today**: Phase 10 provides hardcoded document assurance checks, but organizations cannot define custom project-level policy rules or generate formal compliance attestation records for audit compliance.
- **Phases Built Upon**: Phase 7.5 (knowledge risk), Phase 9 (evidence), Phase 10 (assurance), Phase 12 (baselines).
- **Core Workflow**: Configure project policy rules → execute compliance audit → evaluate document policy compliance → generate compliance attestation certificate.
- **Data/Model Implications**: `DocumentationPolicy` and `ComplianceAttestation` models.
- **Backend Implications**: Policy evaluation engine parsing rule expressions and generating compliance scores.
- **Frontend Implications**: `PolicyConfigPanel` and `ComplianceAuditReportView`.
- **Authorization/Privacy Implications**: Strict owner/admin restriction for policy configuration.
- **Audit/Governance Implications**: `POLICY_CREATED`, `COMPLIANCE_ATTESTATION_ISSUED`.
- **Verification/Testing Implications**: Policy rule evaluation tests.
- **What it Explicitly Does NOT Do**: No third-party SOC2/ISO automated scanner; no external code repository scanning.
- **Duplication Risk**: Moderate (overlaps with Phase 10 assurance calculator and release gates).
- **Product Value**: Moderate-High for regulated industries.
- **Architectural Fit**: Moderate (risk of rule-engine complexity).

---

### Candidate D: Automated Documentation Coverage & Context Gap Analyzer

- **Name**: Automated Documentation Coverage & Context Gap Analyzer
- **Problem Solved**: Scans project topology, API spec endpoints, and document relationships to identify undocumented technical context gaps (e.g., endpoints with no associated docs, projects with 0 ADRs).
- **Why Missing Today**: Documan measures completeness of *existing* documents (Phase 9 evidence), but does not scan for *missing* technical documents across system topology boundaries.
- **Phases Built Upon**: Phase 7.1 (API endpoints), Phase 8 (discovery), Phase 14 (topology).
- **Core Workflow**: Run gap scan → compute context coverage % → highlight un-documented endpoints/nodes → auto-suggest draft proposal outline.
- **Data/Model Implications**: `DocumentationGapReport` model storing missing context nodes and coverage metrics.
- **Backend Implications**: Gap analysis scanner comparing API spec endpoint registry against document links and project topology.
- **Frontend Implications**: `DocumentationGapReportPanel`.
- **Authorization/Privacy Implications**: Enforces read access across target project and specs.
- **Audit/Governance Implications**: `GAP_ANALYSIS_EXECUTED`.
- **Verification/Testing Implications**: Gap detection rule tests.
- **What it Explicitly Does NOT Do**: No LLM content generation for missing docs.
- **Duplication Risk**: Moderate (overlaps with Phase 9 evidence calculator).
- **Product Value**: Moderate.
- **Architectural Fit**: High.

---

## Weighted Comparison

We evaluate each candidate across 10 strategic dimensions on a 1–5 scale (where 5 is highest/best; Duplication Risk is reverse-scored so 5 = lowest risk):

| Evaluation Criterion | Weight | Candidate A (Change Package) | Candidate B (Sunset Lifecycle) | Candidate C (Policy Audit) | Candidate D (Gap Analyzer) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **User Value** | 15% | **5** | 4 | 3 | 3 |
| **Architectural Fit** | 15% | **5** | 4 | 4 | 4 |
| **Lifecycle Continuity** | 15% | **5** | 4 | 3 | 3 |
| **Reuse of Infrastructure** | 10% | **5** | 4 | 4 | 3 |
| **Product Differentiation** | 10% | **5** | 4 | 3 | 3 |
| **Governance Value** | 10% | **5** | 4 | 4 | 3 |
| **Traceability Value** | 5% | **5** | 4 | 4 | 4 |
| **Implementation Feasibility** | 10% | **5** | 4 | 3 | 4 |
| **Privacy / Safety** | 5% | **5** | 5 | 5 | 5 |
| **Low Duplication Risk** | 5% | **5** | 3 | 2 | 3 |
| **Weighted Total Score** | **100%** | **5.00** | **4.00** | **3.50** | **3.40** |

---

## Recommended Phase 16

### **WINNER: Candidate A — Multi-Document Change Package & Coordinated Release Bundle Engine**

#### Why Candidate A Won:
1. **Direct Evolution of Phase 15**: Phase 15 solved single-document pre-change simulation (`DocumentChangeProposal`). Real-world refactoring (such as breaking API migrations, system architecture updates, and multi-service documentation shifts) involves multiple related documents across multiple projects. Candidate A extends simulation from single documents to **Atomic Multi-Document Change Packages**.
2. **Eliminates Fragmented Proposal Review**: Instead of forcing users to create, simulate, and review 8 separate proposals piecemeal, Candidate A allows engineers to bundle proposals into a single `DocumentChangePackage`, run an aggregate simulation of the combined blast radius, and review/accept the package as an atomic unit.
3. **100% Infrastructure Reuse**: Builds directly on Phase 15 simulation logic (`runChangeProposalSimulation`), Phase 14 topology ACLs (`checkUserProjectReadAccess`), Phase 12 baselines, and Phase 13 work request handoffs without introducing redundant engines.
4. **Zero AI / Zero Side-Effect Discipline**: Remains 100% deterministic, explainable, and read-only during simulation, adhering strictly to Documan's architectural identity.

---

## Architectural Principles

1. **Document-Centered Authority**: The `Document` remains the fundamental atom. `DocumentChangePackage` is a logical container bundling `DocumentChangeProposal` records.
2. **Ephemeral Simulation Safety**: Multi-document package simulation is 100% read-only in memory. It produces 0 database mutations, 0 audit logs, 0 version records, and 0 work requests during simulation.
3. **Deduplicated Multi-Document Blast Radius**: Aggregate simulation must merge and deduplicate downstream impacted nodes across all target documents in the package to prevent double-counting shared dependencies.
4. **Strict Permission-Aware Node Omission**: ACL rules (`checkUserProjectReadAccess`) apply to every document and project in the package. Unauthorized nodes, edges, contract counts, or metadata are completely omitted from API responses.
5. **Atomic Review & Version Handoff**: Accepting a change package transitions all attached proposals to `ACCEPTED` and generates a unified handoff payload for multi-document version creation and baseline snapshot updates.

---

## Non-Goals

Phase 16 strictly avoids:

- Git repository monorepo management or automatic PR generation.
- Automated code refactoring, AST parsing, or LLM code generation.
- Automatic multi-document state mutation during simulation.
- Unbounded graph traversal (preserves `MAX_DEPTH = 3`, `MAX_NODES = 50`).
- Overwriting individual document ACL permissions or project security boundaries.

---

## Open Questions

1. Should a `DocumentChangePackage` be restricted to a single primary project, or allow candidate proposals targeting documents across multiple projects? *(Recommendation: Support multi-project packages provided the package creator has EDIT access to the primary project and READ access to connected target projects).*
2. How should package staleness be evaluated when one of the underlying documents in the package is edited? *(Recommendation: A package is stale if ANY attached proposal's simulation state fingerprint mismatches current authoritative state).*

---

## Conclusion

**Candidate A (Multi-Document Change Package & Coordinated Release Bundle Engine)** is the unambiguous, highly justified choice for **Phase 16**. It completes the pre-change decision support lifecycle by scaling Phase 15 single-document proposals into atomic, multi-document change packages—solving real-world technical documentation refactoring problems while preserving Documan's core architectural principles.
