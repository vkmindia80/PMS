/**
 * Activity Tracking Settings Component
 * Allows users to configure activity logging and geolocation preferences
 */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, Lock, Globe, Eye, Settings, Shield, 
  Info, AlertCircle, CheckCircle, X, Save 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { API_ENDPOINTS } from '../../utils/config';
import toast from 'react-hot-toast';

interface ActivityTrackingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityTrackingSettings: React.FC<ActivityTrackingSettingsProps> = ({
  isOpen,
  onClose
}) => {
  const { tokens, user } = useAuth();
  const { geolocationSettings, toggleGeolocation } = useActivityTracking();
  
  const [preferences, setPreferences] = useState({
    geolocation_enabled: false,
    activity_tracking_level: 'standard',
    location_sharing_scope: 'organization'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setPreferences({
        geolocation_enabled: user.geolocation_enabled || false,
        activity_tracking_level: user.activity_tracking_level || 'standard',
        location_sharing_scope: user.location_sharing_scope || 'organization'
      });
    }
  }, [user]);

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.users.details(user?.id || '')}/preferences`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preferences),
        }
      );

      if (response.ok) {
        toast.success('Activity tracking preferences updated');
        setHasChanges(false);
        
        // Update geolocation if changed
        if (preferences.geolocation_enabled !== geolocationSettings.enabled) {
          await toggleGeolocation(preferences.geolocation_enabled);
        }
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Settings className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Activity Tracking Settings</h2>
              <p className="text-sm text-gray-600">Configure how your activity is logged and shared</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Geolocation Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Location Tracking</h3>
            </div>
            
            {/* Geolocation Toggle */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="font-medium text-gray-900">Enable Location Tracking</label>
                    {preferences.geolocation_enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Allow the application to track your location for activity logging. 
                    This helps provide better insights and analytics about project activities.
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handlePreferenceChange('geolocation_enabled', !preferences.geolocation_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.geolocation_enabled ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.geolocation_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Location Sharing Scope */}
              {preferences.geolocation_enabled && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Sharing Scope
                  </label>
                  <select
                    value={preferences.location_sharing_scope}
                    onChange={(e) => handlePreferenceChange('location_sharing_scope', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="none">Don't share location data</option>
                    <option value="project">Share with project team only</option>
                    <option value="organization">Share with organization</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Controls who can see location data in your activity logs
                  </p>
                </div>
              )}
            </div>

            {/* Current Location Status */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">Current Location Status</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-blue-700">
                      Permission: <span className="font-medium capitalize">{geolocationSettings.permission}</span>
                    </p>
                    <p className="text-blue-700">
                      Tracking: <span className="font-medium">{geolocationSettings.enabled ? 'Active' : 'Inactive'}</span>
                    </p>
                    {geolocationSettings.currentPosition && (
                      <p className="text-blue-700">
                        Last Position: <span className="font-mono text-xs">
                          {geolocationSettings.currentPosition.latitude?.toFixed(6)}, {geolocationSettings.currentPosition.longitude?.toFixed(6)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Tracking Level */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Activity Tracking Level</h3>
            </div>
            
            <div className="space-y-3">
              {[
                {
                  value: 'minimal',
                  label: 'Minimal Tracking',
                  description: 'Only track major actions like project updates and task completion'
                },
                {
                  value: 'standard',
                  label: 'Standard Tracking',
                  description: 'Track most user interactions including tab navigation and content updates'
                },
                {
                  value: 'detailed',
                  label: 'Detailed Tracking',
                  description: 'Track all interactions including hover events and detailed user behavior'
                }
              ].map((level) => (
                <div
                  key={level.value}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                    preferences.activity_tracking_level === level.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => handlePreferenceChange('activity_tracking_level', level.value)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                      preferences.activity_tracking_level === level.value
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {preferences.activity_tracking_level === level.value && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{level.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{level.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900">Privacy & Data Usage</h4>
                <div className="mt-2 text-sm text-yellow-800 space-y-1">
                  <p>• Activity data helps improve project insights and team collaboration</p>
                  <p>• Location data is encrypted and stored securely</p>
                  <p>• You can disable tracking or delete your data at any time</p>
                  <p>• Data is only shared within your specified scope settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {hasChanges && (
              <span className="flex items-center space-x-1 text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span>You have unsaved changes</span>
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityTrackingSettings;