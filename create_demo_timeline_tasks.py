#!/usr/bin/env python3
"""
Generate demo timeline tasks for testing the Dynamic Timeline functionality
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta
import uuid
from pymongo import MongoClient
from dotenv import load_dotenv

# Add the parent directory to Python path to import from backend
sys.path.append('/app/backend')

load_dotenv('/app/backend/.env')

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
DATABASE_NAME = 'enterprise_portfolio_db'

async def create_demo_timeline_tasks():
    """Create demo timeline tasks and dependencies"""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DATABASE_NAME]
        
        print("🔗 Connected to MongoDB")
        
        # Get existing projects and tasks
        projects = list(db.projects.find({"organization_id": "demo-org-001"}))
        if not projects:
            print("❌ No projects found. Please run the main demo data generator first.")
            return
        
        regular_tasks = list(db.tasks.find())
        print(f"📋 Found {len(regular_tasks)} regular tasks to convert")
        
        # Check if we already have enough timeline tasks
        existing_tasks = list(db.timeline_tasks.find().limit(20))
        if len(existing_tasks) >= 15:
            print(f"✅ Found {len(existing_tasks)} existing timeline tasks - adding more variety")
        else:
            print(f"📋 Found {len(existing_tasks)} existing timeline tasks")
            
        # Add more demo tasks for variety regardless of existing count
        additional_tasks = create_additional_demo_tasks(projects, len(existing_tasks))
        if additional_tasks:
            db.timeline_tasks.insert_many(additional_tasks)
            print(f"✅ Created {len(additional_tasks)} additional demo tasks")
            
        # Create some overdue and critical tasks
        overdue_tasks = create_overdue_demo_tasks(projects, len(existing_tasks))
        if overdue_tasks:
            db.timeline_tasks.insert_many(overdue_tasks)
            print(f"✅ Created {len(overdue_tasks)} overdue demo tasks")
        
        timeline_tasks = []
        task_dependencies = []
        
        # Convert existing tasks to timeline format
        for i, task in enumerate(regular_tasks[:20]):  # Limit to first 20 tasks
            project_id = task.get('project_id')
            if not project_id:
                continue
                
            # Create timeline task
            start_date = datetime.utcnow() + timedelta(days=i * 2)
            duration_hours = 8 + (i % 5) * 8  # 8-40 hours
            finish_date = start_date + timedelta(hours=duration_hours)
            
            # Determine completion percentage
            status = task.get('status', 'todo')
            if status == 'completed':
                percent_complete = 100
            elif status == 'in_progress':
                percent_complete = 25 + (i % 4) * 15  # 25-70%
            else:
                percent_complete = 0
            
            # Determine if critical
            critical = (task.get('priority') == 'critical' or 
                       task.get('priority') == 'high' or
                       i % 7 == 0)  # Every 7th task is critical
            
            timeline_task = {
                "id": task.get('id', str(uuid.uuid4())),
                "name": task.get('title', f"Task {i+1}"),
                "description": task.get('description', f"Description for task {i+1}"),
                "project_id": project_id,
                "duration": duration_hours,
                "start_date": start_date,
                "finish_date": finish_date,
                "percent_complete": percent_complete,
                "outline_level": 1,
                "summary_task": task.get('type') == 'epic',
                "critical": critical,
                "assignee_ids": [task.get('assignee_id')] if task.get('assignee_id') else [],
                "milestone": task.get('type') == 'milestone',
                "color": get_task_color(task.get('priority', 'medium'), status),
                "created_at": task.get('created_at', datetime.utcnow()),
                "updated_at": task.get('updated_at', datetime.utcnow()),
                "priority": task.get('priority', 'medium'),
                "status": status
            }
            
            timeline_tasks.append(timeline_task)
            
            # Create some dependencies (every 3rd task depends on previous task)
            if i > 0 and i % 3 == 0 and len(timeline_tasks) > 1:
                dependency = {
                    "id": str(uuid.uuid4()),
                    "predecessor_id": timeline_tasks[i-1]["id"],
                    "successor_id": timeline_task["id"],
                    "dependency_type": "FS",  # Finish-to-Start
                    "lag_duration": 0,
                    "lag_format": "hour",
                    "project_id": project_id,
                    "created_by": "demo-user-001",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                task_dependencies.append(dependency)
        
        # Insert timeline tasks
        if timeline_tasks:
            db.timeline_tasks.insert_many(timeline_tasks)
            print(f"✅ Created {len(timeline_tasks)} timeline tasks")
            
        if task_dependencies:
            db.task_dependencies.insert_many(task_dependencies)
            print(f"✅ Created {len(task_dependencies)} task dependencies")
        
        # Create some additional variety for better demo
        additional_tasks = create_additional_demo_tasks(projects)
        if additional_tasks:
            db.timeline_tasks.insert_many(additional_tasks)
            print(f"✅ Created {len(additional_tasks)} additional demo tasks")
            
        print("🎉 Demo timeline tasks created successfully!")
        
        # Print summary
        total_timeline_tasks = db.timeline_tasks.count_documents({})
        total_dependencies = db.task_dependencies.count_documents({})
        
        print(f"\n📊 Summary:")
        print(f"   • Timeline Tasks: {total_timeline_tasks}")
        print(f"   • Dependencies: {total_dependencies}")
        print(f"   • Projects with tasks: {len(set(t['project_id'] for t in timeline_tasks))}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error creating demo timeline tasks: {e}")
        import traceback
        traceback.print_exc()

def create_additional_demo_tasks(projects, offset=0):
    """Create additional varied demo tasks for better testing"""
    additional_tasks = []
    
    # Create tasks with different characteristics
    task_templates = [
        {
            "name": "System Architecture Review",
            "duration": 16,
            "critical": True,
            "priority": "critical",
            "percent_complete": 0
        },
        {
            "name": "Database Migration",
            "duration": 32,
            "critical": True,
            "priority": "high",
            "percent_complete": 75
        },
        {
            "name": "UI/UX Design Phase",
            "duration": 40,
            "critical": False,
            "priority": "medium",
            "percent_complete": 100
        },
        {
            "name": "Performance Testing",
            "duration": 24,
            "critical": True,
            "priority": "high",
            "percent_complete": 30
        },
        {
            "name": "Documentation Writing",
            "duration": 20,
            "critical": False,
            "priority": "low",
            "percent_complete": 10
        },
        {
            "name": "Code Review Process",
            "duration": 12,
            "critical": False,
            "priority": "medium",
            "percent_complete": 50
        },
        {
            "name": "Security Audit",
            "duration": 28,
            "critical": True,
            "priority": "critical",
            "percent_complete": 20
        },
        {
            "name": "Client Presentation Prep",
            "duration": 8,
            "critical": False,
            "priority": "medium",
            "percent_complete": 90
        }
    ]
    
    for i, template in enumerate(task_templates):
        if not projects:
            continue
            
        project = projects[i % len(projects)]
        
        # Calculate dates to create some variety
        start_date = datetime.utcnow() + timedelta(days=(i + offset) * 2 - 5)
        finish_date = start_date + timedelta(hours=template["duration"])
        
        # Determine status based on completion
        if template["percent_complete"] >= 100:
            status = "completed"
        elif template["percent_complete"] > 0:
            status = "in_progress"
        else:
            status = "todo"
        
        task = {
            "id": str(uuid.uuid4()),
            "name": template["name"],
            "description": f"Demo task: {template['name']} for testing timeline functionality",
            "project_id": project["id"],
            "duration": template["duration"],
            "start_date": start_date,
            "finish_date": finish_date,
            "percent_complete": template["percent_complete"],
            "outline_level": 1,
            "summary_task": False,
            "critical": template["critical"],
            "assignee_ids": ["demo-user-001"],  # Assign to demo user
            "milestone": False,
            "color": get_task_color(template["priority"], status),
            "created_at": datetime.utcnow() - timedelta(days=5),
            "updated_at": datetime.utcnow(),
            "priority": template["priority"],
            "status": status
        }
        
        additional_tasks.append(task)
    
    return additional_tasks

def create_overdue_demo_tasks(projects, offset=0):
    """Create overdue tasks for testing"""
    overdue_tasks = []
    
    overdue_templates = [
        {
            "name": "Overdue Bug Fixes",
            "duration": 16,
            "critical": True,
            "priority": "critical",
            "percent_complete": 25,
            "days_overdue": 5
        },
        {
            "name": "Client Feedback Integration",
            "duration": 12,
            "critical": False,
            "priority": "high",
            "percent_complete": 60,
            "days_overdue": 2
        },
        {
            "name": "Legacy System Updates",
            "duration": 24,
            "critical": False,
            "priority": "medium",
            "percent_complete": 10,
            "days_overdue": 8
        }
    ]
    
    for i, template in enumerate(overdue_templates):
        if not projects:
            continue
            
        project = projects[i % len(projects)]
        
        # Calculate overdue dates
        days_overdue = template["days_overdue"]
        finish_date = datetime.utcnow() - timedelta(days=days_overdue)
        start_date = finish_date - timedelta(hours=template["duration"])
        
        task = {
            "id": str(uuid.uuid4()),
            "name": template["name"],
            "description": f"Overdue demo task: {template['name']}",
            "project_id": project["id"],
            "duration": template["duration"],
            "start_date": start_date,
            "finish_date": finish_date,
            "percent_complete": template["percent_complete"],
            "outline_level": 1,
            "summary_task": False,
            "critical": template["critical"],
            "assignee_ids": ["demo-user-001"],
            "milestone": False,
            "color": get_task_color(template["priority"], "in_progress"),
            "created_at": datetime.utcnow() - timedelta(days=10),
            "updated_at": datetime.utcnow(),
            "priority": template["priority"],
            "status": "in_progress"
        }
        
        overdue_tasks.append(task)
    
    return overdue_tasks

def get_task_color(priority, status):
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

if __name__ == "__main__":
    asyncio.run(create_demo_timeline_tasks())