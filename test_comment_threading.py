#!/usr/bin/env python3
"""
Test script to create threaded comments for testing the comment threading functionality
"""

import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from datetime import datetime
import uuid

async def create_test_comments():
    """Create test comments with multiple levels of threading"""
    
    await connect_to_mongo()
    db = await get_database()
    
    print("🧪 Creating test comments for threading...")
    
    # Test entity (task)
    test_task_id = "test-task-threading-001"
    test_user_id = "demo-user-001"
    
    # Create root comment
    root_comment_id = str(uuid.uuid4())
    current_time = datetime.utcnow()
    
    root_comment = {
        "id": root_comment_id,
        "content": "This is the main comment to discuss the task requirements. What do you think about the approach?",
        "type": "comment",
        "entity_type": "task",
        "entity_id": test_task_id,
        "author_id": test_user_id,
        "parent_id": None,
        "thread_id": root_comment_id,
        "mentions": [],
        "attachments": [],
        "is_edited": False,
        "edit_history": [],
        "is_internal": False,
        "is_pinned": False,
        "reply_count": 0,
        "reaction_count": 1,
        "reactions": [
            {
                "user_id": test_user_id,
                "emoji": "👍",
                "timestamp": current_time.isoformat()
            }
        ],
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "created_at": current_time,
        "updated_at": current_time,
        "search_content": "this is the main comment to discuss the task requirements. what do you think about the approach?"
    }
    
    await db.comments.insert_one(root_comment)
    print(f"✅ Created root comment: {root_comment_id}")
    
    # Create first-level reply
    reply1_id = str(uuid.uuid4())
    reply1_time = datetime.utcnow()
    
    reply1 = {
        "id": reply1_id,
        "content": "Great question! I think we should break it down into smaller phases. What about starting with the basic functionality?",
        "type": "comment",
        "entity_type": "task",
        "entity_id": test_task_id,
        "author_id": test_user_id,
        "parent_id": root_comment_id,
        "thread_id": root_comment_id,
        "mentions": [],
        "attachments": [],
        "is_edited": False,
        "edit_history": [],
        "is_internal": False,
        "is_pinned": False,
        "reply_count": 0,
        "reaction_count": 0,
        "reactions": [],
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "created_at": reply1_time,
        "updated_at": reply1_time,
        "search_content": "great question! i think we should break it down into smaller phases. what about starting with the basic functionality?"
    }
    
    await db.comments.insert_one(reply1)
    print(f"✅ Created level 1 reply: {reply1_id}")
    
    # Create second-level reply (reply to reply)
    reply2_id = str(uuid.uuid4())
    reply2_time = datetime.utcnow()
    
    reply2 = {
        "id": reply2_id,
        "content": "That's a solid approach! I can help with the database design for the first phase. Should we start with user authentication?",
        "type": "comment",
        "entity_type": "task",
        "entity_id": test_task_id,
        "author_id": test_user_id,
        "parent_id": reply1_id,
        "thread_id": root_comment_id,
        "mentions": [],
        "attachments": [],
        "is_edited": False,
        "edit_history": [],
        "is_internal": False,
        "is_pinned": False,
        "reply_count": 0,
        "reaction_count": 2,
        "reactions": [
            {
                "user_id": test_user_id,
                "emoji": "🚀",
                "timestamp": reply2_time.isoformat()
            },
            {
                "user_id": test_user_id,
                "emoji": "👀",
                "timestamp": reply2_time.isoformat()
            }
        ],
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "created_at": reply2_time,
        "updated_at": reply2_time,
        "search_content": "that's a solid approach! i can help with the database design for the first phase. should we start with user authentication?"
    }
    
    await db.comments.insert_one(reply2)
    print(f"✅ Created level 2 reply: {reply2_id}")
    
    # Create third-level reply (reply to reply to reply)
    reply3_id = str(uuid.uuid4())
    reply3_time = datetime.utcnow()
    
    reply3 = {
        "id": reply3_id,
        "content": "Perfect! User authentication is definitely the right starting point. I'll create the JWT implementation and you handle the database schema.",
        "type": "comment",
        "entity_type": "task",
        "entity_id": test_task_id,
        "author_id": test_user_id,
        "parent_id": reply2_id,
        "thread_id": root_comment_id,
        "mentions": [],
        "attachments": [],
        "is_edited": False,
        "edit_history": [],
        "is_internal": False,
        "is_pinned": False,
        "reply_count": 0,
        "reaction_count": 1,
        "reactions": [
            {
                "user_id": test_user_id,
                "emoji": "🎉",
                "timestamp": reply3_time.isoformat()
            }
        ],
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "created_at": reply3_time,
        "updated_at": reply3_time,
        "search_content": "perfect! user authentication is definitely the right starting point. i'll create the jwt implementation and you handle the database schema."
    }
    
    await db.comments.insert_one(reply3)
    print(f"✅ Created level 3 reply: {reply3_id}")
    
    # Create a separate root comment (second thread)
    root2_id = str(uuid.uuid4())
    root2_time = datetime.utcnow()
    
    root2 = {
        "id": root2_id,
        "content": "I have a different suggestion for the UI/UX approach. Should we discuss the design patterns first?",
        "type": "review",
        "entity_type": "task",
        "entity_id": test_task_id,
        "author_id": test_user_id,
        "parent_id": None,
        "thread_id": root2_id,
        "mentions": [],
        "attachments": [],
        "is_edited": False,
        "edit_history": [],
        "is_internal": False,
        "is_pinned": True,  # Make this one pinned
        "reply_count": 0,
        "reaction_count": 0,
        "reactions": [],
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "created_at": root2_time,
        "updated_at": root2_time,
        "search_content": "i have a different suggestion for the ui/ux approach. should we discuss the design patterns first?"
    }
    
    await db.comments.insert_one(root2)
    print(f"✅ Created second root comment (pinned): {root2_id}")
    
    # Create reply to second thread
    root2_reply_id = str(uuid.uuid4())
    root2_reply_time = datetime.utcnow()
    
    root2_reply = {
        "id": root2_reply_id,
        "content": "Good point! Design patterns will definitely help with consistency. Let's schedule a design review meeting.",
        "type": "comment",
        "entity_type": "task",
        "entity_id": test_task_id,
        "author_id": test_user_id,
        "parent_id": root2_id,
        "thread_id": root2_id,
        "mentions": [],
        "attachments": [],
        "is_edited": False,
        "edit_history": [],
        "is_internal": False,
        "is_pinned": False,
        "reply_count": 0,
        "reaction_count": 0,
        "reactions": [],
        "is_resolved": False,
        "resolved_by": None,
        "resolved_at": None,
        "created_at": root2_reply_time,
        "updated_at": root2_reply_time,
        "search_content": "good point! design patterns will definitely help with consistency. let's schedule a design review meeting."
    }
    
    await db.comments.insert_one(root2_reply)
    print(f"✅ Created reply to second thread: {root2_reply_id}")
    
    print(f"\n🎯 Test data created successfully!")
    print(f"📝 Test entity: task/{test_task_id}")
    print(f"🔗 Threading structure created:")
    print(f"   Thread 1: {root_comment_id}")
    print(f"   ├── Reply 1: {reply1_id}")
    print(f"   │   ├── Reply 2: {reply2_id}")
    print(f"   │   │   └── Reply 3: {reply3_id}")
    print(f"   Thread 2 (Pinned): {root2_id}")
    print(f"   └── Reply: {root2_reply_id}")
    
    return test_task_id

if __name__ == "__main__":
    asyncio.run(create_test_comments())