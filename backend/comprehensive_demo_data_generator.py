#!/usr/bin/env python3
"""
Comprehensive Demo Data Generator for Enterprise Portfolio Management System
Consolidates all demo data generation into one reliable script with realistic, interconnected data
"""

import asyncio
import sys
import os
import json
from datetime import datetime, timedelta, date
import random
import uuid
from typing import List, Dict, Any
import logging

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from auth.utils import hash_password

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ComprehensiveDemoDataGenerator:
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
        
        # User profiles with realistic data for different roles
        self.user_profiles = [
            # Development Team
            {
                "email": "sarah.johnson@company.com",
                "first_name": "Sarah", "last_name": "Johnson",
                "role": "team_lead", "department": "Engineering",
                "skills": ["React", "TypeScript", "Node.js", "Python", "Team Leadership", "System Design"],
                "hourly_rate": 85, "experience_years": 8,
                "bio": "Senior Full-Stack Developer with expertise in modern web technologies and team leadership"
            },
            {
                "email": "marcus.chen@company.com", 
                "first_name": "Marcus", "last_name": "Chen",
                "role": "member", "department": "Engineering",
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "MongoDB"],
                "hourly_rate": 75, "experience_years": 6,
                "bio": "Backend Developer specializing in scalable API development and cloud infrastructure"
            },
            {
                "email": "emily.rodriguez@company.com",
                "first_name": "Emily", "last_name": "Rodriguez", 
                "role": "member", "department": "Engineering",
                "skills": ["React", "TypeScript", "Tailwind CSS", "Next.js", "JavaScript", "UI/UX Design"],
                "hourly_rate": 70, "experience_years": 4,
                "bio": "Frontend Developer passionate about creating beautiful and intuitive user interfaces"
            },
            {
                "email": "james.wilson@company.com",
                "first_name": "James", "last_name": "Wilson",
                "role": "member", "department": "Engineering", 
                "skills": ["React Native", "iOS Development", "Android Development", "Flutter", "Swift", "Kotlin"],
                "hourly_rate": 80, "experience_years": 7,
                "bio": "Mobile Developer with cross-platform expertise and native development experience"
            },
            {
                "email": "alex.kumar@company.com",
                "first_name": "Alex", "last_name": "Kumar",
                "role": "member", "department": "Engineering",
                "skills": ["Docker", "Kubernetes", "AWS", "Terraform", "Jenkins", "Python", "Linux"],
                "hourly_rate": 85, "experience_years": 9,
                "bio": "DevOps Engineer focused on automation, scalability, and cloud infrastructure"
            },
            
            # Design Team
            {
                "email": "maria.gonzalez@company.com",
                "first_name": "Maria", "last_name": "Gonzalez",
                "role": "team_lead", "department": "Design",
                "skills": ["UI/UX Design", "Figma", "Adobe Creative Suite", "User Research", "Prototyping", "Design Systems"],
                "hourly_rate": 80, "experience_years": 7,
                "bio": "Lead UX Designer with expertise in user research and design system architecture"
            },
            {
                "email": "david.thompson@company.com",
                "first_name": "David", "last_name": "Thompson",
                "role": "member", "department": "Design",
                "skills": ["UI Design", "Figma", "Sketch", "Prototyping", "Visual Design", "Brand Identity"],
                "hourly_rate": 65, "experience_years": 4,
                "bio": "Visual Designer specializing in modern UI design and brand identity"
            },
            
            # Data Science Team  
            {
                "email": "lisa.park@company.com",
                "first_name": "Lisa", "last_name": "Park",
                "role": "team_lead", "department": "Data Science",
                "skills": ["Python", "Machine Learning", "Data Analysis", "Pandas", "TensorFlow", "SQL", "Statistics"],
                "hourly_rate": 90, "experience_years": 10,
                "bio": "Senior Data Scientist with expertise in ML model development and statistical analysis"
            },
            {
                "email": "michael.chang@company.com",
                "first_name": "Michael", "last_name": "Chang",
                "role": "member", "department": "Data Science",
                "skills": ["Python", "Data Analysis", "SQL", "R", "Data Visualization", "Excel", "Tableau"],
                "hourly_rate": 65, "experience_years": 3,
                "bio": "Data Analyst focused on business intelligence and data visualization"
            },
            
            # Marketing Team
            {
                "email": "jennifer.davis@company.com",
                "first_name": "Jennifer", "last_name": "Davis",
                "role": "manager", "department": "Marketing",
                "skills": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Social Media", "Analytics", "Campaign Management"],
                "hourly_rate": 75, "experience_years": 8,
                "bio": "Marketing Manager with expertise in digital campaigns and content strategy"
            },
            {
                "email": "robert.taylor@company.com",
                "first_name": "Robert", "last_name": "Taylor",
                "role": "member", "department": "Marketing",
                "skills": ["Content Creation", "Social Media", "SEO", "Google Analytics", "Brand Management", "Copywriting"],
                "hourly_rate": 55, "experience_years": 3,
                "bio": "Marketing Specialist focused on content creation and social media management"
            },
            
            # Sales Team
            {
                "email": "patricia.brown@company.com",
                "first_name": "Patricia", "last_name": "Brown", 
                "role": "manager", "department": "Sales",
                "skills": ["B2B Sales", "CRM Management", "Lead Generation", "Customer Success", "Negotiation", "Pipeline Management"],
                "hourly_rate": 70, "experience_years": 9,
                "bio": "Sales Manager with proven track record in B2B sales and customer relationship management"
            },
            {
                "email": "christopher.white@company.com",
                "first_name": "Christopher", "last_name": "White",
                "role": "member", "department": "Sales",
                "skills": ["B2B Sales", "Account Management", "CRM", "Customer Success", "Prospecting", "Presentation"],
                "hourly_rate": 60, "experience_years": 4,
                "bio": "Sales Representative specializing in account management and customer success"
            },
            
            # Operations Team
            {
                "email": "amanda.martinez@company.com",
                "first_name": "Amanda", "last_name": "Martinez",
                "role": "manager", "department": "Operations",
                "skills": ["Strategic Planning", "Agile/Scrum", "Risk Management", "Team Leadership", "Process Optimization"],
                "hourly_rate": 75, "experience_years": 8,
                "bio": "Operations Manager focused on strategic planning and process optimization"
            },
            {
                "email": "daniel.garcia@company.com", 
                "first_name": "Daniel", "last_name": "Garcia",
                "role": "member", "department": "Operations",
                "skills": ["Agile/Scrum", "Kanban", "Risk Management", "Team Coordination", "Quality Assurance"],
                "hourly_rate": 55, "experience_years": 5,
                "bio": "Operations Coordinator with expertise in agile methodologies and quality assurance"
            }
        ]
        
        # Project templates with realistic data
        self.project_templates = [
            {
                "name": "E-commerce Platform Redesign",
                "description": "Complete overhaul of the company's e-commerce platform with modern UI/UX, enhanced performance, and mobile responsiveness",
                "type": "software_development",
                "priority": "high",
                "status": "active",
                "estimated_hours": 2400,
                "duration_weeks": 16,
                "budget": 180000,
                "required_skills": ["React", "Node.js", "PostgreSQL", "UI/UX Design", "DevOps"],
                "category": "Web Development",
                "tags": ["ecommerce", "frontend", "backend", "redesign"]
            },
            {
                "name": "Mobile App Development", 
                "description": "Native mobile application for iOS and Android platforms with offline capabilities and real-time synchronization",
                "type": "mobile_development",
                "priority": "critical",
                "status": "active",
                "estimated_hours": 1800,
                "duration_weeks": 12,
                "budget": 150000,
                "required_skills": ["React Native", "Mobile Development", "API Integration", "UI/UX Design"],
                "category": "Mobile Development",
                "tags": ["mobile", "ios", "android", "cross-platform"]
            },
            {
                "name": "Data Analytics Dashboard",
                "description": "Business intelligence dashboard for real-time analytics, reporting, and data visualization with interactive charts",
                "type": "analytics",
                "priority": "medium", 
                "status": "active",
                "estimated_hours": 1200,
                "duration_weeks": 10,
                "budget": 90000,
                "required_skills": ["Python", "Data Science", "React", "PostgreSQL"],
                "category": "Data Science",
                "tags": ["analytics", "dashboard", "data", "visualization"]
            },
            {
                "name": "Customer Support Portal",
                "description": "Self-service customer support portal with AI-powered chatbot, knowledge base, and ticket management system", 
                "type": "customer_service",
                "priority": "medium",
                "status": "planning",
                "estimated_hours": 1600,
                "duration_weeks": 14,
                "budget": 120000,
                "required_skills": ["Vue.js", "Python", "AI/ML", "UI/UX Design"],
                "category": "Customer Service",
                "tags": ["support", "ai", "chatbot", "self-service"]
            },
            {
                "name": "Marketing Automation System",
                "description": "Comprehensive marketing automation platform with email campaigns, lead scoring, and customer journey mapping",
                "type": "marketing",
                "priority": "medium",
                "status": "completed",
                "estimated_hours": 2000, 
                "duration_weeks": 15,
                "budget": 140000,
                "required_skills": ["JavaScript", "Python", "Marketing", "Database"],
                "category": "Marketing Technology",
                "tags": ["automation", "email", "campaigns", "leads"]
            },
            {
                "name": "Infrastructure Modernization",
                "description": "Migration to cloud-native architecture with microservices, containerization, and automated deployment pipelines",
                "type": "infrastructure",
                "priority": "high",
                "status": "active",
                "estimated_hours": 2800,
                "duration_weeks": 20,
                "budget": 200000,
                "required_skills": ["DevOps", "Docker", "Kubernetes", "AWS", "Python"],
                "category": "Infrastructure",
                "tags": ["cloud", "microservices", "containers", "automation"]
            }
        ]

    async def connect_database(self):
        """Connect to the database"""
        try:
            await connect_to_mongo()
            self.db = await get_database()
            logger.info("✅ Connected to database")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            raise

    async def cleanup_existing_data(self):
        """Safely cleanup existing demo data while preserving the demo user and organization"""
        logger.info("🧹 Cleaning up existing demo data...")
        
        try:
            # Delete all data except the main demo user and organization
            collections_to_clean = [
                ("users", {"organization_id": self.org_id, "email": {"$ne": "demo@company.com"}}),
                ("teams", {"organization_id": self.org_id}),
                ("projects", {"organization_id": self.org_id}),
                ("tasks", {"project_id": {"$regex": "^proj-"}}),  # Tasks related to demo projects
                ("comments", {"organization_id": self.org_id}),
                ("files", {"organization_id": self.org_id}),
                ("notifications", {"organization_id": self.org_id})
            ]
            
            for collection_name, query in collections_to_clean:
                try:
                    result = await self.db[collection_name].delete_many(query)
                    logger.info(f"   Cleaned {result.deleted_count} items from {collection_name}")
                except Exception as e:
                    logger.warning(f"   Could not clean {collection_name}: {e}")
            
            # Reset organization stats
            await self.db.organizations.update_one(
                {"id": self.org_id},
                {
                    "$set": {
                        "member_count": 1,
                        "project_count": 0,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info("✅ Cleanup completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
            return False

    async def create_users(self):
        """Create demo users with proper error handling"""
        logger.info("👥 Creating demo users...")
        
        try:
            users_created = 0
            
            for profile in self.user_profiles:
                # Check if user already exists
                existing_user = await self.db.users.find_one({"email": profile["email"]})
                if existing_user:
                    logger.info(f"   User {profile['email']} already exists, skipping")
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
                    "bio": profile.get("bio", f"Experienced {profile['department']} professional"),
                    "avatar_url": None,
                    "role": profile["role"],
                    "organization_id": self.org_id,
                    "is_active": True,
                    "status": "active",
                    "email_verified": True,
                    "email_verification_token": None,
                    "password_reset_token": None,
                    "password_reset_expires": None,
                    "last_login": datetime.utcnow() - timedelta(days=random.randint(1, 7)),
                    "login_count": random.randint(5, 50),
                    "timezone": "UTC",
                    "language": "en",
                    "theme": random.choice(["light", "dark"]),
                    "notifications_enabled": True,
                    "profile_completed": True,
                    "onboarding_completed": True,
                    "metadata": {
                        "department": profile["department"],
                        "skills": profile["skills"],
                        "hourly_rate": profile["hourly_rate"],
                        "experience_years": profile.get("experience_years", 5),
                        "availability": "full_time"
                    },
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 200)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.users.insert_one(user_data)
                self.generated_data["users"].append(user_data)
                users_created += 1
                
            logger.info(f"✅ Created {users_created} new users")
            return True
            
        except Exception as e:
            logger.error(f"❌ User creation failed: {e}")
            return False

    async def create_teams(self):
        """Create demo teams"""
        logger.info("👨‍👩‍👧‍👦 Creating demo teams...")
        
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
                    "description": "User experience and visual design team creating intuitive interfaces", 
                    "type": "design",
                    "department": "Design",
                    "skills_focus": ["UI/UX Design", "Figma", "Prototyping", "User Research"]
                },
                {
                    "name": "Data Science Team",
                    "description": "Data analytics and business intelligence team driving data-driven decisions",
                    "type": "operations", 
                    "department": "Data Science",
                    "skills_focus": ["Python", "Data Analysis", "Machine Learning", "SQL"]
                },
                {
                    "name": "Marketing Team",
                    "description": "Digital marketing and content strategy team focused on growth",
                    "type": "marketing",
                    "department": "Marketing",
                    "skills_focus": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Social Media"]
                },
                {
                    "name": "Sales Team", 
                    "description": "Business development and customer success team driving revenue growth",
                    "type": "sales",
                    "department": "Sales",
                    "skills_focus": ["B2B Sales", "Account Management", "Customer Success", "CRM"]
                },
                {
                    "name": "Operations Team",
                    "description": "Project management and operations coordination ensuring smooth execution",
                    "type": "operations",
                    "department": "Operations", 
                    "skills_focus": ["Agile/Scrum", "Strategic Planning", "Risk Management"]
                }
            ]
            
            for team_config in team_configs:
                # Find team members by department
                team_members = [user for user in self.generated_data["users"] 
                              if user.get("metadata", {}).get("department") == team_config["department"]]
                
                if not team_members:
                    logger.info(f"   No members found for {team_config['name']}, skipping")
                    continue
                
                # Find team lead
                team_lead = next((member for member in team_members if member["role"] in ["team_lead", "manager"]), None)
                
                # Create team member objects with proper structure
                members_list = []
                for member in team_members:
                    member_role = "lead" if member["role"] in ["team_lead", "manager"] else "regular"
                    if member["role"] == "member" and random.random() < 0.3:  # 30% chance to be senior
                        member_role = "senior"
                    
                    member_data = {
                        "user_id": member["id"],
                        "role": member_role,
                        "joined_at": datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                        "responsibilities": self._generate_responsibilities(team_config["type"], member_role),
                        "skills": member.get("metadata", {}).get("skills", [])[:5]  # Limit to 5 skills
                    }
                    members_list.append(member_data)
                
                team_id = str(uuid.uuid4())
                team_data = {
                    "id": team_id,
                    "name": team_config["name"],
                    "description": team_config["description"],
                    "type": team_config["type"],
                    "organization_id": self.org_id,
                    "lead_id": team_lead["id"] if team_lead else team_members[0]["id"],
                    "members": members_list,
                    "settings": {
                        "default_project_role": "member",
                        "auto_assign_tasks": random.choice([True, False]),
                        "require_approval": random.choice([True, False]),
                        "notification_settings": {
                            "email_notifications": True,
                            "slack_notifications": False,
                            "task_updates": True
                        }
                    },
                    "tags": team_config["skills_focus"][:3],  # Use first 3 skills as tags
                    "is_active": True,
                    "member_count": len(members_list),
                    "active_project_count": 0,  # Will be updated when projects are created
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 200)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.teams.insert_one(team_data)
                self.generated_data["teams"].append(team_data)
                
            logger.info(f"✅ Created {len(self.generated_data['teams'])} teams")
            return True
            
        except Exception as e:
            logger.error(f"❌ Team creation failed: {e}")
            return False

    def _generate_responsibilities(self, team_type: str, role: str) -> List[str]:
        """Generate realistic responsibilities based on team type and role"""
        responsibilities_map = {
            "development": {
                "lead": ["Code reviews", "Architecture decisions", "Team mentoring", "Sprint planning"],
                "senior": ["Feature development", "Code reviews", "Junior mentoring", "Technical documentation"],
                "regular": ["Feature implementation", "Bug fixes", "Unit testing", "Code documentation"]
            },
            "design": {
                "lead": ["Design system oversight", "Design reviews", "Stakeholder meetings", "Team coordination"],
                "senior": ["UI/UX design", "User research", "Prototyping", "Design reviews"],
                "regular": ["Visual design", "Asset creation", "Design implementation", "User testing"]
            },
            "marketing": {
                "lead": ["Campaign strategy", "Team management", "Performance analysis", "Stakeholder reporting"],
                "senior": ["Campaign execution", "Content strategy", "SEO optimization", "Analytics"],
                "regular": ["Content creation", "Social media", "Campaign support", "Market research"]
            },
            "sales": {
                "lead": ["Sales strategy", "Team coaching", "Pipeline management", "Client relationships"],
                "senior": ["Account management", "Lead qualification", "Deal closing", "Team mentoring"],
                "regular": ["Lead generation", "Client calls", "CRM management", "Sales support"]
            },
            "operations": {
                "lead": ["Process optimization", "Team coordination", "Strategic planning", "Performance monitoring"],
                "senior": ["Project management", "Process improvement", "Quality assurance", "Team support"],
                "regular": ["Task coordination", "Documentation", "Quality checks", "Administrative support"]
            }
        }
        
        return responsibilities_map.get(team_type, {}).get(role, ["General responsibilities", "Team collaboration"])

    async def create_projects(self):
        """Create demo projects"""
        logger.info("📁 Creating demo projects...")
        
        try:
            if not self.generated_data["users"] or not self.generated_data["teams"]:
                logger.error("   No users or teams available for project assignment")
                return False
                
            for i, template in enumerate(self.project_templates):
                project_id = f"proj-{uuid.uuid4().hex[:12]}"
                
                # Assign project manager (team lead or manager)
                managers = [u for u in self.generated_data["users"] if u["role"] in ["admin", "manager", "team_lead"]]
                project_manager = random.choice(managers) if managers else self.generated_data["users"][0]
                
                # Assign team members based on required skills
                suitable_members = []
                for user in self.generated_data["users"]:
                    user_skills = user.get("metadata", {}).get("skills", [])
                    if any(skill in user_skills for skill in template["required_skills"]):
                        suitable_members.append(user["id"])
                
                # Ensure we have team members
                if not suitable_members:
                    suitable_members = [user["id"] for user in self.generated_data["users"][:5]]
                else:
                    suitable_members = suitable_members[:random.randint(3, min(8, len(suitable_members)))]
                
                # Generate realistic project dates and progress
                created_date = datetime.utcnow() - timedelta(days=random.randint(30, 180))
                
                if template["status"] == "completed":
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    end_date = start_date + timedelta(weeks=template["duration_weeks"])
                    due_date = end_date
                    progress = 100
                elif template["status"] == "active":
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(20, 80)
                elif template["status"] == "planning":
                    start_date = datetime.utcnow() + timedelta(weeks=random.randint(1, 4))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(0, 15)
                else:  # on_hold
                    start_date = created_date + timedelta(days=random.randint(5, 15))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(10, 40)
                
                # Generate milestones
                milestones = self._generate_project_milestones(template, start_date, due_date, progress)
                
                # Calculate budget information
                spent_percentage = progress / 100 * random.uniform(0.8, 1.2)
                budget_spent = template["budget"] * spent_percentage
                
                project_data = {
                    "id": project_id,
                    "name": template["name"],
                    "description": template["description"],
                    "status": template["status"],
                    "priority": template["priority"],
                    "visibility": "team",
                    "start_date": start_date if start_date else None,  # Keep as datetime
                    "due_date": due_date if due_date else None,  # Keep as datetime
                    "organization_id": self.org_id,
                    "owner_id": project_manager["id"],
                    "team_members": suitable_members,
                    "budget": {
                        "total_budget": template["budget"],
                        "spent_amount": budget_spent,
                        "currency": "USD"
                    },
                    "milestones": milestones,
                    "settings": {
                        "auto_assign_tasks": random.choice([True, False]),
                        "require_time_tracking": True,
                        "allow_guest_access": False,
                        "notification_settings": {
                            "milestone_completion": True,
                            "task_updates": True,
                            "deadline_reminders": True
                        }
                    },
                    "tags": template["tags"],
                    "category": template["category"],
                    "progress_percentage": progress,
                    "task_count": 0,  # Will be updated when tasks are created
                    "completed_task_count": 0,
                    "created_at": created_date,
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.projects.insert_one(project_data)
                self.generated_data["projects"].append(project_data)
                
            logger.info(f"✅ Created {len(self.generated_data['projects'])} projects")
            return True
            
        except Exception as e:
            logger.error(f"❌ Project creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _generate_project_milestones(self, template, start_date, due_date, progress):
        """Generate realistic project milestones"""
        milestone_templates = {
            "software_development": [
                "Requirements Analysis & Planning",
                "System Design & Architecture",
                "Core Development Phase",
                "Testing & Quality Assurance",
                "Deployment & Launch"
            ],
            "mobile_development": [
                "App Design & Wireframing",
                "Core Feature Development",
                "Platform Integration",
                "Testing & Optimization",
                "App Store Deployment"
            ],
            "analytics": [
                "Data Source Integration",
                "Dashboard Framework",
                "Visualization Components",
                "User Testing & Feedback",
                "Production Deployment"
            ],
            "marketing": [
                "Campaign Strategy Development",
                "Content Creation & Assets",
                "Campaign Launch",
                "Performance Monitoring",
                "Results Analysis & Reporting"
            ],
            "infrastructure": [
                "Current State Assessment",
                "Migration Strategy Planning",
                "Infrastructure Setup",
                "Migration Execution",
                "Monitoring & Optimization"
            ]
        }
        
        milestone_names = milestone_templates.get(template["type"], [
            "Project Initiation",
            "Design & Planning",
            "Implementation",
            "Testing & Review",
            "Completion & Delivery"
        ])
        
        milestones = []
        if start_date and due_date:
            total_duration = (due_date.date() - start_date.date()).days
            milestone_duration = total_duration // len(milestone_names)
            
            for i, name in enumerate(milestone_names):
                milestone_due = start_date + timedelta(days=(i + 1) * milestone_duration)
                completed = (i + 1) * 20 <= progress  # Each milestone is 20% of progress
                
                milestone = {
                    "id": f"milestone-{uuid.uuid4().hex[:8]}",
                    "title": name,
                    "description": f"Complete {name.lower()} for {template['name']}",
                    "due_date": milestone_due.date(),
                    "completed": completed,
                    "completed_at": milestone_due if completed else None
                }
                milestones.append(milestone)
        
        return milestones

    async def create_tasks(self):
        """Create demo tasks for projects"""
        logger.info("✅ Creating demo tasks...")
        
        try:
            if not self.generated_data["projects"] or not self.generated_data["users"]:
                logger.error("   No projects or users available for task creation")
                return False
                
            task_templates_by_type = {
                "software_development": [
                    "Set up development environment",
                    "Design database schema",
                    "Implement user authentication",
                    "Create API endpoints",
                    "Develop frontend components",
                    "Write unit tests",
                    "Integrate payment system",
                    "Optimize performance",
                    "Code review and refactoring",
                    "Deploy to staging environment"
                ],
                "mobile_development": [
                    "Design app wireframes",
                    "Set up React Native project",
                    "Implement navigation",
                    "Create user interface screens",
                    "Integrate API calls",
                    "Add offline functionality",
                    "Implement push notifications",
                    "Test on multiple devices",
                    "Optimize app performance",
                    "Submit to app stores"
                ],
                "analytics": [
                    "Define KPIs and metrics",
                    "Set up data pipeline",
                    "Create dashboard layout",
                    "Implement data visualization",
                    "Add filtering capabilities",
                    "Create automated reports",
                    "Implement user access controls",
                    "Performance optimization",
                    "User training materials",
                    "Production deployment"
                ]
            }
            
            default_tasks = [
                "Project planning and scoping",
                "Requirements gathering",
                "Technical specification",
                "Design and mockups",
                "Development implementation",
                "Testing and quality assurance",
                "Documentation creation",
                "Stakeholder review",
                "Bug fixes and improvements",
                "Final deployment"
            ]
            
            task_counter = 1
            
            for project in self.generated_data["projects"]:
                # Get appropriate task templates
                project_type = next((t["type"] for t in self.project_templates if t["name"] == project["name"]), "default")
                task_templates = task_templates_by_type.get(project_type, default_tasks)
                
                num_tasks = random.randint(8, 15)
                selected_tasks = random.sample(task_templates, min(num_tasks, len(task_templates)))
                
                # Add some additional tasks if needed
                while len(selected_tasks) < num_tasks:
                    selected_tasks.append(f"Additional task {len(selected_tasks) + 1} for {project['name']}")
                
                project_tasks = []
                completed_count = 0
                
                for i, task_title in enumerate(selected_tasks):
                    task_id = str(uuid.uuid4())
                    
                    # Determine task status based on project progress
                    task_progress_threshold = (i + 1) / len(selected_tasks) * 100
                    
                    if project["status"] == "completed":
                        status = random.choices(
                            ["completed", "cancelled"], 
                            weights=[0.95, 0.05]
                        )[0]
                    elif project["progress_percentage"] >= task_progress_threshold:
                        status = random.choices(
                            ["completed", "in_review"], 
                            weights=[0.8, 0.2]
                        )[0]
                    elif project["progress_percentage"] >= task_progress_threshold - 20:
                        status = random.choices(
                            ["in_progress", "in_review", "blocked"], 
                            weights=[0.6, 0.3, 0.1]
                        )[0]
                    else:
                        status = "todo"
                    
                    if status == "completed":
                        completed_count += 1
                    
                    # Assign task to project team member
                    assignee_id = random.choice(project["team_members"]) if project["team_members"] else None
                    
                    # Task dates
                    task_start = project["start_date"] + timedelta(days=random.randint(0, 30)) if project.get("start_date") else datetime.now().date()
                    task_due = task_start + timedelta(days=random.randint(3, 21))
                    
                    # Time tracking
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
                        "title": task_title,
                        "description": f"Complete {task_title.lower()} for the {project['name']} project. This task is part of the overall project deliverables and requires attention to detail and quality standards.",
                        "status": status,
                        "priority": random.choice(["low", "medium", "high", "critical"]),
                        "type": random.choice(["task", "feature", "bug", "improvement"]),
                        "project_id": project["id"],
                        "assignee_id": assignee_id,
                        "reporter_id": project["owner_id"],
                        "parent_task_id": None,
                        "due_date": datetime.combine(task_due, datetime.min.time()) if task_due else None,
                        "start_date": datetime.combine(task_start, datetime.min.time()) if task_start else None,
                        "completed_at": datetime.combine(task_due, datetime.min.time()) if status == "completed" else None,
                        "time_tracking": {
                            "estimated_hours": estimated_hours,
                            "actual_hours": actual_hours,
                            "logged_time": []
                        },
                        "dependencies": [],
                        "subtasks": [],
                        "tags": random.sample(project["tags"], min(2, len(project["tags"]))),
                        "labels": [project["category"]],
                        "custom_fields": {},
                        "progress_percentage": 100 if status == "completed" else (80 if status == "in_review" else (random.randint(20, 70) if status == "in_progress" else 0)),
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.tasks.insert_one(task_data)
                    project_tasks.append(task_data)
                    task_counter += 1
                
                # Update project with task counts
                await self.db.projects.update_one(
                    {"id": project["id"]},
                    {
                        "$set": {
                            "task_count": len(project_tasks),
                            "completed_task_count": completed_count,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                self.generated_data["tasks"].extend(project_tasks)
                
            # Update organization project count
            await self.db.organizations.update_one(
                {"id": self.org_id},
                {
                    "$set": {
                        "project_count": len(self.generated_data["projects"]),
                        "member_count": len(self.generated_data["users"]) + 1,  # +1 for demo user
                        "updated_at": datetime.utcnow()
                    }
                }
            )
                
            logger.info(f"✅ Created {len(self.generated_data['tasks'])} tasks")
            return True
            
        except Exception as e:
            logger.error(f"❌ Task creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def create_comments_and_files(self):
        """Create sample comments and files"""
        logger.info("💬 Creating comments and files...")
        
        try:
            comment_templates = [
                "Made good progress on this today. Should be ready for review soon.",
                "Encountered some technical challenges with the API integration. Working on alternative approach.",
                "Please review the latest changes when you have a chance. Added comprehensive error handling.",
                "Blocking issue resolved. Moving forward with the implementation as planned.",
                "Updated the requirements based on stakeholder feedback from yesterday's meeting.",
                "Code review completed. Made all the suggested improvements and optimizations.",
                "Testing phase complete. All unit tests passing and performance looks good.",
                "Documentation updated to reflect the latest changes and architectural decisions.",
                "Working on the final touches. Should be ready for production deployment.",
                "Great work on this feature! The implementation looks solid and well-tested."
            ]
            
            # Create comments on active tasks
            if self.generated_data["tasks"] and self.generated_data["users"]:
                active_tasks = [t for t in self.generated_data["tasks"] if t["status"] in ["in_progress", "in_review", "blocked"]]
                
                for i in range(min(40, len(active_tasks))):
                    task = random.choice(active_tasks)
                    commenter_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                    
                    comment_data = {
                        "id": str(uuid.uuid4()),
                        "content": random.choice(comment_templates),
                        "entity_type": "task",
                        "entity_id": task["id"],
                        "author_id": commenter_id,
                        "organization_id": self.org_id,
                        "parent_id": None,
                        "is_internal": True,
                        "reactions": {},
                        "attachments": [],
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.comments.insert_one(comment_data)
                    self.generated_data["comments"].append(comment_data)
            
            # Create files attached to projects and tasks
            file_templates = [
                {"name": "Requirements Document", "type": "document", "size": 245760, "extension": "pdf"},
                {"name": "Design Mockups", "type": "image", "size": 1048576, "extension": "png"},
                {"name": "Technical Specification", "type": "document", "size": 524288, "extension": "docx"},
                {"name": "Test Results", "type": "document", "size": 102400, "extension": "xlsx"},
                {"name": "API Documentation", "type": "document", "size": 184320, "extension": "pdf"},
                {"name": "User Interface Screenshots", "type": "image", "size": 2097152, "extension": "jpg"},
                {"name": "Database Schema", "type": "code", "size": 51200, "extension": "sql"},
                {"name": "Project Presentation", "type": "document", "size": 3145728, "extension": "pptx"}
            ]
            
            # Attach files to projects
            for project in self.generated_data["projects"][:4]:  # Only first 4 projects
                for i in range(random.randint(2, 4)):
                    file_template = random.choice(file_templates)
                    uploader_id = random.choice(project["team_members"]) if project["team_members"] else project["owner_id"]
                    
                    file_data = {
                        "id": str(uuid.uuid4()),
                        "name": f"{file_template['name']} - {project['name'][:30]}",
                        "original_name": f"{file_template['name'].lower().replace(' ', '_')}.{file_template['extension']}",
                        "file_type": file_template["type"],
                        "file_size": file_template["size"],
                        "entity_type": "project",
                        "entity_id": project["id"],
                        "uploaded_by": uploader_id,
                        "organization_id": self.org_id,
                        "file_path": f"/uploads/{self.org_id}/projects/{project['id']}/file-{i+1:03d}.{file_template['extension']}",
                        "metadata": {
                            "description": f"Project file for {project['name']}",
                            "tags": project["tags"][:2]
                        },
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.files.insert_one(file_data)
                    self.generated_data["files"].append(file_data)
            
            # Attach files to some tasks
            for task in random.sample(self.generated_data["tasks"], min(15, len(self.generated_data["tasks"]))):
                file_template = random.choice(file_templates)
                uploader_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                
                file_data = {
                    "id": str(uuid.uuid4()),
                    "name": f"{file_template['name']} - {task['title'][:30]}",
                    "original_name": f"{file_template['name'].lower().replace(' ', '_')}.{file_template['extension']}",
                    "file_type": file_template["type"],
                    "file_size": file_template["size"],
                    "entity_type": "task",
                    "entity_id": task["id"],
                    "uploaded_by": uploader_id,
                    "organization_id": self.org_id,
                    "file_path": f"/uploads/{self.org_id}/tasks/{task['id']}/attachment.{file_template['extension']}",
                    "metadata": {
                        "description": f"Task attachment for {task['title']}",
                        "tags": task["tags"]
                    },
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.files.insert_one(file_data)
                self.generated_data["files"].append(file_data)
            
            logger.info(f"✅ Created {len(self.generated_data['comments'])} comments and {len(self.generated_data['files'])} files")
            return True
            
        except Exception as e:
            logger.error(f"❌ Comments/files creation failed: {e}")
            return False

    async def create_notifications(self):
        """Create realistic notifications"""
        logger.info("🔔 Creating notifications...")
        
        try:
            notification_templates = [
                {"type": "task_assigned", "title": "New Task Assigned", "message": "You have been assigned to task: {task_title}"},
                {"type": "task_completed", "title": "Task Completed", "message": "Task '{task_title}' has been marked as completed"},
                {"type": "project_update", "title": "Project Update", "message": "Project '{project_name}' has been updated"},
                {"type": "deadline_reminder", "title": "Deadline Reminder", "message": "Task '{task_title}' is due tomorrow"},
                {"type": "comment_added", "title": "New Comment", "message": "New comment added to task: {task_title}"},
                {"type": "milestone_completed", "title": "Milestone Completed", "message": "Milestone '{milestone_title}' has been completed"},
                {"type": "team_update", "title": "Team Update", "message": "You have been added to team: {team_name}"},
                {"type": "file_uploaded", "title": "File Uploaded", "message": "New file uploaded to project: {project_name}"}
            ]
            
            # Create notifications for users
            for user in self.generated_data["users"]:
                num_notifications = random.randint(5, 15)
                
                for _ in range(num_notifications):
                    template = random.choice(notification_templates)
                    
                    # Generate context-specific message
                    if template["type"] in ["task_assigned", "task_completed", "deadline_reminder", "comment_added"]:
                        context_task = random.choice(self.generated_data["tasks"]) if self.generated_data["tasks"] else None
                        message = template["message"].format(task_title=context_task["title"] if context_task else "Sample Task")
                    elif template["type"] in ["project_update", "file_uploaded"]:
                        context_project = random.choice(self.generated_data["projects"]) if self.generated_data["projects"] else None
                        message = template["message"].format(project_name=context_project["name"] if context_project else "Sample Project")
                    elif template["type"] == "milestone_completed":
                        message = template["message"].format(milestone_title="Project Planning")
                    elif template["type"] == "team_update":
                        context_team = random.choice(self.generated_data["teams"]) if self.generated_data["teams"] else None
                        message = template["message"].format(team_name=context_team["name"] if context_team else "Sample Team")
                    else:
                        message = template["message"]
                    
                    notification_data = {
                        "id": str(uuid.uuid4()),
                        "title": template["title"],
                        "message": message,
                        "user_id": user["id"],
                        "organization_id": self.org_id,
                        "notification_type": template["type"],
                        "priority": random.choice(["low", "medium", "high"]),
                        "is_read": random.choice([True, False]),
                        "read_at": datetime.utcnow() - timedelta(days=random.randint(1, 7)) if random.choice([True, False]) else None,
                        "channels": ["in_app"],
                        "metadata": {
                            "source": "system",
                            "category": template["type"].split("_")[0]
                        },
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.notifications.insert_one(notification_data)
                    self.generated_data["notifications"].append(notification_data)
            
            logger.info(f"✅ Created {len(self.generated_data['notifications'])} notifications")
            return True
            
        except Exception as e:
            logger.error(f"❌ Notification creation failed: {e}")
            return False

    async def update_team_project_counts(self):
        """Update team active project counts"""
        logger.info("🔄 Updating team project counts...")
        
        try:
            for team in self.generated_data["teams"]:
                # Count active projects where team members are involved
                team_member_ids = [member["user_id"] for member in team["members"]]
                active_project_count = 0
                
                for project in self.generated_data["projects"]:
                    if project["status"] == "active":
                        # Check if any team member is involved in the project
                        if any(member_id in project["team_members"] for member_id in team_member_ids):
                            active_project_count += 1
                
                # Update team document
                await self.db.teams.update_one(
                    {"id": team["id"]},
                    {"$set": {"active_project_count": active_project_count, "updated_at": datetime.utcnow()}}
                )
            
            logger.info("✅ Team project counts updated")
            return True
            
        except Exception as e:
            logger.error(f"❌ Team project count update failed: {e}")
            return False

    async def generate_report(self):
        """Generate comprehensive report"""
        logger.info("📋 Generating completion report...")
        
        try:
            # Calculate statistics
            active_projects = len([p for p in self.generated_data["projects"] if p["status"] == "active"])
            completed_projects = len([p for p in self.generated_data["projects"] if p["status"] == "completed"])
            active_tasks = len([t for t in self.generated_data["tasks"] if t["status"] in ["todo", "in_progress"]])
            completed_tasks = len([t for t in self.generated_data["tasks"] if t["status"] == "completed"])
            
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
                    "notifications_created": len(self.generated_data["notifications"]),
                    "total_data_points": sum(len(data) for data in self.generated_data.values())
                },
                "statistics": {
                    "active_projects": active_projects,
                    "completed_projects": completed_projects,
                    "active_tasks": active_tasks,
                    "completed_tasks": completed_tasks,
                    "team_members_total": len(self.generated_data["users"]) + 1  # +1 for demo user
                },
                "access_information": {
                    "demo_login": "demo@company.com / demo123456",
                    "frontend_url": "http://localhost:3000",
                    "backend_api": "http://localhost:8001",
                    "api_docs": "http://localhost:8001/docs"
                }
            }
            
            # Save report
            report_file = f"/app/comprehensive_demo_data_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            print("=" * 80)
            print("🎉 COMPREHENSIVE DEMO DATA GENERATION COMPLETED SUCCESSFULLY!")
            print("=" * 80)
            print(f"📊 Summary:")
            print(f"   👥 Users: {report['summary']['users_created']} + 1 (demo user)")
            print(f"   👨‍👩‍👧‍👦 Teams: {report['summary']['teams_created']}")
            print(f"   📁 Projects: {report['summary']['projects_created']} ({active_projects} active, {completed_projects} completed)")
            print(f"   ✅ Tasks: {report['summary']['tasks_created']} ({active_tasks} active, {completed_tasks} completed)")
            print(f"   💬 Comments: {report['summary']['comments_created']}")
            print(f"   📎 Files: {report['summary']['files_created']}")
            print(f"   🔔 Notifications: {report['summary']['notifications_created']}")
            print(f"   📋 Total Data Points: {report['summary']['total_data_points']}")
            print(f"\n🔑 Access Information:")
            print(f"   Demo Login: {report['access_information']['demo_login']}")
            print(f"   Frontend: {report['access_information']['frontend_url']}")
            print(f"   Backend API: {report['access_information']['backend_api']}")
            print(f"\n💾 Report saved to: {report_file}")
            print("=" * 80)
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            return None

    async def run_complete_generation(self):
        """Run the complete demo data generation process"""
        logger.info("🚀 Starting Comprehensive Demo Data Generation...")
        print("=" * 80)
        
        start_time = datetime.utcnow()
        
        try:
            # Connect to database
            await self.connect_database()
            
            # Run generation steps
            steps = [
                ("Cleanup existing demo data", self.cleanup_existing_data),
                ("Create demo users", self.create_users),
                ("Create teams", self.create_teams),
                ("Create projects", self.create_projects),
                ("Create tasks", self.create_tasks),
                ("Create comments and files", self.create_comments_and_files),
                ("Create notifications", self.create_notifications),
                ("Update team project counts", self.update_team_project_counts)
            ]
            
            success_count = 0
            for step_name, step_function in steps:
                print(f"\n🔄 {step_name}...")
                if await step_function():
                    success_count += 1
                    print(f"✅ {step_name} completed successfully")
                else:
                    print(f"❌ {step_name} failed")
            
            # Generate report
            report = await self.generate_report()
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            print(f"\n⏱️ Generation completed in {duration:.2f} seconds")
            print(f"📈 Success rate: {success_count}/{len(steps)} steps completed")
            
            return report is not None
            
        except Exception as e:
            logger.error(f"❌ Demo data generation failed: {e}")
            return False

if __name__ == "__main__":
    generator = ComprehensiveDemoDataGenerator()
    success = asyncio.run(generator.run_complete_generation())
    sys.exit(0 if success else 1)