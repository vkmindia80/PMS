import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Users, Layers, Settings, ZoomIn, ZoomOut, RotateCcw, Zap } from 'lucide-react';
import { API_ENDPOINTS } from '../utils/config';
import EnhancedTimelineView from '../components/timeline/EnhancedTimelineView';

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

    // Set canvas size based on data and timeline span
    const taskCount = data.tasks.length;
    const timelineWidth = Math.max(1200, 30 * (viewMode === 'day' ? 80 : viewMode === 'week' ? 120 : 200)); // 30 time units
    canvas.width = 250 + timelineWidth; // Task names width + timeline width
    canvas.height = Math.max(400, taskCount * 50 + 150); // Header + tasks + padding

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Enhanced timeline header
    drawTimelineHeader(ctx, viewMode);

    // Draw grid lines
    drawGridLines(ctx, viewMode);

    // Draw tasks with enhanced styling
    if (data.tasks && data.tasks.length > 0) {
      data.tasks.forEach((task, index) => {
        drawTaskBar(ctx, task, index, viewMode);
      });
    }

    // Draw dependencies with enhanced styling
    if (data.dependencies && data.dependencies.length > 0) {
      data.dependencies.forEach(dependency => {
        drawDependencyLine(ctx, dependency, data.tasks);
      });
    }

    // Draw current date indicator
    drawCurrentDateLine(ctx, viewMode);
  }, [data, viewMode]);

  const drawTimelineHeader = (ctx: CanvasRenderingContext2D, viewMode: string) => {
    const headerHeight = 80;
    const taskNameWidth = 250;
    
    // Header background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, ctx.canvas.width, headerHeight);
    
    // Task name header
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, taskNameWidth, headerHeight);
    
    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Task Name', taskNameWidth / 2, 30);
    
    // Timeline header
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(taskNameWidth, 0, ctx.canvas.width - taskNameWidth, 40);
    
    // Draw time scale with enhanced styling
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    const startDate = new Date();
    const timeUnit = viewMode === 'day' ? 80 : viewMode === 'week' ? 120 : 200;
    
    for (let i = 0; i < 30; i++) {
      const x = taskNameWidth + i * timeUnit;
      
      if (x > ctx.canvas.width) break;
      
      // Vertical grid line
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
      
      // Date label
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i * (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30));
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          ...(viewMode === 'month' && { year: '2-digit' })
        }),
        x + timeUnit / 2,
        25
      );
      
      // Sub-header for weekdays
      if (viewMode === 'day') {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(
          date.toLocaleDateString('en-US', { weekday: 'short' }),
          x + timeUnit / 2,
          55
        );
      }
    }
  };

  const drawGridLines = (ctx: CanvasRenderingContext2D, viewMode: string) => {
    const taskNameWidth = 250;
    const taskHeight = 50;
    const headerHeight = 80;
    
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    
    // Horizontal lines for task rows
    for (let i = 0; i <= data.tasks.length; i++) {
      const y = headerHeight + i * taskHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  };

  const drawCurrentDateLine = (ctx: CanvasRenderingContext2D, viewMode: string) => {
    const taskNameWidth = 250;
    const headerHeight = 80;
    const currentDate = new Date();
    
    // Calculate position of current date line
    const timeUnit = viewMode === 'day' ? 80 : viewMode === 'week' ? 120 : 200;
    const x = taskNameWidth + (currentDate.getDate() - 1) * (timeUnit / 30); // Simplified positioning
    
    if (x > taskNameWidth && x < ctx.canvas.width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
      
      // Current date indicator
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - 1, headerHeight - 10, 2, 10);
    }
  };
  // Helper functions for enhanced styling
  const adjustBrightness = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const getAvatarColor = (userId: string): string => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const drawTaskBar = (ctx: CanvasRenderingContext2D, task: TimelineTask, index: number, viewMode: string) => {
    const taskNameWidth = 250;
    const taskHeight = 50;
    const headerHeight = 80;
    const y = headerHeight + index * taskHeight;
    
    // Task name background with alternating colors
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f9fafb';
    ctx.fillRect(0, y, taskNameWidth, taskHeight);
    
    // Task name with better formatting
    ctx.fillStyle = task.summary_task ? '#111827' : '#374151';
    ctx.font = task.summary_task ? 'bold 14px -apple-system' : '13px -apple-system';
    ctx.textAlign = 'left';
    
    const indent = (task.outline_level - 1) * 20;
    const maxWidth = taskNameWidth - indent - 20;
    const taskName = task.name.length > 25 ? task.name.substring(0, 22) + '...' : task.name;
    
    // Draw outline level indicator
    if (task.outline_level > 1) {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10 + indent - 10, y + taskHeight / 2);
      ctx.lineTo(10 + indent, y + taskHeight / 2);
      ctx.stroke();
    }
    
    ctx.fillText(taskName, 15 + indent, y + taskHeight / 2 + 5);
    
    // Task progress indicator in name area
    if (task.percent_complete > 0) {
      ctx.fillStyle = task.critical ? '#fecaca' : '#dbeafe';
      ctx.fillRect(15 + indent, y + taskHeight - 8, maxWidth * (task.percent_complete / 100), 3);
    }
    
    // Calculate task bar position based on actual dates
    const timeUnit = viewMode === 'day' ? 80 : viewMode === 'week' ? 120 : 200;
    const projectStartDate = new Date(); // Use current date as project start
    
    let taskStartDate = projectStartDate;
    if (task.start_date) {
      try {
        taskStartDate = new Date(task.start_date);
      } catch (e) {
        console.warn('Invalid task start date:', task.start_date);
      }
    }
    
    // Calculate days from project start
    const daysDiff = Math.floor((taskStartDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const startX = taskNameWidth + Math.max(0, daysDiff * (timeUnit / (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30)));
    
    // Calculate bar width based on task duration
    const durationDays = task.duration / 8; // Convert hours to days (assuming 8-hour workdays)
    const barWidth = Math.max(durationDays * (timeUnit / (viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30)), 20);
    
    // Task bar with enhanced styling
    if (task.milestone) {
      // Enhanced diamond for milestone
      const diamondSize = 12;
      const centerX = startX + diamondSize / 2;
      const centerY = y + taskHeight / 2;
      
      // Diamond shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      ctx.moveTo(centerX + 1, centerY - diamondSize / 2 + 1);
      ctx.lineTo(centerX + diamondSize / 2 + 1, centerY + 1);
      ctx.lineTo(centerX + 1, centerY + diamondSize / 2 + 1);
      ctx.lineTo(centerX - diamondSize / 2 + 1, centerY + 1);
      ctx.closePath();
      ctx.fill();
      
      // Diamond
      ctx.fillStyle = task.critical ? '#dc2626' : '#2563eb';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - diamondSize / 2);
      ctx.lineTo(centerX + diamondSize / 2, centerY);
      ctx.lineTo(centerX, centerY + diamondSize / 2);
      ctx.lineTo(centerX - diamondSize / 2, centerY);
      ctx.closePath();
      ctx.fill();
      
      // Diamond border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const barY = y + (taskHeight - 20) / 2;
      const barHeight = 20;
      
      // Task bar shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(startX + 2, barY + 2, barWidth, barHeight);
      
      // Task bar background
      ctx.fillStyle = task.critical ? '#fef2f2' : '#f8fafc';
      ctx.fillRect(startX, barY, barWidth, barHeight);
      
      // Task bar with gradient effect
      const gradient = ctx.createLinearGradient(startX, barY, startX, barY + barHeight);
      const baseColor = task.color || (task.critical ? '#dc2626' : task.summary_task ? '#7c3aed' : '#2563eb');
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, adjustBrightness(baseColor, -20));
      
      ctx.fillStyle = gradient;
      ctx.fillRect(startX, barY, barWidth, barHeight);
      
      // Progress bar with enhanced styling
      if (task.percent_complete > 0) {
        const progressWidth = (barWidth * task.percent_complete) / 100;
        const progressGradient = ctx.createLinearGradient(startX, barY, startX, barY + barHeight);
        const progressColor = adjustBrightness(baseColor, -30);
        progressGradient.addColorStop(0, progressColor);
        progressGradient.addColorStop(1, adjustBrightness(progressColor, -20));
        
        ctx.fillStyle = progressGradient;
        ctx.fillRect(startX, barY, progressWidth, barHeight);
      }
      
      // Task bar border with enhanced styling
      ctx.strokeStyle = adjustBrightness(baseColor, -40);
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, barY, barWidth, barHeight);
      
      // Progress percentage text with better visibility
      if (task.percent_complete > 0 && barWidth > 50) {
        ctx.fillStyle = getContrastColor(baseColor);
        ctx.font = 'bold 11px -apple-system';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${Math.round(task.percent_complete)}%`,
          startX + barWidth / 2,
          barY + barHeight / 2 + 4
        );
      }
      
      // Task duration text
      if (barWidth > 80) {
        ctx.fillStyle = getContrastColor(baseColor);
        ctx.font = '10px -apple-system';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${task.duration}h`,
          startX + 5,
          barY - 5
        );
      }
    }
    
    // Assignee indicators with enhanced styling
    if (task.assignee_ids.length > 0) {
      const avatarSize = 16;
      const avatarY = y + 5;
      
      for (let i = 0; i < Math.min(task.assignee_ids.length, 3); i++) {
        const avatarX = taskNameWidth - 25 - (i * 18);
        
        // Avatar circle
        ctx.fillStyle = getAvatarColor(task.assignee_ids[i]);
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Avatar border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Avatar initial
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px -apple-system';
        ctx.textAlign = 'center';
        ctx.fillText(
          task.assignee_ids[i].substring(0, 1).toUpperCase(),
          avatarX,
          avatarY + 3
        );
      }
      
      // Additional assignees indicator
      if (task.assignee_ids.length > 3) {
        const moreX = taskNameWidth - 25 - (3 * 18);
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px -apple-system';
        ctx.textAlign = 'center';
        ctx.fillText(`+${task.assignee_ids.length - 3}`, moreX, y + taskHeight - 8);
      }
    }
  };

  const drawDependencyLine = (ctx: CanvasRenderingContext2D, dependency: TaskDependency, tasks: TimelineTask[]) => {
    const predecessorIndex = tasks.findIndex(t => t.id === dependency.predecessor_id);
    const successorIndex = tasks.findIndex(t => t.id === dependency.successor_id);
    
    if (predecessorIndex === -1 || successorIndex === -1) return;
    
    const taskNameWidth = 250;
    const taskHeight = 50;
    const headerHeight = 80;
    const timeUnit = viewMode === 'day' ? 80 : viewMode === 'week' ? 120 : 200;
    
    // Calculate positions based on task bars
    const predTask = tasks[predecessorIndex];
    const succTask = tasks[successorIndex];
    
    const startY = headerHeight + predecessorIndex * taskHeight + taskHeight / 2;
    const endY = headerHeight + successorIndex * taskHeight + taskHeight / 2;
    
    // Simplified positioning for now
    const startX = taskNameWidth + (predecessorIndex * 20) + 100; // End of predecessor bar
    const endX = taskNameWidth + (successorIndex * 20); // Start of successor bar
    
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
    ctx.fillStyle = '#94a3b8';
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
  const [useEnhancedView, setUseEnhancedView] = useState(false);

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

      const response = await fetch(API_ENDPOINTS.projects.list, {
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

      const response = await fetch(API_ENDPOINTS.timeline.gantt(selectedProjectId), {
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

      const response = await fetch(API_ENDPOINTS.timeline.taskUpdate(task.id), {
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

          {/* Project Selector and View Controls */}
          <div className="flex items-center space-x-4">
            {/* Project Selector */}
            {projects.length > 0 && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Project:</label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px]"
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
                onClick={() => setUseEnhancedView(!useEnhancedView)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  useEnhancedView 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Toggle Enhanced View"
              >
                <Zap className="h-4 w-4 mr-1 inline" />
                Enhanced
              </button>
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
        ) : useEnhancedView && selectedProjectId ? (
          <EnhancedTimelineView 
            projectId={selectedProjectId}
            onTaskUpdate={handleTaskUpdate}
          />
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