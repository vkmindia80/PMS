import React from 'react'
import { Clock, Play, Pause, Square, Plus, Timer, TrendingUp, Target } from 'lucide-react'
import { formatHours, formatHoursWithSuffix, formatHoursVariance } from '../../utils/hourFormatter'

interface Task {
  id: string
  title: string
  time_tracking?: {
    estimated_hours?: number
    actual_hours: number
    logged_time?: Array<{
      id: string
      user_id: string
      hours: number
      description: string
      date: string
      created_at: string
    }>
  }
}

interface TimeTrackingTabProps {
  task: Task
  onLogTime: () => void
  timeLogHours: string
  setTimeLogHours: (hours: string) => void
  timeLogDescription: string
  setTimeLogDescription: (description: string) => void
  isTimerRunning: boolean
  timerElapsed: number
  formatTime: (ms: number) => string
}

export const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({
  task,
  onLogTime,
  timeLogHours,
  setTimeLogHours,
  timeLogDescription,
  setTimeLogDescription,
  isTimerRunning,
  timerElapsed,
  formatTime
}) => {
  const getTimeVariance = () => {
    if (!task.time_tracking?.estimated_hours || task.time_tracking.estimated_hours === 0) {
      return { variance: 0, percentage: 0, status: 'no-estimate' }
    }
    
    const variance = (task.time_tracking?.actual_hours || 0) - (task.time_tracking?.estimated_hours || 0)
    const percentage = (variance / task.time_tracking.estimated_hours) * 100
    
    let status = 'good'
    if (percentage > 20) status = 'over'
    else if (percentage > 10) status = 'warning'
    else if (percentage < -10) status = 'under'
    
    return { variance, percentage, status }
  }

  const timeVariance = getTimeVariance()
  
  const getEfficiencyScore = () => {
    if (!task.time_tracking?.estimated_hours) return null
    
    const efficiency = (task.time_tracking.estimated_hours / task.time_tracking.actual_hours) * 100
    
    if (efficiency >= 90) return { score: efficiency, grade: 'A', color: 'text-green-600', bg: 'bg-green-50' }
    if (efficiency >= 80) return { score: efficiency, grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (efficiency >= 70) return { score: efficiency, grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { score: efficiency, grade: 'D', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const efficiency = getEfficiencyScore()

  return (
    <div className="p-6 space-y-6">
      {/* Time Overview Dashboard */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Clock className="h-6 w-6 mr-3 text-blue-600" />
          Time Tracking Overview
        </h3>

        {/* Time Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatHoursWithSuffix(task.time_tracking?.estimated_hours)}
            </div>
            <div className="text-sm text-gray-600">Estimated Time</div>
            <div className="text-xs text-gray-500 mt-1">Original budget</div>
          </div>

          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatHoursWithSuffix(task.time_tracking?.actual_hours)}
            </div>
            <div className="text-sm text-gray-600">Logged Time</div>
            <div className="text-xs text-gray-500 mt-1">
              {task.time_tracking?.logged_time?.length || 0} entries
            </div>
          </div>

          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className={`text-2xl font-bold mb-1 ${
              timeVariance.status === 'over' ? 'text-red-600' :
              timeVariance.status === 'warning' ? 'text-yellow-600' :
              timeVariance.status === 'under' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {timeVariance.status === 'no-estimate' ? 'N/A' : 
               `${timeVariance.variance > 0 ? '+' : ''}${formatHours(timeVariance.variance)}h`
              }
            </div>
            <div className="text-sm text-gray-600">Variance</div>
            <div className="text-xs text-gray-500 mt-1">
              {timeVariance.status === 'no-estimate' ? 'No estimate' :
               timeVariance.status === 'over' ? 'Over budget' :
               timeVariance.status === 'warning' ? 'Close to budget' :
               timeVariance.status === 'under' ? 'Under budget' :
               'On track'
              }
            </div>
          </div>

          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            {efficiency ? (
              <>
                <div className={`text-2xl font-bold mb-1 ${efficiency.color}`}>
                  {efficiency.grade}
                </div>
                <div className="text-sm text-gray-600">Efficiency</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatHours(efficiency.score)}% score
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-400 mb-1">-</div>
                <div className="text-sm text-gray-600">Efficiency</div>
                <div className="text-xs text-gray-500 mt-1">No estimate</div>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {task.time_tracking?.estimated_hours && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Time Progress</span>
              <span className="text-sm text-gray-600">
                {Math.round(((task.time_tracking?.actual_hours || 0) / (task.time_tracking?.estimated_hours || 1)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  timeVariance.status === 'over' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  timeVariance.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                  'bg-gradient-to-r from-blue-500 to-green-600'
                }`}
                style={{ width: `${Math.min(((task.time_tracking?.actual_hours || 0) / (task.time_tracking?.estimated_hours || 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatHoursWithSuffix(task.time_tracking?.actual_hours)} of {formatHoursWithSuffix(task.time_tracking?.estimated_hours)} estimated
            </div>
          </div>
        )}
      </div>

      {/* Active Timer & Log Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Timer className="h-5 w-5 mr-2 text-indigo-600" />
            Active Timer
          </h3>
          
          <div className="text-center mb-6">
            <div className={`text-4xl font-mono font-bold mb-2 ${isTimerRunning ? 'text-green-600' : 'text-gray-400'}`}>
              {formatTime(timerElapsed)}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {isTimerRunning ? 'Timer running...' : 'Ready to start'}
            </div>
            
            {isTimerRunning ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Recording time</span>
              </div>
            ) : (
              <div className="text-sm text-gray-400">Click Start Timer to begin tracking</div>
            )}
          </div>
        </div>

        {/* Manual Time Logging */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-green-600" />
            Log Time Manually
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours Worked
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={timeLogHours}
                onChange={(e) => setTimeLogHours(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 2.5"
              />
              <div className="text-xs text-gray-500 mt-1">
                Use decimals for partial hours (e.g., 1.5 for 1 hour 30 minutes)
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Description
              </label>
              <textarea
                value={timeLogDescription}
                onChange={(e) => setTimeLogDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="What did you work on? (optional)"
              />
            </div>
            
            <button
              onClick={onLogTime}
              disabled={!timeLogHours || parseFloat(timeLogHours) <= 0}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Log Time Entry
            </button>
          </div>
        </div>
      </div>

      {/* Time Entries History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
          Time Entries History
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({task.time_tracking?.logged_time?.length || 0} entries)
          </span>
        </h3>
        
        {task.time_tracking?.logged_time && task.time_tracking.logged_time.length > 0 ? (
          <div className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {task.time_tracking.logged_time.length}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {formatHoursWithSuffix(task.time_tracking.logged_time.reduce((sum, entry) => sum + entry.hours, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {formatHoursWithSuffix(task.time_tracking.logged_time.reduce((sum, entry) => sum + entry.hours, 0) / task.time_tracking.logged_time.length)}
                </div>
                <div className="text-sm text-gray-600">Average Entry</div>
              </div>
            </div>

            {/* Entries List */}
            <div className="max-h-96 overflow-y-auto">
              {task.time_tracking.logged_time
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((entry, index) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {formatHoursWithSuffix(entry.hours)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Entry #{task.time_tracking.logged_time.length - index}
                      </div>
                    </div>
                    
                    {entry.description && (
                      <div className="mt-2 p-3 bg-white rounded border">
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Work Description: </span>
                          {entry.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No time entries yet</h4>
            <p className="text-gray-600 mb-4">
              Start tracking your work by using the timer or logging time manually.
            </p>
            <div className="text-sm text-gray-500">
              💡 Tip: Use the timer for real-time tracking or log completed work manually.
            </div>
          </div>
        )}
      </div>

      {/* Time Analysis & Insights */}
      {task.time_tracking?.logged_time && task.time_tracking.logged_time.length > 3 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-orange-600" />
            Time Analysis & Insights
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Work Pattern Analysis */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3">Work Pattern</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Largest Entry:</span>
                  <span className="font-medium text-blue-900">
                    {Math.max(...task.time_tracking.logged_time.map(e => e.hours)).toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Smallest Entry:</span>
                  <span className="font-medium text-blue-900">
                    {Math.min(...task.time_tracking.logged_time.map(e => e.hours)).toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Most Recent:</span>
                  <span className="font-medium text-blue-900">
                    {task.time_tracking.logged_time[0]?.hours.toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-3">Performance Insights</h4>
              <div className="space-y-2 text-sm">
                {efficiency && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Efficiency Grade:</span>
                    <span className="font-medium text-green-900">{efficiency.grade}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-green-700">Tracking Frequency:</span>
                  <span className="font-medium text-green-900">
                    {task.time_tracking.logged_time.length > 10 ? 'Excellent' :
                     task.time_tracking.logged_time.length > 5 ? 'Good' :
                     'Needs Improvement'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Time Management:</span>
                  <span className="font-medium text-green-900">
                    {timeVariance.status === 'good' ? 'On Track' :
                     timeVariance.status === 'under' ? 'Ahead of Schedule' :
                     timeVariance.status === 'warning' ? 'Monitor Closely' :
                     'Over Budget'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeTrackingTab