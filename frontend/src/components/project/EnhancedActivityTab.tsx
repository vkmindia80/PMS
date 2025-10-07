import React, { useState } from 'react'
import { 
  MessageSquare, Activity, Calendar, Users, Target, CheckCircle, 
  Edit2, Trash2, Star, Eye, Clock, Filter, Search, Plus,
  AlertCircle, TrendingUp, FileText, Settings, Zap, Bell
} from 'lucide-react'

interface Comment {
  id: string
  content: string
  author_id: string
  author_name?: string
  created_at: string
  updated_at: string
  replies?: Comment[]
  attachments?: string[]
  mentions?: string[]
}

interface ProjectActivity {
  id: string
  type: 'status_change' | 'task_created' | 'task_completed' | 'task_updated' | 'milestone_completed' | 
        'comment_added' | 'member_added' | 'member_removed' | 'file_uploaded' | 'deadline_updated' | 
        'budget_updated' | 'priority_changed'
  description: string
  details?: any
  user_id: string
  user_name: string
  created_at: string
  metadata?: {
    old_value?: any
    new_value?: any
    related_id?: string
    related_type?: string
  }
}

interface EnhancedActivityTabProps {
  project: any
  comments: Comment[]
  activities: ProjectActivity[]
  users: any[]
  newComment: string
  setNewComment: (comment: string) => void
  onAddComment: () => void
  onEditComment?: (commentId: string, content: string) => void
  onDeleteComment?: (commentId: string) => void
  formatDateTime: (dateString: string) => string
}

const EnhancedActivityTab: React.FC<EnhancedActivityTabProps> = ({
  project,
  comments,
  activities,
  users,
  newComment,
  setNewComment,
  onAddComment,
  onEditComment,
  onDeleteComment,
  formatDateTime
}) => {
  const [activeView, setActiveView] = useState<'all' | 'comments' | 'activities'>('all')
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)

  // Enhanced mock activities for better demonstration
  const enhancedActivities: ProjectActivity[] = [
    {
      id: 'act-1',
      type: 'task_completed',
      description: 'Completed task: Database schema design',
      user_id: 'demo-user-001',
      user_name: 'Demo User',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      metadata: {
        related_id: 'task-123',
        related_type: 'task'
      }
    },
    {
      id: 'act-2',
      type: 'status_change',
      description: 'Changed project status from Planning to Active',
      user_id: 'demo-user-001',
      user_name: 'Demo User',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      metadata: {
        old_value: 'planning',
        new_value: 'active'
      }
    },
    {
      id: 'act-3',
      type: 'member_added',
      description: 'Added Dr. Sarah Neural to the project team',
      user_id: 'demo-user-001',
      user_name: 'Demo User',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      metadata: {
        related_id: 'dr.sarah.neural@company.com',
        related_type: 'user'
      }
    },
    {
      id: 'act-4',
      type: 'file_uploaded',
      description: 'Uploaded Architecture Diagram.png',
      user_id: 'demo-user-001',
      user_name: 'Demo User',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      metadata: {
        related_id: 'file-arch-diagram',
        related_type: 'file'
      }
    },
    {
      id: 'act-5',
      type: 'milestone_completed',
      description: 'Completed milestone: Project Kickoff',
      user_id: 'demo-user-001',
      user_name: 'Demo User',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      metadata: {
        related_id: 'milestone-kickoff',
        related_type: 'milestone'
      }
    },
    {
      id: 'act-6',
      type: 'priority_changed',
      description: 'Changed project priority from Medium to High',
      user_id: 'demo-user-001',
      user_name: 'Demo User',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      metadata: {
        old_value: 'medium',
        new_value: 'high'
      }
    },
    {
      id: 'act-7',
      type: 'budget_updated',
      description: 'Updated project budget allocation',
      user_id: 'demo-user-001',
      user_name: 'Demo User',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      metadata: {
        old_value: 750000,
        new_value: 850000
      }
    }
  ]

  const allActivities = [...activities, ...enhancedActivities]

  const getActivityIcon = (type: string) => {
    const icons = {
      status_change: Settings,
      task_created: Plus,
      task_completed: CheckCircle,
      task_updated: Edit2,
      milestone_completed: Star,
      comment_added: MessageSquare,
      member_added: Users,
      member_removed: Users,
      file_uploaded: FileText,
      deadline_updated: Calendar,
      budget_updated: TrendingUp,
      priority_changed: AlertCircle
    }
    return icons[type as keyof typeof icons] || Activity
  }

  const getActivityColor = (type: string) => {
    const colors = {
      status_change: 'text-blue-600 bg-blue-100',
      task_created: 'text-green-600 bg-green-100',
      task_completed: 'text-green-600 bg-green-100',
      task_updated: 'text-yellow-600 bg-yellow-100',
      milestone_completed: 'text-purple-600 bg-purple-100',
      comment_added: 'text-blue-600 bg-blue-100',
      member_added: 'text-green-600 bg-green-100',
      member_removed: 'text-red-600 bg-red-100',
      file_uploaded: 'text-indigo-600 bg-indigo-100',
      deadline_updated: 'text-orange-600 bg-orange-100',
      budget_updated: 'text-emerald-600 bg-emerald-100',
      priority_changed: 'text-red-600 bg-red-100'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  const getUserAvatar = (userId: string, userName: string) => {
    return userName.charAt(0).toUpperCase()
  }

  const filteredItems = (() => {
    let items: any[] = []

    if (activeView === 'all' || activeView === 'comments') {
      items = [...items, ...comments.map(comment => ({ ...comment, itemType: 'comment' }))]
    }

    if (activeView === 'all' || activeView === 'activities') {
      items = [...items, ...allActivities.map(activity => ({ ...activity, itemType: 'activity' }))]
    }

    // Filter by type
    if (filterType !== 'all') {
      items = items.filter(item => {
        if (item.itemType === 'activity') {
          return item.type === filterType
        }
        return filterType === 'comment_added'
      })
    }

    // Filter by search term
    if (searchTerm) {
      items = items.filter(item => {
        const searchContent = item.itemType === 'comment' ? item.content : item.description
        return searchContent.toLowerCase().includes(searchTerm.toLowerCase())
      })
    }

    // Sort by date
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  })()

  const ActivityItem: React.FC<{ activity: ProjectActivity }> = ({ activity }) => {
    const ActivityIcon = getActivityIcon(activity.type)
    const colorClass = getActivityColor(activity.type)

    return (
      <div className="flex space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
          <ActivityIcon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">{activity.user_name}</span>
            <span className="text-sm text-gray-500">
              {formatDateTime(activity.created_at)}
            </span>
          </div>
          
          <p className="text-gray-700 mb-2">{activity.description}</p>
          
          {activity.metadata && (activity.metadata.old_value || activity.metadata.new_value) && (
            <div className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
              {activity.metadata.old_value && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">From:</span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                    {activity.metadata.old_value}
                  </span>
                </div>
              )}
              {activity.metadata.new_value && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-gray-500">To:</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                    {activity.metadata.new_value}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => (
    <div className="flex space-x-4 p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
      <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
        {getUserAvatar(comment.author_id, comment.author_name || 'Unknown')}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{comment.author_name || 'Unknown'}</span>
            <span className="text-sm text-blue-600 font-medium">commented</span>
            <span className="text-sm text-gray-500">
              {formatDateTime(comment.created_at)}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setReplyingTo(comment.id)}
              className="p-1 hover:bg-blue-200 rounded transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </button>
            <button 
              onClick={() => setEditingComment(comment.id)}
              className="p-1 hover:bg-blue-200 rounded transition-colors"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
        
        {editingComment === comment.id ? (
          <div className="space-y-3">
            <textarea
              defaultValue={comment.content}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors">
                Save
              </button>
              <button 
                onClick={() => setEditingComment(null)}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-700 leading-relaxed">{comment.content}</p>
            
            {comment.mentions && comment.mentions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {comment.mentions.map(mention => (
                  <span key={mention} className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                    @{mention}
                  </span>
                ))}
              </div>
            )}
            
            {replyingTo === comment.id && (
              <div className="mt-3 pl-4 border-l-2 border-blue-300">
                <textarea
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={2}
                />
                <div className="flex space-x-2 mt-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors">
                    Reply
                  </button>
                  <button 
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 pl-4 border-l-2 border-blue-200 space-y-3">
                {comment.replies.map(reply => (
                  <div key={reply.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {getUserAvatar(reply.author_id, reply.author_name || 'Unknown')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{reply.author_name}</span>
                        <span className="text-xs text-gray-500">{formatDateTime(reply.created_at)}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  const activityTypeOptions = [
    { value: 'all', label: 'All Activities' },
    { value: 'comment_added', label: 'Comments' },
    { value: 'status_change', label: 'Status Changes' },
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'task_created', label: 'Task Created' },
    { value: 'member_added', label: 'Team Changes' },
    { value: 'file_uploaded', label: 'File Uploads' },
    { value: 'milestone_completed', label: 'Milestones' },
    { value: 'budget_updated', label: 'Budget Updates' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Activity</h2>
          <p className="text-gray-600 mt-1">Track all project updates and conversations</p>
        </div>
        
        <button
          onClick={() => setShowCommentForm(!showCommentForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Add Comment</span>
        </button>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">{comments.length}</div>
          <div className="text-sm text-gray-600">Comments</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">{allActivities.length}</div>
          <div className="text-sm text-gray-600">Activities</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {allActivities.filter(a => a.type === 'task_completed').length}
          </div>
          <div className="text-sm text-gray-600">Tasks Completed</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {new Set(allActivities.map(a => a.user_id)).size}
          </div>
          <div className="text-sm text-gray-600">Active Contributors</div>
        </div>
      </div>

      {/* Add Comment Form */}
      {showCommentForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Comment</h3>
          <div className="space-y-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Share an update, ask a question, or provide feedback... Use @username to mention team members"
            />
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                💡 Tip: Use @username to mention team members and get their attention
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCommentForm(false)
                    setNewComment('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onAddComment()
                    setShowCommentForm(false)
                  }}
                  disabled={!newComment.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('all')}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                activeView === 'all' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveView('comments')}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                activeView === 'comments' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600'
              }`}
            >
              Comments ({comments.length})
            </button>
            <button
              onClick={() => setActiveView('activities')}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                activeView === 'activities' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600'
              }`}
            >
              Activities ({allActivities.length})
            </button>
          </div>

          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search activity and comments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {activityTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <div key={`${item.itemType}-${item.id}`}>
              {item.itemType === 'comment' ? (
                <CommentItem comment={item} />
              ) : (
                <ActivityItem activity={item} />
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to comment or update this project'}
            </p>
            {!searchTerm && filterType === 'all' && (
              <button
                onClick={() => setShowCommentForm(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add First Comment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredItems.length > 0 && (
        <div className="text-center">
          <button className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Load More Activity
          </button>
        </div>
      )}
    </div>
  )
}

export default EnhancedActivityTab