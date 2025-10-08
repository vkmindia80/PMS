#!/usr/bin/env python3
"""
Test script to verify geolocation functionality has been completely removed
"""

import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_geolocation_removal():
    """Verify all geolocation functionality has been removed"""
    try:
        logger.info("🧪 Testing geolocation removal...")
        
        # Connect to database
        await connect_to_mongo()
        db = await get_database()
        
        # Test 1: Check for any remaining geolocation fields in activities
        logger.info("Test 1: Checking activities collection for geolocation fields...")
        geo_activities = await db.activities.find({
            "$or": [
                {"latitude": {"$exists": True}},
                {"longitude": {"$exists": True}},
                {"geolocation_enabled": {"$exists": True}},
                {"location_accuracy": {"$exists": True}}
            ]
        }).to_list(length=10)
        
        if geo_activities:
            logger.error(f"❌ Found {len(geo_activities)} activities with geolocation data!")
            return False
        else:
            logger.info("✅ No geolocation fields found in activities")
        
        # Test 2: Check for geolocation preferences in users
        logger.info("Test 2: Checking users collection for geolocation preferences...")
        geo_users = await db.users.find({
            "$or": [
                {"geolocation_enabled": {"$exists": True}},
                {"location_sharing_scope": {"$exists": True}}
            ]
        }).to_list(length=10)
        
        if geo_users:
            logger.error(f"❌ Found {len(geo_users)} users with geolocation preferences!")
            return False
        else:
            logger.info("✅ No geolocation preferences found in users")
        
        # Test 3: Check for any other collections with geolocation data
        logger.info("Test 3: Checking other collections...")
        collections_to_check = ['projects', 'tasks', 'comments', 'files', 'teams']
        
        for collection_name in collections_to_check:
            try:
                collection = db[collection_name]
                geo_docs = await collection.find({
                    "$or": [
                        {"latitude": {"$exists": True}},
                        {"longitude": {"$exists": True}},
                        {"geolocation_enabled": {"$exists": True}}
                    ]
                }).to_list(length=1)
                
                if geo_docs:
                    logger.error(f"❌ Found geolocation data in {collection_name} collection!")
                    return False
                    
            except Exception as e:
                logger.warning(f"Could not check {collection_name}: {e}")
        
        logger.info("✅ No geolocation data found in any collection")
        
        logger.info("🎉 All geolocation removal tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error during geolocation removal test: {str(e)}")
        return False

async def main():
    """Main function"""
    try:
        success = await test_geolocation_removal()
        if success:
            logger.info("✅ Geolocation removal verification successful!")
            sys.exit(0)
        else:
            logger.error("❌ Geolocation removal verification failed!")
            sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())