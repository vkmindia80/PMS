from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime, date
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class ProjectStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

class ProjectPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ProjectVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    TEAM = "team"

class ProjectBudget(BaseModel):
    """Project budget information"""
    total_budget: Optional[float] = Field(None, description="Total project budget")
    spent_amount: float = Field(default=0.0, description="Amount spent so far")
    currency: str = Field(default="USD", description="Budget currency")
    
    @property
    def remaining_budget(self) -> Optional[float]:
        if self.total_budget is None:
            return None
        return self.total_budget - self.spent_amount
    
    @property
    def budget_utilization(self) -> Optional[float]:
        if self.total_budget is None or self.total_budget == 0:
            return None
        return (self.spent_amount / self.total_budget) * 100

class ProjectMilestone(BaseModel):
    """Project milestone"""
    id: str = Field(..., description="Milestone ID")
    title: str = Field(..., description="Milestone title")
    description: Optional[str] = Field(None, description="Milestone description")
    due_date: Optional[date] = Field(None, description="Milestone due date")
    completed: bool = Field(default=False, description="Whether milestone is completed")
    completed_at: Optional[datetime] = Field(None, description="Milestone completion date")

class ProjectSettings(BaseModel):
    """Project configuration settings"""
    auto_assign_tasks: bool = Field(default=False, description="Automatically assign tasks")
    require_time_tracking: bool = Field(default=False, description="Require time tracking for tasks")
    allow_guest_access: bool = Field(default=False, description="Allow guest access to project")
    notification_settings: Dict[str, bool] = Field(default_factory=dict, description="Notification preferences")
    custom_fields: Dict[str, any] = Field(default_factory=dict, description="Custom project fields")

class ProjectBase(BaseModel):
    """Base project model"""
    name: str = Field(..., min_length=1, max_length=200, description="Project name")
    description: Optional[str] = Field(None, max_length=2000, description="Project description")
    status: ProjectStatus = Field(default=ProjectStatus.PLANNING, description="Project status")
    priority: ProjectPriority = Field(default=ProjectPriority.MEDIUM, description="Project priority")
    visibility: ProjectVisibility = Field(default=ProjectVisibility.TEAM, description="Project visibility")
    
    # Dates
    start_date: Optional[date] = Field(None, description="Project start date")
    due_date: Optional[date] = Field(None, description="Project due date")
    
    # Ownership and team
    organization_id: str = Field(..., description="Organization the project belongs to")
    owner_id: str = Field(..., description="Project owner/manager ID")
    team_members: List[str] = Field(default_factory=list, description="Project team member IDs")
    
    # Budget and resources
    budget: ProjectBudget = Field(default_factory=ProjectBudget, description="Project budget information")
    
    # Milestones
    milestones: List[ProjectMilestone] = Field(default_factory=list, description="Project milestones")
    
    # Configuration
    settings: ProjectSettings = Field(default_factory=ProjectSettings, description="Project settings")
    
    # Tags and categories
    tags: List[str] = Field(default_factory=list, description="Project tags")
    category: Optional[str] = Field(None, description="Project category")
    
    # Progress tracking
    progress_percentage: float = Field(default=0.0, ge=0, le=100, description="Project completion percentage")

class ProjectCreate(BaseCreateModel, ProjectBase):
    """Project creation model"""
    class Config:
        schema_extra = {
            "example": {
                "name": "Mobile App Development",
                "description": "Develop a new mobile application for customer engagement",
                "status": "planning",
                "priority": "high",
                "visibility": "team",
                "start_date": "2024-01-15",
                "due_date": "2024-06-30",
                "organization_id": "org-123",
                "owner_id": "user-456",
                "team_members": ["user-789", "user-012"],
                "category": "Software Development",
                "tags": ["mobile", "react-native", "app"]
            }
        }

class ProjectUpdate(BaseUpdateModel):
    """Project update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    visibility: Optional[ProjectVisibility] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    team_members: Optional[List[str]] = None
    budget: Optional[ProjectBudget] = None
    milestones: Optional[List[ProjectMilestone]] = None
    settings: Optional[ProjectSettings] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    progress_percentage: Optional[float] = Field(None, ge=0, le=100)

class Project(BaseDBModel, ProjectBase):
    """Project response model"""
    # Computed fields
    task_count: int = Field(default=0, description="Number of tasks in project")
    completed_task_count: int = Field(default=0, description="Number of completed tasks")
    
    @property
    def task_completion_rate(self) -> float:
        if self.task_count == 0:
            return 0.0
        return (self.completed_task_count / self.task_count) * 100
    
    @property
    def is_overdue(self) -> bool:
        if not self.due_date:
            return False
        return self.due_date < date.today() and self.status not in [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]

class ProjectInDB(Project):
    """Project model as stored in database"""
    # Additional database-specific fields
    archived_at: Optional[datetime] = Field(None, description="Project archival timestamp")
    archived_by: Optional[str] = Field(None, description="ID of user who archived the project")

class ProjectSummary(BaseModel):
    """Lightweight project model for lists"""
    id: str
    name: str
    status: ProjectStatus
    priority: ProjectPriority
    progress_percentage: float
    due_date: Optional[date]
    owner_id: str
    task_count: int
    team_member_count: int = Field(default=0)
    
    @property
    def is_overdue(self) -> bool:
        if not self.due_date:
            return False
        return self.due_date < date.today() and self.status not in [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]