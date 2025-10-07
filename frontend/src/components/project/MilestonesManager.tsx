import React, { useState, useEffect } from 'react'
import { 
  Plus, Edit2, Trash2, Calendar, CheckCircle, Clock, Save, X, 
  Target, Flag, AlertCircle, MoreVertical, Eye, EyeOff
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getBACKEND_URL } from '../../utils/config'
import toast from 'react-hot-toast'

interface Milestone {
  id: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
}

interface MilestonesManagerProps {
  project: {
    id: string
    name: string
    milestones: Milestone[]
  }
  onMilestonesUpdate: () => void
}

const MilestonesManager: React.FC<MilestonesManagerProps> = ({ project, onMilestonesUpdate }) => {
  const { tokens } = useAuth()
  const [milestones, setMilestones] = useState<Milestone[]>(project.milestones || [])
  const [isAddingMilestone, setIsAddingMilestone] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(true)
  
  // Form states
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    due_date: ''
  })
  
  const [editMilestone, setEditMilestone] = useState({
    title: '',
    description: '',
    due_date: '',
    completed: false
  })

  useEffect(() => {
    setMilestones(project.milestones || [])
  }, [project.milestones])

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) {
      toast.error('Milestone title is required')
      return
    }

    try {
      const response = await fetch(`${getBACKEND_URL()}/api/projects/${project.id}/milestones`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newMilestone.title,
          description: newMilestone.description || null,
          due_date: newMilestone.due_date || null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add milestone')
      }

      const result = await response.json()
      toast.success('Milestone added successfully')
      
      // Reset form
      setNewMilestone({ title: '', description: '', due_date: '' })
      setIsAddingMilestone(false)
      
      // Refresh project data
      onMilestonesUpdate()
    } catch (error) {
      toast.error('Failed to add milestone')
    }
  }

  const handleUpdateMilestone = async (milestoneId: string) => {
    if (!editMilestone.title.trim()) {
      toast.error('Milestone title is required')
      return
    }

    try {
      const response = await fetch(`${getBACKEND_URL()}/api/projects/${project.id}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editMilestone.title,
          description: editMilestone.description || null,
          due_date: editMilestone.due_date || null,
          completed: editMilestone.completed
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update milestone')
      }

      toast.success('Milestone updated successfully')
      setEditingMilestoneId(null)
      
      // Refresh project data
      onMilestonesUpdate()
    } catch (error) {
      toast.error('Failed to update milestone')
    }
  }

  const handleToggleMilestoneComplete = async (milestone: Milestone) => {
    try {
      const response = await fetch(`${getBACKEND_URL()}/api/projects/${project.id}/milestones/${milestone.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !milestone.completed
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update milestone')
      }

      toast.success(milestone.completed ? 'Milestone marked as incomplete' : 'Milestone completed!')
      
      // Refresh project data
      onMilestonesUpdate()
    } catch (error) {
      toast.error('Failed to update milestone')
    }
  }

  const startEditingMilestone = (milestone: Milestone) => {
    setEditMilestone({
      title: milestone.title,
      description: milestone.description || '',
      due_date: milestone.due_date || '',
      completed: milestone.completed
    })
    setEditingMilestoneId(milestone.id)
  }

  const cancelEditing = () => {
    setEditingMilestoneId(null)
    setEditMilestone({ title: '', description: '', due_date: '', completed: false })
  }

  const cancelAdding = () => {
    setIsAddingMilestone(false)
    setNewMilestone({ title: '', description: '', due_date: '' })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false
    return new Date(dateString) < new Date() 
  }

  const completedMilestones = milestones.filter(m => m.completed)
  const incompleteMilestones = milestones.filter(m => !m.completed)
  const displayedMilestones = showCompleted ? milestones : incompleteMilestones

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8" data-testid="milestones-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Project Milestones</h2>
            <p className="text-sm text-gray-500">
              {completedMilestones.length} of {milestones.length} milestones completed
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Toggle completed visibility */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showCompleted 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showCompleted ? 'Hide Completed' : 'Show All'}</span>
          </button>

          {/* Add milestone button */}
          <button
            onClick={() => setIsAddingMilestone(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors"
            data-testid="add-milestone-button"
          >
            <Plus className="w-4 h-4" />
            <span>Add Milestone</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {milestones.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round((completedMilestones.length / milestones.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(completedMilestones.length / milestones.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Milestone Form */}
      {isAddingMilestone && (
        <div className="mb-6 p-6 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50" data-testid="add-milestone-form">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Milestone</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter milestone title"
                data-testid="milestone-title-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe this milestone (optional)"
                data-testid="milestone-description-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newMilestone.due_date}
                onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                data-testid="milestone-due-date-input"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAddMilestone}
                className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                data-testid="save-milestone-button"
              >
                <Save className="w-4 h-4" />
                <span>Save Milestone</span>
              </button>
              
              <button
                onClick={cancelAdding}
                className="flex items-center space-x-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestones List */}
      <div className="space-y-4" data-testid="milestones-list">
        {displayedMilestones.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {milestones.length === 0 ? 'No milestones yet' : 'No incomplete milestones'}
            </h3>
            <p className="text-gray-600 mb-6">
              {milestones.length === 0 
                ? 'Start by adding your first milestone to track project progress'
                : 'All milestones have been completed! 🎉'
              }
            </p>
            {!isAddingMilestone && (
              <button
                onClick={() => setIsAddingMilestone(true)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add First Milestone
              </button>
            )}
          </div>
        ) : (
          displayedMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-6 border-l-4 rounded-r-xl transition-all ${
                milestone.completed 
                  ? 'border-green-500 bg-green-50' 
                  : isOverdue(milestone.due_date)
                    ? 'border-red-500 bg-red-50'
                    : 'border-purple-500 bg-purple-50'
              }`}
              data-testid={`milestone-${milestone.id}`}
            >
              {editingMilestoneId === milestone.id ? (
                /* Edit Form */
                <div className="space-y-4" data-testid="edit-milestone-form">
                  <div>
                    <input
                      type="text"
                      value={editMilestone.title}
                      onChange={(e) => setEditMilestone({ ...editMilestone, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold"
                    />
                  </div>

                  <div>
                    <textarea
                      value={editMilestone.description}
                      onChange={(e) => setEditMilestone({ ...editMilestone, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Milestone description..."
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editMilestone.due_date}
                        onChange={(e) => setEditMilestone({ ...editMilestone, due_date: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`completed-${milestone.id}`}
                        checked={editMilestone.completed}
                        onChange={(e) => setEditMilestone({ ...editMilestone, completed: e.target.checked })}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`completed-${milestone.id}`} className="text-sm font-medium text-gray-700">
                        Mark as completed
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleUpdateMilestone(milestone.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </button>
                    
                    <button
                      onClick={cancelEditing}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {/* Completion toggle */}
                      <button
                        onClick={() => handleToggleMilestoneComplete(milestone)}
                        className={`p-1 rounded-full transition-colors ${
                          milestone.completed 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-400 hover:bg-gray-100 hover:text-purple-600'
                        }`}
                        data-testid={`toggle-milestone-${milestone.id}`}
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                      
                      <h3 className={`font-semibold text-lg ${
                        milestone.completed ? 'text-gray-600 line-through' : 'text-gray-900'
                      }`}>
                        {milestone.title}
                      </h3>
                      
                      {isOverdue(milestone.due_date) && !milestone.completed && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>Overdue</span>
                        </div>
                      )}
                    </div>
                    
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mb-3 ml-9">{milestone.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 ml-9">
                      {milestone.due_date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {formatDate(milestone.due_date)}</span>
                        </span>
                      )}
                      
                      {milestone.completed_at && (
                        <span className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Completed: {formatDate(milestone.completed_at)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditingMilestone(milestone)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                      data-testid={`edit-milestone-${milestone.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MilestonesManager