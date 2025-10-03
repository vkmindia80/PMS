import React from 'react'
import { 
  User, Users, Calendar, Clock, Target, AlertTriangle,
  Plus, Minus, Save, X
} from 'lucide-react'

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
  time_tracking?: {
    estimated_hours?: number
    actual_hours: number
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

interface TaskDetailsTabProps {
  task: Task
  taskWithDetails?: any
  availableUsers?: any[]
  isEditing: boolean
  editData: Partial<Task>
  setEditData: (data: Partial<Task>) => void
  validationErrors: Record<string, string>
  statusConfig: any
  priorityConfig: any
  typeConfig: any
}

export const TaskDetailsTab: React.FC<TaskDetailsTabProps> = ({ 
  task, 
  taskWithDetails,
  availableUsers = [],
  isEditing, 
  editData, 
  setEditData, 
  validationErrors,
  statusConfig, 
  priorityConfig,
  typeConfig
}) => {
  const [newTag, setNewTag] = React.useState('')
  const [newLabel, setNewLabel] = React.useState('')

  const addTag = () => {
    if (newTag.trim() && !task.tags.includes(newTag.trim())) {
      const updatedTags = [...(task.tags || []), newTag.trim()]
      setEditData({ ...editData, tags: updatedTags })
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    const updatedTags = task.tags.filter(tag => tag !== tagToRemove)
    setEditData({ ...editData, tags: updatedTags })
  }

  const addLabel = () => {
    if (newLabel.trim() && !task.labels.includes(newLabel.trim())) {
      const updatedLabels = [...(task.labels || []), newLabel.trim()]
      setEditData({ ...editData, labels: updatedLabels })
      setNewLabel('')
    }
  }

  const removeLabel = (labelToRemove: string) => {
    const updatedLabels = task.labels.filter(label => label !== labelToRemove)
    setEditData({ ...editData, labels: updatedLabels })
  }

  return (
    <div className="p-6 space-y-8">
      {/* Enhanced Task Details Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Target className="h-6 w-6 mr-3 text-blue-600" />
          Task Details & Configuration
        </h3>

        {/* Core Task Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
              Status
            </label>
            {isEditing ? (
              <select
                value={editData.status || task.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(statusConfig).map(([key, config]: [string, any]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center">
                <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-lg ${statusConfig[task.status]?.color} w-full justify-center`}>
                  {statusConfig[task.status]?.icon} {statusConfig[task.status]?.label}
                </span>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <div className="w-2 h-2 bg-orange-600 rounded-full mr-2"></div>
              Priority
            </label>
            {isEditing ? (
              <select
                value={editData.priority || task.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(priorityConfig).map(([key, config]: [string, any]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center">
                <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-lg border ${priorityConfig[task.priority]?.bgColor} ${priorityConfig[task.priority]?.color} w-full justify-center`}>
                  {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
                </span>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
              Type
            </label>
            {isEditing ? (
              <select
                value={editData.type || task.type}
                onChange={(e) => setEditData({ ...editData, type: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(typeConfig).map(([key, config]: [string, any]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center">
                <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-lg border ${typeConfig[task.type]?.bgColor} ${typeConfig[task.type]?.color} w-full justify-center`}>
                  {typeConfig[task.type]?.icon} {typeConfig[task.type]?.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></div>
          Description
        </label>
        {isEditing ? (
          <textarea
            value={editData.description !== undefined ? editData.description : (task.description || '')}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={6}
            placeholder="Provide a detailed description of the task..."
          />
        ) : (
          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-lg p-4">
            {task.description ? (
              task.description.split('\n').map((line, index) => (
                <p key={index} className="mb-2">{line || '\u00A0'}</p>
              ))
            ) : (
              <p className="text-gray-500 italic">No description provided.</p>
            )}
          </div>
        )}
      </div>

      {/* Assignment & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Assignment */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Team Assignment
          </label>
          {isEditing ? (
            <div className="space-y-4">
              <select
                multiple
                value={editData.assignee_ids !== undefined ? editData.assignee_ids : (task.assignee_ids || [])}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setEditData({ ...editData, assignee_ids: selectedOptions });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                size={Math.min(availableUsers?.length || 1, 5)}
              >
                {availableUsers?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500">Hold Ctrl (Cmd on Mac) to select multiple assignees</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Use taskWithDetails.assignees first (from detailed API), then fall back to manual lookup */}
              {taskWithDetails?.assignees && taskWithDetails.assignees.length > 0 ? (
                taskWithDetails.assignees.map((assignee: any) => (
                  <div key={assignee.id} className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {`${assignee.first_name} ${assignee.last_name}`}
                      </div>
                      <div className="text-sm text-gray-600">{assignee.email}</div>
                    </div>
                  </div>
                ))
              ) : (task.assignee_ids && task.assignee_ids.length > 0) ? (
                task.assignee_ids.map((assigneeId) => {
                  const assignee = availableUsers?.find(user => user.id === assigneeId);
                  return (
                    <div key={assigneeId} className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unknown User'}
                        </div>
                        {assignee && (
                          <div className="text-sm text-gray-600">{assignee.email}</div>
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
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unknown User'}
                        </div>
                        {assignee && (
                          <div className="text-sm text-gray-600">{assignee.email}</div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500">No assignees</div>
                    <div className="text-sm text-gray-400">This task is unassigned</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline & Dates */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-green-600" />
            Timeline & Dates
          </label>
          <div className="space-y-4">
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
                <div className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                  {(taskWithDetails?.start_date ?? task.start_date) ? 
                    new Date(taskWithDetails?.start_date ?? task.start_date).toLocaleDateString() : 
                    'Not set'
                  }
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              {isEditing ? (
                <div>
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
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.due_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.due_date && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.due_date}</p>
                  )}
                </div>
              ) : (
                <div className={`p-3 rounded-lg ${
                  task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
                    ? 'bg-red-50 text-red-900' 
                    : 'bg-gray-50 text-gray-900'
                }`}>
                  {task.due_date ? new Date(task.due_date).toLocaleString() : 'Not set'}
                  {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                    <div className="flex items-center mt-1">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
                      <span className="text-xs font-medium text-red-600">OVERDUE</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Estimation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2 text-purple-600" />
          Progress & Time Estimation
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Progress: {Math.round(editData.progress_percentage !== undefined ? editData.progress_percentage : task.progress_percentage)}%
            </label>
            {isEditing ? (
              <div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editData.progress_percentage !== undefined ? editData.progress_percentage : task.progress_percentage}
                  onChange={(e) => setEditData({ ...editData, progress_percentage: parseFloat(e.target.value) })}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                {validationErrors.progress_percentage && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.progress_percentage}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress_percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  {task.progress_percentage >= 75 ? '🎯 Near completion!' :
                   task.progress_percentage >= 50 ? '📈 Making progress' :
                   task.progress_percentage >= 25 ? '🚀 Getting started' :
                   '⏳ Just beginning'}
                </div>
              </div>
            )}
          </div>

          {/* Time Estimation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Hours
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.5"
                min="0"
                value={editData.time_tracking?.estimated_hours !== undefined 
                  ? editData.time_tracking.estimated_hours 
                  : task.time_tracking?.estimated_hours || ''
                }
                onChange={(e) => setEditData({ 
                  ...editData, 
                  time_tracking: {
                    ...(task.time_tracking || { actual_hours: 0 }),
                    estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined
                  }
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 8.5"
              />
            ) : (
              <div className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                {task.time_tracking?.estimated_hours ? `${task.time_tracking.estimated_hours} hours` : 'Not estimated'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags & Labels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tags */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            Tags
          </label>
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add a tag..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editData.tags || task.tags || []).map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {task.tags && task.tags.length > 0 ? (
                task.tags.map((tag, index) => (
                  <span key={index} className="inline-flex px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                    #{tag}
                  </span>
                ))
              ) : (
                <p className="text-gray-500 italic">No tags assigned</p>
              )}
            </div>
          )}
        </div>

        {/* Labels */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            Labels
          </label>
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLabel()}
                  placeholder="Add a label..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addLabel}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editData.labels || task.labels || []).map((label, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(label)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {task.labels && task.labels.length > 0 ? (
                task.labels.map((label, index) => (
                  <span key={index} className="inline-flex px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                    {label}
                  </span>
                ))
              ) : (
                <p className="text-gray-500 italic">No labels assigned</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Fields (if any) */}
      {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-lg font-semibold text-gray-900 mb-4">Custom Fields</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(task.custom_fields).map(([key, value]) => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600 mb-1">{key}</div>
                <div className="text-gray-900">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDetailsTab