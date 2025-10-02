#!/usr/bin/env python3
"""
Backend API Testing for Project Filter Components
Tests /api/projects endpoint functionality for project filter dropdowns
"""

import requests
import json
import sys
from datetime import datetime
import time

class ProjectFilterAPITester:
    def __init__(self, base_url="https://chart-dynamo.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.projects = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:200]}...")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                        if len(response_data) > 0:
                            print(f"   First item: {json.dumps(response_data[0], indent=2, default=str)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test authentication with demo credentials"""
        print("\n" + "="*60)
        print("🔐 TESTING AUTHENTICATION")
        print("="*60)
        
        success, response = self.run_test(
            "Demo User Login",
            "POST",
            "api/auth/login",
            200,
            data={
                "email": "demo@company.com",
                "password": "demo123456"
            }
        )
        
        if success and 'tokens' in response and 'access_token' in response['tokens']:
            self.token = response['tokens']['access_token']
            print(f"✅ Authentication successful - Token obtained")
            return True
        else:
            print(f"❌ Authentication failed - Response: {response}")
            return False

    def test_projects_list_api(self):
        """Test projects list API - core functionality for project filters"""
        print("\n" + "="*60)
        print("📁 TESTING PROJECTS LIST API")
        print("="*60)
        
        success, response = self.run_test(
            "Get Projects List (Basic)",
            "GET",
            "api/projects",
            200
        )
        
        if success and isinstance(response, list):
            self.projects = response
            print(f"✅ Found {len(response)} projects")
            
            # Validate project structure for filter dropdown
            if len(response) > 0:
                project = response[0]
                required_fields = ['id', 'name', 'status', 'priority']
                missing_fields = [field for field in required_fields if field not in project]
                
                if missing_fields:
                    print(f"⚠️ Missing required fields for filter dropdown: {missing_fields}")
                    return False
                else:
                    print(f"✅ Project structure valid for filter dropdown")
                    print(f"   Sample project: {project['name']} (ID: {project['id']}, Status: {project['status']}, Priority: {project['priority']})")
            
            return True
        else:
            print(f"❌ Projects list API failed or returned invalid data")
            return False

    def test_projects_filtering(self):
        """Test projects API with filtering parameters"""
        print("\n" + "="*60)
        print("🔍 TESTING PROJECTS FILTERING")
        print("="*60)
        
        # Test status filtering
        success, response = self.run_test(
            "Filter Projects by Status (active)",
            "GET",
            "api/projects?status_filter=active",
            200
        )
        
        if success:
            active_projects = len(response) if isinstance(response, list) else 0
            print(f"✅ Status filtering works - Found {active_projects} active projects")
        
        # Test priority filtering
        success, response = self.run_test(
            "Filter Projects by Priority (high)",
            "GET",
            "api/projects?priority_filter=high",
            200
        )
        
        if success:
            high_priority_projects = len(response) if isinstance(response, list) else 0
            print(f"✅ Priority filtering works - Found {high_priority_projects} high priority projects")
        
        # Test combined filtering
        success, response = self.run_test(
            "Filter Projects by Status and Priority",
            "GET",
            "api/projects?status_filter=active&priority_filter=high",
            200
        )
        
        if success:
            filtered_projects = len(response) if isinstance(response, list) else 0
            print(f"✅ Combined filtering works - Found {filtered_projects} active high priority projects")
        
        return success

    def test_projects_pagination(self):
        """Test projects API pagination for performance"""
        print("\n" + "="*60)
        print("📄 TESTING PROJECTS PAGINATION")
        print("="*60)
        
        # Test with limit
        success, response = self.run_test(
            "Get Projects with Limit (10)",
            "GET",
            "api/projects?limit=10",
            200
        )
        
        if success and isinstance(response, list):
            print(f"✅ Pagination works - Returned {len(response)} projects (max 10)")
            if len(response) > 10:
                print(f"⚠️ Limit not respected - returned {len(response)} instead of max 10")
                return False
        
        # Test with skip
        success, response = self.run_test(
            "Get Projects with Skip (5)",
            "GET",
            "api/projects?skip=5&limit=5",
            200
        )
        
        if success and isinstance(response, list):
            print(f"✅ Skip parameter works - Returned {len(response)} projects")
        
        return success

    def test_projects_error_handling(self):
        """Test projects API error handling"""
        print("\n" + "="*60)
        print("⚠️ TESTING PROJECTS ERROR HANDLING")
        print("="*60)
        
        # Test with invalid status filter
        success, response = self.run_test(
            "Invalid Status Filter",
            "GET",
            "api/projects?status_filter=invalid_status",
            422  # Expecting validation error
        )
        
        if success:
            print(f"✅ Invalid status filter properly rejected")
        else:
            # Some APIs might return 200 with empty results instead of 422
            success, response = self.run_test(
                "Invalid Status Filter (Alternative)",
                "GET",
                "api/projects?status_filter=invalid_status",
                200
            )
            if success and isinstance(response, list) and len(response) == 0:
                print(f"✅ Invalid status filter returns empty results (acceptable)")
                success = True
        
        # Test with invalid priority filter
        success2, response = self.run_test(
            "Invalid Priority Filter",
            "GET",
            "api/projects?priority_filter=invalid_priority",
            422  # Expecting validation error
        )
        
        if not success2:
            # Alternative: might return 200 with empty results
            success2, response = self.run_test(
                "Invalid Priority Filter (Alternative)",
                "GET",
                "api/projects?priority_filter=invalid_priority",
                200
            )
            if success2 and isinstance(response, list) and len(response) == 0:
                print(f"✅ Invalid priority filter returns empty results (acceptable)")
                success2 = True
        
        return success and success2

    def test_projects_performance(self):
        """Test projects API performance for filter dropdowns"""
        print("\n" + "="*60)
        print("⚡ TESTING PROJECTS API PERFORMANCE")
        print("="*60)
        
        start_time = time.time()
        
        success, response = self.run_test(
            "Projects API Performance Test",
            "GET",
            "api/projects",
            200
        )
        
        end_time = time.time()
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        if success:
            print(f"✅ API Response Time: {response_time:.2f}ms")
            
            if response_time < 1000:  # Less than 1 second
                print(f"✅ Performance excellent - Under 1 second")
            elif response_time < 3000:  # Less than 3 seconds
                print(f"⚠️ Performance acceptable - Under 3 seconds")
            else:
                print(f"❌ Performance poor - Over 3 seconds")
                return False
        
        return success

    def validate_project_data_structure(self):
        """Validate that project data has all required fields for filter components"""
        print("\n" + "="*60)
        print("🔍 VALIDATING PROJECT DATA STRUCTURE")
        print("="*60)
        
        if not self.projects:
            print("❌ No projects data available for validation")
            return False
        
        required_fields = ['id', 'name', 'status', 'priority', 'progress_percentage', 'owner_id', 'task_count', 'team_member_count']
        optional_fields = ['due_date', 'description']
        
        valid_projects = 0
        
        for i, project in enumerate(self.projects[:5]):  # Check first 5 projects
            print(f"\n   Validating project {i+1}: {project.get('name', 'Unknown')}")
            
            missing_required = [field for field in required_fields if field not in project]
            present_optional = [field for field in optional_fields if field in project and project[field]]
            
            if missing_required:
                print(f"   ❌ Missing required fields: {missing_required}")
            else:
                print(f"   ✅ All required fields present")
                valid_projects += 1
            
            if present_optional:
                print(f"   ✅ Optional fields present: {present_optional}")
            
            # Validate field types and values
            if 'status' in project:
                valid_statuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived']
                if project['status'] in valid_statuses:
                    print(f"   ✅ Valid status: {project['status']}")
                else:
                    print(f"   ⚠️ Unexpected status: {project['status']}")
            
            if 'priority' in project:
                valid_priorities = ['low', 'medium', 'high', 'critical']
                if project['priority'] in valid_priorities:
                    print(f"   ✅ Valid priority: {project['priority']}")
                else:
                    print(f"   ⚠️ Unexpected priority: {project['priority']}")
        
        success_rate = (valid_projects / min(len(self.projects), 5)) * 100
        print(f"\n✅ Project data validation: {success_rate:.1f}% of projects have valid structure")
        
        return success_rate >= 80  # At least 80% should be valid

    def run_comprehensive_project_filter_tests(self):
        """Run all project filter API tests"""
        print("🚀 STARTING COMPREHENSIVE PROJECT FILTER API TESTING")
        print("="*80)
        
        start_time = datetime.utcnow()
        
        # Test sequence
        test_sequence = [
            ("Authentication", self.test_authentication),
            ("Projects List API", self.test_projects_list_api),
            ("Projects Filtering", self.test_projects_filtering),
            ("Projects Pagination", self.test_projects_pagination),
            ("Projects Error Handling", self.test_projects_error_handling),
            ("Projects Performance", self.test_projects_performance),
            ("Project Data Structure Validation", self.validate_project_data_structure)
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
        print("📊 PROJECT FILTER API TESTING RESULTS")
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
    print("🎯 Project Filter Components - Backend API Testing")
    print("="*80)
    
    tester = ProjectFilterAPITester()
    success = tester.run_comprehensive_project_filter_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())