"""
S3 File Storage Service

Provides file upload, download, and management functionality using AWS S3.
"""

import os
import uuid
import magic
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import HTTPException, UploadFile
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class FileUploadResult(BaseModel):
    file_id: str
    filename: str
    original_filename: str
    file_path: str
    size: int
    content_type: str
    checksum: str
    project_id: str
    uploaded_by: str
    uploaded_at: datetime

class S3Config:
    """S3 configuration settings"""
    def __init__(self):
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'enterprise-portfolio-files')
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        self.access_key_id = os.getenv('AWS_ACCESS_KEY_ID', 'your-access-key-id')
        self.secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY', 'your-secret-access-key')
        
        # File validation settings
        self.max_file_size = int(os.getenv('MAX_FILE_SIZE', 50 * 1024 * 1024))  # 50MB default
        self.allowed_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',  # Images
            '.pdf', '.doc', '.docx', '.txt', '.rtf',            # Documents
            '.xls', '.xlsx', '.csv',                           # Spreadsheets
            '.ppt', '.pptx',                                   # Presentations
            '.zip', '.tar', '.gz', '.rar',                     # Archives
            '.mp3', '.wav', '.ogg',                            # Audio
            '.mp4', '.avi', '.mov', '.mkv',                    # Video
            '.json', '.xml', '.yaml', '.yml'                   # Data files
        }
        
        self.allowed_mime_types = {
            # Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            # Documents
            'application/pdf', 'text/plain', 'text/rtf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            # Spreadsheets
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            # Presentations
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            # Archives
            'application/zip', 'application/x-tar', 'application/gzip', 'application/x-rar-compressed',
            # Audio
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            # Video
            'video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska',
            # Data
            'application/json', 'application/xml', 'text/xml', 'application/x-yaml'
        }

class S3FileService:
    """S3 file management service"""
    
    def __init__(self):
        self.config = S3Config()
        self._s3_client = None
        self._integration_configs = {}  # Cache for integration-specific configs
        
    @property
    def s3_client(self):
        """Lazy initialization of S3 client"""
        if self._s3_client is None:
            try:
                self._s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.config.access_key_id,
                    aws_secret_access_key=self.config.secret_access_key,
                    region_name=self.config.region
                )
            except NoCredentialsError:
                logger.error("AWS credentials not found")
                raise HTTPException(
                    status_code=500,
                    detail="Storage service configuration error"
                )
        return self._s3_client
    
    def _validate_file(self, file: UploadFile, content: bytes) -> None:
        """Validate file before upload"""
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Check file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in self.config.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_ext}' is not allowed"
            )
        
        # Check file size
        if len(content) > self.config.max_file_size:
            max_size_mb = self.config.max_file_size // (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum limit of {max_size_mb}MB"
            )
        
        # Validate MIME type using file content
        try:
            detected_mime = magic.from_buffer(content, mime=True)
            if detected_mime not in self.config.allowed_mime_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type '{detected_mime}' is not allowed"
                )
        except Exception as e:
            logger.warning(f"Could not detect MIME type: {e}")
            # Continue without MIME validation if detection fails
    
    def _generate_file_path(self, project_id: str, filename: str) -> Tuple[str, str]:
        """Generate unique file path and file ID"""
        file_id = str(uuid.uuid4())
        # Clean filename to prevent path issues
        clean_filename = "".join(c for c in filename if c.isalnum() or c in (' ', '.', '_', '-')).rstrip()
        file_path = f"projects/{project_id}/files/{file_id}_{clean_filename}"
        return file_path, file_id
    
    def _calculate_checksum(self, content: bytes) -> str:
        """Calculate SHA256 checksum of file content"""
        return hashlib.sha256(content).hexdigest()
    
    async def upload_file(
        self,
        file: UploadFile,
        project_id: str,
        uploaded_by: str,
        description: Optional[str] = None
    ) -> FileUploadResult:
        """Upload file to S3"""
        
        # Read file content
        content = await file.read()
        
        # Validate file
        self._validate_file(file, content)
        
        # Generate file path and calculate checksum
        file_path, file_id = self._generate_file_path(project_id, file.filename)
        checksum = self._calculate_checksum(content)
        
        # Detect content type
        try:
            content_type = magic.from_buffer(content, mime=True)
        except Exception:
            content_type = file.content_type or 'application/octet-stream'
        
        try:
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.config.bucket_name,
                Key=file_path,
                Body=content,
                ContentType=content_type,
                Metadata={
                    'original_filename': file.filename,
                    'project_id': project_id,
                    'uploaded_by': uploaded_by,
                    'file_id': file_id,
                    'description': description or '',
                    'checksum': checksum
                },
                ServerSideEncryption='AES256'  # Enable server-side encryption
            )
            
            logger.info(f"File uploaded successfully: {file_path}")
            
            return FileUploadResult(
                file_id=file_id,
                filename=file.filename,
                original_filename=file.filename,
                file_path=file_path,
                size=len(content),
                content_type=content_type,
                checksum=checksum,
                project_id=project_id,
                uploaded_by=uploaded_by,
                uploaded_at=datetime.utcnow()
            )
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            logger.error(f"S3 upload failed: {error_code} - {e}")
            
            if error_code == 'NoSuchBucket':
                raise HTTPException(
                    status_code=500,
                    detail="Storage bucket not configured properly"
                )
            elif error_code == 'AccessDenied':
                raise HTTPException(
                    status_code=500,
                    detail="Storage access denied"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to upload file to storage"
                )
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get file metadata from S3"""
        try:
            response = self.s3_client.head_object(
                Bucket=self.config.bucket_name,
                Key=file_path
            )
            
            return {
                'content_type': response.get('ContentType'),
                'content_length': response.get('ContentLength'),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag'),
                'metadata': response.get('Metadata', {})
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise HTTPException(status_code=404, detail="File not found")
            else:
                logger.error(f"Error getting file info: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Error retrieving file information"
                )
    
    def download_file_stream(self, file_path: str):
        """Get file stream for download"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.config.bucket_name,
                Key=file_path
            )
            
            def file_generator():
                try:
                    for chunk in response['Body'].iter_chunks(chunk_size=8192):
                        yield chunk
                except Exception as e:
                    logger.error(f"Error streaming file: {e}")
                    raise
                finally:
                    response['Body'].close()
            
            return file_generator(), response
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise HTTPException(status_code=404, detail="File not found")
            else:
                logger.error(f"Error downloading file: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Error downloading file"
                )
    
    def generate_presigned_url(
        self,
        file_path: str,
        expiration: int = 3600,
        operation: str = 'get_object'
    ) -> str:
        """Generate presigned URL for file access"""
        try:
            url = self.s3_client.generate_presigned_url(
                operation,
                Params={
                    'Bucket': self.config.bucket_name,
                    'Key': file_path
                },
                ExpiresIn=expiration
            )
            return url
            
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise HTTPException(
                status_code=500,
                detail="Error generating download URL"
            )
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from S3"""
        try:
            # Verify file exists
            self.get_file_info(file_path)
            
            # Delete the file
            self.s3_client.delete_object(
                Bucket=self.config.bucket_name,
                Key=file_path
            )
            
            logger.info(f"File deleted successfully: {file_path}")
            return True
            
        except HTTPException:
            # Re-raise HTTP exceptions (like 404)
            raise
        except ClientError as e:
            logger.error(f"Error deleting file: {e}")
            raise HTTPException(
                status_code=500,
                detail="Error deleting file"
            )
    
    def list_project_files(
        self,
        project_id: str,
        prefix: Optional[str] = None,
        max_keys: int = 100
    ) -> List[Dict[str, Any]]:
        """List files for a project"""
        try:
            list_prefix = f"projects/{project_id}/files/"
            if prefix:
                list_prefix += prefix
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.config.bucket_name,
                Prefix=list_prefix,
                MaxKeys=max_keys
            )
            
            files = []
            for obj in response.get('Contents', []):
                # Get additional metadata
                try:
                    head_response = self.s3_client.head_object(
                        Bucket=self.config.bucket_name,
                        Key=obj['Key']
                    )
                    metadata = head_response.get('Metadata', {})
                    
                    files.append({
                        'key': obj['Key'],
                        'filename': metadata.get('original_filename', os.path.basename(obj['Key'])),
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'etag': obj['ETag'],
                        'content_type': head_response.get('ContentType'),
                        'file_id': metadata.get('file_id'),
                        'uploaded_by': metadata.get('uploaded_by'),
                        'description': metadata.get('description', ''),
                        'checksum': metadata.get('checksum')
                    })
                except ClientError:
                    # If we can't get metadata, include basic info
                    files.append({
                        'key': obj['Key'],
                        'filename': os.path.basename(obj['Key']),
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'etag': obj['ETag']
                    })
            
            return files
            
        except ClientError as e:
            logger.error(f"Error listing files: {e}")
            raise HTTPException(
                status_code=500,
                detail="Error listing files"
            )
    
    def get_storage_stats(self, project_id: Optional[str] = None) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            prefix = f"projects/{project_id}/files/" if project_id else "projects/"
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.config.bucket_name,
                Prefix=prefix
            )
            
            total_files = 0
            total_size = 0
            file_types = {}
            
            for obj in response.get('Contents', []):
                total_files += 1
                total_size += obj['Size']
                
                # Count file types by extension
                filename = os.path.basename(obj['Key'])
                ext = os.path.splitext(filename)[1].lower()
                file_types[ext] = file_types.get(ext, 0) + 1
            
            return {
                'total_files': total_files,
                'total_size': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'file_types': file_types,
                'prefix': prefix
            }
            
        except ClientError as e:
            logger.error(f"Error getting storage stats: {e}")
            raise HTTPException(
                status_code=500,
                detail="Error retrieving storage statistics"
            )

# Global service instance
s3_service = S3FileService()

def get_s3_service() -> S3FileService:
    """Dependency to get S3 service instance"""
    return s3_service