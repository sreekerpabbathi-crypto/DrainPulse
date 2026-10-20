"""
DrainPulse Request & Response Validation Schemas
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportCreate(BaseModel):
    drain_id: Optional[str] = None
    reporter_name: str = Field(..., min_length=2, max_length=100)
    reporter_phone: Optional[str] = Field(None, max_length=20)
    reporter_email: Optional[str] = Field(None, max_length=100)
    category: str = Field(..., min_length=3, max_length=60)
    severity: str = Field(..., pattern="^(Low|Medium|High|Critical)$")
    description: str = Field(..., min_length=5, max_length=2000)
    location_description: str = Field(..., min_length=3, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None

class ReportVerifyRequest(BaseModel):
    status: str = Field(..., pattern="^(Verified|Rejected|Resolved)$")
    verification_notes: str = Field(..., min_length=3, max_length=1000)
    verified_by: str = Field(..., min_length=2, max_length=100)
    target_drain_id: Optional[str] = None

class TaskCreate(BaseModel):
    drain_id: str
    source_report_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=5, max_length=1000)
    priority: str = Field(..., pattern="^(Low|Medium|High|Critical)$")
    assigned_crew: str = Field(..., min_length=2, max_length=100)
    due_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    estimated_duration_hours: Optional[float] = Field(None, ge=0.5, le=100.0)

class TaskCompleteRequest(BaseModel):
    completed_by: str = Field(..., min_length=2, max_length=100)
    completion_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    actions_taken: str = Field(..., min_length=5, max_length=1000)
    waste_removed_kg: float = Field(0.0, ge=0.0)
    post_condition: str = Field(..., pattern="^(Cleared|Repaired|Re-inspection Required)$")
    notes: Optional[str] = None

class InspectionCreate(BaseModel):
    drain_id: str
    inspector_name: str = Field(..., min_length=2, max_length=100)
    inspection_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    blockage_percentage: float = Field(..., ge=0.0, le=100.0)
    structural_condition: str = Field(..., pattern="^(Good|Fair|Poor|Failing)$")
    silt_depth_cm: float = Field(0.0, ge=0.0)
    flow_rate_estimate: str = Field(..., pattern="^(Normal|Sluggish|Stagnant|Backflow)$")
    notes: Optional[str] = None
