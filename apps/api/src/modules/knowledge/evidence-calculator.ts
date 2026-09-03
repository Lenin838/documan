import type {
  DerivedEvidenceItem,
  EvidenceCoverageContext,
  EvidenceCoverageLabel,
  EvidenceCoverageResult,
  RemediationItem,
} from './evidence.types.js';

export function calculateEvidenceCoverage(
  context: EvidenceCoverageContext,
): EvidenceCoverageResult {
  const {
    documentId,
    documentTitle: _documentTitle,
    currentVersion,
    lastApprovedVersion,
    status,
    needsVerification,
    activeImpactSources = [],
    endpoints = [],
    dependencies = [],
    references = [],
    versions = [],
    governance,
    evaluationAt,
  } = context;

  const items: DerivedEvidenceItem[] = [];

  // 1. API Endpoint Evidence
  for (const ep of endpoints) {
    let state: DerivedEvidenceItem['state'] = 'VERIFIED';
    let stateReason = 'Active linked API endpoint in specification';

    if (ep.status === 'ORPHANED') {
      state = 'ORPHANED';
      stateReason = 'API endpoint path/method removed from specification';
    } else if (ep.isDeprecated) {
      state = 'STALE';
      stateReason = 'Linked API endpoint has been marked deprecated in specification';
    }

    items.push({
      syntheticId: `ep_link_${ep.linkId}`,
      category: 'API_ENDPOINT',
      title: `${ep.method} ${ep.path}`,
      summary: ep.summary || undefined,
      state,
      stateReason,
      sourceId: documentId,
      metadata: {
        endpointId: ep.endpointId,
        linkId: ep.linkId,
        method: ep.method,
        path: ep.path,
      },
    });
  }

  // 2. Document Dependency Evidence (for DEPENDS_ON and REFERENCES)
  for (const dep of dependencies) {
    if (dep.type !== 'DEPENDS_ON' && dep.type !== 'REFERENCES') {
      continue;
    }

    let state: DerivedEvidenceItem['state'] = 'VERIFIED';
    let stateReason = 'Target document is approved and up-to-date';

    // Match exact targetDocumentId against activeImpactSources
    const matchedImpact = activeImpactSources.find(
      (src) => src.upstreamDocumentId === dep.targetDocumentId,
    );

    if (dep.isDeleted) {
      state = 'ORPHANED';
      stateReason = 'Target document has been soft-deleted';
    } else if (matchedImpact) {
      state = 'STALE';
      stateReason = `Upstream target document was modified (v${matchedImpact.upstreamVersionNumber || 'new'}) [${matchedImpact.changeType}]`;
    } else if (needsVerification && (dep.targetStatus === 'STALE' || dep.targetStatus === 'DEPRECATED')) {
      state = 'STALE';
      stateReason = `Target document is in ${dep.targetStatus} status`;
    } else if (dep.targetStatus === 'STALE' || dep.targetStatus === 'DEPRECATED') {
      state = 'STALE';
      stateReason = `Target document status is ${dep.targetStatus}`;
    } else if (dep.targetStatus === 'DRAFT' || dep.targetStatus === 'IN_REVIEW') {
      state = 'UNVERIFIED';
      stateReason = `Target document is unapproved (${dep.targetStatus})`;
    }

    items.push({
      syntheticId: `dep_rel_${dep.relationshipId}`,
      category: 'DOCUMENT_DEPENDENCY',
      title: dep.targetTitle,
      summary: `Dependency (${dep.type})`,
      state,
      stateReason,
      sourceId: documentId,
      targetId: dep.targetDocumentId,
      targetVersion: dep.targetVersion,
      metadata: {
        relationshipId: dep.relationshipId,
        relationshipType: dep.type,
      },
    });
  }

  // 3. External Reference Evidence
  for (const ref of references) {
    const isValidUrl = Boolean(ref.url && ref.url.trim().length > 0);
    const state: DerivedEvidenceItem['state'] = isValidUrl ? 'VERIFIED' : 'UNVERIFIED';
    const stateReason = isValidUrl
      ? 'Valid external technical reference'
      : 'Technical reference URL requires validation';

    items.push({
      syntheticId: `ref_${ref.referenceId}`,
      category: 'EXTERNAL_REFERENCE',
      title: ref.title,
      summary: `${ref.type}: ${ref.url}`,
      state,
      stateReason,
      sourceId: documentId,
      metadata: {
        referenceId: ref.referenceId,
        type: ref.type,
        url: ref.url,
      },
    });
  }

  // 4. Content Version Snapshot Evidence
  const currentSnapshot = versions.find((v) => v.versionNumber === currentVersion);
  if (currentSnapshot) {
    let state: DerivedEvidenceItem['state'] = 'VERIFIED';
    let stateReason = 'Content snapshot matches approved document version';

    if (!lastApprovedVersion) {
      state = 'UNVERIFIED';
      stateReason = 'Content snapshot exists but document has never been approved';
    } else if (currentVersion > lastApprovedVersion) {
      state = 'STALE';
      stateReason = `Content updated to v${currentVersion} since last approved version v${lastApprovedVersion}`;
    }

    items.push({
      syntheticId: `ver_${documentId}_v${currentVersion}`,
      category: 'VERSION_SNAPSHOT',
      title: `Content Snapshot v${currentVersion}`,
      summary: `Snapshot created by ${currentSnapshot.createdByName}`,
      state,
      stateReason,
      sourceId: documentId,
      sourceVersion: currentVersion,
      verifiedBy: {
        id: currentSnapshot.createdById,
        name: currentSnapshot.createdByName,
      },
      verifiedAt: currentSnapshot.createdAt,
    });
  }

  // 5. Governance Review Evidence
  if (governance !== null) {
    let govState: DerivedEvidenceItem['state'] = 'VERIFIED';
    let govStateReason = 'Document status is approved and governed';

    const isGovernanceEnabled = governance?.isGovernanceEnabled ?? true;
    const maxDays = governance?.maxUnreviewedDays ?? 90;
    let isUnreviewedStale = false;

    if (governance?.lastReviewedAt) {
      const diffMs = evaluationAt.getTime() - new Date(governance.lastReviewedAt).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (isGovernanceEnabled && diffDays > maxDays) {
        isUnreviewedStale = true;
      }
    }

    if (status === 'APPROVED' && lastApprovedVersion === currentVersion && !isUnreviewedStale) {
      govState = 'VERIFIED';
      govStateReason = 'Document version is approved and governed';
    } else if (status === 'STALE' || isUnreviewedStale) {
      govState = 'STALE';
      govStateReason = isUnreviewedStale
        ? `Document has not been reviewed within max allowed ${maxDays} days`
        : 'Document status is explicitly STALE';
    } else if (status === 'DRAFT' || status === 'IN_REVIEW') {
      govState = 'UNVERIFIED';
      govStateReason = `Document is in ${status} status and requires review`;
    }

    items.push({
      syntheticId: `gov_${documentId}`,
      category: 'GOVERNANCE_REVIEW',
      title: `Governance Status: ${status}`,
      summary: `Current v${currentVersion} ${lastApprovedVersion ? `(Last Approved v${lastApprovedVersion})` : '(Unapproved)'}`,
      state: govState,
      stateReason: govStateReason,
      sourceId: documentId,
      sourceVersion: currentVersion,
      verifiedBy: governance?.stewardUser || governance?.ownerUser || null,
      verifiedAt: governance?.lastReviewedAt || null,
    });
  }

  // Calculate Coverage Score & State Counts
  const applicableCount = items.length;
  let verifiedCount = 0;
  let staleCount = 0;
  let orphanedCount = 0;
  let unverifiedCount = 0;

  for (const item of items) {
    if (item.state === 'VERIFIED') verifiedCount++;
    else if (item.state === 'STALE') staleCount++;
    else if (item.state === 'ORPHANED') orphanedCount++;
    else if (item.state === 'UNVERIFIED') unverifiedCount++;
  }

  let coverageScore = 100;
  let label: EvidenceCoverageLabel = 'NO_APPLICABLE_EVIDENCE';

  if (applicableCount > 0) {
    coverageScore = Math.round((verifiedCount / applicableCount) * 100);
    if (coverageScore >= 90) label = 'EXCELLENT';
    else if (coverageScore >= 75) label = 'GOOD';
    else if (coverageScore >= 50) label = 'NEEDS_ATTENTION';
    else label = 'POOR';
  }

  // Generate Remediations
  const remediations: RemediationItem[] = [];

  if (staleCount > 0) {
    remediations.push({
      code: 'VERIFY_STALE_EVIDENCE',
      label: 'Re-verify Stale Technical Evidence',
      detail: `Document has ${staleCount} stale evidence item(s) due to upstream version changes or API deprecations.`,
    });
  }

  if (orphanedCount > 0) {
    remediations.push({
      code: 'CLEANUP_ORPHANED_EVIDENCE',
      label: 'Clean Up Orphaned Evidence Links',
      detail: `Document contains ${orphanedCount} orphaned link(s) referencing deleted documents or removed OpenAPI endpoints.`,
    });
  }

  if (unverifiedCount > 0) {
    remediations.push({
      code: 'SUBMIT_GOVERNANCE_REVIEW',
      label: 'Submit Document for Governance Approval',
      detail: `Document contains ${unverifiedCount} unverified evidence item(s) pending review approval.`,
    });
  }

  return {
    documentId,
    coverageScore,
    label,
    applicableCount,
    verifiedCount,
    staleCount,
    orphanedCount,
    unverifiedCount,
    items,
    remediations,
  };
}
