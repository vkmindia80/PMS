from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class UserRole(str, Enum):
    """User roles for role-based access control"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    TEAM_LEAD = "team_lead"
    MEMBER = "member"
    VIEWER = "viewer"

class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"

class User(BaseDBModel):
    """User model with comprehensive profile and authentication fields"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "john.doe@company.com",
                "username": "johndoe",
                "first_name": "John",
                "last_name": "Doe",
                "role": "member",
                "is_active": True,
                "phone": "+1234567890",
                "bio": "Senior Software Developer"
            }
        }
    )
    
    # Authentication fields
    email: EmailStr = Field(..., description="User email address", index=True)
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password_hash: Optional[str] = Field(None, description="Hashed password")
    
    # Profile information
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, description="Phone number")
    bio: Optional[str] = Field(None, max_length=500, description="User biography")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    
    # Role and permissions
    role: UserRole = Field(default=UserRole.MEMBER, description="User role")
    organization_id: str = Field(..., description="Organization ID", index=True)
    
    # Account status
    is_active: bool = Field(default=True, description="Account active status")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="Account status")
    
    # Authentication tokens
    email_verified: bool = Field(default=False, description="Email verification status")
    email_verification_token: Optional[str] = Field(None, description="Email verification token")
    password_reset_token: Optional[str] = Field(None, description="Password reset token")
    password_reset_expires: Optional[datetime] = Field(None, description="Password reset expiration")
    
    # Login tracking
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    login_count: int = Field(default=0, description="Total login count")
    
    # Preferences
    timezone: str = Field(default="UTC", description="User timezone")
    language: str = Field(default="en", description="Preferred language")
    theme: str = Field(default="light", description="UI theme preference")
    notifications_enabled: bool = Field(default=True, description="Email notifications enabled")
    
    # Profile completion
    profile_completed: bool = Field(default=False, description="Profile completion status")
    onboarding_completed: bool = Field(default=False, description="Onboarding completion status")
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional user metadata")

class UserCreate(BaseCreateModel):
    """Schema for creating new users"""
    model_config = ConfigDict(
        json_schema_extra={
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
    )
    
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password: str = Field(..., min_length=8, description="Password")
    confirm_password: str = Field(..., description="Password confirmation")
    
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, description="Phone number")
    bio: Optional[str] = Field(None, max_length=500, description="User biography")
    
    role: UserRole = Field(default=UserRole.MEMBER, description="User role")
    organization_id: str = Field(..., description="Organization ID")
    
    # Optional preferences
    timezone: Optional[str] = Field("UTC", description="User timezone")
    language: Optional[str] = Field("en", description="Preferred language")

class UserUpdate(BaseUpdateModel):
    """Schema for updating user information"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "phone": "+1234567890",
                "bio": "Senior Software Developer with 5+ years experience",
                "timezone": "America/New_York",
                "theme": "dark"
            }
        }
    )
    
    first_name: Optional[str] = Field(None, min_length=1, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, description="Phone number")
    bio: Optional[str] = Field(None, max_length=500, description="User biography")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    
    # Role can only be updated by admins
    role: Optional[UserRole] = Field(None, description="User role")
    is_active: Optional[bool] = Field(None, description="Account active status")
    status: Optional[UserStatus] = Field(None, description="Account status")
    
    # Preferences
    timezone: Optional[str] = Field(None, description="User timezone")
    language: Optional[str] = Field(None, description="Preferred language")
    theme: Optional[str] = Field(None, description="UI theme preference")
    notifications_enabled: Optional[bool] = Field(None, description="Email notifications enabled")
    
    # Profile flags
    profile_completed: Optional[bool] = Field(None, description="Profile completion status")
    onboarding_completed: Optional[bool] = Field(None, description="Onboarding completion status")
    
    # Additional metadata
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional user metadata")

class UserInDB(User):
    """User model as stored in database with sensitive fields"""
    pass

class UserResponse(BaseModel):
    """User response model without sensitive information"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "john.doe@company.com",
                "username": "johndoe",
                "first_name": "John",
                "last_name": "Doe",
                "role": "member",
                "is_active": True,
                "created_at": "2023-01-01T00:00:00Z"
            }
        }
    )
    
    id: str
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: UserRole
    organization_id: str
    is_active: bool
    status: UserStatus
    email_verified: bool
    last_login: Optional[datetime] = None
    timezone: str
    language: str
    theme: str
    notifications_enabled: bool
    profile_completed: bool
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime

class UserLogin(BaseModel):
    """User login schema"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@company.com",
                "password": "securepassword123"
            }
        }
    )
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

class PasswordReset(BaseModel):
    """Password reset request schema"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@company.com"
            }
        }
    )
    
    email: EmailStr = Field(..., description="User email address")

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "token": "reset-token-here",
                "new_password": "newsecurepassword123",
                "confirm_password": "newsecurepassword123"
            }
        }
    )
    
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., description="Password confirmation")

class PasswordChange(BaseModel):
    """Password change schema"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "currentpassword123",
                "new_password": "newsecurepassword123"
            }
        }
    )
    
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
