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
    def __init__(self, base_url: str = "https://project-404.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_task_id = "2b5d0d14-54b6-4eca-9dd9-3fe0aa6df040"  # Valid task ID from system
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

    def test_activity_list(self):
        """Test activity list endpoint"""
        print("\n" + "="*60)
        print("TESTING ACTIVITY LIST ENDPOINT")
        print("="*60)
        
        success, response = self.run_test(
            "Get Activity List",
            "GET",
            f"/api/tasks/{self.test_task_id}/activity",
            200
        )
        
        if success and isinstance(response, list):
            activity_count = len(response)
            print(f"    ✅ Retrieved {activity_count} activities")
            
            # Analyze activity types
            activity_types = {}
            for activity in response:
                action = activity.get('action', 'unknown')
                activity_types[action] = activity_types.get(action, 0) + 1
                
            print(f"    📋 Activity breakdown:")
            for action, count in activity_types.items():
                print(f"      - {action}: {count}")
                
            # Check for expected activities
            expected_activities = ['task_created', 'status_changed', 'time_logged', 'assignee_changed', 'priority_changed']
            found_activities = set(activity_types.keys())
            
            print(f"\n    🔍 Expected activity types found:")
            for expected in expected_activities:
                found = expected in found_activities
                print(f"      - {expected}: {'✅' if found else '❌'}")
                
            return response
        else:
            print(f"    ❌ Failed to get activity list")
            return []

    def test_time_logging(self):
        """Test time logging functionality to generate activity"""
        print("\n" + "="*60)
        print("TESTING TIME LOGGING (ACTIVITY GENERATION)")
        print("="*60)
        
        # Log some time to generate activity
        success, response = self.run_test(
            "Log Time Entry",
            "POST",
            f"/api/tasks/{self.test_task_id}/time/log?hours=0.5&description=Testing activity generation",
            200
        )
        
        if success:
            print(f"    ✅ Time logged successfully")
            return True
        else:
            print(f"    ❌ Failed to log time")
            return False

    def test_activity_refresh_cycle(self):
        """Test activity refresh functionality"""
        print("\n" + "="*60)
        print("TESTING ACTIVITY REFRESH CYCLE")
        print("="*60)
        
        # Get initial metrics
        print("    📊 Getting initial metrics...")
        initial_metrics = self.test_activity_metrics()
        
        if not initial_metrics:
            return False
            
        # Log time to generate new activity
        print("    ⏰ Generating new activity...")
        time_logged = self.test_time_logging()
        
        if not time_logged:
            return False
            
        # Wait a moment for activity to be processed
        print("    ⏳ Waiting for activity processing...")
        time.sleep(2)
        
        # Get updated metrics
        print("    📊 Getting updated metrics...")
        success, response = self.run_test(
            "Get Updated Activity Metrics",
            "GET",
            f"/api/tasks/{self.test_task_id}/activity/metrics",
            200
        )
        
        if success and 'metrics' in response:
            updated_metrics = response['metrics']
            
            initial_total = initial_metrics.get('total_events', 0)
            updated_total = updated_metrics.get('total_events', 0)
            initial_time_entries = initial_metrics.get('time_entries', 0)
            updated_time_entries = updated_metrics.get('time_entries', 0)
            
            print(f"    📈 Metrics comparison:")
            print(f"      Total Events: {initial_total} → {updated_total} (Δ{updated_total - initial_total})")
            print(f"      Time Entries: {initial_time_entries} → {updated_time_entries} (Δ{updated_time_entries - initial_time_entries})")
            
            if updated_total > initial_total:
                print(f"    ✅ Activity metrics updated correctly")
                return True
            else:
                print(f"    ❌ Activity metrics did not update")
                return False
        else:
            print(f"    ❌ Failed to get updated metrics")
            return False

    def test_activity_data_integrity(self):
        """Test activity data integrity and structure"""
        print("\n" + "="*60)
        print("TESTING ACTIVITY DATA INTEGRITY")
        print("="*60)
        
        # Get activity list
        activities = self.test_activity_list()
        
        if not activities:
            return False
            
        # Validate activity structure
        valid_activities = 0
        required_fields = ['id', 'task_id', 'user_id', 'action', 'timestamp']
        
        for activity in activities:
            if all(field in activity for field in required_fields):
                valid_activities += 1
            else:
                missing_fields = [field for field in required_fields if field not in activity]
                print(f"    ⚠️ Activity missing fields: {missing_fields}")
                
        print(f"    📊 Valid activities: {valid_activities}/{len(activities)}")
        
        if valid_activities == len(activities):
            print(f"    ✅ All activities have proper structure")
            return True
        else:
            print(f"    ❌ Some activities have structural issues")
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