#!/usr/bin/env python3
"""
Backend API Testing for Task Activity Timeline
Testing activity metrics, auto-refresh, and activity list functionality
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class TaskActivityTester:
    def __init__(self, base_url: str = "https://task-activity-auto.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_task_id = "efd610ef-7dae-4168-ae7c-a7cc11acfb1b"  # Specific task ID from request
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

    def test_get_task(self):
        """Get the specific test task"""
        print("\n" + "="*60)
        print("TESTING TASK RETRIEVAL")
        print("="*60)
        
        print(f"    🎯 Testing specific task ID: {self.test_task_id}")
        
        # Verify the task exists
        success, response = self.run_test(
            "Get Task Details",
            "GET",
            f"/api/tasks/{self.test_task_id}",
            200
        )
        
        if success and 'id' in response:
            print(f"    ✅ Task verified - Title: {response.get('title', 'Unknown')}")
            print(f"    ✅ Task Status: {response.get('status', 'Unknown')}")
            return True
        else:
            print(f"    ❌ Task verification failed")
            return False

    def test_activity_metrics(self):
        """Test activity metrics endpoint - KEY FUNCTIONALITY"""
        print("\n" + "="*60)
        print("TESTING ACTIVITY METRICS ENDPOINT")
        print("="*60)
        
        success, response = self.run_test(
            "Get Activity Metrics",
            "GET",
            f"/api/tasks/{self.test_task_id}/activity/metrics",
            200
        )
        
        if success and 'metrics' in response:
            metrics = response['metrics']
            print(f"    ✅ Metrics retrieved successfully")
            print(f"    📊 Total Events: {metrics.get('total_events', 0)}")
            print(f"    📊 Time Entries: {metrics.get('time_entries', 0)}")
            print(f"    📊 Updates: {metrics.get('updates', 0)}")
            print(f"    📊 Active Days: {metrics.get('active_days', 0)}")
            
            # Verify expected metrics from main agent's note
            expected_total = 11
            expected_time_entries = 4
            expected_updates = 6
            expected_active_days = 1
            
            actual_total = metrics.get('total_events', 0)
            actual_time_entries = metrics.get('time_entries', 0)
            actual_updates = metrics.get('updates', 0)
            actual_active_days = metrics.get('active_days', 0)
            
            print(f"\n    🎯 EXPECTED vs ACTUAL:")
            print(f"    Total Events: {expected_total} vs {actual_total} {'✅' if actual_total == expected_total else '❌'}")
            print(f"    Time Entries: {expected_time_entries} vs {actual_time_entries} {'✅' if actual_time_entries == expected_time_entries else '❌'}")
            print(f"    Updates: {expected_updates} vs {actual_updates} {'✅' if actual_updates == expected_updates else '❌'}")
            print(f"    Active Days: {expected_active_days} vs {actual_active_days} {'✅' if actual_active_days == expected_active_days else '❌'}")
            
            return metrics
        else:
            print(f"    ❌ Failed to get activity metrics")
            return None

    def test_get_flat_comments(self):
        """Test getting flat comments for the task"""
        success, response = self.run_test(
            "Get Flat Comments",
            "GET",
            f"/api/comments/?entity_type=task&entity_id={self.test_task_id}",
            200
        )
        
        if success:
            comment_count = len(response) if isinstance(response, list) else 0
            print(f"    ✅ Retrieved {comment_count} flat comments")
            return response
        else:
            print(f"    ❌ Failed to get flat comments")
            return []

    def test_get_threaded_comments(self):
        """Test getting threaded comments for the task - THIS IS THE KEY TEST"""
        success, response = self.run_test(
            "Get Threaded Comments (Key Test)",
            "GET",
            f"/api/comments/threads/task/{self.test_task_id}",
            200
        )
        
        if success:
            thread_count = len(response) if isinstance(response, list) else 0
            print(f"    ✅ Retrieved {thread_count} comment threads")
            
            # Analyze thread structure in detail
            if isinstance(response, list):
                for i, thread in enumerate(response):
                    if isinstance(thread, dict):
                        root_comment = thread.get('root_comment', {})
                        replies = thread.get('replies', [])
                        total_replies = thread.get('total_replies', 0)
                        nested_replies = root_comment.get('nested_replies', [])
                        
                        print(f"    Thread {i+1}:")
                        print(f"      Root: '{root_comment.get('content', '')[:50]}...'")
                        print(f"      Replies: {len(replies)} (legacy)")
                        print(f"      Nested replies: {len(nested_replies)} (new)")
                        print(f"      Total replies: {total_replies}")
            
            return response
        else:
            print(f"    ❌ Failed to get threaded comments - THIS IS THE BUG!")
            return []

    def test_comment_workflow(self):
        """Test complete comment workflow"""
        print("\n" + "="*60)
        print("TESTING COMMENT WORKFLOW")
        print("="*60)
        
        if not self.test_task_id:
            print("❌ No test task available")
            return False
            
        # Create a root comment
        root_comment_id = self.test_create_comment(
            "🧪 TEST: Root comment for comment reply bug fix testing. This should appear in Discussion Timeline.",
            "comment"
        )
        
        if not root_comment_id:
            return False
            
        # Create a reply to the root comment
        reply_comment_id = self.test_create_comment(
            "🧪 TEST: This is a reply to the root comment. Threading should work correctly now.",
            "comment",
            parent_id=root_comment_id
        )
        
        if not reply_comment_id:
            return False
            
        # Create a nested reply
        nested_reply_id = self.test_create_comment(
            "🧪 TEST: Nested reply to test unlimited threading depth.",
            "comment", 
            parent_id=reply_comment_id
        )
        
        # Test different comment types
        note_id = self.test_create_comment(
            "🧪 TEST: Note type comment for internal tracking.",
            "note"
        )
        
        review_id = self.test_create_comment(
            "🧪 TEST: Review comment with feedback on the implementation.",
            "review"
        )
        
        return True

    def test_comment_retrieval(self):
        """Test comment retrieval after creation - CRITICAL TEST"""
        print("\n" + "="*60)
        print("TESTING COMMENT RETRIEVAL (CRITICAL)")
        print("="*60)
        
        # Test flat comments
        flat_comments = self.test_get_flat_comments()
        
        # Test threaded comments - THIS IS THE KEY TEST FOR THE BUG
        threaded_comments = self.test_get_threaded_comments()
        
        # Verify comments exist and are properly structured
        flat_count = len(flat_comments) if flat_comments else 0
        thread_count = len(threaded_comments) if threaded_comments else 0
        
        print(f"\n📊 COMMENT RETRIEVAL ANALYSIS:")
        print(f"    Flat comments retrieved: {flat_count}")
        print(f"    Comment threads retrieved: {thread_count}")
        
        if flat_count > 0 and thread_count > 0:
            print(f"    ✅ Comments successfully created and retrieved")
            
            # Check if threaded structure is correct
            total_nested_comments = 0
            for thread in threaded_comments:
                if isinstance(thread, dict):
                    root_comment = thread.get('root_comment', {})
                    nested_replies = root_comment.get('nested_replies', [])
                    total_nested_comments += len(nested_replies)
            
            print(f"    Nested replies in threads: {total_nested_comments}")
            
            if total_nested_comments > 0:
                print(f"    ✅ Threading structure is working correctly")
                return True
            else:
                print(f"    ⚠️ No nested replies found - threading may have issues")
                return False
        else:
            print(f"    ❌ Comments not found after creation - THIS IS THE BUG!")
            return False

    def run_all_tests(self):
        """Run all comment API tests"""
        print("🚀 Starting Comment Reply Bug Testing")
        print("="*80)
        
        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False
            
        # Get test task
        if not self.test_get_tasks():
            print("❌ No tasks available, stopping tests")
            return False
            
        # Test comment workflow
        if not self.test_comment_workflow():
            print("❌ Comment workflow failed")
            return False
            
        # Test comment retrieval - CRITICAL TEST
        retrieval_success = self.test_comment_retrieval()
        
        # Print summary
        print("\n" + "="*80)
        print("COMMENT REPLY BUG TEST SUMMARY")
        print("="*80)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if retrieval_success:
            print("🎉 Comment threading appears to be working!")
            print("✅ Comments should now display in Discussion Timeline")
        else:
            print("❌ Comment threading has issues")
            print("🐛 Comments may not display properly in Discussion Timeline")
        
        return retrieval_success

def main():
    """Main test execution"""
    tester = CommentReplyBugTester()
    
    try:
        success = tester.run_all_tests()
        
        # Save test results
        with open('/app/test_reports/backend_comment_test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.utcnow().isoformat(),
                'success': success,
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'results': tester.test_results,
                'bug_status': 'FIXED' if success else 'STILL_EXISTS'
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())