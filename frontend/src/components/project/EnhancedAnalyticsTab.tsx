import React, { useState, useMemo } from 'react'
import { 
  TrendingUp, TrendingDown, BarChart3, PieChart, LineChart, 
  Users, Clock, Target, DollarSign, Calendar, Activity,
  ArrowUp, ArrowDown, AlertCircle, CheckCircle, Download,
  Filter, RefreshCw, Eye, Zap
} from 'lucide-react'

interface Task {
  id: string
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  due_date: string | null
  assigned_to: string[]
  estimated_hours?: number
  actual_hours?: number
}

interface EnhancedAnalyticsTabProps {
  project: any
  tasks: Task[]
  users: any[]
  budgetUtilization: number
}

const EnhancedAnalyticsTab: React.FC<EnhancedAnalyticsTabProps> = ({
  project,
  tasks,
  users,
  budgetUtilization
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [chartType, setChartType] = useState<'overview' | 'performance' | 'team' | 'budget'>('overview')

  // Calculate analytics data
  const analytics = useMemo(() => {
    const now = new Date()
    const tasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const tasksByPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Team performance metrics - only include team members
    const teamMemberIds = project.team_members || []
    const teamMembers = users.filter(user => teamMemberIds.includes(user.id))
    
    const teamPerformance = teamMembers.map(user => {
      const userTasks = tasks.filter(task => task.assigned_to && task.assigned_to.includes(user.id))
      const completedTasks = userTasks.filter(task => task.status === 'completed')
      const overdueTasks = userTasks.filter(task => 
        task.due_date && new Date(task.due_date) < now && task.status !== 'completed'
      )
      
      // Calculate efficiency based on completion rate and time performance
      const completionRate = userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0
      const overdueRate = userTasks.length > 0 ? (overdueTasks.length / userTasks.length) * 100 : 0
      const efficiency = Math.max(0, Math.min(100, completionRate - overdueRate + 50))
      
      // Calculate workload based on active tasks
      const activeTasks = userTasks.filter(task => ['in_progress', 'review'].includes(task.status))
      const workload = Math.min(100, activeTasks.length * 15) // Assume 15% per active task
      
      return {
        user,
        totalTasks: userTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate,
        efficiency,
        workload
      }
    })

    // Time-based metrics
    const daysInRange = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysInRange)

    const dailyProgress = Array.from({ length: daysInRange }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      // Mock progress data - in real app, this would come from actual task completion data
      const baseProgress = (i / daysInRange) * project.progress_percentage
      const variance = (Math.random() - 0.5) * 10
      const progress = Math.max(0, Math.min(100, baseProgress + variance))
      
      return {
        date: date.toISOString().split('T')[0],
        progress,
        tasksCompleted: Math.floor(Math.random() * 5) + 1,
        velocity: Math.random() * 3 + 1
      }
    })

    const totalEstimated = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0)
    const totalActual = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0)

    return {
      tasksByStatus,
      tasksByPriority,
      teamPerformance,
      dailyProgress,
      totalEstimated,
      totalActual,
      velocityTrend: Math.random() > 0.5 ? 'up' : 'down',
      velocityChange: Math.random() * 20 + 5,
      burndownData: dailyProgress.map(day => ({
        date: day.date,
        planned: Math.max(0, totalEstimated - (day.progress / 100) * totalEstimated),
        actual: Math.max(0, totalEstimated - totalActual * (day.progress / 100))
      }))
    }
  }, [tasks, users, project.progress_percentage, timeRange])

  const MetricCard: React.FC<{
    title: string
    value: string | number
    change?: number
    trend?: 'up' | 'down' | 'neutral'
    icon: React.ElementType
    color: string
  }> = ({ title, value, change, trend, icon: Icon, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : 
             trend === 'down' ? <ArrowDown className="w-4 h-4" /> : null}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  )

  const StatusChart: React.FC = () => {
    const total = Object.values(analytics.tasksByStatus).reduce((sum, count) => sum + count, 0)
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Task Distribution</h3>
          <PieChart className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          {Object.entries(analytics.tasksByStatus).map(([status, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0
            const colors = {
              todo: 'bg-gray-400',
              in_progress: 'bg-blue-500',
              review: 'bg-purple-500',
              completed: 'bg-green-500',
              blocked: 'bg-red-500'
            }
            
            return (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${colors[status as keyof typeof colors]}`} />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[status as keyof typeof colors]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const ProgressChart: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Progress Trend</h3>
        <div className="flex items-center space-x-2">
          <LineChart className="w-5 h-5 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>
      
      {/* Simplified progress chart representation */}
      <div className="space-y-2">
        {analytics.dailyProgress.slice(-7).map((day, index) => (
          <div key={day.date} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <div className="flex-1 mx-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                  style={{ width: `${day.progress}%` }}
                />
              </div>
            </div>
            <span className="font-medium text-gray-900">{day.progress.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )

  const TeamPerformanceChart: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
        <Users className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {analytics.teamPerformance.map(member => (
          <div key={member.user.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
              {member.user.name?.charAt(0) || '?'}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{member.user.name}</h4>
                <span className="text-sm text-gray-600">{member.completionRate.toFixed(0)}% completion</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Tasks</div>
                  <div className="font-medium">{member.totalTasks}</div>
                </div>
                <div>
                  <div className="text-gray-500">Completed</div>
                  <div className="font-medium text-green-600">{member.completedTasks}</div>
                </div>
                <div>
                  <div className="text-gray-500">Overdue</div>
                  <div className="font-medium text-red-600">{member.overdueTasks}</div>
                </div>
              </div>
              
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Efficiency</span>
                  <span>{member.efficiency.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${member.efficiency}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const BudgetAnalysis: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Budget Analysis</h3>
        <DollarSign className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            ${project.budget?.total_budget?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Total Budget</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 mb-1">
            ${project.budget?.spent_amount?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Spent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            ${((project.budget?.total_budget || 0) - (project.budget?.spent_amount || 0)).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Budget Utilization</span>
            <span>{budgetUtilization.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                budgetUtilization > 90 ? 'bg-red-500' : 
                budgetUtilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <div className="text-sm text-gray-500 mb-1">Burn Rate</div>
            <div className="text-lg font-semibold text-gray-900">
              ${Math.floor((project.budget?.spent_amount || 0) / 30).toLocaleString()}/day
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Est. Completion</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.floor((100 - project.progress_percentage) / 2)} days
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Analytics</h2>
          <p className="text-gray-600 mt-1">Insights and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="overview">Overview</option>
            <option value="performance">Performance</option>
            <option value="team">Team</option>
            <option value="budget">Budget</option>
          </select>
          
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Project Velocity"
          value={`${analytics.velocityChange.toFixed(1)} pts/sprint`}
          change={analytics.velocityChange}
          trend={analytics.velocityTrend}
          icon={Zap}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        
        <MetricCard
          title="Team Efficiency"
          value={`${(analytics.teamPerformance.reduce((sum, m) => sum + m.efficiency, 0) / analytics.teamPerformance.length || 0).toFixed(0)}%`}
          change={12.5}
          trend="up"
          icon={TrendingUp}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        
        <MetricCard
          title="Budget Health"
          value={`${(100 - budgetUtilization).toFixed(0)}%`}
          change={budgetUtilization > 80 ? -15 : 8}
          trend={budgetUtilization > 80 ? 'down' : 'up'}
          icon={DollarSign}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        
        <MetricCard
          title="Risk Score"
          value={analytics.tasksByStatus.blocked || 0}
          change={-5.2}
          trend="down"
          icon={AlertCircle}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart />
        <ProgressChart />
      </div>

      {chartType === 'team' && (
        <TeamPerformanceChart />
      )}

      {chartType === 'budget' && (
        <BudgetAnalysis />
      )}

      {/* Time Tracking Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Time Tracking Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {analytics.totalEstimated}h
            </div>
            <div className="text-sm text-gray-600">Estimated Hours</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {analytics.totalActual}h
            </div>
            <div className="text-sm text-gray-600">Actual Hours</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600 mb-1">
              {analytics.totalEstimated > 0 ? ((analytics.totalActual / analytics.totalEstimated) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights & Recommendations</h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">Project is on track</div>
              <div className="text-sm text-blue-700">
                Current progress ({project.progress_percentage}%) aligns well with timeline expectations.
              </div>
            </div>
          </div>
          
          {budgetUtilization > 80 && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-900">Budget attention needed</div>
                <div className="text-sm text-yellow-700">
                  Current budget utilization ({budgetUtilization.toFixed(1)}%) suggests careful monitoring is required.
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-medium text-green-900">Team performance is strong</div>
              <div className="text-sm text-green-700">
                Average team completion rate is above expectations. Consider recognizing top performers.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedAnalyticsTab