#!/usr/bin/env python3
"""
Simple Demo Data Creator - Bypasses bcrypt issues
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
import uuid
import random

sys.path.append('/app/backend')

from database import connect_to_mongo, get_database

async def create_simple_demo_data():
    """Create simple demo data without password hashing"""
    try:
        print("🚀 Starting simple demo data creation...")
        
        # Connect to database
        await connect_to_mongo()
        db = await get_database()
        
        # Clear existing non-user data
        collections_to_clear = ['projects', 'tasks', 'comments', 'files']
        for collection in collections_to_clear:
            await db[collection].delete_many({"organization_id": "demo-org-001"})
            
        # Create sample projects
        projects_data = []
        for i in range(8):
            project_id = str(uuid.uuid4())
            project = {
                "id": project_id,
                "name": f"Enterprise Project {i+1}",
                "description": f"Comprehensive enterprise project for Phase 4.1 demonstration",
                "status": random.choice(["planning", "active", "completed"]),
                "priority": random.choice(["low", "medium", "high", "critical"]),
                "type": "software_development",
                "organization_id": "demo-org-001",
                "owner_id": "demo-user-001",
                "team_members": [{"user_id": "demo-user-001", "role": "owner"}],
                "budget": {
                    "total_budget": random.randint(50000, 200000),
                    "spent_amount": random.randint(10000, 100000),
                    "currency": "USD"
                },
                "progress_percentage": random.randint(10, 95),
                "start_date": (datetime.utcnow() - timedelta(days=random.randint(30, 180))).isoformat(),
                "due_date": (datetime.utcnow() + timedelta(days=random.randint(30, 180))).isoformat(),
                "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 300)),
                "updated_at": datetime.utcnow()
            }
            projects_data.append(project)
        
        await db.projects.insert_many(projects_data)
        print(f"✅ Created {len(projects_data)} projects")
        
        # Create sample tasks
        tasks_data = []
        for project in projects_data:
            for j in range(random.randint(8, 15)):
                task_id = str(uuid.uuid4())
                task = {
                    "id": task_id,
                    "title": f"Task {j+1} for {project['name']}",
                    "description": f"Important task for project completion",
                    "status": random.choice(["todo", "in_progress", "completed", "blocked"]),
                    "priority": random.choice(["low", "medium", "high", "critical"]),
                    "project_id": project["id"],
                    "assignee_id": "demo-user-001",
                    "reporter_id": "demo-user-001",
                    "organization_id": "demo-org-001",
                    "estimated_hours": random.randint(4, 40),
                    "actual_hours": random.randint(0, 35),
                    "start_date": datetime.utcnow().isoformat(),
                    "due_date": (datetime.utcnow() + timedelta(days=random.randint(1, 30))).isoformat(),
                    "tags": random.sample(["frontend", "backend", "testing", "deployment"], k=2),
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                    "updated_at": datetime.utcnow()
                }
                tasks_data.append(task)
        
        await db.tasks.insert_many(tasks_data)
        print(f"✅ Created {len(tasks_data)} tasks")
        
        # Create sample comments
        comments_data = []
        for i, project in enumerate(projects_data[:4]):
            comment = {
                "id": str(uuid.uuid4()),
                "content": f"Great progress on {project['name']}! The team is doing excellent work.",
                "entity_type": "project",
                "entity_id": project["id"],
                "author_id": "demo-user-001",
                "organization_id": "demo-org-001",
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "updated_at": datetime.utcnow()
            }
            comments_data.append(comment)
        
        await db.comments.insert_many(comments_data)
        print(f"✅ Created {len(comments_data)} comments")
        
        # Create sample files
        files_data = []
        file_names = ["requirements.pdf", "design_mockup.png", "architecture.docx", "test_plan.pdf"]
        for i, project in enumerate(projects_data[:4]):
            file_data = {
                "id": str(uuid.uuid4()),
                "name": file_names[i],
                "type": "document",
                "size": random.randint(1024, 5242880),
                "entity_type": "project", 
                "entity_id": project["id"],
                "uploaded_by": "demo-user-001",
                "organization_id": "demo-org-001",
                "url": f"/files/{project['id']}/{file_names[i]}",
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                "updated_at": datetime.utcnow()
            }
            files_data.append(file_data)
        
        await db.files.insert_many(files_data)
        print(f"✅ Created {len(files_data)} files")
        
        # Display final summary
        print("\n" + "="*60)
        print("📊 DEMO DATA CREATION SUMMARY")
        print("="*60)
        
        final_counts = {}
        collections = ["organizations", "users", "teams", "projects", "tasks", "comments", "files"]
        for collection_name in collections:
            if collection_name == "organizations":
                count = await db[collection_name].count_documents({"id": "demo-org-001"})
            else:
                count = await db[collection_name].count_documents({"organization_id": "demo-org-001"})
            final_counts[collection_name] = count
            print(f"{collection_name.capitalize():12}: {count:3} items")
        
        print(f"\n🌐 Access the system:")
        print(f"• Frontend: http://localhost:3000")
        print(f"• Backend API: http://localhost:8001")
        print(f"• Demo Login: demo@company.com / demo123456")
        
        print("\n✅ Simple demo data creation completed successfully!")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating demo data: {e}")
        return False

async def main():
    success = await create_simple_demo_data()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)