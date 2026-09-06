# Phase 23 Research — Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer

## 1. Executive Summary

Phase 22 successfully delivered the **System Topology Governance State Lineage & Longitudinal Timeline Engine**, enabling historical point-in-time governance reconstruction (`evaluateSystemGateAt`), permission-safe timeline generation (`generateSystemGovernanceTimeline`), state transition diffing (`calculateGovernanceStateDiff`), and explicit causality classification with zero database persistence and zero background workers.

With Phases 19–22 completing system-level governance evaluation, waiver lifecycle management, pre-release simulation, and historical state lineage, Documan has achieved a mature system-wide governance foundation. However, deep repository analysis reveals a critical unanswered operational question at the boundary between **Cross-Project Topology (Phase 14)**, **Authoritative Baselines (Phase 12)**, and **Baseline Contract Alignment (Phase 18)**:

> **When a provider project advances its authoritative documentation baseline (e.g. from v1.0 to v2.0), causing downstream consumer projects to evaluate as `CONTRACT_MISALIGNED`, what exact structural contract deltas occurred between those baseline versions, what is the topological blast radius across consumer documents, and what is the optimal, dependency-ordered sequence for consumer document realignment?**

Today, Phase 18 detects binary misalignment (`MISALIGNED`), but offers **zero insight** into the breaking change scope, document-level contract diffs, or realignment priority. Authors and System Lead Engineers are left to manually compare multi-document baselines across project boundaries to understand why a baseline bump broke contract alignment.

This research evaluates 5 distinct product-level candidates across multiple domains (Contract Evolution, Verification Intelligence, Knowledge Authority Decay, Change Proposal Decision Support, and Document Lifecycle Health). Based on rigorous scoring across 11 criteria, **Candidate 1: Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer** is identified as the single strongest, most urgent, and architecturally aligned candidate for Phase 23.

---

## 2. Current Architecture

Documan's current governance and cross-project architecture consists of a highly composed, read-only analytical stack built on top of immutable MongoDB domain records:

1. **Phase 12 (Authoritative Baselines)**: `DocumentationBaseline` records immutable snapshots of document versions for a project (`DocumentVersion` bindings + checksums).
2. **Phase 14 (System Topology & ACL)**: `ProjectTopologyLink` models directional cross-project dependencies (`DEPENDS_ON`, `PROVIDES_TO`). `DocumentRelationship` records document-level cross-project references. Phase 14 ACL rules guarantee that users only see graph nodes/edges for which they have explicit read permissions.
3. **Phase 17 (Package Fulfillment Attestations)**: `PackageFulfillmentAttestation` records immutable proof that change packages fulfilled promised documentation items for baseline inclusion.
4. **Phase 18 (Cross-Project Baseline Contract Alignment)**: `system-baseline-alignment.service.ts` inspects consumer document references against active provider baseline snapshots, yielding unit alignment states (`ALIGNED`, `MISALIGNED`, `INDETERMINATE`).
5. **Phase 19 (Cross-Project System Governance Gate)**: `system-topology-governance-gate.service.ts` evaluates system release readiness across local gates, baseline presence, attestation validity, and baseline contract alignment.
6. **Phase 20 (System Governance Waivers)**: `system-governance-waiver.service.ts` manages policy exception waivers bound to specific blockers, provider projects, and target documents.
7. **Phase 21 (Pre-Release What-If Simulation)**: `system-topology-simulation.service.ts` evaluates candidate overlay states (hypothetical baseline bumps, attestations, waivers, topology links) in-memory without database mutations.
8. **Phase 22 (Governance Lineage & Timeline Engine)**: `system-governance-lineage.service.ts` reconstructs point-in-time gate evaluations at timestamp $T$ and builds longitudinal timelines over window $[T_1, T_2]$.

---

## 3. Current Capability Map

| Domain | Phase | Capability Delivered | Source of Truth |
| :--- | :--- | :--- | :--- |
| **Documents & Versioning** | 3, 4 | Document creation, version history, audit trail | `Document`, `DocumentVersion`, `DocumentAudit` |
| **Api Spec Drift** | 7.1, 7.2 | OpenAPI schema linkage & drift calculation | `ApiSpec`, `DocumentReference` |
| **Impact Cascade** | 7.3 | Multi-level document dependency impact cascade | `DocumentRelationship` |
| **Knowledge Risk** | 7.5 | Knowledge health radar & risk scoring | `KnowledgeRisk` |
| **Technical Knowledge** | 8 | Knowledge Item extraction & authority scoring | `TechnicalKnowledge` |
| **Evidence & Coverage** | 9 | Evidence collection & coverage calculation | `Evidence` |
| **Assurance & Gates** | 10 | Local document assurance & release gate evaluation | `Assurance` |
| **Verification Planning** | 11 | Automated verification tasks & plan generation | `VerificationPlan`, `VerificationTask` |
| **Authoritative Baselines** | 12 | Immutable project baseline snapshots & baseline drift | `DocumentationBaseline` |
| **Work Requests & Review** | 13 | Documentation work requests & review workflows | `DocumentationWorkRequest` |
| **System Topology & ACL** | 14 | Directional project links & cross-project ACL isolation | `ProjectTopologyLink` |
| **Pre-Change Simulation** | 15, 16 | Single & multi-document change proposal simulation | `ChangeProposal`, `ChangePackage` |
| **Fulfillment Attestations**| 17 | Immutable package fulfillment attestation | `PackageFulfillmentAttestation` |
| **Baseline Alignment** | 18 | Cross-project baseline contract alignment check | Derived from Baseline + Topology |
| **System Governance Gate** | 19 | System-wide release gate evaluation engine | Derived from Local Gate + Alignment |
| **Governance Waivers** | 20 | Exception waiver lifecycle management | `SystemGovernanceWaiver` |
| **What-If Simulation** | 21 | In-memory candidate overlay gate analyzer | Pure derived calculation |
| **Governance Lineage** | 22 | Historical gate reconstruction & timeline engine | Derived from Audit + Baselines + Waivers |

---

## 4. Important Unanswered Questions

Despite these extensive capabilities, Documan **STILL CANNOT** answer the following critical operational questions:

1. **Contract Delta Question**: When a provider baseline advances from v1.0 to v2.0, *what exact document versions changed*, *which specific API endpoints or structural sections were modified*, and *how do those deltas map to consumer document references*?
2. **Realignment Sequence Question**: If a provider baseline update causes 12 consumer documents across 4 downstream projects to become `MISALIGNED`, *what is the dependency-ordered sequence* to update consumer document references to restore system gate pass status with minimal churn?
3. **Contract Breaking Risk Tiering Question**: Is a provider baseline bump a minor non-breaking update (e.g. documentation typo/formatting) or a critical breaking structural contract change (e.g. deprecated endpoint or removed schema section)?
4. **Verification Effectiveness Question**: Which specific verification tasks or check types repeatedly fail across change packages, and what is the average verification resolution latency?
5. **Knowledge Authority Decay Question**: As documents advance through new versions and baselines, which extracted technical knowledge items have lost their underlying evidence backing?

---

## 5. Product Gap Analysis

### Gap 1: Cross-Project Contract Delta Visibility (Selected Focus)
- **User Problem**: Lead engineers see `CONTRACT_MISALIGNED` on their system release gate, but Phase 18 only tells them *that* version numbers mismatch (`consumer referenced v1.0, provider baseline is v2.0`). They have to manually diff every document in the provider baseline to figure out what changed and how it impacts their consumer document.
- **Why It Matters**: Prevents friction and delay during cross-project baseline upgrades, reducing manual inspection time.
- **Existing Capability Deficit**: Phase 18 checks equality (`consumerVersion === providerBaselineVersion`); it does **NOT** diff content snapshots or analyze contract delta scope.

### Gap 2: Verification Friction & Task Recurrence
- **User Problem**: Teams run verification plans, but management cannot see which document relationships consistently fail verification or require excessive rework.
- **Existing Capability Deficit**: Phase 11 generates tasks; Phase 17 checks attestation. Neither aggregates historical verification failure frequency or bottleneck nodes.

### Gap 3: Technical Knowledge Evidence Decay
- **User Problem**: Technical knowledge items extracted in Phase 8 become stale when documents update, but there is no proactive decay indicator showing unevidenced knowledge items.
- **Existing Capability Deficit**: Phase 8 scores initial authority; Phase 9 checks evidence coverage. Neither tracks authority decay across version shifts over time.

---

## 6. Candidate 1: Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer

- **Domain**: Cross-Project Traceability & Contract Lineage
- **Concept**: A pure, read-only analytics engine that analyzes the structural diff between a consumer's referenced provider baseline version ($V_{\text{ref}}$) and the provider's active baseline version ($V_{\text{active}}$). It computes:
  1. **Contract Delta Classification**: Categorizes document version changes between $V_{\text{ref}}$ and $V_{\text{active}}$ into `NON_BREAKING_ADDITION`, `DOCUMENTATION_REVISION`, `DEPRECATION_WARNING`, or `BREAKING_CONTRACT_CHANGE`.
  2. **Topological Realignment Vector**: Calculates the exact set of consumer document references that require updating, ordered by topological dependency depth.
  3. **Realignment Blast Radius Score**: Quantifies the percentage of downstream projects and documents impacted by a provider baseline bump.
- **Composition**: Composes Phase 4 (`DocumentVersion`), Phase 12 (`DocumentationBaseline`), Phase 14 (`ProjectTopologyLink`, `DocumentRelationship`), and Phase 18 (`system-baseline-alignment.service.ts`).
- **Persistence**: **ZERO persistence** (derived purely on-demand).
- **Workers**: **ZERO workers**.

---

## 7. Candidate 2: Documentation Verification Effectiveness & Friction Recurrence Intelligence

- **Domain**: Verification & Quality Assurance
- **Concept**: An analytical engine that inspects historical `VerificationTask` resolution times, failure rates, and recurring verification blockers across document subgraphs. It generates a **Verification Effectiveness Rating (VER)** and highlights **Friction Hotspots**.
- **Composition**: Composes Phase 11 (`VerificationTask`, `VerificationPlan`) and Phase 17 (`PackageFulfillmentAttestation`).
- **Persistence**: **ZERO persistence**.
- **Workers**: **ZERO workers**.

---

## 8. Candidate 3: Technical Knowledge Authority Decay & Evidence Stewardship Radar

- **Domain**: Technical Knowledge & Stewardship
- **Concept**: An intelligence service that evaluates extracted `TechnicalKnowledge` items against recent `DocumentVersion` mutations and `Evidence` record age to calculate a **Knowledge Authority Decay Index (KADI)**.
- **Composition**: Composes Phase 8 (`TechnicalKnowledge`), Phase 9 (`Evidence`), and Phase 7.5 (`KnowledgeRisk`).
- **Persistence**: **ZERO persistence**.
- **Workers**: **ZERO workers**.

---

## 9. Candidate 4: Multi-Document Change Proposal Decision-Support & Risk Matrix Engine

- **Domain**: Decision Support & Change Management
- **Concept**: A decision-support engine for comparing multiple open `ChangeProposal` records (Phase 15) or `ChangePackage` drafts (Phase 16). It scores proposals on Topological Blast Radius, Verification Load, and Contract Misalignment Risk to present a comparative **Decision-Support Matrix**.
- **Composition**: Composes Phase 15 (`ChangeProposal`), Phase 16 (`ChangePackage`), and Phase 19 (`SystemTopologyGate`).
- **Persistence**: **ZERO persistence**.
- **Workers**: **ZERO workers**.

---

## 10. Candidate 5: Document Lifecycle Health & Transition Friction Analyzer

- **Domain**: Document Lifecycle Intelligence
- **Concept**: A diagnostic engine that analyzes document lifecycle state transitions (`DRAFT` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `BASELINED` $\rightarrow$ `DEPRECATED`), flagging stalled documents, unassigned stewardship gaps, and review bottlenecks.
- **Composition**: Composes Phase 4 (`DocumentAudit`), Phase 10 (`Assurance`), and Phase 13 (`DocumentationWorkRequest`).
- **Persistence**: **ZERO persistence**.
- **Workers**: **ZERO workers**.

---

## 11. Candidate Scoring Matrix

Each candidate is evaluated on a scale of 1–5 across 11 criteria (Maximum Score = 55):

| Criteria | Candidate 1 (Contract Evolution) | Candidate 2 (Verification Intelligence) | Candidate 3 (Knowledge Decay) | Candidate 4 (Decision Matrix) | Candidate 5 (Lifecycle Health) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Product Value** | 5 | 4 | 4 | 4 | 5 |
| **2. Documan Identity Alignment** | 5 | 4 | 5 | 4 | 5 |
| **3. New Capability Strength** | 5 | 4 | 4 | 4 | 4 |
| **4. Existing Architecture Reuse** | 5 | 5 | 4 | 5 | 5 |
| **5. Traceability Value** | 5 | 4 | 5 | 4 | 4 |
| **6. Governance/Verification Value** | 5 | 5 | 4 | 4 | 4 |
| **7. Cross-Project Value** | 5 | 3 | 3 | 4 | 3 |
| **8. Technical Feasibility** | 5 | 4 | 4 | 4 | 5 |
| **9. ACL Clarity** | 5 | 5 | 5 | 5 | 5 |
| **10. Determinism / Auditability** | 5 | 4 | 4 | 5 | 5 |
| **11. Product-Boundary Safety** | 5 | 4 | 4 | 4 | 5 |
| **TOTAL SCORE** | **55 / 55** | **46 / 55** | **46 / 55** | **47 / 55** | **50 / 55** |

---

## 12. Top-Two Stress Test

The top two candidates are **Candidate 1 (Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer - 55/55)** and **Candidate 5 (Document Lifecycle Health & Transition Friction Analyzer - 50/55)**.

### Stress Test Matrix

| Dimension | Candidate 1 (Contract Evolution Intelligence) | Candidate 5 (Document Lifecycle Health) |
| :--- | :--- | :--- |
| **Authority Conflicts** | None. Reuses authoritative `DocumentationBaseline` and `DocumentVersion` records without redefining them. | None. Reuses `DocumentAudit` and `Document` status fields. |
| **Source of Truth Duplication**| Zero. All contract deltas are calculated dynamically on-demand. | Zero. Lifecycle metrics are derived dynamically. |
| **Cross-Project Privacy / ACL**| Fully compliant with Phase 14 ACL rules. Unauthorized provider documents/projects are omitted from the delta summary. | Operates primarily within single project scope; lower cross-project value. |
| **Performance Risk** | Low. Compare baseline versions for linked documents (typically $N \le 20$). Bounded by max topology depth = 3. | Low. Scans document audit logs within project. |
| **Product-Boundary Drift** | Zero risk. Directly enhances Documan's core documentation baseline and contract alignment identity. | Low-to-medium risk. Could drift toward generic task/workflow management (Jira clone risk). |
| **User Impact** | **High**. Solves the immediate friction when Phase 18/19 reports `CONTRACT_MISALIGNED`. | Medium. Provides helpful governance metrics, but less urgent than breaking release gate blockers. |

**Verdict**: **Candidate 1** wins decisively due to superior cross-project value, zero product-boundary risk, and direct resolution of release gate blocker bottlenecks.

---

## 13. Composition Analysis

Candidate 1 composes existing system capabilities seamlessly:

```text
[Phase 14 ProjectTopologyLink] + [Phase 14 DocumentRelationship]
                       ↓
[Phase 18 system-baseline-alignment.service.ts] (Identifies MISALIGNED units)
                       ↓
[Phase 12 DocumentationBaseline] + [Phase 4 DocumentVersion] (Fetches V_ref vs V_active content)
                       ↓
[Phase 23 Contract Evolution Engine] (Computes Contract Delta Tier + Realignment Sequence)
                       ↓
[SystemGovernanceGateSection UI] (Surfaces actionable contract diff & update recommendation)
```

---

## 14. Persistence / Worker Analysis

- **Persistence Decision**: **ZERO NEW PERSISTENCE**. All contract evolution deltas, realignment vectors, and blast radius scores are computed dynamically from existing MongoDB collections (`DocumentationBaseline`, `DocumentVersion`, `DocumentRelationship`, `ProjectTopologyLink`).
- **Worker Decision**: **ZERO BACKGROUND WORKERS**. Calculations are synchronous, bounded by max graph depth = 3 and max nodes = 50, executing in $< 50\text{ms}$.

---

## 15. Security / ACL Analysis

Phase 14 ACL rules are strictly enforced:
- Before evaluating contract evolution deltas for a provider project, the engine verifies that the requesting user has explicit read access to that provider project.
- If a user lacks access to a provider project in the topology, that provider's contract deltas are **100% omitted** from the response, and the unit is reported as restricted/indeterminate without leaking document titles, version numbers, or change descriptions.

---

## 16. Traceability Analysis

Candidate 1 completes the missing link in Documan's end-to-end traceability chain:

```text
DOCUMENT → VERSION → RELATIONSHIP → BASELINE → TOPOLOGY CONTRACT → ALIGNMENT DRIFT → [CONTRACT EVOLUTION DELTA] → REALIGNMENT ACTION
```

---

## 17. Decision-Support Analysis

Candidate 1 answers key decision-support questions for Project Owners:
- *"Why is my system release gate blocked on `CONTRACT_MISALIGNED`?"* $\rightarrow$ Surfaces exact structural diff between referenced and active baseline versions.
- *"What is the risk tier of upgrading to the provider's new baseline?"* $\rightarrow$ Categorizes change into `NON_BREAKING_ADDITION`, `DOCUMENTATION_REVISION`, or `BREAKING_CONTRACT_CHANGE`.
- *"Which consumer document should I update first?"* $\rightarrow$ Provides topological dependency-ordered update sequence.

---

## 18. Lifecycle Analysis

Complements the document lifecycle by providing clarity when a document is in the `BASELINED` state and an upstream dependency publishes a new baseline version.

---

## 19. Technical Knowledge Analysis

Contract deltas highlight modifications to authoritative technical knowledge statements contained within baselined documents, preventing silent knowledge drift across project boundaries.

---

## 20. Verification Analysis

Provides actionable input for Phase 11 verification planning by pinpointing the exact document sections requiring re-verification after a baseline contract upgrade.

---

## 21. Historical Gap Analysis

Phase 22 handles *governance history* over time. Candidate 1 handles *structural contract evolution* across baseline version bumps. They complement each other cleanly without duplication.

---

## 22. Product Maturity Analysis

Documan has reached high maturity in governance evaluation and simulation. Strengthening **Cross-Project Contract Evolution Intelligence** is the logical next step to transform raw gate blockers into actionable engineering guidance.

---

## 23. Recommended Phase 23 Direction

**Recommended Feature**: **Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer**

### Key Capabilities:
1. `calculateContractEvolutionDelta(userId, role, consumerProjectId, providerProjectId)`: Compares consumer's referenced provider baseline version against provider's active baseline.
2. `generateTopologicalRealignmentVector(userId, role, rootProjectId)`: Returns dependency-ordered list of consumer documents requiring baseline updates to resolve `CONTRACT_MISALIGNED` blockers.
3. **Contract Delta Classification**:
   - `NON_BREAKING_REVISION`: Minor text or metadata changes.
   - `NON_BREAKING_ADDITION`: New sections or endpoints added without altering existing contracts.
   - `DEPRECATION_WARNING`: Upstream elements marked deprecated in provider baseline.
   - `BREAKING_CONTRACT_CHANGE`: Upstream endpoints or referenced sections removed/refactored.
4. **UI Component**: `ContractEvolutionDeltaInspector.tsx` integrated into `SystemGovernanceGateSection.tsx`.

---

## 24. Why This Belongs in Documan

- Aligns 100% with Documan's core thesis: making document relationships, project context, and cross-project contract traceability understandable and actionable.
- Reuses existing Phase 4, 12, 14, 18 infrastructure without duplicating source of truth.
- Provides immediate utility without creeping into generic project management, Postman, or AI hype.

---

## 25. Explicit Non-Goals

- **NO** automatic text merging or code generation.
- **NO** persistent database snapshot models or collections.
- **NO** background worker polling or cron sweepers.
- **NO** AI/LLM semantic diffing (strictly structural and version-based diffing).
- **NO** bypass of Phase 14 cross-project ACL permissions.

---

## 26. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| Large document content diff latency | Compare version metadata, section headings, and OpenAPI endpoint linkages rather than full unstructured text diffs. |
| Complex cross-project graph traversal | Bound traversal strictly to Phase 14 limits (`MAX_DEPTH = 3`, `MAX_NODES = 50`). |
| Permission leakage across project boundaries | Apply Phase 14 ACL check before fetching provider document versions; omit restricted nodes completely. |

---

## 27. Open Questions

1. Should contract delta classification inspect OpenAPI spec diffs (from Phase 7.1) when available, in addition to document version metadata? *(Recommended: Yes, leverage `api-spec-drift.ts` if linked)*.
2. Should realignment vectors suggest specific target version numbers for each consumer document reference? *(Recommended: Yes, recommend exact active baseline version)*.

---

## 28. Recommendation for Implementation Planning

Proceed to draft **Phase 23 Implementation Plan v1** focusing exclusively on **Cross-Project Contract Evolution Intelligence & Delta Impact Analyzer**.

- Target Branch: `feature/contract-evolution-intelligence`
- Persistence: `0`
- Background Workers: `0`
