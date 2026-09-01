import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getProjectById,
  getProjectDocuments,
  updateProject,
  assignDocumentToProject,
  removeDocumentFromProject,
} from '../features/projects/project.api';
import type { Project } from '../features/projects/project.types';
import { getDocuments } from '../features/documents/document.api';
import type { Document } from '../features/documents/document.types';
import { WebhooksSection } from '../components/WebhooksSection';
import { GovernanceSection } from '../components/GovernanceSection';

export default function ProjectDetailsPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [projectDocs, setProjectDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Project editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // Document assignment state
  const [allUserDocs, setAllUserDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [projRes, docsRes] = await Promise.all([
          getProjectById(projectId!),
          getProjectDocuments(projectId!),
        ]);
        setProject(projRes.data.project);
        setProjectDocs(docsRes.data.documents);
        setEditName(projRes.data.project.name);
        setEditDescription(projRes.data.project.description || '');

        // Fetch all accessible documents for the dropdown selector
        const userDocsRes = await getDocuments({ limit: 100 });
        setAllUserDocs(userDocsRes.data.documents);
      } catch {
        setError('Project not found or access denied');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [projectId]);

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
      alert('Failed to update project');
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssignDocument(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !selectedDocId) return;

    setAssigning(true);
    setAssignError('');

    try {
      await assignDocumentToProject(projectId, selectedDocId);
      const updatedDocsRes = await getProjectDocuments(projectId);
      setProjectDocs(updatedDocsRes.data.documents);
      setSelectedDocId('');
    } catch {
      setAssignError('Failed to assign document. Verify edit permissions.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveDocument(documentId: string) {
    if (!projectId || !confirm('Remove document from this project?')) return;

    try {
      await removeDocumentFromProject(projectId, documentId);
      setProjectDocs((prev) => prev.filter((d) => d.id !== documentId));
    } catch {
      alert('Failed to remove document. You must be project owner/admin and have document edit access.');
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        <p>Loading project details...</p>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        <p style={{ color: 'red' }}>{error || 'Project not found'}</p>
        <Link to="/projects">Back to Projects</Link>
      </main>
    );
  }

  // Available documents for dropdown (exclude already assigned)
  const unassignedDocs = allUserDocs.filter(
    (doc) => !projectDocs.some((pd) => pd.id === doc.id),
  );

  return (
    <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link to="/projects" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Projects
        </Link>
      </nav>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
        {!isEditing ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ margin: '0 0 0.5rem 0' }}>{project.name}</h1>
                <p style={{ color: '#666', margin: '0 0 1rem 0' }}>
                  {project.description || 'No description provided.'}
                </p>
              </div>
              {project.isOwner && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}
                >
                  Edit Project
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
              Created on {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdateProject}>
            <h3>Edit Project</h3>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={updating} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {projectId && (
        <div style={{ marginBottom: '2rem' }}>
          <GovernanceSection projectId={projectId} isOwnerOrAdmin={!!project.isOwner} />
        </div>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Project Documents ({projectDocs.length})</h2>
        </div>

        {project.isOwner && (
          <form onSubmit={handleAssignDocument} style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #ddd' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Assign Document to Project</h4>
            {assignError && <p style={{ color: 'red', fontSize: '0.9rem' }}>{assignError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">-- Select a Document --</option>
                {unassignedDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} ({doc.fileName})
                  </option>
                ))}
              </select>
              <button type="submit" disabled={assigning || !selectedDocId} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </form>
        )}

        {projectDocs.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No documents currently assigned to this project.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {projectDocs.map((doc) => (
              <li
                key={doc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid #eee',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  background: '#fff',
                }}
              >
                <div>
                  <Link to={`/documents/${doc.id}`} style={{ fontWeight: 'bold', color: '#0066cc', textDecoration: 'none' }}>
                    {doc.title}
                  </Link>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
                    {doc.fileName} • {doc.fileType}
                  </div>
                </div>
                {project.isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id)}
                    style={{ background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {project && (project.isOwner || project.ownerId) && projectId && (
        <WebhooksSection projectId={projectId} />
      )}
    </main>
  );
}
