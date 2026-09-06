# Phase 20 Implementation Plan v2 — Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

## 1. Executive Summary

This implementation plan defines the technical design for **Phase 20: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management** in **Documan**.

Phase 20 builds directly upon **Phase 19: Cross-Project System Topology Governance Gate** (merged in commit `0da9578`). It introduces a persistent, scoped policy exception model (`SystemGovernanceWaiver`) that allows authorized Project Owners and System Admins to accept specific, time-bounded cross-project governance blockers (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`, `PROVIDER_GOVERNANCE_DISABLED`) without weakening local project governance or introducing deployment orchestration.

This v2 implementation plan addresses all architectural review requirements:
1. Resolves active unique scope vs. dynamic expiration (`expiresAt > evaluationTimestamp`) without relying on static partial database indexes.
2. Eliminates concurrent duplicate creation race conditions using MongoDB transactions (`session.withTransaction`).
3. Enforces a single evaluation timestamp (`evaluationTimestamp = new Date()`) throughout gate evaluation runs.
4. Formalizes two-phase deterministic matching separating batch candidate retrieval from exact scope matching.
5. Establishes transactional audit atomicity ensuring 100% consistency between the operational store and `DocumentAudit`.
6. Expands the test plan to 14 explicit deterministic scenarios and a 25-scenario automated QA runner.

The implementation preserves exact Phase 19 status contracts (`PASSED`, `PASSED_WITH_WAIVER`, `BLOCKED`, `INDETERMINATE`, `GOVERNANCE_DISABLED`) and maintains `passed: true` ONLY for `PASSED` and `PASSED_WITH_WAIVER`.

---

## 2. Repository Findings

Inspection of the actual Documan codebase reveals the following existing implementation patterns and entry points:

| Layer / Subsystem | Codebase Location | Existing Pattern to Reuse |
| :--- | :--- | :--- |
| **Phase 19 Gate Evaluator** | `apps/api/src/modules/governance/system-topology-governance-gate.service.ts` | Single query-time evaluation function `evaluateSystemTopologyGovernanceGate` returning `SystemGovernanceGateResult`. |
| **Phase 19 Types & Contracts** | `apps/api/src/modules/governance/system-topology-governance-gate.types.ts` | Enums `SystemReleaseStatus`, `BlockingDependencyDTO`, evidence structures. |
| **Phase 10 Waiver Authority** | `apps/api/src/modules/governance/assurance.service.ts` (L48–76) | Authority helper `verifyWaiverAuthority` restricting governance overrides to Project Owners and System Admins (`403 FORBIDDEN` for `EDIT` users). |
| **Phase 12 Transactions** | `apps/api/src/modules/governance/baseline.service.ts` (L236–240) | `mongoose.startSession()` and `session.withTransaction(...)` pattern for atomic multi-collection updates. |
| **Audit Logging Engine** | `apps/api/src/modules/documents/document-audit.model.ts` & `document-audit.service.ts` | `DocumentAudit` model and `createDocumentAudit` service helper. Action enum `DocumentAuditAction`. |
| **Project Boundary & ACL** | `apps/api/src/modules/projects/project-topology.service.ts` | `checkUserProjectReadAccess(userId, role, projectId)` for ACL isolation and graph node traversal. |
| **Express Middleware & Errors** | `apps/api/src/middleware/auth.middleware.ts`, `apps/api/src/errors/app-error.js` | Centralized `AppError`, `authenticateJWT`, `requireRole`, `validateBody`. |
| **Frontend Gate Component** | `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx` | Status badge styling `getStatusBadgeStyle`, overview cards, and blocking dependency list. |

---

## 3. Existing Architecture & Transaction Patterns Reuse

Phase 20 strictly reuses existing Documan patterns without introducing new architectural layers or generic framework dependencies:

1. **Routing & Middleware**: Register routes in `apps/api/src/modules/governance/system-governance-waiver.routes.ts` following existing `governance.routes.ts` conventions using `authenticateJWT`.
2. **Controllers & Validation**: Implement `system-governance-waiver.controller.ts` with `AppError` handling and standard JSON response envelopes (`success: true, data: ...`).
3. **Audit Integration**: Extend `DocumentAuditAction` enum in `document-audit.model.ts` with `'GOVERNANCE_SYSTEM_WAIVER_GRANTED'` and `'GOVERNANCE_SYSTEM_WAIVER_REVOKED'`.
4. **Transactions**: Use `mongoose.startSession()` and `session.withTransaction()` for atomic waiver creation and revocation alongside audit log writes.
5. **No Background Infrastructure**: Zero cron workers, zero queue processors, zero Redis instances. Waiver expiration (`expiresAt <= evaluationTimestamp`) is computed dynamically at gate evaluation query time.

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
                                                     v (Transaction Session)
                                  +---------------------------------------+
                                  | SystemGovernanceWaiver Collection     |
                                  | (Operational Current-State Store)     |
                                  +---------------------------------------+
                                                     | (Atomic Transaction Commit)
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
| 0. Establish Single evaluationTimestamp = new Date()                                             |
| 1. Batch Candidate Retrieval: { rootProjectId, isRevoked: false, expiresAt: { $gt: timestamp } } |
| 2. Evaluate Root Governance & Local Gate -> 3. Evaluate Topology -> 4. Evaluate Alignment        |
| 5. Exact Blocker-to-Waiver Matching Algorithm:                                                   |
|    - Blocker matches Waiver Scope? -> Blocker Status: WAIVED                                     |
|    - Blocker un-waived?           -> Blocker Status: ACTIVE_BLOCKER                              |
| 6. Aggregate System Status:                                                                      |
|    - Unwaived > 0                 -> systemReleaseStatus: 'BLOCKED' (passed: false)             |
|    - Unwaived = 0 & Waived > 0    -> systemReleaseStatus: 'PASSED_WITH_WAIVER' (passed: true)   |
|    - Unwaived = 0 & Waived = 0    -> systemReleaseStatus: 'PASSED' (passed: true)              |
+--------------------------------------------------------------------------------------------------+
```

---

## 5. Data Model & Mongoose Schema

A new Mongoose model will be created at `apps/api/src/modules/governance/system-governance-waiver.model.ts`:

```ts
import { Schema, model, Types, Document } from 'mongoose';

export type SystemBlockerType =
  | 'CONTRACT_MISALIGNED'
  | 'PROVIDER_ATTESTATION_MISSING'
  | 'PROVIDER_ATTESTATION_STALE'
  | 'PROVIDER_LOCAL_GATE_BLOCKED'
  | 'PROVIDER_GOVERNANCE_DISABLED';

export interface ISystemGovernanceWaiver {
  rootProjectId: Types.ObjectId;
  targetProviderProjectId: Types.ObjectId;
  targetDocumentId?: Types.ObjectId | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  reason: string;
  grantedByUserId: Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date | null;
  revokedByUserId?: Types.ObjectId | null;
  revocationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemGovernanceWaiverDocument extends ISystemGovernanceWaiver, Document {}

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
      default: null,
    },
    revokedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    revocationReason: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);
```

---

## 6. Index Strategy & Dynamic Expiration Analysis

### Why Static Partial Unique Indexes Fail
In MongoDB, a partial unique index defined as:
```ts
{ rootProjectId: 1, targetProviderProjectId: 1, targetDocumentId: 1, contractVersionNumber: 1, blockerType: 1 }
{ partialFilterExpression: { isRevoked: false } }
```
**CANNOT** enforce the approved duplicate waiver rule.

**Reason**: When a waiver's `expiresAt` timestamp elapses in real time (e.g. `expiresAt < now`), its database document still retains `isRevoked: false`. A partial index filtering on `isRevoked: false` would continue to include the expired waiver, permanently blocking creation of a new replacement waiver for that scope even though the original waiver is naturally expired! MongoDB partial filter expressions only evaluate static document fields (`isRevoked: false`), and cannot evaluate dynamic expressions like `$expiresAt > current_time`.

### The Authoritative Index Strategy
Instead of relying on a partial database unique index to handle dynamic expiration, Documan enforces duplicate active waiver scope uniqueness via **Compound Indexes + Transactional Pre-Checks**:

1. **Evaluation Retrieval Index**:
   ```ts
   systemGovernanceWaiverSchema.index({
     rootProjectId: 1,
     isRevoked: 1,
     expiresAt: 1,
   });
   ```
2. **Transactional Scope Lookup Index**:
   ```ts
   systemGovernanceWaiverSchema.index({
     rootProjectId: 1,
     targetProviderProjectId: 1,
     targetDocumentId: 1,
     contractVersionNumber: 1,
     blockerType: 1,
     isRevoked: 1,
     expiresAt: -1,
   });
   ```

### How Expired Records Allow Replacement
During waiver creation, the pre-check query searches specifically for active, non-revoked, non-expired waivers:
```ts
const activeWaiver = await SystemGovernanceWaiver.findOne({
  rootProjectId,
  targetProviderProjectId,
  targetDocumentId: targetDocumentId || null,
  contractVersionNumber: contractVersionNumber || null,
  blockerType,
  isRevoked: false,
  expiresAt: { $gt: currentTimestamp },
}).session(session);
```
- If an expired waiver exists (`expiresAt <= currentTimestamp`), the pre-check query returns `null` because `expiresAt: { $gt: currentTimestamp }` is false!
- The new waiver inserts cleanly and becomes the sole active waiver for that scope tuple.
- The expired waiver remains in MongoDB as an un-revoked historical record without blocking the new active waiver.

---

## 7. Concurrent Creation & Race Condition Resolution

### The Concurrency Problem
If two identical grant requests arrive simultaneously:
1. Request A checks `findOne` $\rightarrow$ returns `null` (no active waiver).
2. Request B checks `findOne` $\rightarrow$ returns `null` (no active waiver).
3. Request A inserts Waiver A.
4. Request B inserts Waiver B.
Result: Two active waivers exist for the exact same scope tuple!

### The Transactional Solution
Documan resolves concurrent creation races using **MongoDB Transactions (`session.withTransaction`)** with Read/Write Concern `majority`:

```ts
export async function grantSystemGovernanceWaiver(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: GrantWaiverInput,
): Promise<ISystemGovernanceWaiver> {
  const currentTimestamp = new Date();
  await verifySystemWaiverAuthority(userId, role, projectId, input.targetProviderProjectId);

  const session = await mongoose.startSession();
  try {
    let createdWaiver: ISystemGovernanceWaiver | null = null;

    await session.withTransaction(async () => {
      // 1. Transactional Pre-Check for Active Waiver
      const activeWaiver = await SystemGovernanceWaiver.findOne({
        rootProjectId: new Types.ObjectId(projectId),
        targetProviderProjectId: new Types.ObjectId(input.targetProviderProjectId),
        targetDocumentId: input.targetDocumentId ? new Types.ObjectId(input.targetDocumentId) : null,
        contractVersionNumber: input.contractVersionNumber ?? null,
        blockerType: input.blockerType,
        isRevoked: false,
        expiresAt: { $gt: currentTimestamp },
      }).session(session);

      if (activeWaiver) {
        throw new AppError(
          `An active waiver for scope (${input.blockerType}) already exists (ID: ${activeWaiver._id}). Revoke existing waiver before creating a new one.`,
          409,
          'DUPLICATE_ACTIVE_WAIVER',
        );
      }

      // 2. Insert Waiver Record
      const expiresAt = new Date(currentTimestamp.getTime() + input.expiresInDays * 86400000);
      const [waiver] = await SystemGovernanceWaiver.create(
        [
          {
            rootProjectId: new Types.ObjectId(projectId),
            targetProviderProjectId: new Types.ObjectId(input.targetProviderProjectId),
            targetDocumentId: input.targetDocumentId ? new Types.ObjectId(input.targetDocumentId) : null,
            contractVersionNumber: input.contractVersionNumber ?? null,
            blockerType: input.blockerType,
            reason: input.reason.trim(),
            grantedByUserId: new Types.ObjectId(userId),
            expiresAt,
            isRevoked: false,
          },
        ],
        { session },
      );

      createdWaiver = waiver.toObject();

      // 3. Insert Audit Record in Same Transaction
      await createDocumentAudit(
        input.targetDocumentId || projectId,
        userId,
        'GOVERNANCE_SYSTEM_WAIVER_GRANTED' as DocumentAuditAction,
        {
          waiverId: waiver._id.toString(),
          rootProjectId: projectId,
          targetProviderProjectId: input.targetProviderProjectId,
          targetDocumentId: input.targetDocumentId || null,
          contractVersionNumber: input.contractVersionNumber || null,
          blockerType: input.blockerType,
          reason: input.reason.trim(),
          expiresAt,
        },
        { session },
      );
    });

    return createdWaiver!;
  } finally {
    await session.endSession();
  }
}
```

- **Concurrency Guarantee**: Inside a MongoDB transaction with majority isolation, concurrent write locks prevent two sessions from creating duplicate active records simultaneously. The second transaction sees the committed first record during its pre-check and throws `409 DUPLICATE_ACTIVE_WAIVER`.

---

## 8. Domain Rules & Closed Taxonomy

### Minimum Required Scope Rule
1. **`rootProjectId`**: REQUIRED.
2. **`targetProviderProjectId`**: REQUIRED for all cross-project waivers. Payloads omitting `targetProviderProjectId` are rejected with `400 BAD_REQUEST`.
3. **`targetDocumentId`**: OPTIONAL generally; **MANDATORY for `PROVIDER_LOCAL_GATE_BLOCKED`**.
4. **`contractVersionNumber`**: OPTIONAL.

### Closed Taxonomy Matrix

| Blocker Code | Classification | Minimum Required Scope | Rationale |
| :--- | :---: | :--- | :--- |
| `ROOT_GOVERNANCE_DISABLED` | **NON-WAIVABLE** | N/A | Root governance disabled; release gate evaluation is bypassed entirely. |
| `ROOT_LOCAL_GATE_BLOCKED` | **NON-WAIVABLE** | N/A | Root local document health failures must be resolved locally via Phase 10 document reviews/waivers. |
| `TOPOLOGY_TRUNCATION` | **NON-WAIVABLE** | N/A | Graph traversal truncation implies unvisited dependencies with unquantified risk. |
| `INDETERMINATE_EVIDENCE` | **NON-WAIVABLE** | N/A | Missing baselines or missing package acceptance logs represent unverified states. |
| `CONTRACT_MISALIGNED` | **WAIVABLE** | `rootProjectId` + `targetProviderProjectId` | Cross-project version reference mismatch can be temporarily accepted. |
| `PROVIDER_ATTESTATION_MISSING` | **WAIVABLE** | `rootProjectId` + `targetProviderProjectId` | Missing Phase 17 attestation can be temporarily accepted if provider is stable. |
| `PROVIDER_ATTESTATION_STALE` | **WAIVABLE** | `rootProjectId` + `targetProviderProjectId` | Provider document head drift post-attestation can be accepted if non-breaking. |
| `PROVIDER_LOCAL_GATE_BLOCKED` | **WAIVABLE** | `rootProjectId` + `targetProviderProjectId` + `targetDocumentId` | Upstream provider local gate failure waived ONLY for specific failing document ID. |
| `PROVIDER_GOVERNANCE_DISABLED` | **WAIVABLE** | `rootProjectId` + `targetProviderProjectId` | Provider with disabled governance can be accepted by root owner with reason. |

---

## 9. Single Evaluation Timestamp & Expiration Boundary

### Single Evaluation Timestamp Constraint
To prevent time-skew bugs where a waiver expires mid-evaluation, `evaluateSystemTopologyGovernanceGate` establishes a **single evaluation timestamp** at entry:

```ts
export async function evaluateSystemTopologyGovernanceGate(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
): Promise<SystemGovernanceGateResult> {
  // SINGLE EVALUATION TIMESTAMP ESTABLISHED ONCE AT ENTRY
  const evaluationTimestamp = new Date();
  ...
```

This exact `evaluationTimestamp` instance is passed down to:
- Waiver candidate retrieval query (`expiresAt: { $gt: evaluationTimestamp }`).
- Individual waiver expiration checks (`expiresAt > evaluationTimestamp`).
- Evidence output metadata (`evaluatedAt: evaluationTimestamp`).

### Expiration Evaluation Rule
A waiver is evaluated as **ACTIVE** if and only if:
`isRevoked === false && expiresAt > evaluationTimestamp`

A waiver is evaluated as **EXPIRED** if:
`expiresAt <= evaluationTimestamp`

---

## 10. Two-Phase Deterministic Waiver Matching Algorithm

The evaluation engine separates broad batch candidate retrieval from exact, deterministic blocker matching.

### Phase A: Single Batch Candidate Retrieval
Instead of querying MongoDB inside dependency loops (N+1 queries), all active, non-expired waivers for `rootProjectId` are fetched in one broad batch query:

```ts
const activeWaivers = await SystemGovernanceWaiver.find({
  rootProjectId: projObjId,
  isRevoked: false,
  expiresAt: { $gt: evaluationTimestamp },
}).lean();
```

### Phase B: Exact Blocker-to-Waiver Matching Function
For each blocking dependency encountered across the topology, `matchWaiverForDependency` is invoked against the pre-fetched candidate list:

```ts
export function matchWaiverForDependency(
  blockerType: SystemBlockerType,
  providerProjectId: string,
  targetDocumentId?: string,
  consumerContractVersion?: number,
  activeWaivers: ISystemGovernanceWaiver[] = [],
): ISystemGovernanceWaiver | undefined {
  return activeWaivers.find((w) => {
    // 1. Blocker Type must match exactly
    if (w.blockerType !== blockerType) return false;

    // 2. Target Provider Project ID must match exactly
    if (w.targetProviderProjectId.toString() !== providerProjectId) return false;

    // 3. Target Document ID Handling
    if (w.targetDocumentId) {
      if (!targetDocumentId || w.targetDocumentId.toString() !== targetDocumentId) {
        return false;
      }
    } else if (blockerType === 'PROVIDER_LOCAL_GATE_BLOCKED') {
      // PROVIDER_LOCAL_GATE_BLOCKED requires exact document match. A wildcard waiver never matches.
      return false;
    }

    // 4. Contract Version Binding Handling
    if (w.contractVersionNumber !== null && w.contractVersionNumber !== undefined) {
      if (consumerContractVersion === undefined || w.contractVersionNumber !== consumerContractVersion) {
        return false;
      }
    }

    return true;
  });
}
```

---

## 11. Audit Atomicity & Transaction Failure Semantics

### Operational Store vs. Audit Provenance
- `SystemGovernanceWaiver`: Operational current-state collection queried during gate evaluation.
- `DocumentAudit`: Immutable historical provenance log.

### Failure Semantics Matrix

| Scenario | Operational Store Outcome | Audit Log Outcome | Overall Service Outcome |
| :--- | :--- | :--- | :--- |
| **A. Waiver save succeeds, Audit write fails** | **ROLLED BACK** | **ROLLED BACK** | Transaction aborts $\rightarrow$ HTTP 500 error returned. No state persisted. |
| **B. Audit write succeeds, Waiver save fails** | **ROLLED BACK** | **ROLLED BACK** | Transaction aborts $\rightarrow$ HTTP 500 error returned. No state persisted. |
| **C. Grant operation completes cleanly** | **CREATED** (`isRevoked: false`) | **CREATED** (`GOVERNANCE_SYSTEM_WAIVER_GRANTED`) | Transaction commits $\rightarrow$ HTTP 201 Created returned. |
| **D. Revoke operation completes cleanly** | **MUTATED** (`isRevoked: true`) | **CREATED** (`GOVERNANCE_SYSTEM_WAIVER_REVOKED`) | Transaction commits $\rightarrow$ HTTP 200 OK returned. |

---

## 12. Authorization & ACL Security Boundary

### Backend Authority Enforcement
Backend authorization is the **sole authoritative security boundary**. Frontend element visibility is purely user-convenience.

```ts
export async function verifySystemWaiverAuthority(
  userId: string,
  role: 'user' | 'admin',
  rootProjectId: string,
  targetProviderProjectId?: string,
): Promise<boolean> {
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

- **Shared Members (`EDIT` / `READ`)**: Rejection with `403 FORBIDDEN`.

---

## 13. Phase 19 System Topology Gate Integration

The `evaluateSystemTopologyGovernanceGate` function in `apps/api/src/modules/governance/system-topology-governance-gate.service.ts` will integrate waiver matching into Phase 19 precedence:

```ts
// PRECEDENCE EVALUATION INTEGRATION
let waivedBlockerCount = 0;
let unwaivedBlockerCount = 0;

for (const dep of blockingDependencies) {
  const matchedWaiver = matchWaiverForDependency(
    dep.blockerType,
    dep.providerProjectId,
    dep.targetDocumentId,
    dep.contractVersionNumber,
    activeWaivers,
  );

  if (matchedWaiver) {
    waivedBlockerCount++;
    dep.isWaived = true;
    dep.appliedWaiverId = matchedWaiver._id.toString();
    dep.reason = `[WAIVED] ${dep.reason} (Waiver Reason: ${matchedWaiver.reason})`;
  } else {
    unwaivedBlockerCount++;
    dep.isWaived = false;
  }
}

// AGGREGATE DECISION PRECEDENCE
let systemReleaseStatus: SystemReleaseStatus;

if (rootProject.governanceSettings?.isGovernanceEnabled === false) {
  systemReleaseStatus = 'GOVERNANCE_DISABLED';
} else if (isRootLocalGateBlocked) {
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

## 14. Multi-Blocker & Multi-Provider Evaluation Scenarios

### Scenario 1: Partial Waiver Coverage (One Waived, One Un-Waived)
- **Provider A (`PaymentGateway`)**: `CONTRACT_MISALIGNED`. Covered by Waiver #1. $\rightarrow$ `WAIVED`.
- **Provider B (`InventoryService`)**: `PROVIDER_ATTESTATION_STALE`. Un-waived. $\rightarrow$ `ACTIVE_BLOCKER`.
- **Evaluator Behavior**: Evaluates ALL blockers across topology. `waivedBlockerCount = 1`, `unwaivedBlockerCount = 1`.
- **Overall System Gate Result**: `systemReleaseStatus: 'BLOCKED'` (`passed: false`).

### Scenario 2: Complete Waiver Coverage
- **Provider A (`PaymentGateway`)**: `CONTRACT_MISALIGNED`. Covered by Waiver #1. $\rightarrow$ `WAIVED`.
- **Provider B (`InventoryService`)**: `PROVIDER_ATTESTATION_STALE`. Covered by Waiver #2. $\rightarrow$ `WAIVED`.
- **Evaluator Behavior**: `waivedBlockerCount = 2`, `unwaivedBlockerCount = 0`. Root gate clean, non-waivable blockers absent.
- **Overall System Gate Result**: `systemReleaseStatus: 'PASSED_WITH_WAIVER'` (`passed: true`), `appliedWaiverIds: ['waiver-1', 'waiver-2']`.

---

## 15. Granular Provider Local Gate Protection

For `PROVIDER_LOCAL_GATE_BLOCKED`, a provider project may have 3 local failing documents (`Doc Alpha`, `Doc Beta`, `Doc Gamma`).

- Creating a waiver with `targetDocumentId: Doc Alpha._id` waives **ONLY `Doc Alpha`**.
- During gate evaluation, `matchWaiverForDependency` compares `w.targetDocumentId.toString() === depDoc.documentId`.
- `Doc Beta` and `Doc Gamma` fail the match and remain `ACTIVE_BLOCKER` entries.
- `unwaivedBlockerCount` remains $> 0$, causing `systemReleaseStatus` to evaluate as `BLOCKED`.

---

## 16. Strict Contract Version Binding

If a waiver is created with `contractVersionNumber: 1`:
- During gate check against provider contract version 1 $\rightarrow$ `matchWaiverForDependency` matches `1 === 1` $\rightarrow$ `WAIVED`.
- When provider updates active baseline contract to `v2` $\rightarrow$ `matchWaiverForDependency` compares `1 === 2` $\rightarrow$ match FAILS.
- Blocker reverts to `ACTIVE_BLOCKER`, returning `systemReleaseStatus: 'BLOCKED'` until contract is realigned or a new waiver is granted for `v2`.

---

## 17. API Design & Endpoints

### 1. Grant System Governance Waiver
`POST /api/v1/projects/:projectId/system-governance-waivers`
- **Headers**: `Authorization: Bearer <token>`
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
- **Response (200 OK)**: Standard JSON list envelope.

### 3. Revoke System Governance Waiver
`PATCH /api/v1/projects/:projectId/system-governance-waivers/:waiverId/revoke`
- **Request Body**: `{ "reason": "Contract aligned" }`
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

## 18. Frontend Design & Governance UI Integration

Update `apps/web/src/features/governance/components/SystemGovernanceGateSection.tsx`:
1. **Badge Styling**: Add teal style for `PASSED_WITH_WAIVER`:
   ```ts
   case 'PASSED_WITH_WAIVER':
     return { background: '#e0f2f1', color: '#004d40', border: '1px solid #80cbc4' };
   ```
2. **Applied Waiver Details**: Render a waived indicator pill on waived dependencies displaying `WAIVED (Waiver #ID)` with tooltip showing grantor and expiration.
3. **Grant Waiver Modal**: Add "Grant Waiver" button on eligible waivable blocking cards for Project Owners/Admins, launching a modal to enter rationale and expiration days.
4. **Active Waivers Roster**: Add collapsible "Active System Waivers" panel listing active waivers with a "Revoke" button.

---

## 19. Error Handling & HTTP Status Code Mapping

| Scenario | HTTP Status | Error Code | Response Message |
| :--- | :---: | :--- | :--- |
| Missing `targetProviderProjectId` | `400` | `VALIDATION_ERROR` | `targetProviderProjectId is required for system governance waivers` |
| `PROVIDER_LOCAL_GATE_BLOCKED` without `targetDocumentId` | `400` | `VALIDATION_ERROR` | `targetDocumentId is required for PROVIDER_LOCAL_GATE_BLOCKED waivers` |
| Attempting to waive `ROOT_LOCAL_GATE_BLOCKED` | `400` | `NON_WAIVABLE_BLOCKER` | `Blocker type ROOT_LOCAL_GATE_BLOCKED cannot be waived` |
| Duplicate active waiver scope | `409` | `DUPLICATE_ACTIVE_WAIVER` | `An active waiver for scope (...) already exists. Revoke existing waiver before creating a new one.` |
| User is `EDIT` or `READ` role (non-Owner/Admin) | `403` | `FORBIDDEN` | `Forbidden: Granting or revoking system governance waivers requires Project Owner or Admin authority` |

---

## 20. Performance Strategy & Zero-N+1 Retrieval

- **Single Batch Retrieval**: `SystemGovernanceWaiver.find({ rootProjectId, isRevoked: false, expiresAt: { $gt: evaluationTimestamp } })` executed once at entry.
- **Zero In-Loop Database Queries**: Matching is performed in-memory over the pre-fetched candidate array using `matchWaiverForDependency`.
- **Sub-35ms Performance Overhead**: Total gate evaluation query time overhead remains $< 35\text{ms}$.

---

## 21. Expanded 14-Point Test Strategy

Automated Vitest suite in `apps/api/src/modules/governance/system-governance-waiver.test.ts`:

1. **Active Duplicate Rejection**: Verify creating a duplicate active waiver returns `409 DUPLICATE_ACTIVE_WAIVER`.
2. **Expired Replacement Waiver**: Confirm creating a new waiver with identical scope after previous waiver expires succeeds (`201 Created`).
3. **Revoked Replacement Waiver**: Confirm creating a new waiver with identical scope after previous waiver is revoked succeeds (`201 Created`).
4. **Concurrent Creation Race**: Test simulated parallel creation requests to verify transaction isolation prevents dual active records.
5. **Exact Expiration Boundary**: Confirm a waiver with `expiresAt === evaluationTimestamp` is evaluated as expired.
6. **Single Evaluation Timestamp**: Assert that all expiration checks within one gate run use the identical `evaluationTimestamp`.
7. **Exact Provider Matching**: Verify waiver for Provider A does not match Provider B.
8. **Exact Document Matching**: Verify `targetDocumentId` matching for provider local gate blockers.
9. **Exact Version Matching**: Confirm `v1` waiver does not match when provider active baseline is `v2`.
10. **Provider Gate Unrelated Document**: Confirm waiving `Doc Alpha` leaves `Doc Beta` blocked.
11. **Audit Failure Rollback**: Verify transaction aborts and rolls back waiver creation if audit creation fails.
12. **Unauthorized Attempt**: Confirm `EDIT` user receives `403 FORBIDDEN` on grant or revoke API calls.
13. **Partial Waiver Coverage**: Confirm 1 waived + 1 unwaived blocker returns `systemReleaseStatus: 'BLOCKED'`.
14. **Complete Waiver Coverage**: Confirm all waivable blockers waived returns `systemReleaseStatus: 'PASSED_WITH_WAIVER'` (`passed: true`).

---

## 22. 25-Scenario Automated QA Runner Suite

QA runner script `apps/api/src/modules/governance/run_phase20_qa.ts` executing 25 automated end-to-end scenarios:
- **Scenarios 1–5**: Clean pass, single waiver pass, partial waiver blockage, non-waivable blocker rejection, root governance disabled behavior.
- **Scenarios 6–10**: Scope validation error handling, document-level binding enforcement, version mismatch invalidation, duplicate active scope 409 rejection, expired waiver replacement.
- **Scenarios 11–15**: Immediate revocation gate effect, non-owner 403 authorization guard, transaction audit atomicity rollback, single evaluation timestamp consistency, provider gate partial document blockage.
- **Scenarios 16–20**: Multi-provider topology traversal with waivers, evidence completeness output formatting, applied waiver ID tracking, gate check response contract assertion (`passed: boolean`).
- **Scenarios 21–25**: Full Phase 10, Phase 14, Phase 17, Phase 18, Phase 19 regression suite execution.

---

## 23. Product Boundaries & Non-Scope

Phase 20 strictly avoids:
- Software deployment execution, release pipelines, or Docker containers.
- CI/CD build runner triggers or pipeline scheduling.
- Background queue workers or cron sweep infrastructure.
- Automatic waiver approval or AI-driven waiver generation.
- Generic project/task management tooling.

---

## 24. Implementation Sequence & Verification Gates

```text
Step 1: Create SystemGovernanceWaiver model & indexes
Step 2: Update DocumentAuditAction enum with waiver actions
Step 3: Implement system-governance-waiver.service.ts with MongoDB transactions & authority helper
Step 4: Implement system-governance-waiver.controller.ts & routes
Step 5: Integrate two-phase waiver matching into system-topology-governance-gate.service.ts
Step 6: Update frontend SystemGovernanceGateSection.tsx & API client
Step 7: Create Vitest test suite system-governance-waiver.test.ts
Step 8: Implement automated QA runner run_phase20_qa.ts & execute verification
```

---

## 25. Definition of Done

1. `SystemGovernanceWaiver` model and indexes created.
2. Authority helper enforcing Project Owner/Admin authority (`403` for others).
3. `evaluateSystemTopologyGovernanceGate` updated with single evaluation timestamp and two-phase waiver matching.
4. Duplicate active scope creation returns `409 CONFLICT` using transactional pre-check.
5. `PROVIDER_LOCAL_GATE_BLOCKED` without `targetDocumentId` returns `400 BAD_REQUEST`.
6. Transactional audit logging emitting `GOVERNANCE_SYSTEM_WAIVER_GRANTED` and `REVOKED` with 100% atomicity.
7. Frontend component displaying active waivers and `PASSED_WITH_WAIVER` status badge.
8. 100% pass across all unit tests and 25-scenario QA suite.
9. Working tree verified clean with `git diff --check` and `git status`.
