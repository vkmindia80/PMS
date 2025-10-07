/**
 * Baseline Comparison View Component
 * 
 * Shows:
 * - Planned vs Actual timeline
 * - Progress variance indicators
 * - Milestone tracking
 */

import React, { useMemo } from 'react';
import { DynamicTimelineTask } from '../../services/dynamicTimelineService';
import { History, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

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

interface BaselineComparisonViewProps {
  currentTasks: DynamicTimelineTask[];
  baselineTasks: BaselineTask[];
  onSaveBaseline: () => void;
}

const BaselineComparisonView: React.FC<BaselineComparisonViewProps> = ({
  currentTasks,
  baselineTasks,
  onSaveBaseline
}) => {
  /**
   * Compare baseline with current
   */
  const comparison = useMemo(() => {
    const results = currentTasks.map(task => {
      const baseline = baselineTasks.find(b => b.id === task.id);
      
      if (!baseline) {
        return {
          task,
          baseline: null,
          variance: null,
          status: 'new' as const
        };
      }

      const plannedStart = new Date(baseline.planned_start);
      const actualStart = new Date(task.start_date);
      const plannedEnd = new Date(baseline.planned_end);
      const actualEnd = new Date(task.finish_date);

      const startVariance = (actualStart.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24);
      const endVariance = (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24);
      const durationVariance = task.duration - baseline.planned_duration;

      let status: 'on-track' | 'ahead' | 'behind' = 'on-track';
      if (endVariance > 2) status = 'behind';
      else if (endVariance < -2) status = 'ahead';

      return {
        task,
        baseline,
        variance: {
          start: Math.round(startVariance),
          end: Math.round(endVariance),
          duration: Math.round(durationVariance)
        },
        status
      };
    });

    return results;
  }, [currentTasks, baselineTasks]);

  const onTrackTasks = useMemo(() => comparison.filter(c => c.status === 'on-track'), [comparison]);
  const aheadTasks = useMemo(() => comparison.filter(c => c.status === 'ahead'), [comparison]);
  const behindTasks = useMemo(() => comparison.filter(c => c.status === 'behind'), [comparison]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Baseline Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Baseline Comparison</span>
          </h3>
          <button
            onClick={onSaveBaseline}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-all"
          >
            Save Current as Baseline
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-700">
              {comparison.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Tasks</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-700">
              {aheadTasks.length}
            </div>
            <div className="text-sm text-green-600 mt-1">Ahead of Schedule</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-700">
              {onTrackTasks.length}
            </div>
            <div className="text-sm text-blue-600 mt-1">On Track</div>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border border-red-200">
            <div className="text-3xl font-bold text-red-700">
              {behindTasks.length}
            </div>
            <div className="text-sm text-red-600 mt-1">Behind Schedule</div>
          </div>
        </div>
      </div>

      {/* Tasks Behind Schedule */}
      {behindTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h4 className="font-semibold text-red-900 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>Tasks Behind Schedule</span>
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {behindTasks.map((item) => (
              <div key={item.task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.task.name}</div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Planned:</div>
                        <div className="font-medium text-gray-700">
                          {formatDate(item.baseline!.planned_start)} → {formatDate(item.baseline!.planned_end)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Actual:</div>
                        <div className="font-medium text-gray-700">
                          {formatDate(item.task.start_date)} → {formatDate(item.task.finish_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className={`flex items-center space-x-1 ${getVarianceColor(item.variance!.end)}`}>
                      {item.variance!.end > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-bold text-sm">
                        {item.variance!.end > 0 ? '+' : ''}{item.variance!.end}d
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Ahead of Schedule */}
      {aheadTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h4 className="font-semibold text-green-900 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Tasks Ahead of Schedule</span>
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {aheadTasks.map((item) => (
              <div key={item.task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.task.name}</div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Planned:</div>
                        <div className="font-medium text-gray-700">
                          {formatDate(item.baseline!.planned_start)} → {formatDate(item.baseline!.planned_end)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Actual:</div>
                        <div className="font-medium text-gray-700">
                          {formatDate(item.task.start_date)} → {formatDate(item.task.finish_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className={`flex items-center space-x-1 ${getVarianceColor(item.variance!.end)}`}>
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-bold text-sm">
                        {item.variance!.end}d
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BaselineComparisonView;