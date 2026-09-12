import { useEffect, useState } from "react";

import {
  getDeletedDocuments,
  restoreDocument,
} from "../features/documents/document.api";
import type { Document } from "../features/documents/document.types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Breadcrumb } from "../components/ui/Breadcrumb";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function TrashPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    async function loadTrash() {
      setLoading(true);
      setError("");

      try {
        const response = await getDeletedDocuments({
          page,
          limit: 10,
          search: search || undefined,
        });

        setDocuments(response.data.documents);
        setTotalPages(response.data.pagination.totalPages || 1);
      } catch {
        setError("Unable to load deleted documents.");
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
    setActionError("");

    try {
      await restoreDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch {
      setActionError("Unable to restore this document.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Documents", href: "/documents" },
          { label: "Trash" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Trash & Soft-Deleted Documents
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Recover deleted documents or review historical soft deletions.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search deleted documents..."
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm font-medium">
          {actionError}
        </div>
      )}

      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner label="Loading trash..." />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && !error && documents.length === 0 && (
        <EmptyState
          title="Trash is Empty"
          description={
            search
              ? "No deleted documents found matching your search query."
              : "No deleted documents currently in trash."
          }
        />
      )}

      {!loading && !error && documents.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>File Type</TableHead>
              <TableHead>File Size</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  {doc.title}
                </TableCell>
                <TableCell>{doc.fileName}</TableCell>
                <TableCell>{doc.fileType}</TableCell>
                <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                <TableCell>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRestore(doc.id)}
                    isLoading={restoringId === doc.id}
                  >
                    Restore
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || Boolean(restoringId)}
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
            disabled={page >= totalPages || Boolean(restoringId)}
            onClick={() => setPage(page + 1)}
          >
            Next &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}
