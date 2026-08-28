# Documan

## Product Vision

Documan is a **product-level document management and productivity platform**. It is **not a Postman clone**.

During planning, we deeply evaluated Postman and identified useful workflows, gaps, and problems that are not adequately addressed by a Postman-style API client. Those findings inform Documan's product direction.

The goal is to build Documan's **own differentiated product identity** around documents, organization, traceability, collaboration, developer/productivity workflows, and useful project context.

> **Postman is a source of product research, not a blueprint to clone.**

---

## Current Architecture

The API follows the established modular layered architecture:

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

Technology currently includes:

- Node.js
- TypeScript
- Express
- MongoDB
- Mongoose
- Zod
- JWT authentication
- Role-based authorization
- Vitest
- pnpm workspace
- ESLint

Existing shared infrastructure includes:

- `AppError`
- centralized error handling
- API response utilities
- authentication middleware
- authorization middleware
- validation middleware
- request IDs
- rate limiting

### Architecture rule

**Do not introduce a new architecture for an individual feature.**

Reuse the existing patterns and utilities unless a genuine product/architectural requirement requires otherwise.

---

## Current Backend Modules

```text
apps/api/src/modules/

├── auth/
├── documents/
├── health/
└── users/
```

---

# Completed Capabilities

## Authentication

- Registration
- Login/authentication
- JWT authentication
- Refresh-token handling
- Password change
- Token/session revocation

## User Management

### Regular users

- View current profile
- Update current profile
- Change password

### Admins

- List users
- Pagination
- Filtering
- Search
- View user by ID
- Update user
- Change role
- Activate/deactivate user
- Delete user
- Self-modification/self-deletion restrictions

## Document Management

- Upload/create documents
- List documents
- Pagination
- Search
- Get document by ID
- Update metadata
- Replace document file
- View documents
- Download documents
- Soft delete
- Restore

## Document Audit

Audit actions currently include:

```text
CREATE
UPDATE
FILE_REPLACE
VIEW
DOWNLOAD
DELETE
RESTORE
```

Audit records contain:

- document
- user
- action
- optional metadata
- creation timestamp

Audit history currently supports:

- retrieving document history
- authorization/ownership checks
- admin access where appropriate
- pagination
- filtering

---

# Product Differentiation

Documan should progressively evolve beyond a conventional document CRUD application.

The long-term direction is:

```text
Document Management
        +
Organization
        +
Traceability
        +
Developer/Productivity Workflows
        +
Collaboration
        +
Project/API Context
        +
Workflow Intelligence
```

The exact features must be driven by real user problems and product value.

Do **not** add features simply because another application has them.

---

# Postman Research Direction

Postman should be treated as a **reference for research and comparison**, not as the product specification.

Continue investigating:

- What Postman does well
- Which workflows users depend on
- Where users need supporting documentation/context
- Where traceability can be improved
- Where documents, API-related artifacts, and project context could work together better
- Where collaboration and organization can be improved

The result should be **Documan-specific capabilities**, not copied Postman screens or a Postman-style clone.

---

# Feature Development Rules

Every new feature must:

1. Solve a clearly defined user problem.
2. Explain why it belongs in Documan.
3. Contribute to product differentiation or an important core workflow.
4. Reuse the existing architecture.
5. Avoid unrelated refactoring.
6. Reuse existing middleware/utilities.
7. Follow existing API response and error conventions.
8. Define authentication and authorization explicitly.
9. Validate input with the existing Zod pattern.
10. Consider audit logging for important state changes.
11. Include appropriate tests.

### Do not make unnecessary changes

When implementing a feature:

- Do not redesign working modules.
- Do not rename unrelated APIs.
- Do not change existing behavior without a requirement.
- Do not replace existing architecture.
- Do not refactor unrelated code.
- Keep the diff focused on the feature.

---

# Testing Standard

Before a feature is complete, run:

```powershell
pnpm --filter @documan/api exec tsc --noEmit
pnpm --filter @documan/api lint
pnpm --filter @documan/api test -- <specific-test-file>.test.ts
pnpm --filter @documan/api test
pnpm --filter @documan/api build
git diff --check
```

Tests should cover, where applicable:

- success cases
- authentication failures
- authorization failures
- validation failures
- missing resources
- ownership restrictions
- admin behavior
- edge cases
- service errors
- controller error propagation
- route/middleware behavior

---

# Git Workflow

Every feature starts from an updated clean `main`.

```powershell
git switch main
git pull --ff-only origin main
git status
```

Create a descriptive feature branch:

```powershell
git switch -c feature/<feature-name>
```

Then:

```text
Inspect existing implementation
        ↓
Define product behavior
        ↓
Implement only required changes
        ↓
Add/update tests
        ↓
Focused tests
        ↓
TypeScript
        ↓
Lint
        ↓
Full tests
        ↓
Build
        ↓
git diff --check
        ↓
Commit
        ↓
Push
        ↓
Pull Request → main
```

After merge:

```powershell
git switch main
git pull --ff-only origin main
git status
git branch -d feature/<feature-name>
git push origin --delete feature/<feature-name>
```

Final state must be:

```text
main
origin/main
working tree clean
```

---

# Current Product Checkpoint

Latest merged commit:

```text
eb7d4d6
Merge pull request #20
feature/api-document-audit-history-pagination
```

Completed document progression:

```text
Document CRUD
      ↓
File upload/replace
      ↓
View / Download
      ↓
Soft Delete / Restore
      ↓
Audit Logging
      ↓
Audit History
      ↓
Audit History Pagination / Filtering
```

Current API modules remain:

```text
auth
documents
health
users
```

The next feature must be selected from the **product roadmap/problem space**, not by blindly reusing an old feature-branch name.

---

# Feature Planning Template

Before implementing a new feature, document:

### 1. Product problem
What real problem are we solving?

### 2. Product value
Why does this make Documan better?

### 3. Existing implementation
Which models, schemas, services, controllers, routes, middleware, and tests already exist?

### 4. Data changes
What models/indexes/fields are actually required?

### 5. API behavior
Define endpoint, method, request, response, validation, errors, and authorization.

### 6. Architecture
Keep:

```text
Route → Middleware → Controller → Service → Model
```

### 7. Tests
Define required service/controller/route/schema tests before declaring completion.

### 8. Verification
Require TypeScript, lint, focused tests, full tests, build, and `git diff --check`.

### 9. Git
Use the feature-branch → commit → push → PR → merge → cleanup flow.

---

# Definition of Done

- [ ] Product purpose is clear
- [ ] User problem is clear
- [ ] Existing architecture preserved
- [ ] Required model changes implemented
- [ ] Validation implemented
- [ ] Authentication/authorization correct
- [ ] Controller implemented
- [ ] Routes registered
- [ ] Audit behavior considered
- [ ] Relevant tests added/updated
- [ ] TypeScript passes
- [ ] ESLint passes
- [ ] Full test suite passes
- [ ] Build passes
- [ ] `git diff --check` passes
- [ ] No unrelated refactoring
- [ ] Feature committed
- [ ] Feature pushed
- [ ] PR merged into `main`
- [ ] Local/remote feature branches cleaned up

---

# Core Product Rule

> **Build Documan as a differentiated product that solves real workflow problems.**
>
> **Do not clone Postman. Learn from Postman, identify gaps and opportunities, and turn those findings into Documan-specific capabilities.**
>
> **Preserve the existing architecture and make only the changes necessary for each feature.**
