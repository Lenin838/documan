import React, { useCallback, useEffect, useState } from 'react';
import {
  getProjectVerificationPlans,
  getVerificationPlanById,
  generateVerificationPlan,
  updateVerificationTaskStatus,
  bypassVerificationPlan,
  type VerificationPlanDetails,
  type VerificationTaskItem,
} from '../features/governance/verification-plan.api';
import { VerificationPlanCard } from '../features/governance/VerificationPlanCard';
import { VerificationTaskChecklist } from '../features/governance/VerificationTaskChecklist';

interface VerificationPlanSectionProps {
  documentId: string;
  projectId?: string;
  isOwnerOrAdmin?: boolean;
}

export const VerificationPlanSection: React.FC<VerificationPlanSectionProps> = ({
  documentId,
  projectId,
  isOwnerOrAdmin = false,
}) => {
  const [plans, setPlans] = useState<VerificationPlanDetails[]>([]);
  const [activePlan, setActivePlan] = useState<VerificationPlanDetails | null>(null);
  const [tasks, setTasks] = useState<VerificationTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bypassReasonInput, setBypassReasonInput] = useState('');
  const [bypassingPlanId, setBypassingPlanId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectVerificationPlans(projectId);
      setPlans(data);
      if (data.length > 0) {
        const fullDetails = await getVerificationPlanById(data[0]._id);
        setActivePlan(fullDetails.plan);
        setTasks(fullDetails.tasks);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load verification plans');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;
    if (projectId) {
      getProjectVerificationPlans(projectId)
        .then(async (data) => {
          if (!isMounted) return;
          setPlans(data);
          if (data.length > 0) {
            const fullDetails = await getVerificationPlanById(data[0]._id);
            if (isMounted) {
              setActivePlan(fullDetails.plan);
              setTasks(fullDetails.tasks);
            }
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load verification plans');
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [documentId, projectId]);

  const handleSelectPlan = async (planId: string) => {
    try {
      setLoading(true);
      const fullDetails = await getVerificationPlanById(planId);
      setActivePlan(fullDetails.plan);
      setTasks(fullDetails.tasks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      setError(null);
      const plan = await generateVerificationPlan(documentId);
      const fullDetails = await getVerificationPlanById(plan._id);
      setActivePlan(fullDetails.plan);
      setTasks(fullDetails.tasks);
      await fetchPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate verification plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, status: 'IN_REVIEW' | 'VERIFIED' | 'SKIPPED', skipReason?: string) => {
    await updateVerificationTaskStatus(taskId, { status, skipReason });
    if (activePlan) {
      const fullDetails = await getVerificationPlanById(activePlan._id);
      setActivePlan(fullDetails.plan);
      setTasks(fullDetails.tasks);
    }
    await fetchPlans();
  };

  const handleBypassSubmit = async (planId: string) => {
    if (bypassReasonInput.trim().length < 10) {
      setError('Bypass reason must be at least 10 characters');
      return;
    }
    try {
      setError(null);
      await bypassVerificationPlan(planId, { bypassReason: bypassReasonInput.trim() });
      setBypassingPlanId(null);
      setBypassReasonInput('');
      const fullDetails = await getVerificationPlanById(planId);
      setActivePlan(fullDetails.plan);
      setTasks(fullDetails.tasks);
      await fetchPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to bypass plan');
    }
  };

  return (
    <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
          Documentation Change Intelligence &amp; Verification Plans
        </h2>
        <button
          type="button"
          disabled={generating}
          onClick={handleGeneratePlan}
          style={{
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {generating ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && plans.length === 0 ? (
        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading verification plans...</div>
      ) : plans.length === 0 ? (
        <div style={{ padding: '1.5rem', background: '#f8fafc', border: '1px border #e2e8f0', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
          No active verification plans for this project. Major/minor version updates to authoritative documents generate plans automatically.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {plans.map((p) => (
              <VerificationPlanCard
                key={p._id}
                plan={p}
                onSelectPlan={handleSelectPlan}
                onBypassPlan={(id) => setBypassingPlanId(id)}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />
            ))}
          </div>

          <div>
            {activePlan ? (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                    Verification Checklist for v{activePlan.triggerVersion}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {activePlan.completedTasks} of {activePlan.totalTasks} tasks verified
                  </span>
                </div>

                <VerificationTaskChecklist
                  tasks={tasks}
                  onUpdateStatus={handleTaskStatusUpdate}
                  isOwnerOrAdmin={isOwnerOrAdmin}
                />
              </div>
            ) : (
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Select a plan to view its verification tasks.</div>
            )}
          </div>
        </div>
      )}

      {bypassingPlanId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '1.5rem', borderRadius: '8px', maxWidth: '480px', width: '100%', color: '#f8fafc' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Bypass Verification Plan</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Bypassing this plan waives remaining verification requirements for release gate checks. Mandatory reason required.
            </p>
            <textarea
              rows={3}
              value={bypassReasonInput}
              onChange={(e) => setBypassReasonInput(e.target.value)}
              placeholder="Provide explicit justification for bypassing verification plan..."
              style={{ width: '100%', padding: '0.5rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', fontSize: '0.85rem', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setBypassingPlanId(null)}
                style={{ padding: '0.5rem 1rem', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBypassSubmit(bypassingPlanId)}
                style={{ padding: '0.5rem 1rem', background: '#9333ea', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Bypass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
