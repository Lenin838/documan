import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getUserById, updateUser } from '../features/users/user.api';
import type { UserRole } from '../features/users/user.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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
    if (!id) return;

    async function loadUser() {
      try {
        const response = await getUserById(id!);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) {
      setError('Invalid user ID');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateUser(id, { name, email, role });
      navigate(`/users/${id}`);
    } catch {
      setError('Failed to update user');
    } finally {
      setSaving(false);
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

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Edit User Privileges</h1>
          <p className="text-sm text-slate-400 mt-1">Update name, email address, or system administrative role.</p>
        </div>
        <Link to={`/users/${id}`}>
          <Button variant="secondary">Cancel</Button>
        </Link>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 shadow-md">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              System Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="user">User (Standard Access)</option>
              <option value="admin">Admin (System Governance)</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
            <Button type="submit" variant="primary" isLoading={saving}>
              Save User
            </Button>
            <Link to={`/users/${id}`}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}