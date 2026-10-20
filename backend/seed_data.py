"""
DrainPulse Simulated Demo Dataset Generator
Seeds 30 simulated drain assets, 45 simulated reports, 20 inspection records,
and 20 maintenance tasks with corresponding completion records.
Only executes when the database is empty.
All records are marked with is_simulated = 1.
"""
import sqlite3
from datetime import datetime, timezone, timedelta
from backend.database import get_db_connection, is_database_seeded

def seed_database_if_empty():
    """
    Guarantees idempotency. Only seeds when drains table is empty.
    """
    if is_database_seeded():
        return False

    with get_db_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc)

        # ---------------------------------------------------------
        # 1. Seed 30 Drain Assets (DRN-001 to DRN-030)
        # ---------------------------------------------------------
        # Spatial center: Metro Civic Center (lat: 13.0827, lng: 80.2707 or downtown grid)
        # We use a consistent metropolitan corridor grid
        base_lat = 13.0820
        base_lng = 80.2700

        zones = ["Central Market", "North Industrial Basin", "Riverfront Esplanade", "Southern Residential", "Westside IT Corridor"]
        types = ["Open Storm Culvert", "Underground Concrete Pipe", "Covered Box Conduit", "High-Flow Arterial Canal", "Curb Inlet Channel"]
        criticalities = ["Critical", "High", "Medium", "Low"]
        waterlogging_levels = ["Severe", "Moderate", "Minor", "None"]

        drain_specs = [
            # id, code, name, zone_idx, type_idx, dim, depth, crit_idx, lat_off, lng_off, year, wl_idx, days_ago_inspected, status
            (1, "DRN-001", "Market Road Main Trunk Culvert", 0, 0, "2.4m x 1.8m Box", 2.2, 0, 0.0012, 0.0015, 2014, 0, 195, "Degraded"),
            (2, "DRN-002", "North Commercial Arterial Line A", 0, 1, "1200mm Reinforced Concrete", 3.1, 0, 0.0028, 0.0031, 2016, 1, 35, "Operational"),
            (3, "DRN-003", "Railway Station Subway Bypass", 0, 2, "1.8m x 1.5m Conduit", 2.5, 0, -0.0015, 0.0022, 2011, 0, 110, "Blocked"),
            (4, "DRN-004", "Flower Market Secondary Drain", 0, 4, "800mm U-Channel", 1.2, 2, 0.0035, -0.0010, 2018, 2, 25, "Operational"),
            (5, "DRN-005", "Old Bus Terminal Storm Drain", 0, 1, "1000mm Pipe", 2.0, 1, -0.0030, 0.0040, 2013, 1, 210, "Degraded"),
            (6, "DRN-006", "Riverfront East Discharge Sluice", 2, 3, "4.0m Trapezoidal Canal", 3.8, 0, -0.0080, 0.0090, 2015, 0, 15, "Operational"),
            (7, "DRN-007", "Promenade Walkway Drainage Duct", 2, 2, "1.0m Precast Trench", 1.1, 3, -0.0075, 0.0070, 2020, 3, 40, "Operational"),
            (8, "DRN-008", "Fisheries Wharf Outfall Conduit", 2, 1, "1400mm Corrugated Pipe", 2.8, 1, -0.0095, 0.0110, 2017, 1, None, "Under Maintenance"), # Missing inspection!
            (9, "DRN-009", "Esplanade South Bridge Collector", 2, 0, "2.0m x 2.0m Culvert", 2.6, 1, -0.0060, 0.0085, 2012, 2, 85, "Operational"),
            (10, "DRN-010", "Industrial Basin Northern Outfall", 1, 3, "3.5m Concrete Canal", 3.2, 0, 0.0120, -0.0050, 2010, 0, 240, "Degraded"),
            (11, "DRN-011", "Foundry Sector Collector Line 3", 1, 1, "900mm Concrete Pipe", 2.4, 2, 0.0145, -0.0035, 2019, 3, 18, "Operational"),
            (12, "DRN-012", "Steel Yard Cross-Drain Canal", 1, 0, "2.2m x 1.6m Culvert", 2.1, 1, 0.0130, -0.0070, 2015, 1, 95, "Operational"),
            (13, "DRN-013", "Chemical Works Runoff Basin Canal", 1, 2, "1.8m Covered Conduit", 2.9, 0, 0.0160, -0.0085, 2012, 0, 190, "Blocked"),
            (14, "DRN-014", "Heavy Engineering Access Drain", 1, 4, "600mm Curb Trench", 1.0, 3, 0.0110, -0.0020, 2021, 3, None, "Operational"), # Missing inspection!
            (15, "DRN-015", "South Garden Avenue Trunk Drain", 3, 1, "1100mm Pipe", 2.3, 1, -0.0120, -0.0040, 2016, 1, 55, "Operational"),
            (16, "DRN-016", "Greenwood Colony Storm Collector", 3, 0, "1.5m x 1.2m Culvert", 1.8, 2, -0.0135, -0.0065, 2017, 2, 30, "Operational"),
            (17, "DRN-017", "Lake View Enclave Relief Canal", 3, 3, "2.8m Trapezoidal Canal", 2.7, 0, -0.0150, -0.0080, 2014, 0, 205, "Degraded"),
            (18, "DRN-018", "Primary School Perimeter Trench", 3, 4, "750mm Covered Sump", 1.3, 1, -0.0110, -0.0025, 2020, 2, 12, "Operational"),
            (19, "DRN-019", "Pine Crest Society Discharge Duct", 3, 2, "1.2m Box Conduit", 1.6, 2, -0.0140, -0.0015, 2018, 3, 120, "Operational"),
            (20, "DRN-020", "Southern Bypass Expressway Siphon", 3, 1, "1500mm Twin Siphon", 4.1, 0, -0.0165, -0.0055, 2013, 0, 182, "Degraded"),
            (21, "DRN-021", "Cyber Hub Arterial Storm Line", 4, 1, "1350mm High-Density Pipe", 3.0, 0, 0.0050, 0.0150, 2019, 1, 20, "Operational"),
            (22, "DRN-022", "Tech Corridor Boulevard Canal", 4, 3, "3.0m Lined Concrete Canal", 2.9, 1, 0.0070, 0.0175, 2018, 2, 45, "Operational"),
            (23, "DRN-023", "Innovation Way Culvert Crossing", 4, 0, "2.0m x 1.5m Box Culvert", 2.2, 1, 0.0040, 0.0130, 2016, 1, 140, "Operational"),
            (24, "DRN-024", "Metro Station West Plaza Trench", 4, 4, "900mm Slotted Drain", 1.4, 2, 0.0065, 0.0140, 2021, 3, None, "Operational"), # Missing inspection!
            (25, "DRN-025", "Hardware Park Detention Outfall", 4, 2, "1.6m Box Conduit", 2.5, 0, 0.0090, 0.0190, 2015, 0, 215, "Degraded"),
            (26, "DRN-026", "General Hospital Emergency Drain", 0, 1, "1200mm Concrete Pipe", 2.7, 0, 0.0010, -0.0035, 2014, 0, 28, "Operational"),
            (27, "DRN-027", "Civic Center Municipal Basin", 0, 3, "3.2m Open Channel", 3.0, 1, -0.0005, 0.0005, 2012, 1, 75, "Operational"),
            (28, "DRN-028", "North Ring Road Underpass Sump", 1, 2, "2.5m Underground Sump", 4.5, 0, 0.0150, 0.0020, 2013, 0, 198, "Blocked"),
            (29, "DRN-029", "Bazaar Street Historic Stone Drain", 0, 0, "1.4m Ashlar Stone Culvert", 1.9, 1, -0.0020, -0.0025, 1985, 0, 160, "Degraded"),
            (30, "DRN-030", "Southern Rail Line Embankment Drain", 3, 0, "1.8m x 1.2m Culvert", 2.0, 2, -0.0180, -0.0030, 2011, 2, 105, "Operational"),
        ]

        for s in drain_specs:
            drain_id = f"DRN-{s[0]:03d}"
            code = s[1]
            name = s[2]
            zone = zones[s[3]]
            dtype = types[s[4]]
            dim = s[5]
            depth = s[6]
            crit = criticalities[s[7]]
            lat = round(base_lat + s[8], 6)
            lng = round(base_lng + s[9], 6)
            year = s[10]
            wl_sev = waterlogging_levels[s[11]]
            has_wl = 1 if wl_sev != "None" else 0
            
            days_ago = s[12]
            inspect_date = None
            if days_ago is not None:
                inspect_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")

            status = s[13]

            cursor.execute("""
                INSERT INTO drains (
                    id, code, name, zone, drain_type, dimensions, depth_m, criticality,
                    latitude, longitude, installation_year, has_waterlogging_history,
                    waterlogging_severity, last_inspection_date, current_status, is_simulated, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
            """, (drain_id, code, name, zone, dtype, dim, depth, crit, lat, lng, year, has_wl, wl_sev, inspect_date, status, (now - timedelta(days=365)).isoformat()))

        # ---------------------------------------------------------
        # 2. Seed 20 Inspection Records (INS-001 to INS-020)
        # Consistent with drains that have inspection dates
        # ---------------------------------------------------------
        inspectors = ["Er. Rajesh Verma (Lead Civil)", "Er. S. Meenakshi (Hydraulic)", "Insp. Tariq Ahmad", "Insp. David Chen (QA)"]
        inspected_drains = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17, 18, 20, 21, 26, 28]

        for i, drain_num in enumerate(inspected_drains, start=1):
            ins_id = f"INS-{i:03d}"
            d_id = f"DRN-{drain_num:03d}"
            
            # Find the days ago from drain_specs
            target_spec = next(item for item in drain_specs if item[0] == drain_num)
            days_ago = target_spec[12] or 30
            ins_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")
            
            # Realistic varying blockage percentages and conditions
            if drain_num in (1, 3, 13, 28): # Blocked or heavily degraded
                block_pct = 75.0 + (drain_num % 15)
                condition = "Failing" if block_pct > 80 else "Poor"
                silt_depth = 42.0 + (drain_num % 10)
                flow = "Stagnant"
                notes = f"Major obstruction detected. Cross section heavily restricted by concrete spalling and solid debris. Urgent vacuum jetting advised."
            elif drain_num in (5, 10, 17, 20):
                block_pct = 52.0 + (drain_num % 12)
                condition = "Poor"
                silt_depth = 28.0 + (drain_num % 8)
                flow = "Sluggish"
                notes = f"Significant silt layer accumulated over dry season. Roots penetrating masonry joins."
            elif drain_num in (9, 12, 15, 16):
                block_pct = 32.0 + (drain_num % 10)
                condition = "Fair"
                silt_depth = 14.0 + (drain_num % 6)
                flow = "Sluggish"
                notes = f"Moderate sediment accumulation near junction chamber. Structural casing intact."
            else:
                block_pct = 8.0 + (drain_num % 12)
                condition = "Good"
                silt_depth = 4.0 + (drain_num % 4)
                flow = "Normal"
                notes = f"Drain channel is clear with smooth gravitational flow. Grates secured and undamaged."

            cursor.execute("""
                INSERT INTO inspections (
                    id, drain_id, inspector_name, inspection_date, blockage_percentage,
                    structural_condition, silt_depth_cm, flow_rate_estimate, notes,
                    is_simulated, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
            """, (ins_id, d_id, inspectors[i % len(inspectors)], ins_date, block_pct, condition, silt_depth, flow, notes, ins_date + "T09:30:00Z"))

        # ---------------------------------------------------------
        # 3. Seed 45 Simulated Reports (REP-001 to REP-045)
        # Consistent civilian and field observations across drains
        # ---------------------------------------------------------
        categories = [
            "Solid Waste / Plastic Blockage",
            "Silt / Sediment Accumulation",
            "Collapsed Grate / Structural Damage",
            "Overflows / Stagnant Blackwater",
            "Foul Odour"
        ]
        severities = ["Critical", "High", "Medium", "Low"]
        civilian_names = [
            "Ananya Sundaram", "Vikram Rathore", "K. Narayanan", "Dr. Shalini Gupta",
            "Mohan Krishna", "Priya Venkatesh", "Arun Prakash", "Meera Nambiar",
            "Suresh Chandran", "Zoya Farooqui", "Ramesh K.", "Deepa Sen"
        ]

        report_templates = [
            ("Massive build-up of plastic beverage crates and discarded bags clogging inlet grate.", 0, 1), # cat, sev
            ("Grey stagnant water spilling onto pedestrian walkway, pedestrian access completely blocked.", 3, 0),
            ("Cast iron storm grate has collapsed under vehicle weight, creating an open fall hazard.", 2, 0),
            ("Heavy silt bed preventing water movement after last evening's drizzle.", 1, 2),
            ("Foul sewage odor venting directly into market stalls from open culvert opening.", 4, 2),
            ("Tree limbs and construction debris wedged across box conduit entrance.", 0, 1),
            ("Culvert overflowing into parking lot, water depth approx 20cm.", 3, 1),
            ("Cracked curb inlet wall with displaced stone blocks narrowing the orifice.", 2, 2),
            ("Minor trash accumulation around trash rack but water is still draining.", 0, 3),
            ("Heavy mud wash-off from nearby construction site deposited in channel.", 1, 1),
        ]

        report_statuses = ["Verified", "Submitted", "Verified", "Submitted", "Resolved", "Verified", "Rejected"]

        for r_idx in range(1, 46):
            rep_id = f"REP-{r_idx:03d}"
            # Associate with varied drains (drains 1, 3, 10, 13, 28 have more reports)
            if r_idx <= 8:
                d_num = 1
            elif r_idx <= 14:
                d_num = 3
            elif r_idx <= 20:
                d_num = 13
            elif r_idx <= 25:
                d_num = 28
            elif r_idx <= 30:
                d_num = 10
            else:
                d_num = (r_idx % 25) + 5 # others across the grid
            
            d_id = f"DRN-{d_num:03d}"
            reporter = civilian_names[r_idx % len(civilian_names)]
            tmpl = report_templates[r_idx % len(report_templates)]
            desc = tmpl[0]
            cat = categories[tmpl[1]]
            sev = severities[tmpl[2]]

            # Report age between 1 day and 40 days ago
            days_ago = (r_idx * 3) % 40 + 1
            rep_time = (now - timedelta(days=days_ago, hours=(r_idx % 12))).strftime("%Y-%m-%dT%H:%M:%SZ")

            status = report_statuses[r_idx % len(report_statuses)]
            v_by = "Officer K. Ramanathan (Zone Supt.)" if status in ("Verified", "Resolved", "Rejected") else None
            v_at = (now - timedelta(days=days_ago-1)).strftime("%Y-%m-%dT%H:%M:%SZ") if status in ("Verified", "Resolved", "Rejected") else None
            v_notes = f"Physical ground check confirmed {cat.lower()}. Priority dispatch logged." if status == "Verified" else (
                "Remediation verified completed by Municipal Crew." if status == "Resolved" else (
                    "Private property driveway drain, outside municipal jurisdiction." if status == "Rejected" else None
                )
            )

            # Location offset near the drain
            lat_off = (r_idx % 7 - 3) * 0.0003
            lng_off = (r_idx % 5 - 2) * 0.0003
            target_spec = next(item for item in drain_specs if item[0] == d_num)
            r_lat = round(base_lat + target_spec[8] + lat_off, 6)
            r_lng = round(base_lng + target_spec[9] + lng_off, 6)

            cursor.execute("""
                INSERT INTO reports (
                    id, drain_id, reporter_name, reporter_phone, reporter_email, reporter_type,
                    category, severity, description, location_description, latitude, longitude,
                    photo_url, status, verification_notes, verified_by, verified_at,
                    is_simulated, created_at
                ) VALUES (?, ?, ?, ?, ?, 'civilian', ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 1, ?);
            """, (
                rep_id, d_id, reporter, f"+91 9840{r_idx:06d}", f"{reporter.lower().replace(' ', '.')}@demo-user.org",
                cat, sev, desc, f"Near {target_spec[2]}, pillar #{r_idx * 4}",
                r_lat, r_lng, status, v_notes, v_by, v_at, rep_time
            ))

        # ---------------------------------------------------------
        # 4. Seed 20 Maintenance Tasks (TSK-001 to TSK-020)
        # Consistent with high priority drains and verified reports
        # ---------------------------------------------------------
        crews = [
            "Crew Delta-4 (Hydro-Vac Unit)",
            "Crew Alpha-1 (Heavy Desilting)",
            "Rapid Structural Repair Squad 2",
            "Zone B Mechanical Clearing Unit"
        ]

        task_defs = [
            (1, "DRN-001", "REP-001", "Emergency Jetting & Waste Siphon", "Deploy high-pressure water jetter to clear 75% blockage at Market Road culvert throat.", "Critical", "In Progress", 0, -1, 6.0),
            (2, "DRN-003", "REP-009", "Subway Bypass De-silting & Grate Re-alignment", "Extract accumulated silt and replace damaged storm grating before morning pedestrian rush.", "Critical", "Scheduled", 1, 1, 8.0),
            (3, "DRN-013", "REP-015", "Chemical Works Runoff Clearance", "Clear industrial debris and chemically inert sediment blocking covered conduit orifice.", "Critical", "Scheduled", 0, 2, 7.5),
            (4, "DRN-028", "REP-021", "Underpass Sump Pump & Line Desilt", "Deep vacuum cleaning of underground sump chamber and intake channels.", "Critical", "In Progress", 3, -1, 10.0),
            (5, "DRN-010", "REP-026", "Industrial Basin Northern Bank Clearing", "Mechanical excavator removal of heavy vegetation and illegal dump slag.", "High", "Completed", 1, -12, 12.0),
            (6, "DRN-005", "REP-005", "Bus Terminal Pipe Snaking & Sump Clear", "Hydraulic root cutting and extraction of compacted sediment.", "High", "Completed", 0, -8, 5.0),
            (7, "DRN-017", None, "Lake View Relief Canal Desilting", "Routine pre-monsoon trapezoidal channel reprofiling and weed extraction.", "High", "Scheduled", 1, 3, 14.0),
            (8, "DRN-020", None, "Twin Siphon Chamber Inspection & Flush", "Flushing heavy grit chamber and testing automated backflow flap valves.", "High", "Completed", 3, -15, 6.0),
            (9, "DRN-025", None, "Hardware Park Detention Outfall Repair", "Patch spalled concrete sidewall and clear sediment apron.", "High", "Scheduled", 2, 4, 8.0),
            (10, "DRN-029", None, "Historic Stone Culvert Masonry Reinforcement", "Repoint crumbling lime mortar and remove embedded tree roots manually.", "High", "Pending", 2, 7, 16.0),
            (11, "DRN-002", "REP-031", "Arterial Line A Trash Rack Maintenance", "Clear trapped plastic bottles and debris from barrier screen.", "Medium", "Completed", 3, -6, 4.0),
            (12, "DRN-009", "REP-035", "Esplanade South Bridge Silt Flushing", "Flush fine sand and urban runoff sediment toward river outfall.", "Medium", "Completed", 0, -18, 5.0),
            (13, "DRN-012", None, "Steel Yard Cross-Drain Clearance", "Clear gravel wash-off and structural silt bed.", "Medium", "Scheduled", 1, 5, 6.0),
            (14, "DRN-015", None, "Garden Avenue Curb Inlet Clearing", "Clear accumulated fallen leaves and street sweepings from slotted inlets.", "Medium", "Completed", 3, -22, 3.5),
            (15, "DRN-023", None, "Tech Corridor Crossing Debris Removal", "Routine trash rack cleaning and sediment gauge calibration.", "Medium", "Scheduled", 0, 6, 4.0),
            (16, "DRN-004", None, "Flower Market Secondary Trench Clean", "Remove organic market waste and sweep invert channel.", "Low", "Completed", 1, -25, 4.0),
            (17, "DRN-007", None, "Promenade Walkway Drainage Flush", "Pressure wash pedestrian slot drains and remove sand ingress.", "Low", "Completed", 3, -10, 3.0),
            (18, "DRN-011", None, "Foundry Sector Collector Routine Patrol", "Visual camera snake inspection and minor sediment scraping.", "Low", "Completed", 0, -14, 4.0),
            (19, "DRN-019", None, "Pine Crest Discharge Duct Grate Check", "Lubricate security hinge pins and clear light weed growth.", "Low", "Completed", 2, -30, 2.0),
            (20, "DRN-022", None, "Boulevard Canal Trash Trap Retrieval", "Empty floating boom trash collector and dispose non-hazardous floatables.", "Low", "Scheduled", 1, 8, 5.0),
        ]

        # For tasks marked Completed, we will insert matching maintenance_records!
        completed_task_ids = []

        for t in task_defs:
            t_id = f"TSK-{t[0]:03d}"
            d_id = t[1]
            rep_id = t[2]
            title = t[3]
            desc = t[4]
            prio = t[5]
            status = t[6]
            crew = crews[t[7]]
            due_offset = t[8]
            est_dur = t[9]

            due_date = (now + timedelta(days=due_offset)).strftime("%Y-%m-%d")
            created_at = (now - timedelta(days=abs(due_offset) + 5)).strftime("%Y-%m-%dT%H:%M:%SZ")
            completed_at = (now - timedelta(days=abs(due_offset))).strftime("%Y-%m-%dT%H:%M:%SZ") if status == "Completed" else None

            cursor.execute("""
                INSERT INTO maintenance_tasks (
                    id, drain_id, source_report_id, title, description, priority,
                    status, assigned_crew, due_date, estimated_duration_hours,
                    is_simulated, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
            """, (t_id, d_id, rep_id, title, desc, prio, status, crew, due_date, est_dur, created_at, completed_at))

            if status == "Completed":
                completed_task_ids.append((t_id, d_id, crew, completed_at, title))

        # ---------------------------------------------------------
        # 5. Seed Maintenance Records for Completed Tasks (REC-001 to REC-010)
        # ---------------------------------------------------------
        record_specs = [
            ("Mechanical excavator dredge and bank stabilization", 4250.0, "Cleared", "Removed heavy slag build-up; water levels dropped 35cm immediately."),
            ("High-velocity water snaking and mechanical root cutting", 680.0, "Cleared", "Drain cross-section fully restored to 100% capacity."),
            ("Hydraulic flushing of twin inverted siphons and valve service", 310.0, "Repaired", "Flap valves lubricated and debris chamber cleared."),
            ("Trash rack manual clear and debris extraction", 185.0, "Cleared", "Flow restored through commercial inlet without obstruction."),
            ("Flushed fine sand deposits with auxiliary tanker jetter", 520.0, "Cleared", "Sediment bed reduced from 16cm to nominal 1cm."),
            ("Vacuum excavation of curb inlet pockets", 140.0, "Cleared", "Inlet orifices cleared ahead of forecasted localized rainfall."),
            ("Manual street sweep and invert scraping of market channel", 220.0, "Cleared", "Organic vegetable scrap build-up cleared and disinfected with lime."),
            ("High-pressure slot drain washing and sand baffle clearing", 95.0, "Cleared", "Pedestrian trench unobstructed; surface drainage nominal."),
            ("Internal camera inspection and silt vacuuming", 130.0, "Cleared", "No structural fractures found; minor scale deposits removed."),
            ("Grate hinge lubrication and protective coating applied", 15.0, "Repaired", "Security bolts replaced and locking mechanism verified operable.")
        ]

        for idx, comp in enumerate(completed_task_ids, start=1):
            r_id = f"REC-{idx:03d}"
            t_id, d_id, crew, comp_time, task_title = comp
            spec = record_specs[(idx - 1) % len(record_specs)]

            cursor.execute("""
                INSERT INTO maintenance_records (
                    id, task_id, drain_id, completed_by, completion_date,
                    actions_taken, waste_removed_kg, post_condition, notes,
                    is_simulated, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
            """, (
                r_id, t_id, d_id, crew, comp_time[:10] if comp_time else now.strftime("%Y-%m-%d"),
                spec[0], spec[1], spec[2], spec[3], comp_time or now.isoformat()
            ))

        # ---------------------------------------------------------
        # 6. Seed Audit Events
        # ---------------------------------------------------------
        cursor.execute("""
            INSERT INTO audit_events (
                id, entity_type, entity_id, action, actor_role, actor_name, details, timestamp
            ) VALUES 
            ('AUD-001', 'system', 'SYSTEM_INIT', 'DATASET_SEEDED', 'system', 'DrainPulse Bootstrap', 'Preloaded 30 simulated municipal drains, 45 civilian reports, 20 inspections, and 20 maintenance tasks.', ?),
            ('AUD-002', 'report', 'REP-001', 'VERIFIED', 'officer', 'Officer K. Ramanathan', 'Civilian blockage report verified in field. Severe blockage priority logged.', ?),
            ('AUD-003', 'task', 'TSK-001', 'ASSIGNED', 'officer', 'Zone Maintenance Desk', 'Assigned emergency hydro-vac crew Delta-4 to Market Road Culvert.', ?);
        """, (now.isoformat(), (now - timedelta(hours=12)).isoformat(), (now - timedelta(hours=6)).isoformat()))

    return True

if __name__ == "__main__":
    from backend.database import init_db
    init_db()
    seeded = seed_database_if_empty()
    print(f"Seed executed: {seeded}")
