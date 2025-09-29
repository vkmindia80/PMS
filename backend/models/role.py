from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class PermissionCategory(str, Enum):
    """Permission categories for organization"""
    PROJECT = "project"
    TASK = "task"
    TEAM = "team"
    USER = "user"
    SYSTEM = "system"
    SECURITY = "security"
    ANALYTICS = "analytics"

class Permission(BaseModel):
    """Individual permission definition"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "create_project",
                "display_name": "Create Project",
                "description": "Ability to create new projects",
                "category": "project"
            }
        }
    )
    
    name: str = Field(..., description="Permission identifier (e.g., 'create_project')")
    display_name: str = Field(..., description="Human-readable permission name")
    description: str = Field(..., description="Permission description")
    category: PermissionCategory = Field(..., description="Permission category")

class RoleType(str, Enum):
    """Role type classification"""
    SYSTEM = "system"  # Built-in roles (admin, manager, etc.)
    CUSTOM = "custom"  # User-created roles
    TEMPLATE = "template"  # Pre-configured role templates

class CustomRole(BaseDBModel):
    """Custom role model with granular permissions"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "Project Coordinator",
                "display_name": "Project Coordinator",
                "description": "Manages project coordination and team communication",
                "role_type": "custom",
                "permissions": ["create_project", "edit_project", "view_analytics"],
                "organization_id": "org-123",
                "is_active": True
            }
        }
    )
    
    name: str = Field(..., min_length=3, max_length=100, description="Role name (unique within organization)")
    display_name: str = Field(..., min_length=3, max_length=100, description="Human-readable role name")
    description: Optional[str] = Field(None, max_length=500, description="Role description")
    role_type: RoleType = Field(default=RoleType.CUSTOM, description="Role type")
    
    # Permissions
    permissions: List[str] = Field(default_factory=list, description="List of permission names")
    
    # Organization context
    organization_id: str = Field(..., description="Organization ID", index=True)
    
    # Role settings
    is_active: bool = Field(default=True, description="Role active status")
    is_system_role: bool = Field(default=False, description="System role flag")
    
    # Role hierarchy
    parent_role_id: Optional[str] = Field(None, description="Parent role ID for inheritance")
    inherits_permissions: bool = Field(default=False, description="Inherit permissions from parent role")
    
    # Template information
    template_id: Optional[str] = Field(None, description="Template role ID if based on template")
    industry: Optional[str] = Field(None, description="Industry context for role")
    
    # Usage tracking
    user_count: int = Field(default=0, description="Number of users with this role")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional role metadata")

class CustomRoleCreate(BaseCreateModel):
    """Schema for creating custom roles"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "project_coordinator",
                "display_name": "Project Coordinator",
                "description": "Manages project coordination and team communication",
                "permissions": ["create_project", "edit_project", "view_analytics"],
                "organization_id": "org-123"
            }
        }
    )
    
    name: str = Field(..., min_length=3, max_length=100, description="Role name (unique within organization)")
    display_name: str = Field(..., min_length=3, max_length=100, description="Human-readable role name")
    description: Optional[str] = Field(None, max_length=500, description="Role description")
    permissions: List[str] = Field(..., description="List of permission names")
    organization_id: str = Field(..., description="Organization ID")
    parent_role_id: Optional[str] = Field(None, description="Parent role ID for inheritance")
    inherits_permissions: bool = Field(default=False, description="Inherit permissions from parent role")
    industry: Optional[str] = Field(None, description="Industry context for role")

class CustomRoleUpdate(BaseUpdateModel):
    """Schema for updating custom roles"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "display_name": "Senior Project Coordinator",
                "description": "Senior level project coordination with extended permissions",
                "permissions": ["create_project", "edit_project", "delete_project", "view_analytics"]
            }
        }
    )
    
    display_name: Optional[str] = Field(None, min_length=3, max_length=100, description="Human-readable role name")
    description: Optional[str] = Field(None, max_length=500, description="Role description")
    permissions: Optional[List[str]] = Field(None, description="List of permission names")
    is_active: Optional[bool] = Field(None, description="Role active status")
    parent_role_id: Optional[str] = Field(None, description="Parent role ID for inheritance")
    inherits_permissions: Optional[bool] = Field(None, description="Inherit permissions from parent role")

class CustomRoleInDB(CustomRole):
    """Custom role model as stored in database"""
    pass

class RoleTemplate(BaseModel):
    """Pre-configured role template"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "it_manager",
                "display_name": "IT Manager",
                "description": "Information Technology Manager with system administration permissions",
                "permissions": ["manage_system_settings", "create_user", "manage_integrations"],
                "industry": "technology",
                "department": "IT"
            }
        }
    )
    
    name: str = Field(..., description="Template identifier")
    display_name: str = Field(..., description="Human-readable template name")
    description: str = Field(..., description="Template description")
    permissions: List[str] = Field(..., description="Default permissions for this template")
    industry: str = Field(..., description="Target industry")
    department: Optional[str] = Field(None, description="Target department")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Template metadata")

class RoleAssignment(BaseDBModel):
    """Role assignment to users"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "user-123",
                "role_id": "role-123",
                "organization_id": "org-123",
                "assigned_by": "admin-user-123",
                "is_active": True
            }
        }
    )
    
    user_id: str = Field(..., description="User ID", index=True)
    role_id: str = Field(..., description="Role ID", index=True)
    organization_id: str = Field(..., description="Organization ID", index=True)
    
    # Assignment context
    assigned_by: str = Field(..., description="User ID who assigned this role")
    assigned_at: datetime = Field(default_factory=datetime.utcnow, description="Assignment timestamp")
    
    # Assignment status
    is_active: bool = Field(default=True, description="Assignment active status")
    
    # Time-based permissions
    valid_from: Optional[datetime] = Field(None, description="Role valid from timestamp")
    valid_until: Optional[datetime] = Field(None, description="Role valid until timestamp")
    
    # Assignment metadata
    notes: Optional[str] = Field(None, max_length=500, description="Assignment notes")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Assignment metadata")

class RoleAssignmentCreate(BaseCreateModel):
    """Schema for creating role assignments"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "role_id": "role-123",
                "organization_id": "org-123",
                "notes": "Assigned for project coordination responsibilities"
            }
        }
    )
    
    user_id: str = Field(..., description="User ID")
    role_id: str = Field(..., description="Role ID")
    organization_id: str = Field(..., description="Organization ID")
    valid_from: Optional[datetime] = Field(None, description="Role valid from timestamp")
    valid_until: Optional[datetime] = Field(None, description="Role valid until timestamp")
    notes: Optional[str] = Field(None, max_length=500, description="Assignment notes")

class BulkRoleAssignment(BaseModel):
    """Schema for bulk role assignments"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_ids": ["user-1", "user-2", "user-3"],
                "role_id": "role-123",
                "organization_id": "org-123",
                "notes": "Bulk assignment for new team members"
            }
        }
    )
    
    user_ids: List[str] = Field(..., description="List of user IDs")
    role_id: str = Field(..., description="Role ID to assign")
    organization_id: str = Field(..., description="Organization ID")
    valid_from: Optional[datetime] = Field(None, description="Role valid from timestamp")
    valid_until: Optional[datetime] = Field(None, description="Role valid until timestamp")
    notes: Optional[str] = Field(None, max_length=500, description="Assignment notes")

class UserPermissions(BaseModel):
    """User effective permissions model"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "effective_permissions": ["create_project", "edit_project", "view_analytics"],
                "roles": [
                    {"role_id": "role-1", "role_name": "Project Manager", "permissions": ["create_project", "edit_project"]},
                    {"role_id": "role-2", "role_name": "Analyst", "permissions": ["view_analytics"]}
                ]
            }
        }
    )
    
    user_id: str = Field(..., description="User ID")
    effective_permissions: List[str] = Field(..., description="All effective permissions")
    roles: List[Dict[str, Any]] = Field(..., description="User roles with permissions")
    computed_at: datetime = Field(default_factory=datetime.utcnow, description="Permissions computed timestamp")

class PermissionValidation(BaseModel):
    """Permission validation result"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "permission": "create_project",
                "has_permission": True,
                "source_roles": ["Project Manager", "Team Lead"]
            }
        }
    )
    
    user_id: str = Field(..., description="User ID")
    permission: str = Field(..., description="Permission being validated")
    has_permission: bool = Field(..., description="Permission validation result")
    source_roles: List[str] = Field(default_factory=list, description="Roles that grant this permission")
    validation_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Validation timestamp")