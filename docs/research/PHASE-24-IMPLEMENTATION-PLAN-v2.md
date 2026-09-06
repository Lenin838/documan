# Phase 24 Implementation Plan v2

> **Approved Research Plan**: [`docs/research/PHASE-24-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-24-RESEARCH.md)
> **Plan v1 Reference**: [`docs/research/PHASE-24-IMPLEMENTATION-PLAN-v1.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-24-IMPLEMENTATION-PLAN-v1.md)
> **Plan Status**: PLAN ONLY — No code implementation, no model creation, no routes, no UI components, no feature branch, no git commits/merges/pushes until explicit authorization.

---

## 1. Executive Summary

Documan has established a comprehensive document-management platform across Phases 1–23, featuring single-project assurance, multi-document change packages, cross-project topology graphs, system release gates, policy waivers, what-if simulations, historical lineage timelines, and structural contract evolution diffing.

Phase 24 introduces the **End-to-End Document Traceability Completeness & Gap Audit Engine**. It delivers a read-only, request-scoped diagnostic service (`traceability-audit.service.ts`) and interactive audit UI (`TraceabilityAuditView.tsx`) that inspects the conditional traceability requirement graph of a specific `DocumentVersion`, evaluates deterministic applicability rules, computes factual completeness metrics ($N_{\text{satisfied}} / N_{\text{applicable}}$), identifies 7 structured gap types mapped directly to authoritative repository fields, and provides actionable remediation guidance without mutating database state.

---

## 2. Research Basis

[REPOSITORY FACT]
This implementation plan builds upon the approved research document [`docs/research/PHASE-24-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/PHASE-24-RESEARCH.md) and addresses all three architectural corrections requested in Plan v2 review:
1. **Correction 1**: Refined gap taxonomy strictly grounded in authoritative repository models (`DocumentVersion`, `DocumentRelationship`, `IDocumentChangeProposal`, `IVerificationPlan`, `IVerificationTask`, `DocumentEvidence`, `IDocumentationBaseline`, `ProjectApiSpec`).
2. **Correction 2**: Unambiguous audit subject definition centered on a specific `DocumentVersion` (defaulting to the latest active version or a requested historical version).
3. **Correction 3**: Conditional traceability requirement graph rooted in `DocumentVersion` rather than an unconditional linear chain.

---

## 3. Repository Evidence

[REPOSITORY FACT]
Inspected authoritative Mongoose models and services in `@documan/api`:
- `Document`: `projectId`, `title`, `fileType`, `status` (`DRAFT`, `APPROVED`, `DEPRECATED`), `stewardId`, `isDeleted`.
- `DocumentVersion`: `documentId`, `versionNumber`, `content`, `checksum`, `createdBy`, `createdAt`.
- `DocumentRelationship`: `sourceDocumentId`, `targetDocumentId`, `type` (`API_CONTRACT`, `DEPENDS_ON`, `IMPLEMENTS`, `DOCUMENTED_BY`), `isCrossProject`, `needsVerification`.
- `IDocumentChangeProposal`: `targetDocumentId`, `proposalType`, `status` (`ACCEPTED`), `acceptedAuthoritativeVersionId`.
- `IVerificationPlan` & `IVerificationTask`: `triggerDocumentId`, `targetDocumentId`, `triggerVersion`, `status` (`VERIFIED`), `evidenceReferenceId`.
- `DocumentEvidence`: `documentId`, `versionNumber`, `evidenceType`, `validUntil`.
- `IDocumentationBaseline`: `projectId`, `versionTag`, `isActive`, `documentSnapshots` (`documentId`, `versionNumber`, `checksum`).
- `ProjectApiSpec`: `projectId`, `documentId`, `endpoints`.
- `ProjectTopologyLink`: `sourceProjectId`, `targetProjectId`, `type: 'DEPENDS_ON'`.

---

## 4. Product Gap

[INFERENCE]
Today, Documan stores traceability artifacts across separate database collections, but provides no unified diagnostic to verify that a given `DocumentVersion` has a complete, unbroken chain of custody. A user must manually cross-reference multiple screens to discover whether a document version lacks baseline snapshot bindings, unverified change proposals, unfulfilled verification tasks, expired evidence, or unaligned cross-project contracts.

Phase 24 fills this gap by delivering a request-scoped, derived traceability completeness audit.

---

## 5. Exact Audit Subject

[PROPOSED DESIGN]
The **primary audit subject** of Phase 24 is an explicit, immutable **`DocumentVersion`**.

```text
Document (Parent Entity)
  ↓
selected authoritative DocumentVersion (Primary Audit Subject)
  ↓
conditional traceability requirement graph
  ↓
derived request-scoped audit output
```

### Unambiguous Audit Subject Rules:
1. **Target**: The audit is always executed against a specific `DocumentVersion` instance ($D_{id}, V_{\text{number}}$).
2. **Version Selection**:
   - If the request specifies `versionNumber` parameter $\rightarrow$ audit that exact `versionNumber` of the specified `Document`.
   - If `versionNumber` parameter is omitted $\rightarrow$ audit the **latest active authoritative version** (highest `versionNumber` where `isDeleted !== true`).
3. **Historical Versions**: Callers can explicitly audit historical versions (e.g. `versionNumber=1`).
4. **Deleted / Soft-Deleted Versions**: If the specified version or parent document is soft-deleted or non-existent $\rightarrow$ return bounded HTTP 404 `VERSION_NOT_FOUND` / `MISSING_VERSION` gap.
5. **Baseline Comparison**: The audit compares the *selected* `DocumentVersion.versionNumber` against the baseline snapshot `versionNumber` stored in `IDocumentationBaseline.documentSnapshots`. If the active baseline contains version 1 and the selected version is 2, the baseline requirement for version 2 evaluates to `APPLICABLE_AND_MISSING` (`UNBASELINED_DOCUMENT_VERSION`). Current-state contamination is prevented because the audit checks exact version equality ($V_{\text{selected}} == V_{\text{baseline\_snapshot}}$).

---

## 6. Version Selection Semantics

[PROPOSED DESIGN]

```text
                                  GET /documents/:documentId/traceability-audit?versionNumber=2
                                                             │
                                   ┌─────────────────────────┴─────────────────────────┐
                                   ▼                                                   ▼
                       versionNumber provided?                             versionNumber omitted?
                                   │                                                   │
                  Fetch DocumentVersion(documentId, versionNumber)     Fetch Latest Active DocumentVersion
                                   │                                                   │
                                   └─────────────────────────┬─────────────────────────┘
                                                             │
                                               Validate Version Exists & Not Deleted
                                                             │
                                               Execute Derived Traceability Audit
```

---

## 7. Traceability Requirement Graph

[PROPOSED DESIGN]
Rather than an unconditional linear chain, Phase 24 models traceability as a **conditional requirement graph** rooted in the selected `DocumentVersion`:

```text
DocumentVersion (Primary Audit Subject)
│
├── Applicable Relationship Requirements (DocumentRelationship)
│
├── Applicable Change Requirements (IDocumentChangeProposal)
│      │
│      └── Applicable Verification Requirements (IVerificationPlan / IVerificationTask)
│              │
│              └── Applicable Evidence Requirements (DocumentEvidence / EvidenceService)
│
├── Applicable Baseline Requirement (IDocumentationBaseline / IDocumentSnapshot)
│
└── Applicable Contract Requirement (ProjectApiSpec / OpenAPI Schema)
        │
        └── Applicable Cross-Project Alignment (ProjectTopologyLink / SystemBaselineAlignmentService)
```

Each branch of the graph is evaluated conditionally based on factual repository fields.

---

## 8. Applicability Rules

[PROPOSED DESIGN]
Applicability is evaluated deterministically using authoritative fields (zero prose or text-similarity guessing):

| Requirement Branch | Deterministic Applicability Condition | Authoritative Repository Field |
| :--- | :--- | :--- |
| **Document Existence** | Always `APPLICABLE` | `Document._id` exists and `isDeleted !== true` |
| **Version Binding** | Always `APPLICABLE` | `DocumentVersion._id` exists for selected `versionNumber` |
| **Relationship** | `APPLICABLE` when `DocumentRelationship` records exist where `sourceDocumentId` or `targetDocumentId` matches `Document._id` | `DocumentRelationship.sourceDocumentId` / `targetDocumentId` |
| **Change Trace** | `APPLICABLE` when `DocumentVersion.versionNumber > 1` (post-initial creation bump) | `DocumentVersion.versionNumber > 1` |
| **Verification Trace** | `APPLICABLE` when `IVerificationPlan` exists for trigger version OR `DocumentRelationship.needsVerification === true` | `IVerificationPlan.triggerDocumentId` or `DocumentRelationship.needsVerification` |
| **Evidence Trace** | `APPLICABLE` when `Document.status === 'APPROVED'` OR linked `IVerificationTask.verificationMethod === 'EVIDENCE_RENEWAL'` | `Document.status` or `IVerificationTask.verificationMethod` |
| **Baseline Snapshot** | `APPLICABLE` when project has an active `IDocumentationBaseline` OR document participates in cross-project topology | `IDocumentationBaseline.isActive === true` |
| **Contract Spec** | `APPLICABLE` when `ProjectApiSpec` exists for document OR `DocumentVersion.content` contains structured OpenAPI JSON/YAML | `ProjectApiSpec.documentId` or OpenAPI spec parser |

---

## 9. Requirement Types

[PROPOSED DESIGN]
The engine evaluates 8 standard requirement types for the selected `DocumentVersion`:

1. `REQ_DOCUMENT_EXISTENCE`: Root document record exists and is active.
2. `REQ_VERSION_BINDING`: Selected `DocumentVersion` exists with non-empty content checksum.
3. `REQ_RELATIONSHIP_VERIFICATION`: Active `DocumentRelationship` records are verified (`needsVerification === false`).
4. `REQ_CHANGE_TRACE`: Post-v1 `DocumentVersion` is linked to an `ACCEPTED` `IDocumentChangeProposal`.
5. `REQ_VERIFICATION_FULFILLMENT`: Triggered `IVerificationTask` records are in `VERIFIED` state.
6. `REQ_EVIDENCE_ATTACHMENT`: Valid, non-expired `DocumentEvidence` is attached (`validUntil > currentDate`).
7. `REQ_BASELINE_SNAPSHOT`: Selected `DocumentVersion` is snapshot-bound in an active `IDocumentationBaseline`.
8. `REQ_CONTRACT_SPECIFICATION`: API contract specs (if applicable) parse cleanly as valid OpenAPI structures.

---

## 10. Gap Taxonomy

[PROPOSED DESIGN]
Refined gap taxonomy mapped 1-to-1 with authoritative repository models:

| Gap Type | Authoritative Source | Authoritative Field | Missing Condition | Severity |
| :--- | :--- | :--- | :--- | :--- |
| `MISSING_VERSION` | `DocumentVersion` | `versionNumber` | Requested `versionNumber` record does not exist | `CRITICAL` |
| `MISSING_RELATIONSHIP` | `DocumentRelationship` | `needsVerification` | Relationship exists but `needsVerification === true` | `WARNING` |
| `MISSING_CHANGE_TRACE` | `IDocumentChangeProposal` | `acceptedAuthoritativeVersionId` | Version > 1 has no linked `ACCEPTED` proposal | `WARNING` |
| `MISSING_VERIFICATION_FULFILLMENT` | `IVerificationTask` | `status` | Verification task exists in `OPEN`, `IN_REVIEW`, or `SKIPPED` state | `CRITICAL` |
| `MISSING_OR_EXPIRED_EVIDENCE` | `DocumentEvidence` | `validUntil` | Evidence missing or `validUntil < currentDate` | `WARNING` |
| `UNBASELINED_DOCUMENT_VERSION` | `IDocumentationBaseline` | `documentSnapshots` | Selected version is missing from active baseline snapshots | `CRITICAL` (if cross-project) / `WARNING` |
| `UNSUPPORTED_OR_MISSING_CONTRACT` | `ProjectApiSpec` | `content` | API spec content is missing or unparseable markdown prose | `INFO` / `WARNING` |

---

## 11. Severity Model

[PROPOSED DESIGN]
Each identified gap is assigned a deterministic severity based on governance risk:
- `CRITICAL`: `MISSING_VERSION`, `MISSING_VERIFICATION_FULFILLMENT` (on breaking changes), `UNBASELINED_DOCUMENT_VERSION` (with cross-project consumers).
- `WARNING`: `MISSING_RELATIONSHIP`, `MISSING_CHANGE_TRACE`, `MISSING_OR_EXPIRED_EVIDENCE`, `UNBASELINED_DOCUMENT_VERSION` (internal).
- `INFO`: `UNSUPPORTED_OR_MISSING_CONTRACT` (non-API document notes).

Severity is purely informational and **does NOT alter** the factual completeness calculation.

---

## 12. Completeness Semantics

[PROPOSED DESIGN]
Documan enforces a **pure, factual ratio metric**:

$$N_{\text{applicable}} = N_{\text{present}} + N_{\text{missing}} + N_{\text{indeterminate}}$$

$$\text{Completeness Percentage} = \left( \frac{N_{\text{satisfied}}}{N_{\text{applicable}}} \right) \times 100\%$$

### Handling Requirements:
- `NOT_APPLICABLE`: **Excluded** from both numerator ($N_{\text{satisfied}}$) and denominator ($N_{\text{applicable}}$).
- `APPLICABLE_AND_PRESENT`: Included in numerator ($+1$) and denominator ($+1$).
- `APPLICABLE_AND_MISSING`: Included in denominator ($+1$), excluded from numerator ($+0$). Creates an explicit gap entry.
- `APPLICABLE_BUT_INDETERMINATE`: Included in denominator ($+1$), excluded from numerator ($+0$). **Product Justification**: An indeterminate requirement represents incomplete evidence and cannot be counted as satisfied. However, it is explicitly reported as `INDETERMINATE` in the DTO rather than silently converted into a missing gap.
- $N_{\text{applicable}} == 0$: Completeness percentage returns `null` (rendered as `N/A - Zero Applicable Requirements`).

---

## 13. Authoritative Source Mapping

[REPOSITORY FACT]

| Requirement Type | Authoritative Model / Service | Applicability Rule | Present Condition | Missing Condition | Indeterminate Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ_DOCUMENT_EXISTENCE` | `Document` | Always applicable | `Document._id` exists & `isDeleted !== true` | Document not found or `isDeleted === true` | Document store unreachable |
| `REQ_VERSION_BINDING` | `DocumentVersion` | Always applicable | `DocumentVersion._id` exists & `checksum` present | `versionNumber` not found | Version checksum corrupted |
| `REQ_RELATIONSHIP_VERIFICATION` | `DocumentRelationship` | Relationships exist | All linked relationships have `needsVerification === false` | At least 1 relationship has `needsVerification === true` | Relationship target project unauthorized |
| `REQ_CHANGE_TRACE` | `IDocumentChangeProposal` | `versionNumber > 1` | Linked `IDocumentChangeProposal` exists with `status === 'ACCEPTED'` | No accepted proposal linked to `acceptedAuthoritativeVersionId` | Proposal history un-reconstructable |
| `REQ_VERIFICATION_FULFILLMENT` | `IVerificationTask` | Verification plan exists | All tasks for version have `status === 'VERIFIED'` | Tasks exist in `OPEN`, `IN_REVIEW`, or `SKIPPED` state | Task plan in `PENDING` state |
| `REQ_EVIDENCE_ATTACHMENT` | `DocumentEvidence` | Document `APPROVED` | Valid `DocumentEvidence` exists with `validUntil > currentDate` | Evidence record missing or `validUntil < currentDate` | Evidence checksum unverified |
| `REQ_BASELINE_SNAPSHOT` | `IDocumentationBaseline` | Active baseline exists | Active `IDocumentationBaseline.documentSnapshots` contains `(documentId, selectedVersionNumber)` | Selected `versionNumber` missing from baseline snapshot | Baseline archived or locked |
| `REQ_CONTRACT_SPECIFICATION` | `ProjectApiSpec` | API Spec doc | Content parses as valid OpenAPI schema | Content is plain prose or returns `UNSUPPORTED_CONTRACT_STRUCTURE` | Spec schema version unsupported |

---

## 14. Document / Version Traceability

[PROPOSED DESIGN]
- Primary audit subject: `DocumentVersion`.
- Validates parent `Document` state and `DocumentVersion.checksum`.

---

## 15. Relationship Traceability

[PROPOSED DESIGN]
- Queries `DocumentRelationship` for `sourceDocumentId` or `targetDocumentId` matching `Document._id`.
- Evaluates `needsVerification` property for each relationship edge.

---

## 16. Change Traceability

[PROPOSED DESIGN]
- Proves exact connection between `DocumentVersion` and `IDocumentChangeProposal`:
  - `IDocumentChangeProposal.targetDocumentId === documentId` AND `acceptedAuthoritativeVersionId === versionId`.
  - Timestamps, titles, or fuzzy text matching are strictly forbidden.

---

## 17. Verification Traceability

[PROPOSED DESIGN]
- Reuses Phase 11 `IVerificationPlan` and `IVerificationTask` semantics:
  - `IVerificationPlan.triggerDocumentId === documentId` AND `triggerVersion === selectedVersionNumber`.
  - Unrelated verification tasks are ignored.

---

## 18. Evidence Traceability

[PROPOSED DESIGN]
- Reuses Phase 9 `DocumentEvidence` models and `EvidenceService`:
  - `DocumentEvidence.documentId === documentId` AND `versionNumber === selectedVersionNumber`.
  - Expiration check: `validUntil > currentDate`.

---

## 19. Baseline Traceability

[PROPOSED DESIGN]
- Reuses Phase 12 `IDocumentationBaseline`:
  - Checks active baseline (`isActive === true`) for `documentSnapshots` matching `(documentId, selectedVersionNumber)`.
  - Current baseline is never substituted as historical proof for older versions.

---

## 20. Contract Traceability

[PROPOSED DESIGN]
- Reuses Phase 23 `SystemContractEvolutionService` contract parsing:
  - Structured OpenAPI specs parse cleanly $\rightarrow$ `APPLICABLE_AND_PRESENT`.
  - Plain markdown prose $\rightarrow$ `UNSUPPORTED_OR_MISSING_CONTRACT`.
  - Zero AI/LLM semantic inference.

---

## 21. Cross-Project Traceability

[PROPOSED DESIGN]
- Reuses Phase 14 `ProjectTopologyLink` and Phase 18 `SystemBaselineAlignmentService`.
- Enforces strict ACL: Authorization occurs **before** traversal.
- If a user lacks permission for a cross-project consumer: That consumer node is **100% omitted** from response arrays, denominators, and completeness calculations without side-channel data leakage.

---

## 22. Phase Composition

Explicit phase composition justification:
- **Phase 7.3** (Impact Cascade) $\rightarrow$ Context for relationship verification requirements.
- **Phase 9** (Evidence) $\rightarrow$ Authoritative evidence freshness check.
- **Phase 11** (Verification) $\rightarrow$ Authoritative task fulfillment check.
- **Phase 12** (Baseline) $\rightarrow$ Authoritative baseline snapshot check.
- **Phase 14** (Topology & ACL) $\rightarrow$ Cross-project graph isolation & permission boundaries.
- **Phase 15/17** (Proposals & Attestations) $\rightarrow$ Change trace verification.
- **Phase 18** (Alignment) $\rightarrow$ Cross-project baseline alignment context.
- **Phase 23** (Contract Spec) $\rightarrow$ OpenAPI spec parsing authority.

Excluded: Phase 8 (Knowledge Discovery), Phase 10 (Single Gate), Phase 13 (Work Requests), Phase 16 (Packages), Phase 19 (System Gate), Phase 20 (Waivers), Phase 21 (Simulations), Phase 22 (Timelines) — these operate on gate release status rather than document traceability completeness.

---

## 23. ACL / Privacy

[REPOSITORY FACT]
- Authorization checks execute **before** derived analysis output is calculated.
- Direct request for unauthorized document returns HTTP 403 `FORBIDDEN`.
- Unauthorized cross-project dependencies are omitted completely prior to calculation.

---

## 24. API Design

[PROPOSED DESIGN]

### Primary Endpoint:
`GET /api/v1/documents/:documentId/traceability-audit`

#### Query Parameters:
- `versionNumber` (optional `number`): Audit specific version (defaults to latest active version).

#### Response DTO (`200 OK`):
```json
{
  "documentId": "650000000000000000000001",
  "selectedVersionNumber": 2,
  "selectedVersionId": "650000000000000000000002",
  "documentStatus": "APPROVED",
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
  "evaluatedAt": "2026-09-06T16:57:00.000Z"
}
```

---

## 25. Frontend Design

[PROPOSED DESIGN]
- **Component**: `TraceabilityAuditView.tsx` mounted in Document Details / Governance Section.
- **UI Elements**:
  1. **Completeness Header**: Factual percentage badge ($71.43\%$), status indicator (`COMPLETE`, `INCOMPLETE`, `INDETERMINATE`).
  2. **Audit Subject Selector**: Dropdown to switch between document versions ($v_1, v_2$).
  3. **Conditional Graph Diagram**: Node-based diagram rendering requirements branch status.
  4. **Gap Alert List**: Grouped by severity (`CRITICAL`, `WARNING`, `INFO`) with remediation steps.

---

## 26. Determinism

[PROPOSED DESIGN]
- Identical repository state produces byte-for-byte identical DTO output.
- Requirements and gaps are sorted deterministically by `requirementType` and `severity`.

---

## 27. Performance

- Lean Mongoose queries (`.lean()`).
- Parallel batch lookups using `Promise.all`.
- Traversal bounds: max 50 relationships, max 20 tasks per plan.
- Execution target: $< 20\text{ms}$.

---

## 28. Persistence

- **ZERO NEW PERSISTENCE (0 Mongoose Models)**.
- Request-scoped derived output.

---

## 29. Workers

- **ZERO WORKERS (0 Cron / 0 Queues / 0 Async Workers)**.

---

## 30. Audit Behavior

- **ZERO AUDIT LOG WRITES** on GET requests.

---

## 31. QA Strategy

Implement a dedicated QA runner (`run_phase24_qa.ts`) with a **dynamically calculated assertion count** (minimum 36 scenarios).

---

## 32. QA Matrix (Minimum 36 Scenarios)

[PROPOSED DESIGN]
1. `complete traceability chain` $\rightarrow$ `completenessPercentage === 100%`.
2. `missing version requested` $\rightarrow$ Returns 404 / `MISSING_VERSION` gap.
3. `missing relationship verification` $\rightarrow$ `MISSING_RELATIONSHIP` gap.
4. `missing change trace` $\rightarrow$ `MISSING_CHANGE_TRACE` gap.
5. `unfulfilled verification task` $\rightarrow$ `MISSING_VERIFICATION_FULFILLMENT` gap.
6. `missing evidence` $\rightarrow$ `MISSING_OR_EXPIRED_EVIDENCE` gap.
7. `unbaselined version` $\rightarrow$ `UNBASELINED_DOCUMENT_VERSION` gap.
8. `unsupported contract` $\rightarrow$ `UNSUPPORTED_OR_MISSING_CONTRACT` gap.
9. `not-applicable contract` $\rightarrow$ Excluded from denominator.
10. `indeterminate applicability` $\rightarrow$ Included in denominator, excluded from numerator.
11. `indeterminate trace` $\rightarrow$ Reported cleanly as `INDETERMINATE`.
12. `factual completeness math` $\rightarrow$ Verifies exact $N_{\text{satisfied}} / N_{\text{applicable}}$.
13. `zero applicable requirements` $\rightarrow$ Returns `null` completeness ratio.
14. `CRITICAL severity` $\rightarrow$ Unbaselined cross-project document.
15. `WARNING severity` $\rightarrow$ Expired evidence.
16. `INFO severity` $\rightarrow$ Non-API contract note.
17. `multiple gaps` $\rightarrow$ Sorted deterministically.
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
30. `zero persistence verification` $\rightarrow$ Database collections untouched.
31. `zero worker verification` $\rightarrow$ No async background queues.
32. `zero audit log write verification` $\rightarrow$ DocumentAudit untouched.
33. `no repair execution` $\rightarrow$ Database state remains unchanged.
34. `no task creation` $\rightarrow$ Task counts unchanged.
35. `large graph bounds` $\rightarrow$ Response time $< 50\text{ms}$.
36. `dynamic QA assertion count verification` $\rightarrow$ Actual count matches expected.

---

## 33. Architectural Stress Test

| Vulnerability | Mitigation |
| :--- | :--- |
| **Applicability Ambiguity** | Use explicit factual field rules; evaluate to `INDETERMINATE` if ambiguous. |
| **Version Selection Ambiguity** | Audit target is explicitly bound to `DocumentVersion`; default to latest active version if un-specified. |
| **Historical Contamination** | Compare selected version number against baseline snapshot version number; today's baseline is never substituted for historical audits. |
| **Arbitrary Completeness Weights** | Enforce pure ratio $N_{\text{satisfied}} / N_{\text{applicable}}$ with zero heuristic multipliers. |
| **Duplicate Traceability Graph** | Zero graph persistence; derive conditional graph dynamically on request. |
| **ACL Side-Channel Leakage** | Filter unauthorized project nodes **before** calculating requirements/denominators. |
| **Prose Treated as Contract** | Reuse Phase 23 OpenAPI parser; markdown prose yields `UNSUPPORTED_OR_MISSING_CONTRACT`. |
| **Repair / Workflow Scope Drift** | Read-only analysis engine; zero write endpoints or repair execution. |

---

## 34. Security Review

- Authorizes project access via existing `auth.middleware.ts` and `authorization.middleware.ts`.
- Omits 100% of unauthorized nodes prior to DTO serialization.

---

## 35. Open Questions

1. *Should the UI allow filtering requirements by graph branch (e.g. show only Baseline & Evidence branches)?*
   $\rightarrow$ **Recommendation**: Yes, provide tab filters in `TraceabilityAuditView.tsx` (`All`, `Gaps Only`, `Baselines`, `Evidence`).

---

## 36. Implementation Sequence

1. **Step 1**: Define TypeScript DTOs (`system-traceability-audit.types.ts`).
2. **Step 2**: Implement core audit service (`system-traceability-audit.service.ts`).
3. **Step 3**: Implement controller & route (`system-traceability-audit.controller.ts`, `system-traceability-audit.routes.ts`).
4. **Step 4**: Implement automated unit tests (`system-traceability-audit.test.ts`) and QA matrix runner (`run_phase24_qa.ts`).
5. **Step 5**: Implement frontend API client & UI (`system-traceability-audit.api.ts`, `TraceabilityAuditView.tsx`).

---

## 37. Verification Plan

- `pnpm --filter api typecheck`
- `pnpm lint`
- `pnpm --filter web build`
- `pnpm test` (Vitest)
- Execute `run_phase24_qa.ts` + regression runners for Phases 10, 14, 17, 18, 19, 20, 21, 22, 23.
- `git diff --check` & `git status`.

---

## 38. Acceptance Criteria

1. Traceability audit is 100% derived and read-only.
2. Audit primary subject is explicitly `DocumentVersion`.
3. Zero new database models (persistence = 0).
4. Zero background workers.
5. Zero audit log writes on GET queries.
6. Factual completeness percentage $N_{\text{satisfied}} / N_{\text{applicable}}$ enforced.
7. `NOT_APPLICABLE` excluded from denominator.
8. Phase 14 ACL pre-filtering enforced.
9. Dynamic QA matrix runner passes all 36+ scenarios.
10. STOP before merge/push for final user review.
