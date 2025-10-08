from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from collections import defaultdict

from database import get_database
from auth.utils import verify_token
from auth.middleware import get_current_user, get_current_active_user
from models import User

router = APIRouter(prefix="/api/timeline", tags=["Timeline Management"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.get("/gantt/{project_id}")
async def get_timeline_gantt_data(
    project_id: str,
    show_completed: bool = Query(default=True, description="Include completed tasks"),
    critical_only: bool = Query(default=False, description="Show only critical path tasks"),
    search: Optional[str] = Query(default=None, description="Search query filter"),
    statuses: Optional[str] = Query(default=None, description="Comma-separated list of task statuses"),
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get Gantt chart timeline data for a project"""
    try:
        # Get project details
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Build query for tasks
        task_query = {"project_id": project_id}
        
        # Apply filters
        if not show_completed:
            task_query["status"] = {"$ne": "completed"}
        
        if statuses:
            status_list = [s.strip() for s in statuses.split(',')]
            task_query["status"] = {"$in": status_list}
        
        if search:
            task_query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        # Get timeline tasks first (if they exist)
        timeline_tasks_cursor = db.timeline_tasks.find(task_query)
        timeline_tasks = await timeline_tasks_cursor.to_list(length=None)
        
        # If no timeline tasks, get regular tasks and convert them
        if not timeline_tasks:
            tasks_cursor = db.tasks.find(task_query)
            regular_tasks = await tasks_cursor.to_list(length=None)
            
            # Convert regular tasks to timeline format
            timeline_tasks = []
            for task in regular_tasks:
                # Calculate timeline dates
                start_date = task.get("created_at", datetime.utcnow())
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                
                # Estimate duration based on priority and complexity
                priority_duration_map = {
                    "critical": 3,
                    "high": 5, 
                    "medium": 7,
                    "low": 14
                }
                duration_days = priority_duration_map.get(task.get("priority", "medium"), 7)
                end_date = start_date + timedelta(days=duration_days)
                
                timeline_task = {
                    "id": task["id"],
                    "task_id": task["id"],
                    "project_id": project_id,
                    "title": task.get("title", "Untitled Task"),
                    "description": task.get("description", ""),
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "duration": duration_days,
                    "progress": 1.0 if task.get("status") == "completed" else 0.6 if task.get("status") == "in_progress" else 0.0,
                    "status": task.get("status", "todo"),
                    "priority": task.get("priority", "medium"),
                    "assignee_id": task.get("assignee_id"),
                    "dependencies": [],
                    "resource_allocation": 1.0,
                    "is_critical_path": task.get("priority") == "critical",
                    "estimated_hours": duration_days * 8,
                    "actual_hours": 0,
                    "budget_allocated": 0,
                    "budget_spent": 0,
                    "team_id": None,
                    "tags": task.get("tags", []),
                    "created_at": task.get("created_at"),
                    "updated_at": task.get("updated_at", datetime.utcnow().isoformat())
                }
                timeline_tasks.append(timeline_task)
        
        # Get dependencies
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        # Get team and user information
        teams_cursor = db.teams.find({"organization_id": project.get("organization_id", "demo-org-001")})
        teams = await teams_cursor.to_list(length=None)
        
        users_cursor = db.users.find({"organization_id": project.get("organization_id", "demo-org-001")})
        users = await users_cursor.to_list(length=None)
        
        # Create lookup maps
        team_map = {team["id"]: team for team in teams}
        user_map = {user["id"]: user for user in users}
        
        # Enhance timeline tasks with team and user data
        for task in timeline_tasks:
            if task.get("assignee_id") and task["assignee_id"] in user_map:
                user = user_map[task["assignee_id"]]
                task["assignee"] = {
                    "id": user["id"],
                    "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                    "email": user.get("email"),
                    "avatar_url": user.get("avatar_url")
                }
            
            if task.get("team_id") and task["team_id"] in team_map:
                task["team"] = team_map[task["team_id"]]
        
        # Apply critical path filter if requested
        if critical_only:
            timeline_tasks = [task for task in timeline_tasks if task.get("is_critical_path")]
        
        # Calculate project statistics
        total_tasks = len(timeline_tasks)
        completed_tasks = len([t for t in timeline_tasks if t.get("status") == "completed"])
        in_progress_tasks = len([t for t in timeline_tasks if t.get("status") == "in_progress"])
        overdue_tasks = 0  # Calculate based on current date vs end_date
        
        current_date = datetime.utcnow()
        for task in timeline_tasks:
            end_date = datetime.fromisoformat(task["end_date"].replace('Z', '+00:00'))
            if end_date < current_date and task.get("status") != "completed":
                overdue_tasks += 1
        
        # Calculate project health score (0-100)
        if total_tasks > 0:
            completion_rate = completed_tasks / total_tasks
            overdue_rate = overdue_tasks / total_tasks
            health_score = max(0, min(100, int((completion_rate * 100) - (overdue_rate * 50))))
        else:
            health_score = 100
        
        # Calculate estimated completion date
        if in_progress_tasks > 0 or (total_tasks - completed_tasks) > 0:
            # Estimate based on average task duration
            avg_duration = 7  # days
            remaining_tasks = total_tasks - completed_tasks
            estimated_days = remaining_tasks * avg_duration
            estimated_completion = (current_date + timedelta(days=estimated_days)).isoformat()
        else:
            estimated_completion = current_date.isoformat()
        
        return {
            "success": True,
            "project": {
                "id": project["id"],
                "name": project.get("name", "Untitled Project"),
                "description": project.get("description", "")
            },
            "tasks": timeline_tasks,
            "dependencies": dependencies,
            "stats": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress_tasks,
                "overdue_tasks": overdue_tasks,
                "completion_percentage": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
                "health_score": health_score,
                "estimated_completion": estimated_completion
            },
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "total_dependencies": len(dependencies),
                "has_critical_path": any(task.get("is_critical_path") for task in timeline_tasks),
                "filters_applied": {
                    "show_completed": show_completed,
                    "critical_only": critical_only,
                    "search": search,
                    "statuses": statuses
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching timeline gantt data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch timeline data: {str(e)}"
        )


@router.get("/tasks/{project_id}")
async def get_timeline_tasks(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get timeline tasks for a project"""
    try:
        # Get project details
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get timeline tasks
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        return {
            "success": True,
            "tasks": tasks,
            "project_id": project_id,
            "total_count": len(tasks)
        }
        
    except Exception as e:
        logger.error(f"Error fetching timeline tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch timeline tasks: {str(e)}"
        )


@router.get("/project/{project_id}")
async def get_project_timeline_overview(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get project timeline overview"""
    try:
        # Get project details
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get timeline tasks count
        timeline_tasks_count = await db.timeline_tasks.count_documents({"project_id": project_id})
        
        # Get regular tasks count as backup
        regular_tasks_count = await db.tasks.count_documents({"project_id": project_id})
        
        # Get dependencies count
        dependencies_count = await db.task_dependencies.count_documents({"project_id": project_id})
        
        return {
            "success": True,
            "project": project,
            "timeline_tasks_count": timeline_tasks_count,
            "regular_tasks_count": regular_tasks_count,
            "dependencies_count": dependencies_count,
            "has_timeline_data": timeline_tasks_count > 0 or regular_tasks_count > 0
        }
        
    except Exception as e:
        logger.error(f"Error fetching project timeline overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project timeline overview: {str(e)}"
        )


@router.get("/stats/{project_id}")
async def get_timeline_stats(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get timeline statistics for a project"""
    try:
        # Get project details
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get all tasks for the project
        tasks_cursor = db.tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        # Calculate statistics
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
        in_progress_tasks = len([t for t in tasks if t.get("status") == "in_progress"])
        
        # Calculate overdue tasks
        current_date = datetime.utcnow()
        overdue_tasks = 0
        for task in tasks:
            # Estimate due date based on creation + priority
            created_at = task.get("created_at", current_date)
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            priority_duration = {"critical": 3, "high": 7, "medium": 14, "low": 30}
            due_date = created_at + timedelta(days=priority_duration.get(task.get("priority", "medium"), 14))
            
            if due_date < current_date and task.get("status") != "completed":
                overdue_tasks += 1
        
        # Calculate health score
        if total_tasks > 0:
            completion_rate = completed_tasks / total_tasks
            overdue_rate = overdue_tasks / total_tasks
            health_score = max(0, min(100, int((completion_rate * 100) - (overdue_rate * 50))))
        else:
            health_score = 100
        
        return {
            "success": True,
            "stats": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress_tasks,
                "overdue_tasks": overdue_tasks,
                "completion_percentage": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
                "timeline_health_score": health_score,
                "critical_path_length": 0,  # Would need proper calculation
                "resource_utilization": 0.85,  # Mock value
                "estimated_completion": (current_date + timedelta(days=30)).isoformat(),
                "conflicts_count": 0
            },
            "project_id": project_id,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching timeline stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch timeline stats: {str(e)}"
        )