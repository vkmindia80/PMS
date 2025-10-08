/**
 * Activity Tracking Hook
 * Provides comprehensive activity logging
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../utils/config';
import toast from 'react-hot-toast';

interface ActivityData {
  entity_type: string;
  entity_id: string;
  action_type: string;
  description: string;
  metadata?: Record<string, any>;
  project_id?: string;
  task_id?: string;
  tab_name?: string;
}

interface ActivityLog extends ActivityData {
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
}

export const useActivityTracking = (projectId?: string) => {
  const { tokens, user } = useAuth();
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const sessionId = useRef<string>(generateSessionId());

  // Initialize geolocation settings from user preferences
  useEffect(() => {
    if (user) {
      const geoEnabled = user.geolocation_enabled || false;
      setGeolocationSettings(prev => ({
        ...prev,
        enabled: geoEnabled
      }));

      // Request geolocation if enabled
      if (geoEnabled) {
        initializeGeolocation();
      }
    }
  }, [user]);

  /**
   * Initialize geolocation tracking
   */
  const initializeGeolocation = async () => {
    try {
      const hasPermission = await geolocationService.requestPermission();
      
      if (hasPermission) {
        const position = await geolocationService.getCurrentPosition();
        
        setGeolocationSettings(prev => ({
          ...prev,
          permission: 'granted',
          currentPosition: position
        }));

        // Start watching position changes
        geolocationService.startWatching(
          (newPosition) => {
            setGeolocationSettings(prev => ({
              ...prev,
              currentPosition: newPosition
            }));
          },
          (error) => {
            console.warn('Geolocation tracking error:', error);
          }
        );

        toast.success('Location tracking enabled for activity logging');
      } else {
        setGeolocationSettings(prev => ({
          ...prev,
          permission: 'denied'
        }));
        toast.error('Location permission denied. Activity will be logged without location data.');
      }
    } catch (error) {
      console.error('Failed to initialize geolocation:', error);
      setGeolocationSettings(prev => ({
        ...prev,
        permission: 'denied'
      }));
    }
  };

  /**
   * Log an activity with optional geolocation
   */
  const logActivity = useCallback(async (activityData: ActivityData): Promise<boolean> => {
    if (!tokens?.access_token || !isTrackingEnabled) {
      return false;
    }

    try {
      const position = geolocationSettings.enabled ? geolocationSettings.currentPosition : null;
      
      const activityLog: ActivityLog = {
        ...activityData,
        // Add geolocation data if available and enabled
        latitude: position?.latitude,
        longitude: position?.longitude,
        location_accuracy: position?.accuracy,
        geolocation_enabled: geolocationSettings.enabled && position !== null,
        // Add session and environment data
        session_id: sessionId.current,
        user_agent: navigator.userAgent,
        project_id: activityData.project_id || projectId,
      };

      const response = await fetch(API_ENDPOINTS.activities.create, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityLog),
      });

      if (!response.ok) {
        throw new Error(`Failed to log activity: ${response.status}`);
      }

      console.log('Activity logged:', activityLog.description);
      return true;
    } catch (error) {
      console.error('Error logging activity:', error);
      return false;
    }
  }, [tokens, geolocationSettings, isTrackingEnabled, projectId]);

  /**
   * Log project tab navigation
   */
  const logTabNavigation = useCallback(async (tabName: string, projectId: string) => {
    return await logActivity({
      entity_type: 'project',
      entity_id: projectId,
      action_type: 'tab_viewed',
      description: `Viewed ${tabName} tab`,
      metadata: { 
        previous_tab: document.referrer ? 'previous_tab' : 'direct',
        tab_switch_timestamp: new Date().toISOString()
      },
      project_id: projectId,
      tab_name: tabName
    });
  }, [logActivity]);

  /**
   * Log project actions (create, update, delete, etc.)
   */
  const logProjectAction = useCallback(async (
    action: string, 
    projectId: string, 
    description: string, 
    metadata?: Record<string, any>
  ) => {
    return await logActivity({
      entity_type: 'project',
      entity_id: projectId,
      action_type: action,
      description,
      metadata,
      project_id: projectId
    });
  }, [logActivity]);

  /**
   * Log task actions
   */
  const logTaskAction = useCallback(async (
    action: string,
    taskId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    return await logActivity({
      entity_type: 'task',
      entity_id: taskId,
      action_type: action,
      description,
      metadata,
      project_id: projectId,
      task_id: taskId
    });
  }, [logActivity]);

  /**
   * Log milestone actions
   */
  const logMilestoneAction = useCallback(async (
    action: string,
    milestoneId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    return await logActivity({
      entity_type: 'milestone',
      entity_id: milestoneId,
      action_type: action,
      description,
      metadata,
      project_id: projectId
    });
  }, [logActivity]);

  /**
   * Log comment actions
   */
  const logCommentAction = useCallback(async (
    action: string,
    commentId: string,
    entityType: string,
    entityId: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    return await logActivity({
      entity_type: 'comment',
      entity_id: commentId,
      action_type: action,
      description,
      metadata: {
        ...metadata,
        parent_entity_type: entityType,
        parent_entity_id: entityId
      },
      project_id: projectId
    });
  }, [logActivity, projectId]);

  /**
   * Log file actions
   */
  const logFileAction = useCallback(async (
    action: string,
    fileId: string,
    fileName: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    return await logActivity({
      entity_type: 'file',
      entity_id: fileId,
      action_type: action,
      description,
      metadata: {
        ...metadata,
        file_name: fileName
      },
      project_id: projectId
    });
  }, [logActivity]);

  /**
   * Toggle geolocation tracking
   */
  const toggleGeolocation = useCallback(async (enabled: boolean) => {
    try {
      // Update user preferences
      const response = await fetch(API_ENDPOINTS.users.details(user?.id || ''), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          geolocation_enabled: enabled
        }),
      });

      if (response.ok) {
        setGeolocationSettings(prev => ({ ...prev, enabled }));
        
        if (enabled) {
          await initializeGeolocation();
        } else {
          geolocationService.stopWatching();
          geolocationService.clearCache();
          toast.success('Location tracking disabled');
        }
      }
    } catch (error) {
      console.error('Failed to update geolocation setting:', error);
      toast.error('Failed to update location tracking setting');
    }
  }, [tokens, user, initializeGeolocation]);

  /**
   * Toggle activity tracking
   */
  const toggleActivityTracking = useCallback((enabled: boolean) => {
    setIsTrackingEnabled(enabled);
    toast.success(`Activity tracking ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  return {
    // State
    geolocationSettings,
    isTrackingEnabled,
    
    // General activity logging
    logActivity,
    
    // Specific activity logging methods
    logTabNavigation,
    logProjectAction,
    logTaskAction,
    logMilestoneAction,
    logCommentAction,
    logFileAction,
    
    // Settings
    toggleGeolocation,
    toggleActivityTracking,
    initializeGeolocation,
  };
};

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default useActivityTracking;