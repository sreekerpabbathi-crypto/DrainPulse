import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle2, Wrench,
  MapPin, Gauge, Clock, Layers, RefreshCw, Scale
} from 'lucide-react';
import type { Drain, Report, MaintenanceTask, MaintenanceRecord, AuditEvent, DashboardStats } from '../types';
import { api } from '../api';
import { SpatialDrainMap } from './SpatialDrainMap';
import { DrainDetailModal } from './DrainDetailModal';
import { CreateTaskModal } from './CreateTaskModal';
import { CompleteTaskModal } from './CompleteTaskModal';
import { VerifyReportModal } from './VerifyReportModal';

interface OfficerDashboardProps {
  stats: DashboardStats | null;
  drains: Drain[];
  onRefreshAll: () => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ stats, drains, onRefreshAll }) => {
  const [activeTab, setActiveTab] = useState<'drains' | 'reports' | 'tasks' | 'map' | 'history'>('drains');

  // Sub-data states
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [drainSearch, setDrainSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [prioFilter, setPrioFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'Submitted' | 'Verified' | 'Resolved'>('Submitted');
  const [reportGenuineFilter, setReportGenuineFilter] = useState<'all' | 'genuine' | 'simulated'>('all');

  // Modals state
  const [selectedDrainForDetail, setSelectedDrainForDetail] = useState<string | null>(null);
  const [taskModalDrain, setTaskModalDrain] = useState<Drain | null>(null);
  const [taskModalSourceReport, setTaskModalSourceReport] = useState<string | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<MaintenanceTask | null>(null);
  const [reportToVerify, setReportToVerify] = useState<Report | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [repsData, tasksData, recsData, auditsData] = await Promise.all([
        api.getReports(),
        api.getTasks(),
        api.getMaintenanceRecords(),
        api.getAuditEvents(35)
      ]);
      setReports(repsData);
      setTasks(tasksData);
      setRecords(recsData);
      setAuditEvents(auditsData);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTaskCreated = () => {
    fetchDashboardData();
    onRefreshAll();
  };

  const handleTaskCompleted = () => {
    fetchDashboardData();
    onRefreshAll();
  };

  const handleReportVerified = () => {
    fetchDashboardData();
    onRefreshAll();
  };

  // Filtered Drains
  const filteredDrains = drains.filter((d) => {
    if (zoneFilter !== 'all' && d.zone !== zoneFilter) return false;
    if (statusFilter !== 'all' && d.current_status !== statusFilter) return false;
    if (prioFilter !== 'all' && d.priority_tier !== prioFilter) return false;
    if (drainSearch.trim()) {
      const q = drainSearch.toLowerCase();
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.zone.toLowerCase().includes(q) ||
        d.drain_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Reports
  const filteredReports = reports.filter((r) => {
    if (reportStatusFilter !== 'all' && r.status !== reportStatusFilter) return false;
    if (reportGenuineFilter === 'genuine' && r.is_simulated !== 0) return false;
    if (reportGenuineFilter === 'simulated' && r.is_simulated !== 1) return false;
    return true;
  });

  return (
    <div>
      {/* Top Stat Cards Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Registered Drains</span>
            <Layers size={18} color="#0ea5e9" />
          </div>
          <div className="stat-value">{stats?.drains.total || 30}</div>
          <div className="stat-desc">
            <span style={{ color: '#f43f5e', fontWeight: 700 }}>{stats?.drains.degraded_or_blocked || 0} Blocked/Degraded</span> • {stats?.drains.operational || 0} Operational
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Pending Verification</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div className="stat-value">{stats?.reports.pending_verification || 0}</div>
          <div className="stat-desc">
            Citizen reports awaiting field inspection sign-off
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Active Crew Dispatches</span>
            <Wrench size={18} color="#38bdf8" />
          </div>
          <div className="stat-value">{stats?.maintenance.active_tasks || 0}</div>
          <div className="stat-desc">
            {stats?.maintenance.completed_tasks || 0} tasks successfully completed
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Solid Waste Cleared</span>
            <Scale size={18} color="#10b981" />
          </div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            {stats?.maintenance.total_waste_removed_kg ? `${stats.maintenance.total_waste_removed_kg.toLocaleString()} kg` : '0 kg'}
          </div>
          <div className="stat-desc">
            Physical silt & solid debris extracted from channels
          </div>
        </div>
      </div>

      {/* Officer Dashboard Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'drains' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('drains')}
          >
            <Gauge size={16} />
            Prioritized Drains ({drains.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('reports')}
          >
            <Clock size={16} />
            Reports Queue ({stats?.reports.pending_verification || 0} Pending)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('tasks')}
          >
            <Wrench size={16} />
            Maintenance Work Orders ({tasks.filter(t => t.status !== 'Completed').length} Active)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'map' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('map')}
          >
            <MapPin size={16} />
            GIS Catchment Map
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <CheckCircle2 size={16} />
            Completion Records & Audit
          </button>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => { fetchDashboardData(); onRefreshAll(); }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          Refresh Registry
        </button>
      </div>

      {/* TAB 1: Prioritized Drains Registry */}
      {activeTab === 'drains' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">
                <Gauge size={20} color="#0ea5e9" />
                Drainage Infrastructure Maintenance Prioritization Registry
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Ranked by deterministic multi-factor maintenance score. Click any asset to inspect individual evidence breakdown.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setTaskModalDrain(drains[0] || null);
                setTaskModalSourceReport(null);
              }}
            >
              <Wrench size={14} />
              Dispatch Maintenance Task
            </button>
          </div>

          <div className="filter-bar">
            <div className="search-input">
              <input
                type="text"
                placeholder="Search by code (e.g. DRN-001), name, or type..."
                value={drainSearch}
                onChange={(e) => setDrainSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              <option value="all">All Zones</option>
              <option value="Central Market">Central Market</option>
              <option value="North Industrial Basin">North Industrial Basin</option>
              <option value="Riverfront Esplanade">Riverfront Esplanade</option>
              <option value="Southern Residential">Southern Residential</option>
              <option value="Westside IT Corridor">Westside IT Corridor</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Operational Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Degraded">Degraded</option>
              <option value="Blocked">Blocked</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>

            <select value={prioFilter} onChange={(e) => setPrioFilter(e.target.value)}>
              <option value="all">All Priority Tiers</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Moderate">Moderate Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Infrastructure Asset</th>
                  <th>Zone & Type</th>
                  <th>Current Status</th>
                  <th>Waterlogging Risk History</th>
                  <th>Last Inspection</th>
                  <th>Prioritization Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrains.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {d.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                        {d.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {d.dimensions} • Depth: {d.depth_m}m
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{d.zone}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{d.drain_type}</div>
                    </td>
                    <td>
                      <span className={`badge badge-status ${d.current_status.toLowerCase().replace(' ', '-')}`}>
                        {d.current_status}
                      </span>
                    </td>
                    <td>
                      {d.has_waterlogging_history ? (
                        <span className={`badge badge-prio-${d.waterlogging_severity.toLowerCase()}`}>
                          {d.waterlogging_severity} History
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None recorded</span>
                      )}
                    </td>
                    <td>
                      {d.last_inspection_date ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {d.last_inspection_date}
                        </div>
                      ) : (
                        <span className="badge badge-prio-critical" style={{ fontSize: '0.68rem' }}>
                          UNKNOWN (NEEDS INSPECTION)
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge badge-prio-${d.priority_tier?.toLowerCase()}`}>
                          {d.priority_tier}
                        </span>
                        <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {d.risk_score} / 90
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedDrainForDetail(d.id)}
                          title="Inspect deterministic risk breakdown"
                        >
                          <Gauge size={13} />
                          Explain
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setTaskModalDrain(d);
                            setTaskModalSourceReport(null);
                          }}
                          title="Assign maintenance crew"
                        >
                          <Wrench size={13} />
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Citizen Reports Verification Queue */}
      {activeTab === 'reports' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">
                <Clock size={20} color="#f59e0b" />
                Civilian Reports & Incident Verification Queue
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Review incoming civilian drainage complaints. Verified reports feed directly into asset risk scoring and work order generation.
              </p>
            </div>
          </div>

          <div className="filter-bar">
            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value as any)}
            >
              <option value="all">All Verification Statuses</option>
              <option value="Submitted">Pending Verification (Unreviewed)</option>
              <option value="Verified">Verified by Officer</option>
              <option value="Resolved">Resolved / Cleared</option>
            </select>

            <select
              value={reportGenuineFilter}
              onChange={(e) => setReportGenuineFilter(e.target.value as any)}
            >
              <option value="all">All Submissions</option>
              <option value="genuine">Genuine Demo Interactions Only</option>
              <option value="simulated">Simulated Demo Reports Only</option>
            </select>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Ref</th>
                  <th>Origin & Category</th>
                  <th>Severity</th>
                  <th>Citizen Field Narrative</th>
                  <th>Target Drain</th>
                  <th>Verification State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {r.id}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.84rem' }}>
                        {r.category}
                      </div>
                      {r.is_simulated ? (
                        <span className="badge badge-simulated" style={{ fontSize: '0.62rem', marginTop: 2 }}>
                          SIMULATED DEMO DATA
                        </span>
                      ) : (
                        <span className="badge badge-genuine" style={{ fontSize: '0.62rem', marginTop: 2 }}>
                          GENUINE INTERACTION
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-prio-${r.severity.toLowerCase()}`}>
                        {r.severity}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.82rem' }}>
                        {r.location_description}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        "{r.description}"
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Reporter: {r.reporter_name} ({r.reporter_phone || 'No phone'})
                      </div>
                    </td>
                    <td>
                      {r.drain_code ? (
                        <div>
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>{r.drain_code}</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.drain_name}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#f59e0b', fontSize: '0.78rem' }}>Unmapped</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-status ${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                      {r.verification_notes && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {r.verification_notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setReportToVerify(r)}
                        >
                          <ShieldAlert size={13} />
                          Verify / Review
                        </button>
                        {r.status === 'Verified' && r.drain_id && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              const matchDrain = drains.find(d => d.id === r.drain_id);
                              if (matchDrain) {
                                setTaskModalDrain(matchDrain);
                                setTaskModalSourceReport(r.id);
                              }
                            }}
                          >
                            <Wrench size={13} />
                            Dispatch Task
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Maintenance Tasks & Work Orders */}
      {activeTab === 'tasks' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">
                <Wrench size={20} color="#0ea5e9" />
                Municipal Maintenance Dispatch & Work Orders
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Active crew operations. Complete tasks to record physical silt extraction and return drains to operational readiness.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setTaskModalDrain(drains[0] || null);
                setTaskModalSourceReport(null);
              }}
            >
              <Wrench size={14} />
              New Work Order
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Work Order Details</th>
                  <th>Target Drain</th>
                  <th>Assigned Crew</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {t.id}
                      </span>
                      {t.source_report_id && (
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                          Ref: {t.source_report_id}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {t.description}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#38bdf8' }}>{t.drain_code}</span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{t.drain_name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {t.assigned_crew}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Est: {t.estimated_duration_hours || 4} hrs
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-prio-${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>{t.due_date}</td>
                    <td>
                      <span className={`badge badge-status ${t.status.toLowerCase().replace(' ', '-')}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      {t.status !== 'Completed' ? (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => setTaskToComplete(t)}
                        >
                          <CheckCircle2 size={13} />
                          Sign-off Completion
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                          ✓ Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GIS Spatial Map */}
      {activeTab === 'map' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">
                <MapPin size={20} color="#0ea5e9" />
                Metropolitan Spatial Catchment GIS
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Interactive spatial projection of all 30 drainage assets across the 5 municipal zones.
              </p>
            </div>
          </div>

          <SpatialDrainMap
            drains={drains}
            onSelectDrain={(d) => setSelectedDrainForDetail(d.id)}
            selectedDrainId={selectedDrainForDetail}
          />
        </div>
      )}

      {/* TAB 5: Completion Records & Audit Trail */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="section-title">
                  <CheckCircle2 size={20} color="#10b981" />
                  Recorded Maintenance Sign-offs & Waste Cleared Log
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Auditable history of physical field actions, suction volumes, and post-clearing certifications.
                </p>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Record Ref</th>
                    <th>Task Ref & Target Drain</th>
                    <th>Completion Date</th>
                    <th>Crew Foreman</th>
                    <th>Physical Actions Undertaken</th>
                    <th>Waste Cleared</th>
                    <th>Post Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                          {rec.id}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>{rec.drain_code}</span>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{rec.task_id}</div>
                      </td>
                      <td>{rec.completion_date}</td>
                      <td>{rec.completed_by}</td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{rec.actions_taken}</div>
                        {rec.notes && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Notes: {rec.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.92rem' }}>
                          {rec.waste_removed_kg} kg
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-prio-low">
                          {rec.post_condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="section-title">
                  <ShieldAlert size={20} color="#0ea5e9" />
                  Municipal Governance Audit Trail
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Immutable log of system initialization, civilian submissions, officer verifications, and task completions.
                </p>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Actor</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{a.id}</td>
                      <td style={{ fontSize: '0.78rem' }}>{new Date(a.timestamp).toLocaleString()}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {a.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{a.entity_type}</span>: {a.entity_id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.actor_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Role: {a.actor_role}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', maxWidth: 320 }}>{a.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {selectedDrainForDetail && (
        <DrainDetailModal
          drainId={selectedDrainForDetail}
          onClose={() => setSelectedDrainForDetail(null)}
          onAssignTask={(drain) => {
            setSelectedDrainForDetail(null);
            setTaskModalDrain(drain);
            setTaskModalSourceReport(null);
          }}
        />
      )}

      {taskModalDrain && (
        <CreateTaskModal
          initialDrain={taskModalDrain}
          sourceReportId={taskModalSourceReport}
          drains={drains}
          onClose={() => {
            setTaskModalDrain(null);
            setTaskModalSourceReport(null);
          }}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {taskToComplete && (
        <CompleteTaskModal
          task={taskToComplete}
          onClose={() => setTaskToComplete(null)}
          onTaskCompleted={handleTaskCompleted}
        />
      )}

      {reportToVerify && (
        <VerifyReportModal
          report={reportToVerify}
          drains={drains}
          onClose={() => setReportToVerify(null)}
          onReportVerified={handleReportVerified}
          onDispatchTask={(drain, repId) => {
            setTaskModalDrain(drain);
            setTaskModalSourceReport(repId);
          }}
        />
      )}
    </div>
  );
};
