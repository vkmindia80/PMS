import React, { useState, useEffect } from 'react'
import { 
  X, Save, Plus, Minus, Calendar, Clock, Users, Flag, 
  Tag, FileText, Link, AlertTriangle, CheckSquare, User
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useProjectFilterContext } from '../../contexts/ProjectFilterContext'
import { API_URL } from '../../utils/config'
import toast from 'react-hot-toast'

interface TaskFormData {
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  type: 'task' | 'bug' | 'feature' | 'improvement' | 'research'
  project_id: string
  assignee_ids: string[]
  due_date: string
  start_date: string
  estimated_hours: string
  tags: string[]
  pre_tasks: Array<{
    task_id: string
    dependency_type: 'depends_on' | 'blocks'
  }>
  post_tasks: Array<{
    task_id: string
    dependency_type: 'blocks' | 'depends_on'
  }>
  progress_percentage: number
}

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface Project {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
}

interface EnhancedTaskCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (taskData: any) => Promise<void>
  initialProjectId?: string
}

export const EnhancedTaskCreateModal: React.FC<EnhancedTaskCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialProjectId
}) => {
  const { tokens, user } = useAuth()
  const { projects } = useProjectFilterContext()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [newTag, setNewTag] = useState('')
  const [searchDependency, setSearchDependency] = useState('')

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    type: 'task',
    project_id: initialProjectId || '',
    assignee_ids: [],
    due_date: '',
    start_date: '',
    estimated_hours: '',
    tags: [],
    pre_tasks: [],
    post_tasks: [],
    progress_percentage: 0
  })

  const statusOptions = [
    { value: 'todo', label: 'To Do', icon: '📋' },
    { value: 'in_progress', label: 'In Progress', icon: '⚡' },
    { value: 'in_review', label: 'In Review', icon: '👁️' },
    { value: 'blocked', label: 'Blocked', icon: '🚫' },
    { value: 'completed', label: 'Completed', icon: '✅' },
    { value: 'cancelled', label: 'Cancelled', icon: '❌' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low', icon: '🔽', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', icon: '◀️', color: 'text-yellow-600' },
    { value: 'high', label: 'High', icon: '🔺', color: 'text-orange-600' },
    { value: 'critical', label: 'Critical', icon: '🚨', color: 'text-red-600' }
  ]

  const typeOptions = [
    { value: 'task', label: 'Task', icon: '📝' },
    { value: 'bug', label: 'Bug', icon: '🐛' },
    { value: 'feature', label: 'Feature', icon: '✨' },
    { value: 'improvement', label: 'Improvement', icon: '🔧' },
    { value: 'research', label: 'Research', icon: '🔍' }
  ]

  const dependencyTypes = [
    { value: 'blocks', label: 'Blocks', description: 'This task blocks the selected task' },
    { value: 'depends_on', label: 'Depends On', description: 'This task depends on the selected task' }
  ]

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      fetchAvailableTasks()
      // Reset form data
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        type: 'task',
        project_id: initialProjectId || (projects.length > 0 ? projects[0].id : ''),
        assignee_ids: [],
        due_date: '',
        start_date: '',
        estimated_hours: '',
        tags: [],
        dependencies: [],
        progress_percentage: 0
      })
    }
  }, [isOpen, initialProjectId, projects])

  const fetchUsers = async () => {
    if (!tokens?.access_token) return

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUsers(userData)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAvailableTasks = async () => {
    if (!tokens?.access_token) return

    try {
      const response = await fetch(`${API_URL}/api/tasks?limit=100`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const tasksData = await response.json()
        setAvailableTasks(tasksData)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Task title is required')
      return
    }

    if (!formData.project_id) {
      toast.error('Please select a project')
      return
    }

    setLoading(true)

    try {
      const taskData = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority,
        type: formData.type,
        project_id: formData.project_id,
        assignee_ids: formData.assignee_ids,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        time_tracking: {
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined
        },
        tags: formData.tags,
        dependencies: formData.dependencies,
        progress_percentage: formData.progress_percentage
      }

      await onSubmit(taskData)
      onClose()
      toast.success('Task created successfully!')
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }

  const handleAddDependency = (taskId: string, type: string) => {
    if (!formData.dependencies.find(dep => dep.task_id === taskId)) {
      setFormData({
        ...formData,
        dependencies: [...formData.dependencies, {
          task_id: taskId,
          dependency_type: type as any
        }]
      })
    }
  }

  const handleRemoveDependency = (taskId: string) => {
    setFormData({
      ...formData,
      dependencies: formData.dependencies.filter(dep => dep.task_id !== taskId)
    })
  }

  const toggleAssignee = (userId: string) => {
    if (formData.assignee_ids.includes(userId)) {
      setFormData({
        ...formData,
        assignee_ids: formData.assignee_ids.filter(id => id !== userId)
      })
    } else {
      setFormData({
        ...formData,
        assignee_ids: [...formData.assignee_ids, userId]
      })
    }
  }

  const filteredTasks = availableTasks.filter(task => 
    task.title.toLowerCase().includes(searchDependency.toLowerCase()) ||
    task.id.toLowerCase().includes(searchDependency.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="task-create-modal-overlay">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" data-testid="task-create-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Plus className="h-6 w-6 mr-2 text-blue-600" />
            Create New Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="task-create-close-button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-96">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Title */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title..."
                  data-testid="task-title-input"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project *
                </label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project: Project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Flag className="h-4 w-4 inline mr-1" />
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Describe the task in detail..."
              />
            </div>

            {/* Dates and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="8"
                />
              </div>
            </div>

            {/* Team Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Assign Team Members
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-gray-500 text-sm">No team members available</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((userItem) => (
                      <label key={userItem.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.assignee_ids.includes(userItem.id)}
                          onChange={() => toggleAssignee(userItem.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {userItem.first_name} {userItem.last_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({userItem.email})
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="h-4 w-4 inline mr-1" />
                Tags
              </label>
              
              {/* Existing Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add New Tag */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Dependencies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Link className="h-4 w-4 inline mr-1" />
                Task Dependencies (Pre-tasks & Post-tasks)
              </label>
              
              {/* Existing Dependencies */}
              <div className="space-y-2 mb-4">
                {formData.dependencies.map((dep) => {
                  const task = availableTasks.find(t => t.id === dep.task_id)
                  return (
                    <div key={dep.task_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div>
                        <div className="font-medium text-gray-900">
                          {task?.title || `Task ${dep.task_id.substring(0, 8)}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          Type: {dependencyTypes.find(dt => dt.value === dep.dependency_type)?.label}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(dep.task_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add Dependencies */}
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="mb-3">
                  <input
                    type="text"
                    value={searchDependency}
                    onChange={(e) => setSearchDependency(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search for tasks to add as dependencies..."
                  />
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {filteredTasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-sm text-gray-900">{task.title}</div>
                        <div className="text-xs text-gray-500">ID: {task.id.substring(0, 8)}</div>
                      </div>
                      <div className="flex space-x-1">
                        {dependencyTypes.map((depType) => (
                          <button
                            key={depType.value}
                            type="button"
                            onClick={() => handleAddDependency(task.id, depType.value)}
                            disabled={formData.dependencies.find(dep => dep.task_id === task.id) !== undefined}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={depType.description}
                          >
                            {depType.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {filteredTasks.length === 0 && searchDependency && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No tasks found matching "{searchDependency}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CheckSquare className="h-4 w-4 inline mr-1" />
                Initial Progress: {formData.progress_percentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress_percentage}
                onChange={(e) => setFormData({ ...formData, progress_percentage: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.project_id}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              data-testid="task-create-submit-button"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EnhancedTaskCreateModal