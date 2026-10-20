import React, { useState } from 'react';
import { Navigation } from 'lucide-react';
import type { Drain } from '../types';

interface SpatialDrainMapProps {
  drains: Drain[];
  onSelectDrain: (drain: Drain) => void;
  selectedDrainId?: string | null;
}

export const SpatialDrainMap: React.FC<SpatialDrainMapProps> = ({ drains, onSelectDrain, selectedDrainId }) => {
  const [hoveredDrain, setHoveredDrain] = useState<Drain | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('all');

  const zones = ['Central Market', 'North Industrial Basin', 'Riverfront Esplanade', 'Southern Residential', 'Westside IT Corridor'];

  // Normalize lat/long to SVG canvas coordinates (800 x 500)
  // Latitude ranges approx 13.064 to 13.098
  // Longitude ranges approx 80.260 to 80.290
  const minLat = 13.0630;
  const maxLat = 13.0990;
  const minLng = 80.2590;
  const maxLng = 80.2910;

  const toSvgX = (lng: number) => {
    return Math.max(40, Math.min(760, ((lng - minLng) / (maxLng - minLng)) * 720 + 40));
  };

  const toSvgY = (lat: number) => {
    // Invert Y because latitude increases northward
    return Math.max(40, Math.min(460, (1 - (lat - minLat) / (maxLat - minLat)) * 420 + 40));
  };

  const getPriorityColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'critical': return '#f43f5e';
      case 'high': return '#f59e0b';
      case 'moderate': return '#0ea5e9';
      default: return '#10b981';
    }
  };

  const filteredDrains = selectedZone === 'all' ? drains : drains.filter((d) => d.zone === selectedZone);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
      {/* Map Control Bar */}
      <div style={{ padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Navigation size={16} color="#0ea5e9" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Metropolitan Drainage Catchment Topology
          </span>
          <span className="badge badge-simulated" style={{ fontSize: '0.65rem' }}>
            GIS COORDINATES
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <option value="all">All 5 Municipal Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div style={{ width: '100%', height: '520px', background: '#090d16', position: 'relative', overflow: 'hidden' }}>
        <svg
          viewBox="0 0 800 500"
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-label="Drainage GIS Spatial Map"
        >
          {/* Subtle Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(14, 165, 233, 0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />
          <circle cx="400" cy="250" r="320" fill="url(#hubGlow)" />

          {/* Major simulated drainage trunks / water corridors connecting stations */}
          <path
            d="M 120 420 Q 300 380 400 250 T 680 120"
            fill="none"
            stroke="rgba(14, 165, 233, 0.15)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 220 100 Q 380 180 400 250 T 620 420"
            fill="none"
            stroke="rgba(6, 182, 212, 0.12)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Zone Region Labels */}
          <text x="240" y="80" fill="rgba(255,255,255,0.2)" fontSize="12" fontWeight="700" letterSpacing="2">
            NORTH INDUSTRIAL BASIN
          </text>
          <text x="400" y="220" fill="rgba(255,255,255,0.25)" fontSize="13" fontWeight="800" letterSpacing="2">
            CENTRAL MARKET DISTRICT
          </text>
          <text x="560" y="380" fill="rgba(255,255,255,0.2)" fontSize="12" fontWeight="700" letterSpacing="2">
            WESTSIDE IT CORRIDOR
          </text>
          <text x="140" y="360" fill="rgba(255,255,255,0.2)" fontSize="12" fontWeight="700" letterSpacing="2">
            SOUTHERN RESIDENTIAL
          </text>
          <text x="600" y="80" fill="rgba(255,255,255,0.2)" fontSize="12" fontWeight="700" letterSpacing="2">
            RIVERFRONT ESPLANADE
          </text>

          {/* Drain Nodes */}
          {filteredDrains.map((drain) => {
            const cx = toSvgX(drain.longitude);
            const cy = toSvgY(drain.latitude);
            const color = getPriorityColor(drain.priority_tier);
            const isSelected = drain.id === selectedDrainId;
            const isHovered = drain.id === hoveredDrain?.id;

            return (
              <g
                key={drain.id}
                onClick={() => onSelectDrain(drain)}
                onMouseEnter={() => setHoveredDrain(drain)}
                onMouseLeave={() => setHoveredDrain(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse Ring for Critical and High Drains */}
                {(drain.priority_tier === 'Critical' || drain.priority_tier === 'High') && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 18 : 14}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    opacity={isHovered ? 0.8 : 0.4}
                  >
                    <animate
                      attributeName="r"
                      values="10;22;10"
                      dur={drain.priority_tier === 'Critical' ? '1.8s' : '2.8s'}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.1;0.6"
                      dur={drain.priority_tier === 'Critical' ? '1.8s' : '2.8s'}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node Outer Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 10 : (isHovered ? 8 : 6.5)}
                  fill="#0b1120"
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                />

                {/* Node Core */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 5 : 3.5}
                  fill={color}
                />

                {/* Drain Code Label */}
                <text
                  x={cx}
                  y={cy + 16}
                  fill={isHovered || isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)'}
                  fontSize={isHovered ? "11" : "9.5"}
                  fontWeight={isHovered || isSelected ? "700" : "500"}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {drain.code}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredDrain && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              maxWidth: 320,
              boxShadow: 'var(--shadow-lg)',
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {hoveredDrain.code}
              </span>
              <span className={`badge badge-prio-${hoveredDrain.priority_tier?.toLowerCase()}`}>
                {hoveredDrain.priority_tier} ({hoveredDrain.risk_score} pts)
              </span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
              {hoveredDrain.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Zone: {hoveredDrain.zone} • {hoveredDrain.drain_type}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Click node to view full explainable risk breakdown & dispatch crew.
            </div>
          </div>
        )}

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>Risk Priority Tiers</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f43f5e' }} />
            <span>Critical (&ge; 65 pts)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b' }} />
            <span>High (45 - 64 pts)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#0ea5e9' }} />
            <span>Moderate (25 - 44 pts)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
            <span>Low (0 - 24 pts)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
