from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime, date
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskType(str, Enum):
    TASK = "task"
    BUG = "bug"
    FEATURE = "feature"
    IMPROVEMENT = "improvement"
    RESEARCH = "research"

class TaskTimeTracking(BaseModel):
    """Task time tracking information"""
    estimated_hours: Optional[float] = Field(None, description="Estimated time to complete (hours)")
    actual_hours: float = Field(default=0.0, description="Actual time spent (hours)")
    logged_time: List[Dict] = Field(default_factory=list, description="Time log entries")
    
    @property
    def time_variance(self) -> Optional[float]:
        if self.estimated_hours is None:
            return None
        return self.actual_hours - self.estimated_hours

class TaskDependency(BaseModel):
    """Task dependency relationship"""
    task_id: str = Field(..., description="Dependent task ID")
    dependency_type: str = Field(default="blocks", description="Type of dependency")

class TaskBase(BaseModel):
    """Base task model"""
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=2000, description="Task description")
    status: TaskStatus = Field(default=TaskStatus.TODO, description="Task status")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task priority")
    type: TaskType = Field(default=TaskType.TASK, description="Task type")
    
    # Relationships
    project_id: str = Field(..., description="Project the task belongs to")
    assignee_id: Optional[str] = Field(None, description="User assigned to the task")
    reporter_id: str = Field(..., description="User who created the task")
    parent_task_id: Optional[str] = Field(None, description="Parent task for subtasks")
    
    # Dates and tracking
    due_date: Optional[datetime] = Field(None, description="Task due date and time")
    start_date: Optional[datetime] = Field(None, description="Task start date")
    completed_at: Optional[datetime] = Field(None, description="Task completion timestamp")
    
    # Time tracking
    time_tracking: TaskTimeTracking = Field(default_factory=TaskTimeTracking, description="Time tracking data")
    
    # Dependencies and relationships
    dependencies: List[TaskDependency] = Field(default_factory=list, description="Task dependencies")
    subtasks: List[str] = Field(default_factory=list, description="Subtask IDs")
    
    # Organization and labels
    tags: List[str] = Field(default_factory=list, description="Task tags")
    labels: List[str] = Field(default_factory=list, description="Task labels")
    
    # Custom fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict, description="Custom task fields")
    
    # Progress
    progress_percentage: float = Field(default=0.0, ge=0, le=100, description="Task completion percentage")

class TaskCreate(BaseCreateModel, TaskBase):
    """Task creation model"""
    class Config:
        schema_extra = {
            "example": {
                "title": "Implement user authentication",
                "description": "Add JWT-based authentication system to the application",
                "status": "todo",
                "priority": "high",
                "type": "feature",
                "project_id": "project-123",
                "assignee_id": "user-456",
                "reporter_id": "user-789",
                "due_date": "2024-02-15T17:00:00Z",
                "tags": ["authentication", "security"],
                "time_tracking": {
                    "estimated_hours": 16.0
                }
            }
        }

class TaskUpdate(BaseUpdateModel):
    """Task update model"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    type: Optional[TaskType] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    time_tracking: Optional[TaskTimeTracking] = None
    dependencies: Optional[List[TaskDependency]] = None
    subtasks: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    labels: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    progress_percentage: Optional[float] = Field(None, ge=0, le=100)

class Task(BaseDBModel, TaskBase):
    """Task response model"""
    # Computed fields
    subtask_count: int = Field(default=0, description="Number of subtasks")
    comment_count: int = Field(default=0, description="Number of comments")
    attachment_count: int = Field(default=0, description="Number of attachments")
    
    @property
    def is_overdue(self) -> bool:
        if not self.due_date:
            return False
        return (self.due_date < datetime.utcnow() and 
                self.status not in [TaskStatus.COMPLETED, TaskStatus.CANCELLED])
    
    @property
    def is_subtask(self) -> bool:
        return self.parent_task_id is not None
    
    @property
    def has_dependencies(self) -> bool:
        return len(self.dependencies) > 0

class TaskInDB(Task):
    """Task model as stored in database"""
    # Additional database-specific fields
    activity_log: List[Dict] = Field(default_factory=list, description="Task activity history")
    watchers: List[str] = Field(default_factory=list, description="Users watching this task")

class TaskSummary(BaseModel):
    """Lightweight task model for lists"""
    id: str
    title: str
    status: TaskStatus
    priority: TaskPriority
    type: TaskType
    project_id: str
    assignee_id: Optional[str]
    due_date: Optional[datetime]
    progress_percentage: float
    subtask_count: int = Field(default=0)
    
    @property
    def is_overdue(self) -> bool:
        if not self.due_date:
            return False
        return (self.due_date < datetime.utcnow() and 
                self.status not in [TaskStatus.COMPLETED, TaskStatus.CANCELLED])

class TaskActivity(BaseModel):
    """Task activity/history entry"""
    id: str
    task_id: str
    user_id: str
    action: str = Field(..., description="Type of action performed")
    details: Dict = Field(default_factory=dict, description="Activity details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        schema_extra = {
            "example": {
                "id": "activity-123",
                "task_id": "task-456",
                "user_id": "user-789",
                "action": "status_changed",
                "details": {
                    "from": "todo",
                    "to": "in_progress"
                },
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }