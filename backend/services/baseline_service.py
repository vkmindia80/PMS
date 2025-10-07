"""
Baseline Management Service
Implements project baseline tracking and variance analysis including:
- Baseline creation and storage
- Variance analysis (schedule, cost, scope)
- Earned Value Management (EVM)
- Performance metrics (SPI, CPI)
- Baseline comparison
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import uuid

logger = logging.getLogger(__name__)


class BaselineService:
    """Service for project baseline management and variance analysis"""
    
    def create_baseline(self, project_id: str, tasks: List[Dict], 
                       baseline_name: str, description: str = "") -> Dict:
        """
        Create a new baseline snapshot of the project
        
        Args:
            project_id: Project identifier
            tasks: Current list of tasks to snapshot
            baseline_name: Name for the baseline
            description: Optional description
        
        Returns:
            Baseline object with snapshot data
        """
        try:
            baseline_id = str(uuid.uuid4())
            baseline_date = datetime.utcnow()
            
            # Create snapshot of all task data
            task_snapshots = []
            total_planned_duration = 0
            total_planned_cost = 0
            
            for task in tasks:
                snapshot = {
                    'task_id': task['id'],
                    'task_name': task['name'],
                    'baseline_start': task.get('start_date'),
                    'baseline_finish': task.get('finish_date'),
                    'baseline_duration': task.get('duration', 8),
                    'baseline_work': task.get('work', task.get('duration', 8)),
                    'baseline_cost': task.get('estimated_cost', 0),
                    'assignee_ids': task.get('assignee_ids', []),
                    'dependencies': task.get('dependencies', [])
                }
                
                task_snapshots.append(snapshot)
                total_planned_duration += snapshot['baseline_duration']
                total_planned_cost += snapshot['baseline_cost']
            
            baseline = {
                'id': baseline_id,
                'project_id': project_id,
                'name': baseline_name,
                'description': description,
                'baseline_date': baseline_date.isoformat(),
                'is_active': True,
                'task_snapshots': task_snapshots,
                'summary': {
                    'total_tasks': len(tasks),
                    'total_planned_duration': total_planned_duration,
                    'total_planned_cost': total_planned_cost,
                    'baseline_start': min((t.get('start_date') for t in tasks 
                                         if t.get('start_date')), default=baseline_date.isoformat()),
                    'baseline_finish': max((t.get('finish_date') for t in tasks 
                                          if t.get('finish_date')), default=baseline_date.isoformat())
                },
                'created_at': baseline_date.isoformat()
            }
            
            return baseline
            
        except Exception as e:
            logger.error(f"Error creating baseline: {e}")
            raise
    
    def analyze_variance(self, baseline: Dict, current_tasks: List[Dict]) -> Dict:
        """
        Analyze variance between baseline and current schedule
        
        Returns:
            - Schedule variance for each task and overall
            - Cost variance (if cost data available)
            - Scope changes
            - Performance indices
        """
        try:
            task_variances = []
            total_schedule_variance_hours = 0
            total_cost_variance = 0
            
            # Build lookup for current tasks
            current_tasks_map = {task['id']: task for task in current_tasks}
            
            # Analyze each baseline task
            for baseline_task in baseline.get('task_snapshots', []):
                task_id = baseline_task['task_id']
                current_task = current_tasks_map.get(task_id)
                
                if not current_task:
                    # Task was deleted
                    task_variances.append({
                        'task_id': task_id,
                        'task_name': baseline_task['task_name'],
                        'status': 'deleted',
                        'schedule_variance_hours': 0,
                        'schedule_variance_percentage': 0,
                        'impact': 'scope_change'
                    })
                    continue
                
                # Calculate schedule variance
                baseline_duration = baseline_task.get('baseline_duration', 8)
                current_duration = current_task.get('duration', 8)
                schedule_variance = current_duration - baseline_duration
                schedule_variance_pct = (schedule_variance / baseline_duration * 100) if baseline_duration > 0 else 0
                
                # Calculate date variance
                baseline_start = self._parse_date(baseline_task.get('baseline_start'))
                current_start = self._parse_date(current_task.get('start_date'))
                baseline_finish = self._parse_date(baseline_task.get('baseline_finish'))
                current_finish = self._parse_date(current_task.get('finish_date'))
                
                start_variance_days = (current_start - baseline_start).days if baseline_start and current_start else 0
                finish_variance_days = (current_finish - baseline_finish).days if baseline_finish and current_finish else 0
                
                # Calculate cost variance (if available)
                baseline_cost = baseline_task.get('baseline_cost', 0)
                current_cost = current_task.get('actual_cost', current_task.get('estimated_cost', 0))
                cost_variance = current_cost - baseline_cost
                cost_variance_pct = (cost_variance / baseline_cost * 100) if baseline_cost > 0 else 0
                
                # Calculate progress
                percent_complete = current_task.get('percent_complete', 0)
                
                # Determine variance severity
                severity = self._calculate_variance_severity(
                    schedule_variance_pct, cost_variance_pct, percent_complete
                )
                
                variance_data = {
                    'task_id': task_id,
                    'task_name': current_task['name'],
                    'status': 'modified',
                    'schedule_variance_hours': round(schedule_variance, 2),
                    'schedule_variance_percentage': round(schedule_variance_pct, 2),
                    'start_variance_days': start_variance_days,
                    'finish_variance_days': finish_variance_days,
                    'cost_variance': round(cost_variance, 2),
                    'cost_variance_percentage': round(cost_variance_pct, 2),
                    'percent_complete': percent_complete,
                    'severity': severity,
                    'baseline_duration': baseline_duration,
                    'current_duration': current_duration,
                    'baseline_start': baseline_task.get('baseline_start'),
                    'current_start': current_task.get('start_date'),
                    'baseline_finish': baseline_task.get('baseline_finish'),
                    'current_finish': current_task.get('finish_date')
                }
                
                task_variances.append(variance_data)
                total_schedule_variance_hours += schedule_variance
                total_cost_variance += cost_variance
            
            # Check for new tasks (not in baseline)
            baseline_task_ids = {t['task_id'] for t in baseline.get('task_snapshots', [])}
            new_tasks = [t for t in current_tasks if t['id'] not in baseline_task_ids]
            
            for new_task in new_tasks:
                task_variances.append({
                    'task_id': new_task['id'],
                    'task_name': new_task['name'],
                    'status': 'added',
                    'schedule_variance_hours': new_task.get('duration', 8),
                    'schedule_variance_percentage': 100,
                    'impact': 'scope_change',
                    'severity': 'medium'
                })
            
            # Calculate overall variance metrics
            baseline_summary = baseline.get('summary', {})
            baseline_total_duration = baseline_summary.get('total_planned_duration', 0)
            current_total_duration = sum(t.get('duration', 8) for t in current_tasks)
            
            overall_schedule_variance_pct = ((current_total_duration - baseline_total_duration) / 
                                           baseline_total_duration * 100) if baseline_total_duration > 0 else 0
            
            overall_cost_variance_pct = (total_cost_variance / 
                                        baseline_summary.get('total_planned_cost', 1) * 100)
            
            # Calculate Earned Value Management metrics
            evm_metrics = self._calculate_evm_metrics(baseline, current_tasks)
            
            return {
                'baseline_id': baseline['id'],
                'baseline_name': baseline['name'],
                'baseline_date': baseline['baseline_date'],
                'analysis_date': datetime.utcnow().isoformat(),
                'task_variances': task_variances,
                'summary': {
                    'total_tasks_baseline': len(baseline.get('task_snapshots', [])),
                    'total_tasks_current': len(current_tasks),
                    'tasks_added': len(new_tasks),
                    'tasks_deleted': len([v for v in task_variances if v.get('status') == 'deleted']),
                    'tasks_modified': len([v for v in task_variances if v.get('status') == 'modified']),
                    'total_schedule_variance_hours': round(total_schedule_variance_hours, 2),
                    'total_schedule_variance_days': round(total_schedule_variance_hours / 8, 2),
                    'overall_schedule_variance_percentage': round(overall_schedule_variance_pct, 2),
                    'total_cost_variance': round(total_cost_variance, 2),
                    'overall_cost_variance_percentage': round(overall_cost_variance_pct, 2),
                    'variance_health_score': self._calculate_variance_health_score(
                        overall_schedule_variance_pct, overall_cost_variance_pct, task_variances
                    )
                },
                'evm_metrics': evm_metrics,
                'critical_variances': [v for v in task_variances 
                                      if v.get('severity') in ['high', 'critical']],
                'recommendations': self._generate_variance_recommendations(task_variances, evm_metrics)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing variance: {e}")
            raise
    
    def compare_baselines(self, baseline1: Dict, baseline2: Dict) -> Dict:
        """
        Compare two baselines to show project evolution
        
        Returns:
            Comparison analysis showing changes between baselines
        """
        try:
            baseline1_tasks = {t['task_id']: t for t in baseline1.get('task_snapshots', [])}
            baseline2_tasks = {t['task_id']: t for t in baseline2.get('task_snapshots', [])}
            
            comparisons = []
            
            # Compare common tasks
            common_task_ids = set(baseline1_tasks.keys()) & set(baseline2_tasks.keys())
            
            for task_id in common_task_ids:
                task1 = baseline1_tasks[task_id]
                task2 = baseline2_tasks[task_id]
                
                duration_change = task2['baseline_duration'] - task1['baseline_duration']
                cost_change = task2.get('baseline_cost', 0) - task1.get('baseline_cost', 0)
                
                if duration_change != 0 or cost_change != 0:
                    comparisons.append({
                        'task_id': task_id,
                        'task_name': task1['task_name'],
                        'baseline1_duration': task1['baseline_duration'],
                        'baseline2_duration': task2['baseline_duration'],
                        'duration_change': duration_change,
                        'baseline1_cost': task1.get('baseline_cost', 0),
                        'baseline2_cost': task2.get('baseline_cost', 0),
                        'cost_change': cost_change,
                        'change_type': 'modified'
                    })
            
            # Tasks only in baseline2 (added)
            added_tasks = set(baseline2_tasks.keys()) - set(baseline1_tasks.keys())
            for task_id in added_tasks:
                task = baseline2_tasks[task_id]
                comparisons.append({
                    'task_id': task_id,
                    'task_name': task['task_name'],
                    'baseline2_duration': task['baseline_duration'],
                    'baseline2_cost': task.get('baseline_cost', 0),
                    'change_type': 'added'
                })
            
            # Tasks only in baseline1 (removed)
            removed_tasks = set(baseline1_tasks.keys()) - set(baseline2_tasks.keys())
            for task_id in removed_tasks:
                task = baseline1_tasks[task_id]
                comparisons.append({
                    'task_id': task_id,
                    'task_name': task['task_name'],
                    'baseline1_duration': task['baseline_duration'],
                    'baseline1_cost': task.get('baseline_cost', 0),
                    'change_type': 'removed'
                })
            
            return {
                'baseline1': {
                    'id': baseline1['id'],
                    'name': baseline1['name'],
                    'date': baseline1['baseline_date']
                },
                'baseline2': {
                    'id': baseline2['id'],
                    'name': baseline2['name'],
                    'date': baseline2['baseline_date']
                },
                'changes': comparisons,
                'summary': {
                    'total_changes': len(comparisons),
                    'tasks_added': len([c for c in comparisons if c['change_type'] == 'added']),
                    'tasks_removed': len([c for c in comparisons if c['change_type'] == 'removed']),
                    'tasks_modified': len([c for c in comparisons if c['change_type'] == 'modified']),
                    'total_duration_change': sum(c.get('duration_change', c.get('baseline2_duration', 0) - c.get('baseline1_duration', 0)) 
                                                for c in comparisons),
                    'total_cost_change': sum(c.get('cost_change', c.get('baseline2_cost', 0) - c.get('baseline1_cost', 0)) 
                                           for c in comparisons)
                }
            }
            
        except Exception as e:
            logger.error(f"Error comparing baselines: {e}")
            raise
    
    def _calculate_evm_metrics(self, baseline: Dict, current_tasks: List[Dict]) -> Dict:
        """
        Calculate Earned Value Management metrics
        - PV (Planned Value): Baseline cost for work scheduled
        - EV (Earned Value): Baseline cost for work completed
        - AC (Actual Cost): Actual cost incurred
        - SPI (Schedule Performance Index): EV / PV
        - CPI (Cost Performance Index): EV / AC
        """
        try:
            baseline_tasks = {t['task_id']: t for t in baseline.get('task_snapshots', [])}
            
            pv = 0  # Planned Value
            ev = 0  # Earned Value
            ac = 0  # Actual Cost
            
            for task in current_tasks:
                baseline_task = baseline_tasks.get(task['id'])
                if not baseline_task:
                    continue
                
                baseline_cost = baseline_task.get('baseline_cost', 0)
                percent_complete = task.get('percent_complete', 0) / 100
                actual_cost = task.get('actual_cost', 0)
                
                # Planned Value: baseline cost
                pv += baseline_cost
                
                # Earned Value: baseline cost * percent complete
                ev += baseline_cost * percent_complete
                
                # Actual Cost
                ac += actual_cost if actual_cost > 0 else baseline_cost * percent_complete
            
            # Calculate performance indices
            spi = (ev / pv) if pv > 0 else 1.0  # Schedule Performance Index
            cpi = (ev / ac) if ac > 0 else 1.0  # Cost Performance Index
            
            # Calculate variances
            sv = ev - pv  # Schedule Variance
            cv = ev - ac  # Cost Variance
            
            # Estimate at Completion (EAC)
            bac = baseline.get('summary', {}).get('total_planned_cost', 0)  # Budget at Completion
            eac = bac / cpi if cpi > 0 else bac
            
            # Variance at Completion (VAC)
            vac = bac - eac
            
            # To Complete Performance Index (TCPI)
            work_remaining = bac - ev
            funds_remaining = bac - ac
            tcpi = work_remaining / funds_remaining if funds_remaining > 0 else 0
            
            return {
                'pv': round(pv, 2),
                'ev': round(ev, 2),
                'ac': round(ac, 2),
                'spi': round(spi, 3),
                'cpi': round(cpi, 3),
                'sv': round(sv, 2),
                'cv': round(cv, 2),
                'bac': round(bac, 2),
                'eac': round(eac, 2),
                'vac': round(vac, 2),
                'tcpi': round(tcpi, 3),
                'performance_status': self._get_evm_status(spi, cpi),
                'interpretation': {
                    'schedule': 'Ahead of schedule' if spi > 1 else 'Behind schedule' if spi < 1 else 'On schedule',
                    'cost': 'Under budget' if cpi > 1 else 'Over budget' if cpi < 1 else 'On budget'
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating EVM metrics: {e}")
            return {}
    
    # Helper methods
    
    def _parse_date(self, date_value) -> Optional[datetime]:
        """Parse date from string or datetime object"""
        if not date_value:
            return None
        if isinstance(date_value, str):
            try:
                return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            except:
                return None
        return date_value
    
    def _calculate_variance_severity(self, schedule_var_pct: float, 
                                    cost_var_pct: float, percent_complete: float) -> str:
        """Calculate variance severity level"""
        max_variance = max(abs(schedule_var_pct), abs(cost_var_pct))
        
        if max_variance <= 5:
            return 'low'
        elif max_variance <= 15:
            return 'medium'
        elif max_variance <= 30:
            return 'high'
        else:
            return 'critical'
    
    def _calculate_variance_health_score(self, schedule_var_pct: float, 
                                        cost_var_pct: float, variances: List[Dict]) -> float:
        """Calculate overall variance health score (0-100)"""
        # Factor 1: Overall schedule variance (closer to 0 is better)
        schedule_score = max(0, 100 - abs(schedule_var_pct))
        
        # Factor 2: Overall cost variance (closer to 0 is better)
        cost_score = max(0, 100 - abs(cost_var_pct))
        
        # Factor 3: Number of critical/high severity variances (fewer is better)
        critical_count = len([v for v in variances if v.get('severity') in ['critical', 'high']])
        severity_score = max(0, 100 - (critical_count * 10))
        
        # Weighted average
        health_score = (
            schedule_score * 0.4 +
            cost_score * 0.4 +
            severity_score * 0.2
        )
        
        return round(health_score, 2)
    
    def _get_evm_status(self, spi: float, cpi: float) -> str:
        """Get overall EVM performance status"""
        if spi >= 1.0 and cpi >= 1.0:
            return 'excellent'
        elif spi >= 0.95 and cpi >= 0.95:
            return 'good'
        elif spi >= 0.85 or cpi >= 0.85:
            return 'concerning'
        else:
            return 'critical'
    
    def _generate_variance_recommendations(self, variances: List[Dict], 
                                          evm_metrics: Dict) -> List[str]:
        """Generate recommendations based on variance analysis"""
        recommendations = []
        
        # Critical variances
        critical_vars = [v for v in variances if v.get('severity') in ['critical', 'high']]
        if critical_vars:
            recommendations.append(
                f"⚠️ {len(critical_vars)} tasks have critical variances. Immediate attention required."
            )
        
        # Schedule performance
        spi = evm_metrics.get('spi', 1.0)
        if spi < 0.9:
            recommendations.append(
                f"📅 Project is behind schedule (SPI: {spi:.2f}). Consider fast-tracking or crashing critical path."
            )
        elif spi > 1.1:
            recommendations.append(
                f"✅ Project is ahead of schedule (SPI: {spi:.2f}). Good progress!"
            )
        
        # Cost performance
        cpi = evm_metrics.get('cpi', 1.0)
        if cpi < 0.9:
            recommendations.append(
                f"💰 Project is over budget (CPI: {cpi:.2f}). Review resource costs and task estimates."
            )
        elif cpi > 1.1:
            recommendations.append(
                f"✅ Project is under budget (CPI: {cpi:.2f}). Efficient resource utilization!"
            )
        
        # TCPI analysis
        tcpi = evm_metrics.get('tcpi', 0)
        if tcpi > 1.1:
            recommendations.append(
                f"⚠️ High TCPI ({tcpi:.2f}) indicates tight budget for remaining work. Monitor closely."
            )
        
        return recommendations


# Singleton instance
baseline_service = BaselineService()
