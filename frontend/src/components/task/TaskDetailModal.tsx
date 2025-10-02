import React, { useState, useEffect } from 'react'
import { 
  X, Edit, Save, Clock, Users, Calendar, Flag, Link, 
  MessageSquare, Paperclip, Activity, CheckSquare,
  AlertTriangle, ArrowRight, ArrowLeft, Plus, Minus,
  User, Tag, FileText, History
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../utils/config'
import toast from 'react-hot-toast'

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
  const [activities, setActivities] = useState<TaskActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [timeLogHours, setTimeLogHours] = useState('')
  const [timeLogDescription, setTimeLogDescription] = useState('')

  // Enhanced task data with user details
  const [taskWithDetails, setTaskWithDetails] = useState<any>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [dependentTasks, setDependentTasks] = useState<any[]>([])

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

  const fetchComments = async () => {
    if (!task || !tokens?.access_token) return
    
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/comments?entity_type=task&entity_id=${task.id}`, {
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

  const handleAddComment = async () => {
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
          entity_type: 'task',
          entity_id: task.id,
          author_id: user?.id
        })
      })
      
      if (response.ok) {
        setNewComment('')
        fetchComments()
        toast.success('Comment added!')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" data-testid="task-detail-modal">
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
        <div className="flex-1 overflow-y-auto max-h-96">
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
              task={task}
              dependentTasks={dependentTasks}
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
      {/* Task Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CheckSquare className="h-5 w-5 mr-2 text-blue-600" />
          Task Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {task.progress_percentage || 0}%
            </div>
            <div className="text-sm text-gray-600">Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {task.time_tracking?.estimated_hours || 0}h
            </div>
            <div className="text-sm text-gray-600">Estimated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {task.time_tracking?.actual_hours || 0}h
            </div>
            <div className="text-sm text-gray-600">Logged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {task.dependencies?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Dependencies</div>
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
                ? `${((task.time_tracking.actual_hours || 0) - task.time_tracking.estimated_hours) > 0 ? '+' : ''}${((task.time_tracking.actual_hours || 0) - task.time_tracking.estimated_hours).toFixed(1)}h`
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

// Comments Tab Component
const TaskCommentsTab: React.FC<{
  comments: Comment[]
  loading: boolean
  newComment: string
  setNewComment: (value: string) => void
  onAddComment: () => void
  availableUsers?: any[]
}> = ({ comments, loading, newComment, setNewComment, onAddComment, availableUsers = [] }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Add Comment */}
      <div className="mb-6">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button
            onClick={onAddComment}
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Comment
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No comments yet. Be the first to add one!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border border-l-4 border-l-blue-400 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {(() => {
                        const user = availableUsers.find(u => u.id === comment.author_id);
                        return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
                      })()}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                      {comment.is_edited && (
                        <span className="text-xs text-gray-400">(edited)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {comment.is_pinned && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      📌 Pinned
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    comment.type === 'review' ? 'bg-purple-100 text-purple-800' :
                    comment.type === 'approval' ? 'bg-green-100 text-green-800' :
                    comment.type === 'note' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {comment.type === 'review' ? '👁️ Review' :
                     comment.type === 'approval' ? '✅ Approval' :
                     comment.type === 'note' ? '📝 Note' :
                     '💬 Comment'}
                  </span>
                </div>
              </div>
              <div className="text-gray-900 whitespace-pre-wrap pl-12">
                {comment.content}
              </div>
              {comment.reply_count > 0 && (
                <div className="mt-3 pl-12">
                  <div className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    <span>{comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}</span>
                  </div>
                </div>
              )}
              {comment.reactions && comment.reactions.length > 0 && (
                <div className="mt-3 pl-12 flex items-center space-x-2">
                  {comment.reactions.slice(0, 3).map((reaction, idx) => (
                    <span key={idx} className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {reaction.emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

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

// Dependencies Tab Component  
const TaskDependenciesTab: React.FC<{
  task: Task
  dependentTasks?: any[]
  isEditing: boolean
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
}> = ({ task, dependentTasks = [], isEditing, onUpdate }) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dependencies (Pre-tasks) */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Dependencies (Pre-tasks)
          </h3>
          <div className="space-y-2">
            {task.dependencies.length === 0 ? (
              <p className="text-gray-500 text-sm">No dependencies</p>
            ) : (
              task.dependencies.map((dep, index) => {
                const dependentTask = dependentTasks.find(t => t.id === dep.task_id);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-orange-400">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                          <ArrowLeft className="h-3 w-3 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {dependentTask ? dependentTask.title : `Task ${dep.task_id.substring(0, 8)}`}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center space-x-2">
                            <span>Type: {dep.dependency_type}</span>
                            {dependentTask && (
                              <>
                                <span>•</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  dependentTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  dependentTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {dependentTask.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isEditing && (
                      <button className="text-red-600 hover:text-red-800">
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {isEditing && (
            <button className="mt-3 flex items-center space-x-1 text-blue-600 hover:text-blue-800">
              <Plus className="h-4 w-4" />
              <span>Add Dependency</span>
            </button>
          )}
        </div>

        {/* Dependents (Post-tasks) */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ArrowRight className="h-5 w-5 mr-2" />
            Dependents (Post-tasks)
          </h3>
          <div className="space-y-2">
            {dependentTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">No dependent tasks found</p>
            ) : (
              dependentTasks.map((depTask) => (
                <div key={depTask.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <ArrowRight className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{depTask.title}</div>
                        <div className="text-sm text-gray-600 flex items-center space-x-2">
                          <span>Priority: {depTask.priority}</span>
                          <span>•</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            depTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                            depTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            depTask.status === 'blocked' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {depTask.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {depTask.due_date && (
                            <>
                              <span>•</span>
                              <span>Due: {new Date(depTask.due_date).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isEditing && (
                    <button className="text-red-600 hover:text-red-800">
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          {isEditing && (
            <button className="mt-3 flex items-center space-x-1 text-blue-600 hover:text-blue-800">
              <Plus className="h-4 w-4" />
              <span>Add Dependent Task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskDetailModal