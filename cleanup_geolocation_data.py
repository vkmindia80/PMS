#!/usr/bin/env python3
"""
Cleanup Geolocation Data Script
Removes all geolocation-related fields from existing database records
"""

import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def cleanup_geolocation_data():
    """Remove all geolocation-related fields from database records"""
    try:
        logger.info("🧹 Starting geolocation data cleanup...")
        
        # Connect to database
        await connect_to_mongo()
        db = await get_database()
        
        # Clean up activities collection
        logger.info("Cleaning up activities collection...")
        activities_result = await db.activities.update_many(
            {},
            {
                "$unset": {
                    "latitude": "",
                    "longitude": "",
                    "location_accuracy": "",
                    "geolocation_enabled": "",
                    "location_timestamp": ""
                }
            }
        )
        logger.info(f"✅ Updated {activities_result.modified_count} activity records")
        
        # Clean up users collection - remove geolocation preferences
        logger.info("Cleaning up user preferences...")
        users_result = await db.users.update_many(
            {},
            {
                "$unset": {
                    "geolocation_enabled": "",
                    "location_sharing_scope": ""
                }
            }
        )
        logger.info(f"✅ Updated {users_result.modified_count} user records")
        
        # Clean up any other collections that might have geolocation data
        collections_to_check = ['projects', 'tasks', 'comments', 'files']
        for collection_name in collections_to_check:
            logger.info(f"Checking {collection_name} collection...")
            collection = db[collection_name]
            result = await collection.update_many(
                {},
                {
                    "$unset": {
                        "latitude": "",
                        "longitude": "",
                        "location_accuracy": "",
                        "geolocation_enabled": "",
                        "location_data": ""
                    }
                }
            )
            if result.modified_count > 0:
                logger.info(f"✅ Cleaned up {result.modified_count} records in {collection_name}")
        
        # Verify cleanup
        logger.info("🔍 Verifying cleanup...")
        
        # Count remaining geolocation fields
        geo_activities = await db.activities.count_documents({
            "$or": [
                {"latitude": {"$exists": True}},
                {"longitude": {"$exists": True}},
                {"geolocation_enabled": {"$exists": True}}
            ]
        })
        
        geo_users = await db.users.count_documents({
            "$or": [
                {"geolocation_enabled": {"$exists": True}},
                {"location_sharing_scope": {"$exists": True}}
            ]
        })
        
        if geo_activities == 0 and geo_users == 0:
            logger.info("✅ Geolocation data cleanup completed successfully!")
            logger.info("📊 Summary:")
            logger.info(f"   - Activities cleaned: {activities_result.modified_count}")
            logger.info(f"   - Users cleaned: {users_result.modified_count}")
            logger.info("   - No remaining geolocation fields found")
        else:
            logger.warning(f"⚠️  Some geolocation data may remain:")
            logger.warning(f"   - Activities with geo data: {geo_activities}")
            logger.warning(f"   - Users with geo settings: {geo_users}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error during geolocation cleanup: {str(e)}")
        return False

async def main():
    """Main function"""
    try:
        success = await cleanup_geolocation_data()
        if success:
            logger.info("🎉 Geolocation cleanup completed!")
            sys.exit(0)
        else:
            logger.error("💥 Geolocation cleanup failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("🛑 Cleanup interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())