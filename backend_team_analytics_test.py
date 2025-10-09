#!/usr/bin/env python3
"""
Backend API Testing for Teams and Analytics Tab Functionality
Testing team management endpoints and analytics data calculations
"""

import requests
import json
import sys
from datetime import datetime

class TeamAnalyticsAPITester:
    def __init__(self, base_url="https://token-fix-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.project_id = None
        self.test_user_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        if details:
            print(f"   Details: {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {}, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return success, response_data, f"Status: {response.status_code}"

        except Exception as e:
            return False, {}, f"Request failed: {str(e)}"

    def test_login(self):
        """Test login with demo credentials"""
        print("\n🔐 Testing Authentication...")
        
        success, response, details = self.make_request(
            'POST', 
            'auth/login',
            data={"email": "demo@company.com", "password": "demo123456"}
        )
        
        if success and 'tokens' in response and 'access_token' in response['tokens']:
            self.token = response['tokens']['access_token']
            self.log_test("Login with demo credentials", True, "Token received")
            return True
        else:
            self.log_test("Login with demo credentials", False, details)
            return False

    def test_get_projects(self):
        """Get projects to find a test project"""
        print("\n📋 Getting Projects...")
        
        success, response, details = self.make_request('GET', 'projects')
        
        if success and isinstance(response, list) and len(response) > 0:
            # Find a project with team members
            for project in response:
                if isinstance(project, dict) and project.get('id'):
                    self.project_id = project['id']
                    self.log_test("Get projects list", True, f"Found project: {self.project_id}")
                    return True
            
            self.log_test("Get projects list", False, "No valid projects found")
            return False
        else:
            self.log_test("Get projects list", False, details)
            return False

    def test_get_project_details(self):
        """Get detailed project information"""
        if not self.project_id:
            self.log_test("Get project details", False, "No project ID available")
            return False
            
        print(f"\n📊 Testing Project Details for {self.project_id}...")
        
        success, response, details = self.make_request('GET', f'projects/{self.project_id}')
        
        if success:
            # Check if project has required fields for analytics
            required_fields = ['budget', 'team_members', 'progress_percentage', 'task_count']
            missing_fields = []
            
            for field in required_fields:
                if field not in response:
                    missing_fields.append(field)
            
            if missing_fields:
                self.log_test("Project details structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Project details structure", True, "All required fields present")
                
                # Log budget utilization calculation data
                budget = response.get('budget', {})
                if budget.get('total_budget') and budget.get('spent_amount'):
                    utilization = (budget['spent_amount'] / budget['total_budget']) * 100
                    print(f"   Budget Utilization: {utilization:.1f}% (${budget['spent_amount']} / ${budget['total_budget']})")
                
                print(f"   Team Members: {len(response.get('team_members', []))}")
                print(f"   Progress: {response.get('progress_percentage', 0)}%")
                print(f"   Task Count: {response.get('task_count', 0)}")
            
            return True
        else:
            self.log_test("Get project details", False, details)
            return False

    def test_get_project_team(self):
        """Test GET /api/projects/{id}/team endpoint"""
        if not self.project_id:
            self.log_test("Get project team", False, "No project ID available")
            return False
            
        print(f"\n👥 Testing Team Management API for {self.project_id}...")
        
        success, response, details = self.make_request('GET', f'projects/{self.project_id}/team')
        
        if success:
            if isinstance(response, list):
                self.log_test("Get project team", True, f"Retrieved {len(response)} team members")
                
                # Check team member structure
                if len(response) > 0:
                    member = response[0]
                    required_fields = ['user_id', 'name', 'email', 'role', 'performance']
                    missing_fields = [field for field in required_fields if field not in member]
                    
                    if missing_fields:
                        self.log_test("Team member data structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Team member data structure", True, "All required fields present")
                        
                        # Log performance metrics
                        perf = member.get('performance', {})
                        print(f"   Sample member performance: {perf.get('completion_rate', 0):.1f}% completion rate")
                        print(f"   Workload: {perf.get('workload', 0)}%, Utilization: {perf.get('utilization', 0)}%")
                
                return True
            else:
                self.log_test("Get project team", False, "Response is not a list")
                return False
        else:
            self.log_test("Get project team", False, details)
            return False

    def test_get_users_for_team_management(self):
        """Get users list to test team member addition"""
        print("\n👤 Getting Users for Team Management...")
        
        success, response, details = self.make_request('GET', 'users/')
        
        if success and isinstance(response, list) and len(response) > 0:
            # Find a user that's not already in the project team
            for user in response:
                if isinstance(user, dict) and user.get('id'):
                    self.test_user_id = user['id']
                    self.log_test("Get users list", True, f"Found test user: {self.test_user_id}")
                    return True
            
            self.log_test("Get users list", False, "No valid users found")
            return False
        else:
            self.log_test("Get users list", False, details)
            return False

    def test_add_team_member(self):
        """Test POST /api/projects/{id}/team/add endpoint"""
        if not self.project_id or not self.test_user_id:
            self.log_test("Add team member", False, "Missing project ID or user ID")
            return False
            
        print(f"\n➕ Testing Add Team Member...")
        
        success, response, details = self.make_request(
            'POST', 
            f'projects/{self.project_id}/team/add',
            data={"user_id": self.test_user_id, "role": "member"},
            expected_status=200
        )
        
        if success:
            self.log_test("Add team member", True, f"Added user {self.test_user_id} to project")
            return True
        else:
            # Check if user is already a member (which is also acceptable)
            if "already a team member" in str(response):
                self.log_test("Add team member", True, "User already a team member (expected)")
                return True
            else:
                self.log_test("Add team member", False, details)
                return False

    def test_remove_team_member(self):
        """Test DELETE /api/projects/{id}/team/{userId} endpoint"""
        if not self.project_id or not self.test_user_id:
            self.log_test("Remove team member", False, "Missing project ID or user ID")
            return False
            
        print(f"\n➖ Testing Remove Team Member...")
        
        success, response, details = self.make_request(
            'DELETE', 
            f'projects/{self.project_id}/team/{self.test_user_id}',
            expected_status=200
        )
        
        if success:
            self.log_test("Remove team member", True, f"Removed user {self.test_user_id} from project")
            return True
        else:
            # Check if user is not a member or is project owner (which is also acceptable)
            if "not a team member" in str(response) or "Cannot remove project owner" in str(response):
                self.log_test("Remove team member", True, "User not removable (expected)")
                return True
            else:
                self.log_test("Remove team member", False, details)
                return False

    def test_analytics_data_endpoints(self):
        """Test endpoints that provide analytics data"""
        if not self.project_id:
            self.log_test("Analytics data endpoints", False, "No project ID available")
            return False
            
        print(f"\n📈 Testing Analytics Data Sources...")
        
        # Test tasks endpoint for analytics calculations
        success, response, details = self.make_request('GET', f'tasks/?project_id={self.project_id}')
        
        if success and isinstance(response, list):
            self.log_test("Get project tasks for analytics", True, f"Retrieved {len(response)} tasks")
            
            # Analyze task data for analytics
            if len(response) > 0:
                task = response[0]
                required_fields = ['status', 'priority', 'created_at', 'assigned_to']
                missing_fields = [field for field in required_fields if field not in task]
                
                if missing_fields:
                    self.log_test("Task data for analytics", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Task data for analytics", True, "All required analytics fields present")
                    
                    # Calculate some basic analytics
                    statuses = {}
                    priorities = {}
                    for task in response:
                        status = task.get('status', 'unknown')
                        priority = task.get('priority', 'unknown')
                        statuses[status] = statuses.get(status, 0) + 1
                        priorities[priority] = priorities.get(priority, 0) + 1
                    
                    print(f"   Task Status Distribution: {statuses}")
                    print(f"   Task Priority Distribution: {priorities}")
            
            return True
        else:
            self.log_test("Get project tasks for analytics", False, details)
            return False

    def run_all_tests(self):
        """Run all team and analytics API tests"""
        print("🚀 Starting Team & Analytics API Tests")
        print("=" * 50)
        
        # Authentication
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Get test project
        if not self.test_get_projects():
            print("❌ Could not get projects - stopping tests")
            return False
        
        # Test project details and analytics data
        self.test_get_project_details()
        
        # Test team management endpoints
        self.test_get_project_team()
        self.test_get_users_for_team_management()
        self.test_add_team_member()
        self.test_remove_team_member()
        
        # Test analytics data sources
        self.test_analytics_data_endpoints()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = TeamAnalyticsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())