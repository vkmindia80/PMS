/**
 * Enhanced Activity Tab Component
 * Shows comprehensive activity logging
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, User, Calendar, Filter, BarChart3, 
  MessageSquare, Plus, CheckCircle, Edit2, Zap, Users, 
  Trash2, Activity, Eye, Settings,
  TrendingUp, PieChart, Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { API_ENDPOINTS } from '../../utils/config';
import toast from 'react-hot-toast';

interface ProjectActivity {
  id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  user_id: string;
  user_name: string;
  user_email: string;
  description: string;
  metadata: Record<string, any>;
  organization_id: string;
  project_id?: string;
  task_id?: string;
  // Enhanced fields
  tab_name?: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

interface ActivityStats {
  total_activities: number;
  activities_by_type: Record<string, number>;
  activities_by_action: Record<string, number>;
  most_active_users: Array<{
    user_id: string;
    user_name: string;
    count: number;
  }>;
  recent_activity_count: number;
}

interface EnhancedActivityTabProps {
  projectId: string;
  projectName: string;
}

export const EnhancedActivityTab: React.FC<EnhancedActivityTabProps> = ({ 
  projectId, 
  projectName 
}) => {
  const { tokens } = useAuth();
  const { 
    logCommentAction 
  } = useActivityTracking(projectId);

  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchActivities();
    fetchActivityStats();
  }, [projectId, tokens]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.activities.project(projectId), {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.activities.stats(projectId), {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch activity stats:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(API_ENDPOINTS.comments.create, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: 'project',
          entity_id: projectId,
          content: newComment,
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        
        // Log the comment activity
        await logCommentAction(
          'commented',
          comment.id,
          'project',
          projectId,
          `Added comment: ${newComment.substring(0, 50)}${newComment.length > 50 ? '...' : ''}`
        );

        toast.success('Comment added');
        setNewComment('');
        await fetchActivities(); // Refresh activities
      }
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  // Filter activities
  const filteredActivities = filterType === 'all' 
    ? activities 
    : activities.filter(a => a.action_type === filterType || a.entity_type === filterType);

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ProjectActivity[]>);

  const getActivityIcon = (entityType: string, actionType: string) => {
    if (entityType === 'comment' || actionType === 'commented') return MessageSquare;
    if (actionType === 'created') return Plus;
    if (actionType === 'completed') return CheckCircle;
    if (actionType === 'updated') return Edit2;
    if (actionType === 'status_changed') return Zap;
    if (actionType === 'assigned') return Users;
    if (actionType === 'tab_viewed') return Eye;
    if (actionType === 'deleted') return Trash2;
    return Activity;
  };

  const getActivityColor = (entityType: string, actionType: string) => {
    if (entityType === 'comment' || actionType === 'commented') return 'bg-blue-50 border-blue-200 text-blue-700';
    if (actionType === 'created') return 'bg-green-50 border-green-200 text-green-700';
    if (actionType === 'completed') return 'bg-purple-50 border-purple-200 text-purple-700';
    if (actionType === 'updated') return 'bg-orange-50 border-orange-200 text-orange-700';
    if (actionType === 'status_changed') return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    if (actionType === 'assigned') return 'bg-indigo-50 border-indigo-200 text-indigo-700';
    if (actionType === 'tab_viewed') return 'bg-gray-50 border-gray-200 text-gray-700';
    if (actionType === 'deleted') return 'bg-red-50 border-red-200 text-red-700';
    return 'bg-gray-50 border-gray-200 text-gray-700';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Location functionality removed

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading activities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="enhanced-activity-tab">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Activity className="w-7 h-7 mr-3 text-primary-600" />
          Project Activity Log
        </h2>
        
        <div className="flex items-center space-x-3">
          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </span>
          </button>
        </div>
      </div>

      {/* Geolocation status removed */}

      {/* Activity Statistics */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">{stats.total_activities}</div>
            <div className="text-blue-100 text-sm">Total Activities</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">{stats.recent_activity_count}</div>
            <div className="text-green-100 text-sm">Last 24 Hours</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">{Object.keys(stats.activities_by_type).length}</div>
            <div className="text-purple-100 text-sm">Activity Types</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="text-3xl font-bold mb-2">{stats.most_active_users.length}</div>
            <div className="text-orange-100 text-sm">Active Users</div>
          </div>
        </div>
      )}

      {/* Add Comment Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
          Add Activity Comment
        </h3>
        <div className="space-y-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            placeholder="Share an update, ask a question, or provide feedback..."
            data-testid="new-comment-textarea"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {newComment.length} / 1000 characters
            </span>
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              data-testid="add-comment-button"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({activities.length})
          </button>
          <button
            onClick={() => setFilterType('commented')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'commented'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Comments
          </button>
          <button
            onClick={() => setFilterType('created')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'created'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Created
          </button>
          <button
            onClick={() => setFilterType('tab_viewed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'tab_viewed'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-1" />
            Navigation
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-6">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-600">Start interacting with the project to see activity logs here</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Date Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">{date}</h3>
                  <span className="text-xs text-gray-500">({dateActivities.length} activities)</span>
                </div>
              </div>
              
              {/* Activities for this date */}
              <div className="p-6 space-y-4">
                {dateActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.entity_type, activity.action_type);
                  const colorClass = getActivityColor(activity.entity_type, activity.action_type);
                  const location = formatLocation(activity);
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={`flex space-x-4 p-4 rounded-xl border ${colorClass} transition-all hover:shadow-md`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.entity_type === 'comment' ? 'bg-blue-600' : 'bg-gray-600'
                      } text-white`}>
                        {activity.entity_type === 'comment' ? (
                          <span className="font-semibold text-sm">
                            {activity.user_name?.charAt(0) || '?'}
                          </span>
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900">{activity.user_name}</span>
                          <span className="text-sm text-gray-600">{activity.action_type}</span>
                          <span className="text-xs text-gray-500">{formatDateTime(activity.created_at)}</span>
                          
                          {/* Tab indicator */}
                          {activity.tab_name && (
                            <span className="text-xs bg-white px-2 py-1 rounded-full border border-current">
                              {activity.tab_name} tab
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-800 leading-relaxed break-words">{activity.description}</p>
                        
                        {/* Metadata display */}
                        {activity.metadata?.old_value && activity.metadata?.new_value && (
                          <div className="mt-2 flex items-center space-x-2 text-xs">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                              {activity.metadata.old_value}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                              {activity.metadata.new_value}
                            </span>
                          </div>
                        )}
                        
                        {/* Location data */}
                        {showLocationData && location && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <div>
                                  <div className="text-sm font-medium text-blue-900">Location Data</div>
                                  <div className="text-xs text-blue-700">
                                    {location.coordinates} ({location.accuracy})
                                  </div>
                                </div>
                              </div>
                              <a
                                href={location.mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                View on Map
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedActivityTab;