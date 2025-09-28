#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import connect_to_mongo, get_database

async def debug_resource_data():
    """Debug the resource management data"""
    try:
        await connect_to_mongo()
        db = await get_database()
        
        # Check organization
        org = await db.organizations.find_one({"id": "demo-org-001"})
        print(f"Organization: {org['name'] if org else 'None'}")
        
        # Check users
        users = await db.users.find({"organization_id": "demo-org-001"}).to_list(length=None)
        print(f"Users in org: {len(users)}")
        for user in users[:3]:
            print(f"  - {user.get('first_name', '')} {user.get('last_name', '')} ({user['role']})")
        
        # Check teams
        teams = await db.teams.find({"organization_id": "demo-org-001"}).to_list(length=None)
        print(f"Teams in org: {len(teams)}")
        for team in teams:
            print(f"  - {team['name']}")
        
        # Check projects
        projects = await db.projects.find({"organization_id": "demo-org-001"}).to_list(length=None)
        print(f"Projects in org: {len(projects)}")
        project_ids = [p["id"] for p in projects]
        for project in projects[:3]:
            print(f"  - {project['name']} (ID: {project['id']})")
        
        # Check tasks
        all_tasks = await db.tasks.find({}).to_list(length=None)
        print(f"Total tasks in DB: {len(all_tasks)}")
        
        # Filter tasks by organization projects
        org_tasks = [t for t in all_tasks if t.get("project_id") in project_ids]
        print(f"Tasks for org projects: {len(org_tasks)}")
        
        # Check task-project relationships
        project_task_map = {}
        for task in org_tasks:
            proj_id = task.get("project_id")
            if proj_id not in project_task_map:
                project_task_map[proj_id] = 0
            project_task_map[proj_id] += 1
        
        print("Tasks per project:")
        for proj_id, count in project_task_map.items():
            proj_name = next((p['name'] for p in projects if p['id'] == proj_id), "Unknown")
            print(f"  - {proj_name}: {count} tasks")
        
        # Check task assignments
        assigned_tasks = [t for t in org_tasks if t.get("assignee_id")]
        print(f"Assigned tasks: {len(assigned_tasks)}")
        
        # Check user workloads
        for user in users[:5]:
            user_tasks = [t for t in org_tasks if t.get("assignee_id") == user["id"]]
            active_tasks = [t for t in user_tasks if t.get("status") in ["todo", "in_progress"]]
            print(f"  - {user.get('first_name', '')} {user.get('last_name', '')}: {len(active_tasks)} active tasks")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_resource_data())