# Batch 4 — Projects & Project Details Stitch UI Implementation Plan

## 1. Objective

The objective of **Batch 4 (Projects & Project Details 5-Tab Architecture)** is to migrate the visual presentation and layout of the Documan Projects Directory and Project Workspace to match the approved Stitch Precision Blueprint dark telemetry design (`07_CORE_PROJECTS` and `08_PW`).

This batch focuses on refining:
1. `ProjectsPage.tsx` (Projects Directory page header, project creation form card, search/filter controls, project card roster, project archiving actions)
2. `ProjectDetailsPage.tsx` (Project header card, breadcrumb navigation, project metadata, document assignment card, and the Canonical Five-Tab Workspace Architecture)
3. `ProjectArchitecturePanel.tsx` (System Topology graph nodes, dependency link badges, and architecture graph visualization inside the Relationships tab)

This is a **UI/UX visual migration only**. 100% of existing project CRUD APIs, backend logic, state stores, ACL rules, project ownership semantics, URL query tab synchronization (`?tab=...`), and governance/topology calculations will be preserved without alteration.

---

## 2. Research Basis

This implementation plan is based directly on the approved research artifact:
[`docs/research/POST-COMPLETION-BATCH-4-STITCH-UI-RESEARCH.md`](file:///c:/MERN_STACK/Documan/documan/docs/research/POST-COMPLETION-BATCH-4-STITCH-UI-RESEARCH.md)

Key research findings:
- Both project routes (`/projects` and `/projects/:id`) are fully mapped and verified.
- The Project Workspace is governed by the **Canonical Five-Tab Architecture**: **Overview**, **Documents**, **Relationships**, **Knowledge**, **Governance**. Zero 6th tabs will be introduced.
- Recommendation: **READY FOR IMPLEMENTATION PLAN**.

---

## 3. Current Repository Architecture

The current project architecture consists of:
- **`ProjectsPage.tsx`**: Route `/projects`. Calls `getProjects()` on mount, renders page heading, project creation form card (`createProject`), and project cards grid with archive buttons (`archiveProject`).
- **`ProjectDetailsPage.tsx`**: Route `/projects/:id`. Fetches project details (`getProjectById`), assigned documents (`getProjectDocuments`), and user documents (`getDocuments`) in parallel via `Promise.all`. Tab state is synchronized with `useSearchParams` (`?tab=...`).
- **`ProjectArchitecturePanel.tsx`**: Mounted inside the Relationships tab. Manages project topology links and architecture graph rendering via `project-topology.api.ts`.

---

## 4. Stitch Target Architecture

The Stitch target architecture aligns projects with the dark Precision Blueprint:
- **Canvas Background**: Deep navy canvas `#0c1324` (`min-h-screen bg-[#0c1324] text-slate-100`).
- **Card & Panel Fills**: Layer 1 Slate surface `#191f31` with `#1e293b` hairline border.
- **Primary Accent**: Sky Cyan `#38bdf8` for active tabs, owner badges, link targets, and node highlights.
- **Typography**: Inter for headings and body; JetBrains Mono (`font-mono`) for project IDs, creation dates, and topology link types.
- **Tab Bar**: High-density 5-tab bar with 1px sky cyan active border, active indicator dot, and count badges.

---

## 5. Functional Preservation Contract

The implementation MUST NOT modify:
1. **Backend APIs & Data Models**: Zero changes to `apps/api/*`, schemas, controllers, or Mongoose models.
2. **Project APIs**: `getProjects`, `getProjectById`, `createProject`, `updateProject`, `archiveProject`, `getProjectDocuments`, `assignDocumentToProject`, `removeDocumentFromProject` in `project.api.ts` remain 100% untouched.
3. **Topology APIs**: `getProjectTopologyLinks`, `createProjectTopologyLink`, `updateProjectTopologyLink`, `deleteProjectTopologyLink`, `getProjectArchitectureGraph` in `project-topology.api.ts` remain untouched.
4. **ACL & Ownership**: `project.isOwner` permissions, `ownerId` checks, and `admin` role rules remain untouched.
5. **URL Tab Sync**: `useSearchParams` synchronization (`?tab=overview`, `?tab=documents`, `?tab=relationships`, `?tab=knowledge`, `?tab=governance`) remains untouched.
6. **Risk & Governance Calculations**: `KnowledgeRiskRadarPanel` formulas, `GovernanceSection` calculations, and release gate algorithms remain untouched.

---

## 6. Canonical Five-Tab Architecture

The Project Workspace contains **EXACTLY FIVE TABS**:

1. **TAB 1 — Overview**: Project identity, summary, creation date, `KnowledgeRiskRadarPanel`.
2. **TAB 2 — Documents**: Assigned Documents roster (`projectDocs`), document assignment selector (`assignDocumentToProject`), document removal trigger (`removeDocumentFromProject`), links to `/documents/:id`.
3. **TAB 3 — Relationships**: System Topology and Architecture panel (`ProjectArchitecturePanel`), API Specifications (`ApiSpecsSection`), Webhooks (`WebhooksSection`).
4. **TAB 4 — Knowledge**: Knowledge Risk Radar assessment, technical references, ADRs / evidence calculator integration.
5. **TAB 5 — Governance**: Governance & Gates (`GovernanceSection`, `SystemBaselineAlignmentSection`, `SystemGovernanceGateSection`), Pre-Change Proposals (`ProjectProposalsTab`), Multi-Document Change Packages (`ProjectChangePackagesTab`), Release Certificates & Lineage (`SystemReleaseLineageView`).

> [!IMPORTANT]
> **CANONICAL RULE**: No 6th tab will be created. Architecture, API Specs, Webhooks, Change Management, and Release Certificates are nested cleanly within these 5 canonical areas.

---

## 7. Batch 1 Integration

Batch 4 directly consumes Batch 1 tokens from `apps/web/src/index.css`:
- Canvas Fill: `#0c1324` (`--color-bg`)
- Surface Fill: `#191f31` (`--color-surface`)
- Border Hairline: `#1e293b` (`--color-border`)
- Primary Accent: `#38bdf8` (`--color-primary`)
- Danger Accent: `#f43f5e` (`--color-danger`)
- Focus Treatment: 1px Sky Cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`)

---

## 8. Batch 2 Integration

Batch 4 consumes Batch 2 shared UI primitives:
- [`Card`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Card.tsx): Project cards, form containers, workspace panels.
- [`Button`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Button.tsx): Create, archive, edit, assign, remove buttons.
- [`Badge`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Badge.tsx): Owner badges, status badges, topology link badges.
- [`Table`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Table.tsx): Document roster and topology tables.
- [`Tabs`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Tabs.tsx): 5-tab workspace navigation bar.
- [`LoadingSpinner`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/LoadingSpinner.tsx): Async loading states.
- [`EmptyState`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/EmptyState.tsx): No projects / no documents empty fallbacks.
- [`Breadcrumb`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/components/ui/Breadcrumb.tsx): Page header breadcrumbs.

---

## 9. Batch 3 Integration

Batch 4 components execute within the published Batch 3 application shell (`AppLayout`), inheriting fixed 64px header bar, global search trigger (`Cmd+K`), notification bell, user account section, and `#0c1324` canvas container.

---

## 10. Projects Directory Implementation Plan

In `apps/web/src/pages/ProjectsPage.tsx`:
- Page header: Refine title to `text-slate-100 font-extrabold` and subtitle to `text-slate-400`.
- Create button: Apply Batch 2 `Button` primitive (`variant="primary"`).
- Project cards grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
- Card container: `bg-[#191f31] border border-[#1e293b] rounded-[6px] hover:border-[#38bdf8]/40 transition-colors flex flex-col justify-between`.
- Owner badge: Monospaced cyan badge (`variant="info"` with `font-mono text-[10px] uppercase`).
- Link targets: `text-[#38bdf8] hover:text-[#7dd3fc] font-semibold`.
- Archive trigger: `Button` primitive (`variant="ghost" size="sm" className="text-[#f43f5e] hover:text-red-400"`).

---

## 11. Project Creation UI Plan

In `ProjectsPage.tsx`:
- Creation form card: `bg-[#191f31] border border-[#1e293b] rounded-[6px] p-6 space-y-4`.
- Input fields: `bg-[#0c1324] border border-[#1e293b] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] text-slate-100 rounded-[4px] px-3 py-2 text-sm`.
- Form label: `text-xs font-mono text-slate-300 uppercase tracking-wider`.
- Submit button: `Button` primitive with `isLoading={submitting}` state.

---

## 12. Project Archive UI Plan

In `ProjectsPage.tsx`:
- Archive confirmation dialog (`confirm(...)`) preserved 100%.
- Archive button: `Button` primitive (`variant="ghost" size="sm" className="text-[#f43f5e] hover:text-red-400"`).

---

## 13. Project Details Implementation Plan

In `apps/web/src/pages/ProjectDetailsPage.tsx`:
- Container: `space-y-6`.
- Breadcrumb header: `Projects` -> `[Project Name]`.
- Loading spinner: Batch 2 `LoadingSpinner` (`label="Loading project details..."`).
- Error state: `#191f31` card with `#f43f5e` danger text and cyan back link.

---

## 14. Project Header Plan

In `ProjectDetailsPage.tsx`:
- Header card: `bg-[#191f31] border border-[#1e293b] rounded-[6px] p-6`.
- Title: `text-2xl font-extrabold text-slate-100`.
- Owner badge: Cyan status badge (`variant="info"` with `font-mono text-[10px] uppercase`).
- Metadata: `text-xs font-mono text-slate-400` for creation date (`new Date(...).toLocaleDateString()`).
- Edit Project form: `#0c1324` input fields with `#1e293b` borders and `#38bdf8` focus rings.

---

## 15. Overview Tab Plan

In `ProjectDetailsPage.tsx`:
- Overview panel: `KnowledgeRiskRadarPanel` wrapped in `#191f31` card with `#1e293b` border.
- Displays project description, risk radar chart, and document count summary.

---

## 16. Documents Tab Plan

In `ProjectDetailsPage.tsx`:
- Roster card: `bg-[#191f31] border border-[#1e293b] rounded-[6px]`.
- Assignment selector form: `p-4 bg-[#0c1324] border border-[#1e293b] rounded-[6px] space-y-3`.
- Document dropdown: `bg-[#191f31] border border-[#1e293b] text-slate-100 text-sm rounded-[4px] px-3 py-2`.
- Document list items: `py-3 flex items-center justify-between border-b border-[#1e293b]/60 last:border-b-0`.
- Document title link: `text-[#38bdf8] hover:text-[#7dd3fc] font-semibold`.
- File info: `text-xs font-mono text-slate-400`.
- Remove button: Batch 2 `Button` primitive (`variant="ghost" size="sm" className="text-[#f43f5e] hover:text-red-400"`).

---

## 17. Relationships Tab Plan

In `ProjectDetailsPage.tsx` and `ProjectArchitecturePanel.tsx`:
- Panel container: `#191f31` cards with `#1e293b` borders.
- Architecture graph nodes: `#191f31` node cards with `#1e293b` border, `#38bdf8` active highlight.
- Dependency link type badges: Monospaced uppercase tags (`DEPENDS_ON`, `PROVIDES_API_TO`, `INTEGRATES_WITH`, `SHARED_LIBRARY`).
- `ApiSpecsSection` & `WebhooksSection`: Rendered inside Relationships tab with `#191f31` card styling.

---

## 18. Knowledge Tab Plan

In `ProjectDetailsPage.tsx`:
- Displays project knowledge assessment, technical reference links, and ADR evidence indicators styled in `#191f31` card panels with slate-400 typography.

---

## 19. Governance Tab Plan

In `ProjectDetailsPage.tsx`:
- Houses `GovernanceSection`, `SystemBaselineAlignmentSection`, `SystemGovernanceGateSection`, `ProjectProposalsTab`, `ProjectChangePackagesTab`, and `SystemReleaseLineageView`.
- Styled with `#191f31` card containers, `#1e293b` borders, and monospaced `T_cert` / `T_now` indicator badges.

---

## 20. Five-Tab Navigation Plan

In `ProjectDetailsPage.tsx`:
- Canonical 5-tab definition:
  ```tsx
  const tabs: TabItem[] = [
    { id: "overview", label: "Overview", count: projectDocs.length },
    { id: "documents", label: "Documents", count: projectDocs.length },
    { id: "relationships", label: "Relationships" },
    { id: "knowledge", label: "Knowledge" },
    { id: "governance", label: "Governance" },
  ];
  ```
- Reuses Batch 2 `Tabs` primitive with URL query synchronization (`?tab=...`).

---

## 21. Project Routing Preservation

- `/projects` -> `ProjectsPage` (Protected, inside `AppLayout`)
- `/projects/:id` -> `ProjectDetailsPage` (Protected, inside `AppLayout`)
- Route definitions in `App.tsx` remain 100% untouched.

---

## 22. Ownership / ACL Preservation

- `project.isOwner` checks in `ProjectsPage.tsx` and `ProjectDetailsPage.tsx` remain untouched.
- `user.role === 'admin'` rules remain untouched.

---

## 23. Responsive Implementation Matrix

| Area | 1440px (Desktop) | 1024px (Laptop/Tablet) | 800px (Tablet Portrait) | 375px (Mobile) |
|---|---|---|---|---|
| **Projects Grid** | 3-column card grid | 2-column card grid | 1-column card grid | 1-column full width |
| **Project Header** | Flex row header with edit button | Flex row header | Flex column header | Flex column header |
| **5-Tab Bar** | Inline tab list | Inline tab list | Horizontal scroll tab bar | Horizontal scroll tab bar |
| **Document Roster** | Table/card row list | Table/card row list | Stacked card rows | Compact mobile rows |

---

## 24. Accessibility Implementation Plan

- HTML5 landmarks: `<section aria-label="...">`, `<h1`>, `<h2`>, `<h3`>.
- ARIA attributes: `role="tablist"`, `role="tab"`, `aria-selected`, `tabIndex`.
- Keyboard navigation: Arrow key tab switching (`ArrowLeft`/`ArrowRight`/`Home`/`End`).
- 1px Sky Cyan focus ring (`focus-visible:ring-1 focus-visible:ring-[#38bdf8]`).

---

## 25. High-Blast-Radius Risk Analysis

- `ProjectDetailsPage.tsx` mounts 10+ sub-components.
- **Risk Mitigation**: Visual refinement will alter container styling, card fills, and borders only. Sub-component props, state hooks, and API integrations remain untouched.

---

## 26. Performance Considerations

- Zero extra API requests added.
- `Promise.all` parallel loading in `ProjectDetailsPage.tsx` preserved.

---

## 27. Unsupported Stitch Elements

- NO fake project metrics or dummy collaborators.
- NO unmapped sidebar links or unsupported export formats.
- NO automatic AI project summary generators.

---

## 28. Exact File Impact

### Files to Modify in Batch 4:
1. [`apps/web/src/pages/ProjectsPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/ProjectsPage.tsx) (MEDIUM blast radius: Projects Directory layout and cards)
2. [`apps/web/src/pages/ProjectDetailsPage.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/pages/ProjectDetailsPage.tsx) (HIGH blast radius: Project Details header & 5-tab workspace)
3. [`apps/web/src/features/projects/ProjectArchitecturePanel.tsx`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/features/projects/ProjectArchitecturePanel.tsx) (LOW blast radius: Topology panel card styles)

---

## 29. Files / Systems That Must Not Change

- `apps/web/src/features/projects/project.api.ts`
- `apps/web/src/features/projects/project-topology.api.ts`
- `apps/web/src/features/projects/project.types.ts`
- `apps/api/*` (Backend API)
- `apps/web/src/App.tsx` (Routing table)

---

## 30. Incremental Implementation Sequence

1. **Step 1**: Create feature branch `feature/stitch-batch-4-projects-workspace`.
2. **Step 2**: Refine `ProjectsPage.tsx` (Projects Directory page header, project creation form card, card grid, cyan links, archive buttons).
3. **Step 3**: Refine `ProjectArchitecturePanel.tsx` (Topology graph card containers, node borders, link badges).
4. **Step 4**: Refine `ProjectDetailsPage.tsx` (Project header card, Edit Project form, 5-tab bar definition, assigned documents card, assignment selector, tab panels).
5. **Step 5**: Run automated verification suite (`build`, `lint`, `test`, `git diff --check`).
6. **Step 6**: Perform manual browser QA across 1440px, 1024px, 800px, 375px viewports.
7. **Step 7**: Present completion report and await user publication authorization.

---

## 31. Automated Verification Plan

- `pnpm --filter web build` (`tsc -b && vite build`)
- `pnpm --filter web lint` (`eslint .`)
- `pnpm test` (monorepo test suite)
- `git diff --check`

---

## 32. Manual QA Plan

Verify across viewports (1440px, 1024px, 800px, 375px) on active dev server:
- Projects Directory page load, card grid rendering, project creation drawer toggle, project creation submission, archive action confirmation.
- Project Details page load, breadcrumb navigation, header display, owner badge, Edit Project form toggle, 5-tab switching, URL `?tab=` query parameter synchronization.
- Document assignment dropdown, assign action, document removal confirmation, document title detail links.
- Relationships tab topology graph rendering and topology link CRUD.
- Keyboard tab navigation (`ArrowLeft`/`ArrowRight`/`Home`/`End`) and focus outline visibility (`#38bdf8`).

---

## 33. Regression Checklist

- [ ] All project CRUD operations (`getProjects`, `createProject`, `archiveProject`, `updateProject`) working.
- [ ] Document assignment and removal working.
- [ ] Topology link CRUD working.
- [ ] Project owner checks (`isOwner`) working.
- [ ] Admin role access working.
- [ ] 5 tabs exact (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`).
- [ ] URL `?tab=` query parameter synchronization working.

---

## 34. Acceptance Criteria

- [ ] Projects Directory cards styled in `#191f31` with `#1e293b` borders and `#38bdf8` cyan accents.
- [ ] Project Details header card styled in `#191f31` with cyan owner badge.
- [ ] Canonical 5-Tab Workspace architecture (`Overview`, `Documents`, `Relationships`, `Knowledge`, `Governance`) preserved with 0 6th tabs created.
- [ ] Build, lint, tests (101 test files / 787 tests), and `git diff --check` pass with 0 errors.

---

## 35. Git / Publication Workflow

1. Create branch `feature/stitch-batch-4-projects-workspace`.
2. Implement edits in `ProjectsPage.tsx`, `ProjectArchitecturePanel.tsx`, `ProjectDetailsPage.tsx`.
3. Run verification commands.
4. Perform manual browser QA.
5. Report completion to user and await explicit publication authorization.
6. Commit (`feat(web): align projects directory and 5-tab workspace with Stitch UI`).
7. Merge into `main` (`git merge --no-ff feature/stitch-batch-4-projects-workspace`).
8. Push to `origin/main`.
9. Delete feature branch.
10. Verify clean `main`.

---

## 36. Final Implementation Recommendation

**READY FOR IMPLEMENTATION**
