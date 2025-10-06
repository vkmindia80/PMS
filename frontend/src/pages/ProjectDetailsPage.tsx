import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Edit2, Trash2, Calendar, Users, DollarSign, Target, 
  TrendingUp, Clock, CheckCircle, AlertCircle, MessageSquare, 
  BarChart3, Plus, Save, X, MoreVertical, FolderOpen
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { API_ENDPOINTS, BACKEND_URL } from '../utils/config'
import toast from 'react-hot-toast'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  visibility: 'public' | 'private' | 'team'
  start_date: string | null
  due_date: string | null
  organization_id: string
  owner_id: string
  team_members: string[]
  budget: {
    total_budget: number | null
    spent_amount: number
    currency: string
  }
  milestones: Milestone[]
  settings: any
  tags: string[]
  category: string | null
  progress_percentage: number
  task_count: number
  completed_task_count: number
  created_at: string
  updated_at: string
}

interface Milestone {
  id: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
}

interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  due_date: string | null
  assigned_to: string[]
  project_id: string
  created_at: string
}

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
}

interface Comment {
  id: string
  content: string
  author_id: string
  author_name?: string
  created_at: string
  updated_at: string
}

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { tokens } = useAuth()
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    if (projectId && tokens?.access_token) {
      fetchProjectData()
    }
  }, [projectId, tokens])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = API_ENDPOINTS.projects.details(projectId!)
      console.log('🔍 ProjectDetailsPage Debug:')
      console.log('  - Project ID:', projectId)
      console.log('  - API URL:', apiUrl)
      console.log('  - Environment:', typeof window !== 'undefined' ? {
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          isEmergentagent: window.location.hostname.includes('emergentagent.com')
        } : 'SSR')
      console.log('  - Has Token:', tokens?.access_token ? 'Yes' : 'No')
      console.log('  - Token Length:', tokens?.access_token?.length || 0)
      
      // Fetch project details with detailed error handling
      console.log('📡 Making API request...')
      const projectResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      console.log('📨 Response Status:', projectResponse.status)
      console.log('📨 Response OK:', projectResponse.ok)
      
      if (!projectResponse.ok) {
        const errorText = await projectResponse.text()
        console.error('❌ Project API Error:', projectResponse.status, errorText)
        if (projectResponse.status === 404) {
          throw new Error('Project not found. It may have been deleted or archived.')
        } else if (projectResponse.status === 401) {
          throw new Error('Authentication failed. Please log in again.')
        } else if (projectResponse.status === 403) {
          throw new Error('Access denied. You do not have permission to view this project.')
        }
        throw new Error(`Failed to fetch project details (Status: ${projectResponse.status})`)
      }
      
      const projectData = await projectResponse.json()
      console.log('✅ Project data loaded successfully:', projectData.name)
      setProject(projectData)
      setEditedName(projectData.name)
      setEditedDescription(projectData.description || '')
      
      // Fetch tasks for this project
      const tasksResponse = await fetch(`${API_ENDPOINTS.tasks.list}?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData)
      }
      
      // Fetch users
      const usersResponse = await fetch(API_ENDPOINTS.users.list, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }
      
      // Fetch comments
      try {
        const commentsResponse = await fetch(API_ENDPOINTS.comments.threads('project', projectId!), {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json()
          setComments(commentsData)
        }
      } catch (err) {
        console.log('Comments not available')
      }
      
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project data'
      const apiUrl = API_ENDPOINTS.projects.details(projectId!)
      console.error('❌ Error in fetchProjectData:', err)
      console.error('❌ Error details:', {
        message: errorMessage,
        apiUrl: apiUrl,
        projectId: projectId,
        hasToken: !!tokens?.access_token,
        environment: {
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
          protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown'
        },
        stack: err instanceof Error ? err.stack : undefined,
        type: typeof err,
        err: err
      })
      setError(`${errorMessage}. Please check console for details.`)
      toast.error(`Failed to load project details: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProject = async (updates: Partial<Project>) => {
    try {
      const response = await fetch(API_ENDPOINTS.projects.details(projectId!), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      toast.success('Project updated successfully')
      await fetchProjectData()
    } catch (error) {
      toast.error('Failed to update project')
    }
  }

  const handleSaveName = async () => {
    if (editedName.trim()) {
      await handleUpdateProject({ name: editedName })
      setIsEditingName(false)
    }
  }

  const handleSaveDescription = async () => {
    await handleUpdateProject({ description: editedDescription })
    setIsEditingDescription(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    await handleUpdateProject({ status: newStatus as any })
  }

  const handlePriorityChange = async (newPriority: string) => {
    await handleUpdateProject({ priority: newPriority as any })
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    
    try {
      const response = await fetch(API_ENDPOINTS.comments.create, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: 'project',
          entity_id: projectId,
          content: newComment,
        }),
      })

      if (response.ok) {
        toast.success('Comment added')
        setNewComment('')
        await fetchProjectData()
      }
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to archive this project?')) {
      try {
        const response = await fetch(API_ENDPOINTS.projects.details(projectId!), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to archive project')
        }

        toast.success('Project archived')
        navigate('/projects')
      } catch (error) {
        toast.error('Failed to archive project')
      }
    }
  }

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

  const getTaskStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      review: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      blocked: 'bg-red-100 text-red-700'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.name || 'Unknown User'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load project</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const budgetUtilization = project.budget.total_budget 
    ? (project.budget.spent_amount / project.budget.total_budget) * 100 
    : 0

  return (
    <div className="space-y-6" data-testid="project-details-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="mt-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-3xl font-bold text-gray-900 border-b-2 border-primary-500 focus:outline-none"
                  autoFocus
                  data-testid="edit-name-input"
                />
                <button
                  onClick={handleSaveName}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  data-testid="save-name-button"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false)
                    setEditedName(project.name)
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900" data-testid="project-name">
                  {project.name}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  data-testid="edit-name-button"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`} data-testid="project-status">
                {project.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`} data-testid="project-priority">
                {project.priority.toUpperCase()} PRIORITY
              </span>
              {project.category && (
                <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                  {project.category}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="status-select"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button
            onClick={handleDeleteProject}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            data-testid="delete-project-button"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overview Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
        
        {isEditingDescription ? (
          <div className="space-y-2">
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Project description..."
              data-testid="edit-description-textarea"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSaveDescription}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                data-testid="save-description-button"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingDescription(false)
                  setEditedDescription(project.description || '')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <p className="text-gray-700 whitespace-pre-wrap" data-testid="project-description">
                {project.description || 'No description provided'}
              </p>
              <button
                onClick={() => setIsEditingDescription(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                data-testid="edit-description-button"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-500 mb-1">Start Date</p>
                <p className="text-gray-900 font-medium">{formatDate(project.start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Due Date</p>
                <p className="text-gray-900 font-medium">{formatDate(project.due_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Owner</p>
                <p className="text-gray-900 font-medium">{getUserName(project.owner_id)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Overall Progress</h3>
            <TrendingUp className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2" data-testid="overall-progress">
            {project.progress_percentage}%
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${project.progress_percentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Tasks</h3>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2" data-testid="task-stats">
            {project.completed_task_count} / {project.task_count}
          </p>
          <p className="text-sm text-gray-600">
            {project.task_count > 0 
              ? `${Math.round((project.completed_task_count / project.task_count) * 100)}% Complete`
              : 'No tasks yet'
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Milestones</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2" data-testid="milestone-stats">
            {(project.milestones || []).filter(m => m.completed).length} / {(project.milestones || []).length}
          </p>
          <p className="text-sm text-gray-600">
            {(project.milestones || []).length > 0
              ? `${Math.round(((project.milestones || []).filter(m => m.completed).length / (project.milestones || []).length) * 100)}% Complete`
              : 'No milestones yet'
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Team Size</h3>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2" data-testid="team-size">
            {(project.team_members || []).length}
          </p>
          <p className="text-sm text-gray-600">Team Members</p>
        </div>
      </div>

      {/* Budget Section */}
      {project.budget.total_budget !== null && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900" data-testid="total-budget">
                {project.budget.currency} {project.budget.total_budget.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Spent</p>
              <p className="text-2xl font-bold text-orange-600" data-testid="spent-budget">
                {project.budget.currency} {project.budget.spent_amount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Remaining</p>
              <p className="text-2xl font-bold text-green-600" data-testid="remaining-budget">
                {project.budget.currency} {(project.budget.total_budget - project.budget.spent_amount).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Budget Utilization</span>
              <span className="text-sm font-medium text-gray-900">{budgetUtilization.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  budgetUtilization > 90 ? 'bg-red-500' : budgetUtilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Team Members Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(project.team_members || []).map(memberId => {
            const user = users.find(u => u.id === memberId)
            return (
              <div key={memberId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{user?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">{user?.email || ''}</p>
                </div>
              </div>
            )
          })}
          {(project.team_members || []).length === 0 && (
            <p className="text-gray-500 col-span-full">No team members assigned</p>
          )}
        </div>
      </div>

      {/* Milestones Section */}
      {(project.milestones || []).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Milestones</h2>
          <div className="space-y-3">
            {(project.milestones || []).map(milestone => (
              <div 
                key={milestone.id} 
                className={`p-4 border-l-4 ${milestone.completed ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'} rounded-r-lg`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {milestone.completed && <CheckCircle className="w-5 h-5 text-green-600" />}
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      {milestone.due_date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {formatDate(milestone.due_date)}</span>
                        </span>
                      )}
                      {milestone.completed_at && (
                        <span className="text-green-600">
                          Completed: {formatDate(milestone.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tasks ({tasks.length})</h2>
          <button
            onClick={() => navigate('/tasks', { state: { projectId: project.id } })}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            data-testid="add-task-button"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
        
        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <div 
                key={task.id} 
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                data-testid={`task-${task.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTaskStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {task.due_date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(task.due_date)}</span>
                        </span>
                      )}
                      {(task.assigned_to || []).length > 0 && (
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{(task.assigned_to || []).length} assigned</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No tasks yet</p>
              <p className="text-sm text-gray-400">Create your first task to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments / Activity Feed Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity & Comments</h2>
        
        {/* Add Comment */}
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Add a comment..."
            data-testid="new-comment-textarea"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              data-testid="add-comment-button"
            >
              Add Comment
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="flex space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {comment.author_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{comment.author_name || 'Unknown'}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No comments yet</p>
              <p className="text-sm text-gray-400">Be the first to comment on this project</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectDetailsPage
