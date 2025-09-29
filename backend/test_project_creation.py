#!/usr/bin/env python3
"""
Test script to debug project creation issue
"""
import asyncio
import sys
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from datetime import datetime

async def test_project_creation():
    try:
        await connect_to_mongo()
        db = await get_database()
        
        # Test simple project insertion
        test_project = {
            "id": "test-proj-001",
            "name": "Test Project",
            "description": "Test project description",
            "status": "active",
            "priority": "medium",
            "visibility": "team",
            "start_date": datetime.now().date(),
            "due_date": datetime.now().date(),
            "organization_id": "demo-org-001",
            "owner_id": "test-owner",
            "team_members": ["test-member"],
            "budget": {
                "total_budget": 100000,
                "spent_amount": 0,
                "currency": "USD"
            },
            "milestones": [],
            "settings": {
                "auto_assign_tasks": False,
                "require_time_tracking": True,
                "allow_guest_access": False
            },
            "tags": ["test"],
            "category": "Test",
            "progress_percentage": 0,
            "task_count": 0,
            "completed_task_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.projects.insert_one(test_project)
        print(f"Project insertion successful: {result.inserted_id}")
        
        # Clean up
        await db.projects.delete_one({"id": "test-proj-001"})
        print("Test project deleted")
        
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_project_creation())