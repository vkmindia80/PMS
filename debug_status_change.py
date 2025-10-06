#!/usr/bin/env python3
"""
Debug script to check status change activity logging
"""

import asyncio
import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8001/api"
DEMO_CREDENTIALS = {
    "email": "demo@company.com", 
    "password": "demo123456"
}

async def test_status_change():
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
    
    # Get an existing task
    tasks_response = requests.get(f"{API_BASE_URL}/tasks?limit=1", headers=headers)
    task = tasks_response.json()[0]
    task_id = task["id"]
    
    print(f"Task ID: {task_id}")
    print(f"Current Status: {task['status']}")
    
    # Get current activities count
    activities_response = requests.get(f"{API_BASE_URL}/tasks/{task_id}/activity", headers=headers)
    activities_before = activities_response.json()
    print(f"Activities before: {len(activities_before)}")
    
    # Change status to something different
    new_status = "completed" if task["status"] != "completed" else "todo"
    print(f"Changing status to: {new_status}")
    
    update_data = {"status": new_status}
    update_response = requests.put(f"{API_BASE_URL}/tasks/{task_id}", headers=headers, json=update_data)
    
    if update_response.status_code == 200:
        print("✅ Status update successful")
        updated_task = update_response.json()
        print(f"New status: {updated_task['status']}")
    else:
        print(f"❌ Status update failed: {update_response.status_code}")
        print(update_response.text)
        return
    
    # Get activities after change
    activities_response = requests.get(f"{API_BASE_URL}/tasks/{task_id}/activity", headers=headers)
    activities_after = activities_response.json()
    print(f"Activities after: {len(activities_after)}")
    
    if len(activities_after) > len(activities_before):
        new_activity = activities_after[0]  # Should be the newest
        print(f"✅ New activity logged: {new_activity['action']}")
        print(f"Activity details: {json.dumps(new_activity, indent=2)}")
    else:
        print("❌ No new activity was logged!")
        
    # Check metrics
    metrics_response = requests.get(f"{API_BASE_URL}/tasks/{task_id}/activity/metrics", headers=headers)
    metrics = metrics_response.json()
    print(f"Current metrics: {json.dumps(metrics['metrics'], indent=2)}")

if __name__ == "__main__":
    asyncio.run(test_status_change())