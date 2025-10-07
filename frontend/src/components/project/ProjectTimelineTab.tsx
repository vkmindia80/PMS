import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, Users, Settings, ZoomIn, ZoomOut, RotateCcw, 
  Zap, Target, Activity, AlertTriangle, Wifi, WifiOff, Bell, BellOff,
  Download, Upload, Share2, Filter, Search, Plus, BarChart3,
  Maximize2, Minimize2, RefreshCw, Settings2, GitBranch, Eye,
  Play, Pause, Square, CheckCircle2, XCircle, AlertCircle2,
  TrendingUp, TrendingDown, Layers, Edit2, Trash2, Link2, ListFilter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../utils/config';
import toast from 'react-hot-toast';
import GanttChart from './GanttChart';

interface ProjectTimelineTabProps {
  project: any;
  users: any[];
  tasks: any[];
  onTaskUpdate: () => void;
  onTaskCreate: () => void;
  onTaskDelete: () => void;
}

interface TimelineTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_id: string;
  assignee_id?: string;
  assignee_ids: string[];
  due_date?: string;
  start_date?: string;
  progress_percentage: number;
  time_tracking?: {
    estimated_hours?: number;
    actual_hours?: number;
  };
  created_at: string;
  updated_at: string;
}

interface TimelineStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
}

const ProjectTimelineTab: React.FC<ProjectTimelineTabProps> = ({
  project,
  users,
  tasks: projectTasks,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete
}) => {
  const { tokens } = useAuth();
  
  // Core timeline data
  const [timelineTasks, setTimelineTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingTask, setEditingTask] = useState<TimelineTask | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Timeline stats
  const [stats, setStats] = useState<TimelineStats>({
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0
  });

  // Fetch timeline data from tasks API
  const fetchTimelineData = useCallback(async () => {
    console.log('=== TIMELINE DEBUG: fetchTimelineData called ===');
    console.log('Project:', project);
    console.log('Tokens:', tokens?.access_token ? 'Present' : 'Missing');
    
    if (!project?.id || !tokens?.access_token) {
      console.warn('Missing project ID or access token');
      setError('Authentication required. Please log in to view timeline data.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching timeline data for project: ${project.id}`);
      const url = `${API_ENDPOINTS.tasks.list}?project_id=${project.id}`;
      console.log('API URL:', url);
      
      // Fetch tasks for this project
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }

      const tasks: TimelineTask[] = await response.json();
      console.log(`Fetched ${tasks.length} tasks for timeline:`, tasks.slice(0, 2));
      
      setTimelineTasks(tasks);
      
      // Calculate stats
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date() && t.status !== 'completed';
      }).length;
      
      const newStats = {
        total_tasks: tasks.length,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        overdue_tasks: overdueTasks
      };
      
      console.log('Calculated stats:', newStats);
      setStats(newStats);
      
    } catch (err) {
      console.error('Error fetching timeline data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load timeline data';
      setError(errorMessage);
      toast.error(`Timeline Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log('=== TIMELINE DEBUG: fetchTimelineData completed ===');
    }
  }, [project?.id, tokens?.access_token]);

  // Load data when project changes
  useEffect(() => {
    if (project?.id) {
      fetchTimelineData();
    }
  }, [fetchTimelineData, project?.id]);

  // Task management functions
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<TimelineTask>) => {
    try {
      const response = await fetch(API_ENDPOINTS.tasks.details(taskId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh timeline data
      await fetchTimelineData();
      onTaskUpdate();
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  }, [tokens?.access_token, fetchTimelineData, onTaskUpdate]);

  const handleTaskCreate = useCallback(async (taskData: Partial<TimelineTask>) => {
    try {
      const response = await fetch(API_ENDPOINTS.tasks.create, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...taskData,
          project_id: project.id,
          organization_id: project.organization_id || 'demo-org-001'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      // Refresh timeline data
      await fetchTimelineData();
      onTaskCreate();
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }, [tokens?.access_token, project.id, project.organization_id, fetchTimelineData, onTaskCreate]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.tasks.details(taskId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Refresh timeline data
      await fetchTimelineData();
      onTaskDelete();
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  }, [tokens?.access_token, fetchTimelineData, onTaskDelete]);

  // Utility functions
  const getUserName = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      return user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.name || user.email || 'Unknown User';
    }
    return 'Unassigned';
  }, [users]);

  const getStatusColor = useCallback((status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      in_review: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Filter tasks based on view settings
  const filteredTasks = useMemo(() => {
    let filtered = [...timelineTasks];
    
    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.start_date || a.created_at);
      const dateB = new Date(b.start_date || b.created_at);
      return dateA.getTime() - dateB.getTime();
    });
  }, [timelineTasks, showCompleted]);

  // Task form handling
  const handleNewTask = useCallback(() => {
    setShowTaskForm(true);
  }, []);

  const handleTaskEdit = useCallback((task: TimelineTask) => {
    setEditingTask(task);
  }, []);

  const handleTaskFormSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const taskData = {
      title: formData.get('title') as string,
      priority: formData.get('priority') as string,
      status: formData.get('status') as string,
      due_date: formData.get('due_date') as string || null,
      start_date: formData.get('start_date') as string || null,
      progress_percentage: parseInt(formData.get('progress') as string) || 0,
      time_tracking: {
        estimated_hours: parseInt(formData.get('estimated_hours') as string) || 0
      }
    };

    if (editingTask) {
      await handleTaskUpdate(editingTask.id, taskData);
      setEditingTask(null);
    } else {
      await handleTaskCreate(taskData);
      setShowTaskForm(false);
    }
  }, [editingTask, handleTaskUpdate, handleTaskCreate]);

  // Debug logging for render
  console.log('=== TIMELINE RENDER DEBUG ===');
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Timeline tasks length:', timelineTasks.length);
  console.log('Filtered tasks length:', filteredTasks.length);
  console.log('Stats:', stats);
  console.log('Project ID:', project?.id);

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="flex items-center justify-center py-12" data-testid="timeline-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project timeline...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching tasks and timeline data</p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className="flex items-center justify-center py-12" data-testid="timeline-error">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Timeline Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchTimelineData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => setError(null)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering main timeline content');
  return (
    <div className="space-y-6" data-testid="project-timeline-tab">
      {/* Timeline Header with Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* Left side - Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Project Timeline
                </h2>
                <p className="text-sm text-gray-600">
                  Interactive timeline view for project tasks
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Month
              </button>
            </div>

            {/* Show Completed Toggle */}
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show completed</span>
            </label>

            {/* Actions */}
            <button
              onClick={fetchTimelineData}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleNewTask}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {stats.total_tasks}
            </div>
            <div className="text-sm text-blue-600">Total Tasks</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {stats.completed_tasks}
            </div>
            <div className="text-sm text-green-600">Completed</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">
              {stats.in_progress_tasks}
            </div>
            <div className="text-sm text-yellow-600">In Progress</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="text-2xl font-bold text-red-700">
              {stats.overdue_tasks}
            </div>
            <div className="text-sm text-red-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Available</h3>
            <p className="text-gray-600 mb-6">
              {timelineTasks.length === 0 
                ? 'This project doesn\'t have any tasks yet.' 
                : 'No tasks match the current filter settings.'
              }
            </p>
            <button
              onClick={handleNewTask}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Task</span>
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTask === task.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          <Users className="inline w-4 h-4 mr-1" />
                          {getUserName(task.assignee_id || '')}
                        </span>
                        <span>
                          <Calendar className="inline w-4 h-4 mr-1" />
                          {formatDate(task.start_date)} - {formatDate(task.due_date)}
                        </span>
                        <span>
                          <Clock className="inline w-4 h-4 mr-1" />
                          {task.time_tracking?.estimated_hours || 0}h
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{task.progress_percentage}%</span>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskEdit(task);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskDelete(task.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      {(showTaskForm || editingTask) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <form onSubmit={handleTaskFormSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingTask?.title || ''}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      name="priority"
                      defaultValue={editingTask?.priority || 'medium'}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      name="status"
                      defaultValue={editingTask?.status || 'todo'}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={editingTask?.start_date ? new Date(editingTask.start_date).toISOString().split('T')[0] : ''}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      defaultValue={editingTask?.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Progress (%)</label>
                    <input
                      type="number"
                      name="progress"
                      min="0"
                      max="100"
                      defaultValue={editingTask?.progress_percentage || 0}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Est. Hours</label>
                    <input
                      type="number"
                      name="estimated_hours"
                      min="0"
                      defaultValue={editingTask?.time_tracking?.estimated_hours || 0}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskForm(false);
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
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTimelineTab;