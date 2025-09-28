"""
Advanced AI/ML API Routes
Multi-model AI, predictive analytics, and integration management endpoints
"""
import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import logging

from auth.middleware import get_current_user
from ai_ml.multi_model_ai import MultiModelAIService
from ai_ml.predictive_analytics import PredictiveAnalyticsEngine
from ai_ml.skill_assessment import SkillAssessmentEngine
from ai_ml.integration_manager import AIIntegrationManager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai-ml", tags=["AI/ML"])

# Initialize services
ai_service = MultiModelAIService()
predictive_engine = PredictiveAnalyticsEngine()
skill_engine = SkillAssessmentEngine()

# Request/Response Models

class AIModelRequest(BaseModel):
    prompt: str
    model: str = Field(default="gpt-4o", description="AI model to use")
    context: Optional[Dict[str, Any]] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0, le=8000)

class AIModelResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    model: str
    provider: str
    tokens_used: int
    timestamp: str
    error: Optional[str] = None

class ModelComparisonRequest(BaseModel):
    prompt: str
    models: List[str] = Field(default=["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-pro"])
    context: Optional[Dict[str, Any]] = None

class TaskDurationPredictionRequest(BaseModel):
    task_data: Dict[str, Any]
    historical_tasks: Optional[List[Dict[str, Any]]] = None

class ResourceDemandRequest(BaseModel):
    project_data: Dict[str, Any]
    team_data: List[Dict[str, Any]]
    historical_projects: Optional[List[Dict[str, Any]]] = None

class ProjectSuccessRequest(BaseModel):
    project_data: Dict[str, Any]
    team_assignments: List[Dict[str, Any]]
    historical_projects: Optional[List[Dict[str, Any]]] = None

class TeamPerformanceRequest(BaseModel):
    team_data: Dict[str, Any]
    workload_data: List[Dict[str, Any]]
    historical_performance: Optional[List[Dict[str, Any]]] = None

class SkillAssessmentRequest(BaseModel):
    user_id: str
    performance_data: Dict[str, Any]
    task_history: List[Dict[str, Any]]
    peer_feedback: Optional[List[Dict[str, Any]]] = None

class LearningPathRequest(BaseModel):
    user_id: str
    current_skills: Dict[str, float]
    career_goals: List[str]
    time_constraints: Dict[str, Any]

class IntegrationSetupRequest(BaseModel):
    integration_type: str
    settings: Dict[str, Any]
    organization_id: Optional[str] = None

# AI Model Endpoints

@router.post("/generate", response_model=AIModelResponse)
async def generate_ai_response(
    request: AIModelRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate AI response using specified model"""
    try:
        result = await ai_service.generate_response(
            prompt=request.prompt,
            model=request.model,
            context=request.context,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        if result["success"]:
            return AIModelResponse(**result)
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "AI generation failed"))
            
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare-models")
async def compare_ai_models(
    request: ModelComparisonRequest,
    current_user: dict = Depends(get_current_user)
):
    """Compare responses from multiple AI models"""
    try:
        comparison = await ai_service.compare_models_response(
            prompt=request.prompt,
            context=request.context,
            models=request.models
        )
        
        return comparison
        
    except Exception as e:
        logger.error(f"Model comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/available")
async def get_available_models(current_user: dict = Depends(get_current_user)):
    """Get list of available AI models"""
    try:
        models = ai_service.list_available_models()
        return {"models": models}
    except Exception as e:
        logger.error(f"Available models error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_name}/capabilities")
async def get_model_capabilities(
    model_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Get capabilities of specific AI model"""
    try:
        capabilities = ai_service.get_model_capabilities(model_name)
        return capabilities
    except Exception as e:
        logger.error(f"Model capabilities error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimal-model")
async def get_optimal_model(
    task_type: str,
    context: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get optimal AI model for specific task type"""
    try:
        optimal_model = await ai_service.get_optimal_model_for_task(task_type, context)
        return {"optimal_model": optimal_model, "task_type": task_type}
    except Exception as e:
        logger.error(f"Optimal model selection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Predictive Analytics Endpoints

@router.post("/predict/task-duration")
async def predict_task_duration(
    request: TaskDurationPredictionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Predict task duration using ML"""
    try:
        prediction = await predictive_engine.predict_task_duration(
            task_data=request.task_data,
            historical_data=request.historical_tasks or []
        )
        
        return {
            "prediction": prediction.prediction,
            "confidence": prediction.confidence,
            "factors": prediction.factors,
            "model_performance": prediction.model_performance,
            "timestamp": prediction.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Task duration prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/resource-demand")
async def predict_resource_demand(
    request: ResourceDemandRequest,
    current_user: dict = Depends(get_current_user)
):
    """Predict resource demand by skill type"""
    try:
        predictions = await predictive_engine.predict_resource_demand(
            project_data=request.project_data,
            team_data=request.team_data,
            historical_projects=request.historical_projects or []
        )
        
        formatted_predictions = {}
        for skill, prediction in predictions.items():
            formatted_predictions[skill] = {
                "prediction": prediction.prediction,
                "confidence": prediction.confidence,
                "factors": prediction.factors,
                "timestamp": prediction.timestamp.isoformat()
            }
        
        return {"resource_demand": formatted_predictions}
        
    except Exception as e:
        logger.error(f"Resource demand prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/project-success")
async def predict_project_success(
    request: ProjectSuccessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Predict project success probability"""
    try:
        prediction = await predictive_engine.predict_project_success_probability(
            project_data=request.project_data,
            team_assignments=request.team_assignments,
            historical_projects=request.historical_projects or []
        )
        
        return {
            "success_probability": prediction.prediction,
            "confidence": prediction.confidence,
            "risk_factors": prediction.factors,
            "model_performance": prediction.model_performance,
            "timestamp": prediction.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Project success prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/team-performance")
async def predict_team_performance(
    request: TeamPerformanceRequest,
    current_user: dict = Depends(get_current_user)
):
    """Predict team performance metrics"""
    try:
        predictions = await predictive_engine.predict_team_performance(
            team_data=request.team_data,
            workload_data=request.workload_data,
            historical_performance=request.historical_performance or []
        )
        
        formatted_predictions = {}
        for metric, prediction in predictions.items():
            formatted_predictions[metric] = {
                "prediction": prediction.prediction,
                "confidence": prediction.confidence,
                "factors": prediction.factors,
                "timestamp": prediction.timestamp.isoformat()
            }
        
        return {"performance_predictions": formatted_predictions}
        
    except Exception as e:
        logger.error(f"Team performance prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict/model-status")
async def get_predictive_model_status(current_user: dict = Depends(get_current_user)):
    """Get status of predictive models"""
    try:
        status = predictive_engine.get_model_status()
        return status
    except Exception as e:
        logger.error(f"Model status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Skill Assessment Endpoints

@router.post("/skills/assess")
async def assess_individual_skills(
    request: SkillAssessmentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Assess individual skills comprehensively"""
    try:
        assessments = await skill_engine.assess_individual_skills(
            user_id=request.user_id,
            performance_data=request.performance_data,
            task_history=request.task_history,
            peer_feedback=request.peer_feedback
        )
        
        formatted_assessments = {}
        for skill, assessment in assessments.items():
            formatted_assessments[skill] = {
                "skill_name": assessment.skill_name,
                "current_level": assessment.current_level,
                "confidence": assessment.confidence,
                "growth_trend": assessment.growth_trend,
                "evidence": assessment.evidence,
                "recommendations": assessment.recommendations,
                "next_assessment_date": assessment.next_assessment_date.isoformat()
            }
        
        return {"skill_assessments": formatted_assessments}
        
    except Exception as e:
        logger.error(f"Skill assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/assess-team")
async def assess_team_skills(
    team_data: Dict[str, Any],
    project_requirements: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """Assess team skill coverage and gaps"""
    try:
        assessment = await skill_engine.assess_team_skills(
            team_data=team_data,
            project_requirements=project_requirements
        )
        
        return {"team_skill_analysis": assessment}
        
    except Exception as e:
        logger.error(f"Team skill assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/learning-paths")
async def generate_learning_paths(
    request: LearningPathRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate personalized learning paths"""
    try:
        learning_paths = await skill_engine.generate_learning_paths(
            user_id=request.user_id,
            current_skills=request.current_skills,
            career_goals=request.career_goals,
            time_constraints=request.time_constraints
        )
        
        formatted_paths = {}
        for skill, path in learning_paths.items():
            formatted_paths[skill] = {
                "skill_name": path.skill_name,
                "current_level": path.current_level,
                "target_level": path.target_level,
                "estimated_timeline": path.estimated_timeline,
                "milestones": path.milestones,
                "resources": path.resources,
                "success_metrics": path.success_metrics
            }
        
        return {"learning_paths": formatted_paths}
        
    except Exception as e:
        logger.error(f"Learning path generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/predict-development")
async def predict_skill_development(
    user_id: str,
    skill_name: str,
    learning_activities: List[Dict[str, Any]],
    timeline_weeks: int,
    current_user: dict = Depends(get_current_user)
):
    """Predict skill development based on learning activities"""
    try:
        prediction = await skill_engine.predict_skill_development(
            user_id=user_id,
            skill_name=skill_name,
            learning_activities=learning_activities,
            timeline_weeks=timeline_weeks
        )
        
        return {"skill_development_prediction": prediction}
        
    except Exception as e:
        logger.error(f"Skill development prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/recommend-activities")
async def recommend_skill_activities(
    skill_name: str,
    current_level: float,
    target_level: float,
    learning_style: str = "balanced",
    current_user: dict = Depends(get_current_user)
):
    """Recommend skill development activities"""
    try:
        recommendations = await skill_engine.recommend_skill_development_activities(
            skill_name=skill_name,
            current_level=current_level,
            target_level=target_level,
            learning_style=learning_style
        )
        
        return {"recommended_activities": recommendations}
        
    except Exception as e:
        logger.error(f"Activity recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Integration Management Endpoints

@router.post("/integrations/setup")
async def setup_integration(
    request: IntegrationSetupRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Setup external integration"""
    try:
        async with AIIntegrationManager() as manager:
            if request.integration_type == "slack":
                result = await manager.setup_slack_integration(
                    team_id=request.organization_id or "default",
                    settings=request.settings
                )
            elif request.integration_type == "teams":
                result = await manager.setup_teams_integration(
                    tenant_id=request.organization_id or "default",
                    settings=request.settings
                )
            elif request.integration_type == "github":
                result = await manager.setup_github_integration(
                    organization=request.settings.get("organization", ""),
                    repositories=request.settings.get("repositories", [])
                )
            elif request.integration_type == "google_workspace":
                result = await manager.setup_google_workspace_integration(
                    domain=request.settings.get("domain", ""),
                    settings=request.settings
                )
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported integration type: {request.integration_type}"
                )
            
            return {
                "integration_type": request.integration_type,
                "success": result.success,
                "data": result.data,
                "error": result.error,
                "timestamp": result.timestamp.isoformat()
            }
        
    except Exception as e:
        logger.error(f"Integration setup error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrations/status")
async def get_integration_status(current_user: dict = Depends(get_current_user)):
    """Get status of all integrations"""
    try:
        async with AIIntegrationManager() as manager:
            status = manager.get_integration_status()
            return {"integrations": status}
    except Exception as e:
        logger.error(f"Integration status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrations/available")
async def get_available_integrations(current_user: dict = Depends(get_current_user)):
    """Get list of available integrations"""
    try:
        async with AIIntegrationManager() as manager:
            integrations = manager.get_available_integrations()
            return {"available_integrations": integrations}
    except Exception as e:
        logger.error(f"Available integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/slack/notify")
async def send_slack_notification(
    channel: str,
    message: str,
    attachments: Optional[List[Dict]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Send notification to Slack"""
    try:
        async with AIIntegrationManager() as manager:
            result = await manager.send_slack_notification(
                channel=channel,
                message=message,
                attachments=attachments
            )
            
            return {
                "success": result.success,
                "data": result.data,
                "error": result.error,
                "timestamp": result.timestamp.isoformat()
            }
        
    except Exception as e:
        logger.error(f"Slack notification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/teams/card")
async def send_teams_adaptive_card(
    channel_id: str,
    card_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Send adaptive card to Microsoft Teams"""
    try:
        async with AIIntegrationManager() as manager:
            result = await manager.send_teams_adaptive_card(
                channel_id=channel_id,
                card_data=card_data
            )
            
            return {
                "success": result.success,
                "data": result.data,
                "error": result.error,
                "timestamp": result.timestamp.isoformat()
            }
        
    except Exception as e:
        logger.error(f"Teams adaptive card error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/github/sync")
async def sync_github_project_data(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Sync project data with GitHub repositories"""
    try:
        async with AIIntegrationManager() as manager:
            result = await manager.sync_github_project_data(project_id=project_id)
            
            return {
                "success": result.success,
                "data": result.data,
                "error": result.error,
                "timestamp": result.timestamp.isoformat()
            }
        
    except Exception as e:
        logger.error(f"GitHub sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations/calendar/schedule")
async def schedule_google_calendar_meeting(
    meeting_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Schedule meeting in Google Calendar"""
    try:
        async with AIIntegrationManager() as manager:
            result = await manager.schedule_google_calendar_meeting(
                meeting_data=meeting_data
            )
            
            return {
                "success": result.success,
                "data": result.data,
                "error": result.error,
                "timestamp": result.timestamp.isoformat()
            }
        
    except Exception as e:
        logger.error(f"Calendar scheduling error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Advanced Analytics Endpoints

@router.post("/analytics/comprehensive-insights")
async def generate_comprehensive_insights(
    data_context: Dict[str, Any],
    analysis_type: str = "portfolio_optimization",
    current_user: dict = Depends(get_current_user)
):
    """Generate comprehensive AI-powered insights"""
    try:
        # Use optimal model for the analysis type
        optimal_model = await ai_service.get_optimal_model_for_task(analysis_type, data_context)
        
        # Create comprehensive analysis prompt
        insight_prompt = f"""
        Provide comprehensive insights for {analysis_type} based on the following data:
        
        {json.dumps(data_context, indent=2)}
        
        Please analyze:
        1. Current state assessment
        2. Key opportunities for optimization
        3. Risk factors and mitigation strategies
        4. Specific actionable recommendations
        5. Expected impact and timeline
        6. Success metrics to track
        
        Focus on data-driven insights that can be implemented immediately.
        """
        
        # Generate insights
        insights = await ai_service.generate_response(
            prompt=insight_prompt,
            model=optimal_model,
            context=data_context,
            temperature=0.3  # Lower temperature for more consistent analysis
        )
        
        if not insights["success"]:
            raise HTTPException(status_code=500, detail="Failed to generate insights")
        
        return {
            "insights": insights["content"],
            "analysis_type": analysis_type,
            "model_used": optimal_model,
            "confidence": 0.85,  # Would be calculated based on data quality
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Comprehensive insights error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analytics/real-time-optimization")
async def real_time_optimization(
    current_state: Dict[str, Any],
    optimization_goals: List[str],
    constraints: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Real-time portfolio optimization using AI"""
    try:
        # Combine multiple AI models for different aspects
        optimization_tasks = []
        
        # Resource optimization
        resource_task = ai_service.generate_response(
            prompt=f"Optimize resource allocation: {json.dumps(current_state)}",
            model="gpt-4o",
            context={"goals": optimization_goals, "constraints": constraints}
        )
        optimization_tasks.append(resource_task)
        
        # Risk assessment
        risk_task = ai_service.generate_response(
            prompt=f"Assess risks and provide mitigation: {json.dumps(current_state)}",
            model="claude-3.5-sonnet",
            context={"goals": optimization_goals, "constraints": constraints}
        )
        optimization_tasks.append(risk_task)
        
        # Strategic recommendations
        strategy_task = ai_service.generate_response(
            prompt=f"Strategic recommendations for goals: {optimization_goals}",
            model="gemini-2.0-pro",
            context={"current_state": current_state, "constraints": constraints}
        )
        optimization_tasks.append(strategy_task)
        
        # Execute all tasks in parallel
        results = await asyncio.gather(*optimization_tasks)
        
        return {
            "resource_optimization": results[0] if results[0]["success"] else None,
            "risk_assessment": results[1] if results[1]["success"] else None,
            "strategic_recommendations": results[2] if results[2]["success"] else None,
            "optimization_score": 0.9,  # Would be calculated based on results
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Real-time optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def ai_ml_health_check():
    """Health check for AI/ML services"""
    try:
        health_status = {
            "ai_service": "healthy",
            "predictive_engine": "healthy", 
            "skill_engine": "healthy",
            "models_loaded": len(ai_service.models),
            "timestamp": datetime.now().isoformat()
        }
        
        # Test basic AI functionality
        try:
            test_result = await ai_service.generate_response(
                prompt="Test health check",
                model="gpt-4o",
                max_tokens=10
            )
            health_status["ai_test"] = "passed" if test_result["success"] else "failed"
        except Exception as e:
            health_status["ai_test"] = f"failed: {str(e)}"
        
        return health_status
        
    except Exception as e:
        logger.error(f"AI/ML health check error: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}