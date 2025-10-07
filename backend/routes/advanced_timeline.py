"""
Advanced Timeline Routes
API endpoints for advanced Gantt chart features including:
- Critical Path Method (CPM)
- Resource Leveling
- Baseline Management
- Export capabilities
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from typing import List, Optional
from datetime import datetime
import logging

from database import get_database
from auth.middleware import get_current_user
from models import User
from services.critical_path_service import critical_path_service
from services.resource_leveling_service import resource_leveling_service
from services.baseline_service import baseline_service
from services.gantt_export_service import gantt_export_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/timeline", tags=["Advanced Timeline"])


# ============================================================================
# CRITICAL PATH METHOD (CPM) ENDPOINTS
# ============================================================================

@router.get("/projects/{project_id}/critical-path")
async def calculate_critical_path(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Calculate critical path for a project using CPM algorithm
    
    Returns:
    - Critical path task IDs
    - Float time analysis for all tasks
    - Schedule optimization suggestions
    """
    try:
        db = await get_database()
        
        # Fetch tasks
        tasks_cursor = db.tasks.find({'project_id': project_id})
        tasks = await tasks_cursor.to_list(length=1000)
        
        if not tasks:
            return {
                'project_id': project_id,
                'critical_path': [],
                'task_analysis': {},
                'message': 'No tasks found for this project'
            }
        
        # Fetch dependencies
        deps_cursor = db.task_dependencies.find({'project_id': project_id})
        dependencies = await deps_cursor.to_list(length=1000)
        
        # Calculate critical path
        cpm_result = critical_path_service.calculate_critical_path(tasks, dependencies)
        
        return {
            'project_id': project_id,
            **cpm_result,
            'calculated_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error calculating critical path: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/optimize-schedule")
async def optimize_project_schedule(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Optimize project schedule using advanced algorithms
    
    Provides suggestions for:
    - Fast-tracking opportunities
    - Crashing critical path tasks
    - Task parallelization
    """
    try:
        db = await get_database()
        
        # Fetch tasks and dependencies
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        dependencies = await db.task_dependencies.find({'project_id': project_id}).to_list(length=1000)
        
        if not tasks:
            raise HTTPException(status_code=404, detail="No tasks found")
        
        # Run optimization
        optimization_result = critical_path_service.optimize_schedule(tasks, dependencies)
        
        return {
            'project_id': project_id,
            **optimization_result,
            'optimized_at': datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error optimizing schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RESOURCE LEVELING ENDPOINTS
# ============================================================================

@router.get("/projects/{project_id}/resource-conflicts")
async def detect_resource_conflicts(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Detect resource over-allocation and conflicts
    
    Returns:
    - List of conflicts with affected resources
    - Resource utilization percentages
    - Timeline view of conflicts
    """
    try:
        db = await get_database()
        
        # Fetch tasks
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        
        # Fetch users/resources
        # Get unique assignee IDs from tasks
        assignee_ids = set()
        for task in tasks:
            assignee_ids.update(task.get('assignee_ids', []))
        
        resources = []
        if assignee_ids:
            resources = await db.users.find({'id': {'$in': list(assignee_ids)}}).to_list(length=1000)
        
        # Detect conflicts
        conflict_analysis = resource_leveling_service.detect_resource_conflicts(tasks, resources)
        
        return {
            'project_id': project_id,
            **conflict_analysis,
            'analyzed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error detecting resource conflicts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/level-resources")
async def level_project_resources(
    project_id: str,
    apply_changes: bool = Query(False, description="Apply suggested changes automatically"),
    current_user: User = Depends(get_current_user)
):
    """
    Level resources by rescheduling tasks to resolve conflicts
    
    Query Parameters:
    - apply_changes: If true, automatically apply suggested changes
    
    Returns:
    - Suggested task reschedules
    - Conflicts resolved count
    """
    try:
        db = await get_database()
        
        # Fetch data
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        assignee_ids = set()
        for task in tasks:
            assignee_ids.update(task.get('assignee_ids', []))
        
        resources = []
        if assignee_ids:
            resources = await db.users.find({'id': {'$in': list(assignee_ids)}}).to_list(length=1000)
        
        # Get CPM analysis for float data
        dependencies = await db.task_dependencies.find({'project_id': project_id}).to_list(length=1000)
        cpm_analysis = critical_path_service.calculate_critical_path(tasks, dependencies)
        
        # Level resources
        leveling_result = resource_leveling_service.level_resources(
            tasks, resources, cpm_analysis
        )
        
        # Apply changes if requested
        if apply_changes and leveling_result.get('suggested_changes'):
            applied_changes = []
            for change in leveling_result['suggested_changes']:
                task_id = change['task_id']
                new_start = datetime.fromisoformat(change['suggested_start'])
                
                # Update task in database
                result = await db.tasks.update_one(
                    {'id': task_id},
                    {'$set': {
                        'start_date': new_start,
                        'updated_at': datetime.utcnow()
                    }}
                )
                
                if result.modified_count > 0:
                    applied_changes.append(task_id)
            
            leveling_result['applied_changes'] = applied_changes
            leveling_result['changes_applied'] = len(applied_changes)
        
        return {
            'project_id': project_id,
            **leveling_result,
            'leveled_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error leveling resources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/workload-analysis")
async def analyze_project_workload(
    project_id: str,
    time_period_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze workload distribution across resources
    
    Returns:
    - Daily workload per resource
    - Peak and underutilized periods
    - Workload balance score
    """
    try:
        db = await get_database()
        
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        assignee_ids = set()
        for task in tasks:
            assignee_ids.update(task.get('assignee_ids', []))
        
        resources = []
        if assignee_ids:
            resources = await db.users.find({'id': {'$in': list(assignee_ids)}}).to_list(length=1000)
        
        workload_analysis = resource_leveling_service.analyze_workload_distribution(
            tasks, resources, time_period_days
        )
        
        return {
            'project_id': project_id,
            **workload_analysis,
            'analyzed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analyzing workload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/resource-reallocation-suggestions")
async def get_reallocation_suggestions(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get suggestions for optimal resource reallocation
    """
    try:
        db = await get_database()
        
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        assignee_ids = set()
        for task in tasks:
            assignee_ids.update(task.get('assignee_ids', []))
        
        resources = []
        if assignee_ids:
            resources = await db.users.find({'id': {'$in': list(assignee_ids)}}).to_list(length=1000)
        
        suggestions = resource_leveling_service.suggest_resource_reallocation(tasks, resources)
        
        return {
            'project_id': project_id,
            'suggestions': suggestions,
            'total_suggestions': len(suggestions),
            'generated_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating reallocation suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# BASELINE MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/projects/{project_id}/baselines")
async def create_project_baseline(
    project_id: str,
    baseline_name: str,
    description: str = "",
    current_user: User = Depends(get_current_user)
):
    """
    Create a new baseline snapshot of the project
    """
    try:
        db = await get_database()
        
        # Fetch current tasks
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        
        if not tasks:
            raise HTTPException(status_code=404, detail="No tasks found to baseline")
        
        # Create baseline
        baseline = baseline_service.create_baseline(
            project_id, tasks, baseline_name, description
        )
        
        # Store baseline in database
        await db.baselines.insert_one(baseline)
        
        return {
            'success': True,
            'baseline': baseline,
            'message': f"Baseline '{baseline_name}' created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating baseline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/baselines")
async def list_project_baselines(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    List all baselines for a project
    """
    try:
        db = await get_database()
        
        baselines = await db.baselines.find(
            {'project_id': project_id}
        ).sort('baseline_date', -1).to_list(length=100)
        
        return {
            'project_id': project_id,
            'baselines': baselines,
            'total_count': len(baselines)
        }
        
    except Exception as e:
        logger.error(f"Error listing baselines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/baselines/{baseline_id}/variance-analysis")
async def analyze_baseline_variance(
    baseline_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze variance between baseline and current schedule
    
    Returns:
    - Task-by-task variance analysis
    - EVM (Earned Value Management) metrics
    - Performance indices (SPI, CPI)
    - Recommendations
    """
    try:
        db = await get_database()
        
        # Fetch baseline
        baseline = await db.baselines.find_one({'id': baseline_id})
        if not baseline:
            raise HTTPException(status_code=404, detail="Baseline not found")
        
        # Fetch current tasks
        project_id = baseline['project_id']
        current_tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        
        # Analyze variance
        variance_analysis = baseline_service.analyze_variance(baseline, current_tasks)
        
        return variance_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing variance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/baselines/{baseline_id}/compare/{other_baseline_id}")
async def compare_two_baselines(
    baseline_id: str,
    other_baseline_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Compare two baselines to show project evolution
    """
    try:
        db = await get_database()
        
        baseline1 = await db.baselines.find_one({'id': baseline_id})
        baseline2 = await db.baselines.find_one({'id': other_baseline_id})
        
        if not baseline1 or not baseline2:
            raise HTTPException(status_code=404, detail="One or both baselines not found")
        
        comparison = baseline_service.compare_baselines(baseline1, baseline2)
        
        return comparison
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing baselines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/baselines/{baseline_id}/set-active")
async def set_active_baseline(
    baseline_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Set a baseline as the active baseline for comparison
    """
    try:
        db = await get_database()
        
        baseline = await db.baselines.find_one({'id': baseline_id})
        if not baseline:
            raise HTTPException(status_code=404, detail="Baseline not found")
        
        project_id = baseline['project_id']
        
        # Deactivate all other baselines for this project
        await db.baselines.update_many(
            {'project_id': project_id},
            {'$set': {'is_active': False}}
        )
        
        # Activate this baseline
        await db.baselines.update_one(
            {'id': baseline_id},
            {'$set': {'is_active': True}}
        )
        
        return {
            'success': True,
            'message': f"Baseline '{baseline['name']}' set as active"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting active baseline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

@router.get("/projects/{project_id}/export/csv")
async def export_gantt_to_csv(
    project_id: str,
    include_variance: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    """
    Export Gantt chart to CSV format
    """
    try:
        db = await get_database()
        
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        dependencies = await db.task_dependencies.find({'project_id': project_id}).to_list(length=1000)
        
        baseline = None
        if include_variance:
            baseline = await db.baselines.find_one({'project_id': project_id, 'is_active': True})
        
        csv_data = gantt_export_service.export_to_csv(tasks, dependencies, include_variance, baseline)
        
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=gantt-{project_id}.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting to CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/export/excel")
async def export_gantt_to_excel(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Export Gantt chart to Excel-ready JSON format
    (Frontend will convert to actual Excel file)
    """
    try:
        db = await get_database()
        
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        dependencies = await db.task_dependencies.find({'project_id': project_id}).to_list(length=1000)
        
        # Get CPM analysis
        cpm_analysis = critical_path_service.calculate_critical_path(tasks, dependencies)
        
        # Get resource analysis
        assignee_ids = set()
        for task in tasks:
            assignee_ids.update(task.get('assignee_ids', []))
        resources = []
        if assignee_ids:
            resources = await db.users.find({'id': {'$in': list(assignee_ids)}}).to_list(length=1000)
        resource_analysis = resource_leveling_service.detect_resource_conflicts(tasks, resources)
        
        excel_data = gantt_export_service.export_to_excel_data(
            tasks, dependencies, cpm_analysis, resource_analysis
        )
        
        return excel_data
        
    except Exception as e:
        logger.error(f"Error exporting to Excel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/export/ms-project")
async def export_to_ms_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Export to Microsoft Project XML format
    """
    try:
        db = await get_database()
        
        project = await db.projects.find_one({'id': project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        dependencies = await db.task_dependencies.find({'project_id': project_id}).to_list(length=1000)
        
        xml_data = gantt_export_service.generate_ms_project_xml(
            project['name'], tasks, dependencies
        )
        
        return Response(
            content=xml_data,
            media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename={project['name']}.xml"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting to MS Project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/export/print")
async def generate_print_view(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Generate print-optimized HTML view
    """
    try:
        db = await get_database()
        
        project = await db.projects.find_one({'id': project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        dependencies = await db.task_dependencies.find({'project_id': project_id}).to_list(length=1000)
        
        html_content = gantt_export_service.generate_print_html(
            project['name'], tasks, dependencies
        )
        
        return Response(
            content=html_content,
            media_type="text/html"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating print view: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/export/json")
async def export_comprehensive_json(
    project_id: str,
    include_cpm: bool = Query(True),
    include_baseline: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    """
    Export comprehensive project data in JSON format
    """
    try:
        db = await get_database()
        
        project = await db.projects.find_one({'id': project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        tasks = await db.tasks.find({'project_id': project_id}).to_list(length=1000)
        dependencies = await db.task_dependencies.find({'project_id': project_id}).to_list(length=1000)
        
        cpm_analysis = None
        if include_cpm:
            cpm_analysis = critical_path_service.calculate_critical_path(tasks, dependencies)
        
        baseline_analysis = None
        if include_baseline:
            baseline = await db.baselines.find_one({'project_id': project_id, 'is_active': True})
            if baseline:
                baseline_analysis = baseline_service.analyze_variance(baseline, tasks)
        
        json_data = gantt_export_service.generate_json_export(
            project['name'], tasks, dependencies, cpm_analysis, baseline_analysis
        )
        
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=gantt-{project_id}.json"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting to JSON: {e}")
        raise HTTPException(status_code=500, detail=str(e))
