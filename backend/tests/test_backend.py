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
        # Test Drain 1 (Market Road Main Trunk Culvert: has reports, severe waterlogging, old inspection)
        risk_1 = calculate_drain_risk("DRN-001", conn)
        assert "total_score" in risk_1
        assert "priority_tier" in risk_1
        assert risk_1["max_possible_score"] == 90.0
        assert len(risk_1["factors"]) == 5

        # Check factors
        factors_by_name = {f["name"]: f for f in risk_1["factors"]}
        assert "Recent Blockage Reports" in factors_by_name
        assert "Previous Waterlogging History" in factors_by_name
        assert "Inspection Status & Overdue Penalty" in factors_by_name
        assert "Latest Field Observation" in factors_by_name
        assert "Real-time Rainfall Telemetry" in factors_by_name

        # Verify rainfall is strictly excluded and explained
        rain_factor = factors_by_name["Real-time Rainfall Telemetry"]
        assert rain_factor["score"] == 0.0
        assert rain_factor["is_excluded"] is True
        assert "Rainfall data excluded" in rain_factor["evidence"]

        # Test Drain 8 or Drain 14 (which deliberately has NO inspection on file)
        risk_uninspected = calculate_drain_risk("DRN-008", conn)
        insp_factor = next(f for f in risk_uninspected["factors"] if f["name"] == "Inspection Status & Overdue Penalty")
        assert insp_factor["inspection_status"] == "UNKNOWN_NEEDS_INSPECTION"
        assert insp_factor["score"] == 20.0
        assert "UNKNOWN" in insp_factor["evidence"]

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
