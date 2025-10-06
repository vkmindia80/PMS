import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Users, DollarSign, MoreVertical, Edit2, Trash2, Eye, Target, TrendingUp } from 'lucide-react'
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
}

interface ProjectCardProps {
  project: ProjectSummary
  onProjectUpdate: () => void
  getStatusColor: (status: string) => string
  getPriorityColor: (priority: string) => string
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onProjectUpdate,
  getStatusColor,
  getPriorityColor,
}) => {
  const navigate = useNavigate()
  const { tokens } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false
    return new Date(dateString) < new Date() && !['completed', 'cancelled', 'archived'].includes(project.status)
  }

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project status')
      }

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
        const response = await fetch(`${BACKEND_URL}/api/projects/${project.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to archive project')
        }

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

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative cursor-pointer" 
      data-testid={`project-card-${project.id}`}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 truncate" data-testid="project-name">
            {project.name}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`} data-testid="project-status">
              {project.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`} data-testid="project-priority">
              {project.priority.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 hover:bg-gray-100 rounded"
            data-testid="project-menu-btn"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
          
          {showMenu && (
            <div 
              className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/projects/${project.id}`)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                data-testid="view-project-btn"
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  /* TODO: Implement edit project */
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                data-testid="edit-project-btn"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Project</span>
              </button>
              
              <div className="border-t border-gray-100">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Change Status
                </div>
                {['planning', 'active', 'on_hold', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(status)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    data-testid={`change-status-${status}`}
                  >
                    {status.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
              
              <div className="border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleArchive()
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                  data-testid="archive-project-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Archive</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium" data-testid="progress-percentage">{project.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${getProgressColor(project.progress_percentage)} transition-all duration-300`}
            style={{ width: `${project.progress_percentage}%` }}
            data-testid="progress-bar"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <Target className="w-4 h-4" />
          </div>
          <div className="text-lg font-semibold text-gray-900" data-testid="task-count">{project.task_count}</div>
          <div className="text-xs text-gray-600">Tasks</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-lg font-semibold text-gray-900" data-testid="team-count">{project.team_member_count}</div>
          <div className="text-xs text-gray-600">Team</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-lg font-semibold text-gray-900">-</div>
          <div className="text-xs text-gray-600">Budget</div>
        </div>
      </div>

      {/* Due Date */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className={`${isOverdue(project.due_date) ? 'text-red-600 font-medium' : 'text-gray-600'}`} data-testid="due-date">
            {formatDate(project.due_date)}
          </span>
          {isOverdue(project.due_date) && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded" data-testid="overdue-badge">
              Overdue
            </span>
          )}
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  )
}

export default ProjectCard