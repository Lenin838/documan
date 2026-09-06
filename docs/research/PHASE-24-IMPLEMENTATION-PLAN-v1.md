# Phase 24 Implementation Plan v1

> **Approved Direction**: End-to-End Document Traceability Completeness & Gap Audit Engine
> **Research Basis**: [`docs/research/PHASE-24-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-24-RESEARCH.md)
> **Plan Status**: PLAN ONLY — No code implementation, no model creation, no routes, no UI components, no feature branch, no git commits/merges/pushes until explicit authorization.

---

## 1. Executive Summary

Documan has established a comprehensive document-management platform across Phases 1–23, featuring single-project assurance, multi-document change packages, cross-project topology graphs, system release gates, policy waivers, what-if simulations, historical lineage timelines, and structural contract evolution diffing.

However, Documan currently lacks a unified engine to answer the fundamental question:
> **"Where is a document's authoritative traceability chain incomplete, and what repository evidence proves the gap?"**

Phase 24 introduces the **End-to-End Document Traceability Completeness & Gap Audit Engine**. It delivers a read-only, request-scoped diagnostic service (`traceability-audit.service.ts`) and interactive audit UI (`TraceabilityAuditView.tsx`) that inspects the 8 nodes of a document version's chain of custody, evaluates deterministic applicability rules, computes factual completeness metrics ($N_{\text{satisfied}} / N_{\text{applicable}}$), identifies structured gap types, and provides actionable remediation guidance without mutating database state.

---

## 2. Research Basis

[REPOSITORY FACT]
This implementation plan is grounded in the approved research document [`docs/research/PHASE-24-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-24-RESEARCH.md).

Key research conclusions incorporated:
1. **Focus**: Read-only diagnostic audit engine (zero automated repair, zero task creation, zero CI/CD automation).
2. **Composition**: Reuses Phase 7.3 (Cascade), Phase 8 (Knowledge), Phase 9 (Evidence), Phase 10 (Assurance), Phase 11 (Verification), Phase 12 (Baseline), Phase 14 (Topology), Phase 15/16 (Proposals & Packages), Phase 17 (Attestation), Phase 18 (Alignment), Phase 19 (Gate), Phase 20 (Waiver), Phase 22 (Lineage), and Phase 23 (Contract Evolution).
3. **Persistence**: **ZERO persistence** (0 new Mongoose models).
4. **Workers**: **ZERO background workers** (0 cron / 0 queues).
5. **Audit Behavior**: **ZERO audit log writes** on GET requests.
6. **ACL Boundary**: Enforces Phase 14 ACL pre-filtering (100% omission of unauthorized project subgraphs).

---

## 3. Repository Evidence

[REPOSITORY FACT]
Existing authoritative Mongoose models inspected in the workspace:
- `Document`: `projectId`, `title`, `fileType`, `status` (`DRAFT`, `APPROVED`, `DEPRECATED`), `stewardId`.
- `DocumentVersion`: `documentId`, `versionNumber`, `content`, `checksum`, `createdBy`.
- `DocumentRelationship`: `sourceDocumentId`, `targetDocumentId`, `type` (`API_CONTRACT`, `DEPENDS_ON`, `IMPLEMENTS`, `DOCUMENTED_BY`), `isCrossProject`.
- `IDocumentChangeProposal`: `targetDocumentId`, `proposalType`, `status`, `acceptedAuthoritativeVersionId`.
- `IVerificationPlan` & `IVerificationTask`: `triggerDocumentId`, `targetDocumentId`, `triggerVersion`, `status`, `evidenceReferenceId`.
- `DocumentEvidence`: `documentId`, `versionNumber`, `evidenceType`, `validUntil`.
- `IDocumentationBaseline`: `projectId`, `versionTag`, `documentSnapshots` (`documentId`, `versionNumber`, `checksum`).
- `ProjectApiSpec`: `projectId`, `documentId`, `endpoints`.
- `ProjectTopologyLink`: `sourceProjectId`, `targetProjectId`, `type: 'DEPENDS_ON'`.

---

## 4. Product Gap

[INFERENCE]
Today, Documan maintains individual traceability artifacts across separate database collections, but provides no unified diagnostic to verify that a given document version has an unbroken chain of custody. A user must manually cross-reference 6+ separate endpoints to find whether a document is missing baseline bindings, unverified in change proposals, lacking linked evidence, or unaligned across project boundaries.

Phase 24 fills this gap by delivering a unified, derived completeness audit.

---

## 5. Traceability Model

[PROPOSED DESIGN]
The end-to-end traceability chain evaluates 8 node types:

```text
DOCUMENT ──► VERSION ──► RELATIONSHIP ──► CHANGE_PROPOSAL ──► VERIFICATION_TASK ──► EVIDENCE ──► BASELINE ──► CONTRACT_SPEC
```

For every node/edge in the chain, the engine evaluates applicability and status:
- `APPLICABLE_AND_PRESENT`: Node/edge is applicable and verified present in authoritative repository state.
- `APPLICABLE_AND_MISSING`: Node/edge is applicable but missing in repository state (flags a gap).
- `APPLICABLE_BUT_INDETERMINATE`: Node/edge is applicable, but authoritative evidence is incomplete or ambiguous.
- `NOT_APPLICABLE`: Node/edge is deterministically not required for this document.

---

## 6. Applicability Rules

[PROPOSED DESIGN]
Applicability is evaluated deterministically using authoritative fields (zero prose or text similarity inference):

| Node / Edge | Applicability Condition (Factual Rules) |
| :--- | :--- |
| **DOCUMENT** | Always `APPLICABLE` (Root node). |
| **VERSION** | Always `APPLICABLE` (Document must have at least 1 version). |
| **RELATIONSHIP** | `APPLICABLE` when document has active incoming/outgoing `DocumentRelationship` records. |
| **CHANGE_PROPOSAL** | `APPLICABLE` when `DocumentVersion.versionNumber > 1` (indicates a post-creation version bump). |
| **VERIFICATION_TASK**| `APPLICABLE` when a `VerificationPlan` exists for the trigger version, or when downstream impact cascade requires verification. |
| **EVIDENCE** | `APPLICABLE` when document status is `APPROVED` or linked `VerificationTask` specifies `EVIDENCE_RENEWAL`. |
| **BASELINE** | `APPLICABLE` when project has an active `DocumentationBaseline` or document participates in cross-project topology. |
| **CONTRACT_SPEC** | `APPLICABLE` when `ProjectApiSpec` exists for the document or `DocumentVersion.content` contains valid OpenAPI JSON/YAML. |

If applicability cannot be verified from authoritative data: status = `INDETERMINATE`.

---

## 7. Traceability Requirement Types

[PROPOSED DESIGN]
The engine evaluates 8 standard traceability requirements for a document version:

1. `REQ_DOCUMENT_EXISTENCE`: Root document record exists and is active.
2. `REQ_VERSION_BINDING`: Specific version exists with non-empty content checksum.
3. `REQ_RELATIONSHIP_VERIFICATION`: Active relationships have verified status or valid task links.
4. `REQ_CHANGE_PROPOSAL_TRACE`: Post-v1 versions are linked to an `ACCEPTED` `ChangeProposal`.
5. `REQ_VERIFICATION_COMPLETION`: Triggered verification tasks are in `VERIFIED` state.
6. `REQ_EVIDENCE_ATTACHMENT`: Valid, non-expired `DocumentEvidence` is attached.
7. `REQ_BASELINE_SNAPSHOT`: Version is snapshot-bound in an active `DocumentationBaseline`.
8. `REQ_CONTRACT_SPECIFICATION`: API contract specs (if applicable) parse cleanly as valid OpenAPI structures.

---

## 8. Gap Taxonomy

[PROPOSED DESIGN]
The engine categorizes missing or indeterminate traceability into 7 explicit gap types:

1. `MISSING_VERSION`: Target document version record does not exist.
2. `MISSING_RELATIONSHIP_VERIFICATION`: Document relationship exists but is unverified following a content change.
3. `UNATTESTED_CHANGE_PROPOSAL`: Post-v1 version update lacks an accepted change proposal or fulfillment attestation.
4. `UNFULFILLED_VERIFICATION_TASK`: Verification tasks exist in `OPEN`, `IN_REVIEW`, or `SKIPPED` state.
5. `MISSING_OR_EXPIRED_EVIDENCE`: Required supporting evidence is missing or `validUntil` timestamp has passed.
6. `UNBASELINED_DOCUMENT_VERSION`: Version is not included in any active `DocumentationBaseline`.
7. `UNSUPPORTED_OR_MISSING_CONTRACT`: API specification is missing structural OpenAPI formatting or parsing returns `UNSUPPORTED_CONTRACT_STRUCTURE`.

---

## 9. Severity Model

[PROPOSED DESIGN]
Each identified gap is assigned a deterministic severity based on release and governance risk:

- `CRITICAL`: `MISSING_VERSION`, `UNBASELINED_DOCUMENT_VERSION` (when cross-project consumers exist), `UNFULFILLED_VERIFICATION_TASK` (with breaking contract changes).
- `WARNING`: `UNATTESTED_CHANGE_PROPOSAL`, `MISSING_OR_EXPIRED_EVIDENCE`, `UNVERIFIED_RELATIONSHIP`.
- `INFO`: `UNSUPPORTED_OR_MISSING_CONTRACT` (on non-API documents), unbaselined version (internal project only).

Severity does **NOT** alter the factual completeness percentage.

---

## 10. Completeness Calculation

[PROPOSED DESIGN]
Documan enforces a **pure, factual ratio metric** (zero arbitrary weighting, zero opaque health scores):

$$\text{Factual Completeness Percentage} = \left( \frac{N_{\text{satisfied}}}{N_{\text{applicable}}} \right) \times 100\%$$

Where:
- $N_{\text{satisfied}}$ = Count of requirements evaluated as `APPLICABLE_AND_PRESENT`.
- $N_{\text{applicable}}$ = Total count of requirements evaluated as `APPLICABLE` ($N_{\text{present}} + N_{\text{missing}} + N_{\text{indeterminate}}$).
- Requirements evaluated as `NOT_APPLICABLE` are **completely excluded** from both numerator and denominator.
- Requirements evaluated as `APPLICABLE_BUT_INDETERMINATE` are included in $N_{\text{applicable}}$ (denominator) but excluded from $N_{\text{satisfied}}$ (numerator).
- If $N_{\text{applicable}} == 0$, the ratio returns `null` (rendered as `N/A - Zero Applicable Requirements`).

---

## 11. Source-of-Truth Mapping

[REPOSITORY FACT]

```text
┌─────────────────────────────┐        ┌─────────────────────────────┐
│    Document / Version       │        │  ChangeProposal / Package   │
│ (Document, DocumentVersion) │        │ (ChangeProposal, Attestation)│
└──────────────┬──────────────┘        └──────────────┬──────────────┘
               │                                      │
               ├───────────────────┬──────────────────┤
               │                   │                  │
┌──────────────▼──────────────┐ ┌──▼───────────────┐ ┌▼────────────────────────────┐
│   Verification / Evidence   │ │ Baseline Snapshot│ │   Cross-Project Topology   │
│(VerificationTask, Evidence) │ │  (Baseline)      │ │(ProjectTopologyLink, Baseline)│
└─────────────────────────────┘ └──────────────────┘ └────────────────────────────┘
```

The service queries existing Mongoose collections using read-only Lean queries (`.lean()`).

---

## 12. Document / Version Traceability

[PROPOSED DESIGN]
- Evaluates `REQ_DOCUMENT_EXISTENCE` and `REQ_VERSION_BINDING`.
- Checks `Document.status` and `DocumentVersion.checksum`.

---

## 13. Relationship Traceability

[PROPOSED DESIGN]
- Evaluates `REQ_RELATIONSHIP_VERIFICATION`.
- Queries `DocumentRelationship` records where `sourceDocumentId` or `targetDocumentId` matches target document.
- Verifies if relationships are marked `needsVerification === false` or covered by active verification tasks.

---

## 14. Change Traceability

[PROPOSED DESIGN]
- Evaluates `REQ_CHANGE_PROPOSAL_TRACE`.
- If `versionNumber > 1`, queries `IDocumentChangeProposal` where `targetDocumentId === documentId` and `acceptedAuthoritativeVersionId === versionId`.

---

## 15. Verification Traceability

[PROPOSED DESIGN]
- Evaluates `REQ_VERIFICATION_COMPLETION`.
- Queries `IVerificationPlan` and `IVerificationTask` for `triggerDocumentId === documentId` and `triggerVersion === versionTag`.

---

## 16. Evidence Traceability

[PROPOSED DESIGN]
- Reuses Phase 9 `EvidenceService`.
- Queries `DocumentEvidence` for `documentId` and `versionNumber`. Checks `validUntil > currentDate`.

---

## 17. Baseline Traceability

[PROPOSED DESIGN]
- Reuses Phase 12 `BaselineService`.
- Queries `IDocumentationBaseline` where `projectId` matches and `documentSnapshots.documentId === documentId` and `versionNumber === targetVersionNumber`.

---

## 18. Contract Traceability

[PROPOSED DESIGN]
- Reuses Phase 23 `SystemContractEvolutionService` contract parsing.
- If document is an API spec, parses `DocumentVersion.content` via `parseOpenApiSpecification`.
- Markdown prose returns `NOT_APPLICABLE` or `UNSUPPORTED_OR_MISSING_CONTRACT`.

---

## 19. Cross-Project Traceability

[PROPOSED DESIGN]
- Reuses Phase 14 `ProjectTopologyLink` and Phase 18 `SystemBaselineAlignmentService`.
- Enforces strict ACL: If requesting user lacks permission for a consumer project, that consumer project node is **100% omitted** from the traceability response prior to denominator/completeness calculation.

---

## 20. Phase Composition

Explicitly composes capabilities across earlier phases:
- **Phase 7.3**: Cascade impact calculation.
- **Phase 9**: Evidence validation.
- **Phase 11**: Verification plan task status.
- **Phase 12**: Baseline snapshot verification.
- **Phase 14**: Cross-project topology authorization & links.
- **Phase 15/17**: Change proposal & attestation lookup.
- **Phase 18**: Baseline alignment checks.
- **Phase 23**: OpenAPI contract spec parsing.

---

## 21. ACL / Privacy

[REPOSITORY FACT]
- Authorization is performed **before** derived analysis output is calculated.
- If a user requests a traceability audit for a document they cannot read: Returns HTTP 403 `FORBIDDEN`.
- If a document has cross-project relationships to projects the user cannot access: The unauthorized project nodes are completely excluded from response arrays and denominator counts without leaking IDs, titles, or counts.

---

## 22. API Specification

[PROPOSED DESIGN]

### Primary Endpoint:
`GET /api/v1/documents/:documentId/traceability-audit`

#### Query Parameters:
- `versionNumber` (optional `number`): Audit specific version (defaults to latest authoritative version).

#### Response DTO (`200 OK`):
```json
{
  "documentId": "650000000000000000000001",
  "versionNumber": 2,
  "status": "APPROVED",
  "traceabilityStatus": "INCOMPLETE",
  "completeness": {
    "satisfiedRequirementsCount": 5,
    "applicableRequirementsCount": 7,
    "completenessPercentage": 71.43,
    "indeterminateRequirementsCount": 1
  },
  "requirements": [
    {
      "requirementType": "REQ_DOCUMENT_EXISTENCE",
      "applicable": true,
      "status": "APPLICABLE_AND_PRESENT",
      "authoritativeSource": "Document",
      "linkedEntityId": "650000000000000000000001"
    },
    {
      "requirementType": "REQ_BASELINE_SNAPSHOT",
      "applicable": true,
      "status": "APPLICABLE_AND_MISSING",
      "authoritativeSource": "DocumentationBaseline",
      "gapType": "UNBASELINED_DOCUMENT_VERSION",
      "severity": "CRITICAL",
      "explanation": "Document version 2 is active but not bound in any active DocumentationBaseline."
    }
  ],
  "gaps": [
    {
      "gapType": "UNBASELINED_DOCUMENT_VERSION",
      "severity": "CRITICAL",
      "requirementType": "REQ_BASELINE_SNAPSHOT",
      "explanation": "Document version 2 is active but not bound in any active DocumentationBaseline.",
      "remediation": "Create a DocumentationBaseline snapshot incorporating document version 2."
    }
  ],
  "evaluatedAt": "2026-09-06T16:55:00.000Z"
}
```

---

## 23. Frontend Design

[PROPOSED DESIGN]
- **Component**: `TraceabilityAuditView.tsx` mounted inside document details / governance section.
- **UI Elements**:
  1. **Completeness Header**: Factual percentage badge ($71.43\%$), status indicator (`COMPLETE`, `INCOMPLETE`, `INDETERMINATE`).
  2. **8-Node Chain Diagram**: Visual horizontal/vertical workflow nodes showing presence/absence of each node in the chain.
  3. **Gap Alert List**: Grouped by severity (`CRITICAL`, `WARNING`, `INFO`) with clear explanation and remediation guidance.
  4. **Requirements Matrix**: Filterable table of all 8 requirements, applicability status, and underlying authoritative sources.

---

## 24. Determinism

[PROPOSED DESIGN]
- Factual rule evaluation guarantees byte-for-byte identical DTO output given identical database state.
- Requirement list and gap array are sorted deterministically by `requirementType` and `severity`.

---

## 25. Performance

- Uses Lean Mongoose queries (`.lean()`).
- Batches model lookups in parallel using `Promise.all`.
- Expected execution time: $< 20\text{ms}$ per audit request.

---

## 26. Persistence Decision

- **ZERO NEW PERSISTENCE (0 Mongoose Models)**.
- Derived analysis output is request-scoped and generated on demand.

---

## 27. Worker Decision

- **ZERO WORKERS (0 Cron / 0 Queues / 0 Async Workers)**.

---

## 28. Audit Behavior

- **ZERO AUDIT LOG WRITES** on GET requests.

---

## 29. Testing Strategy

Implement a dedicated QA runner (`run_phase24_qa.ts`) with a **dynamically calculated assertion count** (minimum 36 scenarios).

---

## 30. QA Matrix (Minimum 36 Scenarios)

[PROPOSED DESIGN]
1. `fully complete 8-node chain` $\rightarrow$ `completenessPercentage === 100%`.
2. `missing version` $\rightarrow$ `MISSING_VERSION` gap detected.
3. `missing relationship verification` $\rightarrow$ `MISSING_RELATIONSHIP_VERIFICATION` gap.
4. `missing change proposal trace` $\rightarrow$ `UNATTESTED_CHANGE_PROPOSAL` gap.
5. `missing verification task` $\rightarrow$ `UNFULFILLED_VERIFICATION_TASK` gap.
6. `missing evidence` $\rightarrow$ `MISSING_OR_EXPIRED_EVIDENCE` gap.
7. `missing baseline snapshot` $\rightarrow$ `UNBASELINED_DOCUMENT_VERSION` gap.
8. `missing contract spec` $\rightarrow$ `UNSUPPORTED_OR_MISSING_CONTRACT` gap.
9. `not-applicable contract spec` $\rightarrow$ Excluded from denominator.
10. `indeterminate applicability` $\rightarrow$ Included in denominator, excluded from numerator.
11. `indeterminate trace` $\rightarrow$ Reported cleanly with `INDETERMINATE`.
12. `factual completeness calculation` $\rightarrow$ Verifies exact $N_{\text{satisfied}} / N_{\text{applicable}}$ math.
13. `zero applicable requirements` $\rightarrow$ Returns `null` completeness ratio.
14. `CRITICAL severity classification` $\rightarrow$ Unbaselined cross-project document.
15. `WARNING severity classification` $\rightarrow$ Expired evidence.
16. `INFO severity classification` $\rightarrow$ Non-API contract note.
17. `multiple simultaneous gaps` $\rightarrow$ Sorted deterministically.
18. `deterministic requirement ordering` $\rightarrow$ Verified across runs.
19. `repeated-query determinism` $\rightarrow$ Byte-for-byte identical output.
20. `ACL isolation` $\rightarrow$ Authorized user succeeds.
21. `unauthorized document request` $\rightarrow$ HTTP 403 `FORBIDDEN`.
22. `cross-project dependency audit` $\rightarrow$ Evaluates cross-project links.
23. `cross-project ACL filtering` $\rightarrow$ Unauthorized consumer project 100% omitted.
24. `Phase 9 evidence composition` $\rightarrow$ Reuses EvidenceService.
25. `Phase 11 verification composition` $\rightarrow$ Reuses VerificationTask.
26. `Phase 12 baseline composition` $\rightarrow$ Reuses BaselineSnapshot.
27. `Phase 14 topology composition` $\rightarrow$ Reuses TopologyLinks.
28. `Phase 18 alignment composition` $\rightarrow$ Reuses Alignment check.
29. `Phase 23 contract composition` $\rightarrow$ Reuses OpenAPI parser.
30. `zero persistence verification` $\rightarrow$ Collections untouched.
31. `zero worker verification` $\rightarrow$ No async background queues.
32. `zero audit log write verification` $\rightarrow$ DocumentAudit untouched.
33. `no repair execution` $\rightarrow$ State remains unchanged.
34. `no task creation` $\rightarrow$ VerificationTask count unchanged.
35. `large graph bounds` $\rightarrow$ Response time $< 50\text{ms}$.
36. `dynamic QA assertion count verification` $\rightarrow$ Actual count matches expected.

---

## 31. Architectural Stress Test

| Vulnerability | Mitigation |
| :--- | :--- |
| **Applicability Ambiguity** | Use explicit factual field rules; evaluate to `INDETERMINATE` if ambiguous. |
| **Arbitrary Completeness Weights** | Enforce pure ratio $N_{\text{satisfied}} / N_{\text{applicable}}$ with zero heuristic multipliers. |
| **Duplicate Traceability Graph** | No graph storage; derive chain dynamically on request. |
| **ACL Side-Channel Leakage** | Filter unauthorized project nodes **before** calculating requirements/denominators. |
| **Prose Treated as Contract** | Reuse Phase 23 OpenAPI parser; markdown prose yields `UNSUPPORTED_OR_MISSING_CONTRACT`. |
| **Repair / Workflow Scope Drift** | Read-only analysis engine; zero write endpoints or repair execution. |

---

## 32. Security Review

- Authorizes project access via existing `auth.middleware.ts` and `authorization.middleware.ts`.
- Omits 100% of unauthorized nodes prior to DTO serialization.

---

## 33. Open Questions

1. *Should the UI allow filtering requirements by chain node type (e.g. show only Baseline & Evidence nodes)?*
   $\rightarrow$ **Recommendation**: Yes, provide tab filters in `TraceabilityAuditView.tsx` (`All`, `Gaps Only`, `Baselines`, `Evidence`).

---

## 34. Implementation Sequence

1. **Step 1**: Define TypeScript interfaces (`system-traceability-audit.types.ts`).
2. **Step 2**: Implement core audit service (`system-traceability-audit.service.ts`).
3. **Step 3**: Implement controller & route (`system-traceability-audit.controller.ts`, `system-traceability-audit.routes.ts`).
4. **Step 4**: Implement automated unit tests (`system-traceability-audit.test.ts`) and QA matrix runner (`run_phase24_qa.ts`).
5. **Step 5**: Implement frontend API client & UI (`system-traceability-audit.api.ts`, `TraceabilityAuditView.tsx`).

---

## 35. Verification Plan

- `pnpm --filter api typecheck`
- `pnpm lint`
- `pnpm --filter web build`
- `pnpm test` (Vitest)
- Execute `run_phase24_qa.ts` + regression runners for Phases 10, 14, 17, 18, 19, 20, 21, 22, 23.
- `git diff --check` & `git status`.

---

## 36. Acceptance Criteria

1. Traceability audit is 100% derived and read-only.
2. Zero new database models (persistence = 0).
3. Zero background workers.
4. Zero audit log writes on GET queries.
5. Factual completeness percentage $N_{\text{satisfied}} / N_{\text{applicable}}$ enforced.
6. `NOT_APPLICABLE` excluded from denominator.
7. Phase 14 ACL pre-filtering enforced.
8. Dynamic QA matrix runner passes all 36+ scenarios.
9. STOP before merge/push for final user review.
