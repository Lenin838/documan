import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { NotificationBell } from '../components/NotificationBell';
import { searchKnowledge } from '../features/knowledge/knowledge.api';
import type { KnowledgeSearchResultItem } from '../features/knowledge/knowledge.types';
import { getProjects } from '../features/projects/project.api';
import type { Project } from '../features/projects/project.types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [results, setResults] = useState<KnowledgeSearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedTraceabilityDocId, setExpandedTraceabilityDocId] = useState<string | null>(null);

  // Load Projects for dropdown filter
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await getProjects();
        if (res && res.data) {
          setProjects(res.data.projects || []);
        }
      } catch (err) {
        console.warn('Failed to load projects dropdown:', err);
      }
    }
    void loadProjects();
  }, []);

  // Debounced search input sync
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch search results
  useEffect(() => {
    async function executeSearch() {
      setLoading(true);
      setError('');

      try {
        const res = await searchKnowledge({
          q: query,
          projectId: selectedProjectId || undefined,
          page,
          limit,
        });

        if (res.success && res.data) {
          setResults(res.data.results || []);
          setTotal(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
        } else {
          setError('Failed to fetch search results.');
        }
      } catch (err: unknown) {
        const errMsg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Error searching technical knowledge';
        setError(errMsg || 'Error searching technical knowledge');
      } finally {
        setLoading(false);
      }
    }

    void executeSearch();
  }, [query, selectedProjectId, page, limit]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  }

  function getStatusBadgeStyle(status: string) {
    switch (status) {
      case 'APPROVED':
        return { backgroundColor: '#d1fae5', color: '#065f46' };
      case 'IN_REVIEW':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'DRAFT':
        return { backgroundColor: '#e0e7ff', color: '#3730a3' };
      case 'STALE':
        return { backgroundColor: '#ffedd5', color: '#9a3412' };
      case 'DEPRECATED':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  }

  function getRiskBadgeStyle(level: string) {
    switch (level) {
      case 'LOW':
        return { backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
      case 'MEDIUM':
        return { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
      case 'HIGH':
        return { backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' };
      case 'CRITICAL':
        return { backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
      default:
        return { backgroundColor: '#f9fafb', color: '#4b5563', border: '1px solid #e5e7eb' };
    }
  }

  return (
    <main style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Authoritative Technical Knowledge Discovery</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280' }}>
            Find trusted technical knowledge, verify authority, and trace system dependencies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/documents">Documents</Link>
          <NotificationBell />
        </div>
      </div>

      {/* Search Bar & Project Filter Form */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search technical knowledge (e.g. /api/v1/auth/token, ADR-001, OAuth)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ flex: 1, minWidth: '300px', padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        />

        <select
          value={selectedProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setPage(1);
          }}
          style={{ padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button type="submit" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '0.375rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {/* Status Indicators */}
      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading knowledge search results...</div>}

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', color: '#6b7280' }}>
          <h3>No matching technical knowledge found</h3>
          <p>Try searching for exact API paths (e.g. <code>/api/v1/auth/token</code>), technical identifiers (e.g. <code>ADR-001</code>), or keywords.</p>
        </div>
      )}

      {/* Results Header */}
      {!loading && !error && results.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#4b5563' }}>
          <span>
            {query ? `Evaluated ${total} candidate documents for "${query}"` : `Browsing ${total} accessible technical documents`}
          </span>
          <span>Page {page} of {totalPages}</span>
        </div>
      )}

      {/* Results List */}
      {!loading && !error && results.map((item) => (
        <article
          key={item.documentId}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            marginBottom: '1rem',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* Top Line: Title & Badges */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>
                <Link to={`/documents/${item.documentId}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                  {item.title}
                </Link>
              </h2>

              <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {item.projectName && <span>📁 Project: {item.projectName}</span>}
                <span>📄 File: {item.fileName} ({formatFileSize(item.fileSize)})</span>
                <span>👤 Owner: {item.owner.name}</span>
                {item.steward && <span>🛡️ Steward: {item.steward.name} {item.steward.isExplicitSteward ? '(Assigned)' : '(Owner Fallback)'}</span>}
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...getStatusBadgeStyle(item.status) }}>
                {item.status}
              </span>

              <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                v{item.version} {item.isApprovedVersion ? '(Approved)' : ''}
              </span>

              <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, ...getRiskBadgeStyle(item.health.riskLevel) }}>
                RISK: {item.health.riskLevel} ({item.health.riskScore})
              </span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p style={{ margin: '0.75rem 0 0.5rem 0', color: '#374151', fontSize: '0.9375rem', lineHeight: 1.5 }}>
              {item.description}
            </p>
          )}

          {/* Relevance Reasons */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', margin: '0.75rem 0 0.5rem 0' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', alignSelf: 'center', marginRight: '0.25rem' }}>Why this result:</span>
            {item.ranking.relevanceReasons.map((reason, idx) => (
              <span key={idx} style={{ padding: '0.125rem 0.5rem', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                {reason}
              </span>
            ))}
          </div>

          {/* Traceability Toggle */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Traceability: {item.traceability.linkedApiEndpoints.length} Linked API(s), {item.traceability.relatedDocuments.length} Related Document(s)
            </div>

            {(item.traceability.linkedApiEndpoints.length > 0 || item.traceability.relatedDocuments.length > 0) && (
              <button
                type="button"
                onClick={() => setExpandedTraceabilityDocId(expandedTraceabilityDocId === item.documentId ? null : item.documentId)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}
              >
                {expandedTraceabilityDocId === item.documentId ? 'Hide Traceability ▲' : 'View Traceability Details ▼'}
              </button>
            )}
          </div>

          {/* Expanded Traceability Details */}
          {expandedTraceabilityDocId === item.documentId && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
              {item.traceability.linkedApiEndpoints.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Linked OpenAPI Endpoints:</strong>
                  <ul style={{ margin: '0.25rem 0 0.5rem 0', paddingLeft: '1.25rem' }}>
                    {item.traceability.linkedApiEndpoints.map((ep) => (
                      <li key={ep.endpointId}>
                        <code style={{ fontWeight: 'bold' }}>{ep.method} {ep.path}</code> {ep.summary ? `— ${ep.summary}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {item.traceability.relatedDocuments.length > 0 && (
                <div>
                  <strong>Related Documents & Dependencies:</strong>
                  <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
                    {item.traceability.relatedDocuments.map((rel) => (
                      <li key={rel.documentId}>
                        <Link to={`/documents/${rel.documentId}`}>{rel.title}</Link> ({rel.type}) — {rel.status}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </article>
      ))}

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: page <= 1 ? '#f3f4f6' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>

          <span style={{ alignSelf: 'center', padding: '0 0.5rem', color: '#4b5563' }}>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: page >= totalPages ? '#f3f4f6' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
