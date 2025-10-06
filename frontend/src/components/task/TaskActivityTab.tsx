import React, { useState, useEffect } from 'react'
import { History, User, Clock, Activity, TrendingUp, GitCommit, RefreshCw } from 'lucide-react'
import { getApiUrlDynamic } from '../../utils/config'

interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: string
  details: Record<string, any>
  timestamp: string
}

interface TaskActivityTabProps {
  activities: TaskActivity[]
  loading: boolean
  availableUsers?: any[]
  taskId: string
  onRefresh?: () => void
}

interface ActivityMetrics {
  total_events: number
  time_entries: number
  updates: number
  active_days: number
}

export const TaskActivityTab: React.FC<TaskActivityTabProps> = ({ 
  activities, 
  loading, 
  availableUsers = [],
  taskId,
  onRefresh
}) => {
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    total_events: 0,
    time_entries: 0,
    updates: 0,
    active_days: 0
  })
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Calculate metrics from activities (fallback)
  const calculateMetricsFromActivities = (acts: TaskActivity[]): ActivityMetrics => {
    const timeEntries = acts.filter(a => a.action === 'time_logged').length
    const updateActions = [
      'task_updated', 'status_changed', 'priority_changed', 'assignee_changed', 
      'assignees_changed', 'due_date_changed', 'task_moved', 'dependency_added', 
      'dependency_removed', 'comment_added', 'comment_updated', 'comment_deleted'
    ]
    const updates = acts.filter(a => updateActions.includes(a.action)).length
    
    const dates = new Set(
      acts.map(activity => new Date(activity.timestamp).toDateString())
    )
    
    return {
      total_events: acts.length,
      time_entries: timeEntries,
      updates: updates,
      active_days: dates.size
    }
  }

  // Fetch metrics from backend
  const fetchMetrics = async () => {
    if (!taskId) return
    
    setMetricsLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${getApiUrlDynamic()}/api/tasks/${taskId}/activity/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
      } else {
        // Fallback to calculating from activities
        setMetrics(calculateMetricsFromActivities(activities))
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      // Fallback to calculating from activities
      setMetrics(calculateMetricsFromActivities(activities))
    } finally {
      setMetricsLoading(false)
    }
  }

  // Auto-refresh metrics
  useEffect(() => {
    fetchMetrics()
    
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [taskId, activities, autoRefresh])

  const handleManualRefresh = () => {
    fetchMetrics()
    if (onRefresh) {
      onRefresh()
    }
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity...</p>
        </div>
      </div>
    )
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(activity)
    return groups
  }, {} as Record<string, TaskActivity[]>)

  // Activity type configurations
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'task_created': return { icon: '✨', color: 'text-green-600', bg: 'bg-green-100' }
      case 'status_changed': return { icon: '🔄', color: 'text-blue-600', bg: 'bg-blue-100' }
      case 'task_updated': return { icon: '✏️', color: 'text-yellow-600', bg: 'bg-yellow-100' }
      case 'time_logged': return { icon: '⏰', color: 'text-purple-600', bg: 'bg-purple-100' }
      case 'task_moved': return { icon: '📋', color: 'text-indigo-600', bg: 'bg-indigo-100' }
      case 'comment_added': return { icon: '💬', color: 'text-blue-600', bg: 'bg-blue-100' }
      case 'comment_updated': return { icon: '✏️', color: 'text-yellow-600', bg: 'bg-yellow-100' }
      case 'comment_deleted': return { icon: '🗑️', color: 'text-red-600', bg: 'bg-red-100' }
      case 'assignee_changed': return { icon: '👤', color: 'text-orange-600', bg: 'bg-orange-100' }
      case 'assignees_changed': return { icon: '👥', color: 'text-orange-600', bg: 'bg-orange-100' }
      case 'priority_changed': return { icon: '🚨', color: 'text-red-600', bg: 'bg-red-100' }
      case 'due_date_changed': return { icon: '📅', color: 'text-teal-600', bg: 'bg-teal-100' }
      case 'dependency_added': return { icon: '🔗', color: 'text-cyan-600', bg: 'bg-cyan-100' }
      case 'dependency_removed': return { icon: '🔓', color: 'text-gray-600', bg: 'bg-gray-100' }
      default: return { icon: '📝', color: 'text-gray-600', bg: 'bg-gray-100' }
    }
  }

  const getActivityDescription = (activity: TaskActivity) => {
    const user = availableUsers.find(u => u.id === activity.user_id)
    const userName = user ? `${user.first_name} ${user.last_name}` : 'Someone'

    switch (activity.action) {
      case 'task_created':
        return `${userName} created this task`
      case 'status_changed':
        return `${userName} changed status from "${activity.details.from}" to "${activity.details.to}"`
      case 'task_updated':
        return `${userName} updated the task ${activity.details.fields ? `(${activity.details.fields.join(', ')})` : ''}`
      case 'time_logged':
        return `${userName} logged ${activity.details.hours} hours${activity.details.description ? ` - ${activity.details.description}` : ''}`
      case 'task_moved':
        return `${userName} moved task to "${activity.details.to_status}"`
      case 'comment_added':
        return `${userName} added a comment${activity.details.is_reply ? ' (reply)' : ''}`
      case 'comment_updated':
        return `${userName} updated a comment`
      case 'comment_deleted':
        return `${userName} deleted a comment${activity.details.was_reply ? ' (reply)' : ''}`
      case 'assignee_changed':
        return activity.details.to 
          ? `${userName} assigned task to ${activity.details.to_name || 'someone'}`
          : `${userName} unassigned the task`
      case 'assignees_changed':
        return `${userName} changed task assignees`
      case 'priority_changed':
        return `${userName} changed priority from "${activity.details.from}" to "${activity.details.to}"`
      case 'due_date_changed':
        return activity.details.to 
          ? `${userName} set due date to ${new Date(activity.details.to).toLocaleDateString()}`
          : `${userName} removed due date`
      case 'dependency_added':
        return `${userName} added a task dependency`
      case 'dependency_removed':
        return `${userName} removed a task dependency`
      default:
        return `${userName} ${activity.action.replace(/_/g, ' ')}`
    }
  }

  const getActivityDetails = (activity: TaskActivity) => {
    switch (activity.action) {
      case 'time_logged':
        return activity.details.description ? activity.details.description : null
      case 'task_updated':
        if (activity.details.changes) {
          return Object.entries(activity.details.changes).map(([field, change]: [string, any]) => 
            `${field}: "${change.from}" → "${change.to}"`
          ).join(', ')
        }
        return null
      case 'comment_added':
        return activity.details.content_preview || activity.details.preview || activity.details.content?.substring(0, 100) + '...'
      case 'comment_updated':
        return activity.details.content_preview || `Updated fields: ${activity.details.fields_changed?.join(', ') || 'content'}`
      case 'comment_deleted':
        return activity.details.content_preview || 'Comment was deleted'
      default:
        return null
    }
  }

  return (
    <div className="p-6">
      {/* Activity Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="h-6 w-6 mr-3 text-purple-600" />
            Task Activity Timeline
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center px-3 py-1 rounded-full text-sm ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={metricsLoading}
              className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm border border-blue-200 hover:bg-blue-200 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${metricsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Activity Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100 relative">
            {metricsLoading && (
              <div className="absolute top-1 right-1">
                <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            )}
            <div className="text-2xl font-bold text-purple-600">{metrics.total_events}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100 relative">
            {metricsLoading && (
              <div className="absolute top-1 right-1">
                <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            )}
            <div className="text-2xl font-bold text-blue-600">{metrics.time_entries}</div>
            <div className="text-sm text-gray-600">Time Entries</div>
          </div>
          <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100 relative">
            {metricsLoading && (
              <div className="absolute top-1 right-1">
                <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            )}
            <div className="text-2xl font-bold text-green-600">{metrics.updates}</div>
            <div className="text-sm text-gray-600">Updates</div>
          </div>
          <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100 relative">
            {metricsLoading && (
              <div className="absolute top-1 right-1">
                <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            )}
            <div className="text-2xl font-bold text-orange-600">{metrics.active_days}</div>
            <div className="text-sm text-gray-600">Active Days</div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-6">
        {activities.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No activity recorded</h4>
            <p className="text-gray-600">
              Task activity will appear here as team members interact with the task.
            </p>
          </div>
        ) : (
          Object.entries(groupedActivities)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dayActivities]) => (
              <div key={date} className="relative">
                {/* Date Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-2 mb-4">
                  <div className="flex items-center">
                    <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                        {dayActivities.length} event{dayActivities.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Activity Items */}
                <div className="space-y-4 relative">
                  {/* Timeline Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  {dayActivities
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((activity, index) => {
                      const { icon, color, bg } = getActivityIcon(activity.action)
                      const description = getActivityDescription(activity)
                      const details = getActivityDetails(activity)
                      const user = availableUsers.find(u => u.id === activity.user_id)

                      return (
                        <div key={activity.id} className="relative flex items-start space-x-4">
                          {/* Timeline Node */}
                          <div className={`flex-shrink-0 w-12 h-12 ${bg} rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm`}>
                            <span className="text-lg">{icon}</span>
                          </div>

                          {/* Activity Content */}
                          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  {user && (
                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                      <User className="h-3 w-3 text-gray-600" />
                                    </div>
                                  )}
                                  <span className="text-sm font-medium text-gray-900">
                                    {description}
                                  </span>
                                </div>
                                
                                {details && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded border text-sm text-gray-700">
                                    {details}
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-500 ml-4">
                                {new Date(activity.timestamp).toLocaleTimeString()}
                              </div>
                            </div>

                            {/* Activity Metadata */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <GitCommit className="h-3 w-3" />
                                <span>Event ID: {activity.id.substring(0, 8)}</span>
                              </div>
                              
                              {/* Action Type Badge */}
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                activity.action === 'task_created' ? 'bg-green-100 text-green-800' :
                                activity.action === 'status_changed' ? 'bg-blue-100 text-blue-800' :
                                activity.action === 'time_logged' ? 'bg-purple-100 text-purple-800' :
                                activity.action === 'task_updated' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.action.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Activity Insights */}
      {activities.length > 5 && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
            Activity Insights
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Most Active User */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <h5 className="font-medium text-indigo-900 mb-3">Most Active Contributor</h5>
              {(() => {
                const userActivityCount = activities.reduce((acc, activity) => {
                  acc[activity.user_id] = (acc[activity.user_id] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
                
                const mostActiveUserId = Object.entries(userActivityCount)
                  .sort(([,a], [,b]) => b - a)[0]?.[0]
                
                const mostActiveUser = availableUsers.find(u => u.id === mostActiveUserId)
                const activityCount = userActivityCount[mostActiveUserId] || 0
                
                return mostActiveUser ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-indigo-900">
                        {mostActiveUser.first_name} {mostActiveUser.last_name}
                      </div>
                      <div className="text-sm text-indigo-700">
                        {activityCount} activities
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-indigo-700">No activity data available</div>
                )
              })()}
            </div>

            {/* Recent Activity Pattern */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-medium text-green-900 mb-3">Recent Activity Pattern</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Last 7 days:</span>
                  <span className="font-medium text-green-900">
                    {activities.filter(a => 
                      new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length} events
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Most common action:</span>
                  <span className="font-medium text-green-900">
                    {(() => {
                      const actionCounts = activities.reduce((acc, activity) => {
                        acc[activity.action] = (acc[activity.action] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                      
                      const mostCommonAction = Object.entries(actionCounts)
                        .sort(([,a], [,b]) => b - a)[0]?.[0]
                      
                      return mostCommonAction?.replace(/_/g, ' ') || 'N/A'
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Activity trend:</span>
                  <span className="font-medium text-green-900">
                    {activities.length > 10 ? 'Very Active' : 
                     activities.length > 5 ? 'Active' : 
                     'Getting Started'}
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

export default TaskActivityTab