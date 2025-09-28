"""
Skill Assessment Engine
Automated skill level assessment and development tracking
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
import numpy as np
from dataclasses import dataclass
from .multi_model_ai import MultiModelAIService

logger = logging.getLogger(__name__)

@dataclass
class SkillAssessment:
    """Skill assessment result"""
    skill_name: str
    current_level: float  # 1-10 scale
    confidence: float     # 0-1 scale
    growth_trend: str     # "improving", "stable", "declining"
    evidence: List[str]   # Supporting evidence
    recommendations: List[str]  # Development recommendations
    next_assessment_date: datetime

@dataclass
class LearningPath:
    """Personalized learning path"""
    skill_name: str
    current_level: float
    target_level: float
    estimated_timeline: int  # weeks
    milestones: List[Dict[str, Any]]
    resources: List[Dict[str, Any]]
    success_metrics: List[str]

class SkillAssessmentEngine:
    """Advanced skill assessment and development tracking system"""
    
    def __init__(self):
        self.ai_service = MultiModelAIService()
        self.skill_models = {}
        self.assessment_history = {}
        
        # Skill categories and their subcategories
        self.skill_taxonomy = {
            "technical": {
                "frontend_development": ["React", "Vue.js", "Angular", "TypeScript", "CSS", "HTML"],
                "backend_development": ["Python", "Node.js", "Java", "C#", "Go", "REST APIs"],
                "database": ["MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch"],
                "devops": ["Docker", "Kubernetes", "AWS", "CI/CD", "Monitoring"],
                "data_science": ["Python", "R", "Machine Learning", "Statistics", "Visualization"],
                "mobile": ["React Native", "Flutter", "iOS", "Android", "Hybrid Apps"],
                "testing": ["Unit Testing", "Integration Testing", "E2E Testing", "Test Automation"]
            },
            "soft_skills": {
                "leadership": ["Team Leadership", "Strategic Thinking", "Decision Making"],
                "communication": ["Written Communication", "Presentation", "Stakeholder Management"],
                "collaboration": ["Teamwork", "Conflict Resolution", "Cross-functional Coordination"],
                "project_management": ["Planning", "Risk Management", "Agile/Scrum", "Resource Management"]
            },
            "domain_knowledge": {
                "industry": ["Finance", "Healthcare", "E-commerce", "SaaS", "Enterprise"],
                "business": ["Strategy", "Product Management", "Marketing", "Sales"],
                "compliance": ["GDPR", "SOX", "HIPAA", "Security Standards"]
            }
        }
    
    async def assess_individual_skills(
        self,
        user_id: str,
        performance_data: Dict[str, Any],
        task_history: List[Dict[str, Any]],
        peer_feedback: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, SkillAssessment]:
        """Comprehensive skill assessment for an individual"""
        try:
            assessments = {}
            
            # Identify skills to assess from task history and declared skills
            skills_to_assess = self._identify_skills_for_assessment(performance_data, task_history)
            
            for skill in skills_to_assess:
                assessment = await self._assess_single_skill(
                    user_id, skill, performance_data, task_history, peer_feedback
                )
                assessments[skill] = assessment
            
            # Store assessment history
            self.assessment_history[user_id] = {
                "timestamp": datetime.now(),
                "assessments": assessments
            }
            
            return assessments
            
        except Exception as e:
            logger.error(f"Individual skill assessment error for user {user_id}: {str(e)}")
            return {}
    
    async def assess_team_skills(
        self,
        team_data: Dict[str, Any],
        project_requirements: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess team skill coverage and gaps"""
        try:
            team_members = team_data.get("members", [])
            
            # Aggregate individual skill assessments
            team_skills = {}
            skill_gaps = []
            coverage_analysis = {}
            
            # Required skills from project requirements
            required_skills = set()
            for req in project_requirements:
                required_skills.update(req.get("required_skills", []))
            
            # Analyze each required skill
            for skill in required_skills:
                skill_levels = []
                team_has_skill = False
                
                for member in team_members:
                    member_skills = member.get("skills", {})
                    if skill in member_skills:
                        skill_levels.append(member_skills[skill])
                        team_has_skill = True
                
                if team_has_skill:
                    team_skills[skill] = {
                        "average_level": np.mean(skill_levels),
                        "max_level": max(skill_levels),
                        "coverage": len(skill_levels) / len(team_members),
                        "members_with_skill": len(skill_levels)
                    }
                else:
                    skill_gaps.append(skill)
            
            # Calculate overall team skill metrics
            coverage_analysis = {
                "total_required_skills": len(required_skills),
                "skills_covered": len(team_skills),
                "coverage_percentage": len(team_skills) / max(1, len(required_skills)) * 100,
                "skill_gaps": skill_gaps,
                "team_skills": team_skills,
                "recommendations": await self._generate_team_recommendations(team_skills, skill_gaps)
            }
            
            return coverage_analysis
            
        except Exception as e:
            logger.error(f"Team skill assessment error: {str(e)}")
            return {}
    
    async def generate_learning_paths(
        self,
        user_id: str,
        current_skills: Dict[str, float],
        career_goals: List[str],
        time_constraints: Dict[str, Any]
    ) -> Dict[str, LearningPath]:
        """Generate personalized learning paths"""
        try:
            learning_paths = {}
            
            # Analyze career goals to determine target skills
            target_skills = await self._analyze_career_goals(career_goals)
            
            for skill, target_level in target_skills.items():
                current_level = current_skills.get(skill, 1.0)
                
                if target_level > current_level:
                    path = await self._create_learning_path(
                        skill, current_level, target_level, time_constraints
                    )
                    learning_paths[skill] = path
            
            return learning_paths
            
        except Exception as e:
            logger.error(f"Learning path generation error for user {user_id}: {str(e)}")
            return {}
    
    async def predict_skill_development(
        self,
        user_id: str,
        skill_name: str,
        learning_activities: List[Dict[str, Any]],
        timeline_weeks: int
    ) -> Dict[str, Any]:
        """Predict skill development based on planned learning activities"""
        try:
            current_assessment = self.assessment_history.get(user_id, {}).get("assessments", {}).get(skill_name)
            
            if not current_assessment:
                current_level = 3.0  # Default assumption
            else:
                current_level = current_assessment.current_level
            
            # Calculate learning velocity based on activities
            total_learning_hours = sum(activity.get("hours_per_week", 0) for activity in learning_activities) * timeline_weeks
            activity_effectiveness = self._calculate_activity_effectiveness(learning_activities)
            
            # Base learning rate (skill points per hour of focused learning)
            base_learning_rate = 0.1  # 0.1 skill points per hour
            
            # Adjust for individual factors
            individual_factors = await self._get_individual_learning_factors(user_id)
            adjusted_learning_rate = base_learning_rate * individual_factors.get("learning_multiplier", 1.0)
            
            # Calculate predicted improvement
            potential_improvement = total_learning_hours * adjusted_learning_rate * activity_effectiveness
            
            # Apply diminishing returns (harder to improve at higher levels)
            diminishing_factor = 1.0 / (1.0 + (current_level - 5) * 0.1) if current_level > 5 else 1.0
            actual_improvement = potential_improvement * diminishing_factor
            
            predicted_level = min(10.0, current_level + actual_improvement)
            
            return {
                "current_level": current_level,
                "predicted_level": predicted_level,
                "improvement": actual_improvement,
                "confidence": 0.75,
                "factors": {
                    "learning_hours": total_learning_hours,
                    "activity_effectiveness": activity_effectiveness,
                    "individual_multiplier": individual_factors.get("learning_multiplier", 1.0),
                    "diminishing_factor": diminishing_factor
                },
                "timeline_weeks": timeline_weeks,
                "milestones": self._generate_development_milestones(
                    current_level, predicted_level, timeline_weeks
                )
            }
            
        except Exception as e:
            logger.error(f"Skill development prediction error: {str(e)}")
            return {}
    
    async def recommend_skill_development_activities(
        self,
        skill_name: str,
        current_level: float,
        target_level: float,
        learning_style: str = "balanced"
    ) -> List[Dict[str, Any]]:
        """Recommend specific activities for skill development"""
        try:
            # Use AI to generate personalized recommendations
            context = {
                "skill_name": skill_name,
                "current_level": current_level,
                "target_level": target_level,
                "learning_style": learning_style
            }
            
            prompt = f"""
            Generate specific, actionable learning recommendations for developing {skill_name} skills.
            
            Current Level: {current_level}/10
            Target Level: {target_level}/10
            Learning Style: {learning_style}
            
            Please provide 5-7 specific activities with:
            1. Activity name and description
            2. Estimated time commitment (hours per week)
            3. Difficulty level (beginner/intermediate/advanced)
            4. Expected skill improvement (points on 1-10 scale)
            5. Resources needed
            6. Success metrics
            
            Focus on practical, measurable activities that build real-world competency.
            """
            
            ai_response = await self.ai_service.generate_response(
                prompt, 
                model="gpt-4o",  # Best for structured recommendations
                context=context
            )
            
            # Parse AI response and structure recommendations
            if ai_response.get("success"):
                recommendations = self._parse_activity_recommendations(ai_response["content"])
            else:
                recommendations = self._fallback_activity_recommendations(skill_name, current_level, target_level)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Activity recommendation error: {str(e)}")
            return self._fallback_activity_recommendations(skill_name, current_level, target_level)
    
    def _identify_skills_for_assessment(
        self, performance_data: Dict[str, Any], task_history: List[Dict[str, Any]]
    ) -> List[str]:
        """Identify which skills to assess based on recent activity"""
        skills_to_assess = set()
        
        # Add declared skills
        declared_skills = performance_data.get("skills", {})
        skills_to_assess.update(declared_skills.keys())
        
        # Add skills from recent task work
        for task in task_history[-20:]:  # Last 20 tasks
            task_skills = task.get("required_skills", [])
            skills_to_assess.update(task_skills)
        
        return list(skills_to_assess)
    
    async def _assess_single_skill(
        self,
        user_id: str,
        skill: str,
        performance_data: Dict[str, Any],
        task_history: List[Dict[str, Any]],
        peer_feedback: Optional[List[Dict[str, Any]]]
    ) -> SkillAssessment:
        """Assess a single skill comprehensively"""
        try:
            # Gather evidence from multiple sources
            evidence = []
            
            # Task performance evidence
            task_evidence = self._analyze_task_performance_for_skill(skill, task_history)
            evidence.extend(task_evidence)
            
            # Peer feedback evidence
            if peer_feedback:
                feedback_evidence = self._analyze_peer_feedback_for_skill(skill, peer_feedback)
                evidence.extend(feedback_evidence)
            
            # Self-assessment evidence
            self_assessment = performance_data.get("skills", {}).get(skill, 5.0)
            evidence.append(f"Self-assessed level: {self_assessment}/10")
            
            # Calculate skill level using multiple indicators
            calculated_level = await self._calculate_skill_level(skill, task_evidence, peer_feedback, self_assessment)
            
            # Determine growth trend
            growth_trend = self._analyze_growth_trend(user_id, skill, calculated_level)
            
            # Generate recommendations
            recommendations = await self._generate_skill_recommendations(skill, calculated_level, evidence)
            
            return SkillAssessment(
                skill_name=skill,
                current_level=calculated_level,
                confidence=self._calculate_assessment_confidence(evidence),
                growth_trend=growth_trend,
                evidence=evidence[:5],  # Top 5 pieces of evidence
                recommendations=recommendations,
                next_assessment_date=datetime.now() + timedelta(weeks=4)
            )
            
        except Exception as e:
            logger.error(f"Single skill assessment error for {skill}: {str(e)}")
            return SkillAssessment(
                skill_name=skill,
                current_level=5.0,
                confidence=0.3,
                growth_trend="stable",
                evidence=["Insufficient data for assessment"],
                recommendations=["Gather more performance data"],
                next_assessment_date=datetime.now() + timedelta(weeks=2)
            )
    
    def _analyze_task_performance_for_skill(self, skill: str, task_history: List[Dict[str, Any]]) -> List[str]:
        """Analyze task performance related to specific skill"""
        evidence = []
        skill_tasks = [task for task in task_history if skill in task.get("required_skills", [])]
        
        if skill_tasks:
            # Calculate performance metrics
            completion_rates = [1 if task.get("status") == "completed" else 0 for task in skill_tasks]
            avg_completion_rate = np.mean(completion_rates) if completion_rates else 0
            
            # Time performance
            time_performances = []
            for task in skill_tasks:
                if task.get("estimated_hours") and task.get("actual_hours"):
                    efficiency = task["estimated_hours"] / task["actual_hours"]
                    time_performances.append(efficiency)
            
            avg_time_efficiency = np.mean(time_performances) if time_performances else 1.0
            
            # Quality indicators
            quality_scores = [task.get("quality_score", 7.0) for task in skill_tasks if task.get("quality_score")]
            avg_quality = np.mean(quality_scores) if quality_scores else 7.0
            
            evidence.append(f"Completed {len(skill_tasks)} tasks requiring {skill}")
            evidence.append(f"Task completion rate: {avg_completion_rate:.1%}")
            evidence.append(f"Time efficiency: {avg_time_efficiency:.2f}x estimated time")
            evidence.append(f"Average quality score: {avg_quality:.1f}/10")
        
        return evidence
    
    def _analyze_peer_feedback_for_skill(self, skill: str, peer_feedback: List[Dict[str, Any]]) -> List[str]:
        """Analyze peer feedback related to specific skill"""
        evidence = []
        skill_feedback = []
        
        for feedback in peer_feedback:
            if skill.lower() in feedback.get("content", "").lower():
                skill_feedback.append(feedback)
        
        if skill_feedback:
            # Analyze sentiment and ratings
            ratings = [fb.get("rating", 5) for fb in skill_feedback if fb.get("rating")]
            avg_rating = np.mean(ratings) if ratings else 5.0
            
            evidence.append(f"Received {len(skill_feedback)} peer feedback mentions")
            evidence.append(f"Average peer rating: {avg_rating:.1f}/10")
            
            # Extract key themes
            positive_themes = self._extract_feedback_themes(skill_feedback, "positive")
            if positive_themes:
                evidence.append(f"Positive feedback themes: {', '.join(positive_themes[:3])}")
        
        return evidence
    
    async def _calculate_skill_level(
        self, skill: str, task_evidence: List[str], peer_feedback: Optional[List[Dict[str, Any]]], 
        self_assessment: float
    ) -> float:
        """Calculate skill level from multiple evidence sources"""
        try:
            # Base level from self-assessment (weighted 30%)
            base_score = self_assessment * 0.3
            
            # Task performance score (weighted 50%)
            task_score = self._calculate_task_performance_score(task_evidence) * 0.5
            
            # Peer feedback score (weighted 20%)
            peer_score = self._calculate_peer_feedback_score(peer_feedback) * 0.2
            
            calculated_level = base_score + task_score + peer_score
            
            # Ensure score is within valid range
            return max(1.0, min(10.0, calculated_level))
            
        except Exception as e:
            logger.error(f"Skill level calculation error: {str(e)}")
            return self_assessment  # Fallback to self-assessment
    
    def _calculate_task_performance_score(self, task_evidence: List[str]) -> float:
        """Extract performance score from task evidence"""
        # Parse evidence strings to extract metrics
        completion_rate = 0.8  # Default
        time_efficiency = 1.0  # Default
        quality_score = 7.0   # Default
        
        for evidence in task_evidence:
            if "completion rate:" in evidence:
                try:
                    completion_rate = float(evidence.split(":")[1].strip().replace("%", "")) / 100
                except:
                    pass
            elif "Time efficiency:" in evidence:
                try:
                    time_efficiency = float(evidence.split(":")[1].strip().replace("x", ""))
                except:
                    pass
            elif "quality score:" in evidence:
                try:
                    quality_score = float(evidence.split(":")[1].strip().split("/")[0])
                except:
                    pass
        
        # Combine metrics into overall score
        performance_score = (
            completion_rate * 0.4 +
            min(1.0, time_efficiency) * 0.3 +  # Cap efficiency at 1.0 for this calculation
            (quality_score / 10.0) * 0.3
        ) * 10.0
        
        return performance_score
    
    def _calculate_peer_feedback_score(self, peer_feedback: Optional[List[Dict[str, Any]]]) -> float:
        """Calculate score from peer feedback"""
        if not peer_feedback:
            return 5.0  # Neutral default
        
        ratings = [fb.get("rating", 5) for fb in peer_feedback if fb.get("rating")]
        return np.mean(ratings) if ratings else 5.0
    
    def _analyze_growth_trend(self, user_id: str, skill: str, current_level: float) -> str:
        """Analyze skill growth trend over time"""
        if user_id not in self.assessment_history:
            return "stable"  # No historical data
        
        previous_assessments = self.assessment_history[user_id].get("assessments", {})
        if skill not in previous_assessments:
            return "stable"  # No previous assessment
        
        previous_level = previous_assessments[skill].current_level
        difference = current_level - previous_level
        
        if difference > 0.5:
            return "improving"
        elif difference < -0.5:
            return "declining"
        else:
            return "stable"
    
    async def _generate_skill_recommendations(
        self, skill: str, current_level: float, evidence: List[str]
    ) -> List[str]:
        """Generate personalized skill development recommendations"""
        try:
            context = {
                "skill": skill,
                "current_level": current_level,
                "evidence": evidence
            }
            
            prompt = f"""
            Based on the skill assessment for {skill} (current level: {current_level}/10), 
            provide 3-5 specific, actionable recommendations for improvement.
            
            Evidence: {'; '.join(evidence)}
            
            Focus on:
            1. Specific areas for improvement
            2. Actionable next steps
            3. Resources or training opportunities
            4. Practice opportunities
            5. Measurable goals
            
            Keep recommendations concise and practical.
            """
            
            ai_response = await self.ai_service.generate_response(
                prompt, 
                model="claude-3.5-sonnet",  # Best for detailed recommendations
                context=context
            )
            
            if ai_response.get("success"):
                # Parse recommendations from AI response
                recommendations = self._parse_recommendations(ai_response["content"])
                return recommendations[:5]  # Limit to 5 recommendations
            else:
                return self._fallback_recommendations(skill, current_level)
                
        except Exception as e:
            logger.error(f"Recommendation generation error: {str(e)}")
            return self._fallback_recommendations(skill, current_level)
    
    def _calculate_assessment_confidence(self, evidence: List[str]) -> float:
        """Calculate confidence level of the assessment"""
        # More evidence and diverse sources increase confidence
        base_confidence = min(0.9, 0.3 + len(evidence) * 0.15)
        
        # Adjust based on evidence quality
        has_task_evidence = any("task" in ev.lower() for ev in evidence)
        has_feedback_evidence = any("feedback" in ev.lower() for ev in evidence)
        
        if has_task_evidence and has_feedback_evidence:
            return base_confidence
        elif has_task_evidence or has_feedback_evidence:
            return base_confidence * 0.8
        else:
            return base_confidence * 0.6
    
    async def _analyze_career_goals(self, career_goals: List[str]) -> Dict[str, float]:
        """Analyze career goals to determine target skill levels"""
        target_skills = {}
        
        # Map common career goals to skill requirements
        goal_skill_mapping = {
            "senior_developer": {
                "Python": 8.0, "JavaScript": 8.0, "System Design": 7.5,
                "Code Review": 8.0, "Mentoring": 7.0
            },
            "tech_lead": {
                "Leadership": 8.0, "Architecture": 8.5, "Communication": 8.0,
                "Project Management": 7.5, "Technical Strategy": 8.0
            },
            "product_manager": {
                "Product Strategy": 8.5, "Market Analysis": 7.5, "Communication": 9.0,
                "Data Analysis": 7.0, "Stakeholder Management": 8.5
            },
            "data_scientist": {
                "Python": 8.5, "Machine Learning": 9.0, "Statistics": 8.5,
                "Data Visualization": 8.0, "SQL": 8.0
            }
        }
        
        for goal in career_goals:
            goal_lower = goal.lower().replace(" ", "_")
            if goal_lower in goal_skill_mapping:
                target_skills.update(goal_skill_mapping[goal_lower])
        
        return target_skills
    
    async def _create_learning_path(
        self, skill: str, current_level: float, target_level: float, time_constraints: Dict[str, Any]
    ) -> LearningPath:
        """Create detailed learning path for skill development"""
        try:
            level_gap = target_level - current_level
            hours_per_week = time_constraints.get("hours_per_week", 5)
            
            # Estimate timeline (roughly 10 hours per skill point)
            estimated_hours = level_gap * 10
            estimated_weeks = int(estimated_hours / hours_per_week)
            
            # Generate milestones
            milestones = []
            for i in range(1, int(level_gap) + 1):
                milestone_level = current_level + i
                milestone_week = int((i / level_gap) * estimated_weeks)
                
                milestones.append({
                    "week": milestone_week,
                    "target_level": milestone_level,
                    "description": f"Reach {skill} level {milestone_level:.1f}",
                    "validation_method": "Practice project + peer review"
                })
            
            # Generate resources
            resources = await self._generate_learning_resources(skill, current_level, target_level)
            
            # Define success metrics
            success_metrics = [
                f"Complete practice projects demonstrating {skill} at level {target_level:.1f}",
                f"Receive peer feedback rating of {target_level:.1f}/10 or higher",
                f"Apply {skill} successfully in at least 3 real projects"
            ]
            
            return LearningPath(
                skill_name=skill,
                current_level=current_level,
                target_level=target_level,
                estimated_timeline=estimated_weeks,
                milestones=milestones,
                resources=resources,
                success_metrics=success_metrics
            )
            
        except Exception as e:
            logger.error(f"Learning path creation error: {str(e)}")
            # Return basic learning path
            return LearningPath(
                skill_name=skill,
                current_level=current_level,
                target_level=target_level,
                estimated_timeline=12,  # Default 12 weeks
                milestones=[],
                resources=[],
                success_metrics=[]
            )
    
    async def _generate_learning_resources(
        self, skill: str, current_level: float, target_level: float
    ) -> List[Dict[str, Any]]:
        """Generate learning resources for skill development"""
        resources = [
            {
                "type": "online_course",
                "title": f"Advanced {skill} Mastery",
                "provider": "Professional Learning Platform",
                "duration": "8-12 weeks",
                "difficulty": "intermediate" if current_level < 6 else "advanced",
                "cost": "Free" if current_level < 5 else "Paid"
            },
            {
                "type": "practice_project",
                "title": f"Real-world {skill} Application",
                "description": f"Build a project that showcases {skill} at target level",
                "duration": "4-6 weeks",
                "difficulty": "advanced",
                "validation": "Peer review and feedback"
            },
            {
                "type": "mentorship",
                "title": f"{skill} Expert Mentoring",
                "description": f"Regular sessions with {skill} expert",
                "duration": "Ongoing",
                "frequency": "Bi-weekly",
                "focus": "Practical application and career guidance"
            }
        ]
        
        return resources
    
    def _calculate_activity_effectiveness(self, learning_activities: List[Dict[str, Any]]) -> float:
        """Calculate effectiveness multiplier for learning activities"""
        effectiveness_map = {
            "hands_on_project": 1.5,
            "mentorship": 1.3,
            "online_course": 1.0,
            "reading": 0.7,
            "video_tutorial": 0.8,
            "practice_exercises": 1.2,
            "peer_learning": 1.1
        }
        
        if not learning_activities:
            return 1.0
        
        weighted_effectiveness = 0
        total_weight = 0
        
        for activity in learning_activities:
            activity_type = activity.get("type", "online_course")
            hours = activity.get("hours_per_week", 1)
            effectiveness = effectiveness_map.get(activity_type, 1.0)
            
            weighted_effectiveness += effectiveness * hours
            total_weight += hours
        
        return weighted_effectiveness / max(1, total_weight)
    
    async def _get_individual_learning_factors(self, user_id: str) -> Dict[str, float]:
        """Get individual factors that affect learning speed"""
        # This would typically pull from user profile and historical data
        return {
            "learning_multiplier": 1.0,  # Baseline
            "experience_factor": 1.1,   # Slightly above average
            "motivation_score": 0.9,    # Motivation level
            "time_availability": 1.0    # Available time factor
        }
    
    def _generate_development_milestones(
        self, current_level: float, predicted_level: float, timeline_weeks: int
    ) -> List[Dict[str, Any]]:
        """Generate development milestones for tracking progress"""
        milestones = []
        level_improvement = predicted_level - current_level
        
        if level_improvement > 0:
            quarter_points = timeline_weeks // 4
            for i in range(1, 5):  # 4 quarters
                milestone_week = quarter_points * i
                milestone_level = current_level + (level_improvement * i / 4)
                
                milestones.append({
                    "week": milestone_week,
                    "target_level": round(milestone_level, 1),
                    "description": f"Quarterly progress check {i}",
                    "validation_activities": ["Practice assessment", "Peer feedback", "Project review"]
                })
        
        return milestones
    
    def _parse_activity_recommendations(self, ai_content: str) -> List[Dict[str, Any]]:
        """Parse AI-generated activity recommendations"""
        # This would parse structured AI response
        # For now, return example structure
        return [
            {
                "name": "Advanced Practice Project",
                "description": "Build a complex project demonstrating advanced skills",
                "hours_per_week": 8,
                "difficulty": "advanced",
                "expected_improvement": 1.5,
                "resources": ["GitHub", "Documentation", "Code reviews"],
                "success_metrics": ["Project completion", "Code quality", "Performance"]
            }
        ]
    
    def _fallback_activity_recommendations(
        self, skill_name: str, current_level: float, target_level: float
    ) -> List[Dict[str, Any]]:
        """Fallback activity recommendations when AI is unavailable"""
        return [
            {
                "name": f"{skill_name} Practice Project",
                "description": f"Hands-on project to improve {skill_name} skills",
                "hours_per_week": 5,
                "difficulty": "intermediate",
                "expected_improvement": 1.0,
                "resources": ["Online tutorials", "Documentation"],
                "success_metrics": ["Project completion", "Skill demonstration"]
            },
            {
                "name": f"{skill_name} Online Course",
                "description": f"Structured learning course for {skill_name}",
                "hours_per_week": 3,
                "difficulty": "beginner" if current_level < 5 else "intermediate",
                "expected_improvement": 0.8,
                "resources": ["Course materials", "Assignments"],
                "success_metrics": ["Course completion", "Assessment scores"]
            }
        ]
    
    def _extract_feedback_themes(self, feedback_list: List[Dict[str, Any]], sentiment: str) -> List[str]:
        """Extract common themes from feedback"""
        # Simple keyword extraction - would be more sophisticated in practice
        positive_keywords = ["excellent", "great", "strong", "impressive", "skilled"]
        themes = []
        
        for feedback in feedback_list:
            content = feedback.get("content", "").lower()
            for keyword in positive_keywords:
                if keyword in content:
                    themes.append(keyword)
        
        return list(set(themes))  # Remove duplicates
    
    def _parse_recommendations(self, ai_content: str) -> List[str]:
        """Parse recommendations from AI response"""
        # Simple parsing - split by numbered lists or bullet points
        lines = ai_content.split('\n')
        recommendations = []
        
        for line in lines:
            line = line.strip()
            if line and (line.startswith(('1.', '2.', '3.', '-', '•')) or len(recommendations) < 3):
                # Clean up the line
                clean_line = line.lstrip('1234567890.-• ').strip()
                if clean_line:
                    recommendations.append(clean_line)
        
        return recommendations[:5]  # Limit to 5 recommendations
    
    def _fallback_recommendations(self, skill: str, current_level: float) -> List[str]:
        """Fallback recommendations when AI is unavailable"""
        if current_level < 5:
            return [
                f"Focus on building fundamental {skill} knowledge through structured learning",
                f"Practice basic {skill} exercises daily",
                f"Seek feedback from more experienced practitioners",
                f"Join {skill} communities and discussion groups"
            ]
        else:
            return [
                f"Take on more challenging {skill} projects",
                f"Mentor others in {skill} to deepen understanding",
                f"Contribute to open source projects requiring {skill}",
                f"Stay updated with latest {skill} trends and best practices"
            ]
    
    async def _generate_team_recommendations(
        self, team_skills: Dict[str, Any], skill_gaps: List[str]
    ) -> List[str]:
        """Generate recommendations for team skill development"""
        recommendations = []
        
        if skill_gaps:
            recommendations.append(f"Address critical skill gaps: {', '.join(skill_gaps[:3])}")
            recommendations.append("Consider hiring specialists or providing targeted training")
        
        # Analyze skill distribution
        low_coverage_skills = [
            skill for skill, data in team_skills.items() 
            if data["coverage"] < 0.5
        ]
        
        if low_coverage_skills:
            recommendations.append(f"Increase skill coverage for: {', '.join(low_coverage_skills[:3])}")
        
        # Identify skills with low average levels
        low_level_skills = [
            skill for skill, data in team_skills.items()
            if data["average_level"] < 6.0
        ]
        
        if low_level_skills:
            recommendations.append(f"Strengthen team capabilities in: {', '.join(low_level_skills[:3])}")
        
        if not recommendations:
            recommendations.append("Team skill coverage is strong - focus on advanced skill development")
        
        return recommendations[:5]  # Limit recommendations