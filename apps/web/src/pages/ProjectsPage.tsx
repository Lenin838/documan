import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { createProject, getProjects, archiveProject } from '../features/projects/project.api';
import type { Project } from '../features/projects/project.types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError('');
      try {
        const response = await getProjects();
        setProjects(response.data.projects);
      } catch {
        setError('Failed to load projects');
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
    setFormError('');

    try {
      const response = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setProjects((prev) => [response.data.project, ...prev]);
      setName('');
      setDescription('');
      setShowCreateForm(false);
    } catch {
      setFormError('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchiveProject(projectId: string) {
    if (!confirm('Are you sure you want to archive this project?')) return;

    try {
      await archiveProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch {
      alert('Failed to archive project');
    }
  }

  return (
    <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Projects</h1>
          <p style={{ color: '#666' }}>Group and manage documents within project context</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            {showCreateForm ? 'Cancel' : '+ New Project'}
          </button>
          <Link to="/documents" style={{ textDecoration: 'none', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
            Back to Documents
          </Link>
        </div>
      </header>

      {showCreateForm && (
        <form onSubmit={handleCreateProject} style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #ddd' }}>
          <h3>Create New Project</h3>
          {formError && <p style={{ color: 'red' }}>{formError}</p>}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payment Microservice Redesign"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional brief description of this project"
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {loading && <p>Loading projects...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <section style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fafafa', borderRadius: '6px', border: '1px dashed #ccc' }}>
          <h3>No Projects Found</h3>
          <p style={{ color: '#666' }}>Create a project to start grouping your documents together.</p>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {projects.map((project) => (
          <div
            key={project.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1rem',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>
                <Link to={`/projects/${project.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                  {project.name}
                </Link>
              </h3>
              {project.description && (
                <p style={{ color: '#555', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>
                  {project.description}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #eee' }}>
              <Link to={`/projects/${project.id}`} style={{ fontSize: '0.85rem', color: '#0066cc' }}>
                View Project Details →
              </Link>
              <button
                type="button"
                onClick={() => handleArchiveProject(project.id)}
                style={{ background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
