import React, { useEffect, useState } from 'react';
import type { IDocumentationWorkRequest } from './work-request.types';
import { getDocumentWorkRequestsApi } from './work-request.api';
import { WorkRequestStatusBadge } from './WorkRequestStatusBadge';

interface Props {
  documentId: string;
}

export const DocumentWorkRequestsTab: React.FC<Props> = ({ documentId }) => {
  const [requests, setRequests] = useState<IDocumentationWorkRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDocumentWorkRequestsApi(documentId)
      .then((data) => {
        if (active) {
          setRequests(data.requests);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const errObj = err as { message?: string };
          setError(errObj.message || 'Failed to load work requests');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Loading document work requests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
        {error}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700">No Work Requests</h4>
        <p className="text-xs text-gray-500 mt-1">
          There are no active or historical documentation work requests for this document.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-gray-700 font-medium">
            <tr>
              <th className="px-4 py-3">Title & Reason</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{req.title}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{req.reason}</div>
                  {req.resolutionNotes && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 p-1.5 rounded mt-1">
                      <strong>Resolution:</strong> {req.resolutionNotes}
                    </div>
                  )}
                  {req.skipReason && (
                    <div className="text-xs text-gray-600 bg-gray-100 p-1.5 rounded mt-1">
                      <strong>Skip Reason:</strong> {req.skipReason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-600">
                  {req.source}
                </td>
                <td className="px-4 py-3">
                  <WorkRequestStatusBadge status={req.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  {req.assigneeId?.name || <span className="text-gray-400 italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
