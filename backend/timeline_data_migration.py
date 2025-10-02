#!/usr/bin/env python3
"""
Timeline Data Migration Script
Fixes common timeline data issues:
1. Dependency type format mismatches (finish_to_start vs FS)
2. Missing created_by fields in task dependencies
"""

import asyncio
import sys
import os
import logging
from datetime import datetime
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from models import DependencyType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TimelineDataMigrator:
    def __init__(self):
        self.db = None
        self.migration_stats = {
            "dependencies_checked": 0,
            "dependencies_fixed": 0,
            "created_by_fixed": 0,
            "dependency_type_fixed": 0,
            "errors": []
        }

    async def initialize(self):
        """Initialize database connection"""
        await connect_to_mongo()
        self.db = await get_database()
        logger.info("✅ Database connection established for timeline data migration")

    async def migrate_dependency_types(self):
        """Fix dependency type format mismatches"""
        logger.info("🔍 Checking task dependencies for type format issues...")
        
        try:
            # Get all task dependencies
            dependencies_cursor = self.db.task_dependencies.find({})
            dependencies = await dependencies_cursor.to_list(length=None)
            
            type_mapping = {
                "finish_to_start": "FS",
                "start_to_start": "SS", 
                "finish_to_finish": "FF",
                "start_to_finish": "SF"
            }
            
            for dependency in dependencies:
                self.migration_stats["dependencies_checked"] += 1
                updated = False
                
                # Fix dependency type if it's in wrong format
                if "dependency_type" in dependency:
                    current_type = dependency["dependency_type"]
                    
                    if current_type in type_mapping:
                        # Convert from long format to short format
                        new_type = type_mapping[current_type]
                        
                        await self.db.task_dependencies.update_one(
                            {"_id": dependency["_id"]},
                            {
                                "$set": {
                                    "dependency_type": new_type,
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        logger.info(f"✅ Fixed dependency type: {current_type} → {new_type} for dependency {dependency.get('id', 'unknown')}")
                        self.migration_stats["dependency_type_fixed"] += 1
                        updated = True
                
                # Fix missing created_by field
                if "created_by" not in dependency or not dependency.get("created_by"):
                    # Use demo user as default for existing dependencies
                    default_user = "demo-user-001"
                    
                    await self.db.task_dependencies.update_one(
                        {"_id": dependency["_id"]},
                        {
                            "$set": {
                                "created_by": default_user,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    
                    logger.info(f"✅ Added missing created_by field for dependency {dependency.get('id', 'unknown')}")
                    self.migration_stats["created_by_fixed"] += 1
                    updated = True
                
                if updated:
                    self.migration_stats["dependencies_fixed"] += 1
                    
        except Exception as e:
            error_msg = f"Error during dependency migration: {e}"
            logger.error(error_msg)
            self.migration_stats["errors"].append(error_msg)

    async def validate_data_integrity(self):
        """Validate the integrity of timeline data after migration"""
        logger.info("🔍 Validating timeline data integrity...")
        
        try:
            # Check for invalid dependency types
            invalid_types = await self.db.task_dependencies.find({
                "dependency_type": {
                    "$nin": ["FS", "SS", "FF", "SF"]
                }
            }).to_list(length=None)
            
            if invalid_types:
                logger.warning(f"⚠️ Found {len(invalid_types)} dependencies with invalid types")
                for dep in invalid_types:
                    logger.warning(f"   - Dependency {dep.get('id', 'unknown')}: {dep.get('dependency_type')}")
            
            # Check for missing created_by fields
            missing_created_by = await self.db.task_dependencies.find({
                "$or": [
                    {"created_by": {"$exists": False}},
                    {"created_by": None},
                    {"created_by": ""}
                ]
            }).to_list(length=None)
            
            if missing_created_by:
                logger.warning(f"⚠️ Found {len(missing_created_by)} dependencies missing created_by")
                for dep in missing_created_by:
                    logger.warning(f"   - Dependency {dep.get('id', 'unknown')}")
            
            # Check for circular dependencies
            dependencies = await self.db.task_dependencies.find({}).to_list(length=None)
            circular_deps = []
            
            for dep in dependencies:
                if dep.get("predecessor_id") == dep.get("successor_id"):
                    circular_deps.append(dep)
            
            if circular_deps:
                logger.warning(f"⚠️ Found {len(circular_deps)} circular dependencies")
                for dep in circular_deps:
                    logger.warning(f"   - Dependency {dep.get('id', 'unknown')}")
            
            logger.info("✅ Data integrity validation completed")
            
        except Exception as e:
            error_msg = f"Error during data validation: {e}"
            logger.error(error_msg)
            self.migration_stats["errors"].append(error_msg)

    async def generate_migration_report(self):
        """Generate migration report"""
        try:
            report = {
                "migration_timestamp": datetime.utcnow().isoformat(),
                "migration_type": "Timeline Data Fix",
                "statistics": self.migration_stats,
                "success": len(self.migration_stats["errors"]) == 0,
                "fixes_applied": {
                    "dependency_type_format": "Fixed long format dependency types to enum format (finish_to_start → FS)",
                    "missing_created_by": "Added default created_by field for existing dependencies",
                    "data_validation": "Validated data integrity and identified any remaining issues"
                }
            }
            
            # Save report
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            report_path = f"/app/timeline_migration_report_{timestamp}.json"
            
            import json
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"📊 Migration report saved: {report_path}")
            
            # Print summary
            logger.info("📋 Migration Summary:")
            logger.info(f"   - Dependencies checked: {self.migration_stats['dependencies_checked']}")
            logger.info(f"   - Dependencies fixed: {self.migration_stats['dependencies_fixed']}")
            logger.info(f"   - Dependency types fixed: {self.migration_stats['dependency_type_fixed']}")
            logger.info(f"   - Created_by fields added: {self.migration_stats['created_by_fixed']}")
            logger.info(f"   - Errors encountered: {len(self.migration_stats['errors'])}")
            
            if self.migration_stats["errors"]:
                logger.error("❌ Errors during migration:")
                for error in self.migration_stats["errors"]:
                    logger.error(f"   - {error}")
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Error generating migration report: {e}")
            return None

    async def run_migration(self):
        """Run the complete migration process"""
        try:
            logger.info("🚀 Starting Timeline Data Migration...")
            
            # Run migration steps
            await self.migrate_dependency_types()
            await self.validate_data_integrity()
            
            # Generate report
            report = await self.generate_migration_report()
            
            if report and report["success"]:
                logger.info("🎉 Timeline Data Migration Completed Successfully!")
            else:
                logger.warning("⚠️ Migration completed with some issues. Check the report for details.")
            
        except Exception as e:
            logger.error(f"💥 Migration failed: {e}")
            raise

async def main():
    """Main function to run timeline data migration"""
    migrator = TimelineDataMigrator()
    
    try:
        await migrator.initialize()
        await migrator.run_migration()
        logger.info("🎯 Timeline data migration completed!")
        
    except Exception as e:
        logger.error(f"💥 Timeline data migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())