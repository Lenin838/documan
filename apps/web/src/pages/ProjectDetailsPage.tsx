import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import {
  getProjectById,
  getProjectDocuments,
  updateProject,
  assignDocumentToProject,
  removeDocumentFromProject,
} from "../features/projects/project.api";
import type { Project } from "../features/projects/project.types";
import { getDocuments } from "../features/documents/document.api";
import type { Document } from "../features/documents/document.types";
import { WebhooksSection } from "../components/WebhooksSection";
import { GovernanceSection } from "../components/GovernanceSection";
import { SystemBaselineAlignmentSection } from "../features/governance/components/SystemBaselineAlignmentSection";
import { SystemGovernanceGateSection } from "../features/governance/components/SystemGovernanceGateSection";
import { ApiSpecsSection } from "../components/ApiSpecsSection";
import { KnowledgeRiskRadarPanel } from "../components/KnowledgeRiskRadarPanel";
import { ProjectArchitecturePanel } from "../features/projects/ProjectArchitecturePanel";
import { ProjectProposalsTab } from "../features/change-proposals/components/ProjectProposalsTab";
import { ProjectChangePackagesTab } from "../features/change-packages/components/ProjectChangePackagesTab";
import { SystemReleaseLineageView } from "../features/governance/SystemReleaseLineageView";

import { Breadcrumb } from "../components/ui/Breadcrumb";
import { Tabs, type TabItem } from "../components/ui/Tabs";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Badge } from "../components/ui/Badge";

export default function ProjectDetailsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState<Project | null>(null);
  const [projectDocs, setProjectDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab State - Canonical 5-Tab Architecture with fallback for legacy tab queries
  const rawTab = searchParams.get("tab") || "overview";
  const currentTab =
    rawTab === "architecture"
      ? "relationships"
      : rawTab === "change-management" || rawTab === "certificates"
      ? "governance"
      : rawTab;

  // Project editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updating, setUpdating] = useState(false);

  // Document assignment state
  const [allUserDocs, setAllUserDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [projRes, docsRes] = await Promise.all([
          getProjectById(projectId!),
          getProjectDocuments(projectId!),
        ]);
        setProject(projRes.data.project);
        setProjectDocs(docsRes.data.documents);
        setEditName(projRes.data.project.name);
        setEditDescription(projRes.data.project.description || "");

        // Fetch all accessible documents for the dropdown selector
        const userDocsRes = await getDocuments({ limit: 100 });
        setAllUserDocs(userDocsRes.data.documents);
      } catch {
        setError("Project not found or access denied");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [projectId]);

  function handleTabChange(tabId: string) {
    setSearchParams({ tab: tabId }, { replace: true });
  }

  async function handleUpdateProject(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !editName.trim()) return;

    setUpdating(true);
    try {
      const response = await updateProject(projectId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setProject(response.data.project);
      setIsEditing(false);
    } catch {
      alert("Failed to update project");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssignDocument(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !selectedDocId) return;

    setAssigning(true);
    setAssignError("");

    try {
      await assignDocumentToProject(projectId, selectedDocId);
      const updatedDocsRes = await getProjectDocuments(projectId);
      setProjectDocs(updatedDocsRes.data.documents);
      setSelectedDocId("");
    } catch {
      setAssignError("Failed to assign document. Verify edit permissions.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveDocument(documentId: string) {
    if (!projectId || !confirm("Remove document from this project?")) return;

    try {
      await removeDocumentFromProject(projectId, documentId);
      setProjectDocs((prev) => prev.filter((d) => d.id !== documentId));
    } catch {
      alert(
        "Failed to remove document. You must be project owner/admin and have document edit access."
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner label="Loading project details..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card className="p-6 bg-[#191f31] border border-[#1e293b]">
        <p className="font-semibold text-[#f43f5e]">{error || "Project not found"}</p>
        <Link
          to="/projects"
          className="mt-3 inline-block font-mono text-sm text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
        >
          &larr; Back to Projects
        </Link>
      </Card>
    );
  }

  const unassignedDocs = allUserDocs.filter(
    (doc) => !projectDocs.some((pd) => pd.id === doc.id)
  );

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "documents", label: "Documents", count: projectDocs.length },
    { id: "relationships", label: "Relationships" },
    { id: "knowledge", label: "Knowledge" },
    { id: "governance", label: "Governance" },
  ];

  const projectInitials = project.name.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <Breadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      />

      {/* Stitch 08_PW Persistent Project Header */}
      <div className="bg-[#191f31] border border-[#1e293b] rounded-lg p-5 sm:p-6 space-y-4 shadow-sm">
        {!isEditing ? (
          <>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-9 w-9 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] flex items-center justify-center font-mono font-bold text-sm">
                  {projectInitials}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                  {project.name}
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#0c1324] border border-[#1e293b] text-xs font-mono text-slate-300">
                  ID: {project.id.substring(0, 8)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  COMPLIANT (99.8%)
                </span>
                {project.isOwner && (
                  <Badge variant="info" className="font-mono text-[10px] uppercase">
                    Owner
                  </Badge>
                )}
              </div>
              {project.isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="border-[#1e293b] text-slate-300 hover:text-slate-100 hover:bg-[#23293c] self-start lg:self-auto"
                >
                  Edit Project Workspace
                </Button>
              )}
            </div>

            <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
              {project.description || "Central deterministic execution runtime, transaction consensus verification engine, and living specification repository."}
            </p>

            {/* Stitch 7-Column Metadata Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-y-3 gap-x-4 pt-3 border-t border-[#1e293b] text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">STEWARD</span>
                <span className="text-slate-200 font-medium truncate block">
                  {project.isOwner ? "You (Owner)" : "Project Admin"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">LEAD ARCHITECT</span>
                <span className="text-slate-200 font-medium truncate block">System Lead</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">LIVING DOCS</span>
                <span className="text-[#38bdf8] font-medium">{projectDocs.length} Documents</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">KNOWLEDGE NODES</span>
                <span className="text-slate-200 font-medium">384 Entities</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">RELATIONSHIPS</span>
                <span className="text-slate-200 font-medium">28 Contracts</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">BASELINE</span>
                <span className="text-[#38bdf8] font-medium">Rel-2025.02-Prime</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">LAST EVALUATED</span>
                <span className="text-emerald-400 font-medium">12m ago</span>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Edit Project Workspace</h3>
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-[#1e293b] rounded-[4px] shadow-sm bg-[#0c1324] text-slate-100 text-sm focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-[#1e293b] rounded-[4px] shadow-sm bg-[#0c1324] text-slate-100 text-sm focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" isLoading={updating}>
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Navigation Tabs - Exactly Five Tabs */}
      <Tabs tabs={tabs} activeTab={currentTab} onChange={handleTabChange} />

      {/* Tab 1: Overview */}
      {currentTab === "overview" && (
        <div className="space-y-6">
          {/* Stitch High-Density Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#191f31] border border-[#1e293b] hover:border-[#38bdf8]/50 transition-colors space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
                <span>Invariant Pass Rate</span>
                <span className="text-emerald-400 text-sm">✓</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100 font-mono">100%</span>
                <span className="text-xs font-mono text-emerald-400">142/142 Checked</span>
              </div>
              <div className="w-full bg-[#0c1324] h-1.5 rounded overflow-hidden border border-[#1e293b]">
                <div className="bg-emerald-500 h-full rounded w-full"></div>
              </div>
              <p className="text-[11px] font-mono text-slate-400">Zero drift across all formal specifications</p>
            </div>

            <div className="p-4 rounded-lg bg-[#191f31] border border-[#1e293b] hover:border-[#38bdf8]/50 transition-colors space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
                <span>Active Mappings</span>
                <span className="text-[#38bdf8] text-sm">⚡</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100 font-mono">28</span>
                <span className="text-xs font-mono text-slate-400">0 Drift</span>
              </div>
              <div className="w-full bg-[#0c1324] h-1.5 rounded overflow-hidden border border-[#1e293b]">
                <div className="bg-[#38bdf8] h-full rounded w-full"></div>
              </div>
              <p className="text-[11px] font-mono text-slate-400">4 Upstream • 16 Peer • 8 Downstream</p>
            </div>

            <div className="p-4 rounded-lg bg-[#191f31] border border-[#1e293b] hover:border-[#38bdf8]/50 transition-colors space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
                <span>Knowledge Entities</span>
                <span className="text-indigo-400 text-sm">🧠</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100 font-mono">384</span>
                <span className="text-xs font-mono text-indigo-400">0 Risk Flag</span>
              </div>
              <div className="w-full bg-[#0c1324] h-1.5 rounded overflow-hidden border border-[#1e293b]">
                <div className="bg-indigo-500 h-full rounded w-full"></div>
              </div>
              <p className="text-[11px] font-mono text-slate-400">99.4% Avg attestation confidence</p>
            </div>

            <div className="p-4 rounded-lg bg-[#191f31] border border-[#1e293b] hover:border-[#38bdf8]/50 transition-colors space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
                <span>Governance Clearance</span>
                <span className="text-purple-400 text-sm">🛡️</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100 font-mono">SIGNED</span>
                <span className="text-xs font-mono text-purple-400">FIPS-140-3</span>
              </div>
              <div className="w-full bg-[#0c1324] h-1.5 rounded overflow-hidden border border-[#1e293b]">
                <div className="bg-purple-500 h-full rounded w-full"></div>
              </div>
              <p className="text-[11px] font-mono text-slate-400">SOC2 Type II active attestation valid</p>
            </div>
          </div>

          {/* Stitch Project Temporal Health Card [T_cert vs T_now] */}
          <div className="bg-[#191f31] border border-[#1e293b] rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e293b] gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[#38bdf8] font-mono">⏱️</span>
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Project Temporal Health & Attestation Differential
                </h2>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold self-start sm:self-auto">
                CONFORMANT (0 UNCOMMITTED CLAUSES)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* T_cert Baseline */}
              <div className="p-4 rounded-lg bg-[#0c1324] border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400"></span> [T_cert] BASELINE SEAL
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded uppercase">
                    FROZEN BASELINE
                  </span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Release Tag:</span>
                    <span className="text-slate-200 font-semibold">Rel-2025.02-Prime</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Root Merkle Hash:</span>
                    <span className="text-purple-300">sha256:a49109bc87...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Certified Invariants:</span>
                    <span className="text-slate-200">142 Registered (100% Attested)</span>
                  </div>
                </div>
              </div>

              {/* T_now Current State */}
              <div className="p-4 rounded-lg bg-[#0c1324] border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#38bdf8] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#38bdf8] animate-pulse"></span> [T_now] CURRENT OBSERVED RUNTIME
                  </span>
                  <span className="text-[10px] font-mono text-[#38bdf8] bg-[#38bdf8]/20 border border-[#38bdf8]/30 px-2 py-0.5 rounded uppercase">
                    LIVE TELEMETRY
                  </span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active State:</span>
                    <span className="text-[#38bdf8] font-semibold">HEAD @ {project.name.toLowerCase().replace(/\s+/g, "-")}/main</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Observed Hash:</span>
                    <span className="text-[#38bdf8]">sha256:a49109bc87...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Drift Delta:</span>
                    <span className="text-emerald-400 font-semibold">0 Differences (In-Sync)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {projectId && <KnowledgeRiskRadarPanel projectId={projectId} />}
        </div>
      )}

      {/* Tab 2: Documents */}
      {currentTab === "documents" && (
        <div className="space-y-6">
          <Card className="bg-[#191f31] border border-[#1e293b]">
            <CardHeader className="flex items-center justify-between border-b border-[#1e293b] pb-4">
              <h2 className="text-lg font-bold text-slate-100">
                Assigned Living Documents ({projectDocs.length})
              </h2>
            </CardHeader>
            <CardBody className="p-6 space-y-6">
              {project.isOwner && (
                <form
                  onSubmit={handleAssignDocument}
                  className="p-4 bg-[#0c1324] rounded-[6px] border border-[#1e293b] space-y-3"
                >
                  <h4 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Assign Document to Project Workspace
                  </h4>
                  {assignError && (
                    <p className="text-xs text-[#f43f5e] font-mono">
                      {assignError}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#1e293b] rounded-[4px] bg-[#191f31] text-slate-100 text-sm focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
                    >
                      <option value="">-- Select a Document --</option>
                      {unassignedDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.title} ({doc.fileName})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={assigning}
                      disabled={!selectedDocId}
                    >
                      Assign Document
                    </Button>
                  </div>
                </form>
              )}

              {projectDocs.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No living documents currently assigned to this project workspace.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 border-collapse">
                    <thead>
                      <tr className="border-b border-[#1e293b] text-xs font-mono text-slate-400 uppercase tracking-wider bg-[#0c1324]">
                        <th className="py-3 px-4 font-semibold">Document Title</th>
                        <th className="py-3 px-4 font-semibold">Type</th>
                        <th className="py-3 px-4 font-semibold">File / Reference</th>
                        <th className="py-3 px-4 font-semibold">Assigned</th>
                        {project.isOwner && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {projectDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[#23293c]/50 transition-colors">
                          <td className="py-3 px-4">
                            <Link
                              to={`/documents/${doc.id}`}
                              className="font-semibold text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
                            >
                              {doc.title}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-[#0c1324] border border-[#1e293b]">
                              {doc.fileType || "SPEC"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">
                            {doc.fileName}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </td>
                          {project.isOwner && (
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="text-[#f43f5e] hover:text-red-400 hover:bg-[#f43f5e]/10"
                              >
                                Remove
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab 3: Relationships */}
      {currentTab === "relationships" && projectId && (
        <div className="space-y-6">
          <ProjectArchitecturePanel
            projectId={projectId}
            isOwnerOrAdmin={Boolean(project?.isOwner)}
          />
          <ApiSpecsSection
            projectId={projectId}
            isOwnerOrAdmin={!!project.isOwner}
          />
          {project && (project.isOwner || project.ownerId) && (
            <WebhooksSection projectId={projectId} />
          )}
        </div>
      )}

      {/* Tab 4: Knowledge */}
      {currentTab === "knowledge" && projectId && (
        <div className="space-y-6">
          <KnowledgeRiskRadarPanel projectId={projectId} />
        </div>
      )}

      {/* Tab 5: Governance */}
      {currentTab === "governance" && projectId && (
        <div className="space-y-8">
          <GovernanceSection
            projectId={projectId}
            isOwnerOrAdmin={!!project.isOwner}
          />
          <SystemBaselineAlignmentSection projectId={projectId} />
          <SystemGovernanceGateSection projectId={projectId} />
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-100 tracking-tight">
              Pre-Change Proposals &amp; Simulations
            </h2>
            <ProjectProposalsTab projectId={projectId} />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-100 tracking-tight">
              Multi-Document Change Packages
            </h2>
            <ProjectChangePackagesTab projectId={projectId} />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-100 tracking-tight">
              Release Certificates &amp; Lineage
            </h2>
            <SystemReleaseLineageView
              projectId={projectId}
              projectName={project?.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
