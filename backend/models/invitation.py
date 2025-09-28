from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime
from enum import Enum
from .user import UserRole

class InvitationStatus(str, Enum):
    """Invitation status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"

class SingleInvitation(BaseModel):
    """Single invitation data"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "colleague@company.com",
                "role": "member",
                "message": "Join our team!"
            }
        }
    )
    
    email: EmailStr = Field(..., description="Invitee email address")
    role: UserRole = Field(default=UserRole.MEMBER, description="Role to assign to user")
    message: Optional[str] = Field(None, max_length=500, description="Personal message")

class BulkInvitation(BaseModel):
    """Bulk invitation request"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "organization_id": "org-123",
                "invitations": [
                    {
                        "email": "user1@company.com",
                        "role": "member",
                        "message": "Welcome to our team!"
                    },
                    {
                        "email": "user2@company.com", 
                        "role": "team_lead",
                        "message": "Looking forward to working with you!"
                    }
                ]
            }
        }
    )
    
    organization_id: Optional[str] = Field(None, description="Organization ID (optional if user belongs to org)")
    invitations: List[SingleInvitation] = Field(..., min_items=1, max_items=20, description="List of invitations to send")

class InvitationResponse(BaseModel):
    """Invitation response"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success_count": 2,
                "failed_count": 0,
                "total_count": 2,
                "successful_emails": ["user1@company.com", "user2@company.com"],
                "failed_emails": [],
                "message": "Successfully sent 2 invitations"
            }
        }
    )
    
    success_count: int = Field(..., description="Number of successful invitations")
    failed_count: int = Field(..., description="Number of failed invitations")
    total_count: int = Field(..., description="Total number of invitations attempted")
    successful_emails: List[str] = Field(..., description="List of successfully sent emails")
    failed_emails: List[str] = Field(..., description="List of failed emails")
    message: str = Field(..., description="Success message")