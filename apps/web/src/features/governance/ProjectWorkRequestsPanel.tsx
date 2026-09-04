import React, { useEffect, useState, useCallback } from 'react';
import type { IDocumentationWorkRequest, WorkRequestStatus, WorkRequestSource } from './work-request.types';
import {
  getProjectWorkRequestsApi,
  updateWorkRequestStatusApi,
  resolveWorkRequestApi,
  skipWorkRequestApi,
  reopenWorkRequestApi,
} from './work-request.api';
import { WorkRequestStatusBadge } from './WorkRequestStatusBadge';

interface Props {
  projectId: string;
}

export const ProjectWorkRequestsPanel: React.FC<Props> = ({ projectId }) => {
  const [requests, setRequests] = useState<IDocumentationWorkRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WorkRequestStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<WorkRequestSource | ''>('');

  // Action dialog states
  const [selectedReq, setSelectedReq] = useState<IDocumentationWorkRequest | null>(null);
  const [actionType, setActionType] = useState<'RESOLVE' | 'SKIP' | null>(null);
  const [actionInput, setActionInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProjectWorkRequestsApi(projectId, {
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
      });
      setRequests(res.requests);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to load project work requests');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, sourceFilter]);

  useEffect(() => {
    let active = true;
    getProjectWorkRequestsApi(projectId, {
      status: statusFilter || undefined,
      source: sourceFilter || undefined,
    })
      .then((res) => {
        if (active) {
          setRequests(res.requests);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const errObj = err as { message?: string };
          setError(errObj.message || 'Failed to load project work requests');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, statusFilter, sourceFilter]);

  const handleStatusChange = async (requestId: string, status: 'IN_PROGRESS' | 'IN_REVIEW') => {
    try {
      await updateWorkRequestStatusApi(requestId, status);
      fetchRequests();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: string } }; message?: string };
      alert(errObj.response?.data?.error || errObj.message || 'Status update failed');
    }
  };

  const handleReopen = async (requestId: string) => {
    try {
      await reopenWorkRequestApi(requestId);
      fetchRequests();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: string } }; message?: string };
      alert(errObj.response?.data?.error || errObj.message || 'Reopen failed');
    }
  };

  const handleActionSubmit = async () => {
    if (!selectedReq || !actionType) return;
    if (actionType === 'SKIP' && !actionInput.trim()) {
      alert('Skip reason is required');
      return;
    }

    setActionLoading(true);
    try {
      if (actionType === 'RESOLVE') {
        await resolveWorkRequestApi(selectedReq._id, actionInput.trim() || undefined);
      } else if (actionType === 'SKIP') {
        await skipWorkRequestApi(selectedReq._id, actionInput.trim());
      }
      setSelectedReq(null);
      setActionType(null);
      setActionInput('');
      fetchRequests();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: string } }; message?: string };
      alert(errObj.response?.data?.error || errObj.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Documentation Work Requests & Review Roster
          </h3>
          <p className="text-xs text-gray-500">
            Track human documentation tasks, review readiness, and origin findings across the project.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <select
            className="border rounded-lg px-2.5 py-1.5 bg-gray-50 font-medium text-gray-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkRequestStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>

          <select
            className="border rounded-lg px-2.5 py-1.5 bg-gray-50 font-medium text-gray-700"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as WorkRequestSource | '')}
          >
            <option value="">All Sources</option>
            <option value="MANUAL">MANUAL</option>
            <option value="CHANGE_IMPACT">CHANGE_IMPACT</option>
            <option value="BASELINE_DRIFT">BASELINE_DRIFT</option>
            <option value="VERIFICATION">VERIFICATION</option>
            <option value="EVIDENCE">EVIDENCE</option>
            <option value="GOVERNANCE">GOVERNANCE</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-gray-500 text-sm">
          Loading project work requests...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-800">No Work Requests Found</h4>
          <p className="text-xs text-gray-500 mt-1">
            No work requests match the selected filters for this project.
          </p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-4 py-3">Work Request</th>
                <th className="px-4 py-3">Source & Context</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-semibold text-gray-900">{req.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{req.reason}</div>
                    {req.resolutionNotes && (
                      <div className="text-xs text-emerald-800 bg-emerald-50 p-1.5 rounded mt-1 border border-emerald-100">
                        <strong>Resolution:</strong> {req.resolutionNotes}
                      </div>
                    )}
                    {req.skipReason && (
                      <div className="text-xs text-gray-700 bg-gray-100 p-1.5 rounded mt-1 border border-gray-200">
                        <strong>Skip Reason:</strong> {req.skipReason}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    <span className="font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                      {req.source}
                    </span>
                    {req.originatingContext?.driftDimension && (
                      <div className="text-gray-500 mt-1">
                        Drift: {req.originatingContext.driftDimension}
                      </div>
                    )}
                    {req.originatingContext?.assuranceCheckId && (
                      <div className="text-gray-500 mt-1 font-mono text-[11px]">
                        {req.originatingContext.assuranceCheckId}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <WorkRequestStatusBadge status={req.status} />
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {req.assigneeId?.name || <span className="text-gray-400 italic">Unassigned</span>}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-xs space-x-2">
                    {['OPEN', 'ASSIGNED'].includes(req.status) && (
                      <button
                        onClick={() => handleStatusChange(req._id, 'IN_PROGRESS')}
                        className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded font-medium border border-amber-200"
                      >
                        Start Progress
                      </button>
                    )}

                    {['ASSIGNED', 'IN_PROGRESS'].includes(req.status) && (
                      <button
                        onClick={() => handleStatusChange(req._id, 'IN_REVIEW')}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-medium border border-indigo-200"
                      >
                        Submit Review
                      </button>
                    )}

                    {!['RESOLVED', 'SKIPPED'].includes(req.status) && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            setActionType('RESOLVE');
                            setActionInput('');
                          }}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-medium border border-emerald-200"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            setActionType('SKIP');
                            setActionInput('');
                          }}
                          className="px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-medium border border-gray-300"
                        >
                          Skip
                        </button>
                      </>
                    )}

                    {['RESOLVED', 'SKIPPED'].includes(req.status) && (
                      <button
                        onClick={() => handleReopen(req._id)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium border border-blue-200"
                      >
                        Reopen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve / Skip Action Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              {actionType === 'RESOLVE' ? 'Resolve Work Request' : 'Skip Work Request'}
            </h3>
            <p className="text-xs text-gray-600">
              Work Request: <span className="font-medium text-gray-900">{selectedReq.title}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {actionType === 'RESOLVE' ? 'Resolution Notes (Optional)' : 'Skip Reason (Required)'}
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                placeholder={actionType === 'RESOLVE' ? 'Notes on what was documented...' : 'Reason for skipping...'}
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionSubmit}
                className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm ${
                  actionType === 'RESOLVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-700 hover:bg-gray-800'
                }`}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : actionType === 'RESOLVE' ? 'Confirm Resolve' : 'Confirm Skip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
