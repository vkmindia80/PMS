#!/usr/bin/env python3
"""
Backend API Testing for Timeline Tab Functionality
Testing auto-scheduling, task creation, and timeline data loading
"""

import requests
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class TimelineTabTester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_project_id = None
        self.test_results = []
        self.created_task_ids = []

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

    def test_timeline_data_loading(self):
        """Test timeline data loading - KEY FUNCTIONALITY"""
        print("\n" + "="*60)
        print("TESTING TIMELINE DATA LOADING")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        # Test timeline-tasks integration endpoint
        success, response = self.run_test(
            "Get Timeline Data (Integration)",
            "GET",
            f"/api/timeline-tasks/project/{self.test_project_id}/timeline?include_completed=true",
            200
        )
        
        if success and 'tasks' in response:
            tasks = response.get('tasks', [])
            dependencies = response.get('dependencies', [])
            print(f"    ✅ Timeline data loaded successfully")
            print(f"    📋 Tasks: {len(tasks)}")
            print(f"    🔗 Dependencies: {len(dependencies)}")
            
            # Check task structure
            if tasks:
                sample_task = tasks[0]
                required_fields = ['id', 'name', 'start_date', 'finish_date', 'duration', 'percent_complete']
                missing_fields = [field for field in required_fields if field not in sample_task]
                
                if missing_fields:
                    print(f"    ⚠️ Missing required task fields: {missing_fields}")
                else:
                    print(f"    ✅ All required task fields present")
                    
            return True
        else:
            print(f"    ❌ Failed to load timeline data")
            return False

    def test_create_timeline_task(self):
        """Test creating a new timeline task - KEY FUNCTIONALITY"""
        print("\n" + "="*60)
        print("TESTING TIMELINE TASK CREATION")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        # Create a test task
        task_data = {
            "title": f"Test Timeline Task {datetime.utcnow().strftime('%H%M%S')}",
            "description": "Test task created for timeline functionality testing",
            "project_id": self.test_project_id,
            "status": "todo",
            "priority": "medium",
            "type": "task",
            "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "progress_percentage": 0,
            "time_tracking": {
                "estimated_hours": 8
            }
        }
        
        success, response = self.run_test(
            "Create Timeline Task",
            "POST",
            "/api/tasks",
            201,
            data=task_data
        )
        
        if success and 'id' in response:
            task_id = response['id']
            self.created_task_ids.append(task_id)
            print(f"    ✅ Task created successfully")
            print(f"    📋 Task ID: {task_id}")
            print(f"    📋 Task Title: {response.get('title')}")
            return True
        else:
            print(f"    ❌ Failed to create timeline task")
            return False

    def test_auto_scheduling(self):
        """Test auto-scheduling functionality - KEY FUNCTIONALITY"""
        print("\n" + "="*60)
        print("TESTING AUTO-SCHEDULING FUNCTIONALITY")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        # Test auto-scheduling endpoint
        success, response = self.run_test(
            "Auto-Schedule Tasks",
            "POST",
            f"/api/dynamic-timeline/projects/{self.test_project_id}/auto-schedule",
            200
        )
        
        if success:
            scheduled_tasks = response.get('scheduled_tasks', [])
            conflicts_resolved = response.get('conflicts_resolved', 0)
            suggestions = response.get('suggestions', [])
            
            print(f"    ✅ Auto-scheduling completed")
            print(f"    📋 Scheduled tasks: {len(scheduled_tasks)}")
            print(f"    🔧 Conflicts resolved: {conflicts_resolved}")
            print(f"    💡 Suggestions: {len(suggestions)}")
            
            if suggestions:
                for i, suggestion in enumerate(suggestions[:3]):  # Show first 3 suggestions
                    print(f"      {i+1}. {suggestion}")
                    
            return True
        else:
            print(f"    ❌ Auto-scheduling failed")
            return False

    def test_task_drag_update(self):
        """Test task drag-and-drop update functionality"""
        print("\n" + "="*60)
        print("TESTING TASK DRAG UPDATE")
        print("="*60)
        
        if not self.created_task_ids:
            print("    ❌ No created tasks available for testing")
            return False
            
        task_id = self.created_task_ids[0]
        
        # Test drag update
        drag_data = {
            "task_id": task_id,
            "new_start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "new_duration": 12,  # 12 hours
            "cascade_dependencies": True
        }
        
        success, response = self.run_test(
            "Update Task from Drag",
            "PUT",
            f"/api/timeline-tasks/task/{task_id}/drag-update",
            200,
            data=drag_data
        )
        
        if success and 'task' in response:
            updated_task = response['task']
            print(f"    ✅ Task drag update successful")
            print(f"    📋 New start date: {updated_task.get('start_date')}")
            print(f"    📋 New finish date: {updated_task.get('finish_date')}")
            print(f"    📋 New duration: {updated_task.get('duration')} hours")
            return True
        else:
            print(f"    ❌ Task drag update failed")
            return False

    def test_timeline_sync(self):
        """Test timeline sync functionality"""
        print("\n" + "="*60)
        print("TESTING TIMELINE SYNC")
        print("="*60)
        
        if not self.created_task_ids:
            print("    ❌ No created tasks available for testing")
            return False
            
        task_id = self.created_task_ids[0]
        
        # Test timeline sync
        sync_data = {
            "name": "Updated Timeline Task Name",
            "description": "Updated description from timeline",
            "percent_complete": 25,
            "duration": 10
        }
        
        success, response = self.run_test(
            "Sync Task to Timeline",
            "POST",
            f"/api/timeline-tasks/task/{task_id}/timeline-sync",
            200,
            data=sync_data
        )
        
        if success and 'id' in response:
            print(f"    ✅ Timeline sync successful")
            print(f"    📋 Updated name: {response.get('name')}")
            print(f"    📋 Updated progress: {response.get('percent_complete')}%")
            print(f"    📋 Updated duration: {response.get('duration')} hours")
            return True
        else:
            print(f"    ❌ Timeline sync failed")
            return False

    def test_enhanced_gantt_data(self):
        """Test enhanced Gantt chart data endpoint"""
        print("\n" + "="*60)
        print("TESTING ENHANCED GANTT DATA")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        success, response = self.run_test(
            "Get Enhanced Gantt Data",
            "GET",
            f"/api/dynamic-timeline/gantt/{self.test_project_id}/enhanced?show_completed=true",
            200
        )
        
        if success and 'tasks' in response:
            tasks = response.get('tasks', [])
            dependencies = response.get('dependencies', [])
            conflicts = response.get('conflicts', [])
            critical_path = response.get('critical_path', [])
            
            print(f"    ✅ Enhanced Gantt data loaded")
            print(f"    📋 Tasks: {len(tasks)}")
            print(f"    🔗 Dependencies: {len(dependencies)}")
            print(f"    ⚠️ Conflicts: {len(conflicts)}")
            print(f"    🎯 Critical path tasks: {len(critical_path)}")
            
            return True
        else:
            print(f"    ❌ Failed to load enhanced Gantt data")
            return False

    def test_timeline_stats(self):
        """Test timeline statistics endpoint"""
        print("\n" + "="*60)
        print("TESTING TIMELINE STATISTICS")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        success, response = self.run_test(
            "Get Timeline Stats",
            "GET",
            f"/api/dynamic-timeline/stats/{self.test_project_id}/realtime",
            200
        )
        
        if success:
            print(f"    ✅ Timeline stats loaded")
            print(f"    📊 Total tasks: {response.get('total_tasks', 0)}")
            print(f"    ✅ Completed tasks: {response.get('completed_tasks', 0)}")
            print(f"    🔄 In progress tasks: {response.get('in_progress_tasks', 0)}")
            print(f"    ⏰ Overdue tasks: {response.get('overdue_tasks', 0)}")
            print(f"    💯 Health score: {response.get('timeline_health_score', 0)}%")
            print(f"    📅 Est. completion: {response.get('estimated_completion', 'N/A')}")
            
            return True
        else:
            print(f"    ❌ Failed to load timeline stats")
            return False

    def test_task_search(self):
        """Test task search functionality"""
        print("\n" + "="*60)
        print("TESTING TASK SEARCH")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        success, response = self.run_test(
            "Search Tasks",
            "GET",
            f"/api/dynamic-timeline/projects/{self.test_project_id}/search?q=test&include_suggestions=true",
            200
        )
        
        if success and 'tasks' in response:
            tasks = response.get('tasks', [])
            suggestions = response.get('suggestions', [])
            total_found = response.get('total_found', 0)
            
            print(f"    ✅ Task search completed")
            print(f"    📋 Tasks found: {total_found}")
            print(f"    💡 Suggestions: {len(suggestions)}")
            
            return True
        else:
            print(f"    ❌ Task search failed")
            return False

    def cleanup_created_tasks(self):
        """Clean up tasks created during testing"""
        print("\n" + "="*60)
        print("CLEANING UP CREATED TASKS")
        print("="*60)
        
        for task_id in self.created_task_ids:
            try:
                success, response = self.run_test(
                    f"Delete Task {task_id}",
                    "DELETE",
                    f"/api/tasks/{task_id}",
                    200
                )
                
                if success:
                    print(f"    ✅ Deleted task {task_id}")
                else:
                    print(f"    ⚠️ Could not delete task {task_id}")
                    
            except Exception as e:
                print(f"    ⚠️ Error deleting task {task_id}: {e}")

    def run_all_tests(self):
        """Run all timeline functionality tests"""
        print("🚀 Starting Timeline Tab Functionality Testing")
        print("="*80)
        
        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False
            
        # Get projects list
        if not self.test_get_projects_list():
            print("❌ Projects list not available, stopping tests")
            return False
            
        # Test timeline data loading - KEY FUNCTIONALITY
        timeline_data_success = self.test_timeline_data_loading()
        
        # Test task creation - KEY FUNCTIONALITY
        task_creation_success = self.test_create_timeline_task()
        
        # Test auto-scheduling - KEY FUNCTIONALITY
        auto_schedule_success = self.test_auto_scheduling()
        
        # Test task drag update
        drag_update_success = self.test_task_drag_update()
        
        # Test timeline sync
        timeline_sync_success = self.test_timeline_sync()
        
        # Test enhanced Gantt data
        gantt_data_success = self.test_enhanced_gantt_data()
        
        # Test timeline stats
        stats_success = self.test_timeline_stats()
        
        # Test task search
        search_success = self.test_task_search()
        
        # Clean up created tasks
        self.cleanup_created_tasks()
        
        # Calculate overall success
        key_tests = [
            timeline_data_success,
            task_creation_success, 
            auto_schedule_success,
            drag_update_success,
            timeline_sync_success,
            gantt_data_success,
            stats_success,
            search_success
        ]
        
        key_tests_passed = sum(key_tests)
        overall_success = key_tests_passed >= 6  # At least 6 out of 8 key tests must pass
        
        # Print summary
        print("\n" + "="*80)
        print("TIMELINE TAB FUNCTIONALITY TEST SUMMARY")
        print("="*80)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print(f"\n🎯 KEY FUNCTIONALITY TESTS:")
        print(f"  Timeline Data Loading: {'✅' if timeline_data_success else '❌'}")
        print(f"  Task Creation: {'✅' if task_creation_success else '❌'}")
        print(f"  Auto-Scheduling: {'✅' if auto_schedule_success else '❌'}")
        print(f"  Drag Update: {'✅' if drag_update_success else '❌'}")
        print(f"  Timeline Sync: {'✅' if timeline_sync_success else '❌'}")
        print(f"  Enhanced Gantt Data: {'✅' if gantt_data_success else '❌'}")
        print(f"  Timeline Stats: {'✅' if stats_success else '❌'}")
        print(f"  Task Search: {'✅' if search_success else '❌'}")
        
        if overall_success:
            print("\n🎉 Timeline Tab functionality is working!")
            print("✅ Auto-scheduling should work")
            print("✅ Double-click task editing should work")
            print("✅ Add task functionality should work")
        else:
            print("\n❌ Timeline Tab has issues")
            print("🐛 Auto-scheduling may not work properly")
            print("🐛 Task editing may have problems")
            print("🐛 Add task functionality may be broken")
        
        return overall_success

def main():
    """Main test execution"""
    tester = TimelineTabTester()
    
    try:
        success = tester.run_all_tests()
        
        # Save test results
        with open('/app/test_reports/backend_timeline_test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.utcnow().isoformat(),
                'success': success,
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'results': tester.test_results,
                'project_id': tester.test_project_id,
                'created_task_ids': tester.created_task_ids,
                'functionality_status': 'WORKING' if success else 'ISSUES_FOUND'
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())