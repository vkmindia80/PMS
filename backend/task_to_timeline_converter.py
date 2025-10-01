#!/usr/bin/env python3
"""
Task to Timeline Converter
Converts regular tasks to timeline tasks format for Gantt chart display
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
import logging
import uuid

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskToTimelineConverter:
    def __init__(self):
        self.db = None
        self.converted_count = 0
        
    async def connect_database(self):
        """Connect to MongoDB"""
        try:
            await connect_to_mongo()
            self.db = await get_database()
            logger.info("✅ Connected to MongoDB")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            raise
            
    async def get_regular_tasks(self):
        """Fetch all regular tasks from the tasks collection"""
        try:
            tasks_cursor = self.db.tasks.find({})
            tasks = await tasks_cursor.to_list(length=None)
            logger.info(f"📋 Found {len(tasks)} regular tasks")
            return tasks
        except Exception as e:
            logger.error(f"❌ Error fetching regular tasks: {e}")
            return []
            
    async def clear_existing_timeline_tasks(self):
        """Clear existing timeline tasks to avoid duplicates"""
        try:
            result = await self.db.timeline_tasks.delete_many({})
            logger.info(f"🗑️  Cleared {result.deleted_count} existing timeline tasks")
            
            # Also clear timeline projects and dependencies for clean slate
            proj_result = await self.db.timeline_projects.delete_many({})
            dep_result = await self.db.task_dependencies.delete_many({})
            logger.info(f"🗑️  Cleared {proj_result.deleted_count} timeline projects and {dep_result.deleted_count} dependencies")
            
        except Exception as e:
            logger.error(f"⚠️  Error clearing existing data: {e}")
            
    async def convert_task_to_timeline_format(self, task):
        """Convert a regular task to timeline task format"""
        try:
            # Generate timeline task ID if not present
            timeline_task_id = task.get('id', str(uuid.uuid4()))
            
            # Calculate dates (use created_at as base if no specific dates)
            created_at = task.get('created_at', datetime.utcnow())
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            # Calculate duration based on status and priority
            priority = task.get('priority', 'medium')
            status = task.get('status', 'todo')
            
            # Duration mapping based on priority
            duration_mapping = {
                'low': 16,      # 2 days
                'medium': 24,   # 3 days  
                'high': 40,     # 5 days
                'critical': 80  # 10 days
            }
            
            duration = duration_mapping.get(priority, 24)
            
            # Start date (use created date or recent date)
            start_date = created_at
            if start_date < datetime(2025, 1, 1):  # Ensure reasonable timeline
                start_date = datetime.utcnow() + timedelta(days=-30)  # Start 30 days ago for demo
                
            # Calculate finish date
            finish_date = start_date + timedelta(hours=duration)
            
            # Calculate progress percentage based on status
            progress_mapping = {
                'todo': 0,
                'in_progress': 45,
                'in_review': 80,
                'blocked': 30,
                'completed': 100,
                'cancelled': 0
            }
            
            percent_complete = progress_mapping.get(status, 0)
            
            # Determine if critical (high/critical priority)
            critical = priority in ['high', 'critical']
            
            # Determine outline level (for hierarchy)
            outline_level = 1  # Default level
            
            # Check if it's a summary task (has subtasks or is a major milestone)
            task_name = task.get('title', task.get('name', 'Untitled Task'))
            summary_task = any(keyword in task_name.lower() for keyword in ['milestone', 'phase', 'release', 'sprint'])
            
            # Check if it's a milestone
            milestone = any(keyword in task_name.lower() for keyword in ['milestone', 'deadline', 'release', 'launch'])
            
            # Get assignee IDs (convert single assignee to list)
            assignee_ids = []
            if task.get('assignee_id'):
                assignee_ids = [task.get('assignee_id')]
            elif task.get('assignee_ids'):
                assignee_ids = task.get('assignee_ids', [])
                
            # Color coding based on priority
            color_mapping = {
                'low': '#10b981',      # Green
                'medium': '#3b82f6',   # Blue  
                'high': '#f59e0b',     # Orange
                'critical': '#ef4444'  # Red
            }
            
            color = color_mapping.get(priority, '#3b82f6')
            
            timeline_task = {
                'id': timeline_task_id,
                'name': task_name,
                'description': task.get('description', ''),
                'project_id': task.get('project_id', ''),
                'duration': duration,
                'start_date': start_date,
                'finish_date': finish_date,
                'percent_complete': percent_complete,
                'outline_level': outline_level,
                'summary_task': summary_task,
                'critical': critical,
                'milestone': milestone,
                'assignee_ids': assignee_ids,
                'color': color,
                'work': duration,  # Work hours = duration initially
                'remaining_work': int(duration * (1 - percent_complete / 100)) if percent_complete < 100 else 0,
                'actual_work': int(duration * (percent_complete / 100)) if percent_complete > 0 else 0,
                'calendar_id': None,
                'constraint_type': 'ASAP',  # As Soon As Possible
                'constraint_date': None,
                'deadline': task.get('due_date'),
                'priority': priority,
                'task_type': task.get('type', 'task'),
                'wbs': f"{task.get('project_id', 'PROJ')}.{timeline_task_id[:8]}",  # Work Breakdown Structure
                'created_at': created_at,
                'updated_at': task.get('updated_at', datetime.utcnow())
            }
            
            return timeline_task
            
        except Exception as e:
            logger.error(f"❌ Error converting task {task.get('id', 'unknown')}: {e}")
            return None
            
    async def create_timeline_project_config(self, project_id):
        """Create timeline configuration for a project"""
        try:
            # Check if project exists
            project = await self.db.projects.find_one({"id": project_id})
            if not project:
                logger.warning(f"⚠️  Project {project_id} not found")
                return
                
            # Check if timeline config already exists
            existing_config = await self.db.timeline_projects.find_one({"project_id": project_id})
            if existing_config:
                return  # Already exists
                
            # Create timeline project configuration
            timeline_config = {
                'id': str(uuid.uuid4()),
                'project_id': project_id,
                'name': project.get('name', 'Project Timeline'),
                'start_date': datetime.utcnow(),
                'finish_date': datetime.utcnow() + timedelta(days=90),  # 3 months default
                'calendar_id': None,
                'working_hours_per_day': 8.0,
                'working_days_per_week': 5,
                'default_task_type': 'task',
                'currency': 'USD',
                'status': 'active',
                'auto_scheduled': True,
                'critical_path_enabled': True,
                'baseline_enabled': False,
                'resource_leveling_enabled': False,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            await self.db.timeline_projects.insert_one(timeline_config)
            logger.info(f"✅ Created timeline config for project {project_id}")
            
        except Exception as e:
            logger.error(f"❌ Error creating timeline config for project {project_id}: {e}")
            
    async def convert_all_tasks(self):
        """Convert all regular tasks to timeline format"""
        try:
            # Get all regular tasks
            regular_tasks = await self.get_regular_tasks()
            
            if not regular_tasks:
                logger.warning("⚠️  No regular tasks found to convert")
                return 0
                
            # Clear existing timeline data
            await self.clear_existing_timeline_tasks()
            
            # Group tasks by project
            projects = set()
            converted_tasks = []
            
            for task in regular_tasks:
                # Convert task to timeline format
                timeline_task = await self.convert_task_to_timeline_format(task)
                
                if timeline_task:
                    converted_tasks.append(timeline_task)
                    projects.add(timeline_task['project_id'])
                    self.converted_count += 1
                    
            # Insert all timeline tasks
            if converted_tasks:
                await self.db.timeline_tasks.insert_many(converted_tasks)
                logger.info(f"✅ Inserted {len(converted_tasks)} timeline tasks")
                
                # Create timeline project configurations
                for project_id in projects:
                    if project_id:  # Skip empty project IDs
                        await self.create_timeline_project_config(project_id)
                        
            return len(converted_tasks)
            
        except Exception as e:
            logger.error(f"❌ Error during conversion: {e}")
            return 0
            
    async def verify_conversion(self):
        """Verify the conversion was successful"""
        try:
            # Count timeline tasks
            timeline_count = await self.db.timeline_tasks.count_documents({})
            
            # Count timeline projects
            timeline_projects_count = await self.db.timeline_projects.count_documents({})
            
            # Get sample timeline task
            sample_task = await self.db.timeline_tasks.find_one({})
            
            logger.info(f"📊 Conversion Verification:")
            logger.info(f"   Timeline Tasks: {timeline_count}")
            logger.info(f"   Timeline Projects: {timeline_projects_count}")
            
            if sample_task:
                logger.info(f"   Sample Task: {sample_task['name']} ({sample_task['project_id']})")
                logger.info(f"   Duration: {sample_task['duration']}h, Progress: {sample_task['percent_complete']}%")
                
            return timeline_count > 0
            
        except Exception as e:
            logger.error(f"❌ Error during verification: {e}")
            return False

async def main():
    """Main conversion function"""
    logger.info("🔄 Starting Task to Timeline Conversion...")
    
    converter = TaskToTimelineConverter()
    
    try:
        # Connect to database
        await converter.connect_database()
        
        # Convert all tasks
        converted_count = await converter.convert_all_tasks()
        
        # Verify conversion
        success = await converter.verify_conversion()
        
        if success:
            logger.info("🎉 Task to Timeline conversion completed successfully!")
            logger.info(f"📊 Converted {converted_count} tasks to timeline format")
        else:
            logger.error("❌ Conversion verification failed")
            
    except Exception as e:
        logger.error(f"❌ Conversion failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())