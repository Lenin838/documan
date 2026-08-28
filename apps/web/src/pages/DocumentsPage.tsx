import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getDocuments } from '../features/documents/document.api';
import type { Document } from '../features/documents/document.types';

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError('');

      try {
        const response = await getDocuments({
          page,
          limit: 10,
          search: search || undefined,
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
  }, [page, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <main>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Documents</h1>
        <Link to="/dashboard">Back to Dashboard</Link>
      </header>

      <section style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search title or file name"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </section>

      {loading && <p>Loading documents...</p>}

      {error && <p>{error}</p>}

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
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan={5}>No documents found.</td>
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
