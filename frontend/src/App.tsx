import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DemoBanner } from './components/DemoBanner';
import { CivilianPortal } from './components/CivilianPortal';
import { OfficerDashboard } from './components/OfficerDashboard';
import { api } from './api';
import type { Drain, DashboardStats } from './types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<'civilian' | 'officer'>('officer');
  const [systemHealthy, setSystemHealthy] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [drains, setDrains] = useState<Drain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify health
      const health = await api.getHealth();
      setSystemHealthy(health.status === 'healthy');

      // Fetch stats and drains (sorted by live risk score)
      const [statsData, drainsData] = await Promise.all([
        api.getStats(),
        api.getDrains({ sort_by_risk: true })
      ]);

      setStats(statsData);
      setDrains(drainsData);
    } catch (err: any) {
      console.error('Failed to connect to DrainPulse API:', err);
      setError(err.message || 'Unable to connect to DrainPulse backend service on http://127.0.0.1:8000.');
      setSystemHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
    // Heartbeat poll every 45s
    const timer = setInterval(() => {
      api.getHealth()
        .then(() => setSystemHealthy(true))
        .catch(() => setSystemHealthy(false));
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-container">
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        systemHealthy={systemHealthy}
      />

      <DemoBanner
        stats={stats ? {
          simulated_count: stats.reports.simulated_count,
          genuine_civilian_count: stats.reports.genuine_civilian_count
        } : undefined}
      />

      {loading && !drains.length ? (
        <div className="state-container" style={{ minHeight: '50vh' }}>
          <div className="spinner" />
          <h2 className="state-title">Connecting to DrainPulse Intelligence Service</h2>
          <p className="state-desc">
            Initializing relational SQLite engine, validating 30 asset telemetry records, and compiling deterministic risk weights...
          </p>
        </div>
      ) : error ? (
        <div className="card" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center', borderColor: '#f43f5e' }}>
          <AlertTriangle size={42} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8, color: '#fda4af' }}>
            Backend API Disconnected
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>
            {error}
          </p>
          <div style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20, textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
            Start the FastAPI backend with:<br />
            <strong>python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000</strong>
          </div>
          <button type="button" className="btn btn-primary" onClick={fetchAppData}>
            <RefreshCw size={15} />
            Retry Connection
          </button>
        </div>
      ) : (
        <main>
          {currentRole === 'civilian' ? (
            <CivilianPortal
              drains={drains}
              onReportCreated={fetchAppData}
            />
          ) : (
            <OfficerDashboard
              stats={stats}
              drains={drains}
              onRefreshAll={fetchAppData}
            />
          )}
        </main>
      )}
    </div>
  );
};

export default App;
