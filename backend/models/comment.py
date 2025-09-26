from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class EntityType(str, Enum):
    """Types of entities that can have comments"""
    PROJECT = "project"
    TASK = "task"
    FILE = "file"
    USER = "user"
    ORGANIZATION = "organization"

class CommentType(str, Enum):
    COMMENT = "comment"
    NOTE = "note"
    REVIEW = "review"
    SUGGESTION = "suggestion"
    APPROVAL = "approval"
    REJECTION = "rejection"

class CommentReaction(BaseModel):
    """Comment reaction/emoji"""
    user_id: str = Field(..., description="User who reacted")
    emoji: str = Field(..., description="Reaction emoji")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CommentMention(BaseModel):
    """User mention in comment"""
    user_id: str = Field(..., description="Mentioned user ID")
    username: str = Field(..., description="Mentioned username")
    position: int = Field(..., description="Position in comment text")

class CommentBase(BaseModel):
    """Base comment model"""
    content: str = Field(..., min_length=1, max_length=5000, description="Comment content")
    type: CommentType = Field(default=CommentType.COMMENT, description="Comment type")
    
    # Entity relationship (polymorphic)
    entity_type: EntityType = Field(..., description="Type of entity being commented on")
    entity_id: str = Field(..., description="ID of the entity being commented on")
    
    # Authorship
    author_id: str = Field(..., description="Comment author user ID")
    
    # Threading
    parent_id: Optional[str] = Field(None, description="Parent comment ID for replies")
    thread_id: Optional[str] = Field(None, description="Root thread ID")
    
    # Content features
    mentions: List[CommentMention] = Field(default_factory=list, description="User mentions in comment")
    attachments: List[str] = Field(default_factory=list, description="File attachment IDs")
    
    # Metadata
    is_edited: bool = Field(default=False, description="Whether comment has been edited")
    edit_history: List[Dict] = Field(default_factory=list, description="Edit history")
    is_internal: bool = Field(default=False, description="Internal comment (not visible to external users)")
    is_pinned: bool = Field(default=False, description="Whether comment is pinned")

class CommentCreate(BaseCreateModel, CommentBase):
    """Comment creation model"""
    class Config:
        json_schema_extra = {
            "example": {
                "content": "This looks great! I think we should also consider adding validation for the email field. @johndoe what do you think?",
                "type": "comment",
                "entity_type": "task",
                "entity_id": "task-123",
                "author_id": "user-456",
                "mentions": [
                    {
                        "user_id": "user-789",
                        "username": "johndoe",
                        "position": 95
                    }
                ]
            }
        }

class CommentUpdate(BaseUpdateModel):
    """Comment update model"""
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    type: Optional[CommentType] = None
    attachments: Optional[List[str]] = None
    is_internal: Optional[bool] = None
    is_pinned: Optional[bool] = None

class Comment(BaseDBModel, CommentBase):
    """Comment response model"""
    # Computed fields
    reply_count: int = Field(default=0, description="Number of replies")
    reaction_count: int = Field(default=0, description="Total number of reactions")
    reactions: List[CommentReaction] = Field(default_factory=list, description="Comment reactions")
    
    # Resolved status for suggestions/reviews
    is_resolved: bool = Field(default=False, description="Whether comment/issue is resolved")
    resolved_by: Optional[str] = Field(None, description="User who resolved the comment")
    resolved_at: Optional[datetime] = Field(None, description="When comment was resolved")
    
    @property
    def is_reply(self) -> bool:
        return self.parent_id is not None
    
    @property
    def has_replies(self) -> bool:
        return self.reply_count > 0
    
    def get_reaction_count_by_emoji(self, emoji: str) -> int:
        """Get count of specific emoji reactions"""
        return len([r for r in self.reactions if r.emoji == emoji])

class CommentInDB(Comment):
    """Comment model as stored in database"""
    # Additional database fields
    search_content: str = Field(..., description="Searchable content (processed)")
    moderator_notes: Optional[str] = Field(None, description="Internal moderator notes")
    
class CommentSummary(BaseModel):
    """Lightweight comment model for lists"""
    id: str
    content: str
    type: CommentType
    entity_type: EntityType
    entity_id: str
    author_id: str
    created_at: datetime
    reply_count: int
    reaction_count: int
    is_edited: bool
    is_pinned: bool
    
    @property
    def preview_content(self) -> str:
        """Get preview of comment content (first 100 chars)"""
        return self.content[:100] + "..." if len(self.content) > 100 else self.content

class CommentThread(BaseModel):
    """Comment thread with nested replies"""
    root_comment: Comment
    replies: List[Comment] = Field(default_factory=list)
    total_replies: int = Field(default=0)
    
    @property
    def participant_count(self) -> int:
        """Number of unique participants in thread"""
        participants = {self.root_comment.author_id}
        participants.update(reply.author_id for reply in self.replies)
        return len(participants)

class CommentStats(BaseModel):
    """Comment statistics for an entity"""
    entity_type: EntityType
    entity_id: str
    total_comments: int = Field(default=0)
    total_threads: int = Field(default=0)
    participant_count: int = Field(default=0)
    recent_activity: Optional[datetime] = Field(None, description="Last comment timestamp")
    
    # Comment type breakdown
    comment_count: int = Field(default=0)
    note_count: int = Field(default=0)
    review_count: int = Field(default=0)
    suggestion_count: int = Field(default=0)