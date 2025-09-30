#!/usr/bin/env python3
"""
Test script for Global Project Filter Component validation
Tests the enhanced project filtering functionality across API endpoints
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8001"
DEMO_CREDENTIALS = {
    "email": "demo@company.com",
    "password": "demo123456"
}

def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=DEMO_CREDENTIALS,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        return response.json()["tokens"]["access_token"]
    else:
        print(f"❌ Login failed: {response.status_code}")
        return None

def test_projects_api(token):
    """Test projects API endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
    if response.status_code == 200:
        projects = response.json()
        print(f"✅ Projects API: Found {len(projects)} projects")
        return [p["id"] for p in projects[:2]]  # Return first 2 project IDs for testing
    else:
        print(f"❌ Projects API failed: {response.status_code}")
        return []

def test_tasks_api_single_project(token, project_id):
    """Test tasks API with single project filtering"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}/api/tasks/?project_id={project_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        tasks = response.json()
        print(f"✅ Tasks API (single project {project_id}): Found {len(tasks)} tasks")
        return len(tasks)
    else:
        print(f"❌ Tasks API (single project) failed: {response.status_code}")
        return 0

def test_tasks_api_multiple_projects(token, project_ids):
    """Test tasks API with multiple project filtering"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Build query string with comma-separated project IDs
    project_ids_str = ",".join(project_ids)
    
    response = requests.get(
        f"{BASE_URL}/api/tasks/?project_id={project_ids_str}",
        headers=headers
    )
    
    if response.status_code == 200:
        tasks = response.json()
        print(f"✅ Tasks API (multiple projects {project_ids}): Found {len(tasks)} tasks")
        return len(tasks)
    else:
        print(f"❌ Tasks API (multiple projects) failed: {response.status_code}")
        return 0

def test_tasks_api_no_filter(token):
    """Test tasks API without project filtering"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/tasks/", headers=headers)
    
    if response.status_code == 200:
        tasks = response.json()
        print(f"✅ Tasks API (no filter): Found {len(tasks)} tasks")
        return len(tasks)
    else:
        print(f"❌ Tasks API (no filter) failed: {response.status_code}")
        return 0

def test_kanban_api(token, project_ids):
    """Test kanban API with project filtering"""
    headers = {"Authorization": f"Bearer {token}"}
    
    project_ids_str = ",".join(project_ids)
    
    response = requests.get(
        f"{BASE_URL}/api/tasks/kanban/board?project_id={project_ids_str}",
        headers=headers
    )
    
    if response.status_code == 200:
        kanban_data = response.json()
        total_tasks = sum(len(column_tasks) for column_tasks in kanban_data.values())
        print(f"✅ Kanban API (projects {project_ids}): Found {total_tasks} tasks across {len(kanban_data)} columns")
        return total_tasks
    else:
        print(f"❌ Kanban API failed: {response.status_code}")
        return 0

def test_analytics_api(token, project_ids):
    """Test analytics API with project filtering"""
    headers = {"Authorization": f"Bearer {token}"}
    
    project_ids_str = ",".join(project_ids)
    
    response = requests.get(
        f"{BASE_URL}/api/tasks/analytics/summary?project_id={project_ids_str}",
        headers=headers
    )
    
    if response.status_code == 200:
        analytics = response.json()
        print(f"✅ Analytics API (projects {project_ids}): {analytics['total_tasks']} total tasks, {analytics['completion_rate']}% completion rate")
        return analytics["total_tasks"]
    else:
        print(f"❌ Analytics API failed: {response.status_code}")
        return 0

def main():
    """Main test function"""
    print("🧪 Testing Global Project Filter Component")
    print("=" * 50)
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        return
    
    # Get available projects
    project_ids = test_projects_api(token)
    if not project_ids:
        print("❌ No projects available for testing")
        return
    
    print("\n🔍 Testing Task Filtering:")
    print("-" * 30)
    
    # Test different filtering scenarios
    total_tasks = test_tasks_api_no_filter(token)
    
    if len(project_ids) >= 1:
        single_project_tasks = test_tasks_api_single_project(token, project_ids[0])
        
    if len(project_ids) >= 2:
        multi_project_tasks = test_tasks_api_multiple_projects(token, project_ids[:2])
        kanban_tasks = test_kanban_api(token, project_ids[:2])
        analytics_tasks = test_analytics_api(token, project_ids[:2])
        
        print(f"\n📊 Filter Validation:")
        print(f"   Total tasks (no filter): {total_tasks}")
        print(f"   Single project tasks: {single_project_tasks}")
        print(f"   Multi-project tasks: {multi_project_tasks}")
        print(f"   Kanban tasks: {kanban_tasks}")
        print(f"   Analytics tasks: {analytics_tasks}")
        
        # Validate consistency
        if multi_project_tasks == kanban_tasks == analytics_tasks:
            print("✅ All filtered endpoints return consistent results!")
        else:
            print("⚠️  Inconsistent results across endpoints")
    
    print("\n✅ Global Project Filter Component testing complete!")

if __name__ == "__main__":
    main()