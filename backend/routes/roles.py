"""
Role and Permission management routes for custom role creation and assignment
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from database import get_database
from models.role import (
    CustomRole, CustomRoleCreate, CustomRoleUpdate, CustomRoleInDB,
    RoleTemplate, RoleAssignment, RoleAssignmentCreate, BulkRoleAssignment,
    UserPermissions, PermissionValidation, Permission, PermissionCategory
)
from models.user import User, UserRole
from auth.middleware import get_current_user, get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/roles", tags=["Role Management"])

# Define all available permissions
AVAILABLE_PERMISSIONS = {
    "project": [
        {"name": "create_project", "display_name": "Create Project", "description": "Create new projects"},
        {"name": "edit_project", "display_name": "Edit Project", "description": "Edit existing projects"},
        {"name": "delete_project", "display_name": "Delete Project", "description": "Delete projects"},
        {"name": "view_project", "display_name": "View Project", "description": "View project details"},
        {"name": "manage_project_team", "display_name": "Manage Project Team", "description": "Add/remove team members from projects"},
        {"name": "view_project_analytics", "display_name": "View Project Analytics", "description": "Access project analytics and reports"},
        {"name": "manage_project_budget", "display_name": "Manage Project Budget", "description": "Manage project budget and financial tracking"},
    ],
    "task": [
        {"name": "create_task", "display_name": "Create Task", "description": "Create new tasks"},
        {"name": "edit_task", "display_name": "Edit Task", "description": "Edit existing tasks"},
        {"name": "delete_task", "display_name": "Delete Task", "description": "Delete tasks"},
        {"name": "assign_task", "display_name": "Assign Task", "description": "Assign tasks to team members"},
        {"name": "view_task_details", "display_name": "View Task Details", "description": "View detailed task information"},
        {"name": "manage_task_dependencies", "display_name": "Manage Task Dependencies", "description": "Create and manage task dependencies"},
        {"name": "view_task_time_tracking", "display_name": "View Task Time Tracking", "description": "Access task time tracking data"},
    ],
    "team": [
        {"name": "create_team", "display_name": "Create Team", "description": "Create new teams"},
        {"name": "edit_team", "display_name": "Edit Team", "description": "Edit team information"},
        {"name": "delete_team", "display_name": "Delete Team", "description": "Delete teams"},
        {"name": "manage_team_members", "display_name": "Manage Team Members", "description": "Add/remove team members"},
        {"name": "view_team_analytics", "display_name": "View Team Analytics", "description": "Access team performance analytics"},
        {"name": "manage_team_skills", "display_name": "Manage Team Skills", "description": "Manage team skills and competencies"},
        {"name": "view_team_workload", "display_name": "View Team Workload", "description": "View team workload distribution"},
    ],
    "user": [
        {"name": "create_user", "display_name": "Create User", "description": "Create new user accounts"},
        {"name": "edit_user", "display_name": "Edit User", "description": "Edit user profiles"},
        {"name": "delete_user", "display_name": "Delete User", "description": "Delete user accounts"},
        {"name": "manage_user_roles", "display_name": "Manage User Roles", "description": "Assign and manage user roles"},
        {"name": "view_user_profiles", "display_name": "View User Profiles", "description": "View detailed user profiles"},
        {"name": "invite_users", "display_name": "Invite Users", "description": "Send user invitations"},
        {"name": "manage_user_permissions", "display_name": "Manage User Permissions", "description": "Directly manage user permissions"},
    ],
    "system": [
        {"name": "manage_system_settings", "display_name": "Manage System Settings", "description": "Access system configuration"},
        {"name": "view_system_logs", "display_name": "View System Logs", "description": "Access system logs and diagnostics"},
        {"name": "manage_integrations", "display_name": "Manage Integrations", "description": "Configure system integrations"},
        {"name": "export_data", "display_name": "Export Data", "description": "Export system data"},
        {"name": "manage_organizations", "display_name": "Manage Organizations", "description": "Manage organization settings"},
        {"name": "backup_restore", "display_name": "Backup & Restore", "description": "Perform system backup and restore operations"},
        {"name": "manage_api_access", "display_name": "Manage API Access", "description": "Configure API access and keys"},
    ],
    "security": [
        {"name": "manage_security_settings", "display_name": "Manage Security Settings", "description": "Configure security settings"},
        {"name": "view_security_dashboard", "display_name": "View Security Dashboard", "description": "Access security monitoring dashboard"},
        {"name": "manage_mfa", "display_name": "Manage MFA", "description": "Configure multi-factor authentication"},
        {"name": "audit_access", "display_name": "Audit Access", "description": "Access audit logs and security reports"},
        {"name": "manage_compliance", "display_name": "Manage Compliance", "description": "Manage compliance settings and reports"},
        {"name": "view_threat_detection", "display_name": "View Threat Detection", "description": "Access threat detection and response"},
    ],
    "analytics": [
        {"name": "view_analytics", "display_name": "View Analytics", "description": "Access analytics dashboards"},
        {"name": "export_reports", "display_name": "Export Reports", "description": "Export analytics reports"},
        {"name": "manage_dashboards", "display_name": "Manage Dashboards", "description": "Create and manage custom dashboards"},
        {"name": "view_financial_data", "display_name": "View Financial Data", "description": "Access financial analytics and reports"},
        {"name": "advanced_analytics", "display_name": "Advanced Analytics", "description": "Access advanced analytics features"},
        {"name": "ai_insights", "display_name": "AI Insights", "description": "Access AI-powered insights and recommendations"},
    ]
}

# Role templates for common enterprise scenarios
ROLE_TEMPLATES = [
    {
        "name": "it_manager",
        "display_name": "IT Manager",
        "description": "Information Technology Manager with system administration permissions",
        "permissions": ["manage_system_settings", "manage_integrations", "view_system_logs", "create_user", "manage_user_roles", "backup_restore", "manage_api_access"],
        "industry": "technology",
        "department": "IT"
    },
    {
        "name": "project_coordinator",
        "display_name": "Project Coordinator",
        "description": "Coordinates projects and manages project teams",
        "permissions": ["create_project", "edit_project", "view_project", "manage_project_team", "create_task", "assign_task", "view_analytics"],
        "industry": "general",
        "department": "Project Management"
    },
    {
        "name": "finance_analyst",
        "display_name": "Finance Analyst",
        "description": "Analyzes financial data and manages budgets",
        "permissions": ["view_project_analytics", "manage_project_budget", "view_financial_data", "export_reports", "view_analytics"],
        "industry": "finance",
        "department": "Finance"
    },
    {
        "name": "team_lead",
        "display_name": "Team Lead",
        "description": "Leads development teams and manages team resources",
        "permissions": ["create_team", "edit_team", "manage_team_members", "assign_task", "view_team_analytics", "manage_team_skills"],
        "industry": "technology",
        "department": "Engineering"
    },
    {
        "name": "security_officer",
        "display_name": "Security Officer",
        "description": "Manages security settings and monitors security events",
        "permissions": ["manage_security_settings", "view_security_dashboard", "manage_mfa", "audit_access", "manage_compliance", "view_threat_detection"],
        "industry": "general",
        "department": "Security"
    },
    {
        "name": "hr_manager",
        "display_name": "HR Manager",
        "description": "Manages human resources and user accounts",
        "permissions": ["create_user", "edit_user", "invite_users", "manage_user_roles", "view_user_profiles", "view_team_analytics"],
        "industry": "general",
        "department": "Human Resources"
    }
]

def check_admin_permission(current_user: User):
    """Check if user has admin permissions for role management"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage roles and permissions"
        )

@router.get("/permissions", response_model=Dict[str, List[Dict[str, str]]])
async def get_all_permissions():
    """Get all available permissions by category"""
    return AVAILABLE_PERMISSIONS

@router.get("/templates", response_model=List[RoleTemplate])
async def get_role_templates():
    """Get all available role templates"""
    templates = []
    for template_data in ROLE_TEMPLATES:
        templates.append(RoleTemplate(**template_data))
    return templates

@router.get("/", response_model=List[CustomRole])
async def get_roles(
    organization_id: Optional[str] = Query(None, description="Filter by organization"),
    role_type: Optional[str] = Query(None, description="Filter by role type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_active_user)
):
    """Get all roles (system + custom) for an organization"""
    db = await get_database()
    
    # Build filter
    filter_query = {}
    if organization_id:
        filter_query["organization_id"] = organization_id
    else:
        filter_query["organization_id"] = current_user.organization_id
    
    if role_type:
        filter_query["role_type"] = role_type
    
    if is_active is not None:
        filter_query["is_active"] = is_active
    
    # Get custom roles
    custom_roles_cursor = db.custom_roles.find(filter_query)
    custom_roles = []
    
    async for role_doc in custom_roles_cursor:
        custom_roles.append(CustomRole(**role_doc))
    
    return custom_roles

@router.post("/custom", response_model=CustomRole, status_code=status.HTTP_201_CREATED)
async def create_custom_role(
    role_data: CustomRoleCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new custom role"""
    check_admin_permission(current_user)
    db = await get_database()
    
    # Check if role name already exists in organization
    existing_role = await db.custom_roles.find_one({
        "name": role_data.name,
        "organization_id": role_data.organization_id
    })
    
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role with this name already exists in organization"
        )
    
    # Validate permissions
    all_permissions = []
    for category_permissions in AVAILABLE_PERMISSIONS.values():
        all_permissions.extend([p["name"] for p in category_permissions])
    
    invalid_permissions = [p for p in role_data.permissions if p not in all_permissions]
    if invalid_permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permissions: {', '.join(invalid_permissions)}"
        )
    
    # Create custom role
    custom_role = CustomRole(
        name=role_data.name,
        display_name=role_data.display_name,
        description=role_data.description,
        permissions=role_data.permissions,
        organization_id=role_data.organization_id,
        parent_role_id=role_data.parent_role_id,
        inherits_permissions=role_data.inherits_permissions,
        industry=role_data.industry
    )
    
    # Handle permission inheritance
    if role_data.parent_role_id and role_data.inherits_permissions:
        parent_role = await db.custom_roles.find_one({"id": role_data.parent_role_id})
        if parent_role:
            inherited_permissions = set(parent_role["permissions"])
            custom_role.permissions = list(inherited_permissions.union(set(role_data.permissions)))
    
    # Insert role into database
    role_dict = custom_role.model_dump()
    result = await db.custom_roles.insert_one(role_dict)
    
    if result.inserted_id:
        logger.info(f"Custom role created: {custom_role.name} by {current_user.email}")
        return custom_role
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create custom role"
    )

@router.get("/{role_id}", response_model=CustomRole)
async def get_role_by_id(
    role_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific role by ID"""
    db = await get_database()
    
    role_doc = await db.custom_roles.find_one({
        "id": role_id,
        "organization_id": current_user.organization_id
    })
    
    if not role_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return CustomRole(**role_doc)

@router.put("/{role_id}", response_model=CustomRole)
async def update_custom_role(
    role_id: str,
    role_update: CustomRoleUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a custom role"""
    check_admin_permission(current_user)
    db = await get_database()
    
    # Check if role exists
    role_doc = await db.custom_roles.find_one({
        "id": role_id,
        "organization_id": current_user.organization_id
    })
    
    if not role_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if it's a system role
    if role_doc.get("is_system_role", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system roles"
        )
    
    # Validate permissions if provided
    if role_update.permissions:
        all_permissions = []
        for category_permissions in AVAILABLE_PERMISSIONS.values():
            all_permissions.extend([p["name"] for p in category_permissions])
        
        invalid_permissions = [p for p in role_update.permissions if p not in all_permissions]
        if invalid_permissions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permissions: {', '.join(invalid_permissions)}"
            )
    
    # Prepare update data
    update_data = {k: v for k, v in role_update.model_dump(exclude_unset=True).items() if v is not None}
    
    # Handle permission inheritance
    if role_update.parent_role_id and role_update.inherits_permissions and role_update.permissions:
        parent_role = await db.custom_roles.find_one({"id": role_update.parent_role_id})
        if parent_role:
            inherited_permissions = set(parent_role["permissions"])
            update_data["permissions"] = list(inherited_permissions.union(set(role_update.permissions)))
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update role in database
    result = await db.custom_roles.update_one(
        {"id": role_id, "organization_id": current_user.organization_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes were made"
        )
    
    # Get updated role
    updated_role_doc = await db.custom_roles.find_one({
        "id": role_id,
        "organization_id": current_user.organization_id
    })
    
    logger.info(f"Custom role updated: {role_id} by {current_user.email}")
    return CustomRole(**updated_role_doc)

@router.delete("/{role_id}")
async def delete_custom_role(
    role_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a custom role"""
    check_admin_permission(current_user)
    db = await get_database()
    
    # Check if role exists
    role_doc = await db.custom_roles.find_one({
        "id": role_id,
        "organization_id": current_user.organization_id
    })
    
    if not role_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if it's a system role
    if role_doc.get("is_system_role", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system roles"
        )
    
    # Check if role is assigned to any users
    role_assignments = await db.role_assignments.count_documents({
        "role_id": role_id,
        "is_active": True
    })
    
    if role_assignments > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete role that is assigned to users"
        )
    
    # Delete role
    result = await db.custom_roles.delete_one({
        "id": role_id,
        "organization_id": current_user.organization_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete role"
        )
    
    logger.info(f"Custom role deleted: {role_id} by {current_user.email}")
    return {"message": "Role deleted successfully"}

@router.post("/assign", response_model=RoleAssignment, status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(
    assignment: RoleAssignmentCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Assign a role to a user"""
    check_admin_permission(current_user)
    db = await get_database()
    
    # Validate user exists
    user_doc = await db.users.find_one({
        "id": assignment.user_id,
        "organization_id": assignment.organization_id
    })
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate role exists
    role_doc = await db.custom_roles.find_one({
        "id": assignment.role_id,
        "organization_id": assignment.organization_id
    })
    
    if not role_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check if assignment already exists
    existing_assignment = await db.role_assignments.find_one({
        "user_id": assignment.user_id,
        "role_id": assignment.role_id,
        "is_active": True
    })
    
    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role already assigned to user"
        )
    
    # Create role assignment
    role_assignment = RoleAssignment(
        user_id=assignment.user_id,
        role_id=assignment.role_id,
        organization_id=assignment.organization_id,
        assigned_by=current_user.id,
        valid_from=assignment.valid_from,
        valid_until=assignment.valid_until,
        notes=assignment.notes
    )
    
    # Insert assignment into database
    assignment_dict = role_assignment.model_dump()
    result = await db.role_assignments.insert_one(assignment_dict)
    
    if result.inserted_id:
        # Update role user count
        await db.custom_roles.update_one(
            {"id": assignment.role_id},
            {"$inc": {"user_count": 1}}
        )
        
        logger.info(f"Role assigned: {assignment.role_id} to {assignment.user_id} by {current_user.email}")
        return role_assignment
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to assign role"
    )

@router.post("/bulk-assign", response_model=Dict[str, Any])
async def bulk_assign_role(
    bulk_assignment: BulkRoleAssignment,
    current_user: User = Depends(get_current_active_user)
):
    """Bulk assign a role to multiple users"""
    check_admin_permission(current_user)
    db = await get_database()
    
    # Validate role exists
    role_doc = await db.custom_roles.find_one({
        "id": bulk_assignment.role_id,
        "organization_id": bulk_assignment.organization_id
    })
    
    if not role_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Validate all users exist
    users_cursor = db.users.find({
        "id": {"$in": bulk_assignment.user_ids},
        "organization_id": bulk_assignment.organization_id
    })
    
    existing_users = []
    async for user_doc in users_cursor:
        existing_users.append(user_doc["id"])
    
    missing_users = [uid for uid in bulk_assignment.user_ids if uid not in existing_users]
    if missing_users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Users not found: {', '.join(missing_users)}"
        )
    
    # Check for existing assignments
    existing_assignments_cursor = db.role_assignments.find({
        "user_id": {"$in": bulk_assignment.user_ids},
        "role_id": bulk_assignment.role_id,
        "is_active": True
    })
    
    existing_assignments = []
    async for assignment_doc in existing_assignments_cursor:
        existing_assignments.append(assignment_doc["user_id"])
    
    # Create assignments for users who don't already have the role
    new_assignments = []
    for user_id in bulk_assignment.user_ids:
        if user_id not in existing_assignments:
            role_assignment = RoleAssignment(
                user_id=user_id,
                role_id=bulk_assignment.role_id,
                organization_id=bulk_assignment.organization_id,
                assigned_by=current_user.id,
                valid_from=bulk_assignment.valid_from,
                valid_until=bulk_assignment.valid_until,
                notes=bulk_assignment.notes
            )
            new_assignments.append(role_assignment.model_dump())
    
    # Insert new assignments
    if new_assignments:
        result = await db.role_assignments.insert_many(new_assignments)
        
        if result.inserted_ids:
            # Update role user count
            await db.custom_roles.update_one(
                {"id": bulk_assignment.role_id},
                {"$inc": {"user_count": len(new_assignments)}}
            )
    
    logger.info(f"Bulk role assignment: {bulk_assignment.role_id} to {len(new_assignments)} users by {current_user.email}")
    
    return {
        "message": "Bulk role assignment completed",
        "total_users": len(bulk_assignment.user_ids),
        "new_assignments": len(new_assignments),
        "existing_assignments": len(existing_assignments),
        "role_name": role_doc["display_name"]
    }

@router.get("/users/{user_id}/permissions", response_model=UserPermissions)
async def get_user_permissions(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get effective permissions for a user"""
    db = await get_database()
    
    # Validate user exists
    user_doc = await db.users.find_one({
        "id": user_id,
        "organization_id": current_user.organization_id
    })
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's role assignments
    assignments_cursor = db.role_assignments.find({
        "user_id": user_id,
        "is_active": True,
        "organization_id": current_user.organization_id
    })
    
    roles = []
    all_permissions = set()
    
    async for assignment_doc in assignments_cursor:
        role_doc = await db.custom_roles.find_one({"id": assignment_doc["role_id"]})
        if role_doc:
            role_permissions = role_doc.get("permissions", [])
            all_permissions.update(role_permissions)
            roles.append({
                "role_id": role_doc["id"],
                "role_name": role_doc["display_name"],
                "permissions": role_permissions
            })
    
    # Also include permissions from system role if applicable
    user_system_role = user_doc.get("role")
    if user_system_role in ["super_admin", "admin"]:
        # Admins get all permissions
        for category_permissions in AVAILABLE_PERMISSIONS.values():
            all_permissions.update([p["name"] for p in category_permissions])
    
    return UserPermissions(
        user_id=user_id,
        effective_permissions=list(all_permissions),
        roles=roles
    )

@router.post("/validate-permission", response_model=PermissionValidation)
async def validate_user_permission(
    user_id: str,
    permission: str,
    current_user: User = Depends(get_current_active_user)
):
    """Validate if a user has a specific permission"""
    db = await get_database()
    
    # Get user permissions
    user_permissions_data = await get_user_permissions(user_id, current_user)
    
    has_permission = permission in user_permissions_data.effective_permissions
    source_roles = [role["role_name"] for role in user_permissions_data.roles if permission in role["permissions"]]
    
    return PermissionValidation(
        user_id=user_id,
        permission=permission,
        has_permission=has_permission,
        source_roles=source_roles
    )