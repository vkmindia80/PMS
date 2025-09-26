from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime
from .base import BaseDBModel, BaseCreateModel, BaseUpdateModel

class FileType(str, Enum):
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    CODE = "code"
    OTHER = "other"

class FileStatus(str, Enum):
    UPLOADING = "uploading"
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"
    PROCESSING = "processing"
    ERROR = "error"

class EntityType(str, Enum):
    """Types of entities that can have files"""
    PROJECT = "project"
    TASK = "task"
    COMMENT = "comment"
    USER = "user"
    ORGANIZATION = "organization"

class FilePermission(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    SHARE = "share"

class FileVersion(BaseModel):
    """File version information"""
    version: int = Field(..., description="Version number")
    file_path: str = Field(..., description="Path to version file")
    size: int = Field(..., description="File size in bytes")
    checksum: str = Field(..., description="File checksum")
    uploaded_by: str = Field(..., description="User who uploaded this version")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    comment: Optional[str] = Field(None, description="Version comment")

class FileMetadata(BaseModel):
    """Extended file metadata"""
    # Image metadata
    width: Optional[int] = Field(None, description="Image width in pixels")
    height: Optional[int] = Field(None, description="Image height in pixels")
    
    # Document metadata
    page_count: Optional[int] = Field(None, description="Number of pages")
    word_count: Optional[int] = Field(None, description="Number of words")
    
    # Media metadata
    duration: Optional[float] = Field(None, description="Duration in seconds")
    bitrate: Optional[int] = Field(None, description="Bitrate")
    
    # General metadata
    author: Optional[str] = Field(None, description="File author")
    title: Optional[str] = Field(None, description="File title")
    subject: Optional[str] = Field(None, description="File subject")
    keywords: List[str] = Field(default_factory=list, description="File keywords")
    
    # Technical metadata
    encoding: Optional[str] = Field(None, description="File encoding")
    compression: Optional[str] = Field(None, description="Compression type")

class FileAccess(BaseModel):
    """File access permissions"""
    user_id: str = Field(..., description="User ID")
    permissions: List[FilePermission] = Field(..., description="User permissions")
    granted_by: str = Field(..., description="Who granted the permissions")
    granted_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(None, description="Permission expiration")

class FileBase(BaseModel):
    """Base file model"""
    name: str = Field(..., min_length=1, max_length=255, description="File name")
    original_name: str = Field(..., description="Original uploaded file name")
    description: Optional[str] = Field(None, max_length=1000, description="File description")
    
    # File properties
    file_type: FileType = Field(..., description="File type category")
    mime_type: str = Field(..., description="MIME type")
    size: int = Field(..., ge=0, description="File size in bytes")
    checksum: str = Field(..., description="File checksum (SHA256)")
    
    # Storage information
    file_path: str = Field(..., description="Storage path")
    storage_backend: str = Field(default="local", description="Storage backend (local, s3, etc.)")
    
    # Entity relationship (polymorphic)
    entity_type: EntityType = Field(..., description="Type of entity this file belongs to")
    entity_id: str = Field(..., description="ID of the entity this file belongs to")
    
    # Ownership and access
    uploaded_by: str = Field(..., description="User who uploaded the file")
    access_permissions: List[FileAccess] = Field(default_factory=list, description="File access permissions")
    
    # Status and metadata
    status: FileStatus = Field(default=FileStatus.ACTIVE, description="File status")
    metadata: FileMetadata = Field(default_factory=FileMetadata, description="Extended file metadata")
    
    # Versioning
    version: int = Field(default=1, description="Current version number")
    versions: List[FileVersion] = Field(default_factory=list, description="File version history")
    
    # Organization
    tags: List[str] = Field(default_factory=list, description="File tags")
    folder: Optional[str] = Field(None, description="Folder/directory path")
    
    # Sharing and collaboration
    is_public: bool = Field(default=False, description="Whether file is publicly accessible")
    share_token: Optional[str] = Field(None, description="Public sharing token")
    share_expires_at: Optional[datetime] = Field(None, description="Share link expiration")
    
    # Processing
    processing_status: Optional[str] = Field(None, description="File processing status")
    thumbnail_path: Optional[str] = Field(None, description="Thumbnail image path")
    preview_available: bool = Field(default=False, description="Whether preview is available")

class FileCreate(BaseCreateModel, FileBase):
    """File creation model"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "project_mockup.png",
                "original_name": "Mobile App Mockup v1.png",
                "description": "Initial mockup for mobile application home screen",
                "file_type": "image",
                "mime_type": "image/png",
                "size": 1048576,
                "checksum": "abc123def456...",
                "file_path": "/uploads/2024/01/project_mockup.png",
                "entity_type": "project",
                "entity_id": "project-123",
                "uploaded_by": "user-456",
                "tags": ["mockup", "ui", "home-screen"]
            }
        }
    )

class FileUpdate(BaseUpdateModel):
    """File update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[FileStatus] = None
    access_permissions: Optional[List[FileAccess]] = None
    tags: Optional[List[str]] = None
    folder: Optional[str] = None
    is_public: Optional[bool] = None
    share_expires_at: Optional[datetime] = None

class File(BaseDBModel, FileBase):
    """File response model"""
    # Computed fields
    download_count: int = Field(default=0, description="Number of downloads")
    last_accessed: Optional[datetime] = Field(None, description="Last access timestamp")
    
    @property
    def size_mb(self) -> float:
        """File size in megabytes"""
        return self.size / (1024 * 1024)
    
    @property
    def is_image(self) -> bool:
        return self.file_type == FileType.IMAGE
    
    @property
    def is_document(self) -> bool:
        return self.file_type == FileType.DOCUMENT
    
    @property
    def has_preview(self) -> bool:
        return self.preview_available and self.thumbnail_path is not None
    
    def can_user_access(self, user_id: str, permission: FilePermission) -> bool:
        """Check if user has specific permission"""
        if self.uploaded_by == user_id:
            return True
        
        for access in self.access_permissions:
            if access.user_id == user_id and permission in access.permissions:
                if access.expires_at is None or access.expires_at > datetime.utcnow():
                    return True
        
        return self.is_public and permission == FilePermission.READ

class FileInDB(File):
    """File model as stored in database"""
    # Additional database fields
    virus_scan_status: Optional[str] = Field(None, description="Virus scan result")
    virus_scan_date: Optional[datetime] = Field(None, description="Last virus scan date")
    backup_status: Optional[str] = Field(None, description="Backup status")
    
class FileSummary(BaseModel):
    """Lightweight file model for lists"""
    id: str
    name: str
    file_type: FileType
    size: int
    uploaded_by: str
    created_at: datetime
    status: FileStatus
    download_count: int
    
    @property
    def size_formatted(self) -> str:
        """Human-readable file size"""
        if self.size < 1024:
            return f"{self.size} B"
        elif self.size < 1024 * 1024:
            return f"{self.size / 1024:.1f} KB"
        elif self.size < 1024 * 1024 * 1024:
            return f"{self.size / (1024 * 1024):.1f} MB"
        else:
            return f"{self.size / (1024 * 1024 * 1024):.1f} GB"

class FileStats(BaseModel):
    """File statistics for an entity"""
    entity_type: EntityType
    entity_id: str
    total_files: int = Field(default=0)
    total_size: int = Field(default=0)
    file_type_breakdown: Dict[FileType, int] = Field(default_factory=dict)
    recent_uploads: int = Field(default=0, description="Files uploaded in last 7 days")
    
    @property
    def total_size_mb(self) -> float:
        return self.total_size / (1024 * 1024)