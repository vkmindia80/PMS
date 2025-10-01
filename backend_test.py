#!/usr/bin/env python3
"""
Integration Platform Backend API Testing
Tests all 4 integration types: Slack, Teams, GitHub, Google Workspace
"""

import requests
import json
import sys
from datetime import datetime
import time

class IntegrationAPITester:
    def __init__(self, base_url="https://dev-continuation-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            self.failed_tests.append(f"{test_name}: {details}")
            print(f"❌ {test_name}: FAILED {details}")
    
    def authenticate(self) -> bool:
        """Authenticate with demo credentials"""
        try:
            auth_data = {
                "email": "demo@company.com",
                "password": "demo123456"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json=auth_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                if self.token:
                    self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                    self.log_result("Authentication", True, f"Status: {response.status_code}")
                    return True
                else:
                    self.log_result("Authentication", False, "No access token in response")
                    return False
            else:
                self.log_result("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Exception: {str(e)}")
            return False

    def test_integration_health(self) -> bool:
        """Test integration health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/integrations/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_result("Integration Health Check", True, f"Status: healthy, Services: {len(data.get('services', {}))}")
                    return True
                else:
                    self.log_result("Integration Health Check", False, f"Status: {data.get('status')}")
                    return False
            else:
                self.log_result("Integration Health Check", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Integration Health Check", False, f"Exception: {str(e)}")
            return False

    def test_available_integrations(self) -> bool:
        """Test available integrations endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/integrations/available")
            
            if response.status_code == 200:
                data = response.json()
                integrations = data.get('available_integrations', {})
                expected_types = ['slack', 'teams', 'github', 'google_workspace']
                
                if all(integration_type in integrations for integration_type in expected_types):
                    self.log_result("Available Integrations", True, f"Found all 4 integration types")
                    return True
                else:
                    missing = [t for t in expected_types if t not in integrations]
                    self.log_result("Available Integrations", False, f"Missing: {missing}")
                    return False
            else:
                self.log_result("Available Integrations", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Available Integrations", False, f"Exception: {str(e)}")
            return False

    def test_integration_status(self) -> bool:
        """Test integration status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/integrations/status")
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Integration Status", True, f"Total: {data.get('total_integrations', 0)}, Active: {data.get('active_integrations', 0)}")
                return True
            else:
                self.log_result("Integration Status", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Integration Status", False, f"Exception: {str(e)}")
            return False

    def test_timeline_tasks_api(self):
        """Test timeline tasks API endpoints"""
        print("\n" + "="*60)
        print("⏰ TESTING TIMELINE TASKS API")
        print("="*60)
        
        # Get existing timeline tasks
        success, response = self.run_test(
            "Get Timeline Tasks",
            "GET",
            f"api/timeline/tasks/{self.project_id}",
            200
        )
        
        if success:
            print(f"✅ Found {len(response)} timeline tasks")
            if len(response) > 0:
                self.timeline_task_id = response[0]['id']
                print(f"   Using task ID for testing: {self.timeline_task_id}")
        
        # Test create timeline task
        task_data = {
            "name": "Test Timeline Task",
            "description": "Test task for timeline API testing",
            "project_id": self.project_id,
            "duration": 16,
            "start_date": datetime.utcnow().isoformat(),
            "assignee_ids": [],
            "outline_level": 1,
            "summary_task": False,
            "milestone": False
        }
        
        success, response = self.run_test(
            "Create Timeline Task",
            "POST",
            "api/timeline/tasks",
            200,
            data=task_data
        )
        
        if success and 'id' in response:
            created_task_id = response['id']
            print(f"✅ Timeline task created with ID: {created_task_id}")
            
            # Test update timeline task
            update_data = {
                "percent_complete": 50.0,
                "duration": 20
            }
            
            success, response = self.run_test(
                "Update Timeline Task",
                "PUT",
                f"api/timeline/tasks/{created_task_id}",
                200,
                data=update_data
            )
            
            if success:
                print(f"✅ Timeline task updated successfully")
        
        return success

    def test_task_dependencies_api(self):
        """Test task dependencies API endpoints"""
        print("\n" + "="*60)
        print("🔗 TESTING TASK DEPENDENCIES API")
        print("="*60)
        
        # Get existing dependencies
        success, response = self.run_test(
            "Get Task Dependencies",
            "GET",
            f"api/timeline/dependencies/{self.project_id}",
            200
        )
        
        if success:
            print(f"✅ Found {len(response)} task dependencies")
            if len(response) > 0:
                self.dependency_id = response[0]['id']
        
        return success

    def test_gantt_chart_data_api(self):
        """Test the main Gantt chart data API endpoint"""
        print("\n" + "="*60)
        print("📊 TESTING GANTT CHART DATA API")
        print("="*60)
        
        success, response = self.run_test(
            "Get Gantt Chart Data",
            "GET",
            f"api/timeline/gantt/{self.project_id}",
            200
        )
        
        if success:
            print(f"✅ Gantt chart data retrieved successfully")
            print(f"   Project ID: {response.get('project_id', 'N/A')}")
            print(f"   Tasks: {len(response.get('tasks', []))}")
            print(f"   Dependencies: {len(response.get('dependencies', []))}")
            print(f"   Critical Path: {len(response.get('critical_path', []))}")
            
            # Validate data structure
            required_fields = ['project_id', 'tasks', 'dependencies', 'critical_path']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"⚠️ Missing required fields: {missing_fields}")
                return False
            
            return True
        
        return False

    def test_timeline_stats_api(self):
        """Test timeline statistics API endpoint"""
        print("\n" + "="*60)
        print("📈 TESTING TIMELINE STATISTICS API")
        print("="*60)
        
        success, response = self.run_test(
            "Get Timeline Statistics",
            "GET",
            f"api/timeline/stats/{self.project_id}",
            200
        )
        
        if success:
            print(f"✅ Timeline statistics retrieved successfully")
            stats_fields = ['total_tasks', 'completed_tasks', 'in_progress_tasks', 
                          'project_duration_days', 'total_work_hours', 'project_health_score']
            
            for field in stats_fields:
                if field in response:
                    print(f"   {field}: {response[field]}")
            
            return True
        
        return False

    def test_timeline_calendars_api(self):
        """Test timeline calendars API endpoints"""
        print("\n" + "="*60)
        print("📅 TESTING TIMELINE CALENDARS API")
        print("="*60)
        
        success, response = self.run_test(
            "Get Timeline Calendars",
            "GET",
            f"api/timeline/calendars/{self.project_id}",
            200
        )
        
        if success:
            print(f"✅ Found {len(response)} timeline calendars")
            return True
        
        return False

    def test_timeline_baselines_api(self):
        """Test timeline baselines API endpoints"""
        print("\n" + "="*60)
        print("📊 TESTING TIMELINE BASELINES API")
        print("="*60)
        
        success, response = self.run_test(
            "Get Timeline Baselines",
            "GET",
            f"api/timeline/baselines/{self.project_id}",
            200
        )
        
        if success:
            print(f"✅ Found {len(response)} timeline baselines")
            return True
        
        return False

    def run_comprehensive_timeline_tests(self):
        """Run all timeline API tests"""
        print("🚀 STARTING COMPREHENSIVE TIMELINE API TESTING")
        print("="*80)
        
        start_time = datetime.utcnow()
        
        # Test sequence
        test_sequence = [
            ("Authentication", self.test_authentication),
            ("Projects API", self.test_projects_api),
            ("Timeline Project Configuration", self.test_timeline_project_config),
            ("Timeline Tasks API", self.test_timeline_tasks_api),
            ("Task Dependencies API", self.test_task_dependencies_api),
            ("Gantt Chart Data API", self.test_gantt_chart_data_api),
            ("Timeline Statistics API", self.test_timeline_stats_api),
            ("Timeline Calendars API", self.test_timeline_calendars_api),
            ("Timeline Baselines API", self.test_timeline_baselines_api)
        ]
        
        passed_tests = []
        failed_tests = []
        
        for test_name, test_function in test_sequence:
            print(f"\n🔄 Running {test_name}...")
            try:
                if test_function():
                    passed_tests.append(test_name)
                    print(f"✅ {test_name} - PASSED")
                else:
                    failed_tests.append(test_name)
                    print(f"❌ {test_name} - FAILED")
            except Exception as e:
                failed_tests.append(test_name)
                print(f"❌ {test_name} - ERROR: {str(e)}")
        
        # Final results
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "="*80)
        print("📊 TIMELINE API TESTING RESULTS")
        print("="*80)
        print(f"⏱️ Total time: {duration:.2f} seconds")
        print(f"🧪 Tests run: {self.tests_run}")
        print(f"✅ Tests passed: {self.tests_passed}")
        print(f"❌ Tests failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print(f"\n✅ Passed test categories ({len(passed_tests)}):")
        for test in passed_tests:
            print(f"   • {test}")
        
        if failed_tests:
            print(f"\n❌ Failed test categories ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test}")
        
        print("="*80)
        
        return len(failed_tests) == 0

def main():
    """Main testing function"""
    print("🎯 Phase 6.1 Core Gantt Chart Engine - Backend API Testing")
    print("="*80)
    
    tester = TimelineAPITester()
    success = tester.run_comprehensive_timeline_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())