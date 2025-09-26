"""
Authentication middleware for role-based access control
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from functools import wraps

from .utils import verify_token, TokenData
from ..database import get_database
from ..models.user import User, UserRole

security = HTTPBearer()

# Role hierarchy for permission checking
ROLE_HIERARCHY = {
    UserRole.SUPER_ADMIN: 6,
    UserRole.ADMIN: 5,
    UserRole.MANAGER: 4,
    UserRole.TEAM_LEAD: 3,
    UserRole.MEMBER: 2,
    UserRole.VIEWER: 1
}

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current authenticated user"""
    # Verify token
    token_data = verify_token(credentials.credentials)
    
    # Get user from database
    db = await get_database()
    user = await db.users.find_one({"id": token_data.user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert to User model
    return User(**user)

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user (must be active)"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    
    return current_user

def require_role(allowed_roles: List[UserRole]):
    """Decorator to require specific roles"""
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of these roles: {[role.value for role in allowed_roles]}"
            )
        return current_user
    
    return role_checker

def require_min_role(min_role: UserRole):
    """Decorator to require minimum role level"""
    def role_checker(current_user: User = Depends(get_current_active_user)):
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        required_level = ROLE_HIERARCHY.get(min_role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires minimum role: {min_role.value}"
            )
        return current_user
    
    return role_checker

def require_organization_access(current_user: User = Depends(get_current_active_user)):
    """Ensure user has access to their organization data"""
    return current_user

def require_super_admin(current_user: User = Depends(require_min_role(UserRole.SUPER_ADMIN))):
    """Require super admin role"""
    return current_user

def require_admin(current_user: User = Depends(require_min_role(UserRole.ADMIN))):
    """Require admin or higher role"""
    return current_user

def require_manager(current_user: User = Depends(require_min_role(UserRole.MANAGER))):
    """Require manager or higher role"""
    return current_user

def require_team_lead(current_user: User = Depends(require_min_role(UserRole.TEAM_LEAD))):
    """Require team lead or higher role"""
    return current_user

def require_member(current_user: User = Depends(require_min_role(UserRole.MEMBER))):
    """Require member or higher role"""
    return current_user

# Permission checking utilities
def can_manage_users(user: User) -> bool:
    """Check if user can manage other users"""
    return user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]

def can_manage_organization(user: User) -> bool:
    """Check if user can manage organization settings"""
    return user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]

def can_create_projects(user: User) -> bool:
    """Check if user can create projects"""
    return user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]

def can_assign_tasks(user: User) -> bool:
    """Check if user can assign tasks"""
    return user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD]

def can_view_analytics(user: User) -> bool:
    """Check if user can view analytics"""
    return user.role != UserRole.VIEWER

def has_organization_access(user: User, organization_id: str) -> bool:
    """Check if user belongs to specified organization"""
    return user.organization_id == organization_id