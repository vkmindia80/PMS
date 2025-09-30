import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Users, Layers, Settings, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Timeline interfaces
interface TimelineTask {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  duration: number;
  start_date: string;
  finish_date: string;
  percent_complete: number;
  outline_level: number;
  summary_task: boolean;
  critical: boolean;
  assignee_ids: string[];
  milestone: boolean;
  color?: string;
}

interface TaskDependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: string;
  lag_duration: number;
  project_id: string;
}

interface GanttChartData {
  project_id: string;
  tasks: TimelineTask[];
  dependencies: TaskDependency[];
  critical_path: string[];
}

interface TimelineViewMode {
  value: string;
  label: string;
  days: number;
}

const timelineViewModes: TimelineViewMode[] = [
  { value: 'day', label: 'Day', days: 1 },
  { value: 'week', label: 'Week', days: 7 },
  { value: 'month', label: 'Month', days: 30 },
  { value: 'quarter', label: 'Quarter', days: 90 }
];

// Gantt Chart Canvas Component
const GanttChart: React.FC<{
  data: GanttChartData;
  viewMode: string;
  onTaskUpdate: (task: TimelineTask) => void;
}> = ({ data, viewMode, onTaskUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const drawGanttChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size based on data
    const taskCount = data.tasks.length;
    canvas.width = Math.max(1200, 1000 + taskCount * 20);
    canvas.height = Math.max(600, taskCount * 50 + 150);

    // Enhanced timeline header
    drawTimelineHeader(ctx, viewMode);

    // Draw grid lines
    drawGridLines(ctx, viewMode);

    // Draw tasks with enhanced styling
    data.tasks.forEach((task, index) => {
      drawTaskBar(ctx, task, index, viewMode);
    });

    // Draw dependencies with enhanced styling
    data.dependencies.forEach(dependency => {
      drawDependencyLine(ctx, dependency, data.tasks);
    });

    // Draw current date indicator
    drawCurrentDateLine(ctx, viewMode);
  }, [data, viewMode]);

  const drawTimelineHeader = (ctx: CanvasRenderingContext2D, viewMode: string) => {
    const headerHeight = 60;
    
    // Header background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(200, 0, ctx.canvas.width - 200, headerHeight);
    
    // Draw time scale
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    const startDate = new Date();
    const timeUnit = viewMode === 'day' ? 50 : viewMode === 'week' ? 100 : 150;
    
    for (let i = 0; i < 20; i++) {
      const x = 200 + i * timeUnit;
      
      // Vertical grid line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
      
      // Date label
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i * (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30));
      
      ctx.fillStyle = '#64748b';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        x + timeUnit / 2,
        20
      );
      
      // Weekday for day view
      if (viewMode === 'day') {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(
          date.toLocaleDateString('en-US', { weekday: 'short' }),
          x + timeUnit / 2,
          40
        );
      }
    }
  };

  const drawTaskBar = (ctx: CanvasRenderingContext2D, task: TimelineTask, index: number, viewMode: string) => {
    const y = 80 + index * 40;
    const taskNameWidth = 180;
    
    // Task name background
    ctx.fillStyle = task.outline_level === 1 ? '#f1f5f9' : '#ffffff';
    ctx.fillRect(0, y - 15, taskNameWidth, 30);
    
    // Task name
    ctx.fillStyle = task.summary_task ? '#1e293b' : '#475569';
    ctx.font = task.summary_task ? 'bold 13px -apple-system' : '13px -apple-system';
    ctx.textAlign = 'left';
    
    const indent = (task.outline_level - 1) * 20;
    ctx.fillText(
      task.name.length > 20 ? task.name.substring(0, 17) + '...' : task.name,
      10 + indent,
      y + 5
    );
    
    // Calculate task bar position and width
    const timeUnit = viewMode === 'day' ? 50 : viewMode === 'week' ? 100 : 150;
    const startX = 200 + (index * 2) * timeUnit; // Simplified positioning
    const barWidth = Math.max(task.duration * (timeUnit / (viewMode === 'day' ? 8 : viewMode === 'week' ? 40 : 160)), 20);
    
    // Task bar
    if (task.milestone) {
      // Draw diamond for milestone
      ctx.fillStyle = task.critical ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + 10, y - 8);
      ctx.lineTo(startX + 20, y);
      ctx.lineTo(startX + 10, y + 8);
      ctx.closePath();
      ctx.fill();
    } else {
      // Task bar background
      ctx.fillStyle = task.critical ? '#fef2f2' : '#f8fafc';
      ctx.fillRect(startX, y - 8, barWidth, 16);
      
      // Task bar
      const barColor = task.color || (task.critical ? '#ef4444' : task.summary_task ? '#8b5cf6' : '#3b82f6');
      ctx.fillStyle = barColor;
      ctx.fillRect(startX, y - 8, barWidth, 16);
      
      // Progress bar
      if (task.percent_complete > 0) {
        const progressWidth = (barWidth * task.percent_complete) / 100;
        ctx.fillStyle = task.critical ? '#dc2626' : '#1d4ed8';
        ctx.fillRect(startX, y - 8, progressWidth, 16);
      }
      
      // Task bar border
      ctx.strokeStyle = task.critical ? '#dc2626' : '#1e40af';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, y - 8, barWidth, 16);
      
      // Progress percentage text
      if (task.percent_complete > 0 && barWidth > 30) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px -apple-system';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${task.percent_complete}%`,
          startX + barWidth / 2,
          y + 3
        );
      }
    }
    
    // Assignee indicators
    if (task.assignee_ids.length > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px -apple-system';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${task.assignee_ids.length} user${task.assignee_ids.length > 1 ? 's' : ''}`,
        taskNameWidth - 5,
        y - 5
      );
    }
  };

  const drawDependencyLine = (ctx: CanvasRenderingContext2D, dependency: TaskDependency, tasks: TimelineTask[]) => {
    const predecessorIndex = tasks.findIndex(t => t.id === dependency.predecessor_id);
    const successorIndex = tasks.findIndex(t => t.id === dependency.successor_id);
    
    if (predecessorIndex === -1 || successorIndex === -1) return;
    
    const timeUnit = 50; // Simplified
    const startY = 80 + predecessorIndex * 40;
    const endY = 80 + successorIndex * 40;
    const startX = 200 + (predecessorIndex * 2 + 1) * timeUnit;
    const endX = 200 + (successorIndex * 2) * timeUnit;
    
    // Dependency line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX - 10, endY);
    ctx.stroke();
    
    // Arrow head
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(endX - 10, endY);
    ctx.lineTo(endX - 15, endY - 5);
    ctx.lineTo(endX - 15, endY + 5);
    ctx.closePath();
    ctx.fill();
  };

  // Handle mouse events for drag and drop
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is on a task bar
    const taskIndex = Math.floor((y - 80) / 40);
    if (taskIndex >= 0 && taskIndex < data.tasks.length && x > 200) {
      setIsDragging(true);
      setDraggedTask(data.tasks[taskIndex].id);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !draggedTask) return;

    // Update cursor to indicate dragging
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = () => {
    if (isDragging && draggedTask) {
      // TODO: Implement task update logic
      console.log('Task drag completed:', draggedTask);
    }
    
    setIsDragging(false);
    setDraggedTask(null);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  useEffect(() => {
    drawGanttChart();
  }, [drawGanttChart]);

  return (
    <div className="timeline-canvas-container">
      <canvas
        ref={canvasRef}
        className="border border-gray-200 rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      />
    </div>
  );
};

// Main Timeline Page Component
export const TimelinePage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);
  const [projects, setProjects] = useState<any[]>([]);
  const [ganttData, setGanttData] = useState<GanttChartData | null>(null);
  const [viewMode, setViewMode] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Fetch available projects
  const fetchProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const token = localStorage.getItem('auth_tokens');
      const authData = token ? JSON.parse(token) : null;
      
      if (!authData?.access_token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const projectsData = await response.json();
      setProjects(projectsData);
      
      // Auto-select first project if no URL projectId and projects available
      if (!urlProjectId && projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
      
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  }, [urlProjectId]);

  // Fetch Gantt chart data
  const fetchGanttData = useCallback(async () => {
    if (!selectedProjectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_tokens');
      const authData = token ? JSON.parse(token) : null;
      
      if (!authData?.access_token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/timeline/gantt/${selectedProjectId}`, {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch timeline data: ${response.status}`);
      }

      const data = await response.json();
      setGanttData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Gantt data:', err);
      setError('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  // Handle task updates
  const handleTaskUpdate = useCallback(async (task: TimelineTask) => {
    try {
      const token = localStorage.getItem('auth_tokens');
      const authData = token ? JSON.parse(token) : null;
      
      if (!authData?.access_token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/timeline/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: task.start_date,
          duration: task.duration,
          percent_complete: task.percent_complete
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }

      // Refresh data
      await fetchGanttData();
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  }, [fetchGanttData]);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch gantt data when selectedProjectId changes
  useEffect(() => {
    fetchGanttData();
  }, [fetchGanttData]);

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {projectsLoading ? 'Loading projects...' : 'Loading timeline data...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchGanttData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timeline Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Timeline Management</h1>
              <p className="text-sm text-gray-600">Microsoft Project-compatible Gantt chart</p>
            </div>
          </div>

          {/* View Mode Selector and Project Selector */}
          <div className="flex items-center space-x-4">
            {/* Project Selector */}
            {!urlProjectId && projects.length > 0 && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Project:</label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">View:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timelineViewModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {/* TODO: Zoom in */}}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => {/* TODO: Zoom out */}}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={fetchGanttData}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Refresh"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Stats */}
      {ganttData && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {ganttData.tasks.length} tasks
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {ganttData.dependencies.length} dependencies
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {ganttData.critical_path.length} critical tasks
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="p-6">
        {!selectedProjectId && !urlProjectId ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
            <p className="text-gray-600 mb-4">Choose a project to view its timeline and Gantt chart.</p>
            {projects.length === 0 && (
              <p className="text-sm text-gray-500">No projects available. Create a project first.</p>
            )}
          </div>
        ) : ganttData ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
              <p className="text-sm text-gray-600">Drag tasks to reschedule • Right-click for options</p>
            </div>
            
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <GanttChart
                data={ganttData}
                viewMode={viewMode}
                onTaskUpdate={handleTaskUpdate}
              />
            </div>
            
            {/* Timeline Legend */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center space-x-6 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-blue-600 rounded"></div>
                  <span className="text-gray-600">Normal Task</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Critical Path</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-2 bg-purple-600 rounded"></div>
                  <span className="text-gray-600">Summary Task</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-blue-600"></div>
                  <span className="text-gray-600">Milestone</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
            <p className="text-gray-600 mb-4">No timeline tasks found for this project.</p>
            <button
              onClick={fetchGanttData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Refresh Timeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePage;