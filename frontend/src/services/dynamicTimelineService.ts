/**
 * Dynamic Timeline Service
 * Enhanced timeline service with real-time capabilities, live updates, and advanced interactions
 */

import { API_ENDPOINTS } from '../utils/config';
import { 
  formatDependencyForAPI, 
  validateTaskDependency,
  handleTimelineError 
} from '../utils/timelineUtils';

// Enhanced interfaces with real-time capabilities
export interface DynamicTimelineTask {
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
  created_at: string;
  updated_at: string;
  // Dynamic fields for real-time updates
  is_editing?: boolean;
  edited_by?: string;
  last_modified?: string;
  conflicts?: TaskConflict[];
  auto_scheduled?: boolean;
}

export interface TaskConflict {
  type: 'resource' | 'dependency' | 'timeline' | 'critical_path';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggested_resolution?: string;
}

export interface DynamicTaskDependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: string;
  lag_duration: number;
  lag_format: string;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Dynamic fields
  auto_created?: boolean;
  conflict_detected?: boolean;
}

export interface TimelineFilter {
  assignees?: string[];
  statuses?: string[];
  priorities?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
  show_completed?: boolean;
  show_critical_only?: boolean;
}

export interface TimelineViewConfig {
  mode: 'day' | 'week' | 'month' | 'quarter' | 'year';
  zoom_level: number;
  group_by?: 'assignee' | 'priority' | 'status' | 'none';
  sort_by?: 'start_date' | 'duration' | 'priority' | 'name';
  sort_order?: 'asc' | 'desc';
  show_dependencies: boolean;
  show_critical_path: boolean;
  show_resource_conflicts: boolean;
}

export interface WebSocketMessage {
  type: 'task_updated' | 'task_created' | 'task_deleted' | 'dependency_updated' | 'user_joined' | 'user_left' | 'conflict_detected';
  data: any;
  timestamp: string;
  user_id?: string;
}

export class DynamicTimelineService {
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private isConnected = false;

  constructor() {
    this.initializeWebSocket = this.initializeWebSocket.bind(this);
  }

  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  initializeWebSocket(projectId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/timeline/ws/${projectId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔗 Timeline WebSocket connected');
          this.isConnected = true;
          this.wsReconnectAttempts = 0;
          
          // Send authentication
          this.ws?.send(JSON.stringify({
            type: 'authenticate',
            token: token
          }));

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('📴 Timeline WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect(projectId, token);
        };

        this.ws.onerror = (error) => {
          console.error('❌ Timeline WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(projectId: string, token: string) {
    if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
      this.wsReconnectAttempts++;
      const delay = Math.pow(2, this.wsReconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`🔄 Attempting WebSocket reconnect ${this.wsReconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.initializeWebSocket(projectId, token);
      }, delay);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: WebSocketMessage) {
    console.log('📨 WebSocket message received:', message);
    
    // Notify all listeners for this message type
    const listeners = this.eventListeners.get(message.type) || [];
    listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in WebSocket message listener:', error);
      }
    });
  }

  /**
   * Subscribe to WebSocket events
   */
  on(eventType: string, listener: (message: WebSocketMessage) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off(eventType: string, listener: (message: WebSocketMessage) => void) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Send real-time message via WebSocket
   */
  sendRealtimeMessage(message: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Fetch enhanced Gantt chart data with filtering
   */
  async getEnhancedGanttData(
    projectId: string, 
    token: string, 
    filter?: TimelineFilter
  ): Promise<{
    tasks: DynamicTimelineTask[];
    dependencies: DynamicTaskDependency[];
    conflicts: TaskConflict[];
    critical_path: string[];
    resource_conflicts: any[];
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (filter) {
        if (filter.assignees?.length) {
          queryParams.append('assignees', filter.assignees.join(','));
        }
        if (filter.statuses?.length) {
          queryParams.append('statuses', filter.statuses.join(','));
        }
        if (filter.search_query) {
          queryParams.append('search', filter.search_query);
        }
        if (filter.show_completed !== undefined) {
          queryParams.append('show_completed', filter.show_completed.toString());
        }
        if (filter.show_critical_only) {
          queryParams.append('critical_only', 'true');
        }
      }

      const url = `${API_ENDPOINTS.timeline.gantt(projectId)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enhanced timeline data: ${response.status}`);
      }

      const data = await response.json();
      
      // Enhance data with conflict detection
      const enhancedData = await this.detectConflicts(data, token);
      
      return enhancedData;
    } catch (error) {
      console.error('Error fetching enhanced Gantt data:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Detect and analyze task conflicts
   */
  private async detectConflicts(data: any, token: string): Promise<any> {
    // Implement conflict detection logic
    const conflicts: TaskConflict[] = [];
    const resourceConflicts: any[] = [];

    // Check for resource over-allocation
    const resourceMap = new Map<string, DynamicTimelineTask[]>();
    
    data.tasks.forEach((task: DynamicTimelineTask) => {
      task.assignee_ids.forEach(assigneeId => {
        if (!resourceMap.has(assigneeId)) {
          resourceMap.set(assigneeId, []);
        }
        resourceMap.get(assigneeId)!.push(task);
      });
    });

    // Detect overlapping tasks for same resource
    resourceMap.forEach((tasks, assigneeId) => {
      for (let i = 0; i < tasks.length; i++) {
        for (let j = i + 1; j < tasks.length; j++) {
          const task1 = tasks[i];
          const task2 = tasks[j];
          
          const start1 = new Date(task1.start_date);
          const end1 = new Date(task1.finish_date);
          const start2 = new Date(task2.start_date);
          const end2 = new Date(task2.finish_date);

          // Check for overlap
          if (start1 < end2 && start2 < end1) {
            const conflict: TaskConflict = {
              type: 'resource',
              severity: 'medium',
              message: `Resource ${assigneeId} has overlapping tasks: ${task1.name} and ${task2.name}`,
              suggested_resolution: 'Reschedule one of the tasks or assign additional resources'
            };
            conflicts.push(conflict);
            
            resourceConflicts.push({
              assignee_id: assigneeId,
              conflicting_tasks: [task1.id, task2.id],
              overlap_duration: Math.min(end1.getTime(), end2.getTime()) - Math.max(start1.getTime(), start2.getTime())
            });
          }
        }
      }
    });

    return {
      ...data,
      conflicts,
      resource_conflicts: resourceConflicts
    };
  }

  /**
   * Update task with optimistic updates and conflict resolution
   */
  async updateTaskDynamic(
    taskId: string, 
    updates: Partial<DynamicTimelineTask>, 
    token: string,
    optimistic = true
  ): Promise<DynamicTimelineTask> {
    try {
      // Send optimistic update via WebSocket first
      if (optimistic && this.ws && this.isConnected) {
        this.sendRealtimeMessage({
          type: 'task_update_optimistic',
          task_id: taskId,
          updates,
          timestamp: new Date().toISOString()
        });
      }

      // Perform actual API update
      const response = await fetch(API_ENDPOINTS.timeline.taskUpdate(taskId), {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({
          ...updates,
          last_modified: new Date().toISOString()
        })
      });

      if (!response.ok) {
        // Revert optimistic update
        if (optimistic && this.ws && this.isConnected) {
          this.sendRealtimeMessage({
            type: 'task_update_failed',
            task_id: taskId,
            timestamp: new Date().toISOString()
          });
        }
        throw new Error(`Failed to update task: ${response.status}`);
      }

      const updatedTask = await response.json();
      
      // Send confirmation via WebSocket
      if (this.ws && this.isConnected) {
        this.sendRealtimeMessage({
          type: 'task_update_confirmed',
          task: updatedTask,
          timestamp: new Date().toISOString()
        });
      }

      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Auto-schedule tasks based on dependencies
   */
  async autoScheduleTasks(projectId: string, token: string): Promise<{
    scheduled_tasks: DynamicTimelineTask[];
    conflicts_resolved: number;
    suggestions: string[];
  }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.timeline.gantt(projectId)}/auto-schedule`, {
        method: 'POST',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Auto-scheduling failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Broadcast auto-schedule results
      if (this.ws && this.isConnected) {
        this.sendRealtimeMessage({
          type: 'auto_schedule_completed',
          result,
          timestamp: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      console.error('Error auto-scheduling tasks:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Batch update multiple tasks with conflict resolution
   */
  async batchUpdateTasks(
    updates: Array<{id: string, data: Partial<DynamicTimelineTask>}>, 
    token: string,
    resolveConflicts = true
  ): Promise<{
    successful: DynamicTimelineTask[];
    failed: Array<{id: string, error: string}>;
    conflicts_detected: TaskConflict[];
  }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.timeline.taskCreate()}/batch-update`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({
          updates,
          resolve_conflicts: resolveConflicts
        })
      });

      if (!response.ok) {
        throw new Error(`Batch update failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Broadcast batch update results
      if (this.ws && this.isConnected) {
        this.sendRealtimeMessage({
          type: 'batch_update_completed',
          result,
          timestamp: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      console.error('Error in batch update:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Search tasks with real-time suggestions
   */
  async searchTasks(
    projectId: string, 
    query: string, 
    token: string
  ): Promise<{
    tasks: DynamicTimelineTask[];
    suggestions: string[];
    total_found: number;
  }> {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.timeline.tasks(projectId)}?search=${encodeURIComponent(query)}&include_suggestions=true`,
        {
          headers: this.getAuthHeaders(token)
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Get real-time timeline statistics
   */
  async getRealtimeStats(projectId: string, token: string): Promise<{
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
    critical_path_length: number;
    resource_utilization: number;
    timeline_health_score: number;
    estimated_completion: string;
    conflicts_count: number;
  }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.timeline.stats(projectId)}/realtime`, {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch realtime stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Check WebSocket connection status
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const dynamicTimelineService = new DynamicTimelineService();
export default dynamicTimelineService;