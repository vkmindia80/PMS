from fastapi import APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import logging

from database import get_database
from auth.utils import verify_token
from auth.middleware import get_current_user
from models import (
    User,
    TaskDependency, TaskDependencyCreate, TaskDependencyUpdate, TaskDependencyInDB,
    TimelineTask, TimelineTaskCreate, TimelineTaskUpdate, TimelineTaskInDB,
    TimelineProject, TimelineProjectCreate, TimelineProjectUpdate, TimelineProjectInDB,
    TimelineCalendar, TimelineCalendarCreate, TimelineCalendarUpdate, TimelineCalendarInDB,
    TimelineBaseline, TimelineBaselineCreate, TimelineBaselineUpdate, TimelineBaselineInDB,
    GanttChartData, TimelineStats, TimelineViewMode, DependencyType
)

router = APIRouter(prefix="/api/timeline", tags=["Timeline Management"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


# WebSocket connection manager for real-time timeline updates
class TimelineConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logger.info(f"WebSocket connected for project {project_id}")

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
        logger.info(f"WebSocket disconnected for project {project_id}")

    async def broadcast_to_project(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending WebSocket message: {e}")


timeline_manager = TimelineConnectionManager()


# Timeline Project Configuration Endpoints
@router.post("/project", response_model=TimelineProjectInDB)
async def create_timeline_project(
    timeline_project: TimelineProjectCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create timeline configuration for a project"""
    try:
        # Check if project exists
        project = await db.projects.find_one({"id": timeline_project.project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if timeline config already exists
        existing_config = await db.timeline_projects.find_one({"project_id": timeline_project.project_id})
        if existing_config:
            raise HTTPException(status_code=400, detail="Timeline configuration already exists for this project")
        
        # Create timeline project configuration
        timeline_project_data = TimelineProject(
            **timeline_project.dict(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.timeline_projects.insert_one(timeline_project_data.dict())
        created_config = await db.timeline_projects.find_one({"_id": result.inserted_id})
        
        logger.info(f"Timeline project configuration created for project {timeline_project.project_id}")
        return TimelineProjectInDB(**created_config)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating timeline project configuration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/project/{project_id}", response_model=TimelineProjectInDB)
async def get_timeline_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get timeline configuration for a project"""
    try:
        timeline_config = await db.timeline_projects.find_one({"project_id": project_id})
        if not timeline_config:
            raise HTTPException(status_code=404, detail="Timeline configuration not found")
        
        return TimelineProjectInDB(**timeline_config)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving timeline project configuration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/project/{project_id}", response_model=TimelineProjectInDB)
async def update_timeline_project(
    project_id: str,
    timeline_update: TimelineProjectUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update timeline configuration for a project"""
    try:
        timeline_config = await db.timeline_projects.find_one({"project_id": project_id})
        if not timeline_config:
            raise HTTPException(status_code=404, detail="Timeline configuration not found")
        
        update_data = {k: v for k, v in timeline_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        await db.timeline_projects.update_one(
            {"project_id": project_id},
            {"$set": update_data}
        )
        
        updated_config = await db.timeline_projects.find_one({"project_id": project_id})
        
        # Broadcast update to connected clients
        await timeline_manager.broadcast_to_project(project_id, {
            "type": "timeline_config_updated",
            "data": TimelineProjectInDB(**updated_config).dict()
        })
        
        logger.info(f"Timeline project configuration updated for project {project_id}")
        return TimelineProjectInDB(**updated_config)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating timeline project configuration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Timeline Tasks Endpoints
@router.get("/tasks/{project_id}", response_model=List[TimelineTaskInDB])
async def get_timeline_tasks(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all timeline tasks for a project"""
    try:
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        # Clean MongoDB _id fields
        for task in tasks:
            if "_id" in task:
                task.pop("_id")
        
        return [TimelineTaskInDB(**task) for task in tasks]
        
    except Exception as e:
        logger.error(f"Error retrieving timeline tasks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/tasks", response_model=TimelineTaskInDB)
async def create_timeline_task(
    timeline_task: TimelineTaskCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new timeline task"""
    try:
        # Calculate finish date based on start date and duration
        start_date = timeline_task.start_date
        duration_hours = timeline_task.duration
        
        # Simple calculation - in reality would use calendar and working hours
        finish_date = start_date + timedelta(hours=duration_hours)
        
        timeline_task_data = TimelineTask(
            **timeline_task.dict(),
            finish_date=finish_date,
            work=duration_hours,  # Initial work equals duration
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.timeline_tasks.insert_one(timeline_task_data.dict())
        created_task = await db.timeline_tasks.find_one({"_id": result.inserted_id})
        
        # Broadcast creation to connected clients
        task_response = TimelineTaskInDB(**created_task)
        await timeline_manager.broadcast_to_project(timeline_task.project_id, {
            "type": "task_created",
            "data": task_response.dict()
        })
        
        logger.info(f"Timeline task created: {created_task['id']}")
        return task_response
        
    except Exception as e:
        logger.error(f"Error creating timeline task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/tasks/{task_id}", response_model=TimelineTaskInDB)
async def update_timeline_task(
    task_id: str,
    task_update: TimelineTaskUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update a timeline task"""
    try:
        task = await db.timeline_tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Timeline task not found")
        
        update_data = {k: v for k, v in task_update.dict().items() if v is not None}
        
        # Recalculate finish date if start date or duration changed
        if "start_date" in update_data or "duration" in update_data:
            start_date = update_data.get("start_date", task["start_date"])
            duration = update_data.get("duration", task["duration"])
            update_data["finish_date"] = start_date + timedelta(hours=duration)
        
        update_data["updated_at"] = datetime.utcnow()
        
        await db.timeline_tasks.update_one(
            {"id": task_id},
            {"$set": update_data}
        )
        
        updated_task = await db.timeline_tasks.find_one({"id": task_id})
        task_response = TimelineTaskInDB(**updated_task)
        
        # Broadcast update to connected clients
        await timeline_manager.broadcast_to_project(task["project_id"], {
            "type": "task_updated",
            "data": task_response.dict()
        })
        
        logger.info(f"Timeline task updated: {task_id}")
        return task_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating timeline task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/tasks/{task_id}")
async def delete_timeline_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a timeline task"""
    try:
        task = await db.timeline_tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Timeline task not found")
        
        # Delete associated dependencies
        await db.task_dependencies.delete_many({
            "$or": [
                {"predecessor_id": task_id},
                {"successor_id": task_id}
            ]
        })
        
        # Delete the task
        await db.timeline_tasks.delete_one({"id": task_id})
        
        # Broadcast deletion to connected clients
        await timeline_manager.broadcast_to_project(task["project_id"], {
            "type": "task_deleted",
            "data": {"task_id": task_id}
        })
        
        logger.info(f"Timeline task deleted: {task_id}")
        return {"message": "Timeline task deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting timeline task: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Task Dependencies Endpoints
@router.get("/dependencies/{project_id}", response_model=List[TaskDependencyInDB])
async def get_task_dependencies(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all task dependencies for a project"""
    try:
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        return [TaskDependencyInDB(**dep) for dep in dependencies]
        
    except Exception as e:
        logger.error(f"Error retrieving task dependencies: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/dependencies", response_model=TaskDependencyInDB)
async def create_task_dependency(
    dependency: TaskDependencyCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new task dependency"""
    try:
        # Validate that both tasks exist
        predecessor = await db.timeline_tasks.find_one({"id": dependency.predecessor_id})
        successor = await db.timeline_tasks.find_one({"id": dependency.successor_id})
        
        if not predecessor or not successor:
            raise HTTPException(status_code=404, detail="One or both tasks not found")
        
        # Check for circular dependencies (basic check)
        if dependency.predecessor_id == dependency.successor_id:
            raise HTTPException(status_code=400, detail="Cannot create dependency from task to itself")
        
        dependency_data = TaskDependency(
            **dependency.dict(),
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.task_dependencies.insert_one(dependency_data.dict())
        created_dependency = await db.task_dependencies.find_one({"_id": result.inserted_id})
        
        # Broadcast creation to connected clients
        dep_response = TaskDependencyInDB(**created_dependency)
        await timeline_manager.broadcast_to_project(dependency.project_id, {
            "type": "dependency_created",
            "data": dep_response.dict()
        })
        
        logger.info(f"Task dependency created: {created_dependency['id']}")
        return dep_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task dependency: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/dependencies/{dependency_id}")
async def delete_task_dependency(
    dependency_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a task dependency"""
    try:
        dependency = await db.task_dependencies.find_one({"id": dependency_id})
        if not dependency:
            raise HTTPException(status_code=404, detail="Task dependency not found")
        
        await db.task_dependencies.delete_one({"id": dependency_id})
        
        # Broadcast deletion to connected clients
        await timeline_manager.broadcast_to_project(dependency["project_id"], {
            "type": "dependency_deleted",
            "data": {"dependency_id": dependency_id}
        })
        
        logger.info(f"Task dependency deleted: {dependency_id}")
        return {"message": "Task dependency deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task dependency: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Gantt Chart Data Endpoint
@router.get("/gantt/{project_id}", response_model=GanttChartData)
async def get_gantt_chart_data(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get complete Gantt chart data for a project"""
    try:
        # Get timeline configuration
        timeline_config = await db.timeline_projects.find_one({"project_id": project_id})
        
        # Get all tasks
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        # Get all dependencies
        dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
        dependencies = await dependencies_cursor.to_list(length=None)
        
        # Get calendars
        calendars_cursor = db.timeline_calendars.find({"project_id": project_id})
        calendars = await calendars_cursor.to_list(length=None)
        
        # Get baselines
        baselines_cursor = db.timeline_baselines.find({"project_id": project_id})
        baselines = await baselines_cursor.to_list(length=None)
        
        # Convert MongoDB documents to proper format by removing _id fields recursively
        def clean_mongo_doc(doc):
            if doc is None:
                return doc
            if isinstance(doc, dict):
                # Remove _id field
                if "_id" in doc:
                    doc.pop("_id")
                # Recursively clean nested dictionaries and lists
                for key, value in doc.items():
                    if isinstance(value, dict):
                        doc[key] = clean_mongo_doc(value)
                    elif isinstance(value, list):
                        doc[key] = [clean_mongo_doc(item) if isinstance(item, dict) else item for item in value]
            return doc
        
        # Clean all documents
        tasks = [clean_mongo_doc(task) for task in tasks]
        dependencies = [clean_mongo_doc(dep) for dep in dependencies]
        calendars = [clean_mongo_doc(cal) for cal in calendars]
        baselines = [clean_mongo_doc(baseline) for baseline in baselines]
        if timeline_config:
            timeline_config = clean_mongo_doc(timeline_config)
        
        # TODO: Calculate critical path (placeholder for now)
        critical_path = []
        
        gantt_data = GanttChartData(
            project_id=project_id,
            tasks=[TimelineTask(**task) for task in tasks],
            dependencies=[TaskDependency(**dep) for dep in dependencies],
            timeline_config=TimelineProject(**timeline_config) if timeline_config else None,
            calendars=[TimelineCalendar(**cal) for cal in calendars],
            baselines=[TimelineBaseline(**baseline) for baseline in baselines],
            critical_path=critical_path
        )
        
        return gantt_data
        
    except Exception as e:
        logger.error(f"Error retrieving Gantt chart data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Timeline Statistics Endpoint
@router.get("/stats/{project_id}", response_model=TimelineStats)
async def get_timeline_stats(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get timeline statistics for a project"""
    try:
        # Get all tasks for the project
        tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        if not tasks:
            raise HTTPException(status_code=404, detail="No timeline tasks found for project")
        
        # Calculate statistics
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("percent_complete", 0) == 100])
        in_progress_tasks = len([t for t in tasks if 0 < t.get("percent_complete", 0) < 100])
        
        total_work_hours = sum(t.get("work", 0) for t in tasks)
        completed_work_hours = sum(
            (t.get("work", 0) * t.get("percent_complete", 0) / 100) for t in tasks
        )
        
        # Calculate project duration (simplified)
        if tasks:
            start_dates = [t.get("start_date") for t in tasks if t.get("start_date")]
            finish_dates = [t.get("finish_date") for t in tasks if t.get("finish_date")]
            
            if start_dates and finish_dates:
                project_start = min(start_dates)
                project_end = max(finish_dates)
                project_duration_days = (project_end - project_start).days
            else:
                project_duration_days = 0
        else:
            project_duration_days = 0
        
        # Calculate project health score (simplified)
        completion_rate = completed_work_hours / total_work_hours if total_work_hours > 0 else 0
        project_health_score = completion_rate * 100
        
        stats = TimelineStats(
            project_id=project_id,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            in_progress_tasks=in_progress_tasks,
            critical_path_length=0,  # TODO: Calculate when critical path is implemented
            project_duration_days=project_duration_days,
            total_work_hours=total_work_hours,
            completed_work_hours=int(completed_work_hours),
            project_health_score=round(project_health_score, 1)
        )
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving timeline statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# WebSocket Endpoint for Real-time Updates
@router.websocket("/ws/{project_id}")
async def timeline_websocket_endpoint(websocket: WebSocket, project_id: str):
    """WebSocket endpoint for real-time timeline updates"""
    await timeline_manager.connect(websocket, project_id)
    try:
        while True:
            # Keep connection alive and listen for any client messages
            data = await websocket.receive_text()
            # Echo back for connection testing
            message = json.loads(data)
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.utcnow().isoformat()}))
    except WebSocketDisconnect:
        timeline_manager.disconnect(websocket, project_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        timeline_manager.disconnect(websocket, project_id)


# Timeline Calendar Endpoints
@router.get("/calendars/{project_id}", response_model=List[TimelineCalendarInDB])
async def get_timeline_calendars(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all calendars for a project"""
    try:
        calendars_cursor = db.timeline_calendars.find({"project_id": project_id})
        calendars = await calendars_cursor.to_list(length=None)
        
        return [TimelineCalendarInDB(**cal) for cal in calendars]
        
    except Exception as e:
        logger.error(f"Error retrieving timeline calendars: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/calendars", response_model=TimelineCalendarInDB)
async def create_timeline_calendar(
    calendar: TimelineCalendarCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new timeline calendar"""
    try:
        calendar_data = TimelineCalendar(
            **calendar.dict(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.timeline_calendars.insert_one(calendar_data.dict())
        created_calendar = await db.timeline_calendars.find_one({"_id": result.inserted_id})
        
        logger.info(f"Timeline calendar created: {created_calendar['id']}")
        return TimelineCalendarInDB(**created_calendar)
        
    except Exception as e:
        logger.error(f"Error creating timeline calendar: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Timeline Baseline Endpoints
@router.get("/baselines/{project_id}", response_model=List[TimelineBaselineInDB])
async def get_timeline_baselines(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all baselines for a project"""
    try:
        baselines_cursor = db.timeline_baselines.find({"project_id": project_id})
        baselines = await baselines_cursor.to_list(length=None)
        
        return [TimelineBaselineInDB(**baseline) for baseline in baselines]
        
    except Exception as e:
        logger.error(f"Error retrieving timeline baselines: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/baselines", response_model=TimelineBaselineInDB)
async def create_timeline_baseline(
    baseline: TimelineBaselineCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new timeline baseline"""
    try:
        # Get current timeline data for baseline snapshot
        tasks_cursor = db.timeline_tasks.find({"project_id": baseline.project_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        baseline_data = TimelineBaseline(
            **baseline.dict(),
            baseline_date=datetime.utcnow(),
            baseline_data={"tasks": tasks},  # Store current task state
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.timeline_baselines.insert_one(baseline_data.dict())
        created_baseline = await db.timeline_baselines.find_one({"_id": result.inserted_id})
        
        logger.info(f"Timeline baseline created: {created_baseline['id']}")
        return TimelineBaselineInDB(**created_baseline)
        
    except Exception as e:
        logger.error(f"Error creating timeline baseline: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")