#!/usr/bin/env python3
"""
Backend API Testing for Project Details Functionality
Testing login, projects list, and project details loading - the reported issue
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class ProjectDetailsTester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_project_id = None  # Will be set from projects list
        self.test_results = []

    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"    URL: {url}")
        print(f"    Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"    Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
                if success:
                    print(f"    ✅ Success")
                else:
                    print(f"    ❌ Error: {response_data}")
            except:
                response_data = {"raw_response": response.text}
                if not success:
                    print(f"    Raw Response: {response.text}")

            self.log_result(name, success, f"Status: {response.status_code}", response_data)
            return success, response_data

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"    ❌ Error: {error_msg}")
            self.log_result(name, False, error_msg)
            return False, {"error": error_msg}

    def test_login(self):
        """Test login with demo credentials"""
        print("\n" + "="*60)
        print("TESTING AUTHENTICATION")
        print("="*60)
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": "demo@company.com", "password": "demo123456"}
        )
        
        if success and 'tokens' in response:
            self.token = response['tokens']['access_token']
            self.user_data = response.get('user', {})
            print(f"    ✅ Login successful, user ID: {self.user_data.get('id')}")
            return True
        else:
            print(f"    ❌ Login failed")
            return False

    def test_get_projects_list(self):
        """Get projects list to find a test project"""
        print("\n" + "="*60)
        print("TESTING PROJECTS LIST")
        print("="*60)
        
        success, response = self.run_test(
            "Get Projects List",
            "GET",
            "/api/projects",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Get the first project for testing
            self.test_project_id = response[0].get('id')
            print(f"    ✅ Found {len(response)} projects")
            print(f"    🎯 Using project ID for testing: {self.test_project_id}")
            print(f"    📋 Project name: {response[0].get('name', 'Unknown')}")
            return True
        else:
            print(f"    ❌ No projects found or failed to get projects list")
            return False

    def test_project_details(self):
        """Test project details endpoint - KEY FUNCTIONALITY"""
        print("\n" + "="*60)
        print("TESTING PROJECT DETAILS ENDPOINT")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return None
            
        success, response = self.run_test(
            "Get Project Details",
            "GET",
            f"/api/projects/{self.test_project_id}",
            200
        )
        
        if success and 'id' in response:
            print(f"    ✅ Project details retrieved successfully")
            print(f"    📋 Project ID: {response.get('id')}")
            print(f"    📋 Project Name: {response.get('name', 'Unknown')}")
            print(f"    📋 Status: {response.get('status', 'Unknown')}")
            print(f"    📋 Priority: {response.get('priority', 'Unknown')}")
            print(f"    📋 Progress: {response.get('progress_percentage', 0)}%")
            print(f"    📋 Team Members: {len(response.get('team_members', []))}")
            print(f"    📋 Task Count: {response.get('task_count', 0)}")
            
            # Check required fields for frontend
            required_fields = ['id', 'name', 'status', 'priority', 'progress_percentage']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"    ⚠️ Missing required fields: {missing_fields}")
            else:
                print(f"    ✅ All required fields present")
            
            return response
        else:
            print(f"    ❌ Failed to get project details")
            return None

    def test_users_list(self):
        """Test users list endpoint (needed for project details page)"""
        print("\n" + "="*60)
        print("TESTING USERS LIST ENDPOINT")
        print("="*60)
        
        success, response = self.run_test(
            "Get Users List",
            "GET",
            "/api/users",
            200
        )
        
        if success and isinstance(response, list):
            user_count = len(response)
            print(f"    ✅ Retrieved {user_count} users")
            
            if user_count > 0:
                sample_user = response[0]
                print(f"    👤 Sample user fields: {list(sample_user.keys())}")
                
                # Check required fields for project details page
                required_fields = ['id', 'name', 'email']
                missing_fields = [field for field in required_fields if field not in sample_user]
                
                if missing_fields:
                    print(f"    ⚠️ Missing required user fields: {missing_fields}")
                else:
                    print(f"    ✅ All required user fields present")
                
            return response
        else:
            print(f"    ❌ Failed to get users list")
            return []

    def test_tasks_for_project(self):
        """Test tasks list for the project (needed for project details page)"""
        print("\n" + "="*60)
        print("TESTING TASKS FOR PROJECT")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return []
            
        success, response = self.run_test(
            "Get Tasks for Project",
            "GET",
            f"/api/tasks?project_id={self.test_project_id}",
            200
        )
        
        if success and isinstance(response, list):
            task_count = len(response)
            print(f"    ✅ Retrieved {task_count} tasks for project")
            
            if task_count > 0:
                sample_task = response[0]
                print(f"    📋 Sample task fields: {list(sample_task.keys())}")
                print(f"    📋 Sample task: {sample_task.get('title', 'Unknown')}")
                
            return response
        else:
            print(f"    ❌ Failed to get tasks for project")
            return []

    def test_auth_token_validity(self):
        """Test if auth token is working properly"""
        print("\n" + "="*60)
        print("TESTING AUTH TOKEN VALIDITY")
        print("="*60)
        
        # Test /me endpoint to verify token
        success, response = self.run_test(
            "Get Current User Profile",
            "GET",
            "/api/auth/me",
            200
        )
        
        if success and 'id' in response:
            print(f"    ✅ Auth token is valid")
            print(f"    👤 User ID: {response.get('id')}")
            print(f"    👤 Email: {response.get('email')}")
            print(f"    👤 Organization: {response.get('organization_id')}")
            return True
        else:
            print(f"    ❌ Auth token validation failed")
            return False

    def test_project_update(self):
        """Test project update functionality (used by edit features)"""
        print("\n" + "="*60)
        print("TESTING PROJECT UPDATE FUNCTIONALITY")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        # Try to update project description
        test_description = f"Updated description at {datetime.utcnow().isoformat()}"
        
        success, response = self.run_test(
            "Update Project Description",
            "PUT",
            f"/api/projects/{self.test_project_id}",
            200,
            data={"description": test_description}
        )
        
        if success and 'id' in response:
            print(f"    ✅ Project update successful")
            print(f"    📝 Updated description: {response.get('description', 'Not found')}")
            return True
        else:
            print(f"    ❌ Project update failed")
            return False

    def run_all_tests(self):
        """Run all activity API tests"""
        print("🚀 Starting Task Activity Timeline Testing")
        print("="*80)
        
        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False
            
        # Get test task
        if not self.test_get_task():
            print("❌ Test task not available, stopping tests")
            return False
            
        # Test activity metrics - KEY FUNCTIONALITY
        metrics_success = self.test_activity_metrics() is not None
        
        # Test activity list
        list_success = len(self.test_activity_list()) > 0
        
        # Test activity data integrity
        integrity_success = self.test_activity_data_integrity()
        
        # Test activity refresh cycle
        refresh_success = self.test_activity_refresh_cycle()
        
        # Calculate overall success
        key_tests_passed = sum([metrics_success, list_success, integrity_success, refresh_success])
        overall_success = key_tests_passed >= 3  # At least 3 out of 4 key tests must pass
        
        # Print summary
        print("\n" + "="*80)
        print("TASK ACTIVITY TIMELINE TEST SUMMARY")
        print("="*80)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print(f"\n🎯 KEY FUNCTIONALITY TESTS:")
        print(f"  Activity Metrics: {'✅' if metrics_success else '❌'}")
        print(f"  Activity List: {'✅' if list_success else '❌'}")
        print(f"  Data Integrity: {'✅' if integrity_success else '❌'}")
        print(f"  Auto-refresh: {'✅' if refresh_success else '❌'}")
        
        if overall_success:
            print("\n🎉 Task Activity Timeline functionality is working!")
            print("✅ Activity metrics should auto-update")
            print("✅ Activity list should show all actions")
        else:
            print("\n❌ Task Activity Timeline has issues")
            print("🐛 Activity functionality may not work properly")
        
        return overall_success

def main():
    """Main test execution"""
    tester = TaskActivityTester()
    
    try:
        success = tester.run_all_tests()
        
        # Save test results
        with open('/app/test_reports/backend_activity_test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.utcnow().isoformat(),
                'success': success,
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'results': tester.test_results,
                'task_id': tester.test_task_id,
                'functionality_status': 'WORKING' if success else 'ISSUES_FOUND'
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())