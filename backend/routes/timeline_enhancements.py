from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from pydantic import BaseModel

from database import get_database
from auth.utils import verify_token
from auth.middleware import get_current_user, get_current_active_user
from models import User

router = APIRouter(prefix="/api/timeline-enhancements", tags=["Timeline Enhancements"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


class TaskAssignmentUpdate(BaseModel):
    task_id: str
    assignee_ids: List[str]
    estimated_hours: Optional[int] = None


class ResourceReallocation(BaseModel):
    from_user_id: str
    to_user_id: str
    task_ids: List[str]


@router.post("/assign-resources")
async def assign_resources_to_tasks(
    assignment: TaskAssignmentUpdate,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Assign resources to timeline tasks with workload balancing"""
    try:
        # Get the timeline task
        task = await db.timeline_tasks.find_one({"id": assignment.task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Timeline task not found")
        
        # Update task assignments
        update_data = {
            "assignee_ids": assignment.assignee_ids,
            "updated_at": datetime.utcnow()
        }
        
        if assignment.estimated_hours:
            update_data["duration"] = assignment.estimated_hours
            update_data["work"] = assignment.estimated_hours
        
        await db.timeline_tasks.update_one(
            {"id": assignment.task_id},
            {"$set": update_data}
        )
        
        # Also update the regular task if exists
        regular_task = await db.tasks.find_one({"id": assignment.task_id})
        if regular_task:
            await db.tasks.update_one(
                {"id": assignment.task_id},
                {"$set": {
                    "assignee_id": assignment.assignee_ids[0] if assignment.assignee_ids else None,
                    "estimated_hours": assignment.estimated_hours or regular_task.get("estimated_hours"),
                    "updated_at": datetime.utcnow()
                }}
            )
        
        # Log the assignment change
        logger.info(f"Task {assignment.task_id} assigned to users: {assignment.assignee_ids}")
        
        return {
            "message": "Resources assigned successfully",
            "task_id": assignment.task_id,
            "assignees": assignment.assignee_ids,
            "estimated_hours": assignment.estimated_hours
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning resources: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reallocate-resources")
async def reallocate_resources(
    reallocation: ResourceReallocation,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Reallocate tasks from overloaded to underutilized resources"""
    try:
        successful_reallocations = []
        failed_reallocations = []
        
        for task_id in reallocation.task_ids:
            try:
                # Update timeline task
                task_result = await db.timeline_tasks.update_one(
                    {"id": task_id, "assignee_ids": reallocation.from_user_id},
                    {"$set": {
                        "assignee_ids": [reallocation.to_user_id],
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                # Update regular task
                regular_result = await db.tasks.update_one(
                    {"id": task_id, "assignee_id": reallocation.from_user_id},
                    {"$set": {
                        "assignee_id": reallocation.to_user_id,
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                if task_result.modified_count > 0 or regular_result.modified_count > 0:
                    successful_reallocations.append(task_id)
                else:
                    failed_reallocations.append(task_id)
                    
            except Exception as task_error:
                logger.error(f"Failed to reallocate task {task_id}: {task_error}")
                failed_reallocations.append(task_id)
        
        return {
            "message": f"Reallocation completed: {len(successful_reallocations)} successful, {len(failed_reallocations)} failed",
            "successful_reallocations": successful_reallocations,
            "failed_reallocations": failed_reallocations,
            "from_user": reallocation.from_user_id,
            "to_user": reallocation.to_user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reallocating resources: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/project/{project_id}/critical-path-analysis")
async def get_critical_path_analysis(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get detailed critical path analysis with bottlenecks and optimization suggestions"""
    try:
        # Get timeline tasks and dependencies
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for collection in [tasks, dependencies]:
            for item in collection:
                if "_id" in item:
                    item.pop("_id")
        
        # Calculate critical path with detailed analysis
        critical_path_analysis = calculate_detailed_critical_path(tasks, dependencies)
        
        # Identify bottlenecks
        bottlenecks = identify_project_bottlenecks(tasks, dependencies, critical_path_analysis)
        
        # Generate optimization suggestions
        optimizations = generate_optimization_suggestions(tasks, dependencies, critical_path_analysis, bottlenecks)
        
        return {
            "project_id": project_id,
            "critical_path_analysis": critical_path_analysis,
            "bottlenecks": bottlenecks,
            "optimizations": optimizations,
            "summary": {
                "critical_path_length": len(critical_path_analysis.get("critical_tasks", [])),
                "project_duration_days": critical_path_analysis.get("project_duration_hours", 0) / 8,  # Convert to days
                "float_hours": critical_path_analysis.get("total_float_available", 0),
                "bottleneck_count": len(bottlenecks)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing critical path: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def calculate_detailed_critical_path(tasks: List[Dict], dependencies: List[Dict]) -> Dict[str, Any]:
    """Calculate detailed critical path with float calculations"""
    
    if not tasks:
        return {
            "critical_tasks": [],
            "project_duration_hours": 0,
            "total_float_available": 0,
            "paths": []
        }
    
    # Create task lookup
    task_lookup = {task["id"]: task for task in tasks}
    
    # Build dependency graph
    predecessors = {task["id"]: [] for task in tasks}
    successors = {task["id"]: [] for task in tasks}
    
    for dep in dependencies:
        pred_id = dep["predecessor_id"]
        succ_id = dep["successor_id"]
        if pred_id in predecessors and succ_id in successors:
            predecessors[succ_id].append(pred_id)
            successors[pred_id].append(succ_id)
    
    # Forward pass
    earliest_start = {}
    earliest_finish = {}
    
    # Topological sort for processing order
    def topological_sort():
        visited = set()
        sorted_tasks = []
        
        def visit(task_id):
            if task_id in visited:
                return
            visited.add(task_id)
            for pred in predecessors[task_id]:
                visit(pred)
            sorted_tasks.append(task_id)
        
        for task_id in task_lookup:
            visit(task_id)
        
        return sorted_tasks
    
    sorted_task_ids = topological_sort()
    
    # Calculate earliest start/finish
    for task_id in sorted_task_ids:
        task = task_lookup[task_id]
        duration = task.get("duration", 0)
        
        if not predecessors[task_id]:
            earliest_start[task_id] = 0
        else:
            earliest_start[task_id] = max(
                earliest_finish[pred_id] for pred_id in predecessors[task_id]
                if pred_id in earliest_finish
            )
        
        earliest_finish[task_id] = earliest_start[task_id] + duration
    
    # Calculate project duration
    project_duration = max(earliest_finish.values()) if earliest_finish else 0
    
    # Backward pass
    latest_start = {}
    latest_finish = {}
    
    # Initialize latest finish for tasks with no successors
    for task_id in task_lookup:
        if not successors[task_id]:
            latest_finish[task_id] = earliest_finish.get(task_id, project_duration)
    
    # Calculate latest start/finish in reverse order
    for task_id in reversed(sorted_task_ids):
        task = task_lookup[task_id]
        duration = task.get("duration", 0)
        
        if task_id not in latest_finish:
            if successors[task_id]:
                latest_finish[task_id] = min(
                    latest_start[succ_id] for succ_id in successors[task_id]
                    if succ_id in latest_start
                )
            else:
                latest_finish[task_id] = project_duration
        
        latest_start[task_id] = latest_finish[task_id] - duration
    
    # Calculate float and identify critical tasks
    critical_tasks = []
    task_details = {}
    total_float = 0
    
    for task_id in task_lookup:
        es = earliest_start.get(task_id, 0)
        ef = earliest_finish.get(task_id, 0)
        ls = latest_start.get(task_id, 0)
        lf = latest_finish.get(task_id, 0)
        
        free_float = min(
            [earliest_start.get(succ_id, project_duration) for succ_id in successors[task_id]] + [project_duration]
        ) - ef
        
        total_float_task = ls - es
        
        task_details[task_id] = {
            "task_name": task_lookup[task_id]["name"],
            "earliest_start": es,
            "earliest_finish": ef,
            "latest_start": ls,
            "latest_finish": lf,
            "total_float": total_float_task,
            "free_float": max(0, free_float),
            "critical": total_float_task <= 0
        }
        
        if total_float_task <= 0:
            critical_tasks.append(task_id)
        
        total_float += total_float_task
    
    # Find all paths through the network
    all_paths = find_all_paths(task_lookup, predecessors, successors)
    
    return {
        "critical_tasks": critical_tasks,
        "project_duration_hours": project_duration,
        "total_float_available": max(0, total_float),
        "task_details": task_details,
        "paths": all_paths,
        "longest_path": max(all_paths, key=lambda x: x["duration"]) if all_paths else None
    }


def find_all_paths(task_lookup: Dict, predecessors: Dict, successors: Dict) -> List[Dict[str, Any]]:
    """Find all paths through the project network"""
    
    # Find start tasks (no predecessors)
    start_tasks = [task_id for task_id, preds in predecessors.items() if not preds]
    
    # Find end tasks (no successors)
    end_tasks = [task_id for task_id, succs in successors.items() if not succs]
    
    all_paths = []
    
    def find_paths_recursive(current_task, current_path, current_duration):
        current_path = current_path + [current_task]
        current_duration += task_lookup[current_task].get("duration", 0)
        
        if current_task in end_tasks:
            # Reached an end task, record this path
            all_paths.append({
                "tasks": current_path.copy(),
                "duration": current_duration,
                "task_names": [task_lookup[task_id]["name"] for task_id in current_path]
            })
            return
        
        # Continue to successors
        for successor in successors[current_task]:
            find_paths_recursive(successor, current_path, current_duration)
    
    # Start path finding from each start task
    for start_task in start_tasks:
        find_paths_recursive(start_task, [], 0)
    
    return all_paths


def identify_project_bottlenecks(tasks: List[Dict], dependencies: List[Dict], critical_path_analysis: Dict) -> List[Dict[str, Any]]:
    """Identify project bottlenecks and constraints"""
    
    bottlenecks = []
    task_details = critical_path_analysis.get("task_details", {})
    
    # Critical path bottlenecks
    critical_tasks = critical_path_analysis.get("critical_tasks", [])
    for task_id in critical_tasks:
        task_info = next((t for t in tasks if t["id"] == task_id), None)
        if task_info:
            bottlenecks.append({
                "type": "critical_path",
                "severity": "high",
                "task_id": task_id,
                "task_name": task_info["name"],
                "description": "Task is on critical path - any delay will impact project completion",
                "impact": "Project delay",
                "recommendation": "Monitor closely, ensure adequate resources, consider task acceleration"
            })
    
    # Resource bottlenecks (tasks with many assignees or high duration)
    for task in tasks:
        assignees = task.get("assignee_ids", [])
        duration = task.get("duration", 0)
        
        if len(assignees) == 0 and duration > 0:
            bottlenecks.append({
                "type": "resource_constraint",
                "severity": "medium",
                "task_id": task["id"],
                "task_name": task["name"],
                "description": "Task has no assigned resources",
                "impact": "Task cannot start",
                "recommendation": "Assign qualified team members to this task"
            })
        
        if duration > 40:  # Tasks longer than 40 hours (1 week)
            bottlenecks.append({
                "type": "duration_risk",
                "severity": "medium",
                "task_id": task["id"],
                "task_name": task["name"],
                "description": f"Long duration task ({duration}h) with higher risk of delay",
                "impact": "Increased delay risk",
                "recommendation": "Break into smaller subtasks or add more resources"
            })
    
    # Dependency bottlenecks (tasks with many predecessors)
    dependency_counts = {}
    for dep in dependencies:
        succ_id = dep["successor_id"]
        dependency_counts[succ_id] = dependency_counts.get(succ_id, 0) + 1
    
    for task_id, count in dependency_counts.items():
        if count >= 3:
            task_info = next((t for t in tasks if t["id"] == task_id), None)
            if task_info:
                bottlenecks.append({
                    "type": "dependency_complexity",
                    "severity": "low",
                    "task_id": task_id,
                    "task_name": task_info["name"],
                    "description": f"Task has {count} dependencies, increasing coordination complexity",
                    "impact": "Coordination overhead",
                    "recommendation": "Review if all dependencies are necessary, improve communication"
                })
    
    return bottlenecks


def generate_optimization_suggestions(tasks: List[Dict], dependencies: List[Dict], critical_path_analysis: Dict, bottlenecks: List[Dict]) -> List[Dict[str, Any]]:
    """Generate project optimization suggestions"""
    
    suggestions = []
    task_details = critical_path_analysis.get("task_details", {})
    critical_tasks = critical_path_analysis.get("critical_tasks", [])
    
    # Critical path optimization
    if len(critical_tasks) > 5:
        suggestions.append({
            "category": "schedule_optimization",
            "priority": "high",
            "title": "Optimize Critical Path",
            "description": f"Critical path has {len(critical_tasks)} tasks. Consider parallel execution or resource acceleration.",
            "actions": [
                "Identify tasks that can be done in parallel",
                "Add more resources to critical tasks",
                "Review task dependencies for opportunities to overlap work",
                "Consider fast-tracking or crashing techniques"
            ],
            "impact": "Reduce project duration",
            "effort": "medium"
        })
    
    # Resource leveling
    unassigned_tasks = [task for task in tasks if not task.get("assignee_ids")]
    if unassigned_tasks:
        suggestions.append({
            "category": "resource_management",
            "priority": "high",
            "title": "Assign Resources to Tasks",
            "description": f"{len(unassigned_tasks)} tasks have no assigned resources.",
            "actions": [
                "Review skill requirements for unassigned tasks",
                "Assign team members based on availability and skills",
                "Consider hiring or contracting if resources are insufficient"
            ],
            "impact": "Enable task execution",
            "effort": "low"
        })
    
    # Task size optimization
    large_tasks = [task for task in tasks if task.get("duration", 0) > 40]
    if large_tasks:
        suggestions.append({
            "category": "task_management",
            "priority": "medium",
            "title": "Break Down Large Tasks",
            "description": f"{len(large_tasks)} tasks are longer than 40 hours.",
            "actions": [
                "Split large tasks into smaller, manageable subtasks",
                "Create intermediate milestones and checkpoints",
                "Distribute work among team members",
                "Improve progress tracking and visibility"
            ],
            "impact": "Reduce risk and improve tracking",
            "effort": "medium"
        })
    
    # Dependency optimization
    high_dependency_tasks = []
    dependency_counts = {}
    for dep in dependencies:
        succ_id = dep["successor_id"]
        dependency_counts[succ_id] = dependency_counts.get(succ_id, 0) + 1
    
    for task_id, count in dependency_counts.items():
        if count >= 3:
            high_dependency_tasks.append(task_id)
    
    if high_dependency_tasks:
        suggestions.append({
            "category": "dependency_management",
            "priority": "low",
            "title": "Simplify Task Dependencies",
            "description": f"{len(high_dependency_tasks)} tasks have complex dependency chains.",
            "actions": [
                "Review if all dependencies are truly necessary",
                "Look for opportunities to parallelize work",
                "Improve communication between dependent teams",
                "Consider dependency management tools"
            ],
            "impact": "Reduce coordination overhead",
            "effort": "low"
        })
    
    return suggestions


@router.get("/project/{project_id}/schedule-optimization")
async def get_schedule_optimization(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get schedule optimization recommendations including fast-tracking and crashing options"""
    try:
        # Get project data
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        users_cursor = db.users.find({})
        users = await users_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for collection in [tasks, dependencies, users]:
            for item in collection:
                if "_id" in item:
                    item.pop("_id")
        
        # Calculate current schedule metrics
        current_metrics = calculate_schedule_metrics(tasks, dependencies)
        
        # Generate fast-tracking opportunities
        fast_track_options = identify_fast_tracking_opportunities(tasks, dependencies)
        
        # Generate crashing opportunities  
        crash_options = identify_crashing_opportunities(tasks, users)
        
        # Calculate potential savings
        optimization_impact = calculate_optimization_impact(tasks, dependencies, fast_track_options, crash_options)
        
        return {
            "project_id": project_id,
            "current_metrics": current_metrics,
            "fast_tracking": {
                "opportunities": fast_track_options,
                "potential_savings_hours": sum(opt.get("time_savings", 0) for opt in fast_track_options)
            },
            "crashing": {
                "opportunities": crash_options,
                "potential_savings_hours": sum(opt.get("time_savings", 0) for opt in crash_options)
            },
            "optimization_impact": optimization_impact,
            "recommendations": generate_schedule_recommendations(current_metrics, fast_track_options, crash_options)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating schedule optimization: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def calculate_schedule_metrics(tasks: List[Dict], dependencies: List[Dict]) -> Dict[str, Any]:
    """Calculate current project schedule metrics"""
    
    total_hours = sum(task.get("duration", 0) for task in tasks)
    completed_hours = sum(
        task.get("duration", 0) * (task.get("percent_complete", 0) / 100)
        for task in tasks
    )
    
    # Calculate project duration (simplified - assumes sequential execution)
    project_duration = total_hours  # This would be more sophisticated with proper scheduling
    
    return {
        "total_tasks": len(tasks),
        "total_hours": total_hours,
        "completed_hours": int(completed_hours),
        "remaining_hours": int(total_hours - completed_hours),
        "project_duration_hours": project_duration,
        "project_duration_days": project_duration / 8,
        "completion_percentage": (completed_hours / total_hours * 100) if total_hours > 0 else 0
    }


def identify_fast_tracking_opportunities(tasks: List[Dict], dependencies: List[Dict]) -> List[Dict[str, Any]]:
    """Identify opportunities for fast-tracking (parallel execution)"""
    
    opportunities = []
    
    # Build dependency map
    predecessors = {task["id"]: [] for task in tasks}
    for dep in dependencies:
        predecessors[dep["successor_id"]].append(dep["predecessor_id"])
    
    # Look for tasks that could potentially be parallelized
    for task in tasks:
        task_id = task["id"]
        task_predecessors = predecessors[task_id]
        
        if len(task_predecessors) >= 2:
            # Task has multiple predecessors - check if some could be overlapped
            opportunities.append({
                "task_id": task_id,
                "task_name": task["name"],
                "type": "dependency_overlap",
                "description": f"Task depends on {len(task_predecessors)} other tasks - consider overlapping some dependencies",
                "time_savings": task.get("duration", 0) * 0.2,  # Estimate 20% savings
                "risk": "medium",
                "requirements": ["Updated coordination processes", "Clear interface definitions"]
            })
    
    # Look for independent task sequences that could be parallelized
    task_groups = group_independent_tasks(tasks, dependencies)
    for group in task_groups:
        if len(group) >= 2:
            total_duration = sum(
                next((t["duration"] for t in tasks if t["id"] == task_id), 0)
                for task_id in group
            )
            opportunities.append({
                "task_ids": group,
                "task_names": [
                    next((t["name"] for t in tasks if t["id"] == task_id), "Unknown")
                    for task_id in group
                ],
                "type": "parallel_execution",
                "description": f"Group of {len(group)} independent tasks could be executed in parallel",
                "time_savings": total_duration * 0.3,  # Estimate 30% savings from parallelization
                "risk": "low",
                "requirements": ["Sufficient team resources", "Clear task boundaries"]
            })
    
    return opportunities


def identify_crashing_opportunities(tasks: List[Dict], users: List[Dict]) -> List[Dict[str, Any]]:
    """Identify opportunities for crashing (adding resources to reduce duration)"""
    
    opportunities = []
    
    # Tasks that could benefit from additional resources
    for task in tasks:
        duration = task.get("duration", 0)
        assignees = task.get("assignee_ids", [])
        
        # Large tasks with few assignees are good crashing candidates
        if duration > 24 and len(assignees) <= 2:  # More than 3 days, few people
            potential_savings = min(duration * 0.4, 16)  # Max 40% savings, up to 16 hours
            
            opportunities.append({
                "task_id": task["id"],
                "task_name": task["name"],
                "current_duration": duration,
                "current_assignees": len(assignees),
                "recommended_assignees": min(len(assignees) + 2, 4),  # Add up to 2 more people, max 4 total
                "time_savings": potential_savings,
                "cost_increase": "medium",  # Adding resources costs more
                "risk": "low",
                "requirements": [
                    "Additional skilled team members available",
                    "Task can be subdivided effectively",
                    "Coordination overhead manageable"
                ]
            })
    
    return opportunities


def calculate_optimization_impact(tasks: List[Dict], dependencies: List[Dict], 
                                fast_track_options: List[Dict], crash_options: List[Dict]) -> Dict[str, Any]:
    """Calculate the impact of applying optimization techniques"""
    
    current_duration = sum(task.get("duration", 0) for task in tasks)
    
    # Calculate potential time savings
    fast_track_savings = sum(opt.get("time_savings", 0) for opt in fast_track_options)
    crash_savings = sum(opt.get("time_savings", 0) for opt in crash_options)
    
    total_potential_savings = fast_track_savings + crash_savings
    optimized_duration = max(0, current_duration - total_potential_savings)
    
    return {
        "current_duration_hours": current_duration,
        "potential_savings_hours": total_potential_savings,
        "optimized_duration_hours": optimized_duration,
        "time_reduction_percentage": (total_potential_savings / current_duration * 100) if current_duration > 0 else 0,
        "fast_track_contribution": fast_track_savings,
        "crashing_contribution": crash_savings
    }


def group_independent_tasks(tasks: List[Dict], dependencies: List[Dict]) -> List[List[str]]:
    """Group tasks that are independent of each other"""
    
    # Build adjacency graph
    connected = {task["id"]: set() for task in tasks}
    
    for dep in dependencies:
        pred_id = dep["predecessor_id"]
        succ_id = dep["successor_id"]
        connected[pred_id].add(succ_id)
        connected[succ_id].add(pred_id)
    
    # Find connected components (groups of related tasks)
    visited = set()
    groups = []
    
    def dfs(task_id, current_group):
        if task_id in visited:
            return
        visited.add(task_id)
        current_group.append(task_id)
        
        for connected_task in connected[task_id]:
            dfs(connected_task, current_group)
    
    for task in tasks:
        if task["id"] not in visited:
            group = []
            dfs(task["id"], group)
            if len(group) > 1:  # Only include groups with multiple tasks
                groups.append(group)
    
    return groups


def generate_schedule_recommendations(current_metrics: Dict, fast_track_options: List[Dict], 
                                    crash_options: List[Dict]) -> List[Dict[str, Any]]:
    """Generate prioritized schedule optimization recommendations"""
    
    recommendations = []
    
    # High-impact, low-risk recommendations first
    low_risk_fast_track = [opt for opt in fast_track_options if opt.get("risk") == "low"]
    if low_risk_fast_track:
        total_savings = sum(opt.get("time_savings", 0) for opt in low_risk_fast_track)
        recommendations.append({
            "priority": "high",
            "category": "fast_tracking",
            "title": "Implement Low-Risk Parallel Execution",
            "description": f"Execute {len(low_risk_fast_track)} independent task groups in parallel",
            "time_savings": total_savings,
            "effort": "low",
            "risk": "low",
            "actions": [
                "Review task dependencies for unnecessary constraints",
                "Assign dedicated resources to each parallel stream",
                "Establish clear communication protocols",
                "Monitor progress closely during parallel execution"
            ]
        })
    
    # Medium-risk options with good ROI
    medium_risk_options = [opt for opt in fast_track_options if opt.get("risk") == "medium"]
    if medium_risk_options:
        total_savings = sum(opt.get("time_savings", 0) for opt in medium_risk_options)
        recommendations.append({
            "priority": "medium",
            "category": "fast_tracking",
            "title": "Overlap Dependent Tasks",
            "description": f"Carefully overlap {len(medium_risk_options)} dependent tasks",
            "time_savings": total_savings,
            "effort": "medium",
            "risk": "medium",
            "actions": [
                "Define clear interfaces between overlapping tasks",
                "Establish frequent coordination checkpoints",
                "Prepare contingency plans for integration issues",
                "Ensure teams have appropriate skills and experience"
            ]
        })
    
    # Crashing recommendations for critical situations
    if crash_options:
        high_impact_crash = sorted(crash_options, key=lambda x: x.get("time_savings", 0), reverse=True)[:3]
        total_savings = sum(opt.get("time_savings", 0) for opt in high_impact_crash)
        recommendations.append({
            "priority": "medium",
            "category": "crashing",
            "title": "Add Resources to High-Impact Tasks",
            "description": f"Accelerate {len(high_impact_crash)} tasks by adding resources",
            "time_savings": total_savings,
            "effort": "high",
            "risk": "medium",
            "actions": [
                "Secure additional qualified team members",
                "Break down large tasks for effective parallelization",
                "Implement coordination mechanisms for larger teams",
                "Monitor for diminishing returns as team size increases"
            ]
        })
    
    return recommendations