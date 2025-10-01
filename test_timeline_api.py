#!/usr/bin/env python3
"""
Test timeline API directly without authentication
"""

import sys
import asyncio
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database

async def test_timeline_api():
    """Test timeline API logic directly"""
    await connect_to_mongo()
    db = await get_database()
    
    project_id = "proj-628abf9b46fe"
    print(f"Testing timeline data for project: {project_id}")
    
    # Get timeline configuration
    timeline_config = await db.timeline_projects.find_one({"project_id": project_id})
    print(f"Timeline config: {'Found' if timeline_config else 'Not found'}")
    
    # Get all tasks
    tasks_cursor = db.timeline_tasks.find({"project_id": project_id})
    tasks = await tasks_cursor.to_list(length=None)
    print(f"Timeline tasks: {len(tasks)}")
    
    # Get all dependencies
    dependencies_cursor = db.task_dependencies.find({"project_id": project_id})
    dependencies = await dependencies_cursor.to_list(length=None)
    print(f"Dependencies: {len(dependencies)}")
    
    # Get calendars
    calendars_cursor = db.timeline_calendars.find({"project_id": project_id})
    calendars = await calendars_cursor.to_list(length=None)
    print(f"Calendars: {len(calendars)}")
    
    # Get baselines
    baselines_cursor = db.timeline_baselines.find({"project_id": project_id})
    baselines = await baselines_cursor.to_list(length=None)
    print(f"Baselines: {len(baselines)}")
    
    if tasks:
        print(f"\nSample tasks:")
        for i, task in enumerate(tasks[:3]):
            print(f"  {i+1}. {task['name']}")
            print(f"     Duration: {task['duration']}h")
            print(f"     Progress: {task['percent_complete']}%")
            print(f"     Start: {task['start_date']}")
            print(f"     Finish: {task['finish_date']}")
            print(f"     Critical: {task['critical']}")
            print(f"     Milestone: {task['milestone']}")
            print(f"     Color: {task['color']}")
            print()
    
    # Simulate the GanttChartData structure
    gantt_data = {
        "project_id": project_id,
        "tasks": tasks,
        "dependencies": dependencies,
        "timeline_config": timeline_config,
        "calendars": calendars,
        "baselines": baselines,
        "critical_path": []  # TODO: Calculate critical path
    }
    
    print(f"✅ Gantt data structure ready with {len(tasks)} tasks")
    return gantt_data

if __name__ == "__main__":
    asyncio.run(test_timeline_api())