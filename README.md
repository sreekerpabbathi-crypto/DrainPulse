# DrainPulse — Municipal Drainage Maintenance Intelligence

**DrainPulse** is an operational drainage intelligence web application designed for municipal stormwater authorities and field engineers. It pairs a **Civilian Incident Reporting Portal** with an **Officer Operations Center**, automating the workflow:

$$\text{Civilian Report} \longrightarrow \text{Officer Verification} \longrightarrow \text{Explainable Risk Priority} \longrightarrow \text{Maintenance Task Assignment} \longrightarrow \text{Recorded Completion \& History}$$

---

## ⚡ Key Architectural Features

1. **Deterministic Maintenance Risk Prioritization Engine**:
   - Computes an explainable priority score (0–90 scale without telemetry) based on empirical field evidence:
     - **Recent Blockage Reports**: Up to 30 points (evaluates active verified citizen alerts).
     - **Previous Waterlogging History**: Up to 25 points (historic inundation and repeat ponding).
     - **Inspection Status & Overdue Penalty**: Up to 20 points (**Missing inspection data is explicitly shown as `UNKNOWN - NEEDS INSPECTION` and penalized with full 20 pts, never silently treated as safe**).
     - **Latest Field Observation**: Up to 15 points (cross-section silt depth, flow rate, structural integrity).
     - **Real-Time Rainfall Telemetry**: Excluded (up to 10 points only if a certified municipal rain gauge telemetry feed exists; otherwise explicitly excluded and explained: *"Rainfall data excluded: No physical municipal rain gauge connected. Scored 0/0 to prevent speculative prioritization"*).
   - **Crucial Principle**: This score measures **operational maintenance urgency**, NOT hydraulic flood probability.

2. **Demonstration & Simulation Integrity**:
   - **Preloaded Demo Dataset**: Seeds 30 drain assets (`DRN-001` to `DRN-030`), 45 reports (`REP-001` to `REP-045`), 20 inspection records (`INS-001` to `INS-020`), and 20 maintenance tasks (`TSK-001` to `TSK-020`) with realistic relationships, coordinates, and completion records.
   - **Idempotent Seeding**: Seeds *only* when the database is empty; never duplicates records across restarts.
   - **Labeling**: Every seeded record carries a visible `SIMULATED DEMO DATA` badge.
   - **Genuine Demo Submissions**: User-submitted civilian reports are flagged with `is_simulated = 0` (`GENUINE DEMO INTERACTION`) and persisted separately in SQLite.
   - **Demonstration Role Switch**: A top-bar switcher toggles between Civilian Portal and Officer Operations (explicitly labeled for demonstration evaluation only, not production access control).

3. **Relational SQLite Database with Python `sqlite3`**:
   - Strict `PRAGMA foreign_keys = ON;`.
   - Dedicated relational tables: `drains`, `reports`, `inspections`, `risk_assessments`, `maintenance_tasks`, `maintenance_records`, `audit_events`.
   - Parameterized SQL queries and ISO 8601 UTC timestamp handling.

4. **GIS Spatial Catchment Grid**:
   - Interactive SVG-based GIS topology representing 5 municipal zones (Central Market, North Industrial Basin, Riverfront Esplanade, Southern Residential, Westside IT Corridor).
   - Nodes colored and pulsing by risk priority tier (Critical, High, Moderate, Low).
   - Primary list views remain 100% usable at all times.

---

## 🛠 Technology Stack

- **Frontend**: React 19 + TypeScript + Vite + Vanilla CSS (Executive dark slate theme with glassmorphism, responsive data tables, and micro-animations) + `lucide-react` icons.
- **Backend**: Python 3.11+ + FastAPI + Uvicorn + Pydantic v2 + SQLite3.
- **Testing**: Pytest + FastAPI TestClient.
- **No Paid APIs or Cloud Dependencies**: Zero external auth, zero Supabase, zero paid weather keys.

---

## 🚀 Windows-Friendly Quickstart Guide

### 1. Prerequisites
- Python 3.11+ installed and available on PATH (`python --version`)
- Node.js 18+ and npm installed (`node --version`, `npm --version`)

---

### 2. Run Backend (FastAPI + SQLite)

Open a PowerShell terminal in the repository root (`drainpulse`):

```powershell
# From C:\Users\<user>\Desktop\drainpulse
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

> **Note**: On initial startup, the backend automatically initializes `data/drainpulse.db` and preloads the 30 drains, 45 reports, 20 inspections, and 20 tasks. Subsequent restarts will not duplicate data.

Verify backend health in another terminal or browser:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health"
```
Or open: `http://127.0.0.1:8000/docs` to view interactive OpenAPI/Swagger documentation.

---

### 3. Run Frontend (React + Vite)

Open a second PowerShell terminal in `drainpulse/frontend`:

```powershell
cd frontend
npm run dev
```

Open your browser and navigate to:
```
http://127.0.0.1:5173
```

---

## 🧪 Running Automated Tests

Run the complete backend integration and unit test suite:

```powershell
# From C:\Users\<user>\Desktop\drainpulse
python -m pytest backend/tests -v
```

### What the test suite validates:
- Relational schema creation and foreign key constraints.
- Seed data counts and idempotency (prevents duplicate seed data on restart).
- Deterministic risk engine calculations (checks factor scores, overdue penalties, and rainfall exclusion).
- Complete core workflow end-to-end:
  1. Civilian report submission (`REP-CIV-xxx`, `is_simulated = 0`).
  2. Officer verification and field findings logging.
  3. Work order dispatch and assignment.
  4. Work order field completion with waste removed (kg), post-condition certification, and automatic drain status restoration.

To test the frontend production build:
```powershell
cd frontend
npm run build
```

---

## 📂 Project Directory Structure

```
drainpulse/
├── backend/
│   ├── __init__.py
│   ├── database.py         # SQLite connection manager with foreign keys & migrations
│   ├── risk_engine.py      # Deterministic 5-factor risk & maintenance prioritization engine
│   ├── seed_data.py        # 30 drains, 45 reports, 20 inspections, 20 tasks seeder
│   ├── models.py           # Pydantic validation schemas
│   ├── main.py             # FastAPI REST routes (reports, tasks, verifications, audits)
│   └── tests/
│       ├── __init__.py
│       └── test_backend.py # Comprehensive pytest test suite
├── data/
│   └── drainpulse.db       # Relational SQLite database file
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx              # Navbar with health pill & role switcher
│   │   │   ├── DemoBanner.tsx          # Simulated vs genuine data notice
│   │   │   ├── CivilianPortal.tsx      # Public reporting form & community feed
│   │   │   ├── OfficerDashboard.tsx    # Executive KPIs, Registry, Queue, Work Orders
│   │   │   ├── DrainDetailModal.tsx    # Explainable 5-factor risk inspector
│   │   │   ├── CreateTaskModal.tsx     # Crew maintenance task dispatcher
│   │   │   ├── CompleteTaskModal.tsx   # Field completion sign-off & waste logger
│   │   │   ├── VerifyReportModal.tsx   # Officer review & drain asset mapper
│   │   │   └── SpatialDrainMap.tsx     # SVG GIS catchment topology with risk pins
│   │   ├── api.ts          # Type-safe fetch client for REST endpoints
│   │   ├── types.ts        # TypeScript domain interfaces
│   │   ├── index.css       # Design system tokens, dark theme, and typography
│   │   └── App.tsx         # Main application coordinator
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts      # Vite dev server with proxy to backend port 8000
└── README.md
```

---

## 📑 Governance & Auditing

Every action taken in DrainPulse—civilian report creation, officer review, task dispatch, and field completion—writes an entry into the immutable `audit_events` relational table. Officers can inspect this chronological timeline in the **Completion Records & Audit** tab.
