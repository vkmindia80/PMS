import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  Calendar, Clock, Users, Settings, ZoomIn, ZoomOut, RotateCcw, 
  Zap, Target, Activity, AlertTriangle, Filter, Search, Plus, 
  Edit, Trash2, Link, CheckCircle, XCircle, Circle, Square,
  ChevronLeft, ChevronRight, Maximize2, Grid, List, Layers,
  Play, Pause, ArrowRight, MoreHorizontal, Eye, EyeOff
} from 'lucide-react';
import { 
  DynamicTimelineTask, 
  TaskConflict, 
  TimelineFilter, 
  TimelineViewConfig 
} from '../../services/dynamicTimelineService';

interface ProjectDynamicTimelineProps {
  projectId: string;
  projectName: string;
  tasks: DynamicTimelineTask[];
  dependencies: any[];
  conflicts: TaskConflict[];
  onTaskUpdate: (taskId: string, updates: Partial<DynamicTimelineTask>) => void;
  onTaskCreate: (task: Partial<DynamicTimelineTask>) => void;
  onDependencyCreate: (dependency: any) => void;
  viewConfig: TimelineViewConfig;
  onViewConfigChange: (config: Partial<TimelineViewConfig>) => void;
  filter: TimelineFilter;
  onFilterChange: (filter: Partial<TimelineFilter>) => void;
  isRealTimeConnected: boolean;
  users: any[];
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
}

interface GanttChartProps {
  tasks: DynamicTimelineTask[];
  dependencies: any[];
  conflicts: TaskConflict[];
  onTaskUpdate: (taskId: string, updates: Partial<DynamicTimelineTask>) => void;
  onTaskCreate: (task: Partial<DynamicTimelineTask>) => void;
  onDependencyCreate: (dependency: any) => void;
  viewConfig: TimelineViewConfig;
  users: any[];
}

// Add Task Button Component
const AddTaskButton: React.FC<{ onAddTask: (task: Partial<DynamicTimelineTask>) => void }> = ({ onAddTask }) => {
  const [showForm, setShowForm] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        <span>Add Task</span>
      </button>
      
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const startDate = new Date(formData.get('start_date') as string);
              const duration = parseInt(formData.get('duration') as string || '8');
              const endDate = new Date(startDate.getTime() + (duration * 60 * 60 * 1000));
              
              onAddTask({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                start_date: startDate.toISOString(),
                finish_date: endDate.toISOString(),
                duration,
                percent_complete: 0,
                assignee_ids: [],
                critical: formData.get('critical') === 'on'
              });
              setShowForm(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                    <input
                      type="number"
                      name="duration"
                      min="1"
                      defaultValue="8"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" name="critical" className="mr-2" />
                    <span className="text-sm font-medium text-gray-700">Critical Task</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Enhanced Gantt Chart Component
const EnhancedGanttChart: React.FC<GanttChartProps> = ({
  tasks,
  dependencies,
  conflicts,
  onTaskUpdate,
  onTaskCreate,
  onDependencyCreate,
  viewConfig,
  users
}) => {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    startX: number;
    startDate: Date;
    type: 'move' | 'resize-left' | 'resize-right';
  } | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<DynamicTimelineTask | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (!tasks.length) {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 3, 0)
      };
    }

    const dates = tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.finish_date)
    ]);
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    
    return { start: minDate, end: maxDate };
  }, [tasks]);

  // Generate time columns based on view mode
  const timeColumns = useMemo(() => {
    const columns = [];
    const { start, end } = timelineBounds;
    const current = new Date(start);
    
    const increment = viewConfig.mode === 'day' ? 1 : 
                     viewConfig.mode === 'week' ? 7 : 30;
    
    while (current <= end) {
      columns.push(new Date(current));
      current.setDate(current.getDate() + increment);
    }
    
    return columns;
  }, [timelineBounds, viewConfig.mode]);

  // Calculate task position and width
  const getTaskPosition = useCallback((task: DynamicTimelineTask) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.finish_date);
    const { start, end } = timelineBounds;
    
    const totalDuration = end.getTime() - start.getTime();
    const taskStart = startDate.getTime() - start.getTime();
    const taskDuration = endDate.getTime() - startDate.getTime();
    
    const left = (taskStart / totalDuration) * 100;
    const width = (taskDuration / totalDuration) * 100;
    
    return { left: Math.max(0, left), width: Math.max(1, width) };
  }, [timelineBounds]);

  // Get task status color
  const getTaskStatusColor = useCallback((task: DynamicTimelineTask) => {
    if (task.percent_complete >= 100) return 'bg-green-500';
    if (task.critical) return 'bg-red-500';
    if (task.percent_complete > 0) return 'bg-blue-500';
    return 'bg-gray-400';
  }, []);

  // Get user name by ID
  const getUserName = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unassigned';
  }, [users]);

  // Handle drag operations
  const handleMouseDown = useCallback((e: React.MouseEvent, task: DynamicTimelineTask, type: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    setDragState({
      taskId: task.id,
      startX: e.clientX,
      startDate: new Date(task.start_date),
      type
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !ganttRef.current) return;

    const rect = ganttRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaRatio = deltaX / rect.width;
    const totalDuration = timelineBounds.end.getTime() - timelineBounds.start.getTime();
    const deltaDuration = deltaRatio * totalDuration;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) return;

    const originalStart = new Date(task.start_date);
    const originalEnd = new Date(task.finish_date);
    const taskDuration = originalEnd.getTime() - originalStart.getTime();

    let newStart = new Date(originalStart);
    let newEnd = new Date(originalEnd);

    switch (dragState.type) {
      case 'move':
        newStart = new Date(originalStart.getTime() + deltaDuration);
        newEnd = new Date(newStart.getTime() + taskDuration);
        break;
      case 'resize-left':
        newStart = new Date(originalStart.getTime() + deltaDuration);
        newEnd = originalEnd;
        break;
      case 'resize-right':
        newStart = originalStart;
        newEnd = new Date(originalEnd.getTime() + deltaDuration);
        break;
    }

    // Update task optimistically
    const updatedTask = {
      ...task,
      start_date: newStart.toISOString(),
      finish_date: newEnd.toISOString(),
      duration: Math.max(1, (newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60)) // hours
    };

    // Visual feedback during drag
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLElement;
    if (taskElement) {
      const position = getTaskPosition(updatedTask);
      taskElement.style.left = `${position.left}%`;
      taskElement.style.width = `${position.width}%`;
    }
  }, [dragState, timelineBounds, tasks, getTaskPosition]);

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) return;

    // Get the current visual position and calculate actual dates
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLElement;
    if (taskElement && ganttRef.current) {
      const rect = ganttRef.current.getBoundingClientRect();
      const taskRect = taskElement.getBoundingClientRect();
      
      const leftRatio = (taskRect.left - rect.left) / rect.width;
      const widthRatio = taskRect.width / rect.width;
      
      const totalDuration = timelineBounds.end.getTime() - timelineBounds.start.getTime();
      const startTime = timelineBounds.start.getTime() + (leftRatio * totalDuration);
      const duration = widthRatio * totalDuration;
      
      const newStart = new Date(startTime);
      const newEnd = new Date(startTime + duration);
      
      onTaskUpdate(task.id, {
        start_date: newStart.toISOString(),
        finish_date: newEnd.toISOString(),
        duration: Math.max(1, duration / (1000 * 60 * 60))
      });
    }

    setDragState(null);
  }, [dragState, tasks, timelineBounds, onTaskUpdate]);

  // Set up drag event listeners
  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // Handle task double-click for editing
  const handleTaskDoubleClick = useCallback((task: DynamicTimelineTask) => {
    console.log('Double-clicking task:', task.name);
    setEditingTask(task);
    setShowTaskEditModal(true);
  }, []);

  // Handle task progress update
  const handleProgressUpdate = useCallback((task: DynamicTimelineTask, newProgress: number) => {
    onTaskUpdate(task.id, { percent_complete: Math.max(0, Math.min(100, newProgress)) });
  }, [onTaskUpdate]);

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks in Timeline</h3>
        <p className="text-gray-600 mb-6">Create your first task to get started with the timeline view.</p>
        <button
          onClick={() => setShowTaskForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Gantt Header */}
      <div className="flex border-b border-gray-200">
        {/* Task Names Column */}
        <div className="w-80 bg-gray-50 border-r border-gray-200">
          <div className="h-12 flex items-center px-4 border-b border-gray-200 font-medium text-gray-900">
            Task Name
          </div>
        </div>
        
        {/* Timeline Header */}
        <div className="flex-1 bg-gray-50 overflow-x-auto" ref={ganttRef}>
          <div className="h-12 flex border-b border-gray-200" style={{ minWidth: '800px' }}>
            {timeColumns.map((date, index) => (
              <div
                key={index}
                className="flex-1 min-w-0 px-2 py-2 border-r border-gray-200 text-xs text-gray-600 text-center"
              >
                <div className="font-medium">
                  {date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: viewConfig.mode === 'month' ? 'numeric' : undefined
                  })}
                </div>
                {viewConfig.mode === 'day' && (
                  <div className="text-gray-400">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Body */}
      <div className="flex flex-1 overflow-auto">
        {/* Task Names */}
        <div className="w-80 bg-white border-r border-gray-200">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`h-12 flex items-center px-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedTask === task.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Status Indicator */}
                <div className={`w-3 h-3 rounded-full ${getTaskStatusColor(task)}`} />
                
                {/* Task Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {task.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {task.assignee_ids.length > 0 ? getUserName(task.assignee_ids[0]) : 'Unassigned'}
                  </div>
                </div>
                
                {/* Progress */}
                <div className="text-xs text-gray-500 w-10 text-right">
                  {task.percent_complete}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 relative bg-white overflow-x-auto">
          <div className="absolute inset-0" style={{ minWidth: '800px' }}>
            {/* Grid Lines */}
            <div className="absolute inset-0 flex">
              {timeColumns.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 border-r border-gray-100"
                />
              ))}
            </div>

            {/* Task Bars */}
            {tasks.map((task, index) => {
              const position = getTaskPosition(task);
              const hasConflict = conflicts.some(c => c.affected_tasks.includes(task.id));
              
              return (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  className={`absolute h-8 top-0 rounded-md border-2 transition-all duration-200 cursor-pointer ${
                    selectedTask === task.id ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                  } ${
                    hasConflict ? 'border-red-400 bg-red-100' : 'border-transparent'
                  } ${
                    hoveredTask === task.id ? 'shadow-lg z-10 scale-105' : ''
                  }`}
                  style={{
                    left: `${position.left}%`,
                    width: `${position.width}%`,
                    top: `${index * 49 + 8}px`, // 49px = 48px height + 1px border
                    backgroundColor: task.percent_complete >= 100 ? '#10b981' : 
                                   task.critical ? '#ef4444' : 
                                   task.percent_complete > 0 ? '#3b82f6' : '#6b7280'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Task double-clicked:', task.name);
                    handleTaskDoubleClick(task);
                  }}
                  title={`${task.name} (${task.percent_complete}%)\n${new Date(task.start_date).toLocaleDateString()} - ${new Date(task.finish_date).toLocaleDateString()}`}
                >
                  {/* Progress Fill */}
                  <div
                    className="h-full bg-black bg-opacity-20 rounded-l-md"
                    style={{ width: `${task.percent_complete}%` }}
                  />
                  
                  {/* Task Name */}
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs font-medium text-white truncate">
                      {task.name}
                    </span>
                  </div>

                  {/* Resize Handles */}
                  {selectedTask === task.id && (
                    <>
                      <div
                        className="absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-blue-600 opacity-0 hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize-left')}
                      />
                      <div
                        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-blue-600 opacity-0 hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize-right')}
                      />
                    </>
                  )}

                  {/* Conflict Indicator */}
                  {hasConflict && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white">
                      <AlertTriangle className="w-2 h-2 text-white ml-0.5 mt-0.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Dependencies */}
            {viewConfig.show_dependencies && dependencies.map((dep, index) => {
              const predecessor = tasks.find(t => t.id === dep.predecessor_id);
              const successor = tasks.find(t => t.id === dep.successor_id);
              
              if (!predecessor || !successor) return null;
              
              const predIndex = tasks.findIndex(t => t.id === predecessor.id);
              const succIndex = tasks.findIndex(t => t.id === successor.id);
              
              const predPosition = getTaskPosition(predecessor);
              const succPosition = getTaskPosition(successor);
              
              const startX = predPosition.left + predPosition.width;
              const startY = predIndex * 49 + 24;
              const endX = succPosition.left;
              const endY = succIndex * 49 + 24;
              
              return (
                <svg
                  key={`dep-${index}`}
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 1 }}
                >
                  <defs>
                    <marker
                      id={`arrowhead-${index}`}
                      markerWidth="8"
                      markerHeight="6"
                      refX="8"
                      refY="3"
                      orient="auto"
                      fill="#6b7280"
                    >
                      <polygon points="0 0, 8 3, 0 6" />
                    </marker>
                  </defs>
                  <path
                    d={`M ${startX}% ${startY}px L ${endX}% ${endY}px`}
                    stroke="#6b7280"
                    strokeWidth="2"
                    fill="none"
                    markerEnd={`url(#arrowhead-${index})`}
                  />
                </svg>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const now = new Date();
              const startDate = new Date(formData.get('start_date') as string || now.toISOString().split('T')[0]);
              const duration = parseInt(formData.get('duration') as string || '8');
              const endDate = new Date(startDate.getTime() + (duration * 60 * 60 * 1000));
              
              onTaskCreate({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                start_date: startDate.toISOString(),
                finish_date: endDate.toISOString(),
                duration,
                percent_complete: 0,
                assignee_ids: [],
                critical: formData.get('critical') === 'on'
              });
              setShowTaskForm(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                    <input
                      type="number"
                      name="duration"
                      min="1"
                      defaultValue="8"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" name="critical" className="mr-2" />
                    <span className="text-sm font-medium text-gray-700">Critical Task</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Edit Modal */}
      {showTaskEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Task</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const startDate = new Date(formData.get('start_date') as string);
              const duration = parseInt(formData.get('duration') as string || '8');
              const endDate = new Date(startDate.getTime() + (duration * 60 * 60 * 1000));
              
              onTaskUpdate(editingTask.id, {
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                start_date: startDate.toISOString(),
                finish_date: endDate.toISOString(),
                duration,
                percent_complete: parseInt(formData.get('progress') as string || '0'),
                critical: formData.get('critical') === 'on'
              });
              setShowTaskEditModal(false);
              setEditingTask(null);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingTask.name}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingTask.description || ''}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={new Date(editingTask.start_date).toISOString().split('T')[0]}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                    <input
                      type="number"
                      name="duration"
                      min="1"
                      defaultValue={editingTask.duration}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Progress (%)</label>
                  <input
                    type="range"
                    name="progress"
                    min="0"
                    max="100"
                    defaultValue={editingTask.percent_complete}
                    className="mt-1 w-full"
                    onChange={(e) => {
                      const progressText = document.getElementById('progress-text');
                      if (progressText) progressText.textContent = `${e.target.value}%`;
                    }}
                  />
                  <div className="text-center text-sm text-gray-600 mt-1">
                    <span id="progress-text">{editingTask.percent_complete}%</span>
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="critical" 
                      defaultChecked={editingTask.critical} 
                      className="mr-2" 
                    />
                    <span className="text-sm font-medium text-gray-700">Critical Task</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskEditModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectDynamicTimeline: React.FC<ProjectDynamicTimelineProps> = ({
  projectId,
  projectName,
  tasks,
  dependencies,
  conflicts,
  onTaskUpdate,
  onTaskCreate,
  onDependencyCreate,
  viewConfig,
  onViewConfigChange,
  filter,
  onFilterChange,
  isRealTimeConnected,
  users,
  showAdvancedFilters,
  onToggleAdvancedFilters
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tasks based on current filters and search
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply completion filter
    if (!filter.show_completed) {
      filtered = filtered.filter(task => task.percent_complete < 100);
    }

    // Apply critical path filter
    if (filter.show_critical_only) {
      filtered = filtered.filter(task => task.critical);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply assignee filter
    if (filter.assignees && filter.assignees.length > 0) {
      filtered = filtered.filter(task => 
        task.assignee_ids.some(id => filter.assignees?.includes(id))
      );
    }

    // Apply status filter
    if (filter.statuses && filter.statuses.length > 0) {
      filtered = filtered.filter(task => {
        const status = task.percent_complete >= 100 ? 'completed' :
                      task.percent_complete > 0 ? 'in_progress' : 'todo';
        return filter.statuses?.includes(status);
      });
    }

    return filtered;
  }, [tasks, filter, searchQuery]);

  // Handle view mode changes
  const handleViewModeChange = useCallback((mode: 'day' | 'week' | 'month') => {
    onViewConfigChange({ mode });
  }, [onViewConfigChange]);

  // Handle zoom changes
  const handleZoomChange = useCallback((zoom: number) => {
    onViewConfigChange({ zoom_level: Math.max(0.1, Math.min(3, zoom)) });
  }, [onViewConfigChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        {/* Left Controls */}
        <div className="flex items-center space-x-4">
          {/* View Mode Selector */}
          <div className="flex items-center bg-white rounded-lg border border-gray-300">
            {['day', 'week', 'month'].map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode as any)}
                className={`px-3 py-2 text-sm font-medium capitalize ${
                  viewConfig.mode === mode
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${
                  mode === 'day' ? 'rounded-l-lg' :
                  mode === 'month' ? 'rounded-r-lg' : ''
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoomChange(viewConfig.zoom_level - 0.2)}
              className="p-2 text-gray-600 hover:bg-white rounded-lg border border-gray-300"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {Math.round(viewConfig.zoom_level * 100)}%
            </span>
            <button
              onClick={() => handleZoomChange(viewConfig.zoom_level + 0.2)}
              className="p-2 text-gray-600 hover:bg-white rounded-lg border border-gray-300"
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
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Filter Toggle */}
          <button
            onClick={onToggleAdvancedFilters}
            className={`p-2 rounded-lg border border-gray-300 ${
              showAdvancedFilters ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-white'
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>

          {/* View Options */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onViewConfigChange({ show_dependencies: !viewConfig.show_dependencies })}
              className={`p-2 rounded-lg border border-gray-300 ${
                viewConfig.show_dependencies ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-white'
              }`}
              title="Toggle Dependencies"
            >
              <Link className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onViewConfigChange({ show_critical_path: !viewConfig.show_critical_path })}
              className={`p-2 rounded-lg border border-gray-300 ${
                viewConfig.show_critical_path ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-white'
              }`}
              title="Toggle Critical Path"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          </div>

          {/* Add Task Button */}
          <AddTaskButton onAddTask={onTaskCreate} />
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Show Completed Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show-completed"
                checked={filter.show_completed}
                onChange={(e) => onFilterChange({ show_completed: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="show-completed" className="ml-2 text-sm text-gray-700">
                Show completed tasks
              </label>
            </div>

            {/* Show Critical Only Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show-critical"
                checked={filter.show_critical_only}
                onChange={(e) => onFilterChange({ show_critical_only: e.target.checked })}
                className="h-4 w-4 text-red-600 rounded border-gray-300"
              />
              <label htmlFor="show-critical" className="ml-2 text-sm text-gray-700">
                Show critical path only
              </label>
            </div>

            {/* Task Count */}
            <div className="text-sm text-gray-600">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Gantt Chart */}
      <div className="flex-1 overflow-hidden">
        <EnhancedGanttChart
          tasks={filteredTasks}
          dependencies={dependencies}
          conflicts={conflicts}
          onTaskUpdate={onTaskUpdate}
          onTaskCreate={onTaskCreate}
          onDependencyCreate={onDependencyCreate}
          viewConfig={viewConfig}
          users={users}
        />
      </div>
    </div>
  );
};

export default ProjectDynamicTimeline;