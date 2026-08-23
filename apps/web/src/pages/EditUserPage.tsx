import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  getUserById,
  updateUser,
} from '../features/users/user.api';

import type {
  UserRole,
} from '../features/users/user.types';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    const userId = id;

    async function loadUser() {
      try {
        const response = await getUserById(userId);

        setName(response.data.name);
        setEmail(response.data.email);
        setRole(response.data.role);
      } catch {
        setError('Failed to load user');
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [id]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!id) {
      setError('Invalid user ID');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateUser(id, {
        name,
        email,
        role,
      });

      navigate(`/users/${id}`);
    } catch {
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return <main>Invalid user ID</main>;
  }

  if (loading) {
    return <main>Loading user...</main>;
  }

  return (
    <main>
      <h1>Edit User</h1>

      {error && <p>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">
            Name
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="role">
            Role
          </label>

          <select
            id="role"
            value={role}
            onChange={(event) =>
              setRole(
                event.target.value as UserRole,
              )
            }
          >
            <option value="user">
              User
            </option>

            <option value="admin">
              Admin
            </option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        <Link to={`/users/${id}`}>
          Cancel
        </Link>
      </form>
    </main>
  );
}