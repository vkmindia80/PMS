"""
Create comprehensive demo data for Resource Management Phase 3.2
Populates realistic resource scenarios for testing AI-powered features
"""
import asyncio
import uuid
from datetime import datetime, timedelta
import random
from database import connect_to_mongo, get_database

# Sample data for realistic resource scenarios
ADVANCED_SKILLS = [
    {"name": "React", "level": "expert", "category": "frontend"},
    {"name": "Python", "level": "expert", "category": "backend"},
    {"name": "Machine Learning", "level": "intermediate", "category": "ai"},
    {"name": "DevOps", "level": "advanced", "category": "infrastructure"},
    {"name": "UI/UX Design", "level": "expert", "category": "design"},
    {"name": "Node.js", "level": "intermediate", "category": "backend"},
    {"name": "Docker", "level": "advanced", "category": "infrastructure"},
    {"name": "AWS", "level": "intermediate", "category": "cloud"},
    {"name": "PostgreSQL", "level": "advanced", "category": "database"},
    {"name": "TypeScript", "level": "expert", "category": "frontend"},
    {"name": "Kubernetes", "level": "intermediate", "category": "infrastructure"},
    {"name": "Data Analysis", "level": "advanced", "category": "analytics"},
    {"name": "Project Management", "level": "expert", "category": "management"},
    {"name": "GraphQL", "level": "intermediate", "category": "api"},
    {"name": "Testing & QA", "level": "advanced", "category": "quality"},
    {"name": "Mobile Development", "level": "intermediate", "category": "mobile"},
    {"name": "Cybersecurity", "level": "advanced", "category": "security"},
    {"name": "Blockchain", "level": "intermediate", "category": "emerging"},
    {"name": "Cloud Architecture", "level": "expert", "category": "architecture"},
    {"name": "Agile/Scrum", "level": "expert", "category": "methodology"}
]

TEAM_SPECIALIZATIONS = {
    "Frontend Development Team": ["React", "TypeScript", "UI/UX Design", "Testing & QA"],
    "Backend Engineering Team": ["Python", "Node.js", "PostgreSQL", "GraphQL"],
    "DevOps & Infrastructure Team": ["Docker", "Kubernetes", "AWS", "DevOps"],
    "Data & AI Team": ["Machine Learning", "Data Analysis", "Python", "AWS"],
    "Product & Design Team": ["UI/UX Design", "Project Management", "Agile/Scrum"]
}

REALISTIC_USER_PROFILES = [
    # Senior Frontend Developer
    {
        "first_name": "Sarah", "last_name": "Chen", "email": "sarah.chen@company.com",
        "role": "team_lead", "skills": ["React", "TypeScript", "UI/UX Design", "Testing & QA"],
        "capacity_preference": 85, "seniority": "senior"
    },
    # Full Stack Engineer  
    {
        "first_name": "Marcus", "last_name": "Rodriguez", "email": "marcus.rodriguez@company.com",
        "role": "member", "skills": ["Python", "React", "PostgreSQL", "Docker"],
        "capacity_preference": 90, "seniority": "mid"
    },
    # DevOps Specialist
    {
        "first_name": "Emily", "last_name": "Johnson", "email": "emily.johnson@company.com",
        "role": "team_lead", "skills": ["DevOps", "Kubernetes", "AWS", "Docker"],
        "capacity_preference": 80, "seniority": "senior"
    },
    # Data Scientist
    {
        "first_name": "David", "last_name": "Kim", "email": "david.kim@company.com", 
        "role": "member", "skills": ["Machine Learning", "Python", "Data Analysis", "AWS"],
        "capacity_preference": 75, "seniority": "mid"
    },
    # Product Manager
    {
        "first_name": "Jessica", "last_name": "Williams", "email": "jessica.williams@company.com",
        "role": "manager", "skills": ["Project Management", "Agile/Scrum", "UI/UX Design"],
        "capacity_preference": 70, "seniority": "senior"
    },
    # Junior Developer
    {
        "first_name": "Alex", "last_name": "Thompson", "email": "alex.thompson@company.com",
        "role": "member", "skills": ["React", "Node.js", "Testing & QA"],
        "capacity_preference": 100, "seniority": "junior"
    },
    # Security Engineer
    {
        "first_name": "Michael", "last_name": "Brown", "email": "michael.brown@company.com",
        "role": "member", "skills": ["Cybersecurity", "Python", "AWS", "Docker"],
        "capacity_preference": 85, "seniority": "senior"
    },
    # Mobile Developer
    {
        "first_name": "Lisa", "last_name": "Garcia", "email": "lisa.garcia@company.com",
        "role": "member", "skills": ["Mobile Development", "React", "TypeScript"],
        "capacity_preference": 80, "seniority": "mid"
    },
    # Backend Architect
    {
        "first_name": "James", "last_name": "Wilson", "email": "james.wilson@company.com",
        "role": "manager", "skills": ["Cloud Architecture", "Python", "PostgreSQL", "Kubernetes"],
        "capacity_preference": 60, "seniority": "architect"
    },
    # UX Designer
    {
        "first_name": "Rachel", "last_name": "Davis", "email": "rachel.davis@company.com",
        "role": "member", "skills": ["UI/UX Design", "Project Management"],
        "capacity_preference": 90, "seniority": "mid"
    }
]

COMPLEX_PROJECTS = [
    {
        "name": "AI-Powered Analytics Platform",
        "description": "Machine learning platform for real-time business insights",
        "priority": "critical",
        "required_skills": ["Machine Learning", "Python", "React", "AWS", "Data Analysis"],
        "estimated_duration": 120,  # days
        "team_size": 5
    },
    {
        "name": "Mobile Banking App",
        "description": "Secure mobile banking application with advanced features",
        "priority": "high", 
        "required_skills": ["Mobile Development", "Cybersecurity", "React", "Node.js"],
        "estimated_duration": 90,
        "team_size": 4
    },
    {
        "name": "Cloud Migration Initiative",
        "description": "Migrate legacy systems to cloud-native architecture",
        "priority": "high",
        "required_skills": ["Cloud Architecture", "DevOps", "Kubernetes", "AWS"],
        "estimated_duration": 150,
        "team_size": 3
    },
    {
        "name": "Customer Portal Redesign",
        "description": "Complete redesign of customer-facing portal",
        "priority": "medium",
        "required_skills": ["UI/UX Design", "React", "TypeScript", "Testing & QA"],
        "estimated_duration": 60,
        "team_size": 3
    }
]

TASK_TEMPLATES = [
    {"title": "Design system architecture", "skills": ["Cloud Architecture"], "hours": 16},
    {"title": "Implement user authentication", "skills": ["Cybersecurity", "Backend"], "hours": 24},
    {"title": "Create responsive UI components", "skills": ["React", "UI/UX Design"], "hours": 32},
    {"title": "Set up CI/CD pipeline", "skills": ["DevOps", "Docker"], "hours": 20},
    {"title": "Implement data processing", "skills": ["Machine Learning", "Python"], "hours": 40},
    {"title": "Database optimization", "skills": ["PostgreSQL", "Backend"], "hours": 16},
    {"title": "API integration", "skills": ["GraphQL", "Node.js"], "hours": 24},
    {"title": "Security audit", "skills": ["Cybersecurity"], "hours": 12},
    {"title": "Mobile app testing", "skills": ["Mobile Development", "Testing & QA"], "hours": 20},
    {"title": "Performance optimization", "skills": ["React", "PostgreSQL"], "hours": 28}
]

async def create_advanced_users(db):
    """Create realistic users with diverse skills and capacities"""
    print("Creating advanced user profiles...")
    
    users_created = 0
    for i, profile in enumerate(REALISTIC_USER_PROFILES):
        user_id = f"user-{str(uuid.uuid4())[:8]}"
        
        # Create varied skill levels
        user_skills = []
        for skill_name in profile["skills"]:
            skill_data = next((s for s in ADVANCED_SKILLS if s["name"] == skill_name), None)
            if skill_data:
                # Vary skill levels based on seniority
                levels = ["beginner", "intermediate", "advanced", "expert"]
                if profile["seniority"] == "junior":
                    level = random.choice(["beginner", "intermediate"])
                elif profile["seniority"] == "mid":
                    level = random.choice(["intermediate", "advanced"])
                elif profile["seniority"] == "senior":
                    level = random.choice(["advanced", "expert"])
                else:  # architect
                    level = "expert"
                
                user_skills.append({
                    "name": skill_data["name"],
                    "level": level,
                    "category": skill_data["category"],
                    "years_experience": random.randint(1, 8) if profile["seniority"] != "junior" else random.randint(1, 3)
                })
        
        user_doc = {
            "id": user_id,
            "email": profile["email"],
            "username": profile["email"].split("@")[0],
            "password_hash": "$2b$12$dummy.hash.for.demo.purposes.only",
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
            "phone": f"+1-555-{random.randint(1000, 9999)}",
            "bio": f"{profile['seniority'].title()} {profile['role'].replace('_', ' ')} with expertise in {', '.join(profile['skills'][:3])}",
            "avatar_url": None,
            "role": profile["role"],
            "organization_id": "demo-org-001",
            "is_active": True,
            "status": "active",
            "email_verified": True,
            "skills": user_skills,
            "capacity_preferences": {
                "max_utilization": profile["capacity_preference"],
                "preferred_hours_per_week": random.randint(30, 45),
                "overtime_available": random.choice([True, False]),
                "working_hours": "9am-6pm EST",
                "availability_status": random.choice(["available", "busy", "limited"])
            },
            "performance_metrics": {
                "productivity_score": random.randint(75, 95),
                "quality_score": random.randint(80, 98),
                "collaboration_score": random.randint(70, 95),
                "tasks_completed_this_month": random.randint(5, 25)
            },
            "team_memberships": [],  # Will be updated when teams are created
            "timezone": "UTC",
            "language": "en",
            "theme": "light",
            "notifications_enabled": True,
            "profile_completed": True,
            "onboarding_completed": True,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 365)),
            "updated_at": datetime.utcnow()
        }
        
        await db.users.insert_one(user_doc)
        users_created += 1
        print(f"Created user: {profile['first_name']} {profile['last_name']} ({profile['seniority']} {profile['role']})")
    
    print(f"✅ Created {users_created} advanced user profiles")
    return users_created

async def create_specialized_teams(db):
    """Create teams with specific skill focuses"""
    print("Creating specialized teams...")
    
    users = await db.users.find({"organization_id": "demo-org-001"}).to_list(length=None)
    teams_created = 0
    
    for team_name, required_skills in TEAM_SPECIALIZATIONS.items():
        team_id = f"team-{str(uuid.uuid4())[:8]}"
        
        # Find users with matching skills
        team_members = []
        for user in users:
            user_skill_names = [s["name"] for s in user.get("skills", [])]
            skill_match = len(set(required_skills) & set(user_skill_names))
            
            if skill_match >= 2:  # Must have at least 2 matching skills
                team_members.append(user["id"])
            
            if len(team_members) >= 4:  # Limit team size
                break
        
        # Assign team lead (highest role user)
        team_lead_id = None
        for member_id in team_members:
            user = next((u for u in users if u["id"] == member_id), None)
            if user and user["role"] in ["team_lead", "manager"]:
                team_lead_id = member_id
                break
        
        if not team_lead_id and team_members:
            team_lead_id = team_members[0]
        
        team_doc = {
            "id": team_id,
            "name": team_name,
            "description": f"Specialized team focused on {', '.join(required_skills[:3])}",
            "type": "specialized",
            "organization_id": "demo-org-001",
            "lead_id": team_lead_id,
            "members": team_members,
            "skills_focus": required_skills,
            "capacity_metrics": {
                "total_capacity": len(team_members) * 40,  # 40 hours per week
                "current_utilization": random.randint(60, 85),
                "efficiency_score": random.randint(75, 92)
            },
            "performance_metrics": {
                "projects_completed": random.randint(3, 12),
                "average_task_completion_time": random.uniform(2.5, 5.5),
                "client_satisfaction": random.uniform(4.2, 4.8)
            },
            "is_active": True,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(60, 200)),
            "updated_at": datetime.utcnow()
        }
        
        await db.teams.insert_one(team_doc)
        
        # Update user team memberships
        for member_id in team_members:
            await db.users.update_one(
                {"id": member_id},
                {"$push": {"team_memberships": team_id}}
            )
        
        teams_created += 1
        print(f"Created team: {team_name} with {len(team_members)} members")
    
    print(f"✅ Created {teams_created} specialized teams")
    return teams_created

async def create_complex_projects_and_tasks(db):
    """Create realistic projects with complex resource requirements"""
    print("Creating complex projects and tasks...")
    
    users = await db.users.find({"organization_id": "demo-org-001"}).to_list(length=None)
    teams = await db.teams.find({"organization_id": "demo-org-001"}).to_list(length=None)
    
    projects_created = 0
    tasks_created = 0
    
    for project_data in COMPLEX_PROJECTS:
        project_id = f"project-{str(uuid.uuid4())[:8]}"
        
        # Find suitable team members based on required skills
        suitable_members = []
        for user in users:
            user_skills = [s["name"] for s in user.get("skills", [])]
            skill_matches = len(set(project_data["required_skills"]) & set(user_skills))
            if skill_matches >= 1:
                suitable_members.append({
                    "user_id": user["id"],
                    "skill_matches": skill_matches,
                    "user": user
                })
        
        # Sort by skill matches and select team
        suitable_members.sort(key=lambda x: x["skill_matches"], reverse=True)
        project_team = [m["user_id"] for m in suitable_members[:project_data["team_size"]]]
        
        # Assign project manager
        manager = next((m["user"] for m in suitable_members if m["user"]["role"] in ["manager", "team_lead"]), None)
        manager_id = manager["id"] if manager else project_team[0] if project_team else None
        
        # Calculate budget based on team size and duration
        base_rate = 120  # $120/hour average
        estimated_hours = project_data["estimated_duration"] * 6  # 6 hours per day
        total_budget = estimated_hours * project_data["team_size"] * base_rate
        
        project_doc = {
            "id": project_id,
            "name": project_data["name"],
            "description": project_data["description"],
            "organization_id": "demo-org-001",
            "status": "active",
            "priority": project_data["priority"],
            "progress_percentage": random.randint(15, 45),
            "start_date": datetime.utcnow().isoformat(),
            "due_date": (datetime.utcnow() + timedelta(days=project_data["estimated_duration"])).isoformat(),
            "budget": {
                "total_budget": total_budget,
                "spent_amount": total_budget * random.uniform(0.1, 0.3),  # 10-30% spent
                "currency": "USD"
            },
            "team_members": project_team,
            "manager_id": manager_id,
            "required_skills": project_data["required_skills"],
            "resource_requirements": {
                "estimated_hours": estimated_hours,
                "complexity_score": random.randint(6, 10),
                "risk_level": random.choice(["low", "medium", "high"]),
                "dependencies": random.randint(0, 3)
            },
            "milestones": [
                {
                    "id": f"milestone-{i+1}",
                    "name": f"Phase {i+1}",
                    "description": f"Project phase {i+1} completion",
                    "due_date": (datetime.utcnow() + timedelta(days=project_data["estimated_duration"] // 4 * (i+1))).isoformat(),
                    "status": "pending" if i > 0 else "completed",
                    "completion_percentage": 100 if i == 0 else 0
                }
                for i in range(4)
            ],
            "created_at": datetime.utcnow() - timedelta(days=random.randint(7, 30)),
            "updated_at": datetime.utcnow()
        }
        
        await db.projects.insert_one(project_doc)
        projects_created += 1
        
        # Create diverse tasks for this project
        tasks_for_project = random.randint(8, 15)
        for i in range(tasks_for_project):
            task_template = random.choice(TASK_TEMPLATES)
            task_id = f"task-{str(uuid.uuid4())[:8]}"
            
            # Find best assignee based on required skills
            best_assignee = None
            best_score = 0
            
            for member_id in project_team:
                user = next((u for u in users if u["id"] == member_id), None)
                if user:
                    user_skills = [s["name"] for s in user.get("skills", [])]
                    skill_matches = len(set(task_template["skills"]) & set(user_skills))
                    
                    # Consider current workload (simulate)
                    current_workload = random.randint(0, 40)  # hours
                    availability_score = max(0, 40 - current_workload) / 40
                    
                    total_score = skill_matches * 0.7 + availability_score * 0.3
                    
                    if total_score > best_score:
                        best_score = total_score
                        best_assignee = member_id
            
            # Create realistic task status distribution
            status_weights = {
                "todo": 0.3,
                "in_progress": 0.4, 
                "in_review": 0.1,
                "completed": 0.15,
                "blocked": 0.05
            }
            task_status = random.choices(list(status_weights.keys()), weights=list(status_weights.values()))[0]
            
            # Create due date based on task complexity
            task_due_days = random.randint(3, 14)
            task_due_date = datetime.utcnow() + timedelta(days=task_due_days)
            
            task_doc = {
                "id": task_id,
                "title": f"{task_template['title']} - {project_data['name']}",
                "description": f"Implement {task_template['title'].lower()} for the {project_data['name'].lower()} project",
                "project_id": project_id,
                "assignee_id": best_assignee,
                "status": task_status,
                "priority": random.choice(["low", "medium", "high", "critical"]) if task_status != "completed" else "completed",
                "estimated_hours": task_template["hours"],
                "actual_hours": task_template["hours"] * random.uniform(0.8, 1.2) if task_status == "completed" else 0,
                "required_skills": task_template["skills"],
                "complexity_score": random.randint(1, 10),
                "start_date": (datetime.utcnow() - timedelta(days=random.randint(1, 7))).isoformat() if task_status != "todo" else None,
                "due_date": task_due_date.isoformat(),
                "dependencies": [],
                "tags": project_data["required_skills"][:2],  # Use first 2 project skills as tags
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 20)),
                "updated_at": datetime.utcnow()
            }
            
            await db.tasks.insert_one(task_doc)
            tasks_created += 1
        
        print(f"Created project: {project_data['name']} with {tasks_for_project} tasks")
    
    print(f"✅ Created {projects_created} complex projects and {tasks_created} tasks")
    return projects_created, tasks_created

async def create_resource_constraints(db):
    """Create realistic resource constraints and bottlenecks"""
    print("Creating resource constraints...")
    
    users = await db.users.find({"organization_id": "demo-org-001"}).to_list(length=None)
    
    # Simulate vacation/leave periods
    for user in users:
        if random.random() < 0.3:  # 30% of users have upcoming time off
            leave_start = datetime.utcnow() + timedelta(days=random.randint(5, 30))
            leave_duration = random.randint(3, 10)  # 3-10 days
            
            leave_doc = {
                "id": f"leave-{str(uuid.uuid4())[:8]}",
                "user_id": user["id"],
                "type": random.choice(["vacation", "sick", "training", "conference"]),
                "start_date": leave_start.isoformat(),
                "end_date": (leave_start + timedelta(days=leave_duration)).isoformat(),
                "status": "approved",
                "impact_analysis": {
                    "affected_projects": random.randint(1, 3),
                    "coverage_arranged": random.choice([True, False]),
                    "risk_level": random.choice(["low", "medium", "high"])
                },
                "created_at": datetime.utcnow()
            }
            
            # Store in a time_off collection
            await db.time_off.insert_one(leave_doc)
    
    # Create skill demand scenarios
    high_demand_skills = ["Machine Learning", "Cybersecurity", "Cloud Architecture", "DevOps"]
    
    for skill in high_demand_skills:
        skill_users = []
        for user in users:
            user_skills = [s["name"] for s in user.get("skills", [])]
            if skill in user_skills:
                skill_users.append(user["id"])
        
        if len(skill_users) < 3:  # Skills gap scenario
            gap_doc = {
                "id": f"gap-{str(uuid.uuid4())[:8]}",
                "skill_name": skill,
                "current_supply": len(skill_users),
                "projected_demand": random.randint(4, 8),
                "gap_severity": "critical" if len(skill_users) <= 1 else "moderate",
                "business_impact": random.choice(["high", "medium", "low"]),
                "recommended_actions": [
                    "Hire external specialist",
                    "Provide training to existing team members",
                    "Consider consulting services"
                ],
                "created_at": datetime.utcnow()
            }
            
            await db.skills_gaps.insert_one(gap_doc)
    
    print("✅ Created resource constraints and skills gaps")

async def create_performance_data(db):
    """Create performance and productivity data for analytics"""
    print("Creating performance and productivity data...")
    
    users = await db.users.find({"organization_id": "demo-org-001"}).to_list(length=None)
    
    for user in users:
        # Create monthly performance data
        for month_offset in range(6):  # Last 6 months
            month_date = datetime.utcnow() - timedelta(days=30 * month_offset)
            
            performance_doc = {
                "id": f"perf-{str(uuid.uuid4())[:8]}",
                "user_id": user["id"],
                "period": month_date.strftime("%Y-%m"),
                "metrics": {
                    "tasks_completed": random.randint(8, 25),
                    "average_completion_time": round(random.uniform(2.0, 6.0), 1),
                    "quality_score": random.randint(75, 98),
                    "productivity_index": random.randint(70, 95),
                    "collaboration_rating": random.randint(75, 95),
                    "innovation_contributions": random.randint(0, 5),
                    "hours_worked": random.randint(140, 180)  # Monthly hours
                },
                "feedback": {
                    "peer_ratings": [random.randint(7, 10) for _ in range(3)],
                    "manager_rating": random.randint(7, 10),
                    "self_assessment": random.randint(6, 9)
                },
                "skills_development": {
                    "courses_completed": random.randint(0, 3),
                    "certifications_earned": random.randint(0, 1),
                    "new_skills_acquired": random.randint(0, 2)
                },
                "created_at": month_date
            }
            
            await db.performance_data.insert_one(performance_doc)
    
    print("✅ Created performance and productivity data")

async def main():
    """Main function to create all resource management demo data"""
    print("🚀 Creating comprehensive Resource Management Demo Data...")
    print("=" * 60)
    
    try:
        # Connect to database
        await connect_to_mongo()
        db = await get_database()
        
        # Clear existing demo data
        print("Cleaning existing demo data...")
        await db.users.delete_many({"organization_id": "demo-org-001", "email": {"$ne": "demo@company.com"}})
        await db.teams.delete_many({"organization_id": "demo-org-001"})
        await db.projects.delete_many({"organization_id": "demo-org-001"})
        await db.tasks.delete_many({})
        await db.time_off.delete_many({})
        await db.skills_gaps.delete_many({})
        await db.performance_data.delete_many({})
        
        # Create comprehensive demo data
        users_count = await create_advanced_users(db)
        teams_count = await create_specialized_teams(db)
        projects_count, tasks_count = await create_complex_projects_and_tasks(db)
        await create_resource_constraints(db)
        await create_performance_data(db)
        
        print("\n" + "=" * 60)
        print("🎉 Resource Management Demo Data Creation Complete!")
        print("=" * 60)
        print(f"📊 Created:")
        print(f"   • {users_count} realistic user profiles with diverse skills")
        print(f"   • {teams_count} specialized teams with skill focus")
        print(f"   • {projects_count} complex projects with resource requirements")
        print(f"   • {tasks_count} tasks with skill-based assignments")
        print(f"   • Resource constraints and skills gaps scenarios")
        print(f"   • Historical performance and productivity data")
        
        print("\n🔧 AI-Powered Features Ready:")
        print("   • Intelligent resource allocation optimization")
        print("   • Skills-based task assignment recommendations")
        print("   • Predictive capacity planning with bottleneck detection")
        print("   • Real-time workload balancing suggestions")
        print("   • Comprehensive skills gap analysis")
        
        print(f"\n🌐 Access at: https://reply-uniqueness.preview.emergentagent.com/resource-management")
        print("📧 Login: demo@company.com / demo123456")
        
    except Exception as e:
        print(f"❌ Error creating demo data: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())