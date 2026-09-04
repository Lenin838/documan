import React, { useState } from 'react';
import { createWorkRequestApi } from './work-request.api';

interface Props {
  isOpen: boolean;
  projectId: string;
  documentId: string;
  documentTitle?: string;
  initialTitle?: string;
  initialReason?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateWorkRequestModal: React.FC<Props> = ({
  isOpen,
  projectId,
  documentId,
  documentTitle,
  initialTitle = '',
  initialReason = '',
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [reason, setReason] = useState(initialReason);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reason.trim()) {
      setError('Title and reason are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createWorkRequestApi(projectId, documentId, {
        title: title.trim(),
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errObj.response?.data?.error || errObj.message || 'Failed to create work request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Create Documentation Work Request
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            &times;
          </button>
        </div>

        {documentTitle && (
          <p className="text-sm text-gray-600">
            Target Document: <span className="font-medium text-gray-900">{documentTitle}</span>
          </p>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="e.g., Update API specs in tech doc"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason / Context <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Describe the documentation change needed and why..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Work Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
