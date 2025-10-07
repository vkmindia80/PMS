import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Edit2, Trash2, Calendar, Users, DollarSign, Target, 
  TrendingUp, Clock, CheckCircle, AlertCircle, MessageSquare, 
  BarChart3, Plus, Save, X, MoreVertical, FolderOpen, Settings,
  FileText, Activity, Eye, Star, Share, Download, Filter,
  Zap, PieChart, LineChart, Grid, List, Kanban
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { API_ENDPOINTS, getBACKEND_URL } from '../utils/config'
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

interface ProjectActivity {
  id: string
  type: 'status_change' | 'task_created' | 'task_completed' | 'milestone_completed' | 'comment_added' | 'member_added'
  description: string
  user_id: string
  user_name: string
  created_at: string
}

type TabType = 'overview' | 'tasks' | 'team' | 'analytics' | 'files' | 'activity'

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { tokens } = useAuth()
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [newComment, setNewComment] = useState('')
  const [taskView, setTaskView] = useState<'list' | 'kanban'>('list')

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
      
      // Fetch project details
      const projectResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!projectResponse.ok) {
        const errorText = await projectResponse.text()
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
      setProject(projectData)
      setEditedName(projectData.name)
      setEditedDescription(projectData.description || '')
      
      // Fetch related data in parallel
      await Promise.all([
        fetchTasks(),
        fetchUsers(),
        fetchComments(),
        fetchActivities()
      ])
      
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project data'
      setError(errorMessage)
      toast.error(`Failed to load project details: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const tasksApiUrl = `${API_ENDPOINTS.tasks.list}?project_id=${projectId}`
      const tasksResponse = await fetch(tasksApiUrl, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData)
      }
    } catch (error) {
      console.log('Failed to fetch tasks')
    }
  }

  const fetchUsers = async () => {
    try {
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
    } catch (error) {
      console.log('Failed to fetch users')
    }
  }

  const fetchComments = async () => {
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
    } catch (error) {
      console.log('Comments not available')
    }
  }

  const fetchActivities = async () => {
    // Mock activity data since there's no specific API endpoint
    const mockActivities: ProjectActivity[] = [
      {
        id: '1',
        type: 'status_change',
        description: 'Changed project status from Planning to Active',
        user_id: 'demo-user-001',
        user_name: 'Demo User',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: '2', 
        type: 'task_created',
        description: 'Created new task: Setup project infrastructure',
        user_id: 'demo-user-001',
        user_name: 'Demo User',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        id: '3',
        type: 'milestone_completed',
        description: 'Completed milestone: Project Kickoff',
        user_id: 'demo-user-001',
        user_name: 'Demo User',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
      }
    ]
    setActivities(mockActivities)
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
        await fetchComments()
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
      planning: 'bg-blue-100 text-blue-800 border-blue-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      archived: 'bg-gray-100 text-gray-500 border-gray-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getTaskStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      review: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      blocked: 'bg-red-100 text-red-700 border-red-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.name || 'Unknown User'
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Eye, count: null },
    { id: 'tasks', name: 'Tasks', icon: Target, count: tasks.length },
    { id: 'team', name: 'Team', icon: Users, count: project?.team_members?.length || 0 },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, count: null },
    { id: 'files', name: 'Files', icon: FileText, count: 0 },
    { id: 'activity', name: 'Activity', icon: Activity, count: activities.length }
  ] as const

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-primary-400 animate-spin" style={{animationDelay: '0.15s', animationDuration: '1s'}}></div>
          </div>
          <p className="text-gray-600 animate-pulse">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Failed to load project</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => navigate('/projects')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Projects
            </button>
            <button
              onClick={fetchProjectData}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const budgetUtilization = project.budget.total_budget 
    ? (project.budget.spent_amount / project.budget.total_budget) * 100 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" data-testid="project-details-page">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <button
                onClick={() => navigate('/projects')}
                className="mt-2 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-3xl font-bold text-gray-900 border-b-2 border-primary-500 focus:outline-none bg-transparent"
                      autoFocus
                      data-testid="edit-name-input"
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      data-testid="save-name-button"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false)
                        setEditedName(project.name)
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 mb-3">
                    <h1 className="text-3xl font-bold text-gray-900" data-testid="project-name">
                      {project.name}
                    </h1>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      data-testid="edit-name-button"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center space-x-4 flex-wrap gap-2">
                  <div className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(project.status)}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${project.status === 'active' ? 'animate-pulse bg-current' : 'bg-current'}`}></div>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </div>
                  
                  <div className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor(project.priority)}`}>
                    {project.priority.toUpperCase()} PRIORITY
                  </div>

                  {project.category && (
                    <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                      {project.category}
                    </span>
                  )}

                  <div className="text-sm text-gray-500">
                    Created {formatDate(project.created_at)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Share className="w-4 h-4" />
                <span>Share</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              <div className="relative">
                <select
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
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
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                  {tab.count !== null && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      isActive ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab 
            project={project}
            isEditingDescription={isEditingDescription}
            setIsEditingDescription={setIsEditingDescription}
            editedDescription={editedDescription}
            setEditedDescription={setEditedDescription}
            handleSaveDescription={handleSaveDescription}
            formatDate={formatDate}
            getUserName={getUserName}
            users={users}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab 
            tasks={tasks}
            project={project}
            taskView={taskView}
            setTaskView={setTaskView}
            getTaskStatusColor={getTaskStatusColor}
            getPriorityColor={getPriorityColor}
            formatDate={formatDate}
            getUserName={getUserName}
          />
        )}

        {activeTab === 'team' && (
          <TeamTab 
            project={project}
            users={users}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            project={project}
            tasks={tasks}
            budgetUtilization={budgetUtilization}
          />
        )}

        {activeTab === 'files' && (
          <FilesTab project={project} />
        )}

        {activeTab === 'activity' && (
          <ActivityTab 
            activities={activities}
            comments={comments}
            newComment={newComment}
            setNewComment={setNewComment}
            handleAddComment={handleAddComment}
            formatDateTime={formatDateTime}
          />
        )}
      </div>
    </div>
  )
}

// Overview Tab Component
const OverviewTab: React.FC<any> = ({
  project, isEditingDescription, setIsEditingDescription, editedDescription, 
  setEditedDescription, handleSaveDescription, formatDate, getUserName, users
}) => {
  const budgetUtilization = project.budget.total_budget 
    ? (project.budget.spent_amount / project.budget.total_budget) * 100 
    : 0

  return (
    <div className="space-y-8">
      {/* Project Description */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Overview</h2>
        
        {isEditingDescription ? (
          <div className="space-y-4">
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describe your project goals, objectives, and key deliverables..."
              data-testid="edit-description-textarea"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleSaveDescription}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                data-testid="save-description-button"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditingDescription(false)
                  setEditedDescription(project.description || '')
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid="project-description">
                  {project.description || (
                    <span className="text-gray-400 italic">
                      No description provided. Click the edit button to add project details, goals, and objectives.
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setIsEditingDescription(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="edit-description-button"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Project Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full border border-primary-200">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Key Project Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Start Date</span>
                </div>
                <p className="text-gray-900 font-medium">{formatDate(project.start_date)}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Due Date</span>
                </div>
                <p className="text-gray-900 font-medium">{formatDate(project.due_date)}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">Project Owner</span>
                </div>
                <p className="text-gray-900 font-medium">{getUserName(project.owner_id)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress & Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900" data-testid="overall-progress">
                {project.progress_percentage}%
              </div>
              <div className="text-sm text-gray-500">Overall Progress</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${project.progress_percentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
              <Target className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900" data-testid="task-stats">
                {project.completed_task_count} / {project.task_count}
              </div>
              <div className="text-sm text-gray-500">Tasks Complete</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {project.task_count > 0 
              ? `${Math.round((project.completed_task_count / project.task_count) * 100)}% Complete`
              : 'No tasks yet'
            }
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900" data-testid="milestone-stats">
                {(project.milestones || []).filter(m => m.completed).length} / {(project.milestones || []).length}
              </div>
              <div className="text-sm text-gray-500">Milestones</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {(project.milestones || []).length > 0
              ? `${Math.round(((project.milestones || []).filter(m => m.completed).length / (project.milestones || []).length) * 100)}% Complete`
              : 'No milestones yet'
            }
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900" data-testid="team-size">
                {(project.team_members || []).length}
              </div>
              <div className="text-sm text-gray-500">Team Members</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">Active Contributors</div>
        </div>
      </div>

      {/* Budget Section */}
      {project.budget.total_budget !== null && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Budget Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2" data-testid="total-budget">
                {project.budget.currency} {project.budget.total_budget.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Budget</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2" data-testid="spent-budget">
                {project.budget.currency} {project.budget.spent_amount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Amount Spent</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2" data-testid="remaining-budget">
                {project.budget.currency} {(project.budget.total_budget - project.budget.spent_amount).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Remaining</div>
            </div>
          </div>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Budget Utilization</span>
              <span className="text-sm font-medium text-gray-900">{budgetUtilization.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  budgetUtilization > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                  budgetUtilization > 70 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                  'bg-gradient-to-r from-green-500 to-green-600'
                }`}
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Milestones Section */}
      {(project.milestones || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Milestones</h2>
          <div className="space-y-4">
            {(project.milestones || []).map(milestone => (
              <div 
                key={milestone.id} 
                className={`p-6 border-l-4 rounded-r-xl transition-colors ${
                  milestone.completed 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {milestone.completed && <CheckCircle className="w-5 h-5 text-green-600" />}
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {milestone.due_date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {formatDate(milestone.due_date)}</span>
                        </span>
                      )}
                      {milestone.completed_at && (
                        <span className="text-green-600 font-medium">
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
    </div>
  )
}

import EnhancedTasksTab from '../components/project/EnhancedTasksTab'

// Team Tab Component (simplified)
const TeamTab: React.FC<any> = ({ project, users }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900">Team Members ({(project.team_members || []).length})</h2>
      <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
        <Plus className="w-4 h-4" />
        <span>Add Member</span>
      </button>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(project.team_members || []).map(memberId => {
          const user = users.find((u: any) => u.id === memberId)
          return (
            <div key={memberId} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{user?.name || 'Unknown'}</h3>
                <p className="text-sm text-gray-600">{user?.email || ''}</p>
              </div>
            </div>
          )
        })}
        {(project.team_members || []).length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No team members assigned</p>
          </div>
        )}
      </div>
    </div>
  </div>
)

// Analytics Tab Component (simplified)
const AnalyticsTab: React.FC<any> = ({ project, tasks, budgetUtilization }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Project Analytics</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-semibold text-gray-900">{project.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
              style={{ width: `${project.progress_percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution</h3>
        <div className="text-center py-8 text-gray-500">
          Task analytics charts will be implemented here
        </div>
      </div>
    </div>
  </div>
)

// Files Tab Component (placeholder)
const FilesTab: React.FC<any> = ({ project }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900">Project Files</h2>
      <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
        <Plus className="w-4 h-4" />
        <span>Upload File</span>
      </button>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded</h3>
      <p className="text-gray-600 mb-6">Upload project files, documents, and assets</p>
      <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
        Upload First File
      </button>
    </div>
  </div>
)

// Activity Tab Component
const ActivityTab: React.FC<any> = ({ activities, comments, newComment, setNewComment, handleAddComment, formatDateTime }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Project Activity</h2>

    {/* Add Comment */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Comment</h3>
      <div className="space-y-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Share an update, ask a question, or provide feedback..."
          data-testid="new-comment-textarea"
        />
        <div className="flex justify-end">
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            data-testid="add-comment-button"
          >
            Post Comment
          </button>
        </div>
      </div>
    </div>

    {/* Activity Feed */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
      <div className="space-y-6">
        {/* Comments */}
        {comments.map(comment => (
          <div key={comment.id} className="flex space-x-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
              {comment.author_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-gray-900">{comment.author_name || 'Unknown'}</span>
                <span className="text-sm text-gray-500">commented</span>
                <span className="text-sm text-gray-500">
                  {formatDateTime(comment.created_at)}
                </span>
              </div>
              <p className="text-gray-700">{comment.content}</p>
            </div>
          </div>
        ))}

        {/* System Activities */}
        {activities.map(activity => (
          <div key={activity.id} className="flex space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gray-400 text-white rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900">{activity.user_name}</span>
                <span className="text-sm text-gray-500">
                  {formatDateTime(activity.created_at)}
                </span>
              </div>
              <p className="text-gray-700">{activity.description}</p>
            </div>
          </div>
        ))}

        {comments.length === 0 && activities.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
            <p className="text-gray-600">Be the first to comment or update this project</p>
          </div>
        )}
      </div>
    </div>
  </div>
)

export default ProjectDetailsPage