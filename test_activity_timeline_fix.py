#!/usr/bin/env python3
"""
Test script to verify the Activity Timeline metrics fix
This script tests the integration between comments and activity service
"""

import asyncio
import requests
import json
import time
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8001/api"
DEMO_CREDENTIALS = {
    "email": "demo@company.com", 
    "password": "demo123456"
}

class ActivityTimelineTest:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_task_id = None
        
    async def authenticate(self):
        """Authenticate and get access token"""
        print("🔐 Authenticating...")
        
        auth_data = {
            "email": DEMO_CREDENTIALS["email"],
            "password": DEMO_CREDENTIALS["password"]
        }
        
        response = requests.post(f"{API_BASE_URL}/auth/login", json=auth_data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.token = token_data["access_token"]
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            print("✅ Authentication successful")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    
    async def get_or_create_test_task(self):
        """Get existing task or create a new test task"""
        print("📝 Getting test task...")
        
        # First try to get existing tasks
        response = requests.get(f"{API_BASE_URL}/tasks?limit=1", headers=self.headers)
        
        if response.status_code == 200:
            tasks = response.json()
            if tasks:
                self.test_task_id = tasks[0]["id"]
                print(f"✅ Using existing task: {self.test_task_id}")
                return True
        
        # Create a new test task if none exist
        print("🆕 Creating new test task...")
        
        # First get a project
        projects_response = requests.get(f"{API_BASE_URL}/projects?limit=1", headers=self.headers)
        if projects_response.status_code != 200 or not projects_response.json():
            print("❌ No projects found to create task")
            return False
            
        project_id = projects_response.json()[0]["id"]
        
        task_data = {
            "title": "Activity Timeline Test Task",
            "description": "Test task for verifying activity timeline functionality",
            "status": "todo",
            "priority": "medium",
            "type": "task",
            "project_id": project_id
        }
        
        response = requests.post(f"{API_BASE_URL}/tasks/", headers=self.headers, json=task_data)
        
        if response.status_code == 201:
            task = response.json()
            self.test_task_id = task["id"]
            print(f"✅ Created test task: {self.test_task_id}")
            return True
        else:
            print(f"❌ Failed to create task: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    
    async def get_initial_metrics(self):
        """Get initial activity metrics"""
        print("📊 Getting initial activity metrics...")
        
        response = requests.get(f"{API_BASE_URL}/tasks/{self.test_task_id}/activity/metrics", headers=self.headers)
        
        if response.status_code == 200:
            metrics = response.json()
            print(f"✅ Initial metrics: {json.dumps(metrics['metrics'], indent=2)}")
            return metrics["metrics"]
        else:
            print(f"❌ Failed to get metrics: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    
    async def add_test_comment(self):
        """Add a test comment to the task"""
        print("💬 Adding test comment...")
        
        comment_data = {
            "content": "This is a test comment to verify activity timeline integration.",
            "type": "comment",
            "entity_type": "task",
            "entity_id": self.test_task_id
        }
        
        response = requests.post(f"{API_BASE_URL}/comments/", headers=self.headers, json=comment_data)
        
        if response.status_code == 201:
            comment = response.json()
            print(f"✅ Comment added: {comment['id']}")
            return comment
        else:
            print(f"❌ Failed to add comment: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    
    async def update_task_status(self):
        """Update task status to generate activity"""
        print("🔄 Updating task status...")
        
        update_data = {
            "status": "in_progress"
        }
        
        response = requests.put(f"{API_BASE_URL}/tasks/{self.test_task_id}", headers=self.headers, json=update_data)
        
        if response.status_code == 200:
            print("✅ Task status updated")
            return True
        else:
            print(f"❌ Failed to update task: {response.status_code}")
            return False
    
    async def log_time_entry(self):
        """Log a time entry to generate activity"""
        print("⏰ Logging time entry...")
        
        response = requests.post(f"{API_BASE_URL}/tasks/{self.test_task_id}/time/log?hours=2&description=Test work", headers=self.headers)
        
        if response.status_code == 200:
            print("✅ Time entry logged")
            return True
        else:
            print(f"❌ Failed to log time: {response.status_code}")
            return False
    
    async def get_final_metrics(self):
        """Get final activity metrics after actions"""
        print("📊 Getting final activity metrics...")
        
        # Wait a moment for activities to be processed
        time.sleep(2)
        
        response = requests.get(f"{API_BASE_URL}/tasks/{self.test_task_id}/activity/metrics", headers=self.headers)
        
        if response.status_code == 200:
            metrics = response.json()
            print(f"✅ Final metrics: {json.dumps(metrics['metrics'], indent=2)}")
            return metrics["metrics"]
        else:
            print(f"❌ Failed to get final metrics: {response.status_code}")
            return None
    
    async def get_activity_timeline(self):
        """Get the complete activity timeline"""
        print("📋 Getting activity timeline...")
        
        response = requests.get(f"{API_BASE_URL}/tasks/{self.test_task_id}/activity", headers=self.headers)
        
        if response.status_code == 200:
            activities = response.json()
            print(f"✅ Found {len(activities)} activities:")
            for i, activity in enumerate(activities[:5]):  # Show first 5
                print(f"  {i+1}. {activity['action']} - {activity.get('timestamp', 'No timestamp')}")
            return activities
        else:
            print(f"❌ Failed to get activities: {response.status_code}")
            return None
    
    async def run_complete_test(self):
        """Run the complete test suite"""
        print("🧪 Starting Activity Timeline Integration Test\n")
        
        # Step 1: Authenticate
        if not await self.authenticate():
            return False
        
        # Step 2: Get or create test task
        if not await self.get_or_create_test_task():
            return False
        
        # Step 3: Get initial metrics
        initial_metrics = await self.get_initial_metrics()
        if initial_metrics is None:
            return False
        
        print("\n" + "="*50)
        print("🎯 PERFORMING ACTIONS TO GENERATE ACTIVITIES")
        print("="*50)
        
        # Step 4: Add comment (should increase updates count)
        comment = await self.add_test_comment()
        if comment is None:
            return False
        
        # Step 5: Update task status (should increase updates count)
        if not await self.update_task_status():
            return False
        
        # Step 6: Log time entry (should increase time_entries count)
        if not await self.log_time_entry():
            return False
        
        print("\n" + "="*50)
        print("📊 CHECKING RESULTS")
        print("="*50)
        
        # Step 7: Get final metrics
        final_metrics = await self.get_final_metrics()
        if final_metrics is None:
            return False
        
        # Step 8: Get activity timeline
        activities = await self.get_activity_timeline()
        if activities is None:
            return False
        
        # Step 9: Compare metrics
        print("\n" + "="*50)
        print("🔍 METRICS COMPARISON")
        print("="*50)
        
        print(f"📈 Total Events: {initial_metrics['total_events']} → {final_metrics['total_events']} (Δ{final_metrics['total_events'] - initial_metrics['total_events']})")
        print(f"⏰ Time Entries: {initial_metrics['time_entries']} → {final_metrics['time_entries']} (Δ{final_metrics['time_entries'] - initial_metrics['time_entries']})")
        print(f"🔄 Updates: {initial_metrics['updates']} → {final_metrics['updates']} (Δ{final_metrics['updates'] - initial_metrics['updates']})")
        print(f"📅 Active Days: {initial_metrics['active_days']} → {final_metrics['active_days']} (Δ{final_metrics['active_days'] - initial_metrics['active_days']})")
        
        # Verify the fix worked
        success = True
        expected_changes = {
            'total_events': 3,  # Comment + Status change + Time log
            'time_entries': 1,  # Time log
            'updates': 2        # Comment + Status change
        }
        
        for metric, expected_increase in expected_changes.items():
            actual_increase = final_metrics[metric] - initial_metrics[metric]
            if actual_increase >= expected_increase:
                print(f"✅ {metric}: Expected increase of at least {expected_increase}, got {actual_increase}")
            else:
                print(f"❌ {metric}: Expected increase of at least {expected_increase}, got {actual_increase}")
                success = False
        
        print("\n" + "="*50)
        if success:
            print("🎉 SUCCESS: Activity Timeline metrics are updating correctly!")
            print("✅ Comments are being logged as activities")
            print("✅ All activity types are being tracked properly")
            print("✅ Metrics calculation is working as expected")
        else:
            print("❌ FAILURE: Some metrics are not updating as expected")
        print("="*50)
        
        return success

async def main():
    test = ActivityTimelineTest()
    result = await test.run_complete_test()
    return result

if __name__ == "__main__":
    asyncio.run(main())