import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Calendar, Clock, Users, Target, TrendingUp, AlertCircle, 
  ZoomIn, ZoomOut, Search, Filter, Download, Maximize2, Minimize2,
  Plus, Edit, Trash2, Link2, Grid, List, MoreVertical, X,
  ChevronLeft, ChevronRight, Save, Settings, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../utils/config';
import { exportTimelineToPNG } from '../../utils/timelineExport';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  status: string;
  priority: string;
  assignee?: string;
  assignee_id?: string;
  critical?: boolean;
}

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  color: string;
  critical: boolean;
}

interface AdvancedGanttChartTabProps {
  projectId: string;
  projectName: string;
}

const AdvancedGanttChartTab: React.FC<AdvancedGanttChartTabProps> = ({ projectId, projectName }) => {
  const { tokens } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [tasks, setTasks] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0,
    completion_percentage: 0,
    health_score: 0
  });
  
  // View configuration
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Interaction state
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuTask, setContextMenuTask] = useState<any | null>(null);
  
  // Drag state
  const [dragState, setDragState] = useState<{
    taskId: string | null;
    mode: 'move' | 'resize-left' | 'resize-right' | null;
    startX: number;
    startDate: Date | null;
    originalStart: Date | null;
    originalEnd: Date | null;
  }>({
    taskId: null,
    mode: null,
    startX: 0,
    startDate: null,
    originalStart: null,
    originalEnd: null
  });
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(true);

  // Fetch timeline data
  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_ENDPOINTS.base}/api/timeline/gantt/${projectId}?show_completed=${filterCompleted}`,
        {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch timeline data');
      }

      const data = await response.json();
      
      // Transform tasks to our format
      const transformedTasks = (data.tasks || []).map((task: any) => ({
        id: task.id || task.task_id,
        name: task.title || task.name,
        start: new Date(task.start_date),
        end: new Date(task.end_date || task.finish_date),
        progress: task.progress || task.percent_complete || 0,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee?.name,
        assignee_id: task.assignee_id || task.assignee?.id,
        critical: task.is_critical_path || task.critical || false,
        description: task.description,
        duration: task.duration || 8
      }));

      setTasks(transformedTasks);
      setDependencies(data.dependencies || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens, filterCompleted]);

  useEffect(() => {
    if (projectId && tokens?.access_token) {
      fetchTimelineData();
    }
  }, [projectId, tokens, fetchTimelineData]);

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (!tasks.length) {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 3, 0)
      };
    }

    const dates = tasks.flatMap(task => [task.start, task.end]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);
    
    return { start: minDate, end: maxDate };
  }, [tasks]);

  // Generate time columns
  const timeColumns = useMemo(() => {
    const columns = [];
    const { start, end } = timelineBounds;
    const current = new Date(start);
    
    const increment = viewMode === 'day' ? 1 : 
                     viewMode === 'week' ? 7 : 
                     viewMode === 'month' ? 30 : 90;
    
    while (current <= end) {
      columns.push(new Date(current));
      current.setDate(current.getDate() + increment);
    }
    
    return columns;
  }, [timelineBounds, viewMode]);

  // Get task color
  const getTaskColor = useCallback((task: any) => {
    if (task.progress >= 100 || task.status === 'completed') return '#10b981'; // Green
    if (task.critical) return '#ef4444'; // Red
    if (task.status === 'blocked') return '#f59e0b'; // Orange
    if (task.progress > 0 || task.status === 'in_progress') return '#3b82f6'; // Blue
    return '#6b7280'; // Gray
  }, []);

  // Calculate task position
  const getTaskPosition = useCallback((task: any) => {
    const { start, end } = timelineBounds;
    const totalDuration = end.getTime() - start.getTime();
    const taskStart = task.start.getTime() - start.getTime();
    const taskDuration = task.end.getTime() - task.start.getTime();
    
    const left = (taskStart / totalDuration) * 100;
    const width = (taskDuration / totalDuration) * 100;
    
    return { 
      left: Math.max(0, left), 
      width: Math.max(0.5, width) 
    };
  }, [timelineBounds]);

  // Handle task update
  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      const response = await fetch(API_ENDPOINTS.tasks.details(taskId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      toast.success('Task updated successfully');
      await fetchTimelineData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Handle double-click for inline editing
  const handleTaskDoubleClick = useCallback((task: any) => {
    setEditingTask(task);
    setShowEditModal(true);
  }, []);

  // Handle right-click for context menu
  const handleTaskContextMenu = useCallback((e: React.MouseEvent, task: any) => {
    e.preventDefault();
    setContextMenuTask(task);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent, task: any, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    setDragState({
      taskId: task.id,
      mode,
      startX: e.clientX,
      startDate: task.start,
      originalStart: new Date(task.start),
      originalEnd: new Date(task.end)
    });
    setSelectedTask(task.id);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState.taskId || !dragState.mode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaRatio = deltaX / rect.width;
    const totalDuration = timelineBounds.end.getTime() - timelineBounds.start.getTime();
    const deltaDuration = deltaRatio * totalDuration;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) return;

    let newStart = new Date(dragState.originalStart!);
    let newEnd = new Date(dragState.originalEnd!);

    if (dragState.mode === 'move') {
      newStart = new Date(dragState.originalStart!.getTime() + deltaDuration);
      newEnd = new Date(dragState.originalEnd!.getTime() + deltaDuration);
    } else if (dragState.mode === 'resize-left') {
      newStart = new Date(dragState.originalStart!.getTime() + deltaDuration);
    } else if (dragState.mode === 'resize-right') {
      newEnd = new Date(dragState.originalEnd!.getTime() + deltaDuration);
    }

    // Update task temporarily for visual feedback
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === dragState.taskId 
          ? { ...t, start: newStart, end: newEnd }
          : t
      )
    );
  }, [dragState, timelineBounds, tasks]);

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    if (!dragState.taskId) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) return;

    // Update task on server
    await handleTaskUpdate(task.id, {
      start_date: task.start.toISOString(),
      due_date: task.end.toISOString()
    });

    setDragState({
      taskId: null,
      mode: null,
      startX: 0,
      startDate: null,
      originalStart: null,
      originalEnd: null
    });
  }, [dragState, tasks, handleTaskUpdate]);

  // Set up drag event listeners
  useEffect(() => {
    if (dragState.mode) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragState.mode, handleDragMove, handleDragEnd]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    if (showContextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);

  // Export to PNG
  const handleExport = useCallback(async () => {
    try {
      const elementId = 'gantt-chart-container';
      const filename = `${projectName}-timeline-${new Date().toISOString().split('T')[0]}.png`;
      
      toast.loading('Exporting timeline as PNG...', { id: 'export' });
      
      await exportTimelineToPNG(elementId, {
        format: 'png',
        filename,
        quality: 2, // High quality
        includeBackground: true
      });
      
      toast.success('Timeline exported successfully! Check your downloads.', { 
        id: 'export', 
        duration: 4000 
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Export failed. Please try again.',
        { id: 'export' }
      );
    }
  }, [projectName]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!filterCompleted && task.progress >= 100) return false;
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterCompleted, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_tasks}</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed_tasks}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.in_progress_tasks}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue_tasks}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-purple-600">{stats.completion_percentage}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Health Score</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.health_score}</p>
            </div>
            <Calendar className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex items-center space-x-2">
            {/* View Mode */}
            <div className="flex items-center bg-gray-100 rounded-lg">
              {['day', 'week', 'month', 'quarter'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-2 text-sm font-medium capitalize ${
                    viewMode === mode
                      ? 'bg-primary-600 text-white rounded-lg'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  data-testid={`view-mode-${mode}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 border border-gray-300 rounded-lg">
              <button
                onClick={() => setZoomLevel(Math.max(0.4, zoomLevel - 0.2))}
                className="p-2 hover:bg-gray-50 text-gray-600"
                title="Zoom Out"
                data-testid="zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm text-gray-600 border-x border-gray-300 min-w-[60px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.2))}
                className="p-2 hover:bg-gray-50 text-gray-600"
                title="Zoom In"
                data-testid="zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border ${
                showFilters ? 'bg-primary-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Filters"
              data-testid="filter-button"
            >
              <Filter className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className={`p-2 rounded-lg border ${
                showDependencies ? 'bg-primary-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Toggle Dependencies"
              data-testid="dependencies-button"
            >
              <Link2 className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowCriticalPath(!showCriticalPath)}
              className={`p-2 rounded-lg border ${
                showCriticalPath ? 'bg-red-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Toggle Critical Path"
              data-testid="critical-path-button"
            >
              <AlertCircle className="h-4 w-4" />
            </button>

            <button
              onClick={handleExport}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              title="Export to PNG"
              data-testid="export-button"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              data-testid="fullscreen-button"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterCompleted}
                  onChange={(e) => setFilterCompleted(e.target.checked)}
                  className="mr-2 h-4 w-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700">Show completed tasks</span>
              </label>
              <span className="text-sm text-gray-600">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gantt Chart */}
      <div 
        id="gantt-chart-container"
        ref={containerRef}
        className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden"
        data-testid="gantt-chart-container"
      >
        <div className="flex h-full">
          {/* Task Names Column */}
          <div className="w-80 border-r border-gray-200 bg-gray-50">
            {/* Header */}
            <div className="h-12 flex items-center px-4 border-b border-gray-200 font-semibold text-gray-900 bg-white">
              Task Name
            </div>
            {/* Task List */}
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 3rem)' }}>
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`h-12 flex items-center px-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 ${
                    selectedTask === task.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => setSelectedTask(task.id)}
                  onDoubleClick={() => handleTaskDoubleClick(task)}
                  onContextMenu={(e) => handleTaskContextMenu(e, task)}
                  data-testid={`task-row-${task.id}`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getTaskColor(task) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {task.name}
                      </div>
                      {task.assignee && (
                        <div className="text-xs text-gray-500 truncate">
                          {task.assignee}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0">
                      {Math.round(task.progress)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Area */}
          <div className="flex-1 overflow-auto">
            <div style={{ minWidth: `${timeColumns.length * 100 * zoomLevel}px` }}>
              {/* Timeline Header */}
              <div className="h-12 flex border-b border-gray-200 bg-gray-50">
                {timeColumns.map((date, index) => (
                  <div
                    key={index}
                    className="flex-1 px-2 py-2 border-r border-gray-200 text-xs text-gray-600 text-center"
                    style={{ minWidth: `${100 * zoomLevel}px` }}
                  >
                    <div className="font-medium">
                      {date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: viewMode === 'quarter' ? 'numeric' : undefined
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Body */}
              <div className="relative" style={{ height: `${filteredTasks.length * 48}px` }}>
                {/* Grid Lines */}
                {showGrid && (
                  <div className="absolute inset-0 flex">
                    {timeColumns.map((_, index) => (
                      <div
                        key={index}
                        className="flex-1 border-r border-gray-100"
                        style={{ minWidth: `${100 * zoomLevel}px` }}
                      />
                    ))}
                  </div>
                )}

                {/* Task Bars */}
                {filteredTasks.map((task, index) => {
                  const position = getTaskPosition(task);
                  const color = getTaskColor(task);
                  const isSelected = selectedTask === task.id;
                  const isHovered = hoveredTask === task.id;
                  const isCritical = showCriticalPath && task.critical;

                  return (
                    <div
                      key={task.id}
                      data-task-id={task.id}
                      className={`absolute h-8 rounded-md cursor-move transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-10' : ''
                      } ${isHovered ? 'shadow-lg z-10' : ''} ${
                        isCritical ? 'ring-2 ring-red-500' : ''
                      }`}
                      style={{
                        left: `${position.left}%`,
                        width: `${position.width}%`,
                        top: `${index * 48 + 10}px`,
                        backgroundColor: color,
                      }}
                      onMouseDown={(e) => handleDragStart(e, task, 'move')}
                      onMouseEnter={() => setHoveredTask(task.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                      onDoubleClick={() => handleTaskDoubleClick(task)}
                      onContextMenu={(e) => handleTaskContextMenu(e, task)}
                      title={`${task.name}\n${task.start.toLocaleDateString()} - ${task.end.toLocaleDateString()}\nProgress: ${Math.round(task.progress)}%`}
                      data-testid={`task-bar-${task.id}`}
                    >
                      {/* Progress Fill */}
                      <div
                        className="h-full bg-black bg-opacity-20 rounded-l-md"
                        style={{ width: `${task.progress}%` }}
                      />
                      
                      {/* Task Label */}
                      <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                        <span className="text-xs font-medium text-white truncate">
                          {task.name}
                        </span>
                      </div>

                      {/* Resize Handles */}
                      {isSelected && (
                        <>
                          <div
                            className="absolute left-0 top-0 w-2 h-full bg-blue-600 opacity-75 hover:opacity-100 cursor-ew-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, task, 'resize-left');
                            }}
                            data-testid="resize-handle-left"
                          />
                          <div
                            className="absolute right-0 top-0 w-2 h-full bg-blue-600 opacity-75 hover:opacity-100 cursor-ew-resize"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, task, 'resize-right');
                            }}
                            data-testid="resize-handle-right"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="edit-modal">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Task</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTask(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              await handleTaskUpdate(editingTask.id, {
                title: formData.get('name'),
                description: formData.get('description'),
                progress_percentage: parseInt(formData.get('progress') as string)
              });

              setShowEditModal(false);
              setEditingTask(null);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingTask.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingTask.description || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progress: <span id="progress-value">{Math.round(editingTask.progress)}%</span>
                  </label>
                  <input
                    type="range"
                    name="progress"
                    min="0"
                    max="100"
                    defaultValue={editingTask.progress}
                    className="w-full"
                    onChange={(e) => {
                      const value = e.target.value;
                      const display = document.getElementById('progress-value');
                      if (display) display.textContent = `${value}%`;
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && contextMenuTask && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          style={{ 
            left: contextMenuPos.x, 
            top: contextMenuPos.y,
            minWidth: '160px'
          }}
          data-testid="context-menu"
        >
          <button
            onClick={() => {
              handleTaskDoubleClick(contextMenuTask);
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Task</span>
          </button>
          <button
            onClick={() => {
              // Handle delete
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Task</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedGanttChartTab;
