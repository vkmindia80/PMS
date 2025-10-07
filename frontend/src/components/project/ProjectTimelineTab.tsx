import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, Users, Settings, ZoomIn, ZoomOut, RotateCcw, 
  Zap, Target, Activity, AlertTriangle, Wifi, WifiOff, Bell, BellOff,
  Download, Upload, Share2, Filter, Search, Plus, BarChart3,
  Maximize2, Minimize2, RefreshCw, Settings2, GitBranch, Eye,
  Play, Pause, Square, CheckCircle2, XCircle, AlertCircle2,
  TrendingUp, TrendingDown, Layers, Edit2, Trash2, Link2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../utils/config';
import toast from 'react-hot-toast';

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
    if (!project?.id || !tokens?.access_token) {
      console.warn('Missing project ID or access token');
      setError('Authentication required. Please log in to view timeline data.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching timeline data for project: ${project.id}`);
      
      // Fetch tasks for this project
      const response = await fetch(`${API_ENDPOINTS.tasks.list}?project_id=${project.id}`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }

      const tasks: TimelineTask[] = await response.json();
      console.log(`Fetched ${tasks.length} tasks for timeline`);
      
      setTimelineTasks(tasks);
      
      // Calculate stats
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date() && t.status !== 'completed';
      }).length;
      
      setStats({
        total_tasks: tasks.length,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        overdue_tasks: overdueTasks
      });
      
    } catch (err) {
      console.error('Error fetching timeline data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load timeline data';
      setError(errorMessage);
      toast.error(`Timeline Error: ${errorMessage}`);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="timeline-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project timeline...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching tasks and dependencies</p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
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

  return (
    <div className="space-y-6" data-testid="project-timeline-tab">
      {/* Timeline Header with Project-Specific Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* Left side - Title and connection status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Project Timeline
                </h2>
                <p className="text-sm text-gray-600">
                  Interactive Gantt chart with real-time collaboration
                </p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                isWebSocketConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {isWebSocketConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Offline</span>
                  </>
                )}
              </div>

              {/* Active Users */}
              {activeUsers.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    {activeUsers.length} active
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimelineView('gantt')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  timelineView === 'gantt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Gantt
              </button>
              <button
                onClick={() => setTimelineView('timeline')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  timelineView === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Timeline
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  notificationsEnabled 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-500'
                }`}
                title="Toggle Notifications"
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowStats(!showStats)}
                className={`p-2 rounded-lg transition-colors ${
                  showStats ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}
                title="Toggle Statistics"
              >
                <BarChart3 className="h-4 w-4" />
              </button>

              <button
                onClick={fetchTimelineData}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                title="Refresh Data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                onClick={handleAutoSchedule}
                disabled={isAutoScheduling}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Target className="h-4 w-4" />
                <span>{isAutoScheduling ? 'Scheduling...' : 'Auto Schedule'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Project-Specific Statistics Dashboard */}
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">
                {taskProgress.percentage}%
              </div>
              <div className="text-sm text-blue-600">Progress</div>
              <div className="text-xs text-blue-500 mt-1">
                {taskProgress.completed}/{taskProgress.total} tasks
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="text-2xl font-bold text-green-700">
                {realtimeStats?.in_progress_tasks || 0}
              </div>
              <div className="text-sm text-green-600">In Progress</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">
                {realtimeStats?.overdue_tasks || 0}
              </div>
              <div className="text-sm text-yellow-600">Overdue</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <div className={`text-2xl font-bold ${
                (realtimeStats?.timeline_health_score || 0) >= 80 ? 'text-green-600' :
                (realtimeStats?.timeline_health_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {realtimeStats?.timeline_health_score || 0}%
              </div>
              <div className="text-sm text-purple-600">Health Score</div>
            </div>
          </div>
        )}

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected in timeline
              </span>
              <button className="text-xs text-red-600 underline hover:text-red-800">
                View Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Timeline Component */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {timelineTasks.length === 0 && !loading && !error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data Available</h3>
            <p className="text-gray-600 mb-6">
              This project doesn't have any tasks with timeline data yet.
            </p>
            <div className="space-y-4">
              <button
                onClick={fetchTimelineData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Timeline</span>
              </button>
              <p className="text-sm text-gray-500">
                Tasks with due dates and time estimates will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          <ProjectDynamicTimeline
            projectId={project.id}
            projectName={project.name}
            tasks={timelineTasks}
            dependencies={dependencies}
            conflicts={conflicts}
            onTaskUpdate={handleTimelineTaskUpdate}
            onTaskCreate={handleTimelineTaskCreate}
            onDependencyCreate={handleDependencyCreate}
            viewConfig={viewConfig}
            onViewConfigChange={handleViewConfigChange}
            filter={filter}
            onFilterChange={handleFilterChange}
            isRealTimeConnected={isWebSocketConnected}
            users={users}
            showAdvancedFilters={showAdvancedFilters}
            onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
          />
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          {realtimeStats?.estimated_completion && (
            <span>Est. completion: {realtimeStats.estimated_completion}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>Keyboard shortcuts: Drag to reschedule, Double-click to edit</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectTimelineTab;