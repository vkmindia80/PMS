"""
Add budget data to demo projects
"""

import asyncio
import uuid
from datetime import datetime, date, timedelta
from database import connect_to_mongo, get_database

async def add_budget_data():
    """Add budget data to existing projects and create more demo projects"""
    
    # Connect to database
    await connect_to_mongo()
    db = await get_database()
    
    print("🚀 Adding budget data to projects...")
    
    # Get demo organization and user
    demo_org = await db.organizations.find_one({"id": "demo-org-001"})
    demo_user = await db.users.find_one({"email": "demo@company.com"})
    
    if not demo_org or not demo_user:
        print("❌ Demo organization or user not found")
        return
    
    # Sample budget data for different projects
    budget_projects = [
        {
            "name": "E-Commerce Platform Development",
            "description": "Building a modern e-commerce platform with React and Node.js",
            "status": "active",
            "priority": "high",
            "category": "Software Development",
            "budget": {
                "total_budget": 150000.0,
                "spent_amount": 95000.0,
                "currency": "USD"
            },
            "progress_percentage": 65,
            "tags": ["web-development", "e-commerce", "react"]
        },
        {
            "name": "Marketing Campaign Q4 2025",
            "description": "Comprehensive marketing campaign for product launch in Q4",
            "status": "active",
            "priority": "high",
            "category": "Marketing",
            "budget": {
                "total_budget": 75000.0,
                "spent_amount": 28000.0,
                "currency": "USD"
            },
            "progress_percentage": 40,
            "tags": ["marketing", "campaign", "product-launch"]
        },
        {
            "name": "Mobile App Redesign",
            "description": "Complete redesign of the mobile application with new UI/UX",
            "status": "active",
            "priority": "medium",
            "category": "Design",
            "budget": {
                "total_budget": 85000.0,
                "spent_amount": 72000.0,
                "currency": "USD"
            },
            "progress_percentage": 80,
            "tags": ["mobile", "design", "ui-ux"]
        },
        {
            "name": "Infrastructure Upgrade",
            "description": "Upgrading cloud infrastructure and implementing DevOps practices",
            "status": "on_hold",
            "priority": "medium",
            "category": "Infrastructure",
            "budget": {
                "total_budget": 120000.0,
                "spent_amount": 45000.0,
                "currency": "USD"
            },
            "progress_percentage": 30,
            "tags": ["infrastructure", "devops", "cloud"]
        },
        {
            "name": "Data Analytics Platform",
            "description": "Building internal data analytics and reporting platform",
            "status": "active",
            "priority": "critical",
            "category": "Data Science",
            "budget": {
                "total_budget": 200000.0,
                "spent_amount": 180000.0,
                "currency": "USD"
            },
            "progress_percentage": 90,
            "tags": ["data", "analytics", "reporting"]
        },
        {
            "name": "Customer Support Portal",
            "description": "Self-service customer support portal with knowledge base",
            "status": "completed",
            "priority": "medium",
            "category": "Customer Service",
            "budget": {
                "total_budget": 60000.0,
                "spent_amount": 58000.0,
                "currency": "USD"
            },
            "progress_percentage": 100,
            "tags": ["support", "portal", "knowledge-base"]
        },
        {
            "name": "Security Audit & Compliance",
            "description": "Comprehensive security audit and compliance implementation",
            "status": "active",
            "priority": "critical",
            "category": "Security",
            "budget": {
                "total_budget": 90000.0,
                "spent_amount": 105000.0,  # Over budget example
                "currency": "USD"
            },
            "progress_percentage": 95,
            "tags": ["security", "audit", "compliance"]
        }
    ]
    
    created_projects = []
    
    for project_data in budget_projects:
        # Check if project already exists
        existing = await db.projects.find_one({
            "name": project_data["name"],
            "organization_id": "demo-org-001"
        })
        
        if existing:
            print(f"⚠️ Project '{project_data['name']}' already exists, skipping...")
            continue
        
        # Generate project ID
        project_id = f"proj-{uuid.uuid4().hex[:12]}"
        
        # Prepare project document
        project_doc = {
            "id": project_id,
            "name": project_data["name"],
            "description": project_data["description"],
            "status": project_data["status"],
            "priority": project_data["priority"],
            "visibility": "team",
            "category": project_data.get("category"),
            "tags": project_data.get("tags", []),
            "start_date": (date.today() - timedelta(days=60)).isoformat(),
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "organization_id": "demo-org-001",
            "owner_id": demo_user["id"],
            "team_members": [demo_user["id"]],
            "budget": project_data["budget"],
            "progress_percentage": project_data["progress_percentage"],
            "task_count": 8,  # Mock task count
            "completed_task_count": int(project_data["progress_percentage"] / 100 * 8),
            "milestones": [],
            "settings": {
                "auto_assign_tasks": False,
                "require_time_tracking": True,
                "allow_guest_access": False,
                "notification_settings": {},
                "custom_fields": {}
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert project
        result = await db.projects.insert_one(project_doc)
        if result.inserted_id:
            created_projects.append(project_id)
            print(f"✅ Created project: {project_data['name']} ({project_id})")
        else:
            print(f"❌ Failed to create project: {project_data['name']}")
    
    # Update organization project count
    if created_projects:
        await db.organizations.update_one(
            {"id": "demo-org-001"},
            {"$inc": {"project_count": len(created_projects)}}
        )
    
    print(f"\n🎉 Created {len(created_projects)} demo projects with budget data")
    print("💰 Budget scenarios included:")
    print("   - Normal projects within budget")
    print("   - High utilization projects (80%+)")
    print("   - Over budget project (Security Audit)")
    print("   - Completed project")
    print("   - On-hold project")
    
    # Test the cost analytics endpoint
    print("\n📊 Testing cost analytics...")
    total_projects = await db.projects.count_documents({"organization_id": "demo-org-001"})
    total_budget = 0
    total_spent = 0
    
    async for project in db.projects.find({"organization_id": "demo-org-001"}):
        budget = project.get("budget", {})
        total_budget += budget.get("total_budget", 0) or 0
        total_spent += budget.get("spent_amount", 0) or 0
    
    print(f"   - Total Projects: {total_projects}")
    print(f"   - Total Budget: ${total_budget:,.2f}")
    print(f"   - Total Spent: ${total_spent:,.2f}")
    print(f"   - Budget Utilization: {(total_spent/total_budget*100):.1f}%" if total_budget > 0 else "   - Budget Utilization: 0%")

if __name__ == "__main__":
    asyncio.run(add_budget_data())