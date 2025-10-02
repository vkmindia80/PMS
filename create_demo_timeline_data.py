#!/usr/bin/env python3
"""
Create demo timeline data for testing the enhanced drag-and-drop Gantt chart
"""

import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

async def create_demo_data():
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["enterprise_portfolio_db"]
    
    project_id = "proj-73b14a2d38f8"
    user_id = "demo-user-001"
    org_id = "demo-org-001"
    
    # Create demo tasks
    base_date = datetime.now()
    
    tasks = [
        {
            "id": str(uuid.uuid4()),
            "title": "Project Planning & Requirements",
            "description": "Initial project setup, requirements gathering, and stakeholder analysis",
            "project_id": project_id,
            "organization_id": org_id,
            "assignee_id": user_id,
            "reporter_id": user_id,
            "status": "completed",
            "priority": "high",
            "type": "epic",
            "due_date": base_date + timedelta(days=5),
            "start_date": base_date,
            "progress_percentage": 100.0,
            "time_tracking": {
                "estimated_hours": 16.0,
                "actual_hours": 14.0,
                "logged_time": []
            },
            "tags": ["planning", "requirements"],
            "labels": ["phase1"],
            "custom_fields": {},
            "dependencies": [],
            "subtasks": [],
            "created_at": base_date,
            "updated_at": base_date,
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [user_id]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Database Design & Architecture",
            "description": "Design database schema, entity relationships, and data architecture",
            "project_id": project_id,
            "organization_id": org_id,
            "assignee_id": user_id,
            "reporter_id": user_id,
            "status": "in_progress",
            "priority": "high",
            "type": "task",
            "due_date": base_date + timedelta(days=10),
            "start_date": base_date + timedelta(days=5),
            "progress_percentage": 75.0,
            "time_tracking": {
                "estimated_hours": 24.0,
                "actual_hours": 18.0,
                "logged_time": []
            },
            "tags": ["database", "architecture"],
            "labels": ["phase2"],
            "custom_fields": {},
            "dependencies": [],
            "subtasks": [],
            "created_at": base_date,
            "updated_at": base_date + timedelta(hours=2),
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [user_id]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Frontend UI/UX Design",
            "description": "Create wireframes, mockups, and user interface designs",
            "project_id": project_id,
            "organization_id": org_id,
            "assignee_id": user_id,
            "reporter_id": user_id,
            "status": "todo",
            "priority": "medium",
            "type": "task",
            "due_date": base_date + timedelta(days=15),
            "start_date": base_date + timedelta(days=8),
            "progress_percentage": 0.0,
            "time_tracking": {
                "estimated_hours": 32.0,
                "actual_hours": 0.0,
                "logged_time": []
            },
            "tags": ["frontend", "design", "ui"],
            "labels": ["phase2"],
            "custom_fields": {},
            "dependencies": [],
            "subtasks": [],
            "created_at": base_date,
            "updated_at": base_date,
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [user_id]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Backend API Development",
            "description": "Implement REST API endpoints, authentication, and business logic",
            "project_id": project_id,
            "organization_id": org_id,
            "assignee_id": user_id,
            "reporter_id": user_id,
            "status": "in_progress",
            "priority": "critical",
            "type": "task",
            "due_date": base_date + timedelta(days=20),
            "start_date": base_date + timedelta(days=10),
            "progress_percentage": 45.0,
            "time_tracking": {
                "estimated_hours": 40.0,
                "actual_hours": 22.0,
                "logged_time": []
            },
            "tags": ["backend", "api", "development"],
            "labels": ["phase3"],
            "custom_fields": {},
            "dependencies": [],
            "subtasks": [],
            "created_at": base_date,
            "updated_at": base_date + timedelta(hours=5),
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [user_id]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Frontend Component Development",
            "description": "Build React components, integrate with APIs, and implement user interactions",
            "project_id": project_id,
            "organization_id": org_id,
            "assignee_id": user_id,
            "reporter_id": user_id,
            "status": "todo",
            "priority": "high",
            "type": "task",
            "due_date": base_date + timedelta(days=25),
            "start_date": base_date + timedelta(days=15),
            "progress_percentage": 0.0,
            "time_tracking": {
                "estimated_hours": 48.0,
                "actual_hours": 0.0,
                "logged_time": []
            },
            "tags": ["frontend", "react", "components"],
            "labels": ["phase3"],
            "custom_fields": {},
            "dependencies": [],
            "subtasks": [],
            "created_at": base_date,
            "updated_at": base_date,
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [user_id]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Testing & Quality Assurance",
            "description": "Unit testing, integration testing, and quality assurance activities",
            "project_id": project_id,
            "organization_id": org_id,
            "assignee_id": user_id,
            "reporter_id": user_id,
            "status": "todo",
            "priority": "medium",
            "type": "task",
            "due_date": base_date + timedelta(days=30),
            "start_date": base_date + timedelta(days=20),
            "progress_percentage": 0.0,
            "time_tracking": {
                "estimated_hours": 24.0,
                "actual_hours": 0.0,
                "logged_time": []
            },
            "tags": ["testing", "qa", "quality"],
            "labels": ["phase4"],
            "custom_fields": {},
            "dependencies": [],
            "subtasks": [],
            "created_at": base_date,
            "updated_at": base_date,
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [user_id]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Deployment & Launch",
            "description": "Production deployment, monitoring setup, and launch activities",
            "project_id": project_id,
            "organization_id": org_id,
            "assignee_id": user_id,
            "reporter_id": user_id,
            "status": "todo",
            "priority": "high",
            "type": "milestone",
            "due_date": base_date + timedelta(days=35),
            "start_date": base_date + timedelta(days=30),
            "progress_percentage": 0.0,
            "time_tracking": {
                "estimated_hours": 16.0,
                "actual_hours": 0.0,
                "logged_time": []
            },
            "tags": ["deployment", "launch", "milestone"],
            "labels": ["phase4"],
            "custom_fields": {},
            "dependencies": [],
            "subtasks": [],
            "created_at": base_date,
            "updated_at": base_date,
            "subtask_count": 0,
            "comment_count": 0,
            "attachment_count": 0,
            "activity_log": [],
            "watchers": [user_id]
        }
    ]
    
    # Insert tasks
    if tasks:
        await db.tasks.delete_many({"project_id": project_id})  # Clear existing
        result = await db.tasks.insert_many(tasks)
        print(f"✅ Created {len(result.inserted_ids)} demo tasks")
    
    # Create some dependencies
    task_ids = [task["id"] for task in tasks]
    dependencies = [
        {
            "id": str(uuid.uuid4()),
            "predecessor_id": task_ids[0],  # Planning -> Database
            "successor_id": task_ids[1],
            "dependency_type": "FS",  # Finish-to-Start
            "lag_duration": 0,
            "lag_format": "hours",
            "project_id": project_id,
            "created_by": user_id,
            "created_at": base_date,
            "updated_at": base_date
        },
        {
            "id": str(uuid.uuid4()),
            "predecessor_id": task_ids[1],  # Database -> Backend API
            "successor_id": task_ids[3],
            "dependency_type": "FS",
            "lag_duration": 8,  # 8 hour lag
            "lag_format": "hours",
            "project_id": project_id,
            "created_by": user_id,
            "created_at": base_date,
            "updated_at": base_date
        },
        {
            "id": str(uuid.uuid4()),
            "predecessor_id": task_ids[2],  # UI Design -> Frontend Dev
            "successor_id": task_ids[4],
            "dependency_type": "FS",
            "lag_duration": 0,
            "lag_format": "hours",
            "project_id": project_id,
            "created_by": user_id,
            "created_at": base_date,
            "updated_at": base_date
        },
        {
            "id": str(uuid.uuid4()),
            "predecessor_id": task_ids[3],  # Backend API -> Testing
            "successor_id": task_ids[5],
            "dependency_type": "FS",
            "lag_duration": 24,  # 1 day lag
            "lag_format": "hours",
            "project_id": project_id,
            "created_by": user_id,
            "created_at": base_date,
            "updated_at": base_date
        },
        {
            "id": str(uuid.uuid4()),
            "predecessor_id": task_ids[4],  # Frontend Dev -> Testing
            "successor_id": task_ids[5],
            "dependency_type": "FS",
            "lag_duration": 0,
            "lag_format": "hours",
            "project_id": project_id,
            "created_by": user_id,
            "created_at": base_date,
            "updated_at": base_date
        },
        {
            "id": str(uuid.uuid4()),
            "predecessor_id": task_ids[5],  # Testing -> Deployment
            "successor_id": task_ids[6],
            "dependency_type": "FS",
            "lag_duration": 8,
            "lag_format": "hours",
            "project_id": project_id,
            "created_by": user_id,
            "created_at": base_date,
            "updated_at": base_date
        }
    ]
    
    if dependencies:
        await db.task_dependencies.delete_many({"project_id": project_id})  # Clear existing
        result = await db.task_dependencies.insert_many(dependencies)
        print(f"✅ Created {len(result.inserted_ids)} task dependencies")
    
    client.close()
    print("🎉 Demo timeline data created successfully!")
    print(f"📋 Project ID: {project_id}")
    print("🔗 You can now test the enhanced drag-and-drop timeline!")

if __name__ == "__main__":
    asyncio.run(create_demo_data())