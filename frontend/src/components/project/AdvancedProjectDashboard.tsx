import React from 'react'
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Users, 
  DollarSign, Target, Calendar, Activity, BarChart3, PieChart, 
  ArrowUp, ArrowDown, Zap, Eye, ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ProjectSummary {
  id: string
  name: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  progress_percentage: number
  due_date: string | null
  owner_id: string
  task_count: number
  team_member_count: number
  category?: string
  tags?: string[]
  budget?: {
    total_budget: number | null
    spent_amount: number
    currency: string
  }
}

interface ProjectStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  overdue_projects: number
  total_budget: number
  spent_budget: number
  progress_trend: number
  completion_rate: number
}

interface AdvancedProjectDashboardProps {
  projects: ProjectSummary[]
  stats: ProjectStats
}

const AdvancedProjectDashboard: React.FC<AdvancedProjectDashboardProps> = ({
  projects,
  stats
}) => {
  const navigate = useNavigate()

  // Calculate additional insights
  const priorityDistribution = projects.reduce((acc, project) => {
    acc[project.priority] = (acc[project.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusDistribution = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const recentProjects = projects
    .filter(p => p.status !== 'archived')
    .sort((a, b) => new Date(b.due_date || '').getTime() - new Date(a.due_date || '').getTime())
    .slice(0, 5)

  const upcomingDeadlines = projects
    .filter(p => p.due_date && p.status !== 'completed' && p.status !== 'cancelled')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5)

  const averageProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress_percentage, 0) / projects.length)
    : 0

  const teamUtilization = projects.reduce((sum, p) => sum + p.team_member_count, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'text-blue-600 bg-blue-50',
      active: 'text-green-600 bg-green-50',
      on_hold: 'text-yellow-600 bg-yellow-50',
      completed: 'text-gray-600 bg-gray-50',
      cancelled: 'text-red-600 bg-red-50',
      archived: 'text-gray-500 bg-gray-50'
    }
    return colors[status as keyof typeof colors] || colors.planning
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  return (
    <div className="space-y-8" data-testid="projects-dashboard">
      {/* Enhanced Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Portfolio Health Score */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{averageProgress}%</div>
              <div className="text-blue-100 text-sm">Portfolio Health</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {stats.progress_trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-300" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-300" />
            )}
            <span className="text-sm text-blue-100">
              {Math.abs(stats.progress_trend).toFixed(1)}% vs last month
            </span>
          </div>
        </div>

        {/* Active Velocity */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{stats.active_projects}</div>
              <div className="text-green-100 text-sm">Active Projects</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-100">High Velocity</span>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{stats.completion_rate.toFixed(0)}%</div>
              <div className="text-purple-100 text-sm">Success Rate</div>
            </div>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500" 
              style={{ width: `${stats.completion_rate}%` }}
            ></div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{stats.overdue_projects}</div>
              <div className="text-orange-100 text-sm">At Risk</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-100">
              {stats.overdue_projects > 0 ? 'Needs Attention' : 'All Clear'}
            </span>
            {stats.overdue_projects > 0 && (
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            )}
          </div>
        </div>
      </div>

      {/* Charts and Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Project Status Distribution</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {Object.entries(statusDistribution).map(([status, count]) => {
              const percentage = (count / projects.length) * 100
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status).split(' ')[1]}`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getStatusColor(status).split(' ')[1]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Priority Distribution</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {['critical', 'high', 'medium', 'low'].map(priority => {
              const count = priorityDistribution[priority] || 0
              const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority).replace('text-', 'bg-')}`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">{priority}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getPriorityColor(priority).replace('text-', 'bg-')}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentProjects.map(project => (
              <div 
                key={project.id} 
                className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(project.status)}`}>
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{project.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{project.progress_percentage}% complete</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            ))}
            {recentProjects.length === 0 && (
              <p className="text-gray-500 text-center py-8">No recent projects</p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {upcomingDeadlines.map(project => {
              const daysUntilDue = project.due_date 
                ? Math.ceil((new Date(project.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0
              const isUrgent = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0

              return (
                <div 
                  key={project.id} 
                  className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isOverdue ? 'bg-red-100 text-red-600' : 
                    isUrgent ? 'bg-yellow-100 text-yellow-600' : 
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{project.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs font-medium ${
                        isOverdue ? 'text-red-600' : 
                        isUrgent ? 'text-yellow-600' : 
                        'text-gray-600'
                      }`}>
                        {daysUntilDue !== null ? (
                          isOverdue ? `${Math.abs(daysUntilDue)} days overdue` :
                          daysUntilDue === 0 ? 'Due today' :
                          daysUntilDue === 1 ? 'Due tomorrow' :
                          `${daysUntilDue} days left`
                        ) : 'No due date'}
                      </span>
                      <span className={`text-xs ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                    </div>
                  </div>
                  {isOverdue ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : isUrgent ? (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              )
            })}
            {upcomingDeadlines.length === 0 && (
              <p className="text-gray-500 text-center py-8">No upcoming deadlines</p>
            )}
          </div>
        </div>
      </div>

      {/* Resource Utilization */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Resource Overview</h3>
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Team Utilization */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
              {teamUtilization}
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Total Team Members</h4>
            <p className="text-xs text-gray-600">Across all active projects</p>
          </div>

          {/* Budget Utilization */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-lg font-bold mb-4">
              {stats.total_budget > 0 ? `${Math.round((stats.spent_budget / stats.total_budget) * 100)}%` : '0%'}
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Budget Used</h4>
            <p className="text-xs text-gray-600">
              {formatCurrency(stats.spent_budget)} of {formatCurrency(stats.total_budget)}
            </p>
          </div>

          {/* Average Progress */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-lg font-bold mb-4">
              {averageProgress}%
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Average Progress</h4>
            <p className="text-xs text-gray-600">Portfolio completion rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedProjectDashboard