import type {
  AssuranceCalculatorContext,
  DocumentAssuranceResult,
  AssuranceCheckResult,
  GovernanceWaiverSummary,
  AssuranceStatus,
  AssuranceRemediation,
} from './assurance.types.js';

export function calculateDocumentAssurance(
  context: AssuranceCalculatorContext,
): DocumentAssuranceResult {
  const now = context.now || new Date();
  const { document, project, reviews = [], waiverEvents = [], evidenceCoverage, knowledgeRisk } = context;

  const isGovernanceEnabled = project?.governanceSettings?.isGovernanceEnabled ?? true;
  const maxDays = project?.governanceSettings?.maxUnreviewedDays ?? 90;

  const gateSettings = {
    allowStale: project?.releaseGateSettings?.allowStale ?? false,
    allowPendingReviews: project?.releaseGateSettings?.allowPendingReviews ?? false,
    allowDeprecated: project?.releaseGateSettings?.allowDeprecated ?? false,
    minFreshnessPercentage: project?.releaseGateSettings?.minFreshnessPercentage ?? 80,
    allowOrphanedApiLinks: project?.releaseGateSettings?.allowOrphanedApiLinks ?? false,
    allowDeprecatedApiEndpoints: project?.releaseGateSettings?.allowDeprecatedApiEndpoints ?? true,
    allowUnverifiedImpacts: project?.releaseGateSettings?.allowUnverifiedImpacts ?? true,
  };

  // 1. Process active waivers from DocumentAudit events
  const waiverMap = new Map<string, GovernanceWaiverSummary>();

  for (const event of waiverEvents) {
    const meta = event.metadata || {};
    const checkId = typeof meta.checkId === 'string' ? meta.checkId : '';
    if (!checkId) continue;

    if (event.action === 'GOVERNANCE_WAIVER_GRANTED') {
      const expiresAt = meta.expiresAt ? new Date(meta.expiresAt as string | number | Date) : new Date(now.getTime() + 30 * 86400000);
      const docVer = typeof meta.documentVersion === 'number' ? meta.documentVersion : document.version;
      const isExpired = now.getTime() > expiresAt.getTime();
      const isVersionInvalidated = docVer !== document.version;

      waiverMap.set(checkId, {
        checkId,
        reason: typeof meta.reason === 'string' ? meta.reason : 'Governance exception granted',
        grantedBy: {
          id: event.user?.id || (typeof meta.grantedById === 'string' ? meta.grantedById : 'system'),
          name: event.user?.name || 'Governance Admin',
        },
        grantedAt: event.createdAt,
        expiresAt,
        documentVersion: docVer,
        isExpired,
        isVersionInvalidated,
      });
    } else if (event.action === 'GOVERNANCE_WAIVER_REVOKED') {
      waiverMap.delete(checkId);
    }
  }

  const activeWaiversList = Array.from(waiverMap.values());

  // 2. Disabled Governance Fallback
  if (!isGovernanceEnabled) {
    const disabledChecks: AssuranceCheckResult[] = [
      {
        checkId: 'chk_governance_enabled',
        name: 'Project Governance Enablement',
        category: 'GOVERNANCE_FRESHNESS',
        severity: 'INFO',
        status: 'NOT_APPLICABLE',
        isWaivable: false,
        actualValue: 'DISABLED',
        expectedValue: 'ENABLED',
        reason: 'Project governance gates are disabled; no automated assurance decision is enforced.',
      },
    ];

    return {
      documentId: document.id,
      evaluatedAction: 'APPROVAL_RELEASE_READINESS',
      status: 'GOVERNANCE_DISABLED',
      evaluatedAt: now,
      summary: {
        totalChecks: disabledChecks.length,
        passedCount: 0,
        warningCount: 0,
        failedCount: 0,
        waivedCount: 0,
      },
      checks: disabledChecks,
      blockingReasons: [],
      warnings: [],
      remediations: [],
      activeWaivers: activeWaiversList,
    };
  }

  const checks: AssuranceCheckResult[] = [];

  // Helper to resolve waiver applicability
  const applyWaiverIfPresent = (check: AssuranceCheckResult) => {
    if (!check.isWaivable) return check;
    const waiver = waiverMap.get(check.checkId);
    if (waiver) {
      check.waiver = waiver;
      if (!waiver.isExpired && !waiver.isVersionInvalidated && (check.status === 'FAILED' || check.status === 'WARNING')) {
        check.status = 'WAIVED';
      }
    }
    return check;
  };

  // CHECK 1: Evidence Coverage & Integrity
  const covScore = evidenceCoverage?.coverageScore ?? 100;
  const orphanedCnt = evidenceCoverage?.orphanedCount ?? 0;
  const isCovPassed = covScore >= gateSettings.minFreshnessPercentage && (gateSettings.allowOrphanedApiLinks || orphanedCnt === 0);
  const covSeverity = (!gateSettings.allowOrphanedApiLinks && orphanedCnt > 0) || covScore < gateSettings.minFreshnessPercentage ? 'BLOCKING' : 'WARNING';

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_evidence_coverage',
      name: 'Minimum Technical Evidence Coverage',
      category: 'EVIDENCE_INTEGRITY',
      severity: covSeverity,
      status: isCovPassed ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: `${covScore}% (Orphaned: ${orphanedCnt})`,
      expectedValue: `>= ${gateSettings.minFreshnessPercentage}% (Orphaned: 0)`,
      reason: isCovPassed
        ? `Technical evidence coverage (${covScore}%) meets policy threshold.`
        : `Evidence coverage (${covScore}%) is below threshold of ${gateSettings.minFreshnessPercentage}% or contains orphaned API links (${orphanedCnt}).`,
      remediation: isCovPassed
        ? undefined
        : {
            code: 'RESOLVE_EVIDENCE_GAPS',
            label: 'Resolve Evidence Gaps',
            detail: 'Link active API endpoints or resolve orphaned dependency references.',
          },
    }),
  );

  // CHECK 2: Upstream Impact Verification
  const needsVerification = document.impactVerification?.needsVerification ?? false;
  const activeSources = document.impactVerification?.activeImpactSources || [];
  const isUpstreamPassed = !needsVerification && activeSources.length === 0;
  const upstreamSeverity = gateSettings.allowUnverifiedImpacts ? 'WARNING' : 'BLOCKING';

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_upstream_freshness',
      name: 'Upstream Dependency Change Verification',
      category: 'UPSTREAM_FRESHNESS',
      severity: upstreamSeverity,
      status: isUpstreamPassed ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: isUpstreamPassed ? 'VERIFIED' : `UNVERIFIED (${activeSources.length} source[s])`,
      expectedValue: 'VERIFIED',
      reason: isUpstreamPassed
        ? 'All upstream document dependency changes have been verified.'
        : 'Document has unverified upstream dependency changes requiring re-verification.',
      remediation: isUpstreamPassed
        ? undefined
        : {
            code: 'VERIFY_UPSTREAM_IMPACT',
            label: 'Verify Upstream Impact',
            detail: 'Review upstream document changes and mark impact verification complete.',
          },
    }),
  );

  // CHECK 3: Deprecated API Endpoint Usage
  const staleEpCount = evidenceCoverage?.staleCount ?? 0;
  const isApiDriftPassed = staleEpCount === 0;
  const apiDriftSeverity = gateSettings.allowDeprecatedApiEndpoints ? 'WARNING' : 'BLOCKING';

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_deprecated_api_endpoints',
      name: 'Deprecated API Endpoint References',
      category: 'API_DRIFT',
      severity: apiDriftSeverity,
      status: isApiDriftPassed ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: `${staleEpCount} deprecated endpoint(s)`,
      expectedValue: '0 deprecated endpoints',
      reason: isApiDriftPassed
        ? 'No deprecated API endpoints are referenced by this document.'
        : `Document references ${staleEpCount} deprecated API endpoint(s).`,
      remediation: isApiDriftPassed
        ? undefined
        : {
            code: 'UPDATE_DEPRECATED_API_LINKS',
            label: 'Update Deprecated API Links',
            detail: 'Update document references to cite active non-deprecated OpenAPI endpoints.',
          },
    }),
  );

  // CHECK 4: Governance Review Freshness
  const lastReviewed = document.lastReviewedAt || document.createdAt;
  const daysElapsed = Math.floor((now.getTime() - new Date(lastReviewed).getTime()) / (1000 * 60 * 60 * 24));
  const isFresh = document.status !== 'STALE' && daysElapsed <= maxDays;
  const freshSeverity = gateSettings.allowStale ? 'WARNING' : 'BLOCKING';

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_governance_freshness',
      name: 'Governance Review Freshness',
      category: 'GOVERNANCE_FRESHNESS',
      severity: freshSeverity,
      status: isFresh ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: `${daysElapsed} day(s) since review`,
      expectedValue: `<= ${maxDays} day(s)`,
      reason: isFresh
        ? `Document review age (${daysElapsed} days) is within max threshold of ${maxDays} days.`
        : `Document has not been reviewed for ${daysElapsed} days (exceeds threshold of ${maxDays} days).`,
      remediation: isFresh
        ? undefined
        : {
            code: 'CONDUCT_GOVERNANCE_REVIEW',
            label: 'Conduct Governance Review',
            detail: 'Perform governance review and confirm document freshness.',
          },
    }),
  );

  // CHECK 5: Version Alignment (CRITICAL CORRECTION: Independent BLOCKING check)
  const lastApprovedVer = document.lastApprovedVersion;
  const isVersionAligned = lastApprovedVer != null && document.version === lastApprovedVer;

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_version_alignment',
      name: 'Document Content & Approval Version Alignment',
      category: 'HUMAN_APPROVAL',
      severity: 'BLOCKING',
      status: isVersionAligned ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: `v${document.version} (Last Approved: v${lastApprovedVer ?? 'none'})`,
      expectedValue: `v${document.version}`,
      reason: isVersionAligned
        ? `Current content version (v${document.version}) matches last approved version.`
        : `Current content version (v${document.version}) differs from last approved version (v${lastApprovedVer ?? 'none'}).`,
      remediation: isVersionAligned
        ? undefined
        : {
            code: 'APPROVE_CURRENT_VERSION',
            label: 'Approve Current Version',
            detail: 'Submit current content version for reviewer approval.',
          },
    }),
  );

  // CHECK 6: Approval Lifecycle Status
  const isStatusApproved = document.status === 'APPROVED';
  const statusSeverity = document.status === 'DEPRECATED' && gateSettings.allowDeprecated ? 'WARNING' : 'BLOCKING';

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_approval_status',
      name: 'Document Lifecycle Approval Status',
      category: 'HUMAN_APPROVAL',
      severity: statusSeverity,
      status: isStatusApproved ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: document.status,
      expectedValue: 'APPROVED',
      reason: isStatusApproved
        ? 'Document is in APPROVED lifecycle state.'
        : `Document status is currently ${document.status} (expected APPROVED).`,
      remediation: isStatusApproved
        ? undefined
        : {
            code: 'UPDATE_DOCUMENT_STATUS',
            label: 'Update Document Status',
            detail: 'Complete governance review to transition document to APPROVED status.',
          },
    }),
  );

  // CHECK 7: Pending Review Requests
  const pendingReviews = reviews.filter((r) => r.status === 'PENDING');
  const isPendingPassed = pendingReviews.length === 0;
  const pendingSeverity = gateSettings.allowPendingReviews ? 'WARNING' : 'BLOCKING';

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_pending_reviews',
      name: 'Active Pending Reviewer Requests',
      category: 'HUMAN_APPROVAL',
      severity: pendingSeverity,
      status: isPendingPassed ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: `${pendingReviews.length} pending review(s)`,
      expectedValue: '0 pending reviews',
      reason: isPendingPassed
        ? 'No reviewer requests are pending.'
        : `Document has ${pendingReviews.length} active pending review request(s).`,
      remediation: isPendingPassed
        ? undefined
        : {
            code: 'COMPLETE_PENDING_REVIEWS',
            label: 'Complete Pending Reviews',
            detail: 'Assigned reviewer must complete outstanding review request.',
          },
    }),
  );

  // CHECK 8: Unresolved Changes Requested
  const changesRequested = reviews.filter((r) => r.status === 'CHANGES_REQUESTED');
  const isChangesPassed = changesRequested.length === 0;

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_changes_requested',
      name: 'Unresolved Reviewer Changes Requested',
      category: 'HUMAN_APPROVAL',
      severity: 'BLOCKING',
      status: isChangesPassed ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: `${changesRequested.length} unresolved request(s)`,
      expectedValue: '0 unresolved requests',
      reason: isChangesPassed
        ? 'No reviewer changes requested.'
        : `Document has ${changesRequested.length} review request(s) with CHANGES_REQUESTED.`,
      remediation: isChangesPassed
        ? undefined
        : {
            code: 'RESOLVE_REQUESTED_CHANGES',
            label: 'Resolve Requested Changes',
            detail: 'Address reviewer feedback and resubmit for review.',
          },
    }),
  );

  // CHECK 9: Initial Approval History
  const isEverApproved = lastApprovedVer != null && lastApprovedVer > 0;

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_never_approved',
      name: 'Approved Version History Provenance',
      category: 'HUMAN_APPROVAL',
      severity: 'BLOCKING',
      status: isEverApproved ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: isEverApproved ? `v${lastApprovedVer}` : 'Never approved',
      expectedValue: 'At least 1 approved version',
      reason: isEverApproved
        ? `Document has proven approval history (last approved version: v${lastApprovedVer}).`
        : 'Document has never achieved formal reviewer approval.',
      remediation: isEverApproved
        ? undefined
        : {
            code: 'CONDUCT_INITIAL_APPROVAL',
            label: 'Conduct Initial Approval',
            detail: 'Obtain formal human approval for initial document version.',
          },
    }),
  );

  // CHECK 10: Stewardship & Ownership (NON-WAIVABLE)
  const contactActive = knowledgeRisk?.effectiveContact?.isActive ?? true;
  const isStewardshipPassed = contactActive;

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_stewardship_active',
      name: 'Active Document Owner / Steward Assignment',
      category: 'STEWARDSHIP',
      severity: 'WARNING',
      status: isStewardshipPassed ? 'PASSED' : 'FAILED',
      isWaivable: false,
      actualValue: isStewardshipPassed ? 'ACTIVE' : 'INACTIVE_OR_UNASSIGNED',
      expectedValue: 'ACTIVE',
      reason: isStewardshipPassed
        ? `Document has an active owner/steward assigned (${knowledgeRisk?.effectiveContact?.name || 'Assigned'}).`
        : 'Document owner or steward account is inactive or missing.',
      remediation: isStewardshipPassed
        ? undefined
        : {
            code: 'ASSIGN_ACTIVE_STEWARD',
            label: 'Assign Active Steward',
            detail: 'Re-assign document ownership or stewardship to an active team member.',
          },
    }),
  );

  // CHECK 11: Knowledge Risk Exposure
  const riskLevel = knowledgeRisk?.riskLevel || 'LOW';
  const isRiskPassed = riskLevel !== 'HIGH' && riskLevel !== 'CRITICAL';
  const riskSeverity = riskLevel === 'CRITICAL' ? 'BLOCKING' : 'WARNING';

  checks.push(
    applyWaiverIfPresent({
      checkId: 'chk_knowledge_risk',
      name: 'Technical Knowledge Risk Exposure',
      category: 'KNOWLEDGE_RISK',
      severity: riskSeverity,
      status: isRiskPassed ? 'PASSED' : 'FAILED',
      isWaivable: true,
      actualValue: riskLevel,
      expectedValue: 'LOW or MEDIUM',
      reason: isRiskPassed
        ? `Technical knowledge risk level (${riskLevel}) is within acceptable parameters.`
        : `Technical knowledge risk level is ${riskLevel} (exceeds policy safety limits).`,
      remediation: isRiskPassed
        ? undefined
        : {
            code: 'REDUCE_KNOWLEDGE_RISK',
            label: 'Reduce Knowledge Risk',
            detail: 'Address risk drivers such as outdated links or unassigned stewardship to lower risk score.',
          },
    }),
  );

  // 3. Compute overall assurance status
  let passedCount = 0;
  let warningCount = 0;
  let failedCount = 0;
  let waivedCount = 0;

  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const remediations: AssuranceRemediation[] = [];

  for (const c of checks) {
    if (c.status === 'PASSED') {
      passedCount += 1;
    } else if (c.status === 'WAIVED') {
      waivedCount += 1;
    } else if (c.status === 'FAILED') {
      failedCount += 1;
      if (c.severity === 'BLOCKING') {
        blockingReasons.push(c.reason);
      } else {
        warnings.push(c.reason);
      }
      if (c.remediation) {
        remediations.push(c.remediation);
      }
    } else if (c.status === 'WARNING') {
      warningCount += 1;
      warnings.push(c.reason);
      if (c.remediation) {
        remediations.push(c.remediation);
      }
    }
  }

  let status: AssuranceStatus = 'READY';
  if (blockingReasons.length > 0) {
    status = 'BLOCKED';
  } else if (warnings.length > 0 || failedCount > 0) {
    status = 'WARNING';
  }

  return {
    documentId: document.id,
    evaluatedAction: 'APPROVAL_RELEASE_READINESS',
    status,
    evaluatedAt: now,
    summary: {
      totalChecks: checks.length,
      passedCount,
      warningCount,
      failedCount,
      waivedCount,
    },
    checks,
    blockingReasons,
    warnings,
    remediations,
    activeWaivers: activeWaiversList,
  };
}
