import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from database import get_database


class ActivityService:
    """Enhanced activity tracking service"""
    
    @staticmethod
    async def log_activity(
        task_id: str, 
        user_id: str, 
        action: str, 
        details: Dict[str, Any] = None,
        db = None
    ) -> str:
        """Log a task activity with enhanced tracking"""
        if db is None:
            db = await get_database()
            
        activity_id = str(uuid.uuid4())
        activity_entry = {
            "id": activity_id,
            "task_id": task_id,
            "user_id": user_id,
            "action": action,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            # Add activity to task's activity_log
            await db.tasks.update_one(
                {"id": task_id},
                {"$push": {"activity_log": activity_entry}}
            )
            
            # Update task's updated_at timestamp
            await db.tasks.update_one(
                {"id": task_id},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
            
            print(f"✅ Activity logged: {action} for task {task_id} by user {user_id}")
            return activity_id
            
        except Exception as e:
            print(f"❌ Failed to log activity: {e}")
            raise e
    
    @staticmethod
    async def get_task_activities(task_id: str, db = None) -> List[Dict[str, Any]]:
        """Get all activities for a task"""
        if db is None:
            db = await get_database()
            
        try:
            task = await db.tasks.find_one({"id": task_id})
            if not task:
                return []
                
            activities = task.get("activity_log", [])
            # Sort by timestamp descending (newest first)
            activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return activities
            
        except Exception as e:
            print(f"❌ Failed to get activities: {e}")
            return []
    
    @staticmethod
    async def get_activity_metrics(task_id: str, db = None) -> Dict[str, int]:
        """Get activity metrics for a task"""
        activities = await ActivityService.get_task_activities(task_id, db)
        
        # Count different types of activities
        time_entries = len([a for a in activities if a.get("action") == "time_logged"])
        
        # Updates include various task modification actions
        update_actions = [
            "task_updated", "status_changed", "priority_changed", 
            "assignee_changed", "assignees_changed", "due_date_changed",
            "task_moved", "dependency_added", "dependency_removed",
            "comment_added", "comment_updated", "comment_deleted"
        ]
        updates = len([a for a in activities if a.get("action") in update_actions])
        
        # Calculate active days (unique dates)
        dates = set()
        for activity in activities:
            if activity.get("timestamp"):
                try:
                    # Handle both string and datetime timestamps
                    if isinstance(activity["timestamp"], str):
                        timestamp_str = activity["timestamp"].replace("Z", "+00:00")
                        date = datetime.fromisoformat(timestamp_str).date()
                    else:
                        date = activity["timestamp"].date()
                    dates.add(date.isoformat())
                except Exception as e:
                    print(f"Error processing timestamp {activity.get('timestamp')}: {e}")
                    pass
        
        return {
            "total_events": len(activities),
            "time_entries": time_entries,
            "updates": updates,
            "active_days": len(dates)
        }
    
    @staticmethod
    async def create_sample_activities(task_id: str, user_id: str, db = None) -> int:
        """Create sample activities for demonstration (for existing tasks without activity)"""
        if db is None:
            db = await get_database()
            
        task = await db.tasks.find_one({"id": task_id})
        if not task:
            return 0
        
        # Check if task already has activities
        existing_activities = len(task.get("activity_log", []))
        if existing_activities > 0:
            return existing_activities
        
        # Create sample activities based on task data
        sample_activities = []
        base_time = datetime.utcnow()
        
        # 1. Task creation activity
        created_time = task.get("created_at")
        if created_time:
            if isinstance(created_time, str):
                created_dt = datetime.fromisoformat(created_time.replace("Z", "+00:00"))
            else:
                created_dt = created_time
        else:
            created_dt = base_time
            
        activities_to_add = [
            {
                "action": "task_created",
                "details": {"title": task.get("title", "Task"), "status": task.get("status", "todo")},
                "timestamp": created_dt
            }
        ]
        
        # 2. Add some sample updates if task has been updated
        if task.get("updated_at") and task.get("updated_at") != task.get("created_at"):
            activities_to_add.extend([
                {
                    "action": "task_updated",
                    "details": {"fields": ["description", "priority"]},
                    "timestamp": created_dt.replace(hour=(created_dt.hour + 1) % 24)
                },
                {
                    "action": "status_changed",
                    "details": {"from": "todo", "to": task.get("status", "in_progress")},
                    "timestamp": created_dt.replace(hour=(created_dt.hour + 2) % 24)
                }
            ])
        
        # 3. Add time logging if task has time tracking
        time_tracking = task.get("time_tracking", {})
        if time_tracking.get("actual_hours", 0) > 0:
            activities_to_add.append({
                "action": "time_logged",
                "details": {
                    "hours": time_tracking.get("actual_hours", 2),
                    "description": "Development work"
                },
                "timestamp": created_dt.replace(hour=(created_dt.hour + 3) % 24)
            })
        
        # Insert all activities
        activity_count = 0
        for activity_data in activities_to_add:
            activity_entry = {
                "id": str(uuid.uuid4()),
                "task_id": task_id,
                "user_id": user_id,
                "action": activity_data["action"],
                "details": activity_data["details"],
                "timestamp": activity_data["timestamp"].isoformat()
            }
            
            await db.tasks.update_one(
                {"id": task_id},
                {"$push": {"activity_log": activity_entry}}
            )
            activity_count += 1
        
        return activity_count


# Create singleton instance
activity_service = ActivityService()
