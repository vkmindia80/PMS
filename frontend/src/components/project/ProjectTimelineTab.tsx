import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, Users, Settings, ZoomIn, ZoomOut, RotateCcw, 
  Zap, Target, Activity, AlertTriangle, Wifi, WifiOff, Bell, BellOff,
  Download, Upload, Share2, Filter, Search, Plus, BarChart3,
  Maximize2, Minimize2, RefreshCw, Settings2, GitBranch, Eye,
  Play, Pause, Square, CheckCircle2, XCircle, AlertCircle2,
  TrendingUp, TrendingDown, Layers
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProjectDynamicTimeline from '../timeline/ProjectDynamicTimeline';
import { 
  DynamicTimelineService, 
  DynamicTimelineTask, 
  TaskConflict, 
  TimelineFilter, 
  TimelineViewConfig,
  WebSocketMessage 
} from '../../services/dynamicTimelineService';
import { taskTimelineService } from '../../services/taskTimelineService';
import toast from 'react-hot-toast';

interface ProjectTimelineTabProps {
  project: any;
  users: any[];
  tasks: any[];
  onTaskUpdate: () => void;
  onTaskCreate: () => void;
  onTaskDelete: () => void;
}

interface TimelineStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  critical_path_length: number;
  resource_utilization: number;
  timeline_health_score: number;
  estimated_completion: string;
  conflicts_count: number;
}

interface ActiveUser {
  id: string;
  name: string;
  avatar?: string;
  current_task?: string;
  last_seen: string;
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
  const [timelineTasks, setTimelineTasks] = useState<DynamicTimelineTask[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<TaskConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time features
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<TimelineStats | null>(null);
  const [notifications, setNotifications] = useState<WebSocketMessage[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // View configuration
  const [viewConfig, setViewConfig] = useState<TimelineViewConfig>({
    mode: 'week',
    zoom_level: 1.0,
    group_by: 'status',
    sort_by: 'start_date',
    sort_order: 'asc',
    show_dependencies: true,
    show_critical_path: true,
    show_resource_conflicts: true
  });

  // Filtering and search
  const [filter, setFilter] = useState<TimelineFilter>({
    show_completed: true,
    show_critical_only: false
  });

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [timelineView, setTimelineView] = useState<'gantt' | 'timeline' | 'calendar'>('gantt');
  
  // Initialize dynamic timeline service
  const dynamicService = useMemo(() => new DynamicTimelineService(), []);

  // Set up WebSocket connection and event listeners
  useEffect(() => {
    if (!project?.id || !tokens?.access_token) return;

    const initializeRealtime = async () => {
      try {
        await dynamicService.initializeWebSocket(project.id, tokens.access_token);
        setIsWebSocketConnected(true);
        
        // Set up event listeners
        dynamicService.on('task_updated', handleTaskUpdated);
        dynamicService.on('task_created', handleTaskCreated);
        dynamicService.on('task_deleted', handleTaskDeleted);
        dynamicService.on('dependency_updated', handleDependencyUpdated);
        dynamicService.on('user_joined', handleUserJoined);
        dynamicService.on('user_left', handleUserLeft);
        dynamicService.on('conflict_detected', handleConflictDetected);

        // Start periodic stats updates
        const statsInterval = setInterval(() => {
          fetchRealtimeStats();
        }, 30000); // Update every 30 seconds

        return () => clearInterval(statsInterval);
        
      } catch (error) {
        console.error('Failed to initialize real-time features:', error);
        setIsWebSocketConnected(false);
      }
    };

    initializeRealtime();
    
    return () => {
      dynamicService.disconnect();
      setIsWebSocketConnected(false);
    };
  }, [project?.id, tokens?.access_token]);

  // WebSocket event handlers
  const handleTaskUpdated = useCallback((message: WebSocketMessage) => {
    const updatedTask = message.data;
    setTimelineTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? { ...task, ...updatedTask } : task
    ));
    
    if (notificationsEnabled && message.user_id !== tokens?.user_id) {
      toast.success(`Task "${updatedTask.name}" updated by ${message.user_id}`);
    }
    onTaskUpdate();
  }, [notificationsEnabled, tokens?.user_id, onTaskUpdate]);

  const handleTaskCreated = useCallback((message: WebSocketMessage) => {
    const newTask = message.data;
    setTimelineTasks(prev => [...prev, newTask]);
    
    if (notificationsEnabled && message.user_id !== tokens?.user_id) {
      toast.success(`New task "${newTask.name}" created`);
    }
    onTaskCreate();
  }, [notificationsEnabled, tokens?.user_id, onTaskCreate]);

  const handleTaskDeleted = useCallback((message: WebSocketMessage) => {
    const deletedTaskId = message.data.task_id;
    setTimelineTasks(prev => prev.filter(task => task.id !== deletedTaskId));
    
    if (notificationsEnabled && message.user_id !== tokens?.user_id) {
      toast.error(`Task deleted`);
    }
    onTaskDelete();
  }, [notificationsEnabled, tokens?.user_id, onTaskDelete]);

  const handleDependencyUpdated = useCallback((message: WebSocketMessage) => {
    const updatedDep = message.data;
    setDependencies(prev => prev.map(dep => 
      dep.id === updatedDep.id ? { ...dep, ...updatedDep } : dep
    ));
  }, []);

  const handleUserJoined = useCallback((message: WebSocketMessage) => {
    const user = message.data;
    setActiveUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
    
    if (notificationsEnabled) {
      toast(`${user.name} joined the timeline`, {
        icon: '👋',
        duration: 3000
      });
    }
  }, [notificationsEnabled]);

  const handleUserLeft = useCallback((message: WebSocketMessage) => {
    const userId = message.data.user_id;
    setActiveUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const handleConflictDetected = useCallback((message: WebSocketMessage) => {
    const conflict = message.data;
    setConflicts(prev => [...prev, conflict]);
    
    if (notificationsEnabled) {
      toast.error(`Conflict detected: ${conflict.message}`, {
        duration: 6000
      });
    }
  }, [notificationsEnabled]);

  // Fetch timeline data from project tasks
  const fetchTimelineData = useCallback(async () => {
    if (!project?.id || !tokens?.access_token) {
      console.warn('Missing project ID or access token for timeline data fetch');
      setError('Authentication required. Please log in to view timeline data.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to fetch from timeline-tasks integration first with better error handling
      try {
        console.log(`Fetching timeline data for project: ${project.id}`);
        const apiUrl = `${getBACKEND_URL()}/api/timeline-tasks/project/${project.id}/timeline?include_completed=${filter.show_completed !== false}`;
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Successfully fetched timeline data from integration:', data);
          setTimelineTasks(data.tasks || []);
          setDependencies(data.dependencies || []);
          setConflicts(data.conflicts || []);
          return;
        } else {
          console.warn(`Timeline integration API returned ${response.status}, falling back to regular tasks`);
        }
      } catch (integrationError) {
        console.log('Timeline integration not available, using regular tasks fallback:', integrationError);
      }

      // Fallback to taskTimelineService with better error handling
      try {
        console.log('Using taskTimelineService fallback for timeline data');
        const data = await taskTimelineService.fetchTasksAsTimeline(
          project.id, 
          tokens.access_token
        );
        
        console.log('Successfully fetched timeline data from fallback service:', data);
        setTimelineTasks(data.tasks || []);
        setDependencies(data.dependencies || []);
        setConflicts([]);
      } catch (fallbackError) {
        console.error('Fallback timeline service also failed:', fallbackError);
        throw fallbackError;
      }
      
    } catch (err) {
      console.error('Error fetching timeline data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load timeline data';
      setError(errorMessage);
      toast.error(`Timeline Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [project?.id, tokens?.access_token, filter, dynamicService]);

  // Fetch real-time statistics
  const fetchRealtimeStats = useCallback(async () => {
    if (!tokens?.access_token || !project?.id) return;
    
    try {
      const stats = await dynamicService.getRealtimeStats(project.id, tokens.access_token);
      setRealtimeStats(stats);
    } catch (error) {
      console.error('Failed to fetch real-time stats:', error);
    }
  }, [project?.id, tokens?.access_token, dynamicService]);

  // Handle task updates with drag support
  const handleTimelineTaskUpdate = useCallback(async (taskId: string, updates: Partial<DynamicTimelineTask>) => {
    try {
      // Try timeline-tasks integration first for better drag support
      try {
        const response = await fetch(`/api/timeline-tasks/task/${taskId}/timeline-sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });

        if (response.ok) {
          const updatedTask = await response.json();
          setTimelineTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, ...updatedTask } : task
          ));
          
          // Broadcast update via WebSocket
          if (notificationsEnabled) {
            toast.success(`Task "${updates.name || 'Task'}" updated successfully!`);
          }
          onTaskUpdate();
          return;
        }
      } catch (integrationError) {
        console.log('Using fallback update method');
      }

      // Fallback to taskTimelineService
      await taskTimelineService.updateTaskFromTimeline(taskId, updates, tokens?.access_token || '');
      
      // Update local state optimistically
      setTimelineTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
      
      if (notificationsEnabled) {
        toast.success(`Task "${updates.name || 'Task'}" updated successfully!`);
      }
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  }, [tokens?.access_token, notificationsEnabled, onTaskUpdate]);

  // Handle task creation
  const handleTimelineTaskCreate = useCallback(async (task: Partial<DynamicTimelineTask>) => {
    try {
      const taskData = {
        ...task,
        project_id: project.id
      };
      const createdTask = await taskTimelineService.createTimelineTask(taskData, tokens?.access_token || '');
      setTimelineTasks(prev => [...prev, createdTask]);
      toast.success('Task created successfully');
      onTaskCreate();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }, [tokens?.access_token, project?.id, onTaskCreate]);

  // Handle dependency creation
  const handleDependencyCreate = useCallback(async (dependency: any) => {
    try {
      await dynamicService.createDependency({...dependency, project_id: project.id}, tokens?.access_token || '');
      toast.success('Dependency created successfully');
      fetchTimelineData(); // Refresh to show new dependency
    } catch (error) {
      console.error('Error creating dependency:', error);
      toast.error('Failed to create dependency');
    }
  }, [dynamicService, tokens?.access_token, project?.id, fetchTimelineData]);

  // Auto-schedule handler with better error handling
  const handleAutoSchedule = useCallback(async () => {
    if (!project?.id || !tokens?.access_token) return;

    try {
      setIsAutoScheduling(true);
      console.log('Starting auto-scheduling for project:', project.id);
      
      // First validate we have tasks to schedule
      if (tasks.length === 0) {
        toast.warning('No tasks available to auto-schedule. Please create some tasks first.');
        return;
      }
      
      const result = await dynamicService.autoScheduleTasks(project.id, tokens.access_token);
      console.log('Auto-schedule result:', result);
      
      if (result.scheduled_tasks && result.scheduled_tasks.length > 0) {
        // Show success notification with details
        toast.success(`Auto-scheduling completed! ${result.scheduled_tasks.length} tasks rescheduled, ${result.conflicts_resolved || 0} conflicts resolved.`);
        
        // Refresh timeline data to ensure consistency
        await fetchTimelineData();
        onTaskUpdate();
        
        // Additional refresh after a short delay to ensure all updates are reflected
        setTimeout(() => {
          fetchTimelineData();
        }, 1000);
      } else {
        toast.warning('Auto-scheduling completed but no tasks were rescheduled. Tasks may already be optimally scheduled.');
      }
    } catch (error) {
      console.error('Auto-scheduling failed:', error);
      toast.error(`Auto-scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your task dependencies.`);
    } finally {
      setIsAutoScheduling(false);
    }
  }, [project?.id, tokens?.access_token, dynamicService, fetchTimelineData, onTaskUpdate, tasks.length]);

  // View configuration handlers
  const handleViewConfigChange = useCallback((config: Partial<TimelineViewConfig>) => {
    setViewConfig(prev => ({ ...prev, ...config }));
  }, []);

  const handleFilterChange = useCallback((filterUpdates: Partial<TimelineFilter>) => {
    setFilter(prev => ({ ...prev, ...filterUpdates }));
  }, []);

  // Load data when project changes
  useEffect(() => {
    if (project?.id) {
      fetchTimelineData();
      fetchRealtimeStats();
    }
  }, [fetchTimelineData, fetchRealtimeStats, project?.id]);

  // Calculate progress from tasks
  const taskProgress = useMemo(() => {
    if (!timelineTasks.length) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = timelineTasks.filter(task => task.percent_complete >= 100).length;
    const total = timelineTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }, [timelineTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project timeline...</p>
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