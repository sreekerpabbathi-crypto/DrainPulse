import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Report, Drain } from '../types';
import { api } from '../api';

interface VerifyReportModalProps {
  report: Report;
  drains: Drain[];
  onClose: () => void;
  onReportVerified: () => void;
  onDispatchTask?: (drain: Drain, sourceReportId: string) => void;
}

export const VerifyReportModal: React.FC<VerifyReportModalProps> = ({
  report, drains, onClose, onReportVerified, onDispatchTask
}) => {
  const [status, setStatus] = useState<'Verified' | 'Rejected' | 'Resolved'>('Verified');
  const [verifiedBy, setVerifiedBy] = useState('Officer K. Ramanathan (Zone Supt.)');
  const [targetDrainId, setTargetDrainId] = useState(report.drain_id || (drains[0]?.id || ''));
  const [notes, setNotes] = useState(
    report.status === 'Verified'
      ? (report.verification_notes || 'Confirmed significant blockage during physical field patrol.')
      : 'Confirmed physical obstruction during zone patrol. Flow impeded by plastic and organic debris.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (notes.trim().length < 3) {
      setError('Please provide verification findings or rationale.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.verifyReport(report.id, {
        status,
        verification_notes: notes.trim(),
        verified_by: verifiedBy.trim(),
        target_drain_id: targetDrainId || undefined
      });
      onReportVerified();

      // If officer verified and wants to dispatch task immediately
      if (status === 'Verified' && onDispatchTask && targetDrainId) {
        const selectedDrain = drains.find((d) => d.id === targetDrainId);
        if (selectedDrain) {
          onDispatchTask(selectedDrain, report.id);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update report status.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} color="#0ea5e9" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Officer Review & Report Verification</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {report.id} • Filed by {report.reporter_name}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="callout callout-warning" style={{ marginBottom: 16 }}>
            <AlertTriangle size={18} />
            <div>{error}</div>
          </div>
        )}

        {/* Civilian Report Summary Box */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="badge badge-simulated" style={{ fontSize: '0.72rem' }}>
              {report.category}
            </span>
            <span className={`badge badge-prio-${report.severity.toLowerCase()}`}>
              Severity: {report.severity}
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>
            Location: {report.location_description}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            "{report.description}"
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Verification Decision</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <button
                type="button"
                className={`btn ${status === 'Verified' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatus('Verified')}
              >
                <CheckCircle size={15} />
                Verify Report
              </button>
              <button
                type="button"
                className={`btn ${status === 'Rejected' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setStatus('Rejected')}
              >
                <XCircle size={15} />
                Reject
              </button>
              <button
                type="button"
                className={`btn ${status === 'Resolved' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => setStatus('Resolved')}
              >
                <ShieldCheck size={15} />
                Mark Resolved
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Reviewing Officer</label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Associated Municipal Drain Asset</label>
              <select
                value={targetDrainId}
                onChange={(e) => setTargetDrainId(e.target.value)}
                style={{ width: '100%' }}
                required
              >
                {drains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name} ({d.zone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Officer Verification Notes & Physical Findings</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record ground check observations, silt gauge depth, or reasons for rejection..."
              style={{ width: '100%', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Save Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
