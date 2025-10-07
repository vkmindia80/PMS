"""
Resource Leveling Service
Implements advanced resource management algorithms including:
- Resource conflict detection
- Automatic resource leveling
- Workload balancing
- Resource utilization analysis
- Over-allocation resolution
"""

from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class ResourceLevelingService:
    """Service for resource leveling and workload optimization"""
    
    def __init__(self):
        self.tasks = {}
        self.resources = {}
        self.resource_calendars = {}
    
    def detect_resource_conflicts(self, tasks: List[Dict], resources: List[Dict]) -> Dict:
        """
        Detect resource over-allocation and conflicts
        
        Args:
            tasks: List of tasks with assignee_ids, start_date, finish_date, duration
            resources: List of resources/users with id, name, capacity
        
        Returns:
            Dictionary containing:
            - conflicts: List of resource conflict details
            - over_allocated_resources: Resources exceeding capacity
            - utilization_by_resource: Resource utilization percentages
            - conflict_timeline: Timeline view of conflicts
        """
        try:
            self.tasks = {task['id']: task for task in tasks}
            self.resources = {res['id']: res for res in resources}
            
            conflicts = []
            resource_allocations = defaultdict(list)
            
            # Build resource allocation timeline
            for task in tasks:
                start = self._parse_date(task['start_date'])
                finish = self._parse_date(task['finish_date'])
                
                for assignee_id in task.get('assignee_ids', []):
                    resource_allocations[assignee_id].append({
                        'task_id': task['id'],
                        'task_name': task['name'],
                        'start': start,
                        'finish': finish,
                        'duration': task.get('duration', 8),
                        'allocation_percentage': task.get('allocation_percentage', 100)
                    })
            
            # Detect conflicts for each resource
            over_allocated_resources = []
            utilization_by_resource = {}
            conflict_timeline = defaultdict(list)
            
            for resource_id, allocations in resource_allocations.items():
                resource = self.resources.get(resource_id, {'name': 'Unknown', 'capacity': 100})
                resource_name = resource.get('name', resource.get('first_name', 'Unknown'))
                
                # Sort allocations by start date
                allocations.sort(key=lambda x: x['start'])
                
                # Check for overlapping allocations
                for i, alloc1 in enumerate(allocations):
                    total_allocation = alloc1['allocation_percentage']
                    overlapping_tasks = [alloc1['task_name']]
                    
                    for j in range(i + 1, len(allocations)):
                        alloc2 = allocations[j]
                        
                        # Check if tasks overlap
                        if self._tasks_overlap(alloc1['start'], alloc1['finish'], 
                                              alloc2['start'], alloc2['finish']):
                            total_allocation += alloc2['allocation_percentage']
                            overlapping_tasks.append(alloc2['task_name'])
                            
                            # Record conflict if over 100%
                            if total_allocation > 100:
                                conflict = {
                                    'resource_id': resource_id,
                                    'resource_name': resource_name,
                                    'conflict_period': {
                                        'start': max(alloc1['start'], alloc2['start']),
                                        'end': min(alloc1['finish'], alloc2['finish'])
                                    },
                                    'total_allocation_percentage': total_allocation,
                                    'over_allocation_percentage': total_allocation - 100,
                                    'conflicting_tasks': overlapping_tasks,
                                    'severity': self._calculate_conflict_severity(total_allocation),
                                    'resolution_suggestions': self._generate_conflict_resolutions(
                                        resource_id, alloc1, alloc2
                                    )
                                }
                                
                                conflicts.append(conflict)
                                
                                # Add to timeline
                                conflict_date = conflict['conflict_period']['start'].date()
                                conflict_timeline[conflict_date.isoformat()].append({
                                    'resource': resource_name,
                                    'allocation': total_allocation,
                                    'tasks': overlapping_tasks
                                })
                
                # Calculate overall utilization
                if allocations:
                    total_hours = sum(a['duration'] * a['allocation_percentage'] / 100 
                                    for a in allocations)
                    project_duration = (max(a['finish'] for a in allocations) - 
                                      min(a['start'] for a in allocations)).days
                    
                    # Assuming 8 hours per day
                    available_hours = project_duration * 8
                    utilization = (total_hours / available_hours * 100) if available_hours > 0 else 0
                    
                    utilization_by_resource[resource_id] = {
                        'resource_name': resource_name,
                        'utilization_percentage': round(utilization, 2),
                        'total_allocated_hours': round(total_hours, 2),
                        'available_hours': available_hours,
                        'status': self._get_utilization_status(utilization)
                    }
                    
                    if utilization > 100:
                        over_allocated_resources.append({
                            'resource_id': resource_id,
                            'resource_name': resource_name,
                            'utilization': utilization,
                            'over_allocation_hours': total_hours - available_hours
                        })
            
            return {
                'conflicts': conflicts,
                'total_conflicts': len(conflicts),
                'over_allocated_resources': over_allocated_resources,
                'utilization_by_resource': utilization_by_resource,
                'conflict_timeline': dict(conflict_timeline),
                'health_score': self._calculate_resource_health_score(
                    len(conflicts), over_allocated_resources, utilization_by_resource
                )
            }
            
        except Exception as e:
            logger.error(f"Error detecting resource conflicts: {e}")
            raise
    
    def level_resources(self, tasks: List[Dict], resources: List[Dict], 
                       float_analysis: Optional[Dict] = None) -> Dict:
        """
        Automatically level resources by rescheduling tasks
        Uses float time to move non-critical tasks
        
        Args:
            tasks: List of tasks
            resources: List of resources
            float_analysis: Optional CPM float analysis to preserve critical path
        
        Returns:
            Leveled schedule with suggested task date changes
        """
        try:
            # Detect initial conflicts
            conflict_analysis = self.detect_resource_conflicts(tasks, resources)
            
            if not conflict_analysis['conflicts']:
                return {
                    'success': True,
                    'message': 'No resource conflicts detected',
                    'changes': [],
                    'conflicts_resolved': 0
                }
            
            suggested_changes = []
            tasks_by_id = {task['id']: task for task in tasks}
            
            # Process each conflict
            for conflict in conflict_analysis['conflicts']:
                resource_id = conflict['resource_id']
                conflicting_tasks = conflict['conflicting_tasks']
                
                # Find the task with most float (if float analysis provided)
                movable_task = None
                max_float = -1
                
                for task_name in conflicting_tasks:
                    # Find task by name
                    task = next((t for t in tasks if t['name'] == task_name), None)
                    if not task:
                        continue
                    
                    task_id = task['id']
                    
                    # Check if task is on critical path
                    if float_analysis and task_id in float_analysis.get('task_analysis', {}):
                        task_float = float_analysis['task_analysis'][task_id]['total_float']
                        
                        if task_float > max_float:
                            max_float = task_float
                            movable_task = task
                    elif not float_analysis:
                        # If no float analysis, pick the shorter task
                        if movable_task is None or task.get('duration', 8) < movable_task.get('duration', 8):
                            movable_task = task
                
                # Suggest moving the task
                if movable_task:
                    # Calculate how much to shift
                    conflict_period = conflict['conflict_period']
                    conflict_duration = (conflict_period['end'] - conflict_period['start']).days
                    
                    # Shift task after conflict period
                    current_start = self._parse_date(movable_task['start_date'])
                    new_start = conflict_period['end'] + timedelta(days=1)
                    shift_days = (new_start - current_start).days
                    
                    suggested_changes.append({
                        'task_id': movable_task['id'],
                        'task_name': movable_task['name'],
                        'current_start': current_start.isoformat(),
                        'suggested_start': new_start.isoformat(),
                        'shift_days': shift_days,
                        'reason': f"Resolve resource conflict for {conflict['resource_name']}",
                        'float_available': max_float if float_analysis else None,
                        'risk_level': 'low' if max_float > shift_days * 24 else 'medium'
                    })
            
            return {
                'success': True,
                'conflicts_found': len(conflict_analysis['conflicts']),
                'conflicts_resolved': len(suggested_changes),
                'suggested_changes': suggested_changes,
                'message': f"Suggested {len(suggested_changes)} task reschedules to resolve conflicts"
            }
            
        except Exception as e:
            logger.error(f"Error leveling resources: {e}")
            raise
    
    def analyze_workload_distribution(self, tasks: List[Dict], resources: List[Dict], 
                                     time_period_days: int = 30) -> Dict:
        """
        Analyze workload distribution across resources and time
        
        Returns:
            - Daily workload per resource
            - Peak utilization periods
            - Underutilized periods
            - Workload balance score
        """
        try:
            resource_workload = defaultdict(lambda: defaultdict(float))
            
            # Calculate daily workload for each resource
            for task in tasks:
                start = self._parse_date(task['start_date'])
                finish = self._parse_date(task['finish_date'])
                duration_days = max(1, (finish - start).days)
                daily_hours = task.get('duration', 8) / duration_days
                
                # Distribute task hours across days
                current_date = start.date()
                end_date = finish.date()
                
                while current_date <= end_date:
                    for assignee_id in task.get('assignee_ids', []):
                        resource_workload[assignee_id][current_date.isoformat()] += daily_hours
                    current_date += timedelta(days=1)
            
            # Analyze workload patterns
            peak_periods = []
            underutilized_periods = []
            workload_by_date = defaultdict(float)
            
            for resource_id, daily_workload in resource_workload.items():
                resource = self.resources.get(resource_id, {'name': 'Unknown'})
                resource_name = resource.get('name', resource.get('first_name', 'Unknown'))
                
                for date_str, hours in daily_workload.items():
                    workload_by_date[date_str] += hours
                    
                    # Identify peaks (>8 hours)
                    if hours > 8:
                        peak_periods.append({
                            'date': date_str,
                            'resource_id': resource_id,
                            'resource_name': resource_name,
                            'workload_hours': round(hours, 2),
                            'overload_hours': round(hours - 8, 2)
                        })
                    
                    # Identify underutilization (<4 hours)
                    elif hours > 0 and hours < 4:
                        underutilized_periods.append({
                            'date': date_str,
                            'resource_id': resource_id,
                            'resource_name': resource_name,
                            'workload_hours': round(hours, 2),
                            'unused_capacity_hours': round(8 - hours, 2)
                        })
            
            # Calculate workload balance score
            balance_score = self._calculate_workload_balance(resource_workload)
            
            # Identify bottleneck resources
            bottlenecks = self._identify_bottlenecks(resource_workload)
            
            return {
                'daily_workload_by_resource': {
                    res_id: dict(workload) for res_id, workload in resource_workload.items()
                },
                'peak_utilization_periods': peak_periods[:20],  # Top 20
                'underutilized_periods': underutilized_periods[:20],  # Top 20
                'workload_balance_score': balance_score,
                'bottleneck_resources': bottlenecks,
                'total_workload_hours': sum(workload_by_date.values()),
                'average_daily_workload': sum(workload_by_date.values()) / max(1, len(workload_by_date))
            }
            
        except Exception as e:
            logger.error(f"Error analyzing workload distribution: {e}")
            raise
    
    def suggest_resource_reallocation(self, tasks: List[Dict], resources: List[Dict]) -> List[Dict]:
        """
        Suggest optimal resource reallocation to balance workload
        """
        suggestions = []
        
        # Analyze current workload
        workload_analysis = self.analyze_workload_distribution(tasks, resources)
        
        # Find overloaded and underutilized resources
        overloaded = workload_analysis.get('bottleneck_resources', [])
        
        for bottleneck in overloaded:
            resource_id = bottleneck['resource_id']
            
            # Find tasks assigned to this resource
            resource_tasks = [t for t in tasks if resource_id in t.get('assignee_ids', [])]
            
            # Sort tasks by duration and criticality
            resource_tasks.sort(key=lambda t: t.get('duration', 8), reverse=True)
            
            # Suggest moving some tasks to less utilized resources
            for task in resource_tasks[:3]:  # Top 3 largest tasks
                # Find alternative resources with lower utilization
                alternative_resources = self._find_alternative_resources(
                    task, resources, workload_analysis
                )
                
                if alternative_resources:
                    suggestions.append({
                        'type': 'reassign',
                        'task_id': task['id'],
                        'task_name': task['name'],
                        'current_resource': bottleneck['resource_name'],
                        'suggested_resources': alternative_resources[:3],
                        'reason': f"Balance workload - current resource at {bottleneck['utilization_percentage']:.1f}%",
                        'priority': 'high' if bottleneck['utilization_percentage'] > 150 else 'medium'
                    })
        
        return suggestions
    
    # Helper methods
    
    def _parse_date(self, date_value) -> datetime:
        """Parse date from string or datetime object"""
        if isinstance(date_value, str):
            return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
        return date_value
    
    def _tasks_overlap(self, start1: datetime, end1: datetime, 
                      start2: datetime, end2: datetime) -> bool:
        """Check if two time periods overlap"""
        return start1 < end2 and start2 < end1
    
    def _calculate_conflict_severity(self, allocation_percentage: float) -> str:
        """Calculate conflict severity based on over-allocation"""
        if allocation_percentage <= 110:
            return 'low'
        elif allocation_percentage <= 150:
            return 'medium'
        elif allocation_percentage <= 200:
            return 'high'
        else:
            return 'critical'
    
    def _generate_conflict_resolutions(self, resource_id: str, 
                                      alloc1: Dict, alloc2: Dict) -> List[str]:
        """Generate resolution suggestions for a conflict"""
        suggestions = [
            f"Shift '{alloc2['task_name']}' to start after '{alloc1['task_name']}' completes",
            f"Reduce allocation percentage on one or both tasks",
            f"Assign additional resources to help with workload",
            f"Consider task parallelization if dependencies allow"
        ]
        return suggestions
    
    def _get_utilization_status(self, utilization: float) -> str:
        """Get utilization status label"""
        if utilization < 50:
            return 'underutilized'
        elif utilization < 80:
            return 'optimal'
        elif utilization < 100:
            return 'high'
        elif utilization < 150:
            return 'over_allocated'
        else:
            return 'critically_over_allocated'
    
    def _calculate_resource_health_score(self, num_conflicts: int, 
                                        over_allocated: List[Dict],
                                        utilization: Dict) -> float:
        """Calculate overall resource health score (0-100)"""
        # Factors:
        # 1. Number of conflicts (fewer is better)
        conflict_score = max(0, 100 - (num_conflicts * 5))
        
        # 2. Number of over-allocated resources (fewer is better)
        over_alloc_score = max(0, 100 - (len(over_allocated) * 10))
        
        # 3. Utilization balance (closer to 80% is optimal)
        if utilization:
            avg_utilization = sum(u['utilization_percentage'] 
                                for u in utilization.values()) / len(utilization)
            utilization_score = 100 - abs(avg_utilization - 80)
        else:
            utilization_score = 100
        
        # Weighted average
        health_score = (
            conflict_score * 0.4 +
            over_alloc_score * 0.3 +
            utilization_score * 0.3
        )
        
        return round(max(0, min(100, health_score)), 2)
    
    def _calculate_workload_balance(self, resource_workload: Dict) -> float:
        """Calculate workload balance score (0-100)"""
        if not resource_workload:
            return 100.0
        
        # Calculate total hours per resource
        total_hours = []
        for daily_workload in resource_workload.values():
            total_hours.append(sum(daily_workload.values()))
        
        if not total_hours:
            return 100.0
        
        # Calculate coefficient of variation (lower is more balanced)
        mean_hours = sum(total_hours) / len(total_hours)
        if mean_hours == 0:
            return 100.0
        
        variance = sum((h - mean_hours) ** 2 for h in total_hours) / len(total_hours)
        std_dev = variance ** 0.5
        cv = std_dev / mean_hours
        
        # Convert to 0-100 scale (lower CV = higher score)
        balance_score = max(0, 100 - (cv * 100))
        
        return round(balance_score, 2)
    
    def _identify_bottlenecks(self, resource_workload: Dict) -> List[Dict]:
        """Identify bottleneck resources with highest utilization"""
        resource_totals = []
        
        for resource_id, daily_workload in resource_workload.items():
            total_hours = sum(daily_workload.values())
            num_days = len(daily_workload)
            avg_daily_hours = total_hours / num_days if num_days > 0 else 0
            utilization_percentage = (avg_daily_hours / 8) * 100
            
            if utilization_percentage > 100:
                resource = self.resources.get(resource_id, {'name': 'Unknown'})
                resource_totals.append({
                    'resource_id': resource_id,
                    'resource_name': resource.get('name', resource.get('first_name', 'Unknown')),
                    'total_hours': round(total_hours, 2),
                    'average_daily_hours': round(avg_daily_hours, 2),
                    'utilization_percentage': round(utilization_percentage, 2),
                    'overload_days': sum(1 for hours in daily_workload.values() if hours > 8)
                })
        
        # Sort by utilization
        resource_totals.sort(key=lambda x: x['utilization_percentage'], reverse=True)
        
        return resource_totals
    
    def _find_alternative_resources(self, task: Dict, resources: List[Dict],
                                   workload_analysis: Dict) -> List[Dict]:
        """Find alternative resources for a task based on utilization"""
        current_assignees = set(task.get('assignee_ids', []))
        utilization_data = workload_analysis.get('utilization_by_resource', {})
        
        alternatives = []
        
        for resource in resources:
            resource_id = resource['id']
            
            # Skip current assignees
            if resource_id in current_assignees:
                continue
            
            # Get utilization
            util_info = utilization_data.get(resource_id, {})
            utilization = util_info.get('utilization_percentage', 0)
            
            # Consider resources with <80% utilization
            if utilization < 80:
                alternatives.append({
                    'resource_id': resource_id,
                    'resource_name': resource.get('name', resource.get('first_name', 'Unknown')),
                    'current_utilization': utilization,
                    'available_capacity': 100 - utilization
                })
        
        # Sort by lowest utilization
        alternatives.sort(key=lambda x: x['current_utilization'])
        
        return alternatives


# Singleton instance
resource_leveling_service = ResourceLevelingService()
