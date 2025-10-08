/**
 * Advanced Timeline Tab - Complete rebuild with enterprise-grade features
 * 
 * Features:
 * - Drag & Drop task rescheduling and resizing
 * - Critical Path Analysis with slack/float visualization
 * - Advanced Dependencies (FS, SS, FF, SF) with conflict detection
 * - Resource Management with histogram and over-allocation warnings
 * - Baseline & Progress Tracking with variance indicators
 * - Real-time Collaboration with conflict resolution
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, Users, Settings, ZoomIn, ZoomOut, RotateCcw, 
  Zap, Target, Activity, AlertTriangle, Wifi, WifiOff, Bell, BellOff,
  Download, Upload, Share2, Filter, Search, Plus, BarChart3,
  Maximize2, Minimize2, RefreshCw, Settings2, GitBranch, Eye,
  Play, Pause, Square, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, TrendingDown, Layers, Edit2, Trash2, Link2, ListFilter,
  Save, X, ChevronRight, ChevronDown, Users2, PieChart, LineChart,
  Columns, Grid3x3, FolderTree, Network, Boxes, History, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../utils/config';
import toast from 'react-hot-toast';
import {
  dynamicTimelineService,
  DynamicTimelineTask,
  TaskConflict,
  TimelineFilter,
  TimelineViewConfig
} from '../../services/dynamicTimelineService';
import AdvancedGanttChart from './AdvancedGanttChart';
import CriticalPathPanel from './CriticalPathPanel';
import ResourceHistogram from './ResourceHistogram';
import BaselineComparisonView from './BaselineComparisonView';
import DependencyManager from './DependencyManager';
import TimelineExportButton from '../timeline/TimelineExportButton';

interface AdvancedTimelineTabProps {
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
  conflicts_count: number;
}

interface BaselineTask {
  id: string;
  name: string;
  planned_start: string;
  planned_end: string;
  planned_duration: number;
  actual_start?: string;
  actual_end?: string;
  actual_duration?: number;
}

const AdvancedTimelineTab: React.FC<AdvancedTimelineTabProps> = ({
  project,
  users,
  tasks: projectTasks,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete
}) => {
  const { tokens } = useAuth();
  
  // Core State
  const [timelineTasks, setTimelineTasks] = useState<DynamicTimelineTask[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<TaskConflict[]>([]);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);

  // View State
  const [activeView, setActiveView] = useState<'gantt' | 'resource' | 'baseline' | 'critical-path'>('gantt');
  const [viewConfig, setViewConfig] = useState<TimelineViewConfig>({
    mode: 'week',
    zoom_level: 1,
    group_by: 'none',
    sort_by: 'start_date',
    sort_order: 'asc',
    show_dependencies: true,
    show_critical_path: true,
    show_resource_conflicts: true
  });
  
  const [filter, setFilter] = useState<TimelineFilter>({
    show_completed: true,
    show_critical_only: false
  });

  // Panel States
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDependencyManager, setShowDependencyManager] = useState(false);
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  const [showBaselinePanel, setShowBaselinePanel] = useState(false);
  const [showCriticalPathPanel, setShowCriticalPathPanel] = useState(false);

  // Stats State
  const [stats, setStats] = useState<TimelineStats>({
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0,
    critical_path_length: 0,
    resource_utilization: 0,
    timeline_health_score: 75,
    conflicts_count: 0
  });

  // Baseline State
  const [baselineTasks, setBaselineTasks] = useState<BaselineTask[]>([]);
  const [showBaseline, setShowBaseline] = useState(false);

  // Auto-scheduling State
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [autoScheduleResults, setAutoScheduleResults] = useState<any>(null);

  // Real-time collaboration
  const wsInitialized = useRef(false);

  /**
   * Initialize WebSocket connection for real-time features
   */
  useEffect(() => {
    if (project?.id && tokens?.access_token && !wsInitialized.current) {
      wsInitialized.current = true;
      
      dynamicTimelineService.initializeWebSocket(project.id, tokens.access_token)
        .then(() => {
          setIsRealTimeConnected(dynamicTimelineService.isWebSocketConnected());
          
          // Subscribe to real-time events
          dynamicTimelineService.on('task_updated', handleTaskUpdatedEvent);
          dynamicTimelineService.on('task_created', handleTaskCreatedEvent);
          dynamicTimelineService.on('dependency_updated', handleDependencyUpdatedEvent);
          dynamicTimelineService.on('conflict_detected', handleConflictDetectedEvent);
        })
        .catch((error) => {
          console.warn('WebSocket initialization failed, continuing without real-time features:', error);
          setIsRealTimeConnected(false);
        });
    }

    return () => {
      if (wsInitialized.current) {
        dynamicTimelineService.off('task_updated', handleTaskUpdatedEvent);
        dynamicTimelineService.off('task_created', handleTaskCreatedEvent);
        dynamicTimelineService.off('dependency_updated', handleDependencyUpdatedEvent);
        dynamicTimelineService.off('conflict_detected', handleConflictDetectedEvent);
        dynamicTimelineService.disconnect();
        wsInitialized.current = false;
      }
    };
  }, [project?.id, tokens?.access_token]);

  /**
   * Real-time event handlers
   */
  const handleTaskUpdatedEvent = useCallback((message: any) => {
    console.log('📨 Task updated via WebSocket:', message);
    // Refresh timeline data
    fetchTimelineData();
  }, []);

  const handleTaskCreatedEvent = useCallback((message: any) => {
    console.log('📨 Task created via WebSocket:', message);
    fetchTimelineData();
  }, []);

  const handleDependencyUpdatedEvent = useCallback((message: any) => {
    console.log('📨 Dependency updated via WebSocket:', message);
    fetchTimelineData();
  }, []);

  const handleConflictDetectedEvent = useCallback((message: any) => {
    console.log('⚠️ Conflict detected via WebSocket:', message);
    toast.error('Timeline conflict detected!', {
      duration: 5000,
      icon: '⚠️'
    });
    fetchTimelineData();
  }, []);

  /**
   * Fetch timeline data with enhanced features
   */
  const fetchTimelineData = useCallback(async () => {
    if (!project?.id || !tokens?.access_token) {
      console.warn('Missing project ID or access token');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch enhanced timeline data
      const data = await dynamicTimelineService.getEnhancedGanttData(
        project.id,
        tokens.access_token,
        filter
      );

      setTimelineTasks(data.tasks);
      setDependencies(data.dependencies);
      setConflicts(data.conflicts);
      setCriticalPath(data.critical_path || []);

      // Fetch stats
      const statsData = await dynamicTimelineService.getRealtimeStats(
        project.id,
        tokens.access_token
      );
      
      setStats({
        total_tasks: statsData.total_tasks,
        completed_tasks: statsData.completed_tasks,
        in_progress_tasks: statsData.in_progress_tasks,
        overdue_tasks: statsData.overdue_tasks,
        critical_path_length: statsData.critical_path_length,
        resource_utilization: statsData.resource_utilization,
        timeline_health_score: statsData.timeline_health_score,
        conflicts_count: data.conflicts.length
      });

      // Initialize baseline if not set
      if (baselineTasks.length === 0 && data.tasks.length > 0) {
        setBaselineTasks(data.tasks.map(task => ({
          id: task.id,
          name: task.name,
          planned_start: task.start_date,
          planned_end: task.finish_date,
          planned_duration: task.duration,
          actual_start: task.start_date,
          actual_end: task.finish_date,
          actual_duration: task.duration
        })));
      }

    } catch (err) {
      console.error('Error fetching timeline data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load timeline data';
      setError(errorMessage);
      toast.error(`Timeline Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [project?.id, tokens?.access_token, filter, baselineTasks.length]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (project?.id && tokens?.access_token) {
      fetchTimelineData();
    }
  }, [project?.id, tokens?.access_token, filter]);

  /**
   * Task update handler with optimistic updates
   */
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<DynamicTimelineTask>) => {
    if (!tokens?.access_token) return;

    try {
      // Optimistic update
      setTimelineTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));

      await dynamicTimelineService.updateTaskDynamic(
        taskId,
        updates,
        tokens.access_token,
        true // Enable optimistic updates
      );

      toast.success('Task updated successfully');
      onTaskUpdate();
      
      // Refresh to get updated critical path and conflicts
      await fetchTimelineData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      // Revert optimistic update
      await fetchTimelineData();
    }
  }, [tokens?.access_token, onTaskUpdate, fetchTimelineData]);

  /**
   * Task creation handler
   */
  const handleTaskCreate = useCallback(async (taskData: Partial<DynamicTimelineTask>) => {
    if (!tokens?.access_token) return;

    try {
      await dynamicTimelineService.createTask(
        {
          ...taskData,
          project_id: project.id
        },
        tokens.access_token
      );

      toast.success('Task created successfully');
      onTaskCreate();
      await fetchTimelineData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }, [tokens?.access_token, project.id, onTaskCreate, fetchTimelineData]);

  /**
   * Dependency creation handler
   */
  const handleDependencyCreate = useCallback(async (dependency: any) => {
    if (!tokens?.access_token) return;

    try {
      await dynamicTimelineService.createDependency(
        {
          ...dependency,
          project_id: project.id
        },
        tokens.access_token
      );

      toast.success('Dependency created successfully');
      await fetchTimelineData();
    } catch (error) {
      console.error('Error creating dependency:', error);
      toast.error('Failed to create dependency');
    }
  }, [tokens?.access_token, project.id, fetchTimelineData]);

  /**
   * Auto-schedule tasks
   */
  const handleAutoSchedule = useCallback(async () => {
    if (!tokens?.access_token || isAutoScheduling) return;

    try {
      setIsAutoScheduling(true);
      toast.loading('Auto-scheduling tasks...', { id: 'auto-schedule' });

      const results = await dynamicTimelineService.autoScheduleTasks(
        project.id,
        tokens.access_token
      );

      setAutoScheduleResults(results);
      toast.success(
        `Auto-scheduling complete! ${results.conflicts_resolved} conflicts resolved.`,
        { id: 'auto-schedule' }
      );

      await fetchTimelineData();
    } catch (error) {
      console.error('Error auto-scheduling:', error);
      toast.error('Auto-scheduling failed', { id: 'auto-schedule' });
    } finally {
      setIsAutoScheduling(false);
    }
  }, [tokens?.access_token, project.id, isAutoScheduling, fetchTimelineData]);

  /**
   * Save current state as baseline
   */
  const handleSaveBaseline = useCallback(() => {
    setBaselineTasks(timelineTasks.map(task => ({
      id: task.id,
      name: task.name,
      planned_start: task.start_date,
      planned_end: task.finish_date,
      planned_duration: task.duration,
      actual_start: task.start_date,
      actual_end: task.finish_date,
      actual_duration: task.duration
    })));
    toast.success('Baseline saved successfully');
  }, [timelineTasks]);

  /**
   * Export timeline data - Now handled by TimelineExportButton component
   */
  const handleExport = useCallback(async (format: 'png' | 'pdf' | 'csv') => {
    // This is now handled by the TimelineExportButton component
    // Keeping this method for compatibility
  }, []);

  /**
   * View configuration updates
   */
  const handleViewConfigChange = useCallback((updates: Partial<TimelineViewConfig>) => {
    setViewConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Filter updates
   */
  const handleFilterChange = useCallback((updates: Partial<TimelineFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  }, []);

  // Loading state
  if (loading && timelineTasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="timeline-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Initializing Advanced Timeline...</p>
          <p className="text-sm text-gray-500 mt-2">Loading tasks, dependencies, and critical path analysis</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && timelineTasks.length === 0) {
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
    <div className="space-y-6" data-testid="advanced-timeline-tab">
      {/* Enhanced Header with Real-time Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* Left: Title & Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                  <span>Advanced Timeline</span>
                  {isRealTimeConnected && (
                    <span className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enterprise-grade project scheduling with critical path analysis
                </p>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                showAdvancedFilters 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>

            <button
              onClick={handleAutoSchedule}
              disabled={isAutoScheduling}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Zap className="h-4 w-4" />
              <span>{isAutoScheduling ? 'Scheduling...' : 'Auto-Schedule'}</span>
            </button>

            <button
              onClick={handleSaveBaseline}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all shadow-md"
            >
              <Save className="h-4 w-4" />
              <span>Save Baseline</span>
            </button>

            <button
              onClick={fetchTimelineData}
              className="p-2 rounded-lg bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => handleExport('png')}
              className="p-2 rounded-lg bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 transition-all"
              title="Export Timeline"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Enhanced Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="text-center p-3 bg-white rounded-xl border border-blue-200 shadow-sm">
            <div className="text-2xl font-bold text-blue-700">
              {stats.total_tasks}
            </div>
            <div className="text-xs text-blue-600 mt-1">Total Tasks</div>
          </div>

          <div className="text-center p-3 bg-white rounded-xl border border-green-200 shadow-sm">
            <div className="text-2xl font-bold text-green-700">
              {stats.completed_tasks}
            </div>
            <div className="text-xs text-green-600 mt-1">Completed</div>
          </div>

          <div className="text-center p-3 bg-white rounded-xl border border-yellow-200 shadow-sm">
            <div className="text-2xl font-bold text-yellow-700">
              {stats.in_progress_tasks}
            </div>
            <div className="text-xs text-yellow-600 mt-1">In Progress</div>
          </div>

          <div className="text-center p-3 bg-white rounded-xl border border-red-200 shadow-sm">
            <div className="text-2xl font-bold text-red-700">
              {stats.overdue_tasks}
            </div>
            <div className="text-xs text-red-600 mt-1">Overdue</div>
          </div>

          <div className="text-center p-3 bg-white rounded-xl border border-purple-200 shadow-sm">
            <div className="text-2xl font-bold text-purple-700">
              {stats.critical_path_length}
            </div>
            <div className="text-xs text-purple-600 mt-1">Critical Path</div>
          </div>

          <div className="text-center p-3 bg-white rounded-xl border border-indigo-200 shadow-sm">
            <div className="text-2xl font-bold text-indigo-700">
              {stats.resource_utilization}%
            </div>
            <div className="text-xs text-indigo-600 mt-1">Resources</div>
          </div>

          <div className="text-center p-3 bg-white rounded-xl border border-teal-200 shadow-sm">
            <div className="text-2xl font-bold text-teal-700">
              {stats.timeline_health_score}%
            </div>
            <div className="text-xs text-teal-600 mt-1">Health</div>
          </div>

          <div className="text-center p-3 bg-white rounded-xl border border-orange-200 shadow-sm">
            <div className="text-2xl font-bold text-orange-700">
              {stats.conflicts_count}
            </div>
            <div className="text-xs text-orange-600 mt-1">Conflicts</div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <span>Advanced Filters</span>
            </h3>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                multiple
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                size={3}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange({ statuses: values });
                }}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignees</label>
              <select
                multiple
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                size={3}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange({ assignees: values });
                }}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.show_completed}
                    onChange={(e) => handleFilterChange({ show_completed: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show completed tasks</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filter.show_critical_only}
                    onChange={(e) => handleFilterChange({ show_critical_only: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Critical path only</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Switcher */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center border-b border-gray-200">
          <button
            onClick={() => setActiveView('gantt')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-b-2 ${
              activeView === 'gantt'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            <GitBranch className="h-5 w-5" />
            <span>Gantt Chart</span>
          </button>

          <button
            onClick={() => setActiveView('resource')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-b-2 ${
              activeView === 'resource'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users2 className="h-5 w-5" />
            <span>Resources</span>
          </button>

          <button
            onClick={() => setActiveView('baseline')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-b-2 ${
              activeView === 'baseline'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History className="h-5 w-5" />
            <span>Baseline</span>
          </button>

          <button
            onClick={() => setActiveView('critical-path')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-b-2 ${
              activeView === 'critical-path'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Network className="h-5 w-5" />
            <span>Critical Path</span>
          </button>
        </div>

        {/* View Content */}
        <div className="p-6">
          {activeView === 'gantt' && (
            <AdvancedGanttChart
              projectId={project.id}
              tasks={timelineTasks}
              dependencies={dependencies}
              conflicts={conflicts}
              criticalPath={criticalPath}
              users={users}
              viewConfig={viewConfig}
              filter={filter}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onDependencyCreate={handleDependencyCreate}
              onViewConfigChange={handleViewConfigChange}
              onFilterChange={handleFilterChange}
              isRealTimeConnected={isRealTimeConnected}
            />
          )}

          {activeView === 'resource' && (
            <ResourceHistogram
              tasks={timelineTasks}
              users={users}
              conflicts={conflicts.filter(c => c.type === 'resource')}
              onTaskReassign={handleTaskUpdate}
            />
          )}

          {activeView === 'baseline' && (
            <BaselineComparisonView
              currentTasks={timelineTasks}
              baselineTasks={baselineTasks}
              onSaveBaseline={handleSaveBaseline}
            />
          )}

          {activeView === 'critical-path' && (
            <CriticalPathPanel
              tasks={timelineTasks}
              dependencies={dependencies}
              criticalPath={criticalPath}
              onTaskUpdate={handleTaskUpdate}
            />
          )}
        </div>
      </div>

      {/* Conflicts & Warnings Panel */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Timeline Conflicts & Warnings</span>
            <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded-full">
              {conflicts.length}
            </span>
          </h3>
          <div className="space-y-3">
            {conflicts.map((conflict, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                conflict.severity === 'high' ? 'bg-red-100 border-red-300' :
                conflict.severity === 'medium' ? 'bg-orange-100 border-orange-300' :
                'bg-yellow-100 border-yellow-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        conflict.severity === 'high' ? 'bg-red-200 text-red-800' :
                        conflict.severity === 'medium' ? 'bg-orange-200 text-orange-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {conflict.type.toUpperCase()}
                      </span>
                      <span className={`text-xs font-medium ${
                        conflict.severity === 'high' ? 'text-red-700' :
                        conflict.severity === 'medium' ? 'text-orange-700' :
                        'text-yellow-700'
                      }`}>
                        {conflict.severity.toUpperCase()} SEVERITY
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">{conflict.message}</p>
                    {conflict.suggested_resolution && (
                      <p className="text-xs text-gray-600 mt-1">
                        💡 {conflict.suggested_resolution}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Schedule Results */}
      {autoScheduleResults && (
        <div className="bg-green-50 rounded-2xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-900 flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Auto-Schedule Results</span>
            </h3>
            <button
              onClick={() => setAutoScheduleResults(null)}
              className="p-1 hover:bg-green-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-green-700" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-xl">
              <div className="text-3xl font-bold text-green-700">
                {autoScheduleResults.scheduled_tasks?.length || 0}
              </div>
              <div className="text-sm text-green-600 mt-1">Tasks Scheduled</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <div className="text-3xl font-bold text-blue-700">
                {autoScheduleResults.conflicts_resolved}
              </div>
              <div className="text-sm text-blue-600 mt-1">Conflicts Resolved</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <div className="text-3xl font-bold text-purple-700">
                {autoScheduleResults.suggestions?.length || 0}
              </div>
              <div className="text-sm text-purple-600 mt-1">Suggestions</div>
            </div>
          </div>
          {autoScheduleResults.suggestions && autoScheduleResults.suggestions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Suggestions:</p>
              {autoScheduleResults.suggestions.map((suggestion: string, index: number) => (
                <p key={index} className="text-sm text-gray-600 pl-4">• {suggestion}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedTimelineTab;
