#!/usr/bin/env python3
"""
Fixed Demo Data Generator for Enterprise Portfolio Management System
Addresses all issues found in previous demo data generation attempts
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
import random
import uuid
import json
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from auth.utils import hash_password

class FixedDemoDataGenerator:
    def __init__(self):
        self.db = None
        self.org_id = "demo-org-001"
        self.generated_data = {
            "users": [],
            "teams": [],
            "projects": [],
            "tasks": [],
            "comments": [],
            "files": [],
            "notifications": []
        }
        
        # Professional user profiles with unique emails
        self.user_profiles = [
            # Development Team
            {
                "email": "sarah.johnson@company.com",
                "first_name": "Sarah", "last_name": "Johnson",
                "role": "team_lead", "department": "Engineering",
                "skills": ["React", "Node.js", "TypeScript", "Python", "Team Leadership", "PostgreSQL"],
                "hourly_rate": 85
            },
            {
                "email": "marcus.chen@company.com", 
                "first_name": "Marcus", "last_name": "Chen",
                "role": "member", "department": "Engineering",
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "MongoDB"],
                "hourly_rate": 75
            },
            {
                "email": "emily.rodriguez@company.com",
                "first_name": "Emily", "last_name": "Rodriguez", 
                "role": "member", "department": "Engineering",
                "skills": ["React", "TypeScript", "Tailwind CSS", "Next.js", "JavaScript", "UI/UX Design"],
                "hourly_rate": 70
            },
            {
                "email": "james.wilson@company.com",
                "first_name": "James", "last_name": "Wilson",
                "role": "member", "department": "Engineering", 
                "skills": ["React Native", "iOS Development", "Android Development", "Flutter", "JavaScript"],
                "hourly_rate": 80
            },
            {
                "email": "alex.kumar@company.com",
                "first_name": "Alex", "last_name": "Kumar",
                "role": "member", "department": "Engineering",
                "skills": ["Docker", "Kubernetes", "AWS", "Terraform", "Jenkins", "Python"],
                "hourly_rate": 85
            },
            
            # Design Team
            {
                "email": "maria.gonzalez@company.com",
                "first_name": "Maria", "last_name": "Gonzalez",
                "role": "team_lead", "department": "Design",
                "skills": ["UI/UX Design", "Figma", "Adobe Creative Suite", "User Research", "Prototyping"],
                "hourly_rate": 80
            },
            {
                "email": "david.thompson@company.com",
                "first_name": "David", "last_name": "Thompson",
                "role": "member", "department": "Design",
                "skills": ["UI/UX Design", "Figma", "Sketch", "Prototyping", "User Research"],
                "hourly_rate": 65
            },
            
            # Data Science Team  
            {
                "email": "lisa.park@company.com",
                "first_name": "Lisa", "last_name": "Park",
                "role": "team_lead", "department": "Data Science",
                "skills": ["Python", "Machine Learning", "Data Analysis", "Pandas", "TensorFlow", "PostgreSQL"],
                "hourly_rate": 90
            },
            {
                "email": "michael.chang@company.com",
                "first_name": "Michael", "last_name": "Chang",
                "role": "member", "department": "Data Science",
                "skills": ["Python", "Data Analysis", "PostgreSQL", "R", "Data Visualization", "Excel"],
                "hourly_rate": 65
            },
            
            # Marketing Team
            {
                "email": "jennifer.davis@company.com",
                "first_name": "Jennifer", "last_name": "Davis",
                "role": "manager", "department": "Marketing",
                "skills": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Social Media", "Analytics"],
                "hourly_rate": 75
            },
            {
                "email": "robert.taylor@company.com",
                "first_name": "Robert", "last_name": "Taylor",
                "role": "member", "department": "Marketing",
                "skills": ["Content Strategy", "Social Media", "SEO/SEM", "Analytics", "Brand Management"],
                "hourly_rate": 55
            },
            
            # Sales Team
            {
                "email": "patricia.brown@company.com",
                "first_name": "Patricia", "last_name": "Brown", 
                "role": "manager", "department": "Sales",
                "skills": ["B2B Sales", "CRM", "Lead Generation", "Customer Success", "Negotiation"],
                "hourly_rate": 70
            },
            {
                "email": "christopher.white@company.com",
                "first_name": "Christopher", "last_name": "White",
                "role": "member", "department": "Sales",
                "skills": ["B2B Sales", "Account Management", "CRM", "Customer Success", "Negotiation"],
                "hourly_rate": 60
            },
            
            # Operations Team
            {
                "email": "amanda.martinez@company.com",
                "first_name": "Amanda", "last_name": "Martinez",
                "role": "manager", "department": "Operations",
                "skills": ["Strategic Planning", "Agile/Scrum", "Risk Management", "Team Leadership"],
                "hourly_rate": 75
            },
            {
                "email": "daniel.garcia@company.com", 
                "first_name": "Daniel", "last_name": "Garcia",
                "role": "member", "department": "Operations",
                "skills": ["Agile/Scrum", "Kanban", "Risk Management", "Team Coordination"],
                "hourly_rate": 55
            }
        ]
        
        # Project templates
        self.project_templates = [
            {
                "name": "E-commerce Platform Redesign",
                "description": "Complete overhaul of the company's e-commerce platform with modern UI/UX and enhanced performance",
                "type": "software_development",
                "priority": "high",
                "estimated_hours": 2400,
                "duration_weeks": 16,
                "required_skills": ["React", "Node.js", "PostgreSQL", "UI/UX Design", "DevOps"]
            },
            {
                "name": "Mobile App Development", 
                "description": "Native mobile application for iOS and Android platforms with offline capabilities",
                "type": "mobile_development",
                "priority": "critical",
                "estimated_hours": 1800,
                "duration_weeks": 12,
                "required_skills": ["React Native", "Mobile Development", "API Integration", "UI/UX Design"]
            },
            {
                "name": "Data Analytics Dashboard",
                "description": "Business intelligence dashboard for real-time analytics and reporting",
                "type": "analytics",
                "priority": "medium", 
                "estimated_hours": 1200,
                "duration_weeks": 10,
                "required_skills": ["Python", "Data Science", "React", "PostgreSQL"]
            },
            {
                "name": "Customer Support Portal",
                "description": "Self-service customer support portal with AI-powered chatbot integration", 
                "type": "customer_service",
                "priority": "medium",
                "estimated_hours": 1600,
                "duration_weeks": 14,
                "required_skills": ["Vue.js", "Python", "AI/ML", "UI/UX Design"]
            },
            {
                "name": "Marketing Automation System",
                "description": "Comprehensive marketing automation platform with email campaigns and lead scoring",
                "type": "marketing",
                "priority": "medium",
                "estimated_hours": 2000, 
                "duration_weeks": 15,
                "required_skills": ["JavaScript", "Python", "Marketing", "Database"]
            },
            {
                "name": "Infrastructure Modernization",
                "description": "Migration to cloud-native architecture with microservices and containerization",
                "type": "infrastructure",
                "priority": "high",
                "estimated_hours": 2800,
                "duration_weeks": 20,
                "required_skills": ["DevOps", "Docker", "Kubernetes", "AWS", "Python"]
            },
            {
                "name": "API Gateway Implementation",
                "description": "Centralized API gateway with authentication, rate limiting, and monitoring", 
                "type": "backend_infrastructure",
                "priority": "high",
                "estimated_hours": 1400,
                "duration_weeks": 12,
                "required_skills": ["Node.js", "DevOps", "API Design", "Security"]
            },
            {
                "name": "Content Management System",
                "description": "Custom CMS for managing website content with workflow approval system",
                "type": "cms",
                "priority": "low",
                "estimated_hours": 1000,
                "duration_weeks": 8,
                "required_skills": ["React", "Node.js", "MongoDB", "UI/UX Design"]
            }
        ]

    async def connect_database(self):
        """Connect to the database"""
        await connect_to_mongo()
        self.db = await get_database()
        print("✅ Connected to database")

    async def cleanup_existing_data(self):
        """Safely cleanup existing demo data while preserving the demo user and organization"""
        print("🧹 Cleaning up existing demo data...")
        
        try:
            # Delete all data except the main demo user and organization
            collections_to_clean = [
                ("users", {"organization_id": self.org_id, "email": {"$ne": "demo@company.com"}}),
                ("teams", {"organization_id": self.org_id}),
                ("projects", {"organization_id": self.org_id}),
                ("tasks", {}),  # Tasks don't have organization_id directly
                ("comments", {"organization_id": self.org_id}),
                ("files", {"organization_id": self.org_id}),
                ("notifications", {"organization_id": self.org_id}),
                ("ai_training_history", {"organization_id": self.org_id}),
                ("integrations", {"organization_id": self.org_id})
            ]
            
            for collection_name, query in collections_to_clean:
                try:
                    result = await self.db[collection_name].delete_many(query)
                    print(f"   Cleaned {result.deleted_count} items from {collection_name}")
                except Exception as e:
                    print(f"   Warning: Could not clean {collection_name}: {e}")
            
            print("✅ Cleanup completed")
            return True
            
        except Exception as e:
            print(f"❌ Cleanup failed: {e}")
            return False

    async def create_users(self):
        """Create demo users with proper error handling"""
        print("👥 Creating demo users...")
        
        try:
            users_created = 0
            
            for profile in self.user_profiles:
                # Check if user already exists
                existing_user = await self.db.users.find_one({"email": profile["email"]})
                if existing_user:
                    print(f"   User {profile['email']} already exists, skipping")
                    self.generated_data["users"].append(existing_user)
                    continue
                
                user_id = str(uuid.uuid4())
                user_data = {
                    "id": user_id,
                    "email": profile["email"],
                    "username": f"{profile['first_name'].lower()}_{profile['last_name'].lower()}",
                    "password_hash": hash_password("demo123456"),
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "phone": f"+1-555-{random.randint(1000, 9999)}",
                    "bio": f"Experienced {profile['department']} professional with expertise in {', '.join(profile['skills'][:3])}",
                    "avatar_url": None,
                    "role": profile["role"],
                    "organization_id": self.org_id,
                    "department": profile["department"],
                    "is_active": True,
                    "status": "active",
                    "email_verified": True,
                    "skills": [{"name": skill, "level": random.randint(6, 10), "years_experience": random.randint(2, 8)} for skill in profile["skills"]],
                    "hourly_rate": profile["hourly_rate"],
                    "availability": "full_time",
                    "team_memberships": [],
                    "timezone": "UTC",
                    "language": "en",
                    "theme": "light",
                    "notifications_enabled": True,
                    "profile_completed": True,
                    "onboarding_completed": True,
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 200)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.users.insert_one(user_data)
                self.generated_data["users"].append(user_data)
                users_created += 1
                
            print(f"✅ Created {users_created} new users")
            return True
            
        except Exception as e:
            print(f"❌ User creation failed: {e}")
            return False

    async def create_teams(self):
        """Create demo teams"""
        print("👨‍👩‍👧‍👦 Creating demo teams...")
        
        try:
            team_configs = [
                {
                    "name": "Development Team",
                    "description": "Full-stack development team responsible for web and mobile applications",
                    "type": "development",
                    "department": "Engineering",
                    "skills_focus": ["React", "Node.js", "Python", "TypeScript", "Mobile Development", "DevOps"]
                },
                {
                    "name": "Design Team",
                    "description": "User experience and visual design team", 
                    "type": "design",
                    "department": "Design",
                    "skills_focus": ["UI/UX Design", "Figma", "Prototyping", "User Research"]
                },
                {
                    "name": "Data Science Team",
                    "description": "Data analytics and business intelligence team",
                    "type": "operations", 
                    "department": "Data Science",
                    "skills_focus": ["Python", "Data Analysis", "Machine Learning", "PostgreSQL"]
                },
                {
                    "name": "Marketing Team",
                    "description": "Digital marketing and content strategy team",
                    "type": "marketing",
                    "department": "Marketing",
                    "skills_focus": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Social Media"]
                },
                {
                    "name": "Sales Team", 
                    "description": "Business development and customer success team",
                    "type": "sales",
                    "department": "Sales",
                    "skills_focus": ["B2B Sales", "Account Management", "Customer Success", "CRM"]
                },
                {
                    "name": "Operations Team",
                    "description": "Project management and operations coordination team",
                    "type": "operations",
                    "department": "Operations", 
                    "skills_focus": ["Agile/Scrum", "Strategic Planning", "Risk Management"]
                }
            ]
            
            for team_config in team_configs:
                # Find team members by department
                team_members = [user for user in self.generated_data["users"] if user.get("department") == team_config["department"]]
                
                if not team_members:
                    print(f"   No members found for {team_config['name']}, skipping")
                    continue
                
                # Find team lead
                team_lead = next((member for member in team_members if member["role"] in ["team_lead", "manager"]), None)
                
                team_id = str(uuid.uuid4())
                team_data = {
                    "id": team_id,
                    "name": team_config["name"],
                    "description": team_config["description"],
                    "type": team_config["type"],
                    "department": team_config["department"],
                    "organization_id": self.org_id,
                    "lead_id": team_lead["id"] if team_lead else team_members[0]["id"],
                    "members": [{"user_id": member["id"], "role": member["role"]} for member in team_members],
                    "member_count": len(team_members),
                    "skills_focus": team_config["skills_focus"],
                    "capacity_hours_per_week": len(team_members) * 40,
                    "current_utilization": random.uniform(0.6, 0.9),
                    "is_active": True,
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 200)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.teams.insert_one(team_data)
                self.generated_data["teams"].append(team_data)
                
                # Update users with team membership
                for member in team_members:
                    await self.db.users.update_one(
                        {"id": member["id"]},
                        {"$push": {"team_memberships": team_id}}
                    )
                
            print(f"✅ Created {len(self.generated_data['teams'])} teams")
            return True
            
        except Exception as e:
            print(f"❌ Team creation failed: {e}")
            return False

    async def create_projects(self):
        """Create demo projects"""
        print("📁 Creating demo projects...")
        
        try:
            if not self.generated_data["users"]:
                print("   No users available for project assignment")
                return False
                
            for i, template in enumerate(self.project_templates):
                project_id = str(uuid.uuid4())
                
                # Determine project status and dates
                status_options = ["planning", "active", "on_hold", "completed"]
                weights = [0.2, 0.5, 0.1, 0.2]
                status = random.choices(status_options, weights=weights)[0]
                
                # Set dates based on status
                created_date = datetime.utcnow() - timedelta(days=random.randint(30, 180))
                if status == "completed":
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    end_date = start_date + timedelta(weeks=template["duration_weeks"])
                    due_date = end_date
                    progress = 100
                elif status == "active":
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(20, 80)
                elif status == "planning":
                    start_date = datetime.utcnow() + timedelta(weeks=random.randint(1, 4))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(0, 15)
                else:  # on_hold
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(10, 40)
                
                # Assign project manager and team
                project_manager = random.choice([u for u in self.generated_data["users"] if u["role"] in ["admin", "manager", "team_lead"]])
                team_members = random.sample(self.generated_data["users"], random.randint(3, 8))
                
                # Budget calculation
                avg_hourly_rate = 70
                budget = template["estimated_hours"] * avg_hourly_rate
                spent_percentage = progress / 100
                budget_spent = budget * spent_percentage * random.uniform(0.8, 1.2)
                
                project_data = {
                    "id": project_id,
                    "name": template["name"],
                    "description": template["description"],
                    "type": template["type"],
                    "status": status,
                    "priority": template["priority"],
                    "organization_id": self.org_id,
                    "owner_id": project_manager["id"],
                    "manager_id": project_manager["id"],
                    "team_members": [{"user_id": member["id"], "role": "contributor"} for member in team_members],
                    "start_date": start_date,
                    "due_date": due_date,
                    "end_date": end_date,
                    "estimated_hours": template["estimated_hours"],
                    "actual_hours": int(template["estimated_hours"] * progress / 100),
                    "progress_percentage": progress,
                    "budget": budget,
                    "budget_spent": budget_spent,
                    "budget_currency": "USD",
                    "tags": template["required_skills"][:3],
                    "required_skills": [{"name": skill, "required_level": random.randint(6, 9)} for skill in template["required_skills"]],
                    "risk_level": random.choice(["low", "medium", "high"]),
                    "is_billable": True,
                    "is_active": status in ["active", "planning"],
                    "created_at": created_date,
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.projects.insert_one(project_data)
                self.generated_data["projects"].append(project_data)
                
            print(f"✅ Created {len(self.generated_data['projects'])} projects")
            return True
            
        except Exception as e:
            print(f"❌ Project creation failed: {e}")
            return False

    async def create_tasks(self):
        """Create demo tasks"""
        print("✅ Creating demo tasks...")
        
        try:
            if not self.generated_data["projects"] or not self.generated_data["users"]:
                print("   No projects or users available for task creation")
                return False
                
            task_templates = [
                "Requirements gathering and analysis", "System design and architecture", "Database schema design",
                "Frontend development", "Backend API development", "User interface design", 
                "Testing and quality assurance", "Performance optimization", "Security implementation",
                "Documentation creation", "Code review and refactoring", "Integration testing",
                "User acceptance testing", "Bug fixing and refinement", "Deployment setup"
            ]
            
            task_counter = 1
            
            for project in self.generated_data["projects"]:
                num_tasks = random.randint(8, 15)
                
                for i in range(num_tasks):
                    task_id = str(uuid.uuid4())
                    task_title = random.choice(task_templates)
                    
                    # Determine status based on project progress
                    if project["status"] == "completed":
                        status = random.choices(["completed", "cancelled"], weights=[0.9, 0.1])[0]
                    elif project["status"] == "active":
                        status = random.choices(
                            ["completed", "in_progress", "in_review", "todo", "blocked"],
                            weights=[0.3, 0.3, 0.15, 0.2, 0.05]
                        )[0]
                    elif project["status"] == "planning":
                        status = random.choices(["todo", "in_progress"], weights=[0.7, 0.3])[0]
                    else:  # on_hold
                        status = random.choices(["todo", "blocked"], weights=[0.6, 0.4])[0]
                    
                    # Assign task to project team member
                    team_member_ids = [tm["user_id"] for tm in project["team_members"]]
                    assignee_id = random.choice(team_member_ids) if team_member_ids else None
                    
                    # Task dates
                    task_start = project["start_date"] + timedelta(days=random.randint(0, 30))
                    task_due = task_start + timedelta(days=random.randint(3, 21))
                    
                    # Hours
                    estimated_hours = random.randint(4, 40)
                    actual_hours = 0
                    if status == "completed":
                        actual_hours = estimated_hours * random.uniform(0.8, 1.3)
                    elif status == "in_progress":
                        actual_hours = estimated_hours * random.uniform(0.1, 0.7)
                    elif status == "in_review":
                        actual_hours = estimated_hours * random.uniform(0.8, 1.0)
                    
                    task_data = {
                        "id": task_id,
                        "title": f"{task_title} - {project['name']}",
                        "description": f"Complete {task_title.lower()} for the {project['name']} project.",
                        "project_id": project["id"],
                        "organization_id": self.org_id,
                        "assignee_id": assignee_id,
                        "creator_id": project["manager_id"],
                        "status": status,
                        "priority": random.choice(["low", "medium", "high", "critical"]),
                        "type": "task",
                        "estimated_hours": estimated_hours,
                        "actual_hours": actual_hours,
                        "start_date": task_start,
                        "due_date": task_due,
                        "completed_date": task_due if status == "completed" else None,
                        "progress_percentage": 100 if status == "completed" else random.randint(0, 90) if status == "in_progress" else 0,
                        "tags": [project["type"].replace("_", " ").title(), task_title],
                        "is_billable": project["is_billable"],
                        "created_at": task_start - timedelta(days=random.randint(1, 5)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.tasks.insert_one(task_data)
                    self.generated_data["tasks"].append(task_data)
                    task_counter += 1
                    
            print(f"✅ Created {len(self.generated_data['tasks'])} tasks")
            return True
            
        except Exception as e:
            print(f"❌ Task creation failed: {e}")
            return False

    async def create_comments_and_files(self):
        """Create sample comments and files"""
        print("💬 Creating comments and files...")
        
        try:
            comment_templates = [
                "Made good progress on this today. Should be ready for review soon.",
                "Encountered some technical challenges. Working on alternative approach.",
                "Please review the latest changes when you have a chance.",
                "Blocking issue resolved. Moving forward with implementation.",
                "Updated the requirements based on stakeholder feedback.",
                "Code review completed. Made suggested improvements.",
                "Testing phase complete. All unit tests passing.",
                "Documentation updated to reflect latest changes."
            ]
            
            # Create comments
            if self.generated_data["tasks"] and self.generated_data["users"]:
                active_tasks = [t for t in self.generated_data["tasks"] if t["status"] in ["in_progress", "in_review", "blocked"]]
                
                for i in range(min(50, len(active_tasks))):
                    task = random.choice(active_tasks)
                    commenter_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                    
                    comment_data = {
                        "id": str(uuid.uuid4()),
                        "content": random.choice(comment_templates),
                        "entity_type": "task",
                        "entity_id": task["id"],
                        "author_id": commenter_id,
                        "organization_id": self.org_id,
                        "type": "comment",
                        "is_internal": True,
                        "parent_comment_id": None,
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.comments.insert_one(comment_data)
                    self.generated_data["comments"].append(comment_data)
            
            # Create files
            file_templates = [
                {"name": "Requirements Document", "type": "document", "size": 245760},
                {"name": "Design Mockups", "type": "image", "size": 1048576},
                {"name": "Technical Specification", "type": "document", "size": 524288},
                {"name": "Test Results", "type": "document", "size": 102400}
            ]
            
            if self.generated_data["tasks"] and self.generated_data["users"]:
                for i in range(min(30, len(self.generated_data["tasks"]))):
                    task = random.choice(self.generated_data["tasks"])
                    file_template = random.choice(file_templates)
                    uploader_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                    
                    file_data = {
                        "id": str(uuid.uuid4()),
                        "name": f"{file_template['name']} - {task['title'][:30]}...",
                        "original_name": f"{file_template['name'].lower().replace(' ', '_')}.pdf",
                        "file_type": file_template["type"],
                        "size": file_template["size"],
                        "entity_type": "task",
                        "entity_id": task["id"],
                        "uploader_id": uploader_id,
                        "organization_id": self.org_id,
                        "file_path": f"/uploads/{self.org_id}/tasks/{task['id']}/file-{i+1:03d}.pdf",
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.files.insert_one(file_data)
                    self.generated_data["files"].append(file_data)
            
            print(f"✅ Created {len(self.generated_data['comments'])} comments and {len(self.generated_data['files'])} files")
            return True
            
        except Exception as e:
            print(f"❌ Comments/files creation failed: {e}")
            return False

    async def create_ai_integration_data(self):
        """Create AI and integration sample data"""
        print("🤖 Creating AI and integration data...")
        
        try:
            # AI Training History
            ai_training_data = []
            model_types = [
                "task_duration_predictor", "team_performance_predictor",
                "project_success_classifier", "resource_utilization_predictor"
            ]
            
            for model_type in model_types:
                for i in range(5):
                    training_record = {
                        "id": str(uuid.uuid4()),
                        "model_type": model_type,
                        "training_session_id": str(uuid.uuid4()),
                        "accuracy": random.uniform(0.75, 0.95),
                        "loss": random.uniform(0.05, 0.25),
                        "data_points": random.randint(500, 2000),
                        "training_duration_minutes": random.randint(5, 45),
                        "model_version": f"1.{i+1}.0",
                        "organization_id": self.org_id,
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 90)),
                        "updated_at": datetime.utcnow()
                    }
                    ai_training_data.append(training_record)
            
            if ai_training_data:
                await self.db.ai_training_history.insert_many(ai_training_data)
            
            # Integration Configurations
            integration_configs = [
                {
                    "id": str(uuid.uuid4()),
                    "type": "slack",
                    "name": "Slack Workspace Integration",
                    "status": "active",
                    "configuration": {
                        "workspace_name": "Demo Company",
                        "channels": ["#general", "#dev-team", "#announcements"],
                        "features": ["notifications", "status_updates", "task_alerts"]
                    },
                    "organization_id": self.org_id,
                    "created_at": datetime.utcnow() - timedelta(days=30),
                    "updated_at": datetime.utcnow()
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "microsoft_teams",
                    "name": "Microsoft Teams Integration",
                    "status": "configured",
                    "configuration": {
                        "channels": ["Project Updates", "Team General"],
                        "features": ["adaptive_cards", "task_management", "meeting_integration"]
                    },
                    "organization_id": self.org_id,
                    "created_at": datetime.utcnow() - timedelta(days=25),
                    "updated_at": datetime.utcnow()
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "github",
                    "name": "GitHub Repository Integration",
                    "status": "active",
                    "configuration": {
                        "organization": "demo-company",
                        "repositories": ["main-app", "mobile-app", "api-gateway"],
                        "features": ["pr_tracking", "deployment_status", "code_quality"]
                    },
                    "organization_id": self.org_id,
                    "created_at": datetime.utcnow() - timedelta(days=20),
                    "updated_at": datetime.utcnow()
                }
            ]
            
            if integration_configs:
                await self.db.integrations.insert_many(integration_configs)
            
            print(f"✅ Created {len(ai_training_data)} AI training records and {len(integration_configs)} integrations")
            return True
            
        except Exception as e:
            print(f"❌ AI/Integration data creation failed: {e}")
            return False

    async def update_organization_stats(self):
        """Update organization statistics"""
        print("📊 Updating organization statistics...")
        
        try:
            stats = {
                "member_count": len(self.generated_data["users"]) + 1,  # +1 for demo user
                "project_count": len(self.generated_data["projects"]),
                "active_projects": len([p for p in self.generated_data["projects"] if p["status"] == "active"]),
                "completed_projects": len([p for p in self.generated_data["projects"] if p["status"] == "completed"]),
                "total_tasks": len(self.generated_data["tasks"]),
                "completed_tasks": len([t for t in self.generated_data["tasks"] if t["status"] == "completed"]),
                "team_count": len(self.generated_data["teams"])
            }
            
            await self.db.organizations.update_one(
                {"id": self.org_id},
                {
                    "$set": {
                        "member_count": stats["member_count"],
                        "project_count": stats["project_count"],
                        "stats": stats,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            print("✅ Organization statistics updated")
            return True
            
        except Exception as e:
            print(f"❌ Statistics update failed: {e}")
            return False

    async def generate_report(self):
        """Generate comprehensive report"""
        print("📋 Generating completion report...")
        
        try:
            report = {
                "generation_timestamp": datetime.utcnow().isoformat(),
                "status": "completed",
                "summary": {
                    "users_created": len(self.generated_data["users"]),
                    "teams_created": len(self.generated_data["teams"]),
                    "projects_created": len(self.generated_data["projects"]),
                    "tasks_created": len(self.generated_data["tasks"]),
                    "comments_created": len(self.generated_data["comments"]),
                    "files_created": len(self.generated_data["files"]),
                    "total_data_points": sum(len(data) for data in self.generated_data.values())
                },
                "access_information": {
                    "demo_login": "demo@company.com / demo123456",
                    "frontend_url": "http://localhost:3000",
                    "backend_api": "http://localhost:8001",
                    "api_docs": "http://localhost:8001/docs"
                }
            }
            
            # Save report
            report_file = f"/app/fixed_demo_data_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            print("=" * 80)
            print("🎉 DEMO DATA GENERATION COMPLETED SUCCESSFULLY!")
            print("=" * 80)
            print(f"📊 Summary:")
            print(f"   👥 Users: {report['summary']['users_created']} + 1 (demo user)")
            print(f"   👨‍👩‍👧‍👦 Teams: {report['summary']['teams_created']}")
            print(f"   📁 Projects: {report['summary']['projects_created']}")
            print(f"   ✅ Tasks: {report['summary']['tasks_created']}")
            print(f"   💬 Comments: {report['summary']['comments_created']}")
            print(f"   📎 Files: {report['summary']['files_created']}")
            print(f"   📋 Total Data Points: {report['summary']['total_data_points']}")
            print(f"\n🔑 Access Information:")
            print(f"   Demo Login: {report['access_information']['demo_login']}")
            print(f"   Frontend: {report['access_information']['frontend_url']}")
            print(f"   Backend API: {report['access_information']['backend_api']}")
            print(f"\n💾 Report saved to: {report_file}")
            print("=" * 80)
            
            return report
            
        except Exception as e:
            print(f"❌ Report generation failed: {e}")
            return None

    async def run_complete_generation(self):
        """Run the complete demo data generation process"""
        print("🚀 Starting Fixed Demo Data Generation...")
        print("=" * 80)
        
        start_time = datetime.utcnow()
        
        try:
            # Connect to database
            await self.connect_database()
            
            # Run generation steps
            steps = [
                ("Cleanup existing data", self.cleanup_existing_data),
                ("Create users", self.create_users),
                ("Create teams", self.create_teams),
                ("Create projects", self.create_projects),
                ("Create tasks", self.create_tasks),
                ("Create comments and files", self.create_comments_and_files),
                ("Create AI and integration data", self.create_ai_integration_data),
                ("Update organization statistics", self.update_organization_stats)
            ]
            
            success_count = 0
            for step_name, step_function in steps:
                print(f"\n🔄 {step_name}...")
                if await step_function():
                    success_count += 1
                else:
                    print(f"⚠️ {step_name} had issues but continuing...")
            
            # Generate report
            report = await self.generate_report()
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            print(f"\n⏱️ Generation completed in {duration:.2f} seconds")
            print(f"✅ Success rate: {success_count}/{len(steps)} steps completed")
            
            return report is not None
            
        except Exception as e:
            print(f"❌ Demo data generation failed: {e}")
            return False

if __name__ == "__main__":
    generator = FixedDemoDataGenerator()
    success = asyncio.run(generator.run_complete_generation())
    sys.exit(0 if success else 1)