# Phase 20 Implementation Plan v3 — Cross-Project System Governance Exception & Policy Waiver Lifecycle Management

## 1. Executive Summary

This implementation plan defines the authoritative technical design for **Phase 20: Cross-Project System Governance Exception & Policy Waiver Lifecycle Management** in **Documan**.

Phase 20 builds directly upon **Phase 19: Cross-Project System Topology Governance Gate** (merged in commit `0da9578`). It introduces a persistent, scoped policy exception model (`SystemGovernanceWaiver`) that allows authorized Project Owners and System Admins to accept specific, time-bounded cross-project governance blockers (`CONTRACT_MISALIGNED`, `PROVIDER_ATTESTATION_MISSING`, `PROVIDER_ATTESTATION_STALE`, `PROVIDER_LOCAL_GATE_BLOCKED`, `PROVIDER_GOVERNANCE_DISABLED`) without weakening local project governance or introducing deployment orchestration.

This v3 implementation plan resolves the core concurrency and index uniqueness challenge identified in the v2 review:
1. **Database-Enforced Active Scope Serialization**: Replaces un-indexed read-then-insert checks with a **Partial Unique Database Index on Canonical Scope Keys** (`{ activeScopeKey: 1 }` with `partialFilterExpression: { scopeState: 'ACTIVE' }`), guaranteeing hard database-level serialization against concurrent creation races.
2. **Three-Way Constraint Resolution**: Solves (A) dynamic expiration (`expiresAt > evaluationTimestamp`), (B) replacement after expiration without background workers or fake audit logs, and (C) exact 409 CONFLICT concurrent duplicate rejection simultaneously via atomic state transitions (`'ACTIVE'` $\rightarrow$ `'SUPERSEDED'`).
3. **Single Evaluation Timestamp**: Enforces a single evaluation timestamp (`evaluationTimestamp = new Date()`) throughout gate evaluation runs.
4. **Two-Phase Deterministic Matching**: Formalizes two-phase matching separating batch candidate retrieval from exact scope matching.
5. **Transactional Audit Atomicity**: Establishes transactional audit atomicity ensuring 100% consistency between the operational store and `DocumentAudit`.
6. **Expanded Race Condition & QA Test Strategy**: Defines explicit parallel test scenarios verifying E11000 index collision handling to HTTP 409, expired replacement lifecycles, and complete Phase 19 gate integration.

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
                                  | (Partial Unique Index on ACTIVE scope)|
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
| 1. Batch Candidate Retrieval: { rootProjectId, scopeState: 'ACTIVE', expiresAt: { $gt: ts } }   |
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

export type WaiverScopeState = 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';

export interface ISystemGovernanceWaiver {
  rootProjectId: Types.ObjectId;
  targetProviderProjectId: Types.ObjectId;
  targetDocumentId?: Types.ObjectId | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  activeScopeKey: string;
  scopeState: WaiverScopeState;
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
    activeScopeKey: {
      type: String,
      required: true,
      index: true,
    },
    scopeState: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'SUPERSEDED'],
      required: true,
      default: 'ACTIVE',
      index: true,
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

// Canonical Scope Key Generator Utility
export function computeActiveScopeKey(
  rootProjectId: string,
  targetProviderProjectId: string,
  blockerType: SystemBlockerType,
  targetDocumentId?: string | null,
  contractVersionNumber?: number | null,
): string {
  const docPart = targetDocumentId ? targetDocumentId.toString() : 'ALL_DOCS';
  const verPart = contractVersionNumber !== null && contractVersionNumber !== undefined ? `v${contractVersionNumber}` : 'ANY_VER';
  return `${rootProjectId}:${targetProviderProjectId}:${docPart}:${verPart}:${blockerType}`;
}
```

---

## 6. Unique Index & Dynamic Expiration Resolution

### Why Read-Then-Insert Transactions Alone Fail Unique Constraints
Executing a `findOne()` check inside a MongoDB transaction followed by a `create()` insert does NOT act as a database unique constraint. If two concurrent HTTP requests execute `findOne()` simultaneously before either transaction commits, both reads observe "no existing active waiver" (read skew / phantom read), and both transactions attempt to insert. Without a database unique index, both inserts would succeed, producing two simultaneous active waivers for the exact same scope tuple!

### The Selected Design: Scope State Machine + Partial Unique Index

To simultaneously satisfy dynamic expiration, replacement after expiration, and database-enforced concurrency serialization, Documan adopts a **Scope State Machine + Partial Unique Index Design**:

#### Index Definition
```ts
systemGovernanceWaiverSchema.index(
  { activeScopeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { scopeState: 'ACTIVE' },
  },
);
```

#### How the Three-Way Constraint Is Solved

1. **Requirement A: Dynamic Expiration**:
   When `evaluateSystemTopologyGovernanceGate` executes, active waivers are retrieved using:
   `{ rootProjectId, scopeState: 'ACTIVE', isRevoked: false, expiresAt: { $gt: evaluationTimestamp } }`.
   Passing time requires zero database mutations and zero background workers.

2. **Requirement B: Replacement After Expiration**:
   When an authorized user requests a new waiver for a scope whose previous waiver has expired (`expiresAt <= currentTimestamp`):
   - The creation service finds the existing record with `activeScopeKey` and `scopeState === 'ACTIVE'`.
   - Since `existingWaiver.expiresAt <= currentTimestamp`, the service atomically transitions the old record:
     `scopeState = 'SUPERSEDED'`.
   - Changing `scopeState` from `'ACTIVE'` to `'SUPERSEDED'` frees the partial unique index slot for `activeScopeKey`!
   - The new waiver is inserted with `scopeState: 'ACTIVE'`.
   - The historical record remains intact with full provenance, and `DocumentAudit` receives a single `GOVERNANCE_SYSTEM_WAIVER_GRANTED` event for the new waiver. Zero fake expiration audit events are generated.

3. **Requirement C: Concurrent Duplicate Prevention**:
   Because MongoDB enforces `unique: true` on `{ activeScopeKey: 1 }` where `scopeState === 'ACTIVE'`, at most **ONE** document in the database can have `scopeState === 'ACTIVE'` for a given `activeScopeKey` at any instant!
   - If Request A and Request B concurrently attempt to create an active waiver for the same `activeScopeKey`, MongoDB's storage engine enforces hard serialization at the index layer.
   - Request A succeeds.
   - Request B triggers an E11000 duplicate key exception from MongoDB!
   - The service/controller catches E11000 and returns **HTTP 409 CONFLICT (`DUPLICATE_ACTIVE_WAIVER`)**.

---

## 7. Concurrent Creation & Race Condition Resolution

### Service Implementation with E11000 Catch

```ts
export async function grantSystemGovernanceWaiver(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: GrantWaiverInput,
): Promise<ISystemGovernanceWaiver> {
  const currentTimestamp = new Date();
  await verifySystemWaiverAuthority(userId, role, projectId, input.targetProviderProjectId);

  const activeScopeKey = computeActiveScopeKey(
    projectId,
    input.targetProviderProjectId,
    input.blockerType,
    input.targetDocumentId,
    input.contractVersionNumber,
  );

  const session = await mongoose.startSession();
  try {
    let createdWaiver: ISystemGovernanceWaiver | null = null;

    await session.withTransaction(async () => {
      // 1. Check existing record with active scope key
      const existingActiveWaiver = await SystemGovernanceWaiver.findOne({
        activeScopeKey,
        scopeState: 'ACTIVE',
      }).session(session);

      if (existingActiveWaiver) {
        // If un-revoked and still valid -> Block creation (409 CONFLICT)
        if (!existingActiveWaiver.isRevoked && existingActiveWaiver.expiresAt > currentTimestamp) {
          throw new AppError(
            `An active waiver for scope (${input.blockerType}) already exists (ID: ${existingActiveWaiver._id}). Revoke existing waiver before creating a new one.`,
            409,
            'DUPLICATE_ACTIVE_WAIVER',
          );
        }

        // If expired -> Transition existing record to SUPERSEDED to free unique index slot
        if (existingActiveWaiver.expiresAt <= currentTimestamp) {
          await SystemGovernanceWaiver.updateOne(
            { _id: existingActiveWaiver._id, scopeState: 'ACTIVE' },
            { $set: { scopeState: 'SUPERSEDED' } },
            { session },
          );
        }
      }

      // 2. Insert new waiver with scopeState = 'ACTIVE'
      const expiresAt = new Date(currentTimestamp.getTime() + input.expiresInDays * 86400000);
      const [waiver] = await SystemGovernanceWaiver.create(
        [
          {
            rootProjectId: new Types.ObjectId(projectId),
            targetProviderProjectId: new Types.ObjectId(input.targetProviderProjectId),
            targetDocumentId: input.targetDocumentId ? new Types.ObjectId(input.targetDocumentId) : null,
            contractVersionNumber: input.contractVersionNumber ?? null,
            blockerType: input.blockerType,
            activeScopeKey,
            scopeState: 'ACTIVE',
            reason: input.reason.trim(),
            grantedByUserId: new Types.ObjectId(userId),
            expiresAt,
            isRevoked: false,
          },
        ],
        { session },
      );

      createdWaiver = waiver.toObject();

      // 3. Write Audit Event in Same Transaction
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
  } catch (err: unknown) {
    // Intercept E11000 Mongo Index Collision on activeScopeKey (Concurrent Race)
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      throw new AppError(
        `An active waiver for scope (${input.blockerType}) was created concurrently by another transaction.`,
        409,
        'DUPLICATE_ACTIVE_WAIVER',
      );
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
```

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
`isRevoked === false && scopeState === 'ACTIVE' && expiresAt > evaluationTimestamp`

A waiver is evaluated as **EXPIRED** if:
`expiresAt <= evaluationTimestamp`

---

## 10. Two-Phase Deterministic Waiver Matching Algorithm

The evaluation engine separates broad batch candidate retrieval from exact, deterministic blocker matching.

### Stage A: Single Batch Candidate Retrieval
Instead of querying MongoDB inside dependency loops (N+1 queries), all active, non-expired waivers for `rootProjectId` are fetched in one broad batch query:

```ts
const activeWaivers = await SystemGovernanceWaiver.find({
  rootProjectId: projObjId,
  scopeState: 'ACTIVE',
  isRevoked: false,
  expiresAt: { $gt: evaluationTimestamp },
}).lean();
```

### Stage B: Exact Blocker-to-Waiver Matching Function
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
| **C. Grant operation completes cleanly** | **CREATED** (`scopeState: 'ACTIVE'`) | **CREATED** (`GOVERNANCE_SYSTEM_WAIVER_GRANTED`) | Transaction commits $\rightarrow$ HTTP 201 Created returned. |
| **D. Revoke operation completes cleanly** | **MUTATED** (`scopeState: 'REVOKED'`) | **CREATED** (`GOVERNANCE_SYSTEM_WAIVER_REVOKED`) | Transaction commits $\rightarrow$ HTTP 200 OK returned. |

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
      "activeScopeKey": "60d5ec49b1a2c8001f8e1111:60d5ec49b1a2c8001f8e1234:60d5ec49b1a2c8001f8e5678:v1:PROVIDER_LOCAL_GATE_BLOCKED",
      "scopeState": "ACTIVE",
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
      "scopeState": "REVOKED",
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
| Duplicate active waiver scope / Concurrency collision | `409` | `DUPLICATE_ACTIVE_WAIVER` | `An active waiver for scope (...) already exists. Revoke existing waiver before creating a new one.` |
| User is `EDIT` or `READ` role (non-Owner/Admin) | `403` | `FORBIDDEN` | `Forbidden: Granting or revoking system governance waivers requires Project Owner or Admin authority` |

---

## 20. Performance Strategy & Zero-N+1 Retrieval

- **Single Batch Retrieval**: `SystemGovernanceWaiver.find({ rootProjectId, scopeState: 'ACTIVE', isRevoked: false, expiresAt: { $gt: evaluationTimestamp } })` executed once at entry.
- **Zero In-Loop Database Queries**: Matching is performed in-memory over the pre-fetched candidate array using `matchWaiverForDependency`.
- **Sub-35ms Performance Overhead**: Total gate evaluation query time overhead remains $< 35\text{ms}$.

---

## 21. Race Condition & Expiration Test Strategy

Automated Vitest suite in `apps/api/src/modules/governance/system-governance-waiver.test.ts`:

### 1. Concurrent Creation Race Test Scenario
- Using `Promise.all([grantSystemGovernanceWaiver(...), grantSystemGovernanceWaiver(...)])` with identical scope payloads.
- **Assertion**: Exactly one promise resolves with `201 Created`; the competing promise rejects with `409 DUPLICATE_ACTIVE_WAIVER`. Database contains exactly **ONE** document with `scopeState: 'ACTIVE'`.

### 2. Expired Waiver Replacement Test Scenario
1. Create Waiver A with `expiresInDays: 1`.
2. Move evaluation clock forward past `A.expiresAt`.
3. Create Waiver B with identical scope tuple.
4. **Assertion**: Waiver B creation succeeds (`201 Created`). Waiver A is updated to `scopeState: 'SUPERSEDED'`. Gate check ignores A and applies B. Zero background workers and zero fake audit events executed.

### 3. Revoked Waiver Replacement Test Scenario
1. Create Waiver A.
2. Revoke Waiver A (`PATCH /revoke`).
3. Create Waiver B with identical scope tuple.
4. **Assertion**: Waiver B creation succeeds (`201 Created`). Gate check ignores A and applies B.

---

## 22. 25-Scenario Automated QA Runner Suite

QA runner script `apps/api/src/modules/governance/run_phase20_qa.ts` executing 25 automated end-to-end scenarios:
- **Scenarios 1–5**: Clean pass, single waiver pass, partial waiver blockage, non-waivable blocker rejection, root governance disabled behavior.
- **Scenarios 6–10**: Scope validation error handling, document-level binding enforcement, version mismatch invalidation, sequential duplicate 409 rejection, concurrent duplicate race 409 rejection.
- **Scenarios 11–15**: Expired replacement lifecycle, revoked replacement lifecycle, immediate revocation gate effect, non-owner 403 authorization guard, transaction audit atomicity rollback.
- **Scenarios 16–20**: Single evaluation timestamp consistency, provider gate partial document blockage, multi-provider topology traversal with waivers, evidence completeness output formatting, gate check response contract assertion (`passed: boolean`).
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
Step 1: Create SystemGovernanceWaiver model & partial unique index
Step 2: Update DocumentAuditAction enum with waiver actions
Step 3: Implement system-governance-waiver.service.ts with scope state machine & transactions
Step 4: Implement system-governance-waiver.controller.ts & routes
Step 5: Integrate two-phase waiver matching into system-topology-governance-gate.service.ts
Step 6: Update frontend SystemGovernanceGateSection.tsx & API client
Step 7: Create Vitest test suite system-governance-waiver.test.ts (including concurrency race tests)
Step 8: Implement automated QA runner run_phase20_qa.ts & execute verification
```

---

## 25. Definition of Done

1. `SystemGovernanceWaiver` model created with `activeScopeKey` and partial unique index on `scopeState: 'ACTIVE'`.
2. Authority helper enforcing Project Owner/Admin authority (`403` for others).
3. `evaluateSystemTopologyGovernanceGate` updated with single evaluation timestamp and two-phase waiver matching.
4. Concurrent creation race condition deterministically returns `409 CONFLICT` via database partial index collision.
5. Expired waiver replacement succeeds without background workers or fake audit logs.
6. `PROVIDER_LOCAL_GATE_BLOCKED` without `targetDocumentId` returns `400 BAD_REQUEST`.
7. Transactional audit logging emitting `GOVERNANCE_SYSTEM_WAIVER_GRANTED` and `REVOKED` with 100% atomicity.
8. Frontend component displaying active waivers and `PASSED_WITH_WAIVER` status badge.
9. 100% pass across all unit tests and 25-scenario QA suite.
10. Working tree verified clean with `git diff --check` and `git status`.
