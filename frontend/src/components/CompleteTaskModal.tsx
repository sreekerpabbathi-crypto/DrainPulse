import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Hammer } from 'lucide-react';
import type { MaintenanceTask } from '../types';
import { api } from '../api';

interface CompleteTaskModalProps {
  task: MaintenanceTask;
  onClose: () => void;
  onTaskCompleted: () => void;
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ task, onClose, onTaskCompleted }) => {
  const [completedBy, setCompletedBy] = useState(`Lead Foreman (${task.assigned_crew})`);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionsTaken, setActionsTaken] = useState('');
  const [wasteRemovedKg, setWasteRemovedKg] = useState('240.0');
  const [postCondition, setPostCondition] = useState<'Cleared' | 'Repaired' | 'Re-inspection Required'>('Cleared');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionsTaken.trim().length < 5) {
      setError('Please provide detailed notes on physical actions taken (at least 5 characters).');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.completeTask(task.id, {
        completed_by: completedBy.trim(),
        completion_date: completionDate,
        actions_taken: actionsTaken.trim(),
        waste_removed_kg: parseFloat(wasteRemovedKg) || 0.0,
        post_condition: postCondition,
        notes: notes.trim() || undefined
      });
      onTaskCompleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete task.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={22} color="var(--success)" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Record Task Completion & Field Sign-off</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {task.id} • {task.title} ({task.drain_code || task.drain_id})
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

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Authorized Sign-off Personnel</label>
              <input
                type="text"
                value={completedBy}
                onChange={(e) => setCompletedBy(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Field Execution Date</label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Post-Remediation Asset Condition</label>
              <select
                value={postCondition}
                onChange={(e) => setPostCondition(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="Cleared">Cleared (Flow fully restored to 100%)</option>
                <option value="Repaired">Repaired (Structural or grate repair certified)</option>
                <option value="Re-inspection Required">Re-inspection Required (Follow-up needed)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Solid Waste / Silt Extracted (kg)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={wasteRemovedKg}
                onChange={(e) => setWasteRemovedKg(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Actions Taken</label>
            <textarea
              rows={3}
              value={actionsTaken}
              onChange={(e) => setActionsTaken(e.target.value)}
              placeholder="e.g., Deployed 150-bar vacuum jetter nozzle, dislodged concrete scale and packed polyethylene waste, tested gravity runoff."
              style={{ width: '100%', resize: 'vertical' }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Field Notes & Observational Recommendations</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Recommend installing a secondary trash screen upstream to capture shop packaging."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div className="callout callout-info" style={{ marginBottom: 20 }}>
            <Hammer size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Automated Municipal Workflow Updates</strong>
              <div style={{ fontSize: '0.78rem', marginTop: 2 }}>
                Submitting this sign-off will:
                1) Update task status to <em>Completed</em>;
                2) Restore target drain {task.drain_code} status to <em>Operational</em>;
                3) Automatically resolve linked citizen report ({task.source_report_id || 'None'});
                4) Store permanent entry in municipal maintenance records and audit log.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              <CheckCircle2 size={16} />
              {loading ? 'Submitting Field Record...' : 'Confirm & Complete Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
