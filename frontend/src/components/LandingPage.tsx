import React, { useState } from 'react';
import {
  ArrowRight, ShieldCheck, Layers, MapPin, Wrench,
  CheckCircle2, FileText, AlertTriangle, ExternalLink,
  Menu, X
} from 'lucide-react';
import type { Drain, DashboardStats } from '../types';

interface LandingPageProps {
  onNavigateToApp: (role: 'civilian' | 'officer') => void;
  stats: DashboardStats | null;
  drains: Drain[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToApp, stats, drains }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const topDrains = drains.slice(0, 3);

  return (
    <div className="landing-page">
      {/* Top Navigation */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <div className="brand-section" style={{ cursor: 'pointer' }} onClick={() => scrollToSection('hero')}>
            <div className="brand-icon">
              <img src="/logo-icon.png" alt="DrainPulse Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <span className="brand-title" style={{ fontSize: '20px' }}>DrainPulse</span>
              <span className="brand-subtitle" style={{ display: 'block', fontSize: '11px' }}>Municipal Intelligence</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('hero')}>
              Home
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('platform')}>
              Platform
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('how-it-works')}>
              How It Works
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('benefits')}>
              Impact
            </button>
          </nav>

          {/* Nav Actions */}
          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateToApp('officer')}
            >
              Open Dashboard
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigateToApp('civilian')}
            >
              Report an Issue
            </button>
            <button
              type="button"
              className="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <button type="button" className="landing-mobile-link" onClick={() => scrollToSection('hero')}>
              Home
            </button>
            <button type="button" className="landing-mobile-link" onClick={() => scrollToSection('platform')}>
              Platform
            </button>
            <button type="button" className="landing-mobile-link" onClick={() => scrollToSection('how-it-works')}>
              How It Works
            </button>
            <button type="button" className="landing-mobile-link" onClick={() => scrollToSection('benefits')}>
              Impact
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigateToApp('civilian')}
              >
                Report an Issue
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigateToApp('officer')}
              >
                Open Dashboard
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="hero" className="landing-hero-section">
        <div className="landing-hero-grid">
          <div className="landing-hero-content">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-dot" />
              SMARTER DRAINAGE. CLEANER COMMUNITIES.
            </div>

            <h1 className="landing-hero-title">
              Every Drain Matters.<br />
              Every Report Moves Us Forward.
            </h1>

            <p className="landing-hero-subtitle">
              DrainPulse connects citizen reporting with municipal drainage intelligence—helping teams review complaints, prioritize drainage assets, coordinate maintenance, and track work from report to resolution.
            </p>

            <div className="landing-hero-cta-row">
              <button
                type="button"
                className="btn btn-primary landing-btn-lg"
                onClick={() => onNavigateToApp('civilian')}
              >
                Report a Drainage Issue
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="btn btn-secondary landing-btn-lg"
                onClick={() => onNavigateToApp('officer')}
              >
                Explore the Platform
                <ExternalLink size={15} />
              </button>
            </div>

            <div className="landing-hero-demo-notice">
              <ShieldCheck size={14} color="#16a34a" />
              <span>
                Demonstration platform • 30 simulated baseline assets • Genuine user interactions persist
              </span>
            </div>
          </div>

          {/* Hero Visual: Live Product Snapshot */}
          <div className="landing-hero-visual">
            <div className="landing-preview-card">
              <div className="landing-preview-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="brand-icon" style={{ width: 28, height: 28, borderRadius: 6 }}>
                    <img src="/logo-icon.png" alt="DrainPulse" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    Drainage Asset Intelligence Snapshot
                  </span>
                </div>
                <span className="badge badge-simulated" style={{ fontSize: '10px' }}>
                  GIS TOPOLOGY
                </span>
              </div>

              {/* Mini Metrics Row */}
              <div className="landing-preview-metrics">
                <div className="landing-preview-metric-box">
                  <span className="landing-preview-metric-label">Monitored Assets</span>
                  <span className="landing-preview-metric-value">{stats?.drains.total || 30}</span>
                  <span className="landing-preview-metric-sub" style={{ color: '#16a34a' }}>
                    {stats?.drains.operational ?? 18} Operational
                  </span>
                </div>
                <div className="landing-preview-metric-box">
                  <span className="landing-preview-metric-label">Pending Verification</span>
                  <span className="landing-preview-metric-value">{stats?.reports.pending_verification ?? 14}</span>
                  <span className="landing-preview-metric-sub" style={{ color: '#d97706' }}>
                    Citizen Reports
                  </span>
                </div>
                <div className="landing-preview-metric-box">
                  <span className="landing-preview-metric-label">Solid Waste Cleared</span>
                  <span className="landing-preview-metric-value" style={{ color: '#16a34a' }}>
                    {stats?.maintenance.total_waste_removed_kg ? `${stats.maintenance.total_waste_removed_kg.toLocaleString()} kg` : '9,072 kg'}
                  </span>
                  <span className="landing-preview-metric-sub">
                    Channel Debris
                  </span>
                </div>
              </div>

              {/* Priority Drains Mini Preview */}
              <div className="landing-preview-drains-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    Prioritized Asset Queue
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                    Deterministic Scoring
                  </span>
                </div>

                <div className="landing-preview-drain-list">
                  {topDrains.length > 0 ? topDrains.map((d) => (
                    <div key={d.id} className="landing-preview-drain-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                          {d.code}
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {d.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {d.zone} • {d.current_status}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`badge badge-prio-${d.priority_tier?.toLowerCase()}`} style={{ fontSize: '11px' }}>
                          {d.priority_tier}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {d.risk_score} pts
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div className="landing-preview-drain-item">
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>DRN-003 • Chemical Works Runoff Canal</div>
                      <span className="badge badge-prio-critical">Critical (90 pts)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Footer CTA */}
              <div className="landing-preview-footer">
                <button
                  type="button"
                  className="landing-preview-explore-btn"
                  onClick={() => onNavigateToApp('officer')}
                >
                  <span>Launch Operations Center</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Capability Strip */}
      <section className="landing-capabilities-strip">
        <div className="landing-capabilities-grid">
          <div className="landing-capability-item">
            <div className="landing-capability-icon" style={{ background: '#EFF4FF', color: '#2563EB' }}>
              <FileText size={18} />
            </div>
            <div>
              <div className="landing-capability-title">Citizen Issue Reporting</div>
              <div className="landing-capability-desc">Public incident filing with unique tracking</div>
            </div>
          </div>

          <div className="landing-capability-item">
            <div className="landing-capability-icon" style={{ background: '#FEF3E2', color: '#D97706' }}>
              <Layers size={18} />
            </div>
            <div>
              <div className="landing-capability-title">Explainable Risk Prioritization</div>
              <div className="landing-capability-desc">Transparent multi-factor deterministic scoring</div>
            </div>
          </div>

          <div className="landing-capability-item">
            <div className="landing-capability-icon" style={{ background: '#EFF4FF', color: '#2563EB' }}>
              <MapPin size={18} />
            </div>
            <div>
              <div className="landing-capability-title">Spatial Drainage Mapping</div>
              <div className="landing-capability-desc">Topology projection across 5 municipal zones</div>
            </div>
          </div>

          <div className="landing-capability-item">
            <div className="landing-capability-icon" style={{ background: '#E8F7EE', color: '#16A34A' }}>
              <Wrench size={18} />
            </div>
            <div>
              <div className="landing-capability-title">Maintenance Tracking</div>
              <div className="landing-capability-desc">Work order dispatch & waste recovery sign-offs</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="platform" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">CORE CAPABILITIES</span>
          <h2 className="landing-section-title">From citizen reports to completed maintenance.</h2>
          <p className="landing-section-desc">
            Four integrated operational pillars connecting community reports directly with field engineering and accountable governance.
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon-box" style={{ background: '#EFF4FF', color: '#2563EB' }}>
              <FileText size={22} />
            </div>
            <h3 className="landing-feature-title">1. Citizen Reporting</h3>
            <p className="landing-feature-text">
              Submit drainage complaints, describe the issue, and receive a tracking reference.
            </p>
            <div className="landing-feature-tag">Civilian Portal</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-box" style={{ background: '#FEF3E2', color: '#D97706' }}>
              <Layers size={22} />
            </div>
            <h3 className="landing-feature-title">2. Risk-Based Prioritization</h3>
            <p className="landing-feature-text">
              Understand which drainage assets need attention using a transparent, deterministic scoring engine.
            </p>
            <div className="landing-feature-tag">Empirical Scoring</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-box" style={{ background: '#EFF4FF', color: '#2563EB' }}>
              <MapPin size={22} />
            </div>
            <h3 className="landing-feature-title">3. Spatial Asset Monitoring</h3>
            <p className="landing-feature-text">
              Explore drainage assets on an interactive map and inspect associated reports and conditions.
            </p>
            <div className="landing-feature-tag">GIS Topology</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-box" style={{ background: '#E8F7EE', color: '#16A34A' }}>
              <Wrench size={22} />
            </div>
            <h3 className="landing-feature-title">4. Maintenance Operations</h3>
            <p className="landing-feature-text">
              Track work orders, maintenance progress, completion records, and recovered waste.
            </p>
            <div className="landing-feature-tag">Crew Dispatch</div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="landing-section landing-section-alt">
        <div className="landing-section-header">
          <span className="landing-section-tag">STRUCTURED WORKFLOW</span>
          <h2 className="landing-section-title">How It Works</h2>
          <p className="landing-section-desc">
            A transparent four-stage operational cycle that turns citizen complaints into verified, documented physical channel clearing.
          </p>
        </div>

        <div className="landing-timeline-grid">
          <div className="landing-step-card">
            <div className="landing-step-badge">01</div>
            <h3 className="landing-step-title">Report</h3>
            <p className="landing-step-desc">
              A citizen submits a drainage issue with location description, incident category, and urgency level, immediately receiving an immutable tracking code.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-badge">02</div>
            <h3 className="landing-step-title">Review</h3>
            <p className="landing-step-desc">
              An officer reviews the report and associates it with a relevant drain when appropriate, logging field notes and triage observations.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-badge">03</div>
            <h3 className="landing-step-title">Prioritize & Dispatch</h3>
            <p className="landing-step-desc">
              Drain conditions, inspection records, and risk information help officers prioritize maintenance and coordinate work with targeted hydro-vac or desilting squads.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-badge">04</div>
            <h3 className="landing-step-title">Resolve & Record</h3>
            <p className="landing-step-desc">
              Maintenance progress, completion details, waste recovery (in kg), and audit history are recorded, returning the drain to verified operational status.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">SYSTEM IMPACT</span>
          <h2 className="landing-section-title">Better visibility. Smarter maintenance. Accountable action.</h2>
          <p className="landing-section-desc">
            Engineered to overcome disconnected spreadsheets and manual phone calls with auditable, data-grounded drainage operations.
          </p>
        </div>

        <div className="landing-benefits-grid">
          <div className="landing-benefit-card">
            <div className="landing-benefit-header">
              <CheckCircle2 size={20} color="#16a34a" />
              <h4>Clearer visibility into drainage assets</h4>
            </div>
            <p>
              Consolidate structural dimensions, GIS coordinates, catchment zones, and silt depth telemetry in one shared operational registry.
            </p>
          </div>

          <div className="landing-benefit-card">
            <div className="landing-benefit-header">
              <CheckCircle2 size={20} color="#16a34a" />
              <h4>Transparent maintenance prioritization</h4>
            </div>
            <p>
              Replace intuition-based scheduling with explainable, deterministic scoring that penalizes missing inspections and accounts for blockage severity.
            </p>
          </div>

          <div className="landing-benefit-card">
            <div className="landing-benefit-header">
              <CheckCircle2 size={20} color="#16a34a" />
              <h4>Better coordination between civilian reports and officer workflows</h4>
            </div>
            <p>
              Connect community street reports directly to specific drain culverts with end-to-end milestone progress tracking.
            </p>
          </div>

          <div className="landing-benefit-card">
            <div className="landing-benefit-header">
              <CheckCircle2 size={20} color="#16a34a" />
              <h4>Traceable inspections and maintenance history</h4>
            </div>
            <p>
              Every field inspection observation, crew work order, status transition, and kilogram of recovered silt is permanently written to the audit log.
            </p>
          </div>
        </div>

        {/* Discreet Demonstration Platform Notice */}
        <div className="landing-demo-disclaimer-box">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Demonstration platform</strong>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 4 }}>
                DrainPulse is an operational software prototype engineered for demonstration and evaluation. Baseline records (30 drains, 45 reports, 20 tasks) reflect a simulated municipal district. All user-submitted complaints, inspections, and task dispatches persist in real-time in the SQLite database. The platform operates independently without external weather APIs or speculative telemetry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="landing-final-cta-section">
        <div className="landing-final-cta-card">
          <h2 className="landing-final-cta-title">Help keep our drainage systems moving.</h2>
          <p className="landing-final-cta-desc">
            Report an issue or explore how DrainPulse organizes drainage maintenance.
          </p>

          <div className="landing-final-cta-buttons">
            <button
              type="button"
              className="btn btn-primary landing-btn-lg"
              onClick={() => onNavigateToApp('civilian')}
            >
              Submit a Report
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary landing-btn-lg"
              onClick={() => onNavigateToApp('officer')}
            >
              Open Operations Dashboard
              <ExternalLink size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-brand">
            <div className="brand-section">
              <div className="brand-icon">
                <img src="/logo-icon.png" alt="DrainPulse Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="brand-title" style={{ fontSize: '18px' }}>DrainPulse</span>
            </div>
            <p className="landing-footer-desc">
              Municipal Drainage Maintenance Intelligence Platform connecting citizen reporting with explainable risk prioritization and auditable field execution.
            </p>
            <div className="badge badge-simulated" style={{ marginTop: 12 }}>
              DEMONSTRATION PLATFORM
            </div>
          </div>

          <div className="landing-footer-links-group">
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Navigation</span>
              <button type="button" className="landing-footer-link" onClick={() => scrollToSection('hero')}>Home</button>
              <button type="button" className="landing-footer-link" onClick={() => scrollToSection('platform')}>Platform</button>
              <button type="button" className="landing-footer-link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
              <button type="button" className="landing-footer-link" onClick={() => scrollToSection('benefits')}>System Benefits</button>
            </div>

            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Applications</span>
              <button type="button" className="landing-footer-link" onClick={() => onNavigateToApp('civilian')}>
                Civilian Incident Portal
              </button>
              <button type="button" className="landing-footer-link" onClick={() => onNavigateToApp('officer')}>
                Officer Operations Center
              </button>
              <button type="button" className="landing-footer-link" onClick={() => onNavigateToApp('officer')}>
                GIS Spatial Catchment Map
              </button>
              <button type="button" className="landing-footer-link" onClick={() => onNavigateToApp('officer')}>
                Audit & Compliance Trail
              </button>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>&copy; {new Date().getFullYear()} DrainPulse • Municipal Drainage Maintenance Intelligence Platform</span>
          <span style={{ color: 'var(--text-secondary)' }}>Academic & Innovation Competition Prototype</span>
        </div>
      </footer>
    </div>
  );
};
