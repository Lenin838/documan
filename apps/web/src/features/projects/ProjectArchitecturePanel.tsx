import React, { useState, useEffect, useCallback } from 'react';

import {
  getProjectTopologyLinks,
  getProjectArchitectureGraph,
  createProjectTopologyLink,
  deleteProjectTopologyLink,
  type ProjectTopologyLinkItem,
  type ArchitectureGraphResponse,
  type ProjectTopologyType,
} from './project-topology.api';
import { getProjects } from './project.api';
import type { Project } from './project.types';

interface ProjectArchitecturePanelProps {
  projectId: string;
  isOwnerOrAdmin: boolean;
}

export const ProjectArchitecturePanel: React.FC<ProjectArchitecturePanelProps> = ({
  projectId,
  isOwnerOrAdmin,
}) => {
  const [links, setLinks] = useState<ProjectTopologyLinkItem[]>([]);
  const [graph, setGraph] = useState<ArchitectureGraphResponse | null>(null);
  const [allProjects, setAllProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Form State
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [topologyType, setTopologyType] = useState<ProjectTopologyType>('DEPENDS_ON');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      const [linksRes, graphRes] = await Promise.all([
        getProjectTopologyLinks(projectId),
        getProjectArchitectureGraph(projectId),
      ]);
      setLinks(linksRes.data.links || []);
      setGraph(graphRes.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load architecture topology');
      }
    }
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setError(null);
      try {
        const [linksRes, graphRes] = await Promise.all([
          getProjectTopologyLinks(projectId),
          getProjectArchitectureGraph(projectId),
        ]);
        if (isMounted) {
          setLinks(linksRes.data.links || []);
          setGraph(graphRes.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to load architecture topology');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleOpenCreateModal = async () => {
    setFormError(null);
    try {
      const res = await getProjects();
      const available = (res.data.projects || [])
        .filter((p: Project) => p.id !== projectId)
        .map((p: Project) => ({ id: p.id, name: p.name }));
      setAllProjects(available);
      if (available.length > 0) {
        setTargetProjectId(available[0]!.id);
      }
      setIsCreateModalOpen(true);
    } catch {
      setFormError('Failed to load projects list');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjectId) {
      setFormError('Please select a target project');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await createProjectTopologyLink(projectId, {
        targetProjectId,
        type: topologyType,
        description,
      });
      setIsCreateModalOpen(false);
      setDescription('');
      fetchData();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: { error?: { message?: string } } } }).response;
        setFormError(resp?.data?.error?.message || 'Failed to create topology link');
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Failed to create topology link');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!window.confirm('Are you sure you want to remove this architecture topology link?')) {
      return;
    }
    try {
      await deleteProjectTopologyLink(projectId, linkId);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading System Architecture Topology...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{ padding: '1.25rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            🌐 System Architecture Topology &amp; Cross-Project Governance
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>
            Explicit project-level architectural landscape boundaries and contract governance metrics.
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={handleOpenCreateModal}
            style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
          >
            + Add Topology Link
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {graph && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Connected Architecture Nodes
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {graph.nodes.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Permission-aware project nodes</span>
          </div>

          <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Topology Edges
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {graph.edges.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Architectural dependency links</span>
          </div>

          <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Cross-Project Contract Health
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: graph.edges.some((e) => e.hasActiveDrift) ? '#d97706' : '#059669' }}>
              {graph.edges.some((e) => e.hasActiveDrift) ? '⚠️ Contract Drift Flagged' : '✅ Healthy & Aligned'}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cross-project contract status</span>
          </div>
        </div>
      )}

      {/* Topology Links List Table */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
          Project Architecture Topology Links ({links.length})
        </div>

        {links.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
            No architecture topology links defined for this project yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem' }}>Source Project</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Topology Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Project</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created By</th>
                  {isOwnerOrAdmin && <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const isSourceCurrent = link.sourceProjectId?._id === projectId;
                  return (
                    <tr key={link._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        {link.sourceProjectId?.name || '[Project]'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #cbd5e1', background: '#f1f5f9' }}>
                          → {link.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        {link.targetProjectId?.name || '[Project]'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {link.description || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                        {link.createdBy?.name || 'User'}
                      </td>
                      {isOwnerOrAdmin && (
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          {isSourceCurrent ? (
                            <button
                              onClick={() => handleDelete(link._id)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Remove
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Incoming</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '420px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Add Architecture Topology Link</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>

            {formError && (
              <div style={{ padding: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.75rem', borderRadius: '4px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Target Project
                </label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  required
                >
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Topology Relationship Type
                </label>
                <select
                  value={topologyType}
                  onChange={(e) => setTopologyType(e.target.value as ProjectTopologyType)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="DEPENDS_ON">DEPENDS_ON (This project requires target)</option>
                  <option value="PROVIDES_API_TO">PROVIDES_API_TO (This project exposes API to target)</option>
                  <option value="INTEGRATES_WITH">INTEGRATES_WITH (Peer integration)</option>
                  <option value="SHARED_LIBRARY">SHARED_LIBRARY (Consumes shared library/SDK)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Description / Context (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Architectural boundary description..."
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Saving...' : 'Create Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
