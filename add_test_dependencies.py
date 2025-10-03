#!/usr/bin/env python3
"""
Script to add test dependencies to existing tasks to verify the Related Tasks fix.
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime
import random

async def add_test_dependencies():
    """Add dependencies to existing tasks for testing"""
    print("🔄 Adding test dependencies to existing tasks...")
    
    # Connect to MongoDB
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["enterprise_portfolio_db"]
    
    try:
        # Get all tasks
        tasks = await db.tasks.find({"organization_id": "demo-org-001"}).to_list(length=None)
        print(f"📋 Found {len(tasks)} tasks")
        
        if len(tasks) < 3:
            print("❌ Need at least 3 tasks to create dependencies")
            return
        
        # Create some test dependencies
        updates = []
        
        # Make task 2 depend on task 1
        task1_id = tasks[0]["id"]
        task2_id = tasks[1]["id"]
        task3_id = tasks[2]["id"]
        
        print(f"🔗 Making '{tasks[1]['title'][:30]}...' depend on '{tasks[0]['title'][:30]}...'")
        updates.append({
            "updateOne": {
                "filter": {"id": task2_id},
                "update": {
                    "$set": {
                        "dependencies": [{"task_id": task1_id, "dependency_type": "blocks"}],
                        "updated_at": datetime.utcnow()
                    }
                }
            }
        })
        
        # Make task 3 depend on task 2
        print(f"🔗 Making '{tasks[2]['title'][:30]}...' depend on '{tasks[1]['title'][:30]}...'")
        updates.append({
            "updateOne": {
                "filter": {"id": task3_id},
                "update": {
                    "$set": {
                        "dependencies": [{"task_id": task2_id, "dependency_type": "blocks"}],
                        "updated_at": datetime.utcnow()
                    }
                }
            }
        })
        
        # Also make task 3 depend on task 1 (multiple dependencies)
        print(f"🔗 Adding additional dependency: '{tasks[2]['title'][:30]}...' also depends on '{tasks[0]['title'][:30]}...'")
        updates.append({
            "updateOne": {
                "filter": {"id": task3_id},
                "update": {
                    "$set": {
                        "dependencies": [
                            {"task_id": task1_id, "dependency_type": "blocks"}, 
                            {"task_id": task2_id, "dependency_type": "blocks"}
                        ],
                        "updated_at": datetime.utcnow()
                    }
                }
            }
        })
        
        # Execute updates one by one
        if updates:
            modified_count = 0
            for update in updates[:-1]:  # Skip the duplicate
                filter_doc = update["updateOne"]["filter"]
                update_doc = update["updateOne"]["update"]
                result = await db.tasks.update_one(filter_doc, update_doc)
                modified_count += result.modified_count
            print(f"✅ Updated {modified_count} tasks with dependencies")
        
        # Print summary of created dependencies
        print("\n📊 Dependency Summary:")
        print(f"Task 1: {tasks[0]['title'][:40]} (ID: {task1_id[:8]}...)")
        print(f"Task 2: {tasks[1]['title'][:40]} (ID: {task2_id[:8]}...) - depends on Task 1")
        print(f"Task 3: {tasks[2]['title'][:40]} (ID: {task3_id[:8]}...) - depends on Task 1 and Task 2")
        print(f"\n🎯 Test using Task 2 or Task 3 to see dependencies in action!")
        
    except Exception as e:
        print(f"❌ Error adding dependencies: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(add_test_dependencies())