#!/usr/bin/env python3
"""
Fix Time Tracking Data Inconsistencies

This script will:
1. Recalculate actual_hours based on logged_time entries
2. Ensure consistency between actual_hours and logged_time arrays
3. Fix any data inconsistencies in the time tracking
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def fix_time_tracking_data():
    """Fix time tracking data inconsistencies"""
    
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client['enterprise_portfolio_db']
    
    print("🔍 Analyzing time tracking data...")
    
    # Find all tasks with time tracking data
    tasks = []
    async for task in db.tasks.find({}):
        tasks.append(task)
    
    print(f"📊 Found {len(tasks)} tasks to analyze")
    
    fixed_count = 0
    
    for task in tasks:
        time_tracking = task.get('time_tracking', {})
        actual_hours = time_tracking.get('actual_hours', 0)
        logged_time = time_tracking.get('logged_time', [])
        
        # Calculate correct actual_hours from logged_time entries
        calculated_hours = sum(entry.get('hours', 0) for entry in logged_time)
        
        # Check if there's a discrepancy
        if abs(actual_hours - calculated_hours) > 0.001:  # Small tolerance for floating point
            print(f"📝 Task: {task['title']}")
            print(f"   Current actual_hours: {actual_hours}")
            print(f"   Calculated from logged_time: {calculated_hours}")
            print(f"   Logged entries: {len(logged_time)}")
            
            # Update the task with correct actual_hours
            await db.tasks.update_one(
                {"id": task["id"]},
                {
                    "$set": {
                        "time_tracking.actual_hours": calculated_hours
                    }
                }
            )
            
            fixed_count += 1
            print(f"   ✅ Fixed actual_hours: {calculated_hours}")
            print()
    
    print(f"🎉 Fixed {fixed_count} tasks with time tracking inconsistencies")
    
    # Verify the fix
    print("\n🔍 Verifying fixes...")
    verification_count = 0
    async for task in db.tasks.find({}):
        time_tracking = task.get('time_tracking', {})
        actual_hours = time_tracking.get('actual_hours', 0)
        logged_time = time_tracking.get('logged_time', [])
        calculated_hours = sum(entry.get('hours', 0) for entry in logged_time)
        
        if abs(actual_hours - calculated_hours) > 0.001:
            print(f"❌ Still inconsistent: {task['title']} - {actual_hours} vs {calculated_hours}")
        else:
            verification_count += 1
    
    print(f"✅ Verified {verification_count} tasks now have consistent time tracking")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_time_tracking_data())