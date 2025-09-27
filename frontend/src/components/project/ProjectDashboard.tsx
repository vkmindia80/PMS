import React from 'react'
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Target, Clock, AlertCircle } from 'lucide-react'

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
}

interface ProjectStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  overdue_projects: number
  total_budget: number
  spent_budget: number
}

interface ProjectDashboardProps {
  projects: ProjectSummary[]
  stats: ProjectStats
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projects, stats }) => {
  // Calculate additional metrics
  const completionRate = stats.total_projects > 0 ? (stats.completed_projects / stats.total_projects * 100) : 0
  const activeRate = stats.total_projects > 0 ? (stats.active_projects / stats.total_projects * 100) : 0
  
  // Status distribution
  const statusDistribution = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Priority distribution
  const priorityDistribution = projects.reduce((acc, project) => {
    acc[project.priority] = (acc[project.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Recent projects (latest 5)
  const recentProjects = projects.slice(0, 5)

  // Overdue projects
  const overdueProjects = projects.filter(p => {
    if (!p.due_date) return false
    return new Date(p.due_date) < new Date() && !['completed', 'cancelled', 'archived'].includes(p.status)
  })

  // High priority projects
  const highPriorityProjects = projects.filter(p => ['high', 'critical'].includes(p.priority))

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-500'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    }
    return colors[priority as keyof typeof colors] || 'text-gray-600'
  }

  return (
    <div className="space-y-6" data-testid="project-dashboard">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600" data-testid="completion-rate">
                {completionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.completed_projects} of {stats.total_projects} projects
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Rate</p>
              <p className="text-3xl font-bold text-blue-600" data-testid="active-rate">
                {activeRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.active_projects} active projects
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Projects</p>
              <p className="text-3xl font-bold text-red-600" data-testid="overdue-count">
                {stats.overdue_projects}
              </p>
              <p className="text-xs text-gray-500 mt-1">Need attention</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-orange-600" data-testid="high-priority-count">
                {highPriorityProjects.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Critical & high priority</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Distribution</h3>
          <div className="space-y-4">
            {Object.entries(statusDistribution).map(([status, count]) => {
              const percentage = (count / projects.length * 100) || 0
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(status)}`}>
                      {status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">{count} projects</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="space-y-4">
            {Object.entries(priorityDistribution).map(([priority, count]) => {
              const percentage = (count / projects.length * 100) || 0
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${getPriorityColor(priority)}`}>
                      {priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">{count} projects</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Project Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Projects */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Overdue Projects</h3>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-3">
            {overdueProjects.length > 0 ? (
              overdueProjects.slice(0, 5).map(project => (
                <div key={project.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          Due: {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'No date'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{project.progress_percentage}%</div>
                      <div className="text-xs text-gray-500">{project.task_count} tasks</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No overdue projects</p>
              </div>
            )}
          </div>
        </div>

        {/* High Priority Projects */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">High Priority Projects</h3>
            <Target className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-3">
            {highPriorityProjects.length > 0 ? (
              highPriorityProjects.slice(0, 5).map(project => (
                <div key={project.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{project.progress_percentage}%</div>
                      <div className="text-xs text-gray-500">
                        <Users className="w-3 h-3 inline mr-1" />
                        {project.team_member_count}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No high priority projects</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-sm font-medium text-gray-600">Project</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Priority</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Progress</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Team</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map(project => (
                <tr key={project.id} className="border-b border-gray-100">
                  <td className="py-3 text-sm font-medium text-gray-900">{project.name}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${project.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{project.progress_percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    <Users className="w-4 h-4 inline mr-1" />
                    {project.team_member_count}
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'No date'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {recentProjects.length === 0 && (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No projects to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectDashboard