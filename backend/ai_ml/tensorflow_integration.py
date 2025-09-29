"""
TensorFlow.js Integration for Client-Side Machine Learning
Advanced predictive models running in the browser
"""
import json
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class TensorFlowModel:
    """TensorFlow.js model configuration"""
    name: str
    model_url: str
    input_shape: List[int]
    output_shape: List[int]
    model_type: str  # 'regression', 'classification', 'time_series'
    preprocessing: Dict[str, Any]
    postprocessing: Dict[str, Any]

class TensorFlowIntegrationService:
    """Service for managing TensorFlow.js models and client-side ML"""
    
    def __init__(self):
        self.models = {}
        self.model_registry = {}
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize available TensorFlow.js models"""
        
        # Task Duration Prediction Model
        self.model_registry["task_duration"] = TensorFlowModel(
            name="task_duration_predictor",
            model_url="/models/task_duration_model.json",
            input_shape=[8],  # 8 features: complexity, priority, skills_count, etc.
            output_shape=[1],  # 1 output: predicted hours
            model_type="regression",
            preprocessing={
                "scaler_mean": [5.0, 1.5, 3.0, 8.0, 2.0, 0.3, 4.0, 5.0],
                "scaler_std": [2.0, 0.8, 2.0, 6.0, 1.5, 0.5, 2.0, 2.0],
                "feature_names": [
                    "complexity_score", "priority_weight", "required_skills_count",
                    "estimated_hours", "dependencies_count", "has_external_dependency",
                    "team_size", "experience_level"
                ]
            },
            postprocessing={
                "min_value": 0.5,  # Minimum task duration
                "max_value": 200.0,  # Maximum task duration
                "scale_factor": 1.0
            }
        )
        
        # Resource Utilization Model
        self.model_registry["resource_utilization"] = TensorFlowModel(
            name="resource_utilization_predictor",
            model_url="/models/resource_utilization_model.json",
            input_shape=[10],  # Project and team features
            output_shape=[7],   # 7 skill categories
            model_type="regression",
            preprocessing={
                "scaler_mean": [5.0, 5.0, 50000.0, 3.0, 12.0, 0.5, 3.0, 3.0, 25.0, 5.0],
                "scaler_std": [2.0, 2.0, 30000.0, 2.0, 8.0, 0.5, 2.0, 2.0, 15.0, 2.0],
                "feature_names": [
                    "project_complexity", "team_size", "budget", "milestones_count",
                    "duration_weeks", "has_dependencies", "risk_score", "stakeholder_count",
                    "team_avg_experience", "project_priority"
                ]
            },
            postprocessing={
                "skill_categories": [
                    "frontend_development", "backend_development", "devops",
                    "design", "data_science", "project_management", "testing"
                ],
                "scale_factor": 1.0
            }
        )
        
        # Team Performance Predictor
        self.model_registry["team_performance"] = TensorFlowModel(
            name="team_performance_predictor", 
            model_url="/models/team_performance_model.json",
            input_shape=[12],  # Team and workload features
            output_shape=[4],   # 4 performance metrics
            model_type="regression",
            preprocessing={
                "scaler_mean": [5.0, 35.0, 0.3, 5.0, 3.0, 0.6, 0.2, 8.0, 6.0, 15.0, 0.4, 5.0],
                "scaler_std": [2.0, 10.0, 0.2, 2.0, 2.0, 0.3, 0.2, 3.0, 3.0, 8.0, 0.3, 2.0],
                "feature_names": [
                    "team_size", "avg_workload_hours", "high_priority_ratio", 
                    "avg_experience", "skill_diversity_score", "skill_match_ratio",
                    "overtime_factor", "project_count", "team_avg_age", 
                    "collaboration_score", "deadline_pressure", "team_cohesion"
                ]
            },
            postprocessing={
                "metrics": ["productivity_score", "burnout_risk", "collaboration_effectiveness", "skill_development_rate"],
                "scale_factor": 1.0
            }
        )
        
        # Project Success Classifier
        self.model_registry["project_success"] = TensorFlowModel(
            name="project_success_classifier",
            model_url="/models/project_success_model.json", 
            input_shape=[8],   # Success factors
            output_shape=[2],  # Binary classification: success/failure
            model_type="classification",
            preprocessing={
                "scaler_mean": [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 3.0, 0.5],
                "scaler_std": [2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 0.5],
                "feature_names": [
                    "budget_adequacy", "stakeholder_alignment", "scope_clarity",
                    "timeline_realism", "team_experience", "technical_risk",
                    "complexity_score", "has_executive_sponsor"
                ]
            },
            postprocessing={
                "labels": ["failure", "success"],
                "threshold": 0.5
            }
        )
    
    def get_model_configuration(self, model_name: str) -> Optional[TensorFlowModel]:
        """Get configuration for TensorFlow.js model"""
        return self.model_registry.get(model_name)
    
    def get_all_models(self) -> Dict[str, TensorFlowModel]:
        """Get all available TensorFlow.js models"""
        return self.model_registry
    
    def generate_model_metadata(self, model_name: str) -> Dict[str, Any]:
        """Generate metadata for client-side model loading"""
        model = self.model_registry.get(model_name)
        if not model:
            return {"error": f"Model {model_name} not found"}
        
        return {
            "name": model.name,
            "url": model.model_url,
            "inputShape": model.input_shape,
            "outputShape": model.output_shape,
            "modelType": model.model_type,
            "preprocessing": model.preprocessing,
            "postprocessing": model.postprocessing,
            "version": "1.0.0",
            "lastUpdated": datetime.now().isoformat(),
            "description": self._get_model_description(model_name)
        }
    
    def _get_model_description(self, model_name: str) -> str:
        """Get human-readable description of model"""
        descriptions = {
            "task_duration": "Predicts task completion time based on complexity, team experience, and historical data",
            "resource_utilization": "Forecasts resource demand by skill category for project planning",
            "team_performance": "Evaluates team productivity, burnout risk, and collaboration effectiveness",
            "project_success": "Classifies project success probability based on key risk factors"
        }
        return descriptions.get(model_name, "Advanced ML model for portfolio optimization")
    
    def prepare_training_data(self, model_name: str, raw_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Prepare training data for TensorFlow.js model"""
        model = self.model_registry.get(model_name)
        if not model:
            raise ValueError(f"Model {model_name} not found")
        
        if model_name == "task_duration":
            return self._prepare_task_duration_data(raw_data, model)
        elif model_name == "resource_utilization":
            return self._prepare_resource_data(raw_data, model)
        elif model_name == "team_performance":
            return self._prepare_performance_data(raw_data, model)
        elif model_name == "project_success":
            return self._prepare_success_data(raw_data, model)
        else:
            raise ValueError(f"Unknown model: {model_name}")
    
    def _prepare_task_duration_data(self, raw_data: List[Dict[str, Any]], model: TensorFlowModel) -> Dict[str, Any]:
        """Prepare task duration training data"""
        X, y = [], []
        
        for task in raw_data:
            if task.get("actual_hours") and task.get("status") == "completed":
                features = [
                    task.get("complexity_score", 5.0),
                    self._get_priority_weight(task.get("priority", "medium")),
                    len(task.get("required_skills", [])),
                    task.get("estimated_hours", 8.0),
                    len(task.get("dependencies", [])),
                    1.0 if task.get("has_external_dependency", False) else 0.0,
                    task.get("team_size", 1),
                    task.get("assignee_experience", 5.0)
                ]
                X.append(features)
                y.append(task["actual_hours"])
        
        # Normalize features
        X_normalized = self._normalize_features(X, model.preprocessing)
        
        return {
            "inputs": X_normalized,
            "outputs": y,
            "sample_count": len(X),
            "feature_names": model.preprocessing["feature_names"],
            "model_config": {
                "input_shape": model.input_shape,
                "output_shape": model.output_shape,
                "model_type": model.model_type
            }
        }
    
    def _prepare_resource_data(self, raw_data: List[Dict[str, Any]], model: TensorFlowModel) -> Dict[str, Any]:
        """Prepare resource utilization training data"""
        X, y = [], []
        
        for project in raw_data:
            if project.get("resource_utilization"):
                features = [
                    project.get("complexity_score", 5.0),
                    project.get("team_size", 5),
                    project.get("budget", 50000) / 1000,  # Normalize to thousands
                    len(project.get("milestones", [])),
                    project.get("duration_weeks", 12),
                    1.0 if project.get("has_dependencies", False) else 0.0,
                    project.get("risk_score", 3.0),
                    project.get("stakeholder_count", 3),
                    project.get("team_avg_experience", 5.0),
                    self._get_priority_weight(project.get("priority", "medium"))
                ]
                
                # Extract resource utilization by skill
                utilization = project["resource_utilization"]
                skill_usage = [
                    utilization.get("frontend_development", 0.0),
                    utilization.get("backend_development", 0.0),
                    utilization.get("devops", 0.0),
                    utilization.get("design", 0.0),
                    utilization.get("data_science", 0.0),
                    utilization.get("project_management", 0.0),
                    utilization.get("testing", 0.0)
                ]
                
                X.append(features)
                y.append(skill_usage)
        
        X_normalized = self._normalize_features(X, model.preprocessing)
        
        return {
            "inputs": X_normalized,
            "outputs": y,
            "sample_count": len(X),
            "feature_names": model.preprocessing["feature_names"],
            "skill_categories": model.postprocessing["skill_categories"],
            "model_config": {
                "input_shape": model.input_shape,
                "output_shape": model.output_shape,
                "model_type": model.model_type
            }
        }
    
    def _prepare_performance_data(self, raw_data: List[Dict[str, Any]], model: TensorFlowModel) -> Dict[str, Any]:
        """Prepare team performance training data"""
        X, y = [], []
        
        for team_period in raw_data:
            if team_period.get("performance_metrics"):
                features = [
                    team_period.get("team_size", 5),
                    team_period.get("avg_workload_hours", 35.0),
                    team_period.get("high_priority_ratio", 0.3),
                    team_period.get("avg_experience", 5.0),
                    team_period.get("skill_diversity_score", 3.0),
                    team_period.get("skill_match_ratio", 0.6),
                    team_period.get("overtime_factor", 0.2),
                    team_period.get("project_count", 3),
                    team_period.get("team_avg_age", 28.0),
                    team_period.get("collaboration_score", 7.0),
                    team_period.get("deadline_pressure", 0.4),
                    team_period.get("team_cohesion", 5.0)
                ]
                
                # Performance metrics
                metrics = team_period["performance_metrics"]
                performance_values = [
                    metrics.get("productivity_score", 0.7),
                    metrics.get("burnout_risk", 0.3),
                    metrics.get("collaboration_effectiveness", 0.8),
                    metrics.get("skill_development_rate", 0.6)
                ]
                
                X.append(features)
                y.append(performance_values)
        
        X_normalized = self._normalize_features(X, model.preprocessing)
        
        return {
            "inputs": X_normalized,
            "outputs": y,
            "sample_count": len(X),
            "feature_names": model.preprocessing["feature_names"],
            "metrics": model.postprocessing["metrics"],
            "model_config": {
                "input_shape": model.input_shape,
                "output_shape": model.output_shape,
                "model_type": model.model_type
            }
        }
    
    def _prepare_success_data(self, raw_data: List[Dict[str, Any]], model: TensorFlowModel) -> Dict[str, Any]:
        """Prepare project success training data"""
        X, y = [], []
        
        for project in raw_data:
            if project.get("status") in ["completed", "failed", "cancelled"]:
                features = [
                    project.get("budget_adequacy", 5.0),
                    project.get("stakeholder_alignment", 5.0),
                    project.get("scope_clarity", 5.0),
                    project.get("timeline_realism", 5.0),
                    project.get("team_experience", 5.0),
                    project.get("technical_risk", 3.0),
                    project.get("complexity_score", 5.0),
                    1.0 if project.get("has_executive_sponsor", False) else 0.0
                ]
                
                # Success = completed on time and within budget
                success = (
                    project.get("status") == "completed" and
                    project.get("on_time", True) and
                    project.get("within_budget", True)
                )
                
                X.append(features)
                y.append([0, 1] if success else [1, 0])  # One-hot encoding
        
        X_normalized = self._normalize_features(X, model.preprocessing)
        
        return {
            "inputs": X_normalized,
            "outputs": y,
            "sample_count": len(X),
            "feature_names": model.preprocessing["feature_names"],
            "labels": model.postprocessing["labels"],
            "model_config": {
                "input_shape": model.input_shape,
                "output_shape": model.output_shape,
                "model_type": model.model_type
            }
        }
    
    def _normalize_features(self, features: List[List[float]], preprocessing: Dict[str, Any]) -> List[List[float]]:
        """Normalize features using stored mean and std"""
        if not features:
            return []
        
        mean = preprocessing.get("scaler_mean", [])
        std = preprocessing.get("scaler_std", [])
        
        if not mean or not std:
            return features
        
        normalized = []
        for feature_vector in features:
            normalized_vector = []
            for i, value in enumerate(feature_vector):
                if i < len(mean) and i < len(std) and std[i] > 0:
                    normalized_value = (value - mean[i]) / std[i]
                else:
                    normalized_value = value
                normalized_vector.append(normalized_value)
            normalized.append(normalized_vector)
        
        return normalized
    
    def _get_priority_weight(self, priority: str) -> float:
        """Convert priority string to numerical weight"""
        priority_weights = {
            "low": 0.5,
            "medium": 1.0, 
            "high": 2.0,
            "critical": 3.0
        }
        return priority_weights.get(priority.lower(), 1.0)
    
    def get_model_architectures(self) -> Dict[str, Any]:
        """Get TensorFlow.js model architecture specifications"""
        return {
            "task_duration": {
                "layers": [
                    {"type": "dense", "units": 16, "activation": "relu", "input_shape": [8]},
                    {"type": "dropout", "rate": 0.2},
                    {"type": "dense", "units": 8, "activation": "relu"},
                    {"type": "dropout", "rate": 0.2},
                    {"type": "dense", "units": 1, "activation": "linear"}
                ],
                "compile": {
                    "optimizer": "adam",
                    "loss": "meanSquaredError",
                    "metrics": ["meanAbsoluteError"]
                }
            },
            "resource_utilization": {
                "layers": [
                    {"type": "dense", "units": 32, "activation": "relu", "input_shape": [10]},
                    {"type": "dropout", "rate": 0.3},
                    {"type": "dense", "units": 16, "activation": "relu"},
                    {"type": "dropout", "rate": 0.2},
                    {"type": "dense", "units": 7, "activation": "sigmoid"}  # Multi-output
                ],
                "compile": {
                    "optimizer": "adam",
                    "loss": "meanSquaredError",
                    "metrics": ["meanAbsoluteError"]
                }
            },
            "team_performance": {
                "layers": [
                    {"type": "dense", "units": 24, "activation": "relu", "input_shape": [12]},
                    {"type": "dropout", "rate": 0.3},
                    {"type": "dense", "units": 12, "activation": "relu"},
                    {"type": "dropout", "rate": 0.2},
                    {"type": "dense", "units": 4, "activation": "sigmoid"}  # 4 performance metrics
                ],
                "compile": {
                    "optimizer": "adam",
                    "loss": "meanSquaredError",
                    "metrics": ["meanAbsoluteError"]
                }
            },
            "project_success": {
                "layers": [
                    {"type": "dense", "units": 16, "activation": "relu", "input_shape": [8]},
                    {"type": "dropout", "rate": 0.3},
                    {"type": "dense", "units": 8, "activation": "relu"},
                    {"type": "dropout", "rate": 0.2},
                    {"type": "dense", "units": 2, "activation": "softmax"}  # Binary classification
                ],
                "compile": {
                    "optimizer": "adam",
                    "loss": "categoricalCrossentropy",
                    "metrics": ["accuracy"]
                }
            }
        }