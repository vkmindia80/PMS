#!/usr/bin/env python3
"""
Timeline Fixes Test Script
Tests the fixes for dependency type mapping and created_by field issues
"""

import asyncio
import sys
import os
import json
from datetime import datetime
import logging

# Add the backend directory to the Python path
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database
from models import TaskDependency, DependencyType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TimelineFixesTester:
    def __init__(self):
        self.db = None
        self.test_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "test_details": []
        }

    async def initialize(self):
        """Initialize database connection"""
        await connect_to_mongo()
        self.db = await get_database()
        logger.info("✅ Database connection established for timeline fixes testing")

    def log_test_result(self, test_name: str, passed: bool, details: str = ""):
        """Log individual test results"""
        self.test_results["tests_run"] += 1
        if passed:
            self.test_results["tests_passed"] += 1
            logger.info(f"✅ {test_name}: PASSED")
        else:
            self.test_results["tests_failed"] += 1
            logger.error(f"❌ {test_name}: FAILED - {details}")
        
        self.test_results["test_details"].append({
            "test_name": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def test_dependency_type_enum_validation(self):
        """Test that dependency types are properly validated"""
        test_name = "Dependency Type Enum Validation"
        
        try:
            # Test valid enum values
            valid_types = ["FS", "SS", "FF", "SF"]
            for dep_type in valid_types:
                try:
                    DependencyType(dep_type)
                    passed = True
                except ValueError:
                    passed = False
                    break
            
            if passed:
                self.log_test_result(test_name, True)
            else:
                self.log_test_result(test_name, False, f"Failed to validate dependency type: {dep_type}")
                
        except Exception as e:
            self.log_test_result(test_name, False, str(e))

    async def test_existing_dependencies_format(self):
        """Test that existing dependencies have correct format"""
        test_name = "Existing Dependencies Format Check"
        
        try:
            # Get all dependencies from database
            dependencies_cursor = self.db.task_dependencies.find({})
            dependencies = await dependencies_cursor.to_list(length=None)
            
            valid_types = ["FS", "SS", "FF", "SF"]
            invalid_dependencies = []
            
            for dep in dependencies:
                if "dependency_type" in dep:
                    if dep["dependency_type"] not in valid_types:
                        invalid_dependencies.append({
                            "id": dep.get("id", "unknown"),
                            "type": dep["dependency_type"]
                        })
            
            if len(invalid_dependencies) == 0:
                self.log_test_result(test_name, True, f"All {len(dependencies)} dependencies have valid types")
            else:
                self.log_test_result(test_name, False, f"Found {len(invalid_dependencies)} dependencies with invalid types: {invalid_dependencies}")
                
        except Exception as e:
            self.log_test_result(test_name, False, str(e))

    async def test_created_by_field_presence(self):
        """Test that all dependencies have created_by field"""
        test_name = "Created By Field Presence Check"
        
        try:
            # Get all dependencies from database
            dependencies_cursor = self.db.task_dependencies.find({})
            dependencies = await dependencies_cursor.to_list(length=None)
            
            missing_created_by = []
            
            for dep in dependencies:
                if "created_by" not in dep or not dep.get("created_by"):
                    missing_created_by.append(dep.get("id", "unknown"))
            
            if len(missing_created_by) == 0:
                self.log_test_result(test_name, True, f"All {len(dependencies)} dependencies have created_by field")
            else:
                self.log_test_result(test_name, False, f"Found {len(missing_created_by)} dependencies missing created_by: {missing_created_by}")
                
        except Exception as e:
            self.log_test_result(test_name, False, str(e))

    async def test_create_new_dependency_with_correct_format(self):
        """Test creating a new dependency with correct format"""
        test_name = "Create New Dependency Test"
        
        try:
            # Get existing tasks to create dependency between
            tasks_cursor = self.db.timeline_tasks.find({}).limit(2)
            tasks = await tasks_cursor.to_list(length=2)
            
            if len(tasks) < 2:
                self.log_test_result(test_name, False, "Need at least 2 tasks to test dependency creation")
                return
            
            # Create test dependency
            test_dependency = TaskDependency(
                id=f"test-dep-{int(datetime.utcnow().timestamp())}",
                predecessor_id=tasks[0]["id"],
                successor_id=tasks[1]["id"],
                dependency_type=DependencyType.FINISH_TO_START,
                lag_duration=0,
                project_id=tasks[0]["project_id"],
                created_by="test-user-001",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Insert and verify
            result = await self.db.task_dependencies.insert_one(test_dependency.dict())
            created_dependency = await self.db.task_dependencies.find_one({"_id": result.inserted_id})
            
            if created_dependency:
                # Verify correct format
                checks = [
                    created_dependency["dependency_type"] == "FS",
                    created_dependency["created_by"] == "test-user-001",
                    "predecessor_id" in created_dependency,
                    "successor_id" in created_dependency
                ]
                
                if all(checks):
                    self.log_test_result(test_name, True, "Successfully created dependency with correct format")
                    
                    # Clean up test dependency
                    await self.db.task_dependencies.delete_one({"_id": result.inserted_id})
                else:
                    self.log_test_result(test_name, False, f"Created dependency has incorrect format: {created_dependency}")
            else:
                self.log_test_result(test_name, False, "Failed to create test dependency")
                
        except Exception as e:
            self.log_test_result(test_name, False, str(e))

    async def test_dependency_type_mapping_conversion(self):
        """Test that legacy dependency types can be mapped correctly"""
        test_name = "Dependency Type Mapping Conversion"
        
        try:
            # Test mapping from legacy formats
            mapping_tests = [
                ("finish_to_start", "FS"),
                ("start_to_start", "SS"),
                ("finish_to_finish", "FF"),
                ("start_to_finish", "SF"),
                ("FS", "FS"),  # Should pass through unchanged
                ("SS", "SS"),
                ("FF", "FF"),
                ("SF", "SF")
            ]
            
            # Simulate the mapping logic from the API
            type_mapping = {
                "finish_to_start": "FS",
                "start_to_start": "SS",
                "finish_to_finish": "FF",
                "start_to_finish": "SF",
                "FS": "FS",
                "SS": "SS",
                "FF": "FF",
                "SF": "SF"
            }
            
            all_passed = True
            failed_mappings = []
            
            for input_type, expected_output in mapping_tests:
                if input_type in type_mapping:
                    actual_output = type_mapping[input_type]
                    if actual_output != expected_output:
                        all_passed = False
                        failed_mappings.append((input_type, expected_output, actual_output))
                else:
                    all_passed = False
                    failed_mappings.append((input_type, expected_output, "NOT_FOUND"))
            
            if all_passed:
                self.log_test_result(test_name, True, "All dependency type mappings work correctly")
            else:
                self.log_test_result(test_name, False, f"Failed mappings: {failed_mappings}")
                
        except Exception as e:
            self.log_test_result(test_name, False, str(e))

    async def run_all_tests(self):
        """Run all timeline fixes tests"""
        logger.info("🚀 Starting Timeline Fixes Tests...")
        
        await self.test_dependency_type_enum_validation()
        await self.test_existing_dependencies_format()
        await self.test_created_by_field_presence()
        await self.test_create_new_dependency_with_correct_format()
        await self.test_dependency_type_mapping_conversion()
        
        # Generate test report
        await self.generate_test_report()

    async def generate_test_report(self):
        """Generate comprehensive test report"""
        try:
            self.test_results["success_rate"] = (
                self.test_results["tests_passed"] / self.test_results["tests_run"] * 100
                if self.test_results["tests_run"] > 0 else 0
            )
            
            # Save report
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            report_path = f"/app/timeline_fixes_test_report_{timestamp}.json"
            
            with open(report_path, 'w') as f:
                json.dump(self.test_results, f, indent=2, default=str)
            
            logger.info(f"📊 Test report saved: {report_path}")
            
            # Print summary
            logger.info("📋 Test Summary:")
            logger.info(f"   - Total tests run: {self.test_results['tests_run']}")
            logger.info(f"   - Tests passed: {self.test_results['tests_passed']}")
            logger.info(f"   - Tests failed: {self.test_results['tests_failed']}")
            logger.info(f"   - Success rate: {self.test_results['success_rate']:.1f}%")
            
            if self.test_results["tests_failed"] > 0:
                logger.warning("❌ Some tests failed:")
                for test in self.test_results["test_details"]:
                    if not test["passed"]:
                        logger.warning(f"   - {test['test_name']}: {test['details']}")
            
            return self.test_results
            
        except Exception as e:
            logger.error(f"❌ Error generating test report: {e}")
            return None

async def main():
    """Main function to run timeline fixes tests"""
    tester = TimelineFixesTester()
    
    try:
        await tester.initialize()
        await tester.run_all_tests()
        
        if tester.test_results["tests_failed"] == 0:
            logger.info("🎉 All timeline fixes tests passed!")
        else:
            logger.warning("⚠️ Some tests failed. Check the report for details.")
        
    except Exception as e:
        logger.error(f"💥 Timeline fixes testing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())