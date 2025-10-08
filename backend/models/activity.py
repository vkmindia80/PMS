"""
Activity Model for tracking project and task activities
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class Activity(BaseModel):
    """Activity tracking model for project and task actions"""
    id: str
    entity_type: str  # 'project', 'task', 'milestone', 'comment', 'file'
    entity_id: str
    action_type: str  # 'created', 'updated', 'deleted', 'completed', 'status_changed', 'assigned', 'commented', etc.
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    description: str  # Human-readable description of the activity
    metadata: Optional[Dict[str, Any]] = {}  # Additional context (old_value, new_value, etc.)
    organization_id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
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
