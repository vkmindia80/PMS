"""
Critical Path Method (CPM) Service
Implements advanced project scheduling algorithms including:
- Critical path calculation
- Float time analysis (free float, total float)
- Schedule optimization
- Early start/finish and late start/finish calculations
"""

from datetime import datetime, timedelta
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)


class CriticalPathService:
    """Service for Critical Path Method calculations"""
    
    def __init__(self):
        self.tasks = {}
        self.dependencies = []
        self.adjacency_list = defaultdict(list)
        self.reverse_adjacency_list = defaultdict(list)
    
    def calculate_critical_path(self, tasks: List[Dict], dependencies: List[Dict]) -> Dict:
        """
        Calculate the critical path for a project
        
        Args:
            tasks: List of task dictionaries with id, name, duration, start_date, finish_date
            dependencies: List of dependency dictionaries with predecessor_id, successor_id, type, lag
        
        Returns:
            Dictionary containing:
            - critical_path: List of critical task IDs
            - task_analysis: Dictionary of task IDs to analysis data (floats, dates)
            - project_duration: Total project duration in days
            - critical_path_length: Number of tasks on critical path
        """
        try:
            # Initialize data structures
            self.tasks = {task['id']: task for task in tasks}
            self.dependencies = dependencies
            self._build_adjacency_lists()
            
            # Perform forward pass (calculate early start/finish)
            early_times = self._forward_pass()
            
            # Perform backward pass (calculate late start/finish)
            late_times = self._backward_pass(early_times)
            
            # Calculate float times
            float_times = self._calculate_float_times(early_times, late_times)
            
            # Identify critical path
            critical_path = self._identify_critical_path(float_times)
            
            # Calculate project metrics
            project_duration = self._calculate_project_duration(early_times)
            
            # Build comprehensive analysis
            task_analysis = {}
            for task_id in self.tasks.keys():
                task_analysis[task_id] = {
                    'early_start': early_times[task_id]['early_start'],
                    'early_finish': early_times[task_id]['early_finish'],
                    'late_start': late_times[task_id]['late_start'],
                    'late_finish': late_times[task_id]['late_finish'],
                    'total_float': float_times[task_id]['total_float'],
                    'free_float': float_times[task_id]['free_float'],
                    'is_critical': task_id in critical_path,
                    'criticality_index': 1.0 if task_id in critical_path else float_times[task_id]['total_float'] / max(project_duration, 1)
                }
            
            return {
                'critical_path': critical_path,
                'task_analysis': task_analysis,
                'project_duration_days': project_duration,
                'critical_path_length': len(critical_path),
                'total_float_days': sum(f['total_float'] for f in float_times.values()),
                'schedule_health_score': self._calculate_schedule_health(float_times, critical_path, len(tasks))
            }
            
        except Exception as e:
            logger.error(f"Error calculating critical path: {e}")
            raise
    
    def _build_adjacency_lists(self):
        """Build forward and reverse adjacency lists from dependencies"""
        self.adjacency_list = defaultdict(list)
        self.reverse_adjacency_list = defaultdict(list)
        
        for dep in self.dependencies:
            pred_id = dep['predecessor_id']
            succ_id = dep['successor_id']
            dep_type = dep.get('dependency_type', 'FS')
            lag = dep.get('lag_duration', 0)
            
            self.adjacency_list[pred_id].append({
                'task_id': succ_id,
                'type': dep_type,
                'lag': lag
            })
            
            self.reverse_adjacency_list[succ_id].append({
                'task_id': pred_id,
                'type': dep_type,
                'lag': lag
            })
    
    def _forward_pass(self) -> Dict[str, Dict]:
        """
        Forward pass to calculate Early Start and Early Finish times
        Uses topological sort to process tasks in dependency order
        """
        early_times = {}
        in_degree = defaultdict(int)
        
        # Calculate in-degrees
        for task_id in self.tasks.keys():
            in_degree[task_id] = len(self.reverse_adjacency_list.get(task_id, []))
        
        # Find tasks with no predecessors (starting tasks)
        queue = deque([task_id for task_id, degree in in_degree.items() if degree == 0])
        
        # Initialize starting tasks
        for task_id in queue:
            task = self.tasks[task_id]
            start_date = datetime.fromisoformat(task['start_date'].replace('Z', '+00:00')) if isinstance(task['start_date'], str) else task['start_date']
            duration_hours = task.get('duration', 8)
            
            early_times[task_id] = {
                'early_start': start_date,
                'early_finish': start_date + timedelta(hours=duration_hours)
            }
        
        # Process tasks in topological order
        processed = set()
        while queue:
            task_id = queue.popleft()
            processed.add(task_id)
            
            # Process successors
            for successor_info in self.adjacency_list.get(task_id, []):
                succ_id = successor_info['task_id']
                dep_type = successor_info['type']
                lag = successor_info['lag']
                
                # Calculate successor's early start based on dependency type
                if succ_id not in early_times:
                    succ_task = self.tasks[succ_id]
                    duration_hours = succ_task.get('duration', 8)
                    
                    early_times[succ_id] = {
                        'early_start': datetime.min.replace(tzinfo=None),
                        'early_finish': datetime.min.replace(tzinfo=None)
                    }
                
                # Calculate early start based on dependency type
                pred_early_finish = early_times[task_id]['early_finish']
                pred_early_start = early_times[task_id]['early_start']
                
                if dep_type in ['FS', 'finish_to_start']:
                    # Finish-to-Start: Successor starts after predecessor finishes
                    new_early_start = pred_early_finish + timedelta(days=lag)
                elif dep_type in ['SS', 'start_to_start']:
                    # Start-to-Start: Successor starts after predecessor starts
                    new_early_start = pred_early_start + timedelta(days=lag)
                elif dep_type in ['FF', 'finish_to_finish']:
                    # Finish-to-Finish: Successor finishes after predecessor finishes
                    succ_duration = self.tasks[succ_id].get('duration', 8)
                    new_early_start = pred_early_finish + timedelta(days=lag) - timedelta(hours=succ_duration)
                else:  # SF, start_to_finish
                    # Start-to-Finish: Successor finishes after predecessor starts
                    succ_duration = self.tasks[succ_id].get('duration', 8)
                    new_early_start = pred_early_start + timedelta(days=lag) - timedelta(hours=succ_duration)
                
                # Update if this is later than current early start
                if new_early_start > early_times[succ_id]['early_start']:
                    succ_duration = self.tasks[succ_id].get('duration', 8)
                    early_times[succ_id]['early_start'] = new_early_start
                    early_times[succ_id]['early_finish'] = new_early_start + timedelta(hours=succ_duration)
                
                # Decrease in-degree and add to queue if ready
                in_degree[succ_id] -= 1
                if in_degree[succ_id] == 0:
                    queue.append(succ_id)
        
        # Handle tasks with no dependencies that weren't in the initial queue
        for task_id in self.tasks.keys():
            if task_id not in early_times:
                task = self.tasks[task_id]
                start_date = datetime.fromisoformat(task['start_date'].replace('Z', '+00:00')) if isinstance(task['start_date'], str) else task['start_date']
                duration_hours = task.get('duration', 8)
                
                early_times[task_id] = {
                    'early_start': start_date,
                    'early_finish': start_date + timedelta(hours=duration_hours)
                }
        
        return early_times
    
    def _backward_pass(self, early_times: Dict) -> Dict[str, Dict]:
        """
        Backward pass to calculate Late Start and Late Finish times
        Works backward from project end date
        """
        # Find project end date (maximum early finish)
        project_end = max(times['early_finish'] for times in early_times.values())
        
        late_times = {}
        out_degree = defaultdict(int)
        
        # Calculate out-degrees
        for task_id in self.tasks.keys():
            out_degree[task_id] = len(self.adjacency_list.get(task_id, []))
        
        # Find tasks with no successors (ending tasks)
        queue = deque([task_id for task_id, degree in out_degree.items() if degree == 0])
        
        # Initialize ending tasks with project end date
        for task_id in queue:
            duration_hours = self.tasks[task_id].get('duration', 8)
            late_times[task_id] = {
                'late_finish': project_end,
                'late_start': project_end - timedelta(hours=duration_hours)
            }
        
        # Process tasks in reverse topological order
        processed = set()
        while queue:
            task_id = queue.popleft()
            processed.add(task_id)
            
            # Process predecessors
            for predecessor_info in self.reverse_adjacency_list.get(task_id, []):
                pred_id = predecessor_info['task_id']
                dep_type = predecessor_info['type']
                lag = predecessor_info['lag']
                
                # Initialize if not exists
                if pred_id not in late_times:
                    pred_duration = self.tasks[pred_id].get('duration', 8)
                    late_times[pred_id] = {
                        'late_finish': datetime.max.replace(tzinfo=None),
                        'late_start': datetime.max.replace(tzinfo=None)
                    }
                
                # Calculate late finish based on dependency type
                succ_late_start = late_times[task_id]['late_start']
                succ_late_finish = late_times[task_id]['late_finish']
                
                if dep_type in ['FS', 'finish_to_start']:
                    new_late_finish = succ_late_start - timedelta(days=lag)
                elif dep_type in ['SS', 'start_to_start']:
                    pred_duration = self.tasks[pred_id].get('duration', 8)
                    new_late_finish = succ_late_start - timedelta(days=lag) + timedelta(hours=pred_duration)
                elif dep_type in ['FF', 'finish_to_finish']:
                    new_late_finish = succ_late_finish - timedelta(days=lag)
                else:  # SF
                    pred_duration = self.tasks[pred_id].get('duration', 8)
                    new_late_finish = succ_late_finish - timedelta(days=lag) + timedelta(hours=pred_duration)
                
                # Update if this is earlier than current late finish
                if new_late_finish < late_times[pred_id]['late_finish']:
                    pred_duration = self.tasks[pred_id].get('duration', 8)
                    late_times[pred_id]['late_finish'] = new_late_finish
                    late_times[pred_id]['late_start'] = new_late_finish - timedelta(hours=pred_duration)
                
                # Decrease out-degree and add to queue if ready
                out_degree[pred_id] -= 1
                if out_degree[pred_id] == 0:
                    queue.append(pred_id)
        
        # Handle any remaining tasks
        for task_id in self.tasks.keys():
            if task_id not in late_times:
                duration_hours = self.tasks[task_id].get('duration', 8)
                late_times[task_id] = {
                    'late_finish': project_end,
                    'late_start': project_end - timedelta(hours=duration_hours)
                }
        
        return late_times
    
    def _calculate_float_times(self, early_times: Dict, late_times: Dict) -> Dict[str, Dict]:
        """Calculate total float and free float for each task"""
        float_times = {}
        
        for task_id in self.tasks.keys():
            early = early_times[task_id]
            late = late_times[task_id]
            
            # Total Float: How much a task can be delayed without delaying project
            total_float = (late['late_start'] - early['early_start']).total_seconds() / 3600  # hours
            
            # Free Float: How much a task can be delayed without delaying any successor
            free_float = total_float
            for successor_info in self.adjacency_list.get(task_id, []):
                succ_id = successor_info['task_id']
                succ_early_start = early_times[succ_id]['early_start']
                task_early_finish = early['early_finish']
                
                slack = (succ_early_start - task_early_finish).total_seconds() / 3600
                free_float = min(free_float, slack)
            
            float_times[task_id] = {
                'total_float': max(0, total_float),
                'free_float': max(0, free_float),
                'total_float_days': max(0, total_float / 24),
                'free_float_days': max(0, free_float / 24)
            }
        
        return float_times
    
    def _identify_critical_path(self, float_times: Dict) -> List[str]:
        """Identify critical path tasks (tasks with zero or near-zero float)"""
        # Tasks with total float <= 1 hour are considered critical
        critical_threshold = 1.0  # hours
        critical_tasks = [
            task_id for task_id, floats in float_times.items()
            if floats['total_float'] <= critical_threshold
        ]
        
        # Sort by dependencies to get proper path order
        return self._sort_critical_path(critical_tasks)
    
    def _sort_critical_path(self, critical_tasks: List[str]) -> List[str]:
        """Sort critical path tasks in dependency order"""
        if not critical_tasks:
            return []
        
        # Build subgraph of only critical tasks
        critical_set = set(critical_tasks)
        critical_deps = defaultdict(list)
        in_degree = defaultdict(int)
        
        for task_id in critical_tasks:
            in_degree[task_id] = 0
        
        for dep in self.dependencies:
            if dep['predecessor_id'] in critical_set and dep['successor_id'] in critical_set:
                critical_deps[dep['predecessor_id']].append(dep['successor_id'])
                in_degree[dep['successor_id']] += 1
        
        # Topological sort
        queue = deque([task_id for task_id in critical_tasks if in_degree[task_id] == 0])
        sorted_path = []
        
        while queue:
            task_id = queue.popleft()
            sorted_path.append(task_id)
            
            for succ_id in critical_deps[task_id]:
                in_degree[succ_id] -= 1
                if in_degree[succ_id] == 0:
                    queue.append(succ_id)
        
        return sorted_path
    
    def _calculate_project_duration(self, early_times: Dict) -> float:
        """Calculate total project duration in days"""
        if not early_times:
            return 0
        
        project_start = min(times['early_start'] for times in early_times.values())
        project_end = max(times['early_finish'] for times in early_times.values())
        
        duration = (project_end - project_start).total_seconds() / (24 * 3600)
        return round(duration, 2)
    
    def _calculate_schedule_health(self, float_times: Dict, critical_path: List[str], total_tasks: int) -> float:
        """
        Calculate schedule health score (0-100)
        Higher score = more schedule flexibility
        """
        if not total_tasks:
            return 100.0
        
        # Factor 1: Percentage of non-critical tasks (more is better)
        non_critical_ratio = (total_tasks - len(critical_path)) / total_tasks
        
        # Factor 2: Average float across all tasks (more is better)
        avg_float = sum(f['total_float_days'] for f in float_times.values()) / len(float_times) if float_times else 0
        avg_float_score = min(avg_float / 10, 1.0)  # Normalize to 0-1 (10 days float = perfect)
        
        # Factor 3: Distribution of float (more evenly distributed is better)
        float_values = [f['total_float_days'] for f in float_times.values()]
        if float_values:
            float_variance = sum((f - avg_float) ** 2 for f in float_values) / len(float_values)
            variance_score = 1.0 / (1.0 + float_variance / 10)
        else:
            variance_score = 0
        
        # Weighted score
        health_score = (
            non_critical_ratio * 40 +
            avg_float_score * 40 +
            variance_score * 20
        )
        
        return round(health_score * 100, 2)
    
    def optimize_schedule(self, tasks: List[Dict], dependencies: List[Dict], 
                         constraints: Optional[Dict] = None) -> Dict:
        """
        Optimize project schedule by:
        - Leveling resources
        - Fast-tracking where possible
        - Crashing critical path activities
        """
        cpm_analysis = self.calculate_critical_path(tasks, dependencies)
        
        optimization_suggestions = []
        
        # Analyze critical path for optimization opportunities
        for task_id in cpm_analysis['critical_path']:
            task = self.tasks[task_id]
            task_analysis = cpm_analysis['task_analysis'][task_id]
            
            # Suggestion 1: Can this task be fast-tracked (overlapped with predecessor)?
            predecessors = self.reverse_adjacency_list.get(task_id, [])
            for pred_info in predecessors:
                pred_id = pred_info['task_id']
                if pred_info['type'] == 'FS':
                    optimization_suggestions.append({
                        'type': 'fast_track',
                        'task_id': task_id,
                        'task_name': task['name'],
                        'suggestion': f"Consider changing dependency from Finish-to-Start to Start-to-Start to allow overlap",
                        'potential_time_saving': task['duration'] * 0.3,  # Estimate 30% overlap
                        'risk': 'medium'
                    })
            
            # Suggestion 2: Can resources be added to crash this task?
            if task.get('assignee_ids', []):
                optimization_suggestions.append({
                    'type': 'crash',
                    'task_id': task_id,
                    'task_name': task['name'],
                    'suggestion': f"Consider adding resources to reduce duration",
                    'potential_time_saving': task['duration'] * 0.2,  # Estimate 20% reduction
                    'risk': 'low'
                })
        
        # Identify tasks that can be parallelized
        for task_id in self.tasks.keys():
            if task_id not in cpm_analysis['critical_path']:
                task_float = cpm_analysis['task_analysis'][task_id]['total_float']
                if task_float > 24:  # More than 1 day of float
                    optimization_suggestions.append({
                        'type': 'parallelize',
                        'task_id': task_id,
                        'task_name': self.tasks[task_id]['name'],
                        'suggestion': f"Task has {task_float/24:.1f} days of float and can be rescheduled for better resource utilization",
                        'float_available': task_float,
                        'risk': 'low'
                    })
        
        return {
            'cpm_analysis': cpm_analysis,
            'optimization_suggestions': optimization_suggestions,
            'estimated_time_savings': sum(s.get('potential_time_saving', 0) for s in optimization_suggestions),
            'schedule_compression_opportunities': len([s for s in optimization_suggestions if s['type'] in ['fast_track', 'crash']])
        }


# Singleton instance
critical_path_service = CriticalPathService()
