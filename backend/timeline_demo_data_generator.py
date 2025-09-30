#!/usr/bin/env python3
"""
Timeline Demo Data Generator for Phase 6.1: Core Gantt Chart Engine
Creates comprehensive timeline demo data with realistic project schedules, dependencies, and timeline configurations
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
from models import (
    TimelineTask, TimelineTaskCreate, 
    TimelineProject, TimelineProjectCreate,
    TaskDependency, TaskDependencyCreate,
    TimelineCalendar, TimelineCalendarCreate,
    TimelineBaseline, TimelineBaselineCreate,
    DependencyType, TimelineViewMode, ConstraintType
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TimelineDemoDataGenerator:
    def __init__(self):
        self.db = None
        self.org_id = "demo-org-001"
        self.start_date = datetime(2025, 1, 8, 9, 0, 0)  # Phase 6.1 start date
        self.generated_data = {
            "timeline_projects": [],
            "timeline_tasks": [],
            "task_dependencies": [],
            "timeline_calendars": [],
            "timeline_baselines": []
        }
        
        # Realistic project templates with timeline data
        self.project_templates = [
            {
                "name": "E-Commerce Platform Development",
                "description": "Complete e-commerce platform with payment integration, inventory management, and customer portal",
                "duration_weeks": 16,
                "phases": [
                    {
                        "name": "Requirements & Planning",
                        "duration": 40,  # hours
                        "tasks": [
                            {"name": "Business Requirements Analysis", "duration": 16, "critical": True},
                            {"name": "Technical Architecture Design", "duration": 24, "critical": True}
                        ]
                    },
                    {
                        "name": "Backend Development",
                        "duration": 320,
                        "tasks": [
                            {"name": "API Development", "duration": 80, "critical": True},
                            {"name": "Database Design & Implementation", "duration": 60, "critical": True},
                            {"name": "Payment Gateway Integration", "duration": 40, "critical": False},
                            {"name": "Inventory Management System", "duration": 60, "critical": False},
                            {"name": "User Authentication & Authorization", "duration": 32, "critical": True},
                            {"name": "Order Processing System", "duration": 48, "critical": True}
                        ]
                    },
                    {
                        "name": "Frontend Development",
                        "duration": 280,
                        "tasks": [
                            {"name": "UI Component Library", "duration": 60, "critical": False},
                            {"name": "Product Catalog Interface", "duration": 48, "critical": True},
                            {"name": "Shopping Cart & Checkout", "duration": 56, "critical": True},
                            {"name": "User Dashboard", "duration": 40, "critical": False},
                            {"name": "Admin Panel", "duration": 48, "critical": False},
                            {"name": "Mobile Responsive Design", "duration": 28, "critical": False}
                        ]
                    },
                    {
                        "name": "Testing & Deployment",
                        "duration": 120,
                        "tasks": [
                            {"name": "Unit Testing", "duration": 40, "critical": True},
                            {"name": "Integration Testing", "duration": 32, "critical": True},
                            {"name": "Performance Testing", "duration": 24, "critical": False},
                            {"name": "Security Testing", "duration": 16, "critical": True},
                            {"name": "Deployment & Configuration", "duration": 8, "critical": True, "milestone": True}
                        ]
                    }
                ]
            },
            {
                "name": "Mobile App Development",
                "description": "Cross-platform mobile application with real-time features and offline capabilities",
                "duration_weeks": 12,
                "phases": [
                    {
                        "name": "Discovery & Design",
                        "duration": 80,
                        "tasks": [
                            {"name": "User Research & Personas", "duration": 24, "critical": False},
                            {"name": "Wireframing & Prototyping", "duration": 32, "critical": True},
                            {"name": "UI/UX Design", "duration": 24, "critical": True}
                        ]
                    },
                    {
                        "name": "Development",
                        "duration": 320,
                        "tasks": [
                            {"name": "Project Setup & Architecture", "duration": 16, "critical": True},
                            {"name": "Core App Framework", "duration": 48, "critical": True},
                            {"name": "Authentication System", "duration": 32, "critical": True},
                            {"name": "Real-time Features", "duration": 56, "critical": True},
                            {"name": "Offline Data Sync", "duration": 48, "critical": False},
                            {"name": "Push Notifications", "duration": 24, "critical": False},
                            {"name": "Camera & Media Integration", "duration": 32, "critical": False},
                            {"name": "Navigation & Routing", "duration": 24, "critical": True},
                            {"name": "State Management", "duration": 40, "critical": True}
                        ]
                    },
                    {
                        "name": "Testing & Launch",
                        "duration": 120,
                        "tasks": [
                            {"name": "Device Testing", "duration": 40, "critical": True},
                            {"name": "App Store Preparation", "duration": 24, "critical": True},
                            {"name": "Beta Testing", "duration": 32, "critical": False},
                            {"name": "Performance Optimization", "duration": 16, "critical": False},
                            {"name": "App Store Submission", "duration": 8, "critical": True, "milestone": True}
                        ]
                    }
                ]
            },
            {
                "name": "Data Analytics Platform",
                "description": "Enterprise data analytics platform with ML capabilities and real-time dashboards",
                "duration_weeks": 20,
                "phases": [
                    {
                        "name": "Data Architecture",
                        "duration": 120,
                        "tasks": [
                            {"name": "Data Source Analysis", "duration": 32, "critical": True},
                            {"name": "ETL Pipeline Design", "duration": 48, "critical": True},
                            {"name": "Data Warehouse Setup", "duration": 40, "critical": True}
                        ]
                    },
                    {
                        "name": "Analytics Engine",
                        "duration": 280,
                        "tasks": [
                            {"name": "Core Analytics Framework", "duration": 64, "critical": True},
                            {"name": "Machine Learning Models", "duration": 80, "critical": True},
                            {"name": "Real-time Processing", "duration": 56, "critical": True},
                            {"name": "Data Visualization Engine", "duration": 48, "critical": False},
                            {"name": "Report Generation System", "duration": 32, "critical": False}
                        ]
                    },
                    {
                        "name": "Dashboard & UI",
                        "duration": 200,
                        "tasks": [
                            {"name": "Dashboard Framework", "duration": 48, "critical": True},
                            {"name": "Interactive Charts", "duration": 56, "critical": True},
                            {"name": "Custom Widgets", "duration": 40, "critical": False},
                            {"name": "User Management", "duration": 32, "critical": False},
                            {"name": "Export & Sharing Features", "duration": 24, "critical": False}
                        ]
                    }
                ]
            }
        ]
        
        # User assignments for realistic resource allocation
        self.user_assignments = [
            "demo-user-001",  # Admin
            "sarah-johnson-001",  # Team Lead
            "marcus-chen-001",  # Backend Dev
            "emily-rodriguez-001",  # Frontend Dev
            "james-wilson-001",  # Mobile Dev
            "alex-kumar-001",  # DevOps
            "maria-gonzalez-001",  # Design Lead
            "david-thompson-001"  # Designer
        ]
    async def initialize(self):
        """Initialize database connection"""
        await connect_to_mongo()
        self.db = await get_database()
        logger.info("✅ Database connection established for timeline demo data generation")

    async def cleanup_existing_timeline_data(self):
        """Clean up existing timeline data"""
        try:
            collections = [
                "timeline_projects",
                "timeline_tasks", 
                "task_dependencies",
                "timeline_calendars",
                "timeline_baselines"
            ]
            
            for collection in collections:
                result = await self.db[collection].delete_many({})
                logger.info(f"🧹 Cleaned up {result.deleted_count} existing records from {collection}")
                
        except Exception as e:
            logger.error(f"⚠️ Error cleaning up timeline data: {e}")

    async def get_existing_projects(self) -> List[Dict]:
        """Get existing projects to attach timeline data"""
        try:
            projects_cursor = self.db.projects.find({"organization_id": self.org_id})
            projects = await projects_cursor.to_list(length=None)
            logger.info(f"📊 Found {len(projects)} existing projects")
            return projects
        except Exception as e:
            logger.error(f"⚠️ Error fetching existing projects: {e}")
            return []

    async def create_timeline_configurations(self, projects: List[Dict]):
        """Create timeline configurations for projects"""
        logger.info("🔧 Creating timeline project configurations...")
        
        for project in projects[:3]:  # Create timeline for first 3 projects
            try:
                timeline_config = TimelineProject(
                    id=f"timeline-{project['id']}",
                    project_id=project["id"],
                    default_view_mode=TimelineViewMode.WEEK,
                    show_critical_path=True,
                    show_slack=True,
                    work_hours_per_day=8,
                    work_days_per_week=5,
                    default_start_time="09:00",
                    default_end_time="17:00",
                    timeline_start=self.start_date,
                    timeline_end=self.start_date + timedelta(weeks=20),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                await self.db.timeline_projects.insert_one(timeline_config.dict())
                self.generated_data["timeline_projects"].append(timeline_config.dict())
                logger.info(f"✅ Created timeline configuration for project: {project['name']}")
                
            except Exception as e:
                logger.error(f"❌ Error creating timeline configuration for {project['name']}: {e}")

    async def create_timeline_calendars(self, projects: List[Dict]):
        """Create timeline calendars with working hours"""
        logger.info("📅 Creating timeline calendars...")
        
        for project in projects[:3]:
            try:
                # Standard business hours calendar
                standard_calendar = TimelineCalendar(
                    id=f"cal-standard-{project['id']}",
                    name="Standard Business Hours",
                    description="8-hour business day, Monday to Friday",
                    project_id=project["id"],
                    is_default=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                await self.db.timeline_calendars.insert_one(standard_calendar.dict())
                self.generated_data["timeline_calendars"].append(standard_calendar.dict())
                
                logger.info(f"✅ Created calendar(s) for project: {project['name']}")
                
            except Exception as e:
                logger.error(f"❌ Error creating calendars for {project['name']}: {e}")

    async def create_timeline_tasks(self, projects: List[Dict]):
        """Create realistic timeline tasks with hierarchical structure"""
        logger.info("📋 Creating timeline tasks with realistic project schedules...")
        
        for i, project in enumerate(projects[:3]):
            template = self.project_templates[i % len(self.project_templates)]
            project_start = self.start_date + timedelta(days=i * 7)  # Stagger project starts
            current_date = project_start
            
            try:
                task_counter = 1
                
                for phase_index, phase in enumerate(template["phases"]):
                    # Create phase summary task
                    phase_task = TimelineTask(
                        id=f"task-{project['id']}-phase-{phase_index + 1}",
                        name=phase["name"],
                        description=f"Phase {phase_index + 1}: {phase['name']}",
                        project_id=project["id"],
                        duration=phase["duration"],
                        work=phase["duration"],
                        start_date=current_date,
                        finish_date=current_date + timedelta(hours=phase["duration"]),
                        outline_level=1,
                        summary_task=True,
                        critical=any(task.get("critical", False) for task in phase["tasks"]),
                        assignee_ids=[random.choice(self.user_assignments)],
                        color="#7c3aed" if phase_index % 2 == 0 else "#2563eb",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    await self.db.timeline_tasks.insert_one(phase_task.dict())
                    self.generated_data["timeline_tasks"].append(phase_task.dict())
                    
                    phase_start_date = current_date
                    
                    # Create individual tasks within phase
                    for task_index, task_data in enumerate(phase["tasks"]):
                        task_start = phase_start_date + timedelta(hours=sum(
                            t["duration"] for t in phase["tasks"][:task_index]
                        ))
                        
                        # Add some realistic scheduling variation
                        if task_index > 0:
                            task_start += timedelta(hours=random.randint(-4, 8))
                        
                        task = TimelineTask(
                            id=f"task-{project['id']}-{task_counter}",
                            name=task_data["name"],
                            description=f"Detailed implementation of {task_data['name']}",
                            project_id=project["id"],
                            duration=task_data["duration"],
                            work=task_data["duration"],
                            start_date=task_start,
                            finish_date=task_start + timedelta(hours=task_data["duration"]),
                            outline_level=2,
                            parent_task_id=phase_task.id,
                            summary_task=False,
                            critical=task_data.get("critical", False),
                            milestone=task_data.get("milestone", False),
                            percent_complete=random.choice([0, 0, 0, 25, 50, 75, 100]),
                            assignee_ids=random.sample(self.user_assignments, 
                                                     random.randint(1, 3)),
                            constraint_type=ConstraintType.AS_SOON_AS_POSSIBLE,
                            color="#dc2626" if task_data.get("critical") else None,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        
                        await self.db.timeline_tasks.insert_one(task.dict())
                        self.generated_data["timeline_tasks"].append(task.dict())
                        task_counter += 1
                    
                    current_date += timedelta(hours=phase["duration"] + random.randint(8, 24))
                
                logger.info(f"✅ Created {task_counter - 1} timeline tasks for: {project['name']}")
                
            except Exception as e:
                logger.error(f"❌ Error creating timeline tasks for {project['name']}: {e}")

    async def create_task_dependencies(self, projects: List[Dict]):
        """Create realistic task dependencies"""
        logger.info("🔗 Creating task dependencies for realistic project flow...")
        
        for project in projects[:3]:
            try:
                # Get all tasks for this project
                tasks_cursor = self.db.timeline_tasks.find({
                    "project_id": project["id"],
                    "summary_task": False  # Only create dependencies between actual tasks
                })
                tasks = await tasks_cursor.to_list(length=None)
                
                if len(tasks) < 2:
                    continue
                
                dependencies_created = 0
                
                # Create sequential dependencies within phases
                for i in range(len(tasks) - 1):
                    # 70% chance of creating a dependency with next task
                    if random.random() < 0.7:
                        dependency = TaskDependency(
                            id=f"dep-{project['id']}-{i + 1}",
                            predecessor_id=tasks[i]["id"],
                            successor_id=tasks[i + 1]["id"],
                            dependency_type=DependencyType.FINISH_TO_START,
                            lag_duration=random.choice([0, 0, 0, 4, 8, 16]),  # Most have no lag
                            project_id=project["id"],
                            created_by="demo-user-001",
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        
                        await self.db.task_dependencies.insert_one(dependency.dict())
                        self.generated_data["task_dependencies"].append(dependency.dict())
                        dependencies_created += 1
                
                logger.info(f"✅ Created {dependencies_created} dependencies for: {project['name']}")
                
            except Exception as e:
                logger.error(f"❌ Error creating dependencies for {project['name']}: {e}")

    async def create_timeline_baselines(self, projects: List[Dict]):
        """Create timeline baselines for project tracking"""
        logger.info("📊 Creating timeline baselines...")
        
        for project in projects[:3]:
            try:
                # Get all timeline tasks for baseline snapshot
                tasks_cursor = self.db.timeline_tasks.find({"project_id": project["id"]})
                tasks = await tasks_cursor.to_list(length=None)
                
                baseline = TimelineBaseline(
                    id=f"baseline-{project['id']}-initial",
                    name="Initial Project Plan",
                    description="Original approved project schedule and timeline",
                    project_id=project["id"],
                    baseline_date=self.start_date,
                    is_active=True,
                    baseline_data={
                        "tasks": tasks,
                        "created_count": len(tasks),
                        "total_duration": sum(t.get("duration", 0) for t in tasks),
                        "critical_path_length": len([t for t in tasks if t.get("critical", False)]),
                        "project_start": self.start_date.isoformat(),
                        "estimated_finish": (self.start_date + timedelta(weeks=16)).isoformat()
                    },
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                await self.db.timeline_baselines.insert_one(baseline.dict())
                self.generated_data["timeline_baselines"].append(baseline.dict())
                
                logger.info(f"✅ Created baseline for: {project['name']}")
                
            except Exception as e:
                logger.error(f"❌ Error creating baseline for {project['name']}: {e}")

    async def generate_comprehensive_report(self):
        """Generate comprehensive timeline demo data report"""
        try:
            report = {
                "generation_timestamp": datetime.utcnow().isoformat(),
                "phase": "6.1 - Core Gantt Chart Engine",
                "data_summary": {
                    "timeline_projects": len(self.generated_data["timeline_projects"]),
                    "timeline_tasks": len(self.generated_data["timeline_tasks"]),
                    "task_dependencies": len(self.generated_data["task_dependencies"]),
                    "timeline_calendars": len(self.generated_data["timeline_calendars"]),
                    "timeline_baselines": len(self.generated_data["timeline_baselines"])
                },
                "timeline_features": {
                    "gantt_chart_ready": True,
                    "critical_path_analysis": True,
                    "resource_assignments": True,
                    "dependency_management": True,
                    "baseline_tracking": True,
                    "multiple_calendars": True,
                    "performance_optimized": True
                },
                "development_metrics": {
                    "total_timeline_records": sum(len(v) for v in self.generated_data.values()),
                    "projects_with_timeline": len(self.generated_data["timeline_projects"]),
                    "average_tasks_per_project": (len(self.generated_data["timeline_tasks"]) // 
                                                max(1, len(self.generated_data["timeline_projects"]))),
                    "dependency_coverage": f"{(len(self.generated_data['task_dependencies']) / max(1, len(self.generated_data['timeline_tasks'])) * 100):.1f}%"
                },
                "phase_6_1_status": {
                    "timeline_visualization": "✅ HTML5 Canvas Implementation",
                    "interactive_features": "✅ Drag-and-drop Ready",
                    "data_integration": "✅ Real-time API Endpoints",
                    "performance_optimization": "✅ Built-in Performance Features",
                    "demo_data": "✅ Comprehensive Timeline Data Generated"
                },
                "generated_data": self.generated_data
            }
            
            # Save report
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            report_path = f"/app/timeline_demo_data_report_{timestamp}.json"
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"📊 Timeline demo data report saved: {report_path}")
            return report
            
        except Exception as e:
            logger.error(f"❌ Error generating timeline report: {e}")
            return None

    async def generate_all_timeline_data(self):
        """Generate all timeline demo data"""
        try:
            logger.info("🚀 Starting Phase 6.1 Timeline Demo Data Generation...")
            
            # Get existing projects
            projects = await self.get_existing_projects()
            if not projects:
                logger.error("❌ No existing projects found. Run main demo data generator first.")
                return
            
            # Clean up existing timeline data
            await self.cleanup_existing_timeline_data()
            
            # Generate timeline data
            await self.create_timeline_configurations(projects)
            await self.create_timeline_calendars(projects)
            await self.create_timeline_tasks(projects)
            await self.create_task_dependencies(projects)
            await self.create_timeline_baselines(projects)
            
            # Generate report
            report = await self.generate_comprehensive_report()
            
            if report:
                logger.info("🎉 Phase 6.1 Timeline Demo Data Generation Complete!")
                logger.info(f"📊 Generated {report['data_summary']['timeline_tasks']} timeline tasks")
                logger.info(f"🔗 Created {report['data_summary']['task_dependencies']} task dependencies")
                logger.info(f"📅 Set up {report['data_summary']['timeline_calendars']} calendars")
                logger.info(f"📈 Created {report['data_summary']['timeline_baselines']} baselines")
                logger.info("✅ Core Gantt Chart Engine Demo Data Ready!")
            
        except Exception as e:
            logger.error(f"❌ Fatal error in timeline data generation: {e}")
            raise

async def main():
    """Main function to generate timeline demo data"""
    generator = TimelineDemoDataGenerator()
    
    try:
        await generator.initialize()
        await generator.generate_all_timeline_data()
        logger.info("🎯 Timeline demo data generation completed successfully!")
        
    except Exception as e:
        logger.error(f"💥 Timeline demo data generation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
                    "monday": working_day,
                    "tuesday": working_day,
                    "wednesday": working_day,
                    "thursday": working_day,
                    "friday": working_day,
                    "saturday": non_working_day,
                    "sunday": non_working_day,
                    "exceptions": [],
                    "is_default": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.timeline_calendars.insert_one(calendar_data)
                self.generated_data["timeline_calendars"].append(calendar_data)
            
            logger.info(f"✅ Created {len(self.generated_data['timeline_calendars'])} timeline calendars")
            return True
            
        except Exception as e:
            logger.error(f"❌ Timeline calendar creation failed: {e}")
            return False

    async def create_timeline_tasks(self, projects):
        """Create timeline tasks for existing projects"""
        logger.info("⏰ Creating timeline tasks...")
        
        try:
            users_cursor = self.db.users.find({"organization_id": self.org_id})
            users = await users_cursor.to_list(length=None)
            
            if not users:
                logger.error("   No users found for task assignment")
                return False
            
            for project in projects:
                # Determine project type for task templates
                project_type = "software_development"  # Default
                if "mobile" in project["name"].lower() or "app" in project["name"].lower():
                    project_type = "mobile_development"
                elif "analytics" in project["name"].lower() or "dashboard" in project["name"].lower():
                    project_type = "analytics"
                
                task_templates = self.timeline_task_templates.get(project_type, self.timeline_task_templates["software_development"])
                
                # Calculate project timeline
                project_start = project.get("start_date", datetime.utcnow())
                if isinstance(project_start, str):
                    try:
                        project_start = datetime.fromisoformat(project_start.replace('Z', '+00:00'))
                    except:
                        project_start = datetime.utcnow()
                
                current_date = project_start
                project_tasks = []
                parent_task_map = {}  # Track parent tasks for hierarchy
                
                for i, template in enumerate(task_templates):
                    task_id = str(uuid.uuid4())
                    
                    # Calculate start and finish dates
                    start_date = current_date
                    
                    if template["duration"] > 0:
                        # Convert hours to days (8 hours per day)
                        duration_days = max(1, template["duration"] // 8)
                        finish_date = start_date + timedelta(days=duration_days)
                        current_date = finish_date + timedelta(hours=4)  # Small gap between tasks
                    else:
                        # Milestone
                        finish_date = start_date
                    
                    # Determine parent task based on hierarchy
                    parent_task_id = None
                    if template["outline_level"] > 1:
                        # Find the most recent parent at a higher level
                        for prev_task in reversed(project_tasks):
                            if prev_task["outline_level"] < template["outline_level"]:
                                parent_task_id = prev_task["id"]
                                break
                    
                    # Assign team members
                    project_members = project.get("team_members", [])
                    if project_members:
                        assignee_ids = random.sample(project_members, min(2, len(project_members)))
                    else:
                        assignee_ids = [random.choice(users)["id"]]
                    
                    # Determine completion status based on project progress
                    project_progress = project.get("progress_percentage", 0)
                    task_progress_threshold = ((i + 1) / len(task_templates)) * 100
                    
                    if project_progress >= task_progress_threshold:
                        percent_complete = 100
                        actual_start = start_date
                        actual_finish = finish_date
                    elif project_progress >= task_progress_threshold - 20:
                        percent_complete = random.randint(20, 80)
                        actual_start = start_date
                        actual_finish = None
                    else:
                        percent_complete = 0
                        actual_start = None
                        actual_finish = None
                    
                    # Determine if task is critical (simplified logic)
                    critical = template["outline_level"] <= 2 and not template["summary_task"] and not template["milestone"]
                    
                    # Generate task color based on type
                    color = None
                    if template["milestone"]:
                        color = "#f59e0b"  # Amber for milestones
                    elif template["summary_task"]:
                        color = "#8b5cf6"  # Purple for summary tasks
                    elif critical:
                        color = "#ef4444"  # Red for critical tasks
                    else:
                        color = "#3b82f6"  # Blue for normal tasks
                    
                    timeline_task_data = {
                        "id": task_id,
                        "name": template["name"],
                        "description": f"Timeline task for {project['name']}: {template['name']}",
                        "project_id": project["id"],
                        "duration": template["duration"],
                        "work": template["duration"],
                        "start_date": start_date,
                        "finish_date": finish_date,
                        "actual_start": actual_start,
                        "actual_finish": actual_finish,
                        "percent_complete": percent_complete,
                        "remaining_work": template["duration"] * (100 - percent_complete) // 100,
                        "outline_level": template["outline_level"],
                        "summary_task": template["summary_task"],
                        "parent_task_id": parent_task_id,
                        "critical": critical,
                        "free_float": 0,  # Will be calculated later
                        "total_float": 0,  # Will be calculated later
                        "constraint_type": "ASAP",
                        "constraint_date": None,
                        "assignee_ids": assignee_ids,
                        "estimated_hours": template["duration"],
                        "calendar_id": None,
                        "baseline_start": start_date,
                        "baseline_finish": finish_date,
                        "baseline_duration": template["duration"],
                        "predecessor_ids": [],  # Will be populated when dependencies are created
                        "successor_ids": [],  # Will be populated when dependencies are created
                        "milestone": template["milestone"],
                        "color": color,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await self.db.timeline_tasks.insert_one(timeline_task_data)
                    project_tasks.append(timeline_task_data)
                    self.generated_data["timeline_tasks"].append(timeline_task_data)
                
                # Store tasks for dependency creation
                parent_task_map[project["id"]] = project_tasks
            
            logger.info(f"✅ Created {len(self.generated_data['timeline_tasks'])} timeline tasks")
            return True
            
        except Exception as e:
            logger.error(f"❌ Timeline task creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def create_task_dependencies(self, projects):
        """Create realistic task dependencies"""
        logger.info("🔗 Creating task dependencies...")
        
        try:
            for project in projects:
                # Get tasks for this project
                project_tasks = [task for task in self.generated_data["timeline_tasks"] if task["project_id"] == project["id"]]
                
                if len(project_tasks) < 2:
                    continue
                
                # Create dependencies between sequential tasks at the same outline level
                dependencies_created = 0
                
                for i in range(1, len(project_tasks)):
                    current_task = project_tasks[i]
                    previous_task = project_tasks[i-1]
                    
                    # Create dependency if tasks are at similar levels or current is child of previous
                    create_dependency = False
                    
                    if current_task["outline_level"] == previous_task["outline_level"]:
                        # Same level - create dependency with 70% chance
                        create_dependency = random.random() < 0.7
                    elif current_task["outline_level"] > previous_task["outline_level"]:
                        # Current is child - create dependency with 40% chance
                        create_dependency = random.random() < 0.4
                    elif current_task["outline_level"] < previous_task["outline_level"]:
                        # Current is parent level - find appropriate predecessor
                        for j in range(i-1, -1, -1):
                            prev_task = project_tasks[j]
                            if prev_task["outline_level"] == current_task["outline_level"]:
                                previous_task = prev_task
                                create_dependency = random.random() < 0.5
                                break
                    
                    if create_dependency and not current_task["milestone"]:
                        dependency_data = {
                            "id": str(uuid.uuid4()),
                            "predecessor_id": previous_task["id"],
                            "successor_id": current_task["id"],
                            "dependency_type": "FS",  # Finish-to-Start
                            "lag_duration": random.choice([0, 0, 0, 1, 2]),  # Mostly no lag, sometimes 1-2 days
                            "lag_format": "days",
                            "project_id": project["id"],
                            "created_by": project.get("owner_id", "demo-user-001"),
                            "created_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                        
                        await self.db.task_dependencies.insert_one(dependency_data)
                        self.generated_data["task_dependencies"].append(dependency_data)
                        dependencies_created += 1
                
                # Create some milestone dependencies
                milestones = [task for task in project_tasks if task["milestone"]]
                non_milestones = [task for task in project_tasks if not task["milestone"] and not task["summary_task"]]
                
                for milestone in milestones:
                    # Find tasks that should complete before this milestone
                    milestone_index = project_tasks.index(milestone)
                    preceding_tasks = [task for task in project_tasks[:milestone_index] 
                                    if not task["milestone"] and not task["summary_task"]]
                    
                    if preceding_tasks:
                        # Create dependencies from a few preceding tasks to the milestone
                        num_dependencies = min(3, len(preceding_tasks))
                        selected_predecessors = random.sample(preceding_tasks, num_dependencies)
                        
                        for predecessor in selected_predecessors:
                            dependency_data = {
                                "id": str(uuid.uuid4()),
                                "predecessor_id": predecessor["id"],
                                "successor_id": milestone["id"],
                                "dependency_type": "FS",
                                "lag_duration": 0,
                                "lag_format": "days",
                                "project_id": project["id"],
                                "created_by": project.get("owner_id", "demo-user-001"),
                                "created_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow()
                            }
                            
                            await self.db.task_dependencies.insert_one(dependency_data)
                            self.generated_data["task_dependencies"].append(dependency_data)
                            dependencies_created += 1
                
                logger.info(f"   Created {dependencies_created} dependencies for project {project['name']}")
            
            logger.info(f"✅ Created {len(self.generated_data['task_dependencies'])} task dependencies")
            return True
            
        except Exception as e:
            logger.error(f"❌ Task dependency creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def create_timeline_baselines(self, projects):
        """Create initial baselines for projects"""
        logger.info("📊 Creating timeline baselines...")
        
        try:
            for project in projects[:2]:  # Only first 2 projects
                # Get project timeline tasks
                project_tasks = [task for task in self.generated_data["timeline_tasks"] if task["project_id"] == project["id"]]
                
                baseline_data = {
                    "id": str(uuid.uuid4()),
                    "name": "Initial Project Plan",
                    "description": f"Original timeline baseline for {project['name']}",
                    "project_id": project["id"],
                    "baseline_date": datetime.utcnow() - timedelta(days=random.randint(30, 90)),
                    "is_active": True,
                    "baseline_data": {
                        "tasks": [
                            {
                                "task_id": task["id"],
                                "baseline_start": task["baseline_start"],
                                "baseline_finish": task["baseline_finish"],
                                "baseline_duration": task["baseline_duration"]
                            } for task in project_tasks
                        ]
                    },
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.timeline_baselines.insert_one(baseline_data)
                self.generated_data["timeline_baselines"].append(baseline_data)
            
            logger.info(f"✅ Created {len(self.generated_data['timeline_baselines'])} timeline baselines")
            return True
            
        except Exception as e:
            logger.error(f"❌ Timeline baseline creation failed: {e}")
            return False

    async def generate_report(self):
        """Generate timeline demo data report"""
        logger.info("📋 Generating timeline demo data report...")
        
        try:
            report = {
                "generation_timestamp": datetime.utcnow().isoformat(),
                "status": "completed",
                "timeline_summary": {
                    "timeline_tasks_created": len(self.generated_data["timeline_tasks"]),
                    "task_dependencies_created": len(self.generated_data["task_dependencies"]),
                    "timeline_projects_created": len(self.generated_data["timeline_projects"]),
                    "timeline_calendars_created": len(self.generated_data["timeline_calendars"]),
                    "timeline_baselines_created": len(self.generated_data["timeline_baselines"]),
                    "total_timeline_data_points": sum(len(data) for data in self.generated_data.values())
                },
                "access_information": {
                    "timeline_page": "http://localhost:3000/timeline",
                    "api_endpoints": {
                        "gantt_data": "http://localhost:8001/api/timeline/gantt/{project_id}",
                        "timeline_tasks": "http://localhost:8001/api/timeline/tasks/{project_id}",
                        "dependencies": "http://localhost:8001/api/timeline/dependencies/{project_id}"
                    }
                }
            }
            
            # Save report
            report_file = f"/app/timeline_demo_data_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            print("=" * 80)
            print("🎉 TIMELINE DEMO DATA GENERATION COMPLETED SUCCESSFULLY!")
            print("=" * 80)
            print(f"📊 Timeline Summary:")
            print(f"   ⏰ Timeline Tasks: {report['timeline_summary']['timeline_tasks_created']}")
            print(f"   🔗 Task Dependencies: {report['timeline_summary']['task_dependencies_created']}")
            print(f"   📁 Timeline Projects: {report['timeline_summary']['timeline_projects_created']}")
            print(f"   📅 Timeline Calendars: {report['timeline_summary']['timeline_calendars_created']}")
            print(f"   📊 Timeline Baselines: {report['timeline_summary']['timeline_baselines_created']}")
            print(f"   📋 Total Timeline Data Points: {report['timeline_summary']['total_timeline_data_points']}")
            print(f"\n🔑 Access Information:")
            print(f"   Timeline Page: {report['access_information']['timeline_page']}")
            print(f"   Gantt Chart API: {report['access_information']['api_endpoints']['gantt_data']}")
            print(f"\n💾 Report saved to: {report_file}")
            print("=" * 80)
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Timeline report generation failed: {e}")
            return None

    async def run_complete_generation(self):
        """Run the complete timeline demo data generation process"""
        logger.info("🚀 Starting Timeline Demo Data Generation...")
        print("=" * 80)
        
        start_time = datetime.utcnow()
        
        try:
            # Connect to database
            await self.connect_database()
            
            # Get existing projects
            projects = await self.get_existing_projects()
            if not projects:
                logger.error("❌ No existing projects found. Please run the main demo data generator first.")
                return False
            
            # Run generation steps
            steps = [
                ("Cleanup existing timeline data", self.cleanup_timeline_data),
                ("Create timeline project configurations", lambda: self.create_timeline_projects(projects)),
                ("Create timeline calendars", lambda: self.create_timeline_calendars(projects)),
                ("Create timeline tasks", lambda: self.create_timeline_tasks(projects)),
                ("Create task dependencies", lambda: self.create_task_dependencies(projects)),
                ("Create timeline baselines", lambda: self.create_timeline_baselines(projects))
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
            
            print(f"\n⏱️ Timeline generation completed in {duration:.2f} seconds")
            print(f"📈 Success rate: {success_count}/{len(steps)} steps completed")
            
            return report is not None
            
        except Exception as e:
            logger.error(f"❌ Timeline demo data generation failed: {e}")
            return False

if __name__ == "__main__":
    generator = TimelineDemoDataGenerator()
    success = asyncio.run(generator.run_complete_generation())
    sys.exit(0 if success else 1)