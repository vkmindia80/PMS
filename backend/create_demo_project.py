"""
Create Demo Project for Activity Testing
"""

import asyncio
import uuid
from datetime import datetime
from database import connect_to_mongo, get_database

async def create_demo_project():
    """Create a demo project for testing"""
    
    # Connect to database
    await connect_to_mongo()
    db = await get_database()
    
    # Get demo organization and user
    demo_org = await db.organizations.find_one({"id": "demo-org-001"})
    if not demo_org:
        print("❌ Demo organization not found")
        return
        
    demo_user = await db.users.find_one({"email": "demo@company.com"})
    if not demo_user:
        print("❌ Demo user not found")
        return
    
    # Check if demo project already exists
    existing_project = await db.projects.find_one({
        "name": "Demo Project - Activity Tracking",
        "organization_id": "demo-org-001"
    })
    
    if existing_project:
        print(f"✅ Demo project already exists: {existing_project['id']}")
        return existing_project['id']
    
    # Create demo project
    project_id = str(uuid.uuid4())
    project_doc = {
        "id": project_id,
        "name": "Demo Project - Activity Tracking",
        "description": "A demonstration project showcasing enhanced activity tracking. This project includes various tasks, milestones, and team activities to demonstrate the comprehensive logging capabilities.",
        "status": "active",
        "priority": "medium",
        "visibility": "team",
        "start_date": datetime.utcnow().isoformat(),
        "due_date": None,
        "organization_id": "demo-org-001",
        "owner_id": demo_user["id"],
        "team_members": [demo_user["id"]],
        "budget": {
            "total_budget": 50000,
            "spent_amount": 12500,
            "currency": "USD"
        },
        "milestones": [
            {
                "id": str(uuid.uuid4()),
                "title": "Project Setup Complete",
                "description": "Initial project configuration and team setup",
                "due_date": None,
                "completed": True,
                "completed_at": datetime.utcnow().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Development Phase",
                "description": "Core feature development and implementation",
                "due_date": None,
                "completed": False,
                "completed_at": None
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Testing & QA",
                "description": "Comprehensive testing and quality assurance",
                "due_date": None,
                "completed": False,
                "completed_at": None
            }
        ],
        "settings": {
            "notifications_enabled": True,
            "time_tracking_enabled": True,
            "budget_tracking_enabled": True
        },
        "tags": ["demo", "activity-tracking", "geolocation"],
        "category": "Software Development",
        "progress_percentage": 35,
        "task_count": 8,
        "completed_task_count": 3,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert project
    result = await db.projects.insert_one(project_doc)
    
    if result.inserted_id:
        print(f"✅ Created demo project: {project_id}")
        return project_id
    else:
        print("❌ Failed to create demo project")
        return None

async def main():
    """Main function"""
    print("🚀 Creating Demo Project...")
    
    try:
        project_id = await create_demo_project()
        if project_id:
            print(f"🎉 Demo project created successfully: {project_id}")
        else:
            print("❌ Failed to create demo project")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())