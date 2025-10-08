"""
Create Enhanced Demo Activity Data
Generates comprehensive activity logs for demonstration
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from database import connect_to_mongo, get_database
import random

# Sample activities with realistic descriptions
ACTIVITY_TEMPLATES = [
    {
        "entity_type": "project",
        "action_type": "viewed",
        "description": "Viewed project overview tab",
        "tab_name": "overview"
    },
    {
        "entity_type": "project", 
        "action_type": "tab_viewed",
        "description": "Navigated to timeline tab",
        "tab_name": "timeline"
    },
    {
        "entity_type": "task",
        "action_type": "created",
        "description": "Created new task: {task_name}",
        "tab_name": "tasks"
    },
    {
        "entity_type": "task",
        "action_type": "status_changed",
        "description": "Updated task status from {old_status} to {new_status}",
        "tab_name": "tasks"
    },
    {
        "entity_type": "milestone",
        "action_type": "completed", 
        "description": "Completed milestone: {milestone_name}",
        "tab_name": "milestones"
    },
    {
        "entity_type": "comment",
        "action_type": "commented",
        "description": "Added comment: {comment_preview}",
        "tab_name": "activity"
    },
    {
        "entity_type": "file",
        "action_type": "uploaded",
        "description": "Uploaded file: {file_name}",
        "tab_name": "files"
    },
    {
        "entity_type": "project",
        "action_type": "updated",
        "description": "Updated project description",
        "tab_name": "overview"
    },
    {
        "entity_type": "team",
        "action_type": "member_added",
        "description": "Added team member: {member_name}",
        "tab_name": "team"
    },
    {
        "entity_type": "analytics",
        "action_type": "viewed",
        "description": "Viewed project analytics dashboard",
        "tab_name": "analytics"
    }
]

# Sample data for dynamic content
SAMPLE_TASKS = ["User Authentication", "Database Integration", "UI Design", "API Development", "Testing Suite"]
SAMPLE_MILESTONES = ["MVP Launch", "Beta Release", "Production Deploy", "Feature Complete"]
SAMPLE_FILES = ["requirements.pdf", "design_mockup.png", "database_schema.sql", "user_guide.docx"]
SAMPLE_MEMBERS = ["Alice Johnson", "Bob Smith", "Carol Chen", "David Wilson"]
SAMPLE_COMMENTS = [
    "Great progress on this task!",
    "Need to review the implementation details",
    "This milestone is looking good to go",
    "Should we consider adding more tests?",
    "The design looks fantastic!"
]

async def create_enhanced_demo_activities():
    """Create comprehensive demo activities"""
    
    # Connect to database
    await connect_to_mongo()
    db = await get_database()
    
    # Get demo organization and project
    demo_org = await db.organizations.find_one({"id": "demo-org-001"})
    if not demo_org:
        print("❌ Demo organization not found")
        return
        
    demo_projects = await db.projects.find({"organization_id": "demo-org-001"}).to_list(length=5)
    if not demo_projects:
        print("❌ No demo projects found")
        return
        
    demo_user = await db.users.find_one({"email": "demo@company.com"})
    if not demo_user:
        print("❌ Demo user not found")
        return
    
    print(f"🎯 Creating enhanced activity data for {len(demo_projects)} projects...")
    
    activities_created = 0
    
    for project in demo_projects:
        project_id = project["id"]
        
        # Create activities for the past 30 days
        start_date = datetime.utcnow() - timedelta(days=30)
        
        # Generate 50-100 activities per project
        num_activities = random.randint(50, 100)
        
        for i in range(num_activities):
            # Random timestamp within the past 30 days
            random_days = random.randint(0, 30)
            random_hours = random.randint(0, 23) 
            random_minutes = random.randint(0, 59)
            
            activity_time = start_date + timedelta(
                days=random_days,
                hours=random_hours, 
                minutes=random_minutes
            )
            
            # Choose random activity template
            template = random.choice(ACTIVITY_TEMPLATES)
            
            # No geolocation data generated
            
            # Generate dynamic description based on template
            description = template["description"]
            metadata = {}
            
            if "{task_name}" in description:
                task_name = random.choice(SAMPLE_TASKS)
                description = description.format(task_name=task_name)
                metadata["task_name"] = task_name
                
            elif "{milestone_name}" in description:
                milestone_name = random.choice(SAMPLE_MILESTONES)
                description = description.format(milestone_name=milestone_name)
                metadata["milestone_name"] = milestone_name
                
            elif "{file_name}" in description:
                file_name = random.choice(SAMPLE_FILES)
                description = description.format(file_name=file_name)
                metadata["file_name"] = file_name
                
            elif "{member_name}" in description:
                member_name = random.choice(SAMPLE_MEMBERS)
                description = description.format(member_name=member_name)
                metadata["member_name"] = member_name
                
            elif "{comment_preview}" in description:
                comment = random.choice(SAMPLE_COMMENTS)
                description = description.format(comment_preview=comment)
                metadata["comment_preview"] = comment
                
            elif "{old_status}" in description and "{new_status}" in description:
                old_status = random.choice(["todo", "in_progress"])
                new_status = random.choice(["in_progress", "completed", "in_review"])
                description = description.format(old_status=old_status, new_status=new_status)
                metadata.update({"old_status": old_status, "new_status": new_status})
            
            # Create activity document
            activity_doc = {
                "id": str(uuid.uuid4()),
                "entity_type": template["entity_type"],
                "entity_id": str(uuid.uuid4()),  # Random entity ID
                "action_type": template["action_type"],
                "user_id": demo_user["id"],
                "user_name": f"{demo_user['first_name']} {demo_user['last_name']}",
                "user_email": demo_user["email"],
                "description": description,
                "metadata": metadata,
                "organization_id": demo_org["id"],
                "project_id": project_id,
                "task_id": str(uuid.uuid4()) if template["entity_type"] == "task" else None,
                # Enhanced tracking fields (geolocation removed)
                "location_timestamp": activity_time.isoformat() if location else None,
                # Enhanced tracking fields
                "tab_name": template["tab_name"],
                "session_id": f"session_{random.randint(1000, 9999)}_{random.randint(100, 999)}",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "ip_address": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
                "created_at": activity_time.isoformat()
            }
            
            # Insert activity
            await db.activities.insert_one(activity_doc)
            activities_created += 1
            
            # Show progress every 50 activities
            if activities_created % 50 == 0:
                print(f"✅ Created {activities_created} activities...")
    
    print(f"🎉 Successfully created {activities_created} enhanced demo activities!")
    print(f"📊 Activities include:")
    print(f"   - Geolocation data ({int(activities_created * 0.8)} activities with location)")
    print(f"   - Tab navigation tracking")
    print(f"   - Session and user agent information")
    print(f"   - Comprehensive metadata")
    
    # Show some statistics
    await show_activity_stats(db)

async def show_activity_stats(db):
    """Show statistics about created activities"""
    
    # Count activities by type
    pipeline = [
        {"$group": {"_id": "$action_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    action_stats = await db.activities.aggregate(pipeline).to_list(length=None)
    
    print("\n📈 Activity Statistics by Action Type:")
    for stat in action_stats:
        print(f"   {stat['_id']}: {stat['count']} activities")
    
    # Count activities with geolocation
    geo_count = await db.activities.count_documents({"geolocation_enabled": True})
    total_count = await db.activities.count_documents({})
    
    print(f"\n🌍 Geolocation Statistics:")
    print(f"   Total activities: {total_count}")
    print(f"   With geolocation: {geo_count} ({(geo_count/total_count*100):.1f}%)")
    print(f"   Without geolocation: {total_count - geo_count} ({((total_count-geo_count)/total_count*100):.1f}%)")

async def main():
    """Main function"""
    print("🚀 Starting Enhanced Demo Activity Data Creation...")
    print("=" * 60)
    
    try:
        await create_enhanced_demo_activities()
        print("\n✅ Demo activity data creation completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error creating demo data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())