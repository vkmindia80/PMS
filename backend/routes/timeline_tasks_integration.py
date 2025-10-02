from fastapi import APIRouter, HTTPException, Depends, status, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import logging

from database import get_database
from auth.utils import verify_token
from auth.middleware import get_current_user, get_current_active_user
from models import User
from pydantic import BaseModel

router = APIRouter(prefix="/api/timeline-tasks", tags=["Timeline Tasks Integration"])
security = HTTPBearer()
logger = logging.getLogger(__name__)

class TaskToTimelineRequest(BaseModel):
    project_id: str
    include_completed: bool = True

class TimelineTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    finish_date: Optional[str] = None
    duration: Optional[float] = None
    percent_complete: Optional[float] = None
    assignee_ids: Optional[List[str]] = None

class DragUpdateRequest(BaseModel):
    task_id: str
    new_start_date: str
    new_duration: Optional[float] = None
    cascade_dependencies: bool = True

@router.get("/project/{project_id}/timeline")
async def get_project_tasks_as_timeline(
    project_id: str,
    include_completed: bool = Query(True, description="Include completed tasks"),
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Convert regular project tasks to timeline format"""
    try:
        # Build query for regular tasks
        task_query = {
            "project_id": project_id,
            "organization_id": current_user.organization_id
        }
        
        if not include_completed:
            task_query["status"] = {"$ne": "completed"}
        
        # Get tasks from regular tasks collection
        tasks_cursor = db.tasks.find(task_query)
        tasks = await tasks_cursor.to_list(length=None)
        
        # Convert to timeline format
        timeline_tasks = []
        for task in tasks:
            timeline_task = convert_task_to_timeline(task)
            timeline_tasks.append(timeline_task)
        
        # Get existing timeline tasks for this project (if any)
        existing_timeline_cursor = db.timeline_tasks.find({"project_id": project_id})
        existing_timeline = await existing_timeline_cursor.to_list(length=None)
        
        # Merge with existing timeline data if available
        timeline_map = {task["id"]: task for task in existing_timeline}
        
        for i, task in enumerate(timeline_tasks):
            if task["id"] in timeline_map:
                # Preserve timeline-specific data
                existing = timeline_map[task["id"]]
                task.update({
                    "start_date": existing.get("start_date", task["start_date"]),
                    "finish_date": existing.get("finish_date", task["finish_date"]),
                    "duration": existing.get("duration", task["duration"]),
                    "outline_level": existing.get("outline_level", task["outline_level"]),
                    "critical": existing.get("critical", task["critical"])
                })
        
        # Get dependencies
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for task in timeline_tasks:
            if "_id" in task:
                task.pop("_id")
        
        for dep in dependencies:
            if "_id" in dep:
                dep.pop("_id")
        
        return {
            "project_id": project_id,
            "tasks": timeline_tasks,
            "dependencies": dependencies,
            "conflicts": [],
            "critical_path": [],
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting project tasks as timeline: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/task/{task_id}/drag-update")
async def update_task_from_drag(
    task_id: str,
    drag_update: DragUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update task dates from drag-and-drop operation"""
    try:
        # Get the original task
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Calculate new dates
        new_start = datetime.fromisoformat(drag_update.new_start_date.replace('Z', '+00:00'))
        
        # Calculate new finish date based on duration or existing duration
        if drag_update.new_duration:
            duration_hours = drag_update.new_duration
        else:
            # Calculate existing duration from task
            if task.get("due_date"):
                existing_due = datetime.fromisoformat(task["due_date"].replace('Z', '+00:00'))
                existing_created = datetime.fromisoformat(task["created_at"].replace('Z', '+00:00'))
                duration_hours = (existing_due - existing_created).total_seconds() / 3600
            else:
                duration_hours = task.get("time_tracking", {}).get("estimated_hours", 8)
        
        new_finish = new_start + timedelta(hours=duration_hours)
        
        # Update the regular task
        task_updates = {
            "due_date": new_finish.isoformat(),
            "updated_at": datetime.utcnow()
        }
        
        # Update time tracking if duration changed
        if drag_update.new_duration:
            current_time_tracking = task.get("time_tracking", {})
            current_time_tracking["estimated_hours"] = drag_update.new_duration
            task_updates["time_tracking"] = current_time_tracking
        
        # Update task in database
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": task_updates}
        )
        
        # Update or create timeline task entry
        timeline_task_data = {
            "id": task_id,
            "project_id": task["project_id"],
            "start_date": new_start.isoformat(),
            "finish_date": new_finish.isoformat(),
            "duration": duration_hours,
            "updated_at": datetime.utcnow()
        }
        
        await db.timeline_tasks.update_one(
            {"id": task_id},
            {"$set": timeline_task_data},
            upsert=True
        )
        
        # Handle cascade dependencies if requested
        if drag_update.cascade_dependencies:
            background_tasks.add_task(
                cascade_dependency_updates,
                task_id,
                new_finish,
                db
            )
        
        # Get updated task
        updated_task = await db.tasks.find_one({"id": task_id})
        timeline_task = convert_task_to_timeline(updated_task)
        
        # Update timeline-specific fields
        timeline_task.update({
            "start_date": new_start.isoformat(),
            "finish_date": new_finish.isoformat(),
            "duration": duration_hours
        })
        
        return {
            "task": timeline_task,
            "cascaded_updates": drag_update.cascade_dependencies,
            "message": "Task updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task from drag: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/task/{task_id}/timeline-sync")
async def sync_task_to_timeline(
    task_id: str,
    timeline_update: TimelineTaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Sync timeline changes back to regular task"""
    try:
        # Get original task
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Build update for regular task
        task_updates = {"updated_at": datetime.utcnow()}
        
        if timeline_update.name:
            task_updates["title"] = timeline_update.name
        
        if timeline_update.description:
            task_updates["description"] = timeline_update.description
        
        if timeline_update.finish_date:
            task_updates["due_date"] = timeline_update.finish_date
        
        if timeline_update.percent_complete is not None:
            task_updates["progress_percentage"] = timeline_update.percent_complete
            
            # Update status based on progress
            if timeline_update.percent_complete == 100:
                task_updates["status"] = "completed"
            elif timeline_update.percent_complete > 0:
                task_updates["status"] = "in_progress"
        
        if timeline_update.assignee_ids:
            task_updates["assignee_id"] = timeline_update.assignee_ids[0] if timeline_update.assignee_ids else None
        
        # Update time tracking if duration changed
        if timeline_update.duration:
            current_time_tracking = task.get("time_tracking", {})
            current_time_tracking["estimated_hours"] = timeline_update.duration
            task_updates["time_tracking"] = current_time_tracking
        
        # Update task
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": task_updates}
        )
        
        # Update timeline entry
        timeline_updates = {
            "updated_at": datetime.utcnow()
        }
        
        if timeline_update.start_date:
            timeline_updates["start_date"] = timeline_update.start_date
        
        if timeline_update.finish_date:
            timeline_updates["finish_date"] = timeline_update.finish_date
        
        if timeline_update.duration:
            timeline_updates["duration"] = timeline_update.duration
        
        await db.timeline_tasks.update_one(
            {"id": task_id},
            {"$set": timeline_updates},
            upsert=True
        )
        
        # Get updated task
        updated_task = await db.tasks.find_one({"id": task_id})
        return convert_task_to_timeline(updated_task)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing task to timeline: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Helper functions

def convert_task_to_timeline(task: Dict) -> Dict:
    """Convert regular task to timeline task format"""
    
    # Calculate timeline dates
    if isinstance(task["created_at"], str):
        created_date = datetime.fromisoformat(task["created_at"].replace('Z', '+00:00'))
    else:
        created_date = task["created_at"]  # Already a datetime object
    
    # Use due date if available, otherwise default to 1 week from creation
    if task.get("due_date"):
        if isinstance(task["due_date"], str):
            due_date = datetime.fromisoformat(task["due_date"].replace('Z', '+00:00'))
        else:
            due_date = task["due_date"]  # Already a datetime object
    else:
        due_date = created_date + timedelta(days=7)
    
    # Get estimated hours from time tracking
    time_tracking = task.get("time_tracking", {})
    estimated_hours = time_tracking.get("estimated_hours", 8)  # Default 8 hours
    
    # Calculate start date (could be creation date or custom start)
    start_date = created_date
    
    # Task color based on priority and status
    color = get_task_color(task.get("priority", "medium"), task.get("status", "todo"))
    
    return {
        "id": task["id"],
        "name": task["title"],
        "description": task.get("description", ""),
        "project_id": task["project_id"],
        "duration": estimated_hours,
        "start_date": start_date.isoformat(),
        "finish_date": due_date.isoformat(),
        "percent_complete": task.get("progress_percentage", 0),
        "outline_level": 1,
        "summary_task": task.get("type") == "epic",
        "critical": task.get("priority") == "critical",
        "assignee_ids": [task["assignee_id"]] if task.get("assignee_id") else [],
        "milestone": task.get("type") == "milestone",
        "color": color,
        "created_at": task["created_at"],
        "updated_at": task["updated_at"]
    }


def get_task_color(priority: str, status: str) -> str:
    """Get color based on task priority and status"""
    if status == "completed":
        return "#10b981"  # Green
    if status == "cancelled":
        return "#6b7280"  # Gray
    
    priority_colors = {
        "critical": "#ef4444",  # Red
        "high": "#f59e0b",      # Orange
        "medium": "#3b82f6",    # Blue
        "low": "#8b5cf6"        # Purple
    }
    
    return priority_colors.get(priority, "#3b82f6")


async def cascade_dependency_updates(task_id: str, new_finish_date: datetime, db):
    """Update dependent tasks when a task's dates change"""
    try:
        # Find tasks that depend on this task
        dependencies = await db.task_dependencies.find({
            "predecessor_id": task_id
        }).to_list(length=None)
        
        for dep in dependencies:
            successor_id = dep["successor_id"]
            
            # Get successor task
            successor = await db.tasks.find_one({"id": successor_id})
            if not successor:
                continue
            
            # Calculate new start date for successor (finish + lag)
            lag_hours = dep.get("lag_duration", 0)
            new_successor_start = new_finish_date + timedelta(hours=lag_hours)
            
            # Calculate new finish date based on duration
            time_tracking = successor.get("time_tracking", {})
            duration = time_tracking.get("estimated_hours", 8)
            new_successor_finish = new_successor_start + timedelta(hours=duration)
            
            # Update successor task
            await db.tasks.update_one(
                {"id": successor_id},
                {"$set": {
                    "due_date": new_successor_finish.isoformat(),
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Update timeline entry
            await db.timeline_tasks.update_one(
                {"id": successor_id},
                {"$set": {
                    "start_date": new_successor_start.isoformat(),
                    "finish_date": new_successor_finish.isoformat(),
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            
            # Recursively update dependent tasks
            await cascade_dependency_updates(successor_id, new_successor_finish, db)
            
    except Exception as e:
        logger.error(f"Error in cascade dependency updates: {e}")
        # Don't raise exception to avoid breaking the main update