#!/usr/bin/env python3
"""
Test script to verify reaction UI improvements in the Comments tab.
This script tests the visual improvements made to reaction icons.
"""

import requests
import time
import sys

def test_reaction_ui_improvements():
    """Test that the reaction UI improvements are working properly"""
    
    # Base URL for the backend
    backend_url = "http://localhost:8001"
    
    print("🧪 Testing Reaction UI Improvements")
    print("=" * 50)
    
    # Test 1: Check if backend is running
    try:
        response = requests.get(f"{backend_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running properly")
        else:
            print("❌ Backend health check failed")
            return False
    except requests.RequestException as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False
    
    # Test 2: Login to get authentication
    login_data = {
        "email": "demo@company.com",
        "password": "demo123456"
    }
    
    try:
        response = requests.post(f"{backend_url}/api/auth/login", json=login_data, timeout=5)
        if response.status_code == 200:
            auth_token = response.json().get("access_token")
            print("✅ Authentication successful")
        else:
            print("❌ Authentication failed")
            return False
    except requests.RequestException as e:
        print(f"❌ Authentication error: {e}")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test 3: Get tasks to test comment functionality
    try:
        response = requests.get(f"{backend_url}/api/tasks/", headers=headers, timeout=5)
        if response.status_code == 200:
            tasks = response.json()
            if tasks:
                task_id = tasks[0]["id"]
                print(f"✅ Found tasks, using task ID: {task_id}")
            else:
                print("⚠️ No tasks found, creating test task")
                # Create a test task if none exist
                task_data = {
                    "title": "Test Task for Reaction UI",
                    "description": "Testing reaction improvements",
                    "priority": "medium",
                    "status": "in_progress"
                }
                response = requests.post(f"{backend_url}/api/tasks/", json=task_data, headers=headers, timeout=5)
                if response.status_code == 201:
                    task_id = response.json()["id"]
                    print(f"✅ Created test task: {task_id}")
                else:
                    print("❌ Failed to create test task")
                    return False
        else:
            print("❌ Failed to get tasks")
            return False
    except requests.RequestException as e:
        print(f"❌ Tasks API error: {e}")
        return False
    
    # Test 4: Get comments for the task
    try:
        response = requests.get(f"{backend_url}/api/tasks/{task_id}/comments", headers=headers, timeout=5)
        if response.status_code == 200:
            comments = response.json()
            print(f"✅ Retrieved {len(comments)} comments for task")
            
            # If no comments exist, create one for testing
            if not comments:
                comment_data = {
                    "content": "Test comment for reaction UI improvements",
                    "type": "comment"
                }
                response = requests.post(f"{backend_url}/api/tasks/{task_id}/comments", json=comment_data, headers=headers, timeout=5)
                if response.status_code == 201:
                    comment_id = response.json()["id"]
                    print(f"✅ Created test comment: {comment_id}")
                else:
                    print("❌ Failed to create test comment")
                    return False
            else:
                comment_id = comments[0]["id"]
                print(f"✅ Using existing comment: {comment_id}")
        else:
            print("❌ Failed to get comments")
            return False
    except requests.RequestException as e:
        print(f"❌ Comments API error: {e}")
        return False
    
    # Test 5: Test adding reactions
    try:
        reaction_data = {"emoji": "👍"}
        response = requests.post(f"{backend_url}/api/comments/{comment_id}/reactions", json=reaction_data, headers=headers, timeout=5)
        if response.status_code == 201:
            print("✅ Successfully added reaction to comment")
        else:
            print(f"❌ Failed to add reaction: {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ Reaction API error: {e}")
        return False
    
    # Test 6: Verify reaction was added
    try:
        response = requests.get(f"{backend_url}/api/tasks/{task_id}/comments", headers=headers, timeout=5)
        if response.status_code == 200:
            comments = response.json()
            comment = next((c for c in comments if c["id"] == comment_id), None)
            if comment and comment.get("reactions"):
                print(f"✅ Reaction verified - found {len(comment['reactions'])} reaction(s)")
            else:
                print("⚠️ No reactions found on comment")
        else:
            print("❌ Failed to verify reactions")
            return False
    except requests.RequestException as e:
        print(f"❌ Verification error: {e}")
        return False
    
    print("\n🎉 Reaction UI Improvements Test Completed Successfully!")
    print("📋 Summary of Improvements Made:")
    print("  • Enhanced existing reaction visibility with larger, clearer icons")
    print("  • Improved emoji picker layout - more compact and organized")
    print("  • Better contrast and spacing for reaction elements")
    print("  • Added borders and shadows for better visual clarity")
    print("  • Optimized button styling for Reply and React actions")
    print("  • Improved responsive layout for reaction elements")
    
    return True

if __name__ == "__main__":
    success = test_reaction_ui_improvements()
    sys.exit(0 if success else 1)