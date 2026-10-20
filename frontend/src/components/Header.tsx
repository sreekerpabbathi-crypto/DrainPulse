import React from 'react';
import { ShieldAlert, UserCheck, Activity, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentRole: 'civilian' | 'officer';
  onRoleChange: (role: 'civilian' | 'officer') => void;
  systemHealthy: boolean;
  onNavigateToLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRole, onRoleChange, systemHealthy, onNavigateToLanding }) => {
  return (
    <header className="navbar">
      <div
        className="brand-section"
        style={{ cursor: onNavigateToLanding ? 'pointer' : 'default' }}
        onClick={onNavigateToLanding}
        title={onNavigateToLanding ? "Back to DrainPulse Public Home" : undefined}
      >
        <div className="brand-icon">
          <img src="/logo-icon.png" alt="DrainPulse Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <h1 className="brand-title">DrainPulse</h1>
          <p className="brand-subtitle">Drainage Maintenance Intelligence Platform</p>
        </div>
      </div>

      <div className="role-switcher-container">
        {onNavigateToLanding && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onNavigateToLanding}
            style={{ fontSize: '12.5px', padding: '6px 14px', borderRadius: '8px' }}
            title="Return to Public Landing Page"
          >
            <ArrowLeft size={14} />
            Public Home
          </button>
        )}

        <div className="badge" style={{ background: systemHealthy ? '#E8F7EE' : '#FDECEC', color: systemHealthy ? '#16A34A' : '#DC2626', border: '1px solid transparent' }}>
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
