import { useState } from 'react';
import type { FormEvent } from 'react';

interface CreateBaselineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; versionTag: string; description?: string }) => Promise<void>;
  isRebaseline: boolean;
}

export function CreateBaselineModal({
  isOpen,
  onClose,
  onSubmit,
  isRebaseline,
}: CreateBaselineModalProps) {
  const [name, setName] = useState('');
  const [versionTag, setVersionTag] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !versionTag.trim()) {
      setError('Name and Version Tag are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        versionTag: versionTag.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setVersionTag('');
      setDescription('');
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e.message || 'Failed to create baseline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
          {isRebaseline ? 'Publish New Authoritative Baseline' : 'Create Initial Authoritative Baseline'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {isRebaseline
            ? 'Re-baselining archives the active baseline and locks current verified document state.'
            : 'Lock the current active project documents into an immutable baseline snapshot.'}
        </p>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-400 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Baseline Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Authoritative Release Baseline"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Version Tag *
            </label>
            <input
              type="text"
              required
              value={versionTag}
              onChange={(e) => setVersionTag(e.target.value)}
              placeholder="e.g. v1.0.0 or BASELINE-2026-09"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of changes included in this baseline snapshot..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Lock Baseline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
