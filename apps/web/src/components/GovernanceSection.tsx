import { useEffect, useState } from 'react';
import type {
  ProjectGovernanceResponse,
  GovernanceEvaluationResult,
  CreateGateTokenResponse,
} from '../features/governance/governance.types';
import {
  getProjectGovernance,
  updateProjectGovernance,
  evaluateProjectGovernance,
  createGateToken,
  revokeGateToken,
} from '../features/governance/governance.api';
import { ProjectBaselinesTab } from '../features/governance/ProjectBaselinesTab';
import { ProjectWorkRequestsPanel } from '../features/governance/ProjectWorkRequestsPanel';

interface GovernanceSectionProps {
  projectId: string;
  isOwnerOrAdmin: boolean;
}

export function GovernanceSection({
  projectId,
  isOwnerOrAdmin,
}: GovernanceSectionProps) {
  const [data, setData] = useState<ProjectGovernanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<GovernanceEvaluationResult | null>(null);

  // Gate Token creation modal state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [expiresDays, setExpiresDays] = useState(30);
  const [createdToken, setCreatedToken] = useState<CreateGateTokenResponse | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);

  useEffect(() => {
    let active = true;
    getProjectGovernance(projectId)
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError((err as Error).message || 'Failed to load governance metrics');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const refreshData = async () => {
    try {
      const res = await getProjectGovernance(projectId);
      setData(res);
    } catch {
      // Ignore background refresh errors
    }
  };

  const handleToggleGovernance = async (enabled: boolean) => {
    if (!data) return;
    try {
      setSaving(true);
      const updated = await updateProjectGovernance(projectId, {
        isGovernanceEnabled: enabled,
      });
      setData(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update governance settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMaxDaysChange = async (days: number) => {
    if (!data) return;
    try {
      setSaving(true);
      const updated = await updateProjectGovernance(projectId, {
        maxUnreviewedDays: days,
      });
      setData(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update threshold');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReleaseGate = async (key: string, value: boolean | number) => {
    if (!data) return;
    try {
      setSaving(true);
      const currentGate = data.releaseGateSettings || {
        allowStale: false,
        allowPendingReviews: false,
        allowDeprecated: false,
        minFreshnessPercentage: 80,
      };
      const updated = await updateProjectGovernance(projectId, {
        releaseGateSettings: {
          ...currentGate,
          [key]: value,
        },
      });
      setData(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update release gate policy');
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await evaluateProjectGovernance(projectId);
      setEvalResult(res);
      await refreshData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to evaluate governance');
    } finally {
      setEvaluating(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    try {
      setCreatingToken(true);
      const newToken = await createGateToken(projectId, {
        name: tokenName.trim(),
        expiresInDays: expiresDays,
      });
      setCreatedToken(newToken);
      setTokenName('');
      await refreshData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to generate gate token');
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this CI Gate Token? CI pipelines using it will immediately be rejected.')) return;
    try {
      await revokeGateToken(projectId, tokenId);
      await refreshData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to revoke token');
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading documentation governance...</div>;
  }

  if (error || !data) {
    return <div className="p-4 text-sm text-red-500">{error || 'Governance unavailable'}</div>;
  }

  const { health, governanceSettings, releaseGateSettings, gateTokens } = data;

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Documentation Governance & CI/CD Release Gate
          </h3>
          <p className="text-sm text-gray-500">
            Automated staleness policies, freshness metrics, and CI release gate tokens.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              health.freshnessPercentage >= 80
                ? 'bg-green-100 text-green-800'
                : health.freshnessPercentage >= 50
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {health.freshnessPercentage}% Fresh
          </span>

          {isOwnerOrAdmin && (
            <button
              onClick={() => void handleEvaluate()}
              disabled={evaluating}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {evaluating ? 'Evaluating...' : 'Evaluate Now'}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded border text-center">
          <div className="text-xl font-bold text-gray-800">{health.totalDocuments}</div>
          <div className="text-xs text-gray-500">Total Documents</div>
        </div>
        <div className="p-3 bg-gray-50 rounded border text-center">
          <div className="text-xl font-bold text-gray-800">{health.eligibleDocuments}</div>
          <div className="text-xs text-gray-500">Tracked Documents</div>
        </div>
        <div className="p-3 bg-green-50 rounded border text-center">
          <div className="text-xl font-bold text-green-700">{health.approvedFreshCount}</div>
          <div className="text-xs text-green-600">Fresh Approved</div>
        </div>
        <div className="p-3 bg-amber-50 rounded border text-center">
          <div className="text-xl font-bold text-amber-700">{health.staleCount}</div>
          <div className="text-xs text-amber-600">Stale / Needs Review</div>
        </div>
      </div>

      {/* Governance & CI Policy Forms (Owner/Admin only) */}
      {isOwnerOrAdmin && (
        <div className="pt-4 border-t space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">Project Staleness Policy</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Automated Governance Engine</span>
              <input
                type="checkbox"
                checked={governanceSettings.isGovernanceEnabled}
                disabled={saving}
                onChange={(e) => void handleToggleGovernance(e.target.checked)}
                aria-label="Automated Governance Engine"
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-700">Max Unreviewed Threshold</span>
                <p className="text-xs text-gray-500">
                  Flag documents as STALE if unreviewed for more than X days
                </p>
              </div>
              <select
                value={governanceSettings.maxUnreviewedDays}
                disabled={saving || !governanceSettings.isGovernanceEnabled}
                onChange={(e) => void handleMaxDaysChange(Number(e.target.value))}
                aria-label="Max Unreviewed Threshold"
                className="px-2 py-1 border rounded text-xs text-gray-800 bg-white"
              >
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days (Default)</option>
                <option value={180}>180 Days</option>
                <option value={365}>365 Days</option>
              </select>
            </div>
          </div>

          {/* Release Gate Policy Controls */}
          <div className="pt-4 border-t space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">CI/CD Release Gate Policy</h4>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Allow STALE Documents</span>
              <input
                type="checkbox"
                checked={releaseGateSettings.allowStale}
                disabled={saving}
                onChange={(e) => void handleUpdateReleaseGate('allowStale', e.target.checked)}
                aria-label="Allow STALE Documents"
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Allow Pending Reviews</span>
              <input
                type="checkbox"
                checked={releaseGateSettings.allowPendingReviews}
                disabled={saving}
                onChange={(e) => void handleUpdateReleaseGate('allowPendingReviews', e.target.checked)}
                aria-label="Allow Pending Reviews"
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Allow DEPRECATED Documents</span>
              <input
                type="checkbox"
                checked={releaseGateSettings.allowDeprecated}
                disabled={saving}
                onChange={(e) => void handleUpdateReleaseGate('allowDeprecated', e.target.checked)}
                aria-label="Allow DEPRECATED Documents"
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-700">Allow Orphaned API Links</span>
                <p className="text-xs text-gray-500">Allow CI releases when documents link to removed/orphaned API endpoints</p>
              </div>
              <input
                type="checkbox"
                checked={releaseGateSettings.allowOrphanedApiLinks ?? false}
                disabled={saving}
                onChange={(e) => void handleUpdateReleaseGate('allowOrphanedApiLinks', e.target.checked)}
                aria-label="Allow Orphaned API Links"
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-700">Allow Deprecated API Endpoints</span>
                <p className="text-xs text-gray-500">Allow CI releases when documents link to endpoints marked as deprecated</p>
              </div>
              <input
                type="checkbox"
                checked={releaseGateSettings.allowDeprecatedApiEndpoints ?? true}
                disabled={saving}
                onChange={(e) => void handleUpdateReleaseGate('allowDeprecatedApiEndpoints', e.target.checked)}
                aria-label="Allow Deprecated API Endpoints"
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-700">Allow Unverified Upstream Impacts</span>
                <p className="text-xs text-gray-500">Allow CI releases when documents have unverified upstream dependency changes</p>
              </div>
              <input
                type="checkbox"
                checked={releaseGateSettings.allowUnverifiedImpacts ?? true}
                disabled={saving}
                onChange={(e) => void handleUpdateReleaseGate('allowUnverifiedImpacts', e.target.checked)}
                aria-label="Allow Unverified Upstream Impacts"
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-700">Minimum Required Freshness</span>
                <p className="text-xs text-gray-500">Block release if project freshness % is below this value</p>
              </div>
              <select
                value={releaseGateSettings.minFreshnessPercentage}
                disabled={saving}
                onChange={(e) => void handleUpdateReleaseGate('minFreshnessPercentage', Number(e.target.value))}
                aria-label="Minimum Required Freshness"
                className="px-2 py-1 border rounded text-xs text-gray-800 bg-white"
              >
                <option value={50}>50%</option>
                <option value={70}>70%</option>
                <option value={80}>80% (Default)</option>
                <option value={90}>90%</option>
                <option value={100}>100% (Strict)</option>
              </select>
            </div>
          </div>

          {/* Gate Tokens Management */}
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">CI/CD Gate Tokens</h4>
                <p className="text-xs text-gray-500">Project-scoped tokens used by GitHub Actions or GitLab CI</p>
              </div>
              <button
                onClick={() => setShowTokenModal(true)}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
              >
                Generate Token
              </button>
            </div>

            {/* Tokens Table */}
            {gateTokens.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No CI Gate Tokens created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Token Prefix</th>
                      <th className="p-2">Created</th>
                      <th className="p-2">Last Used</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateTokens.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="p-2 font-medium">{t.name}</td>
                        <td className="p-2 font-mono text-gray-600">{t.tokenPrefix}...</td>
                        <td className="p-2 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="p-2 text-gray-500">{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                        <td className="p-2">
                          {t.revokedAt ? (
                            <span className="text-red-600 font-semibold">Revoked</span>
                          ) : (
                            <span className="text-green-600 font-semibold">Active</span>
                          )}
                        </td>
                        <td className="p-2">
                          {!t.revokedAt && (
                            <button
                              onClick={() => void handleRevokeToken(t.id)}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evaluation Results Banner */}
      {evalResult && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 space-y-1">
          <div className="font-semibold">
            Evaluation Complete: Evaluated {evalResult.evaluatedDocumentsCount} documents, {evalResult.staleTransitionsCount} transitioned to STALE.
          </div>
          {evalResult.transitions.map((t) => (
            <div key={t.documentId} className="ml-2">
              • <strong>{t.title}</strong>: {t.reason}
            </div>
          ))}
        </div>
      )}

      {/* Phase 13 Documentation Work Requests & Review Roster */}
      <div className="pt-6 border-t">
        <ProjectWorkRequestsPanel projectId={projectId} />
      </div>

      {/* Phase 12 Authoritative Documentation Baseline & Drift Control */}
      <div className="pt-6 border-t">
        <ProjectBaselinesTab projectId={projectId} isOwnerOrAdmin={isOwnerOrAdmin} />
      </div>

      {/* One-Time Token Generation Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Generate CI/CD Gate Token</h3>

            {!createdToken ? (
              <form onSubmit={handleCreateToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Token Name</label>
                  <input
                    type="text"
                    required
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g. GitHub Actions Production Pipeline"
                    className="w-full px-3 py-1.5 border rounded text-xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expiration (Days)</label>
                  <select
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border rounded text-xs text-gray-800 bg-white"
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={180}>180 Days</option>
                    <option value={365}>365 Days (Default)</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="px-3 py-1.5 border rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingToken || !tokenName.trim()}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {creatingToken ? 'Generating...' : 'Generate Token'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-2">
                  <div className="font-bold">Important: Copy your token now</div>
                  <p>This token will NEVER be shown again. Store it securely in your CI/CD secrets.</p>
                  <div className="p-2 bg-white border font-mono text-xs text-gray-900 break-all select-all rounded">
                    {createdToken.token}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setCreatedToken(null);
                      setShowTokenModal(false);
                    }}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                  >
                    Done / Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
