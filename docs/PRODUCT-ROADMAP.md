# Documan Product Roadmap

> **Product Source of Truth**
>
> This document defines what Documan is, the problems it is intended to solve, the product direction it follows, the major capability areas it may pursue, and the rules used to select future work.
>
> This is a **product roadmap, not a Git changelog**. Git remains the source of truth for implementation history; this document is the source of truth for product direction.

## 1. Product Definition

Documan is a **product-level document management and productivity platform**.

Its product direction combines:

- Document Management
- Organization
- Traceability
- Collaboration
- Developer / Productivity Workflows
- Project / API Context
- Workflow Intelligence

Documan is intended to help people keep important documents together with the context, relationships, permissions, history, and workflows that make those documents useful.

Documan is **not** intended to become a generic cloud-storage product or a clone of another established productivity application.

### Product thesis

A document is rarely useful in isolation. Its value often depends on:

- where it belongs,
- what it describes,
- who can access it,
- what changed,
- who changed it,
- what other work it relates to,
- and what action should happen next.

Documan should therefore evolve from simple document storage toward a system that makes document context, traceability, collaboration, and productivity workflows easier to manage.

---

## 2. Problem Documan Is Solving

The core problem is not simply **"where do I store this file?"**.

The broader problem is that useful information becomes fragmented across files, folders, people, developer workflows, project context, and communication channels. As a result, users can have difficulty answering questions such as:

- Where is the right document?
- Which document belongs to this project or piece of work?
- What metadata describes it?
- Who changed it?
- What happened to it over time?
- Who can access it?
- What related technical or project context should be understood before using it?
- What should happen next?

Documan should progressively reduce this fragmentation while retaining a clear document-management identity.

---

## 3. Product Boundaries

Documan should deliberately avoid becoming:

- a Postman clone,
- a Google Drive clone,
- a Dropbox clone,
- a Notion clone,
- a Jira clone,
- a generic project-management tool,
- or a generic API client.

Other products may be used for:

- research,
- UX comparison,
- workflow analysis,
- problem discovery,
- and validation of user expectations.

They must **not** automatically become feature specifications for Documan.

The governing question is always:

> **What user problem exists, and what differentiated Documan solution could solve it?**

---

## 4. Product Evolution

The intended product evolution is:

```text
Foundation
    ↓
Core Document Management
    ↓
Organization
    ↓
Traceability
    ↓
Collaboration & Access Control
    ↓
Developer / Productivity Workflows
(Relationships | Project Context | Technical References | Review Workflow | Templates & Scaffolding | Dependency Mapping & Impact Summaries | In-App Notifications | Project Webhooks | Documentation Drift & Automated Governance | Programmatic CI/CD Release Gates)
    ↓
Project / API Context (Phase 7.1 & Phase 7.2 Completed)
    ↓
Workflow Intelligence / Cross-Document Change Impact (Research Phase)
```

The first five areas established the document-management foundation. Developer/productivity workflows and governance automation established a robust baseline. Documan has completed Phase 17 (Fulfillment Verification & Immutable Attestation), and has approved the research direction for Phase 18 (Cross-Project Baseline Contract Lineage & Attestation Alignment Verification).

---

# 5. Product Phases

## Phase 1 — Foundation

**Status: COMPLETED — repository verification required**

The foundation establishes the identity, authentication, users, authorization boundaries, and shared application infrastructure required by the rest of the product.

### Capability baseline

- Registration
- Login
- JWT authentication
- Refresh-token handling
- Session restoration
- Logout
- Logout all sessions
- Password change
- Session/token revocation
- Current user/profile
- Profile update
- Administrative user listing
- User search
- Pagination
- Filtering
- User details
- User editing
- Role management
- User activation/deactivation
- User deletion
- Self-modification restrictions
- Self-deletion restrictions

### Product value

This phase provides the identity and access foundation required for secure document management and collaboration.

---

## Phase 2 — Core Document Management

**Status: COMPLETED — repository verification required**

This phase establishes Documan as a real document-management product rather than a generic authenticated application.

### Capability baseline

- Document creation
- File upload
- Document listing
- Search
- Pagination
- Document details
- Document metadata
- Document editing
- File replacement
- Document viewing
- Document downloading
- Soft deletion
- Trash
- Restore

### Product value

Users can create, store, find, inspect, update, remove, and recover documents through a coherent lifecycle.

---

## Phase 3 — Organization

**Status: COMPLETED — repository verification required**

Organization makes the document repository useful at increasing scale.

### Capability baseline

- Folders
- Folder-based organization
- Document/folder relationships
- Tags
- Metadata
- Tag/metadata editing
- Metadata display
- Metadata-aware document discovery
- Filtering

### Product value

Documents gain structure beyond raw files. Folders, tags, and metadata provide multiple ways to understand and retrieve information.

---

## Phase 4 — Traceability

**Status: COMPLETED — repository verification required**

Traceability establishes a record of meaningful document activity and access-sensitive operations.

### Capability baseline

- Document audit events
- Audit history
- Audit pagination
- Audit filtering
- Actor tracking
- Authorization/ownership checks

Existing audit actions identified in the product baseline include:

- `CREATE`
- `UPDATE`
- `FILE_REPLACE`
- `VIEW`
- `DOWNLOAD`
- `DELETE`
- `RESTORE`

### Product value

Users and administrators can understand what happened to a document and who performed important actions.

Auditability should remain purposeful: not every internal operation requires an audit event.

---

## Phase 5 — Collaboration & Access Control

**Status: COMPLETED — repository verification required**

This phase extends document ownership into controlled collaboration.

### Capability baseline

- Document sharing
- Permission handling
- Access control
- Shared document access
- Permission-aware document operations

### Product value

Documents can be shared without losing ownership and authorization boundaries.

Every future document capability must account for:

- owner,
- shared READ users,
- shared EDIT users,
- administrators,
- unauthorized users.

---

# 6. Future Product Phases

Future phases are intentionally **research-driven**. They are product opportunity areas, not automatic implementation commitments.

## Phase 6 — Developer / Productivity Workflows

**Status: COMPLETED — Baseline Capabilities Implemented**

### Completed baseline capabilities

- **Document Relationships**: Directional document-to-document connections (`RELATED`, `REFERENCES`, `REPLACES`, `DEPENDS_ON`) with source and target directionality (`INCOMING` / `OUTGOING`), permission preservation, and full audit logging.
- **Project Context**: Project/workspace context boundaries connecting documents to projects with project-management authority (`Project` model, owner/admin management, project assignment/removal, project filtering).
- **External Technical References**: Explicit links connecting documents to external technical resources (API documentation, code repositories, specifications, work items/issues, and external tools) with strict URL protocol validation, duplicate prevention, and permission isolation.
- **Document Review Workflow**: Document-centric review lifecycle (`PENDING`, `APPROVED`, `CHANGES_REQUESTED`) supporting reviewer assignment, pending reviewer queue (`/reviews/pending`), resolution comments, single active review constraint, and full audit history.
- **Document Templates & Scaffolding**: Static built-in templates (`ADR`, `Technical Specification`, `Troubleshooting / Runbook`) providing standardized document creation scaffolding, preview, field pre-filling, client-side `.md` file download, and audit metadata logging.
- **Document-Level Dependency Mapping & Impact Summaries**: Multi-hop dependency mapping and downstream impact summaries leveraging `DEPENDS_ON` relationships (`maxDepth <= 3`, `maxNodes = 50`), deterministic summary metrics, relationship-based impact warnings, cycle detection, soft-delete filtering, and strict permission subtree pruning.
- **Document Review & Lifecycle Notifications**: In-App Notification Center and Activity Feed providing recipient isolation, unread counter badge, mark as read / mark all as read, anti-IDOR protection, and safe non-blocking dispatch (`safeNotify`) across review requests, approvals, change requests, document sharing, and upstream stale/deprecated events.
- **Project Outbound Webhooks & Event Notification Subscriptions**: Project-level outbound webhook management and automated event subscriptions supporting Project Owner/Admin authority, HTTPS-only target validation, pure Node.js SSRF protection agent (`isPrivateOrRestrictedIp`), DNS rebinding mitigation, `maxRedirects: 0` redirect blocking, AES-256-GCM secret encryption, 24-hour dual-secret rotation window, HMAC-SHA256 request signing (`X-Documan-Signature`), asynchronous MongoDB-persisted retry worker (`setImmediate` + backoff schedule + max 4 attempts), 14-day TTL delivery history logs, and 50-failure circuit breaker auto-disabling.
- **Documentation Drift & Automated Governance Engine**: Non-blocking in-process automated governance engine and freshness policy management supporting project-level governance settings (`isGovernanceEnabled`, `maxUnreviewedDays` threshold 14–365 days, `autoMarkStaleOnUpstreamChange`), real-time documentation health metrics (`X% Fresh`), deterministic `lastReviewedAt` semantics (updated ONLY on review approval or explicit Confirm Freshness), age-based staleness evaluation, explicit upstream lifecycle drift triggers (`STALE` / `DEPRECATED` targets only; metadata/title edits strictly ignored), deterministic Confirm Freshness status transition (`STALE` $\rightarrow$ `APPROVED`, EDIT authority required, `403 Forbidden` for READ users, `DEPRECATED`/`DRAFT` rejections), system audit logging (`STATUS_CHANGE` with `AUTOMATED_GOVERNANCE` or `CONFIRM_FRESHNESS` trigger), non-blocking in-app notification dispatch (`safeNotify`), non-blocking outbound webhook dispatch (`safeDispatchWebhook`), idempotent evaluation, strict project isolation, and Project Owner/Admin authority enforcement.
- **Programmatic CI/CD Documentation Release Gates**: Programmatic documentation gate evaluation and CI authentication engine supporting project-scoped CI gate tokens (`documan_gate_...`), high-entropy random generation with one-time plaintext secret display, SHA-256 token hashing, Project Owner/Admin token administration, project release gate policy configuration (`allowStale`, `allowPendingReviews`, `allowDeprecated`, `minFreshnessPercentage`), documentation freshness evaluation, STALE / DEPRECATED / IN_REVIEW gating, minimum freshness threshold enforcement, governance-disabled status (`GOVERNANCE_DISABLED`), archived-project protection (`404 Not Found`), strict cross-project token isolation (`403 Forbidden`), dedicated `gateAuthMiddleware` authentication path (gate tokens strictly isolated from standard user/document APIs), in-memory rate limiting (`gateCheckRateLimiter`, 60 req/min), `HTTP 200 OK` (PASSED) vs `HTTP 412 Precondition Failed` (BLOCKED) status responses, audit logging (`DOCUMENT_GATE_BLOCKED` logged only on BLOCKED checks; 0 audit entries on routine PASSED polls), and Governance UI integration for token management and release gate policies.

### User problem investigated

Developers and technical users often work across documents, implementation details, APIs, decisions, specifications, troubleshooting notes, and external artifacts. Important context can become separated from the document that needs it.

### Why it matters

A document-management platform becomes substantially more valuable when documents help users complete real work and maintain technical context rather than merely storing files.

### Why it belongs in Documan

Documan's document lifecycle, metadata, organization, audit, access-control, and relationship foundations provide a controlled base for productivity workflows without abandoning the document-management identity.

### Differentiated opportunity

The opportunity is not to copy developer tools. It is to connect documents to the context developers already need while keeping documents as the central product object.

---

## Phase 7 — Project / API Context

**Status: COMPLETED — Phase 7.1 & Phase 7.2 Implemented**

### Phase 7.1 — OpenAPI Document Context Mapping & Endpoint Association (COMPLETED)

#### Completed baseline capabilities

- **OpenAPI 3.0.x & 3.1.x Specification Support**: Multi-format (JSON and YAML) OpenAPI parser (`parseOpenApiSpecification`) supporting both OpenAPI 3.0.x and 3.1.x specifications with strict validation, 2MB size limits, and YAML alias recursion protection (`MALICIOUS_YAML_DETECTED`).
- **Project-Scoped API Specifications (`ProjectApiSpec`)**: Project-isolated spec persistence retaining raw content, versioning, format metadata, and enforcing a single active specification constraint per project (`projectId + isActive`).
- **Normalized Endpoint Registry (`ProjectApiEndpoint`)**: Automated extraction and indexing of endpoints from imported specifications, capturing HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`), path, summary, operationId, tags, and deprecation status (`isDeprecated`).
- **Document ↔ Endpoint Associations (`DocumentEndpointLink`)**: First-class directional links connecting documents to specific API endpoints with explicit status tracking (`LINKED` / `ORPHANED`), orphaned reason logging, and project-boundary enforcement.
- **Safe Re-import & Link Lifecycle Preservation**: Specification re-imports automatically migrate active document links to updated endpoint IDs for matching routes while gracefully transitioning removed routes to `ORPHANED` status with detailed reasons (`orphanedReason`), preserving historical auditability.
- **Specification Deletion & Association Preservation**: Deleting an API specification marks dependent document links as `ORPHANED` without destroying historical association context.
- **Strict Project Isolation & Security Boundary**: Enforces strict project isolation preventing cross-project endpoint linking (IDOR protection), restricts spec imports/deletions to Project Owners/Admins, and requires EDIT permission for document-endpoint association management.
- **Audit Logging Integration**: Comprehensive audit tracking for `API_SPEC_IMPORT`, `API_SPEC_DELETE`, `DOCUMENT_ENDPOINT_LINK`, and `DOCUMENT_ENDPOINT_UNLINK` events.

### Phase 7.2 — OpenAPI Endpoint Drift & Governance Integration (COMPLETED — Commit `cf1b65f`)

#### Completed baseline capabilities

- **Transition-based ORPHANED Endpoint Drift Detection**: Detects when linked endpoints are removed during OpenAPI spec re-imports or spec deletions, transitioning links to `ORPHANED` (`orphanedReason: 'Endpoint removed in spec re-import'` or `'API Specification deleted'`) and passing transition deltas to a dedicated `processApiEndpointDrift` service.
- **Endpoint Recovery & Auto-Relinking**: Reintroducing an orphaned endpoint route in a subsequent spec import automatically recovers `ORPHANED` links back to `LINKED` status (`orphanedReason: null`) and updates associations to the newly created endpoint ID.
- **Automatic Lifecycle Staleness Cascade**: When `autoMarkStaleOnUpstreamChange` is enabled in project governance settings, an `ORPHANED` transition automatically transitions linked `APPROVED` documents to `STALE` status.
- **Informational DEPRECATED Endpoint Handling**: Upstream endpoint deprecation (`isDeprecated` false $\rightarrow$ true) dispatches informational drift notifications and webhooks while preserving document lifecycle status (`APPROVED` remains `APPROVED`).
- **Transition-Based Notification & Webhook Dispatch**: Dispatches `UPSTREAM_STALE` and `UPSTREAM_DEPRECATED` in-app notifications and project webhooks **ONCE** per transition delta, preventing duplicate alerts on unchanged spec re-imports.
- **Endpoint-Aware CI/CD Release Gates**: Extended `release-gate-evaluator.service.ts` with project release gate settings `allowOrphanedApiLinks` (default: `false`) and `allowDeprecatedApiEndpoints` (default: `true`), blocking CI release gates when documents link to broken or deprecated API endpoints.
- **Project Isolation & Security Enforcement**: Strict project boundary validation preventing cross-project endpoint link creation (IDOR protection) and enforcing Project Owner/Admin governance authority.
- **UI Health Indicators & Governance Controls**: Added release gate policy checkboxes in `GovernanceSection.tsx` and visual status badges (`ORPHANED` red badge with reason tooltip, `Deprecated` orange badge) in `DocumentApiEndpointsSection.tsx`.
- **System Audit Logging**: System audit tracking for document status transitions (`action: 'STATUS_CHANGE'`, `metadata.triggerSource: 'AUTOMATED_GOVERNANCE'`).
### Phase 7.5 — Documentation Health & Technical Knowledge Risk Radar (COMPLETED — Merge `be04b06`)

#### Completed baseline capabilities

- **Deterministic Pure Risk Calculator (`calculateKnowledgeRisk`)**: Pure in-memory calculator evaluating document risk across 5 factor categories: Impact Risk (Phase 7.3), Version Approval Risk (Phase 7.4), Freshness Risk (Phase 6), OpenAPI Endpoint Drift Risk (Phase 7.1), and Stewardship Continuity.
- **Canonical Risk & Health Representation**: Calculates a canonical `riskScore` (0–100) and `riskLevel` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), deriving user-facing `healthScore` (`100 - riskScore`) dynamically without database persistence.
- **Deterministic Evaluation Timestamp (`evaluationAt`)**: All time-based factor calculations (`impactAge`, `reviewAge`, `documentAge`) use an explicit `evaluationAt` context timestamp, guaranteeing 100% deterministic, testable output across runs.
- **Operational Stewardship Continuity (`stewardId`)**: Adds `stewardId` as operational responsibility metadata on `Document`. Supports stewardship assignment, transfer, and clearing (`PATCH /api/v1/documents/:id/steward`) with audit logging (`DOCUMENT_STEWARD_CHANGED`) and non-blocking notifications (`STEWARD_ASSIGNED`).
- **Owner Fallback Contact**: If no explicit steward is assigned (`stewardId === null`), `effectiveContact` dynamically displays `"Owner (Default Contact)"` without altering `ownerId` or copying creator metadata.
- **Permission-Isolated Project Risk Radar**: `GET /api/v1/projects/:projectId/knowledge-risk` executes a single bulk MongoDB query matching ACL rules (`ownerId` / `DocumentShare` / `admin`), evaluating risks in-memory without N+1 queries and preventing aggregate information leaks.
- **Structured Explainability & Remediation Guidance**: Returns machine-readable reason codes (`UNVERIFIED_IMPACT`, `UNAPPROVED_VERSION_DRIFT`, `REVIEW_OVERDUE`, `ORPHANED_API_ENDPOINT`, `STEWARD_UNASSIGNED`, `STEWARD_INACTIVE`) and deterministic text remediation actions.
- **UI Integration**:
  - Header **Knowledge Health Badge** & **`KnowledgeHealthDrawer`** on `DocumentDetailsPage`.
  - **`KnowledgeRiskRadarPanel`** on `ProjectDetailsPage` displaying risk distribution, average score, and paginated high-risk document roster.
- **Automated Verification Suite**: Validated via 22 Vitest unit tests, 25-scenario automated QA runner (`run_phase7_5_qa.ts`), full Vitest suite (74 files, 665 tests), typechecks, ESLint, production build, and manual browser QA.

---

## Phase 14 — System Architecture Topology & Cross-Project Contract Governance

**Status: COMPLETED — Commit `6ef9aa1` / Merge `9e59ef3`**

### Capability baseline

- **Project-Level Topology & Context Relationships**: Explicit project-level architectural topology links (`ProjectTopologyLink`) where architecturally justified (`DEPENDS_ON`, `PROVIDES_API_TO`, `INTEGRATES_WITH`, `SHARED_LIBRARY`), representing high-level system dependencies without duplicating document-level relationship semantics.
- **Cross-Project Document Dependency Mapping**: Directional `DocumentRelationship` technical contracts connecting documents across project boundaries with `CROSS_PROJECT_TOPOLOGY_REQUIRED` validation.
- **Permission-Aware & Privacy-Safe Graph Traversal**: Cross-project dependency graph evaluation respecting project-level user authorization (`READ` access), completely omitting unauthorized project nodes, edges, IDs, contract counts, and drift states from API/graph responses.
- **Cross-Project Change Impact & Contract Drift Detection**: Detection of upstream document/API spec changes that impact downstream project documentation, identifying cross-project staleness and contract drift via bounded traversal (`MAX_DEPTH = 3`, `MAX_NODES = 50`).
- **Integration with Baseline & Drift Engine**: Seamless integration with Phase 12 `DocumentationBaseline` target snapshots (`documentId`, `versionNumber`, `checksum` only) and drift calculator to evaluate `RELATIONSHIP_DRIFT` and external contract deltas.
- **Integration with Phase 11 & Phase 13 Engines**: Automated generation of Phase 11 `VerificationPlan` tasks and Phase 13 origin-keyed `DocumentationWorkRequest` items in downstream projects to assign, track, and remediate cross-project drift.
- **System Architecture & Topology Visibility**: Unified system architecture UI panel (`ProjectArchitecturePanel`) presenting project topology and interactive SVG graph, alongside document-level cross-project impact visibility (`DocumentCrossProjectImpactSection`).

### Architectural Boundaries & System Authority

- **DOCUMENT Remains Central**: The document remains the central product object; project topology links serve as context boundaries for document-to-document cross-project dependencies.
- **No Duplicate Semantics**: `ProjectTopologyLink` represents only genuinely project-level architectural connections that cannot be cleanly captured by document-level relationships.
- **Phase 7.3 Authority**: Phase 7.3 (`document-impact-cascade.service.ts`) remains the single authoritative change-impact calculation engine.
- **Phase 10 Authority**: Phase 10 (`assurance-calculator.ts`) remains the single authoritative assurance and release-gate scoring engine.
- **Phase 11 Authority**: Phase 11 (`verification-plan.service.ts`) remains the single authoritative verification task system.
- **Phase 12 Authority**: Phase 12 (`baseline.service.ts`) remains the single authoritative baseline and drift control system.
- **Phase 13 Authority**: Phase 13 (`work-request.service.ts`) remains the single authoritative human Work Request tracking system.

### Explicit Non-Scope

Phase 14 strictly avoids:

- Jira, Trello, or generic task/sprint management functionality.
- Generic project management, gantt charts, or time tracking.
- Infrastructure monitoring, APM agents, or log analytics.
- Cloud resource discovery (AWS/GCP/Azure) or live pod monitoring.
- Network traffic inspection or eBPF packet sniffing.
- Drag-and-drop vector diagram or SVG canvas editing (e.g., Lucidchart/Miro clones).
- CI/CD build runner or deployment execution orchestration.
- Second release-gate engine or competing token authorization system.
- Mandatory AI, LLM, RAG, or vector database infrastructure.

---

## Phase 15 — Pre-Change Impact Simulation & Change Proposal Engine

**Status: COMPLETED — Implementation: e27958f / Merge: 196443d**

### Capability baseline

- **Deterministic Pre-Change Simulation**: In-memory read-only simulation orchestrator (`runChangeProposalSimulation`) predicting upstream/downstream impacts of hypothetical modifications without mutating authoritative state or generating audit events (`POST /api/documents/:id/simulate-change`).
- **Persisted Change Proposals & State Machine**: Human review workflow persisting `DocumentChangeProposal` records across an explicit state machine (`DRAFT` → `SIMULATED` → `UNDER_REVIEW` → `ACCEPTED` / `REJECTED` / `DISCARDED`), with zero `APPLIED` state.
- **Bounded Proposal Types**: Support for bounded change proposals: `DOCUMENT_CONTENT_UPDATE`, `TECHNICAL_CONTRACT_UPDATE`, `RELATIONSHIP_UPDATE` (`ADD_RELATIONSHIP` / `REMOVE_RELATIONSHIP`), and `DEPRECATION_PROPOSAL`.
- **Simulated Impact Analysis & Subsystem Integration**: Pure in-memory integration across existing authoritative engines: Phase 7.3 graph cascade adapter (`MAX_DEPTH = 3`, `MAX_NODES = 50`), Phase 9 pure evidence calculator, Phase 10 predicted release gate status, Phase 11 predicted verification task requirements, Phase 12 predicted baseline drift, Phase 13 predicted work items, and Phase 14 topology filtering.
- **Deterministic State Fingerprint & Staleness Detection**: SHA-256 state fingerprinting (`computeSimulationStateFingerprint`) over target document, baseline snapshot, connected relationships, and topology links. Automatic `isStale=true` flag on fingerprint mismatch with re-simulation refresh.
- **Privacy-Safe Disclosure Filtering**: Reuses Phase 14 `checkUserProjectReadAccess` to strictly omit unauthorized project nodes, edges, IDs, and contract counts from simulation outputs.
- **Bounded Partial & Truncated Simulation Handling**: Explicit simulation status representation (`COMPLETE`, `TRUNCATED_PARTIAL`, `INDETERMINATE`, `UNSUPPORTED`), preserving partial outcomes without masking incomplete traversals as safe.
- **Human Proposal & Workflow Handoff**: Post-acceptance handoff payload providing step-by-step instructions for existing Phase 7.4 `documentVersionService.createVersion` and Phase 13 work request creation workflows.
- **Frontend Proposal UI & Governance Tab**: Slide-over `ProposeChangeDrawer` on `DocumentDetailsPage` and `ProjectProposalsTab` on `ProjectDetailsPage` for end-to-end proposal creation, simulation, submission, review, and acceptance.

### Architectural Boundaries & System Authority

- **Decision-Support Layer Only**: Phase 15 operates strictly as an orchestration and decision-support layer above existing authoritative subsystems.
- **Zero Duplicate Engines**: Creates no duplicate impact, evidence, assurance, verification, baseline/drift, topology, or work-request engines.
- **Zero State Side-Effects**: Ephemeral simulation is 100% read-only, producing 0 DB mutations, 0 audit events, 0 `DocumentVersion` records, and 0 `VerificationTask` or `DocumentationWorkRequest` records.
- **Authoritative Version Handoff**: Acceptance hands off to existing Phase 7.4 document versioning and Phase 13 work request workflows rather than directly modifying authoritative version history.

### Explicit Non-Scope

Phase 15 strictly avoids:

- Generic NLP, LLM, RAG, or AI analysis engines.
- Live API execution, sandbox runtime testing, or network payload inspection.
- Full semantic OpenAPI compatibility or automatic schema translation.
- Automatic document or database state mutation upon simulation.
- Automatic creation of Work Requests or Verification Tasks during simulation.
- Unbounded graph traversal or unverified performance guarantees.

---

## Phase 16 — Multi-Document Change Packages & Coordinated Impact Simulation

**Status: COMPLETED — Implementation: 6eb204a0 / Merge: bb6921a**

### Capability baseline

- **Multi-Document Change Package Persistence**: Project-scoped package container (`DocumentChangePackage`) grouping multiple constituent change proposals across documents into a single coordinated release unit (`PKG-YYYYMMDD-XXXX`), with status state machine (`DRAFT` → `SIMULATED` → `UNDER_REVIEW` → `ACCEPTED` / `REJECTED` / `DISCARDED`).
- **Coordinated Combined In-Memory Overlay Simulation**: Aggregate simulation orchestrator (`runChangePackageSimulation`) building a unified in-memory graph overlay (combining DB relationships with proposed edge additions and removals across all constituent proposals) before impact cascade BFS traversal (`POST /api/change-packages/:id/simulate`).
- **Bounded Multi-Proposal Conflict Matrix**: Deterministic detection of package-level conflicts: `MUTUALLY_EXCLUSIVE_TARGET`, `CONTRADICTORY_RELATIONSHIP`, `DEPRECATION_DEPENDENCY_CONFLICT` (CASE A package proposals), `CIRCULAR_DEPENDENCY_INJECTION`, and `INCOMPATIBLE_CONTRACT_SCHEMA`.
- **Aggregate Governance & Subsystem Prediction**: Combined joint gate status prediction, evidence score computation, baseline drift prediction, aggregated verification task requirements, and cross-project topology blast radius calculation.
- **Canonical Package State Fingerprint & Staleness Control**: SHA-256 state fingerprinting (`computePackageStateFingerprint`) evaluating package tuple, proposal IDs, target document versions, and baseline timestamps, with per-proposal staleness tracking and automatic package staleness flagging on authoritative divergence.
- **Deduplicated Roster & Detail Preservation**: Aggregate affected document roster strictly deduplicated by `documentId` while preserving distinct impact details (relationship, evidence, baseline, verification, topology) and contributing proposal attributions.
- **ACL & Cross-Project Disclosure Isolation**: Permission-aware project boundary checking (`checkUserProjectReadAccess`), strictly omitting unauthorized project nodes, document nodes, topology edges, impact details, and counts from simulation responses.
- **Side-Effect Free Package Acceptance & Handoff**: Acceptance updates package lifecycle status to `ACCEPTED` and outputs structured multi-proposal handoff payload instructions with **0** `DocumentVersion` mutations, **0** `DocumentationWorkRequest` mutations, **0** document content edits, and **0** side-effects.
- **Frontend Package Management & Drawer UI**: Project-level change packages tab (`ProjectChangePackagesTab`), package creation modal (`CreatePackageModal`), and comprehensive drawer view (`ChangePackageDetailsDrawer`) displaying package status, proposals, conflicts, predicted governance, and acceptance controls.

### Architectural Boundaries & System Authority

- **Package Container Layer Only**: Phase 16 operates strictly as a package-level grouping and coordinated simulation layer above Phase 15 single-proposal simulation and existing authoritative engines.
- **Zero Duplicate Engines**: Reuses Phase 15 proposal simulation, Phase 7.3 graph cascade adapter, Phase 9 evidence calculator, Phase 10 release gate evaluator, Phase 11 verification planner, Phase 12 baseline drift calculator, Phase 13 work request tracker, and Phase 14 topology link models.
- **Zero Authoritative State Mutation**: Package creation, simulation, and acceptance are 100% side-effect free, creating zero `DocumentVersion` records, zero `DocumentationWorkRequest` records, and zero database document mutations.
- **Independent Package Lifecycle**: Shared proposal membership does not couple packages. Accepting Package A does not invalidate Package B unless underlying authoritative document state diverges.

### Explicit Non-Scope

Phase 16 strictly avoids:

- Generic NLP, LLM, RAG, or AI workflow engines.
- Live API network testing, sandbox execution, or protocol behavior inference.
- Arbitrary OpenAPI semantic compatibility analysis.
- Automatic database document content mutation upon package acceptance.
- Automatic creation of Work Requests or Verification Tasks during package simulation/acceptance.
- Unbounded graph traversal or non-deterministic package conflict rules.

---

## Phase 17 — Documentation Change Package Fulfillment Verification & Immutable Attestation

**Status: COMPLETED — Implementation: 45a6dac6 / Merge: b6c85e47**

### Capability baseline

- **Post-Acceptance Fulfillment Verification**: Deterministic post-change verification engine (`package-fulfillment-attestation.service.ts`) comparing accepted change packages (`DocumentChangePackage`) and constituent proposals against resulting authoritative `DocumentVersion` records and active relationship states (`POST /api/change-packages/:id/verify-fulfillment`).
- **Deterministic Data Comparison**: Grounded strictly in target document IDs, proposed content diffs/operations, version numbers, SHA-256 content checksums, and active `DocumentRelationship` records. Explicitly avoids NLP, LLM, or subjective semantic interpretation; unsupported formats produce `INDETERMINATE` or `UNSUPPORTED`.
- **Categorical Fulfillment State Model**: Formal governance states (`FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `INDETERMINATE`, `UNSUPPORTED`, `STALE`) as the primary evaluation authority, with derived numerical metrics.
- **Scope Variance Detection**: Identification of unapproved edits or scope drift outside proposed diffs (`UNAPPROVED_SCOPE_VARIANCE`), presenting findings to technical stewards without invalidating deterministic proposal fulfillment.
- **Immutable Attestation Primitive**: Dedicated persistent model (`PackageFulfillmentAttestation`) binding an accepted package ID, constituent proposal IDs, resulting authoritative `DocumentVersion` IDs/checksums, verification outcomes, attestor user ID (`EDIT`/`ADMIN` required), and timestamp.
- **Baseline Eligibility Handoff Payload**: Attestation outputs a structured handoff payload containing recommended baseline inputs (`name`, `versionTag`, `targetDocumentSnapshots`) for explicit Phase 12 baseline creation (`createBaseline`).

### Architectural Boundaries & System Authority

- **Post-Change Verification & Attestation Layer Only**: Phase 17 operates strictly after package acceptance (Phase 16) and version creation (Phase 7.4), closing the governance loop between proposal intent and authoritative state.
- **Zero Automatic State Mutations**: Does NOT automatically edit document content, create `DocumentVersion` records, or re-baseline `DocumentationBaseline`. Phase 12 remains the single authoritative baseline/re-baselining engine.
- **System Authority Boundaries**: Preserves Phase 16 for package coordination/acceptance, Phase 10 for assurance scoring/release-gates, Phase 11 for verification planning, and Phase 12 for baselines.
- **Zero Deployment / Release Management Tooling**: Strictly document-centric governance; contains no software deployment runners, CI/CD pipelines, Git VCS operations, or infrastructure monitoring.

### Explicit Non-Scope

Phase 17 strictly avoids:

- Generic NLP, LLM, RAG, or AI document review.
- Automatic document editing or automatic `DocumentVersion` creation.
- Software deployment, release management, or production environment monitoring.
- CI/CD build runner or Git / VCS integrations.
- Automatic baseline mutation upon attestation issuance.
- Replacement or duplication of Phases 10–16.

---

## Phase 18 — Cross-Project Baseline Contract Lineage & Attestation Alignment Verification

**Status: APPROVED — RESEARCH COMPLETE / IMPLEMENTATION PLANNING**

Research Artifact: [`docs/research/PHASE-18-RESEARCH-v4.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-18-RESEARCH-v4.md)

### Capability Baseline

- **Cross-Project Baseline Contract Lineage Verification**: Deterministic, derived, read-only cross-project governance service (`system-baseline-alignment.service.ts`) analyzing multi-project baseline snapshots (`DocumentationBaseline`) against project topology links (`ProjectTopologyLink`) and historical attestation lineages (`PackageFulfillmentAttestation`).
- **Technical Contract Dependency Boundaries**: Grounded strictly in cross-project `DocumentRelationship` records with `type === 'DEPENDS_ON'`. Excludes informational relationship types (`REFERENCES`, `REPLACES`, `RELATED`) from baseline contract alignment metrics.
- **Separation of Alignment State & Governance Evidence**: Distinguishes structural baseline reference alignment (`alignmentState`: `ALIGNED`, `MISALIGNED`, `INDETERMINATE`) from explicit governance provenance metadata (`governanceEvidence`: `providerBaselinePresent`, `consumerBaselinePresent`, `providerAttested`, `attestationStale`). Missing attestation is modeled as an evidence condition (`providerAttested: false`), not a false structural state of contract incompatibility.
- **Provider Baseline Authority & Evolution Handling**: Phase 12 active baseline (`isActive === true`) remains the single authoritative baseline for a provider project. When a provider project updates to active Baseline `v2.0` (even if not yet attested), a consumer baseline still referencing `v1.0` is evaluated as `MISALIGNED` (outdated provider version reference).
- **Mathematically Defensible Dual-Metric Governance**: Reports `System Alignment Score` ($\frac{N_{\text{aligned}}}{N_{\text{applicable}}} \times 100$) alongside `Evidence Completeness` ($\frac{N_{\text{applicable}}}{N_{\text{total}}} \times 100$). Prevents missing baseline evidence from artificially inflating alignment scores.
- **Zero-Applicable Evidence Handling**: Networks with zero cross-project `DEPENDS_ON` document pairs return `alignmentScore: null`, `evidenceCompleteness: null`, and status `ZERO_APPLICABLE_EVIDENCE` (never falsely reported as "100% Aligned").
- **Strict Cross-Project Privacy Preservation**: Reuses Phase 14 `checkUserProjectReadAccess`. If a user lacks `READ` permission on a connected project, the unauthorized project, its topology links, documents, baselines, and attestations are **100% omitted** (zero placeholders, zero restricted node IDs, zero hidden project counts). Metrics are computed strictly over authorized subgraphs.
- **Zero-Database Persistence Architecture**: Derived 100% dynamically at query time from existing `DocumentationBaseline`, `ProjectTopologyLink`, `DocumentRelationship`, and `PackageFulfillmentAttestation` collections without introducing new database collections or models.

### Architectural Boundaries & System Authority

- **Read-Only Derived Governance Layer Only**: Phase 18 operates strictly as a read-only query service above existing Phase 12 baselines, Phase 14 topology links, and Phase 17 attestations.
- **System Authority Boundaries**: Preserves Phase 12 as sole baseline creation authority, Phase 14 as sole project topology authority, and Phase 17 as sole attestation authority. Phase 18 does NOT create or modify baselines, topology links, or attestations.
- **Zero Document Mutations**: Does NOT edit document text, modify relationships, or create `DocumentVersion` records.

### Explicit Non-Scope

Phase 18 strictly avoids:

- Semantic API compatibility analysis or AST-level OpenAPI schema diffing.
- Live API execution, sandbox testing, or runtime network compatibility checks.
- Automatic baseline creation or automatic `DocumentVersion` creation.
- Creation or modification of Phase 17 attestation records.
- Introduction of new database models or persistent collections unless later planning proves one necessary.
- Software deployment execution, release pipelines, Docker builds, or CI/CD runners.
- Git / VCS repository automation or branch management.
- Mandatory AI, LLM, RAG, or non-deterministic machine learning features.
- Visual vector diagram canvas editing (e.g., Miro / Lucidchart clones).

---

## Phase 8 — Workflow Intelligence

**Status: EXPLORATORY**

### User problem to investigate

As the document repository becomes more structured and traceable, users may need help identifying important relationships, next actions, missing context, stale information, or workflow opportunities.

### Why it matters

The long-term value of structured document information may extend beyond search and storage into intelligent assistance.

### Why it could belong in Documan

Documan can potentially use its document, metadata, organization, permissions, audit, and relationship context as the foundation for useful workflow assistance.

### Differentiated opportunity

Intelligence should be grounded in the user's own documents and authorized context. It should help users understand and act on their information rather than becoming a generic AI assistant.

### Research required

Investigate:

- Which repetitive document workflows are worth assisting?
- Which signals can be derived reliably from existing product data?
- What recommendations would users trust?
- What explanations and traceability should accompany intelligent actions?
- Where should humans remain responsible for decisions?
- What security and privacy constraints apply?

### Do not assume yet

Do not assume that AI is automatically valuable. Do not add AI features merely because they are technically possible or popular in other products.

---

# 7. Postman Research Framework

Postman is a **source of product research**, not a source of product specification.

Postman research is useful because it exposes mature developer workflows, user expectations, organization patterns, collaboration concepts, documentation practices, traceability needs, project context, and productivity problems.

The roadmap must preserve this distinction:

> **Postman is a reference for understanding workflows. Postman is not the implementation blueprint.**

For every future Postman-related research item, use this framework:

1. What does Postman do well?
2. What user problem does that workflow solve?
3. What dependencies does it create?
4. Where do users experience limitations or context gaps?
5. Is there an opportunity for Documan?
6. Can Documan solve the problem differently?
7. Does the capability strengthen Documan's product identity?
8. Decision:
   - **Build**
   - **Research further**
   - **Reject**
   - **Not relevant**

Never use:

> "Postman has this feature, so Documan should have it."

Use instead:

> "Users have this problem, and Documan may have a differentiated way to solve it."

---

# 8. Permanent Feature Selection Framework

Every major feature must move through the following product process:

```text
User Problem
    ↓
Who experiences it?
    ↓
Why is the current workflow insufficient?
    ↓
Research
    ↓
Documan opportunity
    ↓
Product differentiation
    ↓
Smallest valuable solution
    ↓
Architecture
    ↓
Implementation
    ↓
Testing
    ↓
Validation
```

A feature must not be implemented merely because:

- another product has it,
- it is technically interesting,
- it is easy to implement,
- it is common in SaaS applications,
- or it sounds impressive.

The roadmap should optimize for **high-value capabilities**, not feature quantity.

---

# 9. Product Value Framework

Future features should be evaluated against these dimensions:

1. User value
2. Problem severity
3. Product differentiation
4. Workflow importance
5. Architectural fit
6. Implementation complexity
7. Future leverage
8. Security implications
9. Traceability requirements
10. Collaboration impact

A feature with a high implementation cost may still be valuable if it creates durable product leverage. Conversely, a small feature should not be accepted automatically simply because it is easy to build.

---

# 10. Architecture Principles

The roadmap preserves the existing application architecture as the default.

## Backend flow

```text
Request
  ↓
Route
  ↓
Authentication / Authorization Middleware
  ↓
Validation Middleware
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MongoDB
```

Future backend features should normally follow:

```text
Route
→ Middleware
→ Controller
→ Service
→ Model
```

Existing infrastructure should be reused where applicable:

- `AppError`
- centralized error handling
- API response utilities
- authentication middleware
- authorization middleware
- validation middleware
- request IDs
- rate limiting

New architecture should only be introduced when a genuine product or technical requirement justifies it.

## Frontend baseline

The current product architecture is based on:

- React
- TypeScript
- Vite
- React Router
- Axios
- Zustand

Future product work should integrate with this architecture unless a real requirement demonstrates that change is necessary.

---

# 11. Security Principles

Every future capability must explicitly consider:

- authentication,
- authorization,
- ownership,
- admin behavior,
- shared-user permissions,
- data exposure,
- and resource access.

Frontend restrictions are not security. Backend authorization is mandatory.

No new document workflow should accidentally expose a resource to a user who is not authorized to access it.

---

# 12. Audit Principles

For every future capability involving important state changes, ask:

> **Does this action need to be auditable?**

If yes:

1. Identify the actor.
2. Identify the resource.
3. Identify the action.
4. Record useful metadata.
5. Integrate with the existing audit system.
6. Add appropriate tests.

Audit events should be meaningful rather than generated for every internal operation.

---

# 13. Collaboration Principles

Future features must remain compatible with the existing sharing and permission model.

A new document capability must explicitly consider:

- owner,
- shared READ users,
- shared EDIT users,
- administrators,
- unauthorized users.

Permission checks must exist at the backend boundary where the protected resource is accessed.

---

# 14. UI Principles

Documan's frontend should evolve into a professional document-management and productivity product.

The established major pages include:

- Login
- Dashboard
- Users
- User Details
- Edit User
- Documents
- Document Details
- Document Create
- Document Edit
- Trash

Future features should integrate naturally with these workflows.

The UI should prioritize:

- clarity,
- usability,
- visual hierarchy,
- accessibility,
- responsive behavior,
- useful empty states,
- useful loading states,
- clear error handling,
- professional product presentation.

Do not redesign the entire application for every feature. Product evolution should be incremental and coherent.

---

# 15. Testing Principles

Every future feature must include appropriate tests.

## Backend

Depending on the feature, tests should cover:

- schema behavior,
- service behavior,
- controller behavior,
- route behavior,
- authorization,
- edge cases,
- regression behavior.

## Frontend

Depending on the feature, tests should cover:

- feature behavior,
- important user interactions,
- API behavior,
- loading states,
- error states,
- permission-aware behavior.

The full existing test suite must remain healthy.

---

# 16. Roadmap Maintenance Policy

This document is **not a Git changelog**.

Do not add:

- commit hashes,
- PR numbers,
- branch names,
- individual commit history,
- temporary implementation notes,
- exact latest commit information.

The roadmap should not require modification after every commit.

## Update the roadmap when

- a major product phase is completed,
- a major capability is added,
- product direction changes,
- a future capability is accepted,
- a capability is rejected,
- or a major product decision is made.

## Do not update the roadmap for

- bug fixes,
- test fixes,
- minor UI changes,
- refactoring,
- implementation details,
- individual commits,
- branch creation,
- branch deletion,
- pull requests.

Git is the source of truth for implementation history.

`docs/PRODUCT-ROADMAP.md` is the source of truth for product direction.

---

# 17. README Relationship

`README.md` should remain the concise product/project introduction.

`docs/PRODUCT-ROADMAP.md` contains the detailed product direction, product principles, phase status, future capability areas, research framework, and feature-selection rules.

The two documents should complement each other and must not contain conflicting product definitions.

The roadmap should not duplicate the entire README.

---

# 18. Next Feature Selection

The next feature must not be chosen as an arbitrary CRUD addition.

The current product position should be evaluated along this progression:

```text
Document Management
        ↓
Organization
        ↓
Metadata
        ↓
Traceability
        ↓
Collaboration
        ↓
Developer / Productivity Workflows
        ↓
Governance & Release Automation
        ↓
Project / API Context (Phase 7.1 & Phase 7.2 Completed)
        ↓
Cross-Document Change Impact & Cascade Verification (Phase 7.3 Completed)
        ↓
Immutable Versioning & Content Snapshot History (Phase 7.4 Completed)
        ↓
Documentation Health & Technical Knowledge Risk Radar (Phase 7.5 Completed)
        ↓
Authoritative Technical Knowledge Discovery & Traceability (Phase 8 Completed)
        ↓
Documentation Evidence & Traceability (Phase 9 Completed)
        ↓
Governance & Assurance Engine (Phase 10 Completed)
        ↓
Documentation Change Intelligence & Verification Planning (Phase 11 Completed)
        ↓
Authoritative Documentation Baseline & Drift Control (Phase 12 Completed)
        ↓
Documentation Work Requests & Review Workflow (Phase 13 Completed)
        ↓
System Architecture Topology & Cross-Project Contract Governance (Phase 14 Completed)
        ↓
Pre-Change Impact Simulation & Change Proposal Engine (Phase 15 Completed)
        ↓
Multi-Document Change Packages & Coordinated Impact Simulation (Phase 16 Completed)
        ↓
Documentation Change Package Fulfillment Verification & Immutable Attestation (Phase 17 Approved)
```

The next concrete feature should emerge from research into the next meaningful user problem at this boundary.

Until that research produces a sufficiently justified capability, the roadmap should not manufacture a random implementation commitment.

---

# 19. Product Decision Record Format

When a major product decision changes the roadmap, record the decision in product language rather than implementation history.

Use this structure:

```text
### Decision: <short product decision>

Status: <Build | Research further | Reject | Not relevant>

User problem:
<problem being addressed>

Evidence / research:
<what was learned>

Documan opportunity:
<why this belongs or may belong in Documan>

Differentiation:
<why the solution is not merely a copy of another product>

Scope decision:
<what is included and excluded>

Next step:
<research, validation, design, or implementation action>
```

This keeps the roadmap understandable even as individual implementation details change.

---

# 20. Current Strategic Position

Documan has established the foundations of a document-management and productivity platform through the intended progression of:

**Foundation → Core Document Management → Organization → Traceability → Collaboration & Access Control → Developer / Productivity Workflows → Project / API Context → Cross-Document Change Impact (Phase 7.3) → Immutable Versioning & Snapshots (Phase 7.4) → Technical Knowledge Risk Radar (Phase 7.5) → Authoritative Technical Knowledge Discovery & Traceability (Phase 8 Completed) → Documentation Evidence & Traceability (Phase 9 Completed) → Governance & Assurance Engine (Phase 10 Completed) → Documentation Change Intelligence & Verification Planning (Phase 11 Completed) → Authoritative Documentation Baseline & Drift Control (Phase 12 Completed) → Documentation Work Requests & Review Workflow (Phase 13 Completed) → System Architecture Topology & Cross-Project Contract Governance (Phase 14 Completed) → Pre-Change Impact Simulation & Change Proposal Engine (Phase 15 Completed) → Multi-Document Change Packages & Coordinated Impact Simulation (Phase 16 Completed) → Documentation Change Package Fulfillment Verification & Immutable Attestation (Phase 17 Approved).**

With Phase 16 completed, Documan extends its change simulation platform from single-document proposals to coordinated multi-document change packages. Phase 17 expands this foundation into post-acceptance fulfillment verification and attestation. Phase 17 defines deterministic fulfillment verification comparing accepted change packages (`DocumentChangePackage`) against resulting authoritative `DocumentVersion` records and relationship states (`POST /api/change-packages/:id/verify-fulfillment`), categorical fulfillment states (`FULFILLED`, `PARTIALLY_FULFILLED`, `UNFULFILLED`, `INDETERMINATE`, `UNSUPPORTED`, `STALE`), scope variance detection (`UNAPPROVED_SCOPE_VARIANCE`), dedicated immutable attestation primitive (`PackageFulfillmentAttestation`), and Baseline Eligibility Handoff Payload outputting recommended parameters for Phase 12 baseline creation (`createBaseline`).

