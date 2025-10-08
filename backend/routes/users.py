"""
User management routes for role assignments and user administration
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import logging

from database import get_database
from models.user import (
    User, UserCreate, UserUpdate, UserResponse, UserRole, UserStatus
)
from auth.middleware import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["Users"])

def check_user_management_permissions(user: User, target_user_id: str = None):
    """Check if user can manage other users"""
    # Handle both string and enum values for role comparison
    user_role = user.role.value if hasattr(user.role, 'value') else user.role
    
    if user_role in [UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value]:
        return True
    
    # Managers can manage users in their organization (except admins)
    if user_role == UserRole.MANAGER.value:
        return True
    
    # Team leads can view team members
    if user_role == UserRole.TEAM_LEAD.value:
        return True
        
    # Users can only manage themselves
    if target_user_id and user.id == target_user_id:
        return True
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions for user management"
    )

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[UserRole] = Query(None),
    status: Optional[UserStatus] = Query(None),
    organization_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """List users with filtering and pagination"""
    check_user_management_permissions(current_user)
    
    db = await get_database()
    
    # Build query based on user permissions
    query = {}
    
    # Handle both string and enum values for role comparison
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
    
    # Super admin can see all users
    if user_role == UserRole.SUPER_ADMIN.value:
        if organization_id:
            query["organization_id"] = organization_id
    else:
        # Others can only see users in their organization
        query["organization_id"] = current_user.organization_id
    
    # Apply filters
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}}
        ]
    
    if role:
        query["role"] = role
        
    if status:
        query["status"] = status
    
    # Get users (exclude sensitive fields)
    cursor = db.users.find(
        query,
        {
            "password_hash": 0,
            "email_verification_token": 0,
            "password_reset_token": 0,
            "password_reset_expires": 0
        }
    ).skip(skip).limit(limit)
    
    users = await cursor.to_list(length=limit)
    
    return [UserResponse(**user) for user in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get user details"""
    check_user_management_permissions(current_user, user_id)
    
    db = await get_database()
    
    # Build query based on permissions
    query = {"id": user_id}
    if current_user.role != UserRole.SUPER_ADMIN:
        query["organization_id"] = current_user.organization_id
    
    user = await db.users.find_one(
        query,
        {
            "password_hash": 0,
            "email_verification_token": 0,
            "password_reset_token": 0,
            "password_reset_expires": 0
        }
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**user)

@router.put("/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: UserRole,
    current_user: User = Depends(get_current_active_user)
):
    """Update user role (admin and super_admin only)"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to change user roles"
        )
    
    db = await get_database()
    
    # Get target user
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check organization permissions (non-super_admins can only manage their org)
    if current_user.role != UserRole.SUPER_ADMIN:
        if target_user["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot manage users outside your organization"
            )
    
    # Admins cannot create super_admins or manage other admins
    if current_user.role == UserRole.ADMIN:
        if new_role == UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign super_admin role"
            )
        if target_user["role"] in [UserRole.SUPER_ADMIN, UserRole.ADMIN] and user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot manage admin users"
            )
    
    # Update role
    result = await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "role": new_role,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes made"
        )
    
    logger.info(f"User role updated: {user_id} -> {new_role} by {current_user.email}")
    return {"message": "User role updated successfully", "new_role": new_role}

@router.put("/{user_id}/status")
async def update_user_status(
    user_id: str,
    new_status: UserStatus,
    current_user: User = Depends(get_current_active_user)
):
    """Update user status (admin+ only)"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to change user status"
        )
    
    db = await get_database()
    
    # Get target user
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check organization permissions
    if current_user.role != UserRole.SUPER_ADMIN:
        if target_user["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot manage users outside your organization"
            )
    
    # Prevent lower roles from deactivating higher roles
    if current_user.role == UserRole.MANAGER:
        if target_user["role"] in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot manage admin users"
            )
    
    # Update status and is_active flag
    is_active = new_status == UserStatus.ACTIVE
    
    result = await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "status": new_status,
                "is_active": is_active,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes made"
        )
    
    logger.info(f"User status updated: {user_id} -> {new_status} by {current_user.email}")
    return {"message": "User status updated successfully", "new_status": new_status}

@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update user profile and settings"""
    check_user_management_permissions(current_user, user_id)
    
    db = await get_database()
    
    # Get target user
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions for different update operations
    if user_id != current_user.id:
        # Only admins+ can update other users
        if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only update your own profile"
            )
        
        # Check organization permissions
        if current_user.role != UserRole.SUPER_ADMIN:
            if target_user["organization_id"] != current_user.organization_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot update users outside your organization"
                )
    
    # Prepare update data
    update_data = {}
    for field, value in user_update.model_dump(exclude_unset=True).items():
        if value is not None:
            # Role and status changes require special permissions
            if field in ["role", "is_active", "status"]:
                if user_id != current_user.id and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
                    continue  # Skip these fields for non-admins
            update_data[field] = value
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid updates provided"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes made"
        )
    
    # Get updated user
    updated_user = await db.users.find_one(
        {"id": user_id},
        {
            "password_hash": 0,
            "email_verification_token": 0,
            "password_reset_token": 0,
            "password_reset_expires": 0
        }
    )
    
    logger.info(f"User updated: {user_id} by {current_user.email}")
    return UserResponse(**updated_user)

@router.get("/roles/distribution")
async def get_roles_distribution(
    organization_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get distribution of roles in organization"""
    check_user_management_permissions(current_user)
    
    db = await get_database()
    
    # Determine organization to analyze
    org_id = organization_id if current_user.role == UserRole.SUPER_ADMIN else current_user.organization_id
    
    pipeline = [
        {"$match": {"organization_id": org_id, "is_active": True}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    result = await db.users.aggregate(pipeline).to_list(length=None)
    
    return {
        "organization_id": org_id,
        "total_users": sum(item["count"] for item in result),
        "roles_distribution": {item["_id"]: item["count"] for item in result}
    }

@router.get("/skills/overview")
async def get_skills_overview(
    organization_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get overview of skills across all users in organization"""
    check_user_management_permissions(current_user)
    
    db = await get_database()
    
    # Determine organization
    org_id = organization_id if current_user.role == UserRole.SUPER_ADMIN else current_user.organization_id
    
    # Get all teams in the organization to aggregate skills
    teams = await db.teams.find(
        {"organization_id": org_id, "is_active": True}
    ).to_list(length=None)
    
    skills_count = {}
    total_members = 0
    
    for team in teams:
        for member in team.get("members", []):
            total_members += 1
            for skill in member.get("skills", []):
                skills_count[skill] = skills_count.get(skill, 0) + 1
    
    # Sort skills by frequency
    sorted_skills = sorted(skills_count.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "organization_id": org_id,
        "total_members_with_skills": total_members,
        "unique_skills_count": len(skills_count),
        "top_skills": [
            {
                "skill": skill,
                "count": count,
                "percentage": round((count / total_members * 100), 1) if total_members > 0 else 0
            }
            for skill, count in sorted_skills[:20]  # Top 20 skills
        ]
    }

@router.post("/{user_id}/assign-organization")
async def assign_user_to_organization(
    user_id: str,
    organization_id: str,
    role: UserRole = UserRole.MEMBER,
    current_user: User = Depends(get_current_active_user)
):
    """Assign user to organization with specific role (super_admin only)"""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can assign users to organizations"
        )
    
    db = await get_database()
    
    # Verify user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify organization exists
    organization = await db.organizations.find_one({"id": organization_id})
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Update user's organization and role
    result = await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "organization_id": organization_id,
                "role": role,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign user to organization"
        )
    
    # Update organization member count
    await db.organizations.update_one(
        {"id": organization_id},
        {"$inc": {"member_count": 1}}
    )
    
    logger.info(f"User {user_id} assigned to organization {organization_id} with role {role} by {current_user.email}")
    return {
        "message": "User assigned to organization successfully",
        "user_id": user_id,
        "organization_id": organization_id,
        "role": role
    }

@router.patch("/{user_id}/preferences")
async def update_user_preferences(
    user_id: str,
    preferences: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Update user preferences including activity tracking settings"""
    # Users can only update their own preferences, or admins can update any
    if (user_id != current_user.id and 
        current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own preferences"
        )
    
    db = await get_database()
    
    # Validate and prepare preference updates
    valid_preferences = {
        "timezone", "language", "theme", "notifications_enabled",
        "geolocation_enabled", "activity_tracking_level", "location_sharing_scope"
    }
    
    update_data = {}
    for key, value in preferences.items():
        if key in valid_preferences:
            update_data[key] = value
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid preferences provided"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user preferences
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes made to user preferences"
        )
    
    logger.info(f"User preferences updated: {user_id} by {current_user.email}")
    return {
        "message": "User preferences updated successfully",
        "updated_preferences": update_data
    }