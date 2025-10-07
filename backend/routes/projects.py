from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid
from bson import ObjectId

from database import get_database
from auth.middleware import get_current_user
from models import (
    User, 
    Project, ProjectCreate, ProjectUpdate, ProjectInDB, ProjectSummary,
    ProjectStatus, ProjectPriority, ProjectVisibility,
    ProjectBudget, ProjectMilestone, ProjectSettings
)

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Helper function to convert ObjectId to string
def serialize_project(project_data: Dict) -> Dict:
    """Convert MongoDB ObjectId to string and ensure proper serialization"""
    if project_data:
        if "_id" in project_data:
            del project_data["_id"]
        # Ensure all date fields are properly serialized (date fields only, no time)
        for date_field in ["start_date", "due_date"]:
            if date_field in project_data and project_data[date_field]:
                if isinstance(project_data[date_field], datetime):
                    # Convert datetime to date (strip time component)
                    project_data[date_field] = project_data[date_field].date().isoformat()
                elif isinstance(project_data[date_field], date):
                    project_data[date_field] = project_data[date_field].isoformat()
                elif hasattr(project_data[date_field], 'isoformat'):
                    # If it's a datetime-like object, convert to date
                    try:
                        if hasattr(project_data[date_field], 'date'):
                            project_data[date_field] = project_data[date_field].date().isoformat()
                        else:
                            project_data[date_field] = project_data[date_field].isoformat()
                    except:
                        project_data[date_field] = str(project_data[date_field])
        
        # Ensure datetime fields are properly serialized (keep time component)
        for datetime_field in ["created_at", "updated_at", "archived_at"]:
            if datetime_field in project_data and project_data[datetime_field]:
                if isinstance(project_data[datetime_field], datetime):
                    project_data[datetime_field] = project_data[datetime_field].isoformat()
                elif isinstance(project_data[datetime_field], date):
                    project_data[datetime_field] = project_data[datetime_field].isoformat()
                elif hasattr(project_data[datetime_field], 'isoformat'):
                    project_data[datetime_field] = project_data[datetime_field].isoformat()
        
        # Handle milestones dates
        if "milestones" in project_data:
            for milestone in project_data["milestones"]:
                if "due_date" in milestone and milestone["due_date"]:
                    if isinstance(milestone["due_date"], datetime):
                        # Convert datetime to date (strip time component)
                        milestone["due_date"] = milestone["due_date"].date().isoformat()
                    elif isinstance(milestone["due_date"], date):
                        milestone["due_date"] = milestone["due_date"].isoformat()
                    elif hasattr(milestone["due_date"], 'date'):
                        milestone["due_date"] = milestone["due_date"].date().isoformat()
                if "completed_at" in milestone and milestone["completed_at"]:
                    if isinstance(milestone["completed_at"], datetime):
                        milestone["completed_at"] = milestone["completed_at"].isoformat()
                    elif hasattr(milestone["completed_at"], 'isoformat'):
                        milestone["completed_at"] = milestone["completed_at"].isoformat()
    return project_data

@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    try:
        db = await get_database()
        
        # Verify user has permission to create projects in the organization
        if current_user.organization_id != project_data.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create project in different organization"
            )
        
        # Check if user has appropriate role
        if current_user.role not in ["super_admin", "admin", "manager", "team_lead"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create project"
            )
        
        # Verify organization exists
        org_exists = await db.organizations.find_one({"id": project_data.organization_id})
        if not org_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Verify owner exists and is in the same organization
        owner = await db.users.find_one({"id": project_data.owner_id})
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project owner not found"
            )
        if owner.get("organization_id") != project_data.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project owner must be in the same organization"
            )
        
        # Verify team members exist and are in the same organization
        if project_data.team_members:
            for member_id in project_data.team_members:
                member = await db.users.find_one({"id": member_id})
                if not member:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Team member {member_id} not found"
                    )
                if member.get("organization_id") != project_data.organization_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Team member {member_id} must be in the same organization"
                    )
        
        # Generate unique project ID
        project_id = f"proj-{uuid.uuid4().hex[:12]}"
        
        # Prepare project data
        project_dict = project_data.model_dump()
        project_dict.update({
            "id": project_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "task_count": 0,
            "completed_task_count": 0
        })
        
        # Generate milestone IDs if milestones provided
        if project_dict.get("milestones"):
            for milestone in project_dict["milestones"]:
                if not milestone.get("id"):
                    milestone["id"] = f"milestone-{uuid.uuid4().hex[:8]}"
        
        # Insert project
        result = await db.projects.insert_one(project_dict)
        
        # Update organization project count
        await db.organizations.update_one(
            {"id": project_data.organization_id},
            {"$inc": {"project_count": 1}}
        )
        
        # Fetch and return created project
        created_project = await db.projects.find_one({"id": project_id})
        return serialize_project(created_project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )

@router.get("")
async def list_projects(
    status_filter: Optional[ProjectStatus] = Query(None, description="Filter by project status"),
    priority_filter: Optional[ProjectPriority] = Query(None, description="Filter by project priority"),
    owner_id: Optional[str] = Query(None, description="Filter by project owner"),
    full_details: bool = Query(False, description="Return full project details including description and team members"),
    limit: int = Query(50, ge=1, le=100, description="Number of projects to return"),
    skip: int = Query(0, ge=0, description="Number of projects to skip"),
    current_user: User = Depends(get_current_user)
):
    """List projects in user's organization"""
    try:
        db = await get_database()
        
        # Build filter query
        query = {"organization_id": current_user.organization_id}
        
        if status_filter:
            query["status"] = status_filter
        if priority_filter:
            query["priority"] = priority_filter
        if owner_id:
            query["owner_id"] = owner_id
        
        # Apply role-based filtering
        if current_user.role in ["member", "viewer"]:
            # Only show projects where user is a team member or owner
            query["$or"] = [
                {"owner_id": current_user.id},
                {"team_members": {"$in": [current_user.id]}}
            ]
        
        # Fetch projects with pagination
        cursor = db.projects.find(query).skip(skip).limit(limit)
        projects = await cursor.to_list(length=limit)
        
        # Convert to ProjectSummary format or return full details
        if full_details:
            # Return full project details as raw dict (will be serialized as JSON)
            result_projects = []
            for project in projects:
                # Serialize the project data
                serialized_project = serialize_project(project.copy())
                result_projects.append(serialized_project)
            return result_projects
        else:
            # Return standard ProjectSummary format
            project_summaries = []
            for project in projects:
                # Handle due_date conversion from datetime string to date
                due_date = None
                if project.get("due_date"):
                    due_date_str = project["due_date"]
                    if isinstance(due_date_str, str):
                        try:
                            due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00")).date()
                        except:
                            due_date = None
                    elif hasattr(due_date_str, 'date'):
                        due_date = due_date_str.date()
                
                project_summary = {
                    "id": project["id"],
                    "name": project["name"],
                    "status": project["status"],
                    "priority": project["priority"],
                    "progress_percentage": project.get("progress_percentage", 0),
                    "due_date": due_date,
                    "owner_id": project["owner_id"],
                    "task_count": project.get("task_count", 0),
                    "team_member_count": len(project.get("team_members", []))
                }
                project_summaries.append(project_summary)
            
            return project_summaries
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}"
        )

@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific project by ID"""
    try:
        db = await get_database()
        
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check if user has access to this project
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Additional access control for members/viewers
        if current_user.role in ["member", "viewer"]:
            if (current_user.id != project["owner_id"] and 
                current_user.id not in project.get("team_members", [])):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this project"
                )
        
        return serialize_project(project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}"
        )

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a project"""
    try:
        db = await get_database()
        
        # Check if project exists and user has access
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Check permissions - owners, managers, admins can edit
        if current_user.role in ["member", "viewer"]:
            if current_user.id != project["owner_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to update project"
                )
        
        # Prepare update data
        update_data = project_update.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # Generate milestone IDs for new milestones
            if "milestones" in update_data:
                for milestone in update_data["milestones"]:
                    if not milestone.get("id"):
                        milestone["id"] = f"milestone-{uuid.uuid4().hex[:8]}"
            
            # Update project
            await db.projects.update_one(
                {"id": project_id},
                {"$set": update_data}
            )
        
        # Fetch and return updated project
        updated_project = await db.projects.find_one({"id": project_id})
        return serialize_project(updated_project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        )

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a project (soft delete by archiving)"""
    try:
        db = await get_database()
        
        # Check if project exists and user has access
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Check permissions - only admins, managers, and project owners can delete
        if current_user.role not in ["super_admin", "admin", "manager"]:
            if current_user.id != project["owner_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to delete project"
                )
        
        # Soft delete by archiving
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": ProjectStatus.ARCHIVED,
                    "archived_at": datetime.utcnow(),
                    "archived_by": current_user.id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update organization project count
        await db.organizations.update_one(
            {"id": project["organization_id"]},
            {"$inc": {"project_count": -1}}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )

@router.get("/{project_id}/dashboard", response_model=Dict[str, Any])
async def get_project_dashboard(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get project dashboard metrics and analytics"""
    try:
        db = await get_database()
        
        # Check project access
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Calculate project metrics
        total_tasks = project.get("task_count", 0)
        completed_tasks = project.get("completed_task_count", 0)
        progress_percentage = project.get("progress_percentage", 0)
        
        # Calculate milestone progress
        milestones = project.get("milestones", [])
        total_milestones = len(milestones)
        completed_milestones = len([m for m in milestones if m.get("completed", False)])
        milestone_progress = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        
        # Calculate budget metrics
        budget = project.get("budget", {})
        budget_total = budget.get("total_budget", 0)
        budget_spent = budget.get("spent_amount", 0)
        budget_remaining = budget_total - budget_spent if budget_total else None
        budget_utilization = (budget_spent / budget_total * 100) if budget_total > 0 else 0
        
        # Calculate team metrics
        team_members = project.get("team_members", [])
        team_size = len(team_members)
        
        # Calculate timeline metrics
        start_date = project.get("start_date")
        due_date = project.get("due_date")
        today = date.today()
        
        days_elapsed = 0
        total_days = 0
        days_remaining = 0
        
        if start_date and due_date:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date).date()
            if isinstance(due_date, str):
                due_date = datetime.fromisoformat(due_date).date()
                
            total_days = (due_date - start_date).days
            days_elapsed = (today - start_date).days if today >= start_date else 0
            days_remaining = (due_date - today).days if due_date >= today else 0
        
        timeline_progress = (days_elapsed / total_days * 100) if total_days > 0 else 0
        is_overdue = due_date and today > due_date and project["status"] not in ["completed", "cancelled", "archived"]
        
        return {
            "project_id": project_id,
            "project_name": project["name"],
            "status": project["status"],
            "priority": project["priority"],
            "progress": {
                "overall_percentage": progress_percentage,
                "tasks": {
                    "total": total_tasks,
                    "completed": completed_tasks,
                    "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
                },
                "milestones": {
                    "total": total_milestones,
                    "completed": completed_milestones,
                    "completion_rate": milestone_progress
                }
            },
            "budget": {
                "total": budget_total,
                "spent": budget_spent,
                "remaining": budget_remaining,
                "utilization_percentage": budget_utilization,
                "currency": budget.get("currency", "USD")
            },
            "team": {
                "size": team_size,
                "members": team_members
            },
            "timeline": {
                "start_date": start_date,
                "due_date": due_date,
                "days_elapsed": max(0, days_elapsed),
                "days_remaining": max(0, days_remaining),
                "total_days": max(0, total_days),
                "progress_percentage": min(100, max(0, timeline_progress)),
                "is_overdue": is_overdue
            },
            "created_at": project.get("created_at"),
            "updated_at": project.get("updated_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project dashboard: {str(e)}"
        )

@router.post("/{project_id}/milestones", response_model=Dict[str, Any])
async def add_milestone(
    project_id: str,
    milestone_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Add a milestone to a project"""
    try:
        db = await get_database()
        
        # Check project access and permissions
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Create milestone
        milestone = {
            "id": f"milestone-{uuid.uuid4().hex[:8]}",
            "title": milestone_data.get("title"),
            "description": milestone_data.get("description"),
            "due_date": milestone_data.get("due_date"),
            "completed": False,
            "completed_at": None
        }
        
        # Add milestone to project
        await db.projects.update_one(
            {"id": project_id},
            {
                "$push": {"milestones": milestone},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {"message": "Milestone added successfully", "milestone": milestone}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add milestone: {str(e)}"
        )

@router.put("/{project_id}/milestones/{milestone_id}", response_model=Dict[str, Any])
async def update_milestone(
    project_id: str,
    milestone_id: str,
    milestone_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Update a specific milestone"""
    try:
        db = await get_database()
        
        # Check project access
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Update milestone in project
        update_fields = {}
        for field in ["title", "description", "due_date", "completed"]:
            if field in milestone_data:
                update_fields[f"milestones.$.{field}"] = milestone_data[field]
        
        if milestone_data.get("completed"):
            update_fields["milestones.$.completed_at"] = datetime.utcnow()
        
        if update_fields:
            result = await db.projects.update_one(
                {"id": project_id, "milestones.id": milestone_id},
                {
                    "$set": {
                        **update_fields,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Milestone not found"
                )
        
        return {"message": "Milestone updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update milestone: {str(e)}"
        )

@router.get("/templates", response_model=List[Dict[str, Any]])
async def get_project_templates(
    current_user: User = Depends(get_current_user)
):
    """Get available project templates"""
    templates = [
        {
            "id": "software_development",
            "name": "Software Development",
            "description": "Template for software development projects with agile methodology",
            "category": "Technology",
            "milestones": [
                {"title": "Project Planning", "description": "Define requirements and architecture"},
                {"title": "Development Phase 1", "description": "Core functionality development"},
                {"title": "Testing & QA", "description": "Quality assurance and testing"},
                {"title": "Deployment", "description": "Production deployment"},
                {"title": "Post-Launch Support", "description": "Monitoring and support"}
            ],
            "settings": {
                "require_time_tracking": True,
                "auto_assign_tasks": False
            },
            "tags": ["software", "development", "agile"]
        },
        {
            "id": "marketing_campaign",
            "name": "Marketing Campaign",
            "description": "Template for marketing campaign projects",
            "category": "Marketing",
            "milestones": [
                {"title": "Campaign Strategy", "description": "Define campaign goals and strategy"},
                {"title": "Content Creation", "description": "Create marketing materials"},
                {"title": "Campaign Launch", "description": "Launch marketing campaign"},
                {"title": "Performance Analysis", "description": "Analyze campaign performance"}
            ],
            "settings": {
                "require_time_tracking": False,
                "auto_assign_tasks": True
            },
            "tags": ["marketing", "campaign", "promotion"]
        },
        {
            "id": "product_launch",
            "name": "Product Launch",
            "description": "Template for new product launch projects",
            "category": "Product",
            "milestones": [
                {"title": "Market Research", "description": "Research target market"},
                {"title": "Product Development", "description": "Develop and test product"},
                {"title": "Marketing Preparation", "description": "Prepare marketing materials"},
                {"title": "Launch Event", "description": "Execute product launch"},
                {"title": "Post-Launch Monitoring", "description": "Monitor performance and feedback"}
            ],
            "settings": {
                "require_time_tracking": True,
                "auto_assign_tasks": False
            },
            "tags": ["product", "launch", "strategy"]
        }
    ]
    
    return templates

# Team Management Endpoints

@router.post("/{project_id}/team/add", response_model=Dict[str, Any])
async def add_team_member(
    project_id: str,
    member_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Add a team member to a project"""
    try:
        db = await get_database()
        
        # Check project access and permissions
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Check if user has permission to manage team
        if current_user.role not in ["super_admin", "admin", "manager", "team_lead"] and current_user.id != project["owner_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to manage project team"
            )
        
        user_id = member_data.get("user_id")
        role = member_data.get("role", "member")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User ID is required"
            )
        
        # Verify user exists and is in same organization
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add user from different organization"
            )
        
        # Check if user is already a team member
        current_members = project.get("team_members", [])
        if user_id in current_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a team member"
            )
        
        # Add user to team members
        await db.projects.update_one(
            {"id": project_id},
            {
                "$push": {"team_members": user_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Update user's project assignments (if field exists)
        await db.users.update_one(
            {"id": user_id},
            {
                "$addToSet": {"assigned_projects": project_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "message": "Team member added successfully",
            "user_id": user_id,
            "role": role,
            "project_id": project_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add team member: {str(e)}"
        )

@router.delete("/{project_id}/team/{user_id}", response_model=Dict[str, Any])
async def remove_team_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove a team member from a project"""
    try:
        db = await get_database()
        
        # Check project access and permissions
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Check if user has permission to manage team
        if current_user.role not in ["super_admin", "admin", "manager", "team_lead"] and current_user.id != project["owner_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to manage project team"
            )
        
        # Cannot remove project owner
        if user_id == project["owner_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove project owner from team"
            )
        
        # Check if user is actually a team member
        current_members = project.get("team_members", [])
        if user_id not in current_members:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not a team member"
            )
        
        # Remove user from team members
        await db.projects.update_one(
            {"id": project_id},
            {
                "$pull": {"team_members": user_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Remove project from user's assignments (if field exists)
        await db.users.update_one(
            {"id": user_id},
            {
                "$pull": {"assigned_projects": project_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Unassign user from all tasks in this project
        await db.tasks.update_many(
            {"project_id": project_id, "assigned_to": user_id},
            {
                "$pull": {"assigned_to": user_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "message": "Team member removed successfully",
            "user_id": user_id,
            "project_id": project_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove team member: {str(e)}"
        )

@router.get("/{project_id}/team", response_model=List[Dict[str, Any]])
async def get_project_team(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about project team members"""
    try:
        db = await get_database()
        
        # Check project access
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        team_members = project.get("team_members", [])
        if not team_members:
            return []
        
        # Get detailed user information for team members
        team_details = []
        users_cursor = db.users.find({"id": {"$in": team_members}})
        users = await users_cursor.to_list(length=None)
        
        for user in users:
            # Get user's tasks in this project for performance metrics
            user_tasks = await db.tasks.find({"project_id": project_id, "assigned_to": user["id"]}).to_list(length=None)
            completed_tasks = [t for t in user_tasks if t.get("status") == "completed"]
            
            # Calculate performance metrics
            completion_rate = (len(completed_tasks) / len(user_tasks) * 100) if user_tasks else 0
            
            # Determine user's role in project
            role = "owner" if user["id"] == project["owner_id"] else "member"
            
            team_details.append({
                "user_id": user["id"],
                "name": user.get("name", f"{user.get('first_name', '')} {user.get('last_name', '')}").strip() or "Unknown User",
                "email": user["email"],
                "role": role,
                "joined_at": user.get("created_at"),  # For now, use user creation date
                "permissions": ["read", "write"] if role == "member" else ["read", "write", "admin"],
                "performance": {
                    "total_tasks": len(user_tasks),
                    "completed_tasks": len(completed_tasks),
                    "completion_rate": completion_rate,
                    "workload": min(100, len(user_tasks) * 10),  # Simple workload calculation
                    "utilization": min(100, completion_rate + 20),  # Simple utilization calculation
                },
                "metadata": user.get("metadata", {}),
                "recent_activity": f"{len([t for t in user_tasks if t.get('updated_at') and (datetime.utcnow() - datetime.fromisoformat(t['updated_at'].replace('Z', '+00:00'))).days < 7])} tasks updated this week"
            })
        
        return team_details
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project team: {str(e)}"
        )