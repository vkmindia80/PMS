from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import json
import os
from dotenv import load_dotenv

# Import AI integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Import database connection
from database import get_database

# Import authentication
from auth.middleware import get_current_active_user

# Import models
from models.user import User
from models.project import ProjectStatus
from models.task import TaskStatus, TaskPriority

load_dotenv()

router = APIRouter(prefix="/api/resource-management", tags=["resource_management"])

def clean_mongo_doc(doc):
    """Clean MongoDB document by removing ObjectId fields and converting to JSON-serializable format"""
    from datetime import datetime
    from bson import ObjectId
    
    if isinstance(doc, dict):
        cleaned = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB ObjectId
            elif isinstance(value, ObjectId):
                cleaned[key] = str(value)  # Convert ObjectId to string
            elif isinstance(value, datetime):
                cleaned[key] = value.isoformat()  # Convert datetime to ISO string
            elif isinstance(value, dict):
                cleaned[key] = clean_mongo_doc(value)
            elif isinstance(value, list):
                cleaned[key] = [clean_mongo_doc(item) if isinstance(item, (dict, ObjectId, datetime)) else item for item in value]
            else:
                cleaned[key] = value
        return cleaned
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, datetime):
        return doc.isoformat()
    return doc

def clean_mongo_docs(docs):
    """Clean a list of MongoDB documents"""
    return [clean_mongo_doc(doc) for doc in docs]

# Initialize AI chat for resource optimization
async def get_ai_chat():
    """Initialize AI chat for resource management recommendations"""
    return LlmChat(
        api_key=os.getenv("EMERGENT_LLM_KEY"),
        session_id="resource-management",
        system_message="""You are an AI Resource Management Assistant specializing in optimal resource allocation, 
        workload balancing, and intelligent task assignment. Provide data-driven recommendations based on:
        - Team member skills and expertise levels
        - Current workload and capacity utilization
        - Project priorities and deadlines
        - Resource availability and constraints
        - Performance metrics and historical data
        
        Always provide actionable, specific recommendations with clear reasoning."""
    ).with_model("openai", "gpt-4o-mini")

@router.get("/allocation/optimize", response_model=Dict[str, Any])
async def get_ai_resource_allocation(
    current_user: User = Depends(get_current_active_user)
):
    """AI-powered resource allocation optimization with intelligent recommendations"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        # Get comprehensive data and clean MongoDB ObjectIds
        users_raw = await db.users.find({"organization_id": org_id}).to_list(length=None)
        teams_raw = await db.teams.find({"organization_id": org_id}).to_list(length=None)
        projects_raw = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks_raw = await db.tasks.find({}).to_list(length=None)
        
        # Clean MongoDB ObjectIds
        users = clean_mongo_docs(users_raw)
        teams = clean_mongo_docs(teams_raw)
        projects = clean_mongo_docs(projects_raw)
        tasks = clean_mongo_docs(tasks_raw)
        
        # Filter tasks for organization projects
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Analyze current resource allocation with enhanced metrics
        resource_analysis = analyze_enhanced_resource_utilization(users, org_tasks, projects, teams)
        
        # Prepare AI context
        ai_context = {
            "organization_metrics": {
                "total_users": len(users),
                "total_projects": len(projects),
                "total_tasks": len(org_tasks),
                "active_projects": len([p for p in projects if p.get("status") == "active"])
            },
            "resource_utilization": resource_analysis["user_workloads"][:10],  # Top 10 for AI analysis
            "skill_gaps": identify_skill_gaps(users, org_tasks),
            "overloaded_resources": [u for u in resource_analysis["user_workloads"] if u["capacity_utilization"] > 85],
            "underutilized_resources": [u for u in resource_analysis["user_workloads"] if u["capacity_utilization"] < 40],
            "high_priority_tasks": [t for t in org_tasks if t.get("priority") in ["high", "critical"] and t.get("status") in ["todo", "in_progress"]]
        }
        
        # Get AI recommendations
        ai_chat = await get_ai_chat()
        prompt = f"""
        Analyze this resource allocation scenario and provide optimization recommendations:
        
        Current State:
        - {ai_context['organization_metrics']['total_users']} team members
        - {ai_context['organization_metrics']['total_projects']} projects ({ai_context['organization_metrics']['active_projects']} active)
        - {ai_context['organization_metrics']['total_tasks']} tasks
        - {len(ai_context['overloaded_resources'])} overloaded resources (>85% capacity)
        - {len(ai_context['underutilized_resources'])} underutilized resources (<40% capacity)
        - {len(ai_context['high_priority_tasks'])} high-priority tasks pending
        
        Resource Details: {json.dumps(ai_context, indent=2)}
        
        Provide specific recommendations for:
        1. Task redistribution opportunities
        2. Skills-based assignment improvements  
        3. Capacity optimization strategies
        4. Training/hiring recommendations
        5. Workload balancing actions
        
        Format as JSON with actionable recommendations.
        """
        
        ai_response = await ai_chat.send_message(UserMessage(text=prompt))
        
        # Process AI recommendations
        ai_recommendations = parse_ai_recommendations(ai_response)
        
        # Generate optimization strategies
        optimization_strategies = generate_optimization_strategies(resource_analysis, ai_context)
        
        # Calculate potential improvements
        improvement_metrics = calculate_improvement_potential(resource_analysis, ai_recommendations)
        
        return {
            "current_state": resource_analysis,
            "ai_recommendations": ai_recommendations,
            "optimization_strategies": optimization_strategies,
            "improvement_metrics": improvement_metrics,
            "action_items": generate_action_items(ai_recommendations, resource_analysis),
            "priority_assignments": suggest_priority_assignments(org_tasks, users),
            "capacity_forecast": forecast_capacity_needs(projects, org_tasks, users)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI resource allocation: {str(e)}"
        )

@router.get("/skills/assignment", response_model=Dict[str, Any])
async def get_skills_based_assignment(
    task_id: Optional[str] = Query(None, description="Specific task ID for assignment"),
    current_user: User = Depends(get_current_active_user)
):
    """Skills-based task assignment recommendations with AI matching"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        users_raw = await db.users.find({"organization_id": org_id}).to_list(length=None)
        tasks_raw = await db.tasks.find({}).to_list(length=None)
        projects_raw = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        
        # Clean MongoDB ObjectIds
        users = clean_mongo_docs(users_raw)
        tasks = clean_mongo_docs(tasks_raw)
        projects = clean_mongo_docs(projects_raw)
        
        # Filter for organization tasks
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Focus on specific task or all unassigned tasks
        target_tasks = []
        if task_id:
            target_tasks = [t for t in org_tasks if t["id"] == task_id]
        else:
            target_tasks = [t for t in org_tasks if not t.get("assignee_id") and t.get("status") == "todo"]
        
        assignment_recommendations = []
        
        for task in target_tasks[:20]:  # Limit for performance
            # Analyze task requirements
            task_requirements = extract_task_requirements(task)
            
            # Find best matches
            candidate_users = []
            for user in users:
                match_score = calculate_skill_match(user, task_requirements)
                availability_score = calculate_availability_score(user, org_tasks)
                workload_score = calculate_workload_score(user, org_tasks)
                
                overall_score = (match_score * 0.5) + (availability_score * 0.3) + (workload_score * 0.2)
                
                candidate_users.append({
                    "user_id": user["id"],
                    "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                    "role": user.get("role", "member"),
                    "skills": user.get("skills", []),
                    "match_score": round(match_score, 1),
                    "availability_score": round(availability_score, 1),
                    "workload_score": round(workload_score, 1),
                    "overall_score": round(overall_score, 1),
                    "current_tasks": len([t for t in org_tasks if t.get("assignee_id") == user["id"] and t.get("status") in ["todo", "in_progress"]]),
                    "recommendation_reason": generate_assignment_reason(user, task, match_score, availability_score, workload_score)
                })
            
            # Sort by overall score
            candidate_users.sort(key=lambda x: x["overall_score"], reverse=True)
            
            assignment_recommendations.append({
                "task": {
                    "id": task["id"],
                    "title": task["title"],
                    "priority": task.get("priority", "medium"),
                    "estimated_hours": task.get("estimated_hours", 0),
                    "due_date": task.get("due_date"),
                    "project_id": task.get("project_id"),
                    "requirements": task_requirements
                },
                "recommended_assignees": candidate_users[:5],  # Top 5 candidates
                "assignment_confidence": calculate_assignment_confidence(candidate_users[:3]) if candidate_users else 0
            })
        
        # Get AI insights for assignment strategy
        ai_chat = await get_ai_chat()
        ai_prompt = f"""
        Analyze these skills-based task assignment recommendations:
        
        Tasks to Assign: {len(assignment_recommendations)}
        Available Team Members: {len(users)}
        
        Top Assignment Recommendations:
        {json.dumps(assignment_recommendations[:5], indent=2)}
        
        Provide strategic insights on:
        1. Assignment optimization opportunities
        2. Skills development priorities 
        3. Team balance considerations
        4. Potential bottlenecks or conflicts
        """
        
        ai_insights = await ai_chat.send_message(UserMessage(text=ai_prompt))
        
        return {
            "assignment_recommendations": assignment_recommendations,
            "skills_analysis": analyze_team_skills(users),
            "ai_insights": parse_ai_insights(ai_insights),
            "assignment_strategy": {
                "total_unassigned_tasks": len(target_tasks),
                "recommended_assignments": len(assignment_recommendations),
                "high_confidence_matches": len([r for r in assignment_recommendations if r["assignment_confidence"] > 80]),
                "skills_gaps_identified": identify_assignment_skill_gaps(assignment_recommendations)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get skills-based assignment: {str(e)}"
        )

@router.get("/capacity/planning", response_model=Dict[str, Any])
async def get_capacity_planning(
    weeks_ahead: int = Query(4, description="Weeks to forecast ahead"),
    current_user: User = Depends(get_current_active_user)
):
    """Advanced capacity planning with predictive analytics and forecasting"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        users_raw = await db.users.find({"organization_id": org_id}).to_list(length=None)
        projects_raw = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks_raw = await db.tasks.find({}).to_list(length=None)
        teams_raw = await db.teams.find({"organization_id": org_id}).to_list(length=None)
        
        # Clean MongoDB ObjectIds
        users = clean_mongo_docs(users_raw)
        projects = clean_mongo_docs(projects_raw)
        tasks = clean_mongo_docs(tasks_raw)
        teams = clean_mongo_docs(teams_raw)
        
        # Filter tasks for organization
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Current capacity analysis
        current_capacity = analyze_current_capacity(users, org_tasks)
        
        # Forecast future capacity needs
        capacity_forecast = forecast_capacity_requirements(projects, org_tasks, weeks_ahead)
        
        # Identify potential bottlenecks
        bottlenecks = identify_capacity_bottlenecks(current_capacity, capacity_forecast)
        
        # Team-level capacity analysis
        team_capacity = analyze_team_capacity(teams, users, org_tasks)
        
        # Generate capacity recommendations with AI
        ai_chat = await get_ai_chat()
        ai_prompt = f"""
        Analyze this capacity planning scenario for the next {weeks_ahead} weeks:
        
        Current Capacity:
        - Total team members: {len(users)}
        - Current utilization: {current_capacity['average_utilization']}%
        - Overloaded members: {len(current_capacity['overloaded_users'])}
        - Available capacity: {current_capacity['available_capacity_hours']} hours
        
        Upcoming Demands:
        - New tasks in pipeline: {capacity_forecast['upcoming_tasks']}
        - Estimated hours needed: {capacity_forecast['total_hours_needed']}
        - High-priority projects: {len([p for p in projects if p.get('priority') in ['high', 'critical']])}
        
        Identified Bottlenecks: {json.dumps(bottlenecks, indent=2)}
        
        Provide strategic capacity planning recommendations including:
        1. Resource allocation adjustments
        2. Hiring needs assessment  
        3. Skills training priorities
        4. Timeline risk mitigation
        5. Capacity optimization strategies
        """
        
        ai_recommendations = await ai_chat.send_message(UserMessage(text=ai_prompt))
        
        # Generate capacity optimization plan
        optimization_plan = generate_capacity_optimization_plan(
            current_capacity, capacity_forecast, bottlenecks
        )
        
        return {
            "current_capacity": current_capacity,
            "capacity_forecast": capacity_forecast,
            "team_capacity": team_capacity,
            "bottlenecks": bottlenecks,
            "ai_recommendations": parse_ai_recommendations(ai_recommendations),
            "optimization_plan": optimization_plan,
            "capacity_metrics": {
                "total_capacity_hours": sum(40 for _ in users) * weeks_ahead,  # Assume 40h/week
                "projected_demand_hours": capacity_forecast['total_hours_needed'],
                "capacity_gap": capacity_forecast['total_hours_needed'] - (sum(40 for _ in users) * weeks_ahead),
                "utilization_efficiency": calculate_utilization_efficiency(current_capacity),
                "capacity_trend": calculate_capacity_trend(users, org_tasks)
            },
            "recommendations": {
                "immediate_actions": generate_immediate_capacity_actions(bottlenecks),
                "medium_term_planning": generate_medium_term_capacity_plan(capacity_forecast),
                "long_term_strategy": generate_long_term_capacity_strategy(team_capacity)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get capacity planning: {str(e)}"
        )

@router.get("/conflicts/detection", response_model=Dict[str, Any])
async def detect_resource_conflicts(
    current_user: User = Depends(get_current_active_user)
):
    """Automated resource conflict detection with resolution suggestions"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        users_raw = await db.users.find({"organization_id": org_id}).to_list(length=None)
        projects_raw = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks_raw = await db.tasks.find({}).to_list(length=None)
        
        # Clean MongoDB ObjectIds
        users = clean_mongo_docs(users_raw)
        projects = clean_mongo_docs(projects_raw)
        tasks = clean_mongo_docs(tasks_raw)
        
        # Filter tasks for organization
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Detect different types of conflicts
        conflicts = {
            "scheduling_conflicts": detect_scheduling_conflicts(org_tasks, users),
            "workload_conflicts": detect_workload_conflicts(users, org_tasks),
            "skill_conflicts": detect_skill_conflicts(org_tasks, users),
            "priority_conflicts": detect_priority_conflicts(org_tasks, projects),
            "deadline_conflicts": detect_deadline_conflicts(org_tasks, projects)
        }
        
        # Calculate conflict severity
        conflict_severity = calculate_conflict_severity(conflicts)
        
        # Generate resolution suggestions with AI
        ai_chat = await get_ai_chat()
        ai_prompt = f"""
        Analyze these resource conflicts and provide resolution strategies:
        
        Detected Conflicts:
        - Scheduling conflicts: {len(conflicts['scheduling_conflicts'])}
        - Workload conflicts: {len(conflicts['workload_conflicts'])}
        - Skill conflicts: {len(conflicts['skill_conflicts'])}
        - Priority conflicts: {len(conflicts['priority_conflicts'])}
        - Deadline conflicts: {len(conflicts['deadline_conflicts'])}
        
        Conflict Details: {json.dumps(conflicts, indent=2)[:2000]}...
        
        Provide specific resolution strategies for each conflict type:
        1. Immediate mitigation actions
        2. Resource reallocation suggestions
        3. Timeline adjustment recommendations
        4. Preventive measures for future conflicts
        """
        
        ai_resolutions = await ai_chat.send_message(UserMessage(text=ai_prompt))
        
        # Generate automated resolution suggestions
        resolution_suggestions = generate_conflict_resolutions(conflicts, users, org_tasks)
        
        return {
            "conflicts": conflicts,
            "conflict_summary": {
                "total_conflicts": sum(len(v) for v in conflicts.values()),
                "severity_level": conflict_severity,
                "critical_conflicts": get_critical_conflicts(conflicts),
                "affected_users": get_affected_users(conflicts),
                "affected_projects": get_affected_projects(conflicts, projects)
            },
            "ai_resolutions": parse_ai_recommendations(ai_resolutions),
            "automated_suggestions": resolution_suggestions,
            "conflict_matrix": generate_conflict_matrix(conflicts),
            "resolution_priority": prioritize_conflict_resolutions(conflicts, conflict_severity)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect resource conflicts: {str(e)}"
        )

@router.get("/workload/balancing", response_model=Dict[str, Any])
async def get_workload_balancing(
    current_user: User = Depends(get_current_active_user)
):
    """Real-time workload balancing with automated recommendations"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        users_raw = await db.users.find({"organization_id": org_id}).to_list(length=None)
        projects_raw = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks_raw = await db.tasks.find({}).to_list(length=None)
        teams_raw = await db.teams.find({"organization_id": org_id}).to_list(length=None)
        
        # Clean MongoDB ObjectIds
        users = clean_mongo_docs(users_raw)
        projects = clean_mongo_docs(projects_raw)
        tasks = clean_mongo_docs(tasks_raw)
        teams = clean_mongo_docs(teams_raw)
        
        # Filter tasks for organization
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Analyze current workload distribution
        workload_analysis = analyze_workload_distribution(users, org_tasks)
        
        # Identify balancing opportunities
        balancing_opportunities = identify_balancing_opportunities(workload_analysis, org_tasks)
        
        # Generate balancing recommendations
        balancing_recommendations = generate_workload_balancing_recommendations(
            workload_analysis, balancing_opportunities, users, org_tasks
        )
        
        # Get AI-powered balancing strategy
        ai_chat = await get_ai_chat()
        ai_prompt = f"""
        Analyze this workload distribution and provide balancing strategy:
        
        Workload Analysis:
        - Team members: {len(users)}
        - Overloaded (>80% capacity): {len(workload_analysis['overloaded'])}
        - Optimal (40-80% capacity): {len(workload_analysis['optimal'])}
        - Underutilized (<40% capacity): {len(workload_analysis['underutilized'])}
        
        Current Distribution: {json.dumps(workload_analysis, indent=2)[:1500]}
        
        Balancing Opportunities: {len(balancing_opportunities)} identified
        
        Provide intelligent workload balancing strategy:
        1. Task redistribution priorities
        2. Skill-based reallocation suggestions
        3. Team collaboration improvements
        4. Performance optimization tactics
        5. Sustainable workload management
        """
        
        ai_strategy = await ai_chat.send_message(UserMessage(text=ai_prompt))
        
        # Calculate balancing impact
        balancing_impact = calculate_balancing_impact(balancing_recommendations, workload_analysis)
        
        return {
            "current_workload": workload_analysis,
            "balancing_opportunities": balancing_opportunities,
            "recommendations": balancing_recommendations,
            "ai_strategy": parse_ai_recommendations(ai_strategy),
            "balancing_impact": balancing_impact,
            "workload_metrics": {
                "average_utilization": workload_analysis["average_utilization"],
                "utilization_variance": calculate_utilization_variance(workload_analysis),
                "balancing_score": calculate_balancing_score(workload_analysis),
                "efficiency_potential": calculate_efficiency_potential(balancing_recommendations)
            },
            "team_balance": analyze_team_workload_balance(teams, users, org_tasks),
            "alerts": generate_workload_alerts(workload_analysis, balancing_opportunities)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workload balancing: {str(e)}"
        )

@router.get("/skills/gap-analysis", response_model=Dict[str, Any])  
async def get_skills_gap_analysis(
    current_user: User = Depends(get_current_active_user)
):
    """Comprehensive skills gap analysis with training and hiring recommendations"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        users_raw = await db.users.find({"organization_id": org_id}).to_list(length=None)
        projects_raw = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks_raw = await db.tasks.find({}).to_list(length=None)
        teams_raw = await db.teams.find({"organization_id": org_id}).to_list(length=None)
        
        # Clean MongoDB ObjectIds
        users = clean_mongo_docs(users_raw)
        projects = clean_mongo_docs(projects_raw)
        tasks = clean_mongo_docs(tasks_raw)
        teams = clean_mongo_docs(teams_raw)
        
        # Filter tasks for organization
        project_ids = [p["id"] for p in projects]
        org_tasks = [t for t in tasks if t.get("project_id") in project_ids]
        
        # Analyze current skills inventory
        skills_inventory = analyze_skills_inventory(users, teams)
        
        # Analyze skills demand from projects and tasks
        skills_demand = analyze_skills_demand(projects, org_tasks)
        
        # Identify skills gaps
        skills_gaps = identify_skills_gaps(skills_inventory, skills_demand)
        
        # Analyze skills distribution across teams
        team_skills_analysis = analyze_team_skills_distribution(teams, users)
        
        # Get AI-powered skills strategy
        ai_chat = await get_ai_chat()
        ai_prompt = f"""
        Analyze this organizational skills landscape and provide strategic recommendations:
        
        Current Skills Inventory:
        - Total team members: {len(users)}
        - Unique skills identified: {len(skills_inventory['all_skills'])}
        - Skills coverage: {skills_inventory['coverage_percentage']}%
        
        Skills Demand Analysis:
        - Projects requiring skills: {len(projects)}
        - Tasks with skill requirements: {len([t for t in org_tasks if t.get('required_skills')])}
        - High-demand skills: {skills_demand['high_demand_skills'][:10]}
        
        Identified Gaps: {json.dumps(skills_gaps, indent=2)[:1500]}
        
        Provide comprehensive skills development strategy:
        1. Critical skills gaps to address immediately
        2. Training program recommendations
        3. Strategic hiring priorities
        4. Skills development pathways
        5. Knowledge transfer opportunities
        """
        
        ai_strategy = await ai_chat.send_message(UserMessage(text=ai_prompt))
        
        # Generate development recommendations
        development_recommendations = generate_skills_development_plan(
            skills_gaps, skills_inventory, users, teams
        )
        
        # Calculate skills ROI
        skills_roi = calculate_skills_development_roi(development_recommendations, skills_gaps)
        
        return {
            "skills_inventory": skills_inventory,
            "skills_demand": skills_demand,
            "skills_gaps": skills_gaps,
            "team_skills_analysis": team_skills_analysis,
            "ai_strategy": parse_ai_recommendations(ai_strategy),
            "development_recommendations": development_recommendations,
            "skills_metrics": {
                "skills_coverage_score": calculate_skills_coverage_score(skills_inventory, skills_demand),
                "skills_diversity_index": calculate_skills_diversity_index(skills_inventory),
                "critical_gaps_count": len(skills_gaps["critical_gaps"]),
                "development_priority_score": calculate_development_priority_score(skills_gaps)
            },
            "skills_roi": skills_roi,
            "hiring_strategy": generate_hiring_strategy(skills_gaps, team_skills_analysis),
            "training_roadmap": generate_training_roadmap(development_recommendations, skills_gaps)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get skills gap analysis: {str(e)}"
        )

# Enhanced helper functions for resource management algorithms
def analyze_enhanced_resource_utilization(users, tasks, projects, teams):
    """Enhanced resource utilization analysis with advanced metrics"""
    import statistics
    
    user_workloads = []
    team_metrics = {}
    
    # Build team lookup
    team_lookup = {team["id"]: team for team in teams}
    
    for user in users:
        user_id = user["id"]
        user_tasks = [t for t in tasks if t.get("assignee_id") == user_id]
        
        active_tasks = len([t for t in user_tasks if t.get("status") in ["todo", "in_progress"]])
        completed_tasks = len([t for t in user_tasks if t.get("status") == "completed"])
        
        # Enhanced workload metrics
        estimated_hours = sum(t.get("estimated_hours", 8) for t in user_tasks if t.get("status") in ["todo", "in_progress"])
        actual_hours = sum(t.get("actual_hours", 0) for t in user_tasks)
        
        # Priority-weighted workload
        priority_weights = {"critical": 3, "high": 2, "medium": 1, "low": 0.5}
        weighted_workload = sum(
            t.get("estimated_hours", 8) * priority_weights.get(t.get("priority", "medium"), 1)
            for t in user_tasks if t.get("status") in ["todo", "in_progress"]
        )
        
        # Overdue tasks analysis
        overdue_tasks = 0
        for t in user_tasks:
            if t.get("due_date") and t.get("status") in ["todo", "in_progress"]:
                try:
                    due_date = datetime.fromisoformat(t["due_date"].replace("Z", "+00:00"))
                    if due_date < datetime.utcnow():
                        overdue_tasks += 1
                except:
                    pass
        
        # Calculate capacity utilization with context
        base_capacity = 40  # Standard work week
        utilization = min(100, (estimated_hours / base_capacity) * 100)
        
        # Skills assessment
        user_skills = user.get("skills", [])
        skill_count = len(user_skills)
        avg_skill_level = statistics.mean([skill.get("level", 5) for skill in user_skills]) if user_skills else 0
        
        # Performance indicators
        efficiency_ratio = (actual_hours / max(estimated_hours, 1)) if estimated_hours > 0 else 1.0
        task_completion_rate = (completed_tasks / max(len(user_tasks), 1)) * 100
        
        # Stress and availability assessment
        stress_factors = {
            "overdue_tasks": overdue_tasks * 15,
            "high_workload": max(0, (utilization - 80)) * 0.5,
            "task_count": min(active_tasks * 2, 20)
        }
        stress_score = min(100, sum(stress_factors.values()))
        
        availability_status = determine_enhanced_availability(utilization, stress_score, overdue_tasks)
        
        user_workload = {
            "user_id": user_id,
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "role": user.get("role", "member"),
            "department": user.get("department", "Unknown"),
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks,
            "estimated_hours": estimated_hours,
            "actual_hours": actual_hours,
            "weighted_workload": weighted_workload,
            "capacity_utilization": round(utilization, 1),
            "overdue_tasks": overdue_tasks,
            "skill_count": skill_count,
            "avg_skill_level": round(avg_skill_level, 1),
            "efficiency_ratio": round(efficiency_ratio, 2),
            "task_completion_rate": round(task_completion_rate, 1),
            "stress_score": round(stress_score, 1),
            "availability_status": availability_status,
            "skills": [skill.get("name", "") for skill in user_skills]
        }
        
        user_workloads.append(user_workload)
    
    # Calculate team-level metrics
    for team in teams:
        team_members = [u for u in user_workloads if u["user_id"] in [m.get("user_id", "") for m in team.get("members", [])]]
        
        if team_members:
            team_metrics[team["id"]] = {
                "team_name": team["name"],
                "member_count": len(team_members),
                "avg_utilization": round(statistics.mean([m["capacity_utilization"] for m in team_members]), 1),
                "total_hours": sum(m["estimated_hours"] for m in team_members),
                "avg_stress": round(statistics.mean([m["stress_score"] for m in team_members]), 1),
                "overloaded_members": len([m for m in team_members if m["stress_score"] > 70]),
                "available_members": len([m for m in team_members if m["availability_status"] == "available"])
            }
    
    # Overall organizational metrics
    all_utilizations = [u["capacity_utilization"] for u in user_workloads]
    utilization_balance = round(100 - (statistics.stdev(all_utilizations) if len(all_utilizations) > 1 else 0), 1)
    
    return {
        "user_workloads": user_workloads,
        "team_metrics": team_metrics,
        "organizational_metrics": {
            "average_utilization": round(statistics.mean(all_utilizations) if all_utilizations else 0, 1),
            "utilization_balance": utilization_balance,
            "total_capacity_hours": len(users) * 40,
            "utilized_hours": sum(u["estimated_hours"] for u in user_workloads),
            "available_capacity_hours": (len(users) * 40) - sum(u["estimated_hours"] for u in user_workloads),
            "high_performers": len([u for u in user_workloads if u["efficiency_ratio"] > 1.1 and u["task_completion_rate"] > 80]),
            "at_risk_members": len([u for u in user_workloads if u["stress_score"] > 80])
        }
    }

def determine_enhanced_availability(utilization, stress_score, overdue_tasks):
    """Determine availability status with enhanced logic"""
    if stress_score > 80 or overdue_tasks > 3:
        return "critical"
    elif utilization > 90 or stress_score > 60:
        return "overloaded"
    elif utilization > 70 or overdue_tasks > 0:
        return "busy"
    elif utilization < 30:
        return "available"
    else:
        return "optimal"

def analyze_resource_utilization(users, tasks, projects):
    """Analyze current resource utilization across the organization"""
    user_workloads = []
    
    for user in users:
        user_id = user["id"]
        user_tasks = [t for t in tasks if t.get("assignee_id") == user_id]
        
        active_tasks = len([t for t in user_tasks if t.get("status") in ["todo", "in_progress"]])
        completed_tasks = len([t for t in user_tasks if t.get("status") == "completed"])
        
        # Calculate workload metrics
        estimated_hours = sum(t.get("estimated_hours", 8) for t in user_tasks if t.get("status") in ["todo", "in_progress"])
        capacity_utilization = min(100, (estimated_hours / 40) * 100)  # Assume 40h/week capacity
        
        user_workloads.append({
            "user_id": user_id,
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "role": user.get("role", "member"),
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks,
            "estimated_hours": estimated_hours,
            "capacity_utilization": round(capacity_utilization, 1),
            "skills": user.get("skills", []),
            "availability_status": "available" if capacity_utilization < 60 else "busy" if capacity_utilization < 85 else "overloaded"
        })
    
    return {
        "user_workloads": user_workloads,
        "average_utilization": round(sum(u["capacity_utilization"] for u in user_workloads) / len(user_workloads), 1) if user_workloads else 0,
        "total_capacity_hours": len(users) * 40,
        "utilized_hours": sum(u["estimated_hours"] for u in user_workloads),
        "available_capacity_hours": (len(users) * 40) - sum(u["estimated_hours"] for u in user_workloads)
    }

def identify_skill_gaps(users, tasks):
    """Identify skills gaps in the organization"""
    # Extract skills from users
    current_skills = set()
    for user in users:
        for skill in user.get("skills", []):
            if isinstance(skill, dict):
                current_skills.add(skill.get("name", ""))
            else:
                current_skills.add(skill)
    
    # Extract required skills from tasks (simplified)
    required_skills = set()
    for task in tasks:
        # This is a simplified implementation - in reality, you'd have more sophisticated skill extraction
        title_lower = task.get("title", "").lower()
        if "react" in title_lower or "frontend" in title_lower:
            required_skills.add("React")
        if "python" in title_lower or "backend" in title_lower:
            required_skills.add("Python")
        if "design" in title_lower:
            required_skills.add("UI/UX Design")
    
    missing_skills = required_skills - current_skills
    
    return {
        "current_skills": list(current_skills),
        "required_skills": list(required_skills),
        "missing_skills": list(missing_skills),
        "coverage_percentage": round((len(current_skills & required_skills) / max(len(required_skills), 1)) * 100, 1)
    }

def parse_ai_recommendations(ai_response):
    """Parse AI response and extract structured recommendations"""
    try:
        # Try to parse as JSON first
        if hasattr(ai_response, 'strip'):
            response_text = ai_response.strip()
        else:
            response_text = str(ai_response).strip()
            
        # Look for JSON content
        if "{" in response_text and "}" in response_text:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            json_content = response_text[json_start:json_end]
            return json.loads(json_content)
        else:
            # Return structured text analysis
            return {
                "recommendations": response_text.split("\n"),
                "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text
            }
    except:
        return {
            "recommendations": ["AI analysis available - see raw response"],
            "raw_response": str(ai_response)[:500]
        }

def generate_optimization_strategies(resource_analysis, ai_context):
    """Generate resource optimization strategies"""
    strategies = []
    
    # Workload balancing strategy
    overloaded = len(ai_context["overloaded_resources"])
    underutilized = len(ai_context["underutilized_resources"])
    
    if overloaded > 0 and underutilized > 0:
        strategies.append({
            "type": "workload_balancing",
            "priority": "high",
            "description": f"Redistribute tasks from {overloaded} overloaded to {underutilized} underutilized resources",
            "impact": "immediate",
            "effort": "medium"
        })
    
    # Skills development strategy
    if ai_context["skill_gaps"]["missing_skills"]:
        strategies.append({
            "type": "skills_development", 
            "priority": "medium",
            "description": f"Address {len(ai_context['skill_gaps']['missing_skills'])} missing skills through training",
            "impact": "long_term",
            "effort": "high"
        })
    
    return strategies

def calculate_improvement_potential(resource_analysis, ai_recommendations):
    """Calculate potential improvements from AI recommendations"""
    current_avg = resource_analysis["average_utilization"]
    
    return {
        "current_efficiency": round(current_avg, 1),
        "potential_efficiency": min(85, current_avg + 15),  # Assume 15% improvement potential
        "efficiency_gain": 15,
        "estimated_time_savings": "5-10 hours per week per team member",
        "productivity_increase": "15-20%"
    }

def generate_action_items(ai_recommendations, resource_analysis):
    """Generate specific action items from analysis"""
    actions = []
    
    # Find overloaded users
    overloaded = [u for u in resource_analysis["user_workloads"] if u["capacity_utilization"] > 85]
    if overloaded:
        actions.append({
            "type": "immediate",
            "priority": "high",
            "action": f"Redistribute tasks from {len(overloaded)} overloaded team members",
            "assignees": [u["user_id"] for u in overloaded],
            "timeline": "This week"
        })
    
    # Find available capacity
    available = [u for u in resource_analysis["user_workloads"] if u["capacity_utilization"] < 60]
    if available:
        actions.append({
            "type": "opportunity", 
            "priority": "medium",
            "action": f"Assign additional tasks to {len(available)} available team members",
            "assignees": [u["user_id"] for u in available],
            "timeline": "Next 2 weeks"
        })
    
    return actions

def suggest_priority_assignments(tasks, users):
    """Suggest priority task assignments"""
    high_priority_tasks = [t for t in tasks if t.get("priority") in ["high", "critical"] and not t.get("assignee_id")]
    
    suggestions = []
    for task in high_priority_tasks[:10]:  # Top 10 priority tasks
        # Simple assignment logic - find users with relevant skills
        best_user = None
        best_score = 0
        
        for user in users:
            score = calculate_simple_match_score(user, task)
            if score > best_score:
                best_score = score
                best_user = user
        
        if best_user:
            suggestions.append({
                "task_id": task["id"],
                "task_title": task["title"],
                "recommended_user": best_user["id"],
                "user_name": f"{best_user.get('first_name', '')} {best_user.get('last_name', '')}".strip(),
                "confidence": round(best_score, 1),
                "reason": "High priority task matched with available skilled resource"
            })
    
    return suggestions

def forecast_capacity_needs(projects, tasks, users):
    """Forecast future capacity needs"""
    upcoming_tasks = len([t for t in tasks if t.get("status") == "todo"])
    estimated_hours = sum(t.get("estimated_hours", 8) for t in tasks if t.get("status") == "todo")
    
    return {
        "upcoming_tasks": upcoming_tasks,
        "total_hours_needed": estimated_hours,
        "current_team_capacity": len(users) * 40,  # 40 hours per week
        "capacity_gap": max(0, estimated_hours - (len(users) * 40)),
        "recommended_team_size": max(len(users), int(estimated_hours / 40) + 1)
    }

def calculate_simple_match_score(user, task):
    """Simple skill matching algorithm"""
    base_score = 50  # Base score for any assignment
    
    # Bonus for role alignment
    user_role = user.get("role", "member").lower()
    task_title = task.get("title", "").lower()
    
    if "admin" in user_role and "management" in task_title:
        base_score += 20
    elif "lead" in user_role and ("review" in task_title or "planning" in task_title):
        base_score += 15
    
    # Bonus for skills (simplified)
    user_skills = user.get("skills", [])
    if user_skills:
        base_score += min(20, len(user_skills) * 5)
    
    return min(100, base_score)

# Additional helper functions for other endpoints would go here...
# (Due to length constraints, I'll implement the remaining functions in the next file)

def extract_task_requirements(task):
    """Extract skill requirements from task"""
    # Simplified implementation
    title = task.get("title", "").lower()
    requirements = []
    
    if "react" in title or "frontend" in title:
        requirements.append("Frontend Development")
    if "python" in title or "backend" in title:
        requirements.append("Backend Development") 
    if "design" in title:
        requirements.append("UI/UX Design")
    if "test" in title:
        requirements.append("Quality Assurance")
        
    return requirements

def calculate_skill_match(user, task_requirements):
    """Calculate skill match score between user and task"""
    if not task_requirements:
        return 60  # Base score for general tasks
    
    user_skills = user.get("skills", [])
    user_skill_names = []
    
    for skill in user_skills:
        if isinstance(skill, dict):
            user_skill_names.append(skill.get("name", "").lower())
        else:
            user_skill_names.append(str(skill).lower())
    
    matches = 0
    for req in task_requirements:
        if any(req.lower() in skill for skill in user_skill_names):
            matches += 1
    
    return min(100, 50 + (matches / max(len(task_requirements), 1)) * 50)

def calculate_availability_score(user, tasks):
    """Calculate user availability score"""
    user_tasks = [t for t in tasks if t.get("assignee_id") == user["id"] and t.get("status") in ["todo", "in_progress"]]
    workload = len(user_tasks)
    
    if workload == 0:
        return 100
    elif workload <= 3:
        return 80
    elif workload <= 6:
        return 60
    elif workload <= 10:
        return 40
    else:
        return 20

def calculate_workload_score(user, tasks):
    """Calculate workload appropriateness score"""
    user_tasks = [t for t in tasks if t.get("assignee_id") == user["id"] and t.get("status") in ["todo", "in_progress"]]
    estimated_hours = sum(t.get("estimated_hours", 8) for t in user_tasks)
    
    # Optimal workload is around 32-40 hours per week
    if estimated_hours <= 40:
        return 100
    elif estimated_hours <= 50:
        return 80
    elif estimated_hours <= 60:
        return 60
    else:
        return 40

def generate_assignment_reason(user, task, match_score, availability_score, workload_score):
    """Generate human-readable assignment reasoning"""
    reasons = []
    
    if match_score > 80:
        reasons.append("Excellent skill match")
    elif match_score > 60:
        reasons.append("Good skill alignment")
    
    if availability_score > 80:
        reasons.append("High availability")
    elif availability_score > 60:
        reasons.append("Moderate availability")
    
    if workload_score > 80:
        reasons.append("Optimal workload")
    elif workload_score > 60:
        reasons.append("Manageable workload")
    
    return "; ".join(reasons) if reasons else "Standard assignment"

def calculate_assignment_confidence(top_candidates):
    """Calculate confidence in assignment recommendations"""
    if not top_candidates:
        return 0
    
    best_score = top_candidates[0]["overall_score"]
    if len(top_candidates) > 1:
        second_score = top_candidates[1]["overall_score"]
        score_gap = best_score - second_score
        return min(100, 50 + score_gap)
    
    return min(100, best_score)

def analyze_team_skills(users):
    """Analyze overall team skills distribution"""
    all_skills = {}
    
    for user in users:
        for skill in user.get("skills", []):
            skill_name = skill.get("name", skill) if isinstance(skill, dict) else skill
            if skill_name:
                all_skills[skill_name] = all_skills.get(skill_name, 0) + 1
    
    return {
        "total_unique_skills": len(all_skills),
        "skill_distribution": dict(sorted(all_skills.items(), key=lambda x: x[1], reverse=True)),
        "most_common_skills": list(sorted(all_skills.items(), key=lambda x: x[1], reverse=True))[:10],
        "skill_coverage": calculate_skill_coverage_percentage(all_skills, len(users))
    }

def identify_assignment_skill_gaps(assignment_recommendations):
    """Identify skill gaps in assignment recommendations"""
    unassignable_tasks = []
    
    for rec in assignment_recommendations:
        if not rec["recommended_assignees"] or rec["assignment_confidence"] < 50:
            unassignable_tasks.append({
                "task_id": rec["task"]["id"],
                "task_title": rec["task"]["title"],
                "missing_skills": rec["task"]["requirements"],
                "confidence": rec["assignment_confidence"]
            })
    
    return unassignable_tasks

def parse_ai_insights(ai_response):
    """Parse AI insights into structured format"""
    return parse_ai_recommendations(ai_response)  # Reuse the same parsing logic

def calculate_skill_coverage_percentage(skills_dict, total_users):
    """Calculate skill coverage percentage"""
    if not skills_dict or total_users == 0:
        return 0
    
    covered_skills = len([skill for skill, count in skills_dict.items() if count >= 2])
    return round((covered_skills / max(len(skills_dict), 1)) * 100, 1)

# More helper functions continue...
def analyze_current_capacity(users, tasks):
    """Analyze current team capacity utilization"""
    user_capacity = []
    total_hours = 0
    
    for user in users:
        user_tasks = [t for t in tasks if t.get("assignee_id") == user["id"] and t.get("status") in ["todo", "in_progress"]]
        estimated_hours = sum(t.get("estimated_hours", 8) for t in user_tasks)
        utilization = min(100, (estimated_hours / 40) * 100)
        
        user_capacity.append({
            "user_id": user["id"],
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "current_hours": estimated_hours,
            "utilization_percent": round(utilization, 1),
            "available_hours": max(0, 40 - estimated_hours)
        })
        
        total_hours += estimated_hours
    
    average_utilization = (total_hours / (len(users) * 40)) * 100 if users else 0
    
    return {
        "user_capacity": user_capacity,
        "average_utilization": round(average_utilization, 1),
        "total_capacity_hours": len(users) * 40,
        "total_utilized_hours": total_hours,
        "available_capacity_hours": (len(users) * 40) - total_hours,
        "overloaded_users": [u for u in user_capacity if u["utilization_percent"] > 100],
        "underutilized_users": [u for u in user_capacity if u["utilization_percent"] < 60]
    }

def forecast_capacity_requirements(projects, tasks, weeks_ahead):
    """Forecast future capacity requirements"""
    upcoming_tasks = [t for t in tasks if t.get("status") == "todo"]
    pipeline_projects = [p for p in projects if p.get("status") in ["planning", "active"]]
    
    estimated_hours = sum(t.get("estimated_hours", 8) for t in upcoming_tasks)
    
    # Simple forecasting - distribute over weeks
    weekly_demand = estimated_hours / max(weeks_ahead, 1)
    
    return {
        "weeks_forecasted": weeks_ahead,
        "upcoming_tasks": len(upcoming_tasks),
        "pipeline_projects": len(pipeline_projects),
        "total_hours_needed": estimated_hours,
        "weekly_demand_hours": round(weekly_demand, 1),
        "demand_trend": "increasing" if len(pipeline_projects) > 5 else "stable"
    }

def identify_capacity_bottlenecks(current_capacity, forecast):
    """Identify potential capacity bottlenecks"""
    bottlenecks = []
    
    # Check overall capacity vs demand
    if forecast["total_hours_needed"] > current_capacity["available_capacity_hours"]:
        bottlenecks.append({
            "type": "overall_capacity",
            "severity": "high",
            "description": f"Demand ({forecast['total_hours_needed']}h) exceeds available capacity ({current_capacity['available_capacity_hours']}h)",
            "shortfall": forecast["total_hours_needed"] - current_capacity["available_capacity_hours"]
        })
    
    # Check for overloaded individuals
    if current_capacity["overloaded_users"]:
        bottlenecks.append({
            "type": "individual_overload", 
            "severity": "medium",
            "description": f"{len(current_capacity['overloaded_users'])} team members are overloaded",
            "affected_users": [u["user_id"] for u in current_capacity["overloaded_users"]]
        })
    
    return bottlenecks

def analyze_team_capacity(teams, users, tasks):
    """Analyze capacity at team level"""
    team_capacity = []
    
    for team in teams:
        team_id = team["id"]
        team_members = [u for u in users if team_id in u.get("team_memberships", [])]
        
        if not team_members:
            continue
            
        team_tasks = []
        for member in team_members:
            member_tasks = [t for t in tasks if t.get("assignee_id") == member["id"] and t.get("status") in ["todo", "in_progress"]]
            team_tasks.extend(member_tasks)
        
        total_hours = sum(t.get("estimated_hours", 8) for t in team_tasks)
        team_capacity_hours = len(team_members) * 40
        utilization = (total_hours / team_capacity_hours * 100) if team_capacity_hours > 0 else 0
        
        team_capacity.append({
            "team_id": team_id,
            "team_name": team["name"],
            "member_count": len(team_members),
            "total_capacity_hours": team_capacity_hours,
            "utilized_hours": total_hours,
            "utilization_percent": round(utilization, 1),
            "available_hours": team_capacity_hours - total_hours,
            "status": "overloaded" if utilization > 90 else "optimal" if utilization > 60 else "underutilized"
        })
    
    return team_capacity

def generate_capacity_optimization_plan(current_capacity, forecast, bottlenecks):
    """Generate comprehensive capacity optimization plan"""
    plan = {
        "immediate_actions": [],
        "short_term_plans": [],
        "long_term_strategies": []
    }
    
    # Immediate actions for bottlenecks
    for bottleneck in bottlenecks:
        if bottleneck["type"] == "overall_capacity":
            plan["immediate_actions"].append({
                "action": "Prioritize critical tasks and defer non-essential work",
                "timeline": "This week",
                "impact": "Reduce immediate capacity pressure"
            })
        elif bottleneck["type"] == "individual_overload":
            plan["immediate_actions"].append({
                "action": "Redistribute tasks from overloaded team members",
                "timeline": "Next 3 days", 
                "impact": "Balance individual workloads"
            })
    
    # Short-term capacity adjustments
    if forecast["demand_trend"] == "increasing":
        plan["short_term_plans"].append({
            "action": "Consider temporary contractors or consultants",
            "timeline": "Next 2-4 weeks",
            "impact": "Increase available capacity for peak demand"
        })
    
    # Long-term capacity strategy
    if len(bottlenecks) > 2:
        plan["long_term_strategies"].append({
            "action": "Plan for team expansion and skills development",
            "timeline": "Next 3-6 months",
            "impact": "Build sustainable capacity for growth"
        })
    
    return plan

def calculate_utilization_efficiency(current_capacity):
    """Calculate overall utilization efficiency score"""
    avg_util = current_capacity["average_utilization"]
    
    # Optimal utilization is around 70-80%
    if 70 <= avg_util <= 80:
        return 100
    elif 60 <= avg_util < 70 or 80 < avg_util <= 90:
        return 85
    elif 50 <= avg_util < 60 or 90 < avg_util <= 100:
        return 70
    else:
        return 50

def calculate_capacity_trend(users, tasks):
    """Calculate capacity utilization trend"""
    # Simplified trend calculation
    current_tasks = len([t for t in tasks if t.get("status") in ["todo", "in_progress"]])
    completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
    
    if current_tasks > completed_tasks:
        return "increasing"
    elif current_tasks < completed_tasks * 0.8:
        return "decreasing" 
    else:
        return "stable"

def generate_immediate_capacity_actions(bottlenecks):
    """Generate immediate capacity management actions"""
    actions = []
    
    for bottleneck in bottlenecks:
        if bottleneck["severity"] == "high":
            actions.append({
                "priority": "urgent",
                "action": f"Address {bottleneck['type']}: {bottleneck['description']}",
                "timeline": "24-48 hours"
            })
        elif bottleneck["severity"] == "medium":
            actions.append({
                "priority": "high", 
                "action": f"Resolve {bottleneck['type']} issue",
                "timeline": "This week"
            })
    
    return actions

def generate_medium_term_capacity_plan(forecast):
    """Generate medium-term capacity planning actions"""
    plans = []
    
    if forecast["demand_trend"] == "increasing":
        plans.append({
            "timeframe": "2-4 weeks",
            "action": "Scale up team capacity through temporary resources",
            "justification": "Increasing demand requires additional capacity"
        })
    
    if forecast["total_hours_needed"] > 0:
        plans.append({
            "timeframe": "1-2 months",
            "action": "Optimize workflows and improve productivity",
            "justification": "Efficiency improvements can increase effective capacity"
        })
    
    return plans

def generate_long_term_capacity_strategy(team_capacity):
    """Generate long-term capacity strategy"""
    strategies = []
    
    underutilized_teams = [t for t in team_capacity if t["status"] == "underutilized"]
    overloaded_teams = [t for t in team_capacity if t["status"] == "overloaded"]
    
    if len(overloaded_teams) > len(underutilized_teams):
        strategies.append({
            "timeframe": "3-6 months",
            "strategy": "Team expansion and hiring plan",
            "rationale": "Persistent capacity constraints require permanent team growth"
        })
    
    strategies.append({
        "timeframe": "6-12 months",
        "strategy": "Skills development and cross-training program",
        "rationale": "Increase team versatility and capacity flexibility"
    })
    
    return strategies

# Additional helper functions for conflict detection
def detect_scheduling_conflicts(tasks, users):
    """Detect scheduling conflicts in task assignments"""
    conflicts = []
    
    for user in users:
        user_tasks = [t for t in tasks if t.get("assignee_id") == user["id"] and t.get("status") in ["todo", "in_progress"]]
        
        # Check for overlapping due dates with high workload
        if len(user_tasks) > 5:  # Threshold for potential conflict
            urgent_tasks = [t for t in user_tasks if t.get("priority") in ["high", "critical"]]
            if len(urgent_tasks) > 2:
                conflicts.append({
                    "type": "scheduling_overload",
                    "user_id": user["id"],
                    "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                    "conflicting_tasks": len(urgent_tasks),
                    "severity": "high" if len(urgent_tasks) > 3 else "medium"
                })
    
    return conflicts

def detect_workload_conflicts(users, tasks):
    """Detect workload conflicts"""
    conflicts = []
    
    for user in users:
        user_tasks = [t for t in tasks if t.get("assignee_id") == user["id"] and t.get("status") in ["todo", "in_progress"]]
        estimated_hours = sum(t.get("estimated_hours", 8) for t in user_tasks)
        
        if estimated_hours > 50:  # More than 50 hours of work
            conflicts.append({
                "type": "workload_overload",
                "user_id": user["id"],
                "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "total_hours": estimated_hours,
                "overload_hours": estimated_hours - 40,
                "severity": "critical" if estimated_hours > 60 else "high"
            })
    
    return conflicts

def detect_skill_conflicts(tasks, users):
    """Detect skill-related conflicts"""
    conflicts = []
    
    # Find tasks that might not have appropriately skilled assignees
    for task in tasks:
        if task.get("assignee_id") and task.get("status") in ["todo", "in_progress"]:
            assignee = next((u for u in users if u["id"] == task["assignee_id"]), None)
            if assignee:
                task_requirements = extract_task_requirements(task)
                if task_requirements and not any(req.lower() in str(assignee.get("skills", [])).lower() for req in task_requirements):
                    conflicts.append({
                        "type": "skill_mismatch",
                        "task_id": task["id"],
                        "task_title": task["title"],
                        "assignee_id": assignee["id"],
                        "assignee_name": f"{assignee.get('first_name', '')} {assignee.get('last_name', '')}".strip(),
                        "required_skills": task_requirements,
                        "assignee_skills": assignee.get("skills", []),
                        "severity": "medium"
                    })
    
    return conflicts

def detect_priority_conflicts(tasks, projects):
    """Detect priority conflicts"""
    conflicts = []
    
    # Find projects with many high-priority tasks but limited resources
    for project in projects:
        project_tasks = [t for t in tasks if t.get("project_id") == project["id"]]
        high_priority_tasks = [t for t in project_tasks if t.get("priority") in ["high", "critical"]]
        
        if len(high_priority_tasks) > 5:  # Threshold for too many high-priority tasks
            conflicts.append({
                "type": "priority_overload",
                "project_id": project["id"],
                "project_name": project["name"],
                "high_priority_count": len(high_priority_tasks),
                "total_tasks": len(project_tasks),
                "severity": "high" if len(high_priority_tasks) > 8 else "medium"
            })
    
    return conflicts

def detect_deadline_conflicts(tasks, projects):
    """Detect deadline conflicts"""
    conflicts = []
    
    # Check for unrealistic deadlines based on workload
    for project in projects:
        project_tasks = [t for t in tasks if t.get("project_id") == project["id"] and t.get("status") in ["todo", "in_progress"]]
        
        if project.get("due_date"):
            try:
                project_due = datetime.fromisoformat(project["due_date"].replace("Z", "+00:00"))
                days_remaining = (project_due - datetime.utcnow()).days
                
                total_estimated_hours = sum(t.get("estimated_hours", 8) for t in project_tasks)
                required_daily_hours = total_estimated_hours / max(days_remaining, 1)
                
                if required_daily_hours > 16:  # More than 2 people working full time
                    conflicts.append({
                        "type": "deadline_pressure",
                        "project_id": project["id"],
                        "project_name": project["name"],
                        "days_remaining": days_remaining,
                        "total_hours_needed": total_estimated_hours,
                        "daily_hours_required": round(required_daily_hours, 1),
                        "severity": "critical" if required_daily_hours > 24 else "high"
                    })
            except:
                continue
    
    return conflicts

def calculate_conflict_severity(conflicts):
    """Calculate overall conflict severity level"""
    total_conflicts = sum(len(v) for v in conflicts.values())
    critical_conflicts = sum(1 for conflict_list in conflicts.values() 
                           for conflict in conflict_list 
                           if conflict.get("severity") == "critical")
    
    if critical_conflicts > 3:
        return "critical"
    elif total_conflicts > 10:
        return "high"
    elif total_conflicts > 5:
        return "medium"
    else:
        return "low"

def get_critical_conflicts(conflicts):
    """Extract critical conflicts"""
    critical = []
    for conflict_type, conflict_list in conflicts.items():
        critical.extend([c for c in conflict_list if c.get("severity") == "critical"])
    return critical

def get_affected_users(conflicts):
    """Get list of users affected by conflicts"""
    affected_users = set()
    
    for conflict_list in conflicts.values():
        for conflict in conflict_list:
            if "user_id" in conflict:
                affected_users.add(conflict["user_id"])
            if "assignee_id" in conflict:
                affected_users.add(conflict["assignee_id"])
    
    return list(affected_users)

def get_affected_projects(conflicts, projects):
    """Get list of projects affected by conflicts"""
    affected_project_ids = set()
    
    for conflict_list in conflicts.values():
        for conflict in conflict_list:
            if "project_id" in conflict:
                affected_project_ids.add(conflict["project_id"])
    
    affected_projects = [p for p in projects if p["id"] in affected_project_ids]
    return affected_projects

def generate_conflict_resolutions(conflicts, users, tasks):
    """Generate automated conflict resolution suggestions"""
    resolutions = []
    
    # Resolve workload conflicts
    for conflict in conflicts.get("workload_conflicts", []):
        resolutions.append({
            "conflict_id": f"workload_{conflict['user_id']}",
            "resolution_type": "task_redistribution",
            "description": f"Redistribute {conflict['overload_hours']} hours of work from {conflict['user_name']}",
            "priority": "high",
            "estimated_effort": "2-4 hours of planning"
        })
    
    # Resolve skill conflicts  
    for conflict in conflicts.get("skill_conflicts", []):
        resolutions.append({
            "conflict_id": f"skill_{conflict['task_id']}",
            "resolution_type": "reassignment",
            "description": f"Reassign task '{conflict['task_title']}' to team member with {', '.join(conflict['required_skills'])} skills",
            "priority": "medium",
            "estimated_effort": "1-2 hours"
        })
    
    return resolutions

def generate_conflict_matrix(conflicts):
    """Generate conflict analysis matrix"""
    matrix = {}
    
    for conflict_type, conflict_list in conflicts.items():
        matrix[conflict_type] = {
            "total": len(conflict_list),
            "critical": len([c for c in conflict_list if c.get("severity") == "critical"]),
            "high": len([c for c in conflict_list if c.get("severity") == "high"]),
            "medium": len([c for c in conflict_list if c.get("severity") == "medium"]),
            "low": len([c for c in conflict_list if c.get("severity") == "low"])
        }
    
    return matrix

def prioritize_conflict_resolutions(conflicts, severity):
    """Prioritize conflict resolutions based on severity and impact"""
    priorities = []
    
    # Critical conflicts first
    for conflict_type, conflict_list in conflicts.items():
        critical_conflicts = [c for c in conflict_list if c.get("severity") == "critical"]
        for conflict in critical_conflicts:
            priorities.append({
                "rank": 1,
                "conflict_type": conflict_type,
                "conflict_id": conflict.get("user_id") or conflict.get("task_id") or conflict.get("project_id"),
                "urgency": "immediate",
                "impact": "high"
            })
    
    return priorities[:10]  # Top 10 priorities

# Workload balancing helper functions
def analyze_workload_distribution(users, tasks):
    """Analyze current workload distribution across team"""
    user_workloads = []
    total_utilization = 0
    
    for user in users:
        user_tasks = [t for t in tasks if t.get("assignee_id") == user["id"] and t.get("status") in ["todo", "in_progress"]]
        estimated_hours = sum(t.get("estimated_hours", 8) for t in user_tasks)
        utilization = min(100, (estimated_hours / 40) * 100)
        
        user_workloads.append({
            "user_id": user["id"],
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "role": user.get("role", "member"),
            "current_hours": estimated_hours,
            "utilization_percent": round(utilization, 1),
            "task_count": len(user_tasks),
            "category": "overloaded" if utilization > 80 else "optimal" if utilization >= 40 else "underutilized"
        })
        
        total_utilization += utilization
    
    average_utilization = total_utilization / len(users) if users else 0
    
    return {
        "users": user_workloads,
        "average_utilization": round(average_utilization, 1),
        "overloaded": [u for u in user_workloads if u["category"] == "overloaded"],
        "optimal": [u for u in user_workloads if u["category"] == "optimal"], 
        "underutilized": [u for u in user_workloads if u["category"] == "underutilized"]
    }

def identify_balancing_opportunities(workload_analysis, tasks):
    """Identify opportunities for workload balancing"""
    opportunities = []
    
    overloaded = workload_analysis["overloaded"]
    underutilized = workload_analysis["underutilized"]
    
    for overloaded_user in overloaded:
        for underutilized_user in underutilized:
            # Find tasks that could be redistributed
            user_tasks = [t for t in tasks if t.get("assignee_id") == overloaded_user["user_id"] 
                         and t.get("status") in ["todo", "in_progress"]]
            
            redistributable_tasks = [t for t in user_tasks if t.get("priority") not in ["critical"]]
            
            if redistributable_tasks:
                opportunities.append({
                    "from_user": overloaded_user["user_id"],
                    "from_name": overloaded_user["name"],
                    "to_user": underutilized_user["user_id"],  
                    "to_name": underutilized_user["name"],
                    "redistributable_tasks": len(redistributable_tasks),
                    "potential_hours_moved": sum(t.get("estimated_hours", 8) for t in redistributable_tasks[:3]),
                    "impact_score": calculate_redistribution_impact(overloaded_user, underutilized_user)
                })
    
    return opportunities

def generate_workload_balancing_recommendations(workload_analysis, opportunities, users, tasks):
    """Generate specific workload balancing recommendations"""
    recommendations = []
    
    # Task redistribution recommendations
    for opp in opportunities[:5]:  # Top 5 opportunities
        recommendations.append({
            "type": "task_redistribution",
            "priority": "high" if opp["impact_score"] > 70 else "medium",
            "description": f"Move {opp['redistributable_tasks']} tasks ({opp['potential_hours_moved']}h) from {opp['from_name']} to {opp['to_name']}",
            "from_user": opp["from_user"],
            "to_user": opp["to_user"],
            "estimated_impact": f"{opp['impact_score']}% improvement in balance",
            "implementation_effort": "Low - 1-2 hours of task reassignment"
        })
    
    # Skills-based balancing  
    for user in workload_analysis["underutilized"]:
        user_obj = next((u for u in users if u["id"] == user["user_id"]), None)
        if user_obj and user_obj.get("skills"):
            recommendations.append({
                "type": "skills_utilization",
                "priority": "medium",
                "description": f"Assign more tasks requiring {', '.join(str(s) for s in user_obj['skills'][:3])} to {user['name']}",
                "user_id": user["user_id"],
                "available_capacity": 40 - user["current_hours"],
                "implementation_effort": "Medium - requires skill-based task matching"
            })
    
    return recommendations

def calculate_redistribution_impact(overloaded_user, underutilized_user):
    """Calculate impact score of redistributing tasks"""
    # Higher impact when there's a bigger utilization gap
    utilization_gap = overloaded_user["utilization_percent"] - underutilized_user["utilization_percent"]
    
    # Normalize to 0-100 scale
    impact_score = min(100, utilization_gap)
    
    return round(impact_score, 1)

def calculate_balancing_impact(recommendations, workload_analysis):
    """Calculate potential impact of balancing recommendations"""
    current_variance = calculate_utilization_variance(workload_analysis)
    
    # Estimate variance reduction from recommendations
    estimated_variance_reduction = len(recommendations) * 5  # 5% per recommendation
    projected_variance = max(0, current_variance - estimated_variance_reduction)
    
    return {
        "current_balance_score": 100 - current_variance,
        "projected_balance_score": 100 - projected_variance,
        "improvement_potential": estimated_variance_reduction,
        "affected_users": len(set(r.get("from_user", r.get("user_id")) for r in recommendations)),
        "estimated_productivity_gain": f"{len(recommendations) * 3}-{len(recommendations) * 5}%"
    }

def calculate_utilization_variance(workload_analysis):
    """Calculate variance in utilization across team"""
    utilizations = [u["utilization_percent"] for u in workload_analysis["users"]]
    
    if not utilizations:
        return 0
    
    mean_util = sum(utilizations) / len(utilizations)
    variance = sum((u - mean_util) ** 2 for u in utilizations) / len(utilizations)
    
    return round(variance ** 0.5, 1)  # Standard deviation

def calculate_balancing_score(workload_analysis):
    """Calculate overall workload balancing score"""
    variance = calculate_utilization_variance(workload_analysis)
    
    # Lower variance = higher balance score
    balance_score = max(0, 100 - variance)
    
    return round(balance_score, 1)

def calculate_efficiency_potential(recommendations):
    """Calculate efficiency improvement potential"""
    # Estimate efficiency gains from balancing
    task_redistributions = len([r for r in recommendations if r["type"] == "task_redistribution"])
    skills_optimizations = len([r for r in recommendations if r["type"] == "skills_utilization"])
    
    efficiency_gain = (task_redistributions * 3) + (skills_optimizations * 2)
    
    return f"{efficiency_gain}% potential efficiency improvement"

def analyze_team_workload_balance(teams, users, tasks):
    """Analyze workload balance at team level"""
    team_balance = []
    
    for team in teams:
        team_id = team["id"]
        team_members = [u for u in users if team_id in u.get("team_memberships", [])]
        
        if not team_members:
            continue
        
        member_utilizations = []
        for member in team_members:
            member_tasks = [t for t in tasks if t.get("assignee_id") == member["id"] and t.get("status") in ["todo", "in_progress"]]
            estimated_hours = sum(t.get("estimated_hours", 8) for t in member_tasks)
            utilization = min(100, (estimated_hours / 40) * 100)
            member_utilizations.append(utilization)
        
        avg_utilization = sum(member_utilizations) / len(member_utilizations) if member_utilizations else 0
        utilization_variance = calculate_variance(member_utilizations)
        
        team_balance.append({
            "team_id": team_id,
            "team_name": team["name"],
            "member_count": len(team_members),
            "average_utilization": round(avg_utilization, 1),
            "utilization_variance": round(utilization_variance, 1),
            "balance_score": round(max(0, 100 - utilization_variance), 1),
            "status": "well_balanced" if utilization_variance < 15 else "needs_balancing"
        })
    
    return team_balance

def calculate_variance(values):
    """Calculate variance of a list of values"""
    if not values:
        return 0
    
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    
    return variance ** 0.5  # Standard deviation

def generate_workload_alerts(workload_analysis, opportunities):
    """Generate workload-related alerts"""
    alerts = []
    
    # Critical overload alerts
    critical_overload = [u for u in workload_analysis["overloaded"] if u["utilization_percent"] > 120]
    if critical_overload:
        alerts.append({
            "type": "critical_overload",
            "severity": "high",
            "message": f"{len(critical_overload)} team members are critically overloaded (>120% capacity)",
            "affected_users": [u["user_id"] for u in critical_overload],
            "action_required": "immediate_redistribution"
        })
    
    # Underutilization opportunities
    significant_underutil = [u for u in workload_analysis["underutilized"] if u["utilization_percent"] < 20]
    if significant_underutil:
        alerts.append({
            "type": "underutilization_opportunity",
            "severity": "medium", 
            "message": f"{len(significant_underutil)} team members have significant available capacity",
            "affected_users": [u["user_id"] for u in significant_underutil],
            "action_required": "capacity_utilization"
        })
    
    # High-impact balancing opportunities
    high_impact_opps = [o for o in opportunities if o["impact_score"] > 80]
    if high_impact_opps:
        alerts.append({
            "type": "balancing_opportunity",
            "severity": "medium",
            "message": f"{len(high_impact_opps)} high-impact workload balancing opportunities identified",
            "potential_improvement": f"Up to {max(o['impact_score'] for o in high_impact_opps)}% balance improvement",
            "action_required": "review_recommendations"
        })
    
    return alerts

# Skills gap analysis helper functions
def analyze_skills_inventory(users, teams):
    """Analyze current organizational skills inventory"""
    all_skills = {}
    skills_by_team = {}
    
    for user in users:
        user_skills = user.get("skills", [])
        for skill in user_skills:
            skill_name = skill.get("name", skill) if isinstance(skill, dict) else str(skill)
            level = skill.get("level", "intermediate") if isinstance(skill, dict) else "intermediate"
            
            if skill_name:
                if skill_name not in all_skills:
                    all_skills[skill_name] = {"count": 0, "levels": []}
                all_skills[skill_name]["count"] += 1
                all_skills[skill_name]["levels"].append(level)
        
        # Track skills by team membership
        for team_id in user.get("team_memberships", []):
            if team_id not in skills_by_team:
                skills_by_team[team_id] = {}
            for skill in user_skills:
                skill_name = skill.get("name", skill) if isinstance(skill, dict) else str(skill)
                if skill_name:
                    skills_by_team[team_id][skill_name] = skills_by_team[team_id].get(skill_name, 0) + 1
    
    return {
        "all_skills": all_skills,
        "skills_by_team": skills_by_team,
        "total_unique_skills": len(all_skills),
        "coverage_percentage": calculate_skills_coverage(all_skills, len(users)),
        "most_common_skills": sorted(all_skills.items(), key=lambda x: x[1]["count"], reverse=True)[:10],
        "skills_distribution": categorize_skills_by_frequency(all_skills, len(users))
    }

def analyze_skills_demand(projects, tasks):
    """Analyze skills demand from projects and tasks"""
    demanded_skills = {}
    high_demand_skills = []
    
    # Extract skills requirements from projects and tasks
    all_items = projects + tasks
    
    for item in all_items:
        title = item.get("title", "").lower() + " " + item.get("description", "").lower()
        
        # Simple skill extraction (in reality, this would be more sophisticated)
        skill_keywords = {
            "React": ["react", "frontend", "javascript", "ui"],
            "Python": ["python", "backend", "django", "flask"],
            "Design": ["design", "ui/ux", "figma", "adobe"],
            "DevOps": ["devops", "aws", "docker", "kubernetes"],
            "Data Analysis": ["data", "analytics", "sql", "reporting"],
            "Project Management": ["project", "management", "planning", "coordination"],
            "Quality Assurance": ["testing", "qa", "quality", "automation"],
            "Machine Learning": ["ml", "ai", "machine learning", "tensorflow"]
        }
        
        for skill, keywords in skill_keywords.items():
            if any(keyword in title for keyword in keywords):
                priority = item.get("priority", "medium")
                weight = 3 if priority == "critical" else 2 if priority == "high" else 1
                
                if skill not in demanded_skills:
                    demanded_skills[skill] = {"demand_score": 0, "projects": 0, "tasks": 0}
                
                demanded_skills[skill]["demand_score"] += weight
                if "name" in item and item in projects:
                    demanded_skills[skill]["projects"] += 1
                else:
                    demanded_skills[skill]["tasks"] += 1
    
    # Identify high-demand skills
    high_demand_skills = [skill for skill, data in demanded_skills.items() if data["demand_score"] > 5]
    
    return {
        "demanded_skills": demanded_skills,
        "high_demand_skills": high_demand_skills,
        "total_demand_score": sum(data["demand_score"] for data in demanded_skills.values()),
        "skills_by_priority": sorted(demanded_skills.items(), key=lambda x: x[1]["demand_score"], reverse=True)
    }

def identify_skills_gaps(skills_inventory, skills_demand):
    """Identify gaps between current skills and demand"""
    current_skills = set(skills_inventory["all_skills"].keys())
    demanded_skills = set(skills_demand["demanded_skills"].keys())
    
    # Critical gaps: high demand but no/low supply
    critical_gaps = []
    moderate_gaps = []
    covered_skills = []
    
    for skill, demand_data in skills_demand["demanded_skills"].items():
        demand_score = demand_data["demand_score"]
        supply_count = skills_inventory["all_skills"].get(skill, {"count": 0})["count"]
        
        gap_severity = calculate_gap_severity(demand_score, supply_count)
        
        gap_info = {
            "skill": skill,
            "demand_score": demand_score,
            "current_supply": supply_count,
            "gap_severity": gap_severity,
            "gap_ratio": demand_score / max(supply_count, 1)
        }
        
        if gap_severity == "critical":
            critical_gaps.append(gap_info)
        elif gap_severity == "moderate":
            moderate_gaps.append(gap_info)
        else:
            covered_skills.append(gap_info)
    
    # Missing skills: demanded but not available
    missing_skills = demanded_skills - current_skills
    
    return {
        "critical_gaps": critical_gaps,
        "moderate_gaps": moderate_gaps,
        "covered_skills": covered_skills,
        "missing_skills": list(missing_skills),
        "gap_summary": {
            "total_gaps": len(critical_gaps) + len(moderate_gaps),
            "critical_count": len(critical_gaps),
            "moderate_count": len(moderate_gaps),
            "coverage_rate": len(covered_skills) / max(len(skills_demand["demanded_skills"]), 1) * 100
        }
    }

def analyze_team_skills_distribution(teams, users):
    """Analyze skills distribution across teams"""
    team_skills = {}
    
    for team in teams:
        team_id = team["id"]
        team_members = [u for u in users if team_id in u.get("team_memberships", [])]
        
        skills_count = {}
        skills_levels = {}
        
        for member in team_members:
            for skill in member.get("skills", []):
                skill_name = skill.get("name", skill) if isinstance(skill, dict) else str(skill)
                skill_level = skill.get("level", "intermediate") if isinstance(skill, dict) else "intermediate"
                
                if skill_name:
                    skills_count[skill_name] = skills_count.get(skill_name, 0) + 1
                    if skill_name not in skills_levels:
                        skills_levels[skill_name] = []
                    skills_levels[skill_name].append(skill_level)
        
        team_skills[team_id] = {
            "team_name": team["name"],
            "member_count": len(team_members),
            "unique_skills": len(skills_count),
            "skills_count": skills_count,
            "skills_levels": skills_levels,
            "skills_depth": calculate_team_skills_depth(skills_count, len(team_members)),
            "skills_breadth": len(skills_count)
        }
    
    return team_skills

def generate_skills_development_plan(skills_gaps, skills_inventory, users, teams):
    """Generate comprehensive skills development plan"""
    development_plan = {
        "training_programs": [],
        "hiring_priorities": [],
        "knowledge_transfer": [],
        "skills_rotation": []
    }
    
    # Training programs for critical gaps
    for gap in skills_gaps["critical_gaps"]:
        development_plan["training_programs"].append({
            "skill": gap["skill"],
            "priority": "high",
            "type": "external_training",
            "estimated_duration": "4-8 weeks",
            "target_participants": min(3, gap["demand_score"]),
            "estimated_cost": "Medium",
            "expected_roi": calculate_training_roi(gap)
        })
    
    # Hiring priorities for missing skills
    for skill in skills_gaps["missing_skills"]:
        demand_data = skills_inventory["all_skills"].get(skill, {"count": 0})
        development_plan["hiring_priorities"].append({
            "skill": skill,
            "priority": "high" if skill in [g["skill"] for g in skills_gaps["critical_gaps"]] else "medium",
            "positions_needed": 1,
            "urgency": "immediate" if skill in [g["skill"] for g in skills_gaps["critical_gaps"]] else "3_months"
        })
    
    # Knowledge transfer opportunities
    for skill, skill_data in skills_inventory["all_skills"].items():
        if skill_data["count"] >= 2:  # Multiple people have this skill
            development_plan["knowledge_transfer"].append({
                "skill": skill,
                "experts": skill_data["count"],
                "transfer_type": "internal_mentoring",
                "potential_learners": max(0, 5 - skill_data["count"])
            })
    
    return development_plan

def calculate_skills_development_roi(development_recommendations, skills_gaps):
    """Calculate ROI for skills development initiatives"""
    roi_analysis = {}
    
    # Training ROI
    training_programs = development_recommendations.get("training_programs", [])
    total_training_cost = len(training_programs) * 5000  # Estimate $5k per program
    
    # Calculate productivity improvement from addressing gaps
    critical_gaps_addressed = len([p for p in training_programs if p["priority"] == "high"])
    productivity_improvement = critical_gaps_addressed * 0.15  # 15% per critical gap
    
    annual_productivity_value = productivity_improvement * 100000  # $100k baseline per gap
    
    roi_analysis["training_roi"] = {
        "investment": total_training_cost,
        "annual_return": annual_productivity_value,
        "roi_percentage": ((annual_productivity_value - total_training_cost) / max(total_training_cost, 1)) * 100,
        "payback_months": (total_training_cost / max(annual_productivity_value / 12, 1))
    }
    
    return roi_analysis

def calculate_skills_coverage_score(skills_inventory, skills_demand):
    """Calculate overall skills coverage score"""
    demanded_skills = set(skills_demand["demanded_skills"].keys())
    available_skills = set(skills_inventory["all_skills"].keys())
    
    coverage = len(demanded_skills & available_skills) / max(len(demanded_skills), 1) * 100
    
    return round(coverage, 1)

def calculate_skills_diversity_index(skills_inventory):
    """Calculate skills diversity index"""
    skills_counts = [data["count"] for data in skills_inventory["all_skills"].values()]
    
    if not skills_counts:
        return 0
    
    # Simple diversity calculation
    max_count = max(skills_counts)
    min_count = min(skills_counts)
    avg_count = sum(skills_counts) / len(skills_counts)
    
    # Higher diversity when counts are more evenly distributed
    diversity = 100 - ((max_count - min_count) / max(avg_count, 1) * 10)
    
    return round(max(0, diversity), 1)

def calculate_development_priority_score(skills_gaps):
    """Calculate overall development priority score"""
    critical_weight = len(skills_gaps["critical_gaps"]) * 3
    moderate_weight = len(skills_gaps["moderate_gaps"]) * 2
    missing_weight = len(skills_gaps["missing_skills"]) * 2
    
    total_score = critical_weight + moderate_weight + missing_weight
    
    return min(100, total_score)

def generate_hiring_strategy(skills_gaps, team_skills_analysis):
    """Generate strategic hiring recommendations"""
    hiring_strategy = {
        "immediate_needs": [],
        "strategic_hires": [],
        "team_balance": []
    }
    
    # Immediate needs from critical gaps
    for gap in skills_gaps["critical_gaps"]:
        hiring_strategy["immediate_needs"].append({
            "skill": gap["skill"],
            "priority": "urgent",
            "positions": 1,
            "justification": f"Critical gap with {gap['demand_score']} demand points and only {gap['current_supply']} current resources"
        })
    
    # Strategic hires for team balance
    for team_id, team_data in team_skills_analysis.items():
        if team_data["skills_breadth"] < 5:  # Less than 5 different skills
            hiring_strategy["team_balance"].append({
                "team": team_data["team_name"],
                "current_breadth": team_data["skills_breadth"],
                "recommendation": "Hire generalist with diverse skills to increase team versatility"
            })
    
    return hiring_strategy

def generate_training_roadmap(development_recommendations, skills_gaps):
    """Generate comprehensive training roadmap"""
    roadmap = {
        "quarter_1": [],
        "quarter_2": [],
        "quarter_3": [],
        "quarter_4": []
    }
    
    # Prioritize training programs by criticality
    training_programs = development_recommendations.get("training_programs", [])
    high_priority = [p for p in training_programs if p["priority"] == "high"]
    medium_priority = [p for p in training_programs if p["priority"] == "medium"]
    
    # Distribute across quarters
    roadmap["quarter_1"] = high_priority[:2]
    roadmap["quarter_2"] = high_priority[2:] + medium_priority[:1]
    roadmap["quarter_3"] = medium_priority[1:3]
    roadmap["quarter_4"] = medium_priority[3:]
    
    return roadmap

# Additional utility functions
def calculate_skills_coverage(skills_dict, total_users):
    """Calculate skills coverage percentage"""
    if not skills_dict or total_users == 0:
        return 0
    
    # Skills with multiple practitioners are better covered
    well_covered = len([skill for skill, data in skills_dict.items() if data["count"] >= 2])
    
    return round((well_covered / max(len(skills_dict), 1)) * 100, 1)

def categorize_skills_by_frequency(skills_dict, total_users):
    """Categorize skills by frequency/coverage"""
    categories = {
        "widespread": [],  # >50% of team
        "common": [],     # 25-50% of team  
        "specialized": [], # 10-25% of team
        "rare": []        # <10% of team
    }
    
    for skill, data in skills_dict.items():
        percentage = (data["count"] / total_users) * 100
        
        if percentage > 50:
            categories["widespread"].append(skill)
        elif percentage > 25:
            categories["common"].append(skill)
        elif percentage > 10:
            categories["specialized"].append(skill)
        else:
            categories["rare"].append(skill)
    
    return categories

def calculate_gap_severity(demand_score, supply_count):
    """Calculate severity of a skills gap"""
    if supply_count == 0 and demand_score > 3:
        return "critical"
    elif demand_score / max(supply_count, 1) > 2:
        return "critical" 
    elif demand_score / max(supply_count, 1) > 1.5:
        return "moderate"
    else:
        return "covered"

def calculate_team_skills_depth(skills_count, member_count):
    """Calculate team skills depth (average skills per member)"""
    if member_count == 0:
        return 0
    
    total_skill_instances = sum(skills_count.values())
    return round(total_skill_instances / member_count, 1)

def calculate_training_roi(gap):
    """Calculate ROI for addressing a specific skills gap"""
    # Simplified ROI calculation
    demand_score = gap["demand_score"]
    current_supply = gap["current_supply"]
    
    # Higher ROI for larger gaps
    roi_score = min(200, (demand_score / max(current_supply, 1)) * 50)
    
    return f"{round(roi_score, 1)}% estimated ROI"