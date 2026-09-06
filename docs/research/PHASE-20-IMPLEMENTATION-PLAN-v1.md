# Phase 20 Implementation Plan v1 — Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

## 1. Executive Summary

This implementation plan defines the complete technical design for **Phase 20: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management** in **Documan**.

Phase 20 builds directly upon **Phase 19: Cross-Project System Topology Governance Gate** (merged in commit `0da9578`). It introduces a persistent, scoped policy exception model (`SystemGovernanceWaiver`) that allows authorized Project Owners and System Admins to accept specific, time-bounded cross-project governance blockers (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`, `PROVIDER_GOVERNANCE_DISABLED`) without weakening local project governance or introducing deployment orchestration.

The implementation preserves exact Phase 19 status contracts (`PASSED`, `PASSED_WITH_WAIVER`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`) and maintains `passed: true` ONLY for `PASSED` and `PASSED_WITH_WAIVER`.

---

## 2. Repository Findings

Inspection of the actual Documan codebase reveals the following existing implementation patterns and entry points:

| Layer / Subsystem | Codebase Location | Existing Pattern to Reuse |
| :--- | :--- | :--- |
| **Phase 19 Gate Evaluator** | `apps/api/src/modules/governance/system-topology-governance-gate.service.ts` | Single query-time evaluation function `evaluateSystemTopologyGovernanceGate` returning `SystemGovernanceGateResult`. |
| **Phase 19 Types & Contracts** | `apps/api/src/modules/governance/system-topology-governance-gate.types.ts` | Enums `SystemReleaseStatus`, `BlockingDependencyDTO`, evidence structures. |
| **Phase 10 Waiver Authority** | `apps/api/src/modules/governance/assurance.service.ts` (L48–76) | Authority helper `verifyWaiverAuthority` restricting governance overrides to Project Owners and System Admins (`403 FORBIDDEN` for `EDIT` users). |
| **Audit Logging Engine** | `apps/api/src/modules/documents/document-audit.model.ts` & `document-audit.service.ts` | `DocumentAudit` model and `createDocumentAudit` service helper. Action enum `DocumentAuditAction`. |
| **Project Boundary & ACL** | `apps/api/src/modules/projects/project-topology.service.ts` | `checkUserProjectReadAccess(userId, role, projectId)` for ACL isolation and graph node traversal. |
| **Express Middleware & Errors** | `apps/api/src/middleware/auth.middleware.ts`, `apps/api/src/errors/app-error.js` | Centralized `AppError`, `authenticateJWT`, `requireRole`, `validateBody`. |
| **Frontend Gate Component** | `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx` | Status badge styling `getStatusBadgeStyle`, overview cards, and blocking dependency list. |

---

## 3. Existing Architecture Reuse

Phase 20 will strictly reuse existing Documan patterns without introducing new architectural layers or generic framework dependencies:

1. **Routing & Middleware**: Register routes in `apps/api/src/modules/governance/system-governance-waiver.routes.ts` following existing `governance.routes.ts` conventions using `authenticateJWT`.
2. **Controllers & Validation**: Implement `system-governance-waiver.controller.ts` with `AppError` handling and standard JSON response envelopes (`success: true, data: ...`).
3. **Audit Integration**: Extend `DocumentAuditAction` enum in `document-audit.model.ts` with `'GOVERNANCE_SYSTEM_WAIVER_GRANTED'` and `'GOVERNANCE_SYSTEM_WAIVER_REVOKED'`.
4. **ACL & Security**: Reuse `checkUserProjectReadAccess` to ensure users cannot view or grant waivers for projects they cannot read.
5. **No Background Infrastructure**: Zero cron workers, zero queue processors, zero Redis instances. Waiver expiration (`expiresAt <= Date.now()`) is computed dynamically at gate evaluation query time.

---

## 4. Proposed Architecture

```text
                                  +---------------------------------------+
                                  | POST/GET/PATCH API Endpoints          |
                                  | /api/v1/projects/:id/system-waivers  |
                                  +---------------------------------------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  | verifySystemWaiverAuthority           |
                                  | (Project Owner / System Admin ONLY)   |
                                  +---------------------------------------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  | SystemGovernanceWaiver Collection     |
                                  | (Operational Current-State Store)     |
                                  +---------------------------------------+
                                                     | (Synchronous Audit Write)
                                                     v
                                  +---------------------------------------+
                                  | DocumentAudit Collection              |
                                  | (Immutable Historical Provenance Log) |
                                  +---------------------------------------+
                                                     |
                                                     v
+--------------------------------------------------------------------------------------------------+
| evaluateSystemTopologyGovernanceGate (Phase 19 Gate Engine)                                     |
|                                                                                                  |
| 1. Query Active Waivers: { rootProjectId, isRevoked: false, expiresAt: { $gt: Date.now() } }    |
| 2. Evaluate Root Governance & Local Gate -> 3. Evaluate Topology -> 4. Evaluate Alignment        |
| 5. Map Dependencies against Active Waivers:                                                      |
|    - Blocker matches Waiver Scope? -> Blocker Status: WAIVED                                     |
|    - Blocker un-waived?           -> Blocker Status: ACTIVE_BLOCKER                              |
| 6. Aggregate System Status:                                                                      |
|    - Unwaived > 0                 -> systemReleaseStatus: 'BLOCKED' (passed: false)             |
|    - Unwaived = 0 & Waived > 0    -> systemReleaseStatus: 'PASSED_WITH_WAIVER' (passed: true)   |
|    - Unwaived = 0 & Waived = 0    -> systemReleaseStatus: 'PASSED' (passed: true)              |
+--------------------------------------------------------------------------------------------------+
```

---

## 5. Data Model

A new, dedicated Mongoose model will be created at `apps/api/src/modules/governance/system-governance-waiver.model.ts`:

```ts
import { Schema, model, Types, Document } from 'mongoose';

export type SystemBlockerType =
  | 'CONTRACT_MISALIGNED'
  | 'PROVIDER_ATTESTATION_MISSING'
  | 'PROVIDER_ATTESTATION_STALE'
  | 'PROVIDER_LOCAL_GATE_BLOCKED'
  | 'PROVIDER_GOVERNANCE_DISABLED';

export interface SystemGovernanceWaiverDocument extends Document {
  rootProjectId: Types.ObjectId;
  targetProviderProjectId: Types.ObjectId;
  targetDocumentId?: Types.ObjectId;
  contractVersionNumber?: number;
  blockerType: SystemBlockerType;
  reason: string;
  grantedByUserId: Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedByUserId?: Types.ObjectId;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemGovernanceWaiverSchema = new Schema<SystemGovernanceWaiverDocument>(
  {
    rootProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetProviderProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
      default: null,
      index: true,
    },
    contractVersionNumber: {
      type: Number,
      required: false,
      default: null,
    },
    blockerType: {
      type: String,
      enum: [
        'CONTRACT_MISALIGNED',
        'PROVIDER_ATTESTATION_MISSING',
        'PROVIDER_ATTESTATION_STALE',
        'PROVIDER_LOCAL_GATE_BLOCKED',
        'PROVIDER_GOVERNANCE_DISABLED',
      ],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    grantedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      required: false,
    },
    revokedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    revocationReason: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);
```

---

## 6. Index Strategy & Uniqueness Strategy

### Evaluation Query Index
To ensure gate evaluation query execution under 35ms:
```ts
systemGovernanceWaiverSchema.index({
  rootProjectId: 1,
  isRevoked: 1,
  expiresAt: 1,
});
```

### Duplicate Active Waiver Scope Uniqueness Constraint
To prevent duplicate active waivers matching the exact same scope tuple, a compound partial index will be established:
```ts
systemGovernanceWaiverSchema.index(
  {
    rootProjectId: 1,
    targetProviderProjectId: 1,
    targetDocumentId: 1,
    contractVersionNumber: 1,
    blockerType: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isRevoked: false },
  },
);
```

### Application-Level Duplicate Guard (`409 CONFLICT`)
Prior to saving a new waiver, the service executes an explicit pre-save query check:
```ts
const existingWaiver = await SystemGovernanceWaiver.findOne({
  rootProjectId,
  targetProviderProjectId,
  targetDocumentId: targetDocumentId || null,
  contractVersionNumber: contractVersionNumber || null,
  blockerType,
  isRevoked: false,
  expiresAt: { $gt: new Date() },
});

if (existingWaiver) {
  throw new AppError(
    `An active waiver for scope (${blockerType}) already exists (ID: ${existingWaiver._id}). Revoke existing waiver before creating a new one.`,
    409,
    'DUPLICATE_ACTIVE_WAIVER',
  );
}
```

---

## 7. Domain Rules

1. **Mandatory Provider Boundary**: `targetProviderProjectId` is required for all cross-project system waivers. Payload validation rejects missing provider IDs with `400 BAD_REQUEST`.
2. **Provider Local Gate Protection**: `PROVIDER_LOCAL_GATE_BLOCKED` waivers MUST provide `targetDocumentId`. Omitting `targetDocumentId` for this blocker type is rejected with `400 BAD_REQUEST`.
3. **Strict Version Binding**: If `contractVersionNumber` is specified (e.g. `1`), the waiver binds strictly to `v1`. If the provider's active baseline updates to `v2`, the waiver does NOT match `v2` during evaluation.
4. **Closed Blocker Classification**:
   - **NON_WAIVABLE**: `ROOT_GOVERNANCE_DISABLED`, `ROOT_LOCAL_GATE_BLOCKED`, `TOPOLOGY_TRUNCATION`, `INDETERMINATE_EVIDENCE`.
   - **WAIVABLE**: `CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`, `PROVIDER_GOVERNANCE_DISABLED`.

---

## 8. Waiver Scope & Matching Algorithm

During gate evaluation, active waivers for `rootProjectId` are fetched in a single query:
`const activeWaivers = await SystemGovernanceWaiver.find({ rootProjectId, isRevoked: false, expiresAt: { $gt: evaluatedAt } }).lean();`

For each blocking dependency encountered:
```ts
function matchWaiverForDependency(
  blockerType: SystemBlockerType,
  providerProjectId: string,
  documentId?: string,
  contractVersionNumber?: number,
  activeWaivers: ISystemGovernanceWaiver[] = [],
): ISystemGovernanceWaiver | undefined {
  return activeWaivers.find((w) => {
    if (w.blockerType !== blockerType) return false;
    if (w.targetProviderProjectId.toString() !== providerProjectId) return false;

    // Check optional document binding
    if (w.targetDocumentId) {
      if (!documentId || w.targetDocumentId.toString() !== documentId) return false;
    } else if (blockerType === 'PROVIDER_LOCAL_GATE_BLOCKED') {
      // Safety guard: PROVIDER_LOCAL_GATE_BLOCKED requires exact document match
      return false;
    }

    // Check optional contract version binding
    if (w.contractVersionNumber !== null && w.contractVersionNumber !== undefined) {
      if (contractVersionNumber === undefined || w.contractVersionNumber !== contractVersionNumber) {
        return false;
      }
    }

    return true;
  });
}
```

---

## 9. Lifecycle Semantics

```text
               +-----------------------+
               |   Waiver Creation     | (Emits GOVERNANCE_SYSTEM_WAIVER_GRANTED)
               +-----------------------+
                           |
                           v
               +-----------------------+
               |   Status: ACTIVE      | (isRevoked: false && expiresAt > Date.now())
               +-----------------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
  [expiresAt <= Date.now()]     [Owner/Admin Revokes]
            |                             |
            v                             v
  +-------------------+       +-----------------------+
  |  Status: EXPIRED  |       |   Status: REVOKED     | (isRevoked: true, emits
  |  (Query Filtered) |       |   (Permanent Inactive)|  GOVERNANCE_SYSTEM_WAIVER_REVOKED)
  +-------------------+       +-----------------------+
```

- **Query-Time Expiration**: Zero background queue sweeps. `expiresAt` is checked against current evaluation timestamp at query time.
- **Immediate Revocation**: Calling `PATCH /revoke` sets `isRevoked: true`, `revokedAt`, `revokedByUserId`. The next gate check immediately ignores the revoked waiver.
- **Permanent Inactive**: Revoked waivers can never reactivate (`isRevoked` cannot be set back to `false`).

---

## 10. Authorization Model

Authorization logic will be implemented in `verifySystemWaiverAuthority` in `system-governance-waiver.service.ts`:

```ts
export async function verifySystemWaiverAuthority(
  userId: string,
  role: 'user' | 'admin',
  rootProjectId: string,
  targetProviderProjectId?: string,
) {
  if (role === 'admin') return true;

  const rootProject = await Project.findOne({ _id: new Types.ObjectId(rootProjectId), isArchived: false });
  if (!rootProject) {
    throw new AppError('Root project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Root Project Owner possesses waiver authority
  if (rootProject.ownerId.toString() === userId) {
    return true;
  }

  // Target Provider Project Owner possesses waiver authority over provider scope
  if (targetProviderProjectId) {
    const providerProject = await Project.findOne({ _id: new Types.ObjectId(targetProviderProjectId), isArchived: false });
    if (providerProject && providerProject.ownerId.toString() === userId) {
      return true;
    }
  }

  throw new AppError(
    'Forbidden: Granting or revoking system governance waivers requires Root Project Owner, Provider Project Owner, or Admin authority',
    403,
    'FORBIDDEN',
  );
}
```

- **Shared Members (`EDIT`/`READ`)**: Rejection with `403 FORBIDDEN`.

---

## 11. Audit Integration

When a system governance waiver is granted or revoked, an audit record is synchronously created in `DocumentAudit`:

- **Grant Event**:
  `createDocumentAudit(documentId || rootProjectId, userId, 'GOVERNANCE_SYSTEM_WAIVER_GRANTED', { waiverId, rootProjectId, targetProviderProjectId, blockerType, reason, expiresAt })`
- **Revoke Event**:
  `createDocumentAudit(documentId || rootProjectId, userId, 'GOVERNANCE_SYSTEM_WAIVER_REVOKED', { waiverId, rootProjectId, targetProviderProjectId, blockerType, revocationReason })`

No audit events are emitted when time elapses and a waiver expires.

---

## 12. Phase 19 Gate Engine Integration

The `evaluateSystemTopologyGovernanceGate` function in `apps/api/src/modules/governance/system-topology-governance-gate.service.ts` will be updated to incorporate waiver resolution:

```ts
// 1. Fetch all active non-expired waivers for root project
const activeWaivers = await SystemGovernanceWaiver.find({
  rootProjectId: projObjId,
  isRevoked: false,
  expiresAt: { $gt: evaluatedAt },
}).lean();

// 2. Track waived vs unwaived blockers
let waivedBlockerCount = 0;
let unwaivedBlockerCount = 0;

// 3. For each blocking dependency, attempt matching:
const matchedWaiver = matchWaiverForDependency(
  blockerType,
  providerId,
  targetDocumentId,
  consumerVersionNumber,
  activeWaivers,
);

if (matchedWaiver) {
  waivedBlockerCount++;
  depEntry.isWaived = true;
  depEntry.appliedWaiverId = matchedWaiver._id.toString();
  depEntry.reason = `[WAIVED] ${depEntry.reason} (Waiver Reason: ${matchedWaiver.reason})`;
} else {
  unwaivedBlockerCount++;
  depEntry.isWaived = false;
}

// 4. Decision Precedence:
if (isRootLocalGateBlocked) {
  systemReleaseStatus = 'BLOCKED';
} else if (isTruncated || alignmentResult.aggregateState === 'INDETERMINATE') {
  systemReleaseStatus = 'INDETERMINATE';
} else if (unwaivedBlockerCount > 0) {
  systemReleaseStatus = 'BLOCKED';
} else if (waivedBlockerCount > 0) {
  systemReleaseStatus = 'PASSED_WITH_WAIVER';
} else {
  systemReleaseStatus = 'PASSED';
}

const passed = systemReleaseStatus === 'PASSED' || systemReleaseStatus === 'PASSED_WITH_WAIVER';
```

---

## 13. API Design

### 1. Grant System Governance Waiver
`POST /api/v1/projects/:projectId/system-governance-waivers`
- **Request Body**:
  ```json
  {
    "targetProviderProjectId": "60d5ec49b1a2c8001f8e1234",
    "targetDocumentId": "60d5ec49b1a2c8001f8e5678",
    "contractVersionNumber": 1,
    "blockerType": "PROVIDER_LOCAL_GATE_BLOCKED",
    "reason": "Temporary exception granted pending API spec review refactor",
    "expiresInDays": 30
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "60d5ec49b1a2c8001f8e9999",
      "rootProjectId": "60d5ec49b1a2c8001f8e1111",
      "targetProviderProjectId": "60d5ec49b1a2c8001f8e1234",
      "targetDocumentId": "60d5ec49b1a2c8001f8e5678",
      "contractVersionNumber": 1,
      "blockerType": "PROVIDER_LOCAL_GATE_BLOCKED",
      "reason": "Temporary exception granted pending API spec review refactor",
      "expiresAt": "2026-10-06T11:40:00.000Z",
      "isRevoked": false
    }
  }
  ```

### 2. List System Governance Waivers
`GET /api/v1/projects/:projectId/system-governance-waivers`
- **Query Params**: `includeExpired=true`, `includeRevoked=true`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [ ... ]
  }
  ```

### 3. Revoke System Governance Waiver
`PATCH /api/v1/projects/:projectId/system-governance-waivers/:waiverId/revoke`
- **Request Body**:
  ```json
  {
    "reason": "Provider document updated and baseline re-aligned"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "60d5ec49b1a2c8001f8e9999",
      "isRevoked": true,
      "revokedAt": "2026-09-06T12:00:00.000Z"
    }
  }
  ```

---

## 14. Frontend Design

Update `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx`:
1. **Status Badge Styling**: Add teal styling for `PASSED_WITH_WAIVER`:
   ```ts
   case 'PASSED_WITH_WAIVER':
     return { background: '#e0f2f1', color: '#004d40', border: '1px solid #80cbc4' };
   ```
2. **Applied Waiver Highlights**: Display badge on waived dependencies indicating `WAIVED (Waiver #ID)` with tooltip showing grantor and expiry.
3. **Grant Waiver Action**: Add "Grant Waiver" button on eligible waivable blocking cards for Project Owners/Admins, launching a modal to submit reason and duration.
4. **Active Waivers Roster**: Add collapsible "Active System Waivers" panel listing currently active waivers with a "Revoke" button.

---

## 15. Error Handling

| Scenario | HTTP Status | Error Code | Response Message |
| :--- | :---: | :--- | :--- |
| Missing `targetProviderProjectId` | `400` | `VALIDATION_ERROR` | `targetProviderProjectId is required for system governance waivers` |
| `PROVIDER_LOCAL_GATE_BLOCKED` without `targetDocumentId` | `400` | `VALIDATION_ERROR` | `targetDocumentId is required for PROVIDER_LOCAL_GATE_BLOCKED waivers` |
| Attempting to waive `ROOT_LOCAL_GATE_BLOCKED` | `400` | `NON_WAIVABLE_BLOCKER` | `Blocker type ROOT_LOCAL_GATE_BLOCKED cannot be waived` |
| Duplicate active waiver scope | `409` | `DUPLICATE_ACTIVE_WAIVER` | `An active waiver for scope (...) already exists. Revoke existing waiver before creating a new one.` |
| User is `EDIT` role (non-Owner/Admin) | `403` | `FORBIDDEN` | `Forbidden: Granting or revoking system governance waivers requires Project Owner or Admin authority` |

---

## 16. Security & ACL Isolation

- Reuses `checkUserProjectReadAccess(userId, role, projectId)`.
- If a user lacks `READ` permission on a target provider project, the waiver detail is filtered out from response payload views to prevent privacy leaks.
- Waiver creation strictly enforces `verifySystemWaiverAuthority`.

---

## 17. Performance Strategy

- Single batch query `SystemGovernanceWaiver.find({ rootProjectId, isRevoked: false, expiresAt: { $gt: evaluatedAt } })` executed at the start of gate evaluation.
- Zero N+1 queries during dependency loop matching.
- Sub-35ms total query overhead guarantee.

---

## 18. Test Strategy

Comprehensive Vitest unit tests will be implemented in `apps/api/src/modules/governance/system-governance-waiver.test.ts` and `system-topology-governance-gate.test.ts`:
- **Creation Tests**: Valid waiver, missing provider, invalid blocker, missing document for local gate, `403 FORBIDDEN` for non-owners.
- **Duplicate Prevention**: Rejection of identical active scope with `409 CONFLICT`.
- **Expiration Tests**: Active before `expiresAt`, invalid at/after `expiresAt`.
- **Revocation Tests**: Immediate gate effect upon revocation, rejection of unrevocation.
- **Version Binding**: `v1` waiver does NOT apply to `v2`.
- **Multi-Blocker Scenarios**: 1 waived + 1 unwaived $\rightarrow$ `BLOCKED`; all waived $\rightarrow$ `PASSED_WITH_WAIVER`.
- **Audit Verification**: Assert `GOVERNANCE_SYSTEM_WAIVER_GRANTED` and `REVOKED` events present in `DocumentAudit`.

---

## 19. QA Scenarios

A dedicated automated QA runner script `apps/api/src/modules/governance/run_phase20_qa.ts` will execute 25 automated scenarios covering:
1. Clean system release gate pass (`PASSED`).
2. Single contract mismatch waived (`PASSED_WITH_WAIVER`).
3. Single contract mismatch + un-waived stale attestation (`BLOCKED`).
4. Whole-provider gate bypass attempt without document ID (`400 BAD_REQUEST`).
5. Duplicate active waiver attempt (`409 CONFLICT`).
6. Immediate revocation fallback (`BLOCKED`).
7. Expiration boundary transition (`EXPIRED` $\rightarrow$ `BLOCKED`).
8. Non-owner authorization rejection (`403 FORBIDDEN`).
9. Document audit event generation.
10. Full regression across Phase 10, 14, 17, 18, 19 suites.

---

## 20. Migration & Compatibility

- **Database Migration**: Additive Mongoose collection `systemgovernancewaivers`. Zero schema migrations required for existing collections.
- **API Contract Backward Compatibility**: Phase 19 consumers checking `passed: boolean` continue receiving `passed: true` for `PASSED_WITH_WAIVER` and `passed: false` for `BLOCKED`.

---

## 21. Product Boundaries

Phase 20 strictly avoids:
- Software deployment execution, release pipelines, or Docker containers.
- CI/CD build runner triggers or pipeline scheduling.
- Background cron workers or timer queue infrastructure.
- Automatic waiver approval or AI-driven waiver generation.
- Generic project/task management tooling.

---

## 22. Implementation Sequence

```text
Step 1: Create SystemGovernanceWaiver model & indexes
Step 2: Update DocumentAuditAction enum with waiver actions
Step 3: Implement system-governance-waiver.service.ts & authority helper
Step 4: Implement system-governance-waiver.controller.ts & routes
Step 5: Integrate waiver matching into system-topology-governance-gate.service.ts
Step 6: Update frontend SystemGovernanceGateSection.tsx & API client
Step 7: Create Vitest test suite system-governance-waiver.test.ts
Step 8: Implement automated QA runner run_phase20_qa.ts & execute verification
```

---

## 23. Verification Gates

1. `npm run check` (TypeScript compilation clean).
2. `npx vitest run apps/api/src/modules/governance/` (100% pass rate).
3. `npx tsx apps/api/src/modules/governance/run_phase20_qa.ts` (25/25 PASSED).
4. `npx tsx apps/api/src/modules/governance/run_phase19_qa.ts` (Regression clean).

---

## 24. Risks & Open Questions

- **Risk**: High volume of waivers on large topologies causing query delay.
  - *Mitigation*: Covered by compound index `{ rootProjectId: 1, isRevoked: 1, expiresAt: 1 }` and in-memory matching.
- **Open Questions**: None. All architectural constraints resolved in Research v4.

---

## 25. Definition of Done

1. `SystemGovernanceWaiver` model and index created.
2. Authorization helper enforcing Project Owner/Admin authority (`403` for others).
3. `evaluateSystemTopologyGovernanceGate` updated with waiver resolution producing `PASSED_WITH_WAIVER`.
4. Duplicate active scope creation returns `409 CONFLICT`.
5. `PROVIDER_LOCAL_GATE_BLOCKED` without `targetDocumentId` returns `400 BAD_REQUEST`.
6. Audit logging emitting `GOVERNANCE_SYSTEM_WAIVER_GRANTED` and `REVOKED`.
7. Frontend component displaying active waivers and `PASSED_WITH_WAIVER` status badge.
8. 100% pass across all unit tests and 25-scenario QA suite.
9. Working tree verified clean with `git diff --check` and `git status`.
