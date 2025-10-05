#!/usr/bin/env python3
"""
Test script to verify the comment duplication fix
Tests the scenario described in the issue where reply comments get duplicated
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"  # Backend URL
API_BASE = f"{BASE_URL}/api"

def get_auth_token():
    """Get authentication token"""
    auth_data = {
        "email": "demo@company.com",
        "password": "demopass123"
    }
    
    response = requests.post(f"{API_BASE}/auth/login", json=auth_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Authentication failed: {response.status_code} - {response.text}")
        return None

def get_headers(token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_comment_duplication_fix():
    """Test that comments don't get duplicated when adding replies"""
    print("🧪 Testing Comment Duplication Fix")
    print("=" * 50)
    
    # Get auth token
    token = get_auth_token()
    if not token:
        return False
    
    headers = get_headers(token)
    
    # Get all tasks
    print("📝 Getting tasks...")
    tasks_response = requests.get(f"{API_BASE}/tasks/", headers=headers)
    if tasks_response.status_code != 200:
        print(f"❌ Failed to get tasks: {tasks_response.status_code}")
        return False
    
    tasks = tasks_response.json()
    if not tasks:
        print("❌ No tasks found")
        return False
    
    # Use the first task
    task = tasks[0]
    task_id = task["id"]
    print(f"✅ Using task: {task['title']} (ID: {task_id})")
    
    # Get initial comment count
    print("\n🔍 Getting initial comments...")
    initial_comments_response = requests.get(f"{API_BASE}/comments/threads/task/{task_id}", headers=headers)
    if initial_comments_response.status_code != 200:
        print(f"❌ Failed to get comments: {initial_comments_response.status_code}")
        return False
    
    initial_threads = initial_comments_response.json()
    initial_count = len(initial_threads)
    print(f"✅ Initial comment threads: {initial_count}")
    
    # Add a new parent comment
    print("\n💬 Adding parent comment...")
    parent_comment_data = {
        "content": f"Test parent comment - {datetime.now().isoformat()}",
        "type": "comment",
        "entity_type": "task",
        "entity_id": task_id,
        "mentions": [],
        "attachments": [],
        "is_internal": False,
        "is_pinned": False
    }
    
    parent_response = requests.post(f"{API_BASE}/comments/", json=parent_comment_data, headers=headers)
    if parent_response.status_code != 200:
        print(f"❌ Failed to add parent comment: {parent_response.status_code} - {parent_response.text}")
        return False
    
    parent_comment = parent_response.json()
    parent_comment_id = parent_comment["id"]
    print(f"✅ Parent comment added: {parent_comment_id}")
    
    # Small delay to ensure comment is saved
    time.sleep(0.5)
    
    # Get comments after adding parent
    print("\n🔍 Getting comments after parent addition...")
    after_parent_response = requests.get(f"{API_BASE}/comments/threads/task/{task_id}", headers=headers)
    if after_parent_response.status_code != 200:
        print(f"❌ Failed to get comments after parent: {after_parent_response.status_code}")
        return False
    
    after_parent_threads = after_parent_response.json()
    after_parent_count = len(after_parent_threads)
    print(f"✅ Comment threads after parent: {after_parent_count}")
    
    # Check that we have exactly one more thread
    if after_parent_count != initial_count + 1:
        print(f"❌ Expected {initial_count + 1} threads, got {after_parent_count}")
        return False
    
    # Add a reply to the parent comment - this is where duplication was happening
    print(f"\n💬 Adding reply to parent comment {parent_comment_id}...")
    reply_comment_data = {
        "content": f"Test reply comment - {datetime.now().isoformat()}",
        "type": "comment",
        "entity_type": "task",
        "entity_id": task_id,
        "parent_id": parent_comment_id,
        "mentions": [],
        "attachments": [],
        "is_internal": False,
        "is_pinned": False
    }
    
    reply_response = requests.post(f"{API_BASE}/comments/", json=reply_comment_data, headers=headers)
    if reply_response.status_code != 200:
        print(f"❌ Failed to add reply comment: {reply_response.status_code} - {reply_response.text}")
        return False
    
    reply_comment = reply_response.json()
    reply_comment_id = reply_comment["id"]
    print(f"✅ Reply comment added: {reply_comment_id}")
    
    # Small delay to ensure reply is saved
    time.sleep(0.5)
    
    # Get comments after adding reply - this is the critical test
    print("\n🔍 Getting comments after reply addition...")
    after_reply_response = requests.get(f"{API_BASE}/comments/threads/task/{task_id}", headers=headers)
    if after_reply_response.status_code != 200:
        print(f"❌ Failed to get comments after reply: {after_reply_response.status_code}")
        return False
    
    after_reply_threads = after_reply_response.json()
    after_reply_count = len(after_reply_threads)
    print(f"✅ Comment threads after reply: {after_reply_count}")
    
    # The number of threads should be the same (reply doesn't create a new thread)
    if after_reply_count != after_parent_count:
        print(f"❌ Thread count changed unexpectedly: was {after_parent_count}, now {after_reply_count}")
        return False
    
    # Check for duplicates in the response
    print("\n🔍 Checking for duplicate comments...")
    all_comment_ids = []
    
    for thread in after_reply_threads:
        all_comment_ids.append(thread["root_comment"]["id"])
        
        # Check nested replies
        def collect_reply_ids(comment):
            if "nested_replies" in comment and comment["nested_replies"]:
                for reply in comment["nested_replies"]:
                    all_comment_ids.append(reply["id"])
                    collect_reply_ids(reply)
        
        collect_reply_ids(thread["root_comment"])
    
    # Check for duplicates
    unique_ids = set(all_comment_ids)
    if len(all_comment_ids) != len(unique_ids):
        print(f"❌ Found duplicate comment IDs!")
        print(f"   Total comments: {len(all_comment_ids)}")
        print(f"   Unique comments: {len(unique_ids)}")
        
        # Find the duplicates
        seen = set()
        duplicates = []
        for comment_id in all_comment_ids:
            if comment_id in seen:
                duplicates.append(comment_id)
            seen.add(comment_id)
        print(f"   Duplicate IDs: {duplicates}")
        return False
    
    print(f"✅ No duplicate comments found! Total unique comments: {len(unique_ids)}")
    
    # Verify the parent-child relationship
    print("\n🔍 Verifying parent-child relationship...")
    parent_thread = None
    for thread in after_reply_threads:
        if thread["root_comment"]["id"] == parent_comment_id:
            parent_thread = thread
            break
    
    if not parent_thread:
        print(f"❌ Could not find parent thread for comment {parent_comment_id}")
        return False
    
    # Check if reply is in the nested replies
    reply_found = False
    if "nested_replies" in parent_thread["root_comment"]:
        for reply in parent_thread["root_comment"]["nested_replies"]:
            if reply["id"] == reply_comment_id:
                reply_found = True
                break
    
    if not reply_found:
        print(f"❌ Reply comment {reply_comment_id} not found in parent's nested replies")
        return False
    
    print(f"✅ Reply correctly nested under parent comment")
    
    print("\n🎉 All tests passed! Comment duplication fix is working correctly.")
    print("\nTest Results Summary:")
    print(f"  - Initial threads: {initial_count}")
    print(f"  - After parent: {after_parent_count}")
    print(f"  - After reply: {after_reply_count}")
    print(f"  - Total unique comments: {len(unique_ids)}")
    print(f"  - No duplicates found: ✅")
    print(f"  - Proper nesting: ✅")
    
    return True

if __name__ == "__main__":
    success = test_comment_duplication_fix()
    if not success:
        sys.exit(1)
    print("\n✅ Test completed successfully!")