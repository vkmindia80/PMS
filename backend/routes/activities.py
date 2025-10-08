"""
Activity Routes for tracking project and task activities
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from auth.middleware import get_current_user
from models.user import User
from models.activity import Activity, ActivityCreate, ActivityFilter, ActivityStats
from database import get_database

router = APIRouter(prefix="/api/activities", tags=["Activities"])


@router.post("/", response_model=Activity, status_code=201)
async def create_activity(
    activity_data: ActivityCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new activity entry"""
    try:
        db = await get_database()
        
        # Create activity document with enhanced fields
        activity_doc = {
            "id": str(uuid.uuid4()),
            "entity_type": activity_data.entity_type,
            "entity_id": activity_data.entity_id,
            "action_type": activity_data.action_type,
            "user_id": current_user.id,
            "user_name": f"{current_user.first_name} {current_user.last_name}",
            "user_email": current_user.email,
            "description": activity_data.description,
            "metadata": activity_data.metadata or {},
            "organization_id": current_user.organization_id,
            "project_id": activity_data.project_id,
            "task_id": activity_data.task_id,
            # Enhanced tracking fields (geolocation removed)
            "tab_name": activity_data.tab_name,
            "session_id": activity_data.session_id,
            "user_agent": activity_data.user_agent,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = await db.activities.insert_one(activity_doc)
        
        if result.inserted_id:
            created_activity = await db.activities.find_one({"id": activity_doc["id"]})
            if created_activity:
                created_activity.pop('_id', None)
                return Activity(**created_activity)
        
        raise HTTPException(status_code=500, detail="Failed to create activity")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating activity: {str(e)}")


@router.get("/", response_model=List[Activity])
async def get_activities(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    limit: int = Query(50, ge=1, le=100, description="Number of activities to return"),
    offset: int = Query(0, ge=0, description="Number of activities to skip"),
    current_user: User = Depends(get_current_user)
):
    """Get activities with optional filters"""
    try:
        db = await get_database()
        
        # Build filter query
        query = {"organization_id": current_user.organization_id}
        
        if entity_type:
            query["entity_type"] = entity_type
        if entity_id:
            query["entity_id"] = entity_id
        if project_id:
            query["project_id"] = project_id
        if task_id:
            query["task_id"] = task_id
        if user_id:
            query["user_id"] = user_id
        if action_type:
            query["action_type"] = action_type
        
        # Get activities with pagination
        cursor = db.activities.find(query).sort("created_at", -1).skip(offset).limit(limit)
        activities = await cursor.to_list(length=limit)
        
        # Remove MongoDB _id field
        for activity in activities:
            activity.pop('_id', None)
        
        return [Activity(**activity) for activity in activities]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching activities: {str(e)}")


@router.get("/project/{project_id}", response_model=List[Activity])
async def get_project_activities(
    project_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Get all activities for a specific project"""
    try:
        db = await get_database()
        
        query = {
            "organization_id": current_user.organization_id,
            "project_id": project_id
        }
        
        cursor = db.activities.find(query).sort("created_at", -1).skip(offset).limit(limit)
        activities = await cursor.to_list(length=limit)
        
        for activity in activities:
            activity.pop('_id', None)
        
        return [Activity(**activity) for activity in activities]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project activities: {str(e)}")


@router.get("/task/{task_id}", response_model=List[Activity])
async def get_task_activities(
    task_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Get all activities for a specific task"""
    try:
        db = await get_database()
        
        query = {
            "organization_id": current_user.organization_id,
            "task_id": task_id
        }
        
        cursor = db.activities.find(query).sort("created_at", -1).skip(offset).limit(limit)
        activities = await cursor.to_list(length=limit)
        
        for activity in activities:
            activity.pop('_id', None)
        
        return [Activity(**activity) for activity in activities]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching task activities: {str(e)}")


@router.get("/stats/project/{project_id}", response_model=ActivityStats)
async def get_project_activity_stats(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get activity statistics for a project"""
    try:
        db = await get_database()
        
        query = {
            "organization_id": current_user.organization_id,
            "project_id": project_id
        }
        
        # Get all activities for the project
        activities = await db.activities.find(query).to_list(length=None)
        
        # Calculate statistics
        total_activities = len(activities)
        
        # Activities by type
        activities_by_type = {}
        activities_by_action = {}
        user_activity_count = {}
        
        # Recent activities (last 24 hours)
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        recent_activity_count = 0
        
        for activity in activities:
            # By type
            entity_type = activity.get('entity_type', 'unknown')
            activities_by_type[entity_type] = activities_by_type.get(entity_type, 0) + 1
            
            # By action
            action_type = activity.get('action_type', 'unknown')
            activities_by_action[action_type] = activities_by_action.get(action_type, 0) + 1
            
            # By user
            user_name = activity.get('user_name', 'Unknown User')
            user_id = activity.get('user_id', 'unknown')
            if user_id not in user_activity_count:
                user_activity_count[user_id] = {
                    "user_id": user_id,
                    "user_name": user_name,
                    "count": 0
                }
            user_activity_count[user_id]["count"] += 1
            
            # Recent activities
            created_at_str = activity.get('created_at')
            if created_at_str:
                try:
                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                    if created_at > twenty_four_hours_ago:
                        recent_activity_count += 1
                except:
                    pass
        
        # Sort most active users
        most_active_users = sorted(
            user_activity_count.values(),
            key=lambda x: x["count"],
            reverse=True
        )[:10]
        
        return ActivityStats(
            total_activities=total_activities,
            activities_by_type=activities_by_type,
            activities_by_action=activities_by_action,
            most_active_users=most_active_users,
            recent_activity_count=recent_activity_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating activity stats: {str(e)}")


@router.get("/recent", response_model=List[Activity])
async def get_recent_activities(
    hours: int = Query(24, ge=1, le=168, description="Number of hours to look back"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get recent activities within the specified time window"""
    try:
        db = await get_database()
        
        time_threshold = datetime.utcnow() - timedelta(hours=hours)
        
        query = {
            "organization_id": current_user.organization_id,
            "created_at": {"$gte": time_threshold.isoformat()}
        }
        
        cursor = db.activities.find(query).sort("created_at", -1).limit(limit)
        activities = await cursor.to_list(length=limit)
        
        for activity in activities:
            activity.pop('_id', None)
        
        return [Activity(**activity) for activity in activities]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent activities: {str(e)}")


@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an activity (admin only)"""
    try:
        db = await get_database()
        
        # Check if activity exists and belongs to the user's organization
        activity = await db.activities.find_one({
            "id": activity_id,
            "organization_id": current_user.organization_id
        })
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Delete the activity
        result = await db.activities.delete_one({"id": activity_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=500, detail="Failed to delete activity")
        
        return {"success": True, "message": "Activity deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting activity: {str(e)}")
