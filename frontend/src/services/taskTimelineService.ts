/**
 * Task Timeline Integration Service
 * Handles conversion between regular tasks and timeline tasks
 */

import { API_ENDPOINTS } from '../utils/config';
import { DynamicTimelineTask, DynamicTaskDependency } from './dynamicTimelineService';

export interface RegularTask {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  assignee_id?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'task' | 'bug' | 'feature' | 'epic' | 'story';
  due_date?: string;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  time_tracking?: {
    estimated_hours?: number;
    actual_hours?: number;
  };
}

export class TaskTimelineService {
  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Fetch tasks from regular tasks API and convert to timeline tasks
   */
  async fetchTasksAsTimeline(
    projectId: string, 
    token: string
  ): Promise<{
    tasks: DynamicTimelineTask[];
    dependencies: DynamicTaskDependency[];
  }> {
    try {
      // Fetch regular tasks
      const tasksResponse = await fetch(`/api/tasks?project_id=${projectId}`, {
        headers: this.getAuthHeaders(token)
      });

      if (!tasksResponse.ok) {
        throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
      }

      const regularTasks: RegularTask[] = await tasksResponse.json();
      
      // Convert regular tasks to timeline tasks
      const timelineTasks = regularTasks.map(task => this.convertToTimelineTask(task));
      
      // For now, return empty dependencies - can be enhanced later
      const dependencies: DynamicTaskDependency[] = [];

      return {
        tasks: timelineTasks,
        dependencies
      };
    } catch (error) {
      console.error('Error fetching tasks as timeline:', error);
      throw error;
    }
  }

  /**
   * Convert regular task to timeline task format
   */
  private convertToTimelineTask(task: RegularTask): DynamicTimelineTask {
    // Calculate timeline dates
    const createdDate = new Date(task.created_at);
    const dueDate = task.due_date ? new Date(task.due_date) : new Date(createdDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // Default 1 week duration
    
    // Calculate duration in hours
    const estimatedHours = task.time_tracking?.estimated_hours || 8; // Default 8 hours
    const duration = estimatedHours;
    
    // Calculate start and finish dates
    const startDate = new Date(createdDate);
    const finishDate = new Date(dueDate);
    
    // If no due date, calculate finish based on duration
    if (!task.due_date) {
      finishDate.setTime(startDate.getTime() + (duration * 60 * 60 * 1000));
    }

    return {
      id: task.id,
      name: task.title,
      description: task.description,
      project_id: task.project_id,
      duration: duration,
      start_date: startDate.toISOString(),
      finish_date: finishDate.toISOString(),
      percent_complete: task.progress_percentage,
      outline_level: 1, // Default level
      summary_task: task.type === 'epic', // Epics are summary tasks
      critical: task.priority === 'critical',
      assignee_ids: task.assignee_id ? [task.assignee_id] : [],
      milestone: task.type === 'milestone',
      color: this.getTaskColor(task.priority, task.status),
      created_at: task.created_at,
      updated_at: task.updated_at,
      conflicts: [],
      auto_scheduled: false
    };
  }

  /**
   * Get color based on task priority and status
   */
  private getTaskColor(priority: string, status: string): string {
    if (status === 'completed') return '#10b981'; // Green
    if (status === 'cancelled') return '#6b7280'; // Gray
    
    switch (priority) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f59e0b'; // Orange
      case 'medium': return '#3b82f6'; // Blue
      case 'low': return '#8b5cf6'; // Purple
      default: return '#3b82f6'; // Default blue
    }
  }

  /**
   * Update task dates and convert back to regular task format
   */
  async updateTaskFromTimeline(
    taskId: string,
    timelineUpdates: Partial<DynamicTimelineTask>,
    token: string
  ): Promise<void> {
    try {
      // Convert timeline updates to regular task format
      const taskUpdates: any = {};
      
      if (timelineUpdates.name) {
        taskUpdates.title = timelineUpdates.name;
      }
      
      if (timelineUpdates.description) {
        taskUpdates.description = timelineUpdates.description;
      }
      
      if (timelineUpdates.percent_complete !== undefined) {
        taskUpdates.progress_percentage = timelineUpdates.percent_complete;
      }
      
      if (timelineUpdates.finish_date) {
        taskUpdates.due_date = timelineUpdates.finish_date;
      }
      
      if (timelineUpdates.assignee_ids && timelineUpdates.assignee_ids.length > 0) {
        taskUpdates.assignee_id = timelineUpdates.assignee_ids[0];
      }

      // Update time tracking if duration changed
      if (timelineUpdates.duration !== undefined) {
        taskUpdates.time_tracking = {
          estimated_hours: timelineUpdates.duration
        };
      }

      // Update the task via regular tasks API
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(taskUpdates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating task from timeline:', error);
      throw error;
    }
  }

  /**
   * Create a new timeline task
   */
  async createTimelineTask(
    task: Partial<DynamicTimelineTask>,
    token: string
  ): Promise<DynamicTimelineTask> {
    try {
      // Convert timeline task to regular task format
      const regularTask = {
        title: task.name || 'New Task',
        description: task.description || '',
        project_id: task.project_id!,
        assignee_id: task.assignee_ids?.[0],
        status: task.percent_complete === 100 ? 'completed' : 
               task.percent_complete > 0 ? 'in_progress' : 'todo',
        priority: task.critical ? 'critical' : 'medium',
        type: task.summary_task ? 'epic' : task.milestone ? 'milestone' : 'task',
        due_date: task.finish_date,
        progress_percentage: task.percent_complete || 0,
        time_tracking: {
          estimated_hours: task.duration || 8
        }
      };

      // Create via regular tasks API
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(regularTask)
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const createdTask = await response.json();
      return this.convertToTimelineTask(createdTask);
    } catch (error) {
      console.error('Error creating timeline task:', error);
      throw error;
    }
  }
}

export const taskTimelineService = new TaskTimelineService();
export default taskTimelineService;