#!/usr/bin/env python3
"""
Enhanced Demo Data Creation Script for Enterprise Portfolio Management System
Creates realistic demo data for analytics and visualization
"""

import asyncio
import random
from datetime import datetime, timedelta
from database import connect_to_mongo, get_database
from auth.utils import hash_password
import uuid

# Sample data for realistic demo
COMPANY_NAMES = [
    "Acme Corp", "TechFlow Solutions", "Digital Dynamics", "Innovation Labs", 
    "NextGen Systems", "CloudFirst Technologies", "DataStream Inc", "AI Horizons"
]

PROJECT_TEMPLATES = [
    {
        "name": "Mobile App Development",
        "description": "Development of cross-platform mobile application",
        "type": "software_development",
        "estimated_duration": 120,
        "budget_range": (75000, 150000)
    },
    {
        "name": "Website Redesign",
        "description": "Complete website redesign and optimization",
        "type": "web_development", 
        "estimated_duration": 90,
        "budget_range": (45000, 85000)
    },
    {
        "name": "Marketing Campaign",
        "description": "Comprehensive digital marketing campaign",
        "type": "marketing",
        "estimated_duration": 60,
        "budget_range": (25000, 60000)
    },
    {
        "name": "Product Launch",
        "description": "End-to-end product launch strategy and execution",
        "type": "product_management",
        "estimated_duration": 150,
        "budget_range": (100000, 200000)
    },
    {
        "name": "Data Analytics Platform",
        "description": "Build comprehensive data analytics and reporting platform",
        "type": "software_development",
        "estimated_duration": 180,
        "budget_range": (150000, 300000)
    },
    {
        "name": "Cloud Migration",
        "description": "Migrate infrastructure to cloud platform",
        "type": "infrastructure",
        "estimated_duration": 100,
        "budget_range": (80000, 150000)
    }
]

TASK_TEMPLATES = {
    "software_development": [
        "Requirements Analysis", "System Design", "Database Design", "API Development",
        "Frontend Development", "Backend Development", "Testing", "Deployment",
        "Documentation", "Code Review", "Security Audit", "Performance Optimization"
    ],
    "web_development": [
        "User Research", "Wireframing", "UI Design", "UX Testing", "Frontend Coding",
        "CMS Integration", "SEO Optimization", "Browser Testing", "Mobile Optimization",
        "Content Migration", "Launch Preparation", "Post-Launch Support"
    ],
    "marketing": [
        "Market Research", "Strategy Development", "Content Creation", "Social Media Setup",
        "Ad Campaign Creation", "Email Campaign Setup", "Analytics Setup", "A/B Testing",
        "Performance Monitoring", "Campaign Optimization", "Report Generation", "ROI Analysis"
    ],
    "product_management": [
        "Market Analysis", "Product Roadmap", "Feature Specification", "Stakeholder Alignment",
        "Go-to-Market Strategy", "Pricing Strategy", "Launch Plan", "Marketing Materials",
        "Sales Enablement", "Customer Feedback", "Success Metrics", "Post-Launch Review"
    ],
    "infrastructure": [
        "Current State Assessment", "Migration Planning", "Security Review", "Architecture Design",
        "Data Migration", "Application Migration", "Testing", "Cutover Planning",
        "Monitoring Setup", "Documentation", "Training", "Support Transition"
    ]
}

USER_PROFILES = [
    {"first_name": "John", "last_name": "Smith", "role": "admin", "skills": ["Project Management", "Leadership", "Strategy"]},
    {"first_name": "Sarah", "last_name": "Johnson", "role": "manager", "skills": ["Software Development", "Team Management", "Agile"]},
    {"first_name": "Mike", "last_name": "Davis", "role": "team_lead", "skills": ["Frontend Development", "React", "TypeScript"]},
    {"first_name": "Emily", "last_name": "Wilson", "role": "member", "skills": ["Backend Development", "Python", "FastAPI"]},
    {"first_name": "David", "last_name": "Brown", "role": "member", "skills": ["Database Design", "MongoDB", "PostgreSQL"]},
    {"first_name": "Lisa", "last_name": "Garcia", "role": "member", "skills": ["UI/UX Design", "Figma", "User Research"]},
    {"first_name": "Robert", "last_name": "Miller", "role": "team_lead", "skills": ["DevOps", "AWS", "Docker"]},
    {"first_name": "Jennifer", "last_name": "Taylor", "role": "member", "skills": ["Quality Assurance", "Testing", "Automation"]},
    {"first_name": "Chris", "last_name": "Anderson", "role": "member", "skills": ["Marketing", "Content Creation", "SEO"]},
    {"first_name": "Amanda", "last_name": "Thomas", "role": "manager", "skills": ["Product Management", "Analytics", "Strategy"]}
]

TEAM_TYPES = [
    {"name": "Engineering Team", "type": "development", "description": "Core software development team"},
    {"name": "Design Team", "type": "design", "description": "UI/UX and visual design team"},
    {"name": "Marketing Team", "type": "marketing", "description": "Digital marketing and growth team"},
    {"name": "Product Team", "type": "product", "description": "Product strategy and management team"},
    {"name": "DevOps Team", "type": "operations", "description": "Infrastructure and operations team"}
]

SKILLS_POOL = [
    "JavaScript", "Python", "React", "Node.js", "MongoDB", "PostgreSQL", "AWS", "Docker",
    "Kubernetes", "TypeScript", "FastAPI", "GraphQL", "Redis", "Elasticsearch", "Git",
    "CI/CD", "Agile", "Scrum", "Project Management", "Leadership", "Communication",
    "Problem Solving", "UI Design", "UX Research", "Figma", "Adobe Creative Suite",
    "Digital Marketing", "SEO", "Content Strategy", "Analytics", "A/B Testing"
]

async def create_enhanced_demo_data():
    """Create comprehensive demo data for analytics and visualization"""
    
    try:
        await connect_to_mongo()
        db = await get_database()
        
        print("🚀 Creating enhanced demo data for Enterprise Portfolio Management...")
        
        # Clear existing demo data
        await clear_demo_data(db)
        
        # Create demo organization
        org_data = await create_demo_organization(db)
        org_id = org_data["id"]
        
        # Create demo users
        users_data = await create_demo_users(db, org_id)
        
        # Create demo teams
        teams_data = await create_demo_teams(db, org_id, users_data)
        
        # Create demo projects with realistic data
        projects_data = await create_demo_projects(db, org_id, users_data, teams_data)
        
        # Create demo tasks with dependencies
        tasks_data = await create_demo_tasks(db, projects_data, users_data)
        
        # Create demo comments and interactions
        await create_demo_comments(db, projects_data, tasks_data, users_data)
        
        print("✅ Enhanced demo data creation completed successfully!")
        print(f"📊 Created: {len(users_data)} users, {len(teams_data)} teams, {len(projects_data)} projects, {len(tasks_data)} tasks")
        
        return {
            "organization": org_data,
            "users": users_data,
            "teams": teams_data,
            "projects": projects_data,
            "tasks": tasks_data
        }
        
    except Exception as e:
        print(f"❌ Failed to create demo data: {e}")
        raise

async def clear_demo_data(db):
    """Clear existing demo data"""
    collections = ["users", "organizations", "projects", "tasks", "teams", "comments"]
    
    for collection in collections:
        result = await db[collection].delete_many({})
        print(f"🗑️  Cleared {result.deleted_count} items from {collection}")

async def create_demo_organization(db):
    """Create a realistic demo organization"""
    
    org_data = {
        "id": "demo-org-001",
        "name": "TechFlow Solutions",
        "slug": "techflow-solutions",
        "description": "A leading technology solutions company specializing in enterprise software development and digital transformation",
        "type": "medium_enterprise",
        "status": "active",
        "website": "https://techflow-solutions.com",
        "email": "contact@techflow-solutions.com",
        "phone": "+1-555-0100",
        "address": {
            "street": "123 Innovation Drive",
            "city": "San Francisco", 
            "state": "CA",
            "postal_code": "94105",
            "country": "United States"
        },
        "settings": {
            "timezone": "America/Los_Angeles",
            "currency": "USD", 
            "date_format": "YYYY-MM-DD",
            "time_format": "12h",
            "language": "en",
            "features": {
                "advanced_analytics": True,
                "time_tracking": True,
                "budget_management": True,
                "resource_planning": True
            },
            "max_users": 100,
            "max_projects": 50,
            "storage_limit_gb": 100.0
        },
        "industry": "Technology",
        "size": "medium",
        "founded_year": 2019,
        "owner_id": "demo-user-001",
        "member_count": 10,
        "project_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.organizations.insert_one(org_data)
    print(f"✅ Created demo organization: {org_data['name']}")
    return org_data

async def create_demo_users(db, org_id):
    """Create realistic demo users with varied roles and skills"""
    
    users_data = []
    
    # Create admin user (existing demo user)
    admin_user = {
        "id": "demo-user-001",
        "email": "demo@company.com",
        "username": "demo_admin",
        "password_hash": hash_password("demo123456"),
        "first_name": "Alex",
        "last_name": "Morgan",
        "phone": "+1-555-0123",
        "bio": "Chief Technology Officer with 10+ years experience in enterprise software development",
        "avatar_url": None,
        "role": "admin",
        "organization_id": org_id,
        "is_active": True,
        "status": "active",
        "email_verified": True,
        "skills": ["Leadership", "Strategy", "Project Management", "Software Architecture"],
        "team_memberships": [],
        "timezone": "America/Los_Angeles",
        "language": "en",
        "theme": "light",
        "notifications_enabled": True,
        "profile_completed": True,
        "onboarding_completed": True,
        "created_at": datetime.utcnow() - timedelta(days=180),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(admin_user)
    users_data.append(admin_user)
    
    # Create additional demo users
    for i, profile in enumerate(USER_PROFILES, 2):
        user_id = f"demo-user-{i:03d}"
        
        # Add random additional skills
        additional_skills = random.sample(SKILLS_POOL, random.randint(2, 5))
        all_skills = list(set(profile["skills"] + additional_skills))
        
        user_data = {
            "id": user_id,
            "email": f"{profile['first_name'].lower()}.{profile['last_name'].lower()}@techflow-solutions.com",
            "username": f"{profile['first_name'].lower()}_{profile['last_name'].lower()}",
            "password_hash": hash_password("demo123456"),
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
            "phone": f"+1-555-{random.randint(1000, 9999)}",
            "bio": f"Experienced {profile['role']} specializing in {', '.join(profile['skills'][:2])}",
            "avatar_url": None,
            "role": profile["role"],
            "organization_id": org_id,
            "is_active": True,
            "status": "active",
            "email_verified": True,
            "skills": all_skills,
            "team_memberships": [],  # Will be populated when creating teams
            "timezone": random.choice(["America/Los_Angeles", "America/New_York", "America/Chicago"]),
            "language": "en",
            "theme": random.choice(["light", "dark"]),
            "notifications_enabled": True,
            "profile_completed": True,
            "onboarding_completed": True,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 150)),
            "updated_at": datetime.utcnow() - timedelta(days=random.randint(1, 30))
        }
        
        await db.users.insert_one(user_data)
        users_data.append(user_data)
    
    print(f"✅ Created {len(users_data)} demo users")
    return users_data

async def create_demo_teams(db, org_id, users_data):
    """Create demo teams with realistic member assignments"""
    
    teams_data = []
    
    for i, team_template in enumerate(TEAM_TYPES, 1):
        team_id = f"demo-team-{i:03d}"
        
        # Assign team members based on skills and roles
        team_members = []
        team_lead = None
        
        # Find suitable team lead
        potential_leads = [u for u in users_data if u["role"] in ["team_lead", "manager"] and len(u["team_memberships"]) < 2]
        if potential_leads:
            team_lead = random.choice(potential_leads)
            team_members.append(team_lead["id"])
            team_lead["team_memberships"].append(team_id)
        
        # Add team members
        potential_members = [u for u in users_data if u["id"] not in team_members and len(u["team_memberships"]) < 3]
        member_count = random.randint(3, 6)
        selected_members = random.sample(potential_members, min(member_count, len(potential_members)))
        
        for member in selected_members:
            team_members.append(member["id"])
            member["team_memberships"].append(team_id)
        
        team_data = {
            "id": team_id,
            "name": team_template["name"],
            "slug": team_template["name"].lower().replace(" ", "-"),
            "description": team_template["description"],
            "type": team_template["type"],
            "organization_id": org_id,
            "lead_id": team_lead["id"] if team_lead else None,
            "members": team_members,
            "member_count": len(team_members),
            "status": "active",
            "settings": {
                "public": True,
                "allow_external_members": False
            },
            "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 120)),
            "updated_at": datetime.utcnow() - timedelta(days=random.randint(1, 30))
        }
        
        await db.teams.insert_one(team_data)
        teams_data.append(team_data)
    
    # Update users with team memberships
    for user in users_data:
        if user["team_memberships"]:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"team_memberships": user["team_memberships"]}}
            )
    
    print(f"✅ Created {len(teams_data)} demo teams")
    return teams_data

async def create_demo_projects(db, org_id, users_data, teams_data):
    """Create realistic demo projects with varied statuses and progress"""
    
    projects_data = []
    
    # Create 8-12 projects with different statuses and characteristics
    num_projects = random.randint(8, 12)
    
    for i in range(num_projects):
        project_id = f"demo-project-{i+1:03d}"
        template = random.choice(PROJECT_TEMPLATES)
        
        # Determine project status and dates
        status_weights = {
            "planning": 0.2,
            "active": 0.4,
            "on_hold": 0.1,
            "completed": 0.25,
            "cancelled": 0.05
        }
        
        status = random.choices(
            list(status_weights.keys()),
            weights=list(status_weights.values())
        )[0]
        
        # Calculate dates based on status
        created_date = datetime.utcnow() - timedelta(days=random.randint(30, 200))
        
        if status == "completed":
            start_date = created_date + timedelta(days=random.randint(5, 15))
            end_date = start_date + timedelta(days=random.randint(template["estimated_duration"] - 30, template["estimated_duration"] + 30))
            due_date = end_date + timedelta(days=random.randint(0, 10))
            progress = 100
        elif status == "active":
            start_date = created_date + timedelta(days=random.randint(5, 20))
            duration_so_far = (datetime.utcnow() - start_date).days
            progress = min(95, max(10, (duration_so_far / template["estimated_duration"]) * 100 + random.randint(-20, 20)))
            due_date = start_date + timedelta(days=template["estimated_duration"])
            end_date = None
        elif status == "on_hold":
            start_date = created_date + timedelta(days=random.randint(5, 15))
            progress = random.randint(15, 60)
            due_date = start_date + timedelta(days=template["estimated_duration"])
            end_date = None
        else:  # planning or cancelled
            start_date = created_date + timedelta(days=random.randint(10, 30))
            progress = random.randint(0, 15) if status == "planning" else random.randint(5, 40)
            due_date = start_date + timedelta(days=template["estimated_duration"])
            end_date = None
        
        # Assign project manager and team
        project_manager = random.choice([u for u in users_data if u["role"] in ["admin", "manager", "team_lead"]])
        assigned_team = random.choice(teams_data)
        team_members = random.sample(assigned_team["members"], random.randint(2, min(5, len(assigned_team["members"]))))
        
        # Budget calculation
        budget_min, budget_max = template["budget_range"]
        total_budget = random.randint(budget_min, budget_max)
        spent_amount = int(total_budget * (progress / 100) * random.uniform(0.8, 1.2))
        
        # Priority assignment
        priority_weights = {"low": 0.2, "medium": 0.5, "high": 0.25, "critical": 0.05}
        priority = random.choices(
            list(priority_weights.keys()),
            weights=list(priority_weights.values())
        )[0]
        
        project_data = {
            "id": project_id,
            "name": f"{template['name']} - {random.choice(['Q1', 'Q2', 'Q3', 'Q4'])} 2024",
            "slug": f"{template['name'].lower().replace(' ', '-')}-{i+1}",
            "description": template["description"],
            "status": status,
            "priority": priority,
            "type": template["type"],
            "organization_id": org_id,
            "owner_id": project_manager["id"],
            "team_id": assigned_team["id"],
            "team_members": team_members,
            "start_date": start_date.isoformat(),
            "due_date": due_date.isoformat(),
            "end_date": end_date.isoformat() if end_date else None,
            "estimated_hours": template["estimated_duration"] * 8,  # 8 hours per day
            "actual_hours": int((template["estimated_duration"] * 8) * (progress / 100)) if progress > 0 else 0,
            "progress_percentage": round(progress, 1),
            "budget": {
                "total_budget": total_budget,
                "spent_amount": spent_amount,
                "currency": "USD",
                "budget_type": "fixed"
            },
            "milestones": generate_project_milestones(template, start_date, due_date),
            "tags": random.sample(["enterprise", "mobile", "web", "backend", "frontend", "api", "database"], random.randint(2, 4)),
            "visibility": "team",
            "settings": {
                "notifications_enabled": True,
                "time_tracking_enabled": True,
                "budget_tracking_enabled": True
            },
            "created_at": created_date,
            "updated_at": datetime.utcnow() - timedelta(days=random.randint(0, 7))
        }
        
        await db.projects.insert_one(project_data)
        projects_data.append(project_data)
    
    print(f"✅ Created {len(projects_data)} demo projects")
    return projects_data

async def create_demo_tasks(db, projects_data, users_data):
    """Create realistic demo tasks with dependencies and varied statuses"""
    
    tasks_data = []
    
    for project in projects_data:
        project_id = project["id"]
        project_type = project["type"]
        task_templates = TASK_TEMPLATES.get(project_type, TASK_TEMPLATES["software_development"])
        
        # Create 8-15 tasks per project
        num_tasks = random.randint(8, 15)
        selected_tasks = random.sample(task_templates, min(num_tasks, len(task_templates)))
        
        project_tasks = []
        
        for i, task_name in enumerate(selected_tasks):
            task_id = f"{project_id}-task-{i+1:03d}"
            
            # Determine task status based on project status and progress
            if project["status"] == "completed":
                status_weights = {"completed": 0.9, "cancelled": 0.1}
            elif project["status"] == "active":
                progress_factor = project["progress_percentage"] / 100
                completed_ratio = min(0.8, progress_factor + random.uniform(-0.2, 0.1))
                status_weights = {
                    "completed": completed_ratio,
                    "in_progress": 0.3 * (1 - completed_ratio),
                    "in_review": 0.2 * (1 - completed_ratio),
                    "todo": 0.4 * (1 - completed_ratio),
                    "blocked": 0.1 * (1 - completed_ratio)
                }
            elif project["status"] == "on_hold":
                status_weights = {"completed": 0.3, "in_progress": 0.2, "todo": 0.4, "blocked": 0.1}
            else:  # planning or cancelled
                status_weights = {"todo": 0.7, "in_progress": 0.2, "cancelled": 0.1}
            
            status = random.choices(
                list(status_weights.keys()),
                weights=list(status_weights.values())
            )[0]
            
            # Task priority
            priority_weights = {"low": 0.3, "medium": 0.5, "high": 0.18, "critical": 0.02}
            priority = random.choices(
                list(priority_weights.keys()),
                weights=list(priority_weights.values())
            )[0]
            
            # Assign task to team member
            assignee = random.choice(project["team_members"]) if project["team_members"] else None
            
            # Calculate task dates
            task_start = datetime.fromisoformat(project["start_date"]) + timedelta(days=i * random.randint(1, 5))
            estimated_days = random.randint(2, 14)
            task_due = task_start + timedelta(days=estimated_days)
            
            # Adjust due date if task is overdue (some tasks should be overdue for realistic demo)
            if status not in ["completed", "cancelled"] and random.random() < 0.15:  # 15% chance of overdue
                task_due = datetime.utcnow() - timedelta(days=random.randint(1, 10))
            
            task_data = {
                "id": task_id,
                "title": task_name,
                "description": f"Complete {task_name.lower()} for {project['name']}",
                "status": status,
                "priority": priority,
                "type": "task",
                "project_id": project_id,
                "assignee_id": assignee,
                "reporter_id": project["owner_id"],
                "start_date": task_start.isoformat(),
                "due_date": task_due.isoformat(),
                "estimated_hours": random.randint(8, 40),
                "actual_hours": random.randint(5, 45) if status in ["completed", "in_review"] else random.randint(0, 20),
                "progress_percentage": {
                    "completed": 100,
                    "in_review": random.randint(90, 99),
                    "in_progress": random.randint(25, 85),
                    "blocked": random.randint(10, 60),
                    "todo": 0,
                    "cancelled": random.randint(0, 30)
                }.get(status, 0),
                "labels": random.sample(["frontend", "backend", "api", "database", "testing", "documentation"], random.randint(1, 3)),
                "dependencies": [],  # Will add dependencies later
                "subtasks": [],
                "attachments": [],
                "time_entries": [],
                "created_at": task_start - timedelta(days=random.randint(1, 5)),
                "updated_at": datetime.utcnow() - timedelta(days=random.randint(0, 3))
            }
            
            project_tasks.append(task_data)
        
        # Add some task dependencies
        for i, task in enumerate(project_tasks):
            if i > 0 and random.random() < 0.3:  # 30% chance of having a dependency
                dependency = random.choice(project_tasks[:i])
                task["dependencies"] = [dependency["id"]]
        
        # Insert tasks
        for task in project_tasks:
            await db.tasks.insert_one(task)
            tasks_data.append(task)
    
    print(f"✅ Created {len(tasks_data)} demo tasks")
    return tasks_data

async def create_demo_comments(db, projects_data, tasks_data, users_data):
    """Create demo comments for projects and tasks"""
    
    comments_data = []
    
    # Create comments for projects
    for project in random.sample(projects_data, min(6, len(projects_data))):
        num_comments = random.randint(2, 8)
        
        for i in range(num_comments):
            comment_id = f"{project['id']}-comment-{i+1:03d}"
            commenter = random.choice(users_data)
            
            comment_data = {
                "id": comment_id,
                "content": generate_realistic_comment("project"),
                "type": "comment",
                "entity_type": "project",
                "entity_id": project["id"],
                "author_id": commenter["id"],
                "parent_id": None,
                "mentions": [],
                "attachments": [],
                "reactions": generate_comment_reactions(users_data),
                "is_edited": random.random() < 0.1,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "updated_at": datetime.utcnow() - timedelta(days=random.randint(0, 5))
            }
            
            await db.comments.insert_one(comment_data)
            comments_data.append(comment_data)
    
    # Create comments for tasks
    for task in random.sample(tasks_data, min(15, len(tasks_data))):
        num_comments = random.randint(1, 5)
        
        for i in range(num_comments):
            comment_id = f"{task['id']}-comment-{i+1:03d}"
            commenter = random.choice(users_data)
            
            comment_data = {
                "id": comment_id,
                "content": generate_realistic_comment("task"),
                "type": "comment",
                "entity_type": "task",
                "entity_id": task["id"],
                "author_id": commenter["id"],
                "parent_id": None,
                "mentions": [],
                "attachments": [],
                "reactions": generate_comment_reactions(users_data),
                "is_edited": random.random() < 0.15,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 20)),
                "updated_at": datetime.utcnow() - timedelta(days=random.randint(0, 3))
            }
            
            await db.comments.insert_one(comment_data)
            comments_data.append(comment_data)
    
    print(f"✅ Created {len(comments_data)} demo comments")
    return comments_data

def generate_project_milestones(template, start_date, due_date):
    """Generate realistic project milestones"""
    milestones = []
    project_duration = (due_date - start_date).days
    
    milestone_templates = {
        "software_development": [
            {"name": "Requirements Finalized", "percentage": 15},
            {"name": "Design Complete", "percentage": 30},
            {"name": "Development Phase 1", "percentage": 60},
            {"name": "Testing Complete", "percentage": 85},
            {"name": "Launch Ready", "percentage": 100}
        ],
        "marketing": [
            {"name": "Strategy Approved", "percentage": 20},
            {"name": "Content Created", "percentage": 50},
            {"name": "Campaign Launch", "percentage": 75},
            {"name": "Campaign Complete", "percentage": 100}
        ]
    }
    
    template_milestones = milestone_templates.get(
        template["type"], 
        milestone_templates["software_development"]
    )
    
    for i, milestone_template in enumerate(template_milestones):
        milestone_date = start_date + timedelta(
            days=int(project_duration * (milestone_template["percentage"] / 100))
        )
        
        milestones.append({
            "id": f"milestone-{i+1}",
            "name": milestone_template["name"],
            "description": f"Complete {milestone_template['name'].lower()}",
            "due_date": milestone_date.isoformat(),
            "status": "pending",
            "completion_percentage": milestone_template["percentage"]
        })
    
    return milestones

def generate_realistic_comment(entity_type):
    """Generate realistic comments for projects and tasks"""
    project_comments = [
        "Great progress on this project! Looking forward to the next milestone.",
        "We need to review the budget allocation for this quarter.",
        "The timeline looks aggressive, but achievable with the current team.",
        "Let's schedule a stakeholder review meeting next week.",
        "I've updated the requirements document based on client feedback.",
        "The design phase is complete. Moving to development next.",
        "We should consider adding more QA resources to this project.",
        "Client has requested some additional features. Need to assess impact."
    ]
    
    task_comments = [
        "Working on this now. Should be done by EOD.",
        "Blocked by API dependency. Waiting for backend team.",
        "This is taking longer than expected due to complexity.",
        "Code review completed. Ready for testing.",
        "Found a bug in the implementation. Fixing now.",
        "Task is complete. Please review and approve.",
        "Need clarification on the requirements for this task.",
        "Added unit tests and documentation."
    ]
    
    if entity_type == "project":
        return random.choice(project_comments)
    else:
        return random.choice(task_comments)

def generate_comment_reactions(users_data):
    """Generate realistic comment reactions"""
    reactions = {}
    reaction_types = ["👍", "❤️", "😊", "🎉", "👏"]
    
    for reaction_type in reaction_types:
        if random.random() < 0.3:  # 30% chance for each reaction type
            num_reactions = random.randint(1, 4)
            reactions[reaction_type] = random.sample(
                [u["id"] for u in users_data], 
                min(num_reactions, len(users_data))
            )
    
    return reactions

if __name__ == "__main__":
    asyncio.run(create_enhanced_demo_data())