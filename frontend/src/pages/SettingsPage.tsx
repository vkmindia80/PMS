import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Settings, User, Bell, Shield, Globe, 
  Palette, Clock, Mail, Phone, Lock,
  Save, Eye, EyeOff, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserSettings {
  first_name: string
  last_name: string
  email: string
  phone?: string
  bio?: string
  timezone: string
  language: string
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
}

interface OrganizationSettings {
  name: string
  description?: string
  website?: string
  email?: string
  phone?: string
  timezone: string
  currency: string
  date_format: string
  time_format: '12h' | '24h'
  language: string
}

const SettingsPage: React.FC = () => {
  const { user, tokens } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'organization' | 'notifications' | 'security'>('profile')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [userSettings, setUserSettings] = useState<UserSettings>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    timezone: 'UTC',
    language: 'en',
    theme: 'light',
    notifications_enabled: true,
    email_notifications: true,
    push_notifications: false
  })

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: '',
    description: '',
    website: '',
    email: '',
    phone: '',
    timezone: 'UTC',
    currency: 'USD',
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    language: 'en'
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setUserSettings({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        timezone: user.timezone || 'UTC',
        language: user.language || 'en',
        theme: user.theme || 'light',
        notifications_enabled: user.notifications_enabled ?? true,
        email_notifications: true,
        push_notifications: false
      })
    }
  }, [user])

  const getApiUrl = () => {
    const isPreview = window.location.hostname.includes('emergentagent.com')
    const isProd = import.meta.env.PROD || isPreview
    
    if (isProd || isPreview) {
      return import.meta.env.VITE_PROD_API_URL || 'https://next-steps-74.preview.emergentagent.com'
    }
    
    return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001'
  }

  const handleSaveProfile = async () => {
    if (!tokens?.access_token) return

    setLoading(true)
    try {
      const response = await fetch(`${getApiUrl()}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({
          first_name: userSettings.first_name,
          last_name: userSettings.last_name,
          phone: userSettings.phone,
          bio: userSettings.bio,
          timezone: userSettings.timezone,
          language: userSettings.language,
          theme: userSettings.theme,
          notifications_enabled: userSettings.notifications_enabled
        })
      })

      if (response.ok) {
        toast.success('Profile updated successfully!')
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!tokens?.access_token) return

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      })

      if (response.ok) {
        toast.success('Password changed successfully!')
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to change password')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const timezones = [
    'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
    'Asia/Shanghai', 'Australia/Sydney'
  ]

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={userSettings.first_name}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={userSettings.last_name}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userSettings.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={userSettings.phone || ''}
                onChange={(e) => setUserSettings(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={userSettings.bio || ''}
                onChange={(e) => setUserSettings(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Tell us about yourself..."
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )

      case 'account':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={userSettings.timezone}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={userSettings.language}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="light"
                    checked={userSettings.theme === 'light'}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' }))}
                    className="mr-2"
                  />
                  Light Mode
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="dark"
                    checked={userSettings.theme === 'dark'}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' }))}
                    className="mr-2"
                  />
                  Dark Mode
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Enable Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications about your projects and tasks</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.notifications_enabled}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, notifications_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.email_notifications}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                    className="sr-only peer"
                    disabled={!userSettings.notifications_enabled}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 disabled:opacity-50"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                  <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.push_notifications}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, push_notifications: e.target.checked }))}
                    className="sr-only peer"
                    disabled={!userSettings.notifications_enabled}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 disabled:opacity-50"></div>
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Notifications'}
            </button>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Password Security
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Use a strong password with at least 8 characters, including letters, numbers, and symbols.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
              className="btn-primary flex items-center"
            >
              <Lock className="h-4 w-4 mr-2" />
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        )

      default:
        return <div>Settings coming soon...</div>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Settings className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and system preferences</p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', name: 'Profile', icon: User },
              { id: 'account', name: 'Account', icon: Globe },
              { id: 'notifications', name: 'Notifications', icon: Bell },
              { id: 'security', name: 'Security', icon: Shield }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage