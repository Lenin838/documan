import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getDeletedDocuments,
  restoreDocument,
} from '../features/documents/document.api';
import type { Document } from '../features/documents/document.types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function TrashPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    async function loadTrash() {
      setLoading(true);
      setError('');

      try {
        const response = await getDeletedDocuments({
          page,
          limit: 10,
          search: search || undefined,
        });

        setDocuments(response.data.documents);
        setTotalPages(response.data.pagination.totalPages || 1);
      } catch {
        setError('Unable to load deleted documents.');
      } finally {
        setLoading(false);
      }
    }

    void loadTrash();
  }, [page, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleRestore(documentId: string) {
    if (restoringId) {
      return;
    }

    setRestoringId(documentId);
    setActionError('');

    try {
      await restoreDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch {
      setActionError('Unable to restore this document.');
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <main style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Trash</h1>
        <Link to="/documents">Back to Documents</Link>
      </header>

      <section style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search deleted documents..."
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </section>

      {actionError && (
        <p style={{ color: 'red', marginBottom: '1rem' }}>{actionError}</p>
      )}

      {loading && <p>Loading trash...</p>}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>File Name</th>
                <th>File Type</th>
                <th>File Size</th>
                <th>Created Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.title}</td>
                  <td>{doc.fileName}</td>
                  <td>{doc.fileType}</td>
                  <td>{formatFileSize(doc.fileSize)}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void handleRestore(doc.id)}
                      disabled={restoringId === doc.id}
                    >
                      {restoringId === doc.id ? 'Restoring...' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {search ? 'No deleted documents found for this search.' : 'No deleted documents found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
            <button
              type="button"
              disabled={page === 1 || Boolean(restoringId)}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages || Boolean(restoringId)}
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
