/**
 * Enhanced Advanced Integrations Page - Phase 4.2
 * Comprehensive frontend configurations for Slack, Teams, GitHub, Google Workspace
 */
import React, { useState, useEffect, useMemo } from 'react'
import { 
  MessageSquare, 
  Github, 
  Calendar, 
  Mail, 
  Slack, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Zap,
  Users,
  FileText,
  Video,
  Edit,
  Save,
  X,
  Key,
  Shield,
  Bell,
  Code,
  Database,
  Globe,
  Clock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Activity,
  Filter,
  Search
} from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

interface Integration {
  type: string
  name: string
  description: string
  features: string[]
  setup_required: string[]
  status?: 'active' | 'inactive' | 'error'
  last_updated?: Date
}

interface IntegrationConfig {
  success: boolean
  integration_type: string
  data?: any
  error?: string
  timestamp: string
}

const IntegrationsPage: React.FC = () => {
  const [availableIntegrations, setAvailableIntegrations] = useState<Record<string, Integration>>({})
  const [activeIntegrations, setActiveIntegrations] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [setupModal, setSetupModal] = useState<{ type: string, integration: Integration, mode: 'setup' | 'edit' } | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [configModal, setConfigModal] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<Record<string, boolean>>({})
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})
  const [integrationLogs, setIntegrationLogs] = useState<Record<string, any[]>>({})

  // Enhanced form states for different integrations with advanced options
  const [slackConfig, setSlackConfig] = useState({
    workspace_url: '',
    bot_token: '',
    app_token: '',
    signing_secret: '',
    default_channel: 'general',
    notifications_enabled: true,
    auto_create_channels: false,
    sync_user_status: true,
    enable_slash_commands: true,
    webhook_url: '',
    custom_emoji: true,
    thread_replies: false,
    mention_users: true,
    notification_types: ['task_assigned', 'project_update', 'deadline_approaching'],
    working_hours: { start: '09:00', end: '17:00' },
    timezone: 'UTC',
    message_format: 'detailed'
  })

  const [teamsConfig, setTeamsConfig] = useState({
    tenant_id: '',
    application_id: '',
    client_secret: '',
    default_team: '',
    webhook_url: '',
    enable_adaptive_cards: true,
    bot_framework_enabled: true,
    meeting_integration: true,
    file_sharing: true,
    calendar_sync: true,
    notification_channels: ['general', 'projects'],
    activity_feed: true,
    presence_sync: true,
    auto_create_teams: false,
    tab_apps: ['tasks', 'projects', 'analytics'],
    custom_actions: true,
    approval_workflows: false
  })

  const [githubConfig, setGithubConfig] = useState({
    organization: '',
    repositories: [] as string[],
    access_token: '',
    webhook_secret: '',
    auto_sync: true,
    sync_frequency: '15',
    branch_protection: true,
    pr_reviews_required: 2,
    status_checks: true,
    deployment_tracking: true,
    issue_sync: true,
    milestone_sync: true,
    label_sync: true,
    release_notifications: true,
    commit_status_updates: true,
    code_scanning: true,
    dependency_updates: true,
    workflow_runs: true,
    environments: ['development', 'staging', 'production'],
    auto_merge: false,
    delete_branch_on_merge: true
  })

  const [googleConfig, setGoogleConfig] = useState({
    domain: '',
    service_account_key: '',
    delegated_user: '',
    calendar_sync: true,
    drive_sync: true,
    gmail_sync: false,
    meet_integration: true,
    workspace_admin_sync: false,
    shared_drives: true,
    calendar_notifications: true,
    meeting_auto_join: false,
    drive_permissions: 'viewer',
    calendar_working_hours: true,
    gmail_labels: ['portfolio', 'projects', 'tasks'],
    auto_schedule_optimization: true,
    resource_booking: true,
    room_management: false,
    attendance_tracking: false,
    recording_management: true,
    chat_integration: false,
    forms_integration: false
  })

  useEffect(() => {
    loadIntegrations()
    loadIntegrationLogs()
  }, [])

  const filteredIntegrations = useMemo(() => {
    let filtered = Object.entries(availableIntegrations)
    
    if (searchFilter) {
      filtered = filtered.filter(([type, integration]) =>
        integration.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        integration.description.toLowerCase().includes(searchFilter.toLowerCase())
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(([type]) => {
        const status = activeIntegrations[type]?.status
        return statusFilter === 'active' ? status === 'active' : status !== 'active'
      })
    }
    
    return filtered
  }, [availableIntegrations, activeIntegrations, searchFilter, statusFilter])

  const getAuthHeaders = () => {
    const authTokens = localStorage.getItem('auth_tokens')
    let token = null
    
    if (authTokens) {
      try {
        const parsedTokens = JSON.parse(authTokens)
        token = parsedTokens.access_token
      } catch (error) {
        console.error('Failed to parse auth tokens:', error)
      }
    }
    
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const loadIntegrations = async () => {
    try {
      setIsLoading(true)
      
      // Load available integrations
      const availableResponse = await axios.get(
        `${API_BASE_URL}/api/integrations/available`,
        { headers: getAuthHeaders() }
      )
      setAvailableIntegrations(availableResponse.data.available_integrations)

      // Load active integrations status
      const statusResponse = await axios.get(
        `${API_BASE_URL}/api/integrations/status`,
        { headers: getAuthHeaders() }
      )
      setActiveIntegrations(statusResponse.data.integrations || {})

    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadIntegrationLogs = async () => {
    try {
      // Simulate loading integration logs
      const mockLogs = {
        slack: [
          { timestamp: new Date(), level: 'info', message: 'Connected to workspace successfully' },
          { timestamp: new Date(Date.now() - 3600000), level: 'info', message: 'Notification sent to #general' }
        ],
        teams: [
          { timestamp: new Date(), level: 'info', message: 'Adaptive card sent successfully' }
        ],
        github: [
          { timestamp: new Date(), level: 'info', message: 'Repository sync completed' },
          { timestamp: new Date(Date.now() - 1800000), level: 'warning', message: 'Rate limit approaching' }
        ],
        google_workspace: [
          { timestamp: new Date(), level: 'info', message: 'Calendar sync completed' }
        ]
      }
      setIntegrationLogs(mockLogs)
    } catch (error) {
      console.error('Failed to load integration logs:', error)
    }
  }

  const exportConfiguration = (type: string) => {
    const config = activeIntegrations[type]
    if (config) {
      const configData = {
        type,
        configuration: config,
        exported_at: new Date().toISOString(),
        version: '1.0'
      }
      
      const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-integration-config.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const importConfiguration = (type: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string)
          if (config.type === type) {
            // Apply configuration based on type
            switch (type) {
              case 'slack':
                setSlackConfig(prev => ({ ...prev, ...config.configuration }))
                break
              case 'teams':
                setTeamsConfig(prev => ({ ...prev, ...config.configuration }))
                break
              case 'github':
                setGithubConfig(prev => ({ ...prev, ...config.configuration }))
                break
              case 'google_workspace':
                setGoogleConfig(prev => ({ ...prev, ...config.configuration }))
                break
            }
            alert('Configuration imported successfully')
          } else {
            alert('Invalid configuration file')
          }
        } catch (error) {
          alert('Failed to parse configuration file')
        }
      }
      reader.readAsText(file)
    }
  }

  const validateConfiguration = async (type: string) => {
    try {
      // Simulate configuration validation
      const response = await axios.post(
        `${API_BASE_URL}/api/integrations/${type}/validate`,
        {},
        { headers: getAuthHeaders() }
      )
      return response.data
    } catch (error) {
      return { valid: false, errors: ['Connection failed'] }
    }
  }

  const setupIntegration = async (type: string) => {
    try {
      setIsLoading(true)
      let config: any = {}
      let endpoint = ''

      switch (type) {
        case 'slack':
          config = slackConfig
          endpoint = 'slack/setup'
          break
        case 'teams':
          config = teamsConfig
          endpoint = 'teams/setup'
          break
        case 'github':
          config = githubConfig
          endpoint = 'github/setup'
          break
        case 'google_workspace':
          config = googleConfig
          endpoint = 'google-workspace/setup'
          break
        default:
          throw new Error('Unknown integration type')
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/integrations/${endpoint}`,
        config,
        { headers: getAuthHeaders() }
      )

      if (response.data.success) {
        setSetupModal(null)
        await loadIntegrations()
        
        // Show success message with more details
        const integrationName = availableIntegrations[type]?.name
        alert(`${integrationName} integration ${setupModal?.mode === 'edit' ? 'updated' : 'setup'} successful!\n\nFeatures enabled:\n${response.data.data?.features?.join('\n') || 'Basic integration features'}`)
      } else {
        alert(`Setup failed: ${response.data.error}`)
      }

    } catch (error: any) {
      console.error('Integration setup error:', error)
      alert(`Setup failed: ${error.response?.data?.detail || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const editIntegrationConfig = (type: string) => {
    const integration = availableIntegrations[type]
    const currentConfig = activeIntegrations[type]
    
    if (integration && currentConfig) {
      // Load current configuration into form
      switch (type) {
        case 'slack':
          setSlackConfig(prev => ({ ...prev, ...currentConfig }))
          break
        case 'teams':
          setTeamsConfig(prev => ({ ...prev, ...currentConfig }))
          break
        case 'github':
          setGithubConfig(prev => ({ ...prev, ...currentConfig }))
          break
        case 'google_workspace':
          setGoogleConfig(prev => ({ ...prev, ...currentConfig }))
          break
      }
      
      setSetupModal({ type, integration, mode: 'edit' })
    }
  }

  const testIntegration = async (type: string) => {
    try {
      setIsLoading(true)
      let result: any = {}

      switch (type) {
        case 'slack':
          const slackResult = await axios.post(
            `${API_BASE_URL}/api/integrations/slack/notify`,
            {
              channel: 'general',
              message: 'Test notification from Enterprise Portfolio Management',
              priority: 'normal'
            },
            { headers: getAuthHeaders() }
          )
          result = slackResult.data
          break

        case 'teams':
          const teamsResult = await axios.post(
            `${API_BASE_URL}/api/integrations/teams/adaptive-card`,
            {
              channel_id: 'test-channel',
              message: 'Test adaptive card from Enterprise Portfolio Management',
              card_data: {
                body: [
                  {
                    type: 'TextBlock',
                    text: 'Integration Test Successful! ✅',
                    weight: 'Bolder',
                    color: 'Good'
                  }
                ]
              }
            },
            { headers: getAuthHeaders() }
          )
          result = teamsResult.data
          break

        case 'github':
          const githubResult = await axios.get(
            `${API_BASE_URL}/api/integrations/github/repositories`,
            { headers: getAuthHeaders() }
          )
          result = { success: true, repositories: githubResult.data.repositories }
          break

        case 'google_workspace':
          const googleResult = await axios.post(
            `${API_BASE_URL}/api/integrations/google-workspace/schedule-meeting`,
            {
              title: 'Test Meeting',
              description: 'Integration test meeting',
              start_time: new Date(Date.now() + 3600000).toISOString(),
              end_time: new Date(Date.now() + 7200000).toISOString(),
              attendees: ['test@example.com']
            },
            { headers: getAuthHeaders() }
          )
          result = googleResult.data
          break
      }

      setTestResults({ ...testResults, [type]: result })
      
    } catch (error: any) {
      console.error('Integration test error:', error)
      setTestResults({ 
        ...testResults, 
        [type]: { 
          success: false, 
          error: error.response?.data?.detail || error.message 
        } 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderSlackConfiguration = () => (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4 inline mr-1" />
            Workspace URL
          </label>
          <input
            type="url"
            value={slackConfig.workspace_url}
            onChange={(e) => setSlackConfig({ ...slackConfig, workspace_url: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://yourcompany.slack.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Default Channel
          </label>
          <input
            type="text"
            value={slackConfig.default_channel}
            onChange={(e) => setSlackConfig({ ...slackConfig, default_channel: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="general"
          />
        </div>
      </div>

      {/* API Credentials */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h4 className="text-sm font-medium text-yellow-800 mb-3 flex items-center">
          <Key className="w-4 h-4 mr-1" />
          API Credentials
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bot Token</label>
            <div className="relative">
              <input
                type={showCredentials.slack ? 'text' : 'password'}
                value={slackConfig.bot_token}
                onChange={(e) => setSlackConfig({ ...slackConfig, bot_token: e.target.value })}
                className="w-full p-2 pr-10 border border-gray-300 rounded text-sm"
                placeholder="xoxb-..."
              />
              <button
                type="button"
                onClick={() => setShowCredentials(prev => ({ ...prev, slack: !prev.slack }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCredentials.slack ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">App Token</label>
            <input
              type={showCredentials.slack ? 'text' : 'password'}
              value={slackConfig.app_token}
              onChange={(e) => setSlackConfig({ ...slackConfig, app_token: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="xapp-..."
            />
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvancedConfig.slack && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900">Advanced Configuration</h4>
          
          {/* Notification Settings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Notification Settings</h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {['notifications_enabled', 'auto_create_channels', 'sync_user_status', 'enable_slash_commands'].map((key) => (
                  <label key={key} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={slackConfig[key as keyof typeof slackConfig] as boolean}
                      onChange={(e) => setSlackConfig({ ...slackConfig, [key]: e.target.checked })}
                      className="mr-2"
                    />
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notification Types</label>
                <select
                  multiple
                  value={slackConfig.notification_types}
                  onChange={(e) => setSlackConfig({ 
                    ...slackConfig, 
                    notification_types: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="task_assigned">Task Assigned</option>
                  <option value="project_update">Project Update</option>
                  <option value="deadline_approaching">Deadline Approaching</option>
                  <option value="milestone_reached">Milestone Reached</option>
                </select>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Working Hours Start</label>
              <input
                type="time"
                value={slackConfig.working_hours.start}
                onChange={(e) => setSlackConfig({ 
                  ...slackConfig, 
                  working_hours: { ...slackConfig.working_hours, start: e.target.value }
                })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Working Hours End</label>
              <input
                type="time"
                value={slackConfig.working_hours.end}
                onChange={(e) => setSlackConfig({ 
                  ...slackConfig, 
                  working_hours: { ...slackConfig.working_hours, end: e.target.value }
                })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderTeamsConfiguration = () => (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Shield className="w-4 h-4 inline mr-1" />
            Tenant ID
          </label>
          <input
            type="text"
            value={teamsConfig.tenant_id}
            onChange={(e) => setTeamsConfig({ ...teamsConfig, tenant_id: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="12345678-1234-1234-1234-123456789012"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Default Team
          </label>
          <input
            type="text"
            value={teamsConfig.default_team}
            onChange={(e) => setTeamsConfig({ ...teamsConfig, default_team: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="General"
          />
        </div>
      </div>

      {/* API Credentials */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
          <Key className="w-4 h-4 mr-1" />
          Application Credentials
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Application ID</label>
            <input
              type="text"
              value={teamsConfig.application_id}
              onChange={(e) => setTeamsConfig({ ...teamsConfig, application_id: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="12345678-1234-1234-1234-123456789012"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
            <input
              type={showCredentials.teams ? 'text' : 'password'}
              value={teamsConfig.client_secret}
              onChange={(e) => setTeamsConfig({ ...teamsConfig, client_secret: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="Your client secret"
            />
          </div>
        </div>
      </div>

      {/* Features Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Microsoft Teams Features</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'enable_adaptive_cards', 'bot_framework_enabled', 'meeting_integration',
            'file_sharing', 'calendar_sync', 'activity_feed', 'presence_sync',
            'auto_create_teams', 'custom_actions', 'approval_workflows'
          ].map((key) => (
            <label key={key} className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={teamsConfig[key as keyof typeof teamsConfig] as boolean}
                onChange={(e) => setTeamsConfig({ ...teamsConfig, [key]: e.target.checked })}
                className="mr-2"
              />
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvancedConfig.teams && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tab Applications</label>
            <div className="flex flex-wrap gap-2">
              {teamsConfig.tab_apps.map((app, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {app}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notification Channels</label>
            <input
              type="text"
              value={teamsConfig.notification_channels.join(', ')}
              onChange={(e) => setTeamsConfig({ 
                ...teamsConfig, 
                notification_channels: e.target.value.split(',').map(s => s.trim())
              })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="general, projects, announcements"
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderGitHubConfiguration = () => (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Github className="w-4 h-4 inline mr-1" />
            Organization
          </label>
          <input
            type="text"
            value={githubConfig.organization}
            onChange={(e) => setGithubConfig({ ...githubConfig, organization: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="your-organization"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Sync Frequency (minutes)
          </label>
          <select
            value={githubConfig.sync_frequency}
            onChange={(e) => setGithubConfig({ ...githubConfig, sync_frequency: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="5">Every 5 minutes</option>
            <option value="15">Every 15 minutes</option>
            <option value="30">Every 30 minutes</option>
            <option value="60">Every hour</option>
          </select>
        </div>
      </div>

      {/* Repository Configuration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Database className="w-4 h-4 inline mr-1" />
          Repositories
        </label>
        <input
          type="text"
          onChange={(e) => setGithubConfig({ 
            ...githubConfig, 
            repositories: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
          })}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="frontend, backend, mobile-app, docs"
        />
        <p className="text-xs text-gray-500 mt-1">Comma-separated list of repository names</p>
      </div>

      {/* API Credentials */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
          <Key className="w-4 h-4 mr-1" />
          GitHub Credentials
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Access Token</label>
            <input
              type={showCredentials.github ? 'text' : 'password'}
              value={githubConfig.access_token}
              onChange={(e) => setGithubConfig({ ...githubConfig, access_token: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Webhook Secret</label>
            <input
              type={showCredentials.github ? 'text' : 'password'}
              value={githubConfig.webhook_secret}
              onChange={(e) => setGithubConfig({ ...githubConfig, webhook_secret: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="Your webhook secret"
            />
          </div>
        </div>
      </div>

      {/* Advanced Features */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">GitHub Features & Automation</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'auto_sync', 'branch_protection', 'status_checks', 'deployment_tracking',
            'issue_sync', 'milestone_sync', 'label_sync', 'release_notifications',
            'commit_status_updates', 'code_scanning', 'dependency_updates',
            'workflow_runs', 'auto_merge', 'delete_branch_on_merge'
          ].map((key) => (
            <label key={key} className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={githubConfig[key as keyof typeof githubConfig] as boolean}
                onChange={(e) => setGithubConfig({ ...githubConfig, [key]: e.target.checked })}
                className="mr-2"
              />
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          ))}
        </div>
      </div>

      {/* Environment Configuration */}
      {showAdvancedConfig.github && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Environments</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {githubConfig.environments.map((env, index) => (
                <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  {env}
                </span>
              ))}
            </div>
            <input
              type="text"
              value={githubConfig.environments.join(', ')}
              onChange={(e) => setGithubConfig({ 
                ...githubConfig, 
                environments: e.target.value.split(',').map(s => s.trim())
              })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="development, staging, production"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Required PR Reviews</label>
            <input
              type="number"
              min="1"
              max="10"
              value={githubConfig.pr_reviews_required}
              onChange={(e) => setGithubConfig({ ...githubConfig, pr_reviews_required: parseInt(e.target.value) })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderGoogleWorkspaceConfiguration = () => (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4 inline mr-1" />
            Domain
          </label>
          <input
            type="text"
            value={googleConfig.domain}
            onChange={(e) => setGoogleConfig({ ...googleConfig, domain: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="your-company.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Delegated User
          </label>
          <input
            type="email"
            value={googleConfig.delegated_user}
            onChange={(e) => setGoogleConfig({ ...googleConfig, delegated_user: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="admin@your-company.com"
          />
        </div>
      </div>

      {/* Service Account Configuration */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h4 className="text-sm font-medium text-orange-800 mb-3 flex items-center">
          <Key className="w-4 h-4 mr-1" />
          Service Account Configuration
        </h4>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Service Account Key (JSON)</label>
          <textarea
            value={googleConfig.service_account_key}
            onChange={(e) => setGoogleConfig({ ...googleConfig, service_account_key: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded text-sm"
            rows={4}
            placeholder="Paste your service account JSON key here"
          />
          <p className="text-xs text-orange-600 mt-1">
            Keep this secure! Service account keys provide admin-level access to your Google Workspace.
          </p>
        </div>
      </div>

      {/* Google Services Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Google Workspace Services</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'calendar_sync', 'drive_sync', 'gmail_sync', 'meet_integration',
            'workspace_admin_sync', 'shared_drives', 'calendar_notifications',
            'meeting_auto_join', 'calendar_working_hours', 'auto_schedule_optimization',
            'resource_booking', 'room_management', 'attendance_tracking',
            'recording_management', 'chat_integration', 'forms_integration'
          ].map((key) => (
            <label key={key} className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={googleConfig[key as keyof typeof googleConfig] as boolean}
                onChange={(e) => setGoogleConfig({ ...googleConfig, [key]: e.target.checked })}
                className="mr-2"
              />
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvancedConfig.google_workspace && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Drive Permissions Level</label>
            <select
              value={googleConfig.drive_permissions}
              onChange={(e) => setGoogleConfig({ ...googleConfig, drive_permissions: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gmail Labels</label>
            <input
              type="text"
              value={googleConfig.gmail_labels.join(', ')}
              onChange={(e) => setGoogleConfig({ 
                ...googleConfig, 
                gmail_labels: e.target.value.split(',').map(s => s.trim())
              })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="portfolio, projects, tasks"
            />
          </div>
        </div>
      )}
    </div>
  )

  const removeIntegration = async (type: string) => {
    if (!confirm(`Are you sure you want to remove the ${availableIntegrations[type]?.name} integration?`)) {
      return
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/integrations/${type}`,
        { headers: getAuthHeaders() }
      )
      
      await loadIntegrations()
      alert('Integration removed successfully')
      
    } catch (error: any) {
      console.error('Remove integration error:', error)
      alert(`Failed to remove integration: ${error.response?.data?.detail || error.message}`)
    }
  }

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'slack':
        return <Slack className="w-8 h-8 text-green-600" />
      case 'teams':
        return <MessageSquare className="w-8 h-8 text-blue-600" />
      case 'github':
        return <Github className="w-8 h-8 text-gray-800" />
      case 'google_workspace':
        return <Calendar className="w-8 h-8 text-orange-600" />
      default:
        return <Settings className="w-8 h-8 text-gray-600" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'inactive':
        return 'text-gray-600 bg-gray-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const renderEnhancedSetupModal = () => {
    if (!setupModal) return null

    const { type, integration, mode } = setupModal
    const isEditMode = mode === 'edit'

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              {getIntegrationIcon(type)}
              <div className="ml-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Edit' : 'Setup'} {integration.name}
                </h3>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportConfiguration(type)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Export Configuration"
              >
                <Download className="w-4 h-4" />
              </button>
              <label className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer" title="Import Configuration">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => importConfiguration(type, e)}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setSetupModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="overflow-y-auto max-h-[60vh]">
            <div className="p-6">
              {/* Configuration Tabs */}
              <div className="mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
                      Basic Setup
                    </button>
                    <button
                      onClick={() => setShowAdvancedConfig(prev => ({ ...prev, [type]: !prev[type] }))}
                      className="py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      Advanced Options
                    </button>
                    <button className="py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                      Webhooks & API
                    </button>
                    <button className="py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                      Notifications
                    </button>
                  </nav>
                </div>
              </div>

              {type === 'slack' && renderSlackConfiguration()}
              {type === 'teams' && renderTeamsConfiguration()}
              {type === 'github' && renderGitHubConfiguration()}
              {type === 'google_workspace' && renderGoogleWorkspaceConfiguration()}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => validateConfiguration(type)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Validate Config
              </button>
              <button
                onClick={() => testIntegration(type)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Zap className="w-4 h-4 mr-2" />
                Test Connection
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setSetupModal(null)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setupIntegration(type)}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Setup Integration'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Integrations</h1>
          <p className="text-gray-600">
            Connect your enterprise tools for seamless workflow automation
          </p>
          <div className="flex items-center mt-4">
            <button
              onClick={loadIntegrations}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(availableIntegrations).map(([type, integration]) => {
            const isActive = activeIntegrations[type]?.status === 'active'
            const testResult = testResults[type]

            return (
              <div key={type} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {getIntegrationIcon(type)}
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-600">{integration.description}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getStatusColor(activeIntegrations[type]?.status)
                  }`}>
                    {activeIntegrations[type]?.status || 'Not configured'}
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
                  <div className="flex flex-wrap gap-2">
                    {integration.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Test Results */}
                {testResult && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {testResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {testResult.success ? 'Test successful' : `Test failed: ${testResult.error}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  {!isActive ? (
                    <button
                      onClick={() => setSetupModal({ type, integration })}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Setup
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => testIntegration(type)}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Test
                      </button>
                      <button
                        onClick={() => removeIntegration(type)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Integration Statistics */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(availableIntegrations).length}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(activeIntegrations).filter(i => i.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(testResults).filter(r => r?.success).length}
              </div>
              <div className="text-sm text-gray-600">Tested</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(testResults).filter(r => r?.success === false).length}
              </div>
              <div className="text-sm text-gray-600">Failed Tests</div>
            </div>
          </div>
        </div>
      </div>

      {renderSetupModal()}
    </div>
  )
}

export default IntegrationsPage