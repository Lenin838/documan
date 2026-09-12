import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getUsers } from "../features/users/user.api";
import type { User, UserRole } from "../features/users/user.types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Breadcrumb } from "../components/ui/Breadcrumb";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError("");

      try {
        const response = await getUsers({
          page,
          limit: 10,
          search: search || undefined,
          role: role || undefined,
          isActive: isActive === "" ? undefined : isActive === "true",
        });

        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
      } catch {
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, [page, search, role, isActive]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleRoleChange(value: UserRole | "") {
    setRole(value);
    setPage(1);
  }

  function handleStatusChange(value: "" | "true" | "false") {
    setIsActive(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Users" }]} />

      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          User Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Admin console for searching, auditing, editing, and managing user roles & accounts.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search name or email..."
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />

        <select
          value={role}
          onChange={(event) => handleRoleChange(event.target.value as UserRole | "")}
          className="w-full sm:w-44 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={isActive}
          onChange={(event) => handleStatusChange(event.target.value as "" | "true" | "false")}
          className="w-full sm:w-44 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner label="Loading users..." />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState
          title="No Users Found"
          description="Try adjusting your search query, role filter, or account status selection."
        />
      )}

      {!loading && !error && users.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  <Link
                    to={`/users/${u.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {u.name}
                  </Link>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "info" : "neutral"}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "success" : "error"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link to={`/users/${u.id}`}>
                      <Button variant="ghost" size="sm">
                        View &rarr;
                      </Button>
                    </Link>
                    <Link to={`/users/${u.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
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