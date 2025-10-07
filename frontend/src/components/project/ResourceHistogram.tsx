/**
 * Resource Histogram Component
 * 
 * Displays:
 * - Resource allocation over time
 * - Over-allocation warnings
 * - Workload balancing suggestions
 */

import React, { useMemo } from 'react';
import { DynamicTimelineTask, TaskConflict } from '../../services/dynamicTimelineService';
import { Users, AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface ResourceHistogramProps {
  tasks: DynamicTimelineTask[];
  users: any[];
  conflicts: TaskConflict[];
  onTaskReassign: (taskId: string, updates: Partial<DynamicTimelineTask>) => void;
}

const ResourceHistogram: React.FC<ResourceHistogramProps> = ({
  tasks,
  users,
  conflicts,
  onTaskReassign
}) => {
  /**
   * Calculate resource allocation
   */
  const resourceAllocation = useMemo(() => {
    const allocation = new Map<string, {
      user: any;
      tasks: DynamicTimelineTask[];
      totalHours: number;
      utilization: number;
      overAllocated: boolean;
    }>();

    users.forEach(user => {
      const userTasks = tasks.filter(task => 
        task.assignee_ids.includes(user.id) && task.percent_complete < 100
      );

      const totalHours = userTasks.reduce((sum, task) => sum + task.duration, 0);
      const utilizationPercent = Math.min(100, (totalHours / 160) * 100); // Assuming 160 hours per month
      
      allocation.set(user.id, {
        user,
        tasks: userTasks,
        totalHours,
        utilization: utilizationPercent,
        overAllocated: utilizationPercent > 100
      });
    });

    return allocation;
  }, [tasks, users]);

  /**
   * Get users sorted by utilization
   */
  const sortedResources = useMemo(() => {
    return Array.from(resourceAllocation.values()).sort((a, b) => b.utilization - a.utilization);
  }, [resourceAllocation]);

  /**
   * Calculate average utilization
   */
  const averageUtilization = useMemo(() => {
    if (sortedResources.length === 0) return 0;
    const sum = sortedResources.reduce((acc, r) => acc + r.utilization, 0);
    return Math.round(sum / sortedResources.length);
  }, [sortedResources]);

  /**
   * Get over-allocated resources
   */
  const overAllocatedResources = useMemo(() => {
    return sortedResources.filter(r => r.overAllocated);
  }, [sortedResources]);

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'bg-red-500';
    if (utilization > 80) return 'bg-orange-500';
    if (utilization > 60) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getUtilizationTextColor = (utilization: number) => {
    if (utilization > 100) return 'text-red-700';
    if (utilization > 80) return 'text-orange-700';
    if (utilization > 60) return 'text-green-700';
    return 'text-blue-700';
  };

  return (
    <div className="space-y-6">
      {/* Resource Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-purple-900 flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Resource Allocation</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
            <div className="text-3xl font-bold text-purple-700">
              {sortedResources.length}
            </div>
            <div className="text-sm text-purple-600 mt-1">Total Resources</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-700">
              {averageUtilization}%
            </div>
            <div className="text-sm text-green-600 mt-1">Avg Utilization</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-red-200">
            <div className="text-3xl font-bold text-red-700">
              {overAllocatedResources.length}
            </div>
            <div className="text-sm text-red-600 mt-1">Over-Allocated</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-700">
              {tasks.length}
            </div>
            <div className="text-sm text-blue-600 mt-1">Active Tasks</div>
          </div>
        </div>
      </div>

      {/* Resource Histogram */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Resource Utilization Chart</span>
          </h4>
        </div>

        <div className="p-6 space-y-4">
          {sortedResources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No resources assigned to tasks</p>
            </div>
          ) : (
            sortedResources.map((resource) => (
              <div key={resource.user.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-sm">
                        {resource.user.first_name?.[0]}{resource.user.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {resource.user.first_name} {resource.user.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {resource.tasks.length} task{resource.tasks.length !== 1 ? 's' : ''} · {resource.totalHours}h
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-bold ${getUtilizationTextColor(resource.utilization)}`}>
                      {Math.round(resource.utilization)}%
                    </span>
                    {resource.overAllocated && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${getUtilizationColor(resource.utilization)} transition-all duration-300`}
                    style={{ width: `${Math.min(100, resource.utilization)}%` }}
                  />
                </div>

                {/* Over-allocation warning */}
                {resource.overAllocated && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">
                          Over-allocated by {Math.round(resource.utilization - 100)}%
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Consider reassigning some tasks or extending deadlines
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Workload Balancing Suggestions */}
      {overAllocatedResources.length > 0 && (
        <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
          <h4 className="font-semibold text-orange-900 mb-3 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Workload Balancing Suggestions</span>
          </h4>
          <div className="space-y-2">
            {overAllocatedResources.map((resource, index) => (
              <div key={resource.user.id} className="text-sm text-orange-800">
                <strong>{index + 1}.</strong> {resource.user.first_name} {resource.user.last_name} is over-allocated. 
                Consider redistributing {resource.tasks.slice(-2).map(t => t.name).join(' or ')}.
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceHistogram;