"""
Organization management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import logging

from database import get_database
from models.organization import (
    Organization, OrganizationCreate, OrganizationUpdate, 
    OrganizationSummary, OrganizationInDB
)
from models.user import User, UserRole
from models.invitation import BulkInvitation, InvitationResponse
from auth.middleware import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/organizations", tags=["Organizations"])

# Helper function to check organization permissions
def check_organization_access(user: User, organization_id: str, required_roles: List[UserRole] = None):
    """Check if user has access to organization"""
    if user.role == UserRole.SUPER_ADMIN:
        return True
    
    if user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: not a member of this organization"
        )
    
    if required_roles and user.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: requires {required_roles}"
        )
    
    return True

@router.post("/", response_model=Organization, status_code=status.HTTP_201_CREATED)
async def create_organization(
    organization_data: OrganizationCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new organization"""
    db = await get_database()
    
    # Check if user can create organizations (must be super_admin or creating first org)
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        existing_user_org = await db.users.find_one({"id": current_user.id})
        if existing_user_org and existing_user_org.get("organization_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User already belongs to an organization"
            )
    
    # Check if slug is unique
    existing_org = await db.organizations.find_one({"slug": organization_data.slug})
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization slug already exists"
        )
    
    # Create organization
    organization = OrganizationInDB(
        **organization_data.model_dump(),
        member_count=1,
        project_count=0
    )
    
    org_dict = organization.model_dump()
    result = await db.organizations.insert_one(org_dict)
    
    if result.inserted_id:
        # Update user's organization_id if they don't have one
        if not current_user.organization_id or current_user.role == UserRole.SUPER_ADMIN:
            await db.users.update_one(
                {"id": current_user.id},
                {
                    "$set": {
                        "organization_id": organization.id,
                        "role": UserRole.ADMIN if current_user.role != UserRole.SUPER_ADMIN else current_user.role,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        logger.info(f"Organization created: {organization.name} by {current_user.email}")
        return Organization(**org_dict)
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create organization"
    )

@router.get("/", response_model=List[OrganizationSummary])
async def list_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """List organizations (super_admin sees all, others see their own)"""
    db = await get_database()
    
    # Build query
    query = {}
    if current_user.role != UserRole.SUPER_ADMIN:
        query["id"] = current_user.organization_id
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"slug": {"$regex": search, "$options": "i"}}
        ]
    
    # Get organizations
    cursor = db.organizations.find(query).skip(skip).limit(limit)
    organizations = await cursor.to_list(length=limit)
    
    return [
        OrganizationSummary(
            id=org["id"],
            name=org["name"],
            slug=org["slug"],
            type=org["type"],
            status=org["status"],
            member_count=org.get("member_count", 0),
            project_count=org.get("project_count", 0),
            logo_url=org.get("settings", {}).get("logo_url")
        )
        for org in organizations
    ]

@router.get("/{organization_id}", response_model=Organization)
async def get_organization(
    organization_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get organization details"""
    check_organization_access(current_user, organization_id)
    
    db = await get_database()
    organization = await db.organizations.find_one({"id": organization_id})
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return Organization(**organization)

@router.put("/{organization_id}", response_model=Organization)
async def update_organization(
    organization_id: str,
    organization_update: OrganizationUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update organization"""
    check_organization_access(
        current_user, 
        organization_id, 
        [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]
    )
    
    db = await get_database()
    
    # Check if organization exists
    existing_org = await db.organizations.find_one({"id": organization_id})
    if not existing_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Prepare update data
    update_data = {k: v for k, v in organization_update.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update organization
    result = await db.organizations.update_one(
        {"id": organization_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes were made"
        )
    
    # Get updated organization
    updated_org = await db.organizations.find_one({"id": organization_id})
    
    logger.info(f"Organization updated: {organization_id} by {current_user.email}")
    return Organization(**updated_org)

@router.delete("/{organization_id}")
async def delete_organization(
    organization_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete organization (super_admin or admin only)"""
    check_organization_access(
        current_user, 
        organization_id, 
        [UserRole.SUPER_ADMIN, UserRole.ADMIN]
    )
    
    db = await get_database()
    
    # Check if organization exists
    existing_org = await db.organizations.find_one({"id": organization_id})
    if not existing_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check if organization has users (prevent deletion if has members)
    user_count = await db.users.count_documents({"organization_id": organization_id})
    if user_count > 1:  # More than just the admin
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete organization with active members"
        )
    
    # Delete organization
    await db.organizations.delete_one({"id": organization_id})
    
    # Remove organization from remaining user
    await db.users.update_many(
        {"organization_id": organization_id},
        {"$unset": {"organization_id": ""}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    logger.info(f"Organization deleted: {organization_id} by {current_user.email}")
    return {"message": "Organization deleted successfully"}

@router.get("/{organization_id}/members", response_model=List[dict])
async def get_organization_members(
    organization_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user)
):
    """Get organization members"""
    check_organization_access(current_user, organization_id)
    
    db = await get_database()
    
    # Get members
    cursor = db.users.find(
        {"organization_id": organization_id, "is_active": True},
        {
            "password_hash": 0,
            "email_verification_token": 0,
            "password_reset_token": 0,
            "password_reset_expires": 0
        }
    ).skip(skip).limit(limit)
    
    members = await cursor.to_list(length=limit)
    
    return [
        {
            "id": member["id"],
            "email": member["email"],
            "username": member["username"],
            "first_name": member["first_name"],
            "last_name": member["last_name"],
            "role": member["role"],
            "status": member["status"],
            "avatar_url": member.get("avatar_url"),
            "last_login": member.get("last_login"),
            "created_at": member["created_at"]
        }
        for member in members
    ]

@router.post("/invite-members", response_model=InvitationResponse)
async def invite_members(
    invitation_data: BulkInvitation,
    current_user: User = Depends(get_current_active_user)
):
    """Send bulk invitations to join organization"""
    # Determine organization ID
    org_id = invitation_data.organization_id or current_user.organization_id
    
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization ID is required"
        )
    
    check_organization_access(
        current_user, 
        org_id, 
        [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]
    )
    
    db = await get_database()
    
    # Get organization details
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    successful_emails = []
    failed_emails = []
    
    for invitation in invitation_data.invitations:
        try:
            # Check if user already exists
            existing_user = await db.users.find_one({"email": invitation.email})
            if existing_user:
                if existing_user.get("organization_id") == org_id:
                    logger.warning(f"User {invitation.email} already member of organization {org_id}")
                    failed_emails.append(invitation.email)
                    continue
            
            # For now, we'll simulate sending the invitation
            # In a real system, you would:
            # 1. Create invitation record in database
            # 2. Send email with invitation link
            # 3. Handle invitation acceptance/rejection
            
            logger.info(f"Invitation sent to {invitation.email} for role {invitation.role} by {current_user.email}")
            successful_emails.append(invitation.email)
            
        except Exception as e:
            logger.error(f"Failed to invite {invitation.email}: {e}")
            failed_emails.append(invitation.email)
    
    success_count = len(successful_emails)
    failed_count = len(failed_emails)
    total_count = success_count + failed_count
    
    return InvitationResponse(
        success_count=success_count,
        failed_count=failed_count,
        total_count=total_count,
        successful_emails=successful_emails,
        failed_emails=failed_emails,
        message=f"Successfully sent {success_count} invitation{'s' if success_count != 1 else ''}"
    )

@router.get("/{organization_id}/stats")
async def get_organization_stats(
    organization_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get organization statistics"""
    check_organization_access(current_user, organization_id)
    
    db = await get_database()
    
    # Get member count
    member_count = await db.users.count_documents({
        "organization_id": organization_id,
        "is_active": True
    })
    
    # Get team count
    team_count = await db.teams.count_documents({
        "organization_id": organization_id,
        "is_active": True
    })
    
    # Get project count (when projects are implemented)
    project_count = await db.projects.count_documents({
        "organization_id": organization_id
    }) if "projects" in await db.list_collection_names() else 0
    
    return {
        "organization_id": organization_id,
        "member_count": member_count,
        "team_count": team_count,
        "project_count": project_count,
        "active_members": member_count,  # For now, assume all are active
        "roles_distribution": await get_roles_distribution(db, organization_id)
    }

async def get_roles_distribution(db, organization_id: str):
    """Get distribution of roles in organization"""
    pipeline = [
        {"$match": {"organization_id": organization_id, "is_active": True}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    result = await db.users.aggregate(pipeline).to_list(length=None)
    return {item["_id"]: item["count"] for item in result}