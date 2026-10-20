import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DemoBanner } from './components/DemoBanner';
import { CivilianPortal } from './components/CivilianPortal';
import { OfficerDashboard } from './components/OfficerDashboard';
import { LandingPage } from './components/LandingPage';
import { api } from './api';
import type { Drain, DashboardStats } from './types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Parse initial route and role from browser URL
  const getInitialRoute = (): { path: string; role: 'civilian' | 'officer' } => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    const roleParam = searchParams.get('role');
    const initialRole: 'civilian' | 'officer' = roleParam === 'civilian' ? 'civilian' : 'officer';

    if (pathname === '/app' || pathname.startsWith('/app') || hash.includes('/app')) {
      return { path: '/app', role: initialRole };
    }
    return { path: '/', role: initialRole };
  };

  const initial = getInitialRoute();
  const [currentPath, setCurrentPath] = useState<string>(initial.path);
  const [currentRole, setCurrentRole] = useState<'civilian' | 'officer'>(initial.role);
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

  // Listen to popstate for browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const { path, role } = getInitialRoute();
      setCurrentPath(path);
      setCurrentRole(role);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation handlers
  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToApp = (role: 'civilian' | 'officer') => {
    window.history.pushState({}, '', `/app?role=${role}`);
    setCurrentPath('/app');
    setCurrentRole(role);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoleChange = (role: 'civilian' | 'officer') => {
    setCurrentRole(role);
    window.history.replaceState({}, '', `/app?role=${role}`);
  };

  // If on landing page route '/'
  if (currentPath === '/' || currentPath === '') {
    return (
      <LandingPage
        onNavigateToApp={navigateToApp}
        stats={stats}
        drains={drains}
      />
    );
  }

  // Otherwise render the App at '/app'
  return (
    <div className="app-container">
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        systemHealthy={systemHealthy}
        onNavigateToLanding={navigateToLanding}
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
        <div className="card" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center', borderColor: 'var(--border-medium)', background: 'var(--bg-surface)' }}>
          <AlertTriangle size={42} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8, color: 'var(--danger)' }}>
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
