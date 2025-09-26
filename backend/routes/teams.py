"""
Team management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import logging

from database import get_database
from models.team import (
    Team, TeamCreate, TeamUpdate, TeamSummary, TeamInDB, 
    TeamMember, TeamStats, TeamMemberRole
)
from models.user import User, UserRole
from auth.middleware import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/teams", tags=["Teams"])

def check_team_access(user: User, organization_id: str, required_roles: List[UserRole] = None):
    """Check if user has access to teams in organization"""
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

async def check_team_member_permissions(db, team_id: str, user_id: str, user_role: UserRole):
    """Check if user can modify team (team lead or admin+)"""
    if user_role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        return True
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        return False
    
    # Team lead can modify team
    if team.get("lead_id") == user_id:
        return True
    
    # Manager role can modify teams in their organization
    if user_role == UserRole.MANAGER:
        return True
    
    return False

@router.post("/", response_model=Team, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new team"""
    check_team_access(
        current_user, 
        team_data.organization_id,
        [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]
    )
    
    db = await get_database()
    
    # Verify organization exists
    organization = await db.organizations.find_one({"id": team_data.organization_id})
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Verify team lead exists and is in the organization
    if team_data.lead_id:
        lead_user = await db.users.find_one({
            "id": team_data.lead_id,
            "organization_id": team_data.organization_id,
            "is_active": True
        })
        if not lead_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team lead not found in organization"
            )
    
    # Verify all members exist and are in the organization
    for member in team_data.members:
        member_user = await db.users.find_one({
            "id": member.user_id,
            "organization_id": team_data.organization_id,
            "is_active": True
        })
        if not member_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Member {member.user_id} not found in organization"
            )
        
        # Set joined_at if not provided
        if not member.joined_at:
            member.joined_at = datetime.utcnow()
    
    # Create team
    team = TeamInDB(
        **team_data.model_dump(),
        member_count=len(team_data.members),
        active_project_count=0
    )
    
    team_dict = team.model_dump()
    result = await db.teams.insert_one(team_dict)
    
    if result.inserted_id:
        logger.info(f"Team created: {team.name} by {current_user.email}")
        return Team(**team_dict)
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create team"
    )

@router.get("/", response_model=List[TeamSummary])
async def list_teams(
    organization_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    team_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """List teams in organization"""
    # Use user's organization if not specified
    org_id = organization_id or current_user.organization_id
    check_team_access(current_user, org_id)
    
    db = await get_database()
    
    # Build query
    query = {"organization_id": org_id, "is_active": True}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [{"$regex": search, "$options": "i"}]}}
        ]
    
    if team_type:
        query["type"] = team_type
    
    # Get teams
    cursor = db.teams.find(query).skip(skip).limit(limit)
    teams = await cursor.to_list(length=limit)
    
    return [
        TeamSummary(
            id=team["id"],
            name=team["name"],
            type=team["type"],
            member_count=team.get("member_count", len(team.get("members", []))),
            lead_id=team.get("lead_id"),
            active_project_count=team.get("active_project_count", 0),
            is_active=team.get("is_active", True)
        )
        for team in teams
    ]

@router.get("/{team_id}", response_model=Team)
async def get_team(
    team_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get team details"""
    db = await get_database()
    team = await db.teams.find_one({"id": team_id})
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    check_team_access(current_user, team["organization_id"])
    return Team(**team)

@router.put("/{team_id}", response_model=Team)
async def update_team(
    team_id: str,
    team_update: TeamUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update team"""
    db = await get_database()
    
    # Check if team exists
    existing_team = await db.teams.find_one({"id": team_id})
    if not existing_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Check permissions
    if not await check_team_member_permissions(db, team_id, current_user.id, current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to modify team"
        )
    
    # Prepare update data
    update_data = {k: v for k, v in team_update.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update member count if members were updated
    if "members" in update_data:
        update_data["member_count"] = len(update_data["members"])
    
    # Update team
    result = await db.teams.update_one(
        {"id": team_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes were made"
        )
    
    # Get updated team
    updated_team = await db.teams.find_one({"id": team_id})
    
    logger.info(f"Team updated: {team_id} by {current_user.email}")
    return Team(**updated_team)

@router.delete("/{team_id}")
async def delete_team(
    team_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete team"""
    db = await get_database()
    
    # Check if team exists
    existing_team = await db.teams.find_one({"id": team_id})
    if not existing_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Check permissions (admin+ or team lead)
    if not await check_team_member_permissions(db, team_id, current_user.id, current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete team"
        )
    
    # Soft delete (set is_active to False)
    await db.teams.update_one(
        {"id": team_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    logger.info(f"Team deleted: {team_id} by {current_user.email}")
    return {"message": "Team deleted successfully"}

@router.post("/{team_id}/members", response_model=Team)
async def add_team_member(
    team_id: str,
    member_data: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Add member to team"""
    db = await get_database()
    
    # Check team exists and permissions
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    if not await check_team_member_permissions(db, team_id, current_user.id, current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to add team members"
        )
    
    user_id = member_data.get("user_id")
    role = member_data.get("role", TeamMemberRole.REGULAR)
    responsibilities = member_data.get("responsibilities", [])
    skills = member_data.get("skills", [])
    
    # Verify user exists and is in the same organization
    user = await db.users.find_one({
        "id": user_id,
        "organization_id": team["organization_id"],
        "is_active": True
    })
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in organization"
        )
    
    # Check if user is already a team member
    existing_members = team.get("members", [])
    if any(member["user_id"] == user_id for member in existing_members):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a team member"
        )
    
    # Add new member
    new_member = TeamMember(
        user_id=user_id,
        role=role,
        joined_at=datetime.utcnow(),
        responsibilities=responsibilities,
        skills=skills
    )
    
    # Update team
    result = await db.teams.update_one(
        {"id": team_id},
        {
            "$push": {"members": new_member.model_dump()},
            "$set": {
                "member_count": len(existing_members) + 1,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        updated_team = await db.teams.find_one({"id": team_id})
        logger.info(f"Member {user_id} added to team {team_id} by {current_user.email}")
        return Team(**updated_team)
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to add team member"
    )

@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Remove member from team"""
    db = await get_database()
    
    # Check permissions
    if not await check_team_member_permissions(db, team_id, current_user.id, current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to remove team members"
        )
    
    # Remove member
    result = await db.teams.update_one(
        {"id": team_id},
        {
            "$pull": {"members": {"user_id": user_id}},
            "$inc": {"member_count": -1},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"Member {user_id} removed from team {team_id} by {current_user.email}")
        return {"message": "Member removed successfully"}
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Member not found in team"
    )

@router.put("/{team_id}/members/{user_id}")
async def update_team_member(
    team_id: str,
    user_id: str,
    member_update: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Update team member role, responsibilities, or skills"""
    db = await get_database()
    
    # Check permissions
    if not await check_team_member_permissions(db, team_id, current_user.id, current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update team members"
        )
    
    # Prepare update fields
    update_fields = {}
    if "role" in member_update:
        update_fields["members.$.role"] = member_update["role"]
    if "responsibilities" in member_update:
        update_fields["members.$.responsibilities"] = member_update["responsibilities"]
    if "skills" in member_update:
        update_fields["members.$.skills"] = member_update["skills"]
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid update fields provided"
        )
    
    update_fields["updated_at"] = datetime.utcnow()
    
    # Update member
    result = await db.teams.update_one(
        {"id": team_id, "members.user_id": user_id},
        {"$set": update_fields}
    )
    
    if result.modified_count > 0:
        logger.info(f"Team member {user_id} updated in team {team_id} by {current_user.email}")
        return {"message": "Team member updated successfully"}
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Team member not found"
    )

@router.get("/{team_id}/stats", response_model=TeamStats)
async def get_team_stats(
    team_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get team statistics"""
    db = await get_database()
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    check_team_access(current_user, team["organization_id"])
    
    members = team.get("members", [])
    active_members = len([m for m in members if m.get("is_active", True)])
    
    # TODO: Calculate project and task stats when those features are implemented
    project_count = team.get("active_project_count", 0)
    
    return TeamStats(
        team_id=team_id,
        total_members=len(members),
        active_members=active_members,
        total_projects=project_count,
        active_projects=project_count,
        completed_projects=0,
        total_tasks=0,
        completed_tasks=0,
        task_completion_rate=0.0,
        average_task_completion_time=None
    )

@router.get("/{team_id}/members/skills")
async def get_team_skills_overview(
    team_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get overview of all skills in team"""
    db = await get_database()
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    check_team_access(current_user, team["organization_id"])
    
    # Aggregate skills from all team members
    all_skills = {}
    members = team.get("members", [])
    
    for member in members:
        for skill in member.get("skills", []):
            if skill in all_skills:
                all_skills[skill] += 1
            else:
                all_skills[skill] = 1
    
    # Sort by frequency
    sorted_skills = sorted(all_skills.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "team_id": team_id,
        "skills_overview": [
            {"skill": skill, "count": count, "percentage": round((count / len(members)) * 100, 1)}
            for skill, count in sorted_skills
        ],
        "total_unique_skills": len(all_skills),
        "team_member_count": len(members)
    }