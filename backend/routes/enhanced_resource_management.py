from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import json
import os
import statistics
import numpy as np
from collections import defaultdict, Counter
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

router = APIRouter(prefix="/api/resource-management-enhanced", tags=["enhanced_resource_management"])

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

class AdvancedResourceAnalyzer:
    """Advanced resource analysis with sophisticated algorithms"""
    
    def __init__(self, users, tasks, projects, teams):
        self.users = users
        self.tasks = tasks
        self.projects = projects
        self.teams = teams
        self.project_ids = [p["id"] for p in projects]
        self.org_tasks = [t for t in tasks if t.get("project_id") in self.project_ids]
        
    def calculate_skill_compatibility_matrix(self):
        """Calculate skill compatibility between users and tasks"""
        compatibility_matrix = {}
        
        for user in self.users:
            user_skills = {skill["name"]: skill.get("level", 5) for skill in user.get("skills", [])}
            compatibility_matrix[user["id"]] = {}
            
            for task in self.org_tasks:
                required_skills = task.get("required_skills", [])
                if not required_skills:
                    compatibility_matrix[user["id"]][task["id"]] = 0.7  # Base compatibility
                    continue
                    
                compatibility_score = 0
                total_weight = 0
                
                for req_skill in required_skills:
                    skill_name = req_skill.get("name", req_skill) if isinstance(req_skill, dict) else req_skill
                    required_level = req_skill.get("required_level", 6) if isinstance(req_skill, dict) else 6
                    
                    user_level = user_skills.get(skill_name, 0)
                    if user_level >= required_level:
                        compatibility_score += (user_level / 10) * 1.2  # Bonus for exceeding requirements
                    elif user_level > 0:
                        compatibility_score += (user_level / required_level) * 0.8  # Partial match
                    
                    total_weight += 1
                
                compatibility_matrix[user["id"]][task["id"]] = compatibility_score / max(total_weight, 1)
                
        return compatibility_matrix
    
    def analyze_workload_distribution(self):
        """Analyze workload distribution with advanced metrics"""
        workload_data = {}
        
        for user in self.users:
            user_tasks = [t for t in self.org_tasks if t.get("assignee_id") == user["id"]]
            active_tasks = [t for t in user_tasks if t.get("status") in ["todo", "in_progress"]]
            
            # Calculate various workload metrics
            estimated_hours = sum(t.get("estimated_hours", 8) for t in active_tasks)
            actual_hours = sum(t.get("actual_hours", 0) for t in user_tasks)
            
            # Priority-weighted workload
            priority_weights = {"critical": 3, "high": 2, "medium": 1, "low": 0.5}
            weighted_workload = sum(
                t.get("estimated_hours", 8) * priority_weights.get(t.get("priority", "medium"), 1)
                for t in active_tasks
            )
            
            # Calculate stress indicators
            overdue_tasks = len([
                t for t in active_tasks 
                if t.get("due_date") and datetime.fromisoformat(t["due_date"].replace("Z", "+00:00")) < datetime.utcnow()
            ])
            
            high_priority_tasks = len([t for t in active_tasks if t.get("priority") in ["high", "critical"]])
            
            # Efficiency ratio
            efficiency_ratio = (actual_hours / max(estimated_hours, 1)) if estimated_hours > 0 else 1.0
            
            workload_data[user["id"]] = {
                "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "role": user.get("role", "member"),
                "department": user.get("department", "Unknown"),
                "total_tasks": len(user_tasks),
                "active_tasks": len(active_tasks),
                "estimated_hours": estimated_hours,
                "actual_hours": actual_hours,
                "weighted_workload": weighted_workload,
                "capacity_utilization": min(100, (estimated_hours / 40) * 100),
                "overdue_tasks": overdue_tasks,
                "high_priority_tasks": high_priority_tasks,
                "efficiency_ratio": efficiency_ratio,
                "stress_score": self._calculate_stress_score(overdue_tasks, high_priority_tasks, estimated_hours),
                "skills": [skill["name"] for skill in user.get("skills", [])],
                "availability_status": self._determine_availability_status(estimated_hours, overdue_tasks)
            }
            
        return workload_data
    
    def _calculate_stress_score(self, overdue_tasks, high_priority_tasks, estimated_hours):
        """Calculate stress score based on multiple factors"""
        base_stress = min(estimated_hours / 40, 1.0) * 30  # Base stress from workload
        overdue_stress = overdue_tasks * 15  # Each overdue task adds stress
        priority_stress = high_priority_tasks * 10  # High priority tasks add stress
        
        return min(100, base_stress + overdue_stress + priority_stress)
    
    def _determine_availability_status(self, estimated_hours, overdue_tasks):
        """Determine availability status based on workload and stress factors"""
        if estimated_hours > 45 or overdue_tasks > 2:
            return "overloaded"
        elif estimated_hours > 30 or overdue_tasks > 0:
            return "busy"
        elif estimated_hours < 20:
            return "available"
        else:
            return "optimal"
    
    def predict_capacity_needs(self, weeks_ahead=4):
        """Predict future capacity needs using historical trends"""
        # Analyze task completion patterns
        completed_tasks = [t for t in self.org_tasks if t.get("status") == "completed"]
        active_projects = [p for p in self.projects if p.get("status") == "active"]
        
        # Calculate average task completion rate
        if completed_tasks:
            avg_completion_time = statistics.mean([
                t.get("actual_hours", t.get("estimated_hours", 8)) for t in completed_tasks
            ])
        else:
            avg_completion_time = 8
        
        # Predict upcoming work based on project pipelines
        upcoming_work = 0
        for project in active_projects:
            project_progress = project.get("progress_percentage", 0)
            remaining_work = (100 - project_progress) / 100 * project.get("estimated_hours", 200)
            upcoming_work += remaining_work
        
        # Factor in seasonal trends (simplified)
        seasonal_multiplier = 1.1 if datetime.utcnow().month in [9, 10, 11, 1, 2] else 0.9
        
        predicted_demand = (upcoming_work * seasonal_multiplier) / weeks_ahead
        current_capacity = len(self.users) * 40  # 40 hours per week per person
        
        return {
            "predicted_weekly_demand": predicted_demand,
            "current_weekly_capacity": current_capacity,
            "capacity_gap": predicted_demand - current_capacity,
            "utilization_forecast": (predicted_demand / current_capacity * 100) if current_capacity > 0 else 0,
            "recommended_actions": self._generate_capacity_recommendations(predicted_demand, current_capacity)
        }
    
    def _generate_capacity_recommendations(self, demand, capacity):
        """Generate capacity planning recommendations"""
        recommendations = []
        
        if demand > capacity * 1.1:
            recommendations.append({
                "type": "scale_up",
                "priority": "high",
                "description": "Consider hiring additional team members or contractors",
                "estimated_need": f"{int((demand - capacity) / 40)} additional full-time equivalents"
            })
        elif demand < capacity * 0.7:
            recommendations.append({
                "type": "optimize",
                "priority": "medium", 
                "description": "Consider reallocating resources or taking on additional projects",
                "available_capacity": f"{int(capacity - demand)} hours per week available"
            })
        
        return recommendations
    
    def detect_resource_conflicts_advanced(self):
        """Advanced conflict detection with multiple conflict types"""
        conflicts = {
            "skill_gaps": [],
            "workload_imbalances": [],
            "timeline_conflicts": [],
            "priority_conflicts": [],
            "team_dependencies": []
        }
        
        workload_data = self.analyze_workload_distribution()
        
        # Detect skill gaps
        for task in self.org_tasks:
            if task.get("status") == "todo" and not task.get("assignee_id"):
                required_skills = task.get("required_skills", [])
                available_users = self._find_users_with_skills(required_skills)
                
                if not available_users:
                    conflicts["skill_gaps"].append({
                        "task_id": task["id"],
                        "task_title": task["title"],
                        "missing_skills": [skill.get("name", skill) if isinstance(skill, dict) else skill for skill in required_skills],
                        "severity": "high" if task.get("priority") in ["high", "critical"] else "medium"
                    })
        
        # Detect workload imbalances
        utilizations = [data["capacity_utilization"] for data in workload_data.values()]
        if utilizations:
            std_dev = statistics.stdev(utilizations)
            if std_dev > 25:  # High variance in workload
                overloaded = [uid for uid, data in workload_data.items() if data["capacity_utilization"] > 85]
                underutilized = [uid for uid, data in workload_data.items() if data["capacity_utilization"] < 40]
                
                conflicts["workload_imbalances"].append({
                    "type": "high_variance",
                    "description": f"High workload variance detected (σ={std_dev:.1f})",
                    "overloaded_users": len(overloaded),
                    "underutilized_users": len(underutilized),
                    "severity": "high"
                })
        
        # Detect timeline conflicts
        for user_id, data in workload_data.items():
            if data["overdue_tasks"] > 0 and data["high_priority_tasks"] > 2:
                conflicts["timeline_conflicts"].append({
                    "user_id": user_id,
                    "user_name": data["user_name"],
                    "overdue_tasks": data["overdue_tasks"],
                    "high_priority_tasks": data["high_priority_tasks"],
                    "severity": "critical"
                })
        
        return conflicts
    
    def _find_users_with_skills(self, required_skills):
        """Find users who have the required skills"""
        matching_users = []
        
        for user in self.users:
            user_skills = {skill["name"]: skill.get("level", 5) for skill in user.get("skills", [])}
            
            has_all_skills = True
            for req_skill in required_skills:
                skill_name = req_skill.get("name", req_skill) if isinstance(req_skill, dict) else req_skill
                required_level = req_skill.get("required_level", 6) if isinstance(req_skill, dict) else 6
                
                if user_skills.get(skill_name, 0) < required_level:
                    has_all_skills = False
                    break
            
            if has_all_skills:
                matching_users.append(user["id"])
        
        return matching_users
    
    def generate_optimization_recommendations(self):
        """Generate comprehensive optimization recommendations"""
        workload_data = self.analyze_workload_distribution()
        conflicts = self.detect_resource_conflicts_advanced()
        capacity_forecast = self.predict_capacity_needs()
        
        recommendations = {
            "immediate_actions": [],
            "short_term_strategies": [],
            "long_term_planning": [],
            "skill_development": [],
            "process_improvements": []
        }
        
        # Immediate actions
        overloaded_users = [uid for uid, data in workload_data.items() if data["stress_score"] > 70]
        if overloaded_users:
            recommendations["immediate_actions"].append({
                "type": "workload_redistribution",
                "description": f"Redistribute tasks from {len(overloaded_users)} overloaded team members",
                "affected_users": len(overloaded_users),
                "priority": "high",
                "estimated_impact": "15-25% stress reduction"
            })
        
        # Skill development recommendations
        skill_gaps = conflicts.get("skill_gaps", [])
        if skill_gaps:
            missing_skills = Counter()
            for gap in skill_gaps:
                for skill in gap["missing_skills"]:
                    missing_skills[skill] += 1
            
            for skill, count in missing_skills.most_common(5):
                recommendations["skill_development"].append({
                    "skill": skill,
                    "demand_frequency": count,
                    "recommendation": f"Train existing team members in {skill} or hire specialists",
                    "priority": "high" if count > 2 else "medium"
                })
        
        # Process improvements
        avg_efficiency = statistics.mean([data["efficiency_ratio"] for data in workload_data.values()])
        if avg_efficiency < 0.8:
            recommendations["process_improvements"].append({
                "type": "efficiency_improvement",
                "description": "Focus on process optimization and tooling improvements",
                "current_efficiency": f"{avg_efficiency:.1%}",
                "target_efficiency": "85-90%",
                "priority": "medium"
            })
        
        return recommendations

# Initialize AI chat for enhanced resource optimization
async def get_enhanced_ai_chat():
    """Initialize enhanced AI chat for resource management recommendations"""
    return LlmChat(
        api_key=os.getenv("EMERGENT_LLM_KEY"),
        session_id="enhanced-resource-management",
        system_message="""You are an advanced AI Resource Management Consultant with expertise in:
        - Predictive analytics for resource planning
        - Advanced workload optimization algorithms
        - Skills-based resource allocation strategies
        - Risk assessment and mitigation planning
        - Performance optimization and efficiency improvement
        
        Provide strategic, data-driven recommendations with:
        - Quantitative analysis and metrics
        - Risk-benefit assessments
        - Implementation timelines and priorities
        - ROI projections where applicable
        - Specific, actionable next steps"""
    ).with_model("openai", "gpt-4o-mini")

@router.get("/advanced-allocation", response_model=Dict[str, Any])
async def get_advanced_resource_allocation(
    current_user: User = Depends(get_current_active_user)
):
    """Advanced AI-powered resource allocation with predictive analytics"""
    try:
        db = await get_database()
        org_id = current_user.organization_id
        
        # Get comprehensive data
        users_raw = await db.users.find({"organization_id": org_id}).to_list(length=None)
        teams_raw = await db.teams.find({"organization_id": org_id}).to_list(length=None)
        projects_raw = await db.projects.find({"organization_id": org_id}).to_list(length=None)
        tasks_raw = await db.tasks.find({}).to_list(length=None)
        
        # Clean MongoDB ObjectIds
        users = clean_mongo_docs(users_raw)
        teams = clean_mongo_docs(teams_raw)
        projects = clean_mongo_docs(projects_raw)
        tasks = clean_mongo_docs(tasks_raw)
        
        # Initialize advanced analyzer
        analyzer = AdvancedResourceAnalyzer(users, tasks, projects, teams)
        
        # Perform advanced analysis
        workload_analysis = analyzer.analyze_workload_distribution()
        skill_compatibility = analyzer.calculate_skill_compatibility_matrix()
        capacity_forecast = analyzer.predict_capacity_needs()
        conflicts = analyzer.detect_resource_conflicts_advanced()
        recommendations = analyzer.generate_optimization_recommendations()
        
        # Prepare comprehensive context for AI
        ai_context = {
            "team_metrics": {
                "total_members": len(users),
                "active_projects": len([p for p in projects if p.get("status") == "active"]),
                "total_tasks": len([t for t in tasks if t.get("project_id") in [p["id"] for p in projects]]),
                "avg_utilization": statistics.mean([data["capacity_utilization"] for data in workload_analysis.values()]) if workload_analysis else 0
            },
            "capacity_forecast": capacity_forecast,
            "critical_issues": {
                "skill_gaps": len(conflicts["skill_gaps"]),
                "workload_imbalances": len(conflicts["workload_imbalances"]),
                "timeline_conflicts": len(conflicts["timeline_conflicts"])
            },
            "optimization_opportunities": len(recommendations["immediate_actions"]) + len(recommendations["short_term_strategies"])
        }
        
        # Get enhanced AI insights
        ai_chat = await get_enhanced_ai_chat()
        ai_prompt = f"""
        Analyze this advanced resource management scenario:
        
        TEAM OVERVIEW:
        - {ai_context['team_metrics']['total_members']} team members across {len(teams)} teams
        - {ai_context['team_metrics']['active_projects']} active projects with {ai_context['team_metrics']['total_tasks']} tasks
        - Average utilization: {ai_context['team_metrics']['avg_utilization']:.1f}%
        
        CAPACITY FORECAST (4 weeks):
        - Predicted demand: {capacity_forecast['predicted_weekly_demand']:.1f} hours/week
        - Current capacity: {capacity_forecast['current_weekly_capacity']} hours/week
        - Utilization forecast: {capacity_forecast['utilization_forecast']:.1f}%
        
        CRITICAL ISSUES IDENTIFIED:
        - Skill gaps: {ai_context['critical_issues']['skill_gaps']} instances
        - Workload imbalances: {ai_context['critical_issues']['workload_imbalances']} instances
        - Timeline conflicts: {ai_context['critical_issues']['timeline_conflicts']} instances
        
        ANALYSIS DATA:
        {json.dumps({
            "workload_summary": {uid: {k: v for k, v in data.items() if k in ['user_name', 'capacity_utilization', 'stress_score', 'availability_status']} 
                                for uid, data in list(workload_analysis.items())[:5]},
            "top_conflicts": conflicts,
            "recommendations_summary": {k: len(v) for k, v in recommendations.items()}
        }, indent=2)}
        
        Provide strategic recommendations for:
        1. Immediate resource reallocation priorities
        2. Medium-term capacity planning strategies  
        3. Long-term team development roadmap
        4. Risk mitigation for identified conflicts
        5. ROI-focused optimization opportunities
        
        Format as structured JSON with specific, measurable recommendations.
        """
        
        ai_response = await ai_chat.send_message(UserMessage(text=ai_prompt))
        ai_insights = parse_enhanced_ai_response(ai_response)
        
        return {
            "workload_analysis": workload_analysis,
            "skill_compatibility_matrix": {k: len(v) for k, v in skill_compatibility.items()},  # Simplified for response size
            "capacity_forecast": capacity_forecast,
            "resource_conflicts": conflicts,
            "optimization_recommendations": recommendations,
            "ai_strategic_insights": ai_insights,
            "performance_metrics": {
                "team_efficiency_score": calculate_team_efficiency_score(workload_analysis),
                "resource_utilization_balance": calculate_utilization_balance(workload_analysis),
                "skill_coverage_index": calculate_skill_coverage_index(users, tasks),
                "conflict_severity_index": calculate_conflict_severity(conflicts)
            },
            "action_priorities": generate_action_priorities(recommendations, conflicts, capacity_forecast)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get advanced resource allocation: {str(e)}"
        )

def parse_enhanced_ai_response(ai_response):
    """Parse enhanced AI response with better error handling"""
    try:
        response_text = ai_response.strip() if hasattr(ai_response, 'strip') else str(ai_response).strip()
        
        # Try to extract JSON
        if "{" in response_text and "}" in response_text:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            json_content = response_text[json_start:json_end]
            return json.loads(json_content)
        else:
            # Parse structured text
            sections = response_text.split("\n\n")
            parsed = {"strategic_recommendations": [], "analysis_summary": response_text[:500] + "..."}
            
            for section in sections:
                if ":" in section:
                    key, value = section.split(":", 1)
                    parsed[key.strip().lower().replace(" ", "_")] = value.strip()
            
            return parsed
    except Exception as e:
        return {
            "analysis_available": True,
            "summary": "AI analysis completed - detailed insights available",
            "raw_response": str(ai_response)[:1000],
            "parsing_note": f"Response parsing encountered issue: {str(e)}"
        }

def calculate_team_efficiency_score(workload_data):
    """Calculate overall team efficiency score"""
    if not workload_data:
        return 0
        
    efficiency_scores = [data["efficiency_ratio"] for data in workload_data.values()]
    utilization_scores = [min(data["capacity_utilization"] / 80, 1.0) for data in workload_data.values()]
    
    avg_efficiency = statistics.mean(efficiency_scores)
    avg_utilization = statistics.mean(utilization_scores)
    
    return round((avg_efficiency * 0.6 + avg_utilization * 0.4) * 100, 1)

def calculate_utilization_balance(workload_data):
    """Calculate how balanced the utilization is across team members"""
    if not workload_data:
        return 100
        
    utilizations = [data["capacity_utilization"] for data in workload_data.values()]
    std_dev = statistics.stdev(utilizations) if len(utilizations) > 1 else 0
    
    # Lower standard deviation = better balance (inverse score)
    balance_score = max(0, 100 - (std_dev * 2))
    return round(balance_score, 1)

def calculate_skill_coverage_index(users, tasks):
    """Calculate how well team skills cover task requirements"""
    all_user_skills = set()
    for user in users:
        for skill in user.get("skills", []):
            all_user_skills.add(skill.get("name", skill) if isinstance(skill, dict) else skill)
    
    all_required_skills = set()
    for task in tasks:
        for req_skill in task.get("required_skills", []):
            skill_name = req_skill.get("name", req_skill) if isinstance(req_skill, dict) else req_skill
            all_required_skills.add(skill_name)
    
    if not all_required_skills:
        return 100
        
    coverage = len(all_user_skills.intersection(all_required_skills)) / len(all_required_skills)
    return round(coverage * 100, 1)

def calculate_conflict_severity(conflicts):
    """Calculate overall conflict severity index"""
    severity_weights = {"critical": 3, "high": 2, "medium": 1, "low": 0.5}
    total_severity = 0
    total_conflicts = 0
    
    for conflict_type, conflict_list in conflicts.items():
        for conflict in conflict_list:
            severity = conflict.get("severity", "medium")
            total_severity += severity_weights.get(severity, 1)
            total_conflicts += 1
    
    if total_conflicts == 0:
        return 0
        
    avg_severity = total_severity / total_conflicts
    return round(avg_severity * 25, 1)  # Scale to 0-100

def generate_action_priorities(recommendations, conflicts, capacity_forecast):
    """Generate prioritized action items"""
    priorities = []
    
    # High priority: Critical conflicts
    critical_conflicts = sum(1 for conflict_list in conflicts.values() 
                           for conflict in conflict_list 
                           if conflict.get("severity") == "critical")
    
    if critical_conflicts > 0:
        priorities.append({
            "priority": 1,
            "category": "Crisis Management",
            "action": f"Resolve {critical_conflicts} critical resource conflicts",
            "timeline": "24-48 hours",
            "impact": "Prevent project delays and team burnout"
        })
    
    # Medium priority: Capacity planning
    if capacity_forecast["capacity_gap"] > 0:
        priorities.append({
            "priority": 2,
            "category": "Capacity Planning",
            "action": "Address capacity shortfall through hiring or reallocation",
            "timeline": "1-2 weeks",
            "impact": f"Bridge {capacity_forecast['capacity_gap']:.0f} hour weekly gap"
        })
    
    # Lower priority: Optimization opportunities
    if recommendations["process_improvements"]:
        priorities.append({
            "priority": 3,
            "category": "Process Optimization",
            "action": "Implement efficiency improvements and tooling upgrades",
            "timeline": "2-4 weeks",
            "impact": "10-15% productivity improvement"
        })
    
    return priorities[:5]  # Return top 5 priorities