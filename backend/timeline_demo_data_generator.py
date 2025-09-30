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
        self.generated_data = {
            "timeline_tasks": [],
            "task_dependencies": [],
            "timeline_projects": [],
            "timeline_calendars": [],
            "timeline_baselines": []
        }
        
        # Timeline task templates based on project type
        self.timeline_task_templates = {
            "software_development": [
                {
                    "name": "Project Initiation & Planning",
                    "duration": 40,  # hours
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Requirements Analysis",
                    "duration": 24,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Technical Specification",
                    "duration": 16,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Requirements Sign-off",
                    "duration": 0,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": True
                },
                {
                    "name": "System Design & Architecture",
                    "duration": 64,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Database Schema Design",
                    "duration": 24,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "API Design & Documentation",
                    "duration": 32,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "UI/UX Design & Wireframes",
                    "duration": 48,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Design Review & Approval",
                    "duration": 0,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": True
                },
                {
                    "name": "Core Development Phase",
                    "duration": 320,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Backend API Development",
                    "duration": 120,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Frontend Development",
                    "duration": 100,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Database Implementation",
                    "duration": 40,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Integration & Testing",
                    "duration": 60,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Alpha Release",
                    "duration": 0,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": True
                },
                {
                    "name": "Testing & Quality Assurance",
                    "duration": 80,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Unit Testing",
                    "duration": 32,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Integration Testing",
                    "duration": 24,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "User Acceptance Testing",
                    "duration": 24,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Beta Release",
                    "duration": 0,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": True
                },
                {
                    "name": "Deployment & Launch",
                    "duration": 32,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Production Deployment",
                    "duration": 16,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Documentation & Training",
                    "duration": 16,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Project Completion",
                    "duration": 0,
                    "outline_level": 1,
                    "summary_task": False,
                    "milestone": True
                }
            ],
            "mobile_development": [
                {
                    "name": "Project Planning",
                    "duration": 32,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Platform Research",
                    "duration": 16,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Technical Requirements",
                    "duration": 16,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "App Design",
                    "duration": 64,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "User Flow Design",
                    "duration": 24,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "UI Design & Prototyping",
                    "duration": 40,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Development",
                    "duration": 240,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Core Features Development",
                    "duration": 120,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Platform Integration",
                    "duration": 60,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Testing & Optimization",
                    "duration": 60,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "App Store Submission",
                    "duration": 16,
                    "outline_level": 1,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Launch",
                    "duration": 0,
                    "outline_level": 1,
                    "summary_task": False,
                    "milestone": True
                }
            ],
            "analytics": [
                {
                    "name": "Data Analysis Planning",
                    "duration": 24,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Requirements Gathering",
                    "duration": 16,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Data Source Analysis",
                    "duration": 8,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Dashboard Development",
                    "duration": 80,
                    "outline_level": 1,
                    "summary_task": True,
                    "milestone": False
                },
                {
                    "name": "Data Pipeline Setup",
                    "duration": 32,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Visualization Components",
                    "duration": 48,
                    "outline_level": 2,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Testing & Validation",
                    "duration": 24,
                    "outline_level": 1,
                    "summary_task": False,
                    "milestone": False
                },
                {
                    "name": "Production Deployment",
                    "duration": 8,
                    "outline_level": 1,
                    "summary_task": False,
                    "milestone": False
                }
            ]
        }

    async def connect_database(self):
        """Connect to the database"""
        try:
            await connect_to_mongo()
            self.db = await get_database()
            logger.info("✅ Connected to database")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            raise

    async def get_existing_projects(self):
        """Get existing projects from the database"""
        try:
            projects_cursor = self.db.projects.find({"organization_id": self.org_id})
            projects = await projects_cursor.to_list(length=None)
            logger.info(f"📁 Found {len(projects)} existing projects")
            return projects
        except Exception as e:
            logger.error(f"❌ Failed to retrieve projects: {e}")
            return []

    async def cleanup_timeline_data(self):
        """Clean up existing timeline data"""
        logger.info("🧹 Cleaning up existing timeline data...")
        
        try:
            collections_to_clean = [
                "timeline_tasks",
                "task_dependencies", 
                "timeline_projects",
                "timeline_calendars",
                "timeline_baselines"
            ]
            
            total_deleted = 0
            for collection_name in collections_to_clean:
                try:
                    result = await self.db[collection_name].delete_many({})
                    total_deleted += result.deleted_count
                    logger.info(f"   Cleaned {result.deleted_count} items from {collection_name}")
                except Exception as e:
                    logger.warning(f"   Could not clean {collection_name}: {e}")
            
            logger.info(f"✅ Timeline cleanup completed ({total_deleted} items removed)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Timeline cleanup failed: {e}")
            return False

    async def create_timeline_projects(self, projects):
        """Create timeline configuration for existing projects"""
        logger.info("⚙️ Creating timeline project configurations...")
        
        try:
            for project in projects:
                timeline_project_data = {
                    "id": str(uuid.uuid4()),
                    "project_id": project["id"],
                    "default_view_mode": random.choice(["week", "month"]),
                    "show_critical_path": True,
                    "show_slack": random.choice([True, False]),
                    "work_hours_per_day": 8,
                    "work_days_per_week": 5,
                    "default_start_time": "09:00",
                    "default_end_time": "17:00",
                    "timeline_start": project.get("start_date"),
                    "timeline_end": project.get("due_date"),
                    "baselines": [],
                    "active_baseline": None,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await self.db.timeline_projects.insert_one(timeline_project_data)
                self.generated_data["timeline_projects"].append(timeline_project_data)
            
            logger.info(f"✅ Created {len(self.generated_data['timeline_projects'])} timeline project configurations")
            return True
            
        except Exception as e:
            logger.error(f"❌ Timeline project configuration creation failed: {e}")
            return False

    async def create_timeline_calendars(self, projects):
        """Create timeline calendars for projects"""
        logger.info("📅 Creating timeline calendars...")
        
        try:
            # Create a default calendar for each project
            for project in projects[:3]:  # Only first 3 projects
                working_slots = [
                    {"start_time": "09:00", "end_time": "12:00"},
                    {"start_time": "13:00", "end_time": "17:00"}
                ]
                
                working_day = {
                    "working": True,
                    "time_slots": working_slots
                }
                
                non_working_day = {
                    "working": False,
                    "time_slots": []
                }
                
                calendar_data = {
                    "id": str(uuid.uuid4()),
                    "name": f"Standard Calendar - {project['name'][:20]}",
                    "description": f"Standard business hours calendar for {project['name']}",
                    "project_id": project["id"],
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