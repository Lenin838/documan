import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { getDocuments } from "../features/documents/document.api";
import type { Document } from "../features/documents/document.types";
import {
  createFolder,
  deleteFolder,
  getFolders,
  updateFolder,
} from "../features/folders/folder.api";
import type { Folder } from "../features/folders/folder.types";
import { getProjects } from "../features/projects/project.api";
import type { Project } from "../features/projects/project.types";

import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
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

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [documentView, setDocumentView] = useState<"mine" | "shared">("mine");
  const [selectedTag, setSelectedTag] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");

  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  const [folderActionError, setFolderActionError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        // Ignore fetch errors silently
      }
    }

    void loadFoldersAndProjects();
  }, []);

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError("");

      try {
        const response = await getDocuments({
          page,
          limit: 10,
          search: search || undefined,
          folderId: selectedFolderId || undefined,
          projectId: selectedProjectId || undefined,
          view: documentView,
          tag: selectedTag || undefined,
          fileType: fileTypeFilter || undefined,
        });

        setDocuments(response.data.documents);
        setTotalPages(response.data.pagination.totalPages || 1);
      } catch {
        setError("Failed to load documents");
      } finally {
        setLoading(false);
      }
    }

    void loadDocuments();
  }, [
    page,
    search,
    selectedFolderId,
    selectedProjectId,
    documentView,
    selectedTag,
    fileTypeFilter,
  ]);

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

  function handleViewChange(view: "mine" | "shared") {
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
      setFolderActionError("Folder name is required");
      return;
    }

    setCreatingFolder(true);
    setFolderActionError("");

    try {
      const created = await createFolder({ name: trimmed });
      setFolders((prev) => [...prev, created.data]);
      setSelectedFolderId(created.data.id);
      setNewFolderName("");
      setShowCreateFolder(false);
    } catch {
      setFolderActionError("Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleUpdateFolderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFolderId) return;

    const trimmed = editingFolderName.trim();
    if (!trimmed) {
      setFolderActionError("Folder name is required");
      return;
    }

    setSavingFolder(true);
    setFolderActionError("");

    try {
      const updated = await updateFolder(editingFolderId, { name: trimmed });
      setFolders((prev) =>
        prev.map((f) => (f.id === editingFolderId ? updated.data : f))
      );
      setEditingFolderId(null);
    } catch {
      setFolderActionError("Failed to rename folder");
    } finally {
      setSavingFolder(false);
    }
  }

  async function handleDeleteFolder(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this folder? Unfiled documents will not be deleted."
      )
    ) {
      return;
    }

    setFolderActionError("");
    try {
      await deleteFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (selectedFolderId === id) {
        setSelectedFolderId("");
      }
    } catch {
      setFolderActionError("Failed to delete folder");
    }
  }

  const activeFolder = folders.find((f) => f.id === selectedFolderId);

  function getStatusVariant(status?: string) {
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

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Documents" }]} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Documents Repository
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Create, view, manage, and trace technical documents.
          </p>
        </div>
        <Link to="/documents/create">
          <Button variant="primary" size="md">
            + Create Document
          </Button>
        </Link>
      </div>

      {/* View Toggle Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Button
          variant={documentView === "mine" ? "primary" : "ghost"}
          size="sm"
          onClick={() => handleViewChange("mine")}
        >
          My Documents
        </Button>
        <Button
          variant={documentView === "shared" ? "primary" : "ghost"}
          size="sm"
          onClick={() => handleViewChange("shared")}
        >
          Shared With Me
        </Button>
      </div>

      {/* Folders Section (Only in My Documents View) */}
      {documentView === "mine" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Folders
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreateFolder(!showCreateFolder);
                setFolderActionError("");
              }}
            >
              {showCreateFolder ? "Cancel" : "+ New Folder"}
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {showCreateFolder && (
              <form
                onSubmit={(e) => void handleCreateFolderSubmit(e)}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  maxLength={100}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={creatingFolder}
                >
                  Save Folder
                </Button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedFolderId === "" ? "primary" : "outline"}
                size="sm"
                onClick={() => handleFolderSelect("")}
              >
                All Documents
              </Button>

              <Button
                variant={selectedFolderId === "none" ? "primary" : "outline"}
                size="sm"
                onClick={() => handleFolderSelect("none")}
              >
                Unfiled
              </Button>

              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant={selectedFolderId === folder.id ? "primary" : "outline"}
                  size="sm"
                  onClick={() => handleFolderSelect(folder.id)}
                >
                  📁 {folder.name}
                </Button>
              ))}
            </div>

            {activeFolder && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Selected Folder: <strong className="text-gray-900 dark:text-white">{activeFolder.name}</strong>
                </span>

                {editingFolderId === activeFolder.id ? (
                  <form
                    onSubmit={(e) => void handleUpdateFolderSubmit(e)}
                    className="inline-flex gap-2"
                  >
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      required
                      maxLength={100}
                      className="px-2 py-0.5 border border-gray-300 rounded text-xs"
                    />
                    <Button type="submit" variant="primary" size="sm" isLoading={savingFolder}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingFolderId(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingFolderId(activeFolder.id);
                        setEditingFolderName(activeFolder.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void handleDeleteFolder(activeFolder.id)}
                    >
                      Delete Folder
                    </Button>
                  </>
                )}
              </div>
            )}

            {folderActionError && (
              <p className="text-xs text-red-600 font-medium">{folderActionError}</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search title or file name..."
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />

        <input
          type="text"
          placeholder="Filter by tag..."
          value={selectedTag}
          onChange={(event) => handleTagChange(event.target.value)}
          className="w-full sm:w-44 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />

        <select
          value={fileTypeFilter}
          onChange={(event) => handleFileTypeChange(event.target.value)}
          className="w-full sm:w-44 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All File Types</option>
          <option value="pdf">PDF Documents</option>
          <option value="image">Images</option>
          <option value="text">Text / Markdown</option>
          <option value="json">JSON / Code</option>
        </select>

        <select
          value={selectedProjectId}
          onChange={(event) => {
            setSelectedProjectId(event.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading & Error */}
      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner label="Loading documents..." />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && documents.length === 0 && (
        <EmptyState
          title="No documents found"
          description="Try adjusting your search query, folder filter, or tag selection."
          action={
            <Link to="/documents/create">
              <Button variant="primary">+ Create Document</Button>
            </Link>
          }
        />
      )}

      {/* Responsive Data Table */}
      {!loading && !error && documents.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>File Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {doc.title}
                  </Link>
                </TableCell>
                <TableCell>{doc.fileName}</TableCell>
                <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(doc.status)}>
                    {doc.status || "DRAFT"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {doc.tags?.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] rounded"
                      >
                        {t}
                      </span>
                    )) || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <Link to={`/documents/${doc.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details &rarr;
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination Controls */}
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
