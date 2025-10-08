#!/usr/bin/env python3
"""
Comprehensive Demo Data Creator for Enterprise Portfolio Management System
Creates realistic enterprise data to showcase the Portfolio Analytics Dashboard
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
import random
import uuid
from typing import List, Dict, Any

# Add the backend directory to the path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from auth.utils import hash_password

class ComprehensiveDemoCreator:
    def __init__(self):
        self.db = None
        self.org_id = "demo-org-001"
        
        # Skill sets for different roles
        self.skill_sets = {
            "developer": ["Python", "JavaScript", "React", "Node.js", "MongoDB", "Docker", "AWS", "Git"],
            "designer": ["Figma", "Adobe Creative Suite", "UI/UX Design", "Prototyping", "Wireframing", "Design Systems"],
            "marketing": ["Content Marketing", "SEO", "Social Media", "Google Analytics", "Email Marketing", "PPC"],
            "sales": ["CRM Management", "Lead Generation", "Negotiation", "Customer Relations", "Salesforce"],
            "operations": ["Project Management", "Process Improvement", "Quality Assurance", "Agile", "Scrum"]
        }
        
        # Project templates with realistic details
        self.project_templates = [
            {
                "name": "E-commerce Platform Redesign",
                "description": "Complete overhaul of the company's e-commerce platform with modern UI/UX and improved performance",
                "type": "software_development",
                "priority": "high",
                "budget": 150000,
                "duration_days": 120
            },
            {
                "name": "Mobile App Development",
                "description": "Native iOS and Android mobile application for customer engagement",
                "type": "software_development", 
                "priority": "critical",
                "budget": 200000,
                "duration_days": 180
            },
            {
                "name": "Brand Identity Refresh",
                "description": "Complete brand redesign including logo, color palette, and brand guidelines",
                "type": "design",
                "priority": "medium",
                "budget": 75000,
                "duration_days": 90
            },
            {
                "name": "Digital Marketing Campaign Q4",
                "description": "Comprehensive digital marketing campaign for Q4 product launches",
                "type": "marketing",
                "priority": "high",
                "budget": 120000,
                "duration_days": 90
            },
            {
                "name": "Customer Support Portal",
                "description": "Self-service customer support portal with knowledge base and ticketing system",
                "type": "software_development",
                "priority": "medium",
                "budget": 80000,
                "duration_days": 100
            },
            {
                "name": "Data Analytics Dashboard",
                "description": "Business intelligence dashboard for real-time analytics and reporting",
                "type": "software_development",
                "priority": "high",
                "budget": 110000,
                "duration_days": 110
            },
            {
                "name": "Website Performance Optimization",
                "description": "Optimize website performance, SEO, and user experience",
                "type": "software_development",
                "priority": "medium",
                "budget": 45000,
                "duration_days": 60
            },
            {
                "name": "Cloud Infrastructure Migration",
                "description": "Migrate on-premise infrastructure to cloud with improved scalability",
                "type": "operations",
                "priority": "critical",
                "budget": 180000,
                "duration_days": 150
            },
            {
                "name": "Sales CRM Enhancement",
                "description": "Enhance and customize CRM system for improved sales pipeline management",
                "type": "software_development",
                "priority": "medium",
                "budget": 65000,
                "duration_days": 80
            },
            {
                "name": "Product Launch Campaign",
                "description": "Coordinated marketing campaign for new product line launch",
                "type": "marketing",
                "priority": "critical",
                "budget": 95000,
                "duration_days": 70
            },
            {
                "name": "Security Audit & Compliance",
                "description": "Comprehensive security audit and compliance implementation",
                "type": "operations",
                "priority": "high",
                "budget": 85000,
                "duration_days": 90
            },
            {
                "name": "API Development Platform",
                "description": "RESTful API platform for third-party integrations",
                "type": "software_development",
                "priority": "medium",
                "budget": 70000,
                "duration_days": 85
            }
        ]

    async def create_comprehensive_demo_data(self):
        """Create comprehensive demo data for the organization"""
        try:
            print("🚀 Starting comprehensive demo data creation...")
            
            # Connect to database
            await connect_to_mongo()
            self.db = await get_database()
            
            # Create data in order
            await self.create_teams_and_users()
            await self.create_projects_and_tasks()
            await self.create_comments_and_files()
            
            print("✅ Comprehensive demo data created successfully!")
            
            # Display summary
            await self.display_summary()
            
        except Exception as e:
            print(f"❌ Error creating demo data: {e}")
            raise

    async def create_teams_and_users(self):
        """Create teams and users with realistic data"""
        print("📁 Creating teams and users...")
        
        teams_data = [
            {
                "id": str(uuid.uuid4()),
                "name": "Development Team",
                "description": "Full-stack development team responsible for all software projects",
                "type": "development",
                "organization_id": self.org_id,
                "lead_id": None,  # Will be set later
                "member_count": 8,
                "skills": ["Python", "JavaScript", "React", "Node.js", "MongoDB", "Docker", "AWS"],
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=180),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Design Team", 
                "description": "UI/UX design team handling all visual and user experience design",
                "type": "design",
                "organization_id": self.org_id,
                "lead_id": None,
                "member_count": 5,
                "skills": ["UI/UX Design", "Figma", "Adobe Creative Suite", "Prototyping", "Design Systems"],
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=150),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Marketing Team",
                "description": "Digital marketing and growth team",
                "type": "marketing", 
                "organization_id": self.org_id,
                "lead_id": None,
                "member_count": 6,
                "skills": ["Content Marketing", "SEO", "Social Media", "Google Analytics", "Email Marketing"],
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=120),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Sales Team",
                "description": "Sales and business development team",
                "type": "sales",
                "organization_id": self.org_id,
                "lead_id": None,
                "member_count": 4,
                "skills": ["CRM Management", "Lead Generation", "Negotiation", "Customer Relations"],
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=100),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Operations Team",
                "description": "DevOps, infrastructure, and operations team",
                "type": "operations",
                "organization_id": self.org_id,
                "lead_id": None,
                "member_count": 5,
                "skills": ["DevOps", "Cloud Infrastructure", "Monitoring", "Security", "Process Improvement"],
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=80),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert teams
        await self.db.teams.insert_many(teams_data)
        
        # Create users for each team
        users_data = []
        user_names = [
            ("Alice", "Johnson", "developer"), ("Bob", "Smith", "developer"), ("Carol", "Davis", "developer"),
            ("David", "Wilson", "developer"), ("Emma", "Brown", "developer"), ("Frank", "Miller", "developer"), 
            ("Grace", "Taylor", "developer"), ("Henry", "Anderson", "developer"),
            
            ("Ivy", "White", "designer"), ("Jack", "Martin", "designer"), ("Karen", "Thompson", "designer"),
            ("Leo", "Garcia", "designer"), ("Mia", "Rodriguez", "designer"),
            
            ("Nathan", "Lewis", "marketing"), ("Olivia", "Lee", "marketing"), ("Paul", "Walker", "marketing"),
            ("Quinn", "Hall", "marketing"), ("Rachel", "Allen", "marketing"), ("Sam", "Young", "marketing"),
            
            ("Tina", "King", "sales"), ("Umar", "Wright", "sales"), ("Vera", "Green", "sales"), ("Will", "Baker", "sales"),
            
            ("Xara", "Adams", "operations"), ("Yuki", "Nelson", "operations"), ("Zack", "Hill", "operations"),
            ("Amy", "Ramirez", "operations"), ("Ben", "Campbell", "operations")
        ]
        
        team_assignments = {
            "developer": teams_data[0]["id"],
            "designer": teams_data[1]["id"],
            "marketing": teams_data[2]["id"],
            "sales": teams_data[3]["id"],
            "operations": teams_data[4]["id"]
        }
        
        for i, (first_name, last_name, role_type) in enumerate(user_names):
            user_id = str(uuid.uuid4())
            
            # Determine role level
            if i % 8 == 0:  # Team leads
                role = "team_lead"
            elif i % 12 == 0:  # Managers
                role = "manager"
            else:
                role = "member"
            
            # Select skills based on role type
            available_skills = self.skill_sets[role_type]
            skill_count = min(len(available_skills), random.randint(3, 6))
            user_skills = random.sample(available_skills, k=skill_count)
            
            user_data = {
                "id": user_id,
                "email": f"{first_name.lower()}.{last_name.lower()}@company.com",
                "username": f"{first_name.lower()}_{last_name.lower()}",
                "password_hash": hash_password("password123"),
                "first_name": first_name,
                "last_name": last_name,
                "phone": f"+1-555-{random.randint(1000, 9999)}",
                "bio": f"Experienced {role_type} with expertise in multiple technologies and methodologies.",
                "avatar_url": None,
                "role": role,
                "organization_id": self.org_id,
                "team_memberships": [team_assignments[role_type]],
                "skills": [{"name": skill, "level": random.choice(["beginner", "intermediate", "advanced", "expert"])} for skill in user_skills],
                "is_active": True,
                "status": "active",
                "email_verified": True,
                "timezone": "UTC",
                "language": "en",
                "theme": "light",
                "notifications_enabled": True,
                "profile_completed": True,
                "onboarding_completed": True,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 200)),
                "updated_at": datetime.utcnow()
            }
            users_data.append(user_data)
        
        # Insert users
        await self.db.users.insert_many(users_data)
        
        # Update team leads
        team_leads = [user for user in users_data if user["role"] == "team_lead"]
        for i, team in enumerate(teams_data):
            if i < len(team_leads):
                await self.db.teams.update_one(
                    {"id": team["id"]},
                    {"$set": {"lead_id": team_leads[i]["id"]}}
                )
        
        print(f"✅ Created {len(teams_data)} teams and {len(users_data)} users")

    async def create_projects_and_tasks(self):
        """Create projects with realistic tasks"""
        print("📋 Creating projects and tasks...")
        
        # Get users for task assignment
        users = await self.db.users.find({"organization_id": self.org_id}).to_list(length=None)
        teams = await self.db.teams.find({"organization_id": self.org_id}).to_list(length=None)
        
        projects_data = []
        
        # Create projects based on templates
        for i, template in enumerate(self.project_templates):
            project_id = str(uuid.uuid4())
            
            # Randomize project status and dates
            statuses = ["planning", "active", "on_hold", "completed", "cancelled"]
            weights = [0.15, 0.5, 0.1, 0.2, 0.05]  # More active projects
            status = random.choices(statuses, weights=weights)[0]
            
            created_date = datetime.utcnow() - timedelta(days=random.randint(30, 300))
            start_date = created_date + timedelta(days=random.randint(1, 30))
            due_date = start_date + timedelta(days=template["duration_days"])
            
            # Assign team members (3-8 members per project)
            team_members = random.sample(users, k=random.randint(3, 8))
            
            # Calculate realistic budget spent based on status
            spent_multiplier = {
                "planning": 0.05,
                "active": random.uniform(0.3, 0.7),
                "on_hold": random.uniform(0.2, 0.6),
                "completed": random.uniform(0.8, 1.1),
                "cancelled": random.uniform(0.1, 0.4)
            }
            
            spent_amount = template["budget"] * spent_multiplier[status]
            
            project_data = {
                "id": project_id,
                "name": template["name"],
                "description": template["description"],
                "status": status,
                "priority": template["priority"],
                "type": template["type"],
                "organization_id": self.org_id,
                "owner_id": random.choice(team_members)["id"],
                "team_members": [{"user_id": member["id"], "role": "contributor"} for member in team_members],
                "budget": {
                    "total_budget": template["budget"],
                    "spent_amount": round(spent_amount, 2),
                    "currency": "USD"
                },
                "milestones": self.generate_project_milestones(start_date, due_date),
                "tags": self.generate_project_tags(template["type"]),
                "start_date": start_date.isoformat(),
                "due_date": due_date.isoformat(),
                "progress_percentage": self.calculate_progress_percentage(status),
                "created_at": created_date,
                "updated_at": datetime.utcnow()
            }
            projects_data.append(project_data)
        
        # Insert projects
        await self.db.projects.insert_many(projects_data)
        
        # Create tasks for each project
        tasks_data = []
        task_templates = [
            "Requirements gathering and analysis", "System design and architecture", "Database schema design",
            "Frontend development", "Backend API development", "User interface design", "User experience research",
            "Testing and quality assurance", "Performance optimization", "Security implementation",
            "Documentation creation", "Code review and refactoring", "Integration testing", "Deployment setup",
            "User acceptance testing", "Bug fixing and refinement", "Final review and approval"
        ]
        
        for project in projects_data:
            project_id = project["id"]
            num_tasks = random.randint(8, 15)
            
            # Generate tasks for this project
            for j in range(num_tasks):
                task_id = str(uuid.uuid4())
                
                # Select task details
                task_title = random.choice(task_templates)
                
                # Task status distribution based on project status
                if project["status"] == "completed":
                    task_status = random.choices(
                        ["completed", "cancelled"], 
                        weights=[0.9, 0.1]
                    )[0]
                elif project["status"] == "active":
                    task_status = random.choices(
                        ["completed", "in_progress", "in_review", "todo", "blocked"],
                        weights=[0.3, 0.25, 0.15, 0.25, 0.05]
                    )[0]
                elif project["status"] == "planning":
                    task_status = random.choices(
                        ["todo", "in_progress"], 
                        weights=[0.8, 0.2]
                    )[0]
                else:  # on_hold or cancelled
                    task_status = random.choices(
                        ["todo", "in_progress", "blocked", "cancelled"],
                        weights=[0.4, 0.2, 0.3, 0.1]
                    )[0]
                
                # Assign task to a project team member
                assignee = random.choice(project["team_members"])["user_id"]
                
                # Task dates
                task_start = datetime.fromisoformat(project["start_date"]) + timedelta(days=random.randint(0, 30))
                task_due = task_start + timedelta(days=random.randint(3, 21))
                
                # Estimated and actual hours
                estimated_hours = random.randint(4, 40)
                if task_status == "completed":
                    actual_hours = estimated_hours + random.randint(-5, 10)
                elif task_status in ["in_progress", "in_review"]:
                    actual_hours = random.randint(0, estimated_hours)
                else:
                    actual_hours = 0
                
                task_data = {
                    "id": task_id,
                    "title": task_title,
                    "description": f"Detailed implementation of {task_title.lower()} for the {project['name']} project.",
                    "status": task_status,
                    "priority": random.choice(["low", "medium", "high", "critical"]),
                    "project_id": project_id,
                    "assignee_id": assignee,
                    "reporter_id": project["owner_id"],
                    "organization_id": self.org_id,
                    "estimated_hours": estimated_hours,
                    "actual_hours": actual_hours,
                    "start_date": task_start.isoformat(),
                    "due_date": task_due.isoformat(),
                    "dependencies": [],
                    "subtasks": [],
                    "tags": random.sample(["frontend", "backend", "design", "testing", "deployment"], k=random.randint(1, 3)),
                    "created_at": task_start - timedelta(days=random.randint(1, 5)),
                    "updated_at": datetime.utcnow()
                }
                tasks_data.append(task_data)
        
        # Insert tasks
        await self.db.tasks.insert_many(tasks_data)
        
        print(f"✅ Created {len(projects_data)} projects and {len(tasks_data)} tasks")

    def generate_project_milestones(self, start_date, due_date):
        """Generate realistic project milestones"""
        duration = (due_date - start_date).days
        num_milestones = random.randint(3, 6)
        
        milestones = []
        for i in range(num_milestones):
            milestone_date = start_date + timedelta(days=(duration // num_milestones) * (i + 1))
            milestones.append({
                "name": f"Milestone {i + 1}",
                "description": f"Key milestone {i + 1} for project completion",
                "due_date": milestone_date.isoformat(),
                "status": "pending"
            })
        
        return milestones

    def generate_project_tags(self, project_type):
        """Generate relevant tags based on project type"""
        tag_mapping = {
            "software_development": ["development", "coding", "web", "mobile", "api"],
            "design": ["design", "ui", "ux", "branding", "visual"],
            "marketing": ["marketing", "campaign", "digital", "content", "social"],
            "operations": ["operations", "infrastructure", "process", "automation", "monitoring"]
        }
        
        base_tags = tag_mapping.get(project_type, ["project", "team", "delivery"])
        return random.sample(base_tags, k=random.randint(2, 4))

    def calculate_progress_percentage(self, status):
        """Calculate realistic progress percentage based on status"""
        progress_ranges = {
            "planning": (0, 15),
            "active": (20, 85),
            "on_hold": (15, 60),
            "completed": (95, 100),
            "cancelled": (10, 50)
        }
        
        min_progress, max_progress = progress_ranges[status]
        return random.randint(min_progress, max_progress)

    async def create_comments_and_files(self):
        """Create sample comments and file attachments"""
        print("💬 Creating comments and files...")
        
        # Get some projects and tasks for comments
        projects = await self.db.projects.find({"organization_id": self.org_id}).limit(5).to_list(length=None)
        tasks = await self.db.tasks.find({}).limit(10).to_list(length=None)
        users = await self.db.users.find({"organization_id": self.org_id}).to_list(length=None)
        
        comments_data = []
        files_data = []
        
        # Create comments on projects and tasks
        comment_templates = [
            "Great progress on this! Looking forward to the next update.",
            "We need to address the performance issues mentioned in the last review.",
            "The design looks fantastic. Ready to move to development phase.",
            "Please update the timeline - we might need to adjust the deadline.",
            "Excellent work team! This is exactly what we were aiming for.",
            "Can we schedule a review meeting to discuss the current status?",
            "The requirements have been updated. Please check the latest specifications.",
            "Outstanding results! The client will be very pleased with this progress."
        ]
        
        # Comments on projects
        for project in projects[:3]:
            num_comments = random.randint(2, 5)
            for _ in range(num_comments):
                comment_data = {
                    "id": str(uuid.uuid4()),
                    "content": random.choice(comment_templates),
                    "entity_type": "project",
                    "entity_id": project["id"],
                    "author_id": random.choice(users)["id"],
                    "organization_id": self.org_id,
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    "updated_at": datetime.utcnow()
                }
                comments_data.append(comment_data)
        
        # Comments on tasks
        for task in tasks[:6]:
            num_comments = random.randint(1, 3)
            for _ in range(num_comments):
                comment_data = {
                    "id": str(uuid.uuid4()),
                    "content": random.choice(comment_templates),
                    "entity_type": "task",
                    "entity_id": task["id"],
                    "author_id": random.choice(users)["id"],
                    "organization_id": self.org_id,
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                    "updated_at": datetime.utcnow()
                }
                comments_data.append(comment_data)
        
        # Create sample file attachments
        file_types = ["document", "image", "video", "archive", "code"]
        file_names = [
            "requirements.pdf", "design_mockups.fig", "demo_video.mp4", 
            "source_code.zip", "test_plan.docx", "wireframes.png",
            "architecture_diagram.png", "user_manual.pdf"
        ]
        
        for i, project in enumerate(projects[:4]):
            num_files = random.randint(2, 4)
            for j in range(num_files):
                file_data = {
                    "id": str(uuid.uuid4()),
                    "name": random.choice(file_names),
                    "type": random.choice(file_types),
                    "size": random.randint(1024, 10485760),  # 1KB to 10MB
                    "entity_type": "project",
                    "entity_id": project["id"],
                    "uploaded_by": random.choice(users)["id"],
                    "organization_id": self.org_id,
                    "url": f"/files/{project['id']}/{random.choice(file_names)}",
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                    "updated_at": datetime.utcnow()
                }
                files_data.append(file_data)
        
        # Insert comments and files
        if comments_data:
            await self.db.comments.insert_many(comments_data)
        if files_data:
            await self.db.files.insert_many(files_data)
        
        print(f"✅ Created {len(comments_data)} comments and {len(files_data)} files")

    async def display_summary(self):
        """Display summary of created data"""
        print("\n" + "="*60)
        print("📊 DEMO DATA CREATION SUMMARY")
        print("="*60)
        
        # Count documents in each collection
        collections = ["organizations", "users", "teams", "projects", "tasks", "comments", "files"]
        
        for collection_name in collections:
            count = await self.db[collection_name].count_documents(
                {"organization_id": self.org_id} if collection_name != "organizations" else {"id": self.org_id}
            )
            print(f"{collection_name.capitalize():12}: {count:3} items")
        
        print("\n🎯 Key Highlights:")
        print("• 5 specialized teams (Development, Design, Marketing, Sales, Operations)")
        print("• 28 users with realistic roles and skills")
        print("• 12 diverse projects across different domains")
        print("• 100+ tasks with various statuses and priorities")
        print("• Realistic budgets, timelines, and progress tracking")
        print("• Sample comments and file attachments")
        
        print(f"\n🌐 Access the system:")
        print(f"• External URL: https://project-activity.preview.emergentagent.com")
        print(f"• Demo Login: demo@company.com / demo123456")
        print(f"• Analytics Dashboard: Navigate to Portfolio Analytics")
        
        print("\n✅ The Portfolio Analytics Dashboard is now fully populated and ready to showcase!")
        print("="*60)

async def main():
    """Main function to create comprehensive demo data"""
    creator = ComprehensiveDemoCreator()
    await creator.create_comprehensive_demo_data()

if __name__ == "__main__":
    asyncio.run(main())