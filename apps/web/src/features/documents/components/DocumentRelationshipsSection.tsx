import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type {
  DocumentRelationship,
  DocumentRelationshipType,
  DocumentDependencySummary,
  DocumentDependencyItem,
} from '../../document-relationships/document-relationship.types';
import type { Document } from '../document.types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  createDocumentRelationship,
  deleteDocumentRelationship,
} from '../../document-relationships/document-relationship.api';

interface DocumentRelationshipsSectionProps {
  documentId: string;
  canEdit: boolean;
  relationships: DocumentRelationship[];
  availableDocuments: Document[];
  dependenciesSummary: DocumentDependencySummary | null;
  upstreamDeps: DocumentDependencyItem[];
  downstreamDeps: DocumentDependencyItem[];
  relationshipsLoading: boolean;
  onRelationshipsUpdated: (updated: DocumentRelationship[]) => void;
}

export function DocumentRelationshipsSection({
  documentId,
  canEdit,
  relationships,
  availableDocuments,
  dependenciesSummary,
  upstreamDeps,
  downstreamDeps,
  relationshipsLoading,
  onRelationshipsUpdated,
}: DocumentRelationshipsSectionProps) {
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedRelType, setSelectedRelType] = useState<DocumentRelationshipType>('REFERENCES');
  const [creatingRelationship, setCreatingRelationship] = useState(false);
  const [deletingRelId, setDeletingRelId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateRelationshipSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTargetId) {
      setError('Please select a target document.');
      return;
    }

    setCreatingRelationship(true);
    setError('');
    setSuccess('');

    try {
      const response = await createDocumentRelationship(documentId, {
        targetDocumentId: selectedTargetId,
        type: selectedRelType,
      });

      onRelationshipsUpdated([response.data, ...relationships]);
      setSuccess('Relationship created successfully');
      setSelectedTargetId('');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const msg = errorObj.response?.data?.error?.message || 'Failed to create relationship';
      setError(msg);
    } finally {
      setCreatingRelationship(false);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    setDeletingRelId(relId);
    setError('');
    setSuccess('');

    try {
      await deleteDocumentRelationship(documentId, relId);
      onRelationshipsUpdated(relationships.filter((r) => r.id !== relId));
      setSuccess('Relationship removed successfully');
    } catch {
      setError('Failed to remove relationship');
    } finally {
      setDeletingRelId(null);
    }
  };

  const getRelBadgeVariant = (type: DocumentRelationshipType) => {
    switch (type) {
      case 'DEPENDS_ON':
        return 'warning';
      case 'REPLACES':
        return 'danger';
      case 'REFERENCES':
        return 'info';
      default:
        return 'neutral';
    }
  };

  return (
    <Card className="mb-6 border-slate-800 bg-slate-900/80 shadow-md">
      <h2 className="text-xl font-bold text-slate-100 mb-4">Dependency &amp; Relationship Architecture</h2>

      {/* Dependency Summary Box */}
      {dependenciesSummary && (
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg mb-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Graph Dependency Status</h3>
          <p className="text-sm text-slate-300">
            {dependenciesSummary.upstreamCount === 0 && dependenciesSummary.downstreamCount === 0
              ? 'No active dependencies found in project topological graph.'
              : `Depends on ${dependenciesSummary.upstreamCount} upstream document(s) and impacts ${dependenciesSummary.downstreamCount} downstream document(s).`}
          </p>
          {dependenciesSummary.cycleDetected && (
            <div className="mt-2 text-xs font-semibold text-amber-400 bg-amber-950/40 p-2 border border-amber-800/60 rounded">
              ⚠️ Warning: Circular dependency detected in topological chain.
            </div>
          )}
        </div>
      )}

      {/* Upstream & Downstream Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-lg">
          <h4 className="text-sm font-semibold text-sky-400 mb-2 flex items-center gap-2">
            <span>⬆️</span> Upstream Dependencies ({upstreamDeps.length})
          </h4>
          {upstreamDeps.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No upstream dependencies</p>
          ) : (
            <div className="space-y-2">
              {upstreamDeps.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded text-xs"
                >
                  <Link
                    to={`/documents/${dep.id}`}
                    className="font-medium text-indigo-400 hover:underline truncate"
                  >
                    {dep.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge size="sm" variant="info">
                      Depth {dep.depth}
                    </Badge>
                    {dep.status && <Badge size="sm">{dep.status}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-lg">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <span>⬇️</span> Downstream Impact ({downstreamDeps.length})
          </h4>
          {downstreamDeps.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No downstream dependencies</p>
          ) : (
            <div className="space-y-2">
              {downstreamDeps.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded text-xs"
                >
                  <Link
                    to={`/documents/${dep.id}`}
                    className="font-medium text-indigo-400 hover:underline truncate"
                  >
                    {dep.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge size="sm" variant="success">
                      Depth {dep.depth}
                    </Badge>
                    {dep.status && <Badge size="sm">{dep.status}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add New Relationship Form */}
      {canEdit && (
        <form onSubmit={handleCreateRelationshipSubmit} className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg mb-6 space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Link Document Relationship
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedRelType}
              onChange={(e) => setSelectedRelType(e.target.value as DocumentRelationshipType)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="REFERENCES">REFERENCES</option>
              <option value="DEPENDS_ON">DEPENDS_ON</option>
              <option value="REPLACES">REPLACES</option>
            </select>

            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              required
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Select target document...</option>
              {availableDocuments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.fileName})
                </option>
              ))}
            </select>

            <Button type="submit" variant="primary" isLoading={creatingRelationship}>
              Add Link
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
      {success && <p className="text-xs text-emerald-400 mb-4">{success}</p>}

      {/* Explicit Document Relationships List */}
      <h3 className="text-sm font-semibold text-slate-300 mb-3">
        Direct Relationships ({relationships.length})
      </h3>

      {relationshipsLoading ? (
        <p className="text-sm text-slate-400">Loading relationships...</p>
      ) : relationships.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No direct document relationships created.</p>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/40 border border-slate-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Badge variant={getRelBadgeVariant(rel.type)}>
                  {rel.direction === 'OUTGOING' ? `${rel.type} →` : `← ${rel.type}`}
                </Badge>
                <Link
                  to={`/documents/${rel.relatedDocument.id}`}
                  className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  {rel.relatedDocument.title}
                </Link>
                <span className="text-xs text-slate-400">({rel.relatedDocument.fileName})</span>
              </div>

              <div className="flex items-center gap-2">
                <Link to={`/documents/${rel.relatedDocument.id}`}>
                  <Button variant="secondary" size="sm">
                    View
                  </Button>
                </Link>
                {canEdit && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleDeleteRelationship(rel.id)}
                    isLoading={deletingRelId === rel.id}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
