# Batch 4 — Projects & Project Details Stitch UI Research

## 1. Objective

The objective of Batch 4 Research is to evaluate the current production implementation of the Documan **Projects Directory** and **Project Details 5-Tab Architecture** against the approved Stitch Precision Blueprint design (`07_CORE_PROJECTS` and `08_PW`).

Batch 4 focuses on:
- `ProjectsPage.tsx` (Projects Directory, project creation drawer/card, project search/filter controls, project card roster, project archiving actions)
- `ProjectDetailsPage.tsx` (Project header, breadcrumb navigation, project metadata, and canonical five-tab project workspace container)
- Canonical Five-Tab Workspace Architecture: **Overview**, **Documents**, **Relationships**, **Knowledge**, **Governance**

This research establishes the exact boundary for aligning projects presentation with Batch 1 tokens (`#0c1324` canvas, `#191f31` surface container, `#1e293b` hairline border, `#38bdf8` sky cyan primary accent), Batch 2 shared primitives (`Button`, `Badge`, `Card`, `Table`, `Tabs`, `Modal`, `LoadingSpinner`, `EmptyState`, `Breadcrumb`), and Batch 3 global shell while guaranteeing **100% preservation** of existing project APIs, backend logic, state stores, ACL rules, project ownership semantics, and document/relationship/governance workflows.

---

## 2. Research Basis

This research builds upon the authoritative repository inventory and prior Stitch UI migration audits:
- [`docs/research/POST-COMPLETION-COMPLETE-UI-UX-INVENTORY.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-COMPLETE-UI-UX-INVENTORY.md)
- [`docs/research/POST-COMPLETION-STITCH-TO-REPOSITORY-IMPLEMENTATION-AUDIT.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-STITCH-TO-REPOSITORY-IMPLEMENTATION-AUDIT.md)
- Published Batch 1, Batch 2, and Batch 3 commits on `main`.

---

## 3. Repository Project Architecture

The actual production project implementation consists of:

1. **`apps/web/src/pages/ProjectsPage.tsx`**:
   - **Route**: `/projects`
   - **Data Fetching**: Invokes `getProjects()` on mount.
   - **State**: `projects` array (`Project[]`), `loading`, `error`, `showCreateForm` boolean, `name`, `description`, `submitting`, `formError`.
   - **Actions**:
     - `createProject({ name, description })`
     - `archiveProject(id)`
   - **Components**: `Breadcrumb`, `Card`, `Button`, `Badge`, `LoadingSpinner`, `EmptyState`.

2. **`apps/web/src/pages/ProjectDetailsPage.tsx`**:
   - **Route**: `/projects/:id` (with URL query tab sync `?tab=...`)
   - **Data Fetching**: Invokes `getProjectById(projectId)` and `getProjectDocuments(projectId)` in parallel via `Promise.all`. Fetches user documents via `getDocuments({ limit: 100 })` for document assignment selector.
   - **Actions**:
     - `updateProject(id, { name, description })`
     - `assignDocumentToProject(projectId, documentId)`
     - `removeDocumentFromProject(projectId, documentId)`
   - **Tab State**: Driven by `useSearchParams` (`currentTab`).

3. **`apps/web/src/features/projects/`**:
   - `project.api.ts`: API endpoints for project CRUD and document assignment.
   - `project-topology.api.ts`: API endpoints for project topology links and architecture graph (`getProjectTopologyLinks`, `createProjectTopologyLink`, `updateProjectTopologyLink`, `deleteProjectTopologyLink`, `getProjectArchitectureGraph`).
   - `project.types.ts`: `Project`, `CreateProjectInput`, `UpdateProjectInput` interfaces.
   - `ProjectArchitecturePanel.tsx`: Interactive topology graph and dependency link management panel.

---

## 4. Stitch Project Architecture

The Stitch Precision Blueprint specifies a dark telemetry project workspace interface:
- **Canvas & Surface Fills**: Deep navy `#0c1324` canvas, `#191f31` card and panel surfaces, `#1e293b` hairline borders.
- **Project Cards**: Monospaced metadata badges, owner status indicators, action footer with sky cyan link targets (`text-[#38bdf8]`).
- **Workspace Navigation**: High-density 5-tab bar with 1px sky cyan active border, active indicator dot, and count badges.
- **Typography**: Inter font for headings and body; JetBrains Mono (`font-mono`) for technical IDs, project keys, dates, and status codes.

---

## 5. Projects Directory Inventory

| Element | Component / Selector | Behavior / Source |
|---|---|---|
| **Header Title** | `<h1>Projects & Workspaces</h1>` | Static page heading and description |
| **Create Trigger** | `<Button variant="primary">` | Toggles `showCreateForm` state |
| **Creation Form** | Inline `<Card>` | Form collecting `name` and `description` |
| **Project Roster** | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | Grid rendering `Project` cards |
| **Project Card** | `<Card>` primitive | Displays project name, description, owner badge, creation date |
| **Card Footer** | `<CardFooter>` primitive | Link to `/projects/:id` and Archive button |
| **Loading State** | `<LoadingSpinner>` | Displayed during `getProjects` async call |
| **Empty State** | `<EmptyState>` | Displayed when `projects.length === 0` |

---

## 6. Projects Directory Stitch Comparison

| Element | Repository Implementation | Stitch Target | Classification |
|---|---|---|---|
| **Page Layout** | `space-y-6` | `space-y-6` on `#0c1324` canvas | ALREADY ALIGNED |
| **Header Bar** | `text-gray-900 dark:text-white` | `text-slate-100` with `text-slate-400` subtitle | ALIGNMENT / REFINEMENT |
| **New Project Form** | White/gray-800 form card | Layer 1 Slate `#191f31` card with `#1e293b` border | ALIGNMENT / REFINEMENT |
| **Project Cards** | White/gray-800 card | Layer 1 Slate `#191f31` container with `#1e293b` border, `#38bdf8` hover | ALIGNMENT / REFINEMENT |
| **Owner Badge** | `variant="info"` badge | Monospaced cyan/blue status badge (`rounded-[2px] font-mono text-[10px]`) | ALIGNMENT / REFINEMENT |
| **Card Actions** | Indigo links (`text-indigo-600`) | Sky cyan links (`text-[#38bdf8] hover:text-[#7dd3fc]`) | ALIGNMENT / REFINEMENT |

---

## 7. Project Details Inventory

`ProjectDetailsPage.tsx` manages project metadata and tab navigation.
- **Header**: Displays project title, description, creation date, Owner badge, and Edit Project toggle form.
- **Breadcrumb**: `Projects` -> `[Project Name]` link path.
- **Tab Bar**: `<Tabs tabs={tabs} activeTab={currentTab} onChange={handleTabChange} />`.

---

## 8. Canonical Five-Tab Architecture

The Documan Project Workspace is governed by the **CANONICAL FIVE-TAB ARCHITECTURE**:

1. **TAB 1 — Overview**: Project identity, summary, risk assessment radar (`KnowledgeRiskRadarPanel`).
2. **TAB 2 — Documents**: Assigned Documents roster (`projectDocs`), document assignment form, removal trigger, links to `/documents/:id`.
3. **TAB 3 — Relationships**: System Topology and Architecture panel (`ProjectArchitecturePanel`), API Specifications (`ApiSpecsSection`), Webhooks (`WebhooksSection`).
4. **TAB 4 — Knowledge**: Knowledge Risk Radar assessment, technical references, ADRs / evidence integration.
5. **TAB 5 — Governance**: Governance & Gates (`GovernanceSection`, `SystemBaselineAlignmentSection`, `SystemGovernanceGateSection`), Pre-Change Proposals (`ProjectProposalsTab`), Multi-Document Change Packages (`ProjectChangePackagesTab`), Release Certificates & Lineage (`SystemReleaseLineageView`).

| Canonical Tab | Current Repository Implementation | Stitch Target | Classification | Notes |
|---|---|---|---|---|
| **Overview** | Overview tab panel & `KnowledgeRiskRadarPanel` | `#191f31` card layout with risk radar graph | ALIGNMENT / REFINEMENT | Displays project summary and risk assessment |
| **Documents** | Document roster & assignment selector | `#191f31` document list card with `#1e293b` border | ALIGNMENT / REFINEMENT | Manages document-project assignments |
| **Relationships** | Architecture & Specs tab (`ProjectArchitecturePanel`, `ApiSpecsSection`, `WebhooksSection`) | Topology graph with sky cyan nodes & slate borders | ALIGNMENT / REFINEMENT | Houses System Topology & API contracts (No 6th tab!) |
| **Knowledge** | Knowledge risk radar & technical references | `#191f31` knowledge assessment card | ALIGNMENT / REFINEMENT | Houses ADRs & confidence metrics |
| **Governance** | Governance, Change Management, Certificates tabs | Dark slate governance cards & release certificate lineage | ALIGNMENT / REFINEMENT | Houses Gates, Baseline Alignment, Proposals, Certificates |

> [!IMPORTANT]
> **CANONICAL RULE**: The Project Workspace contains **EXACTLY FIVE TABS**. System Topology, API Specs, Change Proposals, and Release Certificates MUST be cleanly organized within these 5 canonical areas. No 6th tab will be created.

---

## 9. Overview Tab Analysis

- **Content**: Project metadata summary, `KnowledgeRiskRadarPanel` (evaluating project document risk scores).
- **Stitch Alignment**: Card container in `#191f31`, hairline border in `#1e293b`, risk radar chart styled with cyan and slate indicator lines.

---

## 10. Documents Tab Analysis

- **Content**: List of assigned project documents (`projectDocs`), document assignment dropdown (`assignDocumentToProject`), remove action (`removeDocumentFromProject`).
- **Stitch Alignment**: Layer 1 `#191f31` container, sky cyan document links (`text-[#38bdf8]`), monospaced file type badges, Batch 2 `Button` primitives.

---

## 11. Relationships Tab Analysis

- **Content**: `ProjectArchitecturePanel` (rendering project dependency graph nodes `ArchitectureNode` and edges `ArchitectureEdge`, topology link CRUD via `project-topology.api.ts`), `ApiSpecsSection`, `WebhooksSection`.
- **Stitch Alignment**: `#191f31` surface fill, `#1e293b` node borders, `#38bdf8` sky cyan edge highlights, monospaced topology type badges (`DEPENDS_ON`, `PROVIDES_API_TO`, `INTEGRATES_WITH`, `SHARED_LIBRARY`).

---

## 12. Knowledge Tab Analysis

- **Content**: Project-scoped knowledge risk indicators, technical reference items, ADR evidence calculations.
- **Stitch Alignment**: `#191f31` panel surface, slate-400 typography, sky cyan reference badges.

---

## 13. Governance Tab Analysis

- **Content**: `GovernanceSection`, `SystemBaselineAlignmentSection`, `SystemGovernanceGateSection`, `ProjectProposalsTab`, `ProjectChangePackagesTab`, `SystemReleaseLineageView`.
- **Stitch Alignment**: `#191f31` cards with `#1e293b` borders, status badges (`FULLY COMPLIANT`, `NON_COMPLIANT`, `WAIVER_GRANTED`), release certificate attestation view with monospaced `T_cert` / `T_now` indicators.

---

## 14. Project Header Analysis

- Displays project name, description, creation date, Owner badge, and Edit Project toggle button.
- **Stitch Alignment**: Refine container to `#191f31` surface card with `#1e293b` border. Format creation date in monospaced font (`font-mono text-slate-400`). Apply Batch 2 `Button` primitive for Edit Project trigger.

---

## 15. Project Health / State Analysis

- Project health and governance status are derived dynamically from backend APIs (`KnowledgeRiskRadarPanel`, `SystemGovernanceGateSection`).
- **Calculation Preservation**: 100% of risk scoring formulas and gate evaluation algorithms remain untouched. Zero client-side math modifications.

---

## 16. Project Navigation Analysis

- `ProjectsPage` -> `ProjectDetailsPage` via `/projects/:id`.
- Tab state synced to URL query parameter (`?tab=overview`, `?tab=documents`, `?tab=relationships`, `?tab=knowledge`, `?tab=governance`).
- All navigation links and history states preserved.

---

## 17. Routing Preservation Analysis

The 2 project-related routes in `App.tsx` remain 100% unchanged:
- `/projects` -> `ProjectsPage` (Protected, inside `AppLayout`)
- `/projects/:id` -> `ProjectDetailsPage` (Protected, inside `AppLayout`)

---

## 18. ACL / Authorization Preservation

- `project.isOwner`: Controls visibility of "Edit Project", "Assign Document", "Remove Document", and management controls.
- Role checks (`admin` vs `user`): Admin role grants global access; project ownership grants project editing access.
- **Preservation Contract**: ACL checks remain 100% identical.

---

## 19. Project Ownership Semantics

- Global `admin` role != project `isOwner`.
- Project owner is stored as `ownerId`.
- No new ownership roles or permissions introduced.

---

## 20. Temporal Semantics

- **`T_cert`**: Frozen, immutable certified historical release state (rendered in purple badge `#c084fc`).
- **`T_now`**: Current live active production environment state (rendered in cyan badge `#38bdf8`).
- Preserved without altering temporal governance meaning.

---

## 21. Batch 1 / Batch 2 / Batch 3 Integration

- **Batch 1 Tokens**: Canvas `#0c1324`, surface `#191f31`, border `#1e293b`, primary cyan `#38bdf8`, focus ring `focus-visible:ring-1 focus-visible:ring-[#38bdf8]`.
- **Batch 2 Primitives**: `Card`, `Button`, `Badge`, `Table`, `Tabs`, `Modal`, `LoadingSpinner`, `EmptyState`, `Breadcrumb`.
- **Batch 3 Shell**: Rendered inside `AppLayout` with fixed 64px header and `#0c1324` canvas.

---

## 22. Responsive Analysis

| Area | 1440px (Desktop) | 1024px (Laptop/Tablet) | 800px (Tablet Portrait) | 375px (Mobile) |
|---|---|---|---|---|
| **Projects Directory** | 3-column card grid | 2-column card grid | 1-column card grid | 1-column full width |
| **Project Header** | Flex row header with inline edit button | Flex row header | Flex column header | Flex column header |
| **5-Tab Bar** | Inline tab list | Inline tab list | Horizontal scroll tab bar | Horizontal scroll tab bar |
| **Project Roster** | Table/card layout | Table/card layout | Stacked card rows | Compact mobile rows |

---

## 23. Accessibility Analysis

- **Landmarks**: `<section aria-label="...">`, `<h1`>, `<h2`>, `<h3`>.
- **Tab Semantics**: `role="tablist"`, `role="tab"`, `aria-selected`, `tabIndex`, keyboard navigation (`ArrowLeft`/`ArrowRight`/`Home`/`End`).
- **Focus Rings**: 1px Sky Cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`).

---

## 24. High-Blast-Radius Analysis

`ProjectDetailsPage.tsx` mounts 10+ sub-components (`GovernanceSection`, `ProjectArchitecturePanel`, `ApiSpecsSection`, `WebhooksSection`, `KnowledgeRiskRadarPanel`, etc.).
- **Risk Mitigation**: Visual refinement will focus strictly on container fills, card borders, tab bar integration, and typography without modifying child component props or state hooks.

---

## 25. Performance Considerations

- Zero extra API calls or state stores introduced.
- Efficient tab switching via URL query parameter (`useSearchParams`).

---

## 26. Unsupported Stitch Elements

- NO fake project metrics or dummy collaborators.
- NO unmapped sidebar links or unsupported export formats.
- NO automatic AI project summarization or vector search.

---

## 27. Visual vs Functional Matrix

| Area | Repository Behavior | Stitch Presentation | Allowed Change | Forbidden Change |
|---|---|---|---|---|
| **Projects Directory** | `getProjects`, `createProject`, `archiveProject` | `#191f31` cards with `#1e293b` borders, cyan links | Colors, typography, spacing, card borders | API calls, state hooks, archive prompt logic |
| **Project Header** | Name, description, date, Edit toggle | `#191f31` surface card with cyan owner badge | Surface background, font-mono date formatting | Edit submission logic, updateProject API |
| **Canonical 5 Tabs** | Overview, Documents, Relationships, Knowledge, Governance | High-density cyan active tab bar | Active border `#38bdf8`, tab styling | Adding 6th tab, altering tab switching |
| **Document Assignment** | `assignDocumentToProject`, `removeDocumentFromProject` | `#191f31` card with sky cyan links | Card surface `#191f31`, button styling | Assignment API, removal confirmation |

---

## 28. Exact File Impact

### Files to be Modified in Batch 4:
1. `apps/web/src/pages/ProjectsPage.tsx` (Refining Projects Directory styling)
2. `apps/web/src/pages/ProjectDetailsPage.tsx` (Refining Project Details header & 5-tab workspace)
3. `apps/web/src/features/projects/ProjectArchitecturePanel.tsx` (Refining topology panel styles)

### Files to NOT Modify:
- `apps/web/src/features/projects/project.api.ts` (API client)
- `apps/web/src/features/projects/project-topology.api.ts` (Topology API client)
- `apps/web/src/features/projects/project.types.ts` (Types)
- `apps/api/*` (Backend API)

---

## 29. Files / Systems That Must Not Change

- `apps/api/*` (Backend services, models, routes)
- `apps/web/src/App.tsx` (Routing table)
- `apps/web/src/routes/ProtectedRoute.tsx` (Auth guards)
- Zustand stores and API clients.

---

## 30. Future Implementation Boundary

- **Permitted**: Tailwind CSS class adjustments, Batch 1 token integration, Batch 2 primitive usage, 5-tab bar refinement.
- **Prohibited**: Changing route paths, altering APIs, adding a 6th tab, changing ACL checks, modifying risk calculations.

---

## 31. Testing Research

Existing workspace tests (`pnpm test` running `101 test files` / `787 tests`) verify project services and API schemas. No test cases will be weakened or removed.

---

## 32. Manual QA Requirements

Verification required across 4 viewports (1440px, 1024px, 800px, 375px):
- Projects Directory page load, card grid, creation form toggle, archive action.
- Project Details header, breadcrumb, 5-tab switching, document assignment, topology graph rendering.

---

## 33. Acceptance Criteria

- [ ] Projects Directory aligned with `#191f31` cards and `#1e293b` borders.
- [ ] Project Details header aligned with `#191f31` surface and sky cyan accents.
- [ ] Canonical 5-Tab Workspace architecture (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`) preserved with 0 6th tabs created.
- [ ] All 101 test files pass with 0 failures.
- [ ] Typecheck, ESLint, build, and `git diff --check` pass with 0 errors.

---

## 34. Final Recommendation

**READY FOR IMPLEMENTATION PLAN**
