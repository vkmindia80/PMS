from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class TeamType(str, Enum):
    DEVELOPMENT = "development"
    DESIGN = "design"
    MARKETING = "marketing"
    SALES = "sales"
    SUPPORT = "support"
    OPERATIONS = "operations"
    MANAGEMENT = "management"
    CROSS_FUNCTIONAL = "cross_functional"

class TeamMemberRole(str, Enum):
    LEAD = "lead"
    SENIOR = "senior"
    REGULAR = "regular"
    JUNIOR = "junior"
    INTERN = "intern"

class TeamMember(BaseModel):
    """Team member with role information"""
    user_id: str = Field(..., description="User ID")
    role: TeamMemberRole = Field(default=TeamMemberRole.REGULAR, description="Role in team")
    joined_at: Optional[datetime] = Field(None, description="When user joined the team")
    responsibilities: List[str] = Field(default_factory=list, description="Member responsibilities")
    skills: List[str] = Field(default_factory=list, description="Member skills")
    
class TeamSettings(BaseModel):
    """Team configuration settings"""
    default_project_role: str = Field(default="member", description="Default role for team members in projects")
    auto_assign_tasks: bool = Field(default=False, description="Auto-assign tasks to available members")
    require_approval: bool = Field(default=False, description="Require approval for team membership")
    notification_settings: Dict[str, bool] = Field(default_factory=dict, description="Team notification preferences")
    working_hours: Dict[str, str] = Field(default_factory=dict, description="Team working hours")
    
class TeamBase(BaseModel):
    """Base team model"""
    name: str = Field(..., min_length=1, max_length=100, description="Team name")
    description: Optional[str] = Field(None, max_length=500, description="Team description")
    type: TeamType = Field(default=TeamType.CROSS_FUNCTIONAL, description="Team type/category")
    
    # Organization and leadership
    organization_id: str = Field(..., description="Organization the team belongs to")
    lead_id: Optional[str] = Field(None, description="Team lead user ID")
    
    # Members
    members: List[TeamMember] = Field(default_factory=list, description="Team members")
    
    # Configuration
    settings: TeamSettings = Field(default_factory=TeamSettings, description="Team settings")
    
    # Metadata
    tags: List[str] = Field(default_factory=list, description="Team tags")
    is_active: bool = Field(default=True, description="Whether team is active")
    
class TeamCreate(BaseCreateModel, TeamBase):
    """Team creation model"""
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Frontend Development Team",
                "description": "Team responsible for frontend development and UI/UX",
                "type": "development",
                "organization_id": "org-123",
                "lead_id": "user-456",
                "members": [
                    {
                        "user_id": "user-789",
                        "role": "senior",
                        "responsibilities": ["React development", "Code reviews"],
                        "skills": ["React", "TypeScript", "CSS"]
                    }
                ],
                "tags": ["frontend", "react", "ui-ux"]
            }
        }

class TeamUpdate(BaseUpdateModel):
    """Team update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    type: Optional[TeamType] = None
    lead_id: Optional[str] = None
    members: Optional[List[TeamMember]] = None
    settings: Optional[TeamSettings] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

class Team(BaseDBModel, TeamBase):
    """Team response model"""
    # Computed fields
    member_count: int = Field(default=0, description="Number of team members")
    active_project_count: int = Field(default=0, description="Number of active projects")
    
    @property
    def has_lead(self) -> bool:
        return self.lead_id is not None
    
    def get_member_by_user_id(self, user_id: str) -> Optional[TeamMember]:
        """Get team member by user ID"""
        return next((m for m in self.members if m.user_id == user_id), None)

class TeamInDB(Team):
    """Team model as stored in database"""
    # Additional database fields
    project_assignments: List[str] = Field(default_factory=list, description="Assigned project IDs")
    performance_metrics: Dict = Field(default_factory=dict, description="Team performance data")

class TeamSummary(BaseModel):
    """Lightweight team model for lists"""
    id: str
    name: str
    type: TeamType
    member_count: int
    lead_id: Optional[str]
    active_project_count: int
    is_active: bool

class TeamStats(BaseModel):
    """Team statistics and metrics"""
    team_id: str
    total_members: int
    active_members: int
    total_projects: int
    active_projects: int
    completed_projects: int
    total_tasks: int
    completed_tasks: int
    task_completion_rate: float = Field(default=0.0)
    average_task_completion_time: Optional[float] = Field(None, description="Average completion time in hours")
    
    @property
    def project_success_rate(self) -> float:
        if self.total_projects == 0:
            return 0.0
        return (self.completed_projects / self.total_projects) * 100