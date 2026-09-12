import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getUserById,
  updateUserStatus,
  deleteUser,
} from '../features/users/user.api';
import type { User } from '../features/users/user.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    async function loadUser() {
      setLoading(true);
      setError('');

      try {
        const response = await getUserById(id!);
        setUser(response.data);
      } catch {
        setError('Failed to load user details.');
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [id]);

  async function handleStatusChange() {
    if (!id || !user) return;

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
    if (!id || !user) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${user.name}?`);
    if (!confirmed) return;

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
    return (
      <main className="p-8 text-center text-slate-400">
        <p className="mb-4">Invalid user ID</p>
        <Link to="/users">
          <Button variant="secondary">Back to Users</Button>
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-12 flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-400 mt-4">Loading user profile...</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="p-8 text-center">
        <p className="text-red-400 mb-4">{error || 'User not found'}</p>
        <Link to="/users">
          <Button variant="secondary">Back to Users</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">User Account Profile</h1>
          <p className="text-sm text-slate-400 mt-1">Manage user status, role privileges, and account lifecycle.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/users">
            <Button variant="secondary">Back to Users</Button>
          </Link>
          <Button variant="primary" onClick={() => navigate(`/users/${user.id}/edit`)}>
            Edit User
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()} isLoading={deleting}>
            Delete User
          </Button>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 shadow-md">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-lg gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-lg">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-100">{user.name}</h2>
                  <Badge variant={user.role === 'admin' ? 'warning' : 'neutral'}>
                    {user.role}
                  </Badge>
                  <Badge variant={user.isActive ? 'success' : 'danger'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 font-mono mt-0.5">{user.email}</p>
              </div>
            </div>

            <Button
              variant={user.isActive ? 'secondary' : 'success'}
              size="sm"
              onClick={() => void handleStatusChange()}
              isLoading={statusUpdating}
            >
              {user.isActive ? 'Deactivate Account' : 'Activate Account'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-950/40 border border-slate-800/80 rounded-lg text-sm">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Account ID
              </span>
              <span className="font-mono text-slate-200">{user.id}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                System Role
              </span>
              <span className="text-slate-200 capitalize">{user.role}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Created At
              </span>
              <span className="text-slate-200">{new Date(user.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Last Updated
              </span>
              <span className="text-slate-200">{new Date(user.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}