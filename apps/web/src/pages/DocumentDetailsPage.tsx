import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getDocumentById } from '../features/documents/document.api';
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

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setDocument(response.data);
      } catch {
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    void loadDocument();
  }, [id]);

  if (!id) {
    return <main>Invalid document ID</main>;
  }

  if (loading) {
    return <main>Loading document...</main>;
  }

  if (error) {
    return <main>{error}</main>;
  }

  if (!document) {
    return <main>Document not found</main>;
  }

  return (
    <main style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Document Details</h1>
        <Link to="/documents">Back to Documents</Link>
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Document Information</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem 1rem' }}>
          <dt style={{ fontWeight: 'bold' }}>Title</dt>
          <dd style={{ margin: 0 }}>{document.title}</dd>

          <dt style={{ fontWeight: 'bold' }}>Description</dt>
          <dd style={{ margin: 0 }}>{document.description || 'No description provided'}</dd>
        </dl>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>File Information</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem 1rem' }}>
          <dt style={{ fontWeight: 'bold' }}>File Name</dt>
          <dd style={{ margin: 0 }}>{document.fileName}</dd>

          <dt style={{ fontWeight: 'bold' }}>File Type</dt>
          <dd style={{ margin: 0 }}>{document.fileType}</dd>

          <dt style={{ fontWeight: 'bold' }}>File Size</dt>
          <dd style={{ margin: 0 }}>{formatFileSize(document.fileSize)}</dd>

          <dt style={{ fontWeight: 'bold' }}>Created</dt>
          <dd style={{ margin: 0 }}>{new Date(document.createdAt).toLocaleString()}</dd>

          <dt style={{ fontWeight: 'bold' }}>Updated</dt>
          <dd style={{ margin: 0 }}>{new Date(document.updatedAt).toLocaleString()}</dd>
        </dl>
      </section>

      <section style={{ opacity: 0.7 }}>
        <h2>Future Actions</h2>
        <p>Reserved for future document actions.</p>
      </section>
    </main>
  );
}
