"""
DrainPulse Deterministic Risk & Prioritization Engine
Calculates explainable maintenance prioritization scores based on empirical observations,
historical vulnerabilities, inspection timelines, and active citizen reports.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import sqlite3

def parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        # Handles '2026-10-20T10:00:00' or '2026-10-20'
        dt_clean = dt_str.replace("Z", "+00:00")
        if "T" in dt_clean:
            return datetime.fromisoformat(dt_clean)
        return datetime.fromisoformat(dt_clean + "T00:00:00+00:00")
    except Exception:
        try:
            return datetime.strptime(dt_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            return None

def calculate_drain_risk(drain_id: str, conn: sqlite3.Connection, current_dt: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Deterministically computes the explainable maintenance prioritization score for a drain.
    
    Formula Breakdown (Max 90 points without external rain gauge):
    1. Recent Blockage Reports: Up to 30 pts
    2. Previous Waterlogging History: Up to 25 pts
    3. Overdue Inspection Status: Up to 20 pts (Missing data = Unknown / Needing Inspection)
    4. Latest Field Observation: Up to 15 pts
    5. Rainfall: Excluded (Up to 10 only if real data source available; explained explicitly)
    """
    if current_dt is None:
        current_dt = datetime.now(timezone.utc)
    elif current_dt.tzinfo is None:
        current_dt = current_dt.replace(tzinfo=timezone.utc)

    cursor = conn.cursor()

    # Fetch Drain asset
    cursor.execute("SELECT * FROM drains WHERE id = ?;", (drain_id,))
    drain = cursor.fetchone()
    if not drain:
        raise ValueError(f"Drain asset {drain_id} not found")

    # ---------------------------------------------------------
    # Factor 1: Recent Blockage Reports (up to 30 pts)
    # ---------------------------------------------------------
    cursor.execute("""
        SELECT severity, category, status, created_at, description
        FROM reports 
        WHERE drain_id = ? AND status IN ('Submitted', 'Verified')
        ORDER BY created_at DESC;
    """, (drain_id,))
    active_reports = cursor.fetchall()

    blockage_score = 0.0
    critical_count = sum(1 for r in active_reports if r["severity"].lower() == "critical")
    high_count = sum(1 for r in active_reports if r["severity"].lower() == "high")
    med_count = sum(1 for r in active_reports if r["severity"].lower() == "medium")
    low_count = sum(1 for r in active_reports if r["severity"].lower() == "low")

    if critical_count > 0:
        blockage_score = 30.0
        blockage_evidence = f"{critical_count} Critical severity report(s) active on this asset (total active reports: {len(active_reports)}). Urgent civilian alert."
    elif high_count > 0:
        blockage_score = min(30.0, 22.0 + (high_count - 1) * 4.0 + med_count * 2.0)
        blockage_evidence = f"{high_count} High severity report(s) active. Total reports: {len(active_reports)}. Significant flow obstruction reported."
    elif med_count > 0:
        blockage_score = min(30.0, 14.0 + (med_count - 1) * 4.0 + low_count * 2.0)
        blockage_evidence = f"{med_count} Moderate blockage report(s) active. Silt or rubbish build-up noted."
    elif low_count > 0:
        blockage_score = min(30.0, 8.0 + (low_count - 1) * 3.0)
        blockage_evidence = f"{low_count} Minor/Low severity report(s) active. Routine debris noticed."
    else:
        blockage_score = 0.0
        blockage_evidence = "No active citizen or field blockage reports on record."

    # ---------------------------------------------------------
    # Factor 2: Previous Waterlogging History (up to 25 pts)
    # ---------------------------------------------------------
    has_history = bool(drain["has_waterlogging_history"])
    severity = (drain["waterlogging_severity"] or "None").lower()

    if severity == "severe" or (has_history and severity in ("high", "severe")):
        waterlogging_score = 25.0
        waterlogging_evidence = "Documented Severe repeat waterlogging history with junction backflow during monsoonal storm events."
    elif severity == "moderate" or (has_history and severity == "moderate"):
        waterlogging_score = 18.0
        waterlogging_evidence = "Documented Moderate waterlogging history with surface ponding exceeding 15cm during intense rainfall."
    elif severity == "minor" or (has_history and severity == "minor"):
        waterlogging_score = 10.0
        waterlogging_evidence = "Documented Minor historical runoff overflow without structural inundation."
    else:
        waterlogging_score = 0.0
        waterlogging_evidence = "No recorded historical waterlogging vulnerability at this catchment point."

    # ---------------------------------------------------------
    # Factor 3: Overdue Inspection Status (up to 20 pts)
    # Missing inspection data must be shown as unknown and needing inspection, never silently treated as safe.
    # ---------------------------------------------------------
    cursor.execute("""
        SELECT * FROM inspections 
        WHERE drain_id = ? 
        ORDER BY inspection_date DESC 
        LIMIT 1;
    """, (drain_id,))
    latest_inspection = cursor.fetchone()

    inspection_status = "CURRENT"
    if not latest_inspection and not drain["last_inspection_date"]:
        inspection_score = 20.0
        inspection_status = "UNKNOWN_NEEDS_INSPECTION"
        inspection_evidence = "UNKNOWN: No inspection record on file. Inspection urgently required to establish asset baseline."
    else:
        inspect_date_str = latest_inspection["inspection_date"] if latest_inspection else drain["last_inspection_date"]
        inspect_dt = parse_iso_datetime(inspect_date_str)
        if not inspect_dt:
            inspection_score = 20.0
            inspection_status = "UNKNOWN_NEEDS_INSPECTION"
            inspection_evidence = "UNKNOWN: Inspection timestamp corrupted or unparseable. Inspection required."
        else:
            days_since = (current_dt - inspect_dt).days
            if days_since < 0:
                days_since = 0

            if days_since > 180:
                inspection_score = 20.0
                inspection_status = "CRITICALLY_OVERDUE"
                inspection_evidence = f"Critically overdue: Last inspected {days_since} days ago (> 180 days standard threshold). Physical state unverified."
            elif days_since > 90:
                inspection_score = 14.0
                inspection_status = "OVERDUE"
                inspection_evidence = f"Overdue: Last inspected {days_since} days ago (90-180 days window). Scheduled re-inspection pending."
            elif days_since > 45:
                inspection_score = 7.0
                inspection_status = "DUE_SOON"
                inspection_evidence = f"Due soon: Last inspected {days_since} days ago. Approaching regular maintenance window."
            else:
                inspection_score = 0.0
                inspection_status = "CURRENT"
                inspection_evidence = f"Current: Last inspected {days_since} days ago (within 45 days). Baseline is up to date."

    # ---------------------------------------------------------
    # Factor 4: Latest Field Observation (up to 15 pts)
    # ---------------------------------------------------------
    if not latest_inspection:
        field_score = 8.0
        field_status = "UNKNOWN"
        field_evidence = "UNKNOWN: No field inspection observation available. Visual condition and sediment load unverified."
    else:
        blockage_pct = float(latest_inspection["blockage_percentage"])
        structural = (latest_inspection["structural_condition"] or "Fair").lower()
        silt_cm = float(latest_inspection["silt_depth_cm"] or 0.0)

        if blockage_pct >= 75 or structural == "failing":
            field_score = 15.0
            field_status = "SEVERE"
            field_evidence = f"Field crew observed {blockage_pct:.0f}% blockage, silt depth {silt_cm:.1f}cm, structural condition: '{structural.capitalize()}'."
        elif blockage_pct >= 50 or structural == "poor":
            field_score = 11.0
            field_status = "POOR"
            field_evidence = f"Field crew observed {blockage_pct:.0f}% blockage, silt depth {silt_cm:.1f}cm, structural condition: '{structural.capitalize()}'."
        elif blockage_pct >= 25 or structural == "fair":
            field_score = 6.0
            field_status = "FAIR"
            field_evidence = f"Field crew observed {blockage_pct:.0f}% blockage, silt depth {silt_cm:.1f}cm, structural condition: '{structural.capitalize()}'."
        else:
            field_score = 0.0
            field_status = "GOOD"
            field_evidence = f"Field crew observed nominal flow ({blockage_pct:.0f}% blockage), structural condition: '{structural.capitalize()}'."

    # ---------------------------------------------------------
    # Factor 5: Rainfall Contribution (up to 10 pts)
    # Rainfall contributes up to 10 only if a real, explicitly identified data source is available;
    # otherwise exclude it and explain its absence.
    # ---------------------------------------------------------
    rainfall_score = 0.0
    rainfall_max = 0.0 # Excluded from active denominator
    rainfall_evidence = "Rainfall data excluded: No physical municipal telemetry rain gauge or certified weather sensor feed connected. Factor excluded from score calculation to prevent ungrounded speculation."

    # ---------------------------------------------------------
    # Total Score Calculation (Out of 90 max active points)
    # ---------------------------------------------------------
    total_score = round(blockage_score + waterlogging_score + inspection_score + field_score, 1)
    max_score = 90.0

    # Determine Priority Tier
    if total_score >= 65:
        priority_tier = "Critical"
    elif total_score >= 45:
        priority_tier = "High"
    elif total_score >= 25:
        priority_tier = "Moderate"
    else:
        priority_tier = "Low"

    return {
        "drain_id": drain_id,
        "drain_code": drain["code"],
        "drain_name": drain["name"],
        "calculated_at": current_dt.isoformat(),
        "total_score": total_score,
        "max_possible_score": max_score,
        "normalized_percentage": round((total_score / max_score) * 100, 1),
        "priority_tier": priority_tier,
        "disclaimer": "This score represents empirical Maintenance Prioritization urgency, NOT hydraulic flood probability.",
        "factors": [
            {
                "name": "Recent Blockage Reports",
                "score": blockage_score,
                "max_score": 30.0,
                "weight_label": "Max 30 pts",
                "evidence": blockage_evidence,
                "active_reports_count": len(active_reports),
                "status": "Nominal" if blockage_score == 0 else ("Warning" if blockage_score < 20 else "Critical")
            },
            {
                "name": "Previous Waterlogging History",
                "score": waterlogging_score,
                "max_score": 25.0,
                "weight_label": "Max 25 pts",
                "evidence": waterlogging_evidence,
                "historical_severity": drain["waterlogging_severity"],
                "status": "Nominal" if waterlogging_score == 0 else ("Warning" if waterlogging_score < 20 else "Critical")
            },
            {
                "name": "Inspection Status & Overdue Penalty",
                "score": inspection_score,
                "max_score": 20.0,
                "weight_label": "Max 20 pts",
                "evidence": inspection_evidence,
                "inspection_status": inspection_status,
                "status": "Nominal" if inspection_score == 0 else ("Warning" if inspection_score < 15 else "Critical")
            },
            {
                "name": "Latest Field Observation",
                "score": field_score,
                "max_score": 15.0,
                "weight_label": "Max 15 pts",
                "evidence": field_evidence,
                "field_status": field_status,
                "status": "Nominal" if field_score == 0 else ("Warning" if field_score < 11 else "Critical")
            },
            {
                "name": "Real-time Rainfall Telemetry",
                "score": rainfall_score,
                "max_score": rainfall_max,
                "weight_label": "Excluded (0 pts)",
                "evidence": rainfall_evidence,
                "status": "Excluded",
                "is_excluded": True
            }
        ]
    }
