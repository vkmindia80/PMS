from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import uuid
from bson import ObjectId

from database import get_database
from auth.middleware import get_current_user
from models import User, ProjectStatus

router = APIRouter(prefix="/api/cost-analytics", tags=["cost-analytics"])

@router.get("/portfolio-summary")
async def get_portfolio_cost_summary(
    current_user: User = Depends(get_current_user)
):
    """Get portfolio-level cost summary and analytics"""
    try:
        db = await get_database()
        
        # Fetch all projects in user's organization
        projects = await db.projects.find({
            "organization_id": current_user.organization_id,
            "status": {"$ne": ProjectStatus.ARCHIVED}
        }).to_list(length=None)
        
        # Initialize summary metrics
        total_projects = len(projects)
        total_budget = 0.0
        total_spent = 0.0
        active_projects = 0
        overdue_projects = 0
        projects_over_budget = 0
        high_risk_projects = 0
        
        # Detailed breakdown
        cost_by_status = {}
        cost_by_priority = {}
        monthly_spending = {}
        project_details = []
        
        current_date = date.today()
        
        for project in projects:
            budget = project.get("budget", {})
            project_total_budget = budget.get("total_budget", 0) or 0
            project_spent = budget.get("spent_amount", 0) or 0
            project_status = project.get("status", "planning")
            project_priority = project.get("priority", "medium")
            due_date = project.get("due_date")
            
            # Aggregate totals
            total_budget += project_total_budget
            total_spent += project_spent
            
            # Count active projects
            if project_status == "active":
                active_projects += 1
            
            # Check if overdue
            is_overdue = False
            if due_date:
                try:
                    if isinstance(due_date, str):
                        due_date_obj = datetime.fromisoformat(due_date.replace("Z", "")).date()
                    else:
                        due_date_obj = due_date
                    is_overdue = due_date_obj < current_date and project_status not in ["completed", "cancelled"]
                    if is_overdue:
                        overdue_projects += 1
                except:
                    pass
            
            # Check if over budget
            budget_utilization = 0
            if project_total_budget > 0:
                budget_utilization = (project_spent / project_total_budget) * 100
                if budget_utilization > 100:
                    projects_over_budget += 1
                elif budget_utilization > 80:
                    high_risk_projects += 1
            
            # Aggregate by status
            if project_status not in cost_by_status:
                cost_by_status[project_status] = {"count": 0, "budget": 0, "spent": 0}
            cost_by_status[project_status]["count"] += 1
            cost_by_status[project_status]["budget"] += project_total_budget
            cost_by_status[project_status]["spent"] += project_spent
            
            # Aggregate by priority
            if project_priority not in cost_by_priority:
                cost_by_priority[project_priority] = {"count": 0, "budget": 0, "spent": 0}
            cost_by_priority[project_priority]["count"] += 1
            cost_by_priority[project_priority]["budget"] += project_total_budget
            cost_by_priority[project_priority]["spent"] += project_spent
            
            # Create project detail
            project_details.append({
                "id": project["id"],
                "name": project["name"],
                "status": project_status,
                "priority": project_priority,
                "total_budget": project_total_budget,
                "spent_amount": project_spent,
                "remaining_budget": project_total_budget - project_spent if project_total_budget > 0 else 0,
                "budget_utilization": budget_utilization,
                "currency": budget.get("currency", "USD"),
                "due_date": due_date,
                "is_overdue": is_overdue,
                "progress_percentage": project.get("progress_percentage", 0),
                "team_member_count": len(project.get("team_members", [])),
                "task_count": project.get("task_count", 0)
            })
        
        # Generate monthly spending trend (mock data for demonstration)
        for i in range(6):
            month_date = (current_date.replace(day=1) - timedelta(days=30*i))
            month_key = month_date.strftime("%Y-%m")
            # Mock spending calculation based on project activity
            monthly_amount = total_spent * (0.1 + (i * 0.05)) / 6
            monthly_spending[month_key] = round(monthly_amount, 2)
        
        # Calculate derived metrics
        remaining_budget = total_budget - total_spent if total_budget > 0 else 0
        budget_utilization = (total_spent / total_budget * 100) if total_budget > 0 else 0
        average_project_budget = total_budget / total_projects if total_projects > 0 else 0
        average_project_spent = total_spent / total_projects if total_projects > 0 else 0
        
        # Cost efficiency calculation
        cost_efficiency = 100 - budget_utilization if budget_utilization <= 100 else max(0, 100 - (budget_utilization - 100) * 2)
        
        # Risk assessment
        risk_score = 0
        if projects_over_budget > 0:
            risk_score += (projects_over_budget / total_projects) * 40
        if high_risk_projects > 0:
            risk_score += (high_risk_projects / total_projects) * 20
        if overdue_projects > 0:
            risk_score += (overdue_projects / total_projects) * 30
        
        risk_level = "low" if risk_score < 20 else "medium" if risk_score < 50 else "high"
        
        # Forecast calculation (simple projection based on current burn rate)
        days_in_current_period = 30
        current_burn_rate = total_spent / days_in_current_period if total_spent > 0 else 0
        projected_monthly_spend = current_burn_rate * 30
        projected_completion_cost = total_spent + (projected_monthly_spend * 3)  # Next 3 months projection
        
        return {
            "summary": {
                "total_projects": total_projects,
                "active_projects": active_projects,
                "total_budget": total_budget,
                "total_spent": total_spent,
                "remaining_budget": remaining_budget,
                "budget_utilization": round(budget_utilization, 2),
                "average_project_budget": round(average_project_budget, 2),
                "average_project_spent": round(average_project_spent, 2),
                "currency": "USD"  # Default currency, could be organization-specific
            },
            "alerts": {
                "projects_over_budget": projects_over_budget,
                "high_risk_projects": high_risk_projects,
                "overdue_projects": overdue_projects,
                "risk_level": risk_level,
                "risk_score": round(risk_score, 2)
            },
            "breakdown": {
                "by_status": cost_by_status,
                "by_priority": cost_by_priority,
                "monthly_spending": dict(sorted(monthly_spending.items(), reverse=True))
            },
            "insights": {
                "cost_efficiency": round(cost_efficiency, 2),
                "projected_monthly_spend": round(projected_monthly_spend, 2),
                "projected_completion_cost": round(projected_completion_cost, 2),
                "budget_target_variance": round(((total_spent - total_budget) / total_budget * 100) if total_budget > 0 else 0, 2)
            },
            "projects": project_details[:10],  # Limit to top 10 for sidebar
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch portfolio cost summary: {str(e)}"
        )

@router.get("/cost-estimates")
async def generate_cost_estimates(
    project_type: Optional[str] = Query(None, description="Type of project for estimation"),
    team_size: Optional[int] = Query(None, description="Estimated team size"),
    duration_months: Optional[int] = Query(None, description="Estimated duration in months"),
    current_user: User = Depends(get_current_user)
):
    """Generate cost estimates based on historical data and parameters"""
    try:
        db = await get_database()
        
        # Fetch historical project data for benchmarking
        historical_projects = await db.projects.find({
            "organization_id": current_user.organization_id,
            "status": {"$in": ["completed", "active"]},
            "budget.total_budget": {"$gt": 0}
        }).to_list(length=50)
        
        # Base estimation parameters
        base_hourly_rates = {
            "junior": 50,
            "mid": 80,
            "senior": 120,
            "lead": 150
        }
        
        # Project type multipliers
        project_multipliers = {
            "software_development": 1.0,
            "marketing_campaign": 0.6,
            "product_launch": 1.4,
            "research": 0.8,
            "infrastructure": 1.6,
            "design": 0.7,
            "consulting": 1.2
        }
        
        # Calculate historical averages
        if historical_projects:
            total_historical_budget = sum(p.get("budget", {}).get("total_budget", 0) for p in historical_projects)
            avg_historical_budget = total_historical_budget / len(historical_projects)
            
            total_historical_spent = sum(p.get("budget", {}).get("spent_amount", 0) for p in historical_projects)
            avg_historical_spent = total_historical_spent / len(historical_projects)
            
            avg_team_size = sum(len(p.get("team_members", [])) for p in historical_projects) / len(historical_projects)
        else:
            avg_historical_budget = 100000  # Default fallback
            avg_historical_spent = 80000
            avg_team_size = 5
        
        # Generate estimates
        estimates = []
        
        # Basic estimation method
        if team_size and duration_months:
            # Team composition estimation
            team_composition = {
                "junior": max(1, team_size // 4),
                "mid": max(1, team_size // 3),
                "senior": max(1, team_size // 4),
                "lead": 1 if team_size > 3 else 0
            }
            
            # Calculate labor costs
            monthly_labor_cost = 0
            hours_per_month = 160  # Standard working hours
            
            for role, count in team_composition.items():
                role_monthly_cost = count * base_hourly_rates[role] * hours_per_month
                monthly_labor_cost += role_monthly_cost
            
            total_labor_cost = monthly_labor_cost * duration_months
            
            # Apply project type multiplier
            multiplier = project_multipliers.get(project_type, 1.0)
            adjusted_labor_cost = total_labor_cost * multiplier
            
            # Add overhead costs (typically 30-50% of labor)
            overhead_cost = adjusted_labor_cost * 0.4
            
            # Add contingency (10-20%)
            contingency = adjusted_labor_cost * 0.15
            
            total_estimated_cost = adjusted_labor_cost + overhead_cost + contingency
            
            estimates.append({
                "method": "Team-Based Estimation",
                "total_cost": round(total_estimated_cost, 2),
                "breakdown": {
                    "labor_cost": round(adjusted_labor_cost, 2),
                    "overhead_cost": round(overhead_cost, 2),
                    "contingency": round(contingency, 2)
                },
                "details": {
                    "monthly_labor_cost": round(monthly_labor_cost, 2),
                    "duration_months": duration_months,
                    "team_composition": team_composition,
                    "project_multiplier": multiplier
                },
                "confidence": 85
            })
        
        # Historical comparison method
        if historical_projects:
            similar_projects = [
                p for p in historical_projects
                if (not project_type or p.get("category", "").lower() == project_type.lower())
            ]
            
            if similar_projects:
                avg_similar_budget = sum(p.get("budget", {}).get("total_budget", 0) for p in similar_projects) / len(similar_projects)
                avg_similar_spent = sum(p.get("budget", {}).get("spent_amount", 0) for p in similar_projects) / len(similar_projects)
                
                # Adjust based on team size if provided
                adjustment_factor = 1.0
                if team_size:
                    adjustment_factor = team_size / avg_team_size
                
                estimated_budget = avg_similar_budget * adjustment_factor
                estimated_spent = avg_similar_spent * adjustment_factor
                
                estimates.append({
                    "method": "Historical Comparison",
                    "total_cost": round(estimated_budget, 2),
                    "expected_spent": round(estimated_spent, 2),
                    "breakdown": {
                        "base_estimate": round(avg_similar_budget, 2),
                        "team_size_adjustment": round(adjustment_factor, 2),
                        "similar_projects_count": len(similar_projects)
                    },
                    "confidence": 75
                })
        
        # Quick estimation method (rule of thumb)
        if team_size:
            quick_estimate = team_size * 15000  # $15k per team member per month
            if duration_months:
                quick_estimate *= duration_months
            else:
                quick_estimate *= 6  # Default 6 months
            
            estimates.append({
                "method": "Quick Estimation",
                "total_cost": round(quick_estimate, 2),
                "breakdown": {
                    "cost_per_member_per_month": 15000,
                    "team_size": team_size,
                    "estimated_duration": duration_months or 6
                },
                "confidence": 60,
                "note": "Rule of thumb: $15k per team member per month"
            })
        
        # Return cost estimation data
        return {
            "estimates": estimates,
            "benchmarks": {
                "organization_avg_project_budget": round(avg_historical_budget, 2) if historical_projects else None,
                "organization_avg_team_size": round(avg_team_size, 1) if historical_projects else None,
                "industry_benchmarks": {
                    "software_development": {"cost_per_dev_month": 12000, "typical_duration_months": 8},
                    "marketing_campaign": {"cost_per_month": 25000, "typical_duration_months": 3},
                    "product_launch": {"cost_per_month": 40000, "typical_duration_months": 6}
                }
            },
            "recommendations": [
                "Consider adding 15-20% contingency for unforeseen costs",
                "Software projects typically see 20% scope creep",
                "Include regular budget reviews every 2 weeks",
                "Track actual vs. estimated hours for future accuracy"
            ],
            "parameters_used": {
                "project_type": project_type,
                "team_size": team_size,
                "duration_months": duration_months,
                "historical_projects_analyzed": len(historical_projects)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cost estimates: {str(e)}"
        )

@router.get("/detailed-breakdown/{project_id}")
async def get_project_detailed_cost_breakdown(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed cost breakdown for a specific project"""
    try:
        db = await get_database()
        
        # Check project access
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        if project["organization_id"] != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        
        # Get project budget info
        budget = project.get("budget", {})
        total_budget = budget.get("total_budget", 0) or 0
        spent_amount = budget.get("spent_amount", 0) or 0
        currency = budget.get("currency", "USD")
        
        # Get project tasks for task-based cost breakdown
        tasks = await db.tasks.find({"project_id": project_id}).to_list(length=None)
        
        # Get team members for team cost breakdown
        team_member_ids = project.get("team_members", []) + [project.get("owner_id")]
        team_members = await db.users.find({"id": {"$in": team_member_ids}}).to_list(length=None)
        
        # Generate cost breakdown by category (mock data based on spent amount)
        cost_categories = {
            "Labor": {"amount": spent_amount * 0.60, "percentage": 60},
            "Resources": {"amount": spent_amount * 0.20, "percentage": 20},
            "Materials": {"amount": spent_amount * 0.12, "percentage": 12},
            "Tools & Software": {"amount": spent_amount * 0.05, "percentage": 5},
            "Other": {"amount": spent_amount * 0.03, "percentage": 3}
        }
        
        # Generate task-based cost breakdown (mock data)
        task_costs = []
        for task in tasks[:10]:  # Limit to 10 tasks for sidebar
            estimated_hours = 10 + (len(task["name"]) % 20)  # Mock estimation
            hourly_rate = 75  # Average rate
            estimated_cost = estimated_hours * hourly_rate
            actual_cost = estimated_cost * (0.8 + (task.get("progress_percentage", 0) / 100) * 0.4)
            
            task_costs.append({
                "id": task["id"],
                "name": task["name"],
                "status": task.get("status", "todo"),
                "estimated_cost": round(estimated_cost, 2),
                "actual_cost": round(actual_cost, 2),
                "variance": round(actual_cost - estimated_cost, 2),
                "variance_percentage": round(((actual_cost - estimated_cost) / estimated_cost * 100) if estimated_cost > 0 else 0, 2)
            })
        
        # Generate team member cost breakdown (mock data)
        team_costs = []
        for member in team_members:
            member_tasks = [t for t in tasks if t.get("assigned_to") and current_user.id in t["assigned_to"]]
            hours_worked = len(member_tasks) * 15  # Mock hours
            hourly_rate = 75 + (len(member.get("first_name", "")) * 5)  # Mock rate variation
            total_cost = hours_worked * hourly_rate
            
            team_costs.append({
                "user_id": member["id"],
                "name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip(),
                "role": member.get("role", "member"),
                "hours_worked": hours_worked,
                "hourly_rate": hourly_rate,
                "total_cost": round(total_cost, 2),
                "tasks_assigned": len(member_tasks)
            })
        
        # Generate monthly spending timeline (mock data)
        monthly_spending = {}
        current_date = date.today()
        months_back = 6
        
        for i in range(months_back):
            month_date = (current_date.replace(day=1) - timedelta(days=30*i))
            month_key = month_date.strftime("%Y-%m")
            month_amount = spent_amount * (0.05 + (i * 0.02)) / months_back
            monthly_spending[month_key] = round(month_amount, 2)
        
        return {
            "project_id": project_id,
            "project_name": project["name"],
            "budget_summary": {
                "total_budget": total_budget,
                "spent_amount": spent_amount,
                "remaining_budget": total_budget - spent_amount,
                "budget_utilization": round((spent_amount / total_budget * 100) if total_budget > 0 else 0, 2),
                "currency": currency
            },
            "cost_breakdown": {
                "by_category": cost_categories,
                "by_task": task_costs,
                "by_team_member": team_costs,
                "monthly_timeline": dict(sorted(monthly_spending.items(), reverse=True))
            },
            "insights": {
                "cost_efficiency": round(100 - (spent_amount / total_budget * 100) if total_budget > 0 else 0, 2),
                "projected_completion_cost": round(spent_amount / (project.get("progress_percentage", 1) / 100) if project.get("progress_percentage", 0) > 0 else spent_amount, 2),
                "average_task_cost": round(sum(tc["actual_cost"] for tc in task_costs) / len(task_costs) if task_costs else 0, 2),
                "highest_cost_category": max(cost_categories.items(), key=lambda x: x[1]["amount"])[0] if cost_categories else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get detailed cost breakdown: {str(e)}"
        )

@router.get("/budget-alerts")
async def get_budget_alerts(
    current_user: User = Depends(get_current_user)
):
    """Get budget alerts and warnings for the organization"""
    try:
        db = await get_database()
        
        # Fetch all active projects
        projects = await db.projects.find({
            "organization_id": current_user.organization_id,
            "status": {"$in": ["planning", "active", "on_hold"]}
        }).to_list(length=None)
        
        alerts = []
        current_date = date.today()
        
        for project in projects:
            budget = project.get("budget", {})
            total_budget = budget.get("total_budget", 0) or 0
            spent_amount = budget.get("spent_amount", 0) or 0
            
            if total_budget <= 0:
                continue
                
            budget_utilization = (spent_amount / total_budget) * 100
            project_name = project["name"]
            project_id = project["id"]
            
            # Over budget alert
            if budget_utilization > 100:
                alerts.append({
                    "type": "over_budget",
                    "severity": "critical",
                    "project_id": project_id,
                    "project_name": project_name,
                    "message": f"Project is {budget_utilization - 100:.1f}% over budget",
                    "details": {
                        "budget_utilization": round(budget_utilization, 2),
                        "total_budget": total_budget,
                        "spent_amount": spent_amount,
                        "overage": spent_amount - total_budget
                    }
                })
            
            # High utilization warning
            elif budget_utilization > 80:
                alerts.append({
                    "type": "high_utilization",
                    "severity": "warning",
                    "project_id": project_id,
                    "project_name": project_name,
                    "message": f"Project is at {budget_utilization:.1f}% budget utilization",
                    "details": {
                        "budget_utilization": round(budget_utilization, 2),
                        "total_budget": total_budget,
                        "spent_amount": spent_amount,
                        "remaining": total_budget - spent_amount
                    }
                })
            
            # Due date approaching with high spending
            due_date = project.get("due_date")
            if due_date and budget_utilization > 50:
                try:
                    if isinstance(due_date, str):
                        due_date_obj = datetime.fromisoformat(due_date.replace("Z", "")).date()
                    else:
                        due_date_obj = due_date
                    
                    days_remaining = (due_date_obj - current_date).days
                    
                    if 0 < days_remaining <= 30:
                        alerts.append({
                            "type": "deadline_budget_risk",
                            "severity": "warning",
                            "project_id": project_id,
                            "project_name": project_name,
                            "message": f"Project due in {days_remaining} days with {budget_utilization:.1f}% budget used",
                            "details": {
                                "days_remaining": days_remaining,
                                "budget_utilization": round(budget_utilization, 2),
                                "due_date": due_date_obj.isoformat()
                            }
                        })
                except:
                    pass
        
        # Sort alerts by severity
        severity_order = {"critical": 3, "warning": 2, "info": 1}
        alerts.sort(key=lambda x: severity_order.get(x["severity"], 0), reverse=True)
        
        return {
            "alerts": alerts[:10],  # Limit to top 10 alerts
            "summary": {
                "total_alerts": len(alerts),
                "critical_count": len([a for a in alerts if a["severity"] == "critical"]),
                "warning_count": len([a for a in alerts if a["severity"] == "warning"]),
                "info_count": len([a for a in alerts if a["severity"] == "info"])
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get budget alerts: {str(e)}"
        )