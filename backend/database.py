"""
DrainPulse Database Layer
Uses Python's built-in sqlite3 with foreign keys, parameterised queries,
and robust connection handling.
"""
import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "drainpulse.db"

def ensure_db_dir():
    os.makedirs(DB_DIR, exist_ok=True)

@contextmanager
def get_db_connection():
    """
    Context manager for SQLite connections.
    Enforces foreign key constraints and row factory for dict-like access.
    """
    ensure_db_dir()
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """
    Initializes all relational tables if they do not exist.
    """
    ensure_db_dir()
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Drains asset table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS drains (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            zone TEXT NOT NULL,
            drain_type TEXT NOT NULL,
            dimensions TEXT NOT NULL,
            depth_m REAL NOT NULL,
            criticality TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            installation_year INTEGER,
            has_waterlogging_history INTEGER NOT NULL DEFAULT 0,
            waterlogging_severity TEXT NOT NULL DEFAULT 'None',
            last_inspection_date TEXT,
            current_status TEXT NOT NULL DEFAULT 'Operational',
            is_simulated INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        """)

        # 2. Reports table (civilian + field)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            drain_id TEXT REFERENCES drains(id) ON DELETE SET NULL,
            reporter_name TEXT NOT NULL,
            reporter_phone TEXT,
            reporter_email TEXT,
            reporter_type TEXT NOT NULL DEFAULT 'civilian',
            category TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT NOT NULL,
            location_description TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            photo_url TEXT,
            status TEXT NOT NULL DEFAULT 'Submitted',
            verification_notes TEXT,
            verified_by TEXT,
            verified_at TEXT,
            is_simulated INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """)

        # 3. Inspections table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS inspections (
            id TEXT PRIMARY KEY,
            drain_id TEXT NOT NULL REFERENCES drains(id) ON DELETE CASCADE,
            inspector_name TEXT NOT NULL,
            inspection_date TEXT NOT NULL,
            blockage_percentage REAL NOT NULL,
            structural_condition TEXT NOT NULL,
            silt_depth_cm REAL NOT NULL DEFAULT 0.0,
            flow_rate_estimate TEXT NOT NULL DEFAULT 'Normal',
            notes TEXT,
            is_simulated INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        """)

        # 4. Risk Assessments cache / log table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS risk_assessments (
            id TEXT PRIMARY KEY,
            drain_id TEXT NOT NULL REFERENCES drains(id) ON DELETE CASCADE,
            calculated_at TEXT NOT NULL,
            total_score REAL NOT NULL,
            max_possible_score REAL NOT NULL,
            priority_tier TEXT NOT NULL,
            recent_blockage_score REAL NOT NULL,
            recent_blockage_evidence TEXT NOT NULL,
            waterlogging_history_score REAL NOT NULL,
            waterlogging_evidence TEXT NOT NULL,
            inspection_overdue_score REAL NOT NULL,
            inspection_overdue_evidence TEXT NOT NULL,
            field_observation_score REAL NOT NULL,
            field_observation_evidence TEXT NOT NULL,
            rainfall_score REAL NOT NULL DEFAULT 0.0,
            rainfall_evidence TEXT NOT NULL,
            is_simulated INTEGER NOT NULL DEFAULT 1
        );
        """)

        # 5. Maintenance Tasks table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_tasks (
            id TEXT PRIMARY KEY,
            drain_id TEXT NOT NULL REFERENCES drains(id) ON DELETE CASCADE,
            source_report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Scheduled',
            assigned_crew TEXT NOT NULL,
            due_date TEXT NOT NULL,
            estimated_duration_hours REAL,
            is_simulated INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            completed_at TEXT
        );
        """)

        # 6. Maintenance Records (Completion history)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_records (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
            drain_id TEXT NOT NULL REFERENCES drains(id) ON DELETE CASCADE,
            completed_by TEXT NOT NULL,
            completion_date TEXT NOT NULL,
            actions_taken TEXT NOT NULL,
            waste_removed_kg REAL NOT NULL DEFAULT 0.0,
            post_condition TEXT NOT NULL,
            notes TEXT,
            is_simulated INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        """)

        # 7. Audit Events table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            actor_name TEXT NOT NULL,
            details TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
        """)

        # Create indexes for fast querying and relationships
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_drain ON reports(drain_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_drain ON inspections(drain_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_drain ON maintenance_tasks(drain_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON maintenance_tasks(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_task ON maintenance_records(task_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);")

def is_database_seeded() -> bool:
    """
    Check if the database already contains drain records to prevent duplicate seeding.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM drains;")
        row = cursor.fetchone()
        return (row["count"] if row else 0) > 0
