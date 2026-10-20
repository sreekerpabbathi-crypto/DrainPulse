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
                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  Depth: {data.depth_m}m
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onAssignTask(data)}
              >
                <Wrench size={14} />
                Dispatch Maintenance Task
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setActiveTab('risk')}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  color: activeTab === 'risk' ? '#38bdf8' : 'var(--text-muted)',
                  borderBottom: activeTab === 'risk' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Gauge size={15} />
                Explainable Risk Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  color: activeTab === 'reports' ? '#38bdf8' : 'var(--text-muted)',
                  borderBottom: activeTab === 'reports' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <FileText size={15} />
                Linked Reports ({data.reports.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inspections')}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  color: activeTab === 'inspections' ? '#38bdf8' : 'var(--text-muted)',
                  borderBottom: activeTab === 'inspections' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Shield size={15} />
                Inspections ({data.inspections.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  color: activeTab === 'history' ? '#38bdf8' : 'var(--text-muted)',
                  borderBottom: activeTab === 'history' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <CheckCircle2 size={15} />
                Maintenance History ({data.maintenance_history.length})
              </button>
            </div>

            {/* TAB 1: Risk Engine Explainability */}
            {activeTab === 'risk' && (
              <div>
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 20 }}>
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
                  <Layers size={16} color="#38bdf8" />
                  Contributing Risk Factors & Empirical Evidence (5 Factors)
                </h3>

                {data.risk_assessment.factors.map((factor: RiskFactor, idx: number) => {
                  const pct = factor.max_score > 0 ? (factor.score / factor.max_score) * 100 : 0;
                  const isExcluded = factor.is_excluded;
                  const isMissingData = factor.inspection_status === 'UNKNOWN_NEEDS_INSPECTION' || factor.field_status === 'UNKNOWN';

                  return (
                    <div
                      key={idx}
                      className="risk-factor-row"
                      style={{
                        borderColor: isExcluded ? 'rgba(255,255,255,0.06)' : (
                          isMissingData ? 'rgba(244, 63, 94, 0.4)' : (
                            factor.score >= 20 ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-subtle)'
                          )
                        ),
                        background: isMissingData ? 'rgba(244, 63, 94, 0.05)' : (
                          isExcluded ? 'rgba(255,255,255,0.02)' : 'var(--bg-surface)'
                        )
                      }}
                    >
                      <div className="risk-factor-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="risk-factor-name">{factor.name}</span>
                          <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.06)' }}>
                            {factor.weight_label}
                          </span>
                          {isMissingData && (
                            <span className="badge badge-prio-critical">
                              MISSING DATA: UNKNOWN
                            </span>
                          )}
                          {isExcluded && (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                              EXCLUDED
                            </span>
                          )}
                        </div>

                        <div className="risk-factor-score" style={{
                          color: isExcluded ? 'var(--text-muted)' : (
                            factor.score >= 18 ? '#fda4af' : (
                              factor.score > 0 ? '#fcd34d' : '#6ee7b7'
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
                              background: factor.score >= 20 ? 'linear-gradient(90deg, #f59e0b, #f43f5e)' : (
                                factor.score >= 10 ? 'linear-gradient(90deg, #0ea5e9, #f59e0b)' : '#10b981'
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
                    <CheckCircle2 size={36} className="state-icon" style={{ color: '#10b981' }} />
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
                    <AlertTriangle size={36} className="state-icon" style={{ color: '#f43f5e' }} />
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
                              <span style={{ fontWeight: 700, color: ins.blockage_percentage >= 50 ? '#fda4af' : '#6ee7b7' }}>
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
                            <td style={{ fontWeight: 700, color: '#34d399' }}>{rec.waste_removed_kg} kg</td>
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
      </div>
    </div>
  );
};
