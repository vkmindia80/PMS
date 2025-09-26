from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None

# Global database instance
db_instance = Database()

async def connect_to_mongo():
    """Create database connection with connection pooling"""
    try:
        # Connection settings with pooling
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        database_name = os.getenv("DATABASE_NAME", "enterprise_portfolio_db")
        
        # Create client with connection pooling settings
        db_instance.client = AsyncIOMotorClient(
            mongo_url,
            maxPoolSize=10,  # Maximum number of connections in the pool
            minPoolSize=1,   # Minimum number of connections in the pool
            maxIdleTimeMS=30000,  # Close connections after 30 seconds of inactivity
            waitQueueTimeoutMS=5000,  # Wait up to 5 seconds for a connection
            serverSelectionTimeoutMS=5000,  # Wait up to 5 seconds to select a server
        )
        
        # Get database instance
        db_instance.database = db_instance.client[database_name]
        
        # Test connection
        await db_instance.client.admin.command('ping')
        logger.info(f"✅ Connected to MongoDB: {database_name}")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if db_instance.client:
        db_instance.client.close()
        logger.info("✅ MongoDB connection closed")

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    if db_instance.database is None:
        raise Exception("Database not initialized. Call connect_to_mongo() first.")
    return db_instance.database

async def create_indexes():
    """Create database indexes for optimal performance"""
    try:
        db = await get_database()
        
        # Users collection indexes
        user_indexes = [
            IndexModel([("email", 1)], unique=True),
            IndexModel([("username", 1)], unique=True),
            IndexModel([("organization_id", 1)]),
            IndexModel([("role", 1)]),
            IndexModel([("is_active", 1)]),
            IndexModel([("created_at", -1)]),
        ]
        await db.users.create_indexes(user_indexes)
        
        # Organizations collection indexes
        org_indexes = [
            IndexModel([("name", 1)]),
            IndexModel([("slug", 1)], unique=True),
            IndexModel([("is_active", 1)]),
            IndexModel([("created_at", -1)]),
        ]
        await db.organizations.create_indexes(org_indexes)
        
        # Projects collection indexes
        project_indexes = [
            IndexModel([("organization_id", 1)]),
            IndexModel([("name", 1)]),
            IndexModel([("status", 1)]),
            IndexModel([("priority", 1)]),
            IndexModel([("owner_id", 1)]),
            IndexModel([("team_members", 1)]),
            IndexModel([("created_at", -1)]),
            IndexModel([("due_date", 1)]),
            IndexModel([("organization_id", 1), ("status", 1)]),  # Compound index
        ]
        await db.projects.create_indexes(project_indexes)
        
        # Tasks collection indexes
        task_indexes = [
            IndexModel([("project_id", 1)]),
            IndexModel([("assignee_id", 1)]),
            IndexModel([("status", 1)]),
            IndexModel([("priority", 1)]),
            IndexModel([("due_date", 1)]),
            IndexModel([("created_at", -1)]),
            IndexModel([("project_id", 1), ("status", 1)]),  # Compound index
            IndexModel([("assignee_id", 1), ("status", 1)]),  # Compound index
        ]
        await db.tasks.create_indexes(task_indexes)
        
        # Teams collection indexes
        team_indexes = [
            IndexModel([("organization_id", 1)]),
            IndexModel([("name", 1)]),
            IndexModel([("lead_id", 1)]),
            IndexModel([("members", 1)]),
        ]
        await db.teams.create_indexes(team_indexes)
        
        # Comments collection indexes
        comment_indexes = [
            IndexModel([("entity_type", 1), ("entity_id", 1)]),  # For polymorphic relations
            IndexModel([("author_id", 1)]),
            IndexModel([("created_at", -1)]),
            IndexModel([("parent_id", 1)]),  # For threaded comments
        ]
        await db.comments.create_indexes(comment_indexes)
        
        # Files collection indexes
        file_indexes = [
            IndexModel([("entity_type", 1), ("entity_id", 1)]),  # For polymorphic relations
            IndexModel([("uploaded_by", 1)]),
            IndexModel([("file_type", 1)]),
            IndexModel([("created_at", -1)]),
            IndexModel([("name", "text")]),  # Text search on file names
        ]
        await db.files.create_indexes(file_indexes)
        
        # Notifications collection indexes
        notification_indexes = [
            IndexModel([("user_id", 1)]),
            IndexModel([("is_read", 1)]),
            IndexModel([("created_at", -1)]),
            IndexModel([("notification_type", 1)]),
            IndexModel([("user_id", 1), ("is_read", 1)]),  # Compound index
        ]
        await db.notifications.create_indexes(notification_indexes)
        
        logger.info("✅ Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to create indexes: {e}")
        raise