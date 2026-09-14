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
      <div className="p-8 bg-[#191f31] rounded-[6px] border border-[#1e293b] text-center">
        <p className="text-slate-400 text-sm">Loading System Architecture Topology...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="p-5 bg-[#191f31] rounded-[6px] border border-[#1e293b] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 m-0">
            🌐 System Architecture Topology &amp; Cross-Project Governance
          </h2>
          <p className="text-xs text-slate-400 mt-1 m-0">
            Explicit project-level architectural landscape boundaries and contract governance metrics.
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#020617] font-semibold border-none rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#38bdf8] transition-colors cursor-pointer"
          >
            + Add Topology Link
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] rounded-[6px] text-xs font-mono">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {graph && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#191f31] rounded-[6px] border border-[#1e293b]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Connected Architecture Nodes
            </span>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {graph.nodes.length}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">Permission-aware project nodes</span>
          </div>

          <div className="p-4 bg-[#191f31] rounded-[6px] border border-[#1e293b]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Topology Edges
            </span>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {graph.edges.length}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">Architectural dependency links</span>
          </div>

          <div className="p-4 bg-[#191f31] rounded-[6px] border border-[#1e293b]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Cross-Project Contract Health
            </span>
            <div className={`text-base font-bold mt-1 ${graph.edges.some((e) => e.hasActiveDrift) ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
              {graph.edges.some((e) => e.hasActiveDrift) ? '⚠️ Contract Drift Flagged' : '✅ Healthy & Aligned'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">Cross-project contract status</span>
          </div>
        </div>
      )}

      {/* Topology Links List Table */}
      <div className="bg-[#191f31] rounded-[6px] border border-[#1e293b] overflow-hidden">
        <div className="px-5 py-4 bg-[#191f31]/90 border-b border-[#1e293b] font-semibold text-sm text-slate-200">
          Project Architecture Topology Links ({links.length})
        </div>

        {links.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No architecture topology links defined for this project yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead className="bg-[#0c1324] text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                <tr>
                  <th className="p-3">Source Project</th>
                  <th className="p-3">Topology Type</th>
                  <th className="p-3">Target Project</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Created By</th>
                  {isOwnerOrAdmin && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 text-slate-200">
                {links.map((link) => {
                  const isSourceCurrent = link.sourceProjectId?._id === projectId;
                  return (
                    <tr key={link._id} className="hover:bg-[#1e293b]/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-100">
                        {link.sourceProjectId?.name || '[Project]'}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold border border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8]">
                          → {link.type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-100">
                        {link.targetProjectId?.name || '[Project]'}
                      </td>
                      <td className="p-3 text-slate-400">
                        {link.description || '—'}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[10px]">
                        {link.createdBy?.name || 'User'}
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="p-3 text-right">
                          {isSourceCurrent ? (
                            <button
                              onClick={() => handleDelete(link._id)}
                              className="bg-none border-none text-[#f43f5e] hover:text-red-400 cursor-pointer text-xs font-semibold"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Incoming</span>
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
        <div className="fixed inset-0 z-50 bg-[#0c1324]/85 flex items-center justify-center p-4">
          <div className="bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <h3 className="m-0 text-base font-semibold text-slate-100">Add Architecture Topology Link</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="bg-none border-none text-slate-400 hover:text-slate-100 cursor-pointer text-base">✕</button>
            </div>

            {formError && (
              <div className="p-2 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-xs font-mono rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Target Project
                </label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full p-2 rounded border border-[#1e293b] bg-[#0c1324] text-slate-100 text-xs focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none"
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
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Topology Relationship Type
                </label>
                <select
                  value={topologyType}
                  onChange={(e) => setTopologyType(e.target.value as ProjectTopologyType)}
                  className="w-full p-2 rounded border border-[#1e293b] bg-[#0c1324] text-slate-100 text-xs focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none"
                >
                  <option value="DEPENDS_ON">DEPENDS_ON (This project requires target)</option>
                  <option value="PROVIDES_API_TO">PROVIDES_API_TO (This project exposes API to target)</option>
                  <option value="INTEGRATES_WITH">INTEGRATES_WITH (Peer integration)</option>
                  <option value="SHARED_LIBRARY">SHARED_LIBRARY (Consumes shared library/SDK)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Description / Context (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Architectural boundary description..."
                  rows={3}
                  className="w-full p-2 rounded border border-[#1e293b] bg-[#0c1324] text-slate-100 text-xs focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#0c1324] border border-[#1e293b] text-slate-300 rounded text-xs hover:bg-[#1e293b] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#020617] font-semibold border-none rounded text-xs transition-colors cursor-pointer"
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
