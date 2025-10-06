import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, Users, MoreVertical, Edit2, Trash2, Eye, Target, 
  TrendingUp, Clock, CheckCircle, AlertCircle, ArrowRight, Zap,
  Activity, FileText, Archive
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

interface AdvancedProjectCardProps {
  project: ProjectSummary
  onProjectUpdate: () => void
}

const AdvancedProjectCard: React.FC<AdvancedProjectCardProps> = ({
  project,
  onProjectUpdate,
}) => {
  const navigate = useNavigate()
  const { tokens } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays > 0 && diffDays <= 7) return `Due in ${diffDays} days`
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false
    return new Date(dateString) < new Date() && !['completed', 'cancelled', 'archived'].includes(project.status)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      planning: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FileText, pulse: false },
      active: { color: 'bg-green-100 text-green-800 border-green-200', icon: Zap, pulse: true },
      on_hold: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, pulse: false },
      completed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle, pulse: false },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, pulse: false },
      archived: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: Archive, pulse: false }
    }
    return configs[status as keyof typeof configs] || configs.planning
  }

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      medium: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      high: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
      critical: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
    }
    return configs[priority as keyof typeof configs] || configs.medium
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'from-green-400 to-green-600'
    if (progress >= 75) return 'from-blue-400 to-blue-600'
    if (progress >= 50) return 'from-yellow-400 to-yellow-600'
    if (progress >= 25) return 'from-orange-400 to-orange-600'
    return 'from-gray-400 to-gray-600'
  }

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${getBACKEND_URL()}/api/projects/${project.id}`, {
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
      setLoading(false)
      setShowMenu(false)
    }
  }

  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this project?')) {
      setLoading(true)
      try {
        const response = await fetch(`${getBACKEND_URL()}/api/projects/${project.id}`, {
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
        setLoading(false)
        setShowMenu(false)
      }
    }
  }

  const statusConfig = getStatusConfig(project.status)
  const priorityConfig = getPriorityConfig(project.priority)
  const StatusIcon = statusConfig.icon

  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
        isHovered ? 'ring-2 ring-primary-500 ring-opacity-20' : ''
      }`}
      data-testid={`project-card-${project.id}`}
      onClick={() => navigate(`/projects/${project.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate mb-2" data-testid="project-name">
                  {project.name}
                </h3>
                
                <div className="flex items-center space-x-2">
                  {/* Status Badge */}
                  <div className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full border ${statusConfig.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.pulse && <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>}
                    <span>{project.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  
                  {/* Priority Badge */}
                  <div className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border}`}>
                    {project.priority.toUpperCase()}
                  </div>
                </div>
              </div>
              
              {/* Actions Menu */}
              <div className="relative ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  data-testid="project-menu-btn"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                
                {showMenu && (
                  <div 
                    className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px] animate-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/projects/${project.id}`)
                          setShowMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
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
                            handleStatusChange(status)
                          }}
                          className="w-full px-3 py-1 text-left text-sm hover:bg-gray-50 rounded text-gray-700"
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                      
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleArchive()
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-lg text-red-600 flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category & Tags */}
        {(project.category || (project.tags && project.tags.length > 0)) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {project.category && (
              <span className="px-2 py-1 bg-white bg-opacity-70 text-gray-600 text-xs rounded-lg border border-gray-200">
                {project.category}
              </span>
            )}
            {project.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-lg border border-primary-200">
                #{tag}
              </span>
            ))}
            {project.tags && project.tags.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">
                +{project.tags.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className="p-6">
        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900">{project.progress_percentage}%</span>
                {project.progress_percentage > 0 && (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 bg-gradient-to-r ${getProgressColor(project.progress_percentage)} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
                  style={{ width: `${project.progress_percentage}%` }}
                >
                  {project.progress_percentage > 10 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900">{project.task_count}</div>
              <div className="text-xs text-gray-600">Tasks</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900">{project.team_member_count}</div>
              <div className="text-xs text-gray-600">Team</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {project.budget?.total_budget ? 
                  `${Math.round((project.budget.spent_amount / project.budget.total_budget) * 100)}%` : 
                  '-'
                }
              </div>
              <div className="text-xs text-gray-600">Budget</div>
            </div>
          </div>

          {/* Due Date & Action */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className={`text-sm ${
                isOverdue(project.due_date) 
                  ? 'text-red-600 font-semibold' 
                  : 'text-gray-600'
              }`}>
                {formatDate(project.due_date)}
              </span>
              {isOverdue(project.due_date) && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full animate-pulse">
                  Overdue
                </span>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/projects/${project.id}`)
              }}
              className={`flex items-center space-x-1 text-sm font-medium transition-all ${
                isHovered 
                  ? 'text-primary-600 transform translate-x-1' 
                  : 'text-gray-500'
              }`}
            >
              <span>View Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-2xl">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Updating...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedProjectCard