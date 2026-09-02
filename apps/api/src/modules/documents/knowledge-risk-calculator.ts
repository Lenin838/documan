export interface ActiveImpactSourceContext {
  upstreamDocumentId: string;
  upstreamVersionNumber?: number | null | undefined;
  changeType: 'STALE' | 'DEPRECATED' | 'FILE_REPLACED';
  flaggedAt: Date;
}

export interface LinkedApiEndpointContext {
  specId: string;
  endpointPath: string;
  httpMethod: string;
  isOrphaned?: boolean;
  isDeprecatedDrift?: boolean;
}

export interface DocumentUserContext {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
}

export interface KnowledgeRiskContext {
  documentId: string;
  title: string;
  version: number;
  lastApprovedVersion?: number | null | undefined;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPRECATED' | 'STALE';
  lastReviewedAt?: Date | null | undefined;
  createdAt: Date;
  needsVerification?: boolean | undefined;
  activeImpactSources?: ActiveImpactSourceContext[] | undefined;
  isGovernanceEnabled?: boolean | undefined;
  maxUnreviewedDays?: number | null | undefined;
  linkedApiEndpoints?: LinkedApiEndpointContext[] | undefined;
  stewardUser?: DocumentUserContext | null | undefined;
  ownerUser?: DocumentUserContext | null | undefined;
  evaluationAt: Date;
}

export interface StructuredReason {
  code: string;
  label: string;
  detail: string;
}

export interface FactorDetail {
  score: number;
  maxScore: number;
  triggered: boolean;
  reasons: StructuredReason[];
}

export interface RemediationAction {
  code: string;
  label: string;
  detail: string;
}

export interface EffectiveContact {
  id: string;
  name: string;
  email: string;
  isExplicitSteward: boolean;
  isActive: boolean;
}

export interface KnowledgeRiskResult {
  documentId: string;
  riskScore: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  healthScore: number; // 100 - riskScore
  effectiveContact: EffectiveContact | null;
  factors: {
    impact: FactorDetail;
    version: FactorDetail;
    freshness: FactorDetail;
    apiDrift: FactorDetail;
    stewardship: FactorDetail;
  };
  remediations: RemediationAction[];
}

export function calculateKnowledgeRisk(
  context: KnowledgeRiskContext,
): KnowledgeRiskResult {
  const { evaluationAt } = context;

  // 1. Impact Risk Factor (Max 35)
  const impactFactor = calculateImpactRisk(context, evaluationAt);

  // 2. Version Approval Risk Factor (Max 25)
  const versionFactor = calculateVersionApprovalRisk(context);

  // 3. Freshness Risk Factor (Max 20)
  const freshnessFactor = calculateFreshnessRisk(context, evaluationAt);

  // 4. API Drift Risk Factor (Max 10)
  const apiDriftFactor = calculateApiDriftRisk(context);

  // 5. Stewardship Risk Factor (Max 10)
  const { factor: stewardshipFactor, effectiveContact } =
    calculateStewardshipRisk(context);

  const rawScore =
    impactFactor.score +
    versionFactor.score +
    freshnessFactor.score +
    apiDriftFactor.score +
    stewardshipFactor.score;

  const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (riskScore <= 24) {
    riskLevel = 'LOW';
  } else if (riskScore <= 49) {
    riskLevel = 'MEDIUM';
  } else if (riskScore <= 74) {
    riskLevel = 'HIGH';
  } else {
    riskLevel = 'CRITICAL';
  }

  const remediations: RemediationAction[] = [];

  if (impactFactor.triggered) {
    remediations.push({
      code: 'VERIFY_UPSTREAM_IMPACT',
      label: 'Verify upstream document impact',
      detail: 'Review changes from replaced or deprecated upstream dependency.',
    });
  }

  if (versionFactor.triggered) {
    remediations.push({
      code: 'REVIEW_UNAPPROVED_VERSION',
      label: 'Review unapproved content revision',
      detail: `Current content version v${context.version} is newer than last approved version.`,
    });
  }

  if (freshnessFactor.triggered) {
    remediations.push({
      code: 'REVIEW_DOCUMENT_FRESHNESS',
      label: 'Review document freshness',
      detail: 'Document review freshness threshold has been exceeded.',
    });
  }

  if (apiDriftFactor.triggered) {
    remediations.push({
      code: 'RESOLVE_API_ENDPOINT_DRIFT',
      label: 'Resolve API endpoint drift',
      detail: 'One or more linked OpenAPI endpoints have drifted or been orphaned.',
    });
  }

  if (stewardshipFactor.triggered) {
    if (!context.stewardUser) {
      remediations.push({
        code: 'ASSIGN_STEWARD',
        label: 'Assign technical steward',
        detail: 'Assign an active technical steward responsible for operational maintenance.',
      });
    } else {
      remediations.push({
        code: 'REASSIGN_INACTIVE_STEWARD',
        label: 'Reassign inactive steward',
        detail: 'Assigned steward user is deactivated or deleted.',
      });
    }
  }

  return {
    documentId: context.documentId,
    riskScore,
    riskLevel,
    healthScore: 100 - riskScore,
    effectiveContact,
    factors: {
      impact: impactFactor,
      version: versionFactor,
      freshness: freshnessFactor,
      apiDrift: apiDriftFactor,
      stewardship: stewardshipFactor,
    },
    remediations,
  };
}

function calculateImpactRisk(
  context: KnowledgeRiskContext,
  evaluationAt: Date,
): FactorDetail {
  const activeSources = context.activeImpactSources || [];
  const needsVerification = context.needsVerification || false;

  if (!needsVerification || activeSources.length === 0) {
    return {
      score: 0,
      maxScore: 35,
      triggered: false,
      reasons: [],
    };
  }

  let baseScore = 0;
  if (activeSources.length === 1) {
    baseScore = 20;
  } else if (activeSources.length >= 2) {
    baseScore = 35;
  }

  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const evalTime = evaluationAt.getTime();

  let hasAgedImpact = false;
  for (const source of activeSources) {
    const flaggedTime = new Date(source.flaggedAt).getTime();
    if (evalTime - flaggedTime > FOURTEEN_DAYS_MS) {
      hasAgedImpact = true;
      break;
    }
  }

  let finalScore = baseScore;
  if (hasAgedImpact && baseScore > 0) {
    finalScore = Math.min(35, baseScore + 5);
  }

  const reasons: StructuredReason[] = [
    {
      code: 'UNVERIFIED_IMPACT',
      label: 'Unresolved Upstream Impact',
      detail: `${activeSources.length} active upstream impact(s) requiring verification.`,
    },
  ];

  if (hasAgedImpact) {
    reasons.push({
      code: 'AGED_UNVERIFIED_IMPACT',
      label: 'Aged Upstream Impact',
      detail: 'One or more active upstream impacts have been unverified for over 14 days.',
    });
  }

  return {
    score: finalScore,
    maxScore: 35,
    triggered: true,
    reasons,
  };
}

function calculateVersionApprovalRisk(
  context: KnowledgeRiskContext,
): FactorDetail {
  const { version, lastApprovedVersion, status } = context;

  if (lastApprovedVersion !== undefined && lastApprovedVersion !== null) {
    if (version === lastApprovedVersion) {
      return {
        score: 0,
        maxScore: 25,
        triggered: false,
        reasons: [],
      };
    }

    if (version > lastApprovedVersion) {
      return {
        score: 15,
        maxScore: 25,
        triggered: true,
        reasons: [
          {
            code: 'UNAPPROVED_VERSION_DRIFT',
            label: 'Unapproved Content Revision Drift',
            detail: `Current version v${version} is newer than last approved version v${lastApprovedVersion}.`,
          },
        ],
      };
    }
  }

  // lastApprovedVersion is null or undefined
  if (version === 1 && (status === 'DRAFT' || status === 'IN_REVIEW')) {
    return {
      score: 0,
      maxScore: 25,
      triggered: false,
      reasons: [],
    };
  }

  // Multi-revision never approved, or approved status without stamp
  return {
    score: 25,
    maxScore: 25,
    triggered: true,
    reasons: [
      {
        code: 'NEVER_APPROVED',
        label: 'Never Approved Document Revision',
        detail: `Document content version v${version} has never been approved.`,
      },
    ],
  };
}

function calculateFreshnessRisk(
  context: KnowledgeRiskContext,
  evaluationAt: Date,
): FactorDetail {
  if (context.isGovernanceEnabled === false) {
    return {
      score: 0,
      maxScore: 20,
      triggered: false,
      reasons: [],
    };
  }

  if (context.status === 'STALE') {
    return {
      score: 20,
      maxScore: 20,
      triggered: true,
      reasons: [
        {
          code: 'STALE_DOCUMENT',
          label: 'Stale Document Status',
          detail: 'Document status is explicitly marked as STALE.',
        },
      ],
    };
  }

  const maxDays = context.maxUnreviewedDays ?? 90;
  const maxMs = maxDays * 24 * 60 * 60 * 1000;
  const evalTime = evaluationAt.getTime();

  if (context.lastReviewedAt) {
    const reviewTime = new Date(context.lastReviewedAt).getTime();
    if (evalTime - reviewTime > maxMs) {
      return {
        score: 20,
        maxScore: 20,
        triggered: true,
        reasons: [
          {
            code: 'REVIEW_OVERDUE',
            label: 'Review Window Exceeded',
            detail: `Last reviewed date exceeds maximum threshold of ${maxDays} days.`,
          },
        ],
      };
    }
    return {
      score: 0,
      maxScore: 20,
      triggered: false,
      reasons: [],
    };
  }

  // No lastReviewedAt date present
  const createdTime = new Date(context.createdAt).getTime();
  if (evalTime - createdTime > maxMs) {
    return {
      score: 20,
      maxScore: 20,
      triggered: true,
      reasons: [
        {
          code: 'REVIEW_OVERDUE',
          label: 'Initial Review Window Exceeded',
          detail: `Document creation date exceeds maximum unreviewed threshold of ${maxDays} days.`,
        },
      ],
    };
  }

  return {
    score: 0,
    maxScore: 20,
    triggered: false,
    reasons: [],
  };
}

function calculateApiDriftRisk(context: KnowledgeRiskContext): FactorDetail {
  const endpoints = context.linkedApiEndpoints || [];
  if (endpoints.length === 0) {
    return {
      score: 0,
      maxScore: 10,
      triggered: false,
      reasons: [],
    };
  }

  const orphanedCount = endpoints.filter((e) => e.isOrphaned).length;
  const hasDeprecated = endpoints.some((e) => e.isDeprecatedDrift);

  if (orphanedCount === 0 && !hasDeprecated) {
    return {
      score: 0,
      maxScore: 10,
      triggered: false,
      reasons: [],
    };
  }

  let score = 0;
  const reasons: StructuredReason[] = [];

  if (orphanedCount === 1) {
    score = Math.max(score, 5);
    reasons.push({
      code: 'ORPHANED_API_ENDPOINT',
      label: 'Orphaned API Endpoint Link',
      detail: '1 linked OpenAPI endpoint path has been removed or orphaned.',
    });
  } else if (orphanedCount >= 2) {
    score = 10;
    reasons.push({
      code: 'ORPHANED_API_ENDPOINT',
      label: 'Multiple Orphaned API Endpoint Links',
      detail: `${orphanedCount} linked OpenAPI endpoint paths have been removed or orphaned.`,
    });
  }

  if (hasDeprecated) {
    score = 10;
    reasons.push({
      code: 'DEPRECATED_API_DRIFT',
      label: 'Deprecated API Endpoint Drift',
      detail: 'One or more linked OpenAPI endpoints have been marked deprecated in API spec.',
    });
  }

  return {
    score: Math.min(10, score),
    maxScore: 10,
    triggered: true,
    reasons,
  };
}

function calculateStewardshipRisk(context: KnowledgeRiskContext): {
  factor: FactorDetail;
  effectiveContact: EffectiveContact | null;
} {
  const { stewardUser, ownerUser } = context;

  // Case A: Explicit steward exists
  if (stewardUser) {
    const isStewardHealthy = stewardUser.isActive && !stewardUser.isDeleted;

    const effectiveContact: EffectiveContact = {
      id: stewardUser.id,
      name: stewardUser.name,
      email: stewardUser.email,
      isExplicitSteward: true,
      isActive: isStewardHealthy,
    };

    if (isStewardHealthy) {
      return {
        factor: {
          score: 0,
          maxScore: 10,
          triggered: false,
          reasons: [],
        },
        effectiveContact,
      };
    }

    // Steward user is inactive or deleted
    return {
      factor: {
        score: 10,
        maxScore: 10,
        triggered: true,
        reasons: [
          {
            code: stewardUser.isDeleted ? 'STEWARD_DELETED' : 'STEWARD_INACTIVE',
            label: 'Inactive Technical Steward',
            detail: 'Assigned technical steward is inactive or deleted.',
          },
        ],
      },
      effectiveContact,
    };
  }

  // Case B: No explicit steward (stewardUser is null)
  let effectiveContact: EffectiveContact | null = null;
  if (ownerUser) {
    effectiveContact = {
      id: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      isExplicitSteward: false,
      isActive: ownerUser.isActive && !ownerUser.isDeleted,
    };
  }

  if (ownerUser && ownerUser.isActive && !ownerUser.isDeleted) {
    return {
      factor: {
        score: 5,
        maxScore: 10,
        triggered: true,
        reasons: [
          {
            code: 'STEWARD_UNASSIGNED',
            label: 'Technical Steward Unassigned',
            detail: 'No explicit technical steward assigned; fallback contact is document owner.',
          },
        ],
      },
      effectiveContact,
    };
  }

  // Owner is inactive, deleted, or unresolvable
  return {
    factor: {
      score: 10,
      maxScore: 10,
      triggered: true,
      reasons: [
        {
          code: 'OWNER_INACTIVE',
          label: 'Unassigned Steward & Inactive Owner',
          detail: 'No explicit steward assigned and original document owner is inactive or deleted.',
        },
      ],
    },
    effectiveContact,
  };
}
