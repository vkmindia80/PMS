import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Calendar, Clock, Users, Layers, Settings, ZoomIn, ZoomOut, RotateCcw, 
  Zap, Target, Activity, AlertTriangle, Wifi, WifiOff, Bell, BellOff,
  Download, Upload, Share2, Filter, Search, Plus, BarChart3,
  Maximize2, Minimize2, RefreshCw, Settings2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProjectFilterContext } from '../contexts/ProjectFilterContext';
import { DynamicGanttChart } from '../components/timeline/DynamicGanttChart';
import { 
  DynamicTimelineService, 
  DynamicTimelineTask, 
  TaskConflict, 
  TimelineFilter, 
  TimelineViewConfig,
  WebSocketMessage 
} from '../services/dynamicTimelineService';
import toast from 'react-hot-toast';

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

export const DynamicTimelinePage: React.FC = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const { tokens } = useAuth();
  const { 
    projects, 
    loading: projectsLoading, 
    selectedProject, 
    setSelectedProject 
  } = useProjectFilterContext();
  
  // Core timeline data
  const [tasks, setTasks] = useState<DynamicTimelineTask[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<TaskConflict[]>([]);
  const [loading, setLoading] = useState(true);
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
    group_by: 'none',
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [showStats, setShowStats] = useState(true);
  
  // Initialize dynamic timeline service
  const dynamicService = useMemo(() => new DynamicTimelineService(), []);

  // Get the actual selected project ID
  const selectedProjectId = urlProjectId || (
    Array.isArray(selectedProject) 
      ? selectedProject[0] 
      : selectedProject === 'all' 
        ? (projects.length > 0 ? projects[0].id : null)
        : selectedProject
  );

  // Set up WebSocket connection and event listeners
  useEffect(() => {
    if (!selectedProjectId || !tokens?.access_token) return;

    const initializeRealtime = async () => {
      try {
        await dynamicService.initializeWebSocket(selectedProjectId, tokens.access_token);
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
        toast.error('Real-time features unavailable');
      }
    };

    initializeRealtime();
    
    return () => {
      dynamicService.disconnect();
      setIsWebSocketConnected(false);
    };
  }, [selectedProjectId, tokens?.access_token]);

  // WebSocket event handlers
  const handleTaskUpdated = useCallback((message: WebSocketMessage) => {
    const updatedTask = message.data;
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? { ...task, ...updatedTask } : task
    ));
    
    if (notificationsEnabled && message.user_id !== tokens?.user_id) {
      toast.success(`Task "${updatedTask.name}" updated by ${message.user_id}`);
    }
  }, [notificationsEnabled, tokens?.user_id]);

  const handleTaskCreated = useCallback((message: WebSocketMessage) => {
    const newTask = message.data;
    setTasks(prev => [...prev, newTask]);
    
    if (notificationsEnabled && message.user_id !== tokens?.user_id) {
      toast.success(`New task "${newTask.name}" created`);
    }
  }, [notificationsEnabled, tokens?.user_id]);

  const handleTaskDeleted = useCallback((message: WebSocketMessage) => {
    const deletedTaskId = message.data.task_id;
    setTasks(prev => prev.filter(task => task.id !== deletedTaskId));
    
    if (notificationsEnabled && message.user_id !== tokens?.user_id) {
      toast.error(`Task deleted`);
    }
  }, [notificationsEnabled, tokens?.user_id]);

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

  // Fetch enhanced timeline data
  const fetchTimelineData = useCallback(async () => {
    if (!selectedProjectId || !tokens?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await dynamicService.getEnhancedGanttData(
        selectedProjectId, 
        tokens.access_token, 
        filter
      );
      
      setTasks(data.tasks || []);
      setDependencies(data.dependencies || []);
      setConflicts(data.conflicts || []);
      
    } catch (err) {
      console.error('Error fetching timeline data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timeline data');
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, tokens?.access_token, filter, dynamicService]);

  // Fetch real-time statistics
  const fetchRealtimeStats = useCallback(async () => {
    if (!selectedProjectId || !tokens?.access_token) return;

    try {
      const stats = await dynamicService.getRealtimeStats(selectedProjectId, tokens.access_token);
      setRealtimeStats(stats);
    } catch (error) {
      console.error('Failed to fetch real-time stats:', error);
    }
  }, [selectedProjectId, tokens?.access_token, dynamicService]);

  // Handle task updates
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<DynamicTimelineTask>) => {
    try {
      await dynamicService.updateTaskDynamic(taskId, updates, tokens?.access_token || '');
      // Optimistic update is handled by the service
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  }, [dynamicService, tokens?.access_token]);

  // Handle task creation
  const handleTaskCreate = useCallback(async (task: Partial<DynamicTimelineTask>) => {
    try {
      await dynamicService.createTask(task, tokens?.access_token || '');
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }, [dynamicService, tokens?.access_token]);

  // Handle dependency creation
  const handleDependencyCreate = useCallback(async (dependency: any) => {
    try {
      await dynamicService.createDependency(dependency, tokens?.access_token || '');
      toast.success('Dependency created successfully');
    } catch (error) {
      console.error('Error creating dependency:', error);
      toast.error('Failed to create dependency');
    }
  }, [dynamicService, tokens?.access_token]);

  // Handle auto-scheduling
  const handleAutoSchedule = useCallback(async () => {
    if (!selectedProjectId || !tokens?.access_token) return;

    try {
      setIsAutoScheduling(true);
      const result = await dynamicService.autoScheduleTasks(selectedProjectId, tokens.access_token);
      
      toast.success(`Auto-scheduling completed! ${result.conflicts_resolved} conflicts resolved.`);
      
      // Refresh timeline data
      await fetchTimelineData();
      
    } catch (error) {
      console.error('Auto-scheduling failed:', error);
      toast.error('Auto-scheduling failed');
    } finally {
      setIsAutoScheduling(false);
    }
  }, [selectedProjectId, tokens?.access_token, dynamicService, fetchTimelineData]);

  // View configuration handlers
  const handleViewConfigChange = useCallback((config: Partial<TimelineViewConfig>) => {
    setViewConfig(prev => ({ ...prev, ...config }));
  }, []);

  const handleFilterChange = useCallback((filterUpdates: Partial<TimelineFilter>) => {
    setFilter(prev => ({ ...prev, ...filterUpdates }));
  }, []);

  // Load data when project changes
  useEffect(() => {
    fetchTimelineData();
    fetchRealtimeStats();
  }, [fetchTimelineData, fetchRealtimeStats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f':
            event.preventDefault();
            setShowAdvancedFilters(!showAdvancedFilters);
            break;
          case 's':
            event.preventDefault();
            handleAutoSchedule();
            break;
          case 'r':
            event.preventDefault();
            fetchTimelineData();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAdvancedFilters, handleAutoSchedule, fetchTimelineData]);

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">
            {projectsLoading ? 'Loading projects...' : 'Loading dynamic timeline...'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Establishing real-time connection...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Timeline Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchTimelineData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Retry Loading
            </button>
            <button
              onClick={() => setError(null)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left side - Title and status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Dynamic Timeline
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Real-time collaborative Gantt chart with smart scheduling
                </p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                isWebSocketConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
            {/* Project Selector */}
            {projects.length > 0 && (
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">Select project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}

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
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
      </div>

      {/* Real-time Statistics Dashboard */}
      {showStats && realtimeStats && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((realtimeStats.completed_tasks / realtimeStats.total_tasks) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-xs text-gray-500">
                {realtimeStats.completed_tasks}/{realtimeStats.total_tasks} tasks
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {realtimeStats.in_progress_tasks}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {realtimeStats.overdue_tasks}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {realtimeStats.critical_path_length}
              </div>
              <div className="text-sm text-gray-600">Critical Tasks</div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${
                realtimeStats.timeline_health_score >= 80 ? 'text-green-600' :
                realtimeStats.timeline_health_score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {realtimeStats.timeline_health_score}%
              </div>
              <div className="text-sm text-gray-600">Health Score</div>
            </div>
          </div>

          {/* Conflicts Alert */}
          {conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected
                </span>
                <button className="text-xs text-red-600 underline hover:text-red-800">
                  View Details
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Gantt Chart */}
      <div className="flex-1 p-4 sm:p-6">
        {!selectedProjectId ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
            <p className="text-gray-600 mb-4">
              Choose a project to view its dynamic timeline with real-time collaboration features.
            </p>
            {projects.length === 0 && (
              <p className="text-sm text-gray-500">No projects available. Create a project first.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <DynamicGanttChart
              projectId={selectedProjectId}
              tasks={tasks}
              dependencies={dependencies}
              conflicts={conflicts}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onDependencyCreate={handleDependencyCreate}
              viewConfig={viewConfig}
              onViewConfigChange={handleViewConfigChange}
              filter={filter}
              onFilterChange={handleFilterChange}
              isRealTimeConnected={isWebSocketConnected}
            />
          </div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <button
          onClick={handleAutoSchedule}
          disabled={isAutoScheduling}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg disabled:opacity-50"
        >
          <Target className="h-6 w-6" />
        </button>
      </div>

      {/* Keyboard shortcuts info */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500 hidden lg:block">
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <div className="font-medium mb-1">Shortcuts:</div>
          <div>Ctrl+F: Filters • Ctrl+S: Auto Schedule • Ctrl+R: Refresh</div>
        </div>
      </div>
    </div>
  );
};

export default DynamicTimelinePage;