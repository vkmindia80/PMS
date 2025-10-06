import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, Users, Target, MoreVertical, Edit2, Trash2, Eye, TrendingUp, 
  ArrowUpRight, Clock, CheckCircle, AlertCircle, Star, Zap, Activity,
  ChevronUp, ChevronDown, Filter
} from 'lucide-react'
import { getBACKEND_URL } from '../../utils/config'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

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

interface AdvancedProjectListProps {
  projects: ProjectSummary[]
  onProjectUpdate: () => void
}

type SortField = 'name' | 'status' | 'priority' | 'progress_percentage' | 'due_date' | 'task_count' | 'team_member_count'
type SortOrder = 'asc' | 'desc'

const AdvancedProjectList: React.FC<AdvancedProjectListProps> = ({
  projects,
  onProjectUpdate,
}) => {
  const navigate = useNavigate()
  const { tokens } = useAuth()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return { display: 'No due date', className: 'text-gray-400' }
    
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return { display: 'Today', className: 'text-orange-600 font-medium' }
    if (diffDays === 1) return { display: 'Tomorrow', className: 'text-yellow-600 font-medium' }
    if (diffDays > 0 && diffDays <= 7) return { display: `${diffDays}d`, className: 'text-blue-600' }
    if (diffDays < 0) return { display: `${Math.abs(diffDays)}d overdue`, className: 'text-red-600 font-semibold' }
    
    return { 
      display: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      className: 'text-gray-600' 
    }
  }

  const isOverdue = (dateString: string | null, status: string) => {
    if (!dateString) return false
    return new Date(dateString) < new Date() && !['completed', 'cancelled', 'archived'].includes(status)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      planning: { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        icon: Clock, 
        dot: 'bg-blue-400' 
      },
      active: { 
        color: 'bg-green-50 text-green-700 border-green-200', 
        icon: Zap, 
        dot: 'bg-green-400 animate-pulse' 
      },
      on_hold: { 
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
        icon: Clock, 
        dot: 'bg-yellow-400' 
      },
      completed: { 
        color: 'bg-gray-50 text-gray-700 border-gray-200', 
        icon: CheckCircle, 
        dot: 'bg-gray-400' 
      },
      cancelled: { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        icon: AlertCircle, 
        dot: 'bg-red-400' 
      },
      archived: { 
        color: 'bg-gray-50 text-gray-500 border-gray-200', 
        icon: Archive, 
        dot: 'bg-gray-300' 
      }
    }
    return configs[status as keyof typeof configs] || configs.planning
  }

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { color: 'text-green-600', bg: 'bg-green-50 border-green-200', intensity: 1 },
      medium: { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', intensity: 2 },
      high: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', intensity: 3 },
      critical: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', intensity: 4 }
    }
    return configs[priority as keyof typeof configs] || configs.medium
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'from-green-400 to-green-600'
    if (progress >= 75) return 'from-blue-400 to-blue-600'
    if (progress >= 50) return 'from-yellow-400 to-yellow-600'
    if (progress >= 25) return 'from-orange-400 to-orange-600'
    return 'from-gray-400 to-gray-500'
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (sortField === 'due_date') {
      aValue = aValue ? new Date(aValue).getTime() : 0
      bValue = bValue ? new Date(bValue).getTime() : 0
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    setLoading(projectId)
    try {
      const response = await fetch(`${getBACKEND_URL()}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update project status')

      toast.success('Project status updated')
      onProjectUpdate()
    } catch (error) {
      toast.error('Failed to update project status')
    } finally {
      setLoading(null)
      setActiveMenu(null)
    }
  }

  const handleArchive = async (projectId: string) => {
    if (window.confirm('Are you sure you want to archive this project?')) {
      setLoading(projectId)
      try {
        const response = await fetch(`${getBACKEND_URL()}/api/projects/${projectId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
          },
        })

        if (!response.ok) throw new Error('Failed to archive project')

        toast.success('Project archived')
        onProjectUpdate()
      } catch (error) {
        toast.error('Failed to archive project')
      } finally {
        setLoading(null)
        setActiveMenu(null)
      }
    }
  }

  const handleSelectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([])
    } else {
      setSelectedProjects(projects.map(p => p.id))
    }
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors group"
    >
      <span>{children}</span>
      <div className="flex flex-col">
        <ChevronUp className={`w-3 h-3 transition-colors ${
          sortField === field && sortOrder === 'asc' ? 'text-primary-600' : 'text-gray-300 group-hover:text-gray-400'
        }`} />
        <ChevronDown className={`w-3 h-3 -mt-1 transition-colors ${
          sortField === field && sortOrder === 'desc' ? 'text-primary-600' : 'text-gray-300 group-hover:text-gray-400'
        }`} />
      </div>
    </button>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" data-testid="projects-list">
      {/* Enhanced Table Header */}
      {selectedProjects.length > 0 && (
        <div className="bg-primary-50 border-b border-primary-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-primary-900">
                {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-primary-700 hover:text-primary-900 transition-colors">
                Bulk Edit
              </button>
              <button className="px-3 py-1 text-sm text-primary-700 hover:text-primary-900 transition-colors">
                Export
              </button>
              <button 
                onClick={() => setSelectedProjects([])}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedProjects.length === projects.length && projects.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-4 text-left min-w-80">
                <SortButton field="name">Project</SortButton>
              </th>
              <th className="px-6 py-4 text-left">
                <SortButton field="status">Status</SortButton>
              </th>
              <th className="px-6 py-4 text-left">
                <SortButton field="priority">Priority</SortButton>
              </th>
              <th className="px-6 py-4 text-left">
                <SortButton field="progress_percentage">Progress</SortButton>
              </th>
              <th className="px-6 py-4 text-left">
                <SortButton field="team_member_count">Team</SortButton>
              </th>
              <th className="px-6 py-4 text-left">
                <SortButton field="due_date">Due Date</SortButton>
              </th>
              <th className="px-6 py-4 text-left">
                <SortButton field="task_count">Tasks</SortButton>
              </th>
              <th className="px-6 py-4 text-left">Budget</th>
              <th className="relative px-6 py-4 w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProjects.map((project, index) => {
              const statusConfig = getStatusConfig(project.status)
              const priorityConfig = getPriorityConfig(project.priority)
              const StatusIcon = statusConfig.icon
              const dateInfo = formatDate(project.due_date)
              const budgetUtilization = project.budget?.total_budget 
                ? (project.budget.spent_amount / project.budget.total_budget) * 100 
                : 0

              return (
                <tr 
                  key={project.id} 
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  } ${selectedProjects.includes(project.id) ? 'bg-primary-25' : ''}`}
                  data-testid={`project-row-${project.id}`}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Selection Checkbox */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleSelectProject(project.id)
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>

                  {/* Project Name & Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-3 h-3 rounded-full ${statusConfig.dot}`}></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate max-w-sm" data-testid="project-name">
                          {project.name}
                        </div>
                        {project.category && (
                          <div className="text-xs text-gray-500 mt-1">
                            {project.category}
                          </div>
                        )}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                #{tag}
                              </span>
                            ))}
                            {project.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{project.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-full border ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{project.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </td>
                  
                  {/* Priority */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${priorityConfig.bg} ${priorityConfig.color}`}>
                      <div className="flex space-x-1 mr-2">
                        {Array.from({ length: priorityConfig.intensity }).map((_, i) => (
                          <div key={i} className="w-1 h-3 bg-current rounded-full opacity-70"></div>
                        ))}
                      </div>
                      <span>{project.priority.toUpperCase()}</span>
                    </div>
                  </td>
                  
                  {/* Progress */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-20 relative overflow-hidden">
                        <div
                          className={`h-2 bg-gradient-to-r ${getProgressColor(project.progress_percentage)} rounded-full transition-all duration-500`}
                          style={{ width: `${project.progress_percentage}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                        {project.progress_percentage}%
                      </span>
                      {project.progress_percentage > 0 && (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </td>
                  
                  {/* Team */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <div className="flex -space-x-1 mr-3">
                        {Array.from({ length: Math.min(project.team_member_count, 3) }).map((_, i) => (
                          <div key={i} className="w-6 h-6 bg-primary-500 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                            {i + 1}
                          </div>
                        ))}
                        {project.team_member_count > 3 && (
                          <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                            +{project.team_member_count - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">{project.team_member_count}</span>
                    </div>
                  </td>
                  
                  {/* Due Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className={dateInfo.className}>
                        {dateInfo.display}
                      </span>
                      {isOverdue(project.due_date, project.status) && (
                        <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
                      )}
                    </div>
                  </td>
                  
                  {/* Tasks */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Target className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium">{project.task_count}</span>
                    </div>
                  </td>

                  {/* Budget */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {project.budget?.total_budget ? (
                      <div className="text-sm">
                        <div className={`font-medium ${budgetUtilization > 90 ? 'text-red-600' : budgetUtilization > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {budgetUtilization.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {project.budget.currency} {project.budget.spent_amount.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenu(activeMenu === project.id ? null : project.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                      data-testid={`project-menu-${project.id}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {activeMenu === project.id && (
                      <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px] animate-in slide-in-from-top-2 duration-200">
                        <div className="p-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/projects/${project.id}`)
                              setActiveMenu(null)
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                            <ArrowUpRight className="w-3 h-3 ml-auto" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Implement edit project
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit Project</span>
                          </button>
                          
                          <div className="border-t border-gray-100 my-2"></div>
                          
                          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Change Status
                          </div>
                          
                          {['planning', 'active', 'on_hold', 'completed'].map(status => (
                            <button
                              key={status}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(project.id, status)
                              }}
                              disabled={loading === project.id}
                              className="w-full px-3 py-1 text-left text-sm hover:bg-gray-50 rounded text-gray-700 disabled:opacity-50"
                            >
                              {status.replace('_', ' ')}
                            </button>
                          ))}
                          
                          <div className="border-t border-gray-100 my-2"></div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchive(project.id)
                            }}
                            disabled={loading === project.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg text-red-600 flex items-center space-x-2 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Archive</span>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {loading === project.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {projects.length === 0 && (
          <div className="text-center py-16">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdvancedProjectList