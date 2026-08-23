import { useEffect, useState } from 'react';

import { getUsers } from '../features/users/user.api';
import type {
  User,
  UserRole,
} from '../features/users/user.types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [isActive, setIsActive] = useState<
    '' | 'true' | 'false'
  >('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError('');

      try {
        const response = await getUsers({
          page,
          limit: 10,
          search: search || undefined,
          role: role || undefined,
          isActive:
            isActive === ''
              ? undefined
              : isActive === 'true',
        });

        setUsers(response.data.users);
        setTotalPages(
          response.data.pagination.totalPages,
        );
      } catch {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, [page, search, role, isActive]);

  function handleSearchChange(
    value: string,
  ) {
    setSearch(value);
    setPage(1);
  }

  function handleRoleChange(
    value: UserRole | '',
  ) {
    setRole(value);
    setPage(1);
  }

  function handleStatusChange(
    value: '' | 'true' | 'false',
  ) {
    setIsActive(value);
    setPage(1);
  }

  return (
    <main>
      <h1>Users</h1>

      <section>
        <input
          type="search"
          placeholder="Search name or email"
          value={search}
          onChange={(event) =>
            handleSearchChange(event.target.value)
          }
        />

        <select
          value={role}
          onChange={(event) =>
            handleRoleChange(
              event.target.value as UserRole | '',
            )
          }
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={isActive}
          onChange={(event) =>
            handleStatusChange(
              event.target.value as
                | ''
                | 'true'
                | 'false',
            )
          }
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </section>

      {loading && <p>Loading users...</p>}

      {error && <p>{error}</p>}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    {user.isActive
                      ? 'Active'
                      : 'Inactive'}
                  </td>
                  <td>
                    {new Date(
                      user.createdAt,
                    ).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div>
            <button
              type="button"
              disabled={page === 1}
              onClick={() =>
                setPage((current) => current - 1)
              }
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}