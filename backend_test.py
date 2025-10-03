#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Dynamic Timeline Dashboard
Tests authentication, timeline APIs, and real-time statistics
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class DynamicTimelineAPITester:
    def __init__(self, base_url: str = "https://enterprise-roadmap-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.demo_project_id = None

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        self.log(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}")
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    self.log(f"   Response: {response.text[:200]}...")

            try:
                response_data = response.json() if response.text else {}
            except json.JSONDecodeError:
                response_data = {"raw_response": response.text}

            return success, response_data

        except requests.exceptions.Timeout:
            self.log(f"❌ FAILED - Request timeout after 30 seconds")
            return False, {"error": "timeout"}
        except requests.exceptions.ConnectionError as e:
            self.log(f"❌ FAILED - Connection error: {str(e)}")
            return False, {"error": "connection_error", "details": str(e)}
        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}")
            return False, {"error": str(e)}

    def test_health_check(self) -> bool:
        """Test API health endpoint"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "/api/health",
            200
        )
        
        if success and response.get("status") == "healthy":
            self.log("✅ API is healthy and database is connected")
            return True
        else:
            self.log("⚠️ API health check failed or database issues detected")
            return False

    def test_demo_login(self) -> bool:
        """Test login with demo credentials"""
        demo_credentials = {
            "email": "demo@company.com",
            "password": "demo123456"
        }
        
        success, response = self.run_test(
            "Demo User Login",
            "POST",
            "/api/auth/login",
            200,
            data=demo_credentials
        )
        
        if success and 'tokens' in response and 'user' in response:
            self.token = response['tokens']['access_token']
            self.user_data = response['user']
            self.log(f"✅ Login successful for user: {self.user_data.get('email')}")
            self.log(f"   User role: {self.user_data.get('role')}")
            self.log(f"   Organization: {self.user_data.get('organization_id')}")
            return True
        else:
            self.log("❌ Login failed - no tokens or user data received")
            return False

    def test_user_profile(self) -> bool:
        """Test fetching user profile"""
        if not self.token:
            self.log("❌ Cannot test user profile - no authentication token")
            return False
            
        success, response = self.run_test(
            "User Profile Fetch",
            "GET",
            "/api/auth/me",
            200
        )
        
        if success and response.get('email'):
            self.log(f"✅ User profile retrieved: {response.get('email')}")
            return True
        else:
            self.log("❌ Failed to retrieve user profile")
            return False

    def test_projects_list(self) -> bool:
        """Test fetching projects list"""
        if not self.token:
            self.log("❌ Cannot test projects - no authentication token")
            return False
            
        success, response = self.run_test(
            "Projects List",
            "GET",
            "/api/projects",
            200
        )
        
        if success:
            # Handle both list and dict responses
            if isinstance(response, list):
                projects = response
            else:
                projects = response.get('projects', [])
                
            self.log(f"✅ Projects retrieved: {len(projects)} projects found")
            
            # Store first project ID for timeline testing
            if projects and len(projects) > 0:
                first_project = projects[0]
                if isinstance(first_project, dict):
                    self.demo_project_id = first_project.get('id')
                    self.log(f"   Using project for timeline tests: {self.demo_project_id}")
            
            return True
        else:
            self.log("❌ Failed to retrieve projects list")
            return False

    def test_timeline_stats_overall(self) -> bool:
        """Test overall timeline statistics"""
        if not self.token:
            self.log("❌ Cannot test timeline stats - no authentication token")
            return False
            
        success, response = self.run_test(
            "Overall Timeline Statistics",
            "GET",
            "/api/dynamic-timeline/stats/all/realtime",
            200
        )
        
        if success:
            stats = response
            self.log(f"✅ Overall timeline stats retrieved:")
            self.log(f"   Total tasks: {stats.get('total_tasks', 0)}")
            self.log(f"   Completed tasks: {stats.get('completed_tasks', 0)}")
            self.log(f"   In progress: {stats.get('in_progress_tasks', 0)}")
            self.log(f"   Overdue: {stats.get('overdue_tasks', 0)}")
            self.log(f"   Health score: {stats.get('timeline_health_score', 0)}")
            return True
        else:
            self.log("❌ Failed to retrieve overall timeline statistics")
            return False

    def test_timeline_stats_project(self) -> bool:
        """Test project-specific timeline statistics"""
        if not self.token:
            self.log("❌ Cannot test project timeline stats - no authentication token")
            return False
            
        if not self.demo_project_id:
            self.log("⚠️ No project ID available, testing with 'all' parameter")
            project_id = "all"
        else:
            project_id = self.demo_project_id
            
        success, response = self.run_test(
            f"Project Timeline Statistics ({project_id})",
            "GET",
            f"/api/dynamic-timeline/stats/{project_id}/realtime",
            200
        )
        
        if success:
            stats = response
            self.log(f"✅ Project timeline stats retrieved:")
            self.log(f"   Total tasks: {stats.get('total_tasks', 0)}")
            self.log(f"   Completed: {stats.get('completed_tasks', 0)}")
            self.log(f"   Resource utilization: {stats.get('resource_utilization', 0)}%")
            self.log(f"   Estimated completion: {stats.get('estimated_completion', 'N/A')}")
            return True
        else:
            self.log("❌ Failed to retrieve project timeline statistics")
            return False

    def test_gantt_data(self) -> bool:
        """Test Gantt chart data retrieval"""
        if not self.token:
            self.log("❌ Cannot test Gantt data - no authentication token")
            return False
            
        if not self.demo_project_id:
            self.log("⚠️ No project ID available, skipping Gantt data test")
            return False
            
        success, response = self.run_test(
            f"Gantt Chart Data ({self.demo_project_id})",
            "GET",
            f"/api/dynamic-timeline/gantt/{self.demo_project_id}/enhanced",
            200
        )
        
        if success:
            tasks = response.get('tasks', [])
            dependencies = response.get('dependencies', [])
            conflicts = response.get('conflicts', [])
            
            self.log(f"✅ Gantt chart data retrieved:")
            self.log(f"   Tasks: {len(tasks)}")
            self.log(f"   Dependencies: {len(dependencies)}")
            self.log(f"   Conflicts detected: {len(conflicts)}")
            
            return True
        else:
            self.log("❌ Failed to retrieve Gantt chart data")
            return False

    def test_tasks_list(self) -> bool:
        """Test tasks list retrieval"""
        if not self.token:
            self.log("❌ Cannot test tasks - no authentication token")
            return False
            
        success, response = self.run_test(
            "Tasks List",
            "GET",
            "/api/tasks",
            200
        )
        
        if success:
            tasks = response.get('tasks', [])
            self.log(f"✅ Tasks retrieved: {len(tasks)} tasks found")
            return True
        else:
            self.log("❌ Failed to retrieve tasks list")
            return False

    def test_analytics_dashboard(self) -> bool:
        """Test analytics dashboard data"""
        if not self.token:
            self.log("❌ Cannot test analytics - no authentication token")
            return False
            
        success, response = self.run_test(
            "Analytics Dashboard Summary",
            "GET",
            "/api/analytics/dashboard/summary",
            200
        )
        
        if success:
            self.log("✅ Analytics dashboard data retrieved")
            if 'tasks' in response:
                tasks_data = response['tasks']
                self.log(f"   Tasks summary: {tasks_data}")
            return True
        else:
            self.log("❌ Failed to retrieve analytics dashboard data")
            return False

    def test_cors_preflight(self) -> bool:
        """Test CORS preflight request"""
        try:
            response = requests.options(
                f"{self.base_url}/api/auth/login",
                headers={
                    'Origin': 'https://enterprise-roadmap-1.preview.emergentagent.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type,Authorization'
                },
                timeout=10
            )
            
            if response.status_code in [200, 204]:
                self.log("✅ CORS preflight request successful")
                cors_headers = {
                    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                    'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
                }
                self.log(f"   CORS headers: {cors_headers}")
                return True
            else:
                self.log(f"❌ CORS preflight failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ CORS preflight test failed: {str(e)}")
            return False

    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all tests and return comprehensive results"""
        self.log("🚀 Starting Comprehensive Dynamic Timeline API Testing")
        self.log(f"   Base URL: {self.base_url}")
        self.log(f"   Test time: {datetime.now().isoformat()}")
        
        test_results = {
            "test_summary": {
                "start_time": datetime.now().isoformat(),
                "base_url": self.base_url
            },
            "test_results": {},
            "critical_issues": [],
            "authentication": {"status": "unknown"},
            "api_endpoints": {"working": [], "failing": []},
            "timeline_functionality": {"status": "unknown"}
        }
        
        # Test sequence
        tests = [
            ("health_check", self.test_health_check),
            ("cors_preflight", self.test_cors_preflight),
            ("demo_login", self.test_demo_login),
            ("user_profile", self.test_user_profile),
            ("projects_list", self.test_projects_list),
            ("timeline_stats_overall", self.test_timeline_stats_overall),
            ("timeline_stats_project", self.test_timeline_stats_project),
            ("gantt_data", self.test_gantt_data),
            ("tasks_list", self.test_tasks_list),
            ("analytics_dashboard", self.test_analytics_dashboard)
        ]
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                test_results["test_results"][test_name] = {
                    "passed": result,
                    "timestamp": datetime.now().isoformat()
                }
                
                if result:
                    test_results["api_endpoints"]["working"].append(test_name)
                else:
                    test_results["api_endpoints"]["failing"].append(test_name)
                    
                    # Mark critical issues
                    if test_name in ["health_check", "demo_login"]:
                        test_results["critical_issues"].append({
                            "test": test_name,
                            "issue": "Critical functionality not working",
                            "impact": "High - blocks main functionality"
                        })
                        
            except Exception as e:
                self.log(f"❌ Test {test_name} crashed: {str(e)}")
                test_results["test_results"][test_name] = {
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                test_results["api_endpoints"]["failing"].append(test_name)
        
        # Determine authentication status
        if test_results["test_results"].get("demo_login", {}).get("passed"):
            test_results["authentication"]["status"] = "working"
            test_results["authentication"]["credentials"] = "demo@company.com / demo123456"
        else:
            test_results["authentication"]["status"] = "failing"
            test_results["critical_issues"].append({
                "test": "authentication",
                "issue": "Cannot authenticate with demo credentials",
                "impact": "Critical - blocks all functionality"
            })
        
        # Determine timeline functionality status
        timeline_tests = ["timeline_stats_overall", "timeline_stats_project", "gantt_data"]
        timeline_working = sum(1 for test in timeline_tests 
                             if test_results["test_results"].get(test, {}).get("passed", False))
        
        if timeline_working >= 2:
            test_results["timeline_functionality"]["status"] = "working"
        elif timeline_working >= 1:
            test_results["timeline_functionality"]["status"] = "partial"
        else:
            test_results["timeline_functionality"]["status"] = "failing"
        
        # Final summary
        test_results["test_summary"].update({
            "end_time": datetime.now().isoformat(),
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "critical_issues_count": len(test_results["critical_issues"])
        })
        
        self.log("📊 Test Summary:")
        self.log(f"   Total tests: {self.tests_run}")
        self.log(f"   Passed: {self.tests_passed}")
        self.log(f"   Success rate: {test_results['test_summary']['success_rate']}")
        self.log(f"   Critical issues: {len(test_results['critical_issues'])}")
        
        if test_results["authentication"]["status"] == "working":
            self.log("✅ Authentication is working correctly")
        else:
            self.log("❌ Authentication is failing")
            
        if test_results["timeline_functionality"]["status"] == "working":
            self.log("✅ Timeline functionality is working correctly")
        elif test_results["timeline_functionality"]["status"] == "partial":
            self.log("⚠️ Timeline functionality is partially working")
        else:
            self.log("❌ Timeline functionality is failing")
        
        return test_results

def main():
    """Main test execution"""
    print("=" * 80)
    print("Dynamic Timeline Dashboard - Backend API Testing")
    print("=" * 80)
    
    # Initialize tester with the public endpoint
    tester = DynamicTimelineAPITester()
    
    # Run comprehensive tests
    results = tester.run_comprehensive_test()
    
    # Save results to file
    results_file = f"/app/backend_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n📄 Detailed results saved to: {results_file}")
    except Exception as e:
        print(f"⚠️ Could not save results file: {e}")
    
    # Return appropriate exit code
    if results["authentication"]["status"] == "working" and \
       results["timeline_functionality"]["status"] in ["working", "partial"] and \
       len(results["critical_issues"]) == 0:
        print("\n🎉 Backend testing completed successfully!")
        return 0
    else:
        print(f"\n⚠️ Backend testing completed with issues:")
        for issue in results["critical_issues"]:
            print(f"   - {issue['test']}: {issue['issue']}")
        return 1

if __name__ == "__main__":
    sys.exit(main())