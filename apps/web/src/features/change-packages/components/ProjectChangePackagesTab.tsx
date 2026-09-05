/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import type { DocumentChangePackage } from '../change-package.types';
import { listProjectChangePackages } from '../change-package.api';
import { CreatePackageModal } from './CreatePackageModal';
import { ChangePackageDetailsDrawer } from './ChangePackageDetailsDrawer';

interface ProjectChangePackagesTabProps {
  projectId: string;
}

export const ProjectChangePackagesTab: React.FC<ProjectChangePackagesTabProps> = ({ projectId }) => {
  const [packages, setPackages] = useState<DocumentChangePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await listProjectChangePackages(projectId);
      setPackages(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch change packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Loading change packages...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-white">Multi-Document Change Packages</h3>
          <p className="text-xs text-slate-400">Bundle, simulate, and review coordinated multi-document change proposals.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Change Package
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <svg className="w-10 h-10 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-300">No Change Packages Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a multi-document change package to group proposals and run aggregate simulations.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4">Package #</th>
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Proposals</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-200">
              {packages.map((pkg) => (
                <tr key={pkg._id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                    {pkg.packageNumber}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    {pkg.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono border border-slate-700">
                      {pkg.proposals?.length || 0} Proposals
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      pkg.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      pkg.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      pkg.status === 'UNDER_REVIEW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    }`}>
                      {pkg.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {new Date(pkg.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedPackageId(pkg._id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-[11px] font-medium border border-slate-700 transition"
                    >
                      View &amp; Simulate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreatePackageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        onPackageCreated={fetchPackages}
      />

      {selectedPackageId && (
        <ChangePackageDetailsDrawer
          isOpen={Boolean(selectedPackageId)}
          onClose={() => setSelectedPackageId(null)}
          packageId={selectedPackageId}
          onPackageUpdated={fetchPackages}
        />
      )}
    </div>
  );
};
