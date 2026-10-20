import React, { useState, useEffect } from 'react';
import {
  Send, AlertCircle, CheckCircle, RefreshCw, FileText, Search, ShieldCheck
} from 'lucide-react';
import type { Drain, Report } from '../types';
import { api } from '../api';

interface CivilianPortalProps {
  drains: Drain[];
  onReportCreated?: () => void;
}

export const CivilianPortal: React.FC<CivilianPortalProps> = ({ drains, onReportCreated }) => {
  const [activeView, setActiveView] = useState<'submit' | 'feed' | 'track'>('submit');
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [genuineFilter, setGenuineFilter] = useState<'all' | 'genuine' | 'simulated'>('all');

  // Tracking state
  const [trackInputId, setTrackInputId] = useState('');
  const [trackedReport, setTrackedReport] = useState<Report | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Form State
  const [drainId, setDrainId] = useState<string>('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [category, setCategory] = useState('Solid Waste / Plastic Blockage');
  const [severity, setSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdReport, setCreatedReport] = useState<Report | null>(null);

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const data = await api.getReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports feed', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim() || reporterName.trim().length < 2) {
      setSubmitError('Please enter your name.');
      return;
    }
    if (!locationDescription.trim() || locationDescription.trim().length < 3) {
      setSubmitError('Please provide a specific street or landmark location.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setSubmitError('Please describe the drainage issue in at least 5 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const rep = await api.createReport({
        drain_id: drainId ? drainId : null,
        reporter_name: reporterName.trim(),
        reporter_phone: reporterPhone.trim() || undefined,
        reporter_email: reporterEmail.trim() || undefined,
        category,
        severity,
        description: description.trim(),
        location_description: locationDescription.trim(),
      });

      setCreatedReport(rep);
      // Reset form
      setDescription('');
      setLocationDescription('');
      setDrainId('');
      fetchReports();
      if (onReportCreated) onReportCreated();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryId = trackInputId.trim().toUpperCase();
    if (!queryId) {
      setTrackError('Please enter a valid report reference ID (e.g. REP-CIV-5B8D32 or REP-001).');
      return;
    }
    try {
      setTrackLoading(true);
      setTrackError(null);
      const rep = await api.getReport(queryId);
      setTrackedReport(rep);
    } catch (err: any) {
      setTrackError(err.message || `No report found matching ID "${queryId}".`);
      setTrackedReport(null);
    } finally {
      setTrackLoading(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (genuineFilter === 'genuine' && r.is_simulated !== 0) return false;
    if (genuineFilter === 'simulated' && r.is_simulated !== 1) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location_description.toLowerCase().includes(q) ||
        (r.drain_name && r.drain_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div>
      {/* Civilian Portal Navigation Tabs */}
      <div className="civilian-nav-tabs">
        <button
          type="button"
          className={`btn ${activeView === 'submit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveView('submit')}
        >
          <Send size={16} />
          Report Drainage Issue
        </button>
        <button
          type="button"
          className={`btn ${activeView === 'track' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveView('track')}
        >
          <Search size={16} />
          Track Report by Reference ID
        </button>
        <button
          type="button"
          className={`btn ${activeView === 'feed' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveView('feed')}
        >
          <FileText size={16} />
          Community Reports Feed ({reports.length})
        </button>
      </div>

      {/* VIEW 1: Citizen Report Submission */}
      {activeView === 'submit' && (
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {createdReport && (
            <div className="card" style={{ border: '1px solid #86efac', background: '#f0fdf4', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <CheckCircle size={28} color="#16a34a" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>
                    Report Successfully Registered!
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Your report has been logged into the municipal database and routed for officer verification.
                  </p>
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tracking Reference ID:</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-link)', fontFamily: 'var(--font-mono)' }}>
                      {createdReport.id}
                    </div>
                  </div>
                  <span className="badge badge-genuine">
                    GENUINE DEMO INTERACTION
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  <strong>Next Step:</strong> Switch to the <em>Officer Operations Center</em> at the top right to verify this report, update priority weights, and dispatch a maintenance crew.
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCreatedReport(null)}
                >
                  File Another Report
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="section-title">
                  <Send size={20} color="#2563eb" />
                  Civilian Drainage Incident Report
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Report waterlogging, choked culverts, overflowing storm drains, or broken safety grates directly to municipal engineers.
                </p>
              </div>
            </div>

            {submitError && (
              <div className="callout callout-warning" style={{ marginBottom: 18 }}>
                <AlertCircle size={18} />
                <div>{submitError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Issue Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Solid Waste / Plastic Blockage">Solid Waste / Plastic Blockage</option>
                    <option value="Silt / Sediment Accumulation">Silt / Sediment Accumulation</option>
                    <option value="Collapsed Grate / Structural Damage">Collapsed Grate / Structural Damage</option>
                    <option value="Overflows / Stagnant Blackwater">Overflows / Stagnant Blackwater</option>
                    <option value="Foul Odour">Foul Odour</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Urgency & Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    style={{ width: '100%' }}
                  >
                    <option value="Critical">Critical (Flood hazard / immediate threat)</option>
                    <option value="High">High (Roadway blocked / severe obstruction)</option>
                    <option value="Medium">Medium (Moderate flow impediment)</option>
                    <option value="Low">Low (Early debris accumulation / minor)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location Landmark & Cross-Street</label>
                <input
                  type="text"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="e.g. In front of Bus Terminal Gate 3, near Anna Arch signal"
                  style={{ width: '100%' }}
                  required
                />
                <div className="form-hint">Provide clear local references so municipal inspectors can rapidly locate the drain.</div>
              </div>

              <div className="form-group">
                <label className="form-label">Specific Drain Asset (Optional)</label>
                <select
                  value={drainId}
                  onChange={(e) => setDrainId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">I don't know the exact drain ID (Officer will identify)</option>
                  {drains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name} ({d.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Incident Description & Field Observations</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe water depth, visible plastic crates, fallen branches, smell, or road hazard..."
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="e.g., Priya Sundaram"
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (For verification SMS)</label>
                  <input
                    type="tel"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Optional status updates)</label>
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={16} />
                  {submitting ? 'Submitting Report...' : 'Submit Civilian Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: Community Reports Feed */}
      {activeView === 'feed' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">
                <FileText size={20} color="#2563eb" />
                Community Reports & Public Status Feed
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Track the live resolution workflow of public drainage alerts.
              </p>
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchReports}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="filter-bar">
            <div className="search-input">
              <input
                type="text"
                placeholder="Search by ID, landmark, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Submitted">Pending Verification</option>
              <option value="Verified">Verified by Officer</option>
              <option value="Resolved">Resolved / Cleaned</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select value={genuineFilter} onChange={(e) => setGenuineFilter(e.target.value as any)}>
              <option value="all">All Records</option>
              <option value="genuine">Genuine Demo Interactions Only</option>
              <option value="simulated">Simulated Demo Data Only</option>
            </select>
          </div>

          {loadingReports ? (
            <div className="state-container">
              <div className="spinner" />
              <div className="state-desc">Loading community reports...</div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="state-container">
              <AlertCircle size={36} className="state-icon" />
              <div className="state-title">No Matching Reports Found</div>
              <div className="state-desc">Adjust your filters or submit a new report.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report Ref & Type</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Location & Description</th>
                    <th>Drain Asset</th>
                    <th>Status</th>
                    <th>Verification / Officer Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                          {r.id}
                        </div>
                        {r.is_simulated ? (
                          <span className="badge badge-simulated" style={{ fontSize: '0.62rem', marginTop: 4 }}>
                            SIMULATED DEMO
                          </span>
                        ) : (
                          <span className="badge badge-genuine" style={{ fontSize: '0.62rem', marginTop: 4 }}>
                            GENUINE INTERACTION
                          </span>
                        )}
                      </td>
                      <td>{r.category}</td>
                      <td>
                        <span className={`badge badge-prio-${r.severity.toLowerCase()}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.84rem' }}>
                          {r.location_description}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                          "{r.description}"
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Reported by {r.reporter_name} • {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        {r.drain_code ? (
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-link)' }}>{r.drain_code}</span>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{r.drain_name}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-status ${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', maxWidth: 220 }}>
                        {r.verification_notes ? (
                          <div>
                            <div>{r.verification_notes}</div>
                            {r.verified_by && (
                              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                                Verified by: {r.verified_by}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Awaiting field verification</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Dedicated Reference ID Tracker */}
      {activeView === 'track' && (
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div>
                <h2 className="section-title">
                  <Search size={20} color="#2563eb" />
                  Incident Live Status Tracker
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Enter your tracking reference ID (e.g. <code>REP-CIV-XXXXXX</code>) to view real-time municipal inspection and resolution progress.
                </p>
              </div>
            </div>

            <form onSubmit={handleTrackSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Enter Tracking ID (e.g. REP-CIV-5B8D32 or REP-001)..."
                value={trackInputId}
                onChange={(e) => setTrackInputId(e.target.value)}
                style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
              />
              <button type="submit" className="btn btn-primary" disabled={trackLoading}>
                <Search size={15} />
                {trackLoading ? 'Searching...' : 'Track Incident'}
              </button>
            </form>

            {trackError && (
              <div className="callout callout-warning">
                <AlertCircle size={18} />
                <div>{trackError}</div>
              </div>
            )}
          </div>

          {trackedReport && (
            <div className="card" style={{ border: '1px solid var(--border-subtle)', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Report Reference</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-link)', fontFamily: 'var(--font-mono)' }}>
                    {trackedReport.id}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {trackedReport.is_simulated ? (
                    <span className="badge badge-simulated">SIMULATED DEMO</span>
                  ) : (
                    <span className="badge badge-genuine">GENUINE INTERACTION</span>
                  )}
                  <span className={`badge badge-status ${trackedReport.status.toLowerCase()}`}>
                    Status: {trackedReport.status}
                  </span>
                </div>
              </div>

              {/* Progress Milestones Bar */}
              <div className="tracking-milestones-grid">
                <div style={{
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', fontSize: '0.76rem', fontWeight: 700
                }}>
                  1. Logged
                </div>
                <div style={{
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  background: trackedReport.status !== 'Submitted' ? '#eff6ff' : '#f8fafc',
                  border: trackedReport.status !== 'Submitted' ? '1px solid #93c5fd' : '1px solid var(--border-subtle)',
                  color: trackedReport.status !== 'Submitted' ? '#1d4ed8' : 'var(--text-muted)',
                  fontSize: '0.76rem', fontWeight: 700
                }}>
                  2. Verified
                </div>
                <div style={{
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  background: trackedReport.status === 'Resolved' ? '#eff6ff' : (
                    trackedReport.drain_id ? '#fffbeb' : '#f8fafc'
                  ),
                  border: trackedReport.status === 'Resolved' ? '1px solid #93c5fd' : (
                    trackedReport.drain_id ? '1px solid #fde68a' : '1px solid var(--border-subtle)'
                  ),
                  color: trackedReport.status === 'Resolved' ? '#1d4ed8' : (
                    trackedReport.drain_id ? '#b45309' : 'var(--text-muted)'
                  ),
                  fontSize: '0.76rem', fontWeight: 700
                }}>
                  3. Dispatched
                </div>
                <div style={{
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  background: trackedReport.status === 'Resolved' ? '#f0fdf4' : '#f8fafc',
                  border: trackedReport.status === 'Resolved' ? '1px solid #86efac' : '1px solid var(--border-subtle)',
                  color: trackedReport.status === 'Resolved' ? '#15803d' : 'var(--text-muted)',
                  fontSize: '0.76rem', fontWeight: 700
                }}>
                  4. Resolved
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18, fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Category & Severity</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                    {trackedReport.category} — <span className={`badge badge-prio-${trackedReport.severity.toLowerCase()}`}>{trackedReport.severity}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Associated Municipal Asset</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                    {trackedReport.drain_code ? `${trackedReport.drain_code} (${trackedReport.drain_name})` : 'Awaiting asset mapping'}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Location Landmark</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                    {trackedReport.location_description}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Description</span>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                    "{trackedReport.description}"
                  </div>
                </div>
              </div>

              {trackedReport.verification_notes && (
                <div className="callout callout-info" style={{ marginTop: 12 }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Municipal Engineering Notes</strong>
                    <div style={{ marginTop: 2 }}>{trackedReport.verification_notes}</div>
                    {trackedReport.verified_by && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Reviewed by: {trackedReport.verified_by} • {trackedReport.verified_at ? new Date(trackedReport.verified_at).toLocaleString() : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
