#!/usr/bin/env python3
"""
Create test comments with proper threading structure for testing
"""

import asyncio
import sys
import requests
import json

sys.path.append('/app/backend')
from database import connect_to_mongo, get_database

async def create_test_comment_data():
    """Create test comments with proper threading"""
    
    print("🧪 Creating test comment threading data...")
    
    # Login to get token
    login_response = requests.post(
        'http://localhost:8001/api/auth/login',
        json={'email': 'demo@company.com', 'password': 'demo123456'}
    )
    
    if login_response.status_code != 200:
        print('❌ Login failed')
        return None
        
    token = login_response.json()['tokens']['access_token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Get a task to use
    await connect_to_mongo()
    db = await get_database()
    
    task = await db.tasks.find_one({})
    if not task:
        print('❌ No tasks found')
        return None
        
    task_id = task['id']
    print(f'✅ Using task: {task_id} - {task.get("title", "unknown")}')
    
    # Create root comment
    print("1️⃣ Creating root comment...")
    root_data = {
        'content': 'This is the main discussion about the task requirements. We need to break this down into phases.',
        'type': 'comment',
        'entity_type': 'task',
        'entity_id': task_id
    }
    
    root_response = requests.post(
        'http://localhost:8001/api/comments/',
        headers=headers,
        json=root_data
    )
    
    if root_response.status_code != 201:
        print(f'❌ Failed to create root comment: {root_response.text}')
        return None
    
    root_comment = root_response.json()
    root_id = root_comment['id']
    print(f'✅ Root comment created: {root_id}')
    
    # Create first-level reply
    print("2️⃣ Creating first-level reply...")
    reply1_data = {
        'content': 'Good point! I think we should start with the database design first. What do you think about using PostgreSQL?',
        'type': 'comment',
        'entity_type': 'task',
        'entity_id': task_id,
        'parent_id': root_id
    }
    
    reply1_response = requests.post(
        'http://localhost:8001/api/comments/',
        headers=headers,
        json=reply1_data
    )
    
    if reply1_response.status_code != 201:
        print(f'❌ Failed to create first reply: {reply1_response.text}')
        return task_id
    
    reply1_comment = reply1_response.json()
    reply1_id = reply1_comment['id']
    print(f'✅ First-level reply created: {reply1_id}')
    
    # Create second-level reply (reply to reply)
    print("3️⃣ Creating second-level reply...")
    reply2_data = {
        'content': 'PostgreSQL sounds great! I can help with the schema design. Should we also consider MongoDB for certain data types?',
        'type': 'comment',
        'entity_type': 'task',
        'entity_id': task_id,
        'parent_id': reply1_id
    }
    
    reply2_response = requests.post(
        'http://localhost:8001/api/comments/',
        headers=headers,
        json=reply2_data
    )
    
    if reply2_response.status_code != 201:
        print(f'❌ Failed to create second reply: {reply2_response.text}')
        return task_id
    
    reply2_comment = reply2_response.json()
    reply2_id = reply2_comment['id']
    print(f'✅ Second-level reply created: {reply2_id}')
    
    # Create third-level reply
    print("4️⃣ Creating third-level reply...")
    reply3_data = {
        'content': 'MongoDB could be useful for logging and analytics. Let\'s keep PostgreSQL for core data and MongoDB for supplementary data.',
        'type': 'comment',
        'entity_type': 'task',
        'entity_id': task_id,
        'parent_id': reply2_id
    }
    
    reply3_response = requests.post(
        'http://localhost:8001/api/comments/',
        headers=headers,
        json=reply3_data
    )
    
    if reply3_response.status_code != 201:
        print(f'❌ Failed to create third reply: {reply3_response.text}')
        return task_id
    
    reply3_comment = reply3_response.json()
    reply3_id = reply3_comment['id']
    print(f'✅ Third-level reply created: {reply3_id}')
    
    # Create a second root comment (separate thread)
    print("5️⃣ Creating second root comment (pinned)...")
    root2_data = {
        'content': 'IMPORTANT: Please review the security requirements before implementing any database connections.',
        'type': 'review',
        'entity_type': 'task',
        'entity_id': task_id,
        'is_pinned': True
    }
    
    root2_response = requests.post(
        'http://localhost:8001/api/comments/',
        headers=headers,
        json=root2_data
    )
    
    if root2_response.status_code == 201:
        root2_comment = root2_response.json()
        root2_id = root2_comment['id']
        print(f'✅ Second root comment (pinned) created: {root2_id}')
    
    # Create reply to second thread
    print("6️⃣ Creating reply to pinned comment...")
    root2_reply_data = {
        'content': 'Absolutely! I\'ll make sure to follow OWASP guidelines and implement proper input sanitization.',
        'type': 'comment',
        'entity_type': 'task',
        'entity_id': task_id,
        'parent_id': root2_id
    }
    
    root2_reply_response = requests.post(
        'http://localhost:8001/api/comments/',
        headers=headers,
        json=root2_reply_data
    )
    
    if root2_reply_response.status_code == 201:
        root2_reply_comment = root2_reply_response.json()
        print(f'✅ Reply to pinned comment created: {root2_reply_comment["id"]}')
    
    print(f'\n🎯 Test threading structure created for task: {task_id}')
    print('Structure:')
    print('Thread 1:')
    print(f'  └─ Root: {root_id}')
    print(f'     └─ Reply 1: {reply1_id}')
    print(f'        └─ Reply 2: {reply2_id}')
    print(f'           └─ Reply 3: {reply3_id}')
    if 'root2_id' in locals():
        print('Thread 2 (Pinned):')
        print(f'  └─ Root: {root2_id}')
        if 'root2_reply_comment' in locals():
            print(f'     └─ Reply: {root2_reply_comment["id"]}')
    
    return task_id, {
        'root_id': root_id,
        'reply1_id': reply1_id,
        'reply2_id': reply2_id,
        'reply3_id': reply3_id,
        'root2_id': locals().get('root2_id'),
        'root2_reply_id': locals().get('root2_reply_comment', {}).get('id')
    }

if __name__ == "__main__":
    result = asyncio.run(create_test_comment_data())
    print(f"✅ Test data creation completed. Result: {result}")