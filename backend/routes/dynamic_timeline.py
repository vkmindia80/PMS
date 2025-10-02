from fastapi import APIRouter, HTTPException, Depends, status, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import json
import logging
import asyncio
from pydantic import BaseModel

from database import get_database
from auth.utils import verify_token
from auth.middleware import get_current_user, get_current_active_user
from models import (
    User,
    TaskDependency, TaskDependencyCreate, TaskDependencyUpdate, TaskDependencyInDB,
    TimelineTask, TimelineTaskCreate, TimelineTaskUpdate, TimelineTaskInDB,
    TimelineProject, TimelineProjectCreate, TimelineProjectUpdate, TimelineProjectInDB,
    GanttChartData, TimelineStats, TimelineViewMode, DependencyType
)

router = APIRouter(prefix="/api/dynamic-timeline", tags=["Dynamic Timeline Management"])
security = HTTPBearer()
logger = logging.getLogger(__name__)

# Pydantic models for enhanced features
class TaskConflict(BaseModel):
    type: str  # 'resource', 'dependency', 'timeline', 'critical_path'
    severity: str  # 'low', 'medium', 'high'
    message: str
    suggested_resolution: Optional[str] = None
    affected_tasks: List[str] = []

class TimelineFilter(BaseModel):
    assignees: Optional[List[str]] = None
    statuses: Optional[List[str]] = None
    priorities: Optional[List[str]] = None
    date_range: Optional[Dict[str, str]] = None
    search_query: Optional[str] = None
    show_completed: Optional[bool] = True
    show_critical_only: Optional[bool] = False

class EnhancedTimelineTask(TimelineTaskInDB):
    conflicts: List[TaskConflict] = []
    is_editing: Optional[bool] = False
    edited_by: Optional[str] = None
    last_modified: Optional[datetime] = None
    auto_scheduled: Optional[bool] = False

class BatchUpdateRequest(BaseModel):
    updates: List[Dict[str, Any]]
    resolve_conflicts: bool = True

class AutoScheduleResult(BaseModel):
    scheduled_tasks: List[EnhancedTimelineTask]
    conflicts_resolved: int
    suggestions: List[str]

class RealtimeStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    overdue_tasks: int
    critical_path_length: int
    resource_utilization: float
    timeline_health_score: float
    estimated_completion: str
    conflicts_count: int
    last_updated: datetime

# WebSocket connection manager for enhanced real-time features
class EnhancedTimelineConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[Dict[str, Any]]] = {}
        self.user_sessions: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, project_id: str, user_id: str):
        await websocket.accept()
        
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        
        connection_info = {
            'websocket': websocket,
            'user_id': user_id,
            'connected_at': datetime.utcnow(),
            'last_activity': datetime.utcnow()
        }
        
        self.active_connections[project_id].append(connection_info)
        self.user_sessions[user_id] = {
            'project_id': project_id,
            'status': 'active',
            'current_task': None
        }
        
        # Notify others about user joining
        await self.broadcast_to_project(project_id, {
            'type': 'user_joined',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }, exclude_user=user_id)
        
        logger.info(f"Enhanced WebSocket connected for user {user_id} in project {project_id}")

    def disconnect(self, websocket: WebSocket, project_id: str, user_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id] = [
                conn for conn in self.active_connections[project_id] 
                if conn['websocket'] != websocket
            ]
            
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
        
        if user_id in self.user_sessions:
            del self.user_sessions[user_id]
        
        # Notify others about user leaving
        asyncio.create_task(self.broadcast_to_project(project_id, {
            'type': 'user_left',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }, exclude_user=user_id))
        
        logger.info(f"Enhanced WebSocket disconnected for user {user_id} in project {project_id}")

    async def broadcast_to_project(self, project_id: str, message: dict, exclude_user: str = None):
        if project_id not in self.active_connections:
            return
        
        disconnected_connections = []
        
        for connection in self.active_connections[project_id]:
            if exclude_user and connection['user_id'] == exclude_user:
                continue
                
            try:
                await connection['websocket'].send_text(json.dumps(message))
                connection['last_activity'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {e}")
                disconnected_connections.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected_connections:
            if conn in self.active_connections[project_id]:
                self.active_connections[project_id].remove(conn)

    async def notify_task_editing(self, project_id: str, task_id: str, user_id: str, is_editing: bool):
        message = {
            'type': 'task_editing_status',
            'task_id': task_id,
            'user_id': user_id,
            'is_editing': is_editing,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.broadcast_to_project(project_id, message)

    def get_active_users(self, project_id: str) -> List[Dict[str, Any]]:
        if project_id not in self.active_connections:
            return []
        
        return [{
            'user_id': conn['user_id'],
            'connected_at': conn['connected_at'].isoformat(),
            'last_activity': conn['last_activity'].isoformat()
        } for conn in self.active_connections[project_id]]

enhanced_timeline_manager = EnhancedTimelineConnectionManager()


# Enhanced Gantt Chart Data Endpoint with Filtering
@router.get("/gantt/{project_id}/enhanced")
async def get_enhanced_gantt_data(
    project_id: str,
    assignees: Optional[str] = Query(None, description="Comma-separated list of assignee IDs"),
    statuses: Optional[str] = Query(None, description="Comma-separated list of status filters"),
    search: Optional[str] = Query(None, description="Search query for task names/descriptions"),
    show_completed: Optional[bool] = Query(True, description="Include completed tasks"),
    critical_only: Optional[bool] = Query(False, description="Show only critical path tasks"),
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get enhanced Gantt chart data with filtering and conflict detection"""
    try:
        # Build filter query
        filter_query = {"project_id": project_id}
        
        # Apply filters
        if assignees:
            assignee_list = assignees.split(',')
            filter_query["assignee_ids"] = {"$in": assignee_list}
        
        if search:
            filter_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        if not show_completed:
            filter_query["percent_complete"] = {"$lt": 100}
        
        if critical_only:
            filter_query["critical"] = True

        # Get filtered tasks
        tasks_cursor = db.timeline_tasks.find(filter_query)
        tasks = await tasks_cursor.to_list(length=None)
        
        # Get dependencies
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for task in tasks:
            if "_id" in task:
                task.pop("_id")
        
        for dep in dependencies:
            if "_id" in dep:
                dep.pop("_id")

        # Detect conflicts
        conflicts = await detect_timeline_conflicts(tasks, dependencies, db)
        
        # Detect resource conflicts
        resource_conflicts = await detect_resource_conflicts(tasks, db)
        
        # Calculate critical path (simplified)
        critical_path = calculate_critical_path(tasks, dependencies)
        
        # Convert TaskConflict objects to dictionaries
        all_conflicts = conflicts + resource_conflicts
        conflicts_dict = []
        for c in all_conflicts:
            if hasattr(c, 'dict'):
                # Pydantic model with dict() method
                conflicts_dict.append(c.dict())
            elif isinstance(c, dict):
                # Already a dictionary
                conflicts_dict.append(c)
            else:
                # Convert TaskConflict attributes to dictionary
                conflicts_dict.append({
                    "type": c.type,
                    "severity": c.severity,
                    "message": c.message,
                    "suggested_resolution": c.suggested_resolution,
                    "affected_tasks": c.affected_tasks
                })
        
        return {
            "project_id": project_id,
            "tasks": tasks,
            "dependencies": dependencies,
            "conflicts": conflicts_dict,
            "critical_path": critical_path,
            "resource_conflicts": [c for c in conflicts_dict if c.get('type') == 'resource'],
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving enhanced Gantt chart data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Real-time Statistics Endpoint
@router.get("/stats/{project_id}/realtime", response_model=RealtimeStats)
async def get_realtime_timeline_stats(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get real-time timeline statistics with fallback to regular tasks"""
    try:
        # First try to get timeline tasks
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        # Fallback to regular tasks if no timeline tasks exist
        if not tasks:
            logger.info(f"No timeline tasks found for project {project_id}, falling back to regular tasks")
            
            # Get regular tasks for the project
            task_query = {
                "project_id": project_id,
                "organization_id": current_user.organization_id
            }
            
            regular_tasks_cursor = db.tasks.find(task_query)
            regular_tasks = await regular_tasks_cursor.to_list(length=None)
            
            if not regular_tasks:
                # Return default stats with zero values instead of error
                return RealtimeStats(
                    total_tasks=0,
                    completed_tasks=0,
                    in_progress_tasks=0,
                    overdue_tasks=0,
                    critical_path_length=0,
                    resource_utilization=0.0,
                    timeline_health_score=100.0,
                    estimated_completion="No tasks available",
                    conflicts_count=0,
                    last_updated=datetime.utcnow()
                )
            
            # Convert regular tasks to timeline format for statistics calculation
            tasks = []
            for task in regular_tasks:
                timeline_task = convert_task_to_timeline_format(task)
                tasks.append(timeline_task)

        # Calculate statistics with proper validation
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("percent_complete", 0) >= 100])
        in_progress_tasks = len([t for t in tasks if 0 < t.get("percent_complete", 0) < 100])
        
        # Calculate overdue tasks with better date handling
        current_date = datetime.utcnow()
        overdue_tasks = 0
        for task in tasks:
            if task.get("finish_date") or task.get("due_date"):
                finish_date = task.get("finish_date") or task.get("due_date")
                if isinstance(finish_date, str):
                    try:
                        finish_date = datetime.fromisoformat(finish_date.replace('Z', '+00:00'))
                    except ValueError:
                        continue
                elif isinstance(finish_date, datetime):
                    pass  # Already a datetime object
                else:
                    continue
                    
                if finish_date < current_date and task.get("percent_complete", 0) < 100:
                    overdue_tasks += 1

        # Count critical tasks directly
        critical_tasks = len([t for t in tasks if t.get("critical", False) or t.get("priority") == "critical"])

        # Get dependencies and conflicts
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        try:
            conflicts = await detect_timeline_conflicts(tasks, dependencies, db)
            conflicts_count = len(conflicts)
        except Exception as e:
            logger.warning(f"Error detecting conflicts: {e}")
            conflicts_count = 0

        # Calculate resource utilization (simplified but safe)
        try:
            resource_utilization = calculate_resource_utilization(tasks)
        except Exception as e:
            logger.warning(f"Error calculating resource utilization: {e}")
            resource_utilization = 0.0

        # Calculate timeline health score with safe division
        timeline_health_score = calculate_timeline_health_score(
            completed_tasks, total_tasks, overdue_tasks, conflicts_count
        )

        # Estimate completion date
        try:
            estimated_completion = estimate_project_completion(tasks)
        except Exception as e:
            logger.warning(f"Error estimating completion: {e}")
            estimated_completion = "Unable to estimate"

        return RealtimeStats(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            in_progress_tasks=in_progress_tasks,
            overdue_tasks=overdue_tasks,
            critical_path_length=critical_tasks,  # Use direct critical task count instead of critical path calculation
            resource_utilization=float(resource_utilization) if resource_utilization else 0.0,
            timeline_health_score=float(timeline_health_score) if timeline_health_score else 75.0,
            estimated_completion=estimated_completion,
            conflicts_count=conflicts_count,
            last_updated=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving realtime timeline statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Enhanced Task Update with Optimistic Updates
@router.put("/tasks/{task_id}/dynamic", response_model=EnhancedTimelineTask)
async def update_task_dynamic(
    task_id: str,
    task_update: TimelineTaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update a timeline task with real-time conflict detection and optimistic updates"""
    try:
        task = await db.timeline_tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Timeline task not found")

        # Store original values for conflict detection (for future use)
        # original_task = task.copy()
        
        update_data = {k: v for k, v in task_update.dict().items() if v is not None}
        
        # Recalculate finish date if start date or duration changed
        if "start_date" in update_data or "duration" in update_data:
            start_date = update_data.get("start_date")
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            elif start_date is None:
                start_date = task["start_date"]
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    
            duration = update_data.get("duration", task["duration"])
            update_data["finish_date"] = start_date + timedelta(hours=duration)

        update_data["updated_at"] = datetime.utcnow()
        update_data["last_modified"] = datetime.utcnow()

        # Update task in database
        await db.timeline_tasks.update_one(
            {"id": task_id},
            {"$set": update_data}
        )

        updated_task = await db.timeline_tasks.find_one({"id": task_id})
        
        # Remove MongoDB _id
        if "_id" in updated_task:
            updated_task.pop("_id")

        # Detect conflicts after update
        all_tasks_cursor = db.timeline_tasks.find({"project_id": task["project_id"]})
        all_tasks = await all_tasks_cursor.to_list(length=None)
        
        dependencies_cursor = db.task_dependencies.find({"project_id": task["project_id"]})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        conflicts = await detect_timeline_conflicts(all_tasks, dependencies, db)
        task_conflicts = [c for c in conflicts if task_id in c.get('affected_tasks', [])]

        # Create enhanced task response
        enhanced_task = EnhancedTimelineTask(
            **updated_task,
            conflicts=task_conflicts,
            last_modified=update_data["last_modified"]
        )

        # Broadcast update to connected clients
        background_tasks.add_task(
            enhanced_timeline_manager.broadcast_to_project,
            task["project_id"],
            {
                "type": "task_updated",
                "data": enhanced_task.dict(),
                "user_id": current_user.id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        # If conflicts were introduced, notify about them
        if task_conflicts and not any(c.get('affected_tasks', []) for c in conflicts if task_id in c.get('affected_tasks', [])):
            background_tasks.add_task(
                enhanced_timeline_manager.broadcast_to_project,
                task["project_id"],
                {
                    "type": "conflict_detected",
                    "data": task_conflicts[0],
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        logger.info(f"Dynamic task updated: {task_id} by user: {current_user.id}")
        return enhanced_task
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task dynamically: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Auto-scheduling Endpoint
@router.post("/projects/{project_id}/auto-schedule", response_model=AutoScheduleResult)
async def auto_schedule_tasks(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Automatically schedule tasks based on dependencies and resource constraints"""
    try:
        # Get all tasks and dependencies for the project
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        if not tasks:
            raise HTTPException(status_code=404, detail="No tasks found for project")

        # Perform auto-scheduling algorithm
        scheduled_tasks, conflicts_resolved, suggestions = await perform_auto_scheduling(
            tasks, dependencies, db
        )

        # Update tasks in database
        for task in scheduled_tasks:
            await db.timeline_tasks.update_one(
                {"id": task["id"]},
                {"$set": {
                    "start_date": task["start_date"],
                    "finish_date": task["finish_date"],
                    "auto_scheduled": True,
                    "updated_at": datetime.utcnow()
                }}
            )

        # Convert to enhanced tasks
        enhanced_tasks = []
        for task in scheduled_tasks:
            if "_id" in task:
                task.pop("_id")
            enhanced_tasks.append(EnhancedTimelineTask(**task, auto_scheduled=True))

        result = AutoScheduleResult(
            scheduled_tasks=enhanced_tasks,
            conflicts_resolved=conflicts_resolved,
            suggestions=suggestions
        )

        # Broadcast auto-schedule completion
        background_tasks.add_task(
            enhanced_timeline_manager.broadcast_to_project,
            project_id,
            {
                "type": "auto_schedule_completed",
                "data": result.dict(),
                "user_id": current_user.id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        logger.info(f"Auto-scheduling completed for project {project_id}: {conflicts_resolved} conflicts resolved")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in auto-scheduling: {e}")
        raise HTTPException(status_code=500, detail="Auto-scheduling failed")


# Batch Update Endpoint
@router.post("/tasks/batch-update")
async def batch_update_tasks(
    request: BatchUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Batch update multiple tasks with conflict resolution"""
    try:
        successful_updates = []
        failed_updates = []
        conflicts_detected = []

        for update in request.updates:
            try:
                task_id = update.pop('id')
                
                # Update task
                await db.timeline_tasks.update_one(
                    {"id": task_id},
                    {"$set": {**update, "updated_at": datetime.utcnow()}}
                )
                
                updated_task = await db.timeline_tasks.find_one({"id": task_id})
                if "_id" in updated_task:
                    updated_task.pop("_id")
                    
                successful_updates.append(updated_task)
                
            except Exception as e:
                failed_updates.append({
                    "id": update.get('id', 'unknown'),
                    "error": str(e)
                })

        # If conflict resolution is requested, detect and resolve conflicts
        if request.resolve_conflicts and successful_updates:
            # Get project_id from first successful update
            project_id = successful_updates[0]["project_id"]
            
            # Get all tasks for conflict detection
            all_tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
            all_tasks = await all_tasks_cursor.to_list(length=None)
            
            dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
            dependencies = await dependencies_cursor.to_list(length=None)
            
            conflicts_detected = await detect_timeline_conflicts(all_tasks, dependencies, db)

        result = {
            "successful": successful_updates,
            "failed": failed_updates,
            "conflicts_detected": conflicts_detected
        }

        # Broadcast batch update completion
        if successful_updates:
            project_id = successful_updates[0]["project_id"]
            background_tasks.add_task(
                enhanced_timeline_manager.broadcast_to_project,
                project_id,
                {
                    "type": "batch_update_completed",
                    "data": result,
                    "user_id": current_user.id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        return result
        
    except Exception as e:
        logger.error(f"Error in batch update: {e}")
        raise HTTPException(status_code=500, detail="Batch update failed")


# Task Search with Suggestions
@router.get("/projects/{project_id}/search")
async def search_tasks(
    project_id: str,
    q: str = Query(..., description="Search query"),
    include_suggestions: bool = Query(False, description="Include search suggestions"),
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Search tasks with real-time suggestions"""
    try:
        # Build search query
        search_query = {
            "project_id": project_id,
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}}
            ]
        }
        
        # Execute search
        tasks_cursor = db.timeline_tasks.find(search_query)
        tasks = await tasks_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for task in tasks:
            if "_id" in task:
                task.pop("_id")

        suggestions = []
        if include_suggestions:
            # Generate search suggestions based on existing task names
            all_tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
            all_tasks = await all_tasks_cursor.to_list(length=None)
            
            task_names = [task["name"] for task in all_tasks]
            suggestions = [name for name in task_names if q.lower() in name.lower()][:5]

        return {
            "tasks": tasks,
            "suggestions": suggestions,
            "total_found": len(tasks)
        }
        
    except Exception as e:
        logger.error(f"Error searching tasks: {e}")
        raise HTTPException(status_code=500, detail="Search failed")


# Enhanced WebSocket Endpoint
@router.websocket("/ws/{project_id}")
async def enhanced_timeline_websocket_endpoint(
    websocket: WebSocket, 
    project_id: str,
    token: Optional[str] = None
):
    """Enhanced WebSocket endpoint for real-time timeline collaboration"""
    user_id = None
    
    try:
        # Simple token validation (in production, use proper JWT validation)
        if token:
            # Validate token and get user_id
            user_id = "demo-user-001"  # Simplified for demo
        else:
            user_id = f"anonymous-{datetime.utcnow().timestamp()}"
        
        await enhanced_timeline_manager.connect(websocket, project_id, user_id)
        
        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong", 
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                    
                elif message.get("type") == "task_editing_start":
                    await enhanced_timeline_manager.notify_task_editing(
                        project_id, message.get("task_id"), user_id, True
                    )
                    
                elif message.get("type") == "task_editing_end":
                    await enhanced_timeline_manager.notify_task_editing(
                        project_id, message.get("task_id"), user_id, False
                    )
                    
                elif message.get("type") == "cursor_position":
                    # Broadcast cursor position to other users
                    await enhanced_timeline_manager.broadcast_to_project(
                        project_id, 
                        {
                            "type": "user_cursor",
                            "user_id": user_id,
                            "position": message.get("position"),
                            "timestamp": datetime.utcnow().isoformat()
                        },
                        exclude_user=user_id
                    )
                    
        except WebSocketDisconnect:
            pass
            
    except Exception as e:
        logger.error(f"Enhanced WebSocket error: {e}")
    finally:
        if user_id:
            enhanced_timeline_manager.disconnect(websocket, project_id, user_id)


# Get Active Users in Project
@router.get("/projects/{project_id}/active-users")
async def get_active_users(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get list of users currently active in the project timeline"""
    try:
        active_users = enhanced_timeline_manager.get_active_users(project_id)
        
        # Enhance with user details from database
        enhanced_users = []
        for user_info in active_users:
            user_id = user_info["user_id"]
            user = await db.users.find_one({"id": user_id})
            
            if user:
                enhanced_users.append({
                    "id": user_id,
                    "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                    "avatar": user.get("avatar_url"),
                    "connected_at": user_info["connected_at"],
                    "last_activity": user_info["last_activity"]
                })
        
        return enhanced_users
        
    except Exception as e:
        logger.error(f"Error retrieving active users: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve active users")


# Helper Functions

async def detect_timeline_conflicts(tasks: List[Dict], dependencies: List[Dict], db) -> List[TaskConflict]:
    """Detect timeline-related conflicts"""
    conflicts = []
    
    # Check for circular dependencies
    for dep in dependencies:
        if await has_circular_dependency(dep, dependencies):
            conflicts.append(TaskConflict(
                type="dependency",
                severity="high",
                message=f"Circular dependency detected involving task {dep['successor_id']}",
                suggested_resolution="Remove one of the conflicting dependencies",
                affected_tasks=[dep['predecessor_id'], dep['successor_id']]
            ))
    
    # Check for dependency violations
    task_map = {task['id']: task for task in tasks}
    
    for dep in dependencies:
        predecessor = task_map.get(dep['predecessor_id'])
        successor = task_map.get(dep['successor_id'])
        
        if predecessor and successor:
            pred_finish = predecessor.get('finish_date')
            succ_start = successor.get('start_date')
            
            if pred_finish and succ_start:
                if isinstance(pred_finish, str):
                    pred_finish = datetime.fromisoformat(pred_finish.replace('Z', '+00:00'))
                if isinstance(succ_start, str):
                    succ_start = datetime.fromisoformat(succ_start.replace('Z', '+00:00'))
                
                if dep['dependency_type'] == 'FS' and pred_finish > succ_start:
                    conflicts.append(TaskConflict(
                        type="timeline",
                        severity="medium",
                        message=f"Task {successor['name']} starts before predecessor {predecessor['name']} finishes",
                        suggested_resolution="Adjust task start dates to respect dependencies",
                        affected_tasks=[predecessor['id'], successor['id']]
                    ))
    
    return conflicts


async def detect_resource_conflicts(tasks: List[Dict], db) -> List[TaskConflict]:
    """Detect resource over-allocation conflicts"""
    conflicts = []
    
    # Group tasks by assignee and check for overlaps
    assignee_tasks = {}
    
    for task in tasks:
        for assignee_id in task.get('assignee_ids', []):
            if assignee_id not in assignee_tasks:
                assignee_tasks[assignee_id] = []
            assignee_tasks[assignee_id].append(task)
    
    for assignee_id, user_tasks in assignee_tasks.items():
        # Check for overlapping tasks
        for i, task1 in enumerate(user_tasks):
            for task2 in user_tasks[i+1:]:
                if tasks_overlap(task1, task2):
                    conflicts.append(TaskConflict(
                        type="resource",
                        severity="medium",
                        message=f"Resource {assignee_id} has overlapping tasks: {task1['name']} and {task2['name']}",
                        suggested_resolution="Reschedule one of the tasks or assign additional resources",
                        affected_tasks=[task1['id'], task2['id']]
                    ))
    
    return conflicts


def tasks_overlap(task1: Dict, task2: Dict) -> bool:
    """Check if two tasks overlap in time"""
    start1 = task1.get('start_date')
    end1 = task1.get('finish_date')
    start2 = task2.get('start_date')
    end2 = task2.get('finish_date')
    
    if not all([start1, end1, start2, end2]):
        return False
    
    # Convert to datetime if strings
    for date_val in [start1, end1, start2, end2]:
        if isinstance(date_val, str):
            date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
    
    return start1 < end2 and start2 < end1


async def has_circular_dependency(dependency: Dict, all_dependencies: List[Dict]) -> bool:
    """Check if adding this dependency would create a circular dependency"""
    # Simplified circular dependency detection
    visited = set()
    
    def dfs(current_id: str, target_id: str) -> bool:
        if current_id == target_id:
            return True
        if current_id in visited:
            return False
        
        visited.add(current_id)
        
        # Find all dependencies where current_id is the predecessor
        for dep in all_dependencies:
            if dep['predecessor_id'] == current_id:
                if dfs(dep['successor_id'], target_id):
                    return True
        
        return False
    
    return dfs(dependency['successor_id'], dependency['predecessor_id'])


def calculate_critical_path(tasks: List[Dict], dependencies: List[Dict]) -> List[str]:
    """Calculate critical path (simplified implementation)"""
    # This is a simplified critical path calculation
    # In a real implementation, you'd use proper CPM algorithm
    
    critical_tasks = []
    # task_map = {task['id']: task for task in tasks}  # Unused for now
    
    # Find tasks with zero slack (simplified)
    for task in tasks:
        if task.get('critical', False):
            critical_tasks.append(task['id'])
    
    return critical_tasks


def calculate_resource_utilization(tasks: List[Dict]) -> float:
    """Calculate overall resource utilization"""
    if not tasks:
        return 0.0
    
    total_work = sum(task.get('duration', 0) for task in tasks)
    completed_work = sum(
        (task.get('duration', 0) * task.get('percent_complete', 0) / 100) 
        for task in tasks
    )
    
    return (completed_work / total_work * 100) if total_work > 0 else 0


def calculate_timeline_health_score(
    completed_tasks: int, 
    total_tasks: int, 
    overdue_tasks: int, 
    conflicts_count: int
) -> float:
    """Calculate timeline health score"""
    if total_tasks == 0:
        return 100.0
    
    completion_score = (completed_tasks / total_tasks) * 50
    overdue_penalty = min(overdue_tasks * 10, 30)
    conflict_penalty = min(conflicts_count * 5, 20)
    
    health_score = completion_score + 50 - overdue_penalty - conflict_penalty
    return max(0, min(100, health_score))


def estimate_project_completion(tasks: List[Dict]) -> str:
    """Estimate project completion date"""
    if not tasks:
        return "No tasks found"
    
    # Find the latest finish date
    finish_dates = []
    for task in tasks:
        if task.get('finish_date') and task.get('percent_complete', 0) < 100:
            finish_date = task['finish_date']
            if isinstance(finish_date, str):
                finish_date = datetime.fromisoformat(finish_date.replace('Z', '+00:00'))
            finish_dates.append(finish_date)
    
    if not finish_dates:
        return "All tasks completed"
    
    latest_finish = max(finish_dates)
    return latest_finish.strftime("%Y-%m-%d")


async def perform_auto_scheduling(
    tasks: List[Dict], 
    dependencies: List[Dict], 
    db
) -> tuple[List[Dict], int, List[str]]:
    """Perform automatic task scheduling based on dependencies and constraints"""
    scheduled_tasks = tasks.copy()
    conflicts_resolved = 0
    suggestions = []
    
    # Simple auto-scheduling algorithm
    # In practice, this would be much more sophisticated
    
    task_map = {task['id']: task for task in scheduled_tasks}
    
    # Sort tasks by dependencies (topological sort)
    for dep in dependencies:
        predecessor = task_map.get(dep['predecessor_id'])
        successor = task_map.get(dep['successor_id'])
        
        if predecessor and successor:
            pred_finish = predecessor.get('finish_date')
            succ_start = successor.get('start_date')
            
            if pred_finish and succ_start:
                if isinstance(pred_finish, str):
                    pred_finish = datetime.fromisoformat(pred_finish.replace('Z', '+00:00'))
                if isinstance(succ_start, str):
                    succ_start = datetime.fromisoformat(succ_start.replace('Z', '+00:00'))
                
                # If successor starts before predecessor finishes, reschedule
                if dep['dependency_type'] == 'FS' and pred_finish > succ_start:
                    # Reschedule successor to start after predecessor finishes
                    new_start = pred_finish + timedelta(hours=1)  # Add 1 hour buffer
                    duration = successor.get('duration', 8)
                    new_finish = new_start + timedelta(hours=duration)
                    
                    successor['start_date'] = new_start
                    successor['finish_date'] = new_finish
                    
                    conflicts_resolved += 1
                    suggestions.append(f"Rescheduled task '{successor['name']}' to resolve dependency conflict")
    
    return scheduled_tasks, conflicts_resolved, suggestions


def convert_task_to_timeline_format(task: Dict) -> Dict:
    """Convert a regular task to timeline task format"""
    try:
        # Handle date conversion
        start_date = task.get("created_at", datetime.utcnow())
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        due_date = task.get("due_date")
        finish_date = due_date
        if due_date and isinstance(due_date, str):
            finish_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        elif not due_date:
            # Default to 7 days from start if no due date
            finish_date = start_date + timedelta(days=7)
        
        # Calculate duration in hours
        duration = 8  # Default 8 hours
        if finish_date and start_date:
            duration_delta = finish_date - start_date
            duration = max(1, duration_delta.total_seconds() / 3600)  # Convert to hours, minimum 1 hour
        
        # Handle progress percentage
        progress = task.get("progress_percentage", 0)
        if task.get("status") == "completed":
            progress = 100
        elif task.get("status") == "in_progress":
            progress = max(progress, 25)  # At least 25% if in progress
        
        # Determine if critical
        critical = (task.get("priority") == "critical" or 
                   task.get("type") == "critical" or
                   task.get("critical", False))
        
        # Handle assignee IDs
        assignee_ids = []
        if task.get("assignee_id"):
            assignee_ids = [task["assignee_id"]]
        
        return {
            "id": task.get("id", str(uuid.uuid4())),
            "name": task.get("title", task.get("name", "Untitled Task")),
            "description": task.get("description", ""),
            "project_id": task.get("project_id"),
            "duration": duration,
            "start_date": start_date.isoformat() if isinstance(start_date, datetime) else start_date,
            "finish_date": finish_date.isoformat() if isinstance(finish_date, datetime) else finish_date,
            "percent_complete": min(100, max(0, progress)),  # Ensure 0-100 range
            "outline_level": 1,
            "summary_task": task.get("type") == "epic",
            "critical": critical,
            "assignee_ids": assignee_ids,
            "milestone": task.get("type") == "milestone",
            "color": get_task_color(task.get("priority", "medium"), task.get("status", "todo")),
            "created_at": task.get("created_at"),
            "updated_at": task.get("updated_at", datetime.utcnow())
        }
    except Exception as e:
        logger.error(f"Error converting task to timeline format: {e}")
        # Return a basic valid timeline task
        return {
            "id": task.get("id", str(uuid.uuid4())),
            "name": task.get("title", task.get("name", "Untitled Task")),
            "description": task.get("description", ""),
            "project_id": task.get("project_id"),
            "duration": 8,
            "start_date": datetime.utcnow().isoformat(),
            "finish_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "percent_complete": task.get("progress_percentage", 0),
            "outline_level": 1,
            "summary_task": False,
            "critical": False,
            "assignee_ids": [],
            "milestone": False,
            "color": "#3b82f6",
            "created_at": task.get("created_at"),
            "updated_at": task.get("updated_at", datetime.utcnow())
        }


def get_task_color(priority: str, status: str) -> str:
    """Get task color based on priority and status"""
    if status == 'completed':
        return '#10b981'  # Green
    if status == 'cancelled':
        return '#6b7280'  # Gray
    
    priority_colors = {
        'critical': '#ef4444',  # Red
        'high': '#f59e0b',     # Orange  
        'medium': '#3b82f6',   # Blue
        'low': '#8b5cf6'       # Purple
    }
    
    return priority_colors.get(priority, '#3b82f6')  # Default blue