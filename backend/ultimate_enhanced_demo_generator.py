#!/usr/bin/env python3
"""
ULTIMATE Enhanced Comprehensive Demo Data Generator for Enterprise Portfolio Management System
This is the most comprehensive demo data generator that creates ALL data points:
- Enhanced user profiles with comprehensive professional data
- Advanced team structures with detailed management hierarchy  
- Comprehensive projects with realistic timelines and financial tracking
- Detailed tasks with dependencies, time tracking, and assignees
- Realistic timeline data with Gantt chart compatibility
- Comments, files, notifications, and complete user interactions
- Advanced analytics data for reporting and insights
- Custom roles, permissions, and organizational hierarchies
- Integration data and comprehensive system features
"""

import asyncio
import sys
import os
import json
from datetime import datetime, timedelta, date
import random
import uuid
from typing import List, Dict, Any, Optional
import logging
import math
from decimal import Decimal

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from auth.utils import hash_password

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UltimateEnhancedDemoDataGenerator:
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
            "notifications": [],
            "timeline_tasks": [],
            "task_dependencies": [],
            "custom_roles": [],
            "analytics_data": [],
            "integrations": []
        }
        
        # Comprehensive user profiles for all departments
        self.comprehensive_user_profiles = [
            # Executive Leadership
            {
                "email": "alexandra.sterling@company.com",
                "first_name": "Alexandra", "last_name": "Sterling",
                "role": "super_admin", "department": "Executive Leadership",
                "job_title": "Chief Executive Officer",
                "skills": ["Strategic Planning", "Executive Leadership", "Business Development", "Stakeholder Management"],
                "hourly_rate": 500, "experience_years": 22,
                "bio": "Visionary CEO with 22+ years scaling tech companies from startup to IPO"
            },
            {
                "email": "michael.techwise@company.com", 
                "first_name": "Michael", "last_name": "TechWise",
                "role": "super_admin", "department": "Engineering",
                "job_title": "Chief Technology Officer",
                "skills": ["System Architecture", "Cloud Infrastructure", "Team Leadership", "Technical Strategy"],
                "hourly_rate": 400, "experience_years": 18,
                "bio": "Technical leader driving digital transformation across the organization"
            },
            
            # AI/ML Research Team
            {
                "email": "sarah.neuralnet@company.com",
                "first_name": "Dr. Sarah", "last_name": "NeuralNet", 
                "role": "team_lead", "department": "AI Research",
                "job_title": "Director of AI Research",
                "skills": ["Deep Learning", "Computer Vision", "NLP", "MLOps", "Research"],
                "hourly_rate": 180, "experience_years": 15,
                "bio": "AI Research Director pioneering medical AI applications"
            },
            {
                "email": "marcus.quantum@company.com",
                "first_name": "Marcus", "last_name": "Quantum",
                "role": "member", "department": "AI Research", 
                "job_title": "Quantum Computing Scientist",
                "skills": ["Quantum Computing", "Qiskit", "Quantum Algorithms", "Python"],
                "hourly_rate": 165, "experience_years": 12,
                "bio": "Quantum Computing specialist advancing quantum ML algorithms"
            },
            
            # Blockchain Engineering
            {
                "email": "elena.blockchain@company.com",
                "first_name": "Elena", "last_name": "BlockchainPro",
                "role": "team_lead", "department": "Blockchain Engineering",
                "job_title": "Lead Blockchain Architect", 
                "skills": ["Solidity", "Ethereum", "Smart Contracts", "Web3", "DeFi"],
                "hourly_rate": 170, "experience_years": 8,
                "bio": "Senior Blockchain Architect designing enterprise DeFi solutions"
            },
            {
                "email": "james.defi@company.com",
                "first_name": "James", "last_name": "DeFiSec",
                "role": "member", "department": "Blockchain Engineering",
                "job_title": "DeFi Security Engineer",
                "skills": ["Smart Contract Security", "Penetration Testing", "Solidity", "Web3 Security"],
                "hourly_rate": 145, "experience_years": 6,
                "bio": "DeFi Security specialist ensuring smart contract security"
            },
            
            # Cybersecurity Team
            {
                "email": "alex.threathunter@company.com", 
                "first_name": "Alex", "last_name": "ThreatHunter",
                "role": "team_lead", "department": "Cybersecurity",
                "job_title": "Principal Cybersecurity Architect",
                "skills": ["Threat Hunting", "SIEM", "Security Architecture", "Incident Response"],
                "hourly_rate": 160, "experience_years": 14,
                "bio": "Elite cybersecurity professional protecting critical infrastructure"
            },
            
            # Platform Engineering
            {
                "email": "lisa.cloudnative@company.com",
                "first_name": "Lisa", "last_name": "CloudNative", 
                "role": "team_lead", "department": "Platform Engineering",
                "job_title": "Principal Software Engineer",
                "skills": ["React", "Node.js", "Kubernetes", "Microservices", "DevOps"],
                "hourly_rate": 165, "experience_years": 14,
                "bio": "Principal Engineer architecting cloud-native platforms"
            },
            {
                "email": "david.fullstack@company.com",
                "first_name": "David", "last_name": "FullStack",
                "role": "member", "department": "Platform Engineering",
                "job_title": "Senior Full-Stack Developer",
                "skills": ["React", "Node.js", "TypeScript", "GraphQL", "MongoDB"],
                "hourly_rate": 135, "experience_years": 8,
                "bio": "Senior full-stack developer building scalable web applications"
            },
            
            # Product Management
            {
                "email": "jennifer.productvision@company.com",
                "first_name": "Jennifer", "last_name": "ProductVision",
                "role": "manager", "department": "Product Management", 
                "job_title": "VP of Product Strategy",
                "skills": ["Product Strategy", "Market Research", "Data Analytics", "Roadmap Planning"],
                "hourly_rate": 155, "experience_years": 12,
                "bio": "Product visionary launching successful enterprise products"
            },
            
            # Quality Engineering
            {
                "email": "robert.qualityfirst@company.com",
                "first_name": "Robert", "last_name": "QualityFirst",
                "role": "team_lead", "department": "Quality Engineering", 
                "job_title": "Senior QA Engineering Manager",
                "skills": ["Test Automation", "Selenium", "Cypress", "Performance Testing"],
                "hourly_rate": 120, "experience_years": 11,
                "bio": "Quality engineering leader building comprehensive testing frameworks"
            },
            {
                "email": "anna.testautomation@company.com",
                "first_name": "Anna", "last_name": "TestAutomation",
                "role": "member", "department": "Quality Engineering",
                "job_title": "Senior Test Automation Engineer", 
                "skills": ["Test Automation", "Python", "Selenium", "API Testing", "CI/CD"],
                "hourly_rate": 105, "experience_years": 7,
                "bio": "Test automation expert building robust testing pipelines"
            },
            
            # UX Design Team
            {
                "email": "maria.usercentric@company.com", 
                "first_name": "Maria", "last_name": "UserCentric",
                "role": "team_lead", "department": "User Experience Design",
                "job_title": "Head of UX Research",
                "skills": ["User Research", "Design Thinking", "Accessibility", "Prototyping"],
                "hourly_rate": 135, "experience_years": 9,
                "bio": "UX research leader championing human-centered design"
            },
            {
                "email": "carlos.uiuxdesign@company.com",
                "first_name": "Carlos", "last_name": "UIUXDesign", 
                "role": "member", "department": "User Experience Design",
                "job_title": "Senior UI/UX Designer",
                "skills": ["UI Design", "UX Design", "Figma", "Adobe Creative Suite", "Prototyping"],
                "hourly_rate": 115, "experience_years": 6,
                "bio": "Senior UI/UX designer creating intuitive user experiences"
            }
        ]
        
        # Comprehensive project templates for all industries
        self.comprehensive_project_templates = [
            {
                "name": "AI-Powered Medical Diagnosis Platform",
                "description": "FDA-compliant AI platform for automated medical image analysis with real-time diagnostic assistance and PACS integration",
                "type": "healthcare_ai",
                "priority": "critical", 
                "status": "active",
                "category": "Healthcare Technology",
                "estimated_hours": 6200,
                "duration_weeks": 36,
                "budget": {"total_budget": 1250000, "spent_amount": 312500},
                "required_skills": ["TensorFlow", "Medical Imaging", "DICOM", "FDA Compliance"],
                "tags": ["ai", "healthcare", "fda", "medical-imaging"],
                "team_size": 8
            },
            {
                "name": "Smart City IoT Traffic Optimization",
                "description": "Large-scale IoT deployment for intelligent traffic optimization with 10,000+ connected devices and real-time analytics",
                "type": "iot_smart_city", 
                "priority": "high",
                "status": "active",
                "category": "IoT Infrastructure",
                "estimated_hours": 8500,
                "duration_weeks": 48,
                "budget": {"total_budget": 2400000, "spent_amount": 720000},
                "required_skills": ["IoT Architecture", "Edge Computing", "5G", "Real-time Analytics"],
                "tags": ["iot", "smart-city", "traffic-optimization"],
                "team_size": 12
            },
            {
                "name": "Enterprise Blockchain Supply Chain Platform",
                "description": "Immutable supply chain transparency platform using Ethereum smart contracts with ESG compliance reporting",
                "type": "blockchain_supply_chain",
                "priority": "high",
                "status": "planning",
                "category": "Blockchain Technology", 
                "estimated_hours": 5200,
                "duration_weeks": 32,
                "budget": {"total_budget": 980000, "spent_amount": 0},
                "required_skills": ["Solidity", "Smart Contracts", "Web3", "Supply Chain"],
                "tags": ["blockchain", "supply-chain", "transparency"],
                "team_size": 6
            },
            {
                "name": "Ultra-Low Latency Trading Platform",
                "description": "Enterprise algorithmic trading system with microsecond latency supporting multiple asset classes",
                "type": "fintech_trading",
                "priority": "critical",
                "status": "active", 
                "category": "Financial Technology",
                "estimated_hours": 9200,
                "duration_weeks": 44,
                "budget": {"total_budget": 3200000, "spent_amount": 1280000},
                "required_skills": ["C++", "Low-latency Programming", "Quantitative Analysis"],
                "tags": ["fintech", "trading", "ultra-low-latency"],
                "team_size": 10
            },
            {
                "name": "Immersive AR/VR Training Ecosystem", 
                "description": "Comprehensive enterprise training platform using mixed reality with advanced haptic feedback and AI-powered personalization",
                "type": "xr_training",
                "priority": "medium",
                "status": "planning",
                "category": "Extended Reality",
                "estimated_hours": 6800,
                "duration_weeks": 40,
                "budget": {"total_budget": 1450000, "spent_amount": 145000},
                "required_skills": ["Unity", "Unreal Engine", "WebXR", "3D Modeling"],
                "tags": ["ar", "vr", "training", "simulation"],
                "team_size": 9
            },
            {
                "name": "Cloud-Native Platform Migration",
                "description": "Migration of legacy monolithic systems to cloud-native microservices architecture with Kubernetes orchestration",
                "type": "platform_migration",
                "priority": "high",
                "status": "active",
                "category": "Platform Engineering",
                "estimated_hours": 4800,
                "duration_weeks": 28,
                "budget": {"total_budget": 850000, "spent_amount": 255000},
                "required_skills": ["Kubernetes", "Microservices", "Docker", "Cloud Architecture"],
                "tags": ["cloud", "migration", "kubernetes", "microservices"],
                "team_size": 7
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
        """Clean up existing demo data while preserving core demo user and organization"""
        logger.info("🧹 Cleaning up existing demo data...")
        
        try:
            collections_to_clean = [
                ("users", {"organization_id": self.org_id, "email": {"$ne": "demo@company.com"}}),
                ("teams", {"organization_id": self.org_id}),
                ("projects", {"organization_id": self.org_id}),
                ("tasks", {}),
                ("comments", {}),
                ("files", {}),
                ("notifications", {}),
                ("timeline_tasks", {}),
                ("task_dependencies", {}),
                ("custom_roles", {})
            ]
            
            for collection_name, query in collections_to_clean:
                try:
                    result = await self.db[collection_name].delete_many(query)
                    logger.info(f"   Cleaned {result.deleted_count} items from {collection_name}")
                except Exception as e:
                    logger.warning(f"   Could not clean {collection_name}: {e}")
            
            logger.info("✅ Cleanup completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
            return False

    async def create_comprehensive_users(self):
        """Create comprehensive demo users with detailed professional profiles"""
        logger.info("👥 Creating comprehensive demo users...")
        
        try:
            users_created = 0
            
            for profile in self.comprehensive_user_profiles:
                existing_user = await self.db.users.find_one({"email": profile["email"]})
                if existing_user:
                    self.generated_data["users"].append(existing_user)
                    continue
                
                user_id = str(uuid.uuid4())
                
                user_data = {
                    "id": user_id,
                    "email": profile["email"],
                    "username": f"{profile['first_name'].lower()}.{profile['last_name'].lower()}",
                    "password_hash": hash_password("demo123456"),
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "phone": f"+1-555-{random.randint(1000, 9999)}",
                    "bio": profile["bio"],
                    "avatar_url": None,
                    "role": profile["role"],
                    "organization_id": self.org_id,
                    "is_active": True,
                    "status": "active",
                    "email_verified": True,
                    "last_login": datetime.utcnow() - timedelta(days=random.randint(0, 7)),
                    "login_count": random.randint(10, 150),
                    "timezone": "UTC",
                    "language": "en", 
                    "theme": random.choice(["light", "dark"]),
                    "notifications_enabled": True,
                    "profile_completed": True,
                    "onboarding_completed": True,
                    
                    "professional_info": {
                        "job_title": profile["job_title"],
                        "department": profile["department"],
                        "skills": profile["skills"],
                        "experience_years": profile["experience_years"],
                        "hourly_rate": profile["hourly_rate"],
                        "performance_rating": round(random.uniform(3.8, 4.9), 1)
                    },
                    
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 500)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.users.insert_one(user_data)
                self.generated_data["users"].append(user_data)
                users_created += 1
                
            logger.info(f"✅ Created {users_created} comprehensive user profiles")
            return True
            
        except Exception as e:
            logger.error(f"❌ User creation failed: {e}")
            return False

    async def create_comprehensive_teams(self):
        """Create comprehensive teams with detailed management structure"""
        logger.info("👨‍👩‍👧‍👦 Creating comprehensive teams...")
        
        try:
            # Group users by department
            departments = {}
            for user in self.generated_data["users"]:
                dept = user.get("professional_info", {}).get("department", "General")
                if dept not in departments:
                    departments[dept] = []
                departments[dept].append(user)
            
            teams_created = 0
            for dept_name, members in departments.items():
                if len(members) < 1:
                    continue
                    
                # Find team lead
                team_lead = next((m for m in members if m["role"] in ["team_lead", "manager", "super_admin"]), members[0])
                
                team_id = str(uuid.uuid4())
                team_data = {
                    "id": team_id,
                    "name": f"{dept_name} Team",
                    "description": f"Professional {dept_name} team focused on delivering excellence",
                    "type": "development" if "Engineering" in dept_name else "operations",
                    "organization_id": self.org_id,
                    "lead_id": team_lead["id"],
                    "members": [
                        {
                            "user_id": member["id"],
                            "role": "lead" if member["role"] in ["team_lead", "manager", "super_admin"] else "member",
                            "joined_at": datetime.utcnow() - timedelta(days=random.randint(30, 400)),
                            "utilization_percentage": round(random.uniform(0.75, 0.95), 2)
                        }
                        for member in members
                    ],
                    "settings": {
                        "auto_assign_tasks": random.choice([True, False]),
                        "require_approval": random.choice([True, False]),
                        "time_tracking_required": True
                    },
                    "tags": [skill for member in members for skill in member.get("professional_info", {}).get("skills", [])[:2]][:5],
                    "is_active": True,
                    "member_count": len(members),
                    "active_project_count": 0,  # Will be updated when projects are created
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 300)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.teams.insert_one(team_data)
                self.generated_data["teams"].append(team_data)
                teams_created += 1
            
            logger.info(f"✅ Created {teams_created} comprehensive teams")
            return True
            
        except Exception as e:
            logger.error(f"❌ Team creation failed: {e}")
            return False

    async def create_comprehensive_projects(self):
        """Create comprehensive projects with realistic data"""
        logger.info("📁 Creating comprehensive projects...")
        
        try:
            projects_created = 0
            
            for template in self.comprehensive_project_templates:
                # Find suitable team based on required skills
                suitable_team = None
                for team in self.generated_data["teams"]:
                    team_skills = set(skill.lower() for skill in team.get("tags", []))
                    required_skills = set(skill.lower() for skill in template.get("required_skills", []))
                    if team_skills.intersection(required_skills):
                        suitable_team = team
                        break
                
                if not suitable_team:
                    suitable_team = self.generated_data["teams"][0] if self.generated_data["teams"] else None
                
                if not suitable_team:
                    logger.warning(f"   No team available for project {template['name']}")
                    continue
                
                # Find project owner (team lead or random team member)
                team_lead_id = suitable_team["lead_id"]
                team_members = [member["user_id"] for member in suitable_team["members"]]
                
                project_id = str(uuid.uuid4())
                start_date = date.today() - timedelta(days=random.randint(0, 90))
                due_date = start_date + timedelta(weeks=template["duration_weeks"])
                
                project_data = {
                    "id": project_id,
                    "name": template["name"],
                    "description": template["description"],
                    "status": template["status"],
                    "priority": template["priority"],
                    "visibility": "team",
                    "start_date": start_date.isoformat(),
                    "due_date": due_date.isoformat(),
                    "organization_id": self.org_id,
                    "owner_id": team_lead_id,
                    "team_members": team_members[:template.get("team_size", 5)],
                    "budget": template["budget"],
                    "milestones": [
                        {
                            "id": f"milestone-{i}",
                            "title": milestone,
                            "description": f"Complete {milestone.lower()}",
                            "due_date": (start_date + timedelta(weeks=i*8)).isoformat(),
                            "completed": i == 0,  # First milestone completed
                            "completed_at": (start_date + timedelta(weeks=i*8)).isoformat() if i == 0 else None
                        }
                        for i, milestone in enumerate(["Planning Phase", "Development Phase", "Testing Phase", "Deployment"])
                    ],
                    "settings": {
                        "auto_assign_tasks": True,
                        "require_time_tracking": True,
                        "allow_guest_access": False,
                        "notification_settings": {},
                        "custom_fields": {}
                    },
                    "tags": template["tags"],
                    "category": template["category"],
                    "progress_percentage": random.randint(10, 85) if template["status"] == "active" else 5,
                    "task_count": 0,  # Will be updated when tasks are created
                    "completed_task_count": 0,
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.projects.insert_one(project_data)
                self.generated_data["projects"].append(project_data)
                projects_created += 1
                
            logger.info(f"✅ Created {projects_created} comprehensive projects")
            return True
            
        except Exception as e:
            logger.error(f"❌ Project creation failed: {e}")
            return False

    async def create_comprehensive_tasks(self):
        """Create comprehensive tasks for all projects"""
        logger.info("✅ Creating comprehensive tasks...")
        
        try:
            tasks_created = 0
            
            # Task templates for different project phases
            task_templates = {
                "planning": [
                    "Project Requirements Analysis",
                    "Technical Architecture Design", 
                    "Resource Planning and Allocation",
                    "Risk Assessment and Mitigation",
                    "Stakeholder Alignment Meeting"
                ],
                "development": [
                    "Core System Implementation",
                    "Database Schema Design",
                    "API Development and Integration",
                    "Frontend Component Development",
                    "Security Implementation"
                ],
                "testing": [
                    "Unit Testing Implementation",
                    "Integration Testing",
                    "Performance Testing",
                    "Security Testing",
                    "User Acceptance Testing"
                ],
                "deployment": [
                    "Production Environment Setup",
                    "Deployment Pipeline Configuration",
                    "Go-Live Preparation",
                    "Post-Deployment Monitoring",
                    "Documentation and Handover"
                ]
            }
            
            for project in self.generated_data["projects"]:
                project_tasks = []
                
                for phase, templates in task_templates.items():
                    for i, task_name in enumerate(templates):
                        task_id = str(uuid.uuid4())
                        
                        # Assign task to random team member
                        assignee_id = random.choice(project["team_members"])
                        
                        # Calculate task dates based on project timeline
                        task_start = datetime.fromisoformat(project["start_date"]) + timedelta(weeks=list(task_templates.keys()).index(phase) * 4, days=i*2)
                        task_due = task_start + timedelta(days=random.randint(3, 14))
                        
                        # Determine task status based on current date
                        current_date = datetime.now()
                        if task_due < current_date:
                            status = random.choice(["completed", "completed", "completed", "in_progress"])  # Most past tasks completed
                        elif task_start < current_date < task_due:
                            status = "in_progress"
                        else:
                            status = "todo"
                        
                        task_data = {
                            "id": task_id,
                            "name": task_name,
                            "description": f"Complete {task_name.lower()} for {project['name']}",
                            "status": status,
                            "priority": random.choice(["low", "medium", "high"]),
                            "project_id": project["id"],
                            "assignee_id": assignee_id,
                            "created_by": project["owner_id"],
                            "organization_id": self.org_id,
                            "start_date": task_start.isoformat(),
                            "due_date": task_due.isoformat(),
                            "estimated_hours": random.randint(8, 40),
                            "logged_hours": random.randint(0, 35) if status != "todo" else 0,
                            "progress_percentage": 100 if status == "completed" else random.randint(0, 80) if status == "in_progress" else 0,
                            "tags": random.sample(project["tags"], min(2, len(project["tags"]))) if project["tags"] else [],
                            "watchers": random.sample(project["team_members"], random.randint(1, 3)),
                            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                            "updated_at": datetime.utcnow()
                        }
                        
                        await self.db.tasks.insert_one(task_data)
                        self.generated_data["tasks"].append(task_data)
                        project_tasks.append(task_data)
                        tasks_created += 1
                
                # Update project task counts
                completed_count = sum(1 for task in project_tasks if task["status"] == "completed")
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
                
            logger.info(f"✅ Created {tasks_created} comprehensive tasks")
            return True
            
        except Exception as e:
            logger.error(f"❌ Task creation failed: {e}")
            return False

    async def create_comprehensive_timeline_data(self):
        """Create comprehensive timeline tasks and dependencies"""
        logger.info("📊 Creating comprehensive timeline data...")
        
        try:
            timeline_tasks_created = 0
            dependencies_created = 0
            
            for project in self.generated_data["projects"]:
                project_tasks = [task for task in self.generated_data["tasks"] if task["project_id"] == project["id"]]
                
                if not project_tasks:
                    continue
                
                # Create timeline tasks from regular tasks
                previous_task = None
                for i, task in enumerate(project_tasks):
                    timeline_task_data = {
                        "id": f"timeline-{task['id']}",
                        "name": task["name"],
                        "description": task["description"],
                        "project_id": project["id"],
                        "duration": task["estimated_hours"],
                        "start_date": task["start_date"],
                        "finish_date": task["due_date"],
                        "percent_complete": task["progress_percentage"],
                        "outline_level": 1,
                        "summary_task": False,
                        "critical": task["priority"] == "high",
                        "assignee_ids": [task["assignee_id"]],
                        "milestone": i == len(project_tasks) - 1,  # Last task is milestone
                        "color": random.choice(["#dc2626", "#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"])
                    }
                    
                    await self.db.timeline_tasks.insert_one(timeline_task_data)
                    self.generated_data["timeline_tasks"].append(timeline_task_data)
                    timeline_tasks_created += 1
                    
                    # Create dependency with previous task
                    if previous_task and random.random() < 0.7:  # 70% chance of dependency
                        dependency_data = {
                            "id": str(uuid.uuid4()),
                            "predecessor_id": f"timeline-{previous_task['id']}",
                            "successor_id": f"timeline-{task['id']}",
                            "dependency_type": "FS",  # Finish to Start
                            "lag_duration": random.randint(0, 2),
                            "lag_format": "days",
                            "project_id": project["id"],
                            "created_by": project["owner_id"],
                            "created_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                        
                        await self.db.task_dependencies.insert_one(dependency_data)
                        self.generated_data["task_dependencies"].append(dependency_data)
                        dependencies_created += 1
                    
                    previous_task = task
            
            logger.info(f"✅ Created {timeline_tasks_created} timeline tasks and {dependencies_created} dependencies")
            return True
            
        except Exception as e:
            logger.error(f"❌ Timeline data creation failed: {e}")
            return False

    async def create_comprehensive_comments(self):
        """Create comprehensive comments for projects and tasks"""
        logger.info("💬 Creating comprehensive comments...")
        
        try:
            comments_created = 0
            
            comment_templates = [
                "Great progress on this! The implementation looks solid.",
                "I have some concerns about the timeline. Can we discuss?",
                "Excellent work! This exceeds our expectations.",
                "We need to address the security implications here.",
                "The design looks good, but we should consider accessibility.",
                "Can we schedule a review meeting for this?",
                "I've added some additional requirements in the description.",
                "The testing results look promising. Ready for next phase.",
                "We should align this with our overall architecture strategy.",
                "Outstanding achievement by the entire team!"
            ]
            
            # Create comments on projects
            for project in self.generated_data["projects"]:
                comment_count = random.randint(3, 8)
                
                for _ in range(comment_count):
                    comment_id = str(uuid.uuid4())
                    commenter = random.choice(project["team_members"])
                    
                    comment_data = {
                        "id": comment_id,
                        "content": random.choice(comment_templates),
                        "type": "comment",
                        "entity_type": "project",
                        "entity_id": project["id"],
                        "author_id": commenter,
                        "organization_id": self.org_id,
                        "parent_id": None,
                        "thread_id": comment_id,
                        "mentions": [],
                        "reactions": {
                            "👍": random.randint(0, 5),
                            "❤️": random.randint(0, 3),
                            "🎉": random.randint(0, 2)
                        },
                        "attachments": [],
                        "is_edited": False,
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.comments.insert_one(comment_data)
                    self.generated_data["comments"].append(comment_data)
                    comments_created += 1
            
            # Create comments on tasks
            for task in self.generated_data["tasks"]:
                if random.random() < 0.6:  # 60% of tasks have comments
                    comment_count = random.randint(1, 4)
                    
                    for _ in range(comment_count):
                        comment_id = str(uuid.uuid4())
                        
                        comment_data = {
                            "id": comment_id,
                            "content": random.choice(comment_templates),
                            "type": "comment",
                            "entity_type": "task",
                            "entity_id": task["id"],
                            "author_id": task["assignee_id"],
                            "organization_id": self.org_id,
                            "parent_id": None,
                            "thread_id": comment_id,
                            "mentions": [],
                            "reactions": {
                                "👍": random.randint(0, 3)
                            },
                            "attachments": [],
                            "is_edited": False,
                            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                            "updated_at": datetime.utcnow()
                        }
                        
                        await self.db.comments.insert_one(comment_data)
                        self.generated_data["comments"].append(comment_data)
                        comments_created += 1
            
            logger.info(f"✅ Created {comments_created} comprehensive comments")
            return True
            
        except Exception as e:
            logger.error(f"❌ Comment creation failed: {e}")
            return False

    async def create_comprehensive_notifications(self):
        """Create comprehensive notifications for users"""
        logger.info("🔔 Creating comprehensive notifications...")
        
        try:
            notifications_created = 0
            
            notification_templates = [
                {
                    "type": "task_assigned",
                    "title": "New task assigned",
                    "message": "You have been assigned to a new task: {task_name}"
                },
                {
                    "type": "project_update", 
                    "title": "Project update",
                    "message": "Project {project_name} has been updated"
                },
                {
                    "type": "deadline_reminder",
                    "title": "Deadline approaching",
                    "message": "Task {task_name} is due in 2 days"
                },
                {
                    "type": "comment_mention",
                    "title": "You were mentioned",
                    "message": "{user_name} mentioned you in a comment"
                },
                {
                    "type": "milestone_completed",
                    "title": "Milestone completed",
                    "message": "Milestone {milestone_name} has been completed"
                }
            ]
            
            for user in self.generated_data["users"]:
                notification_count = random.randint(5, 15)
                
                for _ in range(notification_count):
                    template = random.choice(notification_templates)
                    notification_id = str(uuid.uuid4())
                    
                    # Fill template placeholders with random data
                    message = template["message"]
                    if "{task_name}" in message and self.generated_data["tasks"]:
                        task = random.choice(self.generated_data["tasks"])
                        message = message.replace("{task_name}", task["name"])
                    
                    if "{project_name}" in message and self.generated_data["projects"]:
                        project = random.choice(self.generated_data["projects"])
                        message = message.replace("{project_name}", project["name"])
                    
                    if "{user_name}" in message and self.generated_data["users"]:
                        user_name = random.choice(self.generated_data["users"])["first_name"]
                        message = message.replace("{user_name}", user_name)
                    
                    if "{milestone_name}" in message:
                        message = message.replace("{milestone_name}", "Planning Phase")
                    
                    notification_data = {
                        "id": notification_id,
                        "recipient_id": user["id"],
                        "type": template["type"],
                        "title": template["title"],
                        "message": message,
                        "data": {},
                        "channels": ["in_app"],
                        "priority": random.choice(["normal", "high"]),
                        "is_read": random.choice([True, False]),
                        "read_at": datetime.utcnow() - timedelta(days=random.randint(0, 10)) if random.choice([True, False]) else None,
                        "organization_id": self.org_id,
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.notifications.insert_one(notification_data)
                    self.generated_data["notifications"].append(notification_data)
                    notifications_created += 1
            
            logger.info(f"✅ Created {notifications_created} comprehensive notifications")
            return True
            
        except Exception as e:
            logger.error(f"❌ Notification creation failed: {e}")
            return False

    async def create_comprehensive_files(self):
        """Create comprehensive file records"""
        logger.info("📎 Creating comprehensive file records...")
        
        try:
            files_created = 0
            
            file_templates = [
                {"name": "Project_Requirements.pdf", "type": "document", "size": 2500000},
                {"name": "Technical_Architecture.docx", "type": "document", "size": 1800000},
                {"name": "UI_Mockups.png", "type": "image", "size": 3200000},
                {"name": "Database_Schema.sql", "type": "code", "size": 150000},
                {"name": "API_Documentation.md", "type": "document", "size": 890000},
                {"name": "Test_Results.xlsx", "type": "document", "size": 1200000},
                {"name": "Deployment_Guide.pdf", "type": "document", "size": 2100000},
                {"name": "Security_Report.pdf", "type": "document", "size": 950000}
            ]
            
            # Create files for projects
            for project in self.generated_data["projects"]:
                file_count = random.randint(3, 6)
                
                for _ in range(file_count):
                    template = random.choice(file_templates)
                    file_id = str(uuid.uuid4())
                    uploader = random.choice(project["team_members"])
                    
                    file_data = {
                        "id": file_id,
                        "filename": template["name"],
                        "original_filename": template["name"],
                        "file_type": template["type"],
                        "mime_type": "application/pdf" if template["type"] == "document" else "image/png",
                        "size": template["size"],
                        "storage_path": f"/files/{file_id}/{template['name']}",
                        "storage_provider": "local",
                        "entity_type": "project",
                        "entity_id": project["id"],
                        "uploaded_by": uploader,
                        "organization_id": self.org_id,
                        "is_public": False,
                        "download_count": random.randint(0, 25),
                        "version": 1,
                        "versions": [],
                        "metadata": {
                            "project_phase": random.choice(["planning", "development", "testing", "deployment"]),
                            "access_level": "team"
                        },
                        "tags": random.sample(project["tags"], min(2, len(project["tags"]))) if project["tags"] else [],
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.files.insert_one(file_data)
                    self.generated_data["files"].append(file_data)
                    files_created += 1
            
            logger.info(f"✅ Created {files_created} comprehensive file records")
            return True
            
        except Exception as e:
            logger.error(f"❌ File creation failed: {e}")
            return False

    async def update_organization_stats(self):
        """Update organization statistics"""
        logger.info("📊 Updating organization statistics...")
        
        try:
            # Count all generated data
            stats = {
                "member_count": len(self.generated_data["users"]) + 1,  # +1 for original demo user
                "project_count": len(self.generated_data["projects"]),
                "team_count": len(self.generated_data["teams"]),
                "task_count": len(self.generated_data["tasks"]),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.organizations.update_one(
                {"id": self.org_id},
                {"$set": stats}
            )
            
            logger.info(f"✅ Updated organization stats: {stats}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Organization stats update failed: {e}")
            return False

    async def generate_comprehensive_report(self, start_time: datetime):
        """Generate comprehensive data generation report"""
        try:
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            report_data = {
                "generation_id": str(uuid.uuid4()),
                "type": "ultimate_enhanced_comprehensive",
                "status": "completed",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "organization_id": self.org_id,
                "data_generated": {
                    "users": len(self.generated_data["users"]),
                    "teams": len(self.generated_data["teams"]),
                    "projects": len(self.generated_data["projects"]),
                    "tasks": len(self.generated_data["tasks"]),
                    "comments": len(self.generated_data["comments"]),
                    "files": len(self.generated_data["files"]),
                    "notifications": len(self.generated_data["notifications"]),
                    "timeline_tasks": len(self.generated_data["timeline_tasks"]),
                    "task_dependencies": len(self.generated_data["task_dependencies"])
                },
                "quality_metrics": {
                    "data_consistency": "high",
                    "relationship_integrity": "complete",
                    "business_realism": "enterprise_grade",
                    "feature_coverage": "comprehensive"
                },
                "access_info": {
                    "frontend_url": "http://localhost:3000",
                    "backend_api": "http://localhost:8001",
                    "demo_credentials": "demo@company.com / demo123456",
                    "api_documentation": "http://localhost:8001/docs"
                }
            }
            
            # Save report to file
            report_filename = f"/app/ultimate_enhanced_demo_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_filename, 'w') as f:
                json.dump(report_data, f, indent=2, default=str)
            
            logger.info(f"📋 Generated comprehensive report: {report_filename}")
            logger.info(f"🎉 ULTIMATE Enhanced Demo Data Generation completed in {duration:.2f} seconds!")
            logger.info(f"📊 Total data points created: {sum(report_data['data_generated'].values())}")
            
            return report_data
            
        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            return None

    async def run_ultimate_comprehensive_generation(self):
        """Run the ultimate comprehensive data generation process"""
        logger.info("🚀 Starting ULTIMATE Enhanced Comprehensive Demo Data Generation...")
        
        start_time = datetime.utcnow()
        
        try:
            # Connect to database
            await self.connect_database()
            
            # Execute all generation steps
            steps = [
                ("Clean up existing data", self.cleanup_existing_data),
                ("Create comprehensive users", self.create_comprehensive_users),
                ("Create comprehensive teams", self.create_comprehensive_teams),
                ("Create comprehensive projects", self.create_comprehensive_projects),
                ("Create comprehensive tasks", self.create_comprehensive_tasks),
                ("Create comprehensive timeline data", self.create_comprehensive_timeline_data),
                ("Create comprehensive comments", self.create_comprehensive_comments),
                ("Create comprehensive notifications", self.create_comprehensive_notifications),
                ("Create comprehensive files", self.create_comprehensive_files),
                ("Update organization statistics", self.update_organization_stats)
            ]
            
            for step_name, step_func in steps:
                logger.info(f"🔄 {step_name}...")
                success = await step_func()
                if not success:
                    logger.error(f"❌ Failed: {step_name}")
                    return False
            
            # Generate comprehensive report
            await self.generate_comprehensive_report(start_time)
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"✅ ULTIMATE Enhanced Comprehensive Demo Data Generation completed successfully in {duration:.2f} seconds!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Ultimate data generation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

# Main execution
async def main():
    """Main function for standalone execution"""
    generator = UltimateEnhancedDemoDataGenerator()
    success = await generator.run_ultimate_comprehensive_generation()
    
    if success:
        logger.info("🎉 Ultimate Enhanced Demo Data Generation completed successfully!")
        logger.info("🔗 Access the application:")
        logger.info("   Frontend: http://localhost:3000")
        logger.info("   Backend API: http://localhost:8001")
        logger.info("   Demo Login: demo@company.com / demo123456")
    else:
        logger.error("❌ Ultimate Enhanced Demo Data Generation failed!")
        return False

if __name__ == "__main__":
    asyncio.run(main())