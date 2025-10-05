#!/usr/bin/env python3
"""
Test script to verify the comment duplication fix is working
"""

import requests
import json
import sys

def test_comment_fix():
    """Test that replies are not duplicated"""
    base_url = "https://reply-uniqueness.preview.emergentagent.com"
    
    print("🧪 Testing Comment Duplication Fix...")
    
    # Login first
    print("🔑 Logging in...")
    login_response = requests.post(f"{base_url}/api/auth/login", json={
        "email": "demo@company.com",
        "password": "demo123456"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
        
    token = login_response.json()['tokens']['access_token']
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Get first task
    print("📋 Getting tasks...")
    tasks_response = requests.get(f"{base_url}/api/tasks?limit=1", headers=headers)
    if tasks_response.status_code != 200:
        print(f"❌ Failed to get tasks: {tasks_response.status_code}")
        return False
    
    tasks = tasks_response.json()
    if not tasks:
        print("❌ No tasks found")
        return False
        
    task_id = tasks[0]['id']
    print(f"✅ Using task: {task_id}")
    
    # Get initial comment count
    print("💬 Getting initial comments...")
    initial_comments_response = requests.get(
        f"{base_url}/api/comments/threads/task/{task_id}", 
        headers=headers
    )
    if initial_comments_response.status_code != 200:
        print(f"❌ Failed to get initial comments: {initial_comments_response.status_code}")
        return False
        
    initial_threads = initial_comments_response.json()
    initial_comment_count = sum(1 + count_nested_comments(thread['root_comment']) for thread in initial_threads)
    print(f"📊 Initial comment count: {initial_comment_count}")
    
    # Create a root comment
    print("💬 Creating root comment...")
    root_comment_data = {
        "content": "Test root comment for duplication fix",
        "type": "comment",
        "entity_type": "task",
        "entity_id": task_id
    }
    
    root_response = requests.post(f"{base_url}/api/comments/", json=root_comment_data, headers=headers)
    if root_response.status_code != 201:
        print(f"❌ Failed to create root comment: {root_response.status_code} - {root_response.text}")
        return False
        
    root_comment = root_response.json()
    root_id = root_comment['id']
    print(f"✅ Created root comment: {root_id}")
    
    # Create a reply
    print("💬 Creating reply...")
    reply_data = {
        "content": "Test reply for duplication fix",
        "type": "comment", 
        "entity_type": "task",
        "entity_id": task_id,
        "parent_id": root_id
    }
    
    reply_response = requests.post(f"{base_url}/api/comments/", json=reply_data, headers=headers)
    if reply_response.status_code != 201:
        print(f"❌ Failed to create reply: {reply_response.status_code} - {reply_response.text}")
        return False
        
    reply_comment = reply_response.json()
    reply_id = reply_comment['id']
    print(f"✅ Created reply: {reply_id}")
    
    # Check final comment count
    print("🔍 Checking final comments...")
    final_comments_response = requests.get(
        f"{base_url}/api/comments/threads/task/{task_id}", 
        headers=headers
    )
    if final_comments_response.status_code != 200:
        print(f"❌ Failed to get final comments: {final_comments_response.status_code}")
        return False
        
    final_threads = final_comments_response.json()
    final_comment_count = sum(1 + count_nested_comments(thread['root_comment']) for thread in final_threads)
    print(f"📊 Final comment count: {final_comment_count}")
    
    expected_count = initial_comment_count + 2  # root + reply
    
    # Verify no duplication
    if final_comment_count == expected_count:
        print(f"✅ SUCCESS: Comment count is correct ({final_comment_count} = {initial_comment_count} + 2)")
        
        # Check for specific comments in the response
        found_root = False
        found_reply = False
        reply_appears_once = True
        
        for thread in final_threads:
            if check_comment_in_thread(thread['root_comment'], root_id):
                found_root = True
                if check_comment_in_thread(thread['root_comment'], reply_id):
                    found_reply = True
                    
        # Count occurrences of our reply
        reply_count = count_comment_occurrences(final_threads, reply_id)
        
        if reply_count == 1:
            print("✅ SUCCESS: Reply appears exactly once (no duplication)")
            return True
        else:
            print(f"❌ FAILED: Reply appears {reply_count} times (duplication detected)")
            return False
            
    else:
        print(f"❌ FAILED: Expected {expected_count} comments, got {final_comment_count}")
        return False

def count_nested_comments(comment):
    """Recursively count nested comments"""
    count = 0
    if 'nested_replies' in comment and comment['nested_replies']:
        for reply in comment['nested_replies']:
            count += 1 + count_nested_comments(reply)
    return count

def check_comment_in_thread(comment, comment_id):
    """Check if a comment ID exists in a thread (recursively)"""
    if comment['id'] == comment_id:
        return True
    if 'nested_replies' in comment and comment['nested_replies']:
        for reply in comment['nested_replies']:
            if check_comment_in_thread(reply, comment_id):
                return True
    return False

def count_comment_occurrences(threads, comment_id):
    """Count how many times a comment ID appears in all threads"""
    count = 0
    for thread in threads:
        count += count_comment_in_structure(thread['root_comment'], comment_id)
    return count

def count_comment_in_structure(comment, comment_id):
    """Count occurrences of a comment ID in a comment structure"""
    count = 1 if comment['id'] == comment_id else 0
    if 'nested_replies' in comment and comment['nested_replies']:
        for reply in comment['nested_replies']:
            count += count_comment_in_structure(reply, comment_id)
    return count

if __name__ == "__main__":
    success = test_comment_fix()
    sys.exit(0 if success else 1)