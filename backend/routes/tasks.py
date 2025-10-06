from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import uuid
from bson import ObjectId

# Import database connection
from database import get_database

# Import authentication
from auth.middleware import get_current_active_user

# Import models
from models.task import (
    Task, TaskCreate, TaskUpdate, TaskInDB, TaskSummary, TaskActivity,
    TaskStatus, TaskPriority, TaskType, TaskTimeTracking, TaskDependency
)
from models.user import User

# Import services
from services.activity_service import activity_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

def create_task_summary(task: Dict) -> TaskSummary:
    """Helper function to create TaskSummary from task dict"""
    return TaskSummary(
        id=task["id"],
        title=task["title"],
        status=TaskStatus(task["status"]),
        priority=TaskPriority(task["priority"]),
        type=TaskType(task["type"]),
        project_id=task["project_id"],
        organization_id=task.get("organization_id"),
        assignee_id=task.get("assignee_id"),
        assignee_ids=task.get("assignee_ids", []),
        due_date=task.get("due_date"),
        start_date=task.get("start_date"),
        created_at=task.get("created_at"),
        updated_at=task.get("updated_at"),
        progress_percentage=task.get("progress_percentage", 0.0),
        time_tracking=TaskTimeTracking(**task.get("time_tracking", {})) if task.get("time_tracking") else None,
        subtask_count=task.get("subtask_count", 0)
    )

def ensure_time_tracking_consistency(time_tracking: Dict) -> Dict:
    """Ensure time tracking data consistency by recalculating actual_hours from logged_time"""
    if not time_tracking:
        return {
            "estimated_hours": None,
            "actual_hours": 0.0,
            "logged_time": []
        }
    
    logged_time = time_tracking.get("logged_time", [])
    actual_hours = sum(entry.get("hours", 0.0) for entry in logged_time)
    
    return {
        "estimated_hours": time_tracking.get("estimated_hours"),
        "actual_hours": actual_hours,
        "logged_time": logged_time
    }

@router.post("/", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new task"""
    try:
        db = await get_database()
        
        # Verify project exists and user has access
        project = await db.projects.find_one({"id": task_data.project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Verify user has access to this project's organization
        if project.get("organization_id") != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Project belongs to different organization"
            )
        
        # Verify assignees exist if provided
        assignee_ids = task_data.assignee_ids.copy() if task_data.assignee_ids else []
        
        # Handle backward compatibility - if assignee_id is provided, add to assignee_ids
        if task_data.assignee_id and task_data.assignee_id not in assignee_ids:
            assignee_ids.append(task_data.assignee_id)
        
        # Verify all assignees exist
        for assignee_id in assignee_ids:
            assignee = await db.users.find_one({"id": assignee_id})
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Assignee with ID {assignee_id} not found"
                )
        
        # Create task with ID and timestamps
        task_id = str(uuid.uuid4())
        current_time = datetime.utcnow()
        
        task_dict = task_data.dict()
        task_dict.update({
            "id": task_id,
            "reporter_id": current_user.id,
            "organization_id": current_user.organization_id,  # Set organization_id from current user
            "assignee_ids": assignee_ids,  # Ensure assignee_ids is properly set
            "created_at": current_time,
            "updated_at": current_time,
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [current_user.id]
        })
        
        # Insert task
        await db.tasks.insert_one(task_dict)
        
        # Log activity
        await log_task_activity(
            db, task_id, current_user.id, "task_created",
            {"title": task_data.title, "status": task_data.status.value if hasattr(task_data.status, 'value') else task_data.status}
        )
        
        # Get created task
        created_task = await db.tasks.find_one({"id": task_id})
        if not created_task:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create task"
            )
        
        # Clean up task data before validation
        cleaned_task = dict(created_task)
        
        # Fix dependencies format - convert strings to proper TaskDependency format
        if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
            fixed_dependencies = []
            for dep in cleaned_task["dependencies"]:
                if isinstance(dep, str):
                    fixed_dependencies.append({
                        "task_id": dep,
                        "dependency_type": "blocks"
                    })
                elif isinstance(dep, dict):
                    fixed_dependencies.append(dep)
            cleaned_task["dependencies"] = fixed_dependencies
        
        return Task(**cleaned_task)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )

@router.get("/")
async def get_tasks(
    project_id: Optional[str] = Query(None, description="Filter by project IDs (comma-separated for multiple)"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee ID"),
    task_status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    priority: Optional[TaskPriority] = Query(None, description="Filter by priority"),
    type: Optional[TaskType] = Query(None, description="Filter by type"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    full_details: bool = Query(False, description="Return full task details including dependencies and team members"),
    skip: int = Query(0, ge=0, description="Number of tasks to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of tasks to return"),
    current_user: User = Depends(get_current_active_user)
):
    """Get tasks with filtering and pagination"""
    try:
        db = await get_database()
        
        # Build filter query - filter by organization if tasks have organization_id
        filter_query = {
            "$or": [
                {"organization_id": current_user.organization_id},
                {"organization_id": {"$exists": False}},  # For backward compatibility with tasks without organization_id
                {"organization_id": None}  # For tasks with null organization_id
            ]
        }
        
        # Handle project IDs (both single and comma-separated multiple)
        if project_id:
            if ',' in project_id:
                project_ids = [pid.strip() for pid in project_id.split(',') if pid.strip()]
                if len(project_ids) > 1:
                    filter_query["project_id"] = {"$in": project_ids}
                elif len(project_ids) == 1:
                    filter_query["project_id"] = project_ids[0]
            else:
                filter_query["project_id"] = project_id
        
        if assignee_id:
            filter_query["assignee_id"] = assignee_id
        if task_status:
            filter_query["status"] = task_status.value
        if priority:
            filter_query["priority"] = priority.value
        if type:
            filter_query["type"] = type.value
            
        if search:
            filter_query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        # Get tasks with pagination
        cursor = db.tasks.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
        tasks = await cursor.to_list(length=limit)
        
        # Convert to TaskSummary format
        task_summaries = [create_task_summary(task) for task in tasks]
        
        return task_summaries
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tasks: {str(e)}"
        )

@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific task by ID"""
    try:
        db = await get_database()
        
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Clean up task data before validation
        cleaned_task = dict(task)
        
        # Fix dependencies format - convert strings to proper TaskDependency format
        if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
            fixed_dependencies = []
            for dep in cleaned_task["dependencies"]:
                if isinstance(dep, str):
                    fixed_dependencies.append({
                        "task_id": dep,
                        "dependency_type": "blocks"
                    })
                elif isinstance(dep, dict):
                    fixed_dependencies.append(dep)
            cleaned_task["dependencies"] = fixed_dependencies
        
        return Task(**cleaned_task)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task: {str(e)}"
        )

@router.get("/{task_id}/detailed", response_model=Dict[str, Any])
async def get_task_with_details(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific task by ID with enriched user details"""
    try:
        db = await get_database()
        
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Get assignee details
        assignees = []
        assignee_ids = task.get("assignee_ids", [])
        
        # Include single assignee_id for backward compatibility
        if task.get("assignee_id") and task.get("assignee_id") not in assignee_ids:
            assignee_ids.append(task.get("assignee_id"))
        
        for assignee_id in assignee_ids:
            assignee = await db.users.find_one({"id": assignee_id})
            if assignee:
                assignees.append({
                    "id": assignee["id"],
                    "first_name": assignee["first_name"],
                    "last_name": assignee["last_name"],
                    "email": assignee["email"],
                    "avatar_url": assignee.get("avatar_url")
                })
        
        # Get reporter details
        reporter = await db.users.find_one({"id": task["reporter_id"]})
        reporter_details = None
        if reporter:
            reporter_details = {
                "id": reporter["id"],
                "first_name": reporter["first_name"],
                "last_name": reporter["last_name"],
                "email": reporter["email"],
                "avatar_url": reporter.get("avatar_url")
            }
        
        # Get project details
        project = await db.projects.find_one({"id": task["project_id"]})
        project_details = None
        if project:
            project_details = {
                "id": project["id"],
                "name": project["name"],
                "description": project.get("description")
            }
        
        # Prepare detailed task response - safely handle task data
        try:
            # Clean up task data before validation
            cleaned_task = dict(task)
            
            # Fix dependencies format - convert strings to proper TaskDependency format
            if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
                fixed_dependencies = []
                for dep in cleaned_task["dependencies"]:
                    if isinstance(dep, str):
                        # Convert string ID to TaskDependency format
                        fixed_dependencies.append({
                            "task_id": dep,
                            "dependency_type": "blocks"
                        })
                    elif isinstance(dep, dict):
                        fixed_dependencies.append(dep)
                cleaned_task["dependencies"] = fixed_dependencies
            
            # Ensure time_tracking has proper structure
            if "time_tracking" in cleaned_task and cleaned_task["time_tracking"]:
                time_tracking = cleaned_task["time_tracking"]
                if not isinstance(time_tracking, dict):
                    cleaned_task["time_tracking"] = {
                        "estimated_hours": None,
                        "actual_hours": 0.0,
                        "logged_time": []
                    }
            
            # Try to create Task object to validate data
            task_obj = Task(**cleaned_task)
            task_with_details = task_obj.dict()
        except Exception as validation_error:
            # If validation still fails, use raw task data with safe defaults
            print(f"Task validation error for {task_id}: {validation_error}")
            task_with_details = dict(task)
            
            # Ensure required fields exist with safe defaults
            task_with_details.setdefault("progress_percentage", 0.0)
            task_with_details.setdefault("time_tracking", {
                "estimated_hours": None,
                "actual_hours": 0.0,
                "logged_time": []
            })
            task_with_details.setdefault("dependencies", [])
            task_with_details.setdefault("subtask_count", 0)
            task_with_details.setdefault("comment_count", 0)
            task_with_details.setdefault("attachment_count", 0)
        
        # Add enriched data
        task_with_details.update({
            "assignees": assignees,
            "reporter": reporter_details,
            "project": project_details
        })
        
        return task_with_details
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task details: {str(e)}"
        )

@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a task"""
    try:
        db = await get_database()
        
        # Get existing task
        existing_task = await db.tasks.find_one({"id": task_id})
        if not existing_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Prepare update data
        update_data = task_update.dict(exclude_unset=True)
        if update_data:
            # Validate assignees if provided
            if "assignee_ids" in update_data:
                for assignee_id in update_data["assignee_ids"]:
                    assignee = await db.users.find_one({"id": assignee_id})
                    if not assignee:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Assignee with ID {assignee_id} not found"
                        )
            
            # Handle backward compatibility for single assignee_id
            if "assignee_id" in update_data and "assignee_ids" not in update_data:
                if update_data["assignee_id"]:
                    # Verify single assignee exists
                    assignee = await db.users.find_one({"id": update_data["assignee_id"]})
                    if not assignee:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Assignee not found"
                        )
                    # Set assignee_ids for consistency
                    update_data["assignee_ids"] = [update_data["assignee_id"]]
                else:
                    update_data["assignee_ids"] = []
            
            update_data["updated_at"] = datetime.utcnow()
            
            # Log status changes
            if "status" in update_data and update_data["status"] != existing_task["status"]:
                await log_task_activity(
                    db, task_id, current_user.id, "status_changed",
                    {
                        "from": existing_task["status"],
                        "to": update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
                    }
                )
            
            # Log assignee changes
            if "assignee_ids" in update_data:
                old_assignees = set(existing_task.get("assignee_ids", []))
                new_assignees = set(update_data["assignee_ids"])
                if old_assignees != new_assignees:
                    await log_task_activity(
                        db, task_id, current_user.id, "assignees_changed",
                        {
                            "old_assignees": list(old_assignees),
                            "new_assignees": list(new_assignees)
                        }
                    )
            
            # Update task
            await db.tasks.update_one({"id": task_id}, {"$set": update_data})
        
        # Get updated task
        updated_task = await db.tasks.find_one({"id": task_id})
        
        # Clean up task data before validation
        cleaned_task = dict(updated_task)
        
        # Fix dependencies format - convert strings to proper TaskDependency format
        if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
            fixed_dependencies = []
            for dep in cleaned_task["dependencies"]:
                if isinstance(dep, str):
                    fixed_dependencies.append({
                        "task_id": dep,
                        "dependency_type": "blocks"
                    })
                elif isinstance(dep, dict):
                    fixed_dependencies.append(dep)
            cleaned_task["dependencies"] = fixed_dependencies
        
        return Task(**cleaned_task)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update task: {str(e)}"
        )

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a task"""
    try:
        db = await get_database()
        
        # Check if task exists
        existing_task = await db.tasks.find_one({"id": task_id})
        if not existing_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Delete task
        result = await db.tasks.delete_one({"id": task_id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete task"
            )
        
        # Log activity
        await log_task_activity(
            db, task_id, current_user.id, "task_deleted",
            {"title": existing_task["title"]}
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}"
        )

# Kanban Board Endpoints

@router.get("/kanban/board", response_model=Dict[str, List[TaskSummary]])
async def get_kanban_board(
    project_id: Optional[str] = Query(None, description="Filter by project IDs (comma-separated for multiple)"),
    view_by: str = Query("status", description="Group by: status, assignee, project"),
    current_user: User = Depends(get_current_active_user)
):
    """Get tasks organized for Kanban board view"""
    try:
        db = await get_database()
        
        # Build filter query - always filter by organization
        filter_query = {"organization_id": current_user.organization_id}
        
        # Handle project IDs (both single and comma-separated multiple)
        if project_id:
            if ',' in project_id:
                project_ids = [pid.strip() for pid in project_id.split(',') if pid.strip()]
                if len(project_ids) > 1:
                    filter_query["project_id"] = {"$in": project_ids}
                elif len(project_ids) == 1:
                    filter_query["project_id"] = project_ids[0]
            else:
                filter_query["project_id"] = project_id
        
        # Get all tasks
        tasks = await db.tasks.find(filter_query).to_list(length=None)
        
        # Organize tasks by view type
        board_data = {}
        
        if view_by == "status":
            # Group by status
            for status_value in TaskStatus:
                board_data[status_value.value] = []
            
            for task in tasks:
                task_status = task.get("status", "todo")
                if task_status not in board_data:
                    board_data[task_status] = []
                
                board_data[task_status].append(TaskSummary(
                    id=task["id"],
                    title=task["title"],
                    status=TaskStatus(task["status"]),
                    priority=TaskPriority(task["priority"]),
                    type=TaskType(task["type"]),
                    project_id=task["project_id"],
                    assignee_id=task.get("assignee_id"),
                    assignee_ids=task.get("assignee_ids", []),
                    due_date=task.get("due_date"),
                    progress_percentage=task.get("progress_percentage", 0.0),
                    subtask_count=task.get("subtask_count", 0)
                ))
        
        elif view_by == "assignee":
            # Group by assignee
            board_data["unassigned"] = []
            
            for task in tasks:
                assignee = task.get("assignee_id", "unassigned")
                if assignee not in board_data:
                    board_data[assignee] = []
                
                board_data[assignee].append(TaskSummary(
                    id=task["id"],
                    title=task["title"],
                    status=TaskStatus(task["status"]),
                    priority=TaskPriority(task["priority"]),
                    type=TaskType(task["type"]),
                    project_id=task["project_id"],
                    assignee_id=task.get("assignee_id"),
                    assignee_ids=task.get("assignee_ids", []),
                    due_date=task.get("due_date"),
                    progress_percentage=task.get("progress_percentage", 0.0),
                    subtask_count=task.get("subtask_count", 0)
                ))
        
        elif view_by == "project":
            # Group by project
            for task in tasks:
                project = task.get("project_id", "unknown")
                if project not in board_data:
                    board_data[project] = []
                
                board_data[project].append(TaskSummary(
                    id=task["id"],
                    title=task["title"],
                    status=TaskStatus(task["status"]),
                    priority=TaskPriority(task["priority"]),
                    type=TaskType(task["type"]),
                    project_id=task["project_id"],
                    assignee_id=task.get("assignee_id"),
                    assignee_ids=task.get("assignee_ids", []),
                    due_date=task.get("due_date"),
                    progress_percentage=task.get("progress_percentage", 0.0),
                    subtask_count=task.get("subtask_count", 0)
                ))
        
        return board_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Kanban board: {str(e)}"
        )

@router.put("/kanban/move", response_model=Task)
async def move_task_on_board(
    task_id: str,
    new_status: TaskStatus,
    new_assignee_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Move task on Kanban board (update status and/or assignee)"""
    try:
        db = await get_database()
        
        # Get existing task
        existing_task = await db.tasks.find_one({"id": task_id})
        if not existing_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Prepare update
        update_data = {
            "status": new_status.value,
            "updated_at": datetime.utcnow()
        }
        
        if new_assignee_id is not None:
            update_data["assignee_id"] = new_assignee_id
        
        # Update task
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
        
        # Log activity
        await log_task_activity(
            db, task_id, current_user.id, "task_moved",
            {
                "from_status": existing_task["status"],
                "to_status": new_status.value,
                "assignee_changed": new_assignee_id != existing_task.get("assignee_id")
            }
        )
        
        # Get updated task
        updated_task = await db.tasks.find_one({"id": task_id})
        
        # Clean up task data before validation
        cleaned_task = dict(updated_task)
        
        # Fix dependencies format - convert strings to proper TaskDependency format
        if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
            fixed_dependencies = []
            for dep in cleaned_task["dependencies"]:
                if isinstance(dep, str):
                    fixed_dependencies.append({
                        "task_id": dep,
                        "dependency_type": "blocks"
                    })
                elif isinstance(dep, dict):
                    fixed_dependencies.append(dep)
            cleaned_task["dependencies"] = fixed_dependencies
        
        return Task(**cleaned_task)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to move task: {str(e)}"
        )

# Time Tracking Endpoints

@router.post("/{task_id}/time/log", response_model=Task)
async def log_time_entry(
    task_id: str,
    hours: float = Query(..., gt=0, description="Hours to log"),
    description: Optional[str] = Query(None, description="Time entry description"),
    date: Optional[date] = Query(None, description="Date for time entry (defaults to today)"),
    current_user: User = Depends(get_current_active_user)
):
    """Log time entry for a task (manual entry)"""
    try:
        db = await get_database()
        
        # Get existing task
        existing_task = await db.tasks.find_one({"id": task_id})
        if not existing_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Prepare time entry
        entry_date = date or datetime.utcnow().date()
        time_entry = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "hours": hours,
            "description": description or f"Time logged by {current_user.first_name} {current_user.last_name}",
            "date": entry_date.isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Update task time tracking
        current_time_tracking = existing_task.get("time_tracking", {})
        current_logged_time = current_time_tracking.get("logged_time", [])
        
        # Add new entry to logged_time array
        new_logged_time = current_logged_time + [time_entry]
        
        # Recalculate actual_hours from all logged_time entries to ensure consistency
        new_actual_hours = sum(entry.get("hours", 0.0) for entry in new_logged_time)
        
        new_time_tracking = {
            "estimated_hours": current_time_tracking.get("estimated_hours"),
            "actual_hours": new_actual_hours,
            "logged_time": new_logged_time
        }
        
        # Update task
        await db.tasks.update_one(
            {"id": task_id},
            {
                "$set": {
                    "time_tracking": new_time_tracking,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Log activity
        await log_task_activity(
            db, task_id, current_user.id, "time_logged",
            {"hours": hours, "description": description}
        )
        
        # Get updated task
        updated_task = await db.tasks.find_one({"id": task_id})
        
        # Clean up task data before validation
        cleaned_task = dict(updated_task)
        
        # Fix dependencies format - convert strings to proper TaskDependency format
        if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
            fixed_dependencies = []
            for dep in cleaned_task["dependencies"]:
                if isinstance(dep, str):
                    fixed_dependencies.append({
                        "task_id": dep,
                        "dependency_type": "blocks"
                    })
                elif isinstance(dep, dict):
                    fixed_dependencies.append(dep)
            cleaned_task["dependencies"] = fixed_dependencies
        
        return Task(**cleaned_task)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log time: {str(e)}"
        )

@router.get("/{task_id}/activity", response_model=List[TaskActivity])
async def get_task_activity(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get task activity history"""
    try:
        db = await get_database()
        
        # Get task
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Get activity log
        activity_log = task.get("activity_log", [])
        
        # Convert to TaskActivity objects
        activities = []
        for activity in activity_log:
            activities.append(TaskActivity(
                id=activity["id"],
                task_id=activity["task_id"],
                user_id=activity["user_id"],
                action=activity["action"],
                details=activity.get("details", {}),
                timestamp=datetime.fromisoformat(activity["timestamp"])
            ))
        
        return activities
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task activity: {str(e)}"
        )

# Bulk Operations

@router.post("/bulk/update", response_model=Dict[str, Any])
async def bulk_update_tasks(
    task_ids: List[str],
    update_data: TaskUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Bulk update multiple tasks"""
    try:
        db = await get_database()
        
        # Prepare update
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            # Update tasks
            result = await db.tasks.update_many(
                {"id": {"$in": task_ids}},
                {"$set": update_dict}
            )
            
            # Log bulk activity
            for task_id in task_ids:
                await log_task_activity(
                    db, task_id, current_user.id, "bulk_updated",
                    {"fields_updated": list(update_dict.keys())}
                )
            
            return {
                "updated_count": result.modified_count,
                "task_ids": task_ids,
                "message": f"Successfully updated {result.modified_count} tasks"
            }
        
        return {"updated_count": 0, "message": "No update data provided"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk update tasks: {str(e)}"
        )

@router.delete("/bulk/delete", status_code=status.HTTP_200_OK)
async def bulk_delete_tasks(
    task_ids: List[str],
    current_user: User = Depends(get_current_active_user)
):
    """Bulk delete multiple tasks"""
    try:
        db = await get_database()
        
        # Delete tasks
        result = await db.tasks.delete_many({"id": {"$in": task_ids}})
        
        return {
            "deleted_count": result.deleted_count,
            "task_ids": task_ids,
            "message": f"Successfully deleted {result.deleted_count} tasks"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk delete tasks: {str(e)}"
        )

# Analytics Endpoints

@router.get("/analytics/summary", response_model=Dict[str, Any])
async def get_task_analytics(
    project_id: Optional[str] = Query(None, description="Filter by project IDs (comma-separated for multiple)"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee ID"),
    current_user: User = Depends(get_current_active_user)
):
    """Get task analytics and metrics"""
    try:
        db = await get_database()
        
        # Build filter query - always filter by organization
        filter_query = {"organization_id": current_user.organization_id}
        
        # Handle project IDs (both single and comma-separated multiple)
        if project_id:
            if ',' in project_id:
                project_ids = [pid.strip() for pid in project_id.split(',') if pid.strip()]
                if len(project_ids) > 1:
                    filter_query["project_id"] = {"$in": project_ids}
                elif len(project_ids) == 1:
                    filter_query["project_id"] = project_ids[0]
            else:
                filter_query["project_id"] = project_id
        
        if assignee_id:
            filter_query["assignee_id"] = assignee_id
        
        # Get all tasks
        tasks = await db.tasks.find(filter_query).to_list(length=None)
        
        # Calculate analytics
        total_tasks = len(tasks)
        status_counts = {}
        priority_counts = {}
        type_counts = {}
        
        total_estimated_hours = 0.0
        total_actual_hours = 0.0
        completed_tasks = 0
        overdue_tasks = 0
        
        for task in tasks:
            # Status counts
            task_status = task.get("status", "todo")
            status_counts[task_status] = status_counts.get(task_status, 0) + 1
            
            # Priority counts
            priority = task.get("priority", "medium")
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
            
            # Type counts
            task_type = task.get("type", "task")
            type_counts[task_type] = type_counts.get(task_type, 0) + 1
            
            # Time tracking
            time_tracking = task.get("time_tracking", {})
            if time_tracking.get("estimated_hours"):
                total_estimated_hours += time_tracking["estimated_hours"]
            if time_tracking.get("actual_hours"):
                total_actual_hours += time_tracking["actual_hours"]
            
            # Completion and overdue
            if task.get("status") == "completed":
                completed_tasks += 1
            
            if task.get("due_date"):
                try:
                    due_date_str = task["due_date"]
                    if isinstance(due_date_str, str):
                        due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                        if due_date < datetime.utcnow() and task.get("status") not in ["completed", "cancelled"]:
                            overdue_tasks += 1
                except Exception as e:
                    # Skip this task's due date processing if there's an error
                    print(f"Error processing due_date for task {task.get('id', 'unknown')}: {e}")
                    continue
        
        # Calculate rates
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        time_variance = total_actual_hours - total_estimated_hours
        
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "overdue_tasks": overdue_tasks,
            "completion_rate": round(completion_rate, 2),
            "status_distribution": status_counts,
            "priority_distribution": priority_counts,
            "type_distribution": type_counts,
            "time_tracking": {
                "total_estimated_hours": round(total_estimated_hours, 2),
                "total_actual_hours": round(total_actual_hours, 2),
                "time_variance": round(time_variance, 2)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task analytics: {str(e)}"
        )

# Helper function for activity logging
async def log_task_activity(db, task_id: str, user_id: str, action: str, details: Dict):
    """Helper function to log task activity"""
    activity_entry = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "user_id": user_id,
        "action": action,
        "details": details,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$push": {"activity_log": activity_entry}}
    )

# Task Dependencies Endpoints

@router.post("/{task_id}/dependencies", response_model=Task)
async def add_task_dependency(
    task_id: str,
    dependency_task_id: str = Query(..., description="Task ID this task depends on"),
    dependency_type: str = Query(default="blocks", description="Type of dependency"),
    current_user: User = Depends(get_current_active_user)
):
    """Add a dependency to a task"""
    try:
        db = await get_database()
        
        # Check if both tasks exist
        task = await db.tasks.find_one({"id": task_id})
        dependency_task = await db.tasks.find_one({"id": dependency_task_id})
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        if not dependency_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dependency task not found"
            )
        
        # Prevent self-dependency
        if task_id == dependency_task_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task cannot depend on itself"
            )
        
        # Check if dependency already exists
        existing_dependencies = task.get("dependencies", [])
        if any(dep["task_id"] == dependency_task_id for dep in existing_dependencies):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dependency already exists"
            )
        
        # Add dependency
        new_dependency = {
            "task_id": dependency_task_id,
            "dependency_type": dependency_type
        }
        
        await db.tasks.update_one(
            {"id": task_id},
            {
                "$push": {"dependencies": new_dependency},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Log activity
        await log_task_activity(
            db, task_id, current_user.id, "dependency_added",
            {"dependency_task_id": dependency_task_id, "type": dependency_type}
        )
        
        # Get updated task
        updated_task = await db.tasks.find_one({"id": task_id})
        
        # Clean up task data before validation
        cleaned_task = dict(updated_task)
        
        # Fix dependencies format - convert strings to proper TaskDependency format
        if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
            fixed_dependencies = []
            for dep in cleaned_task["dependencies"]:
                if isinstance(dep, str):
                    fixed_dependencies.append({
                        "task_id": dep,
                        "dependency_type": "blocks"
                    })
                elif isinstance(dep, dict):
                    fixed_dependencies.append(dep)
            cleaned_task["dependencies"] = fixed_dependencies
        
        return Task(**cleaned_task)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add dependency: {str(e)}"
        )

@router.delete("/{task_id}/dependencies/{dependency_task_id}", response_model=Task)
async def remove_task_dependency(
    task_id: str,
    dependency_task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a dependency from a task"""
    try:
        db = await get_database()
        
        # Check if task exists
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Remove dependency
        await db.tasks.update_one(
            {"id": task_id},
            {
                "$pull": {"dependencies": {"task_id": dependency_task_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Log activity
        await log_task_activity(
            db, task_id, current_user.id, "dependency_removed",
            {"dependency_task_id": dependency_task_id}
        )
        
        # Get updated task
        updated_task = await db.tasks.find_one({"id": task_id})
        
        # Clean up task data before validation
        cleaned_task = dict(updated_task)
        
        # Fix dependencies format - convert strings to proper TaskDependency format
        if "dependencies" in cleaned_task and cleaned_task["dependencies"]:
            fixed_dependencies = []
            for dep in cleaned_task["dependencies"]:
                if isinstance(dep, str):
                    fixed_dependencies.append({
                        "task_id": dep,
                        "dependency_type": "blocks"
                    })
                elif isinstance(dep, dict):
                    fixed_dependencies.append(dep)
            cleaned_task["dependencies"] = fixed_dependencies
        
        return Task(**cleaned_task)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove dependency: {str(e)}"
        )

@router.get("/{task_id}/dependents", response_model=List[TaskSummary])
async def get_task_dependents(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get tasks that depend on this task"""
    try:
        db = await get_database()
        
        # Check if task exists
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Find tasks that have this task as a dependency
        dependent_tasks = await db.tasks.find({
            "dependencies.task_id": task_id
        }).to_list(length=None)
        
        # Convert to TaskSummary format
        task_summaries = []
        for dep_task in dependent_tasks:
            task_summaries.append(TaskSummary(
                id=dep_task["id"],
                title=dep_task["title"],
                status=TaskStatus(dep_task["status"]),
                priority=TaskPriority(dep_task["priority"]),
                type=TaskType(dep_task["type"]),
                project_id=dep_task["project_id"],
                assignee_id=dep_task.get("assignee_id"),
                assignee_ids=dep_task.get("assignee_ids", []),
                due_date=dep_task.get("due_date"),
                progress_percentage=dep_task.get("progress_percentage", 0.0),
                subtask_count=dep_task.get("subtask_count", 0)
            ))
        
        return task_summaries
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task dependents: {str(e)}"
        )

@router.get("/dependencies/graph", response_model=Dict[str, Any])
async def get_dependency_graph(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    current_user: User = Depends(get_current_active_user)
):
    """Get task dependency graph for visualization"""
    try:
        db = await get_database()
        
        # Build filter query
        filter_query = {"organization_id": current_user.organization_id}
        if project_id:
            filter_query["project_id"] = project_id
        
        # Get all tasks with dependencies
        tasks = await db.tasks.find(filter_query).to_list(length=None)
        
        # Build dependency graph
        nodes = []
        edges = []
        
        for task in tasks:
            # Add task as node
            nodes.append({
                "id": task["id"],
                "title": task["title"],
                "status": task["status"],
                "priority": task["priority"],
                "progress_percentage": task.get("progress_percentage", 0),
                "assignee_id": task.get("assignee_id"),
                "due_date": task.get("due_date")
            })
            
            # Add dependencies as edges
            dependencies = task.get("dependencies", [])
            for dep in dependencies:
                edges.append({
                    "source": dep["task_id"],
                    "target": task["id"],
                    "type": dep["dependency_type"]
                })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "metadata": {
                "total_tasks": len(nodes),
                "total_dependencies": len(edges),
                "project_id": project_id
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dependency graph: {str(e)}"
        )