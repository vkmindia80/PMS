import React, { useState, useEffect } from 'react'
import { 
  X, Edit, Save, Clock, Users, Calendar, Flag, Link, 
  MessageSquare, Paperclip, Activity, CheckSquare,
  AlertTriangle, ArrowRight, ArrowLeft, Plus, Minus,
  User, Tag, FileText, History
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../utils/config'
import { formatHours, formatHoursWithSuffix, formatHoursVariance } from '../../utils/hourFormatter'
import toast from 'react-hot-toast'
import { TaskCommentsTab } from './TaskCommentsTab'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  type: 'task' | 'bug' | 'feature' | 'improvement' | 'research'
  project_id: string
  assignee_id?: string
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
  }>
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

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onDelete?: (taskId: string) => Promise<void>
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const { tokens, user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity' | 'dependencies'>('details')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentThreads, setCommentThreads] = useState<any[]>([])
  const [activities, setActivities] = useState<TaskActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [timeLogHours, setTimeLogHours] = useState('')
  const [timeLogDescription, setTimeLogDescription] = useState('')

  // Enhanced task data with user details
  const [taskWithDetails, setTaskWithDetails] = useState<any>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [dependentTasks, setDependentTasks] = useState<any[]>([])
  const [relatedTasks, setRelatedTasks] = useState<any[]>([])

  // Editable task data
  const [editData, setEditData] = useState<Partial<Task>>({})

  const statusConfig = {
    todo: { label: 'To Do', color: 'bg-gray-100 text-gray-800', icon: '📋' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
    in_review: { label: 'In Review', color: 'bg-yellow-100 text-yellow-800', icon: '👁️' },
    blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800', icon: '🚫' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: '✅' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: '❌' }
  }

  const priorityConfig = {
    low: { label: 'Low', color: 'text-green-600', icon: '🔽' },
    medium: { label: 'Medium', color: 'text-yellow-600', icon: '◀️' },
    high: { label: 'High', color: 'text-orange-600', icon: '🔺' },
    critical: { label: 'Critical', color: 'text-red-600', icon: '🚨' }
  }

  useEffect(() => {
    if (task && isOpen) {
      console.log('TaskDetailModal: Opening modal for task:', task.id, task.title)
      setEditData({})
      setIsEditing(false)
      fetchTaskWithDetails()
      fetchAvailableUsers()
      if (activeTab === 'comments') {
        fetchComments()
      } else if (activeTab === 'activity') {
        fetchActivity()
      } else if (activeTab === 'dependencies') {
        fetchDependentTasks()
        fetchRelatedTasks()
      }
    }
  }, [task, isOpen, activeTab])

  const fetchTaskWithDetails = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/tasks/${task.id}/detailed`, {
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
      const response = await fetch(`${API_URL}/api/users`, {
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

  const fetchDependentTasks = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}/dependents`, {
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

  const fetchRelatedTasks = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      // Fetch all tasks from the same project to show as potential dependencies
      const response = await fetch(`${API_URL}/api/tasks?project_id=${task.project_id}&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const tasks = await response.json()
        // Convert task summaries to full tasks for compatibility
        const fullTasks = tasks.map((t: any) => ({
          ...t,
          status: typeof t.status === 'string' ? t.status : t.status?.value || 'todo',
          priority: typeof t.priority === 'string' ? t.priority : t.priority?.value || 'medium',
          type: typeof t.type === 'string' ? t.type : t.type?.value || 'task'
        }))
        setRelatedTasks(fullTasks)
      }
    } catch (error) {
      console.error('Error fetching related tasks:', error)
    }
  }

  const fetchComments = async (skipLoadingCheck = false) => {
    if (!task || !tokens?.access_token) return
    
    // Prevent concurrent fetches unless explicitly requested
    if (!skipLoadingCheck && isCommentsLoading) {
      console.log('🔄 Comments fetch already in progress, skipping...')
      return
    }
    
    try {
      setIsCommentsLoading(true)
      // Use threaded comments endpoint for proper display
      const threadsUrl = `${API_URL}/api/comments/threads/task/${task.id}`
      const flatUrl = `${API_URL}/api/comments/?entity_type=task&entity_id=${task.id}`
      
      console.log('🔍 Fetching threaded comments from:', threadsUrl)
      console.log('🔍 Task ID:', task.id)
      
      // Fetch both threaded and flat comments for compatibility
      const [threadsResponse, flatResponse] = await Promise.all([
        fetch(threadsUrl, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(flatUrl, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      ])
      
      console.log('🔍 Threads API Response Status:', threadsResponse.status)
      console.log('🔍 Flat API Response Status:', flatResponse.status)
      
      if (threadsResponse.ok && flatResponse.ok) {
        const [threadsData, flatData] = await Promise.all([
          threadsResponse.json(),
          flatResponse.json()
        ])
        
        console.log('🔍 Fetched threads data:', threadsData)
        console.log('🔍 Fetched flat comments data:', flatData)
        console.log('🔍 Threads count:', threadsData.length)
        console.log('🔍 Comments count:', flatData.length)
        
        setCommentThreads(threadsData)
        setComments(flatData)
      } else {
        console.error('❌ Failed to fetch comments')
        if (!threadsResponse.ok) {
          console.error('❌ Threads error:', threadsResponse.status, threadsResponse.statusText)
        }
        if (!flatResponse.ok) {
          console.error('❌ Flat comments error:', flatResponse.status, flatResponse.statusText)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching comments:', error)
    } finally {
      setIsCommentsLoading(false)
    }
  }

  const fetchActivity = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/tasks/${task.id}/activity`, {
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
    
    try {
      await onUpdate(task.id, editData)
      setIsEditing(false)
      setEditData({})
      toast.success('Task updated successfully!')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleAddComment = async (commentType: 'comment' | 'note' | 'review' = 'comment') => {
    if (!task || !newComment.trim() || !tokens?.access_token) return
    
    try {
      const response = await fetch(`${API_URL}/api/comments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment,
          type: commentType,
          entity_type: 'task',
          entity_id: task.id
        })
      })
      
      if (response.ok) {
        const newCommentData = await response.json()
        setNewComment('')
        // Only refetch comments to ensure proper threading and avoid duplicates
        fetchComments()
        // Update task comment count locally
        task.comment_count = (task.comment_count || 0) + 1
        toast.success(`${commentType.charAt(0).toUpperCase() + commentType.slice(1)} added!`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error(`Failed to add ${commentType}: ${error.message}`)
    }
  }

  const handleAddReaction = async (commentId: string, emoji: string) => {
    if (!tokens?.access_token) return
    
    try {
      const response = await fetch(`${API_URL}/api/comments/${commentId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const updatedComment = await response.json()
        // Update both comment threads and flat comments to maintain consistency
        setCommentThreads(prev => 
          prev.map(thread => {
            const updateCommentInThread = (comment: any): any => {
              if (comment.id === commentId) {
                return updatedComment
              }
              if (comment.nested_replies) {
                return {
                  ...comment,
                  nested_replies: comment.nested_replies.map(updateCommentInThread)
                }
              }
              return comment
            }
            
            return {
              ...thread,
              root_comment: updateCommentInThread(thread.root_comment),
              replies: thread.replies.map(updateCommentInThread)
            }
          })
        )
        setComments(prev => prev.map(c => c.id === commentId ? updatedComment : c))
        toast.success('Reaction added!')
      } else {
        throw new Error('Failed to add reaction')
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast.error('Failed to add reaction')
    }
  }

  const handleReply = async (parentId: string, content: string) => {
    if (!task || !content.trim() || !tokens?.access_token) return
    
    try {
      const response = await fetch(`${API_URL}/api/comments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          type: 'comment',
          entity_type: 'task',
          entity_id: task.id,
          parent_id: parentId
        })
      })
      
      if (response.ok) {
        const newReply = await response.json()
        // Only refetch to ensure proper threading and avoid duplicates
        fetchComments()
        toast.success('Reply added!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create reply')
      }
    } catch (error) {
      console.error('Error adding reply:', error)
      toast.error(`Failed to add reply: ${error.message}`)
    }
  }

  const handleLogTime = async () => {
    if (!task || !timeLogHours || !tokens?.access_token) return
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}/time/log?hours=${timeLogHours}&description=${encodeURIComponent(timeLogDescription)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setTimeLogHours('')
        setTimeLogDescription('')
        // Refresh task data
        toast.success('Time logged successfully!')
      }
    } catch (error) {
      console.error('Error logging time:', error)
      toast.error('Failed to log time')
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="task-detail-modal-overlay">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="task-detail-modal">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusConfig[task.status]?.color}`}>
                  {statusConfig[task.status]?.icon} {statusConfig[task.status]?.label}
                </span>
                <span className={`text-sm font-medium ${priorityConfig[task.priority]?.color}`}>
                  {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
                </span>
              </div>
              
              {/* Quick Info */}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>
                    {(task.assignee_ids && task.assignee_ids.length > 0) 
                      ? `${task.assignee_ids.length} assignee${task.assignee_ids.length > 1 ? 's' : ''}`
                      : task.assignee_id 
                        ? '1 assignee' 
                        : 'Unassigned'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{task.comment_count || 0} comments</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                data-testid="task-edit-button"
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
                  }}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  data-testid="task-save-button"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="task-close-button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          </div>
        </div>

        {/* Task Title */}
        <div className="px-6 py-4 border-b border-gray-200">
          {isEditing ? (
            <input
              type="text"
              value={editData.title !== undefined ? editData.title : task.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full text-xl font-semibold text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Task title"
            />
          ) : (
            <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
          )}
          
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>ID: {task.id.substring(0, 8)}</span>
            <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
            <span>Updated: {new Date(task.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'details', label: 'Details', icon: FileText },
              { key: 'comments', label: 'Comments', icon: MessageSquare, count: task.comment_count },
              { key: 'activity', label: 'Activity', icon: Activity },
              { key: 'dependencies', label: 'Dependencies', icon: Link }
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                data-testid={`task-tab-${key}`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'details' && (
            <TaskDetailsTab
              task={task}
              taskWithDetails={taskWithDetails}
              availableUsers={availableUsers}
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
              statusConfig={statusConfig}
              priorityConfig={priorityConfig}
              onLogTime={handleLogTime}
              timeLogHours={timeLogHours}
              setTimeLogHours={setTimeLogHours}
              timeLogDescription={timeLogDescription}
              setTimeLogDescription={setTimeLogDescription}
            />
          )}
          
          {activeTab === 'comments' && (
            <TaskCommentsTab
              comments={comments}
              commentThreads={commentThreads}
              loading={loading}
              newComment={newComment}
              setNewComment={setNewComment}
              onAddComment={handleAddComment}
              onAddReaction={handleAddReaction}
              onReply={handleReply}
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
              task={task}
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

// Task Details Tab Component
interface TaskDetailsTabProps {
  task: Task
  taskWithDetails?: any
  availableUsers?: any[]
  isEditing: boolean
  editData: Partial<Task>
  setEditData: (data: Partial<Task>) => void
  statusConfig: any
  priorityConfig: any
  onLogTime: () => void
  timeLogHours: string
  setTimeLogHours: (value: string) => void
  timeLogDescription: string
  setTimeLogDescription: (value: string) => void
}

const TaskDetailsTab: React.FC<TaskDetailsTabProps> = ({ 
  task, 
  taskWithDetails,
  availableUsers = [],
  isEditing, 
  editData, 
  setEditData, 
  statusConfig, 
  priorityConfig,
  onLogTime,
  timeLogHours,
  setTimeLogHours,
  timeLogDescription,
  setTimeLogDescription
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Task Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <CheckSquare className="h-5 w-5 mr-2 text-blue-600" />
          Task Summary & Overview
        </h3>
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {task.progress_percentage || 0}%
            </div>
            <div className="text-sm text-gray-600">Progress</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${task.progress_percentage || 0}%` }}
              />
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {task.time_tracking?.estimated_hours || 0}h
            </div>
            <div className="text-sm text-gray-600">Estimated</div>
            <div className="text-xs text-gray-500 mt-1">Time Budget</div>
          </div>
          <div className="text-center bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">
              {task.time_tracking?.actual_hours || 0}h
            </div>
            <div className="text-sm text-gray-600">Logged</div>
            <div className="text-xs text-gray-500 mt-1">
              {task.time_tracking?.logged_time?.length || 0} entries
            </div>
          </div>
          <div className="text-center bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {task.dependencies?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Dependencies</div>
            <div className="text-xs text-gray-500 mt-1">Blocking tasks</div>
          </div>
        </div>

        {/* Task Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg p-4 shadow-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Team & Assignment
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Assignees:</span>
                <span className="font-medium">
                  {(task.assignee_ids && task.assignee_ids.length > 0) 
                    ? `${task.assignee_ids.length} member${task.assignee_ids.length > 1 ? 's' : ''}`
                    : task.assignee_id 
                      ? '1 member' 
                      : 'Unassigned'
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reporter:</span>
                <span className="font-medium">Task Creator</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Comments:</span>
                <span className="font-medium">{task.comment_count || 0}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline & Dates
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{new Date(task.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{new Date(task.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Health Indicator */}
        <div className="mt-4 p-3 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                task.status === 'completed' ? 'bg-green-500' :
                task.status === 'blocked' ? 'bg-red-500' :
                task.status === 'in_progress' ? 'bg-blue-500' :
                task.status === 'in_review' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}></div>
              <span className="font-medium text-gray-900">
                Task Health: {
                  task.status === 'completed' ? 'Completed' :
                  task.status === 'blocked' ? 'Needs Attention' :
                  task.status === 'in_progress' ? 'On Track' :
                  task.status === 'in_review' ? 'Under Review' :
                  'Pending'
                }
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {task.progress_percentage >= 75 ? 'Near completion' :
               task.progress_percentage >= 50 ? 'Making progress' :
               task.progress_percentage >= 25 ? 'Getting started' :
               'Just beginning'}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        {isEditing ? (
          <textarea
            value={editData.description !== undefined ? editData.description : (task.description || '')}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Task description..."
          />
        ) : (
          <div className="text-gray-900 whitespace-pre-wrap">
            {task.description || 'No description provided.'}
          </div>
        )}
      </div>

      {/* Task Properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          {isEditing ? (
            <select
              value={editData.status || task.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(statusConfig).map(([key, config]: [string, any]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          ) : (
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusConfig[task.status]?.color}`}>
              {statusConfig[task.status]?.icon} {statusConfig[task.status]?.label}
            </span>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          {isEditing ? (
            <select
              value={editData.priority || task.priority}
              onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(priorityConfig).map(([key, config]: [string, any]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          ) : (
            <span className={`text-sm font-medium ${priorityConfig[task.priority]?.color}`}>
              {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
            </span>
          )}
        </div>

        {/* Assignees - Enhanced Display */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Users className="inline h-4 w-4 mr-1" />
            Assigned Team Members
          </label>
          {isEditing ? (
            <select
              multiple
              value={editData.assignee_ids !== undefined ? editData.assignee_ids : (task.assignee_ids || [])}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                setEditData({ ...editData, assignee_ids: selectedOptions });
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              size={Math.min(availableUsers?.length || 1, 4)}
            >
              {availableUsers?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(task.assignee_ids && task.assignee_ids.length > 0) ? (
                task.assignee_ids.map((assigneeId) => {
                  const assignee = availableUsers?.find(user => user.id === assigneeId);
                  return (
                    <div key={assigneeId} className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unknown User'}
                        </div>
                        {assignee && (
                          <div className="text-sm text-gray-500">{assignee.email}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : task.assignee_id ? (
                // Handle backward compatibility with single assignee_id
                (() => {
                  const assignee = availableUsers?.find(user => user.id === task.assignee_id);
                  return (
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unknown User'}
                        </div>
                        {assignee && (
                          <div className="text-sm text-gray-500">{assignee.email}</div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg col-span-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">No assignees</div>
                    <div className="text-sm text-gray-400">This task is unassigned</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
          {isEditing ? (
            <input
              type="datetime-local"
              value={editData.due_date !== undefined ? 
                (editData.due_date ? new Date(editData.due_date).toISOString().slice(0, 16) : '') :
                (task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '')
              }
              onChange={(e) => setEditData({ 
                ...editData, 
                due_date: e.target.value ? new Date(e.target.value).toISOString() : null 
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <div className="text-gray-900">
              {task.due_date ? new Date(task.due_date).toLocaleString() : 'Not set'}
            </div>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          {isEditing ? (
            <input
              type="datetime-local"
              value={editData.start_date !== undefined ? 
                (editData.start_date ? new Date(editData.start_date).toISOString().slice(0, 16) : '') :
                (task.start_date ? new Date(task.start_date).toISOString().slice(0, 16) : '')
              }
              onChange={(e) => setEditData({ 
                ...editData, 
                start_date: e.target.value ? new Date(e.target.value).toISOString() : null 
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <div className="text-gray-900">
              {task.start_date ? new Date(task.start_date).toLocaleString() : 'Not set'}
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Progress: {Math.round(editData.progress_percentage !== undefined ? editData.progress_percentage : task.progress_percentage)}%
        </label>
        {isEditing ? (
          <input
            type="range"
            min="0"
            max="100"
            value={editData.progress_percentage !== undefined ? editData.progress_percentage : task.progress_percentage}
            onChange={(e) => setEditData({ ...editData, progress_percentage: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        ) : (
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${task.progress_percentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Time Tracking */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Time Tracking
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600">Estimated</label>
            <div className="text-lg font-semibold text-gray-900">
              {task.time_tracking.estimated_hours || 0}h
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Logged</label>
            <div className="text-lg font-semibold text-gray-900">
              {task.time_tracking.actual_hours || 0}h
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Variance</label>
            <div className={`text-lg font-semibold ${
              (task.time_tracking.actual_hours || 0) > (task.time_tracking.estimated_hours || 0) 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {task.time_tracking.estimated_hours 
                ? formatHoursVariance(task.time_tracking.actual_hours, task.time_tracking.estimated_hours)
                : 'N/A'
              }
            </div>
          </div>
        </div>

        {/* Log Time */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Log Time</h4>
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Hours</label>
              <input
                type="number"
                step="0.25"
                value={timeLogHours}
                onChange={(e) => setTimeLogHours(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2.5"
              />
            </div>
            <div className="flex-2">
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={timeLogDescription}
                onChange={(e) => setTimeLogDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What did you work on?"
              />
            </div>
            <button
              onClick={onLogTime}
              disabled={!timeLogHours}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Log Time
            </button>
          </div>
        </div>

        {/* Time Entries */}
        {task.time_tracking.logged_time && task.time_tracking.logged_time.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Recent Time Entries</h4>
            <div className="space-y-2">
              {task.time_tracking.logged_time.slice(-5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                  <div>
                    <div className="font-medium text-gray-900">{entry.hours}h</div>
                    <div className="text-sm text-gray-600">{entry.description}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Internal TaskCommentsTab component removed - now using the imported one from ./TaskCommentsTab with advanced features

// Activity Tab Component
const TaskActivityTab: React.FC<{
  activities: TaskActivity[]
  loading: boolean
  availableUsers?: any[]
}> = ({ activities, loading, availableUsers = [] }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'task_created': return '✨'
      case 'status_changed': return '🔄'
      case 'task_updated': return '✏️'
      case 'time_logged': return '⏰'
      case 'task_moved': return '📋'
      case 'comment_added': return '💬'
      default: return '📝'
    }
  }

  const getActivityDescription = (activity: TaskActivity) => {
    switch (activity.action) {
      case 'task_created':
        return 'created this task'
      case 'status_changed':
        return `changed status from ${activity.details.from} to ${activity.details.to}`
      case 'task_updated':
        return 'updated the task'
      case 'time_logged':
        return `logged ${activity.details.hours} hours${activity.details.description ? ` - ${activity.details.description}` : ''}`
      case 'task_moved':
        return `moved task to ${activity.details.to_status}`
      default:
        return activity.action.replace(/_/g, ' ')
    }
  }

  return (
    <div className="p-6">
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                {getActivityIcon(activity.action)}
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    {(() => {
                      const user = availableUsers.find(u => u.id === activity.user_id);
                      return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
                    })()}
                  </span>
                  <span className="text-gray-600 ml-1">{getActivityDescription(activity)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TaskDetailModal