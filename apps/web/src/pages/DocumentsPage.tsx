import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { getDocuments } from '../features/documents/document.api';
import type { Document } from '../features/documents/document.types';
import {
  createFolder,
  deleteFolder,
  getFolders,
  updateFolder,
} from '../features/folders/folder.api';
import type { Folder } from '../features/folders/folder.types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [documentView, setDocumentView] = useState<'mine' | 'shared'>('mine');
  const [selectedTag, setSelectedTag] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');

  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  const [folderActionError, setFolderActionError] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFoldersList() {
      try {
        const response = await getFolders();
        setFolders(response.data.folders);
      } catch {
        // Ignore folder list fetch errors silently
      }
    }

    void loadFoldersList();
  }, []);

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError('');

      try {
        const response = await getDocuments({
          page,
          limit: 10,
          search: search || undefined,
          folderId: selectedFolderId || undefined,
          view: documentView,
          tag: selectedTag || undefined,
          fileType: fileTypeFilter || undefined,
        });

        setDocuments(response.data.documents);
        setTotalPages(response.data.pagination.totalPages || 1);
      } catch {
        setError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    }

    void loadDocuments();
  }, [page, search, selectedFolderId, documentView, selectedTag, fileTypeFilter]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleTagChange(value: string) {
    setSelectedTag(value);
    setPage(1);
  }

  function handleFileTypeChange(value: string) {
    setFileTypeFilter(value);
    setPage(1);
  }

  function handleViewChange(view: 'mine' | 'shared') {
    setDocumentView(view);
    setPage(1);
  }

  function handleFolderSelect(id: string) {
    setSelectedFolderId(id);
    setPage(1);
  }

  async function handleCreateFolderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setFolderActionError('Folder name is required');
      return;
    }

    setCreatingFolder(true);
    setFolderActionError('');

    try {
      const created = await createFolder({ name: trimmed });
      setFolders((prev) => [...prev, created.data]);
      setSelectedFolderId(created.data.id);
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch {
      setFolderActionError('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleUpdateFolderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFolderId) return;

    const trimmed = editingFolderName.trim();
    if (!trimmed) {
      setFolderActionError('Folder name is required');
      return;
    }

    setSavingFolder(true);
    setFolderActionError('');

    try {
      const updated = await updateFolder(editingFolderId, { name: trimmed });
      setFolders((prev) =>
        prev.map((f) => (f.id === editingFolderId ? updated.data : f)),
      );
      setEditingFolderId(null);
      setEditingFolderName('');
    } catch {
      setFolderActionError('Failed to rename folder');
    } finally {
      setSavingFolder(false);
    }
  }

  async function handleDeleteFolder(folderIdToDelete: string) {
    setFolderActionError('');

    try {
      await deleteFolder(folderIdToDelete);
      setFolders((prev) => prev.filter((f) => f.id !== folderIdToDelete));
      if (selectedFolderId === folderIdToDelete) {
        setSelectedFolderId('');
      }
    } catch {
      setFolderActionError('Failed to delete folder');
    }
  }

  const activeFolder = folders.find((f) => f.id === selectedFolderId);

  return (
    <main style={{ textAlign: 'left', maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Documents</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/documents/create">Create Document</Link>
          <Link to="/trash">View Trash</Link>
          <Link to="/dashboard">Back to Dashboard</Link>
        </div>
      </header>

      {/* Main View Toggle: My Documents vs Shared with Me */}
      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => handleViewChange('mine')}
          style={{
            fontWeight: documentView === 'mine' ? 'bold' : 'normal',
            borderBottom: documentView === 'mine' ? '3px solid #0056b3' : 'none',
            borderRadius: 0,
            background: 'none',
            color: documentView === 'mine' ? '#0056b3' : '#555',
            padding: '0.5rem 1rem',
          }}
        >
          📄 My Documents
        </button>

        <button
          type="button"
          onClick={() => handleViewChange('shared')}
          style={{
            fontWeight: documentView === 'shared' ? 'bold' : 'normal',
            borderBottom: documentView === 'shared' ? '3px solid #0056b3' : 'none',
            borderRadius: 0,
            background: 'none',
            color: documentView === 'shared' ? '#0056b3' : '#555',
            padding: '0.5rem 1rem',
          }}
        >
          🤝 Shared with Me
        </button>
      </nav>

      {/* Folders Navigation / Filter Bar (Only shown in My Documents view) */}
      {documentView === 'mine' && (
        <section
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Folders</h2>
            <button
              type="button"
              onClick={() => {
                setShowCreateFolder(!showCreateFolder);
                setFolderActionError('');
              }}
            >
              {showCreateFolder ? 'Cancel' : '+ New Folder'}
            </button>
          </div>

          {showCreateFolder && (
            <form onSubmit={(e) => void handleCreateFolderSubmit(e)} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
                maxLength={100}
              />
              <button type="submit" disabled={creatingFolder}>
                {creatingFolder ? 'Creating...' : 'Save Folder'}
              </button>
            </form>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => handleFolderSelect('')}
              style={{
                fontWeight: selectedFolderId === '' ? 'bold' : 'normal',
                background: selectedFolderId === '' ? '#0056b3' : undefined,
                color: selectedFolderId === '' ? 'white' : undefined,
              }}
            >
              All Documents
            </button>

            <button
              type="button"
              onClick={() => handleFolderSelect('none')}
              style={{
                fontWeight: selectedFolderId === 'none' ? 'bold' : 'normal',
                background: selectedFolderId === 'none' ? '#0056b3' : undefined,
                color: selectedFolderId === 'none' ? 'white' : undefined,
              }}
            >
              Unfiled
            </button>

            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => handleFolderSelect(folder.id)}
                style={{
                  fontWeight: selectedFolderId === folder.id ? 'bold' : 'normal',
                  background: selectedFolderId === folder.id ? '#0056b3' : undefined,
                  color: selectedFolderId === folder.id ? 'white' : undefined,
                }}
              >
                📁 {folder.name}
              </button>
            ))}
          </div>

          {activeFolder && (
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>Selected Folder: <strong>{activeFolder.name}</strong></span>

              {editingFolderId === activeFolder.id ? (
                <form onSubmit={(e) => void handleUpdateFolderSubmit(e)} style={{ display: 'inline-flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    required
                    maxLength={100}
                  />
                  <button type="submit" disabled={savingFolder}>
                    {savingFolder ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingFolderId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolderId(activeFolder.id);
                      setEditingFolderName(activeFolder.name);
                    }}
                  >
                    Rename
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteFolder(activeFolder.id)}
                    style={{ color: 'red' }}
                  >
                    Delete Folder
                  </button>
                </>
              )}
            </div>
          )}

          {folderActionError && (
            <p style={{ color: 'red', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>{folderActionError}</p>
          )}
        </section>
      )}

      {/* Advanced Search & Filtering Controls */}
      <section style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search title or file name"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          style={{ flex: '1 1 200px', padding: '0.5rem' }}
        />

        <input
          type="text"
          placeholder="Filter by tag (e.g. spec)"
          value={selectedTag}
          onChange={(event) => handleTagChange(event.target.value)}
          style={{ flex: '0 1 180px', padding: '0.5rem' }}
        />

        <select
          value={fileTypeFilter}
          onChange={(event) => handleFileTypeChange(event.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="">All File Types</option>
          <option value="pdf">PDF Documents</option>
          <option value="image">Images</option>
          <option value="text">Text / Markdown</option>
          <option value="json">JSON / Code</option>
        </select>
      </section>

      {loading && <p>Loading documents...</p>}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Tags</th>
                <th>File Name</th>
                <th>File Type</th>
                <th>File Size</th>
                <th>Created Date</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                  </td>
                  <td>
                    {doc.tags && doc.tags.length > 0 ? (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {doc.tags.map((t) => (
                          <span
                            key={t}
                            onClick={() => handleTagChange(t)}
                            style={{
                              background: '#edf2f7',
                              color: '#2b6cb0',
                              cursor: 'pointer',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '3px',
                              fontSize: '0.8rem',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#aaa', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td>{doc.fileName}</td>
                  <td>{doc.fileType}</td>
                  <td>{formatFileSize(doc.fileSize)}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {documentView === 'shared'
                      ? 'No documents have been shared with you.'
                      : 'No documents found in this view.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}
