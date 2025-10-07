"""
File Management Routes

Provides API endpoints for file upload, download, and management operations.
"""

from fastapi import APIRouter, HTTPException, Depends, status, File, UploadFile, Form, Query
from fastapi.responses import StreamingResponse, JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from database import get_database
from auth.middleware import get_current_user
from models import User, File as FileModel, FileCreate, FileUpdate, FileSummary
from services.s3_service import S3FileService, get_s3_service, FileUploadResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["files"])

# Helper function to check project access
async def verify_project_access(project_id: str, user: User, db) -> bool:
    """Verify user has access to the project"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["organization_id"] != user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied to this project")
    
    # Check if user is project member or has admin role
    if user.role in ["super_admin", "admin", "manager"]:
        return True
    
    if (user.id == project["owner_id"] or 
        user.id in project.get("team_members", [])):
        return True
    
    raise HTTPException(status_code=403, detail="Access denied to this project")

@router.post("/projects/{project_id}/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    s3_service: S3FileService = Depends(get_s3_service)
):
    """Upload a file to a project"""
    try:
        # Verify project access
        db = await get_database()
        await verify_project_access(project_id, current_user, db)
        
        # Upload file to S3
        upload_result = await s3_service.upload_file(
            file=file,
            project_id=project_id,
            uploaded_by=current_user.id,
            description=description,
            organization_id=current_user.organization_id
        )
        
        # Store file metadata in database
        file_data = {
            "id": upload_result.file_id,
            "name": upload_result.filename,
            "original_name": upload_result.original_filename,
            "description": description or "",
            "file_type": _determine_file_type(upload_result.content_type),
            "mime_type": upload_result.content_type,
            "size": upload_result.size,
            "checksum": upload_result.checksum,
            "file_path": upload_result.file_path,
            "storage_backend": "s3",
            "entity_type": "project",
            "entity_id": project_id,
            "uploaded_by": current_user.id,
            "status": "active",
            "version": 1,
            "is_public": False,
            "download_count": 0,
            "created_at": upload_result.uploaded_at,
            "updated_at": upload_result.uploaded_at
        }
        
        # Insert file record
        await db.files.insert_one(file_data)
        
        logger.info(f"File {upload_result.filename} uploaded by user {current_user.id} to project {project_id}")
        
        return JSONResponse(
            status_code=201,
            content={
                "message": "File uploaded successfully",
                "data": {
                    "file_id": upload_result.file_id,
                    "filename": upload_result.filename,
                    "size": upload_result.size,
                    "content_type": upload_result.content_type,
                    "project_id": project_id,
                    "uploaded_at": upload_result.uploaded_at.isoformat()
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="File upload failed"
        )

@router.get("/projects/{project_id}")
async def list_project_files(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    file_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """List files in a project"""
    try:
        # Verify project access
        db = await get_database()
        await verify_project_access(project_id, current_user, db)
        
        # Build query
        query = {
            "entity_type": "project",
            "entity_id": project_id,
            "status": {"$ne": "deleted"}
        }
        
        if file_type:
            query["file_type"] = file_type
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total_count = await db.files.count_documents(query)
        
        # Get files with pagination
        cursor = db.files.find(query).skip(skip).limit(limit).sort("created_at", -1)
        files = await cursor.to_list(length=limit)
        
        # Convert to response format
        file_list = []
        for file_doc in files:
            file_list.append({
                "id": file_doc["id"],
                "name": file_doc["name"],
                "description": file_doc.get("description", ""),
                "file_type": file_doc.get("file_type", "other"),
                "mime_type": file_doc.get("mime_type", "application/octet-stream"),
                "size": file_doc.get("size") or file_doc.get("file_size", 0),  # Handle both schemas
                "uploaded_by": file_doc["uploaded_by"],
                "download_count": file_doc.get("download_count", 0),
                "created_at": file_doc["created_at"].isoformat() if isinstance(file_doc["created_at"], datetime) else file_doc["created_at"],
                "updated_at": file_doc["updated_at"].isoformat() if isinstance(file_doc["updated_at"], datetime) else file_doc["updated_at"]
            })
        
        return {
            "files": file_list,
            "total_count": total_count,
            "page": skip // limit + 1,
            "total_pages": (total_count + limit - 1) // limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list files: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve files"
        )

@router.get("/projects/{project_id}/{file_id}/download")
async def download_file(
    project_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    s3_service: S3FileService = Depends(get_s3_service)
):
    """Download a file"""
    try:
        # Verify project access
        db = await get_database()
        await verify_project_access(project_id, current_user, db)
        
        # Get file metadata from database
        file_doc = await db.files.find_one({
            "id": file_id,
            "entity_type": "project",
            "entity_id": project_id,
            "status": {"$ne": "deleted"}
        })
        
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get file from S3
        file_generator, s3_response = s3_service.download_file_stream(file_doc["file_path"])
        
        # Update download count
        await db.files.update_one(
            {"id": file_id},
            {
                "$inc": {"download_count": 1},
                "$set": {"last_accessed": datetime.utcnow()}
            }
        )
        
        # Prepare response headers
        headers = {
            'Content-Disposition': f'attachment; filename="{file_doc["name"]}"',
        }
        
        if 'ContentLength' in s3_response:
            headers['Content-Length'] = str(s3_response['ContentLength'])
        
        return StreamingResponse(
            file_generator,
            media_type=file_doc["mime_type"],
            headers=headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File download failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="File download failed"
        )

@router.get("/projects/{project_id}/{file_id}/download-url")
async def get_download_url(
    project_id: str,
    file_id: str,
    expires_in: Optional[int] = Query(3600, ge=300, le=86400),
    current_user: User = Depends(get_current_user),
    s3_service: S3FileService = Depends(get_s3_service)
):
    """Generate a presigned URL for file download"""
    try:
        # Verify project access
        db = await get_database()
        await verify_project_access(project_id, current_user, db)
        
        # Get file metadata
        file_doc = await db.files.find_one({
            "id": file_id,
            "entity_type": "project",
            "entity_id": project_id,
            "status": {"$ne": "deleted"}
        })
        
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Generate presigned URL
        download_url = s3_service.generate_presigned_url(
            file_doc["file_path"],
            expiration=expires_in
        )
        
        return {
            "download_url": download_url,
            "expires_in": expires_in,
            "expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat(),
            "filename": file_doc["name"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate download URL: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate download URL"
        )

@router.delete("/projects/{project_id}/{file_id}")
async def delete_file(
    project_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    s3_service: S3FileService = Depends(get_s3_service)
):
    """Delete a file"""
    try:
        # Verify project access
        db = await get_database()
        await verify_project_access(project_id, current_user, db)
        
        # Get file metadata
        file_doc = await db.files.find_one({
            "id": file_id,
            "entity_type": "project",
            "entity_id": project_id,
            "status": {"$ne": "deleted"}
        })
        
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check permissions - only file uploader, project owner, or admins can delete
        if (current_user.id != file_doc["uploaded_by"] and 
            current_user.role not in ["super_admin", "admin", "manager"]):
            
            # Check if user is project owner
            project = await db.projects.find_one({"id": project_id})
            if current_user.id != project.get("owner_id"):
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions to delete this file"
                )
        
        # Delete from S3
        s3_service.delete_file(file_doc["file_path"])
        
        # Mark as deleted in database (soft delete)
        await db.files.update_one(
            {"id": file_id},
            {
                "$set": {
                    "status": "deleted",
                    "deleted_at": datetime.utcnow(),
                    "deleted_by": current_user.id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"File {file_doc['name']} deleted by user {current_user.id}")
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File deletion failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="File deletion failed"
        )

@router.get("/projects/{project_id}/{file_id}")
async def get_file_info(
    project_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get file information"""
    try:
        # Verify project access
        db = await get_database()
        await verify_project_access(project_id, current_user, db)
        
        # Get file metadata
        file_doc = await db.files.find_one({
            "id": file_id,
            "entity_type": "project",
            "entity_id": project_id,
            "status": {"$ne": "deleted"}
        })
        
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {
            "id": file_doc["id"],
            "name": file_doc["name"],
            "original_name": file_doc["original_name"],
            "description": file_doc.get("description", ""),
            "file_type": file_doc["file_type"],
            "mime_type": file_doc["mime_type"],
            "size": file_doc["size"],
            "checksum": file_doc.get("checksum"),
            "uploaded_by": file_doc["uploaded_by"],
            "download_count": file_doc.get("download_count", 0),
            "version": file_doc.get("version", 1),
            "created_at": file_doc["created_at"].isoformat() if isinstance(file_doc["created_at"], datetime) else file_doc["created_at"],
            "updated_at": file_doc["updated_at"].isoformat() if isinstance(file_doc["updated_at"], datetime) else file_doc["updated_at"],
            "last_accessed": file_doc.get("last_accessed").isoformat() if file_doc.get("last_accessed") else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get file info: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve file information"
        )

@router.get("/projects/{project_id}/stats")
async def get_project_file_stats(
    project_id: str,
    current_user: User = Depends(get_current_user),
    s3_service: S3FileService = Depends(get_s3_service)
):
    """Get file statistics for a project"""
    try:
        # Verify project access
        db = await get_database()
        await verify_project_access(project_id, current_user, db)
        
        # Get stats from database (handle both size and file_size fields)
        pipeline = [
            {
                "$match": {
                    "entity_type": "project",
                    "entity_id": project_id,
                    "status": {"$ne": "deleted"}
                }
            },
            {
                "$addFields": {
                    "file_size_unified": {"$ifNull": ["$size", {"$ifNull": ["$file_size", 0]}]}
                }
            },
            {
                "$group": {
                    "_id": "$file_type",
                    "count": {"$sum": 1},
                    "total_size": {"$sum": "$file_size_unified"}
                }
            }
        ]
        
        type_stats = await db.files.aggregate(pipeline).to_list(length=None)
        
        # Get total stats
        total_files = await db.files.count_documents({
            "entity_type": "project",
            "entity_id": project_id,
            "status": {"$ne": "deleted"}
        })
        
        total_size_cursor = db.files.aggregate([
            {
                "$match": {
                    "entity_type": "project",
                    "entity_id": project_id,
                    "status": {"$ne": "deleted"}
                }
            },
            {
                "$addFields": {
                    "file_size_unified": {"$ifNull": ["$size", {"$ifNull": ["$file_size", 0]}]}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_size": {"$sum": "$file_size_unified"}
                }
            }
        ])
        total_size_result = await total_size_cursor.to_list(length=1)
        total_size = total_size_result[0]["total_size"] if total_size_result else 0
        
        # Format type breakdown
        type_breakdown = {}
        for stat in type_stats:
            type_breakdown[stat["_id"]] = {
                "count": stat["count"],
                "size": stat["total_size"]
            }
        
        return {
            "project_id": project_id,
            "total_files": total_files,
            "total_size": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_type_breakdown": type_breakdown
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get file stats: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve file statistics"
        )

def _determine_file_type(mime_type: str) -> str:
    """Determine file type category from MIME type"""
    if mime_type.startswith('image/'):
        return 'image'
    elif mime_type.startswith('video/'):
        return 'video'
    elif mime_type.startswith('audio/'):
        return 'audio'
    elif mime_type in ['application/pdf', 'text/plain', 'text/rtf'] or 'document' in mime_type:
        return 'document'
    elif mime_type in ['application/zip', 'application/x-tar', 'application/gzip', 'application/x-rar-compressed']:
        return 'archive'
    elif mime_type in ['application/json', 'application/xml', 'text/xml', 'application/x-yaml']:
        return 'code'
    else:
        return 'other'