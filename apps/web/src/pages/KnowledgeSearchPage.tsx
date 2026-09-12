import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { searchKnowledge } from "../features/knowledge/knowledge.api";
import type { KnowledgeSearchResultItem } from "../features/knowledge/knowledge.types";
import { getProjects } from "../features/projects/project.api";
import type { Project } from "../features/projects/project.types";

import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [results, setResults] = useState<KnowledgeSearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        console.warn("Failed to load projects dropdown:", err);
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
      setError("");

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
          setError("Failed to fetch search results.");
        }
      } catch (err: unknown) {
        const errMsg =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message
            : "Error searching technical knowledge";
        setError(errMsg || "Error searching technical knowledge");
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

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case "APPROVED":
        return "success";
      case "IN_REVIEW":
        return "warning";
      case "DRAFT":
        return "info";
      case "STALE":
        return "warning";
      case "DEPRECATED":
        return "error";
      default:
        return "neutral";
    }
  }

  function getRiskBadgeVariant(level: string) {
    switch (level) {
      case "LOW":
        return "success";
      case "MEDIUM":
        return "warning";
      case "HIGH":
      case "CRITICAL":
        return "error";
      default:
        return "neutral";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          Authoritative Technical Knowledge Discovery
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Find trusted technical knowledge, verify authority, and trace system dependencies.
        </p>
      </div>

      {/* Search Bar & Project Filter Form */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search technical knowledge (e.g. /api/v1/auth/token, ADR-001, OAuth)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />

        <select
          value={selectedProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner label="Loading knowledge search results..." />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <EmptyState
          title="No matching technical knowledge found"
          description="Try searching for exact API paths (e.g. /api/v1/auth/token), technical identifiers (e.g. ADR-001), or keywords."
        />
      )}

      {/* Results Summary */}
      {!loading && !error && results.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 pb-2">
          <span>
            {query
              ? `Evaluated ${total} candidate documents for "${query}"`
              : `Browsing ${total} accessible technical documents`}
          </span>
          <span>
            Page {page} of {totalPages}
          </span>
        </div>
      )}

      {/* Results Roster */}
      {!loading &&
        !error &&
        results.map((item) => (
          <Card key={item.documentId} className="hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
            <CardBody className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    <Link
                      to={`/documents/${item.documentId}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {item.title}
                    </Link>
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.projectName && <span>📁 Project: {item.projectName}</span>}
                    <span>📄 File: {item.fileName} ({formatFileSize(item.fileSize)})</span>
                    <span>👤 Owner: {item.owner.name}</span>
                    {item.steward && (
                      <span>
                        🛡️ Steward: {item.steward.name}{" "}
                        {item.steward.isExplicitSteward ? "(Assigned)" : "(Owner Fallback)"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(item.status)}>
                    {item.status}
                  </Badge>
                  <Badge variant="neutral">
                    v{item.version} {item.isApprovedVersion ? "(Approved)" : ""}
                  </Badge>
                  <Badge variant={getRiskBadgeVariant(item.health.riskLevel)}>
                    RISK: {item.health.riskLevel} ({item.health.riskScore})
                  </Badge>
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {item.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-gray-400 dark:text-gray-500 font-medium mr-1">
                  Why this result:
                </span>
                {item.ranking.relevanceReasons.map((reason, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded font-medium"
                  >
                    {reason}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Traceability: {item.traceability.linkedApiEndpoints.length} Linked API(s),{" "}
                  {item.traceability.relatedDocuments.length} Related Document(s)
                </span>

                {(item.traceability.linkedApiEndpoints.length > 0 ||
                  item.traceability.relatedDocuments.length > 0) && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTraceabilityDocId(
                        expandedTraceabilityDocId === item.documentId
                          ? null
                          : item.documentId
                      )
                    }
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    {expandedTraceabilityDocId === item.documentId
                      ? "Hide Traceability ▲"
                      : "View Traceability Details ▼"}
                  </button>
                )}
              </div>

              {expandedTraceabilityDocId === item.documentId && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-md text-xs space-y-3">
                  {item.traceability.linkedApiEndpoints.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Linked OpenAPI Endpoints:
                      </span>
                      <ul className="mt-1 list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        {item.traceability.linkedApiEndpoints.map((ep) => (
                          <li key={ep.endpointId}>
                            <code className="font-bold">{ep.method} {ep.path}</code>{" "}
                            {ep.summary ? `— ${ep.summary}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.traceability.relatedDocuments.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Related Documents & Dependencies:
                      </span>
                      <ul className="mt-1 list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        {item.traceability.relatedDocuments.map((rel) => (
                          <li key={rel.documentId}>
                            <Link
                              to={`/documents/${rel.documentId}`}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                              {rel.title}
                            </Link>{" "}
                            ({rel.type}) — {rel.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        ))}

      {/* Pagination Controls (Addresses PARTIAL-1) */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            &larr; Previous
          </Button>

          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}
