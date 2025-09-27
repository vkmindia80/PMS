from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
from bson import ObjectId

# Import database connection
from database import get_database

# Import authentication
from auth.middleware import get_current_active_user

# Import models
from models.user import User
from models.project import ProjectStatus
from models.task import TaskStatus, TaskPriority

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/portfolio/overview", response_model=Dict[str, Any])
async def get_portfolio_overview(
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive portfolio overview with key metrics"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        # Get all data for the organization
        organizations = await db.organizations.find({"id": org_id}).to_list(length=None)
        projects = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks = await db.tasks.find({}).to_list(length=None)
        teams = await db.teams.find({"organization_id": org_id}).to_list(length=None)
        users = await db.users.find({"organization_id": org_id}).to_list(length=None)
        
        # Filter tasks for organization projects
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Calculate key metrics
        total_projects = len(projects)
        active_projects = len([p for p in projects if p.get("status") == "active"])
        completed_projects = len([p for p in projects if p.get("status") == "completed"])
        
        total_tasks = len(org_tasks)
        completed_tasks = len([t for t in org_tasks if t.get("status") == "completed"])
        overdue_tasks = 0
        
        # Calculate overdue tasks
        for task in org_tasks:
            if task.get("due_date") and task.get("status") not in ["completed", "cancelled"]:
                try:
                    due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00"))
                    if due_date < datetime.utcnow():
                        overdue_tasks += 1
                except:
                    continue
        
        total_teams = len(teams)
        total_members = len(users)
        
        # Project health score (simplified calculation)
        project_health = 0
        if total_projects > 0:
            on_time_projects = total_projects - len([p for p in projects if p.get("status") in ["overdue", "at_risk"]])
            project_health = (on_time_projects / total_projects) * 100
        
        # Task completion rate
        task_completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Resource utilization (simplified)
        resource_utilization = 75  # Placeholder calculation
        
        return {
            "overview": {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "completed_projects": completed_projects,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "overdue_tasks": overdue_tasks,
                "total_teams": total_teams,
                "total_members": total_members,
                "project_health_score": round(project_health, 1),
                "task_completion_rate": round(task_completion_rate, 1),
                "resource_utilization": resource_utilization
            },
            "trends": {
                "projects_created_this_month": len([p for p in projects if is_current_month(p.get("created_at"))]),
                "tasks_completed_this_week": len([t for t in org_tasks if t.get("status") == "completed" and is_current_week(t.get("updated_at"))]),
                "new_team_members": len([u for u in users if is_current_month(u.get("created_at"))])
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get portfolio overview: {str(e)}"
        )

@router.get("/projects/health", response_model=Dict[str, Any])
async def get_project_health_metrics(
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed project health indicators"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        projects = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks = await db.tasks.find({}).to_list(length=None)
        
        # Group tasks by project
        project_tasks = {}
        for task in tasks:
            project_id = task.get("project_id")
            if project_id not in project_tasks:
                project_tasks[project_id] = []
            project_tasks[project_id].append(task)
        
        project_health_data = []
        status_distribution = {"planning": 0, "active": 0, "on_hold": 0, "completed": 0, "cancelled": 0, "archived": 0}
        priority_distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        
        for project in projects:
            project_id = project["id"]
            project_task_list = project_tasks.get(project_id, [])
            
            # Calculate project metrics
            total_tasks = len(project_task_list)
            completed_tasks = len([t for t in project_task_list if t.get("status") == "completed"])
            overdue_tasks = 0
            
            for task in project_task_list:
                if task.get("due_date") and task.get("status") not in ["completed", "cancelled"]:
                    try:
                        due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00"))
                        if due_date < datetime.utcnow():
                            overdue_tasks += 1
                    except:
                        continue
            
            completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            
            # Determine health status
            health_status = "excellent"
            if overdue_tasks > 0:
                health_status = "at_risk"
            elif completion_rate < 50:
                health_status = "needs_attention"
            elif completion_rate < 80:
                health_status = "good"
            
            project_health_data.append({
                "id": project_id,
                "name": project["name"],
                "status": project.get("status", "planning"),
                "priority": project.get("priority", "medium"),
                "completion_rate": round(completion_rate, 1),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "overdue_tasks": overdue_tasks,
                "health_status": health_status,
                "budget_spent": project.get("budget", {}).get("spent_amount", 0),
                "budget_total": project.get("budget", {}).get("total_budget", 0),
                "team_size": len(project.get("team_members", [])),
                "created_at": project.get("created_at")
            })
            
            # Update distributions
            status = project.get("status", "planning")
            if status in status_distribution:
                status_distribution[status] += 1
            
            priority = project.get("priority", "medium")
            if priority in priority_distribution:
                priority_distribution[priority] += 1
        
        return {
            "projects": project_health_data,
            "summary": {
                "total_projects": len(projects),
                "healthy_projects": len([p for p in project_health_data if p["health_status"] == "excellent"]),
                "at_risk_projects": len([p for p in project_health_data if p["health_status"] == "at_risk"]),
                "average_completion": round(sum([p["completion_rate"] for p in project_health_data]) / len(project_health_data), 1) if project_health_data else 0
            },
            "distributions": {
                "status": status_distribution,
                "priority": priority_distribution
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project health metrics: {str(e)}"
        )

@router.get("/teams/performance", response_model=Dict[str, Any])
async def get_team_performance_metrics(
    current_user: User = Depends(get_current_active_user)
):
    """Get team performance analytics"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        teams = await db.teams.find({"organization_id": org_id}).to_list(length=None)
        users = await db.users.find({"organization_id": org_id}).to_list(length=None)
        projects = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks = await db.tasks.find({}).to_list(length=None)
        
        # Filter tasks for organization projects
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        team_performance = []
        
        for team in teams:
            team_id = team["id"]
            team_members = [u for u in users if team_id in u.get("team_memberships", [])]
            member_ids = [m["id"] for m in team_members]
            
            # Get tasks assigned to team members
            team_tasks = [t for t in org_tasks if t.get("assignee_id") in member_ids]
            
            # Calculate metrics
            total_tasks = len(team_tasks)
            completed_tasks = len([t for t in team_tasks if t.get("status") == "completed"])
            completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            
            # Calculate average task time (placeholder)
            avg_task_time = 3.5  # days
            
            # Skill distribution
            all_skills = []
            for member in team_members:
                member_skills = member.get("skills", [])
                if isinstance(member_skills, list):
                    all_skills.extend(member_skills)
            
            skill_counts = {}
            for skill in all_skills:
                skill_name = skill.get("name", skill) if isinstance(skill, dict) else skill
                skill_counts[skill_name] = skill_counts.get(skill_name, 0) + 1
            
            team_performance.append({
                "id": team_id,
                "name": team["name"],
                "type": team.get("type", "development"),
                "member_count": len(team_members),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "completion_rate": round(completion_rate, 1),
                "avg_task_completion_time": avg_task_time,
                "skills": skill_counts,
                "productivity_score": min(100, completion_rate + (10 if total_tasks > 0 else 0))
            })
        
        return {
            "teams": team_performance,
            "summary": {
                "total_teams": len(teams),
                "total_members": len(users),
                "average_team_size": round(len(users) / len(teams), 1) if teams else 0,
                "most_productive_team": max(team_performance, key=lambda x: x["productivity_score"])["name"] if team_performance else None
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team performance metrics: {str(e)}"
        )

@router.get("/budget/tracking", response_model=Dict[str, Any])
async def get_budget_analytics(
    current_user: User = Depends(get_current_active_user)
):
    """Get budget tracking and financial analytics"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        projects = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        
        budget_data = []
        total_allocated = 0
        total_spent = 0
        
        for project in projects:
            budget = project.get("budget", {})
            allocated = budget.get("total_budget", 0) or 0
            spent = budget.get("spent_amount", 0) or 0
            currency = budget.get("currency", "USD")
            
            total_allocated += allocated
            total_spent += spent
            
            utilization_rate = (spent / allocated * 100) if allocated > 0 else 0
            remaining = allocated - spent
            
            # Determine budget status
            status = "on_track"
            if utilization_rate > 90:
                status = "over_budget"
            elif utilization_rate > 75:
                status = "at_risk"
            
            budget_data.append({
                "project_id": project["id"],
                "project_name": project["name"],
                "allocated_budget": allocated,
                "spent_amount": spent,
                "remaining_budget": remaining,
                "utilization_rate": round(utilization_rate, 1),
                "currency": currency,
                "status": status,
                "completion_rate": project.get("progress_percentage", 0)
            })
        
        return {
            "projects": budget_data,
            "summary": {
                "total_allocated": total_allocated,
                "total_spent": total_spent,
                "total_remaining": total_allocated - total_spent,
                "overall_utilization": round((total_spent / total_allocated * 100), 1) if total_allocated > 0 else 0,
                "projects_over_budget": len([p for p in budget_data if p["status"] == "over_budget"]),
                "projects_at_risk": len([p for p in budget_data if p["status"] == "at_risk"])
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get budget analytics: {str(e)}"
        )

@router.get("/timeline/overview", response_model=Dict[str, Any])
async def get_timeline_analytics(
    current_user: User = Depends(get_current_active_user)
):
    """Get timeline and scheduling analytics"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        projects = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks = await db.tasks.find({}).to_list(length=None)
        
        # Filter tasks for organization projects
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Timeline data for upcoming deadlines
        upcoming_deadlines = []
        overdue_items = []
        
        # Process projects
        for project in projects:
            if project.get("due_date"):
                try:
                    due_date = datetime.fromisoformat(project["due_date"].replace("Z", "+00:00"))
                    days_until_due = (due_date - datetime.utcnow()).days
                    
                    item = {
                        "id": project["id"],
                        "title": project["name"],
                        "type": "project",
                        "due_date": project["due_date"],
                        "days_until_due": days_until_due,
                        "status": project.get("status", "planning")
                    }
                    
                    if days_until_due < 0:
                        overdue_items.append(item)
                    elif days_until_due <= 30:
                        upcoming_deadlines.append(item)
                except:
                    continue
        
        # Process tasks
        for task in org_tasks:
            if task.get("due_date"):
                try:
                    due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00"))
                    days_until_due = (due_date - datetime.utcnow()).days
                    
                    item = {
                        "id": task["id"],
                        "title": task["title"],
                        "type": "task",
                        "due_date": task["due_date"],
                        "days_until_due": days_until_due,
                        "status": task.get("status", "todo"),
                        "project_id": task.get("project_id")
                    }
                    
                    if days_until_due < 0 and task.get("status") not in ["completed", "cancelled"]:
                        overdue_items.append(item)
                    elif days_until_due <= 14 and task.get("status") not in ["completed", "cancelled"]:
                        upcoming_deadlines.append(item)
                except:
                    continue
        
        # Sort by urgency
        upcoming_deadlines.sort(key=lambda x: x["days_until_due"])
        overdue_items.sort(key=lambda x: x["days_until_due"])
        
        return {
            "upcoming_deadlines": upcoming_deadlines[:10],  # Top 10 most urgent
            "overdue_items": overdue_items[:10],  # Top 10 most overdue
            "summary": {
                "total_upcoming": len(upcoming_deadlines),
                "total_overdue": len(overdue_items),
                "critical_items": len([i for i in upcoming_deadlines if i["days_until_due"] <= 3]),
                "this_week_due": len([i for i in upcoming_deadlines if i["days_until_due"] <= 7])
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get timeline analytics: {str(e)}"
        )

# Helper functions
def is_current_month(date_str):
    """Check if date is in current month"""
    if not date_str:
        return False
    try:
        if isinstance(date_str, str):
            date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            date = date_str
        now = datetime.utcnow()
        return date.year == now.year and date.month == now.month
    except:
        return False

def is_current_week(date_str):
    """Check if date is in current week"""
    if not date_str:
        return False
    try:
        if isinstance(date_str, str):
            date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            date = date_str
        now = datetime.utcnow()
        start_of_week = now - timedelta(days=now.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        return start_of_week <= date <= end_of_week
    except:
        return False