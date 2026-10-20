export interface Drain {
  id: string;
  code: string;
  name: string;
  zone: string;
  drain_type: string;
  dimensions: string;
  depth_m: number;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  latitude: number;
  longitude: number;
  installation_year: number;
  has_waterlogging_history: number;
  waterlogging_severity: string;
  last_inspection_date: string | null;
  current_status: 'Operational' | 'Degraded' | 'Blocked' | 'Under Maintenance';
  is_simulated: number;
  created_at: string;
  risk_score?: number;
  priority_tier?: 'Critical' | 'High' | 'Moderate' | 'Low';
  risk_factors_summary?: Record<string, number>;
}

export interface RiskFactor {
  name: string;
  score: number;
  max_score: number;
  weight_label: string;
  evidence: string;
  status: 'Nominal' | 'Warning' | 'Critical' | 'Excluded';
  active_reports_count?: number;
  historical_severity?: string;
  inspection_status?: string;
  field_status?: string;
  is_excluded?: boolean;
}

export interface RiskAssessment {
  drain_id: string;
  drain_code: string;
  drain_name: string;
  calculated_at: string;
  total_score: number;
  max_possible_score: number;
  normalized_percentage: number;
  priority_tier: 'Critical' | 'High' | 'Moderate' | 'Low';
  disclaimer: string;
  factors: RiskFactor[];
}

export interface Inspection {
  id: string;
  drain_id: string;
  drain_code?: string;
  drain_name?: string;
  drain_zone?: string;
  inspector_name: string;
  inspection_date: string;
  blockage_percentage: number;
  structural_condition: 'Good' | 'Fair' | 'Poor' | 'Failing';
  silt_depth_cm: number;
  flow_rate_estimate: 'Normal' | 'Sluggish' | 'Stagnant' | 'Backflow';
  notes: string | null;
  is_simulated: number;
  created_at: string;
}

export interface Report {
  id: string;
  drain_id: string | null;
  drain_code?: string;
  drain_name?: string;
  drain_zone?: string;
  reporter_name: string;
  reporter_phone: string | null;
  reporter_email: string | null;
  reporter_type: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  location_description: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  status: 'Submitted' | 'Verified' | 'Rejected' | 'Resolved';
  verification_notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  is_simulated: number;
  created_at: string;
}

export interface MaintenanceTask {
  id: string;
  drain_id: string;
  drain_code?: string;
  drain_name?: string;
  drain_zone?: string;
  source_report_id: string | null;
  report_category?: string;
  report_description?: string;
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  assigned_crew: string;
  due_date: string;
  estimated_duration_hours: number | null;
  is_simulated: number;
  created_at: string;
  completed_at: string | null;
  completion_records?: MaintenanceRecord[];
}

export interface MaintenanceRecord {
  id: string;
  task_id: string;
  drain_id: string;
  drain_code?: string;
  drain_name?: string;
  drain_zone?: string;
  task_title?: string;
  task_priority?: string;
  completed_by: string;
  completion_date: string;
  actions_taken: string;
  waste_removed_kg: number;
  post_condition: 'Cleared' | 'Repaired' | 'Re-inspection Required';
  notes: string | null;
  is_simulated: number;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_role: string;
  actor_name: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  drains: {
    total: number;
    degraded_or_blocked: number;
    operational: number;
  };
  reports: {
    total: number;
    pending_verification: number;
    verified: number;
    genuine_civilian_count: number;
    simulated_count: number;
  };
  maintenance: {
    total_tasks: number;
    active_tasks: number;
    completed_tasks: number;
    total_waste_removed_kg: number;
  };
}
