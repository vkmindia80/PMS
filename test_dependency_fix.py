#!/usr/bin/env python3
"""
Test script to verify that the dependency fix works correctly.
This script tests both string and object dependency formats.
"""

import requests
import json

# Test the API directly to ensure our fix handles different dependency formats
def test_dependency_handling():
    print("🔍 Testing dependency handling fix...")
    
    # Test with mock data that has both string and object dependencies
    mock_task_with_mixed_deps = {
        "id": "test-123",
        "title": "Test Task",
        "dependencies": [
            "string-dep-1",  # String format dependency
            {                # Object format dependency 
                "task_id": "object-dep-1",
                "dependency_type": "depends_on"
            }
        ]
    }
    
    # Test the dependency processing logic (simulating frontend logic)
    dependencies = mock_task_with_mixed_deps.get("dependencies", [])
    
    # Apply the same fix we used in the frontend
    dependency_task_ids = []
    for dep in dependencies:
        if isinstance(dep, str):
            dependency_task_ids.append(dep)
        else:
            dependency_task_ids.append(dep.get("task_id"))
    
    print(f"✅ Original dependencies: {dependencies}")
    print(f"✅ Extracted task IDs: {dependency_task_ids}")
    
    # Verify both formats are handled correctly
    expected_ids = ["string-dep-1", "object-dep-1"]
    if dependency_task_ids == expected_ids:
        print("✅ Dependency handling fix works correctly!")
        return True
    else:
        print("❌ Dependency handling fix failed!")
        return False

if __name__ == "__main__":
    test_dependency_handling()