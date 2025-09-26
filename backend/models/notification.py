from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class NotificationType(str, Enum):
    # Task notifications
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_OVERDUE = "task_overdue"
    TASK_COMMENTED = "task_commented"
    TASK_STATUS_CHANGED = "task_status_changed"
    
    # Project notifications
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    PROJECT_DEADLINE_APPROACHING = "project_deadline_approaching"
    PROJECT_COMPLETED = "project_completed"
    PROJECT_TEAM_ADDED = "project_team_added"
    
    # Team notifications
    TEAM_MEMBER_ADDED = "team_member_added"
    TEAM_MEMBER_REMOVED = "team_member_removed"
    TEAM_ROLE_CHANGED = "team_role_changed"
    
    # System notifications
    SYSTEM_MAINTENANCE = "system_maintenance"
    SYSTEM_UPDATE = "system_update"
    ACCOUNT_SECURITY = "account_security"
    
    # Mention notifications
    MENTIONED_IN_COMMENT = "mentioned_in_comment"
    MENTIONED_IN_TASK = "mentioned_in_task"
    
    # File notifications
    FILE_UPLOADED = "file_uploaded"
    FILE_SHARED = "file_shared"
    
    # General
    CUSTOM = "custom"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    WEBHOOK = "webhook"

class NotificationAction(BaseModel):
    """Notification action button"""
    label: str = Field(..., description="Action button label")
    action_type: str = Field(..., description="Type of action")
    url: Optional[str] = Field(None, description="Action URL")
    data: Dict[str, Any] = Field(default_factory=dict, description="Action data")

class NotificationBase(BaseModel):
    """Base notification model"""
    # Recipient
    user_id: str = Field(..., description="User who should receive the notification")
    
    # Content
    title: str = Field(..., min_length=1, max_length=200, description="Notification title")
    message: str = Field(..., min_length=1, max_length=1000, description="Notification message")
    notification_type: NotificationType = Field(..., description="Type of notification")
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="Notification priority")
    
    # Source information
    sender_id: Optional[str] = Field(None, description="User who triggered the notification")
    entity_type: Optional[str] = Field(None, description="Type of related entity")
    entity_id: Optional[str] = Field(None, description="ID of related entity")
    
    # Delivery channels
    channels: List[NotificationChannel] = Field(default_factory=lambda: [NotificationChannel.IN_APP], 
                                              description="Delivery channels")
    
    # Status and timing
    is_read: bool = Field(default=False, description="Whether notification has been read")
    read_at: Optional[datetime] = Field(None, description="When notification was read")
    
    # Scheduling
    send_at: Optional[datetime] = Field(None, description="When to send notification (for scheduled)")
    expires_at: Optional[datetime] = Field(None, description="When notification expires")
    
    # Actions
    actions: List[NotificationAction] = Field(default_factory=list, description="Action buttons")
    
    # Data and context
    data: Dict[str, Any] = Field(default_factory=dict, description="Additional notification data")
    
    # Delivery status
    delivery_status: Dict[NotificationChannel, Dict] = Field(default_factory=dict, 
                                                           description="Delivery status per channel")

class NotificationCreate(BaseCreateModel, NotificationBase):
    """Notification creation model"""
    model_config = ConfigDict(
        json_schema_extra = {
            "example": {
                "user_id": "user-123",
                "title": "New Task Assigned",
                "message": "You have been assigned a new task: 'Implement user authentication'",
                "notification_type": "task_assigned",
                "priority": "normal",
                "sender_id": "user-456",
                "entity_type": "task",
                "entity_id": "task-789",
                "channels": ["in_app", "email"],
                "actions": [
                    {
                        "label": "View Task",
                        "action_type": "navigate",
                        "url": "/tasks/task-789"
                    }
                ],
                "data": {
                    "task_name": "Implement user authentication",
                    "project_name": "Mobile App Development",
                    "due_date": "2024-02-15"
                }
            }
        }

class NotificationUpdate(BaseUpdateModel):
    """Notification update model"""
    is_read: Optional[bool] = None
    read_at: Optional[datetime] = None
    delivery_status: Optional[Dict[NotificationChannel, Dict]] = None

class Notification(BaseDBModel, NotificationBase):
    """Notification response model"""
    # Additional computed fields
    age_minutes: Optional[int] = Field(None, description="Minutes since creation")
    
    @property
    def is_urgent(self) -> bool:
        return self.priority == NotificationPriority.URGENT
    
    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return self.expires_at < datetime.utcnow()
    
    @property
    def is_scheduled(self) -> bool:
        if not self.send_at:
            return False
        return self.send_at > datetime.utcnow()
    
    def mark_as_read(self) -> None:
        """Mark notification as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()

class NotificationInDB(Notification):
    """Notification model as stored in database"""
    # Additional database fields
    retry_count: int = Field(default=0, description="Delivery retry count")
    last_retry_at: Optional[datetime] = Field(None, description="Last retry timestamp")
    
class NotificationSummary(BaseModel):
    """Lightweight notification model for lists"""
    id: str
    title: str
    notification_type: NotificationType
    priority: NotificationPriority
    is_read: bool
    created_at: datetime
    sender_id: Optional[str]
    
    @property
    def preview_message(self) -> str:
        """Get preview of notification message"""
        return self.title if len(self.title) <= 50 else f"{self.title[:47]}..."

class NotificationStats(BaseModel):
    """Notification statistics for a user"""
    user_id: str
    total_notifications: int = Field(default=0)
    unread_count: int = Field(default=0)
    read_count: int = Field(default=0)
    
    # By priority
    urgent_count: int = Field(default=0)
    high_count: int = Field(default=0)
    normal_count: int = Field(default=0)
    low_count: int = Field(default=0)
    
    # By type
    type_breakdown: Dict[NotificationType, int] = Field(default_factory=dict)
    
    # Recent activity
    recent_notifications: List[NotificationSummary] = Field(default_factory=list)
    last_read_at: Optional[datetime] = Field(None)
    
    @property
    def unread_percentage(self) -> float:
        if self.total_notifications == 0:
            return 0.0
        return (self.unread_count / self.total_notifications) * 100

class NotificationPreferences(BaseModel):
    """User notification preferences"""
    user_id: str = Field(..., description="User ID")
    
    # Channel preferences by notification type
    channel_preferences: Dict[NotificationType, List[NotificationChannel]] = Field(
        default_factory=dict, description="Preferred channels for each notification type")
    
    # Global settings
    global_enabled: bool = Field(default=True, description="Global notification toggle")
    email_enabled: bool = Field(default=True, description="Email notifications enabled")
    push_enabled: bool = Field(default=True, description="Push notifications enabled")
    sms_enabled: bool = Field(default=False, description="SMS notifications enabled")
    
    # Quiet hours
    quiet_hours_enabled: bool = Field(default=False, description="Quiet hours enabled")
    quiet_hours_start: Optional[str] = Field(None, description="Quiet hours start time (HH:MM)")
    quiet_hours_end: Optional[str] = Field(None, description="Quiet hours end time (HH:MM)")
    quiet_hours_timezone: str = Field(default="UTC", description="Quiet hours timezone")
    
    # Frequency settings
    digest_enabled: bool = Field(default=False, description="Email digest enabled")
    digest_frequency: str = Field(default="daily", description="Digest frequency (daily/weekly)")
    digest_time: str = Field(default="09:00", description="Digest delivery time")
    
    # Advanced settings
    auto_read_on_web_view: bool = Field(default=True, description="Auto-mark as read when viewed on web")
    group_similar_notifications: bool = Field(default=True, description="Group similar notifications")
    
    model_config = ConfigDict(
        json_schema_extra = {
            "example": {
                "user_id": "user-123",
                "channel_preferences": {
                    "task_assigned": ["in_app", "email"],
                    "task_overdue": ["in_app", "email", "push"],
                    "mentioned_in_comment": ["in_app", "push"]
                },
                "email_enabled": True,
                "push_enabled": True,
                "quiet_hours_enabled": True,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "08:00",
                "digest_enabled": True,
                "digest_frequency": "daily"
            }
        }