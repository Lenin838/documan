import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  createProject,
  getProjects,
  archiveProject,
} from "../features/projects/project.api";
import type { Project } from "../features/projects/project.types";

import { Card, CardBody, CardFooter, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Breadcrumb } from "../components/ui/Breadcrumb";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError("");
      try {
        const response = await getProjects();
        setProjects(response.data.projects);
      } catch {
        setError("Failed to load projects");
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
    if (!confirm("Are you sure you want to archive this project?")) return;

    try {
      await archiveProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch {
      alert("Failed to archive project");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Projects" }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            Projects & Workspaces
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Group and manage documents within project context and technical boundaries.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? "Cancel" : "+ New Project"}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-[#191f31] border border-[#1e293b] rounded-[6px]">
          <CardHeader>
            <h3 className="text-lg font-bold text-slate-100">
              Create New Project
            </h3>
          </CardHeader>
          <CardBody>
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
                  className="mt-1 block w-full px-3 py-2 border border-[#1e293b] rounded bg-[#0c1324] text-slate-100 text-sm focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional brief description of this project"
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-[#1e293b] rounded bg-[#0c1324] text-slate-100 text-sm focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] focus:outline-none"
                />
              </div>
              <Button type="submit" variant="primary" isLoading={submitting}>
                Create Project
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner label="Loading projects..." />
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <EmptyState
          title="No Projects Found"
          description="Create a project to start grouping your documents together."
          action={
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              + New Project
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="flex flex-col justify-between bg-[#191f31] border border-[#1e293b] rounded-[6px] hover:border-[#38bdf8]/40 transition-colors"
          >
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-lg text-slate-100">
                  <Link
                    to={`/projects/${project.id}`}
                    className="hover:text-[#38bdf8] transition-colors"
                  >
                    {project.name}
                  </Link>
                </h3>
                {project.isOwner && <Badge variant="info">Owner</Badge>}
              </div>

              <p className="text-sm text-slate-400 line-clamp-3">
                {project.description || "No description provided."}
              </p>
            </CardBody>

            <CardFooter className="flex items-center justify-between text-xs border-t border-[#1e293b]/60 pt-3">
              <Link
                to={`/projects/${project.id}`}
                className="font-semibold text-[#38bdf8] hover:text-[#7dd3fc] hover:underline"
              >
                View Project Details &rarr;
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleArchiveProject(project.id)}
                className="text-[#f43f5e] hover:text-red-400"
              >
                Archive
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
