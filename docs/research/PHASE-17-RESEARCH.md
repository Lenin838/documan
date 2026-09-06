# Phase 17 Research
**Documentation Change Package Fulfillment Verification & Immutable Attestation**

---

## Baseline

- **Repository**: Documan
- **Current Main Baseline**: `main = origin/main = 6e1abbd24a2ba865ce74e688c4fa74f3d191cd35`
- **Preceding Phase**: Phase 16 — Multi-Document Change Packages & Coordinated Impact Simulation (`Implementation: 6eb204a0`, `Verification Fix: a78b8825`, `Merge: bb6921a`, `Roadmap Closeout: 6e1abbd`)
- **Status**: RESEARCH & DISCOVERY ONLY (No application code modifications, schema changes, or roadmap edits).

---

## Current Product Capability

Documan has established a mature, document-centric technical governance, traceability, and productivity platform across 16 completed product phases:

1. **Phases 1–5**: Core document management, folder hierarchies, tag/metadata discovery, immutable audit trails, and permission-aware sharing (RBAC/ACL).
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
15. **Phase 16 (Multi-Document Change Packages)**: Project-scoped `DocumentChangePackage` grouping multiple constituent proposals into coordinated release units (`PKG-YYYYMMDD-XXXX`), aggregate in-memory overlay graph traversal (`runChangePackageSimulation`), multi-proposal conflict analysis (`MUTUALLY_EXCLUSIVE_TARGET`, `CONTRADICTORY_RELATIONSHIP`, `DEPRECATION_DEPENDENCY_CONFLICT`, `CIRCULAR_DEPENDENCY_INJECTION`, `INCOMPATIBLE_CONTRACT_SCHEMA`), aggregate governance prediction, package state fingerprinting (`computePackageStateFingerprint`), deduplicated blast radius rosters, permission-aware ACL node omission, and side-effect free package acceptance handoff.

---

## Product Gap Analysis

### Current Product Progression Chain

```text
Phase 15 — Predict (Single Proposal Simulation)
        ↓
Phase 16 — Coordinate (Multi-Document Change Package)
        ↓
Phase 17 — Verify & Attest (Fulfillment Verification & Attestation)
        ↓
Phase 12 — Baseline (Baseline Eligibility & Handoff)
```

### Full Authoritative Lifecycle Sequence

```text
PROPOSE
  ↓
SIMULATE
  ↓
COORDINATE
  ↓
ACCEPT
  ↓
AUTHORITATIVE DOCUMENT VERSION(S)
  ↓
VERIFY FULFILLMENT
  ↓
ATTEST
  ↓
BASELINE ELIGIBILITY / HANDOFF
```

### The Post-Acceptance Operational Gap

Phases 15 and 16 introduced pre-change decision support: simulating impacts, detecting conflicts, fingerprinting states, and obtaining human review acceptance for single proposals (`DocumentChangeProposal`) and multi-document bundles (`DocumentChangePackage`).

However, when a proposal or package transitions to **`ACCEPTED`**, Documan purposefully performs **zero automated database mutations**. Instead, acceptance outputs a structured **Handoff Payload** containing step-by-step instructions for authors to execute version updates (`DocumentVersion`), resolve work requests (`DocumentationWorkRequest`), and trigger baseline updates (`DocumentationBaseline`).

This creates a critical post-acceptance operational gap in the documentation lifecycle:

```text
┌────────────────────────────────────────────────────────┐
│  Phase 15/16 Pre-Change Decision Support               │
│  - Proposal / Package Created                          │
│  - Aggregate Simulation Executed                       │
│  - Conflicts Analyzed & Fingerprinted                  │
│  - Package APPROVED / ACCEPTED                         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ Handoff Payload Generated
                           ▼
┌────────────────────────────────────────────────────────┐
│  POST-ACCEPTANCE OPERATIONAL GAP                       │
│  1. Did authors actually execute the planned edits?    │
│  2. Do the newly created DocumentVersions match the   │
│     proposed changes without unapproved scope drift?   │
│  3. Were all constituent proposals in the accepted     │
│     package completed across target documents?         │
│  4. Has the package achieved full execution fidelity  │
│     and compliance verification?                       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Authoritative State (Phases 7.4, 10, 12, 13)         │
│  - DocumentVersion created manually                    │
│  - Baseline drift / Release gate polls                 │
└────────────────────────────────────────────────────────┘
```

### Specific Operational Challenges Discovered:

1. **Unverified Package Fulfillment**: After a change package is accepted, there is no automated engine to verify whether the newly authored `DocumentVersion` records actually fulfill the accepted proposed changes. Authors may update 3 of 5 documents in a package and forget the remaining 2, or introduce unapproved changes outside the accepted proposal scope.
2. **Missing Post-Acceptance Fulfillment Attestation**: Technical stewards and compliance auditors need a deterministic **Package Fulfillment Attestation Record** that links an accepted `DocumentChangePackage` to its resulting authoritative `DocumentVersion` snapshots, confirming 100% execution fidelity before recommending re-baselining.
3. **Disconnected Execution Tracking**: Currently, after package acceptance, progress tracking reverts to checking individual `DocumentationWorkRequest` items or waiting for baseline drift checks in Phase 12. There is no package-level verification engine monitoring the fulfillment status of all constituent proposals within an accepted package.
4. **Lack of Baseline Promotion Eligibility Handoff**: Project leads cannot automatically determine if an accepted package is eligible for baseline promotion (`DocumentationBaseline`) without manually inspecting each document's version history, content checksums, and relationship states.

---

## External Research

We investigated mature software configuration management, technical specification verification, and compliance attestation patterns across high-integrity technical environments:

1. **ISO/IEC 26262 & DO-178C Technical Change Verification & Attestation**: In safety-critical systems engineering, approving a change request (CR) is distinct from verifying change execution. Compliance requires an explicit "Change Verification & Attestation" phase that audits the final implementation against the approved change request before updating the system baseline.
2. **SLSA (Supply-chain Levels for Software Artifacts) Provenance & Attestation**: Emphasizes generating cryptographic attestation records that prove a final artifact was created in exact accordance with an approved build specification.
3. **AWS CodeDeploy / HashiCorp Terraform State Verification**: Highlights that after a plan is approved and applied, state verification checks must run to confirm that the actual infrastructure state matches the approved plan without execution drift.
4. **Backstage / Technical Documentation Governance**: Demonstrates that multi-document refactoring packages require automated post-edit verification to ensure technical references and endpoint links remain unbroken across documentation updates.

### Key Pattern Extracted for Documan:

Documan will not copy software deployment tools, CI/CD runners, or Git merge queues. Instead, Documan will adapt the **Post-Change Verification & Attestation Pattern** into a pure, document-centered governance capability: **Documentation Change Package Fulfillment Verification & Immutable Attestation**.

---

## Candidate Capabilities

### Candidate A: Documentation Change Package Fulfillment Verification & Immutable Attestation (RECOMMENDED)

- **Name**: Documentation Change Package Fulfillment Verification & Immutable Attestation
- **Core Problem Solved**: Connects accepted change packages (`DocumentChangePackage`) and proposals (`DocumentChangeProposal`) to resulting authoritative `DocumentVersion` creations. Automatically verifies post-acceptance fulfillment—confirming that all constituent proposals were fully implemented in target documents, that no unapproved scope drift occurred, and generating an immutable **Package Fulfillment Attestation Record** (`PackageFulfillmentAttestation`).
- **Why It Matters to Documan**: Completes the lifecycle loop from pre-change decision support (Phases 15–16) to post-change authoritative state (Phases 7.4, 10, 12, 13). Eliminates the operational blind spot between accepting a proposal package and confirming its actual fulfillment.
- **Existing Documan Capabilities Built Upon**:
  - Phase 7.4: `DocumentVersion` creation and SHA-256 checksum verification.
  - Phase 10: `calculateDocumentAssurance` and release gate evaluation.
  - Phase 12: `DocumentationBaseline` target snapshots and transactional re-baselining (`createBaseline`).
  - Phase 13: `DocumentationWorkRequest` origin keys.
  - Phase 15: `DocumentChangeProposal` acceptance handoff payloads.
  - Phase 16: `DocumentChangePackage` multi-proposal bundle state and fingerprints.
- **New Primitive Introduced**: `PackageFulfillmentAttestation` model representing a deterministic, audit-logged binding between an accepted package, its constituent proposals, resulting authoritative `DocumentVersion` IDs/checksums, verification outcomes, and attestor credentials.
- **Core Workflow**:
  1. Package $P$ reaches status `ACCEPTED` (Phase 16).
  2. Authors execute version updates across target documents as instructed by handoff payloads.
  3. Technical Lead triggers **Fulfillment Verification** (`POST /api/change-packages/:id/verify-fulfillment`).
  4. Engine deterministically compares each constituent proposal against current target document version checksums, content diffs, and relationship states.
  5. Engine assigns formal categorical fulfillment states (`FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `INDETERMINATE`, `UNSUPPORTED`, `STALE`).
  6. When 100% fulfilled without unapproved scope drift, Lead issues an immutable `PackageFulfillmentAttestation` record.
  7. Attestation outputs a **Baseline Eligibility Handoff Payload** for Phase 12 baseline creation (`createBaseline`).
- **Major Architectural Implications**: Pure service layer (`package-fulfillment-attestation.service.ts`) operating above `DocumentChangePackage`, `DocumentVersion`, and `DocumentationBaseline`. Zero background pollers, zero automatic baseline mutations.
- **Likely Data/Model Requirements**: `PackageFulfillmentAttestation` model storing packageId, targetVersionMap (mapping proposalId $\rightarrow$ documentVersionId), fulfillmentStatus, proposalFulfillmentResults, scopeVarianceDetails, attestedByUserId, and attestedAt.
- **Likely API/UI Implications**:
  - Backend: `POST /api/change-packages/:id/verify-fulfillment`, `POST /api/change-packages/:id/attest`, `GET /api/change-packages/:id/attestation`.
  - Frontend: `FulfillmentAttestationCard` on `ChangePackageDetailsDrawer`, displaying categorical fulfillment status, per-proposal fulfillment indicators, and "Issue Attestation & Generate Baseline Handoff" button.
- **Governance/Security Implications**: Requires `EDIT` or `ADMIN` authority on target project. READ access provides visibility/context ONLY. Generates immutable `PACKAGE_FULFILLMENT_ATTESTED` system audit event.
- **Relationship to Phases 10–16**: Directly bridges Phase 16 package acceptance to Phase 7.4 versioning, Phase 12 baselines, and Phase 10 release gates.
- **Duplication Check**: 0% overlap. Does not duplicate version creation (Phase 7.4), baseline snapshot storage (Phase 12), proposal simulation (Phase 15), or package coordination (Phase 16).
- **Complexity/Risk**: Low-medium complexity, low risk (pure read-only verification logic until explicit attestation creation).
- **Expected Product Value**: Exceptional. Provides closed-loop governance from change intent to verified implementation.
- **External Evidence**: ISO 26262 change verification attestation, SLSA provenance attestation, Terraform plan-vs-actual state verification.

---

### Candidate B: Technical Knowledge Sunset & Deprecation Governance Engine

- **Name**: Technical Knowledge Sunset & Deprecation Governance Engine
- **Core Problem Solved**: Provides structured lifecycle governance for deprecating and retiring technical documentation, APIs, and architectural components via `DocumentSunsetPlan`.
- **Why It Matters to Documan**: Extends static `status = 'DEPRECATED'` into active sunset management with grace-period countdowns, replacement document binding (`supersededBy`), consumer migration milestones, and retirement verification schedules.
- **Existing Documan Capabilities Built Upon**: Phase 6 (`REPLACES` relationship), Phase 7.2 (API endpoint deprecation), Phase 11 (verification plans), Phase 13 (work requests), Phase 15 (`DEPRECATION_PROPOSAL`).
- **New Primitive Introduced**: `DocumentSunsetPlan` model tracking grace-period countdowns, supersededBy document links, consumer migration progress, and automated retirement schedules.
- **Core Workflow**: Initiate sunset plan → map replacement docs → notify active downstream consumers → track grace-period countdown → verify consumer migration → execute sunset archive.
- **Major Architectural Implications**: Deprecation schedule evaluator and consumer migration progress calculator.
- **Likely Data/Model Requirements**: `DocumentSunsetPlan` model with targetDocumentId, supersededByDocumentId, gracePeriodDays, sunsetDate, consumerMigrationStatus, and planStatus.
- **Likely API/UI Implications**: `SunsetPlanModal` on `DocumentDetailsPage` and `SunsetGovernancePanel` on `ProjectDetailsPage`.
- **Governance/Security Implications**: Requires Project Owner/Admin authority.
- **Relationship to Phases 10–16**: Extends Phase 15 deprecation proposals with long-term sunset tracking.
- **Duplication Check**: Low-moderate overlap with Phase 6 `REPLACES` and Phase 15 deprecation proposals.
- **Complexity/Risk**: Medium complexity, low risk.
- **Expected Product Value**: High for enterprise API lifecycle management; moderate for general documentation.
- **External Evidence**: Google API Deprecation Policy, OpenAPI `deprecated` flag guidelines, AWS Service Sunset notices.

---

### Candidate C: Multi-Steward Approval & Release Promotion Gate Engine

- **Name**: Multi-Steward Approval & Release Promotion Gate Engine
- **Core Problem Solved**: Introduces multi-role promotion gates (`DRAFT` $\rightarrow$ `STAGING_VERIFIED` $\rightarrow$ `PRODUCTION_RELEASED`) requiring explicit sign-offs from multiple designated stewards (e.g. Security Steward + API Lead + System Architect) before a change package can be accepted.
- **Why It Matters to Documan**: Solves governance requirements for high-consequence enterprise documentation where single-user acceptance is insufficient.
- **Existing Documan Capabilities Built Upon**: Phase 7.5 (`stewardId`), Phase 10 (`calculateDocumentAssurance`), Phase 16 (`DocumentChangePackage`).
- **New Primitive Introduced**: `PackagePromotionGate` model capturing multi-steward approval policies, required steward roles, and stage promotion history.
- **Core Workflow**: Configure promotion policy → package reaches `UNDER_REVIEW` → dispatch approval requests to designated stewards → collect signatures → promote package stage upon full approval.
- **Major Architectural Implications**: Multi-party signature collector and promotion state machine.
- **Likely Data/Model Requirements**: `PackagePromotionGate` and `StewardSignature` models.
- **Likely API/UI Implications**: `PromotionGateConfigPanel` and `MultiStewardSignoffDrawer`.
- **Governance/Security Implications**: Strict role-based signature validation.
- **Relationship to Phases 10–16**: Extends Phase 16 package review state machine.
- **Duplication Check**: Moderate overlap with Phase 6 document review workflow (`DocumentReview`).
- **Complexity/Risk**: Medium-high complexity due to multi-user workflow state management.
- **Expected Product Value**: High for enterprise governance; moderate for smaller teams.
- **External Evidence**: Enterprise Change Advisory Board (CAB) workflows, ServiceNow Change Management, GitHub CODEOWNERS.

---

### Candidate D: Technical Context Gap & Coverage Scanner

- **Name**: Technical Context Gap & Coverage Scanner
- **Core Problem Solved**: Scans project topology, OpenAPI endpoint registries, and document relationship graphs to identify undocumented technical context gaps (e.g. endpoints with 0 linked documents, topology links with 0 technical contracts).
- **Why It Matters to Documan**: Proactively identifies missing documentation across system architecture boundaries before drift or outages occur.
- **Existing Documan Capabilities Built Upon**: Phase 7.1 (API endpoint registry), Phase 8 (knowledge search), Phase 9 (evidence coverage), Phase 14 (project topology).
- **New Primitive Introduced**: `ContextCoverageReport` model storing gap detection metrics, un-documented endpoint rosters, and missing architecture context nodes.
- **Core Workflow**: Trigger context coverage scan → analyze spec endpoints against `DocumentEndpointLink` → analyze topology links against `DocumentRelationship` → compute Coverage Index % → generate gap report.
- **Major Architectural Implications**: Graph analysis scanner evaluating completeness of documentation links across endpoints and topology.
- **Likely Data/Model Requirements**: `ContextCoverageReport` model.
- **Likely API/UI Implications**: `ContextCoverageWidget` on `ProjectDetailsPage`.
- **Governance/Security Implications**: Enforces read access across target project and specs.
- **Relationship to Phases 10–16**: Complements Phase 9 evidence coverage calculator.
- **Duplication Check**: Moderate overlap with Phase 9 evidence calculator.
- **Complexity/Risk**: Low-medium complexity, low risk.
- **Expected Product Value**: Moderate.
- **External Evidence**: Backstage Documentation Coverage Plugin, SonarQube Code Coverage metrics.

---

## Candidate Comparison & Scoring

We evaluate all candidates across 8 standard criteria on a 1–5 scale (where 5 is highest/best):

| Evaluation Criterion | Weight | Candidate A (Fulfillment Verification) | Candidate B (Sunset Governance) | Candidate C (Promotion Gates) | Candidate D (Gap Scanner) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Product Value** | 20% | **5** | 4 | 4 | 3 |
| **Strategic Fit** | 15% | **5** | 4 | 3 | 3 |
| **Architectural Fit** | 15% | **5** | 4 | 4 | 4 |
| **Reuse of Capabilities** | 10% | **5** | 4 | 3 | 3 |
| **Differentiation** | 10% | **5** | 4 | 3 | 3 |
| **Governance / Traceability Alignment** | 10% | **5** | 4 | 4 | 3 |
| **Implementation Feasibility** | 10% | **5** | 4 | 3 | 4 |
| **Risk / Scope Control** | 10% | **5** | 4 | 3 | 4 |
| **Weighted Total Score** | **100%** | **5.00** | **4.00** | **3.40** | **3.35** |

---

## Recommended Direction

### **WINNER: Candidate A — Documentation Change Package Fulfillment Verification & Immutable Attestation**

#### Why Candidate A Won:
1. **Direct Evolution of Phases 15 & 16**: Phases 15 and 16 solved pre-change decision support (simulating impacts, detecting conflicts, fingerprinting states, and accepting multi-document packages). Candidate A solves the immediate subsequent problem: **verifying that accepted packages were actually implemented correctly in authoritative document versions**.
2. **Closes the Post-Acceptance Governance Gap**: Without Candidate A, package acceptance outputs a handoff instruction, but Documan cannot confirm whether authors executed the changes or introduced unapproved scope drift. Candidate A provides deterministic fulfillment verification.
3. **Seamless Baseline Eligibility Handoff**: When a package achieves 100% fulfillment attestation, Candidate A provides a structured handoff payload for Phase 12 re-baselining (`createBaseline`), respecting Phase 12 authority.
4. **100% Infrastructure Reuse**: Leverages Phase 7.4 `DocumentVersion` checksums, Phase 12 `DocumentationBaseline` snapshots, Phase 13 `DocumentationWorkRequest` origin keys, and Phase 16 `DocumentChangePackage` structures without duplicating existing engines.
5. **Zero AI / Zero Side-Effect Discipline**: Remains 100% deterministic, audit-logged, and testable, upholding Documan's architectural standards.

---

## Deterministic Fulfillment & State Model

### 1. Deterministic Verification Data Grounding

Verification of an accepted `DocumentChangePackage` against target document versions is grounded strictly in deterministic repository data:

- **Target Document & Project IDs**: Resolved directly from constituent proposals (`DocumentChangeProposal`).
- **Structured Proposed Changes**: Evaluates proposed `content` diffs, `proposalType`, and `relationshipOperations` (`ADD_RELATIONSHIP` / `REMOVE_RELATIONSHIP`).
- **Authoritative Version Snapshots**: Inspects the latest `DocumentVersion` created after package acceptance, comparing `versionNumber`, `checksum`, and content.
- **Active Document Relationships**: Inspects `DocumentRelationship` records to verify proposed relationship additions or removals.

### 2. Prohibition of Non-Deterministic Analysis

Fulfillment verification MUST NOT perform:
- Arbitrary semantic interpretation or natural language processing (NLP).
- LLM reasoning or prompt-based comparison.
- Unstructured sentiment or subjective document review.

If a proposal's proposed change contains unstructured text that cannot be deterministically matched against content checksums or explicit relationship operations, the verification engine outputs **`INDETERMINATE`** or **`UNSUPPORTED`**.

### 3. Formal Fulfillment States

Primary evaluation authority is grounded in formal categorical fulfillment states rather than arbitrary numerical scores:

| Fulfillment State | Definition & Semantics |
|---|---|
| **`FULFILLED`** | All proposed changes in the constituent proposal match current target `DocumentVersion` records and active `DocumentRelationship` states exactly. |
| **`PARTIALLY_FULFILLED`** | Some constituent proposals in a package are `FULFILLED`, but others remain `UNFULFILLED` or pending version updates. |
| **`UNFULFILLED`** | Target documents have not been updated since package acceptance, or proposed changes are completely absent. |
| **`INDETERMINATE`** | Authoritative document version content or relationship state cannot be deterministically matched against proposed changes. |
| **`UNSUPPORTED`** | Proposed change type or unstructured diff format exceeds deterministic verification rules. |
| **`STALE`** | An authoritative target document or package state fingerprint diverged after verification, rendering the verification stale. |

#### Derived Numerical Metric

If a numerical metric is displayed in the UI, it is strictly **derived** from the primary categorical states:

$$\text{Fulfillment Percentage} = \left( \frac{\text{Count of FULFILLED Proposals}}{\text{Total Proposals in Package}} \right) \times 100\%$$

The primary governance authority remains the categorical fulfillment state.

---

## Baseline Integration Boundary

### Removal of Automatic Re-Baselining

Phase 17 **MUST NOT** automatically re-baseline `DocumentationBaseline`. Phase 12 remains the single authoritative engine for baseline snapshot creation and re-baselining.

- **Previous Flow (REJECTED)**: `Attestation → Automatic / 1-Click Re-Baselining`
- **Revised Flow (APPROVED)**: `Attestation → Baseline Eligibility Handoff Payload`

### Integration with Phase 12

When a package achieves `FULFILLED` status and a `PackageFulfillmentAttestation` is issued, the engine outputs a structured **Baseline Eligibility Handoff Payload**:

```json
{
  "eligibilityStatus": "ELIGIBLE_FOR_REBASELINE",
  "attestationId": "attest_67890",
  "packageId": "pkg_12345",
  "recommendedBaselineInput": {
    "name": "Post-Package PKG-20260905-001 Baseline",
    "versionTag": "v2.1.0",
    "description": "Baseline generated following verification of Change Package PKG-20260905-001"
  },
  "targetDocumentSnapshots": [
    { "documentId": "doc_1", "versionNumber": 2, "checksum": "a1b2c3..." },
    { "documentId": "doc_2", "versionNumber": 3, "checksum": "d4e5f6..." }
  ]
}
```

The Project Owner or Admin must explicitly invoke Phase 12 `createBaseline` to create the new baseline snapshot.

---

## Immutable Attestation Specification

### What the Attestation Proves

A `PackageFulfillmentAttestation` record provides an immutable, cryptographic binding proving:

1. **Accepted Change Package**: Package ID, packageNumber, and state fingerprint at acceptance.
2. **Constituent Proposals**: Proposal IDs, proposalNumbers, and proposed change specifications.
3. **Resulting Authoritative Versions**: Target document IDs, `DocumentVersion` IDs, versionNumbers, and SHA-256 content checksums created post-acceptance.
4. **Verification Outcomes**: Categorical state `FULFILLED` for all proposals.
5. **Attestation Decision**: Attestor user ID (`attestedByUserId`), timestamp (`attestedAt`), and optional justification note.

### Model Recommendation & Primitive Justification

Phase 17 recommends creating a dedicated persistent primitive: **`PackageFulfillmentAttestation`**.

#### Why Existing History (`DocumentAudit`) Is Insufficient:

Existing `DocumentAudit` records log single-document events (e.g. `FILE_REPLACE`, `STATUS_CHANGE`) in an append-only log. However, `DocumentAudit` records:
- Do not bind a multi-document `DocumentChangePackage` to a specific multi-document tuple of `DocumentVersion` IDs and checksums.
- Cannot be queried efficiently as a single structured governance attestation artifact.
- Do not store baseline eligibility handoff payloads or scope variance reports.

A dedicated `PackageFulfillmentAttestation` collection acts as the persistent, queryable, immutable record proving package fulfillment.

---

## Separation of System Authorities

Phase 17 strictly respects existing system boundaries without creating competing workflow engines:

| Subsystem | Single Authoritative Responsibility |
|---|---|
| **Phase 16 (`DocumentChangePackage`)** | Authoritative for multi-document proposal coordination, aggregate conflict matrix, and human review acceptance. |
| **Phase 17 (`PackageFulfillmentAttestation`)** | Authoritative for post-change fulfillment verification, scope variance detection, and immutable attestation binding. |
| **Phase 12 (`DocumentationBaseline`)** | Authoritative for baseline snapshot creation, versionTag management, and relationship drift calculation. |
| **Phase 10 (`calculateDocumentAssurance`)** | Authoritative for document assurance scoring, release-gate policy enforcement, and governance waivers. |
| **Phase 11 (`VerificationPlan`)** | Authoritative for verification plan generation and task completion tracking. |
| **Phase 13 (`DocumentationWorkRequest`)** | Authoritative for human work request tracking and resolution. |

---

## Handling Partial / Unsupported / Indeterminate Results

| Edge Case Scenario | Verification Outcome | Engine Behavior & Governance Rules |
|---|---|---|
| **Only some target documents updated** | `PARTIALLY_FULFILLED` | Executed proposals marked `FULFILLED`; pending proposals marked `UNFULFILLED`. Attestation issuance blocked until 100% fulfilled. |
| **Updated doc contains only part of accepted change** | `INDETERMINATE` | Exact content diff cannot be matched deterministically. Flagged for human review. Attestation blocked. |
| **Unrelated/unapproved changes appear in doc** | `FULFILLED` + `SCOPE_VARIANCE` | Target proposed diff matches `FULFILLED`. Extraneous edits flagged as `UNAPPROVED_SCOPE_VARIANCE` in report for steward awareness. |
| **Proposed change cannot be verified deterministically** | `UNSUPPORTED` | Unstructured text diff or custom format cannot be verified via SHA-256/diff rules. Flagged as `UNSUPPORTED`. |
| **Authoritative version changed after fingerprint** | `STALE` | Document updated again after verification. Verification invalidated; re-verification required. |
| **Target doc has zero resulting version post-acceptance** | `UNFULFILLED` | Target document unedited. Marked `UNFULFILLED`. |
| **Multiple proposals in package target same doc** | Evaluated Combined | Constituent proposals evaluated against combined target document version diff. |

---

## Security / Privacy / Governance

1. **Project Boundary ACL Enforcement**: Fulfillment verification reuses Phase 14 `checkUserProjectReadAccess`. Unauthorized connected project documents or topology edges are strictly omitted from verification reports.
2. **EDIT / ADMIN Authority Requirement**: Only users with `EDIT` or `ADMIN` authority on the primary project can trigger fulfillment verification or issue a `PackageFulfillmentAttestation`.
3. **READ Access Boundary**: READ access provides visibility and context ONLY. READ users cannot trigger attestation creation or alter governance states.
4. **Zero Data Leakage**: Verification reports contain zero sensitive credentials, user emails, or unshared project metadata.
5. **Immutable Audit Logging**: Attestation issuance logs an immutable `PACKAGE_FULFILLMENT_ATTESTED` audit event in `DocumentAudit`.

---

## Non-Goals & Out-of-Scope

Phase 17 strictly avoids:

- Generic task management, issue tracking, or sprint planning (not a Jira clone).
- Automatic document editing or automatic `DocumentVersion` creation.
- Software deployment, release management, or production environment monitoring.
- CI/CD build runner or Git / VCS integrations.
- Runtime API execution or network payload inspection.
- Generic semantic AI / LLM review.
- Automatic baseline mutation (Phase 12 remains authoritative).
- Replacement or duplication of Phases 10–16.

---

## Risks

1. **Scope Creep into Code Verification**: Authors might expect the engine to verify underlying application source code rather than technical documentation versions. *Mitigation: Strictly scope verification to target `DocumentVersion` checksums, content diffs, and relationship updates.*
2. **Partial Version Execution Confusion**: Authors updating 2 out of 4 documents in a package might misunderstand why attestation is withheld. *Mitigation: Provide clear per-proposal status indicators (`FULFILLED` vs `UNFULFILLED`) in the UI drawer.*
3. **Stale Attestation Risk**: If a document is updated *after* attestation issuance, the attestation might become stale. *Mitigation: Bind attestation records to exact `DocumentVersion` IDs and checksums, flagging attestation as `SUPERSEDED` if newer document versions are authored.*

---

## Open Questions

1. Should issuing a `PackageFulfillmentAttestation` automatically resolve associated `DocumentationWorkRequest` items created during proposal handoff? *(Recommendation: Yes, automatically transition linked origin-keyed work requests to `RESOLVED` with resolution comment referencing the attestation ID).*
2. Should 100% fulfillment attestation be a configurable prerequisite for Phase 12 re-baselining in project release gate settings? *(Recommendation: Yes, add `requireAttestationForRebaseline` setting in `ReleaseGateSettings`).*

---

## Recommendation

**Candidate A — Documentation Change Package Fulfillment Verification & Immutable Attestation** is the unambiguous, highly justified choice for **Phase 17**.

It logically completes Documan's governance evolution by closing the operational gap between pre-change decision support (Phases 15–16) and post-change authoritative state (Phases 7.4, 10, 12, 13), providing closed-loop fulfillment verification and immutable attestation for multi-document change packages.
