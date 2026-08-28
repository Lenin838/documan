import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getDocumentById,
  downloadDocument,
  viewDocument,
} from '../features/documents/document.api';
import type { Document } from '../features/documents/document.types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewing, setViewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState('');

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
      } catch {
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    void loadDocument();
  }, [id]);

  async function handleView() {
    if (!id || viewing || downloading) {
      return;
    }

    setViewing(true);
    setActionError('');

    try {
      const response = await viewDocument(id);
      const contentType =
        (response.headers['content-type'] as string | undefined) ||
        'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);

      const opened = window.open(url, '_blank');
      if (!opened) {
        window.location.href = url;
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch {
      setActionError('Unable to open this document.');
    } finally {
      setViewing(false);
    }
  }

  async function handleDownload() {
    if (!id || viewing || downloading) {
      return;
    }

    setDownloading(true);
    setActionError('');

    try {
      const response = await downloadDocument(id);
      const contentDisposition = response.headers[
        'content-disposition'
      ] as string | undefined;

      let fileName = doc?.fileName || 'document';

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      const contentType =
        (response.headers['content-type'] as string | undefined) ||
        'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);

      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Unable to download this document.');
    } finally {
      setDownloading(false);
    }
  }

  if (!id) {
    return <main>Invalid document ID</main>;
  }

  if (loading) {
    return <main>Loading document...</main>;
  }

  if (error) {
    return <main>{error}</main>;
  }

  if (!doc) {
    return <main>Document not found</main>;
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
        <h1>Document Details</h1>
        <Link to="/documents">Back to Documents</Link>
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Document Information</h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr',
            gap: '0.5rem 1rem',
          }}
        >
          <dt style={{ fontWeight: 'bold' }}>Title</dt>
          <dd style={{ margin: 0 }}>{doc.title}</dd>

          <dt style={{ fontWeight: 'bold' }}>Description</dt>
          <dd style={{ margin: 0 }}>
            {doc.description || 'No description provided'}
          </dd>
        </dl>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>File Information</h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr',
            gap: '0.5rem 1rem',
          }}
        >
          <dt style={{ fontWeight: 'bold' }}>File Name</dt>
          <dd style={{ margin: 0 }}>{doc.fileName}</dd>

          <dt style={{ fontWeight: 'bold' }}>File Type</dt>
          <dd style={{ margin: 0 }}>{doc.fileType}</dd>

          <dt style={{ fontWeight: 'bold' }}>File Size</dt>
          <dd style={{ margin: 0 }}>{formatFileSize(doc.fileSize)}</dd>

          <dt style={{ fontWeight: 'bold' }}>Created</dt>
          <dd style={{ margin: 0 }}>
            {new Date(doc.createdAt).toLocaleString()}
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Updated</dt>
          <dd style={{ margin: 0 }}>
            {new Date(doc.updatedAt).toLocaleString()}
          </dd>
        </dl>
      </section>

      <section>
        <h2>Actions</h2>
        {actionError && (
          <p style={{ color: 'red', marginBottom: '0.5rem' }}>{actionError}</p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => void handleView()}
            disabled={viewing || downloading}
          >
            {viewing ? 'Opening...' : 'View Document'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={viewing || downloading}
          >
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </section>
    </main>
  );
}
