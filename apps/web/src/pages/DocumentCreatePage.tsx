import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { createDocument } from '../features/documents/document.api';
import { getFolders } from '../features/folders/folder.api';
import type { Folder } from '../features/folders/folder.types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFolders() {
      try {
        const response = await getFolders();
        setFolders(response.data.folders);
      } catch {
        // Folders loading failed silently, user can still create unfiled document
      }
    }

    void loadFolders();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 200) {
      setError('Title must be between 2 and 200 characters');
      return;
    }

    if (description.length > 1000) {
      setError('Description must not exceed 1000 characters');
      return;
    }

    if (!file) {
      setError('Document file is required');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setCreating(true);
    setError('');

    try {
      const response = await createDocument({
        title: trimmedTitle,
        description: description.trim() || undefined,
        folderId: folderId || null,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        file,
      });

      navigate(`/documents/${response.data.id}`);
    } catch {
      setError('Failed to create document');
    } finally {
      setCreating(false);
    }
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
        <h1>Create Document</h1>
        <Link to="/documents">Cancel</Link>
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
            placeholder="Enter a descriptive title"
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
            placeholder="Enter document description (optional)"
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

        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="file"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Upload File *
          </label>
          <input
            id="file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          {file && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: '#fafafa',
                border: '1px solid #eee',
                borderRadius: '4px',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
                Selected: <strong>{file.name}</strong> ({formatFileSize(file.size)})
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1.5rem' }}>
          <button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Document'}
          </button>
          <Link to="/documents">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
