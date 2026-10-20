"""
DrainPulse FastAPI Application
Provides RESTful APIs for Civilian Reporting, Officer Verification,
Explainable Risk Prioritization, Task Assignment, and Maintenance History.
"""
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from backend.database import get_db_connection, init_db, is_database_seeded
from backend.seed_data import seed_database_if_empty
from backend.risk_engine import calculate_drain_risk
from backend.models import (
    ReportCreate, ReportVerifyRequest, TaskCreate,
    TaskCompleteRequest, TaskStatusUpdateRequest, InspectionCreate
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database schema is created and demo data is seeded if empty."""
    init_db()
    seed_database_if_empty()
    yield

app = FastAPI(
    title="DrainPulse API",
    description="Drainage Maintenance Intelligence Platform - Municipal Infrastructure Prioritization",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Health and System Overview
# -------------------------------------------------------------
@app.get("/api/health")
def get_health():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM drains;")
        drain_count = cursor.fetchone()["count"]
    return {
        "status": "healthy",
        "service": "DrainPulse Intelligence API",
        "database": "SQLite (Foreign Keys Active)",
        "drain_assets_registered": drain_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/stats")
def get_dashboard_stats():
    """
    Returns aggregated metrics for executive oversight.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Drain counts with truthful status breakdown
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN current_status = 'Operational' THEN 1 ELSE 0 END) as operational,
                SUM(CASE WHEN current_status = 'Under Maintenance' THEN 1 ELSE 0 END) as under_maintenance,
                SUM(CASE WHEN current_status = 'Degraded' THEN 1 ELSE 0 END) as degraded,
                SUM(CASE WHEN current_status = 'Blocked' THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN current_status IN ('Blocked', 'Degraded') THEN 1 ELSE 0 END) as degraded_or_blocked
            FROM drains;
        """)
        drain_counts = cursor.fetchone()
        total_drains = drain_counts["total"] or 0
        operational_drains = drain_counts["operational"] or 0
        under_maintenance_drains = drain_counts["under_maintenance"] or 0
        degraded_drains = drain_counts["degraded"] or 0
        blocked_drains = drain_counts["blocked"] or 0
        degraded_or_blocked = drain_counts["degraded_or_blocked"] or 0

        # Reports
        cursor.execute("SELECT COUNT(*) as total FROM reports;")
        total_reports = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as pending FROM reports WHERE status = 'Submitted';")
        pending_reports = cursor.fetchone()["pending"]

        cursor.execute("SELECT COUNT(*) as verified FROM reports WHERE status = 'Verified';")
        verified_reports = cursor.fetchone()["verified"]

        cursor.execute("SELECT COUNT(*) as genuine FROM reports WHERE is_simulated = 0;")
        genuine_reports = cursor.fetchone()["genuine"]

        # Tasks: Active tasks are Scheduled or In Progress only (Cancelled and Completed are inactive)
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('Scheduled', 'In Progress') THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM maintenance_tasks;
        """)
        task_row = cursor.fetchone()
        total_tasks = task_row["total"] or 0
        active_tasks = task_row["active"] or 0
        completed_tasks = task_row["completed"] or 0
        cancelled_tasks = task_row["cancelled"] or 0

        # Total waste removed
        cursor.execute("SELECT SUM(waste_removed_kg) as total_waste FROM maintenance_records;")
        waste_row = cursor.fetchone()
        total_waste_kg = waste_row["total_waste"] or 0.0

        return {
            "drains": {
                "total": total_drains,
                "operational": operational_drains,
                "under_maintenance": under_maintenance_drains,
                "degraded": degraded_drains,
                "blocked": blocked_drains,
                "degraded_or_blocked": degraded_or_blocked
            },
            "reports": {
                "total": total_reports,
                "pending_verification": pending_reports,
                "verified": verified_reports,
                "genuine_civilian_count": genuine_reports,
                "simulated_count": total_reports - genuine_reports
            },
            "maintenance": {
                "total_tasks": total_tasks,
                "active_tasks": active_tasks,
                "completed_tasks": completed_tasks,
                "cancelled_tasks": cancelled_tasks,
                "total_waste_removed_kg": round(total_waste_kg, 1)
            }
        }

# -------------------------------------------------------------
# Drains Endpoints
# -------------------------------------------------------------
@app.get("/api/drains")
def list_drains(
    zone: Optional[str] = None,
    status: Optional[str] = None,
    criticality: Optional[str] = None,
    sort_by_risk: bool = False
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM drains WHERE 1=1"
        params = []

        if zone:
            query += " AND zone = ?"
            params.append(zone)
        if status:
            query += " AND current_status = ?"
            params.append(status)
        if criticality:
            query += " AND criticality = ?"
            params.append(criticality)

        query += " ORDER BY code ASC;"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            drain_dict = dict(r)
            # Attach live calculated risk priority
            risk_info = calculate_drain_risk(drain_dict["id"], conn)
            drain_dict["risk_score"] = risk_info["total_score"]
            drain_dict["priority_tier"] = risk_info["priority_tier"]
            drain_dict["risk_factors_summary"] = {f["name"]: f["score"] for f in risk_info["factors"]}
            results.append(drain_dict)

        if sort_by_risk:
            results.sort(key=lambda d: d["risk_score"], reverse=True)

        return results

@app.get("/api/drains/{drain_id}")
def get_drain_detail(drain_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM drains WHERE id = ?;", (drain_id,))
        drain = cursor.fetchone()
        if not drain:
            raise HTTPException(status_code=404, detail="Drain asset not found")

        drain_dict = dict(drain)

        # Full risk analysis
        risk_info = calculate_drain_risk(drain_id, conn)
        drain_dict["risk_assessment"] = risk_info

        # Recent inspections
        cursor.execute("SELECT * FROM inspections WHERE drain_id = ? ORDER BY inspection_date DESC LIMIT 5;", (drain_id,))
        drain_dict["inspections"] = [dict(r) for r in cursor.fetchall()]

        # Associated reports
        cursor.execute("SELECT * FROM reports WHERE drain_id = ? ORDER BY created_at DESC;", (drain_id,))
        drain_dict["reports"] = [dict(r) for r in cursor.fetchall()]

        # Maintenance tasks
        cursor.execute("SELECT * FROM maintenance_tasks WHERE drain_id = ? ORDER BY created_at DESC;", (drain_id,))
        drain_dict["tasks"] = [dict(r) for r in cursor.fetchall()]

        # Maintenance completion records
        cursor.execute("SELECT * FROM maintenance_records WHERE drain_id = ? ORDER BY completion_date DESC;", (drain_id,))
        drain_dict["maintenance_history"] = [dict(r) for r in cursor.fetchall()]

        return drain_dict

@app.get("/api/drains/{drain_id}/risk")
def get_drain_risk(drain_id: str):
    with get_db_connection() as conn:
        try:
            return calculate_drain_risk(drain_id, conn)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

# -------------------------------------------------------------
# Reports Endpoints (Civilian + Officer)
# -------------------------------------------------------------
@app.get("/api/reports")
def list_reports(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    drain_id: Optional[str] = None,
    is_simulated: Optional[int] = None
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT r.*, d.code as drain_code, d.name as drain_name, d.zone as drain_zone
            FROM reports r
            LEFT JOIN drains d ON r.drain_id = d.id
            WHERE 1=1
        """
        params = []
        if status:
            query += " AND r.status = ?"
            params.append(status)
        if severity:
            query += " AND r.severity = ?"
            params.append(severity)
        if drain_id:
            query += " AND r.drain_id = ?"
            params.append(drain_id)
        if is_simulated is not None:
            query += " AND r.is_simulated = ?"
            params.append(is_simulated)

        query += " ORDER BY r.created_at DESC;"
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]

@app.get("/api/reports/{report_id}")
def get_report(report_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*, d.code as drain_code, d.name as drain_name, d.zone as drain_zone
            FROM reports r
            LEFT JOIN drains d ON r.drain_id = d.id
            WHERE r.id = ?;
        """, (report_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Report not found")
        return dict(row)

@app.post("/api/reports", status_code=status.HTTP_201_CREATED)
def create_civilian_report(report_in: ReportCreate):
    """
    Civilian reporting portal submission.
    Creates genuine demo interaction (is_simulated = 0).
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    # Generate stable ID with prefix REP-CIV-
    short_hash = uuid.uuid4().hex[:6].upper()
    report_id = f"REP-CIV-{short_hash}"

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # If a drain_id is provided, verify it exists
        if report_in.drain_id:
            cursor.execute("SELECT id FROM drains WHERE id = ?;", (report_in.drain_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail=f"Drain asset {report_in.drain_id} does not exist.")

        cursor.execute("""
            INSERT INTO reports (
                id, drain_id, reporter_name, reporter_phone, reporter_email,
                reporter_type, category, severity, description, location_description,
                latitude, longitude, photo_url, status, is_simulated, created_at
            ) VALUES (?, ?, ?, ?, ?, 'civilian', ?, ?, ?, ?, ?, ?, ?, 'Submitted', 0, ?);
        """, (
            report_id, report_in.drain_id, report_in.reporter_name,
            report_in.reporter_phone, report_in.reporter_email,
            report_in.category, report_in.severity, report_in.description,
            report_in.location_description, report_in.latitude,
            report_in.longitude, report_in.photo_url, now_iso
        ))

        # Log audit event
        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
        cursor.execute("""
            INSERT INTO audit_events (
                id, entity_type, entity_id, action, actor_role, actor_name, details, timestamp
            ) VALUES (?, 'report', ?, 'CREATED', 'civilian', ?, ?, ?);
        """, (
            audit_id, report_id, report_in.reporter_name,
            f"Civilian filed {report_in.severity} report on '{report_in.category}'. Location: {report_in.location_description}",
            now_iso
        ))

    return get_report(report_id)

@app.post("/api/reports/{report_id}/verify")
def verify_report(report_id: str, req: ReportVerifyRequest):
    """
    Officer verifies, rejects, or marks resolved a civilian report.
    Allows mapping or updating target drain_id if unassigned.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports WHERE id = ?;", (report_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Report not found")

        drain_id = req.target_drain_id if req.target_drain_id else existing["drain_id"]
        if req.target_drain_id:
            cursor.execute("SELECT id FROM drains WHERE id = ?;", (req.target_drain_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail=f"Target drain {req.target_drain_id} not found.")

        cursor.execute("""
            UPDATE reports
            SET status = ?, verification_notes = ?, verified_by = ?, verified_at = ?, drain_id = ?
            WHERE id = ?;
        """, (req.status, req.verification_notes, req.verified_by, now_iso, drain_id, report_id))

        # Log audit event
        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
        cursor.execute("""
            INSERT INTO audit_events (
                id, entity_type, entity_id, action, actor_role, actor_name, details, timestamp
            ) VALUES (?, 'report', ?, ?, 'officer', ?, ?, ?);
        """, (
            audit_id, report_id, req.status.upper(), req.verified_by,
            f"Status changed to {req.status}. Notes: {req.verification_notes}", now_iso
        ))

    return get_report(report_id)

# -------------------------------------------------------------
# Maintenance Tasks Endpoints
# -------------------------------------------------------------
@app.get("/api/tasks")
def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    drain_id: Optional[str] = None
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT t.*, d.code as drain_code, d.name as drain_name, d.zone as drain_zone,
                   r.category as report_category, r.description as report_description
            FROM maintenance_tasks t
            JOIN drains d ON t.drain_id = d.id
            LEFT JOIN reports r ON t.source_report_id = r.id
            WHERE 1=1
        """
        params = []
        if status:
            query += " AND t.status = ?"
            params.append(status)
        if priority:
            query += " AND t.priority = ?"
            params.append(priority)
        if drain_id:
            query += " AND t.drain_id = ?"
            params.append(drain_id)

        query += " ORDER BY t.due_date ASC, t.created_at DESC;"
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.*, d.code as drain_code, d.name as drain_name, d.zone as drain_zone,
                   r.category as report_category, r.description as report_description
            FROM maintenance_tasks t
            JOIN drains d ON t.drain_id = d.id
            LEFT JOIN reports r ON t.source_report_id = r.id
            WHERE t.id = ?;
        """, (task_id,))
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Maintenance task not found")

        task_dict = dict(task)
        # Check if completed and has maintenance_records
        cursor.execute("SELECT * FROM maintenance_records WHERE task_id = ?;", (task_id,))
        records = cursor.fetchall()
        task_dict["completion_records"] = [dict(r) for r in records]
        return task_dict

@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
def create_maintenance_task(task_in: TaskCreate):
    """
    Officer assigns a maintenance task to a crew for a specific drain asset.
    Optionally links to a civilian or field report.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    task_id = f"TSK-DEMO-{uuid.uuid4().hex[:6].upper()}"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verify drain exists
        cursor.execute("SELECT id, name FROM drains WHERE id = ?;", (task_in.drain_id,))
        drain = cursor.fetchone()
        if not drain:
            raise HTTPException(status_code=400, detail=f"Drain {task_in.drain_id} not found.")

        # If source_report_id given, verify
        if task_in.source_report_id:
            cursor.execute("SELECT id FROM reports WHERE id = ?;", (task_in.source_report_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail=f"Source report {task_in.source_report_id} not found.")

        cursor.execute("""
            INSERT INTO maintenance_tasks (
                id, drain_id, source_report_id, title, description,
                priority, status, assigned_crew, due_date,
                estimated_duration_hours, is_simulated, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?, 0, ?);
        """, (
            task_id, task_in.drain_id, task_in.source_report_id, task_in.title,
            task_in.description, task_in.priority, task_in.assigned_crew,
            task_in.due_date, task_in.estimated_duration_hours, now_iso
        ))

        # Update drain status to Under Maintenance if previously Degraded/Blocked
        cursor.execute("""
            UPDATE drains 
            SET current_status = 'Under Maintenance'
            WHERE id = ? AND current_status != 'Operational';
        """, (task_in.drain_id,))

        # Log audit event
        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
        cursor.execute("""
            INSERT INTO audit_events (
                id, entity_type, entity_id, action, actor_role, actor_name, details, timestamp
            ) VALUES (?, 'task', ?, 'ASSIGNED', 'officer', 'Maintenance Controller', ?, ?);
        """, (
            audit_id, task_id,
            f"Assigned task '{task_in.title}' ({task_in.priority}) to {task_in.assigned_crew} for {drain['name']}.",
            now_iso
        ))

    return get_task(task_id)

@app.patch("/api/tasks/{task_id}/status")
def update_task_status(task_id: str, req: TaskStatusUpdateRequest):
    """
    Update lifecycle status of a task (e.g. Scheduled -> In Progress or Cancelled).
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM maintenance_tasks WHERE id = ?;", (task_id,))
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Maintenance task not found")
        if task["status"] == "Completed":
            raise HTTPException(status_code=400, detail="Cannot alter status of an already completed task.")

        cursor.execute("UPDATE maintenance_tasks SET status = ? WHERE id = ?;", (req.status, task_id))

        if req.status == "In Progress":
            cursor.execute("UPDATE drains SET current_status = 'Under Maintenance' WHERE id = ?;", (task["drain_id"],))

        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
        cursor.execute("""
            INSERT INTO audit_events (
                id, entity_type, entity_id, action, actor_role, actor_name, details, timestamp
            ) VALUES (?, 'task', ?, 'STATUS_UPDATED', 'officer', 'Maintenance Controller', ?, ?);
        """, (
            audit_id, task_id,
            f"Task {task_id} status updated from {task['status']} to {req.status}. {req.notes or ''}".strip(),
            now_iso
        ))

    return get_task(task_id)

@app.post("/api/tasks/{task_id}/complete")
def complete_maintenance_task(task_id: str, req: TaskCompleteRequest):
    """
    Records maintenance task completion, logs physical actions & waste removed,
    updates drain status to Operational, and marks task as Completed.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    record_id = f"REC-DEMO-{uuid.uuid4().hex[:6].upper()}"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM maintenance_tasks WHERE id = ?;", (task_id,))
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Maintenance task not found")

        drain_id = task["drain_id"]

        # Mark task completed
        cursor.execute("""
            UPDATE maintenance_tasks
            SET status = 'Completed', completed_at = ?
            WHERE id = ?;
        """, (now_iso, task_id))

        # Insert maintenance record
        cursor.execute("""
            INSERT INTO maintenance_records (
                id, task_id, drain_id, completed_by, completion_date,
                actions_taken, waste_removed_kg, post_condition, notes,
                is_simulated, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);
        """, (
            record_id, task_id, drain_id, req.completed_by, req.completion_date,
            req.actions_taken, req.waste_removed_kg, req.post_condition,
            req.notes, now_iso
        ))

        # If post condition is Cleared or Repaired, restore drain to Operational
        if req.post_condition in ("Cleared", "Repaired"):
            cursor.execute("""
                UPDATE drains
                SET current_status = 'Operational', last_inspection_date = ?
                WHERE id = ?;
            """, (req.completion_date, drain_id))

        # If task had a source report, mark report Resolved
        if task["source_report_id"]:
            cursor.execute("""
                UPDATE reports
                SET status = 'Resolved', verification_notes = COALESCE(verification_notes || ' | Remediation complete.', 'Remediation completed by maintenance crew.')
                WHERE id = ?;
            """, (task["source_report_id"],))

        # Log audit event
        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
        cursor.execute("""
            INSERT INTO audit_events (
                id, entity_type, entity_id, action, actor_role, actor_name, details, timestamp
            ) VALUES (?, 'task', ?, 'COMPLETED', 'officer', ?, ?, ?);
        """, (
            audit_id, task_id, req.completed_by,
            f"Task completed. Post-condition: {req.post_condition}. Removed {req.waste_removed_kg}kg waste. Actions: {req.actions_taken}",
            now_iso
        ))

    return get_task(task_id)

# -------------------------------------------------------------
# Maintenance Records & Inspections
# -------------------------------------------------------------
@app.get("/api/maintenance-records")
def list_maintenance_records(drain_id: Optional[str] = None):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT r.*, d.code as drain_code, d.name as drain_name, d.zone as drain_zone,
                   t.title as task_title, t.priority as task_priority
            FROM maintenance_records r
            JOIN drains d ON r.drain_id = d.id
            JOIN maintenance_tasks t ON r.task_id = t.id
            WHERE 1=1
        """
        params = []
        if drain_id:
            query += " AND r.drain_id = ?"
            params.append(drain_id)

        query += " ORDER BY r.completion_date DESC, r.created_at DESC;"
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]

@app.get("/api/inspections")
def list_inspections(drain_id: Optional[str] = None):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT i.*, d.code as drain_code, d.name as drain_name, d.zone as drain_zone
            FROM inspections i
            JOIN drains d ON i.drain_id = d.id
            WHERE 1=1
        """
        params = []
        if drain_id:
            query += " AND i.drain_id = ?"
            params.append(drain_id)
        query += " ORDER BY i.inspection_date DESC;"
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]

@app.post("/api/inspections", status_code=status.HTTP_201_CREATED)
def record_inspection(ins_in: InspectionCreate):
    """
    Officer logs a field inspection record. Updates drain last_inspection_date.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    ins_id = f"INS-DEMO-{uuid.uuid4().hex[:6].upper()}"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM drains WHERE id = ?;", (ins_in.drain_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Drain not found")

        cursor.execute("""
            INSERT INTO inspections (
                id, drain_id, inspector_name, inspection_date,
                blockage_percentage, structural_condition, silt_depth_cm,
                flow_rate_estimate, notes, is_simulated, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);
        """, (
            ins_id, ins_in.drain_id, ins_in.inspector_name, ins_in.inspection_date,
            ins_in.blockage_percentage, ins_in.structural_condition,
            ins_in.silt_depth_cm, ins_in.flow_rate_estimate, ins_in.notes, now_iso
        ))

        # Update drain last inspection date and status if heavily blocked
        new_status = "Blocked" if ins_in.blockage_percentage >= 70 else (
            "Degraded" if ins_in.blockage_percentage >= 40 else "Operational"
        )
        cursor.execute("""
            UPDATE drains
            SET last_inspection_date = ?, current_status = ?
            WHERE id = ?;
        """, (ins_in.inspection_date, new_status, ins_in.drain_id))

        # Recalculate and persist updated risk assessment snapshot for this drain
        calculate_drain_risk(ins_in.drain_id, conn)

        # Log audit event
        audit_id = f"AUD-{uuid.uuid4().hex[:6].upper()}"
        cursor.execute("""
            INSERT INTO audit_events (
                id, entity_type, entity_id, action, actor_role, actor_name, details, timestamp
            ) VALUES (?, 'inspection', ?, 'RECORDED', 'officer', ?, ?, ?);
        """, (
            audit_id, ins_id, ins_in.inspector_name,
            f"Inspection logged for {ins_in.drain_id}. Blockage: {ins_in.blockage_percentage}%, Condition: {ins_in.structural_condition}",
            now_iso
        ))

    return {"message": "Inspection recorded", "inspection_id": ins_id}

@app.get("/api/audit-events")
def list_audit_events(limit: int = 50):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ?;", (limit,))
        return [dict(r) for r in cursor.fetchall()]
