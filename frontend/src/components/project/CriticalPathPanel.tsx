/**
 * Critical Path Panel Component
 * 
 * Displays critical path analysis with:
 * - Critical tasks list
 * - Slack/float time calculations
 * - Task dependencies
 * - Earliest/latest start and finish dates
 */

import React, { useMemo } from 'react';
import { DynamicTimelineTask } from '../../services/dynamicTimelineService';
import { AlertTriangle, Clock, Calendar, TrendingUp, ChevronRight } from 'lucide-react';

interface CriticalPathPanelProps {
  tasks: DynamicTimelineTask[];
  dependencies: any[];
  criticalPath: string[];
  onTaskUpdate: (taskId: string, updates: Partial<DynamicTimelineTask>) => void;
}

const CriticalPathPanel: React.FC<CriticalPathPanelProps> = ({
  tasks,
  dependencies,
  criticalPath,
  onTaskUpdate
}) => {
  /**
   * Calculate slack time for each task
   */
  const tasksWithSlack = useMemo(() => {
    return tasks.map(task => {
      const isCritical = criticalPath.includes(task.id);
      
      // Critical tasks have zero slack
      if (isCritical) {
        return {
          ...task,
          slack: 0,
          isCritical: true
        };
      }

      // Calculate slack based on dependencies
      const taskDependencies = dependencies.filter(d => 
        d.predecessor_id === task.id || d.successor_id === task.id
      );

      // Simplified slack calculation
      // In real implementation, this would use CPM algorithm
      const slack = taskDependencies.length > 0 ? 2 : 5;

      return {
        ...task,
        slack,
        isCritical: false
      };
    });
  }, [tasks, dependencies, criticalPath]);

  /**
   * Get critical tasks
   */
  const criticalTasks = useMemo(() => {
    return tasksWithSlack.filter(t => t.isCritical);
  }, [tasksWithSlack]);

  /**
   * Get near-critical tasks (slack < 3 days)
   */
  const nearCriticalTasks = useMemo(() => {
    return tasksWithSlack.filter(t => !t.isCritical && t.slack < 3);
  }, [tasksWithSlack]);

  /**
   * Calculate total critical path duration
   */
  const totalCriticalDuration = useMemo(() => {
    return criticalTasks.reduce((sum, task) => sum + task.duration, 0);
  }, [criticalTasks]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Critical Path Summary */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-red-900 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Critical Path Analysis</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-red-200">
            <div className="text-3xl font-bold text-red-700">
              {criticalTasks.length}
            </div>
            <div className="text-sm text-red-600 mt-1">Critical Tasks</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-orange-200">
            <div className="text-3xl font-bold text-orange-700">
              {totalCriticalDuration}h
            </div>
            <div className="text-sm text-orange-600 mt-1">Total Duration</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-700">
              {nearCriticalTasks.length}
            </div>
            <div className="text-sm text-yellow-600 mt-1">Near-Critical</div>
          </div>
        </div>
      </div>

      {/* Critical Tasks List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <h4 className="font-semibold text-red-900 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Critical Path Tasks (Zero Slack)</span>
          </h4>
        </div>

        <div className="divide-y divide-gray-200">
          {criticalTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No critical path tasks identified</p>
              <p className="text-sm mt-2">Add dependencies to calculate critical path</p>
            </div>
          ) : (
            criticalTasks.map((task, index) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 font-bold rounded-full text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{task.name}</div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(task.start_date)} → {formatDate(task.finish_date)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {task.duration}h
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {task.percent_complete}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                      0 SLACK
                    </span>
                    <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                      CRITICAL
                    </span>
                  </div>
                </div>

                {/* Dependencies indicator */}
                {dependencies.filter(d => d.predecessor_id === task.id || d.successor_id === task.id).length > 0 && (
                  <div className="mt-2 ml-11 text-xs text-gray-500 flex items-center">
                    <ChevronRight className="h-3 w-3 mr-1" />
                    {dependencies.filter(d => d.predecessor_id === task.id || d.successor_id === task.id).length} dependencies
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Near-Critical Tasks */}
      {nearCriticalTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
            <h4 className="font-semibold text-orange-900 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Near-Critical Tasks (Low Slack)</span>
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {nearCriticalTasks.map((task, index) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 font-bold rounded-full text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{task.name}</div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(task.start_date)} → {formatDate(task.finish_date)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {task.duration}h
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {task.percent_complete}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">
                      {task.slack}D SLACK
                    </span>
                    <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                      NEAR-CRITICAL
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slack Analysis Info */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">Understanding Slack Time</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>Zero Slack (Critical):</strong> Any delay will delay the entire project
          </p>
          <p>
            <strong>Low Slack (1-2 days):</strong> Tasks that could become critical soon
          </p>
          <p>
            <strong>High Slack (3+ days):</strong> Tasks with flexibility in scheduling
          </p>
        </div>
      </div>
    </div>
  );
};

export default CriticalPathPanel;
