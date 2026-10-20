import React, { useState } from 'react';
import { X, Wrench, AlertTriangle } from 'lucide-react';
import type { Drain } from '../types';
import { api } from '../api';

interface CreateTaskModalProps {
  initialDrain?: Drain | null;
  sourceReportId?: string | null;
  drains: Drain[];
  onClose: () => void;
  onTaskCreated: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  initialDrain, sourceReportId, drains, onClose, onTaskCreated
}) => {
  const [drainId, setDrainId] = useState(initialDrain?.id || (drains[0]?.id || ''));
  const [title, setTitle] = useState(initialDrain ? `Remediate blockage at ${initialDrain.name}` : '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>(
    (initialDrain?.risk_score && initialDrain.risk_score >= 65) ? 'Critical' : (
      (initialDrain?.risk_score && initialDrain.risk_score >= 45) ? 'High' : 'Medium'
    )
  );
  const [assignedCrew, setAssignedCrew] = useState('Crew Delta-4 (Hydro-Vac Unit)');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
  const [durationHours, setDurationHours] = useState('4.0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drainId) {
      setError('Please select a target drain asset.');
      return;
    }
    if (title.trim().length < 3) {
      setError('Please enter a descriptive work order title.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.createTask({
        drain_id: drainId,
        source_report_id: sourceReportId || null,
        title: title.trim(),
        description: description.trim() || 'Desilt and clear physical blockage obstruction according to municipal safety protocols.',
        priority,
        assigned_crew: assignedCrew,
        due_date: dueDate,
        estimated_duration_hours: parseFloat(durationHours) || 4.0
      });
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch maintenance task.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Dispatch Maintenance Work Order</h2>
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
          <div className="form-group">
            <label className="form-label">Target Drain Infrastructure</label>
            <select
              value={drainId}
              onChange={(e) => setDrainId(e.target.value)}
              style={{ width: '100%' }}
              required
            >
              {drains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name} ({d.zone}) [{d.current_status}]
                </option>
              ))}
            </select>
            {sourceReportId && (
              <div className="form-hint" style={{ color: 'var(--text-link)' }}>
                Linked to Source Report: {sourceReportId}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Work Order Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Emergency vacuum clearing of culvert throat"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Priority Tier</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="Critical">Critical (Immediate Dispatch)</option>
                <option value="High">High (Within 24-48 Hours)</option>
                <option value="Medium">Medium (Scheduled Routine)</option>
                <option value="Low">Low (Preventative / Minor)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Municipal Crew</label>
              <select
                value={assignedCrew}
                onChange={(e) => setAssignedCrew(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="Crew Delta-4 (Hydro-Vac Unit)">Crew Delta-4 (Hydro-Vac Unit)</option>
                <option value="Crew Alpha-1 (Heavy Desilting)">Crew Alpha-1 (Heavy Desilting)</option>
                <option value="Rapid Structural Repair Squad 2">Rapid Structural Repair Squad 2</option>
                <option value="Zone B Mechanical Clearing Unit">Zone B Mechanical Clearing Unit</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Target Completion Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Est. Duration (Hours)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="72"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remediation Instructions & Safety Protocols</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify mechanical jetting pressure, traffic diversions, safety PPE, or waste disposal site..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Dispatching Work Order...' : 'Assign & Dispatch Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
