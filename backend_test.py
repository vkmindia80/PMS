#!/usr/bin/env python3
"""
Backend API Testing for ProjectFilterContext Authentication Issue
Testing all authentication and project-related endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ProjectFilterAPITester:
    def __init__(self, base_url: str = "https://project-filter-fix-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.refresh_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    use_auth: bool = False, timeout: int = 10) -> tuple[bool, Dict]:
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            # Try to parse JSON response
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text, "status_code": response.status_code}
            
            return response.status_code < 400, response_data
            
        except requests.exceptions.Timeout:
            return False, {"error": "Request timeout", "timeout": timeout}
        except requests.exceptions.ConnectionError:
            return False, {"error": "Connection error - server may be down"}
        except requests.exceptions.RequestException as e:
            return False, {"error": f"Request failed: {str(e)}"}
        except Exception as e:
            return False, {"error": f"Unexpected error: {str(e)}"}

    def test_health_check(self):
        """Test API health endpoint"""
        success, response = self.make_request('GET', '/api/health')
        
        if success:
            status = response.get('status', 'unknown')
            details = f"Status: {status}, Services: {len(response.get('services', {}))}"
            self.log_test("Health Check", True, details, response)
        else:
            self.log_test("Health Check", False, "Health endpoint failed", response)
        
        return success

    def test_authentication(self):
        """Test authentication with demo credentials"""
        login_data = {
            "email": "demo@company.com",
            "password": "demo123456"
        }
        
        success, response = self.make_request('POST', '/api/auth/login', login_data)
        
        if success:
            # Extract tokens and user data
            tokens = response.get('tokens', {})
            self.token = tokens.get('access_token')
            self.refresh_token = tokens.get('refresh_token')
            self.user_data = response.get('user', {})
            
            if self.token:
                details = f"User: {self.user_data.get('email')}, Role: {self.user_data.get('role')}"
                self.log_test("Authentication Login", True, details)
                return True
            else:
                self.log_test("Authentication Login", False, "No access token in response", response)
                return False
        else:
            self.log_test("Authentication Login", False, "Login request failed", response)
            return False

    def test_user_profile(self):
        """Test getting current user profile"""
        if not self.token:
            self.log_test("User Profile", False, "No authentication token available")
            return False
        
        success, response = self.make_request('GET', '/api/auth/me', use_auth=True)
        
        if success:
            user_id = response.get('id')
            email = response.get('email')
            details = f"User ID: {user_id}, Email: {email}"
            self.log_test("User Profile", True, details)
        else:
            self.log_test("User Profile", False, "Failed to fetch user profile", response)
        
        return success

    def test_projects_list(self):
        """Test projects list endpoint - the main issue area"""
        if not self.token:
            self.log_test("Projects List", False, "No authentication token available")
            return False
        
        success, response = self.make_request('GET', '/api/projects', use_auth=True)
        
        if success:
            projects = response if isinstance(response, list) else []
            project_count = len(projects)
            
            if project_count > 0:
                sample_project = projects[0]
                project_id = sample_project.get('id', 'unknown')
                project_name = sample_project.get('name', 'unknown')
                details = f"Found {project_count} projects. Sample: {project_name} ({project_id})"
                self.log_test("Projects List", True, details, {"project_count": project_count, "sample_project": sample_project})
            else:
                self.log_test("Projects List", True, "No projects found (empty list)", {"project_count": 0})
        else:
            self.log_test("Projects List", False, "Failed to fetch projects list", response)
        
        return success

    def test_specific_project(self, project_id: str = None):
        """Test getting a specific project"""
        if not self.token:
            self.log_test("Specific Project", False, "No authentication token available")
            return False
        
        # If no project_id provided, try to get one from projects list
        if not project_id:
            success, response = self.make_request('GET', '/api/projects', use_auth=True)
            if success and isinstance(response, list) and len(response) > 0:
                project_id = response[0].get('id')
            else:
                self.log_test("Specific Project", False, "No project ID available for testing")
                return False
        
        success, response = self.make_request('GET', f'/api/projects/{project_id}', use_auth=True)
        
        if success:
            name = response.get('name', 'unknown')
            status = response.get('status', 'unknown')
            details = f"Project: {name}, Status: {status}, ID: {project_id}"
            self.log_test("Specific Project", True, details)
        else:
            self.log_test("Specific Project", False, f"Failed to fetch project {project_id}", response)
        
        return success

    def test_timeline_gantt(self, project_id: str = None):
        """Test timeline Gantt endpoint"""
        if not self.token:
            self.log_test("Timeline Gantt", False, "No authentication token available")
            return False
        
        # Get project ID if not provided
        if not project_id:
            success, response = self.make_request('GET', '/api/projects', use_auth=True)
            if success and isinstance(response, list) and len(response) > 0:
                project_id = response[0].get('id')
            else:
                self.log_test("Timeline Gantt", False, "No project ID available for testing")
                return False
        
        success, response = self.make_request('GET', f'/api/timeline/gantt/{project_id}', use_auth=True)
        
        if success:
            tasks = response.get('tasks', [])
            dependencies = response.get('dependencies', [])
            critical_path = response.get('critical_path', [])
            details = f"Tasks: {len(tasks)}, Dependencies: {len(dependencies)}, Critical Path: {len(critical_path)}"
            self.log_test("Timeline Gantt", True, details, {
                "task_count": len(tasks),
                "dependency_count": len(dependencies),
                "critical_path_count": len(critical_path)
            })
        else:
            self.log_test("Timeline Gantt", False, f"Failed to fetch timeline data for {project_id}", response)
        
        return success

    def test_token_refresh(self):
        """Test token refresh functionality"""
        if not self.refresh_token:
            self.log_test("Token Refresh", False, "No refresh token available")
            return False
        
        # Use the correct refresh endpoint format
        headers = {'Authorization': f'Bearer {self.refresh_token}', 'Content-Type': 'application/json'}
        
        try:
            response = requests.post(f"{self.base_url}/api/auth/refresh", headers=headers, timeout=10)
            
            if response.status_code < 400:
                try:
                    response_data = response.json()
                except:
                    response_data = {"raw_response": response.text}
                
                new_access_token = response_data.get('access_token')
                if new_access_token:
                    old_token = self.token[:10] + "..." if self.token else "None"
                    new_token = new_access_token[:10] + "..."
                    self.token = new_access_token  # Update token for subsequent tests
                    details = f"Token refreshed successfully. Old: {old_token}, New: {new_token}"
                    self.log_test("Token Refresh", True, details)
                    return True
                else:
                    self.log_test("Token Refresh", False, "No new access token in refresh response", response_data)
                    return False
            else:
                try:
                    error_data = response.json()
                except:
                    error_data = {"raw_response": response.text, "status_code": response.status_code}
                self.log_test("Token Refresh", False, "Token refresh failed", error_data)
                return False
                
        except Exception as e:
            self.log_test("Token Refresh", False, f"Token refresh exception: {str(e)}")
            return False

    def test_authentication_edge_cases(self):
        """Test authentication edge cases"""
        # Test with invalid token
        old_token = self.token
        self.token = "invalid_token_12345"
        
        success, response = self.make_request('GET', '/api/projects', use_auth=True)
        
        if not success:
            self.log_test("Invalid Token Handling", True, "Correctly rejected invalid token")
        else:
            self.log_test("Invalid Token Handling", False, "Invalid token was accepted", response)
        
        # Restore valid token
        self.token = old_token
        
        # Test without token
        success, response = self.make_request('GET', '/api/projects', use_auth=False)
        
        if not success:
            self.log_test("No Token Handling", True, "Correctly rejected request without token")
        else:
            self.log_test("No Token Handling", False, "Request without token was accepted", response)

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🔍 Starting Comprehensive Backend API Testing")
        print("=" * 60)
        print()
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("Authentication", self.test_authentication),
            ("User Profile", self.test_user_profile),
            ("Projects List", self.test_projects_list),
            ("Specific Project", self.test_specific_project),
            ("Timeline Gantt", self.test_timeline_gantt),
            ("Token Refresh", self.test_token_refresh),
            ("Authentication Edge Cases", self.test_authentication_edge_cases),
        ]
        
        for test_name, test_func in tests:
            print(f"🧪 Running {test_name}...")
            try:
                test_func()
            except Exception as e:
                self.log_test(test_name, False, f"Test execution error: {str(e)}")
            print()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        print()
        
        # Failed tests details
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['details']}")
        else:
            print("✅ All tests passed!")
        
        print()
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    print("🚀 Backend API Testing for ProjectFilterContext Authentication Issue")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tester = ProjectFilterAPITester()
    success = tester.run_comprehensive_test()
    
    # Save detailed results
    results_file = f"/app/backend_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                "test_timestamp": datetime.now().isoformat()
            },
            "detailed_results": tester.test_results,
            "authentication_data": {
                "has_access_token": bool(tester.token),
                "has_refresh_token": bool(tester.refresh_token),
                "user_email": tester.user_data.get('email') if tester.user_data else None,
                "user_role": tester.user_data.get('role') if tester.user_data else None
            }
        }, f, indent=2)
    
    print(f"📄 Detailed results saved to: {results_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())