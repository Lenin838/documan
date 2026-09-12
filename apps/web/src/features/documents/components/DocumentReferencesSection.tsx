import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  DocumentReference,
  TechnicalReferenceType,
} from '../../document-references/document-reference.types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  createDocumentReference,
  deleteDocumentReference,
  updateDocumentReference,
} from '../../document-references/document-reference.api';

interface DocumentReferencesSectionProps {
  documentId: string;
  canEdit: boolean;
  references: DocumentReference[];
  referencesLoading: boolean;
  onReferencesUpdated: (updated: DocumentReference[]) => void;
}

export function DocumentReferencesSection({
  documentId,
  canEdit,
  references,
  referencesLoading,
  onReferencesUpdated,
}: DocumentReferencesSectionProps) {
  const [creatingReference, setCreatingReference] = useState(false);
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);

  const [refType, setRefType] = useState<TechnicalReferenceType>('API');
  const [refTitle, setRefTitle] = useState('');
  const [refUrl, setRefUrl] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateReferenceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refTitle.trim() || !refUrl.trim()) {
      setError('Title and URL are required');
      return;
    }

    setCreatingReference(true);
    setError('');
    setSuccess('');

    try {
      const response = await createDocumentReference(documentId, {
        type: refType,
        title: refTitle.trim(),
        url: refUrl.trim(),
      });

      onReferencesUpdated([response.data, ...references]);
      setRefTitle('');
      setRefUrl('');
      setSuccess('Technical reference created successfully.');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } | string } };
      };
      const msg =
        (typeof errorObj.response?.data?.error === 'string'
          ? errorObj.response.data.error
          : errorObj.response?.data?.error?.message) || 'Failed to create technical reference.';
      setError(msg);
    } finally {
      setCreatingReference(false);
    }
  };

  const handleStartEdit = (ref: DocumentReference) => {
    setEditingRefId(ref.id);
    setRefType(ref.type);
    setRefTitle(ref.title);
    setRefUrl(ref.url);
    setError('');
    setSuccess('');
  };

  const handleUpdateReferenceSubmit = async (
    event: FormEvent<HTMLFormElement>,
    refId: string
  ) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await updateDocumentReference(documentId, refId, {
        type: refType,
        title: refTitle.trim(),
        url: refUrl.trim(),
      });

      onReferencesUpdated(references.map((r) => (r.id === refId ? response.data : r)));
      setEditingRefId(null);
      setRefTitle('');
      setRefUrl('');
      setSuccess('Technical reference updated successfully.');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } | string } };
      };
      const msg =
        (typeof errorObj.response?.data?.error === 'string'
          ? errorObj.response.data.error
          : errorObj.response?.data?.error?.message) || 'Failed to update technical reference.';
      setError(msg);
    }
  };

  const handleDeleteReference = async (refId: string) => {
    setDeletingRefId(refId);
    setError('');
    setSuccess('');

    try {
      await deleteDocumentReference(documentId, refId);
      onReferencesUpdated(references.filter((r) => r.id !== refId));
      setSuccess('Technical reference removed.');
    } catch {
      setError('Failed to remove technical reference.');
    } finally {
      setDeletingRefId(null);
    }
  };

  const getRefTypeVariant = (type: TechnicalReferenceType) => {
    switch (type) {
      case 'API':
        return 'info';
      case 'REPOSITORY':
        return 'warning';
      case 'SPECIFICATION':
        return 'success';
      case 'ISSUE':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <Card className="mb-6 border-slate-800 bg-slate-900/80 shadow-md">
      <h2 className="text-xl font-bold text-slate-100 mb-4">External Technical References</h2>

      {canEdit && (
        <form onSubmit={handleCreateReferenceSubmit} className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg mb-6 space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Attach Reference
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={refType}
              onChange={(e) => setRefType(e.target.value as TechnicalReferenceType)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="API">API</option>
              <option value="REPOSITORY">REPOSITORY</option>
              <option value="SPECIFICATION">SPECIFICATION</option>
              <option value="ISSUE">ISSUE</option>
              <option value="OTHER">OTHER</option>
            </select>

            <input
              type="text"
              placeholder="Title / Label (e.g. OpenAPI Spec)"
              value={refTitle}
              onChange={(e) => setRefTitle(e.target.value)}
              required
              minLength={2}
              maxLength={150}
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <input
              type="url"
              placeholder="URL (https://...)"
              value={refUrl}
              onChange={(e) => setRefUrl(e.target.value)}
              required
              maxLength={2000}
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <Button type="submit" variant="primary" isLoading={creatingReference}>
              Add Reference
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
      {success && <p className="text-xs text-emerald-400 mb-4">{success}</p>}

      {referencesLoading ? (
        <p className="text-sm text-slate-400">Loading technical references...</p>
      ) : references.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No external technical references attached.</p>
      ) : (
        <div className="space-y-3">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              {editingRefId === ref.id ? (
                <form
                  onSubmit={(e) => void handleUpdateReferenceSubmit(e, ref.id)}
                  className="flex flex-col md:flex-row gap-2 w-full"
                >
                  <select
                    value={refType}
                    onChange={(e) => setRefType(e.target.value as TechnicalReferenceType)}
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1"
                  >
                    <option value="API">API</option>
                    <option value="REPOSITORY">REPOSITORY</option>
                    <option value="SPECIFICATION">SPECIFICATION</option>
                    <option value="ISSUE">ISSUE</option>
                    <option value="OTHER">OTHER</option>
                  </select>

                  <input
                    type="text"
                    value={refTitle}
                    onChange={(e) => setRefTitle(e.target.value)}
                    required
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 flex-1"
                  />

                  <input
                    type="url"
                    value={refUrl}
                    onChange={(e) => setRefUrl(e.target.value)}
                    required
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 flex-1"
                  />

                  <div className="flex gap-1">
                    <Button type="submit" size="sm" variant="primary">
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingRefId(null);
                        setRefTitle('');
                        setRefUrl('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Badge variant={getRefTypeVariant(ref.type)}>{ref.type}</Badge>
                    <span className="text-sm font-semibold text-slate-200">{ref.title}</span>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline truncate max-w-md"
                    >
                      {ref.url} ↗
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={ref.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm">
                        Open ↗
                      </Button>
                    </a>
                    {canEdit && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => handleStartEdit(ref)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void handleDeleteReference(ref.id)}
                          isLoading={deletingRefId === ref.id}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
