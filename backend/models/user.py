from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from enum import Enum
from datetime import datetime
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    TEAM_LEAD = "team_lead"
    MEMBER = "member"
    VIEWER = "viewer"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"

class UserBase(BaseModel):
    """Base user model with common fields"""
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    first_name: str = Field(..., min_length=1, max_length=100, description="User first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="User last name")
    role: UserRole = Field(default=UserRole.MEMBER, description="User role in organization")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="User account status")
    organization_id: Optional[str] = Field(None, description="Organization the user belongs to")
    avatar_url: Optional[str] = Field(None, description="User avatar image URL")
    bio: Optional[str] = Field(None, max_length=500, description="User biography")
    phone: Optional[str] = Field(None, description="User phone number")
    timezone: Optional[str] = Field("UTC", description="User timezone")
    language: Optional[str] = Field("en", description="User preferred language")
    
    # Permissions and preferences
    permissions: List[str] = Field(default_factory=list, description="User specific permissions")
    notification_preferences: dict = Field(default_factory=dict, description="Notification settings")
    
    # Profile settings
    is_active: bool = Field(default=True, description="Whether user account is active")
    is_verified: bool = Field(default=False, description="Whether user email is verified")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")

class UserCreate(BaseCreateModel, UserBase):
    """User creation model"""
    password: str = Field(..., min_length=8, description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    
    class Config:
        schema_extra = {
            "example": {
                "email": "john.doe@company.com",
                "username": "johndoe",
                "first_name": "John",
                "last_name": "Doe",
                "password": "securepassword123",
                "confirm_password": "securepassword123",
                "role": "member",
                "phone": "+1234567890",
                "bio": "Senior Software Developer"
            }
        }

class UserUpdate(BaseUpdateModel):
    """User update model"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    permissions: Optional[List[str]] = None
    notification_preferences: Optional[dict] = None
    is_active: Optional[bool] = None

class User(BaseDBModel, UserBase):
    """User response model"""
    pass

class UserInDB(User):
    """User model as stored in database"""
    password_hash: str = Field(..., description="Hashed password")
    email_verification_token: Optional[str] = Field(None, description="Email verification token")
    password_reset_token: Optional[str] = Field(None, description="Password reset token")
    password_reset_expires: Optional[datetime] = Field(None, description="Password reset expiration")

class UserProfile(BaseModel):
    """Public user profile model"""
    id: str
    username: str
    first_name: str
    last_name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    role: UserRole
    is_active: bool
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"