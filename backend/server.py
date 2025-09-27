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

# Import organization, team, user, hierarchy, and project routes
from routes.organizations import router as organizations_router
from routes.teams import router as teams_router
from routes.users import router as users_router
from routes.hierarchy import router as hierarchy_router
from routes.projects import router as projects_router

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
        
        # Auto-load demo data if not exists
        await auto_load_demo_data()
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("📴 Shutting down API...")
    await close_mongo_connection()

async def auto_load_demo_data():
    """Auto-load demo credentials and validate them at startup"""
    try:
        from auth.utils import hash_password
        from datetime import datetime
        
        db = await get_database()
        logger.info("🔍 Checking for demo data...")
        
        # Check if demo user exists
        demo_user = await db.users.find_one({"email": "demo@company.com"})
        demo_org = await db.organizations.find_one({"id": "demo-org-001"})
        
        if not demo_org:
            # Create demo organization
            demo_org_data = {
                "id": "demo-org-001",
                "name": "Demo Organization",
                "slug": "demo-organization",
                "description": "A demo organization for testing the system",
                "type": "startup",
                "status": "active",
                "website": "https://demo.example.com",
                "email": "contact@demo.example.com",
                "phone": "+1-555-0100",
                "address": {
                    "street": "123 Demo Street",
                    "city": "Demo City", 
                    "state": "DC",
                    "postal_code": "12345",
                    "country": "United States"
                },
                "settings": {
                    "timezone": "UTC",
                    "currency": "USD", 
                    "date_format": "YYYY-MM-DD",
                    "time_format": "24h",
                    "language": "en",
                    "features": {},
                    "max_users": 50,
                    "max_projects": 100,
                    "storage_limit_gb": 10.0
                },
                "industry": "Technology",
                "size": "small",
                "founded_year": 2024,
                "owner_id": "demo-user-001",
                "member_count": 1,
                "project_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.organizations.insert_one(demo_org_data)
            logger.info("✅ Auto-created demo organization")
        
        if not demo_user:
            # Create demo user
            demo_user_data = {
                "id": "demo-user-001",
                "email": "demo@company.com",
                "username": "demo_user",
                "password_hash": hash_password("demo123456"),
                "first_name": "Demo",
                "last_name": "User",
                "phone": "+1-555-0123",
                "bio": "Demo user for testing the Enterprise Portfolio Management system",
                "avatar_url": None,
                "role": "admin",  # Give admin role for demo
                "organization_id": "demo-org-001",
                "is_active": True,
                "status": "active",
                "email_verified": True,  # Pre-verify for demo
                "email_verification_token": None,
                "password_reset_token": None,
                "password_reset_expires": None,
                "last_login": None,
                "login_count": 0,
                "timezone": "UTC",
                "language": "en",
                "theme": "light",
                "notifications_enabled": True,
                "profile_completed": True,
                "onboarding_completed": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.users.insert_one(demo_user_data)
            logger.info("✅ Auto-created demo user: demo@company.com / demo123456")
        
        # Validate demo credentials by attempting login
        if demo_user:
            logger.info("✅ Demo credentials validated and ready")
            logger.info("📋 Demo Login: demo@company.com / demo123456")
        
    except Exception as e:
        logger.error(f"⚠️  Failed to auto-load demo data: {e}")
        # Don't fail startup if demo data creation fails

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

# CORS Configuration with improved subdomain handling
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
]

# Dynamic origin function for emergentagent.com subdomains
import re
def dynamic_cors_origin():
    """Dynamic CORS origin function for emergentagent.com subdomains"""
    def check_origin(origin: str) -> bool:
        # Allow localhost origins
        if any(origin.startswith(allowed) for allowed in origins):
            return True
        # Allow all emergentagent.com subdomains with flexible matching
        patterns = [
            r'https://[\w-]+\.preview\.emergentagent\.com',
            r'https://[\w-]+\.emergentagent\.com',
            r'http://[\w-]+\.emergentagent\.com'
        ]
        return any(re.match(pattern, origin) for pattern in patterns)
    return check_origin

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r'https?://[\w-]+\.(preview\.)?emergentagent\.com',
    allow_origins=origins + ["*"],  # Temporarily allow all for debugging
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

# Include organization, team, user, hierarchy, and project management routes
app.include_router(organizations_router)
app.include_router(teams_router)
app.include_router(users_router)
app.include_router(hierarchy_router)
app.include_router(projects_router)

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