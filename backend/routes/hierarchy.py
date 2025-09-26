"""
Organization hierarchy and team visualization routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import logging

from database import get_database
from models.user import User, UserRole
from models.organization import Organization
from models.team import Team
from auth.middleware import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hierarchy", tags=["Hierarchy"])

def check_hierarchy_access(user: User, organization_id: str):
    """Check if user has access to view organization hierarchy"""
    if user.role == UserRole.SUPER_ADMIN:
        return True
    
    if user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: not a member of this organization"
        )
    
    return True

@router.get("/organization/{organization_id}")
async def get_organization_hierarchy(
    organization_id: str,
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_active_user)
):
    """Get complete organization hierarchy including teams and members"""
    check_hierarchy_access(current_user, organization_id)
    
    db = await get_database()
    
    # Get organization details
    organization = await db.organizations.find_one({"id": organization_id})
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Get all users in organization
    user_query = {"organization_id": organization_id}
    if not include_inactive:
        user_query["is_active"] = True
        
    users = await db.users.find(
        user_query,
        {
            "password_hash": 0,
            "email_verification_token": 0,
            "password_reset_token": 0,
            "password_reset_expires": 0
        }
    ).to_list(length=None)
    
    # Get all teams in organization
    team_query = {"organization_id": organization_id}
    if not include_inactive:
        team_query["is_active"] = True
        
    teams = await db.teams.find(team_query).to_list(length=None)
    
    # Build hierarchy structure
    hierarchy = {
        "organization": {
            "id": organization["id"],
            "name": organization["name"],
            "type": organization["type"],
            "status": organization["status"],
            "member_count": len(users),
            "team_count": len(teams)
        },
        "leadership": [],
        "teams": [],
        "unassigned_members": []
    }
    
    # Create user lookup
    user_lookup = {user["id"]: user for user in users}
    
    # Identify leadership (admin, manager roles)
    leadership_roles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]
    for user in users:
        if user["role"] in leadership_roles:
            hierarchy["leadership"].append({
                "id": user["id"],
                "name": f"{user['first_name']} {user['last_name']}",
                "email": user["email"],
                "role": user["role"],
                "status": user["status"],
                "avatar_url": user.get("avatar_url"),
                "direct_reports": []  # We'll populate this based on teams
            })
    
    # Process teams
    team_member_ids = set()
    for team in teams:
        team_data = {
            "id": team["id"],
            "name": team["name"],
            "type": team["type"],
            "description": team.get("description"),
            "lead": None,
            "members": [],
            "member_count": len(team.get("members", [])),
            "tags": team.get("tags", []),
            "is_active": team.get("is_active", True)
        }
        
        # Add team lead
        if team.get("lead_id") and team["lead_id"] in user_lookup:
            lead = user_lookup[team["lead_id"]]
            team_data["lead"] = {
                "id": lead["id"],
                "name": f"{lead['first_name']} {lead['last_name']}",
                "email": lead["email"],
                "role": lead["role"],
                "avatar_url": lead.get("avatar_url")
            }
        
        # Add team members
        for member in team.get("members", []):
            user_id = member["user_id"]
            if user_id in user_lookup:
                user = user_lookup[user_id]
                team_data["members"].append({
                    "id": user["id"],
                    "name": f"{user['first_name']} {user['last_name']}",
                    "email": user["email"],
                    "role": user["role"],
                    "team_role": member["role"],
                    "skills": member.get("skills", []),
                    "responsibilities": member.get("responsibilities", []),
                    "joined_at": member.get("joined_at"),
                    "avatar_url": user.get("avatar_url")
                })
                team_member_ids.add(user_id)
        
        hierarchy["teams"].append(team_data)
    
    # Find unassigned members
    for user in users:
        if user["id"] not in team_member_ids:
            hierarchy["unassigned_members"].append({
                "id": user["id"],
                "name": f"{user['first_name']} {user['last_name']}",
                "email": user["email"],
                "role": user["role"],
                "status": user["status"],
                "avatar_url": user.get("avatar_url"),
                "created_at": user.get("created_at")
            })
    
    return hierarchy

@router.get("/team-structure/{organization_id}")
async def get_team_structure(
    organization_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get team structure visualization data"""
    check_hierarchy_access(current_user, organization_id)
    
    db = await get_database()
    
    # Get teams with their relationships
    teams = await db.teams.find({
        "organization_id": organization_id,
        "is_active": True
    }).to_list(length=None)
    
    # Get users for member details
    users = await db.users.find(
        {"organization_id": organization_id, "is_active": True},
        {
            "password_hash": 0,
            "email_verification_token": 0,
            "password_reset_token": 0,
            "password_reset_expires": 0
        }
    ).to_list(length=None)
    
    user_lookup = {user["id"]: user for user in users}
    
    # Build team structure for visualization
    team_structure = {
        "nodes": [],
        "edges": [],
        "stats": {
            "total_teams": len(teams),
            "total_members": len(users),
            "team_types": {}
        }
    }
    
    # Create team nodes
    for team in teams:
        # Count team type
        team_type = team["type"]
        team_structure["stats"]["team_types"][team_type] = team_structure["stats"]["team_types"].get(team_type, 0) + 1
        
        # Create team node
        node = {
            "id": team["id"],
            "type": "team",
            "name": team["name"],
            "team_type": team_type,
            "description": team.get("description"),
            "member_count": len(team.get("members", [])),
            "lead_id": team.get("lead_id"),
            "tags": team.get("tags", [])
        }
        
        # Add lead information
        if team.get("lead_id") and team["lead_id"] in user_lookup:
            lead = user_lookup[team["lead_id"]]
            node["lead_name"] = f"{lead['first_name']} {lead['last_name']}"
        
        team_structure["nodes"].append(node)
        
        # Create member nodes and edges
        for member in team.get("members", []):
            user_id = member["user_id"]
            if user_id in user_lookup:
                user = user_lookup[user_id]
                
                # Create member node (if not exists)
                member_node_id = f"user_{user_id}"
                if not any(node["id"] == member_node_id for node in team_structure["nodes"]):
                    member_node = {
                        "id": member_node_id,
                        "type": "user",
                        "name": f"{user['first_name']} {user['last_name']}",
                        "role": user["role"],
                        "email": user["email"],
                        "avatar_url": user.get("avatar_url")
                    }
                    team_structure["nodes"].append(member_node)
                
                # Create edge between team and member
                edge = {
                    "id": f"{team['id']}_{user_id}",
                    "source": team["id"],
                    "target": member_node_id,
                    "type": "membership",
                    "team_role": member["role"],
                    "skills": member.get("skills", []),
                    "is_lead": team.get("lead_id") == user_id
                }
                team_structure["edges"].append(edge)
    
    return team_structure

@router.get("/reporting-structure/{organization_id}")
async def get_reporting_structure(
    organization_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get reporting structure based on roles and team leadership"""
    check_hierarchy_access(current_user, organization_id)
    
    db = await get_database()
    
    # Get all users and teams
    users = await db.users.find(
        {"organization_id": organization_id, "is_active": True},
        {
            "password_hash": 0,
            "email_verification_token": 0,
            "password_reset_token": 0,
            "password_reset_expires": 0
        }
    ).to_list(length=None)
    
    teams = await db.teams.find({
        "organization_id": organization_id,
        "is_active": True
    }).to_list(length=None)
    
    # Build reporting structure
    reporting_structure = []
    
    # Group users by role hierarchy
    role_hierarchy = {
        UserRole.SUPER_ADMIN: 0,
        UserRole.ADMIN: 1,
        UserRole.MANAGER: 2,
        UserRole.TEAM_LEAD: 3,
        UserRole.MEMBER: 4,
        UserRole.VIEWER: 5
    }
    
    users_by_role = {}
    for user in users:
        role = user["role"]
        if role not in users_by_role:
            users_by_role[role] = []
        users_by_role[role].append(user)
    
    # Create reporting relationships
    for role, level in role_hierarchy.items():
        if role not in users_by_role:
            continue
            
        for user in users_by_role[role]:
            user_data = {
                "id": user["id"],
                "name": f"{user['first_name']} {user['last_name']}",
                "email": user["email"],
                "role": role,
                "level": level,
                "avatar_url": user.get("avatar_url"),
                "direct_reports": [],
                "teams_led": [],
                "teams_member": []
            }
            
            # Find teams where user is a lead
            for team in teams:
                if team.get("lead_id") == user["id"]:
                    user_data["teams_led"].append({
                        "id": team["id"],
                        "name": team["name"],
                        "type": team["type"],
                        "member_count": len(team.get("members", []))
                    })
                
                # Find teams where user is a member
                for member in team.get("members", []):
                    if member["user_id"] == user["id"]:
                        user_data["teams_member"].append({
                            "id": team["id"],
                            "name": team["name"],
                            "type": team["type"],
                            "role": member["role"]
                        })
            
            reporting_structure.append(user_data)
    
    # Sort by role level and then by name
    reporting_structure.sort(key=lambda x: (x["level"], x["name"]))
    
    return {
        "organization_id": organization_id,
        "reporting_structure": reporting_structure,
        "summary": {
            "total_employees": len(users),
            "leadership_count": len([u for u in users if u["role"] in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]]),
            "team_leads_count": len([u for u in users if u["role"] == UserRole.TEAM_LEAD]),
            "members_count": len([u for u in users if u["role"] in [UserRole.MEMBER, UserRole.VIEWER]])
        }
    }

@router.get("/department-structure/{organization_id}")
async def get_department_structure(
    organization_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get department-based organization structure"""
    check_hierarchy_access(current_user, organization_id)
    
    db = await get_database()
    
    teams = await db.teams.find({
        "organization_id": organization_id,
        "is_active": True
    }).to_list(length=None)
    
    # Group teams by type (which represents departments)
    departments = {}
    
    for team in teams:
        dept_type = team["type"]
        if dept_type not in departments:
            departments[dept_type] = {
                "name": dept_type.replace("_", " ").title(),
                "type": dept_type,
                "teams": [],
                "total_members": 0,
                "team_leads": []
            }
        
        team_data = {
            "id": team["id"],
            "name": team["name"],
            "description": team.get("description"),
            "member_count": len(team.get("members", [])),
            "lead_id": team.get("lead_id"),
            "tags": team.get("tags", [])
        }
        
        departments[dept_type]["teams"].append(team_data)
        departments[dept_type]["total_members"] += team_data["member_count"]
        
        if team.get("lead_id"):
            departments[dept_type]["team_leads"].append(team["lead_id"])
    
    # Convert to list and add statistics
    department_structure = []
    for dept_type, dept_data in departments.items():
        dept_data["team_count"] = len(dept_data["teams"])
        dept_data["unique_leads"] = len(set(dept_data["team_leads"]))
        department_structure.append(dept_data)
    
    # Sort by total members (largest first)
    department_structure.sort(key=lambda x: x["total_members"], reverse=True)
    
    return {
        "organization_id": organization_id,
        "departments": department_structure,
        "summary": {
            "total_departments": len(departments),
            "total_teams": sum(len(dept["teams"]) for dept in departments.values()),
            "total_members": sum(dept["total_members"] for dept in departments.values())
        }
    }