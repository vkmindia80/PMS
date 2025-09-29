#!/usr/bin/env python3
"""
Enhanced Demo Data Creation Script for Enterprise Portfolio Management
Creates comprehensive, realistic demo data to showcase advanced resource management features
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone
import random
import uuid
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from auth.utils import hash_password

class EnhancedDemoDataCreator:
    def __init__(self):
        self.db = None
        self.org_id = "demo-org-001"
        self.users = []
        self.teams = []
        self.projects = []
        self.tasks = []
        
        # Skill categories and skills
        self.skill_categories = {
            "Frontend Development": ["React", "Vue.js", "Angular", "TypeScript", "JavaScript", "HTML/CSS", "Tailwind CSS", "Next.js"],
            "Backend Development": ["Python", "Node.js", "Java", "C#", "Go", "Rust", "FastAPI", "Django", "Express"],
            "Mobile Development": ["React Native", "Flutter", "iOS Development", "Android Development", "Xamarin"],
            "DevOps": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "Jenkins", "GitHub Actions", "Terraform"],
            "Database": ["PostgreSQL", "MongoDB", "MySQL", "Redis", "Elasticsearch", "SQLite"],
            "Design": ["UI/UX Design", "Figma", "Adobe Creative Suite", "Sketch", "Prototyping", "User Research"],
            "Data Science": ["Python", "R", "Machine Learning", "Data Analysis", "Pandas", "NumPy", "TensorFlow"],
            "Project Management": ["Agile/Scrum", "Kanban", "Risk Management", "Strategic Planning", "Team Leadership"],
            "Marketing": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Social Media", "Analytics", "Brand Management"],
            "Sales": ["B2B Sales", "CRM", "Lead Generation", "Customer Success", "Negotiation", "Account Management"]
        }
        
        # Project templates with realistic characteristics
        self.project_templates = [
            {
                "name": "E-commerce Platform Redesign",
                "description": "Complete overhaul of the company's e-commerce platform with modern UI/UX and enhanced performance",
                "type": "software_development",
                "priority": "high",
                "estimated_hours": 2400,
                "duration_weeks": 16,
                "required_skills": ["React", "Node.js", "PostgreSQL", "UI/UX Design", "DevOps"],
                "team_size": 8
            },
            {
                "name": "Mobile App Development",
                "description": "Native mobile application for iOS and Android platforms with offline capabilities",
                "type": "mobile_development", 
                "priority": "high",
                "estimated_hours": 1800,
                "duration_weeks": 12,
                "required_skills": ["React Native", "Mobile Development", "API Integration", "UI/UX Design"],
                "team_size": 6
            },
            {
                "name": "Data Analytics Dashboard",
                "description": "Business intelligence dashboard for real-time analytics and reporting",
                "type": "analytics",
                "priority": "medium",
                "estimated_hours": 1200,
                "duration_weeks": 10,
                "required_skills": ["Python", "Data Science", "React", "PostgreSQL", "Data Visualization"],
                "team_size": 5
            },
            {
                "name": "Customer Support Portal", 
                "description": "Self-service customer support portal with AI-powered chatbot integration",
                "type": "customer_service",
                "priority": "medium", 
                "estimated_hours": 1600,
                "duration_weeks": 14,
                "required_skills": ["Vue.js", "Python", "AI/ML", "UI/UX Design", "Customer Success"],
                "team_size": 7
            },
            {
                "name": "Marketing Automation System",
                "description": "Comprehensive marketing automation platform with email campaigns and lead scoring",
                "type": "marketing",
                "priority": "medium",
                "estimated_hours": 2000,
                "duration_weeks": 15,
                "required_skills": ["JavaScript", "Python", "Marketing", "Database", "API Integration"],
                "team_size": 6
            },
            {
                "name": "Infrastructure Modernization",
                "description": "Migration to cloud-native architecture with microservices and containerization",
                "type": "infrastructure",
                "priority": "high",
                "estimated_hours": 2800,
                "duration_weeks": 20,
                "required_skills": ["DevOps", "Docker", "Kubernetes", "AWS", "Python", "Monitoring"],
                "team_size": 5
            },
            {
                "name": "API Gateway Implementation",
                "description": "Centralized API gateway with authentication, rate limiting, and monitoring",
                "type": "backend_infrastructure",
                "priority": "high",
                "estimated_hours": 1400,
                "duration_weeks": 12,
                "required_skills": ["Node.js", "DevOps", "API Design", "Security", "Monitoring"],
                "team_size": 4
            },
            {
                "name": "Content Management System",
                "description": "Custom CMS for managing website content with workflow approval system",
                "type": "cms",
                "priority": "low",
                "estimated_hours": 1000,
                "duration_weeks": 8,
                "required_skills": ["React", "Node.js", "MongoDB", "UI/UX Design"],
                "team_size": 4
            }
        ]

    async def connect_database(self):
        """Connect to the database"""
        await connect_to_mongo()
        self.db = await get_database()
        print("✅ Connected to database")

    async def create_enhanced_users(self):
        """Create diverse users with realistic skills and roles"""
        user_profiles = [
            # Development Team
            {
                "id": "user-dev-lead-001",
                "email": "sarah.johnson@company.com",
                "username": "sarah_johnson",
                "first_name": "Sarah",
                "last_name": "Johnson",
                "role": "team_lead",
                "department": "Engineering",
                "phone": "+1-555-0201",
                "bio": "Senior Full-Stack Developer with 8 years of experience leading development teams",
                "skills": [
                    {"name": "React", "level": 9, "years_experience": 5},
                    {"name": "Node.js", "level": 9, "years_experience": 6},
                    {"name": "TypeScript", "level": 8, "years_experience": 4},
                    {"name": "Python", "level": 7, "years_experience": 3},
                    {"name": "Team Leadership", "level": 8, "years_experience": 4},
                    {"name": "PostgreSQL", "level": 7, "years_experience": 5}
                ],
                "hourly_rate": 85,
                "availability": "full_time"
            },
            {
                "id": "user-dev-senior-001",
                "email": "marcus.chen@company.com", 
                "username": "marcus_chen",
                "first_name": "Marcus",
                "last_name": "Chen",
                "role": "member",
                "department": "Engineering",
                "phone": "+1-555-0202",
                "bio": "Backend specialist with expertise in scalable architectures and cloud technologies",
                "skills": [
                    {"name": "Python", "level": 9, "years_experience": 7},
                    {"name": "FastAPI", "level": 8, "years_experience": 3},
                    {"name": "PostgreSQL", "level": 8, "years_experience": 6},
                    {"name": "Docker", "level": 8, "years_experience": 4},
                    {"name": "AWS", "level": 7, "years_experience": 3},
                    {"name": "MongoDB", "level": 6, "years_experience": 2}
                ],
                "hourly_rate": 75,
                "availability": "full_time"
            },
            {
                "id": "user-dev-frontend-001",
                "email": "emily.rodriguez@company.com",
                "username": "emily_rodriguez", 
                "first_name": "Emily",
                "last_name": "Rodriguez",
                "role": "member",
                "department": "Engineering",
                "phone": "+1-555-0203",
                "bio": "Frontend developer passionate about user experience and modern web technologies",
                "skills": [
                    {"name": "React", "level": 8, "years_experience": 4},
                    {"name": "TypeScript", "level": 8, "years_experience": 3},
                    {"name": "Tailwind CSS", "level": 9, "years_experience": 3},
                    {"name": "Next.js", "level": 7, "years_experience": 2},
                    {"name": "JavaScript", "level": 8, "years_experience": 5},
                    {"name": "UI/UX Design", "level": 6, "years_experience": 2}
                ],
                "hourly_rate": 70,
                "availability": "full_time"
            },
            {
                "id": "user-dev-mobile-001",
                "email": "james.wilson@company.com",
                "username": "james_wilson",
                "first_name": "James", 
                "last_name": "Wilson",
                "role": "member",
                "department": "Engineering",
                "phone": "+1-555-0204",
                "bio": "Mobile development expert with experience in cross-platform solutions",
                "skills": [
                    {"name": "React Native", "level": 9, "years_experience": 5},
                    {"name": "iOS Development", "level": 8, "years_experience": 4},
                    {"name": "Android Development", "level": 8, "years_experience": 4},
                    {"name": "Flutter", "level": 7, "years_experience": 2},
                    {"name": "JavaScript", "level": 8, "years_experience": 6},
                    {"name": "API Integration", "level": 8, "years_experience": 5}
                ],
                "hourly_rate": 80,
                "availability": "full_time"
            },
            {
                "id": "user-dev-devops-001", 
                "email": "alex.kumar@company.com",
                "username": "alex_kumar",
                "first_name": "Alex",
                "last_name": "Kumar",
                "role": "member",
                "department": "Engineering",
                "phone": "+1-555-0205",
                "bio": "DevOps engineer focused on automation, monitoring, and cloud infrastructure",
                "skills": [
                    {"name": "Docker", "level": 9, "years_experience": 5},
                    {"name": "Kubernetes", "level": 8, "years_experience": 3},
                    {"name": "AWS", "level": 9, "years_experience": 6},
                    {"name": "Terraform", "level": 8, "years_experience": 3},
                    {"name": "Jenkins", "level": 7, "years_experience": 4},
                    {"name": "Python", "level": 7, "years_experience": 4}
                ],
                "hourly_rate": 85,
                "availability": "full_time"
            },
            
            # Design Team
            {
                "id": "user-design-lead-001",
                "email": "maria.gonzalez@company.com",
                "username": "maria_gonzalez",
                "first_name": "Maria",
                "last_name": "Gonzalez", 
                "role": "team_lead",
                "department": "Design",
                "phone": "+1-555-0301",
                "bio": "Creative Director with expertise in user-centered design and design systems",
                "skills": [
                    {"name": "UI/UX Design", "level": 9, "years_experience": 8},
                    {"name": "Figma", "level": 9, "years_experience": 5},
                    {"name": "Adobe Creative Suite", "level": 8, "years_experience": 10},
                    {"name": "User Research", "level": 8, "years_experience": 6},
                    {"name": "Prototyping", "level": 9, "years_experience": 7},
                    {"name": "Team Leadership", "level": 7, "years_experience": 3}
                ],
                "hourly_rate": 80,
                "availability": "full_time"
            },
            {
                "id": "user-design-senior-001",
                "email": "david.thompson@company.com",
                "username": "david_thompson",
                "first_name": "David",
                "last_name": "Thompson",
                "role": "member",
                "department": "Design",
                "phone": "+1-555-0302",
                "bio": "Product designer specializing in mobile and web applications",
                "skills": [
                    {"name": "UI/UX Design", "level": 8, "years_experience": 5},
                    {"name": "Figma", "level": 8, "years_experience": 4},
                    {"name": "Sketch", "level": 7, "years_experience": 3},
                    {"name": "Prototyping", "level": 8, "years_experience": 5},
                    {"name": "User Research", "level": 6, "years_experience": 2},
                    {"name": "HTML/CSS", "level": 6, "years_experience": 3}
                ],
                "hourly_rate": 65,
                "availability": "full_time"
            },
            
            # Data Science Team
            {
                "id": "user-data-lead-001",
                "email": "lisa.park@company.com",
                "username": "lisa_park",
                "first_name": "Lisa",
                "last_name": "Park",
                "role": "team_lead",
                "department": "Data Science",
                "phone": "+1-555-0401",
                "bio": "Data Science Manager with expertise in machine learning and business analytics",
                "skills": [
                    {"name": "Python", "level": 9, "years_experience": 7},
                    {"name": "Machine Learning", "level": 9, "years_experience": 6},
                    {"name": "Data Analysis", "level": 9, "years_experience": 8},
                    {"name": "Pandas", "level": 9, "years_experience": 6},
                    {"name": "TensorFlow", "level": 8, "years_experience": 4},
                    {"name": "PostgreSQL", "level": 7, "years_experience": 5},
                    {"name": "Team Leadership", "level": 7, "years_experience": 3}
                ],
                "hourly_rate": 90,
                "availability": "full_time"
            },
            {
                "id": "user-data-analyst-001",
                "email": "michael.chang@company.com",
                "username": "michael_chang",
                "first_name": "Michael",
                "last_name": "Chang",
                "role": "member",
                "department": "Data Science",
                "phone": "+1-555-0402",
                "bio": "Business Intelligence analyst with strong SQL and visualization skills",
                "skills": [
                    {"name": "Python", "level": 7, "years_experience": 3},
                    {"name": "Data Analysis", "level": 8, "years_experience": 4},
                    {"name": "PostgreSQL", "level": 8, "years_experience": 5},
                    {"name": "R", "level": 6, "years_experience": 2},
                    {"name": "Data Visualization", "level": 8, "years_experience": 4},
                    {"name": "Excel", "level": 9, "years_experience": 6}
                ],
                "hourly_rate": 65,
                "availability": "full_time"
            },
            
            # Marketing Team
            {
                "id": "user-marketing-lead-001",
                "email": "jennifer.davis@company.com",
                "username": "jennifer_davis",
                "first_name": "Jennifer",
                "last_name": "Davis",
                "role": "manager", 
                "department": "Marketing",
                "phone": "+1-555-0501",
                "bio": "Marketing Director with expertise in digital marketing and growth strategies",
                "skills": [
                    {"name": "Digital Marketing", "level": 9, "years_experience": 8},
                    {"name": "Content Strategy", "level": 8, "years_experience": 6},
                    {"name": "SEO/SEM", "level": 8, "years_experience": 7},
                    {"name": "Social Media", "level": 8, "years_experience": 8},
                    {"name": "Analytics", "level": 7, "years_experience": 5},
                    {"name": "Team Leadership", "level": 8, "years_experience": 5}
                ],
                "hourly_rate": 75,
                "availability": "full_time"
            },
            {
                "id": "user-marketing-specialist-001",
                "email": "robert.taylor@company.com",
                "username": "robert_taylor",
                "first_name": "Robert",
                "last_name": "Taylor",
                "role": "member",
                "department": "Marketing",
                "phone": "+1-555-0502",
                "bio": "Digital marketing specialist focusing on content creation and social media",
                "skills": [
                    {"name": "Content Strategy", "level": 8, "years_experience": 4},
                    {"name": "Social Media", "level": 9, "years_experience": 5},
                    {"name": "SEO/SEM", "level": 7, "years_experience": 3},
                    {"name": "Analytics", "level": 7, "years_experience": 4},
                    {"name": "Brand Management", "level": 6, "years_experience": 3},
                    {"name": "Copywriting", "level": 8, "years_experience": 5}
                ],
                "hourly_rate": 55,
                "availability": "full_time"
            },
            
            # Sales Team
            {
                "id": "user-sales-lead-001",
                "email": "patricia.brown@company.com",
                "username": "patricia_brown",
                "first_name": "Patricia",
                "last_name": "Brown",
                "role": "manager",
                "department": "Sales", 
                "phone": "+1-555-0601",
                "bio": "Sales Director with proven track record in B2B sales and team management",
                "skills": [
                    {"name": "B2B Sales", "level": 9, "years_experience": 10},
                    {"name": "CRM", "level": 8, "years_experience": 8},
                    {"name": "Lead Generation", "level": 8, "years_experience": 9},
                    {"name": "Customer Success", "level": 8, "years_experience": 7},
                    {"name": "Negotiation", "level": 9, "years_experience": 10},
                    {"name": "Team Leadership", "level": 8, "years_experience": 6}
                ],
                "hourly_rate": 70,
                "availability": "full_time"
            },
            {
                "id": "user-sales-rep-001",
                "email": "christopher.white@company.com",
                "username": "christopher_white",
                "first_name": "Christopher",
                "last_name": "White",
                "role": "member",
                "department": "Sales",
                "phone": "+1-555-0602",
                "bio": "Account Executive specializing in enterprise client relationships",
                "skills": [
                    {"name": "B2B Sales", "level": 7, "years_experience": 4},
                    {"name": "Account Management", "level": 8, "years_experience": 5},
                    {"name": "CRM", "level": 7, "years_experience": 4},
                    {"name": "Customer Success", "level": 7, "years_experience": 3},
                    {"name": "Negotiation", "level": 7, "years_experience": 4},
                    {"name": "Presentation Skills", "level": 8, "years_experience": 5}
                ],
                "hourly_rate": 60,
                "availability": "full_time"
            },
            
            # Operations Team
            {
                "id": "user-ops-lead-001",
                "email": "amanda.martinez@company.com",
                "username": "amanda_martinez",
                "first_name": "Amanda",
                "last_name": "Martinez",
                "role": "manager",
                "department": "Operations",
                "phone": "+1-555-0701",
                "bio": "Operations Manager focused on process optimization and strategic planning",
                "skills": [
                    {"name": "Strategic Planning", "level": 8, "years_experience": 6},
                    {"name": "Agile/Scrum", "level": 8, "years_experience": 5},
                    {"name": "Risk Management", "level": 7, "years_experience": 4},
                    {"name": "Team Leadership", "level": 8, "years_experience": 6},
                    {"name": "Process Optimization", "level": 9, "years_experience": 7},
                    {"name": "Data Analysis", "level": 6, "years_experience": 3}
                ],
                "hourly_rate": 75,
                "availability": "full_time"
            },
            {
                "id": "user-ops-coordinator-001",
                "email": "daniel.garcia@company.com",
                "username": "daniel_garcia",
                "first_name": "Daniel",
                "last_name": "Garcia",
                "role": "member",
                "department": "Operations",
                "phone": "+1-555-0702",
                "bio": "Project coordinator with expertise in agile methodologies and team coordination",
                "skills": [
                    {"name": "Agile/Scrum", "level": 8, "years_experience": 4},
                    {"name": "Kanban", "level": 8, "years_experience": 3},
                    {"name": "Risk Management", "level": 6, "years_experience": 2},
                    {"name": "Team Coordination", "level": 8, "years_experience": 4},
                    {"name": "Documentation", "level": 7, "years_experience": 4},
                    {"name": "Quality Assurance", "level": 6, "years_experience": 3}
                ],
                "hourly_rate": 55,
                "availability": "full_time"
            }
        ]
        
        # Create users
        for profile in user_profiles:
            user_data = {
                "id": profile["id"],
                "email": profile["email"],
                "username": profile["username"],
                "password_hash": hash_password("demo123456"),
                "first_name": profile["first_name"],
                "last_name": profile["last_name"],
                "phone": profile["phone"],
                "bio": profile["bio"],
                "avatar_url": None,
                "role": profile["role"],
                "organization_id": self.org_id,
                "department": profile["department"],
                "is_active": True,
                "status": "active",
                "email_verified": True,
                "email_verification_token": None,
                "password_reset_token": None,
                "password_reset_expires": None,
                "last_login": None,
                "login_count": 0,
                "timezone": "UTC",
                "language": "en",
                "theme": "light",
                "notifications_enabled": True,
                "profile_completed": True,
                "onboarding_completed": True,
                "skills": profile["skills"],
                "hourly_rate": profile["hourly_rate"],
                "availability": profile["availability"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.users.insert_one(user_data)
            self.users.append(user_data)
        
        print(f"✅ Created {len(user_profiles)} enhanced users")

    async def create_enhanced_teams(self):
        """Create teams with proper skill distributions"""
        team_configs = [
            {
                "id": "team-development-001",
                "name": "Development Team",
                "description": "Full-stack development team responsible for web and mobile applications",
                "type": "development",
                "department": "Engineering",
                "lead_id": "user-dev-lead-001",
                "member_ids": ["user-dev-lead-001", "user-dev-senior-001", "user-dev-frontend-001", "user-dev-mobile-001", "user-dev-devops-001"],
                "skills_focus": ["React", "Node.js", "Python", "TypeScript", "Mobile Development", "DevOps"],
                "capacity_hours_per_week": 200,
                "current_utilization": 0.75
            },
            {
                "id": "team-design-001",
                "name": "Design Team", 
                "description": "User experience and visual design team",
                "type": "design",
                "department": "Design",
                "lead_id": "user-design-lead-001",
                "member_ids": ["user-design-lead-001", "user-design-senior-001"],
                "skills_focus": ["UI/UX Design", "Figma", "Prototyping", "User Research"],
                "capacity_hours_per_week": 80,
                "current_utilization": 0.80
            },
            {
                "id": "team-data-001",
                "name": "Data Science Team",
                "description": "Data analytics and business intelligence team",
                "type": "analytics",
                "department": "Data Science", 
                "lead_id": "user-data-lead-001",
                "member_ids": ["user-data-lead-001", "user-data-analyst-001"],
                "skills_focus": ["Python", "Data Analysis", "Machine Learning", "PostgreSQL"],
                "capacity_hours_per_week": 80,
                "current_utilization": 0.70
            },
            {
                "id": "team-marketing-001",
                "name": "Marketing Team",
                "description": "Digital marketing and content strategy team",
                "type": "marketing",
                "department": "Marketing",
                "lead_id": "user-marketing-lead-001", 
                "member_ids": ["user-marketing-lead-001", "user-marketing-specialist-001"],
                "skills_focus": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Social Media"],
                "capacity_hours_per_week": 80,
                "current_utilization": 0.65
            },
            {
                "id": "team-sales-001",
                "name": "Sales Team",
                "description": "Business development and customer success team",
                "type": "sales",
                "department": "Sales",
                "lead_id": "user-sales-lead-001",
                "member_ids": ["user-sales-lead-001", "user-sales-rep-001"],
                "skills_focus": ["B2B Sales", "Account Management", "Customer Success", "CRM"],
                "capacity_hours_per_week": 80,
                "current_utilization": 0.85
            },
            {
                "id": "team-operations-001",
                "name": "Operations Team",
                "description": "Project management and operations coordination team",
                "type": "operations",
                "department": "Operations",
                "lead_id": "user-ops-lead-001",
                "member_ids": ["user-ops-lead-001", "user-ops-coordinator-001"],
                "skills_focus": ["Agile/Scrum", "Strategic Planning", "Risk Management", "Process Optimization"],
                "capacity_hours_per_week": 80,
                "current_utilization": 0.60
            }
        ]
        
        for team_config in team_configs:
            # Get team members
            team_members = []
            for member_id in team_config["member_ids"]:
                member = next((u for u in self.users if u["id"] == member_id), None)
                if member:
                    team_members.append({
                        "user_id": member["id"],
                        "name": f"{member['first_name']} {member['last_name']}",
                        "role": member["role"],
                        "skills": [skill["name"] for skill in member["skills"]],
                        "joined_date": datetime.utcnow() - timedelta(days=random.randint(30, 365))
                    })
            
            team_data = {
                "id": team_config["id"],
                "name": team_config["name"],
                "description": team_config["description"],
                "type": team_config["type"],
                "department": team_config["department"],
                "organization_id": self.org_id,
                "lead_id": team_config["lead_id"],
                "members": team_members,
                "member_count": len(team_members),
                "skills_focus": team_config["skills_focus"],
                "capacity_hours_per_week": team_config["capacity_hours_per_week"],
                "current_utilization": team_config["current_utilization"],
                "settings": {
                    "privacy": "organization",
                    "auto_assign_tasks": True,
                    "skill_matching_enabled": True,
                    "workload_balancing": True
                },
                "is_active": True,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 200)),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.teams.insert_one(team_data)
            self.teams.append(team_data)
            
            # Update users with team memberships
            for member_id in team_config["member_ids"]:
                await self.db.users.update_one(
                    {"id": member_id},
                    {"$push": {"team_memberships": team_config["id"]}}
                )
        
        print(f"✅ Created {len(team_configs)} enhanced teams")

    async def create_enhanced_projects(self):
        """Create realistic projects with proper team assignments"""
        for i, template in enumerate(self.project_templates):
            project_id = f"project-{i+1:03d}"
            
            # Determine project status and dates
            status_options = ["planning", "active", "on_hold", "completed"]
            weights = [0.2, 0.5, 0.1, 0.2]  # More active projects
            status = random.choices(status_options, weights=weights)[0]
            
            # Set dates based on status
            if status == "completed":
                start_date = datetime.utcnow() - timedelta(weeks=template["duration_weeks"] + random.randint(2, 8))
                end_date = start_date + timedelta(weeks=template["duration_weeks"])
                due_date = end_date
                progress = 100
            elif status == "active":
                start_date = datetime.utcnow() - timedelta(weeks=random.randint(1, template["duration_weeks"]//2))
                due_date = start_date + timedelta(weeks=template["duration_weeks"])
                end_date = None
                progress = random.randint(20, 80)
            elif status == "planning":
                start_date = datetime.utcnow() + timedelta(weeks=random.randint(1, 4))
                due_date = start_date + timedelta(weeks=template["duration_weeks"])
                end_date = None
                progress = random.randint(0, 15)
            else:  # on_hold
                start_date = datetime.utcnow() - timedelta(weeks=random.randint(1, 6))
                due_date = start_date + timedelta(weeks=template["duration_weeks"])
                end_date = None
                progress = random.randint(10, 40)
            
            # Assign teams based on required skills
            assigned_team_ids = []
            if any(skill in ["React", "Node.js", "Python", "TypeScript"] for skill in template["required_skills"]):
                assigned_team_ids.append("team-development-001")
            if any(skill in ["UI/UX Design", "Figma"] for skill in template["required_skills"]):
                assigned_team_ids.append("team-design-001")
            if any(skill in ["Data Science", "Machine Learning"] for skill in template["required_skills"]):
                assigned_team_ids.append("team-data-001")
            if any(skill in ["Marketing", "Content Strategy"] for skill in template["required_skills"]):
                assigned_team_ids.append("team-marketing-001")
            
            # Budget calculation
            avg_hourly_rate = 70
            budget = template["estimated_hours"] * avg_hourly_rate
            spent_percentage = progress / 100
            budget_spent = budget * spent_percentage * random.uniform(0.8, 1.2)  # Add some variance
            
            project_data = {
                "id": project_id,
                "name": template["name"],
                "description": template["description"],
                "type": template["type"],
                "status": status,
                "priority": template["priority"],
                "organization_id": self.org_id,
                "owner_id": "demo-user-001",  # Default owner
                "manager_id": "user-ops-lead-001",  # Assign to operations lead
                "team_ids": assigned_team_ids,
                "start_date": start_date,
                "due_date": due_date,
                "end_date": end_date,
                "estimated_hours": template["estimated_hours"],
                "actual_hours": int(template["estimated_hours"] * progress / 100),
                "progress_percentage": progress,
                "budget": budget,
                "budget_spent": budget_spent,
                "budget_currency": "USD",
                "tags": template["required_skills"][:3],  # Use first 3 skills as tags
                "required_skills": [{"name": skill, "required_level": random.randint(6, 9)} for skill in template["required_skills"]],
                "risk_level": random.choice(["low", "medium", "high"]),
                "client_id": None,
                "is_billable": True,
                "is_active": status in ["active", "planning"],
                "settings": {
                    "auto_assign_tasks": True,
                    "require_time_tracking": True,
                    "allow_client_access": False
                },
                "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.projects.insert_one(project_data)
            self.projects.append(project_data)
        
        print(f"✅ Created {len(self.project_templates)} enhanced projects")

    async def create_enhanced_tasks(self):
        """Create realistic tasks for each project with proper assignments"""
        task_types_by_project = {
            "software_development": [
                "Architecture Planning", "Database Design", "API Development", "Frontend Development", 
                "Testing", "Code Review", "Deployment", "Documentation", "Bug Fixes"
            ],
            "mobile_development": [
                "App Architecture", "UI/UX Design", "Native Development", "API Integration",
                "Testing", "App Store Submission", "Performance Optimization"
            ],
            "analytics": [
                "Data Modeling", "Dashboard Development", "Report Generation", "Data Pipeline",
                "Visualization", "Performance Tuning", "User Training"
            ],
            "customer_service": [
                "Requirements Gathering", "Chatbot Training", "Portal Development", "Integration",
                "User Testing", "Support Documentation", "Launch Planning"
            ],
            "marketing": [
                "Campaign Strategy", "Content Creation", "Email Templates", "Analytics Setup",
                "A/B Testing", "Lead Scoring", "Automation Rules"
            ],
            "infrastructure": [
                "Architecture Assessment", "Migration Planning", "Container Setup", "Monitoring",
                "Security Configuration", "Performance Testing", "Documentation"
            ],
            "backend_infrastructure": [
                "API Design", "Gateway Setup", "Security Implementation", "Rate Limiting",
                "Monitoring Setup", "Load Testing", "Documentation"
            ],
            "cms": [
                "Requirements Analysis", "Content Modeling", "Admin Interface", "Workflow Setup",
                "User Interface", "Testing", "Content Migration"
            ]
        }
        
        priorities = ["low", "medium", "high", "critical"]
        priority_weights = [0.3, 0.4, 0.25, 0.05]
        
        statuses = ["todo", "in_progress", "in_review", "blocked", "completed", "cancelled"]
        
        task_counter = 1
        
        for project in self.projects:
            project_type = project["type"]
            task_templates = task_types_by_project.get(project_type, ["General Task", "Planning", "Implementation", "Testing", "Review"])
            
            # Create 8-15 tasks per project
            num_tasks = random.randint(8, 15)
            
            for i in range(num_tasks):
                task_name = random.choice(task_templates)
                task_id = f"task-{task_counter:04d}"
                task_counter += 1
                
                # Determine status based on project progress
                if project["status"] == "completed":
                    status = random.choices(["completed", "cancelled"], weights=[0.9, 0.1])[0]
                elif project["status"] == "active":
                    status = random.choices(statuses, weights=[0.3, 0.3, 0.15, 0.05, 0.15, 0.05])[0]
                elif project["status"] == "planning":
                    status = random.choices(["todo", "in_progress"], weights=[0.7, 0.3])[0]
                else:  # on_hold
                    status = random.choices(["todo", "blocked"], weights=[0.6, 0.4])[0]
                
                # Assign tasks to appropriate team members
                assignee_id = None
                if project["team_ids"]:
                    # Get team members from assigned teams
                    potential_assignees = []
                    for team_id in project["team_ids"]:
                        team = next((t for t in self.teams if t["id"] == team_id), None)
                        if team:
                            for member in team["members"]:
                                potential_assignees.append(member["user_id"])
                    
                    if potential_assignees:
                        assignee_id = random.choice(potential_assignees)
                
                # Task duration and dates
                estimated_hours = random.randint(4, 40)
                actual_hours = 0
                
                if status == "completed":
                    actual_hours = estimated_hours * random.uniform(0.8, 1.3)  # Some variance
                elif status == "in_progress":
                    actual_hours = estimated_hours * random.uniform(0.1, 0.7)
                elif status == "in_review":
                    actual_hours = estimated_hours * random.uniform(0.8, 1.0)
                
                # Task dates
                if project["start_date"]:
                    task_start = project["start_date"] + timedelta(days=random.randint(0, 30))
                    task_due = task_start + timedelta(days=random.randint(3, 14))
                else:
                    task_start = datetime.utcnow() + timedelta(days=random.randint(1, 14))
                    task_due = task_start + timedelta(days=random.randint(3, 14))
                
                task_data = {
                    "id": task_id,
                    "title": f"{task_name} - {project['name']}",
                    "description": f"Complete {task_name.lower()} for the {project['name']} project. This task requires attention to detail and coordination with team members.",
                    "project_id": project["id"],
                    "organization_id": self.org_id,
                    "assignee_id": assignee_id,
                    "creator_id": project["manager_id"],
                    "status": status,
                    "priority": random.choices(priorities, weights=priority_weights)[0],
                    "type": "task",
                    "estimated_hours": estimated_hours,
                    "actual_hours": actual_hours,
                    "start_date": task_start,
                    "due_date": task_due,
                    "completed_date": task_due if status == "completed" else None,
                    "progress_percentage": 100 if status == "completed" else random.randint(0, 90) if status == "in_progress" else 0,
                    "tags": [project_type.replace("_", " ").title(), task_name],
                    "required_skills": random.sample(project["required_skills"], min(2, len(project["required_skills"]))),
                    "dependencies": [],  # Could add task dependencies later
                    "subtasks": [],
                    "time_entries": [],
                    "is_billable": project["is_billable"],
                    "is_milestone": random.choice([True, False]) if i % 5 == 0 else False,  # Every 5th task might be milestone
                    "is_blocked": status == "blocked",
                    "blocked_reason": "Waiting for dependencies" if status == "blocked" else None,
                    "custom_fields": {},
                    "created_at": task_start - timedelta(days=random.randint(1, 5)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.tasks.insert_one(task_data)
                self.tasks.append(task_data)
        
        print(f"✅ Created {len(self.tasks)} enhanced tasks")

    async def create_sample_comments_and_files(self):
        """Create sample comments and file attachments"""
        # Sample comments for active tasks
        active_tasks = [t for t in self.tasks if t["status"] in ["in_progress", "in_review", "blocked"]]
        
        comment_templates = [
            "Made good progress on this today. Should be ready for review soon.",
            "Encountered some technical challenges. Working on alternative approach.",
            "Please review the latest changes when you have a chance.",
            "Blocking issue resolved. Moving forward with implementation.",
            "Updated the requirements based on stakeholder feedback.",
            "Code review completed. Made suggested improvements.",
            "Testing phase complete. All unit tests passing.",
            "Documentation updated to reflect latest changes.",
            "Coordinating with design team on final specifications.",
            "Performance optimization complete. Significant improvements achieved."
        ]
        
        # Create 50-80 sample comments
        num_comments = random.randint(50, 80)
        for i in range(num_comments):
            task = random.choice(active_tasks)
            commenter_id = task["assignee_id"] if task["assignee_id"] and random.random() > 0.3 else random.choice([u["id"] for u in self.users])
            
            comment_data = {
                "id": f"comment-{i+1:03d}",
                "content": random.choice(comment_templates),
                "entity_type": "task",
                "entity_id": task["id"],
                "author_id": commenter_id,
                "organization_id": self.org_id,
                "type": "comment",
                "is_internal": True,
                "parent_comment_id": None,
                "reactions": [],
                "mentions": [],
                "attachments": [],
                "is_edited": False,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.comments.insert_one(comment_data)
        
        # Create sample file attachments
        file_types = [
            {"name": "Requirements Document", "type": "document", "size": 245760},
            {"name": "Design Mockups", "type": "image", "size": 1048576},
            {"name": "Technical Specification", "type": "document", "size": 524288},
            {"name": "Test Results", "type": "document", "size": 102400},
            {"name": "Code Archive", "type": "archive", "size": 2097152},
            {"name": "Performance Report", "type": "document", "size": 409600}
        ]
        
        # Create 30-50 sample files
        num_files = random.randint(30, 50)
        for i in range(num_files):
            task = random.choice(self.tasks)
            file_template = random.choice(file_types)
            
            file_data = {
                "id": f"file-{i+1:03d}",
                "name": f"{file_template['name']} - {task['title'][:30]}...",
                "original_name": f"{file_template['name'].lower().replace(' ', '_')}.pdf",
                "file_type": file_template["type"],
                "mime_type": "application/pdf" if file_template["type"] == "document" else "image/png",
                "size": file_template["size"],
                "entity_type": "task",
                "entity_id": task["id"],
                "uploader_id": task["assignee_id"] if task["assignee_id"] else random.choice([u["id"] for u in self.users]),
                "organization_id": self.org_id,
                "file_path": f"/uploads/{self.org_id}/tasks/{task['id']}/file-{i+1:03d}.pdf",
                "storage_provider": "local",
                "is_public": False,
                "access_level": "team",
                "version": 1,
                "checksum": f"sha256:{uuid.uuid4().hex}",
                "metadata": {
                    "uploaded_from": "web_app",
                    "original_size": file_template["size"]
                },
                "tags": [task["project_id"], file_template["type"]],
                "is_archived": False,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.files.insert_one(file_data)
        
        print(f"✅ Created {num_comments} comments and {num_files} file attachments")

    async def create_sample_notifications(self):
        """Create sample notifications for users"""
        notification_types = [
            {"type": "task_assigned", "title": "New task assigned", "priority": "medium"},
            {"type": "task_completed", "title": "Task completed", "priority": "low"},
            {"type": "task_overdue", "title": "Task overdue", "priority": "high"},
            {"type": "project_update", "title": "Project update", "priority": "medium"},
            {"type": "comment_mention", "title": "You were mentioned", "priority": "medium"},
            {"type": "deadline_reminder", "title": "Deadline reminder", "priority": "high"},
            {"type": "team_update", "title": "Team update", "priority": "low"}
        ]
        
        # Create 100-150 sample notifications
        num_notifications = random.randint(100, 150)
        for i in range(num_notifications):
            user = random.choice(self.users)
            notif_template = random.choice(notification_types)
            
            # Determine read status (70% read, 30% unread)
            is_read = random.random() < 0.7
            
            notification_data = {
                "id": f"notification-{i+1:03d}",
                "user_id": user["id"],
                "organization_id": self.org_id,
                "type": notif_template["type"],
                "title": notif_template["title"],
                "message": f"This is a {notif_template['type'].replace('_', ' ')} notification for {user['first_name']}",
                "priority": notif_template["priority"],
                "channel": "in_app",
                "entity_type": "task" if "task" in notif_template["type"] else "project",
                "entity_id": random.choice(self.tasks)["id"] if "task" in notif_template["type"] else random.choice(self.projects)["id"],
                "action_url": f"/tasks/{random.choice(self.tasks)['id']}" if "task" in notif_template["type"] else f"/projects/{random.choice(self.projects)['id']}",
                "is_read": is_read,
                "read_at": datetime.utcnow() - timedelta(days=random.randint(1, 10)) if is_read else None,
                "is_archived": False,
                "delivery_status": "delivered",
                "scheduled_for": None,
                "metadata": {
                    "source": "system",
                    "auto_generated": True
                },
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.notifications.insert_one(notification_data)
        
        print(f"✅ Created {num_notifications} sample notifications")

    async def update_organization_stats(self):
        """Update organization with current stats"""
        stats = {
            "member_count": len(self.users),
            "project_count": len(self.projects),
            "active_projects": len([p for p in self.projects if p["status"] == "active"]),
            "completed_projects": len([p for p in self.projects if p["status"] == "completed"]),
            "total_tasks": len(self.tasks),
            "completed_tasks": len([t for t in self.tasks if t["status"] == "completed"]),
            "team_count": len(self.teams)
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
        
        print("✅ Updated organization statistics")

    async def create_all_demo_data(self):
        """Create all enhanced demo data"""
        print("🚀 Starting enhanced demo data creation...")
        
        await self.connect_database()
        
        # Clear existing demo data (except organization and demo user)
        print("🧹 Cleaning existing demo data...")
        await self.db.users.delete_many({"organization_id": self.org_id, "id": {"$ne": "demo-user-001"}})
        await self.db.teams.delete_many({"organization_id": self.org_id})
        await self.db.projects.delete_many({"organization_id": self.org_id})
        await self.db.tasks.delete_many({})
        await self.db.comments.delete_many({"organization_id": self.org_id})
        await self.db.files.delete_many({"organization_id": self.org_id})
        await self.db.notifications.delete_many({"organization_id": self.org_id})
        
        # Create new enhanced data
        await self.create_enhanced_users()
        await self.create_enhanced_teams()
        await self.create_enhanced_projects()
        await self.create_enhanced_tasks()
        await self.create_sample_comments_and_files()
        await self.create_sample_notifications()
        await self.update_organization_stats()
        
        print("🎉 Enhanced demo data creation completed successfully!")
        print(f"📊 Summary:")
        print(f"   👥 Users: {len(self.users) + 1}")  # +1 for existing demo user
        print(f"   👨‍👩‍👧‍👦 Teams: {len(self.teams)}")
        print(f"   📁 Projects: {len(self.projects)}")
        print(f"   ✅ Tasks: {len(self.tasks)}")

if __name__ == "__main__":
    creator = EnhancedDemoDataCreator()
    asyncio.run(creator.create_all_demo_data())