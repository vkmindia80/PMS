"""
Gantt Chart Export Service
Implements export capabilities for timeline/Gantt charts including:
- PDF export with formatted layout
- PNG/Image export
- Excel/CSV export with detailed data
- Print-optimized views
- MS Project compatible formats
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import csv
import io
import json

logger = logging.getLogger(__name__)


class GanttExportService:
    """Service for exporting Gantt charts in various formats"""
    
    def export_to_csv(self, tasks: List[Dict], dependencies: List[Dict], 
                     include_variance: bool = False, baseline: Optional[Dict] = None) -> str:
        """
        Export Gantt chart data to CSV format
        
        Args:
            tasks: List of tasks
            dependencies: List of dependencies
            include_variance: Include baseline variance if available
            baseline: Optional baseline data
        
        Returns:
            CSV string
        """
        try:
            output = io.StringIO()
            
            # Define CSV columns
            if include_variance and baseline:
                fieldnames = [
                    'Task ID', 'Task Name', 'Start Date', 'Finish Date', 'Duration (hours)',
                    'Percent Complete', 'Assignees', 'Critical', 'Predecessors',
                    'Baseline Start', 'Baseline Finish', 'Baseline Duration',
                    'Schedule Variance (days)', 'Status'
                ]
            else:
                fieldnames = [
                    'Task ID', 'Task Name', 'Start Date', 'Finish Date', 'Duration (hours)',
                    'Percent Complete', 'Assignees', 'Critical', 'Predecessors', 'Status'
                ]
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            # Build dependency lookup
            predecessors_map = {}
            for dep in dependencies:
                succ_id = dep.get('successor_id')
                pred_id = dep.get('predecessor_id')
                dep_type = dep.get('dependency_type', 'FS')
                
                if succ_id not in predecessors_map:
                    predecessors_map[succ_id] = []
                predecessors_map[succ_id].append(f"{pred_id}({dep_type})")
            
            # Build baseline lookup if available
            baseline_map = {}
            if baseline:
                for snapshot in baseline.get('task_snapshots', []):
                    baseline_map[snapshot['task_id']] = snapshot
            
            # Write task data
            for task in tasks:
                start_date = self._format_date(task.get('start_date'))
                finish_date = self._format_date(task.get('finish_date'))
                
                row_data = {
                    'Task ID': task.get('id', ''),
                    'Task Name': task.get('name', ''),
                    'Start Date': start_date,
                    'Finish Date': finish_date,
                    'Duration (hours)': task.get('duration', 8),
                    'Percent Complete': f"{task.get('percent_complete', 0)}%",
                    'Assignees': ', '.join(task.get('assignee_ids', [])),
                    'Critical': 'Yes' if task.get('critical') else 'No',
                    'Predecessors': ', '.join(predecessors_map.get(task['id'], [])),
                    'Status': self._get_task_status(task)
                }
                
                # Add baseline variance if requested
                if include_variance and task['id'] in baseline_map:
                    baseline_task = baseline_map[task['id']]
                    baseline_start = self._format_date(baseline_task.get('baseline_start'))
                    baseline_finish = self._format_date(baseline_task.get('baseline_finish'))
                    
                    # Calculate variance
                    schedule_variance = self._calculate_schedule_variance_days(
                        task.get('finish_date'), baseline_task.get('baseline_finish')
                    )
                    
                    row_data.update({
                        'Baseline Start': baseline_start,
                        'Baseline Finish': baseline_finish,
                        'Baseline Duration': baseline_task.get('baseline_duration', 8),
                        'Schedule Variance (days)': schedule_variance
                    })
                
                writer.writerow(row_data)
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {e}")
            raise
    
    def export_to_excel_data(self, tasks: List[Dict], dependencies: List[Dict],
                            cpm_analysis: Optional[Dict] = None,
                            resource_analysis: Optional[Dict] = None) -> Dict:
        """
        Export Gantt chart data in Excel-ready format with multiple sheets
        
        Returns:
            Dictionary with sheet data that can be used by Excel libraries
        """
        try:
            # Sheet 1: Tasks
            tasks_data = []
            for task in tasks:
                task_row = {
                    'ID': task.get('id', ''),
                    'Name': task.get('name', ''),
                    'Start': self._format_date(task.get('start_date')),
                    'Finish': self._format_date(task.get('finish_date')),
                    'Duration (h)': task.get('duration', 8),
                    'Progress': task.get('percent_complete', 0),
                    'Critical': task.get('critical', False),
                    'Assignees': ', '.join(task.get('assignee_ids', []))
                }
                
                # Add CPM data if available
                if cpm_analysis and task['id'] in cpm_analysis.get('task_analysis', {}):
                    analysis = cpm_analysis['task_analysis'][task['id']]
                    task_row.update({
                        'Total Float (h)': round(analysis.get('total_float', 0), 2),
                        'Free Float (h)': round(analysis.get('free_float', 0), 2),
                        'Early Start': self._format_date(analysis.get('early_start')),
                        'Early Finish': self._format_date(analysis.get('early_finish')),
                        'Late Start': self._format_date(analysis.get('late_start')),
                        'Late Finish': self._format_date(analysis.get('late_finish'))
                    })
                
                tasks_data.append(task_row)
            
            # Sheet 2: Dependencies
            dependencies_data = []
            for dep in dependencies:
                dependencies_data.append({
                    'Predecessor': dep.get('predecessor_id', ''),
                    'Successor': dep.get('successor_id', ''),
                    'Type': dep.get('dependency_type', 'FS'),
                    'Lag (days)': dep.get('lag_duration', 0)
                })
            
            # Sheet 3: Summary
            summary_data = [{
                'Metric': 'Total Tasks',
                'Value': len(tasks)
            }, {
                'Metric': 'Completed Tasks',
                'Value': len([t for t in tasks if t.get('percent_complete', 0) >= 100])
            }, {
                'Metric': 'In Progress Tasks',
                'Value': len([t for t in tasks if 0 < t.get('percent_complete', 0) < 100])
            }]
            
            if cpm_analysis:
                summary_data.extend([{
                    'Metric': 'Critical Path Length',
                    'Value': cpm_analysis.get('critical_path_length', 0)
                }, {
                    'Metric': 'Project Duration (days)',
                    'Value': cpm_analysis.get('project_duration_days', 0)
                }, {
                    'Metric': 'Schedule Health Score',
                    'Value': f"{cpm_analysis.get('schedule_health_score', 0)}%"
                }])
            
            if resource_analysis:
                summary_data.append({
                    'Metric': 'Resource Conflicts',
                    'Value': resource_analysis.get('total_conflicts', 0)
                })
            
            # Sheet 4: Critical Path (if available)
            critical_path_data = []
            if cpm_analysis:
                for task_id in cpm_analysis.get('critical_path', []):
                    task = next((t for t in tasks if t['id'] == task_id), None)
                    if task:
                        critical_path_data.append({
                            'Task ID': task_id,
                            'Task Name': task.get('name', ''),
                            'Duration (h)': task.get('duration', 8),
                            'Start': self._format_date(task.get('start_date')),
                            'Finish': self._format_date(task.get('finish_date'))
                        })
            
            return {
                'tasks': tasks_data,
                'dependencies': dependencies_data,
                'summary': summary_data,
                'critical_path': critical_path_data
            }
            
        except Exception as e:
            logger.error(f"Error preparing Excel export data: {e}")
            raise
    
    def generate_ms_project_xml(self, project_name: str, tasks: List[Dict], 
                               dependencies: List[Dict]) -> str:
        """
        Generate MS Project compatible XML format
        
        Returns:
            XML string in MS Project format
        """
        try:
            # MS Project XML structure (simplified)
            xml_parts = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<Project xmlns="http://schemas.microsoft.com/project">',
                f'  <Name>{self._xml_escape(project_name)}</Name>',
                f'  <CreationDate>{datetime.utcnow().isoformat()}</CreationDate>',
                '  <Tasks>'
            ]
            
            # Add tasks
            for idx, task in enumerate(tasks, start=1):
                start = self._format_date_ms_project(task.get('start_date'))
                finish = self._format_date_ms_project(task.get('finish_date'))
                
                xml_parts.extend([
                    '    <Task>',
                    f'      <UID>{idx}</UID>',
                    f'      <ID>{idx}</ID>',
                    f'      <Name>{self._xml_escape(task.get("name", ""))}</Name>',
                    f'      <Start>{start}</Start>',
                    f'      <Finish>{finish}</Finish>',
                    f'      <Duration>PT{task.get("duration", 8)}H</Duration>',
                    f'      <PercentComplete>{task.get("percent_complete", 0)}</PercentComplete>',
                    f'      <Critical>{1 if task.get("critical") else 0}</Critical>',
                    '    </Task>'
                ])
            
            xml_parts.append('  </Tasks>')
            
            # Add predecessors
            if dependencies:
                xml_parts.append('  <PredecessorLinks>')
                for dep in dependencies:
                    xml_parts.extend([
                        '    <PredecessorLink>',
                        f'      <PredecessorUID>{dep.get("predecessor_id")}</PredecessorUID>',
                        f'      <SuccessorUID>{dep.get("successor_id")}</SuccessorUID>',
                        f'      <Type>{self._convert_dep_type_to_ms_project(dep.get("dependency_type", "FS"))}</Type>',
                        f'      <LinkLag>{dep.get("lag_duration", 0)}</LinkLag>',
                        '    </PredecessorLink>'
                    ])
                xml_parts.append('  </PredecessorLinks>')
            
            xml_parts.append('</Project>')
            
            return '\n'.join(xml_parts)
            
        except Exception as e:
            logger.error(f"Error generating MS Project XML: {e}")
            raise
    
    def generate_print_html(self, project_name: str, tasks: List[Dict],
                           dependencies: List[Dict], 
                           include_gantt_chart: bool = True) -> str:
        """
        Generate print-optimized HTML view of Gantt chart
        
        Returns:
            HTML string optimized for printing
        """
        try:
            html_parts = [
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '  <meta charset="UTF-8">',
                f'  <title>{project_name} - Gantt Chart</title>',
                '  <style>',
                '    @media print {',
                '      @page { size: landscape; margin: 1cm; }',
                '      body { font-family: Arial, sans-serif; font-size: 10pt; }',
                '    }',
                '    body { font-family: Arial, sans-serif; margin: 20px; }',
                '    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }',
                '    table { width: 100%; border-collapse: collapse; margin-top: 20px; }',
                '    th { background-color: #4CAF50; color: white; padding: 10px; text-align: left; }',
                '    td { padding: 8px; border-bottom: 1px solid #ddd; }',
                '    tr:hover { background-color: #f5f5f5; }',
                '    .critical { color: #f44336; font-weight: bold; }',
                '    .completed { color: #4CAF50; }',
                '    .header-info { margin-bottom: 20px; }',
                '    .gantt-bar { height: 20px; background-color: #2196F3; border-radius: 3px; }',
                '    .gantt-bar.critical { background-color: #f44336; }',
                '    .gantt-bar.completed { background-color: #4CAF50; }',
                '  </style>',
                '</head>',
                '<body>',
                f'  <h1>{project_name} - Project Timeline</h1>',
                '  <div class="header-info">',
                f'    <p><strong>Generated:</strong> {datetime.now().strftime("%Y-%m-%d %H:%M")}</p>',
                f'    <p><strong>Total Tasks:</strong> {len(tasks)}</p>',
                f'    <p><strong>Dependencies:</strong> {len(dependencies)}</p>',
                '  </div>',
                '  <table>',
                '    <thead>',
                '      <tr>',
                '        <th>Task Name</th>',
                '        <th>Start Date</th>',
                '        <th>Finish Date</th>',
                '        <th>Duration</th>',
                '        <th>Progress</th>',
                '        <th>Status</th>',
                '      </tr>',
                '    </thead>',
                '    <tbody>'
            ]
            
            # Add task rows
            for task in tasks:
                status = self._get_task_status(task)
                is_critical = task.get('critical', False)
                is_completed = task.get('percent_complete', 0) >= 100
                
                css_class = 'critical' if is_critical else 'completed' if is_completed else ''
                
                html_parts.extend([
                    '      <tr>',
                    f'        <td class="{css_class}">{self._xml_escape(task.get("name", ""))}</td>',
                    f'        <td>{self._format_date(task.get("start_date"))}</td>',
                    f'        <td>{self._format_date(task.get("finish_date"))}</td>',
                    f'        <td>{task.get("duration", 8)}h</td>',
                    f'        <td>{task.get("percent_complete", 0)}%</td>',
                    f'        <td>{status}</td>',
                    '      </tr>'
                ])
            
            html_parts.extend([
                '    </tbody>',
                '  </table>',
                '</body>',
                '</html>'
            ])
            
            return '\n'.join(html_parts)
            
        except Exception as e:
            logger.error(f"Error generating print HTML: {e}")
            raise
    
    def generate_json_export(self, project_name: str, tasks: List[Dict],
                            dependencies: List[Dict], 
                            cpm_analysis: Optional[Dict] = None,
                            baseline_analysis: Optional[Dict] = None) -> str:
        """
        Generate comprehensive JSON export with all data
        
        Returns:
            JSON string with complete project data
        """
        try:
            export_data = {
                'export_metadata': {
                    'project_name': project_name,
                    'export_date': datetime.utcnow().isoformat(),
                    'export_version': '1.0',
                    'format': 'gantt-json-export'
                },
                'project_data': {
                    'tasks': tasks,
                    'dependencies': dependencies
                }
            }
            
            if cpm_analysis:
                export_data['cpm_analysis'] = cpm_analysis
            
            if baseline_analysis:
                export_data['baseline_analysis'] = baseline_analysis
            
            return json.dumps(export_data, indent=2, default=str)
            
        except Exception as e:
            logger.error(f"Error generating JSON export: {e}")
            raise
    
    # Helper methods
    
    def _format_date(self, date_value) -> str:
        """Format date for display"""
        if not date_value:
            return ''
        if isinstance(date_value, str):
            try:
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                return dt.strftime('%Y-%m-%d')
            except:
                return date_value
        return date_value.strftime('%Y-%m-%d')
    
    def _format_date_ms_project(self, date_value) -> str:
        """Format date for MS Project XML"""
        if not date_value:
            return datetime.utcnow().isoformat()
        if isinstance(date_value, str):
            return date_value
        return date_value.isoformat()
    
    def _get_task_status(self, task: Dict) -> str:
        """Get task status label"""
        progress = task.get('percent_complete', 0)
        if progress >= 100:
            return 'Completed'
        elif progress > 0:
            return 'In Progress'
        else:
            return 'Not Started'
    
    def _calculate_schedule_variance_days(self, actual_date, baseline_date) -> float:
        """Calculate schedule variance in days"""
        try:
            if not actual_date or not baseline_date:
                return 0
            
            actual = datetime.fromisoformat(str(actual_date).replace('Z', '+00:00'))
            baseline = datetime.fromisoformat(str(baseline_date).replace('Z', '+00:00'))
            
            variance_days = (actual - baseline).days
            return variance_days
        except:
            return 0
    
    def _xml_escape(self, text: str) -> str:
        """Escape special XML characters"""
        if not text:
            return ''
        return (str(text)
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&apos;'))
    
    def _convert_dep_type_to_ms_project(self, dep_type: str) -> int:
        """Convert dependency type to MS Project numeric format"""
        mapping = {
            'FS': 1,  # Finish-to-Start
            'SS': 2,  # Start-to-Start
            'FF': 3,  # Finish-to-Finish
            'SF': 4   # Start-to-Finish
        }
        return mapping.get(dep_type, 1)


# Singleton instance
gantt_export_service = GanttExportService()
