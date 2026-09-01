import { useEffect, useState } from 'react';
import type { DocumentEndpointLinkInfo, ProjectApiEndpointInfo } from '../features/api-specs/api-spec.types';
import {
  getDocumentApiEndpoints,
  linkDocumentApiEndpoint,
  unlinkDocumentApiEndpoint,
  getProjectApiSpec,
} from '../features/api-specs/api-spec.api';

interface DocumentApiEndpointsSectionProps {
  documentId: string;
  projectId: string;
  canEdit: boolean;
}

export function DocumentApiEndpointsSection({
  documentId,
  projectId,
  canEdit,
}: DocumentApiEndpointsSectionProps) {
  const [links, setLinks] = useState<DocumentEndpointLinkInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Available endpoints in project spec
  const [availableEndpoints, setAvailableEndpoints] = useState<ProjectApiEndpointInfo[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    let active = true;
    getDocumentApiEndpoints(documentId)
      .then((res) => {
        if (active) {
          setLinks(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError((err as Error).message || 'Failed to load document API endpoints');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [documentId]);

  const refreshLinks = async () => {
    try {
      const res = await getDocumentApiEndpoints(documentId);
      setLinks(res);
    } catch {
      // Ignore background refresh error
    }
  };

  const handleOpenLinkModal = async () => {
    try {
      const res = await getProjectApiSpec(projectId);
      setAvailableEndpoints(res.endpoints || []);
      if (res.endpoints.length > 0) {
        setSelectedEndpointId(res.endpoints[0].id);
      }
      setShowLinkModal(true);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to load project API endpoints');
    }
  };

  const handleLinkEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEndpointId) return;

    try {
      setLinking(true);
      await linkDocumentApiEndpoint(documentId, selectedEndpointId);
      setShowLinkModal(false);
      await refreshLinks();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to link API endpoint');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkEndpoint = async (endpointId: string) => {
    if (!confirm('Unlink this API endpoint from the document?')) return;
    try {
      await unlinkDocumentApiEndpoint(documentId, endpointId);
      await refreshLinks();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to unlink endpoint');
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading governed API endpoints...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Governed API Endpoints</h3>
          <p className="text-xs text-gray-500">
            OpenAPI routes and service endpoints linked to this document.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => void handleOpenLinkModal()}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
          >
            Link API Endpoint
          </button>
        )}
      </div>

      {/* Linked Endpoints List */}
      {links.length === 0 ? (
        <p className="text-xs text-gray-500 italic">No API endpoints linked to this document.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="p-3 border rounded flex items-center justify-between bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    link.method === 'GET'
                      ? 'bg-green-100 text-green-800'
                      : link.method === 'POST'
                      ? 'bg-blue-100 text-blue-800'
                      : link.method === 'PUT' || link.method === 'PATCH'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {link.method}
                </span>
                <div>
                  <span className="font-mono text-xs font-semibold text-gray-900">{link.path}</span>
                  {link.summary && (
                    <p className="text-xs text-gray-600">{link.summary}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {link.status === 'ORPHANED' ? (
                  <span
                    title={link.orphanedReason || 'Endpoint removed in spec re-import'}
                    className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold text-[10px]"
                  >
                    ORPHANED
                  </span>
                ) : link.isDeprecated ? (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                    Deprecated
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-semibold text-[10px]">
                    LINKED
                  </span>
                )}

                {canEdit && (
                  <button
                    onClick={() => void handleUnlinkEndpoint(link.endpointId)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Unlink
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Endpoint Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Link API Endpoint to Document</h3>

            {availableEndpoints.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                No API specification endpoints available in this project. Please import an OpenAPI spec first.
              </p>
            ) : (
              <form onSubmit={handleLinkEndpoint} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Select Endpoint from Project Spec
                  </label>
                  <select
                    value={selectedEndpointId}
                    onChange={(e) => setSelectedEndpointId(e.target.value)}
                    className="w-full p-2 border rounded text-xs text-gray-800 bg-white"
                  >
                    {availableEndpoints.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        [{ep.method}] {ep.path} {ep.summary ? `- ${ep.summary}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="px-3 py-1.5 border rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={linking || !selectedEndpointId}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {linking ? 'Linking...' : 'Link Endpoint'}
                  </button>
                </div>
              </form>
            )}

            {availableEndpoints.length === 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="px-3 py-1.5 border rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
