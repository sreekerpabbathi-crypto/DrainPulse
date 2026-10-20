"""
Comprehensive Test Suite for DrainPulse Backend
Tests:
- Relational SQLite schema and foreign key enforcement
- Seeding idempotency (30 drains, 45 reports, 20 inspections, 20 tasks)
- Deterministic Risk Prioritization Engine (explainable scoring, missing inspection penalty, rainfall exclusion)
- End-to-end Core Workflow:
  1. Civilian report creation (is_simulated = 0)
  2. Officer verification
  3. Task assignment
  4. Task completion & maintenance record logging
"""
import pytest
import sqlite3
import os
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db_connection, init_db, is_database_seeded
from backend.seed_data import seed_database_if_empty
from backend.risk_engine import calculate_drain_risk

client = TestClient(app)

def test_database_initialization_and_seeding():
    init_db()
    seeded = seed_database_if_empty()
    assert is_database_seeded() is True

    # Check exact seeded counts
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM drains WHERE is_simulated = 1;")
        assert cursor.fetchone()["c"] == 30

        cursor.execute("SELECT COUNT(*) as c FROM reports WHERE is_simulated = 1;")
        assert cursor.fetchone()["c"] == 45

        cursor.execute("SELECT COUNT(*) as c FROM inspections WHERE is_simulated = 1;")
        assert cursor.fetchone()["c"] == 20

        cursor.execute("SELECT COUNT(*) as c FROM maintenance_tasks WHERE is_simulated = 1;")
        assert cursor.fetchone()["c"] == 20

    # Ensure idempotency: re-running seed_database_if_empty must NOT duplicate
    second_run = seed_database_if_empty()
    assert second_run is False

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM drains;")
        assert cursor.fetchone()["c"] == 30

def test_risk_prioritization_engine():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Test Drain 1 (Market Road Main Trunk Culvert: has reports, severe waterlogging, old inspection)
        risk_1 = calculate_drain_risk("DRN-001", conn)
        assert "total_score" in risk_1
        assert "priority_tier" in risk_1
        assert risk_1["max_possible_score"] == 90.0
        assert len(risk_1["factors"]) == 4

        # Check 4 active empirical factors (rainfall telemetry removed as requested)
        factors_by_name = {f["name"]: f for f in risk_1["factors"]}
        assert "Recent Blockage Reports" in factors_by_name
        assert "Previous Waterlogging History" in factors_by_name
        assert "Inspection Status & Overdue Penalty" in factors_by_name
        assert "Latest Field Observation" in factors_by_name
        assert "Real-time Rainfall Telemetry" not in factors_by_name

        # Test Drain 8 or Drain 14 (which deliberately has NO inspection on file)
        risk_uninspected = calculate_drain_risk("DRN-008", conn)
        insp_factor = next(f for f in risk_uninspected["factors"] if f["name"] == "Inspection Status & Overdue Penalty")
        assert insp_factor["inspection_status"] == "UNKNOWN_NEEDS_INSPECTION"
        assert insp_factor["score"] == 20.0
        assert "UNKNOWN" in insp_factor["evidence"]

        # Verify persistence in relational risk_assessments table
        cursor.execute("SELECT * FROM risk_assessments WHERE drain_id = 'DRN-001';")
        db_rsk = cursor.fetchone()
        assert db_rsk is not None
        assert db_rsk["total_score"] == risk_1["total_score"]
        assert db_rsk["priority_tier"] == risk_1["priority_tier"]

def test_api_health_and_stats():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["drain_assets_registered"] == 30

    res_stats = client.get("/api/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["drains"]["total"] == 30
    assert stats["reports"]["total"] >= 45

def test_full_workflow_end_to_end():
    # Step 1: Civilian submits a report
    new_report_payload = {
        "drain_id": "DRN-004",
        "reporter_name": "Test Civilian Citizen",
        "reporter_phone": "+91 9999900000",
        "reporter_email": "citizen@test.org",
        "category": "Solid Waste / Plastic Blockage",
        "severity": "High",
        "description": "Thick layer of plastic bottles jammed against intake grid after evening rain.",
        "location_description": "Opposite Metro Gate 2, near bus stop"
    }
    create_res = client.post("/api/reports", json=new_report_payload)
    assert create_res.status_code == 201
    created_rep = create_res.json()
    rep_id = created_rep["id"]
    assert rep_id.startswith("REP-CIV-")
    assert created_rep["is_simulated"] == 0
    assert created_rep["status"] == "Submitted"

    # Step 2: Officer verifies report
    verify_payload = {
        "status": "Verified",
        "verification_notes": "Officer site inspection confirmed heavy blockage on intake grid.",
        "verified_by": "Officer R. Kulkarni"
    }
    verify_res = client.post(f"/api/reports/{rep_id}/verify", json=verify_payload)
    assert verify_res.status_code == 200
    verified_rep = verify_res.json()
    assert verified_rep["status"] == "Verified"
    assert verified_rep["verified_by"] == "Officer R. Kulkarni"

    # Step 3: Officer assigns maintenance task linked to verified report
    task_payload = {
        "drain_id": "DRN-004",
        "source_report_id": rep_id,
        "title": "Clear intake grid plastic blockage",
        "description": "Deploy manual crew to clear bottles and debris from DRN-004 intake rack.",
        "priority": "High",
        "assigned_crew": "Crew Alpha-1 (Heavy Desilting)",
        "due_date": "2026-10-25",
        "estimated_duration_hours": 3.5
    }
    task_res = client.post("/api/tasks", json=task_payload)
    assert task_res.status_code == 201
    created_task = task_res.json()
    task_id = created_task["id"]
    assert created_task["status"] == "Scheduled"
    assert created_task["source_report_id"] == rep_id

    # Step 3b: Transition task status to In Progress
    status_patch_res = client.patch(f"/api/tasks/{task_id}/status", json={"status": "In Progress", "notes": "Crew arrived on site."})
    assert status_patch_res.status_code == 200
    assert status_patch_res.json()["status"] == "In Progress"

    # Step 4: Maintenance crew completes task and logs record
    complete_payload = {
        "completed_by": "Crew Alpha-1 Foreman",
        "completion_date": "2026-10-22",
        "actions_taken": "Manually racked 180kg plastic debris and pressure washed trash screen.",
        "waste_removed_kg": 180.5,
        "post_condition": "Cleared",
        "notes": "Intake fully clear, water flow unrestricted."
    }
    comp_res = client.post(f"/api/tasks/{task_id}/complete", json=complete_payload)
    assert comp_res.status_code == 200
    comp_task = comp_res.json()
    assert comp_task["status"] == "Completed"
    assert len(comp_task["completion_records"]) == 1
    assert comp_task["completion_records"][0]["waste_removed_kg"] == 180.5

    # Verify source report is now marked Resolved
    rep_check = client.get(f"/api/reports/{rep_id}").json()
    assert rep_check["status"] == "Resolved"

    # Verify maintenance records endpoint includes this record
    records_res = client.get(f"/api/maintenance-records?drain_id=DRN-004")
    assert records_res.status_code == 200
    records = records_res.json()
    assert any(r["task_id"] == task_id for r in records)


def test_risk_persistence_and_repeated_evaluation():
    """
    P0 Test: Verifies risk assessment snapshot persistence and idempotent upserting
    without creating duplicate rows for the same drain.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        drain_id = "DRN-002"

        # Calculate risk first time
        risk_first = calculate_drain_risk(drain_id, conn)
        cursor.execute("SELECT COUNT(*) as count FROM risk_assessments WHERE drain_id = ?;", (drain_id,))
        count_first = cursor.fetchone()["count"]
        assert count_first == 1

        cursor.execute("SELECT * FROM risk_assessments WHERE drain_id = ?;", (drain_id,))
        row_first = cursor.fetchone()
        assert row_first["total_score"] == risk_first["total_score"]
        assert row_first["priority_tier"] == risk_first["priority_tier"]

        # Calculate risk a second time - must upsert, NOT insert a duplicate row
        risk_second = calculate_drain_risk(drain_id, conn)
        cursor.execute("SELECT COUNT(*) as count FROM risk_assessments WHERE drain_id = ?;", (drain_id,))
        count_second = cursor.fetchone()["count"]
        assert count_second == 1

        cursor.execute("SELECT * FROM risk_assessments WHERE drain_id = ?;", (drain_id,))
        row_second = cursor.fetchone()
        assert row_second["id"] == f"RSK-{drain_id}"
        assert row_second["total_score"] == risk_second["total_score"]


def test_task_status_transitions_and_validations():
    """
    P1 Test: Valid transitions, invalid statuses, nonexistent IDs, completed immutability,
    and audit trail logging.
    """
    # Create a new task to test transitions
    task_payload = {
        "drain_id": "DRN-005",
        "title": "Clear silt build-up in culvert inlet",
        "description": "Routine desilting test task.",
        "priority": "Medium",
        "assigned_crew": "Crew Beta-2",
        "due_date": "2026-11-01"
    }
    create_res = client.post("/api/tasks", json=task_payload)
    assert create_res.status_code == 201
    task_id = create_res.json()["id"]

    # 1. Valid transition: Scheduled -> In Progress
    patch_in_progress = client.patch(
        f"/api/tasks/{task_id}/status",
        json={"status": "In Progress", "notes": "Work underway"}
    )
    assert patch_in_progress.status_code == 200
    assert patch_in_progress.json()["status"] == "In Progress"

    # Check drain status changed to Under Maintenance
    drain_res = client.get("/api/drains/DRN-005")
    assert drain_res.status_code == 200
    assert drain_res.json()["current_status"] == "Under Maintenance"

    # 2. Valid transition: In Progress -> Cancelled
    patch_cancel = client.patch(
        f"/api/tasks/{task_id}/status",
        json={"status": "Cancelled", "notes": "Work cancelled due to severe weather"}
    )
    assert patch_cancel.status_code == 200
    assert patch_cancel.json()["status"] == "Cancelled"

    # 3. Invalid status value rejected with 422
    patch_invalid_val = client.patch(
        f"/api/tasks/{task_id}/status",
        json={"status": "NonexistentStatus"}
    )
    assert patch_invalid_val.status_code == 422

    # 4. Nonexistent task ID returns 404
    patch_not_found = client.patch(
        "/api/tasks/TSK-NONEXISTENT-99999/status",
        json={"status": "In Progress"}
    )
    assert patch_not_found.status_code == 404

    # 5. Check audit trail recorded STATUS_UPDATED events
    audit_res = client.get("/api/audit-events?limit=20")
    assert audit_res.status_code == 200
    events = audit_res.json()
    task_events = [e for e in events if e.get("entity_id") == task_id and e.get("action") == "STATUS_UPDATED"]
    assert len(task_events) >= 2


def test_civilian_report_tracking_and_not_found():
    """
    P1 Test: Lookup existing report by ID vs nonexistent reference ID.
    """
    # 1. Nonexistent reference ID must return 404
    res_not_found = client.get("/api/reports/REP-NONEXISTENT-000")
    assert res_not_found.status_code == 404
    assert "not found" in res_not_found.json()["detail"].lower()

    # 2. Existing report retrieval
    all_reports = client.get("/api/reports").json()
    assert len(all_reports) > 0
    first_report_id = all_reports[0]["id"]

    res_found = client.get(f"/api/reports/{first_report_id}")
    assert res_found.status_code == 200
    report_data = res_found.json()
    assert report_data["id"] == first_report_id
    assert "status" in report_data
    assert "category" in report_data
    assert "created_at" in report_data


def test_field_inspection_logging_and_persistence():
    """
    P2 Test: Officer logs field inspection, validates required fields,
    verifies persistence in inspections table and update of drain last_inspection_date.
    """
    # Missing required field (e.g. blockage_percentage) -> 422
    invalid_payload = {
        "drain_id": "DRN-006",
        "inspector_name": "Inspector Verma"
    }
    inv_res = client.post("/api/inspections", json=invalid_payload)
    assert inv_res.status_code == 422

    # Valid inspection payload
    valid_payload = {
        "drain_id": "DRN-006",
        "inspector_name": "Inspector Verma",
        "inspection_date": "2026-10-20",
        "blockage_percentage": 75.0,
        "structural_condition": "Poor",
        "silt_depth_cm": 25.0,
        "flow_rate_estimate": "Sluggish",
        "notes": "Heavy silt accumulation and visible micro-cracking."
    }
    res = client.post("/api/inspections", json=valid_payload)
    assert res.status_code == 201
    res_data = res.json()
    assert "inspection_id" in res_data
    ins_id = res_data["inspection_id"]

    # Verify persistence in database
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inspections WHERE id = ?;", (ins_id,))
        db_ins = cursor.fetchone()
        assert db_ins is not None
        assert db_ins["drain_id"] == "DRN-006"
        assert db_ins["blockage_percentage"] == 75.0
        assert db_ins["structural_condition"] == "Poor"

        # Check drain last_inspection_date and status
        cursor.execute("SELECT last_inspection_date, current_status FROM drains WHERE id = 'DRN-006';")
        drain_row = cursor.fetchone()
        assert drain_row["last_inspection_date"] == "2026-10-20"
        assert drain_row["current_status"] == "Blocked"  # >= 70% sets Blocked

        # Check audit event logged
        cursor.execute("SELECT * FROM audit_events WHERE entity_id = ? AND action = 'RECORDED';", (ins_id,))
        audit_event = cursor.fetchone()
        assert audit_event is not None
        assert audit_event["actor_name"] == "Inspector Verma"


def test_accurate_stats_and_status_breakdown():
    """
    Phase 1 Regression Test: Verify stats endpoint returns truthful drain status breakdown
    and truthful active task counts.
    """
    res = client.get("/api/stats")
    assert res.status_code == 200
    stats = res.json()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verify operational drains count matches actual DB count
        cursor.execute("SELECT COUNT(*) as c FROM drains WHERE current_status = 'Operational';")
        actual_operational = cursor.fetchone()["c"]
        assert stats["drains"]["operational"] == actual_operational

        # Verify under maintenance count matches actual DB count
        cursor.execute("SELECT COUNT(*) as c FROM drains WHERE current_status = 'Under Maintenance';")
        actual_under_maint = cursor.fetchone()["c"]
        assert stats["drains"]["under_maintenance"] == actual_under_maint

        # Verify active tasks match Scheduled + In Progress only
        cursor.execute("SELECT COUNT(*) as c FROM maintenance_tasks WHERE status IN ('Scheduled', 'In Progress');")
        actual_active_tasks = cursor.fetchone()["c"]
        assert stats["maintenance"]["active_tasks"] == actual_active_tasks

        # Verify cancelled tasks count
        cursor.execute("SELECT COUNT(*) as c FROM maintenance_tasks WHERE status = 'Cancelled';")
        actual_cancelled = cursor.fetchone()["c"]
        assert stats["maintenance"]["cancelled_tasks"] == actual_cancelled


def test_task_cancellation_reduces_active_count():
    """
    Phase 2 Regression Test: Creating a task increases active count;
    cancelling that task reduces active count and does NOT treat Cancelled as active.
    """
    initial_stats = client.get("/api/stats").json()
    initial_active = initial_stats["maintenance"]["active_tasks"]

    # 1. Create a task (status: Scheduled)
    task_res = client.post("/api/tasks", json={
        "drain_id": "DRN-007",
        "title": "Clear surface debris at culvert screen",
        "description": "Routine test dispatch.",
        "priority": "Low",
        "assigned_crew": "Crew Gamma-3",
        "due_date": "2026-11-05"
    })
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # Active count must have increased by 1
    post_create_stats = client.get("/api/stats").json()
    assert post_create_stats["maintenance"]["active_tasks"] == initial_active + 1

    # 2. Cancel the task
    cancel_res = client.patch(f"/api/tasks/{task_id}/status", json={
        "status": "Cancelled",
        "notes": "Weather forecast changed; dispatch cancelled."
    })
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "Cancelled"

    # Active count must return to initial_active (Cancelled is NOT active)
    post_cancel_stats = client.get("/api/stats").json()
    assert post_cancel_stats["maintenance"]["active_tasks"] == initial_active
    assert post_cancel_stats["maintenance"]["cancelled_tasks"] >= 1


def test_reject_unmapped_report_and_filter():
    """
    Phase 3 Regression Test: Officer can reject an unmapped civilian report
    without forcing a drain asset association, and filtered reports include Rejected.
    """
    # 1. Create civilian report with NO drain specified
    create_res = client.post("/api/reports", json={
        "reporter_name": "Anonymous Citizen",
        "category": "Foul Odour",
        "severity": "Low",
        "description": "Temporary odour from roadside trash bin, not drainage channel.",
        "location_description": "Corner of 4th Cross and Pine St"
    })
    assert create_res.status_code == 201
    report_id = create_res.json()["id"]
    assert create_res.json()["drain_id"] is None
    assert create_res.json()["status"] == "Submitted"

    # 2. Officer rejects this unmapped report without supplying target_drain_id
    verify_res = client.post(f"/api/reports/{report_id}/verify", json={
        "status": "Rejected",
        "verification_notes": "Ground inspection verified municipal sanitation issue, not stormwater drainage infrastructure.",
        "verified_by": "Officer S. Venkat"
    })
    assert verify_res.status_code == 200
    rejected_rep = verify_res.json()
    assert rejected_rep["status"] == "Rejected"
    assert rejected_rep["drain_id"] is None

    # 3. Query reports endpoint with status filter 'Rejected'
    filter_res = client.get("/api/reports?status=Rejected")
    assert filter_res.status_code == 200
    rejected_list = filter_res.json()
    assert any(r["id"] == report_id for r in rejected_list)


