#!/usr/bin/env python3
"""
Create demo projects with timeline tasks for testing zoom functionality
"""

import asyncio
import sys
import os
from datetime import datetime, date, timedelta
import uuid

# Add the backend directory to the path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database, close_mongo_connection

async def create_demo_projects():
    """Create demo projects with timeline tasks"""
    try:
        await connect_to_mongo()
        db = await get_database()
        
        print("🔍 Creating demo projects with timeline tasks...")
        
        # Create demo projects
        projects_data = [
            {
                "id": "proj-demo-001",
                "name": "Web Application Redesign",
                "description": "Complete redesign of the company website with modern UI/UX",
                "status": "active",
                "priority": "high",
                "visibility": "team",
                "start_date": (date.today() - timedelta(days=30)).isoformat(),
                "due_date": (date.today() + timedelta(days=60)).isoformat(),
                "organization_id": "demo-org-001",
                "owner_id": "demo-user-001",
                "team_members": ["demo-user-001"],
                "budget": {
                    "total_budget": 50000.0,
                    "spent_amount": 15000.0,
                    "currency": "USD"
                },
                "milestones": [
                    {
                        "id": "milestone-001",
                        "title": "Design Phase Complete",
                        "description": "Complete UI/UX design mockups",
                        "due_date": (date.today() + timedelta(days=15)).isoformat(),
                        "completed": False,
                        "completed_at": None
                    },
                    {
                        "id": "milestone-002", 
                        "title": "Development Complete",
                        "description": "Finish frontend and backend development",
                        "due_date": (date.today() + timedelta(days=45)).isoformat(),
                        "completed": False,
                        "completed_at": None
                    }
                ],
                "settings": {
                    "auto_assign_tasks": False,
                    "require_time_tracking": True,
                    "allow_guest_access": False,
                    "notification_settings": {},
                    "custom_fields": {}
                },
                "tags": ["web", "redesign", "ui", "ux"],
                "category": "development",
                "progress_percentage": 25.0,
                "task_count": 0,
                "completed_task_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "proj-demo-002",
                "name": "Mobile App Development", 
                "description": "Native iOS and Android mobile application",
                "status": "planning",
                "priority": "medium",
                "visibility": "team",
                "start_date": (date.today() + timedelta(days=7)).isoformat(),
                "due_date": (date.today() + timedelta(days=120)).isoformat(),
                "organization_id": "demo-org-001",
                "owner_id": "demo-user-001",
                "team_members": ["demo-user-001"],
                "budget": {
                    "total_budget": 75000.0,
                    "spent_amount": 0.0,
                    "currency": "USD"
                },
                "milestones": [
                    {
                        "id": "milestone-003",
                        "title": "MVP Release", 
                        "description": "Minimum viable product release",
                        "due_date": (date.today() + timedelta(days=90)).isoformat(),
                        "completed": False,
                        "completed_at": None
                    }
                ],
                "settings": {
                    "auto_assign_tasks": True,
                    "require_time_tracking": True,
                    "allow_guest_access": False,
                    "notification_settings": {},
                    "custom_fields": {}
                },
                "tags": ["mobile", "ios", "android", "app"],
                "category": "development",
                "progress_percentage": 5.0,
                "task_count": 0,
                "completed_task_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert projects
        for project in projects_data:
            existing_project = await db.projects.find_one({"id": project["id"]})
            if existing_project:
                print(f"✅ Project {project['name']} already exists")
            else:
                await db.projects.insert_one(project)
                print(f"✅ Created project: {project['name']}")
        
        # Create timeline tasks for the first project
        timeline_tasks = [
            {
                "id": "task-timeline-001",
                "name": "Project Planning & Requirements",
                "description": "Define project scope and requirements",
                "project_id": "proj-demo-001",
                "duration": 40,  # hours
                "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
                "finish_date": (datetime.now() - timedelta(days=25)).isoformat(),
                "percent_complete": 100,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#dc2626"
            },
            {
                "id": "task-timeline-002",
                "name": "UI/UX Design Phase",
                "description": "Create wireframes and design mockups",
                "project_id": "proj-demo-001", 
                "duration": 80,  # hours
                "start_date": (datetime.now() - timedelta(days=25)).isoformat(),
                "finish_date": (datetime.now() - timedelta(days=15)).isoformat(),
                "percent_complete": 75,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#2563eb"
            },
            {
                "id": "task-timeline-003",
                "name": "Frontend Development",
                "description": "Implement React frontend components",
                "project_id": "proj-demo-001",
                "duration": 120,  # hours
                "start_date": (datetime.now() - timedelta(days=15)).isoformat(),
                "finish_date": (datetime.now() + timedelta(days=10)).isoformat(),
                "percent_complete": 45,
                "outline_level": 1,
                "summary_task": False,
                "critical": False,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#10b981"
            },
            {
                "id": "task-timeline-004",
                "name": "Backend API Development",
                "description": "Build REST API endpoints",
                "project_id": "proj-demo-001",
                "duration": 100,  # hours
                "start_date": (datetime.now() - timedelta(days=10)).isoformat(),
                "finish_date": (datetime.now() + timedelta(days=15)).isoformat(),
                "percent_complete": 30,
                "outline_level": 1,
                "summary_task": False,
                "critical": False,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#f59e0b"
            },
            {
                "id": "task-timeline-005",
                "name": "Testing & QA",
                "description": "Quality assurance and testing",
                "project_id": "proj-demo-001",
                "duration": 60,  # hours
                "start_date": (datetime.now() + timedelta(days=15)).isoformat(),
                "finish_date": (datetime.now() + timedelta(days=25)).isoformat(),
                "percent_complete": 0,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#8b5cf6"
            },
            {
                "id": "task-timeline-006",
                "name": "Deployment & Launch",
                "description": "Deploy to production and launch",
                "project_id": "proj-demo-001",
                "duration": 24,  # hours
                "start_date": (datetime.now() + timedelta(days=25)).isoformat(),
                "finish_date": (datetime.now() + timedelta(days=28)).isoformat(),
                "percent_complete": 0,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "assignee_ids": ["demo-user-001"],
                "milestone": True,
                "color": "#06b6d4"
            }
        ]
        
        # Insert timeline tasks
        for task in timeline_tasks:
            existing_task = await db.timeline_tasks.find_one({"id": task["id"]})
            if existing_task:
                print(f"✅ Timeline task {task['name']} already exists")
            else:
                await db.timeline_tasks.insert_one(task)
                print(f"✅ Created timeline task: {task['name']}")
        
        # Create task dependencies
        dependencies = [
            {
                "id": "dep-001",
                "predecessor_id": "task-timeline-001",
                "successor_id": "task-timeline-002",
                "dependency_type": "FS",  # Fixed: Use enum value
                "lag_duration": 0,
                "lag_format": "days",
                "project_id": "proj-demo-001",
                "created_by": "demo-user-001",  # Added required field
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "dep-002", 
                "predecessor_id": "task-timeline-002",
                "successor_id": "task-timeline-003",
                "dependency_type": "FS",  # Fixed: Use enum value
                "lag_duration": 0,
                "lag_format": "days",
                "project_id": "proj-demo-001",
                "created_by": "demo-user-001",  # Added required field
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "dep-003",
                "predecessor_id": "task-timeline-002",
                "successor_id": "task-timeline-004",
                "dependency_type": "FS",  # Fixed: Use enum value
                "lag_duration": 8,  # 1 day lag
                "lag_format": "days",
                "project_id": "proj-demo-001",
                "created_by": "demo-user-001",  # Added required field
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "dep-004",
                "predecessor_id": "task-timeline-003",
                "successor_id": "task-timeline-005",
                "dependency_type": "FS",  # Fixed: Use enum value
                "lag_duration": 0,
                "lag_format": "days",
                "project_id": "proj-demo-001",
                "created_by": "demo-user-001",  # Added required field
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "dep-005",
                "predecessor_id": "task-timeline-004",
                "successor_id": "task-timeline-005",
                "dependency_type": "FS",  # Fixed: Use enum value
                "lag_duration": 0,
                "lag_format": "days",
                "project_id": "proj-demo-001",
                "created_by": "demo-user-001",  # Added required field
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": "dep-006",
                "predecessor_id": "task-timeline-005",
                "successor_id": "task-timeline-006",
                "dependency_type": "FS",  # Fixed: Use enum value
                "lag_duration": 0,
                "lag_format": "days",
                "project_id": "proj-demo-001",
                "created_by": "demo-user-001",  # Added required field
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert dependencies
        for dep in dependencies:
            existing_dep = await db.task_dependencies.find_one({"id": dep["id"]})
            if existing_dep:
                print(f"✅ Dependency {dep['id']} already exists")
            else:
                await db.task_dependencies.insert_one(dep)
                print(f"✅ Created dependency: {dep['id']}")
        
        # Update organization project count
        await db.organizations.update_one(
            {"id": "demo-org-001"},
            {"$set": {"project_count": 2}}
        )
        
        print("🎉 Demo projects and timeline data created successfully!")
        print("📋 Created:")
        print("   - 2 demo projects")
        print("   - 6 timeline tasks with dates spanning 2 months")
        print("   - 6 task dependencies forming a critical path")
        print("   - Milestones and progress tracking")
        
    except Exception as e:
        print(f"❌ Error creating demo projects: {e}")
        raise
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(create_demo_projects())