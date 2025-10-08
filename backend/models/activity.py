"""
Activity Model for tracking project and task activities
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Activity(BaseModel):
    """Activity tracking model for project and task actions"""
    id: str
    entity_type: str  # 'project', 'task', 'milestone', 'comment', 'file', 'tab_navigation'
    entity_id: str
    action_type: str  # 'created', 'updated', 'deleted', 'completed', 'status_changed', 'assigned', 'commented', 'viewed', 'tab_switched', etc.
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    description: str  # Human-readable description of the activity
    metadata: Optional[Dict[str, Any]] = {}  # Additional context (old_value, new_value, tab_name, etc.)
    organization_id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    # Enhanced tracking fields
    tab_name: Optional[str] = None  # Which tab the activity occurred in
    session_id: Optional[str] = None  # User session identifier
    user_agent: Optional[str] = None  # Browser/device info
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ActivityCreate(BaseModel):
    """Schema for creating a new activity"""
    entity_type: str
    entity_id: str
    action_type: str
    description: str
    metadata: Optional[Dict[str, Any]] = {}
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    # Geolocation fields (optional)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: Optional[float] = None
    geolocation_enabled: bool = False
    # Enhanced tracking fields
    tab_name: Optional[str] = None
    session_id: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None


class ActivityFilter(BaseModel):
    """Schema for filtering activities"""
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    user_id: Optional[str] = None
    action_type: Optional[str] = None
    limit: int = 50
    offset: int = 0


class ActivityStats(BaseModel):
    """Activity statistics"""
    total_activities: int
    activities_by_type: Dict[str, int]
    activities_by_action: Dict[str, int]
    most_active_users: List[Dict[str, Any]]
    recent_activity_count: int  # Last 24 hours
