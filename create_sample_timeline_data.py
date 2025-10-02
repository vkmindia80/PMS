#!/usr/bin/env python3

import asyncio
import sys
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from datetime import datetime, timedelta
import uuid

async def create_sample_timeline_data():
    """Create sample timeline and project data for testing"""
    
    try:
        await connect_to_mongo()
        db = await get_database()
        
        print("🚀 Creating sample timeline data...")
        
        # Create a sample project first
        project_id = f"proj-{uuid.uuid4().hex[:12]}"
        sample_project = {
            "id": project_id,
            "name": "Sample Project for Timeline",
            "description": "A sample project to test timeline functionality",
            "status": "active",
            "priority": "high",
            "organization_id": "demo-org-001",
            "owner_id": "demo-user-001",
            "team_members": ["demo-user-001"],
            "start_date": datetime.utcnow().isoformat(),
            "due_date": (datetime.utcnow() + timedelta(days=60)).isoformat(),
            "progress_percentage": 25,
            "task_count": 0,
            "completed_task_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert project
        await db.projects.insert_one(sample_project)
        print(f"✅ Created project: {project_id}")
        
        # Create timeline tasks for this project
        timeline_tasks = [
            {
                "id": f"task-{uuid.uuid4().hex[:8]}",
                "name": "Project Planning",
                "description": "Define project scope and requirements",
                "project_id": project_id,
                "duration": 40,  # 40 hours = 5 days
                "start_date": datetime.utcnow(),
                "finish_date": datetime.utcnow() + timedelta(days=5),
                "percent_complete": 80,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#2563eb",
                "work": 40,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": f"task-{uuid.uuid4().hex[:8]}",
                "name": "Requirements Analysis",
                "description": "Analyze and document requirements",
                "project_id": project_id,
                "duration": 24,  # 24 hours = 3 days
                "start_date": datetime.utcnow() + timedelta(days=5),
                "finish_date": datetime.utcnow() + timedelta(days=8),
                "percent_complete": 60,
                "outline_level": 1,
                "summary_task": False,
                "critical": False,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#10b981",
                "work": 24,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": f"task-{uuid.uuid4().hex[:8]}",
                "name": "Design Phase",
                "description": "Create system design and architecture",
                "project_id": project_id,
                "duration": 32,  # 32 hours = 4 days
                "start_date": datetime.utcnow() + timedelta(days=8),
                "finish_date": datetime.utcnow() + timedelta(days=12),
                "percent_complete": 25,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#dc2626",
                "work": 32,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": f"task-{uuid.uuid4().hex[:8]}",
                "name": "Development Sprint 1",
                "description": "First development sprint",
                "project_id": project_id,
                "duration": 80,  # 80 hours = 10 days
                "start_date": datetime.utcnow() + timedelta(days=12),
                "finish_date": datetime.utcnow() + timedelta(days=22),
                "percent_complete": 0,
                "outline_level": 1,
                "summary_task": False,
                "critical": False,
                "assignee_ids": ["demo-user-001"],
                "milestone": False,
                "color": "#7c3aed",
                "work": 80,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": f"milestone-{uuid.uuid4().hex[:8]}",
                "name": "Phase 1 Complete",
                "description": "Completion of phase 1",
                "project_id": project_id,
                "duration": 0,
                "start_date": datetime.utcnow() + timedelta(days=22),
                "finish_date": datetime.utcnow() + timedelta(days=22),
                "percent_complete": 0,
                "outline_level": 1,
                "summary_task": False,
                "critical": True,
                "assignee_ids": [],
                "milestone": True,
                "color": "#f59e0b",
                "work": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert timeline tasks
        await db.timeline_tasks.insert_many(timeline_tasks)
        print(f"✅ Created {len(timeline_tasks)} timeline tasks")
        
        # Create some task dependencies
        task_ids = [task["id"] for task in timeline_tasks if not task["milestone"]]
        dependencies = [
            {
                "id": f"dep-{uuid.uuid4().hex[:8]}",
                "predecessor_id": task_ids[0],  # Project Planning
                "successor_id": task_ids[1],    # Requirements Analysis
                "dependency_type": "FS",
                "lag_duration": 0,
                "project_id": project_id,
                "created_by": "demo-user-001",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": f"dep-{uuid.uuid4().hex[:8]}",
                "predecessor_id": task_ids[1],  # Requirements Analysis
                "successor_id": task_ids[2],    # Design Phase
                "dependency_type": "FS",
                "lag_duration": 0,
                "project_id": project_id,
                "created_by": "demo-user-001",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": f"dep-{uuid.uuid4().hex[:8]}",
                "predecessor_id": task_ids[2],  # Design Phase
                "successor_id": task_ids[3],    # Development Sprint 1
                "dependency_type": "FS",
                "lag_duration": 0,
                "project_id": project_id,
                "created_by": "demo-user-001",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        await db.task_dependencies.insert_many(dependencies)
        print(f"✅ Created {len(dependencies)} task dependencies")
        
        print(f"""
🎉 Sample timeline data created successfully!
   - Project ID: {project_id}
   - Tasks: {len(timeline_tasks)}
   - Dependencies: {len(dependencies)}
   
   You can now test the timeline functionality with this data.
        """)
        
        return project_id
        
    except Exception as e:
        print(f"❌ Error creating sample timeline data: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_sample_timeline_data())