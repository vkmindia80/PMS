from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from collections import defaultdict

from database import get_database
from auth.utils import verify_token
from auth.middleware import get_current_user, get_current_active_user
from models import User

router = APIRouter(prefix="/api/enhanced-timeline", tags=["Enhanced Timeline Management"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.get("/project/{project_id}/comprehensive")
async def get_comprehensive_timeline_data(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get comprehensive timeline data with full resource and dependency integration"""
    try:
        # Get project details
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get timeline tasks
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        # Get regular tasks for additional context
        regular_tasks_cursor = db.tasks.find({"project_id": project_id})
        regular_tasks = await regular_tasks_cursor.to_list(length=None)
        
        # Get dependencies
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        # Get team data
        teams_cursor = db.teams.find({"organization_id": project.get("organization_id", "demo-org-001")})
        teams = await teams_cursor.to_list(length=None)
        
        # Get users (team members)
        users_cursor = db.users.find({"organization_id": project.get("organization_id", "demo-org-001")})
        users = await users_cursor.to_list(length=None)
        
        # Get files attached to tasks
        files_cursor = db.files.find({"project_id": project_id})
        files = await files_cursor.to_list(length=None)
        
        # Get comments on tasks
        comments_cursor = db.comments.find({"project_id": project_id})
        comments = await comments_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for collection in [tasks, regular_tasks, dependencies, teams, users, files, comments]:
            for item in collection:
                if "_id" in item:
                    item.pop("_id")
        
        # Create resource allocation map
        resource_allocation = calculate_resource_allocation(tasks, users, regular_tasks)
        
        # Calculate critical path
        critical_path = calculate_critical_path(tasks, dependencies)
        
        # Create timeline statistics
        timeline_stats = calculate_enhanced_timeline_stats(tasks, dependencies, users, project)
        
        # Create resource workload analysis
        resource_workload = calculate_resource_workload(tasks, users, regular_tasks)
        
        # Task risk analysis
        task_risks = analyze_task_risks(tasks, dependencies, resource_workload)
        
        # Milestone tracking
        milestones = extract_milestones(tasks, regular_tasks)
        
        return {
            "project": project,
            "tasks": tasks,
            "regular_tasks": regular_tasks,
            "dependencies": dependencies,
            "teams": teams,
            "users": users,
            "files": files,
            "comments": comments,
            "resource_allocation": resource_allocation,
            "critical_path": critical_path,
            "timeline_stats": timeline_stats,
            "resource_workload": resource_workload,
            "task_risks": task_risks,
            "milestones": milestones,
            "project_health": {
                "overall_score": timeline_stats.get("project_health_score", 0),
                "risk_level": "low" if timeline_stats.get("project_health_score", 0) > 80 else "medium" if timeline_stats.get("project_health_score", 0) > 60 else "high",
                "completion_rate": timeline_stats.get("completion_rate", 0),
                "resource_utilization": resource_workload.get("average_utilization", 0)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving comprehensive timeline data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def calculate_resource_allocation(tasks: List[Dict], users: List[Dict], regular_tasks: List[Dict]) -> Dict[str, Any]:
    """Calculate detailed resource allocation across tasks"""
    
    # Create user lookup
    user_lookup = {user["id"]: user for user in users}
    
    # Calculate allocation per user
    user_allocations = defaultdict(lambda: {
        "total_hours": 0,
        "completed_hours": 0,
        "remaining_hours": 0,
        "tasks_assigned": 0,
        "skills_utilized": set(),
        "workload_percentage": 0
    })
    
    total_project_hours = 0
    
    for task in tasks:
        task_hours = task.get("duration", 0)
        completion_percent = task.get("percent_complete", 0)
        completed_hours = (task_hours * completion_percent) / 100
        remaining_hours = task_hours - completed_hours
        
        total_project_hours += task_hours
        
        # Distribute hours among assignees
        assignees = task.get("assignee_ids", [])
        if assignees:
            hours_per_assignee = task_hours / len(assignees)
            completed_per_assignee = completed_hours / len(assignees)
            remaining_per_assignee = remaining_hours / len(assignees)
            
            for assignee_id in assignees:
                if assignee_id in user_lookup:
                    user_allocations[assignee_id]["total_hours"] += hours_per_assignee
                    user_allocations[assignee_id]["completed_hours"] += completed_per_assignee
                    user_allocations[assignee_id]["remaining_hours"] += remaining_per_assignee
                    user_allocations[assignee_id]["tasks_assigned"] += 1
                    
                    # Add skills from user profile
                    user_skills = user_lookup[assignee_id].get("skills", [])
                    user_allocations[assignee_id]["skills_utilized"].update(user_skills)
    
    # Calculate workload percentages (assuming 40 hours per week capacity)
    standard_capacity = 40  # hours per week
    
    for user_id, allocation in user_allocations.items():
        # Convert to percentage of standard capacity
        allocation["workload_percentage"] = min(100, (allocation["total_hours"] / standard_capacity) * 100)
        allocation["skills_utilized"] = list(allocation["skills_utilized"])
        allocation["user_info"] = user_lookup.get(user_id, {})
    
    return {
        "user_allocations": dict(user_allocations),
        "total_project_hours": total_project_hours,
        "average_task_duration": total_project_hours / len(tasks) if tasks else 0,
        "resource_utilization_summary": {
            "overallocated_users": [uid for uid, alloc in user_allocations.items() if alloc["workload_percentage"] > 100],
            "underutilized_users": [uid for uid, alloc in user_allocations.items() if alloc["workload_percentage"] < 50],
            "balanced_users": [uid for uid, alloc in user_allocations.items() if 50 <= alloc["workload_percentage"] <= 100]
        }
    }


def calculate_critical_path(tasks: List[Dict], dependencies: List[Dict]) -> List[str]:
    """Calculate critical path using forward and backward pass algorithm"""
    
    # Create task lookup
    task_lookup = {task["id"]: task for task in tasks}
    
    # Build dependency graph
    predecessors = defaultdict(list)  # task_id -> [predecessor_ids]
    successors = defaultdict(list)   # task_id -> [successor_ids]
    
    for dep in dependencies:
        pred_id = dep["predecessor_id"]
        succ_id = dep["successor_id"]
        predecessors[succ_id].append(pred_id)
        successors[pred_id].append(succ_id)
    
    # Forward pass - calculate earliest start/finish
    earliest_start = {}
    earliest_finish = {}
    
    # Topological sort to process tasks in correct order
    processed = set()
    to_process = [task["id"] for task in tasks if not predecessors[task["id"]]]
    
    while to_process:
        task_id = to_process.pop(0)
        if task_id in processed:
            continue
        
        # Check if all predecessors are processed
        if all(pred_id in processed for pred_id in predecessors[task_id]):
            task = task_lookup[task_id]
            duration = task.get("duration", 0)
            
            if not predecessors[task_id]:
                # No predecessors - start at project start
                earliest_start[task_id] = 0
            else:
                # Start after latest predecessor finishes
                earliest_start[task_id] = max(earliest_finish[pred_id] for pred_id in predecessors[task_id])
            
            earliest_finish[task_id] = earliest_start[task_id] + duration
            processed.add(task_id)
            
            # Add successors to process queue
            to_process.extend(successors[task_id])
    
    # Backward pass - calculate latest start/finish
    project_duration = max(earliest_finish.values()) if earliest_finish else 0
    latest_finish = {}
    latest_start = {}
    
    # Start from tasks with no successors
    processed = set()
    to_process = [task["id"] for task in tasks if not successors[task["id"]]]
    
    for task_id in to_process:
        latest_finish[task_id] = project_duration
    
    while to_process:
        task_id = to_process.pop(0)
        if task_id in processed:
            continue
        
        # Check if all successors are processed
        if all(succ_id in processed for succ_id in successors[task_id]):
            task = task_lookup[task_id]
            duration = task.get("duration", 0)
            
            if not successors[task_id]:
                # No successors - finish at project end
                if task_id not in latest_finish:
                    latest_finish[task_id] = project_duration
            else:
                # Finish before earliest successor starts
                latest_finish[task_id] = min(latest_start[succ_id] for succ_id in successors[task_id])
            
            latest_start[task_id] = latest_finish[task_id] - duration
            processed.add(task_id)
            
            # Add predecessors to process queue
            to_process.extend(predecessors[task_id])
    
    # Calculate float and identify critical path
    critical_tasks = []
    for task_id in task_lookup:
        total_float = latest_start.get(task_id, 0) - earliest_start.get(task_id, 0)
        if total_float == 0:  # Zero float = critical
            critical_tasks.append(task_id)
    
    return critical_tasks


def calculate_enhanced_timeline_stats(tasks: List[Dict], dependencies: List[Dict], users: List[Dict], project: Dict) -> Dict[str, Any]:
    """Calculate comprehensive timeline statistics"""
    
    if not tasks:
        return {
            "total_tasks": 0,
            "completed_tasks": 0,
            "in_progress_tasks": 0,
            "project_health_score": 0,
            "completion_rate": 0
        }
    
    # Basic task statistics
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.get("percent_complete", 0) == 100])
    in_progress_tasks = len([t for t in tasks if 0 < t.get("percent_complete", 0) < 100])
    not_started_tasks = total_tasks - completed_tasks - in_progress_tasks
    
    # Time statistics
    total_hours = sum(t.get("duration", 0) for t in tasks)
    completed_hours = sum(
        (t.get("duration", 0) * t.get("percent_complete", 0) / 100) for t in tasks
    )
    completion_rate = (completed_hours / total_hours) if total_hours > 0 else 0
    
    # Schedule analysis
    overdue_tasks = 0
    at_risk_tasks = 0
    current_date = datetime.utcnow()
    
    for task in tasks:
        finish_date = task.get("finish_date")
        if finish_date and isinstance(finish_date, str):
            finish_date = datetime.fromisoformat(finish_date.replace('Z', '+00:00'))
        
        if finish_date:
            if finish_date < current_date and task.get("percent_complete", 0) < 100:
                overdue_tasks += 1
            elif finish_date < current_date + timedelta(days=7) and task.get("percent_complete", 0) < 80:
                at_risk_tasks += 1
    
    # Resource statistics
    total_assignees = set()
    for task in tasks:
        total_assignees.update(task.get("assignee_ids", []))
    
    # Project health score calculation
    schedule_health = max(0, 100 - (overdue_tasks / total_tasks * 50)) if total_tasks > 0 else 100
    progress_health = completion_rate * 100
    resource_health = 100 - (at_risk_tasks / total_tasks * 30) if total_tasks > 0 else 100
    
    project_health_score = (schedule_health + progress_health + resource_health) / 3
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "not_started_tasks": not_started_tasks,
        "total_hours": int(total_hours),
        "completed_hours": int(completed_hours),
        "remaining_hours": int(total_hours - completed_hours),
        "completion_rate": round(completion_rate, 3),
        "overdue_tasks": overdue_tasks,
        "at_risk_tasks": at_risk_tasks,
        "total_dependencies": len(dependencies),
        "unique_assignees": len(total_assignees),
        "project_health_score": round(project_health_score, 1),
        "schedule_health": round(schedule_health, 1),
        "progress_health": round(progress_health, 1),
        "resource_health": round(resource_health, 1)
    }


def calculate_resource_workload(tasks: List[Dict], users: List[Dict], regular_tasks: List[Dict]) -> Dict[str, Any]:
    """Calculate detailed resource workload analysis"""
    
    user_lookup = {user["id"]: user for user in users}
    workload_data = defaultdict(lambda: {
        "current_load": 0,
        "upcoming_load": 0,
        "skills": [],
        "efficiency_rating": 85,  # Default efficiency
        "availability": 100,
        "tasks": []
    })
    
    current_date = datetime.utcnow()
    
    for task in tasks:
        task_start = task.get("start_date")
        task_duration = task.get("duration", 0)
        task_progress = task.get("percent_complete", 0)
        remaining_work = task_duration * (1 - task_progress / 100)
        
        assignees = task.get("assignee_ids", [])
        if assignees and remaining_work > 0:
            work_per_assignee = remaining_work / len(assignees)
            
            for assignee_id in assignees:
                if assignee_id in user_lookup:
                    user_data = workload_data[assignee_id]
                    user_info = user_lookup[assignee_id]
                    
                    # Determine if task is current or upcoming
                    if task_start:
                        if isinstance(task_start, str):
                            task_start_date = datetime.fromisoformat(task_start.replace('Z', '+00:00'))
                        else:
                            task_start_date = task_start
                        
                        if task_start_date <= current_date + timedelta(days=7):
                            user_data["current_load"] += work_per_assignee
                        else:
                            user_data["upcoming_load"] += work_per_assignee
                    else:
                        user_data["current_load"] += work_per_assignee
                    
                    user_data["skills"] = user_info.get("skills", [])
                    user_data["tasks"].append({
                        "task_id": task["id"],
                        "task_name": task["name"],
                        "work_assigned": work_per_assignee,
                        "progress": task_progress
                    })
    
    # Calculate utilization percentages
    standard_capacity = 40  # hours per week
    
    for user_id, data in workload_data.items():
        data["utilization_percentage"] = min(200, (data["current_load"] / standard_capacity) * 100)
        data["upcoming_utilization"] = min(200, (data["upcoming_load"] / standard_capacity) * 100)
        data["user_info"] = user_lookup.get(user_id, {})
    
    # Calculate averages
    total_users = len(workload_data) if workload_data else 1
    average_utilization = sum(data["utilization_percentage"] for data in workload_data.values()) / total_users
    
    return {
        "user_workloads": dict(workload_data),
        "average_utilization": round(average_utilization, 1),
        "overloaded_users": [uid for uid, data in workload_data.items() if data["utilization_percentage"] > 120],
        "underutilized_users": [uid for uid, data in workload_data.items() if data["utilization_percentage"] < 60],
        "capacity_summary": {
            "total_current_work": sum(data["current_load"] for data in workload_data.values()),
            "total_upcoming_work": sum(data["upcoming_load"] for data in workload_data.values()),
            "available_capacity": total_users * standard_capacity,
            "utilization_rate": average_utilization
        }
    }


def analyze_task_risks(tasks: List[Dict], dependencies: List[Dict], resource_workload: Dict) -> List[Dict[str, Any]]:
    """Analyze potential risks for each task"""
    
    risks = []
    current_date = datetime.utcnow()
    overloaded_users = set(resource_workload.get("overloaded_users", []))
    
    for task in tasks:
        task_risks = []
        risk_score = 0
        
        # Schedule risk
        finish_date = task.get("finish_date")
        if finish_date and isinstance(finish_date, str):
            finish_date = datetime.fromisoformat(finish_date.replace('Z', '+00:00'))
        
        if finish_date and finish_date < current_date and task.get("percent_complete", 0) < 100:
            task_risks.append("Overdue task")
            risk_score += 40
        elif finish_date and finish_date < current_date + timedelta(days=3) and task.get("percent_complete", 0) < 80:
            task_risks.append("High schedule risk")
            risk_score += 25
        
        # Resource risk
        assignees = task.get("assignee_ids", [])
        overloaded_assignees = [aid for aid in assignees if aid in overloaded_users]
        if overloaded_assignees:
            task_risks.append(f"Overloaded resources: {len(overloaded_assignees)}")
            risk_score += 20
        
        # Dependency risk
        task_dependencies = [dep for dep in dependencies if dep["successor_id"] == task["id"]]
        if len(task_dependencies) > 3:
            task_risks.append("High dependency complexity")
            risk_score += 15
        
        # Progress risk
        if task.get("percent_complete", 0) == 0 and task.get("duration", 0) > 40:
            task_risks.append("Large task not started")
            risk_score += 10
        
        if task_risks:
            risks.append({
                "task_id": task["id"],
                "task_name": task["name"],
                "risks": task_risks,
                "risk_score": min(100, risk_score),
                "risk_level": "high" if risk_score > 60 else "medium" if risk_score > 30 else "low"
            })
    
    # Sort by risk score
    risks.sort(key=lambda x: x["risk_score"], reverse=True)
    
    return risks


def extract_milestones(tasks: List[Dict], regular_tasks: List[Dict]) -> List[Dict[str, Any]]:
    """Extract and enhance milestone information"""
    
    milestones = []
    
    # Extract from timeline tasks
    for task in tasks:
        if task.get("milestone", False):
            milestones.append({
                "id": task["id"],
                "name": task["name"],
                "date": task.get("finish_date"),
                "status": "completed" if task.get("percent_complete", 0) == 100 else "pending",
                "type": "timeline_milestone",
                "critical": task.get("critical", False)
            })
    
    # Extract major completion points from regular tasks
    for task in regular_tasks:
        if task.get("status") == "completed" and task.get("estimated_hours", 0) > 20:
            milestones.append({
                "id": task["id"],
                "name": f"Completed: {task['name']}",
                "date": task.get("updated_at"),
                "status": "completed",
                "type": "completion_milestone",
                "critical": False
            })
    
    # Sort by date
    milestones.sort(key=lambda x: x.get("date", datetime.min) if x.get("date") else datetime.min)
    
    return milestones


@router.get("/project/{project_id}/resource-analysis")
async def get_resource_analysis(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get detailed resource analysis for project timeline"""
    try:
        # Get project timeline data
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        # Get project info for organization
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get all users in organization
        users_cursor = db.users.find({"organization_id": project.get("organization_id", "demo-org-001")})
        users = await users_cursor.to_list(length=None)
        
        # Get regular tasks for context
        regular_tasks_cursor = db.tasks.find({"project_id": project_id})
        regular_tasks = await regular_tasks_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for collection in [tasks, users, regular_tasks]:
            for item in collection:
                if "_id" in item:
                    item.pop("_id")
        
        # Calculate comprehensive resource analysis
        resource_allocation = calculate_resource_allocation(tasks, users, regular_tasks)
        resource_workload = calculate_resource_workload(tasks, users, regular_tasks)
        
        # Skill gap analysis
        skill_gaps = analyze_skill_gaps(tasks, users)
        
        # Resource optimization suggestions
        optimization_suggestions = generate_resource_optimization_suggestions(
            resource_workload, tasks, users
        )
        
        return {
            "project_id": project_id,
            "resource_allocation": resource_allocation,
            "resource_workload": resource_workload,
            "skill_gaps": skill_gaps,
            "optimization_suggestions": optimization_suggestions,
            "summary": {
                "total_resources": len(users),
                "allocated_resources": len([u for u in users if any(u["id"] in task.get("assignee_ids", []) for task in tasks)]),
                "overallocated_count": len(resource_workload.get("overloaded_users", [])),
                "underutilized_count": len(resource_workload.get("underutilized_users", [])),
                "average_utilization": resource_workload.get("average_utilization", 0)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving resource analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def analyze_skill_gaps(tasks: List[Dict], users: List[Dict]) -> Dict[str, Any]:
    """Analyze skill gaps and requirements"""
    
    # Extract required skills from task names/descriptions (simplified)
    required_skills = set()
    skill_keywords = {
        "frontend": ["react", "vue", "angular", "javascript", "css", "html"],
        "backend": ["python", "java", "node", "api", "database"],
        "mobile": ["ios", "android", "react native", "flutter"],
        "design": ["ui", "ux", "design", "figma", "sketch"],
        "devops": ["docker", "kubernetes", "aws", "deployment", "ci/cd"],
        "testing": ["test", "qa", "selenium", "pytest"],
        "data": ["analytics", "data", "sql", "reporting"]
    }
    
    for task in tasks:
        task_text = f"{task.get('name', '')} {task.get('description', '')}".lower()
        for category, keywords in skill_keywords.items():
            if any(keyword in task_text for keyword in keywords):
                required_skills.add(category)
    
    # Get available skills from users
    available_skills = set()
    user_skills_map = {}
    
    for user in users:
        user_skills = [skill.lower() for skill in user.get("skills", [])]
        user_skills_map[user["id"]] = user_skills
        available_skills.update(user_skills)
    
    # Identify gaps
    skill_gaps = required_skills - available_skills
    
    return {
        "required_skills": list(required_skills),
        "available_skills": list(available_skills),
        "skill_gaps": list(skill_gaps),
        "user_skills_map": user_skills_map,
        "coverage_percentage": len(available_skills) / len(required_skills) * 100 if required_skills else 100
    }


def generate_resource_optimization_suggestions(workload_data: Dict, tasks: List[Dict], users: List[Dict]) -> List[Dict[str, Any]]:
    """Generate suggestions for resource optimization"""
    
    suggestions = []
    
    overloaded = workload_data.get("overloaded_users", [])
    underutilized = workload_data.get("underutilized_users", [])
    
    # Suggest task redistribution
    if overloaded and underutilized:
        suggestions.append({
            "type": "task_redistribution",
            "priority": "high",
            "title": "Redistribute tasks to balance workload",
            "description": f"{len(overloaded)} users are overloaded while {len(underutilized)} are underutilized",
            "actions": [
                f"Move tasks from overloaded users: {overloaded[:3]}",
                f"Assign more work to underutilized users: {underutilized[:3]}"
            ]
        })
    
    # Suggest hiring if everyone is overloaded
    if len(overloaded) > len(users) * 0.7:
        suggestions.append({
            "type": "resource_expansion",
            "priority": "high",
            "title": "Consider hiring additional team members",
            "description": f"{len(overloaded)} out of {len(users)} team members are overloaded",
            "actions": [
                "Hire additional developers",
                "Consider outsourcing non-critical tasks",
                "Extend project timeline"
            ]
        })
    
    # Suggest task optimization for large unstarted tasks
    large_pending_tasks = [
        task for task in tasks 
        if task.get("duration", 0) > 40 and task.get("percent_complete", 0) == 0
    ]
    
    if large_pending_tasks:
        suggestions.append({
            "type": "task_optimization",
            "priority": "medium",
            "title": "Break down large tasks",
            "description": f"{len(large_pending_tasks)} large tasks haven't been started",
            "actions": [
                "Break large tasks into smaller subtasks",
                "Assign clear owners to each subtask",
                "Set intermediate milestones"
            ]
        })
    
    return suggestions