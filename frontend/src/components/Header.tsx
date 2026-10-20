import React from 'react';
import { Waves, ShieldAlert, UserCheck, Activity } from 'lucide-react';

interface HeaderProps {
  currentRole: 'civilian' | 'officer';
  onRoleChange: (role: 'civilian' | 'officer') => void;
  systemHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentRole, onRoleChange, systemHealthy }) => {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon">
          <Waves size={24} color="#ffffff" />
        </div>
        <div>
          <h1 className="brand-title">DrainPulse</h1>
          <p className="brand-subtitle">Drainage Maintenance Intelligence Platform</p>
        </div>
      </div>

      <div className="role-switcher-container">
        <div className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: systemHealthy ? '#34d399' : '#f87171', border: '1px solid var(--border-subtle)' }}>
          <Activity size={12} />
          {systemHealthy ? 'API Active' : 'API Connecting...'}
        </div>

        <div className="role-switcher" role="radiogroup" aria-label="Role Switcher">
          <button
            type="button"
            className={`role-tab ${currentRole === 'civilian' ? 'active' : ''}`}
            onClick={() => onRoleChange('civilian')}
            aria-checked={currentRole === 'civilian'}
            role="radio"
          >
            <UserCheck size={16} />
            Civilian Portal
          </button>
          <button
            type="button"
            className={`role-tab ${currentRole === 'officer' ? 'active' : ''}`}
            onClick={() => onRoleChange('officer')}
            aria-checked={currentRole === 'officer'}
            role="radio"
          >
            <ShieldAlert size={16} />
            Officer Operations
          </button>
        </div>
      </div>
    </header>
  );
};
