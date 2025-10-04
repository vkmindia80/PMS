#!/usr/bin/env python3
"""
Fix comment data structure issues:
1. Convert reactions from {} to [] where needed
2. Add missing fields for proper threading
"""

import asyncio
import sys
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from datetime import datetime

async def fix_comment_data():
    """Fix existing comment data structure issues"""
    
    await connect_to_mongo()
    db = await get_database()
    
    print("🔧 Fixing comment data structure issues...")
    
    # Get all comments
    comments = await db.comments.find({}).to_list(length=1000)
    print(f"Found {len(comments)} comments to fix")
    
    fixed_count = 0
    
    for comment in comments:
        updates = {}
        
        # Fix 1: Ensure reactions is an array, not an object
        if 'reactions' in comment:
            if isinstance(comment['reactions'], dict):
                print(f"  Fixing reactions field for comment {comment.get('id', 'unknown')}")
                updates['reactions'] = []
                updates['reaction_count'] = 0
        else:
            updates['reactions'] = []
            updates['reaction_count'] = 0
        
        # Fix 2: Ensure other required fields exist
        if 'thread_id' not in comment:
            # Set thread_id to the root comment id (parent_id if exists, otherwise self)
            thread_id = comment.get('parent_id') or comment.get('id')
            updates['thread_id'] = thread_id
        
        if 'type' not in comment:
            updates['type'] = 'comment'
        
        if 'mentions' not in comment:
            updates['mentions'] = []
        
        if 'is_edited' not in comment:
            updates['is_edited'] = False
        
        if 'edit_history' not in comment:
            updates['edit_history'] = []
        
        if 'is_pinned' not in comment:
            updates['is_pinned'] = False
        
        if 'is_resolved' not in comment:
            updates['is_resolved'] = False
        
        if 'resolved_by' not in comment:
            updates['resolved_by'] = None
            
        if 'resolved_at' not in comment:
            updates['resolved_at'] = None
        
        if 'search_content' not in comment:
            updates['search_content'] = comment.get('content', '').lower()
        
        # Apply updates if any
        if updates:
            await db.comments.update_one(
                {'_id': comment['_id']},
                {'$set': updates}
            )
            fixed_count += 1
    
    print(f"✅ Fixed {fixed_count} comments")
    
    # Now fix reply counts
    print("🔧 Fixing reply counts...")
    
    # Get all comments again with updates
    all_comments = await db.comments.find({}).to_list(length=1000)
    
    # Calculate correct reply counts
    reply_counts = {}
    for comment in all_comments:
        parent_id = comment.get('parent_id')
        if parent_id:
            reply_counts[parent_id] = reply_counts.get(parent_id, 0) + 1
    
    # Update reply counts
    for parent_id, count in reply_counts.items():
        await db.comments.update_one(
            {'id': parent_id},
            {'$set': {'reply_count': count}}
        )
        print(f"  Updated reply count for {parent_id}: {count}")
    
    print("✅ Reply counts fixed")
    
    # Test the fixed structure
    print("\n🧪 Testing fixed comment structure...")
    sample_comment = await db.comments.find_one({})
    if sample_comment:
        print("Sample comment structure:")
        for key, value in sample_comment.items():
            if key != '_id':
                print(f"  {key}: {type(value)} = {value}")
    
    print("\n🎉 Comment data structure fixes completed!")

if __name__ == "__main__":
    asyncio.run(fix_comment_data())