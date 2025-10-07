import React, { useState } from 'react'
import { 
  Plus, Search, Filter, Grid, List, Calendar, Users, Target, 
  Clock, CheckCircle, AlertCircle, ArrowRight, Edit2, Trash2,
  MoreVertical, Play, Pause, Timer, Flag, User
} from 'lucide-react'

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
  estimated_hours?: number
  actual_hours?: number
  progress_percentage?: number
  dependencies?: string[]
  subtasks?: Task[]
  labels?: string[]
}

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
}

interface EnhancedTasksTabProps {
  tasks: Task[]
  project: any
  users: User[]
  onTaskUpdate?: () => void
  onTaskCreate?: (task: Partial<Task>) => void
  onTaskDelete?: (taskId: string) => void
}

const EnhancedTasksTab: React.FC<EnhancedTasksTabProps> = ({
  tasks,
  project,
  users,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete
}) => {
  const [taskView, setTaskView] = useState<'kanban' | 'list' | 'timeline'>('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const getTaskStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      review: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      blocked: 'bg-red-100 text-red-700 border-red-200'
    }
    return colors[status as keyof typeof colors] || colors.todo
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const filteredTasks = tasks.filter(task => {
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false
    }
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false
    }
    if (assigneeFilter !== 'all' && !task.assigned_to.includes(assigneeFilter)) {
      return false
    }
    return true
  })

  const tasksByStatus = {
    todo: filteredTasks.filter(task => task.status === 'todo'),
    in_progress: filteredTasks.filter(task => task.status === 'in_progress'),
    review: filteredTasks.filter(task => task.status === 'review'),
    completed: filteredTasks.filter(task => task.status === 'completed'),
    blocked: filteredTasks.filter(task => task.status === 'blocked')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.name || 'Unassigned'
  }

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false
    return new Date(dateString) < new Date()
  }

  const TaskCard: React.FC<{ task: Task; columnId: string }> = ({ task, columnId }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h4>
          <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
        </div>
        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center space-x-2 mb-3">
        <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
          {task.priority.toUpperCase()}
        </div>
        {task.estimated_hours && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Timer className="w-3 h-3" />
            <span>{task.estimated_hours}h</span>
          </div>
        )}
      </div>

      {task.progress_percentage !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{task.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${task.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {task.assigned_to.slice(0, 3).map((userId, index) => (
            <div
              key={userId}
              className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs text-white font-medium border-2 border-white"
              style={{ marginLeft: index > 0 ? '-8px' : '0' }}
              title={getUserName(userId)}
            >
              {getUserName(userId).charAt(0)}
            </div>
          ))}
          {task.assigned_to.length > 3 && (
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white font-medium border-2 border-white">
              +{task.assigned_to.length - 3}
            </div>
          )}
        </div>

        {task.due_date && (
          <div className={`flex items-center space-x-1 text-xs ${
            isOverdue(task.due_date) ? 'text-red-600' : 'text-gray-500'
          }`}>
            <Calendar className="w-3 h-3" />
            <span>{formatDate(task.due_date)}</span>
          </div>
        )}
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.slice(0, 3).map(label => (
            <span key={label} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const KanbanColumn: React.FC<{ title: string; tasks: Task[]; status: string; count: number }> = ({ 
    title, tasks, status, count 
  }) => (
    <div className="flex-1 min-w-80">
      <div className="bg-gray-50 rounded-lg p-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className="bg-gray-200 text-gray-700 text-sm px-2 py-1 rounded-full">
              {count}
            </span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} columnId={status} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Target className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const TaskListItem: React.FC<{ task: Task }> = ({ task }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <button className="text-gray-400 hover:text-gray-600">
            <CheckCircle className="w-5 h-5" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-medium text-gray-900">{task.title}</h4>
              <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getTaskStatusColor(task.status)}`}>
                {task.status.replace('_', ' ').toUpperCase()}
              </div>
              <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </div>
            </div>
            
            {task.description && (
              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {task.assigned_to.length > 0 && (
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{task.assigned_to.map(id => getUserName(id)).join(', ')}</span>
                </div>
              )}
              
              {task.due_date && (
                <div className={`flex items-center space-x-1 ${
                  isOverdue(task.due_date) ? 'text-red-600' : ''
                }`}>
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(task.due_date)}</span>
                </div>
              )}
              
              {task.estimated_hours && (
                <div className="flex items-center space-x-1">
                  <Timer className="w-4 h-4" />
                  <span>{task.estimated_hours}h estimated</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {task.progress_percentage !== undefined && (
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${task.progress_percentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-10 text-right">
                {task.progress_percentage}%
              </span>
            </div>
          )}
          
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Project Tasks ({filteredTasks.length})
          </h2>
          <p className="text-gray-600 mt-1">Manage and track task progress</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTaskView('kanban')}
              className={`p-2 rounded transition-colors ${
                taskView === 'kanban' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTaskView('list')}
              className={`p-2 rounded transition-colors ${
                taskView === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Assignees</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task Content */}
      {taskView === 'kanban' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex gap-6 overflow-x-auto min-h-96">
            <KanbanColumn 
              title="To Do" 
              tasks={tasksByStatus.todo} 
              status="todo" 
              count={tasksByStatus.todo.length} 
            />
            <KanbanColumn 
              title="In Progress" 
              tasks={tasksByStatus.in_progress} 
              status="in_progress" 
              count={tasksByStatus.in_progress.length} 
            />
            <KanbanColumn 
              title="In Review" 
              tasks={tasksByStatus.review} 
              status="review" 
              count={tasksByStatus.review.length} 
            />
            <KanbanColumn 
              title="Completed" 
              tasks={tasksByStatus.completed} 
              status="completed" 
              count={tasksByStatus.completed.length} 
            />
            <KanbanColumn 
              title="Blocked" 
              tasks={tasksByStatus.blocked} 
              status="blocked" 
              count={tasksByStatus.blocked.length} 
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <TaskListItem key={task.id} task={task} />
          ))}
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first task to get started'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create First Task
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <div key={status} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {statusTasks.length}
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {status.replace('_', ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EnhancedTasksTab