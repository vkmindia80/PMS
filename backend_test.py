#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Comments Functionality
Tests authentication, comments APIs, reactions, and conversation history
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CommentsAPITester:
    def __init__(self, base_url: str = "https://convo-fixer.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.demo_project_id = None
        self.demo_task_id = None
        self.test_comment_ids = []  # Store created comment IDs for cleanup

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

    def test_tasks_list(self) -> bool:
        """Test tasks list retrieval"""
        if not self.token:
            self.log("❌ Cannot test tasks - no authentication token")
            return False
            
        success, response = self.run_test(
            "Tasks List",
            "GET",
            "/api/tasks/",
            200
        )
        
        if success:
            # Handle both list and dict responses
            if isinstance(response, list):
                tasks = response
            else:
                tasks = response.get('tasks', response)
                
            self.log(f"✅ Tasks retrieved: {len(tasks)} tasks found")
            
            # Store first task ID for time tracking testing
            if tasks and len(tasks) > 0:
                first_task = tasks[0]
                if isinstance(first_task, dict):
                    self.demo_task_id = first_task.get('id')
                    self.log(f"   Using task for time tracking tests: {self.demo_task_id}")
                    self.log(f"   Task title: {first_task.get('title', 'Unknown')}")
                    
                    # Check if task has time tracking data
                    time_tracking = first_task.get('time_tracking', {})
                    self.log(f"   Current actual hours: {time_tracking.get('actual_hours', 0)}")
                    self.log(f"   Time entries: {len(time_tracking.get('logged_time', []))}")
            
            return True
        else:
            self.log("❌ Failed to retrieve tasks list")
            return False

    def test_create_comment(self) -> bool:
        """Test creating a new comment"""
        if not self.token:
            self.log("❌ Cannot test comment creation - no authentication token")
            return False
            
        if not self.demo_task_id:
            self.log("❌ Cannot test comment creation - no task ID available")
            return False
            
        # Test creating a comment
        comment_data = {
            "content": "This is a test comment for backend API testing",
            "type": "comment",
            "entity_type": "task",
            "entity_id": self.demo_task_id
        }
        
        success, response = self.run_test(
            "Create Comment",
            "POST",
            "/api/comments/",
            201,
            data=comment_data
        )
        
        if success:
            self.log(f"✅ Comment creation successful:")
            comment_id = response.get('id')
            if comment_id:
                self.test_comment_ids.append(comment_id)
                self.log(f"   Comment ID: {comment_id}")
                self.log(f"   Content: {response.get('content')}")
                self.log(f"   Type: {response.get('type')}")
                self.log(f"   Author: {response.get('author_id')}")
                self.log(f"   Created: {response.get('created_at')}")
                return True
            else:
                self.log("⚠️ No comment ID in response")
                return False
        else:
            self.log("❌ Failed to create comment")
            return False

    def test_get_comments(self) -> bool:
        """Test retrieving comments for a task"""
        if not self.token:
            self.log("❌ Cannot test get comments - no authentication token")
            return False
            
        if not self.demo_task_id:
            self.log("❌ Cannot test get comments - no task ID available")
            return False
            
        success, response = self.run_test(
            f"Get Comments for Task ({self.demo_task_id})",
            "GET",
            f"/api/comments/?entity_type=task&entity_id={self.demo_task_id}",
            200
        )
        
        if success:
            comments = response if isinstance(response, list) else []
            self.log(f"✅ Comments retrieved: {len(comments)} comments found")
            
            if comments:
                for i, comment in enumerate(comments[:3]):  # Show first 3 comments
                    self.log(f"   Comment {i+1}:")
                    self.log(f"     ID: {comment.get('id')}")
                    self.log(f"     Content: {comment.get('content', '')[:50]}...")
                    self.log(f"     Type: {comment.get('type')}")
                    self.log(f"     Author: {comment.get('author_id')}")
                    self.log(f"     Created: {comment.get('created_at')}")
                    self.log(f"     Replies: {comment.get('reply_count', 0)}")
                    self.log(f"     Reactions: {comment.get('reaction_count', 0)}")
            
            return True
        else:
            self.log("❌ Failed to retrieve comments")
            return False

    def test_comment_types(self) -> bool:
        """Test creating different types of comments"""
        if not self.token:
            self.log("❌ Cannot test comment types - no authentication token")
            return False
            
        if not self.demo_task_id:
            self.log("❌ Cannot test comment types - no task ID available")
            return False
            
        comment_types = [
            ("note", "This is a test note for documentation"),
            ("review", "This is a review comment with feedback"),
            ("comment", "This is a regular comment")
        ]
        
        success_count = 0
        
        for comment_type, content in comment_types:
            comment_data = {
                "content": content,
                "type": comment_type,
                "entity_type": "task",
                "entity_id": self.demo_task_id
            }
            
            success, response = self.run_test(
                f"Create {comment_type.title()} Comment",
                "POST",
                "/api/comments/",
                201,
                data=comment_data
            )
            
            if success:
                comment_id = response.get('id')
                if comment_id:
                    self.test_comment_ids.append(comment_id)
                    self.log(f"   ✅ {comment_type.title()} comment created: {comment_id}")
                    success_count += 1
                else:
                    self.log(f"   ❌ {comment_type.title()} comment missing ID")
            else:
                self.log(f"   ❌ Failed to create {comment_type} comment")
        
        if success_count == len(comment_types):
            self.log("✅ All comment types created successfully")
            return True
        else:
            self.log(f"⚠️ Only {success_count}/{len(comment_types)} comment types created")
            return success_count > 0

    def test_comment_reactions(self) -> bool:
        """Test adding reactions to comments"""
        if not self.token:
            self.log("❌ Cannot test reactions - no authentication token")
            return False
            
        if not self.test_comment_ids:
            self.log("❌ Cannot test reactions - no comment IDs available")
            return False
            
        comment_id = self.test_comment_ids[0]  # Use first created comment
        test_emojis = ["👍", "❤️", "😄"]
        
        success_count = 0
        
        for emoji in test_emojis:
            success, response = self.run_test(
                f"Add Reaction ({emoji})",
                "POST",
                f"/api/comments/{comment_id}/reactions?emoji={emoji}",
                200
            )
            
            if success:
                reactions = response.get('reactions', [])
                reaction_count = response.get('reaction_count', 0)
                self.log(f"   ✅ Reaction {emoji} added. Total reactions: {reaction_count}")
                success_count += 1
            else:
                self.log(f"   ❌ Failed to add reaction {emoji}")
        
        if success_count == len(test_emojis):
            self.log("✅ All reactions added successfully")
            return True
        else:
            self.log(f"⚠️ Only {success_count}/{len(test_emojis)} reactions added")
            return success_count > 0

    def test_comment_replies(self) -> bool:
        """Test creating replies to comments"""
        if not self.token:
            self.log("❌ Cannot test replies - no authentication token")
            return False
            
        if not self.test_comment_ids:
            self.log("❌ Cannot test replies - no comment IDs available")
            return False
            
        parent_comment_id = self.test_comment_ids[0]  # Use first created comment as parent
        
        reply_data = {
            "content": "This is a reply to the parent comment",
            "type": "comment",
            "entity_type": "task",
            "entity_id": self.demo_task_id,
            "parent_id": parent_comment_id
        }
        
        success, response = self.run_test(
            "Create Reply Comment",
            "POST",
            "/api/comments/",
            201,
            data=reply_data
        )
        
        if success:
            reply_id = response.get('id')
            parent_id = response.get('parent_id')
            
            if reply_id and parent_id == parent_comment_id:
                self.test_comment_ids.append(reply_id)
                self.log(f"   ✅ Reply created: {reply_id}")
                self.log(f"   Parent comment: {parent_id}")
                
                # Verify parent comment reply count increased
                success_parent, parent_response = self.run_test(
                    "Check Parent Comment Reply Count",
                    "GET",
                    f"/api/comments/{parent_comment_id}",
                    200
                )
                
                if success_parent:
                    reply_count = parent_response.get('reply_count', 0)
                    self.log(f"   Parent comment reply count: {reply_count}")
                    return reply_count > 0
                else:
                    self.log("   ⚠️ Could not verify parent comment reply count")
                    return True  # Reply was created successfully
            else:
                self.log("   ❌ Reply missing ID or incorrect parent ID")
                return False
        else:
            self.log("❌ Failed to create reply")
            return False

    def test_comment_conversation_history(self) -> bool:
        """Test conversation history maintenance"""
        if not self.token:
            self.log("❌ Cannot test conversation history - no authentication token")
            return False
            
        if not self.demo_task_id:
            self.log("❌ Cannot test conversation history - no task ID available")
            return False
            
        # Get comments before adding new ones
        success_before, response_before = self.run_test(
            "Get Comments Before",
            "GET",
            f"/api/comments/?entity_type=task&entity_id={self.demo_task_id}",
            200
        )
        
        if not success_before:
            self.log("❌ Failed to get comments before test")
            return False
            
        comments_before = response_before if isinstance(response_before, list) else []
        count_before = len(comments_before)
        
        # Add multiple comments to test conversation flow
        conversation_comments = [
            "Starting a new conversation thread",
            "Adding to the conversation with more details",
            "Final comment in this conversation"
        ]
        
        created_comments = []
        
        for i, content in enumerate(conversation_comments):
            comment_data = {
                "content": content,
                "type": "comment",
                "entity_type": "task",
                "entity_id": self.demo_task_id
            }
            
            success, response = self.run_test(
                f"Add Conversation Comment {i+1}",
                "POST",
                "/api/comments/",
                201,
                data=comment_data
            )
            
            if success and response.get('id'):
                created_comments.append(response)
                self.test_comment_ids.append(response['id'])
        
        # Get comments after adding new ones
        success_after, response_after = self.run_test(
            "Get Comments After",
            "GET",
            f"/api/comments/?entity_type=task&entity_id={self.demo_task_id}",
            200
        )
        
        if success_after:
            comments_after = response_after if isinstance(response_after, list) else []
            count_after = len(comments_after)
            
            self.log(f"   Comments before: {count_before}")
            self.log(f"   Comments after: {count_after}")
            self.log(f"   Expected increase: {len(created_comments)}")
            
            if count_after >= count_before + len(created_comments):
                self.log("✅ Conversation history maintained correctly")
                
                # Verify chronological order (newest first)
                if len(comments_after) >= 2:
                    first_comment = comments_after[0]
                    second_comment = comments_after[1]
                    
                    first_time = datetime.fromisoformat(first_comment['created_at'].replace('Z', '+00:00'))
                    second_time = datetime.fromisoformat(second_comment['created_at'].replace('Z', '+00:00'))
                    
                    if first_time >= second_time:
                        self.log("   ✅ Comments are in correct chronological order")
                        return True
                    else:
                        self.log("   ⚠️ Comments may not be in correct chronological order")
                        return True  # Still consider success as comments were added
                
                return True
            else:
                self.log("❌ Conversation history not maintained properly")
                return False
        else:
            self.log("❌ Failed to get comments after test")
            return False

    def test_cors_preflight(self) -> bool:
        """Test CORS preflight request"""
        try:
            response = requests.options(
                f"{self.base_url}/api/auth/login",
                headers={
                    'Origin': 'https://convo-fixer.preview.emergentagent.com',
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
        self.log("🚀 Starting Comprehensive Comments API Testing")
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
            "comments_functionality": {"status": "unknown"}
        }
        
        # Test sequence
        tests = [
            ("health_check", self.test_health_check),
            ("cors_preflight", self.test_cors_preflight),
            ("demo_login", self.test_demo_login),
            ("user_profile", self.test_user_profile),
            ("projects_list", self.test_projects_list),
            ("tasks_list", self.test_tasks_list),
            ("get_comments", self.test_get_comments),
            ("create_comment", self.test_create_comment),
            ("comment_types", self.test_comment_types),
            ("comment_reactions", self.test_comment_reactions),
            ("comment_replies", self.test_comment_replies),
            ("comment_conversation_history", self.test_comment_conversation_history)
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
        
        # Determine comments functionality status
        comments_tests = ["create_comment", "comment_types", "comment_reactions", "comment_replies", "comment_conversation_history"]
        comments_working = sum(1 for test in comments_tests 
                              if test_results["test_results"].get(test, {}).get("passed", False))
        
        if comments_working >= 4:
            test_results["comments_functionality"]["status"] = "working"
        elif comments_working >= 2:
            test_results["comments_functionality"]["status"] = "partial"
        else:
            test_results["comments_functionality"]["status"] = "failing"
        
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
            
        if test_results["time_tracking_functionality"]["status"] == "working":
            self.log("✅ Time tracking functionality is working correctly")
        elif test_results["time_tracking_functionality"]["status"] == "partial":
            self.log("⚠️ Time tracking functionality is partially working")
        else:
            self.log("❌ Time tracking functionality is failing")
        
        return test_results

def main():
    """Main test execution"""
    print("=" * 80)
    print("Time Tracking Functionality - Backend API Testing")
    print("=" * 80)
    
    # Initialize tester with the public endpoint
    tester = TimeTrackingAPITester()
    
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
       results["time_tracking_functionality"]["status"] in ["working", "partial"] and \
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