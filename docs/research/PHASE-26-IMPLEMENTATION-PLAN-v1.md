# Phase 26 Implementation Plan v1 — System-Wide Contract Change Planning & Multi-Project Change Package Synthesis

> **Product Source of Truth**: [`docs/PRODUCT-ROADMAP.md`](file:///c:/MERN_STACK/Documan/documan/docs/PRODUCT-ROADMAP.md)
> **Research Source**: [`docs/research/PHASE-26-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-26-RESEARCH.md)
> **Status**: APPROVED RESEARCH — IMPLEMENTATION PLAN v1

---

## 1. Executive Summary

Phase 26 establishes a deterministic, evidence-backed **System-Wide Contract Change Planning & Multi-Project Change Package Synthesis** service ([`system-contract-plan.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.service.ts)) and interactive planning interface ([`SystemContractPlanningView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemContractPlanningView.tsx)).

Given an identified cross-project contract problem from Phase 25 ($N \times N$ Interoperability Matrix), Phase 26 synthesizes candidate change actions, structures dependency-ordered action sequences, and constructs a draft Phase 15/16-compatible change-package payload for user review.

**CRITICAL PRODUCT BOUNDARY**:
- Phase 26 is **NOT** an "automated remediation engine" and does **NOT** decide what changes *must* be made.
- Phase 26 is strictly a **CHANGE PLANNING AND DRAFT SYNTHESIS** capability.
- Phase 26 is **100% side-effect-free**: **0 new database models**, **0 database writes**, **0 background workers**, **0 audit log writes on GET/POST planning queries**, and **0 automated state mutations**.
- Phase 26 synthesizes a **draft payload**. The user explicitly reviews the plan and decides whether to submit it into existing Phase 15 (Proposals) or Phase 16 (Change Packages) workflows.

---

## 2. Research Basis

**REPOSITORY FACT**: This implementation plan is directly grounded in [`docs/research/PHASE-26-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-26-RESEARCH.md) and the completed Phase 10–25 governance codebase:

1. **Phase 14**: Project topology links (`ProjectTopologyLink`) and ACL boundary enforcement (`checkUserProjectReadAccess`).
2. **Phase 15**: Single-document change proposal models (`DocumentChangeProposal`), proposal types (`TECHNICAL_CONTRACT_UPDATE`, `DOCUMENT_CONTENT_UPDATE`, `RELATIONSHIP_UPDATE`, `DEPRECATION_PROPOSAL`), and state machines.
3. **Phase 16**: Multi-document change package containers (`DocumentChangePackage`) and overlay change simulation (`runChangePackageSimulation`).
4. **Phase 17**: Fulfillment verification attestation (`PackageFulfillmentAttestation`).
5. **Phase 18**: Baseline alignment and cross-project contract lineage (`system-baseline-alignment.service.ts`).
6. **Phase 23**: Structural OpenAPI contract evolution comparison (`system-contract-evolution.service.ts`) and breaking delta taxonomy (`ENDPOINT_REMOVED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_ADDED`, `ENDPOINT_DEPRECATED`).
7. **Phase 25**: Cross-project contract interoperability matrix (`system-contract-matrix.service.ts`) and 6-tier state precedence hierarchy (`NO_RELEVANT_CONTRACT_DEPENDENCY`, `MISSING_AUTHORITATIVE_CONTRACT`, `UNSUPPORTED_CONTRACT`, `BREAKING_CONTRACT_DELTA`, `STRUCTURALLY_MISALIGNED`, `ALIGNED`).

---

## 3. Product Gap

**INFERENCE**: Phase 25 answers: *"What cross-project contract problems exist across our topology?"*

However, when an Enterprise Architect or Technical Lead discovers a contract breakage or misalignment in Phase 25, they face a manual burden:
- They must manually inspect individual document versions across projects.
- They must manually deduce candidate change strategies (e.g. should the consumer adapt to the new spec, or should the provider restore compatibility?).
- They must manually figure out dependency sequencing across projects.
- They must manually draft individual Phase 15 proposals and group them into Phase 16 packages.

Phase 26 bridges this gap by calculating evidence-backed candidate change actions, presenting alternative strategies, ordering dependent actions topologically, and assembling a draft Phase 15/16-compatible payload.

---

## 4. Product Question

Phase 25 answers:
> *"What cross-project contract problems exist?"*

Phase 26 answers:
> *"Given an identified cross-project contract problem, what evidence-backed candidate change actions and dependency ordering could address it, and how could those actions be assembled into a draft Phase 15/16-compatible change-package payload?"*

**PROPOSED DESIGN**: Phase 26 deliberately avoids claiming *"what changes MUST be made."* Structural contract evidence alone cannot determine developer intent or organizational priorities. Phase 26 presents **evidence-backed candidate actions**, exposes **action alternatives** where multiple valid strategies exist, and leaves final approval and execution strictly to human technical stewards.

---

## 5. Product Boundary

Phase 26 strictly enforces product boundaries. It MUST NOT:
- Automatically edit or modify document content.
- Automatically create `DocumentChangeProposal` database records.
- Automatically create `DocumentChangePackage` database records.
- Automatically approve or execute changes.
- Automatically create `VerificationTask` or `DocumentationWorkRequest` records.
- Automatically mutate baseline snapshots or project topology links.
- Automatically grant policy waivers or alter release gate statuses.
- Become a generic task management, ticket tracking, or remediation platform.
- Become a CI/CD build runner, software deployment system, or Git automation tool.

---

## 6. User Workflow

The end-to-end product flow integrates cleanly with existing phases:

```text
               Phase 25 Matrix View
           (Contract Problem Discovered)
                        │
                        ▼ Clicks "Plan Change"
             Phase 26 Change Planning
   (Calculates Candidate Actions & Dependency Order)
                        │
                        ▼
            Review Candidate Action Plan
     (Inspects Evidence, Alternatives, Order)
                        │
                        ▼
           Preview Draft Change Package
         (Non-persistent Phase 16 DTO)
                        │
                        ▼ User Clicks "Continue to Phase 15/16"
          EXPLICIT USER HANDOFF BOUNDARY
                        │
                        ▼
        Phase 15 / 16 Creation Workflow
    (Persists Proposals/Package & Runs Overlay Simulation)
                        │
                        ▼
             Phase 17 Attestation
          (Verifies Fulfillment & Re-baselines)
                        │
                        ▼
      Phase 25 Matrix Grid Re-evaluation
             (Cell transitions to ALIGNED)
```

---

## 7. Phase 25 Composition

**REPOSITORY FACT**: Phase 26 consumes Phase 25 findings directly via [`system-contract-matrix.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-matrix.service.ts) rather than duplicating topology traversal or matrix generation.

1. Phase 26 calls `generateSystemContractMatrix` (or internal helper `evaluateProjectPairContract`) to obtain authoritative project-pair cell states (`BREAKING_CONTRACT_DELTA`, `STRUCTURALLY_MISALIGNED`, `MISSING_AUTHORITATIVE_CONTRACT`, `UNSUPPORTED_CONTRACT`).
2. Phase 26 extracts `criticalIncompatibilities` and directional consumer-to-provider contract relationships.
3. Phase 26 operates only on cell states that indicate contract friction, returning clean empty plans for `ALIGNED` or `NO_RELEVANT_CONTRACT_DEPENDENCY` pairs.

---

## 8. Phase 23 Composition

**REPOSITORY FACT**: For contract pairs with `BREAKING_CONTRACT_DELTA`, Phase 26 invokes structural contract diffing logic from [`system-contract-evolution.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-evolution.service.ts).

1. Reuses `parseAndCanonicalizeContract` and structural diff algorithms to extract precise breaking delta types (`ENDPOINT_REMOVED`, `FIELD_REMOVED`, `FIELD_TYPE_CHANGED`, `FIELD_REQUIREDNESS_CHANGED`, `ENUM_VALUE_REMOVED`, `ENDPOINT_DEPRECATED`, `ENDPOINT_ADDED`).
2. Attaches exact delta evidence (method, path, field name, previous type, new type) to each candidate change action.

---

## 9. Phase 15 Composition

**REPOSITORY FACT**: Phase 26 maps candidate change actions to existing Phase 15 [`DocumentChangeProposal`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-proposals/document-change-proposal.model.ts) concepts without creating database records.

Supported candidate proposal types:
- `TECHNICAL_CONTRACT_UPDATE`: For modifying spec content or endpoint parameters on Provider or Consumer documents.
- `DOCUMENT_CONTENT_UPDATE`: For updating Markdown documentation text to reflect contract changes.
- `RELATIONSHIP_UPDATE`: For adding or modifying document-to-document contract links.

---

## 10. Phase 16 Composition

**REPOSITORY FACT**: Phase 26 structures its output draft payload using Phase 16 [`DocumentChangePackage`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/change-packages/document-change-package.model.ts) schema concepts.

The synthesized draft package payload contains:
- `draftPackageName`: Suggested identifier (e.g. `DRAFT-PKG-REALIGN-PROJECT-A-B`).
- `description`: Summary of targeted contract findings and candidate change scope.
- `targetProjectId`: Consumer or Provider project ID.
- `candidateProposals`: Array of candidate proposal payloads.
- `dependencySequence`: Ordered list of action IDs.
- `unresolvedDecisions`: List of ambiguous decisions requiring human review.

---

## 11. Phase 17 / Phase 10 Implications

- **Phase 17 (Fulfillment Verification)**: The draft change plan includes post-fulfillment guidance, indicating which resulting document versions will require Phase 17 attestation once proposals are accepted and implemented.
- **Phase 10 (Governance Release Gates)**: Synthesized change plans highlight how candidate actions are predicted to restore local release gate statuses from `BLOCKED` to `PASSED`.

---

## 12. Candidate Action Model

**PROPOSED DESIGN**: A candidate change action represents a single, evidence-backed potential modification step.

```typescript
export type CandidateActionType =
  | 'TECHNICAL_CONTRACT_UPDATE'
  | 'DOCUMENT_CONTENT_UPDATE'
  | 'RELATIONSHIP_UPDATE'
  | 'BASELINE_REFERENCE_UPDATE'
  | 'CONTRACT_AUTHORITY_COMPLETION';

export type ActionRole =
  | 'CONSUMER_ADAPTATION'       // Consumer adapts client code/doc to new provider spec
  | 'PROVIDER_RESTORATION'     // Provider restores backward compatibility
  | 'COORDINATED_REALIGNMENT'   // Both consumer and provider update in tandem
  | 'AUTHORITY_COMPLETION';     // Missing contract/spec is supplied

export interface CandidateChangeActionDTO {
  actionId: string; // Ephemeral deterministic ID: "act_1", "act_2"
  actionRole: ActionRole;
  candidateProposalType: 'TECHNICAL_CONTRACT_UPDATE' | 'DOCUMENT_CONTENT_UPDATE' | 'RELATIONSHIP_UPDATE';
  title: string;
  description: string;
  sourceProjectId: string;
  targetProjectId: string;
  targetDocumentId: string;
  targetDocumentTitle: string;
  relevantEvidence: {
    interoperabilityState: string;
    deltaType?: string | undefined;
    endpointKey?: string | undefined;
    fieldName?: string | undefined;
    details: string;
  };
  proposedChanges: {
    proposedContent?: string | undefined;
    proposedSpecContent?: string | undefined;
    proposedRelationships?: any[] | undefined;
  };
  alternativeActionIds: string[]; // Pointer to mutually exclusive alternative candidate actions
  prerequisiteActionIds: string[]; // Ephemeral IDs of actions that should precede this action
}
```

---

## 13. Action Evidence

Every candidate change action MUST include explicit, empirical evidence justifying its inclusion.

```typescript
export interface ActionEvidenceDTO {
  sourceProjectId: string;
  targetProjectId: string;
  targetDocumentId: string;
  interoperabilityState: string; // Phase 25 state
  deltaType?: string | undefined;   // Phase 23 delta type
  endpointKey?: string | undefined; // e.g. "GET:/v1/users"
  fieldName?: string | undefined;   // e.g. "user_id"
  reason: string;                // Grounded text explanation
  affectedDownstreamDocumentsCount: number;
}
```

No candidate action may be generated without direct backing from Phase 25 matrix states or Phase 23 structural diffs.

---

## 14. Action Alternatives

**PROPOSED DESIGN**: When a contract breakage or misalignment occurs, structural evidence alone cannot determine whether the Provider or Consumer is at fault. Phase 26 explicitly presents **Action Alternatives** rather than assuming a single remediation path.

### Example: `ENDPOINT_REMOVED` (`DELETE /v1/users/:id`)
- **Alternative 1 (Consumer Adaptation)**:
  - *Role*: `CONSUMER_ADAPTATION`
  - *Action*: Update Consumer Document D2 to remove reliance on `DELETE /v1/users/:id` or switch to `POST /v1/users/deactivate`.
- **Alternative 2 (Provider Compatibility Restoration)**:
  - *Role*: `PROVIDER_RESTORATION`
  - *Action*: Update Provider Document D1 to restore endpoint `DELETE /v1/users/:id` marked as `isDeprecated: true`.

Both alternatives are returned in the action list, linked via `alternativeActionIds`. The user selects which strategy to include in the draft change package.

---

## 15. Dependency-Ordered Action Sequence

Phase 26 calculates an informational **`DEPENDENCY_ORDERED_ACTION_SEQUENCE`** based on topological depth and contract dependency direction.

### Ordering Rules
1. **Provider-First Strategy**: Provider contract updates or compatibility restorations precede Consumer contract adaptations.
2. **Authority-First Strategy**: Supplying missing specs (`MISSING_AUTHORITATIVE_CONTRACT`) precedes contract delta adaptations.
3. **Baseline-Last Strategy**: Updating consumer baseline references (`STRUCTURALLY_MISALIGNED`) follows document/spec version updates.

**INFORMATIONAL NOTICE**: The response explicitly marks the sequence as informational:
> *"This dependency ordering is an evidence-backed recommendation. Human technical stewards may adjust the execution sequence during Phase 15/16 review."*

---

## 16. Draft Package Payload

Phase 26 generates a non-persistent **Draft Change Package Payload** (`DraftChangePackagePayloadDTO`) matching Phase 16 concepts.

```typescript
export interface DraftProposalPayloadDTO {
  tempId: string; // "draft_prop_1"
  targetDocumentId: string;
  targetDocumentTitle: string;
  proposalType: 'TECHNICAL_CONTRACT_UPDATE' | 'DOCUMENT_CONTENT_UPDATE' | 'RELATIONSHIP_UPDATE';
  title: string;
  description: string;
  proposedChanges: Record<string, any>;
  selectedActionRole: ActionRole;
}

export interface DraftChangePackagePayloadDTO {
  draftPackageName: string;
  description: string;
  targetProjectId: string;
  candidateProposals: DraftProposalPayloadDTO[];
  recommendedDependencySequence: string[]; // Ordered tempIds
  unresolvedDecisions: Array<{
    decisionId: string;
    topic: string;
    description: string;
    alternativeOptions: string[];
  }>;
}
```

**CRITICAL RULE**: The draft payload MUST NOT contain fake or fabricated MongoDB ObjectIDs for proposals, packages, versions, or verification tasks. All IDs in the draft are either existing authoritative database IDs or explicit ephemeral strings (`draft_prop_1`).

---

## 17. Explicit Handoff Boundary

The boundary between Phase 26 draft synthesis and Phase 15/16 persistent execution is strictly user-controlled:

```text
  ┌─────────────────────────────────────────────────────────┐
  │                 Phase 26 Service (GET/POST)             │
  │  - Computes candidate actions in-memory                 │
  │  - Assembles draft package payload                      │
  │  - Database Writes: 0                                   │
  └───────────────────────────┬─────────────────────────────┘
                              │
                              ▼ Returns JSON Response
  ┌─────────────────────────────────────────────────────────┐
  │                   Frontend Planning View                │
  │  - Displays Candidate Actions & Evidence                │
  │  - Allows user to toggle Alternative Strategies         │
  │  - Previews Draft Package Payload                       │
  │  - User Clicks: "Submit Draft to Phase 16 Package"     │
  └───────────────────────────┬─────────────────────────────┘
                              │
                              ▼ User Initiates Post Handoff
  ┌─────────────────────────────────────────────────────────┐
  │            Existing Phase 16 Controller Endpoint        │
  │  - POST /api/v1/projects/:id/change-packages            │
  │  - Persists real DocumentChangePackage & Proposals      │
  │  - Runs Coordinated Overlay Simulation                  │
  └─────────────────────────────────────────────────────────┘
```

Phase 26 does **NOT** provide a duplicate proposal/package creation endpoint. It relies 100% on the existing Phase 15 and Phase 16 creation controllers during user handoff.

---

## 18. State-to-Action Mapping

The table below defines the repository-grounded mapping from Phase 25 cell states and Phase 23 contract deltas to candidate change actions:

| Phase 25 State / Phase 23 Delta | Candidate Action Role | Candidate Proposal Type | Description & Evidence Mapping |
| :--- | :--- | :--- | :--- |
| **`ENDPOINT_REMOVED`** | `CONSUMER_ADAPTATION` | `TECHNICAL_CONTRACT_UPDATE` | Adapt consumer document links/spec to remove call to deleted endpoint. |
| **`ENDPOINT_REMOVED`** | `PROVIDER_RESTORATION` | `TECHNICAL_CONTRACT_UPDATE` | Restore deleted endpoint in provider spec with `isDeprecated: true`. |
| **`FIELD_REMOVED`** | `CONSUMER_ADAPTATION` | `TECHNICAL_CONTRACT_UPDATE` | Adapt consumer payload schema to stop referencing removed field. |
| **`FIELD_REMOVED`** | `PROVIDER_RESTORATION` | `TECHNICAL_CONTRACT_UPDATE` | Restore field in provider response schema. |
| **`FIELD_TYPE_CHANGED`** | `COORDINATED_REALIGNMENT` | `TECHNICAL_CONTRACT_UPDATE` | Coordinated update of field data type across provider and consumer. |
| **`FIELD_REQUIREDNESS_CHANGED`** | `CONSUMER_ADAPTATION` | `TECHNICAL_CONTRACT_UPDATE` | Adapt consumer client payload to include newly required field. |
| **`ENUM_VALUE_REMOVED`** | `CONSUMER_ADAPTATION` | `TECHNICAL_CONTRACT_UPDATE` | Update consumer enum validation to handle removed enum value. |
| **`ENDPOINT_DEPRECATED`** | `CONSUMER_ADAPTATION` | `DOCUMENT_CONTENT_UPDATE` | Update consumer documentation with deprecation warning & migration note. |
| **`STRUCTURALLY_MISALIGNED`** | `COORDINATED_REALIGNMENT` | `RELATIONSHIP_UPDATE` | Rebind consumer document relationship to provider's latest active baseline. |
| **`MISSING_AUTHORITATIVE_CONTRACT`** | `AUTHORITY_COMPLETION` | `TECHNICAL_CONTRACT_UPDATE` | Import/attach OpenAPI specification to target provider document. |
| **`UNSUPPORTED_CONTRACT`** | `AUTHORITY_COMPLETION` | `DOCUMENT_CONTENT_UPDATE` | Convert plain text specification into valid OpenAPI 3.0/3.1 format. |

---

## 19. Baseline Handling

- Phase 26 planner identifies the current provider active baseline version (Phase 12), the consumer referenced version, and the alignment gap.
- Phase 26 **MUST NOT** invent future baseline version names, version tags, or checksums (e.g. `v2.1.0-draft`).
- Future baseline creation remains an explicit user workflow performed in Phase 12 after Phase 17 fulfillment attestation.

---

## 20. ACL / Security

1. **Pre-Traversal Authorization**: `checkUserProjectReadAccess(userId, targetProjectId)` executes before project discovery, graph traversal, document fetching, or action synthesis.
2. **Strict Privacy Isolation**: If the requesting user lacks `READ` permission on a connected project in the topology, that project node, its documents, topology edges, and candidate actions are **100% omitted** from the response payload.
3. **No Aggregate Leakage**: Unauthorized connected projects return zero placeholders, zero restricted node IDs, and zero hidden action count metrics.
4. **IDOR Prevention**: All target document and project IDs in the synthesized draft payload are verified against the user's authorized project set.

---

## 21. Bounds

To guarantee performance and stability across large project topologies:
- `MAX_AUTHORIZED_PROJECTS = 50`
- `MAX_TOPOLOGY_EDGES = 100`
- `MAX_CONTRACT_RELATIONSHIPS = 200`
- `MAX_TRAVERSAL_DEPTH = 3`
- `MAX_CANDIDATE_ACTIONS = 50`
- `MAX_DRAFT_PROPOSALS = 20`

If a topology exceeds these bounds, the service truncates analysis cleanly and sets `isTruncated: true` with a clear explanatory warning.

---

## 22. Backend Architecture

Phase 26 backend implementation consists of 4 focused files within `apps/api/src/modules/governance/`:

1. **[`system-contract-plan.types.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.types.ts)**: Type definitions, interfaces, DTOs, candidate action roles, and draft package schemas.
2. **[`system-contract-plan.service.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.service.ts)**: Core in-memory change planning engine, candidate action generator, topological sorter, and draft package synthesizer.
3. **[`system-contract-plan.controller.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.controller.ts)**: Express route handler validating requests and returning synthesized change plans.
4. **[`system-contract-plan.routes.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/system-contract-plan.routes.ts)**: Endpoint registration with authentication and authorization middleware.

---

## 23. API

### Endpoint Specification

```http
POST /api/v1/projects/:projectId/contract-change-plan
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

#### Request Body (Optional Filters)
```json
{
  "targetProviderProjectId": "650000000000000000000002",
  "severityFilter": "BREAKING_ONLY",
  "includeAlternatives": true
}
```

#### Response Payload (`200 OK`)
```json
{
  "success": true,
  "data": {
    "targetProjectId": "650000000000000000000001",
    "evaluatedAt": "2026-09-07T14:57:00.000Z",
    "summary": {
      "totalContractProblems": 2,
      "candidateActionsCount": 3,
      "hasAlternatives": true,
      "isTruncated": false
    },
    "candidateActions": [
      {
        "actionId": "act_1",
        "actionRole": "CONSUMER_ADAPTATION",
        "candidateProposalType": "TECHNICAL_CONTRACT_UPDATE",
        "title": "Adapt Consumer Order Service to Removed Endpoint",
        "description": "Remove reference to deleted DELETE /v1/users/:id endpoint in Order Service API doc",
        "sourceProjectId": "650000000000000000000001",
        "targetProjectId": "650000000000000000000002",
        "targetDocumentId": "650000000000000000000010",
        "targetDocumentTitle": "Order Service API Specification",
        "relevantEvidence": {
          "interoperabilityState": "BREAKING_CONTRACT_DELTA",
          "deltaType": "ENDPOINT_REMOVED",
          "endpointKey": "DELETE:/v1/users/:id",
          "details": "Endpoint DELETE /v1/users/:id was removed in User Service spec"
        },
        "proposedChanges": {
          "proposedSpecContent": "..."
        },
        "alternativeActionIds": ["act_2"],
        "prerequisiteActionIds": []
      },
      {
        "actionId": "act_2",
        "actionRole": "PROVIDER_RESTORATION",
        "candidateProposalType": "TECHNICAL_CONTRACT_UPDATE",
        "title": "Restore Endpoint with Deprecation Notice in User Service",
        "description": "Restore DELETE /v1/users/:id in User Service spec marked as deprecated",
        "sourceProjectId": "650000000000000000000002",
        "targetProjectId": "650000000000000000000001",
        "targetDocumentId": "650000000000000000000020",
        "targetDocumentTitle": "User Service API Specification",
        "relevantEvidence": {
          "interoperabilityState": "BREAKING_CONTRACT_DELTA",
          "deltaType": "ENDPOINT_REMOVED",
          "endpointKey": "DELETE:/v1/users/:id",
          "details": "Provider restoration alternative"
        },
        "proposedChanges": {
          "proposedSpecContent": "..."
        },
        "alternativeActionIds": ["act_1"],
        "prerequisiteActionIds": []
      }
    ],
    "dependencyOrderedSequence": ["act_2", "act_1"],
    "draftChangePackage": {
      "draftPackageName": "DRAFT-PKG-REALIGN-ORDER-USER-SERVICE",
      "description": "Draft change package addressing breaking endpoint deletion between Order Service and User Service",
      "targetProjectId": "650000000000000000000001",
      "candidateProposals": [
        {
          "tempId": "draft_prop_1",
          "targetDocumentId": "650000000000000000000010",
          "targetDocumentTitle": "Order Service API Specification",
          "proposalType": "TECHNICAL_CONTRACT_UPDATE",
          "title": "Adapt Consumer Order Service to Removed Endpoint",
          "description": "Remove reference to deleted DELETE /v1/users/:id endpoint",
          "proposedChanges": {},
          "selectedActionRole": "CONSUMER_ADAPTATION"
        }
      ],
      "recommendedDependencySequence": ["draft_prop_1"],
      "unresolvedDecisions": [
        {
          "decisionId": "dec_1",
          "topic": "Breaking Endpoint Remediation Strategy",
          "description": "Select whether Order Service adapts to deletion (act_1) or User Service restores deprecated endpoint (act_2)",
          "alternativeOptions": ["act_1", "act_2"]
        }
      ]
    }
  }
}
```

---

## 24. Frontend

A focused, read-only planning panel integrated into the Governance section:
[`apps/web/src/features/governance/SystemContractPlanningView.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/governance/SystemContractPlanningView.tsx)

### UI Components & Sections
1. **Contract Incompatibility Header**: Displays target project name, evaluation timestamp, total findings, and severity badges.
2. **Candidate Action Roster**: Interactive cards displaying each candidate change action, role badge (`Consumer Adaptation`, `Provider Restoration`, `Coordinated`), target document title, and grounded evidence.
3. **Action Strategy Selector**: Radio toggle allowing users to choose between Alternative Action 1 vs Alternative Action 2.
4. **Dependency Sequence Diagram**: Visual ordered step list showing recommended execution order.
5. **Draft Package Preview Drawer**: Displays synthesized `DraftChangePackagePayloadDTO` JSON/form layout with unresolved decision callouts.
6. **Explicit Handoff Button**: Prominent primary button: `"Continue to Phase 16 Change Package"`. Clicking this navigates to the Phase 16 creation drawer with pre-filled proposal fields. Banner explicitly states: *"This is a proposed change plan. It does not execute or approve changes."*

---

## 25. Determinism

Given identical database state (documents, specs, baselines, relationships, topology links), Phase 26 planning queries are **100% deterministic**:
- Ephemeral action IDs (`act_1`, `act_2`) are derived deterministically by hashing target document IDs, delta types, and action roles.
- Topological sorting uses deterministic tie-breaking (alphabetical by `actionId`).
- Multiple consecutive invocations of `POST /api/v1/projects/:projectId/contract-change-plan` return identical JSON payloads byte-for-byte.

---

## 26. Performance

- **0 N+1 Queries**: Executes 3 bulk batch queries (1 for topology links, 1 for active baselines & specs, 1 for contract relationships).
- **In-Memory Graph Processing**: All candidate action generation, alternative linking, topological sorting, and draft package synthesis occur in-memory.
- **Bounded Constraints**: Graph traversal capped at `MAX_AUTHORIZED_PROJECTS = 50`.

---

## 27. Persistence

**Persistence = 0**.
- 0 database models.
- 0 database collections.
- 0 persistent change plan records.
- 0 automatic proposal writes.
- 0 automatic package writes.

---

## 28. Workers

**Workers = 0**.
- 0 background queue workers.
- 0 BullMQ queues.
- 0 cron sweep jobs.
- 0 asynchronous worker threads.

---

## 29. Audit Behavior

**Audit Writes = 0**.
- Phase 26 planning queries are read-only decision-support queries.
- 0 audit events emitted to `DocumentAudit` during `POST /api/v1/projects/:projectId/contract-change-plan`.
- Audit logging occurs ONLY when the user explicitly submits a package via the existing Phase 16 creation endpoint (`DOCUMENT_CHANGE_PACKAGE_CREATED`).

---

## 30. QA Strategy

Phase 26 will be verified via a dedicated, automated QA runner script:
[`apps/api/src/modules/governance/run_phase26_qa.ts`](file:///c:/MERN_STACK/Documan/documan/apps/api/src/modules/governance/run_phase26_qa.ts)

Requirements:
- Dynamically count all scenarios executed.
- Must execute at least 50 distinct QA scenarios.
- Verify full regression across Phases 10, 14, 18, 19, 20, 21, 22, 23, 24, 25.

---

## 31. QA Matrix

The matrix below details all 50 planned QA scenarios:

| # | Scenario Category | Description / Inputs | Expected Outcome |
| :---: | :--- | :--- | :--- |
| 1 | `BREAKING_CONTRACT_DELTA` | Provider removes active endpoint | Generates 2 candidate actions (Consumer Adapt vs Provider Restore) |
| 2 | `ENDPOINT_REMOVED` | Endpoint `DELETE /v1/users/:id` removed | Candidate action includes exact endpoint key in evidence |
| 3 | `FIELD_REMOVED` | Required payload field `user_id` removed | Candidate action includes field name in evidence |
| 4 | `FIELD_TYPE_CHANGED` | Field type changed from `string` to `number` | Candidate action suggests coordinated type update |
| 5 | `FIELD_REQUIREDNESS_CHANGED` | Field `email` changed to required | Candidate action suggests consumer payload update |
| 6 | `ENUM_VALUE_REMOVED` | Enum value `DEPRECATED` removed | Candidate action suggests enum handling update |
| 7 | `ENDPOINT_ADDED` | New endpoint `POST /v1/users/batch` added | Generates informational consumer opportunity action |
| 8 | `ENDPOINT_DEPRECATED` | Endpoint marked `isDeprecated: true` | Candidate action suggests consumer documentation update |
| 9 | `STRUCTURALLY_MISALIGNED` | Consumer on Baseline v1, Provider on v2 | Candidate action suggests baseline reference update |
| 10 | `MISSING_AUTHORITATIVE_CONTRACT` | Provider document has no spec attached | Candidate action suggests OpenAPI spec import |
| 11 | `UNSUPPORTED_CONTRACT` | Specification is plain prose | Candidate action suggests spec format conversion |
| 12 | `INDETERMINATE_EVIDENCE` | Spec format unparseable | Candidate action flags missing structured contract |
| 13 | `MULTIPLE_VALID_ACTIONS` | Endpoint deletion delta | Returns both Consumer Adaptation and Provider Restoration |
| 14 | `ACTION_ALTERNATIVES` | Candidate actions linked via alternatives | `alternativeActionIds` correctly points between act_1 & act_2 |
| 15 | `DEPENDENCY_ORDERING` | Multi-step provider/consumer chain | `dependencyOrderedSequence` places Provider action first |
| 16 | `DOWNSTREAM_IMPACT` | Transitive 3-project topology | Candidate action includes downstream affected document count |
| 17 | `CONSUMER_SIDE_CANDIDATE` | Consumer-scoped action | `actionRole` set to `CONSUMER_ADAPTATION` |
| 18 | `PROVIDER_SIDE_CANDIDATE` | Provider-scoped action | `actionRole` set to `PROVIDER_RESTORATION` |
| 19 | `CROSS_PROJECT_ACTION` | Action spanning Project A & Project B | Correctly populates `sourceProjectId` & `targetProjectId` |
| 20 | `SINGLE_DOCUMENT_CANDIDATE` | Target document specified | Single document title and ID populated |
| 21 | `MULTI_DOCUMENT_CANDIDATE` | Multiple document breakages | Package payload contains multiple candidate proposals |
| 22 | `DRAFT_PAYLOAD` | Draft change package generated | Returns valid `DraftChangePackagePayloadDTO` structure |
| 23 | `NO_FABRICATED_IDS` | Draft proposals examined | All proposal IDs are ephemeral strings (`draft_prop_1`) |
| 24 | `PHASE_15_MAPPING` | Candidate proposal types checked | Types map strictly to `TECHNICAL_CONTRACT_UPDATE`, etc. |
| 25 | `PHASE_16_MAPPING` | Draft package structure checked | Matches Phase 16 package schema concepts |
| 26 | `EXPLICIT_HANDOFF` | User clicks handoff | Payload passes cleanly to Phase 16 package creation endpoint |
| 27 | `NO_AUTO_PERSISTENCE` | Planning query executed | `DocumentChangePackage.countDocuments()` remains unchanged |
| 28 | `NO_AUTO_PACKAGE_WRITES` | Planning query executed | Database collection size = 0 new records |
| 29 | `NO_AUTO_PROPOSAL_WRITES` | Planning query executed | `DocumentChangeProposal.countDocuments()` remains unchanged |
| 30 | `NO_DOCUMENT_MUTATION` | Planning query executed | Target `Document` records remain untouched |
| 31 | `NO_GOVERNANCE_MUTATION` | Planning query executed | `DocumentAudit` records remain untouched |
| 32 | `ACL_CONSUMER` | User lacks READ on Consumer Project | Consumer actions 100% omitted from payload |
| 33 | `ACL_PROVIDER` | User lacks READ on Provider Project | Provider actions 100% omitted from payload |
| 34 | `PARTIAL_TOPOLOGY_VISIBILITY` | User authorized on 1 of 3 nodes | Only authorized node actions returned |
| 35 | `AGGREGATE_PRIVACY` | Unauthorized node in chain | 0 placeholder IDs, 0 hidden count leakage |
| 36 | `MINIMAL_FILTERS` | Request uses `severityFilter: 'BREAKING_ONLY'` | Non-breaking actions filtered out |
| 37 | `BOUNDS_TRUNCATION` | Topology with 60 projects | Returns `isTruncated: true` cleanly |
| 38 | `N_PLUS_1_PROTECTION` | Query logged during execution | Database query count remains constant (<= 3 queries) |
| 39 | `DETERMINISTIC_SYNTHESIS` | Execute planning 5 times consecutively | Payload bytes match 100% identically across runs |
| 40 | `PHASE_25_REUSE` | Invokes `system-contract-matrix` | Reuses matrix cell evaluations directly |
| 41 | `PHASE_23_REUSE` | Invokes `system-contract-evolution` | Reuses structural OpenAPI diffing algorithm |
| 42 | `PHASE_15_REUSE` | Uses Phase 15 proposal schemas | Draft proposal types match Phase 15 enum |
| 43 | `PHASE_16_REUSE` | Uses Phase 16 package schemas | Draft package fields match Phase 16 enum |
| 44 | `NO_TASK_MANAGEMENT_DRIFT` | Response inspected | Zero Jira, ticket, or sprint task fields |
| 45 | `NO_DEPLOYMENT_DRIFT` | Response inspected | Zero Git, Docker, CI/CD, or deployment fields |
| 46 | `NO_MUST_REMEDIATE_CLAIM` | Response text inspected | Uses "candidate action", "proposed action", never "must" |
| 47 | `NO_SEMANTIC_OVERCLAIM` | Specification diff analyzed | Claims structural contract diff only, not runtime code |
| 48 | `BASELINE_NAMING_PRESERVED` | Baseline action inspected | Reuses existing baseline versions; 0 fabricated tags |
| 49 | `UNSUPPORTED_RECOMMENDATION` | Plain prose spec analyzed | Returns `UNSUPPORTED_CONTRACT` warning, no fake diff |
| 50 | `LARGE_BOUNDED_TOPOLOGY` | Topology with 45 projects | Evaluates in sub-100ms without memory leaks |

---

## 32. Architectural Stress Test

| Threat / Risk | Mitigation Strategy | Architectural Guarantee |
| :--- | :--- | :--- |
| **1. Automatic Remediation Drift** | Enforce zero database writes in service/controller layer. | Guaranteed read-only service execution. |
| **2. Proposal/Package Persistence Drift** | Isolate draft generation from database Mongoose models. | Draft payload uses distinct TypeScript DTOs. |
| **3. Invented Proposal IDs** | Prefix all draft proposal IDs with `draft_prop_`. | Guaranteed zero fake MongoDB ObjectIDs. |
| **4. Fabricated Baseline Versions** | Query active baselines from `DocumentationBaseline`. | Uses existing baseline versions only. |
| **5. Wrong Consumer/Provider Side** | Explicitly tag actions with `actionRole`. | Clear consumer vs provider attribution. |
| **6. Incorrect Action Ordering** | Use topological sorting based on contract direction. | Provider actions always precede consumer actions. |
| **7. Unsupported Action Inference** | Require direct Phase 25/23 evidence backing. | Zero hallucinated action recommendations. |
| **8. Semantic Compatibility Overclaim** | Disclaim runtime code execution proof in UI & API. | Structural OpenAPI spec comparison only. |
| **9. ACL Leakage** | Filter project nodes prior to action synthesis. | 100% privacy boundary enforcement. |
| **10. Cross-Project IDOR** | Validate target document IDs against authorized set. | Rejects unauthorized document IDs. |
| **11. N+1 Queries** | Bulk-fetch all specs and baselines in 3 queries. | Scalable $O(1)$ query complexity. |
| **12. Unbounded Action Generation** | Cap maximum candidate actions at 50. | Guaranteed bounded memory usage. |
| **13. Duplicate Phase 15/16 Authority**| Hand off draft payloads to existing Phase 15/16 endpoints. | Zero duplicate creation controllers. |
| **14. Duplicate Phase 23 Authority**| Import diff helper functions from `system-contract-evolution`.| Single source of truth for contract diffs. |
| **15. Duplicate Phase 25 Authority**| Import matrix helper functions from `system-contract-matrix`. | Single source of truth for matrix states. |
| **16. Generic Task-Management Drift**| Omit tickets, assignees, priorities, and sprint fields. | Pure document-centric contract change planning. |
| **17. Deployment/Release Drift** | Omit CI/CD runners, Git commits, and cloud deployment code.| Strictly documentation and API spec governance. |
| **18. Hidden Aggregate Leakage** | Omit counts and node placeholders for unauthorized nodes. | Zero leakage of private topology metrics. |

---

## 33. Product Boundary Review

- **Jira / Generic Task Management**: Rejected. Phase 26 contains zero ticket boards, sprint items, or task status workflows.
- **GitHub / VCS Integration**: Rejected. Phase 26 does not execute Git commands, branch operations, or commit pushes.
- **Postman / API Execution**: Rejected. Phase 26 performs static structural OpenAPI analysis; it does not execute HTTP requests.
- **CI/CD / Release Orchestration**: Rejected. Phase 26 does not trigger build pipelines or cloud environment deployments.
- **Mandatory AI / LLM**: Rejected. Phase 26 uses 100% deterministic structural diff algorithms; zero AI/LLM non-determinism.

---

## 34. Acceptance Criteria

1. `POST /api/v1/projects/:projectId/contract-change-plan` returns a valid `SystemContractPlanResponseDTO` with `candidateActions`, `dependencyOrderedSequence`, and `draftChangePackage`.
2. Planning queries execute with **0 database writes**, **0 background workers**, and **0 audit log entries**.
3. Candidate change actions present alternative strategies (`CONSUMER_ADAPTATION` vs `PROVIDER_RESTORATION`) for breaking contract deltas.
4. Draft change package payloads contain **0 fabricated database IDs**.
5. Explicit handoff boundary allows users to send draft payloads to existing Phase 15/16 controllers.
6. Strict ACL graph isolation completely omits unauthorized connected projects and documents.
7. Automated QA runner (`run_phase26_qa.ts`) executes and passes all 50 scenarios dynamically.
8. Full regression test suite passes across Phases 10, 14, 18, 19, 20, 21, 22, 23, 24, 25, API typechecks, ESLint, and frontend production builds.

---

## 35. Open Questions

1. **Strategy Selection Persistence**: When a user selects a specific action alternative (e.g., Option A instead of Option B) in the UI, should the UI pass the selected `actionId` array directly to the Phase 16 creation drawer during handoff?
   - *Resolution*: Yes. The UI will filter `draftChangePackage.candidateProposals` based on user-selected `actionId` options before submitting to Phase 16.
2. **Multi-Project Handoff Routing**: If a candidate action plan includes proposals targeting documents in 2 different projects, should the UI create 2 separate Phase 15 proposals or 1 multi-project Phase 16 package?
   - *Resolution*: If target documents belong to multiple projects, the UI routes to Phase 16 Coordinated Change Package creation. If all target documents belong to a single project, the UI allows choosing either single proposals (Phase 15) or a package (Phase 16).

---

## 36. Implementation Sequence

```text
Step 1: Create Types & Interfaces
   └─► Create apps/api/src/modules/governance/system-contract-plan.types.ts

Step 2: Implement Core Planning Service
   └─► Create apps/api/src/modules/governance/system-contract-plan.service.ts
   └─► Implement candidate action generation & state-to-action mapping
   └─► Implement alternative linking & topological dependency sorter
   └─► Implement draft package payload synthesizer

Step 3: Implement Controller & Routes
   └─► Create apps/api/src/modules/governance/system-contract-plan.controller.ts
   └─► Create apps/api/src/modules/governance/system-contract-plan.routes.ts
   └─► Register routes in app.ts with authentication middleware

Step 4: Implement Automated QA Suite & QA Runner
   └─► Create apps/api/src/modules/governance/system-contract-plan.test.ts
   └─► Create apps/api/src/modules/governance/run_phase26_qa.ts (50 scenarios)

Step 5: Implement Frontend Planning Interface
   └─► Create apps/web/src/features/governance/SystemContractPlanningView.tsx
   └─► Integrate into Project Details Governance section
   └─► Connect explicit handoff button to Phase 16 creation drawer

Step 6: Verification & Regression Sweep
   └─► Run run_phase26_qa.ts (50 scenarios)
   └─► Run Vitest suite across all governance modules
   └─► Run API typecheck, ESLint, Web build, and manual QA
```

---

## 37. Verification Plan

### Automated Verification
1. **Phase 26 Automated QA Suite**: `npx tsx apps/api/src/modules/governance/run_phase26_qa.ts` (50 scenarios).
2. **Vitest Unit & Integration Tests**: `pnpm --filter api test` (All tests across all 88+ test files must pass).
3. **Regression QA Suites**:
   - `run_phase10_qa.ts` (25 scenarios)
   - `run_phase14_qa.ts` (25 scenarios)
   - `run_phase18_qa.ts` (38 scenarios)
   - `run_phase19_qa.ts` (38 scenarios)
   - `run_phase20_qa.ts` (25 scenarios)
   - `run_phase21_qa.ts` (25 scenarios)
   - `run_phase22_qa.ts` (25 scenarios)
   - `run_phase23_qa.ts` (25 scenarios)
   - `run_phase24_qa.ts` (25 scenarios)
   - `run_phase25_qa.ts` (25 scenarios)
4. **TypeScript Typecheck**: `pnpm --filter api typecheck` and `pnpm --filter web typecheck` (0 errors).
5. **ESLint**: `pnpm lint` (0 warnings/errors).
6. **Web Production Build**: `pnpm --filter web build` (0 build errors).

### Manual Verification
1. Navigate to Project Details page $\rightarrow$ Governance Section $\rightarrow$ System Contract Matrix tab.
2. Select a project pair showing `BREAKING_CONTRACT_DELTA` or `STRUCTURALLY_MISALIGNED`.
3. Click `"Plan Contract Change"`.
4. Inspect generated Candidate Actions, evidence breakdown, alternative strategies, and dependency order.
5. Click `"Continue to Phase 16 Change Package"`, verify draft payload fields pre-fill in the creation drawer.
6. Submit change package, run overlay simulation, approve package, attest fulfillment in Phase 17, and verify matrix cell transitions to `ALIGNED`.
