import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Users, Target, MoreVertical, Edit2, Trash2, Eye, TrendingUp } from 'lucide-react'
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

interface ProjectListProps {
  projects: ProjectSummary[]
  onProjectUpdate: () => void
  getStatusColor: (status: string) => string
  getPriorityColor: (priority: string) => string
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onProjectUpdate,
  getStatusColor,
  getPriorityColor,
}) => {
  const navigate = useNavigate()
  const { tokens } = useAuth()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }

  const isOverdue = (dateString: string | null, status: string) => {
    if (!dateString) return false
    return new Date(dateString) < new Date() && !['completed', 'cancelled', 'archived'].includes(status)
  }

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    setLoading(projectId)
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
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
      setLoading(null)
      setActiveMenu(null)
    }
  }

  const handleArchive = async (projectId: string) => {
    if (window.confirm('Are you sure you want to archive this project?')) {
      setLoading(projectId)
      try {
        const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
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
        setLoading(null)
        setActiveMenu(null)
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" data-testid="projects-list">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasks
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50" data-testid={`project-row-${project.id}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900" data-testid="project-name">
                    {project.name}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`} data-testid="project-status">
                    {project.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`} data-testid="project-priority">
                    {project.priority.toUpperCase()}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3" style={{ width: '80px' }}>
                      <div
                        className={`h-2 rounded-full ${getProgressColor(project.progress_percentage)}`}
                        style={{ width: `${project.progress_percentage}%` }}
                        data-testid="progress-bar"
                      />
                    </div>
                    <span className="text-sm text-gray-900 font-medium" data-testid="progress-percentage">
                      {project.progress_percentage}%
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Users className="w-4 h-4 text-gray-400 mr-1" />
                    <span data-testid="team-count">{project.team_member_count}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    <span className={`${
                      isOverdue(project.due_date, project.status) 
                        ? 'text-red-600 font-medium' 
                        : 'text-gray-900'
                    }`} data-testid="due-date">
                      {formatDate(project.due_date)}
                    </span>
                    {isOverdue(project.due_date, project.status) && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded" data-testid="overdue-badge">
                        Overdue
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Target className="w-4 h-4 text-gray-400 mr-1" />
                    <span data-testid="task-count">{project.task_count}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === project.id ? null : project.id)}
                    className="text-gray-400 hover:text-gray-600"
                    data-testid={`project-menu-${project.id}`}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {activeMenu === project.id && (
                    <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                      <button
                        onClick={() => {
                          navigate(`/projects/${project.id}`)
                          setActiveMenu(null)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                        data-testid="view-project-btn"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={() => {/* TODO: Implement edit project */}}
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
                            onClick={() => handleStatusChange(project.id, status)}
                            disabled={loading === project.id}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                            data-testid={`change-status-${status}`}
                          >
                            {status.replace('_', ' ').toUpperCase()}
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => handleArchive(project.id)}
                          disabled={loading === project.id}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2 disabled:opacity-50"
                          data-testid="archive-project-btn"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Archive</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {loading === project.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {projects.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectList