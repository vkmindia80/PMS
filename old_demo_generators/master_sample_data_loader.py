#!/usr/bin/env python3
"""
Master Sample Data Loading Script for Enterprise Portfolio Management System
Loads comprehensive sample data for all Phase 4.1 modules and features
"""

import asyncio
import sys
import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any
from colorama import Fore, Style, init

# Initialize colorama for colored output
init()

# Add the backend directory to the path
sys.path.append('/app/backend')

class MasterDataLoader:
    def __init__(self):
        self.loading_results = []
        self.start_time = datetime.now()
        
    def log_success(self, message: str):
        """Log success message"""
        print(f"{Fore.GREEN}✅ {message}{Style.RESET_ALL}")
        self.loading_results.append({"status": "success", "message": message, "timestamp": datetime.now()})
    
    def log_error(self, message: str):
        """Log error message"""
        print(f"{Fore.RED}❌ {message}{Style.RESET_ALL}")
        self.loading_results.append({"status": "error", "message": message, "timestamp": datetime.now()})
    
    def log_info(self, message: str):
        """Log info message"""
        print(f"{Fore.CYAN}ℹ️  {message}{Style.RESET_ALL}")
        self.loading_results.append({"status": "info", "message": message, "timestamp": datetime.now()})
    
    def log_warning(self, message: str):
        """Log warning message"""
        print(f"{Fore.YELLOW}⚠️  {message}{Style.RESET_ALL}")
        self.loading_results.append({"status": "warning", "message": message, "timestamp": datetime.now()})

    async def clear_existing_data(self):
        """Clear existing demo data (except base demo user/org)"""
        try:
            self.log_info("Clearing existing demo data...")
            
            from database import connect_to_mongo, get_database
            
            await connect_to_mongo()
            db = await get_database()
            
            # Collections to clear (keeping users and organizations with demo data)
            collections_to_clear = ['teams', 'projects', 'tasks', 'comments', 'files', 'notifications']
            
            for collection_name in collections_to_clear:
                result = await db[collection_name].delete_many({"organization_id": "demo-org-001"})
                if result.deleted_count > 0:
                    self.log_info(f"Cleared {result.deleted_count} items from {collection_name}")
                else:
                    self.log_info(f"No items to clear from {collection_name}")
            
            self.log_success("Existing demo data cleared")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to clear existing data: {str(e)}")
            return False

    async def load_comprehensive_demo_data(self):
        """Load comprehensive demo data using existing script"""
        try:
            self.log_info("Loading comprehensive demo data...")
            
            # Import and run the comprehensive demo creator
            from create_comprehensive_demo import ComprehensiveDemoCreator
            
            creator = ComprehensiveDemoCreator()
            await creator.create_comprehensive_demo_data()
            
            self.log_success("Comprehensive demo data loaded successfully")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to load comprehensive demo data: {str(e)}")
            return False

    async def load_ai_training_data(self):
        """Load additional AI training and demo data"""
        try:
            self.log_info("Loading AI training data...")
            
            from database import get_database
            from datetime import datetime, timedelta
            import uuid
            import random
            
            db = await get_database()
            
            # Get existing projects for AI training data
            projects = await db.projects.find({"organization_id": "demo-org-001"}).to_list(length=None)
            users = await db.users.find({"organization_id": "demo-org-001"}).to_list(length=None)
            
            # Create additional AI-specific notifications
            ai_notifications = []
            notification_templates = [
                "AI analysis complete: Resource optimization suggestions available",
                "Predictive model suggests task duration adjustment needed",
                "AI detected potential project risk - review recommended", 
                "Machine learning model training complete - performance improved by 15%",
                "Real-time collaboration AI assistant is now available for your team",
                "AI-powered skills gap analysis reveals training opportunities",
                "Predictive analytics suggests resource reallocation for Project {project_name}",
                "AI recommendation: Consider adjusting timeline for upcoming milestone"
            ]
            
            for i in range(20):
                project = random.choice(projects)
                user = random.choice(users)
                
                notification_data = {
                    "id": str(uuid.uuid4()),
                    "title": "AI System Notification",
                    "message": random.choice(notification_templates).format(project_name=project['name']),
                    "type": "ai_insight",
                    "priority": random.choice(["low", "medium", "high"]),
                    "recipient_id": user["id"],
                    "sender_id": "ai-system",
                    "organization_id": "demo-org-001",
                    "entity_type": "project",
                    "entity_id": project["id"],
                    "channels": ["in_app"],
                    "read": random.choice([True, False]),
                    "read_at": datetime.utcnow() - timedelta(days=random.randint(1, 7)) if random.choice([True, False]) else None,
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    "updated_at": datetime.utcnow()
                }
                ai_notifications.append(notification_data)
            
            if ai_notifications:
                await db.notifications.insert_many(ai_notifications)
                self.log_success(f"Created {len(ai_notifications)} AI-related notifications")
            
            # Create AI training metadata (for ML model training history)
            ai_training_data = []
            model_types = [
                "task_duration_predictor", "team_performance_predictor", 
                "project_success_classifier", "resource_utilization_predictor"
            ]
            
            for model_type in model_types:
                for i in range(5):  # 5 training sessions per model
                    training_record = {
                        "id": str(uuid.uuid4()),
                        "model_type": model_type,
                        "training_session_id": str(uuid.uuid4()),
                        "accuracy": random.uniform(0.75, 0.95),
                        "loss": random.uniform(0.05, 0.25),
                        "data_points": random.randint(500, 2000),
                        "training_duration_minutes": random.randint(5, 45),
                        "model_version": f"1.{i+1}.0",
                        "hyperparameters": {
                            "learning_rate": random.uniform(0.001, 0.01),
                            "batch_size": random.choice([16, 32, 64]),
                            "epochs": random.randint(50, 200)
                        },
                        "performance_metrics": {
                            "precision": random.uniform(0.80, 0.95),
                            "recall": random.uniform(0.75, 0.90),
                            "f1_score": random.uniform(0.77, 0.92)
                        },
                        "organization_id": "demo-org-001",
                        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 90)),
                        "updated_at": datetime.utcnow()
                    }
                    ai_training_data.append(training_record)
            
            # Create a custom collection for AI training metadata
            if ai_training_data:
                await db.ai_training_history.insert_many(ai_training_data)
                self.log_success(f"Created {len(ai_training_data)} AI training records")
            
            self.log_success("AI training data loaded successfully")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to load AI training data: {str(e)}")
            return False

    async def load_integration_sample_data(self):
        """Load sample data for integration features"""
        try:
            self.log_info("Loading integration sample data...")
            
            from database import get_database
            import uuid
            
            db = await get_database()
            
            # Sample integration configurations
            integration_configs = [
                {
                    "id": str(uuid.uuid4()),
                    "type": "slack",
                    "name": "Slack Workspace Integration",
                    "status": "active",
                    "configuration": {
                        "workspace_name": "Demo Company",
                        "bot_token": "xoxb-demo-token",
                        "channels": ["#general", "#dev-team", "#announcements"],
                        "features": ["notifications", "status_updates", "task_alerts"]
                    },
                    "organization_id": "demo-org-001",
                    "created_at": datetime.utcnow() - timedelta(days=30),
                    "updated_at": datetime.utcnow()
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "microsoft_teams",
                    "name": "Microsoft Teams Integration",
                    "status": "configured",
                    "configuration": {
                        "tenant_id": "demo-tenant-id",
                        "app_id": "demo-app-id",
                        "channels": ["Project Updates", "Team General"],
                        "features": ["adaptive_cards", "task_management", "meeting_integration"]
                    },
                    "organization_id": "demo-org-001",
                    "created_at": datetime.utcnow() - timedelta(days=25),
                    "updated_at": datetime.utcnow()
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "github",
                    "name": "GitHub Repository Integration",
                    "status": "active",
                    "configuration": {
                        "organization": "demo-company",
                        "repositories": ["main-app", "mobile-app", "api-gateway"],
                        "webhook_url": "https://api.demo.com/webhooks/github",
                        "features": ["pr_tracking", "deployment_status", "code_quality"]
                    },
                    "organization_id": "demo-org-001",
                    "created_at": datetime.utcnow() - timedelta(days=20),
                    "updated_at": datetime.utcnow()
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "google_workspace",
                    "name": "Google Workspace Integration",
                    "status": "active",
                    "configuration": {
                        "domain": "demo-company.com",
                        "calendar_id": "primary",
                        "drive_folder": "Project Files",
                        "features": ["calendar_sync", "drive_integration", "gmail_notifications"]
                    },
                    "organization_id": "demo-org-001", 
                    "created_at": datetime.utcnow() - timedelta(days=15),
                    "updated_at": datetime.utcnow()
                }
            ]
            
            if integration_configs:
                await db.integrations.insert_many(integration_configs)
                self.log_success(f"Created {len(integration_configs)} integration configurations")
            
            self.log_success("Integration sample data loaded successfully")
            return True
            
        except Exception as e:
            self.log_error(f"Failed to load integration sample data: {str(e)}")
            return False

    async def generate_loading_report(self):
        """Generate data loading report"""
        try:
            self.log_info("Generating data loading report...")
            
            from database import get_database
            
            db = await get_database()
            
            # Count final data
            collections = ["users", "organizations", "teams", "projects", "tasks", "comments", "files", "notifications"]
            final_counts = {}
            
            for collection_name in collections:
                count = await db[collection_name].count_documents(
                    {"organization_id": "demo-org-001"} if collection_name != "organizations" else {"id": "demo-org-001"}
                )
                final_counts[collection_name] = count
            
            # Additional AI/ML specific collections
            ai_collections = ["ai_training_history", "integrations"]
            for collection_name in ai_collections:
                try:
                    count = await db[collection_name].count_documents({"organization_id": "demo-org-001"})
                    final_counts[collection_name] = count
                except:
                    final_counts[collection_name] = 0
            
            # Count results
            total_operations = len(self.loading_results)
            success_operations = len([r for r in self.loading_results if r['status'] == 'success'])
            error_operations = len([r for r in self.loading_results if r['status'] == 'error'])
            
            # Generate report
            end_time = datetime.now()
            loading_duration = (end_time - self.start_time).total_seconds()
            
            report = {
                "loading_timestamp": end_time.isoformat(),
                "phase": "Phase 4.1 - Master Sample Data Loading",
                "loading_duration_seconds": loading_duration,
                "summary": {
                    "total_operations": total_operations,
                    "successful": success_operations,
                    "errors": error_operations,
                    "success_rate": round((success_operations / total_operations) * 100, 2) if total_operations > 0 else 0
                },
                "final_data_counts": final_counts,
                "total_data_points": sum(final_counts.values()),
                "loading_results": self.loading_results
            }
            
            # Save report
            report_file = f"/app/master_data_loading_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            # Display summary
            print(f"\n{Fore.YELLOW}{'='*80}{Style.RESET_ALL}")
            print(f"{Fore.CYAN}📊 MASTER SAMPLE DATA LOADING REPORT{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}{'='*80}{Style.RESET_ALL}")
            print(f"🕐 Loading Time: {loading_duration:.2f} seconds")
            print(f"📈 Operations: {total_operations}")
            print(f"{Fore.GREEN}✅ Successful: {success_operations}{Style.RESET_ALL}")
            print(f"{Fore.RED}❌ Errors: {error_operations}{Style.RESET_ALL}")
            print(f"📊 Success Rate: {report['summary']['success_rate']}%")
            print(f"📋 Total Data Points: {report['total_data_points']}")
            
            print(f"\n{Fore.CYAN}📦 FINAL DATA INVENTORY:{Style.RESET_ALL}")
            for collection, count in final_counts.items():
                if count > 0:
                    print(f"  • {collection.replace('_', ' ').title()}: {count} items")
            
            print(f"\n{Fore.GREEN}🎯 PHASE 4.1 SAMPLE DATA FEATURES:{Style.RESET_ALL}")
            print(f"  • 29 Professional Users with Skills & Roles")
            print(f"  • 5 Specialized Teams (Dev, Design, Marketing, Sales, Ops)")
            print(f"  • 12 Diverse Enterprise Projects")
            print(f"  • 145+ Realistic Tasks with Dependencies")
            print(f"  • 20+ AI-Generated Notifications")
            print(f"  • 20+ AI Training History Records")
            print(f"  • 4 Integration Configurations (Slack, Teams, GitHub, Google)")
            print(f"  • Comprehensive Comments & File Attachments")
            
            print(f"\n{Fore.CYAN}🌐 ACCESS INFORMATION:{Style.RESET_ALL}")
            print(f"  • Demo Login: demo@company.com / demo123456")
            print(f"  • Frontend: http://localhost:3000")
            print(f"  • Backend API: http://localhost:8001")
            print(f"  • API Documentation: http://localhost:8001/docs")
            
            print(f"\n💾 Report Saved: {report_file}")
            
            if report['summary']['success_rate'] >= 90:
                print(f"\n{Fore.GREEN}🎉 MASTER SAMPLE DATA LOADING COMPLETED SUCCESSFULLY!{Style.RESET_ALL}")
            else:
                print(f"\n{Fore.YELLOW}⚠️  SAMPLE DATA LOADING COMPLETED WITH SOME ISSUES{Style.RESET_ALL}")
            
            print(f"{Fore.YELLOW}{'='*80}{Style.RESET_ALL}")
            
            return report
            
        except Exception as e:
            self.log_error(f"Report generation failed: {str(e)}")
            return None

    async def run_master_data_loading(self):
        """Run complete master data loading process"""
        try:
            print(f"{Fore.MAGENTA}🚀 STARTING MASTER SAMPLE DATA LOADING FOR PHASE 4.1{Style.RESET_ALL}")
            print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
            
            # Run loading steps
            loading_steps = [
                ("Clear Existing Data", self.clear_existing_data),
                ("Load Comprehensive Demo Data", self.load_comprehensive_demo_data),
                ("Load AI Training Data", self.load_ai_training_data),
                ("Load Integration Sample Data", self.load_integration_sample_data)
            ]
            
            for step_name, step_function in loading_steps:
                print(f"\n{Fore.BLUE}📥 {step_name}...{Style.RESET_ALL}")
                success = await step_function()
                if success:
                    print(f"{Fore.GREEN}✅ {step_name} - COMPLETED{Style.RESET_ALL}")
                else:
                    print(f"{Fore.RED}❌ {step_name} - FAILED{Style.RESET_ALL}")
            
            # Generate final report
            print(f"\n{Fore.BLUE}📊 Generating Loading Report...{Style.RESET_ALL}")
            report = await self.generate_loading_report()
            
            return report
            
        except Exception as e:
            self.log_error(f"Master data loading failed: {str(e)}")
            return None

async def main():
    """Main function to run master data loading"""
    loader = MasterDataLoader()
    
    try:
        # Install required packages if not present
        try:
            import colorama
        except ImportError:
            print("Installing required packages...")
            os.system("pip install colorama")
            
        # Run master data loading
        report = await loader.run_master_data_loading()
        
        if report:
            return report['summary']['success_rate'] > 85
        else:
            return False
            
    except Exception as e:
        print(f"Master data loading failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)