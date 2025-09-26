from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import uvicorn
import logging

# Import database connection
from database import connect_to_mongo, close_mongo_connection, get_database

# Import authentication routes
from auth.routes import router as auth_router

# Import organization and team routes
from routes.organizations import router as organizations_router
from routes.teams import router as teams_router

# Import models
from models import (
    User, UserCreate, UserUpdate, UserInDB,
    Organization, OrganizationCreate, OrganizationUpdate, OrganizationInDB,
    Project, ProjectCreate, ProjectUpdate, ProjectInDB, ProjectStatus, ProjectPriority,
    Task, TaskCreate, TaskUpdate, TaskInDB, TaskStatus, TaskPriority,
    Team, TeamCreate, TeamUpdate, TeamInDB,
    Comment, CommentCreate, CommentUpdate, CommentInDB,
    File, FileCreate, FileUpdate, FileInDB,
    Notification, NotificationCreate, NotificationUpdate, NotificationInDB
)

# Load environment variables
load_dotenv()

# Add JWT secret key to environment if not present
if not os.getenv("JWT_SECRET_KEY"):
    import secrets
    jwt_secret = secrets.token_urlsafe(32)
    # In production, this should be set in environment variables
    os.environ["JWT_SECRET_KEY"] = jwt_secret

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Enterprise Portfolio Management API...")
    try:
        await connect_to_mongo()
        logger.info("✅ Database connection established")
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("📴 Shutting down API...")
    await close_mongo_connection()

# Create FastAPI app
app = FastAPI(
    title="Enterprise Portfolio Management API",
    description="A comprehensive SaaS platform for portfolio and project management with advanced features including multi-tenant architecture, real-time collaboration, and AI-powered insights.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Security
security = HTTPBearer()

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:3004",
    "http://127.0.0.1:3005",
    "https://login-api-debug.preview.emergentagent.com",
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

# Add support for all emergentagent.com subdomains in production
import re
def is_allowed_origin(origin: str) -> bool:
    """Check if origin is allowed including emergentagent.com subdomains"""
    if origin in origins:
        return True
    # Allow all emergentagent.com subdomains
    if re.match(r'https?://[\w-]+\.emergentagent\.com$', origin):
        return True
    return False

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r'https?://[\w-]+\.emergentagent\.com$',
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

# Include organization and team management routes
app.include_router(organizations_router)
app.include_router(teams_router)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint with database status"""
    try:
        db = await get_database()
        # Test database connection
        await db.command("ping")
        
        return {
            "status": "healthy",
            "service": "Enterprise Portfolio Management API",
            "version": "1.0.0",
            "database": "connected",
            "features": [
                "Multi-tenant Architecture",
                "Real-time Collaboration",
                "Advanced Analytics",
                "AI-Powered Insights",
                "Enterprise Security"
            ]
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "degraded",
            "service": "Enterprise Portfolio Management API",
            "version": "1.0.0",
            "database": "disconnected",
            "error": str(e)
        }

# Root endpoint
@app.get("/api/")
async def root():
    """API root endpoint with feature overview"""
    return {
        "message": "Welcome to Enterprise Portfolio Management API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/health",
        "features": {
            "user_management": "Complete user authentication and authorization",
            "organization_management": "Multi-tenant organization support",
            "project_management": "Comprehensive project lifecycle management",
            "task_management": "Advanced task tracking and dependencies",
            "team_collaboration": "Real-time team collaboration tools",
            "file_management": "Secure file storage and version control",
            "commenting_system": "Threaded comments and discussions",
            "notifications": "Real-time notification system",
            "analytics": "Advanced reporting and analytics",
            "api_access": "Full REST API access"
        },
        "endpoints": {
            "users": "/api/users",
            "organizations": "/api/organizations", 
            "projects": "/api/projects",
            "tasks": "/api/tasks",
            "teams": "/api/teams",
            "comments": "/api/comments",
            "files": "/api/files",
            "notifications": "/api/notifications"
        }
    }

# Database status endpoint
@app.get("/api/database/status")
async def database_status():
    """Get database connection and statistics"""
    try:
        db = await get_database()
        
        # Get database statistics
        stats = await db.command("dbStats")
        
        # Get collection counts
        collections = await db.list_collection_names()
        collection_stats = {}
        
        for collection_name in collections:
            if collection_name in ['users', 'organizations', 'projects', 'tasks', 'teams', 'comments', 'files', 'notifications']:
                count = await db[collection_name].count_documents({})
                collection_stats[collection_name] = count
        
        return {
            "status": "connected",
            "database_name": db.name,
            "collections": collections,
            "collection_counts": collection_stats,
            "database_size_mb": round(stats.get("dataSize", 0) / (1024 * 1024), 2),
            "indexes": {
                "total": stats.get("indexes", 0),
                "size_mb": round(stats.get("indexSize", 0) / (1024 * 1024), 2)
            }
        }
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}"
        )

# Models info endpoint
@app.get("/api/models/info")
async def models_info():
    """Get information about available data models"""
    return {
        "models": {
            "User": {
                "description": "User accounts with role-based access control",
                "roles": ["super_admin", "admin", "manager", "team_lead", "member", "viewer"],
                "features": ["Authentication", "Authorization", "Profile Management", "Preferences"]
            },
            "Organization": {
                "description": "Multi-tenant organization management",
                "types": ["startup", "small_business", "medium_enterprise", "large_enterprise"],
                "features": ["Multi-tenancy", "Settings", "Branding", "User Management"]
            },
            "Project": {
                "description": "Comprehensive project management",
                "statuses": ["planning", "active", "on_hold", "completed", "cancelled", "archived"],
                "features": ["Milestones", "Budget Tracking", "Team Management", "Progress Tracking"]
            },
            "Task": {
                "description": "Advanced task tracking with dependencies",
                "statuses": ["todo", "in_progress", "in_review", "blocked", "completed", "cancelled"],
                "features": ["Time Tracking", "Dependencies", "Subtasks", "Custom Fields"]
            },
            "Team": {
                "description": "Team organization and collaboration",
                "types": ["development", "design", "marketing", "sales", "support", "operations"],
                "features": ["Role Management", "Skills Tracking", "Performance Metrics"]
            },
            "Comment": {
                "description": "Threaded comments and discussions",
                "types": ["comment", "note", "review", "suggestion", "approval"],
                "features": ["Threading", "Mentions", "Reactions", "Attachments"]
            },
            "File": {
                "description": "Secure file management with versioning",
                "types": ["document", "image", "video", "audio", "archive", "code"],
                "features": ["Versioning", "Access Control", "Metadata", "Preview"]
            },
            "Notification": {
                "description": "Real-time notification system",
                "channels": ["in_app", "email", "push", "sms", "webhook"],
                "features": ["Preferences", "Scheduling", "Actions", "Delivery Tracking"]
            }
        },
        "relationships": {
            "Organization → Users": "One-to-many (users belong to organization)",
            "Organization → Projects": "One-to-many (projects belong to organization)", 
            "Organization → Teams": "One-to-many (teams belong to organization)",
            "Project → Tasks": "One-to-many (tasks belong to project)",
            "Project → Team Members": "Many-to-many (projects have team members)",
            "Task → Assignee": "Many-to-one (tasks assigned to user)",
            "Task → Dependencies": "Many-to-many (task dependencies)",
            "Entity → Comments": "Polymorphic (comments on any entity)",
            "Entity → Files": "Polymorphic (files attached to any entity)",
            "User → Notifications": "One-to-many (users receive notifications)"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )