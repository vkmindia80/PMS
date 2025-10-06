from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Import database connection
from database import get_database

# Import authentication
from auth.middleware import get_current_active_user

# Import models
from models.comment import (
    Comment, CommentCreate, CommentUpdate, CommentInDB, CommentSummary,
    CommentThread, CommentStats, EntityType, CommentType, CommentReaction
)
from models.user import User

# Import services
from services.activity_service import activity_service

router = APIRouter(prefix="/api/comments", tags=["comments"])

@router.post("/", response_model=Comment, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new comment"""
    try:
        db = await get_database()
        
        # Verify the entity exists based on entity_type
        entity_collection = None
        entity_type_value = comment_data.entity_type.value if hasattr(comment_data.entity_type, 'value') else str(comment_data.entity_type)
        
        if entity_type_value == "task":
            entity_collection = db.tasks
        elif entity_type_value == "project":
            entity_collection = db.projects
        elif entity_type_value == "user":
            entity_collection = db.users
        elif entity_type_value == "organization":
            entity_collection = db.organizations
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported entity type: {entity_type_value}"
            )
        
        # Check if entity exists
        entity = await entity_collection.find_one({"id": comment_data.entity_id})
        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{entity_type_value.title()} not found"
            )
        
        # Create comment with ID and timestamps
        comment_id = str(uuid.uuid4())
        current_time = datetime.utcnow()
        
        # Set thread_id (root comment id for threading)
        thread_id = comment_data.parent_id if comment_data.parent_id else comment_id
        
        comment_dict = comment_data.dict()
        comment_dict.update({
            "id": comment_id,
            "author_id": current_user.id,
            "thread_id": thread_id,
            "created_at": current_time,
            "updated_at": current_time,
            "reply_count": 0,
            "reaction_count": 0,
            "reactions": [],
            "is_resolved": False,
            "search_content": comment_data.content.lower()  # For searching
        })
        
        # Insert comment
        result = await db.comments.insert_one(comment_dict)
        
        # Update parent comment reply count if this is a reply
        if comment_data.parent_id:
            await db.comments.update_one(
                {"id": comment_data.parent_id},
                {"$inc": {"reply_count": 1}}
            )
        
        # Update entity comment count
        if entity_type_value == "task":
            await db.tasks.update_one(
                {"id": comment_data.entity_id},
                {"$inc": {"comment_count": 1}}
            )
            
            # Log activity for task comments
            await activity_service.log_activity(
                comment_data.entity_id, 
                current_user.id, 
                "comment_added",
                {
                    "comment_id": comment_id,
                    "comment_type": str(comment_data.type),
                    "content_preview": comment_data.content[:100] + "..." if len(comment_data.content) > 100 else comment_data.content,
                    "is_reply": comment_data.parent_id is not None
                },
                db
            )
        
        # Get created comment
        created_comment = await db.comments.find_one({"id": comment_id})
        if not created_comment:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create comment"
            )
        
        return Comment(**created_comment)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create comment: {str(e)}"
        )

@router.get("/", response_model=List[CommentSummary])
async def get_comments(
    entity_type: Optional[EntityType] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    comment_type: Optional[CommentType] = Query(None, description="Filter by comment type"),
    author_id: Optional[str] = Query(None, description="Filter by author"),
    is_internal: Optional[bool] = Query(None, description="Filter internal comments"),
    parent_id: Optional[str] = Query(None, description="Get replies to specific comment"),
    skip: int = Query(0, ge=0, description="Number of comments to skip"),
    limit: int = Query(50, ge=1, le=200, description="Number of comments to return"),
    current_user: User = Depends(get_current_active_user)
):
    """Get comments with filtering and pagination"""
    try:
        db = await get_database()
        
        # Build filter query
        filter_query = {}
        
        if entity_type:
            filter_query["entity_type"] = entity_type.value
        if entity_id:
            filter_query["entity_id"] = entity_id
        if comment_type:
            filter_query["type"] = comment_type.value
        if author_id:
            filter_query["author_id"] = author_id
        if is_internal is not None:
            filter_query["is_internal"] = is_internal
        if parent_id:
            filter_query["parent_id"] = parent_id
        
        # Get comments with pagination
        cursor = db.comments.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
        comments = await cursor.to_list(length=limit)
        
        # Convert to CommentSummary format
        comment_summaries = []
        for comment in comments:
            comment_summaries.append(CommentSummary(
                id=comment["id"],
                content=comment["content"],
                type=CommentType(comment.get("type", "comment")),  # Default to 'comment' if type missing
                entity_type=EntityType(comment["entity_type"]),
                entity_id=comment["entity_id"],
                author_id=comment["author_id"],
                created_at=comment["created_at"],
                reply_count=comment.get("reply_count", 0),
                reaction_count=comment.get("reaction_count", 0),
                is_edited=comment.get("is_edited", False),
                is_pinned=comment.get("is_pinned", False)
            ))
        
        return comment_summaries
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comments: {str(e)}"
        )

@router.get("/{comment_id}", response_model=Comment)
async def get_comment(
    comment_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific comment by ID"""
    try:
        db = await get_database()
        
        comment = await db.comments.find_one({"id": comment_id})
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        # Fix reactions field if it's a dict instead of list (data migration issue)
        if isinstance(comment.get("reactions"), dict):
            comment["reactions"] = []
        
        # Ensure all required fields have default values
        comment.setdefault("reactions", [])
        comment.setdefault("reply_count", 0)
        comment.setdefault("reaction_count", 0)
        comment.setdefault("is_resolved", False)
        
        return Comment(**comment)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comment: {str(e)}"
        )

@router.put("/{comment_id}", response_model=Comment)
async def update_comment(
    comment_id: str,
    comment_update: CommentUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a comment"""
    try:
        db = await get_database()
        
        # Get existing comment
        existing_comment = await db.comments.find_one({"id": comment_id})
        if not existing_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        # Check if user is the author or has admin rights
        if existing_comment["author_id"] != current_user.id:
            # You could add admin check here if needed
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own comments"
            )
        
        # Prepare update data
        update_data = comment_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            update_data["is_edited"] = True
            
            # Update search content if content changed
            if "content" in update_data:
                update_data["search_content"] = update_data["content"].lower()
            
            # Add to edit history
            edit_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": current_user.id,
                "changes": list(update_data.keys())
            }
            
            # Update comment
            await db.comments.update_one(
                {"id": comment_id}, 
                {
                    "$set": update_data,
                    "$push": {"edit_history": edit_entry}
                }
            )
            
            # Log activity for task comment updates
            if existing_comment.get("entity_type") == "task":
                await activity_service.log_activity(
                    existing_comment["entity_id"], 
                    current_user.id, 
                    "comment_updated",
                    {
                        "comment_id": comment_id,
                        "fields_changed": list(update_data.keys()),
                        "content_preview": update_data.get("content", existing_comment.get("content", ""))[:100] + "..." if len(update_data.get("content", existing_comment.get("content", ""))) > 100 else update_data.get("content", existing_comment.get("content", ""))
                    },
                    db
                )
        
        # Get updated comment
        updated_comment = await db.comments.find_one({"id": comment_id})
        return Comment(**updated_comment)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update comment: {str(e)}"
        )

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a comment"""
    try:
        db = await get_database()
        
        # Check if comment exists
        existing_comment = await db.comments.find_one({"id": comment_id})
        if not existing_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        # Check if user is the author or has admin rights
        if existing_comment["author_id"] != current_user.id:
            # You could add admin check here if needed
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own comments"
            )
        
        # Delete comment and all its replies
        await db.comments.delete_many({"$or": [
            {"id": comment_id},
            {"parent_id": comment_id}
        ]})
        
        # Update parent comment reply count if this was a reply
        if existing_comment.get("parent_id"):
            await db.comments.update_one(
                {"id": existing_comment["parent_id"]},
                {"$inc": {"reply_count": -1}}
            )
        
        # Update entity comment count
        entity_type = existing_comment.get("entity_type")
        entity_id = existing_comment.get("entity_id")
        
        if entity_type == "task":
            await db.tasks.update_one(
                {"id": entity_id},
                {"$inc": {"comment_count": -1}}
            )
            
            # Log activity for task comment deletion
            await activity_service.log_activity(
                entity_id, 
                current_user.id, 
                "comment_deleted",
                {
                    "comment_id": comment_id,
                    "content_preview": existing_comment.get("content", "")[:100] + "..." if len(existing_comment.get("content", "")) > 100 else existing_comment.get("content", ""),
                    "was_reply": existing_comment.get("parent_id") is not None
                },
                db
            )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete comment: {str(e)}"
        )

@router.post("/{comment_id}/reactions", response_model=Comment)
async def add_reaction(
    comment_id: str,
    emoji: str = Query(..., description="Emoji reaction"),
    current_user: User = Depends(get_current_active_user)
):
    """Add reaction to a comment"""
    try:
        db = await get_database()
        
        # Check if comment exists
        comment = await db.comments.find_one({"id": comment_id})
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        # Check if user already reacted with this emoji
        reactions = comment.get("reactions", [])
        existing_reaction = next((r for r in reactions if r["user_id"] == current_user.id and r["emoji"] == emoji), None)
        
        if existing_reaction:
            # Remove reaction if it exists
            await db.comments.update_one(
                {"id": comment_id},
                {
                    "$pull": {"reactions": {"user_id": current_user.id, "emoji": emoji}},
                    "$inc": {"reaction_count": -1}
                }
            )
        else:
            # Add new reaction
            reaction = {
                "user_id": current_user.id,
                "emoji": emoji,
                "timestamp": datetime.utcnow().isoformat()
            }
            await db.comments.update_one(
                {"id": comment_id},
                {
                    "$push": {"reactions": reaction},
                    "$inc": {"reaction_count": 1}
                }
            )
        
        # Get updated comment
        updated_comment = await db.comments.find_one({"id": comment_id})
        return Comment(**updated_comment)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add reaction: {str(e)}"
        )

@router.get("/threads/{entity_type}/{entity_id}")
async def get_comment_threads(
    entity_type: EntityType,
    entity_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get comment threads for an entity with unlimited nesting support"""
    try:
        db = await get_database()
        
        # Get all comments for the entity, sorted chronologically (oldest first)
        comments = await db.comments.find({
            "entity_type": entity_type.value,
            "entity_id": entity_id
        }).sort("created_at", 1).to_list(length=None)
        
        if not comments:
            return []
        
        # Convert to Comment objects and create lookup dict
        comment_objects = {}
        for comment_data in comments:
            # Fix reactions field if it's a dict instead of list (data migration issue)
            if isinstance(comment_data.get("reactions"), dict):
                comment_data["reactions"] = []
            
            # Ensure all required fields have default values
            comment_data.setdefault("reactions", [])
            comment_data.setdefault("reply_count", 0)
            comment_data.setdefault("reaction_count", 0)
            comment_data.setdefault("is_resolved", False)
            comment_data.setdefault("nested_replies", None)
            
            comment_objects[comment_data["id"]] = Comment(**comment_data)
        
        # Build nested thread structure recursively
        def build_nested_replies(parent_id: str) -> List[Dict]:
            """Recursively build nested replies for a parent comment"""
            replies = []
            for comment_id, comment_obj in comment_objects.items():
                if comment_obj.parent_id == parent_id:
                    # This comment is a direct reply to the parent
                    # Recursively get its nested replies
                    nested_replies = build_nested_replies(comment_id)
                    
                    # Convert to dict and add nested replies
                    comment_dict = comment_obj.dict()
                    comment_dict["nested_replies"] = nested_replies
                    
                    replies.append(comment_dict)
            
            # Sort replies chronologically (oldest first)
            return sorted(replies, key=lambda x: x["created_at"])
        
        # Find root comments (no parent_id) and build their thread trees
        root_threads = []
        for comment_id, comment_obj in comment_objects.items():
            if not comment_obj.parent_id:
                # This is a root comment
                nested_replies = build_nested_replies(comment_id)
                
                # Calculate total reply count (including nested)
                def count_total_replies(replies_list: List[Dict]) -> int:
                    total = len(replies_list)
                    for reply in replies_list:
                        if reply.get('nested_replies'):
                            total += count_total_replies(reply['nested_replies'])
                    return total
                
                total_reply_count = count_total_replies(nested_replies)
                
                # Convert root comment to dict and add nested replies
                root_comment_dict = comment_obj.dict()
                root_comment_dict["nested_replies"] = nested_replies
                
                # Create thread with nested structure
                thread_dict = {
                    "root_comment": root_comment_dict,
                    "replies": nested_replies,  # This will now contain the full nested structure
                    "total_replies": total_reply_count
                }
                root_threads.append(thread_dict)
        
        # Sort root threads chronologically (oldest first) with pinned comments first
        root_threads.sort(key=lambda x: (not x["root_comment"]["is_pinned"], x["root_comment"]["created_at"]))
        
        return root_threads
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comment threads: {str(e)}"
        )

@router.get("/stats/{entity_type}/{entity_id}", response_model=CommentStats)
async def get_comment_stats(
    entity_type: EntityType,
    entity_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get comment statistics for an entity"""
    try:
        db = await get_database()
        
        # Get all comments for the entity
        comments = await db.comments.find({
            "entity_type": entity_type.value,
            "entity_id": entity_id
        }).to_list(length=None)
        
        # Calculate stats
        total_comments = len(comments)
        total_threads = len([c for c in comments if not c.get("parent_id")])
        participant_ids = set(c["author_id"] for c in comments)
        participant_count = len(participant_ids)
        
        # Comment type breakdown
        comment_count = len([c for c in comments if c.get("type") == "comment"])
        note_count = len([c for c in comments if c.get("type") == "note"])
        review_count = len([c for c in comments if c.get("type") == "review"])
        suggestion_count = len([c for c in comments if c.get("type") == "suggestion"])
        
        # Recent activity
        recent_activity = None
        if comments:
            recent_activity = max(
                c["created_at"] if isinstance(c["created_at"], datetime) 
                else datetime.fromisoformat(c["created_at"].replace("Z", "+00:00")) 
                for c in comments
            )
        
        return CommentStats(
            entity_type=entity_type,
            entity_id=entity_id,
            total_comments=total_comments,
            total_threads=total_threads,
            participant_count=participant_count,
            recent_activity=recent_activity,
            comment_count=comment_count,
            note_count=note_count,
            review_count=review_count,
            suggestion_count=suggestion_count
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comment stats: {str(e)}"
        )

@router.put("/{comment_id}/resolve", response_model=Comment)
async def resolve_comment(
    comment_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Mark a comment as resolved"""
    try:
        db = await get_database()
        
        # Check if comment exists
        comment = await db.comments.find_one({"id": comment_id})
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        # Update comment
        await db.comments.update_one(
            {"id": comment_id},
            {
                "$set": {
                    "is_resolved": True,
                    "resolved_by": current_user.id,
                    "resolved_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Get updated comment
        updated_comment = await db.comments.find_one({"id": comment_id})
        return Comment(**updated_comment)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve comment: {str(e)}"
        )

@router.get("/search", response_model=List[CommentSummary])
async def search_comments(
    query: str = Query(..., min_length=2, description="Search query"),
    entity_type: Optional[EntityType] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    current_user: User = Depends(get_current_active_user)
):
    """Search comments by content"""
    try:
        db = await get_database()
        
        # Build search query
        filter_query = {
            "search_content": {"$regex": query.lower(), "$options": "i"}
        }
        
        if entity_type:
            filter_query["entity_type"] = entity_type.value
        if entity_id:
            filter_query["entity_id"] = entity_id
        
        # Search comments
        comments = await db.comments.find(filter_query).limit(limit).sort("created_at", -1).to_list(length=limit)
        
        # Convert to CommentSummary format
        comment_summaries = []
        for comment in comments:
            comment_summaries.append(CommentSummary(
                id=comment["id"],
                content=comment["content"],
                type=CommentType(comment.get("type", "comment")),  # Default to 'comment' if type missing
                entity_type=EntityType(comment["entity_type"]),
                entity_id=comment["entity_id"],
                author_id=comment["author_id"],
                created_at=comment["created_at"],
                reply_count=comment.get("reply_count", 0),
                reaction_count=comment.get("reaction_count", 0),
                is_edited=comment.get("is_edited", False),
                is_pinned=comment.get("is_pinned", False)
            ))
        
        return comment_summaries
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search comments: {str(e)}"
        )