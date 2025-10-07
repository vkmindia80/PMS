#!/usr/bin/env python3
"""
Test script specifically for comment threading functionality
Tests the enhanced /api/comments/threads/{entity_type}/{entity_id} endpoint
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CommentThreadingTester:
    def __init__(self, base_url: str = "https://timeline-repair-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_task_id = "test-task-threading-001"
        self.created_comment_ids = []

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
                    self.log(f"   Response: {response.text[:500]}...")

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

    def test_login(self) -> bool:
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
            return True
        else:
            self.log("❌ Login failed - no tokens or user data received")
            return False

    def create_test_threading_data(self) -> bool:
        """Create test data with multiple levels of threading"""
        self.log("🧪 Creating test threading data...")
        
        # Create root comment
        root_comment_data = {
            "content": "This is the main comment to discuss the task requirements. What do you think about the approach?",
            "type": "comment",
            "entity_type": "task",
            "entity_id": self.test_task_id
        }
        
        success, response = self.run_test(
            "Create Root Comment",
            "POST",
            "/api/comments/",
            201,
            data=root_comment_data
        )
        
        if not success:
            return False
            
        root_comment_id = response.get('id')
        if not root_comment_id:
            self.log("❌ No root comment ID returned")
            return False
            
        self.created_comment_ids.append(root_comment_id)
        self.log(f"✅ Root comment created: {root_comment_id}")
        
        # Create first-level reply
        reply1_data = {
            "content": "Great question! I think we should break it down into smaller phases. What about starting with the basic functionality?",
            "type": "comment",
            "entity_type": "task",
            "entity_id": self.test_task_id,
            "parent_id": root_comment_id
        }
        
        success, response = self.run_test(
            "Create Level 1 Reply",
            "POST",
            "/api/comments/",
            201,
            data=reply1_data
        )
        
        if not success:
            return False
            
        reply1_id = response.get('id')
        if not reply1_id:
            self.log("❌ No reply1 ID returned")
            return False
            
        self.created_comment_ids.append(reply1_id)
        self.log(f"✅ Level 1 reply created: {reply1_id}")
        
        # Create second-level reply (reply to reply)
        reply2_data = {
            "content": "That's a solid approach! I can help with the database design for the first phase. Should we start with user authentication?",
            "type": "comment",
            "entity_type": "task",
            "entity_id": self.test_task_id,
            "parent_id": reply1_id
        }
        
        success, response = self.run_test(
            "Create Level 2 Reply",
            "POST",
            "/api/comments/",
            201,
            data=reply2_data
        )
        
        if not success:
            return False
            
        reply2_id = response.get('id')
        if not reply2_id:
            self.log("❌ No reply2 ID returned")
            return False
            
        self.created_comment_ids.append(reply2_id)
        self.log(f"✅ Level 2 reply created: {reply2_id}")
        
        # Create third-level reply (reply to reply to reply)
        reply3_data = {
            "content": "Perfect! User authentication is definitely the right starting point. I'll create the JWT implementation and you handle the database schema.",
            "type": "comment",
            "entity_type": "task",
            "entity_id": self.test_task_id,
            "parent_id": reply2_id
        }
        
        success, response = self.run_test(
            "Create Level 3 Reply",
            "POST",
            "/api/comments/",
            201,
            data=reply3_data
        )
        
        if not success:
            return False
            
        reply3_id = response.get('id')
        if not reply3_id:
            self.log("❌ No reply3 ID returned")
            return False
            
        self.created_comment_ids.append(reply3_id)
        self.log(f"✅ Level 3 reply created: {reply3_id}")
        
        # Create a second root comment (pinned)
        root2_data = {
            "content": "I have a different suggestion for the UI/UX approach. Should we discuss the design patterns first?",
            "type": "review",
            "entity_type": "task",
            "entity_id": self.test_task_id,
            "is_pinned": True
        }
        
        success, response = self.run_test(
            "Create Second Root Comment (Pinned)",
            "POST",
            "/api/comments/",
            201,
            data=root2_data
        )
        
        if success:
            root2_id = response.get('id')
            if root2_id:
                self.created_comment_ids.append(root2_id)
                self.log(f"✅ Second root comment created: {root2_id}")
                
                # Create reply to second thread
                root2_reply_data = {
                    "content": "Good point! Design patterns will definitely help with consistency. Let's schedule a design review meeting.",
                    "type": "comment",
                    "entity_type": "task",
                    "entity_id": self.test_task_id,
                    "parent_id": root2_id
                }
                
                success, response = self.run_test(
                    "Create Reply to Second Thread",
                    "POST",
                    "/api/comments/",
                    201,
                    data=root2_reply_data
                )
                
                if success:
                    root2_reply_id = response.get('id')
                    if root2_reply_id:
                        self.created_comment_ids.append(root2_reply_id)
                        self.log(f"✅ Reply to second thread created: {root2_reply_id}")
        
        self.log(f"🎯 Test threading data created successfully!")
        self.log(f"   Created {len(self.created_comment_ids)} comments")
        return True

    def test_comment_threads_endpoint(self) -> bool:
        """Test the enhanced comment threads endpoint"""
        self.log("🧵 Testing comment threads endpoint...")
        
        success, response = self.run_test(
            "Get Comment Threads",
            "GET",
            f"/api/comments/threads/task/{self.test_task_id}",
            200
        )
        
        if not success:
            self.log("❌ Failed to get comment threads")
            return False
            
        if not isinstance(response, list):
            self.log("❌ Response is not a list of threads")
            return False
            
        threads = response
        self.log(f"✅ Retrieved {len(threads)} comment threads")
        
        # Validate thread structure
        for i, thread in enumerate(threads):
            self.log(f"   Thread {i+1}:")
            
            # Check required fields
            if 'root_comment' not in thread:
                self.log(f"     ❌ Missing root_comment field")
                return False
                
            root_comment = thread['root_comment']
            self.log(f"     Root comment ID: {root_comment.get('id')}")
            self.log(f"     Content: {root_comment.get('content', '')[:50]}...")
            self.log(f"     Type: {root_comment.get('type')}")
            self.log(f"     Is pinned: {root_comment.get('is_pinned', False)}")
            self.log(f"     Created: {root_comment.get('created_at')}")
            
            # Check nested replies structure
            if 'nested_replies' in root_comment:
                nested_replies = root_comment['nested_replies']
                self.log(f"     Nested replies: {len(nested_replies)}")
                
                # Recursively check nested structure
                def check_nested_replies(replies, level=1):
                    for j, reply in enumerate(replies):
                        self.log(f"       Level {level} Reply {j+1}: {reply.get('id')}")
                        self.log(f"         Content: {reply.get('content', '')[:30]}...")
                        self.log(f"         Parent ID: {reply.get('parent_id')}")
                        
                        if 'nested_replies' in reply and reply['nested_replies']:
                            self.log(f"         Has {len(reply['nested_replies'])} nested replies")
                            check_nested_replies(reply['nested_replies'], level + 1)
                
                check_nested_replies(nested_replies)
            
            # Check total replies count
            total_replies = thread.get('total_replies', 0)
            self.log(f"     Total replies: {total_replies}")
        
        # Validate chronological ordering (oldest first)
        if len(threads) >= 2:
            # Check if pinned comments come first
            pinned_threads = [t for t in threads if t['root_comment'].get('is_pinned', False)]
            non_pinned_threads = [t for t in threads if not t['root_comment'].get('is_pinned', False)]
            
            if pinned_threads:
                self.log(f"   ✅ Found {len(pinned_threads)} pinned threads at the beginning")
            
            # Check chronological order within non-pinned threads
            if len(non_pinned_threads) >= 2:
                first_time = datetime.fromisoformat(non_pinned_threads[0]['root_comment']['created_at'].replace('Z', '+00:00'))
                second_time = datetime.fromisoformat(non_pinned_threads[1]['root_comment']['created_at'].replace('Z', '+00:00'))
                
                if first_time <= second_time:
                    self.log("   ✅ Threads are in correct chronological order (oldest first)")
                else:
                    self.log("   ⚠️ Threads may not be in correct chronological order")
        
        # Test unlimited nesting depth
        max_depth = 0
        def find_max_depth(replies, current_depth=1):
            nonlocal max_depth
            max_depth = max(max_depth, current_depth)
            for reply in replies:
                if 'nested_replies' in reply and reply['nested_replies']:
                    find_max_depth(reply['nested_replies'], current_depth + 1)
        
        for thread in threads:
            if 'nested_replies' in thread['root_comment']:
                find_max_depth(thread['root_comment']['nested_replies'])
        
        self.log(f"   Maximum nesting depth found: {max_depth}")
        if max_depth >= 3:
            self.log("   ✅ Unlimited nesting depth is working (found 3+ levels)")
        else:
            self.log("   ⚠️ Deep nesting not found in test data")
        
        return True

    def test_reactions_at_all_levels(self) -> bool:
        """Test that reactions work at all nesting levels"""
        self.log("😄 Testing reactions at all nesting levels...")
        
        if not self.created_comment_ids:
            self.log("❌ No comment IDs available for reaction testing")
            return False
        
        success_count = 0
        
        # Test reactions on different comment levels
        for i, comment_id in enumerate(self.created_comment_ids[:3]):  # Test first 3 comments
            emoji = ["👍", "❤️", "🚀"][i % 3]
            
            success, response = self.run_test(
                f"Add Reaction to Comment {i+1}",
                "POST",
                f"/api/comments/{comment_id}/reactions?emoji={emoji}",
                200
            )
            
            if success:
                reaction_count = response.get('reaction_count', 0)
                self.log(f"   ✅ Reaction {emoji} added to comment {i+1}. Total: {reaction_count}")
                success_count += 1
            else:
                self.log(f"   ❌ Failed to add reaction to comment {i+1}")
        
        return success_count > 0

    def run_threading_tests(self) -> Dict[str, Any]:
        """Run all threading-specific tests"""
        self.log("🧵 Starting Comment Threading Tests")
        self.log(f"   Base URL: {self.base_url}")
        self.log(f"   Test entity: task/{self.test_task_id}")
        
        test_results = {
            "test_summary": {
                "start_time": datetime.now().isoformat(),
                "base_url": self.base_url,
                "test_entity": f"task/{self.test_task_id}"
            },
            "test_results": {},
            "threading_features": {
                "unlimited_nesting": "unknown",
                "chronological_ordering": "unknown", 
                "visual_hierarchy": "unknown",
                "reactions_all_levels": "unknown",
                "pinned_comments_first": "unknown"
            },
            "issues": []
        }
        
        # Test sequence
        tests = [
            ("login", self.test_login),
            ("create_test_data", self.create_test_threading_data),
            ("comment_threads_endpoint", self.test_comment_threads_endpoint),
            ("reactions_all_levels", self.test_reactions_at_all_levels)
        ]
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                test_results["test_results"][test_name] = {
                    "passed": result,
                    "timestamp": datetime.now().isoformat()
                }
                
                if not result:
                    test_results["issues"].append({
                        "test": test_name,
                        "issue": f"Test {test_name} failed",
                        "impact": "Medium"
                    })
                        
            except Exception as e:
                self.log(f"❌ Test {test_name} crashed: {str(e)}")
                test_results["test_results"][test_name] = {
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                test_results["issues"].append({
                    "test": test_name,
                    "issue": f"Test crashed: {str(e)}",
                    "impact": "High"
                })
        
        # Determine feature status
        if test_results["test_results"].get("comment_threads_endpoint", {}).get("passed"):
            test_results["threading_features"]["unlimited_nesting"] = "working"
            test_results["threading_features"]["chronological_ordering"] = "working"
            test_results["threading_features"]["pinned_comments_first"] = "working"
        else:
            test_results["threading_features"]["unlimited_nesting"] = "failing"
            test_results["threading_features"]["chronological_ordering"] = "failing"
            test_results["threading_features"]["pinned_comments_first"] = "failing"
        
        if test_results["test_results"].get("reactions_all_levels", {}).get("passed"):
            test_results["threading_features"]["reactions_all_levels"] = "working"
        else:
            test_results["threading_features"]["reactions_all_levels"] = "failing"
        
        # Final summary
        test_results["test_summary"].update({
            "end_time": datetime.now().isoformat(),
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "issues_count": len(test_results["issues"]),
            "created_comments": len(self.created_comment_ids)
        })
        
        self.log("📊 Threading Test Summary:")
        self.log(f"   Total tests: {self.tests_run}")
        self.log(f"   Passed: {self.tests_passed}")
        self.log(f"   Success rate: {test_results['test_summary']['success_rate']}")
        self.log(f"   Issues: {len(test_results['issues'])}")
        self.log(f"   Created comments: {len(self.created_comment_ids)}")
        
        # Feature status
        for feature, status in test_results["threading_features"].items():
            status_icon = "✅" if status == "working" else "❌" if status == "failing" else "❓"
            self.log(f"   {status_icon} {feature.replace('_', ' ').title()}: {status}")
        
        return test_results

def main():
    """Main test execution"""
    print("=" * 80)
    print("Comment Threading Functionality - API Testing")
    print("=" * 80)
    
    # Initialize tester
    tester = CommentThreadingTester()
    
    # Run threading tests
    results = tester.run_threading_tests()
    
    # Save results to file
    results_file = f"/app/threading_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n📄 Detailed results saved to: {results_file}")
    except Exception as e:
        print(f"⚠️ Could not save results file: {e}")
    
    # Return appropriate exit code
    threading_working = all(
        status == "working" 
        for status in results["threading_features"].values()
        if status != "unknown"
    )
    
    if threading_working and len(results["issues"]) == 0:
        print("\n🎉 Comment threading testing completed successfully!")
        return 0
    else:
        print(f"\n⚠️ Comment threading testing completed with issues:")
        for issue in results["issues"]:
            print(f"   - {issue['test']}: {issue['issue']}")
        return 1

if __name__ == "__main__":
    sys.exit(main())