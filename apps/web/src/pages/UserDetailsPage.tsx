import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { 
  getUserById,
  updateUserStatus,
  deleteUser
} from '../features/users/user.api';
import type { User } from '../features/users/user.types';

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] =useState(false);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      return;
    }

    const userId = id;

    async function loadUser() {
      setLoading(true);
      setError('');

      try {
        const response = await getUserById(userId);
        setUser(response.data);
      } catch {
        setError('Failed to load user');
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [id]);

   async function handleStatusChange() {
  if (!id || !user) {
    return;
  }

  setStatusUpdating(true);
  setError('');

  try {
    const response = await updateUserStatus(id, {
      isActive: !user.isActive,
    });

    setUser(response.data);
  } catch {
    setError('Failed to update user status');
  } finally {
    setStatusUpdating(false);
  }
}

  async function handleDelete() {
  if (!id || !user) {
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete ${user.name}?`,
  );

  if (!confirmed) {
    return;
  }

  setDeleting(true);
  setError('');

  try {
    await deleteUser(id);

    navigate('/users');
  } catch {
    setError('Failed to delete user');
  } finally {
    setDeleting(false);
  }
}

  if (!id) {
    return <main>Invalid user ID</main>;
  }

  if (loading) {
    return <main>Loading user...</main>;
  }

  if (error) {
    return <main>{error}</main>;
  }

  if (!user) {
    return <main>User not found</main>;
  }



  return (
    <main>
      <h1>User Details</h1>

      <dl>
        <dt>Name</dt>
        <dd>{user.name}</dd>

        <dt>Email</dt>
        <dd>{user.email}</dd>

        <dt>Role</dt>
        <dd>{user.role}</dd>

        <dt>Status</dt>
        <dd>
          {user.isActive ? 'Active' : 'Inactive'}
        </dd>

        <button
            type="button"
            onClick={handleStatusChange}
            disabled={statusUpdating}
            >
            {statusUpdating
                ? 'Updating...'
                : user.isActive
                ? 'Deactivate'
                : 'Activate'}
        </button>

        <dt>Created</dt>
        <dd>
          {new Date(
            user.createdAt,
          ).toLocaleString()}
        </dd>

        <dt>Updated</dt>
        <dd>
          {new Date(
            user.updatedAt,
          ).toLocaleString()}
        </dd>
      </dl>

      <Link to="/users">
        Back to users
      </Link>

      <button
        type="button"
        onClick={() =>
            navigate(`/users/${user.id}/edit`)
        }
        >
        Edit
        </button>

        <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            >
            {deleting ? 'Deleting...' : 'Delete'}
        </button>
    </main>
  );
}