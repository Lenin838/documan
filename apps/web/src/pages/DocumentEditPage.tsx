import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getDocumentById,
  updateDocument,
} from '../features/documents/document.api';
import { getFolders } from '../features/folders/folder.api';
import type { Document } from '../features/documents/document.types';
import type { Folder } from '../features/folders/folder.types';
import { getProjects } from '../features/projects/project.api';
import type { Project } from '../features/projects/project.types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFoldersAndProjects() {
      try {
        const [foldersRes, projectsRes] = await Promise.all([
          getFolders(),
          getProjects(),
        ]);
        setFolders(foldersRes.data.folders);
        setProjects(projectsRes.data.projects);
      } catch {
        // Ignore loading errors
      }
    }

    void loadFoldersAndProjects();
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    const documentId = id;

    async function loadDocument() {
      setLoading(true);
      setError('');

      try {
        const response = await getDocumentById(documentId);
        setDoc(response.data);
        setTitle(response.data.title);
        setDescription(response.data.description || '');
        setFolderId(response.data.folderId || '');
        setProjectId(response.data.projectId || '');
        setTagsInput(response.data.tags ? response.data.tags.join(', ') : '');
      } catch {
        setError('Unable to load document.');
      } finally {
        setLoading(false);
      }
    }

    void loadDocument();
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) {
      setError('Invalid document ID');
      return;
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 200) {
      setError('Title must be between 2 and 200 characters');
      return;
    }

    if (description.length > 1000) {
      setError('Description must not exceed 1000 characters');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setSaving(true);
    setError('');

    try {
      await updateDocument(id, {
        title: trimmedTitle,
        description: description.trim(),
        folderId: folderId || null,
        projectId: projectId || null,
        tags: parsedTags,
        file: file || undefined,
      });

      navigate(`/documents/${id}`);
    } catch {
      setError('Failed to update document');
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return (
      <main>
        <p>Invalid document ID</p>
        <Link to="/documents">Back to Documents</Link>
      </main>
    );
  }

  if (loading) {
    return <main>Loading document...</main>;
  }

  if (error && !doc) {
    return (
      <main>
        <p>{error}</p>
        <Link to="/documents">Back to Documents</Link>
      </main>
    );
  }

  if (!doc) {
    return (
      <main>
        <p>Document not found</p>
        <Link to="/documents">Back to Documents</Link>
      </main>
    );
  }

  return (
    <main
      style={{
        textAlign: 'left',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1>Edit Document</h1>
        <Link to={`/documents/${id}`}>Cancel</Link>
      </header>

      {error && (
        <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="title"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={200}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="description"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="folder"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Folder
          </label>
          <select
            id="folder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          >
            <option value="">-- No Folder (Unfiled) --</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="project"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Project Context
          </label>
          <select
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          >
            <option value="">-- No Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="tags"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. engineering, spec, v2"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem',
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Current File</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
            <strong>{doc.fileName}</strong> ({doc.fileType} • {formatFileSize(doc.fileSize)})
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="file"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Replace File (optional)
          </label>
          <input
            id="file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link to={`/documents/${id}`}>Cancel</Link>
        </div>
      </form>
    </main>
  );
}
