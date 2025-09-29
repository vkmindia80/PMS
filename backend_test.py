#!/usr/bin/env python3
"""
Backend API Testing for Project Management Features
Tests all project-related endpoints with authentication
"""

import requests
import json
import sys
from datetime import datetime, date
from typing import Dict, Any, Optional

class ProjectAPITester:
    def __init__(self, base_url: str = "https://code-pathway.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.organization_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple[bool, Dict, int]:
        """Make HTTP request with authentication"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {"error": "Invalid method"}, 400

            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return response.status_code < 400, response_data, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 500

    def test_authentication(self):
        """Test login with demo credentials"""
        print("\n🔐 Testing Authentication...")
        
        login_data = {
            "email": "demo@company.com",
            "password": "demo123456"
        }
        
        success, response, status_code = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'tokens' in response and 'access_token' in response['tokens']:
            self.token = response['tokens']['access_token']
            self.user_id = response.get('user', {}).get('id')
            self.organization_id = response.get('user', {}).get('organization_id')
            self.log_test("Authentication", True, f"Token obtained, User ID: {self.user_id}")
            return True
        else:
            self.log_test("Authentication", False, f"Status: {status_code}, Response: {response}")
            return False

    def test_project_templates(self):
        """Test project templates endpoint"""
        print("\n📋 Testing Project Templates...")
        
        success, response, status_code = self.make_request('GET', 'projects/templates/')
        
        if success and isinstance(response, list) and len(response) > 0:
            template_count = len(response)
            template_names = [t.get('name', 'Unknown') for t in response]
            self.log_test("Project Templates", True, f"Found {template_count} templates: {', '.join(template_names)}")
            return response
        else:
            self.log_test("Project Templates", False, f"Status: {status_code}, Response: {response}")
            return []

    def test_create_project(self) -> Optional[str]:
        """Test project creation"""
        print("\n➕ Testing Project Creation...")
        
        project_data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "description": "Automated test project for Phase 2.2 testing",
            "status": "planning",
            "priority": "medium",
            "visibility": "team",
            "organization_id": self.organization_id,
            "owner_id": self.user_id,
            "team_members": [],
            "category": "Testing",
            "tags": ["test", "automation", "phase2.2"],
            "budget": {
                "total_budget": 50000.0,
                "spent_amount": 0.0,
                "currency": "USD"
            },
            "milestones": []
        }
        
        success, response, status_code = self.make_request('POST', 'projects/', project_data)
        
        if success and 'id' in response:
            project_id = response['id']
            self.log_test("Project Creation", True, f"Created project with ID: {project_id}")
            return project_id
        else:
            self.log_test("Project Creation", False, f"Status: {status_code}, Response: {response}")
            return None

    def test_list_projects(self):
        """Test project listing"""
        print("\n📋 Testing Project List...")
        
        success, response, status_code = self.make_request('GET', 'projects/')
        
        if success and isinstance(response, list):
            project_count = len(response)
            self.log_test("Project List", True, f"Retrieved {project_count} projects")
            return response
        else:
            self.log_test("Project List", False, f"Status: {status_code}, Response: {response}")
            return []

    def test_get_project(self, project_id: str):
        """Test getting specific project"""
        print(f"\n🔍 Testing Get Project {project_id}...")
        
        success, response, status_code = self.make_request('GET', f'projects/{project_id}')
        
        if success and 'id' in response:
            self.log_test("Get Project", True, f"Retrieved project: {response.get('name', 'Unknown')}")
            return response
        else:
            self.log_test("Get Project", False, f"Status: {status_code}, Response: {response}")
            return None

    def test_update_project(self, project_id: str):
        """Test project update"""
        print(f"\n✏️ Testing Update Project {project_id}...")
        
        update_data = {
            "status": "active",
            "progress_percentage": 25.0,
            "description": "Updated project description for testing"
        }
        
        success, response, status_code = self.make_request('PUT', f'projects/{project_id}', update_data)
        
        if success and response.get('status') == 'active':
            self.log_test("Update Project", True, f"Updated project status to active")
            return True
        else:
            self.log_test("Update Project", False, f"Status: {status_code}, Response: {response}")
            return False

    def test_project_dashboard(self, project_id: str):
        """Test project dashboard metrics"""
        print(f"\n📊 Testing Project Dashboard {project_id}...")
        
        success, response, status_code = self.make_request('GET', f'projects/{project_id}/dashboard')
        
        if success and 'project_id' in response:
            metrics = response.get('progress', {})
            budget = response.get('budget', {})
            timeline = response.get('timeline', {})
            self.log_test("Project Dashboard", True, f"Retrieved dashboard metrics - Progress: {metrics.get('overall_percentage', 0)}%, Budget: ${budget.get('total', 0)}")
            return response
        else:
            self.log_test("Project Dashboard", False, f"Status: {status_code}, Response: {response}")
            return None

    def test_add_milestone(self, project_id: str):
        """Test adding milestone to project"""
        print(f"\n🎯 Testing Add Milestone to {project_id}...")
        
        milestone_data = {
            "title": "Testing Milestone",
            "description": "Milestone added during automated testing",
            "due_date": "2024-03-15"
        }
        
        success, response, status_code = self.make_request('POST', f'projects/{project_id}/milestones', milestone_data)
        
        if success and 'milestone' in response:
            milestone_id = response['milestone'].get('id')
            self.log_test("Add Milestone", True, f"Added milestone with ID: {milestone_id}")
            return milestone_id
        else:
            self.log_test("Add Milestone", False, f"Status: {status_code}, Response: {response}")
            return None

    def test_update_milestone(self, project_id: str, milestone_id: str):
        """Test updating milestone"""
        print(f"\n🎯 Testing Update Milestone {milestone_id}...")
        
        update_data = {
            "completed": True,
            "description": "Updated milestone description"
        }
        
        success, response, status_code = self.make_request('PUT', f'projects/{project_id}/milestones/{milestone_id}', update_data)
        
        if success:
            self.log_test("Update Milestone", True, "Milestone updated successfully")
            return True
        else:
            self.log_test("Update Milestone", False, f"Status: {status_code}, Response: {response}")
            return False

    def test_project_filters(self):
        """Test project filtering"""
        print("\n🔍 Testing Project Filters...")
        
        # Test status filter
        success, response, status_code = self.make_request('GET', 'projects/', params={'status_filter': 'active'})
        if success:
            active_count = len(response) if isinstance(response, list) else 0
            self.log_test("Status Filter", True, f"Found {active_count} active projects")
        else:
            self.log_test("Status Filter", False, f"Status: {status_code}")

        # Test priority filter
        success, response, status_code = self.make_request('GET', 'projects/', params={'priority_filter': 'high'})
        if success:
            high_priority_count = len(response) if isinstance(response, list) else 0
            self.log_test("Priority Filter", True, f"Found {high_priority_count} high priority projects")
        else:
            self.log_test("Priority Filter", False, f"Status: {status_code}")

    def test_archive_project(self, project_id: str):
        """Test project archival (soft delete)"""
        print(f"\n🗄️ Testing Archive Project {project_id}...")
        
        success, response, status_code = self.make_request('DELETE', f'projects/{project_id}')
        
        if success or status_code == 204:
            self.log_test("Archive Project", True, "Project archived successfully")
            return True
        else:
            self.log_test("Archive Project", False, f"Status: {status_code}, Response: {response}")
            return False

    def run_all_tests(self):
        """Run all project management tests"""
        print("🚀 Starting Project Management API Tests")
        print("=" * 50)
        
        # Test authentication first
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return self.generate_report()
        
        # Test project templates
        templates = self.test_project_templates()
        
        # Test project creation
        project_id = self.test_create_project()
        
        # Test project listing
        projects = self.test_list_projects()
        
        if project_id:
            # Test getting specific project
            project = self.test_get_project(project_id)
            
            # Test project update
            self.test_update_project(project_id)
            
            # Test project dashboard
            self.test_project_dashboard(project_id)
            
            # Test milestone operations
            milestone_id = self.test_add_milestone(project_id)
            if milestone_id:
                self.test_update_milestone(project_id, milestone_id)
            
            # Test project filters
            self.test_project_filters()
            
            # Test project archival (last test)
            self.test_archive_project(project_id)
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['details']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results,
            "failed_tests_details": failed_tests
        }

def main():
    """Main test execution"""
    tester = ProjectAPITester()
    report = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if report['failed_tests'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())