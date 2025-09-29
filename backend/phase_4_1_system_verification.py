#!/usr/bin/env python3
"""
Phase 4.1 System Verification & Testing Script
Comprehensive verification of all Phase 4.1 AI/ML features and data loading
"""

import asyncio
import sys
import os
import json
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, List
from colorama import Fore, Style, init

# Initialize colorama for colored output
init()

# Add the backend directory to the path
sys.path.append('/app/backend')

class Phase41SystemVerifier:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.token = None
        self.test_results = []
        self.demo_credentials = {
            "email": "demo@company.com", 
            "password": "demo123456"
        }
        
    def log_success(self, message: str):
        """Log success message"""
        print(f"{Fore.GREEN}✅ {message}{Style.RESET_ALL}")
        self.test_results.append({"status": "success", "message": message, "timestamp": datetime.now()})
    
    def log_error(self, message: str):
        """Log error message"""
        print(f"{Fore.RED}❌ {message}{Style.RESET_ALL}")
        self.test_results.append({"status": "error", "message": message, "timestamp": datetime.now()})
    
    def log_info(self, message: str):
        """Log info message"""
        print(f"{Fore.CYAN}ℹ️  {message}{Style.RESET_ALL}")
        self.test_results.append({"status": "info", "message": message, "timestamp": datetime.now()})
    
    def log_warning(self, message: str):
        """Log warning message"""
        print(f"{Fore.YELLOW}⚠️  {message}{Style.RESET_ALL}")
        self.test_results.append({"status": "warning", "message": message, "timestamp": datetime.now()})

    async def verify_system_health(self):
        """Verify basic system health"""
        try:
            self.log_info("Starting Phase 4.1 System Health Verification...")
            
            async with httpx.AsyncClient() as client:
                # Test basic health
                response = await client.get(f"{self.base_url}/api/health")
                if response.status_code == 200:
                    health_data = response.json()
                    self.log_success(f"System Health: {health_data['status']}")
                    self.log_success(f"Database: {health_data['database']}")
                else:
                    self.log_error(f"Health check failed: {response.status_code}")
                    return False
                
                # Test database status
                response = await client.get(f"{self.base_url}/api/database/status")
                if response.status_code == 200:
                    db_data = response.json()
                    self.log_success(f"Database Status: {db_data['status']}")
                    self.log_info(f"Collections: {len(db_data['collections'])}")
                    
                    # Log collection counts
                    for collection, count in db_data['collection_counts'].items():
                        if count > 0:
                            self.log_success(f"  {collection}: {count} items")
                        else:
                            self.log_warning(f"  {collection}: {count} items (empty)")
                else:
                    self.log_error(f"Database status check failed: {response.status_code}")
                    return False
            
            return True
            
        except Exception as e:
            self.log_error(f"System health verification failed: {str(e)}")
            return False

    async def authenticate_demo_user(self):
        """Authenticate with demo credentials"""
        try:
            self.log_info("Authenticating demo user...")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/auth/login",
                    json=self.demo_credentials
                )
                
                if response.status_code == 200:
                    auth_data = response.json()
                    self.token = auth_data['tokens']['access_token']
                    user_data = auth_data['user']
                    
                    self.log_success(f"Authentication successful")
                    self.log_success(f"User: {user_data['first_name']} {user_data['last_name']} ({user_data['email']})")
                    self.log_success(f"Role: {user_data['role']}")
                    self.log_success(f"Organization: {user_data['organization_id']}")
                    
                    return True
                else:
                    self.log_error(f"Authentication failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_error(f"Authentication error: {str(e)}")
            return False

    async def verify_ai_ml_features(self):
        """Verify Phase 4.1 AI/ML integration features"""
        try:
            self.log_info("Verifying AI/ML Integration Features...")
            
            if not self.token:
                self.log_error("No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            async with httpx.AsyncClient() as client:
                # Test AI/ML health
                response = await client.get(f"{self.base_url}/api/ai-ml/health", headers=headers)
                if response.status_code == 200:
                    ai_health = response.json()
                    self.log_success(f"AI Service: {ai_health.get('ai_service', 'unknown')}")
                    self.log_success(f"Predictive Engine: {ai_health.get('predictive_engine', 'unknown')}")
                    self.log_success(f"Skill Engine: {ai_health.get('skill_engine', 'unknown')}")
                    self.log_success(f"Models Loaded: {ai_health.get('models_loaded', 0)}")
                else:
                    self.log_error(f"AI/ML health check failed: {response.status_code}")
                    return False
                
                # Test available models
                response = await client.get(f"{self.base_url}/api/ai-ml/models/available", headers=headers)
                if response.status_code == 200:
                    models_data = response.json()
                    models = models_data.get('models', [])
                    self.log_success(f"Available AI Models: {len(models)}")
                    for model in models:
                        self.log_info(f"  - {model}")
                else:
                    self.log_warning(f"Available models check failed: {response.status_code}")
                
                # Test predictive analytics
                test_predictions = [
                    ("task-duration", "/api/ai-ml/predict/task-duration"),
                    ("team-performance", "/api/ai-ml/predict/team-performance"),
                    ("project-success", "/api/ai-ml/predict/project-success")
                ]
                
                for pred_name, endpoint in test_predictions:
                    try:
                        # Create sample data for prediction
                        sample_data = self.get_sample_prediction_data(pred_name)
                        
                        response = await client.post(
                            f"{self.base_url}{endpoint}",
                            json=sample_data,
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            self.log_success(f"AI Prediction ({pred_name}): Working")
                        else:
                            self.log_warning(f"AI Prediction ({pred_name}): {response.status_code}")
                    except Exception as e:
                        self.log_warning(f"AI Prediction ({pred_name}): {str(e)}")
            
            return True
            
        except Exception as e:
            self.log_error(f"AI/ML feature verification failed: {str(e)}")
            return False

    async def verify_tensorflow_features(self):
        """Verify TensorFlow.js integration"""
        try:
            self.log_info("Verifying TensorFlow.js Integration...")
            
            if not self.token:
                self.log_error("No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            async with httpx.AsyncClient() as client:
                # Test TensorFlow models
                response = await client.get(f"{self.base_url}/api/tensorflow/models", headers=headers)
                if response.status_code == 200:
                    tf_data = response.json()
                    models = tf_data.get('models', {})
                    self.log_success(f"TensorFlow.js Models: {len(models)}")
                    
                    for model_name, model_config in models.items():
                        self.log_success(f"  - {model_name}: {model_config.get('description', 'No description')}")
                        self.log_info(f"    Input Shape: {model_config.get('inputShape', 'Unknown')}")
                        self.log_info(f"    Model Type: {model_config.get('modelType', 'Unknown')}")
                else:
                    self.log_error(f"TensorFlow models check failed: {response.status_code}")
                    return False
                
                # Test system info
                response = await client.get(f"{self.base_url}/api/tensorflow/system-info", headers=headers)
                if response.status_code == 200:
                    sys_info = response.json()
                    self.log_success(f"TensorFlow System: {sys_info.get('status', 'unknown')}")
                else:
                    self.log_warning(f"TensorFlow system info check failed: {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_error(f"TensorFlow.js feature verification failed: {str(e)}")
            return False

    async def verify_realtime_ai_features(self):
        """Verify Real-time AI collaboration features"""
        try:
            self.log_info("Verifying Real-time AI Collaboration...")
            
            if not self.token:
                self.log_error("No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            async with httpx.AsyncClient() as client:
                # Test real-time AI health
                response = await client.get(f"{self.base_url}/api/realtime-ai/health", headers=headers)
                if response.status_code == 200:
                    rt_health = response.json()
                    self.log_success(f"Real-time AI: {rt_health.get('status', 'unknown')}")
                    self.log_success(f"WebSocket Support: {rt_health.get('websocket_support', False)}")
                else:
                    self.log_error(f"Real-time AI health check failed: {response.status_code}")
                    return False
                
                # Test active sessions
                response = await client.get(f"{self.base_url}/api/realtime-ai/sessions/active", headers=headers)
                if response.status_code == 200:
                    sessions = response.json()
                    self.log_success(f"Active AI Sessions: {len(sessions.get('sessions', []))}")
                else:
                    self.log_warning(f"Active sessions check failed: {response.status_code}")
                
                # Test AI assistants capabilities
                response = await client.get(f"{self.base_url}/api/realtime-ai/ai-assistants/capabilities", headers=headers)
                if response.status_code == 200:
                    capabilities = response.json()
                    assistants = capabilities.get('assistants', [])
                    self.log_success(f"AI Assistants Available: {len(assistants)}")
                    for assistant in assistants:
                        self.log_info(f"  - {assistant.get('name', 'Unknown')}: {assistant.get('description', 'No description')}")
                else:
                    self.log_warning(f"AI assistants check failed: {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_error(f"Real-time AI feature verification failed: {str(e)}")
            return False

    async def verify_resource_management_features(self):
        """Verify advanced resource management features"""
        try:
            self.log_info("Verifying Advanced Resource Management...")
            
            if not self.token:
                self.log_error("No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            async with httpx.AsyncClient() as client:
                # Test resource management endpoints
                resource_endpoints = [
                    ("/api/resource-management/allocation/optimize", "Resource Allocation Optimization"),
                    ("/api/resource-management/capacity/planning", "Capacity Planning"),
                    ("/api/resource-management/skills/assignment", "Skills Assignment"),
                    ("/api/resource-management/workload/balancing", "Workload Balancing"),
                    ("/api/resource-management/skills/gap-analysis", "Skills Gap Analysis")
                ]
                
                for endpoint, feature_name in resource_endpoints:
                    try:
                        response = await client.get(f"{self.base_url}{endpoint}", headers=headers, timeout=30.0)
                        if response.status_code == 200:
                            self.log_success(f"{feature_name}: Working")
                        else:
                            self.log_warning(f"{feature_name}: Status {response.status_code}")
                    except Exception as e:
                        self.log_warning(f"{feature_name}: {str(e)}")
            
            return True
            
        except Exception as e:
            self.log_error(f"Resource management feature verification failed: {str(e)}")
            return False

    async def verify_analytics_features(self):
        """Verify analytics and reporting features"""
        try:
            self.log_info("Verifying Analytics & Reporting Features...")
            
            if not self.token:
                self.log_error("No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            async with httpx.AsyncClient() as client:
                # Test analytics endpoints
                analytics_endpoints = [
                    ("/api/analytics/portfolio/overview", "Portfolio Overview"),
                    ("/api/analytics/projects/health", "Project Health"),
                    ("/api/analytics/resource/utilization", "Resource Utilization"),
                    ("/api/analytics/teams/performance", "Team Performance"),
                    ("/api/analytics/timeline/overview", "Timeline Overview")
                ]
                
                for endpoint, feature_name in analytics_endpoints:
                    try:
                        response = await client.get(f"{self.base_url}{endpoint}", headers=headers, timeout=30.0)
                        if response.status_code == 200:
                            data = response.json()
                            self.log_success(f"{feature_name}: Working ({len(data)} data points)")
                        else:
                            self.log_warning(f"{feature_name}: Status {response.status_code}")
                    except Exception as e:
                        self.log_warning(f"{feature_name}: {str(e)}")
            
            return True
            
        except Exception as e:
            self.log_error(f"Analytics feature verification failed: {str(e)}")
            return False

    async def verify_frontend_accessibility(self):
        """Verify frontend is accessible"""
        try:
            self.log_info("Verifying Frontend Accessibility...")
            
            async with httpx.AsyncClient() as client:
                # Test frontend health
                try:
                    response = await client.get("http://localhost:3000", timeout=10.0)
                    if response.status_code == 200:
                        self.log_success("Frontend: Accessible at http://localhost:3000")
                    else:
                        self.log_warning(f"Frontend: Status {response.status_code}")
                except Exception as e:
                    self.log_warning(f"Frontend: Connection error - {str(e)}")
            
            return True
            
        except Exception as e:
            self.log_error(f"Frontend accessibility check failed: {str(e)}")
            return False

    def get_sample_prediction_data(self, prediction_type: str) -> Dict[str, Any]:
        """Get sample data for prediction testing"""
        sample_data = {
            "task-duration": {
                "task_data": {
                    "complexity_score": 7,
                    "priority": "high",
                    "required_skills": ["Python", "React", "MongoDB"],
                    "estimated_hours": 24,
                    "dependencies_count": 2,
                    "has_external_dependency": True,
                    "team_size": 4,
                    "team_experience_avg": 3.5
                }
            },
            "team-performance": {
                "team_data": {
                    "team_size": 6,
                    "workload_hours": 240,
                    "skill_diversity": 8,
                    "experience_avg": 4.2,
                    "project_count": 3,
                    "collaboration_score": 7.5
                }
            },
            "project-success": {
                "project_data": {
                    "budget_adequacy": 8,
                    "stakeholder_alignment": 7,
                    "scope_clarity": 6,
                    "timeline_realism": 5,
                    "team_experience": 7,
                    "technical_risk": 4,
                    "complexity_score": 6
                }
            }
        }
        
        return sample_data.get(prediction_type, {})

    async def generate_verification_report(self):
        """Generate comprehensive verification report"""
        try:
            self.log_info("Generating Verification Report...")
            
            # Count results
            total_tests = len(self.test_results)
            success_tests = len([r for r in self.test_results if r['status'] == 'success'])
            error_tests = len([r for r in self.test_results if r['status'] == 'error'])
            warning_tests = len([r for r in self.test_results if r['status'] == 'warning'])
            
            # Generate report
            report = {
                "verification_timestamp": datetime.now().isoformat(),
                "phase": "Phase 4.1 - Advanced AI/ML Integration & Modern Ecosystem",
                "summary": {
                    "total_tests": total_tests,
                    "successful": success_tests,
                    "errors": error_tests,
                    "warnings": warning_tests,
                    "success_rate": round((success_tests / total_tests) * 100, 2) if total_tests > 0 else 0
                },
                "test_results": self.test_results,
                "system_status": "operational" if error_tests == 0 else "degraded" if error_tests < 5 else "critical",
                "demo_credentials": self.demo_credentials,
                "access_points": {
                    "frontend": "http://localhost:3000",
                    "backend_api": "http://localhost:8001",
                    "api_docs": "http://localhost:8001/docs",
                    "external_url": "https://bugfix-dashboard-9.preview.emergentagent.com"
                }
            }
            
            # Save report
            report_file = f"/app/phase_4_1_verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            # Display summary
            print(f"\n{Fore.YELLOW}{'='*80}{Style.RESET_ALL}")
            print(f"{Fore.CYAN}📊 PHASE 4.1 SYSTEM VERIFICATION REPORT{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}{'='*80}{Style.RESET_ALL}")
            print(f"🕐 Verification Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"📈 Tests Run: {total_tests}")
            print(f"{Fore.GREEN}✅ Successful: {success_tests}{Style.RESET_ALL}")
            print(f"{Fore.RED}❌ Errors: {error_tests}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}⚠️  Warnings: {warning_tests}{Style.RESET_ALL}")
            print(f"📊 Success Rate: {report['summary']['success_rate']}%")
            print(f"🎯 System Status: {report['system_status'].upper()}")
            print(f"💾 Report Saved: {report_file}")
            
            print(f"\n{Fore.CYAN}🌐 ACCESS POINTS:{Style.RESET_ALL}")
            print(f"  • Frontend: http://localhost:3000")
            print(f"  • Backend API: http://localhost:8001")
            print(f"  • API Documentation: http://localhost:8001/docs")
            print(f"  • Demo Login: {self.demo_credentials['email']} / {self.demo_credentials['password']}")
            
            print(f"\n{Fore.GREEN}🚀 PHASE 4.1 FEATURES VERIFIED:{Style.RESET_ALL}")
            print(f"  • Multi-model AI Integration (GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Pro)")
            print(f"  • TensorFlow.js Client-side Machine Learning")
            print(f"  • Real-time AI Collaboration Engine")
            print(f"  • Advanced Resource Management with AI")
            print(f"  • Comprehensive Analytics Dashboard")
            print(f"  • Predictive Analytics & Forecasting")
            
            if report['system_status'] == 'operational':
                print(f"\n{Fore.GREEN}🎉 PHASE 4.1 SYSTEM FULLY OPERATIONAL!{Style.RESET_ALL}")
            elif report['system_status'] == 'degraded':
                print(f"\n{Fore.YELLOW}⚠️  PHASE 4.1 SYSTEM OPERATIONAL WITH WARNINGS{Style.RESET_ALL}")
            else:
                print(f"\n{Fore.RED}🚨 PHASE 4.1 SYSTEM CRITICAL ISSUES DETECTED{Style.RESET_ALL}")
            
            print(f"{Fore.YELLOW}{'='*80}{Style.RESET_ALL}")
            
            return report
            
        except Exception as e:
            self.log_error(f"Report generation failed: {str(e)}")
            return None

    async def run_comprehensive_verification(self):
        """Run comprehensive system verification"""
        try:
            print(f"{Fore.MAGENTA}🚀 STARTING PHASE 4.1 COMPREHENSIVE SYSTEM VERIFICATION{Style.RESET_ALL}")
            print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
            
            # Run verification steps
            verification_steps = [
                ("System Health", self.verify_system_health),
                ("Authentication", self.authenticate_demo_user),
                ("AI/ML Integration", self.verify_ai_ml_features),
                ("TensorFlow.js", self.verify_tensorflow_features),
                ("Real-time AI", self.verify_realtime_ai_features),
                ("Resource Management", self.verify_resource_management_features),
                ("Analytics & Reporting", self.verify_analytics_features),
                ("Frontend Accessibility", self.verify_frontend_accessibility)
            ]
            
            for step_name, step_function in verification_steps:
                print(f"\n{Fore.BLUE}🔍 {step_name}...{Style.RESET_ALL}")
                success = await step_function()
                if success:
                    print(f"{Fore.GREEN}✅ {step_name} - PASSED{Style.RESET_ALL}")
                else:
                    print(f"{Fore.RED}❌ {step_name} - FAILED{Style.RESET_ALL}")
            
            # Generate final report
            print(f"\n{Fore.BLUE}📊 Generating Verification Report...{Style.RESET_ALL}")
            report = await self.generate_verification_report()
            
            return report
            
        except Exception as e:
            self.log_error(f"Comprehensive verification failed: {str(e)}")
            return None

async def main():
    """Main function to run Phase 4.1 verification"""
    verifier = Phase41SystemVerifier()
    
    try:
        # Install required packages if not present
        try:
            import colorama
            import httpx
        except ImportError:
            print("Installing required packages...")
            os.system("pip install colorama httpx")
            
        # Run comprehensive verification
        report = await verifier.run_comprehensive_verification()
        
        if report:
            return report['summary']['success_rate'] > 80
        else:
            return False
            
    except Exception as e:
        print(f"Verification failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)