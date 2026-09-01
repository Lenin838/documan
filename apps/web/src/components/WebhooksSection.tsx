import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  getProjectWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  rotateWebhookSecret,
  getWebhookDeliveries,
} from '../features/webhooks/webhook.api';
import type { Webhook, WebhookDelivery } from '../features/webhooks/webhook.types';

const EVENT_OPTIONS = [
  { value: 'REVIEW_REQUESTED', label: 'Review Requested' },
  { value: 'REVIEW_APPROVED', label: 'Review Approved' },
  { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { value: 'DOCUMENT_SHARED', label: 'Document Shared' },
  { value: 'UPSTREAM_STALE', label: 'Upstream Stale' },
  { value: 'UPSTREAM_DEPRECATED', label: 'Upstream Deprecated' },
];

export function WebhooksSection({ projectId }: { projectId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['*']);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Secret display modal
  const [secretDisplay, setSecretDisplay] = useState<{ title: string; secret: string } | null>(null);

  // Deliveries modal
  const [selectedWebhookForDeliveries, setSelectedWebhookForDeliveries] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  useEffect(() => {
    void loadWebhooks();
  }, [projectId]);

  async function loadWebhooks() {
    setLoading(true);
    setError('');
    try {
      const res = await getProjectWebhooks(projectId);
      setWebhooks(res.data.data.webhooks);
    } catch {
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWebhook(e: FormEvent) {
    e.preventDefault();
    if (!url.trim().startsWith('https://')) {
      setCreateError('URL must use HTTPS protocol');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const res = await createWebhook(projectId, {
        url: url.trim(),
        description: description.trim() || undefined,
        events: selectedEvents.length === 0 ? ['*'] : selectedEvents,
      });

      setShowCreateModal(false);
      setUrl('');
      setDescription('');
      setSelectedEvents(['*']);

      if (res.data.data.secretPlaintextOnce) {
        setSecretDisplay({
          title: 'Webhook Secret Generated',
          secret: res.data.data.secretPlaintextOnce,
        });
      }

      void loadWebhooks();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create webhook';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleEnabled(webhook: Webhook) {
    try {
      await updateWebhook(projectId, webhook.id, { isEnabled: !webhook.isEnabled });
      void loadWebhooks();
    } catch {
      alert('Failed to update webhook status');
    }
  }

  async function handleDeleteWebhook(webhookId: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await deleteWebhook(projectId, webhookId);
      void loadWebhooks();
    } catch {
      alert('Failed to delete webhook');
    }
  }

  async function handleRotateSecret(webhookId: string) {
    if (!confirm('Rotating secret will invalidate the current secret after 24 hours. Proceed?')) return;
    try {
      const res = await rotateWebhookSecret(projectId, webhookId);
      if (res.data.data.secretPlaintextOnce) {
        setSecretDisplay({
          title: 'Webhook Secret Rotated',
          secret: res.data.data.secretPlaintextOnce,
        });
      }
      void loadWebhooks();
    } catch {
      alert('Failed to rotate secret');
    }
  }

  async function handleViewDeliveries(webhookId: string) {
    setSelectedWebhookForDeliveries(webhookId);
    setDeliveriesLoading(true);
    try {
      const res = await getWebhookDeliveries(projectId, webhookId);
      setDeliveries(res.data.data.deliveries);
    } catch {
      alert('Failed to load delivery logs');
    } finally {
      setDeliveriesLoading(false);
    }
  }

  function handleEventCheckboxChange(eventVal: string) {
    if (eventVal === '*') {
      setSelectedEvents(['*']);
      return;
    }

    const filtered = selectedEvents.filter((e) => e !== '*');
    if (filtered.includes(eventVal)) {
      const next = filtered.filter((e) => e !== eventVal);
      setSelectedEvents(next.length === 0 ? ['*'] : next);
    } else {
      setSelectedEvents([...filtered, eventVal]);
    }
  }

  return (
    <section style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Outbound Webhooks ({webhooks.length}/5)</h2>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{ padding: '0.4rem 0.8rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Add Webhook
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading ? (
        <p>Loading webhooks...</p>
      ) : webhooks.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No outbound webhooks configured for this project.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '1rem',
                background: wh.isEnabled ? '#fff' : '#f9f9f9',
                opacity: wh.isEnabled ? 1 : 0.7,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{wh.url}</strong>
                    <span
                      style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '3px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: wh.consecutiveFailures >= 50 ? '#ffcccc' : wh.isEnabled ? '#e6fffa' : '#eee',
                        color: wh.consecutiveFailures >= 50 ? '#cc0000' : wh.isEnabled ? '#007d65' : '#666',
                      }}
                    >
                      {wh.consecutiveFailures >= 50 ? 'Circuit Broken' : wh.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  {wh.description && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#555' }}>{wh.description}</p>}
                  <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.4rem' }}>
                    Events: {wh.events.join(', ')} • Secret: <code>{wh.secretMasked}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleViewDeliveries(wh.id)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateSecret(wh.id)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Rotate Secret
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(wh)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    {wh.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWebhook(wh.id)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#cc0000', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '450px', maxWidth: '90%' }}>
            <h3>Create Outbound Webhook</h3>
            {createError && <p style={{ color: 'red', fontSize: '0.9rem' }}>{createError}</p>}
            <form onSubmit={handleCreateWebhook}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem' }}>Target HTTPS URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem' }}>Description</label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem' }}>Event Subscriptions</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes('*')}
                      onChange={() => handleEventCheckboxChange('*')}
                    />{' '}
                    All Events (*)
                  </label>
                  {EVENT_OPTIONS.map((opt) => (
                    <label key={opt.value} style={{ marginLeft: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(opt.value)}
                        onChange={() => handleEventCheckboxChange(opt.value)}
                      />{' '}
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} style={{ padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {creating ? 'Creating...' : 'Create Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret One-Time Display Modal */}
      {secretDisplay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <h3 style={{ color: '#007d65', marginTop: 0 }}>{secretDisplay.title}</h3>
            <p style={{ fontSize: '0.9rem', color: '#444' }}>
              <strong>IMPORTANT:</strong> Save this webhook secret now. It will <strong>NOT</strong> be displayed again!
            </p>
            <div style={{ background: '#f4f4f4', padding: '0.75rem', borderRadius: '4px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {secretDisplay.secret}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(secretDisplay.secret);
                alert('Secret copied to clipboard');
              }}
              style={{ padding: '0.4rem 0.8rem', marginBottom: '1rem', cursor: 'pointer' }}
            >
              Copy Secret
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSecretDisplay(null)}
                style={{ padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                I Have Saved My Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries History Modal */}
      {selectedWebhookForDeliveries && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '700px', maxWidth: '95%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Delivery History Logs</h3>
              <button type="button" onClick={() => setSelectedWebhookForDeliveries(null)} style={{ cursor: 'pointer' }}>Close</button>
            </div>

            {deliveriesLoading ? (
              <p>Loading delivery history...</p>
            ) : deliveries.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No delivery logs recorded for this webhook yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#eee', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                    <th style={{ padding: '0.5rem' }}>Event</th>
                    <th style={{ padding: '0.5rem' }}>Attempt</th>
                    <th style={{ padding: '0.5rem' }}>HTTP Status</th>
                    <th style={{ padding: '0.5rem' }}>Duration</th>
                    <th style={{ padding: '0.5rem' }}>Attempted At</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((del) => (
                    <tr key={del.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <span
                          style={{
                            padding: '0.1rem 0.3rem',
                            borderRadius: '3px',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            background: del.status === 'SUCCESS' ? '#e6fffa' : del.status === 'FAILED' ? '#ffcccc' : '#fff3cd',
                            color: del.status === 'SUCCESS' ? '#007d65' : del.status === 'FAILED' ? '#cc0000' : '#856404',
                          }}
                        >
                          {del.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{del.eventType}</td>
                      <td style={{ padding: '0.5rem' }}>{del.attemptNumber}/4</td>
                      <td style={{ padding: '0.5rem' }}>{del.httpStatus || 'N/A'}</td>
                      <td style={{ padding: '0.5rem' }}>{del.requestDurationMs ? `${del.requestDurationMs}ms` : 'N/A'}</td>
                      <td style={{ padding: '0.5rem' }}>{new Date(del.attemptedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
