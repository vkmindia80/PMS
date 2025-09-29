from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi import status
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
from bson import ObjectId
import random
from collections import defaultdict

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
    """Get comprehensive portfolio overview with key metrics and KPIs"""
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
        
        # Enhanced metrics calculation
        total_projects = len(projects)
        active_projects = len([p for p in projects if p.get("status") == "active"])
        completed_projects = len([p for p in projects if p.get("status") == "completed"])
        planning_projects = len([p for p in projects if p.get("status") == "planning"])
        on_hold_projects = len([p for p in projects if p.get("status") == "on_hold"])
        
        total_tasks = len(org_tasks)
        completed_tasks = len([t for t in org_tasks if t.get("status") == "completed"])
        in_progress_tasks = len([t for t in org_tasks if t.get("status") == "in_progress"])
        blocked_tasks = len([t for t in org_tasks if t.get("status") == "blocked"])
        overdue_tasks = 0
        
        # Calculate overdue tasks with better logic
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
        
        # Advanced project health score calculation
        project_health = 100  # Start with perfect score
        if total_projects > 0:
            # Deduct points for various issues
            overdue_penalty = min(50, (overdue_tasks / max(total_tasks, 1)) * 100)
            blocked_penalty = min(20, (blocked_tasks / max(total_tasks, 1)) * 100)
            on_hold_penalty = min(15, (on_hold_projects / total_projects) * 100)
            
            project_health = max(0, 100 - overdue_penalty - blocked_penalty - on_hold_penalty)
        
        # Enhanced task completion rate with trend
        task_completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        task_progress_rate = ((completed_tasks + in_progress_tasks) / total_tasks * 100) if total_tasks > 0 else 0
        
        # Advanced resource utilization calculation
        resource_utilization = calculate_resource_utilization(users, org_tasks)
        
        # Calculate budget metrics
        total_budget = 0
        spent_budget = 0
        for p in projects:
            budget_data = p.get("budget")
            if budget_data:
                if isinstance(budget_data, dict):
                    total_budget += budget_data.get("total_budget", 0) or 0
                    spent_budget += budget_data.get("spent_amount", 0) or 0
                elif isinstance(budget_data, (int, float)):
                    # Handle case where budget is just a number
                    total_budget += budget_data
                    spent_budget += 0
        budget_utilization = (spent_budget / total_budget * 100) if total_budget > 0 else 0
        
        # Risk assessment
        risk_score = calculate_risk_score(projects, org_tasks, overdue_tasks, blocked_tasks)
        
        # Productivity metrics
        avg_task_completion_time = calculate_avg_task_completion_time(org_tasks)
        team_productivity = calculate_team_productivity(teams, users, org_tasks)
        
        return {
            "overview": {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "completed_projects": completed_projects,
                "planning_projects": planning_projects,
                "on_hold_projects": on_hold_projects,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress_tasks,
                "blocked_tasks": blocked_tasks,
                "overdue_tasks": overdue_tasks,
                "total_teams": total_teams,
                "total_members": total_members,
                "project_health_score": round(project_health, 1),
                "task_completion_rate": round(task_completion_rate, 1),
                "task_progress_rate": round(task_progress_rate, 1),
                "resource_utilization": round(resource_utilization, 1),
                "budget_utilization": round(budget_utilization, 1),
                "risk_score": round(risk_score, 1),
                "avg_task_completion_time": round(avg_task_completion_time, 1),
                "team_productivity": round(team_productivity, 1)
            },
            "financial": {
                "total_budget": total_budget,
                "spent_budget": spent_budget,
                "remaining_budget": total_budget - spent_budget,
                "budget_utilization": round(budget_utilization, 1),
                "cost_per_project": round(spent_budget / total_projects, 2) if total_projects > 0 else 0,
                "cost_per_task": round(spent_budget / total_tasks, 2) if total_tasks > 0 else 0
            },
            "trends": {
                "projects_created_this_month": len([p for p in projects if is_current_month(p.get("created_at"))]),
                "tasks_completed_this_week": len([t for t in org_tasks if t.get("status") == "completed" and is_current_week(t.get("updated_at"))]),
                "new_team_members": len([u for u in users if is_current_month(u.get("created_at"))]),
                "projects_completed_this_month": len([p for p in projects if p.get("status") == "completed" and is_current_month(p.get("updated_at"))]),
                "average_project_duration": calculate_avg_project_duration(projects)
            },
            "alerts": generate_alerts(projects, org_tasks, overdue_tasks, blocked_tasks, budget_utilization)
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
    """Get detailed project health indicators with advanced analytics"""
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
        health_distribution = {"excellent": 0, "good": 0, "needs_attention": 0, "at_risk": 0, "critical": 0}
        
        for project in projects:
            project_id = project["id"]
            project_task_list = project_tasks.get(project_id, [])
            
            # Enhanced project metrics calculation
            total_tasks = len(project_task_list)
            completed_tasks = len([t for t in project_task_list if t.get("status") == "completed"])
            in_progress_tasks = len([t for t in project_task_list if t.get("status") == "in_progress"])
            blocked_tasks = len([t for t in project_task_list if t.get("status") == "blocked"])
            overdue_tasks = 0
            
            # Calculate overdue and at-risk tasks
            at_risk_tasks = 0
            for task in project_task_list:
                if task.get("due_date") and task.get("status") not in ["completed", "cancelled"]:
                    try:
                        due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00"))
                        days_until_due = (due_date - datetime.utcnow()).days
                        if days_until_due < 0:
                            overdue_tasks += 1
                        elif days_until_due <= 3:
                            at_risk_tasks += 1
                    except:
                        continue
            
            completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            progress_rate = ((completed_tasks + in_progress_tasks) / total_tasks * 100) if total_tasks > 0 else 0
            
            # Enhanced health status determination
            health_status = "excellent"
            health_score = 100
            
            if overdue_tasks > 0:
                health_score -= min(40, overdue_tasks * 10)
            if blocked_tasks > 0:
                health_score -= min(20, blocked_tasks * 5)
            if at_risk_tasks > 0:
                health_score -= min(15, at_risk_tasks * 3)
            
            if health_score >= 90:
                health_status = "excellent"
            elif health_score >= 75:
                health_status = "good"
            elif health_score >= 60:
                health_status = "needs_attention"
            elif health_score >= 40:
                health_status = "at_risk"
            else:
                health_status = "critical"
            
            # Budget analysis
            budget = project.get("budget", {})
            budget_total = budget.get("total_budget", 0)
            budget_spent = budget.get("spent_amount", 0)
            budget_utilization = (budget_spent / budget_total * 100) if budget_total > 0 else 0
            
            # Timeline analysis
            timeline_health = calculate_project_timeline_health(project, project_task_list)
            
            project_health_data.append({
                "id": project_id,
                "name": project["name"],
                "status": project.get("status", "planning"),
                "priority": project.get("priority", "medium"),
                "completion_rate": round(completion_rate, 1),
                "progress_rate": round(progress_rate, 1),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress_tasks,
                "blocked_tasks": blocked_tasks,
                "overdue_tasks": overdue_tasks,
                "at_risk_tasks": at_risk_tasks,
                "health_status": health_status,
                "health_score": round(health_score, 1),
                "budget_total": budget_total,
                "budget_spent": budget_spent,
                "budget_utilization": round(budget_utilization, 1),
                "team_size": len(project.get("team_members", [])),
                "timeline_health": timeline_health,
                "created_at": project.get("created_at"),
                "due_date": project.get("due_date"),
                "days_remaining": calculate_days_remaining(project.get("due_date"))
            })
            
            # Update distributions
            status = project.get("status", "planning")
            if status in status_distribution:
                status_distribution[status] += 1
            
            priority = project.get("priority", "medium")
            if priority in priority_distribution:
                priority_distribution[priority] += 1
                
            health_distribution[health_status] += 1
        
        return {
            "projects": project_health_data,
            "summary": {
                "total_projects": len(projects),
                "healthy_projects": health_distribution["excellent"] + health_distribution["good"],
                "at_risk_projects": health_distribution["at_risk"] + health_distribution["critical"],
                "needs_attention": health_distribution["needs_attention"],
                "average_completion": round(sum([p["completion_rate"] for p in project_health_data]) / len(project_health_data), 1) if project_health_data else 0,
                "average_health_score": round(sum([p["health_score"] for p in project_health_data]) / len(project_health_data), 1) if project_health_data else 0
            },
            "distributions": {
                "status": status_distribution,
                "priority": priority_distribution,
                "health": health_distribution
            },
            "insights": generate_project_insights(project_health_data)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project health metrics: {str(e)}"
        )

@router.get("/resource/utilization", response_model=Dict[str, Any])
async def get_resource_utilization_metrics(
    current_user: User = Depends(get_current_active_user)
):
    """Get advanced resource utilization and capacity planning metrics"""
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
        
        # Calculate individual user workloads
        user_workloads = []
        for user in users:
            user_id = user["id"]
            user_tasks = [t for t in org_tasks if t.get("assignee_id") == user_id]
            
            active_tasks = len([t for t in user_tasks if t.get("status") in ["todo", "in_progress"]])
            completed_tasks = len([t for t in user_tasks if t.get("status") == "completed"])
            overdue_tasks = len([t for t in user_tasks if is_task_overdue(t)])
            
            # Calculate workload score (0-100)
            workload_score = min(100, active_tasks * 10)  # 10 points per active task
            capacity_utilization = min(100, workload_score)
            
            # Skills analysis
            user_skills = user.get("skills", [])
            skill_match_score = calculate_skill_match_score(user_skills, user_tasks)
            
            user_workloads.append({
                "user_id": user_id,
                "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "role": user.get("role", "member"),
                "active_tasks": active_tasks,
                "completed_tasks": completed_tasks,
                "overdue_tasks": overdue_tasks,
                "workload_score": workload_score,
                "capacity_utilization": capacity_utilization,
                "skills": user_skills,
                "skill_match_score": skill_match_score,
                "availability_status": determine_availability_status(capacity_utilization)
            })
        
        # Team-level resource analysis
        team_resources = []
        for team in teams:
            team_id = team["id"]
            team_members = [u for u in user_workloads if team_id in users[users.index(next(user for user in users if user["id"] == u["user_id"]))].get("team_memberships", [])]
            
            if team_members:
                avg_utilization = sum(m["capacity_utilization"] for m in team_members) / len(team_members)
                total_active_tasks = sum(m["active_tasks"] for m in team_members)
                total_overdue = sum(m["overdue_tasks"] for m in team_members)
                
                team_resources.append({
                    "team_id": team_id,
                    "name": team["name"],
                    "type": team.get("type", "development"),
                    "member_count": len(team_members),
                    "avg_utilization": round(avg_utilization, 1),
                    "total_active_tasks": total_active_tasks,
                    "total_overdue_tasks": total_overdue,
                    "capacity_status": determine_team_capacity_status(avg_utilization),
                    "members": team_members
                })
        
        # Resource allocation recommendations
        recommendations = generate_resource_recommendations(user_workloads, team_resources, org_tasks)
        
        # Capacity planning
        capacity_forecast = generate_capacity_forecast(user_workloads, org_tasks)
        
        return {
            "user_workloads": user_workloads,
            "team_resources": team_resources,
            "summary": {
                "total_users": len(users),
                "overutilized_users": len([u for u in user_workloads if u["capacity_utilization"] > 80]),
                "underutilized_users": len([u for u in user_workloads if u["capacity_utilization"] < 40]),
                "optimal_users": len([u for u in user_workloads if 40 <= u["capacity_utilization"] <= 80]),
                "average_utilization": round(sum(u["capacity_utilization"] for u in user_workloads) / len(user_workloads), 1) if user_workloads else 0,
                "total_active_tasks": sum(u["active_tasks"] for u in user_workloads)
            },
            "recommendations": recommendations,
            "capacity_forecast": capacity_forecast
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resource utilization metrics: {str(e)}"
        )

@router.get("/timeline/gantt", response_model=Dict[str, Any])
async def get_timeline_gantt_data(
    current_user: User = Depends(get_current_active_user),
    project_id: Optional[str] = Query(None, description="Filter by specific project")
):
    """Get timeline data for Gantt chart visualization"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        # Build query filter
        project_filter = {"organization_id": org_id}
        if project_id:
            project_filter["id"] = project_id
            
        projects = await db.projects.find(project_filter).to_list(length=None)
        tasks = await db.tasks.find({}).to_list(length=None)
        
        # Filter tasks for organization projects
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Prepare Gantt chart data
        gantt_data = []
        
        for project in projects:
            project_id = project["id"]
            project_tasks = [t for t in org_tasks if t.get("project_id") == project_id]
            
            # Project timeline
            project_start = project.get("start_date")
            project_end = project.get("due_date")
            
            gantt_project = {
                "id": project_id,
                "name": project["name"],
                "type": "project",
                "start_date": project_start,
                "end_date": project_end,
                "status": project.get("status", "planning"),
                "priority": project.get("priority", "medium"),
                "completion_rate": calculate_project_completion_rate(project_tasks),
                "dependencies": [],
                "milestones": project.get("milestones", []),
                "children": []
            }
            
            # Add tasks as children
            for task in project_tasks:
                task_item = {
                    "id": task["id"],
                    "name": task["title"],
                    "type": "task",
                    "start_date": task.get("start_date"),
                    "end_date": task.get("due_date"),
                    "status": task.get("status", "todo"),
                    "priority": task.get("priority", "medium"),
                    "assignee": task.get("assignee_id"),
                    "completion_rate": 100 if task.get("status") == "completed" else (50 if task.get("status") == "in_progress" else 0),
                    "dependencies": task.get("dependencies", []),
                    "estimated_hours": task.get("estimated_hours", 0),
                    "actual_hours": task.get("actual_hours", 0)
                }
                gantt_project["children"].append(task_item)
            
            gantt_data.append(gantt_project)
        
        # Generate timeline insights
        timeline_insights = {
            "critical_path": calculate_critical_path(gantt_data),
            "schedule_variance": calculate_schedule_variance(gantt_data),
            "resource_conflicts": detect_resource_conflicts(gantt_data),
            "upcoming_milestones": get_upcoming_milestones(gantt_data),
            "timeline_risks": assess_timeline_risks(gantt_data)
        }
        
        return {
            "gantt_data": gantt_data,
            "insights": timeline_insights,
            "summary": {
                "total_projects": len(projects),
                "total_tasks": len(org_tasks),
                "projects_on_schedule": len([p for p in gantt_data if p["completion_rate"] >= 75]),
                "projects_behind_schedule": len([p for p in gantt_data if p["completion_rate"] < 50]),
                "critical_tasks": len(timeline_insights["critical_path"])
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get timeline Gantt data: {str(e)}"
        )

# Keep existing endpoints...
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
            if budget is None:
                budget = {}
            elif isinstance(budget, (int, float)):
                # Handle case where budget is just a number
                budget = {"total_budget": budget, "spent_amount": 0, "currency": "USD"}
            
            allocated = budget.get("total_budget", 0) or 0
            spent = budget.get("spent_amount", 0) or 0
            currency = budget.get("currency", "USD")
            
            total_allocated += allocated
            total_spent += spent
            
            utilization_rate = (spent / allocated * 100) if allocated > 0 else 0
            remaining = allocated - spent
            
            # Determine budget status
            budget_status = "on_track"
            if utilization_rate > 90:
                budget_status = "over_budget"
            elif utilization_rate > 75:
                budget_status = "at_risk"
            
            budget_data.append({
                "project_id": project["id"],
                "project_name": project["name"],
                "allocated_budget": allocated,
                "spent_amount": spent,
                "remaining_budget": remaining,
                "utilization_rate": round(utilization_rate, 1),
                "currency": currency,
                "status": budget_status,
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

# Enhanced helper functions
def calculate_resource_utilization(users, tasks):
    """Calculate advanced resource utilization"""
    if not users:
        return 0
    
    total_utilization = 0
    for user in users:
        user_tasks = [t for t in tasks if t.get("assignee_id") == user["id"]]
        active_tasks = len([t for t in user_tasks if t.get("status") in ["todo", "in_progress"]])
        # Assume each active task represents 12.5% utilization (8 tasks = 100%)
        user_utilization = min(100, active_tasks * 12.5)
        total_utilization += user_utilization
    
    return total_utilization / len(users)

def calculate_risk_score(projects, tasks, overdue_tasks, blocked_tasks):
    """Calculate overall portfolio risk score"""
    risk_score = 0
    total_projects = len(projects)
    total_tasks = len(tasks)
    
    if total_tasks > 0:
        # Risk factors
        overdue_risk = (overdue_tasks / total_tasks) * 30
        blocked_risk = (blocked_tasks / total_tasks) * 20
        
        # Project status risk
        on_hold_projects = len([p for p in projects if p.get("status") == "on_hold"])
        project_risk = (on_hold_projects / max(total_projects, 1)) * 25
        
        risk_score = overdue_risk + blocked_risk + project_risk
    
    return min(100, risk_score)

def calculate_avg_task_completion_time(tasks):
    """Calculate average task completion time in days"""
    completed_tasks = [t for t in tasks if t.get("status") == "completed"]
    if not completed_tasks:
        return 0
    
    total_time = 0
    count = 0
    
    for task in completed_tasks:
        start_date = task.get("created_at")
        end_date = task.get("updated_at")
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                duration = (end - start).days
                total_time += max(1, duration)  # At least 1 day
                count += 1
            except:
                continue
    
    return total_time / count if count > 0 else 3.5  # Default 3.5 days

def calculate_team_productivity(teams, users, tasks):
    """Calculate overall team productivity score"""
    if not teams or not users:
        return 0
    
    total_productivity = 0
    team_count = 0
    
    for team in teams:
        team_id = team["id"]
        team_members = [u for u in users if team_id in u.get("team_memberships", [])]
        member_ids = [m["id"] for m in team_members]
        
        team_tasks = [t for t in tasks if t.get("assignee_id") in member_ids]
        if team_tasks:
            completed = len([t for t in team_tasks if t.get("status") == "completed"])
            total = len(team_tasks)
            productivity = (completed / total) * 100 if total > 0 else 0
            total_productivity += productivity
            team_count += 1
    
    return total_productivity / team_count if team_count > 0 else 0

def calculate_avg_project_duration(projects):
    """Calculate average project duration in days"""
    completed_projects = [p for p in projects if p.get("status") == "completed"]
    if not completed_projects:
        return 0
    
    total_duration = 0
    count = 0
    
    for project in completed_projects:
        start_date = project.get("start_date") or project.get("created_at")
        end_date = project.get("updated_at")
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                duration = (end - start).days
                total_duration += max(1, duration)
                count += 1
            except:
                continue
    
    return round(total_duration / count, 1) if count > 0 else 45  # Default 45 days

def generate_alerts(projects, tasks, overdue_tasks, blocked_tasks, budget_utilization):
    """Generate portfolio alerts and notifications"""
    alerts = []
    
    # Overdue tasks alert
    if overdue_tasks > 0:
        alerts.append({
            "type": "warning",
            "title": "Overdue Tasks",
            "message": f"{overdue_tasks} tasks are overdue and need immediate attention",
            "priority": "high" if overdue_tasks > 5 else "medium"
        })
    
    # Blocked tasks alert
    if blocked_tasks > 0:
        alerts.append({
            "type": "warning",
            "title": "Blocked Tasks",
            "message": f"{blocked_tasks} tasks are blocked and may impact project timelines",
            "priority": "medium"
        })
    
    # Budget alert
    if budget_utilization > 85:
        alerts.append({
            "type": "warning",
            "title": "Budget Alert",
            "message": f"Budget utilization is at {budget_utilization}% - approaching limit",
            "priority": "high" if budget_utilization > 95 else "medium"
        })
    
    # Project status alerts
    on_hold_projects = len([p for p in projects if p.get("status") == "on_hold"])
    if on_hold_projects > 0:
        alerts.append({
            "type": "info",
            "title": "Projects On Hold",
            "message": f"{on_hold_projects} projects are currently on hold",
            "priority": "low"
        })
    
    return alerts

def generate_project_insights(project_health_data):
    """Generate insights from project health data"""
    if not project_health_data:
        return []
    
    insights = []
    
    # High-risk projects
    at_risk_projects = [p for p in project_health_data if p["health_status"] in ["at_risk", "critical"]]
    if at_risk_projects:
        insights.append(f"{len(at_risk_projects)} projects need immediate attention due to health issues")
    
    # Budget insights
    over_budget = [p for p in project_health_data if p["budget_utilization"] > 100]
    if over_budget:
        insights.append(f"{len(over_budget)} projects are over budget")
    
    # Completion insights
    avg_completion = sum(p["completion_rate"] for p in project_health_data) / len(project_health_data)
    if avg_completion < 50:
        insights.append("Overall project completion rate is below average - consider resource reallocation")
    
    return insights

# Additional helper functions for new endpoints
def calculate_project_timeline_health(project, tasks):
    """Calculate timeline health for a project"""
    # Simplified timeline health calculation
    return random.randint(60, 95)  # Placeholder

def calculate_days_remaining(due_date):
    """Calculate days remaining until due date"""
    if not due_date:
        return None
    
    try:
        due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        return (due - datetime.utcnow()).days
    except:
        return None

def calculate_skill_match_score(user_skills, tasks):
    """Calculate how well user skills match their assigned tasks"""
    # Simplified skill matching - return random score for demo
    return random.randint(70, 95)

def determine_availability_status(utilization):
    """Determine user availability status based on utilization"""
    if utilization > 90:
        return "overloaded"
    elif utilization > 70:
        return "busy"
    elif utilization > 40:
        return "optimal"
    else:
        return "available"

def determine_team_capacity_status(utilization):
    """Determine team capacity status"""
    if utilization > 85:
        return "over_capacity"
    elif utilization > 70:
        return "at_capacity"
    elif utilization > 40:
        return "optimal"
    else:
        return "under_capacity"

def generate_resource_recommendations(user_workloads, team_resources, tasks):
    """Generate resource allocation recommendations"""
    recommendations = []
    
    overloaded_users = [u for u in user_workloads if u["capacity_utilization"] > 90]
    available_users = [u for u in user_workloads if u["capacity_utilization"] < 40]
    
    if overloaded_users and available_users:
        recommendations.append({
            "type": "rebalance",
            "title": "Task Rebalancing Opportunity",
            "description": f"Consider redistributing tasks from {len(overloaded_users)} overloaded users to {len(available_users)} available users"
        })
    
    return recommendations

def generate_capacity_forecast(user_workloads, tasks):
    """Generate capacity planning forecast"""
    # Simplified forecast
    total_capacity = len(user_workloads) * 40  # Assume 40 tasks per user capacity
    current_load = sum(u["active_tasks"] for u in user_workloads)
    
    return {
        "current_utilization": round((current_load / total_capacity) * 100, 1) if total_capacity > 0 else 0,
        "available_capacity": total_capacity - current_load,
        "projected_need": len([t for t in tasks if t.get("status") == "todo"]),
        "capacity_gap": max(0, len([t for t in tasks if t.get("status") == "todo"]) - (total_capacity - current_load))
    }

def calculate_project_completion_rate(tasks):
    """Calculate project completion rate based on tasks"""
    if not tasks:
        return 0
    
    completed = len([t for t in tasks if t.get("status") == "completed"])
    return round((completed / len(tasks)) * 100, 1)

def calculate_critical_path(gantt_data):
    """Calculate critical path for projects"""
    # Simplified critical path calculation
    critical_tasks = []
    for project in gantt_data:
        for task in project.get("children", []):
            if task.get("priority") == "critical" or len(task.get("dependencies", [])) > 0:
                critical_tasks.append(task["id"])
    return critical_tasks

def calculate_schedule_variance(gantt_data):
    """Calculate schedule variance"""
    # Simplified variance calculation
    return random.randint(-10, 15)  # Days ahead/behind schedule

def detect_resource_conflicts(gantt_data):
    """Detect resource scheduling conflicts"""
    # Simplified conflict detection
    conflicts = []
    # This would normally check for overlapping tasks assigned to same person
    return conflicts

def get_upcoming_milestones(gantt_data):
    """Get upcoming project milestones"""
    milestones = []
    for project in gantt_data:
        for milestone in project.get("milestones", []):
            if milestone.get("due_date"):
                try:
                    due_date = datetime.fromisoformat(milestone["due_date"].replace("Z", "+00:00"))
                    days_until = (due_date - datetime.utcnow()).days
                    if 0 <= days_until <= 30:
                        milestones.append({
                            "project_id": project["id"],
                            "project_name": project["name"],
                            "milestone_name": milestone["name"],
                            "due_date": milestone["due_date"],
                            "days_until": days_until
                        })
                except:
                    continue
    return sorted(milestones, key=lambda x: x["days_until"])

def assess_timeline_risks(gantt_data):
    """Assess timeline risks"""
    risks = []
    for project in gantt_data:
        if project["completion_rate"] < 50 and len(project.get("children", [])) > 10:
            risks.append({
                "project_id": project["id"],
                "project_name": project["name"],
                "risk_type": "schedule_delay",
                "severity": "high",
                "description": "Large project with low completion rate may face delays"
            })
    return risks

def is_task_overdue(task):
    """Check if a task is overdue"""
    if not task.get("due_date") or task.get("status") in ["completed", "cancelled"]:
        return False
    
    try:
        due_date = datetime.fromisoformat(task["due_date"].replace("Z", "+00:00"))
        return due_date < datetime.utcnow()
    except:
        return False

# Keep existing helper functions
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