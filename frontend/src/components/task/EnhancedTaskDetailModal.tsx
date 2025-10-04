import React, { useState, useEffect } from 'react'
import { 
  X, Edit, Save, Clock, Users, Calendar, Flag, Link, 
  MessageSquare, Paperclip, Activity, CheckSquare,
  AlertTriangle, ArrowRight, ArrowLeft, Plus, Minus,
  User, Tag, FileText, History, Copy, Share2, Archive,
  MoreVertical, Eye, EyeOff, Star, Trash2, RefreshCw,
  Zap, Target, TrendingUp, Timer, Play, Square
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrlDynamic } from '../../utils/config'
import { formatHours, formatHoursWithSuffix, formatSecondsToHours } from '../../utils/hourFormatter'
import toast from 'react-hot-toast'

// Import tab components
import { TaskDetailsTab } from './TaskDetailsTab'
import { TimeTrackingTab } from './TimeTrackingTab'
import { TaskCommentsTab } from './TaskCommentsTab'
import { TaskActivityTab } from './TaskActivityTab'
import { TaskDependenciesTab } from './TaskDependenciesTab'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  type: 'task' | 'bug' | 'feature' | 'improvement' | 'research'
  project_id: string
  assignee_id?: string
  assignee_ids?: string[]
  reporter_id: string
  parent_task_id?: string
  due_date?: string
  start_date?: string
  completed_at?: string
  time_tracking: {
    estimated_hours?: number
    actual_hours: number
    logged_time: Array<{
      id: string
      user_id: string
      hours: number
      description: string
      date: string
      created_at: string
    }>
  }
  dependencies: Array<{
    task_id: string
    dependency_type: string
  } | string>
  subtasks: string[]
  tags: string[]
  labels: string[]
  custom_fields: Record<string, any>
  progress_percentage: number
  subtask_count: number
  comment_count: number
  attachment_count: number
  created_at: string
  updated_at: string
}

interface Comment {
  id: string
  content: string
  type: 'comment' | 'note' | 'review' | 'suggestion' | 'approval'
  entity_type: 'task'
  entity_id: string
  author_id: string
  parent_id?: string
  thread_id?: string
  mentions: Array<{
    user_id: string
    username: string
    position: number
  }>
  attachments: string[]
  is_edited: boolean
  is_internal: boolean
  is_pinned: boolean
  reply_count: number
  reaction_count: number
  reactions: Array<{
    user_id: string
    emoji: string
    timestamp: string
  }>
  is_resolved: boolean
  resolved_by?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: string
  details: Record<string, any>
  timestamp: string
}

interface EnhancedTaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onDelete?: (taskId: string) => Promise<void>
  onDuplicate?: (task: Task) => Promise<void>
}

export const EnhancedTaskDetailModal: React.FC<EnhancedTaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate
}) => {
  const { tokens, user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'comments' | 'activity' | 'dependencies' | 'time'>('overview')
  const [comments, setComments] = useState<Comment[]>([])
  const [activities, setActivities] = useState<TaskActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<'comment' | 'note' | 'review'>('comment')
  const [timeLogHours, setTimeLogHours] = useState('')
  const [timeLogDescription, setTimeLogDescription] = useState('')
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentTimerStart, setCurrentTimerStart] = useState<Date | null>(null)
  const [timerElapsed, setTimerElapsed] = useState(0)

  // Enhanced task data with user details
  const [taskWithDetails, setTaskWithDetails] = useState<any>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [dependentTasks, setDependentTasks] = useState<any[]>([])
  const [relatedTasks, setRelatedTasks] = useState<any[]>([])
  const [taskHealth, setTaskHealth] = useState<'excellent' | 'good' | 'warning' | 'critical'>('good')

  // Editable task data with validation
  const [editData, setEditData] = useState<Partial<Task>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const statusConfig = {
    todo: { label: 'To Do', color: 'bg-gray-100 text-gray-800', iconColor: 'text-gray-600', icon: '📋' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', iconColor: 'text-blue-600', icon: '⚡' },
    in_review: { label: 'In Review', color: 'bg-yellow-100 text-yellow-800', iconColor: 'text-yellow-600', icon: '👁️' },
    blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800', iconColor: 'text-red-600', icon: '🚫' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800', iconColor: 'text-green-600', icon: '✅' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', iconColor: 'text-gray-400', icon: '❌' }
  }

  const priorityConfig = {
    low: { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', icon: '🔽' },
    medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200', icon: '◀️' },
    high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', icon: '🔺' },
    critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: '🚨' }
  }

  const typeConfig = {
    task: { label: 'Task', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: '📋' },
    bug: { label: 'Bug', color: 'text-red-600', bgColor: 'bg-red-50', icon: '🐛' },
    feature: { label: 'Feature', color: 'text-green-600', bgColor: 'bg-green-50', icon: '✨' },
    improvement: { label: 'Improvement', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: '🔧' },
    research: { label: 'Research', color: 'text-indigo-600', bgColor: 'bg-indigo-50', icon: '🔍' }
  }

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && currentTimerStart) {
      interval = setInterval(() => {
        setTimerElapsed(Date.now() - currentTimerStart.getTime())
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, currentTimerStart])

  useEffect(() => {
    if (task && isOpen) {
      console.log('EnhancedTaskDetailModal: Opening modal for task:', task.id, task.title)
      setEditData({})
      setIsEditing(false)
      setValidationErrors({})
      calculateTaskHealth()
      fetchTaskWithDetails()
      fetchAvailableUsers()
      if (activeTab === 'comments') {
        fetchComments()
      } else if (activeTab === 'activity') {
        fetchActivity()
      } else if (activeTab === 'dependencies') {
        fetchDependentTasks()
      }
    }
  }, [task, isOpen, activeTab])

  // Separate useEffect to fetch related tasks after taskWithDetails is available
  useEffect(() => {
    if (taskWithDetails && isOpen) {
      console.log('🔍 taskWithDetails available, fetching related tasks')
      fetchRelatedTasks()
    }
  }, [taskWithDetails, isOpen])

  const calculateTaskHealth = () => {
    if (!task) return
    
    let score = 100
    const now = new Date()
    
    // Check due date
    if (task.due_date) {
      const dueDate = new Date(task.due_date)
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
      
      if (daysDiff < 0 && task.status !== 'completed') {
        score -= 40 // Overdue
      } else if (daysDiff <= 1 && task.status !== 'completed') {
        score -= 20 // Due soon
      }
    }
    
    // Check progress vs time
    if (task.time_tracking?.estimated_hours && task.time_tracking?.actual_hours) {
      const timeRatio = (task.time_tracking?.actual_hours || 0) / (task.time_tracking?.estimated_hours || 1)
      if (timeRatio > 1.5) score -= 20 // Over budget
      else if (timeRatio > 1.2) score -= 10
    }
    
    // Check status and progress alignment
    if (task.status === 'in_progress' && task.progress_percentage < 10) {
      score -= 15 // Started but no progress
    }
    
    // Check dependencies
    if (task.status === 'blocked') {
      score -= 30
    }
    
    if (score >= 85) setTaskHealth('excellent')
    else if (score >= 70) setTaskHealth('good')
    else if (score >= 50) setTaskHealth('warning')
    else setTaskHealth('critical')
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!editData.title?.trim()) {
      errors.title = 'Task title is required'
    }
    
    if (editData.due_date && editData.start_date) {
      if (new Date(editData.due_date) < new Date(editData.start_date)) {
        errors.due_date = 'Due date must be after start date'
      }
    }
    
    if (editData.progress_percentage !== undefined && (editData.progress_percentage < 0 || editData.progress_percentage > 100)) {
      errors.progress_percentage = 'Progress must be between 0 and 100'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const fetchTaskWithDetails = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrlDynamic()}/api/tasks/${task.id}/detailed`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const taskDetails = await response.json()
        setTaskWithDetails(taskDetails)
      }
    } catch (error) {
      console.error('Error fetching task details:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    if (!tokens?.access_token) return
    
    try {
      const response = await fetch(`${getApiUrlDynamic()}/api/users`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const users = await response.json()
        setAvailableUsers(users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchRelatedTasks = async () => {
    if (!task || !tokens?.access_token) return
    
    console.log('🔍 fetchRelatedTasks called for task:', task.id, task.title)
    
    // Use taskWithDetails if available (which has properly formatted dependencies), otherwise use task
    const taskToUse = taskWithDetails || task
    console.log('🔍 Task dependencies (from taskWithDetails):', taskToUse.dependencies)
    
    try {
      // Fetch tasks that this task depends on (prerequisites)
      const dependencyTaskIds = (taskToUse.dependencies || []).map(dep => 
        typeof dep === 'string' ? dep : dep.task_id
      )
      console.log('🔍 Dependency task IDs:', dependencyTaskIds)
      
      const dependencyTasks = []
      
      // Fetch each dependency task
      for (const taskId of dependencyTaskIds) {
        try {
          console.log(`🔍 Fetching dependency task: ${taskId}`)
          const response = await fetch(`${getApiUrlDynamic()}/api/tasks/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          console.log(`🔍 Response for ${taskId}:`, response.status, response.ok)
          
          if (response.ok) {
            const dependencyTask = await response.json()
            console.log(`✅ Successfully fetched dependency task:`, dependencyTask.title)
            dependencyTasks.push({
              ...dependencyTask,
              relationshipType: 'dependency', // This task depends on this
              relationshipLabel: 'Prerequisite'
            })
          } else {
            console.error(`❌ Failed to fetch dependency task ${taskId}, status: ${response.status}`)
          }
        } catch (error) {
          console.error(`❌ Error fetching dependency task ${taskId}:`, error)
        }
      }
      
      // Fetch tasks that depend on this task (dependents)
      console.log('🔍 Fetching dependents for task:', task.id)
      const dependentsResponse = await fetch(`${getApiUrlDynamic()}/api/tasks/${task.id}/dependents`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('🔍 Dependents response:', dependentsResponse.status, dependentsResponse.ok)
      
      let dependentTasks = []
      if (dependentsResponse.ok) {
        const dependents = await dependentsResponse.json()
        console.log('✅ Dependents fetched:', dependents.length, 'tasks')
        dependentTasks = dependents.map((dep: any) => ({
          ...dep,
          relationshipType: 'dependent', // This task blocks this
          relationshipLabel: 'Blocks'
        }))
        setDependentTasks(dependents)
      } else {
        console.error('❌ Failed to fetch dependents, status:', dependentsResponse.status)
      }
      
      // Combine both dependency and dependent tasks for the Related Tasks section
      const allRelatedTasks = [...dependencyTasks, ...dependentTasks]
      console.log('🔍 Total related tasks:', allRelatedTasks.length)
      console.log('🔍 Related tasks:', allRelatedTasks.map(t => ({ id: t.id, title: t.title, label: t.relationshipLabel })))
      
      setRelatedTasks(allRelatedTasks)
      
    } catch (error) {
      console.error('❌ Error fetching related tasks:', error)
    }
  }

  const fetchDependentTasks = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      const response = await fetch(`${getApiUrlDynamic()}/api/tasks/${task.id}/dependents`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const dependents = await response.json()
        setDependentTasks(dependents)
      }
    } catch (error) {
      console.error('Error fetching dependent tasks:', error)
    }
  }

  const fetchComments = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrlDynamic()}/api/comments?entity_type=task&entity_id=${task.id}`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const commentsData = await response.json()
        setComments(commentsData)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActivity = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrlDynamic()}/api/tasks/${task.id}/activity`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const activityData = await response.json()
        setActivities(activityData)
      }
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!task || !Object.keys(editData).length) return
    
    if (!validateForm()) {
      toast.error('Please fix validation errors')
      return
    }
    
    try {
      await onUpdate(task.id, editData)
      setIsEditing(false)
      setEditData({})
      setValidationErrors({})
      toast.success('Task updated successfully!')
      calculateTaskHealth()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleDuplicate = async () => {
    if (!task || !onDuplicate) return
    
    try {
      await onDuplicate(task)
      toast.success('Task duplicated successfully!')
      onClose()
    } catch (error) {
      console.error('Error duplicating task:', error)
      toast.error('Failed to duplicate task')
    }
  }

  const handleStartTimer = () => {
    setIsTimerRunning(true)
    setCurrentTimerStart(new Date())
    setTimerElapsed(0)
    toast.success('Timer started!')
  }

  const handleStopAndSaveTimer = async () => {
    if (!task || !currentTimerStart || !tokens?.access_token) return
    
    try {
      const totalSeconds = Math.floor((Date.now() - currentTimerStart.getTime()) / 1000)
      const hours = formatHours(totalSeconds / 3600)
      const description = 'Timed work session'
      
      setIsTimerRunning(false)
      setCurrentTimerStart(null)
      
      // Automatically log the time entry
      const response = await fetch(`${getApiUrlDynamic()}/api/tasks/${task.id}/time/log?hours=${hours}&description=${encodeURIComponent(description)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        toast.success(`Timer stopped and ${hours}h logged successfully!`)
        
        // Refresh task data to show updated time tracking
        await fetchTaskWithDetails()
      } else {
        toast.error('Failed to log timer data')
      }
    } catch (error) {
      console.error('Error logging timer data:', error)
      toast.error('Failed to log timer data')
    }
  }

  const handleAddComment = async (type: 'comment' | 'note' | 'review' = 'comment') => {
    if (!task || !newComment.trim() || !tokens?.access_token) return
    
    try {
      const response = await fetch(`${getApiUrlDynamic()}/api/comments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment,
          type: commentType,
          entity_type: 'task',
          entity_id: task.id,
          author_id: user?.id,
          mentions: [],
          attachments: [],
          is_internal: false,
          is_pinned: false
        })
      })
      
      if (response.ok) {
        setNewComment('')
        await fetchComments() // Ensure comments are refetched
        toast.success(`${commentType.charAt(0).toUpperCase() + commentType.slice(1)} added successfully!`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error(`Failed to add ${commentType}`)
    }
  }

  const handleLogTime = async () => {
    if (!task || !timeLogHours || !tokens?.access_token) return
    
    try {
      const response = await fetch(`${getApiUrlDynamic()}/api/tasks/${task.id}/time/log?hours=${timeLogHours}&description=${encodeURIComponent(timeLogDescription)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setTimeLogHours('')
        setTimeLogDescription('')
        toast.success('Time logged successfully!')
        
        // Refresh task data to show updated time tracking
        await fetchTaskWithDetails()
      }
    } catch (error) {
      console.error('Error logging time:', error)
      toast.error('Failed to log time')
    }
  }

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return '🟢'
      case 'good': return '🔵' 
      case 'warning': return '🟡'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="enhanced-task-detail-modal-overlay">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" data-testid="enhanced-task-detail-modal">
        {/* Enhanced Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            {/* Task Status & Type */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg ${statusConfig[task.status]?.color}`}>
                  {statusConfig[task.status]?.icon} {statusConfig[task.status]?.label}
                </span>
                <span className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-lg border ${priorityConfig[task.priority]?.bgColor} ${priorityConfig[task.priority]?.color}`}>
                  {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
                </span>
                <span className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-lg border ${typeConfig[task.type]?.bgColor} ${typeConfig[task.type]?.color}`}>
                  {typeConfig[task.type]?.icon} {typeConfig[task.type]?.label}
                </span>
              </div>
              
              {/* Task Health Indicator */}
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${getHealthColor(taskHealth)}`}>
                <span>{getHealthIcon(taskHealth)}</span>
                <span className="text-sm font-medium">
                  Health: {taskHealth.charAt(0).toUpperCase() + taskHealth.slice(1)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Timer Controls */}
              <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                {isTimerRunning ? (
                  <>
                    <button
                      onClick={handleStopAndSaveTimer}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700 px-2 py-1 rounded border border-green-300 hover:bg-green-50"
                      title="Stop timer and automatically log time"
                      data-testid="stop-save-timer-btn"
                    >
                      <Square className="h-3 w-3" />
                      <span className="text-xs">Save</span>
                    </button>
                    <span className="text-sm font-mono text-gray-900">
                      {formatTime(timerElapsed)}
                    </span>
                  </>
                ) : (
                  <button
                    onClick={handleStartTimer}
                    className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                    data-testid="start-timer-btn"
                  >
                    <Play className="h-4 w-4" />
                    <span className="text-sm">Start Timer</span>
                  </button>
                )}
              </div>

              {/* More Actions */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  data-testid="more-actions-btn"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                
                {showMoreActions && (
                  <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                    <button
                      onClick={handleDuplicate}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                      data-testid="duplicate-task-btn"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate Task</span>
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(window.location.href)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Copy Link</span>
                    </button>
                    <button
                      onClick={() => {/* Convert to different type */}}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Convert Type</span>
                    </button>
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => onDelete && onDelete(task.id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                        data-testid="delete-task-btn"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Task</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit/Save Controls */}
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  data-testid="edit-task-button"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditData({})
                      setValidationErrors({})
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    data-testid="save-task-button"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                data-testid="close-task-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Task Title */}
          <div className="mb-4">
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editData.title !== undefined ? editData.title : task.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className={`w-full text-2xl font-bold text-gray-900 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.title ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Task title"
                />
                {validationErrors.title && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.title}</p>
                )}
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            )}
            
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>ID: {task.id.substring(0, 8)}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Updated: {new Date(task.updated_at).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="text-xl font-bold text-blue-600">
                {(taskWithDetails?.progress_percentage ?? task.progress_percentage) || 0}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
            <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="text-xl font-bold text-green-600">
                {formatHoursWithSuffix(taskWithDetails?.time_tracking?.estimated_hours ?? task.time_tracking?.estimated_hours)}
              </div>
              <div className="text-sm text-gray-600">Estimated</div>
            </div>
            <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="text-xl font-bold text-orange-600">
                {formatHoursWithSuffix(taskWithDetails?.time_tracking?.actual_hours ?? task.time_tracking?.actual_hours)}
              </div>
              <div className="text-sm text-gray-600">Logged</div>
            </div>
            <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="text-xl font-bold text-purple-600">
                {(taskWithDetails?.comment_count ?? task.comment_count) || 0}
              </div>
              <div className="text-sm text-gray-600">Comments</div>
            </div>
            <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="text-xl font-bold text-indigo-600">
                {(taskWithDetails?.dependencies?.length ?? task.dependencies?.length) || 0}
              </div>
              <div className="text-sm text-gray-600">Dependencies</div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-0 px-6">
            {[
              { key: 'overview', label: 'Overview', icon: Target },
              { key: 'details', label: 'Details', icon: FileText },
              { key: 'time', label: 'Time Tracking', icon: Clock },
              { key: 'comments', label: 'Comments', icon: MessageSquare, count: task.comment_count },
              { key: 'activity', label: 'Activity', icon: Activity },
              { key: 'dependencies', label: 'Dependencies', icon: Link }
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 px-4 border-b-3 transition-all duration-200 ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600 bg-white rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg'
                }`}
                data-testid={`task-tab-${key}`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{label}</span>
                {count !== undefined && count > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Enhanced Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 300px)' }}>
          {activeTab === 'overview' && (
            <TaskOverviewTab
              task={task}
              taskWithDetails={taskWithDetails}
              availableUsers={availableUsers}
              relatedTasks={relatedTasks}
              taskHealth={taskHealth}
              statusConfig={statusConfig}
              priorityConfig={priorityConfig}
              typeConfig={typeConfig}
            />
          )}
          
          {activeTab === 'details' && (
            <TaskDetailsTab
              task={task}
              taskWithDetails={taskWithDetails}
              availableUsers={availableUsers}
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
              validationErrors={validationErrors}
              statusConfig={statusConfig}
              priorityConfig={priorityConfig}
              typeConfig={typeConfig}
            />
          )}

          {activeTab === 'time' && (
            <TimeTrackingTab
              task={taskWithDetails || task}
              onLogTime={handleLogTime}
              timeLogHours={timeLogHours}
              setTimeLogHours={setTimeLogHours}
              timeLogDescription={timeLogDescription}
              setTimeLogDescription={setTimeLogDescription}
              isTimerRunning={isTimerRunning}
              timerElapsed={timerElapsed}
              formatTime={formatTime}
              onStartTimer={handleStartTimer}
              onStopAndSaveTimer={handleStopAndSaveTimer}
            />
          )}
          
          {activeTab === 'comments' && (
            <TaskCommentsTab
              comments={comments}
              loading={loading}
              newComment={newComment}
              setNewComment={setNewComment}
              onAddComment={handleAddComment}
              availableUsers={availableUsers}
            />
          )}
          
          {activeTab === 'activity' && (
            <TaskActivityTab
              activities={activities}
              loading={loading}
              availableUsers={availableUsers}
            />
          )}
          
          {activeTab === 'dependencies' && (
            <TaskDependenciesTab
              task={taskWithDetails || task}
              dependentTasks={dependentTasks}
              relatedTasks={relatedTasks}
              isEditing={isEditing}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Task Overview Tab - New comprehensive overview
const TaskOverviewTab: React.FC<{
  task: Task
  taskWithDetails?: any
  availableUsers?: any[]
  relatedTasks?: any[]
  taskHealth: string
  statusConfig: any
  priorityConfig: any
  typeConfig: any
}> = ({ 
  task, 
  taskWithDetails,
  availableUsers = [],
  relatedTasks = [],
  taskHealth,
  statusConfig, 
  priorityConfig,
  typeConfig
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Task Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Target className="h-5 w-5 mr-2 text-blue-600" />
          Task Overview & Key Metrics
        </h3>

        {/* Progress Visualization */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-gray-900">{task.progress_percentage || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${task.progress_percentage || 0}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {task.progress_percentage >= 75 ? 'Near completion - keep up the great work!' :
             task.progress_percentage >= 50 ? 'Making solid progress' :
             task.progress_percentage >= 25 ? 'Good start, keep going' :
             'Just getting started'}
          </div>
        </div>

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" />
              Assignment
            </h4>
            <div className="space-y-2">
              {taskWithDetails?.assignees && taskWithDetails.assignees.length > 0 ? (
                <div className="space-y-2">
                  {taskWithDetails.assignees.map((assignee: any, index: number) => (
                    <div key={assignee.id || index} className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {assignee.first_name} {assignee.last_name}
                        </span>
                        <span className="text-xs text-gray-500">{assignee.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (task.assignee_ids && task.assignee_ids.length > 0) || task.assignee_id ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {task.assignee_ids?.length > 1 ? `${task.assignee_ids.length} assignees` : 'Loading assignee...'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-sm">Unassigned</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-green-600" />
              Timeline
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Start:</span>
                <span className="font-medium">
                  {(taskWithDetails?.start_date ?? task.start_date) ? 
                    new Date(taskWithDetails?.start_date ?? task.start_date).toLocaleDateString() : 
                    'Not set'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due:</span>
                <span className={`font-medium ${
                  (taskWithDetails?.due_date ?? task.due_date) && new Date(taskWithDetails?.due_date ?? task.due_date) < new Date() ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {(taskWithDetails?.due_date ?? task.due_date) ? 
                    new Date(taskWithDetails?.due_date ?? task.due_date).toLocaleDateString() : 
                    'Not set'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-orange-600" />
              Time
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated:</span>
                <span className="font-medium">
                  {formatHoursWithSuffix(taskWithDetails?.time_tracking?.estimated_hours ?? task.time_tracking?.estimated_hours)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Logged:</span>
                <span className="font-medium">
                  {formatHoursWithSuffix(taskWithDetails?.time_tracking?.actual_hours ?? task.time_tracking?.actual_hours)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Variance:</span>
                <span className={`font-medium ${
                  ((taskWithDetails?.time_tracking?.actual_hours ?? task.time_tracking?.actual_hours) || 0) > 
                  ((taskWithDetails?.time_tracking?.estimated_hours ?? task.time_tracking?.estimated_hours) || 0) 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {(taskWithDetails?.time_tracking?.estimated_hours ?? task.time_tracking?.estimated_hours)
                    ? `${(((taskWithDetails?.time_tracking?.actual_hours ?? task.time_tracking?.actual_hours) || 0) - 
                           ((taskWithDetails?.time_tracking?.estimated_hours ?? task.time_tracking?.estimated_hours) || 0)) > 0 ? '+' : ''}${
                           formatHours(((taskWithDetails?.time_tracking?.actual_hours ?? task.time_tracking?.actual_hours) || 0) - 
                           ((taskWithDetails?.time_tracking?.estimated_hours ?? task.time_tracking?.estimated_hours) || 0))}h`
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-600" />
            Description
          </h3>
          <div className="prose prose-sm max-w-none text-gray-700">
            {task.description.split('\n').map((line, index) => (
              <p key={index} className="mb-2">{line || '\u00A0'}</p>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-purple-600" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Edit className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Task updated</div>
                <div className="text-xs text-gray-500">
                  {new Date(task.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Task created</div>
                <div className="text-xs text-gray-500">
                  {new Date(task.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Tasks */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Link className="h-5 w-5 mr-2 text-indigo-600" />
            Related Tasks
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({relatedTasks.length})
            </span>
          </h3>
          <div className="space-y-3">
            {relatedTasks.slice(0, 5).map((relatedTask) => (
              <div key={relatedTask.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-100 cursor-pointer transition-colors">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${statusConfig[relatedTask.status]?.color}`}>
                    {statusConfig[relatedTask.status]?.icon}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${
                    relatedTask.relationshipType === 'dependency' 
                      ? 'bg-orange-50 text-orange-700 border-orange-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {relatedTask.relationshipLabel}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{relatedTask.title}</div>
                  <div className="text-xs text-gray-500 flex items-center space-x-2">
                    <span>{relatedTask.priority} priority</span>
                    {relatedTask.due_date && (
                      <>
                        <span>•</span>
                        <span>Due: {new Date(relatedTask.due_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {relatedTasks.length === 0 && (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Link className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">No related tasks found</p>
                <p className="text-xs text-gray-500">No dependencies or dependents</p>
              </div>
            )}
            {relatedTasks.length > 5 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setActiveTab('dependencies')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View all {relatedTasks.length} related tasks →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags and Labels */}
      {(task.tags?.length > 0 || task.labels?.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Tag className="h-5 w-5 mr-2 text-green-600" />
            Tags & Labels
          </h3>
          <div className="flex flex-wrap gap-2">
            {task.tags?.map((tag, index) => (
              <span key={index} className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                #{tag}
              </span>
            ))}
            {task.labels?.map((label, index) => (
              <span key={index} className="inline-flex px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedTaskDetailModal