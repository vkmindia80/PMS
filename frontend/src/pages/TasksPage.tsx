import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

// Task-related interfaces
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

interface TaskAnalytics {
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
  completion_rate: number
  status_distribution: Record<string, number>
  priority_distribution: Record<string, number>
  type_distribution: Record<string, number>
  time_tracking: {
    total_estimated_hours: number
    total_actual_hours: number
    time_variance: number
  }
}

const TasksPage: React.FC = () => {
  const { user, token } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null)

  // View states
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'analytics'>('kanban')
  const [kanbanView, setKanbanView] = useState<'status' | 'assignee' | 'project'>('status')
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Kanban board data
  const [kanbanData, setKanbanData] = useState<Record<string, Task[]>>({})

  const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

  // Status configurations
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

  // Fetch tasks
  const fetchTasks = async () => {
    if (!token) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/api/tasks/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`)
      }

      const tasksData = await response.json()
      setTasks(tasksData)
      setFilteredTasks(tasksData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch kanban board data
  const fetchKanbanData = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_BASE}/api/tasks/kanban/board?view_by=${kanbanView}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setKanbanData(data)
      }
    } catch (err) {
      console.error('Error fetching kanban data:', err)
    }
  }

  // Fetch analytics
  const fetchAnalytics = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_BASE}/api/tasks/analytics/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    }
  }

  // Create task
  const handleCreateTask = async (taskData: any) => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_BASE}/api/tasks/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        toast.success('Task created successfully!')
        setShowCreateModal(false)
        fetchTasks()
        if (viewMode === 'kanban') fetchKanbanData()
        if (viewMode === 'analytics') fetchAnalytics()
      } else {
        throw new Error('Failed to create task')
      }
    } catch (err) {
      toast.error('Failed to create task')
      console.error('Error creating task:', err)
    }
  }

  // Update task status (for Kanban drag & drop)
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string, newAssigneeId?: string) => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_BASE}/api/tasks/kanban/move?task_id=${taskId}&new_status=${newStatus}${newAssigneeId ? `&new_assignee_id=${newAssigneeId}` : ''}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Task updated successfully!')
        fetchTasks()
        if (viewMode === 'kanban') fetchKanbanData()
      } else {
        throw new Error('Failed to update task')
      }
    } catch (err) {
      toast.error('Failed to update task')
      console.error('Error updating task:', err)
    }
  }

  // Log time entry
  const handleLogTime = async (taskId: string, hours: number, description: string) => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}/time/log?hours=${hours}&description=${encodeURIComponent(description)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Time logged successfully!')
        setShowTimeModal(false)
        setSelectedTask(null)
        fetchTasks()
      } else {
        throw new Error('Failed to log time')
      }
    } catch (err) {
      toast.error('Failed to log time')
      console.error('Error logging time:', err)
    }
  }

  // Filter tasks
  const applyFilters = () => {
    let filtered = tasks

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(task => 
        assigneeFilter === 'unassigned' 
          ? !task.assignee_id 
          : task.assignee_id === assigneeFilter
      )
    }

    setFilteredTasks(filtered)
  }

  // Effects
  useEffect(() => {
    fetchTasks()
    fetchAnalytics()
  }, [token])

  useEffect(() => {
    if (viewMode === 'kanban') {
      fetchKanbanData()
    }
  }, [viewMode, kanbanView, token])

  useEffect(() => {
    applyFilters()
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
              <p className="mt-2 text-gray-600">
                Manage tasks, track progress, and collaborate with your team
              </p>
            </div>
            
            {/* View Mode Selector */}
            <div className="flex items-center space-x-4">
              <div className="flex rounded-lg border border-gray-200 bg-white">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-lg flex items-center space-x-2 ${
                    viewMode === 'kanban'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>📋</span>
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm font-medium flex items-center space-x-2 ${
                    viewMode === 'list'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>📄</span>
                  <span>List</span>
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-lg flex items-center space-x-2 ${
                    viewMode === 'analytics'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>📊</span>
                  <span>Analytics</span>
                </button>
              </div>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <span>+</span>
                <span>New Task</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-64"
                />
              </div>

              {/* Kanban View Selector */}
              {viewMode === 'kanban' && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Group by:</span>
                  <select
                    value={kanbanView}
                    onChange={(e) => setKanbanView(e.target.value as 'status' | 'assignee' | 'project')}
                    className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="status">Status</option>
                    <option value="assignee">Assignee</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>⚙️</span>
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Statuses</option>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Priorities</option>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Assignees</option>
                    <option value="unassigned">Unassigned</option>
                    <option value={user?.id || ''}>{user ? `${user.first_name} ${user.last_name}` : 'Me'}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchTasks}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <KanbanBoard 
            data={kanbanData}
            onTaskMove={handleUpdateTaskStatus}
            onTaskClick={setSelectedTask}
            statusConfig={statusConfig}
            priorityConfig={priorityConfig}
          />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <TasksList 
            tasks={filteredTasks}
            onTaskClick={setSelectedTask}
            onLogTime={(task) => {
              setSelectedTask(task)
              setShowTimeModal(true)
            }}
            statusConfig={statusConfig}
            priorityConfig={priorityConfig}
          />
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' && analytics && (
          <TaskAnalytics 
            analytics={analytics}
            statusConfig={statusConfig}
            priorityConfig={priorityConfig}
          />
        )}
      </div>

      {/* Modals would go here */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {showTimeModal && selectedTask && (
        <TimeLogModal
          task={selectedTask}
          onClose={() => {
            setShowTimeModal(false)
            setSelectedTask(null)
          }}
          onSubmit={(hours, description) => handleLogTime(selectedTask.id, hours, description)}
        />
      )}
    </div>
  )
}

// Kanban Board Component
const KanbanBoard: React.FC<{
  data: Record<string, Task[]>
  onTaskMove: (taskId: string, newStatus: string, newAssigneeId?: string) => void
  onTaskClick: (task: Task) => void
  statusConfig: any
  priorityConfig: any
}> = ({ data, onTaskMove, onTaskClick, statusConfig, priorityConfig }) => {
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('application/json', JSON.stringify(task))
  }

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault()
    const task = JSON.parse(e.dataTransfer.getData('application/json'))
    if (task.status !== targetColumn) {
      onTaskMove(task.id, targetColumn)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const columns = Object.keys(data)

  return (
    <div className="flex space-x-6 overflow-x-auto pb-6">
      {columns.map((column) => (
        <div
          key={column}
          className="flex-shrink-0 w-80"
          onDrop={(e) => handleDrop(e, column)}
          onDragOver={handleDragOver}
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 capitalize">
                  {statusConfig[column]?.label || column.replace(/_/g, ' ')}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {data[column]?.length || 0}
                </span>
              </div>
            </div>
            
            <div className="p-4 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
              {data[column]?.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => onTaskClick(task)}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {task.title}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[task.priority]?.color}`}>
                      {priorityConfig[task.priority]?.icon}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      {task.assignee_id && (
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-3 w-3" />
                          <span>Assigned</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {task.progress_percentage > 0 && (
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-primary-600 h-1 rounded-full"
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Tasks List Component
const TasksList: React.FC<{
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onLogTime: (task: Task) => void
  statusConfig: any
  priorityConfig: any
}> = ({ tasks, onTaskClick, onLogTime, statusConfig, priorityConfig }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div 
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600"
                      onClick={() => onTaskClick(task)}
                    >
                      {task.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {task.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[task.status]?.color}`}>
                    {statusConfig[task.status]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${priorityConfig[task.priority]?.color}`}>
                    {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {task.assignee_id ? 'Assigned' : 'Unassigned'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${task.progress_percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {task.progress_percentage}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onLogTime(task)}
                    className="text-primary-600 hover:text-primary-900 mr-3"
                  >
                    Log Time
                  </button>
                  <button
                    onClick={() => onTaskClick(task)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Task Analytics Component  
const TaskAnalytics: React.FC<{
  analytics: TaskAnalytics
  statusConfig: any
  priorityConfig: any
}> = ({ analytics, statusConfig, priorityConfig }) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold">📋</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{analytics.total_tasks}</h3>
              <p className="text-sm text-gray-500">Total Tasks</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{analytics.completed_tasks}</h3>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-semibold">⏰</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{analytics.overdue_tasks}</h3>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{analytics.completion_rate}%</h3>
              <p className="text-sm text-gray-500">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.status_distribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[status]?.color}`}>
                  {statusConfig[status]?.label}
                </span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.priority_distribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className={`text-sm font-medium ${priorityConfig[priority]?.color}`}>
                  {priorityConfig[priority]?.icon} {priorityConfig[priority]?.label}
                </span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Tracking Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analytics.time_tracking.total_estimated_hours}h
            </div>
            <p className="text-sm text-gray-500">Estimated Hours</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analytics.time_tracking.total_actual_hours}h
            </div>
            <p className="text-sm text-gray-500">Actual Hours</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${analytics.time_tracking.time_variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {analytics.time_tracking.time_variance >= 0 ? '+' : ''}{analytics.time_tracking.time_variance}h
            </div>
            <p className="text-sm text-gray-500">Variance</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder modals (would need full implementation)
const CreateTaskModal: React.FC<{
  onClose: () => void
  onSubmit: (data: any) => void
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: 'test-project-001',
    priority: 'medium',
    due_date: '',
    estimated_hours: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      time_tracking: {
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined
      },
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Due Date</label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
            <input
              type="number"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TimeLogModal: React.FC<{
  task: Task
  onClose: () => void
  onSubmit: (hours: number, description: string) => void
}> = ({ task, onClose, onSubmit }) => {
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hours) {
      onSubmit(parseFloat(hours), description)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Time - {task.title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hours</label>
            <input
              type="number"
              step="0.25"
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="What did you work on?"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              Log Time
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TasksPage