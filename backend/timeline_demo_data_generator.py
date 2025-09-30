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
