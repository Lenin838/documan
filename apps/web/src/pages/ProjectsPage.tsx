import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  createProject,
  getProjects,
  archiveProject,
} from "../features/projects/project.api";
import type { Project } from "../features/projects/project.types";

import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Breadcrumb } from "../components/ui/Breadcrumb";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "owned">("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Interactive Directory State Simulator State
  const [simulatorState, setSimulatorState] = useState<"default" | "filtered" | "loading" | "empty" | "error">("default");

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError("");
      try {
        const response = await getProjects();
        setProjects(response.data.projects);
      } catch {
        setError("Failed to load projects from canonical registry");
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, []);

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setFormError("");

    try {
      const response = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setProjects((prev) => [response.data.project, ...prev]);
      setName("");
      setDescription("");
      setShowCreateForm(false);
    } catch {
      setFormError("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchiveProject(projectId: string) {
    if (!confirm("Are you sure you want to archive this project node?")) return;

    try {
      await archiveProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch {
      alert("Failed to archive project node");
    }
  }

  // Filtered projects computation
  const filteredProjects = projects.filter((project) => {
    if (filterType === "owned" && !project.isOwner) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = project.name.toLowerCase().includes(q);
      const matchDesc = (project.description || "").toLowerCase().includes(q);
      const matchId = project.id.toLowerCase().includes(q);
      return matchName || matchDesc || matchId;
    }
    return true;
  });

  const isSimLoading = simulatorState === "loading" || (loading && simulatorState === "default");
  const isSimError = simulatorState === "error" || (error && simulatorState === "default");
  const isSimEmpty = simulatorState === "empty" || (!isSimLoading && !isSimError && filteredProjects.length === 0);

  const ownedCount = projects.filter((p) => p.isOwner).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: "Projects" }]} />

      {/* Page Title & Canonical Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1e293b] pb-6">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Projects Directory
            </h1>
            <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#191f31] text-[#38bdf8] rounded border border-[#1e293b]">
              CANONICAL REGISTRY
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Canonical directory of enterprise workspaces organizing living technical documents, system topology, knowledge lineage, and governance verification gates.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="flex items-center gap-1.5"
          >
            <span>{showCreateForm ? "Cancel" : "+ New Project"}</span>
          </Button>
        </div>
      </div>

      {/* Interactive Directory State Simulator Bar */}
      <div className="bg-[#191f31] border border-[#1e293b] rounded-[6px] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#38bdf8] uppercase tracking-wider font-semibold">
            Directory State Simulator:
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSimulatorState("default")}
            className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
              simulatorState === "default"
                ? "bg-[#38bdf8] text-[#0c1324] font-bold"
                : "bg-[#0c1324] text-slate-400 hover:text-slate-200 border border-[#1e293b]"
            }`}
          >
            Default ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setSimulatorState("filtered")}
            className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
              simulatorState === "filtered"
                ? "bg-[#38bdf8] text-[#0c1324] font-bold"
                : "bg-[#0c1324] text-slate-400 hover:text-slate-200 border border-[#1e293b]"
            }`}
          >
            Filtered ({ownedCount})
          </button>
          <button
            type="button"
            onClick={() => setSimulatorState("loading")}
            className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
              simulatorState === "loading"
                ? "bg-[#38bdf8] text-[#0c1324] font-bold"
                : "bg-[#0c1324] text-slate-400 hover:text-slate-200 border border-[#1e293b]"
            }`}
          >
            Loading Skeleton
          </button>
          <button
            type="button"
            onClick={() => setSimulatorState("empty")}
            className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
              simulatorState === "empty"
                ? "bg-[#38bdf8] text-[#0c1324] font-bold"
                : "bg-[#0c1324] text-slate-400 hover:text-slate-200 border border-[#1e293b]"
            }`}
          >
            Empty State
          </button>
          <button
            type="button"
            onClick={() => setSimulatorState("error")}
            className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
              simulatorState === "error"
                ? "bg-[#f43f5e] text-white font-bold"
                : "bg-[#0c1324] text-slate-400 hover:text-slate-200 border border-[#1e293b]"
            }`}
          >
            Error State
          </button>
        </div>
      </div>

      {/* Creation Form Card */}
      {showCreateForm && (
        <Card className="bg-[#191f31] border border-[#1e293b] rounded-[6px]">
          <CardHeader>
            <h3 className="text-lg font-bold text-slate-100">
              Create New Project Workspace
            </h3>
          </CardHeader>
          <CardBody className="p-6">
            <form onSubmit={handleCreateProject} className="space-y-4">
              {formError && (
                <p className="text-xs text-[#f43f5e] font-mono font-medium">
                  {formError}
                </p>
              )}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Payment Microservice Redesign"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-[#1e293b] rounded-[4px] bg-[#0c1324] text-slate-100 text-sm focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional brief description of this project workspace"
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-[#1e293b] rounded-[4px] bg-[#0c1324] text-slate-100 text-sm focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" isLoading={submitting}>
                  Create Project
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Toolbar & Filter Cluster */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, key, or description..."
              className="w-full pl-3 pr-4 py-2 bg-[#0c1324] border border-[#1e293b] rounded-[4px] font-sans text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center border border-[#1e293b] rounded-[4px] p-0.5 bg-[#0c1324]">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  viewMode === "table"
                    ? "bg-[#191f31] text-[#38bdf8] font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#191f31] text-[#38bdf8] font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Grid View
              </button>
            </div>
          </div>
        </div>

        {/* Monospace Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded font-mono transition-colors ${
              filterType === "all"
                ? "bg-[#191f31] text-[#38bdf8] font-bold border border-[#38bdf8]/40"
                : "bg-[#0c1324] text-slate-400 border border-[#1e293b] hover:text-slate-200"
            }`}
          >
            All Workspaces [{projects.length}]
          </button>
          <button
            type="button"
            onClick={() => setFilterType("owned")}
            className={`px-2.5 py-1 rounded font-mono transition-colors ${
              filterType === "owned"
                ? "bg-[#191f31] text-[#38bdf8] font-bold border border-[#38bdf8]/40"
                : "bg-[#0c1324] text-slate-400 border border-[#1e293b] hover:text-slate-200"
            }`}
          >
            My Projects [{ownedCount}]
          </button>
        </div>
      </div>

      {/* SKELETON / LOADING STATE */}
      {isSimLoading && (
        <Card className="bg-[#191f31] border border-[#1e293b] rounded-[6px] p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-[#0c1324] rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 bg-[#0c1324] rounded border border-[#1e293b] flex items-center justify-between px-4"
              >
                <div className="w-1/4 h-4 bg-[#191f31] rounded"></div>
                <div className="w-1/6 h-4 bg-[#191f31] rounded"></div>
                <div className="w-1/6 h-4 bg-[#191f31] rounded"></div>
                <div className="w-1/8 h-4 bg-[#191f31] rounded"></div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-400">
            <span>SYNCHRONIZING CANONICAL REGISTRY...</span>
            <span>PLEASE WAIT</span>
          </div>
        </Card>
      )}

      {/* ERROR STATE */}
      {isSimError && !isSimLoading && (
        <div className="p-6 bg-[#191f31] border border-[#f43f5e]/40 rounded-[6px] text-center space-y-3">
          <p className="text-[#f43f5e] font-bold text-base">
            Telemetry Disconnected
          </p>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            {error || "Failed to fetch workspace ledger from peer consensus. RPC endpoint unreachable."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulatorState("default")}
            className="border-[#f43f5e] text-[#f43f5e] hover:bg-[#f43f5e]/10"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* EMPTY STATE */}
      {isSimEmpty && !isSimLoading && !isSimError && (
        <EmptyState
          title="No Matching Project Nodes"
          description="No matching project nodes in current enclave partition. Adjust filter or create a new workspace."
          action={
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              + New Project
            </Button>
          }
        />
      )}

      {/* STITCH HIGH-DENSITY DATA TABLE (DEFAULT / FILTERED VIEW) */}
      {!isSimLoading && !isSimError && !isSimEmpty && viewMode === "table" && (
        <Card className="bg-[#191f31] border border-[#1e293b] rounded-[6px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0c1324] border-b border-[#1e293b] h-9 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2 w-72">Workspace &amp; Key</th>
                  <th className="px-4 py-2 w-36">Steward / Access</th>
                  <th className="px-4 py-2 w-48">Description</th>
                  <th className="px-4 py-2 w-36">Created Date</th>
                  <th className="px-4 py-2 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] text-sm text-slate-200">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-[#23293c] transition-colors group"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#38bdf8] mt-1.5 shrink-0"></span>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/projects/${project.id}`}
                              className="font-bold text-slate-100 hover:text-[#38bdf8] transition-colors"
                            >
                              {project.name}
                            </Link>
                            <span className="font-mono text-[10px] bg-[#0c1324] px-1.5 py-0.5 rounded text-slate-400 border border-[#1e293b]">
                              NODE-PRJ-{project.id.slice(-4).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      {project.isOwner ? (
                        <Badge variant="info" className="font-mono text-[10px] uppercase">
                          Owner
                        </Badge>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">
                          Member
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top text-xs text-slate-400 max-w-xs truncate">
                      {project.description || "No description provided."}
                    </td>

                    <td className="px-4 py-3 align-top font-mono text-xs text-slate-400">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3 align-top text-right space-x-2">
                      <Link
                        to={`/projects/${project.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0c1324] border border-[#1e293b] hover:border-[#38bdf8] hover:bg-[#191f31] rounded font-mono text-xs text-[#38bdf8] transition-all"
                      >
                        <span>Open &rarr;</span>
                      </Link>
                      {project.isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveProject(project.id)}
                          className="text-[#f43f5e] hover:text-red-400 hover:bg-[#f43f5e]/10 text-xs py-1 px-2"
                        >
                          Archive
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* GRID VIEW FALLBACK */}
      {!isSimLoading && !isSimError && !isSimEmpty && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="flex flex-col justify-between bg-[#191f31] border border-[#1e293b] rounded-[6px] hover:border-[#38bdf8]/40 transition-colors p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-lg text-slate-100">
                  <Link
                    to={`/projects/${project.id}`}
                    className="hover:text-[#38bdf8] transition-colors"
                  >
                    {project.name}
                  </Link>
                </h3>
                {project.isOwner && <Badge variant="info" className="font-mono text-[10px]">Owner</Badge>}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">
                {project.description || "No description provided."}
              </p>
              <div className="flex items-center justify-between text-xs border-t border-[#1e293b] pt-3">
                <Link
                  to={`/projects/${project.id}`}
                  className="font-mono text-[#38bdf8] hover:underline"
                >
                  View Details &rarr;
                </Link>
                {project.isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchiveProject(project.id)}
                    className="text-[#f43f5e] hover:text-red-400 text-xs"
                  >
                    Archive
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* SUMMARY METRIC CARDS */}
      {!isSimLoading && !isSimError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-[#191f31] border border-[#1e293b] rounded-[6px]">
            <span className="block font-mono text-xs text-slate-400 uppercase tracking-wider mb-1">
              TOTAL ACTIVE WORKSPACES
            </span>
            <span className="text-2xl font-extrabold text-slate-100 font-mono">
              {projects.length} Nodes
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Registered in canonical enclave directory
            </p>
          </div>
          <div className="p-4 bg-[#191f31] border border-[#1e293b] rounded-[6px]">
            <span className="block font-mono text-xs text-slate-400 uppercase tracking-wider mb-1">
              OWNED WORKSPACES
            </span>
            <span className="text-2xl font-extrabold text-[#38bdf8] font-mono">
              {ownedCount} Workspaces
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Full steward &amp; assignment permissions
            </p>
          </div>
          <div className="p-4 bg-[#191f31] border border-[#1e293b] rounded-[6px]">
            <span className="block font-mono text-xs text-slate-400 uppercase tracking-wider mb-1">
              GOVERNANCE CLEARANCE
            </span>
            <span className="text-2xl font-extrabold text-[#10b981] font-mono">
              100% Attested
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Passing mandatory verification gates
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
