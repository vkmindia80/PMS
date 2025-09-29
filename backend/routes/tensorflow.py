"""
TensorFlow.js Integration API Routes
Client-side machine learning model management and training data endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Any, Optional
import logging

from auth.middleware import get_current_user
from ai_ml.tensorflow_integration import TensorFlowIntegrationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tensorflow", tags=["TensorFlow.js"])

# Initialize TensorFlow integration service
tf_service = TensorFlowIntegrationService()

@router.get("/models")
async def get_available_models(current_user: dict = Depends(get_current_user)):
    """Get all available TensorFlow.js models with configurations"""
    try:
        models = tf_service.get_all_models()
        
        model_configs = {}
        for model_name, model_config in models.items():
            model_configs[model_name] = tf_service.generate_model_metadata(model_name)
        
        return {
            "models": model_configs,
            "total_models": len(model_configs),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error getting available models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_name}")
async def get_model_configuration(
    model_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific model configuration and metadata"""
    try:
        config = tf_service.get_model_configuration(model_name)
        
        if not config:
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
        
        metadata = tf_service.generate_model_metadata(model_name)
        
        return {
            "model_name": model_name,
            "configuration": metadata,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting model configuration for {model_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_name}/training-data")
async def prepare_model_training_data(
    model_name: str,
    limit: Optional[int] = 1000,
    current_user: dict = Depends(get_current_user)
):
    """Prepare training data for TensorFlow.js model"""
    try:
        # This would fetch real data from database in production
        # For now, we'll return sample training data
        
        if model_name == "task_duration":
            sample_data = generate_sample_task_data(limit)
        elif model_name == "project_success":
            sample_data = generate_sample_project_data(limit)
        elif model_name == "resource_utilization":
            sample_data = generate_sample_resource_data(limit)
        elif model_name == "team_performance":
            sample_data = generate_sample_performance_data(limit)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")
        
        # Prepare training data using TensorFlow service
        training_data = tf_service.prepare_training_data(model_name, sample_data)
        
        return {
            "model_name": model_name,
            "training_data": training_data,
            "sample_count": training_data.get("sample_count", 0),
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparing training data for {model_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/architectures")
async def get_model_architectures(current_user: dict = Depends(get_current_user)):
    """Get TensorFlow.js model architecture specifications"""
    try:
        architectures = tf_service.get_model_architectures()
        
        return {
            "architectures": architectures,
            "total_architectures": len(architectures),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error getting model architectures: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/architectures/{model_name}")
async def get_model_architecture(
    model_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific model architecture specification"""
    try:
        architectures = tf_service.get_model_architectures()
        
        if model_name not in architectures:
            raise HTTPException(status_code=404, detail=f"Architecture for '{model_name}' not found")
        
        return {
            "model_name": model_name,
            "architecture": architectures[model_name],
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting architecture for {model_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system-info")
async def get_tensorflow_system_info(current_user: dict = Depends(get_current_user)):
    """Get TensorFlow.js system information and capabilities"""
    try:
        return {
            "tensorflow_version": "4.20.0",  # Latest TensorFlow.js version
            "supported_backends": ["webgl", "cpu", "wasm"],
            "recommended_backend": "webgl",
            "browser_compatibility": {
                "chrome": ">=58",
                "firefox": ">=57", 
                "safari": ">=11",
                "edge": ">=79"
            },
            "memory_requirements": {
                "minimum_ram": "2GB",
                "recommended_ram": "4GB",
                "gpu_memory": "512MB"
            },
            "performance_tips": [
                "Use WebGL backend for GPU acceleration",
                "Enable memory management with tf.dispose()",
                "Use batch predictions for better efficiency",
                "Cache models in browser storage",
                "Monitor memory usage with tf.memory()"
            ],
            "status": "ready"
        }
        
    except Exception as e:
        logger.error(f"Error getting TensorFlow system info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions to generate sample training data

def generate_sample_task_data(limit: int) -> List[Dict[str, Any]]:
    """Generate sample task data for training"""
    import random
    
    sample_data = []
    
    for i in range(min(limit, 500)):  # Generate up to 500 sample tasks
        complexity = random.uniform(1, 10)
        priority = random.choice(["low", "medium", "high", "critical"])
        skills_count = random.randint(1, 5)
        estimated_hours = random.uniform(2, 40)
        dependencies = random.randint(0, 5)
        has_external = random.choice([True, False])
        team_size = random.randint(1, 8)
        experience = random.uniform(1, 10)
        
        # Calculate actual hours with some realistic variance
        base_multiplier = 1.0
        if complexity > 7:
            base_multiplier *= 1.3
        if priority in ["high", "critical"]:
            base_multiplier *= 1.1
        if has_external:
            base_multiplier *= 1.2
        if experience < 3:
            base_multiplier *= 1.4
        
        actual_hours = estimated_hours * base_multiplier * random.uniform(0.8, 1.5)
        
        sample_data.append({
            "id": f"task_{i}",
            "complexity_score": complexity,
            "priority": priority,
            "required_skills": [f"skill_{j}" for j in range(skills_count)],
            "estimated_hours": estimated_hours,
            "dependencies": [f"dep_{j}" for j in range(dependencies)],
            "has_external_dependency": has_external,
            "team_size": team_size,
            "assignee_experience": experience,
            "actual_hours": actual_hours,
            "status": "completed"
        })
    
    return sample_data

def generate_sample_project_data(limit: int) -> List[Dict[str, Any]]:
    """Generate sample project data for training"""
    import random
    
    sample_data = []
    
    for i in range(min(limit, 200)):  # Generate up to 200 sample projects
        budget_adequacy = random.uniform(3, 8)
        stakeholder_alignment = random.uniform(3, 9)
        scope_clarity = random.uniform(2, 8)
        timeline_realism = random.uniform(3, 8)
        team_experience = random.uniform(3, 9)
        technical_risk = random.uniform(1, 8)
        complexity_score = random.uniform(3, 9)
        has_sponsor = random.choice([True, False])
        
        # Calculate success probability
        success_score = (
            budget_adequacy * 0.2 + 
            stakeholder_alignment * 0.15 +
            scope_clarity * 0.15 +
            timeline_realism * 0.2 +
            team_experience * 0.15 +
            (10 - technical_risk) * 0.1 +
            (has_sponsor * 2)
        ) / 10
        
        # Add some randomness
        success_score *= random.uniform(0.7, 1.3)
        
        is_successful = success_score > 0.6
        on_time = success_score > 0.65 and random.choice([True, True, False])
        within_budget = success_score > 0.6 and random.choice([True, True, False])
        
        sample_data.append({
            "id": f"project_{i}",
            "budget_adequacy": budget_adequacy,
            "stakeholder_alignment": stakeholder_alignment,
            "scope_clarity": scope_clarity,
            "timeline_realism": timeline_realism,
            "team_experience": team_experience,
            "technical_risk": technical_risk,
            "complexity_score": complexity_score,
            "has_executive_sponsor": has_sponsor,
            "status": "completed" if is_successful else random.choice(["failed", "cancelled"]),
            "on_time": on_time,
            "within_budget": within_budget,
            "team_assignments": []
        })
    
    return sample_data

def generate_sample_resource_data(limit: int) -> List[Dict[str, Any]]:
    """Generate sample resource utilization data"""
    import random
    
    sample_data = []
    
    for i in range(min(limit, 150)):
        complexity = random.uniform(3, 8)
        team_size = random.randint(3, 12)
        budget = random.uniform(20000, 200000)
        milestones = random.randint(2, 8)
        duration_weeks = random.randint(6, 24)
        has_deps = random.choice([True, False])
        risk_score = random.uniform(1, 7)
        stakeholders = random.randint(2, 8)
        
        # Generate resource utilization based on project characteristics
        utilization = {}
        total_allocation = 1.0
        
        # Frontend typically 25-35% in web projects
        frontend = random.uniform(0.2, 0.4) if complexity > 5 else random.uniform(0.15, 0.3)
        utilization["frontend_development"] = frontend
        total_allocation -= frontend
        
        # Backend typically 30-40%
        backend = min(random.uniform(0.25, 0.45), total_allocation * 0.8)
        utilization["backend_development"] = backend
        total_allocation -= backend
        
        # Distribute remaining capacity
        remaining_skills = ["devops", "design", "data_science", "project_management", "testing"]
        for skill in remaining_skills:
            if total_allocation > 0.05:
                allocation = min(random.uniform(0.05, 0.2), total_allocation - 0.05)
                utilization[skill] = allocation
                total_allocation -= allocation
            else:
                utilization[skill] = 0.0
        
        sample_data.append({
            "id": f"project_{i}",
            "complexity_score": complexity,
            "team_size": team_size,
            "budget": budget,
            "milestones": [f"milestone_{j}" for j in range(milestones)],
            "duration_weeks": duration_weeks,
            "has_dependencies": has_deps,
            "risk_score": risk_score,
            "stakeholder_count": stakeholders,
            "team_avg_experience": random.uniform(3, 8),
            "priority": random.choice(["low", "medium", "high"]),
            "resource_utilization": utilization
        })
    
    return sample_data

def generate_sample_performance_data(limit: int) -> List[Dict[str, Any]]:
    """Generate sample team performance data"""
    import random
    
    sample_data = []
    
    for i in range(min(limit, 100)):
        team_size = random.randint(3, 10)
        avg_workload = random.uniform(25, 45)
        high_priority_ratio = random.uniform(0.1, 0.5)
        avg_experience = random.uniform(2, 8)
        skill_diversity = random.uniform(2, 8)
        skill_match_ratio = random.uniform(0.4, 0.9)
        overtime_factor = random.uniform(0.0, 0.4)
        project_count = random.randint(1, 6)
        team_avg_age = random.uniform(22, 45)
        collaboration_score = random.uniform(4, 9)
        deadline_pressure = random.uniform(0.1, 0.7)
        team_cohesion = random.uniform(3, 9)
        
        # Calculate performance metrics
        productivity_base = 0.7
        if avg_workload < 35:
            productivity_base += 0.1
        if avg_experience > 5:
            productivity_base += 0.1
        if skill_match_ratio > 0.7:
            productivity_base += 0.1
        if overtime_factor > 0.2:
            productivity_base -= 0.15
        
        productivity_score = max(0.3, min(1.0, productivity_base * random.uniform(0.8, 1.2)))
        
        # Burnout risk
        burnout_risk = overtime_factor * 0.4 + high_priority_ratio * 0.3 + deadline_pressure * 0.3
        burnout_risk = max(0.0, min(1.0, burnout_risk * random.uniform(0.7, 1.3)))
        
        # Collaboration effectiveness
        collaboration_eff = (collaboration_score / 9) * 0.6 + (skill_diversity / 8) * 0.4
        collaboration_eff = max(0.2, min(1.0, collaboration_eff * random.uniform(0.8, 1.2)))
        
        # Skill development rate
        skill_dev_rate = (avg_experience < 3 ? 0.8 : 0.6) * (collaboration_score / 9)
        skill_dev_rate = max(0.1, min(1.0, skill_dev_rate * random.uniform(0.6, 1.4)))
        
        sample_data.append({
            "id": f"team_period_{i}",
            "team_size": team_size,
            "avg_workload_hours": avg_workload,
            "high_priority_ratio": high_priority_ratio,
            "avg_experience": avg_experience,
            "skill_diversity_score": skill_diversity,
            "skill_match_ratio": skill_match_ratio,
            "overtime_factor": overtime_factor,
            "project_count": project_count,
            "team_avg_age": team_avg_age,
            "collaboration_score": collaboration_score,
            "deadline_pressure": deadline_pressure,
            "team_cohesion": team_cohesion,
            "performance_metrics": {
                "productivity_score": productivity_score,
                "burnout_risk": burnout_risk,
                "collaboration_effectiveness": collaboration_eff,
                "skill_development_rate": skill_dev_rate
            }
        })
    
    return sample_data