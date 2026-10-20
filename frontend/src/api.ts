import type {
  Drain, Report, Inspection, MaintenanceTask,
  MaintenanceRecord, AuditEvent, DashboardStats, RiskAssessment
} from './types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (${res.status} ${res.statusText})`;
    try {
      const data = await res.json();
      if (data && data.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // not json
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getHealth(): Promise<{ status: string; service: string; drain_assets_registered: number }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse<DashboardStats>(res);
  },

  async getDrains(params?: { zone?: string; status?: string; criticality?: string; sort_by_risk?: boolean }): Promise<Drain[]> {
    const query = new URLSearchParams();
    if (params?.zone) query.append('zone', params.zone);
    if (params?.status) query.append('status', params.status);
    if (params?.criticality) query.append('criticality', params.criticality);
    if (params?.sort_by_risk) query.append('sort_by_risk', 'true');
    const res = await fetch(`${API_BASE}/drains?${query.toString()}`);
    return handleResponse<Drain[]>(res);
  },

  async getDrainDetail(drainId: string): Promise<Drain & {
    risk_assessment: RiskAssessment;
    inspections: Inspection[];
    reports: Report[];
    tasks: MaintenanceTask[];
    maintenance_history: MaintenanceRecord[];
  }> {
    const res = await fetch(`${API_BASE}/drains/${encodeURIComponent(drainId)}`);
    return handleResponse(res);
  },

  async getDrainRisk(drainId: string): Promise<RiskAssessment> {
    const res = await fetch(`${API_BASE}/drains/${encodeURIComponent(drainId)}/risk`);
    return handleResponse<RiskAssessment>(res);
  },

  async getReports(params?: { status?: string; severity?: string; drain_id?: string; is_simulated?: number }): Promise<Report[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.drain_id) query.append('drain_id', params.drain_id);
    if (params?.is_simulated !== undefined) query.append('is_simulated', String(params.is_simulated));
    const res = await fetch(`${API_BASE}/reports?${query.toString()}`);
    return handleResponse<Report[]>(res);
  },

  async createReport(payload: {
    drain_id?: string | null;
    reporter_name: string;
    reporter_phone?: string;
    reporter_email?: string;
    category: string;
    severity: string;
    description: string;
    location_description: string;
    latitude?: number;
    longitude?: number;
    photo_url?: string;
  }): Promise<Report> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Report>(res);
  },

  async verifyReport(reportId: string, payload: {
    status: 'Verified' | 'Rejected' | 'Resolved';
    verification_notes: string;
    verified_by: string;
    target_drain_id?: string;
  }): Promise<Report> {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Report>(res);
  },

  async getTasks(params?: { status?: string; priority?: string; drain_id?: string }): Promise<MaintenanceTask[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.drain_id) query.append('drain_id', params.drain_id);
    const res = await fetch(`${API_BASE}/tasks?${query.toString()}`);
    return handleResponse<MaintenanceTask[]>(res);
  },

  async createTask(payload: {
    drain_id: string;
    source_report_id?: string | null;
    title: string;
    description: string;
    priority: string;
    assigned_crew: string;
    due_date: string;
    estimated_duration_hours?: number;
  }): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<MaintenanceTask>(res);
  },

  async completeTask(taskId: string, payload: {
    completed_by: string;
    completion_date: string;
    actions_taken: string;
    waste_removed_kg: number;
    post_condition: 'Cleared' | 'Repaired' | 'Re-inspection Required';
    notes?: string;
  }): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<MaintenanceTask>(res);
  },

  async getMaintenanceRecords(drainId?: string): Promise<MaintenanceRecord[]> {
    const query = drainId ? `?drain_id=${encodeURIComponent(drainId)}` : '';
    const res = await fetch(`${API_BASE}/maintenance-records${query}`);
    return handleResponse<MaintenanceRecord[]>(res);
  },

  async getInspections(drainId?: string): Promise<Inspection[]> {
    const query = drainId ? `?drain_id=${encodeURIComponent(drainId)}` : '';
    const res = await fetch(`${API_BASE}/inspections${query}`);
    return handleResponse<Inspection[]>(res);
  },

  async updateTaskStatus(taskId: string, status: 'Scheduled' | 'In Progress' | 'Cancelled', notes?: string): Promise<MaintenanceTask> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse<MaintenanceTask>(res);
  },

  async createInspection(payload: {
    drain_id: string;
    inspector_name: string;
    inspection_date: string;
    blockage_percentage: number;
    structural_condition: 'Good' | 'Fair' | 'Poor' | 'Failing';
    silt_depth_cm: number;
    flow_rate_estimate: 'Normal' | 'Sluggish' | 'Stagnant' | 'Backflow';
    notes?: string;
  }): Promise<{ message: string; inspection_id: string }> {
    const res = await fetch(`${API_BASE}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getReport(reportId: string): Promise<Report> {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}`);
    return handleResponse<Report>(res);
  },

  async getAuditEvents(limit = 40): Promise<AuditEvent[]> {
    const res = await fetch(`${API_BASE}/audit-events?limit=${limit}`);
    return handleResponse<AuditEvent[]>(res);
  }
};
