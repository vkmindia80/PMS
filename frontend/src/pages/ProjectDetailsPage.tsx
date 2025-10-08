import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useActivityTracking } from '../hooks/useActivityTracking'
import { 
  ArrowLeft, Edit2, Trash2, Calendar, Users, DollarSign, Target, 
  TrendingUp, Clock, CheckCircle, AlertCircle, MessageSquare, 
  BarChart3, Plus, Save, X, MoreVertical, FolderOpen, Settings,
  FileText, Activity, Eye, Star, Share, Download, Filter,
  Zap, PieChart, LineChart, Grid, List, Kanban, Flag
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
  name?: string
  first_name?: string
  last_name?: string
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

type TabType = 'overview' | 'timeline' | 'milestones' | 'tasks' | 'team' | 'analytics' | 'files' | 'activity'

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { tokens } = useAuth()
  
  // Enhanced activity tracking
  const { 
    logTabNavigation, 
    logProjectAction, 
    initializeGeolocation 
  } = useActivityTracking(projectId)
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [filesCount, setFilesCount] = useState<number>(0)
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
      // Initialize geolocation for activity tracking
      initializeGeolocation()
      // Log initial project view
      logProjectAction('viewed', projectId, 'Viewed project details page')
    }
  }, [projectId, tokens, initializeGeolocation, logProjectAction])

  // Log tab navigation when active tab changes
  useEffect(() => {
    if (projectId && activeTab) {
      logTabNavigation(activeTab, projectId)
    }
  }, [activeTab, projectId, logTabNavigation])

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
        fetchActivities(),
        fetchFilesCount()
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
    try {
      const activitiesResponse = await fetch(API_ENDPOINTS.activities.project(projectId!), {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json()
        setActivities(activitiesData)
      } else {
        // Fallback to mock data if API is not available yet
        console.log('Activities API not available, using mock data')
        setActivities([])
      }
    } catch (error) {
      console.log('Failed to fetch activities, using empty array')
      setActivities([])
    }
  }

  const fetchFilesCount = async () => {
    try {
      const filesResponse = await fetch(API_ENDPOINTS.files.list(projectId!), {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (filesResponse.ok) {
        const filesData = await filesResponse.json()
        setFilesCount(filesData.files?.length || 0)
      } else {
        setFilesCount(0)
      }
    } catch (error) {
      console.log('Failed to fetch files count')
      setFilesCount(0)
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

      // Log the project update activity
      const updateFields = Object.keys(updates).join(', ')
      await logProjectAction(
        'updated', 
        projectId!, 
        `Updated project fields: ${updateFields}`,
        { 
          updated_fields: updateFields,
          changes: updates
        }
      )

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
    const oldStatus = project?.status
    await handleUpdateProject({ status: newStatus as any })
    
    // Log status change specifically
    await logProjectAction(
      'status_changed',
      projectId!,
      `Changed project status from ${oldStatus} to ${newStatus}`,
      {
        old_status: oldStatus,
        new_status: newStatus
      }
    )
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
    if (user) {
      // Handle both name field and first_name/last_name fields
      if (user.name) {
        return user.name
      } else if (user.first_name || user.last_name) {
        return `${user.first_name || ''} ${user.last_name || ''}`.trim()
      }
    }
    return 'Unknown User'
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Eye, count: null },
    { id: 'timeline', name: 'Timeline', icon: Calendar, count: tasks.length },
    { id: 'milestones', name: 'Milestones', icon: Flag, count: (project?.milestones || []).length },
    { id: 'tasks', name: 'Tasks', icon: Target, count: tasks.length },
    { id: 'team', name: 'Team', icon: Users, count: project?.team_members?.length || 0 },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, count: null },
    { id: 'files', name: 'Files', icon: FileText, count: filesCount },
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
            fetchProjectData={fetchProjectData}
          />
        )}

        {activeTab === 'timeline' && (
          <AdvancedGanttChartTab 
            projectId={project.id}
            projectName={project.name}
          />
        )}

        {activeTab === 'milestones' && (
          <MilestonesManager 
            project={project}
            onMilestonesUpdate={fetchProjectData}
          />
        )}

        {activeTab === 'tasks' && (
          <EnhancedTasksTab 
            project={{ id: project.id, name: project.name }}
            users={users}
            onTaskUpdate={() => fetchProjectData()}
            onTaskCreate={() => fetchProjectData()}
            onTaskDelete={() => fetchProjectData()}
          />
        )}

        {activeTab === 'team' && (
          <EnhancedTeamTab 
            project={project}
            users={users}
            onAddMember={() => fetchProjectData()}
            onRemoveMember={() => fetchProjectData()}
            onUpdateMemberRole={() => fetchProjectData()}
          />
        )}

        {activeTab === 'analytics' && (
          <EnhancedAnalyticsTab 
            project={project}
            tasks={tasks}
            users={users}
            budgetUtilization={budgetUtilization}
          />
        )}

        {activeTab === 'files' && (
          <EnhancedFilesTab 
            project={project}
            users={users}
            onFileUpload={() => console.log('File upload')}
            onFileDelete={() => console.log('File delete')}
            onFileShare={() => console.log('File share')}
          />
        )}

        {activeTab === 'activity' && (
          <EnhancedActivityTab 
            projectId={project.id}
            projectName={project.name}
          />
        )}
      </div>
    </div>
  )
}

// Overview Tab Component
const OverviewTab: React.FC<any> = ({
  project, isEditingDescription, setIsEditingDescription, editedDescription, 
  setEditedDescription, handleSaveDescription, formatDate, getUserName, users, fetchProjectData
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

      {/* Milestones Manager */}
      <MilestonesManager 
        project={project}
        onMilestonesUpdate={fetchProjectData}
      />
    </div>
  )
}

// Import enhanced components
import EnhancedTasksTab from '../components/project/EnhancedTasksTab'
import EnhancedAnalyticsTab from '../components/project/EnhancedAnalyticsTab'
import EnhancedTeamTab from '../components/project/EnhancedTeamTab'
import EnhancedFilesTab from '../components/project/EnhancedFilesTab'
import MilestonesManager from '../components/project/MilestonesManager'
import AdvancedGanttChartTab from '../components/project/AdvancedGanttChartTab'

// Activity Tab Component - Enhanced with filtering and grouping
const ActivityTab: React.FC<any> = ({ activities, comments, newComment, setNewComment, handleAddComment, formatDateTime }) => {
  const [filterType, setFilterType] = React.useState<string>('all')
  const [showStats, setShowStats] = React.useState(false)
  
  // Combine and sort all activities
  const allActivities = [
    ...comments.map(c => ({
      id: c.id,
      type: 'comment',
      user_name: c.author_name || 'Unknown',
      description: c.content,
      created_at: c.created_at,
      action_type: 'commented',
      metadata: {}
    })),
    ...activities
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  // Filter activities
  const filteredActivities = filterType === 'all' 
    ? allActivities 
    : allActivities.filter(a => a.type === filterType || a.action_type === filterType)
  
  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {} as Record<string, typeof allActivities>)
  
  const getActivityIcon = (type: string, actionType: string) => {
    if (type === 'comment' || actionType === 'commented') return MessageSquare
    if (actionType === 'created') return Plus
    if (actionType === 'completed') return CheckCircle
    if (actionType === 'updated') return Edit2
    if (actionType === 'status_changed') return Zap
    if (actionType === 'assigned') return Users
    if (actionType === 'deleted') return Trash2
    return Activity
  }
  
  const getActivityColor = (type: string, actionType: string) => {
    if (type === 'comment' || actionType === 'commented') return 'bg-blue-50 border-blue-200 text-blue-700'
    if (actionType === 'created') return 'bg-green-50 border-green-200 text-green-700'
    if (actionType === 'completed') return 'bg-purple-50 border-purple-200 text-purple-700'
    if (actionType === 'updated') return 'bg-orange-50 border-orange-200 text-orange-700'
    if (actionType === 'status_changed') return 'bg-yellow-50 border-yellow-200 text-yellow-700'
    if (actionType === 'assigned') return 'bg-indigo-50 border-indigo-200 text-indigo-700'
    if (actionType === 'deleted') return 'bg-red-50 border-red-200 text-red-700'
    return 'bg-gray-50 border-gray-200 text-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Activity className="w-7 h-7 mr-3 text-primary-600" />
          Project Activity
        </h2>
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm font-medium">
            {showStats ? 'Hide' : 'Show'} Stats
          </span>
        </button>
      </div>

      {/* Activity Stats */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">{allActivities.length}</div>
            <div className="text-blue-100 text-sm">Total Activities</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">
              {allActivities.filter(a => a.created_at && 
                new Date(a.created_at) > new Date(Date.now() - 24*60*60*1000)
              ).length}
            </div>
            <div className="text-green-100 text-sm">Last 24 Hours</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">{comments.length}</div>
            <div className="text-purple-100 text-sm">Comments</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">{activities.length}</div>
            <div className="text-orange-100 text-sm">System Events</div>
          </div>
        </div>
      )}

      {/* Add Comment */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
          Add Comment
        </h3>
        <div className="space-y-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            placeholder="Share an update, ask a question, or provide feedback..."
            data-testid="new-comment-textarea"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {newComment.length} / 1000 characters
            </span>
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              data-testid="add-comment-button"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({allActivities.length})
          </button>
          <button
            onClick={() => setFilterType('comment')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'comment'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Comments ({comments.length})
          </button>
          <button
            onClick={() => setFilterType('created')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'created'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Created
          </button>
          <button
            onClick={() => setFilterType('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'completed'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-1" />
            Completed
          </button>
          <button
            onClick={() => setFilterType('updated')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'updated'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Edit2 className="w-4 h-4 inline mr-1" />
            Updated
          </button>
        </div>
      </div>

      {/* Activity Feed - Grouped by Date */}
      <div className="space-y-6">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-600">Be the first to comment or update this project</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Date Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">{date}</h3>
                  <span className="text-xs text-gray-500">({dateActivities.length} activities)</span>
                </div>
              </div>
              
              {/* Activities */}
              <div className="p-6 space-y-4">
                {dateActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type, activity.action_type)
                  const colorClass = getActivityColor(activity.type, activity.action_type)
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={`flex space-x-4 p-4 rounded-xl border ${colorClass} transition-all hover:shadow-md`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'comment' ? 'bg-blue-600' : 'bg-gray-600'
                      } text-white`}>
                        {activity.type === 'comment' ? (
                          <span className="font-semibold text-sm">
                            {activity.user_name?.charAt(0) || '?'}
                          </span>
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900">{activity.user_name}</span>
                          <span className="text-sm text-gray-600">
                            {activity.action_type || 'activity'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(activity.created_at)}
                          </span>
                          {activity.metadata?.task_name && (
                            <span className="text-xs bg-white px-2 py-1 rounded-full border border-current">
                              {activity.metadata.task_name}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 leading-relaxed break-words">{activity.description}</p>
                        {activity.metadata?.old_value && activity.metadata?.new_value && (
                          <div className="mt-2 flex items-center space-x-2 text-xs">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                              {activity.metadata.old_value}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                              {activity.metadata.new_value}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ProjectDetailsPage