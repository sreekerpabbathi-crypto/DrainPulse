import { Database, ShieldAlert } from 'lucide-react';

interface DemoBannerProps {
  stats?: {
    simulated_count: number;
    genuine_civilian_count: number;
  };
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ stats }) => {
  return (
    <aside className="demo-banner" aria-label="Simulation notice">
      <div className="demo-banner-left">
        <span className="badge badge-simulated">
          <Database size={12} />
          SIMULATED DEMO DATA
        </span>
        <span>
          Baseline seed: 30 drain assets, 45 reports & 20 tasks.
          {stats && stats.genuine_civilian_count > 0 ? (
            <strong style={{ color: '#16a34a', marginLeft: 8 }}>
              ({stats.genuine_civilian_count} genuine user interaction{stats.genuine_civilian_count > 1 ? 's' : ''} recorded)
            </strong>
          ) : (
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
              New submissions persist separately as genuine demo interactions.
            </span>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={14} />
        <span>Role switch is for demo evaluation only (not production access control).</span>
      </div>
    </aside>
  );
};
