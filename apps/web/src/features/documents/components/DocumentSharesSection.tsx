import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DocumentShare, SharePermission } from '../../document-shares/document-share.types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import {
  createDocumentShare,
  revokeDocumentShare,
  updateDocumentShare,
} from '../../document-shares/document-share.api';

interface DocumentSharesSectionProps {
  documentId: string;
  isOwner: boolean;
  shares: DocumentShare[];
  onSharesUpdated: (shares: DocumentShare[]) => void;
}

export function DocumentSharesSection({
  documentId,
  isOwner,
  shares,
  onSharesUpdated,
}: DocumentSharesSectionProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<SharePermission>('READ');
  const [creatingShare, setCreatingShare] = useState(false);
  const [sharingError, setSharingError] = useState('');
  const [sharingSuccess, setSharingSuccess] = useState('');

  if (!isOwner) {
    return null;
  }

  const handleCreateShareSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = shareEmail.trim();
    if (!trimmedEmail) {
      setSharingError('Email is required');
      return;
    }

    setCreatingShare(true);
    setSharingError('');
    setSharingSuccess('');

    try {
      const response = await createDocumentShare(documentId, {
        email: trimmedEmail,
        permission: sharePermission,
      });

      const updated = [response.data, ...shares.filter((s) => s.id !== response.data.id)];
      onSharesUpdated(updated);
      setShareEmail('');
      setSharingSuccess(`Shared with ${response.data.sharedWithUser.email} (${response.data.permission})`);
    } catch (err: unknown) {
      let msg = 'Failed to share document';
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'error' in err.response.data &&
        typeof err.response.data.error === 'string'
      ) {
        msg = err.response.data.error;
      }
      setSharingError(msg);
    } finally {
      setCreatingShare(false);
    }
  };

  const handleUpdateShare = async (shareId: string, permission: SharePermission) => {
    setSharingError('');
    setSharingSuccess('');

    try {
      const response = await updateDocumentShare(documentId, shareId, { permission });
      const updated = shares.map((s) => (s.id === shareId ? response.data : s));
      onSharesUpdated(updated);
      setSharingSuccess(`Updated permission to ${permission}`);
    } catch {
      setSharingError('Failed to update share permission');
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    setSharingError('');
    setSharingSuccess('');

    try {
      await revokeDocumentShare(documentId, shareId);
      const updated = shares.filter((s) => s.id !== shareId);
      onSharesUpdated(updated);
      setSharingSuccess('Revoked share access');
    } catch {
      setSharingError('Failed to revoke share access');
    }
  };

  return (
    <Card className="mb-6 border-slate-800 bg-slate-900/80 shadow-md">
      <h2 className="text-xl font-bold text-slate-100 mb-4">Share Document Access</h2>

      <form onSubmit={handleCreateShareSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="email"
          placeholder="User email address"
          value={shareEmail}
          onChange={(e) => setShareEmail(e.target.value)}
          required
          className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        <select
          value={sharePermission}
          onChange={(e) => setSharePermission(e.target.value as SharePermission)}
          className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="READ">Read Access</option>
          <option value="EDIT">Edit Access</option>
        </select>

        <Button type="submit" variant="primary" isLoading={creatingShare}>
          Share Access
        </Button>
      </form>

      {sharingError && <p className="text-xs text-red-400 mb-4">{sharingError}</p>}
      {sharingSuccess && <p className="text-xs text-emerald-400 mb-4">{sharingSuccess}</p>}

      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        Active Access Grants ({shares.length})
      </h3>

      {shares.length === 0 ? (
        <p className="text-sm text-slate-400 italic">This document has not been shared with any users.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th className="text-slate-300 font-semibold text-xs">User</th>
              <th className="text-slate-300 font-semibold text-xs">Email</th>
              <th className="text-slate-300 font-semibold text-xs">Permission</th>
              <th className="text-slate-300 font-semibold text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shares.map((share) => (
              <tr key={share.id} className="border-b border-slate-800/60">
                <td className="text-sm font-medium text-slate-200">{share.sharedWithUser.name}</td>
                <td className="text-sm text-slate-400">{share.sharedWithUser.email}</td>
                <td>
                  <select
                    value={share.permission}
                    onChange={(e) => void handleUpdateShare(share.id, e.target.value as SharePermission)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="READ">Read</option>
                    <option value="EDIT">Edit</option>
                  </select>
                </td>
                <td className="text-right">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleRevokeShare(share.id)}
                  >
                    Revoke
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
