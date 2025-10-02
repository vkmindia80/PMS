/**
 * Timeline Service
 * Handles all timeline-related API calls with proper dependency type mapping
 */

import { API_ENDPOINTS } from '../utils/config';
import { 
  formatDependencyForAPI, 
  validateTaskDependency,
  handleTimelineError 
} from '../utils/timelineUtils';

// Timeline interfaces
export interface TimelineTask {
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
}

export interface TaskDependency {
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
}

export interface TaskDependencyCreate {
  predecessor_id: string;
  successor_id: string;
  dependency_type: string;
  lag_duration?: number;
  project_id: string;
}

export interface GanttChartData {
  project_id: string;
  tasks: TimelineTask[];
  dependencies: TaskDependency[];
  critical_path: string[];
  timeline_config?: any;
  calendars?: any[];
  baselines?: any[];
}

export class TimelineService {
  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Fetch Gantt chart data for a project
   */
  async getGanttData(projectId: string, token: string): Promise<GanttChartData> {
    try {
      const response = await fetch(API_ENDPOINTS.timeline.gantt(projectId), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch timeline data: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Gantt data:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Get timeline tasks for a project
   */
  async getTasks(projectId: string, token: string): Promise<TimelineTask[]> {
    try {
      const response = await fetch(API_ENDPOINTS.timeline.tasks(projectId), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Create a new timeline task
   */
  async createTask(task: Partial<TimelineTask>, token: string): Promise<TimelineTask> {
    try {
      const response = await fetch(API_ENDPOINTS.timeline.taskCreate(), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(task)
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Update a timeline task
   */
  async updateTask(taskId: string, updates: Partial<TimelineTask>, token: string): Promise<TimelineTask> {
    try {
      const response = await fetch(API_ENDPOINTS.timeline.taskUpdate(taskId), {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Get task dependencies for a project
   */
  async getDependencies(projectId: string, token: string): Promise<TaskDependency[]> {
    try {
      const response = await fetch(API_ENDPOINTS.timeline.dependencies(projectId), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dependencies: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Create a task dependency with proper validation and type mapping
   */
  async createDependency(dependency: TaskDependencyCreate, token: string): Promise<TaskDependency> {
    try {
      // Validate dependency data
      const validation = validateTaskDependency(dependency);
      if (!validation.valid) {
        throw new Error(`Invalid dependency data: ${validation.errors.join(', ')}`);
      }

      // Format dependency for API with proper type mapping
      const formattedDependency = formatDependencyForAPI(dependency);

      const response = await fetch(API_ENDPOINTS.timeline.dependencyCreate(), {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(formattedDependency)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create dependency: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating dependency:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Delete a task dependency
   */
  async deleteDependency(dependencyId: string, token: string): Promise<void> {
    try {
      const response = await fetch(API_ENDPOINTS.timeline.dependencyDelete(dependencyId), {
        method: 'DELETE',
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to delete dependency: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting dependency:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Get timeline statistics for a project
   */
  async getTimelineStats(projectId: string, token: string): Promise<any> {
    try {
      const response = await fetch(API_ENDPOINTS.timeline.stats(projectId), {
        headers: this.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch timeline stats: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching timeline stats:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Batch update multiple tasks
   */
  async batchUpdateTasks(updates: Array<{id: string, data: Partial<TimelineTask>}>, token: string): Promise<TimelineTask[]> {
    try {
      const updatePromises = updates.map(update => 
        this.updateTask(update.id, update.data, token)
      );

      const results = await Promise.allSettled(updatePromises);
      
      const successful: TimelineTask[] = [];
      const failed: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push(`Task ${updates[index].id}: ${result.reason.message}`);
        }
      });

      if (failed.length > 0) {
        console.warn('Some task updates failed:', failed);
      }

      return successful;
    } catch (error) {
      console.error('Error in batch update:', error);
      throw new Error(handleTimelineError(error));
    }
  }

  /**
   * Validate task data before API calls
   */
  validateTaskData(task: Partial<TimelineTask>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (task.name !== undefined && !task.name.trim()) {
      errors.push('Task name is required');
    }

    if (task.duration !== undefined && task.duration <= 0) {
      errors.push('Task duration must be positive');
    }

    if (task.percent_complete !== undefined && (task.percent_complete < 0 || task.percent_complete > 100)) {
      errors.push('Percent complete must be between 0 and 100');
    }

    if (task.start_date && task.finish_date) {
      const startDate = new Date(task.start_date);
      const finishDate = new Date(task.finish_date);
      
      if (finishDate < startDate) {
        errors.push('Finish date cannot be before start date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const timelineService = new TimelineService();
export default timelineService;