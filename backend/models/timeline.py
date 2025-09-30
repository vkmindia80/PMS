from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from .base import BaseDBModel


class DependencyType(str, Enum):
    """Task dependency types following Microsoft Project standard"""
    FINISH_TO_START = "FS"  # Finish-to-Start (most common)
    START_TO_START = "SS"   # Start-to-Start
    FINISH_TO_FINISH = "FF" # Finish-to-Finish
    START_TO_FINISH = "SF"  # Start-to-Finish


class LagFormat(str, Enum):
    """Lag time format options"""
    DAYS = "days"
    HOURS = "hours"
    PERCENTAGE = "percentage"


class ConstraintType(str, Enum):
    """Task constraint types for scheduling"""
    AS_SOON_AS_POSSIBLE = "ASAP"
    AS_LATE_AS_POSSIBLE = "ALAP"
    MUST_START_ON = "MSO"
    MUST_FINISH_ON = "MFO"
    START_NO_EARLIER_THAN = "SNET"
    START_NO_LATER_THAN = "SNLT"
    FINISH_NO_EARLIER_THAN = "FNET"
    FINISH_NO_LATER_THAN = "FNLT"


class TimelineViewMode(str, Enum):
    """Timeline view zoom levels"""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


# Task Dependency Model
class TaskDependency(BaseDBModel):
    """Task dependency model for Gantt chart relationships"""
    
    predecessor_id: str = Field(..., description="ID of the predecessor task")
    successor_id: str = Field(..., description="ID of the successor task")
    dependency_type: DependencyType = Field(default=DependencyType.FINISH_TO_START, description="Type of dependency relationship")
    lag_duration: int = Field(default=0, description="Lag time duration (can be negative for lead time)")
    lag_format: LagFormat = Field(default=LagFormat.DAYS, description="Format of lag time")
    project_id: str = Field(..., description="ID of the project containing both tasks")
    created_by: str = Field(..., description="ID of user who created the dependency")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "dep-001",
                "predecessor_id": "task-001",
                "successor_id": "task-002",
                "dependency_type": "FS",
                "lag_duration": 2,
                "lag_format": "days",
                "project_id": "proj-001",
                "created_by": "user-001",
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:00:00Z"
            }
        }
    )


class TaskDependencyCreate(BaseModel):
    """Schema for creating task dependencies"""
    
    predecessor_id: str
    successor_id: str
    dependency_type: DependencyType = DependencyType.FINISH_TO_START
    lag_duration: int = 0
    lag_format: LagFormat = LagFormat.DAYS
    project_id: str


class TaskDependencyUpdate(BaseModel):
    """Schema for updating task dependencies"""
    
    dependency_type: Optional[DependencyType] = None
    lag_duration: Optional[int] = None
    lag_format: Optional[LagFormat] = None


class TaskDependencyInDB(TaskDependency):
    """Task dependency model with database-specific fields"""
    pass


# Enhanced Timeline Task Model
class TimelineTask(BaseDBModel):
    """Enhanced task model with timeline-specific fields for Gantt chart"""
    
    name: str = Field(..., description="Task name")
    description: Optional[str] = Field(default="", description="Task description")
    project_id: str = Field(..., description="ID of the project this task belongs to")
    
    # Timeline-specific fields
    duration: int = Field(default=8, description="Task duration in hours")
    work: int = Field(default=8, description="Work effort in hours")
    start_date: datetime = Field(..., description="Planned start date and time")
    finish_date: datetime = Field(..., description="Planned finish date and time")
    actual_start: Optional[datetime] = Field(default=None, description="Actual start date and time")
    actual_finish: Optional[datetime] = Field(default=None, description="Actual finish date and time")
    
    # Progress tracking
    percent_complete: float = Field(default=0.0, ge=0, le=100, description="Completion percentage (0-100)")
    remaining_work: Optional[int] = Field(default=None, description="Remaining work in hours")
    
    # Timeline hierarchy
    outline_level: int = Field(default=1, ge=1, description="Task hierarchy level (1=top level)")
    summary_task: bool = Field(default=False, description="Whether this is a summary task")
    parent_task_id: Optional[str] = Field(default=None, description="ID of parent summary task")
    
    # Scheduling
    critical: bool = Field(default=False, description="Whether task is on critical path")
    free_float: int = Field(default=0, description="Free float in hours")
    total_float: int = Field(default=0, description="Total float in hours")
    constraint_type: ConstraintType = Field(default=ConstraintType.AS_SOON_AS_POSSIBLE, description="Task constraint type")
    constraint_date: Optional[datetime] = Field(default=None, description="Constraint date if applicable")
    
    # Resource assignment
    assignee_ids: List[str] = Field(default_factory=list, description="List of assigned user IDs")
    estimated_hours: Optional[int] = Field(default=None, description="Original estimated hours")
    
    # Calendar and working time
    calendar_id: Optional[str] = Field(default=None, description="Calendar ID for working time")
    
    # Baseline tracking
    baseline_start: Optional[datetime] = Field(default=None, description="Baseline start date")
    baseline_finish: Optional[datetime] = Field(default=None, description="Baseline finish date")
    baseline_duration: Optional[int] = Field(default=None, description="Baseline duration in hours")
    
    # Dependencies (calculated fields)
    predecessor_ids: List[str] = Field(default_factory=list, description="List of predecessor task IDs")
    successor_ids: List[str] = Field(default_factory=list, description="List of successor task IDs")
    
    # Timeline display
    milestone: bool = Field(default=False, description="Whether this is a milestone")
    color: Optional[str] = Field(default=None, description="Custom color for timeline display")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "timeline-task-001",
                "name": "Design Phase",
                "description": "Complete UI/UX design for the application",
                "project_id": "proj-001",
                "duration": 40,
                "work": 40,
                "start_date": "2025-01-08T09:00:00Z",
                "finish_date": "2025-01-13T17:00:00Z",
                "percent_complete": 25.0,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "constraint_type": "ASAP",
                "assignee_ids": ["user-001", "user-002"],
                "milestone": False,
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:00:00Z"
            }
        }
    )


class TimelineTaskCreate(BaseModel):
    """Schema for creating timeline tasks"""
    
    name: str
    description: Optional[str] = ""
    project_id: str
    duration: int = 8
    start_date: datetime
    assignee_ids: List[str] = Field(default_factory=list)
    outline_level: int = 1
    summary_task: bool = False
    parent_task_id: Optional[str] = None
    constraint_type: ConstraintType = ConstraintType.AS_SOON_AS_POSSIBLE
    constraint_date: Optional[datetime] = None
    milestone: bool = False
    color: Optional[str] = None


class TimelineTaskUpdate(BaseModel):
    """Schema for updating timeline tasks"""
    
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    start_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    percent_complete: Optional[float] = None
    assignee_ids: Optional[List[str]] = None
    constraint_type: Optional[ConstraintType] = None
    constraint_date: Optional[datetime] = None
    milestone: Optional[bool] = None
    color: Optional[str] = None


class TimelineTaskInDB(TimelineTask):
    """Timeline task model with database-specific fields"""
    pass


# Timeline Project Configuration
class TimelineProject(BaseMongoModel):
    """Timeline-specific project configuration"""
    
    project_id: str = Field(..., description="Reference to the main project")
    
    # Timeline settings
    default_view_mode: TimelineViewMode = Field(default=TimelineViewMode.WEEK, description="Default timeline view")
    show_critical_path: bool = Field(default=True, description="Whether to highlight critical path")
    show_slack: bool = Field(default=False, description="Whether to show task slack/float")
    
    # Working time configuration
    work_hours_per_day: int = Field(default=8, description="Standard work hours per day")
    work_days_per_week: int = Field(default=5, description="Standard work days per week")
    default_start_time: str = Field(default="09:00", description="Default daily start time (HH:MM)")
    default_end_time: str = Field(default="17:00", description="Default daily end time (HH:MM)")
    
    # Timeline display settings
    timeline_start: Optional[datetime] = Field(default=None, description="Timeline view start date")
    timeline_end: Optional[datetime] = Field(default=None, description="Timeline view end date")
    
    # Baseline management
    baselines: List[Dict[str, Any]] = Field(default_factory=list, description="Project baselines")
    active_baseline: Optional[str] = Field(default=None, description="Active baseline ID")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "timeline-proj-001",
                "project_id": "proj-001",
                "default_view_mode": "week",
                "show_critical_path": True,
                "work_hours_per_day": 8,
                "work_days_per_week": 5,
                "default_start_time": "09:00",
                "default_end_time": "17:00",
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:00:00Z"
            }
        }
    )


class TimelineProjectCreate(BaseModel):
    """Schema for creating timeline project configuration"""
    
    project_id: str
    default_view_mode: TimelineViewMode = TimelineViewMode.WEEK
    show_critical_path: bool = True
    work_hours_per_day: int = 8
    work_days_per_week: int = 5
    default_start_time: str = "09:00"
    default_end_time: str = "17:00"


class TimelineProjectUpdate(BaseModel):
    """Schema for updating timeline project configuration"""
    
    default_view_mode: Optional[TimelineViewMode] = None
    show_critical_path: Optional[bool] = None
    work_hours_per_day: Optional[int] = None
    work_days_per_week: Optional[int] = None
    default_start_time: Optional[str] = None
    default_end_time: Optional[str] = None
    timeline_start: Optional[datetime] = None
    timeline_end: Optional[datetime] = None


class TimelineProjectInDB(TimelineProject):
    """Timeline project model with database-specific fields"""
    pass


# Timeline Calendar Model
class WorkingTimeSlot(BaseModel):
    """Working time slot definition"""
    
    start_time: str = Field(..., description="Start time (HH:MM)")
    end_time: str = Field(..., description="End time (HH:MM)")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "start_time": "09:00",
                "end_time": "12:00"
            }
        }
    )


class DayWorkingTime(BaseModel):
    """Working time definition for a day"""
    
    working: bool = Field(default=True, description="Whether this is a working day")
    time_slots: List[WorkingTimeSlot] = Field(default_factory=list, description="Working time slots")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "working": True,
                "time_slots": [
                    {"start_time": "09:00", "end_time": "12:00"},
                    {"start_time": "13:00", "end_time": "17:00"}
                ]
            }
        }
    )


class TimelineCalendar(BaseMongoModel):
    """Calendar model for timeline working time definitions"""
    
    name: str = Field(..., description="Calendar name")
    description: Optional[str] = Field(default="", description="Calendar description")
    project_id: str = Field(..., description="Project this calendar belongs to")
    
    # Weekly working time pattern
    monday: DayWorkingTime = Field(default_factory=lambda: DayWorkingTime(working=True, time_slots=[
        WorkingTimeSlot(start_time="09:00", end_time="12:00"),
        WorkingTimeSlot(start_time="13:00", end_time="17:00")
    ]))
    tuesday: DayWorkingTime = Field(default_factory=lambda: DayWorkingTime(working=True, time_slots=[
        WorkingTimeSlot(start_time="09:00", end_time="12:00"),
        WorkingTimeSlot(start_time="13:00", end_time="17:00")
    ]))
    wednesday: DayWorkingTime = Field(default_factory=lambda: DayWorkingTime(working=True, time_slots=[
        WorkingTimeSlot(start_time="09:00", end_time="12:00"),
        WorkingTimeSlot(start_time="13:00", end_time="17:00")
    ]))
    thursday: DayWorkingTime = Field(default_factory=lambda: DayWorkingTime(working=True, time_slots=[
        WorkingTimeSlot(start_time="09:00", end_time="12:00"),
        WorkingTimeSlot(start_time="13:00", end_time="17:00")
    ]))
    friday: DayWorkingTime = Field(default_factory=lambda: DayWorkingTime(working=True, time_slots=[
        WorkingTimeSlot(start_time="09:00", end_time="12:00"),
        WorkingTimeSlot(start_time="13:00", end_time="17:00")
    ]))
    saturday: DayWorkingTime = Field(default_factory=lambda: DayWorkingTime(working=False))
    sunday: DayWorkingTime = Field(default_factory=lambda: DayWorkingTime(working=False))
    
    # Exceptions (holidays, special working days)
    exceptions: List[Dict[str, Any]] = Field(default_factory=list, description="Calendar exceptions")
    
    # Default calendar flag
    is_default: bool = Field(default=False, description="Whether this is the default calendar")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "calendar-001",
                "name": "Standard Business Hours",
                "description": "Standard 8-hour business day calendar",
                "project_id": "proj-001",
                "is_default": True,
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:00:00Z"
            }
        }
    )


class TimelineCalendarCreate(BaseModel):
    """Schema for creating timeline calendars"""
    
    name: str
    description: Optional[str] = ""
    project_id: str
    is_default: bool = False


class TimelineCalendarUpdate(BaseModel):
    """Schema for updating timeline calendars"""
    
    name: Optional[str] = None
    description: Optional[str] = None
    monday: Optional[DayWorkingTime] = None
    tuesday: Optional[DayWorkingTime] = None
    wednesday: Optional[DayWorkingTime] = None
    thursday: Optional[DayWorkingTime] = None
    friday: Optional[DayWorkingTime] = None
    saturday: Optional[DayWorkingTime] = None
    sunday: Optional[DayWorkingTime] = None
    exceptions: Optional[List[Dict[str, Any]]] = None
    is_default: Optional[bool] = None


class TimelineCalendarInDB(TimelineCalendar):
    """Timeline calendar model with database-specific fields"""
    pass


# Timeline Baseline Model
class TimelineBaseline(BaseMongoModel):
    """Timeline baseline for tracking project progress against original plan"""
    
    name: str = Field(..., description="Baseline name")
    description: Optional[str] = Field(default="", description="Baseline description")
    project_id: str = Field(..., description="Project this baseline belongs to")
    
    # Baseline metadata
    baseline_date: datetime = Field(..., description="Date when baseline was created")
    is_active: bool = Field(default=False, description="Whether this is the active baseline")
    
    # Baseline data (snapshot of tasks at baseline creation)
    baseline_data: Dict[str, Any] = Field(default_factory=dict, description="Baseline task data snapshot")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "baseline-001",
                "name": "Initial Project Plan",
                "description": "Original project schedule approved by stakeholders",
                "project_id": "proj-001",
                "baseline_date": "2025-01-08T10:00:00Z",
                "is_active": True,
                "created_at": "2025-01-08T10:00:00Z",
                "updated_at": "2025-01-08T10:00:00Z"
            }
        }
    )


class TimelineBaselineCreate(BaseModel):
    """Schema for creating timeline baselines"""
    
    name: str
    description: Optional[str] = ""
    project_id: str


class TimelineBaselineUpdate(BaseModel):
    """Schema for updating timeline baselines"""
    
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TimelineBaselineInDB(TimelineBaseline):
    """Timeline baseline model with database-specific fields"""
    pass


# Timeline Response Models
class GanttChartData(BaseModel):
    """Complete Gantt chart data response"""
    
    project_id: str
    tasks: List[TimelineTask]
    dependencies: List[TaskDependency]
    timeline_config: Optional[TimelineProject] = None
    calendars: List[TimelineCalendar] = Field(default_factory=list)
    baselines: List[TimelineBaseline] = Field(default_factory=list)
    critical_path: List[str] = Field(default_factory=list, description="List of critical task IDs")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": "proj-001",
                "tasks": [],
                "dependencies": [],
                "timeline_config": None,
                "calendars": [],
                "baselines": [],
                "critical_path": []
            }
        }
    )


class TimelineStats(BaseModel):
    """Timeline statistics and metrics"""
    
    project_id: str
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    critical_path_length: int
    project_duration_days: int
    total_work_hours: int
    completed_work_hours: int
    project_health_score: float
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": "proj-001",
                "total_tasks": 25,
                "completed_tasks": 8,
                "in_progress_tasks": 5,
                "critical_path_length": 12,
                "project_duration_days": 45,
                "total_work_hours": 1200,
                "completed_work_hours": 380,
                "project_health_score": 87.5
            }
        }
    )