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
(Relationships | Project Context | Technical References | Review Workflow | Templates & Scaffolding | Dependency Mapping & Impact Summaries | In-App Notifications | Project Webhooks | Documentation Drift & Automated Governance Engine)
    ↓
Project / API Context
    ↓
Workflow Intelligence
```

The first five areas established the document-management foundation. Developer and productivity workflows are actively expanding this foundation, while later areas remain research-driven.

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

**Status: IN PROGRESS — Baseline Capabilities Implemented**

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

### User problem investigated

Developers and technical users often work across documents, implementation details, APIs, decisions, specifications, troubleshooting notes, and external artifacts. Important context can become separated from the document that needs it.

### Why it matters

A document-management platform becomes substantially more valuable when documents help users complete real work and maintain technical context rather than merely storing files.

### Why it belongs in Documan

Documan's document lifecycle, metadata, organization, audit, access-control, and relationship foundations provide a controlled base for productivity workflows without abandoning the document-management identity.

### Differentiated opportunity

The opportunity is not to copy developer tools. It is to connect documents to the context developers already need while keeping documents as the central product object.

### Remaining research opportunities

While baseline productivity capabilities (Relationships, Project Context, Technical References, Review Workflows, Document Templates & Scaffolding, Dependency Mapping & Impact Summaries, Notifications, Webhooks, and Automated Governance) are complete, Phase 6 research continues into:

- Automated workflow triggers based on document lifecycle, review, and status events.
- Developer tool integrations and webhook/event notification patterns.
- Workspace-level productivity summaries and deeper cross-document analytics.
- Integration opportunities with developer workflows without compromising server-side security boundaries.

### Do not assume yet

Do not assume that Documan should become an API client, IDE, issue tracker, or project-management system.

---

## Phase 7 — Project / API Context

**Status: RESEARCH**

### User problem to investigate

Technical documents often describe or depend on APIs, services, environments, endpoints, projects, decisions, specifications, and implementation context. The document may exist, but the context needed to understand it may be scattered elsewhere.

### Why it matters

Connecting relevant context to documents could make technical documentation more useful, discoverable, and traceable.

### Why it could belong in Documan

Project/API context is a natural extension of document relationships and metadata when it helps users understand or act on documents.

### Differentiated opportunity

Documan should investigate contextual relationships rather than reproduce the full functionality of developer tools.

For example, a useful Documan direction could be understanding that a document describes, references, depends on, or explains a technical resource. The exact model must be determined through research.

### Research required

Investigate:

- What technical context users most often need alongside documents?
- Which relationships should be first-class?
- How should project context be represented?
- How much API awareness is useful before Documan starts becoming an API client?
- How can traceability and permissions apply to contextual relationships?

### Do not assume yet

Do not assume that collections, environments, request execution, API testing, or other Postman-style capabilities belong in Documan.

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
Developer / Productivity Workflow
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

**Foundation → Core Document Management → Organization → Traceability → Collaboration & Access Control → Developer / Productivity Workflows (Document Relationships, Project Context, External Technical References, Document Review Workflow, Document Templates & Scaffolding, Document-Level Dependency Mapping & Impact Summaries, Document Review & Lifecycle Notifications, Project Outbound Webhooks & Event Notification Subscriptions, Documentation Drift & Automated Governance Engine).**

The strategic question now moves beyond baseline document workflows:

> **How can Documan leverage established document relationships, project context, technical references, review workflows, templates, dependency mappings, in-app notifications, outbound webhooks, and automated governance to deepen Project / API Context and provide Workflow Intelligence without becoming a clone of specialized developer tools?**

The answer must come from research, user problems, and differentiated product design—not from copying feature lists.

The immediate strategic research boundary is therefore the remaining **Developer / Productivity Workflow** opportunities followed by deeper **Project / API Context**, and eventually **Workflow Intelligence** as those opportunities are validated.
