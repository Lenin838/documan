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

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <Breadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
      />

      {/* Project Card Header */}
      <Card className="bg-[#191f31] border border-[#1e293b]">
        <CardBody className="p-6">
          {!isEditing ? (
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                    {project.name}
                  </h1>
                  {project.isOwner && (
                    <Badge variant="info" className="font-mono text-[10px] uppercase">
                      Owner
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-300 max-w-3xl leading-relaxed">
                  {project.description || "No description provided."}
                </p>
                <p className="mt-2 text-xs font-mono text-slate-400">
                  Created on {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              {project.isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="border-[#1e293b] text-slate-300 hover:text-slate-100 hover:bg-[#23293c]"
                >
                  Edit Project
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <h3 className="text-lg font-bold text-slate-100">
                Edit Project
              </h3>
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
        </CardBody>
      </Card>

      {/* Navigation Tabs - Exactly Five Tabs */}
      <Tabs tabs={tabs} activeTab={currentTab} onChange={handleTabChange} />

      {/* Tab 1: Overview */}
      {currentTab === "overview" && (
        <div className="space-y-6">
          {projectId && <KnowledgeRiskRadarPanel projectId={projectId} />}
        </div>
      )}

      {/* Tab 2: Documents */}
      {currentTab === "documents" && (
        <div className="space-y-6">
          <Card className="bg-[#191f31] border border-[#1e293b]">
            <CardHeader className="flex items-center justify-between border-b border-[#1e293b] pb-4">
              <h2 className="text-lg font-bold text-slate-100">
                Assigned Documents ({projectDocs.length})
              </h2>
            </CardHeader>
            <CardBody className="p-6 space-y-6">
              {project.isOwner && (
                <form
                  onSubmit={handleAssignDocument}
                  className="p-4 bg-[#0c1324] rounded-[6px] border border-[#1e293b] space-y-3"
                >
                  <h4 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Assign Document to Project
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
                      Assign
                    </Button>
                  </div>
                </form>
              )}

              {projectDocs.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No documents currently assigned to this project.
                </p>
              ) : (
                <div className="divide-y divide-[#1e293b]">
                  {projectDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <Link
                          to={`/documents/${doc.id}`}
                          className="font-semibold text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
                        >
                          {doc.title}
                        </Link>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {doc.fileName} &bull; {doc.fileType}
                        </p>
                      </div>
                      {project.isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="text-[#f43f5e] hover:text-red-400 hover:bg-[#f43f5e]/10"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
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
