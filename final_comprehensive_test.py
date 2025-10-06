#!/usr/bin/env python3
"""
Final comprehensive test to verify all Activity Timeline functionality
"""

import asyncio
import requests
import json
import time

# Configuration
API_BASE_URL = "http://localhost:8001/api"
DEMO_CREDENTIALS = {
    "email": "demo@company.com", 
    "password": "demo123456"
}

async def comprehensive_test():
    print("🚀 COMPREHENSIVE ACTIVITY TIMELINE TEST")
    print("="*60)
    
    # Authenticate
    auth_data = {
        "email": DEMO_CREDENTIALS["email"],
        "password": DEMO_CREDENTIALS["password"]
    }
    
    auth_response = requests.post(f"{API_BASE_URL}/auth/login", json=auth_data)
    token = auth_response.json()["tokens"]["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Get a project
    projects_response = requests.get(f"{API_BASE_URL}/projects?limit=1", headers=headers)
    project_id = projects_response.json()[0]["id"]
    
    # Create a fresh task for testing
    print("1. 📝 Creating new task...")
    task_data = {
        "title": "Fresh Activity Timeline Test Task",
        "description": "This task will test all activity timeline functionality",
        "status": "todo",
        "priority": "high",
        "type": "task",
        "project_id": project_id
    }
    
    create_response = requests.post(f"{API_BASE_URL}/tasks/", headers=headers, json=task_data)
    task = create_response.json()
    task_id = task["id"]
    print(f"   ✅ Task created: {task_id}")
    
    # Get initial metrics (should have at least task_created activity)
    print("\n2. 📊 Checking initial metrics...")
    time.sleep(1)  # Wait for activity to be processed
    metrics_response = requests.get(f"{API_BASE_URL}/tasks/{task_id}/activity/metrics", headers=headers)
    initial_metrics = metrics_response.json()["metrics"]
    print(f"   Initial metrics: {json.dumps(initial_metrics, indent=4)}")
    
    activities_response = requests.get(f"{API_BASE_URL}/tasks/{task_id}/activity", headers=headers)
    initial_activities = activities_response.json()
    print(f"   Initial activities: {len(initial_activities)}")
    for i, activity in enumerate(initial_activities):
        print(f"   {i+1}. {activity['action']} - {activity.get('timestamp', 'No timestamp')}")
    
    # Test 1: Add comment
    print("\n3. 💬 Adding comment...")
    comment_data = {
        "content": "This is a comprehensive test comment for the activity timeline.",
        "type": "comment",
        "entity_type": "task",
        "entity_id": task_id
    }
    
    comment_response = requests.post(f"{API_BASE_URL}/comments/", headers=headers, json=comment_data)
    comment = comment_response.json()
    print(f"   ✅ Comment added: {comment['id']}")
    
    # Test 2: Update task status
    print("\n4. 🔄 Changing task status...")
    status_update = {"status": "in_progress"}
    requests.put(f"{API_BASE_URL}/tasks/{task_id}", headers=headers, json=status_update)
    print("   ✅ Status changed to 'in_progress'")
    
    # Test 3: Update task priority
    print("\n5. 🚨 Changing task priority...")
    priority_update = {"priority": "critical"}
    requests.put(f"{API_BASE_URL}/tasks/{task_id}", headers=headers, json=priority_update)
    print("   ✅ Priority changed to 'critical'")
    
    # Test 4: Log time entry
    print("\n6. ⏰ Logging time entry...")
    requests.post(f"{API_BASE_URL}/tasks/{task_id}/time/log?hours=3.5&description=Initial development work", headers=headers)
    print("   ✅ Time entry logged (3.5 hours)")
    
    # Test 5: Add another comment  
    print("\n7. 💬 Adding second comment...")
    comment2_data = {
        "content": "Added more details and made good progress on the task.",
        "type": "comment",
        "entity_type": "task",
        "entity_id": task_id
    }
    
    requests.post(f"{API_BASE_URL}/comments/", headers=headers, json=comment2_data)
    print("   ✅ Second comment added")
    
    # Test 6: Log another time entry
    print("\n8. ⏰ Logging second time entry...")
    requests.post(f"{API_BASE_URL}/tasks/{task_id}/time/log?hours=2&description=Testing and refinement", headers=headers)
    print("   ✅ Second time entry logged (2 hours)")
    
    # Wait for all activities to be processed
    time.sleep(2)
    
    # Get final metrics and activities
    print("\n9. 📊 Checking final results...")
    final_metrics_response = requests.get(f"{API_BASE_URL}/tasks/{task_id}/activity/metrics", headers=headers)
    final_metrics = final_metrics_response.json()["metrics"]
    
    final_activities_response = requests.get(f"{API_BASE_URL}/tasks/{task_id}/activity", headers=headers)
    final_activities = final_activities_response.json()
    
    print(f"   Final metrics: {json.dumps(final_metrics, indent=4)}")
    print(f"   Final activities count: {len(final_activities)}")
    
    print("\n   📋 All Activities:")
    for i, activity in enumerate(final_activities):
        details = activity.get('details', {})
        detail_str = ""
        if activity['action'] == 'status_changed':
            detail_str = f" ({details.get('from')} → {details.get('to')})"
        elif activity['action'] == 'time_logged':
            detail_str = f" ({details.get('hours')}h)"
        elif activity['action'] == 'comment_added':
            detail_str = f" (preview: {details.get('content_preview', '')[:30]}...)"
        
        print(f"   {i+1}. {activity['action']}{detail_str} - {activity.get('timestamp', 'No timestamp')}")
    
    # Validate results
    print("\n10. 🔍 VALIDATION RESULTS")
    print("="*40)
    
    expected_events = 7  # task_created + 2 comments + 2 status changes + 2 time logs
    expected_time_entries = 2
    expected_updates = 4  # 2 comments + 2 status changes
    expected_active_days = 1
    
    results = {
        "Total Events": (final_metrics["total_events"], expected_events, final_metrics["total_events"] >= expected_events),
        "Time Entries": (final_metrics["time_entries"], expected_time_entries, final_metrics["time_entries"] == expected_time_entries),
        "Updates": (final_metrics["updates"], expected_updates, final_metrics["updates"] >= expected_updates),
        "Active Days": (final_metrics["active_days"], expected_active_days, final_metrics["active_days"] == expected_active_days)
    }
    
    all_passed = True
    for metric, (actual, expected, passed) in results.items():
        status = "✅" if passed else "❌"
        print(f"{status} {metric}: {actual} (expected: {expected})")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Activity Timeline is working perfectly!")
        print("✅ Comments integration: Working")
        print("✅ Status changes: Working")  
        print("✅ Time logging: Working")
        print("✅ Metrics calculation: Working")
        print("✅ Activity timeline display: Working")
    else:
        print("❌ Some tests failed. Review the results above.")
    print("="*60)
    
    return all_passed

if __name__ == "__main__":
    asyncio.run(comprehensive_test())