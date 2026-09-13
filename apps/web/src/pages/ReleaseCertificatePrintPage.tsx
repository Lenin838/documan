/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  auditReleaseCertificateComplianceDrift,
  exportReleaseCertificateJson,
} from '../features/governance/governance.api';
import type { ReleaseCertificateComplianceAuditDTO } from '../features/governance/governance.types';

export default function ReleaseCertificatePrintPage() {
  const { projectId = '', certificateId = '' } = useParams<{
    projectId: string;
    certificateId: string;
  }>();

  const [auditData, setAuditData] = useState<ReleaseCertificateComplianceAuditDTO | null>(null);
  const [exportBundle, setExportBundle] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrintData() {
      if (!certificateId || !projectId) return;
      try {
        setLoading(true);
        setError(null);
        const [drift, bundleRes] = await Promise.all([
          auditReleaseCertificateComplianceDrift(certificateId),
          exportReleaseCertificateJson(projectId, certificateId),
        ]);
        setAuditData(drift);
        setExportBundle(bundleRes.bundle);
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
        setError(errorObj.response?.data?.message || errorObj.message || 'Failed to load certificate printable report data');
      } finally {
        setLoading(false);
      }
    }

    void loadPrintData();
  }, [projectId, certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-400">Loading Certificate Attestation Report...</p>
        </div>
      </div>
    );
  }

  if (error || !auditData || !exportBundle) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full p-6 bg-red-950/40 border border-red-800/50 rounded-xl text-center space-y-4">
          <h2 className="text-lg font-bold text-red-200">Unable to Load Printable Report</h2>
          <p className="text-xs text-red-300">{error || 'Certificate data not found.'}</p>
          <Link
            to={`/projects/${projectId}?tab=governance`}
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
          >
            ← Return to Project Governance
          </Link>
        </div>
      </div>
    );
  }

  const { releaseCertificate, complianceDriftAudit, exportMetadata } = exportBundle;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 print:bg-white print:text-slate-900 print:p-0">
      {/* Top Toolbar (Hidden during Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          to={`/projects/${projectId}?tab=governance`}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          ← Back to Project Governance
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-colors"
        >
          🖨 Print / Save as PDF
        </button>
      </div>

      {/* Printable Certificate Document Card */}
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl print:shadow-none print:border-none print:p-0 print:bg-white print:text-black space-y-8">
        {/* Document Header */}
        <div className="border-b border-slate-800 print:border-slate-300 pb-6 flex items-start justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 print:text-indigo-700">
              Documan • System Release Attestation Certificate
            </div>
            <h1 className="text-2xl font-black text-white print:text-black mt-1">
              {releaseCertificate.rootProjectName}
            </h1>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              Release Tag: <span className="font-mono font-bold text-slate-200 print:text-black">{releaseCertificate.releaseTag}</span> (v{releaseCertificate.certificateVersion})
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 print:bg-emerald-100 print:text-emerald-800 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              {releaseCertificate.systemReleaseStatus}
            </div>
            <div className="text-[10px] text-slate-400 print:text-slate-500 mt-1.5">
              Cert Status: <span className="font-semibold text-slate-300 print:text-black">{releaseCertificate.certificateStatus}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Certified Release Identity (T_cert) */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-slate-700">
            1. Certified Baseline Identity (Frozen Context: T_cert)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 print:text-slate-500 block">Certified Timestamp:</span>
              <span className="font-medium text-slate-200 print:text-black">
                {new Date(releaseCertificate.certifiedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 print:text-slate-500 block">Certified By User ID:</span>
              <span className="font-mono text-slate-300 print:text-black">
                {releaseCertificate.certifiedByUserId}
              </span>
            </div>
            <div>
              <span className="text-slate-500 print:text-slate-500 block">Total Active Baselines:</span>
              <span className="font-semibold text-slate-200 print:text-black">
                {releaseCertificate.snapshot?.activeBaselines?.length || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-500 print:text-slate-500 block">Total Active Waivers:</span>
              <span className="font-semibold text-slate-200 print:text-black">
                {releaseCertificate.snapshot?.activeWaivers?.length || 0}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-950/40 print:bg-slate-100 border border-slate-800/80 print:border-slate-300 rounded-lg text-xs font-mono break-all text-slate-300 print:text-slate-800">
            <span className="text-slate-500 print:text-slate-600 block text-[10px] font-sans uppercase font-bold mb-0.5">
              Phase 27 Certificate Snapshot Hash (SHA-256):
            </span>
            {releaseCertificate.certificateHash}
          </div>
        </div>

        {/* Section 2: Post-Certification Compliance Audit (T_now) */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-slate-700">
            2. Post-Certification Compliance Drift Audit (Live Context: T_now)
          </h2>
          <div className="p-4 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-500 print:text-slate-500">Audit Timestamp (T_now):</span>{' '}
                <span className="font-semibold text-slate-200 print:text-black">
                  {new Date(complianceDriftAudit.auditTimestamp).toLocaleString()}
                </span>
              </div>
              <div className="font-bold text-slate-200 print:text-black">
                Status: <span className="text-indigo-400 print:text-indigo-700">{complianceDriftAudit.complianceStatus}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80 print:border-slate-200">
              <div className="text-center p-2 bg-slate-900/80 print:bg-white rounded border border-slate-800 print:border-slate-200">
                <div className="text-[10px] text-slate-500">Topology Deltas</div>
                <div className="font-bold text-slate-200 print:text-black mt-0.5">
                  {complianceDriftAudit.varianceSummary?.topologyVarianceCount || 0}
                </div>
              </div>
              <div className="text-center p-2 bg-slate-900/80 print:bg-white rounded border border-slate-800 print:border-slate-200">
                <div className="text-[10px] text-slate-500">Baseline Deltas</div>
                <div className="font-bold text-slate-200 print:text-black mt-0.5">
                  {complianceDriftAudit.varianceSummary?.baselineVarianceCount || 0}
                </div>
              </div>
              <div className="text-center p-2 bg-slate-900/80 print:bg-white rounded border border-slate-800 print:border-slate-200">
                <div className="text-[10px] text-slate-500">Contract Deltas</div>
                <div className="font-bold text-slate-200 print:text-black mt-0.5">
                  {complianceDriftAudit.varianceSummary?.contractVarianceCount || 0}
                </div>
              </div>
              <div className="text-center p-2 bg-slate-900/80 print:bg-white rounded border border-slate-800 print:border-slate-200">
                <div className="text-[10px] text-slate-500">Waiver Deltas</div>
                <div className="font-bold text-slate-200 print:text-black mt-0.5">
                  {complianceDriftAudit.varianceSummary?.waiverVarianceCount || 0}
                </div>
              </div>
              <div className="text-center p-2 bg-slate-900/80 print:bg-white rounded border border-slate-800 print:border-slate-200">
                <div className="text-[10px] text-slate-500">Attestation Deltas</div>
                <div className="font-bold text-slate-200 print:text-black mt-0.5">
                  {complianceDriftAudit.varianceSummary?.attestationVarianceCount || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Baseline Contract Evidence Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-slate-700">
            3. Certified Baseline Contracts (T_cert Snapshot)
          </h2>
          <table className="w-full text-left text-xs border-collapse border border-slate-800 print:border-slate-300">
            <thead>
              <tr className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 border-b border-slate-800 print:border-slate-300">
                <th className="p-2 border-r border-slate-800 print:border-slate-300">Project Name</th>
                <th className="p-2 border-r border-slate-800 print:border-slate-300">Version Tag</th>
                <th className="p-2 border-r border-slate-800 print:border-slate-300">Baseline ID</th>
                <th className="p-2">Document Snapshots</th>
              </tr>
            </thead>
            <tbody>
              {(releaseCertificate.snapshot?.activeBaselines || []).map((b: any, i: number) => (
                <tr key={i} className="border-b border-slate-800/60 print:border-slate-200">
                  <td className="p-2 font-medium border-r border-slate-800 print:border-slate-300">{b.projectName}</td>
                  <td className="p-2 font-mono border-r border-slate-800 print:border-slate-300">{b.versionTag}</td>
                  <td className="p-2 font-mono text-[10px] border-r border-slate-800 print:border-slate-300">{b.baselineId}</td>
                  <td className="p-2">{b.documentSnapshotsCount || 0} docs</td>
                </tr>
              ))}
              {(releaseCertificate.snapshot?.activeBaselines || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-slate-500">No active baselines recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 4: Export Integrity Fingerprint & Footer */}
        <div className="pt-6 border-t border-slate-800 print:border-slate-300 space-y-3">
          <div className="p-4 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-slate-200 print:text-black">
              Export Bundle Integrity Fingerprint (SHA-256):
            </div>
            <div className="font-mono text-[11px] text-indigo-400 print:text-indigo-800 break-all">
              {exportMetadata.exportBundleDigest}
            </div>
            <div className="text-[10px] text-slate-400 print:text-slate-600">
              Generated: {new Date(exportMetadata.generatedAt).toUTCString()} by User {exportMetadata.generatedByUserName} ({exportMetadata.generatedByUserId})
            </div>
          </div>
          <div className="text-[10px] text-slate-500 print:text-slate-500 leading-relaxed text-center">
            This printable attestation report represents a read-only presentation of Documan Phase 27 certificate snapshot data and Phase 29 compliance drift analysis. The SHA-256 digest serves as a deterministic checksum over canonical export payload data. Offline integrity verification can be conducted by recomputing SHA-256 over canonicalized bundle JSON without modifying backend authorities.
          </div>
        </div>
      </div>
    </div>
  );
}
