import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, Shield, MapPin, Gauge,
  Clock, FileText, CheckCircle2, Wrench, Info, Layers
} from 'lucide-react';
import type { Drain, RiskAssessment, RiskFactor, Inspection, Report, MaintenanceTask, MaintenanceRecord } from '../types';
import { api } from '../api';

interface DrainDetailModalProps {
  drainId: string;
  onClose: () => void;
  onAssignTask: (drain: Drain) => void;
}

export const DrainDetailModal: React.FC<DrainDetailModalProps> = ({ drainId, onClose, onAssignTask }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<(Drain & {
    risk_assessment: RiskAssessment;
    inspections: Inspection[];
    reports: Report[];
    tasks: MaintenanceTask[];
    maintenance_history: MaintenanceRecord[];
  }) | null>(null);

  const [activeTab, setActiveTab] = useState<'risk' | 'inspections' | 'reports' | 'history'>('risk');

  // New Inspection State
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectorName, setInspectorName] = useState('Er. Rajesh Verma (Lead Civil)');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockagePct, setBlockagePct] = useState('25.0');
  const [structuralCond, setStructuralCond] = useState<'Good' | 'Fair' | 'Poor' | 'Failing'>('Good');
  const [siltDepth, setSiltDepth] = useState('8.0');
  const [flowRate, setFlowRate] = useState<'Normal' | 'Sluggish' | 'Stagnant' | 'Backflow'>('Normal');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  const handleLogInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingInspection(true);
      setInspectionError(null);
      await api.createInspection({
        drain_id: drainId,
        inspector_name: inspectorName.trim(),
        inspection_date: inspectionDate,
        blockage_percentage: parseFloat(blockagePct) || 0,
        structural_condition: structuralCond,
        silt_depth_cm: parseFloat(siltDepth) || 0,
        flow_rate_estimate: flowRate,
        notes: inspectionNotes.trim() || undefined
      });
      const refreshed = await api.getDrainDetail(drainId);
      setData(refreshed);
      setShowInspectionModal(false);
      setActiveTab('inspections');
    } catch (err: any) {
      setInspectionError(err.message || 'Failed to record inspection');
    } finally {
      setSubmittingInspection(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    api.getDrainDetail(drainId)
      .then((res) => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load drain asset details');
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [drainId]);

  if (!drainId) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge badge-simulated">
              {data?.code || drainId}
            </span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{data?.name || 'Loading Drain Details...'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} /> {data?.zone}
                </span>
                <span>•</span>
                <span>{data?.drain_type}</span>
                <span>•</span>
                <span>Dimensions: {data?.dimensions}</span>
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div className="state-container">
            <div className="spinner" />
            <p className="state-desc">Retrieving asset telemetry, reports, and evaluating deterministic risk priority...</p>
          </div>
        )}

        {error && (
          <div className="callout callout-warning">
            <AlertTriangle size={18} />
            <div>
              <strong>Error Loading Asset Details</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Top Bar with Status and Quick Assign */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge badge-status ${data.current_status.toLowerCase().replace(' ', '-')}`}>
                  Status: {data.current_status}
                </span>
                <span className={`badge badge-prio-${data.risk_assessment.priority_tier.toLowerCase()}`}>
                  Priority: {data.risk_assessment.priority_tier} ({data.risk_assessment.total_score} / 90 pts)
                </span>
                <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-secondary)' }}>
                  Depth: {data.depth_m}m
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowInspectionModal(true)}
                >
                  <Shield size={14} />
                  Log Field Inspection
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onAssignTask(data)}
                >
                  <Wrench size={14} />
                  Dispatch Maintenance Task
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="modal-tabs-nav">
              <button
                type="button"
                className={activeTab === 'risk' ? 'active' : ''}
                onClick={() => setActiveTab('risk')}
              >
                <Gauge size={15} />
                Explainable Risk Engine
              </button>
              <button
                type="button"
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => setActiveTab('reports')}
              >
                <FileText size={15} />
                Linked Reports ({data.reports.length})
              </button>
              <button
                type="button"
                className={activeTab === 'inspections' ? 'active' : ''}
                onClick={() => setActiveTab('inspections')}
              >
                <Shield size={15} />
                Inspections ({data.inspections.length})
              </button>
              <button
                type="button"
                className={activeTab === 'history' ? 'active' : ''}
                onClick={() => setActiveTab('history')}
              >
                <CheckCircle2 size={15} />
                Maintenance History ({data.maintenance_history.length})
              </button>
            </div>

            {/* TAB 1: Risk Engine Explainability */}
            {activeTab === 'risk' && (
              <div>
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Deterministic Maintenance Prioritization Score
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                          {data.risk_assessment.total_score}
                        </span>
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                          / 90.0 maximum available points
                        </span>
                        <span className={`badge badge-prio-${data.risk_assessment.priority_tier.toLowerCase()}`} style={{ marginLeft: 8 }}>
                          {data.risk_assessment.priority_tier} Priority Tier
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calculation Timestamp</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(data.risk_assessment.calculated_at).toLocaleTimeString()} UTC
                      </div>
                    </div>
                  </div>

                  <div className="callout callout-info" style={{ marginTop: 14 }}>
                    <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>PRIORITIZATION PRINCIPLE</strong>
                      <p style={{ marginTop: 2 }}>{data.risk_assessment.disclaimer}</p>
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} color="var(--accent-primary)" />
                  Contributing Risk Factors & Empirical Evidence (4 Factors)
                </h3>

                {data.risk_assessment.factors.filter((f: RiskFactor) => !f.is_excluded && f.name !== 'Real-time Rainfall Telemetry').map((factor: RiskFactor, idx: number) => {
                  const pct = factor.max_score > 0 ? (factor.score / factor.max_score) * 100 : 0;
                  const isExcluded = factor.is_excluded;
                  const isMissingData = factor.inspection_status === 'UNKNOWN_NEEDS_INSPECTION' || factor.field_status === 'UNKNOWN';

                  return (
                    <div
                      key={idx}
                      className="risk-factor-row"
                      style={{
                        borderColor: isExcluded ? 'var(--border-subtle)' : (
                          isMissingData ? '#fca5a5' : (
                            factor.score >= 20 ? '#fecaca' : 'var(--border-subtle)'
                          )
                        ),
                        background: isMissingData ? '#fef2f2' : (
                          isExcluded ? '#f8fafc' : '#ffffff'
                        )
                      }}
                    >
                      <div className="risk-factor-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="risk-factor-name">{factor.name}</span>
                          <span className="badge" style={{ fontSize: '0.68rem', background: '#f1f5f9', color: 'var(--text-secondary)' }}>
                            {factor.weight_label}
                          </span>
                          {isMissingData && (
                            <span className="badge badge-prio-critical">
                              MISSING DATA: UNKNOWN
                            </span>
                          )}
                          {isExcluded && (
                            <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}>
                              EXCLUDED
                            </span>
                          )}
                        </div>

                        <div className="risk-factor-score" style={{
                          color: isExcluded ? 'var(--text-muted)' : (
                            factor.score >= 18 ? '#dc2626' : (
                              factor.score > 0 ? '#d97706' : '#16a34a'
                            )
                          )
                        }}>
                          {isExcluded ? '0 / 0 pts' : `${factor.score} / ${factor.max_score} pts`}
                        </div>
                      </div>

                      {!isExcluded && (
                        <div className="risk-progress-bar">
                          <div
                            className="risk-progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: factor.score >= 20 ? '#dc2626' : (
                                factor.score >= 10 ? '#d97706' : '#2563eb'
                              )
                            }}
                          />
                        </div>
                      )}

                      <div className="risk-factor-evidence">
                        <strong style={{ color: 'var(--text-main)', marginRight: 6 }}>Evidence:</strong>
                        {factor.evidence}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: Linked Reports */}
            {activeTab === 'reports' && (
              <div>
                {data.reports.length === 0 ? (
                  <div className="state-container">
                    <CheckCircle2 size={36} className="state-icon" style={{ color: '#16a34a' }} />
                    <div className="state-title">No Active Blockage Reports</div>
                    <div className="state-desc">This drain has zero pending or verified civilian blockage alerts.</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID & Type</th>
                          <th>Category</th>
                          <th>Severity</th>
                          <th>Reporter & Description</th>
                          <th>Status</th>
                          <th>Logged At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.reports.map((r: Report) => (
                          <tr key={r.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.id}</div>
                              {r.is_simulated ? (
                                <span className="badge badge-simulated" style={{ fontSize: '0.62rem' }}>SIMULATED</span>
                              ) : (
                                <span className="badge badge-genuine" style={{ fontSize: '0.62rem' }}>GENUINE</span>
                              )}
                            </td>
                            <td>{r.category}</td>
                            <td>
                              <span className={`badge badge-prio-${r.severity.toLowerCase()}`}>
                                {r.severity}
                              </span>
                            </td>
                            <td style={{ maxWidth: 260 }}>
                              <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 600 }}>{r.reporter_name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.description}</div>
                            </td>
                            <td>
                              <span className={`badge badge-status ${r.status.toLowerCase()}`}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.78rem' }}>
                              {new Date(r.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Inspections */}
            {activeTab === 'inspections' && (
              <div>
                {data.inspections.length === 0 ? (
                  <div className="state-container">
                    <AlertTriangle size={36} className="state-icon" style={{ color: '#dc2626' }} />
                    <div className="state-title">No Inspection Records on File</div>
                    <div className="state-desc">
                      This asset has never had a documented engineering inspection. The risk engine has automatically marked it as
                      <strong> UNKNOWN - NEEDS INSPECTION</strong> and applied the maximum overdue penalty.
                    </div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Inspection Date</th>
                          <th>Inspector</th>
                          <th>Blockage %</th>
                          <th>Silt Depth</th>
                          <th>Condition</th>
                          <th>Flow Rate</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.inspections.map((ins: Inspection) => (
                          <tr key={ins.id}>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ins.id}</td>
                            <td>{ins.inspection_date}</td>
                            <td>{ins.inspector_name}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: ins.blockage_percentage >= 50 ? '#dc2626' : '#16a34a' }}>
                                {ins.blockage_percentage}%
                              </span>
                            </td>
                            <td>{ins.silt_depth_cm} cm</td>
                            <td>
                              <span className={`badge badge-prio-${ins.structural_condition === 'Good' ? 'low' : (ins.structural_condition === 'Fair' ? 'moderate' : 'critical')}`}>
                                {ins.structural_condition}
                              </span>
                            </td>
                            <td>{ins.flow_rate_estimate}</td>
                            <td style={{ fontSize: '0.78rem', maxWidth: 220 }}>{ins.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Maintenance History */}
            {activeTab === 'history' && (
              <div>
                {data.maintenance_history.length === 0 ? (
                  <div className="state-container">
                    <Clock size={36} className="state-icon" />
                    <div className="state-title">No Completed Remediation Records</div>
                    <div className="state-desc">No past completed work orders recorded yet for this asset.</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Record ID</th>
                          <th>Completion Date</th>
                          <th>Crew</th>
                          <th>Actions Taken</th>
                          <th>Waste Cleared (kg)</th>
                          <th>Post Condition</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.maintenance_history.map((rec: MaintenanceRecord) => (
                          <tr key={rec.id}>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{rec.id}</td>
                            <td>{rec.completion_date}</td>
                            <td>{rec.completed_by}</td>
                            <td style={{ maxWidth: 220 }}>{rec.actions_taken}</td>
                            <td style={{ fontWeight: 700, color: '#16a34a' }}>{rec.waste_removed_kg} kg</td>
                            <td>
                              <span className="badge badge-prio-low">
                                {rec.post_condition}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.78rem', maxWidth: 180 }}>{rec.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal to Log Physical Inspection */}
        {showInspectionModal && (
          <div className="modal-overlay" onClick={() => setShowInspectionModal(false)} role="dialog" aria-modal="true" style={{ zIndex: 1100 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield size={20} color="#2563eb" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Log Field Inspection Observation</h3>
                </div>
                <button className="modal-close-btn" onClick={() => setShowInspectionModal(false)} aria-label="Close dialog">
                  <X size={18} />
                </button>
              </div>

              {inspectionError && (
                <div className="callout callout-warning" style={{ marginBottom: 14 }}>
                  <AlertTriangle size={16} />
                  <div>{inspectionError}</div>
                </div>
              )}

              <form onSubmit={handleLogInspection}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Inspecting Civil Engineer</label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Inspection Date</label>
                    <input
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Estimated Blockage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={blockagePct}
                      onChange={(e) => setBlockagePct(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Structural Condition</label>
                    <select
                      value={structuralCond}
                      onChange={(e) => setStructuralCond(e.target.value as any)}
                      style={{ width: '100%' }}
                    >
                      <option value="Good">Good (Sound culvert structure)</option>
                      <option value="Fair">Fair (Minor spalling or surface wear)</option>
                      <option value="Poor">Poor (Cracked walls / joint separation)</option>
                      <option value="Failing">Failing (Structural collapse hazard)</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Measured Silt Bed Depth (cm)</label>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="0.5"
                      value={siltDepth}
                      onChange={(e) => setSiltDepth(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Observed Flow Rate</label>
                    <select
                      value={flowRate}
                      onChange={(e) => setFlowRate(e.target.value as any)}
                      style={{ width: '100%' }}
                    >
                      <option value="Normal">Normal (Clear gravity runoff)</option>
                      <option value="Sluggish">Sluggish (Partial backwater build-up)</option>
                      <option value="Stagnant">Stagnant (Zero gravitational flow)</option>
                      <option value="Backflow">Backflow (Inlet backwater surge)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Field Observation Notes</label>
                  <textarea
                    rows={2}
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="e.g. Silt buildup concentrated near west junction chamber. Concrete lid secure."
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowInspectionModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingInspection}>
                    {submittingInspection ? 'Submitting...' : 'Save Inspection Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
