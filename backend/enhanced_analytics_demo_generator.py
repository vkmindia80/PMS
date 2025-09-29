#!/usr/bin/env python3
"""
Enhanced Analytics Demo Data Generator
Specifically designed to populate Project Health and Financial Tracking analytics
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

class EnhancedAnalyticsDemoGenerator:
    def __init__(self):
        self.db = None
        self.org_id = "demo-org-001"
        self.generated_data = {
            "users": [],
            "teams": [],
            "projects": [],
            "tasks": [],
            "comments": [],
            "files": []
        }
        
        # Enhanced project templates with detailed financial and health data
        self.project_templates = [
            {
                "name": "E-commerce Platform Redesign",
                "description": "Complete overhaul of the company's e-commerce platform with modern UI/UX and enhanced performance",
                "type": "software_development",
                "priority": "high",
                "estimated_hours": 2400,
                "duration_weeks": 16,
                "base_budget": 180000,
                "required_skills": ["React", "Node.js", "PostgreSQL", "UI/UX Design", "DevOps"],
                "complexity": "high"
            },
            {
                "name": "Mobile App Development",
                "description": "Native mobile application for iOS and Android platforms with offline capabilities",
                "type": "mobile_development", 
                "priority": "critical",
                "estimated_hours": 1800,
                "duration_weeks": 12,
                "base_budget": 144000,
                "required_skills": ["React Native", "Mobile Development", "API Integration", "UI/UX Design"],
                "complexity": "high"
            },
            {
                "name": "Data Analytics Dashboard",
                "description": "Business intelligence dashboard for real-time analytics and reporting",
                "type": "analytics",
                "priority": "medium",
                "estimated_hours": 1200,
                "duration_weeks": 10,
                "base_budget": 96000,
                "required_skills": ["Python", "Data Science", "React", "PostgreSQL"],
                "complexity": "medium"
            },
            {
                "name": "Customer Support Portal",
                "description": "Self-service customer support portal with AI-powered chatbot integration",
                "type": "customer_service",
                "priority": "medium",
                "estimated_hours": 1600,
                "duration_weeks": 14,
                "base_budget": 112000,
                "required_skills": ["Vue.js", "Python", "AI/ML", "UI/UX Design"],
                "complexity": "medium"
            },
            {
                "name": "Marketing Automation System",
                "description": "Comprehensive marketing automation platform with email campaigns and lead scoring",
                "type": "marketing",
                "priority": "medium",
                "estimated_hours": 2000,
                "duration_weeks": 15,
                "base_budget": 140000,
                "required_skills": ["JavaScript", "Python", "Marketing", "Database"],
                "complexity": "medium"
            },
            {
                "name": "Infrastructure Modernization",
                "description": "Migration to cloud-native architecture with microservices and containerization",
                "type": "infrastructure",
                "priority": "high",
                "estimated_hours": 2800,
                "duration_weeks": 20,
                "base_budget": 224000,
                "required_skills": ["DevOps", "Docker", "Kubernetes", "AWS", "Python"],
                "complexity": "high"
            },
            {
                "name": "API Gateway Implementation",
                "description": "Centralized API gateway with authentication, rate limiting, and monitoring",
                "type": "backend_infrastructure",
                "priority": "high",
                "estimated_hours": 1400,
                "duration_weeks": 12,
                "base_budget": 98000,
                "required_skills": ["Node.js", "DevOps", "API Design", "Security"],
                "complexity": "medium"
            },
            {
                "name": "Content Management System",
                "description": "Custom CMS for managing website content with workflow approval system",
                "type": "cms",
                "priority": "low",
                "estimated_hours": 1000,
                "duration_weeks": 8,
                "base_budget": 70000,
                "required_skills": ["React", "Node.js", "MongoDB", "UI/UX Design"],
                "complexity": "low"
            },
            {
                "name": "Security Audit and Compliance",
                "description": "Comprehensive security assessment and SOC 2 compliance implementation",
                "type": "security",
                "priority": "critical",
                "estimated_hours": 800,
                "duration_weeks": 6,
                "base_budget": 120000,
                "required_skills": ["Security", "Compliance", "Risk Assessment", "Documentation"],
                "complexity": "medium"
            },
            {
                "name": "AI-Powered Analytics Engine",
                "description": "Machine learning platform for predictive analytics and business intelligence",
                "type": "ai_ml",
                "priority": "high",
                "estimated_hours": 2200,
                "duration_weeks": 18,
                "base_budget": 198000,
                "required_skills": ["Python", "Machine Learning", "TensorFlow", "Data Science", "React"],
                "complexity": "high"
            }
        ]

        # Enhanced user profiles with financial rates
        self.user_profiles = [
            {
                "email": "sarah.johnson@company.com",
                "first_name": "Sarah", "last_name": "Johnson",
                "role": "team_lead", "department": "Engineering",
                "skills": ["React", "Node.js", "TypeScript", "Python", "Team Leadership", "PostgreSQL"],
                "hourly_rate": 125, "years_experience": 8
            },
            {
                "email": "marcus.chen@company.com",
                "first_name": "Marcus", "last_name": "Chen",
                "role": "member", "department": "Engineering", 
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "MongoDB"],
                "hourly_rate": 95, "years_experience": 6
            },
            {
                "email": "emily.rodriguez@company.com",
                "first_name": "Emily", "last_name": "Rodriguez",
                "role": "member", "department": "Engineering",
                "skills": ["React", "TypeScript", "Tailwind CSS", "Next.js", "JavaScript", "UI/UX Design"],
                "hourly_rate": 90, "years_experience": 5
            },
            {
                "email": "james.wilson@company.com",
                "first_name": "James", "last_name": "Wilson",
                "role": "member", "department": "Engineering",
                "skills": ["React Native", "iOS Development", "Android Development", "Flutter", "JavaScript"],
                "hourly_rate": 100, "years_experience": 7
            },
            {
                "email": "alex.kumar@company.com",
                "first_name": "Alex", "last_name": "Kumar",
                "role": "member", "department": "Engineering",
                "skills": ["Docker", "Kubernetes", "AWS", "Terraform", "Jenkins", "Python"],
                "hourly_rate": 110, "years_experience": 9
            },
            {
                "email": "maria.gonzalez@company.com",
                "first_name": "Maria", "last_name": "Gonzalez",
                "role": "team_lead", "department": "Design",
                "skills": ["UI/UX Design", "Figma", "Adobe Creative Suite", "User Research", "Prototyping"],
                "hourly_rate": 105, "years_experience": 7
            },
            {
                "email": "david.thompson@company.com",
                "first_name": "David", "last_name": "Thompson",
                "role": "member", "department": "Design",
                "skills": ["UI/UX Design", "Figma", "Sketch", "Prototyping", "User Research"],
                "hourly_rate": 80, "years_experience": 4
            },
            {
                "email": "lisa.park@company.com",
                "first_name": "Lisa", "last_name": "Park",
                "role": "team_lead", "department": "Data Science",
                "skills": ["Python", "Machine Learning", "Data Analysis", "Pandas", "TensorFlow", "PostgreSQL"],
                "hourly_rate": 130, "years_experience": 10
            },
            {
                "email": "michael.chang@company.com",
                "first_name": "Michael", "last_name": "Chang",
                "role": "member", "department": "Data Science",
                "skills": ["Python", "Data Analysis", "PostgreSQL", "R", "Data Visualization", "Excel"],
                "hourly_rate": 85, "years_experience": 3
            },
            {
                "email": "jennifer.davis@company.com",
                "first_name": "Jennifer", "last_name": "Davis",
                "role": "manager", "department": "Marketing",
                "skills": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Social Media", "Analytics"],
                "hourly_rate": 90, "years_experience": 6
            },
            {
                "email": "robert.taylor@company.com",
                "first_name": "Robert", "last_name": "Taylor",
                "role": "member", "department": "Marketing",
                "skills": ["Content Strategy", "Social Media", "SEO/SEM", "Analytics", "Brand Management"],
                "hourly_rate": 65, "years_experience": 3
            },
            {
                "email": "patricia.brown@company.com",
                "first_name": "Patricia", "last_name": "Brown",
                "role": "manager", "department": "Sales",
                "skills": ["B2B Sales", "CRM", "Lead Generation", "Customer Success", "Negotiation"],
                "hourly_rate": 85, "years_experience": 8
            }
        ]

    async def connect_database(self):
        """Connect to the database"""
        await connect_to_mongo()
        self.db = await get_database()
        print("✅ Connected to database")

    async def cleanup_existing_data(self):
        """Clean up existing data while preserving demo user"""
        print("🧹 Cleaning up existing demo data...")
        
        try:
            # Delete existing demo data except the main demo user and organization
            collections_to_clean = [
                ("users", {"organization_id": self.org_id, "email": {"$ne": "demo@company.com"}}),
                ("teams", {"organization_id": self.org_id}),
                ("projects", {"organization_id": self.org_id}),
                ("tasks", {}),
                ("comments", {"organization_id": self.org_id}),
                ("files", {"organization_id": self.org_id})
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

    async def create_enhanced_users(self):
        """Create users with enhanced financial tracking"""
        print("👥 Creating enhanced user profiles...")
        
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
                    "bio": f"Experienced {profile['department']} professional with {profile['years_experience']} years of experience",
                    "avatar_url": None,
                    "role": profile["role"],
                    "organization_id": self.org_id,
                    "department": profile["department"],
                    "is_active": True,
                    "status": "active",
                    "email_verified": True,
                    "skills": [{"name": skill, "level": random.randint(7, 10), "years_experience": random.randint(2, profile["years_experience"])} for skill in profile["skills"]],
                    "hourly_rate": profile["hourly_rate"],
                    "years_experience": profile["years_experience"],
                    "availability": "full_time",
                    "capacity_hours_per_week": 40,
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
                
            print(f"✅ Created {users_created} enhanced user profiles")
            return True
            
        except Exception as e:
            print(f"❌ Enhanced user creation failed: {e}")
            return False

    async def create_enhanced_teams(self):
        """Create teams with capacity tracking"""
        print("👨‍👩‍👧‍👦 Creating enhanced teams...")
        
        try:
            team_configs = [
                {
                    "name": "Frontend Development Team",
                    "description": "React and UI/UX specialists focusing on user-facing applications",
                    "type": "development",
                    "department": "Engineering",
                    "skills_focus": ["React", "TypeScript", "UI/UX Design", "JavaScript"]
                },
                {
                    "name": "Backend & Infrastructure Team",
                    "description": "Backend development and DevOps team for scalable systems",
                    "type": "development", 
                    "department": "Engineering",
                    "skills_focus": ["Python", "Node.js", "DevOps", "Docker", "AWS"]
                },
                {
                    "name": "Design & UX Team",
                    "description": "User experience and visual design specialists",
                    "type": "design",
                    "department": "Design",
                    "skills_focus": ["UI/UX Design", "Figma", "Prototyping", "User Research"]
                },
                {
                    "name": "Data Science & Analytics Team",
                    "description": "Business intelligence and machine learning team",
                    "type": "operations",
                    "department": "Data Science",
                    "skills_focus": ["Python", "Machine Learning", "Data Analysis", "PostgreSQL"]
                },
                {
                    "name": "Marketing & Growth Team",
                    "description": "Digital marketing and business development team",
                    "type": "marketing",
                    "department": "Marketing",
                    "skills_focus": ["Digital Marketing", "Content Strategy", "SEO/SEM", "Analytics"]
                },
                {
                    "name": "Business Development Team",
                    "description": "Sales and customer success team",
                    "type": "sales",
                    "department": "Sales", 
                    "skills_focus": ["B2B Sales", "Customer Success", "CRM", "Account Management"]
                }
            ]
            
            for team_config in team_configs:
                # Find team members by matching skills
                suitable_users = []
                for user in self.generated_data["users"]:
                    user_skill_names = [skill["name"] if isinstance(skill, dict) else skill for skill in user.get("skills", [])]
                    skill_matches = len(set(user_skill_names) & set(team_config["skills_focus"]))
                    if skill_matches > 0:
                        suitable_users.append((user, skill_matches))
                
                # Sort by skill matches and take top candidates
                suitable_users.sort(key=lambda x: x[1], reverse=True)
                team_members = [user for user, _ in suitable_users[:6]]  # Max 6 per team
                
                if not team_members:
                    print(f"   No suitable members found for {team_config['name']}, skipping")
                    continue
                
                # Find team lead
                team_lead = next((member for member in team_members if member["role"] in ["team_lead", "manager"]), None)
                if not team_lead:
                    team_lead = team_members[0]  # Default to first member
                
                team_id = str(uuid.uuid4())
                team_data = {
                    "id": team_id,
                    "name": team_config["name"],
                    "description": team_config["description"],
                    "type": team_config["type"],
                    "department": team_config["department"],
                    "organization_id": self.org_id,
                    "lead_id": team_lead["id"],
                    "members": [{"user_id": member["id"], "role": member["role"]} for member in team_members],
                    "member_count": len(team_members),
                    "skills_focus": team_config["skills_focus"],
                    "capacity_hours_per_week": sum(member.get("capacity_hours_per_week", 40) for member in team_members),
                    "avg_hourly_rate": sum(member.get("hourly_rate", 70) for member in team_members) / len(team_members),
                    "current_utilization": random.uniform(0.65, 0.95),
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
                        {"$addToSet": {"team_memberships": team_id}}
                    )
                
            print(f"✅ Created {len(self.generated_data['teams'])} enhanced teams")
            return True
            
        except Exception as e:
            print(f"❌ Enhanced team creation failed: {e}")
            return False

    async def create_enhanced_projects(self):
        """Create projects with detailed financial tracking and health metrics"""
        print("📁 Creating enhanced projects with financial tracking...")
        
        try:
            for i, template in enumerate(self.project_templates):
                project_id = str(uuid.uuid4())
                
                # Determine project status with realistic distribution
                status_weights = {
                    "planning": 0.15,
                    "active": 0.45, 
                    "on_hold": 0.05,
                    "completed": 0.25,
                    "cancelled": 0.05,
                    "archived": 0.05
                }
                status = random.choices(list(status_weights.keys()), weights=list(status_weights.values()))[0]
                
                # Set realistic dates and progress based on status
                created_date = datetime.utcnow() - timedelta(days=random.randint(30, 365))
                
                if status == "completed":
                    start_date = created_date + timedelta(days=random.randint(5, 30))
                    actual_duration = random.randint(int(template["duration_weeks"] * 0.8), int(template["duration_weeks"] * 1.3))
                    end_date = start_date + timedelta(weeks=actual_duration)
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    progress = 100
                    actual_hours = template["estimated_hours"] * random.uniform(0.9, 1.4)
                elif status == "active":
                    start_date = created_date + timedelta(days=random.randint(5, 20))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    weeks_elapsed = min((datetime.utcnow() - start_date).days / 7, template["duration_weeks"])
                    base_progress = (weeks_elapsed / template["duration_weeks"]) * 100
                    progress = max(10, min(95, base_progress + random.randint(-15, 25)))
                    actual_hours = (progress / 100) * template["estimated_hours"] * random.uniform(0.8, 1.2)
                elif status == "planning":
                    start_date = datetime.utcnow() + timedelta(weeks=random.randint(1, 8))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(0, 20)
                    actual_hours = progress * template["estimated_hours"] / 100
                elif status == "on_hold":
                    start_date = created_date + timedelta(days=random.randint(5, 20))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(15, 55)
                    actual_hours = (progress / 100) * template["estimated_hours"] * random.uniform(0.7, 1.1)
                else:  # cancelled or archived
                    start_date = created_date + timedelta(days=random.randint(5, 20))
                    due_date = start_date + timedelta(weeks=template["duration_weeks"])
                    end_date = None
                    progress = random.randint(5, 40)
                    actual_hours = (progress / 100) * template["estimated_hours"] * random.uniform(0.6, 1.0)
                
                # Assign project team with realistic skill matching
                suitable_team_members = []
                for user in self.generated_data["users"]:
                    user_skill_names = [skill["name"] if isinstance(skill, dict) else skill for skill in user.get("skills", [])]
                    skill_matches = len(set(user_skill_names) & set(template["required_skills"]))
                    if skill_matches > 0:
                        suitable_team_members.append((user, skill_matches))
                
                suitable_team_members.sort(key=lambda x: x[1], reverse=True)
                team_size = random.randint(4, min(10, len(suitable_team_members)))
                selected_members = [user for user, _ in suitable_team_members[:team_size]]
                
                # Project manager selection
                project_manager = next((member for member in selected_members if member["role"] in ["admin", "manager", "team_lead"]), selected_members[0] if selected_members else self.generated_data["users"][0])
                
                # Financial calculations with realistic variance
                base_budget = template["base_budget"]
                
                # Budget adjustments based on complexity and team composition
                complexity_multiplier = {"low": 0.85, "medium": 1.0, "high": 1.25}.get(template["complexity"], 1.0)
                team_cost_factor = sum(member.get("hourly_rate", 80) for member in selected_members) / (len(selected_members) * 80) if selected_members else 1.0
                
                total_budget = base_budget * complexity_multiplier * team_cost_factor
                
                # Spent amount calculation with realistic variance
                if status == "completed":
                    budget_efficiency = random.uniform(0.85, 1.25)  # Some projects over/under budget
                    spent_amount = total_budget * budget_efficiency
                elif status == "active":
                    burn_rate_efficiency = random.uniform(0.9, 1.3)
                    expected_spent = (progress / 100) * total_budget
                    spent_amount = expected_spent * burn_rate_efficiency
                elif status in ["planning", "on_hold", "cancelled", "archived"]:
                    spent_amount = (progress / 100) * total_budget * random.uniform(0.5, 1.2)
                else:
                    spent_amount = 0
                
                remaining_budget = max(0, total_budget - spent_amount)
                budget_utilization = (spent_amount / total_budget * 100) if total_budget > 0 else 0
                
                # Health metrics calculation
                health_score = self.calculate_project_health_score(status, progress, budget_utilization, due_date, template["priority"])
                risk_factors = self.identify_project_risk_factors(status, progress, budget_utilization, due_date, len(selected_members))
                
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
                    "team_members": [{"user_id": member["id"], "role": "contributor", "hourly_rate": member.get("hourly_rate", 80)} for member in selected_members],
                    "team_size": len(selected_members),
                    "start_date": start_date,
                    "due_date": due_date,
                    "end_date": end_date,
                    "estimated_hours": template["estimated_hours"],
                    "actual_hours": round(actual_hours, 1),
                    "progress_percentage": round(progress, 1),
                    
                    # Enhanced budget tracking
                    "budget": {
                        "total_budget": round(total_budget, 2),
                        "spent_amount": round(spent_amount, 2),
                        "remaining_budget": round(remaining_budget, 2),
                        "currency": "USD",
                        "budget_utilization": round(budget_utilization, 1),
                        "cost_breakdown": {
                            "labor": round(spent_amount * 0.75, 2),
                            "tools_software": round(spent_amount * 0.15, 2),
                            "infrastructure": round(spent_amount * 0.07, 2),
                            "miscellaneous": round(spent_amount * 0.03, 2)
                        }
                    },
                    
                    # Health and risk metrics
                    "health_metrics": {
                        "health_score": health_score,
                        "health_status": self.get_health_status(health_score),
                        "risk_level": random.choice(["low", "medium", "high"]) if health_score < 70 else "low",
                        "risk_factors": risk_factors,
                        "schedule_variance": self.calculate_schedule_variance(start_date, due_date, progress, status),
                        "budget_variance": round(budget_utilization - progress, 1),
                        "team_satisfaction": random.randint(6, 10),
                        "stakeholder_satisfaction": random.randint(7, 10)
                    },
                    
                    "tags": template["required_skills"][:3],
                    "required_skills": [{"name": skill, "required_level": random.randint(6, 9), "importance": random.choice(["high", "medium", "low"])} for skill in template["required_skills"]],
                    "complexity": template["complexity"],
                    "is_billable": True,
                    "is_active": status in ["active", "planning"],
                    "created_at": created_date,
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.projects.insert_one(project_data)
                self.generated_data["projects"].append(project_data)
                
            print(f"✅ Created {len(self.generated_data['projects'])} enhanced projects with financial tracking")
            return True
            
        except Exception as e:
            print(f"❌ Enhanced project creation failed: {e}")
            return False

    async def create_enhanced_tasks(self):
        """Create tasks with detailed time and cost tracking"""
        print("✅ Creating enhanced tasks with time tracking...")
        
        try:
            task_templates = [
                {"name": "Requirements Analysis", "category": "planning", "base_hours": [8, 24]},
                {"name": "System Architecture Design", "category": "design", "base_hours": [16, 40]},
                {"name": "Database Schema Design", "category": "database", "base_hours": [12, 32]},
                {"name": "Frontend Component Development", "category": "frontend", "base_hours": [20, 60]},
                {"name": "Backend API Development", "category": "backend", "base_hours": [16, 48]},
                {"name": "User Interface Design", "category": "design", "base_hours": [12, 36]},
                {"name": "Unit Testing Implementation", "category": "testing", "base_hours": [8, 24]},
                {"name": "Integration Testing", "category": "testing", "base_hours": [16, 40]},
                {"name": "Performance Optimization", "category": "optimization", "base_hours": [12, 32]},
                {"name": "Security Implementation", "category": "security", "base_hours": [16, 48]},
                {"name": "Documentation Creation", "category": "documentation", "base_hours": [8, 20]},
                {"name": "Code Review and Refactoring", "category": "quality", "base_hours": [6, 16]},
                {"name": "Bug Investigation and Fixing", "category": "bugfix", "base_hours": [4, 24]},
                {"name": "User Acceptance Testing", "category": "testing", "base_hours": [12, 30]},
                {"name": "Deployment and Configuration", "category": "deployment", "base_hours": [8, 24]}
            ]
            
            for project in self.generated_data["projects"]:
                project_team_ids = [tm["user_id"] for tm in project["team_members"]]
                project_team_members = [user for user in self.generated_data["users"] if user["id"] in project_team_ids]
                
                if not project_team_members:
                    continue
                
                num_tasks = random.randint(10, 25)
                project_task_hours = 0
                
                for i in range(num_tasks):
                    task_template = random.choice(task_templates)
                    task_id = str(uuid.uuid4())
                    
                    # Determine task status based on project status and progress
                    if project["status"] == "completed":
                        status = random.choices(
                            ["completed", "cancelled"], 
                            weights=[0.95, 0.05]
                        )[0]
                    elif project["status"] == "active":
                        completed_ratio = project["progress_percentage"] / 100
                        task_position = i / num_tasks  # Task position in project
                        
                        if task_position < completed_ratio - 0.2:
                            status = "completed"
                        elif task_position < completed_ratio:
                            status = random.choice(["completed", "in_progress", "in_review"])
                        elif task_position < completed_ratio + 0.1:
                            status = random.choice(["in_progress", "todo"])
                        else:
                            status = "todo"
                    elif project["status"] == "planning":
                        status = random.choices(
                            ["todo", "in_progress"], 
                            weights=[0.8, 0.2]
                        )[0]
                    elif project["status"] == "on_hold":
                        status = random.choices(
                            ["todo", "blocked", "on_hold"], 
                            weights=[0.5, 0.3, 0.2]
                        )[0]
                    else:  # cancelled, archived
                        status = random.choices(
                            ["todo", "cancelled"], 
                            weights=[0.7, 0.3]
                        )[0]
                    
                    # Task assignment based on skills
                    suitable_assignees = []
                    for member in project_team_members:
                        member_skills = [skill["name"] if isinstance(skill, dict) else skill for skill in member.get("skills", [])]
                        
                        # Match skills to task category
                        skill_relevance = 0
                        if task_template["category"] in ["frontend", "backend", "database"]:
                            if any(skill in member_skills for skill in ["React", "Node.js", "Python", "JavaScript", "TypeScript", "PostgreSQL", "MongoDB"]):
                                skill_relevance += 3
                        elif task_template["category"] == "design":
                            if any(skill in member_skills for skill in ["UI/UX Design", "Figma", "Adobe Creative Suite"]):
                                skill_relevance += 5
                        elif task_template["category"] == "testing":
                            if any(skill in member_skills for skill in ["Testing", "Quality Assurance"]):
                                skill_relevance += 4
                            elif any(skill in member_skills for skill in ["Python", "JavaScript"]):
                                skill_relevance += 2
                        elif task_template["category"] == "deployment":
                            if any(skill in member_skills for skill in ["DevOps", "AWS", "Docker", "Kubernetes"]):
                                skill_relevance += 5
                        else:
                            skill_relevance += 1  # Default relevance
                        
                        if skill_relevance > 0:
                            suitable_assignees.append((member, skill_relevance))
                    
                    if suitable_assignees:
                        suitable_assignees.sort(key=lambda x: x[1], reverse=True)
                        assignee = suitable_assignees[0][0]
                    else:
                        assignee = random.choice(project_team_members)
                    
                    # Time calculations
                    estimated_hours = random.randint(task_template["base_hours"][0], task_template["base_hours"][1])
                    
                    if status == "completed":
                        actual_hours = estimated_hours * random.uniform(0.7, 1.4)
                        efficiency_factor = actual_hours / estimated_hours
                    elif status == "in_progress":
                        actual_hours = estimated_hours * random.uniform(0.2, 0.9)
                        efficiency_factor = 1.0  # TBD
                    elif status == "in_review":
                        actual_hours = estimated_hours * random.uniform(0.85, 1.1)
                        efficiency_factor = actual_hours / estimated_hours
                    else:
                        actual_hours = 0
                        efficiency_factor = 1.0
                    
                    project_task_hours += actual_hours
                    
                    # Task dates
                    if project["start_date"]:
                        task_start = project["start_date"] + timedelta(days=random.randint(0, min(60, (project["due_date"] - project["start_date"]).days // 2)))
                        task_due = task_start + timedelta(days=random.randint(3, 21))
                    else:
                        task_start = datetime.utcnow() + timedelta(days=random.randint(1, 30))
                        task_due = task_start + timedelta(days=random.randint(3, 21))
                    
                    # Cost calculations
                    assignee_rate = assignee.get("hourly_rate", 80)
                    estimated_cost = estimated_hours * assignee_rate
                    actual_cost = actual_hours * assignee_rate
                    
                    # Priority distribution
                    priority_weights = {"low": 0.3, "medium": 0.45, "high": 0.2, "critical": 0.05}
                    priority = random.choices(list(priority_weights.keys()), weights=list(priority_weights.values()))[0]
                    
                    task_data = {
                        "id": task_id,
                        "title": f"{task_template['name']} - {project['name'][:30]}",
                        "description": f"Complete {task_template['name'].lower()} for the {project['name']} project. This task involves {task_template['category']} work and requires attention to detail.",
                        "project_id": project["id"],
                        "organization_id": self.org_id,
                        "assignee_id": assignee["id"],
                        "creator_id": project["manager_id"],
                        "status": status,
                        "priority": priority,
                        "type": "task",
                        "category": task_template["category"],
                        
                        # Time tracking
                        "estimated_hours": round(estimated_hours, 1),
                        "actual_hours": round(actual_hours, 1),
                        "remaining_hours": max(0, round(estimated_hours - actual_hours, 1)),
                        
                        # Cost tracking
                        "estimated_cost": round(estimated_cost, 2),
                        "actual_cost": round(actual_cost, 2),
                        "hourly_rate": assignee_rate,
                        
                        # Dates
                        "start_date": task_start,
                        "due_date": task_due,
                        "completed_date": task_due if status == "completed" else None,
                        
                        # Progress
                        "progress_percentage": 100 if status == "completed" else (50 if status == "in_progress" else 0),
                        "efficiency_score": round(efficiency_factor * 100, 1) if status == "completed" else None,
                        
                        # Metadata
                        "tags": [task_template["category"], project["type"]],
                        "is_billable": project["is_billable"],
                        "complexity": random.choice(["low", "medium", "high"]),
                        "created_at": task_start - timedelta(days=random.randint(1, 7)),
                        "updated_at": datetime.utcnow() - timedelta(hours=random.randint(1, 168))
                    }
                    
                    await self.db.tasks.insert_one(task_data)
                    self.generated_data["tasks"].append(task_data)
                
                # Update project with actual hours from tasks
                await self.db.projects.update_one(
                    {"id": project["id"]},
                    {"$set": {"actual_hours_from_tasks": round(project_task_hours, 1)}}
                )
            
            print(f"✅ Created {len(self.generated_data['tasks'])} enhanced tasks with detailed tracking")
            return True
            
        except Exception as e:
            print(f"❌ Enhanced task creation failed: {e}")
            return False

    def calculate_project_health_score(self, status, progress, budget_utilization, due_date, priority):
        """Calculate project health score based on multiple factors"""
        health_score = 100
        
        # Status impact
        status_impact = {
            "completed": 10,
            "active": 0,
            "planning": -5,
            "on_hold": -20,
            "cancelled": -50,
            "archived": -10
        }
        health_score += status_impact.get(status, 0)
        
        # Progress vs time impact
        if due_date and status in ["active", "planning"]:
            total_duration = (due_date - datetime.utcnow()).days if due_date > datetime.utcnow() else 1
            if total_duration > 0:
                expected_progress = max(0, min(100, 100 - (total_duration / 100) * 100))
                progress_variance = progress - expected_progress
                health_score += min(20, max(-30, progress_variance * 0.5))
        
        # Budget impact
        if budget_utilization > 100:
            health_score -= min(25, (budget_utilization - 100) * 0.8)
        elif budget_utilization > 90:
            health_score -= (budget_utilization - 90) * 0.5
        
        # Priority impact
        priority_impact = {"critical": -5, "high": -2, "medium": 0, "low": 2}
        health_score += priority_impact.get(priority, 0)
        
        return max(0, min(100, round(health_score, 1)))

    def get_health_status(self, health_score):
        """Get health status based on score"""
        if health_score >= 90:
            return "excellent"
        elif health_score >= 75:
            return "good"
        elif health_score >= 60:
            return "needs_attention"
        elif health_score >= 40:
            return "at_risk"
        else:
            return "critical"

    def identify_project_risk_factors(self, status, progress, budget_utilization, due_date, team_size):
        """Identify project risk factors"""
        risk_factors = []
        
        if budget_utilization > 90:
            risk_factors.append("budget_overrun")
        
        if status == "on_hold":
            risk_factors.append("project_stalled")
        
        if due_date and due_date < datetime.utcnow() and status != "completed":
            risk_factors.append("schedule_delay")
        
        if team_size < 3:
            risk_factors.append("insufficient_resources")
        
        if progress < 20 and status == "active":
            risk_factors.append("slow_progress")
        
        return risk_factors

    def calculate_schedule_variance(self, start_date, due_date, progress, status):
        """Calculate schedule variance in days"""
        if not start_date or not due_date or status != "active":
            return 0
        
        total_duration = (due_date - start_date).days
        elapsed_duration = (datetime.utcnow() - start_date).days
        
        expected_progress = (elapsed_duration / total_duration) * 100
        progress_variance = progress - expected_progress
        
        return round((progress_variance / 100) * total_duration, 1)

    async def create_comments_and_files(self):
        """Create enhanced comments and files"""
        print("💬 Creating enhanced comments and files...")
        
        try:
            # Enhanced comment templates
            comment_templates = [
                "Completed the initial implementation. Ready for technical review.",
                "Encountered performance issues with the current approach. Investigating alternatives.",
                "Updated based on stakeholder feedback from yesterday's meeting.", 
                "All unit tests are passing. Moving to integration testing phase.",
                "Blocked on external API integration. Waiting for vendor response.",
                "Refactored code for better maintainability. Performance improved by 15%.",
                "Code review completed. Addressed all suggested improvements.",
                "Documentation updated to reflect latest architectural changes.",
                "Testing phase complete. Found 3 minor bugs, all fixed.",
                "Ready for production deployment. All requirements validated."
            ]
            
            # Create contextual comments for active tasks
            active_tasks = [t for t in self.generated_data["tasks"] if t["status"] in ["in_progress", "in_review", "blocked"]]
            
            for i in range(min(60, len(active_tasks) * 2)):
                task = random.choice(active_tasks)
                commenter_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                
                comment_data = {
                    "id": str(uuid.uuid4()),
                    "content": random.choice(comment_templates),
                    "entity_type": "task",
                    "entity_id": task["id"],
                    "author_id": commenter_id,
                    "organization_id": self.org_id,
                    "type": "status_update",
                    "is_internal": True,
                    "parent_comment_id": None,
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 14)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.comments.insert_one(comment_data)
                self.generated_data["comments"].append(comment_data)
            
            # Create enhanced file attachments
            file_templates = [
                {"name": "Requirements Specification", "type": "document", "extension": "pdf", "size": 245760},
                {"name": "UI Mockups", "type": "image", "extension": "fig", "size": 1048576},
                {"name": "Technical Architecture", "type": "document", "extension": "pdf", "size": 524288},
                {"name": "Test Results Report", "type": "document", "extension": "xlsx", "size": 102400},
                {"name": "Performance Benchmark", "type": "document", "extension": "pdf", "size": 183040},
                {"name": "Database Schema", "type": "document", "extension": "sql", "size": 51200}
            ]
            
            for i in range(min(40, len(self.generated_data["tasks"]))):
                task = random.choice(self.generated_data["tasks"])
                file_template = random.choice(file_templates)
                uploader_id = task.get("assignee_id", random.choice(self.generated_data["users"])["id"])
                
                file_data = {
                    "id": str(uuid.uuid4()),
                    "name": f"{file_template['name']} - {task['title'][:40]}",
                    "original_name": f"{file_template['name'].lower().replace(' ', '_')}.{file_template['extension']}",
                    "file_type": file_template["type"],
                    "size": file_template["size"],
                    "extension": file_template["extension"],
                    "entity_type": "task",
                    "entity_id": task["id"],
                    "uploader_id": uploader_id,
                    "organization_id": self.org_id,
                    "file_path": f"/uploads/{self.org_id}/tasks/{task['id']}/file-{i+1:03d}.{file_template['extension']}",
                    "upload_date": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.files.insert_one(file_data)
                self.generated_data["files"].append(file_data)
            
            print(f"✅ Created {len(self.generated_data['comments'])} comments and {len(self.generated_data['files'])} files")
            return True
            
        except Exception as e:
            print(f"❌ Enhanced comments/files creation failed: {e}")
            return False

    async def update_organization_stats(self):
        """Update organization with enhanced statistics"""
        print("📊 Updating organization with enhanced analytics...")
        
        try:
            # Calculate comprehensive statistics
            total_budget = sum(p["budget"]["total_budget"] for p in self.generated_data["projects"])
            total_spent = sum(p["budget"]["spent_amount"] for p in self.generated_data["projects"])
            
            stats = {
                "member_count": len(self.generated_data["users"]) + 1,  # +1 for demo user
                "project_count": len(self.generated_data["projects"]),
                "active_projects": len([p for p in self.generated_data["projects"] if p["status"] == "active"]),
                "completed_projects": len([p for p in self.generated_data["projects"] if p["status"] == "completed"]),
                "total_tasks": len(self.generated_data["tasks"]),
                "completed_tasks": len([t for t in self.generated_data["tasks"] if t["status"] == "completed"]),
                "team_count": len(self.generated_data["teams"]),
                "total_budget": total_budget,
                "total_spent": total_spent,
                "budget_utilization": (total_spent / total_budget * 100) if total_budget > 0 else 0,
                "avg_project_health": sum(p["health_metrics"]["health_score"] for p in self.generated_data["projects"]) / len(self.generated_data["projects"]) if self.generated_data["projects"] else 0
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
            
            print("✅ Organization statistics updated with analytics data")
            return True
            
        except Exception as e:
            print(f"❌ Organization statistics update failed: {e}")
            return False

    async def generate_completion_report(self):
        """Generate enhanced completion report"""
        print("📋 Generating enhanced completion report...")
        
        try:
            # Calculate summary statistics
            total_budget = sum(p["budget"]["total_budget"] for p in self.generated_data["projects"])
            total_spent = sum(p["budget"]["spent_amount"] for p in self.generated_data["projects"])
            avg_health_score = sum(p["health_metrics"]["health_score"] for p in self.generated_data["projects"]) / len(self.generated_data["projects"]) if self.generated_data["projects"] else 0
            
            report = {
                "generation_timestamp": datetime.utcnow().isoformat(),
                "generator_version": "enhanced_analytics_v2.0",
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
                "financial_summary": {
                    "total_budget": round(total_budget, 2),
                    "total_spent": round(total_spent, 2),
                    "budget_utilization": round((total_spent / total_budget * 100), 1) if total_budget > 0 else 0,
                    "avg_project_health_score": round(avg_health_score, 1)
                },
                "analytics_features": [
                    "Project Health Tracking with 6-point scoring system",
                    "Comprehensive Financial Tracking with cost breakdowns",
                    "Enhanced Task Management with time and efficiency tracking",
                    "Team Performance Analytics with skill-based assignments",
                    "Budget Variance Analysis with real-time utilization",
                    "Risk Assessment with multi-factor analysis"
                ],
                "access_information": {
                    "demo_login": "demo@company.com / demo123456",
                    "frontend_url": "http://localhost:3000",
                    "portfolio_analytics": "http://localhost:3000/portfolio",
                    "backend_api": "http://localhost:8001",
                    "api_docs": "http://localhost:8001/docs",
                    "health_check": "http://localhost:8001/api/health"
                }
            }
            
            # Save enhanced report
            report_file = f"/app/enhanced_analytics_demo_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            print("=" * 90)
            print("🎉 ENHANCED ANALYTICS DEMO DATA GENERATION COMPLETED!")
            print("=" * 90)
            print(f"📊 Data Summary:")
            print(f"   👥 Users: {report['summary']['users_created']} (+ 1 demo user)")
            print(f"   👨‍👩‍👧‍👦 Teams: {report['summary']['teams_created']}")
            print(f"   📁 Projects: {report['summary']['projects_created']}")
            print(f"   ✅ Tasks: {report['summary']['tasks_created']}")
            print(f"   💬 Comments: {report['summary']['comments_created']}")
            print(f"   📎 Files: {report['summary']['files_created']}")
            print(f"\n💰 Financial Summary:")
            print(f"   Total Budget: ${report['financial_summary']['total_budget']:,}")
            print(f"   Total Spent: ${report['financial_summary']['total_spent']:,}")
            print(f"   Budget Utilization: {report['financial_summary']['budget_utilization']}%")
            print(f"   Avg Health Score: {report['financial_summary']['avg_project_health_score']}/100")
            print(f"\n🔑 Access Portfolio Analytics:")
            print(f"   Demo Login: {report['access_information']['demo_login']}")
            print(f"   Portfolio Dashboard: {report['access_information']['portfolio_analytics']}")
            print(f"   Backend API: {report['access_information']['backend_api']}")
            print(f"\n📋 Analytics Features Available:")
            for feature in report['analytics_features']:
                print(f"   • {feature}")
            print(f"\n💾 Report saved to: {report_file}")
            print("=" * 90)
            
            return report
            
        except Exception as e:
            print(f"❌ Enhanced report generation failed: {e}")
            return None

    async def run_enhanced_generation(self):
        """Run the complete enhanced demo data generation"""
        print("🚀 Starting Enhanced Analytics Demo Data Generation...")
        print("=" * 90)
        
        start_time = datetime.utcnow()
        
        try:
            # Connect to database
            await self.connect_database()
            
            # Run enhanced generation steps
            steps = [
                ("Cleanup existing data", self.cleanup_existing_data),
                ("Create enhanced users", self.create_enhanced_users),
                ("Create enhanced teams", self.create_enhanced_teams),
                ("Create enhanced projects", self.create_enhanced_projects),
                ("Create enhanced tasks", self.create_enhanced_tasks),
                ("Create enhanced comments and files", self.create_comments_and_files),
                ("Update organization statistics", self.update_organization_stats)
            ]
            
            success_count = 0
            for step_name, step_function in steps:
                print(f"\n🔄 {step_name}...")
                if await step_function():
                    success_count += 1
                else:
                    print(f"⚠️ {step_name} had issues but continuing...")
            
            # Generate comprehensive report
            report = await self.generate_completion_report()
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            print(f"\n⏱️ Enhanced generation completed in {duration:.2f} seconds")
            print(f"✅ Success rate: {success_count}/{len(steps)} steps completed")
            
            return report is not None
            
        except Exception as e:
            print(f"❌ Enhanced demo data generation failed: {e}")
            return False

if __name__ == "__main__":
    generator = EnhancedAnalyticsDemoGenerator()
    success = asyncio.run(generator.run_enhanced_generation())
    sys.exit(0 if success else 1)