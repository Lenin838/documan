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
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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
    if (!id) return;

    async function loadDocument() {
      setLoading(true);
      setError('');

      try {
        const response = await getDocumentById(id!);
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
      <main className="p-8 text-center text-slate-400">
        <p className="mb-4">Invalid document ID</p>
        <Link to="/documents">
          <Button variant="secondary">Back to Documents</Button>
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-12 flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-400 mt-4">Loading document details...</p>
      </main>
    );
  }

  if (error && !doc) {
    return (
      <main className="p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/documents">
          <Button variant="secondary">Back to Documents</Button>
        </Link>
      </main>
    );
  }

  if (!doc) {
    return (
      <main className="p-8 text-center">
        <p className="text-slate-400 mb-4">Document not found</p>
        <Link to="/documents">
          <Button variant="secondary">Back to Documents</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Edit Document</h1>
          <p className="text-sm text-slate-400 mt-1">Update metadata, project placement, or replace source file.</p>
        </div>
        <Link to={`/documents/${id}`}>
          <Button variant="secondary">Cancel</Button>
        </Link>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 shadow-md">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
              maxLength={200}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="folder" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Folder
              </label>
              <select
                id="folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- No Folder (Unfiled) --</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="project" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Project Context
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- No Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. engineering, spec, v2"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current File</h3>
            <p className="text-sm text-slate-200 font-mono">
              {doc.fileName} <span className="text-slate-400 font-sans">({doc.fileType} &bull; {formatFileSize(doc.fileSize)})</span>
            </p>
          </div>

          <div>
            <label htmlFor="file" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Replace File (optional)
            </label>
            <input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
            <Button type="submit" variant="primary" isLoading={saving}>
              Save Changes
            </Button>
            <Link to={`/documents/${id}`}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}
