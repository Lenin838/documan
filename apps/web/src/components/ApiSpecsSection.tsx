import { useEffect, useState } from 'react';
import type { ProjectApiSpecResponse } from '../features/api-specs/api-spec.types';
import {
  getProjectApiSpec,
  importProjectApiSpec,
  deleteProjectApiSpec,
} from '../features/api-specs/api-spec.api';

interface ApiSpecsSectionProps {
  projectId: string;
  isOwnerOrAdmin: boolean;
}

export function ApiSpecsSection({ projectId, isOwnerOrAdmin }: ApiSpecsSectionProps) {
  const [data, setData] = useState<ProjectApiSpecResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawContent, setRawContent] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    getProjectApiSpec(projectId)
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError((err as Error).message || 'Failed to load API specification');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const refreshData = async () => {
    try {
      const res = await getProjectApiSpec(projectId);
      setData(res);
    } catch {
      // Ignore background refresh error
    }
  };

  const handleImportSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawContent.trim()) return;

    try {
      setImporting(true);
      await importProjectApiSpec(projectId, rawContent.trim());
      setRawContent('');
      setShowImportModal(false);
      await refreshData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to import OpenAPI specification');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteSpec = async (specId: string) => {
    if (!confirm('Delete this API specification? Document links will become ORPHANED.')) return;
    try {
      await deleteProjectApiSpec(projectId, specId);
      await refreshData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete API specification');
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading API specifications...</div>;
  }

  if (error || !data) {
    return <div className="p-4 text-sm text-red-500">{error || 'API specification unavailable'}</div>;
  }

  const { spec, endpoints } = data;

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">API Specifications & Endpoint Registry</h3>
          <p className="text-sm text-gray-500">
            OpenAPI 3.0/3.1 JSON & YAML route definitions bound to project technical documents.
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
          >
            {spec ? 'Re-import Spec' : 'Import OpenAPI Spec'}
          </button>
        )}
      </div>

      {/* Active Spec Info */}
      {spec ? (
        <div className="p-4 bg-gray-50 rounded border flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-900">{spec.title}</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                v{spec.version}
              </span>
              <span className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded text-xs font-mono">
                {spec.format} ({spec.openApiVersion})
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Parsed {endpoints.length} API endpoints • Imported on {new Date(spec.createdAt).toLocaleDateString()}
            </p>
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={() => void handleDeleteSpec(spec.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Delete Spec
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded border text-center text-xs text-gray-500 italic">
          No OpenAPI specification imported yet for this project.
        </div>
      )}

      {/* Endpoint Registry Table */}
      {endpoints.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Parsed Endpoint Registry ({endpoints.length})
          </h4>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2.5">Method</th>
                  <th className="p-2.5">Path</th>
                  <th className="p-2.5">Summary</th>
                  <th className="p-2.5">Tags</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr key={ep.id} className="border-b hover:bg-gray-50">
                    <td className="p-2.5 font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          ep.method === 'GET'
                            ? 'bg-green-100 text-green-800'
                            : ep.method === 'POST'
                            ? 'bg-blue-100 text-blue-800'
                            : ep.method === 'PUT' || ep.method === 'PATCH'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-gray-900">{ep.path}</td>
                    <td className="p-2.5 text-gray-600">{ep.summary || '—'}</td>
                    <td className="p-2.5 text-gray-500">
                      {ep.tags.length > 0 ? ep.tags.join(', ') : '—'}
                    </td>
                    <td className="p-2.5">
                      {ep.isDeprecated ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                          Deprecated
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload/Import Spec Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              {spec ? 'Re-import OpenAPI Specification' : 'Import OpenAPI Specification'}
            </h3>
            <form onSubmit={handleImportSpec} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  OpenAPI 3.0/3.1 JSON or YAML Content (Max 2MB)
                </label>
                <textarea
                  rows={10}
                  required
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Paste OpenAPI spec JSON or YAML here..."
                  className="w-full p-2.5 border rounded font-mono text-xs text-gray-800 bg-gray-50"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 border rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !rawContent.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Parsing & Importing...' : 'Import Specification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
