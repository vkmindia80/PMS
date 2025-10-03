import React, { useState } from 'react'
import { 
  Link, ArrowRight, ArrowLeft, Plus, Minus, Search,
  AlertTriangle, CheckCircle, Clock, Target, Network
} from 'lucide-react'

interface Task {
  id: string
  title: string
  dependencies: Array<{
    task_id: string
    dependency_type: string
  }>
}

interface TaskDependenciesTabProps {
  task: Task
  dependentTasks?: any[]
  relatedTasks?: any[]
  isEditing: boolean
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
}

export const TaskDependenciesTab: React.FC<TaskDependenciesTabProps> = ({ 
  task, 
  dependentTasks = [], 
  relatedTasks = [],
  isEditing, 
  onUpdate 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddDependency, setShowAddDependency] = useState(false)
  const [selectedTask, setSelectedTask] = useState('')
  const [dependencyType, setDependencyType] = useState<'blocks' | 'depends_on'>('depends_on')

  // Filter tasks for dependency selection
  const availableTasksForDependency = (relatedTasks || []).filter(t => 
    t.id !== task.id && 
    !(task.dependencies || []).some(dep => dep.task_id === t.id) &&
    t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDependencyTypeIcon = (type: string) => {
    switch (type) {
      case 'blocks': return { icon: '🚫', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
      case 'depends_on': return { icon: '⬅️', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
      case 'related': return { icon: '🔗', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' }
      default: return { icon: '📎', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' }
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      case 'in_review': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const addDependency = () => {
    if (!selectedTask) return
    
    const newDependencies = [...task.dependencies, {
      task_id: selectedTask,
      dependency_type: dependencyType
    }]
    
    onUpdate(task.id, { dependencies: newDependencies })
    setSelectedTask('')
    setShowAddDependency(false)
  }

  const removeDependency = (taskId: string) => {
    const updatedDependencies = task.dependencies.filter(dep => dep.task_id !== taskId)
    onUpdate(task.id, { dependencies: updatedDependencies })
  }

  // Calculate dependency health
  const dependencyHealth = {
    total: (task.dependencies || []).length + (dependentTasks || []).length,
    blocked: (dependentTasks || []).filter(t => t.status === 'blocked').length,
    completed: [...(task.dependencies || []), ...(dependentTasks || [])].filter(dep => {
      const depTask = (relatedTasks || []).find(t => t.id === dep.task_id || t.id === dep.id)
      return depTask?.status === 'completed'
    }).length
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dependencies Overview */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Network className="h-6 w-6 mr-3 text-indigo-600" />
          Task Dependencies & Relationships
        </h3>

        {/* Dependency Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-indigo-600 mb-1">
              {(task.dependencies || []).length}
            </div>
            <div className="text-sm text-gray-600">Dependencies</div>
            <div className="text-xs text-gray-500 mt-1">Tasks blocking this</div>
          </div>
          
          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {(dependentTasks || []).length}
            </div>
            <div className="text-sm text-gray-600">Dependents</div>
            <div className="text-xs text-gray-500 mt-1">Tasks this blocks</div>
          </div>
          
          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {dependencyHealth.completed}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-xs text-gray-500 mt-1">Finished tasks</div>
          </div>
          
          <div className="text-center bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {dependencyHealth.blocked}
            </div>
            <div className="text-sm text-gray-600">Blocked</div>
            <div className="text-xs text-gray-500 mt-1">Waiting tasks</div>
          </div>
        </div>

        {/* Dependency Health Indicator */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Dependency Health</span>
            <span className="text-sm text-gray-600">
              {dependencyHealth.total === 0 ? 'No dependencies' :
               dependencyHealth.blocked > 0 ? 'Some blockers' :
               dependencyHealth.completed === dependencyHealth.total ? 'All clear' :
               'In progress'}
            </span>
          </div>
          
          {dependencyHealth.total > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-green-500"
                  style={{ width: `${(dependencyHealth.completed / dependencyHealth.total) * 100}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(dependencyHealth.blocked / dependencyHealth.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dependencies and Dependents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dependencies (Prerequisite Tasks) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ArrowLeft className="h-5 w-5 mr-2 text-orange-600" />
              Dependencies
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({(task.dependencies || []).length})
              </span>
            </h3>
            
            {isEditing && (
              <button
                onClick={() => setShowAddDependency(true)}
                className="flex items-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(task.dependencies || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <ArrowLeft className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <h4 className="font-medium text-gray-700 mb-1">No Dependencies</h4>
                <p className="text-sm">This task can start immediately</p>
              </div>
            ) : (
              (task.dependencies || []).map((dep, index) => {
                const dependentTask = (relatedTasks || []).find(t => t.id === dep.task_id)
                const { icon, color, bg } = getDependencyTypeIcon(dep.dependency_type)
                
                return (
                  <div key={index} className={`relative flex items-center justify-between p-4 rounded-lg border-2 ${bg}`}>
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg.replace('50', '100')}`}>
                        <span className="text-lg">{icon}</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-900">
                            {dependentTask ? dependentTask.title : `Task ${dep.task_id.substring(0, 8)}`}
                          </div>
                          {dependentTask && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTaskStatusColor(dependentTask.status)}`}>
                              {dependentTask.status.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Target className="h-3 w-3" />
                            <span>Type: {dep.dependency_type.replace('_', ' ')}</span>
                          </div>
                          
                          {dependentTask && (
                            <>
                              <div className="flex items-center space-x-1">
                                <span className={`w-2 h-2 rounded-full ${
                                  dependentTask.priority === 'critical' ? 'bg-red-500' :
                                  dependentTask.priority === 'high' ? 'bg-orange-500' :
                                  dependentTask.priority === 'medium' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}></span>
                                <span>Priority: {dependentTask.priority}</span>
                              </div>
                              
                              {dependentTask.due_date && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Due: {new Date(dependentTask.due_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Dependency Impact */}
                        {dependentTask && dependentTask.status === 'blocked' && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-red-800 font-medium">
                              This dependency is blocked - may delay current task
                            </span>
                          </div>
                        )}
                        
                        {dependentTask && dependentTask.status === 'completed' && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-green-800 font-medium">
                              Dependency completed - ready to proceed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <button
                        onClick={() => removeDependency(dep.task_id)}
                        className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Dependent Tasks (Tasks this blocks) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ArrowRight className="h-5 w-5 mr-2 text-blue-600" />
              Dependent Tasks
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({(dependentTasks || []).length})
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {dependentTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <ArrowRight className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <h4 className="font-medium text-gray-700 mb-1">No Dependent Tasks</h4>
                <p className="text-sm">No other tasks are waiting on this one</p>
              </div>
            ) : (
              dependentTasks.map((depTask) => (
                <div key={depTask.id} className="relative flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <ArrowRight className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-900">{depTask.title}</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTaskStatusColor(depTask.status)}`}>
                          {depTask.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <span className={`w-2 h-2 rounded-full ${
                            depTask.priority === 'critical' ? 'bg-red-500' :
                            depTask.priority === 'high' ? 'bg-orange-500' :
                            depTask.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></span>
                          <span>Priority: {depTask.priority}</span>
                        </div>
                        
                        {depTask.assignee_id && (
                          <div className="flex items-center space-x-1">
                            <span>👤</span>
                            <span>Assigned</span>
                          </div>
                        )}
                        
                        {depTask.due_date && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Due: {new Date(depTask.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Current Task Impact on Dependent */}
                      {task.status === 'completed' ? (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-800 font-medium">
                            This task is complete - dependent can proceed
                          </span>
                        </div>
                      ) : task.status === 'blocked' ? (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-xs text-red-800 font-medium">
                            This task is blocked - may delay dependent task
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-blue-800 font-medium">
                            Dependent waiting for this task completion
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Dependency Modal */}
      {showAddDependency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Task Dependency</h3>
            
            <div className="space-y-4">
              {/* Dependency Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dependency Type
                </label>
                <select
                  value={dependencyType}
                  onChange={(e) => setDependencyType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="depends_on">This task depends on</option>
                  <option value="blocks">This task blocks</option>
                </select>
              </div>

              {/* Task Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Tasks
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search for a task..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Task Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Task
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                  {availableTasksForDependency.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm ? 'No matching tasks found' : 'No available tasks'}
                    </div>
                  ) : (
                    availableTasksForDependency.map((availableTask) => (
                      <button
                        key={availableTask.id}
                        onClick={() => setSelectedTask(availableTask.id)}
                        className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          selectedTask === availableTask.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{availableTask.title}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getTaskStatusColor(availableTask.status)}`}>
                            {availableTask.status.replace('_', ' ')}
                          </span>
                          <span>{availableTask.priority} priority</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDependency(false)
                  setSelectedTask('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addDependency}
                disabled={!selectedTask}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Add Dependency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Insights */}
      {(task.dependencies.length > 0 || dependentTasks.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-600" />
            Dependency Insights & Recommendations
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Critical Path Analysis */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h5 className="font-medium text-yellow-900 mb-3">Critical Path Impact</h5>
              <div className="space-y-2 text-sm">
                {task.dependencies.filter(dep => {
                  const depTask = relatedTasks.find(t => t.id === dep.task_id)
                  return depTask && ['blocked', 'in_progress'].includes(depTask.status)
                }).length > 0 ? (
                  <div className="text-yellow-800">
                    ⚠️ Some dependencies are not complete. This may delay task completion.
                  </div>
                ) : task.dependencies.length > 0 ? (
                  <div className="text-yellow-800">
                    ✅ All dependencies are on track or completed.
                  </div>
                ) : (
                  <div className="text-yellow-800">
                    🚀 No dependencies - this task can start immediately.
                  </div>
                )}
                
                {dependentTasks.filter(t => t.status === 'blocked').length > 0 && (
                  <div className="text-yellow-800">
                    🚫 {dependentTasks.filter(t => t.status === 'blocked').length} task(s) waiting on this completion.
                  </div>
                )}
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h5 className="font-medium text-red-900 mb-3">Risk Assessment</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-red-700">
                  <span>Dependency Risk:</span>
                  <span className="font-medium">
                    {dependencyHealth.blocked > 0 ? 'High' :
                     task.dependencies.length > 3 ? 'Medium' :
                     task.dependencies.length > 0 ? 'Low' :
                     'None'}
                  </span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>Bottleneck Risk:</span>
                  <span className="font-medium">
                    {dependentTasks.length > 5 ? 'High' :
                     dependentTasks.length > 2 ? 'Medium' :
                     dependentTasks.length > 0 ? 'Low' :
                     'None'}
                  </span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>Overall Health:</span>
                  <span className="font-medium">
                    {dependencyHealth.blocked > 0 ? 'Needs Attention' :
                     dependencyHealth.completed === dependencyHealth.total ? 'Excellent' :
                     'Good'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDependenciesTab